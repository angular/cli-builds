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
            if (options.help || options.helpJson) {
                // This is a special case where we just return.
                return;
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILHlEQUttQztBQUNuQywrQ0FBd0U7QUFDeEUsb0RBQWdGO0FBQ2hGLCtCQUE0QjtBQUM1Qiw4Q0FBOEQ7QUFDOUQsMERBQW9FO0FBQ3BFLHVDQUF3RDtBQUV4RCxxQ0FBMEM7QUFDMUMseURBQXFEO0FBU3JELE1BQXNCLGdCQUVwQixTQUFRLGlCQUFnQztJQUYxQzs7UUFHVSxVQUFLLEdBQUcsSUFBSSxxQkFBYyxFQUFFLENBQUM7UUFHM0IsWUFBTyxHQUFHLDBCQUFtQixFQUFFLENBQUM7UUFJMUMscURBQXFEO1FBQzNDLGdCQUFXLEdBQUcsS0FBSyxDQUFDO0lBa09oQyxDQUFDO0lBOU5RLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBNEM7UUFDbEUsTUFBTSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWhDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxXQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDdEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRTdFLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFcEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNuQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9ELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxJ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Y2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIEFyY2hpdGVjdCxcbiAgQnVpbGRFdmVudCxcbiAgQnVpbGRlckNvbmZpZ3VyYXRpb24sXG4gIFRhcmdldFNwZWNpZmllcixcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBleHBlcmltZW50YWwsIGpzb24sIHNjaGVtYSwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE5vZGVKc1N5bmNIb3N0LCBjcmVhdGVDb25zb2xlTG9nZ2VyIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQgeyBmcm9tIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBjb25jYXRNYXAsIG1hcCwgdGFwLCB0b0FycmF5IH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7IEJhc2VDb21tYW5kT3B0aW9ucywgQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZCc7XG5pbXBvcnQgeyBBcmd1bWVudHMgfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBwYXJzZUFyZ3VtZW50cyB9IGZyb20gJy4vcGFyc2VyJztcbmltcG9ydCB7IFdvcmtzcGFjZUxvYWRlciB9IGZyb20gJy4vd29ya3NwYWNlLWxvYWRlcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgZXh0ZW5kcyBCYXNlQ29tbWFuZE9wdGlvbnMge1xuICBwcm9qZWN0Pzogc3RyaW5nO1xuICBjb25maWd1cmF0aW9uPzogc3RyaW5nO1xuICBwcm9kPzogYm9vbGVhbjtcbiAgdGFyZ2V0Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXJjaGl0ZWN0Q29tbWFuZDxcbiAgVCBleHRlbmRzIEFyY2hpdGVjdENvbW1hbmRPcHRpb25zID0gQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMsXG4+IGV4dGVuZHMgQ29tbWFuZDxBcmNoaXRlY3RDb21tYW5kT3B0aW9ucz4ge1xuICBwcml2YXRlIF9ob3N0ID0gbmV3IE5vZGVKc1N5bmNIb3N0KCk7XG4gIHByb3RlY3RlZCBfYXJjaGl0ZWN0OiBBcmNoaXRlY3Q7XG4gIHByb3RlY3RlZCBfd29ya3NwYWNlOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZTtcbiAgcHJvdGVjdGVkIF9sb2dnZXIgPSBjcmVhdGVDb25zb2xlTG9nZ2VyKCk7XG5cbiAgcHJvdGVjdGVkIF9yZWdpc3RyeToganNvbi5zY2hlbWEuU2NoZW1hUmVnaXN0cnk7XG5cbiAgLy8gSWYgdGhpcyBjb21tYW5kIHN1cHBvcnRzIHJ1bm5pbmcgbXVsdGlwbGUgdGFyZ2V0cy5cbiAgcHJvdGVjdGVkIG11bHRpVGFyZ2V0ID0gZmFsc2U7XG5cbiAgdGFyZ2V0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgcHVibGljIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgJiBBcmd1bWVudHMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCBzdXBlci5pbml0aWFsaXplKG9wdGlvbnMpO1xuXG4gICAgdGhpcy5fcmVnaXN0cnkgPSBuZXcganNvbi5zY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KCk7XG4gICAgdGhpcy5fcmVnaXN0cnkuYWRkUG9zdFRyYW5zZm9ybShqc29uLnNjaGVtYS50cmFuc2Zvcm1zLmFkZFVuZGVmaW5lZERlZmF1bHRzKTtcblxuICAgIGF3YWl0IHRoaXMuX2xvYWRXb3Jrc3BhY2VBbmRBcmNoaXRlY3QoKS50b1Byb21pc2UoKTtcblxuICAgIGlmICghb3B0aW9ucy5wcm9qZWN0ICYmIHRoaXMudGFyZ2V0KSB7XG4gICAgICBjb25zdCBwcm9qZWN0TmFtZXMgPSB0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRoaXMudGFyZ2V0KTtcbiAgICAgIGNvbnN0IGxlZnRvdmVycyA9IG9wdGlvbnNbJy0tJ107XG4gICAgICBpZiAocHJvamVjdE5hbWVzLmxlbmd0aCA+IDEgJiYgbGVmdG92ZXJzICYmIGxlZnRvdmVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIFZlcmlmeSB0aGF0IGFsbCBidWlsZGVycyBhcmUgdGhlIHNhbWUsIG90aGVyd2lzZSBlcnJvciBvdXQgKHNpbmNlIHRoZSBtZWFuaW5nIG9mIGFuXG4gICAgICAgIC8vIG9wdGlvbiBjb3VsZCB2YXJ5IGZyb20gYnVpbGRlciB0byBidWlsZGVyKS5cblxuICAgICAgICBjb25zdCBidWlsZGVyczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBwcm9qZWN0TmFtZSBvZiBwcm9qZWN0TmFtZXMpIHtcbiAgICAgICAgICBjb25zdCB0YXJnZXRTcGVjOiBUYXJnZXRTcGVjaWZpZXIgPSB0aGlzLl9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnMpO1xuICAgICAgICAgIGNvbnN0IHRhcmdldERlc2MgPSB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb24oe1xuICAgICAgICAgICAgcHJvamVjdDogcHJvamVjdE5hbWUsXG4gICAgICAgICAgICB0YXJnZXQ6IHRhcmdldFNwZWMudGFyZ2V0LFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKGJ1aWxkZXJzLmluZGV4T2YodGFyZ2V0RGVzYy5idWlsZGVyKSA9PSAtMSkge1xuICAgICAgICAgICAgYnVpbGRlcnMucHVzaCh0YXJnZXREZXNjLmJ1aWxkZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChidWlsZGVycy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgIEFyY2hpdGVjdCBjb21tYW5kcyB3aXRoIGNvbW1hbmQgbGluZSBvdmVycmlkZXMgY2Fubm90IHRhcmdldCBkaWZmZXJlbnQgYnVpbGRlcnMuIFRoZVxuICAgICAgICAgICAgJyR7dGhpcy50YXJnZXR9JyB0YXJnZXQgd291bGQgcnVuIG9uIHByb2plY3RzICR7cHJvamVjdE5hbWVzLmpvaW4oKX0gd2hpY2ggaGF2ZSB0aGVcbiAgICAgICAgICAgIGZvbGxvd2luZyBidWlsZGVyczogJHsnXFxuICAnICsgYnVpbGRlcnMuam9pbignXFxuICAnKX1cbiAgICAgICAgICBgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldFNwZWM6IFRhcmdldFNwZWNpZmllciA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG5cbiAgICBpZiAodGhpcy50YXJnZXQgJiYgIXRhcmdldFNwZWMucHJvamVjdCkge1xuICAgICAgY29uc3QgcHJvamVjdHMgPSB0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRoaXMudGFyZ2V0KTtcblxuICAgICAgaWYgKHByb2plY3RzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAvLyBJZiB0aGVyZSBpcyBhIHNpbmdsZSB0YXJnZXQsIHVzZSBpdCB0byBwYXJzZSBvdmVycmlkZXMuXG4gICAgICAgIHRhcmdldFNwZWMucHJvamVjdCA9IHByb2plY3RzWzBdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICgoIXRhcmdldFNwZWMucHJvamVjdCB8fCAhdGFyZ2V0U3BlYy50YXJnZXQpICYmICF0aGlzLm11bHRpVGFyZ2V0KSB7XG4gICAgICBpZiAob3B0aW9ucy5oZWxwIHx8IG9wdGlvbnMuaGVscEpzb24pIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhIHNwZWNpYWwgY2FzZSB3aGVyZSB3ZSBqdXN0IHJldHVybi5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBkZXRlcm1pbmUgcHJvamVjdCBvciB0YXJnZXQgZm9yIEFyY2hpdGVjdCBjb21tYW5kLicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnRhcmdldCkge1xuICAgICAgLy8gQWRkIG9wdGlvbnMgSUYgdGhlcmUncyBvbmx5IG9uZSBidWlsZGVyIG9mIHRoaXMga2luZC5cbiAgICAgIGNvbnN0IHByb2plY3ROYW1lcyA9IHRoaXMuZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGhpcy50YXJnZXQpO1xuICAgICAgY29uc3QgYnVpbGRlckNvbmZpZ3VyYXRpb25zOiBCdWlsZGVyQ29uZmlndXJhdGlvbltdID0gW107XG4gICAgICBmb3IgKGNvbnN0IHByb2plY3ROYW1lIG9mIHByb2plY3ROYW1lcykge1xuICAgICAgICBjb25zdCB0YXJnZXRTcGVjOiBUYXJnZXRTcGVjaWZpZXIgPSB0aGlzLl9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnMpO1xuICAgICAgICBjb25zdCB0YXJnZXREZXNjID0gdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJDb25maWd1cmF0aW9uKHtcbiAgICAgICAgICBwcm9qZWN0OiBwcm9qZWN0TmFtZSxcbiAgICAgICAgICB0YXJnZXQ6IHRhcmdldFNwZWMudGFyZ2V0LFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIWJ1aWxkZXJDb25maWd1cmF0aW9ucy5maW5kKGIgPT4gYi5idWlsZGVyID09PSB0YXJnZXREZXNjLmJ1aWxkZXIpKSB7XG4gICAgICAgICAgYnVpbGRlckNvbmZpZ3VyYXRpb25zLnB1c2godGFyZ2V0RGVzYyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGJ1aWxkZXJDb25maWd1cmF0aW9ucy5sZW5ndGggPT0gMSkge1xuICAgICAgICBjb25zdCBidWlsZGVyQ29uZiA9IGJ1aWxkZXJDb25maWd1cmF0aW9uc1swXTtcbiAgICAgICAgY29uc3QgYnVpbGRlckRlc2MgPSBhd2FpdCB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckRlc2NyaXB0aW9uKGJ1aWxkZXJDb25mKS50b1Byb21pc2UoKTtcblxuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMucHVzaCguLi4oXG4gICAgICAgICAgYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKHRoaXMuX3JlZ2lzdHJ5LCBidWlsZGVyRGVzYy5zY2hlbWEpXG4gICAgICAgICkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyAmIEFyZ3VtZW50cykge1xuICAgIHJldHVybiBhd2FpdCB0aGlzLnJ1bkFyY2hpdGVjdFRhcmdldChvcHRpb25zKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBydW5BcmNoaXRlY3RUYXJnZXQoXG4gICAgb3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgJiBBcmd1bWVudHMsXG4gICk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgcnVuU2luZ2xlVGFyZ2V0ID0gYXN5bmMgKHRhcmdldFNwZWM6IFRhcmdldFNwZWNpZmllcikgPT4ge1xuICAgICAgLy8gV2UgbmVlZCB0byBidWlsZCB0aGUgYnVpbGRlclNwZWMgdHdpY2UgYmVjYXVzZSBhcmNoaXRlY3QgZG9lcyBub3QgdW5kZXJzdGFuZFxuICAgICAgLy8gb3ZlcnJpZGVzIHNlcGFyYXRlbHkgKGdldHRpbmcgdGhlIGNvbmZpZ3VyYXRpb24gYnVpbGRzIHRoZSB3aG9sZSBwcm9qZWN0LCBpbmNsdWRpbmdcbiAgICAgIC8vIG92ZXJyaWRlcykuXG4gICAgICBjb25zdCBidWlsZGVyQ29uZiA9IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih0YXJnZXRTcGVjKTtcbiAgICAgIGNvbnN0IGJ1aWxkZXJEZXNjID0gYXdhaXQgdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJEZXNjcmlwdGlvbihidWlsZGVyQ29uZikudG9Qcm9taXNlKCk7XG4gICAgICBjb25zdCB0YXJnZXRPcHRpb25BcnJheSA9IGF3YWl0IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyh0aGlzLl9yZWdpc3RyeSwgYnVpbGRlckRlc2Muc2NoZW1hKTtcbiAgICAgIGNvbnN0IG92ZXJyaWRlcyA9IHBhcnNlQXJndW1lbnRzKG9wdGlvbnNbJy0tJ10gfHwgW10sIHRhcmdldE9wdGlvbkFycmF5KTtcblxuICAgICAgaWYgKG92ZXJyaWRlc1snLS0nXSkge1xuICAgICAgICAob3ZlcnJpZGVzWyctLSddIHx8IFtdKS5mb3JFYWNoKGFkZGl0aW9uYWwgPT4ge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYFVua25vd24gb3B0aW9uOiAnJHthZGRpdGlvbmFsLnNwbGl0KC89LylbMF19J2ApO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlYWxCdWlsZGVyQ29uZiA9IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih7IC4uLnRhcmdldFNwZWMsIG92ZXJyaWRlcyB9KTtcblxuICAgICAgcmV0dXJuIHRoaXMuX2FyY2hpdGVjdC5ydW4ocmVhbEJ1aWxkZXJDb25mLCB7IGxvZ2dlcjogdGhpcy5fbG9nZ2VyIH0pLnBpcGUoXG4gICAgICAgIG1hcCgoYnVpbGRFdmVudDogQnVpbGRFdmVudCkgPT4gYnVpbGRFdmVudC5zdWNjZXNzID8gMCA6IDEpLFxuICAgICAgKS50b1Byb21pc2UoKTtcbiAgICB9O1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRhcmdldFNwZWMgPSB0aGlzLl9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnMpO1xuICAgICAgaWYgKCF0YXJnZXRTcGVjLnByb2plY3QgJiYgdGhpcy50YXJnZXQpIHtcbiAgICAgICAgLy8gVGhpcyBydW5zIGVhY2ggdGFyZ2V0IHNlcXVlbnRpYWxseS5cbiAgICAgICAgLy8gUnVubmluZyB0aGVtIGluIHBhcmFsbGVsIHdvdWxkIGp1bWJsZSB0aGUgbG9nIG1lc3NhZ2VzLlxuICAgICAgICByZXR1cm4gYXdhaXQgZnJvbSh0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRoaXMudGFyZ2V0KSkucGlwZShcbiAgICAgICAgICBjb25jYXRNYXAocHJvamVjdCA9PiBmcm9tKHJ1blNpbmdsZVRhcmdldCh7IC4uLnRhcmdldFNwZWMsIHByb2plY3QgfSkpKSxcbiAgICAgICAgICB0b0FycmF5KCksXG4gICAgICAgICAgbWFwKHJlc3VsdHMgPT4gcmVzdWx0cy5ldmVyeShyZXMgPT4gcmVzID09PSAwKSA/IDAgOiAxKSxcbiAgICAgICAgKVxuICAgICAgICAudG9Qcm9taXNlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYXdhaXQgcnVuU2luZ2xlVGFyZ2V0KHRhcmdldFNwZWMpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2Ygc2NoZW1hLlNjaGVtYVZhbGlkYXRpb25FeGNlcHRpb24pIHtcbiAgICAgICAgY29uc3QgbmV3RXJyb3JzOiBzY2hlbWEuU2NoZW1hVmFsaWRhdG9yRXJyb3JbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHNjaGVtYUVycm9yIG9mIGUuZXJyb3JzKSB7XG4gICAgICAgICAgaWYgKHNjaGVtYUVycm9yLmtleXdvcmQgPT09ICdhZGRpdGlvbmFsUHJvcGVydGllcycpIHtcbiAgICAgICAgICAgIGNvbnN0IHVua25vd25Qcm9wZXJ0eSA9IHNjaGVtYUVycm9yLnBhcmFtcy5hZGRpdGlvbmFsUHJvcGVydHk7XG4gICAgICAgICAgICBpZiAodW5rbm93blByb3BlcnR5IGluIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgY29uc3QgZGFzaGVzID0gdW5rbm93blByb3BlcnR5Lmxlbmd0aCA9PT0gMSA/ICctJyA6ICctLSc7XG4gICAgICAgICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGBVbmtub3duIG9wdGlvbjogJyR7ZGFzaGVzfSR7dW5rbm93blByb3BlcnR5fSdgKTtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIG5ld0Vycm9ycy5wdXNoKHNjaGVtYUVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZXdFcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKG5ldyBzY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbihuZXdFcnJvcnMpLm1lc3NhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGFyZ2V0TmFtZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZSA9IHRoaXMuX3dvcmtzcGFjZS5saXN0UHJvamVjdE5hbWVzKCkubWFwKHByb2plY3ROYW1lID0+XG4gICAgICB0aGlzLl9hcmNoaXRlY3QubGlzdFByb2plY3RUYXJnZXRzKHByb2plY3ROYW1lKS5pbmNsdWRlcyh0YXJnZXROYW1lKSA/IHByb2plY3ROYW1lIDogbnVsbCxcbiAgICApLmZpbHRlcih4ID0+ICEheCkgYXMgc3RyaW5nW107XG5cbiAgICBpZiAodGhpcy5tdWx0aVRhcmdldCkge1xuICAgICAgLy8gRm9yIG11bHRpIHRhcmdldCBjb21tYW5kcywgd2UgYWx3YXlzIGxpc3QgYWxsIHByb2plY3RzIHRoYXQgaGF2ZSB0aGUgdGFyZ2V0LlxuICAgICAgcmV0dXJuIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRm9yIHNpbmdsZSB0YXJnZXQgY29tbWFuZHMsIHdlIHRyeSB0cnkgdGhlIGRlZmF1bHQgcHJvamVjdCBwcm9qZWN0IGZpcnN0LFxuICAgICAgLy8gdGhlbiB0aGUgZnVsbCBsaXN0IGlmIGl0IGhhcyBhIHNpbmdsZSBwcm9qZWN0LCB0aGVuIGVycm9yIG91dC5cbiAgICAgIGNvbnN0IG1heWJlRGVmYXVsdFByb2plY3QgPSB0aGlzLl93b3Jrc3BhY2UuZ2V0RGVmYXVsdFByb2plY3ROYW1lKCk7XG4gICAgICBpZiAobWF5YmVEZWZhdWx0UHJvamVjdCAmJiBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUuaW5jbHVkZXMobWF5YmVEZWZhdWx0UHJvamVjdCkpIHtcbiAgICAgICAgcmV0dXJuIFttYXliZURlZmF1bHRQcm9qZWN0XTtcbiAgICAgIH1cblxuICAgICAgaWYgKGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZGV0ZXJtaW5lIGEgc2luZ2xlIHByb2plY3QgZm9yIHRoZSAnJHt0YXJnZXROYW1lfScgdGFyZ2V0LmApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2xvYWRXb3Jrc3BhY2VBbmRBcmNoaXRlY3QoKSB7XG4gICAgY29uc3Qgd29ya3NwYWNlTG9hZGVyID0gbmV3IFdvcmtzcGFjZUxvYWRlcih0aGlzLl9ob3N0KTtcblxuICAgIHJldHVybiB3b3Jrc3BhY2VMb2FkZXIubG9hZFdvcmtzcGFjZSh0aGlzLndvcmtzcGFjZS5yb290KS5waXBlKFxuICAgICAgdGFwKCh3b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlKSA9PiB0aGlzLl93b3Jrc3BhY2UgPSB3b3Jrc3BhY2UpLFxuICAgICAgY29uY2F0TWFwKCh3b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlKSA9PiB7XG4gICAgICAgIHJldHVybiBuZXcgQXJjaGl0ZWN0KHdvcmtzcGFjZSkubG9hZEFyY2hpdGVjdCgpO1xuICAgICAgfSksXG4gICAgICB0YXAoKGFyY2hpdGVjdDogQXJjaGl0ZWN0KSA9PiB0aGlzLl9hcmNoaXRlY3QgPSBhcmNoaXRlY3QpLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIF9tYWtlVGFyZ2V0U3BlY2lmaWVyKGNvbW1hbmRPcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyk6IFRhcmdldFNwZWNpZmllciB7XG4gICAgbGV0IHByb2plY3QsIHRhcmdldCwgY29uZmlndXJhdGlvbjtcblxuICAgIGlmIChjb21tYW5kT3B0aW9ucy50YXJnZXQpIHtcbiAgICAgIFtwcm9qZWN0LCB0YXJnZXQsIGNvbmZpZ3VyYXRpb25dID0gY29tbWFuZE9wdGlvbnMudGFyZ2V0LnNwbGl0KCc6Jyk7XG5cbiAgICAgIGlmIChjb21tYW5kT3B0aW9ucy5jb25maWd1cmF0aW9uKSB7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24gPSBjb21tYW5kT3B0aW9ucy5jb25maWd1cmF0aW9uO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwcm9qZWN0ID0gY29tbWFuZE9wdGlvbnMucHJvamVjdDtcbiAgICAgIHRhcmdldCA9IHRoaXMudGFyZ2V0O1xuICAgICAgY29uZmlndXJhdGlvbiA9IGNvbW1hbmRPcHRpb25zLmNvbmZpZ3VyYXRpb247XG4gICAgICBpZiAoIWNvbmZpZ3VyYXRpb24gJiYgY29tbWFuZE9wdGlvbnMucHJvZCkge1xuICAgICAgICBjb25maWd1cmF0aW9uID0gJ3Byb2R1Y3Rpb24nO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgcHJvamVjdCA9ICcnO1xuICAgIH1cbiAgICBpZiAoIXRhcmdldCkge1xuICAgICAgdGFyZ2V0ID0gJyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2plY3QsXG4gICAgICBjb25maWd1cmF0aW9uLFxuICAgICAgdGFyZ2V0LFxuICAgIH07XG4gIH1cbn1cbiJdfQ==