"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const schematics_1 = require("@angular-devkit/schematics");
const tools_1 = require("@angular-devkit/schematics/tools");
const inquirer = require("inquirer");
const systemPath = require("path");
const operators_1 = require("rxjs/operators");
const workspace_loader_1 = require("../models/workspace-loader");
const config_1 = require("../utilities/config");
const json_schema_1 = require("../utilities/json-schema");
const command_1 = require("./command");
const parser_1 = require("./parser");
class UnknownCollectionError extends Error {
    constructor(collectionName) {
        super(`Invalid collection (${collectionName}).`);
    }
}
exports.UnknownCollectionError = UnknownCollectionError;
class SchematicCommand extends command_1.Command {
    constructor(context, description, logger, _engineHost = new tools_1.NodeModulesEngineHost()) {
        super(context, description, logger);
        this._engineHost = _engineHost;
        this.allowPrivateSchematics = false;
        this._host = new node_1.NodeJsSyncHost();
        this.collectionName = '@schematics/angular';
        this._engine = new schematics_1.SchematicEngine(this._engineHost);
    }
    async initialize(options) {
        this._loadWorkspace();
        this.createWorkflow(options);
        if (this.schematicName) {
            // Set the options.
            const collection = this.getCollection(this.collectionName);
            const schematic = this.getSchematic(collection, this.schematicName, true);
            const options = await json_schema_1.parseJsonSchemaToOptions(this._workflow.registry, schematic.description.schemaJson || {});
            this.description.options.push(...options.filter(x => !x.hidden));
        }
    }
    async printHelp(options) {
        await super.printHelp(options);
        this.logger.info('');
        const subCommandOption = this.description.options.filter(x => x.subcommands)[0];
        if (!subCommandOption || !subCommandOption.subcommands) {
            return 0;
        }
        const schematicNames = Object.keys(subCommandOption.subcommands);
        if (schematicNames.length > 1) {
            this.logger.info('Available Schematics:');
            const namesPerCollection = {};
            schematicNames.forEach(name => {
                let [collectionName, schematicName] = name.split(/:/, 2);
                if (!schematicName) {
                    schematicName = collectionName;
                    collectionName = this.collectionName;
                }
                if (!namesPerCollection[collectionName]) {
                    namesPerCollection[collectionName] = [];
                }
                namesPerCollection[collectionName].push(schematicName);
            });
            const defaultCollection = this.getDefaultSchematicCollection();
            Object.keys(namesPerCollection).forEach(collectionName => {
                const isDefault = defaultCollection == collectionName;
                this.logger.info(`  Collection "${collectionName}"${isDefault ? ' (default)' : ''}:`);
                namesPerCollection[collectionName].forEach(schematicName => {
                    this.logger.info(`    ${schematicName}`);
                });
            });
        }
        else if (schematicNames.length == 1) {
            this.logger.info('Help for schematic ' + schematicNames[0]);
            await this.printHelpSubcommand(subCommandOption.subcommands[schematicNames[0]]);
        }
        return 0;
    }
    async printHelpUsage() {
        const subCommandOption = this.description.options.filter(x => x.subcommands)[0];
        if (!subCommandOption || !subCommandOption.subcommands) {
            return;
        }
        const schematicNames = Object.keys(subCommandOption.subcommands);
        if (schematicNames.length == 1) {
            this.logger.info(this.description.description);
            const opts = this.description.options.filter(x => x.positional === undefined);
            const [collectionName, schematicName] = schematicNames[0].split(/:/)[0];
            // Display <collectionName:schematicName> if this is not the default collectionName,
            // otherwise just show the schematicName.
            const displayName = collectionName == this.getDefaultSchematicCollection()
                ? schematicName
                : schematicNames[0];
            const schematicOptions = subCommandOption.subcommands[schematicNames[0]].options;
            const schematicArgs = schematicOptions.filter(x => x.positional !== undefined);
            const argDisplay = schematicArgs.length > 0
                ? ' ' + schematicArgs.map(a => `<${core_1.strings.dasherize(a.name)}>`).join(' ')
                : '';
            this.logger.info(core_1.tags.oneLine `
        usage: ng ${this.description.name} ${displayName}${argDisplay}
        ${opts.length > 0 ? `[options]` : ``}
      `);
            this.logger.info('');
        }
        else {
            await super.printHelpUsage();
        }
    }
    getEngineHost() {
        return this._engineHost;
    }
    getEngine() {
        return this._engine;
    }
    getCollection(collectionName) {
        const engine = this.getEngine();
        const collection = engine.createCollection(collectionName);
        if (collection === null) {
            throw new UnknownCollectionError(collectionName);
        }
        return collection;
    }
    getSchematic(collection, schematicName, allowPrivate) {
        return collection.createSchematic(schematicName, allowPrivate);
    }
    setPathOptions(options, workingDir) {
        if (workingDir === '') {
            return {};
        }
        return options
            .filter(o => o.format === 'path')
            .map(o => o.name)
            .reduce((acc, curr) => {
            acc[curr] = workingDir;
            return acc;
        }, {});
    }
    /*
     * Runtime hook to allow specifying customized workflow
     */
    createWorkflow(options) {
        if (this._workflow) {
            return this._workflow;
        }
        const { force, dryRun } = options;
        const fsHost = new core_1.virtualFs.ScopedHost(new node_1.NodeJsSyncHost(), core_1.normalize(this.workspace.root));
        const workflow = new tools_1.NodeWorkflow(fsHost, {
            force,
            dryRun,
            packageManager: config_1.getPackageManager(),
            root: core_1.normalize(this.workspace.root),
        });
        this._engineHost.registerOptionsTransform(tools_1.validateOptionsWithSchema(workflow.registry));
        workflow.registry.addPostTransform(core_1.schema.transforms.addUndefinedDefaults);
        workflow.registry.addSmartDefaultProvider('projectName', () => {
            if (this._workspace) {
                try {
                    return this._workspace.getProjectByPath(core_1.normalize(process.cwd()))
                        || this._workspace.getDefaultProjectName();
                }
                catch (e) {
                    if (e instanceof core_1.experimental.workspace.AmbiguousProjectPathException) {
                        this.logger.warn(core_1.tags.oneLine `
              Two or more projects are using identical roots.
              Unable to determine project using current working directory.
              Using default workspace project instead.
            `);
                        return this._workspace.getDefaultProjectName();
                    }
                    throw e;
                }
            }
            return undefined;
        });
        if (options.interactive !== false && process.stdout.isTTY) {
            workflow.registry.usePromptProvider((definitions) => {
                const questions = definitions.map(definition => {
                    const question = {
                        name: definition.id,
                        message: definition.message,
                        default: definition.default,
                    };
                    const validator = definition.validator;
                    if (validator) {
                        question.validate = input => validator(input);
                    }
                    switch (definition.type) {
                        case 'confirmation':
                            question.type = 'confirm';
                            break;
                        case 'list':
                            question.type = 'list';
                            question.choices = definition.items && definition.items.map(item => {
                                if (typeof item == 'string') {
                                    return item;
                                }
                                else {
                                    return {
                                        name: item.label,
                                        value: item.value,
                                    };
                                }
                            });
                            break;
                        default:
                            question.type = definition.type;
                            break;
                    }
                    return question;
                });
                return inquirer.prompt(questions);
            });
        }
        return this._workflow = workflow;
    }
    getDefaultSchematicCollection() {
        let workspace = config_1.getWorkspace('local');
        if (workspace) {
            const project = config_1.getProjectByCwd(workspace);
            if (project && workspace.getProjectCli(project)) {
                const value = workspace.getProjectCli(project)['defaultCollection'];
                if (typeof value == 'string') {
                    return value;
                }
            }
            if (workspace.getCli()) {
                const value = workspace.getCli()['defaultCollection'];
                if (typeof value == 'string') {
                    return value;
                }
            }
        }
        workspace = config_1.getWorkspace('global');
        if (workspace && workspace.getCli()) {
            const value = workspace.getCli()['defaultCollection'];
            if (typeof value == 'string') {
                return value;
            }
        }
        return this.collectionName;
    }
    async runSchematic(options) {
        const { schematicOptions, debug, dryRun } = options;
        let { collectionName, schematicName } = options;
        let nothingDone = true;
        let loggingQueue = [];
        let error = false;
        const workflow = this._workflow;
        const workingDir = core_1.normalize(systemPath.relative(this.workspace.root, process.cwd()));
        // Get the option object from the schematic schema.
        const schematic = this.getSchematic(this.getCollection(collectionName), schematicName, this.allowPrivateSchematics);
        // Update the schematic and collection name in case they're not the same as the ones we
        // received in our options, e.g. after alias resolution or extension.
        collectionName = schematic.collection.description.name;
        schematicName = schematic.description.name;
        // TODO: Remove warning check when 'targets' is default
        if (collectionName !== this.collectionName) {
            const [ast, configPath] = config_1.getWorkspaceRaw('local');
            if (ast) {
                const projectsKeyValue = ast.properties.find(p => p.key.value === 'projects');
                if (!projectsKeyValue || projectsKeyValue.value.kind !== 'object') {
                    return;
                }
                const positions = [];
                for (const projectKeyValue of projectsKeyValue.value.properties) {
                    const projectNode = projectKeyValue.value;
                    if (projectNode.kind !== 'object') {
                        continue;
                    }
                    const targetsKeyValue = projectNode.properties.find(p => p.key.value === 'targets');
                    if (targetsKeyValue) {
                        positions.push(targetsKeyValue.start);
                    }
                }
                if (positions.length > 0) {
                    const warning = core_1.tags.oneLine `
            WARNING: This command may not execute successfully.
            The package/collection may not support the 'targets' field within '${configPath}'.
            This can be corrected by renaming the following 'targets' fields to 'architect':
          `;
                    const locations = positions
                        .map((p, i) => `${i + 1}) Line: ${p.line + 1}; Column: ${p.character + 1}`)
                        .join('\n');
                    this.logger.warn(warning + '\n' + locations + '\n');
                }
            }
        }
        // Set the options of format "path".
        let o = null;
        let args;
        if (!schematic.description.schemaJson) {
            args = await this.parseFreeFormArguments(schematicOptions || []);
        }
        else {
            o = await json_schema_1.parseJsonSchemaToOptions(workflow.registry, schematic.description.schemaJson);
            args = await this.parseArguments(schematicOptions || [], o);
        }
        const pathOptions = o ? this.setPathOptions(o, workingDir) : {};
        let input = Object.assign(pathOptions, args);
        // Read the default values from the workspace.
        const projectName = input.project !== undefined ? '' + input.project : null;
        const defaults = config_1.getSchematicDefaults(collectionName, schematicName, projectName);
        input = Object.assign({}, defaults, input);
        workflow.reporter.subscribe((event) => {
            nothingDone = false;
            // Strip leading slash to prevent confusion.
            const eventPath = event.path.startsWith('/') ? event.path.substr(1) : event.path;
            switch (event.kind) {
                case 'error':
                    error = true;
                    const desc = event.description == 'alreadyExist' ? 'already exists' : 'does not exist.';
                    this.logger.warn(`ERROR! ${eventPath} ${desc}.`);
                    break;
                case 'update':
                    loggingQueue.push(core_1.tags.oneLine `
            ${core_1.terminal.white('UPDATE')} ${eventPath} (${event.content.length} bytes)
          `);
                    break;
                case 'create':
                    loggingQueue.push(core_1.tags.oneLine `
            ${core_1.terminal.green('CREATE')} ${eventPath} (${event.content.length} bytes)
          `);
                    break;
                case 'delete':
                    loggingQueue.push(`${core_1.terminal.yellow('DELETE')} ${eventPath}`);
                    break;
                case 'rename':
                    loggingQueue.push(`${core_1.terminal.blue('RENAME')} ${eventPath} => ${event.to}`);
                    break;
            }
        });
        workflow.lifeCycle.subscribe(event => {
            if (event.kind == 'end' || event.kind == 'post-tasks-start') {
                if (!error) {
                    // Output the logging queue, no error happened.
                    loggingQueue.forEach(log => this.logger.info(log));
                }
                loggingQueue = [];
                error = false;
            }
        });
        return new Promise((resolve) => {
            workflow.execute({
                collection: collectionName,
                schematic: schematicName,
                options: input,
                debug: debug,
                logger: this.logger,
                allowPrivate: this.allowPrivateSchematics,
            })
                .subscribe({
                error: (err) => {
                    // In case the workflow was not successful, show an appropriate error message.
                    if (err instanceof schematics_1.UnsuccessfulWorkflowExecution) {
                        // "See above" because we already printed the error.
                        this.logger.fatal('The Schematic workflow failed. See above.');
                    }
                    else if (debug) {
                        this.logger.fatal(`An error occured:\n${err.message}\n${err.stack}`);
                    }
                    else {
                        this.logger.fatal(err.message);
                    }
                    resolve(1);
                },
                complete: () => {
                    const showNothingDone = !(options.showNothingDone === false);
                    if (nothingDone && showNothingDone) {
                        this.logger.info('Nothing to be done.');
                    }
                    if (dryRun) {
                        this.logger.warn(`\nNOTE: The "dryRun" flag means no changes were made.`);
                    }
                    resolve();
                },
            });
        });
    }
    async parseFreeFormArguments(schematicOptions) {
        return parser_1.parseFreeFormArguments(schematicOptions);
    }
    async parseArguments(schematicOptions, options) {
        return parser_1.parseArguments(schematicOptions, options);
    }
    _loadWorkspace() {
        if (this._workspace) {
            return;
        }
        const workspaceLoader = new workspace_loader_1.WorkspaceLoader(this._host);
        try {
            workspaceLoader.loadWorkspace(this.workspace.root).pipe(operators_1.take(1))
                .subscribe((workspace) => this._workspace = workspace, (err) => {
                if (!this.allowMissingWorkspace) {
                    // Ignore missing workspace
                    throw err;
                }
            });
        }
        catch (err) {
            if (!this.allowMissingWorkspace) {
                // Ignore missing workspace
                throw err;
            }
        }
    }
}
exports.SchematicCommand = SchematicCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQVU4QjtBQUM5QixvREFBMkQ7QUFDM0QsMkRBTW9DO0FBQ3BDLDREQVMwQztBQUMxQyxxQ0FBcUM7QUFDckMsbUNBQW1DO0FBQ25DLDhDQUFzQztBQUN0QyxpRUFBNkQ7QUFDN0QsZ0RBTTZCO0FBQzdCLDBEQUFvRTtBQUNwRSx1Q0FBd0Q7QUFFeEQscUNBQWtFO0FBbUJsRSxNQUFhLHNCQUF1QixTQUFRLEtBQUs7SUFDL0MsWUFBWSxjQUFzQjtRQUNoQyxLQUFLLENBQUMsdUJBQXVCLGNBQWMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNGO0FBSkQsd0RBSUM7QUFFRCxNQUFzQixnQkFFcEIsU0FBUSxpQkFBVTtJQVVsQixZQUNFLE9BQXVCLEVBQ3ZCLFdBQStCLEVBQy9CLE1BQXNCLEVBQ0wsY0FBd0MsSUFBSSw2QkFBcUIsRUFBRTtRQUVwRixLQUFLLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUZuQixnQkFBVyxHQUFYLFdBQVcsQ0FBd0Q7UUFiN0UsMkJBQXNCLEdBQVksS0FBSyxDQUFDO1FBQ3pDLFVBQUssR0FBRyxJQUFJLHFCQUFjLEVBQUUsQ0FBQztRQUszQixtQkFBYyxHQUFHLHFCQUFxQixDQUFDO1FBVS9DLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSw0QkFBZSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRU0sS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFzQjtRQUM1QyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU3QixJQUFJLElB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QyxVQUFVLEVBQUU7WUFDbkIsT0FBTztTQUNSO1FBQ0QsTUFBTSxlQUFlLEdBQUcsSUFBSSxrQ0FBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV4RCxJQUFJO1lBQ0YsZUFBZSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUM3RCxTQUFTLENBQ1IsQ0FBQyxTQUEyQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsRUFDNUUsQ0FBQyxHQUFVLEVBQUUsRUFBRTtnQkFDYixJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFO29CQUMvQiwyQkFBMkI7b0JBQzNCLE1BQU0sR0FBRyxDQUFDO2lCQUNYO1lBQ0gsQ0FBQyxDQUNGLENBQUM7U0FDTDtRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRTtnQkFDL0IsMkJBQTJCO2dCQUMzQixNQUFNLEdBQUcsQ0FBQzthQUNmO1NBQ0U7SUFDSCxDQUFDO0NBQ0Y7QUFuZUQsNENBbWVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtcbiAgZXhwZXJpbWVudGFsLFxuICBqc29uLFxuICBsb2dnaW5nLFxuICBub3JtYWxpemUsXG4gIHNjaGVtYSxcbiAgc3RyaW5ncyxcbiAgdGFncyxcbiAgdGVybWluYWwsXG4gIHZpcnR1YWxGcyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgTm9kZUpzU3luY0hvc3QgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZS9ub2RlJztcbmltcG9ydCB7XG4gIERyeVJ1bkV2ZW50LFxuICBFbmdpbmUsXG4gIFNjaGVtYXRpY0VuZ2luZSxcbiAgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24sXG4gIHdvcmtmbG93LFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQge1xuICBGaWxlU3lzdGVtQ29sbGVjdGlvbixcbiAgRmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjLFxuICBGaWxlU3lzdGVtRW5naW5lSG9zdEJhc2UsXG4gIEZpbGVTeXN0ZW1TY2hlbWF0aWMsXG4gIEZpbGVTeXN0ZW1TY2hlbWF0aWNEZXNjLFxuICBOb2RlTW9kdWxlc0VuZ2luZUhvc3QsXG4gIE5vZGVXb3JrZmxvdyxcbiAgdmFsaWRhdGVPcHRpb25zV2l0aFNjaGVtYSxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0ICogYXMgaW5xdWlyZXIgZnJvbSAnaW5xdWlyZXInO1xuaW1wb3J0ICogYXMgc3lzdGVtUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHRha2UgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBXb3Jrc3BhY2VMb2FkZXIgfSBmcm9tICcuLi9tb2RlbHMvd29ya3NwYWNlLWxvYWRlcic7XG5pbXBvcnQge1xuICBnZXRQYWNrYWdlTWFuYWdlcixcbiAgZ2V0UHJvamVjdEJ5Q3dkLFxuICBnZXRTY2hlbWF0aWNEZWZhdWx0cyxcbiAgZ2V0V29ya3NwYWNlLFxuICBnZXRXb3Jrc3BhY2VSYXcsXG59IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7IEJhc2VDb21tYW5kT3B0aW9ucywgQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZCc7XG5pbXBvcnQgeyBBcmd1bWVudHMsIENvbW1hbmRDb250ZXh0LCBDb21tYW5kRGVzY3JpcHRpb24sIE9wdGlvbiB9IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB7IHBhcnNlQXJndW1lbnRzLCBwYXJzZUZyZWVGb3JtQXJndW1lbnRzIH0gZnJvbSAnLi9wYXJzZXInO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgQmFzZVNjaGVtYXRpY1NjaGVtYSB7XG4gIGRlYnVnPzogYm9vbGVhbjtcbiAgZHJ5UnVuPzogYm9vbGVhbjtcbiAgZm9yY2U/OiBib29sZWFuO1xuICBpbnRlcmFjdGl2ZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuU2NoZW1hdGljT3B0aW9ucyBleHRlbmRzIEJhc2VTY2hlbWF0aWNTY2hlbWEge1xuICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICBzY2hlbWF0aWNOYW1lOiBzdHJpbmc7XG5cbiAgc2NoZW1hdGljT3B0aW9ucz86IHN0cmluZ1tdO1xuICBzaG93Tm90aGluZ0RvbmU/OiBib29sZWFuO1xufVxuXG5cbmV4cG9ydCBjbGFzcyBVbmtub3duQ29sbGVjdGlvbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcihjb2xsZWN0aW9uTmFtZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoYEludmFsaWQgY29sbGVjdGlvbiAoJHtjb2xsZWN0aW9uTmFtZX0pLmApO1xuICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTY2hlbWF0aWNDb21tYW5kPFxuICBUIGV4dGVuZHMgKEJhc2VTY2hlbWF0aWNTY2hlbWEgJiBCYXNlQ29tbWFuZE9wdGlvbnMpLFxuPiBleHRlbmRzIENvbW1hbmQ8VD4ge1xuICByZWFkb25seSBhbGxvd1ByaXZhdGVTY2hlbWF0aWNzOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgX2hvc3QgPSBuZXcgTm9kZUpzU3luY0hvc3QoKTtcbiAgcHJpdmF0ZSBfd29ya3NwYWNlOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZTtcbiAgcHJpdmF0ZSByZWFkb25seSBfZW5naW5lOiBFbmdpbmU8RmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjLCBGaWxlU3lzdGVtU2NoZW1hdGljRGVzYz47XG4gIHByb3RlY3RlZCBfd29ya2Zsb3c6IHdvcmtmbG93LkJhc2VXb3JrZmxvdztcblxuICBwcm90ZWN0ZWQgY29sbGVjdGlvbk5hbWUgPSAnQHNjaGVtYXRpY3MvYW5ndWxhcic7XG4gIHByb3RlY3RlZCBzY2hlbWF0aWNOYW1lPzogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGNvbnRleHQ6IENvbW1hbmRDb250ZXh0LFxuICAgIGRlc2NyaXB0aW9uOiBDb21tYW5kRGVzY3JpcHRpb24sXG4gICAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcixcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9lbmdpbmVIb3N0OiBGaWxlU3lzdGVtRW5naW5lSG9zdEJhc2UgPSBuZXcgTm9kZU1vZHVsZXNFbmdpbmVIb3N0KCksXG4gICkge1xuICAgIHN1cGVyKGNvbnRleHQsIGRlc2NyaXB0aW9uLCBsb2dnZXIpO1xuICAgIHRoaXMuX2VuZ2luZSA9IG5ldyBTY2hlbWF0aWNFbmdpbmUodGhpcy5fZW5naW5lSG9zdCk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBUICYgQXJndW1lbnRzKSB7XG4gICAgdGhpcy5fbG9hZFdvcmtzcGFjZSgpO1xuICAgIHRoaXMuY3JlYXRlV29ya2Zsb3cob3B0aW9ucyk7XG5cbiAgICBpZiAodGhpcy5zY2hlbWF0aWNOYW1lKSB7XG4gICAgICAvLyBTZXQgdGhlIG9wdGlvbnMuXG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gdGhpcy5nZXRDb2xsZWN0aW9uKHRoaXMuY29sbGVjdGlvbk5hbWUpO1xuICAgICAgY29uc3Qgc2NoZW1hdGljID0gdGhpcy5nZXRTY2hlbWF0aWMoY29sbGVjdGlvbiwgdGhpcy5zY2hlbWF0aWNOYW1lLCB0cnVlKTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMoXG4gICAgICAgIHRoaXMuX3dvcmtmbG93LnJlZ2lzdHJ5LFxuICAgICAgICBzY2hlbWF0aWMuZGVzY3JpcHRpb24uc2NoZW1hSnNvbiB8fCB7fSxcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5wdXNoKC4uLm9wdGlvbnMuZmlsdGVyKHggPT4gIXguaGlkZGVuKSk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGFzeW5jIHByaW50SGVscChvcHRpb25zOiBUICYgQXJndW1lbnRzKSB7XG4gICAgYXdhaXQgc3VwZXIucHJpbnRIZWxwKG9wdGlvbnMpO1xuICAgIHRoaXMubG9nZ2VyLmluZm8oJycpO1xuXG4gICAgY29uc3Qgc3ViQ29tbWFuZE9wdGlvbiA9IHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5maWx0ZXIoeCA9PiB4LnN1YmNvbW1hbmRzKVswXTtcblxuICAgIGlmICghc3ViQ29tbWFuZE9wdGlvbiB8fCAhc3ViQ29tbWFuZE9wdGlvbi5zdWJjb21tYW5kcykge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgY29uc3Qgc2NoZW1hdGljTmFtZXMgPSBPYmplY3Qua2V5cyhzdWJDb21tYW5kT3B0aW9uLnN1YmNvbW1hbmRzKTtcblxuICAgIGlmIChzY2hlbWF0aWNOYW1lcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCdBdmFpbGFibGUgU2NoZW1hdGljczonKTtcblxuICAgICAgY29uc3QgbmFtZXNQZXJDb2xsZWN0aW9uOiB7IFtjOiBzdHJpbmddOiBzdHJpbmdbXSB9ID0ge307XG4gICAgICBzY2hlbWF0aWNOYW1lcy5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICBsZXQgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IG5hbWUuc3BsaXQoLzovLCAyKTtcbiAgICAgICAgaWYgKCFzY2hlbWF0aWNOYW1lKSB7XG4gICAgICAgICAgc2NoZW1hdGljTmFtZSA9IGNvbGxlY3Rpb25OYW1lO1xuICAgICAgICAgIGNvbGxlY3Rpb25OYW1lID0gdGhpcy5jb2xsZWN0aW9uTmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbmFtZXNQZXJDb2xsZWN0aW9uW2NvbGxlY3Rpb25OYW1lXSkge1xuICAgICAgICAgIG5hbWVzUGVyQ29sbGVjdGlvbltjb2xsZWN0aW9uTmFtZV0gPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5hbWVzUGVyQ29sbGVjdGlvbltjb2xsZWN0aW9uTmFtZV0ucHVzaChzY2hlbWF0aWNOYW1lKTtcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBkZWZhdWx0Q29sbGVjdGlvbiA9IHRoaXMuZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKTtcbiAgICAgIE9iamVjdC5rZXlzKG5hbWVzUGVyQ29sbGVjdGlvbikuZm9yRWFjaChjb2xsZWN0aW9uTmFtZSA9PiB7XG4gICAgICAgIGNvbnN0IGlzRGVmYXVsdCA9IGRlZmF1bHRDb2xsZWN0aW9uID09IGNvbGxlY3Rpb25OYW1lO1xuICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKFxuICAgICAgICAgIGAgIENvbGxlY3Rpb24gXCIke2NvbGxlY3Rpb25OYW1lfVwiJHtpc0RlZmF1bHQgPyAnIChkZWZhdWx0KScgOiAnJ306YCxcbiAgICAgICAgKTtcblxuICAgICAgICBuYW1lc1BlckNvbGxlY3Rpb25bY29sbGVjdGlvbk5hbWVdLmZvckVhY2goc2NoZW1hdGljTmFtZSA9PiB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgICAgICR7c2NoZW1hdGljTmFtZX1gKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHNjaGVtYXRpY05hbWVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCdIZWxwIGZvciBzY2hlbWF0aWMgJyArIHNjaGVtYXRpY05hbWVzWzBdKTtcbiAgICAgIGF3YWl0IHRoaXMucHJpbnRIZWxwU3ViY29tbWFuZChzdWJDb21tYW5kT3B0aW9uLnN1YmNvbW1hbmRzW3NjaGVtYXRpY05hbWVzWzBdXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBhc3luYyBwcmludEhlbHBVc2FnZSgpIHtcbiAgICBjb25zdCBzdWJDb21tYW5kT3B0aW9uID0gdGhpcy5kZXNjcmlwdGlvbi5vcHRpb25zLmZpbHRlcih4ID0+IHguc3ViY29tbWFuZHMpWzBdO1xuXG4gICAgaWYgKCFzdWJDb21tYW5kT3B0aW9uIHx8ICFzdWJDb21tYW5kT3B0aW9uLnN1YmNvbW1hbmRzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc2NoZW1hdGljTmFtZXMgPSBPYmplY3Qua2V5cyhzdWJDb21tYW5kT3B0aW9uLnN1YmNvbW1hbmRzKTtcbiAgICBpZiAoc2NoZW1hdGljTmFtZXMubGVuZ3RoID09IDEpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8odGhpcy5kZXNjcmlwdGlvbi5kZXNjcmlwdGlvbik7XG5cbiAgICAgIGNvbnN0IG9wdHMgPSB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMuZmlsdGVyKHggPT4geC5wb3NpdGlvbmFsID09PSB1bmRlZmluZWQpO1xuICAgICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHNjaGVtYXRpY05hbWVzWzBdLnNwbGl0KC86LylbMF07XG5cbiAgICAgIC8vIERpc3BsYXkgPGNvbGxlY3Rpb25OYW1lOnNjaGVtYXRpY05hbWU+IGlmIHRoaXMgaXMgbm90IHRoZSBkZWZhdWx0IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgLy8gb3RoZXJ3aXNlIGp1c3Qgc2hvdyB0aGUgc2NoZW1hdGljTmFtZS5cbiAgICAgIGNvbnN0IGRpc3BsYXlOYW1lID0gY29sbGVjdGlvbk5hbWUgPT0gdGhpcy5nZXREZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbigpXG4gICAgICAgID8gc2NoZW1hdGljTmFtZVxuICAgICAgICA6IHNjaGVtYXRpY05hbWVzWzBdO1xuXG4gICAgICBjb25zdCBzY2hlbWF0aWNPcHRpb25zID0gc3ViQ29tbWFuZE9wdGlvbi5zdWJjb21tYW5kc1tzY2hlbWF0aWNOYW1lc1swXV0ub3B0aW9ucztcbiAgICAgIGNvbnN0IHNjaGVtYXRpY0FyZ3MgPSBzY2hlbWF0aWNPcHRpb25zLmZpbHRlcih4ID0+IHgucG9zaXRpb25hbCAhPT0gdW5kZWZpbmVkKTtcbiAgICAgIGNvbnN0IGFyZ0Rpc3BsYXkgPSBzY2hlbWF0aWNBcmdzLmxlbmd0aCA+IDBcbiAgICAgICAgPyAnICcgKyBzY2hlbWF0aWNBcmdzLm1hcChhID0+IGA8JHtzdHJpbmdzLmRhc2hlcml6ZShhLm5hbWUpfT5gKS5qb2luKCcgJylcbiAgICAgICAgOiAnJztcblxuICAgICAgdGhpcy5sb2dnZXIuaW5mbyh0YWdzLm9uZUxpbmVgXG4gICAgICAgIHVzYWdlOiBuZyAke3RoaXMuZGVzY3JpcHRpb24ubmFtZX0gJHtkaXNwbGF5TmFtZX0ke2FyZ0Rpc3BsYXl9XG4gICAgICAgICR7b3B0cy5sZW5ndGggPiAwID8gYFtvcHRpb25zXWAgOiBgYH1cbiAgICAgIGApO1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbygnJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHN1cGVyLnByaW50SGVscFVzYWdlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGdldEVuZ2luZUhvc3QoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VuZ2luZUhvc3Q7XG4gIH1cbiAgcHJvdGVjdGVkIGdldEVuZ2luZSgpOlxuICAgICAgRW5naW5lPEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzYywgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2M+IHtcbiAgICByZXR1cm4gdGhpcy5fZW5naW5lO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldENvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWU6IHN0cmluZyk6IEZpbGVTeXN0ZW1Db2xsZWN0aW9uIHtcbiAgICBjb25zdCBlbmdpbmUgPSB0aGlzLmdldEVuZ2luZSgpO1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSBlbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG5cbiAgICBpZiAoY29sbGVjdGlvbiA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFVua25vd25Db2xsZWN0aW9uRXJyb3IoY29sbGVjdGlvbk5hbWUpO1xuICAgIH1cblxuICAgIHJldHVybiBjb2xsZWN0aW9uO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFNjaGVtYXRpYyhcbiAgICBjb2xsZWN0aW9uOiBGaWxlU3lzdGVtQ29sbGVjdGlvbixcbiAgICBzY2hlbWF0aWNOYW1lOiBzdHJpbmcsXG4gICAgYWxsb3dQcml2YXRlPzogYm9vbGVhbixcbiAgKTogRmlsZVN5c3RlbVNjaGVtYXRpYyB7XG4gICAgcmV0dXJuIGNvbGxlY3Rpb24uY3JlYXRlU2NoZW1hdGljKHNjaGVtYXRpY05hbWUsIGFsbG93UHJpdmF0ZSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgc2V0UGF0aE9wdGlvbnMob3B0aW9uczogT3B0aW9uW10sIHdvcmtpbmdEaXI6IHN0cmluZykge1xuICAgIGlmICh3b3JraW5nRGlyID09PSAnJykge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIHJldHVybiBvcHRpb25zXG4gICAgICAuZmlsdGVyKG8gPT4gby5mb3JtYXQgPT09ICdwYXRoJylcbiAgICAgIC5tYXAobyA9PiBvLm5hbWUpXG4gICAgICAucmVkdWNlKChhY2MsIGN1cnIpID0+IHtcbiAgICAgICAgYWNjW2N1cnJdID0gd29ya2luZ0RpcjtcblxuICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgfSwge30gYXMgeyBbbmFtZTogc3RyaW5nXTogc3RyaW5nIH0pO1xuICB9XG5cbiAgLypcbiAgICogUnVudGltZSBob29rIHRvIGFsbG93IHNwZWNpZnlpbmcgY3VzdG9taXplZCB3b3JrZmxvd1xuICAgKi9cbiAgcHJvdGVjdGVkIGNyZWF0ZVdvcmtmbG93KG9wdGlvbnM6IEJhc2VTY2hlbWF0aWNTY2hlbWEpOiB3b3JrZmxvdy5CYXNlV29ya2Zsb3cge1xuICAgIGlmICh0aGlzLl93b3JrZmxvdykge1xuICAgICAgcmV0dXJuIHRoaXMuX3dvcmtmbG93O1xuICAgIH1cblxuICAgIGNvbnN0IHsgZm9yY2UsIGRyeVJ1biB9ID0gb3B0aW9ucztcbiAgICBjb25zdCBmc0hvc3QgPSBuZXcgdmlydHVhbEZzLlNjb3BlZEhvc3QobmV3IE5vZGVKc1N5bmNIb3N0KCksIG5vcm1hbGl6ZSh0aGlzLndvcmtzcGFjZS5yb290KSk7XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IG5ldyBOb2RlV29ya2Zsb3coXG4gICAgICAgIGZzSG9zdCxcbiAgICAgICAge1xuICAgICAgICAgIGZvcmNlLFxuICAgICAgICAgIGRyeVJ1bixcbiAgICAgICAgICBwYWNrYWdlTWFuYWdlcjogZ2V0UGFja2FnZU1hbmFnZXIoKSxcbiAgICAgICAgICByb290OiBub3JtYWxpemUodGhpcy53b3Jrc3BhY2Uucm9vdCksXG4gICAgICAgIH0sXG4gICAgKTtcblxuICAgIHRoaXMuX2VuZ2luZUhvc3QucmVnaXN0ZXJPcHRpb25zVHJhbnNmb3JtKHZhbGlkYXRlT3B0aW9uc1dpdGhTY2hlbWEod29ya2Zsb3cucmVnaXN0cnkpKTtcblxuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFBvc3RUcmFuc2Zvcm0oc2NoZW1hLnRyYW5zZm9ybXMuYWRkVW5kZWZpbmVkRGVmYXVsdHMpO1xuXG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ3Byb2plY3ROYW1lJywgKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuX3dvcmtzcGFjZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiB0aGlzLl93b3Jrc3BhY2UuZ2V0UHJvamVjdEJ5UGF0aChub3JtYWxpemUocHJvY2Vzcy5jd2QoKSkpXG4gICAgICAgICAgICB8fCB0aGlzLl93b3Jrc3BhY2UuZ2V0RGVmYXVsdFByb2plY3ROYW1lKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuQW1iaWd1b3VzUHJvamVjdFBhdGhFeGNlcHRpb24pIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4odGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgICBUd28gb3IgbW9yZSBwcm9qZWN0cyBhcmUgdXNpbmcgaWRlbnRpY2FsIHJvb3RzLlxuICAgICAgICAgICAgICBVbmFibGUgdG8gZGV0ZXJtaW5lIHByb2plY3QgdXNpbmcgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeS5cbiAgICAgICAgICAgICAgVXNpbmcgZGVmYXVsdCB3b3Jrc3BhY2UgcHJvamVjdCBpbnN0ZWFkLlxuICAgICAgICAgICAgYCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93b3Jrc3BhY2UuZ2V0RGVmYXVsdFByb2plY3ROYW1lKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9KTtcblxuICAgIGlmIChvcHRpb25zLmludGVyYWN0aXZlICE9PSBmYWxzZSAmJiBwcm9jZXNzLnN0ZG91dC5pc1RUWSkge1xuICAgICAgd29ya2Zsb3cucmVnaXN0cnkudXNlUHJvbXB0UHJvdmlkZXIoKGRlZmluaXRpb25zOiBBcnJheTxzY2hlbWEuUHJvbXB0RGVmaW5pdGlvbj4pID0+IHtcbiAgICAgICAgY29uc3QgcXVlc3Rpb25zOiBpbnF1aXJlci5RdWVzdGlvbnMgPSBkZWZpbml0aW9ucy5tYXAoZGVmaW5pdGlvbiA9PiB7XG4gICAgICAgICAgY29uc3QgcXVlc3Rpb246IGlucXVpcmVyLlF1ZXN0aW9uID0ge1xuICAgICAgICAgICAgbmFtZTogZGVmaW5pdGlvbi5pZCxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGRlZmluaXRpb24ubWVzc2FnZSxcbiAgICAgICAgICAgIGRlZmF1bHQ6IGRlZmluaXRpb24uZGVmYXVsdCxcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgY29uc3QgdmFsaWRhdG9yID0gZGVmaW5pdGlvbi52YWxpZGF0b3I7XG4gICAgICAgICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgICAgICAgcXVlc3Rpb24udmFsaWRhdGUgPSBpbnB1dCA9PiB2YWxpZGF0b3IoaW5wdXQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHN3aXRjaCAoZGVmaW5pdGlvbi50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdjb25maXJtYXRpb24nOlxuICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gJ2NvbmZpcm0nO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2xpc3QnOlxuICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gJ2xpc3QnO1xuICAgICAgICAgICAgICBxdWVzdGlvbi5jaG9pY2VzID0gZGVmaW5pdGlvbi5pdGVtcyAmJiBkZWZpbml0aW9uLml0ZW1zLm1hcChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLmxhYmVsLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gZGVmaW5pdGlvbi50eXBlO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gcXVlc3Rpb247XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBpbnF1aXJlci5wcm9tcHQocXVlc3Rpb25zKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl93b3JrZmxvdyA9IHdvcmtmbG93O1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCk6IHN0cmluZyB7XG4gICAgbGV0IHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcblxuICAgIGlmICh3b3Jrc3BhY2UpIHtcbiAgICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICAgIGlmIChwcm9qZWN0ICYmIHdvcmtzcGFjZS5nZXRQcm9qZWN0Q2xpKHByb2plY3QpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gd29ya3NwYWNlLmdldFByb2plY3RDbGkocHJvamVjdClbJ2RlZmF1bHRDb2xsZWN0aW9uJ107XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh3b3Jrc3BhY2UuZ2V0Q2xpKCkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB3b3Jrc3BhY2UuZ2V0Q2xpKClbJ2RlZmF1bHRDb2xsZWN0aW9uJ107XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIGlmICh3b3Jrc3BhY2UgJiYgd29ya3NwYWNlLmdldENsaSgpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHdvcmtzcGFjZS5nZXRDbGkoKVsnZGVmYXVsdENvbGxlY3Rpb24nXTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb25OYW1lO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1blNjaGVtYXRpYyhvcHRpb25zOiBSdW5TY2hlbWF0aWNPcHRpb25zKSB7XG4gICAgY29uc3QgeyBzY2hlbWF0aWNPcHRpb25zLCBkZWJ1ZywgZHJ5UnVuIH0gPSBvcHRpb25zO1xuICAgIGxldCB7IGNvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lIH0gPSBvcHRpb25zO1xuXG4gICAgbGV0IG5vdGhpbmdEb25lID0gdHJ1ZTtcbiAgICBsZXQgbG9nZ2luZ1F1ZXVlOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCBlcnJvciA9IGZhbHNlO1xuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSB0aGlzLl93b3JrZmxvdztcblxuICAgIGNvbnN0IHdvcmtpbmdEaXIgPSBub3JtYWxpemUoc3lzdGVtUGF0aC5yZWxhdGl2ZSh0aGlzLndvcmtzcGFjZS5yb290LCBwcm9jZXNzLmN3ZCgpKSk7XG5cbiAgICAvLyBHZXQgdGhlIG9wdGlvbiBvYmplY3QgZnJvbSB0aGUgc2NoZW1hdGljIHNjaGVtYS5cbiAgICBjb25zdCBzY2hlbWF0aWMgPSB0aGlzLmdldFNjaGVtYXRpYyhcbiAgICAgIHRoaXMuZ2V0Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSksXG4gICAgICBzY2hlbWF0aWNOYW1lLFxuICAgICAgdGhpcy5hbGxvd1ByaXZhdGVTY2hlbWF0aWNzLFxuICAgICk7XG4gICAgLy8gVXBkYXRlIHRoZSBzY2hlbWF0aWMgYW5kIGNvbGxlY3Rpb24gbmFtZSBpbiBjYXNlIHRoZXkncmUgbm90IHRoZSBzYW1lIGFzIHRoZSBvbmVzIHdlXG4gICAgLy8gcmVjZWl2ZWQgaW4gb3VyIG9wdGlvbnMsIGUuZy4gYWZ0ZXIgYWxpYXMgcmVzb2x1dGlvbiBvciBleHRlbnNpb24uXG4gICAgY29sbGVjdGlvbk5hbWUgPSBzY2hlbWF0aWMuY29sbGVjdGlvbi5kZXNjcmlwdGlvbi5uYW1lO1xuICAgIHNjaGVtYXRpY05hbWUgPSBzY2hlbWF0aWMuZGVzY3JpcHRpb24ubmFtZTtcblxuICAgIC8vIFRPRE86IFJlbW92ZSB3YXJuaW5nIGNoZWNrIHdoZW4gJ3RhcmdldHMnIGlzIGRlZmF1bHRcbiAgICBpZiAoY29sbGVjdGlvbk5hbWUgIT09IHRoaXMuY29sbGVjdGlvbk5hbWUpIHtcbiAgICAgIGNvbnN0IFthc3QsIGNvbmZpZ1BhdGhdID0gZ2V0V29ya3NwYWNlUmF3KCdsb2NhbCcpO1xuICAgICAgaWYgKGFzdCkge1xuICAgICAgICBjb25zdCBwcm9qZWN0c0tleVZhbHVlID0gYXN0LnByb3BlcnRpZXMuZmluZChwID0+IHAua2V5LnZhbHVlID09PSAncHJvamVjdHMnKTtcbiAgICAgICAgaWYgKCFwcm9qZWN0c0tleVZhbHVlIHx8IHByb2plY3RzS2V5VmFsdWUudmFsdWUua2luZCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwb3NpdGlvbnM6IGpzb24uUG9zaXRpb25bXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHByb2plY3RLZXlWYWx1ZSBvZiBwcm9qZWN0c0tleVZhbHVlLnZhbHVlLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICBjb25zdCBwcm9qZWN0Tm9kZSA9IHByb2plY3RLZXlWYWx1ZS52YWx1ZTtcbiAgICAgICAgICBpZiAocHJvamVjdE5vZGUua2luZCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCB0YXJnZXRzS2V5VmFsdWUgPSBwcm9qZWN0Tm9kZS5wcm9wZXJ0aWVzLmZpbmQocCA9PiBwLmtleS52YWx1ZSA9PT0gJ3RhcmdldHMnKTtcbiAgICAgICAgICBpZiAodGFyZ2V0c0tleVZhbHVlKSB7XG4gICAgICAgICAgICBwb3NpdGlvbnMucHVzaCh0YXJnZXRzS2V5VmFsdWUuc3RhcnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3NpdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnN0IHdhcm5pbmcgPSB0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICBXQVJOSU5HOiBUaGlzIGNvbW1hbmQgbWF5IG5vdCBleGVjdXRlIHN1Y2Nlc3NmdWxseS5cbiAgICAgICAgICAgIFRoZSBwYWNrYWdlL2NvbGxlY3Rpb24gbWF5IG5vdCBzdXBwb3J0IHRoZSAndGFyZ2V0cycgZmllbGQgd2l0aGluICcke2NvbmZpZ1BhdGh9Jy5cbiAgICAgICAgICAgIFRoaXMgY2FuIGJlIGNvcnJlY3RlZCBieSByZW5hbWluZyB0aGUgZm9sbG93aW5nICd0YXJnZXRzJyBmaWVsZHMgdG8gJ2FyY2hpdGVjdCc6XG4gICAgICAgICAgYDtcblxuICAgICAgICAgIGNvbnN0IGxvY2F0aW9ucyA9IHBvc2l0aW9uc1xuICAgICAgICAgICAgLm1hcCgocCwgaSkgPT4gYCR7aSArIDF9KSBMaW5lOiAke3AubGluZSArIDF9OyBDb2x1bW46ICR7cC5jaGFyYWN0ZXIgKyAxfWApXG4gICAgICAgICAgICAuam9pbignXFxuJyk7XG5cbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKHdhcm5pbmcgKyAnXFxuJyArIGxvY2F0aW9ucyArICdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNldCB0aGUgb3B0aW9ucyBvZiBmb3JtYXQgXCJwYXRoXCIuXG4gICAgbGV0IG86IE9wdGlvbltdIHwgbnVsbCA9IG51bGw7XG4gICAgbGV0IGFyZ3M6IEFyZ3VtZW50cztcblxuICAgIGlmICghc2NoZW1hdGljLmRlc2NyaXB0aW9uLnNjaGVtYUpzb24pIHtcbiAgICAgIGFyZ3MgPSBhd2FpdCB0aGlzLnBhcnNlRnJlZUZvcm1Bcmd1bWVudHMoc2NoZW1hdGljT3B0aW9ucyB8fCBbXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG8gPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMod29ya2Zsb3cucmVnaXN0cnksIHNjaGVtYXRpYy5kZXNjcmlwdGlvbi5zY2hlbWFKc29uKTtcbiAgICAgIGFyZ3MgPSBhd2FpdCB0aGlzLnBhcnNlQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnMgfHwgW10sIG8pO1xuICAgIH1cblxuICAgIGNvbnN0IHBhdGhPcHRpb25zID0gbyA/IHRoaXMuc2V0UGF0aE9wdGlvbnMobywgd29ya2luZ0RpcikgOiB7fTtcbiAgICBsZXQgaW5wdXQgPSBPYmplY3QuYXNzaWduKHBhdGhPcHRpb25zLCBhcmdzKTtcblxuICAgIC8vIFJlYWQgdGhlIGRlZmF1bHQgdmFsdWVzIGZyb20gdGhlIHdvcmtzcGFjZS5cbiAgICBjb25zdCBwcm9qZWN0TmFtZSA9IGlucHV0LnByb2plY3QgIT09IHVuZGVmaW5lZCA/ICcnICsgaW5wdXQucHJvamVjdCA6IG51bGw7XG4gICAgY29uc3QgZGVmYXVsdHMgPSBnZXRTY2hlbWF0aWNEZWZhdWx0cyhjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZSwgcHJvamVjdE5hbWUpO1xuICAgIGlucHV0ID0gT2JqZWN0LmFzc2lnbjx7fSwge30sIHR5cGVvZiBpbnB1dD4oe30sIGRlZmF1bHRzLCBpbnB1dCk7XG5cbiAgICB3b3JrZmxvdy5yZXBvcnRlci5zdWJzY3JpYmUoKGV2ZW50OiBEcnlSdW5FdmVudCkgPT4ge1xuICAgICAgbm90aGluZ0RvbmUgPSBmYWxzZTtcblxuICAgICAgLy8gU3RyaXAgbGVhZGluZyBzbGFzaCB0byBwcmV2ZW50IGNvbmZ1c2lvbi5cbiAgICAgIGNvbnN0IGV2ZW50UGF0aCA9IGV2ZW50LnBhdGguc3RhcnRzV2l0aCgnLycpID8gZXZlbnQucGF0aC5zdWJzdHIoMSkgOiBldmVudC5wYXRoO1xuXG4gICAgICBzd2l0Y2ggKGV2ZW50LmtpbmQpIHtcbiAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgIGVycm9yID0gdHJ1ZTtcbiAgICAgICAgICBjb25zdCBkZXNjID0gZXZlbnQuZGVzY3JpcHRpb24gPT0gJ2FscmVhZHlFeGlzdCcgPyAnYWxyZWFkeSBleGlzdHMnIDogJ2RvZXMgbm90IGV4aXN0Lic7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgRVJST1IhICR7ZXZlbnRQYXRofSAke2Rlc2N9LmApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5wdXNoKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgICR7dGVybWluYWwud2hpdGUoJ1VQREFURScpfSAke2V2ZW50UGF0aH0gKCR7ZXZlbnQuY29udGVudC5sZW5ndGh9IGJ5dGVzKVxuICAgICAgICAgIGApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjcmVhdGUnOlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5wdXNoKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgICR7dGVybWluYWwuZ3JlZW4oJ0NSRUFURScpfSAke2V2ZW50UGF0aH0gKCR7ZXZlbnQuY29udGVudC5sZW5ndGh9IGJ5dGVzKVxuICAgICAgICAgIGApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5wdXNoKGAke3Rlcm1pbmFsLnllbGxvdygnREVMRVRFJyl9ICR7ZXZlbnRQYXRofWApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdyZW5hbWUnOlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5wdXNoKGAke3Rlcm1pbmFsLmJsdWUoJ1JFTkFNRScpfSAke2V2ZW50UGF0aH0gPT4gJHtldmVudC50b31gKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHdvcmtmbG93LmxpZmVDeWNsZS5zdWJzY3JpYmUoZXZlbnQgPT4ge1xuICAgICAgaWYgKGV2ZW50LmtpbmQgPT0gJ2VuZCcgfHwgZXZlbnQua2luZCA9PSAncG9zdC10YXNrcy1zdGFydCcpIHtcbiAgICAgICAgaWYgKCFlcnJvcikge1xuICAgICAgICAgIC8vIE91dHB1dCB0aGUgbG9nZ2luZyBxdWV1ZSwgbm8gZXJyb3IgaGFwcGVuZWQuXG4gICAgICAgICAgbG9nZ2luZ1F1ZXVlLmZvckVhY2gobG9nID0+IHRoaXMubG9nZ2VyLmluZm8obG9nKSk7XG4gICAgICAgIH1cblxuICAgICAgICBsb2dnaW5nUXVldWUgPSBbXTtcbiAgICAgICAgZXJyb3IgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxudW1iZXIgfCB2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgd29ya2Zsb3cuZXhlY3V0ZSh7XG4gICAgICAgIGNvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICBzY2hlbWF0aWM6IHNjaGVtYXRpY05hbWUsXG4gICAgICAgIG9wdGlvbnM6IGlucHV0LFxuICAgICAgICBkZWJ1ZzogZGVidWcsXG4gICAgICAgIGxvZ2dlcjogdGhpcy5sb2dnZXIsXG4gICAgICAgIGFsbG93UHJpdmF0ZTogdGhpcy5hbGxvd1ByaXZhdGVTY2hlbWF0aWNzLFxuICAgICAgfSlcbiAgICAgIC5zdWJzY3JpYmUoe1xuICAgICAgICBlcnJvcjogKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAvLyBJbiBjYXNlIHRoZSB3b3JrZmxvdyB3YXMgbm90IHN1Y2Nlc3NmdWwsIHNob3cgYW4gYXBwcm9wcmlhdGUgZXJyb3IgbWVzc2FnZS5cbiAgICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24pIHtcbiAgICAgICAgICAgIC8vIFwiU2VlIGFib3ZlXCIgYmVjYXVzZSB3ZSBhbHJlYWR5IHByaW50ZWQgdGhlIGVycm9yLlxuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoJ1RoZSBTY2hlbWF0aWMgd29ya2Zsb3cgZmFpbGVkLiBTZWUgYWJvdmUuJyk7XG4gICAgICAgICAgfSBlbHNlIGlmIChkZWJ1Zykge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYEFuIGVycm9yIG9jY3VyZWQ6XFxuJHtlcnIubWVzc2FnZX1cXG4ke2Vyci5zdGFja31gKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoZXJyLm1lc3NhZ2UpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlc29sdmUoMSk7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbXBsZXRlOiAoKSA9PiB7XG4gICAgICAgICAgY29uc3Qgc2hvd05vdGhpbmdEb25lID0gIShvcHRpb25zLnNob3dOb3RoaW5nRG9uZSA9PT0gZmFsc2UpO1xuICAgICAgICAgIGlmIChub3RoaW5nRG9uZSAmJiBzaG93Tm90aGluZ0RvbmUpIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ05vdGhpbmcgdG8gYmUgZG9uZS4nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGRyeVJ1bikge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgXFxuTk9URTogVGhlIFwiZHJ5UnVuXCIgZmxhZyBtZWFucyBubyBjaGFuZ2VzIHdlcmUgbWFkZS5gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcGFyc2VGcmVlRm9ybUFyZ3VtZW50cyhzY2hlbWF0aWNPcHRpb25zOiBzdHJpbmdbXSkge1xuICAgIHJldHVybiBwYXJzZUZyZWVGb3JtQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHBhcnNlQXJndW1lbnRzKFxuICAgIHNjaGVtYXRpY09wdGlvbnM6IHN0cmluZ1tdLFxuICAgIG9wdGlvbnM6IE9wdGlvbltdIHwgbnVsbCxcbiAgKTogUHJvbWlzZTxBcmd1bWVudHM+IHtcbiAgICByZXR1cm4gcGFyc2VBcmd1bWVudHMoc2NoZW1hdGljT3B0aW9ucywgb3B0aW9ucyk7XG4gIH1cblxuICBwcml2YXRlIF9sb2FkV29ya3NwYWNlKCkge1xuICAgIGlmICh0aGlzLl93b3Jrc3BhY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgd29ya3NwYWNlTG9hZGVyID0gbmV3IFdvcmtzcGFjZUxvYWRlcih0aGlzLl9ob3N0KTtcblxuICAgIHRyeSB7XG4gICAgICB3b3Jrc3BhY2VMb2FkZXIubG9hZFdvcmtzcGFjZSh0aGlzLndvcmtzcGFjZS5yb290KS5waXBlKHRha2UoMSkpXG4gICAgICAgIC5zdWJzY3JpYmUoXG4gICAgICAgICAgKHdvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2UpID0+IHRoaXMuX3dvcmtzcGFjZSA9IHdvcmtzcGFjZSxcbiAgICAgICAgICAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmFsbG93TWlzc2luZ1dvcmtzcGFjZSkge1xuICAgICAgICAgICAgICAvLyBJZ25vcmUgbWlzc2luZyB3b3Jrc3BhY2VcbiAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoIXRoaXMuYWxsb3dNaXNzaW5nV29ya3NwYWNlKSB7XG4gICAgICAgIC8vIElnbm9yZSBtaXNzaW5nIHdvcmtzcGFjZVxuICAgICAgICB0aHJvdyBlcnI7XG4gIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==