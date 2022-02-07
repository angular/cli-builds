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
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
        this.logger.warn(`Node packages may not be installed. Try installing with '${packageManager} install'.`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvYXJjaGl0ZWN0LWNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHlEQUE4RDtBQUM5RCx5REFBbUY7QUFDbkYsK0NBQTBEO0FBQzFELDJCQUFnQztBQUNoQywyQ0FBNkI7QUFDN0IsMERBQW9FO0FBQ3BFLGtFQUFpRTtBQUNqRSwyQ0FBNEQ7QUFDNUQsdUNBQXdEO0FBRXhELHFDQUEwQztBQVMxQyxNQUFzQixnQkFFcEIsU0FBUSxpQkFBVTtJQUZwQjs7UUFNOEIsdUJBQWtCLEdBQUcsS0FBSyxDQUFDO1FBRXZELHFEQUFxRDtRQUMzQyxnQkFBVyxHQUFHLEtBQUssQ0FBQztJQTZZaEMsQ0FBQztJQXhZVyxLQUFLLENBQUMsZUFBZSxDQUFDLFdBQW9CO1FBQ2xELElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFO1lBQzNCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBRTNDLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFFRCxJQUFJLFdBQVcsRUFBRTtZQUNmLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksV0FBVywyQkFBMkIsSUFBSSxDQUFDLE1BQU0sV0FBVyxDQUFDLENBQUM7U0FDN0Y7YUFBTTtZQUNMLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLDRCQUE0QixJQUFJLENBQUMsTUFBTSxXQUFXLENBQUMsQ0FBQztTQUN2RTtRQUVELE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztJQUVELGtEQUFrRDtJQUNsQyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQXNCO1FBQ3JELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxX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Q0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFcEUsSUFBSSxjQUFjLENBQUMsYUFBYSxFQUFFO2dCQUNoQyxhQUFhLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQzthQUM5QztTQUNGO2FBQU07WUFDTCxPQUFPLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQztZQUNqQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNyQixJQUFJLGNBQWMsQ0FBQyxhQUFhLEVBQUU7Z0JBQ2hDLGFBQWEsR0FBRyxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUN6RCxjQUFjLENBQUMsYUFDakIsRUFBRSxDQUFDO2FBQ0o7U0FDRjtRQUVELElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDWixPQUFPLEdBQUcsRUFBRSxDQUFDO1NBQ2Q7UUFDRCxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1gsTUFBTSxHQUFHLEVBQUUsQ0FBQztTQUNiO1FBRUQsT0FBTztZQUNMLE9BQU87WUFDUCxhQUFhLEVBQUUsYUFBYSxJQUFJLEVBQUU7WUFDbEMsTUFBTTtTQUNQLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUF0WkQsNENBc1pDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEFyY2hpdGVjdCwgVGFyZ2V0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBXb3Jrc3BhY2VOb2RlTW9kdWxlc0FyY2hpdGVjdEhvc3QgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0L25vZGUnO1xuaW1wb3J0IHsganNvbiwgc2NoZW1hLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMgfSBmcm9tICcuLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuaW1wb3J0IHsgZ2V0UGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi91dGlsaXRpZXMvcGFja2FnZS1tYW5hZ2VyJztcbmltcG9ydCB7IGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzIH0gZnJvbSAnLi9hbmFseXRpY3MnO1xuaW1wb3J0IHsgQmFzZUNvbW1hbmRPcHRpb25zLCBDb21tYW5kIH0gZnJvbSAnLi9jb21tYW5kJztcbmltcG9ydCB7IEFyZ3VtZW50cywgT3B0aW9uIH0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgcGFyc2VBcmd1bWVudHMgfSBmcm9tICcuL3BhcnNlcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgZXh0ZW5kcyBCYXNlQ29tbWFuZE9wdGlvbnMge1xuICBwcm9qZWN0Pzogc3RyaW5nO1xuICBjb25maWd1cmF0aW9uPzogc3RyaW5nO1xuICBwcm9kPzogYm9vbGVhbjtcbiAgdGFyZ2V0Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXJjaGl0ZWN0Q29tbWFuZDxcbiAgVCBleHRlbmRzIEFyY2hpdGVjdENvbW1hbmRPcHRpb25zID0gQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMsXG4+IGV4dGVuZHMgQ29tbWFuZDxUPiB7XG4gIHByb3RlY3RlZCBfYXJjaGl0ZWN0ITogQXJjaGl0ZWN0O1xuICBwcm90ZWN0ZWQgX2FyY2hpdGVjdEhvc3QhOiBXb3Jrc3BhY2VOb2RlTW9kdWxlc0FyY2hpdGVjdEhvc3Q7XG4gIHByb3RlY3RlZCBfcmVnaXN0cnkhOiBqc29uLnNjaGVtYS5TY2hlbWFSZWdpc3RyeTtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIHJlYWRvbmx5IHVzZVJlcG9ydEFuYWx5dGljcyA9IGZhbHNlO1xuXG4gIC8vIElmIHRoaXMgY29tbWFuZCBzdXBwb3J0cyBydW5uaW5nIG11bHRpcGxlIHRhcmdldHMuXG4gIHByb3RlY3RlZCBtdWx0aVRhcmdldCA9IGZhbHNlO1xuXG4gIHRhcmdldDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBtaXNzaW5nVGFyZ2V0RXJyb3I6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBwcm90ZWN0ZWQgYXN5bmMgb25NaXNzaW5nVGFyZ2V0KHByb2plY3ROYW1lPzogc3RyaW5nKTogUHJvbWlzZTx2b2lkIHwgbnVtYmVyPiB7XG4gICAgaWYgKHRoaXMubWlzc2luZ1RhcmdldEVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5mYXRhbCh0aGlzLm1pc3NpbmdUYXJnZXRFcnJvcik7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGlmIChwcm9qZWN0TmFtZSkge1xuICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYFByb2plY3QgJyR7cHJvamVjdE5hbWV9JyBkb2VzIG5vdCBzdXBwb3J0IHRoZSAnJHt0aGlzLnRhcmdldH0nIHRhcmdldC5gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYE5vIHByb2plY3RzIHN1cHBvcnQgdGhlICcke3RoaXMudGFyZ2V0fScgdGFyZ2V0LmApO1xuICAgIH1cblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lcy1wZXItZnVuY3Rpb25cbiAgcHVibGljIG92ZXJyaWRlIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogVCAmIEFyZ3VtZW50cyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIHRoaXMuX3JlZ2lzdHJ5ID0gbmV3IGpzb24uc2NoZW1hLkNvcmVTY2hlbWFSZWdpc3RyeSgpO1xuICAgIHRoaXMuX3JlZ2lzdHJ5LmFkZFBvc3RUcmFuc2Zvcm0oanNvbi5zY2hlbWEudHJhbnNmb3Jtcy5hZGRVbmRlZmluZWREZWZhdWx0cyk7XG4gICAgdGhpcy5fcmVnaXN0cnkudXNlWERlcHJlY2F0ZWRQcm92aWRlcigobXNnKSA9PiB0aGlzLmxvZ2dlci53YXJuKG1zZykpO1xuXG4gICAgaWYgKCF0aGlzLndvcmtzcGFjZSkge1xuICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoJ0Egd29ya3NwYWNlIGlzIHJlcXVpcmVkIGZvciB0aGlzIGNvbW1hbmQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIHRoaXMuX2FyY2hpdGVjdEhvc3QgPSBuZXcgV29ya3NwYWNlTm9kZU1vZHVsZXNBcmNoaXRlY3RIb3N0KFxuICAgICAgdGhpcy53b3Jrc3BhY2UsXG4gICAgICB0aGlzLndvcmtzcGFjZS5iYXNlUGF0aCxcbiAgICApO1xuICAgIHRoaXMuX2FyY2hpdGVjdCA9IG5ldyBBcmNoaXRlY3QodGhpcy5fYXJjaGl0ZWN0SG9zdCwgdGhpcy5fcmVnaXN0cnkpO1xuXG4gICAgaWYgKCF0aGlzLnRhcmdldCkge1xuICAgICAgaWYgKG9wdGlvbnMuaGVscCkge1xuICAgICAgICAvLyBUaGlzIGlzIGEgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGp1c3QgcmV0dXJuLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHNwZWNpZmllciA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgICBpZiAoIXNwZWNpZmllci5wcm9qZWN0IHx8ICFzcGVjaWZpZXIudGFyZ2V0KSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKCdDYW5ub3QgZGV0ZXJtaW5lIHByb2plY3Qgb3IgdGFyZ2V0IGZvciBjb21tYW5kLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IHByb2plY3ROYW1lID0gb3B0aW9ucy5wcm9qZWN0O1xuICAgIGlmIChwcm9qZWN0TmFtZSAmJiAhdGhpcy53b3Jrc3BhY2UucHJvamVjdHMuaGFzKHByb2plY3ROYW1lKSkge1xuICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYFByb2plY3QgJyR7cHJvamVjdE5hbWV9JyBkb2VzIG5vdCBleGlzdC5gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgY29uc3QgY29tbWFuZExlZnRvdmVycyA9IG9wdGlvbnNbJy0tJ107XG4gICAgY29uc3QgdGFyZ2V0UHJvamVjdE5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW25hbWUsIHByb2plY3RdIG9mIHRoaXMud29ya3NwYWNlLnByb2plY3RzKSB7XG4gICAgICBpZiAocHJvamVjdC50YXJnZXRzLmhhcyh0aGlzLnRhcmdldCkpIHtcbiAgICAgICAgdGFyZ2V0UHJvamVjdE5hbWVzLnB1c2gobmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHByb2plY3ROYW1lICYmICF0YXJnZXRQcm9qZWN0TmFtZXMuaW5jbHVkZXMocHJvamVjdE5hbWUpKSB7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5vbk1pc3NpbmdUYXJnZXQocHJvamVjdE5hbWUpO1xuICAgIH1cblxuICAgIGlmICh0YXJnZXRQcm9qZWN0TmFtZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5vbk1pc3NpbmdUYXJnZXQoKTtcbiAgICB9XG5cbiAgICBpZiAoIXByb2plY3ROYW1lICYmIGNvbW1hbmRMZWZ0b3ZlcnMgJiYgY29tbWFuZExlZnRvdmVycy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBidWlsZGVyTmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgIGNvbnN0IGxlZnRvdmVyTWFwID0gbmV3IE1hcDxzdHJpbmcsIHsgb3B0aW9uRGVmczogT3B0aW9uW107IHBhcnNlZE9wdGlvbnM6IEFyZ3VtZW50cyB9PigpO1xuICAgICAgbGV0IHBvdGVudGlhbFByb2plY3ROYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPih0YXJnZXRQcm9qZWN0TmFtZXMpO1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIHRhcmdldFByb2plY3ROYW1lcykge1xuICAgICAgICBjb25zdCBidWlsZGVyTmFtZSA9IGF3YWl0IHRoaXMuX2FyY2hpdGVjdEhvc3QuZ2V0QnVpbGRlck5hbWVGb3JUYXJnZXQoe1xuICAgICAgICAgIHByb2plY3Q6IG5hbWUsXG4gICAgICAgICAgdGFyZ2V0OiB0aGlzLnRhcmdldCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHRoaXMubXVsdGlUYXJnZXQpIHtcbiAgICAgICAgICBidWlsZGVyTmFtZXMuYWRkKGJ1aWxkZXJOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBidWlsZGVyRGVzYztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBidWlsZGVyRGVzYyA9IGF3YWl0IHRoaXMuX2FyY2hpdGVjdEhvc3QucmVzb2x2ZUJ1aWxkZXIoYnVpbGRlck5hbWUpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLndhcm5Pbk1pc3NpbmdOb2RlTW9kdWxlcyh0aGlzLndvcmtzcGFjZS5iYXNlUGF0aCk7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChgQ291bGQgbm90IGZpbmQgdGhlICcke2J1aWxkZXJOYW1lfScgYnVpbGRlcidzIG5vZGUgcGFja2FnZS5gKTtcblxuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRpb25EZWZzID0gYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKFxuICAgICAgICAgIHRoaXMuX3JlZ2lzdHJ5LFxuICAgICAgICAgIGJ1aWxkZXJEZXNjLm9wdGlvblNjaGVtYSBhcyBqc29uLkpzb25PYmplY3QsXG4gICAgICAgICk7XG4gICAgICAgIGNvbnN0IHBhcnNlZE9wdGlvbnMgPSBwYXJzZUFyZ3VtZW50cyhbLi4uY29tbWFuZExlZnRvdmVyc10sIG9wdGlvbkRlZnMpO1xuICAgICAgICBjb25zdCBidWlsZGVyTGVmdG92ZXJzID0gcGFyc2VkT3B0aW9uc1snLS0nXSB8fCBbXTtcbiAgICAgICAgbGVmdG92ZXJNYXAuc2V0KG5hbWUsIHsgb3B0aW9uRGVmcywgcGFyc2VkT3B0aW9ucyB9KTtcblxuICAgICAgICBwb3RlbnRpYWxQcm9qZWN0TmFtZXMgPSBuZXcgU2V0KFxuICAgICAgICAgIGJ1aWxkZXJMZWZ0b3ZlcnMuZmlsdGVyKCh4KSA9PiBwb3RlbnRpYWxQcm9qZWN0TmFtZXMuaGFzKHgpKSxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBvdGVudGlhbFByb2plY3ROYW1lcy5zaXplID09PSAxKSB7XG4gICAgICAgIHByb2plY3ROYW1lID0gWy4uLnBvdGVudGlhbFByb2plY3ROYW1lc11bMF07XG5cbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBwcm9qZWN0IG5hbWUgZnJvbSB0aGUgbGVmdG92ZXJzXG4gICAgICAgIGNvbnN0IG9wdGlvbkluZm8gPSBsZWZ0b3Zlck1hcC5nZXQocHJvamVjdE5hbWUpO1xuICAgICAgICBpZiAob3B0aW9uSW5mbykge1xuICAgICAgICAgIGNvbnN0IGxvY2F0aW9ucyA9IFtdO1xuICAgICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgICB3aGlsZSAoaSA8IGNvbW1hbmRMZWZ0b3ZlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpID0gY29tbWFuZExlZnRvdmVycy5pbmRleE9mKHByb2plY3ROYW1lLCBpICsgMSk7XG4gICAgICAgICAgICBpZiAoaSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsb2NhdGlvbnMucHVzaChpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGVsZXRlIG9wdGlvbkluZm8ucGFyc2VkT3B0aW9uc1snLS0nXTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIGxvY2F0aW9ucykge1xuICAgICAgICAgICAgY29uc3QgdGVtcExlZnRvdmVycyA9IFsuLi5jb21tYW5kTGVmdG92ZXJzXTtcbiAgICAgICAgICAgIHRlbXBMZWZ0b3ZlcnMuc3BsaWNlKGxvY2F0aW9uLCAxKTtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBBcmdzID0gcGFyc2VBcmd1bWVudHMoWy4uLnRlbXBMZWZ0b3ZlcnNdLCBvcHRpb25JbmZvLm9wdGlvbkRlZnMpO1xuICAgICAgICAgICAgZGVsZXRlIHRlbXBBcmdzWyctLSddO1xuICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KG9wdGlvbkluZm8ucGFyc2VkT3B0aW9ucykgPT09IEpTT04uc3RyaW5naWZ5KHRlbXBBcmdzKSkge1xuICAgICAgICAgICAgICBvcHRpb25zWyctLSddID0gdGVtcExlZnRvdmVycztcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICghcHJvamVjdE5hbWUgJiYgdGhpcy5tdWx0aVRhcmdldCAmJiBidWlsZGVyTmFtZXMuc2l6ZSA+IDEpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwodGFncy5vbmVMaW5lYFxuICAgICAgICAgIEFyY2hpdGVjdCBjb21tYW5kcyB3aXRoIGNvbW1hbmQgbGluZSBvdmVycmlkZXMgY2Fubm90IHRhcmdldCBkaWZmZXJlbnQgYnVpbGRlcnMuIFRoZVxuICAgICAgICAgICcke3RoaXMudGFyZ2V0fScgdGFyZ2V0IHdvdWxkIHJ1biBvbiBwcm9qZWN0cyAke3RhcmdldFByb2plY3ROYW1lcy5qb2luKCl9IHdoaWNoIGhhdmUgdGhlXG4gICAgICAgICAgZm9sbG93aW5nIGJ1aWxkZXJzOiAkeydcXG4gICcgKyBbLi4uYnVpbGRlck5hbWVzXS5qb2luKCdcXG4gICcpfVxuICAgICAgICBgKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXByb2plY3ROYW1lICYmICF0aGlzLm11bHRpVGFyZ2V0KSB7XG4gICAgICBjb25zdCBkZWZhdWx0UHJvamVjdE5hbWUgPSB0aGlzLndvcmtzcGFjZS5leHRlbnNpb25zWydkZWZhdWx0UHJvamVjdCddIGFzIHN0cmluZztcbiAgICAgIGlmICh0YXJnZXRQcm9qZWN0TmFtZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHByb2plY3ROYW1lID0gdGFyZ2V0UHJvamVjdE5hbWVzWzBdO1xuICAgICAgfSBlbHNlIGlmIChkZWZhdWx0UHJvamVjdE5hbWUgJiYgdGFyZ2V0UHJvamVjdE5hbWVzLmluY2x1ZGVzKGRlZmF1bHRQcm9qZWN0TmFtZSkpIHtcbiAgICAgICAgcHJvamVjdE5hbWUgPSBkZWZhdWx0UHJvamVjdE5hbWU7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuaGVscCkge1xuICAgICAgICAvLyBUaGlzIGlzIGEgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGp1c3QgcmV0dXJuLlxuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChcbiAgICAgICAgICB0aGlzLm1pc3NpbmdUYXJnZXRFcnJvciB8fCAnQ2Fubm90IGRldGVybWluZSBwcm9qZWN0IG9yIHRhcmdldCBmb3IgY29tbWFuZC4nLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIG9wdGlvbnMucHJvamVjdCA9IHByb2plY3ROYW1lO1xuXG4gICAgY29uc3QgYnVpbGRlckNvbmYgPSBhd2FpdCB0aGlzLl9hcmNoaXRlY3RIb3N0LmdldEJ1aWxkZXJOYW1lRm9yVGFyZ2V0KHtcbiAgICAgIHByb2plY3Q6IHByb2plY3ROYW1lIHx8ICh0YXJnZXRQcm9qZWN0TmFtZXMubGVuZ3RoID4gMCA/IHRhcmdldFByb2plY3ROYW1lc1swXSA6ICcnKSxcbiAgICAgIHRhcmdldDogdGhpcy50YXJnZXQsXG4gICAgfSk7XG5cbiAgICBsZXQgYnVpbGRlckRlc2M7XG4gICAgdHJ5IHtcbiAgICAgIGJ1aWxkZXJEZXNjID0gYXdhaXQgdGhpcy5fYXJjaGl0ZWN0SG9zdC5yZXNvbHZlQnVpbGRlcihidWlsZGVyQ29uZik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgIGF3YWl0IHRoaXMud2Fybk9uTWlzc2luZ05vZGVNb2R1bGVzKHRoaXMud29ya3NwYWNlLmJhc2VQYXRoKTtcbiAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYENvdWxkIG5vdCBmaW5kIHRoZSAnJHtidWlsZGVyQ29uZn0nIGJ1aWxkZXIncyBub2RlIHBhY2thZ2UuYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5wdXNoKFxuICAgICAgLi4uKGF3YWl0IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyhcbiAgICAgICAgdGhpcy5fcmVnaXN0cnksXG4gICAgICAgIGJ1aWxkZXJEZXNjLm9wdGlvblNjaGVtYSBhcyBqc29uLkpzb25PYmplY3QsXG4gICAgICApKSxcbiAgICApO1xuXG4gICAgLy8gVXBkYXRlIG9wdGlvbnMgdG8gcmVtb3ZlIGFuYWx5dGljcyBmcm9tIG9wdGlvbnMgaWYgdGhlIGJ1aWxkZXIgaXNuJ3Qgc2FmZWxpc3RlZC5cbiAgICBmb3IgKGNvbnN0IG8gb2YgdGhpcy5kZXNjcmlwdGlvbi5vcHRpb25zKSB7XG4gICAgICBpZiAoby51c2VyQW5hbHl0aWNzICYmICFpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyhidWlsZGVyQ29uZikpIHtcbiAgICAgICAgby51c2VyQW5hbHl0aWNzID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgd2Fybk9uTWlzc2luZ05vZGVNb2R1bGVzKGJhc2VQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAvLyBDaGVjayBmb3IgYSBgbm9kZV9tb2R1bGVzYCBkaXJlY3RvcnkgKG5wbSwgeWFybiBub24tUG5QLCBldGMuKVxuICAgIGlmIChleGlzdHNTeW5jKHBhdGgucmVzb2x2ZShiYXNlUGF0aCwgJ25vZGVfbW9kdWxlcycpKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciB5YXJuIFBuUCBmaWxlc1xuICAgIGlmIChcbiAgICAgIGV4aXN0c1N5bmMocGF0aC5yZXNvbHZlKGJhc2VQYXRoLCAnLnBucC5qcycpKSB8fFxuICAgICAgZXhpc3RzU3luYyhwYXRoLnJlc29sdmUoYmFzZVBhdGgsICcucG5wLmNqcycpKSB8fFxuICAgICAgZXhpc3RzU3luYyhwYXRoLnJlc29sdmUoYmFzZVBhdGgsICcucG5wLm1qcycpKVxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHBhY2thZ2VNYW5hZ2VyID0gYXdhaXQgZ2V0UGFja2FnZU1hbmFnZXIoYmFzZVBhdGgpO1xuICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICBgTm9kZSBwYWNrYWdlcyBtYXkgbm90IGJlIGluc3RhbGxlZC4gVHJ5IGluc3RhbGxpbmcgd2l0aCAnJHtwYWNrYWdlTWFuYWdlcn0gaW5zdGFsbCcuYCxcbiAgICApO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zICYgQXJndW1lbnRzKSB7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1blNpbmdsZVRhcmdldCh0YXJnZXQ6IFRhcmdldCwgdGFyZ2V0T3B0aW9uczogc3RyaW5nW10pIHtcbiAgICAvLyBXZSBuZWVkIHRvIGJ1aWxkIHRoZSBidWlsZGVyU3BlYyB0d2ljZSBiZWNhdXNlIGFyY2hpdGVjdCBkb2VzIG5vdCB1bmRlcnN0YW5kXG4gICAgLy8gb3ZlcnJpZGVzIHNlcGFyYXRlbHkgKGdldHRpbmcgdGhlIGNvbmZpZ3VyYXRpb24gYnVpbGRzIHRoZSB3aG9sZSBwcm9qZWN0LCBpbmNsdWRpbmdcbiAgICAvLyBvdmVycmlkZXMpLlxuICAgIGNvbnN0IGJ1aWxkZXJDb25mID0gYXdhaXQgdGhpcy5fYXJjaGl0ZWN0SG9zdC5nZXRCdWlsZGVyTmFtZUZvclRhcmdldCh0YXJnZXQpO1xuICAgIGxldCBidWlsZGVyRGVzYztcbiAgICB0cnkge1xuICAgICAgYnVpbGRlckRlc2MgPSBhd2FpdCB0aGlzLl9hcmNoaXRlY3RIb3N0LnJlc29sdmVCdWlsZGVyKGJ1aWxkZXJDb25mKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgYXdhaXQgdGhpcy53YXJuT25NaXNzaW5nTm9kZU1vZHVsZXModGhpcy53b3Jrc3BhY2UhLmJhc2VQYXRoKTtcbiAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYENvdWxkIG5vdCBmaW5kIHRoZSAnJHtidWlsZGVyQ29uZn0nIGJ1aWxkZXIncyBub2RlIHBhY2thZ2UuYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgICBjb25zdCB0YXJnZXRPcHRpb25BcnJheSA9IGF3YWl0IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyhcbiAgICAgIHRoaXMuX3JlZ2lzdHJ5LFxuICAgICAgYnVpbGRlckRlc2Mub3B0aW9uU2NoZW1hIGFzIGpzb24uSnNvbk9iamVjdCxcbiAgICApO1xuICAgIGNvbnN0IG92ZXJyaWRlcyA9IHBhcnNlQXJndW1lbnRzKHRhcmdldE9wdGlvbnMsIHRhcmdldE9wdGlvbkFycmF5LCB0aGlzLmxvZ2dlcik7XG5cbiAgICBjb25zdCBhbGxvd0FkZGl0aW9uYWxQcm9wZXJ0aWVzID1cbiAgICAgIHR5cGVvZiBidWlsZGVyRGVzYy5vcHRpb25TY2hlbWEgPT09ICdvYmplY3QnICYmIGJ1aWxkZXJEZXNjLm9wdGlvblNjaGVtYS5hZGRpdGlvbmFsUHJvcGVydGllcztcblxuICAgIGlmIChvdmVycmlkZXNbJy0tJ10gJiYgIWFsbG93QWRkaXRpb25hbFByb3BlcnRpZXMpIHtcbiAgICAgIChvdmVycmlkZXNbJy0tJ10gfHwgW10pLmZvckVhY2goKGFkZGl0aW9uYWwpID0+IHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYFVua25vd24gb3B0aW9uOiAnJHthZGRpdGlvbmFsLnNwbGl0KC89LylbMF19J2ApO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucmVwb3J0QW5hbHl0aWNzKFt0aGlzLmRlc2NyaXB0aW9uLm5hbWVdLCB7XG4gICAgICAuLi4oKGF3YWl0IHRoaXMuX2FyY2hpdGVjdEhvc3QuZ2V0T3B0aW9uc0ZvclRhcmdldCh0YXJnZXQpKSBhcyB1bmtub3duIGFzIFQpLFxuICAgICAgLi4ub3ZlcnJpZGVzLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcnVuID0gYXdhaXQgdGhpcy5fYXJjaGl0ZWN0LnNjaGVkdWxlVGFyZ2V0KHRhcmdldCwgb3ZlcnJpZGVzIGFzIGpzb24uSnNvbk9iamVjdCwge1xuICAgICAgbG9nZ2VyOiB0aGlzLmxvZ2dlcixcbiAgICAgIGFuYWx5dGljczogaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MoYnVpbGRlckNvbmYpID8gdGhpcy5hbmFseXRpY3MgOiB1bmRlZmluZWQsXG4gICAgfSk7XG5cbiAgICBjb25zdCB7IGVycm9yLCBzdWNjZXNzIH0gPSBhd2FpdCBydW4ub3V0cHV0LnRvUHJvbWlzZSgpO1xuICAgIGF3YWl0IHJ1bi5zdG9wKCk7XG5cbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGVycm9yKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VjY2VzcyA/IDAgOiAxO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1bkFyY2hpdGVjdFRhcmdldChcbiAgICBvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyAmIEFyZ3VtZW50cyxcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBleHRyYSA9IG9wdGlvbnNbJy0tJ10gfHwgW107XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgdGFyZ2V0U3BlYyA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgICBpZiAoIXRhcmdldFNwZWMucHJvamVjdCAmJiB0aGlzLnRhcmdldCkge1xuICAgICAgICAvLyBUaGlzIHJ1bnMgZWFjaCB0YXJnZXQgc2VxdWVudGlhbGx5LlxuICAgICAgICAvLyBSdW5uaW5nIHRoZW0gaW4gcGFyYWxsZWwgd291bGQganVtYmxlIHRoZSBsb2cgbWVzc2FnZXMuXG4gICAgICAgIGxldCByZXN1bHQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IHByb2plY3Qgb2YgdGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0aGlzLnRhcmdldCkpIHtcbiAgICAgICAgICByZXN1bHQgfD0gYXdhaXQgdGhpcy5ydW5TaW5nbGVUYXJnZXQoeyAuLi50YXJnZXRTcGVjLCBwcm9qZWN0IH0gYXMgVGFyZ2V0LCBleHRyYSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuU2luZ2xlVGFyZ2V0KHRhcmdldFNwZWMsIGV4dHJhKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKSB7XG4gICAgICAgIGNvbnN0IG5ld0Vycm9yczogc2NoZW1hLlNjaGVtYVZhbGlkYXRvckVycm9yW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBzY2hlbWFFcnJvciBvZiBlLmVycm9ycykge1xuICAgICAgICAgIGlmIChzY2hlbWFFcnJvci5rZXl3b3JkID09PSAnYWRkaXRpb25hbFByb3BlcnRpZXMnKSB7XG4gICAgICAgICAgICBjb25zdCB1bmtub3duUHJvcGVydHkgPSBzY2hlbWFFcnJvci5wYXJhbXM/LmFkZGl0aW9uYWxQcm9wZXJ0eTtcbiAgICAgICAgICAgIGlmICh1bmtub3duUHJvcGVydHkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgICBjb25zdCBkYXNoZXMgPSB1bmtub3duUHJvcGVydHkubGVuZ3RoID09PSAxID8gJy0nIDogJy0tJztcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYFVua25vd24gb3B0aW9uOiAnJHtkYXNoZXN9JHt1bmtub3duUHJvcGVydHl9J2ApO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3RXJyb3JzLnB1c2goc2NoZW1hRXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5ld0Vycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IobmV3IHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKG5ld0Vycm9ycykubWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0YXJnZXROYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lOiBzdHJpbmdbXSA9IFtdO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgZm9yIChjb25zdCBbbmFtZSwgcHJvamVjdF0gb2YgdGhpcy53b3Jrc3BhY2UhLnByb2plY3RzKSB7XG4gICAgICBpZiAocHJvamVjdC50YXJnZXRzLmhhcyh0YXJnZXROYW1lKSkge1xuICAgICAgICBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUucHVzaChuYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5tdWx0aVRhcmdldCkge1xuICAgICAgLy8gRm9yIG11bHRpIHRhcmdldCBjb21tYW5kcywgd2UgYWx3YXlzIGxpc3QgYWxsIHByb2plY3RzIHRoYXQgaGF2ZSB0aGUgdGFyZ2V0LlxuICAgICAgcmV0dXJuIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRm9yIHNpbmdsZSB0YXJnZXQgY29tbWFuZHMsIHdlIHRyeSB0aGUgZGVmYXVsdCBwcm9qZWN0IGZpcnN0LFxuICAgICAgLy8gdGhlbiB0aGUgZnVsbCBsaXN0IGlmIGl0IGhhcyBhIHNpbmdsZSBwcm9qZWN0LCB0aGVuIGVycm9yIG91dC5cbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICBjb25zdCBtYXliZURlZmF1bHRQcm9qZWN0ID0gdGhpcy53b3Jrc3BhY2UhLmV4dGVuc2lvbnNbJ2RlZmF1bHRQcm9qZWN0J10gYXMgc3RyaW5nO1xuICAgICAgaWYgKG1heWJlRGVmYXVsdFByb2plY3QgJiYgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmluY2x1ZGVzKG1heWJlRGVmYXVsdFByb2plY3QpKSB7XG4gICAgICAgIHJldHVybiBbbWF5YmVEZWZhdWx0UHJvamVjdF07XG4gICAgICB9XG5cbiAgICAgIGlmIChhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWU7XG4gICAgICB9XG5cbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGRldGVybWluZSBhIHNpbmdsZSBwcm9qZWN0IGZvciB0aGUgJyR7dGFyZ2V0TmFtZX0nIHRhcmdldC5gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9tYWtlVGFyZ2V0U3BlY2lmaWVyKGNvbW1hbmRPcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyk6IFRhcmdldCB7XG4gICAgbGV0IHByb2plY3QsIHRhcmdldCwgY29uZmlndXJhdGlvbjtcblxuICAgIGlmIChjb21tYW5kT3B0aW9ucy50YXJnZXQpIHtcbiAgICAgIFtwcm9qZWN0LCB0YXJnZXQsIGNvbmZpZ3VyYXRpb25dID0gY29tbWFuZE9wdGlvbnMudGFyZ2V0LnNwbGl0KCc6Jyk7XG5cbiAgICAgIGlmIChjb21tYW5kT3B0aW9ucy5jb25maWd1cmF0aW9uKSB7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24gPSBjb21tYW5kT3B0aW9ucy5jb25maWd1cmF0aW9uO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwcm9qZWN0ID0gY29tbWFuZE9wdGlvbnMucHJvamVjdDtcbiAgICAgIHRhcmdldCA9IHRoaXMudGFyZ2V0O1xuICAgICAgaWYgKGNvbW1hbmRPcHRpb25zLmNvbmZpZ3VyYXRpb24pIHtcbiAgICAgICAgY29uZmlndXJhdGlvbiA9IGAke2NvbmZpZ3VyYXRpb24gPyBgJHtjb25maWd1cmF0aW9ufSxgIDogJyd9JHtcbiAgICAgICAgICBjb21tYW5kT3B0aW9ucy5jb25maWd1cmF0aW9uXG4gICAgICAgIH1gO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgcHJvamVjdCA9ICcnO1xuICAgIH1cbiAgICBpZiAoIXRhcmdldCkge1xuICAgICAgdGFyZ2V0ID0gJyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2plY3QsXG4gICAgICBjb25maWd1cmF0aW9uOiBjb25maWd1cmF0aW9uIHx8ICcnLFxuICAgICAgdGFyZ2V0LFxuICAgIH07XG4gIH1cbn1cbiJdfQ==