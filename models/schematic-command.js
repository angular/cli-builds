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
const analytics_1 = require("./analytics");
const command_1 = require("./command");
const parser_1 = require("./parser");
class UnknownCollectionError extends Error {
    constructor(collectionName) {
        super(`Invalid collection (${collectionName}).`);
    }
}
exports.UnknownCollectionError = UnknownCollectionError;
class SchematicCommand extends command_1.Command {
    constructor(context, description, logger) {
        super(context, description, logger);
        this.allowPrivateSchematics = false;
        this.allowAdditionalArgs = false;
        this._host = new node_1.NodeJsSyncHost();
        this.collectionName = '@schematics/angular';
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
            // Remove any user analytics from schematics that are NOT part of our safelist.
            for (const o of this.description.options) {
                if (o.userAnalytics) {
                    if (!analytics_1.isPackageNameSafeForAnalytics(this.collectionName)) {
                        o.userAnalytics = undefined;
                    }
                }
            }
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
    getEngine() {
        return this._workflow.engine;
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
        workflow.engineHost.registerContextTransform(context => {
            // This is run by ALL schematics, so if someone uses `externalSchematics(...)` which
            // is safelisted, it would move to the right analytics (even if their own isn't).
            const collectionName = context.schematic.collection.description.name;
            if (analytics_1.isPackageNameSafeForAnalytics(collectionName)) {
                return Object.assign({}, context, { analytics: this.analytics });
            }
            else {
                return Object.assign({}, context, { analytics: new core_1.analytics.NoopAnalytics() });
            }
        });
        workflow.engineHost.registerOptionsTransform(tools_1.validateOptionsWithSchema(workflow.registry));
        // This needs to be the last transform as it reports the flags to analytics (if enabled).
        workflow.engineHost.registerOptionsTransform(async (schematic, options, context) => {
            const analytics = context && context.analytics;
            if (!schematic.schemaJson || !context || !analytics) {
                return options;
            }
            const collectionName = context.schematic.collection.description.name;
            const schematicName = context.schematic.description.name;
            if (!analytics_1.isPackageNameSafeForAnalytics(collectionName)) {
                return options;
            }
            const args = await json_schema_1.parseJsonSchemaToOptions(this._workflow.registry, schematic.schemaJson);
            const dimensions = [];
            for (const option of args) {
                const ua = option.userAnalytics;
                if (option.name in options && ua) {
                    dimensions[ua] = options[option.name];
                }
            }
            analytics.event('schematics', collectionName + ':' + schematicName, { dimensions });
            return options;
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQVc4QjtBQUM5QixvREFBMkQ7QUFDM0QsMkRBQWtHO0FBQ2xHLDREQU0wQztBQUMxQyxxQ0FBcUM7QUFDckMsbUNBQW1DO0FBQ25DLGlFQUE2RDtBQUM3RCxnREFLNkI7QUFDN0IsMERBQW9FO0FBQ3BFLGtFQUFpRTtBQUNqRSwyQ0FBNEQ7QUFDNUQsdUNBQXdEO0FBRXhELHFDQUFrRTtBQW9CbEUsTUFBYSxzQkFBdUIsU0FBUSxLQUFLO0lBQy9DLFlBQVksY0FBc0I7UUFDaEMsS0FBSyxDQUFDLHVCQUF1QixjQUFjLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUM7Q0FDRjtBQUpELHdEQUlDO0FBRUQsTUFBc0IsZ0JBRXBCLFNBQVEsaUJBQVU7SUFVbEIsWUFDRSxPQUF1QixFQUN2QixXQUErQixFQUMvQixNQUFzQjtRQUV0QixLQUFLLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQWQ3QiwyQkFBc0IsR0FBWSxLQUFLLENBQUM7UUFDeEMsd0JBQW1CLEdBQVksS0FBSyxDQUFDO1FBQ3RDLFVBQUssR0FBRyxJQUFJLHFCQUFjLEVBQUUsQ0FBQztRQUkzQixtQkFBYyxHQUFHLHFCQUFxQixDQUFDO0lBU2pELENBQUM7SUFFTSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQXNCO1FBQzVDLE1BQU0sSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFN0IsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ3RCLG1CQUFtQjtZQUNuQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUks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QUFDO0lBQ2hFLENBQUM7SUFFTyxLQUFLLENBQUMsY0FBYztRQUMxQixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDbkIsT0FBTztTQUNSO1FBQ0QsTUFBTSxlQUFlLEdBQUcsSUFBSSxrQ0FBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV4RCxJQUFJO1lBQ0YsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFNLGVBQWUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUM1RTtRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRTtnQkFDL0IsMkJBQTJCO2dCQUMzQixNQUFNLEdBQUcsQ0FBQzthQUNYO1NBQ0Y7SUFDSCxDQUFDO0NBQ0Y7QUEvaEJELDRDQStoQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1xuICBhbmFseXRpY3MsXG4gIGV4cGVyaW1lbnRhbCxcbiAganNvbixcbiAgbG9nZ2luZyxcbiAgbm9ybWFsaXplLFxuICBzY2hlbWEsXG4gIHN0cmluZ3MsXG4gIHRhZ3MsXG4gIHRlcm1pbmFsLFxuICB2aXJ0dWFsRnMsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE5vZGVKc1N5bmNIb3N0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQgeyBEcnlSdW5FdmVudCwgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24sIHdvcmtmbG93IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHtcbiAgRmlsZVN5c3RlbUNvbGxlY3Rpb24sXG4gIEZpbGVTeXN0ZW1FbmdpbmUsXG4gIEZpbGVTeXN0ZW1TY2hlbWF0aWMsXG4gIE5vZGVXb3JrZmxvdyxcbiAgdmFsaWRhdGVPcHRpb25zV2l0aFNjaGVtYSxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0ICogYXMgaW5xdWlyZXIgZnJvbSAnaW5xdWlyZXInO1xuaW1wb3J0ICogYXMgc3lzdGVtUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFdvcmtzcGFjZUxvYWRlciB9IGZyb20gJy4uL21vZGVscy93b3Jrc3BhY2UtbG9hZGVyJztcbmltcG9ydCB7XG4gIGdldFByb2plY3RCeUN3ZCxcbiAgZ2V0U2NoZW1hdGljRGVmYXVsdHMsXG4gIGdldFdvcmtzcGFjZSxcbiAgZ2V0V29ya3NwYWNlUmF3LFxufSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyB9IGZyb20gJy4uL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5pbXBvcnQgeyBnZXRQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXInO1xuaW1wb3J0IHsgaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MgfSBmcm9tICcuL2FuYWx5dGljcyc7XG5pbXBvcnQgeyBCYXNlQ29tbWFuZE9wdGlvbnMsIENvbW1hbmQgfSBmcm9tICcuL2NvbW1hbmQnO1xuaW1wb3J0IHsgQXJndW1lbnRzLCBDb21tYW5kQ29udGV4dCwgQ29tbWFuZERlc2NyaXB0aW9uLCBPcHRpb24gfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBwYXJzZUFyZ3VtZW50cywgcGFyc2VGcmVlRm9ybUFyZ3VtZW50cyB9IGZyb20gJy4vcGFyc2VyJztcblxuXG5leHBvcnQgaW50ZXJmYWNlIEJhc2VTY2hlbWF0aWNTY2hlbWEge1xuICBkZWJ1Zz86IGJvb2xlYW47XG4gIGRyeVJ1bj86IGJvb2xlYW47XG4gIGZvcmNlPzogYm9vbGVhbjtcbiAgaW50ZXJhY3RpdmU/OiBib29sZWFuO1xuICBkZWZhdWx0cz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuU2NoZW1hdGljT3B0aW9ucyBleHRlbmRzIEJhc2VTY2hlbWF0aWNTY2hlbWEge1xuICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICBzY2hlbWF0aWNOYW1lOiBzdHJpbmc7XG4gIGFkZGl0aW9uYWxPcHRpb25zPzogeyBba2V5OiBzdHJpbmddOiB7fSB9O1xuICBzY2hlbWF0aWNPcHRpb25zPzogc3RyaW5nW107XG4gIHNob3dOb3RoaW5nRG9uZT86IGJvb2xlYW47XG59XG5cblxuZXhwb3J0IGNsYXNzIFVua25vd25Db2xsZWN0aW9uRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcpIHtcbiAgICBzdXBlcihgSW52YWxpZCBjb2xsZWN0aW9uICgke2NvbGxlY3Rpb25OYW1lfSkuYCk7XG4gIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFNjaGVtYXRpY0NvbW1hbmQ8XG4gIFQgZXh0ZW5kcyAoQmFzZVNjaGVtYXRpY1NjaGVtYSAmIEJhc2VDb21tYW5kT3B0aW9ucyksXG4+IGV4dGVuZHMgQ29tbWFuZDxUPiB7XG4gIHJlYWRvbmx5IGFsbG93UHJpdmF0ZVNjaGVtYXRpY3M6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcmVhZG9ubHkgYWxsb3dBZGRpdGlvbmFsQXJnczogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIF9ob3N0ID0gbmV3IE5vZGVKc1N5bmNIb3N0KCk7XG4gIHByaXZhdGUgX3dvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2U7XG4gIHByb3RlY3RlZCBfd29ya2Zsb3c6IE5vZGVXb3JrZmxvdztcblxuICBwcm90ZWN0ZWQgY29sbGVjdGlvbk5hbWUgPSAnQHNjaGVtYXRpY3MvYW5ndWxhcic7XG4gIHByb3RlY3RlZCBzY2hlbWF0aWNOYW1lPzogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGNvbnRleHQ6IENvbW1hbmRDb250ZXh0LFxuICAgIGRlc2NyaXB0aW9uOiBDb21tYW5kRGVzY3JpcHRpb24sXG4gICAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcixcbiAgKSB7XG4gICAgc3VwZXIoY29udGV4dCwgZGVzY3JpcHRpb24sIGxvZ2dlcik7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBUICYgQXJndW1lbnRzKSB7XG4gICAgYXdhaXQgdGhpcy5fbG9hZFdvcmtzcGFjZSgpO1xuICAgIHRoaXMuY3JlYXRlV29ya2Zsb3cob3B0aW9ucyk7XG5cbiAgICBpZiAodGhpcy5zY2hlbWF0aWNOYW1lKSB7XG4gICAgICAvLyBTZXQgdGhlIG9wdGlvbnMuXG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gdGhpcy5nZXRDb2xsZWN0aW9uKHRoaXMuY29sbGVjdGlvbk5hbWUpO1xuICAgICAgY29uc3Qgc2NoZW1hdGljID0gdGhpcy5nZXRTY2hlbWF0aWMoY29sbGVjdGlvbiwgdGhpcy5zY2hlbWF0aWNOYW1lLCB0cnVlKTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMoXG4gICAgICAgIHRoaXMuX3dvcmtmbG93LnJlZ2lzdHJ5LFxuICAgICAgICBzY2hlbWF0aWMuZGVzY3JpcHRpb24uc2NoZW1hSnNvbiB8fCB7fSxcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5wdXNoKC4uLm9wdGlvbnMuZmlsdGVyKHggPT4gIXguaGlkZGVuKSk7XG5cbiAgICAgIC8vIFJlbW92ZSBhbnkgdXNlciBhbmFseXRpY3MgZnJvbSBzY2hlbWF0aWNzIHRoYXQgYXJlIE5PVCBwYXJ0IG9mIG91ciBzYWZlbGlzdC5cbiAgICAgIGZvciAoY29uc3QgbyBvZiB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG8udXNlckFuYWx5dGljcykge1xuICAgICAgICAgIGlmICghaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3ModGhpcy5jb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgICAgICAgIG8udXNlckFuYWx5dGljcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcHJpbnRIZWxwKG9wdGlvbnM6IFQgJiBBcmd1bWVudHMpIHtcbiAgICBhd2FpdCBzdXBlci5wcmludEhlbHAob3B0aW9ucyk7XG4gICAgdGhpcy5sb2dnZXIuaW5mbygnJyk7XG5cbiAgICBjb25zdCBzdWJDb21tYW5kT3B0aW9uID0gdGhpcy5kZXNjcmlwdGlvbi5vcHRpb25zLmZpbHRlcih4ID0+IHguc3ViY29tbWFuZHMpWzBdO1xuXG4gICAgaWYgKCFzdWJDb21tYW5kT3B0aW9uIHx8ICFzdWJDb21tYW5kT3B0aW9uLnN1YmNvbW1hbmRzKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBjb25zdCBzY2hlbWF0aWNOYW1lcyA9IE9iamVjdC5rZXlzKHN1YkNvbW1hbmRPcHRpb24uc3ViY29tbWFuZHMpO1xuXG4gICAgaWYgKHNjaGVtYXRpY05hbWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ0F2YWlsYWJsZSBTY2hlbWF0aWNzOicpO1xuXG4gICAgICBjb25zdCBuYW1lc1BlckNvbGxlY3Rpb246IHsgW2M6IHN0cmluZ106IHN0cmluZ1tdIH0gPSB7fTtcbiAgICAgIHNjaGVtYXRpY05hbWVzLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgIGxldCBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gbmFtZS5zcGxpdCgvOi8sIDIpO1xuICAgICAgICBpZiAoIXNjaGVtYXRpY05hbWUpIHtcbiAgICAgICAgICBzY2hlbWF0aWNOYW1lID0gY29sbGVjdGlvbk5hbWU7XG4gICAgICAgICAgY29sbGVjdGlvbk5hbWUgPSB0aGlzLmNvbGxlY3Rpb25OYW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFuYW1lc1BlckNvbGxlY3Rpb25bY29sbGVjdGlvbk5hbWVdKSB7XG4gICAgICAgICAgbmFtZXNQZXJDb2xsZWN0aW9uW2NvbGxlY3Rpb25OYW1lXSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgbmFtZXNQZXJDb2xsZWN0aW9uW2NvbGxlY3Rpb25OYW1lXS5wdXNoKHNjaGVtYXRpY05hbWUpO1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGRlZmF1bHRDb2xsZWN0aW9uID0gdGhpcy5nZXREZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbigpO1xuICAgICAgT2JqZWN0LmtleXMobmFtZXNQZXJDb2xsZWN0aW9uKS5mb3JFYWNoKGNvbGxlY3Rpb25OYW1lID0+IHtcbiAgICAgICAgY29uc3QgaXNEZWZhdWx0ID0gZGVmYXVsdENvbGxlY3Rpb24gPT0gY29sbGVjdGlvbk5hbWU7XG4gICAgICAgIHRoaXMubG9nZ2VyLmluZm8oXG4gICAgICAgICAgYCAgQ29sbGVjdGlvbiBcIiR7Y29sbGVjdGlvbk5hbWV9XCIke2lzRGVmYXVsdCA/ICcgKGRlZmF1bHQpJyA6ICcnfTpgLFxuICAgICAgICApO1xuXG4gICAgICAgIG5hbWVzUGVyQ29sbGVjdGlvbltjb2xsZWN0aW9uTmFtZV0uZm9yRWFjaChzY2hlbWF0aWNOYW1lID0+IHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKGAgICAgJHtzY2hlbWF0aWNOYW1lfWApO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoc2NoZW1hdGljTmFtZXMubGVuZ3RoID09IDEpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ0hlbHAgZm9yIHNjaGVtYXRpYyAnICsgc2NoZW1hdGljTmFtZXNbMF0pO1xuICAgICAgYXdhaXQgdGhpcy5wcmludEhlbHBTdWJjb21tYW5kKHN1YkNvbW1hbmRPcHRpb24uc3ViY29tbWFuZHNbc2NoZW1hdGljTmFtZXNbMF1dKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIGFzeW5jIHByaW50SGVscFVzYWdlKCkge1xuICAgIGNvbnN0IHN1YkNvbW1hbmRPcHRpb24gPSB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMuZmlsdGVyKHggPT4geC5zdWJjb21tYW5kcylbMF07XG5cbiAgICBpZiAoIXN1YkNvbW1hbmRPcHRpb24gfHwgIXN1YkNvbW1hbmRPcHRpb24uc3ViY29tbWFuZHMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBzY2hlbWF0aWNOYW1lcyA9IE9iamVjdC5rZXlzKHN1YkNvbW1hbmRPcHRpb24uc3ViY29tbWFuZHMpO1xuICAgIGlmIChzY2hlbWF0aWNOYW1lcy5sZW5ndGggPT0gMSkge1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbyh0aGlzLmRlc2NyaXB0aW9uLmRlc2NyaXB0aW9uKTtcblxuICAgICAgY29uc3Qgb3B0cyA9IHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5maWx0ZXIoeCA9PiB4LnBvc2l0aW9uYWwgPT09IHVuZGVmaW5lZCk7XG4gICAgICBjb25zdCBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gc2NoZW1hdGljTmFtZXNbMF0uc3BsaXQoLzovKVswXTtcblxuICAgICAgLy8gRGlzcGxheSA8Y29sbGVjdGlvbk5hbWU6c2NoZW1hdGljTmFtZT4gaWYgdGhpcyBpcyBub3QgdGhlIGRlZmF1bHQgY29sbGVjdGlvbk5hbWUsXG4gICAgICAvLyBvdGhlcndpc2UganVzdCBzaG93IHRoZSBzY2hlbWF0aWNOYW1lLlxuICAgICAgY29uc3QgZGlzcGxheU5hbWUgPSBjb2xsZWN0aW9uTmFtZSA9PSB0aGlzLmdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKClcbiAgICAgICAgPyBzY2hlbWF0aWNOYW1lXG4gICAgICAgIDogc2NoZW1hdGljTmFtZXNbMF07XG5cbiAgICAgIGNvbnN0IHNjaGVtYXRpY09wdGlvbnMgPSBzdWJDb21tYW5kT3B0aW9uLnN1YmNvbW1hbmRzW3NjaGVtYXRpY05hbWVzWzBdXS5vcHRpb25zO1xuICAgICAgY29uc3Qgc2NoZW1hdGljQXJncyA9IHNjaGVtYXRpY09wdGlvbnMuZmlsdGVyKHggPT4geC5wb3NpdGlvbmFsICE9PSB1bmRlZmluZWQpO1xuICAgICAgY29uc3QgYXJnRGlzcGxheSA9IHNjaGVtYXRpY0FyZ3MubGVuZ3RoID4gMFxuICAgICAgICA/ICcgJyArIHNjaGVtYXRpY0FyZ3MubWFwKGEgPT4gYDwke3N0cmluZ3MuZGFzaGVyaXplKGEubmFtZSl9PmApLmpvaW4oJyAnKVxuICAgICAgICA6ICcnO1xuXG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKHRhZ3Mub25lTGluZWBcbiAgICAgICAgdXNhZ2U6IG5nICR7dGhpcy5kZXNjcmlwdGlvbi5uYW1lfSAke2Rpc3BsYXlOYW1lfSR7YXJnRGlzcGxheX1cbiAgICAgICAgJHtvcHRzLmxlbmd0aCA+IDAgPyBgW29wdGlvbnNdYCA6IGBgfVxuICAgICAgYCk7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgc3VwZXIucHJpbnRIZWxwVXNhZ2UoKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0RW5naW5lKCk6IEZpbGVTeXN0ZW1FbmdpbmUge1xuICAgIHJldHVybiB0aGlzLl93b3JrZmxvdy5lbmdpbmU7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZTogc3RyaW5nKTogRmlsZVN5c3RlbUNvbGxlY3Rpb24ge1xuICAgIGNvbnN0IGVuZ2luZSA9IHRoaXMuZ2V0RW5naW5lKCk7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IGVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcblxuICAgIGlmIChjb2xsZWN0aW9uID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVW5rbm93bkNvbGxlY3Rpb25FcnJvcihjb2xsZWN0aW9uTmFtZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbGxlY3Rpb247XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0U2NoZW1hdGljKFxuICAgIGNvbGxlY3Rpb246IEZpbGVTeXN0ZW1Db2xsZWN0aW9uLFxuICAgIHNjaGVtYXRpY05hbWU6IHN0cmluZyxcbiAgICBhbGxvd1ByaXZhdGU/OiBib29sZWFuLFxuICApOiBGaWxlU3lzdGVtU2NoZW1hdGljIHtcbiAgICByZXR1cm4gY29sbGVjdGlvbi5jcmVhdGVTY2hlbWF0aWMoc2NoZW1hdGljTmFtZSwgYWxsb3dQcml2YXRlKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBzZXRQYXRoT3B0aW9ucyhvcHRpb25zOiBPcHRpb25bXSwgd29ya2luZ0Rpcjogc3RyaW5nKSB7XG4gICAgaWYgKHdvcmtpbmdEaXIgPT09ICcnKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdGlvbnNcbiAgICAgIC5maWx0ZXIobyA9PiBvLmZvcm1hdCA9PT0gJ3BhdGgnKVxuICAgICAgLm1hcChvID0+IG8ubmFtZSlcbiAgICAgIC5yZWR1Y2UoKGFjYywgY3VycikgPT4ge1xuICAgICAgICBhY2NbY3Vycl0gPSB3b3JraW5nRGlyO1xuXG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgICB9LCB7fSBhcyB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfSk7XG4gIH1cblxuICAvKlxuICAgKiBSdW50aW1lIGhvb2sgdG8gYWxsb3cgc3BlY2lmeWluZyBjdXN0b21pemVkIHdvcmtmbG93XG4gICAqL1xuICBwcm90ZWN0ZWQgY3JlYXRlV29ya2Zsb3cob3B0aW9uczogQmFzZVNjaGVtYXRpY1NjaGVtYSk6IHdvcmtmbG93LkJhc2VXb3JrZmxvdyB7XG4gICAgaWYgKHRoaXMuX3dvcmtmbG93KSB7XG4gICAgICByZXR1cm4gdGhpcy5fd29ya2Zsb3c7XG4gICAgfVxuXG4gICAgY29uc3QgeyBmb3JjZSwgZHJ5UnVuIH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IGZzSG9zdCA9IG5ldyB2aXJ0dWFsRnMuU2NvcGVkSG9zdChuZXcgTm9kZUpzU3luY0hvc3QoKSwgbm9ybWFsaXplKHRoaXMud29ya3NwYWNlLnJvb3QpKTtcblxuICAgIGNvbnN0IHdvcmtmbG93ID0gbmV3IE5vZGVXb3JrZmxvdyhcbiAgICAgICAgZnNIb3N0LFxuICAgICAgICB7XG4gICAgICAgICAgZm9yY2UsXG4gICAgICAgICAgZHJ5UnVuLFxuICAgICAgICAgIHBhY2thZ2VNYW5hZ2VyOiBnZXRQYWNrYWdlTWFuYWdlcih0aGlzLndvcmtzcGFjZS5yb290KSxcbiAgICAgICAgICByb290OiBub3JtYWxpemUodGhpcy53b3Jrc3BhY2Uucm9vdCksXG4gICAgICAgIH0sXG4gICAgKTtcbiAgICB3b3JrZmxvdy5lbmdpbmVIb3N0LnJlZ2lzdGVyQ29udGV4dFRyYW5zZm9ybShjb250ZXh0ID0+IHtcbiAgICAgIC8vIFRoaXMgaXMgcnVuIGJ5IEFMTCBzY2hlbWF0aWNzLCBzbyBpZiBzb21lb25lIHVzZXMgYGV4dGVybmFsU2NoZW1hdGljcyguLi4pYCB3aGljaFxuICAgICAgLy8gaXMgc2FmZWxpc3RlZCwgaXQgd291bGQgbW92ZSB0byB0aGUgcmlnaHQgYW5hbHl0aWNzIChldmVuIGlmIHRoZWlyIG93biBpc24ndCkuXG4gICAgICBjb25zdCBjb2xsZWN0aW9uTmFtZTogc3RyaW5nID0gY29udGV4dC5zY2hlbWF0aWMuY29sbGVjdGlvbi5kZXNjcmlwdGlvbi5uYW1lO1xuICAgICAgaWYgKGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzKGNvbGxlY3Rpb25OYW1lKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgICAgYW5hbHl0aWNzOiB0aGlzLmFuYWx5dGljcyxcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgICBhbmFseXRpY3M6IG5ldyBhbmFseXRpY3MuTm9vcEFuYWx5dGljcygpLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgd29ya2Zsb3cuZW5naW5lSG9zdC5yZWdpc3Rlck9wdGlvbnNUcmFuc2Zvcm0odmFsaWRhdGVPcHRpb25zV2l0aFNjaGVtYSh3b3JrZmxvdy5yZWdpc3RyeSkpO1xuXG4gICAgLy8gVGhpcyBuZWVkcyB0byBiZSB0aGUgbGFzdCB0cmFuc2Zvcm0gYXMgaXQgcmVwb3J0cyB0aGUgZmxhZ3MgdG8gYW5hbHl0aWNzIChpZiBlbmFibGVkKS5cbiAgICB3b3JrZmxvdy5lbmdpbmVIb3N0LnJlZ2lzdGVyT3B0aW9uc1RyYW5zZm9ybShhc3luYyAoXG4gICAgICBzY2hlbWF0aWMsXG4gICAgICBvcHRpb25zOiB7IFtwcm9wOiBzdHJpbmddOiBudW1iZXIgfCBzdHJpbmcgfSxcbiAgICAgIGNvbnRleHQsXG4gICAgKTogUHJvbWlzZTx7IFtwcm9wOiBzdHJpbmddOiBudW1iZXIgfCBzdHJpbmcgfT4gPT4ge1xuICAgICAgY29uc3QgYW5hbHl0aWNzID0gY29udGV4dCAmJiBjb250ZXh0LmFuYWx5dGljcztcbiAgICAgIGlmICghc2NoZW1hdGljLnNjaGVtYUpzb24gfHwgIWNvbnRleHQgfHwgIWFuYWx5dGljcykge1xuICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICAgIH1cblxuICAgICAgY29uc3QgY29sbGVjdGlvbk5hbWUgPSBjb250ZXh0LnNjaGVtYXRpYy5jb2xsZWN0aW9uLmRlc2NyaXB0aW9uLm5hbWU7XG4gICAgICBjb25zdCBzY2hlbWF0aWNOYW1lID0gY29udGV4dC5zY2hlbWF0aWMuZGVzY3JpcHRpb24ubmFtZTtcblxuICAgICAgaWYgKCFpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyhjb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFyZ3MgPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnModGhpcy5fd29ya2Zsb3cucmVnaXN0cnksIHNjaGVtYXRpYy5zY2hlbWFKc29uKTtcbiAgICAgIGNvbnN0IGRpbWVuc2lvbnM6IChib29sZWFuIHwgbnVtYmVyIHwgc3RyaW5nKVtdID0gW107XG4gICAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBhcmdzKSB7XG4gICAgICAgIGNvbnN0IHVhID0gb3B0aW9uLnVzZXJBbmFseXRpY3M7XG5cbiAgICAgICAgaWYgKG9wdGlvbi5uYW1lIGluIG9wdGlvbnMgJiYgdWEpIHtcbiAgICAgICAgICBkaW1lbnNpb25zW3VhXSA9IG9wdGlvbnNbb3B0aW9uLm5hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGFuYWx5dGljcy5ldmVudCgnc2NoZW1hdGljcycsIGNvbGxlY3Rpb25OYW1lICsgJzonICsgc2NoZW1hdGljTmFtZSwgeyBkaW1lbnNpb25zIH0pO1xuXG4gICAgICByZXR1cm4gb3B0aW9ucztcbiAgICB9KTtcblxuICAgIGlmIChvcHRpb25zLmRlZmF1bHRzKSB7XG4gICAgICB3b3JrZmxvdy5yZWdpc3RyeS5hZGRQcmVUcmFuc2Zvcm0oc2NoZW1hLnRyYW5zZm9ybXMuYWRkVW5kZWZpbmVkRGVmYXVsdHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3b3JrZmxvdy5yZWdpc3RyeS5hZGRQb3N0VHJhbnNmb3JtKHNjaGVtYS50cmFuc2Zvcm1zLmFkZFVuZGVmaW5lZERlZmF1bHRzKTtcbiAgICB9XG5cbiAgICB3b3JrZmxvdy5yZWdpc3RyeS5hZGRTbWFydERlZmF1bHRQcm92aWRlcigncHJvamVjdE5hbWUnLCAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5fd29ya3NwYWNlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX3dvcmtzcGFjZS5nZXRQcm9qZWN0QnlQYXRoKG5vcm1hbGl6ZShwcm9jZXNzLmN3ZCgpKSlcbiAgICAgICAgICAgIHx8IHRoaXMuX3dvcmtzcGFjZS5nZXREZWZhdWx0UHJvamVjdE5hbWUoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgZXhwZXJpbWVudGFsLndvcmtzcGFjZS5BbWJpZ3VvdXNQcm9qZWN0UGF0aEV4Y2VwdGlvbikge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2Fybih0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICAgIFR3byBvciBtb3JlIHByb2plY3RzIGFyZSB1c2luZyBpZGVudGljYWwgcm9vdHMuXG4gICAgICAgICAgICAgIFVuYWJsZSB0byBkZXRlcm1pbmUgcHJvamVjdCB1c2luZyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LlxuICAgICAgICAgICAgICBVc2luZyBkZWZhdWx0IHdvcmtzcGFjZSBwcm9qZWN0IGluc3RlYWQuXG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dvcmtzcGFjZS5nZXREZWZhdWx0UHJvamVjdE5hbWUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0pO1xuXG4gICAgaWYgKG9wdGlvbnMuaW50ZXJhY3RpdmUgIT09IGZhbHNlICYmIHByb2Nlc3Muc3Rkb3V0LmlzVFRZKSB7XG4gICAgICB3b3JrZmxvdy5yZWdpc3RyeS51c2VQcm9tcHRQcm92aWRlcigoZGVmaW5pdGlvbnM6IEFycmF5PHNjaGVtYS5Qcm9tcHREZWZpbml0aW9uPikgPT4ge1xuICAgICAgICBjb25zdCBxdWVzdGlvbnM6IGlucXVpcmVyLlF1ZXN0aW9ucyA9IGRlZmluaXRpb25zLm1hcChkZWZpbml0aW9uID0+IHtcbiAgICAgICAgICBjb25zdCBxdWVzdGlvbjogaW5xdWlyZXIuUXVlc3Rpb24gPSB7XG4gICAgICAgICAgICBuYW1lOiBkZWZpbml0aW9uLmlkLFxuICAgICAgICAgICAgbWVzc2FnZTogZGVmaW5pdGlvbi5tZXNzYWdlLFxuICAgICAgICAgICAgZGVmYXVsdDogZGVmaW5pdGlvbi5kZWZhdWx0LFxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBjb25zdCB2YWxpZGF0b3IgPSBkZWZpbml0aW9uLnZhbGlkYXRvcjtcbiAgICAgICAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICAgICAgICBxdWVzdGlvbi52YWxpZGF0ZSA9IGlucHV0ID0+IHZhbGlkYXRvcihpbnB1dCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc3dpdGNoIChkZWZpbml0aW9uLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2NvbmZpcm1hdGlvbic6XG4gICAgICAgICAgICAgIHF1ZXN0aW9uLnR5cGUgPSAnY29uZmlybSc7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbGlzdCc6XG4gICAgICAgICAgICAgIHF1ZXN0aW9uLnR5cGUgPSAhIWRlZmluaXRpb24ubXVsdGlzZWxlY3QgPyAnY2hlY2tib3gnIDogJ2xpc3QnO1xuICAgICAgICAgICAgICBxdWVzdGlvbi5jaG9pY2VzID0gZGVmaW5pdGlvbi5pdGVtcyAmJiBkZWZpbml0aW9uLml0ZW1zLm1hcChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLmxhYmVsLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gZGVmaW5pdGlvbi50eXBlO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gcXVlc3Rpb247XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBpbnF1aXJlci5wcm9tcHQocXVlc3Rpb25zKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl93b3JrZmxvdyA9IHdvcmtmbG93O1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCk6IHN0cmluZyB7XG4gICAgbGV0IHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcblxuICAgIGlmICh3b3Jrc3BhY2UpIHtcbiAgICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICAgIGlmIChwcm9qZWN0ICYmIHdvcmtzcGFjZS5nZXRQcm9qZWN0Q2xpKHByb2plY3QpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gd29ya3NwYWNlLmdldFByb2plY3RDbGkocHJvamVjdClbJ2RlZmF1bHRDb2xsZWN0aW9uJ107XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh3b3Jrc3BhY2UuZ2V0Q2xpKCkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB3b3Jrc3BhY2UuZ2V0Q2xpKClbJ2RlZmF1bHRDb2xsZWN0aW9uJ107XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIGlmICh3b3Jrc3BhY2UgJiYgd29ya3NwYWNlLmdldENsaSgpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHdvcmtzcGFjZS5nZXRDbGkoKVsnZGVmYXVsdENvbGxlY3Rpb24nXTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb25OYW1lO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1blNjaGVtYXRpYyhvcHRpb25zOiBSdW5TY2hlbWF0aWNPcHRpb25zKSB7XG4gICAgY29uc3QgeyBzY2hlbWF0aWNPcHRpb25zLCBkZWJ1ZywgZHJ5UnVuIH0gPSBvcHRpb25zO1xuICAgIGxldCB7IGNvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lIH0gPSBvcHRpb25zO1xuXG4gICAgbGV0IG5vdGhpbmdEb25lID0gdHJ1ZTtcbiAgICBsZXQgbG9nZ2luZ1F1ZXVlOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCBlcnJvciA9IGZhbHNlO1xuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSB0aGlzLl93b3JrZmxvdztcblxuICAgIGNvbnN0IHdvcmtpbmdEaXIgPSBub3JtYWxpemUoc3lzdGVtUGF0aC5yZWxhdGl2ZSh0aGlzLndvcmtzcGFjZS5yb290LCBwcm9jZXNzLmN3ZCgpKSk7XG5cbiAgICAvLyBHZXQgdGhlIG9wdGlvbiBvYmplY3QgZnJvbSB0aGUgc2NoZW1hdGljIHNjaGVtYS5cbiAgICBjb25zdCBzY2hlbWF0aWMgPSB0aGlzLmdldFNjaGVtYXRpYyhcbiAgICAgIHRoaXMuZ2V0Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSksXG4gICAgICBzY2hlbWF0aWNOYW1lLFxuICAgICAgdGhpcy5hbGxvd1ByaXZhdGVTY2hlbWF0aWNzLFxuICAgICk7XG4gICAgLy8gVXBkYXRlIHRoZSBzY2hlbWF0aWMgYW5kIGNvbGxlY3Rpb24gbmFtZSBpbiBjYXNlIHRoZXkncmUgbm90IHRoZSBzYW1lIGFzIHRoZSBvbmVzIHdlXG4gICAgLy8gcmVjZWl2ZWQgaW4gb3VyIG9wdGlvbnMsIGUuZy4gYWZ0ZXIgYWxpYXMgcmVzb2x1dGlvbiBvciBleHRlbnNpb24uXG4gICAgY29sbGVjdGlvbk5hbWUgPSBzY2hlbWF0aWMuY29sbGVjdGlvbi5kZXNjcmlwdGlvbi5uYW1lO1xuICAgIHNjaGVtYXRpY05hbWUgPSBzY2hlbWF0aWMuZGVzY3JpcHRpb24ubmFtZTtcblxuICAgIC8vIFRPRE86IFJlbW92ZSB3YXJuaW5nIGNoZWNrIHdoZW4gJ3RhcmdldHMnIGlzIGRlZmF1bHRcbiAgICBpZiAoY29sbGVjdGlvbk5hbWUgIT09IHRoaXMuY29sbGVjdGlvbk5hbWUpIHtcbiAgICAgIGNvbnN0IFthc3QsIGNvbmZpZ1BhdGhdID0gZ2V0V29ya3NwYWNlUmF3KCdsb2NhbCcpO1xuICAgICAgaWYgKGFzdCkge1xuICAgICAgICBjb25zdCBwcm9qZWN0c0tleVZhbHVlID0gYXN0LnByb3BlcnRpZXMuZmluZChwID0+IHAua2V5LnZhbHVlID09PSAncHJvamVjdHMnKTtcbiAgICAgICAgaWYgKCFwcm9qZWN0c0tleVZhbHVlIHx8IHByb2plY3RzS2V5VmFsdWUudmFsdWUua2luZCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwb3NpdGlvbnM6IGpzb24uUG9zaXRpb25bXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHByb2plY3RLZXlWYWx1ZSBvZiBwcm9qZWN0c0tleVZhbHVlLnZhbHVlLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICBjb25zdCBwcm9qZWN0Tm9kZSA9IHByb2plY3RLZXlWYWx1ZS52YWx1ZTtcbiAgICAgICAgICBpZiAocHJvamVjdE5vZGUua2luZCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCB0YXJnZXRzS2V5VmFsdWUgPSBwcm9qZWN0Tm9kZS5wcm9wZXJ0aWVzLmZpbmQocCA9PiBwLmtleS52YWx1ZSA9PT0gJ3RhcmdldHMnKTtcbiAgICAgICAgICBpZiAodGFyZ2V0c0tleVZhbHVlKSB7XG4gICAgICAgICAgICBwb3NpdGlvbnMucHVzaCh0YXJnZXRzS2V5VmFsdWUuc3RhcnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3NpdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnN0IHdhcm5pbmcgPSB0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICBXQVJOSU5HOiBUaGlzIGNvbW1hbmQgbWF5IG5vdCBleGVjdXRlIHN1Y2Nlc3NmdWxseS5cbiAgICAgICAgICAgIFRoZSBwYWNrYWdlL2NvbGxlY3Rpb24gbWF5IG5vdCBzdXBwb3J0IHRoZSAndGFyZ2V0cycgZmllbGQgd2l0aGluICcke2NvbmZpZ1BhdGh9Jy5cbiAgICAgICAgICAgIFRoaXMgY2FuIGJlIGNvcnJlY3RlZCBieSByZW5hbWluZyB0aGUgZm9sbG93aW5nICd0YXJnZXRzJyBmaWVsZHMgdG8gJ2FyY2hpdGVjdCc6XG4gICAgICAgICAgYDtcblxuICAgICAgICAgIGNvbnN0IGxvY2F0aW9ucyA9IHBvc2l0aW9uc1xuICAgICAgICAgICAgLm1hcCgocCwgaSkgPT4gYCR7aSArIDF9KSBMaW5lOiAke3AubGluZSArIDF9OyBDb2x1bW46ICR7cC5jaGFyYWN0ZXIgKyAxfWApXG4gICAgICAgICAgICAuam9pbignXFxuJyk7XG5cbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKHdhcm5pbmcgKyAnXFxuJyArIGxvY2F0aW9ucyArICdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNldCB0aGUgb3B0aW9ucyBvZiBmb3JtYXQgXCJwYXRoXCIuXG4gICAgbGV0IG86IE9wdGlvbltdIHwgbnVsbCA9IG51bGw7XG4gICAgbGV0IGFyZ3M6IEFyZ3VtZW50cztcblxuICAgIGlmICghc2NoZW1hdGljLmRlc2NyaXB0aW9uLnNjaGVtYUpzb24pIHtcbiAgICAgIGFyZ3MgPSBhd2FpdCB0aGlzLnBhcnNlRnJlZUZvcm1Bcmd1bWVudHMoc2NoZW1hdGljT3B0aW9ucyB8fCBbXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG8gPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMod29ya2Zsb3cucmVnaXN0cnksIHNjaGVtYXRpYy5kZXNjcmlwdGlvbi5zY2hlbWFKc29uKTtcbiAgICAgIGFyZ3MgPSBhd2FpdCB0aGlzLnBhcnNlQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnMgfHwgW10sIG8pO1xuICAgIH1cblxuICAgIC8vIG5nLWFkZCBpcyBzcGVjaWFsIGJlY2F1c2Ugd2UgZG9uJ3Qga25vdyBhbGwgcG9zc2libGUgb3B0aW9ucyBhdCB0aGlzIHBvaW50XG4gICAgaWYgKGFyZ3NbJy0tJ10gJiYgIXRoaXMuYWxsb3dBZGRpdGlvbmFsQXJncykge1xuICAgICAgYXJnc1snLS0nXS5mb3JFYWNoKGFkZGl0aW9uYWwgPT4ge1xuICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChgVW5rbm93biBvcHRpb246ICcke2FkZGl0aW9uYWwuc3BsaXQoLz0vKVswXX0nYCk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgY29uc3QgcGF0aE9wdGlvbnMgPSBvID8gdGhpcy5zZXRQYXRoT3B0aW9ucyhvLCB3b3JraW5nRGlyKSA6IHt9O1xuICAgIGxldCBpbnB1dCA9IE9iamVjdC5hc3NpZ24ocGF0aE9wdGlvbnMsIGFyZ3MpO1xuXG4gICAgLy8gUmVhZCB0aGUgZGVmYXVsdCB2YWx1ZXMgZnJvbSB0aGUgd29ya3NwYWNlLlxuICAgIGNvbnN0IHByb2plY3ROYW1lID0gaW5wdXQucHJvamVjdCAhPT0gdW5kZWZpbmVkID8gJycgKyBpbnB1dC5wcm9qZWN0IDogbnVsbDtcbiAgICBjb25zdCBkZWZhdWx0cyA9IGdldFNjaGVtYXRpY0RlZmF1bHRzKGNvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lLCBwcm9qZWN0TmFtZSk7XG4gICAgaW5wdXQgPSB7XG4gICAgICAuLi5kZWZhdWx0cyxcbiAgICAgIC4uLmlucHV0LFxuICAgICAgLi4ub3B0aW9ucy5hZGRpdGlvbmFsT3B0aW9ucyxcbiAgICB9O1xuXG4gICAgd29ya2Zsb3cucmVwb3J0ZXIuc3Vic2NyaWJlKChldmVudDogRHJ5UnVuRXZlbnQpID0+IHtcbiAgICAgIG5vdGhpbmdEb25lID0gZmFsc2U7XG5cbiAgICAgIC8vIFN0cmlwIGxlYWRpbmcgc2xhc2ggdG8gcHJldmVudCBjb25mdXNpb24uXG4gICAgICBjb25zdCBldmVudFBhdGggPSBldmVudC5wYXRoLnN0YXJ0c1dpdGgoJy8nKSA/IGV2ZW50LnBhdGguc3Vic3RyKDEpIDogZXZlbnQucGF0aDtcblxuICAgICAgc3dpdGNoIChldmVudC5raW5kKSB7XG4gICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICBlcnJvciA9IHRydWU7XG4gICAgICAgICAgY29uc3QgZGVzYyA9IGV2ZW50LmRlc2NyaXB0aW9uID09ICdhbHJlYWR5RXhpc3QnID8gJ2FscmVhZHkgZXhpc3RzJyA6ICdkb2VzIG5vdCBleGlzdC4nO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYEVSUk9SISAke2V2ZW50UGF0aH0gJHtkZXNjfS5gKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAndXBkYXRlJzpcbiAgICAgICAgICBsb2dnaW5nUXVldWUucHVzaCh0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICAke3Rlcm1pbmFsLndoaXRlKCdVUERBVEUnKX0gJHtldmVudFBhdGh9ICgke2V2ZW50LmNvbnRlbnQubGVuZ3RofSBieXRlcylcbiAgICAgICAgICBgKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnY3JlYXRlJzpcbiAgICAgICAgICBsb2dnaW5nUXVldWUucHVzaCh0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICAke3Rlcm1pbmFsLmdyZWVuKCdDUkVBVEUnKX0gJHtldmVudFBhdGh9ICgke2V2ZW50LmNvbnRlbnQubGVuZ3RofSBieXRlcylcbiAgICAgICAgICBgKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICBsb2dnaW5nUXVldWUucHVzaChgJHt0ZXJtaW5hbC55ZWxsb3coJ0RFTEVURScpfSAke2V2ZW50UGF0aH1gKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncmVuYW1lJzpcbiAgICAgICAgICBsb2dnaW5nUXVldWUucHVzaChgJHt0ZXJtaW5hbC5ibHVlKCdSRU5BTUUnKX0gJHtldmVudFBhdGh9ID0+ICR7ZXZlbnQudG99YCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB3b3JrZmxvdy5saWZlQ3ljbGUuc3Vic2NyaWJlKGV2ZW50ID0+IHtcbiAgICAgIGlmIChldmVudC5raW5kID09ICdlbmQnIHx8IGV2ZW50LmtpbmQgPT0gJ3Bvc3QtdGFza3Mtc3RhcnQnKSB7XG4gICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAvLyBPdXRwdXQgdGhlIGxvZ2dpbmcgcXVldWUsIG5vIGVycm9yIGhhcHBlbmVkLlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5mb3JFYWNoKGxvZyA9PiB0aGlzLmxvZ2dlci5pbmZvKGxvZykpO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9nZ2luZ1F1ZXVlID0gW107XG4gICAgICAgIGVycm9yID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8bnVtYmVyIHwgdm9pZD4oKHJlc29sdmUpID0+IHtcbiAgICAgIHdvcmtmbG93LmV4ZWN1dGUoe1xuICAgICAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgc2NoZW1hdGljOiBzY2hlbWF0aWNOYW1lLFxuICAgICAgICBvcHRpb25zOiBpbnB1dCxcbiAgICAgICAgZGVidWc6IGRlYnVnLFxuICAgICAgICBsb2dnZXI6IHRoaXMubG9nZ2VyLFxuICAgICAgICBhbGxvd1ByaXZhdGU6IHRoaXMuYWxsb3dQcml2YXRlU2NoZW1hdGljcyxcbiAgICAgIH0pXG4gICAgICAuc3Vic2NyaWJlKHtcbiAgICAgICAgZXJyb3I6IChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgLy8gSW4gY2FzZSB0aGUgd29ya2Zsb3cgd2FzIG5vdCBzdWNjZXNzZnVsLCBzaG93IGFuIGFwcHJvcHJpYXRlIGVycm9yIG1lc3NhZ2UuXG4gICAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uKSB7XG4gICAgICAgICAgICAvLyBcIlNlZSBhYm92ZVwiIGJlY2F1c2Ugd2UgYWxyZWFkeSBwcmludGVkIHRoZSBlcnJvci5cbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKCdUaGUgU2NoZW1hdGljIHdvcmtmbG93IGZhaWxlZC4gU2VlIGFib3ZlLicpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZGVidWcpIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGBBbiBlcnJvciBvY2N1cmVkOlxcbiR7ZXJyLm1lc3NhZ2V9XFxuJHtlcnIuc3RhY2t9YCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGVyci5tZXNzYWdlKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXNvbHZlKDEpO1xuICAgICAgICB9LFxuICAgICAgICBjb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHNob3dOb3RoaW5nRG9uZSA9ICEob3B0aW9ucy5zaG93Tm90aGluZ0RvbmUgPT09IGZhbHNlKTtcbiAgICAgICAgICBpZiAobm90aGluZ0RvbmUgJiYgc2hvd05vdGhpbmdEb25lKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKCdOb3RoaW5nIHRvIGJlIGRvbmUuJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChkcnlSdW4pIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYFxcbk5PVEU6IFRoZSBcImRyeVJ1blwiIGZsYWcgbWVhbnMgbm8gY2hhbmdlcyB3ZXJlIG1hZGUuYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHBhcnNlRnJlZUZvcm1Bcmd1bWVudHMoc2NoZW1hdGljT3B0aW9uczogc3RyaW5nW10pIHtcbiAgICByZXR1cm4gcGFyc2VGcmVlRm9ybUFyZ3VtZW50cyhzY2hlbWF0aWNPcHRpb25zKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBwYXJzZUFyZ3VtZW50cyhcbiAgICBzY2hlbWF0aWNPcHRpb25zOiBzdHJpbmdbXSxcbiAgICBvcHRpb25zOiBPcHRpb25bXSB8IG51bGwsXG4gICk6IFByb21pc2U8QXJndW1lbnRzPiB7XG4gICAgcmV0dXJuIHBhcnNlQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnMsIG9wdGlvbnMsIHRoaXMubG9nZ2VyKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgX2xvYWRXb3Jrc3BhY2UoKSB7XG4gICAgaWYgKHRoaXMuX3dvcmtzcGFjZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB3b3Jrc3BhY2VMb2FkZXIgPSBuZXcgV29ya3NwYWNlTG9hZGVyKHRoaXMuX2hvc3QpO1xuXG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuX3dvcmtzcGFjZSA9IGF3YWl0IHdvcmtzcGFjZUxvYWRlci5sb2FkV29ya3NwYWNlKHRoaXMud29ya3NwYWNlLnJvb3QpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKCF0aGlzLmFsbG93TWlzc2luZ1dvcmtzcGFjZSkge1xuICAgICAgICAvLyBJZ25vcmUgbWlzc2luZyB3b3Jrc3BhY2VcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIl19