"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        this._engine = new schematics_1.SchematicEngine(this._engineHost);
    }
    initialize(options) {
        return __awaiter(this, void 0, void 0, function* () {
            this._loadWorkspace();
            this.createWorkflow(options);
        });
    }
    printHelp(options) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            yield _super("printHelp").call(this, options);
            this.logger.info('');
            const schematicNames = Object.keys(this.description.suboptions || {});
            if (this.description.suboptions) {
                if (schematicNames.length > 1) {
                    this.logger.info('Available Schematics:');
                    const namesPerCollection = {};
                    schematicNames.forEach(name => {
                        const [collectionName, schematicName] = name.split(/:/, 2);
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
                    this.logger.info('Options for schematic ' + schematicNames[0]);
                    yield this.printHelpOptions(this.description.suboptions[schematicNames[0]]);
                }
            }
            return 0;
        });
    }
    printHelpUsage() {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            const schematicNames = Object.keys(this.description.suboptions || {});
            if (this.description.suboptions && schematicNames.length == 1) {
                this.logger.info(this.description.description);
                const opts = this.description.options.filter(x => x.positional === undefined);
                const [collectionName, schematicName] = schematicNames[0].split(/:/)[0];
                // Display <collectionName:schematicName> if this is not the default collectionName,
                // otherwise just show the schematicName.
                const displayName = collectionName == this.getDefaultSchematicCollection()
                    ? schematicName
                    : schematicNames[0];
                const schematicOptions = this.description.suboptions[schematicNames[0]];
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
                yield _super("printHelpUsage").call(this);
            }
        });
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
        return '@schematics/angular';
    }
    runSchematic(options) {
        return __awaiter(this, void 0, void 0, function* () {
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
            // Set the options of format "path".
            let o = null;
            let args;
            if (!schematic.description.schemaJson) {
                args = yield this.parseFreeFormArguments(schematicOptions || []);
            }
            else {
                o = yield json_schema_1.parseJsonSchemaToOptions(workflow.registry, schematic.description.schemaJson);
                args = yield this.parseArguments(schematicOptions || [], o);
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
        });
    }
    parseFreeFormArguments(schematicOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            return parser_1.parseFreeFormArguments(schematicOptions);
        });
    }
    parseArguments(schematicOptions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return parser_1.parseArguments(schematicOptions, options);
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBUzhCO0FBQzlCLG9EQUEyRDtBQUMzRCwyREFNb0M7QUFDcEMsNERBUzBDO0FBQzFDLHFDQUFxQztBQUNyQyxtQ0FBbUM7QUFDbkMsOENBQXNDO0FBQ3RDLGlFQUE2RDtBQUM3RCxnREFLNkI7QUFDN0IsMERBQW9FO0FBQ3BFLHVDQUF3RDtBQUV4RCxxQ0FBa0U7QUFzQmxFLE1BQWEsc0JBQXVCLFNBQVEsS0FBSztJQUMvQyxZQUFZLGNBQXNCO1FBQ2hDLEtBQUssQ0FBQyx1QkFBdUIsY0FBYyxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDO0NBQ0Y7QUFKRCx3REFJQztBQUVELE1BQXNCLGdCQUVwQixTQUFRLGlCQUFVO0lBT2xCLFlBQ0UsT0FBdUIsRUFDdkIsV0FBK0IsRUFDL0IsTUFBc0IsRUFDTCxjQUF3QyxJQUFJLDZCQUFxQixFQUFFO1FBRXBGLEtBQUssQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRm5CLGdCQUFXLEdBQVgsV0FBVyxDQUF3RDtRQVY3RSwyQkFBc0IsR0FBWSxLQUFLLENBQUM7UUFDekMsVUFBSyxHQUFHLElBQUkscUJBQWMsRUFBRSxDQUFDO1FBWW5DLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSw0QkFBZSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRVksVUFBVSxDQUFDLE9BQVU7O1lBQ2hDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQy9CLENBQUM7S0FBQTtJQUVZLFNBQVMsQ0FBQyxPQUFVOzs7WUFDL0Is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QkFDN0QsU0FBUyxDQUNSLENBQUMsU0FBMkMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLEVBQzVFLENBQUMsR0FBVSxFQUFFLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRTtvQkFDL0IsMkJBQTJCO29CQUMzQixNQUFNLEdBQUcsQ0FBQztpQkFDWDtZQUNILENBQUMsQ0FDRixDQUFDO1NBQ0w7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNaLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUU7Z0JBQy9CLDJCQUEyQjtnQkFDM0IsTUFBTSxHQUFHLENBQUM7YUFDZjtTQUNFO0lBQ0gsQ0FBQztDQUNGO0FBamFELDRDQWlhQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIGV4cGVyaW1lbnRhbCxcbiAgbG9nZ2luZyxcbiAgbm9ybWFsaXplLFxuICBzY2hlbWEsXG4gIHN0cmluZ3MsXG4gIHRhZ3MsXG4gIHRlcm1pbmFsLFxuICB2aXJ0dWFsRnMsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE5vZGVKc1N5bmNIb3N0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQge1xuICBEcnlSdW5FdmVudCxcbiAgRW5naW5lLFxuICBTY2hlbWF0aWNFbmdpbmUsXG4gIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uLFxuICB3b3JrZmxvdyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHtcbiAgRmlsZVN5c3RlbUNvbGxlY3Rpb24sXG4gIEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzYyxcbiAgRmlsZVN5c3RlbUVuZ2luZUhvc3RCYXNlLFxuICBGaWxlU3lzdGVtU2NoZW1hdGljLFxuICBGaWxlU3lzdGVtU2NoZW1hdGljRGVzYyxcbiAgTm9kZU1vZHVsZXNFbmdpbmVIb3N0LFxuICBOb2RlV29ya2Zsb3csXG4gIHZhbGlkYXRlT3B0aW9uc1dpdGhTY2hlbWEsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCAqIGFzIGlucXVpcmVyIGZyb20gJ2lucXVpcmVyJztcbmltcG9ydCAqIGFzIHN5c3RlbVBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyB0YWtlIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgV29ya3NwYWNlTG9hZGVyIH0gZnJvbSAnLi4vbW9kZWxzL3dvcmtzcGFjZS1sb2FkZXInO1xuaW1wb3J0IHtcbiAgZ2V0UGFja2FnZU1hbmFnZXIsXG4gIGdldFByb2plY3RCeUN3ZCxcbiAgZ2V0U2NoZW1hdGljRGVmYXVsdHMsXG4gIGdldFdvcmtzcGFjZSxcbn0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMgfSBmcm9tICcuLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuaW1wb3J0IHsgQmFzZUNvbW1hbmRPcHRpb25zLCBDb21tYW5kIH0gZnJvbSAnLi9jb21tYW5kJztcbmltcG9ydCB7IEFyZ3VtZW50cywgQ29tbWFuZENvbnRleHQsIENvbW1hbmREZXNjcmlwdGlvbiwgT3B0aW9uIH0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgcGFyc2VBcmd1bWVudHMsIHBhcnNlRnJlZUZvcm1Bcmd1bWVudHMgfSBmcm9tICcuL3BhcnNlcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQmFzZVNjaGVtYXRpY09wdGlvbnMgZXh0ZW5kcyBCYXNlQ29tbWFuZE9wdGlvbnMge1xuICBkZWJ1Zz86IGJvb2xlYW47XG4gIGRyeVJ1bj86IGJvb2xlYW47XG4gIGZvcmNlPzogYm9vbGVhbjtcbiAgaW50ZXJhY3RpdmU/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJ1blNjaGVtYXRpY09wdGlvbnMge1xuICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICBzY2hlbWF0aWNOYW1lOiBzdHJpbmc7XG5cbiAgc2NoZW1hdGljT3B0aW9ucz86IHN0cmluZ1tdO1xuXG4gIGRlYnVnPzogYm9vbGVhbjtcbiAgZHJ5UnVuPzogYm9vbGVhbjtcbiAgZm9yY2U/OiBib29sZWFuO1xuICBzaG93Tm90aGluZ0RvbmU/OiBib29sZWFuO1xufVxuXG5cbmV4cG9ydCBjbGFzcyBVbmtub3duQ29sbGVjdGlvbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcihjb2xsZWN0aW9uTmFtZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoYEludmFsaWQgY29sbGVjdGlvbiAoJHtjb2xsZWN0aW9uTmFtZX0pLmApO1xuICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTY2hlbWF0aWNDb21tYW5kPFxuICBUIGV4dGVuZHMgQmFzZVNjaGVtYXRpY09wdGlvbnMgPSBCYXNlU2NoZW1hdGljT3B0aW9ucyxcbj4gZXh0ZW5kcyBDb21tYW5kPFQ+IHtcbiAgcmVhZG9ubHkgYWxsb3dQcml2YXRlU2NoZW1hdGljczogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIF9ob3N0ID0gbmV3IE5vZGVKc1N5bmNIb3N0KCk7XG4gIHByaXZhdGUgX3dvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2U7XG4gIHByaXZhdGUgcmVhZG9ubHkgX2VuZ2luZTogRW5naW5lPEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzYywgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2M+O1xuICBwcm90ZWN0ZWQgX3dvcmtmbG93OiB3b3JrZmxvdy5CYXNlV29ya2Zsb3c7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgY29udGV4dDogQ29tbWFuZENvbnRleHQsXG4gICAgZGVzY3JpcHRpb246IENvbW1hbmREZXNjcmlwdGlvbixcbiAgICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgX2VuZ2luZUhvc3Q6IEZpbGVTeXN0ZW1FbmdpbmVIb3N0QmFzZSA9IG5ldyBOb2RlTW9kdWxlc0VuZ2luZUhvc3QoKSxcbiAgKSB7XG4gICAgc3VwZXIoY29udGV4dCwgZGVzY3JpcHRpb24sIGxvZ2dlcik7XG4gICAgdGhpcy5fZW5naW5lID0gbmV3IFNjaGVtYXRpY0VuZ2luZSh0aGlzLl9lbmdpbmVIb3N0KTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IFQpIHtcbiAgICB0aGlzLl9sb2FkV29ya3NwYWNlKCk7XG4gICAgdGhpcy5jcmVhdGVXb3JrZmxvdyhvcHRpb25zKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBwcmludEhlbHAob3B0aW9uczogVCkge1xuICAgIGF3YWl0IHN1cGVyLnByaW50SGVscChvcHRpb25zKTtcbiAgICB0aGlzLmxvZ2dlci5pbmZvKCcnKTtcblxuICAgIGNvbnN0IHNjaGVtYXRpY05hbWVzID0gT2JqZWN0LmtleXModGhpcy5kZXNjcmlwdGlvbi5zdWJvcHRpb25zIHx8IHt9KTtcblxuICAgIGlmICh0aGlzLmRlc2NyaXB0aW9uLnN1Ym9wdGlvbnMpIHtcbiAgICAgIGlmIChzY2hlbWF0aWNOYW1lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ0F2YWlsYWJsZSBTY2hlbWF0aWNzOicpO1xuXG4gICAgICAgIGNvbnN0IG5hbWVzUGVyQ29sbGVjdGlvbjogeyBbYzogc3RyaW5nXTogc3RyaW5nW10gfSA9IHt9O1xuICAgICAgICBzY2hlbWF0aWNOYW1lcy5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSBuYW1lLnNwbGl0KC86LywgMik7XG5cbiAgICAgICAgICBpZiAoIW5hbWVzUGVyQ29sbGVjdGlvbltjb2xsZWN0aW9uTmFtZV0pIHtcbiAgICAgICAgICAgIG5hbWVzUGVyQ29sbGVjdGlvbltjb2xsZWN0aW9uTmFtZV0gPSBbXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBuYW1lc1BlckNvbGxlY3Rpb25bY29sbGVjdGlvbk5hbWVdLnB1c2goc2NoZW1hdGljTmFtZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGRlZmF1bHRDb2xsZWN0aW9uID0gdGhpcy5nZXREZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbigpO1xuICAgICAgICBPYmplY3Qua2V5cyhuYW1lc1BlckNvbGxlY3Rpb24pLmZvckVhY2goY29sbGVjdGlvbk5hbWUgPT4ge1xuICAgICAgICAgIGNvbnN0IGlzRGVmYXVsdCA9IGRlZmF1bHRDb2xsZWN0aW9uID09IGNvbGxlY3Rpb25OYW1lO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmluZm8oXG4gICAgICAgICAgICBgICBDb2xsZWN0aW9uIFwiJHtjb2xsZWN0aW9uTmFtZX1cIiR7aXNEZWZhdWx0ID8gJyAoZGVmYXVsdCknIDogJyd9OmAsXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIG5hbWVzUGVyQ29sbGVjdGlvbltjb2xsZWN0aW9uTmFtZV0uZm9yRWFjaChzY2hlbWF0aWNOYW1lID0+IHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmluZm8oYCAgICAke3NjaGVtYXRpY05hbWV9YCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChzY2hlbWF0aWNOYW1lcy5sZW5ndGggPT0gMSkge1xuICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKCdPcHRpb25zIGZvciBzY2hlbWF0aWMgJyArIHNjaGVtYXRpY05hbWVzWzBdKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wcmludEhlbHBPcHRpb25zKHRoaXMuZGVzY3JpcHRpb24uc3Vib3B0aW9uc1tzY2hlbWF0aWNOYW1lc1swXV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgYXN5bmMgcHJpbnRIZWxwVXNhZ2UoKSB7XG4gICAgY29uc3Qgc2NoZW1hdGljTmFtZXMgPSBPYmplY3Qua2V5cyh0aGlzLmRlc2NyaXB0aW9uLnN1Ym9wdGlvbnMgfHwge30pO1xuICAgIGlmICh0aGlzLmRlc2NyaXB0aW9uLnN1Ym9wdGlvbnMgJiYgc2NoZW1hdGljTmFtZXMubGVuZ3RoID09IDEpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8odGhpcy5kZXNjcmlwdGlvbi5kZXNjcmlwdGlvbik7XG5cbiAgICAgIGNvbnN0IG9wdHMgPSB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMuZmlsdGVyKHggPT4geC5wb3NpdGlvbmFsID09PSB1bmRlZmluZWQpO1xuICAgICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHNjaGVtYXRpY05hbWVzWzBdLnNwbGl0KC86LylbMF07XG5cbiAgICAgIC8vIERpc3BsYXkgPGNvbGxlY3Rpb25OYW1lOnNjaGVtYXRpY05hbWU+IGlmIHRoaXMgaXMgbm90IHRoZSBkZWZhdWx0IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgLy8gb3RoZXJ3aXNlIGp1c3Qgc2hvdyB0aGUgc2NoZW1hdGljTmFtZS5cbiAgICAgIGNvbnN0IGRpc3BsYXlOYW1lID0gY29sbGVjdGlvbk5hbWUgPT0gdGhpcy5nZXREZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbigpXG4gICAgICAgID8gc2NoZW1hdGljTmFtZVxuICAgICAgICA6IHNjaGVtYXRpY05hbWVzWzBdO1xuXG4gICAgICBjb25zdCBzY2hlbWF0aWNPcHRpb25zID0gdGhpcy5kZXNjcmlwdGlvbi5zdWJvcHRpb25zW3NjaGVtYXRpY05hbWVzWzBdXTtcbiAgICAgIGNvbnN0IHNjaGVtYXRpY0FyZ3MgPSBzY2hlbWF0aWNPcHRpb25zLmZpbHRlcih4ID0+IHgucG9zaXRpb25hbCAhPT0gdW5kZWZpbmVkKTtcbiAgICAgIGNvbnN0IGFyZ0Rpc3BsYXkgPSBzY2hlbWF0aWNBcmdzLmxlbmd0aCA+IDBcbiAgICAgICAgPyAnICcgKyBzY2hlbWF0aWNBcmdzLm1hcChhID0+IGA8JHtzdHJpbmdzLmRhc2hlcml6ZShhLm5hbWUpfT5gKS5qb2luKCcgJylcbiAgICAgICAgOiAnJztcblxuICAgICAgdGhpcy5sb2dnZXIuaW5mbyh0YWdzLm9uZUxpbmVgXG4gICAgICAgIHVzYWdlOiBuZyAke3RoaXMuZGVzY3JpcHRpb24ubmFtZX0gJHtkaXNwbGF5TmFtZX0ke2FyZ0Rpc3BsYXl9XG4gICAgICAgICR7b3B0cy5sZW5ndGggPiAwID8gYFtvcHRpb25zXWAgOiBgYH1cbiAgICAgIGApO1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbygnJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHN1cGVyLnByaW50SGVscFVzYWdlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGdldEVuZ2luZUhvc3QoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VuZ2luZUhvc3Q7XG4gIH1cbiAgcHJvdGVjdGVkIGdldEVuZ2luZSgpOlxuICAgICAgRW5naW5lPEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzYywgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2M+IHtcbiAgICByZXR1cm4gdGhpcy5fZW5naW5lO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldENvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWU6IHN0cmluZyk6IEZpbGVTeXN0ZW1Db2xsZWN0aW9uIHtcbiAgICBjb25zdCBlbmdpbmUgPSB0aGlzLmdldEVuZ2luZSgpO1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSBlbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG5cbiAgICBpZiAoY29sbGVjdGlvbiA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFVua25vd25Db2xsZWN0aW9uRXJyb3IoY29sbGVjdGlvbk5hbWUpO1xuICAgIH1cblxuICAgIHJldHVybiBjb2xsZWN0aW9uO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFNjaGVtYXRpYyhcbiAgICBjb2xsZWN0aW9uOiBGaWxlU3lzdGVtQ29sbGVjdGlvbixcbiAgICBzY2hlbWF0aWNOYW1lOiBzdHJpbmcsXG4gICAgYWxsb3dQcml2YXRlPzogYm9vbGVhbixcbiAgKTogRmlsZVN5c3RlbVNjaGVtYXRpYyB7XG4gICAgcmV0dXJuIGNvbGxlY3Rpb24uY3JlYXRlU2NoZW1hdGljKHNjaGVtYXRpY05hbWUsIGFsbG93UHJpdmF0ZSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgc2V0UGF0aE9wdGlvbnMob3B0aW9uczogT3B0aW9uW10sIHdvcmtpbmdEaXI6IHN0cmluZykge1xuICAgIGlmICh3b3JraW5nRGlyID09PSAnJykge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIHJldHVybiBvcHRpb25zXG4gICAgICAuZmlsdGVyKG8gPT4gby5mb3JtYXQgPT09ICdwYXRoJylcbiAgICAgIC5tYXAobyA9PiBvLm5hbWUpXG4gICAgICAucmVkdWNlKChhY2MsIGN1cnIpID0+IHtcbiAgICAgICAgYWNjW2N1cnJdID0gd29ya2luZ0RpcjtcblxuICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgfSwge30gYXMgeyBbbmFtZTogc3RyaW5nXTogc3RyaW5nIH0pO1xuICB9XG5cbiAgLypcbiAgICogUnVudGltZSBob29rIHRvIGFsbG93IHNwZWNpZnlpbmcgY3VzdG9taXplZCB3b3JrZmxvd1xuICAgKi9cbiAgcHJvdGVjdGVkIGNyZWF0ZVdvcmtmbG93KG9wdGlvbnM6IEJhc2VTY2hlbWF0aWNPcHRpb25zKTogd29ya2Zsb3cuQmFzZVdvcmtmbG93IHtcbiAgICBpZiAodGhpcy5fd29ya2Zsb3cpIHtcbiAgICAgIHJldHVybiB0aGlzLl93b3JrZmxvdztcbiAgICB9XG5cbiAgICBjb25zdCB7Zm9yY2UsIGRyeVJ1bn0gPSBvcHRpb25zO1xuICAgIGNvbnN0IGZzSG9zdCA9IG5ldyB2aXJ0dWFsRnMuU2NvcGVkSG9zdChuZXcgTm9kZUpzU3luY0hvc3QoKSwgbm9ybWFsaXplKHRoaXMud29ya3NwYWNlLnJvb3QpKTtcblxuICAgIGNvbnN0IHdvcmtmbG93ID0gbmV3IE5vZGVXb3JrZmxvdyhcbiAgICAgICAgZnNIb3N0LFxuICAgICAgICB7XG4gICAgICAgICAgZm9yY2UsXG4gICAgICAgICAgZHJ5UnVuLFxuICAgICAgICAgIHBhY2thZ2VNYW5hZ2VyOiBnZXRQYWNrYWdlTWFuYWdlcigpLFxuICAgICAgICAgIHJvb3Q6IG5vcm1hbGl6ZSh0aGlzLndvcmtzcGFjZS5yb290KSxcbiAgICAgICAgfSxcbiAgICApO1xuXG4gICAgdGhpcy5fZW5naW5lSG9zdC5yZWdpc3Rlck9wdGlvbnNUcmFuc2Zvcm0odmFsaWRhdGVPcHRpb25zV2l0aFNjaGVtYSh3b3JrZmxvdy5yZWdpc3RyeSkpO1xuXG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkUG9zdFRyYW5zZm9ybShzY2hlbWEudHJhbnNmb3Jtcy5hZGRVbmRlZmluZWREZWZhdWx0cyk7XG5cbiAgICB3b3JrZmxvdy5yZWdpc3RyeS5hZGRTbWFydERlZmF1bHRQcm92aWRlcigncHJvamVjdE5hbWUnLCAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5fd29ya3NwYWNlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX3dvcmtzcGFjZS5nZXRQcm9qZWN0QnlQYXRoKG5vcm1hbGl6ZShwcm9jZXNzLmN3ZCgpKSlcbiAgICAgICAgICAgIHx8IHRoaXMuX3dvcmtzcGFjZS5nZXREZWZhdWx0UHJvamVjdE5hbWUoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgZXhwZXJpbWVudGFsLndvcmtzcGFjZS5BbWJpZ3VvdXNQcm9qZWN0UGF0aEV4Y2VwdGlvbikge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2Fybih0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICAgIFR3byBvciBtb3JlIHByb2plY3RzIGFyZSB1c2luZyBpZGVudGljYWwgcm9vdHMuXG4gICAgICAgICAgICAgIFVuYWJsZSB0byBkZXRlcm1pbmUgcHJvamVjdCB1c2luZyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LlxuICAgICAgICAgICAgICBVc2luZyBkZWZhdWx0IHdvcmtzcGFjZSBwcm9qZWN0IGluc3RlYWQuXG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dvcmtzcGFjZS5nZXREZWZhdWx0UHJvamVjdE5hbWUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0pO1xuXG4gICAgaWYgKG9wdGlvbnMuaW50ZXJhY3RpdmUgIT09IGZhbHNlICYmIHByb2Nlc3Muc3Rkb3V0LmlzVFRZKSB7XG4gICAgICB3b3JrZmxvdy5yZWdpc3RyeS51c2VQcm9tcHRQcm92aWRlcigoZGVmaW5pdGlvbnM6IEFycmF5PHNjaGVtYS5Qcm9tcHREZWZpbml0aW9uPikgPT4ge1xuICAgICAgICBjb25zdCBxdWVzdGlvbnM6IGlucXVpcmVyLlF1ZXN0aW9ucyA9IGRlZmluaXRpb25zLm1hcChkZWZpbml0aW9uID0+IHtcbiAgICAgICAgICBjb25zdCBxdWVzdGlvbjogaW5xdWlyZXIuUXVlc3Rpb24gPSB7XG4gICAgICAgICAgICBuYW1lOiBkZWZpbml0aW9uLmlkLFxuICAgICAgICAgICAgbWVzc2FnZTogZGVmaW5pdGlvbi5tZXNzYWdlLFxuICAgICAgICAgICAgZGVmYXVsdDogZGVmaW5pdGlvbi5kZWZhdWx0LFxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBjb25zdCB2YWxpZGF0b3IgPSBkZWZpbml0aW9uLnZhbGlkYXRvcjtcbiAgICAgICAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICAgICAgICBxdWVzdGlvbi52YWxpZGF0ZSA9IGlucHV0ID0+IHZhbGlkYXRvcihpbnB1dCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc3dpdGNoIChkZWZpbml0aW9uLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2NvbmZpcm1hdGlvbic6XG4gICAgICAgICAgICAgIHF1ZXN0aW9uLnR5cGUgPSAnY29uZmlybSc7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbGlzdCc6XG4gICAgICAgICAgICAgIHF1ZXN0aW9uLnR5cGUgPSAnbGlzdCc7XG4gICAgICAgICAgICAgIHF1ZXN0aW9uLmNob2ljZXMgPSBkZWZpbml0aW9uLml0ZW1zICYmIGRlZmluaXRpb24uaXRlbXMubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubGFiZWwsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHF1ZXN0aW9uLnR5cGUgPSBkZWZpbml0aW9uLnR5cGU7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBxdWVzdGlvbjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGlucXVpcmVyLnByb21wdChxdWVzdGlvbnMpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3dvcmtmbG93ID0gd29ya2Zsb3c7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKTogc3RyaW5nIHtcbiAgICBsZXQgd29ya3NwYWNlID0gZ2V0V29ya3NwYWNlKCdsb2NhbCcpO1xuXG4gICAgaWYgKHdvcmtzcGFjZSkge1xuICAgICAgY29uc3QgcHJvamVjdCA9IGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2UpO1xuICAgICAgaWYgKHByb2plY3QgJiYgd29ya3NwYWNlLmdldFByb2plY3RDbGkocHJvamVjdCkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB3b3Jrc3BhY2UuZ2V0UHJvamVjdENsaShwcm9qZWN0KVsnZGVmYXVsdENvbGxlY3Rpb24nXTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHdvcmtzcGFjZS5nZXRDbGkoKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHdvcmtzcGFjZS5nZXRDbGkoKVsnZGVmYXVsdENvbGxlY3Rpb24nXTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgaWYgKHdvcmtzcGFjZSAmJiB3b3Jrc3BhY2UuZ2V0Q2xpKCkpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gd29ya3NwYWNlLmdldENsaSgpWydkZWZhdWx0Q29sbGVjdGlvbiddO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICdAc2NoZW1hdGljcy9hbmd1bGFyJztcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBydW5TY2hlbWF0aWMob3B0aW9uczogUnVuU2NoZW1hdGljT3B0aW9ucykge1xuICAgIGNvbnN0IHsgc2NoZW1hdGljT3B0aW9ucywgZGVidWcsIGRyeVJ1biB9ID0gb3B0aW9ucztcbiAgICBsZXQgeyBjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZSB9ID0gb3B0aW9ucztcblxuICAgIGxldCBub3RoaW5nRG9uZSA9IHRydWU7XG4gICAgbGV0IGxvZ2dpbmdRdWV1ZTogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgZXJyb3IgPSBmYWxzZTtcblxuICAgIGNvbnN0IHdvcmtmbG93ID0gdGhpcy5fd29ya2Zsb3c7XG5cbiAgICBjb25zdCB3b3JraW5nRGlyID0gbm9ybWFsaXplKHN5c3RlbVBhdGgucmVsYXRpdmUodGhpcy53b3Jrc3BhY2Uucm9vdCwgcHJvY2Vzcy5jd2QoKSkpO1xuXG4gICAgLy8gR2V0IHRoZSBvcHRpb24gb2JqZWN0IGZyb20gdGhlIHNjaGVtYXRpYyBzY2hlbWEuXG4gICAgY29uc3Qgc2NoZW1hdGljID0gdGhpcy5nZXRTY2hlbWF0aWMoXG4gICAgICB0aGlzLmdldENvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpLFxuICAgICAgc2NoZW1hdGljTmFtZSxcbiAgICAgIHRoaXMuYWxsb3dQcml2YXRlU2NoZW1hdGljcyxcbiAgICApO1xuICAgIC8vIFVwZGF0ZSB0aGUgc2NoZW1hdGljIGFuZCBjb2xsZWN0aW9uIG5hbWUgaW4gY2FzZSB0aGV5J3JlIG5vdCB0aGUgc2FtZSBhcyB0aGUgb25lcyB3ZVxuICAgIC8vIHJlY2VpdmVkIGluIG91ciBvcHRpb25zLCBlLmcuIGFmdGVyIGFsaWFzIHJlc29sdXRpb24gb3IgZXh0ZW5zaW9uLlxuICAgIGNvbGxlY3Rpb25OYW1lID0gc2NoZW1hdGljLmNvbGxlY3Rpb24uZGVzY3JpcHRpb24ubmFtZTtcbiAgICBzY2hlbWF0aWNOYW1lID0gc2NoZW1hdGljLmRlc2NyaXB0aW9uLm5hbWU7XG5cbiAgICAvLyBTZXQgdGhlIG9wdGlvbnMgb2YgZm9ybWF0IFwicGF0aFwiLlxuICAgIGxldCBvOiBPcHRpb25bXSB8IG51bGwgPSBudWxsO1xuICAgIGxldCBhcmdzOiBBcmd1bWVudHM7XG5cbiAgICBpZiAoIXNjaGVtYXRpYy5kZXNjcmlwdGlvbi5zY2hlbWFKc29uKSB7XG4gICAgICBhcmdzID0gYXdhaXQgdGhpcy5wYXJzZUZyZWVGb3JtQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnMgfHwgW10pO1xuICAgIH0gZWxzZSB7XG4gICAgICBvID0gYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKHdvcmtmbG93LnJlZ2lzdHJ5LCBzY2hlbWF0aWMuZGVzY3JpcHRpb24uc2NoZW1hSnNvbik7XG4gICAgICBhcmdzID0gYXdhaXQgdGhpcy5wYXJzZUFyZ3VtZW50cyhzY2hlbWF0aWNPcHRpb25zIHx8IFtdLCBvKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXRoT3B0aW9ucyA9IG8gPyB0aGlzLnNldFBhdGhPcHRpb25zKG8sIHdvcmtpbmdEaXIpIDoge307XG4gICAgbGV0IGlucHV0ID0gT2JqZWN0LmFzc2lnbihwYXRoT3B0aW9ucywgYXJncyk7XG5cbiAgICAvLyBSZWFkIHRoZSBkZWZhdWx0IHZhbHVlcyBmcm9tIHRoZSB3b3Jrc3BhY2UuXG4gICAgY29uc3QgcHJvamVjdE5hbWUgPSBpbnB1dC5wcm9qZWN0ICE9PSB1bmRlZmluZWQgPyAnJyArIGlucHV0LnByb2plY3QgOiBudWxsO1xuICAgIGNvbnN0IGRlZmF1bHRzID0gZ2V0U2NoZW1hdGljRGVmYXVsdHMoY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWUsIHByb2plY3ROYW1lKTtcbiAgICBpbnB1dCA9IE9iamVjdC5hc3NpZ248e30sIHt9LCB0eXBlb2YgaW5wdXQ+KHt9LCBkZWZhdWx0cywgaW5wdXQpO1xuXG4gICAgd29ya2Zsb3cucmVwb3J0ZXIuc3Vic2NyaWJlKChldmVudDogRHJ5UnVuRXZlbnQpID0+IHtcbiAgICAgIG5vdGhpbmdEb25lID0gZmFsc2U7XG5cbiAgICAgIC8vIFN0cmlwIGxlYWRpbmcgc2xhc2ggdG8gcHJldmVudCBjb25mdXNpb24uXG4gICAgICBjb25zdCBldmVudFBhdGggPSBldmVudC5wYXRoLnN0YXJ0c1dpdGgoJy8nKSA/IGV2ZW50LnBhdGguc3Vic3RyKDEpIDogZXZlbnQucGF0aDtcblxuICAgICAgc3dpdGNoIChldmVudC5raW5kKSB7XG4gICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICBlcnJvciA9IHRydWU7XG4gICAgICAgICAgY29uc3QgZGVzYyA9IGV2ZW50LmRlc2NyaXB0aW9uID09ICdhbHJlYWR5RXhpc3QnID8gJ2FscmVhZHkgZXhpc3RzJyA6ICdkb2VzIG5vdCBleGlzdC4nO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYEVSUk9SISAke2V2ZW50UGF0aH0gJHtkZXNjfS5gKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAndXBkYXRlJzpcbiAgICAgICAgICBsb2dnaW5nUXVldWUucHVzaCh0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICAke3Rlcm1pbmFsLndoaXRlKCdVUERBVEUnKX0gJHtldmVudFBhdGh9ICgke2V2ZW50LmNvbnRlbnQubGVuZ3RofSBieXRlcylcbiAgICAgICAgICBgKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnY3JlYXRlJzpcbiAgICAgICAgICBsb2dnaW5nUXVldWUucHVzaCh0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICAke3Rlcm1pbmFsLmdyZWVuKCdDUkVBVEUnKX0gJHtldmVudFBhdGh9ICgke2V2ZW50LmNvbnRlbnQubGVuZ3RofSBieXRlcylcbiAgICAgICAgICBgKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICBsb2dnaW5nUXVldWUucHVzaChgJHt0ZXJtaW5hbC55ZWxsb3coJ0RFTEVURScpfSAke2V2ZW50UGF0aH1gKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncmVuYW1lJzpcbiAgICAgICAgICBsb2dnaW5nUXVldWUucHVzaChgJHt0ZXJtaW5hbC5ibHVlKCdSRU5BTUUnKX0gJHtldmVudFBhdGh9ID0+ICR7ZXZlbnQudG99YCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB3b3JrZmxvdy5saWZlQ3ljbGUuc3Vic2NyaWJlKGV2ZW50ID0+IHtcbiAgICAgIGlmIChldmVudC5raW5kID09ICdlbmQnIHx8IGV2ZW50LmtpbmQgPT0gJ3Bvc3QtdGFza3Mtc3RhcnQnKSB7XG4gICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAvLyBPdXRwdXQgdGhlIGxvZ2dpbmcgcXVldWUsIG5vIGVycm9yIGhhcHBlbmVkLlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5mb3JFYWNoKGxvZyA9PiB0aGlzLmxvZ2dlci5pbmZvKGxvZykpO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9nZ2luZ1F1ZXVlID0gW107XG4gICAgICAgIGVycm9yID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8bnVtYmVyIHwgdm9pZD4oKHJlc29sdmUpID0+IHtcbiAgICAgIHdvcmtmbG93LmV4ZWN1dGUoe1xuICAgICAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgc2NoZW1hdGljOiBzY2hlbWF0aWNOYW1lLFxuICAgICAgICBvcHRpb25zOiBpbnB1dCxcbiAgICAgICAgZGVidWc6IGRlYnVnLFxuICAgICAgICBsb2dnZXI6IHRoaXMubG9nZ2VyLFxuICAgICAgICBhbGxvd1ByaXZhdGU6IHRoaXMuYWxsb3dQcml2YXRlU2NoZW1hdGljcyxcbiAgICAgIH0pXG4gICAgICAuc3Vic2NyaWJlKHtcbiAgICAgICAgZXJyb3I6IChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgLy8gSW4gY2FzZSB0aGUgd29ya2Zsb3cgd2FzIG5vdCBzdWNjZXNzZnVsLCBzaG93IGFuIGFwcHJvcHJpYXRlIGVycm9yIG1lc3NhZ2UuXG4gICAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uKSB7XG4gICAgICAgICAgICAvLyBcIlNlZSBhYm92ZVwiIGJlY2F1c2Ugd2UgYWxyZWFkeSBwcmludGVkIHRoZSBlcnJvci5cbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKCdUaGUgU2NoZW1hdGljIHdvcmtmbG93IGZhaWxlZC4gU2VlIGFib3ZlLicpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZGVidWcpIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGBBbiBlcnJvciBvY2N1cmVkOlxcbiR7ZXJyLm1lc3NhZ2V9XFxuJHtlcnIuc3RhY2t9YCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGVyci5tZXNzYWdlKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXNvbHZlKDEpO1xuICAgICAgICB9LFxuICAgICAgICBjb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHNob3dOb3RoaW5nRG9uZSA9ICEob3B0aW9ucy5zaG93Tm90aGluZ0RvbmUgPT09IGZhbHNlKTtcbiAgICAgICAgICBpZiAobm90aGluZ0RvbmUgJiYgc2hvd05vdGhpbmdEb25lKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKCdOb3RoaW5nIHRvIGJlIGRvbmUuJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChkcnlSdW4pIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYFxcbk5PVEU6IFRoZSBcImRyeVJ1blwiIGZsYWcgbWVhbnMgbm8gY2hhbmdlcyB3ZXJlIG1hZGUuYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHBhcnNlRnJlZUZvcm1Bcmd1bWVudHMoc2NoZW1hdGljT3B0aW9uczogc3RyaW5nW10pIHtcbiAgICByZXR1cm4gcGFyc2VGcmVlRm9ybUFyZ3VtZW50cyhzY2hlbWF0aWNPcHRpb25zKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBwYXJzZUFyZ3VtZW50cyhcbiAgICBzY2hlbWF0aWNPcHRpb25zOiBzdHJpbmdbXSxcbiAgICBvcHRpb25zOiBPcHRpb25bXSB8IG51bGwsXG4gICk6IFByb21pc2U8QXJndW1lbnRzPiB7XG4gICAgcmV0dXJuIHBhcnNlQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnMsIG9wdGlvbnMpO1xuICB9XG5cbiAgcHJpdmF0ZSBfbG9hZFdvcmtzcGFjZSgpIHtcbiAgICBpZiAodGhpcy5fd29ya3NwYWNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHdvcmtzcGFjZUxvYWRlciA9IG5ldyBXb3Jrc3BhY2VMb2FkZXIodGhpcy5faG9zdCk7XG5cbiAgICB0cnkge1xuICAgICAgd29ya3NwYWNlTG9hZGVyLmxvYWRXb3Jrc3BhY2UodGhpcy53b3Jrc3BhY2Uucm9vdCkucGlwZSh0YWtlKDEpKVxuICAgICAgICAuc3Vic2NyaWJlKFxuICAgICAgICAgICh3b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlKSA9PiB0aGlzLl93b3Jrc3BhY2UgPSB3b3Jrc3BhY2UsXG4gICAgICAgICAgKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5hbGxvd01pc3NpbmdXb3Jrc3BhY2UpIHtcbiAgICAgICAgICAgICAgLy8gSWdub3JlIG1pc3Npbmcgd29ya3NwYWNlXG4gICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICApO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKCF0aGlzLmFsbG93TWlzc2luZ1dvcmtzcGFjZSkge1xuICAgICAgICAvLyBJZ25vcmUgbWlzc2luZyB3b3Jrc3BhY2VcbiAgICAgICAgdGhyb3cgZXJyO1xuICB9XG4gICAgfVxuICB9XG59XG4iXX0=