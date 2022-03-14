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
        let workspace = await (0, config_1.getWorkspace)('local');
        if (workspace) {
            const project = (0, config_1.getProjectByCwd)(workspace);
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
        workspace = await (0, config_1.getWorkspace)('global');
        if (workspace && workspace.getCli()) {
            const value = workspace.getCli()['defaultCollection'];
            if (typeof value == 'string') {
                return value;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvc2NoZW1hdGljLWNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBNkY7QUFDN0YsMkRBS29DO0FBQ3BDLDREQUswQztBQUMxQyxtREFBcUM7QUFDckMsaURBQW1DO0FBQ25DLDhDQUE0QztBQUM1QyxnREFBMEY7QUFDMUYsMERBQW9FO0FBQ3BFLGtFQUFzRjtBQUN0RiwwQ0FBeUM7QUFDekMsMkNBQTREO0FBQzVELHVDQUF3RDtBQUV4RCxxQ0FBa0U7QUFDbEUsbUVBQThEO0FBbUI5RCxNQUFhLHNCQUF1QixTQUFRLEtBQUs7SUFDL0MsWUFBWSxjQUFzQjtRQUNoQyxLQUFLLENBQUMsdUJBQXVCLGNBQWMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNGO0FBSkQsd0RBSUM7QUFFRCxNQUFzQixnQkFFcEIsU0FBUSxpQkFBVTtJQVNsQixZQUFZLE9BQXVCLEVBQUUsV0FBK0IsRUFBRSxNQUFzQjtRQUMxRixLQUFLLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQVRuQiwyQkFBc0IsR0FBWSxLQUFLLENBQUM7UUFDL0IsdUJBQWtCLEdBQUcsS0FBSyxDQUFDO1FBRzdDLDBCQUFxQixHQUFHLHFCQUFxQixDQUFDO1FBQzlDLG1CQUFjLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDO0lBS3RELENBQUM7SUFFZSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQXNCO1FBQ3JELE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVuQyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDdEIsbUJBQW1CO1lBQ25CLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDMUUsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFBLHNDQUF3QixFQUM1QyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFDdkIsU0FBUyxDQUFDLFdBQVcsQ0FBQyxVQUFVLElBQUksRUFBRSxDQUN2QyxDQUFDO1lBRUYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUM7WUFDakUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUVuRSwrRUFBK0U7WUFDL0UsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRTtnQkFDeEMsSUFBSSxDQUFDLENBQUMsYUFBYSxJQUFJLENBQUMsSUFBQSx5Q0FBNkIsRUFBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUU7b0JBQzFFLENBQUMsQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFDO2lCQUM3QjthQUNGO1NBQ0Y7SUFDSCxDQUFDO0lBRWUsS0FBSyxDQUFDLFNBQVM7UUFDN0IsTUFBTSxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFckIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVsRixJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUU7WUFDdEQsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFakUsSUFBSSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBRTFDLE1BQU0sa0JBQWtCLEdBQThCLEVBQUUsQ0FBQztZQUN6RCxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQzlCLElBQUksQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELElBQUksQ0FBQyxhQUFhLEVBQUU7b0JBQ2xCLGFBQWEsR0FBRyxjQUFjLENBQUM7b0JBQy9CLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDO2lCQUN0QztnQkFFRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLEVBQUU7b0JBQ3ZDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztpQkFDekM7Z0JBRUQsa0JBQWtCLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3pELENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFDO1lBQ3JFLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtnQkFDekQsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLElBQUksY0FBYyxDQUFDO2dCQUN0RCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsY0FBYyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUV0RixrQkFBa0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxhQUFhLEVBQUUsRUFBRTtvQkFDM0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxhQUFhLEVBQUUsQ0FBQyxDQUFDO2dCQUMzQyxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFFRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFUSxLQUFLLENBQUMsY0FBYztRQUMzQixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWxGLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRTtZQUN0RCxPQUFPO1NBQ1I7UUFFRCxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2pFLElBQUksY0FBYyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUUvQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssU0FBUyxDQUFDLENBQUM7WUFDaEYsTUFBTSxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXhFLG9GQUFvRjtZQUNwRix5Q0FBeUM7WUFDekMsTUFBTSxXQUFXLEdBQ2YsY0FBYyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQztnQkFDNUQsQ0FBQyxDQUFDLGFBQWE7Z0JBQ2YsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV4QixNQUFNLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDakYsTUFBTSxhQUFhLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDO1lBQ2pGLE1BQU0sVUFBVSxHQUNkLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFDdEIsQ0FBQyxDQUFDLEdBQUcsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGNBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO2dCQUM1RSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBRVQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FBQTtvQkFDZixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxXQUFXLEdBQUcsVUFBVTtVQUMzRCxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFO09BQ3JDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ3RCO2FBQU07WUFDTCxNQUFNLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztTQUM5QjtJQUNILENBQUM7SUFFUyxTQUFTO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7SUFDL0IsQ0FBQztJQUVTLGFBQWEsQ0FBQyxjQUFzQjtRQUM1QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEMsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRTNELElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtZQUN2QixNQUFNLElBQUksc0JBQXNCLENBQUMsY0FBYyxDQUFDLENBQUM7U0FDbEQ7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBRVMsWUFBWSxDQUNwQixVQUFnQyxFQUNoQyxhQUFxQixFQUNyQixZQUFzQjtRQUV0QixPQUFPLFVBQVUsQ0FBQyxlQUFlLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFUyxjQUFjLENBQUMsT0FBaUIsRUFBRSxVQUFrQjtRQUM1RCxJQUFJLFVBQVUsS0FBSyxFQUFFLEVBQUU7WUFDckIsT0FBTyxFQUFFLENBQUM7U0FDWDtRQUVELE9BQU8sT0FBTzthQUNYLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUM7YUFDbEMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO2FBQ2xCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNwQixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDO1lBRXZCLE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQyxFQUFFLEVBQWdDLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDTyxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQTRCO1FBQ3pELElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNsQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7U0FDdkI7UUFFRCxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUNsQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFZLENBQUMsSUFBSSxFQUFFO1lBQ3RDLEtBQUs7WUFDTCxNQUFNO1lBQ04sY0FBYyxFQUFFLE1BQU0sSUFBQSxtQ0FBaUIsRUFBQyxJQUFJLENBQUM7WUFDN0MsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlO1lBQ3hDLDBFQUEwRTtZQUMxRSxRQUFRLEVBQUUsSUFBSSxhQUFNLENBQUMsa0JBQWtCLENBQUMsb0JBQU8sQ0FBQyxlQUFlLENBQUM7WUFDaEUsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUMxQixDQUFDLENBQUMsWUFBWTtvQkFDWixJQUFJLENBQUMsY0FBYyxLQUFLLElBQUksQ0FBQyxxQkFBcUI7d0JBQ2xELENBQUMsQ0FBQyxzRUFBc0U7NEJBQ3RFLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUM7d0JBQ2xDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDO2dCQUNwQyxDQUFDLENBQUMsU0FBUztvQkFDVCxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDOUIsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixnQkFBZ0IsRUFBRTtnQkFDaEIsa0NBQWtDO2dCQUNsQyxLQUFLLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxFQUFFO29CQUMzQixNQUFNLFdBQVcsR0FDZixPQUFRLE9BQW1DLENBQUMsT0FBTyxLQUFLLFFBQVE7d0JBQzlELENBQUMsQ0FBRyxPQUFtQyxDQUFDLE9BQWtCO3dCQUMxRCxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBRXZCLE9BQU87d0JBQ0wsR0FBRyxDQUFDLE1BQU0sSUFBQSw2QkFBb0IsRUFBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO3dCQUN2RixHQUFHLE9BQU87cUJBQ1gsQ0FBQztnQkFDSixDQUFDO2FBQ0Y7WUFDRCxpQkFBaUIsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSwyQ0FBbUIsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO1NBQzlFLENBQUMsQ0FBQztRQUVILE1BQU0sY0FBYyxHQUFHLEdBQUcsRUFBRTtZQUMxQixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQ2xCLE1BQU0sWUFBWSxHQUFHLGlCQUFpQixDQUNwQyxJQUFJLENBQUMsU0FBUyxFQUNkLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFDYixJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FDeEIsQ0FBQztnQkFFRixJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO29CQUM3QixPQUFPLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDeEI7cUJBQU07b0JBQ0wsSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTt3QkFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FBQTs7OzthQUk1QixDQUFDLENBQUM7cUJBQ0o7b0JBRUQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO29CQUN2RSxJQUFJLE9BQU8sa0JBQWtCLEtBQUssUUFBUSxJQUFJLGtCQUFrQixFQUFFO3dCQUNoRSxPQUFPLGtCQUFrQixDQUFDO3FCQUMzQjtpQkFDRjthQUNGO1lBRUQsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQyxDQUFDO1FBRUYsUUFBUSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFNLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0UsUUFBUSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDekUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUV6RSxJQUFJLHFCQUFxQixHQUFHLElBQUksQ0FBQztRQUNqQyxRQUFRLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDaEUsSUFBSSxxQkFBcUIsRUFBRTtnQkFDekIscUJBQXFCLEdBQUcsS0FBSyxDQUFDO2dCQUM5QixNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQW9CLENBQUMsQ0FBQzthQUMzRTtZQUVELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxPQUFPLENBQUMsV0FBVyxLQUFLLEtBQUssSUFBSSxJQUFBLFdBQUssR0FBRSxFQUFFO1lBQzVDLFFBQVEsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxXQUEyQyxFQUFFLEVBQUU7Z0JBQ2xGLE1BQU0sU0FBUyxHQUFnQyxXQUFXO3FCQUN2RCxNQUFNLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsSUFBSSxVQUFVLENBQUMsT0FBTyxLQUFLLFNBQVMsQ0FBQztxQkFDN0UsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7O29CQUNsQixNQUFNLFFBQVEsR0FBc0I7d0JBQ2xDLElBQUksRUFBRSxVQUFVLENBQUMsRUFBRTt3QkFDbkIsT0FBTyxFQUFFLFVBQVUsQ0FBQyxPQUFPO3dCQUMzQixPQUFPLEVBQUUsVUFBVSxDQUFDLE9BQU87cUJBQzVCLENBQUM7b0JBRUYsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQztvQkFDdkMsSUFBSSxTQUFTLEVBQUU7d0JBQ2IsUUFBUSxDQUFDLFFBQVEsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUVoRCxnRUFBZ0U7d0JBQ2hFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFOzRCQUNoQyxLQUFLLE1BQU0sSUFBSSxJQUFJLFVBQVUsQ0FBQyxhQUFhLEVBQUU7Z0NBQzNDLElBQUksS0FBSyxDQUFDO2dDQUNWLFFBQVEsSUFBSSxFQUFFO29DQUNaLEtBQUssUUFBUTt3Q0FDWCxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dDQUN0QixNQUFNO29DQUNSLEtBQUssU0FBUyxDQUFDO29DQUNmLEtBQUssUUFBUTt3Q0FDWCxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dDQUN0QixNQUFNO29DQUNSO3dDQUNFLEtBQUssR0FBRyxLQUFLLENBQUM7d0NBQ2QsTUFBTTtpQ0FDVDtnQ0FDRCxzQ0FBc0M7Z0NBQ3RDLE1BQU0sT0FBTyxHQUFHLENBQUMsTUFBTSxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUM7Z0NBQ2xELElBQUksT0FBTyxFQUFFO29DQUNYLE9BQU8sS0FBSyxDQUFDO2lDQUNkOzZCQUNGOzRCQUVELE9BQU8sS0FBSyxDQUFDO3dCQUNmLENBQUMsQ0FBQztxQkFDSDtvQkFFRCxRQUFRLFVBQVUsQ0FBQyxJQUFJLEVBQUU7d0JBQ3ZCLEtBQUssY0FBYzs0QkFDakIsUUFBUSxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7NEJBQzFCLE1BQU07d0JBQ1IsS0FBSyxNQUFNOzRCQUNULFFBQVEsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7NEJBQzVELFFBQXNDLENBQUMsT0FBTyxHQUFHLE1BQUEsVUFBVSxDQUFDLEtBQUssMENBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0NBQy9FLE9BQU8sT0FBTyxJQUFJLElBQUksUUFBUTtvQ0FDNUIsQ0FBQyxDQUFDLElBQUk7b0NBQ04sQ0FBQyxDQUFDO3dDQUNFLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSzt3Q0FDaEIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO3FDQUNsQixDQUFDOzRCQUNSLENBQUMsQ0FBQyxDQUFDOzRCQUNILE1BQU07d0JBQ1I7NEJBQ0UsUUFBUSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDOzRCQUNoQyxNQUFNO3FCQUNUO29CQUVELE9BQU8sUUFBUSxDQUFDO2dCQUNsQixDQUFDLENBQUMsQ0FBQztnQkFFTCxPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDcEMsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFUyxLQUFLLENBQUMsNkJBQTZCO1FBQzNDLElBQUksU0FBUyxHQUFHLE1BQU0sSUFBQSxxQkFBWSxFQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTVDLElBQUksU0FBUyxFQUFFO1lBQ2IsTUFBTSxPQUFPLEdBQUcsSUFBQSx3QkFBZSxFQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzNDLElBQUksT0FBTyxJQUFJLFNBQVMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQy9DLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFDcEUsSUFBSSxPQUFPLEtBQUssSUFBSSxRQUFRLEVBQUU7b0JBQzVCLE9BQU8sS0FBSyxDQUFDO2lCQUNkO2FBQ0Y7WUFDRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDdEIsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3RELElBQUksT0FBTyxLQUFLLElBQUksUUFBUSxFQUFFO29CQUM1QixPQUFPLEtBQUssQ0FBQztpQkFDZDthQUNGO1NBQ0Y7UUFFRCxTQUFTLEdBQUcsTUFBTSxJQUFBLHFCQUFZLEVBQUMsUUFBUSxDQUFDLENBQUM7UUFDekMsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ25DLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQ3RELElBQUksT0FBTyxLQUFLLElBQUksUUFBUSxFQUFFO2dCQUM1QixPQUFPLEtBQUssQ0FBQzthQUNkO1NBQ0Y7UUFFRCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztJQUNwQyxDQUFDO0lBRVMsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUE0QjtRQUN2RCxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUNwRCxJQUFJLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUVoRCxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDdkIsSUFBSSxZQUFZLEdBQWEsRUFBRSxDQUFDO1FBQ2hDLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztRQUVsQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBRWhDLE1BQU0sVUFBVSxHQUFHLElBQUEsZ0JBQVMsRUFBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFcEYsbURBQW1EO1FBQ25ELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQ2pDLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLEVBQ2xDLGFBQWEsRUFDYixJQUFJLENBQUMsc0JBQXNCLENBQzVCLENBQUM7UUFDRix1RkFBdUY7UUFDdkYscUVBQXFFO1FBQ3JFLGNBQWMsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7UUFDdkQsYUFBYSxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO1FBRTNDLG9DQUFvQztRQUNwQyxJQUFJLENBQUMsR0FBb0IsSUFBSSxDQUFDO1FBQzlCLElBQUksSUFBZSxDQUFDO1FBRXBCLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRTtZQUNyQyxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsc0JBQXNCLENBQUMsZ0JBQWdCLElBQUksRUFBRSxDQUFDLENBQUM7U0FDbEU7YUFBTTtZQUNMLENBQUMsR0FBRyxNQUFNLElBQUEsc0NBQXdCLEVBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3hGLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzdEO1FBRUQsTUFBTSx5QkFBeUIsR0FDN0IsT0FBTyxTQUFTLENBQUMsV0FBVyxDQUFDLFVBQVUsS0FBSyxRQUFRO1lBQ3BELFNBQVMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDO1FBRXhELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUU7WUFDNUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO2dCQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckUsQ0FBQyxDQUFDLENBQUM7WUFFSCxPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2hFLE1BQU0sS0FBSyxHQUFHO1lBQ1osR0FBRyxXQUFXO1lBQ2QsR0FBRyxJQUFJO1lBQ1AsR0FBRyxPQUFPLENBQUMsaUJBQWlCO1NBQzdCLENBQUM7UUFFRixRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQWtCLEVBQUUsRUFBRTtZQUNqRCxXQUFXLEdBQUcsS0FBSyxDQUFDO1lBRXBCLDRDQUE0QztZQUM1QyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFFakYsUUFBUSxLQUFLLENBQUMsSUFBSSxFQUFFO2dCQUNsQixLQUFLLE9BQU87b0JBQ1YsS0FBSyxHQUFHLElBQUksQ0FBQztvQkFDYixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsV0FBVyxJQUFJLGNBQWMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO29CQUN4RixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLFNBQVMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO29CQUNqRCxNQUFNO2dCQUNSLEtBQUssUUFBUTtvQkFDWCxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBQyxPQUFPLENBQUE7Y0FDMUIsY0FBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxTQUFTLEtBQUssS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNO1dBQzlELENBQUMsQ0FBQztvQkFDSCxNQUFNO2dCQUNSLEtBQUssUUFBUTtvQkFDWCxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBQyxPQUFPLENBQUE7Y0FDMUIsY0FBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxTQUFTLEtBQUssS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNO1dBQy9ELENBQUMsQ0FBQztvQkFDSCxNQUFNO2dCQUNSLEtBQUssUUFBUTtvQkFDWCxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsY0FBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFDO29CQUM3RCxNQUFNO2dCQUNSLEtBQUssUUFBUTtvQkFDWCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQzdFLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxjQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLFNBQVMsT0FBTyxXQUFXLEVBQUUsQ0FBQyxDQUFDO29CQUM3RSxNQUFNO2FBQ1Q7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDckMsSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLGtCQUFrQixFQUFFO2dCQUMzRCxJQUFJLENBQUMsS0FBSyxFQUFFO29CQUNWLCtDQUErQztvQkFDL0MsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztpQkFDdEQ7Z0JBRUQsWUFBWSxHQUFHLEVBQUUsQ0FBQztnQkFDbEIsS0FBSyxHQUFHLEtBQUssQ0FBQzthQUNmO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCwwQ0FBMEM7UUFDMUMsSUFBSSxjQUFjLEtBQUsscUJBQXFCLElBQUksYUFBYSxLQUFLLFFBQVEsRUFBRTtZQUMxRSxJQUNFLENBQUMsS0FBSyxDQUFDLFdBQVc7Z0JBQ2xCLENBQUMsS0FBSyxDQUFDLGNBQWMsS0FBSyxTQUFTLElBQUksS0FBSyxDQUFDLGNBQWMsS0FBSyxLQUFLLENBQUMsRUFDdEU7Z0JBQ0EsTUFBTSxJQUFBLHFDQUFtQixFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDOUM7U0FDRjtRQUVELE9BQU8sSUFBSSxPQUFPLENBQWdCLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDNUMsUUFBUTtpQkFDTCxPQUFPLENBQUM7Z0JBQ1AsVUFBVSxFQUFFLGNBQWM7Z0JBQzFCLFNBQVMsRUFBRSxhQUFhO2dCQUN4QixPQUFPLEVBQUUsS0FBSztnQkFDZCxLQUFLLEVBQUUsS0FBSztnQkFDWixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLFlBQVksRUFBRSxJQUFJLENBQUMsc0JBQXNCO2FBQzFDLENBQUM7aUJBQ0QsU0FBUyxDQUFDO2dCQUNULEtBQUssRUFBRSxDQUFDLEdBQVUsRUFBRSxFQUFFO29CQUNwQiw4RUFBOEU7b0JBQzlFLElBQUksR0FBRyxZQUFZLDBDQUE2QixFQUFFO3dCQUNoRCxvREFBb0Q7d0JBQ3BELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7cUJBQ2hFO3lCQUFNLElBQUksS0FBSyxFQUFFO3dCQUNoQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsR0FBRyxDQUFDLE9BQU8sS0FBSyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztxQkFDdkU7eUJBQU07d0JBQ0wsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO3FCQUNoQztvQkFFRCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsQ0FBQztnQkFDRCxRQUFRLEVBQUUsR0FBRyxFQUFFO29CQUNiLE1BQU0sZUFBZSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxLQUFLLEtBQUssQ0FBQyxDQUFDO29CQUM3RCxJQUFJLFdBQVcsSUFBSSxlQUFlLEVBQUU7d0JBQ2xDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7cUJBQ3pDO29CQUNELElBQUksTUFBTSxFQUFFO3dCQUNWLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHVEQUF1RCxDQUFDLENBQUM7cUJBQzNFO29CQUNELE9BQU8sRUFBRSxDQUFDO2dCQUNaLENBQUM7YUFDRixDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFUyxLQUFLLENBQUMsc0JBQXNCLENBQUMsZ0JBQTBCO1FBQy9ELE9BQU8sSUFBQSwrQkFBc0IsRUFBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFUyxLQUFLLENBQUMsY0FBYyxDQUM1QixnQkFBMEIsRUFDMUIsT0FBd0I7UUFFeEIsT0FBTyxJQUFBLHVCQUFjLEVBQUMsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNoRSxDQUFDO0NBQ0Y7QUF0ZkQsNENBc2ZDO0FBRUQsU0FBUyxpQkFBaUIsQ0FDeEIsU0FBeUMsRUFDekMsSUFBWSxFQUNaLElBQVk7SUFFWixJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTtRQUNqQyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0tBQzlDO0lBRUQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFZLEVBQUUsU0FBaUIsRUFBVyxFQUFFO1FBQzVELE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BELE1BQU0saUJBQWlCLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUQsTUFBTSxpQkFBaUIsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7WUFDcEYsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyxDQUFDO0lBRUYsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQ3RELEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQXFCLENBQUM7U0FDNUYsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLHlGQUF5RjtRQUN6RiwwRkFBMEY7UUFDMUYsK0RBQStEO1NBQzlELElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRTdDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDekIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3pCO1NBQU0sSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUM5QixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakMsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNwRTtJQUVELE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBsb2dnaW5nLCBub3JtYWxpemUsIHNjaGVtYSwgc3RyaW5ncywgdGFncywgd29ya3NwYWNlcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIERyeVJ1bkV2ZW50LFxuICBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbixcbiAgZm9ybWF0cyxcbiAgd29ya2Zsb3csXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7XG4gIEZpbGVTeXN0ZW1Db2xsZWN0aW9uLFxuICBGaWxlU3lzdGVtRW5naW5lLFxuICBGaWxlU3lzdGVtU2NoZW1hdGljLFxuICBOb2RlV29ya2Zsb3csXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCAqIGFzIGlucXVpcmVyIGZyb20gJ2lucXVpcmVyJztcbmltcG9ydCAqIGFzIHN5c3RlbVBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgZ2V0UHJvamVjdEJ5Q3dkLCBnZXRTY2hlbWF0aWNEZWZhdWx0cywgZ2V0V29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMgfSBmcm9tICcuLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuaW1wb3J0IHsgZW5zdXJlQ29tcGF0aWJsZU5wbSwgZ2V0UGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi91dGlsaXRpZXMvcGFja2FnZS1tYW5hZ2VyJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3R0eSc7XG5pbXBvcnQgeyBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyB9IGZyb20gJy4vYW5hbHl0aWNzJztcbmltcG9ydCB7IEJhc2VDb21tYW5kT3B0aW9ucywgQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZCc7XG5pbXBvcnQgeyBBcmd1bWVudHMsIENvbW1hbmRDb250ZXh0LCBDb21tYW5kRGVzY3JpcHRpb24sIE9wdGlvbiB9IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB7IHBhcnNlQXJndW1lbnRzLCBwYXJzZUZyZWVGb3JtQXJndW1lbnRzIH0gZnJvbSAnLi9wYXJzZXInO1xuaW1wb3J0IHsgU2NoZW1hdGljRW5naW5lSG9zdCB9IGZyb20gJy4vc2NoZW1hdGljLWVuZ2luZS1ob3N0JztcblxuZXhwb3J0IGludGVyZmFjZSBCYXNlU2NoZW1hdGljU2NoZW1hIHtcbiAgZGVidWc/OiBib29sZWFuO1xuICBkcnlSdW4/OiBib29sZWFuO1xuICBmb3JjZT86IGJvb2xlYW47XG4gIGludGVyYWN0aXZlPzogYm9vbGVhbjtcbiAgZGVmYXVsdHM/OiBib29sZWFuO1xuICBwYWNrYWdlUmVnaXN0cnk/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuU2NoZW1hdGljT3B0aW9ucyBleHRlbmRzIEJhc2VTY2hlbWF0aWNTY2hlbWEge1xuICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICBzY2hlbWF0aWNOYW1lOiBzdHJpbmc7XG4gIGFkZGl0aW9uYWxPcHRpb25zPzogeyBba2V5OiBzdHJpbmddOiB7fSB9O1xuICBzY2hlbWF0aWNPcHRpb25zPzogc3RyaW5nW107XG4gIHNob3dOb3RoaW5nRG9uZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBVbmtub3duQ29sbGVjdGlvbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcihjb2xsZWN0aW9uTmFtZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoYEludmFsaWQgY29sbGVjdGlvbiAoJHtjb2xsZWN0aW9uTmFtZX0pLmApO1xuICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTY2hlbWF0aWNDb21tYW5kPFxuICBUIGV4dGVuZHMgQmFzZVNjaGVtYXRpY1NjaGVtYSAmIEJhc2VDb21tYW5kT3B0aW9ucyxcbj4gZXh0ZW5kcyBDb21tYW5kPFQ+IHtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGFsbG93UHJpdmF0ZVNjaGVtYXRpY3M6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIHJlYWRvbmx5IHVzZVJlcG9ydEFuYWx5dGljcyA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgX3dvcmtmbG93ITogTm9kZVdvcmtmbG93O1xuXG4gIHByb3RlY3RlZCBkZWZhdWx0Q29sbGVjdGlvbk5hbWUgPSAnQHNjaGVtYXRpY3MvYW5ndWxhcic7XG4gIHByb3RlY3RlZCBjb2xsZWN0aW9uTmFtZSA9IHRoaXMuZGVmYXVsdENvbGxlY3Rpb25OYW1lO1xuICBwcm90ZWN0ZWQgc2NoZW1hdGljTmFtZT86IHN0cmluZztcblxuICBjb25zdHJ1Y3Rvcihjb250ZXh0OiBDb21tYW5kQ29udGV4dCwgZGVzY3JpcHRpb246IENvbW1hbmREZXNjcmlwdGlvbiwgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcikge1xuICAgIHN1cGVyKGNvbnRleHQsIGRlc2NyaXB0aW9uLCBsb2dnZXIpO1xuICB9XG5cbiAgcHVibGljIG92ZXJyaWRlIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogVCAmIEFyZ3VtZW50cykge1xuICAgIGF3YWl0IHRoaXMuY3JlYXRlV29ya2Zsb3cob3B0aW9ucyk7XG5cbiAgICBpZiAodGhpcy5zY2hlbWF0aWNOYW1lKSB7XG4gICAgICAvLyBTZXQgdGhlIG9wdGlvbnMuXG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gdGhpcy5nZXRDb2xsZWN0aW9uKHRoaXMuY29sbGVjdGlvbk5hbWUpO1xuICAgICAgY29uc3Qgc2NoZW1hdGljID0gdGhpcy5nZXRTY2hlbWF0aWMoY29sbGVjdGlvbiwgdGhpcy5zY2hlbWF0aWNOYW1lLCB0cnVlKTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMoXG4gICAgICAgIHRoaXMuX3dvcmtmbG93LnJlZ2lzdHJ5LFxuICAgICAgICBzY2hlbWF0aWMuZGVzY3JpcHRpb24uc2NoZW1hSnNvbiB8fCB7fSxcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuZGVzY3JpcHRpb24uZGVzY3JpcHRpb24gPSBzY2hlbWF0aWMuZGVzY3JpcHRpb24uZGVzY3JpcHRpb247XG4gICAgICB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMucHVzaCguLi5vcHRpb25zLmZpbHRlcigoeCkgPT4gIXguaGlkZGVuKSk7XG5cbiAgICAgIC8vIFJlbW92ZSBhbnkgdXNlciBhbmFseXRpY3MgZnJvbSBzY2hlbWF0aWNzIHRoYXQgYXJlIE5PVCBwYXJ0IG9mIG91ciBzYWZlbGlzdC5cbiAgICAgIGZvciAoY29uc3QgbyBvZiB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG8udXNlckFuYWx5dGljcyAmJiAhaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3ModGhpcy5jb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgICAgICBvLnVzZXJBbmFseXRpY3MgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwdWJsaWMgb3ZlcnJpZGUgYXN5bmMgcHJpbnRIZWxwKCkge1xuICAgIGF3YWl0IHN1cGVyLnByaW50SGVscCgpO1xuICAgIHRoaXMubG9nZ2VyLmluZm8oJycpO1xuXG4gICAgY29uc3Qgc3ViQ29tbWFuZE9wdGlvbiA9IHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5maWx0ZXIoKHgpID0+IHguc3ViY29tbWFuZHMpWzBdO1xuXG4gICAgaWYgKCFzdWJDb21tYW5kT3B0aW9uIHx8ICFzdWJDb21tYW5kT3B0aW9uLnN1YmNvbW1hbmRzKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBjb25zdCBzY2hlbWF0aWNOYW1lcyA9IE9iamVjdC5rZXlzKHN1YkNvbW1hbmRPcHRpb24uc3ViY29tbWFuZHMpO1xuXG4gICAgaWYgKHNjaGVtYXRpY05hbWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ0F2YWlsYWJsZSBTY2hlbWF0aWNzOicpO1xuXG4gICAgICBjb25zdCBuYW1lc1BlckNvbGxlY3Rpb246IHsgW2M6IHN0cmluZ106IHN0cmluZ1tdIH0gPSB7fTtcbiAgICAgIHNjaGVtYXRpY05hbWVzLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgICAgbGV0IFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSBuYW1lLnNwbGl0KC86LywgMik7XG4gICAgICAgIGlmICghc2NoZW1hdGljTmFtZSkge1xuICAgICAgICAgIHNjaGVtYXRpY05hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgICAgICAgICBjb2xsZWN0aW9uTmFtZSA9IHRoaXMuY29sbGVjdGlvbk5hbWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5hbWVzUGVyQ29sbGVjdGlvbltjb2xsZWN0aW9uTmFtZV0pIHtcbiAgICAgICAgICBuYW1lc1BlckNvbGxlY3Rpb25bY29sbGVjdGlvbk5hbWVdID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBuYW1lc1BlckNvbGxlY3Rpb25bY29sbGVjdGlvbk5hbWVdLnB1c2goc2NoZW1hdGljTmFtZSk7XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgZGVmYXVsdENvbGxlY3Rpb24gPSBhd2FpdCB0aGlzLmdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCk7XG4gICAgICBPYmplY3Qua2V5cyhuYW1lc1BlckNvbGxlY3Rpb24pLmZvckVhY2goKGNvbGxlY3Rpb25OYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IGlzRGVmYXVsdCA9IGRlZmF1bHRDb2xsZWN0aW9uID09IGNvbGxlY3Rpb25OYW1lO1xuICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKGAgIENvbGxlY3Rpb24gXCIke2NvbGxlY3Rpb25OYW1lfVwiJHtpc0RlZmF1bHQgPyAnIChkZWZhdWx0KScgOiAnJ306YCk7XG5cbiAgICAgICAgbmFtZXNQZXJDb2xsZWN0aW9uW2NvbGxlY3Rpb25OYW1lXS5mb3JFYWNoKChzY2hlbWF0aWNOYW1lKSA9PiB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgICAgICR7c2NoZW1hdGljTmFtZX1gKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIG92ZXJyaWRlIGFzeW5jIHByaW50SGVscFVzYWdlKCkge1xuICAgIGNvbnN0IHN1YkNvbW1hbmRPcHRpb24gPSB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMuZmlsdGVyKCh4KSA9PiB4LnN1YmNvbW1hbmRzKVswXTtcblxuICAgIGlmICghc3ViQ29tbWFuZE9wdGlvbiB8fCAhc3ViQ29tbWFuZE9wdGlvbi5zdWJjb21tYW5kcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHNjaGVtYXRpY05hbWVzID0gT2JqZWN0LmtleXMoc3ViQ29tbWFuZE9wdGlvbi5zdWJjb21tYW5kcyk7XG4gICAgaWYgKHNjaGVtYXRpY05hbWVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKHRoaXMuZGVzY3JpcHRpb24uZGVzY3JpcHRpb24pO1xuXG4gICAgICBjb25zdCBvcHRzID0gdGhpcy5kZXNjcmlwdGlvbi5vcHRpb25zLmZpbHRlcigoeCkgPT4geC5wb3NpdGlvbmFsID09PSB1bmRlZmluZWQpO1xuICAgICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHNjaGVtYXRpY05hbWVzWzBdLnNwbGl0KC86LylbMF07XG5cbiAgICAgIC8vIERpc3BsYXkgPGNvbGxlY3Rpb25OYW1lOnNjaGVtYXRpY05hbWU+IGlmIHRoaXMgaXMgbm90IHRoZSBkZWZhdWx0IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgLy8gb3RoZXJ3aXNlIGp1c3Qgc2hvdyB0aGUgc2NoZW1hdGljTmFtZS5cbiAgICAgIGNvbnN0IGRpc3BsYXlOYW1lID1cbiAgICAgICAgY29sbGVjdGlvbk5hbWUgPT0gKGF3YWl0IHRoaXMuZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKSlcbiAgICAgICAgICA/IHNjaGVtYXRpY05hbWVcbiAgICAgICAgICA6IHNjaGVtYXRpY05hbWVzWzBdO1xuXG4gICAgICBjb25zdCBzY2hlbWF0aWNPcHRpb25zID0gc3ViQ29tbWFuZE9wdGlvbi5zdWJjb21tYW5kc1tzY2hlbWF0aWNOYW1lc1swXV0ub3B0aW9ucztcbiAgICAgIGNvbnN0IHNjaGVtYXRpY0FyZ3MgPSBzY2hlbWF0aWNPcHRpb25zLmZpbHRlcigoeCkgPT4geC5wb3NpdGlvbmFsICE9PSB1bmRlZmluZWQpO1xuICAgICAgY29uc3QgYXJnRGlzcGxheSA9XG4gICAgICAgIHNjaGVtYXRpY0FyZ3MubGVuZ3RoID4gMFxuICAgICAgICAgID8gJyAnICsgc2NoZW1hdGljQXJncy5tYXAoKGEpID0+IGA8JHtzdHJpbmdzLmRhc2hlcml6ZShhLm5hbWUpfT5gKS5qb2luKCcgJylcbiAgICAgICAgICA6ICcnO1xuXG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKHRhZ3Mub25lTGluZWBcbiAgICAgICAgdXNhZ2U6IG5nICR7dGhpcy5kZXNjcmlwdGlvbi5uYW1lfSAke2Rpc3BsYXlOYW1lfSR7YXJnRGlzcGxheX1cbiAgICAgICAgJHtvcHRzLmxlbmd0aCA+IDAgPyBgW29wdGlvbnNdYCA6IGBgfVxuICAgICAgYCk7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgc3VwZXIucHJpbnRIZWxwVXNhZ2UoKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0RW5naW5lKCk6IEZpbGVTeXN0ZW1FbmdpbmUge1xuICAgIHJldHVybiB0aGlzLl93b3JrZmxvdy5lbmdpbmU7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZTogc3RyaW5nKTogRmlsZVN5c3RlbUNvbGxlY3Rpb24ge1xuICAgIGNvbnN0IGVuZ2luZSA9IHRoaXMuZ2V0RW5naW5lKCk7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IGVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcblxuICAgIGlmIChjb2xsZWN0aW9uID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVW5rbm93bkNvbGxlY3Rpb25FcnJvcihjb2xsZWN0aW9uTmFtZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbGxlY3Rpb247XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0U2NoZW1hdGljKFxuICAgIGNvbGxlY3Rpb246IEZpbGVTeXN0ZW1Db2xsZWN0aW9uLFxuICAgIHNjaGVtYXRpY05hbWU6IHN0cmluZyxcbiAgICBhbGxvd1ByaXZhdGU/OiBib29sZWFuLFxuICApOiBGaWxlU3lzdGVtU2NoZW1hdGljIHtcbiAgICByZXR1cm4gY29sbGVjdGlvbi5jcmVhdGVTY2hlbWF0aWMoc2NoZW1hdGljTmFtZSwgYWxsb3dQcml2YXRlKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBzZXRQYXRoT3B0aW9ucyhvcHRpb25zOiBPcHRpb25bXSwgd29ya2luZ0Rpcjogc3RyaW5nKSB7XG4gICAgaWYgKHdvcmtpbmdEaXIgPT09ICcnKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdGlvbnNcbiAgICAgIC5maWx0ZXIoKG8pID0+IG8uZm9ybWF0ID09PSAncGF0aCcpXG4gICAgICAubWFwKChvKSA9PiBvLm5hbWUpXG4gICAgICAucmVkdWNlKChhY2MsIGN1cnIpID0+IHtcbiAgICAgICAgYWNjW2N1cnJdID0gd29ya2luZ0RpcjtcblxuICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgfSwge30gYXMgeyBbbmFtZTogc3RyaW5nXTogc3RyaW5nIH0pO1xuICB9XG5cbiAgLypcbiAgICogUnVudGltZSBob29rIHRvIGFsbG93IHNwZWNpZnlpbmcgY3VzdG9taXplZCB3b3JrZmxvd1xuICAgKi9cbiAgcHJvdGVjdGVkIGFzeW5jIGNyZWF0ZVdvcmtmbG93KG9wdGlvbnM6IEJhc2VTY2hlbWF0aWNTY2hlbWEpOiBQcm9taXNlPHdvcmtmbG93LkJhc2VXb3JrZmxvdz4ge1xuICAgIGlmICh0aGlzLl93b3JrZmxvdykge1xuICAgICAgcmV0dXJuIHRoaXMuX3dvcmtmbG93O1xuICAgIH1cblxuICAgIGNvbnN0IHsgZm9yY2UsIGRyeVJ1biB9ID0gb3B0aW9ucztcbiAgICBjb25zdCByb290ID0gdGhpcy5jb250ZXh0LnJvb3Q7XG4gICAgY29uc3Qgd29ya2Zsb3cgPSBuZXcgTm9kZVdvcmtmbG93KHJvb3QsIHtcbiAgICAgIGZvcmNlLFxuICAgICAgZHJ5UnVuLFxuICAgICAgcGFja2FnZU1hbmFnZXI6IGF3YWl0IGdldFBhY2thZ2VNYW5hZ2VyKHJvb3QpLFxuICAgICAgcGFja2FnZVJlZ2lzdHJ5OiBvcHRpb25zLnBhY2thZ2VSZWdpc3RyeSxcbiAgICAgIC8vIEEgc2NoZW1hIHJlZ2lzdHJ5IGlzIHJlcXVpcmVkIHRvIGFsbG93IGN1c3RvbWl6aW5nIGFkZFVuZGVmaW5lZERlZmF1bHRzXG4gICAgICByZWdpc3RyeTogbmV3IHNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoZm9ybWF0cy5zdGFuZGFyZEZvcm1hdHMpLFxuICAgICAgcmVzb2x2ZVBhdGhzOiB0aGlzLndvcmtzcGFjZVxuICAgICAgICA/IC8vIFdvcmtzcGFjZVxuICAgICAgICAgIHRoaXMuY29sbGVjdGlvbk5hbWUgPT09IHRoaXMuZGVmYXVsdENvbGxlY3Rpb25OYW1lXG4gICAgICAgICAgPyAvLyBGYXZvciBfX2Rpcm5hbWUgZm9yIEBzY2hlbWF0aWNzL2FuZ3VsYXIgdG8gdXNlIHRoZSBidWlsZC1pbiB2ZXJzaW9uXG4gICAgICAgICAgICBbX19kaXJuYW1lLCBwcm9jZXNzLmN3ZCgpLCByb290XVxuICAgICAgICAgIDogW3Byb2Nlc3MuY3dkKCksIHJvb3QsIF9fZGlybmFtZV1cbiAgICAgICAgOiAvLyBHbG9iYWxcbiAgICAgICAgICBbX19kaXJuYW1lLCBwcm9jZXNzLmN3ZCgpXSxcbiAgICAgIHNjaGVtYVZhbGlkYXRpb246IHRydWUsXG4gICAgICBvcHRpb25UcmFuc2Zvcm1zOiBbXG4gICAgICAgIC8vIEFkZCBjb25maWd1cmF0aW9uIGZpbGUgZGVmYXVsdHNcbiAgICAgICAgYXN5bmMgKHNjaGVtYXRpYywgY3VycmVudCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHByb2plY3ROYW1lID1cbiAgICAgICAgICAgIHR5cGVvZiAoY3VycmVudCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikucHJvamVjdCA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgICAgPyAoKGN1cnJlbnQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLnByb2plY3QgYXMgc3RyaW5nKVxuICAgICAgICAgICAgICA6IGdldFByb2plY3ROYW1lKCk7XG5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4uKGF3YWl0IGdldFNjaGVtYXRpY0RlZmF1bHRzKHNjaGVtYXRpYy5jb2xsZWN0aW9uLm5hbWUsIHNjaGVtYXRpYy5uYW1lLCBwcm9qZWN0TmFtZSkpLFxuICAgICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGVuZ2luZUhvc3RDcmVhdG9yOiAob3B0aW9ucykgPT4gbmV3IFNjaGVtYXRpY0VuZ2luZUhvc3Qob3B0aW9ucy5yZXNvbHZlUGF0aHMpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZ2V0UHJvamVjdE5hbWUgPSAoKSA9PiB7XG4gICAgICBpZiAodGhpcy53b3Jrc3BhY2UpIHtcbiAgICAgICAgY29uc3QgcHJvamVjdE5hbWVzID0gZ2V0UHJvamVjdHNCeVBhdGgoXG4gICAgICAgICAgdGhpcy53b3Jrc3BhY2UsXG4gICAgICAgICAgcHJvY2Vzcy5jd2QoKSxcbiAgICAgICAgICB0aGlzLndvcmtzcGFjZS5iYXNlUGF0aCxcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAocHJvamVjdE5hbWVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIHJldHVybiBwcm9qZWN0TmFtZXNbMF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHByb2plY3ROYW1lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgICAgVHdvIG9yIG1vcmUgcHJvamVjdHMgYXJlIHVzaW5nIGlkZW50aWNhbCByb290cy5cbiAgICAgICAgICAgICAgVW5hYmxlIHRvIGRldGVybWluZSBwcm9qZWN0IHVzaW5nIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuXG4gICAgICAgICAgICAgIFVzaW5nIGRlZmF1bHQgd29ya3NwYWNlIHByb2plY3QgaW5zdGVhZC5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGRlZmF1bHRQcm9qZWN0TmFtZSA9IHRoaXMud29ya3NwYWNlLmV4dGVuc2lvbnNbJ2RlZmF1bHRQcm9qZWN0J107XG4gICAgICAgICAgaWYgKHR5cGVvZiBkZWZhdWx0UHJvamVjdE5hbWUgPT09ICdzdHJpbmcnICYmIGRlZmF1bHRQcm9qZWN0TmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIGRlZmF1bHRQcm9qZWN0TmFtZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkUG9zdFRyYW5zZm9ybShzY2hlbWEudHJhbnNmb3Jtcy5hZGRVbmRlZmluZWREZWZhdWx0cyk7XG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ3Byb2plY3ROYW1lJywgZ2V0UHJvamVjdE5hbWUpO1xuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LnVzZVhEZXByZWNhdGVkUHJvdmlkZXIoKG1zZykgPT4gdGhpcy5sb2dnZXIud2Fybihtc2cpKTtcblxuICAgIGxldCBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSB0cnVlO1xuICAgIHdvcmtmbG93LmVuZ2luZUhvc3QucmVnaXN0ZXJPcHRpb25zVHJhbnNmb3JtKGFzeW5jIChfLCBvcHRpb25zKSA9PiB7XG4gICAgICBpZiAoc2hvdWxkUmVwb3J0QW5hbHl0aWNzKSB7XG4gICAgICAgIHNob3VsZFJlcG9ydEFuYWx5dGljcyA9IGZhbHNlO1xuICAgICAgICBhd2FpdCB0aGlzLnJlcG9ydEFuYWx5dGljcyhbdGhpcy5kZXNjcmlwdGlvbi5uYW1lXSwgb3B0aW9ucyBhcyBBcmd1bWVudHMpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb3B0aW9ucztcbiAgICB9KTtcblxuICAgIGlmIChvcHRpb25zLmludGVyYWN0aXZlICE9PSBmYWxzZSAmJiBpc1RUWSgpKSB7XG4gICAgICB3b3JrZmxvdy5yZWdpc3RyeS51c2VQcm9tcHRQcm92aWRlcigoZGVmaW5pdGlvbnM6IEFycmF5PHNjaGVtYS5Qcm9tcHREZWZpbml0aW9uPikgPT4ge1xuICAgICAgICBjb25zdCBxdWVzdGlvbnM6IGlucXVpcmVyLlF1ZXN0aW9uQ29sbGVjdGlvbiA9IGRlZmluaXRpb25zXG4gICAgICAgICAgLmZpbHRlcigoZGVmaW5pdGlvbikgPT4gIW9wdGlvbnMuZGVmYXVsdHMgfHwgZGVmaW5pdGlvbi5kZWZhdWx0ID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgLm1hcCgoZGVmaW5pdGlvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3Rpb246IGlucXVpcmVyLlF1ZXN0aW9uID0ge1xuICAgICAgICAgICAgICBuYW1lOiBkZWZpbml0aW9uLmlkLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBkZWZpbml0aW9uLm1lc3NhZ2UsXG4gICAgICAgICAgICAgIGRlZmF1bHQ6IGRlZmluaXRpb24uZGVmYXVsdCxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRvciA9IGRlZmluaXRpb24udmFsaWRhdG9yO1xuICAgICAgICAgICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgICAgICAgICBxdWVzdGlvbi52YWxpZGF0ZSA9IChpbnB1dCkgPT4gdmFsaWRhdG9yKGlucHV0KTtcblxuICAgICAgICAgICAgICAvLyBGaWx0ZXIgYWxsb3dzIHRyYW5zZm9ybWF0aW9uIG9mIHRoZSB2YWx1ZSBwcmlvciB0byB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgIHF1ZXN0aW9uLmZpbHRlciA9IGFzeW5jIChpbnB1dCkgPT4ge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdHlwZSBvZiBkZWZpbml0aW9uLnByb3BlcnR5VHlwZXMpIHtcbiAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gU3RyaW5nKGlucHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBOdW1iZXIoaW5wdXQpO1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gaW5wdXQ7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyBDYW4gYmUgYSBzdHJpbmcgaWYgdmFsaWRhdGlvbiBmYWlsc1xuICAgICAgICAgICAgICAgICAgY29uc3QgaXNWYWxpZCA9IChhd2FpdCB2YWxpZGF0b3IodmFsdWUpKSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGlmIChpc1ZhbGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXQ7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN3aXRjaCAoZGVmaW5pdGlvbi50eXBlKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ2NvbmZpcm1hdGlvbic6XG4gICAgICAgICAgICAgICAgcXVlc3Rpb24udHlwZSA9ICdjb25maXJtJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnbGlzdCc6XG4gICAgICAgICAgICAgICAgcXVlc3Rpb24udHlwZSA9IGRlZmluaXRpb24ubXVsdGlzZWxlY3QgPyAnY2hlY2tib3gnIDogJ2xpc3QnO1xuICAgICAgICAgICAgICAgIChxdWVzdGlvbiBhcyBpbnF1aXJlci5DaGVja2JveFF1ZXN0aW9uKS5jaG9pY2VzID0gZGVmaW5pdGlvbi5pdGVtcz8ubWFwKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIGl0ZW0gPT0gJ3N0cmluZydcbiAgICAgICAgICAgICAgICAgICAgPyBpdGVtXG4gICAgICAgICAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5sYWJlbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcXVlc3Rpb24udHlwZSA9IGRlZmluaXRpb24udHlwZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHF1ZXN0aW9uO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBpbnF1aXJlci5wcm9tcHQocXVlc3Rpb25zKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiAodGhpcy5fd29ya2Zsb3cgPSB3b3JrZmxvdyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBsZXQgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdsb2NhbCcpO1xuXG4gICAgaWYgKHdvcmtzcGFjZSkge1xuICAgICAgY29uc3QgcHJvamVjdCA9IGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2UpO1xuICAgICAgaWYgKHByb2plY3QgJiYgd29ya3NwYWNlLmdldFByb2plY3RDbGkocHJvamVjdCkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB3b3Jrc3BhY2UuZ2V0UHJvamVjdENsaShwcm9qZWN0KVsnZGVmYXVsdENvbGxlY3Rpb24nXTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHdvcmtzcGFjZS5nZXRDbGkoKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHdvcmtzcGFjZS5nZXRDbGkoKVsnZGVmYXVsdENvbGxlY3Rpb24nXTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgaWYgKHdvcmtzcGFjZSAmJiB3b3Jrc3BhY2UuZ2V0Q2xpKCkpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gd29ya3NwYWNlLmdldENsaSgpWydkZWZhdWx0Q29sbGVjdGlvbiddO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZGVmYXVsdENvbGxlY3Rpb25OYW1lO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1blNjaGVtYXRpYyhvcHRpb25zOiBSdW5TY2hlbWF0aWNPcHRpb25zKSB7XG4gICAgY29uc3QgeyBzY2hlbWF0aWNPcHRpb25zLCBkZWJ1ZywgZHJ5UnVuIH0gPSBvcHRpb25zO1xuICAgIGxldCB7IGNvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lIH0gPSBvcHRpb25zO1xuXG4gICAgbGV0IG5vdGhpbmdEb25lID0gdHJ1ZTtcbiAgICBsZXQgbG9nZ2luZ1F1ZXVlOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCBlcnJvciA9IGZhbHNlO1xuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSB0aGlzLl93b3JrZmxvdztcblxuICAgIGNvbnN0IHdvcmtpbmdEaXIgPSBub3JtYWxpemUoc3lzdGVtUGF0aC5yZWxhdGl2ZSh0aGlzLmNvbnRleHQucm9vdCwgcHJvY2Vzcy5jd2QoKSkpO1xuXG4gICAgLy8gR2V0IHRoZSBvcHRpb24gb2JqZWN0IGZyb20gdGhlIHNjaGVtYXRpYyBzY2hlbWEuXG4gICAgY29uc3Qgc2NoZW1hdGljID0gdGhpcy5nZXRTY2hlbWF0aWMoXG4gICAgICB0aGlzLmdldENvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpLFxuICAgICAgc2NoZW1hdGljTmFtZSxcbiAgICAgIHRoaXMuYWxsb3dQcml2YXRlU2NoZW1hdGljcyxcbiAgICApO1xuICAgIC8vIFVwZGF0ZSB0aGUgc2NoZW1hdGljIGFuZCBjb2xsZWN0aW9uIG5hbWUgaW4gY2FzZSB0aGV5J3JlIG5vdCB0aGUgc2FtZSBhcyB0aGUgb25lcyB3ZVxuICAgIC8vIHJlY2VpdmVkIGluIG91ciBvcHRpb25zLCBlLmcuIGFmdGVyIGFsaWFzIHJlc29sdXRpb24gb3IgZXh0ZW5zaW9uLlxuICAgIGNvbGxlY3Rpb25OYW1lID0gc2NoZW1hdGljLmNvbGxlY3Rpb24uZGVzY3JpcHRpb24ubmFtZTtcbiAgICBzY2hlbWF0aWNOYW1lID0gc2NoZW1hdGljLmRlc2NyaXB0aW9uLm5hbWU7XG5cbiAgICAvLyBTZXQgdGhlIG9wdGlvbnMgb2YgZm9ybWF0IFwicGF0aFwiLlxuICAgIGxldCBvOiBPcHRpb25bXSB8IG51bGwgPSBudWxsO1xuICAgIGxldCBhcmdzOiBBcmd1bWVudHM7XG5cbiAgICBpZiAoIXNjaGVtYXRpYy5kZXNjcmlwdGlvbi5zY2hlbWFKc29uKSB7XG4gICAgICBhcmdzID0gYXdhaXQgdGhpcy5wYXJzZUZyZWVGb3JtQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnMgfHwgW10pO1xuICAgIH0gZWxzZSB7XG4gICAgICBvID0gYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKHdvcmtmbG93LnJlZ2lzdHJ5LCBzY2hlbWF0aWMuZGVzY3JpcHRpb24uc2NoZW1hSnNvbik7XG4gICAgICBhcmdzID0gYXdhaXQgdGhpcy5wYXJzZUFyZ3VtZW50cyhzY2hlbWF0aWNPcHRpb25zIHx8IFtdLCBvKTtcbiAgICB9XG5cbiAgICBjb25zdCBhbGxvd0FkZGl0aW9uYWxQcm9wZXJ0aWVzID1cbiAgICAgIHR5cGVvZiBzY2hlbWF0aWMuZGVzY3JpcHRpb24uc2NoZW1hSnNvbiA9PT0gJ29iamVjdCcgJiZcbiAgICAgIHNjaGVtYXRpYy5kZXNjcmlwdGlvbi5zY2hlbWFKc29uLmFkZGl0aW9uYWxQcm9wZXJ0aWVzO1xuXG4gICAgaWYgKGFyZ3NbJy0tJ10gJiYgIWFsbG93QWRkaXRpb25hbFByb3BlcnRpZXMpIHtcbiAgICAgIGFyZ3NbJy0tJ10uZm9yRWFjaCgoYWRkaXRpb25hbCkgPT4ge1xuICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChgVW5rbm93biBvcHRpb246ICcke2FkZGl0aW9uYWwuc3BsaXQoLz0vKVswXX0nYCk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgY29uc3QgcGF0aE9wdGlvbnMgPSBvID8gdGhpcy5zZXRQYXRoT3B0aW9ucyhvLCB3b3JraW5nRGlyKSA6IHt9O1xuICAgIGNvbnN0IGlucHV0ID0ge1xuICAgICAgLi4ucGF0aE9wdGlvbnMsXG4gICAgICAuLi5hcmdzLFxuICAgICAgLi4ub3B0aW9ucy5hZGRpdGlvbmFsT3B0aW9ucyxcbiAgICB9O1xuXG4gICAgd29ya2Zsb3cucmVwb3J0ZXIuc3Vic2NyaWJlKChldmVudDogRHJ5UnVuRXZlbnQpID0+IHtcbiAgICAgIG5vdGhpbmdEb25lID0gZmFsc2U7XG5cbiAgICAgIC8vIFN0cmlwIGxlYWRpbmcgc2xhc2ggdG8gcHJldmVudCBjb25mdXNpb24uXG4gICAgICBjb25zdCBldmVudFBhdGggPSBldmVudC5wYXRoLnN0YXJ0c1dpdGgoJy8nKSA/IGV2ZW50LnBhdGguc3Vic3RyKDEpIDogZXZlbnQucGF0aDtcblxuICAgICAgc3dpdGNoIChldmVudC5raW5kKSB7XG4gICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICBlcnJvciA9IHRydWU7XG4gICAgICAgICAgY29uc3QgZGVzYyA9IGV2ZW50LmRlc2NyaXB0aW9uID09ICdhbHJlYWR5RXhpc3QnID8gJ2FscmVhZHkgZXhpc3RzJyA6ICdkb2VzIG5vdCBleGlzdC4nO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYEVSUk9SISAke2V2ZW50UGF0aH0gJHtkZXNjfS5gKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAndXBkYXRlJzpcbiAgICAgICAgICBsb2dnaW5nUXVldWUucHVzaCh0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICAke2NvbG9ycy5jeWFuKCdVUERBVEUnKX0gJHtldmVudFBhdGh9ICgke2V2ZW50LmNvbnRlbnQubGVuZ3RofSBieXRlcylcbiAgICAgICAgICBgKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnY3JlYXRlJzpcbiAgICAgICAgICBsb2dnaW5nUXVldWUucHVzaCh0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICAke2NvbG9ycy5ncmVlbignQ1JFQVRFJyl9ICR7ZXZlbnRQYXRofSAoJHtldmVudC5jb250ZW50Lmxlbmd0aH0gYnl0ZXMpXG4gICAgICAgICAgYCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2RlbGV0ZSc6XG4gICAgICAgICAgbG9nZ2luZ1F1ZXVlLnB1c2goYCR7Y29sb3JzLnllbGxvdygnREVMRVRFJyl9ICR7ZXZlbnRQYXRofWApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdyZW5hbWUnOlxuICAgICAgICAgIGNvbnN0IGV2ZW50VG9QYXRoID0gZXZlbnQudG8uc3RhcnRzV2l0aCgnLycpID8gZXZlbnQudG8uc3Vic3RyKDEpIDogZXZlbnQudG87XG4gICAgICAgICAgbG9nZ2luZ1F1ZXVlLnB1c2goYCR7Y29sb3JzLmJsdWUoJ1JFTkFNRScpfSAke2V2ZW50UGF0aH0gPT4gJHtldmVudFRvUGF0aH1gKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHdvcmtmbG93LmxpZmVDeWNsZS5zdWJzY3JpYmUoKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoZXZlbnQua2luZCA9PSAnZW5kJyB8fCBldmVudC5raW5kID09ICdwb3N0LXRhc2tzLXN0YXJ0Jykge1xuICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgLy8gT3V0cHV0IHRoZSBsb2dnaW5nIHF1ZXVlLCBubyBlcnJvciBoYXBwZW5lZC5cbiAgICAgICAgICBsb2dnaW5nUXVldWUuZm9yRWFjaCgobG9nKSA9PiB0aGlzLmxvZ2dlci5pbmZvKGxvZykpO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9nZ2luZ1F1ZXVlID0gW107XG4gICAgICAgIGVycm9yID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBUZW1wb3JhcnkgY29tcGF0aWJpbGl0eSBjaGVjayBmb3IgTlBNIDdcbiAgICBpZiAoY29sbGVjdGlvbk5hbWUgPT09ICdAc2NoZW1hdGljcy9hbmd1bGFyJyAmJiBzY2hlbWF0aWNOYW1lID09PSAnbmctbmV3Jykge1xuICAgICAgaWYgKFxuICAgICAgICAhaW5wdXQuc2tpcEluc3RhbGwgJiZcbiAgICAgICAgKGlucHV0LnBhY2thZ2VNYW5hZ2VyID09PSB1bmRlZmluZWQgfHwgaW5wdXQucGFja2FnZU1hbmFnZXIgPT09ICducG0nKVxuICAgICAgKSB7XG4gICAgICAgIGF3YWl0IGVuc3VyZUNvbXBhdGlibGVOcG0odGhpcy5jb250ZXh0LnJvb3QpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxudW1iZXIgfCB2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgd29ya2Zsb3dcbiAgICAgICAgLmV4ZWN1dGUoe1xuICAgICAgICAgIGNvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICAgIHNjaGVtYXRpYzogc2NoZW1hdGljTmFtZSxcbiAgICAgICAgICBvcHRpb25zOiBpbnB1dCxcbiAgICAgICAgICBkZWJ1ZzogZGVidWcsXG4gICAgICAgICAgbG9nZ2VyOiB0aGlzLmxvZ2dlcixcbiAgICAgICAgICBhbGxvd1ByaXZhdGU6IHRoaXMuYWxsb3dQcml2YXRlU2NoZW1hdGljcyxcbiAgICAgICAgfSlcbiAgICAgICAgLnN1YnNjcmliZSh7XG4gICAgICAgICAgZXJyb3I6IChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAvLyBJbiBjYXNlIHRoZSB3b3JrZmxvdyB3YXMgbm90IHN1Y2Nlc3NmdWwsIHNob3cgYW4gYXBwcm9wcmlhdGUgZXJyb3IgbWVzc2FnZS5cbiAgICAgICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbikge1xuICAgICAgICAgICAgICAvLyBcIlNlZSBhYm92ZVwiIGJlY2F1c2Ugd2UgYWxyZWFkeSBwcmludGVkIHRoZSBlcnJvci5cbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoJ1RoZSBTY2hlbWF0aWMgd29ya2Zsb3cgZmFpbGVkLiBTZWUgYWJvdmUuJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRlYnVnKSB7XG4gICAgICAgICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGBBbiBlcnJvciBvY2N1cnJlZDpcXG4ke2Vyci5tZXNzYWdlfVxcbiR7ZXJyLnN0YWNrfWApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoZXJyLm1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXNvbHZlKDEpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgY29tcGxldGU6ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNob3dOb3RoaW5nRG9uZSA9ICEob3B0aW9ucy5zaG93Tm90aGluZ0RvbmUgPT09IGZhbHNlKTtcbiAgICAgICAgICAgIGlmIChub3RoaW5nRG9uZSAmJiBzaG93Tm90aGluZ0RvbmUpIHtcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuaW5mbygnTm90aGluZyB0byBiZSBkb25lLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRyeVJ1bikge1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBcXG5OT1RFOiBUaGUgXCJkcnlSdW5cIiBmbGFnIG1lYW5zIG5vIGNoYW5nZXMgd2VyZSBtYWRlLmApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHBhcnNlRnJlZUZvcm1Bcmd1bWVudHMoc2NoZW1hdGljT3B0aW9uczogc3RyaW5nW10pIHtcbiAgICByZXR1cm4gcGFyc2VGcmVlRm9ybUFyZ3VtZW50cyhzY2hlbWF0aWNPcHRpb25zKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBwYXJzZUFyZ3VtZW50cyhcbiAgICBzY2hlbWF0aWNPcHRpb25zOiBzdHJpbmdbXSxcbiAgICBvcHRpb25zOiBPcHRpb25bXSB8IG51bGwsXG4gICk6IFByb21pc2U8QXJndW1lbnRzPiB7XG4gICAgcmV0dXJuIHBhcnNlQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnMsIG9wdGlvbnMsIHRoaXMubG9nZ2VyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRQcm9qZWN0c0J5UGF0aChcbiAgd29ya3NwYWNlOiB3b3Jrc3BhY2VzLldvcmtzcGFjZURlZmluaXRpb24sXG4gIHBhdGg6IHN0cmluZyxcbiAgcm9vdDogc3RyaW5nLFxuKTogc3RyaW5nW10ge1xuICBpZiAod29ya3NwYWNlLnByb2plY3RzLnNpemUgPT09IDEpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh3b3Jrc3BhY2UucHJvamVjdHMua2V5cygpKTtcbiAgfVxuXG4gIGNvbnN0IGlzSW5zaWRlID0gKGJhc2U6IHN0cmluZywgcG90ZW50aWFsOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICBjb25zdCBhYnNvbHV0ZUJhc2UgPSBzeXN0ZW1QYXRoLnJlc29sdmUocm9vdCwgYmFzZSk7XG4gICAgY29uc3QgYWJzb2x1dGVQb3RlbnRpYWwgPSBzeXN0ZW1QYXRoLnJlc29sdmUocm9vdCwgcG90ZW50aWFsKTtcbiAgICBjb25zdCByZWxhdGl2ZVBvdGVudGlhbCA9IHN5c3RlbVBhdGgucmVsYXRpdmUoYWJzb2x1dGVCYXNlLCBhYnNvbHV0ZVBvdGVudGlhbCk7XG4gICAgaWYgKCFyZWxhdGl2ZVBvdGVudGlhbC5zdGFydHNXaXRoKCcuLicpICYmICFzeXN0ZW1QYXRoLmlzQWJzb2x1dGUocmVsYXRpdmVQb3RlbnRpYWwpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgY29uc3QgcHJvamVjdHMgPSBBcnJheS5mcm9tKHdvcmtzcGFjZS5wcm9qZWN0cy5lbnRyaWVzKCkpXG4gICAgLm1hcCgoW25hbWUsIHByb2plY3RdKSA9PiBbc3lzdGVtUGF0aC5yZXNvbHZlKHJvb3QsIHByb2plY3Qucm9vdCksIG5hbWVdIGFzIFtzdHJpbmcsIHN0cmluZ10pXG4gICAgLmZpbHRlcigodHVwbGUpID0+IGlzSW5zaWRlKHR1cGxlWzBdLCBwYXRoKSlcbiAgICAvLyBTb3J0IHR1cGxlcyBieSBkZXB0aCwgd2l0aCB0aGUgZGVlcGVyIG9uZXMgZmlyc3QuIFNpbmNlIHRoZSBmaXJzdCBtZW1iZXIgaXMgYSBwYXRoIGFuZFxuICAgIC8vIHdlIGZpbHRlcmVkIGFsbCBpbnZhbGlkIHBhdGhzLCB0aGUgbG9uZ2VzdCB3aWxsIGJlIHRoZSBkZWVwZXN0IChhbmQgaW4gY2FzZSBvZiBlcXVhbGl0eVxuICAgIC8vIHRoZSBzb3J0IGlzIHN0YWJsZSBhbmQgdGhlIGZpcnN0IGRlY2xhcmVkIHByb2plY3Qgd2lsbCB3aW4pLlxuICAgIC5zb3J0KChhLCBiKSA9PiBiWzBdLmxlbmd0aCAtIGFbMF0ubGVuZ3RoKTtcblxuICBpZiAocHJvamVjdHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIFtwcm9qZWN0c1swXVsxXV07XG4gIH0gZWxzZSBpZiAocHJvamVjdHMubGVuZ3RoID4gMSkge1xuICAgIGNvbnN0IGZpcnN0UGF0aCA9IHByb2plY3RzWzBdWzBdO1xuXG4gICAgcmV0dXJuIHByb2plY3RzLmZpbHRlcigodikgPT4gdlswXSA9PT0gZmlyc3RQYXRoKS5tYXAoKHYpID0+IHZbMV0pO1xuICB9XG5cbiAgcmV0dXJuIFtdO1xufVxuIl19