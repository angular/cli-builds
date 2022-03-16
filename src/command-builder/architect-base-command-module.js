"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectBaseCommandModule = void 0;
const architect_1 = require("@angular-devkit/architect");
const node_1 = require("@angular-devkit/architect/node");
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const path_1 = require("path");
const analytics_1 = require("../analytics/analytics");
const command_module_1 = require("./command-module");
const json_schema_1 = require("./utilities/json-schema");
class ArchitectBaseCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.shouldReportAnalytics = false;
    }
    async runSingleTarget(target, options) {
        var _a;
        const architectHost = await this.getArchitectHost();
        let builderName;
        try {
            builderName = await architectHost.getBuilderNameForTarget(target);
        }
        catch (e) {
            throw new command_module_1.CommandModuleError((_a = this.missingErrorTarget) !== null && _a !== void 0 ? _a : e.message);
        }
        await this.reportAnalytics({
            ...(await architectHost.getOptionsForTarget(target)),
            ...options,
        });
        const { logger } = this.context;
        const run = await this.getArchitect().scheduleTarget(target, options, {
            logger,
            analytics: (0, analytics_1.isPackageNameSafeForAnalytics)(builderName) ? await this.getAnalytics() : undefined,
        });
        const { error, success } = await run.output.toPromise();
        await run.stop();
        if (error) {
            logger.error(error);
        }
        return success ? 0 : 1;
    }
    getArchitectHost() {
        if (this._architectHost) {
            return this._architectHost;
        }
        const workspace = this.getWorkspaceOrThrow();
        return (this._architectHost = new node_1.WorkspaceNodeModulesArchitectHost(workspace, workspace.basePath));
    }
    getArchitect() {
        if (this._architect) {
            return this._architect;
        }
        const registry = new core_1.json.schema.CoreSchemaRegistry();
        registry.addPostTransform(core_1.json.schema.transforms.addUndefinedDefaults);
        registry.useXDeprecatedProvider((msg) => this.context.logger.warn(msg));
        const architectHost = this.getArchitectHost();
        return (this._architect = new architect_1.Architect(architectHost, registry));
    }
    async getArchitectTargetOptions(target) {
        const architectHost = this.getArchitectHost();
        const builderConf = await architectHost.getBuilderNameForTarget(target);
        let builderDesc;
        try {
            builderDesc = await architectHost.resolveBuilder(builderConf);
        }
        catch (e) {
            if (e.code === 'MODULE_NOT_FOUND') {
                this.warnOnMissingNodeModules();
                throw new command_module_1.CommandModuleError(`Could not find the '${builderConf}' builder's node package.`);
            }
            throw e;
        }
        return (0, json_schema_1.parseJsonSchemaToOptions)(new core_1.json.schema.CoreSchemaRegistry(), builderDesc.optionSchema, true);
    }
    warnOnMissingNodeModules() {
        var _a;
        const basePath = (_a = this.context.workspace) === null || _a === void 0 ? void 0 : _a.basePath;
        if (!basePath) {
            return;
        }
        // Check for a `node_modules` directory (npm, yarn non-PnP, etc.)
        if ((0, fs_1.existsSync)((0, path_1.resolve)(basePath, 'node_modules'))) {
            return;
        }
        // Check for yarn PnP files
        if ((0, fs_1.existsSync)((0, path_1.resolve)(basePath, '.pnp.js')) ||
            (0, fs_1.existsSync)((0, path_1.resolve)(basePath, '.pnp.cjs')) ||
            (0, fs_1.existsSync)((0, path_1.resolve)(basePath, '.pnp.mjs'))) {
            return;
        }
        this.context.logger.warn(`Node packages may not be installed. Try installing with '${this.context.packageManager} install'.`);
    }
}
exports.ArchitectBaseCommandModule = ArchitectBaseCommandModule;
ArchitectBaseCommandModule.scope = command_module_1.CommandScope.In;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWJhc2UtY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2FyY2hpdGVjdC1iYXNlLWNvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILHlEQUE4RDtBQUM5RCx5REFBbUY7QUFDbkYsK0NBQTRDO0FBQzVDLDJCQUFnQztBQUNoQywrQkFBK0I7QUFDL0Isc0RBQXVFO0FBQ3ZFLHFEQU0wQjtBQUMxQix5REFBMkU7QUFFM0UsTUFBc0IsMEJBQ3BCLFNBQVEsOEJBQWdCO0lBRDFCOztRQUtxQiwwQkFBcUIsR0FBRyxLQUFLLENBQUM7SUErR25ELENBQUM7SUE1R1csS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFjLEVBQUUsT0FBcUI7O1FBQ25FLE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFFcEQsSUFBSSxXQUFtQixDQUFDO1FBQ3hCLElBQUk7WUFDRixXQUFXLEdBQUcsTUFBTSxhQUFhLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDbkU7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLE1BQU0sSUFBSSxtQ0FBa0IsQ0FBQyxNQUFBLElBQUksQ0FBQyxrQkFBa0IsbUNBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ3BFO1FBRUQsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDO1lBQ3pCLEdBQUcsQ0FBQyxNQUFNLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwRCxHQUFHLE9BQU87U0FDWCxDQUFDLENBQUM7UUFFSCxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUVoQyxNQUFNLEdBQUcsR0FBRyxNQUFNLElB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RUQsaUVBQWlFO1FBQ2pFLElBQUksSUFBQSxlQUFVLEVBQUMsSUFBQSxjQUFPLEVBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDLEVBQUU7WUFDakQsT0FBTztTQUNSO1FBRUQsMkJBQTJCO1FBQzNCLElBQ0UsSUFBQSxlQUFVLEVBQUMsSUFBQSxjQUFPLEVBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3hDLElBQUEsZUFBVSxFQUFDLElBQUEsY0FBTyxFQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN6QyxJQUFBLGVBQVUsRUFBQyxJQUFBLGNBQU8sRUFBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFDekM7WUFDQSxPQUFPO1NBQ1I7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ3RCLDREQUE0RCxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsWUFBWSxDQUNwRyxDQUFDO0lBQ0osQ0FBQzs7QUFuSEgsZ0VBb0hDO0FBaEhpQixnQ0FBSyxHQUFHLDZCQUFZLENBQUMsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEFyY2hpdGVjdCwgVGFyZ2V0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBXb3Jrc3BhY2VOb2RlTW9kdWxlc0FyY2hpdGVjdEhvc3QgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0L25vZGUnO1xuaW1wb3J0IHsganNvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyB9IGZyb20gJy4uL2FuYWx5dGljcy9hbmFseXRpY3MnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUVycm9yLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIENvbW1hbmRTY29wZSxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IE9wdGlvbiwgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXJjaGl0ZWN0QmFzZUNvbW1hbmRNb2R1bGU8VD5cbiAgZXh0ZW5kcyBDb21tYW5kTW9kdWxlPFQ+XG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPFQ+XG57XG4gIHN0YXRpYyBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5JbjtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIHNob3VsZFJlcG9ydEFuYWx5dGljcyA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgbWlzc2luZ0Vycm9yVGFyZ2V0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1blNpbmdsZVRhcmdldCh0YXJnZXQ6IFRhcmdldCwgb3B0aW9uczogT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBhcmNoaXRlY3RIb3N0ID0gYXdhaXQgdGhpcy5nZXRBcmNoaXRlY3RIb3N0KCk7XG5cbiAgICBsZXQgYnVpbGRlck5hbWU6IHN0cmluZztcbiAgICB0cnkge1xuICAgICAgYnVpbGRlck5hbWUgPSBhd2FpdCBhcmNoaXRlY3RIb3N0LmdldEJ1aWxkZXJOYW1lRm9yVGFyZ2V0KHRhcmdldCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcih0aGlzLm1pc3NpbmdFcnJvclRhcmdldCA/PyBlLm1lc3NhZ2UpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucmVwb3J0QW5hbHl0aWNzKHtcbiAgICAgIC4uLihhd2FpdCBhcmNoaXRlY3RIb3N0LmdldE9wdGlvbnNGb3JUYXJnZXQodGFyZ2V0KSksXG4gICAgICAuLi5vcHRpb25zLFxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcblxuICAgIGNvbnN0IHJ1biA9IGF3YWl0IHRoaXMuZ2V0QXJjaGl0ZWN0KCkuc2NoZWR1bGVUYXJnZXQodGFyZ2V0LCBvcHRpb25zIGFzIGpzb24uSnNvbk9iamVjdCwge1xuICAgICAgbG9nZ2VyLFxuICAgICAgYW5hbHl0aWNzOiBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyhidWlsZGVyTmFtZSkgPyBhd2FpdCB0aGlzLmdldEFuYWx5dGljcygpIDogdW5kZWZpbmVkLFxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBlcnJvciwgc3VjY2VzcyB9ID0gYXdhaXQgcnVuLm91dHB1dC50b1Byb21pc2UoKTtcbiAgICBhd2FpdCBydW4uc3RvcCgpO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoZXJyb3IpO1xuICAgIH1cblxuICAgIHJldHVybiBzdWNjZXNzID8gMCA6IDE7XG4gIH1cblxuICBwcml2YXRlIF9hcmNoaXRlY3RIb3N0OiBXb3Jrc3BhY2VOb2RlTW9kdWxlc0FyY2hpdGVjdEhvc3QgfCB1bmRlZmluZWQ7XG4gIHByb3RlY3RlZCBnZXRBcmNoaXRlY3RIb3N0KCk6IFdvcmtzcGFjZU5vZGVNb2R1bGVzQXJjaGl0ZWN0SG9zdCB7XG4gICAgaWYgKHRoaXMuX2FyY2hpdGVjdEhvc3QpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hcmNoaXRlY3RIb3N0O1xuICAgIH1cblxuICAgIGNvbnN0IHdvcmtzcGFjZSA9IHRoaXMuZ2V0V29ya3NwYWNlT3JUaHJvdygpO1xuXG4gICAgcmV0dXJuICh0aGlzLl9hcmNoaXRlY3RIb3N0ID0gbmV3IFdvcmtzcGFjZU5vZGVNb2R1bGVzQXJjaGl0ZWN0SG9zdChcbiAgICAgIHdvcmtzcGFjZSxcbiAgICAgIHdvcmtzcGFjZS5iYXNlUGF0aCxcbiAgICApKTtcbiAgfVxuXG4gIHByaXZhdGUgX2FyY2hpdGVjdDogQXJjaGl0ZWN0IHwgdW5kZWZpbmVkO1xuICBwcm90ZWN0ZWQgZ2V0QXJjaGl0ZWN0KCk6IEFyY2hpdGVjdCB7XG4gICAgaWYgKHRoaXMuX2FyY2hpdGVjdCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FyY2hpdGVjdDtcbiAgICB9XG5cbiAgICBjb25zdCByZWdpc3RyeSA9IG5ldyBqc29uLnNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoKTtcbiAgICByZWdpc3RyeS5hZGRQb3N0VHJhbnNmb3JtKGpzb24uc2NoZW1hLnRyYW5zZm9ybXMuYWRkVW5kZWZpbmVkRGVmYXVsdHMpO1xuICAgIHJlZ2lzdHJ5LnVzZVhEZXByZWNhdGVkUHJvdmlkZXIoKG1zZykgPT4gdGhpcy5jb250ZXh0LmxvZ2dlci53YXJuKG1zZykpO1xuXG4gICAgY29uc3QgYXJjaGl0ZWN0SG9zdCA9IHRoaXMuZ2V0QXJjaGl0ZWN0SG9zdCgpO1xuXG4gICAgcmV0dXJuICh0aGlzLl9hcmNoaXRlY3QgPSBuZXcgQXJjaGl0ZWN0KGFyY2hpdGVjdEhvc3QsIHJlZ2lzdHJ5KSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0QXJjaGl0ZWN0VGFyZ2V0T3B0aW9ucyh0YXJnZXQ6IFRhcmdldCk6IFByb21pc2U8T3B0aW9uW10+IHtcbiAgICBjb25zdCBhcmNoaXRlY3RIb3N0ID0gdGhpcy5nZXRBcmNoaXRlY3RIb3N0KCk7XG4gICAgY29uc3QgYnVpbGRlckNvbmYgPSBhd2FpdCBhcmNoaXRlY3RIb3N0LmdldEJ1aWxkZXJOYW1lRm9yVGFyZ2V0KHRhcmdldCk7XG5cbiAgICBsZXQgYnVpbGRlckRlc2M7XG4gICAgdHJ5IHtcbiAgICAgIGJ1aWxkZXJEZXNjID0gYXdhaXQgYXJjaGl0ZWN0SG9zdC5yZXNvbHZlQnVpbGRlcihidWlsZGVyQ29uZik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgIHRoaXMud2Fybk9uTWlzc2luZ05vZGVNb2R1bGVzKCk7XG4gICAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IoYENvdWxkIG5vdCBmaW5kIHRoZSAnJHtidWlsZGVyQ29uZn0nIGJ1aWxkZXIncyBub2RlIHBhY2thZ2UuYCk7XG4gICAgICB9XG5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyhcbiAgICAgIG5ldyBqc29uLnNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoKSxcbiAgICAgIGJ1aWxkZXJEZXNjLm9wdGlvblNjaGVtYSBhcyBqc29uLkpzb25PYmplY3QsXG4gICAgICB0cnVlLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIHdhcm5Pbk1pc3NpbmdOb2RlTW9kdWxlcygpOiB2b2lkIHtcbiAgICBjb25zdCBiYXNlUGF0aCA9IHRoaXMuY29udGV4dC53b3Jrc3BhY2U/LmJhc2VQYXRoO1xuICAgIGlmICghYmFzZVBhdGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgYSBgbm9kZV9tb2R1bGVzYCBkaXJlY3RvcnkgKG5wbSwgeWFybiBub24tUG5QLCBldGMuKVxuICAgIGlmIChleGlzdHNTeW5jKHJlc29sdmUoYmFzZVBhdGgsICdub2RlX21vZHVsZXMnKSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgeWFybiBQblAgZmlsZXNcbiAgICBpZiAoXG4gICAgICBleGlzdHNTeW5jKHJlc29sdmUoYmFzZVBhdGgsICcucG5wLmpzJykpIHx8XG4gICAgICBleGlzdHNTeW5jKHJlc29sdmUoYmFzZVBhdGgsICcucG5wLmNqcycpKSB8fFxuICAgICAgZXhpc3RzU3luYyhyZXNvbHZlKGJhc2VQYXRoLCAnLnBucC5tanMnKSlcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmNvbnRleHQubG9nZ2VyLndhcm4oXG4gICAgICBgTm9kZSBwYWNrYWdlcyBtYXkgbm90IGJlIGluc3RhbGxlZC4gVHJ5IGluc3RhbGxpbmcgd2l0aCAnJHt0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXJ9IGluc3RhbGwnLmAsXG4gICAgKTtcbiAgfVxufVxuIl19