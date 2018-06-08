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
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const schematics_1 = require("@angular-devkit/schematics");
const tools_1 = require("@angular-devkit/schematics/tools");
const operators_1 = require("rxjs/operators");
const workspace_loader_1 = require("../models/workspace-loader");
const config_1 = require("../utilities/config");
const config_2 = require("../utilities/config");
const schematics_2 = require("../utilities/schematics");
const command_1 = require("./command");
class SchematicCommand extends command_1.Command {
    constructor() {
        super(...arguments);
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
        let loggingQueue = [];
        let error = false;
        const fsHost = new core_1.virtualFs.ScopedHost(new node_1.NodeJsSyncHost(), core_1.normalize(this.project.root));
        const workflow = new tools_1.NodeWorkflow(fsHost, {
            force,
            dryRun,
            packageManager: config_1.getPackageManager(),
            root: this.project.root,
        });
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
                return this._workspace.getProjectByPath(core_1.normalize(process.cwd()))
                    || this._workspace.getDefaultProjectName();
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
        const collection = schematics_2.getCollection(collectionName);
        const schematic = schematics_2.getSchematic(collection, options.schematicName, this.allowPrivateSchematics);
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
        const defaults = config_2.getSchematicDefaults(collectionName, schematicName, projectName);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBSUgsK0NBQXFGO0FBQ3JGLG9EQUEyRDtBQUMzRCwyREFBd0Y7QUFDeEYsNERBQWdFO0FBQ2hFLDhDQUFzQztBQUN0QyxpRUFBNkQ7QUFDN0QsZ0RBQXVGO0FBQ3ZGLGdEQUEyRDtBQUMzRCx3REFBc0U7QUFDdEUsdUNBQThEO0FBMkI5RCxzQkFBdUMsU0FBUSxpQkFBTztJQUF0RDs7UUFDVyxZQUFPLEdBQWEsRUFBRSxDQUFDO1FBQ3ZCLDJCQUFzQixHQUFZLEtBQUssQ0FBQztRQUN6QyxVQUFLLEdBQUcsSUFBSSxxQkFBYyxFQUFFLENBQUM7UUFJckMsZ0JBQVcsR0FBRywwQkFBZ0IsQ0FBQyxPQUFPLENBQUM7UUFFcEIsZ0JBQVcsR0FBYTtZQUN6QztnQkFDRSxJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsT0FBTztnQkFDYixPQUFPLEVBQUUsS0FBSztnQkFDZCxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUM7Z0JBQ2QsV0FBVyxFQUFFLHlDQUF5QzthQUN2RDtZQUNEO2dCQUNFLElBQUksRUFBRSxPQUFPO2dCQUNiLElBQUksRUFBRSxPQUFPO2dCQUNiLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQztnQkFDZCxXQUFXLEVBQUUsOEJBQThCO2FBQzVDO1NBQUMsQ0FBQztRQUVJLGNBQVMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBK1NuQyxDQUFDO0lBN1NjLFVBQVUsQ0FBQyxRQUFhOztZQUNuQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDeEIsQ0FBQztLQUFBO0lBRVMsY0FBYyxDQUFDLE9BQVksRUFBRSxVQUFrQjtRQUN2RCxF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QztJQUVPLFlBQVksQ0FBQyxjQUFzQixFQUFFLGFBQXFCLEVBQUUsT0FBWTtRQUM5RSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUN4QixhQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUN0QyxDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztRQUNwQyxNQUFNLFFBQVEsR0FBRyw2QkFBb0IsQ0FBQyxjQUFjLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRWxGLHFDQUFxQztRQUNyQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxPQUFPO2FBQ2xDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssU0FBUyxDQUFDO2FBQzFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVwQiw0Q0FBNEM7UUFDNUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUVoRCxNQUFNLENBQUMsUUFBUSxDQUFDO0lBQ2xCLENBQUM7Q0FDRjtBQXhVRCw0Q0F3VUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIHRzbGludDpkaXNhYmxlOm5vLWdsb2JhbC10c2xpbnQtZGlzYWJsZSBuby1hbnlcbmltcG9ydCB7IEpzb25PYmplY3QsIGV4cGVyaW1lbnRhbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IG5vcm1hbGl6ZSwgc3RyaW5ncywgdGFncywgdGVybWluYWwsIHZpcnR1YWxGcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE5vZGVKc1N5bmNIb3N0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQgeyBEcnlSdW5FdmVudCwgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlV29ya2Zsb3cgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgeyB0YWtlIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgV29ya3NwYWNlTG9hZGVyIH0gZnJvbSAnLi4vbW9kZWxzL3dvcmtzcGFjZS1sb2FkZXInO1xuaW1wb3J0IHsgZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24sIGdldFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBnZXRTY2hlbWF0aWNEZWZhdWx0cyB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgZ2V0Q29sbGVjdGlvbiwgZ2V0U2NoZW1hdGljIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgQXJndW1lbnRTdHJhdGVneSwgQ29tbWFuZCwgT3B0aW9uIH0gZnJvbSAnLi9jb21tYW5kJztcblxuZXhwb3J0IGludGVyZmFjZSBDb3JlU2NoZW1hdGljT3B0aW9ucyB7XG4gIGRyeVJ1bjogYm9vbGVhbjtcbiAgZm9yY2U6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuU2NoZW1hdGljT3B0aW9ucyB7XG4gIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmc7XG4gIHNjaGVtYXRpY05hbWU6IHN0cmluZztcbiAgc2NoZW1hdGljT3B0aW9uczogYW55O1xuICBkZWJ1Zz86IGJvb2xlYW47XG4gIGRyeVJ1bjogYm9vbGVhbjtcbiAgZm9yY2U6IGJvb2xlYW47XG4gIHNob3dOb3RoaW5nRG9uZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2V0T3B0aW9uc09wdGlvbnMge1xuICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICBzY2hlbWF0aWNOYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2V0T3B0aW9uc1Jlc3VsdCB7XG4gIG9wdGlvbnM6IE9wdGlvbltdO1xuICBhcmd1bWVudHM6IE9wdGlvbltdO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgU2NoZW1hdGljQ29tbWFuZCBleHRlbmRzIENvbW1hbmQge1xuICByZWFkb25seSBvcHRpb25zOiBPcHRpb25bXSA9IFtdO1xuICByZWFkb25seSBhbGxvd1ByaXZhdGVTY2hlbWF0aWNzOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgX2hvc3QgPSBuZXcgTm9kZUpzU3luY0hvc3QoKTtcbiAgcHJpdmF0ZSBfd29ya3NwYWNlOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZTtcbiAgcHJpdmF0ZSBfZGVBbGlhc2VkTmFtZTogc3RyaW5nO1xuICBwcml2YXRlIF9vcmlnaW5hbE9wdGlvbnM6IE9wdGlvbltdO1xuICBhcmdTdHJhdGVneSA9IEFyZ3VtZW50U3RyYXRlZ3kuTm90aGluZztcblxuICBwcm90ZWN0ZWQgcmVhZG9ubHkgY29yZU9wdGlvbnM6IE9wdGlvbltdID0gW1xuICAgIHtcbiAgICAgIG5hbWU6ICdkcnlSdW4nLFxuICAgICAgdHlwZTogQm9vbGVhbixcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgYWxpYXNlczogWydkJ10sXG4gICAgICBkZXNjcmlwdGlvbjogJ1J1biB0aHJvdWdoIHdpdGhvdXQgbWFraW5nIGFueSBjaGFuZ2VzLicsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiAnZm9yY2UnLFxuICAgICAgdHlwZTogQm9vbGVhbixcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgYWxpYXNlczogWydmJ10sXG4gICAgICBkZXNjcmlwdGlvbjogJ0ZvcmNlcyBvdmVyd3JpdGluZyBvZiBmaWxlcy4nLFxuICAgIH1dO1xuXG4gIHJlYWRvbmx5IGFyZ3VtZW50cyA9IFsncHJvamVjdCddO1xuXG4gIHB1YmxpYyBhc3luYyBpbml0aWFsaXplKF9vcHRpb25zOiBhbnkpIHtcbiAgICB0aGlzLl9sb2FkV29ya3NwYWNlKCk7XG4gIH1cblxuICBwcm90ZWN0ZWQgc2V0UGF0aE9wdGlvbnMob3B0aW9uczogYW55LCB3b3JraW5nRGlyOiBzdHJpbmcpOiBhbnkge1xuICAgIGlmICh3b3JraW5nRGlyID09PSAnJykge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm9wdGlvbnNcbiAgICAgIC5maWx0ZXIobyA9PiBvLmZvcm1hdCA9PT0gJ3BhdGgnKVxuICAgICAgLm1hcChvID0+IG8ubmFtZSlcbiAgICAgIC5maWx0ZXIobmFtZSA9PiBvcHRpb25zW25hbWVdID09PSB1bmRlZmluZWQpXG4gICAgICAucmVkdWNlKChhY2M6IGFueSwgY3VycikgPT4ge1xuICAgICAgICBhY2NbY3Vycl0gPSB3b3JraW5nRGlyO1xuXG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgICB9LCB7fSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgcnVuU2NoZW1hdGljKG9wdGlvbnM6IFJ1blNjaGVtYXRpY09wdGlvbnMpIHtcbiAgICBjb25zdCB7IGNvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lLCBkZWJ1ZywgZm9yY2UsIGRyeVJ1biB9ID0gb3B0aW9ucztcbiAgICBsZXQgc2NoZW1hdGljT3B0aW9ucyA9IHRoaXMucmVtb3ZlQ29yZU9wdGlvbnMob3B0aW9ucy5zY2hlbWF0aWNPcHRpb25zKTtcbiAgICBsZXQgbm90aGluZ0RvbmUgPSB0cnVlO1xuICAgIGxldCBsb2dnaW5nUXVldWU6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IGVycm9yID0gZmFsc2U7XG4gICAgY29uc3QgZnNIb3N0ID0gbmV3IHZpcnR1YWxGcy5TY29wZWRIb3N0KG5ldyBOb2RlSnNTeW5jSG9zdCgpLCBub3JtYWxpemUodGhpcy5wcm9qZWN0LnJvb3QpKTtcbiAgICBjb25zdCB3b3JrZmxvdyA9IG5ldyBOb2RlV29ya2Zsb3coXG4gICAgICBmc0hvc3QgYXMgYW55LFxuICAgICAge1xuICAgICAgICBmb3JjZSxcbiAgICAgICAgZHJ5UnVuLFxuICAgICAgICBwYWNrYWdlTWFuYWdlcjogZ2V0UGFja2FnZU1hbmFnZXIoKSxcbiAgICAgICAgcm9vdDogdGhpcy5wcm9qZWN0LnJvb3QsXG4gICAgICAgfSxcbiAgICApO1xuXG4gICAgY29uc3Qgd29ya2luZ0RpciA9IHByb2Nlc3MuY3dkKCkucmVwbGFjZSh0aGlzLnByb2plY3Qucm9vdCwgJycpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBjb25zdCBwYXRoT3B0aW9ucyA9IHRoaXMuc2V0UGF0aE9wdGlvbnMoc2NoZW1hdGljT3B0aW9ucywgd29ya2luZ0Rpcik7XG4gICAgc2NoZW1hdGljT3B0aW9ucyA9IHsgLi4uc2NoZW1hdGljT3B0aW9ucywgLi4ucGF0aE9wdGlvbnMgfTtcbiAgICBjb25zdCBkZWZhdWx0T3B0aW9ucyA9IHRoaXMucmVhZERlZmF1bHRzKGNvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lLCBzY2hlbWF0aWNPcHRpb25zKTtcbiAgICBzY2hlbWF0aWNPcHRpb25zID0geyAuLi5zY2hlbWF0aWNPcHRpb25zLCAuLi5kZWZhdWx0T3B0aW9ucyB9O1xuXG4gICAgLy8gUGFzcyB0aGUgcmVzdCBvZiB0aGUgYXJndW1lbnRzIGFzIHRoZSBzbWFydCBkZWZhdWx0IFwiYXJndlwiLiBUaGVuIGRlbGV0ZSBpdC5cbiAgICAvLyBSZW1vdmluZyB0aGUgZmlyc3QgaXRlbSB3aGljaCBpcyB0aGUgc2NoZW1hdGljIG5hbWUuXG4gICAgY29uc3QgcmF3QXJncyA9IHNjaGVtYXRpY09wdGlvbnMuXztcbiAgICB3b3JrZmxvdy5yZWdpc3RyeS5hZGRTbWFydERlZmF1bHRQcm92aWRlcignYXJndicsIChzY2hlbWE6IEpzb25PYmplY3QpID0+IHtcbiAgICAgIGlmICgnaW5kZXgnIGluIHNjaGVtYSkge1xuICAgICAgICByZXR1cm4gcmF3QXJnc1tOdW1iZXIoc2NoZW1hWydpbmRleCddKV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcmF3QXJncztcbiAgICAgIH1cbiAgICB9KTtcbiAgICBkZWxldGUgc2NoZW1hdGljT3B0aW9ucy5fO1xuXG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ3Byb2plY3ROYW1lJywgKF9zY2hlbWE6IEpzb25PYmplY3QpID0+IHtcbiAgICAgIGlmICh0aGlzLl93b3Jrc3BhY2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dvcmtzcGFjZS5nZXRQcm9qZWN0QnlQYXRoKG5vcm1hbGl6ZShwcm9jZXNzLmN3ZCgpKSlcbiAgICAgICAgICAgICAgIHx8IHRoaXMuX3dvcmtzcGFjZS5nZXREZWZhdWx0UHJvamVjdE5hbWUoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9KTtcblxuICAgIHdvcmtmbG93LnJlcG9ydGVyLnN1YnNjcmliZSgoZXZlbnQ6IERyeVJ1bkV2ZW50KSA9PiB7XG4gICAgICBub3RoaW5nRG9uZSA9IGZhbHNlO1xuXG4gICAgICAvLyBTdHJpcCBsZWFkaW5nIHNsYXNoIHRvIHByZXZlbnQgY29uZnVzaW9uLlxuICAgICAgY29uc3QgZXZlbnRQYXRoID0gZXZlbnQucGF0aC5zdGFydHNXaXRoKCcvJykgPyBldmVudC5wYXRoLnN1YnN0cigxKSA6IGV2ZW50LnBhdGg7XG5cbiAgICAgIHN3aXRjaCAoZXZlbnQua2luZCkge1xuICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgZXJyb3IgPSB0cnVlO1xuICAgICAgICAgIGNvbnN0IGRlc2MgPSBldmVudC5kZXNjcmlwdGlvbiA9PSAnYWxyZWFkeUV4aXN0JyA/ICdhbHJlYWR5IGV4aXN0cycgOiAnZG9lcyBub3QgZXhpc3QuJztcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBFUlJPUiEgJHtldmVudFBhdGh9ICR7ZGVzY30uYCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3VwZGF0ZSc6XG4gICAgICAgICAgbG9nZ2luZ1F1ZXVlLnB1c2godGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgJHt0ZXJtaW5hbC53aGl0ZSgnVVBEQVRFJyl9ICR7ZXZlbnRQYXRofSAoJHtldmVudC5jb250ZW50Lmxlbmd0aH0gYnl0ZXMpXG4gICAgICAgICAgYCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgICAgbG9nZ2luZ1F1ZXVlLnB1c2godGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgJHt0ZXJtaW5hbC5ncmVlbignQ1JFQVRFJyl9ICR7ZXZlbnRQYXRofSAoJHtldmVudC5jb250ZW50Lmxlbmd0aH0gYnl0ZXMpXG4gICAgICAgICAgYCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2RlbGV0ZSc6XG4gICAgICAgICAgbG9nZ2luZ1F1ZXVlLnB1c2goYCR7dGVybWluYWwueWVsbG93KCdERUxFVEUnKX0gJHtldmVudFBhdGh9YCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3JlbmFtZSc6XG4gICAgICAgICAgbG9nZ2luZ1F1ZXVlLnB1c2goYCR7dGVybWluYWwuYmx1ZSgnUkVOQU1FJyl9ICR7ZXZlbnRQYXRofSA9PiAke2V2ZW50LnRvfWApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgd29ya2Zsb3cubGlmZUN5Y2xlLnN1YnNjcmliZShldmVudCA9PiB7XG4gICAgICBpZiAoZXZlbnQua2luZCA9PSAnZW5kJyB8fCBldmVudC5raW5kID09ICdwb3N0LXRhc2tzLXN0YXJ0Jykge1xuICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgLy8gT3V0cHV0IHRoZSBsb2dnaW5nIHF1ZXVlLCBubyBlcnJvciBoYXBwZW5lZC5cbiAgICAgICAgICBsb2dnaW5nUXVldWUuZm9yRWFjaChsb2cgPT4gdGhpcy5sb2dnZXIuaW5mbyhsb2cpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvZ2dpbmdRdWV1ZSA9IFtdO1xuICAgICAgICBlcnJvciA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPG51bWJlciB8IHZvaWQ+KChyZXNvbHZlKSA9PiB7XG4gICAgICB3b3JrZmxvdy5leGVjdXRlKHtcbiAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIHNjaGVtYXRpYzogc2NoZW1hdGljTmFtZSxcbiAgICAgICAgb3B0aW9uczogc2NoZW1hdGljT3B0aW9ucyxcbiAgICAgICAgZGVidWc6IGRlYnVnLFxuICAgICAgICBsb2dnZXI6IHRoaXMubG9nZ2VyIGFzIGFueSxcbiAgICAgICAgYWxsb3dQcml2YXRlOiB0aGlzLmFsbG93UHJpdmF0ZVNjaGVtYXRpY3MsXG4gICAgICB9KVxuICAgICAgLnN1YnNjcmliZSh7XG4gICAgICAgIGVycm9yOiAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgIC8vIEluIGNhc2UgdGhlIHdvcmtmbG93IHdhcyBub3Qgc3VjY2Vzc2Z1bCwgc2hvdyBhbiBhcHByb3ByaWF0ZSBlcnJvciBtZXNzYWdlLlxuICAgICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbikge1xuICAgICAgICAgICAgLy8gXCJTZWUgYWJvdmVcIiBiZWNhdXNlIHdlIGFscmVhZHkgcHJpbnRlZCB0aGUgZXJyb3IuXG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbCgnVGhlIFNjaGVtYXRpYyB3b3JrZmxvdyBmYWlsZWQuIFNlZSBhYm92ZS4nKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGRlYnVnKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChgQW4gZXJyb3Igb2NjdXJlZDpcXG4ke2Vyci5tZXNzYWdlfVxcbiR7ZXJyLnN0YWNrfWApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChlcnIubWVzc2FnZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmVzb2x2ZSgxKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29tcGxldGU6ICgpID0+IHtcbiAgICAgICAgICBjb25zdCBzaG93Tm90aGluZ0RvbmUgPSAhKG9wdGlvbnMuc2hvd05vdGhpbmdEb25lID09PSBmYWxzZSk7XG4gICAgICAgICAgaWYgKG5vdGhpbmdEb25lICYmIHNob3dOb3RoaW5nRG9uZSkge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIuaW5mbygnTm90aGluZyB0byBiZSBkb25lLicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZHJ5UnVuKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBcXG5OT1RFOiBSdW4gd2l0aCBcImRyeSBydW5cIiBubyBjaGFuZ2VzIHdlcmUgbWFkZS5gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVtb3ZlQ29yZU9wdGlvbnMob3B0aW9uczogYW55KTogYW55IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyk7XG4gICAgaWYgKHRoaXMuX29yaWdpbmFsT3B0aW9ucy5maW5kKG9wdGlvbiA9PiBvcHRpb24ubmFtZSA9PSAnZHJ5UnVuJykpIHtcbiAgICAgIGRlbGV0ZSBvcHRzLmRyeVJ1bjtcbiAgICB9XG4gICAgaWYgKHRoaXMuX29yaWdpbmFsT3B0aW9ucy5maW5kKG9wdGlvbiA9PiBvcHRpb24ubmFtZSA9PSAnZm9yY2UnKSkge1xuICAgICAgZGVsZXRlIG9wdHMuZm9yY2U7XG4gICAgfVxuICAgIGlmICh0aGlzLl9vcmlnaW5hbE9wdGlvbnMuZmluZChvcHRpb24gPT4gb3B0aW9uLm5hbWUgPT0gJ2RlYnVnJykpIHtcbiAgICAgIGRlbGV0ZSBvcHRzLmRlYnVnO1xuICAgIH1cblxuICAgIHJldHVybiBvcHRzO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldE9wdGlvbnMob3B0aW9uczogR2V0T3B0aW9uc09wdGlvbnMpOiBQcm9taXNlPEdldE9wdGlvbnNSZXN1bHQ+IHtcbiAgICAvLyBNYWtlIGEgY29weS5cbiAgICB0aGlzLl9vcmlnaW5hbE9wdGlvbnMgPSBbLi4udGhpcy5vcHRpb25zXTtcblxuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gb3B0aW9ucy5jb2xsZWN0aW9uTmFtZSB8fCBnZXREZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbigpO1xuXG4gICAgY29uc3QgY29sbGVjdGlvbiA9IGdldENvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuXG4gICAgY29uc3Qgc2NoZW1hdGljID0gZ2V0U2NoZW1hdGljKGNvbGxlY3Rpb24sIG9wdGlvbnMuc2NoZW1hdGljTmFtZSwgdGhpcy5hbGxvd1ByaXZhdGVTY2hlbWF0aWNzKTtcbiAgICB0aGlzLl9kZUFsaWFzZWROYW1lID0gc2NoZW1hdGljLmRlc2NyaXB0aW9uLm5hbWU7XG5cbiAgICBpZiAoIXNjaGVtYXRpYy5kZXNjcmlwdGlvbi5zY2hlbWFKc29uKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcbiAgICAgICAgb3B0aW9uczogW10sXG4gICAgICAgIGFyZ3VtZW50czogW10sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9wZXJ0aWVzID0gc2NoZW1hdGljLmRlc2NyaXB0aW9uLnNjaGVtYUpzb24ucHJvcGVydGllcztcbiAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyk7XG4gICAgY29uc3QgYXZhaWxhYmxlT3B0aW9ucyA9IGtleXNcbiAgICAgIC5tYXAoa2V5ID0+ICh7IC4uLnByb3BlcnRpZXNba2V5XSwgLi4ueyBuYW1lOiBzdHJpbmdzLmRhc2hlcml6ZShrZXkpIH0gfSkpXG4gICAgICAubWFwKG9wdCA9PiB7XG4gICAgICAgIGxldCB0eXBlO1xuICAgICAgICBjb25zdCBzY2hlbWF0aWNUeXBlID0gb3B0LnR5cGU7XG4gICAgICAgIHN3aXRjaCAob3B0LnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgdHlwZSA9IFN0cmluZztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgdHlwZSA9IEJvb2xlYW47XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgdHlwZSA9IE51bWJlcjtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgLy8gSWdub3JlIGFycmF5cyAvIG9iamVjdHMuXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGxldCBhbGlhc2VzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBpZiAob3B0LmFsaWFzKSB7XG4gICAgICAgICAgYWxpYXNlcyA9IFsuLi5hbGlhc2VzLCBvcHQuYWxpYXNdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHQuYWxpYXNlcykge1xuICAgICAgICAgIGFsaWFzZXMgPSBbLi4uYWxpYXNlcywgLi4ub3B0LmFsaWFzZXNdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNjaGVtYXRpY0RlZmF1bHQgPSBvcHQuZGVmYXVsdDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLm9wdCxcbiAgICAgICAgICBhbGlhc2VzLFxuICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgc2NoZW1hdGljVHlwZSxcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsIC8vIGRvIG5vdCBjYXJyeSBvdmVyIHNjaGVtYXRpY3MgZGVmYXVsdHNcbiAgICAgICAgICBzY2hlbWF0aWNEZWZhdWx0LFxuICAgICAgICAgIGhpZGRlbjogb3B0LnZpc2libGUgPT09IGZhbHNlLFxuICAgICAgICB9O1xuICAgICAgfSlcbiAgICAgIC5maWx0ZXIoeCA9PiB4KTtcblxuICAgIGNvbnN0IHNjaGVtYXRpY09wdGlvbnMgPSBhdmFpbGFibGVPcHRpb25zXG4gICAgICAuZmlsdGVyKG9wdCA9PiBvcHQuJGRlZmF1bHQgPT09IHVuZGVmaW5lZCB8fCBvcHQuJGRlZmF1bHQuJHNvdXJjZSAhPT0gJ2FyZ3YnKTtcblxuICAgIGNvbnN0IHNjaGVtYXRpY0FyZ3VtZW50cyA9IGF2YWlsYWJsZU9wdGlvbnNcbiAgICAgIC5maWx0ZXIob3B0ID0+IG9wdC4kZGVmYXVsdCAhPT0gdW5kZWZpbmVkICYmIG9wdC4kZGVmYXVsdC4kc291cmNlID09PSAnYXJndicpXG4gICAgICAuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICBpZiAoYS4kZGVmYXVsdC5pbmRleCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGIuJGRlZmF1bHQuaW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYS4kZGVmYXVsdC5pbmRleCA9PSBiLiRkZWZhdWx0LmluZGV4KSB7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0gZWxzZSBpZiAoYS4kZGVmYXVsdC5pbmRleCA+IGIuJGRlZmF1bHQuaW5kZXgpIHtcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XG4gICAgICBvcHRpb25zOiBzY2hlbWF0aWNPcHRpb25zLFxuICAgICAgYXJndW1lbnRzOiBzY2hlbWF0aWNBcmd1bWVudHMsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9sb2FkV29ya3NwYWNlKCkge1xuICAgIGlmICh0aGlzLl93b3Jrc3BhY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgd29ya3NwYWNlTG9hZGVyID0gbmV3IFdvcmtzcGFjZUxvYWRlcih0aGlzLl9ob3N0KTtcblxuICAgIHRyeSB7XG4gICAgICB3b3Jrc3BhY2VMb2FkZXIubG9hZFdvcmtzcGFjZSh0aGlzLnByb2plY3Qucm9vdCkucGlwZSh0YWtlKDEpKVxuICAgICAgICAuc3Vic2NyaWJlKFxuICAgICAgICAgICh3b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlKSA9PiB0aGlzLl93b3Jrc3BhY2UgPSB3b3Jrc3BhY2UsXG4gICAgICAgICAgKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5hbGxvd01pc3NpbmdXb3Jrc3BhY2UpIHtcbiAgICAgICAgICAgICAgLy8gSWdub3JlIG1pc3Npbmcgd29ya3NwYWNlXG4gICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICApO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKCF0aGlzLmFsbG93TWlzc2luZ1dvcmtzcGFjZSkge1xuICAgICAgICAvLyBJZ25vcmUgbWlzc2luZyB3b3Jrc3BhY2VcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2NsZWFuRGVmYXVsdHM8VCwgSyBleHRlbmRzIGtleW9mIFQ+KGRlZmF1bHRzOiBULCB1bmRlZmluZWRPcHRpb25zOiBzdHJpbmdbXSk6IFQge1xuICAgIChPYmplY3Qua2V5cyhkZWZhdWx0cykgYXMgS1tdKVxuICAgICAgLmZpbHRlcihrZXkgPT4gIXVuZGVmaW5lZE9wdGlvbnMubWFwKHN0cmluZ3MuY2FtZWxpemUpLmluY2x1ZGVzKGtleSkpXG4gICAgICAuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICBkZWxldGUgZGVmYXVsdHNba2V5XTtcbiAgICAgIH0pO1xuXG4gICAgcmV0dXJuIGRlZmF1bHRzO1xuICB9XG5cbiAgcHJpdmF0ZSByZWFkRGVmYXVsdHMoY29sbGVjdGlvbk5hbWU6IHN0cmluZywgc2NoZW1hdGljTmFtZTogc3RyaW5nLCBvcHRpb25zOiBhbnkpOiB7fSB7XG4gICAgaWYgKHRoaXMuX2RlQWxpYXNlZE5hbWUpIHtcbiAgICAgIHNjaGVtYXRpY05hbWUgPSB0aGlzLl9kZUFsaWFzZWROYW1lO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2plY3ROYW1lID0gb3B0aW9ucy5wcm9qZWN0O1xuICAgIGNvbnN0IGRlZmF1bHRzID0gZ2V0U2NoZW1hdGljRGVmYXVsdHMoY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWUsIHByb2plY3ROYW1lKTtcblxuICAgIC8vIEdldCBsaXN0IG9mIGFsbCB1bmRlZmluZWQgb3B0aW9ucy5cbiAgICBjb25zdCB1bmRlZmluZWRPcHRpb25zID0gdGhpcy5vcHRpb25zXG4gICAgICAuZmlsdGVyKG8gPT4gb3B0aW9uc1tvLm5hbWVdID09PSB1bmRlZmluZWQpXG4gICAgICAubWFwKG8gPT4gby5uYW1lKTtcblxuICAgIC8vIERlbGV0ZSBhbnkgZGVmYXVsdCB0aGF0IGlzIG5vdCB1bmRlZmluZWQuXG4gICAgdGhpcy5fY2xlYW5EZWZhdWx0cyhkZWZhdWx0cywgdW5kZWZpbmVkT3B0aW9ucyk7XG5cbiAgICByZXR1cm4gZGVmYXVsdHM7XG4gIH1cbn1cbiJdfQ==