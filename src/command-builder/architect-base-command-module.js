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
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const analytics_1 = require("../analytics/analytics");
const error_1 = require("../utilities/error");
const prompt_1 = require("../utilities/prompt");
const tty_1 = require("../utilities/tty");
const command_module_1 = require("./command-module");
const json_schema_1 = require("./utilities/json-schema");
class ArchitectBaseCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.scope = command_module_1.CommandScope.In;
        this.shouldReportAnalytics = false;
    }
    async runSingleTarget(target, options) {
        const architectHost = await this.getArchitectHost();
        let builderName;
        try {
            builderName = await architectHost.getBuilderNameForTarget(target);
        }
        catch (e) {
            (0, error_1.assertIsError)(e);
            return this.onMissingTarget(e.message);
        }
        await this.reportAnalytics({
            ...(await architectHost.getOptionsForTarget(target)),
            ...options,
        }, undefined /** paths */, undefined /** dimensions */, builderName);
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
        let builderConf;
        try {
            builderConf = await architectHost.getBuilderNameForTarget(target);
        }
        catch (_a) {
            return [];
        }
        let builderDesc;
        try {
            builderDesc = await architectHost.resolveBuilder(builderConf);
        }
        catch (e) {
            (0, error_1.assertIsError)(e);
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
        this.context.logger.warn(`Node packages may not be installed. Try installing with '${this.context.packageManager.name} install'.`);
    }
    getArchitectTarget() {
        return this.commandName;
    }
    async onMissingTarget(defaultMessage) {
        const { logger } = this.context;
        const choices = this.missingTargetChoices;
        if (!(choices === null || choices === void 0 ? void 0 : choices.length)) {
            logger.error(defaultMessage);
            return 1;
        }
        const missingTargetMessage = `Cannot find "${this.getArchitectTarget()}" target for the specified project.\n` +
            `You can add a package that implements these capabilities.\n\n` +
            `For example:\n` +
            choices.map(({ name, value }) => `  ${name}: ng add ${value}`).join('\n') +
            '\n';
        if ((0, tty_1.isTTY)()) {
            // Use prompts to ask the user if they'd like to install a package.
            logger.warn(missingTargetMessage);
            const packageToInstall = await this.getMissingTargetPackageToInstall(choices);
            if (packageToInstall) {
                // Example run: `ng add @angular-eslint/schematics`.
                const binPath = (0, path_1.resolve)(__dirname, '../../bin/ng.js');
                const { error } = (0, child_process_1.spawnSync)(process.execPath, [binPath, 'add', packageToInstall], {
                    stdio: 'inherit',
                });
                if (error) {
                    throw error;
                }
            }
        }
        else {
            // Non TTY display error message.
            logger.error(missingTargetMessage);
        }
        return 1;
    }
    async getMissingTargetPackageToInstall(choices) {
        if (choices.length === 1) {
            // Single choice
            const { name, value } = choices[0];
            if (await (0, prompt_1.askConfirmation)(`Would you like to add ${name} now?`, true, false)) {
                return value;
            }
            return null;
        }
        // Multiple choice
        return (0, prompt_1.askQuestion)(`Would you like to add a package with "${this.getArchitectTarget()}" capabilities now?`, [
            {
                name: 'No',
                value: null,
            },
            ...choices,
        ], 0, null);
    }
}
exports.ArchitectBaseCommandModule = ArchitectBaseCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWJhc2UtY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2FyY2hpdGVjdC1iYXNlLWNvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILHlEQUE4RDtBQUM5RCx5REFHd0M7QUFDeEMsK0NBQTRDO0FBQzVDLGlEQUEwQztBQUMxQywyQkFBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHNEQUF1RTtBQUN2RSw4Q0FBbUQ7QUFDbkQsZ0RBQW1FO0FBQ25FLDBDQUF5QztBQUN6QyxxREFNMEI7QUFDMUIseURBQTJFO0FBTzNFLE1BQXNCLDBCQUNwQixTQUFRLDhCQUFnQjtJQUQxQjs7UUFJVyxVQUFLLEdBQUcsNkJBQVksQ0FBQyxFQUFFLENBQUM7UUFDZCwwQkFBcUIsR0FBRyxLQUFLLENBQUM7SUFzTW5ELENBQUM7SUFuTVcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFjLEVBQUUsT0FBcUI7UUFDbkUsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUVwRCxJQUFJLFdBQW1CLENBQUM7UUFDeEIsSUFBSTtZQUNGLFdBQVcsR0FBRyxNQUFNLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNuRTtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsSUFBQSxxQkFBYSxFQUFDLENBQUMsQ0FBQyxDQUFDO1lBRWpCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDeEM7UUFFRCxNQUFNLElBQUksQ0FBQyxlQUFlLENBQ3hCO1lBQ0UsR0FBRyxDQUFDLE1BQU0sYUFBYSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3BELEdBQUcs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QUFnQyxDQUM1QyxPQUE4QjtRQUU5QixJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3hCLGdCQUFnQjtZQUNoQixNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQyxJQUFJLE1BQU0sSUFBQSx3QkFBZSxFQUFDLHlCQUF5QixJQUFJLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQzVFLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFFRCxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsa0JBQWtCO1FBQ2xCLE9BQU8sSUFBQSxvQkFBVyxFQUNoQix5Q0FBeUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLHFCQUFxQixFQUN2RjtZQUNFO2dCQUNFLElBQUksRUFBRSxJQUFJO2dCQUNWLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxHQUFHLE9BQU87U0FDWCxFQUNELENBQUMsRUFDRCxJQUFJLENBQ0wsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTNNRCxnRUEyTUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQXJjaGl0ZWN0LCBUYXJnZXQgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7XG4gIE5vZGVNb2R1bGVzQnVpbGRlckluZm8sXG4gIFdvcmtzcGFjZU5vZGVNb2R1bGVzQXJjaGl0ZWN0SG9zdCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdC9ub2RlJztcbmltcG9ydCB7IGpzb24gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBzcGF3blN5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyB9IGZyb20gJy4uL2FuYWx5dGljcy9hbmFseXRpY3MnO1xuaW1wb3J0IHsgYXNzZXJ0SXNFcnJvciB9IGZyb20gJy4uL3V0aWxpdGllcy9lcnJvcic7XG5pbXBvcnQgeyBhc2tDb25maXJtYXRpb24sIGFza1F1ZXN0aW9uIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3Byb21wdCc7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4uL3V0aWxpdGllcy90dHknO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUVycm9yLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIENvbW1hbmRTY29wZSxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IE9wdGlvbiwgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1pc3NpbmdUYXJnZXRDaG9pY2Uge1xuICBuYW1lOiBzdHJpbmc7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBcmNoaXRlY3RCYXNlQ29tbWFuZE1vZHVsZTxUIGV4dGVuZHMgb2JqZWN0PlxuICBleHRlbmRzIENvbW1hbmRNb2R1bGU8VD5cbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248VD5cbntcbiAgb3ZlcnJpZGUgc2NvcGUgPSBDb21tYW5kU2NvcGUuSW47XG4gIHByb3RlY3RlZCBvdmVycmlkZSBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSBmYWxzZTtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IG1pc3NpbmdUYXJnZXRDaG9pY2VzOiBNaXNzaW5nVGFyZ2V0Q2hvaWNlW10gfCB1bmRlZmluZWQ7XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1blNpbmdsZVRhcmdldCh0YXJnZXQ6IFRhcmdldCwgb3B0aW9uczogT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBhcmNoaXRlY3RIb3N0ID0gYXdhaXQgdGhpcy5nZXRBcmNoaXRlY3RIb3N0KCk7XG5cbiAgICBsZXQgYnVpbGRlck5hbWU6IHN0cmluZztcbiAgICB0cnkge1xuICAgICAgYnVpbGRlck5hbWUgPSBhd2FpdCBhcmNoaXRlY3RIb3N0LmdldEJ1aWxkZXJOYW1lRm9yVGFyZ2V0KHRhcmdldCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcblxuICAgICAgcmV0dXJuIHRoaXMub25NaXNzaW5nVGFyZ2V0KGUubWVzc2FnZSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5yZXBvcnRBbmFseXRpY3MoXG4gICAgICB7XG4gICAgICAgIC4uLihhd2FpdCBhcmNoaXRlY3RIb3N0LmdldE9wdGlvbnNGb3JUYXJnZXQodGFyZ2V0KSksXG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICB9LFxuICAgICAgdW5kZWZpbmVkIC8qKiBwYXRocyAqLyxcbiAgICAgIHVuZGVmaW5lZCAvKiogZGltZW5zaW9ucyAqLyxcbiAgICAgIGJ1aWxkZXJOYW1lLFxuICAgICk7XG5cbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgY29uc3QgcnVuID0gYXdhaXQgdGhpcy5nZXRBcmNoaXRlY3QoKS5zY2hlZHVsZVRhcmdldCh0YXJnZXQsIG9wdGlvbnMgYXMganNvbi5Kc29uT2JqZWN0LCB7XG4gICAgICBsb2dnZXIsXG4gICAgICBhbmFseXRpY3M6IGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzKGJ1aWxkZXJOYW1lKSA/IGF3YWl0IHRoaXMuZ2V0QW5hbHl0aWNzKCkgOiB1bmRlZmluZWQsXG4gICAgfSk7XG5cbiAgICBjb25zdCB7IGVycm9yLCBzdWNjZXNzIH0gPSBhd2FpdCBydW4ub3V0cHV0LnRvUHJvbWlzZSgpO1xuICAgIGF3YWl0IHJ1bi5zdG9wKCk7XG5cbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihlcnJvcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1Y2Nlc3MgPyAwIDogMTtcbiAgfVxuXG4gIHByaXZhdGUgX2FyY2hpdGVjdEhvc3Q6IFdvcmtzcGFjZU5vZGVNb2R1bGVzQXJjaGl0ZWN0SG9zdCB8IHVuZGVmaW5lZDtcbiAgcHJvdGVjdGVkIGdldEFyY2hpdGVjdEhvc3QoKTogV29ya3NwYWNlTm9kZU1vZHVsZXNBcmNoaXRlY3RIb3N0IHtcbiAgICBpZiAodGhpcy5fYXJjaGl0ZWN0SG9zdCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FyY2hpdGVjdEhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gdGhpcy5nZXRXb3Jrc3BhY2VPclRocm93KCk7XG5cbiAgICByZXR1cm4gKHRoaXMuX2FyY2hpdGVjdEhvc3QgPSBuZXcgV29ya3NwYWNlTm9kZU1vZHVsZXNBcmNoaXRlY3RIb3N0KFxuICAgICAgd29ya3NwYWNlLFxuICAgICAgd29ya3NwYWNlLmJhc2VQYXRoLFxuICAgICkpO1xuICB9XG5cbiAgcHJpdmF0ZSBfYXJjaGl0ZWN0OiBBcmNoaXRlY3QgfCB1bmRlZmluZWQ7XG4gIHByb3RlY3RlZCBnZXRBcmNoaXRlY3QoKTogQXJjaGl0ZWN0IHtcbiAgICBpZiAodGhpcy5fYXJjaGl0ZWN0KSB7XG4gICAgICByZXR1cm4gdGhpcy5fYXJjaGl0ZWN0O1xuICAgIH1cblxuICAgIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IGpzb24uc2NoZW1hLkNvcmVTY2hlbWFSZWdpc3RyeSgpO1xuICAgIHJlZ2lzdHJ5LmFkZFBvc3RUcmFuc2Zvcm0oanNvbi5zY2hlbWEudHJhbnNmb3Jtcy5hZGRVbmRlZmluZWREZWZhdWx0cyk7XG4gICAgcmVnaXN0cnkudXNlWERlcHJlY2F0ZWRQcm92aWRlcigobXNnKSA9PiB0aGlzLmNvbnRleHQubG9nZ2VyLndhcm4obXNnKSk7XG5cbiAgICBjb25zdCBhcmNoaXRlY3RIb3N0ID0gdGhpcy5nZXRBcmNoaXRlY3RIb3N0KCk7XG5cbiAgICByZXR1cm4gKHRoaXMuX2FyY2hpdGVjdCA9IG5ldyBBcmNoaXRlY3QoYXJjaGl0ZWN0SG9zdCwgcmVnaXN0cnkpKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXRBcmNoaXRlY3RUYXJnZXRPcHRpb25zKHRhcmdldDogVGFyZ2V0KTogUHJvbWlzZTxPcHRpb25bXT4ge1xuICAgIGNvbnN0IGFyY2hpdGVjdEhvc3QgPSB0aGlzLmdldEFyY2hpdGVjdEhvc3QoKTtcbiAgICBsZXQgYnVpbGRlckNvbmY6IHN0cmluZztcblxuICAgIHRyeSB7XG4gICAgICBidWlsZGVyQ29uZiA9IGF3YWl0IGFyY2hpdGVjdEhvc3QuZ2V0QnVpbGRlck5hbWVGb3JUYXJnZXQodGFyZ2V0KTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBsZXQgYnVpbGRlckRlc2M6IE5vZGVNb2R1bGVzQnVpbGRlckluZm87XG4gICAgdHJ5IHtcbiAgICAgIGJ1aWxkZXJEZXNjID0gYXdhaXQgYXJjaGl0ZWN0SG9zdC5yZXNvbHZlQnVpbGRlcihidWlsZGVyQ29uZik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICB0aGlzLndhcm5Pbk1pc3NpbmdOb2RlTW9kdWxlcygpO1xuICAgICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKGBDb3VsZCBub3QgZmluZCB0aGUgJyR7YnVpbGRlckNvbmZ9JyBidWlsZGVyJ3Mgbm9kZSBwYWNrYWdlLmApO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMoXG4gICAgICBuZXcganNvbi5zY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KCksXG4gICAgICBidWlsZGVyRGVzYy5vcHRpb25TY2hlbWEgYXMganNvbi5Kc29uT2JqZWN0LFxuICAgICAgdHJ1ZSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSB3YXJuT25NaXNzaW5nTm9kZU1vZHVsZXMoKTogdm9pZCB7XG4gICAgY29uc3QgYmFzZVBhdGggPSB0aGlzLmNvbnRleHQud29ya3NwYWNlPy5iYXNlUGF0aDtcbiAgICBpZiAoIWJhc2VQYXRoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGEgYG5vZGVfbW9kdWxlc2AgZGlyZWN0b3J5IChucG0sIHlhcm4gbm9uLVBuUCwgZXRjLilcbiAgICBpZiAoZXhpc3RzU3luYyhyZXNvbHZlKGJhc2VQYXRoLCAnbm9kZV9tb2R1bGVzJykpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIHlhcm4gUG5QIGZpbGVzXG4gICAgaWYgKFxuICAgICAgZXhpc3RzU3luYyhyZXNvbHZlKGJhc2VQYXRoLCAnLnBucC5qcycpKSB8fFxuICAgICAgZXhpc3RzU3luYyhyZXNvbHZlKGJhc2VQYXRoLCAnLnBucC5janMnKSkgfHxcbiAgICAgIGV4aXN0c1N5bmMocmVzb2x2ZShiYXNlUGF0aCwgJy5wbnAubWpzJykpXG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5jb250ZXh0LmxvZ2dlci53YXJuKFxuICAgICAgYE5vZGUgcGFja2FnZXMgbWF5IG5vdCBiZSBpbnN0YWxsZWQuIFRyeSBpbnN0YWxsaW5nIHdpdGggJyR7dGhpcy5jb250ZXh0LnBhY2thZ2VNYW5hZ2VyLm5hbWV9IGluc3RhbGwnLmAsXG4gICAgKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXRBcmNoaXRlY3RUYXJnZXQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kTmFtZTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBvbk1pc3NpbmdUYXJnZXQoZGVmYXVsdE1lc3NhZ2U6IHN0cmluZyk6IFByb21pc2U8MT4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgY2hvaWNlcyA9IHRoaXMubWlzc2luZ1RhcmdldENob2ljZXM7XG5cbiAgICBpZiAoIWNob2ljZXM/Lmxlbmd0aCkge1xuICAgICAgbG9nZ2VyLmVycm9yKGRlZmF1bHRNZXNzYWdlKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgY29uc3QgbWlzc2luZ1RhcmdldE1lc3NhZ2UgPVxuICAgICAgYENhbm5vdCBmaW5kIFwiJHt0aGlzLmdldEFyY2hpdGVjdFRhcmdldCgpfVwiIHRhcmdldCBmb3IgdGhlIHNwZWNpZmllZCBwcm9qZWN0LlxcbmAgK1xuICAgICAgYFlvdSBjYW4gYWRkIGEgcGFja2FnZSB0aGF0IGltcGxlbWVudHMgdGhlc2UgY2FwYWJpbGl0aWVzLlxcblxcbmAgK1xuICAgICAgYEZvciBleGFtcGxlOlxcbmAgK1xuICAgICAgY2hvaWNlcy5tYXAoKHsgbmFtZSwgdmFsdWUgfSkgPT4gYCAgJHtuYW1lfTogbmcgYWRkICR7dmFsdWV9YCkuam9pbignXFxuJykgK1xuICAgICAgJ1xcbic7XG5cbiAgICBpZiAoaXNUVFkoKSkge1xuICAgICAgLy8gVXNlIHByb21wdHMgdG8gYXNrIHRoZSB1c2VyIGlmIHRoZXknZCBsaWtlIHRvIGluc3RhbGwgYSBwYWNrYWdlLlxuICAgICAgbG9nZ2VyLndhcm4obWlzc2luZ1RhcmdldE1lc3NhZ2UpO1xuXG4gICAgICBjb25zdCBwYWNrYWdlVG9JbnN0YWxsID0gYXdhaXQgdGhpcy5nZXRNaXNzaW5nVGFyZ2V0UGFja2FnZVRvSW5zdGFsbChjaG9pY2VzKTtcbiAgICAgIGlmIChwYWNrYWdlVG9JbnN0YWxsKSB7XG4gICAgICAgIC8vIEV4YW1wbGUgcnVuOiBgbmcgYWRkIEBhbmd1bGFyLWVzbGludC9zY2hlbWF0aWNzYC5cbiAgICAgICAgY29uc3QgYmluUGF0aCA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vYmluL25nLmpzJyk7XG4gICAgICAgIGNvbnN0IHsgZXJyb3IgfSA9IHNwYXduU3luYyhwcm9jZXNzLmV4ZWNQYXRoLCBbYmluUGF0aCwgJ2FkZCcsIHBhY2thZ2VUb0luc3RhbGxdLCB7XG4gICAgICAgICAgc3RkaW86ICdpbmhlcml0JyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm9uIFRUWSBkaXNwbGF5IGVycm9yIG1lc3NhZ2UuXG4gICAgICBsb2dnZXIuZXJyb3IobWlzc2luZ1RhcmdldE1lc3NhZ2UpO1xuICAgIH1cblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRNaXNzaW5nVGFyZ2V0UGFja2FnZVRvSW5zdGFsbChcbiAgICBjaG9pY2VzOiBNaXNzaW5nVGFyZ2V0Q2hvaWNlW10sXG4gICk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICAgIGlmIChjaG9pY2VzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgLy8gU2luZ2xlIGNob2ljZVxuICAgICAgY29uc3QgeyBuYW1lLCB2YWx1ZSB9ID0gY2hvaWNlc1swXTtcbiAgICAgIGlmIChhd2FpdCBhc2tDb25maXJtYXRpb24oYFdvdWxkIHlvdSBsaWtlIHRvIGFkZCAke25hbWV9IG5vdz9gLCB0cnVlLCBmYWxzZSkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBNdWx0aXBsZSBjaG9pY2VcbiAgICByZXR1cm4gYXNrUXVlc3Rpb24oXG4gICAgICBgV291bGQgeW91IGxpa2UgdG8gYWRkIGEgcGFja2FnZSB3aXRoIFwiJHt0aGlzLmdldEFyY2hpdGVjdFRhcmdldCgpfVwiIGNhcGFiaWxpdGllcyBub3c/YCxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6ICdObycsXG4gICAgICAgICAgdmFsdWU6IG51bGwsXG4gICAgICAgIH0sXG4gICAgICAgIC4uLmNob2ljZXMsXG4gICAgICBdLFxuICAgICAgMCxcbiAgICAgIG51bGwsXG4gICAgKTtcbiAgfVxufVxuIl19