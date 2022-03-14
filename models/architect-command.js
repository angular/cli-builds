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
exports.ArchitectCommand = void 0;
const architect_1 = require("@angular-devkit/architect");
const node_1 = require("@angular-devkit/architect/node");
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const json_schema_1 = require("../utilities/json-schema");
const package_manager_1 = require("../utilities/package-manager");
const analytics_1 = require("./analytics");
const command_1 = require("./command");
const parser_1 = require("./parser");
class ArchitectCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.useReportAnalytics = false;
        // If this command supports running multiple targets.
        this.multiTarget = false;
    }
    async onMissingTarget(projectName) {
        if (this.missingTargetError) {
            this.logger.fatal(this.missingTargetError);
            return 1;
        }
        if (projectName) {
            this.logger.fatal(`Project '${projectName}' does not support the '${this.target}' target.`);
        }
        else {
            this.logger.fatal(`No projects support the '${this.target}' target.`);
        }
        return 1;
    }
    // eslint-disable-next-line max-lines-per-function
    async initialize(options) {
        this._registry = new core_1.json.schema.CoreSchemaRegistry();
        this._registry.addPostTransform(core_1.json.schema.transforms.addUndefinedDefaults);
        this._registry.useXDeprecatedProvider((msg) => this.logger.warn(msg));
        if (!this.workspace) {
            this.logger.fatal('A workspace is required for this command.');
            return 1;
        }
        this._architectHost = new node_1.WorkspaceNodeModulesArchitectHost(this.workspace, this.workspace.basePath);
        this._architect = new architect_1.Architect(this._architectHost, this._registry);
        if (!this.target) {
            if (options.help) {
                // This is a special case where we just return.
                return;
            }
            const specifier = this._makeTargetSpecifier(options);
            if (!specifier.project || !specifier.target) {
                this.logger.fatal('Cannot determine project or target for command.');
                return 1;
            }
            return;
        }
        let projectName = options.project;
        if (projectName && !this.workspace.projects.has(projectName)) {
            this.logger.fatal(`Project '${projectName}' does not exist.`);
            return 1;
        }
        const commandLeftovers = options['--'];
        const targetProjectNames = [];
        for (const [name, project] of this.workspace.projects) {
            if (project.targets.has(this.target)) {
                targetProjectNames.push(name);
            }
        }
        if (projectName && !targetProjectNames.includes(projectName)) {
            return await this.onMissingTarget(projectName);
        }
        if (targetProjectNames.length === 0) {
            return await this.onMissingTarget();
        }
        if (!projectName && commandLeftovers && commandLeftovers.length > 0) {
            const builderNames = new Set();
            const leftoverMap = new Map();
            let potentialProjectNames = new Set(targetProjectNames);
            for (const name of targetProjectNames) {
                const builderName = await this._architectHost.getBuilderNameForTarget({
                    project: name,
                    target: this.target,
                });
                if (this.multiTarget) {
                    builderNames.add(builderName);
                }
                let builderDesc;
                try {
                    builderDesc = await this._architectHost.resolveBuilder(builderName);
                }
                catch (e) {
                    if (e.code === 'MODULE_NOT_FOUND') {
                        await this.warnOnMissingNodeModules(this.workspace.basePath);
                        this.logger.fatal(`Could not find the '${builderName}' builder's node package.`);
                        return 1;
                    }
                    throw e;
                }
                const optionDefs = await (0, json_schema_1.parseJsonSchemaToOptions)(this._registry, builderDesc.optionSchema);
                const parsedOptions = (0, parser_1.parseArguments)([...commandLeftovers], optionDefs);
                const builderLeftovers = parsedOptions['--'] || [];
                leftoverMap.set(name, { optionDefs, parsedOptions });
                potentialProjectNames = new Set(builderLeftovers.filter((x) => potentialProjectNames.has(x)));
            }
            if (potentialProjectNames.size === 1) {
                projectName = [...potentialProjectNames][0];
                // remove the project name from the leftovers
                const optionInfo = leftoverMap.get(projectName);
                if (optionInfo) {
                    const locations = [];
                    let i = 0;
                    while (i < commandLeftovers.length) {
                        i = commandLeftovers.indexOf(projectName, i + 1);
                        if (i === -1) {
                            break;
                        }
                        locations.push(i);
                    }
                    delete optionInfo.parsedOptions['--'];
                    for (const location of locations) {
                        const tempLeftovers = [...commandLeftovers];
                        tempLeftovers.splice(location, 1);
                        const tempArgs = (0, parser_1.parseArguments)([...tempLeftovers], optionInfo.optionDefs);
                        delete tempArgs['--'];
                        if (JSON.stringify(optionInfo.parsedOptions) === JSON.stringify(tempArgs)) {
                            options['--'] = tempLeftovers;
                            break;
                        }
                    }
                }
            }
            if (!projectName && this.multiTarget && builderNames.size > 1) {
                this.logger.fatal(core_1.tags.oneLine `
          Architect commands with command line overrides cannot target different builders. The
          '${this.target}' target would run on projects ${targetProjectNames.join()} which have the
          following builders: ${'\n  ' + [...builderNames].join('\n  ')}
        `);
                return 1;
            }
        }
        if (!projectName && !this.multiTarget) {
            const defaultProjectName = this.workspace.extensions['defaultProject'];
            if (targetProjectNames.length === 1) {
                projectName = targetProjectNames[0];
            }
            else if (defaultProjectName && targetProjectNames.includes(defaultProjectName)) {
                projectName = defaultProjectName;
            }
            else if (options.help) {
                // This is a special case where we just return.
                return;
            }
            else {
                this.logger.fatal(this.missingTargetError || 'Cannot determine project or target for command.');
                return 1;
            }
        }
        options.project = projectName;
        const builderConf = await this._architectHost.getBuilderNameForTarget({
            project: projectName || (targetProjectNames.length > 0 ? targetProjectNames[0] : ''),
            target: this.target,
        });
        let builderDesc;
        try {
            builderDesc = await this._architectHost.resolveBuilder(builderConf);
        }
        catch (e) {
            if (e.code === 'MODULE_NOT_FOUND') {
                await this.warnOnMissingNodeModules(this.workspace.basePath);
                this.logger.fatal(`Could not find the '${builderConf}' builder's node package.`);
                return 1;
            }
            throw e;
        }
        this.description.options.push(...(await (0, json_schema_1.parseJsonSchemaToOptions)(this._registry, builderDesc.optionSchema)));
        // Update options to remove analytics from options if the builder isn't safelisted.
        for (const o of this.description.options) {
            if (o.userAnalytics && !(0, analytics_1.isPackageNameSafeForAnalytics)(builderConf)) {
                o.userAnalytics = undefined;
            }
        }
    }
    async warnOnMissingNodeModules(basePath) {
        // Check for a `node_modules` directory (npm, yarn non-PnP, etc.)
        if ((0, fs_1.existsSync)(path.resolve(basePath, 'node_modules'))) {
            return;
        }
        // Check for yarn PnP files
        if ((0, fs_1.existsSync)(path.resolve(basePath, '.pnp.js')) ||
            (0, fs_1.existsSync)(path.resolve(basePath, '.pnp.cjs')) ||
            (0, fs_1.existsSync)(path.resolve(basePath, '.pnp.mjs'))) {
            return;
        }
        const packageManager = await (0, package_manager_1.getPackageManager)(basePath);
        let installSuggestion = 'Try installing with ';
        switch (packageManager) {
            case 'npm':
                installSuggestion += `'npm install'`;
                break;
            case 'yarn':
                installSuggestion += `'yarn'`;
                break;
            default:
                installSuggestion += `the project's package manager`;
                break;
        }
        this.logger.warn(`Node packages may not be installed. ${installSuggestion}.`);
    }
    async run(options) {
        return await this.runArchitectTarget(options);
    }
    async runSingleTarget(target, targetOptions) {
        // We need to build the builderSpec twice because architect does not understand
        // overrides separately (getting the configuration builds the whole project, including
        // overrides).
        const builderConf = await this._architectHost.getBuilderNameForTarget(target);
        let builderDesc;
        try {
            builderDesc = await this._architectHost.resolveBuilder(builderConf);
        }
        catch (e) {
            if (e.code === 'MODULE_NOT_FOUND') {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                await this.warnOnMissingNodeModules(this.workspace.basePath);
                this.logger.fatal(`Could not find the '${builderConf}' builder's node package.`);
                return 1;
            }
            throw e;
        }
        const targetOptionArray = await (0, json_schema_1.parseJsonSchemaToOptions)(this._registry, builderDesc.optionSchema);
        const overrides = (0, parser_1.parseArguments)(targetOptions, targetOptionArray, this.logger);
        const allowAdditionalProperties = typeof builderDesc.optionSchema === 'object' && builderDesc.optionSchema.additionalProperties;
        if (overrides['--'] && !allowAdditionalProperties) {
            (overrides['--'] || []).forEach((additional) => {
                this.logger.fatal(`Unknown option: '${additional.split(/=/)[0]}'`);
            });
            return 1;
        }
        await this.reportAnalytics([this.description.name], {
            ...(await this._architectHost.getOptionsForTarget(target)),
            ...overrides,
        });
        const run = await this._architect.scheduleTarget(target, overrides, {
            logger: this.logger,
            analytics: (0, analytics_1.isPackageNameSafeForAnalytics)(builderConf) ? this.analytics : undefined,
        });
        const { error, success } = await run.output.toPromise();
        await run.stop();
        if (error) {
            this.logger.error(error);
        }
        return success ? 0 : 1;
    }
    async runArchitectTarget(options) {
        var _a;
        const extra = options['--'] || [];
        try {
            const targetSpec = this._makeTargetSpecifier(options);
            if (!targetSpec.project && this.target) {
                // This runs each target sequentially.
                // Running them in parallel would jumble the log messages.
                let result = 0;
                for (const project of this.getProjectNamesByTarget(this.target)) {
                    result |= await this.runSingleTarget({ ...targetSpec, project }, extra);
                }
                return result;
            }
            else {
                return await this.runSingleTarget(targetSpec, extra);
            }
        }
        catch (e) {
            if (e instanceof core_1.schema.SchemaValidationException) {
                const newErrors = [];
                for (const schemaError of e.errors) {
                    if (schemaError.keyword === 'additionalProperties') {
                        const unknownProperty = (_a = schemaError.params) === null || _a === void 0 ? void 0 : _a.additionalProperty;
                        if (unknownProperty in options) {
                            const dashes = unknownProperty.length === 1 ? '-' : '--';
                            this.logger.fatal(`Unknown option: '${dashes}${unknownProperty}'`);
                            continue;
                        }
                    }
                    newErrors.push(schemaError);
                }
                if (newErrors.length > 0) {
                    this.logger.error(new core_1.schema.SchemaValidationException(newErrors).message);
                }
                return 1;
            }
            else {
                throw e;
            }
        }
    }
    getProjectNamesByTarget(targetName) {
        const allProjectsForTargetName = [];
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const [name, project] of this.workspace.projects) {
            if (project.targets.has(targetName)) {
                allProjectsForTargetName.push(name);
            }
        }
        if (this.multiTarget) {
            // For multi target commands, we always list all projects that have the target.
            return allProjectsForTargetName;
        }
        else {
            // For single target commands, we try the default project first,
            // then the full list if it has a single project, then error out.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const maybeDefaultProject = this.workspace.extensions['defaultProject'];
            if (maybeDefaultProject && allProjectsForTargetName.includes(maybeDefaultProject)) {
                return [maybeDefaultProject];
            }
            if (allProjectsForTargetName.length === 1) {
                return allProjectsForTargetName;
            }
            throw new Error(`Could not determine a single project for the '${targetName}' target.`);
        }
    }
    _makeTargetSpecifier(commandOptions) {
        var _a, _b, _c;
        let project, target, configuration;
        if (commandOptions.target) {
            [project, target, configuration] = commandOptions.target.split(':');
            if (commandOptions.configuration) {
                configuration = commandOptions.configuration;
            }
        }
        else {
            project = commandOptions.project;
            target = this.target;
            if (commandOptions.prod) {
                const defaultConfig = project &&
                    target &&
                    ((_c = (_b = (_a = this.workspace) === null || _a === void 0 ? void 0 : _a.projects.get(project)) === null || _b === void 0 ? void 0 : _b.targets.get(target)) === null || _c === void 0 ? void 0 : _c.defaultConfiguration);
                this.logger.warn(defaultConfig === 'production'
                    ? 'Option "--prod" is deprecated: No need to use this option as this builder defaults to configuration "production".'
                    : 'Option "--prod" is deprecated: Use "--configuration production" instead.');
                // The --prod flag will always be the first configuration, available to be overwritten
                // by following configurations.
                configuration = 'production';
            }
            if (commandOptions.configuration) {
                configuration = `${configuration ? `${configuration},` : ''}${commandOptions.configuration}`;
            }
        }
        if (!project) {
            project = '';
        }
        if (!target) {
            target = '';
        }
        return {
            project,
            configuration: configuration || '',
            target,
        };
    }
}
exports.ArchitectCommand = ArchitectCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvYXJjaGl0ZWN0LWNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCx5REFBOEQ7QUFDOUQseURBQW1GO0FBQ25GLCtDQUEwRDtBQUMxRCwyQkFBZ0M7QUFDaEMsMkNBQTZCO0FBQzdCLDBEQUFvRTtBQUNwRSxrRUFBaUU7QUFDakUsMkNBQTREO0FBQzVELHVDQUF3RDtBQUV4RCxxQ0FBMEM7QUFTMUMsTUFBc0IsZ0JBRXBCLFNBQVEsaUJBQVU7SUFGcEI7O1FBTThCLHVCQUFrQixHQUFHLEtBQUssQ0FBQztRQUV2RCxxREFBcUQ7UUFDM0MsZ0JBQVcsR0FBRyxLQUFLLENBQUM7SUF1YWhDLENBQUM7SUFsYVcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxXQUFvQjtRQUNsRCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtZQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUUzQyxPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsSUFBSSxXQUFXLEVBQUU7WUFDZixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLFdBQVcsMkJBQTJCLElBQUksQ0FBQyxNQUFNLFdBQVcsQ0FBQyxDQUFDO1NBQzdGO2FBQU07WUFDTCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsSUFBSSxDQUFDLE1BQU0sV0FBVyxDQUFDLENBQUM7U0FDdkU7UUFFRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFRCxrREFBa0Q7SUFDbEMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFzQjtRQUNyRCxJQUFJLENBQUMsU0FBUyxHQUFHLElB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Q0FBQyxhQUNqQixFQUFFLENBQUM7YUFDSjtTQUNGO1FBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNaLE9BQU8sR0FBRyxFQUFFLENBQUM7U0FDZDtRQUNELElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDWCxNQUFNLEdBQUcsRUFBRSxDQUFDO1NBQ2I7UUFFRCxPQUFPO1lBQ0wsT0FBTztZQUNQLGFBQWEsRUFBRSxhQUFhLElBQUksRUFBRTtZQUNsQyxNQUFNO1NBQ1AsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQWhiRCw0Q0FnYkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQXJjaGl0ZWN0LCBUYXJnZXQgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IFdvcmtzcGFjZU5vZGVNb2R1bGVzQXJjaGl0ZWN0SG9zdCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3Qvbm9kZSc7XG5pbXBvcnQgeyBqc29uLCBzY2hlbWEsIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyB9IGZyb20gJy4uL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5pbXBvcnQgeyBnZXRQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXInO1xuaW1wb3J0IHsgaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MgfSBmcm9tICcuL2FuYWx5dGljcyc7XG5pbXBvcnQgeyBCYXNlQ29tbWFuZE9wdGlvbnMsIENvbW1hbmQgfSBmcm9tICcuL2NvbW1hbmQnO1xuaW1wb3J0IHsgQXJndW1lbnRzLCBPcHRpb24gfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBwYXJzZUFyZ3VtZW50cyB9IGZyb20gJy4vcGFyc2VyJztcblxuZXhwb3J0IGludGVyZmFjZSBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyBleHRlbmRzIEJhc2VDb21tYW5kT3B0aW9ucyB7XG4gIHByb2plY3Q/OiBzdHJpbmc7XG4gIGNvbmZpZ3VyYXRpb24/OiBzdHJpbmc7XG4gIHByb2Q/OiBib29sZWFuO1xuICB0YXJnZXQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBcmNoaXRlY3RDb21tYW5kPFxuICBUIGV4dGVuZHMgQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgPSBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyxcbj4gZXh0ZW5kcyBDb21tYW5kPFQ+IHtcbiAgcHJvdGVjdGVkIF9hcmNoaXRlY3QhOiBBcmNoaXRlY3Q7XG4gIHByb3RlY3RlZCBfYXJjaGl0ZWN0SG9zdCE6IFdvcmtzcGFjZU5vZGVNb2R1bGVzQXJjaGl0ZWN0SG9zdDtcbiAgcHJvdGVjdGVkIF9yZWdpc3RyeSE6IGpzb24uc2NoZW1hLlNjaGVtYVJlZ2lzdHJ5O1xuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgcmVhZG9ubHkgdXNlUmVwb3J0QW5hbHl0aWNzID0gZmFsc2U7XG5cbiAgLy8gSWYgdGhpcyBjb21tYW5kIHN1cHBvcnRzIHJ1bm5pbmcgbXVsdGlwbGUgdGFyZ2V0cy5cbiAgcHJvdGVjdGVkIG11bHRpVGFyZ2V0ID0gZmFsc2U7XG5cbiAgdGFyZ2V0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIG1pc3NpbmdUYXJnZXRFcnJvcjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIHByb3RlY3RlZCBhc3luYyBvbk1pc3NpbmdUYXJnZXQocHJvamVjdE5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQgfCBudW1iZXI+IHtcbiAgICBpZiAodGhpcy5taXNzaW5nVGFyZ2V0RXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKHRoaXMubWlzc2luZ1RhcmdldEVycm9yKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgaWYgKHByb2plY3ROYW1lKSB7XG4gICAgICB0aGlzLmxvZ2dlci5mYXRhbChgUHJvamVjdCAnJHtwcm9qZWN0TmFtZX0nIGRvZXMgbm90IHN1cHBvcnQgdGhlICcke3RoaXMudGFyZ2V0fScgdGFyZ2V0LmApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvZ2dlci5mYXRhbChgTm8gcHJvamVjdHMgc3VwcG9ydCB0aGUgJyR7dGhpcy50YXJnZXR9JyB0YXJnZXQuYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxpbmVzLXBlci1mdW5jdGlvblxuICBwdWJsaWMgb3ZlcnJpZGUgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBUICYgQXJndW1lbnRzKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgdGhpcy5fcmVnaXN0cnkgPSBuZXcganNvbi5zY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KCk7XG4gICAgdGhpcy5fcmVnaXN0cnkuYWRkUG9zdFRyYW5zZm9ybShqc29uLnNjaGVtYS50cmFuc2Zvcm1zLmFkZFVuZGVmaW5lZERlZmF1bHRzKTtcbiAgICB0aGlzLl9yZWdpc3RyeS51c2VYRGVwcmVjYXRlZFByb3ZpZGVyKChtc2cpID0+IHRoaXMubG9nZ2VyLndhcm4obXNnKSk7XG5cbiAgICBpZiAoIXRoaXMud29ya3NwYWNlKSB7XG4gICAgICB0aGlzLmxvZ2dlci5mYXRhbCgnQSB3b3Jrc3BhY2UgaXMgcmVxdWlyZWQgZm9yIHRoaXMgY29tbWFuZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgdGhpcy5fYXJjaGl0ZWN0SG9zdCA9IG5ldyBXb3Jrc3BhY2VOb2RlTW9kdWxlc0FyY2hpdGVjdEhvc3QoXG4gICAgICB0aGlzLndvcmtzcGFjZSxcbiAgICAgIHRoaXMud29ya3NwYWNlLmJhc2VQYXRoLFxuICAgICk7XG4gICAgdGhpcy5fYXJjaGl0ZWN0ID0gbmV3IEFyY2hpdGVjdCh0aGlzLl9hcmNoaXRlY3RIb3N0LCB0aGlzLl9yZWdpc3RyeSk7XG5cbiAgICBpZiAoIXRoaXMudGFyZ2V0KSB7XG4gICAgICBpZiAob3B0aW9ucy5oZWxwKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgYSBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UganVzdCByZXR1cm4uXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc3BlY2lmaWVyID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcbiAgICAgIGlmICghc3BlY2lmaWVyLnByb2plY3QgfHwgIXNwZWNpZmllci50YXJnZXQpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoJ0Nhbm5vdCBkZXRlcm1pbmUgcHJvamVjdCBvciB0YXJnZXQgZm9yIGNvbW1hbmQuJyk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgcHJvamVjdE5hbWUgPSBvcHRpb25zLnByb2plY3Q7XG4gICAgaWYgKHByb2plY3ROYW1lICYmICF0aGlzLndvcmtzcGFjZS5wcm9qZWN0cy5oYXMocHJvamVjdE5hbWUpKSB7XG4gICAgICB0aGlzLmxvZ2dlci5mYXRhbChgUHJvamVjdCAnJHtwcm9qZWN0TmFtZX0nIGRvZXMgbm90IGV4aXN0LmApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBjb25zdCBjb21tYW5kTGVmdG92ZXJzID0gb3B0aW9uc1snLS0nXTtcbiAgICBjb25zdCB0YXJnZXRQcm9qZWN0TmFtZXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBbbmFtZSwgcHJvamVjdF0gb2YgdGhpcy53b3Jrc3BhY2UucHJvamVjdHMpIHtcbiAgICAgIGlmIChwcm9qZWN0LnRhcmdldHMuaGFzKHRoaXMudGFyZ2V0KSkge1xuICAgICAgICB0YXJnZXRQcm9qZWN0TmFtZXMucHVzaChuYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocHJvamVjdE5hbWUgJiYgIXRhcmdldFByb2plY3ROYW1lcy5pbmNsdWRlcyhwcm9qZWN0TmFtZSkpIHtcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLm9uTWlzc2luZ1RhcmdldChwcm9qZWN0TmFtZSk7XG4gICAgfVxuXG4gICAgaWYgKHRhcmdldFByb2plY3ROYW1lcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLm9uTWlzc2luZ1RhcmdldCgpO1xuICAgIH1cblxuICAgIGlmICghcHJvamVjdE5hbWUgJiYgY29tbWFuZExlZnRvdmVycyAmJiBjb21tYW5kTGVmdG92ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IGJ1aWxkZXJOYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgY29uc3QgbGVmdG92ZXJNYXAgPSBuZXcgTWFwPHN0cmluZywgeyBvcHRpb25EZWZzOiBPcHRpb25bXTsgcGFyc2VkT3B0aW9uczogQXJndW1lbnRzIH0+KCk7XG4gICAgICBsZXQgcG90ZW50aWFsUHJvamVjdE5hbWVzID0gbmV3IFNldDxzdHJpbmc+KHRhcmdldFByb2plY3ROYW1lcyk7XG4gICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdGFyZ2V0UHJvamVjdE5hbWVzKSB7XG4gICAgICAgIGNvbnN0IGJ1aWxkZXJOYW1lID0gYXdhaXQgdGhpcy5fYXJjaGl0ZWN0SG9zdC5nZXRCdWlsZGVyTmFtZUZvclRhcmdldCh7XG4gICAgICAgICAgcHJvamVjdDogbmFtZSxcbiAgICAgICAgICB0YXJnZXQ6IHRoaXMudGFyZ2V0LFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAodGhpcy5tdWx0aVRhcmdldCkge1xuICAgICAgICAgIGJ1aWxkZXJOYW1lcy5hZGQoYnVpbGRlck5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGJ1aWxkZXJEZXNjO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGJ1aWxkZXJEZXNjID0gYXdhaXQgdGhpcy5fYXJjaGl0ZWN0SG9zdC5yZXNvbHZlQnVpbGRlcihidWlsZGVyTmFtZSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMud2Fybk9uTWlzc2luZ05vZGVNb2R1bGVzKHRoaXMud29ya3NwYWNlLmJhc2VQYXRoKTtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGBDb3VsZCBub3QgZmluZCB0aGUgJyR7YnVpbGRlck5hbWV9JyBidWlsZGVyJ3Mgbm9kZSBwYWNrYWdlLmApO1xuXG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdGlvbkRlZnMgPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMoXG4gICAgICAgICAgdGhpcy5fcmVnaXN0cnksXG4gICAgICAgICAgYnVpbGRlckRlc2Mub3B0aW9uU2NoZW1hIGFzIGpzb24uSnNvbk9iamVjdCxcbiAgICAgICAgKTtcbiAgICAgICAgY29uc3QgcGFyc2VkT3B0aW9ucyA9IHBhcnNlQXJndW1lbnRzKFsuLi5jb21tYW5kTGVmdG92ZXJzXSwgb3B0aW9uRGVmcyk7XG4gICAgICAgIGNvbnN0IGJ1aWxkZXJMZWZ0b3ZlcnMgPSBwYXJzZWRPcHRpb25zWyctLSddIHx8IFtdO1xuICAgICAgICBsZWZ0b3Zlck1hcC5zZXQobmFtZSwgeyBvcHRpb25EZWZzLCBwYXJzZWRPcHRpb25zIH0pO1xuXG4gICAgICAgIHBvdGVudGlhbFByb2plY3ROYW1lcyA9IG5ldyBTZXQoXG4gICAgICAgICAgYnVpbGRlckxlZnRvdmVycy5maWx0ZXIoKHgpID0+IHBvdGVudGlhbFByb2plY3ROYW1lcy5oYXMoeCkpLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBpZiAocG90ZW50aWFsUHJvamVjdE5hbWVzLnNpemUgPT09IDEpIHtcbiAgICAgICAgcHJvamVjdE5hbWUgPSBbLi4ucG90ZW50aWFsUHJvamVjdE5hbWVzXVswXTtcblxuICAgICAgICAvLyByZW1vdmUgdGhlIHByb2plY3QgbmFtZSBmcm9tIHRoZSBsZWZ0b3ZlcnNcbiAgICAgICAgY29uc3Qgb3B0aW9uSW5mbyA9IGxlZnRvdmVyTWFwLmdldChwcm9qZWN0TmFtZSk7XG4gICAgICAgIGlmIChvcHRpb25JbmZvKSB7XG4gICAgICAgICAgY29uc3QgbG9jYXRpb25zID0gW107XG4gICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgIHdoaWxlIChpIDwgY29tbWFuZExlZnRvdmVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGkgPSBjb21tYW5kTGVmdG92ZXJzLmluZGV4T2YocHJvamVjdE5hbWUsIGkgKyAxKTtcbiAgICAgICAgICAgIGlmIChpID09PSAtMSkge1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxvY2F0aW9ucy5wdXNoKGkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWxldGUgb3B0aW9uSW5mby5wYXJzZWRPcHRpb25zWyctLSddO1xuICAgICAgICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgbG9jYXRpb25zKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wTGVmdG92ZXJzID0gWy4uLmNvbW1hbmRMZWZ0b3ZlcnNdO1xuICAgICAgICAgICAgdGVtcExlZnRvdmVycy5zcGxpY2UobG9jYXRpb24sIDEpO1xuICAgICAgICAgICAgY29uc3QgdGVtcEFyZ3MgPSBwYXJzZUFyZ3VtZW50cyhbLi4udGVtcExlZnRvdmVyc10sIG9wdGlvbkluZm8ub3B0aW9uRGVmcyk7XG4gICAgICAgICAgICBkZWxldGUgdGVtcEFyZ3NbJy0tJ107XG4gICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkob3B0aW9uSW5mby5wYXJzZWRPcHRpb25zKSA9PT0gSlNPTi5zdHJpbmdpZnkodGVtcEFyZ3MpKSB7XG4gICAgICAgICAgICAgIG9wdGlvbnNbJy0tJ10gPSB0ZW1wTGVmdG92ZXJzO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFwcm9qZWN0TmFtZSAmJiB0aGlzLm11bHRpVGFyZ2V0ICYmIGJ1aWxkZXJOYW1lcy5zaXplID4gMSkge1xuICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbCh0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgQXJjaGl0ZWN0IGNvbW1hbmRzIHdpdGggY29tbWFuZCBsaW5lIG92ZXJyaWRlcyBjYW5ub3QgdGFyZ2V0IGRpZmZlcmVudCBidWlsZGVycy4gVGhlXG4gICAgICAgICAgJyR7dGhpcy50YXJnZXR9JyB0YXJnZXQgd291bGQgcnVuIG9uIHByb2plY3RzICR7dGFyZ2V0UHJvamVjdE5hbWVzLmpvaW4oKX0gd2hpY2ggaGF2ZSB0aGVcbiAgICAgICAgICBmb2xsb3dpbmcgYnVpbGRlcnM6ICR7J1xcbiAgJyArIFsuLi5idWlsZGVyTmFtZXNdLmpvaW4oJ1xcbiAgJyl9XG4gICAgICAgIGApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghcHJvamVjdE5hbWUgJiYgIXRoaXMubXVsdGlUYXJnZXQpIHtcbiAgICAgIGNvbnN0IGRlZmF1bHRQcm9qZWN0TmFtZSA9IHRoaXMud29ya3NwYWNlLmV4dGVuc2lvbnNbJ2RlZmF1bHRQcm9qZWN0J10gYXMgc3RyaW5nO1xuICAgICAgaWYgKHRhcmdldFByb2plY3ROYW1lcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcHJvamVjdE5hbWUgPSB0YXJnZXRQcm9qZWN0TmFtZXNbMF07XG4gICAgICB9IGVsc2UgaWYgKGRlZmF1bHRQcm9qZWN0TmFtZSAmJiB0YXJnZXRQcm9qZWN0TmFtZXMuaW5jbHVkZXMoZGVmYXVsdFByb2plY3ROYW1lKSkge1xuICAgICAgICBwcm9qZWN0TmFtZSA9IGRlZmF1bHRQcm9qZWN0TmFtZTtcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5oZWxwKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgYSBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UganVzdCByZXR1cm4uXG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKFxuICAgICAgICAgIHRoaXMubWlzc2luZ1RhcmdldEVycm9yIHx8ICdDYW5ub3QgZGV0ZXJtaW5lIHByb2plY3Qgb3IgdGFyZ2V0IGZvciBjb21tYW5kLicsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgb3B0aW9ucy5wcm9qZWN0ID0gcHJvamVjdE5hbWU7XG5cbiAgICBjb25zdCBidWlsZGVyQ29uZiA9IGF3YWl0IHRoaXMuX2FyY2hpdGVjdEhvc3QuZ2V0QnVpbGRlck5hbWVGb3JUYXJnZXQoe1xuICAgICAgcHJvamVjdDogcHJvamVjdE5hbWUgfHwgKHRhcmdldFByb2plY3ROYW1lcy5sZW5ndGggPiAwID8gdGFyZ2V0UHJvamVjdE5hbWVzWzBdIDogJycpLFxuICAgICAgdGFyZ2V0OiB0aGlzLnRhcmdldCxcbiAgICB9KTtcblxuICAgIGxldCBidWlsZGVyRGVzYztcbiAgICB0cnkge1xuICAgICAgYnVpbGRlckRlc2MgPSBhd2FpdCB0aGlzLl9hcmNoaXRlY3RIb3N0LnJlc29sdmVCdWlsZGVyKGJ1aWxkZXJDb25mKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgYXdhaXQgdGhpcy53YXJuT25NaXNzaW5nTm9kZU1vZHVsZXModGhpcy53b3Jrc3BhY2UuYmFzZVBhdGgpO1xuICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChgQ291bGQgbm90IGZpbmQgdGhlICcke2J1aWxkZXJDb25mfScgYnVpbGRlcidzIG5vZGUgcGFja2FnZS5gKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgdGhpcy5kZXNjcmlwdGlvbi5vcHRpb25zLnB1c2goXG4gICAgICAuLi4oYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKFxuICAgICAgICB0aGlzLl9yZWdpc3RyeSxcbiAgICAgICAgYnVpbGRlckRlc2Mub3B0aW9uU2NoZW1hIGFzIGpzb24uSnNvbk9iamVjdCxcbiAgICAgICkpLFxuICAgICk7XG5cbiAgICAvLyBVcGRhdGUgb3B0aW9ucyB0byByZW1vdmUgYW5hbHl0aWNzIGZyb20gb3B0aW9ucyBpZiB0aGUgYnVpbGRlciBpc24ndCBzYWZlbGlzdGVkLlxuICAgIGZvciAoY29uc3QgbyBvZiB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMpIHtcbiAgICAgIGlmIChvLnVzZXJBbmFseXRpY3MgJiYgIWlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzKGJ1aWxkZXJDb25mKSkge1xuICAgICAgICBvLnVzZXJBbmFseXRpY3MgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB3YXJuT25NaXNzaW5nTm9kZU1vZHVsZXMoYmFzZVBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIENoZWNrIGZvciBhIGBub2RlX21vZHVsZXNgIGRpcmVjdG9yeSAobnBtLCB5YXJuIG5vbi1QblAsIGV0Yy4pXG4gICAgaWYgKGV4aXN0c1N5bmMocGF0aC5yZXNvbHZlKGJhc2VQYXRoLCAnbm9kZV9tb2R1bGVzJykpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIHlhcm4gUG5QIGZpbGVzXG4gICAgaWYgKFxuICAgICAgZXhpc3RzU3luYyhwYXRoLnJlc29sdmUoYmFzZVBhdGgsICcucG5wLmpzJykpIHx8XG4gICAgICBleGlzdHNTeW5jKHBhdGgucmVzb2x2ZShiYXNlUGF0aCwgJy5wbnAuY2pzJykpIHx8XG4gICAgICBleGlzdHNTeW5jKHBhdGgucmVzb2x2ZShiYXNlUGF0aCwgJy5wbnAubWpzJykpXG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGFja2FnZU1hbmFnZXIgPSBhd2FpdCBnZXRQYWNrYWdlTWFuYWdlcihiYXNlUGF0aCk7XG4gICAgbGV0IGluc3RhbGxTdWdnZXN0aW9uID0gJ1RyeSBpbnN0YWxsaW5nIHdpdGggJztcbiAgICBzd2l0Y2ggKHBhY2thZ2VNYW5hZ2VyKSB7XG4gICAgICBjYXNlICducG0nOlxuICAgICAgICBpbnN0YWxsU3VnZ2VzdGlvbiArPSBgJ25wbSBpbnN0YWxsJ2A7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAneWFybic6XG4gICAgICAgIGluc3RhbGxTdWdnZXN0aW9uICs9IGAneWFybidgO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGluc3RhbGxTdWdnZXN0aW9uICs9IGB0aGUgcHJvamVjdCdzIHBhY2thZ2UgbWFuYWdlcmA7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLndhcm4oYE5vZGUgcGFja2FnZXMgbWF5IG5vdCBiZSBpbnN0YWxsZWQuICR7aW5zdGFsbFN1Z2dlc3Rpb259LmApO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zICYgQXJndW1lbnRzKSB7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1blNpbmdsZVRhcmdldCh0YXJnZXQ6IFRhcmdldCwgdGFyZ2V0T3B0aW9uczogc3RyaW5nW10pIHtcbiAgICAvLyBXZSBuZWVkIHRvIGJ1aWxkIHRoZSBidWlsZGVyU3BlYyB0d2ljZSBiZWNhdXNlIGFyY2hpdGVjdCBkb2VzIG5vdCB1bmRlcnN0YW5kXG4gICAgLy8gb3ZlcnJpZGVzIHNlcGFyYXRlbHkgKGdldHRpbmcgdGhlIGNvbmZpZ3VyYXRpb24gYnVpbGRzIHRoZSB3aG9sZSBwcm9qZWN0LCBpbmNsdWRpbmdcbiAgICAvLyBvdmVycmlkZXMpLlxuICAgIGNvbnN0IGJ1aWxkZXJDb25mID0gYXdhaXQgdGhpcy5fYXJjaGl0ZWN0SG9zdC5nZXRCdWlsZGVyTmFtZUZvclRhcmdldCh0YXJnZXQpO1xuICAgIGxldCBidWlsZGVyRGVzYztcbiAgICB0cnkge1xuICAgICAgYnVpbGRlckRlc2MgPSBhd2FpdCB0aGlzLl9hcmNoaXRlY3RIb3N0LnJlc29sdmVCdWlsZGVyKGJ1aWxkZXJDb25mKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgYXdhaXQgdGhpcy53YXJuT25NaXNzaW5nTm9kZU1vZHVsZXModGhpcy53b3Jrc3BhY2UhLmJhc2VQYXRoKTtcbiAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYENvdWxkIG5vdCBmaW5kIHRoZSAnJHtidWlsZGVyQ29uZn0nIGJ1aWxkZXIncyBub2RlIHBhY2thZ2UuYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgICBjb25zdCB0YXJnZXRPcHRpb25BcnJheSA9IGF3YWl0IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyhcbiAgICAgIHRoaXMuX3JlZ2lzdHJ5LFxuICAgICAgYnVpbGRlckRlc2Mub3B0aW9uU2NoZW1hIGFzIGpzb24uSnNvbk9iamVjdCxcbiAgICApO1xuICAgIGNvbnN0IG92ZXJyaWRlcyA9IHBhcnNlQXJndW1lbnRzKHRhcmdldE9wdGlvbnMsIHRhcmdldE9wdGlvbkFycmF5LCB0aGlzLmxvZ2dlcik7XG5cbiAgICBjb25zdCBhbGxvd0FkZGl0aW9uYWxQcm9wZXJ0aWVzID1cbiAgICAgIHR5cGVvZiBidWlsZGVyRGVzYy5vcHRpb25TY2hlbWEgPT09ICdvYmplY3QnICYmIGJ1aWxkZXJEZXNjLm9wdGlvblNjaGVtYS5hZGRpdGlvbmFsUHJvcGVydGllcztcblxuICAgIGlmIChvdmVycmlkZXNbJy0tJ10gJiYgIWFsbG93QWRkaXRpb25hbFByb3BlcnRpZXMpIHtcbiAgICAgIChvdmVycmlkZXNbJy0tJ10gfHwgW10pLmZvckVhY2goKGFkZGl0aW9uYWwpID0+IHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYFVua25vd24gb3B0aW9uOiAnJHthZGRpdGlvbmFsLnNwbGl0KC89LylbMF19J2ApO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucmVwb3J0QW5hbHl0aWNzKFt0aGlzLmRlc2NyaXB0aW9uLm5hbWVdLCB7XG4gICAgICAuLi4oKGF3YWl0IHRoaXMuX2FyY2hpdGVjdEhvc3QuZ2V0T3B0aW9uc0ZvclRhcmdldCh0YXJnZXQpKSBhcyB1bmtub3duIGFzIFQpLFxuICAgICAgLi4ub3ZlcnJpZGVzLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcnVuID0gYXdhaXQgdGhpcy5fYXJjaGl0ZWN0LnNjaGVkdWxlVGFyZ2V0KHRhcmdldCwgb3ZlcnJpZGVzIGFzIGpzb24uSnNvbk9iamVjdCwge1xuICAgICAgbG9nZ2VyOiB0aGlzLmxvZ2dlcixcbiAgICAgIGFuYWx5dGljczogaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MoYnVpbGRlckNvbmYpID8gdGhpcy5hbmFseXRpY3MgOiB1bmRlZmluZWQsXG4gICAgfSk7XG5cbiAgICBjb25zdCB7IGVycm9yLCBzdWNjZXNzIH0gPSBhd2FpdCBydW4ub3V0cHV0LnRvUHJvbWlzZSgpO1xuICAgIGF3YWl0IHJ1bi5zdG9wKCk7XG5cbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGVycm9yKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VjY2VzcyA/IDAgOiAxO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1bkFyY2hpdGVjdFRhcmdldChcbiAgICBvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyAmIEFyZ3VtZW50cyxcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBleHRyYSA9IG9wdGlvbnNbJy0tJ10gfHwgW107XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgdGFyZ2V0U3BlYyA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgICBpZiAoIXRhcmdldFNwZWMucHJvamVjdCAmJiB0aGlzLnRhcmdldCkge1xuICAgICAgICAvLyBUaGlzIHJ1bnMgZWFjaCB0YXJnZXQgc2VxdWVudGlhbGx5LlxuICAgICAgICAvLyBSdW5uaW5nIHRoZW0gaW4gcGFyYWxsZWwgd291bGQganVtYmxlIHRoZSBsb2cgbWVzc2FnZXMuXG4gICAgICAgIGxldCByZXN1bHQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IHByb2plY3Qgb2YgdGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0aGlzLnRhcmdldCkpIHtcbiAgICAgICAgICByZXN1bHQgfD0gYXdhaXQgdGhpcy5ydW5TaW5nbGVUYXJnZXQoeyAuLi50YXJnZXRTcGVjLCBwcm9qZWN0IH0gYXMgVGFyZ2V0LCBleHRyYSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuU2luZ2xlVGFyZ2V0KHRhcmdldFNwZWMsIGV4dHJhKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKSB7XG4gICAgICAgIGNvbnN0IG5ld0Vycm9yczogc2NoZW1hLlNjaGVtYVZhbGlkYXRvckVycm9yW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBzY2hlbWFFcnJvciBvZiBlLmVycm9ycykge1xuICAgICAgICAgIGlmIChzY2hlbWFFcnJvci5rZXl3b3JkID09PSAnYWRkaXRpb25hbFByb3BlcnRpZXMnKSB7XG4gICAgICAgICAgICBjb25zdCB1bmtub3duUHJvcGVydHkgPSBzY2hlbWFFcnJvci5wYXJhbXM/LmFkZGl0aW9uYWxQcm9wZXJ0eTtcbiAgICAgICAgICAgIGlmICh1bmtub3duUHJvcGVydHkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgICBjb25zdCBkYXNoZXMgPSB1bmtub3duUHJvcGVydHkubGVuZ3RoID09PSAxID8gJy0nIDogJy0tJztcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYFVua25vd24gb3B0aW9uOiAnJHtkYXNoZXN9JHt1bmtub3duUHJvcGVydHl9J2ApO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3RXJyb3JzLnB1c2goc2NoZW1hRXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5ld0Vycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IobmV3IHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKG5ld0Vycm9ycykubWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0YXJnZXROYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lOiBzdHJpbmdbXSA9IFtdO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgZm9yIChjb25zdCBbbmFtZSwgcHJvamVjdF0gb2YgdGhpcy53b3Jrc3BhY2UhLnByb2plY3RzKSB7XG4gICAgICBpZiAocHJvamVjdC50YXJnZXRzLmhhcyh0YXJnZXROYW1lKSkge1xuICAgICAgICBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUucHVzaChuYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5tdWx0aVRhcmdldCkge1xuICAgICAgLy8gRm9yIG11bHRpIHRhcmdldCBjb21tYW5kcywgd2UgYWx3YXlzIGxpc3QgYWxsIHByb2plY3RzIHRoYXQgaGF2ZSB0aGUgdGFyZ2V0LlxuICAgICAgcmV0dXJuIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRm9yIHNpbmdsZSB0YXJnZXQgY29tbWFuZHMsIHdlIHRyeSB0aGUgZGVmYXVsdCBwcm9qZWN0IGZpcnN0LFxuICAgICAgLy8gdGhlbiB0aGUgZnVsbCBsaXN0IGlmIGl0IGhhcyBhIHNpbmdsZSBwcm9qZWN0LCB0aGVuIGVycm9yIG91dC5cbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICBjb25zdCBtYXliZURlZmF1bHRQcm9qZWN0ID0gdGhpcy53b3Jrc3BhY2UhLmV4dGVuc2lvbnNbJ2RlZmF1bHRQcm9qZWN0J10gYXMgc3RyaW5nO1xuICAgICAgaWYgKG1heWJlRGVmYXVsdFByb2plY3QgJiYgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmluY2x1ZGVzKG1heWJlRGVmYXVsdFByb2plY3QpKSB7XG4gICAgICAgIHJldHVybiBbbWF5YmVEZWZhdWx0UHJvamVjdF07XG4gICAgICB9XG5cbiAgICAgIGlmIChhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWU7XG4gICAgICB9XG5cbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGRldGVybWluZSBhIHNpbmdsZSBwcm9qZWN0IGZvciB0aGUgJyR7dGFyZ2V0TmFtZX0nIHRhcmdldC5gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9tYWtlVGFyZ2V0U3BlY2lmaWVyKGNvbW1hbmRPcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyk6IFRhcmdldCB7XG4gICAgbGV0IHByb2plY3QsIHRhcmdldCwgY29uZmlndXJhdGlvbjtcblxuICAgIGlmIChjb21tYW5kT3B0aW9ucy50YXJnZXQpIHtcbiAgICAgIFtwcm9qZWN0LCB0YXJnZXQsIGNvbmZpZ3VyYXRpb25dID0gY29tbWFuZE9wdGlvbnMudGFyZ2V0LnNwbGl0KCc6Jyk7XG5cbiAgICAgIGlmIChjb21tYW5kT3B0aW9ucy5jb25maWd1cmF0aW9uKSB7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24gPSBjb21tYW5kT3B0aW9ucy5jb25maWd1cmF0aW9uO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwcm9qZWN0ID0gY29tbWFuZE9wdGlvbnMucHJvamVjdDtcbiAgICAgIHRhcmdldCA9IHRoaXMudGFyZ2V0O1xuICAgICAgaWYgKGNvbW1hbmRPcHRpb25zLnByb2QpIHtcbiAgICAgICAgY29uc3QgZGVmYXVsdENvbmZpZyA9XG4gICAgICAgICAgcHJvamVjdCAmJlxuICAgICAgICAgIHRhcmdldCAmJlxuICAgICAgICAgIHRoaXMud29ya3NwYWNlPy5wcm9qZWN0cy5nZXQocHJvamVjdCk/LnRhcmdldHMuZ2V0KHRhcmdldCk/LmRlZmF1bHRDb25maWd1cmF0aW9uO1xuXG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgZGVmYXVsdENvbmZpZyA9PT0gJ3Byb2R1Y3Rpb24nXG4gICAgICAgICAgICA/ICdPcHRpb24gXCItLXByb2RcIiBpcyBkZXByZWNhdGVkOiBObyBuZWVkIHRvIHVzZSB0aGlzIG9wdGlvbiBhcyB0aGlzIGJ1aWxkZXIgZGVmYXVsdHMgdG8gY29uZmlndXJhdGlvbiBcInByb2R1Y3Rpb25cIi4nXG4gICAgICAgICAgICA6ICdPcHRpb24gXCItLXByb2RcIiBpcyBkZXByZWNhdGVkOiBVc2UgXCItLWNvbmZpZ3VyYXRpb24gcHJvZHVjdGlvblwiIGluc3RlYWQuJyxcbiAgICAgICAgKTtcbiAgICAgICAgLy8gVGhlIC0tcHJvZCBmbGFnIHdpbGwgYWx3YXlzIGJlIHRoZSBmaXJzdCBjb25maWd1cmF0aW9uLCBhdmFpbGFibGUgdG8gYmUgb3ZlcndyaXR0ZW5cbiAgICAgICAgLy8gYnkgZm9sbG93aW5nIGNvbmZpZ3VyYXRpb25zLlxuICAgICAgICBjb25maWd1cmF0aW9uID0gJ3Byb2R1Y3Rpb24nO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1hbmRPcHRpb25zLmNvbmZpZ3VyYXRpb24pIHtcbiAgICAgICAgY29uZmlndXJhdGlvbiA9IGAke2NvbmZpZ3VyYXRpb24gPyBgJHtjb25maWd1cmF0aW9ufSxgIDogJyd9JHtcbiAgICAgICAgICBjb21tYW5kT3B0aW9ucy5jb25maWd1cmF0aW9uXG4gICAgICAgIH1gO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgcHJvamVjdCA9ICcnO1xuICAgIH1cbiAgICBpZiAoIXRhcmdldCkge1xuICAgICAgdGFyZ2V0ID0gJyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2plY3QsXG4gICAgICBjb25maWd1cmF0aW9uOiBjb25maWd1cmF0aW9uIHx8ICcnLFxuICAgICAgdGFyZ2V0LFxuICAgIH07XG4gIH1cbn1cbiJdfQ==