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
}
__decorate([
    memoize_1.memoize,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], ArchitectCommandModule.prototype, "getProjectNamesByTarget", null);
exports.ArchitectCommandModule = ArchitectCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQtbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmQtYnVpbGRlci9hcmNoaXRlY3QtY29tbWFuZC1tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0FBR0gsZ0RBQXNEO0FBQ3RELGtEQUErQztBQUMvQyxtRkFBNkU7QUFDN0UscURBSzBCO0FBTzFCLE1BQXNCLHNCQUNwQixTQUFRLDBEQUFnRDtJQUt4RCxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVU7UUFDdEIsTUFBTSxVQUFVLEdBQStCLElBQUk7YUFDaEQsVUFBVSxDQUFDLFNBQVMsRUFBRTtZQUNyQixRQUFRLEVBQUUsdUVBQXVFO1lBQ2pGLElBQUksRUFBRSxRQUFRO1NBQ2YsQ0FBQzthQUNELE1BQU0sQ0FBQyxlQUFlLEVBQUU7WUFDdkIsUUFBUSxFQUNOLGdFQUFnRTtnQkFDaEUsc0VBQXNFO2dCQUN0RSxzRUFBc0U7Z0JBQ3RFLHFHQUFxRztZQUN2RyxLQUFLLEVBQUUsR0FBRztZQUNWLElBQUksRUFBRSxRQUFRO1NBQ2YsQ0FBQzthQUNELE1BQU0sRUFBRSxDQUFDO1FBRVosTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDM0MsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNaLE9BQU8sVUFBVSxDQUFDO1NBQ25CO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDekMsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMseUJBQXlCLENBQUM7WUFDekQsT0FBTztZQUNQLE1BQU07U0FDUCxDQUFDLENBQUM7UUFFSCxPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDbkUsQ0FB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RUFBRTtnQkFDekMsT0FBTyx3QkFBd0IsQ0FBQzthQUNqQztZQUVELE1BQU0sWUFBWSxHQUFHLElBQUEsd0JBQWUsRUFBQyxTQUFTLENBQUMsQ0FBQztZQUNoRCxJQUFJLFlBQVksSUFBSSx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUU7Z0JBQ25FLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQzthQUN2QjtTQUNGO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztDQUNGO0FBOUJDO0lBREMsaUJBQU87Ozs7cUVBOEJQO0FBdkhILHdEQXdIQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgZ2V0UHJvamVjdEJ5Q3dkIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBtZW1vaXplIH0gZnJvbSAnLi4vdXRpbGl0aWVzL21lbW9pemUnO1xuaW1wb3J0IHsgQXJjaGl0ZWN0QmFzZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuL2FyY2hpdGVjdC1iYXNlLWNvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGVFcnJvcixcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBPcHRpb25zLFxuICBPdGhlck9wdGlvbnMsXG59IGZyb20gJy4vY29tbWFuZC1tb2R1bGUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFyY2hpdGVjdENvbW1hbmRBcmdzIHtcbiAgY29uZmlndXJhdGlvbj86IHN0cmluZztcbiAgcHJvamVjdD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFyY2hpdGVjdENvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBBcmNoaXRlY3RCYXNlQ29tbWFuZE1vZHVsZTxBcmNoaXRlY3RDb21tYW5kQXJncz5cbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248QXJjaGl0ZWN0Q29tbWFuZEFyZ3M+XG57XG4gIGFic3RyYWN0IHJlYWRvbmx5IG11bHRpVGFyZ2V0OiBib29sZWFuO1xuXG4gIGFzeW5jIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxBcmNoaXRlY3RDb21tYW5kQXJncz4+IHtcbiAgICBjb25zdCBsb2NhbFlhcmdzOiBBcmd2PEFyY2hpdGVjdENvbW1hbmRBcmdzPiA9IGFyZ3ZcbiAgICAgIC5wb3NpdGlvbmFsKCdwcm9qZWN0Jywge1xuICAgICAgICBkZXNjcmliZTogJ1RoZSBuYW1lIG9mIHRoZSBwcm9qZWN0IHRvIGJ1aWxkLiBDYW4gYmUgYW4gYXBwbGljYXRpb24gb3IgYSBsaWJyYXJ5LicsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2NvbmZpZ3VyYXRpb24nLCB7XG4gICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgIGBPbmUgb3IgbW9yZSBuYW1lZCBidWlsZGVyIGNvbmZpZ3VyYXRpb25zIGFzIGEgY29tbWEtc2VwYXJhdGVkIGAgK1xuICAgICAgICAgIGBsaXN0IGFzIHNwZWNpZmllZCBpbiB0aGUgXCJjb25maWd1cmF0aW9uc1wiIHNlY3Rpb24gaW4gYW5ndWxhci5qc29uLlxcbmAgK1xuICAgICAgICAgIGBUaGUgYnVpbGRlciB1c2VzIHRoZSBuYW1lZCBjb25maWd1cmF0aW9ucyB0byBydW4gdGhlIGdpdmVuIHRhcmdldC5cXG5gICtcbiAgICAgICAgICBgRm9yIG1vcmUgaW5mb3JtYXRpb24sIHNlZSBodHRwczovL2FuZ3VsYXIuaW8vZ3VpZGUvd29ya3NwYWNlLWNvbmZpZyNhbHRlcm5hdGUtYnVpbGQtY29uZmlndXJhdGlvbnMuYCxcbiAgICAgICAgYWxpYXM6ICdjJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICB9KVxuICAgICAgLnN0cmljdCgpO1xuXG4gICAgY29uc3QgcHJvamVjdCA9IHRoaXMuZ2V0QXJjaGl0ZWN0UHJvamVjdCgpO1xuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXRBcmNoaXRlY3RUYXJnZXQoKTtcbiAgICBjb25zdCBzY2hlbWFPcHRpb25zID0gYXdhaXQgdGhpcy5nZXRBcmNoaXRlY3RUYXJnZXRPcHRpb25zKHtcbiAgICAgIHByb2plY3QsXG4gICAgICB0YXJnZXQsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcy5hZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kKGxvY2FsWWFyZ3MsIHNjaGVtYU9wdGlvbnMpO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8QXJjaGl0ZWN0Q29tbWFuZEFyZ3M+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXRBcmNoaXRlY3RUYXJnZXQoKTtcblxuICAgIGNvbnN0IHsgY29uZmlndXJhdGlvbiA9ICcnLCBwcm9qZWN0LCAuLi5hcmNoaXRlY3RPcHRpb25zIH0gPSBvcHRpb25zO1xuXG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICAvLyBUaGlzIHJ1bnMgZWFjaCB0YXJnZXQgc2VxdWVudGlhbGx5LlxuICAgICAgLy8gUnVubmluZyB0aGVtIGluIHBhcmFsbGVsIHdvdWxkIGp1bWJsZSB0aGUgbG9nIG1lc3NhZ2VzLlxuICAgICAgbGV0IHJlc3VsdCA9IDA7XG4gICAgICBjb25zdCBwcm9qZWN0TmFtZXMgPSB0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRhcmdldCk7XG4gICAgICBpZiAoIXByb2plY3ROYW1lcykge1xuICAgICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKFxuICAgICAgICAgIHRoaXMubWlzc2luZ0Vycm9yVGFyZ2V0ID8/ICdDYW5ub3QgZGV0ZXJtaW5lIHByb2plY3Qgb3IgdGFyZ2V0IGZvciBjb21tYW5kLicsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgcHJvamVjdCBvZiBwcm9qZWN0TmFtZXMpIHtcbiAgICAgICAgcmVzdWx0IHw9IGF3YWl0IHRoaXMucnVuU2luZ2xlVGFyZ2V0KHsgY29uZmlndXJhdGlvbiwgdGFyZ2V0LCBwcm9qZWN0IH0sIGFyY2hpdGVjdE9wdGlvbnMpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5ydW5TaW5nbGVUYXJnZXQoeyBjb25maWd1cmF0aW9uLCB0YXJnZXQsIHByb2plY3QgfSwgYXJjaGl0ZWN0T3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRBcmNoaXRlY3RQcm9qZWN0KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gdGhpcy5jb250ZXh0LndvcmtzcGFjZTtcbiAgICBpZiAoIXdvcmtzcGFjZSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBbLCBwcm9qZWN0TmFtZV0gPSB0aGlzLmNvbnRleHQuYXJncy5wb3NpdGlvbmFsO1xuXG4gICAgaWYgKHByb2plY3ROYW1lKSB7XG4gICAgICBpZiAoIXdvcmtzcGFjZS5wcm9qZWN0cy5oYXMocHJvamVjdE5hbWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IoYFByb2plY3QgJyR7cHJvamVjdE5hbWV9JyBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHByb2plY3ROYW1lO1xuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0QXJjaGl0ZWN0VGFyZ2V0KCk7XG4gICAgY29uc3QgcHJvamVjdEZyb21UYXJnZXQgPSB0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRhcmdldCk7XG5cbiAgICByZXR1cm4gcHJvamVjdEZyb21UYXJnZXQ/Lmxlbmd0aCA/IHByb2plY3RGcm9tVGFyZ2V0WzBdIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRBcmNoaXRlY3RUYXJnZXQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kTmFtZTtcbiAgfVxuXG4gIEBtZW1vaXplXG4gIHByaXZhdGUgZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGFyZ2V0OiBzdHJpbmcpOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gdGhpcy5nZXRXb3Jrc3BhY2VPclRocm93KCk7XG5cbiAgICBjb25zdCBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWU6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBbbmFtZSwgcHJvamVjdF0gb2Ygd29ya3NwYWNlLnByb2plY3RzKSB7XG4gICAgICBpZiAocHJvamVjdC50YXJnZXRzLmhhcyh0YXJnZXQpKSB7XG4gICAgICAgIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5wdXNoKG5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm11bHRpVGFyZ2V0KSB7XG4gICAgICAvLyBGb3IgbXVsdGkgdGFyZ2V0IGNvbW1hbmRzLCB3ZSBhbHdheXMgbGlzdCBhbGwgcHJvamVjdHMgdGhhdCBoYXZlIHRoZSB0YXJnZXQuXG4gICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtYXliZVByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICAgIGlmIChtYXliZVByb2plY3QgJiYgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmluY2x1ZGVzKG1heWJlUHJvamVjdCkpIHtcbiAgICAgICAgcmV0dXJuIFttYXliZVByb2plY3RdO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cbiJdfQ==