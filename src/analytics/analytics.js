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
const crypto_1 = require("crypto");
const debug_1 = __importDefault(require("debug"));
const color_1 = require("../utilities/color");
const config_1 = require("../utilities/config");
const environment_options_1 = require("../utilities/environment-options");
const error_1 = require("../utilities/error");
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
async function setAnalyticsConfig(global, value) {
    var _a;
    var _b;
    const level = global ? 'global' : 'local';
    analyticsDebug('setting %s level analytics to: %s', level, value);
    const workspace = await (0, config_1.getWorkspace)(level);
    if (!workspace) {
        throw new Error(`Could not find ${level} workspace.`);
    }
    const cli = ((_a = (_b = workspace.extensions)['cli']) !== null && _a !== void 0 ? _a : (_b['cli'] = {}));
    if (!workspace || !core_1.json.isJsonObject(cli)) {
        throw new Error(`Invalid config found at ${workspace.filePath}. CLI should be an object.`);
    }
    cli.analytics = value === true ? (0, crypto_1.randomUUID)() : value;
    await workspace.save();
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
    const workspace = await (0, config_1.getWorkspace)(level);
    if (!workspace) {
        throw new Error(`Could not find a ${level} workspace. Are you in a project?`);
    }
    if (force || (0, tty_1.isTTY)()) {
        const { prompt } = await Promise.resolve().then(() => __importStar(require('inquirer')));
        const answers = await prompt([
            {
                type: 'confirm',
                name: 'analytics',
                message: core_1.tags.stripIndents `
          Would you like to share pseudonymous usage data about this project with the Angular Team
          at Google under Google's Privacy Policy at https://policies.google.com/privacy. For more
          details and how to change this setting, see https://angular.io/analytics.

        `,
                default: false,
            },
        ]);
        await setAnalyticsConfig(global, answers.analytics);
        if (answers.analytics) {
            console.log('');
            console.log(core_1.tags.stripIndent `
        Thank you for sharing pseudonymous usage data. Should you change your mind, the following
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
    var _a;
    analyticsDebug('getAnalytics');
    if (environment_options_1.analyticsDisabled) {
        analyticsDebug('NG_CLI_ANALYTICS is false');
        return new core_1.analytics.NoopAnalytics();
    }
    try {
        const workspace = await (0, config_1.getWorkspace)(level);
        const analyticsConfig = (_a = workspace === null || workspace === void 0 ? void 0 : workspace.getCli()) === null || _a === void 0 ? void 0 : _a['analytics'];
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
        (0, error_1.assertIsError)(err);
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
    var _a;
    analyticsDebug('getSharedAnalytics');
    if (environment_options_1.analyticsShareDisabled) {
        analyticsDebug('NG_CLI_ANALYTICS is false');
        return undefined;
    }
    // If anything happens we just keep the NOOP analytics.
    try {
        const globalWorkspace = await (0, config_1.getWorkspace)('global');
        const analyticsConfig = (_a = globalWorkspace === null || globalWorkspace === void 0 ? void 0 : globalWorkspace.getCli()) === null || _a === void 0 ? void 0 : _a['analyticsSharing'];
        if (!analyticsConfig || !analyticsConfig.tracking || !analyticsConfig.uuid) {
            return undefined;
        }
        else {
            analyticsDebug('Analytics sharing info: %j', analyticsConfig);
            return new analytics_collector_1.AnalyticsCollector(analyticsConfig.tracking, analyticsConfig.uuid);
        }
    }
    catch (err) {
        (0, error_1.assertIsError)(err);
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
    // Not disabled globally, check locally or not set globally and command is run outside of workspace example: `ng new`
    if (workspace || globalConfig === undefined) {
        const level = workspace ? 'local' : 'global';
        let localOrGlobalConfig = await getAnalytics(level);
        if (localOrGlobalConfig === undefined) {
            if (!skipPrompt) {
                // config is unset, prompt user.
                // TODO: This should honor the `no-interactive` option.
                // It is currently not an `ng` option but rather only an option for specific commands.
                // The concept of `ng`-wide options are needed to cleanly handle this.
                await promptAnalytics(!workspace /** global */);
                localOrGlobalConfig = await getAnalytics(level);
            }
        }
        if (localOrGlobalConfig instanceof core_1.analytics.NoopAnalytics) {
            return localOrGlobalConfig;
        }
        else if (localOrGlobalConfig) {
            // Favor local settings over global when defined.
            config = localOrGlobalConfig;
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
    var _a, _b;
    const globalWorkspace = await (0, config_1.getWorkspace)('global');
    const localWorkspace = await (0, config_1.getWorkspace)('local');
    const globalSetting = (_a = globalWorkspace === null || globalWorkspace === void 0 ? void 0 : globalWorkspace.getCli()) === null || _a === void 0 ? void 0 : _a['analytics'];
    const localSetting = (_b = localWorkspace === null || localWorkspace === void 0 ? void 0 : localWorkspace.getCli()) === null || _b === void 0 ? void 0 : _b['analytics'];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2FuYWx5dGljcy9hbmFseXRpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBNkQ7QUFDN0QsbUNBQW9DO0FBQ3BDLGtEQUEwQjtBQUMxQiw4Q0FBNEM7QUFDNUMsZ0RBQW1EO0FBQ25ELDBFQUE2RjtBQUM3Riw4Q0FBbUQ7QUFDbkQsMENBQXlDO0FBQ3pDLGtEQUErQztBQUMvQywrREFBMkQ7QUFFM0QsK0JBQStCO0FBQy9CLE1BQU0sY0FBYyxHQUFHLElBQUEsZUFBSyxFQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsb0RBQW9EO0FBRWxHLElBQUksK0JBQXVDLENBQUM7QUFDL0IsUUFBQSxtQkFBbUIsR0FBRztJQUNqQyxjQUFjLEVBQUUsZUFBZTtJQUMvQixpQkFBaUIsRUFBRSxlQUFlO0lBQ2xDLElBQUksaUJBQWlCO1FBQ25CLElBQUksK0JBQStCLEVBQUU7WUFDbkMsT0FBTywrQkFBK0IsQ0FBQztTQUN4QztRQUVELE1BQU0sQ0FBQyxHQUFHLGlCQUFPLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLCtFQUErRTtRQUMvRSwrQkFBK0I7WUFDN0IsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxPQUFPO2dCQUN4QyxDQUFDLENBQUMsMkJBQW1CLENBQUMsY0FBYztnQkFDcEMsQ0FBQyxDQUFDLDJCQUFtQixDQUFDLGlCQUFpQixDQUFDO1FBRTVDLE9BQU8sK0JBQStCLENBQUM7SUFDekMsQ0FBQztDQUNGLENBQUM7QUFFRjs7R0FFRztBQUNVLFFBQUEsd0JBQXdCLEdBQUc7SUFDdEMsYUFBYTtJQUNiLG9CQUFvQjtJQUNwQixhQUFhO0lBQ2IscUJBQXFCO0NBQ3RCLENB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USxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7UUFDdEQsT0FBTyxTQUFTLENBQUM7S0FDbEI7U0FBTTtRQUNMLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0FBQ0gsQ0FBQztBQUVNLEtBQUssVUFBVSxzQkFBc0I7O0lBQzFDLE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBQSxxQkFBWSxFQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JELE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBQSxxQkFBWSxFQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25ELE1BQU0sYUFBYSxHQUFHLE1BQUEsZUFBZSxhQUFmLGVBQWUsdUJBQWYsZUFBZSxDQUFFLE1BQU0sRUFBRSwwQ0FBRyxXQUFXLENBQUMsQ0FBQztJQUMvRCxNQUFNLFlBQVksR0FBRyxNQUFBLGNBQWMsYUFBZCxjQUFjLHVCQUFkLGNBQWMsQ0FBRSxNQUFNLEVBQUUsMENBQUcsV0FBVyxDQUFDLENBQUM7SUFFN0QsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLGVBQWUsQ0FDN0MsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDakMsSUFBSSxDQUFDLGlCQUFpQixDQUN2QixDQUFDO0lBRUYsT0FBTyxDQUNMLFdBQUksQ0FBQyxZQUFZLENBQUE7c0JBQ0MsaUNBQWlDLENBQUMsYUFBYSxDQUFDO3FCQUVoRSxjQUFjO1FBQ1osQ0FBQyxDQUFDLGlDQUFpQyxDQUFDLFlBQVksQ0FBQztRQUNqRCxDQUFDLENBQUMsd0NBQ047d0JBRUUsaUJBQWlCLFlBQVksZ0JBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FDdEU7R0FDRCxHQUFHLElBQUksQ0FDUCxDQUFDO0FBQ0osQ0FBQztBQXhCRCx3REF3QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgYW5hbHl0aWNzLCBqc29uLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgcmFuZG9tVVVJRCB9IGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgYW5hbHl0aWNzRGlzYWJsZWQsIGFuYWx5dGljc1NoYXJlRGlzYWJsZWQgfSBmcm9tICcuLi91dGlsaXRpZXMvZW52aXJvbm1lbnQtb3B0aW9ucyc7XG5pbXBvcnQgeyBhc3NlcnRJc0Vycm9yIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2Vycm9yJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3R0eSc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3ZlcnNpb24nO1xuaW1wb3J0IHsgQW5hbHl0aWNzQ29sbGVjdG9yIH0gZnJvbSAnLi9hbmFseXRpY3MtY29sbGVjdG9yJztcblxuLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuY29uc3QgYW5hbHl0aWNzRGVidWcgPSBkZWJ1Zygnbmc6YW5hbHl0aWNzJyk7IC8vIEdlbmVyYXRlIGFuYWx5dGljcywgaW5jbHVkaW5nIHNldHRpbmdzIGFuZCB1c2Vycy5cblxubGV0IF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGU6IHN0cmluZztcbmV4cG9ydCBjb25zdCBBbmFseXRpY3NQcm9wZXJ0aWVzID0ge1xuICBBbmd1bGFyQ2xpUHJvZDogJ1VBLTg1OTQzNDYtMjknLFxuICBBbmd1bGFyQ2xpU3RhZ2luZzogJ1VBLTg1OTQzNDYtMzInLFxuICBnZXQgQW5ndWxhckNsaURlZmF1bHQoKTogc3RyaW5nIHtcbiAgICBpZiAoX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZSkge1xuICAgICAgcmV0dXJuIF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGU7XG4gICAgfVxuXG4gICAgY29uc3QgdiA9IFZFUlNJT04uZnVsbDtcbiAgICAvLyBUaGUgbG9naWMgaXMgaWYgaXQncyBhIGZ1bGwgdmVyc2lvbiB0aGVuIHdlIHNob3VsZCB1c2UgdGhlIHByb2QgR0EgcHJvcGVydHkuXG4gICAgX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZSA9XG4gICAgICAvXlxcZCtcXC5cXGQrXFwuXFxkKyQvLnRlc3QodikgJiYgdiAhPT0gJzAuMC4wJ1xuICAgICAgICA/IEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaVByb2RcbiAgICAgICAgOiBBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlTdGFnaW5nO1xuXG4gICAgcmV0dXJuIF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGU7XG4gIH0sXG59O1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIHVsdGltYXRlIHNhZmVsaXN0IGZvciBjaGVja2luZyBpZiBhIHBhY2thZ2UgbmFtZSBpcyBzYWZlIHRvIHJlcG9ydCB0byBhbmFseXRpY3MuXG4gKi9cbmV4cG9ydCBjb25zdCBhbmFseXRpY3NQYWNrYWdlU2FmZWxpc3QgPSBbXG4gIC9eQGFuZ3VsYXJcXC8vLFxuICAvXkBhbmd1bGFyLWRldmtpdFxcLy8sXG4gIC9eQG5ndG9vbHNcXC8vLFxuICAnQHNjaGVtYXRpY3MvYW5ndWxhcicsXG5dO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBhbmFseXRpY3NQYWNrYWdlU2FmZWxpc3Quc29tZSgocGF0dGVybikgPT4ge1xuICAgIGlmICh0eXBlb2YgcGF0dGVybiA9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIHBhdHRlcm4gPT09IG5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBwYXR0ZXJuLnRlc3QobmFtZSk7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBTZXQgYW5hbHl0aWNzIHNldHRpbmdzLiBUaGlzIGRvZXMgbm90IHdvcmsgaWYgdGhlIHVzZXIgaXMgbm90IGluc2lkZSBhIHByb2plY3QuXG4gKiBAcGFyYW0gZ2xvYmFsIFdoaWNoIGNvbmZpZyB0byB1c2UuIFwiZ2xvYmFsXCIgZm9yIHVzZXItbGV2ZWwsIGFuZCBcImxvY2FsXCIgZm9yIHByb2plY3QtbGV2ZWwuXG4gKiBAcGFyYW0gdmFsdWUgRWl0aGVyIGEgdXNlciBJRCwgdHJ1ZSB0byBnZW5lcmF0ZSBhIG5ldyBVc2VyIElELCBvciBmYWxzZSB0byBkaXNhYmxlIGFuYWx5dGljcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldEFuYWx5dGljc0NvbmZpZyhnbG9iYWw6IGJvb2xlYW4sIHZhbHVlOiBzdHJpbmcgfCBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGxldmVsID0gZ2xvYmFsID8gJ2dsb2JhbCcgOiAnbG9jYWwnO1xuICBhbmFseXRpY3NEZWJ1Zygnc2V0dGluZyAlcyBsZXZlbCBhbmFseXRpY3MgdG86ICVzJywgbGV2ZWwsIHZhbHVlKTtcbiAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGxldmVsKTtcbiAgaWYgKCF3b3Jrc3BhY2UpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kICR7bGV2ZWx9IHdvcmtzcGFjZS5gKTtcbiAgfVxuXG4gIGNvbnN0IGNsaSA9ICh3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snY2xpJ10gPz89IHt9KTtcbiAgaWYgKCF3b3Jrc3BhY2UgfHwgIWpzb24uaXNKc29uT2JqZWN0KGNsaSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlnIGZvdW5kIGF0ICR7d29ya3NwYWNlLmZpbGVQYXRofS4gQ0xJIHNob3VsZCBiZSBhbiBvYmplY3QuYCk7XG4gIH1cblxuICBjbGkuYW5hbHl0aWNzID0gdmFsdWUgPT09IHRydWUgPyByYW5kb21VVUlEKCkgOiB2YWx1ZTtcbiAgYXdhaXQgd29ya3NwYWNlLnNhdmUoKTtcbiAgYW5hbHl0aWNzRGVidWcoJ2RvbmUnKTtcbn1cblxuLyoqXG4gKiBQcm9tcHQgdGhlIHVzZXIgZm9yIHVzYWdlIGdhdGhlcmluZyBwZXJtaXNzaW9uLlxuICogQHBhcmFtIGZvcmNlIFdoZXRoZXIgdG8gYXNrIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBvciBub3QgdGhlIHVzZXIgaXMgdXNpbmcgYW4gaW50ZXJhY3RpdmUgc2hlbGwuXG4gKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIHdhcyBzaG93biBhIHByb21wdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByb21wdEFuYWx5dGljcyhnbG9iYWw6IGJvb2xlYW4sIGZvcmNlID0gZmFsc2UpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ3Byb21wdGluZyB1c2VyJyk7XG4gIGNvbnN0IGxldmVsID0gZ2xvYmFsID8gJ2dsb2JhbCcgOiAnbG9jYWwnO1xuICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UobGV2ZWwpO1xuICBpZiAoIXdvcmtzcGFjZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgYSAke2xldmVsfSB3b3Jrc3BhY2UuIEFyZSB5b3UgaW4gYSBwcm9qZWN0P2ApO1xuICB9XG5cbiAgaWYgKGZvcmNlIHx8IGlzVFRZKCkpIHtcbiAgICBjb25zdCB7IHByb21wdCB9ID0gYXdhaXQgaW1wb3J0KCdpbnF1aXJlcicpO1xuICAgIGNvbnN0IGFuc3dlcnMgPSBhd2FpdCBwcm9tcHQ8eyBhbmFseXRpY3M6IGJvb2xlYW4gfT4oW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnY29uZmlybScsXG4gICAgICAgIG5hbWU6ICdhbmFseXRpY3MnLFxuICAgICAgICBtZXNzYWdlOiB0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBXb3VsZCB5b3UgbGlrZSB0byBzaGFyZSBwc2V1ZG9ueW1vdXMgdXNhZ2UgZGF0YSBhYm91dCB0aGlzIHByb2plY3Qgd2l0aCB0aGUgQW5ndWxhciBUZWFtXG4gICAgICAgICAgYXQgR29vZ2xlIHVuZGVyIEdvb2dsZSdzIFByaXZhY3kgUG9saWN5IGF0IGh0dHBzOi8vcG9saWNpZXMuZ29vZ2xlLmNvbS9wcml2YWN5LiBGb3IgbW9yZVxuICAgICAgICAgIGRldGFpbHMgYW5kIGhvdyB0byBjaGFuZ2UgdGhpcyBzZXR0aW5nLCBzZWUgaHR0cHM6Ly9hbmd1bGFyLmlvL2FuYWx5dGljcy5cblxuICAgICAgICBgLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0sXG4gICAgXSk7XG5cbiAgICBhd2FpdCBzZXRBbmFseXRpY3NDb25maWcoZ2xvYmFsLCBhbnN3ZXJzLmFuYWx5dGljcyk7XG5cbiAgICBpZiAoYW5zd2Vycy5hbmFseXRpY3MpIHtcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICB0YWdzLnN0cmlwSW5kZW50YFxuICAgICAgICBUaGFuayB5b3UgZm9yIHNoYXJpbmcgcHNldWRvbnltb3VzIHVzYWdlIGRhdGEuIFNob3VsZCB5b3UgY2hhbmdlIHlvdXIgbWluZCwgdGhlIGZvbGxvd2luZ1xuICAgICAgICBjb21tYW5kIHdpbGwgZGlzYWJsZSB0aGlzIGZlYXR1cmUgZW50aXJlbHk6XG5cbiAgICAgICAgICAgICR7Y29sb3JzLnllbGxvdyhgbmcgYW5hbHl0aWNzIGRpc2FibGUke2dsb2JhbCA/ICcgLS1nbG9iYWwnIDogJyd9YCl9XG4gICAgICBgLFxuICAgICAgKTtcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcblxuICAgICAgLy8gU2VuZCBiYWNrIGEgcGluZyB3aXRoIHRoZSB1c2VyIGBvcHRpbmAuXG4gICAgICBjb25zdCB1YSA9IG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpRGVmYXVsdCwgJ29wdGluJyk7XG4gICAgICB1YS5wYWdldmlldygnL3RlbGVtZXRyeS9wcm9qZWN0L29wdGluJyk7XG4gICAgICBhd2FpdCB1YS5mbHVzaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTZW5kIGJhY2sgYSBwaW5nIHdpdGggdGhlIHVzZXIgYG9wdG91dGAuIFRoaXMgaXMgdGhlIG9ubHkgdGhpbmcgd2Ugc2VuZC5cbiAgICAgIGNvbnN0IHVhID0gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlEZWZhdWx0LCAnb3B0b3V0Jyk7XG4gICAgICB1YS5wYWdldmlldygnL3RlbGVtZXRyeS9wcm9qZWN0L29wdG91dCcpO1xuICAgICAgYXdhaXQgdWEuZmx1c2goKTtcbiAgICB9XG5cbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShhd2FpdCBnZXRBbmFseXRpY3NJbmZvU3RyaW5nKCkpO1xuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogR2V0IHRoZSBhbmFseXRpY3Mgb2JqZWN0IGZvciB0aGUgdXNlci5cbiAqXG4gKiBAcmV0dXJuc1xuICogLSBgQW5hbHl0aWNzQ29sbGVjdG9yYCB3aGVuIGVuYWJsZWQuXG4gKiAtIGBhbmFseXRpY3MuTm9vcEFuYWx5dGljc2Agd2hlbiBkaXNhYmxlZC5cbiAqIC0gYHVuZGVmaW5lZGAgd2hlbiBub3QgY29uZmlndXJlZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFuYWx5dGljcyhcbiAgbGV2ZWw6ICdsb2NhbCcgfCAnZ2xvYmFsJyxcbik6IFByb21pc2U8QW5hbHl0aWNzQ29sbGVjdG9yIHwgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MgfCB1bmRlZmluZWQ+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ2dldEFuYWx5dGljcycpO1xuXG4gIGlmIChhbmFseXRpY3NEaXNhYmxlZCkge1xuICAgIGFuYWx5dGljc0RlYnVnKCdOR19DTElfQU5BTFlUSUNTIGlzIGZhbHNlJyk7XG5cbiAgICByZXR1cm4gbmV3IGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzKCk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZShsZXZlbCk7XG4gICAgY29uc3QgYW5hbHl0aWNzQ29uZmlnOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsIHwgeyB1aWQ/OiBzdHJpbmcgfSA9XG4gICAgICB3b3Jrc3BhY2U/LmdldENsaSgpPy5bJ2FuYWx5dGljcyddO1xuICAgIGFuYWx5dGljc0RlYnVnKCdXb3Jrc3BhY2UgQW5hbHl0aWNzIGNvbmZpZyBmb3VuZDogJWonLCBhbmFseXRpY3NDb25maWcpO1xuXG4gICAgaWYgKGFuYWx5dGljc0NvbmZpZyA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBuZXcgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MoKTtcbiAgICB9IGVsc2UgaWYgKGFuYWx5dGljc0NvbmZpZyA9PT0gdW5kZWZpbmVkIHx8IGFuYWx5dGljc0NvbmZpZyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHVpZDogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgICBpZiAodHlwZW9mIGFuYWx5dGljc0NvbmZpZyA9PSAnc3RyaW5nJykge1xuICAgICAgICB1aWQgPSBhbmFseXRpY3NDb25maWc7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhbmFseXRpY3NDb25maWcgPT0gJ29iamVjdCcgJiYgdHlwZW9mIGFuYWx5dGljc0NvbmZpZ1sndWlkJ10gPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdWlkID0gYW5hbHl0aWNzQ29uZmlnWyd1aWQnXTtcbiAgICAgIH1cblxuICAgICAgYW5hbHl0aWNzRGVidWcoJ2NsaWVudCBpZDogJWonLCB1aWQpO1xuICAgICAgaWYgKHVpZCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpRGVmYXVsdCwgdWlkKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGFzc2VydElzRXJyb3IoZXJyKTtcbiAgICBhbmFseXRpY3NEZWJ1ZygnRXJyb3IgaGFwcGVuZWQgZHVyaW5nIHJlYWRpbmcgb2YgYW5hbHl0aWNzIGNvbmZpZzogJXMnLCBlcnIubWVzc2FnZSk7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSB1c2FnZSBhbmFseXRpY3Mgc2hhcmluZyBzZXR0aW5nLCB3aGljaCBpcyBlaXRoZXIgYSBwcm9wZXJ0eSBzdHJpbmcgKEdBLVhYWFhYWFgtWFgpLFxuICogb3IgdW5kZWZpbmVkIGlmIG5vIHNoYXJpbmcuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRTaGFyZWRBbmFseXRpY3MoKTogUHJvbWlzZTxBbmFseXRpY3NDb2xsZWN0b3IgfCB1bmRlZmluZWQ+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ2dldFNoYXJlZEFuYWx5dGljcycpO1xuXG4gIGlmIChhbmFseXRpY3NTaGFyZURpc2FibGVkKSB7XG4gICAgYW5hbHl0aWNzRGVidWcoJ05HX0NMSV9BTkFMWVRJQ1MgaXMgZmFsc2UnKTtcblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBJZiBhbnl0aGluZyBoYXBwZW5zIHdlIGp1c3Qga2VlcCB0aGUgTk9PUCBhbmFseXRpY3MuXG4gIHRyeSB7XG4gICAgY29uc3QgZ2xvYmFsV29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcbiAgICBjb25zdCBhbmFseXRpY3NDb25maWcgPSBnbG9iYWxXb3Jrc3BhY2U/LmdldENsaSgpPy5bJ2FuYWx5dGljc1NoYXJpbmcnXTtcblxuICAgIGlmICghYW5hbHl0aWNzQ29uZmlnIHx8ICFhbmFseXRpY3NDb25maWcudHJhY2tpbmcgfHwgIWFuYWx5dGljc0NvbmZpZy51dWlkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnQW5hbHl0aWNzIHNoYXJpbmcgaW5mbzogJWonLCBhbmFseXRpY3NDb25maWcpO1xuXG4gICAgICByZXR1cm4gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihhbmFseXRpY3NDb25maWcudHJhY2tpbmcsIGFuYWx5dGljc0NvbmZpZy51dWlkKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGFzc2VydElzRXJyb3IoZXJyKTtcbiAgICBhbmFseXRpY3NEZWJ1ZygnRXJyb3IgaGFwcGVuZWQgZHVyaW5nIHJlYWRpbmcgb2YgYW5hbHl0aWNzIHNoYXJpbmcgY29uZmlnOiAlcycsIGVyci5tZXNzYWdlKTtcblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUFuYWx5dGljcyhcbiAgd29ya3NwYWNlOiBib29sZWFuLFxuICBza2lwUHJvbXB0ID0gZmFsc2UsXG4pOiBQcm9taXNlPGFuYWx5dGljcy5BbmFseXRpY3M+IHtcbiAgLy8gR2xvYmFsIGNvbmZpZyB0YWtlcyBwcmVjZWRlbmNlIG92ZXIgbG9jYWwgY29uZmlnIG9ubHkgZm9yIHRoZSBkaXNhYmxlZCBjaGVjay5cbiAgLy8gSUU6XG4gIC8vIGdsb2JhbDogZGlzYWJsZWQgJiBsb2NhbDogZW5hYmxlZCA9IGRpc2FibGVkXG4gIC8vIGdsb2JhbDogaWQ6IDEyMyAmIGxvY2FsOiBpZDogNDU2ID0gNDU2XG5cbiAgLy8gY2hlY2sgZ2xvYmFsXG4gIGNvbnN0IGdsb2JhbENvbmZpZyA9IGF3YWl0IGdldEFuYWx5dGljcygnZ2xvYmFsJyk7XG4gIGlmIChnbG9iYWxDb25maWcgaW5zdGFuY2VvZiBhbmFseXRpY3MuTm9vcEFuYWx5dGljcykge1xuICAgIHJldHVybiBnbG9iYWxDb25maWc7XG4gIH1cblxuICBsZXQgY29uZmlnID0gZ2xvYmFsQ29uZmlnO1xuICAvLyBOb3QgZGlzYWJsZWQgZ2xvYmFsbHksIGNoZWNrIGxvY2FsbHkgb3Igbm90IHNldCBnbG9iYWxseSBhbmQgY29tbWFuZCBpcyBydW4gb3V0c2lkZSBvZiB3b3Jrc3BhY2UgZXhhbXBsZTogYG5nIG5ld2BcbiAgaWYgKHdvcmtzcGFjZSB8fCBnbG9iYWxDb25maWcgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGxldmVsID0gd29ya3NwYWNlID8gJ2xvY2FsJyA6ICdnbG9iYWwnO1xuICAgIGxldCBsb2NhbE9yR2xvYmFsQ29uZmlnID0gYXdhaXQgZ2V0QW5hbHl0aWNzKGxldmVsKTtcbiAgICBpZiAobG9jYWxPckdsb2JhbENvbmZpZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoIXNraXBQcm9tcHQpIHtcbiAgICAgICAgLy8gY29uZmlnIGlzIHVuc2V0LCBwcm9tcHQgdXNlci5cbiAgICAgICAgLy8gVE9ETzogVGhpcyBzaG91bGQgaG9ub3IgdGhlIGBuby1pbnRlcmFjdGl2ZWAgb3B0aW9uLlxuICAgICAgICAvLyBJdCBpcyBjdXJyZW50bHkgbm90IGFuIGBuZ2Agb3B0aW9uIGJ1dCByYXRoZXIgb25seSBhbiBvcHRpb24gZm9yIHNwZWNpZmljIGNvbW1hbmRzLlxuICAgICAgICAvLyBUaGUgY29uY2VwdCBvZiBgbmdgLXdpZGUgb3B0aW9ucyBhcmUgbmVlZGVkIHRvIGNsZWFubHkgaGFuZGxlIHRoaXMuXG4gICAgICAgIGF3YWl0IHByb21wdEFuYWx5dGljcyghd29ya3NwYWNlIC8qKiBnbG9iYWwgKi8pO1xuICAgICAgICBsb2NhbE9yR2xvYmFsQ29uZmlnID0gYXdhaXQgZ2V0QW5hbHl0aWNzKGxldmVsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobG9jYWxPckdsb2JhbENvbmZpZyBpbnN0YW5jZW9mIGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzKSB7XG4gICAgICByZXR1cm4gbG9jYWxPckdsb2JhbENvbmZpZztcbiAgICB9IGVsc2UgaWYgKGxvY2FsT3JHbG9iYWxDb25maWcpIHtcbiAgICAgIC8vIEZhdm9yIGxvY2FsIHNldHRpbmdzIG92ZXIgZ2xvYmFsIHdoZW4gZGVmaW5lZC5cbiAgICAgIGNvbmZpZyA9IGxvY2FsT3JHbG9iYWxDb25maWc7XG4gICAgfVxuICB9XG5cbiAgLy8gR2V0IHNoYXJlZCBhbmFseXRpY3NcbiAgLy8gVE9ETzogZXZhbHV0ZSBpZiB0aGlzIHNob3VsZCBiZSBjb21wbGV0bHkgcmVtb3ZlZC5cbiAgY29uc3QgbWF5YmVTaGFyZWRBbmFseXRpY3MgPSBhd2FpdCBnZXRTaGFyZWRBbmFseXRpY3MoKTtcbiAgaWYgKGNvbmZpZyAmJiBtYXliZVNoYXJlZEFuYWx5dGljcykge1xuICAgIHJldHVybiBuZXcgYW5hbHl0aWNzLk11bHRpQW5hbHl0aWNzKFtjb25maWcsIG1heWJlU2hhcmVkQW5hbHl0aWNzXSk7XG4gIH1cblxuICByZXR1cm4gY29uZmlnID8/IG1heWJlU2hhcmVkQW5hbHl0aWNzID8/IG5ldyBhbmFseXRpY3MuTm9vcEFuYWx5dGljcygpO1xufVxuXG5mdW5jdGlvbiBhbmFseXRpY3NDb25maWdWYWx1ZVRvSHVtYW5Gb3JtYXQodmFsdWU6IHVua25vd24pOiAnZW5hYmxlZCcgfCAnZGlzYWJsZWQnIHwgJ25vdCBzZXQnIHtcbiAgaWYgKHZhbHVlID09PSBmYWxzZSkge1xuICAgIHJldHVybiAnZGlzYWJsZWQnO1xuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHwgdmFsdWUgPT09IHRydWUpIHtcbiAgICByZXR1cm4gJ2VuYWJsZWQnO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnbm90IHNldCc7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFuYWx5dGljc0luZm9TdHJpbmcoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZ2xvYmFsV29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcbiAgY29uc3QgbG9jYWxXb3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG4gIGNvbnN0IGdsb2JhbFNldHRpbmcgPSBnbG9iYWxXb3Jrc3BhY2U/LmdldENsaSgpPy5bJ2FuYWx5dGljcyddO1xuICBjb25zdCBsb2NhbFNldHRpbmcgPSBsb2NhbFdvcmtzcGFjZT8uZ2V0Q2xpKCk/LlsnYW5hbHl0aWNzJ107XG5cbiAgY29uc3QgYW5hbHl0aWNzSW5zdGFuY2UgPSBhd2FpdCBjcmVhdGVBbmFseXRpY3MoXG4gICAgISFsb2NhbFdvcmtzcGFjZSAvKiogd29ya3NwYWNlICovLFxuICAgIHRydWUgLyoqIHNraXBQcm9tcHQgKi8sXG4gICk7XG5cbiAgcmV0dXJuIChcbiAgICB0YWdzLnN0cmlwSW5kZW50c2BcbiAgICBHbG9iYWwgc2V0dGluZzogJHthbmFseXRpY3NDb25maWdWYWx1ZVRvSHVtYW5Gb3JtYXQoZ2xvYmFsU2V0dGluZyl9XG4gICAgTG9jYWwgc2V0dGluZzogJHtcbiAgICAgIGxvY2FsV29ya3NwYWNlXG4gICAgICAgID8gYW5hbHl0aWNzQ29uZmlnVmFsdWVUb0h1bWFuRm9ybWF0KGxvY2FsU2V0dGluZylcbiAgICAgICAgOiAnTm8gbG9jYWwgd29ya3NwYWNlIGNvbmZpZ3VyYXRpb24gZmlsZS4nXG4gICAgfVxuICAgIEVmZmVjdGl2ZSBzdGF0dXM6ICR7XG4gICAgICBhbmFseXRpY3NJbnN0YW5jZSBpbnN0YW5jZW9mIGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzID8gJ2Rpc2FibGVkJyA6ICdlbmFibGVkJ1xuICAgIH1cbiAgYCArICdcXG4nXG4gICk7XG59XG4iXX0=