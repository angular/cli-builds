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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2FuYWx5dGljcy9hbmFseXRpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBNkQ7QUFDN0Qsa0RBQTBCO0FBQzFCLCtCQUFvQztBQUNwQyw4Q0FBNEM7QUFDNUMsZ0RBQW1EO0FBQ25ELDBFQUE2RjtBQUM3Riw4Q0FBbUQ7QUFDbkQsMENBQXlDO0FBQ3pDLGtEQUErQztBQUMvQywrREFBMkQ7QUFFM0QsK0JBQStCO0FBQy9CLE1BQU0sY0FBYyxHQUFHLElBQUEsZUFBSyxFQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsb0RBQW9EO0FBRWxHLElBQUksK0JBQXVDLENBQUM7QUFDL0IsUUFBQSxtQkFBbUIsR0FBRztJQUNqQyxjQUFjLEVBQUUsZUFBZTtJQUMvQixpQkFBaUIsRUFBRSxlQUFlO0lBQ2xDLElBQUksaUJBQWlCO1FBQ25CLElBQUksK0JBQStCLEVBQUU7WUFDbkMsT0FBTywrQkFBK0IsQ0FBQztTQUN4QztRQUVELE1BQU0sQ0FBQyxHQUFHLGlCQUFPLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLCtFQUErRTtRQUMvRSwrQkFBK0I7WUFDN0IsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxPQUFPO2dCQUN4QyxDQUFDLENBQUMsMkJBQW1CLENBQUMsY0FBYztnQkFDcEMsQ0FBQyxDQUFDLDJCQUFtQixDQUFDLGlCQUFpQixDQUFDO1FBRTVDLE9BQU8sK0JBQStCLENBQUM7SUFDekMsQ0FBQztDQUNGLENBQUM7QUFFRjs7R0FFRztBQUNVLFFBQUEsd0JBQXdCLEdBQUc7SUFDdEMsYUFBYTtJQUNiLG9CQUFvQjtJQUNwQixhQUFhO0lBQ2IscUJBQXFCO0NBQ3RCLENB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LElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtRQUN0RCxPQUFPLFNBQVMsQ0FBQztLQUNsQjtTQUFNO1FBQ0wsT0FBTyxTQUFTLENBQUM7S0FDbEI7QUFDSCxDQUFDO0FBRU0sS0FBSyxVQUFVLHNCQUFzQjs7SUFDMUMsTUFBTSxlQUFlLEdBQUcsTUFBTSxJQUFBLHFCQUFZLEVBQUMsUUFBUSxDQUFDLENBQUM7SUFDckQsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFBLHFCQUFZLEVBQUMsT0FBTyxDQUFDLENBQUM7SUFDbkQsTUFBTSxhQUFhLEdBQUcsTUFBQSxlQUFlLGFBQWYsZUFBZSx1QkFBZixlQUFlLENBQUUsTUFBTSxFQUFFLDBDQUFHLFdBQVcsQ0FBQyxDQUFDO0lBQy9ELE1BQU0sWUFBWSxHQUFHLE1BQUEsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLE1BQU0sRUFBRSwwQ0FBRyxXQUFXLENBQUMsQ0FBQztJQUU3RCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sZUFBZSxDQUM3QyxDQUFDLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUNqQyxJQUFJLENBQUMsaUJBQWlCLENBQ3ZCLENBQUM7SUFFRixPQUFPLENBQ0wsV0FBSSxDQUFDLFlBQVksQ0FBQTtzQkFDQyxpQ0FBaUMsQ0FBQyxhQUFhLENBQUM7cUJBRWhFLGNBQWM7UUFDWixDQUFDLENBQUMsaUNBQWlDLENBQUMsWUFBWSxDQUFDO1FBQ2pELENBQUMsQ0FBQyx3Q0FDTjt3QkFFRSxpQkFBaUIsWUFBWSxnQkFBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUN0RTtHQUNELEdBQUcsSUFBSSxDQUNQLENBQUM7QUFDSixDQUFDO0FBeEJELHdEQXdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBhbmFseXRpY3MsIGpzb24sIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnO1xuaW1wb3J0IHsgdjQgYXMgdXVpZFY0IH0gZnJvbSAndXVpZCc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBhbmFseXRpY3NEaXNhYmxlZCwgYW5hbHl0aWNzU2hhcmVEaXNhYmxlZCB9IGZyb20gJy4uL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IGFzc2VydElzRXJyb3IgfSBmcm9tICcuLi91dGlsaXRpZXMvZXJyb3InO1xuaW1wb3J0IHsgaXNUVFkgfSBmcm9tICcuLi91dGlsaXRpZXMvdHR5JztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi91dGlsaXRpZXMvdmVyc2lvbic7XG5pbXBvcnQgeyBBbmFseXRpY3NDb2xsZWN0b3IgfSBmcm9tICcuL2FuYWx5dGljcy1jb2xsZWN0b3InO1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5jb25zdCBhbmFseXRpY3NEZWJ1ZyA9IGRlYnVnKCduZzphbmFseXRpY3MnKTsgLy8gR2VuZXJhdGUgYW5hbHl0aWNzLCBpbmNsdWRpbmcgc2V0dGluZ3MgYW5kIHVzZXJzLlxuXG5sZXQgX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZTogc3RyaW5nO1xuZXhwb3J0IGNvbnN0IEFuYWx5dGljc1Byb3BlcnRpZXMgPSB7XG4gIEFuZ3VsYXJDbGlQcm9kOiAnVUEtODU5NDM0Ni0yOScsXG4gIEFuZ3VsYXJDbGlTdGFnaW5nOiAnVUEtODU5NDM0Ni0zMicsXG4gIGdldCBBbmd1bGFyQ2xpRGVmYXVsdCgpOiBzdHJpbmcge1xuICAgIGlmIChfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlKSB7XG4gICAgICByZXR1cm4gX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZTtcbiAgICB9XG5cbiAgICBjb25zdCB2ID0gVkVSU0lPTi5mdWxsO1xuICAgIC8vIFRoZSBsb2dpYyBpcyBpZiBpdCdzIGEgZnVsbCB2ZXJzaW9uIHRoZW4gd2Ugc2hvdWxkIHVzZSB0aGUgcHJvZCBHQSBwcm9wZXJ0eS5cbiAgICBfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlID1cbiAgICAgIC9eXFxkK1xcLlxcZCtcXC5cXGQrJC8udGVzdCh2KSAmJiB2ICE9PSAnMC4wLjAnXG4gICAgICAgID8gQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpUHJvZFxuICAgICAgICA6IEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaVN0YWdpbmc7XG5cbiAgICByZXR1cm4gX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZTtcbiAgfSxcbn07XG5cbi8qKlxuICogVGhpcyBpcyB0aGUgdWx0aW1hdGUgc2FmZWxpc3QgZm9yIGNoZWNraW5nIGlmIGEgcGFja2FnZSBuYW1lIGlzIHNhZmUgdG8gcmVwb3J0IHRvIGFuYWx5dGljcy5cbiAqL1xuZXhwb3J0IGNvbnN0IGFuYWx5dGljc1BhY2thZ2VTYWZlbGlzdCA9IFtcbiAgL15AYW5ndWxhclxcLy8sXG4gIC9eQGFuZ3VsYXItZGV2a2l0XFwvLyxcbiAgL15Abmd0b29sc1xcLy8sXG4gICdAc2NoZW1hdGljcy9hbmd1bGFyJyxcbl07XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGFuYWx5dGljc1BhY2thZ2VTYWZlbGlzdC5zb21lKChwYXR0ZXJuKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBwYXR0ZXJuID09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gcGF0dGVybiA9PT0gbmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHBhdHRlcm4udGVzdChuYW1lKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIFNldCBhbmFseXRpY3Mgc2V0dGluZ3MuIFRoaXMgZG9lcyBub3Qgd29yayBpZiB0aGUgdXNlciBpcyBub3QgaW5zaWRlIGEgcHJvamVjdC5cbiAqIEBwYXJhbSBnbG9iYWwgV2hpY2ggY29uZmlnIHRvIHVzZS4gXCJnbG9iYWxcIiBmb3IgdXNlci1sZXZlbCwgYW5kIFwibG9jYWxcIiBmb3IgcHJvamVjdC1sZXZlbC5cbiAqIEBwYXJhbSB2YWx1ZSBFaXRoZXIgYSB1c2VyIElELCB0cnVlIHRvIGdlbmVyYXRlIGEgbmV3IFVzZXIgSUQsIG9yIGZhbHNlIHRvIGRpc2FibGUgYW5hbHl0aWNzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0QW5hbHl0aWNzQ29uZmlnKGdsb2JhbDogYm9vbGVhbiwgdmFsdWU6IHN0cmluZyB8IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgbGV2ZWwgPSBnbG9iYWwgPyAnZ2xvYmFsJyA6ICdsb2NhbCc7XG4gIGFuYWx5dGljc0RlYnVnKCdzZXR0aW5nICVzIGxldmVsIGFuYWx5dGljcyB0bzogJXMnLCBsZXZlbCwgdmFsdWUpO1xuICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UobGV2ZWwpO1xuICBpZiAoIXdvcmtzcGFjZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgJHtsZXZlbH0gd29ya3NwYWNlLmApO1xuICB9XG5cbiAgY29uc3QgY2xpID0gKHdvcmtzcGFjZS5leHRlbnNpb25zWydjbGknXSA/Pz0ge30pO1xuICBpZiAoIXdvcmtzcGFjZSB8fCAhanNvbi5pc0pzb25PYmplY3QoY2xpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWcgZm91bmQgYXQgJHt3b3Jrc3BhY2UuZmlsZVBhdGh9LiBDTEkgc2hvdWxkIGJlIGFuIG9iamVjdC5gKTtcbiAgfVxuXG4gIGNsaS5hbmFseXRpY3MgPSB2YWx1ZSA9PT0gdHJ1ZSA/IHV1aWRWNCgpIDogdmFsdWU7XG4gIGF3YWl0IHdvcmtzcGFjZS5zYXZlKCk7XG4gIGFuYWx5dGljc0RlYnVnKCdkb25lJyk7XG59XG5cbi8qKlxuICogUHJvbXB0IHRoZSB1c2VyIGZvciB1c2FnZSBnYXRoZXJpbmcgcGVybWlzc2lvbi5cbiAqIEBwYXJhbSBmb3JjZSBXaGV0aGVyIHRvIGFzayByZWdhcmRsZXNzIG9mIHdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIGlzIHVzaW5nIGFuIGludGVyYWN0aXZlIHNoZWxsLlxuICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgdXNlciB3YXMgc2hvd24gYSBwcm9tcHQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm9tcHRBbmFseXRpY3MoZ2xvYmFsOiBib29sZWFuLCBmb3JjZSA9IGZhbHNlKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGFuYWx5dGljc0RlYnVnKCdwcm9tcHRpbmcgdXNlcicpO1xuICBjb25zdCBsZXZlbCA9IGdsb2JhbCA/ICdnbG9iYWwnIDogJ2xvY2FsJztcbiAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGxldmVsKTtcbiAgaWYgKCF3b3Jrc3BhY2UpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGEgJHtsZXZlbH0gd29ya3NwYWNlLiBBcmUgeW91IGluIGEgcHJvamVjdD9gKTtcbiAgfVxuXG4gIGlmIChmb3JjZSB8fCBpc1RUWSgpKSB7XG4gICAgY29uc3QgeyBwcm9tcHQgfSA9IGF3YWl0IGltcG9ydCgnaW5xdWlyZXInKTtcbiAgICBjb25zdCBhbnN3ZXJzID0gYXdhaXQgcHJvbXB0PHsgYW5hbHl0aWNzOiBib29sZWFuIH0+KFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NvbmZpcm0nLFxuICAgICAgICBuYW1lOiAnYW5hbHl0aWNzJyxcbiAgICAgICAgbWVzc2FnZTogdGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgICAgV291bGQgeW91IGxpa2UgdG8gc2hhcmUgcHNldWRvbnltb3VzIHVzYWdlIGRhdGEgYWJvdXQgdGhpcyBwcm9qZWN0IHdpdGggdGhlIEFuZ3VsYXIgVGVhbVxuICAgICAgICAgIGF0IEdvb2dsZSB1bmRlciBHb29nbGUncyBQcml2YWN5IFBvbGljeSBhdCBodHRwczovL3BvbGljaWVzLmdvb2dsZS5jb20vcHJpdmFjeS4gRm9yIG1vcmVcbiAgICAgICAgICBkZXRhaWxzIGFuZCBob3cgdG8gY2hhbmdlIHRoaXMgc2V0dGluZywgc2VlIGh0dHBzOi8vYW5ndWxhci5pby9hbmFseXRpY3MuXG5cbiAgICAgICAgYCxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9LFxuICAgIF0pO1xuXG4gICAgYXdhaXQgc2V0QW5hbHl0aWNzQ29uZmlnKGdsb2JhbCwgYW5zd2Vycy5hbmFseXRpY3MpO1xuXG4gICAgaWYgKGFuc3dlcnMuYW5hbHl0aWNzKSB7XG4gICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgdGFncy5zdHJpcEluZGVudGBcbiAgICAgICAgVGhhbmsgeW91IGZvciBzaGFyaW5nIHBzZXVkb255bW91cyB1c2FnZSBkYXRhLiBTaG91bGQgeW91IGNoYW5nZSB5b3VyIG1pbmQsIHRoZSBmb2xsb3dpbmdcbiAgICAgICAgY29tbWFuZCB3aWxsIGRpc2FibGUgdGhpcyBmZWF0dXJlIGVudGlyZWx5OlxuXG4gICAgICAgICAgICAke2NvbG9ycy55ZWxsb3coYG5nIGFuYWx5dGljcyBkaXNhYmxlJHtnbG9iYWwgPyAnIC0tZ2xvYmFsJyA6ICcnfWApfVxuICAgICAgYCxcbiAgICAgICk7XG4gICAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICAgIC8vIFNlbmQgYmFjayBhIHBpbmcgd2l0aCB0aGUgdXNlciBgb3B0aW5gLlxuICAgICAgY29uc3QgdWEgPSBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaURlZmF1bHQsICdvcHRpbicpO1xuICAgICAgdWEucGFnZXZpZXcoJy90ZWxlbWV0cnkvcHJvamVjdC9vcHRpbicpO1xuICAgICAgYXdhaXQgdWEuZmx1c2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU2VuZCBiYWNrIGEgcGluZyB3aXRoIHRoZSB1c2VyIGBvcHRvdXRgLiBUaGlzIGlzIHRoZSBvbmx5IHRoaW5nIHdlIHNlbmQuXG4gICAgICBjb25zdCB1YSA9IG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpRGVmYXVsdCwgJ29wdG91dCcpO1xuICAgICAgdWEucGFnZXZpZXcoJy90ZWxlbWV0cnkvcHJvamVjdC9vcHRvdXQnKTtcbiAgICAgIGF3YWl0IHVhLmZsdXNoKCk7XG4gICAgfVxuXG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYXdhaXQgZ2V0QW5hbHl0aWNzSW5mb1N0cmluZygpKTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEdldCB0aGUgYW5hbHl0aWNzIG9iamVjdCBmb3IgdGhlIHVzZXIuXG4gKlxuICogQHJldHVybnNcbiAqIC0gYEFuYWx5dGljc0NvbGxlY3RvcmAgd2hlbiBlbmFibGVkLlxuICogLSBgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3NgIHdoZW4gZGlzYWJsZWQuXG4gKiAtIGB1bmRlZmluZWRgIHdoZW4gbm90IGNvbmZpZ3VyZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRBbmFseXRpY3MoXG4gIGxldmVsOiAnbG9jYWwnIHwgJ2dsb2JhbCcsXG4pOiBQcm9taXNlPEFuYWx5dGljc0NvbGxlY3RvciB8IGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzIHwgdW5kZWZpbmVkPiB7XG4gIGFuYWx5dGljc0RlYnVnKCdnZXRBbmFseXRpY3MnKTtcblxuICBpZiAoYW5hbHl0aWNzRGlzYWJsZWQpIHtcbiAgICBhbmFseXRpY3NEZWJ1ZygnTkdfQ0xJX0FOQUxZVElDUyBpcyBmYWxzZScpO1xuXG4gICAgcmV0dXJuIG5ldyBhbmFseXRpY3MuTm9vcEFuYWx5dGljcygpO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UobGV2ZWwpO1xuICAgIGNvbnN0IGFuYWx5dGljc0NvbmZpZzogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbCB8IHsgdWlkPzogc3RyaW5nIH0gPVxuICAgICAgd29ya3NwYWNlPy5nZXRDbGkoKT8uWydhbmFseXRpY3MnXTtcbiAgICBhbmFseXRpY3NEZWJ1ZygnV29ya3NwYWNlIEFuYWx5dGljcyBjb25maWcgZm91bmQ6ICVqJywgYW5hbHl0aWNzQ29uZmlnKTtcblxuICAgIGlmIChhbmFseXRpY3NDb25maWcgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gbmV3IGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzKCk7XG4gICAgfSBlbHNlIGlmIChhbmFseXRpY3NDb25maWcgPT09IHVuZGVmaW5lZCB8fCBhbmFseXRpY3NDb25maWcgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB1aWQ6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAgICAgaWYgKHR5cGVvZiBhbmFseXRpY3NDb25maWcgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdWlkID0gYW5hbHl0aWNzQ29uZmlnO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYW5hbHl0aWNzQ29uZmlnID09ICdvYmplY3QnICYmIHR5cGVvZiBhbmFseXRpY3NDb25maWdbJ3VpZCddID09ICdzdHJpbmcnKSB7XG4gICAgICAgIHVpZCA9IGFuYWx5dGljc0NvbmZpZ1sndWlkJ107XG4gICAgICB9XG5cbiAgICAgIGFuYWx5dGljc0RlYnVnKCdjbGllbnQgaWQ6ICVqJywgdWlkKTtcbiAgICAgIGlmICh1aWQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaURlZmF1bHQsIHVpZCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBhc3NlcnRJc0Vycm9yKGVycik7XG4gICAgYW5hbHl0aWNzRGVidWcoJ0Vycm9yIGhhcHBlbmVkIGR1cmluZyByZWFkaW5nIG9mIGFuYWx5dGljcyBjb25maWc6ICVzJywgZXJyLm1lc3NhZ2UpO1xuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybiB0aGUgdXNhZ2UgYW5hbHl0aWNzIHNoYXJpbmcgc2V0dGluZywgd2hpY2ggaXMgZWl0aGVyIGEgcHJvcGVydHkgc3RyaW5nIChHQS1YWFhYWFhYLVhYKSxcbiAqIG9yIHVuZGVmaW5lZCBpZiBubyBzaGFyaW5nLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0U2hhcmVkQW5hbHl0aWNzKCk6IFByb21pc2U8QW5hbHl0aWNzQ29sbGVjdG9yIHwgdW5kZWZpbmVkPiB7XG4gIGFuYWx5dGljc0RlYnVnKCdnZXRTaGFyZWRBbmFseXRpY3MnKTtcblxuICBpZiAoYW5hbHl0aWNzU2hhcmVEaXNhYmxlZCkge1xuICAgIGFuYWx5dGljc0RlYnVnKCdOR19DTElfQU5BTFlUSUNTIGlzIGZhbHNlJyk7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gSWYgYW55dGhpbmcgaGFwcGVucyB3ZSBqdXN0IGtlZXAgdGhlIE5PT1AgYW5hbHl0aWNzLlxuICB0cnkge1xuICAgIGNvbnN0IGdsb2JhbFdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgY29uc3QgYW5hbHl0aWNzQ29uZmlnID0gZ2xvYmFsV29ya3NwYWNlPy5nZXRDbGkoKT8uWydhbmFseXRpY3NTaGFyaW5nJ107XG5cbiAgICBpZiAoIWFuYWx5dGljc0NvbmZpZyB8fCAhYW5hbHl0aWNzQ29uZmlnLnRyYWNraW5nIHx8ICFhbmFseXRpY3NDb25maWcudXVpZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgYW5hbHl0aWNzRGVidWcoJ0FuYWx5dGljcyBzaGFyaW5nIGluZm86ICVqJywgYW5hbHl0aWNzQ29uZmlnKTtcblxuICAgICAgcmV0dXJuIG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoYW5hbHl0aWNzQ29uZmlnLnRyYWNraW5nLCBhbmFseXRpY3NDb25maWcudXVpZCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBhc3NlcnRJc0Vycm9yKGVycik7XG4gICAgYW5hbHl0aWNzRGVidWcoJ0Vycm9yIGhhcHBlbmVkIGR1cmluZyByZWFkaW5nIG9mIGFuYWx5dGljcyBzaGFyaW5nIGNvbmZpZzogJXMnLCBlcnIubWVzc2FnZSk7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVBbmFseXRpY3MoXG4gIHdvcmtzcGFjZTogYm9vbGVhbixcbiAgc2tpcFByb21wdCA9IGZhbHNlLFxuKTogUHJvbWlzZTxhbmFseXRpY3MuQW5hbHl0aWNzPiB7XG4gIC8vIEdsb2JhbCBjb25maWcgdGFrZXMgcHJlY2VkZW5jZSBvdmVyIGxvY2FsIGNvbmZpZyBvbmx5IGZvciB0aGUgZGlzYWJsZWQgY2hlY2suXG4gIC8vIElFOlxuICAvLyBnbG9iYWw6IGRpc2FibGVkICYgbG9jYWw6IGVuYWJsZWQgPSBkaXNhYmxlZFxuICAvLyBnbG9iYWw6IGlkOiAxMjMgJiBsb2NhbDogaWQ6IDQ1NiA9IDQ1NlxuXG4gIC8vIGNoZWNrIGdsb2JhbFxuICBjb25zdCBnbG9iYWxDb25maWcgPSBhd2FpdCBnZXRBbmFseXRpY3MoJ2dsb2JhbCcpO1xuICBpZiAoZ2xvYmFsQ29uZmlnIGluc3RhbmNlb2YgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MpIHtcbiAgICByZXR1cm4gZ2xvYmFsQ29uZmlnO1xuICB9XG5cbiAgbGV0IGNvbmZpZyA9IGdsb2JhbENvbmZpZztcbiAgLy8gTm90IGRpc2FibGVkIGdsb2JhbGx5LCBjaGVjayBsb2NhbGx5IG9yIG5vdCBzZXQgZ2xvYmFsbHkgYW5kIGNvbW1hbmQgaXMgcnVuIG91dHNpZGUgb2Ygd29ya3NwYWNlIGV4YW1wbGU6IGBuZyBuZXdgXG4gIGlmICh3b3Jrc3BhY2UgfHwgZ2xvYmFsQ29uZmlnID09PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBsZXZlbCA9IHdvcmtzcGFjZSA/ICdsb2NhbCcgOiAnZ2xvYmFsJztcbiAgICBsZXQgbG9jYWxPckdsb2JhbENvbmZpZyA9IGF3YWl0IGdldEFuYWx5dGljcyhsZXZlbCk7XG4gICAgaWYgKGxvY2FsT3JHbG9iYWxDb25maWcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKCFza2lwUHJvbXB0KSB7XG4gICAgICAgIC8vIGNvbmZpZyBpcyB1bnNldCwgcHJvbXB0IHVzZXIuXG4gICAgICAgIC8vIFRPRE86IFRoaXMgc2hvdWxkIGhvbm9yIHRoZSBgbm8taW50ZXJhY3RpdmVgIG9wdGlvbi5cbiAgICAgICAgLy8gSXQgaXMgY3VycmVudGx5IG5vdCBhbiBgbmdgIG9wdGlvbiBidXQgcmF0aGVyIG9ubHkgYW4gb3B0aW9uIGZvciBzcGVjaWZpYyBjb21tYW5kcy5cbiAgICAgICAgLy8gVGhlIGNvbmNlcHQgb2YgYG5nYC13aWRlIG9wdGlvbnMgYXJlIG5lZWRlZCB0byBjbGVhbmx5IGhhbmRsZSB0aGlzLlxuICAgICAgICBhd2FpdCBwcm9tcHRBbmFseXRpY3MoIXdvcmtzcGFjZSAvKiogZ2xvYmFsICovKTtcbiAgICAgICAgbG9jYWxPckdsb2JhbENvbmZpZyA9IGF3YWl0IGdldEFuYWx5dGljcyhsZXZlbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGxvY2FsT3JHbG9iYWxDb25maWcgaW5zdGFuY2VvZiBhbmFseXRpY3MuTm9vcEFuYWx5dGljcykge1xuICAgICAgcmV0dXJuIGxvY2FsT3JHbG9iYWxDb25maWc7XG4gICAgfSBlbHNlIGlmIChsb2NhbE9yR2xvYmFsQ29uZmlnKSB7XG4gICAgICAvLyBGYXZvciBsb2NhbCBzZXR0aW5ncyBvdmVyIGdsb2JhbCB3aGVuIGRlZmluZWQuXG4gICAgICBjb25maWcgPSBsb2NhbE9yR2xvYmFsQ29uZmlnO1xuICAgIH1cbiAgfVxuXG4gIC8vIEdldCBzaGFyZWQgYW5hbHl0aWNzXG4gIC8vIFRPRE86IGV2YWx1dGUgaWYgdGhpcyBzaG91bGQgYmUgY29tcGxldGx5IHJlbW92ZWQuXG4gIGNvbnN0IG1heWJlU2hhcmVkQW5hbHl0aWNzID0gYXdhaXQgZ2V0U2hhcmVkQW5hbHl0aWNzKCk7XG4gIGlmIChjb25maWcgJiYgbWF5YmVTaGFyZWRBbmFseXRpY3MpIHtcbiAgICByZXR1cm4gbmV3IGFuYWx5dGljcy5NdWx0aUFuYWx5dGljcyhbY29uZmlnLCBtYXliZVNoYXJlZEFuYWx5dGljc10pO1xuICB9XG5cbiAgcmV0dXJuIGNvbmZpZyA/PyBtYXliZVNoYXJlZEFuYWx5dGljcyA/PyBuZXcgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MoKTtcbn1cblxuZnVuY3Rpb24gYW5hbHl0aWNzQ29uZmlnVmFsdWVUb0h1bWFuRm9ybWF0KHZhbHVlOiB1bmtub3duKTogJ2VuYWJsZWQnIHwgJ2Rpc2FibGVkJyB8ICdub3Qgc2V0JyB7XG4gIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHtcbiAgICByZXR1cm4gJ2Rpc2FibGVkJztcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IHZhbHVlID09PSB0cnVlKSB7XG4gICAgcmV0dXJuICdlbmFibGVkJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJ25vdCBzZXQnO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRBbmFseXRpY3NJbmZvU3RyaW5nKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGdsb2JhbFdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gIGNvbnN0IGxvY2FsV29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdsb2NhbCcpO1xuICBjb25zdCBnbG9iYWxTZXR0aW5nID0gZ2xvYmFsV29ya3NwYWNlPy5nZXRDbGkoKT8uWydhbmFseXRpY3MnXTtcbiAgY29uc3QgbG9jYWxTZXR0aW5nID0gbG9jYWxXb3Jrc3BhY2U/LmdldENsaSgpPy5bJ2FuYWx5dGljcyddO1xuXG4gIGNvbnN0IGFuYWx5dGljc0luc3RhbmNlID0gYXdhaXQgY3JlYXRlQW5hbHl0aWNzKFxuICAgICEhbG9jYWxXb3Jrc3BhY2UgLyoqIHdvcmtzcGFjZSAqLyxcbiAgICB0cnVlIC8qKiBza2lwUHJvbXB0ICovLFxuICApO1xuXG4gIHJldHVybiAoXG4gICAgdGFncy5zdHJpcEluZGVudHNgXG4gICAgR2xvYmFsIHNldHRpbmc6ICR7YW5hbHl0aWNzQ29uZmlnVmFsdWVUb0h1bWFuRm9ybWF0KGdsb2JhbFNldHRpbmcpfVxuICAgIExvY2FsIHNldHRpbmc6ICR7XG4gICAgICBsb2NhbFdvcmtzcGFjZVxuICAgICAgICA/IGFuYWx5dGljc0NvbmZpZ1ZhbHVlVG9IdW1hbkZvcm1hdChsb2NhbFNldHRpbmcpXG4gICAgICAgIDogJ05vIGxvY2FsIHdvcmtzcGFjZSBjb25maWd1cmF0aW9uIGZpbGUuJ1xuICAgIH1cbiAgICBFZmZlY3RpdmUgc3RhdHVzOiAke1xuICAgICAgYW5hbHl0aWNzSW5zdGFuY2UgaW5zdGFuY2VvZiBhbmFseXRpY3MuTm9vcEFuYWx5dGljcyA/ICdkaXNhYmxlZCcgOiAnZW5hYmxlZCdcbiAgICB9XG4gIGAgKyAnXFxuJ1xuICApO1xufVxuIl19