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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchematicsCommandModule = exports.DEFAULT_SCHEMATICS_COLLECTION = void 0;
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const tools_1 = require("@angular-devkit/schematics/tools");
const config_1 = require("../utilities/config");
const memoize_1 = require("../utilities/memoize");
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
        return new tools_1.NodeWorkflow(this.context.root, {
            resolvePaths: this.getResolvePaths(collectionName),
            engineHostCreator: (options) => new schematic_engine_host_1.SchematicEngineHost(options.resolvePaths),
        });
    }
    async getOrCreateWorkflowForExecution(collectionName, options) {
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
                    const projectName = typeof (current === null || current === void 0 ? void 0 : current.project) === 'string' ? current.project : this.getProjectName();
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
        return workflow;
    }
    async getSchematicCollections() {
        var _a;
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
                    return value;
                }
            }
        }
        const value = (_a = getSchematicCollections(workspace === null || workspace === void 0 ? void 0 : workspace.getCli())) !== null && _a !== void 0 ? _a : getSchematicCollections(globalConfiguration === null || globalConfiguration === void 0 ? void 0 : globalConfiguration.getCli());
        if (value) {
            return value;
        }
        return new Set([exports.DEFAULT_SCHEMATICS_COLLECTION]);
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
            }
            else {
                logger.fatal(err.message);
            }
            return 1;
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
        const projectName = (0, config_1.getProjectByCwd)(workspace);
        if (projectName) {
            return projectName;
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
SchematicsCommandModule.scope = command_module_1.CommandScope.In;
__decorate([
    memoize_1.memoize,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", tools_1.NodeWorkflow)
], SchematicsCommandModule.prototype, "getOrCreateWorkflowForBuilder", null);
__decorate([
    memoize_1.memoize,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchematicsCommandModule.prototype, "getOrCreateWorkflowForExecution", null);
__decorate([
    memoize_1.memoize,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchematicsCommandModule.prototype, "getSchematicCollections", null);
exports.SchematicsCommandModule = SchematicsCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFvRDtBQUNwRCwyREFBZ0c7QUFDaEcsNERBSTBDO0FBRzFDLGdEQUE0RTtBQUM1RSxrREFBK0M7QUFDL0MsMENBQXlDO0FBQ3pDLHFEQU0wQjtBQUMxQix5REFBMkU7QUFDM0UsNkVBQXdFO0FBQ3hFLHVFQUFxRTtBQUV4RCxRQUFBLDZCQUE2QixHQUFHLHFCQUFxQixDQUFDO0FBYW5FLE1BQXNCLHVCQUNwQixTQUFRLDhCQUFvQztJQUQ5Qzs7UUFLcUIsMkJBQXNCLEdBQVksS0FBSyxDQUFDO1FBQy9CLDBCQUFxQixHQUFHLEtBQUssQ0FBQztRQTZSbEQsMENBQXFDLEdBQUcsS0FBSyxDQUFDO0lBeUN4RCxDQUFDO0lBcFVDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBVTtRQUN0QixPQUFPLElBQUk7YUFDUixNQUFNLENBQUMsYUFBYSxFQUFFO1lBQ3JCLFFBQVEsRUFBRSxtQ0FBbUM7WUFDN0MsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtTQUNkLENBQUM7YUFDRCxNQUFNLENBQUMsU0FBUyxFQUFFO1lBQ2pCLFFBQVEsRUFBRSwrREFBK0Q7WUFDekUsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFNLENBQUMsVUFBVSxFQUFFO1lBQ2xCLFFBQVEsRUFBRSwrREFBK0Q7WUFDekUsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFN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QyxzRUFBc0U7d0JBQ3RFLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUM7b0JBQ2xDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDO1lBQ3BDLENBQUMsQ0FBQyxTQUFTO2dCQUNULENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7O0FBdlVlLDZCQUFLLEdBQUcsNkJBQVksQ0FBQyxFQUFFLENBQUM7QUE4Q3hDO0lBREMsaUJBQU87OztvQ0FDeUQsb0JBQVk7NEVBSzVFO0FBR0Q7SUFEQyxpQkFBTzs7Ozs4RUFpSVA7QUFHRDtJQURDLGlCQUFPOzs7O3NFQXNDUDtBQWxPSCwwREE0VUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgc2NoZW1hLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQ29sbGVjdGlvbiwgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24sIGZvcm1hdHMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQge1xuICBGaWxlU3lzdGVtQ29sbGVjdGlvbkRlc2NyaXB0aW9uLFxuICBGaWxlU3lzdGVtU2NoZW1hdGljRGVzY3JpcHRpb24sXG4gIE5vZGVXb3JrZmxvdyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHR5cGUgeyBDaGVja2JveFF1ZXN0aW9uLCBRdWVzdGlvbiB9IGZyb20gJ2lucXVpcmVyJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBnZXRQcm9qZWN0QnlDd2QsIGdldFNjaGVtYXRpY0RlZmF1bHRzIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBtZW1vaXplIH0gZnJvbSAnLi4vdXRpbGl0aWVzL21lbW9pemUnO1xuaW1wb3J0IHsgaXNUVFkgfSBmcm9tICcuLi91dGlsaXRpZXMvdHR5JztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGUsXG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgQ29tbWFuZFNjb3BlLFxuICBPcHRpb25zLFxuICBPdGhlck9wdGlvbnMsXG59IGZyb20gJy4vY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgT3B0aW9uLCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMgfSBmcm9tICcuL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5pbXBvcnQgeyBTY2hlbWF0aWNFbmdpbmVIb3N0IH0gZnJvbSAnLi91dGlsaXRpZXMvc2NoZW1hdGljLWVuZ2luZS1ob3N0JztcbmltcG9ydCB7IHN1YnNjcmliZVRvV29ya2Zsb3cgfSBmcm9tICcuL3V0aWxpdGllcy9zY2hlbWF0aWMtd29ya2Zsb3cnO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TQ0hFTUFUSUNTX0NPTExFQ1RJT04gPSAnQHNjaGVtYXRpY3MvYW5ndWxhcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2NoZW1hdGljc0NvbW1hbmRBcmdzIHtcbiAgaW50ZXJhY3RpdmU6IGJvb2xlYW47XG4gIGZvcmNlOiBib29sZWFuO1xuICAnZHJ5LXJ1bic6IGJvb2xlYW47XG4gIGRlZmF1bHRzOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNjaGVtYXRpY3NFeGVjdXRpb25PcHRpb25zIGV4dGVuZHMgT3B0aW9uczxTY2hlbWF0aWNzQ29tbWFuZEFyZ3M+IHtcbiAgcGFja2FnZVJlZ2lzdHJ5Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBDb21tYW5kTW9kdWxlPFNjaGVtYXRpY3NDb21tYW5kQXJncz5cbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248U2NoZW1hdGljc0NvbW1hbmRBcmdzPlxue1xuICBzdGF0aWMgb3ZlcnJpZGUgc2NvcGUgPSBDb21tYW5kU2NvcGUuSW47XG4gIHByb3RlY3RlZCByZWFkb25seSBhbGxvd1ByaXZhdGVTY2hlbWF0aWNzOiBib29sZWFuID0gZmFsc2U7XG4gIHByb3RlY3RlZCBvdmVycmlkZSByZWFkb25seSBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSBmYWxzZTtcblxuICBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8U2NoZW1hdGljc0NvbW1hbmRBcmdzPj4ge1xuICAgIHJldHVybiBhcmd2XG4gICAgICAub3B0aW9uKCdpbnRlcmFjdGl2ZScsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdFbmFibGUgaW50ZXJhY3RpdmUgaW5wdXQgcHJvbXB0cy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignZHJ5LXJ1bicsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdSdW4gdGhyb3VnaCBhbmQgcmVwb3J0cyBhY3Rpdml0eSB3aXRob3V0IHdyaXRpbmcgb3V0IHJlc3VsdHMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdkZWZhdWx0cycsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdEaXNhYmxlIGludGVyYWN0aXZlIGlucHV0IHByb21wdHMgZm9yIG9wdGlvbnMgd2l0aCBhIGRlZmF1bHQuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdmb3JjZScsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdGb3JjZSBvdmVyd3JpdGluZyBvZiBleGlzdGluZyBmaWxlcy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5zdHJpY3QoKTtcbiAgfVxuXG4gIC8qKiBHZXQgc2NoZW1hdGljIHNjaGVtYSBvcHRpb25zLiovXG4gIHByb3RlY3RlZCBhc3luYyBnZXRTY2hlbWF0aWNPcHRpb25zKFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb248RmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjcmlwdGlvbiwgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2NyaXB0aW9uPixcbiAgICBzY2hlbWF0aWNOYW1lOiBzdHJpbmcsXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgKTogUHJvbWlzZTxPcHRpb25bXT4ge1xuICAgIGNvbnN0IHNjaGVtYXRpYyA9IGNvbGxlY3Rpb24uY3JlYXRlU2NoZW1hdGljKHNjaGVtYXRpY05hbWUsIHRydWUpO1xuICAgIGNvbnN0IHsgc2NoZW1hSnNvbiB9ID0gc2NoZW1hdGljLmRlc2NyaXB0aW9uO1xuXG4gICAgaWYgKCFzY2hlbWFKc29uKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyh3b3JrZmxvdy5yZWdpc3RyeSwgc2NoZW1hSnNvbik7XG4gIH1cblxuICBAbWVtb2l6ZVxuICBwcm90ZWN0ZWQgZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckJ1aWxkZXIoY29sbGVjdGlvbk5hbWU6IHN0cmluZyk6IE5vZGVXb3JrZmxvdyB7XG4gICAgcmV0dXJuIG5ldyBOb2RlV29ya2Zsb3codGhpcy5jb250ZXh0LnJvb3QsIHtcbiAgICAgIHJlc29sdmVQYXRoczogdGhpcy5nZXRSZXNvbHZlUGF0aHMoY29sbGVjdGlvbk5hbWUpLFxuICAgICAgZW5naW5lSG9zdENyZWF0b3I6IChvcHRpb25zKSA9PiBuZXcgU2NoZW1hdGljRW5naW5lSG9zdChvcHRpb25zLnJlc29sdmVQYXRocyksXG4gICAgfSk7XG4gIH1cblxuICBAbWVtb2l6ZVxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckV4ZWN1dGlvbihcbiAgICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFNjaGVtYXRpY3NFeGVjdXRpb25PcHRpb25zLFxuICApOiBQcm9taXNlPE5vZGVXb3JrZmxvdz4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyLCByb290LCBwYWNrYWdlTWFuYWdlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHsgZm9yY2UsIGRyeVJ1biwgcGFja2FnZVJlZ2lzdHJ5IH0gPSBvcHRpb25zO1xuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSBuZXcgTm9kZVdvcmtmbG93KHJvb3QsIHtcbiAgICAgIGZvcmNlLFxuICAgICAgZHJ5UnVuLFxuICAgICAgcGFja2FnZU1hbmFnZXI6IHBhY2thZ2VNYW5hZ2VyLm5hbWUsXG4gICAgICAvLyBBIHNjaGVtYSByZWdpc3RyeSBpcyByZXF1aXJlZCB0byBhbGxvdyBjdXN0b21pemluZyBhZGRVbmRlZmluZWREZWZhdWx0c1xuICAgICAgcmVnaXN0cnk6IG5ldyBzY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KGZvcm1hdHMuc3RhbmRhcmRGb3JtYXRzKSxcbiAgICAgIHBhY2thZ2VSZWdpc3RyeSxcbiAgICAgIHJlc29sdmVQYXRoczogdGhpcy5nZXRSZXNvbHZlUGF0aHMoY29sbGVjdGlvbk5hbWUpLFxuICAgICAgc2NoZW1hVmFsaWRhdGlvbjogdHJ1ZSxcbiAgICAgIG9wdGlvblRyYW5zZm9ybXM6IFtcbiAgICAgICAgLy8gQWRkIGNvbmZpZ3VyYXRpb24gZmlsZSBkZWZhdWx0c1xuICAgICAgICBhc3luYyAoc2NoZW1hdGljLCBjdXJyZW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgcHJvamVjdE5hbWUgPVxuICAgICAgICAgICAgdHlwZW9mIGN1cnJlbnQ/LnByb2plY3QgPT09ICdzdHJpbmcnID8gY3VycmVudC5wcm9qZWN0IDogdGhpcy5nZXRQcm9qZWN0TmFtZSgpO1xuXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC4uLihhd2FpdCBnZXRTY2hlbWF0aWNEZWZhdWx0cyhzY2hlbWF0aWMuY29sbGVjdGlvbi5uYW1lLCBzY2hlbWF0aWMubmFtZSwgcHJvamVjdE5hbWUpKSxcbiAgICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KTtcblxuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFBvc3RUcmFuc2Zvcm0oc2NoZW1hLnRyYW5zZm9ybXMuYWRkVW5kZWZpbmVkRGVmYXVsdHMpO1xuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFNtYXJ0RGVmYXVsdFByb3ZpZGVyKCdwcm9qZWN0TmFtZScsICgpID0+IHRoaXMuZ2V0UHJvamVjdE5hbWUoKSk7XG4gICAgd29ya2Zsb3cucmVnaXN0cnkudXNlWERlcHJlY2F0ZWRQcm92aWRlcigobXNnKSA9PiBsb2dnZXIud2Fybihtc2cpKTtcblxuICAgIGxldCBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSB0cnVlO1xuICAgIHdvcmtmbG93LmVuZ2luZUhvc3QucmVnaXN0ZXJPcHRpb25zVHJhbnNmb3JtKGFzeW5jIChzY2hlbWF0aWMsIG9wdGlvbnMpID0+IHtcbiAgICAgIGlmIChzaG91bGRSZXBvcnRBbmFseXRpY3MpIHtcbiAgICAgICAgc2hvdWxkUmVwb3J0QW5hbHl0aWNzID0gZmFsc2U7XG4gICAgICAgIC8vIG5nIGdlbmVyYXRlIGxpYiAtPiBuZyBnZW5lcmF0ZVxuICAgICAgICBjb25zdCBjb21tYW5kTmFtZSA9IHRoaXMuY29tbWFuZD8uc3BsaXQoJyAnLCAxKVswXTtcblxuICAgICAgICBhd2FpdCB0aGlzLnJlcG9ydEFuYWx5dGljcyhvcHRpb25zIGFzIHt9LCBbXG4gICAgICAgICAgY29tbWFuZE5hbWUsXG4gICAgICAgICAgc2NoZW1hdGljLmNvbGxlY3Rpb24ubmFtZS5yZXBsYWNlKC9cXC8vZywgJ18nKSxcbiAgICAgICAgICBzY2hlbWF0aWMubmFtZS5yZXBsYWNlKC9cXC8vZywgJ18nKSxcbiAgICAgICAgXSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvcHRpb25zO1xuICAgIH0pO1xuXG4gICAgaWYgKG9wdGlvbnMuaW50ZXJhY3RpdmUgIT09IGZhbHNlICYmIGlzVFRZKCkpIHtcbiAgICAgIHdvcmtmbG93LnJlZ2lzdHJ5LnVzZVByb21wdFByb3ZpZGVyKGFzeW5jIChkZWZpbml0aW9uczogQXJyYXk8c2NoZW1hLlByb21wdERlZmluaXRpb24+KSA9PiB7XG4gICAgICAgIGNvbnN0IHF1ZXN0aW9ucyA9IGRlZmluaXRpb25zXG4gICAgICAgICAgLmZpbHRlcigoZGVmaW5pdGlvbikgPT4gIW9wdGlvbnMuZGVmYXVsdHMgfHwgZGVmaW5pdGlvbi5kZWZhdWx0ID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgLm1hcCgoZGVmaW5pdGlvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3Rpb246IFF1ZXN0aW9uID0ge1xuICAgICAgICAgICAgICBuYW1lOiBkZWZpbml0aW9uLmlkLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBkZWZpbml0aW9uLm1lc3NhZ2UsXG4gICAgICAgICAgICAgIGRlZmF1bHQ6IGRlZmluaXRpb24uZGVmYXVsdCxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRvciA9IGRlZmluaXRpb24udmFsaWRhdG9yO1xuICAgICAgICAgICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgICAgICAgICBxdWVzdGlvbi52YWxpZGF0ZSA9IChpbnB1dCkgPT4gdmFsaWRhdG9yKGlucHV0KTtcblxuICAgICAgICAgICAgICAvLyBGaWx0ZXIgYWxsb3dzIHRyYW5zZm9ybWF0aW9uIG9mIHRoZSB2YWx1ZSBwcmlvciB0byB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgIHF1ZXN0aW9uLmZpbHRlciA9IGFzeW5jIChpbnB1dCkgPT4ge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdHlwZSBvZiBkZWZpbml0aW9uLnByb3BlcnR5VHlwZXMpIHtcbiAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gU3RyaW5nKGlucHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBOdW1iZXIoaW5wdXQpO1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gaW5wdXQ7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyBDYW4gYmUgYSBzdHJpbmcgaWYgdmFsaWRhdGlvbiBmYWlsc1xuICAgICAgICAgICAgICAgICAgY29uc3QgaXNWYWxpZCA9IChhd2FpdCB2YWxpZGF0b3IodmFsdWUpKSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGlmIChpc1ZhbGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXQ7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN3aXRjaCAoZGVmaW5pdGlvbi50eXBlKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ2NvbmZpcm1hdGlvbic6XG4gICAgICAgICAgICAgICAgcXVlc3Rpb24udHlwZSA9ICdjb25maXJtJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnbGlzdCc6XG4gICAgICAgICAgICAgICAgcXVlc3Rpb24udHlwZSA9IGRlZmluaXRpb24ubXVsdGlzZWxlY3QgPyAnY2hlY2tib3gnIDogJ2xpc3QnO1xuICAgICAgICAgICAgICAgIChxdWVzdGlvbiBhcyBDaGVja2JveFF1ZXN0aW9uKS5jaG9pY2VzID0gZGVmaW5pdGlvbi5pdGVtcz8ubWFwKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIGl0ZW0gPT0gJ3N0cmluZydcbiAgICAgICAgICAgICAgICAgICAgPyBpdGVtXG4gICAgICAgICAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5sYWJlbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcXVlc3Rpb24udHlwZSA9IGRlZmluaXRpb24udHlwZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHF1ZXN0aW9uO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChxdWVzdGlvbnMubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgeyBwcm9tcHQgfSA9IGF3YWl0IGltcG9ydCgnaW5xdWlyZXInKTtcblxuICAgICAgICAgIHJldHVybiBwcm9tcHQocXVlc3Rpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB3b3JrZmxvdztcbiAgfVxuXG4gIEBtZW1vaXplXG4gIHByb3RlY3RlZCBhc3luYyBnZXRTY2hlbWF0aWNDb2xsZWN0aW9ucygpOiBQcm9taXNlPFNldDxzdHJpbmc+PiB7XG4gICAgY29uc3QgZ2V0U2NoZW1hdGljQ29sbGVjdGlvbnMgPSAoXG4gICAgICBjb25maWdTZWN0aW9uOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZCxcbiAgICApOiBTZXQ8c3RyaW5nPiB8IHVuZGVmaW5lZCA9PiB7XG4gICAgICBpZiAoIWNvbmZpZ1NlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgeyBzY2hlbWF0aWNDb2xsZWN0aW9ucywgZGVmYXVsdENvbGxlY3Rpb24gfSA9IGNvbmZpZ1NlY3Rpb247XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShzY2hlbWF0aWNDb2xsZWN0aW9ucykpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTZXQoc2NoZW1hdGljQ29sbGVjdGlvbnMpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmYXVsdENvbGxlY3Rpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBuZXcgU2V0KFtkZWZhdWx0Q29sbGVjdGlvbl0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH07XG5cbiAgICBjb25zdCB7IHdvcmtzcGFjZSwgZ2xvYmFsQ29uZmlndXJhdGlvbiB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGlmICh3b3Jrc3BhY2UpIHtcbiAgICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICAgIGlmIChwcm9qZWN0KSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZ2V0U2NoZW1hdGljQ29sbGVjdGlvbnMod29ya3NwYWNlLmdldFByb2plY3RDbGkocHJvamVjdCkpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZSA9XG4gICAgICBnZXRTY2hlbWF0aWNDb2xsZWN0aW9ucyh3b3Jrc3BhY2U/LmdldENsaSgpKSA/P1xuICAgICAgZ2V0U2NoZW1hdGljQ29sbGVjdGlvbnMoZ2xvYmFsQ29uZmlndXJhdGlvbj8uZ2V0Q2xpKCkpO1xuICAgIGlmICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgU2V0KFtERUZBVUxUX1NDSEVNQVRJQ1NfQ09MTEVDVElPTl0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIHBhcnNlU2NoZW1hdGljSW5mbyhcbiAgICBzY2hlbWF0aWM6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgKTogW2NvbGxlY3Rpb25OYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQsIHNjaGVtYXRpY05hbWU6IHN0cmluZyB8IHVuZGVmaW5lZF0ge1xuICAgIGlmIChzY2hlbWF0aWM/LmluY2x1ZGVzKCc6JykpIHtcbiAgICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSBzY2hlbWF0aWMuc3BsaXQoJzonLCAyKTtcblxuICAgICAgcmV0dXJuIFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV07XG4gICAgfVxuXG4gICAgcmV0dXJuIFt1bmRlZmluZWQsIHNjaGVtYXRpY107XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcnVuU2NoZW1hdGljKG9wdGlvbnM6IHtcbiAgICBleGVjdXRpb25PcHRpb25zOiBTY2hlbWF0aWNzRXhlY3V0aW9uT3B0aW9ucztcbiAgICBzY2hlbWF0aWNPcHRpb25zOiBPdGhlck9wdGlvbnM7XG4gICAgY29sbGVjdGlvbk5hbWU6IHN0cmluZztcbiAgICBzY2hlbWF0aWNOYW1lOiBzdHJpbmc7XG4gIH0pOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgeyBzY2hlbWF0aWNPcHRpb25zLCBleGVjdXRpb25PcHRpb25zLCBjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZSB9ID0gb3B0aW9ucztcbiAgICBjb25zdCB3b3JrZmxvdyA9IGF3YWl0IHRoaXMuZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckV4ZWN1dGlvbihjb2xsZWN0aW9uTmFtZSwgZXhlY3V0aW9uT3B0aW9ucyk7XG5cbiAgICBpZiAoIXNjaGVtYXRpY05hbWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignc2NoZW1hdGljTmFtZSBjYW5ub3QgYmUgdW5kZWZpbmVkLicpO1xuICAgIH1cblxuICAgIGNvbnN0IHsgdW5zdWJzY3JpYmUsIGZpbGVzIH0gPSBzdWJzY3JpYmVUb1dvcmtmbG93KHdvcmtmbG93LCBsb2dnZXIpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHdvcmtmbG93XG4gICAgICAgIC5leGVjdXRlKHtcbiAgICAgICAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgICBzY2hlbWF0aWM6IHNjaGVtYXRpY05hbWUsXG4gICAgICAgICAgb3B0aW9uczogc2NoZW1hdGljT3B0aW9ucyxcbiAgICAgICAgICBsb2dnZXIsXG4gICAgICAgICAgYWxsb3dQcml2YXRlOiB0aGlzLmFsbG93UHJpdmF0ZVNjaGVtYXRpY3MsXG4gICAgICAgIH0pXG4gICAgICAgIC50b1Byb21pc2UoKTtcblxuICAgICAgaWYgKCFmaWxlcy5zaXplKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKCdOb3RoaW5nIHRvIGJlIGRvbmUuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChleGVjdXRpb25PcHRpb25zLmRyeVJ1bikge1xuICAgICAgICBsb2dnZXIud2FybihgXFxuTk9URTogVGhlIFwiLS1kcnktcnVuXCIgb3B0aW9uIG1lYW5zIG5vIGNoYW5nZXMgd2VyZSBtYWRlLmApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgLy8gSW4gY2FzZSB0aGUgd29ya2Zsb3cgd2FzIG5vdCBzdWNjZXNzZnVsLCBzaG93IGFuIGFwcHJvcHJpYXRlIGVycm9yIG1lc3NhZ2UuXG4gICAgICBpZiAoZXJyIGluc3RhbmNlb2YgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24pIHtcbiAgICAgICAgLy8gXCJTZWUgYWJvdmVcIiBiZWNhdXNlIHdlIGFscmVhZHkgcHJpbnRlZCB0aGUgZXJyb3IuXG4gICAgICAgIGxvZ2dlci5mYXRhbCgnVGhlIFNjaGVtYXRpYyB3b3JrZmxvdyBmYWlsZWQuIFNlZSBhYm92ZS4nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZ2dlci5mYXRhbChlcnIubWVzc2FnZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB1bnN1YnNjcmliZSgpO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgcHJpdmF0ZSBkZWZhdWx0UHJvamVjdERlcHJlY2F0aW9uV2FybmluZ1Nob3duID0gZmFsc2U7XG4gIHByaXZhdGUgZ2V0UHJvamVjdE5hbWUoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSwgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgaWYgKCF3b3Jrc3BhY2UpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvamVjdE5hbWUgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdE5hbWUpIHtcbiAgICAgIHJldHVybiBwcm9qZWN0TmFtZTtcbiAgICB9XG5cbiAgICBjb25zdCBkZWZhdWx0UHJvamVjdE5hbWUgPSB3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snZGVmYXVsdFByb2plY3QnXTtcbiAgICBpZiAodHlwZW9mIGRlZmF1bHRQcm9qZWN0TmFtZSA9PT0gJ3N0cmluZycgJiYgZGVmYXVsdFByb2plY3ROYW1lKSB7XG4gICAgICBpZiAoIXRoaXMuZGVmYXVsdFByb2plY3REZXByZWNhdGlvbldhcm5pbmdTaG93bikge1xuICAgICAgICBsb2dnZXIud2Fybih0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICBERVBSRUNBVEVEOiBUaGUgJ2RlZmF1bHRQcm9qZWN0JyB3b3Jrc3BhY2Ugb3B0aW9uIGhhcyBiZWVuIGRlcHJlY2F0ZWQuXG4gICAgICAgICAgICBUaGUgcHJvamVjdCB0byB1c2Ugd2lsbCBiZSBkZXRlcm1pbmVkIGZyb20gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuXG4gICAgICAgICAgYCk7XG5cbiAgICAgICAgdGhpcy5kZWZhdWx0UHJvamVjdERlcHJlY2F0aW9uV2FybmluZ1Nob3duID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRlZmF1bHRQcm9qZWN0TmFtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZXNvbHZlUGF0aHMoY29sbGVjdGlvbk5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSwgcm9vdCB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgcmV0dXJuIHdvcmtzcGFjZVxuICAgICAgPyAvLyBXb3Jrc3BhY2VcbiAgICAgICAgY29sbGVjdGlvbk5hbWUgPT09IERFRkFVTFRfU0NIRU1BVElDU19DT0xMRUNUSU9OXG4gICAgICAgID8gLy8gRmF2b3IgX19kaXJuYW1lIGZvciBAc2NoZW1hdGljcy9hbmd1bGFyIHRvIHVzZSB0aGUgYnVpbGQtaW4gdmVyc2lvblxuICAgICAgICAgIFtfX2Rpcm5hbWUsIHByb2Nlc3MuY3dkKCksIHJvb3RdXG4gICAgICAgIDogW3Byb2Nlc3MuY3dkKCksIHJvb3QsIF9fZGlybmFtZV1cbiAgICAgIDogLy8gR2xvYmFsXG4gICAgICAgIFtfX2Rpcm5hbWUsIHByb2Nlc3MuY3dkKCldO1xuICB9XG59XG4iXX0=