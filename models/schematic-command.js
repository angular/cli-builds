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
const workspace_loader_1 = require("../models/workspace-loader");
const config_1 = require("../utilities/config");
const json_schema_1 = require("../utilities/json-schema");
const package_manager_1 = require("../utilities/package-manager");
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
        this.allowAdditionalArgs = false;
        this._host = new node_1.NodeJsSyncHost();
        this.collectionName = '@schematics/angular';
        this._engine = new schematics_1.SchematicEngine(this._engineHost);
    }
    async initialize(options) {
        await this._loadWorkspace();
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
            packageManager: package_manager_1.getPackageManager(this.workspace.root),
            root: core_1.normalize(this.workspace.root),
        });
        this._engineHost.registerOptionsTransform(tools_1.validateOptionsWithSchema(workflow.registry));
        if (options.defaults) {
            workflow.registry.addPreTransform(core_1.schema.transforms.addUndefinedDefaults);
        }
        else {
            workflow.registry.addPostTransform(core_1.schema.transforms.addUndefinedDefaults);
        }
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
                            question.type = !!definition.multiselect ? 'checkbox' : 'list';
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
        // ng-add is special because we don't know all possible options at this point
        if (args['--'] && !this.allowAdditionalArgs) {
            args['--'].forEach(additional => {
                this.logger.fatal(`Unknown option: '${additional.split(/=/)[0]}'`);
            });
            return 1;
        }
        const pathOptions = o ? this.setPathOptions(o, workingDir) : {};
        let input = Object.assign(pathOptions, args);
        // Read the default values from the workspace.
        const projectName = input.project !== undefined ? '' + input.project : null;
        const defaults = config_1.getSchematicDefaults(collectionName, schematicName, projectName);
        input = Object.assign({}, defaults, input, options.additionalOptions);
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
        return parser_1.parseArguments(schematicOptions, options, this.logger);
    }
    async _loadWorkspace() {
        if (this._workspace) {
            return;
        }
        const workspaceLoader = new workspace_loader_1.WorkspaceLoader(this._host);
        try {
            this._workspace = await workspaceLoader.loadWorkspace(this.workspace.root);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQVU4QjtBQUM5QixvREFBMkQ7QUFDM0QsMkRBTW9DO0FBQ3BDLDREQVMwQztBQUMxQyxxQ0FBcUM7QUFDckMsbUNBQW1DO0FBQ25DLGlFQUE2RDtBQUM3RCxnREFLNkI7QUFDN0IsMERBQW9FO0FBQ3BFLGtFQUFpRTtBQUNqRSx1Q0FBd0Q7QUFFeEQscUNBQWtFO0FBb0JsRSxNQUFhLHNCQUF1QixTQUFRLEtBQUs7SUFDL0MsWUFBWSxjQUFzQjtRQUNoQyxLQUFLLENBQUMsdUJBQXVCLGNBQWMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNGO0FBSkQsd0RBSUM7QUFFRCxNQUFzQixnQkFFcEIsU0FBUSxpQkFBVTtJQVdsQixZQUNFLE9BQXVCLEVBQ3ZCLFdBQStCLEVBQy9CLE1BQXNCLEVBQ0wsY0FBd0MsSUFBSSw2QkFBcUIsRUFBRTtRQUVwRixLQUFLLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUZuQixnQkFBVyxHQUFYLFdBQVcsQ0FBd0Q7UUFkN0UsMkJBQXNCLEdBQVksS0FBSyxDQUFDO1FBQ3hDLHdCQUFtQixHQUFZLEtBQUssQ0FBQztRQUN0QyxVQUFLLEdBQUcsSUFBSSxxQkFBYyxFQUFFLENBQUM7UUFLM0IsbUJBQWMsR0FBRyxxQkFBcUIsQ0FBQztRQVUvQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksNEJBQWUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVNLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBc0I7UUFDNUMsTUFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLGNBQWMs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bnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1xuICBleHBlcmltZW50YWwsXG4gIGpzb24sXG4gIGxvZ2dpbmcsXG4gIG5vcm1hbGl6ZSxcbiAgc2NoZW1hLFxuICBzdHJpbmdzLFxuICB0YWdzLFxuICB0ZXJtaW5hbCxcbiAgdmlydHVhbEZzLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBOb2RlSnNTeW5jSG9zdCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlL25vZGUnO1xuaW1wb3J0IHtcbiAgRHJ5UnVuRXZlbnQsXG4gIEVuZ2luZSxcbiAgU2NoZW1hdGljRW5naW5lLFxuICBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbixcbiAgd29ya2Zsb3csXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7XG4gIEZpbGVTeXN0ZW1Db2xsZWN0aW9uLFxuICBGaWxlU3lzdGVtQ29sbGVjdGlvbkRlc2MsXG4gIEZpbGVTeXN0ZW1FbmdpbmVIb3N0QmFzZSxcbiAgRmlsZVN5c3RlbVNjaGVtYXRpYyxcbiAgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2MsXG4gIE5vZGVNb2R1bGVzRW5naW5lSG9zdCxcbiAgTm9kZVdvcmtmbG93LFxuICB2YWxpZGF0ZU9wdGlvbnNXaXRoU2NoZW1hLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgKiBhcyBpbnF1aXJlciBmcm9tICdpbnF1aXJlcic7XG5pbXBvcnQgKiBhcyBzeXN0ZW1QYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgV29ya3NwYWNlTG9hZGVyIH0gZnJvbSAnLi4vbW9kZWxzL3dvcmtzcGFjZS1sb2FkZXInO1xuaW1wb3J0IHtcbiAgZ2V0UHJvamVjdEJ5Q3dkLFxuICBnZXRTY2hlbWF0aWNEZWZhdWx0cyxcbiAgZ2V0V29ya3NwYWNlLFxuICBnZXRXb3Jrc3BhY2VSYXcsXG59IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7IGdldFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWFuYWdlcic7XG5pbXBvcnQgeyBCYXNlQ29tbWFuZE9wdGlvbnMsIENvbW1hbmQgfSBmcm9tICcuL2NvbW1hbmQnO1xuaW1wb3J0IHsgQXJndW1lbnRzLCBDb21tYW5kQ29udGV4dCwgQ29tbWFuZERlc2NyaXB0aW9uLCBPcHRpb24gfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBwYXJzZUFyZ3VtZW50cywgcGFyc2VGcmVlRm9ybUFyZ3VtZW50cyB9IGZyb20gJy4vcGFyc2VyJztcblxuXG5leHBvcnQgaW50ZXJmYWNlIEJhc2VTY2hlbWF0aWNTY2hlbWEge1xuICBkZWJ1Zz86IGJvb2xlYW47XG4gIGRyeVJ1bj86IGJvb2xlYW47XG4gIGZvcmNlPzogYm9vbGVhbjtcbiAgaW50ZXJhY3RpdmU/OiBib29sZWFuO1xuICBkZWZhdWx0cz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuU2NoZW1hdGljT3B0aW9ucyBleHRlbmRzIEJhc2VTY2hlbWF0aWNTY2hlbWEge1xuICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICBzY2hlbWF0aWNOYW1lOiBzdHJpbmc7XG4gIGFkZGl0aW9uYWxPcHRpb25zPzogeyBba2V5OiBzdHJpbmddOiB7fSB9O1xuICBzY2hlbWF0aWNPcHRpb25zPzogc3RyaW5nW107XG4gIHNob3dOb3RoaW5nRG9uZT86IGJvb2xlYW47XG59XG5cblxuZXhwb3J0IGNsYXNzIFVua25vd25Db2xsZWN0aW9uRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcpIHtcbiAgICBzdXBlcihgSW52YWxpZCBjb2xsZWN0aW9uICgke2NvbGxlY3Rpb25OYW1lfSkuYCk7XG4gIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFNjaGVtYXRpY0NvbW1hbmQ8XG4gIFQgZXh0ZW5kcyAoQmFzZVNjaGVtYXRpY1NjaGVtYSAmIEJhc2VDb21tYW5kT3B0aW9ucyksXG4+IGV4dGVuZHMgQ29tbWFuZDxUPiB7XG4gIHJlYWRvbmx5IGFsbG93UHJpdmF0ZVNjaGVtYXRpY3M6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcmVhZG9ubHkgYWxsb3dBZGRpdGlvbmFsQXJnczogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIF9ob3N0ID0gbmV3IE5vZGVKc1N5bmNIb3N0KCk7XG4gIHByaXZhdGUgX3dvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2U7XG4gIHByaXZhdGUgcmVhZG9ubHkgX2VuZ2luZTogRW5naW5lPEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzYywgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2M+O1xuICBwcm90ZWN0ZWQgX3dvcmtmbG93OiB3b3JrZmxvdy5CYXNlV29ya2Zsb3c7XG5cbiAgcHJvdGVjdGVkIGNvbGxlY3Rpb25OYW1lID0gJ0BzY2hlbWF0aWNzL2FuZ3VsYXInO1xuICBwcm90ZWN0ZWQgc2NoZW1hdGljTmFtZT86IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBjb250ZXh0OiBDb21tYW5kQ29udGV4dCxcbiAgICBkZXNjcmlwdGlvbjogQ29tbWFuZERlc2NyaXB0aW9uLFxuICAgIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIsXG4gICAgcHJpdmF0ZSByZWFkb25seSBfZW5naW5lSG9zdDogRmlsZVN5c3RlbUVuZ2luZUhvc3RCYXNlID0gbmV3IE5vZGVNb2R1bGVzRW5naW5lSG9zdCgpLFxuICApIHtcbiAgICBzdXBlcihjb250ZXh0LCBkZXNjcmlwdGlvbiwgbG9nZ2VyKTtcbiAgICB0aGlzLl9lbmdpbmUgPSBuZXcgU2NoZW1hdGljRW5naW5lKHRoaXMuX2VuZ2luZUhvc3QpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogVCAmIEFyZ3VtZW50cykge1xuICAgIGF3YWl0IHRoaXMuX2xvYWRXb3Jrc3BhY2UoKTtcbiAgICB0aGlzLmNyZWF0ZVdvcmtmbG93KG9wdGlvbnMpO1xuXG4gICAgaWYgKHRoaXMuc2NoZW1hdGljTmFtZSkge1xuICAgICAgLy8gU2V0IHRoZSBvcHRpb25zLlxuICAgICAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMuZ2V0Q29sbGVjdGlvbih0aGlzLmNvbGxlY3Rpb25OYW1lKTtcbiAgICAgIGNvbnN0IHNjaGVtYXRpYyA9IHRoaXMuZ2V0U2NoZW1hdGljKGNvbGxlY3Rpb24sIHRoaXMuc2NoZW1hdGljTmFtZSwgdHJ1ZSk7XG4gICAgICBjb25zdCBvcHRpb25zID0gYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKFxuICAgICAgICB0aGlzLl93b3JrZmxvdy5yZWdpc3RyeSxcbiAgICAgICAgc2NoZW1hdGljLmRlc2NyaXB0aW9uLnNjaGVtYUpzb24gfHwge30sXG4gICAgICApO1xuXG4gICAgICB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMucHVzaCguLi5vcHRpb25zLmZpbHRlcih4ID0+ICF4LmhpZGRlbikpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBwcmludEhlbHAob3B0aW9uczogVCAmIEFyZ3VtZW50cykge1xuICAgIGF3YWl0IHN1cGVyLnByaW50SGVscChvcHRpb25zKTtcbiAgICB0aGlzLmxvZ2dlci5pbmZvKCcnKTtcblxuICAgIGNvbnN0IHN1YkNvbW1hbmRPcHRpb24gPSB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMuZmlsdGVyKHggPT4geC5zdWJjb21tYW5kcylbMF07XG5cbiAgICBpZiAoIXN1YkNvbW1hbmRPcHRpb24gfHwgIXN1YkNvbW1hbmRPcHRpb24uc3ViY29tbWFuZHMpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGNvbnN0IHNjaGVtYXRpY05hbWVzID0gT2JqZWN0LmtleXMoc3ViQ29tbWFuZE9wdGlvbi5zdWJjb21tYW5kcyk7XG5cbiAgICBpZiAoc2NoZW1hdGljTmFtZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbygnQXZhaWxhYmxlIFNjaGVtYXRpY3M6Jyk7XG5cbiAgICAgIGNvbnN0IG5hbWVzUGVyQ29sbGVjdGlvbjogeyBbYzogc3RyaW5nXTogc3RyaW5nW10gfSA9IHt9O1xuICAgICAgc2NoZW1hdGljTmFtZXMuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgbGV0IFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSBuYW1lLnNwbGl0KC86LywgMik7XG4gICAgICAgIGlmICghc2NoZW1hdGljTmFtZSkge1xuICAgICAgICAgIHNjaGVtYXRpY05hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgICAgICAgICBjb2xsZWN0aW9uTmFtZSA9IHRoaXMuY29sbGVjdGlvbk5hbWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5hbWVzUGVyQ29sbGVjdGlvbltjb2xsZWN0aW9uTmFtZV0pIHtcbiAgICAgICAgICBuYW1lc1BlckNvbGxlY3Rpb25bY29sbGVjdGlvbk5hbWVdID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBuYW1lc1BlckNvbGxlY3Rpb25bY29sbGVjdGlvbk5hbWVdLnB1c2goc2NoZW1hdGljTmFtZSk7XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgZGVmYXVsdENvbGxlY3Rpb24gPSB0aGlzLmdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCk7XG4gICAgICBPYmplY3Qua2V5cyhuYW1lc1BlckNvbGxlY3Rpb24pLmZvckVhY2goY29sbGVjdGlvbk5hbWUgPT4ge1xuICAgICAgICBjb25zdCBpc0RlZmF1bHQgPSBkZWZhdWx0Q29sbGVjdGlvbiA9PSBjb2xsZWN0aW9uTmFtZTtcbiAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhcbiAgICAgICAgICBgICBDb2xsZWN0aW9uIFwiJHtjb2xsZWN0aW9uTmFtZX1cIiR7aXNEZWZhdWx0ID8gJyAoZGVmYXVsdCknIDogJyd9OmAsXG4gICAgICAgICk7XG5cbiAgICAgICAgbmFtZXNQZXJDb2xsZWN0aW9uW2NvbGxlY3Rpb25OYW1lXS5mb3JFYWNoKHNjaGVtYXRpY05hbWUgPT4ge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmluZm8oYCAgICAke3NjaGVtYXRpY05hbWV9YCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChzY2hlbWF0aWNOYW1lcy5sZW5ndGggPT0gMSkge1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbygnSGVscCBmb3Igc2NoZW1hdGljICcgKyBzY2hlbWF0aWNOYW1lc1swXSk7XG4gICAgICBhd2FpdCB0aGlzLnByaW50SGVscFN1YmNvbW1hbmQoc3ViQ29tbWFuZE9wdGlvbi5zdWJjb21tYW5kc1tzY2hlbWF0aWNOYW1lc1swXV0pO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgYXN5bmMgcHJpbnRIZWxwVXNhZ2UoKSB7XG4gICAgY29uc3Qgc3ViQ29tbWFuZE9wdGlvbiA9IHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5maWx0ZXIoeCA9PiB4LnN1YmNvbW1hbmRzKVswXTtcblxuICAgIGlmICghc3ViQ29tbWFuZE9wdGlvbiB8fCAhc3ViQ29tbWFuZE9wdGlvbi5zdWJjb21tYW5kcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHNjaGVtYXRpY05hbWVzID0gT2JqZWN0LmtleXMoc3ViQ29tbWFuZE9wdGlvbi5zdWJjb21tYW5kcyk7XG4gICAgaWYgKHNjaGVtYXRpY05hbWVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKHRoaXMuZGVzY3JpcHRpb24uZGVzY3JpcHRpb24pO1xuXG4gICAgICBjb25zdCBvcHRzID0gdGhpcy5kZXNjcmlwdGlvbi5vcHRpb25zLmZpbHRlcih4ID0+IHgucG9zaXRpb25hbCA9PT0gdW5kZWZpbmVkKTtcbiAgICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSBzY2hlbWF0aWNOYW1lc1swXS5zcGxpdCgvOi8pWzBdO1xuXG4gICAgICAvLyBEaXNwbGF5IDxjb2xsZWN0aW9uTmFtZTpzY2hlbWF0aWNOYW1lPiBpZiB0aGlzIGlzIG5vdCB0aGUgZGVmYXVsdCBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIC8vIG90aGVyd2lzZSBqdXN0IHNob3cgdGhlIHNjaGVtYXRpY05hbWUuXG4gICAgICBjb25zdCBkaXNwbGF5TmFtZSA9IGNvbGxlY3Rpb25OYW1lID09IHRoaXMuZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKVxuICAgICAgICA/IHNjaGVtYXRpY05hbWVcbiAgICAgICAgOiBzY2hlbWF0aWNOYW1lc1swXTtcblxuICAgICAgY29uc3Qgc2NoZW1hdGljT3B0aW9ucyA9IHN1YkNvbW1hbmRPcHRpb24uc3ViY29tbWFuZHNbc2NoZW1hdGljTmFtZXNbMF1dLm9wdGlvbnM7XG4gICAgICBjb25zdCBzY2hlbWF0aWNBcmdzID0gc2NoZW1hdGljT3B0aW9ucy5maWx0ZXIoeCA9PiB4LnBvc2l0aW9uYWwgIT09IHVuZGVmaW5lZCk7XG4gICAgICBjb25zdCBhcmdEaXNwbGF5ID0gc2NoZW1hdGljQXJncy5sZW5ndGggPiAwXG4gICAgICAgID8gJyAnICsgc2NoZW1hdGljQXJncy5tYXAoYSA9PiBgPCR7c3RyaW5ncy5kYXNoZXJpemUoYS5uYW1lKX0+YCkuam9pbignICcpXG4gICAgICAgIDogJyc7XG5cbiAgICAgIHRoaXMubG9nZ2VyLmluZm8odGFncy5vbmVMaW5lYFxuICAgICAgICB1c2FnZTogbmcgJHt0aGlzLmRlc2NyaXB0aW9uLm5hbWV9ICR7ZGlzcGxheU5hbWV9JHthcmdEaXNwbGF5fVxuICAgICAgICAke29wdHMubGVuZ3RoID4gMCA/IGBbb3B0aW9uc11gIDogYGB9XG4gICAgICBgKTtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oJycpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCBzdXBlci5wcmludEhlbHBVc2FnZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBnZXRFbmdpbmVIb3N0KCkge1xuICAgIHJldHVybiB0aGlzLl9lbmdpbmVIb3N0O1xuICB9XG4gIHByb3RlY3RlZCBnZXRFbmdpbmUoKTpcbiAgICAgIEVuZ2luZTxGaWxlU3lzdGVtQ29sbGVjdGlvbkRlc2MsIEZpbGVTeXN0ZW1TY2hlbWF0aWNEZXNjPiB7XG4gICAgcmV0dXJuIHRoaXMuX2VuZ2luZTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXRDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcpOiBGaWxlU3lzdGVtQ29sbGVjdGlvbiB7XG4gICAgY29uc3QgZW5naW5lID0gdGhpcy5nZXRFbmdpbmUoKTtcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuXG4gICAgaWYgKGNvbGxlY3Rpb24gPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBVbmtub3duQ29sbGVjdGlvbkVycm9yKGNvbGxlY3Rpb25OYW1lKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29sbGVjdGlvbjtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXRTY2hlbWF0aWMoXG4gICAgY29sbGVjdGlvbjogRmlsZVN5c3RlbUNvbGxlY3Rpb24sXG4gICAgc2NoZW1hdGljTmFtZTogc3RyaW5nLFxuICAgIGFsbG93UHJpdmF0ZT86IGJvb2xlYW4sXG4gICk6IEZpbGVTeXN0ZW1TY2hlbWF0aWMge1xuICAgIHJldHVybiBjb2xsZWN0aW9uLmNyZWF0ZVNjaGVtYXRpYyhzY2hlbWF0aWNOYW1lLCBhbGxvd1ByaXZhdGUpO1xuICB9XG5cbiAgcHJvdGVjdGVkIHNldFBhdGhPcHRpb25zKG9wdGlvbnM6IE9wdGlvbltdLCB3b3JraW5nRGlyOiBzdHJpbmcpIHtcbiAgICBpZiAod29ya2luZ0RpciA9PT0gJycpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0aW9uc1xuICAgICAgLmZpbHRlcihvID0+IG8uZm9ybWF0ID09PSAncGF0aCcpXG4gICAgICAubWFwKG8gPT4gby5uYW1lKVxuICAgICAgLnJlZHVjZSgoYWNjLCBjdXJyKSA9PiB7XG4gICAgICAgIGFjY1tjdXJyXSA9IHdvcmtpbmdEaXI7XG5cbiAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgIH0sIHt9IGFzIHsgW25hbWU6IHN0cmluZ106IHN0cmluZyB9KTtcbiAgfVxuXG4gIC8qXG4gICAqIFJ1bnRpbWUgaG9vayB0byBhbGxvdyBzcGVjaWZ5aW5nIGN1c3RvbWl6ZWQgd29ya2Zsb3dcbiAgICovXG4gIHByb3RlY3RlZCBjcmVhdGVXb3JrZmxvdyhvcHRpb25zOiBCYXNlU2NoZW1hdGljU2NoZW1hKTogd29ya2Zsb3cuQmFzZVdvcmtmbG93IHtcbiAgICBpZiAodGhpcy5fd29ya2Zsb3cpIHtcbiAgICAgIHJldHVybiB0aGlzLl93b3JrZmxvdztcbiAgICB9XG5cbiAgICBjb25zdCB7IGZvcmNlLCBkcnlSdW4gfSA9IG9wdGlvbnM7XG4gICAgY29uc3QgZnNIb3N0ID0gbmV3IHZpcnR1YWxGcy5TY29wZWRIb3N0KG5ldyBOb2RlSnNTeW5jSG9zdCgpLCBub3JtYWxpemUodGhpcy53b3Jrc3BhY2Uucm9vdCkpO1xuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSBuZXcgTm9kZVdvcmtmbG93KFxuICAgICAgICBmc0hvc3QsXG4gICAgICAgIHtcbiAgICAgICAgICBmb3JjZSxcbiAgICAgICAgICBkcnlSdW4sXG4gICAgICAgICAgcGFja2FnZU1hbmFnZXI6IGdldFBhY2thZ2VNYW5hZ2VyKHRoaXMud29ya3NwYWNlLnJvb3QpLFxuICAgICAgICAgIHJvb3Q6IG5vcm1hbGl6ZSh0aGlzLndvcmtzcGFjZS5yb290KSxcbiAgICAgICAgfSxcbiAgICApO1xuXG4gICAgdGhpcy5fZW5naW5lSG9zdC5yZWdpc3Rlck9wdGlvbnNUcmFuc2Zvcm0odmFsaWRhdGVPcHRpb25zV2l0aFNjaGVtYSh3b3JrZmxvdy5yZWdpc3RyeSkpO1xuXG4gICAgaWYgKG9wdGlvbnMuZGVmYXVsdHMpIHtcbiAgICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFByZVRyYW5zZm9ybShzY2hlbWEudHJhbnNmb3Jtcy5hZGRVbmRlZmluZWREZWZhdWx0cyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFBvc3RUcmFuc2Zvcm0oc2NoZW1hLnRyYW5zZm9ybXMuYWRkVW5kZWZpbmVkRGVmYXVsdHMpO1xuICAgIH1cblxuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFNtYXJ0RGVmYXVsdFByb3ZpZGVyKCdwcm9qZWN0TmFtZScsICgpID0+IHtcbiAgICAgIGlmICh0aGlzLl93b3Jrc3BhY2UpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fd29ya3NwYWNlLmdldFByb2plY3RCeVBhdGgobm9ybWFsaXplKHByb2Nlc3MuY3dkKCkpKVxuICAgICAgICAgICAgfHwgdGhpcy5fd29ya3NwYWNlLmdldERlZmF1bHRQcm9qZWN0TmFtZSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBleHBlcmltZW50YWwud29ya3NwYWNlLkFtYmlndW91c1Byb2plY3RQYXRoRXhjZXB0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgICAgVHdvIG9yIG1vcmUgcHJvamVjdHMgYXJlIHVzaW5nIGlkZW50aWNhbCByb290cy5cbiAgICAgICAgICAgICAgVW5hYmxlIHRvIGRldGVybWluZSBwcm9qZWN0IHVzaW5nIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuXG4gICAgICAgICAgICAgIFVzaW5nIGRlZmF1bHQgd29ya3NwYWNlIHByb2plY3QgaW5zdGVhZC5cbiAgICAgICAgICAgIGApO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fd29ya3NwYWNlLmdldERlZmF1bHRQcm9qZWN0TmFtZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSk7XG5cbiAgICBpZiAob3B0aW9ucy5pbnRlcmFjdGl2ZSAhPT0gZmFsc2UgJiYgcHJvY2Vzcy5zdGRvdXQuaXNUVFkpIHtcbiAgICAgIHdvcmtmbG93LnJlZ2lzdHJ5LnVzZVByb21wdFByb3ZpZGVyKChkZWZpbml0aW9uczogQXJyYXk8c2NoZW1hLlByb21wdERlZmluaXRpb24+KSA9PiB7XG4gICAgICAgIGNvbnN0IHF1ZXN0aW9uczogaW5xdWlyZXIuUXVlc3Rpb25zID0gZGVmaW5pdGlvbnMubWFwKGRlZmluaXRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IHF1ZXN0aW9uOiBpbnF1aXJlci5RdWVzdGlvbiA9IHtcbiAgICAgICAgICAgIG5hbWU6IGRlZmluaXRpb24uaWQsXG4gICAgICAgICAgICBtZXNzYWdlOiBkZWZpbml0aW9uLm1lc3NhZ2UsXG4gICAgICAgICAgICBkZWZhdWx0OiBkZWZpbml0aW9uLmRlZmF1bHQsXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGNvbnN0IHZhbGlkYXRvciA9IGRlZmluaXRpb24udmFsaWRhdG9yO1xuICAgICAgICAgIGlmICh2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgIHF1ZXN0aW9uLnZhbGlkYXRlID0gaW5wdXQgPT4gdmFsaWRhdG9yKGlucHV0KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzd2l0Y2ggKGRlZmluaXRpb24udHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnY29uZmlybWF0aW9uJzpcbiAgICAgICAgICAgICAgcXVlc3Rpb24udHlwZSA9ICdjb25maXJtJztcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdsaXN0JzpcbiAgICAgICAgICAgICAgcXVlc3Rpb24udHlwZSA9ICEhZGVmaW5pdGlvbi5tdWx0aXNlbGVjdCA/ICdjaGVja2JveCcgOiAnbGlzdCc7XG4gICAgICAgICAgICAgIHF1ZXN0aW9uLmNob2ljZXMgPSBkZWZpbml0aW9uLml0ZW1zICYmIGRlZmluaXRpb24uaXRlbXMubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubGFiZWwsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHF1ZXN0aW9uLnR5cGUgPSBkZWZpbml0aW9uLnR5cGU7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBxdWVzdGlvbjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGlucXVpcmVyLnByb21wdChxdWVzdGlvbnMpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3dvcmtmbG93ID0gd29ya2Zsb3c7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKTogc3RyaW5nIHtcbiAgICBsZXQgd29ya3NwYWNlID0gZ2V0V29ya3NwYWNlKCdsb2NhbCcpO1xuXG4gICAgaWYgKHdvcmtzcGFjZSkge1xuICAgICAgY29uc3QgcHJvamVjdCA9IGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2UpO1xuICAgICAgaWYgKHByb2plY3QgJiYgd29ya3NwYWNlLmdldFByb2plY3RDbGkocHJvamVjdCkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB3b3Jrc3BhY2UuZ2V0UHJvamVjdENsaShwcm9qZWN0KVsnZGVmYXVsdENvbGxlY3Rpb24nXTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHdvcmtzcGFjZS5nZXRDbGkoKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHdvcmtzcGFjZS5nZXRDbGkoKVsnZGVmYXVsdENvbGxlY3Rpb24nXTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgaWYgKHdvcmtzcGFjZSAmJiB3b3Jrc3BhY2UuZ2V0Q2xpKCkpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gd29ya3NwYWNlLmdldENsaSgpWydkZWZhdWx0Q29sbGVjdGlvbiddO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbk5hbWU7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcnVuU2NoZW1hdGljKG9wdGlvbnM6IFJ1blNjaGVtYXRpY09wdGlvbnMpIHtcbiAgICBjb25zdCB7IHNjaGVtYXRpY09wdGlvbnMsIGRlYnVnLCBkcnlSdW4gfSA9IG9wdGlvbnM7XG4gICAgbGV0IHsgY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWUgfSA9IG9wdGlvbnM7XG5cbiAgICBsZXQgbm90aGluZ0RvbmUgPSB0cnVlO1xuICAgIGxldCBsb2dnaW5nUXVldWU6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IGVycm9yID0gZmFsc2U7XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IHRoaXMuX3dvcmtmbG93O1xuXG4gICAgY29uc3Qgd29ya2luZ0RpciA9IG5vcm1hbGl6ZShzeXN0ZW1QYXRoLnJlbGF0aXZlKHRoaXMud29ya3NwYWNlLnJvb3QsIHByb2Nlc3MuY3dkKCkpKTtcblxuICAgIC8vIEdldCB0aGUgb3B0aW9uIG9iamVjdCBmcm9tIHRoZSBzY2hlbWF0aWMgc2NoZW1hLlxuICAgIGNvbnN0IHNjaGVtYXRpYyA9IHRoaXMuZ2V0U2NoZW1hdGljKFxuICAgICAgdGhpcy5nZXRDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKSxcbiAgICAgIHNjaGVtYXRpY05hbWUsXG4gICAgICB0aGlzLmFsbG93UHJpdmF0ZVNjaGVtYXRpY3MsXG4gICAgKTtcbiAgICAvLyBVcGRhdGUgdGhlIHNjaGVtYXRpYyBhbmQgY29sbGVjdGlvbiBuYW1lIGluIGNhc2UgdGhleSdyZSBub3QgdGhlIHNhbWUgYXMgdGhlIG9uZXMgd2VcbiAgICAvLyByZWNlaXZlZCBpbiBvdXIgb3B0aW9ucywgZS5nLiBhZnRlciBhbGlhcyByZXNvbHV0aW9uIG9yIGV4dGVuc2lvbi5cbiAgICBjb2xsZWN0aW9uTmFtZSA9IHNjaGVtYXRpYy5jb2xsZWN0aW9uLmRlc2NyaXB0aW9uLm5hbWU7XG4gICAgc2NoZW1hdGljTmFtZSA9IHNjaGVtYXRpYy5kZXNjcmlwdGlvbi5uYW1lO1xuXG4gICAgLy8gVE9ETzogUmVtb3ZlIHdhcm5pbmcgY2hlY2sgd2hlbiAndGFyZ2V0cycgaXMgZGVmYXVsdFxuICAgIGlmIChjb2xsZWN0aW9uTmFtZSAhPT0gdGhpcy5jb2xsZWN0aW9uTmFtZSkge1xuICAgICAgY29uc3QgW2FzdCwgY29uZmlnUGF0aF0gPSBnZXRXb3Jrc3BhY2VSYXcoJ2xvY2FsJyk7XG4gICAgICBpZiAoYXN0KSB7XG4gICAgICAgIGNvbnN0IHByb2plY3RzS2V5VmFsdWUgPSBhc3QucHJvcGVydGllcy5maW5kKHAgPT4gcC5rZXkudmFsdWUgPT09ICdwcm9qZWN0cycpO1xuICAgICAgICBpZiAoIXByb2plY3RzS2V5VmFsdWUgfHwgcHJvamVjdHNLZXlWYWx1ZS52YWx1ZS5raW5kICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uczoganNvbi5Qb3NpdGlvbltdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgcHJvamVjdEtleVZhbHVlIG9mIHByb2plY3RzS2V5VmFsdWUudmFsdWUucHJvcGVydGllcykge1xuICAgICAgICAgIGNvbnN0IHByb2plY3ROb2RlID0gcHJvamVjdEtleVZhbHVlLnZhbHVlO1xuICAgICAgICAgIGlmIChwcm9qZWN0Tm9kZS5raW5kICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHRhcmdldHNLZXlWYWx1ZSA9IHByb2plY3ROb2RlLnByb3BlcnRpZXMuZmluZChwID0+IHAua2V5LnZhbHVlID09PSAndGFyZ2V0cycpO1xuICAgICAgICAgIGlmICh0YXJnZXRzS2V5VmFsdWUpIHtcbiAgICAgICAgICAgIHBvc2l0aW9ucy5wdXNoKHRhcmdldHNLZXlWYWx1ZS5zdGFydCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBvc2l0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29uc3Qgd2FybmluZyA9IHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgIFdBUk5JTkc6IFRoaXMgY29tbWFuZCBtYXkgbm90IGV4ZWN1dGUgc3VjY2Vzc2Z1bGx5LlxuICAgICAgICAgICAgVGhlIHBhY2thZ2UvY29sbGVjdGlvbiBtYXkgbm90IHN1cHBvcnQgdGhlICd0YXJnZXRzJyBmaWVsZCB3aXRoaW4gJyR7Y29uZmlnUGF0aH0nLlxuICAgICAgICAgICAgVGhpcyBjYW4gYmUgY29ycmVjdGVkIGJ5IHJlbmFtaW5nIHRoZSBmb2xsb3dpbmcgJ3RhcmdldHMnIGZpZWxkcyB0byAnYXJjaGl0ZWN0JzpcbiAgICAgICAgICBgO1xuXG4gICAgICAgICAgY29uc3QgbG9jYXRpb25zID0gcG9zaXRpb25zXG4gICAgICAgICAgICAubWFwKChwLCBpKSA9PiBgJHtpICsgMX0pIExpbmU6ICR7cC5saW5lICsgMX07IENvbHVtbjogJHtwLmNoYXJhY3RlciArIDF9YClcbiAgICAgICAgICAgIC5qb2luKCdcXG4nKTtcblxuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4od2FybmluZyArICdcXG4nICsgbG9jYXRpb25zICsgJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2V0IHRoZSBvcHRpb25zIG9mIGZvcm1hdCBcInBhdGhcIi5cbiAgICBsZXQgbzogT3B0aW9uW10gfCBudWxsID0gbnVsbDtcbiAgICBsZXQgYXJnczogQXJndW1lbnRzO1xuXG4gICAgaWYgKCFzY2hlbWF0aWMuZGVzY3JpcHRpb24uc2NoZW1hSnNvbikge1xuICAgICAgYXJncyA9IGF3YWl0IHRoaXMucGFyc2VGcmVlRm9ybUFyZ3VtZW50cyhzY2hlbWF0aWNPcHRpb25zIHx8IFtdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbyA9IGF3YWl0IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyh3b3JrZmxvdy5yZWdpc3RyeSwgc2NoZW1hdGljLmRlc2NyaXB0aW9uLnNjaGVtYUpzb24pO1xuICAgICAgYXJncyA9IGF3YWl0IHRoaXMucGFyc2VBcmd1bWVudHMoc2NoZW1hdGljT3B0aW9ucyB8fCBbXSwgbyk7XG4gICAgfVxuXG4gICAgLy8gbmctYWRkIGlzIHNwZWNpYWwgYmVjYXVzZSB3ZSBkb24ndCBrbm93IGFsbCBwb3NzaWJsZSBvcHRpb25zIGF0IHRoaXMgcG9pbnRcbiAgICBpZiAoYXJnc1snLS0nXSAmJiAhdGhpcy5hbGxvd0FkZGl0aW9uYWxBcmdzKSB7XG4gICAgICBhcmdzWyctLSddLmZvckVhY2goYWRkaXRpb25hbCA9PiB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGBVbmtub3duIG9wdGlvbjogJyR7YWRkaXRpb25hbC5zcGxpdCgvPS8pWzBdfSdgKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXRoT3B0aW9ucyA9IG8gPyB0aGlzLnNldFBhdGhPcHRpb25zKG8sIHdvcmtpbmdEaXIpIDoge307XG4gICAgbGV0IGlucHV0ID0gT2JqZWN0LmFzc2lnbihwYXRoT3B0aW9ucywgYXJncyk7XG5cbiAgICAvLyBSZWFkIHRoZSBkZWZhdWx0IHZhbHVlcyBmcm9tIHRoZSB3b3Jrc3BhY2UuXG4gICAgY29uc3QgcHJvamVjdE5hbWUgPSBpbnB1dC5wcm9qZWN0ICE9PSB1bmRlZmluZWQgPyAnJyArIGlucHV0LnByb2plY3QgOiBudWxsO1xuICAgIGNvbnN0IGRlZmF1bHRzID0gZ2V0U2NoZW1hdGljRGVmYXVsdHMoY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWUsIHByb2plY3ROYW1lKTtcbiAgICBpbnB1dCA9IHtcbiAgICAgIC4uLmRlZmF1bHRzLFxuICAgICAgLi4uaW5wdXQsXG4gICAgICAuLi5vcHRpb25zLmFkZGl0aW9uYWxPcHRpb25zLFxuICAgIH07XG5cbiAgICB3b3JrZmxvdy5yZXBvcnRlci5zdWJzY3JpYmUoKGV2ZW50OiBEcnlSdW5FdmVudCkgPT4ge1xuICAgICAgbm90aGluZ0RvbmUgPSBmYWxzZTtcblxuICAgICAgLy8gU3RyaXAgbGVhZGluZyBzbGFzaCB0byBwcmV2ZW50IGNvbmZ1c2lvbi5cbiAgICAgIGNvbnN0IGV2ZW50UGF0aCA9IGV2ZW50LnBhdGguc3RhcnRzV2l0aCgnLycpID8gZXZlbnQucGF0aC5zdWJzdHIoMSkgOiBldmVudC5wYXRoO1xuXG4gICAgICBzd2l0Y2ggKGV2ZW50LmtpbmQpIHtcbiAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgIGVycm9yID0gdHJ1ZTtcbiAgICAgICAgICBjb25zdCBkZXNjID0gZXZlbnQuZGVzY3JpcHRpb24gPT0gJ2FscmVhZHlFeGlzdCcgPyAnYWxyZWFkeSBleGlzdHMnIDogJ2RvZXMgbm90IGV4aXN0Lic7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgRVJST1IhICR7ZXZlbnRQYXRofSAke2Rlc2N9LmApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5wdXNoKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgICR7dGVybWluYWwud2hpdGUoJ1VQREFURScpfSAke2V2ZW50UGF0aH0gKCR7ZXZlbnQuY29udGVudC5sZW5ndGh9IGJ5dGVzKVxuICAgICAgICAgIGApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjcmVhdGUnOlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5wdXNoKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgICR7dGVybWluYWwuZ3JlZW4oJ0NSRUFURScpfSAke2V2ZW50UGF0aH0gKCR7ZXZlbnQuY29udGVudC5sZW5ndGh9IGJ5dGVzKVxuICAgICAgICAgIGApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5wdXNoKGAke3Rlcm1pbmFsLnllbGxvdygnREVMRVRFJyl9ICR7ZXZlbnRQYXRofWApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdyZW5hbWUnOlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5wdXNoKGAke3Rlcm1pbmFsLmJsdWUoJ1JFTkFNRScpfSAke2V2ZW50UGF0aH0gPT4gJHtldmVudC50b31gKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHdvcmtmbG93LmxpZmVDeWNsZS5zdWJzY3JpYmUoZXZlbnQgPT4ge1xuICAgICAgaWYgKGV2ZW50LmtpbmQgPT0gJ2VuZCcgfHwgZXZlbnQua2luZCA9PSAncG9zdC10YXNrcy1zdGFydCcpIHtcbiAgICAgICAgaWYgKCFlcnJvcikge1xuICAgICAgICAgIC8vIE91dHB1dCB0aGUgbG9nZ2luZyBxdWV1ZSwgbm8gZXJyb3IgaGFwcGVuZWQuXG4gICAgICAgICAgbG9nZ2luZ1F1ZXVlLmZvckVhY2gobG9nID0+IHRoaXMubG9nZ2VyLmluZm8obG9nKSk7XG4gICAgICAgIH1cblxuICAgICAgICBsb2dnaW5nUXVldWUgPSBbXTtcbiAgICAgICAgZXJyb3IgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxudW1iZXIgfCB2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgd29ya2Zsb3cuZXhlY3V0ZSh7XG4gICAgICAgIGNvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICBzY2hlbWF0aWM6IHNjaGVtYXRpY05hbWUsXG4gICAgICAgIG9wdGlvbnM6IGlucHV0LFxuICAgICAgICBkZWJ1ZzogZGVidWcsXG4gICAgICAgIGxvZ2dlcjogdGhpcy5sb2dnZXIsXG4gICAgICAgIGFsbG93UHJpdmF0ZTogdGhpcy5hbGxvd1ByaXZhdGVTY2hlbWF0aWNzLFxuICAgICAgfSlcbiAgICAgIC5zdWJzY3JpYmUoe1xuICAgICAgICBlcnJvcjogKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAvLyBJbiBjYXNlIHRoZSB3b3JrZmxvdyB3YXMgbm90IHN1Y2Nlc3NmdWwsIHNob3cgYW4gYXBwcm9wcmlhdGUgZXJyb3IgbWVzc2FnZS5cbiAgICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24pIHtcbiAgICAgICAgICAgIC8vIFwiU2VlIGFib3ZlXCIgYmVjYXVzZSB3ZSBhbHJlYWR5IHByaW50ZWQgdGhlIGVycm9yLlxuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoJ1RoZSBTY2hlbWF0aWMgd29ya2Zsb3cgZmFpbGVkLiBTZWUgYWJvdmUuJyk7XG4gICAgICAgICAgfSBlbHNlIGlmIChkZWJ1Zykge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYEFuIGVycm9yIG9jY3VyZWQ6XFxuJHtlcnIubWVzc2FnZX1cXG4ke2Vyci5zdGFja31gKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoZXJyLm1lc3NhZ2UpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlc29sdmUoMSk7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbXBsZXRlOiAoKSA9PiB7XG4gICAgICAgICAgY29uc3Qgc2hvd05vdGhpbmdEb25lID0gIShvcHRpb25zLnNob3dOb3RoaW5nRG9uZSA9PT0gZmFsc2UpO1xuICAgICAgICAgIGlmIChub3RoaW5nRG9uZSAmJiBzaG93Tm90aGluZ0RvbmUpIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ05vdGhpbmcgdG8gYmUgZG9uZS4nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGRyeVJ1bikge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgXFxuTk9URTogVGhlIFwiZHJ5UnVuXCIgZmxhZyBtZWFucyBubyBjaGFuZ2VzIHdlcmUgbWFkZS5gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcGFyc2VGcmVlRm9ybUFyZ3VtZW50cyhzY2hlbWF0aWNPcHRpb25zOiBzdHJpbmdbXSkge1xuICAgIHJldHVybiBwYXJzZUZyZWVGb3JtQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHBhcnNlQXJndW1lbnRzKFxuICAgIHNjaGVtYXRpY09wdGlvbnM6IHN0cmluZ1tdLFxuICAgIG9wdGlvbnM6IE9wdGlvbltdIHwgbnVsbCxcbiAgKTogUHJvbWlzZTxBcmd1bWVudHM+IHtcbiAgICByZXR1cm4gcGFyc2VBcmd1bWVudHMoc2NoZW1hdGljT3B0aW9ucywgb3B0aW9ucywgdGhpcy5sb2dnZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBfbG9hZFdvcmtzcGFjZSgpIHtcbiAgICBpZiAodGhpcy5fd29ya3NwYWNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHdvcmtzcGFjZUxvYWRlciA9IG5ldyBXb3Jrc3BhY2VMb2FkZXIodGhpcy5faG9zdCk7XG5cbiAgICB0cnkge1xuICAgICAgdGhpcy5fd29ya3NwYWNlID0gYXdhaXQgd29ya3NwYWNlTG9hZGVyLmxvYWRXb3Jrc3BhY2UodGhpcy53b3Jrc3BhY2Uucm9vdCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoIXRoaXMuYWxsb3dNaXNzaW5nV29ya3NwYWNlKSB7XG4gICAgICAgIC8vIElnbm9yZSBtaXNzaW5nIHdvcmtzcGFjZVxuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iXX0=