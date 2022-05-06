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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWJhc2UtY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2FyY2hpdGVjdC1iYXNlLWNvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILHlEQUE4RDtBQUM5RCx5REFHd0M7QUFDeEMsK0NBQTRDO0FBQzVDLGlEQUEwQztBQUMxQywyQkFBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHNEQUF1RTtBQUN2RSxnREFBbUU7QUFDbkUsMENBQXlDO0FBQ3pDLHFEQU0wQjtBQUMxQix5REFBMkU7QUFPM0UsTUFBc0IsMEJBQ3BCLFNBQVEsOEJBQWdCO0lBRDFCOztRQUtxQiwwQkFBcUIsR0FBRyxLQUFLLENBQUM7SUE4TG5ELENBQUM7SUEzTFcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFjLEVBQUUsT0FBcUI7UUFDbkUsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUVwRCxJQUFJLFdBQW1CLENBQUM7UUFDeEIsSUFBSTtZQUNGLFdBQVcsR0FBRyxNQUFNLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNuRTtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUN4QztRQUVELE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUN6QixHQUFHLENBQUMsTUFBTSxhQUFhLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEQsR0FBRyxPQUFPO1NBQ1gsQ0FBQyxDQUFDO1FBRUgsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFFaEMsTUFBTSxHQUFH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RUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQzVFLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFFRCxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsa0JBQWtCO1FBQ2xCLE9BQU8sSUFBQSxvQkFBVyxFQUNoQix5Q0FBeUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLHFCQUFxQixFQUN2RjtZQUNFO2dCQUNFLElBQUksRUFBRSxJQUFJO2dCQUNWLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxHQUFHLE9BQU87U0FDWCxFQUNELENBQUMsRUFDRCxJQUFJLENBQ0wsQ0FBQztJQUNKLENBQUM7O0FBbE1ILGdFQW1NQztBQS9MaUIsZ0NBQUssR0FBRyw2QkFBWSxDQUFDLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBBcmNoaXRlY3QsIFRhcmdldCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHtcbiAgTm9kZU1vZHVsZXNCdWlsZGVySW5mbyxcbiAgV29ya3NwYWNlTm9kZU1vZHVsZXNBcmNoaXRlY3RIb3N0LFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0L25vZGUnO1xuaW1wb3J0IHsganNvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHNwYXduU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzIH0gZnJvbSAnLi4vYW5hbHl0aWNzL2FuYWx5dGljcyc7XG5pbXBvcnQgeyBhc2tDb25maXJtYXRpb24sIGFza1F1ZXN0aW9uIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3Byb21wdCc7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4uL3V0aWxpdGllcy90dHknO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUVycm9yLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIENvbW1hbmRTY29wZSxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IE9wdGlvbiwgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1pc3NpbmdUYXJnZXRDaG9pY2Uge1xuICBuYW1lOiBzdHJpbmc7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBcmNoaXRlY3RCYXNlQ29tbWFuZE1vZHVsZTxUIGV4dGVuZHMgb2JqZWN0PlxuICBleHRlbmRzIENvbW1hbmRNb2R1bGU8VD5cbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248VD5cbntcbiAgc3RhdGljIG92ZXJyaWRlIHNjb3BlID0gQ29tbWFuZFNjb3BlLkluO1xuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgc2hvdWxkUmVwb3J0QW5hbHl0aWNzID0gZmFsc2U7XG4gIHByb3RlY3RlZCByZWFkb25seSBtaXNzaW5nVGFyZ2V0Q2hvaWNlczogTWlzc2luZ1RhcmdldENob2ljZVtdIHwgdW5kZWZpbmVkO1xuXG4gIHByb3RlY3RlZCBhc3luYyBydW5TaW5nbGVUYXJnZXQodGFyZ2V0OiBUYXJnZXQsIG9wdGlvbnM6IE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgYXJjaGl0ZWN0SG9zdCA9IGF3YWl0IHRoaXMuZ2V0QXJjaGl0ZWN0SG9zdCgpO1xuXG4gICAgbGV0IGJ1aWxkZXJOYW1lOiBzdHJpbmc7XG4gICAgdHJ5IHtcbiAgICAgIGJ1aWxkZXJOYW1lID0gYXdhaXQgYXJjaGl0ZWN0SG9zdC5nZXRCdWlsZGVyTmFtZUZvclRhcmdldCh0YXJnZXQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiB0aGlzLm9uTWlzc2luZ1RhcmdldChlLm1lc3NhZ2UpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucmVwb3J0QW5hbHl0aWNzKHtcbiAgICAgIC4uLihhd2FpdCBhcmNoaXRlY3RIb3N0LmdldE9wdGlvbnNGb3JUYXJnZXQodGFyZ2V0KSksXG4gICAgICAuLi5vcHRpb25zLFxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcblxuICAgIGNvbnN0IHJ1biA9IGF3YWl0IHRoaXMuZ2V0QXJjaGl0ZWN0KCkuc2NoZWR1bGVUYXJnZXQodGFyZ2V0LCBvcHRpb25zIGFzIGpzb24uSnNvbk9iamVjdCwge1xuICAgICAgbG9nZ2VyLFxuICAgICAgYW5hbHl0aWNzOiBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyhidWlsZGVyTmFtZSkgPyBhd2FpdCB0aGlzLmdldEFuYWx5dGljcygpIDogdW5kZWZpbmVkLFxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBlcnJvciwgc3VjY2VzcyB9ID0gYXdhaXQgcnVuLm91dHB1dC50b1Byb21pc2UoKTtcbiAgICBhd2FpdCBydW4uc3RvcCgpO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoZXJyb3IpO1xuICAgIH1cblxuICAgIHJldHVybiBzdWNjZXNzID8gMCA6IDE7XG4gIH1cblxuICBwcml2YXRlIF9hcmNoaXRlY3RIb3N0OiBXb3Jrc3BhY2VOb2RlTW9kdWxlc0FyY2hpdGVjdEhvc3QgfCB1bmRlZmluZWQ7XG4gIHByb3RlY3RlZCBnZXRBcmNoaXRlY3RIb3N0KCk6IFdvcmtzcGFjZU5vZGVNb2R1bGVzQXJjaGl0ZWN0SG9zdCB7XG4gICAgaWYgKHRoaXMuX2FyY2hpdGVjdEhvc3QpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hcmNoaXRlY3RIb3N0O1xuICAgIH1cblxuICAgIGNvbnN0IHdvcmtzcGFjZSA9IHRoaXMuZ2V0V29ya3NwYWNlT3JUaHJvdygpO1xuXG4gICAgcmV0dXJuICh0aGlzLl9hcmNoaXRlY3RIb3N0ID0gbmV3IFdvcmtzcGFjZU5vZGVNb2R1bGVzQXJjaGl0ZWN0SG9zdChcbiAgICAgIHdvcmtzcGFjZSxcbiAgICAgIHdvcmtzcGFjZS5iYXNlUGF0aCxcbiAgICApKTtcbiAgfVxuXG4gIHByaXZhdGUgX2FyY2hpdGVjdDogQXJjaGl0ZWN0IHwgdW5kZWZpbmVkO1xuICBwcm90ZWN0ZWQgZ2V0QXJjaGl0ZWN0KCk6IEFyY2hpdGVjdCB7XG4gICAgaWYgKHRoaXMuX2FyY2hpdGVjdCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FyY2hpdGVjdDtcbiAgICB9XG5cbiAgICBjb25zdCByZWdpc3RyeSA9IG5ldyBqc29uLnNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoKTtcbiAgICByZWdpc3RyeS5hZGRQb3N0VHJhbnNmb3JtKGpzb24uc2NoZW1hLnRyYW5zZm9ybXMuYWRkVW5kZWZpbmVkRGVmYXVsdHMpO1xuICAgIHJlZ2lzdHJ5LnVzZVhEZXByZWNhdGVkUHJvdmlkZXIoKG1zZykgPT4gdGhpcy5jb250ZXh0LmxvZ2dlci53YXJuKG1zZykpO1xuXG4gICAgY29uc3QgYXJjaGl0ZWN0SG9zdCA9IHRoaXMuZ2V0QXJjaGl0ZWN0SG9zdCgpO1xuXG4gICAgcmV0dXJuICh0aGlzLl9hcmNoaXRlY3QgPSBuZXcgQXJjaGl0ZWN0KGFyY2hpdGVjdEhvc3QsIHJlZ2lzdHJ5KSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0QXJjaGl0ZWN0VGFyZ2V0T3B0aW9ucyh0YXJnZXQ6IFRhcmdldCk6IFByb21pc2U8T3B0aW9uW10+IHtcbiAgICBjb25zdCBhcmNoaXRlY3RIb3N0ID0gdGhpcy5nZXRBcmNoaXRlY3RIb3N0KCk7XG4gICAgbGV0IGJ1aWxkZXJDb25mOiBzdHJpbmc7XG5cbiAgICB0cnkge1xuICAgICAgYnVpbGRlckNvbmYgPSBhd2FpdCBhcmNoaXRlY3RIb3N0LmdldEJ1aWxkZXJOYW1lRm9yVGFyZ2V0KHRhcmdldCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgbGV0IGJ1aWxkZXJEZXNjOiBOb2RlTW9kdWxlc0J1aWxkZXJJbmZvO1xuICAgIHRyeSB7XG4gICAgICBidWlsZGVyRGVzYyA9IGF3YWl0IGFyY2hpdGVjdEhvc3QucmVzb2x2ZUJ1aWxkZXIoYnVpbGRlckNvbmYpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICB0aGlzLndhcm5Pbk1pc3NpbmdOb2RlTW9kdWxlcygpO1xuICAgICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKGBDb3VsZCBub3QgZmluZCB0aGUgJyR7YnVpbGRlckNvbmZ9JyBidWlsZGVyJ3Mgbm9kZSBwYWNrYWdlLmApO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMoXG4gICAgICBuZXcganNvbi5zY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KCksXG4gICAgICBidWlsZGVyRGVzYy5vcHRpb25TY2hlbWEgYXMganNvbi5Kc29uT2JqZWN0LFxuICAgICAgdHJ1ZSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSB3YXJuT25NaXNzaW5nTm9kZU1vZHVsZXMoKTogdm9pZCB7XG4gICAgY29uc3QgYmFzZVBhdGggPSB0aGlzLmNvbnRleHQud29ya3NwYWNlPy5iYXNlUGF0aDtcbiAgICBpZiAoIWJhc2VQYXRoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGEgYG5vZGVfbW9kdWxlc2AgZGlyZWN0b3J5IChucG0sIHlhcm4gbm9uLVBuUCwgZXRjLilcbiAgICBpZiAoZXhpc3RzU3luYyhyZXNvbHZlKGJhc2VQYXRoLCAnbm9kZV9tb2R1bGVzJykpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIHlhcm4gUG5QIGZpbGVzXG4gICAgaWYgKFxuICAgICAgZXhpc3RzU3luYyhyZXNvbHZlKGJhc2VQYXRoLCAnLnBucC5qcycpKSB8fFxuICAgICAgZXhpc3RzU3luYyhyZXNvbHZlKGJhc2VQYXRoLCAnLnBucC5janMnKSkgfHxcbiAgICAgIGV4aXN0c1N5bmMocmVzb2x2ZShiYXNlUGF0aCwgJy5wbnAubWpzJykpXG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5jb250ZXh0LmxvZ2dlci53YXJuKFxuICAgICAgYE5vZGUgcGFja2FnZXMgbWF5IG5vdCBiZSBpbnN0YWxsZWQuIFRyeSBpbnN0YWxsaW5nIHdpdGggJyR7dGhpcy5jb250ZXh0LnBhY2thZ2VNYW5hZ2VyfSBpbnN0YWxsJy5gLFxuICAgICk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0QXJjaGl0ZWN0VGFyZ2V0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZE5hbWU7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgb25NaXNzaW5nVGFyZ2V0KGRlZmF1bHRNZXNzYWdlOiBzdHJpbmcpOiBQcm9taXNlPDE+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IGNob2ljZXMgPSB0aGlzLm1pc3NpbmdUYXJnZXRDaG9pY2VzO1xuXG4gICAgaWYgKCFjaG9pY2VzPy5sZW5ndGgpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihkZWZhdWx0TWVzc2FnZSk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGNvbnN0IG1pc3NpbmdUYXJnZXRNZXNzYWdlID1cbiAgICAgIGBDYW5ub3QgZmluZCBcIiR7dGhpcy5nZXRBcmNoaXRlY3RUYXJnZXQoKX1cIiB0YXJnZXQgZm9yIHRoZSBzcGVjaWZpZWQgcHJvamVjdC5cXG5gICtcbiAgICAgIGBZb3UgY2FuIGFkZCBhIHBhY2thZ2UgdGhhdCBpbXBsZW1lbnRzIHRoZXNlIGNhcGFiaWxpdGllcy5cXG5cXG5gICtcbiAgICAgIGBGb3IgZXhhbXBsZTpcXG5gICtcbiAgICAgIGNob2ljZXMubWFwKCh7IG5hbWUsIHZhbHVlIH0pID0+IGAgICR7bmFtZX06IG5nIGFkZCAke3ZhbHVlfWApLmpvaW4oJ1xcbicpICtcbiAgICAgICdcXG4nO1xuXG4gICAgaWYgKGlzVFRZKCkpIHtcbiAgICAgIC8vIFVzZSBwcm9tcHRzIHRvIGFzayB0aGUgdXNlciBpZiB0aGV5J2QgbGlrZSB0byBpbnN0YWxsIGEgcGFja2FnZS5cbiAgICAgIGxvZ2dlci53YXJuKG1pc3NpbmdUYXJnZXRNZXNzYWdlKTtcblxuICAgICAgY29uc3QgcGFja2FnZVRvSW5zdGFsbCA9IGF3YWl0IHRoaXMuZ2V0TWlzc2luZ1RhcmdldFBhY2thZ2VUb0luc3RhbGwoY2hvaWNlcyk7XG4gICAgICBpZiAocGFja2FnZVRvSW5zdGFsbCkge1xuICAgICAgICAvLyBFeGFtcGxlIHJ1bjogYG5nIGFkZCBAYW5ndWxhci1lc2xpbnQvc2NoZW1hdGljc2AuXG4gICAgICAgIGNvbnN0IGJpblBhdGggPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL2Jpbi9uZy5qcycpO1xuICAgICAgICBjb25zdCB7IGVycm9yIH0gPSBzcGF3blN5bmMocHJvY2Vzcy5leGVjUGF0aCwgW2JpblBhdGgsICdhZGQnLCBwYWNrYWdlVG9JbnN0YWxsXSwge1xuICAgICAgICAgIHN0ZGlvOiAnaW5oZXJpdCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE5vbiBUVFkgZGlzcGxheSBlcnJvciBtZXNzYWdlLlxuICAgICAgbG9nZ2VyLmVycm9yKG1pc3NpbmdUYXJnZXRNZXNzYWdlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2V0TWlzc2luZ1RhcmdldFBhY2thZ2VUb0luc3RhbGwoXG4gICAgY2hvaWNlczogTWlzc2luZ1RhcmdldENob2ljZVtdLFxuICApOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICBpZiAoY2hvaWNlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgIC8vIFNpbmdsZSBjaG9pY2VcbiAgICAgIGNvbnN0IHsgbmFtZSwgdmFsdWUgfSA9IGNob2ljZXNbMF07XG4gICAgICBpZiAoYXdhaXQgYXNrQ29uZmlybWF0aW9uKGBXb3VsZCB5b3UgbGlrZSB0byBhZGQgJHtuYW1lfSBub3c/YCwgdHJ1ZSwgZmFsc2UpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gTXVsdGlwbGUgY2hvaWNlXG4gICAgcmV0dXJuIGFza1F1ZXN0aW9uKFxuICAgICAgYFdvdWxkIHlvdSBsaWtlIHRvIGFkZCBhIHBhY2thZ2Ugd2l0aCBcIiR7dGhpcy5nZXRBcmNoaXRlY3RUYXJnZXQoKX1cIiBjYXBhYmlsaXRpZXMgbm93P2AsXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiAnTm8nLFxuICAgICAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgICB9LFxuICAgICAgICAuLi5jaG9pY2VzLFxuICAgICAgXSxcbiAgICAgIDAsXG4gICAgICBudWxsLFxuICAgICk7XG4gIH1cbn1cbiJdfQ==