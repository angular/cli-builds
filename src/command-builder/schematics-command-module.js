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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFvRDtBQUNwRCwyREFBZ0c7QUFDaEcsNERBSTBDO0FBRzFDLGdEQUs2QjtBQUM3QiwwQ0FBeUM7QUFDekMscURBTTBCO0FBQzFCLHlEQUEyRTtBQUMzRSw2RUFBd0U7QUFDeEUsdUVBQXFFO0FBRXhELFFBQUEsNkJBQTZCLEdBQUcscUJBQXFCLENBQUM7QUFhbkUsTUFBc0IsdUJBQ3BCLFNBQVEsOEJBQW9DO0lBRDlDOztRQUtxQiwyQkFBc0IsR0FBWSxLQUFLLENBQUM7UUFDL0IsMEJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBMkNsRCx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQztRQTRRdEQsMENBQXFDLEdBQUcsS0FBSyxDQUFDO0lBa0R4RCxDQUFDO0lBdldDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBVTtRQUN0QixPQUFPLElBQUk7YUFDUixNQUFNLENBQUMsYUFBYSxFQUFFO1lBQ3JCLFFBQVEsRUFBRSxtQ0FBbUM7WUFDN0MsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtTQUNkLENBQUM7YUFDRCxNQUFNLENBQUMsU0FBUyxFQUFFO1lBQ2pCLFFBQVEsRUFBRSwrREFBK0Q7WUFDekUsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFNLENBQUMsVUFBVSxFQUFFO1lBQ2xCLFFBQVEsRUFBRSwrREFBK0Q7WUFDekUsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztT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LENBQUM7SUFDakMsQ0FBQzs7QUE5V0gsMERBK1dDO0FBM1dpQiw2QkFBSyxHQUFHLDZCQUFZLENBQUMsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IHNjaGVtYSwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IENvbGxlY3Rpb24sIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uLCBmb3JtYXRzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHtcbiAgRmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjcmlwdGlvbixcbiAgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2NyaXB0aW9uLFxuICBOb2RlV29ya2Zsb3csXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB0eXBlIHsgQ2hlY2tib3hRdWVzdGlvbiwgUXVlc3Rpb24gfSBmcm9tICdpbnF1aXJlcic7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHtcbiAgZ2V0UHJvamVjdEJ5Q3dkLFxuICBnZXRQcm9qZWN0c0J5UGF0aCxcbiAgZ2V0U2NoZW1hdGljRGVmYXVsdHMsXG4gIGdldFdvcmtzcGFjZSxcbn0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4uL3V0aWxpdGllcy90dHknO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBPcHRpb24sIHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyB9IGZyb20gJy4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYXRpY0VuZ2luZUhvc3QgfSBmcm9tICcuL3V0aWxpdGllcy9zY2hlbWF0aWMtZW5naW5lLWhvc3QnO1xuaW1wb3J0IHsgc3Vic2NyaWJlVG9Xb3JrZmxvdyB9IGZyb20gJy4vdXRpbGl0aWVzL3NjaGVtYXRpYy13b3JrZmxvdyc7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NDSEVNQVRJQ1NfQ09MTEVDVElPTiA9ICdAc2NoZW1hdGljcy9hbmd1bGFyJztcblxuZXhwb3J0IGludGVyZmFjZSBTY2hlbWF0aWNzQ29tbWFuZEFyZ3Mge1xuICBpbnRlcmFjdGl2ZTogYm9vbGVhbjtcbiAgZm9yY2U6IGJvb2xlYW47XG4gICdkcnktcnVuJzogYm9vbGVhbjtcbiAgZGVmYXVsdHM6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2NoZW1hdGljc0V4ZWN1dGlvbk9wdGlvbnMgZXh0ZW5kcyBPcHRpb25zPFNjaGVtYXRpY3NDb21tYW5kQXJncz4ge1xuICBwYWNrYWdlUmVnaXN0cnk/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTY2hlbWF0aWNzQ29tbWFuZE1vZHVsZVxuICBleHRlbmRzIENvbW1hbmRNb2R1bGU8U2NoZW1hdGljc0NvbW1hbmRBcmdzPlxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxTY2hlbWF0aWNzQ29tbWFuZEFyZ3M+XG57XG4gIHN0YXRpYyBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5JbjtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGFsbG93UHJpdmF0ZVNjaGVtYXRpY3M6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIHJlYWRvbmx5IHNob3VsZFJlcG9ydEFuYWx5dGljcyA9IGZhbHNlO1xuXG4gIGFzeW5jIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxTY2hlbWF0aWNzQ29tbWFuZEFyZ3M+PiB7XG4gICAgcmV0dXJuIGFyZ3ZcbiAgICAgIC5vcHRpb24oJ2ludGVyYWN0aXZlJywge1xuICAgICAgICBkZXNjcmliZTogJ0VuYWJsZSBpbnRlcmFjdGl2ZSBpbnB1dCBwcm9tcHRzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdkcnktcnVuJywge1xuICAgICAgICBkZXNjcmliZTogJ1J1biB0aHJvdWdoIGFuZCByZXBvcnRzIGFjdGl2aXR5IHdpdGhvdXQgd3JpdGluZyBvdXQgcmVzdWx0cy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2RlZmF1bHRzJywge1xuICAgICAgICBkZXNjcmliZTogJ0Rpc2FibGUgaW50ZXJhY3RpdmUgaW5wdXQgcHJvbXB0cyBmb3Igb3B0aW9ucyB3aXRoIGEgZGVmYXVsdC4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2ZvcmNlJywge1xuICAgICAgICBkZXNjcmliZTogJ0ZvcmNlIG92ZXJ3cml0aW5nIG9mIGV4aXN0aW5nIGZpbGVzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLnN0cmljdCgpO1xuICB9XG5cbiAgLyoqIEdldCBzY2hlbWF0aWMgc2NoZW1hIG9wdGlvbnMuKi9cbiAgcHJvdGVjdGVkIGFzeW5jIGdldFNjaGVtYXRpY09wdGlvbnMoXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbjxGaWxlU3lzdGVtQ29sbGVjdGlvbkRlc2NyaXB0aW9uLCBGaWxlU3lzdGVtU2NoZW1hdGljRGVzY3JpcHRpb24+LFxuICAgIHNjaGVtYXRpY05hbWU6IHN0cmluZyxcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICApOiBQcm9taXNlPE9wdGlvbltdPiB7XG4gICAgY29uc3Qgc2NoZW1hdGljID0gY29sbGVjdGlvbi5jcmVhdGVTY2hlbWF0aWMoc2NoZW1hdGljTmFtZSwgdHJ1ZSk7XG4gICAgY29uc3QgeyBzY2hlbWFKc29uIH0gPSBzY2hlbWF0aWMuZGVzY3JpcHRpb247XG5cbiAgICBpZiAoIXNjaGVtYUpzb24pIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKHdvcmtmbG93LnJlZ2lzdHJ5LCBzY2hlbWFKc29uKTtcbiAgfVxuXG4gIHByaXZhdGUgX3dvcmtmbG93Rm9yQnVpbGRlciA9IG5ldyBNYXA8c3RyaW5nLCBOb2RlV29ya2Zsb3c+KCk7XG4gIHByb3RlY3RlZCBnZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZTogc3RyaW5nKTogTm9kZVdvcmtmbG93IHtcbiAgICBjb25zdCBjYWNoZWQgPSB0aGlzLl93b3JrZmxvd0ZvckJ1aWxkZXIuZ2V0KGNvbGxlY3Rpb25OYW1lKTtcbiAgICBpZiAoY2FjaGVkKSB7XG4gICAgICByZXR1cm4gY2FjaGVkO1xuICAgIH1cblxuICAgIGNvbnN0IHdvcmtmbG93ID0gbmV3IE5vZGVXb3JrZmxvdyh0aGlzLmNvbnRleHQucm9vdCwge1xuICAgICAgcmVzb2x2ZVBhdGhzOiB0aGlzLmdldFJlc29sdmVQYXRocyhjb2xsZWN0aW9uTmFtZSksXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KTtcblxuICAgIHRoaXMuX3dvcmtmbG93Rm9yQnVpbGRlci5zZXQoY29sbGVjdGlvbk5hbWUsIHdvcmtmbG93KTtcblxuICAgIHJldHVybiB3b3JrZmxvdztcbiAgfVxuXG4gIHByaXZhdGUgX3dvcmtmbG93Rm9yRXhlY3V0aW9uOiBOb2RlV29ya2Zsb3cgfCB1bmRlZmluZWQ7XG4gIHByb3RlY3RlZCBhc3luYyBnZXRPckNyZWF0ZVdvcmtmbG93Rm9yRXhlY3V0aW9uKFxuICAgIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcsXG4gICAgb3B0aW9uczogU2NoZW1hdGljc0V4ZWN1dGlvbk9wdGlvbnMsXG4gICk6IFByb21pc2U8Tm9kZVdvcmtmbG93PiB7XG4gICAgaWYgKHRoaXMuX3dvcmtmbG93Rm9yRXhlY3V0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd29ya2Zsb3dGb3JFeGVjdXRpb247XG4gICAgfVxuXG4gICAgY29uc3QgeyBsb2dnZXIsIHJvb3QsIHBhY2thZ2VNYW5hZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgeyBmb3JjZSwgZHJ5UnVuLCBwYWNrYWdlUmVnaXN0cnkgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IG5ldyBOb2RlV29ya2Zsb3cocm9vdCwge1xuICAgICAgZm9yY2UsXG4gICAgICBkcnlSdW4sXG4gICAgICBwYWNrYWdlTWFuYWdlcixcbiAgICAgIC8vIEEgc2NoZW1hIHJlZ2lzdHJ5IGlzIHJlcXVpcmVkIHRvIGFsbG93IGN1c3RvbWl6aW5nIGFkZFVuZGVmaW5lZERlZmF1bHRzXG4gICAgICByZWdpc3RyeTogbmV3IHNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoZm9ybWF0cy5zdGFuZGFyZEZvcm1hdHMpLFxuICAgICAgcGFja2FnZVJlZ2lzdHJ5LFxuICAgICAgcmVzb2x2ZVBhdGhzOiB0aGlzLmdldFJlc29sdmVQYXRocyhjb2xsZWN0aW9uTmFtZSksXG4gICAgICBzY2hlbWFWYWxpZGF0aW9uOiB0cnVlLFxuICAgICAgb3B0aW9uVHJhbnNmb3JtczogW1xuICAgICAgICAvLyBBZGQgY29uZmlndXJhdGlvbiBmaWxlIGRlZmF1bHRzXG4gICAgICAgIGFzeW5jIChzY2hlbWF0aWMsIGN1cnJlbnQpID0+IHtcbiAgICAgICAgICBjb25zdCBwcm9qZWN0TmFtZSA9XG4gICAgICAgICAgICB0eXBlb2YgKGN1cnJlbnQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLnByb2plY3QgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICAgID8gKChjdXJyZW50IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5wcm9qZWN0IGFzIHN0cmluZylcbiAgICAgICAgICAgICAgOiB0aGlzLmdldFByb2plY3ROYW1lKCk7XG5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4uKGF3YWl0IGdldFNjaGVtYXRpY0RlZmF1bHRzKHNjaGVtYXRpYy5jb2xsZWN0aW9uLm5hbWUsIHNjaGVtYXRpYy5uYW1lLCBwcm9qZWN0TmFtZSkpLFxuICAgICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGVuZ2luZUhvc3RDcmVhdG9yOiAob3B0aW9ucykgPT4gbmV3IFNjaGVtYXRpY0VuZ2luZUhvc3Qob3B0aW9ucy5yZXNvbHZlUGF0aHMpLFxuICAgIH0pO1xuXG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkUG9zdFRyYW5zZm9ybShzY2hlbWEudHJhbnNmb3Jtcy5hZGRVbmRlZmluZWREZWZhdWx0cyk7XG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ3Byb2plY3ROYW1lJywgKCkgPT4gdGhpcy5nZXRQcm9qZWN0TmFtZSgpKTtcbiAgICB3b3JrZmxvdy5yZWdpc3RyeS51c2VYRGVwcmVjYXRlZFByb3ZpZGVyKChtc2cpID0+IGxvZ2dlci53YXJuKG1zZykpO1xuXG4gICAgbGV0IHNob3VsZFJlcG9ydEFuYWx5dGljcyA9IHRydWU7XG4gICAgd29ya2Zsb3cuZW5naW5lSG9zdC5yZWdpc3Rlck9wdGlvbnNUcmFuc2Zvcm0oYXN5bmMgKHNjaGVtYXRpYywgb3B0aW9ucykgPT4ge1xuICAgICAgaWYgKHNob3VsZFJlcG9ydEFuYWx5dGljcykge1xuICAgICAgICBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSBmYWxzZTtcbiAgICAgICAgLy8gbmcgZ2VuZXJhdGUgbGliIC0+IG5nIGdlbmVyYXRlXG4gICAgICAgIGNvbnN0IGNvbW1hbmROYW1lID0gdGhpcy5jb21tYW5kPy5zcGxpdCgnICcsIDEpWzBdO1xuXG4gICAgICAgIGF3YWl0IHRoaXMucmVwb3J0QW5hbHl0aWNzKG9wdGlvbnMgYXMge30sIFtcbiAgICAgICAgICBjb21tYW5kTmFtZSxcbiAgICAgICAgICBzY2hlbWF0aWMuY29sbGVjdGlvbi5uYW1lLnJlcGxhY2UoL1xcLy9nLCAnXycpLFxuICAgICAgICAgIHNjaGVtYXRpYy5uYW1lLnJlcGxhY2UoL1xcLy9nLCAnXycpLFxuICAgICAgICBdKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgfSk7XG5cbiAgICBpZiAob3B0aW9ucy5pbnRlcmFjdGl2ZSAhPT0gZmFsc2UgJiYgaXNUVFkoKSkge1xuICAgICAgd29ya2Zsb3cucmVnaXN0cnkudXNlUHJvbXB0UHJvdmlkZXIoYXN5bmMgKGRlZmluaXRpb25zOiBBcnJheTxzY2hlbWEuUHJvbXB0RGVmaW5pdGlvbj4pID0+IHtcbiAgICAgICAgY29uc3QgcXVlc3Rpb25zID0gZGVmaW5pdGlvbnNcbiAgICAgICAgICAuZmlsdGVyKChkZWZpbml0aW9uKSA9PiAhb3B0aW9ucy5kZWZhdWx0cyB8fCBkZWZpbml0aW9uLmRlZmF1bHQgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAubWFwKChkZWZpbml0aW9uKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdGlvbjogUXVlc3Rpb24gPSB7XG4gICAgICAgICAgICAgIG5hbWU6IGRlZmluaXRpb24uaWQsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IGRlZmluaXRpb24ubWVzc2FnZSxcbiAgICAgICAgICAgICAgZGVmYXVsdDogZGVmaW5pdGlvbi5kZWZhdWx0LFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgdmFsaWRhdG9yID0gZGVmaW5pdGlvbi52YWxpZGF0b3I7XG4gICAgICAgICAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgIHF1ZXN0aW9uLnZhbGlkYXRlID0gKGlucHV0KSA9PiB2YWxpZGF0b3IoaW5wdXQpO1xuXG4gICAgICAgICAgICAgIC8vIEZpbHRlciBhbGxvd3MgdHJhbnNmb3JtYXRpb24gb2YgdGhlIHZhbHVlIHByaW9yIHRvIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgcXVlc3Rpb24uZmlsdGVyID0gYXN5bmMgKGlucHV0KSA9PiB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB0eXBlIG9mIGRlZmluaXRpb24ucHJvcGVydHlUeXBlcykge1xuICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBTdHJpbmcoaW5wdXQpO1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IE51bWJlcihpbnB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBpbnB1dDtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIENhbiBiZSBhIHN0cmluZyBpZiB2YWxpZGF0aW9uIGZhaWxzXG4gICAgICAgICAgICAgICAgICBjb25zdCBpc1ZhbGlkID0gKGF3YWl0IHZhbGlkYXRvcih2YWx1ZSkpID09PSB0cnVlO1xuICAgICAgICAgICAgICAgICAgaWYgKGlzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dDtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3dpdGNoIChkZWZpbml0aW9uLnR5cGUpIHtcbiAgICAgICAgICAgICAgY2FzZSAnY29uZmlybWF0aW9uJzpcbiAgICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gJ2NvbmZpcm0nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdsaXN0JzpcbiAgICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gZGVmaW5pdGlvbi5tdWx0aXNlbGVjdCA/ICdjaGVja2JveCcgOiAnbGlzdCc7XG4gICAgICAgICAgICAgICAgKHF1ZXN0aW9uIGFzIENoZWNrYm94UXVlc3Rpb24pLmNob2ljZXMgPSBkZWZpbml0aW9uLml0ZW1zPy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgaXRlbSA9PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAgICAgICA/IGl0ZW1cbiAgICAgICAgICAgICAgICAgICAgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLmxhYmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gZGVmaW5pdGlvbi50eXBlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcXVlc3Rpb247XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHF1ZXN0aW9ucy5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCB7IHByb21wdCB9ID0gYXdhaXQgaW1wb3J0KCdpbnF1aXJlcicpO1xuXG4gICAgICAgICAgcmV0dXJuIHByb21wdChxdWVzdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuICh0aGlzLl93b3JrZmxvd0ZvckV4ZWN1dGlvbiA9IHdvcmtmbG93KTtcbiAgfVxuXG4gIHByaXZhdGUgX3NjaGVtYXRpY0NvbGxlY3Rpb25zOiBTZXQ8c3RyaW5nPiB8IHVuZGVmaW5lZDtcbiAgcHJvdGVjdGVkIGFzeW5jIGdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKCk6IFByb21pc2U8U2V0PHN0cmluZz4+IHtcbiAgICBpZiAodGhpcy5fc2NoZW1hdGljQ29sbGVjdGlvbnMpIHtcbiAgICAgIHJldHVybiB0aGlzLl9zY2hlbWF0aWNDb2xsZWN0aW9ucztcbiAgICB9XG5cbiAgICBjb25zdCBnZXRTY2hlbWF0aWNDb2xsZWN0aW9ucyA9IChcbiAgICAgIGNvbmZpZ1NlY3Rpb246IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkLFxuICAgICk6IFNldDxzdHJpbmc+IHwgdW5kZWZpbmVkID0+IHtcbiAgICAgIGlmICghY29uZmlnU2VjdGlvbikge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7IHNjaGVtYXRpY0NvbGxlY3Rpb25zLCBkZWZhdWx0Q29sbGVjdGlvbiB9ID0gY29uZmlnU2VjdGlvbjtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHNjaGVtYXRpY0NvbGxlY3Rpb25zKSkge1xuICAgICAgICByZXR1cm4gbmV3IFNldChzY2hlbWF0aWNDb2xsZWN0aW9ucyk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZhdWx0Q29sbGVjdGlvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTZXQoW2RlZmF1bHRDb2xsZWN0aW9uXSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfTtcblxuICAgIGNvbnN0IGxvY2FsV29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdsb2NhbCcpO1xuICAgIGlmIChsb2NhbFdvcmtzcGFjZSkge1xuICAgICAgY29uc3QgcHJvamVjdCA9IGdldFByb2plY3RCeUN3ZChsb2NhbFdvcmtzcGFjZSk7XG4gICAgICBpZiAocHJvamVjdCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKGxvY2FsV29ya3NwYWNlLmdldFByb2plY3RDbGkocHJvamVjdCkpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICB0aGlzLl9zY2hlbWF0aWNDb2xsZWN0aW9ucyA9IHZhbHVlO1xuXG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZ2xvYmFsV29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcbiAgICBjb25zdCB2YWx1ZSA9XG4gICAgICBnZXRTY2hlbWF0aWNDb2xsZWN0aW9ucyhsb2NhbFdvcmtzcGFjZT8uZ2V0Q2xpKCkpID8/XG4gICAgICBnZXRTY2hlbWF0aWNDb2xsZWN0aW9ucyhnbG9iYWxXb3Jrc3BhY2U/LmdldENsaSgpKTtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIHRoaXMuX3NjaGVtYXRpY0NvbGxlY3Rpb25zID0gdmFsdWU7XG5cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICB0aGlzLl9zY2hlbWF0aWNDb2xsZWN0aW9ucyA9IG5ldyBTZXQoW0RFRkFVTFRfU0NIRU1BVElDU19DT0xMRUNUSU9OXSk7XG5cbiAgICByZXR1cm4gdGhpcy5fc2NoZW1hdGljQ29sbGVjdGlvbnM7XG4gIH1cblxuICBwcm90ZWN0ZWQgcGFyc2VTY2hlbWF0aWNJbmZvKFxuICAgIHNjaGVtYXRpYzogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICApOiBbY29sbGVjdGlvbk5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgc2NoZW1hdGljTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkXSB7XG4gICAgaWYgKHNjaGVtYXRpYz8uaW5jbHVkZXMoJzonKSkge1xuICAgICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHNjaGVtYXRpYy5zcGxpdCgnOicsIDIpO1xuXG4gICAgICByZXR1cm4gW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXTtcbiAgICB9XG5cbiAgICByZXR1cm4gW3VuZGVmaW5lZCwgc2NoZW1hdGljXTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBydW5TY2hlbWF0aWMob3B0aW9uczoge1xuICAgIGV4ZWN1dGlvbk9wdGlvbnM6IFNjaGVtYXRpY3NFeGVjdXRpb25PcHRpb25zO1xuICAgIHNjaGVtYXRpY09wdGlvbnM6IE90aGVyT3B0aW9ucztcbiAgICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICAgIHNjaGVtYXRpY05hbWU6IHN0cmluZztcbiAgfSk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCB7IHNjaGVtYXRpY09wdGlvbnMsIGV4ZWN1dGlvbk9wdGlvbnMsIGNvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lIH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IHdvcmtmbG93ID0gYXdhaXQgdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yRXhlY3V0aW9uKGNvbGxlY3Rpb25OYW1lLCBleGVjdXRpb25PcHRpb25zKTtcblxuICAgIGlmICghc2NoZW1hdGljTmFtZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdzY2hlbWF0aWNOYW1lIGNhbm5vdCBiZSB1bmRlZmluZWQuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgeyB1bnN1YnNjcmliZSwgZmlsZXMgfSA9IHN1YnNjcmliZVRvV29ya2Zsb3cod29ya2Zsb3csIGxvZ2dlcik7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgd29ya2Zsb3dcbiAgICAgICAgLmV4ZWN1dGUoe1xuICAgICAgICAgIGNvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICAgIHNjaGVtYXRpYzogc2NoZW1hdGljTmFtZSxcbiAgICAgICAgICBvcHRpb25zOiBzY2hlbWF0aWNPcHRpb25zLFxuICAgICAgICAgIGxvZ2dlcixcbiAgICAgICAgICBhbGxvd1ByaXZhdGU6IHRoaXMuYWxsb3dQcml2YXRlU2NoZW1hdGljcyxcbiAgICAgICAgfSlcbiAgICAgICAgLnRvUHJvbWlzZSgpO1xuXG4gICAgICBpZiAoIWZpbGVzLnNpemUpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJ05vdGhpbmcgdG8gYmUgZG9uZS4nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGV4ZWN1dGlvbk9wdGlvbnMuZHJ5UnVuKSB7XG4gICAgICAgIGxvZ2dlci53YXJuKGBcXG5OT1RFOiBUaGUgXCItLWRyeS1ydW5cIiBvcHRpb24gbWVhbnMgbm8gY2hhbmdlcyB3ZXJlIG1hZGUuYCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAvLyBJbiBjYXNlIHRoZSB3b3JrZmxvdyB3YXMgbm90IHN1Y2Nlc3NmdWwsIHNob3cgYW4gYXBwcm9wcmlhdGUgZXJyb3IgbWVzc2FnZS5cbiAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbikge1xuICAgICAgICAvLyBcIlNlZSBhYm92ZVwiIGJlY2F1c2Ugd2UgYWxyZWFkeSBwcmludGVkIHRoZSBlcnJvci5cbiAgICAgICAgbG9nZ2VyLmZhdGFsKCdUaGUgU2NoZW1hdGljIHdvcmtmbG93IGZhaWxlZC4gU2VlIGFib3ZlLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICB1bnN1YnNjcmliZSgpO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgcHJpdmF0ZSBkZWZhdWx0UHJvamVjdERlcHJlY2F0aW9uV2FybmluZ1Nob3duID0gZmFsc2U7XG4gIHByaXZhdGUgZ2V0UHJvamVjdE5hbWUoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSwgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgaWYgKCF3b3Jrc3BhY2UpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvamVjdE5hbWVzID0gZ2V0UHJvamVjdHNCeVBhdGgod29ya3NwYWNlLCBwcm9jZXNzLmN3ZCgpLCB3b3Jrc3BhY2UuYmFzZVBhdGgpO1xuXG4gICAgaWYgKHByb2plY3ROYW1lcy5sZW5ndGggPT09IDEpIHtcbiAgICAgIHJldHVybiBwcm9qZWN0TmFtZXNbMF07XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChwcm9qZWN0TmFtZXMubGVuZ3RoID4gMSkge1xuICAgICAgICBsb2dnZXIud2Fybih0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICBUd28gb3IgbW9yZSBwcm9qZWN0cyBhcmUgdXNpbmcgaWRlbnRpY2FsIHJvb3RzLlxuICAgICAgICAgICAgVW5hYmxlIHRvIGRldGVybWluZSBwcm9qZWN0IHVzaW5nIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuXG4gICAgICAgICAgICBVc2luZyBkZWZhdWx0IHdvcmtzcGFjZSBwcm9qZWN0IGluc3RlYWQuXG4gICAgICAgICAgYCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRlZmF1bHRQcm9qZWN0TmFtZSA9IHdvcmtzcGFjZS5leHRlbnNpb25zWydkZWZhdWx0UHJvamVjdCddO1xuICAgICAgaWYgKHR5cGVvZiBkZWZhdWx0UHJvamVjdE5hbWUgPT09ICdzdHJpbmcnICYmIGRlZmF1bHRQcm9qZWN0TmFtZSkge1xuICAgICAgICBpZiAoIXRoaXMuZGVmYXVsdFByb2plY3REZXByZWNhdGlvbldhcm5pbmdTaG93bikge1xuICAgICAgICAgIGxvZ2dlci53YXJuKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgIERFUFJFQ0FURUQ6IFRoZSAnZGVmYXVsdFByb2plY3QnIHdvcmtzcGFjZSBvcHRpb24gaGFzIGJlZW4gZGVwcmVjYXRlZC5cbiAgICAgICAgICAgIFRoZSBwcm9qZWN0IHRvIHVzZSB3aWxsIGJlIGRldGVybWluZWQgZnJvbSB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeS5cbiAgICAgICAgICBgKTtcblxuICAgICAgICAgIHRoaXMuZGVmYXVsdFByb2plY3REZXByZWNhdGlvbldhcm5pbmdTaG93biA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGVmYXVsdFByb2plY3ROYW1lO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBwcml2YXRlIGdldFJlc29sdmVQYXRocyhjb2xsZWN0aW9uTmFtZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlLCByb290IH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICByZXR1cm4gd29ya3NwYWNlXG4gICAgICA/IC8vIFdvcmtzcGFjZVxuICAgICAgICBjb2xsZWN0aW9uTmFtZSA9PT0gREVGQVVMVF9TQ0hFTUFUSUNTX0NPTExFQ1RJT05cbiAgICAgICAgPyAvLyBGYXZvciBfX2Rpcm5hbWUgZm9yIEBzY2hlbWF0aWNzL2FuZ3VsYXIgdG8gdXNlIHRoZSBidWlsZC1pbiB2ZXJzaW9uXG4gICAgICAgICAgW19fZGlybmFtZSwgcHJvY2Vzcy5jd2QoKSwgcm9vdF1cbiAgICAgICAgOiBbcHJvY2Vzcy5jd2QoKSwgcm9vdCwgX19kaXJuYW1lXVxuICAgICAgOiAvLyBHbG9iYWxcbiAgICAgICAgW19fZGlybmFtZSwgcHJvY2Vzcy5jd2QoKV07XG4gIH1cbn1cbiJdfQ==