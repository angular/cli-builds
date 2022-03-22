"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchematicsCommandModule = exports.DEFAULT_SCHEMATICS_COLLECTION = void 0;
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const tools_1 = require("@angular-devkit/schematics/tools");
const inquirer_1 = __importDefault(require("inquirer"));
const config_1 = require("../utilities/config");
const tty_1 = require("../utilities/tty");
const command_module_1 = require("./command-module");
const json_schema_1 = require("./utilities/json-schema");
const schematic_engine_host_1 = require("./utilities/schematic-engine-host");
const schematic_workflow_1 = require("./utilities/schematic-workflow");
exports.DEFAULT_SCHEMATICS_COLLECTION = '@schematics/angular';
class SchematicsCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.allowPrivateSchematics = false;
        this.shouldReportAnalytics = false;
        this._workflowForBuilder = new Map();
        this.defaultProjectDeprecationWarningShown = false;
    }
    async builder(argv) {
        return argv
            .option('interactive', {
            describe: 'Enable interactive input prompts.',
            type: 'boolean',
            default: true,
        })
            .option('dry-run', {
            describe: 'Run through and reports activity without writing out results.',
            type: 'boolean',
            default: false,
        })
            .option('defaults', {
            describe: 'Disable interactive input prompts for options with a default.',
            type: 'boolean',
            default: false,
        })
            .option('force', {
            describe: 'Force overwriting of existing files.',
            type: 'boolean',
            default: false,
        })
            .strict();
    }
    /** Get schematic schema options.*/
    async getSchematicOptions(collection, schematicName, workflow) {
        const schematic = collection.createSchematic(schematicName, true);
        const { schemaJson } = schematic.description;
        if (!schemaJson) {
            return [];
        }
        return (0, json_schema_1.parseJsonSchemaToOptions)(workflow.registry, schemaJson);
    }
    getOrCreateWorkflowForBuilder(collectionName) {
        const cached = this._workflowForBuilder.get(collectionName);
        if (cached) {
            return cached;
        }
        const workflow = new tools_1.NodeWorkflow(this.context.root, {
            resolvePaths: this.getResolvePaths(collectionName),
            engineHostCreator: (options) => new schematic_engine_host_1.SchematicEngineHost(options.resolvePaths),
        });
        this._workflowForBuilder.set(collectionName, workflow);
        return workflow;
    }
    async getOrCreateWorkflowForExecution(collectionName, options) {
        if (this._workflowForExecution) {
            return this._workflowForExecution;
        }
        const { logger, root, packageManager } = this.context;
        const { force, dryRun, packageRegistry } = options;
        const workflow = new tools_1.NodeWorkflow(root, {
            force,
            dryRun,
            packageManager,
            // A schema registry is required to allow customizing addUndefinedDefaults
            registry: new core_1.schema.CoreSchemaRegistry(schematics_1.formats.standardFormats),
            packageRegistry,
            resolvePaths: this.getResolvePaths(collectionName),
            schemaValidation: true,
            optionTransforms: [
                // Add configuration file defaults
                async (schematic, current) => {
                    const projectName = typeof current.project === 'string'
                        ? current.project
                        : this.getProjectName();
                    return {
                        ...(await (0, config_1.getSchematicDefaults)(schematic.collection.name, schematic.name, projectName)),
                        ...current,
                    };
                },
            ],
            engineHostCreator: (options) => new schematic_engine_host_1.SchematicEngineHost(options.resolvePaths),
        });
        workflow.registry.addPostTransform(core_1.schema.transforms.addUndefinedDefaults);
        workflow.registry.addSmartDefaultProvider('projectName', () => this.getProjectName());
        workflow.registry.useXDeprecatedProvider((msg) => logger.warn(msg));
        let shouldReportAnalytics = true;
        workflow.engineHost.registerOptionsTransform(async (schematic, options) => {
            var _a;
            if (shouldReportAnalytics) {
                shouldReportAnalytics = false;
                // ng generate lib -> ng generate
                const commandName = (_a = this.command) === null || _a === void 0 ? void 0 : _a.split(' ', 1)[0];
                await this.reportAnalytics(options, [
                    commandName,
                    schematic.collection.name.replace(/\//g, '_'),
                    schematic.name.replace(/\//g, '_'),
                ]);
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
                return inquirer_1.default.prompt(questions);
            });
        }
        return (this._workflowForExecution = workflow);
    }
    async getSchematicCollections() {
        var _a;
        if (this._schematicCollections) {
            return this._schematicCollections;
        }
        const getSchematicCollections = (configSection) => {
            if (!configSection) {
                return undefined;
            }
            const { schematicCollections, defaultCollection } = configSection;
            if (Array.isArray(schematicCollections)) {
                return new Set(schematicCollections);
            }
            else if (typeof defaultCollection === 'string') {
                return new Set([defaultCollection]);
            }
            return undefined;
        };
        const localWorkspace = await (0, config_1.getWorkspace)('local');
        if (localWorkspace) {
            const project = (0, config_1.getProjectByCwd)(localWorkspace);
            if (project) {
                const value = getSchematicCollections(localWorkspace.getProjectCli(project));
                if (value) {
                    this._schematicCollections = value;
                    return value;
                }
            }
        }
        const globalWorkspace = await (0, config_1.getWorkspace)('global');
        const value = (_a = getSchematicCollections(localWorkspace === null || localWorkspace === void 0 ? void 0 : localWorkspace.getCli())) !== null && _a !== void 0 ? _a : getSchematicCollections(globalWorkspace === null || globalWorkspace === void 0 ? void 0 : globalWorkspace.getCli());
        if (value) {
            this._schematicCollections = value;
            return value;
        }
        this._schematicCollections = new Set([exports.DEFAULT_SCHEMATICS_COLLECTION]);
        return this._schematicCollections;
    }
    parseSchematicInfo(schematic) {
        if (schematic === null || schematic === void 0 ? void 0 : schematic.includes(':')) {
            const [collectionName, schematicName] = schematic.split(':', 2);
            return [collectionName, schematicName];
        }
        return [undefined, schematic];
    }
    async runSchematic(options) {
        const { logger } = this.context;
        const { schematicOptions, executionOptions, collectionName, schematicName } = options;
        const workflow = await this.getOrCreateWorkflowForExecution(collectionName, executionOptions);
        if (!schematicName) {
            throw new Error('schematicName cannot be undefined.');
        }
        const { unsubscribe, files } = (0, schematic_workflow_1.subscribeToWorkflow)(workflow, logger);
        try {
            await workflow
                .execute({
                collection: collectionName,
                schematic: schematicName,
                options: schematicOptions,
                logger,
                allowPrivate: this.allowPrivateSchematics,
            })
                .toPromise();
            if (!files.size) {
                logger.info('Nothing to be done.');
            }
            if (executionOptions.dryRun) {
                logger.warn(`\nNOTE: The "--dry-run" option means no changes were made.`);
            }
        }
        catch (err) {
            // In case the workflow was not successful, show an appropriate error message.
            if (err instanceof schematics_1.UnsuccessfulWorkflowExecution) {
                // "See above" because we already printed the error.
                logger.fatal('The Schematic workflow failed. See above.');
                return 1;
            }
            else {
                throw err;
            }
        }
        finally {
            unsubscribe();
        }
        return 0;
    }
    getProjectName() {
        const { workspace, logger } = this.context;
        if (!workspace) {
            return undefined;
        }
        const projectNames = (0, config_1.getProjectsByPath)(workspace, process.cwd(), workspace.basePath);
        if (projectNames.length === 1) {
            return projectNames[0];
        }
        else {
            if (projectNames.length > 1) {
                logger.warn(core_1.tags.oneLine `
            Two or more projects are using identical roots.
            Unable to determine project using current working directory.
            Using default workspace project instead.
          `);
            }
            const defaultProjectName = workspace.extensions['defaultProject'];
            if (typeof defaultProjectName === 'string' && defaultProjectName) {
                if (!this.defaultProjectDeprecationWarningShown) {
                    logger.warn(core_1.tags.oneLine `
            DEPRECATED: The 'defaultProject' workspace option has been deprecated.
            The project to use will be determined from the current working directory.
          `);
                    this.defaultProjectDeprecationWarningShown = true;
                }
                return defaultProjectName;
            }
        }
        return undefined;
    }
    getResolvePaths(collectionName) {
        const { workspace, root } = this.context;
        return workspace
            ? // Workspace
                collectionName === exports.DEFAULT_SCHEMATICS_COLLECTION
                    ? // Favor __dirname for @schematics/angular to use the build-in version
                        [__dirname, process.cwd(), root]
                    : [process.cwd(), root, __dirname]
            : // Global
                [__dirname, process.cwd()];
    }
}
exports.SchematicsCommandModule = SchematicsCommandModule;
SchematicsCommandModule.scope = command_module_1.CommandScope.In;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7QUFFSCwrQ0FBb0Q7QUFDcEQsMkRBQWdHO0FBQ2hHLDREQUkwQztBQUMxQyx3REFBZ0M7QUFFaEMsZ0RBSzZCO0FBQzdCLDBDQUF5QztBQUN6QyxxREFNMEI7QUFDMUIseURBQTJFO0FBQzNFLDZFQUF3RTtBQUN4RSx1RUFBcUU7QUFFeEQsUUFBQSw2QkFBNkIsR0FBRyxxQkFBcUIsQ0FBQztBQWFuRSxNQUFzQix1QkFDcEIsU0FBUSw4QkFBb0M7SUFEOUM7O1FBS3FCLDJCQUFzQixHQUFZLEtBQUssQ0FBQztRQUMvQiwwQkFBcUIsR0FBRyxLQUFLLENBQUM7UUEyQ2xELHdCQUFtQixHQUFHLElBQUksR0FBRyxFQUF3QixDQUFDO1FBc1F0RCwwQ0FBcUMsR0FBRyxLQUFLLENBQUM7SUFrRHhELENBQUM7SUFqV0MsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFVO1FBQ3RCLE9BQU8sSUFBSTthQUNSLE1BQU0sQ0FBQyxhQUFhLEVBQUU7WUFDckIsUUFBUSxFQUFFLG1DQUFtQztZQUM3QyxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2QsQ0FBQzthQUNELE1BQU0sQ0FBQyxTQUFTLEVBQUU7WUFDakIsUUFBUSxFQUFFLCtEQUErRDtZQUN6RSxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQzthQUNELE1BQU0sQ0FBQyxVQUFVLEVBQUU7WUFDbEIsUUFBUSxFQUFFLCtEQUErRDtZQUN6RSxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FB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b2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IHNjaGVtYSwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IENvbGxlY3Rpb24sIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uLCBmb3JtYXRzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHtcbiAgRmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjcmlwdGlvbixcbiAgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2NyaXB0aW9uLFxuICBOb2RlV29ya2Zsb3csXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCBpbnF1aXJlciBmcm9tICdpbnF1aXJlcic7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHtcbiAgZ2V0UHJvamVjdEJ5Q3dkLFxuICBnZXRQcm9qZWN0c0J5UGF0aCxcbiAgZ2V0U2NoZW1hdGljRGVmYXVsdHMsXG4gIGdldFdvcmtzcGFjZSxcbn0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4uL3V0aWxpdGllcy90dHknO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBPcHRpb24sIHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyB9IGZyb20gJy4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYXRpY0VuZ2luZUhvc3QgfSBmcm9tICcuL3V0aWxpdGllcy9zY2hlbWF0aWMtZW5naW5lLWhvc3QnO1xuaW1wb3J0IHsgc3Vic2NyaWJlVG9Xb3JrZmxvdyB9IGZyb20gJy4vdXRpbGl0aWVzL3NjaGVtYXRpYy13b3JrZmxvdyc7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NDSEVNQVRJQ1NfQ09MTEVDVElPTiA9ICdAc2NoZW1hdGljcy9hbmd1bGFyJztcblxuZXhwb3J0IGludGVyZmFjZSBTY2hlbWF0aWNzQ29tbWFuZEFyZ3Mge1xuICBpbnRlcmFjdGl2ZTogYm9vbGVhbjtcbiAgZm9yY2U6IGJvb2xlYW47XG4gICdkcnktcnVuJzogYm9vbGVhbjtcbiAgZGVmYXVsdHM6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2NoZW1hdGljc0V4ZWN1dGlvbk9wdGlvbnMgZXh0ZW5kcyBPcHRpb25zPFNjaGVtYXRpY3NDb21tYW5kQXJncz4ge1xuICBwYWNrYWdlUmVnaXN0cnk/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTY2hlbWF0aWNzQ29tbWFuZE1vZHVsZVxuICBleHRlbmRzIENvbW1hbmRNb2R1bGU8U2NoZW1hdGljc0NvbW1hbmRBcmdzPlxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxTY2hlbWF0aWNzQ29tbWFuZEFyZ3M+XG57XG4gIHN0YXRpYyBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5JbjtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGFsbG93UHJpdmF0ZVNjaGVtYXRpY3M6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIHJlYWRvbmx5IHNob3VsZFJlcG9ydEFuYWx5dGljcyA9IGZhbHNlO1xuXG4gIGFzeW5jIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxTY2hlbWF0aWNzQ29tbWFuZEFyZ3M+PiB7XG4gICAgcmV0dXJuIGFyZ3ZcbiAgICAgIC5vcHRpb24oJ2ludGVyYWN0aXZlJywge1xuICAgICAgICBkZXNjcmliZTogJ0VuYWJsZSBpbnRlcmFjdGl2ZSBpbnB1dCBwcm9tcHRzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdkcnktcnVuJywge1xuICAgICAgICBkZXNjcmliZTogJ1J1biB0aHJvdWdoIGFuZCByZXBvcnRzIGFjdGl2aXR5IHdpdGhvdXQgd3JpdGluZyBvdXQgcmVzdWx0cy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2RlZmF1bHRzJywge1xuICAgICAgICBkZXNjcmliZTogJ0Rpc2FibGUgaW50ZXJhY3RpdmUgaW5wdXQgcHJvbXB0cyBmb3Igb3B0aW9ucyB3aXRoIGEgZGVmYXVsdC4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2ZvcmNlJywge1xuICAgICAgICBkZXNjcmliZTogJ0ZvcmNlIG92ZXJ3cml0aW5nIG9mIGV4aXN0aW5nIGZpbGVzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLnN0cmljdCgpO1xuICB9XG5cbiAgLyoqIEdldCBzY2hlbWF0aWMgc2NoZW1hIG9wdGlvbnMuKi9cbiAgcHJvdGVjdGVkIGFzeW5jIGdldFNjaGVtYXRpY09wdGlvbnMoXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbjxGaWxlU3lzdGVtQ29sbGVjdGlvbkRlc2NyaXB0aW9uLCBGaWxlU3lzdGVtU2NoZW1hdGljRGVzY3JpcHRpb24+LFxuICAgIHNjaGVtYXRpY05hbWU6IHN0cmluZyxcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICApOiBQcm9taXNlPE9wdGlvbltdPiB7XG4gICAgY29uc3Qgc2NoZW1hdGljID0gY29sbGVjdGlvbi5jcmVhdGVTY2hlbWF0aWMoc2NoZW1hdGljTmFtZSwgdHJ1ZSk7XG4gICAgY29uc3QgeyBzY2hlbWFKc29uIH0gPSBzY2hlbWF0aWMuZGVzY3JpcHRpb247XG5cbiAgICBpZiAoIXNjaGVtYUpzb24pIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKHdvcmtmbG93LnJlZ2lzdHJ5LCBzY2hlbWFKc29uKTtcbiAgfVxuXG4gIHByaXZhdGUgX3dvcmtmbG93Rm9yQnVpbGRlciA9IG5ldyBNYXA8c3RyaW5nLCBOb2RlV29ya2Zsb3c+KCk7XG4gIHByb3RlY3RlZCBnZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZTogc3RyaW5nKTogTm9kZVdvcmtmbG93IHtcbiAgICBjb25zdCBjYWNoZWQgPSB0aGlzLl93b3JrZmxvd0ZvckJ1aWxkZXIuZ2V0KGNvbGxlY3Rpb25OYW1lKTtcbiAgICBpZiAoY2FjaGVkKSB7XG4gICAgICByZXR1cm4gY2FjaGVkO1xuICAgIH1cblxuICAgIGNvbnN0IHdvcmtmbG93ID0gbmV3IE5vZGVXb3JrZmxvdyh0aGlzLmNvbnRleHQucm9vdCwge1xuICAgICAgcmVzb2x2ZVBhdGhzOiB0aGlzLmdldFJlc29sdmVQYXRocyhjb2xsZWN0aW9uTmFtZSksXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KTtcblxuICAgIHRoaXMuX3dvcmtmbG93Rm9yQnVpbGRlci5zZXQoY29sbGVjdGlvbk5hbWUsIHdvcmtmbG93KTtcblxuICAgIHJldHVybiB3b3JrZmxvdztcbiAgfVxuXG4gIHByaXZhdGUgX3dvcmtmbG93Rm9yRXhlY3V0aW9uOiBOb2RlV29ya2Zsb3cgfCB1bmRlZmluZWQ7XG4gIHByb3RlY3RlZCBhc3luYyBnZXRPckNyZWF0ZVdvcmtmbG93Rm9yRXhlY3V0aW9uKFxuICAgIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcsXG4gICAgb3B0aW9uczogU2NoZW1hdGljc0V4ZWN1dGlvbk9wdGlvbnMsXG4gICk6IFByb21pc2U8Tm9kZVdvcmtmbG93PiB7XG4gICAgaWYgKHRoaXMuX3dvcmtmbG93Rm9yRXhlY3V0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd29ya2Zsb3dGb3JFeGVjdXRpb247XG4gICAgfVxuXG4gICAgY29uc3QgeyBsb2dnZXIsIHJvb3QsIHBhY2thZ2VNYW5hZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgeyBmb3JjZSwgZHJ5UnVuLCBwYWNrYWdlUmVnaXN0cnkgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IG5ldyBOb2RlV29ya2Zsb3cocm9vdCwge1xuICAgICAgZm9yY2UsXG4gICAgICBkcnlSdW4sXG4gICAgICBwYWNrYWdlTWFuYWdlcixcbiAgICAgIC8vIEEgc2NoZW1hIHJlZ2lzdHJ5IGlzIHJlcXVpcmVkIHRvIGFsbG93IGN1c3RvbWl6aW5nIGFkZFVuZGVmaW5lZERlZmF1bHRzXG4gICAgICByZWdpc3RyeTogbmV3IHNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoZm9ybWF0cy5zdGFuZGFyZEZvcm1hdHMpLFxuICAgICAgcGFja2FnZVJlZ2lzdHJ5LFxuICAgICAgcmVzb2x2ZVBhdGhzOiB0aGlzLmdldFJlc29sdmVQYXRocyhjb2xsZWN0aW9uTmFtZSksXG4gICAgICBzY2hlbWFWYWxpZGF0aW9uOiB0cnVlLFxuICAgICAgb3B0aW9uVHJhbnNmb3JtczogW1xuICAgICAgICAvLyBBZGQgY29uZmlndXJhdGlvbiBmaWxlIGRlZmF1bHRzXG4gICAgICAgIGFzeW5jIChzY2hlbWF0aWMsIGN1cnJlbnQpID0+IHtcbiAgICAgICAgICBjb25zdCBwcm9qZWN0TmFtZSA9XG4gICAgICAgICAgICB0eXBlb2YgKGN1cnJlbnQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLnByb2plY3QgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICAgID8gKChjdXJyZW50IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5wcm9qZWN0IGFzIHN0cmluZylcbiAgICAgICAgICAgICAgOiB0aGlzLmdldFByb2plY3ROYW1lKCk7XG5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4uKGF3YWl0IGdldFNjaGVtYXRpY0RlZmF1bHRzKHNjaGVtYXRpYy5jb2xsZWN0aW9uLm5hbWUsIHNjaGVtYXRpYy5uYW1lLCBwcm9qZWN0TmFtZSkpLFxuICAgICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGVuZ2luZUhvc3RDcmVhdG9yOiAob3B0aW9ucykgPT4gbmV3IFNjaGVtYXRpY0VuZ2luZUhvc3Qob3B0aW9ucy5yZXNvbHZlUGF0aHMpLFxuICAgIH0pO1xuXG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkUG9zdFRyYW5zZm9ybShzY2hlbWEudHJhbnNmb3Jtcy5hZGRVbmRlZmluZWREZWZhdWx0cyk7XG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ3Byb2plY3ROYW1lJywgKCkgPT4gdGhpcy5nZXRQcm9qZWN0TmFtZSgpKTtcbiAgICB3b3JrZmxvdy5yZWdpc3RyeS51c2VYRGVwcmVjYXRlZFByb3ZpZGVyKChtc2cpID0+IGxvZ2dlci53YXJuKG1zZykpO1xuXG4gICAgbGV0IHNob3VsZFJlcG9ydEFuYWx5dGljcyA9IHRydWU7XG4gICAgd29ya2Zsb3cuZW5naW5lSG9zdC5yZWdpc3Rlck9wdGlvbnNUcmFuc2Zvcm0oYXN5bmMgKHNjaGVtYXRpYywgb3B0aW9ucykgPT4ge1xuICAgICAgaWYgKHNob3VsZFJlcG9ydEFuYWx5dGljcykge1xuICAgICAgICBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSBmYWxzZTtcbiAgICAgICAgLy8gbmcgZ2VuZXJhdGUgbGliIC0+IG5nIGdlbmVyYXRlXG4gICAgICAgIGNvbnN0IGNvbW1hbmROYW1lID0gdGhpcy5jb21tYW5kPy5zcGxpdCgnICcsIDEpWzBdO1xuXG4gICAgICAgIGF3YWl0IHRoaXMucmVwb3J0QW5hbHl0aWNzKG9wdGlvbnMgYXMge30sIFtcbiAgICAgICAgICBjb21tYW5kTmFtZSxcbiAgICAgICAgICBzY2hlbWF0aWMuY29sbGVjdGlvbi5uYW1lLnJlcGxhY2UoL1xcLy9nLCAnXycpLFxuICAgICAgICAgIHNjaGVtYXRpYy5uYW1lLnJlcGxhY2UoL1xcLy9nLCAnXycpLFxuICAgICAgICBdKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgfSk7XG5cbiAgICBpZiAob3B0aW9ucy5pbnRlcmFjdGl2ZSAhPT0gZmFsc2UgJiYgaXNUVFkoKSkge1xuICAgICAgd29ya2Zsb3cucmVnaXN0cnkudXNlUHJvbXB0UHJvdmlkZXIoKGRlZmluaXRpb25zOiBBcnJheTxzY2hlbWEuUHJvbXB0RGVmaW5pdGlvbj4pID0+IHtcbiAgICAgICAgY29uc3QgcXVlc3Rpb25zOiBpbnF1aXJlci5RdWVzdGlvbkNvbGxlY3Rpb24gPSBkZWZpbml0aW9uc1xuICAgICAgICAgIC5maWx0ZXIoKGRlZmluaXRpb24pID0+ICFvcHRpb25zLmRlZmF1bHRzIHx8IGRlZmluaXRpb24uZGVmYXVsdCA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgIC5tYXAoKGRlZmluaXRpb24pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0aW9uOiBpbnF1aXJlci5RdWVzdGlvbiA9IHtcbiAgICAgICAgICAgICAgbmFtZTogZGVmaW5pdGlvbi5pZCxcbiAgICAgICAgICAgICAgbWVzc2FnZTogZGVmaW5pdGlvbi5tZXNzYWdlLFxuICAgICAgICAgICAgICBkZWZhdWx0OiBkZWZpbml0aW9uLmRlZmF1bHQsXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0b3IgPSBkZWZpbml0aW9uLnZhbGlkYXRvcjtcbiAgICAgICAgICAgIGlmICh2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgICAgcXVlc3Rpb24udmFsaWRhdGUgPSAoaW5wdXQpID0+IHZhbGlkYXRvcihpbnB1dCk7XG5cbiAgICAgICAgICAgICAgLy8gRmlsdGVyIGFsbG93cyB0cmFuc2Zvcm1hdGlvbiBvZiB0aGUgdmFsdWUgcHJpb3IgdG8gdmFsaWRhdGlvblxuICAgICAgICAgICAgICBxdWVzdGlvbi5maWx0ZXIgPSBhc3luYyAoaW5wdXQpID0+IHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHR5cGUgb2YgZGVmaW5pdGlvbi5wcm9wZXJ0eVR5cGVzKSB7XG4gICAgICAgICAgICAgICAgICBsZXQgdmFsdWU7XG4gICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IFN0cmluZyhpbnB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ludGVnZXInOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gTnVtYmVyKGlucHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGlucHV0O1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gQ2FuIGJlIGEgc3RyaW5nIGlmIHZhbGlkYXRpb24gZmFpbHNcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGlzVmFsaWQgPSAoYXdhaXQgdmFsaWRhdG9yKHZhbHVlKSkgPT09IHRydWU7XG4gICAgICAgICAgICAgICAgICBpZiAoaXNWYWxpZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0O1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzd2l0Y2ggKGRlZmluaXRpb24udHlwZSkge1xuICAgICAgICAgICAgICBjYXNlICdjb25maXJtYXRpb24nOlxuICAgICAgICAgICAgICAgIHF1ZXN0aW9uLnR5cGUgPSAnY29uZmlybSc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2xpc3QnOlxuICAgICAgICAgICAgICAgIHF1ZXN0aW9uLnR5cGUgPSBkZWZpbml0aW9uLm11bHRpc2VsZWN0ID8gJ2NoZWNrYm94JyA6ICdsaXN0JztcbiAgICAgICAgICAgICAgICAocXVlc3Rpb24gYXMgaW5xdWlyZXIuQ2hlY2tib3hRdWVzdGlvbikuY2hvaWNlcyA9IGRlZmluaXRpb24uaXRlbXM/Lm1hcCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBpdGVtID09ICdzdHJpbmcnXG4gICAgICAgICAgICAgICAgICAgID8gaXRlbVxuICAgICAgICAgICAgICAgICAgICA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubGFiZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHF1ZXN0aW9uLnR5cGUgPSBkZWZpbml0aW9uLnR5cGU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBxdWVzdGlvbjtcbiAgICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gaW5xdWlyZXIucHJvbXB0KHF1ZXN0aW9ucyk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gKHRoaXMuX3dvcmtmbG93Rm9yRXhlY3V0aW9uID0gd29ya2Zsb3cpO1xuICB9XG5cbiAgcHJpdmF0ZSBfc2NoZW1hdGljQ29sbGVjdGlvbnM6IFNldDxzdHJpbmc+IHwgdW5kZWZpbmVkO1xuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0U2NoZW1hdGljQ29sbGVjdGlvbnMoKTogUHJvbWlzZTxTZXQ8c3RyaW5nPj4ge1xuICAgIGlmICh0aGlzLl9zY2hlbWF0aWNDb2xsZWN0aW9ucykge1xuICAgICAgcmV0dXJuIHRoaXMuX3NjaGVtYXRpY0NvbGxlY3Rpb25zO1xuICAgIH1cblxuICAgIGNvbnN0IGdldFNjaGVtYXRpY0NvbGxlY3Rpb25zID0gKFxuICAgICAgY29uZmlnU2VjdGlvbjogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCB1bmRlZmluZWQsXG4gICAgKTogU2V0PHN0cmluZz4gfCB1bmRlZmluZWQgPT4ge1xuICAgICAgaWYgKCFjb25maWdTZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHsgc2NoZW1hdGljQ29sbGVjdGlvbnMsIGRlZmF1bHRDb2xsZWN0aW9uIH0gPSBjb25maWdTZWN0aW9uO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc2NoZW1hdGljQ29sbGVjdGlvbnMpKSB7XG4gICAgICAgIHJldHVybiBuZXcgU2V0KHNjaGVtYXRpY0NvbGxlY3Rpb25zKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmF1bHRDb2xsZWN0aW9uID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gbmV3IFNldChbZGVmYXVsdENvbGxlY3Rpb25dKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgY29uc3QgbG9jYWxXb3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG4gICAgaWYgKGxvY2FsV29ya3NwYWNlKSB7XG4gICAgICBjb25zdCBwcm9qZWN0ID0gZ2V0UHJvamVjdEJ5Q3dkKGxvY2FsV29ya3NwYWNlKTtcbiAgICAgIGlmIChwcm9qZWN0KSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZ2V0U2NoZW1hdGljQ29sbGVjdGlvbnMobG9jYWxXb3Jrc3BhY2UuZ2V0UHJvamVjdENsaShwcm9qZWN0KSk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgIHRoaXMuX3NjaGVtYXRpY0NvbGxlY3Rpb25zID0gdmFsdWU7XG5cbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBnbG9iYWxXb3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIGNvbnN0IHZhbHVlID1cbiAgICAgIGdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKGxvY2FsV29ya3NwYWNlPy5nZXRDbGkoKSkgPz9cbiAgICAgIGdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKGdsb2JhbFdvcmtzcGFjZT8uZ2V0Q2xpKCkpO1xuICAgIGlmICh2YWx1ZSkge1xuICAgICAgdGhpcy5fc2NoZW1hdGljQ29sbGVjdGlvbnMgPSB2YWx1ZTtcblxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIHRoaXMuX3NjaGVtYXRpY0NvbGxlY3Rpb25zID0gbmV3IFNldChbREVGQVVMVF9TQ0hFTUFUSUNTX0NPTExFQ1RJT05dKTtcblxuICAgIHJldHVybiB0aGlzLl9zY2hlbWF0aWNDb2xsZWN0aW9ucztcbiAgfVxuXG4gIHByb3RlY3RlZCBwYXJzZVNjaGVtYXRpY0luZm8oXG4gICAgc2NoZW1hdGljOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICk6IFtjb2xsZWN0aW9uTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBzY2hlbWF0aWNOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWRdIHtcbiAgICBpZiAoc2NoZW1hdGljPy5pbmNsdWRlcygnOicpKSB7XG4gICAgICBjb25zdCBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gc2NoZW1hdGljLnNwbGl0KCc6JywgMik7XG5cbiAgICAgIHJldHVybiBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdO1xuICAgIH1cblxuICAgIHJldHVybiBbdW5kZWZpbmVkLCBzY2hlbWF0aWNdO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1blNjaGVtYXRpYyhvcHRpb25zOiB7XG4gICAgZXhlY3V0aW9uT3B0aW9uczogU2NoZW1hdGljc0V4ZWN1dGlvbk9wdGlvbnM7XG4gICAgc2NoZW1hdGljT3B0aW9uczogT3RoZXJPcHRpb25zO1xuICAgIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmc7XG4gICAgc2NoZW1hdGljTmFtZTogc3RyaW5nO1xuICB9KTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHsgc2NoZW1hdGljT3B0aW9ucywgZXhlY3V0aW9uT3B0aW9ucywgY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWUgfSA9IG9wdGlvbnM7XG4gICAgY29uc3Qgd29ya2Zsb3cgPSBhd2FpdCB0aGlzLmdldE9yQ3JlYXRlV29ya2Zsb3dGb3JFeGVjdXRpb24oY29sbGVjdGlvbk5hbWUsIGV4ZWN1dGlvbk9wdGlvbnMpO1xuXG4gICAgaWYgKCFzY2hlbWF0aWNOYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3NjaGVtYXRpY05hbWUgY2Fubm90IGJlIHVuZGVmaW5lZC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCB7IHVuc3Vic2NyaWJlLCBmaWxlcyB9ID0gc3Vic2NyaWJlVG9Xb3JrZmxvdyh3b3JrZmxvdywgbG9nZ2VyKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB3b3JrZmxvd1xuICAgICAgICAuZXhlY3V0ZSh7XG4gICAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgICAgc2NoZW1hdGljOiBzY2hlbWF0aWNOYW1lLFxuICAgICAgICAgIG9wdGlvbnM6IHNjaGVtYXRpY09wdGlvbnMsXG4gICAgICAgICAgbG9nZ2VyLFxuICAgICAgICAgIGFsbG93UHJpdmF0ZTogdGhpcy5hbGxvd1ByaXZhdGVTY2hlbWF0aWNzLFxuICAgICAgICB9KVxuICAgICAgICAudG9Qcm9taXNlKCk7XG5cbiAgICAgIGlmICghZmlsZXMuc2l6ZSkge1xuICAgICAgICBsb2dnZXIuaW5mbygnTm90aGluZyB0byBiZSBkb25lLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXhlY3V0aW9uT3B0aW9ucy5kcnlSdW4pIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oYFxcbk5PVEU6IFRoZSBcIi0tZHJ5LXJ1blwiIG9wdGlvbiBtZWFucyBubyBjaGFuZ2VzIHdlcmUgbWFkZS5gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIEluIGNhc2UgdGhlIHdvcmtmbG93IHdhcyBub3Qgc3VjY2Vzc2Z1bCwgc2hvdyBhbiBhcHByb3ByaWF0ZSBlcnJvciBtZXNzYWdlLlxuICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uKSB7XG4gICAgICAgIC8vIFwiU2VlIGFib3ZlXCIgYmVjYXVzZSB3ZSBhbHJlYWR5IHByaW50ZWQgdGhlIGVycm9yLlxuICAgICAgICBsb2dnZXIuZmF0YWwoJ1RoZSBTY2hlbWF0aWMgd29ya2Zsb3cgZmFpbGVkLiBTZWUgYWJvdmUuJyk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHVuc3Vic2NyaWJlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwcml2YXRlIGRlZmF1bHRQcm9qZWN0RGVwcmVjYXRpb25XYXJuaW5nU2hvd24gPSBmYWxzZTtcbiAgcHJpdmF0ZSBnZXRQcm9qZWN0TmFtZSgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlLCBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBpZiAoIXdvcmtzcGFjZSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0TmFtZXMgPSBnZXRQcm9qZWN0c0J5UGF0aCh3b3Jrc3BhY2UsIHByb2Nlc3MuY3dkKCksIHdvcmtzcGFjZS5iYXNlUGF0aCk7XG5cbiAgICBpZiAocHJvamVjdE5hbWVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgcmV0dXJuIHByb2plY3ROYW1lc1swXTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHByb2plY3ROYW1lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGxvZ2dlci53YXJuKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgIFR3byBvciBtb3JlIHByb2plY3RzIGFyZSB1c2luZyBpZGVudGljYWwgcm9vdHMuXG4gICAgICAgICAgICBVbmFibGUgdG8gZGV0ZXJtaW5lIHByb2plY3QgdXNpbmcgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeS5cbiAgICAgICAgICAgIFVzaW5nIGRlZmF1bHQgd29ya3NwYWNlIHByb2plY3QgaW5zdGVhZC5cbiAgICAgICAgICBgKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVmYXVsdFByb2plY3ROYW1lID0gd29ya3NwYWNlLmV4dGVuc2lvbnNbJ2RlZmF1bHRQcm9qZWN0J107XG4gICAgICBpZiAodHlwZW9mIGRlZmF1bHRQcm9qZWN0TmFtZSA9PT0gJ3N0cmluZycgJiYgZGVmYXVsdFByb2plY3ROYW1lKSB7XG4gICAgICAgIGlmICghdGhpcy5kZWZhdWx0UHJvamVjdERlcHJlY2F0aW9uV2FybmluZ1Nob3duKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4odGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgREVQUkVDQVRFRDogVGhlICdkZWZhdWx0UHJvamVjdCcgd29ya3NwYWNlIG9wdGlvbiBoYXMgYmVlbiBkZXByZWNhdGVkLlxuICAgICAgICAgICAgVGhlIHByb2plY3QgdG8gdXNlIHdpbGwgYmUgZGV0ZXJtaW5lZCBmcm9tIHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LlxuICAgICAgICAgIGApO1xuXG4gICAgICAgICAgdGhpcy5kZWZhdWx0UHJvamVjdERlcHJlY2F0aW9uV2FybmluZ1Nob3duID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkZWZhdWx0UHJvamVjdE5hbWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVzb2x2ZVBhdGhzKGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UsIHJvb3QgfSA9IHRoaXMuY29udGV4dDtcblxuICAgIHJldHVybiB3b3Jrc3BhY2VcbiAgICAgID8gLy8gV29ya3NwYWNlXG4gICAgICAgIGNvbGxlY3Rpb25OYW1lID09PSBERUZBVUxUX1NDSEVNQVRJQ1NfQ09MTEVDVElPTlxuICAgICAgICA/IC8vIEZhdm9yIF9fZGlybmFtZSBmb3IgQHNjaGVtYXRpY3MvYW5ndWxhciB0byB1c2UgdGhlIGJ1aWxkLWluIHZlcnNpb25cbiAgICAgICAgICBbX19kaXJuYW1lLCBwcm9jZXNzLmN3ZCgpLCByb290XVxuICAgICAgICA6IFtwcm9jZXNzLmN3ZCgpLCByb290LCBfX2Rpcm5hbWVdXG4gICAgICA6IC8vIEdsb2JhbFxuICAgICAgICBbX19kaXJuYW1lLCBwcm9jZXNzLmN3ZCgpXTtcbiAgfVxufVxuIl19