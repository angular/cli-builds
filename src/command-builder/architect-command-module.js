"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectCommandModule = void 0;
const architect_base_command_module_1 = require("./architect-base-command-module");
const command_module_1 = require("./command-module");
class ArchitectCommandModule extends architect_base_command_module_1.ArchitectBaseCommandModule {
    async builder(argv) {
        const localYargs = argv
            .positional('project', {
            describe: 'The name of the project to build. Can be an application or a library.',
            type: 'string',
        })
            .option('configuration', {
            describe: `One or more named builder configurations as a comma-separated ` +
                `list as specified in the "configurations" section in angular.json.\n` +
                `The builder uses the named configurations to run the given target.\n` +
                `For more information, see https://angular.io/guide/workspace-config#alternate-build-configurations.`,
            alias: 'c',
            type: 'string',
        })
            .strict();
        const project = this.getArchitectProject();
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
        var _a;
        const target = this.getArchitectTarget();
        const { configuration = '', project, ...architectOptions } = options;
        if (!project) {
            // This runs each target sequentially.
            // Running them in parallel would jumble the log messages.
            let result = 0;
            const projectNames = this.getProjectNamesByTarget(target);
            if (!projectNames) {
                throw new command_module_1.CommandModuleError((_a = this.missingErrorTarget) !== null && _a !== void 0 ? _a : 'Cannot determine project or target for command.');
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
            if (!workspace.projects.has(projectName)) {
                throw new command_module_1.CommandModuleError(`Project '${projectName}' does not exist.`);
            }
            return projectName;
        }
        const target = this.getArchitectTarget();
        const projectFromTarget = this.getProjectNamesByTarget(target);
        return (projectFromTarget === null || projectFromTarget === void 0 ? void 0 : projectFromTarget.length) ? projectFromTarget[0] : undefined;
    }
    getArchitectTarget() {
        return this.commandName;
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
            // For single target commands, we try the default project first,
            // then the full list if it has a single project, then error out.
            const maybeDefaultProject = workspace.extensions['defaultProject'];
            if (typeof maybeDefaultProject === 'string' &&
                allProjectsForTargetName.includes(maybeDefaultProject)) {
                return [maybeDefaultProject];
            }
            if (allProjectsForTargetName.length === 1) {
                return allProjectsForTargetName;
            }
        }
        return undefined;
    }
}
exports.ArchitectCommandModule = ArchitectCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQtbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmQtYnVpbGRlci9hcmNoaXRlY3QtY29tbWFuZC1tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gsbUZBQTZFO0FBQzdFLHFEQUswQjtBQU8xQixNQUFzQixzQkFDcEIsU0FBUSwwREFBZ0Q7SUFLeEQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFVO1FBQ3RCLE1BQU0sVUFBVSxHQUErQixJQUFJO2FBQ2hELFVBQVUsQ0FBQyxTQUFTLEVBQUU7WUFDckIsUUFBUSxFQUFFLHVFQUF1RTtZQUNqRixJQUFJLEVBQUUsUUFBUTtTQUNmLENBQUM7YUFDRCxNQUFNLENBQUMsZUFBZSxFQUFFO1lBQ3ZCLFFBQVEsRUFDTixnRUFBZ0U7Z0JBQ2hFLHNFQUFzRTtnQkFDdEUsc0VBQXNFO2dCQUN0RSxxR0FBcUc7WUFDdkcsS0FBSyxFQUFFLEdBQUc7WUFDVixJQUFJLEVBQUUsUUFBUTtTQUNmLENBQUM7YUFDRCxNQUFNLEVBQUUsQ0FBQztRQUVaLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzNDLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDWixPQUFPLFVBQVUsQ0FBQztTQUNuQjtRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3pDLE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixDQUFDO1lBQ3pELE9BQU87WUFDUCxNQUFNO1NBQ1AsQ0FBQyxDQUFDO1FBRUgsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQXFEOztR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Z0IsQ0FBQyxDQUFDO1lBQ25FLElBQ0UsT0FBTyxtQkFBbUIsS0FBSyxRQUFRO2dCQUN2Qyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsRUFDdEQ7Z0JBQ0EsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7YUFDOUI7WUFFRCxJQUFJLHdCQUF3QixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3pDLE9BQU8sd0JBQXdCLENBQUM7YUFDakM7U0FDRjtRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7Q0FDRjtBQTVIRCx3REE0SEMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IEFyY2hpdGVjdEJhc2VDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi9hcmNoaXRlY3QtYmFzZS1jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlRXJyb3IsXG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgT3B0aW9ucyxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuL2NvbW1hbmQtbW9kdWxlJztcblxuZXhwb3J0IGludGVyZmFjZSBBcmNoaXRlY3RDb21tYW5kQXJncyB7XG4gIGNvbmZpZ3VyYXRpb24/OiBzdHJpbmc7XG4gIHByb2plY3Q/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBcmNoaXRlY3RDb21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgQXJjaGl0ZWN0QmFzZUNvbW1hbmRNb2R1bGU8QXJjaGl0ZWN0Q29tbWFuZEFyZ3M+XG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPEFyY2hpdGVjdENvbW1hbmRBcmdzPlxue1xuICBhYnN0cmFjdCByZWFkb25seSBtdWx0aVRhcmdldDogYm9vbGVhbjtcblxuICBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8QXJjaGl0ZWN0Q29tbWFuZEFyZ3M+PiB7XG4gICAgY29uc3QgbG9jYWxZYXJnczogQXJndjxBcmNoaXRlY3RDb21tYW5kQXJncz4gPSBhcmd2XG4gICAgICAucG9zaXRpb25hbCgncHJvamVjdCcsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdUaGUgbmFtZSBvZiB0aGUgcHJvamVjdCB0byBidWlsZC4gQ2FuIGJlIGFuIGFwcGxpY2F0aW9uIG9yIGEgbGlicmFyeS4nLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdjb25maWd1cmF0aW9uJywge1xuICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICBgT25lIG9yIG1vcmUgbmFtZWQgYnVpbGRlciBjb25maWd1cmF0aW9ucyBhcyBhIGNvbW1hLXNlcGFyYXRlZCBgICtcbiAgICAgICAgICBgbGlzdCBhcyBzcGVjaWZpZWQgaW4gdGhlIFwiY29uZmlndXJhdGlvbnNcIiBzZWN0aW9uIGluIGFuZ3VsYXIuanNvbi5cXG5gICtcbiAgICAgICAgICBgVGhlIGJ1aWxkZXIgdXNlcyB0aGUgbmFtZWQgY29uZmlndXJhdGlvbnMgdG8gcnVuIHRoZSBnaXZlbiB0YXJnZXQuXFxuYCArXG4gICAgICAgICAgYEZvciBtb3JlIGluZm9ybWF0aW9uLCBzZWUgaHR0cHM6Ly9hbmd1bGFyLmlvL2d1aWRlL3dvcmtzcGFjZS1jb25maWcjYWx0ZXJuYXRlLWJ1aWxkLWNvbmZpZ3VyYXRpb25zLmAsXG4gICAgICAgIGFsaWFzOiAnYycsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgfSlcbiAgICAgIC5zdHJpY3QoKTtcblxuICAgIGNvbnN0IHByb2plY3QgPSB0aGlzLmdldEFyY2hpdGVjdFByb2plY3QoKTtcbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0QXJjaGl0ZWN0VGFyZ2V0KCk7XG4gICAgY29uc3Qgc2NoZW1hT3B0aW9ucyA9IGF3YWl0IHRoaXMuZ2V0QXJjaGl0ZWN0VGFyZ2V0T3B0aW9ucyh7XG4gICAgICBwcm9qZWN0LFxuICAgICAgdGFyZ2V0LFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXMuYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZChsb2NhbFlhcmdzLCBzY2hlbWFPcHRpb25zKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBPcHRpb25zPEFyY2hpdGVjdENvbW1hbmRBcmdzPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0QXJjaGl0ZWN0VGFyZ2V0KCk7XG5cbiAgICBjb25zdCB7IGNvbmZpZ3VyYXRpb24gPSAnJywgcHJvamVjdCwgLi4uYXJjaGl0ZWN0T3B0aW9ucyB9ID0gb3B0aW9ucztcblxuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgLy8gVGhpcyBydW5zIGVhY2ggdGFyZ2V0IHNlcXVlbnRpYWxseS5cbiAgICAgIC8vIFJ1bm5pbmcgdGhlbSBpbiBwYXJhbGxlbCB3b3VsZCBqdW1ibGUgdGhlIGxvZyBtZXNzYWdlcy5cbiAgICAgIGxldCByZXN1bHQgPSAwO1xuICAgICAgY29uc3QgcHJvamVjdE5hbWVzID0gdGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0YXJnZXQpO1xuICAgICAgaWYgKCFwcm9qZWN0TmFtZXMpIHtcbiAgICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihcbiAgICAgICAgICB0aGlzLm1pc3NpbmdFcnJvclRhcmdldCA/PyAnQ2Fubm90IGRldGVybWluZSBwcm9qZWN0IG9yIHRhcmdldCBmb3IgY29tbWFuZC4nLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IHByb2plY3Qgb2YgcHJvamVjdE5hbWVzKSB7XG4gICAgICAgIHJlc3VsdCB8PSBhd2FpdCB0aGlzLnJ1blNpbmdsZVRhcmdldCh7IGNvbmZpZ3VyYXRpb24sIHRhcmdldCwgcHJvamVjdCB9LCBhcmNoaXRlY3RPcHRpb25zKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuU2luZ2xlVGFyZ2V0KHsgY29uZmlndXJhdGlvbiwgdGFyZ2V0LCBwcm9qZWN0IH0sIGFyY2hpdGVjdE9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0QXJjaGl0ZWN0UHJvamVjdCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IHRoaXMuY29udGV4dC53b3Jrc3BhY2U7XG4gICAgaWYgKCF3b3Jrc3BhY2UpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgWywgcHJvamVjdE5hbWVdID0gdGhpcy5jb250ZXh0LmFyZ3MucG9zaXRpb25hbDtcblxuICAgIGlmIChwcm9qZWN0TmFtZSkge1xuICAgICAgaWYgKCF3b3Jrc3BhY2UucHJvamVjdHMuaGFzKHByb2plY3ROYW1lKSkge1xuICAgICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKGBQcm9qZWN0ICcke3Byb2plY3ROYW1lfScgZG9lcyBub3QgZXhpc3QuYCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwcm9qZWN0TmFtZTtcbiAgICB9XG5cbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmdldEFyY2hpdGVjdFRhcmdldCgpO1xuICAgIGNvbnN0IHByb2plY3RGcm9tVGFyZ2V0ID0gdGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0YXJnZXQpO1xuXG4gICAgcmV0dXJuIHByb2plY3RGcm9tVGFyZ2V0Py5sZW5ndGggPyBwcm9qZWN0RnJvbVRhcmdldFswXSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0QXJjaGl0ZWN0VGFyZ2V0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZE5hbWU7XG4gIH1cblxuICBwcml2YXRlIGdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRhcmdldDogc3RyaW5nKTogc3RyaW5nW10gfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IHRoaXMuZ2V0V29ya3NwYWNlT3JUaHJvdygpO1xuXG4gICAgY29uc3QgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW25hbWUsIHByb2plY3RdIG9mIHdvcmtzcGFjZS5wcm9qZWN0cykge1xuICAgICAgaWYgKHByb2plY3QudGFyZ2V0cy5oYXModGFyZ2V0KSkge1xuICAgICAgICBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUucHVzaChuYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5tdWx0aVRhcmdldCkge1xuICAgICAgLy8gRm9yIG11bHRpIHRhcmdldCBjb21tYW5kcywgd2UgYWx3YXlzIGxpc3QgYWxsIHByb2plY3RzIHRoYXQgaGF2ZSB0aGUgdGFyZ2V0LlxuICAgICAgcmV0dXJuIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRm9yIHNpbmdsZSB0YXJnZXQgY29tbWFuZHMsIHdlIHRyeSB0aGUgZGVmYXVsdCBwcm9qZWN0IGZpcnN0LFxuICAgICAgLy8gdGhlbiB0aGUgZnVsbCBsaXN0IGlmIGl0IGhhcyBhIHNpbmdsZSBwcm9qZWN0LCB0aGVuIGVycm9yIG91dC5cbiAgICAgIGNvbnN0IG1heWJlRGVmYXVsdFByb2plY3QgPSB3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snZGVmYXVsdFByb2plY3QnXTtcbiAgICAgIGlmIChcbiAgICAgICAgdHlwZW9mIG1heWJlRGVmYXVsdFByb2plY3QgPT09ICdzdHJpbmcnICYmXG4gICAgICAgIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5pbmNsdWRlcyhtYXliZURlZmF1bHRQcm9qZWN0KVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBbbWF5YmVEZWZhdWx0UHJvamVjdF07XG4gICAgICB9XG5cbiAgICAgIGlmIChhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuIl19