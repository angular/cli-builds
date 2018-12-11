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
const json_schema_1 = require("../utilities/json-schema");
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
    }
    async run(options) {
        return await this.runArchitectTarget(options);
    }
    async runSingleTarget(targetSpec, options) {
        // We need to build the builderSpec twice because architect does not understand
        // overrides separately (getting the configuration builds the whole project, including
        // overrides).
        const builderConf = this._architect.getBuilderConfiguration(targetSpec);
        const builderDesc = await this._architect.getBuilderDescription(builderConf).toPromise();
        const targetOptionArray = await json_schema_1.parseJsonSchemaToOptions(this._registry, builderDesc.schema);
        const overrides = parser_1.parseArguments(options, targetOptionArray, this.logger);
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
        const result = await this._architect.run(realBuilderConf, builderContext).toPromise();
        return result.success ? 0 : 1;
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
                    result |= await this.runSingleTarget(Object.assign({}, targetSpec, { project }), extra);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILHlEQUltQztBQUNuQywrQ0FBd0U7QUFDeEUsb0RBQWdGO0FBQ2hGLDBEQUFvRTtBQUNwRSx1Q0FBd0Q7QUFFeEQscUNBQTBDO0FBQzFDLHlEQUFxRDtBQVNyRCxNQUFzQixnQkFFcEIsU0FBUSxpQkFBZ0M7SUFGMUM7O1FBR1UsVUFBSyxHQUFHLElBQUkscUJBQWMsRUFBRSxDQUFDO1FBS3JDLHFEQUFxRDtRQUMzQyxnQkFBVyxHQUFHLEtBQUssQ0FBQztJQThRaEMsQ0FBQztJQTFRUSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQTRDO1FBQ2xFLE1BQU0sS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVoQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksV0FBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3RELElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsV0FBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUU3RSxNQUFNLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1FBRXhDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2hCLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtnQkFDaEIsK0NBQStDO2dCQUMvQyxPQUFPO2FBQ1I7WUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDckQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFO2dCQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLGlEQUFpRCxD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TSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUVwRSxJQUFJLGNBQWMsQ0FBQyxhQUFhLEVBQUU7Z0JBQ2hDLGFBQWEsR0FBRyxjQUFjLENBQUMsYUFBYSxDQUFDO2FBQzlDO1NBQ0Y7YUFBTTtZQUNMLE9BQU8sR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDO1lBQ2pDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ3JCLGFBQWEsR0FBRyxjQUFjLENBQUMsYUFBYSxDQUFDO1lBQzdDLElBQUksQ0FBQyxhQUFhLElBQUksY0FBYyxDQUFDLElBQUksRUFBRTtnQkFDekMsYUFBYSxHQUFHLFlBQVksQ0FBQzthQUM5QjtTQUNGO1FBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNaLE9BQU8sR0FBRyxFQUFFLENBQUM7U0FDZDtRQUNELElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDWCxNQUFNLEdBQUcsRUFBRSxDQUFDO1NBQ2I7UUFFRCxPQUFPO1lBQ0wsT0FBTztZQUNQLGFBQWE7WUFDYixNQUFNO1NBQ1AsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXZSRCw0Q0F1UkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1xuICBBcmNoaXRlY3QsXG4gIEJ1aWxkZXJDb250ZXh0LFxuICBUYXJnZXRTcGVjaWZpZXIsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgZXhwZXJpbWVudGFsLCBqc29uLCBzY2hlbWEsIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBOb2RlSnNTeW5jSG9zdCwgY3JlYXRlQ29uc29sZUxvZ2dlciB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlL25vZGUnO1xuaW1wb3J0IHsgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7IEJhc2VDb21tYW5kT3B0aW9ucywgQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZCc7XG5pbXBvcnQgeyBBcmd1bWVudHMsIE9wdGlvbiB9IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB7IHBhcnNlQXJndW1lbnRzIH0gZnJvbSAnLi9wYXJzZXInO1xuaW1wb3J0IHsgV29ya3NwYWNlTG9hZGVyIH0gZnJvbSAnLi93b3Jrc3BhY2UtbG9hZGVyJztcblxuZXhwb3J0IGludGVyZmFjZSBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyBleHRlbmRzIEJhc2VDb21tYW5kT3B0aW9ucyB7XG4gIHByb2plY3Q/OiBzdHJpbmc7XG4gIGNvbmZpZ3VyYXRpb24/OiBzdHJpbmc7XG4gIHByb2Q/OiBib29sZWFuO1xuICB0YXJnZXQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBcmNoaXRlY3RDb21tYW5kPFxuICBUIGV4dGVuZHMgQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgPSBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyxcbj4gZXh0ZW5kcyBDb21tYW5kPEFyY2hpdGVjdENvbW1hbmRPcHRpb25zPiB7XG4gIHByaXZhdGUgX2hvc3QgPSBuZXcgTm9kZUpzU3luY0hvc3QoKTtcbiAgcHJvdGVjdGVkIF9hcmNoaXRlY3Q6IEFyY2hpdGVjdDtcbiAgcHJvdGVjdGVkIF93b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlO1xuICBwcm90ZWN0ZWQgX3JlZ2lzdHJ5OiBqc29uLnNjaGVtYS5TY2hlbWFSZWdpc3RyeTtcblxuICAvLyBJZiB0aGlzIGNvbW1hbmQgc3VwcG9ydHMgcnVubmluZyBtdWx0aXBsZSB0YXJnZXRzLlxuICBwcm90ZWN0ZWQgbXVsdGlUYXJnZXQgPSBmYWxzZTtcblxuICB0YXJnZXQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBwdWJsaWMgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyAmIEFyZ3VtZW50cyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHN1cGVyLmluaXRpYWxpemUob3B0aW9ucyk7XG5cbiAgICB0aGlzLl9yZWdpc3RyeSA9IG5ldyBqc29uLnNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoKTtcbiAgICB0aGlzLl9yZWdpc3RyeS5hZGRQb3N0VHJhbnNmb3JtKGpzb24uc2NoZW1hLnRyYW5zZm9ybXMuYWRkVW5kZWZpbmVkRGVmYXVsdHMpO1xuXG4gICAgYXdhaXQgdGhpcy5fbG9hZFdvcmtzcGFjZUFuZEFyY2hpdGVjdCgpO1xuXG4gICAgaWYgKCF0aGlzLnRhcmdldCkge1xuICAgICAgaWYgKG9wdGlvbnMuaGVscCkge1xuICAgICAgICAvLyBUaGlzIGlzIGEgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGp1c3QgcmV0dXJuLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHNwZWNpZmllciA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgICBpZiAoIXNwZWNpZmllci5wcm9qZWN0IHx8ICFzcGVjaWZpZXIudGFyZ2V0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGRldGVybWluZSBwcm9qZWN0IG9yIHRhcmdldCBmb3IgY29tbWFuZC4nKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbW1hbmRMZWZ0b3ZlcnMgPSBvcHRpb25zWyctLSddO1xuICAgIGxldCBwcm9qZWN0TmFtZSA9IG9wdGlvbnMucHJvamVjdDtcbiAgICBjb25zdCB0YXJnZXRQcm9qZWN0TmFtZXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHRoaXMuX3dvcmtzcGFjZS5saXN0UHJvamVjdE5hbWVzKCkpIHtcbiAgICAgIGlmICh0aGlzLl9hcmNoaXRlY3QubGlzdFByb2plY3RUYXJnZXRzKG5hbWUpLmluY2x1ZGVzKHRoaXMudGFyZ2V0KSkge1xuICAgICAgICB0YXJnZXRQcm9qZWN0TmFtZXMucHVzaChuYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0UHJvamVjdE5hbWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBwcm9qZWN0cyBzdXBwb3J0IHRoZSAnJHt0aGlzLnRhcmdldH0nIHRhcmdldC5gKTtcbiAgICB9XG5cbiAgICBpZiAocHJvamVjdE5hbWUgJiYgIXRhcmdldFByb2plY3ROYW1lcy5pbmNsdWRlcyhwcm9qZWN0TmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUHJvamVjdCAnJHtwcm9qZWN0TmFtZX0nIGRvZXMgbm90IHN1cHBvcnQgdGhlICcke3RoaXMudGFyZ2V0fScgdGFyZ2V0LmApO1xuICAgIH1cblxuICAgIGlmICghcHJvamVjdE5hbWUgJiYgY29tbWFuZExlZnRvdmVycyAmJiBjb21tYW5kTGVmdG92ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IGJ1aWxkZXJOYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgY29uc3QgbGVmdG92ZXJNYXAgPSBuZXcgTWFwPHN0cmluZywgeyBvcHRpb25EZWZzOiBPcHRpb25bXSwgcGFyc2VkT3B0aW9uczogQXJndW1lbnRzIH0+KCk7XG4gICAgICBsZXQgcG90ZW50aWFsUHJvamVjdE5hbWVzID0gbmV3IFNldDxzdHJpbmc+KHRhcmdldFByb2plY3ROYW1lcyk7XG4gICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdGFyZ2V0UHJvamVjdE5hbWVzKSB7XG4gICAgICAgIGNvbnN0IGJ1aWxkZXJDb25maWcgPSB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb24oe1xuICAgICAgICAgIHByb2plY3Q6IG5hbWUsXG4gICAgICAgICAgdGFyZ2V0OiB0aGlzLnRhcmdldCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHRoaXMubXVsdGlUYXJnZXQpIHtcbiAgICAgICAgICBidWlsZGVyTmFtZXMuYWRkKGJ1aWxkZXJDb25maWcuYnVpbGRlcik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBidWlsZGVyRGVzYyA9IGF3YWl0IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyRGVzY3JpcHRpb24oYnVpbGRlckNvbmZpZykudG9Qcm9taXNlKCk7XG4gICAgICAgIGNvbnN0IG9wdGlvbkRlZnMgPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnModGhpcy5fcmVnaXN0cnksIGJ1aWxkZXJEZXNjLnNjaGVtYSk7XG4gICAgICAgIGNvbnN0IHBhcnNlZE9wdGlvbnMgPSBwYXJzZUFyZ3VtZW50cyhbLi4uY29tbWFuZExlZnRvdmVyc10sIG9wdGlvbkRlZnMpO1xuICAgICAgICBjb25zdCBidWlsZGVyTGVmdG92ZXJzID0gcGFyc2VkT3B0aW9uc1snLS0nXSB8fCBbXTtcbiAgICAgICAgbGVmdG92ZXJNYXAuc2V0KG5hbWUsIHsgb3B0aW9uRGVmcywgcGFyc2VkT3B0aW9ucyB9KTtcblxuICAgICAgICBwb3RlbnRpYWxQcm9qZWN0TmFtZXMgPSBuZXcgU2V0KGJ1aWxkZXJMZWZ0b3ZlcnMuZmlsdGVyKHggPT4gcG90ZW50aWFsUHJvamVjdE5hbWVzLmhhcyh4KSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAocG90ZW50aWFsUHJvamVjdE5hbWVzLnNpemUgPT09IDEpIHtcbiAgICAgICAgcHJvamVjdE5hbWUgPSBbLi4ucG90ZW50aWFsUHJvamVjdE5hbWVzXVswXTtcblxuICAgICAgICAvLyByZW1vdmUgdGhlIHByb2plY3QgbmFtZSBmcm9tIHRoZSBsZWZ0b3ZlcnNcbiAgICAgICAgY29uc3Qgb3B0aW9uSW5mbyA9IGxlZnRvdmVyTWFwLmdldChwcm9qZWN0TmFtZSk7XG4gICAgICAgIGlmIChvcHRpb25JbmZvKSB7XG4gICAgICAgICAgY29uc3QgbG9jYXRpb25zID0gW107XG4gICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgIHdoaWxlIChpIDwgY29tbWFuZExlZnRvdmVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGkgPSBjb21tYW5kTGVmdG92ZXJzLmluZGV4T2YocHJvamVjdE5hbWUsIGkgKyAxKTtcbiAgICAgICAgICAgIGlmIChpID09PSAtMSkge1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxvY2F0aW9ucy5wdXNoKGkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWxldGUgb3B0aW9uSW5mby5wYXJzZWRPcHRpb25zWyctLSddO1xuICAgICAgICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgbG9jYXRpb25zKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wTGVmdG92ZXJzID0gWy4uLmNvbW1hbmRMZWZ0b3ZlcnNdO1xuICAgICAgICAgICAgdGVtcExlZnRvdmVycy5zcGxpY2UobG9jYXRpb24sIDEpO1xuICAgICAgICAgICAgY29uc3QgdGVtcEFyZ3MgPSBwYXJzZUFyZ3VtZW50cyhbLi4udGVtcExlZnRvdmVyc10sIG9wdGlvbkluZm8ub3B0aW9uRGVmcyk7XG4gICAgICAgICAgICBkZWxldGUgdGVtcEFyZ3NbJy0tJ107XG4gICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkob3B0aW9uSW5mby5wYXJzZWRPcHRpb25zKSA9PT0gSlNPTi5zdHJpbmdpZnkodGVtcEFyZ3MpKSB7XG4gICAgICAgICAgICAgIG9wdGlvbnNbJy0tJ10gPSB0ZW1wTGVmdG92ZXJzO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFwcm9qZWN0TmFtZSAmJiB0aGlzLm11bHRpVGFyZ2V0ICYmIGJ1aWxkZXJOYW1lcy5zaXplID4gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGFncy5vbmVMaW5lYFxuICAgICAgICAgIEFyY2hpdGVjdCBjb21tYW5kcyB3aXRoIGNvbW1hbmQgbGluZSBvdmVycmlkZXMgY2Fubm90IHRhcmdldCBkaWZmZXJlbnQgYnVpbGRlcnMuIFRoZVxuICAgICAgICAgICcke3RoaXMudGFyZ2V0fScgdGFyZ2V0IHdvdWxkIHJ1biBvbiBwcm9qZWN0cyAke3RhcmdldFByb2plY3ROYW1lcy5qb2luKCl9IHdoaWNoIGhhdmUgdGhlXG4gICAgICAgICAgZm9sbG93aW5nIGJ1aWxkZXJzOiAkeydcXG4gICcgKyBbLi4uYnVpbGRlck5hbWVzXS5qb2luKCdcXG4gICcpfVxuICAgICAgICBgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXByb2plY3ROYW1lICYmICF0aGlzLm11bHRpVGFyZ2V0KSB7XG4gICAgICBjb25zdCBkZWZhdWx0UHJvamVjdE5hbWUgPSB0aGlzLl93b3Jrc3BhY2UuZ2V0RGVmYXVsdFByb2plY3ROYW1lKCk7XG4gICAgICBpZiAodGFyZ2V0UHJvamVjdE5hbWVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBwcm9qZWN0TmFtZSA9IHRhcmdldFByb2plY3ROYW1lc1swXTtcbiAgICAgIH0gZWxzZSBpZiAoZGVmYXVsdFByb2plY3ROYW1lICYmIHRhcmdldFByb2plY3ROYW1lcy5pbmNsdWRlcyhkZWZhdWx0UHJvamVjdE5hbWUpKSB7XG4gICAgICAgIHByb2plY3ROYW1lID0gZGVmYXVsdFByb2plY3ROYW1lO1xuICAgICAgfSBlbHNlIGlmIChvcHRpb25zLmhlbHApIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBqdXN0IHJldHVybi5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZGV0ZXJtaW5lIHByb2plY3Qgb3IgdGFyZ2V0IGZvciBjb21tYW5kLicpO1xuICAgICAgfVxuICAgIH1cblxuICAgIG9wdGlvbnMucHJvamVjdCA9IHByb2plY3ROYW1lO1xuXG4gICAgY29uc3QgYnVpbGRlckNvbmYgPSB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb24oe1xuICAgICAgcHJvamVjdDogcHJvamVjdE5hbWUgfHwgKHRhcmdldFByb2plY3ROYW1lcy5sZW5ndGggPiAwID8gdGFyZ2V0UHJvamVjdE5hbWVzWzBdIDogJycpLFxuICAgICAgdGFyZ2V0OiB0aGlzLnRhcmdldCxcbiAgICB9KTtcbiAgICBjb25zdCBidWlsZGVyRGVzYyA9IGF3YWl0IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyRGVzY3JpcHRpb24oYnVpbGRlckNvbmYpLnRvUHJvbWlzZSgpO1xuXG4gICAgdGhpcy5kZXNjcmlwdGlvbi5vcHRpb25zLnB1c2goLi4uKFxuICAgICAgYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKHRoaXMuX3JlZ2lzdHJ5LCBidWlsZGVyRGVzYy5zY2hlbWEpXG4gICAgKSk7XG4gIH1cblxuICBhc3luYyBydW4ob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgJiBBcmd1bWVudHMpIHtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5ydW5BcmNoaXRlY3RUYXJnZXQob3B0aW9ucyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcnVuU2luZ2xlVGFyZ2V0KHRhcmdldFNwZWM6IFRhcmdldFNwZWNpZmllciwgb3B0aW9uczogc3RyaW5nW10pIHtcbiAgICAvLyBXZSBuZWVkIHRvIGJ1aWxkIHRoZSBidWlsZGVyU3BlYyB0d2ljZSBiZWNhdXNlIGFyY2hpdGVjdCBkb2VzIG5vdCB1bmRlcnN0YW5kXG4gICAgLy8gb3ZlcnJpZGVzIHNlcGFyYXRlbHkgKGdldHRpbmcgdGhlIGNvbmZpZ3VyYXRpb24gYnVpbGRzIHRoZSB3aG9sZSBwcm9qZWN0LCBpbmNsdWRpbmdcbiAgICAvLyBvdmVycmlkZXMpLlxuICAgIGNvbnN0IGJ1aWxkZXJDb25mID0gdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJDb25maWd1cmF0aW9uKHRhcmdldFNwZWMpO1xuICAgIGNvbnN0IGJ1aWxkZXJEZXNjID0gYXdhaXQgdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJEZXNjcmlwdGlvbihidWlsZGVyQ29uZikudG9Qcm9taXNlKCk7XG4gICAgY29uc3QgdGFyZ2V0T3B0aW9uQXJyYXkgPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnModGhpcy5fcmVnaXN0cnksIGJ1aWxkZXJEZXNjLnNjaGVtYSk7XG4gICAgY29uc3Qgb3ZlcnJpZGVzID0gcGFyc2VBcmd1bWVudHMob3B0aW9ucywgdGFyZ2V0T3B0aW9uQXJyYXksIHRoaXMubG9nZ2VyKTtcblxuICAgIGlmIChvdmVycmlkZXNbJy0tJ10pIHtcbiAgICAgIChvdmVycmlkZXNbJy0tJ10gfHwgW10pLmZvckVhY2goYWRkaXRpb25hbCA9PiB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGBVbmtub3duIG9wdGlvbjogJyR7YWRkaXRpb25hbC5zcGxpdCgvPS8pWzBdfSdgKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG4gICAgY29uc3QgcmVhbEJ1aWxkZXJDb25mID0gdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJDb25maWd1cmF0aW9uKHsgLi4udGFyZ2V0U3BlYywgb3ZlcnJpZGVzIH0pO1xuICAgIGNvbnN0IGJ1aWxkZXJDb250ZXh0OiBQYXJ0aWFsPEJ1aWxkZXJDb250ZXh0PiA9IHtcbiAgICAgIGxvZ2dlcjogdGhpcy5sb2dnZXIsXG4gICAgICB0YXJnZXRTcGVjaWZpZXI6IHRhcmdldFNwZWMsXG4gICAgfTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLl9hcmNoaXRlY3QucnVuKHJlYWxCdWlsZGVyQ29uZiwgYnVpbGRlckNvbnRleHQpLnRvUHJvbWlzZSgpO1xuXG4gICAgcmV0dXJuIHJlc3VsdC5zdWNjZXNzID8gMCA6IDE7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcnVuQXJjaGl0ZWN0VGFyZ2V0KFxuICAgIG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zICYgQXJndW1lbnRzLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGV4dHJhID0gb3B0aW9uc1snLS0nXSB8fCBbXTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB0YXJnZXRTcGVjID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcbiAgICAgIGlmICghdGFyZ2V0U3BlYy5wcm9qZWN0ICYmIHRoaXMudGFyZ2V0KSB7XG4gICAgICAgIC8vIFRoaXMgcnVucyBlYWNoIHRhcmdldCBzZXF1ZW50aWFsbHkuXG4gICAgICAgIC8vIFJ1bm5pbmcgdGhlbSBpbiBwYXJhbGxlbCB3b3VsZCBqdW1ibGUgdGhlIGxvZyBtZXNzYWdlcy5cbiAgICAgICAgbGV0IHJlc3VsdCA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgcHJvamVjdCBvZiB0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRoaXMudGFyZ2V0KSkge1xuICAgICAgICAgIHJlc3VsdCB8PSBhd2FpdCB0aGlzLnJ1blNpbmdsZVRhcmdldCh7IC4uLnRhcmdldFNwZWMsIHByb2plY3QgfSwgZXh0cmEpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJ1blNpbmdsZVRhcmdldCh0YXJnZXRTcGVjLCBleHRyYSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBzY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbikge1xuICAgICAgICBjb25zdCBuZXdFcnJvcnM6IHNjaGVtYS5TY2hlbWFWYWxpZGF0b3JFcnJvcltdID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgc2NoZW1hRXJyb3Igb2YgZS5lcnJvcnMpIHtcbiAgICAgICAgICBpZiAoc2NoZW1hRXJyb3Iua2V5d29yZCA9PT0gJ2FkZGl0aW9uYWxQcm9wZXJ0aWVzJykge1xuICAgICAgICAgICAgY29uc3QgdW5rbm93blByb3BlcnR5ID0gc2NoZW1hRXJyb3IucGFyYW1zLmFkZGl0aW9uYWxQcm9wZXJ0eTtcbiAgICAgICAgICAgIGlmICh1bmtub3duUHJvcGVydHkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgICBjb25zdCBkYXNoZXMgPSB1bmtub3duUHJvcGVydHkubGVuZ3RoID09PSAxID8gJy0nIDogJy0tJztcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYFVua25vd24gb3B0aW9uOiAnJHtkYXNoZXN9JHt1bmtub3duUHJvcGVydHl9J2ApO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3RXJyb3JzLnB1c2goc2NoZW1hRXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5ld0Vycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IobmV3IHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKG5ld0Vycm9ycykubWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0YXJnZXROYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lID0gdGhpcy5fd29ya3NwYWNlLmxpc3RQcm9qZWN0TmFtZXMoKS5tYXAocHJvamVjdE5hbWUgPT5cbiAgICAgIHRoaXMuX2FyY2hpdGVjdC5saXN0UHJvamVjdFRhcmdldHMocHJvamVjdE5hbWUpLmluY2x1ZGVzKHRhcmdldE5hbWUpID8gcHJvamVjdE5hbWUgOiBudWxsLFxuICAgICkuZmlsdGVyKHggPT4gISF4KSBhcyBzdHJpbmdbXTtcblxuICAgIGlmICh0aGlzLm11bHRpVGFyZ2V0KSB7XG4gICAgICAvLyBGb3IgbXVsdGkgdGFyZ2V0IGNvbW1hbmRzLCB3ZSBhbHdheXMgbGlzdCBhbGwgcHJvamVjdHMgdGhhdCBoYXZlIHRoZSB0YXJnZXQuXG4gICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGb3Igc2luZ2xlIHRhcmdldCBjb21tYW5kcywgd2UgdHJ5IHRoZSBkZWZhdWx0IHByb2plY3QgZmlyc3QsXG4gICAgICAvLyB0aGVuIHRoZSBmdWxsIGxpc3QgaWYgaXQgaGFzIGEgc2luZ2xlIHByb2plY3QsIHRoZW4gZXJyb3Igb3V0LlxuICAgICAgY29uc3QgbWF5YmVEZWZhdWx0UHJvamVjdCA9IHRoaXMuX3dvcmtzcGFjZS5nZXREZWZhdWx0UHJvamVjdE5hbWUoKTtcbiAgICAgIGlmIChtYXliZURlZmF1bHRQcm9qZWN0ICYmIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5pbmNsdWRlcyhtYXliZURlZmF1bHRQcm9qZWN0KSkge1xuICAgICAgICByZXR1cm4gW21heWJlRGVmYXVsdFByb2plY3RdO1xuICAgICAgfVxuXG4gICAgICBpZiAoYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBkZXRlcm1pbmUgYSBzaW5nbGUgcHJvamVjdCBmb3IgdGhlICcke3RhcmdldE5hbWV9JyB0YXJnZXQuYCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBfbG9hZFdvcmtzcGFjZUFuZEFyY2hpdGVjdCgpIHtcbiAgICBjb25zdCB3b3Jrc3BhY2VMb2FkZXIgPSBuZXcgV29ya3NwYWNlTG9hZGVyKHRoaXMuX2hvc3QpO1xuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgd29ya3NwYWNlTG9hZGVyLmxvYWRXb3Jrc3BhY2UodGhpcy53b3Jrc3BhY2Uucm9vdCk7XG5cbiAgICB0aGlzLl93b3Jrc3BhY2UgPSB3b3Jrc3BhY2U7XG4gICAgdGhpcy5fYXJjaGl0ZWN0ID0gYXdhaXQgbmV3IEFyY2hpdGVjdCh3b3Jrc3BhY2UpLmxvYWRBcmNoaXRlY3QoKS50b1Byb21pc2UoKTtcbiAgfVxuXG4gIHByaXZhdGUgX21ha2VUYXJnZXRTcGVjaWZpZXIoY29tbWFuZE9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKTogVGFyZ2V0U3BlY2lmaWVyIHtcbiAgICBsZXQgcHJvamVjdCwgdGFyZ2V0LCBjb25maWd1cmF0aW9uO1xuXG4gICAgaWYgKGNvbW1hbmRPcHRpb25zLnRhcmdldCkge1xuICAgICAgW3Byb2plY3QsIHRhcmdldCwgY29uZmlndXJhdGlvbl0gPSBjb21tYW5kT3B0aW9ucy50YXJnZXQuc3BsaXQoJzonKTtcblxuICAgICAgaWYgKGNvbW1hbmRPcHRpb25zLmNvbmZpZ3VyYXRpb24pIHtcbiAgICAgICAgY29uZmlndXJhdGlvbiA9IGNvbW1hbmRPcHRpb25zLmNvbmZpZ3VyYXRpb247XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb2plY3QgPSBjb21tYW5kT3B0aW9ucy5wcm9qZWN0O1xuICAgICAgdGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG4gICAgICBjb25maWd1cmF0aW9uID0gY29tbWFuZE9wdGlvbnMuY29uZmlndXJhdGlvbjtcbiAgICAgIGlmICghY29uZmlndXJhdGlvbiAmJiBjb21tYW5kT3B0aW9ucy5wcm9kKSB7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24gPSAncHJvZHVjdGlvbic7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICBwcm9qZWN0ID0gJyc7XG4gICAgfVxuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICB0YXJnZXQgPSAnJztcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgcHJvamVjdCxcbiAgICAgIGNvbmZpZ3VyYXRpb24sXG4gICAgICB0YXJnZXQsXG4gICAgfTtcbiAgfVxufVxuIl19