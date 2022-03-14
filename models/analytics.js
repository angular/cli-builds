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
exports.getSharedAnalytics = exports.getWorkspaceAnalytics = exports.hasWorkspaceAnalyticsConfiguration = exports.getGlobalAnalytics = exports.hasGlobalAnalyticsConfiguration = exports.promptProjectAnalytics = exports.promptGlobalAnalytics = exports.setAnalyticsConfig = exports.isPackageNameSafeForAnalytics = exports.analyticsPackageSafelist = exports.AnalyticsProperties = void 0;
const core_1 = require("@angular-devkit/core");
const debug_1 = __importDefault(require("debug"));
const inquirer = __importStar(require("inquirer"));
const uuid_1 = require("uuid");
const version_1 = require("../models/version");
const color_1 = require("../utilities/color");
const config_1 = require("../utilities/config");
const tty_1 = require("../utilities/tty");
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
        if (/^\d+\.\d+\.\d+$/.test(v) && v !== '0.0.0') {
            _defaultAngularCliPropertyCache = exports.AnalyticsProperties.AngularCliProd;
        }
        else {
            _defaultAngularCliPropertyCache = exports.AnalyticsProperties.AngularCliStaging;
        }
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
 * @param level Which config to use. "global" for user-level, and "local" for project-level.
 * @param value Either a user ID, true to generate a new User ID, or false to disable analytics.
 */
function setAnalyticsConfig(level, value) {
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
async function promptGlobalAnalytics(force = false) {
    analyticsDebug('prompting global analytics.');
    if (force || (0, tty_1.isTTY)()) {
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'analytics',
                message: core_1.tags.stripIndents `
          Would you like to share anonymous usage data with the Angular Team at Google under
          Google’s Privacy Policy at https://policies.google.com/privacy? For more details and
          how to change this setting, see https://angular.io/analytics.
        `,
                default: false,
            },
        ]);
        setAnalyticsConfig('global', answers.analytics);
        if (answers.analytics) {
            console.log('');
            console.log(core_1.tags.stripIndent `
        Thank you for sharing anonymous usage data. If you change your mind, the following
        command will disable this feature entirely:

            ${color_1.colors.yellow('ng analytics off')}
      `);
            console.log('');
            // Send back a ping with the user `optin`.
            const ua = new analytics_collector_1.AnalyticsCollector(exports.AnalyticsProperties.AngularCliDefault, 'optin');
            ua.pageview('/telemetry/optin');
            await ua.flush();
        }
        else {
            // Send back a ping with the user `optout`. This is the only thing we send.
            const ua = new analytics_collector_1.AnalyticsCollector(exports.AnalyticsProperties.AngularCliDefault, 'optout');
            ua.pageview('/telemetry/optout');
            await ua.flush();
        }
        return true;
    }
    else {
        analyticsDebug('Either STDOUT or STDIN are not TTY and we skipped the prompt.');
    }
    return false;
}
exports.promptGlobalAnalytics = promptGlobalAnalytics;
/**
 * Prompt the user for usage gathering permission for the local project. Fails if there is no
 * local workspace.
 * @param force Whether to ask regardless of whether or not the user is using an interactive shell.
 * @return Whether or not the user was shown a prompt.
 */
async function promptProjectAnalytics(force = false) {
    analyticsDebug('prompting user');
    const [config, configPath] = (0, config_1.getWorkspaceRaw)('local');
    if (!config || !configPath) {
        throw new Error(`Could not find a local workspace. Are you in a project?`);
    }
    if (force || (0, tty_1.isTTY)()) {
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'analytics',
                message: core_1.tags.stripIndents `
          Would you like to share anonymous usage data about this project with the Angular Team at
          Google under Google’s Privacy Policy at https://policies.google.com/privacy? For more
          details and how to change this setting, see https://angular.io/analytics.

        `,
                default: false,
            },
        ]);
        setAnalyticsConfig('local', answers.analytics);
        if (answers.analytics) {
            console.log('');
            console.log(core_1.tags.stripIndent `
        Thank you for sharing anonymous usage data. Should you change your mind, the following
        command will disable this feature entirely:

            ${color_1.colors.yellow('ng analytics project off')}
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
        return true;
    }
    return false;
}
exports.promptProjectAnalytics = promptProjectAnalytics;
async function hasGlobalAnalyticsConfiguration() {
    try {
        const globalWorkspace = await (0, config_1.getWorkspace)('global');
        const analyticsConfig = globalWorkspace && globalWorkspace.getCli() && globalWorkspace.getCli()['analytics'];
        if (analyticsConfig !== null && analyticsConfig !== undefined) {
            return true;
        }
    }
    catch (_a) { }
    return false;
}
exports.hasGlobalAnalyticsConfiguration = hasGlobalAnalyticsConfiguration;
/**
 * Get the global analytics object for the user. This returns an instance of UniversalAnalytics,
 * or undefined if analytics are disabled.
 *
 * If any problem happens, it is considered the user has been opting out of analytics.
 */
async function getGlobalAnalytics() {
    analyticsDebug('getGlobalAnalytics');
    const propertyId = exports.AnalyticsProperties.AngularCliDefault;
    if ('NG_CLI_ANALYTICS' in process.env) {
        if (process.env['NG_CLI_ANALYTICS'] == 'false' || process.env['NG_CLI_ANALYTICS'] == '') {
            analyticsDebug('NG_CLI_ANALYTICS is false');
            return undefined;
        }
        if (process.env['NG_CLI_ANALYTICS'] === 'ci') {
            analyticsDebug('Running in CI mode');
            return new analytics_collector_1.AnalyticsCollector(propertyId, 'ci');
        }
    }
    // If anything happens we just keep the NOOP analytics.
    try {
        const globalWorkspace = await (0, config_1.getWorkspace)('global');
        const analyticsConfig = globalWorkspace && globalWorkspace.getCli() && globalWorkspace.getCli()['analytics'];
        analyticsDebug('Client Analytics config found: %j', analyticsConfig);
        if (analyticsConfig === false) {
            analyticsDebug('Analytics disabled. Ignoring all analytics.');
            return undefined;
        }
        else if (analyticsConfig === undefined || analyticsConfig === null) {
            analyticsDebug('Analytics settings not found. Ignoring all analytics.');
            // globalWorkspace can be null if there is no file. analyticsConfig would be null in this
            // case. Since there is no file, the user hasn't answered and the expected return value is
            // undefined.
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
            return new analytics_collector_1.AnalyticsCollector(propertyId, uid);
        }
    }
    catch (err) {
        analyticsDebug('Error happened during reading of analytics config: %s', err.message);
        return undefined;
    }
}
exports.getGlobalAnalytics = getGlobalAnalytics;
async function hasWorkspaceAnalyticsConfiguration() {
    try {
        const globalWorkspace = await (0, config_1.getWorkspace)('local');
        const analyticsConfig = globalWorkspace && globalWorkspace.getCli() && globalWorkspace.getCli()['analytics'];
        if (analyticsConfig !== undefined) {
            return true;
        }
    }
    catch (_a) { }
    return false;
}
exports.hasWorkspaceAnalyticsConfiguration = hasWorkspaceAnalyticsConfiguration;
/**
 * Get the workspace analytics object for the user. This returns an instance of AnalyticsCollector,
 * or undefined if analytics are disabled.
 *
 * If any problem happens, it is considered the user has been opting out of analytics.
 */
async function getWorkspaceAnalytics() {
    analyticsDebug('getWorkspaceAnalytics');
    try {
        const globalWorkspace = await (0, config_1.getWorkspace)('local');
        const analyticsConfig = globalWorkspace === null || globalWorkspace === void 0 ? void 0 : globalWorkspace.getCli()['analytics'];
        analyticsDebug('Workspace Analytics config found: %j', analyticsConfig);
        if (analyticsConfig === false) {
            analyticsDebug('Analytics disabled. Ignoring all analytics.');
            return undefined;
        }
        else if (analyticsConfig === undefined || analyticsConfig === null) {
            analyticsDebug('Analytics settings not found. Ignoring all analytics.');
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
exports.getWorkspaceAnalytics = getWorkspaceAnalytics;
/**
 * Return the usage analytics sharing setting, which is either a property string (GA-XXXXXXX-XX),
 * or undefined if no sharing.
 */
async function getSharedAnalytics() {
    analyticsDebug('getSharedAnalytics');
    const envVarName = 'NG_CLI_ANALYTICS_SHARE';
    if (envVarName in process.env) {
        if (process.env[envVarName] == 'false' || process.env[envVarName] == '') {
            analyticsDebug('NG_CLI_ANALYTICS is false');
            return undefined;
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvbW9kZWxzL2FuYWx5dGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFrRDtBQUNsRCxrREFBMEI7QUFDMUIsbURBQXFDO0FBQ3JDLCtCQUFvQztBQUNwQywrQ0FBNEM7QUFDNUMsOENBQTRDO0FBQzVDLGdEQUFvRTtBQUNwRSwwQ0FBeUM7QUFDekMsK0RBQTJEO0FBRTNELCtCQUErQjtBQUMvQixNQUFNLGNBQWMsR0FBRyxJQUFBLGVBQUssRUFBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLG9EQUFvRDtBQUVsRyxJQUFJLCtCQUF1QyxDQUFDO0FBQy9CLFFBQUEsbUJBQW1CLEdBQUc7SUFDakMsY0FBYyxFQUFFLGVBQWU7SUFDL0IsaUJBQWlCLEVBQUUsZUFBZTtJQUNsQyxJQUFJLGlCQUFpQjtRQUNuQixJQUFJLCtCQUErQixFQUFFO1lBQ25DLE9BQU8sK0JBQStCLENBQUM7U0FDeEM7UUFFRCxNQUFNLENBQUMsR0FBRyxpQkFBTyxDQUFDLElBQUksQ0FBQztRQUV2QiwrRUFBK0U7UUFDL0UsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLE9BQU8sRUFBRTtZQUM5QywrQkFBK0IsR0FBRywyQkFBbUIsQ0FBQyxjQUFjLENBQUM7U0FDdEU7YUFBTTtZQUNMLCtCQUErQixHQUFHLDJCQUFtQixDQUFDLGlCQUFpQixDQUFDO1NBQ3pFO1FBRUQsT0FBTywrQkFBK0IsQ0FBQztJQUN6QyxDQUFDO0NBQ0YsQ0FBQztBQUVGOztHQUVHO0FBQ1UsUUFBQSx3QkFBd0IsR0FBRztJQUN0QyxhQUFhO0lBQ2Isb0JBQW9CO0lBQ3BCLGFBQWE7SUFDYixxQkFBcUI7Q0FDdEIsQ0FBQztB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R0FBRyx3QkFBd0IsQ0FBQztJQUM1QyxJQUFJLFVBQVUsSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFO1FBQzdCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDdkUsY0FBYyxDQUFDLDJCQUEyQixDQUFDLENBQUM7WUFFNUMsT0FBTyxTQUFTLENBQUM7U0FDbEI7S0FDRjtJQUVELHVEQUF1RDtJQUN2RCxJQUFJO1FBQ0YsTUFBTSxlQUFlLEdBQUcsTUFBTSxJQUFBLHFCQUFZLEVBQUMsUUFBUSxDQUFDLENBQUM7UUFDckQsTUFBTSxlQUFlLEdBQUcsZUFBZSxhQUFmLGVBQWUsdUJBQWYsZUFBZSxDQUFFLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxDQUFDO1FBRXRFLElBQUksQ0FBQyxlQUFlLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRTtZQUMxRSxPQUFPLFNBQVMsQ0FBQztTQUNsQjthQUFNO1lBQ0wsY0FBYyxDQUFDLDRCQUE0QixFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBRTlELE9BQU8sSUFBSSx3Q0FBa0IsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMvRTtLQUNGO0lBQUMsT0FBTyxHQUFHLEVBQUU7UUFDWixjQUFjLENBQUMsK0RBQStELEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTdGLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0FBQ0gsQ0FBQztBQTdCRCxnREE2QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsganNvbiwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5pbXBvcnQgKiBhcyBpbnF1aXJlciBmcm9tICdpbnF1aXJlcic7XG5pbXBvcnQgeyB2NCBhcyB1dWlkVjQgfSBmcm9tICd1dWlkJztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi9tb2RlbHMvdmVyc2lvbic7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCBnZXRXb3Jrc3BhY2VSYXcgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3R0eSc7XG5pbXBvcnQgeyBBbmFseXRpY3NDb2xsZWN0b3IgfSBmcm9tICcuL2FuYWx5dGljcy1jb2xsZWN0b3InO1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5jb25zdCBhbmFseXRpY3NEZWJ1ZyA9IGRlYnVnKCduZzphbmFseXRpY3MnKTsgLy8gR2VuZXJhdGUgYW5hbHl0aWNzLCBpbmNsdWRpbmcgc2V0dGluZ3MgYW5kIHVzZXJzLlxuXG5sZXQgX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZTogc3RyaW5nO1xuZXhwb3J0IGNvbnN0IEFuYWx5dGljc1Byb3BlcnRpZXMgPSB7XG4gIEFuZ3VsYXJDbGlQcm9kOiAnVUEtODU5NDM0Ni0yOScsXG4gIEFuZ3VsYXJDbGlTdGFnaW5nOiAnVUEtODU5NDM0Ni0zMicsXG4gIGdldCBBbmd1bGFyQ2xpRGVmYXVsdCgpOiBzdHJpbmcge1xuICAgIGlmIChfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlKSB7XG4gICAgICByZXR1cm4gX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZTtcbiAgICB9XG5cbiAgICBjb25zdCB2ID0gVkVSU0lPTi5mdWxsO1xuXG4gICAgLy8gVGhlIGxvZ2ljIGlzIGlmIGl0J3MgYSBmdWxsIHZlcnNpb24gdGhlbiB3ZSBzaG91bGQgdXNlIHRoZSBwcm9kIEdBIHByb3BlcnR5LlxuICAgIGlmICgvXlxcZCtcXC5cXGQrXFwuXFxkKyQvLnRlc3QodikgJiYgdiAhPT0gJzAuMC4wJykge1xuICAgICAgX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZSA9IEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaVByb2Q7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGUgPSBBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlTdGFnaW5nO1xuICAgIH1cblxuICAgIHJldHVybiBfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlO1xuICB9LFxufTtcblxuLyoqXG4gKiBUaGlzIGlzIHRoZSB1bHRpbWF0ZSBzYWZlbGlzdCBmb3IgY2hlY2tpbmcgaWYgYSBwYWNrYWdlIG5hbWUgaXMgc2FmZSB0byByZXBvcnQgdG8gYW5hbHl0aWNzLlxuICovXG5leHBvcnQgY29uc3QgYW5hbHl0aWNzUGFja2FnZVNhZmVsaXN0ID0gW1xuICAvXkBhbmd1bGFyXFwvLyxcbiAgL15AYW5ndWxhci1kZXZraXRcXC8vLFxuICAvXkBuZ3Rvb2xzXFwvLyxcbiAgJ0BzY2hlbWF0aWNzL2FuZ3VsYXInLFxuXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gYW5hbHl0aWNzUGFja2FnZVNhZmVsaXN0LnNvbWUoKHBhdHRlcm4pID0+IHtcbiAgICBpZiAodHlwZW9mIHBhdHRlcm4gPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBwYXR0ZXJuID09PSBuYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcGF0dGVybi50ZXN0KG5hbWUpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogU2V0IGFuYWx5dGljcyBzZXR0aW5ncy4gVGhpcyBkb2VzIG5vdCB3b3JrIGlmIHRoZSB1c2VyIGlzIG5vdCBpbnNpZGUgYSBwcm9qZWN0LlxuICogQHBhcmFtIGxldmVsIFdoaWNoIGNvbmZpZyB0byB1c2UuIFwiZ2xvYmFsXCIgZm9yIHVzZXItbGV2ZWwsIGFuZCBcImxvY2FsXCIgZm9yIHByb2plY3QtbGV2ZWwuXG4gKiBAcGFyYW0gdmFsdWUgRWl0aGVyIGEgdXNlciBJRCwgdHJ1ZSB0byBnZW5lcmF0ZSBhIG5ldyBVc2VyIElELCBvciBmYWxzZSB0byBkaXNhYmxlIGFuYWx5dGljcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldEFuYWx5dGljc0NvbmZpZyhsZXZlbDogJ2dsb2JhbCcgfCAnbG9jYWwnLCB2YWx1ZTogc3RyaW5nIHwgYm9vbGVhbikge1xuICBhbmFseXRpY3NEZWJ1Zygnc2V0dGluZyAlcyBsZXZlbCBhbmFseXRpY3MgdG86ICVzJywgbGV2ZWwsIHZhbHVlKTtcbiAgY29uc3QgW2NvbmZpZywgY29uZmlnUGF0aF0gPSBnZXRXb3Jrc3BhY2VSYXcobGV2ZWwpO1xuICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnUGF0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgJHtsZXZlbH0gd29ya3NwYWNlLmApO1xuICB9XG5cbiAgY29uc3QgY2xpID0gY29uZmlnLmdldChbJ2NsaSddKTtcblxuICBpZiAoY2xpICE9PSB1bmRlZmluZWQgJiYgIWpzb24uaXNKc29uT2JqZWN0KGNsaSBhcyBqc29uLkpzb25WYWx1ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlnIGZvdW5kIGF0ICR7Y29uZmlnUGF0aH0uIENMSSBzaG91bGQgYmUgYW4gb2JqZWN0LmApO1xuICB9XG5cbiAgaWYgKHZhbHVlID09PSB0cnVlKSB7XG4gICAgdmFsdWUgPSB1dWlkVjQoKTtcbiAgfVxuXG4gIGNvbmZpZy5tb2RpZnkoWydjbGknLCAnYW5hbHl0aWNzJ10sIHZhbHVlKTtcbiAgY29uZmlnLnNhdmUoKTtcblxuICBhbmFseXRpY3NEZWJ1ZygnZG9uZScpO1xufVxuXG4vKipcbiAqIFByb21wdCB0aGUgdXNlciBmb3IgdXNhZ2UgZ2F0aGVyaW5nIHBlcm1pc3Npb24uXG4gKiBAcGFyYW0gZm9yY2UgV2hldGhlciB0byBhc2sgcmVnYXJkbGVzcyBvZiB3aGV0aGVyIG9yIG5vdCB0aGUgdXNlciBpcyB1c2luZyBhbiBpbnRlcmFjdGl2ZSBzaGVsbC5cbiAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIHVzZXIgd2FzIHNob3duIGEgcHJvbXB0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJvbXB0R2xvYmFsQW5hbHl0aWNzKGZvcmNlID0gZmFsc2UpIHtcbiAgYW5hbHl0aWNzRGVidWcoJ3Byb21wdGluZyBnbG9iYWwgYW5hbHl0aWNzLicpO1xuICBpZiAoZm9yY2UgfHwgaXNUVFkoKSkge1xuICAgIGNvbnN0IGFuc3dlcnMgPSBhd2FpdCBpbnF1aXJlci5wcm9tcHQ8eyBhbmFseXRpY3M6IGJvb2xlYW4gfT4oW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnY29uZmlybScsXG4gICAgICAgIG5hbWU6ICdhbmFseXRpY3MnLFxuICAgICAgICBtZXNzYWdlOiB0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBXb3VsZCB5b3UgbGlrZSB0byBzaGFyZSBhbm9ueW1vdXMgdXNhZ2UgZGF0YSB3aXRoIHRoZSBBbmd1bGFyIFRlYW0gYXQgR29vZ2xlIHVuZGVyXG4gICAgICAgICAgR29vZ2xl4oCZcyBQcml2YWN5IFBvbGljeSBhdCBodHRwczovL3BvbGljaWVzLmdvb2dsZS5jb20vcHJpdmFjeT8gRm9yIG1vcmUgZGV0YWlscyBhbmRcbiAgICAgICAgICBob3cgdG8gY2hhbmdlIHRoaXMgc2V0dGluZywgc2VlIGh0dHBzOi8vYW5ndWxhci5pby9hbmFseXRpY3MuXG4gICAgICAgIGAsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSxcbiAgICBdKTtcblxuICAgIHNldEFuYWx5dGljc0NvbmZpZygnZ2xvYmFsJywgYW5zd2Vycy5hbmFseXRpY3MpO1xuXG4gICAgaWYgKGFuc3dlcnMuYW5hbHl0aWNzKSB7XG4gICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICBjb25zb2xlLmxvZyh0YWdzLnN0cmlwSW5kZW50YFxuICAgICAgICBUaGFuayB5b3UgZm9yIHNoYXJpbmcgYW5vbnltb3VzIHVzYWdlIGRhdGEuIElmIHlvdSBjaGFuZ2UgeW91ciBtaW5kLCB0aGUgZm9sbG93aW5nXG4gICAgICAgIGNvbW1hbmQgd2lsbCBkaXNhYmxlIHRoaXMgZmVhdHVyZSBlbnRpcmVseTpcblxuICAgICAgICAgICAgJHtjb2xvcnMueWVsbG93KCduZyBhbmFseXRpY3Mgb2ZmJyl9XG4gICAgICBgKTtcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcblxuICAgICAgLy8gU2VuZCBiYWNrIGEgcGluZyB3aXRoIHRoZSB1c2VyIGBvcHRpbmAuXG4gICAgICBjb25zdCB1YSA9IG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpRGVmYXVsdCwgJ29wdGluJyk7XG4gICAgICB1YS5wYWdldmlldygnL3RlbGVtZXRyeS9vcHRpbicpO1xuICAgICAgYXdhaXQgdWEuZmx1c2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU2VuZCBiYWNrIGEgcGluZyB3aXRoIHRoZSB1c2VyIGBvcHRvdXRgLiBUaGlzIGlzIHRoZSBvbmx5IHRoaW5nIHdlIHNlbmQuXG4gICAgICBjb25zdCB1YSA9IG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpRGVmYXVsdCwgJ29wdG91dCcpO1xuICAgICAgdWEucGFnZXZpZXcoJy90ZWxlbWV0cnkvb3B0b3V0Jyk7XG4gICAgICBhd2FpdCB1YS5mbHVzaCgpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIGFuYWx5dGljc0RlYnVnKCdFaXRoZXIgU1RET1VUIG9yIFNURElOIGFyZSBub3QgVFRZIGFuZCB3ZSBza2lwcGVkIHRoZSBwcm9tcHQuJyk7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogUHJvbXB0IHRoZSB1c2VyIGZvciB1c2FnZSBnYXRoZXJpbmcgcGVybWlzc2lvbiBmb3IgdGhlIGxvY2FsIHByb2plY3QuIEZhaWxzIGlmIHRoZXJlIGlzIG5vXG4gKiBsb2NhbCB3b3Jrc3BhY2UuXG4gKiBAcGFyYW0gZm9yY2UgV2hldGhlciB0byBhc2sgcmVnYXJkbGVzcyBvZiB3aGV0aGVyIG9yIG5vdCB0aGUgdXNlciBpcyB1c2luZyBhbiBpbnRlcmFjdGl2ZSBzaGVsbC5cbiAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIHVzZXIgd2FzIHNob3duIGEgcHJvbXB0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJvbXB0UHJvamVjdEFuYWx5dGljcyhmb3JjZSA9IGZhbHNlKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGFuYWx5dGljc0RlYnVnKCdwcm9tcHRpbmcgdXNlcicpO1xuICBjb25zdCBbY29uZmlnLCBjb25maWdQYXRoXSA9IGdldFdvcmtzcGFjZVJhdygnbG9jYWwnKTtcbiAgaWYgKCFjb25maWcgfHwgIWNvbmZpZ1BhdGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGEgbG9jYWwgd29ya3NwYWNlLiBBcmUgeW91IGluIGEgcHJvamVjdD9gKTtcbiAgfVxuXG4gIGlmIChmb3JjZSB8fCBpc1RUWSgpKSB7XG4gICAgY29uc3QgYW5zd2VycyA9IGF3YWl0IGlucXVpcmVyLnByb21wdDx7IGFuYWx5dGljczogYm9vbGVhbiB9PihbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjb25maXJtJyxcbiAgICAgICAgbmFtZTogJ2FuYWx5dGljcycsXG4gICAgICAgIG1lc3NhZ2U6IHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICAgIFdvdWxkIHlvdSBsaWtlIHRvIHNoYXJlIGFub255bW91cyB1c2FnZSBkYXRhIGFib3V0IHRoaXMgcHJvamVjdCB3aXRoIHRoZSBBbmd1bGFyIFRlYW0gYXRcbiAgICAgICAgICBHb29nbGUgdW5kZXIgR29vZ2xl4oCZcyBQcml2YWN5IFBvbGljeSBhdCBodHRwczovL3BvbGljaWVzLmdvb2dsZS5jb20vcHJpdmFjeT8gRm9yIG1vcmVcbiAgICAgICAgICBkZXRhaWxzIGFuZCBob3cgdG8gY2hhbmdlIHRoaXMgc2V0dGluZywgc2VlIGh0dHBzOi8vYW5ndWxhci5pby9hbmFseXRpY3MuXG5cbiAgICAgICAgYCxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9LFxuICAgIF0pO1xuXG4gICAgc2V0QW5hbHl0aWNzQ29uZmlnKCdsb2NhbCcsIGFuc3dlcnMuYW5hbHl0aWNzKTtcblxuICAgIGlmIChhbnN3ZXJzLmFuYWx5dGljcykge1xuICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgY29uc29sZS5sb2codGFncy5zdHJpcEluZGVudGBcbiAgICAgICAgVGhhbmsgeW91IGZvciBzaGFyaW5nIGFub255bW91cyB1c2FnZSBkYXRhLiBTaG91bGQgeW91IGNoYW5nZSB5b3VyIG1pbmQsIHRoZSBmb2xsb3dpbmdcbiAgICAgICAgY29tbWFuZCB3aWxsIGRpc2FibGUgdGhpcyBmZWF0dXJlIGVudGlyZWx5OlxuXG4gICAgICAgICAgICAke2NvbG9ycy55ZWxsb3coJ25nIGFuYWx5dGljcyBwcm9qZWN0IG9mZicpfVxuICAgICAgYCk7XG4gICAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICAgIC8vIFNlbmQgYmFjayBhIHBpbmcgd2l0aCB0aGUgdXNlciBgb3B0aW5gLlxuICAgICAgY29uc3QgdWEgPSBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaURlZmF1bHQsICdvcHRpbicpO1xuICAgICAgdWEucGFnZXZpZXcoJy90ZWxlbWV0cnkvcHJvamVjdC9vcHRpbicpO1xuICAgICAgYXdhaXQgdWEuZmx1c2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU2VuZCBiYWNrIGEgcGluZyB3aXRoIHRoZSB1c2VyIGBvcHRvdXRgLiBUaGlzIGlzIHRoZSBvbmx5IHRoaW5nIHdlIHNlbmQuXG4gICAgICBjb25zdCB1YSA9IG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpRGVmYXVsdCwgJ29wdG91dCcpO1xuICAgICAgdWEucGFnZXZpZXcoJy90ZWxlbWV0cnkvcHJvamVjdC9vcHRvdXQnKTtcbiAgICAgIGF3YWl0IHVhLmZsdXNoKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYXNHbG9iYWxBbmFseXRpY3NDb25maWd1cmF0aW9uKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGNvbnN0IGdsb2JhbFdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgY29uc3QgYW5hbHl0aWNzQ29uZmlnOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsIHwgeyB1aWQ/OiBzdHJpbmcgfSA9XG4gICAgICBnbG9iYWxXb3Jrc3BhY2UgJiYgZ2xvYmFsV29ya3NwYWNlLmdldENsaSgpICYmIGdsb2JhbFdvcmtzcGFjZS5nZXRDbGkoKVsnYW5hbHl0aWNzJ107XG5cbiAgICBpZiAoYW5hbHl0aWNzQ29uZmlnICE9PSBudWxsICYmIGFuYWx5dGljc0NvbmZpZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0gY2F0Y2gge31cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogR2V0IHRoZSBnbG9iYWwgYW5hbHl0aWNzIG9iamVjdCBmb3IgdGhlIHVzZXIuIFRoaXMgcmV0dXJucyBhbiBpbnN0YW5jZSBvZiBVbml2ZXJzYWxBbmFseXRpY3MsXG4gKiBvciB1bmRlZmluZWQgaWYgYW5hbHl0aWNzIGFyZSBkaXNhYmxlZC5cbiAqXG4gKiBJZiBhbnkgcHJvYmxlbSBoYXBwZW5zLCBpdCBpcyBjb25zaWRlcmVkIHRoZSB1c2VyIGhhcyBiZWVuIG9wdGluZyBvdXQgb2YgYW5hbHl0aWNzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0R2xvYmFsQW5hbHl0aWNzKCk6IFByb21pc2U8QW5hbHl0aWNzQ29sbGVjdG9yIHwgdW5kZWZpbmVkPiB7XG4gIGFuYWx5dGljc0RlYnVnKCdnZXRHbG9iYWxBbmFseXRpY3MnKTtcbiAgY29uc3QgcHJvcGVydHlJZCA9IEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaURlZmF1bHQ7XG5cbiAgaWYgKCdOR19DTElfQU5BTFlUSUNTJyBpbiBwcm9jZXNzLmVudikge1xuICAgIGlmIChwcm9jZXNzLmVudlsnTkdfQ0xJX0FOQUxZVElDUyddID09ICdmYWxzZScgfHwgcHJvY2Vzcy5lbnZbJ05HX0NMSV9BTkFMWVRJQ1MnXSA9PSAnJykge1xuICAgICAgYW5hbHl0aWNzRGVidWcoJ05HX0NMSV9BTkFMWVRJQ1MgaXMgZmFsc2UnKTtcblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKHByb2Nlc3MuZW52WydOR19DTElfQU5BTFlUSUNTJ10gPT09ICdjaScpIHtcbiAgICAgIGFuYWx5dGljc0RlYnVnKCdSdW5uaW5nIGluIENJIG1vZGUnKTtcblxuICAgICAgcmV0dXJuIG5ldyBBbmFseXRpY3NDb2xsZWN0b3IocHJvcGVydHlJZCwgJ2NpJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gSWYgYW55dGhpbmcgaGFwcGVucyB3ZSBqdXN0IGtlZXAgdGhlIE5PT1AgYW5hbHl0aWNzLlxuICB0cnkge1xuICAgIGNvbnN0IGdsb2JhbFdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgY29uc3QgYW5hbHl0aWNzQ29uZmlnOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsIHwgeyB1aWQ/OiBzdHJpbmcgfSA9XG4gICAgICBnbG9iYWxXb3Jrc3BhY2UgJiYgZ2xvYmFsV29ya3NwYWNlLmdldENsaSgpICYmIGdsb2JhbFdvcmtzcGFjZS5nZXRDbGkoKVsnYW5hbHl0aWNzJ107XG4gICAgYW5hbHl0aWNzRGVidWcoJ0NsaWVudCBBbmFseXRpY3MgY29uZmlnIGZvdW5kOiAlaicsIGFuYWx5dGljc0NvbmZpZyk7XG5cbiAgICBpZiAoYW5hbHl0aWNzQ29uZmlnID09PSBmYWxzZSkge1xuICAgICAgYW5hbHl0aWNzRGVidWcoJ0FuYWx5dGljcyBkaXNhYmxlZC4gSWdub3JpbmcgYWxsIGFuYWx5dGljcy4nKTtcblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2UgaWYgKGFuYWx5dGljc0NvbmZpZyA9PT0gdW5kZWZpbmVkIHx8IGFuYWx5dGljc0NvbmZpZyA9PT0gbnVsbCkge1xuICAgICAgYW5hbHl0aWNzRGVidWcoJ0FuYWx5dGljcyBzZXR0aW5ncyBub3QgZm91bmQuIElnbm9yaW5nIGFsbCBhbmFseXRpY3MuJyk7XG5cbiAgICAgIC8vIGdsb2JhbFdvcmtzcGFjZSBjYW4gYmUgbnVsbCBpZiB0aGVyZSBpcyBubyBmaWxlLiBhbmFseXRpY3NDb25maWcgd291bGQgYmUgbnVsbCBpbiB0aGlzXG4gICAgICAvLyBjYXNlLiBTaW5jZSB0aGVyZSBpcyBubyBmaWxlLCB0aGUgdXNlciBoYXNuJ3QgYW5zd2VyZWQgYW5kIHRoZSBleHBlY3RlZCByZXR1cm4gdmFsdWUgaXNcbiAgICAgIC8vIHVuZGVmaW5lZC5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB1aWQ6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgIGlmICh0eXBlb2YgYW5hbHl0aWNzQ29uZmlnID09ICdzdHJpbmcnKSB7XG4gICAgICAgIHVpZCA9IGFuYWx5dGljc0NvbmZpZztcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGFuYWx5dGljc0NvbmZpZyA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgYW5hbHl0aWNzQ29uZmlnWyd1aWQnXSA9PSAnc3RyaW5nJykge1xuICAgICAgICB1aWQgPSBhbmFseXRpY3NDb25maWdbJ3VpZCddO1xuICAgICAgfVxuXG4gICAgICBhbmFseXRpY3NEZWJ1ZygnY2xpZW50IGlkOiAlaicsIHVpZCk7XG4gICAgICBpZiAodWlkID09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IEFuYWx5dGljc0NvbGxlY3Rvcihwcm9wZXJ0eUlkLCB1aWQpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgYW5hbHl0aWNzRGVidWcoJ0Vycm9yIGhhcHBlbmVkIGR1cmluZyByZWFkaW5nIG9mIGFuYWx5dGljcyBjb25maWc6ICVzJywgZXJyLm1lc3NhZ2UpO1xuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFzV29ya3NwYWNlQW5hbHl0aWNzQ29uZmlndXJhdGlvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBnbG9iYWxXb3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG4gICAgY29uc3QgYW5hbHl0aWNzQ29uZmlnOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsIHwgeyB1aWQ/OiBzdHJpbmcgfSA9XG4gICAgICBnbG9iYWxXb3Jrc3BhY2UgJiYgZ2xvYmFsV29ya3NwYWNlLmdldENsaSgpICYmIGdsb2JhbFdvcmtzcGFjZS5nZXRDbGkoKVsnYW5hbHl0aWNzJ107XG5cbiAgICBpZiAoYW5hbHl0aWNzQ29uZmlnICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBjYXRjaCB7fVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHdvcmtzcGFjZSBhbmFseXRpY3Mgb2JqZWN0IGZvciB0aGUgdXNlci4gVGhpcyByZXR1cm5zIGFuIGluc3RhbmNlIG9mIEFuYWx5dGljc0NvbGxlY3RvcixcbiAqIG9yIHVuZGVmaW5lZCBpZiBhbmFseXRpY3MgYXJlIGRpc2FibGVkLlxuICpcbiAqIElmIGFueSBwcm9ibGVtIGhhcHBlbnMsIGl0IGlzIGNvbnNpZGVyZWQgdGhlIHVzZXIgaGFzIGJlZW4gb3B0aW5nIG91dCBvZiBhbmFseXRpY3MuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRXb3Jrc3BhY2VBbmFseXRpY3MoKTogUHJvbWlzZTxBbmFseXRpY3NDb2xsZWN0b3IgfCB1bmRlZmluZWQ+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ2dldFdvcmtzcGFjZUFuYWx5dGljcycpO1xuICB0cnkge1xuICAgIGNvbnN0IGdsb2JhbFdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcbiAgICBjb25zdCBhbmFseXRpY3NDb25maWc6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwgfCB7IHVpZD86IHN0cmluZyB9ID1cbiAgICAgIGdsb2JhbFdvcmtzcGFjZT8uZ2V0Q2xpKClbJ2FuYWx5dGljcyddO1xuICAgIGFuYWx5dGljc0RlYnVnKCdXb3Jrc3BhY2UgQW5hbHl0aWNzIGNvbmZpZyBmb3VuZDogJWonLCBhbmFseXRpY3NDb25maWcpO1xuXG4gICAgaWYgKGFuYWx5dGljc0NvbmZpZyA9PT0gZmFsc2UpIHtcbiAgICAgIGFuYWx5dGljc0RlYnVnKCdBbmFseXRpY3MgZGlzYWJsZWQuIElnbm9yaW5nIGFsbCBhbmFseXRpY3MuJyk7XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIGlmIChhbmFseXRpY3NDb25maWcgPT09IHVuZGVmaW5lZCB8fCBhbmFseXRpY3NDb25maWcgPT09IG51bGwpIHtcbiAgICAgIGFuYWx5dGljc0RlYnVnKCdBbmFseXRpY3Mgc2V0dGluZ3Mgbm90IGZvdW5kLiBJZ25vcmluZyBhbGwgYW5hbHl0aWNzLicpO1xuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgdWlkOiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICBpZiAodHlwZW9mIGFuYWx5dGljc0NvbmZpZyA9PSAnc3RyaW5nJykge1xuICAgICAgICB1aWQgPSBhbmFseXRpY3NDb25maWc7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhbmFseXRpY3NDb25maWcgPT0gJ29iamVjdCcgJiYgdHlwZW9mIGFuYWx5dGljc0NvbmZpZ1sndWlkJ10gPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdWlkID0gYW5hbHl0aWNzQ29uZmlnWyd1aWQnXTtcbiAgICAgIH1cblxuICAgICAgYW5hbHl0aWNzRGVidWcoJ2NsaWVudCBpZDogJWonLCB1aWQpO1xuICAgICAgaWYgKHVpZCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpRGVmYXVsdCwgdWlkKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGFuYWx5dGljc0RlYnVnKCdFcnJvciBoYXBwZW5lZCBkdXJpbmcgcmVhZGluZyBvZiBhbmFseXRpY3MgY29uZmlnOiAlcycsIGVyci5tZXNzYWdlKTtcblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIHVzYWdlIGFuYWx5dGljcyBzaGFyaW5nIHNldHRpbmcsIHdoaWNoIGlzIGVpdGhlciBhIHByb3BlcnR5IHN0cmluZyAoR0EtWFhYWFhYWC1YWCksXG4gKiBvciB1bmRlZmluZWQgaWYgbm8gc2hhcmluZy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFNoYXJlZEFuYWx5dGljcygpOiBQcm9taXNlPEFuYWx5dGljc0NvbGxlY3RvciB8IHVuZGVmaW5lZD4ge1xuICBhbmFseXRpY3NEZWJ1ZygnZ2V0U2hhcmVkQW5hbHl0aWNzJyk7XG5cbiAgY29uc3QgZW52VmFyTmFtZSA9ICdOR19DTElfQU5BTFlUSUNTX1NIQVJFJztcbiAgaWYgKGVudlZhck5hbWUgaW4gcHJvY2Vzcy5lbnYpIHtcbiAgICBpZiAocHJvY2Vzcy5lbnZbZW52VmFyTmFtZV0gPT0gJ2ZhbHNlJyB8fCBwcm9jZXNzLmVudltlbnZWYXJOYW1lXSA9PSAnJykge1xuICAgICAgYW5hbHl0aWNzRGVidWcoJ05HX0NMSV9BTkFMWVRJQ1MgaXMgZmFsc2UnKTtcblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvLyBJZiBhbnl0aGluZyBoYXBwZW5zIHdlIGp1c3Qga2VlcCB0aGUgTk9PUCBhbmFseXRpY3MuXG4gIHRyeSB7XG4gICAgY29uc3QgZ2xvYmFsV29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcbiAgICBjb25zdCBhbmFseXRpY3NDb25maWcgPSBnbG9iYWxXb3Jrc3BhY2U/LmdldENsaSgpWydhbmFseXRpY3NTaGFyaW5nJ107XG5cbiAgICBpZiAoIWFuYWx5dGljc0NvbmZpZyB8fCAhYW5hbHl0aWNzQ29uZmlnLnRyYWNraW5nIHx8ICFhbmFseXRpY3NDb25maWcudXVpZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgYW5hbHl0aWNzRGVidWcoJ0FuYWx5dGljcyBzaGFyaW5nIGluZm86ICVqJywgYW5hbHl0aWNzQ29uZmlnKTtcblxuICAgICAgcmV0dXJuIG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoYW5hbHl0aWNzQ29uZmlnLnRyYWNraW5nLCBhbmFseXRpY3NDb25maWcudXVpZCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBhbmFseXRpY3NEZWJ1ZygnRXJyb3IgaGFwcGVuZWQgZHVyaW5nIHJlYWRpbmcgb2YgYW5hbHl0aWNzIHNoYXJpbmcgY29uZmlnOiAlcycsIGVyci5tZXNzYWdlKTtcblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cbiJdfQ==