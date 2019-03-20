"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const architect_1 = require("@angular-devkit/architect");
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const bep_1 = require("../utilities/bep");
const json_schema_1 = require("../utilities/json-schema");
const analytics_1 = require("./analytics");
const command_1 = require("./command");
const parser_1 = require("./parser");
const workspace_loader_1 = require("./workspace-loader");
class ArchitectCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this._host = new node_1.NodeJsSyncHost();
        // If this command supports running multiple targets.
        this.multiTarget = false;
    }
    async initialize(options) {
        await super.initialize(options);
        this._registry = new core_1.json.schema.CoreSchemaRegistry();
        this._registry.addPostTransform(core_1.json.schema.transforms.addUndefinedDefaults);
        await this._loadWorkspaceAndArchitect();
        if (!this.target) {
            if (options.help) {
                // This is a special case where we just return.
                return;
            }
            const specifier = this._makeTargetSpecifier(options);
            if (!specifier.project || !specifier.target) {
                throw new Error('Cannot determine project or target for command.');
            }
            return;
        }
        const commandLeftovers = options['--'];
        let projectName = options.project;
        const targetProjectNames = [];
        for (const name of this._workspace.listProjectNames()) {
            if (this._architect.listProjectTargets(name).includes(this.target)) {
                targetProjectNames.push(name);
            }
        }
        if (targetProjectNames.length === 0) {
            throw new Error(`No projects support the '${this.target}' target.`);
        }
        if (projectName && !targetProjectNames.includes(projectName)) {
            throw new Error(`Project '${projectName}' does not support the '${this.target}' target.`);
        }
        if (!projectName && commandLeftovers && commandLeftovers.length > 0) {
            const builderNames = new Set();
            const leftoverMap = new Map();
            let potentialProjectNames = new Set(targetProjectNames);
            for (const name of targetProjectNames) {
                const builderConfig = this._architect.getBuilderConfiguration({
                    project: name,
                    target: this.target,
                });
                if (this.multiTarget) {
                    builderNames.add(builderConfig.builder);
                }
                const builderDesc = await this._architect.getBuilderDescription(builderConfig).toPromise();
                const optionDefs = await json_schema_1.parseJsonSchemaToOptions(this._registry, builderDesc.schema);
                const parsedOptions = parser_1.parseArguments([...commandLeftovers], optionDefs);
                const builderLeftovers = parsedOptions['--'] || [];
                leftoverMap.set(name, { optionDefs, parsedOptions });
                potentialProjectNames = new Set(builderLeftovers.filter(x => potentialProjectNames.has(x)));
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
                        const tempArgs = parser_1.parseArguments([...tempLeftovers], optionInfo.optionDefs);
                        delete tempArgs['--'];
                        if (JSON.stringify(optionInfo.parsedOptions) === JSON.stringify(tempArgs)) {
                            options['--'] = tempLeftovers;
                            break;
                        }
                    }
                }
            }
            if (!projectName && this.multiTarget && builderNames.size > 1) {
                throw new Error(core_1.tags.oneLine `
          Architect commands with command line overrides cannot target different builders. The
          '${this.target}' target would run on projects ${targetProjectNames.join()} which have the
          following builders: ${'\n  ' + [...builderNames].join('\n  ')}
        `);
            }
        }
        if (!projectName && !this.multiTarget) {
            const defaultProjectName = this._workspace.getDefaultProjectName();
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
                throw new Error('Cannot determine project or target for command.');
            }
        }
        options.project = projectName;
        const builderConf = this._architect.getBuilderConfiguration({
            project: projectName || (targetProjectNames.length > 0 ? targetProjectNames[0] : ''),
            target: this.target,
        });
        const builderDesc = await this._architect.getBuilderDescription(builderConf).toPromise();
        this.description.options.push(...(await json_schema_1.parseJsonSchemaToOptions(this._registry, builderDesc.schema)));
        // Update options to remove analytics from options if the builder isn't safelisted.
        for (const o of this.description.options) {
            if (o.userAnalytics) {
                if (!analytics_1.isPackageNameSafeForAnalytics(builderDesc.name)) {
                    o.userAnalytics = undefined;
                }
            }
        }
    }
    async run(options) {
        return await this.runArchitectTarget(options);
    }
    async runBepTarget(command, configuration, buildEventLog) {
        const bep = new bep_1.BepJsonWriter(buildEventLog);
        // Send start
        bep.writeBuildStarted(command);
        let last = 1;
        let rebuild = false;
        await this._architect.run(configuration, { logger: this.logger }).forEach(event => {
            last = event.success ? 0 : 1;
            if (rebuild) {
                // NOTE: This will have an incorrect timestamp but this cannot be fixed
                //       until builders report additional status events
                bep.writeBuildStarted(command);
            }
            else {
                rebuild = true;
            }
            bep.writeBuildFinished(last);
        });
        return last;
    }
    async runSingleTarget(targetSpec, targetOptions, commandOptions) {
        // We need to build the builderSpec twice because architect does not understand
        // overrides separately (getting the configuration builds the whole project, including
        // overrides).
        const builderConf = this._architect.getBuilderConfiguration(targetSpec);
        const builderDesc = await this._architect.getBuilderDescription(builderConf).toPromise();
        const targetOptionArray = await json_schema_1.parseJsonSchemaToOptions(this._registry, builderDesc.schema);
        const overrides = parser_1.parseArguments(targetOptions, targetOptionArray, this.logger);
        if (overrides['--']) {
            (overrides['--'] || []).forEach(additional => {
                this.logger.fatal(`Unknown option: '${additional.split(/=/)[0]}'`);
            });
            return 1;
        }
        const realBuilderConf = this._architect.getBuilderConfiguration(Object.assign({}, targetSpec, { overrides }));
        const builderContext = {
            logger: this.logger,
            targetSpecifier: targetSpec,
        };
        if (commandOptions.buildEventLog && ['build', 'serve'].includes(this.description.name)) {
            // The build/serve commands supports BEP messaging
            this.logger.warn('BEP support is experimental and subject to change.');
            return this.runBepTarget(this.description.name, realBuilderConf, commandOptions.buildEventLog);
        }
        else {
            const result = await this._architect
                .run(realBuilderConf, builderContext)
                .toPromise();
            return result.success ? 0 : 1;
        }
    }
    async runArchitectTarget(options) {
        const extra = options['--'] || [];
        try {
            const targetSpec = this._makeTargetSpecifier(options);
            if (!targetSpec.project && this.target) {
                // This runs each target sequentially.
                // Running them in parallel would jumble the log messages.
                let result = 0;
                for (const project of this.getProjectNamesByTarget(this.target)) {
                    result |= await this.runSingleTarget(Object.assign({}, targetSpec, { project }), extra, options);
                }
                return result;
            }
            else {
                return await this.runSingleTarget(targetSpec, extra, options);
            }
        }
        catch (e) {
            if (e instanceof core_1.schema.SchemaValidationException) {
                const newErrors = [];
                for (const schemaError of e.errors) {
                    if (schemaError.keyword === 'additionalProperties') {
                        const unknownProperty = schemaError.params.additionalProperty;
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
        const allProjectsForTargetName = this._workspace.listProjectNames().map(projectName => this._architect.listProjectTargets(projectName).includes(targetName) ? projectName : null).filter(x => !!x);
        if (this.multiTarget) {
            // For multi target commands, we always list all projects that have the target.
            return allProjectsForTargetName;
        }
        else {
            // For single target commands, we try the default project first,
            // then the full list if it has a single project, then error out.
            const maybeDefaultProject = this._workspace.getDefaultProjectName();
            if (maybeDefaultProject && allProjectsForTargetName.includes(maybeDefaultProject)) {
                return [maybeDefaultProject];
            }
            if (allProjectsForTargetName.length === 1) {
                return allProjectsForTargetName;
            }
            throw new Error(`Could not determine a single project for the '${targetName}' target.`);
        }
    }
    async _loadWorkspaceAndArchitect() {
        const workspaceLoader = new workspace_loader_1.WorkspaceLoader(this._host);
        const workspace = await workspaceLoader.loadWorkspace(this.workspace.root);
        this._workspace = workspace;
        this._architect = await new architect_1.Architect(workspace).loadArchitect().toPromise();
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
            configuration = commandOptions.configuration;
            if (!configuration && commandOptions.prod) {
                configuration = 'production';
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
            configuration,
            target,
        };
    }
}
exports.ArchitectCommand = ArchitectCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILHlEQUttQztBQUNuQywrQ0FBd0U7QUFDeEUsb0RBQTJEO0FBQzNELDBDQUFpRDtBQUNqRCwwREFBb0U7QUFDcEUsMkNBQTREO0FBQzVELHVDQUF3RDtBQUV4RCxxQ0FBMEM7QUFDMUMseURBQXFEO0FBU3JELE1BQXNCLGdCQUVwQixTQUFRLGlCQUFnQztJQUYxQzs7UUFHVSxVQUFLLEdBQUcsSUFBSSxxQkFBYyxFQUFFLENBQUM7UUFLckMscURBQXFEO1FBQzNDLGdCQUFXLEdBQUcsS0FBSyxDQUFDO0lBcVVoQyxDQUFDO0lBalVRLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBNEM7UUFDbEUsTUFBTSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWhDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxXQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDdEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRTdFLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUM7UUFFeEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDaEIsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO2dCQUNoQiwrQ0FBK0M7Z0JBQy9DLE9BQU87YUFDUjtZQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNyRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUU7Z0JBQzNDLE1B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QUFDLENBQUM7UUFFM0UsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7UUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFNLElBQUkscUJBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUMvRSxDQUFDO0lBRU8sb0JBQW9CLENBQUMsY0FBdUM7UUFDbEUsSUFBSSxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQztRQUVuQyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUU7WUFDekIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRXBFLElBQUksY0FBYyxDQUFDLGFBQWEsRUFBRTtnQkFDaEMsYUFBYSxHQUFHLGNBQWMsQ0FBQyxhQUFhLENBQUM7YUFDOUM7U0FDRjthQUFNO1lBQ0wsT0FBTyxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUM7WUFDakMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDckIsYUFBYSxHQUFHLGNBQWMsQ0FBQyxhQUFhLENBQUM7WUFDN0MsSUFBSSxDQUFDLGFBQWEsSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFO2dCQUN6QyxhQUFhLEdBQUcsWUFBWSxDQUFDO2FBQzlCO1NBQ0Y7UUFFRCxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osT0FBTyxHQUFHLEVBQUUsQ0FBQztTQUNkO1FBQ0QsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE1BQU0sR0FBRyxFQUFFLENBQUM7U0FDYjtRQUVELE9BQU87WUFDTCxPQUFPO1lBQ1AsYUFBYTtZQUNiLE1BQU07U0FDUCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBOVVELDRDQThVQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIEFyY2hpdGVjdCxcbiAgQnVpbGRlckNvbmZpZ3VyYXRpb24sXG4gIEJ1aWxkZXJDb250ZXh0LFxuICBUYXJnZXRTcGVjaWZpZXIsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgZXhwZXJpbWVudGFsLCBqc29uLCBzY2hlbWEsIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBOb2RlSnNTeW5jSG9zdCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlL25vZGUnO1xuaW1wb3J0IHsgQmVwSnNvbldyaXRlciB9IGZyb20gJy4uL3V0aWxpdGllcy9iZXAnO1xuaW1wb3J0IHsgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7IGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzIH0gZnJvbSAnLi9hbmFseXRpY3MnO1xuaW1wb3J0IHsgQmFzZUNvbW1hbmRPcHRpb25zLCBDb21tYW5kIH0gZnJvbSAnLi9jb21tYW5kJztcbmltcG9ydCB7IEFyZ3VtZW50cywgT3B0aW9uIH0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgcGFyc2VBcmd1bWVudHMgfSBmcm9tICcuL3BhcnNlcic7XG5pbXBvcnQgeyBXb3Jrc3BhY2VMb2FkZXIgfSBmcm9tICcuL3dvcmtzcGFjZS1sb2FkZXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFyY2hpdGVjdENvbW1hbmRPcHRpb25zIGV4dGVuZHMgQmFzZUNvbW1hbmRPcHRpb25zIHtcbiAgcHJvamVjdD86IHN0cmluZztcbiAgY29uZmlndXJhdGlvbj86IHN0cmluZztcbiAgcHJvZD86IGJvb2xlYW47XG4gIHRhcmdldD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFyY2hpdGVjdENvbW1hbmQ8XG4gIFQgZXh0ZW5kcyBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyA9IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zLFxuPiBleHRlbmRzIENvbW1hbmQ8QXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnM+IHtcbiAgcHJpdmF0ZSBfaG9zdCA9IG5ldyBOb2RlSnNTeW5jSG9zdCgpO1xuICBwcm90ZWN0ZWQgX2FyY2hpdGVjdDogQXJjaGl0ZWN0O1xuICBwcm90ZWN0ZWQgX3dvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2U7XG4gIHByb3RlY3RlZCBfcmVnaXN0cnk6IGpzb24uc2NoZW1hLlNjaGVtYVJlZ2lzdHJ5O1xuXG4gIC8vIElmIHRoaXMgY29tbWFuZCBzdXBwb3J0cyBydW5uaW5nIG11bHRpcGxlIHRhcmdldHMuXG4gIHByb3RlY3RlZCBtdWx0aVRhcmdldCA9IGZhbHNlO1xuXG4gIHRhcmdldDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIHB1YmxpYyBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zICYgQXJndW1lbnRzKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgc3VwZXIuaW5pdGlhbGl6ZShvcHRpb25zKTtcblxuICAgIHRoaXMuX3JlZ2lzdHJ5ID0gbmV3IGpzb24uc2NoZW1hLkNvcmVTY2hlbWFSZWdpc3RyeSgpO1xuICAgIHRoaXMuX3JlZ2lzdHJ5LmFkZFBvc3RUcmFuc2Zvcm0oanNvbi5zY2hlbWEudHJhbnNmb3Jtcy5hZGRVbmRlZmluZWREZWZhdWx0cyk7XG5cbiAgICBhd2FpdCB0aGlzLl9sb2FkV29ya3NwYWNlQW5kQXJjaGl0ZWN0KCk7XG5cbiAgICBpZiAoIXRoaXMudGFyZ2V0KSB7XG4gICAgICBpZiAob3B0aW9ucy5oZWxwKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgYSBzcGVjaWFsIGNhc2Ugd2hlcmUgd2UganVzdCByZXR1cm4uXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc3BlY2lmaWVyID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcbiAgICAgIGlmICghc3BlY2lmaWVyLnByb2plY3QgfHwgIXNwZWNpZmllci50YXJnZXQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZGV0ZXJtaW5lIHByb2plY3Qgb3IgdGFyZ2V0IGZvciBjb21tYW5kLicpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY29tbWFuZExlZnRvdmVycyA9IG9wdGlvbnNbJy0tJ107XG4gICAgbGV0IHByb2plY3ROYW1lID0gb3B0aW9ucy5wcm9qZWN0O1xuICAgIGNvbnN0IHRhcmdldFByb2plY3ROYW1lczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdGhpcy5fd29ya3NwYWNlLmxpc3RQcm9qZWN0TmFtZXMoKSkge1xuICAgICAgaWYgKHRoaXMuX2FyY2hpdGVjdC5saXN0UHJvamVjdFRhcmdldHMobmFtZSkuaW5jbHVkZXModGhpcy50YXJnZXQpKSB7XG4gICAgICAgIHRhcmdldFByb2plY3ROYW1lcy5wdXNoKG5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0YXJnZXRQcm9qZWN0TmFtZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHByb2plY3RzIHN1cHBvcnQgdGhlICcke3RoaXMudGFyZ2V0fScgdGFyZ2V0LmApO1xuICAgIH1cblxuICAgIGlmIChwcm9qZWN0TmFtZSAmJiAhdGFyZ2V0UHJvamVjdE5hbWVzLmluY2x1ZGVzKHByb2plY3ROYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBQcm9qZWN0ICcke3Byb2plY3ROYW1lfScgZG9lcyBub3Qgc3VwcG9ydCB0aGUgJyR7dGhpcy50YXJnZXR9JyB0YXJnZXQuYCk7XG4gICAgfVxuXG4gICAgaWYgKCFwcm9qZWN0TmFtZSAmJiBjb21tYW5kTGVmdG92ZXJzICYmIGNvbW1hbmRMZWZ0b3ZlcnMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgYnVpbGRlck5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICBjb25zdCBsZWZ0b3Zlck1hcCA9IG5ldyBNYXA8c3RyaW5nLCB7IG9wdGlvbkRlZnM6IE9wdGlvbltdLCBwYXJzZWRPcHRpb25zOiBBcmd1bWVudHMgfT4oKTtcbiAgICAgIGxldCBwb3RlbnRpYWxQcm9qZWN0TmFtZXMgPSBuZXcgU2V0PHN0cmluZz4odGFyZ2V0UHJvamVjdE5hbWVzKTtcbiAgICAgIGZvciAoY29uc3QgbmFtZSBvZiB0YXJnZXRQcm9qZWN0TmFtZXMpIHtcbiAgICAgICAgY29uc3QgYnVpbGRlckNvbmZpZyA9IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih7XG4gICAgICAgICAgcHJvamVjdDogbmFtZSxcbiAgICAgICAgICB0YXJnZXQ6IHRoaXMudGFyZ2V0LFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAodGhpcy5tdWx0aVRhcmdldCkge1xuICAgICAgICAgIGJ1aWxkZXJOYW1lcy5hZGQoYnVpbGRlckNvbmZpZy5idWlsZGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGJ1aWxkZXJEZXNjID0gYXdhaXQgdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJEZXNjcmlwdGlvbihidWlsZGVyQ29uZmlnKS50b1Byb21pc2UoKTtcbiAgICAgICAgY29uc3Qgb3B0aW9uRGVmcyA9IGF3YWl0IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyh0aGlzLl9yZWdpc3RyeSwgYnVpbGRlckRlc2Muc2NoZW1hKTtcbiAgICAgICAgY29uc3QgcGFyc2VkT3B0aW9ucyA9IHBhcnNlQXJndW1lbnRzKFsuLi5jb21tYW5kTGVmdG92ZXJzXSwgb3B0aW9uRGVmcyk7XG4gICAgICAgIGNvbnN0IGJ1aWxkZXJMZWZ0b3ZlcnMgPSBwYXJzZWRPcHRpb25zWyctLSddIHx8IFtdO1xuICAgICAgICBsZWZ0b3Zlck1hcC5zZXQobmFtZSwgeyBvcHRpb25EZWZzLCBwYXJzZWRPcHRpb25zIH0pO1xuXG4gICAgICAgIHBvdGVudGlhbFByb2plY3ROYW1lcyA9IG5ldyBTZXQoYnVpbGRlckxlZnRvdmVycy5maWx0ZXIoeCA9PiBwb3RlbnRpYWxQcm9qZWN0TmFtZXMuaGFzKHgpKSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChwb3RlbnRpYWxQcm9qZWN0TmFtZXMuc2l6ZSA9PT0gMSkge1xuICAgICAgICBwcm9qZWN0TmFtZSA9IFsuLi5wb3RlbnRpYWxQcm9qZWN0TmFtZXNdWzBdO1xuXG4gICAgICAgIC8vIHJlbW92ZSB0aGUgcHJvamVjdCBuYW1lIGZyb20gdGhlIGxlZnRvdmVyc1xuICAgICAgICBjb25zdCBvcHRpb25JbmZvID0gbGVmdG92ZXJNYXAuZ2V0KHByb2plY3ROYW1lKTtcbiAgICAgICAgaWYgKG9wdGlvbkluZm8pIHtcbiAgICAgICAgICBjb25zdCBsb2NhdGlvbnMgPSBbXTtcbiAgICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgICAgd2hpbGUgKGkgPCBjb21tYW5kTGVmdG92ZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgaSA9IGNvbW1hbmRMZWZ0b3ZlcnMuaW5kZXhPZihwcm9qZWN0TmFtZSwgaSArIDEpO1xuICAgICAgICAgICAgaWYgKGkgPT09IC0xKSB7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbG9jYXRpb25zLnB1c2goaSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlbGV0ZSBvcHRpb25JbmZvLnBhcnNlZE9wdGlvbnNbJy0tJ107XG4gICAgICAgICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiBsb2NhdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBMZWZ0b3ZlcnMgPSBbLi4uY29tbWFuZExlZnRvdmVyc107XG4gICAgICAgICAgICB0ZW1wTGVmdG92ZXJzLnNwbGljZShsb2NhdGlvbiwgMSk7XG4gICAgICAgICAgICBjb25zdCB0ZW1wQXJncyA9IHBhcnNlQXJndW1lbnRzKFsuLi50ZW1wTGVmdG92ZXJzXSwgb3B0aW9uSW5mby5vcHRpb25EZWZzKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0ZW1wQXJnc1snLS0nXTtcbiAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShvcHRpb25JbmZvLnBhcnNlZE9wdGlvbnMpID09PSBKU09OLnN0cmluZ2lmeSh0ZW1wQXJncykpIHtcbiAgICAgICAgICAgICAgb3B0aW9uc1snLS0nXSA9IHRlbXBMZWZ0b3ZlcnM7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIXByb2plY3ROYW1lICYmIHRoaXMubXVsdGlUYXJnZXQgJiYgYnVpbGRlck5hbWVzLnNpemUgPiAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcih0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgQXJjaGl0ZWN0IGNvbW1hbmRzIHdpdGggY29tbWFuZCBsaW5lIG92ZXJyaWRlcyBjYW5ub3QgdGFyZ2V0IGRpZmZlcmVudCBidWlsZGVycy4gVGhlXG4gICAgICAgICAgJyR7dGhpcy50YXJnZXR9JyB0YXJnZXQgd291bGQgcnVuIG9uIHByb2plY3RzICR7dGFyZ2V0UHJvamVjdE5hbWVzLmpvaW4oKX0gd2hpY2ggaGF2ZSB0aGVcbiAgICAgICAgICBmb2xsb3dpbmcgYnVpbGRlcnM6ICR7J1xcbiAgJyArIFsuLi5idWlsZGVyTmFtZXNdLmpvaW4oJ1xcbiAgJyl9XG4gICAgICAgIGApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghcHJvamVjdE5hbWUgJiYgIXRoaXMubXVsdGlUYXJnZXQpIHtcbiAgICAgIGNvbnN0IGRlZmF1bHRQcm9qZWN0TmFtZSA9IHRoaXMuX3dvcmtzcGFjZS5nZXREZWZhdWx0UHJvamVjdE5hbWUoKTtcbiAgICAgIGlmICh0YXJnZXRQcm9qZWN0TmFtZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHByb2plY3ROYW1lID0gdGFyZ2V0UHJvamVjdE5hbWVzWzBdO1xuICAgICAgfSBlbHNlIGlmIChkZWZhdWx0UHJvamVjdE5hbWUgJiYgdGFyZ2V0UHJvamVjdE5hbWVzLmluY2x1ZGVzKGRlZmF1bHRQcm9qZWN0TmFtZSkpIHtcbiAgICAgICAgcHJvamVjdE5hbWUgPSBkZWZhdWx0UHJvamVjdE5hbWU7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuaGVscCkge1xuICAgICAgICAvLyBUaGlzIGlzIGEgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGp1c3QgcmV0dXJuLlxuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBkZXRlcm1pbmUgcHJvamVjdCBvciB0YXJnZXQgZm9yIGNvbW1hbmQuJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgb3B0aW9ucy5wcm9qZWN0ID0gcHJvamVjdE5hbWU7XG5cbiAgICBjb25zdCBidWlsZGVyQ29uZiA9IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih7XG4gICAgICBwcm9qZWN0OiBwcm9qZWN0TmFtZSB8fCAodGFyZ2V0UHJvamVjdE5hbWVzLmxlbmd0aCA+IDAgPyB0YXJnZXRQcm9qZWN0TmFtZXNbMF0gOiAnJyksXG4gICAgICB0YXJnZXQ6IHRoaXMudGFyZ2V0LFxuICAgIH0pO1xuICAgIGNvbnN0IGJ1aWxkZXJEZXNjID0gYXdhaXQgdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJEZXNjcmlwdGlvbihidWlsZGVyQ29uZikudG9Qcm9taXNlKCk7XG5cbiAgICB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMucHVzaCguLi4oXG4gICAgICBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnModGhpcy5fcmVnaXN0cnksIGJ1aWxkZXJEZXNjLnNjaGVtYSlcbiAgICApKTtcblxuICAgIC8vIFVwZGF0ZSBvcHRpb25zIHRvIHJlbW92ZSBhbmFseXRpY3MgZnJvbSBvcHRpb25zIGlmIHRoZSBidWlsZGVyIGlzbid0IHNhZmVsaXN0ZWQuXG4gICAgZm9yIChjb25zdCBvIG9mIHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucykge1xuICAgICAgaWYgKG8udXNlckFuYWx5dGljcykge1xuICAgICAgICBpZiAoIWlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzKGJ1aWxkZXJEZXNjLm5hbWUpKSB7XG4gICAgICAgICAgby51c2VyQW5hbHl0aWNzID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zICYgQXJndW1lbnRzKSB7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1bkJlcFRhcmdldDxUPihcbiAgICBjb21tYW5kOiBzdHJpbmcsXG4gICAgY29uZmlndXJhdGlvbjogQnVpbGRlckNvbmZpZ3VyYXRpb248VD4sXG4gICAgYnVpbGRFdmVudExvZzogc3RyaW5nLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGJlcCA9IG5ldyBCZXBKc29uV3JpdGVyKGJ1aWxkRXZlbnRMb2cpO1xuXG4gICAgLy8gU2VuZCBzdGFydFxuICAgIGJlcC53cml0ZUJ1aWxkU3RhcnRlZChjb21tYW5kKTtcblxuICAgIGxldCBsYXN0ID0gMTtcbiAgICBsZXQgcmVidWlsZCA9IGZhbHNlO1xuICAgIGF3YWl0IHRoaXMuX2FyY2hpdGVjdC5ydW4oY29uZmlndXJhdGlvbiwgeyBsb2dnZXI6IHRoaXMubG9nZ2VyIH0pLmZvckVhY2goZXZlbnQgPT4ge1xuICAgICAgbGFzdCA9IGV2ZW50LnN1Y2Nlc3MgPyAwIDogMTtcblxuICAgICAgaWYgKHJlYnVpbGQpIHtcbiAgICAgICAgLy8gTk9URTogVGhpcyB3aWxsIGhhdmUgYW4gaW5jb3JyZWN0IHRpbWVzdGFtcCBidXQgdGhpcyBjYW5ub3QgYmUgZml4ZWRcbiAgICAgICAgLy8gICAgICAgdW50aWwgYnVpbGRlcnMgcmVwb3J0IGFkZGl0aW9uYWwgc3RhdHVzIGV2ZW50c1xuICAgICAgICBiZXAud3JpdGVCdWlsZFN0YXJ0ZWQoY29tbWFuZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWJ1aWxkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgYmVwLndyaXRlQnVpbGRGaW5pc2hlZChsYXN0KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBsYXN0O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1blNpbmdsZVRhcmdldChcbiAgICB0YXJnZXRTcGVjOiBUYXJnZXRTcGVjaWZpZXIsXG4gICAgdGFyZ2V0T3B0aW9uczogc3RyaW5nW10sXG4gICAgY29tbWFuZE9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zICYgQXJndW1lbnRzKSB7XG4gICAgLy8gV2UgbmVlZCB0byBidWlsZCB0aGUgYnVpbGRlclNwZWMgdHdpY2UgYmVjYXVzZSBhcmNoaXRlY3QgZG9lcyBub3QgdW5kZXJzdGFuZFxuICAgIC8vIG92ZXJyaWRlcyBzZXBhcmF0ZWx5IChnZXR0aW5nIHRoZSBjb25maWd1cmF0aW9uIGJ1aWxkcyB0aGUgd2hvbGUgcHJvamVjdCwgaW5jbHVkaW5nXG4gICAgLy8gb3ZlcnJpZGVzKS5cbiAgICBjb25zdCBidWlsZGVyQ29uZiA9IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih0YXJnZXRTcGVjKTtcbiAgICBjb25zdCBidWlsZGVyRGVzYyA9IGF3YWl0IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyRGVzY3JpcHRpb24oYnVpbGRlckNvbmYpLnRvUHJvbWlzZSgpO1xuICAgIGNvbnN0IHRhcmdldE9wdGlvbkFycmF5ID0gYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKHRoaXMuX3JlZ2lzdHJ5LCBidWlsZGVyRGVzYy5zY2hlbWEpO1xuICAgIGNvbnN0IG92ZXJyaWRlcyA9IHBhcnNlQXJndW1lbnRzKHRhcmdldE9wdGlvbnMsIHRhcmdldE9wdGlvbkFycmF5LCB0aGlzLmxvZ2dlcik7XG5cbiAgICBpZiAob3ZlcnJpZGVzWyctLSddKSB7XG4gICAgICAob3ZlcnJpZGVzWyctLSddIHx8IFtdKS5mb3JFYWNoKGFkZGl0aW9uYWwgPT4ge1xuICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChgVW5rbm93biBvcHRpb246ICcke2FkZGl0aW9uYWwuc3BsaXQoLz0vKVswXX0nYCk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICAgIGNvbnN0IHJlYWxCdWlsZGVyQ29uZiA9IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih7IC4uLnRhcmdldFNwZWMsIG92ZXJyaWRlcyB9KTtcbiAgICBjb25zdCBidWlsZGVyQ29udGV4dDogUGFydGlhbDxCdWlsZGVyQ29udGV4dD4gPSB7XG4gICAgICBsb2dnZXI6IHRoaXMubG9nZ2VyLFxuICAgICAgdGFyZ2V0U3BlY2lmaWVyOiB0YXJnZXRTcGVjLFxuICAgIH07XG5cbiAgICBpZiAoY29tbWFuZE9wdGlvbnMuYnVpbGRFdmVudExvZyAmJiBbJ2J1aWxkJywgJ3NlcnZlJ10uaW5jbHVkZXModGhpcy5kZXNjcmlwdGlvbi5uYW1lKSkge1xuICAgICAgLy8gVGhlIGJ1aWxkL3NlcnZlIGNvbW1hbmRzIHN1cHBvcnRzIEJFUCBtZXNzYWdpbmdcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ0JFUCBzdXBwb3J0IGlzIGV4cGVyaW1lbnRhbCBhbmQgc3ViamVjdCB0byBjaGFuZ2UuJyk7XG5cbiAgICAgIHJldHVybiB0aGlzLnJ1bkJlcFRhcmdldChcbiAgICAgICAgdGhpcy5kZXNjcmlwdGlvbi5uYW1lLFxuICAgICAgICByZWFsQnVpbGRlckNvbmYsXG4gICAgICAgIGNvbW1hbmRPcHRpb25zLmJ1aWxkRXZlbnRMb2cgYXMgc3RyaW5nLFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5fYXJjaGl0ZWN0XG4gICAgICAgIC5ydW4ocmVhbEJ1aWxkZXJDb25mLCBidWlsZGVyQ29udGV4dClcbiAgICAgICAgLnRvUHJvbWlzZSgpO1xuXG4gICAgICByZXR1cm4gcmVzdWx0LnN1Y2Nlc3MgPyAwIDogMTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcnVuQXJjaGl0ZWN0VGFyZ2V0KFxuICAgIG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zICYgQXJndW1lbnRzLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGV4dHJhID0gb3B0aW9uc1snLS0nXSB8fCBbXTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB0YXJnZXRTcGVjID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcbiAgICAgIGlmICghdGFyZ2V0U3BlYy5wcm9qZWN0ICYmIHRoaXMudGFyZ2V0KSB7XG4gICAgICAgIC8vIFRoaXMgcnVucyBlYWNoIHRhcmdldCBzZXF1ZW50aWFsbHkuXG4gICAgICAgIC8vIFJ1bm5pbmcgdGhlbSBpbiBwYXJhbGxlbCB3b3VsZCBqdW1ibGUgdGhlIGxvZyBtZXNzYWdlcy5cbiAgICAgICAgbGV0IHJlc3VsdCA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgcHJvamVjdCBvZiB0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRoaXMudGFyZ2V0KSkge1xuICAgICAgICAgIHJlc3VsdCB8PSBhd2FpdCB0aGlzLnJ1blNpbmdsZVRhcmdldCh7IC4uLnRhcmdldFNwZWMsIHByb2plY3QgfSwgZXh0cmEsIG9wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJ1blNpbmdsZVRhcmdldCh0YXJnZXRTcGVjLCBleHRyYSwgb3B0aW9ucyk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBzY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbikge1xuICAgICAgICBjb25zdCBuZXdFcnJvcnM6IHNjaGVtYS5TY2hlbWFWYWxpZGF0b3JFcnJvcltdID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgc2NoZW1hRXJyb3Igb2YgZS5lcnJvcnMpIHtcbiAgICAgICAgICBpZiAoc2NoZW1hRXJyb3Iua2V5d29yZCA9PT0gJ2FkZGl0aW9uYWxQcm9wZXJ0aWVzJykge1xuICAgICAgICAgICAgY29uc3QgdW5rbm93blByb3BlcnR5ID0gc2NoZW1hRXJyb3IucGFyYW1zLmFkZGl0aW9uYWxQcm9wZXJ0eTtcbiAgICAgICAgICAgIGlmICh1bmtub3duUHJvcGVydHkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgICBjb25zdCBkYXNoZXMgPSB1bmtub3duUHJvcGVydHkubGVuZ3RoID09PSAxID8gJy0nIDogJy0tJztcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYFVua25vd24gb3B0aW9uOiAnJHtkYXNoZXN9JHt1bmtub3duUHJvcGVydHl9J2ApO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3RXJyb3JzLnB1c2goc2NoZW1hRXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5ld0Vycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IobmV3IHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKG5ld0Vycm9ycykubWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0YXJnZXROYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lID0gdGhpcy5fd29ya3NwYWNlLmxpc3RQcm9qZWN0TmFtZXMoKS5tYXAocHJvamVjdE5hbWUgPT5cbiAgICAgIHRoaXMuX2FyY2hpdGVjdC5saXN0UHJvamVjdFRhcmdldHMocHJvamVjdE5hbWUpLmluY2x1ZGVzKHRhcmdldE5hbWUpID8gcHJvamVjdE5hbWUgOiBudWxsLFxuICAgICkuZmlsdGVyKHggPT4gISF4KSBhcyBzdHJpbmdbXTtcblxuICAgIGlmICh0aGlzLm11bHRpVGFyZ2V0KSB7XG4gICAgICAvLyBGb3IgbXVsdGkgdGFyZ2V0IGNvbW1hbmRzLCB3ZSBhbHdheXMgbGlzdCBhbGwgcHJvamVjdHMgdGhhdCBoYXZlIHRoZSB0YXJnZXQuXG4gICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGb3Igc2luZ2xlIHRhcmdldCBjb21tYW5kcywgd2UgdHJ5IHRoZSBkZWZhdWx0IHByb2plY3QgZmlyc3QsXG4gICAgICAvLyB0aGVuIHRoZSBmdWxsIGxpc3QgaWYgaXQgaGFzIGEgc2luZ2xlIHByb2plY3QsIHRoZW4gZXJyb3Igb3V0LlxuICAgICAgY29uc3QgbWF5YmVEZWZhdWx0UHJvamVjdCA9IHRoaXMuX3dvcmtzcGFjZS5nZXREZWZhdWx0UHJvamVjdE5hbWUoKTtcbiAgICAgIGlmIChtYXliZURlZmF1bHRQcm9qZWN0ICYmIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5pbmNsdWRlcyhtYXliZURlZmF1bHRQcm9qZWN0KSkge1xuICAgICAgICByZXR1cm4gW21heWJlRGVmYXVsdFByb2plY3RdO1xuICAgICAgfVxuXG4gICAgICBpZiAoYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBkZXRlcm1pbmUgYSBzaW5nbGUgcHJvamVjdCBmb3IgdGhlICcke3RhcmdldE5hbWV9JyB0YXJnZXQuYCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBfbG9hZFdvcmtzcGFjZUFuZEFyY2hpdGVjdCgpIHtcbiAgICBjb25zdCB3b3Jrc3BhY2VMb2FkZXIgPSBuZXcgV29ya3NwYWNlTG9hZGVyKHRoaXMuX2hvc3QpO1xuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgd29ya3NwYWNlTG9hZGVyLmxvYWRXb3Jrc3BhY2UodGhpcy53b3Jrc3BhY2Uucm9vdCk7XG5cbiAgICB0aGlzLl93b3Jrc3BhY2UgPSB3b3Jrc3BhY2U7XG4gICAgdGhpcy5fYXJjaGl0ZWN0ID0gYXdhaXQgbmV3IEFyY2hpdGVjdCh3b3Jrc3BhY2UpLmxvYWRBcmNoaXRlY3QoKS50b1Byb21pc2UoKTtcbiAgfVxuXG4gIHByaXZhdGUgX21ha2VUYXJnZXRTcGVjaWZpZXIoY29tbWFuZE9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKTogVGFyZ2V0U3BlY2lmaWVyIHtcbiAgICBsZXQgcHJvamVjdCwgdGFyZ2V0LCBjb25maWd1cmF0aW9uO1xuXG4gICAgaWYgKGNvbW1hbmRPcHRpb25zLnRhcmdldCkge1xuICAgICAgW3Byb2plY3QsIHRhcmdldCwgY29uZmlndXJhdGlvbl0gPSBjb21tYW5kT3B0aW9ucy50YXJnZXQuc3BsaXQoJzonKTtcblxuICAgICAgaWYgKGNvbW1hbmRPcHRpb25zLmNvbmZpZ3VyYXRpb24pIHtcbiAgICAgICAgY29uZmlndXJhdGlvbiA9IGNvbW1hbmRPcHRpb25zLmNvbmZpZ3VyYXRpb247XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb2plY3QgPSBjb21tYW5kT3B0aW9ucy5wcm9qZWN0O1xuICAgICAgdGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG4gICAgICBjb25maWd1cmF0aW9uID0gY29tbWFuZE9wdGlvbnMuY29uZmlndXJhdGlvbjtcbiAgICAgIGlmICghY29uZmlndXJhdGlvbiAmJiBjb21tYW5kT3B0aW9ucy5wcm9kKSB7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24gPSAncHJvZHVjdGlvbic7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICBwcm9qZWN0ID0gJyc7XG4gICAgfVxuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICB0YXJnZXQgPSAnJztcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgcHJvamVjdCxcbiAgICAgIGNvbmZpZ3VyYXRpb24sXG4gICAgICB0YXJnZXQsXG4gICAgfTtcbiAgfVxufVxuIl19