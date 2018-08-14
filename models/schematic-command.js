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
                type: Boolean,
                default: false,
                aliases: ['d'],
                description: 'Run through without making any changes.',
            },
            {
                name: 'force',
                type: Boolean,
                default: false,
                aliases: ['f'],
                description: 'Forces overwriting of files.',
            }
        ];
        this.arguments = ['project'];
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
        // Pass the rest of the arguments as the smart default "argv". Then delete it.
        // Removing the first item which is the schematic name.
        const rawArgs = schematicOptions._;
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
        const collectionName = options.collectionName || config_1.getDefaultSchematicCollection();
        const collection = this.getCollection(collectionName);
        const schematic = this.getSchematic(collection, options.schematicName, this.allowPrivateSchematics);
        this._deAliasedName = schematic.description.name;
        if (!schematic.description.schemaJson) {
            return Promise.resolve({
                options: [],
                arguments: [],
            });
        }
        const properties = schematic.description.schemaJson.properties;
        const keys = Object.keys(properties);
        const availableOptions = keys
            .map(key => (Object.assign({}, properties[key], { name: core_1.strings.dasherize(key) })))
            .map(opt => {
            let type;
            const schematicType = opt.type;
            switch (opt.type) {
                case 'string':
                    type = String;
                    break;
                case 'boolean':
                    type = Boolean;
                    break;
                case 'integer':
                case 'number':
                    type = Number;
                    break;
                // Ignore arrays / objects.
                default:
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
            return Object.assign({}, opt, { aliases,
                type,
                schematicType, default: undefined, // do not carry over schematics defaults
                schematicDefault, hidden: opt.visible === false });
        })
            .filter(x => x);
        const schematicOptions = availableOptions
            .filter(opt => opt.$default === undefined || opt.$default.$source !== 'argv');
        const schematicArguments = availableOptions
            .filter(opt => opt.$default !== undefined && opt.$default.$source === 'argv')
            .sort((a, b) => {
            if (a.$default.index === undefined) {
                return 1;
            }
            if (b.$default.index === undefined) {
                return -1;
            }
            if (a.$default.index == b.$default.index) {
                return 0;
            }
            else if (a.$default.index > b.$default.index) {
                return 1;
            }
            else {
                return -1;
            }
        });
        return Promise.resolve({
            options: schematicOptions,
            arguments: schematicArguments,
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBRUgsaURBQWlEO0FBQ2pELCtDQVU4QjtBQUM5QixvREFBMkQ7QUFDM0QsMkRBU29DO0FBQ3BDLDREQU8wQztBQUMxQyw4Q0FBc0M7QUFDdEMsaUVBQTZEO0FBQzdELGdEQUk2QjtBQUM3Qix1Q0FBOEU7QUEyQjlFLDRCQUFvQyxTQUFRLEtBQUs7SUFDL0MsWUFBWSxjQUFzQjtRQUNoQyxLQUFLLENBQUMsdUJBQXVCLGNBQWMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNGO0FBSkQsd0RBSUM7QUFFRCxzQkFBdUMsU0FBUSxpQkFBTztJQVlwRCxZQUNJLE9BQXVCLEVBQUUsTUFBc0IsRUFDL0MsYUFBdUMsSUFBSSw2QkFBcUIsRUFBRTtRQUNwRSxLQUFLLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBZGhCLFlBQU8sR0FBYSxFQUFFLENBQUM7UUFDdkIsMkJBQXNCLEdBQVksS0FBSyxDQUFDO1FBQ3pDLFVBQUssR0FBRyxJQUFJLHFCQUFjLEVBQUUsQ0FBQztRQU9yQyxnQkFBVyxHQUFHLDBCQUFnQixDQUFDLE9BQU8sQ0FBQztRQWFwQixnQkFBVyxHQUFhO1lBQ3pDO2dCQUNFLElBQUksRUFBRSxRQUFRO2dCQUNkLElBQUksRUFBRSxPQUFPO2dCQUNiLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQztnQkFDZCxXQUFXLEVBQUUseUNBQXlDO2FBQ3ZEO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO2dCQUNk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RUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssU0FBUyxDQUFDO2FBQzFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVwQiw0Q0FBNEM7UUFDNUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUVoRCxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUEvWUQsNENBK1lDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgbm8tYW55XG5pbXBvcnQge1xuICBKc29uT2JqZWN0LFxuICBleHBlcmltZW50YWwsXG4gIGxvZ2dpbmcsXG4gIG5vcm1hbGl6ZSxcbiAgc2NoZW1hLFxuICBzdHJpbmdzLFxuICB0YWdzLFxuICB0ZXJtaW5hbCxcbiAgdmlydHVhbEZzLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBOb2RlSnNTeW5jSG9zdCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlL25vZGUnO1xuaW1wb3J0IHtcbiAgQ29sbGVjdGlvbixcbiAgRHJ5UnVuRXZlbnQsXG4gIEVuZ2luZSxcbiAgU2NoZW1hdGljLFxuICBTY2hlbWF0aWNFbmdpbmUsXG4gIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uLFxuICBmb3JtYXRzLFxuICB3b3JrZmxvdyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHtcbiAgRmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjLFxuICBGaWxlU3lzdGVtRW5naW5lSG9zdEJhc2UsXG4gIEZpbGVTeXN0ZW1TY2hlbWF0aWNEZXNjLFxuICBOb2RlTW9kdWxlc0VuZ2luZUhvc3QsXG4gIE5vZGVXb3JrZmxvdyxcbiAgdmFsaWRhdGVPcHRpb25zV2l0aFNjaGVtYSxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHsgdGFrZSB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IFdvcmtzcGFjZUxvYWRlciB9IGZyb20gJy4uL21vZGVscy93b3Jrc3BhY2UtbG9hZGVyJztcbmltcG9ydCB7XG4gIGdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uLFxuICBnZXRQYWNrYWdlTWFuYWdlcixcbiAgZ2V0U2NoZW1hdGljRGVmYXVsdHMsXG59IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgQXJndW1lbnRTdHJhdGVneSwgQ29tbWFuZCwgQ29tbWFuZENvbnRleHQsIE9wdGlvbiB9IGZyb20gJy4vY29tbWFuZCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29yZVNjaGVtYXRpY09wdGlvbnMge1xuICBkcnlSdW46IGJvb2xlYW47XG4gIGZvcmNlOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJ1blNjaGVtYXRpY09wdGlvbnMge1xuICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICBzY2hlbWF0aWNOYW1lOiBzdHJpbmc7XG4gIHNjaGVtYXRpY09wdGlvbnM6IGFueTtcbiAgZGVidWc/OiBib29sZWFuO1xuICBkcnlSdW46IGJvb2xlYW47XG4gIGZvcmNlOiBib29sZWFuO1xuICBzaG93Tm90aGluZ0RvbmU/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdldE9wdGlvbnNPcHRpb25zIHtcbiAgY29sbGVjdGlvbk5hbWU6IHN0cmluZztcbiAgc2NoZW1hdGljTmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdldE9wdGlvbnNSZXN1bHQge1xuICBvcHRpb25zOiBPcHRpb25bXTtcbiAgYXJndW1lbnRzOiBPcHRpb25bXTtcbn1cblxuZXhwb3J0IGNsYXNzIFVua25vd25Db2xsZWN0aW9uRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcpIHtcbiAgICBzdXBlcihgSW52YWxpZCBjb2xsZWN0aW9uICgke2NvbGxlY3Rpb25OYW1lfSkuYCk7XG4gIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFNjaGVtYXRpY0NvbW1hbmQgZXh0ZW5kcyBDb21tYW5kIHtcbiAgcmVhZG9ubHkgb3B0aW9uczogT3B0aW9uW10gPSBbXTtcbiAgcmVhZG9ubHkgYWxsb3dQcml2YXRlU2NoZW1hdGljczogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIF9ob3N0ID0gbmV3IE5vZGVKc1N5bmNIb3N0KCk7XG4gIHByaXZhdGUgX3dvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2U7XG4gIHByaXZhdGUgX2RlQWxpYXNlZE5hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSBfb3JpZ2luYWxPcHRpb25zOiBPcHRpb25bXTtcbiAgcHJpdmF0ZSBfZW5naW5lSG9zdDogRmlsZVN5c3RlbUVuZ2luZUhvc3RCYXNlO1xuICBwcml2YXRlIF9lbmdpbmU6IEVuZ2luZTxGaWxlU3lzdGVtQ29sbGVjdGlvbkRlc2MsIEZpbGVTeXN0ZW1TY2hlbWF0aWNEZXNjPjtcbiAgcHJpdmF0ZSBfd29ya2Zsb3c6IHdvcmtmbG93LkJhc2VXb3JrZmxvdztcbiAgYXJnU3RyYXRlZ3kgPSBBcmd1bWVudFN0cmF0ZWd5Lk5vdGhpbmc7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBjb250ZXh0OiBDb21tYW5kQ29udGV4dCwgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcixcbiAgICAgIGVuZ2luZUhvc3Q6IEZpbGVTeXN0ZW1FbmdpbmVIb3N0QmFzZSA9IG5ldyBOb2RlTW9kdWxlc0VuZ2luZUhvc3QoKSkge1xuICAgIHN1cGVyKGNvbnRleHQsIGxvZ2dlcik7XG4gICAgdGhpcy5fZW5naW5lSG9zdCA9IGVuZ2luZUhvc3Q7XG4gICAgdGhpcy5fZW5naW5lID0gbmV3IFNjaGVtYXRpY0VuZ2luZSh0aGlzLl9lbmdpbmVIb3N0KTtcbiAgICBjb25zdCByZWdpc3RyeSA9IG5ldyBzY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KGZvcm1hdHMuc3RhbmRhcmRGb3JtYXRzKTtcbiAgICB0aGlzLl9lbmdpbmVIb3N0LnJlZ2lzdGVyT3B0aW9uc1RyYW5zZm9ybShcbiAgICAgICAgdmFsaWRhdGVPcHRpb25zV2l0aFNjaGVtYShyZWdpc3RyeSkpO1xuICB9XG5cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGNvcmVPcHRpb25zOiBPcHRpb25bXSA9IFtcbiAgICB7XG4gICAgICBuYW1lOiAnZHJ5UnVuJyxcbiAgICAgIHR5cGU6IEJvb2xlYW4sXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGFsaWFzZXM6IFsnZCddLFxuICAgICAgZGVzY3JpcHRpb246ICdSdW4gdGhyb3VnaCB3aXRob3V0IG1ha2luZyBhbnkgY2hhbmdlcy4nLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogJ2ZvcmNlJyxcbiAgICAgIHR5cGU6IEJvb2xlYW4sXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGFsaWFzZXM6IFsnZiddLFxuICAgICAgZGVzY3JpcHRpb246ICdGb3JjZXMgb3ZlcndyaXRpbmcgb2YgZmlsZXMuJyxcbiAgICB9XTtcblxuICByZWFkb25seSBhcmd1bWVudHMgPSBbJ3Byb2plY3QnXTtcblxuICBwdWJsaWMgYXN5bmMgaW5pdGlhbGl6ZShfb3B0aW9uczogYW55KSB7XG4gICAgdGhpcy5fbG9hZFdvcmtzcGFjZSgpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldEVuZ2luZUhvc3QoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VuZ2luZUhvc3Q7XG4gIH1cbiAgcHJvdGVjdGVkIGdldEVuZ2luZSgpOlxuICAgICAgRW5naW5lPEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzYywgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2M+IHtcbiAgICByZXR1cm4gdGhpcy5fZW5naW5lO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldENvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWU6IHN0cmluZyk6IENvbGxlY3Rpb248YW55LCBhbnk+IHtcbiAgICBjb25zdCBlbmdpbmUgPSB0aGlzLmdldEVuZ2luZSgpO1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSBlbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG5cbiAgICBpZiAoY29sbGVjdGlvbiA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFVua25vd25Db2xsZWN0aW9uRXJyb3IoY29sbGVjdGlvbk5hbWUpO1xuICAgIH1cblxuICAgIHJldHVybiBjb2xsZWN0aW9uO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFNjaGVtYXRpYyhcbiAgICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb248YW55LCBhbnk+LCBzY2hlbWF0aWNOYW1lOiBzdHJpbmcsXG4gICAgICBhbGxvd1ByaXZhdGU/OiBib29sZWFuKTogU2NoZW1hdGljPGFueSwgYW55PiB7XG4gICAgcmV0dXJuIGNvbGxlY3Rpb24uY3JlYXRlU2NoZW1hdGljKHNjaGVtYXRpY05hbWUsIGFsbG93UHJpdmF0ZSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgc2V0UGF0aE9wdGlvbnMob3B0aW9uczogYW55LCB3b3JraW5nRGlyOiBzdHJpbmcpOiBhbnkge1xuICAgIGlmICh3b3JraW5nRGlyID09PSAnJykge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm9wdGlvbnNcbiAgICAgIC5maWx0ZXIobyA9PiBvLmZvcm1hdCA9PT0gJ3BhdGgnKVxuICAgICAgLm1hcChvID0+IG8ubmFtZSlcbiAgICAgIC5maWx0ZXIobmFtZSA9PiBvcHRpb25zW25hbWVdID09PSB1bmRlZmluZWQpXG4gICAgICAucmVkdWNlKChhY2M6IGFueSwgY3VycikgPT4ge1xuICAgICAgICBhY2NbY3Vycl0gPSB3b3JraW5nRGlyO1xuXG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgICB9LCB7fSk7XG4gIH1cblxuICAvKlxuICAgKiBSdW50aW1lIGhvb2sgdG8gYWxsb3cgc3BlY2lmeWluZyBjdXN0b21pemVkIHdvcmtmbG93XG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0V29ya2Zsb3cob3B0aW9uczogUnVuU2NoZW1hdGljT3B0aW9ucyk6IHdvcmtmbG93LkJhc2VXb3JrZmxvdyB7XG4gICAgY29uc3Qge2ZvcmNlLCBkcnlSdW59ID0gb3B0aW9ucztcbiAgICBjb25zdCBmc0hvc3QgPSBuZXcgdmlydHVhbEZzLlNjb3BlZEhvc3QoXG4gICAgICAgIG5ldyBOb2RlSnNTeW5jSG9zdCgpLCBub3JtYWxpemUodGhpcy5wcm9qZWN0LnJvb3QpKTtcblxuICAgIHJldHVybiBuZXcgTm9kZVdvcmtmbG93KFxuICAgICAgICBmc0hvc3QgYXMgYW55LFxuICAgICAgICB7XG4gICAgICAgICAgZm9yY2UsXG4gICAgICAgICAgZHJ5UnVuLFxuICAgICAgICAgIHBhY2thZ2VNYW5hZ2VyOiBnZXRQYWNrYWdlTWFuYWdlcigpLFxuICAgICAgICAgIHJvb3Q6IHRoaXMucHJvamVjdC5yb290LFxuICAgICAgICB9LFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIF9nZXRXb3JrZmxvdyhvcHRpb25zOiBSdW5TY2hlbWF0aWNPcHRpb25zKTogd29ya2Zsb3cuQmFzZVdvcmtmbG93IHtcbiAgICBpZiAoIXRoaXMuX3dvcmtmbG93KSB7XG4gICAgICB0aGlzLl93b3JrZmxvdyA9IHRoaXMuZ2V0V29ya2Zsb3cob3B0aW9ucyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3dvcmtmbG93O1xuICB9XG5cbiAgcHJvdGVjdGVkIHJ1blNjaGVtYXRpYyhvcHRpb25zOiBSdW5TY2hlbWF0aWNPcHRpb25zKSB7XG4gICAgY29uc3Qge2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lLCBkZWJ1ZywgZHJ5UnVufSA9IG9wdGlvbnM7XG4gICAgbGV0IHNjaGVtYXRpY09wdGlvbnMgPSB0aGlzLnJlbW92ZUNvcmVPcHRpb25zKG9wdGlvbnMuc2NoZW1hdGljT3B0aW9ucyk7XG4gICAgbGV0IG5vdGhpbmdEb25lID0gdHJ1ZTtcbiAgICBsZXQgbG9nZ2luZ1F1ZXVlOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCBlcnJvciA9IGZhbHNlO1xuICAgIGNvbnN0IHdvcmtmbG93ID0gdGhpcy5fZ2V0V29ya2Zsb3cob3B0aW9ucyk7XG5cbiAgICBjb25zdCB3b3JraW5nRGlyID0gcHJvY2Vzcy5jd2QoKS5yZXBsYWNlKHRoaXMucHJvamVjdC5yb290LCAnJykucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGNvbnN0IHBhdGhPcHRpb25zID0gdGhpcy5zZXRQYXRoT3B0aW9ucyhzY2hlbWF0aWNPcHRpb25zLCB3b3JraW5nRGlyKTtcbiAgICBzY2hlbWF0aWNPcHRpb25zID0geyAuLi5zY2hlbWF0aWNPcHRpb25zLCAuLi5wYXRoT3B0aW9ucyB9O1xuICAgIGNvbnN0IGRlZmF1bHRPcHRpb25zID0gdGhpcy5yZWFkRGVmYXVsdHMoY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWUsIHNjaGVtYXRpY09wdGlvbnMpO1xuICAgIHNjaGVtYXRpY09wdGlvbnMgPSB7IC4uLnNjaGVtYXRpY09wdGlvbnMsIC4uLmRlZmF1bHRPcHRpb25zIH07XG5cbiAgICAvLyBQYXNzIHRoZSByZXN0IG9mIHRoZSBhcmd1bWVudHMgYXMgdGhlIHNtYXJ0IGRlZmF1bHQgXCJhcmd2XCIuIFRoZW4gZGVsZXRlIGl0LlxuICAgIC8vIFJlbW92aW5nIHRoZSBmaXJzdCBpdGVtIHdoaWNoIGlzIHRoZSBzY2hlbWF0aWMgbmFtZS5cbiAgICBjb25zdCByYXdBcmdzID0gc2NoZW1hdGljT3B0aW9ucy5fO1xuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFNtYXJ0RGVmYXVsdFByb3ZpZGVyKCdhcmd2JywgKHNjaGVtYTogSnNvbk9iamVjdCkgPT4ge1xuICAgICAgaWYgKCdpbmRleCcgaW4gc2NoZW1hKSB7XG4gICAgICAgIHJldHVybiByYXdBcmdzW051bWJlcihzY2hlbWFbJ2luZGV4J10pXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiByYXdBcmdzO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGRlbGV0ZSBzY2hlbWF0aWNPcHRpb25zLl87XG5cbiAgICB3b3JrZmxvdy5yZWdpc3RyeS5hZGRTbWFydERlZmF1bHRQcm92aWRlcigncHJvamVjdE5hbWUnLCAoX3NjaGVtYTogSnNvbk9iamVjdCkgPT4ge1xuICAgICAgaWYgKHRoaXMuX3dvcmtzcGFjZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICByZXR1cm4gdGhpcy5fd29ya3NwYWNlLmdldFByb2plY3RCeVBhdGgobm9ybWFsaXplKHByb2Nlc3MuY3dkKCkpKVxuICAgICAgICAgICAgICAgfHwgdGhpcy5fd29ya3NwYWNlLmdldERlZmF1bHRQcm9qZWN0TmFtZSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBleHBlcmltZW50YWwud29ya3NwYWNlLkFtYmlndW91c1Byb2plY3RQYXRoRXhjZXB0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgICAgVHdvIG9yIG1vcmUgcHJvamVjdHMgYXJlIHVzaW5nIGlkZW50aWNhbCByb290cy5cbiAgICAgICAgICAgICAgVW5hYmxlIHRvIGRldGVybWluZSBwcm9qZWN0IHVzaW5nIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuXG4gICAgICAgICAgICAgIFVzaW5nIGRlZmF1bHQgd29ya3NwYWNlIHByb2plY3QgaW5zdGVhZC5cbiAgICAgICAgICAgIGApO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fd29ya3NwYWNlLmdldERlZmF1bHRQcm9qZWN0TmFtZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSk7XG5cbiAgICB3b3JrZmxvdy5yZXBvcnRlci5zdWJzY3JpYmUoKGV2ZW50OiBEcnlSdW5FdmVudCkgPT4ge1xuICAgICAgbm90aGluZ0RvbmUgPSBmYWxzZTtcblxuICAgICAgLy8gU3RyaXAgbGVhZGluZyBzbGFzaCB0byBwcmV2ZW50IGNvbmZ1c2lvbi5cbiAgICAgIGNvbnN0IGV2ZW50UGF0aCA9IGV2ZW50LnBhdGguc3RhcnRzV2l0aCgnLycpID8gZXZlbnQucGF0aC5zdWJzdHIoMSkgOiBldmVudC5wYXRoO1xuXG4gICAgICBzd2l0Y2ggKGV2ZW50LmtpbmQpIHtcbiAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgIGVycm9yID0gdHJ1ZTtcbiAgICAgICAgICBjb25zdCBkZXNjID0gZXZlbnQuZGVzY3JpcHRpb24gPT0gJ2FscmVhZHlFeGlzdCcgPyAnYWxyZWFkeSBleGlzdHMnIDogJ2RvZXMgbm90IGV4aXN0Lic7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgRVJST1IhICR7ZXZlbnRQYXRofSAke2Rlc2N9LmApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5wdXNoKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgICR7dGVybWluYWwud2hpdGUoJ1VQREFURScpfSAke2V2ZW50UGF0aH0gKCR7ZXZlbnQuY29udGVudC5sZW5ndGh9IGJ5dGVzKVxuICAgICAgICAgIGApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjcmVhdGUnOlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5wdXNoKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgICR7dGVybWluYWwuZ3JlZW4oJ0NSRUFURScpfSAke2V2ZW50UGF0aH0gKCR7ZXZlbnQuY29udGVudC5sZW5ndGh9IGJ5dGVzKVxuICAgICAgICAgIGApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5wdXNoKGAke3Rlcm1pbmFsLnllbGxvdygnREVMRVRFJyl9ICR7ZXZlbnRQYXRofWApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdyZW5hbWUnOlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5wdXNoKGAke3Rlcm1pbmFsLmJsdWUoJ1JFTkFNRScpfSAke2V2ZW50UGF0aH0gPT4gJHtldmVudC50b31gKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHdvcmtmbG93LmxpZmVDeWNsZS5zdWJzY3JpYmUoZXZlbnQgPT4ge1xuICAgICAgaWYgKGV2ZW50LmtpbmQgPT0gJ2VuZCcgfHwgZXZlbnQua2luZCA9PSAncG9zdC10YXNrcy1zdGFydCcpIHtcbiAgICAgICAgaWYgKCFlcnJvcikge1xuICAgICAgICAgIC8vIE91dHB1dCB0aGUgbG9nZ2luZyBxdWV1ZSwgbm8gZXJyb3IgaGFwcGVuZWQuXG4gICAgICAgICAgbG9nZ2luZ1F1ZXVlLmZvckVhY2gobG9nID0+IHRoaXMubG9nZ2VyLmluZm8obG9nKSk7XG4gICAgICAgIH1cblxuICAgICAgICBsb2dnaW5nUXVldWUgPSBbXTtcbiAgICAgICAgZXJyb3IgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxudW1iZXIgfCB2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgd29ya2Zsb3cuZXhlY3V0ZSh7XG4gICAgICAgIGNvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICBzY2hlbWF0aWM6IHNjaGVtYXRpY05hbWUsXG4gICAgICAgIG9wdGlvbnM6IHNjaGVtYXRpY09wdGlvbnMsXG4gICAgICAgIGRlYnVnOiBkZWJ1ZyxcbiAgICAgICAgbG9nZ2VyOiB0aGlzLmxvZ2dlciBhcyBhbnksXG4gICAgICAgIGFsbG93UHJpdmF0ZTogdGhpcy5hbGxvd1ByaXZhdGVTY2hlbWF0aWNzLFxuICAgICAgfSlcbiAgICAgIC5zdWJzY3JpYmUoe1xuICAgICAgICBlcnJvcjogKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAvLyBJbiBjYXNlIHRoZSB3b3JrZmxvdyB3YXMgbm90IHN1Y2Nlc3NmdWwsIHNob3cgYW4gYXBwcm9wcmlhdGUgZXJyb3IgbWVzc2FnZS5cbiAgICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24pIHtcbiAgICAgICAgICAgIC8vIFwiU2VlIGFib3ZlXCIgYmVjYXVzZSB3ZSBhbHJlYWR5IHByaW50ZWQgdGhlIGVycm9yLlxuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoJ1RoZSBTY2hlbWF0aWMgd29ya2Zsb3cgZmFpbGVkLiBTZWUgYWJvdmUuJyk7XG4gICAgICAgICAgfSBlbHNlIGlmIChkZWJ1Zykge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYEFuIGVycm9yIG9jY3VyZWQ6XFxuJHtlcnIubWVzc2FnZX1cXG4ke2Vyci5zdGFja31gKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoZXJyLm1lc3NhZ2UpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlc29sdmUoMSk7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbXBsZXRlOiAoKSA9PiB7XG4gICAgICAgICAgY29uc3Qgc2hvd05vdGhpbmdEb25lID0gIShvcHRpb25zLnNob3dOb3RoaW5nRG9uZSA9PT0gZmFsc2UpO1xuICAgICAgICAgIGlmIChub3RoaW5nRG9uZSAmJiBzaG93Tm90aGluZ0RvbmUpIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ05vdGhpbmcgdG8gYmUgZG9uZS4nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGRyeVJ1bikge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgXFxuTk9URTogUnVuIHdpdGggXCJkcnkgcnVuXCIgbm8gY2hhbmdlcyB3ZXJlIG1hZGUuYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIHJlbW92ZUNvcmVPcHRpb25zKG9wdGlvbnM6IGFueSk6IGFueSB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpO1xuICAgIGlmICh0aGlzLl9vcmlnaW5hbE9wdGlvbnMuZmluZChvcHRpb24gPT4gb3B0aW9uLm5hbWUgPT0gJ2RyeVJ1bicpKSB7XG4gICAgICBkZWxldGUgb3B0cy5kcnlSdW47XG4gICAgfVxuICAgIGlmICh0aGlzLl9vcmlnaW5hbE9wdGlvbnMuZmluZChvcHRpb24gPT4gb3B0aW9uLm5hbWUgPT0gJ2ZvcmNlJykpIHtcbiAgICAgIGRlbGV0ZSBvcHRzLmZvcmNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5fb3JpZ2luYWxPcHRpb25zLmZpbmQob3B0aW9uID0+IG9wdGlvbi5uYW1lID09ICdkZWJ1ZycpKSB7XG4gICAgICBkZWxldGUgb3B0cy5kZWJ1ZztcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0cztcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXRPcHRpb25zKG9wdGlvbnM6IEdldE9wdGlvbnNPcHRpb25zKTogUHJvbWlzZTxHZXRPcHRpb25zUmVzdWx0PiB7XG4gICAgLy8gTWFrZSBhIGNvcHkuXG4gICAgdGhpcy5fb3JpZ2luYWxPcHRpb25zID0gWy4uLnRoaXMub3B0aW9uc107XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IG9wdGlvbnMuY29sbGVjdGlvbk5hbWUgfHwgZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKTtcblxuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB0aGlzLmdldENvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuXG4gICAgY29uc3Qgc2NoZW1hdGljID0gdGhpcy5nZXRTY2hlbWF0aWMoY29sbGVjdGlvbiwgb3B0aW9ucy5zY2hlbWF0aWNOYW1lLFxuICAgICAgdGhpcy5hbGxvd1ByaXZhdGVTY2hlbWF0aWNzKTtcbiAgICB0aGlzLl9kZUFsaWFzZWROYW1lID0gc2NoZW1hdGljLmRlc2NyaXB0aW9uLm5hbWU7XG5cbiAgICBpZiAoIXNjaGVtYXRpYy5kZXNjcmlwdGlvbi5zY2hlbWFKc29uKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcbiAgICAgICAgb3B0aW9uczogW10sXG4gICAgICAgIGFyZ3VtZW50czogW10sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9wZXJ0aWVzID0gc2NoZW1hdGljLmRlc2NyaXB0aW9uLnNjaGVtYUpzb24ucHJvcGVydGllcztcbiAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyk7XG4gICAgY29uc3QgYXZhaWxhYmxlT3B0aW9ucyA9IGtleXNcbiAgICAgIC5tYXAoa2V5ID0+ICh7IC4uLnByb3BlcnRpZXNba2V5XSwgLi4ueyBuYW1lOiBzdHJpbmdzLmRhc2hlcml6ZShrZXkpIH0gfSkpXG4gICAgICAubWFwKG9wdCA9PiB7XG4gICAgICAgIGxldCB0eXBlO1xuICAgICAgICBjb25zdCBzY2hlbWF0aWNUeXBlID0gb3B0LnR5cGU7XG4gICAgICAgIHN3aXRjaCAob3B0LnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgdHlwZSA9IFN0cmluZztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgdHlwZSA9IEJvb2xlYW47XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgdHlwZSA9IE51bWJlcjtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgLy8gSWdub3JlIGFycmF5cyAvIG9iamVjdHMuXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGxldCBhbGlhc2VzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBpZiAob3B0LmFsaWFzKSB7XG4gICAgICAgICAgYWxpYXNlcyA9IFsuLi5hbGlhc2VzLCBvcHQuYWxpYXNdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHQuYWxpYXNlcykge1xuICAgICAgICAgIGFsaWFzZXMgPSBbLi4uYWxpYXNlcywgLi4ub3B0LmFsaWFzZXNdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNjaGVtYXRpY0RlZmF1bHQgPSBvcHQuZGVmYXVsdDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLm9wdCxcbiAgICAgICAgICBhbGlhc2VzLFxuICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgc2NoZW1hdGljVHlwZSxcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsIC8vIGRvIG5vdCBjYXJyeSBvdmVyIHNjaGVtYXRpY3MgZGVmYXVsdHNcbiAgICAgICAgICBzY2hlbWF0aWNEZWZhdWx0LFxuICAgICAgICAgIGhpZGRlbjogb3B0LnZpc2libGUgPT09IGZhbHNlLFxuICAgICAgICB9O1xuICAgICAgfSlcbiAgICAgIC5maWx0ZXIoeCA9PiB4KTtcblxuICAgIGNvbnN0IHNjaGVtYXRpY09wdGlvbnMgPSBhdmFpbGFibGVPcHRpb25zXG4gICAgICAuZmlsdGVyKG9wdCA9PiBvcHQuJGRlZmF1bHQgPT09IHVuZGVmaW5lZCB8fCBvcHQuJGRlZmF1bHQuJHNvdXJjZSAhPT0gJ2FyZ3YnKTtcblxuICAgIGNvbnN0IHNjaGVtYXRpY0FyZ3VtZW50cyA9IGF2YWlsYWJsZU9wdGlvbnNcbiAgICAgIC5maWx0ZXIob3B0ID0+IG9wdC4kZGVmYXVsdCAhPT0gdW5kZWZpbmVkICYmIG9wdC4kZGVmYXVsdC4kc291cmNlID09PSAnYXJndicpXG4gICAgICAuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICBpZiAoYS4kZGVmYXVsdC5pbmRleCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGIuJGRlZmF1bHQuaW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYS4kZGVmYXVsdC5pbmRleCA9PSBiLiRkZWZhdWx0LmluZGV4KSB7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0gZWxzZSBpZiAoYS4kZGVmYXVsdC5pbmRleCA+IGIuJGRlZmF1bHQuaW5kZXgpIHtcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XG4gICAgICBvcHRpb25zOiBzY2hlbWF0aWNPcHRpb25zLFxuICAgICAgYXJndW1lbnRzOiBzY2hlbWF0aWNBcmd1bWVudHMsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9sb2FkV29ya3NwYWNlKCkge1xuICAgIGlmICh0aGlzLl93b3Jrc3BhY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgd29ya3NwYWNlTG9hZGVyID0gbmV3IFdvcmtzcGFjZUxvYWRlcih0aGlzLl9ob3N0KTtcblxuICAgIHRyeSB7XG4gICAgICB3b3Jrc3BhY2VMb2FkZXIubG9hZFdvcmtzcGFjZSh0aGlzLnByb2plY3Qucm9vdCkucGlwZSh0YWtlKDEpKVxuICAgICAgICAuc3Vic2NyaWJlKFxuICAgICAgICAgICh3b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlKSA9PiB0aGlzLl93b3Jrc3BhY2UgPSB3b3Jrc3BhY2UsXG4gICAgICAgICAgKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5hbGxvd01pc3NpbmdXb3Jrc3BhY2UpIHtcbiAgICAgICAgICAgICAgLy8gSWdub3JlIG1pc3Npbmcgd29ya3NwYWNlXG4gICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICApO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKCF0aGlzLmFsbG93TWlzc2luZ1dvcmtzcGFjZSkge1xuICAgICAgICAvLyBJZ25vcmUgbWlzc2luZyB3b3Jrc3BhY2VcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2NsZWFuRGVmYXVsdHM8VCwgSyBleHRlbmRzIGtleW9mIFQ+KGRlZmF1bHRzOiBULCB1bmRlZmluZWRPcHRpb25zOiBzdHJpbmdbXSk6IFQge1xuICAgIChPYmplY3Qua2V5cyhkZWZhdWx0cykgYXMgS1tdKVxuICAgICAgLmZpbHRlcihrZXkgPT4gIXVuZGVmaW5lZE9wdGlvbnMubWFwKHN0cmluZ3MuY2FtZWxpemUpLmluY2x1ZGVzKGtleSBhcyBzdHJpbmcpKVxuICAgICAgLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgZGVsZXRlIGRlZmF1bHRzW2tleV07XG4gICAgICB9KTtcblxuICAgIHJldHVybiBkZWZhdWx0cztcbiAgfVxuXG4gIHByaXZhdGUgcmVhZERlZmF1bHRzKGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcsIHNjaGVtYXRpY05hbWU6IHN0cmluZywgb3B0aW9uczogYW55KToge30ge1xuICAgIGlmICh0aGlzLl9kZUFsaWFzZWROYW1lKSB7XG4gICAgICBzY2hlbWF0aWNOYW1lID0gdGhpcy5fZGVBbGlhc2VkTmFtZTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0TmFtZSA9IG9wdGlvbnMucHJvamVjdDtcbiAgICBjb25zdCBkZWZhdWx0cyA9IGdldFNjaGVtYXRpY0RlZmF1bHRzKGNvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lLCBwcm9qZWN0TmFtZSk7XG5cbiAgICAvLyBHZXQgbGlzdCBvZiBhbGwgdW5kZWZpbmVkIG9wdGlvbnMuXG4gICAgY29uc3QgdW5kZWZpbmVkT3B0aW9ucyA9IHRoaXMub3B0aW9uc1xuICAgICAgLmZpbHRlcihvID0+IG9wdGlvbnNbby5uYW1lXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICAvLyBEZWxldGUgYW55IGRlZmF1bHQgdGhhdCBpcyBub3QgdW5kZWZpbmVkLlxuICAgIHRoaXMuX2NsZWFuRGVmYXVsdHMoZGVmYXVsdHMsIHVuZGVmaW5lZE9wdGlvbnMpO1xuXG4gICAgcmV0dXJuIGRlZmF1bHRzO1xuICB9XG59XG4iXX0=