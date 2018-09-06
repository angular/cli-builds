"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    initialize(options) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            yield _super("initialize").call(this, options);
            this._registry = new core_1.json.schema.CoreSchemaRegistry();
            this._registry.addPostTransform(core_1.json.schema.transforms.addUndefinedDefaults);
            yield this._loadWorkspaceAndArchitect().toPromise();
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
                    const builderDesc = yield this._architect.getBuilderDescription(builderConf).toPromise();
                    this.description.options.push(...(yield json_schema_1.parseJsonSchemaToOptions(this._registry, builderDesc.schema)));
                }
            }
        });
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.runArchitectTarget(options);
        });
    }
    runArchitectTarget(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const runSingleTarget = (targetSpec) => __awaiter(this, void 0, void 0, function* () {
                // We need to build the builderSpec twice because architect does not understand
                // overrides separately (getting the configuration builds the whole project, including
                // overrides).
                const builderConf = this._architect.getBuilderConfiguration(targetSpec);
                const builderDesc = yield this._architect.getBuilderDescription(builderConf).toPromise();
                const targetOptionArray = yield json_schema_1.parseJsonSchemaToOptions(this._registry, builderDesc.schema);
                const overrides = parser_1.parseArguments(options['--'] || [], targetOptionArray);
                if (overrides['--']) {
                    (overrides['--'] || []).forEach(additional => {
                        this.logger.warn(`Unknown option: '${additional.split(/=/)[0]}'`);
                    });
                    return 1;
                }
                const realBuilderConf = this._architect.getBuilderConfiguration(Object.assign({}, targetSpec, { overrides }));
                return this._architect.run(realBuilderConf, { logger: this._logger }).pipe(operators_1.map((buildEvent) => buildEvent.success ? 0 : 1)).toPromise();
            });
            try {
                const targetSpec = this._makeTargetSpecifier(options);
                if (!targetSpec.project && this.target) {
                    // This runs each target sequentially.
                    // Running them in parallel would jumble the log messages.
                    return yield rxjs_1.from(this.getProjectNamesByTarget(this.target)).pipe(operators_1.concatMap(project => rxjs_1.from(runSingleTarget(Object.assign({}, targetSpec, { project })))), operators_1.toArray(), operators_1.map(results => results.every(res => res === 0) ? 0 : 1))
                        .toPromise();
                }
                else {
                    return yield runSingleTarget(targetSpec);
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
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7Ozs7OztHQU1HO0FBQ0gseURBS21DO0FBQ25DLCtDQUF3RTtBQUN4RSxvREFBZ0Y7QUFDaEYsK0JBQTRCO0FBQzVCLDhDQUE4RDtBQUM5RCwwREFBb0U7QUFDcEUsdUNBQXdEO0FBQ3hELHFDQUEwQztBQUMxQyx5REFBcUQ7QUFTckQsTUFBc0IsZ0JBQWlCLFNBQVEsaUJBQWdDO0lBQS9FOztRQUNVLFVBQUssR0FBRyxJQUFJLHFCQUFjLEVBQUUsQ0FBQztRQUczQixZQUFPLEdBQUcsMEJBQW1CLEVBQUUsQ0FBQztRQUkxQyxxREFBcUQ7UUFDM0MsZ0JBQVcsR0FBRyxLQUFLLENBQUM7SUEyTmhDLENBQUM7SUF2TmMsVUFBVSxDQUFDLE9BQWdDOzs7WUFDdEQsTUFBTSxvQkFBZ0IsWUFBQyxPQUFPLENBQUMsQ0FBQztZQUVoQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksV0FBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ3RELElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsV0FBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUU3RSxNQUFNLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBRXBELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQ25DLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQy9ELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxZ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LE9BQU8sSUFBSSxxQkFBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ2xELENBQUMsQ0FBQyxFQUNGLGVBQUcsQ0FBQyxDQUFDLFNBQW9CLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDLENBQzNELENBQUM7SUFDSixDQUFDO0lBRU8sb0JBQW9CLENBQUMsY0FBdUM7UUFDbEUsSUFBSSxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQztRQUVuQyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUU7WUFDekIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRXBFLElBQUksY0FBYyxDQUFDLGFBQWEsRUFBRTtnQkFDaEMsYUFBYSxHQUFHLGNBQWMsQ0FBQyxhQUFhLENBQUM7YUFDOUM7U0FDRjthQUFNO1lBQ0wsT0FBTyxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUM7WUFDakMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDckIsYUFBYSxHQUFHLGNBQWMsQ0FBQyxhQUFhLENBQUM7WUFDN0MsSUFBSSxDQUFDLGFBQWEsSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFO2dCQUN6QyxhQUFhLEdBQUcsWUFBWSxDQUFDO2FBQzlCO1NBQ0Y7UUFFRCxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osT0FBTyxHQUFHLEVBQUUsQ0FBQztTQUNkO1FBQ0QsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE1BQU0sR0FBRyxFQUFFLENBQUM7U0FDYjtRQUVELE9BQU87WUFDTCxPQUFPO1lBQ1AsYUFBYTtZQUNiLE1BQU07U0FDUCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBcE9ELDRDQW9PQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIEFyY2hpdGVjdCxcbiAgQnVpbGRFdmVudCxcbiAgQnVpbGRlckNvbmZpZ3VyYXRpb24sXG4gIFRhcmdldFNwZWNpZmllcixcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBleHBlcmltZW50YWwsIGpzb24sIHNjaGVtYSwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE5vZGVKc1N5bmNIb3N0LCBjcmVhdGVDb25zb2xlTG9nZ2VyIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQgeyBmcm9tIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBjb25jYXRNYXAsIG1hcCwgdGFwLCB0b0FycmF5IH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7IEJhc2VDb21tYW5kT3B0aW9ucywgQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZCc7XG5pbXBvcnQgeyBwYXJzZUFyZ3VtZW50cyB9IGZyb20gJy4vcGFyc2VyJztcbmltcG9ydCB7IFdvcmtzcGFjZUxvYWRlciB9IGZyb20gJy4vd29ya3NwYWNlLWxvYWRlcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgZXh0ZW5kcyBCYXNlQ29tbWFuZE9wdGlvbnMge1xuICBwcm9qZWN0Pzogc3RyaW5nO1xuICBjb25maWd1cmF0aW9uPzogc3RyaW5nO1xuICBwcm9kOiBib29sZWFuO1xuICB0YXJnZXQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBcmNoaXRlY3RDb21tYW5kIGV4dGVuZHMgQ29tbWFuZDxBcmNoaXRlY3RDb21tYW5kT3B0aW9ucz4ge1xuICBwcml2YXRlIF9ob3N0ID0gbmV3IE5vZGVKc1N5bmNIb3N0KCk7XG4gIHByb3RlY3RlZCBfYXJjaGl0ZWN0OiBBcmNoaXRlY3Q7XG4gIHByb3RlY3RlZCBfd29ya3NwYWNlOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZTtcbiAgcHJvdGVjdGVkIF9sb2dnZXIgPSBjcmVhdGVDb25zb2xlTG9nZ2VyKCk7XG5cbiAgcHJvdGVjdGVkIF9yZWdpc3RyeToganNvbi5zY2hlbWEuU2NoZW1hUmVnaXN0cnk7XG5cbiAgLy8gSWYgdGhpcyBjb21tYW5kIHN1cHBvcnRzIHJ1bm5pbmcgbXVsdGlwbGUgdGFyZ2V0cy5cbiAgcHJvdGVjdGVkIG11bHRpVGFyZ2V0ID0gZmFsc2U7XG5cbiAgdGFyZ2V0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgcHVibGljIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCBzdXBlci5pbml0aWFsaXplKG9wdGlvbnMpO1xuXG4gICAgdGhpcy5fcmVnaXN0cnkgPSBuZXcganNvbi5zY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KCk7XG4gICAgdGhpcy5fcmVnaXN0cnkuYWRkUG9zdFRyYW5zZm9ybShqc29uLnNjaGVtYS50cmFuc2Zvcm1zLmFkZFVuZGVmaW5lZERlZmF1bHRzKTtcblxuICAgIGF3YWl0IHRoaXMuX2xvYWRXb3Jrc3BhY2VBbmRBcmNoaXRlY3QoKS50b1Byb21pc2UoKTtcblxuICAgIGlmICghb3B0aW9ucy5wcm9qZWN0ICYmIHRoaXMudGFyZ2V0KSB7XG4gICAgICBjb25zdCBwcm9qZWN0TmFtZXMgPSB0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRoaXMudGFyZ2V0KTtcbiAgICAgIGNvbnN0IGxlZnRvdmVycyA9IG9wdGlvbnNbJy0tJ107XG4gICAgICBpZiAocHJvamVjdE5hbWVzLmxlbmd0aCA+IDEgJiYgbGVmdG92ZXJzICYmIGxlZnRvdmVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIFZlcmlmeSB0aGF0IGFsbCBidWlsZGVycyBhcmUgdGhlIHNhbWUsIG90aGVyd2lzZSBlcnJvciBvdXQgKHNpbmNlIHRoZSBtZWFuaW5nIG9mIGFuXG4gICAgICAgIC8vIG9wdGlvbiBjb3VsZCB2YXJ5IGZyb20gYnVpbGRlciB0byBidWlsZGVyKS5cblxuICAgICAgICBjb25zdCBidWlsZGVyczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBwcm9qZWN0TmFtZSBvZiBwcm9qZWN0TmFtZXMpIHtcbiAgICAgICAgICBjb25zdCB0YXJnZXRTcGVjOiBUYXJnZXRTcGVjaWZpZXIgPSB0aGlzLl9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnMpO1xuICAgICAgICAgIGNvbnN0IHRhcmdldERlc2MgPSB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb24oe1xuICAgICAgICAgICAgcHJvamVjdDogcHJvamVjdE5hbWUsXG4gICAgICAgICAgICB0YXJnZXQ6IHRhcmdldFNwZWMudGFyZ2V0LFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKGJ1aWxkZXJzLmluZGV4T2YodGFyZ2V0RGVzYy5idWlsZGVyKSA9PSAtMSkge1xuICAgICAgICAgICAgYnVpbGRlcnMucHVzaCh0YXJnZXREZXNjLmJ1aWxkZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChidWlsZGVycy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgIEFyY2hpdGVjdCBjb21tYW5kcyB3aXRoIGNvbW1hbmQgbGluZSBvdmVycmlkZXMgY2Fubm90IHRhcmdldCBkaWZmZXJlbnQgYnVpbGRlcnMuIFRoZVxuICAgICAgICAgICAgJyR7dGhpcy50YXJnZXR9JyB0YXJnZXQgd291bGQgcnVuIG9uIHByb2plY3RzICR7cHJvamVjdE5hbWVzLmpvaW4oKX0gd2hpY2ggaGF2ZSB0aGVcbiAgICAgICAgICAgIGZvbGxvd2luZyBidWlsZGVyczogJHsnXFxuICAnICsgYnVpbGRlcnMuam9pbignXFxuICAnKX1cbiAgICAgICAgICBgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldFNwZWM6IFRhcmdldFNwZWNpZmllciA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG5cbiAgICBpZiAodGhpcy50YXJnZXQgJiYgIXRhcmdldFNwZWMucHJvamVjdCkge1xuICAgICAgY29uc3QgcHJvamVjdHMgPSB0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRoaXMudGFyZ2V0KTtcblxuICAgICAgaWYgKHByb2plY3RzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAvLyBJZiB0aGVyZSBpcyBhIHNpbmdsZSB0YXJnZXQsIHVzZSBpdCB0byBwYXJzZSBvdmVycmlkZXMuXG4gICAgICAgIHRhcmdldFNwZWMucHJvamVjdCA9IHByb2plY3RzWzBdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICgoIXRhcmdldFNwZWMucHJvamVjdCB8fCAhdGFyZ2V0U3BlYy50YXJnZXQpICYmICF0aGlzLm11bHRpVGFyZ2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBkZXRlcm1pbmUgcHJvamVjdCBvciB0YXJnZXQgZm9yIEFyY2hpdGVjdCBjb21tYW5kLicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnRhcmdldCkge1xuICAgICAgLy8gQWRkIG9wdGlvbnMgSUYgdGhlcmUncyBvbmx5IG9uZSBidWlsZGVyIG9mIHRoaXMga2luZC5cbiAgICAgIGNvbnN0IHByb2plY3ROYW1lcyA9IHRoaXMuZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGhpcy50YXJnZXQpO1xuICAgICAgY29uc3QgYnVpbGRlckNvbmZpZ3VyYXRpb25zOiBCdWlsZGVyQ29uZmlndXJhdGlvbltdID0gW107XG4gICAgICBmb3IgKGNvbnN0IHByb2plY3ROYW1lIG9mIHByb2plY3ROYW1lcykge1xuICAgICAgICBjb25zdCB0YXJnZXRTcGVjOiBUYXJnZXRTcGVjaWZpZXIgPSB0aGlzLl9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnMpO1xuICAgICAgICBjb25zdCB0YXJnZXREZXNjID0gdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJDb25maWd1cmF0aW9uKHtcbiAgICAgICAgICBwcm9qZWN0OiBwcm9qZWN0TmFtZSxcbiAgICAgICAgICB0YXJnZXQ6IHRhcmdldFNwZWMudGFyZ2V0LFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIWJ1aWxkZXJDb25maWd1cmF0aW9ucy5maW5kKGIgPT4gYi5idWlsZGVyID09PSB0YXJnZXREZXNjLmJ1aWxkZXIpKSB7XG4gICAgICAgICAgYnVpbGRlckNvbmZpZ3VyYXRpb25zLnB1c2godGFyZ2V0RGVzYyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGJ1aWxkZXJDb25maWd1cmF0aW9ucy5sZW5ndGggPT0gMSkge1xuICAgICAgICBjb25zdCBidWlsZGVyQ29uZiA9IGJ1aWxkZXJDb25maWd1cmF0aW9uc1swXTtcbiAgICAgICAgY29uc3QgYnVpbGRlckRlc2MgPSBhd2FpdCB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckRlc2NyaXB0aW9uKGJ1aWxkZXJDb25mKS50b1Byb21pc2UoKTtcblxuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMucHVzaCguLi4oXG4gICAgICAgICAgYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKHRoaXMuX3JlZ2lzdHJ5LCBidWlsZGVyRGVzYy5zY2hlbWEpXG4gICAgICAgICkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucykge1xuICAgIHJldHVybiBhd2FpdCB0aGlzLnJ1bkFyY2hpdGVjdFRhcmdldChvcHRpb25zKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBydW5BcmNoaXRlY3RUYXJnZXQob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHJ1blNpbmdsZVRhcmdldCA9IGFzeW5jICh0YXJnZXRTcGVjOiBUYXJnZXRTcGVjaWZpZXIpID0+IHtcbiAgICAgIC8vIFdlIG5lZWQgdG8gYnVpbGQgdGhlIGJ1aWxkZXJTcGVjIHR3aWNlIGJlY2F1c2UgYXJjaGl0ZWN0IGRvZXMgbm90IHVuZGVyc3RhbmRcbiAgICAgIC8vIG92ZXJyaWRlcyBzZXBhcmF0ZWx5IChnZXR0aW5nIHRoZSBjb25maWd1cmF0aW9uIGJ1aWxkcyB0aGUgd2hvbGUgcHJvamVjdCwgaW5jbHVkaW5nXG4gICAgICAvLyBvdmVycmlkZXMpLlxuICAgICAgY29uc3QgYnVpbGRlckNvbmYgPSB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb24odGFyZ2V0U3BlYyk7XG4gICAgICBjb25zdCBidWlsZGVyRGVzYyA9IGF3YWl0IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyRGVzY3JpcHRpb24oYnVpbGRlckNvbmYpLnRvUHJvbWlzZSgpO1xuICAgICAgY29uc3QgdGFyZ2V0T3B0aW9uQXJyYXkgPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnModGhpcy5fcmVnaXN0cnksIGJ1aWxkZXJEZXNjLnNjaGVtYSk7XG4gICAgICBjb25zdCBvdmVycmlkZXMgPSBwYXJzZUFyZ3VtZW50cyhvcHRpb25zWyctLSddIHx8IFtdLCB0YXJnZXRPcHRpb25BcnJheSk7XG5cbiAgICAgIGlmIChvdmVycmlkZXNbJy0tJ10pIHtcbiAgICAgICAgKG92ZXJyaWRlc1snLS0nXSB8fCBbXSkuZm9yRWFjaChhZGRpdGlvbmFsID0+IHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBVbmtub3duIG9wdGlvbjogJyR7YWRkaXRpb25hbC5zcGxpdCgvPS8pWzBdfSdgKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgICBjb25zdCByZWFsQnVpbGRlckNvbmYgPSB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb24oeyAuLi50YXJnZXRTcGVjLCBvdmVycmlkZXMgfSk7XG5cbiAgICAgIHJldHVybiB0aGlzLl9hcmNoaXRlY3QucnVuKHJlYWxCdWlsZGVyQ29uZiwgeyBsb2dnZXI6IHRoaXMuX2xvZ2dlciB9KS5waXBlKFxuICAgICAgICBtYXAoKGJ1aWxkRXZlbnQ6IEJ1aWxkRXZlbnQpID0+IGJ1aWxkRXZlbnQuc3VjY2VzcyA/IDAgOiAxKSxcbiAgICAgICkudG9Qcm9taXNlKCk7XG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB0YXJnZXRTcGVjID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcbiAgICAgIGlmICghdGFyZ2V0U3BlYy5wcm9qZWN0ICYmIHRoaXMudGFyZ2V0KSB7XG4gICAgICAgIC8vIFRoaXMgcnVucyBlYWNoIHRhcmdldCBzZXF1ZW50aWFsbHkuXG4gICAgICAgIC8vIFJ1bm5pbmcgdGhlbSBpbiBwYXJhbGxlbCB3b3VsZCBqdW1ibGUgdGhlIGxvZyBtZXNzYWdlcy5cbiAgICAgICAgcmV0dXJuIGF3YWl0IGZyb20odGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0aGlzLnRhcmdldCkpLnBpcGUoXG4gICAgICAgICAgY29uY2F0TWFwKHByb2plY3QgPT4gZnJvbShydW5TaW5nbGVUYXJnZXQoeyAuLi50YXJnZXRTcGVjLCBwcm9qZWN0IH0pKSksXG4gICAgICAgICAgdG9BcnJheSgpLFxuICAgICAgICAgIG1hcChyZXN1bHRzID0+IHJlc3VsdHMuZXZlcnkocmVzID0+IHJlcyA9PT0gMCkgPyAwIDogMSksXG4gICAgICAgIClcbiAgICAgICAgLnRvUHJvbWlzZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHJ1blNpbmdsZVRhcmdldCh0YXJnZXRTcGVjKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKSB7XG4gICAgICAgIGNvbnN0IG5ld0Vycm9yczogc2NoZW1hLlNjaGVtYVZhbGlkYXRvckVycm9yW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBzY2hlbWFFcnJvciBvZiBlLmVycm9ycykge1xuICAgICAgICAgIGlmIChzY2hlbWFFcnJvci5rZXl3b3JkID09PSAnYWRkaXRpb25hbFByb3BlcnRpZXMnKSB7XG4gICAgICAgICAgICBjb25zdCB1bmtub3duUHJvcGVydHkgPSBzY2hlbWFFcnJvci5wYXJhbXMuYWRkaXRpb25hbFByb3BlcnR5O1xuICAgICAgICAgICAgaWYgKHVua25vd25Qcm9wZXJ0eSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRhc2hlcyA9IHVua25vd25Qcm9wZXJ0eS5sZW5ndGggPT09IDEgPyAnLScgOiAnLS0nO1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChgVW5rbm93biBvcHRpb246ICcke2Rhc2hlc30ke3Vua25vd25Qcm9wZXJ0eX0nYCk7XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBuZXdFcnJvcnMucHVzaChzY2hlbWFFcnJvcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobmV3RXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihuZXcgc2NoZW1hLlNjaGVtYVZhbGlkYXRpb25FeGNlcHRpb24obmV3RXJyb3JzKS5tZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRhcmdldE5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUgPSB0aGlzLl93b3Jrc3BhY2UubGlzdFByb2plY3ROYW1lcygpLm1hcChwcm9qZWN0TmFtZSA9PlxuICAgICAgdGhpcy5fYXJjaGl0ZWN0Lmxpc3RQcm9qZWN0VGFyZ2V0cyhwcm9qZWN0TmFtZSkuaW5jbHVkZXModGFyZ2V0TmFtZSkgPyBwcm9qZWN0TmFtZSA6IG51bGwsXG4gICAgKS5maWx0ZXIoeCA9PiAhIXgpIGFzIHN0cmluZ1tdO1xuXG4gICAgaWYgKHRoaXMubXVsdGlUYXJnZXQpIHtcbiAgICAgIC8vIEZvciBtdWx0aSB0YXJnZXQgY29tbWFuZHMsIHdlIGFsd2F5cyBsaXN0IGFsbCBwcm9qZWN0cyB0aGF0IGhhdmUgdGhlIHRhcmdldC5cbiAgICAgIHJldHVybiBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZvciBzaW5nbGUgdGFyZ2V0IGNvbW1hbmRzLCB3ZSB0cnkgdHJ5IHRoZSBkZWZhdWx0IHByb2plY3QgcHJvamVjdCBmaXJzdCxcbiAgICAgIC8vIHRoZW4gdGhlIGZ1bGwgbGlzdCBpZiBpdCBoYXMgYSBzaW5nbGUgcHJvamVjdCwgdGhlbiBlcnJvciBvdXQuXG4gICAgICBjb25zdCBtYXliZURlZmF1bHRQcm9qZWN0ID0gdGhpcy5fd29ya3NwYWNlLmdldERlZmF1bHRQcm9qZWN0TmFtZSgpO1xuICAgICAgaWYgKG1heWJlRGVmYXVsdFByb2plY3QgJiYgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmluY2x1ZGVzKG1heWJlRGVmYXVsdFByb2plY3QpKSB7XG4gICAgICAgIHJldHVybiBbbWF5YmVEZWZhdWx0UHJvamVjdF07XG4gICAgICB9XG5cbiAgICAgIGlmIChhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWU7XG4gICAgICB9XG5cbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGRldGVybWluZSBhIHNpbmdsZSBwcm9qZWN0IGZvciB0aGUgJyR7dGFyZ2V0TmFtZX0nIHRhcmdldC5gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9sb2FkV29ya3NwYWNlQW5kQXJjaGl0ZWN0KCkge1xuICAgIGNvbnN0IHdvcmtzcGFjZUxvYWRlciA9IG5ldyBXb3Jrc3BhY2VMb2FkZXIodGhpcy5faG9zdCk7XG5cbiAgICByZXR1cm4gd29ya3NwYWNlTG9hZGVyLmxvYWRXb3Jrc3BhY2UodGhpcy53b3Jrc3BhY2Uucm9vdCkucGlwZShcbiAgICAgIHRhcCgod29ya3NwYWNlOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZSkgPT4gdGhpcy5fd29ya3NwYWNlID0gd29ya3NwYWNlKSxcbiAgICAgIGNvbmNhdE1hcCgod29ya3NwYWNlOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZSkgPT4ge1xuICAgICAgICByZXR1cm4gbmV3IEFyY2hpdGVjdCh3b3Jrc3BhY2UpLmxvYWRBcmNoaXRlY3QoKTtcbiAgICAgIH0pLFxuICAgICAgdGFwKChhcmNoaXRlY3Q6IEFyY2hpdGVjdCkgPT4gdGhpcy5fYXJjaGl0ZWN0ID0gYXJjaGl0ZWN0KSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBfbWFrZVRhcmdldFNwZWNpZmllcihjb21tYW5kT3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpOiBUYXJnZXRTcGVjaWZpZXIge1xuICAgIGxldCBwcm9qZWN0LCB0YXJnZXQsIGNvbmZpZ3VyYXRpb247XG5cbiAgICBpZiAoY29tbWFuZE9wdGlvbnMudGFyZ2V0KSB7XG4gICAgICBbcHJvamVjdCwgdGFyZ2V0LCBjb25maWd1cmF0aW9uXSA9IGNvbW1hbmRPcHRpb25zLnRhcmdldC5zcGxpdCgnOicpO1xuXG4gICAgICBpZiAoY29tbWFuZE9wdGlvbnMuY29uZmlndXJhdGlvbikge1xuICAgICAgICBjb25maWd1cmF0aW9uID0gY29tbWFuZE9wdGlvbnMuY29uZmlndXJhdGlvbjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcHJvamVjdCA9IGNvbW1hbmRPcHRpb25zLnByb2plY3Q7XG4gICAgICB0YXJnZXQgPSB0aGlzLnRhcmdldDtcbiAgICAgIGNvbmZpZ3VyYXRpb24gPSBjb21tYW5kT3B0aW9ucy5jb25maWd1cmF0aW9uO1xuICAgICAgaWYgKCFjb25maWd1cmF0aW9uICYmIGNvbW1hbmRPcHRpb25zLnByb2QpIHtcbiAgICAgICAgY29uZmlndXJhdGlvbiA9ICdwcm9kdWN0aW9uJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHByb2plY3QgPSAnJztcbiAgICB9XG4gICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgIHRhcmdldCA9ICcnO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBwcm9qZWN0LFxuICAgICAgY29uZmlndXJhdGlvbixcbiAgICAgIHRhcmdldCxcbiAgICB9O1xuICB9XG59XG4iXX0=