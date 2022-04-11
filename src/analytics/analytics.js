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
    cli.analytics = value === true ? (0, uuid_1.v4)() : value;
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
          Would you like to share anonymous usage data about this project with the Angular Team at
          Google under Google’s Privacy Policy at https://policies.google.com/privacy. For more
          details and how to change this setting, see https://angular.io/analytics.

        `,
                default: false,
            },
        ]);
        await setAnalyticsConfig(global, answers.analytics);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2FuYWx5dGljcy9hbmFseXRpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBNkQ7QUFDN0Qsa0RBQTBCO0FBQzFCLCtCQUFvQztBQUNwQyw4Q0FBNEM7QUFDNUMsZ0RBQXFFO0FBQ3JFLDBFQUE2RjtBQUM3RiwwQ0FBeUM7QUFDekMsa0RBQStDO0FBQy9DLCtEQUEyRDtBQUUzRCwrQkFBK0I7QUFDL0IsTUFBTSxjQUFjLEdBQUcsSUFBQSxlQUFLLEVBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxvREFBb0Q7QUFFbEcsSUFBSSwrQkFBdUMsQ0FBQztBQUMvQixRQUFBLG1CQUFtQixHQUFHO0lBQ2pDLGNBQWMsRUFBRSxlQUFlO0lBQy9CLGlCQUFpQixFQUFFLGVBQWU7SUFDbEMsSUFBSSxpQkFBaUI7UUFDbkIsSUFBSSwrQkFBK0IsRUFBRTtZQUNuQyxPQUFPLCtCQUErQixDQUFDO1NBQ3hDO1FBRUQsTUFBTSxDQUFDLEdBQUcsaUJBQU8sQ0FBQyxJQUFJLENBQUM7UUFDdkIsK0VBQStFO1FBQy9FLCtCQUErQjtZQUM3QixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLE9BQU87Z0JBQ3hDLENBQUMsQ0FBQywyQkFBbUIsQ0FBQyxjQUFjO2dCQUNwQyxDQUFDLENBQUMsMkJBQW1CLENBQUMsaUJBQWlCLENBQUM7UUFFNUMsT0FBTywrQkFBK0IsQ0FBQztJQUN6QyxDQUFDO0NBQ0YsQ0FBQztBQUVGOztHQUVHO0FBQ1UsUUFBQSx3QkFBd0IsR0FBRztJQUN0QyxhQUFhO0lBQ2Isb0JBQW9CO0lBQ3BCLGFBQWE7SUFDYixxQkFBcUI7Q0FDdEIsQ0FBQztBQUVGLFNBQWdC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SCxDQUFDO0FBRU0sS0FBSyxVQUFVLHNCQUFzQjs7SUFDMUMsTUFBTSxlQUFlLEdBQUcsTUFBTSxJQUFBLHFCQUFZLEVBQUMsUUFBUSxDQUFDLENBQUM7SUFDckQsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFBLHFCQUFZLEVBQUMsT0FBTyxDQUFDLENBQUM7SUFDbkQsTUFBTSxhQUFhLEdBQUcsTUFBQSxlQUFlLGFBQWYsZUFBZSx1QkFBZixlQUFlLENBQUUsTUFBTSxFQUFFLDBDQUFHLFdBQVcsQ0FBQyxDQUFDO0lBQy9ELE1BQU0sWUFBWSxHQUFHLE1BQUEsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLE1BQU0sRUFBRSwwQ0FBRyxXQUFXLENBQUMsQ0FBQztJQUU3RCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sZUFBZSxDQUM3QyxDQUFDLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUNqQyxJQUFJLENBQUMsaUJBQWlCLENBQ3ZCLENBQUM7SUFFRixPQUFPLENBQ0wsV0FBSSxDQUFDLFlBQVksQ0FBQTtzQkFDQyxpQ0FBaUMsQ0FBQyxhQUFhLENBQUM7cUJBRWhFLGNBQWM7UUFDWixDQUFDLENBQUMsaUNBQWlDLENBQUMsWUFBWSxDQUFDO1FBQ2pELENBQUMsQ0FBQyx3Q0FDTjt3QkFFRSxpQkFBaUIsWUFBWSxnQkFBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUN0RTtHQUNELEdBQUcsSUFBSSxDQUNQLENBQUM7QUFDSixDQUFDO0FBeEJELHdEQXdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBhbmFseXRpY3MsIGpzb24sIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnO1xuaW1wb3J0IHsgdjQgYXMgdXVpZFY0IH0gZnJvbSAndXVpZCc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSwgZ2V0V29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBhbmFseXRpY3NEaXNhYmxlZCwgYW5hbHl0aWNzU2hhcmVEaXNhYmxlZCB9IGZyb20gJy4uL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3R0eSc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3ZlcnNpb24nO1xuaW1wb3J0IHsgQW5hbHl0aWNzQ29sbGVjdG9yIH0gZnJvbSAnLi9hbmFseXRpY3MtY29sbGVjdG9yJztcblxuLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuY29uc3QgYW5hbHl0aWNzRGVidWcgPSBkZWJ1Zygnbmc6YW5hbHl0aWNzJyk7IC8vIEdlbmVyYXRlIGFuYWx5dGljcywgaW5jbHVkaW5nIHNldHRpbmdzIGFuZCB1c2Vycy5cblxubGV0IF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGU6IHN0cmluZztcbmV4cG9ydCBjb25zdCBBbmFseXRpY3NQcm9wZXJ0aWVzID0ge1xuICBBbmd1bGFyQ2xpUHJvZDogJ1VBLTg1OTQzNDYtMjknLFxuICBBbmd1bGFyQ2xpU3RhZ2luZzogJ1VBLTg1OTQzNDYtMzInLFxuICBnZXQgQW5ndWxhckNsaURlZmF1bHQoKTogc3RyaW5nIHtcbiAgICBpZiAoX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZSkge1xuICAgICAgcmV0dXJuIF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGU7XG4gICAgfVxuXG4gICAgY29uc3QgdiA9IFZFUlNJT04uZnVsbDtcbiAgICAvLyBUaGUgbG9naWMgaXMgaWYgaXQncyBhIGZ1bGwgdmVyc2lvbiB0aGVuIHdlIHNob3VsZCB1c2UgdGhlIHByb2QgR0EgcHJvcGVydHkuXG4gICAgX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZSA9XG4gICAgICAvXlxcZCtcXC5cXGQrXFwuXFxkKyQvLnRlc3QodikgJiYgdiAhPT0gJzAuMC4wJ1xuICAgICAgICA/IEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaVByb2RcbiAgICAgICAgOiBBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlTdGFnaW5nO1xuXG4gICAgcmV0dXJuIF9kZWZhdWx0QW5ndWxhckNsaVByb3BlcnR5Q2FjaGU7XG4gIH0sXG59O1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIHVsdGltYXRlIHNhZmVsaXN0IGZvciBjaGVja2luZyBpZiBhIHBhY2thZ2UgbmFtZSBpcyBzYWZlIHRvIHJlcG9ydCB0byBhbmFseXRpY3MuXG4gKi9cbmV4cG9ydCBjb25zdCBhbmFseXRpY3NQYWNrYWdlU2FmZWxpc3QgPSBbXG4gIC9eQGFuZ3VsYXJcXC8vLFxuICAvXkBhbmd1bGFyLWRldmtpdFxcLy8sXG4gIC9eQG5ndG9vbHNcXC8vLFxuICAnQHNjaGVtYXRpY3MvYW5ndWxhcicsXG5dO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBhbmFseXRpY3NQYWNrYWdlU2FmZWxpc3Quc29tZSgocGF0dGVybikgPT4ge1xuICAgIGlmICh0eXBlb2YgcGF0dGVybiA9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIHBhdHRlcm4gPT09IG5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBwYXR0ZXJuLnRlc3QobmFtZSk7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBTZXQgYW5hbHl0aWNzIHNldHRpbmdzLiBUaGlzIGRvZXMgbm90IHdvcmsgaWYgdGhlIHVzZXIgaXMgbm90IGluc2lkZSBhIHByb2plY3QuXG4gKiBAcGFyYW0gZ2xvYmFsIFdoaWNoIGNvbmZpZyB0byB1c2UuIFwiZ2xvYmFsXCIgZm9yIHVzZXItbGV2ZWwsIGFuZCBcImxvY2FsXCIgZm9yIHByb2plY3QtbGV2ZWwuXG4gKiBAcGFyYW0gdmFsdWUgRWl0aGVyIGEgdXNlciBJRCwgdHJ1ZSB0byBnZW5lcmF0ZSBhIG5ldyBVc2VyIElELCBvciBmYWxzZSB0byBkaXNhYmxlIGFuYWx5dGljcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldEFuYWx5dGljc0NvbmZpZyhnbG9iYWw6IGJvb2xlYW4sIHZhbHVlOiBzdHJpbmcgfCBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGxldmVsID0gZ2xvYmFsID8gJ2dsb2JhbCcgOiAnbG9jYWwnO1xuICBhbmFseXRpY3NEZWJ1Zygnc2V0dGluZyAlcyBsZXZlbCBhbmFseXRpY3MgdG86ICVzJywgbGV2ZWwsIHZhbHVlKTtcbiAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGxldmVsKTtcbiAgaWYgKCF3b3Jrc3BhY2UpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kICR7bGV2ZWx9IHdvcmtzcGFjZS5gKTtcbiAgfVxuXG4gIGNvbnN0IGNsaSA9ICh3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snY2xpJ10gPz89IHt9KTtcbiAgaWYgKCF3b3Jrc3BhY2UgfHwgIWpzb24uaXNKc29uT2JqZWN0KGNsaSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlnIGZvdW5kIGF0ICR7d29ya3NwYWNlLmZpbGVQYXRofS4gQ0xJIHNob3VsZCBiZSBhbiBvYmplY3QuYCk7XG4gIH1cblxuICBjbGkuYW5hbHl0aWNzID0gdmFsdWUgPT09IHRydWUgPyB1dWlkVjQoKSA6IHZhbHVlO1xuICBhd2FpdCB3b3Jrc3BhY2Uuc2F2ZSgpO1xuICBhbmFseXRpY3NEZWJ1ZygnZG9uZScpO1xufVxuXG4vKipcbiAqIFByb21wdCB0aGUgdXNlciBmb3IgdXNhZ2UgZ2F0aGVyaW5nIHBlcm1pc3Npb24uXG4gKiBAcGFyYW0gZm9yY2UgV2hldGhlciB0byBhc2sgcmVnYXJkbGVzcyBvZiB3aGV0aGVyIG9yIG5vdCB0aGUgdXNlciBpcyB1c2luZyBhbiBpbnRlcmFjdGl2ZSBzaGVsbC5cbiAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIHVzZXIgd2FzIHNob3duIGEgcHJvbXB0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJvbXB0QW5hbHl0aWNzKGdsb2JhbDogYm9vbGVhbiwgZm9yY2UgPSBmYWxzZSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBhbmFseXRpY3NEZWJ1ZygncHJvbXB0aW5nIHVzZXInKTtcbiAgY29uc3QgbGV2ZWwgPSBnbG9iYWwgPyAnZ2xvYmFsJyA6ICdsb2NhbCc7XG4gIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZShsZXZlbCk7XG4gIGlmICghd29ya3NwYWNlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBhICR7bGV2ZWx9IHdvcmtzcGFjZS4gQXJlIHlvdSBpbiBhIHByb2plY3Q/YCk7XG4gIH1cblxuICBpZiAoZm9yY2UgfHwgaXNUVFkoKSkge1xuICAgIGNvbnN0IHsgcHJvbXB0IH0gPSBhd2FpdCBpbXBvcnQoJ2lucXVpcmVyJyk7XG4gICAgY29uc3QgYW5zd2VycyA9IGF3YWl0IHByb21wdDx7IGFuYWx5dGljczogYm9vbGVhbiB9PihbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjb25maXJtJyxcbiAgICAgICAgbmFtZTogJ2FuYWx5dGljcycsXG4gICAgICAgIG1lc3NhZ2U6IHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICAgIFdvdWxkIHlvdSBsaWtlIHRvIHNoYXJlIGFub255bW91cyB1c2FnZSBkYXRhIGFib3V0IHRoaXMgcHJvamVjdCB3aXRoIHRoZSBBbmd1bGFyIFRlYW0gYXRcbiAgICAgICAgICBHb29nbGUgdW5kZXIgR29vZ2xl4oCZcyBQcml2YWN5IFBvbGljeSBhdCBodHRwczovL3BvbGljaWVzLmdvb2dsZS5jb20vcHJpdmFjeS4gRm9yIG1vcmVcbiAgICAgICAgICBkZXRhaWxzIGFuZCBob3cgdG8gY2hhbmdlIHRoaXMgc2V0dGluZywgc2VlIGh0dHBzOi8vYW5ndWxhci5pby9hbmFseXRpY3MuXG5cbiAgICAgICAgYCxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9LFxuICAgIF0pO1xuXG4gICAgYXdhaXQgc2V0QW5hbHl0aWNzQ29uZmlnKGdsb2JhbCwgYW5zd2Vycy5hbmFseXRpY3MpO1xuXG4gICAgaWYgKGFuc3dlcnMuYW5hbHl0aWNzKSB7XG4gICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgdGFncy5zdHJpcEluZGVudGBcbiAgICAgICAgVGhhbmsgeW91IGZvciBzaGFyaW5nIGFub255bW91cyB1c2FnZSBkYXRhLiBTaG91bGQgeW91IGNoYW5nZSB5b3VyIG1pbmQsIHRoZSBmb2xsb3dpbmdcbiAgICAgICAgY29tbWFuZCB3aWxsIGRpc2FibGUgdGhpcyBmZWF0dXJlIGVudGlyZWx5OlxuXG4gICAgICAgICAgICAke2NvbG9ycy55ZWxsb3coYG5nIGFuYWx5dGljcyBkaXNhYmxlJHtnbG9iYWwgPyAnIC0tZ2xvYmFsJyA6ICcnfWApfVxuICAgICAgYCxcbiAgICAgICk7XG4gICAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICAgIC8vIFNlbmQgYmFjayBhIHBpbmcgd2l0aCB0aGUgdXNlciBgb3B0aW5gLlxuICAgICAgY29uc3QgdWEgPSBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaURlZmF1bHQsICdvcHRpbicpO1xuICAgICAgdWEucGFnZXZpZXcoJy90ZWxlbWV0cnkvcHJvamVjdC9vcHRpbicpO1xuICAgICAgYXdhaXQgdWEuZmx1c2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU2VuZCBiYWNrIGEgcGluZyB3aXRoIHRoZSB1c2VyIGBvcHRvdXRgLiBUaGlzIGlzIHRoZSBvbmx5IHRoaW5nIHdlIHNlbmQuXG4gICAgICBjb25zdCB1YSA9IG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpRGVmYXVsdCwgJ29wdG91dCcpO1xuICAgICAgdWEucGFnZXZpZXcoJy90ZWxlbWV0cnkvcHJvamVjdC9vcHRvdXQnKTtcbiAgICAgIGF3YWl0IHVhLmZsdXNoKCk7XG4gICAgfVxuXG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYXdhaXQgZ2V0QW5hbHl0aWNzSW5mb1N0cmluZygpKTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEdldCB0aGUgYW5hbHl0aWNzIG9iamVjdCBmb3IgdGhlIHVzZXIuXG4gKlxuICogQHJldHVybnNcbiAqIC0gYEFuYWx5dGljc0NvbGxlY3RvcmAgd2hlbiBlbmFibGVkLlxuICogLSBgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3NgIHdoZW4gZGlzYWJsZWQuXG4gKiAtIGB1bmRlZmluZWRgIHdoZW4gbm90IGNvbmZpZ3VyZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRBbmFseXRpY3MoXG4gIGxldmVsOiAnbG9jYWwnIHwgJ2dsb2JhbCcsXG4pOiBQcm9taXNlPEFuYWx5dGljc0NvbGxlY3RvciB8IGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzIHwgdW5kZWZpbmVkPiB7XG4gIGFuYWx5dGljc0RlYnVnKCdnZXRBbmFseXRpY3MnKTtcblxuICBpZiAoYW5hbHl0aWNzRGlzYWJsZWQpIHtcbiAgICBhbmFseXRpY3NEZWJ1ZygnTkdfQ0xJX0FOQUxZVElDUyBpcyBmYWxzZScpO1xuXG4gICAgcmV0dXJuIG5ldyBhbmFseXRpY3MuTm9vcEFuYWx5dGljcygpO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UobGV2ZWwpO1xuICAgIGNvbnN0IGFuYWx5dGljc0NvbmZpZzogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCB8IHsgdWlkPzogc3RyaW5nIH0gPVxuICAgICAgd29ya3NwYWNlPy5nZXRDbGkoKT8uWydhbmFseXRpY3MnXTtcbiAgICBhbmFseXRpY3NEZWJ1ZygnV29ya3NwYWNlIEFuYWx5dGljcyBjb25maWcgZm91bmQ6ICVqJywgYW5hbHl0aWNzQ29uZmlnKTtcblxuICAgIGlmIChhbmFseXRpY3NDb25maWcgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gbmV3IGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzKCk7XG4gICAgfSBlbHNlIGlmIChhbmFseXRpY3NDb25maWcgPT09IHVuZGVmaW5lZCB8fCBhbmFseXRpY3NDb25maWcgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB1aWQ6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAgICAgaWYgKHR5cGVvZiBhbmFseXRpY3NDb25maWcgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdWlkID0gYW5hbHl0aWNzQ29uZmlnO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYW5hbHl0aWNzQ29uZmlnID09ICdvYmplY3QnICYmIHR5cGVvZiBhbmFseXRpY3NDb25maWdbJ3VpZCddID09ICdzdHJpbmcnKSB7XG4gICAgICAgIHVpZCA9IGFuYWx5dGljc0NvbmZpZ1sndWlkJ107XG4gICAgICB9XG5cbiAgICAgIGFuYWx5dGljc0RlYnVnKCdjbGllbnQgaWQ6ICVqJywgdWlkKTtcbiAgICAgIGlmICh1aWQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaURlZmF1bHQsIHVpZCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBhbmFseXRpY3NEZWJ1ZygnRXJyb3IgaGFwcGVuZWQgZHVyaW5nIHJlYWRpbmcgb2YgYW5hbHl0aWNzIGNvbmZpZzogJXMnLCBlcnIubWVzc2FnZSk7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSB1c2FnZSBhbmFseXRpY3Mgc2hhcmluZyBzZXR0aW5nLCB3aGljaCBpcyBlaXRoZXIgYSBwcm9wZXJ0eSBzdHJpbmcgKEdBLVhYWFhYWFgtWFgpLFxuICogb3IgdW5kZWZpbmVkIGlmIG5vIHNoYXJpbmcuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRTaGFyZWRBbmFseXRpY3MoKTogUHJvbWlzZTxBbmFseXRpY3NDb2xsZWN0b3IgfCB1bmRlZmluZWQ+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ2dldFNoYXJlZEFuYWx5dGljcycpO1xuXG4gIGlmIChhbmFseXRpY3NTaGFyZURpc2FibGVkKSB7XG4gICAgYW5hbHl0aWNzRGVidWcoJ05HX0NMSV9BTkFMWVRJQ1MgaXMgZmFsc2UnKTtcblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBJZiBhbnl0aGluZyBoYXBwZW5zIHdlIGp1c3Qga2VlcCB0aGUgTk9PUCBhbmFseXRpY3MuXG4gIHRyeSB7XG4gICAgY29uc3QgZ2xvYmFsV29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcbiAgICBjb25zdCBhbmFseXRpY3NDb25maWcgPSBnbG9iYWxXb3Jrc3BhY2U/LmdldENsaSgpPy5bJ2FuYWx5dGljc1NoYXJpbmcnXTtcblxuICAgIGlmICghYW5hbHl0aWNzQ29uZmlnIHx8ICFhbmFseXRpY3NDb25maWcudHJhY2tpbmcgfHwgIWFuYWx5dGljc0NvbmZpZy51dWlkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnQW5hbHl0aWNzIHNoYXJpbmcgaW5mbzogJWonLCBhbmFseXRpY3NDb25maWcpO1xuXG4gICAgICByZXR1cm4gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihhbmFseXRpY3NDb25maWcudHJhY2tpbmcsIGFuYWx5dGljc0NvbmZpZy51dWlkKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGFuYWx5dGljc0RlYnVnKCdFcnJvciBoYXBwZW5lZCBkdXJpbmcgcmVhZGluZyBvZiBhbmFseXRpY3Mgc2hhcmluZyBjb25maWc6ICVzJywgZXJyLm1lc3NhZ2UpO1xuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQW5hbHl0aWNzKFxuICB3b3Jrc3BhY2U6IGJvb2xlYW4sXG4gIHNraXBQcm9tcHQgPSBmYWxzZSxcbik6IFByb21pc2U8YW5hbHl0aWNzLkFuYWx5dGljcz4ge1xuICAvLyBHbG9iYWwgY29uZmlnIHRha2VzIHByZWNlZGVuY2Ugb3ZlciBsb2NhbCBjb25maWcgb25seSBmb3IgdGhlIGRpc2FibGVkIGNoZWNrLlxuICAvLyBJRTpcbiAgLy8gZ2xvYmFsOiBkaXNhYmxlZCAmIGxvY2FsOiBlbmFibGVkID0gZGlzYWJsZWRcbiAgLy8gZ2xvYmFsOiBpZDogMTIzICYgbG9jYWw6IGlkOiA0NTYgPSA0NTZcblxuICAvLyBjaGVjayBnbG9iYWxcbiAgY29uc3QgZ2xvYmFsQ29uZmlnID0gYXdhaXQgZ2V0QW5hbHl0aWNzKCdnbG9iYWwnKTtcbiAgaWYgKGdsb2JhbENvbmZpZyBpbnN0YW5jZW9mIGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzKSB7XG4gICAgcmV0dXJuIGdsb2JhbENvbmZpZztcbiAgfVxuXG4gIGxldCBjb25maWcgPSBnbG9iYWxDb25maWc7XG4gIC8vIE5vdCBkaXNhYmxlZCBnbG9iYWxseSwgY2hlY2sgbG9jYWxseSBvciBub3Qgc2V0IGdsb2JhbGx5IGFuZCBjb21tYW5kIGlzIHJ1biBvdXRzaWRlIG9mIHdvcmtzcGFjZSBleGFtcGxlOiBgbmcgbmV3YFxuICBpZiAod29ya3NwYWNlIHx8IGdsb2JhbENvbmZpZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgbGV2ZWwgPSB3b3Jrc3BhY2UgPyAnbG9jYWwnIDogJ2dsb2JhbCc7XG4gICAgbGV0IGxvY2FsT3JHbG9iYWxDb25maWcgPSBhd2FpdCBnZXRBbmFseXRpY3MobGV2ZWwpO1xuICAgIGlmIChsb2NhbE9yR2xvYmFsQ29uZmlnID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICghc2tpcFByb21wdCkge1xuICAgICAgICAvLyBjb25maWcgaXMgdW5zZXQsIHByb21wdCB1c2VyLlxuICAgICAgICAvLyBUT0RPOiBUaGlzIHNob3VsZCBob25vciB0aGUgYG5vLWludGVyYWN0aXZlYCBvcHRpb24uXG4gICAgICAgIC8vIEl0IGlzIGN1cnJlbnRseSBub3QgYW4gYG5nYCBvcHRpb24gYnV0IHJhdGhlciBvbmx5IGFuIG9wdGlvbiBmb3Igc3BlY2lmaWMgY29tbWFuZHMuXG4gICAgICAgIC8vIFRoZSBjb25jZXB0IG9mIGBuZ2Atd2lkZSBvcHRpb25zIGFyZSBuZWVkZWQgdG8gY2xlYW5seSBoYW5kbGUgdGhpcy5cbiAgICAgICAgYXdhaXQgcHJvbXB0QW5hbHl0aWNzKCF3b3Jrc3BhY2UgLyoqIGdsb2JhbCAqLyk7XG4gICAgICAgIGxvY2FsT3JHbG9iYWxDb25maWcgPSBhd2FpdCBnZXRBbmFseXRpY3MobGV2ZWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChsb2NhbE9yR2xvYmFsQ29uZmlnIGluc3RhbmNlb2YgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MpIHtcbiAgICAgIHJldHVybiBsb2NhbE9yR2xvYmFsQ29uZmlnO1xuICAgIH0gZWxzZSBpZiAobG9jYWxPckdsb2JhbENvbmZpZykge1xuICAgICAgLy8gRmF2b3IgbG9jYWwgc2V0dGluZ3Mgb3ZlciBnbG9iYWwgd2hlbiBkZWZpbmVkLlxuICAgICAgY29uZmlnID0gbG9jYWxPckdsb2JhbENvbmZpZztcbiAgICB9XG4gIH1cblxuICAvLyBHZXQgc2hhcmVkIGFuYWx5dGljc1xuICAvLyBUT0RPOiBldmFsdXRlIGlmIHRoaXMgc2hvdWxkIGJlIGNvbXBsZXRseSByZW1vdmVkLlxuICBjb25zdCBtYXliZVNoYXJlZEFuYWx5dGljcyA9IGF3YWl0IGdldFNoYXJlZEFuYWx5dGljcygpO1xuICBpZiAoY29uZmlnICYmIG1heWJlU2hhcmVkQW5hbHl0aWNzKSB7XG4gICAgcmV0dXJuIG5ldyBhbmFseXRpY3MuTXVsdGlBbmFseXRpY3MoW2NvbmZpZywgbWF5YmVTaGFyZWRBbmFseXRpY3NdKTtcbiAgfVxuXG4gIHJldHVybiBjb25maWcgPz8gbWF5YmVTaGFyZWRBbmFseXRpY3MgPz8gbmV3IGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzKCk7XG59XG5cbmZ1bmN0aW9uIGFuYWx5dGljc0NvbmZpZ1ZhbHVlVG9IdW1hbkZvcm1hdCh2YWx1ZTogdW5rbm93bik6ICdlbmFibGVkJyB8ICdkaXNhYmxlZCcgfCAnbm90IHNldCcge1xuICBpZiAodmFsdWUgPT09IGZhbHNlKSB7XG4gICAgcmV0dXJuICdkaXNhYmxlZCc7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB2YWx1ZSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiAnZW5hYmxlZCc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICdub3Qgc2V0JztcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QW5hbHl0aWNzSW5mb1N0cmluZygpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBnbG9iYWxXb3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICBjb25zdCBsb2NhbFdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcbiAgY29uc3QgZ2xvYmFsU2V0dGluZyA9IGdsb2JhbFdvcmtzcGFjZT8uZ2V0Q2xpKCk/LlsnYW5hbHl0aWNzJ107XG4gIGNvbnN0IGxvY2FsU2V0dGluZyA9IGxvY2FsV29ya3NwYWNlPy5nZXRDbGkoKT8uWydhbmFseXRpY3MnXTtcblxuICBjb25zdCBhbmFseXRpY3NJbnN0YW5jZSA9IGF3YWl0IGNyZWF0ZUFuYWx5dGljcyhcbiAgICAhIWxvY2FsV29ya3NwYWNlIC8qKiB3b3Jrc3BhY2UgKi8sXG4gICAgdHJ1ZSAvKiogc2tpcFByb21wdCAqLyxcbiAgKTtcblxuICByZXR1cm4gKFxuICAgIHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgIEdsb2JhbCBzZXR0aW5nOiAke2FuYWx5dGljc0NvbmZpZ1ZhbHVlVG9IdW1hbkZvcm1hdChnbG9iYWxTZXR0aW5nKX1cbiAgICBMb2NhbCBzZXR0aW5nOiAke1xuICAgICAgbG9jYWxXb3Jrc3BhY2VcbiAgICAgICAgPyBhbmFseXRpY3NDb25maWdWYWx1ZVRvSHVtYW5Gb3JtYXQobG9jYWxTZXR0aW5nKVxuICAgICAgICA6ICdObyBsb2NhbCB3b3Jrc3BhY2UgY29uZmlndXJhdGlvbiBmaWxlLidcbiAgICB9XG4gICAgRWZmZWN0aXZlIHN0YXR1czogJHtcbiAgICAgIGFuYWx5dGljc0luc3RhbmNlIGluc3RhbmNlb2YgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MgPyAnZGlzYWJsZWQnIDogJ2VuYWJsZWQnXG4gICAgfVxuICBgICsgJ1xcbidcbiAgKTtcbn1cbiJdfQ==