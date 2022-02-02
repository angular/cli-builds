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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvYXJjaGl0ZWN0LWNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHlEQUE4RDtBQUM5RCx5REFBbUY7QUFDbkYsK0NBQTBEO0FBQzFELDJCQUFnQztBQUNoQywyQ0FBNkI7QUFDN0IsMERBQW9FO0FBQ3BFLGtFQUFpRTtBQUNqRSwyQ0FBNEQ7QUFDNUQsdUNBQXdEO0FBRXhELHFDQUEwQztBQVMxQyxNQUFzQixnQkFFcEIsU0FBUSxpQkFBVTtJQUZwQjs7UUFNOEIsdUJBQWtCLEdBQUcsS0FBSyxDQUFDO1FBRXZELHFEQUFxRDtRQUMzQyxnQkFBVyxHQUFHLEtBQUssQ0FBQztJQXdaaEMsQ0FBQztJQW5aVyxLQUFLLENBQUMsZUFBZSxDQUFDLFdBQW9CO1FBQ2xELElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFO1lBQzNCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBRTNDLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFFRCxJQUFJLFdBQVcsRUFBRTtZQUNmLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksV0FBVywyQkFBMkIsSUFBSSxDQUFDLE1BQU0sV0FBVyxDQUFDLENBQUM7U0FDN0Y7YUFBTTtZQUNMLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLDRCQUE0QixJQUFJLENBQUMsTUFBTSxXQUFXLENBQUMsQ0FBQztTQUN2RTtRQUVELE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztJQUVELGtEQUFrRDtJQUNsQyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQXNCO1FBQ3JELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxX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LE1BQU0sSUFBSSxLQUFLLENBQUMsaURBQWlELFVBQVUsV0FBVyxDQUFDLENBQUM7U0FDekY7SUFDSCxDQUFDO0lBRU8sb0JBQW9CLENBQUMsY0FBdUM7UUFDbEUsSUFBSSxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQztRQUVuQyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUU7WUFDekIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRXBFLElBQUksY0FBYyxDQUFDLGFBQWEsRUFBRTtnQkFDaEMsYUFBYSxHQUFHLGNBQWMsQ0FBQyxhQUFhLENBQUM7YUFDOUM7U0FDRjthQUFNO1lBQ0wsT0FBTyxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUM7WUFDakMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDckIsSUFBSSxjQUFjLENBQUMsYUFBYSxFQUFFO2dCQUNoQyxhQUFhLEdBQUcsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FDekQsY0FBYyxDQUFDLGFBQ2pCLEVBQUUsQ0FBQzthQUNKO1NBQ0Y7UUFFRCxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osT0FBTyxHQUFHLEVBQUUsQ0FBQztTQUNkO1FBQ0QsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE1BQU0sR0FBRyxFQUFFLENBQUM7U0FDYjtRQUVELE9BQU87WUFDTCxPQUFPO1lBQ1AsYUFBYSxFQUFFLGFBQWEsSUFBSSxFQUFFO1lBQ2xDLE1BQU07U0FDUCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBamFELDRDQWlhQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBBcmNoaXRlY3QsIFRhcmdldCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgV29ya3NwYWNlTm9kZU1vZHVsZXNBcmNoaXRlY3RIb3N0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdC9ub2RlJztcbmltcG9ydCB7IGpzb24sIHNjaGVtYSwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7IGdldFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWFuYWdlcic7XG5pbXBvcnQgeyBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyB9IGZyb20gJy4vYW5hbHl0aWNzJztcbmltcG9ydCB7IEJhc2VDb21tYW5kT3B0aW9ucywgQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZCc7XG5pbXBvcnQgeyBBcmd1bWVudHMsIE9wdGlvbiB9IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB7IHBhcnNlQXJndW1lbnRzIH0gZnJvbSAnLi9wYXJzZXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFyY2hpdGVjdENvbW1hbmRPcHRpb25zIGV4dGVuZHMgQmFzZUNvbW1hbmRPcHRpb25zIHtcbiAgcHJvamVjdD86IHN0cmluZztcbiAgY29uZmlndXJhdGlvbj86IHN0cmluZztcbiAgcHJvZD86IGJvb2xlYW47XG4gIHRhcmdldD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFyY2hpdGVjdENvbW1hbmQ8XG4gIFQgZXh0ZW5kcyBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyA9IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zLFxuPiBleHRlbmRzIENvbW1hbmQ8VD4ge1xuICBwcm90ZWN0ZWQgX2FyY2hpdGVjdCE6IEFyY2hpdGVjdDtcbiAgcHJvdGVjdGVkIF9hcmNoaXRlY3RIb3N0ITogV29ya3NwYWNlTm9kZU1vZHVsZXNBcmNoaXRlY3RIb3N0O1xuICBwcm90ZWN0ZWQgX3JlZ2lzdHJ5IToganNvbi5zY2hlbWEuU2NoZW1hUmVnaXN0cnk7XG4gIHByb3RlY3RlZCBvdmVycmlkZSByZWFkb25seSB1c2VSZXBvcnRBbmFseXRpY3MgPSBmYWxzZTtcblxuICAvLyBJZiB0aGlzIGNvbW1hbmQgc3VwcG9ydHMgcnVubmluZyBtdWx0aXBsZSB0YXJnZXRzLlxuICBwcm90ZWN0ZWQgbXVsdGlUYXJnZXQgPSBmYWxzZTtcblxuICB0YXJnZXQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgbWlzc2luZ1RhcmdldEVycm9yOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgcHJvdGVjdGVkIGFzeW5jIG9uTWlzc2luZ1RhcmdldChwcm9qZWN0TmFtZT86IHN0cmluZyk6IFByb21pc2U8dm9pZCB8IG51bWJlcj4ge1xuICAgIGlmICh0aGlzLm1pc3NpbmdUYXJnZXRFcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZmF0YWwodGhpcy5taXNzaW5nVGFyZ2V0RXJyb3IpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBpZiAocHJvamVjdE5hbWUpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGBQcm9qZWN0ICcke3Byb2plY3ROYW1lfScgZG9lcyBub3Qgc3VwcG9ydCB0aGUgJyR7dGhpcy50YXJnZXR9JyB0YXJnZXQuYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGBObyBwcm9qZWN0cyBzdXBwb3J0IHRoZSAnJHt0aGlzLnRhcmdldH0nIHRhcmdldC5gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGluZXMtcGVyLWZ1bmN0aW9uXG4gIHB1YmxpYyBvdmVycmlkZSBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IFQgJiBBcmd1bWVudHMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICB0aGlzLl9yZWdpc3RyeSA9IG5ldyBqc29uLnNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoKTtcbiAgICB0aGlzLl9yZWdpc3RyeS5hZGRQb3N0VHJhbnNmb3JtKGpzb24uc2NoZW1hLnRyYW5zZm9ybXMuYWRkVW5kZWZpbmVkRGVmYXVsdHMpO1xuICAgIHRoaXMuX3JlZ2lzdHJ5LnVzZVhEZXByZWNhdGVkUHJvdmlkZXIoKG1zZykgPT4gdGhpcy5sb2dnZXIud2Fybihtc2cpKTtcblxuICAgIGlmICghdGhpcy53b3Jrc3BhY2UpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKCdBIHdvcmtzcGFjZSBpcyByZXF1aXJlZCBmb3IgdGhpcyBjb21tYW5kLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICB0aGlzLl9hcmNoaXRlY3RIb3N0ID0gbmV3IFdvcmtzcGFjZU5vZGVNb2R1bGVzQXJjaGl0ZWN0SG9zdChcbiAgICAgIHRoaXMud29ya3NwYWNlLFxuICAgICAgdGhpcy53b3Jrc3BhY2UuYmFzZVBhdGgsXG4gICAgKTtcbiAgICB0aGlzLl9hcmNoaXRlY3QgPSBuZXcgQXJjaGl0ZWN0KHRoaXMuX2FyY2hpdGVjdEhvc3QsIHRoaXMuX3JlZ2lzdHJ5KTtcblxuICAgIGlmICghdGhpcy50YXJnZXQpIHtcbiAgICAgIGlmIChvcHRpb25zLmhlbHApIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBqdXN0IHJldHVybi5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzcGVjaWZpZXIgPSB0aGlzLl9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnMpO1xuICAgICAgaWYgKCFzcGVjaWZpZXIucHJvamVjdCB8fCAhc3BlY2lmaWVyLnRhcmdldCkge1xuICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbCgnQ2Fubm90IGRldGVybWluZSBwcm9qZWN0IG9yIHRhcmdldCBmb3IgY29tbWFuZC4nKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBwcm9qZWN0TmFtZSA9IG9wdGlvbnMucHJvamVjdDtcbiAgICBpZiAocHJvamVjdE5hbWUgJiYgIXRoaXMud29ya3NwYWNlLnByb2plY3RzLmhhcyhwcm9qZWN0TmFtZSkpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGBQcm9qZWN0ICcke3Byb2plY3ROYW1lfScgZG9lcyBub3QgZXhpc3QuYCk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbW1hbmRMZWZ0b3ZlcnMgPSBvcHRpb25zWyctLSddO1xuICAgIGNvbnN0IHRhcmdldFByb2plY3ROYW1lczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBwcm9qZWN0XSBvZiB0aGlzLndvcmtzcGFjZS5wcm9qZWN0cykge1xuICAgICAgaWYgKHByb2plY3QudGFyZ2V0cy5oYXModGhpcy50YXJnZXQpKSB7XG4gICAgICAgIHRhcmdldFByb2plY3ROYW1lcy5wdXNoKG5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwcm9qZWN0TmFtZSAmJiAhdGFyZ2V0UHJvamVjdE5hbWVzLmluY2x1ZGVzKHByb2plY3ROYW1lKSkge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMub25NaXNzaW5nVGFyZ2V0KHByb2plY3ROYW1lKTtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0UHJvamVjdE5hbWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMub25NaXNzaW5nVGFyZ2V0KCk7XG4gICAgfVxuXG4gICAgaWYgKCFwcm9qZWN0TmFtZSAmJiBjb21tYW5kTGVmdG92ZXJzICYmIGNvbW1hbmRMZWZ0b3ZlcnMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgYnVpbGRlck5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICBjb25zdCBsZWZ0b3Zlck1hcCA9IG5ldyBNYXA8c3RyaW5nLCB7IG9wdGlvbkRlZnM6IE9wdGlvbltdOyBwYXJzZWRPcHRpb25zOiBBcmd1bWVudHMgfT4oKTtcbiAgICAgIGxldCBwb3RlbnRpYWxQcm9qZWN0TmFtZXMgPSBuZXcgU2V0PHN0cmluZz4odGFyZ2V0UHJvamVjdE5hbWVzKTtcbiAgICAgIGZvciAoY29uc3QgbmFtZSBvZiB0YXJnZXRQcm9qZWN0TmFtZXMpIHtcbiAgICAgICAgY29uc3QgYnVpbGRlck5hbWUgPSBhd2FpdCB0aGlzLl9hcmNoaXRlY3RIb3N0LmdldEJ1aWxkZXJOYW1lRm9yVGFyZ2V0KHtcbiAgICAgICAgICBwcm9qZWN0OiBuYW1lLFxuICAgICAgICAgIHRhcmdldDogdGhpcy50YXJnZXQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh0aGlzLm11bHRpVGFyZ2V0KSB7XG4gICAgICAgICAgYnVpbGRlck5hbWVzLmFkZChidWlsZGVyTmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgYnVpbGRlckRlc2M7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYnVpbGRlckRlc2MgPSBhd2FpdCB0aGlzLl9hcmNoaXRlY3RIb3N0LnJlc29sdmVCdWlsZGVyKGJ1aWxkZXJOYW1lKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy53YXJuT25NaXNzaW5nTm9kZU1vZHVsZXModGhpcy53b3Jrc3BhY2UuYmFzZVBhdGgpO1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYENvdWxkIG5vdCBmaW5kIHRoZSAnJHtidWlsZGVyTmFtZX0nIGJ1aWxkZXIncyBub2RlIHBhY2thZ2UuYCk7XG5cbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0aW9uRGVmcyA9IGF3YWl0IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyhcbiAgICAgICAgICB0aGlzLl9yZWdpc3RyeSxcbiAgICAgICAgICBidWlsZGVyRGVzYy5vcHRpb25TY2hlbWEgYXMganNvbi5Kc29uT2JqZWN0LFxuICAgICAgICApO1xuICAgICAgICBjb25zdCBwYXJzZWRPcHRpb25zID0gcGFyc2VBcmd1bWVudHMoWy4uLmNvbW1hbmRMZWZ0b3ZlcnNdLCBvcHRpb25EZWZzKTtcbiAgICAgICAgY29uc3QgYnVpbGRlckxlZnRvdmVycyA9IHBhcnNlZE9wdGlvbnNbJy0tJ10gfHwgW107XG4gICAgICAgIGxlZnRvdmVyTWFwLnNldChuYW1lLCB7IG9wdGlvbkRlZnMsIHBhcnNlZE9wdGlvbnMgfSk7XG5cbiAgICAgICAgcG90ZW50aWFsUHJvamVjdE5hbWVzID0gbmV3IFNldChcbiAgICAgICAgICBidWlsZGVyTGVmdG92ZXJzLmZpbHRlcigoeCkgPT4gcG90ZW50aWFsUHJvamVjdE5hbWVzLmhhcyh4KSksXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmIChwb3RlbnRpYWxQcm9qZWN0TmFtZXMuc2l6ZSA9PT0gMSkge1xuICAgICAgICBwcm9qZWN0TmFtZSA9IFsuLi5wb3RlbnRpYWxQcm9qZWN0TmFtZXNdWzBdO1xuXG4gICAgICAgIC8vIHJlbW92ZSB0aGUgcHJvamVjdCBuYW1lIGZyb20gdGhlIGxlZnRvdmVyc1xuICAgICAgICBjb25zdCBvcHRpb25JbmZvID0gbGVmdG92ZXJNYXAuZ2V0KHByb2plY3ROYW1lKTtcbiAgICAgICAgaWYgKG9wdGlvbkluZm8pIHtcbiAgICAgICAgICBjb25zdCBsb2NhdGlvbnMgPSBbXTtcbiAgICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgICAgd2hpbGUgKGkgPCBjb21tYW5kTGVmdG92ZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgaSA9IGNvbW1hbmRMZWZ0b3ZlcnMuaW5kZXhPZihwcm9qZWN0TmFtZSwgaSArIDEpO1xuICAgICAgICAgICAgaWYgKGkgPT09IC0xKSB7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbG9jYXRpb25zLnB1c2goaSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlbGV0ZSBvcHRpb25JbmZvLnBhcnNlZE9wdGlvbnNbJy0tJ107XG4gICAgICAgICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiBsb2NhdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBMZWZ0b3ZlcnMgPSBbLi4uY29tbWFuZExlZnRvdmVyc107XG4gICAgICAgICAgICB0ZW1wTGVmdG92ZXJzLnNwbGljZShsb2NhdGlvbiwgMSk7XG4gICAgICAgICAgICBjb25zdCB0ZW1wQXJncyA9IHBhcnNlQXJndW1lbnRzKFsuLi50ZW1wTGVmdG92ZXJzXSwgb3B0aW9uSW5mby5vcHRpb25EZWZzKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0ZW1wQXJnc1snLS0nXTtcbiAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShvcHRpb25JbmZvLnBhcnNlZE9wdGlvbnMpID09PSBKU09OLnN0cmluZ2lmeSh0ZW1wQXJncykpIHtcbiAgICAgICAgICAgICAgb3B0aW9uc1snLS0nXSA9IHRlbXBMZWZ0b3ZlcnM7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIXByb2plY3ROYW1lICYmIHRoaXMubXVsdGlUYXJnZXQgJiYgYnVpbGRlck5hbWVzLnNpemUgPiAxKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICBBcmNoaXRlY3QgY29tbWFuZHMgd2l0aCBjb21tYW5kIGxpbmUgb3ZlcnJpZGVzIGNhbm5vdCB0YXJnZXQgZGlmZmVyZW50IGJ1aWxkZXJzLiBUaGVcbiAgICAgICAgICAnJHt0aGlzLnRhcmdldH0nIHRhcmdldCB3b3VsZCBydW4gb24gcHJvamVjdHMgJHt0YXJnZXRQcm9qZWN0TmFtZXMuam9pbigpfSB3aGljaCBoYXZlIHRoZVxuICAgICAgICAgIGZvbGxvd2luZyBidWlsZGVyczogJHsnXFxuICAnICsgWy4uLmJ1aWxkZXJOYW1lc10uam9pbignXFxuICAnKX1cbiAgICAgICAgYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwcm9qZWN0TmFtZSAmJiAhdGhpcy5tdWx0aVRhcmdldCkge1xuICAgICAgY29uc3QgZGVmYXVsdFByb2plY3ROYW1lID0gdGhpcy53b3Jrc3BhY2UuZXh0ZW5zaW9uc1snZGVmYXVsdFByb2plY3QnXSBhcyBzdHJpbmc7XG4gICAgICBpZiAodGFyZ2V0UHJvamVjdE5hbWVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBwcm9qZWN0TmFtZSA9IHRhcmdldFByb2plY3ROYW1lc1swXTtcbiAgICAgIH0gZWxzZSBpZiAoZGVmYXVsdFByb2plY3ROYW1lICYmIHRhcmdldFByb2plY3ROYW1lcy5pbmNsdWRlcyhkZWZhdWx0UHJvamVjdE5hbWUpKSB7XG4gICAgICAgIHByb2plY3ROYW1lID0gZGVmYXVsdFByb2plY3ROYW1lO1xuICAgICAgfSBlbHNlIGlmIChvcHRpb25zLmhlbHApIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBqdXN0IHJldHVybi5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoXG4gICAgICAgICAgdGhpcy5taXNzaW5nVGFyZ2V0RXJyb3IgfHwgJ0Nhbm5vdCBkZXRlcm1pbmUgcHJvamVjdCBvciB0YXJnZXQgZm9yIGNvbW1hbmQuJyxcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBvcHRpb25zLnByb2plY3QgPSBwcm9qZWN0TmFtZTtcblxuICAgIGNvbnN0IGJ1aWxkZXJDb25mID0gYXdhaXQgdGhpcy5fYXJjaGl0ZWN0SG9zdC5nZXRCdWlsZGVyTmFtZUZvclRhcmdldCh7XG4gICAgICBwcm9qZWN0OiBwcm9qZWN0TmFtZSB8fCAodGFyZ2V0UHJvamVjdE5hbWVzLmxlbmd0aCA+IDAgPyB0YXJnZXRQcm9qZWN0TmFtZXNbMF0gOiAnJyksXG4gICAgICB0YXJnZXQ6IHRoaXMudGFyZ2V0LFxuICAgIH0pO1xuXG4gICAgbGV0IGJ1aWxkZXJEZXNjO1xuICAgIHRyeSB7XG4gICAgICBidWlsZGVyRGVzYyA9IGF3YWl0IHRoaXMuX2FyY2hpdGVjdEhvc3QucmVzb2x2ZUJ1aWxkZXIoYnVpbGRlckNvbmYpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICBhd2FpdCB0aGlzLndhcm5Pbk1pc3NpbmdOb2RlTW9kdWxlcyh0aGlzLndvcmtzcGFjZS5iYXNlUGF0aCk7XG4gICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGBDb3VsZCBub3QgZmluZCB0aGUgJyR7YnVpbGRlckNvbmZ9JyBidWlsZGVyJ3Mgbm9kZSBwYWNrYWdlLmApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMucHVzaChcbiAgICAgIC4uLihhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMoXG4gICAgICAgIHRoaXMuX3JlZ2lzdHJ5LFxuICAgICAgICBidWlsZGVyRGVzYy5vcHRpb25TY2hlbWEgYXMganNvbi5Kc29uT2JqZWN0LFxuICAgICAgKSksXG4gICAgKTtcblxuICAgIC8vIFVwZGF0ZSBvcHRpb25zIHRvIHJlbW92ZSBhbmFseXRpY3MgZnJvbSBvcHRpb25zIGlmIHRoZSBidWlsZGVyIGlzbid0IHNhZmVsaXN0ZWQuXG4gICAgZm9yIChjb25zdCBvIG9mIHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucykge1xuICAgICAgaWYgKG8udXNlckFuYWx5dGljcyAmJiAhaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MoYnVpbGRlckNvbmYpKSB7XG4gICAgICAgIG8udXNlckFuYWx5dGljcyA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHdhcm5Pbk1pc3NpbmdOb2RlTW9kdWxlcyhiYXNlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgLy8gQ2hlY2sgZm9yIGEgYG5vZGVfbW9kdWxlc2AgZGlyZWN0b3J5IChucG0sIHlhcm4gbm9uLVBuUCwgZXRjLilcbiAgICBpZiAoZXhpc3RzU3luYyhwYXRoLnJlc29sdmUoYmFzZVBhdGgsICdub2RlX21vZHVsZXMnKSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgeWFybiBQblAgZmlsZXNcbiAgICBpZiAoXG4gICAgICBleGlzdHNTeW5jKHBhdGgucmVzb2x2ZShiYXNlUGF0aCwgJy5wbnAuanMnKSkgfHxcbiAgICAgIGV4aXN0c1N5bmMocGF0aC5yZXNvbHZlKGJhc2VQYXRoLCAnLnBucC5janMnKSkgfHxcbiAgICAgIGV4aXN0c1N5bmMocGF0aC5yZXNvbHZlKGJhc2VQYXRoLCAnLnBucC5tanMnKSlcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlTWFuYWdlciA9IGF3YWl0IGdldFBhY2thZ2VNYW5hZ2VyKGJhc2VQYXRoKTtcbiAgICBsZXQgaW5zdGFsbFN1Z2dlc3Rpb24gPSAnVHJ5IGluc3RhbGxpbmcgd2l0aCAnO1xuICAgIHN3aXRjaCAocGFja2FnZU1hbmFnZXIpIHtcbiAgICAgIGNhc2UgJ25wbSc6XG4gICAgICAgIGluc3RhbGxTdWdnZXN0aW9uICs9IGAnbnBtIGluc3RhbGwnYDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICd5YXJuJzpcbiAgICAgICAgaW5zdGFsbFN1Z2dlc3Rpb24gKz0gYCd5YXJuJ2A7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaW5zdGFsbFN1Z2dlc3Rpb24gKz0gYHRoZSBwcm9qZWN0J3MgcGFja2FnZSBtYW5hZ2VyYDtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIud2FybihgTm9kZSBwYWNrYWdlcyBtYXkgbm90IGJlIGluc3RhbGxlZC4gJHtpbnN0YWxsU3VnZ2VzdGlvbn0uYCk7XG4gIH1cblxuICBhc3luYyBydW4ob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgJiBBcmd1bWVudHMpIHtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5ydW5BcmNoaXRlY3RUYXJnZXQob3B0aW9ucyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcnVuU2luZ2xlVGFyZ2V0KHRhcmdldDogVGFyZ2V0LCB0YXJnZXRPcHRpb25zOiBzdHJpbmdbXSkge1xuICAgIC8vIFdlIG5lZWQgdG8gYnVpbGQgdGhlIGJ1aWxkZXJTcGVjIHR3aWNlIGJlY2F1c2UgYXJjaGl0ZWN0IGRvZXMgbm90IHVuZGVyc3RhbmRcbiAgICAvLyBvdmVycmlkZXMgc2VwYXJhdGVseSAoZ2V0dGluZyB0aGUgY29uZmlndXJhdGlvbiBidWlsZHMgdGhlIHdob2xlIHByb2plY3QsIGluY2x1ZGluZ1xuICAgIC8vIG92ZXJyaWRlcykuXG4gICAgY29uc3QgYnVpbGRlckNvbmYgPSBhd2FpdCB0aGlzLl9hcmNoaXRlY3RIb3N0LmdldEJ1aWxkZXJOYW1lRm9yVGFyZ2V0KHRhcmdldCk7XG4gICAgbGV0IGJ1aWxkZXJEZXNjO1xuICAgIHRyeSB7XG4gICAgICBidWlsZGVyRGVzYyA9IGF3YWl0IHRoaXMuX2FyY2hpdGVjdEhvc3QucmVzb2x2ZUJ1aWxkZXIoYnVpbGRlckNvbmYpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICBhd2FpdCB0aGlzLndhcm5Pbk1pc3NpbmdOb2RlTW9kdWxlcyh0aGlzLndvcmtzcGFjZSEuYmFzZVBhdGgpO1xuICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChgQ291bGQgbm90IGZpbmQgdGhlICcke2J1aWxkZXJDb25mfScgYnVpbGRlcidzIG5vZGUgcGFja2FnZS5gKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICAgIGNvbnN0IHRhcmdldE9wdGlvbkFycmF5ID0gYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKFxuICAgICAgdGhpcy5fcmVnaXN0cnksXG4gICAgICBidWlsZGVyRGVzYy5vcHRpb25TY2hlbWEgYXMganNvbi5Kc29uT2JqZWN0LFxuICAgICk7XG4gICAgY29uc3Qgb3ZlcnJpZGVzID0gcGFyc2VBcmd1bWVudHModGFyZ2V0T3B0aW9ucywgdGFyZ2V0T3B0aW9uQXJyYXksIHRoaXMubG9nZ2VyKTtcblxuICAgIGNvbnN0IGFsbG93QWRkaXRpb25hbFByb3BlcnRpZXMgPVxuICAgICAgdHlwZW9mIGJ1aWxkZXJEZXNjLm9wdGlvblNjaGVtYSA9PT0gJ29iamVjdCcgJiYgYnVpbGRlckRlc2Mub3B0aW9uU2NoZW1hLmFkZGl0aW9uYWxQcm9wZXJ0aWVzO1xuXG4gICAgaWYgKG92ZXJyaWRlc1snLS0nXSAmJiAhYWxsb3dBZGRpdGlvbmFsUHJvcGVydGllcykge1xuICAgICAgKG92ZXJyaWRlc1snLS0nXSB8fCBbXSkuZm9yRWFjaCgoYWRkaXRpb25hbCkgPT4ge1xuICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChgVW5rbm93biBvcHRpb246ICcke2FkZGl0aW9uYWwuc3BsaXQoLz0vKVswXX0nYCk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5yZXBvcnRBbmFseXRpY3MoW3RoaXMuZGVzY3JpcHRpb24ubmFtZV0sIHtcbiAgICAgIC4uLigoYXdhaXQgdGhpcy5fYXJjaGl0ZWN0SG9zdC5nZXRPcHRpb25zRm9yVGFyZ2V0KHRhcmdldCkpIGFzIHVua25vd24gYXMgVCksXG4gICAgICAuLi5vdmVycmlkZXMsXG4gICAgfSk7XG5cbiAgICBjb25zdCBydW4gPSBhd2FpdCB0aGlzLl9hcmNoaXRlY3Quc2NoZWR1bGVUYXJnZXQodGFyZ2V0LCBvdmVycmlkZXMgYXMganNvbi5Kc29uT2JqZWN0LCB7XG4gICAgICBsb2dnZXI6IHRoaXMubG9nZ2VyLFxuICAgICAgYW5hbHl0aWNzOiBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyhidWlsZGVyQ29uZikgPyB0aGlzLmFuYWx5dGljcyA6IHVuZGVmaW5lZCxcbiAgICB9KTtcblxuICAgIGNvbnN0IHsgZXJyb3IsIHN1Y2Nlc3MgfSA9IGF3YWl0IHJ1bi5vdXRwdXQudG9Qcm9taXNlKCk7XG4gICAgYXdhaXQgcnVuLnN0b3AoKTtcblxuICAgIGlmIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoZXJyb3IpO1xuICAgIH1cblxuICAgIHJldHVybiBzdWNjZXNzID8gMCA6IDE7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcnVuQXJjaGl0ZWN0VGFyZ2V0KFxuICAgIG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zICYgQXJndW1lbnRzLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGV4dHJhID0gb3B0aW9uc1snLS0nXSB8fCBbXTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB0YXJnZXRTcGVjID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcbiAgICAgIGlmICghdGFyZ2V0U3BlYy5wcm9qZWN0ICYmIHRoaXMudGFyZ2V0KSB7XG4gICAgICAgIC8vIFRoaXMgcnVucyBlYWNoIHRhcmdldCBzZXF1ZW50aWFsbHkuXG4gICAgICAgIC8vIFJ1bm5pbmcgdGhlbSBpbiBwYXJhbGxlbCB3b3VsZCBqdW1ibGUgdGhlIGxvZyBtZXNzYWdlcy5cbiAgICAgICAgbGV0IHJlc3VsdCA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgcHJvamVjdCBvZiB0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRoaXMudGFyZ2V0KSkge1xuICAgICAgICAgIHJlc3VsdCB8PSBhd2FpdCB0aGlzLnJ1blNpbmdsZVRhcmdldCh7IC4uLnRhcmdldFNwZWMsIHByb2plY3QgfSBhcyBUYXJnZXQsIGV4dHJhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5ydW5TaW5nbGVUYXJnZXQodGFyZ2V0U3BlYywgZXh0cmEpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2Ygc2NoZW1hLlNjaGVtYVZhbGlkYXRpb25FeGNlcHRpb24pIHtcbiAgICAgICAgY29uc3QgbmV3RXJyb3JzOiBzY2hlbWEuU2NoZW1hVmFsaWRhdG9yRXJyb3JbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHNjaGVtYUVycm9yIG9mIGUuZXJyb3JzKSB7XG4gICAgICAgICAgaWYgKHNjaGVtYUVycm9yLmtleXdvcmQgPT09ICdhZGRpdGlvbmFsUHJvcGVydGllcycpIHtcbiAgICAgICAgICAgIGNvbnN0IHVua25vd25Qcm9wZXJ0eSA9IHNjaGVtYUVycm9yLnBhcmFtcz8uYWRkaXRpb25hbFByb3BlcnR5O1xuICAgICAgICAgICAgaWYgKHVua25vd25Qcm9wZXJ0eSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRhc2hlcyA9IHVua25vd25Qcm9wZXJ0eS5sZW5ndGggPT09IDEgPyAnLScgOiAnLS0nO1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChgVW5rbm93biBvcHRpb246ICcke2Rhc2hlc30ke3Vua25vd25Qcm9wZXJ0eX0nYCk7XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBuZXdFcnJvcnMucHVzaChzY2hlbWFFcnJvcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobmV3RXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihuZXcgc2NoZW1hLlNjaGVtYVZhbGlkYXRpb25FeGNlcHRpb24obmV3RXJyb3JzKS5tZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRhcmdldE5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWU6IHN0cmluZ1tdID0gW107XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBwcm9qZWN0XSBvZiB0aGlzLndvcmtzcGFjZSEucHJvamVjdHMpIHtcbiAgICAgIGlmIChwcm9qZWN0LnRhcmdldHMuaGFzKHRhcmdldE5hbWUpKSB7XG4gICAgICAgIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5wdXNoKG5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLm11bHRpVGFyZ2V0KSB7XG4gICAgICAvLyBGb3IgbXVsdGkgdGFyZ2V0IGNvbW1hbmRzLCB3ZSBhbHdheXMgbGlzdCBhbGwgcHJvamVjdHMgdGhhdCBoYXZlIHRoZSB0YXJnZXQuXG4gICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGb3Igc2luZ2xlIHRhcmdldCBjb21tYW5kcywgd2UgdHJ5IHRoZSBkZWZhdWx0IHByb2plY3QgZmlyc3QsXG4gICAgICAvLyB0aGVuIHRoZSBmdWxsIGxpc3QgaWYgaXQgaGFzIGEgc2luZ2xlIHByb2plY3QsIHRoZW4gZXJyb3Igb3V0LlxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgIGNvbnN0IG1heWJlRGVmYXVsdFByb2plY3QgPSB0aGlzLndvcmtzcGFjZSEuZXh0ZW5zaW9uc1snZGVmYXVsdFByb2plY3QnXSBhcyBzdHJpbmc7XG4gICAgICBpZiAobWF5YmVEZWZhdWx0UHJvamVjdCAmJiBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUuaW5jbHVkZXMobWF5YmVEZWZhdWx0UHJvamVjdCkpIHtcbiAgICAgICAgcmV0dXJuIFttYXliZURlZmF1bHRQcm9qZWN0XTtcbiAgICAgIH1cblxuICAgICAgaWYgKGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZGV0ZXJtaW5lIGEgc2luZ2xlIHByb2plY3QgZm9yIHRoZSAnJHt0YXJnZXROYW1lfScgdGFyZ2V0LmApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX21ha2VUYXJnZXRTcGVjaWZpZXIoY29tbWFuZE9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKTogVGFyZ2V0IHtcbiAgICBsZXQgcHJvamVjdCwgdGFyZ2V0LCBjb25maWd1cmF0aW9uO1xuXG4gICAgaWYgKGNvbW1hbmRPcHRpb25zLnRhcmdldCkge1xuICAgICAgW3Byb2plY3QsIHRhcmdldCwgY29uZmlndXJhdGlvbl0gPSBjb21tYW5kT3B0aW9ucy50YXJnZXQuc3BsaXQoJzonKTtcblxuICAgICAgaWYgKGNvbW1hbmRPcHRpb25zLmNvbmZpZ3VyYXRpb24pIHtcbiAgICAgICAgY29uZmlndXJhdGlvbiA9IGNvbW1hbmRPcHRpb25zLmNvbmZpZ3VyYXRpb247XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb2plY3QgPSBjb21tYW5kT3B0aW9ucy5wcm9qZWN0O1xuICAgICAgdGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG4gICAgICBpZiAoY29tbWFuZE9wdGlvbnMuY29uZmlndXJhdGlvbikge1xuICAgICAgICBjb25maWd1cmF0aW9uID0gYCR7Y29uZmlndXJhdGlvbiA/IGAke2NvbmZpZ3VyYXRpb259LGAgOiAnJ30ke1xuICAgICAgICAgIGNvbW1hbmRPcHRpb25zLmNvbmZpZ3VyYXRpb25cbiAgICAgICAgfWA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICBwcm9qZWN0ID0gJyc7XG4gICAgfVxuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICB0YXJnZXQgPSAnJztcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgcHJvamVjdCxcbiAgICAgIGNvbmZpZ3VyYXRpb246IGNvbmZpZ3VyYXRpb24gfHwgJycsXG4gICAgICB0YXJnZXQsXG4gICAgfTtcbiAgfVxufVxuIl19