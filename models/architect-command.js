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
            if (options.help) {
                // This is a special case where we just return.
                return;
            }
            throw new Error('Cannot determine project or target for Architect command.');
        }
        if (this.target) {
            // Add options IF there's only one builder of this kind.
            const targetSpec = this._makeTargetSpecifier(options);
            const projectNames = targetSpec.project
                ? [targetSpec.project]
                : this.getProjectNamesByTarget(this.target);
            const builderConfigurations = [];
            for (const projectName of projectNames) {
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
        const result = await this._architect.run(realBuilderConf, { logger: this.logger }).toPromise();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILHlEQUltQztBQUNuQywrQ0FBd0U7QUFDeEUsb0RBQWdGO0FBQ2hGLDBEQUFvRTtBQUNwRSx1Q0FBd0Q7QUFFeEQscUNBQTBDO0FBQzFDLHlEQUFxRDtBQVNyRCxNQUFzQixnQkFFcEIsU0FBUSxpQkFBZ0M7SUFGMUM7O1FBR1UsVUFBSyxHQUFHLElBQUkscUJBQWMsRUFBRSxDQUFDO1FBS3JDLHFEQUFxRDtRQUMzQyxnQkFBVyxHQUFHLEtBQUssQ0FBQztJQW9PaEMsQ0FBQztJQWhPUSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQTRDO1FBQ2xFLE1BQU0sS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVoQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksV0FBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3RELElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsV0FBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUU3RSxNQUFNLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1FBRXhDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDbkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMvRCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEMsSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7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QUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQztRQUVuQyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUU7WUFDekIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRXBFLElBQUksY0FBYyxDQUFDLGFBQWEsRUFBRTtnQkFDaEMsYUFBYSxHQUFHLGNBQWMsQ0FBQyxhQUFhLENBQUM7YUFDOUM7U0FDRjthQUFNO1lBQ0wsT0FBTyxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUM7WUFDakMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDckIsYUFBYSxHQUFHLGNBQWMsQ0FBQyxhQUFhLENBQUM7WUFDN0MsSUFBSSxDQUFDLGFBQWEsSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFO2dCQUN6QyxhQUFhLEdBQUcsWUFBWSxDQUFDO2FBQzlCO1NBQ0Y7UUFFRCxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osT0FBTyxHQUFHLEVBQUUsQ0FBQztTQUNkO1FBQ0QsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE1BQU0sR0FBRyxFQUFFLENBQUM7U0FDYjtRQUVELE9BQU87WUFDTCxPQUFPO1lBQ1AsYUFBYTtZQUNiLE1BQU07U0FDUCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBN09ELDRDQTZPQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIEFyY2hpdGVjdCxcbiAgQnVpbGRlckNvbmZpZ3VyYXRpb24sXG4gIFRhcmdldFNwZWNpZmllcixcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBleHBlcmltZW50YWwsIGpzb24sIHNjaGVtYSwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE5vZGVKc1N5bmNIb3N0LCBjcmVhdGVDb25zb2xlTG9nZ2VyIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQgeyBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMgfSBmcm9tICcuLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuaW1wb3J0IHsgQmFzZUNvbW1hbmRPcHRpb25zLCBDb21tYW5kIH0gZnJvbSAnLi9jb21tYW5kJztcbmltcG9ydCB7IEFyZ3VtZW50cyB9IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB7IHBhcnNlQXJndW1lbnRzIH0gZnJvbSAnLi9wYXJzZXInO1xuaW1wb3J0IHsgV29ya3NwYWNlTG9hZGVyIH0gZnJvbSAnLi93b3Jrc3BhY2UtbG9hZGVyJztcblxuZXhwb3J0IGludGVyZmFjZSBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyBleHRlbmRzIEJhc2VDb21tYW5kT3B0aW9ucyB7XG4gIHByb2plY3Q/OiBzdHJpbmc7XG4gIGNvbmZpZ3VyYXRpb24/OiBzdHJpbmc7XG4gIHByb2Q/OiBib29sZWFuO1xuICB0YXJnZXQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBcmNoaXRlY3RDb21tYW5kPFxuICBUIGV4dGVuZHMgQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgPSBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyxcbj4gZXh0ZW5kcyBDb21tYW5kPEFyY2hpdGVjdENvbW1hbmRPcHRpb25zPiB7XG4gIHByaXZhdGUgX2hvc3QgPSBuZXcgTm9kZUpzU3luY0hvc3QoKTtcbiAgcHJvdGVjdGVkIF9hcmNoaXRlY3Q6IEFyY2hpdGVjdDtcbiAgcHJvdGVjdGVkIF93b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlO1xuICBwcm90ZWN0ZWQgX3JlZ2lzdHJ5OiBqc29uLnNjaGVtYS5TY2hlbWFSZWdpc3RyeTtcblxuICAvLyBJZiB0aGlzIGNvbW1hbmQgc3VwcG9ydHMgcnVubmluZyBtdWx0aXBsZSB0YXJnZXRzLlxuICBwcm90ZWN0ZWQgbXVsdGlUYXJnZXQgPSBmYWxzZTtcblxuICB0YXJnZXQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBwdWJsaWMgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyAmIEFyZ3VtZW50cyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHN1cGVyLmluaXRpYWxpemUob3B0aW9ucyk7XG5cbiAgICB0aGlzLl9yZWdpc3RyeSA9IG5ldyBqc29uLnNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoKTtcbiAgICB0aGlzLl9yZWdpc3RyeS5hZGRQb3N0VHJhbnNmb3JtKGpzb24uc2NoZW1hLnRyYW5zZm9ybXMuYWRkVW5kZWZpbmVkRGVmYXVsdHMpO1xuXG4gICAgYXdhaXQgdGhpcy5fbG9hZFdvcmtzcGFjZUFuZEFyY2hpdGVjdCgpO1xuXG4gICAgaWYgKCFvcHRpb25zLnByb2plY3QgJiYgdGhpcy50YXJnZXQpIHtcbiAgICAgIGNvbnN0IHByb2plY3ROYW1lcyA9IHRoaXMuZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGhpcy50YXJnZXQpO1xuICAgICAgY29uc3QgbGVmdG92ZXJzID0gb3B0aW9uc1snLS0nXTtcbiAgICAgIGlmIChwcm9qZWN0TmFtZXMubGVuZ3RoID4gMSAmJiBsZWZ0b3ZlcnMgJiYgbGVmdG92ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gVmVyaWZ5IHRoYXQgYWxsIGJ1aWxkZXJzIGFyZSB0aGUgc2FtZSwgb3RoZXJ3aXNlIGVycm9yIG91dCAoc2luY2UgdGhlIG1lYW5pbmcgb2YgYW5cbiAgICAgICAgLy8gb3B0aW9uIGNvdWxkIHZhcnkgZnJvbSBidWlsZGVyIHRvIGJ1aWxkZXIpLlxuXG4gICAgICAgIGNvbnN0IGJ1aWxkZXJzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHByb2plY3ROYW1lIG9mIHByb2plY3ROYW1lcykge1xuICAgICAgICAgIGNvbnN0IHRhcmdldFNwZWM6IFRhcmdldFNwZWNpZmllciA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgICAgICAgY29uc3QgdGFyZ2V0RGVzYyA9IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih7XG4gICAgICAgICAgICBwcm9qZWN0OiBwcm9qZWN0TmFtZSxcbiAgICAgICAgICAgIHRhcmdldDogdGFyZ2V0U3BlYy50YXJnZXQsXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoYnVpbGRlcnMuaW5kZXhPZih0YXJnZXREZXNjLmJ1aWxkZXIpID09IC0xKSB7XG4gICAgICAgICAgICBidWlsZGVycy5wdXNoKHRhcmdldERlc2MuYnVpbGRlcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGJ1aWxkZXJzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgQXJjaGl0ZWN0IGNvbW1hbmRzIHdpdGggY29tbWFuZCBsaW5lIG92ZXJyaWRlcyBjYW5ub3QgdGFyZ2V0IGRpZmZlcmVudCBidWlsZGVycy4gVGhlXG4gICAgICAgICAgICAnJHt0aGlzLnRhcmdldH0nIHRhcmdldCB3b3VsZCBydW4gb24gcHJvamVjdHMgJHtwcm9qZWN0TmFtZXMuam9pbigpfSB3aGljaCBoYXZlIHRoZVxuICAgICAgICAgICAgZm9sbG93aW5nIGJ1aWxkZXJzOiAkeydcXG4gICcgKyBidWlsZGVycy5qb2luKCdcXG4gICcpfVxuICAgICAgICAgIGApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0U3BlYzogVGFyZ2V0U3BlY2lmaWVyID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcblxuICAgIGlmICh0aGlzLnRhcmdldCAmJiAhdGFyZ2V0U3BlYy5wcm9qZWN0KSB7XG4gICAgICBjb25zdCBwcm9qZWN0cyA9IHRoaXMuZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGhpcy50YXJnZXQpO1xuXG4gICAgICBpZiAocHJvamVjdHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIC8vIElmIHRoZXJlIGlzIGEgc2luZ2xlIHRhcmdldCwgdXNlIGl0IHRvIHBhcnNlIG92ZXJyaWRlcy5cbiAgICAgICAgdGFyZ2V0U3BlYy5wcm9qZWN0ID0gcHJvamVjdHNbMF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCghdGFyZ2V0U3BlYy5wcm9qZWN0IHx8ICF0YXJnZXRTcGVjLnRhcmdldCkgJiYgIXRoaXMubXVsdGlUYXJnZXQpIHtcbiAgICAgIGlmIChvcHRpb25zLmhlbHApIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBqdXN0IHJldHVybi5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBkZXRlcm1pbmUgcHJvamVjdCBvciB0YXJnZXQgZm9yIEFyY2hpdGVjdCBjb21tYW5kLicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnRhcmdldCkge1xuICAgICAgLy8gQWRkIG9wdGlvbnMgSUYgdGhlcmUncyBvbmx5IG9uZSBidWlsZGVyIG9mIHRoaXMga2luZC5cbiAgICAgIGNvbnN0IHRhcmdldFNwZWM6IFRhcmdldFNwZWNpZmllciA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgICBjb25zdCBwcm9qZWN0TmFtZXMgPSB0YXJnZXRTcGVjLnByb2plY3RcbiAgICAgICAgPyBbdGFyZ2V0U3BlYy5wcm9qZWN0XVxuICAgICAgICA6IHRoaXMuZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGhpcy50YXJnZXQpO1xuXG4gICAgICBjb25zdCBidWlsZGVyQ29uZmlndXJhdGlvbnM6IEJ1aWxkZXJDb25maWd1cmF0aW9uW10gPSBbXTtcbiAgICAgIGZvciAoY29uc3QgcHJvamVjdE5hbWUgb2YgcHJvamVjdE5hbWVzKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldERlc2MgPSB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb24oe1xuICAgICAgICAgIHByb2plY3Q6IHByb2plY3ROYW1lLFxuICAgICAgICAgIHRhcmdldDogdGFyZ2V0U3BlYy50YXJnZXQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghYnVpbGRlckNvbmZpZ3VyYXRpb25zLmZpbmQoYiA9PiBiLmJ1aWxkZXIgPT09IHRhcmdldERlc2MuYnVpbGRlcikpIHtcbiAgICAgICAgICBidWlsZGVyQ29uZmlndXJhdGlvbnMucHVzaCh0YXJnZXREZXNjKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoYnVpbGRlckNvbmZpZ3VyYXRpb25zLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIGNvbnN0IGJ1aWxkZXJDb25mID0gYnVpbGRlckNvbmZpZ3VyYXRpb25zWzBdO1xuICAgICAgICBjb25zdCBidWlsZGVyRGVzYyA9IGF3YWl0IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyRGVzY3JpcHRpb24oYnVpbGRlckNvbmYpLnRvUHJvbWlzZSgpO1xuXG4gICAgICAgIHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5wdXNoKC4uLihcbiAgICAgICAgICBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnModGhpcy5fcmVnaXN0cnksIGJ1aWxkZXJEZXNjLnNjaGVtYSlcbiAgICAgICAgKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zICYgQXJndW1lbnRzKSB7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1blNpbmdsZVRhcmdldCh0YXJnZXRTcGVjOiBUYXJnZXRTcGVjaWZpZXIsIG9wdGlvbnM6IHN0cmluZ1tdKSB7XG4gICAgLy8gV2UgbmVlZCB0byBidWlsZCB0aGUgYnVpbGRlclNwZWMgdHdpY2UgYmVjYXVzZSBhcmNoaXRlY3QgZG9lcyBub3QgdW5kZXJzdGFuZFxuICAgIC8vIG92ZXJyaWRlcyBzZXBhcmF0ZWx5IChnZXR0aW5nIHRoZSBjb25maWd1cmF0aW9uIGJ1aWxkcyB0aGUgd2hvbGUgcHJvamVjdCwgaW5jbHVkaW5nXG4gICAgLy8gb3ZlcnJpZGVzKS5cbiAgICBjb25zdCBidWlsZGVyQ29uZiA9IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih0YXJnZXRTcGVjKTtcbiAgICBjb25zdCBidWlsZGVyRGVzYyA9IGF3YWl0IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyRGVzY3JpcHRpb24oYnVpbGRlckNvbmYpLnRvUHJvbWlzZSgpO1xuICAgIGNvbnN0IHRhcmdldE9wdGlvbkFycmF5ID0gYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKHRoaXMuX3JlZ2lzdHJ5LCBidWlsZGVyRGVzYy5zY2hlbWEpO1xuICAgIGNvbnN0IG92ZXJyaWRlcyA9IHBhcnNlQXJndW1lbnRzKG9wdGlvbnMsIHRhcmdldE9wdGlvbkFycmF5LCB0aGlzLmxvZ2dlcik7XG5cbiAgICBpZiAob3ZlcnJpZGVzWyctLSddKSB7XG4gICAgICAob3ZlcnJpZGVzWyctLSddIHx8IFtdKS5mb3JFYWNoKGFkZGl0aW9uYWwgPT4ge1xuICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChgVW5rbm93biBvcHRpb246ICcke2FkZGl0aW9uYWwuc3BsaXQoLz0vKVswXX0nYCk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICAgIGNvbnN0IHJlYWxCdWlsZGVyQ29uZiA9IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih7IC4uLnRhcmdldFNwZWMsIG92ZXJyaWRlcyB9KTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuX2FyY2hpdGVjdC5ydW4ocmVhbEJ1aWxkZXJDb25mLCB7IGxvZ2dlcjogdGhpcy5sb2dnZXIgfSkudG9Qcm9taXNlKCk7XG5cbiAgICByZXR1cm4gcmVzdWx0LnN1Y2Nlc3MgPyAwIDogMTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBydW5BcmNoaXRlY3RUYXJnZXQoXG4gICAgb3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgJiBBcmd1bWVudHMsXG4gICk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgZXh0cmEgPSBvcHRpb25zWyctLSddIHx8IFtdO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRhcmdldFNwZWMgPSB0aGlzLl9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnMpO1xuICAgICAgaWYgKCF0YXJnZXRTcGVjLnByb2plY3QgJiYgdGhpcy50YXJnZXQpIHtcbiAgICAgICAgLy8gVGhpcyBydW5zIGVhY2ggdGFyZ2V0IHNlcXVlbnRpYWxseS5cbiAgICAgICAgLy8gUnVubmluZyB0aGVtIGluIHBhcmFsbGVsIHdvdWxkIGp1bWJsZSB0aGUgbG9nIG1lc3NhZ2VzLlxuICAgICAgICBsZXQgcmVzdWx0ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCBwcm9qZWN0IG9mIHRoaXMuZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGhpcy50YXJnZXQpKSB7XG4gICAgICAgICAgcmVzdWx0IHw9IGF3YWl0IHRoaXMucnVuU2luZ2xlVGFyZ2V0KHsgLi4udGFyZ2V0U3BlYywgcHJvamVjdCB9LCBleHRyYSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuU2luZ2xlVGFyZ2V0KHRhcmdldFNwZWMsIGV4dHJhKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKSB7XG4gICAgICAgIGNvbnN0IG5ld0Vycm9yczogc2NoZW1hLlNjaGVtYVZhbGlkYXRvckVycm9yW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBzY2hlbWFFcnJvciBvZiBlLmVycm9ycykge1xuICAgICAgICAgIGlmIChzY2hlbWFFcnJvci5rZXl3b3JkID09PSAnYWRkaXRpb25hbFByb3BlcnRpZXMnKSB7XG4gICAgICAgICAgICBjb25zdCB1bmtub3duUHJvcGVydHkgPSBzY2hlbWFFcnJvci5wYXJhbXMuYWRkaXRpb25hbFByb3BlcnR5O1xuICAgICAgICAgICAgaWYgKHVua25vd25Qcm9wZXJ0eSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRhc2hlcyA9IHVua25vd25Qcm9wZXJ0eS5sZW5ndGggPT09IDEgPyAnLScgOiAnLS0nO1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChgVW5rbm93biBvcHRpb246ICcke2Rhc2hlc30ke3Vua25vd25Qcm9wZXJ0eX0nYCk7XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBuZXdFcnJvcnMucHVzaChzY2hlbWFFcnJvcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobmV3RXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihuZXcgc2NoZW1hLlNjaGVtYVZhbGlkYXRpb25FeGNlcHRpb24obmV3RXJyb3JzKS5tZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRhcmdldE5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUgPSB0aGlzLl93b3Jrc3BhY2UubGlzdFByb2plY3ROYW1lcygpLm1hcChwcm9qZWN0TmFtZSA9PlxuICAgICAgdGhpcy5fYXJjaGl0ZWN0Lmxpc3RQcm9qZWN0VGFyZ2V0cyhwcm9qZWN0TmFtZSkuaW5jbHVkZXModGFyZ2V0TmFtZSkgPyBwcm9qZWN0TmFtZSA6IG51bGwsXG4gICAgKS5maWx0ZXIoeCA9PiAhIXgpIGFzIHN0cmluZ1tdO1xuXG4gICAgaWYgKHRoaXMubXVsdGlUYXJnZXQpIHtcbiAgICAgIC8vIEZvciBtdWx0aSB0YXJnZXQgY29tbWFuZHMsIHdlIGFsd2F5cyBsaXN0IGFsbCBwcm9qZWN0cyB0aGF0IGhhdmUgdGhlIHRhcmdldC5cbiAgICAgIHJldHVybiBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZvciBzaW5nbGUgdGFyZ2V0IGNvbW1hbmRzLCB3ZSB0cnkgdGhlIGRlZmF1bHQgcHJvamVjdCBmaXJzdCxcbiAgICAgIC8vIHRoZW4gdGhlIGZ1bGwgbGlzdCBpZiBpdCBoYXMgYSBzaW5nbGUgcHJvamVjdCwgdGhlbiBlcnJvciBvdXQuXG4gICAgICBjb25zdCBtYXliZURlZmF1bHRQcm9qZWN0ID0gdGhpcy5fd29ya3NwYWNlLmdldERlZmF1bHRQcm9qZWN0TmFtZSgpO1xuICAgICAgaWYgKG1heWJlRGVmYXVsdFByb2plY3QgJiYgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmluY2x1ZGVzKG1heWJlRGVmYXVsdFByb2plY3QpKSB7XG4gICAgICAgIHJldHVybiBbbWF5YmVEZWZhdWx0UHJvamVjdF07XG4gICAgICB9XG5cbiAgICAgIGlmIChhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWU7XG4gICAgICB9XG5cbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGRldGVybWluZSBhIHNpbmdsZSBwcm9qZWN0IGZvciB0aGUgJyR7dGFyZ2V0TmFtZX0nIHRhcmdldC5gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIF9sb2FkV29ya3NwYWNlQW5kQXJjaGl0ZWN0KCkge1xuICAgIGNvbnN0IHdvcmtzcGFjZUxvYWRlciA9IG5ldyBXb3Jrc3BhY2VMb2FkZXIodGhpcy5faG9zdCk7XG5cbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCB3b3Jrc3BhY2VMb2FkZXIubG9hZFdvcmtzcGFjZSh0aGlzLndvcmtzcGFjZS5yb290KTtcblxuICAgIHRoaXMuX3dvcmtzcGFjZSA9IHdvcmtzcGFjZTtcbiAgICB0aGlzLl9hcmNoaXRlY3QgPSBhd2FpdCBuZXcgQXJjaGl0ZWN0KHdvcmtzcGFjZSkubG9hZEFyY2hpdGVjdCgpLnRvUHJvbWlzZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBfbWFrZVRhcmdldFNwZWNpZmllcihjb21tYW5kT3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpOiBUYXJnZXRTcGVjaWZpZXIge1xuICAgIGxldCBwcm9qZWN0LCB0YXJnZXQsIGNvbmZpZ3VyYXRpb247XG5cbiAgICBpZiAoY29tbWFuZE9wdGlvbnMudGFyZ2V0KSB7XG4gICAgICBbcHJvamVjdCwgdGFyZ2V0LCBjb25maWd1cmF0aW9uXSA9IGNvbW1hbmRPcHRpb25zLnRhcmdldC5zcGxpdCgnOicpO1xuXG4gICAgICBpZiAoY29tbWFuZE9wdGlvbnMuY29uZmlndXJhdGlvbikge1xuICAgICAgICBjb25maWd1cmF0aW9uID0gY29tbWFuZE9wdGlvbnMuY29uZmlndXJhdGlvbjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcHJvamVjdCA9IGNvbW1hbmRPcHRpb25zLnByb2plY3Q7XG4gICAgICB0YXJnZXQgPSB0aGlzLnRhcmdldDtcbiAgICAgIGNvbmZpZ3VyYXRpb24gPSBjb21tYW5kT3B0aW9ucy5jb25maWd1cmF0aW9uO1xuICAgICAgaWYgKCFjb25maWd1cmF0aW9uICYmIGNvbW1hbmRPcHRpb25zLnByb2QpIHtcbiAgICAgICAgY29uZmlndXJhdGlvbiA9ICdwcm9kdWN0aW9uJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHByb2plY3QgPSAnJztcbiAgICB9XG4gICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgIHRhcmdldCA9ICcnO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBwcm9qZWN0LFxuICAgICAgY29uZmlndXJhdGlvbixcbiAgICAgIHRhcmdldCxcbiAgICB9O1xuICB9XG59XG4iXX0=