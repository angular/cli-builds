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
exports.createAnalytics = exports.getSharedAnalytics = exports.getWorkspaceAnalytics = exports.hasWorkspaceAnalyticsConfiguration = exports.getGlobalAnalytics = exports.hasGlobalAnalyticsConfiguration = exports.promptProjectAnalytics = exports.promptGlobalAnalytics = exports.setAnalyticsConfig = exports.isPackageNameSafeForAnalytics = exports.analyticsPackageSafelist = exports.AnalyticsProperties = void 0;
const core_1 = require("@angular-devkit/core");
const debug_1 = __importDefault(require("debug"));
const inquirer = __importStar(require("inquirer"));
const uuid_1 = require("uuid");
const color_1 = require("../utilities/color");
const config_1 = require("../utilities/config");
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
async function createAnalytics(workspace, skipPrompt = false) {
    let config = await getGlobalAnalytics();
    // If in workspace and global analytics is enabled, defer to workspace level
    if (workspace && config) {
        const skipAnalytics = skipPrompt ||
            (process.env['NG_CLI_ANALYTICS'] &&
                (process.env['NG_CLI_ANALYTICS'].toLowerCase() === 'false' ||
                    process.env['NG_CLI_ANALYTICS'] === '0'));
        // TODO: This should honor the `no-interactive` option.
        //       It is currently not an `ng` option but rather only an option for specific commands.
        //       The concept of `ng`-wide options are needed to cleanly handle this.
        if (!skipAnalytics && !(await hasWorkspaceAnalyticsConfiguration())) {
            await promptProjectAnalytics();
        }
        config = await getWorkspaceAnalytics();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2FuYWx5dGljcy9hbmFseXRpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBNkQ7QUFDN0Qsa0RBQTBCO0FBQzFCLG1EQUFxQztBQUNyQywrQkFBb0M7QUFDcEMsOENBQTRDO0FBQzVDLGdEQUFvRTtBQUNwRSwwQ0FBeUM7QUFDekMsa0RBQStDO0FBQy9DLCtEQUEyRDtBQUUzRCwrQkFBK0I7QUFDL0IsTUFBTSxjQUFjLEdBQUcsSUFBQSxlQUFLLEVBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxvREFBb0Q7QUFFbEcsSUFBSSwrQkFBdUMsQ0FBQztBQUMvQixRQUFBLG1CQUFtQixHQUFHO0lBQ2pDLGNBQWMsRUFBRSxlQUFlO0lBQy9CLGlCQUFpQixFQUFFLGVBQWU7SUFDbEMsSUFBSSxpQkFBaUI7UUFDbkIsSUFBSSwrQkFBK0IsRUFBRTtZQUNuQyxPQUFPLCtCQUErQixDQUFDO1NBQ3hDO1FBRUQsTUFBTSxDQUFDLEdBQUcsaUJBQU8sQ0FBQyxJQUFJLENBQUM7UUFFdkIsK0VBQStFO1FBQy9FLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxPQUFPLEVBQUU7WUFDOUMsK0JBQStCLEdBQUcsMkJBQW1CLENBQUMsY0FBYyxDQUFDO1NBQ3RFO2FBQU07WUFDTCwrQkFBK0IsR0FBRywyQkFBbUIsQ0FBQyxpQkFBaUIsQ0FBQztTQUN6RTtRQUVELE9BQU8sK0JBQStCLENBQUM7SUFDekMsQ0FBQztDQUNGLENBQUM7QUFFRjs7R0FFRztBQUNVLFFBQUEsd0JBQXdCLEdBQUc7SUFDdEMsYUFBYTtJQUNiLG9CQUFvQjtJQUNwQixhQUFhO0lBQ2IscUJBQXFCO0NBQ3RCLENBQUM7QUFFRixTQUFnQiw2QkFBNkIsQ0FBQyxJQUFZO0lBQ3hELE9BQU8sZ0NBQXdCLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDL0MsSUFBSSxPQUFPLE9BQU8sSUFBSSxRQUFRLEVBQUU7WUFDOUIsT0FBTyxPQUFPLEtBQUssSUFBSSxDQUFDO1NBQ3pCO2FBQU07WUFDTCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDM0I7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFSRCxzRUFRQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FBQyxLQUF5QixFQUFFLEtBQXVCO0lBQ25GLGNBQWMsQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbEUsTUFBTSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsR0FBRyxJQUFBLHdCQUFlLEVBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEQsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixLQUFLLGFBQWEsQ0FBQyxDQUFDO0tBQ3ZEO0lBRUQsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFFaEMsSUFBSSxHQUFHLEtBQUssU0FBUyxJQUFJLENBQUMsV0FBSSxDQUFDLFlBQVksQ0FBQyxHQUFxQixDQUFDLEVBQUU7UUFDbEUsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsVUFBVSw0QkFBNEIsQ0FBQyxDQUFDO0tBQ3BGO0lBRUQsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFO1FBQ2xCLEtBQUssR0FBRyxJQUFBLFNBQU0sR0FBRSxDQUFDO0tBQ2xCO0lBRUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMzQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7SUFFZCxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDekIsQ0FBQztBQXJCRCxnREFxQkM7QUFFRDs7OztHQUlHO0FBQ0ksS0FBSyxVQUFVLHFCQUFxQixDQUFDLEtBQUssR0FBRyxLQUFLO0lBQ3ZELGNBQWMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQzlDLElBQUksS0FBSyxJQUFJLElBQUEsV0FBSyxHQUFFLEVBQUU7UUFDcEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUF5QjtZQUM1RDtnQkFDRSxJQUFJLEVBQUUsU0FBUztnQkFDZixJQUFJLEVBQUUsV0FBVztnQkFDakIsT0FBTyxFQUFFLFdBQUksQ0FBQyxZQUFZLENBQUE7Ozs7U0FJekI7Z0JBQ0QsT0FBTyxFQUFFLEtBQUs7YUFDZjtTQUNGLENBQUMsQ0FBQztRQUVILGtCQUFrQixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFaEQsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFO1lBQ3JCLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFJLENBQUMsV0FBVyxDQUFBOzs7O2NBSXBCLGNBQU0sQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUM7T0FDeEMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVoQiwwQ0FBMEM7WUFDMUMsTUFBTSxFQUFFLEdBQUcsSUFBSSx3Q0FBa0IsQ0FBQywyQkFBbUIsQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNsRixFQUFFLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDaEMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7U0FDbEI7YUFBTTtZQUNMLDJFQUEyRTtZQUMzRSxNQUFNLEVBQUUsR0FBRyxJQUFJLHdDQUFrQixDQUFDLDJCQUFtQixDQUFDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ25GLEVBQUUsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUNqQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUNsQjtRQUVELE9BQU8sSUFBSSxDQUFDO0tBQ2I7U0FBTTtRQUNMLGNBQWMsQ0FBQywrREFBK0QsQ0FBQyxDQUFDO0tBQ2pGO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDO0FBN0NELHNEQTZDQztBQUVEOzs7OztHQUtHO0FBQ0ksS0FBSyxVQUFVLHNCQUFzQixDQUFDLEtBQUssR0FBRyxLQUFLO0lBQ3hELGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2pDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEdBQUcsSUFBQSx3QkFBZSxFQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3RELElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO0tBQzVFO0lBRUQsSUFBSSxLQUFLLElBQUksSUFBQSxXQUFLLEdBQUUsRUFBRTtRQUNwQixNQUFNLE9BQU8sR0FBRyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQXlCO1lBQzVEO2dCQUNFLElBQUksRUFBRSxTQUFTO2dCQUNmLElBQUksRUFBRSxXQUFXO2dCQUNqQixPQUFPLEVBQUUsV0FBSSxDQUFDLFlBQVksQ0FBQTs7Ozs7U0FLekI7Z0JBQ0QsT0FBTyxFQUFFLEtBQUs7YUFDZjtTQUNGLENBQUMsQ0FBQztRQUVILGtCQUFrQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFL0MsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFO1lBQ3JCLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFJLENBQUMsV0FBVyxDQUFBOzs7O2NBSXBCLGNBQU0sQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUM7T0FDaEQsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVoQiwwQ0FBMEM7WUFDMUMsTUFBTSxFQUFFLEdBQUcsSUFBSSx3Q0FBa0IsQ0FBQywyQkFBbUIsQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNsRixFQUFFLENBQUMsUUFBUSxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDeEMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7U0FDbEI7YUFBTTtZQUNMLDJFQUEyRTtZQUMzRSxNQUFNLEVBQUUsR0FBRyxJQUFJLHdDQUFrQixDQUFDLDJCQUFtQixDQUFDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ25GLEVBQUUsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUN6QyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUNsQjtRQUVELE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFFRCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFqREQsd0RBaURDO0FBRU0sS0FBSyxVQUFVLCtCQUErQjtJQUNuRCxJQUFJO1FBQ0YsTUFBTSxlQUFlLEdBQUcsTUFBTSxJQUFBLHFCQUFZLEVBQUMsUUFBUSxDQUFDLENBQUM7UUFDckQsTUFBTSxlQUFlLEdBQ25CLGVBQWUsSUFBSSxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRXZGLElBQUksZUFBZSxLQUFLLElBQUksSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFO1lBQzdELE9BQU8sSUFBSSxDQUFDO1NBQ2I7S0FDRjtJQUFDLFdBQU0sR0FBRTtJQUVWLE9BQU8sS0FBSyxDQUFDO0FBQ2YsQ0FBQztBQVpELDBFQVlDO0FBRUQ7Ozs7O0dBS0c7QUFDSSxLQUFLLFVBQVUsa0JBQWtCO0lBQ3RDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ3JDLE1BQU0sVUFBVSxHQUFHLDJCQUFtQixDQUFDLGlCQUFpQixDQUFDO0lBRXpELElBQUksa0JBQWtCLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRTtRQUNyQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUN2RixjQUFjLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUU1QyxPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUNELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUM1QyxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUVyQyxPQUFPLElBQUksd0NBQWtCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ2pEO0tBQ0Y7SUFFRCx1REFBdUQ7SUFDdkQsSUFBSTtRQUNGLE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBQSxxQkFBWSxFQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sZUFBZSxHQUNuQixlQUFlLElBQUksZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN2RixjQUFjLENBQUMsbUNBQW1DLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFFckUsSUFBSSxlQUFlLEtBQUssS0FBSyxFQUFFO1lBQzdCLGNBQWMsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO1lBRTlELE9BQU8sU0FBUyxDQUFDO1NBQ2xCO2FBQU0sSUFBSSxlQUFlLEtBQUssU0FBUyxJQUFJLGVBQWUsS0FBSyxJQUFJLEVBQUU7WUFDcEUsY0FBYyxDQUFDLHVEQUF1RCxDQUFDLENBQUM7WUFFeEUseUZBQXlGO1lBQ3pGLDBGQUEwRjtZQUMxRixhQUFhO1lBQ2IsT0FBTyxTQUFTLENBQUM7U0FDbEI7YUFBTTtZQUNMLElBQUksR0FBRyxHQUF1QixTQUFTLENBQUM7WUFDeEMsSUFBSSxPQUFPLGVBQWUsSUFBSSxRQUFRLEVBQUU7Z0JBQ3RDLEdBQUcsR0FBRyxlQUFlLENBQUM7YUFDdkI7aUJBQU0sSUFBSSxPQUFPLGVBQWUsSUFBSSxRQUFRLElBQUksT0FBTyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksUUFBUSxFQUFFO2dCQUMxRixHQUFHLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQzlCO1lBRUQsY0FBYyxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsSUFBSSxTQUFTLEVBQUU7Z0JBQ3BCLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUQsT0FBTyxJQUFJLHdDQUFrQixDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUNoRDtLQUNGO0lBQUMsT0FBTyxHQUFHLEVBQUU7UUFDWixjQUFjLENBQUMsdURBQXVELEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXJGLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0FBQ0gsQ0FBQztBQXZERCxnREF1REM7QUFFTSxLQUFLLFVBQVUsa0NBQWtDO0lBQ3RELElBQUk7UUFDRixNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUEscUJBQVksRUFBQyxPQUFPLENBQUMsQ0FBQztRQUNwRCxNQUFNLGVBQWUsR0FDbkIsZUFBZSxJQUFJLGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFdkYsSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFO1lBQ2pDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7S0FDRjtJQUFDLFdBQU0sR0FBRTtJQUVWLE9BQU8sS0FBSyxDQUFDO0FBQ2YsQ0FBQztBQVpELGdGQVlDO0FBRUQ7Ozs7O0dBS0c7QUFDSSxLQUFLLFVBQVUscUJBQXFCO0lBQ3pDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0lBQ3hDLElBQUk7UUFDRixNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUEscUJBQVksRUFBQyxPQUFPLENBQUMsQ0FBQztRQUNwRCxNQUFNLGVBQWUsR0FDbkIsZUFBZSxhQUFmLGVBQWUsdUJBQWYsZUFBZSxDQUFFLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQztRQUN6QyxjQUFjLENBQUMsc0NBQXNDLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFFeEUsSUFBSSxlQUFlLEtBQUssS0FBSyxFQUFFO1lBQzdCLGNBQWMsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO1lBRTlELE9BQU8sU0FBUyxDQUFDO1NBQ2xCO2FBQU0sSUFBSSxlQUFlLEtBQUssU0FBUyxJQUFJLGVBQWUsS0FBSyxJQUFJLEVBQUU7WUFDcEUsY0FBYyxDQUFDLHVEQUF1RCxDQUFDLENBQUM7WUFFeEUsT0FBTyxTQUFTLENBQUM7U0FDbEI7YUFBTTtZQUNMLElBQUksR0FBRyxHQUF1QixTQUFTLENBQUM7WUFDeEMsSUFBSSxPQUFPLGVBQWUsSUFBSSxRQUFRLEVBQUU7Z0JBQ3RDLEdBQUcsR0FBRyxlQUFlLENBQUM7YUFDdkI7aUJBQU0sSUFBSSxPQUFPLGVBQWUsSUFBSSxRQUFRLElBQUksT0FBTyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksUUFBUSxFQUFFO2dCQUMxRixHQUFHLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQzlCO1lBRUQsY0FBYyxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsSUFBSSxTQUFTLEVBQUU7Z0JBQ3BCLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUQsT0FBTyxJQUFJLHdDQUFrQixDQUFDLDJCQUFtQixDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQzNFO0tBQ0Y7SUFBQyxPQUFPLEdBQUcsRUFBRTtRQUNaLGNBQWMsQ0FBQyx1REFBdUQsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFckYsT0FBTyxTQUFTLENBQUM7S0FDbEI7QUFDSCxDQUFDO0FBcENELHNEQW9DQztBQUVEOzs7R0FHRztBQUNJLEtBQUssVUFBVSxrQkFBa0I7SUFDdEMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFFckMsTUFBTSxVQUFVLEdBQUcsd0JBQXdCLENBQUM7SUFDNUMsSUFBSSxVQUFVLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRTtRQUM3QixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3ZFLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1lBRTVDLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO0tBQ0Y7SUFFRCx1REFBdUQ7SUFDdkQsSUFBSTtRQUNGLE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBQSxxQkFBWSxFQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sZUFBZSxHQUFHLGVBQWUsYUFBZixlQUFlLHVCQUFmLGVBQWUsQ0FBRSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsQ0FBQztRQUV0RSxJQUFJLENBQUMsZUFBZSxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUU7WUFDMUUsT0FBTyxTQUFTLENBQUM7U0FDbEI7YUFBTTtZQUNMLGNBQWMsQ0FBQyw0QkFBNEIsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUU5RCxPQUFPLElBQUksd0NBQWtCLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDL0U7S0FDRjtJQUFDLE9BQU8sR0FBRyxFQUFFO1FBQ1osY0FBYyxDQUFDLCtEQUErRCxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU3RixPQUFPLFNBQVMsQ0FBQztLQUNsQjtBQUNILENBQUM7QUE3QkQsZ0RBNkJDO0FBRU0sS0FBSyxVQUFVLGVBQWUsQ0FDbkMsU0FBa0IsRUFDbEIsVUFBVSxHQUFHLEtBQUs7SUFFbEIsSUFBSSxNQUFNLEdBQUcsTUFBTSxrQkFBa0IsRUFBRSxDQUFDO0lBQ3hDLDRFQUE0RTtJQUM1RSxJQUFJLFNBQVMsSUFBSSxNQUFNLEVBQUU7UUFDdkIsTUFBTSxhQUFhLEdBQ2pCLFVBQVU7WUFDVixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUM7Z0JBQzlCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLE9BQU87b0JBQ3hELE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2hELHVEQUF1RDtRQUN2RCw0RkFBNEY7UUFDNUYsNEVBQTRFO1FBQzVFLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFDLE1BQU0sa0NBQWtDLEVBQUUsQ0FBQyxFQUFFO1lBQ25FLE1BQU0sc0JBQXNCLEVBQUUsQ0FBQztTQUNoQztRQUNELE1BQU0sR0FBRyxNQUFNLHFCQUFxQixFQUFFLENBQUM7S0FDeEM7SUFFRCxNQUFNLG9CQUFvQixHQUFHLE1BQU0sa0JBQWtCLEVBQUUsQ0FBQztJQUV4RCxJQUFJLE1BQU0sSUFBSSxvQkFBb0IsRUFBRTtRQUNsQyxPQUFPLElBQUksZ0JBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO0tBQ3JFO1NBQU0sSUFBSSxNQUFNLEVBQUU7UUFDakIsT0FBTyxNQUFNLENBQUM7S0FDZjtTQUFNLElBQUksb0JBQW9CLEVBQUU7UUFDL0IsT0FBTyxvQkFBb0IsQ0FBQztLQUM3QjtTQUFNO1FBQ0wsT0FBTyxJQUFJLGdCQUFTLENBQUMsYUFBYSxFQUFFLENBQUM7S0FDdEM7QUFDSCxDQUFDO0FBaENELDBDQWdDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBhbmFseXRpY3MsIGpzb24sIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnO1xuaW1wb3J0ICogYXMgaW5xdWlyZXIgZnJvbSAnaW5xdWlyZXInO1xuaW1wb3J0IHsgdjQgYXMgdXVpZFY0IH0gZnJvbSAndXVpZCc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCBnZXRXb3Jrc3BhY2VSYXcgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3R0eSc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3ZlcnNpb24nO1xuaW1wb3J0IHsgQW5hbHl0aWNzQ29sbGVjdG9yIH0gZnJvbSAnLi9hbmFseXRpY3MtY29sbGVjdG9yJztcblxuLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuY29uc3QgYW5hbHl0aWNzRGVidWcgPSBkZWJ1Zygnbmc6YW5hbHl0aWNzJyk7IC8vIEdlbmVyYXRlIGFuYWx5dGljcywgaW5jbHVkaW5nIHNldHRpbmdzIGFuZCB1c2Vycy5cblxubGV0IF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGU6IHN0cmluZztcbmV4cG9ydCBjb25zdCBBbmFseXRpY3NQcm9wZXJ0aWVzID0ge1xuICBBbmd1bGFyQ2xpUHJvZDogJ1VBLTg1OTQzNDYtMjknLFxuICBBbmd1bGFyQ2xpU3RhZ2luZzogJ1VBLTg1OTQzNDYtMzInLFxuICBnZXQgQW5ndWxhckNsaURlZmF1bHQoKTogc3RyaW5nIHtcbiAgICBpZiAoX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZSkge1xuICAgICAgcmV0dXJuIF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGU7XG4gICAgfVxuXG4gICAgY29uc3QgdiA9IFZFUlNJT04uZnVsbDtcblxuICAgIC8vIFRoZSBsb2dpYyBpcyBpZiBpdCdzIGEgZnVsbCB2ZXJzaW9uIHRoZW4gd2Ugc2hvdWxkIHVzZSB0aGUgcHJvZCBHQSBwcm9wZXJ0eS5cbiAgICBpZiAoL15cXGQrXFwuXFxkK1xcLlxcZCskLy50ZXN0KHYpICYmIHYgIT09ICcwLjAuMCcpIHtcbiAgICAgIF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGUgPSBBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlQcm9kO1xuICAgIH0gZWxzZSB7XG4gICAgICBfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlID0gQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpU3RhZ2luZztcbiAgICB9XG5cbiAgICByZXR1cm4gX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZTtcbiAgfSxcbn07XG5cbi8qKlxuICogVGhpcyBpcyB0aGUgdWx0aW1hdGUgc2FmZWxpc3QgZm9yIGNoZWNraW5nIGlmIGEgcGFja2FnZSBuYW1lIGlzIHNhZmUgdG8gcmVwb3J0IHRvIGFuYWx5dGljcy5cbiAqL1xuZXhwb3J0IGNvbnN0IGFuYWx5dGljc1BhY2thZ2VTYWZlbGlzdCA9IFtcbiAgL15AYW5ndWxhclxcLy8sXG4gIC9eQGFuZ3VsYXItZGV2a2l0XFwvLyxcbiAgL15Abmd0b29sc1xcLy8sXG4gICdAc2NoZW1hdGljcy9hbmd1bGFyJyxcbl07XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGFuYWx5dGljc1BhY2thZ2VTYWZlbGlzdC5zb21lKChwYXR0ZXJuKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBwYXR0ZXJuID09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gcGF0dGVybiA9PT0gbmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHBhdHRlcm4udGVzdChuYW1lKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIFNldCBhbmFseXRpY3Mgc2V0dGluZ3MuIFRoaXMgZG9lcyBub3Qgd29yayBpZiB0aGUgdXNlciBpcyBub3QgaW5zaWRlIGEgcHJvamVjdC5cbiAqIEBwYXJhbSBsZXZlbCBXaGljaCBjb25maWcgdG8gdXNlLiBcImdsb2JhbFwiIGZvciB1c2VyLWxldmVsLCBhbmQgXCJsb2NhbFwiIGZvciBwcm9qZWN0LWxldmVsLlxuICogQHBhcmFtIHZhbHVlIEVpdGhlciBhIHVzZXIgSUQsIHRydWUgdG8gZ2VuZXJhdGUgYSBuZXcgVXNlciBJRCwgb3IgZmFsc2UgdG8gZGlzYWJsZSBhbmFseXRpY3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRBbmFseXRpY3NDb25maWcobGV2ZWw6ICdnbG9iYWwnIHwgJ2xvY2FsJywgdmFsdWU6IHN0cmluZyB8IGJvb2xlYW4pIHtcbiAgYW5hbHl0aWNzRGVidWcoJ3NldHRpbmcgJXMgbGV2ZWwgYW5hbHl0aWNzIHRvOiAlcycsIGxldmVsLCB2YWx1ZSk7XG4gIGNvbnN0IFtjb25maWcsIGNvbmZpZ1BhdGhdID0gZ2V0V29ya3NwYWNlUmF3KGxldmVsKTtcbiAgaWYgKCFjb25maWcgfHwgIWNvbmZpZ1BhdGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kICR7bGV2ZWx9IHdvcmtzcGFjZS5gKTtcbiAgfVxuXG4gIGNvbnN0IGNsaSA9IGNvbmZpZy5nZXQoWydjbGknXSk7XG5cbiAgaWYgKGNsaSAhPT0gdW5kZWZpbmVkICYmICFqc29uLmlzSnNvbk9iamVjdChjbGkgYXMganNvbi5Kc29uVmFsdWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZyBmb3VuZCBhdCAke2NvbmZpZ1BhdGh9LiBDTEkgc2hvdWxkIGJlIGFuIG9iamVjdC5gKTtcbiAgfVxuXG4gIGlmICh2YWx1ZSA9PT0gdHJ1ZSkge1xuICAgIHZhbHVlID0gdXVpZFY0KCk7XG4gIH1cblxuICBjb25maWcubW9kaWZ5KFsnY2xpJywgJ2FuYWx5dGljcyddLCB2YWx1ZSk7XG4gIGNvbmZpZy5zYXZlKCk7XG5cbiAgYW5hbHl0aWNzRGVidWcoJ2RvbmUnKTtcbn1cblxuLyoqXG4gKiBQcm9tcHQgdGhlIHVzZXIgZm9yIHVzYWdlIGdhdGhlcmluZyBwZXJtaXNzaW9uLlxuICogQHBhcmFtIGZvcmNlIFdoZXRoZXIgdG8gYXNrIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBvciBub3QgdGhlIHVzZXIgaXMgdXNpbmcgYW4gaW50ZXJhY3RpdmUgc2hlbGwuXG4gKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIHdhcyBzaG93biBhIHByb21wdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByb21wdEdsb2JhbEFuYWx5dGljcyhmb3JjZSA9IGZhbHNlKSB7XG4gIGFuYWx5dGljc0RlYnVnKCdwcm9tcHRpbmcgZ2xvYmFsIGFuYWx5dGljcy4nKTtcbiAgaWYgKGZvcmNlIHx8IGlzVFRZKCkpIHtcbiAgICBjb25zdCBhbnN3ZXJzID0gYXdhaXQgaW5xdWlyZXIucHJvbXB0PHsgYW5hbHl0aWNzOiBib29sZWFuIH0+KFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NvbmZpcm0nLFxuICAgICAgICBuYW1lOiAnYW5hbHl0aWNzJyxcbiAgICAgICAgbWVzc2FnZTogdGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgICAgV291bGQgeW91IGxpa2UgdG8gc2hhcmUgYW5vbnltb3VzIHVzYWdlIGRhdGEgd2l0aCB0aGUgQW5ndWxhciBUZWFtIGF0IEdvb2dsZSB1bmRlclxuICAgICAgICAgIEdvb2dsZeKAmXMgUHJpdmFjeSBQb2xpY3kgYXQgaHR0cHM6Ly9wb2xpY2llcy5nb29nbGUuY29tL3ByaXZhY3k/IEZvciBtb3JlIGRldGFpbHMgYW5kXG4gICAgICAgICAgaG93IHRvIGNoYW5nZSB0aGlzIHNldHRpbmcsIHNlZSBodHRwczovL2FuZ3VsYXIuaW8vYW5hbHl0aWNzLlxuICAgICAgICBgLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0sXG4gICAgXSk7XG5cbiAgICBzZXRBbmFseXRpY3NDb25maWcoJ2dsb2JhbCcsIGFuc3dlcnMuYW5hbHl0aWNzKTtcblxuICAgIGlmIChhbnN3ZXJzLmFuYWx5dGljcykge1xuICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgY29uc29sZS5sb2codGFncy5zdHJpcEluZGVudGBcbiAgICAgICAgVGhhbmsgeW91IGZvciBzaGFyaW5nIGFub255bW91cyB1c2FnZSBkYXRhLiBJZiB5b3UgY2hhbmdlIHlvdXIgbWluZCwgdGhlIGZvbGxvd2luZ1xuICAgICAgICBjb21tYW5kIHdpbGwgZGlzYWJsZSB0aGlzIGZlYXR1cmUgZW50aXJlbHk6XG5cbiAgICAgICAgICAgICR7Y29sb3JzLnllbGxvdygnbmcgYW5hbHl0aWNzIG9mZicpfVxuICAgICAgYCk7XG4gICAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICAgIC8vIFNlbmQgYmFjayBhIHBpbmcgd2l0aCB0aGUgdXNlciBgb3B0aW5gLlxuICAgICAgY29uc3QgdWEgPSBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaURlZmF1bHQsICdvcHRpbicpO1xuICAgICAgdWEucGFnZXZpZXcoJy90ZWxlbWV0cnkvb3B0aW4nKTtcbiAgICAgIGF3YWl0IHVhLmZsdXNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNlbmQgYmFjayBhIHBpbmcgd2l0aCB0aGUgdXNlciBgb3B0b3V0YC4gVGhpcyBpcyB0aGUgb25seSB0aGluZyB3ZSBzZW5kLlxuICAgICAgY29uc3QgdWEgPSBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaURlZmF1bHQsICdvcHRvdXQnKTtcbiAgICAgIHVhLnBhZ2V2aWV3KCcvdGVsZW1ldHJ5L29wdG91dCcpO1xuICAgICAgYXdhaXQgdWEuZmx1c2goKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICBhbmFseXRpY3NEZWJ1ZygnRWl0aGVyIFNURE9VVCBvciBTVERJTiBhcmUgbm90IFRUWSBhbmQgd2Ugc2tpcHBlZCB0aGUgcHJvbXB0LicpO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIFByb21wdCB0aGUgdXNlciBmb3IgdXNhZ2UgZ2F0aGVyaW5nIHBlcm1pc3Npb24gZm9yIHRoZSBsb2NhbCBwcm9qZWN0LiBGYWlscyBpZiB0aGVyZSBpcyBub1xuICogbG9jYWwgd29ya3NwYWNlLlxuICogQHBhcmFtIGZvcmNlIFdoZXRoZXIgdG8gYXNrIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBvciBub3QgdGhlIHVzZXIgaXMgdXNpbmcgYW4gaW50ZXJhY3RpdmUgc2hlbGwuXG4gKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIHdhcyBzaG93biBhIHByb21wdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByb21wdFByb2plY3RBbmFseXRpY3MoZm9yY2UgPSBmYWxzZSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBhbmFseXRpY3NEZWJ1ZygncHJvbXB0aW5nIHVzZXInKTtcbiAgY29uc3QgW2NvbmZpZywgY29uZmlnUGF0aF0gPSBnZXRXb3Jrc3BhY2VSYXcoJ2xvY2FsJyk7XG4gIGlmICghY29uZmlnIHx8ICFjb25maWdQYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBhIGxvY2FsIHdvcmtzcGFjZS4gQXJlIHlvdSBpbiBhIHByb2plY3Q/YCk7XG4gIH1cblxuICBpZiAoZm9yY2UgfHwgaXNUVFkoKSkge1xuICAgIGNvbnN0IGFuc3dlcnMgPSBhd2FpdCBpbnF1aXJlci5wcm9tcHQ8eyBhbmFseXRpY3M6IGJvb2xlYW4gfT4oW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnY29uZmlybScsXG4gICAgICAgIG5hbWU6ICdhbmFseXRpY3MnLFxuICAgICAgICBtZXNzYWdlOiB0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBXb3VsZCB5b3UgbGlrZSB0byBzaGFyZSBhbm9ueW1vdXMgdXNhZ2UgZGF0YSBhYm91dCB0aGlzIHByb2plY3Qgd2l0aCB0aGUgQW5ndWxhciBUZWFtIGF0XG4gICAgICAgICAgR29vZ2xlIHVuZGVyIEdvb2dsZeKAmXMgUHJpdmFjeSBQb2xpY3kgYXQgaHR0cHM6Ly9wb2xpY2llcy5nb29nbGUuY29tL3ByaXZhY3k/IEZvciBtb3JlXG4gICAgICAgICAgZGV0YWlscyBhbmQgaG93IHRvIGNoYW5nZSB0aGlzIHNldHRpbmcsIHNlZSBodHRwczovL2FuZ3VsYXIuaW8vYW5hbHl0aWNzLlxuXG4gICAgICAgIGAsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSxcbiAgICBdKTtcblxuICAgIHNldEFuYWx5dGljc0NvbmZpZygnbG9jYWwnLCBhbnN3ZXJzLmFuYWx5dGljcyk7XG5cbiAgICBpZiAoYW5zd2Vycy5hbmFseXRpY3MpIHtcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIGNvbnNvbGUubG9nKHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIFRoYW5rIHlvdSBmb3Igc2hhcmluZyBhbm9ueW1vdXMgdXNhZ2UgZGF0YS4gU2hvdWxkIHlvdSBjaGFuZ2UgeW91ciBtaW5kLCB0aGUgZm9sbG93aW5nXG4gICAgICAgIGNvbW1hbmQgd2lsbCBkaXNhYmxlIHRoaXMgZmVhdHVyZSBlbnRpcmVseTpcblxuICAgICAgICAgICAgJHtjb2xvcnMueWVsbG93KCduZyBhbmFseXRpY3MgcHJvamVjdCBvZmYnKX1cbiAgICAgIGApO1xuICAgICAgY29uc29sZS5sb2coJycpO1xuXG4gICAgICAvLyBTZW5kIGJhY2sgYSBwaW5nIHdpdGggdGhlIHVzZXIgYG9wdGluYC5cbiAgICAgIGNvbnN0IHVhID0gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlEZWZhdWx0LCAnb3B0aW4nKTtcbiAgICAgIHVhLnBhZ2V2aWV3KCcvdGVsZW1ldHJ5L3Byb2plY3Qvb3B0aW4nKTtcbiAgICAgIGF3YWl0IHVhLmZsdXNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNlbmQgYmFjayBhIHBpbmcgd2l0aCB0aGUgdXNlciBgb3B0b3V0YC4gVGhpcyBpcyB0aGUgb25seSB0aGluZyB3ZSBzZW5kLlxuICAgICAgY29uc3QgdWEgPSBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaURlZmF1bHQsICdvcHRvdXQnKTtcbiAgICAgIHVhLnBhZ2V2aWV3KCcvdGVsZW1ldHJ5L3Byb2plY3Qvb3B0b3V0Jyk7XG4gICAgICBhd2FpdCB1YS5mbHVzaCgpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFzR2xvYmFsQW5hbHl0aWNzQ29uZmlndXJhdGlvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBnbG9iYWxXb3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIGNvbnN0IGFuYWx5dGljc0NvbmZpZzogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCB8IHsgdWlkPzogc3RyaW5nIH0gPVxuICAgICAgZ2xvYmFsV29ya3NwYWNlICYmIGdsb2JhbFdvcmtzcGFjZS5nZXRDbGkoKSAmJiBnbG9iYWxXb3Jrc3BhY2UuZ2V0Q2xpKClbJ2FuYWx5dGljcyddO1xuXG4gICAgaWYgKGFuYWx5dGljc0NvbmZpZyAhPT0gbnVsbCAmJiBhbmFseXRpY3NDb25maWcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGNhdGNoIHt9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEdldCB0aGUgZ2xvYmFsIGFuYWx5dGljcyBvYmplY3QgZm9yIHRoZSB1c2VyLiBUaGlzIHJldHVybnMgYW4gaW5zdGFuY2Ugb2YgVW5pdmVyc2FsQW5hbHl0aWNzLFxuICogb3IgdW5kZWZpbmVkIGlmIGFuYWx5dGljcyBhcmUgZGlzYWJsZWQuXG4gKlxuICogSWYgYW55IHByb2JsZW0gaGFwcGVucywgaXQgaXMgY29uc2lkZXJlZCB0aGUgdXNlciBoYXMgYmVlbiBvcHRpbmcgb3V0IG9mIGFuYWx5dGljcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEdsb2JhbEFuYWx5dGljcygpOiBQcm9taXNlPEFuYWx5dGljc0NvbGxlY3RvciB8IHVuZGVmaW5lZD4ge1xuICBhbmFseXRpY3NEZWJ1ZygnZ2V0R2xvYmFsQW5hbHl0aWNzJyk7XG4gIGNvbnN0IHByb3BlcnR5SWQgPSBBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlEZWZhdWx0O1xuXG4gIGlmICgnTkdfQ0xJX0FOQUxZVElDUycgaW4gcHJvY2Vzcy5lbnYpIHtcbiAgICBpZiAocHJvY2Vzcy5lbnZbJ05HX0NMSV9BTkFMWVRJQ1MnXSA9PSAnZmFsc2UnIHx8IHByb2Nlc3MuZW52WydOR19DTElfQU5BTFlUSUNTJ10gPT0gJycpIHtcbiAgICAgIGFuYWx5dGljc0RlYnVnKCdOR19DTElfQU5BTFlUSUNTIGlzIGZhbHNlJyk7XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGlmIChwcm9jZXNzLmVudlsnTkdfQ0xJX0FOQUxZVElDUyddID09PSAnY2knKSB7XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnUnVubmluZyBpbiBDSSBtb2RlJyk7XG5cbiAgICAgIHJldHVybiBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKHByb3BlcnR5SWQsICdjaScpO1xuICAgIH1cbiAgfVxuXG4gIC8vIElmIGFueXRoaW5nIGhhcHBlbnMgd2UganVzdCBrZWVwIHRoZSBOT09QIGFuYWx5dGljcy5cbiAgdHJ5IHtcbiAgICBjb25zdCBnbG9iYWxXb3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIGNvbnN0IGFuYWx5dGljc0NvbmZpZzogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCB8IHsgdWlkPzogc3RyaW5nIH0gPVxuICAgICAgZ2xvYmFsV29ya3NwYWNlICYmIGdsb2JhbFdvcmtzcGFjZS5nZXRDbGkoKSAmJiBnbG9iYWxXb3Jrc3BhY2UuZ2V0Q2xpKClbJ2FuYWx5dGljcyddO1xuICAgIGFuYWx5dGljc0RlYnVnKCdDbGllbnQgQW5hbHl0aWNzIGNvbmZpZyBmb3VuZDogJWonLCBhbmFseXRpY3NDb25maWcpO1xuXG4gICAgaWYgKGFuYWx5dGljc0NvbmZpZyA9PT0gZmFsc2UpIHtcbiAgICAgIGFuYWx5dGljc0RlYnVnKCdBbmFseXRpY3MgZGlzYWJsZWQuIElnbm9yaW5nIGFsbCBhbmFseXRpY3MuJyk7XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIGlmIChhbmFseXRpY3NDb25maWcgPT09IHVuZGVmaW5lZCB8fCBhbmFseXRpY3NDb25maWcgPT09IG51bGwpIHtcbiAgICAgIGFuYWx5dGljc0RlYnVnKCdBbmFseXRpY3Mgc2V0dGluZ3Mgbm90IGZvdW5kLiBJZ25vcmluZyBhbGwgYW5hbHl0aWNzLicpO1xuXG4gICAgICAvLyBnbG9iYWxXb3Jrc3BhY2UgY2FuIGJlIG51bGwgaWYgdGhlcmUgaXMgbm8gZmlsZS4gYW5hbHl0aWNzQ29uZmlnIHdvdWxkIGJlIG51bGwgaW4gdGhpc1xuICAgICAgLy8gY2FzZS4gU2luY2UgdGhlcmUgaXMgbm8gZmlsZSwgdGhlIHVzZXIgaGFzbid0IGFuc3dlcmVkIGFuZCB0aGUgZXhwZWN0ZWQgcmV0dXJuIHZhbHVlIGlzXG4gICAgICAvLyB1bmRlZmluZWQuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgdWlkOiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICBpZiAodHlwZW9mIGFuYWx5dGljc0NvbmZpZyA9PSAnc3RyaW5nJykge1xuICAgICAgICB1aWQgPSBhbmFseXRpY3NDb25maWc7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhbmFseXRpY3NDb25maWcgPT0gJ29iamVjdCcgJiYgdHlwZW9mIGFuYWx5dGljc0NvbmZpZ1sndWlkJ10gPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdWlkID0gYW5hbHl0aWNzQ29uZmlnWyd1aWQnXTtcbiAgICAgIH1cblxuICAgICAgYW5hbHl0aWNzRGVidWcoJ2NsaWVudCBpZDogJWonLCB1aWQpO1xuICAgICAgaWYgKHVpZCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBBbmFseXRpY3NDb2xsZWN0b3IocHJvcGVydHlJZCwgdWlkKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGFuYWx5dGljc0RlYnVnKCdFcnJvciBoYXBwZW5lZCBkdXJpbmcgcmVhZGluZyBvZiBhbmFseXRpY3MgY29uZmlnOiAlcycsIGVyci5tZXNzYWdlKTtcblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhc1dvcmtzcGFjZUFuYWx5dGljc0NvbmZpZ3VyYXRpb24oKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgZ2xvYmFsV29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdsb2NhbCcpO1xuICAgIGNvbnN0IGFuYWx5dGljc0NvbmZpZzogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCB8IHsgdWlkPzogc3RyaW5nIH0gPVxuICAgICAgZ2xvYmFsV29ya3NwYWNlICYmIGdsb2JhbFdvcmtzcGFjZS5nZXRDbGkoKSAmJiBnbG9iYWxXb3Jrc3BhY2UuZ2V0Q2xpKClbJ2FuYWx5dGljcyddO1xuXG4gICAgaWYgKGFuYWx5dGljc0NvbmZpZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0gY2F0Y2gge31cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogR2V0IHRoZSB3b3Jrc3BhY2UgYW5hbHl0aWNzIG9iamVjdCBmb3IgdGhlIHVzZXIuIFRoaXMgcmV0dXJucyBhbiBpbnN0YW5jZSBvZiBBbmFseXRpY3NDb2xsZWN0b3IsXG4gKiBvciB1bmRlZmluZWQgaWYgYW5hbHl0aWNzIGFyZSBkaXNhYmxlZC5cbiAqXG4gKiBJZiBhbnkgcHJvYmxlbSBoYXBwZW5zLCBpdCBpcyBjb25zaWRlcmVkIHRoZSB1c2VyIGhhcyBiZWVuIG9wdGluZyBvdXQgb2YgYW5hbHl0aWNzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0V29ya3NwYWNlQW5hbHl0aWNzKCk6IFByb21pc2U8QW5hbHl0aWNzQ29sbGVjdG9yIHwgdW5kZWZpbmVkPiB7XG4gIGFuYWx5dGljc0RlYnVnKCdnZXRXb3Jrc3BhY2VBbmFseXRpY3MnKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBnbG9iYWxXb3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG4gICAgY29uc3QgYW5hbHl0aWNzQ29uZmlnOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsIHwgeyB1aWQ/OiBzdHJpbmcgfSA9XG4gICAgICBnbG9iYWxXb3Jrc3BhY2U/LmdldENsaSgpWydhbmFseXRpY3MnXTtcbiAgICBhbmFseXRpY3NEZWJ1ZygnV29ya3NwYWNlIEFuYWx5dGljcyBjb25maWcgZm91bmQ6ICVqJywgYW5hbHl0aWNzQ29uZmlnKTtcblxuICAgIGlmIChhbmFseXRpY3NDb25maWcgPT09IGZhbHNlKSB7XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnQW5hbHl0aWNzIGRpc2FibGVkLiBJZ25vcmluZyBhbGwgYW5hbHl0aWNzLicpO1xuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSBpZiAoYW5hbHl0aWNzQ29uZmlnID09PSB1bmRlZmluZWQgfHwgYW5hbHl0aWNzQ29uZmlnID09PSBudWxsKSB7XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnQW5hbHl0aWNzIHNldHRpbmdzIG5vdCBmb3VuZC4gSWdub3JpbmcgYWxsIGFuYWx5dGljcy4nKTtcblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHVpZDogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgICAgaWYgKHR5cGVvZiBhbmFseXRpY3NDb25maWcgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdWlkID0gYW5hbHl0aWNzQ29uZmlnO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYW5hbHl0aWNzQ29uZmlnID09ICdvYmplY3QnICYmIHR5cGVvZiBhbmFseXRpY3NDb25maWdbJ3VpZCddID09ICdzdHJpbmcnKSB7XG4gICAgICAgIHVpZCA9IGFuYWx5dGljc0NvbmZpZ1sndWlkJ107XG4gICAgICB9XG5cbiAgICAgIGFuYWx5dGljc0RlYnVnKCdjbGllbnQgaWQ6ICVqJywgdWlkKTtcbiAgICAgIGlmICh1aWQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaURlZmF1bHQsIHVpZCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBhbmFseXRpY3NEZWJ1ZygnRXJyb3IgaGFwcGVuZWQgZHVyaW5nIHJlYWRpbmcgb2YgYW5hbHl0aWNzIGNvbmZpZzogJXMnLCBlcnIubWVzc2FnZSk7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSB1c2FnZSBhbmFseXRpY3Mgc2hhcmluZyBzZXR0aW5nLCB3aGljaCBpcyBlaXRoZXIgYSBwcm9wZXJ0eSBzdHJpbmcgKEdBLVhYWFhYWFgtWFgpLFxuICogb3IgdW5kZWZpbmVkIGlmIG5vIHNoYXJpbmcuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRTaGFyZWRBbmFseXRpY3MoKTogUHJvbWlzZTxBbmFseXRpY3NDb2xsZWN0b3IgfCB1bmRlZmluZWQ+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ2dldFNoYXJlZEFuYWx5dGljcycpO1xuXG4gIGNvbnN0IGVudlZhck5hbWUgPSAnTkdfQ0xJX0FOQUxZVElDU19TSEFSRSc7XG4gIGlmIChlbnZWYXJOYW1lIGluIHByb2Nlc3MuZW52KSB7XG4gICAgaWYgKHByb2Nlc3MuZW52W2VudlZhck5hbWVdID09ICdmYWxzZScgfHwgcHJvY2Vzcy5lbnZbZW52VmFyTmFtZV0gPT0gJycpIHtcbiAgICAgIGFuYWx5dGljc0RlYnVnKCdOR19DTElfQU5BTFlUSUNTIGlzIGZhbHNlJyk7XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLy8gSWYgYW55dGhpbmcgaGFwcGVucyB3ZSBqdXN0IGtlZXAgdGhlIE5PT1AgYW5hbHl0aWNzLlxuICB0cnkge1xuICAgIGNvbnN0IGdsb2JhbFdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgY29uc3QgYW5hbHl0aWNzQ29uZmlnID0gZ2xvYmFsV29ya3NwYWNlPy5nZXRDbGkoKVsnYW5hbHl0aWNzU2hhcmluZyddO1xuXG4gICAgaWYgKCFhbmFseXRpY3NDb25maWcgfHwgIWFuYWx5dGljc0NvbmZpZy50cmFja2luZyB8fCAhYW5hbHl0aWNzQ29uZmlnLnV1aWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFuYWx5dGljc0RlYnVnKCdBbmFseXRpY3Mgc2hhcmluZyBpbmZvOiAlaicsIGFuYWx5dGljc0NvbmZpZyk7XG5cbiAgICAgIHJldHVybiBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKGFuYWx5dGljc0NvbmZpZy50cmFja2luZywgYW5hbHl0aWNzQ29uZmlnLnV1aWQpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgYW5hbHl0aWNzRGVidWcoJ0Vycm9yIGhhcHBlbmVkIGR1cmluZyByZWFkaW5nIG9mIGFuYWx5dGljcyBzaGFyaW5nIGNvbmZpZzogJXMnLCBlcnIubWVzc2FnZSk7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVBbmFseXRpY3MoXG4gIHdvcmtzcGFjZTogYm9vbGVhbixcbiAgc2tpcFByb21wdCA9IGZhbHNlLFxuKTogUHJvbWlzZTxhbmFseXRpY3MuQW5hbHl0aWNzPiB7XG4gIGxldCBjb25maWcgPSBhd2FpdCBnZXRHbG9iYWxBbmFseXRpY3MoKTtcbiAgLy8gSWYgaW4gd29ya3NwYWNlIGFuZCBnbG9iYWwgYW5hbHl0aWNzIGlzIGVuYWJsZWQsIGRlZmVyIHRvIHdvcmtzcGFjZSBsZXZlbFxuICBpZiAod29ya3NwYWNlICYmIGNvbmZpZykge1xuICAgIGNvbnN0IHNraXBBbmFseXRpY3MgPVxuICAgICAgc2tpcFByb21wdCB8fFxuICAgICAgKHByb2Nlc3MuZW52WydOR19DTElfQU5BTFlUSUNTJ10gJiZcbiAgICAgICAgKHByb2Nlc3MuZW52WydOR19DTElfQU5BTFlUSUNTJ10udG9Mb3dlckNhc2UoKSA9PT0gJ2ZhbHNlJyB8fFxuICAgICAgICAgIHByb2Nlc3MuZW52WydOR19DTElfQU5BTFlUSUNTJ10gPT09ICcwJykpO1xuICAgIC8vIFRPRE86IFRoaXMgc2hvdWxkIGhvbm9yIHRoZSBgbm8taW50ZXJhY3RpdmVgIG9wdGlvbi5cbiAgICAvLyAgICAgICBJdCBpcyBjdXJyZW50bHkgbm90IGFuIGBuZ2Agb3B0aW9uIGJ1dCByYXRoZXIgb25seSBhbiBvcHRpb24gZm9yIHNwZWNpZmljIGNvbW1hbmRzLlxuICAgIC8vICAgICAgIFRoZSBjb25jZXB0IG9mIGBuZ2Atd2lkZSBvcHRpb25zIGFyZSBuZWVkZWQgdG8gY2xlYW5seSBoYW5kbGUgdGhpcy5cbiAgICBpZiAoIXNraXBBbmFseXRpY3MgJiYgIShhd2FpdCBoYXNXb3Jrc3BhY2VBbmFseXRpY3NDb25maWd1cmF0aW9uKCkpKSB7XG4gICAgICBhd2FpdCBwcm9tcHRQcm9qZWN0QW5hbHl0aWNzKCk7XG4gICAgfVxuICAgIGNvbmZpZyA9IGF3YWl0IGdldFdvcmtzcGFjZUFuYWx5dGljcygpO1xuICB9XG5cbiAgY29uc3QgbWF5YmVTaGFyZWRBbmFseXRpY3MgPSBhd2FpdCBnZXRTaGFyZWRBbmFseXRpY3MoKTtcblxuICBpZiAoY29uZmlnICYmIG1heWJlU2hhcmVkQW5hbHl0aWNzKSB7XG4gICAgcmV0dXJuIG5ldyBhbmFseXRpY3MuTXVsdGlBbmFseXRpY3MoW2NvbmZpZywgbWF5YmVTaGFyZWRBbmFseXRpY3NdKTtcbiAgfSBlbHNlIGlmIChjb25maWcpIHtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9IGVsc2UgaWYgKG1heWJlU2hhcmVkQW5hbHl0aWNzKSB7XG4gICAgcmV0dXJuIG1heWJlU2hhcmVkQW5hbHl0aWNzO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MoKTtcbiAgfVxufVxuIl19