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
const path_1 = require("path");
const config_1 = require("../utilities/config");
const error_1 = require("../utilities/error");
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
        this.scope = command_module_1.CommandScope.In;
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
        workflow.registry.useXDeprecatedProvider((msg) => logger.warn(msg));
        workflow.registry.addSmartDefaultProvider('projectName', () => this.getProjectName());
        const workingDir = (0, core_1.normalize)((0, path_1.relative)(this.context.root, process.cwd()));
        workflow.registry.addSmartDefaultProvider('workingDirectory', () => workingDir === '' ? undefined : workingDir);
        let shouldReportAnalytics = true;
        workflow.engineHost.registerOptionsTransform(async (schematic, options) => {
            if (shouldReportAnalytics) {
                shouldReportAnalytics = false;
                await this.reportAnalytics(options, undefined /** paths */, undefined /** dimensions */, schematic.collection.name + ':' + schematic.name);
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
        // Resolve relative collections from the location of `angular.json`
        const resolveRelativeCollection = (collectionName) => collectionName.charAt(0) === '.'
            ? (0, path_1.resolve)(this.context.root, collectionName)
            : collectionName;
        const getSchematicCollections = (configSection) => {
            if (!configSection) {
                return undefined;
            }
            const { schematicCollections, defaultCollection } = configSection;
            if (Array.isArray(schematicCollections)) {
                return new Set(schematicCollections.map((c) => resolveRelativeCollection(c)));
            }
            else if (typeof defaultCollection === 'string') {
                return new Set([resolveRelativeCollection(defaultCollection)]);
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
        const value = (_a = getSchematicCollections(workspace === null || workspace === void 0 ? void 0 : workspace.getCli())) !== null && _a !== void 0 ? _a : getSchematicCollections(globalConfiguration.getCli());
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
                (0, error_1.assertIsError)(err);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFrRjtBQUNsRiwyREFBZ0c7QUFDaEcsNERBSTBDO0FBRTFDLCtCQUF5QztBQUV6QyxnREFBNEU7QUFDNUUsOENBQW1EO0FBQ25ELGtEQUErQztBQUMvQywwQ0FBeUM7QUFDekMscURBTTBCO0FBQzFCLHlEQUEyRTtBQUMzRSw2RUFBd0U7QUFDeEUsdUVBQXFFO0FBRXhELFFBQUEsNkJBQTZCLEdBQUcscUJBQXFCLENBQUM7QUFhbkUsTUFBc0IsdUJBQ3BCLFNBQVEsOEJBQW9DO0lBRDlDOztRQUlXLFVBQUssR0FBRyw2QkFBWSxDQUFDLEVBQUUsQ0FBQztRQUNkLDJCQUFzQixHQUFZLEtBQUssQ0FBQztRQUMvQiwwQkFBcUIsR0FBRyxLQUFLLENBQUM7UUF3U2xELDBDQUFxQyxHQUFHLEtBQUssQ0FBQztJQXlDeEQsQ0FBQztJQS9VQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVU7UUFDdEIsT0FBTyxJQUFJO2FBQ1IsTUFBTSxDQUFDLGFBQWEsRUFBRTtZQUNyQixRQUFRLEVBQUUsbUNBQW1DO1lBQzdDLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDZCxDQUFDO2FBQ0QsTUFBTSxDQUFDLFNBQVMsRUFBRTtZQUNqQixRQUFRLEVBQUUsK0RBQStEO1lBQ3pFLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDO2FBQ0QsTUFBTSxDQUFDLFVBQVUsRUFBRTtZQUNsQixRQUFRLEVBQUUsK0RBQStE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QUFNLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNsRSxJQUFJLE9BQU8sa0JBQWtCLEtBQUssUUFBUSxJQUFJLGtCQUFrQixFQUFFO1lBQ2hFLElBQUksQ0FBQyxJQUFJLENBQUMscUNBQXFDLEVBQUU7Z0JBQy9DLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FBQTs7O1lBR3BCLENBQUMsQ0FBQztnQkFFTixJQUFJLENBQUMscUNBQXFDLEdBQUcsSUFBSSxDQUFDO2FBQ25EO1lBRUQsT0FBTyxrQkFBa0IsQ0FBQztTQUMzQjtRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFFTyxlQUFlLENBQUMsY0FBc0I7UUFDNUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBRXpDLE9BQU8sU0FBUztZQUNkLENBQUMsQ0FBQyxZQUFZO2dCQUNaLGNBQWMsS0FBSyxxQ0FBNkI7b0JBQ2hELENBQUMsQ0FBQyxzRUFBc0U7d0JBQ3RFLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUM7b0JBQ2xDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDO1lBQ3BDLENBQUMsQ0FBQyxTQUFTO2dCQUNULENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7Q0FDRjtBQXRTQztJQUFDLGlCQUFPOzs7b0NBQ3lELG9CQUFZOzRFQUs1RTtBQUdlO0lBRGYsaUJBQU87Ozs7OEVBcUlQO0FBR2U7SUFEZixpQkFBTzs7OztzRUE0Q1A7QUE1T0gsMERBdVZDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IG5vcm1hbGl6ZSBhcyBkZXZraXROb3JtYWxpemUsIHNjaGVtYSwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IENvbGxlY3Rpb24sIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uLCBmb3JtYXRzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHtcbiAgRmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjcmlwdGlvbixcbiAgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2NyaXB0aW9uLFxuICBOb2RlV29ya2Zsb3csXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB0eXBlIHsgQ2hlY2tib3hRdWVzdGlvbiwgUXVlc3Rpb24gfSBmcm9tICdpbnF1aXJlcic7XG5pbXBvcnQgeyByZWxhdGl2ZSwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IGdldFByb2plY3RCeUN3ZCwgZ2V0U2NoZW1hdGljRGVmYXVsdHMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IGFzc2VydElzRXJyb3IgfSBmcm9tICcuLi91dGlsaXRpZXMvZXJyb3InO1xuaW1wb3J0IHsgbWVtb2l6ZSB9IGZyb20gJy4uL3V0aWxpdGllcy9tZW1vaXplJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3R0eSc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIENvbW1hbmRTY29wZSxcbiAgT3B0aW9ucyxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IE9wdGlvbiwgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuaW1wb3J0IHsgU2NoZW1hdGljRW5naW5lSG9zdCB9IGZyb20gJy4vdXRpbGl0aWVzL3NjaGVtYXRpYy1lbmdpbmUtaG9zdCc7XG5pbXBvcnQgeyBzdWJzY3JpYmVUb1dvcmtmbG93IH0gZnJvbSAnLi91dGlsaXRpZXMvc2NoZW1hdGljLXdvcmtmbG93JztcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0NIRU1BVElDU19DT0xMRUNUSU9OID0gJ0BzY2hlbWF0aWNzL2FuZ3VsYXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNjaGVtYXRpY3NDb21tYW5kQXJncyB7XG4gIGludGVyYWN0aXZlOiBib29sZWFuO1xuICBmb3JjZTogYm9vbGVhbjtcbiAgJ2RyeS1ydW4nOiBib29sZWFuO1xuICBkZWZhdWx0czogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTY2hlbWF0aWNzRXhlY3V0aW9uT3B0aW9ucyBleHRlbmRzIE9wdGlvbnM8U2NoZW1hdGljc0NvbW1hbmRBcmdzPiB7XG4gIHBhY2thZ2VSZWdpc3RyeT86IHN0cmluZztcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgQ29tbWFuZE1vZHVsZTxTY2hlbWF0aWNzQ29tbWFuZEFyZ3M+XG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPFNjaGVtYXRpY3NDb21tYW5kQXJncz5cbntcbiAgb3ZlcnJpZGUgc2NvcGUgPSBDb21tYW5kU2NvcGUuSW47XG4gIHByb3RlY3RlZCByZWFkb25seSBhbGxvd1ByaXZhdGVTY2hlbWF0aWNzOiBib29sZWFuID0gZmFsc2U7XG4gIHByb3RlY3RlZCBvdmVycmlkZSByZWFkb25seSBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSBmYWxzZTtcblxuICBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8U2NoZW1hdGljc0NvbW1hbmRBcmdzPj4ge1xuICAgIHJldHVybiBhcmd2XG4gICAgICAub3B0aW9uKCdpbnRlcmFjdGl2ZScsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdFbmFibGUgaW50ZXJhY3RpdmUgaW5wdXQgcHJvbXB0cy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignZHJ5LXJ1bicsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdSdW4gdGhyb3VnaCBhbmQgcmVwb3J0cyBhY3Rpdml0eSB3aXRob3V0IHdyaXRpbmcgb3V0IHJlc3VsdHMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdkZWZhdWx0cycsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdEaXNhYmxlIGludGVyYWN0aXZlIGlucHV0IHByb21wdHMgZm9yIG9wdGlvbnMgd2l0aCBhIGRlZmF1bHQuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdmb3JjZScsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdGb3JjZSBvdmVyd3JpdGluZyBvZiBleGlzdGluZyBmaWxlcy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5zdHJpY3QoKTtcbiAgfVxuXG4gIC8qKiBHZXQgc2NoZW1hdGljIHNjaGVtYSBvcHRpb25zLiovXG4gIHByb3RlY3RlZCBhc3luYyBnZXRTY2hlbWF0aWNPcHRpb25zKFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb248RmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjcmlwdGlvbiwgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2NyaXB0aW9uPixcbiAgICBzY2hlbWF0aWNOYW1lOiBzdHJpbmcsXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgKTogUHJvbWlzZTxPcHRpb25bXT4ge1xuICAgIGNvbnN0IHNjaGVtYXRpYyA9IGNvbGxlY3Rpb24uY3JlYXRlU2NoZW1hdGljKHNjaGVtYXRpY05hbWUsIHRydWUpO1xuICAgIGNvbnN0IHsgc2NoZW1hSnNvbiB9ID0gc2NoZW1hdGljLmRlc2NyaXB0aW9uO1xuXG4gICAgaWYgKCFzY2hlbWFKc29uKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyh3b3JrZmxvdy5yZWdpc3RyeSwgc2NoZW1hSnNvbik7XG4gIH1cblxuICBAbWVtb2l6ZVxuICBwcm90ZWN0ZWQgZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckJ1aWxkZXIoY29sbGVjdGlvbk5hbWU6IHN0cmluZyk6IE5vZGVXb3JrZmxvdyB7XG4gICAgcmV0dXJuIG5ldyBOb2RlV29ya2Zsb3codGhpcy5jb250ZXh0LnJvb3QsIHtcbiAgICAgIHJlc29sdmVQYXRoczogdGhpcy5nZXRSZXNvbHZlUGF0aHMoY29sbGVjdGlvbk5hbWUpLFxuICAgICAgZW5naW5lSG9zdENyZWF0b3I6IChvcHRpb25zKSA9PiBuZXcgU2NoZW1hdGljRW5naW5lSG9zdChvcHRpb25zLnJlc29sdmVQYXRocyksXG4gICAgfSk7XG4gIH1cblxuICBAbWVtb2l6ZVxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckV4ZWN1dGlvbihcbiAgICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFNjaGVtYXRpY3NFeGVjdXRpb25PcHRpb25zLFxuICApOiBQcm9taXNlPE5vZGVXb3JrZmxvdz4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyLCByb290LCBwYWNrYWdlTWFuYWdlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHsgZm9yY2UsIGRyeVJ1biwgcGFja2FnZVJlZ2lzdHJ5IH0gPSBvcHRpb25zO1xuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSBuZXcgTm9kZVdvcmtmbG93KHJvb3QsIHtcbiAgICAgIGZvcmNlLFxuICAgICAgZHJ5UnVuLFxuICAgICAgcGFja2FnZU1hbmFnZXI6IHBhY2thZ2VNYW5hZ2VyLm5hbWUsXG4gICAgICAvLyBBIHNjaGVtYSByZWdpc3RyeSBpcyByZXF1aXJlZCB0byBhbGxvdyBjdXN0b21pemluZyBhZGRVbmRlZmluZWREZWZhdWx0c1xuICAgICAgcmVnaXN0cnk6IG5ldyBzY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KGZvcm1hdHMuc3RhbmRhcmRGb3JtYXRzKSxcbiAgICAgIHBhY2thZ2VSZWdpc3RyeSxcbiAgICAgIHJlc29sdmVQYXRoczogdGhpcy5nZXRSZXNvbHZlUGF0aHMoY29sbGVjdGlvbk5hbWUpLFxuICAgICAgc2NoZW1hVmFsaWRhdGlvbjogdHJ1ZSxcbiAgICAgIG9wdGlvblRyYW5zZm9ybXM6IFtcbiAgICAgICAgLy8gQWRkIGNvbmZpZ3VyYXRpb24gZmlsZSBkZWZhdWx0c1xuICAgICAgICBhc3luYyAoc2NoZW1hdGljLCBjdXJyZW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgcHJvamVjdE5hbWUgPVxuICAgICAgICAgICAgdHlwZW9mIGN1cnJlbnQ/LnByb2plY3QgPT09ICdzdHJpbmcnID8gY3VycmVudC5wcm9qZWN0IDogdGhpcy5nZXRQcm9qZWN0TmFtZSgpO1xuXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC4uLihhd2FpdCBnZXRTY2hlbWF0aWNEZWZhdWx0cyhzY2hlbWF0aWMuY29sbGVjdGlvbi5uYW1lLCBzY2hlbWF0aWMubmFtZSwgcHJvamVjdE5hbWUpKSxcbiAgICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KTtcblxuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFBvc3RUcmFuc2Zvcm0oc2NoZW1hLnRyYW5zZm9ybXMuYWRkVW5kZWZpbmVkRGVmYXVsdHMpO1xuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LnVzZVhEZXByZWNhdGVkUHJvdmlkZXIoKG1zZykgPT4gbG9nZ2VyLndhcm4obXNnKSk7XG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ3Byb2plY3ROYW1lJywgKCkgPT4gdGhpcy5nZXRQcm9qZWN0TmFtZSgpKTtcblxuICAgIGNvbnN0IHdvcmtpbmdEaXIgPSBkZXZraXROb3JtYWxpemUocmVsYXRpdmUodGhpcy5jb250ZXh0LnJvb3QsIHByb2Nlc3MuY3dkKCkpKTtcbiAgICB3b3JrZmxvdy5yZWdpc3RyeS5hZGRTbWFydERlZmF1bHRQcm92aWRlcignd29ya2luZ0RpcmVjdG9yeScsICgpID0+XG4gICAgICB3b3JraW5nRGlyID09PSAnJyA/IHVuZGVmaW5lZCA6IHdvcmtpbmdEaXIsXG4gICAgKTtcblxuICAgIGxldCBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSB0cnVlO1xuICAgIHdvcmtmbG93LmVuZ2luZUhvc3QucmVnaXN0ZXJPcHRpb25zVHJhbnNmb3JtKGFzeW5jIChzY2hlbWF0aWMsIG9wdGlvbnMpID0+IHtcbiAgICAgIGlmIChzaG91bGRSZXBvcnRBbmFseXRpY3MpIHtcbiAgICAgICAgc2hvdWxkUmVwb3J0QW5hbHl0aWNzID0gZmFsc2U7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5yZXBvcnRBbmFseXRpY3MoXG4gICAgICAgICAgb3B0aW9ucyBhcyB7fSxcbiAgICAgICAgICB1bmRlZmluZWQgLyoqIHBhdGhzICovLFxuICAgICAgICAgIHVuZGVmaW5lZCAvKiogZGltZW5zaW9ucyAqLyxcbiAgICAgICAgICBzY2hlbWF0aWMuY29sbGVjdGlvbi5uYW1lICsgJzonICsgc2NoZW1hdGljLm5hbWUsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvcHRpb25zO1xuICAgIH0pO1xuXG4gICAgaWYgKG9wdGlvbnMuaW50ZXJhY3RpdmUgIT09IGZhbHNlICYmIGlzVFRZKCkpIHtcbiAgICAgIHdvcmtmbG93LnJlZ2lzdHJ5LnVzZVByb21wdFByb3ZpZGVyKGFzeW5jIChkZWZpbml0aW9uczogQXJyYXk8c2NoZW1hLlByb21wdERlZmluaXRpb24+KSA9PiB7XG4gICAgICAgIGNvbnN0IHF1ZXN0aW9ucyA9IGRlZmluaXRpb25zXG4gICAgICAgICAgLmZpbHRlcigoZGVmaW5pdGlvbikgPT4gIW9wdGlvbnMuZGVmYXVsdHMgfHwgZGVmaW5pdGlvbi5kZWZhdWx0ID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgLm1hcCgoZGVmaW5pdGlvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3Rpb246IFF1ZXN0aW9uID0ge1xuICAgICAgICAgICAgICBuYW1lOiBkZWZpbml0aW9uLmlkLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBkZWZpbml0aW9uLm1lc3NhZ2UsXG4gICAgICAgICAgICAgIGRlZmF1bHQ6IGRlZmluaXRpb24uZGVmYXVsdCxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRvciA9IGRlZmluaXRpb24udmFsaWRhdG9yO1xuICAgICAgICAgICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgICAgICAgICBxdWVzdGlvbi52YWxpZGF0ZSA9IChpbnB1dCkgPT4gdmFsaWRhdG9yKGlucHV0KTtcblxuICAgICAgICAgICAgICAvLyBGaWx0ZXIgYWxsb3dzIHRyYW5zZm9ybWF0aW9uIG9mIHRoZSB2YWx1ZSBwcmlvciB0byB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgIHF1ZXN0aW9uLmZpbHRlciA9IGFzeW5jIChpbnB1dCkgPT4ge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdHlwZSBvZiBkZWZpbml0aW9uLnByb3BlcnR5VHlwZXMpIHtcbiAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gU3RyaW5nKGlucHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBOdW1iZXIoaW5wdXQpO1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gaW5wdXQ7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyBDYW4gYmUgYSBzdHJpbmcgaWYgdmFsaWRhdGlvbiBmYWlsc1xuICAgICAgICAgICAgICAgICAgY29uc3QgaXNWYWxpZCA9IChhd2FpdCB2YWxpZGF0b3IodmFsdWUpKSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGlmIChpc1ZhbGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXQ7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN3aXRjaCAoZGVmaW5pdGlvbi50eXBlKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ2NvbmZpcm1hdGlvbic6XG4gICAgICAgICAgICAgICAgcXVlc3Rpb24udHlwZSA9ICdjb25maXJtJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnbGlzdCc6XG4gICAgICAgICAgICAgICAgcXVlc3Rpb24udHlwZSA9IGRlZmluaXRpb24ubXVsdGlzZWxlY3QgPyAnY2hlY2tib3gnIDogJ2xpc3QnO1xuICAgICAgICAgICAgICAgIChxdWVzdGlvbiBhcyBDaGVja2JveFF1ZXN0aW9uKS5jaG9pY2VzID0gZGVmaW5pdGlvbi5pdGVtcz8ubWFwKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIGl0ZW0gPT0gJ3N0cmluZydcbiAgICAgICAgICAgICAgICAgICAgPyBpdGVtXG4gICAgICAgICAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5sYWJlbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcXVlc3Rpb24udHlwZSA9IGRlZmluaXRpb24udHlwZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHF1ZXN0aW9uO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChxdWVzdGlvbnMubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgeyBwcm9tcHQgfSA9IGF3YWl0IGltcG9ydCgnaW5xdWlyZXInKTtcblxuICAgICAgICAgIHJldHVybiBwcm9tcHQocXVlc3Rpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB3b3JrZmxvdztcbiAgfVxuXG4gIEBtZW1vaXplXG4gIHByb3RlY3RlZCBhc3luYyBnZXRTY2hlbWF0aWNDb2xsZWN0aW9ucygpOiBQcm9taXNlPFNldDxzdHJpbmc+PiB7XG4gICAgLy8gUmVzb2x2ZSByZWxhdGl2ZSBjb2xsZWN0aW9ucyBmcm9tIHRoZSBsb2NhdGlvbiBvZiBgYW5ndWxhci5qc29uYFxuICAgIGNvbnN0IHJlc29sdmVSZWxhdGl2ZUNvbGxlY3Rpb24gPSAoY29sbGVjdGlvbk5hbWU6IHN0cmluZykgPT5cbiAgICAgIGNvbGxlY3Rpb25OYW1lLmNoYXJBdCgwKSA9PT0gJy4nXG4gICAgICAgID8gcmVzb2x2ZSh0aGlzLmNvbnRleHQucm9vdCwgY29sbGVjdGlvbk5hbWUpXG4gICAgICAgIDogY29sbGVjdGlvbk5hbWU7XG5cbiAgICBjb25zdCBnZXRTY2hlbWF0aWNDb2xsZWN0aW9ucyA9IChcbiAgICAgIGNvbmZpZ1NlY3Rpb246IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkLFxuICAgICk6IFNldDxzdHJpbmc+IHwgdW5kZWZpbmVkID0+IHtcbiAgICAgIGlmICghY29uZmlnU2VjdGlvbikge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7IHNjaGVtYXRpY0NvbGxlY3Rpb25zLCBkZWZhdWx0Q29sbGVjdGlvbiB9ID0gY29uZmlnU2VjdGlvbjtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHNjaGVtYXRpY0NvbGxlY3Rpb25zKSkge1xuICAgICAgICByZXR1cm4gbmV3IFNldChzY2hlbWF0aWNDb2xsZWN0aW9ucy5tYXAoKGMpID0+IHJlc29sdmVSZWxhdGl2ZUNvbGxlY3Rpb24oYykpKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmF1bHRDb2xsZWN0aW9uID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gbmV3IFNldChbcmVzb2x2ZVJlbGF0aXZlQ29sbGVjdGlvbihkZWZhdWx0Q29sbGVjdGlvbildKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgY29uc3QgeyB3b3Jrc3BhY2UsIGdsb2JhbENvbmZpZ3VyYXRpb24gfSA9IHRoaXMuY29udGV4dDtcbiAgICBpZiAod29ya3NwYWNlKSB7XG4gICAgICBjb25zdCBwcm9qZWN0ID0gZ2V0UHJvamVjdEJ5Q3dkKHdvcmtzcGFjZSk7XG4gICAgICBpZiAocHJvamVjdCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKHdvcmtzcGFjZS5nZXRQcm9qZWN0Q2xpKHByb2plY3QpKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPVxuICAgICAgZ2V0U2NoZW1hdGljQ29sbGVjdGlvbnMod29ya3NwYWNlPy5nZXRDbGkoKSkgPz9cbiAgICAgIGdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKGdsb2JhbENvbmZpZ3VyYXRpb24uZ2V0Q2xpKCkpO1xuICAgIGlmICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgU2V0KFtERUZBVUxUX1NDSEVNQVRJQ1NfQ09MTEVDVElPTl0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIHBhcnNlU2NoZW1hdGljSW5mbyhcbiAgICBzY2hlbWF0aWM6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgKTogW2NvbGxlY3Rpb25OYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQsIHNjaGVtYXRpY05hbWU6IHN0cmluZyB8IHVuZGVmaW5lZF0ge1xuICAgIGlmIChzY2hlbWF0aWM/LmluY2x1ZGVzKCc6JykpIHtcbiAgICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSBzY2hlbWF0aWMuc3BsaXQoJzonLCAyKTtcblxuICAgICAgcmV0dXJuIFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV07XG4gICAgfVxuXG4gICAgcmV0dXJuIFt1bmRlZmluZWQsIHNjaGVtYXRpY107XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcnVuU2NoZW1hdGljKG9wdGlvbnM6IHtcbiAgICBleGVjdXRpb25PcHRpb25zOiBTY2hlbWF0aWNzRXhlY3V0aW9uT3B0aW9ucztcbiAgICBzY2hlbWF0aWNPcHRpb25zOiBPdGhlck9wdGlvbnM7XG4gICAgY29sbGVjdGlvbk5hbWU6IHN0cmluZztcbiAgICBzY2hlbWF0aWNOYW1lOiBzdHJpbmc7XG4gIH0pOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgeyBzY2hlbWF0aWNPcHRpb25zLCBleGVjdXRpb25PcHRpb25zLCBjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZSB9ID0gb3B0aW9ucztcbiAgICBjb25zdCB3b3JrZmxvdyA9IGF3YWl0IHRoaXMuZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckV4ZWN1dGlvbihjb2xsZWN0aW9uTmFtZSwgZXhlY3V0aW9uT3B0aW9ucyk7XG5cbiAgICBpZiAoIXNjaGVtYXRpY05hbWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignc2NoZW1hdGljTmFtZSBjYW5ub3QgYmUgdW5kZWZpbmVkLicpO1xuICAgIH1cblxuICAgIGNvbnN0IHsgdW5zdWJzY3JpYmUsIGZpbGVzIH0gPSBzdWJzY3JpYmVUb1dvcmtmbG93KHdvcmtmbG93LCBsb2dnZXIpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHdvcmtmbG93XG4gICAgICAgIC5leGVjdXRlKHtcbiAgICAgICAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgICBzY2hlbWF0aWM6IHNjaGVtYXRpY05hbWUsXG4gICAgICAgICAgb3B0aW9uczogc2NoZW1hdGljT3B0aW9ucyxcbiAgICAgICAgICBsb2dnZXIsXG4gICAgICAgICAgYWxsb3dQcml2YXRlOiB0aGlzLmFsbG93UHJpdmF0ZVNjaGVtYXRpY3MsXG4gICAgICAgIH0pXG4gICAgICAgIC50b1Byb21pc2UoKTtcblxuICAgICAgaWYgKCFmaWxlcy5zaXplKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKCdOb3RoaW5nIHRvIGJlIGRvbmUuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChleGVjdXRpb25PcHRpb25zLmRyeVJ1bikge1xuICAgICAgICBsb2dnZXIud2FybihgXFxuTk9URTogVGhlIFwiLS1kcnktcnVuXCIgb3B0aW9uIG1lYW5zIG5vIGNoYW5nZXMgd2VyZSBtYWRlLmApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgLy8gSW4gY2FzZSB0aGUgd29ya2Zsb3cgd2FzIG5vdCBzdWNjZXNzZnVsLCBzaG93IGFuIGFwcHJvcHJpYXRlIGVycm9yIG1lc3NhZ2UuXG4gICAgICBpZiAoZXJyIGluc3RhbmNlb2YgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24pIHtcbiAgICAgICAgLy8gXCJTZWUgYWJvdmVcIiBiZWNhdXNlIHdlIGFscmVhZHkgcHJpbnRlZCB0aGUgZXJyb3IuXG4gICAgICAgIGxvZ2dlci5mYXRhbCgnVGhlIFNjaGVtYXRpYyB3b3JrZmxvdyBmYWlsZWQuIFNlZSBhYm92ZS4nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFzc2VydElzRXJyb3IoZXJyKTtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKGVyci5tZXNzYWdlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHVuc3Vic2NyaWJlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwcml2YXRlIGRlZmF1bHRQcm9qZWN0RGVwcmVjYXRpb25XYXJuaW5nU2hvd24gPSBmYWxzZTtcbiAgcHJpdmF0ZSBnZXRQcm9qZWN0TmFtZSgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlLCBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBpZiAoIXdvcmtzcGFjZSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0TmFtZSA9IGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2UpO1xuICAgIGlmIChwcm9qZWN0TmFtZSkge1xuICAgICAgcmV0dXJuIHByb2plY3ROYW1lO1xuICAgIH1cblxuICAgIGNvbnN0IGRlZmF1bHRQcm9qZWN0TmFtZSA9IHdvcmtzcGFjZS5leHRlbnNpb25zWydkZWZhdWx0UHJvamVjdCddO1xuICAgIGlmICh0eXBlb2YgZGVmYXVsdFByb2plY3ROYW1lID09PSAnc3RyaW5nJyAmJiBkZWZhdWx0UHJvamVjdE5hbWUpIHtcbiAgICAgIGlmICghdGhpcy5kZWZhdWx0UHJvamVjdERlcHJlY2F0aW9uV2FybmluZ1Nob3duKSB7XG4gICAgICAgIGxvZ2dlci53YXJuKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgICBERVBSRUNBVEVEOiBUaGUgJ2RlZmF1bHRQcm9qZWN0JyB3b3Jrc3BhY2Ugb3B0aW9uIGhhcyBiZWVuIGRlcHJlY2F0ZWQuXG4gICAgICAgICAgICAgVGhlIHByb2plY3QgdG8gdXNlIHdpbGwgYmUgZGV0ZXJtaW5lZCBmcm9tIHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LlxuICAgICAgICAgICBgKTtcblxuICAgICAgICB0aGlzLmRlZmF1bHRQcm9qZWN0RGVwcmVjYXRpb25XYXJuaW5nU2hvd24gPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmYXVsdFByb2plY3ROYW1lO1xuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBwcml2YXRlIGdldFJlc29sdmVQYXRocyhjb2xsZWN0aW9uTmFtZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlLCByb290IH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICByZXR1cm4gd29ya3NwYWNlXG4gICAgICA/IC8vIFdvcmtzcGFjZVxuICAgICAgICBjb2xsZWN0aW9uTmFtZSA9PT0gREVGQVVMVF9TQ0hFTUFUSUNTX0NPTExFQ1RJT05cbiAgICAgICAgPyAvLyBGYXZvciBfX2Rpcm5hbWUgZm9yIEBzY2hlbWF0aWNzL2FuZ3VsYXIgdG8gdXNlIHRoZSBidWlsZC1pbiB2ZXJzaW9uXG4gICAgICAgICAgW19fZGlybmFtZSwgcHJvY2Vzcy5jd2QoKSwgcm9vdF1cbiAgICAgICAgOiBbcHJvY2Vzcy5jd2QoKSwgcm9vdCwgX19kaXJuYW1lXVxuICAgICAgOiAvLyBHbG9iYWxcbiAgICAgICAgW19fZGlybmFtZSwgcHJvY2Vzcy5jd2QoKV07XG4gIH1cbn1cbiJdfQ==