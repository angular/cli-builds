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
const package_manager_1 = require("../utilities/package-manager");
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
                await this.warnOnMissingNodeModules();
                throw new command_module_1.CommandModuleError(`Could not find the '${builderConf}' builder's node package.`);
            }
            throw e;
        }
        return (0, json_schema_1.parseJsonSchemaToOptions)(new core_1.json.schema.CoreSchemaRegistry(), builderDesc.optionSchema, true);
    }
    async warnOnMissingNodeModules() {
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
        const packageManager = await (0, package_manager_1.getPackageManager)(basePath);
        this.context.logger.warn(`Node packages may not be installed. Try installing with '${packageManager} install'.`);
    }
}
exports.ArchitectBaseCommandModule = ArchitectBaseCommandModule;
ArchitectBaseCommandModule.scope = command_module_1.CommandScope.In;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWJhc2UtY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2FyY2hpdGVjdC1iYXNlLWNvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILHlEQUE4RDtBQUM5RCx5REFBbUY7QUFDbkYsK0NBQTRDO0FBQzVDLDJCQUFnQztBQUNoQywrQkFBK0I7QUFDL0Isc0RBQXVFO0FBQ3ZFLGtFQUFpRTtBQUNqRSxxREFNMEI7QUFDMUIseURBQTJFO0FBRTNFLE1BQXNCLDBCQUNwQixTQUFRLDhCQUFnQjtJQUQxQjs7UUFLcUIsMEJBQXFCLEdBQUcsS0FBSyxDQUFDO0lBZ0huRCxDQUFDO0lBN0dXLEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBYyxFQUFFLE9BQXFCOztRQUNuRSxNQUFNLGFBQWEsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBRXBELElBQUksV0FBbUIsQ0FBQztRQUN4QixJQUFJO1lBQ0YsV0FBVyxHQUFHLE1BQU0sYUFBYSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ25FO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixNQUFNLElBQUksbUNBQWtCLENBQUMsTUFBQSxJQUFJLENBQUMsa0JBQWtCLG1DQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNwRTtRQUVELE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUN6QixHQUFHLENBQUMsTUFBTSxhQUFhLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEQsR0FBRyxPQUFPO1NBQ1gsQ0FBQyxDQUFDO1FBRUgsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFFaEMsTUFBTSxHQUFH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LFFBQVEsRUFBRTtZQUNiLE9BQU87U0FDUjtRQUVELGlFQUFpRTtRQUNqRSxJQUFJLElBQUEsZUFBVSxFQUFDLElBQUEsY0FBTyxFQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFO1lBQ2pELE9BQU87U0FDUjtRQUVELDJCQUEyQjtRQUMzQixJQUNFLElBQUEsZUFBVSxFQUFDLElBQUEsY0FBTyxFQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN4QyxJQUFBLGVBQVUsRUFBQyxJQUFBLGNBQU8sRUFBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDekMsSUFBQSxlQUFVLEVBQUMsSUFBQSxjQUFPLEVBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQ3pDO1lBQ0EsT0FBTztTQUNSO1FBRUQsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFBLG1DQUFpQixFQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3pELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDdEIsNERBQTRELGNBQWMsWUFBWSxDQUN2RixDQUFDO0lBQ0osQ0FBQzs7QUFwSEgsZ0VBcUhDO0FBakhpQixnQ0FBSyxHQUFHLDZCQUFZLENBQUMsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEFyY2hpdGVjdCwgVGFyZ2V0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBXb3Jrc3BhY2VOb2RlTW9kdWxlc0FyY2hpdGVjdEhvc3QgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0L25vZGUnO1xuaW1wb3J0IHsganNvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyB9IGZyb20gJy4uL2FuYWx5dGljcy9hbmFseXRpY3MnO1xuaW1wb3J0IHsgZ2V0UGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi91dGlsaXRpZXMvcGFja2FnZS1tYW5hZ2VyJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGUsXG4gIENvbW1hbmRNb2R1bGVFcnJvcixcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBDb21tYW5kU2NvcGUsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBPcHRpb24sIHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyB9IGZyb20gJy4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFyY2hpdGVjdEJhc2VDb21tYW5kTW9kdWxlPFQ+XG4gIGV4dGVuZHMgQ29tbWFuZE1vZHVsZTxUPlxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxUPlxue1xuICBzdGF0aWMgb3ZlcnJpZGUgc2NvcGUgPSBDb21tYW5kU2NvcGUuSW47XG4gIHByb3RlY3RlZCBvdmVycmlkZSBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSBmYWxzZTtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IG1pc3NpbmdFcnJvclRhcmdldDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIHByb3RlY3RlZCBhc3luYyBydW5TaW5nbGVUYXJnZXQodGFyZ2V0OiBUYXJnZXQsIG9wdGlvbnM6IE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgYXJjaGl0ZWN0SG9zdCA9IGF3YWl0IHRoaXMuZ2V0QXJjaGl0ZWN0SG9zdCgpO1xuXG4gICAgbGV0IGJ1aWxkZXJOYW1lOiBzdHJpbmc7XG4gICAgdHJ5IHtcbiAgICAgIGJ1aWxkZXJOYW1lID0gYXdhaXQgYXJjaGl0ZWN0SG9zdC5nZXRCdWlsZGVyTmFtZUZvclRhcmdldCh0YXJnZXQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IodGhpcy5taXNzaW5nRXJyb3JUYXJnZXQgPz8gZS5tZXNzYWdlKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnJlcG9ydEFuYWx5dGljcyh7XG4gICAgICAuLi4oYXdhaXQgYXJjaGl0ZWN0SG9zdC5nZXRPcHRpb25zRm9yVGFyZ2V0KHRhcmdldCkpLFxuICAgICAgLi4ub3B0aW9ucyxcbiAgICB9KTtcblxuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICBjb25zdCBydW4gPSBhd2FpdCB0aGlzLmdldEFyY2hpdGVjdCgpLnNjaGVkdWxlVGFyZ2V0KHRhcmdldCwgb3B0aW9ucyBhcyBqc29uLkpzb25PYmplY3QsIHtcbiAgICAgIGxvZ2dlcixcbiAgICAgIGFuYWx5dGljczogaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MoYnVpbGRlck5hbWUpID8gYXdhaXQgdGhpcy5nZXRBbmFseXRpY3MoKSA6IHVuZGVmaW5lZCxcbiAgICB9KTtcblxuICAgIGNvbnN0IHsgZXJyb3IsIHN1Y2Nlc3MgfSA9IGF3YWl0IHJ1bi5vdXRwdXQudG9Qcm9taXNlKCk7XG4gICAgYXdhaXQgcnVuLnN0b3AoKTtcblxuICAgIGlmIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKGVycm9yKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VjY2VzcyA/IDAgOiAxO1xuICB9XG5cbiAgcHJpdmF0ZSBfYXJjaGl0ZWN0SG9zdDogV29ya3NwYWNlTm9kZU1vZHVsZXNBcmNoaXRlY3RIb3N0IHwgdW5kZWZpbmVkO1xuICBwcm90ZWN0ZWQgZ2V0QXJjaGl0ZWN0SG9zdCgpOiBXb3Jrc3BhY2VOb2RlTW9kdWxlc0FyY2hpdGVjdEhvc3Qge1xuICAgIGlmICh0aGlzLl9hcmNoaXRlY3RIb3N0KSB7XG4gICAgICByZXR1cm4gdGhpcy5fYXJjaGl0ZWN0SG9zdDtcbiAgICB9XG5cbiAgICBjb25zdCB3b3Jrc3BhY2UgPSB0aGlzLmdldFdvcmtzcGFjZU9yVGhyb3coKTtcblxuICAgIHJldHVybiAodGhpcy5fYXJjaGl0ZWN0SG9zdCA9IG5ldyBXb3Jrc3BhY2VOb2RlTW9kdWxlc0FyY2hpdGVjdEhvc3QoXG4gICAgICB3b3Jrc3BhY2UsXG4gICAgICB3b3Jrc3BhY2UuYmFzZVBhdGgsXG4gICAgKSk7XG4gIH1cblxuICBwcml2YXRlIF9hcmNoaXRlY3Q6IEFyY2hpdGVjdCB8IHVuZGVmaW5lZDtcbiAgcHJvdGVjdGVkIGdldEFyY2hpdGVjdCgpOiBBcmNoaXRlY3Qge1xuICAgIGlmICh0aGlzLl9hcmNoaXRlY3QpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hcmNoaXRlY3Q7XG4gICAgfVxuXG4gICAgY29uc3QgcmVnaXN0cnkgPSBuZXcganNvbi5zY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KCk7XG4gICAgcmVnaXN0cnkuYWRkUG9zdFRyYW5zZm9ybShqc29uLnNjaGVtYS50cmFuc2Zvcm1zLmFkZFVuZGVmaW5lZERlZmF1bHRzKTtcbiAgICByZWdpc3RyeS51c2VYRGVwcmVjYXRlZFByb3ZpZGVyKChtc2cpID0+IHRoaXMuY29udGV4dC5sb2dnZXIud2Fybihtc2cpKTtcblxuICAgIGNvbnN0IGFyY2hpdGVjdEhvc3QgPSB0aGlzLmdldEFyY2hpdGVjdEhvc3QoKTtcblxuICAgIHJldHVybiAodGhpcy5fYXJjaGl0ZWN0ID0gbmV3IEFyY2hpdGVjdChhcmNoaXRlY3RIb3N0LCByZWdpc3RyeSkpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldEFyY2hpdGVjdFRhcmdldE9wdGlvbnModGFyZ2V0OiBUYXJnZXQpOiBQcm9taXNlPE9wdGlvbltdPiB7XG4gICAgY29uc3QgYXJjaGl0ZWN0SG9zdCA9IHRoaXMuZ2V0QXJjaGl0ZWN0SG9zdCgpO1xuICAgIGNvbnN0IGJ1aWxkZXJDb25mID0gYXdhaXQgYXJjaGl0ZWN0SG9zdC5nZXRCdWlsZGVyTmFtZUZvclRhcmdldCh0YXJnZXQpO1xuXG4gICAgbGV0IGJ1aWxkZXJEZXNjO1xuICAgIHRyeSB7XG4gICAgICBidWlsZGVyRGVzYyA9IGF3YWl0IGFyY2hpdGVjdEhvc3QucmVzb2x2ZUJ1aWxkZXIoYnVpbGRlckNvbmYpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICBhd2FpdCB0aGlzLndhcm5Pbk1pc3NpbmdOb2RlTW9kdWxlcygpO1xuICAgICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKGBDb3VsZCBub3QgZmluZCB0aGUgJyR7YnVpbGRlckNvbmZ9JyBidWlsZGVyJ3Mgbm9kZSBwYWNrYWdlLmApO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMoXG4gICAgICBuZXcganNvbi5zY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KCksXG4gICAgICBidWlsZGVyRGVzYy5vcHRpb25TY2hlbWEgYXMganNvbi5Kc29uT2JqZWN0LFxuICAgICAgdHJ1ZSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB3YXJuT25NaXNzaW5nTm9kZU1vZHVsZXMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYmFzZVBhdGggPSB0aGlzLmNvbnRleHQud29ya3NwYWNlPy5iYXNlUGF0aDtcbiAgICBpZiAoIWJhc2VQYXRoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGEgYG5vZGVfbW9kdWxlc2AgZGlyZWN0b3J5IChucG0sIHlhcm4gbm9uLVBuUCwgZXRjLilcbiAgICBpZiAoZXhpc3RzU3luYyhyZXNvbHZlKGJhc2VQYXRoLCAnbm9kZV9tb2R1bGVzJykpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIHlhcm4gUG5QIGZpbGVzXG4gICAgaWYgKFxuICAgICAgZXhpc3RzU3luYyhyZXNvbHZlKGJhc2VQYXRoLCAnLnBucC5qcycpKSB8fFxuICAgICAgZXhpc3RzU3luYyhyZXNvbHZlKGJhc2VQYXRoLCAnLnBucC5janMnKSkgfHxcbiAgICAgIGV4aXN0c1N5bmMocmVzb2x2ZShiYXNlUGF0aCwgJy5wbnAubWpzJykpXG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGFja2FnZU1hbmFnZXIgPSBhd2FpdCBnZXRQYWNrYWdlTWFuYWdlcihiYXNlUGF0aCk7XG4gICAgdGhpcy5jb250ZXh0LmxvZ2dlci53YXJuKFxuICAgICAgYE5vZGUgcGFja2FnZXMgbWF5IG5vdCBiZSBpbnN0YWxsZWQuIFRyeSBpbnN0YWxsaW5nIHdpdGggJyR7cGFja2FnZU1hbmFnZXJ9IGluc3RhbGwnLmAsXG4gICAgKTtcbiAgfVxufVxuIl19