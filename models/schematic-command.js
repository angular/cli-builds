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
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const command_1 = require("./command");
const tools_1 = require("@angular-devkit/schematics/tools");
const schematics_1 = require("@angular-devkit/schematics");
const config_1 = require("../utilities/config");
const schematics_2 = require("../utilities/schematics");
const operators_1 = require("rxjs/operators");
const workspace_loader_1 = require("../models/workspace-loader");
class SchematicCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.options = [];
        this.allowPrivateSchematics = false;
        this._host = new node_1.NodeJsSyncHost();
        this.argStrategy = command_1.ArgumentStrategy.Nothing;
        this.coreOptions = [
            {
                name: 'dry-run',
                type: Boolean,
                default: false,
                aliases: ['d'],
                description: 'Run through without making any changes.'
            },
            {
                name: 'force',
                type: Boolean,
                default: false,
                aliases: ['f'],
                description: 'Forces overwriting of files.'
            }
        ];
        this.arguments = ['project'];
    }
    initialize(_options) {
        return __awaiter(this, void 0, void 0, function* () {
            this._loadWorkspace();
        });
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
    runSchematic(options) {
        const { collectionName, schematicName, debug, force, dryRun } = options;
        let schematicOptions = this.removeCoreOptions(options.schematicOptions);
        let nothingDone = true;
        const loggingQueue = [];
        const fsHost = new core_1.virtualFs.ScopedHost(new node_1.NodeJsSyncHost(), core_1.normalize(this.project.root));
        const workflow = new tools_1.NodeWorkflow(fsHost, {
            force,
            dryRun,
            packageManager: config_1.getPackageManager(),
            root: this.project.root,
        });
        const cwd = process.env.PWD;
        const workingDir = cwd.replace(this.project.root, '').replace(/\\/g, '/');
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
        workflow.reporter.subscribe((event) => {
            nothingDone = false;
            // Strip leading slash to prevent confusion.
            const eventPath = event.path.startsWith('/') ? event.path.substr(1) : event.path;
            switch (event.kind) {
                case 'error':
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
        return new Promise((resolve, reject) => {
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
                    reject(1);
                },
                complete: () => {
                    // Output the logging queue, no error happened.
                    loggingQueue.forEach(log => this.logger.info(log));
                    if (nothingDone) {
                        this.logger.info('Nothing to be done.');
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
        // TODO: get default collectionName
        const collectionName = options.collectionName || '@schematics/angular';
        const collection = schematics_2.getCollection(collectionName);
        const schematic = schematics_2.getSchematic(collection, options.schematicName);
        this._deAliasedName = schematic.description.name;
        if (!schematic.description.schemaJson) {
            return Promise.resolve({
                options: [],
                arguments: []
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
            arguments: schematicArguments
        });
    }
    _loadWorkspace() {
        if (this._workspace) {
            return;
        }
        const workspaceLoader = new workspace_loader_1.WorkspaceLoader(this._host);
        try {
            workspaceLoader.loadWorkspace().pipe(operators_1.take(1))
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
    readDefaults(collectionName, schematicName, options) {
        let defaults = {};
        if (!this._workspace) {
            return {};
        }
        if (this._deAliasedName) {
            schematicName = this._deAliasedName;
        }
        // read and set workspace defaults
        const wsSchematics = this._workspace.getSchematics();
        if (wsSchematics) {
            let key = collectionName;
            if (wsSchematics[key] && typeof wsSchematics[key] === 'object') {
                defaults = Object.assign({}, defaults, wsSchematics[key]);
            }
            key = collectionName + ':' + schematicName;
            if (wsSchematics[key] && typeof wsSchematics[key] === 'object') {
                defaults = Object.assign({}, defaults, wsSchematics[key]);
            }
        }
        // read and set project defaults
        let projectName = options.project;
        if (!projectName) {
            projectName = this._workspace.listProjectNames()[0];
        }
        if (projectName) {
            const prjSchematics = this._workspace.getProjectSchematics(projectName);
            if (prjSchematics) {
                let key = collectionName;
                if (prjSchematics[key] && typeof prjSchematics[key] === 'object') {
                    defaults = Object.assign({}, defaults, prjSchematics[key]);
                }
                key = collectionName + ':' + schematicName;
                if (prjSchematics[key] && typeof prjSchematics[key] === 'object') {
                    defaults = Object.assign({}, defaults, prjSchematics[key]);
                }
            }
        }
        // Get list of all undefined options.
        const undefinedOptions = this.options
            .filter(o => options[o.name] === undefined)
            .map(o => o.name);
        // Delete any default that is not undefined.
        Object.keys(defaults)
            .filter(key => !undefinedOptions.indexOf(key))
            .forEach(key => {
            delete defaults[key];
        });
        return defaults;
    }
}
exports.SchematicCommand = SchematicCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/models/schematic-command.js.map