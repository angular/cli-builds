"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable no-any
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const schematics_1 = require("@angular-devkit/schematics");
const tools_1 = require("@angular-devkit/schematics/tools");
const inquirer = require("inquirer");
const operators_1 = require("rxjs/operators");
const workspace_loader_1 = require("../models/workspace-loader");
const config_1 = require("../utilities/config");
const command_1 = require("./command");
class UnknownCollectionError extends Error {
    constructor(collectionName) {
        super(`Invalid collection (${collectionName}).`);
    }
}
exports.UnknownCollectionError = UnknownCollectionError;
class SchematicCommand extends command_1.Command {
    constructor(context, logger, engineHost = new tools_1.NodeModulesEngineHost()) {
        super(context, logger);
        this.options = [];
        this.allowPrivateSchematics = false;
        this._host = new node_1.NodeJsSyncHost();
        this.argStrategy = command_1.ArgumentStrategy.Nothing;
        this.coreOptions = [
            {
                name: 'dryRun',
                type: 'boolean',
                default: false,
                aliases: ['d'],
                description: 'Run through without making any changes.',
            },
            {
                name: 'force',
                type: 'boolean',
                default: false,
                aliases: ['f'],
                description: 'Forces overwriting of files.',
            }
        ];
        this._engineHost = engineHost;
        this._engine = new schematics_1.SchematicEngine(this._engineHost);
        const registry = new core_1.schema.CoreSchemaRegistry(schematics_1.formats.standardFormats);
        this._engineHost.registerOptionsTransform(tools_1.validateOptionsWithSchema(registry));
    }
    initialize(_options) {
        return __awaiter(this, void 0, void 0, function* () {
            this._loadWorkspace();
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
        return this.options
            .filter(o => o.format === 'path')
            .map(o => o.name)
            .filter(name => options[name] === undefined)
            .reduce((acc, curr) => {
            acc[curr] = workingDir;
            return acc;
        }, {});
    }
    /*
     * Runtime hook to allow specifying customized workflow
     */
    getWorkflow(options) {
        const { force, dryRun } = options;
        const fsHost = new core_1.virtualFs.ScopedHost(new node_1.NodeJsSyncHost(), core_1.normalize(this.project.root));
        return new tools_1.NodeWorkflow(fsHost, {
            force,
            dryRun,
            packageManager: config_1.getPackageManager(),
            root: this.project.root,
        });
    }
    _getWorkflow(options) {
        if (!this._workflow) {
            this._workflow = this.getWorkflow(options);
        }
        return this._workflow;
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
        const { collectionName, schematicName, debug, dryRun } = options;
        let schematicOptions = this.removeCoreOptions(options.schematicOptions);
        let nothingDone = true;
        let loggingQueue = [];
        let error = false;
        const workflow = this._getWorkflow(options);
        const workingDir = process.cwd().replace(this.project.root, '').replace(/\\/g, '/');
        const pathOptions = this.setPathOptions(schematicOptions, workingDir);
        schematicOptions = Object.assign({}, schematicOptions, pathOptions);
        const defaultOptions = this.readDefaults(collectionName, schematicName, schematicOptions);
        schematicOptions = Object.assign({}, schematicOptions, defaultOptions);
        // Remove all of the original arguments which have already been parsed
        const argumentCount = this._originalOptions
            .filter(opt => {
            let isArgument = false;
            if (opt.$default !== undefined && opt.$default.$source === 'argv') {
                isArgument = true;
            }
            return isArgument;
        })
            .length;
        // Pass the rest of the arguments as the smart default "argv". Then delete it.
        const rawArgs = schematicOptions._.slice(argumentCount);
        workflow.registry.addSmartDefaultProvider('argv', (schema) => {
            if ('index' in schema) {
                return rawArgs[Number(schema['index'])];
            }
            else {
                return rawArgs;
            }
        });
        delete schematicOptions._;
        workflow.registry.addSmartDefaultProvider('projectName', (_schema) => {
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
                options: schematicOptions,
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
                        this.logger.warn(`\nNOTE: Run with "dry run" no changes were made.`);
                    }
                    resolve();
                },
            });
        });
    }
    removeCoreOptions(options) {
        const opts = Object.assign({}, options);
        if (this._originalOptions.find(option => option.name == 'dryRun')) {
            delete opts.dryRun;
        }
        if (this._originalOptions.find(option => option.name == 'force')) {
            delete opts.force;
        }
        if (this._originalOptions.find(option => option.name == 'debug')) {
            delete opts.debug;
        }
        return opts;
    }
    getOptions(options) {
        // Make a copy.
        this._originalOptions = [...this.options];
        const collectionName = options.collectionName || this.getDefaultSchematicCollection();
        const collection = this.getCollection(collectionName);
        const schematic = this.getSchematic(collection, options.schematicName, this.allowPrivateSchematics);
        this._deAliasedName = schematic.description.name;
        if (!schematic.description.schemaJson) {
            return Promise.resolve([]);
        }
        const properties = schematic.description.schemaJson.properties;
        const keys = Object.keys(properties);
        const availableOptions = keys
            .map(key => (Object.assign({}, properties[key], { name: core_1.strings.dasherize(key) })))
            .map(opt => {
            const types = ['string', 'boolean', 'integer', 'number'];
            // Ignore arrays / objects.
            if (types.indexOf(opt.type) === -1) {
                return null;
            }
            let aliases = [];
            if (opt.alias) {
                aliases = [...aliases, opt.alias];
            }
            if (opt.aliases) {
                aliases = [...aliases, ...opt.aliases];
            }
            const schematicDefault = opt.default;
            return Object.assign({}, opt, { aliases, default: undefined, // do not carry over schematics defaults
                schematicDefault, hidden: opt.visible === false });
        })
            .filter(x => x);
        return Promise.resolve(availableOptions);
    }
    _loadWorkspace() {
        if (this._workspace) {
            return;
        }
        const workspaceLoader = new workspace_loader_1.WorkspaceLoader(this._host);
        try {
            workspaceLoader.loadWorkspace(this.project.root).pipe(operators_1.take(1))
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
    _cleanDefaults(defaults, undefinedOptions) {
        Object.keys(defaults)
            .filter(key => !undefinedOptions.map(core_1.strings.camelize).includes(key))
            .forEach(key => {
            delete defaults[key];
        });
        return defaults;
    }
    readDefaults(collectionName, schematicName, options) {
        if (this._deAliasedName) {
            schematicName = this._deAliasedName;
        }
        const projectName = options.project;
        const defaults = config_1.getSchematicDefaults(collectionName, schematicName, projectName);
        // Get list of all undefined options.
        const undefinedOptions = this.options
            .filter(o => options[o.name] === undefined)
            .map(o => o.name);
        // Delete any default that is not undefined.
        this._cleanDefaults(defaults, undefinedOptions);
        return defaults;
    }
}
exports.SchematicCommand = SchematicCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBRUgsaURBQWlEO0FBQ2pELCtDQVU4QjtBQUM5QixvREFBMkQ7QUFDM0QsMkRBU29DO0FBQ3BDLDREQU8wQztBQUMxQyxxQ0FBcUM7QUFDckMsOENBQXNDO0FBQ3RDLGlFQUE2RDtBQUM3RCxnREFLNkI7QUFDN0IsdUNBQThFO0FBNEI5RSw0QkFBb0MsU0FBUSxLQUFLO0lBQy9DLFlBQVksY0FBc0I7UUFDaEMsS0FBSyxDQUFDLHVCQUF1QixjQUFjLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUM7Q0FDRjtBQUpELHdEQUlDO0FBRUQsc0JBQXVDLFNBQVEsaUJBQU87SUFZcEQsWUFDSSxPQUF1QixFQUFFLE1BQXNCLEVBQy9DLGFBQXVDLElBQUksNkJBQXFCLEVBQUU7UUFDcEUsS0FBSyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztRQWRoQixZQUFPLEdBQWEsRUFBRSxDQUFDO1FBQ3ZCLDJCQUFzQixHQUFZLEtBQUssQ0FBQztRQUN6QyxVQUFLLEdBQUcsSUFBSSxxQkFBYyxFQUFFLENBQUM7UUFPckMsZ0JBQVcsR0FBRywwQkFBZ0IsQ0FBQyxPQUFPLENBQUM7UUFhcEIsZ0JBQVcsR0FBYTtZQUN6QztnQkFDRSxJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsS0FBSztnQkFDZCxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUM7Z0JBQ2QsV0FBVyxFQUFFLHlDQUF5QzthQUN2RDtZQUNEO2dCQUNFLElBQUksRUFBRSxPQUFPO2dCQUNiLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQztnQkFDZCxXQUFXLEVBQUUsOEJBQThCO2FBQzVDO1NBQUMsQ0FBQztRQXJCSCxJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQztRQUM5QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksNEJBQWUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDckQsTUFBTSxRQUFRLEdBQUcsSUFBSSxhQUFNLENBQUMsa0JBQWtCLENBQUMsb0JBQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsV0FBVyxDQUFDLHdCQUF3QixDQUNyQyxpQ0FBeUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFrQlksVUFBVSxDQUFDLFFBQWE7O1lBQ25DLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN4QixDQUFDO0tBQUE7SUFFUyxhQUFhO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUMxQixDQUFDO0lBQ1MsU0FBUztRQUVqQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDdEIsQ0FBQztJQUVTLGFBQWEsQ0FBQyxjQUFzQjtRQUM1QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEMsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRTNELElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtZQUN2QixNQUFNLElBQUksc0JBQXNCLENBQUMsY0FBYyxDQUFDLENBQUM7U0FDbEQ7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBRVMsWUFBWSxDQUNsQixVQUFnQyxFQUFFLGFBQXFCLEVBQ3ZELFlBQXNCO1FBQ3hCLE9BQU8sVUFBVSxDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVTLGNBQWMsQ0FBQyxPQUFZLEVBQUUsVUFBa0I7UUFDdkQsSUFBSSxVQUFVLEtBQUssRUFBRSxFQUFFO1lBQ3JCLE9BQU8sRUFBRSxDQUFDO1NBQ1g7UUFFRCxPQUFPLElBQUksQ0FBQyxPQUFPO2FBQ2hCLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDO2FBQ2hDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7YUFDaEIsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLFNBQVMsQ0FBQzthQUMzQyxNQUFNLENBQUMsQ0FBQyxHQUFRLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDekIsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQztZQUV2QixPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFRDs7T0FFRztJQUNPLFdBQVcsQ0FBQyxPQUE0QjtRQUNoRCxNQUFNLEVBQUMsS0FBSyxFQUFFLE1BQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQztRQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGdCQUFTLENBQUMsVUFBVSxDQUNuQyxJQUFJLHFCQUFjLEVBQUUsRUFBRSxnQkFBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUV4RCxPQUFPLElBQUksb0JBQVksQ0FDbkIsTUFBYSxFQUNiO1lBQ0UsS0FBSztZQUNMLE1BQU07WUFDTixjQUFjLEVBQUUsMEJBQWlCLEVBQUU7WUFDbkMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSTtTQUN4QixDQUNKLENBQUM7SUFDSixDQUFDO0lBRU8sWUFBWSxDQUFDLE9BQTRCO1FBQy9DLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ25CLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUM1QztRQUVELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN4QixDQUFDO0lBRVMsNkJBQTZCO1FBQ3JDLElBQUksU0FBUyxHQUFHLHFCQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFdEMsSUFBSSxTQUFTLEVBQUU7WUFDYixNQUFNLE9BQU8sR0FBRyx3QkFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzNDLElBQUksT0FBTyxJQUFJLFNBQVMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQy9DLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFDcEUsSUFBSSxPQUFPLEtBQUssSUFBSSxRQUFRLEVBQUU7b0JBQzVCLE9BQU8sS0FBSyxDQUFDO2lCQUNkO2FBQ0Y7WUFDRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDdEIsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3RELElBQUksT0FBTyxLQUFLLElBQUksUUFBUSxFQUFFO29CQUM1QixPQUFPLEtBQUssQ0FBQztpQkFDZDthQUNGO1NBQ0Y7UUFFRCxTQUFTLEdBQUcscUJBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuQyxJQUFJLFNBQVMsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDbkMsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFDdEQsSUFBSSxPQUFPLEtBQUssSUFBSSxRQUFRLEVBQUU7Z0JBQzVCLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7U0FDRjtRQUVELE9BQU8scUJBQXFCLENBQUM7SUFDL0IsQ0FBQztJQUVTLFlBQVksQ0FBQyxPQUE0QjtRQUNqRCxNQUFNLEVBQUMsY0FBYyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFDLEdBQUcsT0FBTyxDQUFDO1FBQy9ELElBQUksZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3hFLElBQUksV0FBVyxHQUFHLElBQUksQ0FBQztRQUN2QixJQUFJLFlBQVksR0FBYSxFQUFFLENBQUM7UUFDaEMsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ2xCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFNUMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdEUsZ0JBQWdCLHFCQUFRLGdCQUFnQixFQUFLLFdBQVcsQ0FBRSxDQUFDO1FBQzNELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzFGLGdCQUFnQixxQkFBUSxnQkFBZ0IsRUFBSyxjQUFjLENBQUUsQ0FBQztRQUU5RCxzRUFBc0U7UUFFdEUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQjthQUN4QyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDWixJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7WUFDdkIsSUFBSSxHQUFHLENBQUMsUUFBUSxLQUFLLFNBQVMsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sS0FBSyxNQUFNLEVBQUU7Z0JBQ2pFLFVBQVUsR0FBRyxJQUFJLENBQUM7YUFDbkI7WUFFRCxPQUFPLFVBQVUsQ0FBQztRQUNwQixDQUFDLENBQUM7YUFDRCxNQUFNLENBQUM7UUFFViw4RUFBOEU7UUFDOUUsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN4RCxRQUFRLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxDQUFDLE1BQWtCLEVBQUUsRUFBRTtZQUN2RSxJQUFJLE9BQU8sSUFBSSxNQUFNLEVBQUU7Z0JBQ3JCLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3pDO2lCQUFNO2dCQUNMLE9BQU8sT0FBTyxDQUFDO2FBQ2hCO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUUxQixRQUFRLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDLGFBQWEsRUFBRSxDQUFDLE9BQW1CLEVBQUUsRUFBRTtZQUMvRSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ25CLElBQUk7b0JBQ0osT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLGdCQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7MkJBQ3ZELElBQUksQ0FBQyxVQUFVLENBQUMscUJBQXFCLEVBQUUsQ0FBQztpQkFDakQ7Z0JBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ1YsSUFBSSxDQUFDLFlBQVksbUJBQVksQ0FBQyxTQUFTLENBQUMsNkJBQTZCLEVBQUU7d0JBQ3JFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBQyxPQUFPLENBQUE7Ozs7YUFJNUIsQ0FBQyxDQUFDO3dCQUVILE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO3FCQUNoRDtvQkFDRCxNQUFNLENBQUMsQ0FBQztpQkFDVDthQUNGO1lBRUQsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLE9BQU8sQ0FBQyxXQUFXLEtBQUssS0FBSyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFO1lBQ3pELFFBQVEsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxXQUEyQyxFQUFFLEVBQUU7Z0JBQ2xGLE1BQU0sU0FBUyxHQUF1QixXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO29CQUNqRSxNQUFNLFFBQVEsR0FBc0I7d0JBQ2xDLElBQUksRUFBRSxVQUFVLENBQUMsRUFBRTt3QkFDbkIsT0FBTyxFQUFFLFVBQVUsQ0FBQyxPQUFPO3dCQUMzQixPQUFPLEVBQUUsVUFBVSxDQUFDLE9BQU87cUJBQzVCLENBQUM7b0JBRUYsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQztvQkFDdkMsSUFBSSxTQUFTLEVBQUU7d0JBQ2IsUUFBUSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztxQkFDL0M7b0JBRUQsUUFBUSxVQUFVLENBQUMsSUFBSSxFQUFFO3dCQUN2QixLQUFLLGNBQWM7NEJBQ2pCLFFBQVEsQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDOzRCQUMxQixNQUFNO3dCQUNSLEtBQUssTUFBTTs0QkFDVCxRQUFRLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQzs0QkFDdkIsUUFBUSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsS0FBSyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dDQUNqRSxJQUFJLE9BQU8sSUFBSSxJQUFJLFFBQVEsRUFBRTtvQ0FDM0IsT0FBTyxJQUFJLENBQUM7aUNBQ2I7cUNBQU07b0NBQ0wsT0FBTzt3Q0FDTCxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUs7d0NBQ2hCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztxQ0FDbEIsQ0FBQztpQ0FDSDs0QkFDSCxDQUFDLENBQUMsQ0FBQzs0QkFDSCxNQUFNO3dCQUNSOzRCQUNFLFFBQVEsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQzs0QkFDaEMsTUFBTTtxQkFDVDtvQkFFRCxPQUFPLFFBQVEsQ0FBQztnQkFDbEIsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3BDLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFFRCxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQWtCLEVBQUUsRUFBRTtZQUNqRCxXQUFXLEdBQUcsS0FBSyxDQUFDO1lBRXBCLDRDQUE0QztZQUM1QyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFFakYsUUFBUSxLQUFLLENBQUMsSUFBSSxFQUFFO2dCQUNsQixLQUFLLE9BQU87b0JBQ1YsS0FBSyxHQUFHLElBQUksQ0FBQztvQkFDYixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsV0FBVyxJQUFJLGNBQWMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO29CQUN4RixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLFNBQVMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO29CQUNqRCxNQUFNO2dCQUNSLEtBQUssUUFBUTtvQkFDWCxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBQyxPQUFPLENBQUE7Y0FDMUIsZUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxTQUFTLEtBQUssS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNO1dBQ2pFLENBQUMsQ0FBQztvQkFDSCxNQUFNO2dCQUNSLEtBQUssUUFBUTtvQkFDWCxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBQyxPQUFPLENBQUE7Y0FDMUIsZUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxTQUFTLEtBQUssS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNO1dBQ2pFLENBQUMsQ0FBQztvQkFDSCxNQUFNO2dCQUNSLEtBQUssUUFBUTtvQkFDWCxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsZUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFDO29CQUMvRCxNQUFNO2dCQUNSLEtBQUssUUFBUTtvQkFDWCxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsZUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxTQUFTLE9BQU8sS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQzVFLE1BQU07YUFDVDtRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDbkMsSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLGtCQUFrQixFQUFFO2dCQUMzRCxJQUFJLENBQUMsS0FBSyxFQUFFO29CQUNWLCtDQUErQztvQkFDL0MsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7aUJBQ3BEO2dCQUVELFlBQVksR0FBRyxFQUFFLENBQUM7Z0JBQ2xCLEtBQUssR0FBRyxLQUFLLENBQUM7YUFDZjtRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxJQUFJLE9BQU8sQ0FBZ0IsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUM1QyxRQUFRLENBQUMsT0FBTyxDQUFDO2dCQUNmLFVBQVUsRUFBRSxjQUFjO2dCQUMxQixTQUFTLEVBQUUsYUFBYTtnQkFDeEIsT0FBTyxFQUFFLGdCQUFnQjtnQkFDekIsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFhO2dCQUMxQixZQUFZLEVBQUUsSUFBSSxDQUFDLHNCQUFzQjthQUMxQyxDQUFDO2lCQUNELFNBQVMsQ0FBQztnQkFDVCxLQUFLLEVBQUUsQ0FBQyxHQUFVLEVBQUUsRUFBRTtvQkFDcEIsOEVBQThFO29CQUM5RSxJQUFJLEdBQUcsWUFBWSwwQ0FBNkIsRUFBRTt3QkFDaEQsb0RBQW9EO3dCQUNwRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO3FCQUNoRTt5QkFBTSxJQUFJLEtBQUssRUFBRTt3QkFDaEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxPQUFPLEtBQUssR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7cUJBQ3RFO3lCQUFNO3dCQUNMLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztxQkFDaEM7b0JBRUQsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNiLENBQUM7Z0JBQ0QsUUFBUSxFQUFFLEdBQUcsRUFBRTtvQkFDYixNQUFNLGVBQWUsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsS0FBSyxLQUFLLENBQUMsQ0FBQztvQkFDN0QsSUFBSSxXQUFXLElBQUksZUFBZSxFQUFFO3dCQUNsQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO3FCQUN6QztvQkFDRCxJQUFJLE1BQU0sRUFBRTt3QkFDVixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO3FCQUN0RTtvQkFDRCxPQUFPLEVBQUUsQ0FBQztnQkFDWixDQUFDO2FBQ0YsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRVMsaUJBQWlCLENBQUMsT0FBWTtRQUN0QyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4QyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxFQUFFO1lBQ2pFLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztTQUNwQjtRQUNELElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLEVBQUU7WUFDaEUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO1NBQ25CO1FBQ0QsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsRUFBRTtZQUNoRSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7U0FDbkI7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFUyxVQUFVLENBQUMsT0FBMEI7UUFDN0MsZUFBZTtRQUNmLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTFDLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUM7UUFFdEYsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUV0RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsYUFBYSxFQUNuRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO1FBRWpELElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRTtZQUNyQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDNUI7UUFFRCxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7UUFDL0QsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyQyxNQUFNLGdCQUFnQixHQUFHLElBQUk7YUFDMUIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsbUJBQU0sVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFLLEVBQUUsSUFBSSxFQUFFLGNBQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRyxDQUFDO2FBQ3pFLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNULE1BQU0sS0FBSyxHQUFHLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDekQsMkJBQTJCO1lBQzNCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7Z0JBQ2xDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxJQUFJLE9BQU8sR0FBYSxFQUFFLENBQUM7WUFDM0IsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO2dCQUNiLE9BQU8sR0FBRyxDQUFDLEdBQUcsT0FBTyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNuQztZQUNELElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRTtnQkFDZixPQUFPLEdBQUcsQ0FBQyxHQUFHLE9BQU8sRUFBRSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUN4QztZQUNELE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQztZQUVyQyx5QkFDSyxHQUFHLElBQ04sT0FBTyxFQUNQLE9BQU8sRUFBRSxTQUFTLEVBQUUsd0NBQXdDO2dCQUM1RCxnQkFBZ0IsRUFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxPQUFPLEtBQUssS0FBSyxJQUM3QjtRQUNKLENBQUMsQ0FBQzthQUNELE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWxCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFTyxjQUFjO1FBQ3BCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNuQixPQUFPO1NBQ1I7UUFDRCxNQUFNLGVBQWUsR0FBRyxJQUFJLGtDQUFlLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXhELElBQUk7WUFDRixlQUFlLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQzNELFNBQVMsQ0FDUixDQUFDLFNBQTJDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxFQUM1RSxDQUFDLEdBQVUsRUFBRSxFQUFFO2dCQUNiLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUU7b0JBQy9CLDJCQUEyQjtvQkFDM0IsTUFBTSxHQUFHLENBQUM7aUJBQ1g7WUFDSCxDQUFDLENBQ0YsQ0FBQztTQUNMO1FBQUMsT0FBTyxHQUFHLEVBQUU7WUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFO2dCQUMvQiwyQkFBMkI7Z0JBQzNCLE1BQU0sR0FBRyxDQUFDO2FBQ1g7U0FDRjtJQUNILENBQUM7SUFFTyxjQUFjLENBQXVCLFFBQVcsRUFBRSxnQkFBMEI7UUFDakYsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQVM7YUFDM0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsY0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFhLENBQUMsQ0FBQzthQUM5RSxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDYixPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixDQUFDLENBQUMsQ0FBQztRQUVMLE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUFFTyxZQUFZLENBQUMsY0FBc0IsRUFBRSxhQUFxQixFQUFFLE9BQVk7UUFDOUUsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ3ZCLGFBQWEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDO1NBQ3JDO1FBRUQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztRQUNwQyxNQUFNLFFBQVEsR0FBRyw2QkFBb0IsQ0FBQyxjQUFjLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRWxGLHFDQUFxQztRQUNyQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxPQUFPO2FBQ2xDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssU0FBUyxDQUFDO2FBQzFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVwQiw0Q0FBNEM7UUFDNUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUVoRCxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUF6YkQsNENBeWJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgbm8tYW55XG5pbXBvcnQge1xuICBKc29uT2JqZWN0LFxuICBleHBlcmltZW50YWwsXG4gIGxvZ2dpbmcsXG4gIG5vcm1hbGl6ZSxcbiAgc2NoZW1hLFxuICBzdHJpbmdzLFxuICB0YWdzLFxuICB0ZXJtaW5hbCxcbiAgdmlydHVhbEZzLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBOb2RlSnNTeW5jSG9zdCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlL25vZGUnO1xuaW1wb3J0IHtcbiAgQ29sbGVjdGlvbixcbiAgRHJ5UnVuRXZlbnQsXG4gIEVuZ2luZSxcbiAgU2NoZW1hdGljLFxuICBTY2hlbWF0aWNFbmdpbmUsXG4gIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uLFxuICBmb3JtYXRzLFxuICB3b3JrZmxvdyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHtcbiAgRmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjLFxuICBGaWxlU3lzdGVtRW5naW5lSG9zdEJhc2UsXG4gIEZpbGVTeXN0ZW1TY2hlbWF0aWNEZXNjLFxuICBOb2RlTW9kdWxlc0VuZ2luZUhvc3QsXG4gIE5vZGVXb3JrZmxvdyxcbiAgdmFsaWRhdGVPcHRpb25zV2l0aFNjaGVtYSxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0ICogYXMgaW5xdWlyZXIgZnJvbSAnaW5xdWlyZXInO1xuaW1wb3J0IHsgdGFrZSB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IFdvcmtzcGFjZUxvYWRlciB9IGZyb20gJy4uL21vZGVscy93b3Jrc3BhY2UtbG9hZGVyJztcbmltcG9ydCB7XG4gIGdldFBhY2thZ2VNYW5hZ2VyLFxuICBnZXRQcm9qZWN0QnlDd2QsXG4gIGdldFNjaGVtYXRpY0RlZmF1bHRzLFxuICBnZXRXb3Jrc3BhY2UsXG59IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgQXJndW1lbnRTdHJhdGVneSwgQ29tbWFuZCwgQ29tbWFuZENvbnRleHQsIE9wdGlvbiB9IGZyb20gJy4vY29tbWFuZCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29yZVNjaGVtYXRpY09wdGlvbnMge1xuICBkcnlSdW46IGJvb2xlYW47XG4gIGZvcmNlOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJ1blNjaGVtYXRpY09wdGlvbnMge1xuICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICBzY2hlbWF0aWNOYW1lOiBzdHJpbmc7XG4gIHNjaGVtYXRpY09wdGlvbnM6IGFueTtcbiAgZGVidWc/OiBib29sZWFuO1xuICBkcnlSdW46IGJvb2xlYW47XG4gIGZvcmNlOiBib29sZWFuO1xuICBzaG93Tm90aGluZ0RvbmU/OiBib29sZWFuO1xuICBpbnRlcmFjdGl2ZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2V0T3B0aW9uc09wdGlvbnMge1xuICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICBzY2hlbWF0aWNOYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2V0T3B0aW9uc1Jlc3VsdCB7XG4gIG9wdGlvbnM6IE9wdGlvbltdO1xuICBhcmd1bWVudHM6IE9wdGlvbltdO1xufVxuXG5leHBvcnQgY2xhc3MgVW5rbm93bkNvbGxlY3Rpb25FcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IoY29sbGVjdGlvbk5hbWU6IHN0cmluZykge1xuICAgIHN1cGVyKGBJbnZhbGlkIGNvbGxlY3Rpb24gKCR7Y29sbGVjdGlvbk5hbWV9KS5gKTtcbiAgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgU2NoZW1hdGljQ29tbWFuZCBleHRlbmRzIENvbW1hbmQge1xuICByZWFkb25seSBvcHRpb25zOiBPcHRpb25bXSA9IFtdO1xuICByZWFkb25seSBhbGxvd1ByaXZhdGVTY2hlbWF0aWNzOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgX2hvc3QgPSBuZXcgTm9kZUpzU3luY0hvc3QoKTtcbiAgcHJpdmF0ZSBfd29ya3NwYWNlOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZTtcbiAgcHJpdmF0ZSBfZGVBbGlhc2VkTmFtZTogc3RyaW5nO1xuICBwcml2YXRlIF9vcmlnaW5hbE9wdGlvbnM6IE9wdGlvbltdO1xuICBwcml2YXRlIF9lbmdpbmVIb3N0OiBGaWxlU3lzdGVtRW5naW5lSG9zdEJhc2U7XG4gIHByaXZhdGUgX2VuZ2luZTogRW5naW5lPEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzYywgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2M+O1xuICBwcml2YXRlIF93b3JrZmxvdzogd29ya2Zsb3cuQmFzZVdvcmtmbG93O1xuICBhcmdTdHJhdGVneSA9IEFyZ3VtZW50U3RyYXRlZ3kuTm90aGluZztcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIGNvbnRleHQ6IENvbW1hbmRDb250ZXh0LCBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyLFxuICAgICAgZW5naW5lSG9zdDogRmlsZVN5c3RlbUVuZ2luZUhvc3RCYXNlID0gbmV3IE5vZGVNb2R1bGVzRW5naW5lSG9zdCgpKSB7XG4gICAgc3VwZXIoY29udGV4dCwgbG9nZ2VyKTtcbiAgICB0aGlzLl9lbmdpbmVIb3N0ID0gZW5naW5lSG9zdDtcbiAgICB0aGlzLl9lbmdpbmUgPSBuZXcgU2NoZW1hdGljRW5naW5lKHRoaXMuX2VuZ2luZUhvc3QpO1xuICAgIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IHNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoZm9ybWF0cy5zdGFuZGFyZEZvcm1hdHMpO1xuICAgIHRoaXMuX2VuZ2luZUhvc3QucmVnaXN0ZXJPcHRpb25zVHJhbnNmb3JtKFxuICAgICAgICB2YWxpZGF0ZU9wdGlvbnNXaXRoU2NoZW1hKHJlZ2lzdHJ5KSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVhZG9ubHkgY29yZU9wdGlvbnM6IE9wdGlvbltdID0gW1xuICAgIHtcbiAgICAgIG5hbWU6ICdkcnlSdW4nLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICBhbGlhc2VzOiBbJ2QnXSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUnVuIHRocm91Z2ggd2l0aG91dCBtYWtpbmcgYW55IGNoYW5nZXMuJyxcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6ICdmb3JjZScsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGFsaWFzZXM6IFsnZiddLFxuICAgICAgZGVzY3JpcHRpb246ICdGb3JjZXMgb3ZlcndyaXRpbmcgb2YgZmlsZXMuJyxcbiAgICB9XTtcblxuICBwdWJsaWMgYXN5bmMgaW5pdGlhbGl6ZShfb3B0aW9uczogYW55KSB7XG4gICAgdGhpcy5fbG9hZFdvcmtzcGFjZSgpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldEVuZ2luZUhvc3QoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VuZ2luZUhvc3Q7XG4gIH1cbiAgcHJvdGVjdGVkIGdldEVuZ2luZSgpOlxuICAgICAgRW5naW5lPEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzYywgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2M+IHtcbiAgICByZXR1cm4gdGhpcy5fZW5naW5lO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldENvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWU6IHN0cmluZyk6IENvbGxlY3Rpb248YW55LCBhbnk+IHtcbiAgICBjb25zdCBlbmdpbmUgPSB0aGlzLmdldEVuZ2luZSgpO1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSBlbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG5cbiAgICBpZiAoY29sbGVjdGlvbiA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFVua25vd25Db2xsZWN0aW9uRXJyb3IoY29sbGVjdGlvbk5hbWUpO1xuICAgIH1cblxuICAgIHJldHVybiBjb2xsZWN0aW9uO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFNjaGVtYXRpYyhcbiAgICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb248YW55LCBhbnk+LCBzY2hlbWF0aWNOYW1lOiBzdHJpbmcsXG4gICAgICBhbGxvd1ByaXZhdGU/OiBib29sZWFuKTogU2NoZW1hdGljPGFueSwgYW55PiB7XG4gICAgcmV0dXJuIGNvbGxlY3Rpb24uY3JlYXRlU2NoZW1hdGljKHNjaGVtYXRpY05hbWUsIGFsbG93UHJpdmF0ZSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgc2V0UGF0aE9wdGlvbnMob3B0aW9uczogYW55LCB3b3JraW5nRGlyOiBzdHJpbmcpOiBhbnkge1xuICAgIGlmICh3b3JraW5nRGlyID09PSAnJykge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm9wdGlvbnNcbiAgICAgIC5maWx0ZXIobyA9PiBvLmZvcm1hdCA9PT0gJ3BhdGgnKVxuICAgICAgLm1hcChvID0+IG8ubmFtZSlcbiAgICAgIC5maWx0ZXIobmFtZSA9PiBvcHRpb25zW25hbWVdID09PSB1bmRlZmluZWQpXG4gICAgICAucmVkdWNlKChhY2M6IGFueSwgY3VycikgPT4ge1xuICAgICAgICBhY2NbY3Vycl0gPSB3b3JraW5nRGlyO1xuXG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgICB9LCB7fSk7XG4gIH1cblxuICAvKlxuICAgKiBSdW50aW1lIGhvb2sgdG8gYWxsb3cgc3BlY2lmeWluZyBjdXN0b21pemVkIHdvcmtmbG93XG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0V29ya2Zsb3cob3B0aW9uczogUnVuU2NoZW1hdGljT3B0aW9ucyk6IHdvcmtmbG93LkJhc2VXb3JrZmxvdyB7XG4gICAgY29uc3Qge2ZvcmNlLCBkcnlSdW59ID0gb3B0aW9ucztcbiAgICBjb25zdCBmc0hvc3QgPSBuZXcgdmlydHVhbEZzLlNjb3BlZEhvc3QoXG4gICAgICAgIG5ldyBOb2RlSnNTeW5jSG9zdCgpLCBub3JtYWxpemUodGhpcy5wcm9qZWN0LnJvb3QpKTtcblxuICAgIHJldHVybiBuZXcgTm9kZVdvcmtmbG93KFxuICAgICAgICBmc0hvc3QgYXMgYW55LFxuICAgICAgICB7XG4gICAgICAgICAgZm9yY2UsXG4gICAgICAgICAgZHJ5UnVuLFxuICAgICAgICAgIHBhY2thZ2VNYW5hZ2VyOiBnZXRQYWNrYWdlTWFuYWdlcigpLFxuICAgICAgICAgIHJvb3Q6IHRoaXMucHJvamVjdC5yb290LFxuICAgICAgICB9LFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIF9nZXRXb3JrZmxvdyhvcHRpb25zOiBSdW5TY2hlbWF0aWNPcHRpb25zKTogd29ya2Zsb3cuQmFzZVdvcmtmbG93IHtcbiAgICBpZiAoIXRoaXMuX3dvcmtmbG93KSB7XG4gICAgICB0aGlzLl93b3JrZmxvdyA9IHRoaXMuZ2V0V29ya2Zsb3cob3B0aW9ucyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3dvcmtmbG93O1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCk6IHN0cmluZyB7XG4gICAgbGV0IHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcblxuICAgIGlmICh3b3Jrc3BhY2UpIHtcbiAgICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICAgIGlmIChwcm9qZWN0ICYmIHdvcmtzcGFjZS5nZXRQcm9qZWN0Q2xpKHByb2plY3QpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gd29ya3NwYWNlLmdldFByb2plY3RDbGkocHJvamVjdClbJ2RlZmF1bHRDb2xsZWN0aW9uJ107XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh3b3Jrc3BhY2UuZ2V0Q2xpKCkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB3b3Jrc3BhY2UuZ2V0Q2xpKClbJ2RlZmF1bHRDb2xsZWN0aW9uJ107XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIGlmICh3b3Jrc3BhY2UgJiYgd29ya3NwYWNlLmdldENsaSgpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHdvcmtzcGFjZS5nZXRDbGkoKVsnZGVmYXVsdENvbGxlY3Rpb24nXTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAnQHNjaGVtYXRpY3MvYW5ndWxhcic7XG4gIH1cblxuICBwcm90ZWN0ZWQgcnVuU2NoZW1hdGljKG9wdGlvbnM6IFJ1blNjaGVtYXRpY09wdGlvbnMpIHtcbiAgICBjb25zdCB7Y29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWUsIGRlYnVnLCBkcnlSdW59ID0gb3B0aW9ucztcbiAgICBsZXQgc2NoZW1hdGljT3B0aW9ucyA9IHRoaXMucmVtb3ZlQ29yZU9wdGlvbnMob3B0aW9ucy5zY2hlbWF0aWNPcHRpb25zKTtcbiAgICBsZXQgbm90aGluZ0RvbmUgPSB0cnVlO1xuICAgIGxldCBsb2dnaW5nUXVldWU6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IGVycm9yID0gZmFsc2U7XG4gICAgY29uc3Qgd29ya2Zsb3cgPSB0aGlzLl9nZXRXb3JrZmxvdyhvcHRpb25zKTtcblxuICAgIGNvbnN0IHdvcmtpbmdEaXIgPSBwcm9jZXNzLmN3ZCgpLnJlcGxhY2UodGhpcy5wcm9qZWN0LnJvb3QsICcnKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgY29uc3QgcGF0aE9wdGlvbnMgPSB0aGlzLnNldFBhdGhPcHRpb25zKHNjaGVtYXRpY09wdGlvbnMsIHdvcmtpbmdEaXIpO1xuICAgIHNjaGVtYXRpY09wdGlvbnMgPSB7IC4uLnNjaGVtYXRpY09wdGlvbnMsIC4uLnBhdGhPcHRpb25zIH07XG4gICAgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB0aGlzLnJlYWREZWZhdWx0cyhjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZSwgc2NoZW1hdGljT3B0aW9ucyk7XG4gICAgc2NoZW1hdGljT3B0aW9ucyA9IHsgLi4uc2NoZW1hdGljT3B0aW9ucywgLi4uZGVmYXVsdE9wdGlvbnMgfTtcblxuICAgIC8vIFJlbW92ZSBhbGwgb2YgdGhlIG9yaWdpbmFsIGFyZ3VtZW50cyB3aGljaCBoYXZlIGFscmVhZHkgYmVlbiBwYXJzZWRcblxuICAgIGNvbnN0IGFyZ3VtZW50Q291bnQgPSB0aGlzLl9vcmlnaW5hbE9wdGlvbnNcbiAgICAgIC5maWx0ZXIob3B0ID0+IHtcbiAgICAgICAgbGV0IGlzQXJndW1lbnQgPSBmYWxzZTtcbiAgICAgICAgaWYgKG9wdC4kZGVmYXVsdCAhPT0gdW5kZWZpbmVkICYmIG9wdC4kZGVmYXVsdC4kc291cmNlID09PSAnYXJndicpIHtcbiAgICAgICAgICBpc0FyZ3VtZW50ID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpc0FyZ3VtZW50O1xuICAgICAgfSlcbiAgICAgIC5sZW5ndGg7XG5cbiAgICAvLyBQYXNzIHRoZSByZXN0IG9mIHRoZSBhcmd1bWVudHMgYXMgdGhlIHNtYXJ0IGRlZmF1bHQgXCJhcmd2XCIuIFRoZW4gZGVsZXRlIGl0LlxuICAgIGNvbnN0IHJhd0FyZ3MgPSBzY2hlbWF0aWNPcHRpb25zLl8uc2xpY2UoYXJndW1lbnRDb3VudCk7XG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ2FyZ3YnLCAoc2NoZW1hOiBKc29uT2JqZWN0KSA9PiB7XG4gICAgICBpZiAoJ2luZGV4JyBpbiBzY2hlbWEpIHtcbiAgICAgICAgcmV0dXJuIHJhd0FyZ3NbTnVtYmVyKHNjaGVtYVsnaW5kZXgnXSldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHJhd0FyZ3M7XG4gICAgICB9XG4gICAgfSk7XG4gICAgZGVsZXRlIHNjaGVtYXRpY09wdGlvbnMuXztcblxuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFNtYXJ0RGVmYXVsdFByb3ZpZGVyKCdwcm9qZWN0TmFtZScsIChfc2NoZW1hOiBKc29uT2JqZWN0KSA9PiB7XG4gICAgICBpZiAodGhpcy5fd29ya3NwYWNlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93b3Jrc3BhY2UuZ2V0UHJvamVjdEJ5UGF0aChub3JtYWxpemUocHJvY2Vzcy5jd2QoKSkpXG4gICAgICAgICAgICAgICB8fCB0aGlzLl93b3Jrc3BhY2UuZ2V0RGVmYXVsdFByb2plY3ROYW1lKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuQW1iaWd1b3VzUHJvamVjdFBhdGhFeGNlcHRpb24pIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4odGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgICBUd28gb3IgbW9yZSBwcm9qZWN0cyBhcmUgdXNpbmcgaWRlbnRpY2FsIHJvb3RzLlxuICAgICAgICAgICAgICBVbmFibGUgdG8gZGV0ZXJtaW5lIHByb2plY3QgdXNpbmcgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeS5cbiAgICAgICAgICAgICAgVXNpbmcgZGVmYXVsdCB3b3Jrc3BhY2UgcHJvamVjdCBpbnN0ZWFkLlxuICAgICAgICAgICAgYCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93b3Jrc3BhY2UuZ2V0RGVmYXVsdFByb2plY3ROYW1lKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9KTtcblxuICAgIGlmIChvcHRpb25zLmludGVyYWN0aXZlICE9PSBmYWxzZSAmJiBwcm9jZXNzLnN0ZG91dC5pc1RUWSkge1xuICAgICAgd29ya2Zsb3cucmVnaXN0cnkudXNlUHJvbXB0UHJvdmlkZXIoKGRlZmluaXRpb25zOiBBcnJheTxzY2hlbWEuUHJvbXB0RGVmaW5pdGlvbj4pID0+IHtcbiAgICAgICAgY29uc3QgcXVlc3Rpb25zOiBpbnF1aXJlci5RdWVzdGlvbnMgPSBkZWZpbml0aW9ucy5tYXAoZGVmaW5pdGlvbiA9PiB7XG4gICAgICAgICAgY29uc3QgcXVlc3Rpb246IGlucXVpcmVyLlF1ZXN0aW9uID0ge1xuICAgICAgICAgICAgbmFtZTogZGVmaW5pdGlvbi5pZCxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGRlZmluaXRpb24ubWVzc2FnZSxcbiAgICAgICAgICAgIGRlZmF1bHQ6IGRlZmluaXRpb24uZGVmYXVsdCxcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgY29uc3QgdmFsaWRhdG9yID0gZGVmaW5pdGlvbi52YWxpZGF0b3I7XG4gICAgICAgICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgICAgICAgcXVlc3Rpb24udmFsaWRhdGUgPSBpbnB1dCA9PiB2YWxpZGF0b3IoaW5wdXQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHN3aXRjaCAoZGVmaW5pdGlvbi50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdjb25maXJtYXRpb24nOlxuICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gJ2NvbmZpcm0nO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2xpc3QnOlxuICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gJ2xpc3QnO1xuICAgICAgICAgICAgICBxdWVzdGlvbi5jaG9pY2VzID0gZGVmaW5pdGlvbi5pdGVtcyAmJiBkZWZpbml0aW9uLml0ZW1zLm1hcChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLmxhYmVsLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gZGVmaW5pdGlvbi50eXBlO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gcXVlc3Rpb247XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBpbnF1aXJlci5wcm9tcHQocXVlc3Rpb25zKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHdvcmtmbG93LnJlcG9ydGVyLnN1YnNjcmliZSgoZXZlbnQ6IERyeVJ1bkV2ZW50KSA9PiB7XG4gICAgICBub3RoaW5nRG9uZSA9IGZhbHNlO1xuXG4gICAgICAvLyBTdHJpcCBsZWFkaW5nIHNsYXNoIHRvIHByZXZlbnQgY29uZnVzaW9uLlxuICAgICAgY29uc3QgZXZlbnRQYXRoID0gZXZlbnQucGF0aC5zdGFydHNXaXRoKCcvJykgPyBldmVudC5wYXRoLnN1YnN0cigxKSA6IGV2ZW50LnBhdGg7XG5cbiAgICAgIHN3aXRjaCAoZXZlbnQua2luZCkge1xuICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgZXJyb3IgPSB0cnVlO1xuICAgICAgICAgIGNvbnN0IGRlc2MgPSBldmVudC5kZXNjcmlwdGlvbiA9PSAnYWxyZWFkeUV4aXN0JyA/ICdhbHJlYWR5IGV4aXN0cycgOiAnZG9lcyBub3QgZXhpc3QuJztcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBFUlJPUiEgJHtldmVudFBhdGh9ICR7ZGVzY30uYCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3VwZGF0ZSc6XG4gICAgICAgICAgbG9nZ2luZ1F1ZXVlLnB1c2godGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgJHt0ZXJtaW5hbC53aGl0ZSgnVVBEQVRFJyl9ICR7ZXZlbnRQYXRofSAoJHtldmVudC5jb250ZW50Lmxlbmd0aH0gYnl0ZXMpXG4gICAgICAgICAgYCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgICAgbG9nZ2luZ1F1ZXVlLnB1c2godGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgJHt0ZXJtaW5hbC5ncmVlbignQ1JFQVRFJyl9ICR7ZXZlbnRQYXRofSAoJHtldmVudC5jb250ZW50Lmxlbmd0aH0gYnl0ZXMpXG4gICAgICAgICAgYCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2RlbGV0ZSc6XG4gICAgICAgICAgbG9nZ2luZ1F1ZXVlLnB1c2goYCR7dGVybWluYWwueWVsbG93KCdERUxFVEUnKX0gJHtldmVudFBhdGh9YCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3JlbmFtZSc6XG4gICAgICAgICAgbG9nZ2luZ1F1ZXVlLnB1c2goYCR7dGVybWluYWwuYmx1ZSgnUkVOQU1FJyl9ICR7ZXZlbnRQYXRofSA9PiAke2V2ZW50LnRvfWApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgd29ya2Zsb3cubGlmZUN5Y2xlLnN1YnNjcmliZShldmVudCA9PiB7XG4gICAgICBpZiAoZXZlbnQua2luZCA9PSAnZW5kJyB8fCBldmVudC5raW5kID09ICdwb3N0LXRhc2tzLXN0YXJ0Jykge1xuICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgLy8gT3V0cHV0IHRoZSBsb2dnaW5nIHF1ZXVlLCBubyBlcnJvciBoYXBwZW5lZC5cbiAgICAgICAgICBsb2dnaW5nUXVldWUuZm9yRWFjaChsb2cgPT4gdGhpcy5sb2dnZXIuaW5mbyhsb2cpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvZ2dpbmdRdWV1ZSA9IFtdO1xuICAgICAgICBlcnJvciA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPG51bWJlciB8IHZvaWQ+KChyZXNvbHZlKSA9PiB7XG4gICAgICB3b3JrZmxvdy5leGVjdXRlKHtcbiAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIHNjaGVtYXRpYzogc2NoZW1hdGljTmFtZSxcbiAgICAgICAgb3B0aW9uczogc2NoZW1hdGljT3B0aW9ucyxcbiAgICAgICAgZGVidWc6IGRlYnVnLFxuICAgICAgICBsb2dnZXI6IHRoaXMubG9nZ2VyIGFzIGFueSxcbiAgICAgICAgYWxsb3dQcml2YXRlOiB0aGlzLmFsbG93UHJpdmF0ZVNjaGVtYXRpY3MsXG4gICAgICB9KVxuICAgICAgLnN1YnNjcmliZSh7XG4gICAgICAgIGVycm9yOiAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgIC8vIEluIGNhc2UgdGhlIHdvcmtmbG93IHdhcyBub3Qgc3VjY2Vzc2Z1bCwgc2hvdyBhbiBhcHByb3ByaWF0ZSBlcnJvciBtZXNzYWdlLlxuICAgICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbikge1xuICAgICAgICAgICAgLy8gXCJTZWUgYWJvdmVcIiBiZWNhdXNlIHdlIGFscmVhZHkgcHJpbnRlZCB0aGUgZXJyb3IuXG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbCgnVGhlIFNjaGVtYXRpYyB3b3JrZmxvdyBmYWlsZWQuIFNlZSBhYm92ZS4nKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGRlYnVnKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChgQW4gZXJyb3Igb2NjdXJlZDpcXG4ke2Vyci5tZXNzYWdlfVxcbiR7ZXJyLnN0YWNrfWApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChlcnIubWVzc2FnZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmVzb2x2ZSgxKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29tcGxldGU6ICgpID0+IHtcbiAgICAgICAgICBjb25zdCBzaG93Tm90aGluZ0RvbmUgPSAhKG9wdGlvbnMuc2hvd05vdGhpbmdEb25lID09PSBmYWxzZSk7XG4gICAgICAgICAgaWYgKG5vdGhpbmdEb25lICYmIHNob3dOb3RoaW5nRG9uZSkge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIuaW5mbygnTm90aGluZyB0byBiZSBkb25lLicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZHJ5UnVuKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBcXG5OT1RFOiBSdW4gd2l0aCBcImRyeSBydW5cIiBubyBjaGFuZ2VzIHdlcmUgbWFkZS5gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVtb3ZlQ29yZU9wdGlvbnMob3B0aW9uczogYW55KTogYW55IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyk7XG4gICAgaWYgKHRoaXMuX29yaWdpbmFsT3B0aW9ucy5maW5kKG9wdGlvbiA9PiBvcHRpb24ubmFtZSA9PSAnZHJ5UnVuJykpIHtcbiAgICAgIGRlbGV0ZSBvcHRzLmRyeVJ1bjtcbiAgICB9XG4gICAgaWYgKHRoaXMuX29yaWdpbmFsT3B0aW9ucy5maW5kKG9wdGlvbiA9PiBvcHRpb24ubmFtZSA9PSAnZm9yY2UnKSkge1xuICAgICAgZGVsZXRlIG9wdHMuZm9yY2U7XG4gICAgfVxuICAgIGlmICh0aGlzLl9vcmlnaW5hbE9wdGlvbnMuZmluZChvcHRpb24gPT4gb3B0aW9uLm5hbWUgPT0gJ2RlYnVnJykpIHtcbiAgICAgIGRlbGV0ZSBvcHRzLmRlYnVnO1xuICAgIH1cblxuICAgIHJldHVybiBvcHRzO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldE9wdGlvbnMob3B0aW9uczogR2V0T3B0aW9uc09wdGlvbnMpOiBQcm9taXNlPE9wdGlvbltdPiB7XG4gICAgLy8gTWFrZSBhIGNvcHkuXG4gICAgdGhpcy5fb3JpZ2luYWxPcHRpb25zID0gWy4uLnRoaXMub3B0aW9uc107XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IG9wdGlvbnMuY29sbGVjdGlvbk5hbWUgfHwgdGhpcy5nZXREZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbigpO1xuXG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMuZ2V0Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG5cbiAgICBjb25zdCBzY2hlbWF0aWMgPSB0aGlzLmdldFNjaGVtYXRpYyhjb2xsZWN0aW9uLCBvcHRpb25zLnNjaGVtYXRpY05hbWUsXG4gICAgICB0aGlzLmFsbG93UHJpdmF0ZVNjaGVtYXRpY3MpO1xuICAgIHRoaXMuX2RlQWxpYXNlZE5hbWUgPSBzY2hlbWF0aWMuZGVzY3JpcHRpb24ubmFtZTtcblxuICAgIGlmICghc2NoZW1hdGljLmRlc2NyaXB0aW9uLnNjaGVtYUpzb24pIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoW10pO1xuICAgIH1cblxuICAgIGNvbnN0IHByb3BlcnRpZXMgPSBzY2hlbWF0aWMuZGVzY3JpcHRpb24uc2NoZW1hSnNvbi5wcm9wZXJ0aWVzO1xuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKTtcbiAgICBjb25zdCBhdmFpbGFibGVPcHRpb25zID0ga2V5c1xuICAgICAgLm1hcChrZXkgPT4gKHsgLi4ucHJvcGVydGllc1trZXldLCAuLi57IG5hbWU6IHN0cmluZ3MuZGFzaGVyaXplKGtleSkgfSB9KSlcbiAgICAgIC5tYXAob3B0ID0+IHtcbiAgICAgICAgY29uc3QgdHlwZXMgPSBbJ3N0cmluZycsICdib29sZWFuJywgJ2ludGVnZXInLCAnbnVtYmVyJ107XG4gICAgICAgIC8vIElnbm9yZSBhcnJheXMgLyBvYmplY3RzLlxuICAgICAgICBpZiAodHlwZXMuaW5kZXhPZihvcHQudHlwZSkgPT09IC0xKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgYWxpYXNlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgaWYgKG9wdC5hbGlhcykge1xuICAgICAgICAgIGFsaWFzZXMgPSBbLi4uYWxpYXNlcywgb3B0LmFsaWFzXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0LmFsaWFzZXMpIHtcbiAgICAgICAgICBhbGlhc2VzID0gWy4uLmFsaWFzZXMsIC4uLm9wdC5hbGlhc2VzXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzY2hlbWF0aWNEZWZhdWx0ID0gb3B0LmRlZmF1bHQ7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi5vcHQsXG4gICAgICAgICAgYWxpYXNlcyxcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsIC8vIGRvIG5vdCBjYXJyeSBvdmVyIHNjaGVtYXRpY3MgZGVmYXVsdHNcbiAgICAgICAgICBzY2hlbWF0aWNEZWZhdWx0LFxuICAgICAgICAgIGhpZGRlbjogb3B0LnZpc2libGUgPT09IGZhbHNlLFxuICAgICAgICB9O1xuICAgICAgfSlcbiAgICAgIC5maWx0ZXIoeCA9PiB4KTtcblxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoYXZhaWxhYmxlT3B0aW9ucyk7XG4gIH1cblxuICBwcml2YXRlIF9sb2FkV29ya3NwYWNlKCkge1xuICAgIGlmICh0aGlzLl93b3Jrc3BhY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgd29ya3NwYWNlTG9hZGVyID0gbmV3IFdvcmtzcGFjZUxvYWRlcih0aGlzLl9ob3N0KTtcblxuICAgIHRyeSB7XG4gICAgICB3b3Jrc3BhY2VMb2FkZXIubG9hZFdvcmtzcGFjZSh0aGlzLnByb2plY3Qucm9vdCkucGlwZSh0YWtlKDEpKVxuICAgICAgICAuc3Vic2NyaWJlKFxuICAgICAgICAgICh3b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlKSA9PiB0aGlzLl93b3Jrc3BhY2UgPSB3b3Jrc3BhY2UsXG4gICAgICAgICAgKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5hbGxvd01pc3NpbmdXb3Jrc3BhY2UpIHtcbiAgICAgICAgICAgICAgLy8gSWdub3JlIG1pc3Npbmcgd29ya3NwYWNlXG4gICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICApO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKCF0aGlzLmFsbG93TWlzc2luZ1dvcmtzcGFjZSkge1xuICAgICAgICAvLyBJZ25vcmUgbWlzc2luZyB3b3Jrc3BhY2VcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2NsZWFuRGVmYXVsdHM8VCwgSyBleHRlbmRzIGtleW9mIFQ+KGRlZmF1bHRzOiBULCB1bmRlZmluZWRPcHRpb25zOiBzdHJpbmdbXSk6IFQge1xuICAgIChPYmplY3Qua2V5cyhkZWZhdWx0cykgYXMgS1tdKVxuICAgICAgLmZpbHRlcihrZXkgPT4gIXVuZGVmaW5lZE9wdGlvbnMubWFwKHN0cmluZ3MuY2FtZWxpemUpLmluY2x1ZGVzKGtleSBhcyBzdHJpbmcpKVxuICAgICAgLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgZGVsZXRlIGRlZmF1bHRzW2tleV07XG4gICAgICB9KTtcblxuICAgIHJldHVybiBkZWZhdWx0cztcbiAgfVxuXG4gIHByaXZhdGUgcmVhZERlZmF1bHRzKGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcsIHNjaGVtYXRpY05hbWU6IHN0cmluZywgb3B0aW9uczogYW55KToge30ge1xuICAgIGlmICh0aGlzLl9kZUFsaWFzZWROYW1lKSB7XG4gICAgICBzY2hlbWF0aWNOYW1lID0gdGhpcy5fZGVBbGlhc2VkTmFtZTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0TmFtZSA9IG9wdGlvbnMucHJvamVjdDtcbiAgICBjb25zdCBkZWZhdWx0cyA9IGdldFNjaGVtYXRpY0RlZmF1bHRzKGNvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lLCBwcm9qZWN0TmFtZSk7XG5cbiAgICAvLyBHZXQgbGlzdCBvZiBhbGwgdW5kZWZpbmVkIG9wdGlvbnMuXG4gICAgY29uc3QgdW5kZWZpbmVkT3B0aW9ucyA9IHRoaXMub3B0aW9uc1xuICAgICAgLmZpbHRlcihvID0+IG9wdGlvbnNbby5uYW1lXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICAvLyBEZWxldGUgYW55IGRlZmF1bHQgdGhhdCBpcyBub3QgdW5kZWZpbmVkLlxuICAgIHRoaXMuX2NsZWFuRGVmYXVsdHMoZGVmYXVsdHMsIHVuZGVmaW5lZE9wdGlvbnMpO1xuXG4gICAgcmV0dXJuIGRlZmF1bHRzO1xuICB9XG59XG4iXX0=