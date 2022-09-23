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
            // TODO: The below should be removed in version 15 when we change 1P schematics to use the `workingDirectory smart default`.
            // Handle `"format": "path"` options.
            const schema = schematic === null || schematic === void 0 ? void 0 : schematic.schemaJson;
            if (!options || !schema || !(0, core_1.isJsonObject)(schema)) {
                return options;
            }
            if (!('path' in options && options['path'] === undefined)) {
                return options;
            }
            const properties = schema === null || schema === void 0 ? void 0 : schema['properties'];
            if (!properties || !(0, core_1.isJsonObject)(properties)) {
                return options;
            }
            const property = properties['path'];
            if (!property || !(0, core_1.isJsonObject)(property)) {
                return options;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFnRztBQUNoRywyREFBZ0c7QUFDaEcsNERBSTBDO0FBRTFDLCtCQUF5QztBQUV6QyxnREFBNEU7QUFDNUUsOENBQW1EO0FBQ25ELGtEQUErQztBQUMvQywwQ0FBeUM7QUFDekMscURBTTBCO0FBQzFCLHlEQUEyRTtBQUMzRSw2RUFBd0U7QUFDeEUsdUVBQXFFO0FBRXhELFFBQUEsNkJBQTZCLEdBQUcscUJBQXFCLENBQUM7QUFhbkUsTUFBc0IsdUJBQ3BCLFNBQVEsOEJBQW9DO0lBRDlDOztRQUlXLFVBQUssR0FBRyw2QkFBWSxDQUFDLEVBQUUsQ0FBQztRQUNkLDJCQUFzQixHQUFZLEtBQUssQ0FBQztRQUMvQiwwQkFBcUIsR0FBRyxLQUFLLENBQUM7UUE4VGxELDBDQUFxQyxHQUFHLEtBQUssQ0FBQztJQXlDeEQsQ0FBQztJQXJXQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVU7UUFDdEIsT0FBTyxJQUFJO2FBQ1IsTUFBTSxDQUFDLGFBQWEsRUFBRTtZQUNyQixRQUFRLEVBQUUsbUNBQW1DO1lBQzdDLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDZCxDQUFDO2FBQ0QsTUFBTSxDQUFDLFNBQVMsRUFBRTtZQUNqQixRQUFRLEVBQUUsK0RBQStEO1lBQ3pFLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDO2FBQ0QsTUFBTSxDQUFDLFVBQVUsRUFBRTtZQUNsQixRQUFRLEVBQUUsK0RBQStE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O0lBRU8sZUFBZSxDQUFDLGNBQXNCO1FBQzVDLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUV6QyxPQUFPLFNBQVM7WUFDZCxDQUFDLENBQUMsWUFBWTtnQkFDWixjQUFjLEtBQUsscUNBQTZCO29CQUNoRCxDQUFDLENBQUMsc0VBQXNFO3dCQUN0RSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDO29CQUNsQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQztZQUNwQyxDQUFDLENBQUMsU0FBUztnQkFDVCxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUNqQyxDQUFDO0NBQ0Y7QUE1VEM7SUFBQyxpQkFBTzs7O29DQUN5RCxvQkFBWTs0RUFLNUU7QUFHZTtJQURmLGlCQUFPOzs7OzhFQTJKUDtBQUdlO0lBRGYsaUJBQU87Ozs7c0VBNENQO0FBbFFILDBEQTZXQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBub3JtYWxpemUgYXMgZGV2a2l0Tm9ybWFsaXplLCBpc0pzb25PYmplY3QsIHNjaGVtYSwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IENvbGxlY3Rpb24sIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uLCBmb3JtYXRzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHtcbiAgRmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjcmlwdGlvbixcbiAgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2NyaXB0aW9uLFxuICBOb2RlV29ya2Zsb3csXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB0eXBlIHsgQ2hlY2tib3hRdWVzdGlvbiwgUXVlc3Rpb24gfSBmcm9tICdpbnF1aXJlcic7XG5pbXBvcnQgeyByZWxhdGl2ZSwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IGdldFByb2plY3RCeUN3ZCwgZ2V0U2NoZW1hdGljRGVmYXVsdHMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IGFzc2VydElzRXJyb3IgfSBmcm9tICcuLi91dGlsaXRpZXMvZXJyb3InO1xuaW1wb3J0IHsgbWVtb2l6ZSB9IGZyb20gJy4uL3V0aWxpdGllcy9tZW1vaXplJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3R0eSc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIENvbW1hbmRTY29wZSxcbiAgT3B0aW9ucyxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IE9wdGlvbiwgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuaW1wb3J0IHsgU2NoZW1hdGljRW5naW5lSG9zdCB9IGZyb20gJy4vdXRpbGl0aWVzL3NjaGVtYXRpYy1lbmdpbmUtaG9zdCc7XG5pbXBvcnQgeyBzdWJzY3JpYmVUb1dvcmtmbG93IH0gZnJvbSAnLi91dGlsaXRpZXMvc2NoZW1hdGljLXdvcmtmbG93JztcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0NIRU1BVElDU19DT0xMRUNUSU9OID0gJ0BzY2hlbWF0aWNzL2FuZ3VsYXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNjaGVtYXRpY3NDb21tYW5kQXJncyB7XG4gIGludGVyYWN0aXZlOiBib29sZWFuO1xuICBmb3JjZTogYm9vbGVhbjtcbiAgJ2RyeS1ydW4nOiBib29sZWFuO1xuICBkZWZhdWx0czogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTY2hlbWF0aWNzRXhlY3V0aW9uT3B0aW9ucyBleHRlbmRzIE9wdGlvbnM8U2NoZW1hdGljc0NvbW1hbmRBcmdzPiB7XG4gIHBhY2thZ2VSZWdpc3RyeT86IHN0cmluZztcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgQ29tbWFuZE1vZHVsZTxTY2hlbWF0aWNzQ29tbWFuZEFyZ3M+XG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPFNjaGVtYXRpY3NDb21tYW5kQXJncz5cbntcbiAgb3ZlcnJpZGUgc2NvcGUgPSBDb21tYW5kU2NvcGUuSW47XG4gIHByb3RlY3RlZCByZWFkb25seSBhbGxvd1ByaXZhdGVTY2hlbWF0aWNzOiBib29sZWFuID0gZmFsc2U7XG4gIHByb3RlY3RlZCBvdmVycmlkZSByZWFkb25seSBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSBmYWxzZTtcblxuICBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8U2NoZW1hdGljc0NvbW1hbmRBcmdzPj4ge1xuICAgIHJldHVybiBhcmd2XG4gICAgICAub3B0aW9uKCdpbnRlcmFjdGl2ZScsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdFbmFibGUgaW50ZXJhY3RpdmUgaW5wdXQgcHJvbXB0cy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignZHJ5LXJ1bicsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdSdW4gdGhyb3VnaCBhbmQgcmVwb3J0cyBhY3Rpdml0eSB3aXRob3V0IHdyaXRpbmcgb3V0IHJlc3VsdHMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdkZWZhdWx0cycsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdEaXNhYmxlIGludGVyYWN0aXZlIGlucHV0IHByb21wdHMgZm9yIG9wdGlvbnMgd2l0aCBhIGRlZmF1bHQuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdmb3JjZScsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdGb3JjZSBvdmVyd3JpdGluZyBvZiBleGlzdGluZyBmaWxlcy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5zdHJpY3QoKTtcbiAgfVxuXG4gIC8qKiBHZXQgc2NoZW1hdGljIHNjaGVtYSBvcHRpb25zLiovXG4gIHByb3RlY3RlZCBhc3luYyBnZXRTY2hlbWF0aWNPcHRpb25zKFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb248RmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjcmlwdGlvbiwgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2NyaXB0aW9uPixcbiAgICBzY2hlbWF0aWNOYW1lOiBzdHJpbmcsXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgKTogUHJvbWlzZTxPcHRpb25bXT4ge1xuICAgIGNvbnN0IHNjaGVtYXRpYyA9IGNvbGxlY3Rpb24uY3JlYXRlU2NoZW1hdGljKHNjaGVtYXRpY05hbWUsIHRydWUpO1xuICAgIGNvbnN0IHsgc2NoZW1hSnNvbiB9ID0gc2NoZW1hdGljLmRlc2NyaXB0aW9uO1xuXG4gICAgaWYgKCFzY2hlbWFKc29uKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyh3b3JrZmxvdy5yZWdpc3RyeSwgc2NoZW1hSnNvbik7XG4gIH1cblxuICBAbWVtb2l6ZVxuICBwcm90ZWN0ZWQgZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckJ1aWxkZXIoY29sbGVjdGlvbk5hbWU6IHN0cmluZyk6IE5vZGVXb3JrZmxvdyB7XG4gICAgcmV0dXJuIG5ldyBOb2RlV29ya2Zsb3codGhpcy5jb250ZXh0LnJvb3QsIHtcbiAgICAgIHJlc29sdmVQYXRoczogdGhpcy5nZXRSZXNvbHZlUGF0aHMoY29sbGVjdGlvbk5hbWUpLFxuICAgICAgZW5naW5lSG9zdENyZWF0b3I6IChvcHRpb25zKSA9PiBuZXcgU2NoZW1hdGljRW5naW5lSG9zdChvcHRpb25zLnJlc29sdmVQYXRocyksXG4gICAgfSk7XG4gIH1cblxuICBAbWVtb2l6ZVxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckV4ZWN1dGlvbihcbiAgICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFNjaGVtYXRpY3NFeGVjdXRpb25PcHRpb25zLFxuICApOiBQcm9taXNlPE5vZGVXb3JrZmxvdz4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyLCByb290LCBwYWNrYWdlTWFuYWdlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHsgZm9yY2UsIGRyeVJ1biwgcGFja2FnZVJlZ2lzdHJ5IH0gPSBvcHRpb25zO1xuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSBuZXcgTm9kZVdvcmtmbG93KHJvb3QsIHtcbiAgICAgIGZvcmNlLFxuICAgICAgZHJ5UnVuLFxuICAgICAgcGFja2FnZU1hbmFnZXI6IHBhY2thZ2VNYW5hZ2VyLm5hbWUsXG4gICAgICAvLyBBIHNjaGVtYSByZWdpc3RyeSBpcyByZXF1aXJlZCB0byBhbGxvdyBjdXN0b21pemluZyBhZGRVbmRlZmluZWREZWZhdWx0c1xuICAgICAgcmVnaXN0cnk6IG5ldyBzY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KGZvcm1hdHMuc3RhbmRhcmRGb3JtYXRzKSxcbiAgICAgIHBhY2thZ2VSZWdpc3RyeSxcbiAgICAgIHJlc29sdmVQYXRoczogdGhpcy5nZXRSZXNvbHZlUGF0aHMoY29sbGVjdGlvbk5hbWUpLFxuICAgICAgc2NoZW1hVmFsaWRhdGlvbjogdHJ1ZSxcbiAgICAgIG9wdGlvblRyYW5zZm9ybXM6IFtcbiAgICAgICAgLy8gQWRkIGNvbmZpZ3VyYXRpb24gZmlsZSBkZWZhdWx0c1xuICAgICAgICBhc3luYyAoc2NoZW1hdGljLCBjdXJyZW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgcHJvamVjdE5hbWUgPVxuICAgICAgICAgICAgdHlwZW9mIGN1cnJlbnQ/LnByb2plY3QgPT09ICdzdHJpbmcnID8gY3VycmVudC5wcm9qZWN0IDogdGhpcy5nZXRQcm9qZWN0TmFtZSgpO1xuXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC4uLihhd2FpdCBnZXRTY2hlbWF0aWNEZWZhdWx0cyhzY2hlbWF0aWMuY29sbGVjdGlvbi5uYW1lLCBzY2hlbWF0aWMubmFtZSwgcHJvamVjdE5hbWUpKSxcbiAgICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KTtcblxuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFBvc3RUcmFuc2Zvcm0oc2NoZW1hLnRyYW5zZm9ybXMuYWRkVW5kZWZpbmVkRGVmYXVsdHMpO1xuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LnVzZVhEZXByZWNhdGVkUHJvdmlkZXIoKG1zZykgPT4gbG9nZ2VyLndhcm4obXNnKSk7XG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ3Byb2plY3ROYW1lJywgKCkgPT4gdGhpcy5nZXRQcm9qZWN0TmFtZSgpKTtcblxuICAgIGNvbnN0IHdvcmtpbmdEaXIgPSBkZXZraXROb3JtYWxpemUocmVsYXRpdmUodGhpcy5jb250ZXh0LnJvb3QsIHByb2Nlc3MuY3dkKCkpKTtcbiAgICB3b3JrZmxvdy5yZWdpc3RyeS5hZGRTbWFydERlZmF1bHRQcm92aWRlcignd29ya2luZ0RpcmVjdG9yeScsICgpID0+XG4gICAgICB3b3JraW5nRGlyID09PSAnJyA/IHVuZGVmaW5lZCA6IHdvcmtpbmdEaXIsXG4gICAgKTtcblxuICAgIGxldCBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSB0cnVlO1xuXG4gICAgd29ya2Zsb3cuZW5naW5lSG9zdC5yZWdpc3Rlck9wdGlvbnNUcmFuc2Zvcm0oYXN5bmMgKHNjaGVtYXRpYywgb3B0aW9ucykgPT4ge1xuICAgICAgaWYgKHNob3VsZFJlcG9ydEFuYWx5dGljcykge1xuICAgICAgICBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSBmYWxzZTtcblxuICAgICAgICBhd2FpdCB0aGlzLnJlcG9ydEFuYWx5dGljcyhcbiAgICAgICAgICBvcHRpb25zIGFzIHt9LFxuICAgICAgICAgIHVuZGVmaW5lZCAvKiogcGF0aHMgKi8sXG4gICAgICAgICAgdW5kZWZpbmVkIC8qKiBkaW1lbnNpb25zICovLFxuICAgICAgICAgIHNjaGVtYXRpYy5jb2xsZWN0aW9uLm5hbWUgKyAnOicgKyBzY2hlbWF0aWMubmFtZSxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgLy8gVE9ETzogVGhlIGJlbG93IHNob3VsZCBiZSByZW1vdmVkIGluIHZlcnNpb24gMTUgd2hlbiB3ZSBjaGFuZ2UgMVAgc2NoZW1hdGljcyB0byB1c2UgdGhlIGB3b3JraW5nRGlyZWN0b3J5IHNtYXJ0IGRlZmF1bHRgLlxuICAgICAgLy8gSGFuZGxlIGBcImZvcm1hdFwiOiBcInBhdGhcImAgb3B0aW9ucy5cbiAgICAgIGNvbnN0IHNjaGVtYSA9IHNjaGVtYXRpYz8uc2NoZW1hSnNvbjtcbiAgICAgIGlmICghb3B0aW9ucyB8fCAhc2NoZW1hIHx8ICFpc0pzb25PYmplY3Qoc2NoZW1hKSkge1xuICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICAgIH1cblxuICAgICAgaWYgKCEoJ3BhdGgnIGluIG9wdGlvbnMgJiYgKG9wdGlvbnMgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pWydwYXRoJ10gPT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHByb3BlcnRpZXMgPSBzY2hlbWE/LlsncHJvcGVydGllcyddO1xuICAgICAgaWYgKCFwcm9wZXJ0aWVzIHx8ICFpc0pzb25PYmplY3QocHJvcGVydGllcykpIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHByb3BlcnR5ID0gcHJvcGVydGllc1sncGF0aCddO1xuICAgICAgaWYgKCFwcm9wZXJ0eSB8fCAhaXNKc29uT2JqZWN0KHByb3BlcnR5KSkge1xuICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgfSk7XG5cbiAgICBpZiAob3B0aW9ucy5pbnRlcmFjdGl2ZSAhPT0gZmFsc2UgJiYgaXNUVFkoKSkge1xuICAgICAgd29ya2Zsb3cucmVnaXN0cnkudXNlUHJvbXB0UHJvdmlkZXIoYXN5bmMgKGRlZmluaXRpb25zOiBBcnJheTxzY2hlbWEuUHJvbXB0RGVmaW5pdGlvbj4pID0+IHtcbiAgICAgICAgY29uc3QgcXVlc3Rpb25zID0gZGVmaW5pdGlvbnNcbiAgICAgICAgICAuZmlsdGVyKChkZWZpbml0aW9uKSA9PiAhb3B0aW9ucy5kZWZhdWx0cyB8fCBkZWZpbml0aW9uLmRlZmF1bHQgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAubWFwKChkZWZpbml0aW9uKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdGlvbjogUXVlc3Rpb24gPSB7XG4gICAgICAgICAgICAgIG5hbWU6IGRlZmluaXRpb24uaWQsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IGRlZmluaXRpb24ubWVzc2FnZSxcbiAgICAgICAgICAgICAgZGVmYXVsdDogZGVmaW5pdGlvbi5kZWZhdWx0LFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgdmFsaWRhdG9yID0gZGVmaW5pdGlvbi52YWxpZGF0b3I7XG4gICAgICAgICAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgIHF1ZXN0aW9uLnZhbGlkYXRlID0gKGlucHV0KSA9PiB2YWxpZGF0b3IoaW5wdXQpO1xuXG4gICAgICAgICAgICAgIC8vIEZpbHRlciBhbGxvd3MgdHJhbnNmb3JtYXRpb24gb2YgdGhlIHZhbHVlIHByaW9yIHRvIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgcXVlc3Rpb24uZmlsdGVyID0gYXN5bmMgKGlucHV0KSA9PiB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB0eXBlIG9mIGRlZmluaXRpb24ucHJvcGVydHlUeXBlcykge1xuICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBTdHJpbmcoaW5wdXQpO1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IE51bWJlcihpbnB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBpbnB1dDtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIENhbiBiZSBhIHN0cmluZyBpZiB2YWxpZGF0aW9uIGZhaWxzXG4gICAgICAgICAgICAgICAgICBjb25zdCBpc1ZhbGlkID0gKGF3YWl0IHZhbGlkYXRvcih2YWx1ZSkpID09PSB0cnVlO1xuICAgICAgICAgICAgICAgICAgaWYgKGlzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dDtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3dpdGNoIChkZWZpbml0aW9uLnR5cGUpIHtcbiAgICAgICAgICAgICAgY2FzZSAnY29uZmlybWF0aW9uJzpcbiAgICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gJ2NvbmZpcm0nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdsaXN0JzpcbiAgICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gZGVmaW5pdGlvbi5tdWx0aXNlbGVjdCA/ICdjaGVja2JveCcgOiAnbGlzdCc7XG4gICAgICAgICAgICAgICAgKHF1ZXN0aW9uIGFzIENoZWNrYm94UXVlc3Rpb24pLmNob2ljZXMgPSBkZWZpbml0aW9uLml0ZW1zPy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgaXRlbSA9PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAgICAgICA/IGl0ZW1cbiAgICAgICAgICAgICAgICAgICAgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLmxhYmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gZGVmaW5pdGlvbi50eXBlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcXVlc3Rpb247XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHF1ZXN0aW9ucy5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCB7IHByb21wdCB9ID0gYXdhaXQgaW1wb3J0KCdpbnF1aXJlcicpO1xuXG4gICAgICAgICAgcmV0dXJuIHByb21wdChxdWVzdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdvcmtmbG93O1xuICB9XG5cbiAgQG1lbW9pemVcbiAgcHJvdGVjdGVkIGFzeW5jIGdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKCk6IFByb21pc2U8U2V0PHN0cmluZz4+IHtcbiAgICAvLyBSZXNvbHZlIHJlbGF0aXZlIGNvbGxlY3Rpb25zIGZyb20gdGhlIGxvY2F0aW9uIG9mIGBhbmd1bGFyLmpzb25gXG4gICAgY29uc3QgcmVzb2x2ZVJlbGF0aXZlQ29sbGVjdGlvbiA9IChjb2xsZWN0aW9uTmFtZTogc3RyaW5nKSA9PlxuICAgICAgY29sbGVjdGlvbk5hbWUuY2hhckF0KDApID09PSAnLidcbiAgICAgICAgPyByZXNvbHZlKHRoaXMuY29udGV4dC5yb290LCBjb2xsZWN0aW9uTmFtZSlcbiAgICAgICAgOiBjb2xsZWN0aW9uTmFtZTtcblxuICAgIGNvbnN0IGdldFNjaGVtYXRpY0NvbGxlY3Rpb25zID0gKFxuICAgICAgY29uZmlnU2VjdGlvbjogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCB1bmRlZmluZWQsXG4gICAgKTogU2V0PHN0cmluZz4gfCB1bmRlZmluZWQgPT4ge1xuICAgICAgaWYgKCFjb25maWdTZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHsgc2NoZW1hdGljQ29sbGVjdGlvbnMsIGRlZmF1bHRDb2xsZWN0aW9uIH0gPSBjb25maWdTZWN0aW9uO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc2NoZW1hdGljQ29sbGVjdGlvbnMpKSB7XG4gICAgICAgIHJldHVybiBuZXcgU2V0KHNjaGVtYXRpY0NvbGxlY3Rpb25zLm1hcCgoYykgPT4gcmVzb2x2ZVJlbGF0aXZlQ29sbGVjdGlvbihjKSkpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmYXVsdENvbGxlY3Rpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBuZXcgU2V0KFtyZXNvbHZlUmVsYXRpdmVDb2xsZWN0aW9uKGRlZmF1bHRDb2xsZWN0aW9uKV0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH07XG5cbiAgICBjb25zdCB7IHdvcmtzcGFjZSwgZ2xvYmFsQ29uZmlndXJhdGlvbiB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGlmICh3b3Jrc3BhY2UpIHtcbiAgICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICAgIGlmIChwcm9qZWN0KSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZ2V0U2NoZW1hdGljQ29sbGVjdGlvbnMod29ya3NwYWNlLmdldFByb2plY3RDbGkocHJvamVjdCkpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZSA9XG4gICAgICBnZXRTY2hlbWF0aWNDb2xsZWN0aW9ucyh3b3Jrc3BhY2U/LmdldENsaSgpKSA/P1xuICAgICAgZ2V0U2NoZW1hdGljQ29sbGVjdGlvbnMoZ2xvYmFsQ29uZmlndXJhdGlvbi5nZXRDbGkoKSk7XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBTZXQoW0RFRkFVTFRfU0NIRU1BVElDU19DT0xMRUNUSU9OXSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgcGFyc2VTY2hlbWF0aWNJbmZvKFxuICAgIHNjaGVtYXRpYzogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICApOiBbY29sbGVjdGlvbk5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgc2NoZW1hdGljTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkXSB7XG4gICAgaWYgKHNjaGVtYXRpYz8uaW5jbHVkZXMoJzonKSkge1xuICAgICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHNjaGVtYXRpYy5zcGxpdCgnOicsIDIpO1xuXG4gICAgICByZXR1cm4gW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXTtcbiAgICB9XG5cbiAgICByZXR1cm4gW3VuZGVmaW5lZCwgc2NoZW1hdGljXTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBydW5TY2hlbWF0aWMob3B0aW9uczoge1xuICAgIGV4ZWN1dGlvbk9wdGlvbnM6IFNjaGVtYXRpY3NFeGVjdXRpb25PcHRpb25zO1xuICAgIHNjaGVtYXRpY09wdGlvbnM6IE90aGVyT3B0aW9ucztcbiAgICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICAgIHNjaGVtYXRpY05hbWU6IHN0cmluZztcbiAgfSk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCB7IHNjaGVtYXRpY09wdGlvbnMsIGV4ZWN1dGlvbk9wdGlvbnMsIGNvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lIH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IHdvcmtmbG93ID0gYXdhaXQgdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yRXhlY3V0aW9uKGNvbGxlY3Rpb25OYW1lLCBleGVjdXRpb25PcHRpb25zKTtcblxuICAgIGlmICghc2NoZW1hdGljTmFtZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdzY2hlbWF0aWNOYW1lIGNhbm5vdCBiZSB1bmRlZmluZWQuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgeyB1bnN1YnNjcmliZSwgZmlsZXMgfSA9IHN1YnNjcmliZVRvV29ya2Zsb3cod29ya2Zsb3csIGxvZ2dlcik7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgd29ya2Zsb3dcbiAgICAgICAgLmV4ZWN1dGUoe1xuICAgICAgICAgIGNvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICAgIHNjaGVtYXRpYzogc2NoZW1hdGljTmFtZSxcbiAgICAgICAgICBvcHRpb25zOiBzY2hlbWF0aWNPcHRpb25zLFxuICAgICAgICAgIGxvZ2dlcixcbiAgICAgICAgICBhbGxvd1ByaXZhdGU6IHRoaXMuYWxsb3dQcml2YXRlU2NoZW1hdGljcyxcbiAgICAgICAgfSlcbiAgICAgICAgLnRvUHJvbWlzZSgpO1xuXG4gICAgICBpZiAoIWZpbGVzLnNpemUpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJ05vdGhpbmcgdG8gYmUgZG9uZS4nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGV4ZWN1dGlvbk9wdGlvbnMuZHJ5UnVuKSB7XG4gICAgICAgIGxvZ2dlci53YXJuKGBcXG5OT1RFOiBUaGUgXCItLWRyeS1ydW5cIiBvcHRpb24gbWVhbnMgbm8gY2hhbmdlcyB3ZXJlIG1hZGUuYCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAvLyBJbiBjYXNlIHRoZSB3b3JrZmxvdyB3YXMgbm90IHN1Y2Nlc3NmdWwsIHNob3cgYW4gYXBwcm9wcmlhdGUgZXJyb3IgbWVzc2FnZS5cbiAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbikge1xuICAgICAgICAvLyBcIlNlZSBhYm92ZVwiIGJlY2F1c2Ugd2UgYWxyZWFkeSBwcmludGVkIHRoZSBlcnJvci5cbiAgICAgICAgbG9nZ2VyLmZhdGFsKCdUaGUgU2NoZW1hdGljIHdvcmtmbG93IGZhaWxlZC4gU2VlIGFib3ZlLicpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXNzZXJ0SXNFcnJvcihlcnIpO1xuICAgICAgICBsb2dnZXIuZmF0YWwoZXJyLm1lc3NhZ2UpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gMTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdW5zdWJzY3JpYmUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIHByaXZhdGUgZGVmYXVsdFByb2plY3REZXByZWNhdGlvbldhcm5pbmdTaG93biA9IGZhbHNlO1xuICBwcml2YXRlIGdldFByb2plY3ROYW1lKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UsIGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGlmICghd29ya3NwYWNlKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2plY3ROYW1lID0gZ2V0UHJvamVjdEJ5Q3dkKHdvcmtzcGFjZSk7XG4gICAgaWYgKHByb2plY3ROYW1lKSB7XG4gICAgICByZXR1cm4gcHJvamVjdE5hbWU7XG4gICAgfVxuXG4gICAgY29uc3QgZGVmYXVsdFByb2plY3ROYW1lID0gd29ya3NwYWNlLmV4dGVuc2lvbnNbJ2RlZmF1bHRQcm9qZWN0J107XG4gICAgaWYgKHR5cGVvZiBkZWZhdWx0UHJvamVjdE5hbWUgPT09ICdzdHJpbmcnICYmIGRlZmF1bHRQcm9qZWN0TmFtZSkge1xuICAgICAgaWYgKCF0aGlzLmRlZmF1bHRQcm9qZWN0RGVwcmVjYXRpb25XYXJuaW5nU2hvd24pIHtcbiAgICAgICAgbG9nZ2VyLndhcm4odGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgIERFUFJFQ0FURUQ6IFRoZSAnZGVmYXVsdFByb2plY3QnIHdvcmtzcGFjZSBvcHRpb24gaGFzIGJlZW4gZGVwcmVjYXRlZC5cbiAgICAgICAgICAgICBUaGUgcHJvamVjdCB0byB1c2Ugd2lsbCBiZSBkZXRlcm1pbmVkIGZyb20gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuXG4gICAgICAgICAgIGApO1xuXG4gICAgICAgIHRoaXMuZGVmYXVsdFByb2plY3REZXByZWNhdGlvbldhcm5pbmdTaG93biA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkZWZhdWx0UHJvamVjdE5hbWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVzb2x2ZVBhdGhzKGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UsIHJvb3QgfSA9IHRoaXMuY29udGV4dDtcblxuICAgIHJldHVybiB3b3Jrc3BhY2VcbiAgICAgID8gLy8gV29ya3NwYWNlXG4gICAgICAgIGNvbGxlY3Rpb25OYW1lID09PSBERUZBVUxUX1NDSEVNQVRJQ1NfQ09MTEVDVElPTlxuICAgICAgICA/IC8vIEZhdm9yIF9fZGlybmFtZSBmb3IgQHNjaGVtYXRpY3MvYW5ndWxhciB0byB1c2UgdGhlIGJ1aWxkLWluIHZlcnNpb25cbiAgICAgICAgICBbX19kaXJuYW1lLCBwcm9jZXNzLmN3ZCgpLCByb290XVxuICAgICAgICA6IFtwcm9jZXNzLmN3ZCgpLCByb290LCBfX2Rpcm5hbWVdXG4gICAgICA6IC8vIEdsb2JhbFxuICAgICAgICBbX19kaXJuYW1lLCBwcm9jZXNzLmN3ZCgpXTtcbiAgfVxufVxuIl19