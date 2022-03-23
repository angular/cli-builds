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
exports.getAnalyticsInfoString = exports.createAnalytics = exports.getSharedAnalytics = exports.getAnalytics = exports.promptAnalytics = exports.setAnalyticsConfig = exports.isPackageNameSafeForAnalytics = exports.analyticsPackageSafelist = exports.AnalyticsProperties = void 0;
const core_1 = require("@angular-devkit/core");
const debug_1 = __importDefault(require("debug"));
const uuid_1 = require("uuid");
const color_1 = require("../utilities/color");
const config_1 = require("../utilities/config");
const environment_options_1 = require("../utilities/environment-options");
const tty_1 = require("../utilities/tty");
const version_1 = require("../utilities/version");
const analytics_collector_1 = require("./analytics-collector");
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
        const { prompt } = await Promise.resolve().then(() => __importStar(require('inquirer')));
        const answers = await prompt([
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
 *
 * @returns
 * - `AnalyticsCollector` when enabled.
 * - `analytics.NoopAnalytics` when disabled.
 * - `undefined` when not configured.
 */
async function getAnalytics(level) {
    analyticsDebug('getAnalytics');
    if (environment_options_1.analyticsDisabled) {
        analyticsDebug('NG_CLI_ANALYTICS is false');
        return new core_1.analytics.NoopAnalytics();
    }
    try {
        const workspace = await (0, config_1.getWorkspace)(level);
        const analyticsConfig = workspace === null || workspace === void 0 ? void 0 : workspace.getCli()['analytics'];
        analyticsDebug('Workspace Analytics config found: %j', analyticsConfig);
        if (analyticsConfig === false) {
            return new core_1.analytics.NoopAnalytics();
        }
        else if (analyticsConfig === undefined || analyticsConfig === null) {
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
    if (environment_options_1.analyticsShareDisabled) {
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
    // Global config takes precedence over local config only for the disabled check.
    // IE:
    // global: disabled & local: enabled = disabled
    // global: id: 123 & local: id: 456 = 456
    var _a;
    // check global
    const globalConfig = await getAnalytics('global');
    if (globalConfig instanceof core_1.analytics.NoopAnalytics) {
        return globalConfig;
    }
    let config = globalConfig;
    // Not disabled globally, check locally.
    if (workspace) {
        let localConfig = await getAnalytics('local');
        if (localConfig === undefined) {
            if (!skipPrompt) {
                // local is not unset, prompt user.
                // TODO: This should honor the `no-interactive` option.
                // It is currently not an `ng` option but rather only an option for specific commands.
                // The concept of `ng`-wide options are needed to cleanly handle this.
                await promptAnalytics(false);
                localConfig = await getAnalytics('local');
            }
        }
        if (localConfig instanceof core_1.analytics.NoopAnalytics) {
            return localConfig;
        }
        else if (localConfig) {
            // Favor local settings over global when defined.
            config = localConfig;
        }
    }
    // Get shared analytics
    // TODO: evalute if this should be completly removed.
    const maybeSharedAnalytics = await getSharedAnalytics();
    if (config && maybeSharedAnalytics) {
        return new core_1.analytics.MultiAnalytics([config, maybeSharedAnalytics]);
    }
    return (_a = config !== null && config !== void 0 ? config : maybeSharedAnalytics) !== null && _a !== void 0 ? _a : new core_1.analytics.NoopAnalytics();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2FuYWx5dGljcy9hbmFseXRpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBNkQ7QUFDN0Qsa0RBQTBCO0FBQzFCLCtCQUFvQztBQUNwQyw4Q0FBNEM7QUFDNUMsZ0RBQW9FO0FBQ3BFLDBFQUE2RjtBQUM3RiwwQ0FBeUM7QUFDekMsa0RBQStDO0FBQy9DLCtEQUEyRDtBQUUzRCwrQkFBK0I7QUFDL0IsTUFBTSxjQUFjLEdBQUcsSUFBQSxlQUFLLEVBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxvREFBb0Q7QUFFbEcsSUFBSSwrQkFBdUMsQ0FBQztBQUMvQixRQUFBLG1CQUFtQixHQUFHO0lBQ2pDLGNBQWMsRUFBRSxlQUFlO0lBQy9CLGlCQUFpQixFQUFFLGVBQWU7SUFDbEMsSUFBSSxpQkFBaUI7UUFDbkIsSUFBSSwrQkFBK0IsRUFBRTtZQUNuQyxPQUFPLCtCQUErQixDQUFDO1NBQ3hDO1FBRUQsTUFBTSxDQUFDLEdBQUcsaUJBQU8sQ0FBQyxJQUFJLENBQUM7UUFDdkIsK0VBQStFO1FBQy9FLCtCQUErQjtZQUM3QixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLE9BQU87Z0JBQ3hDLENBQUMsQ0FBQywyQkFBbUIsQ0FBQyxjQUFjO2dCQUNwQyxDQUFDLENBQUMsMkJBQW1CLENBQUMsaUJBQWlCLENBQUM7UUFFNUMsT0FBTywrQkFBK0IsQ0FBQztJQUN6QyxDQUFDO0NBQ0YsQ0FBQztBQUVGOztHQUVHO0FBQ1UsUUFBQSx3QkFBd0IsR0FBRztJQUN0QyxhQUFhO0lBQ2Isb0JBQW9CO0lBQ3BCLGFBQWE7SUFDYixxQkFBcUI7Q0FDdEIsQ0FBQztBQUVGLFNBQWdC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QUMsUUFBUSxDQUFDLENBQUM7SUFDcEQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLElBQUEsd0JBQWUsRUFBQyxPQUFPLENBQUMsQ0FBQztJQUNsRCxNQUFNLGFBQWEsR0FBRyxlQUFlLGFBQWYsZUFBZSx1QkFBZixlQUFlLENBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDakUsTUFBTSxZQUFZLEdBQUcsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBRS9ELE1BQU0saUJBQWlCLEdBQUcsTUFBTSxlQUFlLENBQzdDLENBQUMsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ2pDLElBQUksQ0FBQyxpQkFBaUIsQ0FDdkIsQ0FBQztJQUVGLE9BQU8sQ0FDTCxXQUFJLENBQUMsWUFBWSxDQUFBO3NCQUNDLGlDQUFpQyxDQUFDLGFBQWEsQ0FBQztxQkFFaEUsY0FBYztRQUNaLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxZQUFZLENBQUM7UUFDakQsQ0FBQyxDQUFDLHdDQUNOO3dCQUVFLGlCQUFpQixZQUFZLGdCQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQ3RFO0dBQ0QsR0FBRyxJQUFJLENBQ1AsQ0FBQztBQUNKLENBQUM7QUF4QkQsd0RBd0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGFuYWx5dGljcywganNvbiwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5pbXBvcnQgeyB2NCBhcyB1dWlkVjQgfSBmcm9tICd1dWlkJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UsIGdldFdvcmtzcGFjZVJhdyB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgYW5hbHl0aWNzRGlzYWJsZWQsIGFuYWx5dGljc1NoYXJlRGlzYWJsZWQgfSBmcm9tICcuLi91dGlsaXRpZXMvZW52aXJvbm1lbnQtb3B0aW9ucyc7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4uL3V0aWxpdGllcy90dHknO1xuaW1wb3J0IHsgVkVSU0lPTiB9IGZyb20gJy4uL3V0aWxpdGllcy92ZXJzaW9uJztcbmltcG9ydCB7IEFuYWx5dGljc0NvbGxlY3RvciB9IGZyb20gJy4vYW5hbHl0aWNzLWNvbGxlY3Rvcic7XG5cbi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmNvbnN0IGFuYWx5dGljc0RlYnVnID0gZGVidWcoJ25nOmFuYWx5dGljcycpOyAvLyBHZW5lcmF0ZSBhbmFseXRpY3MsIGluY2x1ZGluZyBzZXR0aW5ncyBhbmQgdXNlcnMuXG5cbmxldCBfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlOiBzdHJpbmc7XG5leHBvcnQgY29uc3QgQW5hbHl0aWNzUHJvcGVydGllcyA9IHtcbiAgQW5ndWxhckNsaVByb2Q6ICdVQS04NTk0MzQ2LTI5JyxcbiAgQW5ndWxhckNsaVN0YWdpbmc6ICdVQS04NTk0MzQ2LTMyJyxcbiAgZ2V0IEFuZ3VsYXJDbGlEZWZhdWx0KCk6IHN0cmluZyB7XG4gICAgaWYgKF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGUpIHtcbiAgICAgIHJldHVybiBfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlO1xuICAgIH1cblxuICAgIGNvbnN0IHYgPSBWRVJTSU9OLmZ1bGw7XG4gICAgLy8gVGhlIGxvZ2ljIGlzIGlmIGl0J3MgYSBmdWxsIHZlcnNpb24gdGhlbiB3ZSBzaG91bGQgdXNlIHRoZSBwcm9kIEdBIHByb3BlcnR5LlxuICAgIF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGUgPVxuICAgICAgL15cXGQrXFwuXFxkK1xcLlxcZCskLy50ZXN0KHYpICYmIHYgIT09ICcwLjAuMCdcbiAgICAgICAgPyBBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlQcm9kXG4gICAgICAgIDogQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpU3RhZ2luZztcblxuICAgIHJldHVybiBfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlO1xuICB9LFxufTtcblxuLyoqXG4gKiBUaGlzIGlzIHRoZSB1bHRpbWF0ZSBzYWZlbGlzdCBmb3IgY2hlY2tpbmcgaWYgYSBwYWNrYWdlIG5hbWUgaXMgc2FmZSB0byByZXBvcnQgdG8gYW5hbHl0aWNzLlxuICovXG5leHBvcnQgY29uc3QgYW5hbHl0aWNzUGFja2FnZVNhZmVsaXN0ID0gW1xuICAvXkBhbmd1bGFyXFwvLyxcbiAgL15AYW5ndWxhci1kZXZraXRcXC8vLFxuICAvXkBuZ3Rvb2xzXFwvLyxcbiAgJ0BzY2hlbWF0aWNzL2FuZ3VsYXInLFxuXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gYW5hbHl0aWNzUGFja2FnZVNhZmVsaXN0LnNvbWUoKHBhdHRlcm4pID0+IHtcbiAgICBpZiAodHlwZW9mIHBhdHRlcm4gPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBwYXR0ZXJuID09PSBuYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcGF0dGVybi50ZXN0KG5hbWUpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogU2V0IGFuYWx5dGljcyBzZXR0aW5ncy4gVGhpcyBkb2VzIG5vdCB3b3JrIGlmIHRoZSB1c2VyIGlzIG5vdCBpbnNpZGUgYSBwcm9qZWN0LlxuICogQHBhcmFtIGdsb2JhbCBXaGljaCBjb25maWcgdG8gdXNlLiBcImdsb2JhbFwiIGZvciB1c2VyLWxldmVsLCBhbmQgXCJsb2NhbFwiIGZvciBwcm9qZWN0LWxldmVsLlxuICogQHBhcmFtIHZhbHVlIEVpdGhlciBhIHVzZXIgSUQsIHRydWUgdG8gZ2VuZXJhdGUgYSBuZXcgVXNlciBJRCwgb3IgZmFsc2UgdG8gZGlzYWJsZSBhbmFseXRpY3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRBbmFseXRpY3NDb25maWcoZ2xvYmFsOiBib29sZWFuLCB2YWx1ZTogc3RyaW5nIHwgYm9vbGVhbik6IHZvaWQge1xuICBjb25zdCBsZXZlbCA9IGdsb2JhbCA/ICdnbG9iYWwnIDogJ2xvY2FsJztcbiAgYW5hbHl0aWNzRGVidWcoJ3NldHRpbmcgJXMgbGV2ZWwgYW5hbHl0aWNzIHRvOiAlcycsIGxldmVsLCB2YWx1ZSk7XG4gIGNvbnN0IFtjb25maWcsIGNvbmZpZ1BhdGhdID0gZ2V0V29ya3NwYWNlUmF3KGxldmVsKTtcbiAgaWYgKCFjb25maWcgfHwgIWNvbmZpZ1BhdGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kICR7bGV2ZWx9IHdvcmtzcGFjZS5gKTtcbiAgfVxuXG4gIGNvbnN0IGNsaSA9IGNvbmZpZy5nZXQoWydjbGknXSk7XG5cbiAgaWYgKGNsaSAhPT0gdW5kZWZpbmVkICYmICFqc29uLmlzSnNvbk9iamVjdChjbGkgYXMganNvbi5Kc29uVmFsdWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZyBmb3VuZCBhdCAke2NvbmZpZ1BhdGh9LiBDTEkgc2hvdWxkIGJlIGFuIG9iamVjdC5gKTtcbiAgfVxuXG4gIGlmICh2YWx1ZSA9PT0gdHJ1ZSkge1xuICAgIHZhbHVlID0gdXVpZFY0KCk7XG4gIH1cblxuICBjb25maWcubW9kaWZ5KFsnY2xpJywgJ2FuYWx5dGljcyddLCB2YWx1ZSk7XG4gIGNvbmZpZy5zYXZlKCk7XG5cbiAgYW5hbHl0aWNzRGVidWcoJ2RvbmUnKTtcbn1cblxuLyoqXG4gKiBQcm9tcHQgdGhlIHVzZXIgZm9yIHVzYWdlIGdhdGhlcmluZyBwZXJtaXNzaW9uLlxuICogQHBhcmFtIGZvcmNlIFdoZXRoZXIgdG8gYXNrIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBvciBub3QgdGhlIHVzZXIgaXMgdXNpbmcgYW4gaW50ZXJhY3RpdmUgc2hlbGwuXG4gKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIHdhcyBzaG93biBhIHByb21wdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByb21wdEFuYWx5dGljcyhnbG9iYWw6IGJvb2xlYW4sIGZvcmNlID0gZmFsc2UpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ3Byb21wdGluZyB1c2VyJyk7XG4gIGNvbnN0IGxldmVsID0gZ2xvYmFsID8gJ2dsb2JhbCcgOiAnbG9jYWwnO1xuICBjb25zdCBbY29uZmlnLCBjb25maWdQYXRoXSA9IGdldFdvcmtzcGFjZVJhdyhsZXZlbCk7XG4gIGlmICghY29uZmlnIHx8ICFjb25maWdQYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBhICR7bGV2ZWx9IHdvcmtzcGFjZS4gQXJlIHlvdSBpbiBhIHByb2plY3Q/YCk7XG4gIH1cblxuICBpZiAoZm9yY2UgfHwgaXNUVFkoKSkge1xuICAgIGNvbnN0IHsgcHJvbXB0IH0gPSBhd2FpdCBpbXBvcnQoJ2lucXVpcmVyJyk7XG4gICAgY29uc3QgYW5zd2VycyA9IGF3YWl0IHByb21wdDx7IGFuYWx5dGljczogYm9vbGVhbiB9PihbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjb25maXJtJyxcbiAgICAgICAgbmFtZTogJ2FuYWx5dGljcycsXG4gICAgICAgIG1lc3NhZ2U6IHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICAgIFdvdWxkIHlvdSBsaWtlIHRvIHNoYXJlIGFub255bW91cyB1c2FnZSBkYXRhIGFib3V0IHRoaXMgcHJvamVjdCB3aXRoIHRoZSBBbmd1bGFyIFRlYW0gYXRcbiAgICAgICAgICBHb29nbGUgdW5kZXIgR29vZ2xl4oCZcyBQcml2YWN5IFBvbGljeSBhdCBodHRwczovL3BvbGljaWVzLmdvb2dsZS5jb20vcHJpdmFjeS4gRm9yIG1vcmVcbiAgICAgICAgICBkZXRhaWxzIGFuZCBob3cgdG8gY2hhbmdlIHRoaXMgc2V0dGluZywgc2VlIGh0dHBzOi8vYW5ndWxhci5pby9hbmFseXRpY3MuXG5cbiAgICAgICAgYCxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9LFxuICAgIF0pO1xuXG4gICAgc2V0QW5hbHl0aWNzQ29uZmlnKGdsb2JhbCwgYW5zd2Vycy5hbmFseXRpY3MpO1xuXG4gICAgaWYgKGFuc3dlcnMuYW5hbHl0aWNzKSB7XG4gICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgdGFncy5zdHJpcEluZGVudGBcbiAgICAgICAgVGhhbmsgeW91IGZvciBzaGFyaW5nIGFub255bW91cyB1c2FnZSBkYXRhLiBTaG91bGQgeW91IGNoYW5nZSB5b3VyIG1pbmQsIHRoZSBmb2xsb3dpbmdcbiAgICAgICAgY29tbWFuZCB3aWxsIGRpc2FibGUgdGhpcyBmZWF0dXJlIGVudGlyZWx5OlxuXG4gICAgICAgICAgICAke2NvbG9ycy55ZWxsb3coYG5nIGFuYWx5dGljcyBkaXNhYmxlJHtnbG9iYWwgPyAnIC0tZ2xvYmFsJyA6ICcnfWApfVxuICAgICAgYCxcbiAgICAgICk7XG4gICAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICAgIC8vIFNlbmQgYmFjayBhIHBpbmcgd2l0aCB0aGUgdXNlciBgb3B0aW5gLlxuICAgICAgY29uc3QgdWEgPSBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaURlZmF1bHQsICdvcHRpbicpO1xuICAgICAgdWEucGFnZXZpZXcoJy90ZWxlbWV0cnkvcHJvamVjdC9vcHRpbicpO1xuICAgICAgYXdhaXQgdWEuZmx1c2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU2VuZCBiYWNrIGEgcGluZyB3aXRoIHRoZSB1c2VyIGBvcHRvdXRgLiBUaGlzIGlzIHRoZSBvbmx5IHRoaW5nIHdlIHNlbmQuXG4gICAgICBjb25zdCB1YSA9IG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpRGVmYXVsdCwgJ29wdG91dCcpO1xuICAgICAgdWEucGFnZXZpZXcoJy90ZWxlbWV0cnkvcHJvamVjdC9vcHRvdXQnKTtcbiAgICAgIGF3YWl0IHVhLmZsdXNoKCk7XG4gICAgfVxuXG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYXdhaXQgZ2V0QW5hbHl0aWNzSW5mb1N0cmluZygpKTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEdldCB0aGUgYW5hbHl0aWNzIG9iamVjdCBmb3IgdGhlIHVzZXIuXG4gKlxuICogQHJldHVybnNcbiAqIC0gYEFuYWx5dGljc0NvbGxlY3RvcmAgd2hlbiBlbmFibGVkLlxuICogLSBgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3NgIHdoZW4gZGlzYWJsZWQuXG4gKiAtIGB1bmRlZmluZWRgIHdoZW4gbm90IGNvbmZpZ3VyZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRBbmFseXRpY3MoXG4gIGxldmVsOiAnbG9jYWwnIHwgJ2dsb2JhbCcsXG4pOiBQcm9taXNlPEFuYWx5dGljc0NvbGxlY3RvciB8IGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzIHwgdW5kZWZpbmVkPiB7XG4gIGFuYWx5dGljc0RlYnVnKCdnZXRBbmFseXRpY3MnKTtcblxuICBpZiAoYW5hbHl0aWNzRGlzYWJsZWQpIHtcbiAgICBhbmFseXRpY3NEZWJ1ZygnTkdfQ0xJX0FOQUxZVElDUyBpcyBmYWxzZScpO1xuXG4gICAgcmV0dXJuIG5ldyBhbmFseXRpY3MuTm9vcEFuYWx5dGljcygpO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UobGV2ZWwpO1xuICAgIGNvbnN0IGFuYWx5dGljc0NvbmZpZzogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCB8IHsgdWlkPzogc3RyaW5nIH0gPVxuICAgICAgd29ya3NwYWNlPy5nZXRDbGkoKVsnYW5hbHl0aWNzJ107XG4gICAgYW5hbHl0aWNzRGVidWcoJ1dvcmtzcGFjZSBBbmFseXRpY3MgY29uZmlnIGZvdW5kOiAlaicsIGFuYWx5dGljc0NvbmZpZyk7XG5cbiAgICBpZiAoYW5hbHl0aWNzQ29uZmlnID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIG5ldyBhbmFseXRpY3MuTm9vcEFuYWx5dGljcygpO1xuICAgIH0gZWxzZSBpZiAoYW5hbHl0aWNzQ29uZmlnID09PSB1bmRlZmluZWQgfHwgYW5hbHl0aWNzQ29uZmlnID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgdWlkOiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgICAgIGlmICh0eXBlb2YgYW5hbHl0aWNzQ29uZmlnID09ICdzdHJpbmcnKSB7XG4gICAgICAgIHVpZCA9IGFuYWx5dGljc0NvbmZpZztcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGFuYWx5dGljc0NvbmZpZyA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgYW5hbHl0aWNzQ29uZmlnWyd1aWQnXSA9PSAnc3RyaW5nJykge1xuICAgICAgICB1aWQgPSBhbmFseXRpY3NDb25maWdbJ3VpZCddO1xuICAgICAgfVxuXG4gICAgICBhbmFseXRpY3NEZWJ1ZygnY2xpZW50IGlkOiAlaicsIHVpZCk7XG4gICAgICBpZiAodWlkID09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlEZWZhdWx0LCB1aWQpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgYW5hbHl0aWNzRGVidWcoJ0Vycm9yIGhhcHBlbmVkIGR1cmluZyByZWFkaW5nIG9mIGFuYWx5dGljcyBjb25maWc6ICVzJywgZXJyLm1lc3NhZ2UpO1xuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybiB0aGUgdXNhZ2UgYW5hbHl0aWNzIHNoYXJpbmcgc2V0dGluZywgd2hpY2ggaXMgZWl0aGVyIGEgcHJvcGVydHkgc3RyaW5nIChHQS1YWFhYWFhYLVhYKSxcbiAqIG9yIHVuZGVmaW5lZCBpZiBubyBzaGFyaW5nLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0U2hhcmVkQW5hbHl0aWNzKCk6IFByb21pc2U8QW5hbHl0aWNzQ29sbGVjdG9yIHwgdW5kZWZpbmVkPiB7XG4gIGFuYWx5dGljc0RlYnVnKCdnZXRTaGFyZWRBbmFseXRpY3MnKTtcblxuICBpZiAoYW5hbHl0aWNzU2hhcmVEaXNhYmxlZCkge1xuICAgIGFuYWx5dGljc0RlYnVnKCdOR19DTElfQU5BTFlUSUNTIGlzIGZhbHNlJyk7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gSWYgYW55dGhpbmcgaGFwcGVucyB3ZSBqdXN0IGtlZXAgdGhlIE5PT1AgYW5hbHl0aWNzLlxuICB0cnkge1xuICAgIGNvbnN0IGdsb2JhbFdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgY29uc3QgYW5hbHl0aWNzQ29uZmlnID0gZ2xvYmFsV29ya3NwYWNlPy5nZXRDbGkoKVsnYW5hbHl0aWNzU2hhcmluZyddO1xuXG4gICAgaWYgKCFhbmFseXRpY3NDb25maWcgfHwgIWFuYWx5dGljc0NvbmZpZy50cmFja2luZyB8fCAhYW5hbHl0aWNzQ29uZmlnLnV1aWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFuYWx5dGljc0RlYnVnKCdBbmFseXRpY3Mgc2hhcmluZyBpbmZvOiAlaicsIGFuYWx5dGljc0NvbmZpZyk7XG5cbiAgICAgIHJldHVybiBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKGFuYWx5dGljc0NvbmZpZy50cmFja2luZywgYW5hbHl0aWNzQ29uZmlnLnV1aWQpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgYW5hbHl0aWNzRGVidWcoJ0Vycm9yIGhhcHBlbmVkIGR1cmluZyByZWFkaW5nIG9mIGFuYWx5dGljcyBzaGFyaW5nIGNvbmZpZzogJXMnLCBlcnIubWVzc2FnZSk7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVBbmFseXRpY3MoXG4gIHdvcmtzcGFjZTogYm9vbGVhbixcbiAgc2tpcFByb21wdCA9IGZhbHNlLFxuKTogUHJvbWlzZTxhbmFseXRpY3MuQW5hbHl0aWNzPiB7XG4gIC8vIEdsb2JhbCBjb25maWcgdGFrZXMgcHJlY2VkZW5jZSBvdmVyIGxvY2FsIGNvbmZpZyBvbmx5IGZvciB0aGUgZGlzYWJsZWQgY2hlY2suXG4gIC8vIElFOlxuICAvLyBnbG9iYWw6IGRpc2FibGVkICYgbG9jYWw6IGVuYWJsZWQgPSBkaXNhYmxlZFxuICAvLyBnbG9iYWw6IGlkOiAxMjMgJiBsb2NhbDogaWQ6IDQ1NiA9IDQ1NlxuXG4gIC8vIGNoZWNrIGdsb2JhbFxuICBjb25zdCBnbG9iYWxDb25maWcgPSBhd2FpdCBnZXRBbmFseXRpY3MoJ2dsb2JhbCcpO1xuICBpZiAoZ2xvYmFsQ29uZmlnIGluc3RhbmNlb2YgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MpIHtcbiAgICByZXR1cm4gZ2xvYmFsQ29uZmlnO1xuICB9XG5cbiAgbGV0IGNvbmZpZyA9IGdsb2JhbENvbmZpZztcbiAgLy8gTm90IGRpc2FibGVkIGdsb2JhbGx5LCBjaGVjayBsb2NhbGx5LlxuICBpZiAod29ya3NwYWNlKSB7XG4gICAgbGV0IGxvY2FsQ29uZmlnID0gYXdhaXQgZ2V0QW5hbHl0aWNzKCdsb2NhbCcpO1xuICAgIGlmIChsb2NhbENvbmZpZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoIXNraXBQcm9tcHQpIHtcbiAgICAgICAgLy8gbG9jYWwgaXMgbm90IHVuc2V0LCBwcm9tcHQgdXNlci5cblxuICAgICAgICAvLyBUT0RPOiBUaGlzIHNob3VsZCBob25vciB0aGUgYG5vLWludGVyYWN0aXZlYCBvcHRpb24uXG4gICAgICAgIC8vIEl0IGlzIGN1cnJlbnRseSBub3QgYW4gYG5nYCBvcHRpb24gYnV0IHJhdGhlciBvbmx5IGFuIG9wdGlvbiBmb3Igc3BlY2lmaWMgY29tbWFuZHMuXG4gICAgICAgIC8vIFRoZSBjb25jZXB0IG9mIGBuZ2Atd2lkZSBvcHRpb25zIGFyZSBuZWVkZWQgdG8gY2xlYW5seSBoYW5kbGUgdGhpcy5cbiAgICAgICAgYXdhaXQgcHJvbXB0QW5hbHl0aWNzKGZhbHNlKTtcbiAgICAgICAgbG9jYWxDb25maWcgPSBhd2FpdCBnZXRBbmFseXRpY3MoJ2xvY2FsJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGxvY2FsQ29uZmlnIGluc3RhbmNlb2YgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MpIHtcbiAgICAgIHJldHVybiBsb2NhbENvbmZpZztcbiAgICB9IGVsc2UgaWYgKGxvY2FsQ29uZmlnKSB7XG4gICAgICAvLyBGYXZvciBsb2NhbCBzZXR0aW5ncyBvdmVyIGdsb2JhbCB3aGVuIGRlZmluZWQuXG4gICAgICBjb25maWcgPSBsb2NhbENvbmZpZztcbiAgICB9XG4gIH1cblxuICAvLyBHZXQgc2hhcmVkIGFuYWx5dGljc1xuICAvLyBUT0RPOiBldmFsdXRlIGlmIHRoaXMgc2hvdWxkIGJlIGNvbXBsZXRseSByZW1vdmVkLlxuICBjb25zdCBtYXliZVNoYXJlZEFuYWx5dGljcyA9IGF3YWl0IGdldFNoYXJlZEFuYWx5dGljcygpO1xuICBpZiAoY29uZmlnICYmIG1heWJlU2hhcmVkQW5hbHl0aWNzKSB7XG4gICAgcmV0dXJuIG5ldyBhbmFseXRpY3MuTXVsdGlBbmFseXRpY3MoW2NvbmZpZywgbWF5YmVTaGFyZWRBbmFseXRpY3NdKTtcbiAgfVxuXG4gIHJldHVybiBjb25maWcgPz8gbWF5YmVTaGFyZWRBbmFseXRpY3MgPz8gbmV3IGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzKCk7XG59XG5cbmZ1bmN0aW9uIGFuYWx5dGljc0NvbmZpZ1ZhbHVlVG9IdW1hbkZvcm1hdCh2YWx1ZTogdW5rbm93bik6ICdlbmFibGVkJyB8ICdkaXNhYmxlZCcgfCAnbm90IHNldCcge1xuICBpZiAodmFsdWUgPT09IGZhbHNlKSB7XG4gICAgcmV0dXJuICdkaXNhYmxlZCc7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB2YWx1ZSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiAnZW5hYmxlZCc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICdub3Qgc2V0JztcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QW5hbHl0aWNzSW5mb1N0cmluZygpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBbZ2xvYmFsV29ya3NwYWNlXSA9IGdldFdvcmtzcGFjZVJhdygnZ2xvYmFsJyk7XG4gIGNvbnN0IFtsb2NhbFdvcmtzcGFjZV0gPSBnZXRXb3Jrc3BhY2VSYXcoJ2xvY2FsJyk7XG4gIGNvbnN0IGdsb2JhbFNldHRpbmcgPSBnbG9iYWxXb3Jrc3BhY2U/LmdldChbJ2NsaScsICdhbmFseXRpY3MnXSk7XG4gIGNvbnN0IGxvY2FsU2V0dGluZyA9IGxvY2FsV29ya3NwYWNlPy5nZXQoWydjbGknLCAnYW5hbHl0aWNzJ10pO1xuXG4gIGNvbnN0IGFuYWx5dGljc0luc3RhbmNlID0gYXdhaXQgY3JlYXRlQW5hbHl0aWNzKFxuICAgICEhbG9jYWxXb3Jrc3BhY2UgLyoqIHdvcmtzcGFjZSAqLyxcbiAgICB0cnVlIC8qKiBza2lwUHJvbXB0ICovLFxuICApO1xuXG4gIHJldHVybiAoXG4gICAgdGFncy5zdHJpcEluZGVudHNgXG4gICAgR2xvYmFsIHNldHRpbmc6ICR7YW5hbHl0aWNzQ29uZmlnVmFsdWVUb0h1bWFuRm9ybWF0KGdsb2JhbFNldHRpbmcpfVxuICAgIExvY2FsIHNldHRpbmc6ICR7XG4gICAgICBsb2NhbFdvcmtzcGFjZVxuICAgICAgICA/IGFuYWx5dGljc0NvbmZpZ1ZhbHVlVG9IdW1hbkZvcm1hdChsb2NhbFNldHRpbmcpXG4gICAgICAgIDogJ05vIGxvY2FsIHdvcmtzcGFjZSBjb25maWd1cmF0aW9uIGZpbGUuJ1xuICAgIH1cbiAgICBFZmZlY3RpdmUgc3RhdHVzOiAke1xuICAgICAgYW5hbHl0aWNzSW5zdGFuY2UgaW5zdGFuY2VvZiBhbmFseXRpY3MuTm9vcEFuYWx5dGljcyA/ICdkaXNhYmxlZCcgOiAnZW5hYmxlZCdcbiAgICB9XG4gIGAgKyAnXFxuJ1xuICApO1xufVxuIl19