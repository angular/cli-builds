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
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const json_schema_1 = require("../utilities/json-schema");
const command_1 = require("./command");
const parser_1 = require("./parser");
const workspace_loader_1 = require("./workspace-loader");
class ArchitectCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this._host = new node_1.NodeJsSyncHost();
        this._logger = node_1.createConsoleLogger();
        // If this command supports running multiple targets.
        this.multiTarget = false;
    }
    async initialize(options) {
        await super.initialize(options);
        this._registry = new core_1.json.schema.CoreSchemaRegistry();
        this._registry.addPostTransform(core_1.json.schema.transforms.addUndefinedDefaults);
        await this._loadWorkspaceAndArchitect().toPromise();
        if (!options.project && this.target) {
            const projectNames = this.getProjectNamesByTarget(this.target);
            const leftovers = options['--'];
            if (projectNames.length > 1 && leftovers && leftovers.length > 0) {
                // Verify that all builders are the same, otherwise error out (since the meaning of an
                // option could vary from builder to builder).
                const builders = [];
                for (const projectName of projectNames) {
                    const targetSpec = this._makeTargetSpecifier(options);
                    const targetDesc = this._architect.getBuilderConfiguration({
                        project: projectName,
                        target: targetSpec.target,
                    });
                    if (builders.indexOf(targetDesc.builder) == -1) {
                        builders.push(targetDesc.builder);
                    }
                }
                if (builders.length > 1) {
                    throw new Error(core_1.tags.oneLine `
            Architect commands with command line overrides cannot target different builders. The
            '${this.target}' target would run on projects ${projectNames.join()} which have the
            following builders: ${'\n  ' + builders.join('\n  ')}
          `);
                }
            }
        }
        const targetSpec = this._makeTargetSpecifier(options);
        if (this.target && !targetSpec.project) {
            const projects = this.getProjectNamesByTarget(this.target);
            if (projects.length === 1) {
                // If there is a single target, use it to parse overrides.
                targetSpec.project = projects[0];
            }
        }
        if ((!targetSpec.project || !targetSpec.target) && !this.multiTarget) {
            throw new Error('Cannot determine project or target for Architect command.');
        }
        if (this.target) {
            // Add options IF there's only one builder of this kind.
            const projectNames = this.getProjectNamesByTarget(this.target);
            const builderConfigurations = [];
            for (const projectName of projectNames) {
                const targetSpec = this._makeTargetSpecifier(options);
                const targetDesc = this._architect.getBuilderConfiguration({
                    project: projectName,
                    target: targetSpec.target,
                });
                if (!builderConfigurations.find(b => b.builder === targetDesc.builder)) {
                    builderConfigurations.push(targetDesc);
                }
            }
            if (builderConfigurations.length == 1) {
                const builderConf = builderConfigurations[0];
                const builderDesc = await this._architect.getBuilderDescription(builderConf).toPromise();
                this.description.options.push(...(await json_schema_1.parseJsonSchemaToOptions(this._registry, builderDesc.schema)));
            }
        }
    }
    async run(options) {
        return await this.runArchitectTarget(options);
    }
    async runArchitectTarget(options) {
        const runSingleTarget = async (targetSpec) => {
            // We need to build the builderSpec twice because architect does not understand
            // overrides separately (getting the configuration builds the whole project, including
            // overrides).
            const builderConf = this._architect.getBuilderConfiguration(targetSpec);
            const builderDesc = await this._architect.getBuilderDescription(builderConf).toPromise();
            const targetOptionArray = await json_schema_1.parseJsonSchemaToOptions(this._registry, builderDesc.schema);
            const overrides = parser_1.parseArguments(options['--'] || [], targetOptionArray);
            if (overrides['--']) {
                (overrides['--'] || []).forEach(additional => {
                    this.logger.warn(`Unknown option: '${additional.split(/=/)[0]}'`);
                });
                return 1;
            }
            const realBuilderConf = this._architect.getBuilderConfiguration(Object.assign({}, targetSpec, { overrides }));
            return this._architect.run(realBuilderConf, { logger: this._logger }).pipe(operators_1.map((buildEvent) => buildEvent.success ? 0 : 1)).toPromise();
        };
        try {
            const targetSpec = this._makeTargetSpecifier(options);
            if (!targetSpec.project && this.target) {
                // This runs each target sequentially.
                // Running them in parallel would jumble the log messages.
                return await rxjs_1.from(this.getProjectNamesByTarget(this.target)).pipe(operators_1.concatMap(project => rxjs_1.from(runSingleTarget(Object.assign({}, targetSpec, { project })))), operators_1.toArray(), operators_1.map(results => results.every(res => res === 0) ? 0 : 1))
                    .toPromise();
            }
            else {
                return await runSingleTarget(targetSpec);
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
            // For single target commands, we try try the default project project first,
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
    _loadWorkspaceAndArchitect() {
        const workspaceLoader = new workspace_loader_1.WorkspaceLoader(this._host);
        return workspaceLoader.loadWorkspace(this.workspace.root).pipe(operators_1.tap((workspace) => this._workspace = workspace), operators_1.concatMap((workspace) => {
            return new architect_1.Architect(workspace).loadArchitect();
        }), operators_1.tap((architect) => this._architect = architect));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILHlEQUttQztBQUNuQywrQ0FBd0U7QUFDeEUsb0RBQWdGO0FBQ2hGLCtCQUE0QjtBQUM1Qiw4Q0FBOEQ7QUFDOUQsMERBQW9FO0FBQ3BFLHVDQUF3RDtBQUN4RCxxQ0FBMEM7QUFDMUMseURBQXFEO0FBU3JELE1BQXNCLGdCQUFpQixTQUFRLGlCQUFnQztJQUEvRTs7UUFDVSxVQUFLLEdBQUcsSUFBSSxxQkFBYyxFQUFFLENBQUM7UUFHM0IsWUFBTyxHQUFHLDBCQUFtQixFQUFFLENBQUM7UUFJMUMscURBQXFEO1FBQzNDLGdCQUFXLEdBQUcsS0FBSyxDQUFDO0lBMk5oQyxDQUFDO0lBdk5RLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBZ0M7UUFDdEQsTUFBTSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWhDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxXQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDdEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRTdFLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFcEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNuQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9ELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxJ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U0FBUyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbEQsQ0FBQyxDQUFDLEVBQ0YsZUFBRyxDQUFDLENBQUMsU0FBb0IsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsQ0FDM0QsQ0FBQztJQUNKLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxjQUF1QztRQUNsRSxJQUFJLE9BQU8sRUFBRSxNQUFNLEVBQUUsYUFBYSxDQUFDO1FBRW5DLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRTtZQUN6QixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsYUFBYSxDQUFDLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFcEUsSUFBSSxjQUFjLENBQUMsYUFBYSxFQUFFO2dCQUNoQyxhQUFhLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQzthQUM5QztTQUNGO2FBQU07WUFDTCxPQUFPLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQztZQUNqQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNyQixhQUFhLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQztZQUM3QyxJQUFJLENBQUMsYUFBYSxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUU7Z0JBQ3pDLGFBQWEsR0FBRyxZQUFZLENBQUM7YUFDOUI7U0FDRjtRQUVELElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDWixPQUFPLEdBQUcsRUFBRSxDQUFDO1NBQ2Q7UUFDRCxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1gsTUFBTSxHQUFHLEVBQUUsQ0FBQztTQUNiO1FBRUQsT0FBTztZQUNMLE9BQU87WUFDUCxhQUFhO1lBQ2IsTUFBTTtTQUNQLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFwT0QsNENBb09DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtcbiAgQXJjaGl0ZWN0LFxuICBCdWlsZEV2ZW50LFxuICBCdWlsZGVyQ29uZmlndXJhdGlvbixcbiAgVGFyZ2V0U3BlY2lmaWVyLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IGV4cGVyaW1lbnRhbCwganNvbiwgc2NoZW1hLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgTm9kZUpzU3luY0hvc3QsIGNyZWF0ZUNvbnNvbGVMb2dnZXIgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZS9ub2RlJztcbmltcG9ydCB7IGZyb20gfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGNvbmNhdE1hcCwgbWFwLCB0YXAsIHRvQXJyYXkgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMgfSBmcm9tICcuLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuaW1wb3J0IHsgQmFzZUNvbW1hbmRPcHRpb25zLCBDb21tYW5kIH0gZnJvbSAnLi9jb21tYW5kJztcbmltcG9ydCB7IHBhcnNlQXJndW1lbnRzIH0gZnJvbSAnLi9wYXJzZXInO1xuaW1wb3J0IHsgV29ya3NwYWNlTG9hZGVyIH0gZnJvbSAnLi93b3Jrc3BhY2UtbG9hZGVyJztcblxuZXhwb3J0IGludGVyZmFjZSBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyBleHRlbmRzIEJhc2VDb21tYW5kT3B0aW9ucyB7XG4gIHByb2plY3Q/OiBzdHJpbmc7XG4gIGNvbmZpZ3VyYXRpb24/OiBzdHJpbmc7XG4gIHByb2Q6IGJvb2xlYW47XG4gIHRhcmdldD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFyY2hpdGVjdENvbW1hbmQgZXh0ZW5kcyBDb21tYW5kPEFyY2hpdGVjdENvbW1hbmRPcHRpb25zPiB7XG4gIHByaXZhdGUgX2hvc3QgPSBuZXcgTm9kZUpzU3luY0hvc3QoKTtcbiAgcHJvdGVjdGVkIF9hcmNoaXRlY3Q6IEFyY2hpdGVjdDtcbiAgcHJvdGVjdGVkIF93b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlO1xuICBwcm90ZWN0ZWQgX2xvZ2dlciA9IGNyZWF0ZUNvbnNvbGVMb2dnZXIoKTtcblxuICBwcm90ZWN0ZWQgX3JlZ2lzdHJ5OiBqc29uLnNjaGVtYS5TY2hlbWFSZWdpc3RyeTtcblxuICAvLyBJZiB0aGlzIGNvbW1hbmQgc3VwcG9ydHMgcnVubmluZyBtdWx0aXBsZSB0YXJnZXRzLlxuICBwcm90ZWN0ZWQgbXVsdGlUYXJnZXQgPSBmYWxzZTtcblxuICB0YXJnZXQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBwdWJsaWMgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHN1cGVyLmluaXRpYWxpemUob3B0aW9ucyk7XG5cbiAgICB0aGlzLl9yZWdpc3RyeSA9IG5ldyBqc29uLnNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoKTtcbiAgICB0aGlzLl9yZWdpc3RyeS5hZGRQb3N0VHJhbnNmb3JtKGpzb24uc2NoZW1hLnRyYW5zZm9ybXMuYWRkVW5kZWZpbmVkRGVmYXVsdHMpO1xuXG4gICAgYXdhaXQgdGhpcy5fbG9hZFdvcmtzcGFjZUFuZEFyY2hpdGVjdCgpLnRvUHJvbWlzZSgpO1xuXG4gICAgaWYgKCFvcHRpb25zLnByb2plY3QgJiYgdGhpcy50YXJnZXQpIHtcbiAgICAgIGNvbnN0IHByb2plY3ROYW1lcyA9IHRoaXMuZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGhpcy50YXJnZXQpO1xuICAgICAgY29uc3QgbGVmdG92ZXJzID0gb3B0aW9uc1snLS0nXTtcbiAgICAgIGlmIChwcm9qZWN0TmFtZXMubGVuZ3RoID4gMSAmJiBsZWZ0b3ZlcnMgJiYgbGVmdG92ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gVmVyaWZ5IHRoYXQgYWxsIGJ1aWxkZXJzIGFyZSB0aGUgc2FtZSwgb3RoZXJ3aXNlIGVycm9yIG91dCAoc2luY2UgdGhlIG1lYW5pbmcgb2YgYW5cbiAgICAgICAgLy8gb3B0aW9uIGNvdWxkIHZhcnkgZnJvbSBidWlsZGVyIHRvIGJ1aWxkZXIpLlxuXG4gICAgICAgIGNvbnN0IGJ1aWxkZXJzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHByb2plY3ROYW1lIG9mIHByb2plY3ROYW1lcykge1xuICAgICAgICAgIGNvbnN0IHRhcmdldFNwZWM6IFRhcmdldFNwZWNpZmllciA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgICAgICAgY29uc3QgdGFyZ2V0RGVzYyA9IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih7XG4gICAgICAgICAgICBwcm9qZWN0OiBwcm9qZWN0TmFtZSxcbiAgICAgICAgICAgIHRhcmdldDogdGFyZ2V0U3BlYy50YXJnZXQsXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoYnVpbGRlcnMuaW5kZXhPZih0YXJnZXREZXNjLmJ1aWxkZXIpID09IC0xKSB7XG4gICAgICAgICAgICBidWlsZGVycy5wdXNoKHRhcmdldERlc2MuYnVpbGRlcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGJ1aWxkZXJzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgQXJjaGl0ZWN0IGNvbW1hbmRzIHdpdGggY29tbWFuZCBsaW5lIG92ZXJyaWRlcyBjYW5ub3QgdGFyZ2V0IGRpZmZlcmVudCBidWlsZGVycy4gVGhlXG4gICAgICAgICAgICAnJHt0aGlzLnRhcmdldH0nIHRhcmdldCB3b3VsZCBydW4gb24gcHJvamVjdHMgJHtwcm9qZWN0TmFtZXMuam9pbigpfSB3aGljaCBoYXZlIHRoZVxuICAgICAgICAgICAgZm9sbG93aW5nIGJ1aWxkZXJzOiAkeydcXG4gICcgKyBidWlsZGVycy5qb2luKCdcXG4gICcpfVxuICAgICAgICAgIGApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0U3BlYzogVGFyZ2V0U3BlY2lmaWVyID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcblxuICAgIGlmICh0aGlzLnRhcmdldCAmJiAhdGFyZ2V0U3BlYy5wcm9qZWN0KSB7XG4gICAgICBjb25zdCBwcm9qZWN0cyA9IHRoaXMuZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGhpcy50YXJnZXQpO1xuXG4gICAgICBpZiAocHJvamVjdHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIC8vIElmIHRoZXJlIGlzIGEgc2luZ2xlIHRhcmdldCwgdXNlIGl0IHRvIHBhcnNlIG92ZXJyaWRlcy5cbiAgICAgICAgdGFyZ2V0U3BlYy5wcm9qZWN0ID0gcHJvamVjdHNbMF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCghdGFyZ2V0U3BlYy5wcm9qZWN0IHx8ICF0YXJnZXRTcGVjLnRhcmdldCkgJiYgIXRoaXMubXVsdGlUYXJnZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGRldGVybWluZSBwcm9qZWN0IG9yIHRhcmdldCBmb3IgQXJjaGl0ZWN0IGNvbW1hbmQuJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudGFyZ2V0KSB7XG4gICAgICAvLyBBZGQgb3B0aW9ucyBJRiB0aGVyZSdzIG9ubHkgb25lIGJ1aWxkZXIgb2YgdGhpcyBraW5kLlxuICAgICAgY29uc3QgcHJvamVjdE5hbWVzID0gdGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0aGlzLnRhcmdldCk7XG4gICAgICBjb25zdCBidWlsZGVyQ29uZmlndXJhdGlvbnM6IEJ1aWxkZXJDb25maWd1cmF0aW9uW10gPSBbXTtcbiAgICAgIGZvciAoY29uc3QgcHJvamVjdE5hbWUgb2YgcHJvamVjdE5hbWVzKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldFNwZWM6IFRhcmdldFNwZWNpZmllciA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IHRhcmdldERlc2MgPSB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb24oe1xuICAgICAgICAgIHByb2plY3Q6IHByb2plY3ROYW1lLFxuICAgICAgICAgIHRhcmdldDogdGFyZ2V0U3BlYy50YXJnZXQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghYnVpbGRlckNvbmZpZ3VyYXRpb25zLmZpbmQoYiA9PiBiLmJ1aWxkZXIgPT09IHRhcmdldERlc2MuYnVpbGRlcikpIHtcbiAgICAgICAgICBidWlsZGVyQ29uZmlndXJhdGlvbnMucHVzaCh0YXJnZXREZXNjKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoYnVpbGRlckNvbmZpZ3VyYXRpb25zLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIGNvbnN0IGJ1aWxkZXJDb25mID0gYnVpbGRlckNvbmZpZ3VyYXRpb25zWzBdO1xuICAgICAgICBjb25zdCBidWlsZGVyRGVzYyA9IGF3YWl0IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyRGVzY3JpcHRpb24oYnVpbGRlckNvbmYpLnRvUHJvbWlzZSgpO1xuXG4gICAgICAgIHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5wdXNoKC4uLihcbiAgICAgICAgICBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnModGhpcy5fcmVnaXN0cnksIGJ1aWxkZXJEZXNjLnNjaGVtYSlcbiAgICAgICAgKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKSB7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1bkFyY2hpdGVjdFRhcmdldChvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgcnVuU2luZ2xlVGFyZ2V0ID0gYXN5bmMgKHRhcmdldFNwZWM6IFRhcmdldFNwZWNpZmllcikgPT4ge1xuICAgICAgLy8gV2UgbmVlZCB0byBidWlsZCB0aGUgYnVpbGRlclNwZWMgdHdpY2UgYmVjYXVzZSBhcmNoaXRlY3QgZG9lcyBub3QgdW5kZXJzdGFuZFxuICAgICAgLy8gb3ZlcnJpZGVzIHNlcGFyYXRlbHkgKGdldHRpbmcgdGhlIGNvbmZpZ3VyYXRpb24gYnVpbGRzIHRoZSB3aG9sZSBwcm9qZWN0LCBpbmNsdWRpbmdcbiAgICAgIC8vIG92ZXJyaWRlcykuXG4gICAgICBjb25zdCBidWlsZGVyQ29uZiA9IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih0YXJnZXRTcGVjKTtcbiAgICAgIGNvbnN0IGJ1aWxkZXJEZXNjID0gYXdhaXQgdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJEZXNjcmlwdGlvbihidWlsZGVyQ29uZikudG9Qcm9taXNlKCk7XG4gICAgICBjb25zdCB0YXJnZXRPcHRpb25BcnJheSA9IGF3YWl0IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyh0aGlzLl9yZWdpc3RyeSwgYnVpbGRlckRlc2Muc2NoZW1hKTtcbiAgICAgIGNvbnN0IG92ZXJyaWRlcyA9IHBhcnNlQXJndW1lbnRzKG9wdGlvbnNbJy0tJ10gfHwgW10sIHRhcmdldE9wdGlvbkFycmF5KTtcblxuICAgICAgaWYgKG92ZXJyaWRlc1snLS0nXSkge1xuICAgICAgICAob3ZlcnJpZGVzWyctLSddIHx8IFtdKS5mb3JFYWNoKGFkZGl0aW9uYWwgPT4ge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYFVua25vd24gb3B0aW9uOiAnJHthZGRpdGlvbmFsLnNwbGl0KC89LylbMF19J2ApO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlYWxCdWlsZGVyQ29uZiA9IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih7IC4uLnRhcmdldFNwZWMsIG92ZXJyaWRlcyB9KTtcblxuICAgICAgcmV0dXJuIHRoaXMuX2FyY2hpdGVjdC5ydW4ocmVhbEJ1aWxkZXJDb25mLCB7IGxvZ2dlcjogdGhpcy5fbG9nZ2VyIH0pLnBpcGUoXG4gICAgICAgIG1hcCgoYnVpbGRFdmVudDogQnVpbGRFdmVudCkgPT4gYnVpbGRFdmVudC5zdWNjZXNzID8gMCA6IDEpLFxuICAgICAgKS50b1Byb21pc2UoKTtcbiAgICB9O1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRhcmdldFNwZWMgPSB0aGlzLl9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnMpO1xuICAgICAgaWYgKCF0YXJnZXRTcGVjLnByb2plY3QgJiYgdGhpcy50YXJnZXQpIHtcbiAgICAgICAgLy8gVGhpcyBydW5zIGVhY2ggdGFyZ2V0IHNlcXVlbnRpYWxseS5cbiAgICAgICAgLy8gUnVubmluZyB0aGVtIGluIHBhcmFsbGVsIHdvdWxkIGp1bWJsZSB0aGUgbG9nIG1lc3NhZ2VzLlxuICAgICAgICByZXR1cm4gYXdhaXQgZnJvbSh0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRoaXMudGFyZ2V0KSkucGlwZShcbiAgICAgICAgICBjb25jYXRNYXAocHJvamVjdCA9PiBmcm9tKHJ1blNpbmdsZVRhcmdldCh7IC4uLnRhcmdldFNwZWMsIHByb2plY3QgfSkpKSxcbiAgICAgICAgICB0b0FycmF5KCksXG4gICAgICAgICAgbWFwKHJlc3VsdHMgPT4gcmVzdWx0cy5ldmVyeShyZXMgPT4gcmVzID09PSAwKSA/IDAgOiAxKSxcbiAgICAgICAgKVxuICAgICAgICAudG9Qcm9taXNlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYXdhaXQgcnVuU2luZ2xlVGFyZ2V0KHRhcmdldFNwZWMpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2Ygc2NoZW1hLlNjaGVtYVZhbGlkYXRpb25FeGNlcHRpb24pIHtcbiAgICAgICAgY29uc3QgbmV3RXJyb3JzOiBzY2hlbWEuU2NoZW1hVmFsaWRhdG9yRXJyb3JbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHNjaGVtYUVycm9yIG9mIGUuZXJyb3JzKSB7XG4gICAgICAgICAgaWYgKHNjaGVtYUVycm9yLmtleXdvcmQgPT09ICdhZGRpdGlvbmFsUHJvcGVydGllcycpIHtcbiAgICAgICAgICAgIGNvbnN0IHVua25vd25Qcm9wZXJ0eSA9IHNjaGVtYUVycm9yLnBhcmFtcy5hZGRpdGlvbmFsUHJvcGVydHk7XG4gICAgICAgICAgICBpZiAodW5rbm93blByb3BlcnR5IGluIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgY29uc3QgZGFzaGVzID0gdW5rbm93blByb3BlcnR5Lmxlbmd0aCA9PT0gMSA/ICctJyA6ICctLSc7XG4gICAgICAgICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGBVbmtub3duIG9wdGlvbjogJyR7ZGFzaGVzfSR7dW5rbm93blByb3BlcnR5fSdgKTtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIG5ld0Vycm9ycy5wdXNoKHNjaGVtYUVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZXdFcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKG5ldyBzY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbihuZXdFcnJvcnMpLm1lc3NhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGFyZ2V0TmFtZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZSA9IHRoaXMuX3dvcmtzcGFjZS5saXN0UHJvamVjdE5hbWVzKCkubWFwKHByb2plY3ROYW1lID0+XG4gICAgICB0aGlzLl9hcmNoaXRlY3QubGlzdFByb2plY3RUYXJnZXRzKHByb2plY3ROYW1lKS5pbmNsdWRlcyh0YXJnZXROYW1lKSA/IHByb2plY3ROYW1lIDogbnVsbCxcbiAgICApLmZpbHRlcih4ID0+ICEheCkgYXMgc3RyaW5nW107XG5cbiAgICBpZiAodGhpcy5tdWx0aVRhcmdldCkge1xuICAgICAgLy8gRm9yIG11bHRpIHRhcmdldCBjb21tYW5kcywgd2UgYWx3YXlzIGxpc3QgYWxsIHByb2plY3RzIHRoYXQgaGF2ZSB0aGUgdGFyZ2V0LlxuICAgICAgcmV0dXJuIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRm9yIHNpbmdsZSB0YXJnZXQgY29tbWFuZHMsIHdlIHRyeSB0cnkgdGhlIGRlZmF1bHQgcHJvamVjdCBwcm9qZWN0IGZpcnN0LFxuICAgICAgLy8gdGhlbiB0aGUgZnVsbCBsaXN0IGlmIGl0IGhhcyBhIHNpbmdsZSBwcm9qZWN0LCB0aGVuIGVycm9yIG91dC5cbiAgICAgIGNvbnN0IG1heWJlRGVmYXVsdFByb2plY3QgPSB0aGlzLl93b3Jrc3BhY2UuZ2V0RGVmYXVsdFByb2plY3ROYW1lKCk7XG4gICAgICBpZiAobWF5YmVEZWZhdWx0UHJvamVjdCAmJiBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUuaW5jbHVkZXMobWF5YmVEZWZhdWx0UHJvamVjdCkpIHtcbiAgICAgICAgcmV0dXJuIFttYXliZURlZmF1bHRQcm9qZWN0XTtcbiAgICAgIH1cblxuICAgICAgaWYgKGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZGV0ZXJtaW5lIGEgc2luZ2xlIHByb2plY3QgZm9yIHRoZSAnJHt0YXJnZXROYW1lfScgdGFyZ2V0LmApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2xvYWRXb3Jrc3BhY2VBbmRBcmNoaXRlY3QoKSB7XG4gICAgY29uc3Qgd29ya3NwYWNlTG9hZGVyID0gbmV3IFdvcmtzcGFjZUxvYWRlcih0aGlzLl9ob3N0KTtcblxuICAgIHJldHVybiB3b3Jrc3BhY2VMb2FkZXIubG9hZFdvcmtzcGFjZSh0aGlzLndvcmtzcGFjZS5yb290KS5waXBlKFxuICAgICAgdGFwKCh3b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlKSA9PiB0aGlzLl93b3Jrc3BhY2UgPSB3b3Jrc3BhY2UpLFxuICAgICAgY29uY2F0TWFwKCh3b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlKSA9PiB7XG4gICAgICAgIHJldHVybiBuZXcgQXJjaGl0ZWN0KHdvcmtzcGFjZSkubG9hZEFyY2hpdGVjdCgpO1xuICAgICAgfSksXG4gICAgICB0YXAoKGFyY2hpdGVjdDogQXJjaGl0ZWN0KSA9PiB0aGlzLl9hcmNoaXRlY3QgPSBhcmNoaXRlY3QpLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIF9tYWtlVGFyZ2V0U3BlY2lmaWVyKGNvbW1hbmRPcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyk6IFRhcmdldFNwZWNpZmllciB7XG4gICAgbGV0IHByb2plY3QsIHRhcmdldCwgY29uZmlndXJhdGlvbjtcblxuICAgIGlmIChjb21tYW5kT3B0aW9ucy50YXJnZXQpIHtcbiAgICAgIFtwcm9qZWN0LCB0YXJnZXQsIGNvbmZpZ3VyYXRpb25dID0gY29tbWFuZE9wdGlvbnMudGFyZ2V0LnNwbGl0KCc6Jyk7XG5cbiAgICAgIGlmIChjb21tYW5kT3B0aW9ucy5jb25maWd1cmF0aW9uKSB7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24gPSBjb21tYW5kT3B0aW9ucy5jb25maWd1cmF0aW9uO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwcm9qZWN0ID0gY29tbWFuZE9wdGlvbnMucHJvamVjdDtcbiAgICAgIHRhcmdldCA9IHRoaXMudGFyZ2V0O1xuICAgICAgY29uZmlndXJhdGlvbiA9IGNvbW1hbmRPcHRpb25zLmNvbmZpZ3VyYXRpb247XG4gICAgICBpZiAoIWNvbmZpZ3VyYXRpb24gJiYgY29tbWFuZE9wdGlvbnMucHJvZCkge1xuICAgICAgICBjb25maWd1cmF0aW9uID0gJ3Byb2R1Y3Rpb24nO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgcHJvamVjdCA9ICcnO1xuICAgIH1cbiAgICBpZiAoIXRhcmdldCkge1xuICAgICAgdGFyZ2V0ID0gJyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2plY3QsXG4gICAgICBjb25maWd1cmF0aW9uLFxuICAgICAgdGFyZ2V0LFxuICAgIH07XG4gIH1cbn1cbiJdfQ==