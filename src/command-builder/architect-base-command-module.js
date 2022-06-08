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
ArchitectBaseCommandModule.scope = command_module_1.CommandScope.In;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWJhc2UtY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2FyY2hpdGVjdC1iYXNlLWNvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILHlEQUE4RDtBQUM5RCx5REFHd0M7QUFDeEMsK0NBQTRDO0FBQzVDLGlEQUEwQztBQUMxQywyQkFBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHNEQUF1RTtBQUN2RSxnREFBbUU7QUFDbkUsMENBQXlDO0FBQ3pDLHFEQU0wQjtBQUMxQix5REFBMkU7QUFPM0UsTUFBc0IsMEJBQ3BCLFNBQVEsOEJBQWdCO0lBRDFCOztRQUtxQiwwQkFBcUIsR0FBRyxLQUFLLENBQUM7SUE4TG5ELENBQUM7SUEzTFcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFjLEVBQUUsT0FBcUI7UUFDbkUsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUVwRCxJQUFJLFdBQW1CLENBQUM7UUFDeEIsSUFBSTtZQUNGLFdBQVcsR0FBRyxNQUFNLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNuRTtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUN4QztRQUVELE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUN6QixHQUFHLENBQUMsTUFBTSxhQUFhLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEQsR0FBRyxPQUFPO1NBQ1gsQ0FBQyxDQUFDO1FBRUgsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFFaEMsTUFBTSxHQUFH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SUFBSSxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUM1RSxPQUFPLEtBQUssQ0FBQzthQUNkO1lBRUQsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELGtCQUFrQjtRQUNsQixPQUFPLElBQUEsb0JBQVcsRUFDaEIseUNBQXlDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsRUFDdkY7WUFDRTtnQkFDRSxJQUFJLEVBQUUsSUFBSTtnQkFDVixLQUFLLEVBQUUsSUFBSTthQUNaO1lBQ0QsR0FBRyxPQUFPO1NBQ1gsRUFDRCxDQUFDLEVBQ0QsSUFBSSxDQUNMLENBQUM7SUFDSixDQUFDOztBQWxNSCxnRUFtTUM7QUEvTGlCLGdDQUFLLEdBQUcsNkJBQVksQ0FBQyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQXJjaGl0ZWN0LCBUYXJnZXQgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7XG4gIE5vZGVNb2R1bGVzQnVpbGRlckluZm8sXG4gIFdvcmtzcGFjZU5vZGVNb2R1bGVzQXJjaGl0ZWN0SG9zdCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdC9ub2RlJztcbmltcG9ydCB7IGpzb24gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBzcGF3blN5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyB9IGZyb20gJy4uL2FuYWx5dGljcy9hbmFseXRpY3MnO1xuaW1wb3J0IHsgYXNrQ29uZmlybWF0aW9uLCBhc2tRdWVzdGlvbiB9IGZyb20gJy4uL3V0aWxpdGllcy9wcm9tcHQnO1xuaW1wb3J0IHsgaXNUVFkgfSBmcm9tICcuLi91dGlsaXRpZXMvdHR5JztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGUsXG4gIENvbW1hbmRNb2R1bGVFcnJvcixcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBDb21tYW5kU2NvcGUsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBPcHRpb24sIHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyB9IGZyb20gJy4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcblxuZXhwb3J0IGludGVyZmFjZSBNaXNzaW5nVGFyZ2V0Q2hvaWNlIHtcbiAgbmFtZTogc3RyaW5nO1xuICB2YWx1ZTogc3RyaW5nO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXJjaGl0ZWN0QmFzZUNvbW1hbmRNb2R1bGU8VCBleHRlbmRzIG9iamVjdD5cbiAgZXh0ZW5kcyBDb21tYW5kTW9kdWxlPFQ+XG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPFQ+XG57XG4gIHN0YXRpYyBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5JbjtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIHNob3VsZFJlcG9ydEFuYWx5dGljcyA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgbWlzc2luZ1RhcmdldENob2ljZXM6IE1pc3NpbmdUYXJnZXRDaG9pY2VbXSB8IHVuZGVmaW5lZDtcblxuICBwcm90ZWN0ZWQgYXN5bmMgcnVuU2luZ2xlVGFyZ2V0KHRhcmdldDogVGFyZ2V0LCBvcHRpb25zOiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGFyY2hpdGVjdEhvc3QgPSBhd2FpdCB0aGlzLmdldEFyY2hpdGVjdEhvc3QoKTtcblxuICAgIGxldCBidWlsZGVyTmFtZTogc3RyaW5nO1xuICAgIHRyeSB7XG4gICAgICBidWlsZGVyTmFtZSA9IGF3YWl0IGFyY2hpdGVjdEhvc3QuZ2V0QnVpbGRlck5hbWVGb3JUYXJnZXQodGFyZ2V0KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gdGhpcy5vbk1pc3NpbmdUYXJnZXQoZS5tZXNzYWdlKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnJlcG9ydEFuYWx5dGljcyh7XG4gICAgICAuLi4oYXdhaXQgYXJjaGl0ZWN0SG9zdC5nZXRPcHRpb25zRm9yVGFyZ2V0KHRhcmdldCkpLFxuICAgICAgLi4ub3B0aW9ucyxcbiAgICB9KTtcblxuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICBjb25zdCBydW4gPSBhd2FpdCB0aGlzLmdldEFyY2hpdGVjdCgpLnNjaGVkdWxlVGFyZ2V0KHRhcmdldCwgb3B0aW9ucyBhcyBqc29uLkpzb25PYmplY3QsIHtcbiAgICAgIGxvZ2dlcixcbiAgICAgIGFuYWx5dGljczogaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MoYnVpbGRlck5hbWUpID8gYXdhaXQgdGhpcy5nZXRBbmFseXRpY3MoKSA6IHVuZGVmaW5lZCxcbiAgICB9KTtcblxuICAgIGNvbnN0IHsgZXJyb3IsIHN1Y2Nlc3MgfSA9IGF3YWl0IHJ1bi5vdXRwdXQudG9Qcm9taXNlKCk7XG4gICAgYXdhaXQgcnVuLnN0b3AoKTtcblxuICAgIGlmIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKGVycm9yKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VjY2VzcyA/IDAgOiAxO1xuICB9XG5cbiAgcHJpdmF0ZSBfYXJjaGl0ZWN0SG9zdDogV29ya3NwYWNlTm9kZU1vZHVsZXNBcmNoaXRlY3RIb3N0IHwgdW5kZWZpbmVkO1xuICBwcm90ZWN0ZWQgZ2V0QXJjaGl0ZWN0SG9zdCgpOiBXb3Jrc3BhY2VOb2RlTW9kdWxlc0FyY2hpdGVjdEhvc3Qge1xuICAgIGlmICh0aGlzLl9hcmNoaXRlY3RIb3N0KSB7XG4gICAgICByZXR1cm4gdGhpcy5fYXJjaGl0ZWN0SG9zdDtcbiAgICB9XG5cbiAgICBjb25zdCB3b3Jrc3BhY2UgPSB0aGlzLmdldFdvcmtzcGFjZU9yVGhyb3coKTtcblxuICAgIHJldHVybiAodGhpcy5fYXJjaGl0ZWN0SG9zdCA9IG5ldyBXb3Jrc3BhY2VOb2RlTW9kdWxlc0FyY2hpdGVjdEhvc3QoXG4gICAgICB3b3Jrc3BhY2UsXG4gICAgICB3b3Jrc3BhY2UuYmFzZVBhdGgsXG4gICAgKSk7XG4gIH1cblxuICBwcml2YXRlIF9hcmNoaXRlY3Q6IEFyY2hpdGVjdCB8IHVuZGVmaW5lZDtcbiAgcHJvdGVjdGVkIGdldEFyY2hpdGVjdCgpOiBBcmNoaXRlY3Qge1xuICAgIGlmICh0aGlzLl9hcmNoaXRlY3QpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hcmNoaXRlY3Q7XG4gICAgfVxuXG4gICAgY29uc3QgcmVnaXN0cnkgPSBuZXcganNvbi5zY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KCk7XG4gICAgcmVnaXN0cnkuYWRkUG9zdFRyYW5zZm9ybShqc29uLnNjaGVtYS50cmFuc2Zvcm1zLmFkZFVuZGVmaW5lZERlZmF1bHRzKTtcbiAgICByZWdpc3RyeS51c2VYRGVwcmVjYXRlZFByb3ZpZGVyKChtc2cpID0+IHRoaXMuY29udGV4dC5sb2dnZXIud2Fybihtc2cpKTtcblxuICAgIGNvbnN0IGFyY2hpdGVjdEhvc3QgPSB0aGlzLmdldEFyY2hpdGVjdEhvc3QoKTtcblxuICAgIHJldHVybiAodGhpcy5fYXJjaGl0ZWN0ID0gbmV3IEFyY2hpdGVjdChhcmNoaXRlY3RIb3N0LCByZWdpc3RyeSkpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldEFyY2hpdGVjdFRhcmdldE9wdGlvbnModGFyZ2V0OiBUYXJnZXQpOiBQcm9taXNlPE9wdGlvbltdPiB7XG4gICAgY29uc3QgYXJjaGl0ZWN0SG9zdCA9IHRoaXMuZ2V0QXJjaGl0ZWN0SG9zdCgpO1xuICAgIGxldCBidWlsZGVyQ29uZjogc3RyaW5nO1xuXG4gICAgdHJ5IHtcbiAgICAgIGJ1aWxkZXJDb25mID0gYXdhaXQgYXJjaGl0ZWN0SG9zdC5nZXRCdWlsZGVyTmFtZUZvclRhcmdldCh0YXJnZXQpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGxldCBidWlsZGVyRGVzYzogTm9kZU1vZHVsZXNCdWlsZGVySW5mbztcbiAgICB0cnkge1xuICAgICAgYnVpbGRlckRlc2MgPSBhd2FpdCBhcmNoaXRlY3RIb3N0LnJlc29sdmVCdWlsZGVyKGJ1aWxkZXJDb25mKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgdGhpcy53YXJuT25NaXNzaW5nTm9kZU1vZHVsZXMoKTtcbiAgICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihgQ291bGQgbm90IGZpbmQgdGhlICcke2J1aWxkZXJDb25mfScgYnVpbGRlcidzIG5vZGUgcGFja2FnZS5gKTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKFxuICAgICAgbmV3IGpzb24uc2NoZW1hLkNvcmVTY2hlbWFSZWdpc3RyeSgpLFxuICAgICAgYnVpbGRlckRlc2Mub3B0aW9uU2NoZW1hIGFzIGpzb24uSnNvbk9iamVjdCxcbiAgICAgIHRydWUsXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgd2Fybk9uTWlzc2luZ05vZGVNb2R1bGVzKCk6IHZvaWQge1xuICAgIGNvbnN0IGJhc2VQYXRoID0gdGhpcy5jb250ZXh0LndvcmtzcGFjZT8uYmFzZVBhdGg7XG4gICAgaWYgKCFiYXNlUGF0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBhIGBub2RlX21vZHVsZXNgIGRpcmVjdG9yeSAobnBtLCB5YXJuIG5vbi1QblAsIGV0Yy4pXG4gICAgaWYgKGV4aXN0c1N5bmMocmVzb2x2ZShiYXNlUGF0aCwgJ25vZGVfbW9kdWxlcycpKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciB5YXJuIFBuUCBmaWxlc1xuICAgIGlmIChcbiAgICAgIGV4aXN0c1N5bmMocmVzb2x2ZShiYXNlUGF0aCwgJy5wbnAuanMnKSkgfHxcbiAgICAgIGV4aXN0c1N5bmMocmVzb2x2ZShiYXNlUGF0aCwgJy5wbnAuY2pzJykpIHx8XG4gICAgICBleGlzdHNTeW5jKHJlc29sdmUoYmFzZVBhdGgsICcucG5wLm1qcycpKVxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2FybihcbiAgICAgIGBOb2RlIHBhY2thZ2VzIG1heSBub3QgYmUgaW5zdGFsbGVkLiBUcnkgaW5zdGFsbGluZyB3aXRoICcke3RoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci5uYW1lfSBpbnN0YWxsJy5gLFxuICAgICk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0QXJjaGl0ZWN0VGFyZ2V0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZE5hbWU7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgb25NaXNzaW5nVGFyZ2V0KGRlZmF1bHRNZXNzYWdlOiBzdHJpbmcpOiBQcm9taXNlPDE+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IGNob2ljZXMgPSB0aGlzLm1pc3NpbmdUYXJnZXRDaG9pY2VzO1xuXG4gICAgaWYgKCFjaG9pY2VzPy5sZW5ndGgpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihkZWZhdWx0TWVzc2FnZSk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGNvbnN0IG1pc3NpbmdUYXJnZXRNZXNzYWdlID1cbiAgICAgIGBDYW5ub3QgZmluZCBcIiR7dGhpcy5nZXRBcmNoaXRlY3RUYXJnZXQoKX1cIiB0YXJnZXQgZm9yIHRoZSBzcGVjaWZpZWQgcHJvamVjdC5cXG5gICtcbiAgICAgIGBZb3UgY2FuIGFkZCBhIHBhY2thZ2UgdGhhdCBpbXBsZW1lbnRzIHRoZXNlIGNhcGFiaWxpdGllcy5cXG5cXG5gICtcbiAgICAgIGBGb3IgZXhhbXBsZTpcXG5gICtcbiAgICAgIGNob2ljZXMubWFwKCh7IG5hbWUsIHZhbHVlIH0pID0+IGAgICR7bmFtZX06IG5nIGFkZCAke3ZhbHVlfWApLmpvaW4oJ1xcbicpICtcbiAgICAgICdcXG4nO1xuXG4gICAgaWYgKGlzVFRZKCkpIHtcbiAgICAgIC8vIFVzZSBwcm9tcHRzIHRvIGFzayB0aGUgdXNlciBpZiB0aGV5J2QgbGlrZSB0byBpbnN0YWxsIGEgcGFja2FnZS5cbiAgICAgIGxvZ2dlci53YXJuKG1pc3NpbmdUYXJnZXRNZXNzYWdlKTtcblxuICAgICAgY29uc3QgcGFja2FnZVRvSW5zdGFsbCA9IGF3YWl0IHRoaXMuZ2V0TWlzc2luZ1RhcmdldFBhY2thZ2VUb0luc3RhbGwoY2hvaWNlcyk7XG4gICAgICBpZiAocGFja2FnZVRvSW5zdGFsbCkge1xuICAgICAgICAvLyBFeGFtcGxlIHJ1bjogYG5nIGFkZCBAYW5ndWxhci1lc2xpbnQvc2NoZW1hdGljc2AuXG4gICAgICAgIGNvbnN0IGJpblBhdGggPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL2Jpbi9uZy5qcycpO1xuICAgICAgICBjb25zdCB7IGVycm9yIH0gPSBzcGF3blN5bmMocHJvY2Vzcy5leGVjUGF0aCwgW2JpblBhdGgsICdhZGQnLCBwYWNrYWdlVG9JbnN0YWxsXSwge1xuICAgICAgICAgIHN0ZGlvOiAnaW5oZXJpdCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE5vbiBUVFkgZGlzcGxheSBlcnJvciBtZXNzYWdlLlxuICAgICAgbG9nZ2VyLmVycm9yKG1pc3NpbmdUYXJnZXRNZXNzYWdlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2V0TWlzc2luZ1RhcmdldFBhY2thZ2VUb0luc3RhbGwoXG4gICAgY2hvaWNlczogTWlzc2luZ1RhcmdldENob2ljZVtdLFxuICApOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICBpZiAoY2hvaWNlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgIC8vIFNpbmdsZSBjaG9pY2VcbiAgICAgIGNvbnN0IHsgbmFtZSwgdmFsdWUgfSA9IGNob2ljZXNbMF07XG4gICAgICBpZiAoYXdhaXQgYXNrQ29uZmlybWF0aW9uKGBXb3VsZCB5b3UgbGlrZSB0byBhZGQgJHtuYW1lfSBub3c/YCwgdHJ1ZSwgZmFsc2UpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gTXVsdGlwbGUgY2hvaWNlXG4gICAgcmV0dXJuIGFza1F1ZXN0aW9uKFxuICAgICAgYFdvdWxkIHlvdSBsaWtlIHRvIGFkZCBhIHBhY2thZ2Ugd2l0aCBcIiR7dGhpcy5nZXRBcmNoaXRlY3RUYXJnZXQoKX1cIiBjYXBhYmlsaXRpZXMgbm93P2AsXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiAnTm8nLFxuICAgICAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgICB9LFxuICAgICAgICAuLi5jaG9pY2VzLFxuICAgICAgXSxcbiAgICAgIDAsXG4gICAgICBudWxsLFxuICAgICk7XG4gIH1cbn1cbiJdfQ==