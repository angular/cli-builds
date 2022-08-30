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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFnRztBQUNoRywyREFBZ0c7QUFDaEcsNERBSTBDO0FBRTFDLCtCQUF5QztBQUV6QyxnREFBNEU7QUFDNUUsOENBQW1EO0FBQ25ELGtEQUErQztBQUMvQywwQ0FBeUM7QUFDekMscURBTTBCO0FBQzFCLHlEQUEyRTtBQUMzRSw2RUFBd0U7QUFDeEUsdUVBQXFFO0FBRXhELFFBQUEsNkJBQTZCLEdBQUcscUJBQXFCLENBQUM7QUFhbkUsTUFBc0IsdUJBQ3BCLFNBQVEsOEJBQW9DO0lBRDlDOztRQUlXLFVBQUssR0FBRyw2QkFBWSxDQUFDLEVBQUUsQ0FBQztRQUNkLDJCQUFzQixHQUFZLEtBQUssQ0FBQztRQUMvQiwwQkFBcUIsR0FBRyxLQUFLLENBQUM7UUErVGxELDBDQUFxQyxHQUFHLEtBQUssQ0FBQztJQXlDeEQsQ0FBQztJQXRXQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVU7UUFDdEIsT0FBTyxJQUFJO2FBQ1IsTUFBTSxDQUFDLGFBQWEsRUFBRTtZQUNyQixRQUFRLEVBQUUsbUNBQW1DO1lBQzdDLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDZCxDQUFDO2FBQ0QsTUFBTSxDQUFDLFNBQVMsRUFBRTtZQUNqQixRQUFRLEVBQUUsK0RBQStEO1lBQ3pFLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDO2FBQ0QsTUFBTSxDQUFDLFVBQVUsRUFBRTtZQUNsQixRQUFRLEVBQUUsK0RBQStE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QUFJLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FBQTs7O1lBR3BCLENBQUMsQ0FBQztnQkFFTixJQUFJLENBQUMscUNBQXFDLEdBQUcsSUFBSSxDQUFDO2FBQ25EO1lBRUQsT0FBTyxrQkFBa0IsQ0FBQztTQUMzQjtRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFFTyxlQUFlLENBQUMsY0FBc0I7UUFDNUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBRXpDLE9BQU8sU0FBUztZQUNkLENBQUMsQ0FBQyxZQUFZO2dCQUNaLGNBQWMsS0FBSyxxQ0FBNkI7b0JBQ2hELENBQUMsQ0FBQyxzRUFBc0U7d0JBQ3RFLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUM7b0JBQ2xDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDO1lBQ3BDLENBQUMsQ0FBQyxTQUFTO2dCQUNULENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7Q0FDRjtBQTdUQztJQUFDLGlCQUFPOzs7b0NBQ3lELG9CQUFZOzRFQUs1RTtBQUdlO0lBRGYsaUJBQU87Ozs7OEVBNEpQO0FBR2U7SUFEZixpQkFBTzs7OztzRUE0Q1A7QUFuUUgsMERBOFdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IG5vcm1hbGl6ZSBhcyBkZXZraXROb3JtYWxpemUsIGlzSnNvbk9iamVjdCwgc2NoZW1hLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQ29sbGVjdGlvbiwgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24sIGZvcm1hdHMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQge1xuICBGaWxlU3lzdGVtQ29sbGVjdGlvbkRlc2NyaXB0aW9uLFxuICBGaWxlU3lzdGVtU2NoZW1hdGljRGVzY3JpcHRpb24sXG4gIE5vZGVXb3JrZmxvdyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHR5cGUgeyBDaGVja2JveFF1ZXN0aW9uLCBRdWVzdGlvbiB9IGZyb20gJ2lucXVpcmVyJztcbmltcG9ydCB7IHJlbGF0aXZlLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgZ2V0UHJvamVjdEJ5Q3dkLCBnZXRTY2hlbWF0aWNEZWZhdWx0cyB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgYXNzZXJ0SXNFcnJvciB9IGZyb20gJy4uL3V0aWxpdGllcy9lcnJvcic7XG5pbXBvcnQgeyBtZW1vaXplIH0gZnJvbSAnLi4vdXRpbGl0aWVzL21lbW9pemUnO1xuaW1wb3J0IHsgaXNUVFkgfSBmcm9tICcuLi91dGlsaXRpZXMvdHR5JztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGUsXG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgQ29tbWFuZFNjb3BlLFxuICBPcHRpb25zLFxuICBPdGhlck9wdGlvbnMsXG59IGZyb20gJy4vY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgT3B0aW9uLCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMgfSBmcm9tICcuL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5pbXBvcnQgeyBTY2hlbWF0aWNFbmdpbmVIb3N0IH0gZnJvbSAnLi91dGlsaXRpZXMvc2NoZW1hdGljLWVuZ2luZS1ob3N0JztcbmltcG9ydCB7IHN1YnNjcmliZVRvV29ya2Zsb3cgfSBmcm9tICcuL3V0aWxpdGllcy9zY2hlbWF0aWMtd29ya2Zsb3cnO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TQ0hFTUFUSUNTX0NPTExFQ1RJT04gPSAnQHNjaGVtYXRpY3MvYW5ndWxhcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2NoZW1hdGljc0NvbW1hbmRBcmdzIHtcbiAgaW50ZXJhY3RpdmU6IGJvb2xlYW47XG4gIGZvcmNlOiBib29sZWFuO1xuICAnZHJ5LXJ1bic6IGJvb2xlYW47XG4gIGRlZmF1bHRzOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNjaGVtYXRpY3NFeGVjdXRpb25PcHRpb25zIGV4dGVuZHMgT3B0aW9uczxTY2hlbWF0aWNzQ29tbWFuZEFyZ3M+IHtcbiAgcGFja2FnZVJlZ2lzdHJ5Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBDb21tYW5kTW9kdWxlPFNjaGVtYXRpY3NDb21tYW5kQXJncz5cbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248U2NoZW1hdGljc0NvbW1hbmRBcmdzPlxue1xuICBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5JbjtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGFsbG93UHJpdmF0ZVNjaGVtYXRpY3M6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIHJlYWRvbmx5IHNob3VsZFJlcG9ydEFuYWx5dGljcyA9IGZhbHNlO1xuXG4gIGFzeW5jIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxTY2hlbWF0aWNzQ29tbWFuZEFyZ3M+PiB7XG4gICAgcmV0dXJuIGFyZ3ZcbiAgICAgIC5vcHRpb24oJ2ludGVyYWN0aXZlJywge1xuICAgICAgICBkZXNjcmliZTogJ0VuYWJsZSBpbnRlcmFjdGl2ZSBpbnB1dCBwcm9tcHRzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdkcnktcnVuJywge1xuICAgICAgICBkZXNjcmliZTogJ1J1biB0aHJvdWdoIGFuZCByZXBvcnRzIGFjdGl2aXR5IHdpdGhvdXQgd3JpdGluZyBvdXQgcmVzdWx0cy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2RlZmF1bHRzJywge1xuICAgICAgICBkZXNjcmliZTogJ0Rpc2FibGUgaW50ZXJhY3RpdmUgaW5wdXQgcHJvbXB0cyBmb3Igb3B0aW9ucyB3aXRoIGEgZGVmYXVsdC4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2ZvcmNlJywge1xuICAgICAgICBkZXNjcmliZTogJ0ZvcmNlIG92ZXJ3cml0aW5nIG9mIGV4aXN0aW5nIGZpbGVzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLnN0cmljdCgpO1xuICB9XG5cbiAgLyoqIEdldCBzY2hlbWF0aWMgc2NoZW1hIG9wdGlvbnMuKi9cbiAgcHJvdGVjdGVkIGFzeW5jIGdldFNjaGVtYXRpY09wdGlvbnMoXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbjxGaWxlU3lzdGVtQ29sbGVjdGlvbkRlc2NyaXB0aW9uLCBGaWxlU3lzdGVtU2NoZW1hdGljRGVzY3JpcHRpb24+LFxuICAgIHNjaGVtYXRpY05hbWU6IHN0cmluZyxcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICApOiBQcm9taXNlPE9wdGlvbltdPiB7XG4gICAgY29uc3Qgc2NoZW1hdGljID0gY29sbGVjdGlvbi5jcmVhdGVTY2hlbWF0aWMoc2NoZW1hdGljTmFtZSwgdHJ1ZSk7XG4gICAgY29uc3QgeyBzY2hlbWFKc29uIH0gPSBzY2hlbWF0aWMuZGVzY3JpcHRpb247XG5cbiAgICBpZiAoIXNjaGVtYUpzb24pIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKHdvcmtmbG93LnJlZ2lzdHJ5LCBzY2hlbWFKc29uKTtcbiAgfVxuXG4gIEBtZW1vaXplXG4gIHByb3RlY3RlZCBnZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZTogc3RyaW5nKTogTm9kZVdvcmtmbG93IHtcbiAgICByZXR1cm4gbmV3IE5vZGVXb3JrZmxvdyh0aGlzLmNvbnRleHQucm9vdCwge1xuICAgICAgcmVzb2x2ZVBhdGhzOiB0aGlzLmdldFJlc29sdmVQYXRocyhjb2xsZWN0aW9uTmFtZSksXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KTtcbiAgfVxuXG4gIEBtZW1vaXplXG4gIHByb3RlY3RlZCBhc3luYyBnZXRPckNyZWF0ZVdvcmtmbG93Rm9yRXhlY3V0aW9uKFxuICAgIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcsXG4gICAgb3B0aW9uczogU2NoZW1hdGljc0V4ZWN1dGlvbk9wdGlvbnMsXG4gICk6IFByb21pc2U8Tm9kZVdvcmtmbG93PiB7XG4gICAgY29uc3QgeyBsb2dnZXIsIHJvb3QsIHBhY2thZ2VNYW5hZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgeyBmb3JjZSwgZHJ5UnVuLCBwYWNrYWdlUmVnaXN0cnkgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IG5ldyBOb2RlV29ya2Zsb3cocm9vdCwge1xuICAgICAgZm9yY2UsXG4gICAgICBkcnlSdW4sXG4gICAgICBwYWNrYWdlTWFuYWdlcjogcGFja2FnZU1hbmFnZXIubmFtZSxcbiAgICAgIC8vIEEgc2NoZW1hIHJlZ2lzdHJ5IGlzIHJlcXVpcmVkIHRvIGFsbG93IGN1c3RvbWl6aW5nIGFkZFVuZGVmaW5lZERlZmF1bHRzXG4gICAgICByZWdpc3RyeTogbmV3IHNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoZm9ybWF0cy5zdGFuZGFyZEZvcm1hdHMpLFxuICAgICAgcGFja2FnZVJlZ2lzdHJ5LFxuICAgICAgcmVzb2x2ZVBhdGhzOiB0aGlzLmdldFJlc29sdmVQYXRocyhjb2xsZWN0aW9uTmFtZSksXG4gICAgICBzY2hlbWFWYWxpZGF0aW9uOiB0cnVlLFxuICAgICAgb3B0aW9uVHJhbnNmb3JtczogW1xuICAgICAgICAvLyBBZGQgY29uZmlndXJhdGlvbiBmaWxlIGRlZmF1bHRzXG4gICAgICAgIGFzeW5jIChzY2hlbWF0aWMsIGN1cnJlbnQpID0+IHtcbiAgICAgICAgICBjb25zdCBwcm9qZWN0TmFtZSA9XG4gICAgICAgICAgICB0eXBlb2YgY3VycmVudD8ucHJvamVjdCA9PT0gJ3N0cmluZycgPyBjdXJyZW50LnByb2plY3QgOiB0aGlzLmdldFByb2plY3ROYW1lKCk7XG5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4uKGF3YWl0IGdldFNjaGVtYXRpY0RlZmF1bHRzKHNjaGVtYXRpYy5jb2xsZWN0aW9uLm5hbWUsIHNjaGVtYXRpYy5uYW1lLCBwcm9qZWN0TmFtZSkpLFxuICAgICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGVuZ2luZUhvc3RDcmVhdG9yOiAob3B0aW9ucykgPT4gbmV3IFNjaGVtYXRpY0VuZ2luZUhvc3Qob3B0aW9ucy5yZXNvbHZlUGF0aHMpLFxuICAgIH0pO1xuXG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkUG9zdFRyYW5zZm9ybShzY2hlbWEudHJhbnNmb3Jtcy5hZGRVbmRlZmluZWREZWZhdWx0cyk7XG4gICAgd29ya2Zsb3cucmVnaXN0cnkudXNlWERlcHJlY2F0ZWRQcm92aWRlcigobXNnKSA9PiBsb2dnZXIud2Fybihtc2cpKTtcbiAgICB3b3JrZmxvdy5yZWdpc3RyeS5hZGRTbWFydERlZmF1bHRQcm92aWRlcigncHJvamVjdE5hbWUnLCAoKSA9PiB0aGlzLmdldFByb2plY3ROYW1lKCkpO1xuXG4gICAgY29uc3Qgd29ya2luZ0RpciA9IGRldmtpdE5vcm1hbGl6ZShyZWxhdGl2ZSh0aGlzLmNvbnRleHQucm9vdCwgcHJvY2Vzcy5jd2QoKSkpO1xuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFNtYXJ0RGVmYXVsdFByb3ZpZGVyKCd3b3JraW5nRGlyZWN0b3J5JywgKCkgPT5cbiAgICAgIHdvcmtpbmdEaXIgPT09ICcnID8gdW5kZWZpbmVkIDogd29ya2luZ0RpcixcbiAgICApO1xuXG4gICAgbGV0IHNob3VsZFJlcG9ydEFuYWx5dGljcyA9IHRydWU7XG5cbiAgICB3b3JrZmxvdy5lbmdpbmVIb3N0LnJlZ2lzdGVyT3B0aW9uc1RyYW5zZm9ybShhc3luYyAoc2NoZW1hdGljLCBvcHRpb25zKSA9PiB7XG4gICAgICBpZiAoc2hvdWxkUmVwb3J0QW5hbHl0aWNzKSB7XG4gICAgICAgIHNob3VsZFJlcG9ydEFuYWx5dGljcyA9IGZhbHNlO1xuICAgICAgICAvLyBuZyBnZW5lcmF0ZSBsaWIgLT4gbmcgZ2VuZXJhdGVcbiAgICAgICAgY29uc3QgY29tbWFuZE5hbWUgPSB0aGlzLmNvbW1hbmQ/LnNwbGl0KCcgJywgMSlbMF07XG5cbiAgICAgICAgYXdhaXQgdGhpcy5yZXBvcnRBbmFseXRpY3Mob3B0aW9ucyBhcyB7fSwgW1xuICAgICAgICAgIGNvbW1hbmROYW1lLFxuICAgICAgICAgIHNjaGVtYXRpYy5jb2xsZWN0aW9uLm5hbWUucmVwbGFjZSgvXFwvL2csICdfJyksXG4gICAgICAgICAgc2NoZW1hdGljLm5hbWUucmVwbGFjZSgvXFwvL2csICdfJyksXG4gICAgICAgIF0pO1xuICAgICAgfVxuXG4gICAgICAvLyBUT0RPOiBUaGUgYmVsb3cgc2hvdWxkIGJlIHJlbW92ZWQgaW4gdmVyc2lvbiAxNSB3aGVuIHdlIGNoYW5nZSAxUCBzY2hlbWF0aWNzIHRvIHVzZSB0aGUgYHdvcmtpbmdEaXJlY3Rvcnkgc21hcnQgZGVmYXVsdGAuXG4gICAgICAvLyBIYW5kbGUgYFwiZm9ybWF0XCI6IFwicGF0aFwiYCBvcHRpb25zLlxuICAgICAgY29uc3Qgc2NoZW1hID0gc2NoZW1hdGljPy5zY2hlbWFKc29uO1xuICAgICAgaWYgKCFvcHRpb25zIHx8ICFzY2hlbWEgfHwgIWlzSnNvbk9iamVjdChzY2hlbWEpKSB7XG4gICAgICAgIHJldHVybiBvcHRpb25zO1xuICAgICAgfVxuXG4gICAgICBpZiAoISgncGF0aCcgaW4gb3B0aW9ucyAmJiAob3B0aW9ucyBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbJ3BhdGgnXSA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICAgIH1cblxuICAgICAgY29uc3QgcHJvcGVydGllcyA9IHNjaGVtYT8uWydwcm9wZXJ0aWVzJ107XG4gICAgICBpZiAoIXByb3BlcnRpZXMgfHwgIWlzSnNvbk9iamVjdChwcm9wZXJ0aWVzKSkge1xuICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICAgIH1cblxuICAgICAgY29uc3QgcHJvcGVydHkgPSBwcm9wZXJ0aWVzWydwYXRoJ107XG4gICAgICBpZiAoIXByb3BlcnR5IHx8ICFpc0pzb25PYmplY3QocHJvcGVydHkpKSB7XG4gICAgICAgIHJldHVybiBvcHRpb25zO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb3B0aW9ucztcbiAgICB9KTtcblxuICAgIGlmIChvcHRpb25zLmludGVyYWN0aXZlICE9PSBmYWxzZSAmJiBpc1RUWSgpKSB7XG4gICAgICB3b3JrZmxvdy5yZWdpc3RyeS51c2VQcm9tcHRQcm92aWRlcihhc3luYyAoZGVmaW5pdGlvbnM6IEFycmF5PHNjaGVtYS5Qcm9tcHREZWZpbml0aW9uPikgPT4ge1xuICAgICAgICBjb25zdCBxdWVzdGlvbnMgPSBkZWZpbml0aW9uc1xuICAgICAgICAgIC5maWx0ZXIoKGRlZmluaXRpb24pID0+ICFvcHRpb25zLmRlZmF1bHRzIHx8IGRlZmluaXRpb24uZGVmYXVsdCA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgIC5tYXAoKGRlZmluaXRpb24pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0aW9uOiBRdWVzdGlvbiA9IHtcbiAgICAgICAgICAgICAgbmFtZTogZGVmaW5pdGlvbi5pZCxcbiAgICAgICAgICAgICAgbWVzc2FnZTogZGVmaW5pdGlvbi5tZXNzYWdlLFxuICAgICAgICAgICAgICBkZWZhdWx0OiBkZWZpbml0aW9uLmRlZmF1bHQsXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0b3IgPSBkZWZpbml0aW9uLnZhbGlkYXRvcjtcbiAgICAgICAgICAgIGlmICh2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgICAgcXVlc3Rpb24udmFsaWRhdGUgPSAoaW5wdXQpID0+IHZhbGlkYXRvcihpbnB1dCk7XG5cbiAgICAgICAgICAgICAgLy8gRmlsdGVyIGFsbG93cyB0cmFuc2Zvcm1hdGlvbiBvZiB0aGUgdmFsdWUgcHJpb3IgdG8gdmFsaWRhdGlvblxuICAgICAgICAgICAgICBxdWVzdGlvbi5maWx0ZXIgPSBhc3luYyAoaW5wdXQpID0+IHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHR5cGUgb2YgZGVmaW5pdGlvbi5wcm9wZXJ0eVR5cGVzKSB7XG4gICAgICAgICAgICAgICAgICBsZXQgdmFsdWU7XG4gICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IFN0cmluZyhpbnB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ludGVnZXInOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gTnVtYmVyKGlucHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGlucHV0O1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gQ2FuIGJlIGEgc3RyaW5nIGlmIHZhbGlkYXRpb24gZmFpbHNcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGlzVmFsaWQgPSAoYXdhaXQgdmFsaWRhdG9yKHZhbHVlKSkgPT09IHRydWU7XG4gICAgICAgICAgICAgICAgICBpZiAoaXNWYWxpZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0O1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzd2l0Y2ggKGRlZmluaXRpb24udHlwZSkge1xuICAgICAgICAgICAgICBjYXNlICdjb25maXJtYXRpb24nOlxuICAgICAgICAgICAgICAgIHF1ZXN0aW9uLnR5cGUgPSAnY29uZmlybSc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2xpc3QnOlxuICAgICAgICAgICAgICAgIHF1ZXN0aW9uLnR5cGUgPSBkZWZpbml0aW9uLm11bHRpc2VsZWN0ID8gJ2NoZWNrYm94JyA6ICdsaXN0JztcbiAgICAgICAgICAgICAgICAocXVlc3Rpb24gYXMgQ2hlY2tib3hRdWVzdGlvbikuY2hvaWNlcyA9IGRlZmluaXRpb24uaXRlbXM/Lm1hcCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBpdGVtID09ICdzdHJpbmcnXG4gICAgICAgICAgICAgICAgICAgID8gaXRlbVxuICAgICAgICAgICAgICAgICAgICA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubGFiZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHF1ZXN0aW9uLnR5cGUgPSBkZWZpbml0aW9uLnR5cGU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBxdWVzdGlvbjtcbiAgICAgICAgICB9KTtcblxuICAgICAgICBpZiAocXVlc3Rpb25zLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IHsgcHJvbXB0IH0gPSBhd2FpdCBpbXBvcnQoJ2lucXVpcmVyJyk7XG5cbiAgICAgICAgICByZXR1cm4gcHJvbXB0KHF1ZXN0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gd29ya2Zsb3c7XG4gIH1cblxuICBAbWVtb2l6ZVxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0U2NoZW1hdGljQ29sbGVjdGlvbnMoKTogUHJvbWlzZTxTZXQ8c3RyaW5nPj4ge1xuICAgIC8vIFJlc29sdmUgcmVsYXRpdmUgY29sbGVjdGlvbnMgZnJvbSB0aGUgbG9jYXRpb24gb2YgYGFuZ3VsYXIuanNvbmBcbiAgICBjb25zdCByZXNvbHZlUmVsYXRpdmVDb2xsZWN0aW9uID0gKGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcpID0+XG4gICAgICBjb2xsZWN0aW9uTmFtZS5jaGFyQXQoMCkgPT09ICcuJ1xuICAgICAgICA/IHJlc29sdmUodGhpcy5jb250ZXh0LnJvb3QsIGNvbGxlY3Rpb25OYW1lKVxuICAgICAgICA6IGNvbGxlY3Rpb25OYW1lO1xuXG4gICAgY29uc3QgZ2V0U2NoZW1hdGljQ29sbGVjdGlvbnMgPSAoXG4gICAgICBjb25maWdTZWN0aW9uOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZCxcbiAgICApOiBTZXQ8c3RyaW5nPiB8IHVuZGVmaW5lZCA9PiB7XG4gICAgICBpZiAoIWNvbmZpZ1NlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgeyBzY2hlbWF0aWNDb2xsZWN0aW9ucywgZGVmYXVsdENvbGxlY3Rpb24gfSA9IGNvbmZpZ1NlY3Rpb247XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShzY2hlbWF0aWNDb2xsZWN0aW9ucykpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTZXQoc2NoZW1hdGljQ29sbGVjdGlvbnMubWFwKChjKSA9PiByZXNvbHZlUmVsYXRpdmVDb2xsZWN0aW9uKGMpKSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZhdWx0Q29sbGVjdGlvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTZXQoW3Jlc29sdmVSZWxhdGl2ZUNvbGxlY3Rpb24oZGVmYXVsdENvbGxlY3Rpb24pXSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfTtcblxuICAgIGNvbnN0IHsgd29ya3NwYWNlLCBnbG9iYWxDb25maWd1cmF0aW9uIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgaWYgKHdvcmtzcGFjZSkge1xuICAgICAgY29uc3QgcHJvamVjdCA9IGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2UpO1xuICAgICAgaWYgKHByb2plY3QpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBnZXRTY2hlbWF0aWNDb2xsZWN0aW9ucyh3b3Jrc3BhY2UuZ2V0UHJvamVjdENsaShwcm9qZWN0KSk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlID1cbiAgICAgIGdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKHdvcmtzcGFjZT8uZ2V0Q2xpKCkpID8/XG4gICAgICBnZXRTY2hlbWF0aWNDb2xsZWN0aW9ucyhnbG9iYWxDb25maWd1cmF0aW9uLmdldENsaSgpKTtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFNldChbREVGQVVMVF9TQ0hFTUFUSUNTX0NPTExFQ1RJT05dKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwYXJzZVNjaGVtYXRpY0luZm8oXG4gICAgc2NoZW1hdGljOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICk6IFtjb2xsZWN0aW9uTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBzY2hlbWF0aWNOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWRdIHtcbiAgICBpZiAoc2NoZW1hdGljPy5pbmNsdWRlcygnOicpKSB7XG4gICAgICBjb25zdCBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gc2NoZW1hdGljLnNwbGl0KCc6JywgMik7XG5cbiAgICAgIHJldHVybiBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdO1xuICAgIH1cblxuICAgIHJldHVybiBbdW5kZWZpbmVkLCBzY2hlbWF0aWNdO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1blNjaGVtYXRpYyhvcHRpb25zOiB7XG4gICAgZXhlY3V0aW9uT3B0aW9uczogU2NoZW1hdGljc0V4ZWN1dGlvbk9wdGlvbnM7XG4gICAgc2NoZW1hdGljT3B0aW9uczogT3RoZXJPcHRpb25zO1xuICAgIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmc7XG4gICAgc2NoZW1hdGljTmFtZTogc3RyaW5nO1xuICB9KTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHsgc2NoZW1hdGljT3B0aW9ucywgZXhlY3V0aW9uT3B0aW9ucywgY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWUgfSA9IG9wdGlvbnM7XG4gICAgY29uc3Qgd29ya2Zsb3cgPSBhd2FpdCB0aGlzLmdldE9yQ3JlYXRlV29ya2Zsb3dGb3JFeGVjdXRpb24oY29sbGVjdGlvbk5hbWUsIGV4ZWN1dGlvbk9wdGlvbnMpO1xuXG4gICAgaWYgKCFzY2hlbWF0aWNOYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3NjaGVtYXRpY05hbWUgY2Fubm90IGJlIHVuZGVmaW5lZC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCB7IHVuc3Vic2NyaWJlLCBmaWxlcyB9ID0gc3Vic2NyaWJlVG9Xb3JrZmxvdyh3b3JrZmxvdywgbG9nZ2VyKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB3b3JrZmxvd1xuICAgICAgICAuZXhlY3V0ZSh7XG4gICAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgICAgc2NoZW1hdGljOiBzY2hlbWF0aWNOYW1lLFxuICAgICAgICAgIG9wdGlvbnM6IHNjaGVtYXRpY09wdGlvbnMsXG4gICAgICAgICAgbG9nZ2VyLFxuICAgICAgICAgIGFsbG93UHJpdmF0ZTogdGhpcy5hbGxvd1ByaXZhdGVTY2hlbWF0aWNzLFxuICAgICAgICB9KVxuICAgICAgICAudG9Qcm9taXNlKCk7XG5cbiAgICAgIGlmICghZmlsZXMuc2l6ZSkge1xuICAgICAgICBsb2dnZXIuaW5mbygnTm90aGluZyB0byBiZSBkb25lLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXhlY3V0aW9uT3B0aW9ucy5kcnlSdW4pIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oYFxcbk5PVEU6IFRoZSBcIi0tZHJ5LXJ1blwiIG9wdGlvbiBtZWFucyBubyBjaGFuZ2VzIHdlcmUgbWFkZS5gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIEluIGNhc2UgdGhlIHdvcmtmbG93IHdhcyBub3Qgc3VjY2Vzc2Z1bCwgc2hvdyBhbiBhcHByb3ByaWF0ZSBlcnJvciBtZXNzYWdlLlxuICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uKSB7XG4gICAgICAgIC8vIFwiU2VlIGFib3ZlXCIgYmVjYXVzZSB3ZSBhbHJlYWR5IHByaW50ZWQgdGhlIGVycm9yLlxuICAgICAgICBsb2dnZXIuZmF0YWwoJ1RoZSBTY2hlbWF0aWMgd29ya2Zsb3cgZmFpbGVkLiBTZWUgYWJvdmUuJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhc3NlcnRJc0Vycm9yKGVycik7XG4gICAgICAgIGxvZ2dlci5mYXRhbChlcnIubWVzc2FnZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB1bnN1YnNjcmliZSgpO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgcHJpdmF0ZSBkZWZhdWx0UHJvamVjdERlcHJlY2F0aW9uV2FybmluZ1Nob3duID0gZmFsc2U7XG4gIHByaXZhdGUgZ2V0UHJvamVjdE5hbWUoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSwgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgaWYgKCF3b3Jrc3BhY2UpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvamVjdE5hbWUgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdE5hbWUpIHtcbiAgICAgIHJldHVybiBwcm9qZWN0TmFtZTtcbiAgICB9XG5cbiAgICBjb25zdCBkZWZhdWx0UHJvamVjdE5hbWUgPSB3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snZGVmYXVsdFByb2plY3QnXTtcbiAgICBpZiAodHlwZW9mIGRlZmF1bHRQcm9qZWN0TmFtZSA9PT0gJ3N0cmluZycgJiYgZGVmYXVsdFByb2plY3ROYW1lKSB7XG4gICAgICBpZiAoIXRoaXMuZGVmYXVsdFByb2plY3REZXByZWNhdGlvbldhcm5pbmdTaG93bikge1xuICAgICAgICBsb2dnZXIud2Fybih0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICAgREVQUkVDQVRFRDogVGhlICdkZWZhdWx0UHJvamVjdCcgd29ya3NwYWNlIG9wdGlvbiBoYXMgYmVlbiBkZXByZWNhdGVkLlxuICAgICAgICAgICAgIFRoZSBwcm9qZWN0IHRvIHVzZSB3aWxsIGJlIGRldGVybWluZWQgZnJvbSB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeS5cbiAgICAgICAgICAgYCk7XG5cbiAgICAgICAgdGhpcy5kZWZhdWx0UHJvamVjdERlcHJlY2F0aW9uV2FybmluZ1Nob3duID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRlZmF1bHRQcm9qZWN0TmFtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZXNvbHZlUGF0aHMoY29sbGVjdGlvbk5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSwgcm9vdCB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgcmV0dXJuIHdvcmtzcGFjZVxuICAgICAgPyAvLyBXb3Jrc3BhY2VcbiAgICAgICAgY29sbGVjdGlvbk5hbWUgPT09IERFRkFVTFRfU0NIRU1BVElDU19DT0xMRUNUSU9OXG4gICAgICAgID8gLy8gRmF2b3IgX19kaXJuYW1lIGZvciBAc2NoZW1hdGljcy9hbmd1bGFyIHRvIHVzZSB0aGUgYnVpbGQtaW4gdmVyc2lvblxuICAgICAgICAgIFtfX2Rpcm5hbWUsIHByb2Nlc3MuY3dkKCksIHJvb3RdXG4gICAgICAgIDogW3Byb2Nlc3MuY3dkKCksIHJvb3QsIF9fZGlybmFtZV1cbiAgICAgIDogLy8gR2xvYmFsXG4gICAgICAgIFtfX2Rpcm5hbWUsIHByb2Nlc3MuY3dkKCldO1xuICB9XG59XG4iXX0=