"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectCommandModule = void 0;
const config_1 = require("../utilities/config");
const memoize_1 = require("../utilities/memoize");
const architect_base_command_module_1 = require("./architect-base-command-module");
class ArchitectCommandModule extends architect_base_command_module_1.ArchitectBaseCommandModule {
    async builder(argv) {
        const project = this.getArchitectProject();
        const { jsonHelp, getYargsCompletions, help } = this.context.args.options;
        const localYargs = argv
            .positional('project', {
            describe: 'The name of the project to build. Can be an application or a library.',
            type: 'string',
            // Hide choices from JSON help so that we don't display them in AIO.
            choices: jsonHelp ? undefined : this.getProjectChoices(),
        })
            .option('configuration', {
            describe: `One or more named builder configurations as a comma-separated ` +
                `list as specified in the "configurations" section in angular.json.\n` +
                `The builder uses the named configurations to run the given target.\n` +
                `For more information, see https://angular.io/guide/workspace-config#alternate-build-configurations.`,
            alias: 'c',
            type: 'string',
            // Show only in when using --help and auto completion because otherwise comma seperated configuration values will be invalid.
            // Also, hide choices from JSON help so that we don't display them in AIO.
            choices: (getYargsCompletions || help) && !jsonHelp && project
                ? this.getConfigurationChoices(project)
                : undefined,
        })
            .strict();
        if (!project) {
            return localYargs;
        }
        const target = this.getArchitectTarget();
        const schemaOptions = await this.getArchitectTargetOptions({
            project,
            target,
        });
        return this.addSchemaOptionsToCommand(localYargs, schemaOptions);
    }
    async run(options) {
        const target = this.getArchitectTarget();
        const { configuration = '', project, ...architectOptions } = options;
        if (!project) {
            // This runs each target sequentially.
            // Running them in parallel would jumble the log messages.
            let result = 0;
            const projectNames = this.getProjectNamesByTarget(target);
            if (!projectNames) {
                return this.onMissingTarget('Cannot determine project or target for command.');
            }
            for (const project of projectNames) {
                result |= await this.runSingleTarget({ configuration, target, project }, architectOptions);
            }
            return result;
        }
        else {
            return await this.runSingleTarget({ configuration, target, project }, architectOptions);
        }
    }
    getArchitectProject() {
        const workspace = this.context.workspace;
        if (!workspace) {
            return undefined;
        }
        const [, projectName] = this.context.args.positional;
        if (projectName) {
            return workspace.projects.has(projectName) ? projectName : undefined;
        }
        const target = this.getArchitectTarget();
        const projectFromTarget = this.getProjectNamesByTarget(target);
        return (projectFromTarget === null || projectFromTarget === void 0 ? void 0 : projectFromTarget.length) ? projectFromTarget[0] : undefined;
    }
    getProjectNamesByTarget(target) {
        const workspace = this.getWorkspaceOrThrow();
        const allProjectsForTargetName = [];
        for (const [name, project] of workspace.projects) {
            if (project.targets.has(target)) {
                allProjectsForTargetName.push(name);
            }
        }
        if (allProjectsForTargetName.length === 0) {
            return undefined;
        }
        if (this.multiTarget) {
            // For multi target commands, we always list all projects that have the target.
            return allProjectsForTargetName;
        }
        else {
            if (allProjectsForTargetName.length === 1) {
                return allProjectsForTargetName;
            }
            const maybeProject = (0, config_1.getProjectByCwd)(workspace);
            if (maybeProject && allProjectsForTargetName.includes(maybeProject)) {
                return [maybeProject];
            }
        }
        return undefined;
    }
    /** @returns a sorted list of project names to be used for auto completion. */
    getProjectChoices() {
        const { workspace } = this.context;
        return workspace ? [...workspace.projects.keys()].sort() : undefined;
    }
    /** @returns a sorted list of configuration names to be used for auto completion. */
    getConfigurationChoices(project) {
        var _a, _b;
        const projectDefinition = (_a = this.context.workspace) === null || _a === void 0 ? void 0 : _a.projects.get(project);
        if (!projectDefinition) {
            return undefined;
        }
        const target = this.getArchitectTarget();
        const configurations = (_b = projectDefinition.targets.get(target)) === null || _b === void 0 ? void 0 : _b.configurations;
        return configurations ? Object.keys(configurations).sort() : undefined;
    }
}
__decorate([
    memoize_1.memoize,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], ArchitectCommandModule.prototype, "getProjectNamesByTarget", null);
exports.ArchitectCommandModule = ArchitectCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQtbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmQtYnVpbGRlci9hcmNoaXRlY3QtY29tbWFuZC1tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0FBR0gsZ0RBQXNEO0FBQ3RELGtEQUErQztBQUMvQyxtRkFBNkU7QUFhN0UsTUFBc0Isc0JBQ3BCLFNBQVEsMERBQWdEO0lBS3hELEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBVTtRQUN0QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMzQyxNQUFNLEVBQUUsUUFBUSxFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUUxRSxNQUFNLFVBQVUsR0FBK0IsSUFBSTthQUNoRCxVQUFVLENBQUMsU0FBUyxFQUFFO1lBQ3JCLFFBQVEsRUFBRSx1RUFBdUU7WUFDakYsSUFBSSxFQUFFLFFBQVE7WUFDZCxvRUFBb0U7WUFDcEUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUU7U0FDekQsQ0FBQzthQUNELE1BQU0sQ0FBQyxlQUFlLEVBQUU7WUFDdkIsUUFBUSxFQUNOLGdFQUFnRTtnQkFDaEUsc0VBQXNFO2dCQUN0RSxzRUFBc0U7Z0JBQ3RFLHFHQUFxRztZQUN2RyxLQUFLLEVBQUUsR0FBRztZQUNWLElBQUksRUFBRSxRQUFRO1lBQ2QsNkhBQTZIO1lBQzdILDBFQUEwRTtZQUMxRSxPQUFPLEVBQ0wsQ0FBQyxtQkFBbUIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxPQUFPO2dCQUNuRCxDQUFDLENB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QUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQywwQ0FBRSxjQUFjLENBQUM7UUFFN0UsT0FBTyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUN6RSxDQUFDO0NBQ0Y7QUFsREM7SUFEQyxpQkFBTzs7OztxRUE4QlA7QUF2SEgsd0RBNElDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBnZXRQcm9qZWN0QnlDd2QgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IG1lbW9pemUgfSBmcm9tICcuLi91dGlsaXRpZXMvbWVtb2l6ZSc7XG5pbXBvcnQgeyBBcmNoaXRlY3RCYXNlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4vYXJjaGl0ZWN0LWJhc2UtY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZUVycm9yLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi9jb21tYW5kLW1vZHVsZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXJjaGl0ZWN0Q29tbWFuZEFyZ3Mge1xuICBjb25maWd1cmF0aW9uPzogc3RyaW5nO1xuICBwcm9qZWN0Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXJjaGl0ZWN0Q29tbWFuZE1vZHVsZVxuICBleHRlbmRzIEFyY2hpdGVjdEJhc2VDb21tYW5kTW9kdWxlPEFyY2hpdGVjdENvbW1hbmRBcmdzPlxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxBcmNoaXRlY3RDb21tYW5kQXJncz5cbntcbiAgYWJzdHJhY3QgcmVhZG9ubHkgbXVsdGlUYXJnZXQ6IGJvb2xlYW47XG5cbiAgYXN5bmMgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PEFyY2hpdGVjdENvbW1hbmRBcmdzPj4ge1xuICAgIGNvbnN0IHByb2plY3QgPSB0aGlzLmdldEFyY2hpdGVjdFByb2plY3QoKTtcbiAgICBjb25zdCB7IGpzb25IZWxwLCBnZXRZYXJnc0NvbXBsZXRpb25zLCBoZWxwIH0gPSB0aGlzLmNvbnRleHQuYXJncy5vcHRpb25zO1xuXG4gICAgY29uc3QgbG9jYWxZYXJnczogQXJndjxBcmNoaXRlY3RDb21tYW5kQXJncz4gPSBhcmd2XG4gICAgICAucG9zaXRpb25hbCgncHJvamVjdCcsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdUaGUgbmFtZSBvZiB0aGUgcHJvamVjdCB0byBidWlsZC4gQ2FuIGJlIGFuIGFwcGxpY2F0aW9uIG9yIGEgbGlicmFyeS4nLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgLy8gSGlkZSBjaG9pY2VzIGZyb20gSlNPTiBoZWxwIHNvIHRoYXQgd2UgZG9uJ3QgZGlzcGxheSB0aGVtIGluIEFJTy5cbiAgICAgICAgY2hvaWNlczoganNvbkhlbHAgPyB1bmRlZmluZWQgOiB0aGlzLmdldFByb2plY3RDaG9pY2VzKCksXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignY29uZmlndXJhdGlvbicsIHtcbiAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgYE9uZSBvciBtb3JlIG5hbWVkIGJ1aWxkZXIgY29uZmlndXJhdGlvbnMgYXMgYSBjb21tYS1zZXBhcmF0ZWQgYCArXG4gICAgICAgICAgYGxpc3QgYXMgc3BlY2lmaWVkIGluIHRoZSBcImNvbmZpZ3VyYXRpb25zXCIgc2VjdGlvbiBpbiBhbmd1bGFyLmpzb24uXFxuYCArXG4gICAgICAgICAgYFRoZSBidWlsZGVyIHVzZXMgdGhlIG5hbWVkIGNvbmZpZ3VyYXRpb25zIHRvIHJ1biB0aGUgZ2l2ZW4gdGFyZ2V0LlxcbmAgK1xuICAgICAgICAgIGBGb3IgbW9yZSBpbmZvcm1hdGlvbiwgc2VlIGh0dHBzOi8vYW5ndWxhci5pby9ndWlkZS93b3Jrc3BhY2UtY29uZmlnI2FsdGVybmF0ZS1idWlsZC1jb25maWd1cmF0aW9ucy5gLFxuICAgICAgICBhbGlhczogJ2MnLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgLy8gU2hvdyBvbmx5IGluIHdoZW4gdXNpbmcgLS1oZWxwIGFuZCBhdXRvIGNvbXBsZXRpb24gYmVjYXVzZSBvdGhlcndpc2UgY29tbWEgc2VwZXJhdGVkIGNvbmZpZ3VyYXRpb24gdmFsdWVzIHdpbGwgYmUgaW52YWxpZC5cbiAgICAgICAgLy8gQWxzbywgaGlkZSBjaG9pY2VzIGZyb20gSlNPTiBoZWxwIHNvIHRoYXQgd2UgZG9uJ3QgZGlzcGxheSB0aGVtIGluIEFJTy5cbiAgICAgICAgY2hvaWNlczpcbiAgICAgICAgICAoZ2V0WWFyZ3NDb21wbGV0aW9ucyB8fCBoZWxwKSAmJiAhanNvbkhlbHAgJiYgcHJvamVjdFxuICAgICAgICAgICAgPyB0aGlzLmdldENvbmZpZ3VyYXRpb25DaG9pY2VzKHByb2plY3QpXG4gICAgICAgICAgICA6IHVuZGVmaW5lZCxcbiAgICAgIH0pXG4gICAgICAuc3RyaWN0KCk7XG5cbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0QXJjaGl0ZWN0VGFyZ2V0KCk7XG4gICAgY29uc3Qgc2NoZW1hT3B0aW9ucyA9IGF3YWl0IHRoaXMuZ2V0QXJjaGl0ZWN0VGFyZ2V0T3B0aW9ucyh7XG4gICAgICBwcm9qZWN0LFxuICAgICAgdGFyZ2V0LFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXMuYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZChsb2NhbFlhcmdzLCBzY2hlbWFPcHRpb25zKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBPcHRpb25zPEFyY2hpdGVjdENvbW1hbmRBcmdzPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0QXJjaGl0ZWN0VGFyZ2V0KCk7XG5cbiAgICBjb25zdCB7IGNvbmZpZ3VyYXRpb24gPSAnJywgcHJvamVjdCwgLi4uYXJjaGl0ZWN0T3B0aW9ucyB9ID0gb3B0aW9ucztcblxuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgLy8gVGhpcyBydW5zIGVhY2ggdGFyZ2V0IHNlcXVlbnRpYWxseS5cbiAgICAgIC8vIFJ1bm5pbmcgdGhlbSBpbiBwYXJhbGxlbCB3b3VsZCBqdW1ibGUgdGhlIGxvZyBtZXNzYWdlcy5cbiAgICAgIGxldCByZXN1bHQgPSAwO1xuICAgICAgY29uc3QgcHJvamVjdE5hbWVzID0gdGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0YXJnZXQpO1xuICAgICAgaWYgKCFwcm9qZWN0TmFtZXMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub25NaXNzaW5nVGFyZ2V0KCdDYW5ub3QgZGV0ZXJtaW5lIHByb2plY3Qgb3IgdGFyZ2V0IGZvciBjb21tYW5kLicpO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IHByb2plY3Qgb2YgcHJvamVjdE5hbWVzKSB7XG4gICAgICAgIHJlc3VsdCB8PSBhd2FpdCB0aGlzLnJ1blNpbmdsZVRhcmdldCh7IGNvbmZpZ3VyYXRpb24sIHRhcmdldCwgcHJvamVjdCB9LCBhcmNoaXRlY3RPcHRpb25zKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuU2luZ2xlVGFyZ2V0KHsgY29uZmlndXJhdGlvbiwgdGFyZ2V0LCBwcm9qZWN0IH0sIGFyY2hpdGVjdE9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0QXJjaGl0ZWN0UHJvamVjdCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IHRoaXMuY29udGV4dC53b3Jrc3BhY2U7XG4gICAgaWYgKCF3b3Jrc3BhY2UpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgWywgcHJvamVjdE5hbWVdID0gdGhpcy5jb250ZXh0LmFyZ3MucG9zaXRpb25hbDtcblxuICAgIGlmIChwcm9qZWN0TmFtZSkge1xuICAgICAgcmV0dXJuIHdvcmtzcGFjZS5wcm9qZWN0cy5oYXMocHJvamVjdE5hbWUpID8gcHJvamVjdE5hbWUgOiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXRBcmNoaXRlY3RUYXJnZXQoKTtcbiAgICBjb25zdCBwcm9qZWN0RnJvbVRhcmdldCA9IHRoaXMuZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGFyZ2V0KTtcblxuICAgIHJldHVybiBwcm9qZWN0RnJvbVRhcmdldD8ubGVuZ3RoID8gcHJvamVjdEZyb21UYXJnZXRbMF0gOiB1bmRlZmluZWQ7XG4gIH1cblxuICBAbWVtb2l6ZVxuICBwcml2YXRlIGdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRhcmdldDogc3RyaW5nKTogc3RyaW5nW10gfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IHRoaXMuZ2V0V29ya3NwYWNlT3JUaHJvdygpO1xuXG4gICAgY29uc3QgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW25hbWUsIHByb2plY3RdIG9mIHdvcmtzcGFjZS5wcm9qZWN0cykge1xuICAgICAgaWYgKHByb2plY3QudGFyZ2V0cy5oYXModGFyZ2V0KSkge1xuICAgICAgICBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUucHVzaChuYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5tdWx0aVRhcmdldCkge1xuICAgICAgLy8gRm9yIG11bHRpIHRhcmdldCBjb21tYW5kcywgd2UgYWx3YXlzIGxpc3QgYWxsIHByb2plY3RzIHRoYXQgaGF2ZSB0aGUgdGFyZ2V0LlxuICAgICAgcmV0dXJuIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWF5YmVQcm9qZWN0ID0gZ2V0UHJvamVjdEJ5Q3dkKHdvcmtzcGFjZSk7XG4gICAgICBpZiAobWF5YmVQcm9qZWN0ICYmIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5pbmNsdWRlcyhtYXliZVByb2plY3QpKSB7XG4gICAgICAgIHJldHVybiBbbWF5YmVQcm9qZWN0XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqIEByZXR1cm5zIGEgc29ydGVkIGxpc3Qgb2YgcHJvamVjdCBuYW1lcyB0byBiZSB1c2VkIGZvciBhdXRvIGNvbXBsZXRpb24uICovXG4gIHByaXZhdGUgZ2V0UHJvamVjdENob2ljZXMoKTogc3RyaW5nW10gfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICByZXR1cm4gd29ya3NwYWNlID8gWy4uLndvcmtzcGFjZS5wcm9qZWN0cy5rZXlzKCldLnNvcnQoKSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKiBAcmV0dXJucyBhIHNvcnRlZCBsaXN0IG9mIGNvbmZpZ3VyYXRpb24gbmFtZXMgdG8gYmUgdXNlZCBmb3IgYXV0byBjb21wbGV0aW9uLiAqL1xuICBwcml2YXRlIGdldENvbmZpZ3VyYXRpb25DaG9pY2VzKHByb2plY3Q6IHN0cmluZyk6IHN0cmluZ1tdIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBwcm9qZWN0RGVmaW5pdGlvbiA9IHRoaXMuY29udGV4dC53b3Jrc3BhY2U/LnByb2plY3RzLmdldChwcm9qZWN0KTtcbiAgICBpZiAoIXByb2plY3REZWZpbml0aW9uKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0QXJjaGl0ZWN0VGFyZ2V0KCk7XG4gICAgY29uc3QgY29uZmlndXJhdGlvbnMgPSBwcm9qZWN0RGVmaW5pdGlvbi50YXJnZXRzLmdldCh0YXJnZXQpPy5jb25maWd1cmF0aW9ucztcblxuICAgIHJldHVybiBjb25maWd1cmF0aW9ucyA/IE9iamVjdC5rZXlzKGNvbmZpZ3VyYXRpb25zKS5zb3J0KCkgOiB1bmRlZmluZWQ7XG4gIH1cbn1cbiJdfQ==