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
exports.SchematicsCommandModule = void 0;
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
const DEFAULT_SCHEMATICS_COLLECTION = '@schematics/angular';
class SchematicsCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.allowPrivateSchematics = false;
        this.shouldReportAnalytics = false;
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
        if (this._workflowForBuilder) {
            return this._workflowForBuilder;
        }
        return (this._workflowForBuilder = new tools_1.NodeWorkflow(this.context.root, {
            resolvePaths: this.getResolvePaths(collectionName),
            engineHostCreator: (options) => new schematic_engine_host_1.SchematicEngineHost(options.resolvePaths),
        }));
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
    async getDefaultSchematicCollection() {
        if (this._defaultSchematicCollection) {
            return this._defaultSchematicCollection;
        }
        let workspace = await (0, config_1.getWorkspace)('local');
        if (workspace) {
            const project = (0, config_1.getProjectByCwd)(workspace);
            if (project) {
                const value = workspace.getProjectCli(project)['defaultCollection'];
                if (typeof value == 'string') {
                    return (this._defaultSchematicCollection = value);
                }
            }
            const value = workspace.getCli()['defaultCollection'];
            if (typeof value === 'string') {
                return (this._defaultSchematicCollection = value);
            }
        }
        workspace = await (0, config_1.getWorkspace)('global');
        const value = workspace === null || workspace === void 0 ? void 0 : workspace.getCli()['defaultCollection'];
        if (typeof value === 'string') {
            return (this._defaultSchematicCollection = value);
        }
        return (this._defaultSchematicCollection = DEFAULT_SCHEMATICS_COLLECTION);
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
                return defaultProjectName;
            }
        }
        return undefined;
    }
    getResolvePaths(collectionName) {
        const { workspace, root } = this.context;
        return workspace
            ? // Workspace
                collectionName === DEFAULT_SCHEMATICS_COLLECTION
                    ? // Favor __dirname for @schematics/angular to use the build-in version
                        [__dirname, process.cwd(), root]
                    : [process.cwd(), root, __dirname]
            : // Global
                [__dirname, process.cwd()];
    }
}
exports.SchematicsCommandModule = SchematicsCommandModule;
SchematicsCommandModule.scope = command_module_1.CommandScope.In;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7QUFFSCwrQ0FBb0Q7QUFDcEQsMkRBQWdHO0FBQ2hHLDREQUkwQztBQUMxQyx3REFBZ0M7QUFFaEMsZ0RBSzZCO0FBQzdCLDBDQUF5QztBQUN6QyxxREFNMEI7QUFDMUIseURBQTJFO0FBQzNFLDZFQUF3RTtBQUN4RSx1RUFBcUU7QUFFckUsTUFBTSw2QkFBNkIsR0FBRyxxQkFBcUIsQ0FBQztBQWE1RCxNQUFzQix1QkFDcEIsU0FBUSw4QkFBb0M7SUFEOUM7O1FBS3FCLDJCQUFzQixHQUFZLEtBQUssQ0FBQztRQUMvQiwwQkFBcUIsR0FBRyxLQUFLLENBQUM7SUFpVTVELENBQUM7SUEvVEMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFVO1FBQ3RCLE9BQU8sSUFBSTthQUNSLE1BQU0sQ0FBQyxhQUFhLEVBQUU7WUFDckIsUUFBUSxFQUFFLG1DQUFtQztZQUM3QyxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2QsQ0FBQzthQUNELE1BQU0sQ0FBQyxTQUFTLEVBQUU7WUFDakIsUUFBUSxFQUFFLCtEQUErRDtZQUN6RSxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQzthQUNELE1BQU0sQ0FBQyxVQUFVLEVBQUU7WUFDbEIsUUFBUSxFQUFFLCtEQUErRDtZQUN6RSxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQzthQUNELE1BQU0sQ0FBQyxPQUFPLEVBQUU7WUFDZixRQUFRLEVBQUUsc0NBQXNDO1lBQ2hELElBQUksRUFBRSxTQUFT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QUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUM7WUFDcEMsQ0FBQyxDQUFDLFNBQVM7Z0JBQ1QsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDakMsQ0FBQzs7QUF0VUgsMERBdVVDO0FBblVpQiw2QkFBSyxHQUFHLDZCQUFZLENBQUMsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IHNjaGVtYSwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IENvbGxlY3Rpb24sIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uLCBmb3JtYXRzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHtcbiAgRmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjcmlwdGlvbixcbiAgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2NyaXB0aW9uLFxuICBOb2RlV29ya2Zsb3csXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCBpbnF1aXJlciBmcm9tICdpbnF1aXJlcic7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHtcbiAgZ2V0UHJvamVjdEJ5Q3dkLFxuICBnZXRQcm9qZWN0c0J5UGF0aCxcbiAgZ2V0U2NoZW1hdGljRGVmYXVsdHMsXG4gIGdldFdvcmtzcGFjZSxcbn0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4uL3V0aWxpdGllcy90dHknO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBPcHRpb24sIHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyB9IGZyb20gJy4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYXRpY0VuZ2luZUhvc3QgfSBmcm9tICcuL3V0aWxpdGllcy9zY2hlbWF0aWMtZW5naW5lLWhvc3QnO1xuaW1wb3J0IHsgc3Vic2NyaWJlVG9Xb3JrZmxvdyB9IGZyb20gJy4vdXRpbGl0aWVzL3NjaGVtYXRpYy13b3JrZmxvdyc7XG5cbmNvbnN0IERFRkFVTFRfU0NIRU1BVElDU19DT0xMRUNUSU9OID0gJ0BzY2hlbWF0aWNzL2FuZ3VsYXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNjaGVtYXRpY3NDb21tYW5kQXJncyB7XG4gIGludGVyYWN0aXZlOiBib29sZWFuO1xuICBmb3JjZTogYm9vbGVhbjtcbiAgJ2RyeS1ydW4nOiBib29sZWFuO1xuICBkZWZhdWx0czogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTY2hlbWF0aWNzRXhlY3V0aW9uT3B0aW9ucyBleHRlbmRzIE9wdGlvbnM8U2NoZW1hdGljc0NvbW1hbmRBcmdzPiB7XG4gIHBhY2thZ2VSZWdpc3RyeT86IHN0cmluZztcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgQ29tbWFuZE1vZHVsZTxTY2hlbWF0aWNzQ29tbWFuZEFyZ3M+XG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPFNjaGVtYXRpY3NDb21tYW5kQXJncz5cbntcbiAgc3RhdGljIG92ZXJyaWRlIHNjb3BlID0gQ29tbWFuZFNjb3BlLkluO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgYWxsb3dQcml2YXRlU2NoZW1hdGljczogYm9vbGVhbiA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgcmVhZG9ubHkgc2hvdWxkUmVwb3J0QW5hbHl0aWNzID0gZmFsc2U7XG5cbiAgYXN5bmMgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PFNjaGVtYXRpY3NDb21tYW5kQXJncz4+IHtcbiAgICByZXR1cm4gYXJndlxuICAgICAgLm9wdGlvbignaW50ZXJhY3RpdmUnLCB7XG4gICAgICAgIGRlc2NyaWJlOiAnRW5hYmxlIGludGVyYWN0aXZlIGlucHV0IHByb21wdHMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2RyeS1ydW4nLCB7XG4gICAgICAgIGRlc2NyaWJlOiAnUnVuIHRocm91Z2ggYW5kIHJlcG9ydHMgYWN0aXZpdHkgd2l0aG91dCB3cml0aW5nIG91dCByZXN1bHRzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignZGVmYXVsdHMnLCB7XG4gICAgICAgIGRlc2NyaWJlOiAnRGlzYWJsZSBpbnRlcmFjdGl2ZSBpbnB1dCBwcm9tcHRzIGZvciBvcHRpb25zIHdpdGggYSBkZWZhdWx0LicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignZm9yY2UnLCB7XG4gICAgICAgIGRlc2NyaWJlOiAnRm9yY2Ugb3ZlcndyaXRpbmcgb2YgZXhpc3RpbmcgZmlsZXMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAuc3RyaWN0KCk7XG4gIH1cblxuICAvKiogR2V0IHNjaGVtYXRpYyBzY2hlbWEgb3B0aW9ucy4qL1xuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0U2NoZW1hdGljT3B0aW9ucyhcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uPEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzY3JpcHRpb24sIEZpbGVTeXN0ZW1TY2hlbWF0aWNEZXNjcmlwdGlvbj4sXG4gICAgc2NoZW1hdGljTmFtZTogc3RyaW5nLFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICk6IFByb21pc2U8T3B0aW9uW10+IHtcbiAgICBjb25zdCBzY2hlbWF0aWMgPSBjb2xsZWN0aW9uLmNyZWF0ZVNjaGVtYXRpYyhzY2hlbWF0aWNOYW1lLCB0cnVlKTtcbiAgICBjb25zdCB7IHNjaGVtYUpzb24gfSA9IHNjaGVtYXRpYy5kZXNjcmlwdGlvbjtcblxuICAgIGlmICghc2NoZW1hSnNvbikge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMod29ya2Zsb3cucmVnaXN0cnksIHNjaGVtYUpzb24pO1xuICB9XG5cbiAgcHJpdmF0ZSBfd29ya2Zsb3dGb3JCdWlsZGVyOiBOb2RlV29ya2Zsb3cgfCB1bmRlZmluZWQ7XG4gIHByb3RlY3RlZCBnZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZTogc3RyaW5nKTogTm9kZVdvcmtmbG93IHtcbiAgICBpZiAodGhpcy5fd29ya2Zsb3dGb3JCdWlsZGVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd29ya2Zsb3dGb3JCdWlsZGVyO1xuICAgIH1cblxuICAgIHJldHVybiAodGhpcy5fd29ya2Zsb3dGb3JCdWlsZGVyID0gbmV3IE5vZGVXb3JrZmxvdyh0aGlzLmNvbnRleHQucm9vdCwge1xuICAgICAgcmVzb2x2ZVBhdGhzOiB0aGlzLmdldFJlc29sdmVQYXRocyhjb2xsZWN0aW9uTmFtZSksXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIF93b3JrZmxvd0ZvckV4ZWN1dGlvbjogTm9kZVdvcmtmbG93IHwgdW5kZWZpbmVkO1xuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckV4ZWN1dGlvbihcbiAgICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFNjaGVtYXRpY3NFeGVjdXRpb25PcHRpb25zLFxuICApOiBQcm9taXNlPE5vZGVXb3JrZmxvdz4ge1xuICAgIGlmICh0aGlzLl93b3JrZmxvd0ZvckV4ZWN1dGlvbikge1xuICAgICAgcmV0dXJuIHRoaXMuX3dvcmtmbG93Rm9yRXhlY3V0aW9uO1xuICAgIH1cblxuICAgIGNvbnN0IHsgbG9nZ2VyLCByb290LCBwYWNrYWdlTWFuYWdlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHsgZm9yY2UsIGRyeVJ1biwgcGFja2FnZVJlZ2lzdHJ5IH0gPSBvcHRpb25zO1xuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSBuZXcgTm9kZVdvcmtmbG93KHJvb3QsIHtcbiAgICAgIGZvcmNlLFxuICAgICAgZHJ5UnVuLFxuICAgICAgcGFja2FnZU1hbmFnZXIsXG4gICAgICAvLyBBIHNjaGVtYSByZWdpc3RyeSBpcyByZXF1aXJlZCB0byBhbGxvdyBjdXN0b21pemluZyBhZGRVbmRlZmluZWREZWZhdWx0c1xuICAgICAgcmVnaXN0cnk6IG5ldyBzY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KGZvcm1hdHMuc3RhbmRhcmRGb3JtYXRzKSxcbiAgICAgIHBhY2thZ2VSZWdpc3RyeSxcbiAgICAgIHJlc29sdmVQYXRoczogdGhpcy5nZXRSZXNvbHZlUGF0aHMoY29sbGVjdGlvbk5hbWUpLFxuICAgICAgc2NoZW1hVmFsaWRhdGlvbjogdHJ1ZSxcbiAgICAgIG9wdGlvblRyYW5zZm9ybXM6IFtcbiAgICAgICAgLy8gQWRkIGNvbmZpZ3VyYXRpb24gZmlsZSBkZWZhdWx0c1xuICAgICAgICBhc3luYyAoc2NoZW1hdGljLCBjdXJyZW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgcHJvamVjdE5hbWUgPVxuICAgICAgICAgICAgdHlwZW9mIChjdXJyZW50IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5wcm9qZWN0ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICA/ICgoY3VycmVudCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikucHJvamVjdCBhcyBzdHJpbmcpXG4gICAgICAgICAgICAgIDogdGhpcy5nZXRQcm9qZWN0TmFtZSgpO1xuXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC4uLihhd2FpdCBnZXRTY2hlbWF0aWNEZWZhdWx0cyhzY2hlbWF0aWMuY29sbGVjdGlvbi5uYW1lLCBzY2hlbWF0aWMubmFtZSwgcHJvamVjdE5hbWUpKSxcbiAgICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KTtcblxuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFBvc3RUcmFuc2Zvcm0oc2NoZW1hLnRyYW5zZm9ybXMuYWRkVW5kZWZpbmVkRGVmYXVsdHMpO1xuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFNtYXJ0RGVmYXVsdFByb3ZpZGVyKCdwcm9qZWN0TmFtZScsICgpID0+IHRoaXMuZ2V0UHJvamVjdE5hbWUoKSk7XG4gICAgd29ya2Zsb3cucmVnaXN0cnkudXNlWERlcHJlY2F0ZWRQcm92aWRlcigobXNnKSA9PiBsb2dnZXIud2Fybihtc2cpKTtcblxuICAgIGxldCBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSB0cnVlO1xuICAgIHdvcmtmbG93LmVuZ2luZUhvc3QucmVnaXN0ZXJPcHRpb25zVHJhbnNmb3JtKGFzeW5jIChzY2hlbWF0aWMsIG9wdGlvbnMpID0+IHtcbiAgICAgIGlmIChzaG91bGRSZXBvcnRBbmFseXRpY3MpIHtcbiAgICAgICAgc2hvdWxkUmVwb3J0QW5hbHl0aWNzID0gZmFsc2U7XG4gICAgICAgIC8vIG5nIGdlbmVyYXRlIGxpYiAtPiBuZyBnZW5lcmF0ZVxuICAgICAgICBjb25zdCBjb21tYW5kTmFtZSA9IHRoaXMuY29tbWFuZD8uc3BsaXQoJyAnLCAxKVswXTtcblxuICAgICAgICBhd2FpdCB0aGlzLnJlcG9ydEFuYWx5dGljcyhvcHRpb25zIGFzIHt9LCBbXG4gICAgICAgICAgY29tbWFuZE5hbWUsXG4gICAgICAgICAgc2NoZW1hdGljLmNvbGxlY3Rpb24ubmFtZS5yZXBsYWNlKC9cXC8vZywgJ18nKSxcbiAgICAgICAgICBzY2hlbWF0aWMubmFtZS5yZXBsYWNlKC9cXC8vZywgJ18nKSxcbiAgICAgICAgXSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvcHRpb25zO1xuICAgIH0pO1xuXG4gICAgaWYgKG9wdGlvbnMuaW50ZXJhY3RpdmUgIT09IGZhbHNlICYmIGlzVFRZKCkpIHtcbiAgICAgIHdvcmtmbG93LnJlZ2lzdHJ5LnVzZVByb21wdFByb3ZpZGVyKChkZWZpbml0aW9uczogQXJyYXk8c2NoZW1hLlByb21wdERlZmluaXRpb24+KSA9PiB7XG4gICAgICAgIGNvbnN0IHF1ZXN0aW9uczogaW5xdWlyZXIuUXVlc3Rpb25Db2xsZWN0aW9uID0gZGVmaW5pdGlvbnNcbiAgICAgICAgICAuZmlsdGVyKChkZWZpbml0aW9uKSA9PiAhb3B0aW9ucy5kZWZhdWx0cyB8fCBkZWZpbml0aW9uLmRlZmF1bHQgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAubWFwKChkZWZpbml0aW9uKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdGlvbjogaW5xdWlyZXIuUXVlc3Rpb24gPSB7XG4gICAgICAgICAgICAgIG5hbWU6IGRlZmluaXRpb24uaWQsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IGRlZmluaXRpb24ubWVzc2FnZSxcbiAgICAgICAgICAgICAgZGVmYXVsdDogZGVmaW5pdGlvbi5kZWZhdWx0LFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgdmFsaWRhdG9yID0gZGVmaW5pdGlvbi52YWxpZGF0b3I7XG4gICAgICAgICAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgIHF1ZXN0aW9uLnZhbGlkYXRlID0gKGlucHV0KSA9PiB2YWxpZGF0b3IoaW5wdXQpO1xuXG4gICAgICAgICAgICAgIC8vIEZpbHRlciBhbGxvd3MgdHJhbnNmb3JtYXRpb24gb2YgdGhlIHZhbHVlIHByaW9yIHRvIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgcXVlc3Rpb24uZmlsdGVyID0gYXN5bmMgKGlucHV0KSA9PiB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB0eXBlIG9mIGRlZmluaXRpb24ucHJvcGVydHlUeXBlcykge1xuICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBTdHJpbmcoaW5wdXQpO1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IE51bWJlcihpbnB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBpbnB1dDtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIENhbiBiZSBhIHN0cmluZyBpZiB2YWxpZGF0aW9uIGZhaWxzXG4gICAgICAgICAgICAgICAgICBjb25zdCBpc1ZhbGlkID0gKGF3YWl0IHZhbGlkYXRvcih2YWx1ZSkpID09PSB0cnVlO1xuICAgICAgICAgICAgICAgICAgaWYgKGlzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dDtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3dpdGNoIChkZWZpbml0aW9uLnR5cGUpIHtcbiAgICAgICAgICAgICAgY2FzZSAnY29uZmlybWF0aW9uJzpcbiAgICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gJ2NvbmZpcm0nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdsaXN0JzpcbiAgICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gZGVmaW5pdGlvbi5tdWx0aXNlbGVjdCA/ICdjaGVja2JveCcgOiAnbGlzdCc7XG4gICAgICAgICAgICAgICAgKHF1ZXN0aW9uIGFzIGlucXVpcmVyLkNoZWNrYm94UXVlc3Rpb24pLmNob2ljZXMgPSBkZWZpbml0aW9uLml0ZW1zPy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgaXRlbSA9PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAgICAgICA/IGl0ZW1cbiAgICAgICAgICAgICAgICAgICAgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLmxhYmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBxdWVzdGlvbi50eXBlID0gZGVmaW5pdGlvbi50eXBlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcXVlc3Rpb247XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGlucXVpcmVyLnByb21wdChxdWVzdGlvbnMpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuICh0aGlzLl93b3JrZmxvd0ZvckV4ZWN1dGlvbiA9IHdvcmtmbG93KTtcbiAgfVxuXG4gIHByaXZhdGUgX2RlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHByb3RlY3RlZCBhc3luYyBnZXREZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbigpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmICh0aGlzLl9kZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbikge1xuICAgICAgcmV0dXJuIHRoaXMuX2RlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uO1xuICAgIH1cblxuICAgIGxldCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG5cbiAgICBpZiAod29ya3NwYWNlKSB7XG4gICAgICBjb25zdCBwcm9qZWN0ID0gZ2V0UHJvamVjdEJ5Q3dkKHdvcmtzcGFjZSk7XG4gICAgICBpZiAocHJvamVjdCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHdvcmtzcGFjZS5nZXRQcm9qZWN0Q2xpKHByb2plY3QpWydkZWZhdWx0Q29sbGVjdGlvbiddO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcmV0dXJuICh0aGlzLl9kZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbiA9IHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCB2YWx1ZSA9IHdvcmtzcGFjZS5nZXRDbGkoKVsnZGVmYXVsdENvbGxlY3Rpb24nXTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5fZGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24gPSB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcbiAgICBjb25zdCB2YWx1ZSA9IHdvcmtzcGFjZT8uZ2V0Q2xpKClbJ2RlZmF1bHRDb2xsZWN0aW9uJ107XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiAodGhpcy5fZGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24gPSB2YWx1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuICh0aGlzLl9kZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbiA9IERFRkFVTFRfU0NIRU1BVElDU19DT0xMRUNUSU9OKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwYXJzZVNjaGVtYXRpY0luZm8oXG4gICAgc2NoZW1hdGljOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICk6IFtjb2xsZWN0aW9uTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBzY2hlbWF0aWNOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWRdIHtcbiAgICBpZiAoc2NoZW1hdGljPy5pbmNsdWRlcygnOicpKSB7XG4gICAgICBjb25zdCBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gc2NoZW1hdGljLnNwbGl0KCc6JywgMik7XG5cbiAgICAgIHJldHVybiBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdO1xuICAgIH1cblxuICAgIHJldHVybiBbdW5kZWZpbmVkLCBzY2hlbWF0aWNdO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1blNjaGVtYXRpYyhvcHRpb25zOiB7XG4gICAgZXhlY3V0aW9uT3B0aW9uczogU2NoZW1hdGljc0V4ZWN1dGlvbk9wdGlvbnM7XG4gICAgc2NoZW1hdGljT3B0aW9uczogT3RoZXJPcHRpb25zO1xuICAgIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmc7XG4gICAgc2NoZW1hdGljTmFtZTogc3RyaW5nO1xuICB9KTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHsgc2NoZW1hdGljT3B0aW9ucywgZXhlY3V0aW9uT3B0aW9ucywgY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWUgfSA9IG9wdGlvbnM7XG4gICAgY29uc3Qgd29ya2Zsb3cgPSBhd2FpdCB0aGlzLmdldE9yQ3JlYXRlV29ya2Zsb3dGb3JFeGVjdXRpb24oY29sbGVjdGlvbk5hbWUsIGV4ZWN1dGlvbk9wdGlvbnMpO1xuXG4gICAgaWYgKCFzY2hlbWF0aWNOYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3NjaGVtYXRpY05hbWUgY2Fubm90IGJlIHVuZGVmaW5lZC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCB7IHVuc3Vic2NyaWJlLCBmaWxlcyB9ID0gc3Vic2NyaWJlVG9Xb3JrZmxvdyh3b3JrZmxvdywgbG9nZ2VyKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB3b3JrZmxvd1xuICAgICAgICAuZXhlY3V0ZSh7XG4gICAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgICAgc2NoZW1hdGljOiBzY2hlbWF0aWNOYW1lLFxuICAgICAgICAgIG9wdGlvbnM6IHNjaGVtYXRpY09wdGlvbnMsXG4gICAgICAgICAgbG9nZ2VyLFxuICAgICAgICAgIGFsbG93UHJpdmF0ZTogdGhpcy5hbGxvd1ByaXZhdGVTY2hlbWF0aWNzLFxuICAgICAgICB9KVxuICAgICAgICAudG9Qcm9taXNlKCk7XG5cbiAgICAgIGlmICghZmlsZXMuc2l6ZSkge1xuICAgICAgICBsb2dnZXIuaW5mbygnTm90aGluZyB0byBiZSBkb25lLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXhlY3V0aW9uT3B0aW9ucy5kcnlSdW4pIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oYFxcbk5PVEU6IFRoZSBcIi0tZHJ5LXJ1blwiIG9wdGlvbiBtZWFucyBubyBjaGFuZ2VzIHdlcmUgbWFkZS5gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIEluIGNhc2UgdGhlIHdvcmtmbG93IHdhcyBub3Qgc3VjY2Vzc2Z1bCwgc2hvdyBhbiBhcHByb3ByaWF0ZSBlcnJvciBtZXNzYWdlLlxuICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uKSB7XG4gICAgICAgIC8vIFwiU2VlIGFib3ZlXCIgYmVjYXVzZSB3ZSBhbHJlYWR5IHByaW50ZWQgdGhlIGVycm9yLlxuICAgICAgICBsb2dnZXIuZmF0YWwoJ1RoZSBTY2hlbWF0aWMgd29ya2Zsb3cgZmFpbGVkLiBTZWUgYWJvdmUuJyk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHVuc3Vic2NyaWJlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwcml2YXRlIGdldFByb2plY3ROYW1lKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UsIGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGlmICghd29ya3NwYWNlKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2plY3ROYW1lcyA9IGdldFByb2plY3RzQnlQYXRoKHdvcmtzcGFjZSwgcHJvY2Vzcy5jd2QoKSwgd29ya3NwYWNlLmJhc2VQYXRoKTtcblxuICAgIGlmIChwcm9qZWN0TmFtZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICByZXR1cm4gcHJvamVjdE5hbWVzWzBdO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAocHJvamVjdE5hbWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4odGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgVHdvIG9yIG1vcmUgcHJvamVjdHMgYXJlIHVzaW5nIGlkZW50aWNhbCByb290cy5cbiAgICAgICAgICAgIFVuYWJsZSB0byBkZXRlcm1pbmUgcHJvamVjdCB1c2luZyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LlxuICAgICAgICAgICAgVXNpbmcgZGVmYXVsdCB3b3Jrc3BhY2UgcHJvamVjdCBpbnN0ZWFkLlxuICAgICAgICAgIGApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkZWZhdWx0UHJvamVjdE5hbWUgPSB3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snZGVmYXVsdFByb2plY3QnXTtcbiAgICAgIGlmICh0eXBlb2YgZGVmYXVsdFByb2plY3ROYW1lID09PSAnc3RyaW5nJyAmJiBkZWZhdWx0UHJvamVjdE5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRQcm9qZWN0TmFtZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZXNvbHZlUGF0aHMoY29sbGVjdGlvbk5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSwgcm9vdCB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgcmV0dXJuIHdvcmtzcGFjZVxuICAgICAgPyAvLyBXb3Jrc3BhY2VcbiAgICAgICAgY29sbGVjdGlvbk5hbWUgPT09IERFRkFVTFRfU0NIRU1BVElDU19DT0xMRUNUSU9OXG4gICAgICAgID8gLy8gRmF2b3IgX19kaXJuYW1lIGZvciBAc2NoZW1hdGljcy9hbmd1bGFyIHRvIHVzZSB0aGUgYnVpbGQtaW4gdmVyc2lvblxuICAgICAgICAgIFtfX2Rpcm5hbWUsIHByb2Nlc3MuY3dkKCksIHJvb3RdXG4gICAgICAgIDogW3Byb2Nlc3MuY3dkKCksIHJvb3QsIF9fZGlybmFtZV1cbiAgICAgIDogLy8gR2xvYmFsXG4gICAgICAgIFtfX2Rpcm5hbWUsIHByb2Nlc3MuY3dkKCldO1xuICB9XG59XG4iXX0=