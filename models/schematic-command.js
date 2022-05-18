"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchematicCommand = exports.UnknownCollectionError = void 0;
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const tools_1 = require("@angular-devkit/schematics/tools");
const inquirer = __importStar(require("inquirer"));
const systemPath = __importStar(require("path"));
const path_1 = require("path");
const color_1 = require("../utilities/color");
const config_1 = require("../utilities/config");
const json_schema_1 = require("../utilities/json-schema");
const package_manager_1 = require("../utilities/package-manager");
const tty_1 = require("../utilities/tty");
const analytics_1 = require("./analytics");
const command_1 = require("./command");
const parser_1 = require("./parser");
const schematic_engine_host_1 = require("./schematic-engine-host");
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
        this.useReportAnalytics = false;
        this.defaultCollectionName = '@schematics/angular';
        this.collectionName = this.defaultCollectionName;
    }
    async initialize(options) {
        await this.createWorkflow(options);
        if (this.schematicName) {
            // Set the options.
            const collection = this.getCollection(this.collectionName);
            const schematic = this.getSchematic(collection, this.schematicName, true);
            const options = await (0, json_schema_1.parseJsonSchemaToOptions)(this._workflow.registry, schematic.description.schemaJson || {});
            this.description.description = schematic.description.description;
            this.description.options.push(...options.filter((x) => !x.hidden));
            // Remove any user analytics from schematics that are NOT part of our safelist.
            for (const o of this.description.options) {
                if (o.userAnalytics && !(0, analytics_1.isPackageNameSafeForAnalytics)(this.collectionName)) {
                    o.userAnalytics = undefined;
                }
            }
        }
    }
    async printHelp() {
        await super.printHelp();
        this.logger.info('');
        const subCommandOption = this.description.options.filter((x) => x.subcommands)[0];
        if (!subCommandOption || !subCommandOption.subcommands) {
            return 0;
        }
        const schematicNames = Object.keys(subCommandOption.subcommands);
        if (schematicNames.length > 1) {
            this.logger.info('Available Schematics:');
            const namesPerCollection = {};
            schematicNames.forEach((name) => {
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
            const defaultCollection = await this.getDefaultSchematicCollection();
            Object.keys(namesPerCollection).forEach((collectionName) => {
                const isDefault = defaultCollection == collectionName;
                this.logger.info(`  Collection "${collectionName}"${isDefault ? ' (default)' : ''}:`);
                namesPerCollection[collectionName].forEach((schematicName) => {
                    this.logger.info(`    ${schematicName}`);
                });
            });
        }
        return 0;
    }
    async printHelpUsage() {
        const subCommandOption = this.description.options.filter((x) => x.subcommands)[0];
        if (!subCommandOption || !subCommandOption.subcommands) {
            return;
        }
        const schematicNames = Object.keys(subCommandOption.subcommands);
        if (schematicNames.length == 1) {
            this.logger.info(this.description.description);
            const opts = this.description.options.filter((x) => x.positional === undefined);
            const [collectionName, schematicName] = schematicNames[0].split(/:/)[0];
            // Display <collectionName:schematicName> if this is not the default collectionName,
            // otherwise just show the schematicName.
            const displayName = collectionName == (await this.getDefaultSchematicCollection())
                ? schematicName
                : schematicNames[0];
            const schematicOptions = subCommandOption.subcommands[schematicNames[0]].options;
            const schematicArgs = schematicOptions.filter((x) => x.positional !== undefined);
            const argDisplay = schematicArgs.length > 0
                ? ' ' + schematicArgs.map((a) => `<${core_1.strings.dasherize(a.name)}>`).join(' ')
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
            .filter((o) => o.format === 'path')
            .map((o) => o.name)
            .reduce((acc, curr) => {
            acc[curr] = workingDir;
            return acc;
        }, {});
    }
    /*
     * Runtime hook to allow specifying customized workflow
     */
    async createWorkflow(options) {
        if (this._workflow) {
            return this._workflow;
        }
        const { force, dryRun } = options;
        const root = this.context.root;
        const workflow = new tools_1.NodeWorkflow(root, {
            force,
            dryRun,
            packageManager: await (0, package_manager_1.getPackageManager)(root),
            packageRegistry: options.packageRegistry,
            // A schema registry is required to allow customizing addUndefinedDefaults
            registry: new core_1.schema.CoreSchemaRegistry(schematics_1.formats.standardFormats),
            resolvePaths: this.workspace
                ? // Workspace
                    this.collectionName === this.defaultCollectionName
                        ? // Favor __dirname for @schematics/angular to use the build-in version
                            [__dirname, process.cwd(), root]
                        : [process.cwd(), root, __dirname]
                : // Global
                    [__dirname, process.cwd()],
            schemaValidation: true,
            optionTransforms: [
                // Add configuration file defaults
                async (schematic, current) => {
                    const projectName = typeof current.project === 'string'
                        ? current.project
                        : getProjectName();
                    return {
                        ...(await (0, config_1.getSchematicDefaults)(schematic.collection.name, schematic.name, projectName)),
                        ...current,
                    };
                },
            ],
            engineHostCreator: (options) => new schematic_engine_host_1.SchematicEngineHost(options.resolvePaths),
        });
        const getProjectName = () => {
            if (this.workspace) {
                const projectNames = getProjectsByPath(this.workspace, process.cwd(), this.workspace.basePath);
                if (projectNames.length === 1) {
                    return projectNames[0];
                }
                else {
                    if (projectNames.length > 1) {
                        this.logger.warn(core_1.tags.oneLine `
              Two or more projects are using identical roots.
              Unable to determine project using current working directory.
              Using default workspace project instead.
            `);
                    }
                    const defaultProjectName = this.workspace.extensions['defaultProject'];
                    if (typeof defaultProjectName === 'string' && defaultProjectName) {
                        return defaultProjectName;
                    }
                }
            }
            return undefined;
        };
        workflow.registry.addPostTransform(core_1.schema.transforms.addUndefinedDefaults);
        workflow.registry.addSmartDefaultProvider('projectName', getProjectName);
        workflow.registry.useXDeprecatedProvider((msg) => this.logger.warn(msg));
        let shouldReportAnalytics = true;
        workflow.engineHost.registerOptionsTransform(async (_, options) => {
            if (shouldReportAnalytics) {
                shouldReportAnalytics = false;
                await this.reportAnalytics([this.description.name], options);
            }
            return options;
        });
        if (options.interactive !== false && (0, tty_1.isTTY)()) {
            workflow.registry.usePromptProvider((definitions) => {
                const questions = definitions
                    .filter((definition) => !options.defaults || definition.default === undefined)
                    .map((definition) => {
                    var _a;
                    const question = {
                        name: definition.id,
                        message: definition.message,
                        default: definition.default,
                    };
                    const validator = definition.validator;
                    if (validator) {
                        question.validate = (input) => validator(input);
                        // Filter allows transformation of the value prior to validation
                        question.filter = async (input) => {
                            for (const type of definition.propertyTypes) {
                                let value;
                                switch (type) {
                                    case 'string':
                                        value = String(input);
                                        break;
                                    case 'integer':
                                    case 'number':
                                        value = Number(input);
                                        break;
                                    default:
                                        value = input;
                                        break;
                                }
                                // Can be a string if validation fails
                                const isValid = (await validator(value)) === true;
                                if (isValid) {
                                    return value;
                                }
                            }
                            return input;
                        };
                    }
                    switch (definition.type) {
                        case 'confirmation':
                            question.type = 'confirm';
                            break;
                        case 'list':
                            question.type = definition.multiselect ? 'checkbox' : 'list';
                            question.choices = (_a = definition.items) === null || _a === void 0 ? void 0 : _a.map((item) => {
                                return typeof item == 'string'
                                    ? item
                                    : {
                                        name: item.label,
                                        value: item.value,
                                    };
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
        return (this._workflow = workflow);
    }
    async getDefaultSchematicCollection() {
        // Resolve relative collections from the location of `angular.json`
        const resolveRelativeCollection = (collectionName) => collectionName.charAt(0) === '.'
            ? (0, path_1.resolve)(this.context.root, collectionName)
            : collectionName;
        let workspace = await (0, config_1.getWorkspace)('local');
        if (workspace) {
            const project = (0, config_1.getProjectByCwd)(workspace);
            if (project && workspace.getProjectCli(project)) {
                const value = workspace.getProjectCli(project)['defaultCollection'];
                if (typeof value == 'string') {
                    return resolveRelativeCollection(value);
                }
            }
            if (workspace.getCli()) {
                const value = workspace.getCli()['defaultCollection'];
                if (typeof value == 'string') {
                    return resolveRelativeCollection(value);
                }
            }
        }
        workspace = await (0, config_1.getWorkspace)('global');
        if (workspace && workspace.getCli()) {
            const value = workspace.getCli()['defaultCollection'];
            if (typeof value == 'string') {
                return resolveRelativeCollection(value);
            }
        }
        return this.defaultCollectionName;
    }
    async runSchematic(options) {
        const { schematicOptions, debug, dryRun } = options;
        let { collectionName, schematicName } = options;
        let nothingDone = true;
        let loggingQueue = [];
        let error = false;
        const workflow = this._workflow;
        const workingDir = (0, core_1.normalize)(systemPath.relative(this.context.root, process.cwd()));
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
            args = await this.parseFreeFormArguments(schematicOptions || []);
        }
        else {
            o = await (0, json_schema_1.parseJsonSchemaToOptions)(workflow.registry, schematic.description.schemaJson);
            args = await this.parseArguments(schematicOptions || [], o);
        }
        const allowAdditionalProperties = typeof schematic.description.schemaJson === 'object' &&
            schematic.description.schemaJson.additionalProperties;
        if (args['--'] && !allowAdditionalProperties) {
            args['--'].forEach((additional) => {
                this.logger.fatal(`Unknown option: '${additional.split(/=/)[0]}'`);
            });
            return 1;
        }
        const pathOptions = o ? this.setPathOptions(o, workingDir) : {};
        const input = {
            ...pathOptions,
            ...args,
            ...options.additionalOptions,
        };
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
            ${color_1.colors.cyan('UPDATE')} ${eventPath} (${event.content.length} bytes)
          `);
                    break;
                case 'create':
                    loggingQueue.push(core_1.tags.oneLine `
            ${color_1.colors.green('CREATE')} ${eventPath} (${event.content.length} bytes)
          `);
                    break;
                case 'delete':
                    loggingQueue.push(`${color_1.colors.yellow('DELETE')} ${eventPath}`);
                    break;
                case 'rename':
                    const eventToPath = event.to.startsWith('/') ? event.to.substr(1) : event.to;
                    loggingQueue.push(`${color_1.colors.blue('RENAME')} ${eventPath} => ${eventToPath}`);
                    break;
            }
        });
        workflow.lifeCycle.subscribe((event) => {
            if (event.kind == 'end' || event.kind == 'post-tasks-start') {
                if (!error) {
                    // Output the logging queue, no error happened.
                    loggingQueue.forEach((log) => this.logger.info(log));
                }
                loggingQueue = [];
                error = false;
            }
        });
        // Temporary compatibility check for NPM 7
        if (collectionName === '@schematics/angular' && schematicName === 'ng-new') {
            if (!input.skipInstall &&
                (input.packageManager === undefined || input.packageManager === 'npm')) {
                await (0, package_manager_1.ensureCompatibleNpm)(this.context.root);
            }
        }
        return new Promise((resolve) => {
            workflow
                .execute({
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
                        this.logger.fatal(`An error occurred:\n${err.message}\n${err.stack}`);
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
        return (0, parser_1.parseFreeFormArguments)(schematicOptions);
    }
    async parseArguments(schematicOptions, options) {
        return (0, parser_1.parseArguments)(schematicOptions, options, this.logger);
    }
}
exports.SchematicCommand = SchematicCommand;
function getProjectsByPath(workspace, path, root) {
    if (workspace.projects.size === 1) {
        return Array.from(workspace.projects.keys());
    }
    const isInside = (base, potential) => {
        const absoluteBase = systemPath.resolve(root, base);
        const absolutePotential = systemPath.resolve(root, potential);
        const relativePotential = systemPath.relative(absoluteBase, absolutePotential);
        if (!relativePotential.startsWith('..') && !systemPath.isAbsolute(relativePotential)) {
            return true;
        }
        return false;
    };
    const projects = Array.from(workspace.projects.entries())
        .map(([name, project]) => [systemPath.resolve(root, project.root), name])
        .filter((tuple) => isInside(tuple[0], path))
        // Sort tuples by depth, with the deeper ones first. Since the first member is a path and
        // we filtered all invalid paths, the longest will be the deepest (and in case of equality
        // the sort is stable and the first declared project will win).
        .sort((a, b) => b[0].length - a[0].length);
    if (projects.length === 1) {
        return [projects[0][1]];
    }
    else if (projects.length > 1) {
        const firstPath = projects[0][0];
        return projects.filter((v) => v[0] === firstPath).map((v) => v[1]);
    }
    return [];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvc2NoZW1hdGljLWNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBNkY7QUFDN0YsMkRBS29DO0FBQ3BDLDREQUswQztBQUMxQyxtREFBcUM7QUFDckMsaURBQW1DO0FBQ25DLCtCQUErQjtBQUMvQiw4Q0FBNEM7QUFDNUMsZ0RBQTBGO0FBQzFGLDBEQUFvRTtBQUNwRSxrRUFBc0Y7QUFDdEYsMENBQXlDO0FBQ3pDLDJDQUE0RDtBQUM1RCx1Q0FBd0Q7QUFFeEQscUNBQWtFO0FBQ2xFLG1FQUE4RDtBQW1COUQsTUFBYSxzQkFBdUIsU0FBUSxLQUFLO0lBQy9DLFlBQVksY0FBc0I7UUFDaEMsS0FBSyxDQUFDLHVCQUF1QixjQUFjLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUM7Q0FDRjtBQUpELHdEQUlDO0FBRUQsTUFBc0IsZ0JBRXBCLFNBQVEsaUJBQVU7SUFTbEIsWUFBWSxPQUF1QixFQUFFLFdBQStCLEVBQUUsTUFBc0I7UUFDMUYsS0FBSyxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFUbkIsMkJBQXNCLEdBQVksS0FBSyxDQUFDO1FBQy9CLHVCQUFrQixHQUFHLEtBQUssQ0FBQztRQUc3QywwQkFBcUIsR0FBRyxxQkFBcUIsQ0FBQztRQUM5QyxtQkFBYyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztJQUt0RCxDQUFDO0lBRWUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFzQjtRQUNyRCxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFbkMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ3RCLG1CQUFtQjtZQUNuQixN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QUFDO0lBRTdDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDekIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3pCO1NBQU0sSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUM5QixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakMsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNwRTtJQUVELE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBsb2dnaW5nLCBub3JtYWxpemUsIHNjaGVtYSwgc3RyaW5ncywgdGFncywgd29ya3NwYWNlcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIERyeVJ1bkV2ZW50LFxuICBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbixcbiAgZm9ybWF0cyxcbiAgd29ya2Zsb3csXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7XG4gIEZpbGVTeXN0ZW1Db2xsZWN0aW9uLFxuICBGaWxlU3lzdGVtRW5naW5lLFxuICBGaWxlU3lzdGVtU2NoZW1hdGljLFxuICBOb2RlV29ya2Zsb3csXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCAqIGFzIGlucXVpcmVyIGZyb20gJ2lucXVpcmVyJztcbmltcG9ydCAqIGFzIHN5c3RlbVBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgZ2V0UHJvamVjdEJ5Q3dkLCBnZXRTY2hlbWF0aWNEZWZhdWx0cywgZ2V0V29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMgfSBmcm9tICcuLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuaW1wb3J0IHsgZW5zdXJlQ29tcGF0aWJsZU5wbSwgZ2V0UGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi91dGlsaXRpZXMvcGFja2FnZS1tYW5hZ2VyJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3R0eSc7XG5pbXBvcnQgeyBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyB9IGZyb20gJy4vYW5hbHl0aWNzJztcbmltcG9ydCB7IEJhc2VDb21tYW5kT3B0aW9ucywgQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZCc7XG5pbXBvcnQgeyBBcmd1bWVudHMsIENvbW1hbmRDb250ZXh0LCBDb21tYW5kRGVzY3JpcHRpb24sIE9wdGlvbiB9IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB7IHBhcnNlQXJndW1lbnRzLCBwYXJzZUZyZWVGb3JtQXJndW1lbnRzIH0gZnJvbSAnLi9wYXJzZXInO1xuaW1wb3J0IHsgU2NoZW1hdGljRW5naW5lSG9zdCB9IGZyb20gJy4vc2NoZW1hdGljLWVuZ2luZS1ob3N0JztcblxuZXhwb3J0IGludGVyZmFjZSBCYXNlU2NoZW1hdGljU2NoZW1hIHtcbiAgZGVidWc/OiBib29sZWFuO1xuICBkcnlSdW4/OiBib29sZWFuO1xuICBmb3JjZT86IGJvb2xlYW47XG4gIGludGVyYWN0aXZlPzogYm9vbGVhbjtcbiAgZGVmYXVsdHM/OiBib29sZWFuO1xuICBwYWNrYWdlUmVnaXN0cnk/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuU2NoZW1hdGljT3B0aW9ucyBleHRlbmRzIEJhc2VTY2hlbWF0aWNTY2hlbWEge1xuICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICBzY2hlbWF0aWNOYW1lOiBzdHJpbmc7XG4gIGFkZGl0aW9uYWxPcHRpb25zPzogeyBba2V5OiBzdHJpbmddOiB7fSB9O1xuICBzY2hlbWF0aWNPcHRpb25zPzogc3RyaW5nW107XG4gIHNob3dOb3RoaW5nRG9uZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBVbmtub3duQ29sbGVjdGlvbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcihjb2xsZWN0aW9uTmFtZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoYEludmFsaWQgY29sbGVjdGlvbiAoJHtjb2xsZWN0aW9uTmFtZX0pLmApO1xuICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTY2hlbWF0aWNDb21tYW5kPFxuICBUIGV4dGVuZHMgQmFzZVNjaGVtYXRpY1NjaGVtYSAmIEJhc2VDb21tYW5kT3B0aW9ucyxcbj4gZXh0ZW5kcyBDb21tYW5kPFQ+IHtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGFsbG93UHJpdmF0ZVNjaGVtYXRpY3M6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIHJlYWRvbmx5IHVzZVJlcG9ydEFuYWx5dGljcyA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgX3dvcmtmbG93ITogTm9kZVdvcmtmbG93O1xuXG4gIHByb3RlY3RlZCBkZWZhdWx0Q29sbGVjdGlvbk5hbWUgPSAnQHNjaGVtYXRpY3MvYW5ndWxhcic7XG4gIHByb3RlY3RlZCBjb2xsZWN0aW9uTmFtZSA9IHRoaXMuZGVmYXVsdENvbGxlY3Rpb25OYW1lO1xuICBwcm90ZWN0ZWQgc2NoZW1hdGljTmFtZT86IHN0cmluZztcblxuICBjb25zdHJ1Y3Rvcihjb250ZXh0OiBDb21tYW5kQ29udGV4dCwgZGVzY3JpcHRpb246IENvbW1hbmREZXNjcmlwdGlvbiwgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcikge1xuICAgIHN1cGVyKGNvbnRleHQsIGRlc2NyaXB0aW9uLCBsb2dnZXIpO1xuICB9XG5cbiAgcHVibGljIG92ZXJyaWRlIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogVCAmIEFyZ3VtZW50cykge1xuICAgIGF3YWl0IHRoaXMuY3JlYXRlV29ya2Zsb3cob3B0aW9ucyk7XG5cbiAgICBpZiAodGhpcy5zY2hlbWF0aWNOYW1lKSB7XG4gICAgICAvLyBTZXQgdGhlIG9wdGlvbnMuXG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gdGhpcy5nZXRDb2xsZWN0aW9uKHRoaXMuY29sbGVjdGlvbk5hbWUpO1xuICAgICAgY29uc3Qgc2NoZW1hdGljID0gdGhpcy5nZXRTY2hlbWF0aWMoY29sbGVjdGlvbiwgdGhpcy5zY2hlbWF0aWNOYW1lLCB0cnVlKTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMoXG4gICAgICAgIHRoaXMuX3dvcmtmbG93LnJlZ2lzdHJ5LFxuICAgICAgICBzY2hlbWF0aWMuZGVzY3JpcHRpb24uc2NoZW1hSnNvbiB8fCB7fSxcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuZGVzY3JpcHRpb24uZGVzY3JpcHRpb24gPSBzY2hlbWF0aWMuZGVzY3JpcHRpb24uZGVzY3JpcHRpb247XG4gICAgICB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMucHVzaCguLi5vcHRpb25zLmZpbHRlcigoeCkgPT4gIXguaGlkZGVuKSk7XG5cbiAgICAgIC8vIFJlbW92ZSBhbnkgdXNlciBhbmFseXRpY3MgZnJvbSBzY2hlbWF0aWNzIHRoYXQgYXJlIE5PVCBwYXJ0IG9mIG91ciBzYWZlbGlzdC5cbiAgICAgIGZvciAoY29uc3QgbyBvZiB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG8udXNlckFuYWx5dGljcyAmJiAhaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3ModGhpcy5jb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgICAgICBvLnVzZXJBbmFseXRpY3MgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwdWJsaWMgb3ZlcnJpZGUgYXN5bmMgcHJpbnRIZWxwKCkge1xuICAgIGF3YWl0IHN1cGVyLnByaW50SGVscCgpO1xuICAgIHRoaXMubG9nZ2VyLmluZm8oJycpO1xuXG4gICAgY29uc3Qgc3ViQ29tbWFuZE9wdGlvbiA9IHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5maWx0ZXIoKHgpID0+IHguc3ViY29tbWFuZHMpWzBdO1xuXG4gICAgaWYgKCFzdWJDb21tYW5kT3B0aW9uIHx8ICFzdWJDb21tYW5kT3B0aW9uLnN1YmNvbW1hbmRzKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBjb25zdCBzY2hlbWF0aWNOYW1lcyA9IE9iamVjdC5rZXlzKHN1YkNvbW1hbmRPcHRpb24uc3ViY29tbWFuZHMpO1xuXG4gICAgaWYgKHNjaGVtYXRpY05hbWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ0F2YWlsYWJsZSBTY2hlbWF0aWNzOicpO1xuXG4gICAgICBjb25zdCBuYW1lc1BlckNvbGxlY3Rpb246IHsgW2M6IHN0cmluZ106IHN0cmluZ1tdIH0gPSB7fTtcbiAgICAgIHNjaGVtYXRpY05hbWVzLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgICAgbGV0IFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSBuYW1lLnNwbGl0KC86LywgMik7XG4gICAgICAgIGlmICghc2NoZW1hdGljTmFtZSkge1xuICAgICAgICAgIHNjaGVtYXRpY05hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgICAgICAgICBjb2xsZWN0aW9uTmFtZSA9IHRoaXMuY29sbGVjdGlvbk5hbWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5hbWVzUGVyQ29sbGVjdGlvbltjb2xsZWN0aW9uTmFtZV0pIHtcbiAgICAgICAgICBuYW1lc1BlckNvbGxlY3Rpb25bY29sbGVjdGlvbk5hbWVdID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBuYW1lc1BlckNvbGxlY3Rpb25bY29sbGVjdGlvbk5hbWVdLnB1c2goc2NoZW1hdGljTmFtZSk7XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgZGVmYXVsdENvbGxlY3Rpb24gPSBhd2FpdCB0aGlzLmdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCk7XG4gICAgICBPYmplY3Qua2V5cyhuYW1lc1BlckNvbGxlY3Rpb24pLmZvckVhY2goKGNvbGxlY3Rpb25OYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IGlzRGVmYXVsdCA9IGRlZmF1bHRDb2xsZWN0aW9uID09IGNvbGxlY3Rpb25OYW1lO1xuICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKGAgIENvbGxlY3Rpb24gXCIke2NvbGxlY3Rpb25OYW1lfVwiJHtpc0RlZmF1bHQgPyAnIChkZWZhdWx0KScgOiAnJ306YCk7XG5cbiAgICAgICAgbmFtZXNQZXJDb2xsZWN0aW9uW2NvbGxlY3Rpb25OYW1lXS5mb3JFYWNoKChzY2hlbWF0aWNOYW1lKSA9PiB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgICAgICR7c2NoZW1hdGljTmFtZX1gKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIG92ZXJyaWRlIGFzeW5jIHByaW50SGVscFVzYWdlKCkge1xuICAgIGNvbnN0IHN1YkNvbW1hbmRPcHRpb24gPSB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMuZmlsdGVyKCh4KSA9PiB4LnN1YmNvbW1hbmRzKVswXTtcblxuICAgIGlmICghc3ViQ29tbWFuZE9wdGlvbiB8fCAhc3ViQ29tbWFuZE9wdGlvbi5zdWJjb21tYW5kcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHNjaGVtYXRpY05hbWVzID0gT2JqZWN0LmtleXMoc3ViQ29tbWFuZE9wdGlvbi5zdWJjb21tYW5kcyk7XG4gICAgaWYgKHNjaGVtYXRpY05hbWVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKHRoaXMuZGVzY3JpcHRpb24uZGVzY3JpcHRpb24pO1xuXG4gICAgICBjb25zdCBvcHRzID0gdGhpcy5kZXNjcmlwdGlvbi5vcHRpb25zLmZpbHRlcigoeCkgPT4geC5wb3NpdGlvbmFsID09PSB1bmRlZmluZWQpO1xuICAgICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHNjaGVtYXRpY05hbWVzWzBdLnNwbGl0KC86LylbMF07XG5cbiAgICAgIC8vIERpc3BsYXkgPGNvbGxlY3Rpb25OYW1lOnNjaGVtYXRpY05hbWU+IGlmIHRoaXMgaXMgbm90IHRoZSBkZWZhdWx0IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgLy8gb3RoZXJ3aXNlIGp1c3Qgc2hvdyB0aGUgc2NoZW1hdGljTmFtZS5cbiAgICAgIGNvbnN0IGRpc3BsYXlOYW1lID1cbiAgICAgICAgY29sbGVjdGlvbk5hbWUgPT0gKGF3YWl0IHRoaXMuZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKSlcbiAgICAgICAgICA/IHNjaGVtYXRpY05hbWVcbiAgICAgICAgICA6IHNjaGVtYXRpY05hbWVzWzBdO1xuXG4gICAgICBjb25zdCBzY2hlbWF0aWNPcHRpb25zID0gc3ViQ29tbWFuZE9wdGlvbi5zdWJjb21tYW5kc1tzY2hlbWF0aWNOYW1lc1swXV0ub3B0aW9ucztcbiAgICAgIGNvbnN0IHNjaGVtYXRpY0FyZ3MgPSBzY2hlbWF0aWNPcHRpb25zLmZpbHRlcigoeCkgPT4geC5wb3NpdGlvbmFsICE9PSB1bmRlZmluZWQpO1xuICAgICAgY29uc3QgYXJnRGlzcGxheSA9XG4gICAgICAgIHNjaGVtYXRpY0FyZ3MubGVuZ3RoID4gMFxuICAgICAgICAgID8gJyAnICsgc2NoZW1hdGljQXJncy5tYXAoKGEpID0+IGA8JHtzdHJpbmdzLmRhc2hlcml6ZShhLm5hbWUpfT5gKS5qb2luKCcgJylcbiAgICAgICAgICA6ICcnO1xuXG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKHRhZ3Mub25lTGluZWBcbiAgICAgICAgdXNhZ2U6IG5nICR7dGhpcy5kZXNjcmlwdGlvbi5uYW1lfSAke2Rpc3BsYXlOYW1lfSR7YXJnRGlzcGxheX1cbiAgICAgICAgJHtvcHRzLmxlbmd0aCA+IDAgPyBgW29wdGlvbnNdYCA6IGBgfVxuICAgICAgYCk7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgc3VwZXIucHJpbnRIZWxwVXNhZ2UoKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0RW5naW5lKCk6IEZpbGVTeXN0ZW1FbmdpbmUge1xuICAgIHJldHVybiB0aGlzLl93b3JrZmxvdy5lbmdpbmU7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZTogc3RyaW5nKTogRmlsZVN5c3RlbUNvbGxlY3Rpb24ge1xuICAgIGNvbnN0IGVuZ2luZSA9IHRoaXMuZ2V0RW5naW5lKCk7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IGVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcblxuICAgIGlmIChjb2xsZWN0aW9uID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVW5rbm93bkNvbGxlY3Rpb25FcnJvcihjb2xsZWN0aW9uTmFtZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbGxlY3Rpb247XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0U2NoZW1hdGljKFxuICAgIGNvbGxlY3Rpb246IEZpbGVTeXN0ZW1Db2xsZWN0aW9uLFxuICAgIHNjaGVtYXRpY05hbWU6IHN0cmluZyxcbiAgICBhbGxvd1ByaXZhdGU/OiBib29sZWFuLFxuICApOiBGaWxlU3lzdGVtU2NoZW1hdGljIHtcbiAgICByZXR1cm4gY29sbGVjdGlvbi5jcmVhdGVTY2hlbWF0aWMoc2NoZW1hdGljTmFtZSwgYWxsb3dQcml2YXRlKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBzZXRQYXRoT3B0aW9ucyhvcHRpb25zOiBPcHRpb25bXSwgd29ya2luZ0Rpcjogc3RyaW5nKSB7XG4gICAgaWYgKHdvcmtpbmdEaXIgPT09ICcnKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdGlvbnNcbiAgICAgIC5maWx0ZXIoKG8pID0+IG8uZm9ybWF0ID09PSAncGF0aCcpXG4gICAgICAubWFwKChvKSA9PiBvLm5hbWUpXG4gICAgICAucmVkdWNlKChhY2MsIGN1cnIpID0+IHtcbiAgICAgICAgYWNjW2N1cnJdID0gd29ya2luZ0RpcjtcblxuICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgfSwge30gYXMgeyBbbmFtZTogc3RyaW5nXTogc3RyaW5nIH0pO1xuICB9XG5cbiAgLypcbiAgICogUnVudGltZSBob29rIHRvIGFsbG93IHNwZWNpZnlpbmcgY3VzdG9taXplZCB3b3JrZmxvd1xuICAgKi9cbiAgcHJvdGVjdGVkIGFzeW5jIGNyZWF0ZVdvcmtmbG93KG9wdGlvbnM6IEJhc2VTY2hlbWF0aWNTY2hlbWEpOiBQcm9taXNlPHdvcmtmbG93LkJhc2VXb3JrZmxvdz4ge1xuICAgIGlmICh0aGlzLl93b3JrZmxvdykge1xuICAgICAgcmV0dXJuIHRoaXMuX3dvcmtmbG93O1xuICAgIH1cblxuICAgIGNvbnN0IHsgZm9yY2UsIGRyeVJ1biB9ID0gb3B0aW9ucztcbiAgICBjb25zdCByb290ID0gdGhpcy5jb250ZXh0LnJvb3Q7XG4gICAgY29uc3Qgd29ya2Zsb3cgPSBuZXcgTm9kZVdvcmtmbG93KHJvb3QsIHtcbiAgICAgIGZvcmNlLFxuICAgICAgZHJ5UnVuLFxuICAgICAgcGFja2FnZU1hbmFnZXI6IGF3YWl0IGdldFBhY2thZ2VNYW5hZ2VyKHJvb3QpLFxuICAgICAgcGFja2FnZVJlZ2lzdHJ5OiBvcHRpb25zLnBhY2thZ2VSZWdpc3RyeSxcbiAgICAgIC8vIEEgc2NoZW1hIHJlZ2lzdHJ5IGlzIHJlcXVpcmVkIHRvIGFsbG93IGN1c3RvbWl6aW5nIGFkZFVuZGVmaW5lZERlZmF1bHRzXG4gICAgICByZWdpc3RyeTogbmV3IHNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoZm9ybWF0cy5zdGFuZGFyZEZvcm1hdHMpLFxuICAgICAgcmVzb2x2ZVBhdGhzOiB0aGlzLndvcmtzcGFjZVxuICAgICAgICA/IC8vIFdvcmtzcGFjZVxuICAgICAgICAgIHRoaXMuY29sbGVjdGlvbk5hbWUgPT09IHRoaXMuZGVmYXVsdENvbGxlY3Rpb25OYW1lXG4gICAgICAgICAgPyAvLyBGYXZvciBfX2Rpcm5hbWUgZm9yIEBzY2hlbWF0aWNzL2FuZ3VsYXIgdG8gdXNlIHRoZSBidWlsZC1pbiB2ZXJzaW9uXG4gICAgICAgICAgICBbX19kaXJuYW1lLCBwcm9jZXNzLmN3ZCgpLCByb290XVxuICAgICAgICAgIDogW3Byb2Nlc3MuY3dkKCksIHJvb3QsIF9fZGlybmFtZV1cbiAgICAgICAgOiAvLyBHbG9iYWxcbiAgICAgICAgICBbX19kaXJuYW1lLCBwcm9jZXNzLmN3ZCgpXSxcbiAgICAgIHNjaGVtYVZhbGlkYXRpb246IHRydWUsXG4gICAgICBvcHRpb25UcmFuc2Zvcm1zOiBbXG4gICAgICAgIC8vIEFkZCBjb25maWd1cmF0aW9uIGZpbGUgZGVmYXVsdHNcbiAgICAgICAgYXN5bmMgKHNjaGVtYXRpYywgY3VycmVudCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHByb2plY3ROYW1lID1cbiAgICAgICAgICAgIHR5cGVvZiAoY3VycmVudCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikucHJvamVjdCA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgICAgPyAoKGN1cnJlbnQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLnByb2plY3QgYXMgc3RyaW5nKVxuICAgICAgICAgICAgICA6IGdldFByb2plY3ROYW1lKCk7XG5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4uKGF3YWl0IGdldFNjaGVtYXRpY0RlZmF1bHRzKHNjaGVtYXRpYy5jb2xsZWN0aW9uLm5hbWUsIHNjaGVtYXRpYy5uYW1lLCBwcm9qZWN0TmFtZSkpLFxuICAgICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGVuZ2luZUhvc3RDcmVhdG9yOiAob3B0aW9ucykgPT4gbmV3IFNjaGVtYXRpY0VuZ2luZUhvc3Qob3B0aW9ucy5yZXNvbHZlUGF0aHMpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZ2V0UHJvamVjdE5hbWUgPSAoKSA9PiB7XG4gICAgICBpZiAodGhpcy53b3Jrc3BhY2UpIHtcbiAgICAgICAgY29uc3QgcHJvamVjdE5hbWVzID0gZ2V0UHJvamVjdHNCeVBhdGgoXG4gICAgICAgICAgdGhpcy53b3Jrc3BhY2UsXG4gICAgICAgICAgcHJvY2Vzcy5jd2QoKSxcbiAgICAgICAgICB0aGlzLndvcmtzcGFjZS5iYXNlUGF0aCxcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAocHJvamVjdE5hbWVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIHJldHVybiBwcm9qZWN0TmFtZXNbMF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHByb2plY3ROYW1lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgICAgVHdvIG9yIG1vcmUgcHJvamVjdHMgYXJlIHVzaW5nIGlkZW50aWNhbCByb290cy5cbiAgICAgICAgICAgICAgVW5hYmxlIHRvIGRldGVybWluZSBwcm9qZWN0IHVzaW5nIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuXG4gICAgICAgICAgICAgIFVzaW5nIGRlZmF1bHQgd29ya3NwYWNlIHByb2plY3QgaW5zdGVhZC5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGRlZmF1bHRQcm9qZWN0TmFtZSA9IHRoaXMud29ya3NwYWNlLmV4dGVuc2lvbnNbJ2RlZmF1bHRQcm9qZWN0J107XG4gICAgICAgICAgaWYgKHR5cGVvZiBkZWZhdWx0UHJvamVjdE5hbWUgPT09ICdzdHJpbmcnICYmIGRlZmF1bHRQcm9qZWN0TmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIGRlZmF1bHRQcm9qZWN0TmFtZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkUG9zdFRyYW5zZm9ybShzY2hlbWEudHJhbnNmb3Jtcy5hZGRVbmRlZmluZWREZWZhdWx0cyk7XG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ3Byb2plY3ROYW1lJywgZ2V0UHJvamVjdE5hbWUpO1xuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LnVzZVhEZXByZWNhdGVkUHJvdmlkZXIoKG1zZykgPT4gdGhpcy5sb2dnZXIud2Fybihtc2cpKTtcblxuICAgIGxldCBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSB0cnVlO1xuICAgIHdvcmtmbG93LmVuZ2luZUhvc3QucmVnaXN0ZXJPcHRpb25zVHJhbnNmb3JtKGFzeW5jIChfLCBvcHRpb25zKSA9PiB7XG4gICAgICBpZiAoc2hvdWxkUmVwb3J0QW5hbHl0aWNzKSB7XG4gICAgICAgIHNob3VsZFJlcG9ydEFuYWx5dGljcyA9IGZhbHNlO1xuICAgICAgICBhd2FpdCB0aGlzLnJlcG9ydEFuYWx5dGljcyhbdGhpcy5kZXNjcmlwdGlvbi5uYW1lXSwgb3B0aW9ucyBhcyBBcmd1bWVudHMpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb3B0aW9ucztcbiAgICB9KTtcblxuICAgIGlmIChvcHRpb25zLmludGVyYWN0aXZlICE9PSBmYWxzZSAmJiBpc1RUWSgpKSB7XG4gICAgICB3b3JrZmxvdy5yZWdpc3RyeS51c2VQcm9tcHRQcm92aWRlcigoZGVmaW5pdGlvbnM6IEFycmF5PHNjaGVtYS5Qcm9tcHREZWZpbml0aW9uPikgPT4ge1xuICAgICAgICBjb25zdCBxdWVzdGlvbnM6IGlucXVpcmVyLlF1ZXN0aW9uQ29sbGVjdGlvbiA9IGRlZmluaXRpb25zXG4gICAgICAgICAgLmZpbHRlcigoZGVmaW5pdGlvbikgPT4gIW9wdGlvbnMuZGVmYXVsdHMgfHwgZGVmaW5pdGlvbi5kZWZhdWx0ID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgLm1hcCgoZGVmaW5pdGlvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3Rpb246IGlucXVpcmVyLlF1ZXN0aW9uID0ge1xuICAgICAgICAgICAgICBuYW1lOiBkZWZpbml0aW9uLmlkLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBkZWZpbml0aW9uLm1lc3NhZ2UsXG4gICAgICAgICAgICAgIGRlZmF1bHQ6IGRlZmluaXRpb24uZGVmYXVsdCxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRvciA9IGRlZmluaXRpb24udmFsaWRhdG9yO1xuICAgICAgICAgICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgICAgICAgICBxdWVzdGlvbi52YWxpZGF0ZSA9IChpbnB1dCkgPT4gdmFsaWRhdG9yKGlucHV0KTtcblxuICAgICAgICAgICAgICAvLyBGaWx0ZXIgYWxsb3dzIHRyYW5zZm9ybWF0aW9uIG9mIHRoZSB2YWx1ZSBwcmlvciB0byB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgIHF1ZXN0aW9uLmZpbHRlciA9IGFzeW5jIChpbnB1dCkgPT4ge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdHlwZSBvZiBkZWZpbml0aW9uLnByb3BlcnR5VHlwZXMpIHtcbiAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gU3RyaW5nKGlucHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBOdW1iZXIoaW5wdXQpO1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gaW5wdXQ7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyBDYW4gYmUgYSBzdHJpbmcgaWYgdmFsaWRhdGlvbiBmYWlsc1xuICAgICAgICAgICAgICAgICAgY29uc3QgaXNWYWxpZCA9IChhd2FpdCB2YWxpZGF0b3IodmFsdWUpKSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGlmIChpc1ZhbGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXQ7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN3aXRjaCAoZGVmaW5pdGlvbi50eXBlKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ2NvbmZpcm1hdGlvbic6XG4gICAgICAgICAgICAgICAgcXVlc3Rpb24udHlwZSA9ICdjb25maXJtJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnbGlzdCc6XG4gICAgICAgICAgICAgICAgcXVlc3Rpb24udHlwZSA9IGRlZmluaXRpb24ubXVsdGlzZWxlY3QgPyAnY2hlY2tib3gnIDogJ2xpc3QnO1xuICAgICAgICAgICAgICAgIChxdWVzdGlvbiBhcyBpbnF1aXJlci5DaGVja2JveFF1ZXN0aW9uKS5jaG9pY2VzID0gZGVmaW5pdGlvbi5pdGVtcz8ubWFwKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIGl0ZW0gPT0gJ3N0cmluZydcbiAgICAgICAgICAgICAgICAgICAgPyBpdGVtXG4gICAgICAgICAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5sYWJlbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcXVlc3Rpb24udHlwZSA9IGRlZmluaXRpb24udHlwZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHF1ZXN0aW9uO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBpbnF1aXJlci5wcm9tcHQocXVlc3Rpb25zKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiAodGhpcy5fd29ya2Zsb3cgPSB3b3JrZmxvdyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAvLyBSZXNvbHZlIHJlbGF0aXZlIGNvbGxlY3Rpb25zIGZyb20gdGhlIGxvY2F0aW9uIG9mIGBhbmd1bGFyLmpzb25gXG4gICAgY29uc3QgcmVzb2x2ZVJlbGF0aXZlQ29sbGVjdGlvbiA9IChjb2xsZWN0aW9uTmFtZTogc3RyaW5nKSA9PlxuICAgICAgY29sbGVjdGlvbk5hbWUuY2hhckF0KDApID09PSAnLidcbiAgICAgICAgPyByZXNvbHZlKHRoaXMuY29udGV4dC5yb290LCBjb2xsZWN0aW9uTmFtZSlcbiAgICAgICAgOiBjb2xsZWN0aW9uTmFtZTtcblxuICAgIGxldCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG5cbiAgICBpZiAod29ya3NwYWNlKSB7XG4gICAgICBjb25zdCBwcm9qZWN0ID0gZ2V0UHJvamVjdEJ5Q3dkKHdvcmtzcGFjZSk7XG4gICAgICBpZiAocHJvamVjdCAmJiB3b3Jrc3BhY2UuZ2V0UHJvamVjdENsaShwcm9qZWN0KSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHdvcmtzcGFjZS5nZXRQcm9qZWN0Q2xpKHByb2plY3QpWydkZWZhdWx0Q29sbGVjdGlvbiddO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmVSZWxhdGl2ZUNvbGxlY3Rpb24odmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAod29ya3NwYWNlLmdldENsaSgpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gd29ya3NwYWNlLmdldENsaSgpWydkZWZhdWx0Q29sbGVjdGlvbiddO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmVSZWxhdGl2ZUNvbGxlY3Rpb24odmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcbiAgICBpZiAod29ya3NwYWNlICYmIHdvcmtzcGFjZS5nZXRDbGkoKSkge1xuICAgICAgY29uc3QgdmFsdWUgPSB3b3Jrc3BhY2UuZ2V0Q2xpKClbJ2RlZmF1bHRDb2xsZWN0aW9uJ107XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiByZXNvbHZlUmVsYXRpdmVDb2xsZWN0aW9uKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5kZWZhdWx0Q29sbGVjdGlvbk5hbWU7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcnVuU2NoZW1hdGljKG9wdGlvbnM6IFJ1blNjaGVtYXRpY09wdGlvbnMpIHtcbiAgICBjb25zdCB7IHNjaGVtYXRpY09wdGlvbnMsIGRlYnVnLCBkcnlSdW4gfSA9IG9wdGlvbnM7XG4gICAgbGV0IHsgY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWUgfSA9IG9wdGlvbnM7XG5cbiAgICBsZXQgbm90aGluZ0RvbmUgPSB0cnVlO1xuICAgIGxldCBsb2dnaW5nUXVldWU6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IGVycm9yID0gZmFsc2U7XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IHRoaXMuX3dvcmtmbG93O1xuXG4gICAgY29uc3Qgd29ya2luZ0RpciA9IG5vcm1hbGl6ZShzeXN0ZW1QYXRoLnJlbGF0aXZlKHRoaXMuY29udGV4dC5yb290LCBwcm9jZXNzLmN3ZCgpKSk7XG5cbiAgICAvLyBHZXQgdGhlIG9wdGlvbiBvYmplY3QgZnJvbSB0aGUgc2NoZW1hdGljIHNjaGVtYS5cbiAgICBjb25zdCBzY2hlbWF0aWMgPSB0aGlzLmdldFNjaGVtYXRpYyhcbiAgICAgIHRoaXMuZ2V0Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSksXG4gICAgICBzY2hlbWF0aWNOYW1lLFxuICAgICAgdGhpcy5hbGxvd1ByaXZhdGVTY2hlbWF0aWNzLFxuICAgICk7XG4gICAgLy8gVXBkYXRlIHRoZSBzY2hlbWF0aWMgYW5kIGNvbGxlY3Rpb24gbmFtZSBpbiBjYXNlIHRoZXkncmUgbm90IHRoZSBzYW1lIGFzIHRoZSBvbmVzIHdlXG4gICAgLy8gcmVjZWl2ZWQgaW4gb3VyIG9wdGlvbnMsIGUuZy4gYWZ0ZXIgYWxpYXMgcmVzb2x1dGlvbiBvciBleHRlbnNpb24uXG4gICAgY29sbGVjdGlvbk5hbWUgPSBzY2hlbWF0aWMuY29sbGVjdGlvbi5kZXNjcmlwdGlvbi5uYW1lO1xuICAgIHNjaGVtYXRpY05hbWUgPSBzY2hlbWF0aWMuZGVzY3JpcHRpb24ubmFtZTtcblxuICAgIC8vIFNldCB0aGUgb3B0aW9ucyBvZiBmb3JtYXQgXCJwYXRoXCIuXG4gICAgbGV0IG86IE9wdGlvbltdIHwgbnVsbCA9IG51bGw7XG4gICAgbGV0IGFyZ3M6IEFyZ3VtZW50cztcblxuICAgIGlmICghc2NoZW1hdGljLmRlc2NyaXB0aW9uLnNjaGVtYUpzb24pIHtcbiAgICAgIGFyZ3MgPSBhd2FpdCB0aGlzLnBhcnNlRnJlZUZvcm1Bcmd1bWVudHMoc2NoZW1hdGljT3B0aW9ucyB8fCBbXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG8gPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMod29ya2Zsb3cucmVnaXN0cnksIHNjaGVtYXRpYy5kZXNjcmlwdGlvbi5zY2hlbWFKc29uKTtcbiAgICAgIGFyZ3MgPSBhd2FpdCB0aGlzLnBhcnNlQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnMgfHwgW10sIG8pO1xuICAgIH1cblxuICAgIGNvbnN0IGFsbG93QWRkaXRpb25hbFByb3BlcnRpZXMgPVxuICAgICAgdHlwZW9mIHNjaGVtYXRpYy5kZXNjcmlwdGlvbi5zY2hlbWFKc29uID09PSAnb2JqZWN0JyAmJlxuICAgICAgc2NoZW1hdGljLmRlc2NyaXB0aW9uLnNjaGVtYUpzb24uYWRkaXRpb25hbFByb3BlcnRpZXM7XG5cbiAgICBpZiAoYXJnc1snLS0nXSAmJiAhYWxsb3dBZGRpdGlvbmFsUHJvcGVydGllcykge1xuICAgICAgYXJnc1snLS0nXS5mb3JFYWNoKChhZGRpdGlvbmFsKSA9PiB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGBVbmtub3duIG9wdGlvbjogJyR7YWRkaXRpb25hbC5zcGxpdCgvPS8pWzBdfSdgKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXRoT3B0aW9ucyA9IG8gPyB0aGlzLnNldFBhdGhPcHRpb25zKG8sIHdvcmtpbmdEaXIpIDoge307XG4gICAgY29uc3QgaW5wdXQgPSB7XG4gICAgICAuLi5wYXRoT3B0aW9ucyxcbiAgICAgIC4uLmFyZ3MsXG4gICAgICAuLi5vcHRpb25zLmFkZGl0aW9uYWxPcHRpb25zLFxuICAgIH07XG5cbiAgICB3b3JrZmxvdy5yZXBvcnRlci5zdWJzY3JpYmUoKGV2ZW50OiBEcnlSdW5FdmVudCkgPT4ge1xuICAgICAgbm90aGluZ0RvbmUgPSBmYWxzZTtcblxuICAgICAgLy8gU3RyaXAgbGVhZGluZyBzbGFzaCB0byBwcmV2ZW50IGNvbmZ1c2lvbi5cbiAgICAgIGNvbnN0IGV2ZW50UGF0aCA9IGV2ZW50LnBhdGguc3RhcnRzV2l0aCgnLycpID8gZXZlbnQucGF0aC5zdWJzdHIoMSkgOiBldmVudC5wYXRoO1xuXG4gICAgICBzd2l0Y2ggKGV2ZW50LmtpbmQpIHtcbiAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgIGVycm9yID0gdHJ1ZTtcbiAgICAgICAgICBjb25zdCBkZXNjID0gZXZlbnQuZGVzY3JpcHRpb24gPT0gJ2FscmVhZHlFeGlzdCcgPyAnYWxyZWFkeSBleGlzdHMnIDogJ2RvZXMgbm90IGV4aXN0Lic7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgRVJST1IhICR7ZXZlbnRQYXRofSAke2Rlc2N9LmApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5wdXNoKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgICR7Y29sb3JzLmN5YW4oJ1VQREFURScpfSAke2V2ZW50UGF0aH0gKCR7ZXZlbnQuY29udGVudC5sZW5ndGh9IGJ5dGVzKVxuICAgICAgICAgIGApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjcmVhdGUnOlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5wdXNoKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgICR7Y29sb3JzLmdyZWVuKCdDUkVBVEUnKX0gJHtldmVudFBhdGh9ICgke2V2ZW50LmNvbnRlbnQubGVuZ3RofSBieXRlcylcbiAgICAgICAgICBgKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICBsb2dnaW5nUXVldWUucHVzaChgJHtjb2xvcnMueWVsbG93KCdERUxFVEUnKX0gJHtldmVudFBhdGh9YCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3JlbmFtZSc6XG4gICAgICAgICAgY29uc3QgZXZlbnRUb1BhdGggPSBldmVudC50by5zdGFydHNXaXRoKCcvJykgPyBldmVudC50by5zdWJzdHIoMSkgOiBldmVudC50bztcbiAgICAgICAgICBsb2dnaW5nUXVldWUucHVzaChgJHtjb2xvcnMuYmx1ZSgnUkVOQU1FJyl9ICR7ZXZlbnRQYXRofSA9PiAke2V2ZW50VG9QYXRofWApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgd29ya2Zsb3cubGlmZUN5Y2xlLnN1YnNjcmliZSgoZXZlbnQpID0+IHtcbiAgICAgIGlmIChldmVudC5raW5kID09ICdlbmQnIHx8IGV2ZW50LmtpbmQgPT0gJ3Bvc3QtdGFza3Mtc3RhcnQnKSB7XG4gICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAvLyBPdXRwdXQgdGhlIGxvZ2dpbmcgcXVldWUsIG5vIGVycm9yIGhhcHBlbmVkLlxuICAgICAgICAgIGxvZ2dpbmdRdWV1ZS5mb3JFYWNoKChsb2cpID0+IHRoaXMubG9nZ2VyLmluZm8obG9nKSk7XG4gICAgICAgIH1cblxuICAgICAgICBsb2dnaW5nUXVldWUgPSBbXTtcbiAgICAgICAgZXJyb3IgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFRlbXBvcmFyeSBjb21wYXRpYmlsaXR5IGNoZWNrIGZvciBOUE0gN1xuICAgIGlmIChjb2xsZWN0aW9uTmFtZSA9PT0gJ0BzY2hlbWF0aWNzL2FuZ3VsYXInICYmIHNjaGVtYXRpY05hbWUgPT09ICduZy1uZXcnKSB7XG4gICAgICBpZiAoXG4gICAgICAgICFpbnB1dC5za2lwSW5zdGFsbCAmJlxuICAgICAgICAoaW5wdXQucGFja2FnZU1hbmFnZXIgPT09IHVuZGVmaW5lZCB8fCBpbnB1dC5wYWNrYWdlTWFuYWdlciA9PT0gJ25wbScpXG4gICAgICApIHtcbiAgICAgICAgYXdhaXQgZW5zdXJlQ29tcGF0aWJsZU5wbSh0aGlzLmNvbnRleHQucm9vdCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPG51bWJlciB8IHZvaWQ+KChyZXNvbHZlKSA9PiB7XG4gICAgICB3b3JrZmxvd1xuICAgICAgICAuZXhlY3V0ZSh7XG4gICAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgICAgc2NoZW1hdGljOiBzY2hlbWF0aWNOYW1lLFxuICAgICAgICAgIG9wdGlvbnM6IGlucHV0LFxuICAgICAgICAgIGRlYnVnOiBkZWJ1ZyxcbiAgICAgICAgICBsb2dnZXI6IHRoaXMubG9nZ2VyLFxuICAgICAgICAgIGFsbG93UHJpdmF0ZTogdGhpcy5hbGxvd1ByaXZhdGVTY2hlbWF0aWNzLFxuICAgICAgICB9KVxuICAgICAgICAuc3Vic2NyaWJlKHtcbiAgICAgICAgICBlcnJvcjogKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgIC8vIEluIGNhc2UgdGhlIHdvcmtmbG93IHdhcyBub3Qgc3VjY2Vzc2Z1bCwgc2hvdyBhbiBhcHByb3ByaWF0ZSBlcnJvciBtZXNzYWdlLlxuICAgICAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uKSB7XG4gICAgICAgICAgICAgIC8vIFwiU2VlIGFib3ZlXCIgYmVjYXVzZSB3ZSBhbHJlYWR5IHByaW50ZWQgdGhlIGVycm9yLlxuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbCgnVGhlIFNjaGVtYXRpYyB3b3JrZmxvdyBmYWlsZWQuIFNlZSBhYm92ZS4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGVidWcpIHtcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYEFuIGVycm9yIG9jY3VycmVkOlxcbiR7ZXJyLm1lc3NhZ2V9XFxuJHtlcnIuc3RhY2t9YCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlc29sdmUoMSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2hvd05vdGhpbmdEb25lID0gIShvcHRpb25zLnNob3dOb3RoaW5nRG9uZSA9PT0gZmFsc2UpO1xuICAgICAgICAgICAgaWYgKG5vdGhpbmdEb25lICYmIHNob3dOb3RoaW5nRG9uZSkge1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKCdOb3RoaW5nIHRvIGJlIGRvbmUuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZHJ5UnVuKSB7XG4gICAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYFxcbk5PVEU6IFRoZSBcImRyeVJ1blwiIGZsYWcgbWVhbnMgbm8gY2hhbmdlcyB3ZXJlIG1hZGUuYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcGFyc2VGcmVlRm9ybUFyZ3VtZW50cyhzY2hlbWF0aWNPcHRpb25zOiBzdHJpbmdbXSkge1xuICAgIHJldHVybiBwYXJzZUZyZWVGb3JtQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHBhcnNlQXJndW1lbnRzKFxuICAgIHNjaGVtYXRpY09wdGlvbnM6IHN0cmluZ1tdLFxuICAgIG9wdGlvbnM6IE9wdGlvbltdIHwgbnVsbCxcbiAgKTogUHJvbWlzZTxBcmd1bWVudHM+IHtcbiAgICByZXR1cm4gcGFyc2VBcmd1bWVudHMoc2NoZW1hdGljT3B0aW9ucywgb3B0aW9ucywgdGhpcy5sb2dnZXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFByb2plY3RzQnlQYXRoKFxuICB3b3Jrc3BhY2U6IHdvcmtzcGFjZXMuV29ya3NwYWNlRGVmaW5pdGlvbixcbiAgcGF0aDogc3RyaW5nLFxuICByb290OiBzdHJpbmcsXG4pOiBzdHJpbmdbXSB7XG4gIGlmICh3b3Jrc3BhY2UucHJvamVjdHMuc2l6ZSA9PT0gMSkge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHdvcmtzcGFjZS5wcm9qZWN0cy5rZXlzKCkpO1xuICB9XG5cbiAgY29uc3QgaXNJbnNpZGUgPSAoYmFzZTogc3RyaW5nLCBwb3RlbnRpYWw6IHN0cmluZyk6IGJvb2xlYW4gPT4ge1xuICAgIGNvbnN0IGFic29sdXRlQmFzZSA9IHN5c3RlbVBhdGgucmVzb2x2ZShyb290LCBiYXNlKTtcbiAgICBjb25zdCBhYnNvbHV0ZVBvdGVudGlhbCA9IHN5c3RlbVBhdGgucmVzb2x2ZShyb290LCBwb3RlbnRpYWwpO1xuICAgIGNvbnN0IHJlbGF0aXZlUG90ZW50aWFsID0gc3lzdGVtUGF0aC5yZWxhdGl2ZShhYnNvbHV0ZUJhc2UsIGFic29sdXRlUG90ZW50aWFsKTtcbiAgICBpZiAoIXJlbGF0aXZlUG90ZW50aWFsLnN0YXJ0c1dpdGgoJy4uJykgJiYgIXN5c3RlbVBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZVBvdGVudGlhbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICBjb25zdCBwcm9qZWN0cyA9IEFycmF5LmZyb20od29ya3NwYWNlLnByb2plY3RzLmVudHJpZXMoKSlcbiAgICAubWFwKChbbmFtZSwgcHJvamVjdF0pID0+IFtzeXN0ZW1QYXRoLnJlc29sdmUocm9vdCwgcHJvamVjdC5yb290KSwgbmFtZV0gYXMgW3N0cmluZywgc3RyaW5nXSlcbiAgICAuZmlsdGVyKCh0dXBsZSkgPT4gaXNJbnNpZGUodHVwbGVbMF0sIHBhdGgpKVxuICAgIC8vIFNvcnQgdHVwbGVzIGJ5IGRlcHRoLCB3aXRoIHRoZSBkZWVwZXIgb25lcyBmaXJzdC4gU2luY2UgdGhlIGZpcnN0IG1lbWJlciBpcyBhIHBhdGggYW5kXG4gICAgLy8gd2UgZmlsdGVyZWQgYWxsIGludmFsaWQgcGF0aHMsIHRoZSBsb25nZXN0IHdpbGwgYmUgdGhlIGRlZXBlc3QgKGFuZCBpbiBjYXNlIG9mIGVxdWFsaXR5XG4gICAgLy8gdGhlIHNvcnQgaXMgc3RhYmxlIGFuZCB0aGUgZmlyc3QgZGVjbGFyZWQgcHJvamVjdCB3aWxsIHdpbikuXG4gICAgLnNvcnQoKGEsIGIpID0+IGJbMF0ubGVuZ3RoIC0gYVswXS5sZW5ndGgpO1xuXG4gIGlmIChwcm9qZWN0cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gW3Byb2plY3RzWzBdWzFdXTtcbiAgfSBlbHNlIGlmIChwcm9qZWN0cy5sZW5ndGggPiAxKSB7XG4gICAgY29uc3QgZmlyc3RQYXRoID0gcHJvamVjdHNbMF1bMF07XG5cbiAgICByZXR1cm4gcHJvamVjdHMuZmlsdGVyKCh2KSA9PiB2WzBdID09PSBmaXJzdFBhdGgpLm1hcCgodikgPT4gdlsxXSk7XG4gIH1cblxuICByZXR1cm4gW107XG59XG4iXX0=