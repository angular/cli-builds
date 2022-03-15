"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAnalyticsConfig = exports.getAnalyticsInfoString = exports.createAnalytics = exports.getSharedAnalytics = exports.getAnalytics = exports.promptAnalytics = exports.setAnalyticsConfig = exports.isPackageNameSafeForAnalytics = exports.analyticsPackageSafelist = exports.AnalyticsProperties = void 0;
const core_1 = require("@angular-devkit/core");
const debug_1 = __importDefault(require("debug"));
const inquirer = __importStar(require("inquirer"));
const uuid_1 = require("uuid");
const color_1 = require("../utilities/color");
const config_1 = require("../utilities/config");
const tty_1 = require("../utilities/tty");
const version_1 = require("../utilities/version");
const analytics_collector_1 = require("./analytics-collector");
const analytics_environment_options_1 = require("./analytics-environment-options");
/* eslint-disable no-console */
const analyticsDebug = (0, debug_1.default)('ng:analytics'); // Generate analytics, including settings and users.
let _defaultAngularCliPropertyCache;
exports.AnalyticsProperties = {
    AngularCliProd: 'UA-8594346-29',
    AngularCliStaging: 'UA-8594346-32',
    get AngularCliDefault() {
        if (_defaultAngularCliPropertyCache) {
            return _defaultAngularCliPropertyCache;
        }
        const v = version_1.VERSION.full;
        // The logic is if it's a full version then we should use the prod GA property.
        _defaultAngularCliPropertyCache =
            /^\d+\.\d+\.\d+$/.test(v) && v !== '0.0.0'
                ? exports.AnalyticsProperties.AngularCliProd
                : exports.AnalyticsProperties.AngularCliStaging;
        return _defaultAngularCliPropertyCache;
    },
};
/**
 * This is the ultimate safelist for checking if a package name is safe to report to analytics.
 */
exports.analyticsPackageSafelist = [
    /^@angular\//,
    /^@angular-devkit\//,
    /^@ngtools\//,
    '@schematics/angular',
];
function isPackageNameSafeForAnalytics(name) {
    return exports.analyticsPackageSafelist.some((pattern) => {
        if (typeof pattern == 'string') {
            return pattern === name;
        }
        else {
            return pattern.test(name);
        }
    });
}
exports.isPackageNameSafeForAnalytics = isPackageNameSafeForAnalytics;
/**
 * Set analytics settings. This does not work if the user is not inside a project.
 * @param global Which config to use. "global" for user-level, and "local" for project-level.
 * @param value Either a user ID, true to generate a new User ID, or false to disable analytics.
 */
function setAnalyticsConfig(global, value) {
    const level = global ? 'global' : 'local';
    analyticsDebug('setting %s level analytics to: %s', level, value);
    const [config, configPath] = (0, config_1.getWorkspaceRaw)(level);
    if (!config || !configPath) {
        throw new Error(`Could not find ${level} workspace.`);
    }
    const cli = config.get(['cli']);
    if (cli !== undefined && !core_1.json.isJsonObject(cli)) {
        throw new Error(`Invalid config found at ${configPath}. CLI should be an object.`);
    }
    if (value === true) {
        value = (0, uuid_1.v4)();
    }
    config.modify(['cli', 'analytics'], value);
    config.save();
    analyticsDebug('done');
}
exports.setAnalyticsConfig = setAnalyticsConfig;
/**
 * Prompt the user for usage gathering permission.
 * @param force Whether to ask regardless of whether or not the user is using an interactive shell.
 * @return Whether or not the user was shown a prompt.
 */
async function promptAnalytics(global, force = false) {
    analyticsDebug('prompting user');
    const level = global ? 'global' : 'local';
    const [config, configPath] = (0, config_1.getWorkspaceRaw)(level);
    if (!config || !configPath) {
        throw new Error(`Could not find a ${level} workspace. Are you in a project?`);
    }
    if (force || (0, tty_1.isTTY)()) {
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'analytics',
                message: core_1.tags.stripIndents `
          Would you like to share anonymous usage data about this project with the Angular Team at
          Google under Google’s Privacy Policy at https://policies.google.com/privacy. For more
          details and how to change this setting, see https://angular.io/analytics.

        `,
                default: false,
            },
        ]);
        setAnalyticsConfig(global, answers.analytics);
        if (answers.analytics) {
            console.log('');
            console.log(core_1.tags.stripIndent `
        Thank you for sharing anonymous usage data. Should you change your mind, the following
        command will disable this feature entirely:

            ${color_1.colors.yellow(`ng analytics disable${global ? ' --global' : ''}`)}
      `);
            console.log('');
            // Send back a ping with the user `optin`.
            const ua = new analytics_collector_1.AnalyticsCollector(exports.AnalyticsProperties.AngularCliDefault, 'optin');
            ua.pageview('/telemetry/project/optin');
            await ua.flush();
        }
        else {
            // Send back a ping with the user `optout`. This is the only thing we send.
            const ua = new analytics_collector_1.AnalyticsCollector(exports.AnalyticsProperties.AngularCliDefault, 'optout');
            ua.pageview('/telemetry/project/optout');
            await ua.flush();
        }
        process.stderr.write(await getAnalyticsInfoString());
        return true;
    }
    return false;
}
exports.promptAnalytics = promptAnalytics;
/**
 * Get the analytics object for the user.
 */
async function getAnalytics(level) {
    analyticsDebug('getAnalytics');
    if (analytics_environment_options_1.analyticsDisabled) {
        analyticsDebug('NG_CLI_ANALYTICS is false');
        return undefined;
    }
    try {
        const workspace = await (0, config_1.getWorkspace)(level);
        const analyticsConfig = workspace === null || workspace === void 0 ? void 0 : workspace.getCli()['analytics'];
        analyticsDebug('Workspace Analytics config found: %j', analyticsConfig);
        if (!analyticsConfig) {
            return undefined;
        }
        else {
            let uid = undefined;
            if (typeof analyticsConfig == 'string') {
                uid = analyticsConfig;
            }
            else if (typeof analyticsConfig == 'object' && typeof analyticsConfig['uid'] == 'string') {
                uid = analyticsConfig['uid'];
            }
            analyticsDebug('client id: %j', uid);
            if (uid == undefined) {
                return undefined;
            }
            return new analytics_collector_1.AnalyticsCollector(exports.AnalyticsProperties.AngularCliDefault, uid);
        }
    }
    catch (err) {
        analyticsDebug('Error happened during reading of analytics config: %s', err.message);
        return undefined;
    }
}
exports.getAnalytics = getAnalytics;
/**
 * Return the usage analytics sharing setting, which is either a property string (GA-XXXXXXX-XX),
 * or undefined if no sharing.
 */
async function getSharedAnalytics() {
    analyticsDebug('getSharedAnalytics');
    if (analytics_environment_options_1.analyticsShareDisabled) {
        analyticsDebug('NG_CLI_ANALYTICS is false');
        return undefined;
    }
    // If anything happens we just keep the NOOP analytics.
    try {
        const globalWorkspace = await (0, config_1.getWorkspace)('global');
        const analyticsConfig = globalWorkspace === null || globalWorkspace === void 0 ? void 0 : globalWorkspace.getCli()['analyticsSharing'];
        if (!analyticsConfig || !analyticsConfig.tracking || !analyticsConfig.uuid) {
            return undefined;
        }
        else {
            analyticsDebug('Analytics sharing info: %j', analyticsConfig);
            return new analytics_collector_1.AnalyticsCollector(analyticsConfig.tracking, analyticsConfig.uuid);
        }
    }
    catch (err) {
        analyticsDebug('Error happened during reading of analytics sharing config: %s', err.message);
        return undefined;
    }
}
exports.getSharedAnalytics = getSharedAnalytics;
async function createAnalytics(workspace, skipPrompt = false) {
    var _a;
    let config;
    const isDisabledGlobally = ((_a = (await (0, config_1.getWorkspace)('global'))) === null || _a === void 0 ? void 0 : _a.getCli()['analytics']) === false;
    // If in workspace and global analytics is enabled, defer to workspace level
    if (workspace && !isDisabledGlobally) {
        const skipAnalytics = skipPrompt || analytics_environment_options_1.analyticsDisabled;
        // TODO: This should honor the `no-interactive` option.
        //       It is currently not an `ng` option but rather only an option for specific commands.
        //       The concept of `ng`-wide options are needed to cleanly handle this.
        if (!skipAnalytics && !(await hasAnalyticsConfig('local'))) {
            await promptAnalytics(false);
        }
        config = await getAnalytics('local');
    }
    else {
        config = await getAnalytics('global');
    }
    const maybeSharedAnalytics = await getSharedAnalytics();
    if (config && maybeSharedAnalytics) {
        return new core_1.analytics.MultiAnalytics([config, maybeSharedAnalytics]);
    }
    else if (config) {
        return config;
    }
    else if (maybeSharedAnalytics) {
        return maybeSharedAnalytics;
    }
    else {
        return new core_1.analytics.NoopAnalytics();
    }
}
exports.createAnalytics = createAnalytics;
function analyticsConfigValueToHumanFormat(value) {
    if (value === false) {
        return 'disabled';
    }
    else if (typeof value === 'string' || value === true) {
        return 'enabled';
    }
    else {
        return 'not set';
    }
}
async function getAnalyticsInfoString() {
    const [globalWorkspace] = (0, config_1.getWorkspaceRaw)('global');
    const [localWorkspace] = (0, config_1.getWorkspaceRaw)('local');
    const globalSetting = globalWorkspace === null || globalWorkspace === void 0 ? void 0 : globalWorkspace.get(['cli', 'analytics']);
    const localSetting = localWorkspace === null || localWorkspace === void 0 ? void 0 : localWorkspace.get(['cli', 'analytics']);
    const analyticsInstance = await createAnalytics(!!localWorkspace /** workspace */, true /** skipPrompt */);
    return (core_1.tags.stripIndents `
    Global setting: ${analyticsConfigValueToHumanFormat(globalSetting)}
    Local setting: ${localWorkspace
        ? analyticsConfigValueToHumanFormat(localSetting)
        : 'No local workspace configuration file.'}
    Effective status: ${analyticsInstance instanceof core_1.analytics.NoopAnalytics ? 'disabled' : 'enabled'}
  ` + '\n');
}
exports.getAnalyticsInfoString = getAnalyticsInfoString;
async function hasAnalyticsConfig(level) {
    try {
        const workspace = await (0, config_1.getWorkspace)(level);
        if ((workspace === null || workspace === void 0 ? void 0 : workspace.getCli()['analytics']) !== undefined) {
            return true;
        }
    }
    catch (_a) { }
    return false;
}
exports.hasAnalyticsConfig = hasAnalyticsConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2FuYWx5dGljcy9hbmFseXRpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBNkQ7QUFDN0Qsa0RBQTBCO0FBQzFCLG1EQUFxQztBQUNyQywrQkFBb0M7QUFDcEMsOENBQTRDO0FBQzVDLGdEQUFvRTtBQUNwRSwwQ0FBeUM7QUFDekMsa0RBQStDO0FBQy9DLCtEQUEyRDtBQUMzRCxtRkFBNEY7QUFFNUYsK0JBQStCO0FBQy9CLE1BQU0sY0FBYyxHQUFHLElBQUEsZUFBSyxFQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsb0RBQW9EO0FBRWxHLElBQUksK0JBQXVDLENBQUM7QUFDL0IsUUFBQSxtQkFBbUIsR0FBRztJQUNqQyxjQUFjLEVBQUUsZUFBZTtJQUMvQixpQkFBaUIsRUFBRSxlQUFlO0lBQ2xDLElBQUksaUJBQWlCO1FBQ25CLElBQUksK0JBQStCLEVBQUU7WUFDbkMsT0FBTywrQkFBK0IsQ0FBQztTQUN4QztRQUVELE1BQU0sQ0FBQyxHQUFHLGlCQUFPLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLCtFQUErRTtRQUMvRSwrQkFBK0I7WUFDN0IsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxPQUFPO2dCQUN4QyxDQUFDLENBQUMsMkJBQW1CLENBQUMsY0FBYztnQkFDcEMsQ0FBQyxDQUFDLDJCQUFtQixDQUFDLGlCQUFpQixDQUFDO1FBRTVDLE9BQU8sK0JBQStCLENBQUM7SUFDekMsQ0FBQztDQUNGLENBQUM7QUFFRjs7R0FFRztBQUNVLFFBQUEsd0JBQXdCLEdBQUc7SUFDdEMsYUFBYTtJQUNiLG9CQUFvQjtJQUNwQixhQUFhO0lBQ2IscUJBQXFCO0NBQ3RCLENB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QUM7SUFFL0QsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLGVBQWUsQ0FDN0MsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDakMsSUFBSSxDQUFDLGlCQUFpQixDQUN2QixDQUFDO0lBRUYsT0FBTyxDQUNMLFdBQUksQ0FBQyxZQUFZLENBQUE7c0JBQ0MsaUNBQWlDLENBQUMsYUFBYSxDQUFDO3FCQUVoRSxjQUFjO1FBQ1osQ0FBQyxDQUFDLGlDQUFpQyxDQUFDLFlBQVksQ0FBQztRQUNqRCxDQUFDLENBQUMsd0NBQ047d0JBRUUsaUJBQWlCLFlBQVksZ0JBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FDdEU7R0FDRCxHQUFHLElBQUksQ0FDUCxDQUFDO0FBQ0osQ0FBQztBQXhCRCx3REF3QkM7QUFFTSxLQUFLLFVBQVUsa0JBQWtCLENBQUMsS0FBeUI7SUFDaEUsSUFBSTtRQUNGLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBQSxxQkFBWSxFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQSxTQUFTLGFBQVQsU0FBUyx1QkFBVCxTQUFTLENBQUUsTUFBTSxHQUFHLFdBQVcsQ0FBQyxNQUFLLFNBQVMsRUFBRTtZQUNsRCxPQUFPLElBQUksQ0FBQztTQUNiO0tBQ0Y7SUFBQyxXQUFNLEdBQUU7SUFFVixPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFURCxnREFTQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBhbmFseXRpY3MsIGpzb24sIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnO1xuaW1wb3J0ICogYXMgaW5xdWlyZXIgZnJvbSAnaW5xdWlyZXInO1xuaW1wb3J0IHsgdjQgYXMgdXVpZFY0IH0gZnJvbSAndXVpZCc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCBnZXRXb3Jrc3BhY2VSYXcgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3R0eSc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3ZlcnNpb24nO1xuaW1wb3J0IHsgQW5hbHl0aWNzQ29sbGVjdG9yIH0gZnJvbSAnLi9hbmFseXRpY3MtY29sbGVjdG9yJztcbmltcG9ydCB7IGFuYWx5dGljc0Rpc2FibGVkLCBhbmFseXRpY3NTaGFyZURpc2FibGVkIH0gZnJvbSAnLi9hbmFseXRpY3MtZW52aXJvbm1lbnQtb3B0aW9ucyc7XG5cbi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmNvbnN0IGFuYWx5dGljc0RlYnVnID0gZGVidWcoJ25nOmFuYWx5dGljcycpOyAvLyBHZW5lcmF0ZSBhbmFseXRpY3MsIGluY2x1ZGluZyBzZXR0aW5ncyBhbmQgdXNlcnMuXG5cbmxldCBfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlOiBzdHJpbmc7XG5leHBvcnQgY29uc3QgQW5hbHl0aWNzUHJvcGVydGllcyA9IHtcbiAgQW5ndWxhckNsaVByb2Q6ICdVQS04NTk0MzQ2LTI5JyxcbiAgQW5ndWxhckNsaVN0YWdpbmc6ICdVQS04NTk0MzQ2LTMyJyxcbiAgZ2V0IEFuZ3VsYXJDbGlEZWZhdWx0KCk6IHN0cmluZyB7XG4gICAgaWYgKF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGUpIHtcbiAgICAgIHJldHVybiBfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlO1xuICAgIH1cblxuICAgIGNvbnN0IHYgPSBWRVJTSU9OLmZ1bGw7XG4gICAgLy8gVGhlIGxvZ2ljIGlzIGlmIGl0J3MgYSBmdWxsIHZlcnNpb24gdGhlbiB3ZSBzaG91bGQgdXNlIHRoZSBwcm9kIEdBIHByb3BlcnR5LlxuICAgIF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGUgPVxuICAgICAgL15cXGQrXFwuXFxkK1xcLlxcZCskLy50ZXN0KHYpICYmIHYgIT09ICcwLjAuMCdcbiAgICAgICAgPyBBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlQcm9kXG4gICAgICAgIDogQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpU3RhZ2luZztcblxuICAgIHJldHVybiBfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlO1xuICB9LFxufTtcblxuLyoqXG4gKiBUaGlzIGlzIHRoZSB1bHRpbWF0ZSBzYWZlbGlzdCBmb3IgY2hlY2tpbmcgaWYgYSBwYWNrYWdlIG5hbWUgaXMgc2FmZSB0byByZXBvcnQgdG8gYW5hbHl0aWNzLlxuICovXG5leHBvcnQgY29uc3QgYW5hbHl0aWNzUGFja2FnZVNhZmVsaXN0ID0gW1xuICAvXkBhbmd1bGFyXFwvLyxcbiAgL15AYW5ndWxhci1kZXZraXRcXC8vLFxuICAvXkBuZ3Rvb2xzXFwvLyxcbiAgJ0BzY2hlbWF0aWNzL2FuZ3VsYXInLFxuXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gYW5hbHl0aWNzUGFja2FnZVNhZmVsaXN0LnNvbWUoKHBhdHRlcm4pID0+IHtcbiAgICBpZiAodHlwZW9mIHBhdHRlcm4gPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBwYXR0ZXJuID09PSBuYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcGF0dGVybi50ZXN0KG5hbWUpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogU2V0IGFuYWx5dGljcyBzZXR0aW5ncy4gVGhpcyBkb2VzIG5vdCB3b3JrIGlmIHRoZSB1c2VyIGlzIG5vdCBpbnNpZGUgYSBwcm9qZWN0LlxuICogQHBhcmFtIGdsb2JhbCBXaGljaCBjb25maWcgdG8gdXNlLiBcImdsb2JhbFwiIGZvciB1c2VyLWxldmVsLCBhbmQgXCJsb2NhbFwiIGZvciBwcm9qZWN0LWxldmVsLlxuICogQHBhcmFtIHZhbHVlIEVpdGhlciBhIHVzZXIgSUQsIHRydWUgdG8gZ2VuZXJhdGUgYSBuZXcgVXNlciBJRCwgb3IgZmFsc2UgdG8gZGlzYWJsZSBhbmFseXRpY3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRBbmFseXRpY3NDb25maWcoZ2xvYmFsOiBib29sZWFuLCB2YWx1ZTogc3RyaW5nIHwgYm9vbGVhbik6IHZvaWQge1xuICBjb25zdCBsZXZlbCA9IGdsb2JhbCA/ICdnbG9iYWwnIDogJ2xvY2FsJztcbiAgYW5hbHl0aWNzRGVidWcoJ3NldHRpbmcgJXMgbGV2ZWwgYW5hbHl0aWNzIHRvOiAlcycsIGxldmVsLCB2YWx1ZSk7XG4gIGNvbnN0IFtjb25maWcsIGNvbmZpZ1BhdGhdID0gZ2V0V29ya3NwYWNlUmF3KGxldmVsKTtcbiAgaWYgKCFjb25maWcgfHwgIWNvbmZpZ1BhdGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kICR7bGV2ZWx9IHdvcmtzcGFjZS5gKTtcbiAgfVxuXG4gIGNvbnN0IGNsaSA9IGNvbmZpZy5nZXQoWydjbGknXSk7XG5cbiAgaWYgKGNsaSAhPT0gdW5kZWZpbmVkICYmICFqc29uLmlzSnNvbk9iamVjdChjbGkgYXMganNvbi5Kc29uVmFsdWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZyBmb3VuZCBhdCAke2NvbmZpZ1BhdGh9LiBDTEkgc2hvdWxkIGJlIGFuIG9iamVjdC5gKTtcbiAgfVxuXG4gIGlmICh2YWx1ZSA9PT0gdHJ1ZSkge1xuICAgIHZhbHVlID0gdXVpZFY0KCk7XG4gIH1cblxuICBjb25maWcubW9kaWZ5KFsnY2xpJywgJ2FuYWx5dGljcyddLCB2YWx1ZSk7XG4gIGNvbmZpZy5zYXZlKCk7XG5cbiAgYW5hbHl0aWNzRGVidWcoJ2RvbmUnKTtcbn1cblxuLyoqXG4gKiBQcm9tcHQgdGhlIHVzZXIgZm9yIHVzYWdlIGdhdGhlcmluZyBwZXJtaXNzaW9uLlxuICogQHBhcmFtIGZvcmNlIFdoZXRoZXIgdG8gYXNrIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBvciBub3QgdGhlIHVzZXIgaXMgdXNpbmcgYW4gaW50ZXJhY3RpdmUgc2hlbGwuXG4gKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIHdhcyBzaG93biBhIHByb21wdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByb21wdEFuYWx5dGljcyhnbG9iYWw6IGJvb2xlYW4sIGZvcmNlID0gZmFsc2UpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ3Byb21wdGluZyB1c2VyJyk7XG4gIGNvbnN0IGxldmVsID0gZ2xvYmFsID8gJ2dsb2JhbCcgOiAnbG9jYWwnO1xuICBjb25zdCBbY29uZmlnLCBjb25maWdQYXRoXSA9IGdldFdvcmtzcGFjZVJhdyhsZXZlbCk7XG4gIGlmICghY29uZmlnIHx8ICFjb25maWdQYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBhICR7bGV2ZWx9IHdvcmtzcGFjZS4gQXJlIHlvdSBpbiBhIHByb2plY3Q/YCk7XG4gIH1cblxuICBpZiAoZm9yY2UgfHwgaXNUVFkoKSkge1xuICAgIGNvbnN0IGFuc3dlcnMgPSBhd2FpdCBpbnF1aXJlci5wcm9tcHQ8eyBhbmFseXRpY3M6IGJvb2xlYW4gfT4oW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnY29uZmlybScsXG4gICAgICAgIG5hbWU6ICdhbmFseXRpY3MnLFxuICAgICAgICBtZXNzYWdlOiB0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBXb3VsZCB5b3UgbGlrZSB0byBzaGFyZSBhbm9ueW1vdXMgdXNhZ2UgZGF0YSBhYm91dCB0aGlzIHByb2plY3Qgd2l0aCB0aGUgQW5ndWxhciBUZWFtIGF0XG4gICAgICAgICAgR29vZ2xlIHVuZGVyIEdvb2dsZeKAmXMgUHJpdmFjeSBQb2xpY3kgYXQgaHR0cHM6Ly9wb2xpY2llcy5nb29nbGUuY29tL3ByaXZhY3kuIEZvciBtb3JlXG4gICAgICAgICAgZGV0YWlscyBhbmQgaG93IHRvIGNoYW5nZSB0aGlzIHNldHRpbmcsIHNlZSBodHRwczovL2FuZ3VsYXIuaW8vYW5hbHl0aWNzLlxuXG4gICAgICAgIGAsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSxcbiAgICBdKTtcblxuICAgIHNldEFuYWx5dGljc0NvbmZpZyhnbG9iYWwsIGFuc3dlcnMuYW5hbHl0aWNzKTtcblxuICAgIGlmIChhbnN3ZXJzLmFuYWx5dGljcykge1xuICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgY29uc29sZS5sb2coXG4gICAgICAgIHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIFRoYW5rIHlvdSBmb3Igc2hhcmluZyBhbm9ueW1vdXMgdXNhZ2UgZGF0YS4gU2hvdWxkIHlvdSBjaGFuZ2UgeW91ciBtaW5kLCB0aGUgZm9sbG93aW5nXG4gICAgICAgIGNvbW1hbmQgd2lsbCBkaXNhYmxlIHRoaXMgZmVhdHVyZSBlbnRpcmVseTpcblxuICAgICAgICAgICAgJHtjb2xvcnMueWVsbG93KGBuZyBhbmFseXRpY3MgZGlzYWJsZSR7Z2xvYmFsID8gJyAtLWdsb2JhbCcgOiAnJ31gKX1cbiAgICAgIGAsXG4gICAgICApO1xuICAgICAgY29uc29sZS5sb2coJycpO1xuXG4gICAgICAvLyBTZW5kIGJhY2sgYSBwaW5nIHdpdGggdGhlIHVzZXIgYG9wdGluYC5cbiAgICAgIGNvbnN0IHVhID0gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlEZWZhdWx0LCAnb3B0aW4nKTtcbiAgICAgIHVhLnBhZ2V2aWV3KCcvdGVsZW1ldHJ5L3Byb2plY3Qvb3B0aW4nKTtcbiAgICAgIGF3YWl0IHVhLmZsdXNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNlbmQgYmFjayBhIHBpbmcgd2l0aCB0aGUgdXNlciBgb3B0b3V0YC4gVGhpcyBpcyB0aGUgb25seSB0aGluZyB3ZSBzZW5kLlxuICAgICAgY29uc3QgdWEgPSBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaURlZmF1bHQsICdvcHRvdXQnKTtcbiAgICAgIHVhLnBhZ2V2aWV3KCcvdGVsZW1ldHJ5L3Byb2plY3Qvb3B0b3V0Jyk7XG4gICAgICBhd2FpdCB1YS5mbHVzaCgpO1xuICAgIH1cblxuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGF3YWl0IGdldEFuYWx5dGljc0luZm9TdHJpbmcoKSk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGFuYWx5dGljcyBvYmplY3QgZm9yIHRoZSB1c2VyLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QW5hbHl0aWNzKFxuICBsZXZlbDogJ2xvY2FsJyB8ICdnbG9iYWwnLFxuKTogUHJvbWlzZTxBbmFseXRpY3NDb2xsZWN0b3IgfCB1bmRlZmluZWQ+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ2dldEFuYWx5dGljcycpO1xuXG4gIGlmIChhbmFseXRpY3NEaXNhYmxlZCkge1xuICAgIGFuYWx5dGljc0RlYnVnKCdOR19DTElfQU5BTFlUSUNTIGlzIGZhbHNlJyk7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UobGV2ZWwpO1xuICAgIGNvbnN0IGFuYWx5dGljc0NvbmZpZzogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCB8IHsgdWlkPzogc3RyaW5nIH0gPVxuICAgICAgd29ya3NwYWNlPy5nZXRDbGkoKVsnYW5hbHl0aWNzJ107XG4gICAgYW5hbHl0aWNzRGVidWcoJ1dvcmtzcGFjZSBBbmFseXRpY3MgY29uZmlnIGZvdW5kOiAlaicsIGFuYWx5dGljc0NvbmZpZyk7XG5cbiAgICBpZiAoIWFuYWx5dGljc0NvbmZpZykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHVpZDogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgICBpZiAodHlwZW9mIGFuYWx5dGljc0NvbmZpZyA9PSAnc3RyaW5nJykge1xuICAgICAgICB1aWQgPSBhbmFseXRpY3NDb25maWc7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhbmFseXRpY3NDb25maWcgPT0gJ29iamVjdCcgJiYgdHlwZW9mIGFuYWx5dGljc0NvbmZpZ1sndWlkJ10gPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdWlkID0gYW5hbHl0aWNzQ29uZmlnWyd1aWQnXTtcbiAgICAgIH1cblxuICAgICAgYW5hbHl0aWNzRGVidWcoJ2NsaWVudCBpZDogJWonLCB1aWQpO1xuICAgICAgaWYgKHVpZCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpRGVmYXVsdCwgdWlkKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGFuYWx5dGljc0RlYnVnKCdFcnJvciBoYXBwZW5lZCBkdXJpbmcgcmVhZGluZyBvZiBhbmFseXRpY3MgY29uZmlnOiAlcycsIGVyci5tZXNzYWdlKTtcblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIHVzYWdlIGFuYWx5dGljcyBzaGFyaW5nIHNldHRpbmcsIHdoaWNoIGlzIGVpdGhlciBhIHByb3BlcnR5IHN0cmluZyAoR0EtWFhYWFhYWC1YWCksXG4gKiBvciB1bmRlZmluZWQgaWYgbm8gc2hhcmluZy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFNoYXJlZEFuYWx5dGljcygpOiBQcm9taXNlPEFuYWx5dGljc0NvbGxlY3RvciB8IHVuZGVmaW5lZD4ge1xuICBhbmFseXRpY3NEZWJ1ZygnZ2V0U2hhcmVkQW5hbHl0aWNzJyk7XG5cbiAgaWYgKGFuYWx5dGljc1NoYXJlRGlzYWJsZWQpIHtcbiAgICBhbmFseXRpY3NEZWJ1ZygnTkdfQ0xJX0FOQUxZVElDUyBpcyBmYWxzZScpO1xuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIElmIGFueXRoaW5nIGhhcHBlbnMgd2UganVzdCBrZWVwIHRoZSBOT09QIGFuYWx5dGljcy5cbiAgdHJ5IHtcbiAgICBjb25zdCBnbG9iYWxXb3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIGNvbnN0IGFuYWx5dGljc0NvbmZpZyA9IGdsb2JhbFdvcmtzcGFjZT8uZ2V0Q2xpKClbJ2FuYWx5dGljc1NoYXJpbmcnXTtcblxuICAgIGlmICghYW5hbHl0aWNzQ29uZmlnIHx8ICFhbmFseXRpY3NDb25maWcudHJhY2tpbmcgfHwgIWFuYWx5dGljc0NvbmZpZy51dWlkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnQW5hbHl0aWNzIHNoYXJpbmcgaW5mbzogJWonLCBhbmFseXRpY3NDb25maWcpO1xuXG4gICAgICByZXR1cm4gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihhbmFseXRpY3NDb25maWcudHJhY2tpbmcsIGFuYWx5dGljc0NvbmZpZy51dWlkKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGFuYWx5dGljc0RlYnVnKCdFcnJvciBoYXBwZW5lZCBkdXJpbmcgcmVhZGluZyBvZiBhbmFseXRpY3Mgc2hhcmluZyBjb25maWc6ICVzJywgZXJyLm1lc3NhZ2UpO1xuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQW5hbHl0aWNzKFxuICB3b3Jrc3BhY2U6IGJvb2xlYW4sXG4gIHNraXBQcm9tcHQgPSBmYWxzZSxcbik6IFByb21pc2U8YW5hbHl0aWNzLkFuYWx5dGljcz4ge1xuICBsZXQgY29uZmlnOiBhbmFseXRpY3MuQW5hbHl0aWNzIHwgdW5kZWZpbmVkO1xuICBjb25zdCBpc0Rpc2FibGVkR2xvYmFsbHkgPSAoYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKSk/LmdldENsaSgpWydhbmFseXRpY3MnXSA9PT0gZmFsc2U7XG4gIC8vIElmIGluIHdvcmtzcGFjZSBhbmQgZ2xvYmFsIGFuYWx5dGljcyBpcyBlbmFibGVkLCBkZWZlciB0byB3b3Jrc3BhY2UgbGV2ZWxcbiAgaWYgKHdvcmtzcGFjZSAmJiAhaXNEaXNhYmxlZEdsb2JhbGx5KSB7XG4gICAgY29uc3Qgc2tpcEFuYWx5dGljcyA9IHNraXBQcm9tcHQgfHwgYW5hbHl0aWNzRGlzYWJsZWQ7XG4gICAgLy8gVE9ETzogVGhpcyBzaG91bGQgaG9ub3IgdGhlIGBuby1pbnRlcmFjdGl2ZWAgb3B0aW9uLlxuICAgIC8vICAgICAgIEl0IGlzIGN1cnJlbnRseSBub3QgYW4gYG5nYCBvcHRpb24gYnV0IHJhdGhlciBvbmx5IGFuIG9wdGlvbiBmb3Igc3BlY2lmaWMgY29tbWFuZHMuXG4gICAgLy8gICAgICAgVGhlIGNvbmNlcHQgb2YgYG5nYC13aWRlIG9wdGlvbnMgYXJlIG5lZWRlZCB0byBjbGVhbmx5IGhhbmRsZSB0aGlzLlxuICAgIGlmICghc2tpcEFuYWx5dGljcyAmJiAhKGF3YWl0IGhhc0FuYWx5dGljc0NvbmZpZygnbG9jYWwnKSkpIHtcbiAgICAgIGF3YWl0IHByb21wdEFuYWx5dGljcyhmYWxzZSk7XG4gICAgfVxuICAgIGNvbmZpZyA9IGF3YWl0IGdldEFuYWx5dGljcygnbG9jYWwnKTtcbiAgfSBlbHNlIHtcbiAgICBjb25maWcgPSBhd2FpdCBnZXRBbmFseXRpY3MoJ2dsb2JhbCcpO1xuICB9XG5cbiAgY29uc3QgbWF5YmVTaGFyZWRBbmFseXRpY3MgPSBhd2FpdCBnZXRTaGFyZWRBbmFseXRpY3MoKTtcblxuICBpZiAoY29uZmlnICYmIG1heWJlU2hhcmVkQW5hbHl0aWNzKSB7XG4gICAgcmV0dXJuIG5ldyBhbmFseXRpY3MuTXVsdGlBbmFseXRpY3MoW2NvbmZpZywgbWF5YmVTaGFyZWRBbmFseXRpY3NdKTtcbiAgfSBlbHNlIGlmIChjb25maWcpIHtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9IGVsc2UgaWYgKG1heWJlU2hhcmVkQW5hbHl0aWNzKSB7XG4gICAgcmV0dXJuIG1heWJlU2hhcmVkQW5hbHl0aWNzO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhbmFseXRpY3NDb25maWdWYWx1ZVRvSHVtYW5Gb3JtYXQodmFsdWU6IHVua25vd24pOiAnZW5hYmxlZCcgfCAnZGlzYWJsZWQnIHwgJ25vdCBzZXQnIHtcbiAgaWYgKHZhbHVlID09PSBmYWxzZSkge1xuICAgIHJldHVybiAnZGlzYWJsZWQnO1xuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHwgdmFsdWUgPT09IHRydWUpIHtcbiAgICByZXR1cm4gJ2VuYWJsZWQnO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnbm90IHNldCc7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFuYWx5dGljc0luZm9TdHJpbmcoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgW2dsb2JhbFdvcmtzcGFjZV0gPSBnZXRXb3Jrc3BhY2VSYXcoJ2dsb2JhbCcpO1xuICBjb25zdCBbbG9jYWxXb3Jrc3BhY2VdID0gZ2V0V29ya3NwYWNlUmF3KCdsb2NhbCcpO1xuICBjb25zdCBnbG9iYWxTZXR0aW5nID0gZ2xvYmFsV29ya3NwYWNlPy5nZXQoWydjbGknLCAnYW5hbHl0aWNzJ10pO1xuICBjb25zdCBsb2NhbFNldHRpbmcgPSBsb2NhbFdvcmtzcGFjZT8uZ2V0KFsnY2xpJywgJ2FuYWx5dGljcyddKTtcblxuICBjb25zdCBhbmFseXRpY3NJbnN0YW5jZSA9IGF3YWl0IGNyZWF0ZUFuYWx5dGljcyhcbiAgICAhIWxvY2FsV29ya3NwYWNlIC8qKiB3b3Jrc3BhY2UgKi8sXG4gICAgdHJ1ZSAvKiogc2tpcFByb21wdCAqLyxcbiAgKTtcblxuICByZXR1cm4gKFxuICAgIHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgIEdsb2JhbCBzZXR0aW5nOiAke2FuYWx5dGljc0NvbmZpZ1ZhbHVlVG9IdW1hbkZvcm1hdChnbG9iYWxTZXR0aW5nKX1cbiAgICBMb2NhbCBzZXR0aW5nOiAke1xuICAgICAgbG9jYWxXb3Jrc3BhY2VcbiAgICAgICAgPyBhbmFseXRpY3NDb25maWdWYWx1ZVRvSHVtYW5Gb3JtYXQobG9jYWxTZXR0aW5nKVxuICAgICAgICA6ICdObyBsb2NhbCB3b3Jrc3BhY2UgY29uZmlndXJhdGlvbiBmaWxlLidcbiAgICB9XG4gICAgRWZmZWN0aXZlIHN0YXR1czogJHtcbiAgICAgIGFuYWx5dGljc0luc3RhbmNlIGluc3RhbmNlb2YgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MgPyAnZGlzYWJsZWQnIDogJ2VuYWJsZWQnXG4gICAgfVxuICBgICsgJ1xcbidcbiAgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhc0FuYWx5dGljc0NvbmZpZyhsZXZlbDogJ2xvY2FsJyB8ICdnbG9iYWwnKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGxldmVsKTtcbiAgICBpZiAod29ya3NwYWNlPy5nZXRDbGkoKVsnYW5hbHl0aWNzJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGNhdGNoIHt9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuIl19