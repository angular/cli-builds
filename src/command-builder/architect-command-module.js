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
const command_module_1 = require("./command-module");
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
        const { options, positional } = this.context.args;
        const [, projectName] = positional;
        if (projectName) {
            return projectName;
        }
        // Yargs allows positional args to be used as flags.
        if (typeof options['project'] === 'string') {
            return options['project'];
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
            if (maybeProject) {
                return allProjectsForTargetName.includes(maybeProject) ? [maybeProject] : undefined;
            }
            const { getYargsCompletions, help } = this.context.args.options;
            if (!getYargsCompletions && !help) {
                // Only issue the below error when not in help / completion mode.
                throw new command_module_1.CommandModuleError('Cannot determine project for command. ' +
                    'Pass the project name as a command line argument or change the current working directory to a project directory.');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQtbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmQtYnVpbGRlci9hcmNoaXRlY3QtY29tbWFuZC1tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0FBR0gsZ0RBQXNEO0FBQ3RELGtEQUErQztBQUMvQyxtRkFBNkU7QUFDN0UscURBSzBCO0FBTzFCLE1BQXNCLHNCQUNwQixTQUFRLDBEQUFnRDtJQUt4RCxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVU7UUFDdEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDM0MsTUFBTSxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7UUFFMUUsTUFBTSxVQUFVLEdBQStCLElBQUk7YUFDaEQsVUFBVSxDQUFDLFNBQVMsRUFBRTtZQUNyQixRQUFRLEVBQUUsdUVBQXVFO1lBQ2pGLElBQUksRUFBRSxRQUFRO1lBQ2Qsb0VBQW9FO1lBQ3BFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1NBQ3pELENBQUM7YUFDRCxNQUFNLENBQUMsZUFBZSxFQUFFO1lBQ3ZCLFFBQVEsRUFDTixnRUFBZ0U7Z0JBQ2hFLHNFQUFzRTtnQkFDdEUsc0VBQXNFO2dCQUN0RSxxR0FBcUc7WUFDdkcsS0FBSyxFQUFFLEdBQUc7WUFDVixJQUFJLEVBQUUsUUFBUTtZQUNkLDZIQUE2SDtZQUM3SCwwRUFBMEU7WUFDMUUsT0FBTyxFQUNMLENBQUMsbUJBQW1CLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksT0FBTztn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LEdBQUcsTUFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsMENBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsaUJBQWlCLEVBQUU7WUFDdEIsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUN6QyxNQUFNLGNBQWMsR0FBRyxNQUFBLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLDBDQUFFLGNBQWMsQ0FBQztRQUU3RSxPQUFPLGNBQWMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0lBQ3pFLENBQUM7Q0FDRjtBQTNEQztJQURDLGlCQUFPOzs7O3FFQXVDUDtBQWpJSCx3REFzSkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IGdldFByb2plY3RCeUN3ZCB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgbWVtb2l6ZSB9IGZyb20gJy4uL3V0aWxpdGllcy9tZW1vaXplJztcbmltcG9ydCB7IEFyY2hpdGVjdEJhc2VDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi9hcmNoaXRlY3QtYmFzZS1jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlRXJyb3IsXG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgT3B0aW9ucyxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuL2NvbW1hbmQtbW9kdWxlJztcblxuZXhwb3J0IGludGVyZmFjZSBBcmNoaXRlY3RDb21tYW5kQXJncyB7XG4gIGNvbmZpZ3VyYXRpb24/OiBzdHJpbmc7XG4gIHByb2plY3Q/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBcmNoaXRlY3RDb21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgQXJjaGl0ZWN0QmFzZUNvbW1hbmRNb2R1bGU8QXJjaGl0ZWN0Q29tbWFuZEFyZ3M+XG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPEFyY2hpdGVjdENvbW1hbmRBcmdzPlxue1xuICBhYnN0cmFjdCByZWFkb25seSBtdWx0aVRhcmdldDogYm9vbGVhbjtcblxuICBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8QXJjaGl0ZWN0Q29tbWFuZEFyZ3M+PiB7XG4gICAgY29uc3QgcHJvamVjdCA9IHRoaXMuZ2V0QXJjaGl0ZWN0UHJvamVjdCgpO1xuICAgIGNvbnN0IHsganNvbkhlbHAsIGdldFlhcmdzQ29tcGxldGlvbnMsIGhlbHAgfSA9IHRoaXMuY29udGV4dC5hcmdzLm9wdGlvbnM7XG5cbiAgICBjb25zdCBsb2NhbFlhcmdzOiBBcmd2PEFyY2hpdGVjdENvbW1hbmRBcmdzPiA9IGFyZ3ZcbiAgICAgIC5wb3NpdGlvbmFsKCdwcm9qZWN0Jywge1xuICAgICAgICBkZXNjcmliZTogJ1RoZSBuYW1lIG9mIHRoZSBwcm9qZWN0IHRvIGJ1aWxkLiBDYW4gYmUgYW4gYXBwbGljYXRpb24gb3IgYSBsaWJyYXJ5LicsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAvLyBIaWRlIGNob2ljZXMgZnJvbSBKU09OIGhlbHAgc28gdGhhdCB3ZSBkb24ndCBkaXNwbGF5IHRoZW0gaW4gQUlPLlxuICAgICAgICBjaG9pY2VzOiBqc29uSGVscCA/IHVuZGVmaW5lZCA6IHRoaXMuZ2V0UHJvamVjdENob2ljZXMoKSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdjb25maWd1cmF0aW9uJywge1xuICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICBgT25lIG9yIG1vcmUgbmFtZWQgYnVpbGRlciBjb25maWd1cmF0aW9ucyBhcyBhIGNvbW1hLXNlcGFyYXRlZCBgICtcbiAgICAgICAgICBgbGlzdCBhcyBzcGVjaWZpZWQgaW4gdGhlIFwiY29uZmlndXJhdGlvbnNcIiBzZWN0aW9uIGluIGFuZ3VsYXIuanNvbi5cXG5gICtcbiAgICAgICAgICBgVGhlIGJ1aWxkZXIgdXNlcyB0aGUgbmFtZWQgY29uZmlndXJhdGlvbnMgdG8gcnVuIHRoZSBnaXZlbiB0YXJnZXQuXFxuYCArXG4gICAgICAgICAgYEZvciBtb3JlIGluZm9ybWF0aW9uLCBzZWUgaHR0cHM6Ly9hbmd1bGFyLmlvL2d1aWRlL3dvcmtzcGFjZS1jb25maWcjYWx0ZXJuYXRlLWJ1aWxkLWNvbmZpZ3VyYXRpb25zLmAsXG4gICAgICAgIGFsaWFzOiAnYycsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAvLyBTaG93IG9ubHkgaW4gd2hlbiB1c2luZyAtLWhlbHAgYW5kIGF1dG8gY29tcGxldGlvbiBiZWNhdXNlIG90aGVyd2lzZSBjb21tYSBzZXBlcmF0ZWQgY29uZmlndXJhdGlvbiB2YWx1ZXMgd2lsbCBiZSBpbnZhbGlkLlxuICAgICAgICAvLyBBbHNvLCBoaWRlIGNob2ljZXMgZnJvbSBKU09OIGhlbHAgc28gdGhhdCB3ZSBkb24ndCBkaXNwbGF5IHRoZW0gaW4gQUlPLlxuICAgICAgICBjaG9pY2VzOlxuICAgICAgICAgIChnZXRZYXJnc0NvbXBsZXRpb25zIHx8IGhlbHApICYmICFqc29uSGVscCAmJiBwcm9qZWN0XG4gICAgICAgICAgICA/IHRoaXMuZ2V0Q29uZmlndXJhdGlvbkNob2ljZXMocHJvamVjdClcbiAgICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgfSlcbiAgICAgIC5zdHJpY3QoKTtcblxuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXRBcmNoaXRlY3RUYXJnZXQoKTtcbiAgICBjb25zdCBzY2hlbWFPcHRpb25zID0gYXdhaXQgdGhpcy5nZXRBcmNoaXRlY3RUYXJnZXRPcHRpb25zKHtcbiAgICAgIHByb2plY3QsXG4gICAgICB0YXJnZXQsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcy5hZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kKGxvY2FsWWFyZ3MsIHNjaGVtYU9wdGlvbnMpO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8QXJjaGl0ZWN0Q29tbWFuZEFyZ3M+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXRBcmNoaXRlY3RUYXJnZXQoKTtcblxuICAgIGNvbnN0IHsgY29uZmlndXJhdGlvbiA9ICcnLCBwcm9qZWN0LCAuLi5hcmNoaXRlY3RPcHRpb25zIH0gPSBvcHRpb25zO1xuXG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICAvLyBUaGlzIHJ1bnMgZWFjaCB0YXJnZXQgc2VxdWVudGlhbGx5LlxuICAgICAgLy8gUnVubmluZyB0aGVtIGluIHBhcmFsbGVsIHdvdWxkIGp1bWJsZSB0aGUgbG9nIG1lc3NhZ2VzLlxuICAgICAgbGV0IHJlc3VsdCA9IDA7XG4gICAgICBjb25zdCBwcm9qZWN0TmFtZXMgPSB0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRhcmdldCk7XG4gICAgICBpZiAoIXByb2plY3ROYW1lcykge1xuICAgICAgICByZXR1cm4gdGhpcy5vbk1pc3NpbmdUYXJnZXQoJ0Nhbm5vdCBkZXRlcm1pbmUgcHJvamVjdCBvciB0YXJnZXQgZm9yIGNvbW1hbmQuJyk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgcHJvamVjdCBvZiBwcm9qZWN0TmFtZXMpIHtcbiAgICAgICAgcmVzdWx0IHw9IGF3YWl0IHRoaXMucnVuU2luZ2xlVGFyZ2V0KHsgY29uZmlndXJhdGlvbiwgdGFyZ2V0LCBwcm9qZWN0IH0sIGFyY2hpdGVjdE9wdGlvbnMpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5ydW5TaW5nbGVUYXJnZXQoeyBjb25maWd1cmF0aW9uLCB0YXJnZXQsIHByb2plY3QgfSwgYXJjaGl0ZWN0T3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRBcmNoaXRlY3RQcm9qZWN0KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgeyBvcHRpb25zLCBwb3NpdGlvbmFsIH0gPSB0aGlzLmNvbnRleHQuYXJncztcbiAgICBjb25zdCBbLCBwcm9qZWN0TmFtZV0gPSBwb3NpdGlvbmFsO1xuXG4gICAgaWYgKHByb2plY3ROYW1lKSB7XG4gICAgICByZXR1cm4gcHJvamVjdE5hbWU7XG4gICAgfVxuXG4gICAgLy8gWWFyZ3MgYWxsb3dzIHBvc2l0aW9uYWwgYXJncyB0byBiZSB1c2VkIGFzIGZsYWdzLlxuICAgIGlmICh0eXBlb2Ygb3B0aW9uc1sncHJvamVjdCddID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIG9wdGlvbnNbJ3Byb2plY3QnXTtcbiAgICB9XG5cbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmdldEFyY2hpdGVjdFRhcmdldCgpO1xuICAgIGNvbnN0IHByb2plY3RGcm9tVGFyZ2V0ID0gdGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0YXJnZXQpO1xuXG4gICAgcmV0dXJuIHByb2plY3RGcm9tVGFyZ2V0Py5sZW5ndGggPyBwcm9qZWN0RnJvbVRhcmdldFswXSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIEBtZW1vaXplXG4gIHByaXZhdGUgZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGFyZ2V0OiBzdHJpbmcpOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gdGhpcy5nZXRXb3Jrc3BhY2VPclRocm93KCk7XG4gICAgY29uc3QgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgcHJvamVjdF0gb2Ygd29ya3NwYWNlLnByb2plY3RzKSB7XG4gICAgICBpZiAocHJvamVjdC50YXJnZXRzLmhhcyh0YXJnZXQpKSB7XG4gICAgICAgIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5wdXNoKG5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm11bHRpVGFyZ2V0KSB7XG4gICAgICAvLyBGb3IgbXVsdGkgdGFyZ2V0IGNvbW1hbmRzLCB3ZSBhbHdheXMgbGlzdCBhbGwgcHJvamVjdHMgdGhhdCBoYXZlIHRoZSB0YXJnZXQuXG4gICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtYXliZVByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICAgIGlmIChtYXliZVByb2plY3QpIHtcbiAgICAgICAgcmV0dXJuIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5pbmNsdWRlcyhtYXliZVByb2plY3QpID8gW21heWJlUHJvamVjdF0gOiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHsgZ2V0WWFyZ3NDb21wbGV0aW9ucywgaGVscCB9ID0gdGhpcy5jb250ZXh0LmFyZ3Mub3B0aW9ucztcbiAgICAgIGlmICghZ2V0WWFyZ3NDb21wbGV0aW9ucyAmJiAhaGVscCkge1xuICAgICAgICAvLyBPbmx5IGlzc3VlIHRoZSBiZWxvdyBlcnJvciB3aGVuIG5vdCBpbiBoZWxwIC8gY29tcGxldGlvbiBtb2RlLlxuICAgICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKFxuICAgICAgICAgICdDYW5ub3QgZGV0ZXJtaW5lIHByb2plY3QgZm9yIGNvbW1hbmQuICcgK1xuICAgICAgICAgICAgJ1Bhc3MgdGhlIHByb2plY3QgbmFtZSBhcyBhIGNvbW1hbmQgbGluZSBhcmd1bWVudCBvciBjaGFuZ2UgdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkgdG8gYSBwcm9qZWN0IGRpcmVjdG9yeS4nLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKiogQHJldHVybnMgYSBzb3J0ZWQgbGlzdCBvZiBwcm9qZWN0IG5hbWVzIHRvIGJlIHVzZWQgZm9yIGF1dG8gY29tcGxldGlvbi4gKi9cbiAgcHJpdmF0ZSBnZXRQcm9qZWN0Q2hvaWNlcygpOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuY29udGV4dDtcblxuICAgIHJldHVybiB3b3Jrc3BhY2UgPyBbLi4ud29ya3NwYWNlLnByb2plY3RzLmtleXMoKV0uc29ydCgpIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqIEByZXR1cm5zIGEgc29ydGVkIGxpc3Qgb2YgY29uZmlndXJhdGlvbiBuYW1lcyB0byBiZSB1c2VkIGZvciBhdXRvIGNvbXBsZXRpb24uICovXG4gIHByaXZhdGUgZ2V0Q29uZmlndXJhdGlvbkNob2ljZXMocHJvamVjdDogc3RyaW5nKTogc3RyaW5nW10gfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHByb2plY3REZWZpbml0aW9uID0gdGhpcy5jb250ZXh0LndvcmtzcGFjZT8ucHJvamVjdHMuZ2V0KHByb2plY3QpO1xuICAgIGlmICghcHJvamVjdERlZmluaXRpb24pIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXRBcmNoaXRlY3RUYXJnZXQoKTtcbiAgICBjb25zdCBjb25maWd1cmF0aW9ucyA9IHByb2plY3REZWZpbml0aW9uLnRhcmdldHMuZ2V0KHRhcmdldCk/LmNvbmZpZ3VyYXRpb25zO1xuXG4gICAgcmV0dXJuIGNvbmZpZ3VyYXRpb25zID8gT2JqZWN0LmtleXMoY29uZmlndXJhdGlvbnMpLnNvcnQoKSA6IHVuZGVmaW5lZDtcbiAgfVxufVxuIl19