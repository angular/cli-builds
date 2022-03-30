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
exports.SchematicsCommandModule = exports.DEFAULT_SCHEMATICS_COLLECTION = void 0;
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const tools_1 = require("@angular-devkit/schematics/tools");
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
            packageManager: packageManager.name,
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
            workflow.registry.usePromptProvider(async (definitions) => {
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
                if (questions.length) {
                    const { prompt } = await Promise.resolve().then(() => __importStar(require('inquirer')));
                    return prompt(questions);
                }
                else {
                    return {};
                }
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
        const { workspace, globalConfiguration } = this.context;
        if (workspace) {
            const project = (0, config_1.getProjectByCwd)(workspace);
            if (project) {
                const value = getSchematicCollections(workspace.getProjectCli(project));
                if (value) {
                    this._schematicCollections = value;
                    return value;
                }
            }
        }
        const value = (_a = getSchematicCollections(workspace === null || workspace === void 0 ? void 0 : workspace.getCli())) !== null && _a !== void 0 ? _a : getSchematicCollections(globalConfiguration === null || globalConfiguration === void 0 ? void 0 : globalConfiguration.getCli());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFvRDtBQUNwRCwyREFBZ0c7QUFDaEcsNERBSTBDO0FBRzFDLGdEQUErRjtBQUMvRiwwQ0FBeUM7QUFDekMscURBTTBCO0FBQzFCLHlEQUEyRTtBQUMzRSw2RUFBd0U7QUFDeEUsdUVBQXFFO0FBRXhELFFBQUEsNkJBQTZCLEdBQUcscUJBQXFCLENBQUM7QUFhbkUsTUFBc0IsdUJBQ3BCLFNBQVEsOEJBQW9DO0lBRDlDOztRQUtxQiwyQkFBc0IsR0FBWSxLQUFLLENBQUM7UUFDL0IsMEJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBMkNsRCx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQztRQTJRdEQsMENBQXFDLEdBQUcsS0FBSyxDQUFDO0lBa0R4RCxDQUFDO0lBdFdDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBVTtRQUN0QixPQUFPLElBQUk7YUFDUixNQUFNLENBQUMsYUFBYSxFQUFFO1lBQ3JCLFFBQVEsRUFBRSxtQ0FBbUM7WUFDN0MsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtTQUNkLENBQUM7YUFDRCxNQUFNLENBQUMsU0FBUyxFQUFFO1lBQ2pCLFFBQVEsRUFBRSwrREFBK0Q7WUFDekUsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFNLENBQUMsVUFBVSxFQUFFO1lBQ2xCLFFBQVEsRUFBRSwrREFBK0Q7WUFDekUsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztT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LDBEQThXQztBQTFXaUIsNkJBQUssR0FBRyw2QkFBWSxDQUFDLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBzY2hlbWEsIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBDb2xsZWN0aW9uLCBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbiwgZm9ybWF0cyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7XG4gIEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzY3JpcHRpb24sXG4gIEZpbGVTeXN0ZW1TY2hlbWF0aWNEZXNjcmlwdGlvbixcbiAgTm9kZVdvcmtmbG93LFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgdHlwZSB7IENoZWNrYm94UXVlc3Rpb24sIFF1ZXN0aW9uIH0gZnJvbSAnaW5xdWlyZXInO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IGdldFByb2plY3RCeUN3ZCwgZ2V0UHJvamVjdHNCeVBhdGgsIGdldFNjaGVtYXRpY0RlZmF1bHRzIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4uL3V0aWxpdGllcy90dHknO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBPcHRpb24sIHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyB9IGZyb20gJy4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYXRpY0VuZ2luZUhvc3QgfSBmcm9tICcuL3V0aWxpdGllcy9zY2hlbWF0aWMtZW5naW5lLWhvc3QnO1xuaW1wb3J0IHsgc3Vic2NyaWJlVG9Xb3JrZmxvdyB9IGZyb20gJy4vdXRpbGl0aWVzL3NjaGVtYXRpYy13b3JrZmxvdyc7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NDSEVNQVRJQ1NfQ09MTEVDVElPTiA9ICdAc2NoZW1hdGljcy9hbmd1bGFyJztcblxuZXhwb3J0IGludGVyZmFjZSBTY2hlbWF0aWNzQ29tbWFuZEFyZ3Mge1xuICBpbnRlcmFjdGl2ZTogYm9vbGVhbjtcbiAgZm9yY2U6IGJvb2xlYW47XG4gICdkcnktcnVuJzogYm9vbGVhbjtcbiAgZGVmYXVsdHM6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2NoZW1hdGljc0V4ZWN1dGlvbk9wdGlvbnMgZXh0ZW5kcyBPcHRpb25zPFNjaGVtYXRpY3NDb21tYW5kQXJncz4ge1xuICBwYWNrYWdlUmVnaXN0cnk/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTY2hlbWF0aWNzQ29tbWFuZE1vZHVsZVxuICBleHRlbmRzIENvbW1hbmRNb2R1bGU8U2NoZW1hdGljc0NvbW1hbmRBcmdzPlxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxTY2hlbWF0aWNzQ29tbWFuZEFyZ3M+XG57XG4gIHN0YXRpYyBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5JbjtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGFsbG93UHJpdmF0ZVNjaGVtYXRpY3M6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIHJlYWRvbmx5IHNob3VsZFJlcG9ydEFuYWx5dGljcyA9IGZhbHNlO1xuXG4gIGFzeW5jIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxTY2hlbWF0aWNzQ29tbWFuZEFyZ3M+PiB7XG4gICAgcmV0dXJuIGFyZ3ZcbiAgICAgIC5vcHRpb24oJ2ludGVyYWN0aXZlJywge1xuICAgICAgICBkZXNjcmliZTogJ0VuYWJsZSBpbnRlcmFjdGl2ZSBpbnB1dCBwcm9tcHRzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdkcnktcnVuJywge1xuICAgICAgICBkZXNjcmliZTogJ1J1biB0aHJvdWdoIGFuZCByZXBvcnRzIGFjdGl2aXR5IHdpdGhvdXQgd3JpdGluZyBvdXQgcmVzdWx0cy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2RlZmF1bHRzJywge1xuICAgICAgICBkZXNjcmliZTogJ0Rpc2FibGUgaW50ZXJhY3RpdmUgaW5wdXQgcHJvbXB0cyBmb3Igb3B0aW9ucyB3aXRoIGEgZGVmYXVsdC4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2ZvcmNlJywge1xuICAgICAgICBkZXNjcmliZTogJ0ZvcmNlIG92ZXJ3cml0aW5nIG9mIGV4aXN0aW5nIGZpbGVzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLnN0cmljdCgpO1xuICB9XG5cbiAgLyoqIEdldCBzY2hlbWF0aWMgc2NoZW1hIG9wdGlvbnMuKi9cbiAgcHJvdGVjdGVkIGFzeW5jIGdldFNjaGVtYXRpY09wdGlvbnMoXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbjxGaWxlU3lzdGVtQ29sbGVjdGlvbkRlc2NyaXB0aW9uLCBGaWxlU3lzdGVtU2NoZW1hdGljRGVzY3JpcHRpb24+LFxuICAgIHNjaGVtYXRpY05hbWU6IHN0cmluZyxcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICApOiBQcm9taXNlPE9wdGlvbltdPiB7XG4gICAgY29uc3Qgc2NoZW1hdGljID0gY29sbGVjdGlvbi5jcmVhdGVTY2hlbWF0aWMoc2NoZW1hdGljTmFtZSwgdHJ1ZSk7XG4gICAgY29uc3QgeyBzY2hlbWFKc29uIH0gPSBzY2hlbWF0aWMuZGVzY3JpcHRpb247XG5cbiAgICBpZiAoIXNjaGVtYUpzb24pIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKHdvcmtmbG93LnJlZ2lzdHJ5LCBzY2hlbWFKc29uKTtcbiAgfVxuXG4gIHByaXZhdGUgX3dvcmtmbG93Rm9yQnVpbGRlciA9IG5ldyBNYXA8c3RyaW5nLCBOb2RlV29ya2Zsb3c+KCk7XG4gIHByb3RlY3RlZCBnZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZTogc3RyaW5nKTogTm9kZVdvcmtmbG93IHtcbiAgICBjb25zdCBjYWNoZWQgPSB0aGlzLl93b3JrZmxvd0ZvckJ1aWxkZXIuZ2V0KGNvbGxlY3Rpb25OYW1lKTtcbiAgICBpZiAoY2FjaGVkKSB7XG4gICAgICByZXR1cm4gY2FjaGVkO1xuICAgIH1cblxuICAgIGNvbnN0IHdvcmtmbG93ID0gbmV3IE5vZGVXb3JrZmxvdyh0aGlzLmNvbnRleHQucm9vdCwge1xuICAgICAgcmVzb2x2ZVBhdGhzOiB0aGlzLmdldFJlc29sdmVQYXRocyhjb2xsZWN0aW9uTmFtZSksXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KTtcblxuICAgIHRoaXMuX3dvcmtmbG93Rm9yQnVpbGRlci5zZXQoY29sbGVjdGlvbk5hbWUsIHdvcmtmbG93KTtcblxuICAgIHJldHVybiB3b3JrZmxvdztcbiAgfVxuXG4gIHByaXZhdGUgX3dvcmtmbG93Rm9yRXhlY3V0aW9uOiBOb2RlV29ya2Zsb3cgfCB1bmRlZmluZWQ7XG4gIHByb3RlY3RlZCBhc3luYyBnZXRPckNyZWF0ZVdvcmtmbG93Rm9yRXhlY3V0aW9uKFxuICAgIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcsXG4gICAgb3B0aW9uczogU2NoZW1hdGljc0V4ZWN1dGlvbk9wdGlvbnMsXG4gICk6IFByb21pc2U8Tm9kZVdvcmtmbG93PiB7XG4gICAgaWYgKHRoaXMuX3dvcmtmbG93Rm9yRXhlY3V0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd29ya2Zsb3dGb3JFeGVjdXRpb247XG4gICAgfVxuXG4gICAgY29uc3QgeyBsb2dnZXIsIHJvb3QsIHBhY2thZ2VNYW5hZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgeyBmb3JjZSwgZHJ5UnVuLCBwYWNrYWdlUmVnaXN0cnkgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IG5ldyBOb2RlV29ya2Zsb3cocm9vdCwge1xuICAgICAgZm9yY2UsXG4gICAgICBkcnlSdW4sXG4gICAgICBwYWNrYWdlTWFuYWdlcjogcGFja2FnZU1hbmFnZXIubmFtZSxcbiAgICAgIC8vIEEgc2NoZW1hIHJlZ2lzdHJ5IGlzIHJlcXVpcmVkIHRvIGFsbG93IGN1c3RvbWl6aW5nIGFkZFVuZGVmaW5lZERlZmF1bHRzXG4gICAgICByZWdpc3RyeTogbmV3IHNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoZm9ybWF0cy5zdGFuZGFyZEZvcm1hdHMpLFxuICAgICAgcGFja2FnZVJlZ2lzdHJ5LFxuICAgICAgcmVzb2x2ZVBhdGhzOiB0aGlzLmdldFJlc29sdmVQYXRocyhjb2xsZWN0aW9uTmFtZSksXG4gICAgICBzY2hlbWFWYWxpZGF0aW9uOiB0cnVlLFxuICAgICAgb3B0aW9uVHJhbnNmb3JtczogW1xuICAgICAgICAvLyBBZGQgY29uZmlndXJhdGlvbiBmaWxlIGRlZmF1bHRzXG4gICAgICAgIGFzeW5jIChzY2hlbWF0aWMsIGN1cnJlbnQpID0+IHtcbiAgICAgICAgICBjb25zdCBwcm9qZWN0TmFtZSA9XG4gICAgICAgICAgICB0eXBlb2YgKGN1cnJlbnQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLnByb2plY3QgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICAgID8gKChjdXJyZW50IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5wcm9qZWN0IGFzIHN0cmluZylcbiAgICAgICAgICAgICAgOiB0aGlzLmdldFByb2plY3ROYW1lKCk7XG5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4uKGF3YWl0IGdldFNjaGVtYXRpY0RlZmF1bHRzKHNjaGVtYXRpYy5jb2xsZWN0aW9uLm5hbWUsIHNjaGVtYXRpYy5uYW1lLCBwcm9qZWN0TmFtZSkpLFxuICAgICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGVuZ2luZUhvc3RDcmVhdG9yOiAob3B0aW9ucykgPT4gbmV3IFNjaGVtYXRpY0VuZ2luZUhvc3Qob3B0aW9ucy5yZXNvbHZlUGF0aHMpLFxuICAgIH0pO1xuXG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkUG9zdFRyYW5zZm9ybShzY2hlbWEudHJhbnNmb3Jtcy5hZGRVbmRlZmluZWREZWZhdWx0cyk7XG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ3Byb2plY3ROYW1lJywgKCkgPT4gdGhpcy5nZXRQcm9qZWN0TmFtZSgpKTtcbiAgICB3b3JrZmxvdy5yZWdpc3RyeS51c2VYRGVwcmVjYXRlZFByb3ZpZGVyKChtc2cpID0+IGxvZ2dlci53YXJuKG1zZykpO1xuXG4gICAgbGV0IHNob3VsZFJlcG9ydEFuYWx5dGljcyA9IHRydWU7XG4gICAgd29ya2Zsb3cuZW5naW5lSG9zdC5yZWdpc3Rlck9wdGlvbnNUcmFuc2Zvcm0oYXN5bmMgKHNjaGVtYXRpYywgb3B0aW9ucykgPT4ge1xuICAgICAgaWYgKHNob3VsZFJlcG9ydEFuYWx5dGljcykge1xuICAgICAgICBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSBmYWxzZTtcbiAgICAgICAgLy8gbmcgZ2VuZXJhdGUgbGliIC0+IG5nIGdlbmVyYXRlXG4gICAgICAgIGNvbnN0IGNvbW1hbmROYW1lID0gdGhpcy5jb21tYW5kPy5zcGxpdCgnICcsIDEpWzBdO1xuXG4gICAgICAgIGF3YWl0IHRoaXMucmVwb3J0QW5hbHl0aWNzKG9wdGlvbnMgYXMge30sIFtcbiAgICAgICAgICBjb21tYW5kTmFtZSxcbiAgICAgICAgICBzY2hlbWF0aWMuY29sbGVjdGlvbi5uYW1lLnJlcGxhY2UoL1xcLy9nLCAnXycpLFxuICAgICAgICAgIHNjaGVtYXRpYy5uYW1lLnJlcGxhY2UoL1xcLy9nLCAnXycpLFxuICAgICAgICBdKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgfSk7XG5cbiAgICBpZiAob3B0aW9ucy5pbnRlcmFjdGl2ZSAhPT0gZmFsc2UgJiYgaXNUVFkoKSkge1xuICAgICAgd29ya2Zsb3cucmVnaXN0cnkudXNlUHJvbXB0UHJvdmlkZXIoYXN5bmMgKGRlZmluaXRpb25zOiBBcnJheTxzY2hlbWEuUHJvbXB0RGVmaW5pdGlvbj4pID0+IHtcbiAgICAgICAgY29uc3QgcXVlc3Rpb25zID0gZGVmaW5pdGlvbnNcbiAgICAgICAgICAuZmlsdGVyKChkZWZpbml0aW9uKSA9PiAhb3B0aW9ucy5kZWZhdWx0cyB8fCBkZWZpbml0aW9uLmRlZmF1bHQgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAubWFwKChkZWZpbml0aW9uKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdGlvbjogUXVlc3Rpb24gPSB7XG4gICAgICAgICAgICAgIG5hbWU6IGRlZmluaXRpb24uaWQsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IGRlZmluaXRpb24ubWVzc2FnZSxcbiAgICAgICAgICAgICAgZGVmYXVsdDogZGVmaW5pdGlvbi5kZWZhdWx0LFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgdmFsaWRhdG9yID0gZGVmaW5pdGlvbi52YWxpZGF0b3I7XG4gICAgICAgICAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgIHF1ZXN0aW9uLnZhbGlkYXRlID0gKGlucHV0KSA9PiB2YWxpZGF0b3IoaW5wdXQpO1xuXG4gICAgICAgICAgICAgIC8vIEZpbHRlciBhbGxvd3MgdHJhbnNmb3JtYXRpb24gb2YgdGhlIHZhbHVlIHByaW9yIHRvIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgcXVlc3Rpb24uZmlsdGVyID0gYXN5bmMgKGlucHV0KSA9PiB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB0eXBlIG9mIGRlZmluaXRpb24ucHJvcGVydHlUeXBlcykge1xuICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBTdHJpbmcoaW5wdXQpO1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IE51bWJlcihpbnB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBpbnB1dDtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIENhbiBiZSBhIHN0cmluZyBpZiB2YWxpZGF0aW9uIGZhaWxzXG4gICAgICAgICAgICAgICAgICBjb25zdCBpc1ZhbGlkID0gKGF3YWl0IHZhbGlkYXRvcih2YWx1ZSkpID09PSB0cnVlO1xuICAgICAgICAgICAgICAgICAgaWYgKGlzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dDtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3dpdGNoIChkZWZpbml0aW9uLnR5cGUpIHtcbiAgICAgICAgICAgICAgY2FzZSAnY29uZmlybWF0aW9uJzpcbiAgICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gJ2NvbmZpcm0nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdsaXN0JzpcbiAgICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gZGVmaW5pdGlvbi5tdWx0aXNlbGVjdCA/ICdjaGVja2JveCcgOiAnbGlzdCc7XG4gICAgICAgICAgICAgICAgKHF1ZXN0aW9uIGFzIENoZWNrYm94UXVlc3Rpb24pLmNob2ljZXMgPSBkZWZpbml0aW9uLml0ZW1zPy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgaXRlbSA9PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAgICAgICA/IGl0ZW1cbiAgICAgICAgICAgICAgICAgICAgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLmxhYmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gZGVmaW5pdGlvbi50eXBlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcXVlc3Rpb247XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHF1ZXN0aW9ucy5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCB7IHByb21wdCB9ID0gYXdhaXQgaW1wb3J0KCdpbnF1aXJlcicpO1xuXG4gICAgICAgICAgcmV0dXJuIHByb21wdChxdWVzdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuICh0aGlzLl93b3JrZmxvd0ZvckV4ZWN1dGlvbiA9IHdvcmtmbG93KTtcbiAgfVxuXG4gIHByaXZhdGUgX3NjaGVtYXRpY0NvbGxlY3Rpb25zOiBTZXQ8c3RyaW5nPiB8IHVuZGVmaW5lZDtcbiAgcHJvdGVjdGVkIGFzeW5jIGdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKCk6IFByb21pc2U8U2V0PHN0cmluZz4+IHtcbiAgICBpZiAodGhpcy5fc2NoZW1hdGljQ29sbGVjdGlvbnMpIHtcbiAgICAgIHJldHVybiB0aGlzLl9zY2hlbWF0aWNDb2xsZWN0aW9ucztcbiAgICB9XG5cbiAgICBjb25zdCBnZXRTY2hlbWF0aWNDb2xsZWN0aW9ucyA9IChcbiAgICAgIGNvbmZpZ1NlY3Rpb246IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkLFxuICAgICk6IFNldDxzdHJpbmc+IHwgdW5kZWZpbmVkID0+IHtcbiAgICAgIGlmICghY29uZmlnU2VjdGlvbikge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7IHNjaGVtYXRpY0NvbGxlY3Rpb25zLCBkZWZhdWx0Q29sbGVjdGlvbiB9ID0gY29uZmlnU2VjdGlvbjtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHNjaGVtYXRpY0NvbGxlY3Rpb25zKSkge1xuICAgICAgICByZXR1cm4gbmV3IFNldChzY2hlbWF0aWNDb2xsZWN0aW9ucyk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZhdWx0Q29sbGVjdGlvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTZXQoW2RlZmF1bHRDb2xsZWN0aW9uXSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfTtcblxuICAgIGNvbnN0IHsgd29ya3NwYWNlLCBnbG9iYWxDb25maWd1cmF0aW9uIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgaWYgKHdvcmtzcGFjZSkge1xuICAgICAgY29uc3QgcHJvamVjdCA9IGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2UpO1xuICAgICAgaWYgKHByb2plY3QpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBnZXRTY2hlbWF0aWNDb2xsZWN0aW9ucyh3b3Jrc3BhY2UuZ2V0UHJvamVjdENsaShwcm9qZWN0KSk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgIHRoaXMuX3NjaGVtYXRpY0NvbGxlY3Rpb25zID0gdmFsdWU7XG5cbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZSA9XG4gICAgICBnZXRTY2hlbWF0aWNDb2xsZWN0aW9ucyh3b3Jrc3BhY2U/LmdldENsaSgpKSA/P1xuICAgICAgZ2V0U2NoZW1hdGljQ29sbGVjdGlvbnMoZ2xvYmFsQ29uZmlndXJhdGlvbj8uZ2V0Q2xpKCkpO1xuICAgIGlmICh2YWx1ZSkge1xuICAgICAgdGhpcy5fc2NoZW1hdGljQ29sbGVjdGlvbnMgPSB2YWx1ZTtcblxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIHRoaXMuX3NjaGVtYXRpY0NvbGxlY3Rpb25zID0gbmV3IFNldChbREVGQVVMVF9TQ0hFTUFUSUNTX0NPTExFQ1RJT05dKTtcblxuICAgIHJldHVybiB0aGlzLl9zY2hlbWF0aWNDb2xsZWN0aW9ucztcbiAgfVxuXG4gIHByb3RlY3RlZCBwYXJzZVNjaGVtYXRpY0luZm8oXG4gICAgc2NoZW1hdGljOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICk6IFtjb2xsZWN0aW9uTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBzY2hlbWF0aWNOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWRdIHtcbiAgICBpZiAoc2NoZW1hdGljPy5pbmNsdWRlcygnOicpKSB7XG4gICAgICBjb25zdCBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gc2NoZW1hdGljLnNwbGl0KCc6JywgMik7XG5cbiAgICAgIHJldHVybiBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdO1xuICAgIH1cblxuICAgIHJldHVybiBbdW5kZWZpbmVkLCBzY2hlbWF0aWNdO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1blNjaGVtYXRpYyhvcHRpb25zOiB7XG4gICAgZXhlY3V0aW9uT3B0aW9uczogU2NoZW1hdGljc0V4ZWN1dGlvbk9wdGlvbnM7XG4gICAgc2NoZW1hdGljT3B0aW9uczogT3RoZXJPcHRpb25zO1xuICAgIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmc7XG4gICAgc2NoZW1hdGljTmFtZTogc3RyaW5nO1xuICB9KTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHsgc2NoZW1hdGljT3B0aW9ucywgZXhlY3V0aW9uT3B0aW9ucywgY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWUgfSA9IG9wdGlvbnM7XG4gICAgY29uc3Qgd29ya2Zsb3cgPSBhd2FpdCB0aGlzLmdldE9yQ3JlYXRlV29ya2Zsb3dGb3JFeGVjdXRpb24oY29sbGVjdGlvbk5hbWUsIGV4ZWN1dGlvbk9wdGlvbnMpO1xuXG4gICAgaWYgKCFzY2hlbWF0aWNOYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3NjaGVtYXRpY05hbWUgY2Fubm90IGJlIHVuZGVmaW5lZC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCB7IHVuc3Vic2NyaWJlLCBmaWxlcyB9ID0gc3Vic2NyaWJlVG9Xb3JrZmxvdyh3b3JrZmxvdywgbG9nZ2VyKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB3b3JrZmxvd1xuICAgICAgICAuZXhlY3V0ZSh7XG4gICAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgICAgc2NoZW1hdGljOiBzY2hlbWF0aWNOYW1lLFxuICAgICAgICAgIG9wdGlvbnM6IHNjaGVtYXRpY09wdGlvbnMsXG4gICAgICAgICAgbG9nZ2VyLFxuICAgICAgICAgIGFsbG93UHJpdmF0ZTogdGhpcy5hbGxvd1ByaXZhdGVTY2hlbWF0aWNzLFxuICAgICAgICB9KVxuICAgICAgICAudG9Qcm9taXNlKCk7XG5cbiAgICAgIGlmICghZmlsZXMuc2l6ZSkge1xuICAgICAgICBsb2dnZXIuaW5mbygnTm90aGluZyB0byBiZSBkb25lLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXhlY3V0aW9uT3B0aW9ucy5kcnlSdW4pIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oYFxcbk5PVEU6IFRoZSBcIi0tZHJ5LXJ1blwiIG9wdGlvbiBtZWFucyBubyBjaGFuZ2VzIHdlcmUgbWFkZS5gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIEluIGNhc2UgdGhlIHdvcmtmbG93IHdhcyBub3Qgc3VjY2Vzc2Z1bCwgc2hvdyBhbiBhcHByb3ByaWF0ZSBlcnJvciBtZXNzYWdlLlxuICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uKSB7XG4gICAgICAgIC8vIFwiU2VlIGFib3ZlXCIgYmVjYXVzZSB3ZSBhbHJlYWR5IHByaW50ZWQgdGhlIGVycm9yLlxuICAgICAgICBsb2dnZXIuZmF0YWwoJ1RoZSBTY2hlbWF0aWMgd29ya2Zsb3cgZmFpbGVkLiBTZWUgYWJvdmUuJyk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHVuc3Vic2NyaWJlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwcml2YXRlIGRlZmF1bHRQcm9qZWN0RGVwcmVjYXRpb25XYXJuaW5nU2hvd24gPSBmYWxzZTtcbiAgcHJpdmF0ZSBnZXRQcm9qZWN0TmFtZSgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlLCBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBpZiAoIXdvcmtzcGFjZSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0TmFtZXMgPSBnZXRQcm9qZWN0c0J5UGF0aCh3b3Jrc3BhY2UsIHByb2Nlc3MuY3dkKCksIHdvcmtzcGFjZS5iYXNlUGF0aCk7XG5cbiAgICBpZiAocHJvamVjdE5hbWVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgcmV0dXJuIHByb2plY3ROYW1lc1swXTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHByb2plY3ROYW1lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGxvZ2dlci53YXJuKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgIFR3byBvciBtb3JlIHByb2plY3RzIGFyZSB1c2luZyBpZGVudGljYWwgcm9vdHMuXG4gICAgICAgICAgICBVbmFibGUgdG8gZGV0ZXJtaW5lIHByb2plY3QgdXNpbmcgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeS5cbiAgICAgICAgICAgIFVzaW5nIGRlZmF1bHQgd29ya3NwYWNlIHByb2plY3QgaW5zdGVhZC5cbiAgICAgICAgICBgKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVmYXVsdFByb2plY3ROYW1lID0gd29ya3NwYWNlLmV4dGVuc2lvbnNbJ2RlZmF1bHRQcm9qZWN0J107XG4gICAgICBpZiAodHlwZW9mIGRlZmF1bHRQcm9qZWN0TmFtZSA9PT0gJ3N0cmluZycgJiYgZGVmYXVsdFByb2plY3ROYW1lKSB7XG4gICAgICAgIGlmICghdGhpcy5kZWZhdWx0UHJvamVjdERlcHJlY2F0aW9uV2FybmluZ1Nob3duKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4odGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgREVQUkVDQVRFRDogVGhlICdkZWZhdWx0UHJvamVjdCcgd29ya3NwYWNlIG9wdGlvbiBoYXMgYmVlbiBkZXByZWNhdGVkLlxuICAgICAgICAgICAgVGhlIHByb2plY3QgdG8gdXNlIHdpbGwgYmUgZGV0ZXJtaW5lZCBmcm9tIHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LlxuICAgICAgICAgIGApO1xuXG4gICAgICAgICAgdGhpcy5kZWZhdWx0UHJvamVjdERlcHJlY2F0aW9uV2FybmluZ1Nob3duID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkZWZhdWx0UHJvamVjdE5hbWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVzb2x2ZVBhdGhzKGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UsIHJvb3QgfSA9IHRoaXMuY29udGV4dDtcblxuICAgIHJldHVybiB3b3Jrc3BhY2VcbiAgICAgID8gLy8gV29ya3NwYWNlXG4gICAgICAgIGNvbGxlY3Rpb25OYW1lID09PSBERUZBVUxUX1NDSEVNQVRJQ1NfQ09MTEVDVElPTlxuICAgICAgICA/IC8vIEZhdm9yIF9fZGlybmFtZSBmb3IgQHNjaGVtYXRpY3MvYW5ndWxhciB0byB1c2UgdGhlIGJ1aWxkLWluIHZlcnNpb25cbiAgICAgICAgICBbX19kaXJuYW1lLCBwcm9jZXNzLmN3ZCgpLCByb290XVxuICAgICAgICA6IFtwcm9jZXNzLmN3ZCgpLCByb290LCBfX2Rpcm5hbWVdXG4gICAgICA6IC8vIEdsb2JhbFxuICAgICAgICBbX19kaXJuYW1lLCBwcm9jZXNzLmN3ZCgpXTtcbiAgfVxufVxuIl19