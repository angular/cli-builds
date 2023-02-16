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
const analytics_parameters_1 = require("../analytics/analytics-parameters");
const error_1 = require("../utilities/error");
const prompt_1 = require("../utilities/prompt");
const tty_1 = require("../utilities/tty");
const command_module_1 = require("./command-module");
const json_schema_1 = require("./utilities/json-schema");
class ArchitectBaseCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.scope = command_module_1.CommandScope.In;
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
        const { logger } = this.context;
        const run = await this.getArchitect().scheduleTarget(target, options, {
            logger,
        });
        const analytics = (0, analytics_1.isPackageNameSafeForAnalytics)(builderName)
            ? await this.getAnalytics()
            : undefined;
        let outputSubscription;
        if (analytics) {
            analytics.reportArchitectRunEvent({
                [analytics_parameters_1.EventCustomDimension.BuilderTarget]: builderName,
            });
            let firstRun = true;
            outputSubscription = run.output.subscribe(({ stats }) => {
                const parameters = this.builderStatsToAnalyticsParameters(stats, builderName);
                if (!parameters) {
                    return;
                }
                if (firstRun) {
                    firstRun = false;
                    analytics.reportBuildRunEvent(parameters);
                }
                else {
                    analytics.reportRebuildRunEvent(parameters);
                }
            });
        }
        try {
            const { error, success } = await run.lastOutput;
            if (error) {
                logger.error(error);
            }
            return success ? 0 : 1;
        }
        finally {
            await run.stop();
            outputSubscription === null || outputSubscription === void 0 ? void 0 : outputSubscription.unsubscribe();
        }
    }
    builderStatsToAnalyticsParameters(stats, builderName) {
        if (!stats || typeof stats !== 'object' || !('durationInMs' in stats)) {
            return undefined;
        }
        const { optimization, allChunksCount, aot, lazyChunksCount, initialChunksCount, durationInMs, changedChunksCount, cssSizeInBytes, jsSizeInBytes, ngComponentCount, } = stats;
        return {
            [analytics_parameters_1.EventCustomDimension.BuilderTarget]: builderName,
            [analytics_parameters_1.EventCustomDimension.Aot]: aot,
            [analytics_parameters_1.EventCustomDimension.Optimization]: optimization,
            [analytics_parameters_1.EventCustomMetric.AllChunksCount]: allChunksCount,
            [analytics_parameters_1.EventCustomMetric.LazyChunksCount]: lazyChunksCount,
            [analytics_parameters_1.EventCustomMetric.InitialChunksCount]: initialChunksCount,
            [analytics_parameters_1.EventCustomMetric.ChangedChunksCount]: changedChunksCount,
            [analytics_parameters_1.EventCustomMetric.DurationInMs]: durationInMs,
            [analytics_parameters_1.EventCustomMetric.JsSizeInBytes]: jsSizeInBytes,
            [analytics_parameters_1.EventCustomMetric.CssSizeInBytes]: cssSizeInBytes,
            [analytics_parameters_1.EventCustomMetric.NgComponentCount]: ngComponentCount,
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWJhc2UtY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2FyY2hpdGVjdC1iYXNlLWNvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILHlEQUE4RDtBQUM5RCx5REFHd0M7QUFDeEMsK0NBQTRDO0FBQzVDLGlEQUEwQztBQUMxQywyQkFBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHNEQUF1RTtBQUN2RSw0RUFBNEY7QUFDNUYsOENBQW1EO0FBQ25ELGdEQUFtRTtBQUNuRSwwQ0FBeUM7QUFDekMscURBTTBCO0FBQzFCLHlEQUEyRTtBQU8zRSxNQUFzQiwwQkFDcEIsU0FBUSw4QkFBZ0I7SUFEMUI7O1FBSVcsVUFBSyxHQUFHLDZCQUFZLENBQUMsRUFBRSxDQUFDO0lBOFBuQyxDQUFDO0lBM1BXLEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBYyxFQUFFLE9BQXFCO1FBQ25FLE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFFcEQsSUFBSSxXQUFtQixDQUFDO1FBQ3hCLElBQUk7WUFDRixXQUFXLEdBQUcsTUFBTSxhQUFhLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDbkU7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLElBQUEscUJBQWEsRUFBQyxDQUFDLENBQUMsQ0FBQztZQUVqQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ3hDO1FBRUQsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDaEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsY0FBYyxDQUFDLE1B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QUFDLENBQUM7Z0JBQ3RELE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFBLHlCQUFTLEVBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsRUFBRTtvQkFDaEYsS0FBSyxFQUFFLFNBQVM7aUJBQ2pCLENBQUMsQ0FBQztnQkFFSCxJQUFJLEtBQUssRUFBRTtvQkFDVCxNQUFNLEtBQUssQ0FBQztpQkFDYjthQUNGO1NBQ0Y7YUFBTTtZQUNMLGlDQUFpQztZQUNqQyxNQUFNLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDcEM7UUFFRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFTyxLQUFLLENBQUMsZ0NBQWdDLENBQzVDLE9BQThCO1FBRTlCLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDeEIsZ0JBQWdCO1lBQ2hCLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25DLElBQUksTUFBTSxJQUFBLHdCQUFlLEVBQUMseUJBQXlCLElBQUksT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDNUUsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUVELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxrQkFBa0I7UUFDbEIsT0FBTyxJQUFBLG9CQUFXLEVBQ2hCLHlDQUF5QyxJQUFJLENBQUMsa0JBQWtCLEVBQUUscUJBQXFCLEVBQ3ZGO1lBQ0U7Z0JBQ0UsSUFBSSxFQUFFLElBQUk7Z0JBQ1YsS0FBSyxFQUFFLElBQUk7YUFDWjtZQUNELEdBQUcsT0FBTztTQUNYLEVBQ0QsQ0FBQyxFQUNELElBQUksQ0FDTCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBbFFELGdFQWtRQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBBcmNoaXRlY3QsIFRhcmdldCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHtcbiAgTm9kZU1vZHVsZXNCdWlsZGVySW5mbyxcbiAgV29ya3NwYWNlTm9kZU1vZHVsZXNBcmNoaXRlY3RIb3N0LFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0L25vZGUnO1xuaW1wb3J0IHsganNvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHNwYXduU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzIH0gZnJvbSAnLi4vYW5hbHl0aWNzL2FuYWx5dGljcyc7XG5pbXBvcnQgeyBFdmVudEN1c3RvbURpbWVuc2lvbiwgRXZlbnRDdXN0b21NZXRyaWMgfSBmcm9tICcuLi9hbmFseXRpY3MvYW5hbHl0aWNzLXBhcmFtZXRlcnMnO1xuaW1wb3J0IHsgYXNzZXJ0SXNFcnJvciB9IGZyb20gJy4uL3V0aWxpdGllcy9lcnJvcic7XG5pbXBvcnQgeyBhc2tDb25maXJtYXRpb24sIGFza1F1ZXN0aW9uIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3Byb21wdCc7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4uL3V0aWxpdGllcy90dHknO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUVycm9yLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIENvbW1hbmRTY29wZSxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IE9wdGlvbiwgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1pc3NpbmdUYXJnZXRDaG9pY2Uge1xuICBuYW1lOiBzdHJpbmc7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBcmNoaXRlY3RCYXNlQ29tbWFuZE1vZHVsZTxUIGV4dGVuZHMgb2JqZWN0PlxuICBleHRlbmRzIENvbW1hbmRNb2R1bGU8VD5cbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248VD5cbntcbiAgb3ZlcnJpZGUgc2NvcGUgPSBDb21tYW5kU2NvcGUuSW47XG4gIHByb3RlY3RlZCByZWFkb25seSBtaXNzaW5nVGFyZ2V0Q2hvaWNlczogTWlzc2luZ1RhcmdldENob2ljZVtdIHwgdW5kZWZpbmVkO1xuXG4gIHByb3RlY3RlZCBhc3luYyBydW5TaW5nbGVUYXJnZXQodGFyZ2V0OiBUYXJnZXQsIG9wdGlvbnM6IE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgYXJjaGl0ZWN0SG9zdCA9IGF3YWl0IHRoaXMuZ2V0QXJjaGl0ZWN0SG9zdCgpO1xuXG4gICAgbGV0IGJ1aWxkZXJOYW1lOiBzdHJpbmc7XG4gICAgdHJ5IHtcbiAgICAgIGJ1aWxkZXJOYW1lID0gYXdhaXQgYXJjaGl0ZWN0SG9zdC5nZXRCdWlsZGVyTmFtZUZvclRhcmdldCh0YXJnZXQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGFzc2VydElzRXJyb3IoZSk7XG5cbiAgICAgIHJldHVybiB0aGlzLm9uTWlzc2luZ1RhcmdldChlLm1lc3NhZ2UpO1xuICAgIH1cblxuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgcnVuID0gYXdhaXQgdGhpcy5nZXRBcmNoaXRlY3QoKS5zY2hlZHVsZVRhcmdldCh0YXJnZXQsIG9wdGlvbnMgYXMganNvbi5Kc29uT2JqZWN0LCB7XG4gICAgICBsb2dnZXIsXG4gICAgfSk7XG5cbiAgICBjb25zdCBhbmFseXRpY3MgPSBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyhidWlsZGVyTmFtZSlcbiAgICAgID8gYXdhaXQgdGhpcy5nZXRBbmFseXRpY3MoKVxuICAgICAgOiB1bmRlZmluZWQ7XG5cbiAgICBsZXQgb3V0cHV0U3Vic2NyaXB0aW9uO1xuICAgIGlmIChhbmFseXRpY3MpIHtcbiAgICAgIGFuYWx5dGljcy5yZXBvcnRBcmNoaXRlY3RSdW5FdmVudCh7XG4gICAgICAgIFtFdmVudEN1c3RvbURpbWVuc2lvbi5CdWlsZGVyVGFyZ2V0XTogYnVpbGRlck5hbWUsXG4gICAgICB9KTtcblxuICAgICAgbGV0IGZpcnN0UnVuID0gdHJ1ZTtcbiAgICAgIG91dHB1dFN1YnNjcmlwdGlvbiA9IHJ1bi5vdXRwdXQuc3Vic2NyaWJlKCh7IHN0YXRzIH0pID0+IHtcbiAgICAgICAgY29uc3QgcGFyYW1ldGVycyA9IHRoaXMuYnVpbGRlclN0YXRzVG9BbmFseXRpY3NQYXJhbWV0ZXJzKHN0YXRzLCBidWlsZGVyTmFtZSk7XG4gICAgICAgIGlmICghcGFyYW1ldGVycykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmaXJzdFJ1bikge1xuICAgICAgICAgIGZpcnN0UnVuID0gZmFsc2U7XG4gICAgICAgICAgYW5hbHl0aWNzLnJlcG9ydEJ1aWxkUnVuRXZlbnQocGFyYW1ldGVycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYW5hbHl0aWNzLnJlcG9ydFJlYnVpbGRSdW5FdmVudChwYXJhbWV0ZXJzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgZXJyb3IsIHN1Y2Nlc3MgfSA9IGF3YWl0IHJ1bi5sYXN0T3V0cHV0O1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdWNjZXNzID8gMCA6IDE7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGF3YWl0IHJ1bi5zdG9wKCk7XG4gICAgICBvdXRwdXRTdWJzY3JpcHRpb24/LnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBidWlsZGVyU3RhdHNUb0FuYWx5dGljc1BhcmFtZXRlcnMoXG4gICAgc3RhdHM6IGpzb24uSnNvblZhbHVlLFxuICAgIGJ1aWxkZXJOYW1lOiBzdHJpbmcsXG4gICk6IFBhcnRpYWw8XG4gICAgfCBSZWNvcmQ8RXZlbnRDdXN0b21EaW1lbnNpb24gJiBFdmVudEN1c3RvbU1ldHJpYywgc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkIHwgYm9vbGVhbj5cbiAgICB8IHVuZGVmaW5lZFxuICA+IHtcbiAgICBpZiAoIXN0YXRzIHx8IHR5cGVvZiBzdGF0cyAhPT0gJ29iamVjdCcgfHwgISgnZHVyYXRpb25Jbk1zJyBpbiBzdGF0cykpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qge1xuICAgICAgb3B0aW1pemF0aW9uLFxuICAgICAgYWxsQ2h1bmtzQ291bnQsXG4gICAgICBhb3QsXG4gICAgICBsYXp5Q2h1bmtzQ291bnQsXG4gICAgICBpbml0aWFsQ2h1bmtzQ291bnQsXG4gICAgICBkdXJhdGlvbkluTXMsXG4gICAgICBjaGFuZ2VkQ2h1bmtzQ291bnQsXG4gICAgICBjc3NTaXplSW5CeXRlcyxcbiAgICAgIGpzU2l6ZUluQnl0ZXMsXG4gICAgICBuZ0NvbXBvbmVudENvdW50LFxuICAgIH0gPSBzdGF0cztcblxuICAgIHJldHVybiB7XG4gICAgICBbRXZlbnRDdXN0b21EaW1lbnNpb24uQnVpbGRlclRhcmdldF06IGJ1aWxkZXJOYW1lLFxuICAgICAgW0V2ZW50Q3VzdG9tRGltZW5zaW9uLkFvdF06IGFvdCxcbiAgICAgIFtFdmVudEN1c3RvbURpbWVuc2lvbi5PcHRpbWl6YXRpb25dOiBvcHRpbWl6YXRpb24sXG4gICAgICBbRXZlbnRDdXN0b21NZXRyaWMuQWxsQ2h1bmtzQ291bnRdOiBhbGxDaHVua3NDb3VudCxcbiAgICAgIFtFdmVudEN1c3RvbU1ldHJpYy5MYXp5Q2h1bmtzQ291bnRdOiBsYXp5Q2h1bmtzQ291bnQsXG4gICAgICBbRXZlbnRDdXN0b21NZXRyaWMuSW5pdGlhbENodW5rc0NvdW50XTogaW5pdGlhbENodW5rc0NvdW50LFxuICAgICAgW0V2ZW50Q3VzdG9tTWV0cmljLkNoYW5nZWRDaHVua3NDb3VudF06IGNoYW5nZWRDaHVua3NDb3VudCxcbiAgICAgIFtFdmVudEN1c3RvbU1ldHJpYy5EdXJhdGlvbkluTXNdOiBkdXJhdGlvbkluTXMsXG4gICAgICBbRXZlbnRDdXN0b21NZXRyaWMuSnNTaXplSW5CeXRlc106IGpzU2l6ZUluQnl0ZXMsXG4gICAgICBbRXZlbnRDdXN0b21NZXRyaWMuQ3NzU2l6ZUluQnl0ZXNdOiBjc3NTaXplSW5CeXRlcyxcbiAgICAgIFtFdmVudEN1c3RvbU1ldHJpYy5OZ0NvbXBvbmVudENvdW50XTogbmdDb21wb25lbnRDb3VudCxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBfYXJjaGl0ZWN0SG9zdDogV29ya3NwYWNlTm9kZU1vZHVsZXNBcmNoaXRlY3RIb3N0IHwgdW5kZWZpbmVkO1xuICBwcm90ZWN0ZWQgZ2V0QXJjaGl0ZWN0SG9zdCgpOiBXb3Jrc3BhY2VOb2RlTW9kdWxlc0FyY2hpdGVjdEhvc3Qge1xuICAgIGlmICh0aGlzLl9hcmNoaXRlY3RIb3N0KSB7XG4gICAgICByZXR1cm4gdGhpcy5fYXJjaGl0ZWN0SG9zdDtcbiAgICB9XG5cbiAgICBjb25zdCB3b3Jrc3BhY2UgPSB0aGlzLmdldFdvcmtzcGFjZU9yVGhyb3coKTtcblxuICAgIHJldHVybiAodGhpcy5fYXJjaGl0ZWN0SG9zdCA9IG5ldyBXb3Jrc3BhY2VOb2RlTW9kdWxlc0FyY2hpdGVjdEhvc3QoXG4gICAgICB3b3Jrc3BhY2UsXG4gICAgICB3b3Jrc3BhY2UuYmFzZVBhdGgsXG4gICAgKSk7XG4gIH1cblxuICBwcml2YXRlIF9hcmNoaXRlY3Q6IEFyY2hpdGVjdCB8IHVuZGVmaW5lZDtcbiAgcHJvdGVjdGVkIGdldEFyY2hpdGVjdCgpOiBBcmNoaXRlY3Qge1xuICAgIGlmICh0aGlzLl9hcmNoaXRlY3QpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hcmNoaXRlY3Q7XG4gICAgfVxuXG4gICAgY29uc3QgcmVnaXN0cnkgPSBuZXcganNvbi5zY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KCk7XG4gICAgcmVnaXN0cnkuYWRkUG9zdFRyYW5zZm9ybShqc29uLnNjaGVtYS50cmFuc2Zvcm1zLmFkZFVuZGVmaW5lZERlZmF1bHRzKTtcbiAgICByZWdpc3RyeS51c2VYRGVwcmVjYXRlZFByb3ZpZGVyKChtc2cpID0+IHRoaXMuY29udGV4dC5sb2dnZXIud2Fybihtc2cpKTtcblxuICAgIGNvbnN0IGFyY2hpdGVjdEhvc3QgPSB0aGlzLmdldEFyY2hpdGVjdEhvc3QoKTtcblxuICAgIHJldHVybiAodGhpcy5fYXJjaGl0ZWN0ID0gbmV3IEFyY2hpdGVjdChhcmNoaXRlY3RIb3N0LCByZWdpc3RyeSkpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldEFyY2hpdGVjdFRhcmdldE9wdGlvbnModGFyZ2V0OiBUYXJnZXQpOiBQcm9taXNlPE9wdGlvbltdPiB7XG4gICAgY29uc3QgYXJjaGl0ZWN0SG9zdCA9IHRoaXMuZ2V0QXJjaGl0ZWN0SG9zdCgpO1xuICAgIGxldCBidWlsZGVyQ29uZjogc3RyaW5nO1xuXG4gICAgdHJ5IHtcbiAgICAgIGJ1aWxkZXJDb25mID0gYXdhaXQgYXJjaGl0ZWN0SG9zdC5nZXRCdWlsZGVyTmFtZUZvclRhcmdldCh0YXJnZXQpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGxldCBidWlsZGVyRGVzYzogTm9kZU1vZHVsZXNCdWlsZGVySW5mbztcbiAgICB0cnkge1xuICAgICAgYnVpbGRlckRlc2MgPSBhd2FpdCBhcmNoaXRlY3RIb3N0LnJlc29sdmVCdWlsZGVyKGJ1aWxkZXJDb25mKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgIHRoaXMud2Fybk9uTWlzc2luZ05vZGVNb2R1bGVzKCk7XG4gICAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IoYENvdWxkIG5vdCBmaW5kIHRoZSAnJHtidWlsZGVyQ29uZn0nIGJ1aWxkZXIncyBub2RlIHBhY2thZ2UuYCk7XG4gICAgICB9XG5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyhcbiAgICAgIG5ldyBqc29uLnNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoKSxcbiAgICAgIGJ1aWxkZXJEZXNjLm9wdGlvblNjaGVtYSBhcyBqc29uLkpzb25PYmplY3QsXG4gICAgICB0cnVlLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIHdhcm5Pbk1pc3NpbmdOb2RlTW9kdWxlcygpOiB2b2lkIHtcbiAgICBjb25zdCBiYXNlUGF0aCA9IHRoaXMuY29udGV4dC53b3Jrc3BhY2U/LmJhc2VQYXRoO1xuICAgIGlmICghYmFzZVBhdGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgYSBgbm9kZV9tb2R1bGVzYCBkaXJlY3RvcnkgKG5wbSwgeWFybiBub24tUG5QLCBldGMuKVxuICAgIGlmIChleGlzdHNTeW5jKHJlc29sdmUoYmFzZVBhdGgsICdub2RlX21vZHVsZXMnKSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgeWFybiBQblAgZmlsZXNcbiAgICBpZiAoXG4gICAgICBleGlzdHNTeW5jKHJlc29sdmUoYmFzZVBhdGgsICcucG5wLmpzJykpIHx8XG4gICAgICBleGlzdHNTeW5jKHJlc29sdmUoYmFzZVBhdGgsICcucG5wLmNqcycpKSB8fFxuICAgICAgZXhpc3RzU3luYyhyZXNvbHZlKGJhc2VQYXRoLCAnLnBucC5tanMnKSlcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmNvbnRleHQubG9nZ2VyLndhcm4oXG4gICAgICBgTm9kZSBwYWNrYWdlcyBtYXkgbm90IGJlIGluc3RhbGxlZC4gVHJ5IGluc3RhbGxpbmcgd2l0aCAnJHt0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIubmFtZX0gaW5zdGFsbCcuYCxcbiAgICApO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldEFyY2hpdGVjdFRhcmdldCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmNvbW1hbmROYW1lO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIG9uTWlzc2luZ1RhcmdldChkZWZhdWx0TWVzc2FnZTogc3RyaW5nKTogUHJvbWlzZTwxPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCBjaG9pY2VzID0gdGhpcy5taXNzaW5nVGFyZ2V0Q2hvaWNlcztcblxuICAgIGlmICghY2hvaWNlcz8ubGVuZ3RoKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoZGVmYXVsdE1lc3NhZ2UpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBjb25zdCBtaXNzaW5nVGFyZ2V0TWVzc2FnZSA9XG4gICAgICBgQ2Fubm90IGZpbmQgXCIke3RoaXMuZ2V0QXJjaGl0ZWN0VGFyZ2V0KCl9XCIgdGFyZ2V0IGZvciB0aGUgc3BlY2lmaWVkIHByb2plY3QuXFxuYCArXG4gICAgICBgWW91IGNhbiBhZGQgYSBwYWNrYWdlIHRoYXQgaW1wbGVtZW50cyB0aGVzZSBjYXBhYmlsaXRpZXMuXFxuXFxuYCArXG4gICAgICBgRm9yIGV4YW1wbGU6XFxuYCArXG4gICAgICBjaG9pY2VzLm1hcCgoeyBuYW1lLCB2YWx1ZSB9KSA9PiBgICAke25hbWV9OiBuZyBhZGQgJHt2YWx1ZX1gKS5qb2luKCdcXG4nKSArXG4gICAgICAnXFxuJztcblxuICAgIGlmIChpc1RUWSgpKSB7XG4gICAgICAvLyBVc2UgcHJvbXB0cyB0byBhc2sgdGhlIHVzZXIgaWYgdGhleSdkIGxpa2UgdG8gaW5zdGFsbCBhIHBhY2thZ2UuXG4gICAgICBsb2dnZXIud2FybihtaXNzaW5nVGFyZ2V0TWVzc2FnZSk7XG5cbiAgICAgIGNvbnN0IHBhY2thZ2VUb0luc3RhbGwgPSBhd2FpdCB0aGlzLmdldE1pc3NpbmdUYXJnZXRQYWNrYWdlVG9JbnN0YWxsKGNob2ljZXMpO1xuICAgICAgaWYgKHBhY2thZ2VUb0luc3RhbGwpIHtcbiAgICAgICAgLy8gRXhhbXBsZSBydW46IGBuZyBhZGQgQGFuZ3VsYXItZXNsaW50L3NjaGVtYXRpY3NgLlxuICAgICAgICBjb25zdCBiaW5QYXRoID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9iaW4vbmcuanMnKTtcbiAgICAgICAgY29uc3QgeyBlcnJvciB9ID0gc3Bhd25TeW5jKHByb2Nlc3MuZXhlY1BhdGgsIFtiaW5QYXRoLCAnYWRkJywgcGFja2FnZVRvSW5zdGFsbF0sIHtcbiAgICAgICAgICBzdGRpbzogJ2luaGVyaXQnLFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBOb24gVFRZIGRpc3BsYXkgZXJyb3IgbWVzc2FnZS5cbiAgICAgIGxvZ2dlci5lcnJvcihtaXNzaW5nVGFyZ2V0TWVzc2FnZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldE1pc3NpbmdUYXJnZXRQYWNrYWdlVG9JbnN0YWxsKFxuICAgIGNob2ljZXM6IE1pc3NpbmdUYXJnZXRDaG9pY2VbXSxcbiAgKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgaWYgKGNob2ljZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAvLyBTaW5nbGUgY2hvaWNlXG4gICAgICBjb25zdCB7IG5hbWUsIHZhbHVlIH0gPSBjaG9pY2VzWzBdO1xuICAgICAgaWYgKGF3YWl0IGFza0NvbmZpcm1hdGlvbihgV291bGQgeW91IGxpa2UgdG8gYWRkICR7bmFtZX0gbm93P2AsIHRydWUsIGZhbHNlKSkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIE11bHRpcGxlIGNob2ljZVxuICAgIHJldHVybiBhc2tRdWVzdGlvbihcbiAgICAgIGBXb3VsZCB5b3UgbGlrZSB0byBhZGQgYSBwYWNrYWdlIHdpdGggXCIke3RoaXMuZ2V0QXJjaGl0ZWN0VGFyZ2V0KCl9XCIgY2FwYWJpbGl0aWVzIG5vdz9gLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ05vJyxcbiAgICAgICAgICB2YWx1ZTogbnVsbCxcbiAgICAgICAgfSxcbiAgICAgICAgLi4uY2hvaWNlcyxcbiAgICAgIF0sXG4gICAgICAwLFxuICAgICAgbnVsbCxcbiAgICApO1xuICB9XG59XG4iXX0=