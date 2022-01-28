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
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvbW9kZWxzL2FuYWx5dGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQWtEO0FBQ2xELGtEQUEwQjtBQUMxQixtREFBcUM7QUFDckMsK0JBQW9DO0FBQ3BDLCtDQUE0QztBQUM1Qyw4Q0FBNEM7QUFDNUMsZ0RBQW9FO0FBQ3BFLDBDQUF5QztBQUN6QywrREFBMkQ7QUFFM0QsK0JBQStCO0FBQy9CLE1BQU0sY0FBYyxHQUFHLElBQUEsZUFBSyxFQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsb0RBQW9EO0FBRWxHLElBQUksK0JBQXVDLENBQUM7QUFDL0IsUUFBQSxtQkFBbUIsR0FBRztJQUNqQyxjQUFjLEVBQUUsZUFBZTtJQUMvQixpQkFBaUIsRUFBRSxlQUFlO0lBQ2xDLElBQUksaUJBQWlCO1FBQ25CLElBQUksK0JBQStCLEVBQUU7WUFDbkMsT0FBTywrQkFBK0IsQ0FBQztTQUN4QztRQUVELE1BQU0sQ0FBQyxHQUFHLGlCQUFPLENBQUMsSUFBSSxDQUFDO1FBRXZCLCtFQUErRTtRQUMvRSxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssT0FBTyxFQUFFO1lBQzlDLCtCQUErQixHQUFHLDJCQUFtQixDQUFDLGNBQWMsQ0FBQztTQUN0RTthQUFNO1lBQ0wsK0JBQStCLEdBQUcsMkJBQW1CLENBQUMsaUJBQWlCLENBQUM7U0FDekU7UUFFRCxPQUFPLCtCQUErQixDQUFDO0lBQ3pDLENBQUM7Q0FDRixDQUFDO0FBRUY7O0dBRUc7QUFDVSxRQUFBLHdCQUF3QixHQUFHO0lBQ3RDLGFBQWE7SUFDYixvQkFBb0I7SUFDcEIsYUFBYTtJQUNiLHFCQUFxQjtDQUN0QixDQUFDO0FBRUYs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LHdCQUF3QixDQUFDO0lBQzVDLElBQUksVUFBVSxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUU7UUFDN0IsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUN2RSxjQUFjLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUU1QyxPQUFPLFNBQVMsQ0FBQztTQUNsQjtLQUNGO0lBRUQsdURBQXVEO0lBQ3ZELElBQUk7UUFDRixNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUEscUJBQVksRUFBQyxRQUFRLENBQUMsQ0FBQztRQUNyRCxNQUFNLGVBQWUsR0FBRyxlQUFlLGFBQWYsZUFBZSx1QkFBZixlQUFlLENBQUUsTUFBTSxHQUFHLGtCQUFrQixDQUFDLENBQUM7UUFFdEUsSUFBSSxDQUFDLGVBQWUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFO1lBQzFFLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO2FBQU07WUFDTCxjQUFjLENBQUMsNEJBQTRCLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFFOUQsT0FBTyxJQUFJLHdDQUFrQixDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQy9FO0tBQ0Y7SUFBQyxPQUFPLEdBQUcsRUFBRTtRQUNaLGNBQWMsQ0FBQywrREFBK0QsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFN0YsT0FBTyxTQUFTLENBQUM7S0FDbEI7QUFDSCxDQUFDO0FBN0JELGdEQTZCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBqc29uLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IGRlYnVnIGZyb20gJ2RlYnVnJztcbmltcG9ydCAqIGFzIGlucXVpcmVyIGZyb20gJ2lucXVpcmVyJztcbmltcG9ydCB7IHY0IGFzIHV1aWRWNCB9IGZyb20gJ3V1aWQnO1xuaW1wb3J0IHsgVkVSU0lPTiB9IGZyb20gJy4uL21vZGVscy92ZXJzaW9uJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UsIGdldFdvcmtzcGFjZVJhdyB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgaXNUVFkgfSBmcm9tICcuLi91dGlsaXRpZXMvdHR5JztcbmltcG9ydCB7IEFuYWx5dGljc0NvbGxlY3RvciB9IGZyb20gJy4vYW5hbHl0aWNzLWNvbGxlY3Rvcic7XG5cbi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmNvbnN0IGFuYWx5dGljc0RlYnVnID0gZGVidWcoJ25nOmFuYWx5dGljcycpOyAvLyBHZW5lcmF0ZSBhbmFseXRpY3MsIGluY2x1ZGluZyBzZXR0aW5ncyBhbmQgdXNlcnMuXG5cbmxldCBfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlOiBzdHJpbmc7XG5leHBvcnQgY29uc3QgQW5hbHl0aWNzUHJvcGVydGllcyA9IHtcbiAgQW5ndWxhckNsaVByb2Q6ICdVQS04NTk0MzQ2LTI5JyxcbiAgQW5ndWxhckNsaVN0YWdpbmc6ICdVQS04NTk0MzQ2LTMyJyxcbiAgZ2V0IEFuZ3VsYXJDbGlEZWZhdWx0KCk6IHN0cmluZyB7XG4gICAgaWYgKF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGUpIHtcbiAgICAgIHJldHVybiBfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlO1xuICAgIH1cblxuICAgIGNvbnN0IHYgPSBWRVJTSU9OLmZ1bGw7XG5cbiAgICAvLyBUaGUgbG9naWMgaXMgaWYgaXQncyBhIGZ1bGwgdmVyc2lvbiB0aGVuIHdlIHNob3VsZCB1c2UgdGhlIHByb2QgR0EgcHJvcGVydHkuXG4gICAgaWYgKC9eXFxkK1xcLlxcZCtcXC5cXGQrJC8udGVzdCh2KSAmJiB2ICE9PSAnMC4wLjAnKSB7XG4gICAgICBfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlID0gQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpUHJvZDtcbiAgICB9IGVsc2Uge1xuICAgICAgX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZSA9IEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaVN0YWdpbmc7XG4gICAgfVxuXG4gICAgcmV0dXJuIF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGU7XG4gIH0sXG59O1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIHVsdGltYXRlIHNhZmVsaXN0IGZvciBjaGVja2luZyBpZiBhIHBhY2thZ2UgbmFtZSBpcyBzYWZlIHRvIHJlcG9ydCB0byBhbmFseXRpY3MuXG4gKi9cbmV4cG9ydCBjb25zdCBhbmFseXRpY3NQYWNrYWdlU2FmZWxpc3QgPSBbXG4gIC9eQGFuZ3VsYXJcXC8vLFxuICAvXkBhbmd1bGFyLWRldmtpdFxcLy8sXG4gIC9eQG5ndG9vbHNcXC8vLFxuICAnQHNjaGVtYXRpY3MvYW5ndWxhcicsXG5dO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBhbmFseXRpY3NQYWNrYWdlU2FmZWxpc3Quc29tZSgocGF0dGVybikgPT4ge1xuICAgIGlmICh0eXBlb2YgcGF0dGVybiA9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIHBhdHRlcm4gPT09IG5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBwYXR0ZXJuLnRlc3QobmFtZSk7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBTZXQgYW5hbHl0aWNzIHNldHRpbmdzLiBUaGlzIGRvZXMgbm90IHdvcmsgaWYgdGhlIHVzZXIgaXMgbm90IGluc2lkZSBhIHByb2plY3QuXG4gKiBAcGFyYW0gbGV2ZWwgV2hpY2ggY29uZmlnIHRvIHVzZS4gXCJnbG9iYWxcIiBmb3IgdXNlci1sZXZlbCwgYW5kIFwibG9jYWxcIiBmb3IgcHJvamVjdC1sZXZlbC5cbiAqIEBwYXJhbSB2YWx1ZSBFaXRoZXIgYSB1c2VyIElELCB0cnVlIHRvIGdlbmVyYXRlIGEgbmV3IFVzZXIgSUQsIG9yIGZhbHNlIHRvIGRpc2FibGUgYW5hbHl0aWNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0QW5hbHl0aWNzQ29uZmlnKGxldmVsOiAnZ2xvYmFsJyB8ICdsb2NhbCcsIHZhbHVlOiBzdHJpbmcgfCBib29sZWFuKSB7XG4gIGFuYWx5dGljc0RlYnVnKCdzZXR0aW5nICVzIGxldmVsIGFuYWx5dGljcyB0bzogJXMnLCBsZXZlbCwgdmFsdWUpO1xuICBjb25zdCBbY29uZmlnLCBjb25maWdQYXRoXSA9IGdldFdvcmtzcGFjZVJhdyhsZXZlbCk7XG4gIGlmICghY29uZmlnIHx8ICFjb25maWdQYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCAke2xldmVsfSB3b3Jrc3BhY2UuYCk7XG4gIH1cblxuICBjb25zdCBjbGkgPSBjb25maWcuZ2V0KFsnY2xpJ10pO1xuXG4gIGlmIChjbGkgIT09IHVuZGVmaW5lZCAmJiAhanNvbi5pc0pzb25PYmplY3QoY2xpIGFzIGpzb24uSnNvblZhbHVlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWcgZm91bmQgYXQgJHtjb25maWdQYXRofS4gQ0xJIHNob3VsZCBiZSBhbiBvYmplY3QuYCk7XG4gIH1cblxuICBpZiAodmFsdWUgPT09IHRydWUpIHtcbiAgICB2YWx1ZSA9IHV1aWRWNCgpO1xuICB9XG5cbiAgY29uZmlnLm1vZGlmeShbJ2NsaScsICdhbmFseXRpY3MnXSwgdmFsdWUpO1xuICBjb25maWcuc2F2ZSgpO1xuXG4gIGFuYWx5dGljc0RlYnVnKCdkb25lJyk7XG59XG5cbi8qKlxuICogUHJvbXB0IHRoZSB1c2VyIGZvciB1c2FnZSBnYXRoZXJpbmcgcGVybWlzc2lvbi5cbiAqIEBwYXJhbSBmb3JjZSBXaGV0aGVyIHRvIGFzayByZWdhcmRsZXNzIG9mIHdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIGlzIHVzaW5nIGFuIGludGVyYWN0aXZlIHNoZWxsLlxuICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgdXNlciB3YXMgc2hvd24gYSBwcm9tcHQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm9tcHRHbG9iYWxBbmFseXRpY3MoZm9yY2UgPSBmYWxzZSkge1xuICBhbmFseXRpY3NEZWJ1ZygncHJvbXB0aW5nIGdsb2JhbCBhbmFseXRpY3MuJyk7XG4gIGlmIChmb3JjZSB8fCBpc1RUWSgpKSB7XG4gICAgY29uc3QgYW5zd2VycyA9IGF3YWl0IGlucXVpcmVyLnByb21wdDx7IGFuYWx5dGljczogYm9vbGVhbiB9PihbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjb25maXJtJyxcbiAgICAgICAgbmFtZTogJ2FuYWx5dGljcycsXG4gICAgICAgIG1lc3NhZ2U6IHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICAgIFdvdWxkIHlvdSBsaWtlIHRvIHNoYXJlIGFub255bW91cyB1c2FnZSBkYXRhIHdpdGggdGhlIEFuZ3VsYXIgVGVhbSBhdCBHb29nbGUgdW5kZXJcbiAgICAgICAgICBHb29nbGXigJlzIFByaXZhY3kgUG9saWN5IGF0IGh0dHBzOi8vcG9saWNpZXMuZ29vZ2xlLmNvbS9wcml2YWN5PyBGb3IgbW9yZSBkZXRhaWxzIGFuZFxuICAgICAgICAgIGhvdyB0byBjaGFuZ2UgdGhpcyBzZXR0aW5nLCBzZWUgaHR0cHM6Ly9hbmd1bGFyLmlvL2FuYWx5dGljcy5cbiAgICAgICAgYCxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9LFxuICAgIF0pO1xuXG4gICAgc2V0QW5hbHl0aWNzQ29uZmlnKCdnbG9iYWwnLCBhbnN3ZXJzLmFuYWx5dGljcyk7XG5cbiAgICBpZiAoYW5zd2Vycy5hbmFseXRpY3MpIHtcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIGNvbnNvbGUubG9nKHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIFRoYW5rIHlvdSBmb3Igc2hhcmluZyBhbm9ueW1vdXMgdXNhZ2UgZGF0YS4gSWYgeW91IGNoYW5nZSB5b3VyIG1pbmQsIHRoZSBmb2xsb3dpbmdcbiAgICAgICAgY29tbWFuZCB3aWxsIGRpc2FibGUgdGhpcyBmZWF0dXJlIGVudGlyZWx5OlxuXG4gICAgICAgICAgICAke2NvbG9ycy55ZWxsb3coJ25nIGFuYWx5dGljcyBvZmYnKX1cbiAgICAgIGApO1xuICAgICAgY29uc29sZS5sb2coJycpO1xuXG4gICAgICAvLyBTZW5kIGJhY2sgYSBwaW5nIHdpdGggdGhlIHVzZXIgYG9wdGluYC5cbiAgICAgIGNvbnN0IHVhID0gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlEZWZhdWx0LCAnb3B0aW4nKTtcbiAgICAgIHVhLnBhZ2V2aWV3KCcvdGVsZW1ldHJ5L29wdGluJyk7XG4gICAgICBhd2FpdCB1YS5mbHVzaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTZW5kIGJhY2sgYSBwaW5nIHdpdGggdGhlIHVzZXIgYG9wdG91dGAuIFRoaXMgaXMgdGhlIG9ubHkgdGhpbmcgd2Ugc2VuZC5cbiAgICAgIGNvbnN0IHVhID0gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlEZWZhdWx0LCAnb3B0b3V0Jyk7XG4gICAgICB1YS5wYWdldmlldygnL3RlbGVtZXRyeS9vcHRvdXQnKTtcbiAgICAgIGF3YWl0IHVhLmZsdXNoKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgYW5hbHl0aWNzRGVidWcoJ0VpdGhlciBTVERPVVQgb3IgU1RESU4gYXJlIG5vdCBUVFkgYW5kIHdlIHNraXBwZWQgdGhlIHByb21wdC4nKTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBQcm9tcHQgdGhlIHVzZXIgZm9yIHVzYWdlIGdhdGhlcmluZyBwZXJtaXNzaW9uIGZvciB0aGUgbG9jYWwgcHJvamVjdC4gRmFpbHMgaWYgdGhlcmUgaXMgbm9cbiAqIGxvY2FsIHdvcmtzcGFjZS5cbiAqIEBwYXJhbSBmb3JjZSBXaGV0aGVyIHRvIGFzayByZWdhcmRsZXNzIG9mIHdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIGlzIHVzaW5nIGFuIGludGVyYWN0aXZlIHNoZWxsLlxuICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgdXNlciB3YXMgc2hvd24gYSBwcm9tcHQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm9tcHRQcm9qZWN0QW5hbHl0aWNzKGZvcmNlID0gZmFsc2UpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ3Byb21wdGluZyB1c2VyJyk7XG4gIGNvbnN0IFtjb25maWcsIGNvbmZpZ1BhdGhdID0gZ2V0V29ya3NwYWNlUmF3KCdsb2NhbCcpO1xuICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnUGF0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgYSBsb2NhbCB3b3Jrc3BhY2UuIEFyZSB5b3UgaW4gYSBwcm9qZWN0P2ApO1xuICB9XG5cbiAgaWYgKGZvcmNlIHx8IGlzVFRZKCkpIHtcbiAgICBjb25zdCBhbnN3ZXJzID0gYXdhaXQgaW5xdWlyZXIucHJvbXB0PHsgYW5hbHl0aWNzOiBib29sZWFuIH0+KFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NvbmZpcm0nLFxuICAgICAgICBuYW1lOiAnYW5hbHl0aWNzJyxcbiAgICAgICAgbWVzc2FnZTogdGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgICAgV291bGQgeW91IGxpa2UgdG8gc2hhcmUgYW5vbnltb3VzIHVzYWdlIGRhdGEgYWJvdXQgdGhpcyBwcm9qZWN0IHdpdGggdGhlIEFuZ3VsYXIgVGVhbSBhdFxuICAgICAgICAgIEdvb2dsZSB1bmRlciBHb29nbGXigJlzIFByaXZhY3kgUG9saWN5IGF0IGh0dHBzOi8vcG9saWNpZXMuZ29vZ2xlLmNvbS9wcml2YWN5PyBGb3IgbW9yZVxuICAgICAgICAgIGRldGFpbHMgYW5kIGhvdyB0byBjaGFuZ2UgdGhpcyBzZXR0aW5nLCBzZWUgaHR0cHM6Ly9hbmd1bGFyLmlvL2FuYWx5dGljcy5cblxuICAgICAgICBgLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0sXG4gICAgXSk7XG5cbiAgICBzZXRBbmFseXRpY3NDb25maWcoJ2xvY2FsJywgYW5zd2Vycy5hbmFseXRpY3MpO1xuXG4gICAgaWYgKGFuc3dlcnMuYW5hbHl0aWNzKSB7XG4gICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICBjb25zb2xlLmxvZyh0YWdzLnN0cmlwSW5kZW50YFxuICAgICAgICBUaGFuayB5b3UgZm9yIHNoYXJpbmcgYW5vbnltb3VzIHVzYWdlIGRhdGEuIFNob3VsZCB5b3UgY2hhbmdlIHlvdXIgbWluZCwgdGhlIGZvbGxvd2luZ1xuICAgICAgICBjb21tYW5kIHdpbGwgZGlzYWJsZSB0aGlzIGZlYXR1cmUgZW50aXJlbHk6XG5cbiAgICAgICAgICAgICR7Y29sb3JzLnllbGxvdygnbmcgYW5hbHl0aWNzIHByb2plY3Qgb2ZmJyl9XG4gICAgICBgKTtcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcblxuICAgICAgLy8gU2VuZCBiYWNrIGEgcGluZyB3aXRoIHRoZSB1c2VyIGBvcHRpbmAuXG4gICAgICBjb25zdCB1YSA9IG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpRGVmYXVsdCwgJ29wdGluJyk7XG4gICAgICB1YS5wYWdldmlldygnL3RlbGVtZXRyeS9wcm9qZWN0L29wdGluJyk7XG4gICAgICBhd2FpdCB1YS5mbHVzaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTZW5kIGJhY2sgYSBwaW5nIHdpdGggdGhlIHVzZXIgYG9wdG91dGAuIFRoaXMgaXMgdGhlIG9ubHkgdGhpbmcgd2Ugc2VuZC5cbiAgICAgIGNvbnN0IHVhID0gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlEZWZhdWx0LCAnb3B0b3V0Jyk7XG4gICAgICB1YS5wYWdldmlldygnL3RlbGVtZXRyeS9wcm9qZWN0L29wdG91dCcpO1xuICAgICAgYXdhaXQgdWEuZmx1c2goKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhc0dsb2JhbEFuYWx5dGljc0NvbmZpZ3VyYXRpb24oKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgZ2xvYmFsV29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcbiAgICBjb25zdCBhbmFseXRpY3NDb25maWc6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwgfCB7IHVpZD86IHN0cmluZyB9ID1cbiAgICAgIGdsb2JhbFdvcmtzcGFjZSAmJiBnbG9iYWxXb3Jrc3BhY2UuZ2V0Q2xpKCkgJiYgZ2xvYmFsV29ya3NwYWNlLmdldENsaSgpWydhbmFseXRpY3MnXTtcblxuICAgIGlmIChhbmFseXRpY3NDb25maWcgIT09IG51bGwgJiYgYW5hbHl0aWNzQ29uZmlnICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBjYXRjaCB7fVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGdsb2JhbCBhbmFseXRpY3Mgb2JqZWN0IGZvciB0aGUgdXNlci4gVGhpcyByZXR1cm5zIGFuIGluc3RhbmNlIG9mIFVuaXZlcnNhbEFuYWx5dGljcyxcbiAqIG9yIHVuZGVmaW5lZCBpZiBhbmFseXRpY3MgYXJlIGRpc2FibGVkLlxuICpcbiAqIElmIGFueSBwcm9ibGVtIGhhcHBlbnMsIGl0IGlzIGNvbnNpZGVyZWQgdGhlIHVzZXIgaGFzIGJlZW4gb3B0aW5nIG91dCBvZiBhbmFseXRpY3MuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRHbG9iYWxBbmFseXRpY3MoKTogUHJvbWlzZTxBbmFseXRpY3NDb2xsZWN0b3IgfCB1bmRlZmluZWQ+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ2dldEdsb2JhbEFuYWx5dGljcycpO1xuICBjb25zdCBwcm9wZXJ0eUlkID0gQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpRGVmYXVsdDtcblxuICBpZiAoJ05HX0NMSV9BTkFMWVRJQ1MnIGluIHByb2Nlc3MuZW52KSB7XG4gICAgaWYgKHByb2Nlc3MuZW52WydOR19DTElfQU5BTFlUSUNTJ10gPT0gJ2ZhbHNlJyB8fCBwcm9jZXNzLmVudlsnTkdfQ0xJX0FOQUxZVElDUyddID09ICcnKSB7XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnTkdfQ0xJX0FOQUxZVElDUyBpcyBmYWxzZScpO1xuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBpZiAocHJvY2Vzcy5lbnZbJ05HX0NMSV9BTkFMWVRJQ1MnXSA9PT0gJ2NpJykge1xuICAgICAgYW5hbHl0aWNzRGVidWcoJ1J1bm5pbmcgaW4gQ0kgbW9kZScpO1xuXG4gICAgICByZXR1cm4gbmV3IEFuYWx5dGljc0NvbGxlY3Rvcihwcm9wZXJ0eUlkLCAnY2knKTtcbiAgICB9XG4gIH1cblxuICAvLyBJZiBhbnl0aGluZyBoYXBwZW5zIHdlIGp1c3Qga2VlcCB0aGUgTk9PUCBhbmFseXRpY3MuXG4gIHRyeSB7XG4gICAgY29uc3QgZ2xvYmFsV29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcbiAgICBjb25zdCBhbmFseXRpY3NDb25maWc6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwgfCB7IHVpZD86IHN0cmluZyB9ID1cbiAgICAgIGdsb2JhbFdvcmtzcGFjZSAmJiBnbG9iYWxXb3Jrc3BhY2UuZ2V0Q2xpKCkgJiYgZ2xvYmFsV29ya3NwYWNlLmdldENsaSgpWydhbmFseXRpY3MnXTtcbiAgICBhbmFseXRpY3NEZWJ1ZygnQ2xpZW50IEFuYWx5dGljcyBjb25maWcgZm91bmQ6ICVqJywgYW5hbHl0aWNzQ29uZmlnKTtcblxuICAgIGlmIChhbmFseXRpY3NDb25maWcgPT09IGZhbHNlKSB7XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnQW5hbHl0aWNzIGRpc2FibGVkLiBJZ25vcmluZyBhbGwgYW5hbHl0aWNzLicpO1xuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSBpZiAoYW5hbHl0aWNzQ29uZmlnID09PSB1bmRlZmluZWQgfHwgYW5hbHl0aWNzQ29uZmlnID09PSBudWxsKSB7XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnQW5hbHl0aWNzIHNldHRpbmdzIG5vdCBmb3VuZC4gSWdub3JpbmcgYWxsIGFuYWx5dGljcy4nKTtcblxuICAgICAgLy8gZ2xvYmFsV29ya3NwYWNlIGNhbiBiZSBudWxsIGlmIHRoZXJlIGlzIG5vIGZpbGUuIGFuYWx5dGljc0NvbmZpZyB3b3VsZCBiZSBudWxsIGluIHRoaXNcbiAgICAgIC8vIGNhc2UuIFNpbmNlIHRoZXJlIGlzIG5vIGZpbGUsIHRoZSB1c2VyIGhhc24ndCBhbnN3ZXJlZCBhbmQgdGhlIGV4cGVjdGVkIHJldHVybiB2YWx1ZSBpc1xuICAgICAgLy8gdW5kZWZpbmVkLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHVpZDogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgICAgaWYgKHR5cGVvZiBhbmFseXRpY3NDb25maWcgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdWlkID0gYW5hbHl0aWNzQ29uZmlnO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYW5hbHl0aWNzQ29uZmlnID09ICdvYmplY3QnICYmIHR5cGVvZiBhbmFseXRpY3NDb25maWdbJ3VpZCddID09ICdzdHJpbmcnKSB7XG4gICAgICAgIHVpZCA9IGFuYWx5dGljc0NvbmZpZ1sndWlkJ107XG4gICAgICB9XG5cbiAgICAgIGFuYWx5dGljc0RlYnVnKCdjbGllbnQgaWQ6ICVqJywgdWlkKTtcbiAgICAgIGlmICh1aWQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKHByb3BlcnR5SWQsIHVpZCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBhbmFseXRpY3NEZWJ1ZygnRXJyb3IgaGFwcGVuZWQgZHVyaW5nIHJlYWRpbmcgb2YgYW5hbHl0aWNzIGNvbmZpZzogJXMnLCBlcnIubWVzc2FnZSk7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYXNXb3Jrc3BhY2VBbmFseXRpY3NDb25maWd1cmF0aW9uKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGNvbnN0IGdsb2JhbFdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcbiAgICBjb25zdCBhbmFseXRpY3NDb25maWc6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwgfCB7IHVpZD86IHN0cmluZyB9ID1cbiAgICAgIGdsb2JhbFdvcmtzcGFjZSAmJiBnbG9iYWxXb3Jrc3BhY2UuZ2V0Q2xpKCkgJiYgZ2xvYmFsV29ya3NwYWNlLmdldENsaSgpWydhbmFseXRpY3MnXTtcblxuICAgIGlmIChhbmFseXRpY3NDb25maWcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGNhdGNoIHt9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEdldCB0aGUgd29ya3NwYWNlIGFuYWx5dGljcyBvYmplY3QgZm9yIHRoZSB1c2VyLiBUaGlzIHJldHVybnMgYW4gaW5zdGFuY2Ugb2YgQW5hbHl0aWNzQ29sbGVjdG9yLFxuICogb3IgdW5kZWZpbmVkIGlmIGFuYWx5dGljcyBhcmUgZGlzYWJsZWQuXG4gKlxuICogSWYgYW55IHByb2JsZW0gaGFwcGVucywgaXQgaXMgY29uc2lkZXJlZCB0aGUgdXNlciBoYXMgYmVlbiBvcHRpbmcgb3V0IG9mIGFuYWx5dGljcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFdvcmtzcGFjZUFuYWx5dGljcygpOiBQcm9taXNlPEFuYWx5dGljc0NvbGxlY3RvciB8IHVuZGVmaW5lZD4ge1xuICBhbmFseXRpY3NEZWJ1ZygnZ2V0V29ya3NwYWNlQW5hbHl0aWNzJyk7XG4gIHRyeSB7XG4gICAgY29uc3QgZ2xvYmFsV29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdsb2NhbCcpO1xuICAgIGNvbnN0IGFuYWx5dGljc0NvbmZpZzogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCB8IHsgdWlkPzogc3RyaW5nIH0gPVxuICAgICAgZ2xvYmFsV29ya3NwYWNlPy5nZXRDbGkoKVsnYW5hbHl0aWNzJ107XG4gICAgYW5hbHl0aWNzRGVidWcoJ1dvcmtzcGFjZSBBbmFseXRpY3MgY29uZmlnIGZvdW5kOiAlaicsIGFuYWx5dGljc0NvbmZpZyk7XG5cbiAgICBpZiAoYW5hbHl0aWNzQ29uZmlnID09PSBmYWxzZSkge1xuICAgICAgYW5hbHl0aWNzRGVidWcoJ0FuYWx5dGljcyBkaXNhYmxlZC4gSWdub3JpbmcgYWxsIGFuYWx5dGljcy4nKTtcblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2UgaWYgKGFuYWx5dGljc0NvbmZpZyA9PT0gdW5kZWZpbmVkIHx8IGFuYWx5dGljc0NvbmZpZyA9PT0gbnVsbCkge1xuICAgICAgYW5hbHl0aWNzRGVidWcoJ0FuYWx5dGljcyBzZXR0aW5ncyBub3QgZm91bmQuIElnbm9yaW5nIGFsbCBhbmFseXRpY3MuJyk7XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB1aWQ6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgIGlmICh0eXBlb2YgYW5hbHl0aWNzQ29uZmlnID09ICdzdHJpbmcnKSB7XG4gICAgICAgIHVpZCA9IGFuYWx5dGljc0NvbmZpZztcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGFuYWx5dGljc0NvbmZpZyA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgYW5hbHl0aWNzQ29uZmlnWyd1aWQnXSA9PSAnc3RyaW5nJykge1xuICAgICAgICB1aWQgPSBhbmFseXRpY3NDb25maWdbJ3VpZCddO1xuICAgICAgfVxuXG4gICAgICBhbmFseXRpY3NEZWJ1ZygnY2xpZW50IGlkOiAlaicsIHVpZCk7XG4gICAgICBpZiAodWlkID09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlEZWZhdWx0LCB1aWQpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgYW5hbHl0aWNzRGVidWcoJ0Vycm9yIGhhcHBlbmVkIGR1cmluZyByZWFkaW5nIG9mIGFuYWx5dGljcyBjb25maWc6ICVzJywgZXJyLm1lc3NhZ2UpO1xuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybiB0aGUgdXNhZ2UgYW5hbHl0aWNzIHNoYXJpbmcgc2V0dGluZywgd2hpY2ggaXMgZWl0aGVyIGEgcHJvcGVydHkgc3RyaW5nIChHQS1YWFhYWFhYLVhYKSxcbiAqIG9yIHVuZGVmaW5lZCBpZiBubyBzaGFyaW5nLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0U2hhcmVkQW5hbHl0aWNzKCk6IFByb21pc2U8QW5hbHl0aWNzQ29sbGVjdG9yIHwgdW5kZWZpbmVkPiB7XG4gIGFuYWx5dGljc0RlYnVnKCdnZXRTaGFyZWRBbmFseXRpY3MnKTtcblxuICBjb25zdCBlbnZWYXJOYW1lID0gJ05HX0NMSV9BTkFMWVRJQ1NfU0hBUkUnO1xuICBpZiAoZW52VmFyTmFtZSBpbiBwcm9jZXNzLmVudikge1xuICAgIGlmIChwcm9jZXNzLmVudltlbnZWYXJOYW1lXSA9PSAnZmFsc2UnIHx8IHByb2Nlc3MuZW52W2VudlZhck5hbWVdID09ICcnKSB7XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnTkdfQ0xJX0FOQUxZVElDUyBpcyBmYWxzZScpO1xuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8vIElmIGFueXRoaW5nIGhhcHBlbnMgd2UganVzdCBrZWVwIHRoZSBOT09QIGFuYWx5dGljcy5cbiAgdHJ5IHtcbiAgICBjb25zdCBnbG9iYWxXb3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIGNvbnN0IGFuYWx5dGljc0NvbmZpZyA9IGdsb2JhbFdvcmtzcGFjZT8uZ2V0Q2xpKClbJ2FuYWx5dGljc1NoYXJpbmcnXTtcblxuICAgIGlmICghYW5hbHl0aWNzQ29uZmlnIHx8ICFhbmFseXRpY3NDb25maWcudHJhY2tpbmcgfHwgIWFuYWx5dGljc0NvbmZpZy51dWlkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnQW5hbHl0aWNzIHNoYXJpbmcgaW5mbzogJWonLCBhbmFseXRpY3NDb25maWcpO1xuXG4gICAgICByZXR1cm4gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihhbmFseXRpY3NDb25maWcudHJhY2tpbmcsIGFuYWx5dGljc0NvbmZpZy51dWlkKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGFuYWx5dGljc0RlYnVnKCdFcnJvciBoYXBwZW5lZCBkdXJpbmcgcmVhZGluZyBvZiBhbmFseXRpY3Mgc2hhcmluZyBjb25maWc6ICVzJywgZXJyLm1lc3NhZ2UpO1xuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuIl19