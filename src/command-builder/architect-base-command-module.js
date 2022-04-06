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
const prompt_1 = require("../utilities/prompt");
const tty_1 = require("../utilities/tty");
const command_module_1 = require("./command-module");
const json_schema_1 = require("./utilities/json-schema");
class ArchitectBaseCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.shouldReportAnalytics = false;
    }
    async runSingleTarget(target, options) {
        const architectHost = await this.getArchitectHost();
        let builderName;
        try {
            builderName = await architectHost.getBuilderNameForTarget(target);
        }
        catch (e) {
            return this.onMissingTarget(e.message);
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
ArchitectBaseCommandModule.scope = command_module_1.CommandScope.In;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWJhc2UtY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2FyY2hpdGVjdC1iYXNlLWNvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILHlEQUE4RDtBQUM5RCx5REFBbUY7QUFDbkYsK0NBQTRDO0FBQzVDLGlEQUEwQztBQUMxQywyQkFBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHNEQUF1RTtBQUN2RSxnREFBbUU7QUFDbkUsMENBQXlDO0FBQ3pDLHFEQU0wQjtBQUMxQix5REFBMkU7QUFPM0UsTUFBc0IsMEJBQ3BCLFNBQVEsOEJBQWdCO0lBRDFCOztRQUtxQiwwQkFBcUIsR0FBRyxLQUFLLENBQUM7SUF3TG5ELENBQUM7SUFyTFcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFjLEVBQUUsT0FBcUI7UUFDbkUsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUVwRCxJQUFJLFdBQW1CLENBQUM7UUFDeEIsSUFBSTtZQUNGLFdBQVcsR0FBRyxNQUFNLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNuRTtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUN4QztRQUVELE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUN6QixHQUFHLENBQUMsTUFBTSxhQUFhLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEQsR0FBRyxPQUFPO1NBQ1gsQ0FBQyxDQUFDO1FBRUgsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFFaEMsTUFBTSxHQUFH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QUFJLENBQUM7U0FDYjtRQUVELGtCQUFrQjtRQUNsQixPQUFPLElBQUEsb0JBQVcsRUFDaEIseUNBQXlDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsRUFDdkY7WUFDRTtnQkFDRSxJQUFJLEVBQUUsSUFBSTtnQkFDVixLQUFLLEVBQUUsSUFBSTthQUNaO1lBQ0QsR0FBRyxPQUFPO1NBQ1gsRUFDRCxDQUFDLEVBQ0QsSUFBSSxDQUNMLENBQUM7SUFDSixDQUFDOztBQTVMSCxnRUE2TEM7QUF6TGlCLGdDQUFLLEdBQUcsNkJBQVksQ0FBQyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQXJjaGl0ZWN0LCBUYXJnZXQgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IFdvcmtzcGFjZU5vZGVNb2R1bGVzQXJjaGl0ZWN0SG9zdCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3Qvbm9kZSc7XG5pbXBvcnQgeyBqc29uIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgc3Bhd25TeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MgfSBmcm9tICcuLi9hbmFseXRpY3MvYW5hbHl0aWNzJztcbmltcG9ydCB7IGFza0NvbmZpcm1hdGlvbiwgYXNrUXVlc3Rpb24gfSBmcm9tICcuLi91dGlsaXRpZXMvcHJvbXB0JztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3R0eSc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kTW9kdWxlRXJyb3IsXG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgQ29tbWFuZFNjb3BlLFxuICBPdGhlck9wdGlvbnMsXG59IGZyb20gJy4vY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgT3B0aW9uLCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMgfSBmcm9tICcuL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWlzc2luZ1RhcmdldENob2ljZSB7XG4gIG5hbWU6IHN0cmluZztcbiAgdmFsdWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFyY2hpdGVjdEJhc2VDb21tYW5kTW9kdWxlPFQ+XG4gIGV4dGVuZHMgQ29tbWFuZE1vZHVsZTxUPlxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxUPlxue1xuICBzdGF0aWMgb3ZlcnJpZGUgc2NvcGUgPSBDb21tYW5kU2NvcGUuSW47XG4gIHByb3RlY3RlZCBvdmVycmlkZSBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSBmYWxzZTtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IG1pc3NpbmdUYXJnZXRDaG9pY2VzOiBNaXNzaW5nVGFyZ2V0Q2hvaWNlW10gfCB1bmRlZmluZWQ7XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1blNpbmdsZVRhcmdldCh0YXJnZXQ6IFRhcmdldCwgb3B0aW9uczogT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBhcmNoaXRlY3RIb3N0ID0gYXdhaXQgdGhpcy5nZXRBcmNoaXRlY3RIb3N0KCk7XG5cbiAgICBsZXQgYnVpbGRlck5hbWU6IHN0cmluZztcbiAgICB0cnkge1xuICAgICAgYnVpbGRlck5hbWUgPSBhd2FpdCBhcmNoaXRlY3RIb3N0LmdldEJ1aWxkZXJOYW1lRm9yVGFyZ2V0KHRhcmdldCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIHRoaXMub25NaXNzaW5nVGFyZ2V0KGUubWVzc2FnZSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5yZXBvcnRBbmFseXRpY3Moe1xuICAgICAgLi4uKGF3YWl0IGFyY2hpdGVjdEhvc3QuZ2V0T3B0aW9uc0ZvclRhcmdldCh0YXJnZXQpKSxcbiAgICAgIC4uLm9wdGlvbnMsXG4gICAgfSk7XG5cbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgY29uc3QgcnVuID0gYXdhaXQgdGhpcy5nZXRBcmNoaXRlY3QoKS5zY2hlZHVsZVRhcmdldCh0YXJnZXQsIG9wdGlvbnMgYXMganNvbi5Kc29uT2JqZWN0LCB7XG4gICAgICBsb2dnZXIsXG4gICAgICBhbmFseXRpY3M6IGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzKGJ1aWxkZXJOYW1lKSA/IGF3YWl0IHRoaXMuZ2V0QW5hbHl0aWNzKCkgOiB1bmRlZmluZWQsXG4gICAgfSk7XG5cbiAgICBjb25zdCB7IGVycm9yLCBzdWNjZXNzIH0gPSBhd2FpdCBydW4ub3V0cHV0LnRvUHJvbWlzZSgpO1xuICAgIGF3YWl0IHJ1bi5zdG9wKCk7XG5cbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihlcnJvcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1Y2Nlc3MgPyAwIDogMTtcbiAgfVxuXG4gIHByaXZhdGUgX2FyY2hpdGVjdEhvc3Q6IFdvcmtzcGFjZU5vZGVNb2R1bGVzQXJjaGl0ZWN0SG9zdCB8IHVuZGVmaW5lZDtcbiAgcHJvdGVjdGVkIGdldEFyY2hpdGVjdEhvc3QoKTogV29ya3NwYWNlTm9kZU1vZHVsZXNBcmNoaXRlY3RIb3N0IHtcbiAgICBpZiAodGhpcy5fYXJjaGl0ZWN0SG9zdCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FyY2hpdGVjdEhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gdGhpcy5nZXRXb3Jrc3BhY2VPclRocm93KCk7XG5cbiAgICByZXR1cm4gKHRoaXMuX2FyY2hpdGVjdEhvc3QgPSBuZXcgV29ya3NwYWNlTm9kZU1vZHVsZXNBcmNoaXRlY3RIb3N0KFxuICAgICAgd29ya3NwYWNlLFxuICAgICAgd29ya3NwYWNlLmJhc2VQYXRoLFxuICAgICkpO1xuICB9XG5cbiAgcHJpdmF0ZSBfYXJjaGl0ZWN0OiBBcmNoaXRlY3QgfCB1bmRlZmluZWQ7XG4gIHByb3RlY3RlZCBnZXRBcmNoaXRlY3QoKTogQXJjaGl0ZWN0IHtcbiAgICBpZiAodGhpcy5fYXJjaGl0ZWN0KSB7XG4gICAgICByZXR1cm4gdGhpcy5fYXJjaGl0ZWN0O1xuICAgIH1cblxuICAgIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IGpzb24uc2NoZW1hLkNvcmVTY2hlbWFSZWdpc3RyeSgpO1xuICAgIHJlZ2lzdHJ5LmFkZFBvc3RUcmFuc2Zvcm0oanNvbi5zY2hlbWEudHJhbnNmb3Jtcy5hZGRVbmRlZmluZWREZWZhdWx0cyk7XG4gICAgcmVnaXN0cnkudXNlWERlcHJlY2F0ZWRQcm92aWRlcigobXNnKSA9PiB0aGlzLmNvbnRleHQubG9nZ2VyLndhcm4obXNnKSk7XG5cbiAgICBjb25zdCBhcmNoaXRlY3RIb3N0ID0gdGhpcy5nZXRBcmNoaXRlY3RIb3N0KCk7XG5cbiAgICByZXR1cm4gKHRoaXMuX2FyY2hpdGVjdCA9IG5ldyBBcmNoaXRlY3QoYXJjaGl0ZWN0SG9zdCwgcmVnaXN0cnkpKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXRBcmNoaXRlY3RUYXJnZXRPcHRpb25zKHRhcmdldDogVGFyZ2V0KTogUHJvbWlzZTxPcHRpb25bXT4ge1xuICAgIGNvbnN0IGFyY2hpdGVjdEhvc3QgPSB0aGlzLmdldEFyY2hpdGVjdEhvc3QoKTtcbiAgICBjb25zdCBidWlsZGVyQ29uZiA9IGF3YWl0IGFyY2hpdGVjdEhvc3QuZ2V0QnVpbGRlck5hbWVGb3JUYXJnZXQodGFyZ2V0KTtcblxuICAgIGxldCBidWlsZGVyRGVzYztcbiAgICB0cnkge1xuICAgICAgYnVpbGRlckRlc2MgPSBhd2FpdCBhcmNoaXRlY3RIb3N0LnJlc29sdmVCdWlsZGVyKGJ1aWxkZXJDb25mKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgdGhpcy53YXJuT25NaXNzaW5nTm9kZU1vZHVsZXMoKTtcbiAgICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihgQ291bGQgbm90IGZpbmQgdGhlICcke2J1aWxkZXJDb25mfScgYnVpbGRlcidzIG5vZGUgcGFja2FnZS5gKTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKFxuICAgICAgbmV3IGpzb24uc2NoZW1hLkNvcmVTY2hlbWFSZWdpc3RyeSgpLFxuICAgICAgYnVpbGRlckRlc2Mub3B0aW9uU2NoZW1hIGFzIGpzb24uSnNvbk9iamVjdCxcbiAgICAgIHRydWUsXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgd2Fybk9uTWlzc2luZ05vZGVNb2R1bGVzKCk6IHZvaWQge1xuICAgIGNvbnN0IGJhc2VQYXRoID0gdGhpcy5jb250ZXh0LndvcmtzcGFjZT8uYmFzZVBhdGg7XG4gICAgaWYgKCFiYXNlUGF0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBhIGBub2RlX21vZHVsZXNgIGRpcmVjdG9yeSAobnBtLCB5YXJuIG5vbi1QblAsIGV0Yy4pXG4gICAgaWYgKGV4aXN0c1N5bmMocmVzb2x2ZShiYXNlUGF0aCwgJ25vZGVfbW9kdWxlcycpKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciB5YXJuIFBuUCBmaWxlc1xuICAgIGlmIChcbiAgICAgIGV4aXN0c1N5bmMocmVzb2x2ZShiYXNlUGF0aCwgJy5wbnAuanMnKSkgfHxcbiAgICAgIGV4aXN0c1N5bmMocmVzb2x2ZShiYXNlUGF0aCwgJy5wbnAuY2pzJykpIHx8XG4gICAgICBleGlzdHNTeW5jKHJlc29sdmUoYmFzZVBhdGgsICcucG5wLm1qcycpKVxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2FybihcbiAgICAgIGBOb2RlIHBhY2thZ2VzIG1heSBub3QgYmUgaW5zdGFsbGVkLiBUcnkgaW5zdGFsbGluZyB3aXRoICcke3RoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlcn0gaW5zdGFsbCcuYCxcbiAgICApO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldEFyY2hpdGVjdFRhcmdldCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmNvbW1hbmROYW1lO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIG9uTWlzc2luZ1RhcmdldChkZWZhdWx0TWVzc2FnZTogc3RyaW5nKTogUHJvbWlzZTwxPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCBjaG9pY2VzID0gdGhpcy5taXNzaW5nVGFyZ2V0Q2hvaWNlcztcblxuICAgIGlmICghY2hvaWNlcz8ubGVuZ3RoKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoZGVmYXVsdE1lc3NhZ2UpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBjb25zdCBtaXNzaW5nVGFyZ2V0TWVzc2FnZSA9XG4gICAgICBgQ2Fubm90IGZpbmQgXCIke3RoaXMuZ2V0QXJjaGl0ZWN0VGFyZ2V0KCl9XCIgdGFyZ2V0IGZvciB0aGUgc3BlY2lmaWVkIHByb2plY3QuXFxuYCArXG4gICAgICBgWW91IGNhbiBhZGQgYSBwYWNrYWdlIHRoYXQgaW1wbGVtZW50cyB0aGVzZSBjYXBhYmlsaXRpZXMuXFxuXFxuYCArXG4gICAgICBgRm9yIGV4YW1wbGU6XFxuYCArXG4gICAgICBjaG9pY2VzLm1hcCgoeyBuYW1lLCB2YWx1ZSB9KSA9PiBgICAke25hbWV9OiBuZyBhZGQgJHt2YWx1ZX1gKS5qb2luKCdcXG4nKSArXG4gICAgICAnXFxuJztcblxuICAgIGlmIChpc1RUWSgpKSB7XG4gICAgICAvLyBVc2UgcHJvbXB0cyB0byBhc2sgdGhlIHVzZXIgaWYgdGhleSdkIGxpa2UgdG8gaW5zdGFsbCBhIHBhY2thZ2UuXG4gICAgICBsb2dnZXIud2FybihtaXNzaW5nVGFyZ2V0TWVzc2FnZSk7XG5cbiAgICAgIGNvbnN0IHBhY2thZ2VUb0luc3RhbGwgPSBhd2FpdCB0aGlzLmdldE1pc3NpbmdUYXJnZXRQYWNrYWdlVG9JbnN0YWxsKGNob2ljZXMpO1xuICAgICAgaWYgKHBhY2thZ2VUb0luc3RhbGwpIHtcbiAgICAgICAgLy8gRXhhbXBsZSBydW46IGBuZyBhZGQgQGFuZ3VsYXItZXNsaW50L3NjaGVtYXRpY3NgLlxuICAgICAgICBjb25zdCBiaW5QYXRoID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9iaW4vbmcuanMnKTtcbiAgICAgICAgY29uc3QgeyBlcnJvciB9ID0gc3Bhd25TeW5jKHByb2Nlc3MuZXhlY1BhdGgsIFtiaW5QYXRoLCAnYWRkJywgcGFja2FnZVRvSW5zdGFsbF0sIHtcbiAgICAgICAgICBzdGRpbzogJ2luaGVyaXQnLFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBOb24gVFRZIGRpc3BsYXkgZXJyb3IgbWVzc2FnZS5cbiAgICAgIGxvZ2dlci5lcnJvcihtaXNzaW5nVGFyZ2V0TWVzc2FnZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldE1pc3NpbmdUYXJnZXRQYWNrYWdlVG9JbnN0YWxsKFxuICAgIGNob2ljZXM6IE1pc3NpbmdUYXJnZXRDaG9pY2VbXSxcbiAgKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgaWYgKGNob2ljZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAvLyBTaW5nbGUgY2hvaWNlXG4gICAgICBjb25zdCB7IG5hbWUsIHZhbHVlIH0gPSBjaG9pY2VzWzBdO1xuICAgICAgaWYgKGF3YWl0IGFza0NvbmZpcm1hdGlvbihgV291bGQgeW91IGxpa2UgdG8gYWRkICR7bmFtZX0gbm93P2AsIHRydWUsIGZhbHNlKSkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIE11bHRpcGxlIGNob2ljZVxuICAgIHJldHVybiBhc2tRdWVzdGlvbihcbiAgICAgIGBXb3VsZCB5b3UgbGlrZSB0byBhZGQgYSBwYWNrYWdlIHdpdGggXCIke3RoaXMuZ2V0QXJjaGl0ZWN0VGFyZ2V0KCl9XCIgY2FwYWJpbGl0aWVzIG5vdz9gLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ05vJyxcbiAgICAgICAgICB2YWx1ZTogbnVsbCxcbiAgICAgICAgfSxcbiAgICAgICAgLi4uY2hvaWNlcyxcbiAgICAgIF0sXG4gICAgICAwLFxuICAgICAgbnVsbCxcbiAgICApO1xuICB9XG59XG4iXX0=