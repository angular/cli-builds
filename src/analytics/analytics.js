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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2FuYWx5dGljcy9hbmFseXRpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBNkQ7QUFDN0Qsa0RBQTBCO0FBQzFCLCtCQUFvQztBQUNwQyw4Q0FBNEM7QUFDNUMsZ0RBQW9FO0FBQ3BFLDBFQUE2RjtBQUM3RiwwQ0FBeUM7QUFDekMsa0RBQStDO0FBQy9DLCtEQUEyRDtBQUUzRCwrQkFBK0I7QUFDL0IsTUFBTSxjQUFjLEdBQUcsSUFBQSxlQUFLLEVBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxvREFBb0Q7QUFFbEcsSUFBSSwrQkFBdUMsQ0FBQztBQUMvQixRQUFBLG1CQUFtQixHQUFHO0lBQ2pDLGNBQWMsRUFBRSxlQUFlO0lBQy9CLGlCQUFpQixFQUFFLGVBQWU7SUFDbEMsSUFBSSxpQkFBaUI7UUFDbkIsSUFBSSwrQkFBK0IsRUFBRTtZQUNuQyxPQUFPLCtCQUErQixDQUFDO1NBQ3hDO1FBRUQsTUFBTSxDQUFDLEdBQUcsaUJBQU8sQ0FBQyxJQUFJLENBQUM7UUFDdkIsK0VBQStFO1FBQy9FLCtCQUErQjtZQUM3QixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLE9BQU87Z0JBQ3hDLENBQUMsQ0FBQywyQkFBbUIsQ0FBQyxjQUFjO2dCQUNwQyxDQUFDLENBQUMsMkJBQW1CLENBQUMsaUJBQWlCLENBQUM7UUFFNUMsT0FBTywrQkFBK0IsQ0FBQztJQUN6QyxDQUFDO0NBQ0YsQ0FBQztBQUVGOztHQUVHO0FBQ1UsUUFBQSx3QkFBd0IsR0FBRztJQUN0QyxhQUFhO0lBQ2Isb0JBQW9CO0lBQ3BCLGFBQWE7SUFDYixxQkFBcUI7Q0FDdEIsQ0FBQztBQUVGLFNBQWdC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QVMsQ0FBQztLQUNsQjtTQUFNO1FBQ0wsT0FBTyxTQUFTLENBQUM7S0FDbEI7QUFDSCxDQUFDO0FBRU0sS0FBSyxVQUFVLHNCQUFzQjtJQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsSUFBQSx3QkFBZSxFQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BELE1BQU0sQ0FBQyxjQUFjLENBQUMsR0FBRyxJQUFBLHdCQUFlLEVBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEQsTUFBTSxhQUFhLEdBQUcsZUFBZSxhQUFmLGVBQWUsdUJBQWYsZUFBZSxDQUFFLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQ2pFLE1BQU0sWUFBWSxHQUFHLGNBQWMsYUFBZCxjQUFjLHVCQUFkLGNBQWMsQ0FBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUUvRCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sZUFBZSxDQUM3QyxDQUFDLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUNqQyxJQUFJLENBQUMsaUJBQWlCLENBQ3ZCLENBQUM7SUFFRixPQUFPLENBQ0wsV0FBSSxDQUFDLFlBQVksQ0FBQTtzQkFDQyxpQ0FBaUMsQ0FBQyxhQUFhLENBQUM7cUJBRWhFLGNBQWM7UUFDWixDQUFDLENBQUMsaUNBQWlDLENBQUMsWUFBWSxDQUFDO1FBQ2pELENBQUMsQ0FBQyx3Q0FDTjt3QkFFRSxpQkFBaUIsWUFBWSxnQkFBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUN0RTtHQUNELEdBQUcsSUFBSSxDQUNQLENBQUM7QUFDSixDQUFDO0FBeEJELHdEQXdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBhbmFseXRpY3MsIGpzb24sIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnO1xuaW1wb3J0IHsgdjQgYXMgdXVpZFY0IH0gZnJvbSAndXVpZCc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCBnZXRXb3Jrc3BhY2VSYXcgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IGFuYWx5dGljc0Rpc2FibGVkLCBhbmFseXRpY3NTaGFyZURpc2FibGVkIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2Vudmlyb25tZW50LW9wdGlvbnMnO1xuaW1wb3J0IHsgaXNUVFkgfSBmcm9tICcuLi91dGlsaXRpZXMvdHR5JztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi91dGlsaXRpZXMvdmVyc2lvbic7XG5pbXBvcnQgeyBBbmFseXRpY3NDb2xsZWN0b3IgfSBmcm9tICcuL2FuYWx5dGljcy1jb2xsZWN0b3InO1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5jb25zdCBhbmFseXRpY3NEZWJ1ZyA9IGRlYnVnKCduZzphbmFseXRpY3MnKTsgLy8gR2VuZXJhdGUgYW5hbHl0aWNzLCBpbmNsdWRpbmcgc2V0dGluZ3MgYW5kIHVzZXJzLlxuXG5sZXQgX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZTogc3RyaW5nO1xuZXhwb3J0IGNvbnN0IEFuYWx5dGljc1Byb3BlcnRpZXMgPSB7XG4gIEFuZ3VsYXJDbGlQcm9kOiAnVUEtODU5NDM0Ni0yOScsXG4gIEFuZ3VsYXJDbGlTdGFnaW5nOiAnVUEtODU5NDM0Ni0zMicsXG4gIGdldCBBbmd1bGFyQ2xpRGVmYXVsdCgpOiBzdHJpbmcge1xuICAgIGlmIChfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlKSB7XG4gICAgICByZXR1cm4gX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZTtcbiAgICB9XG5cbiAgICBjb25zdCB2ID0gVkVSU0lPTi5mdWxsO1xuICAgIC8vIFRoZSBsb2dpYyBpcyBpZiBpdCdzIGEgZnVsbCB2ZXJzaW9uIHRoZW4gd2Ugc2hvdWxkIHVzZSB0aGUgcHJvZCBHQSBwcm9wZXJ0eS5cbiAgICBfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlID1cbiAgICAgIC9eXFxkK1xcLlxcZCtcXC5cXGQrJC8udGVzdCh2KSAmJiB2ICE9PSAnMC4wLjAnXG4gICAgICAgID8gQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpUHJvZFxuICAgICAgICA6IEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaVN0YWdpbmc7XG5cbiAgICByZXR1cm4gX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZTtcbiAgfSxcbn07XG5cbi8qKlxuICogVGhpcyBpcyB0aGUgdWx0aW1hdGUgc2FmZWxpc3QgZm9yIGNoZWNraW5nIGlmIGEgcGFja2FnZSBuYW1lIGlzIHNhZmUgdG8gcmVwb3J0IHRvIGFuYWx5dGljcy5cbiAqL1xuZXhwb3J0IGNvbnN0IGFuYWx5dGljc1BhY2thZ2VTYWZlbGlzdCA9IFtcbiAgL15AYW5ndWxhclxcLy8sXG4gIC9eQGFuZ3VsYXItZGV2a2l0XFwvLyxcbiAgL15Abmd0b29sc1xcLy8sXG4gICdAc2NoZW1hdGljcy9hbmd1bGFyJyxcbl07XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGFuYWx5dGljc1BhY2thZ2VTYWZlbGlzdC5zb21lKChwYXR0ZXJuKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBwYXR0ZXJuID09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gcGF0dGVybiA9PT0gbmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHBhdHRlcm4udGVzdChuYW1lKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIFNldCBhbmFseXRpY3Mgc2V0dGluZ3MuIFRoaXMgZG9lcyBub3Qgd29yayBpZiB0aGUgdXNlciBpcyBub3QgaW5zaWRlIGEgcHJvamVjdC5cbiAqIEBwYXJhbSBnbG9iYWwgV2hpY2ggY29uZmlnIHRvIHVzZS4gXCJnbG9iYWxcIiBmb3IgdXNlci1sZXZlbCwgYW5kIFwibG9jYWxcIiBmb3IgcHJvamVjdC1sZXZlbC5cbiAqIEBwYXJhbSB2YWx1ZSBFaXRoZXIgYSB1c2VyIElELCB0cnVlIHRvIGdlbmVyYXRlIGEgbmV3IFVzZXIgSUQsIG9yIGZhbHNlIHRvIGRpc2FibGUgYW5hbHl0aWNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0QW5hbHl0aWNzQ29uZmlnKGdsb2JhbDogYm9vbGVhbiwgdmFsdWU6IHN0cmluZyB8IGJvb2xlYW4pOiB2b2lkIHtcbiAgY29uc3QgbGV2ZWwgPSBnbG9iYWwgPyAnZ2xvYmFsJyA6ICdsb2NhbCc7XG4gIGFuYWx5dGljc0RlYnVnKCdzZXR0aW5nICVzIGxldmVsIGFuYWx5dGljcyB0bzogJXMnLCBsZXZlbCwgdmFsdWUpO1xuICBjb25zdCBbY29uZmlnLCBjb25maWdQYXRoXSA9IGdldFdvcmtzcGFjZVJhdyhsZXZlbCk7XG4gIGlmICghY29uZmlnIHx8ICFjb25maWdQYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCAke2xldmVsfSB3b3Jrc3BhY2UuYCk7XG4gIH1cblxuICBjb25zdCBjbGkgPSBjb25maWcuZ2V0KFsnY2xpJ10pO1xuXG4gIGlmIChjbGkgIT09IHVuZGVmaW5lZCAmJiAhanNvbi5pc0pzb25PYmplY3QoY2xpIGFzIGpzb24uSnNvblZhbHVlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWcgZm91bmQgYXQgJHtjb25maWdQYXRofS4gQ0xJIHNob3VsZCBiZSBhbiBvYmplY3QuYCk7XG4gIH1cblxuICBpZiAodmFsdWUgPT09IHRydWUpIHtcbiAgICB2YWx1ZSA9IHV1aWRWNCgpO1xuICB9XG5cbiAgY29uZmlnLm1vZGlmeShbJ2NsaScsICdhbmFseXRpY3MnXSwgdmFsdWUpO1xuICBjb25maWcuc2F2ZSgpO1xuXG4gIGFuYWx5dGljc0RlYnVnKCdkb25lJyk7XG59XG5cbi8qKlxuICogUHJvbXB0IHRoZSB1c2VyIGZvciB1c2FnZSBnYXRoZXJpbmcgcGVybWlzc2lvbi5cbiAqIEBwYXJhbSBmb3JjZSBXaGV0aGVyIHRvIGFzayByZWdhcmRsZXNzIG9mIHdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIGlzIHVzaW5nIGFuIGludGVyYWN0aXZlIHNoZWxsLlxuICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgdXNlciB3YXMgc2hvd24gYSBwcm9tcHQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm9tcHRBbmFseXRpY3MoZ2xvYmFsOiBib29sZWFuLCBmb3JjZSA9IGZhbHNlKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGFuYWx5dGljc0RlYnVnKCdwcm9tcHRpbmcgdXNlcicpO1xuICBjb25zdCBsZXZlbCA9IGdsb2JhbCA/ICdnbG9iYWwnIDogJ2xvY2FsJztcbiAgY29uc3QgW2NvbmZpZywgY29uZmlnUGF0aF0gPSBnZXRXb3Jrc3BhY2VSYXcobGV2ZWwpO1xuICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnUGF0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgYSAke2xldmVsfSB3b3Jrc3BhY2UuIEFyZSB5b3UgaW4gYSBwcm9qZWN0P2ApO1xuICB9XG5cbiAgaWYgKGZvcmNlIHx8IGlzVFRZKCkpIHtcbiAgICBjb25zdCB7IHByb21wdCB9ID0gYXdhaXQgaW1wb3J0KCdpbnF1aXJlcicpO1xuICAgIGNvbnN0IGFuc3dlcnMgPSBhd2FpdCBwcm9tcHQ8eyBhbmFseXRpY3M6IGJvb2xlYW4gfT4oW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnY29uZmlybScsXG4gICAgICAgIG5hbWU6ICdhbmFseXRpY3MnLFxuICAgICAgICBtZXNzYWdlOiB0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBXb3VsZCB5b3UgbGlrZSB0byBzaGFyZSBhbm9ueW1vdXMgdXNhZ2UgZGF0YSBhYm91dCB0aGlzIHByb2plY3Qgd2l0aCB0aGUgQW5ndWxhciBUZWFtIGF0XG4gICAgICAgICAgR29vZ2xlIHVuZGVyIEdvb2dsZeKAmXMgUHJpdmFjeSBQb2xpY3kgYXQgaHR0cHM6Ly9wb2xpY2llcy5nb29nbGUuY29tL3ByaXZhY3kuIEZvciBtb3JlXG4gICAgICAgICAgZGV0YWlscyBhbmQgaG93IHRvIGNoYW5nZSB0aGlzIHNldHRpbmcsIHNlZSBodHRwczovL2FuZ3VsYXIuaW8vYW5hbHl0aWNzLlxuXG4gICAgICAgIGAsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSxcbiAgICBdKTtcblxuICAgIHNldEFuYWx5dGljc0NvbmZpZyhnbG9iYWwsIGFuc3dlcnMuYW5hbHl0aWNzKTtcblxuICAgIGlmIChhbnN3ZXJzLmFuYWx5dGljcykge1xuICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgY29uc29sZS5sb2coXG4gICAgICAgIHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIFRoYW5rIHlvdSBmb3Igc2hhcmluZyBhbm9ueW1vdXMgdXNhZ2UgZGF0YS4gU2hvdWxkIHlvdSBjaGFuZ2UgeW91ciBtaW5kLCB0aGUgZm9sbG93aW5nXG4gICAgICAgIGNvbW1hbmQgd2lsbCBkaXNhYmxlIHRoaXMgZmVhdHVyZSBlbnRpcmVseTpcblxuICAgICAgICAgICAgJHtjb2xvcnMueWVsbG93KGBuZyBhbmFseXRpY3MgZGlzYWJsZSR7Z2xvYmFsID8gJyAtLWdsb2JhbCcgOiAnJ31gKX1cbiAgICAgIGAsXG4gICAgICApO1xuICAgICAgY29uc29sZS5sb2coJycpO1xuXG4gICAgICAvLyBTZW5kIGJhY2sgYSBwaW5nIHdpdGggdGhlIHVzZXIgYG9wdGluYC5cbiAgICAgIGNvbnN0IHVhID0gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlEZWZhdWx0LCAnb3B0aW4nKTtcbiAgICAgIHVhLnBhZ2V2aWV3KCcvdGVsZW1ldHJ5L3Byb2plY3Qvb3B0aW4nKTtcbiAgICAgIGF3YWl0IHVhLmZsdXNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNlbmQgYmFjayBhIHBpbmcgd2l0aCB0aGUgdXNlciBgb3B0b3V0YC4gVGhpcyBpcyB0aGUgb25seSB0aGluZyB3ZSBzZW5kLlxuICAgICAgY29uc3QgdWEgPSBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaURlZmF1bHQsICdvcHRvdXQnKTtcbiAgICAgIHVhLnBhZ2V2aWV3KCcvdGVsZW1ldHJ5L3Byb2plY3Qvb3B0b3V0Jyk7XG4gICAgICBhd2FpdCB1YS5mbHVzaCgpO1xuICAgIH1cblxuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGF3YWl0IGdldEFuYWx5dGljc0luZm9TdHJpbmcoKSk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGFuYWx5dGljcyBvYmplY3QgZm9yIHRoZSB1c2VyLlxuICpcbiAqIEByZXR1cm5zXG4gKiAtIGBBbmFseXRpY3NDb2xsZWN0b3JgIHdoZW4gZW5hYmxlZC5cbiAqIC0gYGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzYCB3aGVuIGRpc2FibGVkLlxuICogLSBgdW5kZWZpbmVkYCB3aGVuIG5vdCBjb25maWd1cmVkLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QW5hbHl0aWNzKFxuICBsZXZlbDogJ2xvY2FsJyB8ICdnbG9iYWwnLFxuKTogUHJvbWlzZTxBbmFseXRpY3NDb2xsZWN0b3IgfCBhbmFseXRpY3MuTm9vcEFuYWx5dGljcyB8IHVuZGVmaW5lZD4ge1xuICBhbmFseXRpY3NEZWJ1ZygnZ2V0QW5hbHl0aWNzJyk7XG5cbiAgaWYgKGFuYWx5dGljc0Rpc2FibGVkKSB7XG4gICAgYW5hbHl0aWNzRGVidWcoJ05HX0NMSV9BTkFMWVRJQ1MgaXMgZmFsc2UnKTtcblxuICAgIHJldHVybiBuZXcgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MoKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGxldmVsKTtcbiAgICBjb25zdCBhbmFseXRpY3NDb25maWc6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwgfCB7IHVpZD86IHN0cmluZyB9ID1cbiAgICAgIHdvcmtzcGFjZT8uZ2V0Q2xpKClbJ2FuYWx5dGljcyddO1xuICAgIGFuYWx5dGljc0RlYnVnKCdXb3Jrc3BhY2UgQW5hbHl0aWNzIGNvbmZpZyBmb3VuZDogJWonLCBhbmFseXRpY3NDb25maWcpO1xuXG4gICAgaWYgKGFuYWx5dGljc0NvbmZpZyA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBuZXcgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MoKTtcbiAgICB9IGVsc2UgaWYgKGFuYWx5dGljc0NvbmZpZyA9PT0gdW5kZWZpbmVkIHx8IGFuYWx5dGljc0NvbmZpZyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHVpZDogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgICBpZiAodHlwZW9mIGFuYWx5dGljc0NvbmZpZyA9PSAnc3RyaW5nJykge1xuICAgICAgICB1aWQgPSBhbmFseXRpY3NDb25maWc7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhbmFseXRpY3NDb25maWcgPT0gJ29iamVjdCcgJiYgdHlwZW9mIGFuYWx5dGljc0NvbmZpZ1sndWlkJ10gPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdWlkID0gYW5hbHl0aWNzQ29uZmlnWyd1aWQnXTtcbiAgICAgIH1cblxuICAgICAgYW5hbHl0aWNzRGVidWcoJ2NsaWVudCBpZDogJWonLCB1aWQpO1xuICAgICAgaWYgKHVpZCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpRGVmYXVsdCwgdWlkKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGFuYWx5dGljc0RlYnVnKCdFcnJvciBoYXBwZW5lZCBkdXJpbmcgcmVhZGluZyBvZiBhbmFseXRpY3MgY29uZmlnOiAlcycsIGVyci5tZXNzYWdlKTtcblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIHVzYWdlIGFuYWx5dGljcyBzaGFyaW5nIHNldHRpbmcsIHdoaWNoIGlzIGVpdGhlciBhIHByb3BlcnR5IHN0cmluZyAoR0EtWFhYWFhYWC1YWCksXG4gKiBvciB1bmRlZmluZWQgaWYgbm8gc2hhcmluZy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFNoYXJlZEFuYWx5dGljcygpOiBQcm9taXNlPEFuYWx5dGljc0NvbGxlY3RvciB8IHVuZGVmaW5lZD4ge1xuICBhbmFseXRpY3NEZWJ1ZygnZ2V0U2hhcmVkQW5hbHl0aWNzJyk7XG5cbiAgaWYgKGFuYWx5dGljc1NoYXJlRGlzYWJsZWQpIHtcbiAgICBhbmFseXRpY3NEZWJ1ZygnTkdfQ0xJX0FOQUxZVElDUyBpcyBmYWxzZScpO1xuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIElmIGFueXRoaW5nIGhhcHBlbnMgd2UganVzdCBrZWVwIHRoZSBOT09QIGFuYWx5dGljcy5cbiAgdHJ5IHtcbiAgICBjb25zdCBnbG9iYWxXb3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIGNvbnN0IGFuYWx5dGljc0NvbmZpZyA9IGdsb2JhbFdvcmtzcGFjZT8uZ2V0Q2xpKClbJ2FuYWx5dGljc1NoYXJpbmcnXTtcblxuICAgIGlmICghYW5hbHl0aWNzQ29uZmlnIHx8ICFhbmFseXRpY3NDb25maWcudHJhY2tpbmcgfHwgIWFuYWx5dGljc0NvbmZpZy51dWlkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnQW5hbHl0aWNzIHNoYXJpbmcgaW5mbzogJWonLCBhbmFseXRpY3NDb25maWcpO1xuXG4gICAgICByZXR1cm4gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihhbmFseXRpY3NDb25maWcudHJhY2tpbmcsIGFuYWx5dGljc0NvbmZpZy51dWlkKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGFuYWx5dGljc0RlYnVnKCdFcnJvciBoYXBwZW5lZCBkdXJpbmcgcmVhZGluZyBvZiBhbmFseXRpY3Mgc2hhcmluZyBjb25maWc6ICVzJywgZXJyLm1lc3NhZ2UpO1xuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQW5hbHl0aWNzKFxuICB3b3Jrc3BhY2U6IGJvb2xlYW4sXG4gIHNraXBQcm9tcHQgPSBmYWxzZSxcbik6IFByb21pc2U8YW5hbHl0aWNzLkFuYWx5dGljcz4ge1xuICAvLyBHbG9iYWwgY29uZmlnIHRha2VzIHByZWNlZGVuY2Ugb3ZlciBsb2NhbCBjb25maWcgb25seSBmb3IgdGhlIGRpc2FibGVkIGNoZWNrLlxuICAvLyBJRTpcbiAgLy8gZ2xvYmFsOiBkaXNhYmxlZCAmIGxvY2FsOiBlbmFibGVkID0gZGlzYWJsZWRcbiAgLy8gZ2xvYmFsOiBpZDogMTIzICYgbG9jYWw6IGlkOiA0NTYgPSA0NTZcblxuICAvLyBjaGVjayBnbG9iYWxcbiAgY29uc3QgZ2xvYmFsQ29uZmlnID0gYXdhaXQgZ2V0QW5hbHl0aWNzKCdnbG9iYWwnKTtcbiAgaWYgKGdsb2JhbENvbmZpZyBpbnN0YW5jZW9mIGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzKSB7XG4gICAgcmV0dXJuIGdsb2JhbENvbmZpZztcbiAgfVxuXG4gIGxldCBjb25maWcgPSBnbG9iYWxDb25maWc7XG4gIC8vIE5vdCBkaXNhYmxlZCBnbG9iYWxseSwgY2hlY2sgbG9jYWxseSBvciBub3Qgc2V0IGdsb2JhbGx5IGFuZCBjb21tYW5kIGlzIHJ1biBvdXRzaWRlIG9mIHdvcmtzcGFjZSBleGFtcGxlOiBgbmcgbmV3YFxuICBpZiAod29ya3NwYWNlIHx8IGdsb2JhbENvbmZpZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgbGV2ZWwgPSB3b3Jrc3BhY2UgPyAnbG9jYWwnIDogJ2dsb2JhbCc7XG4gICAgbGV0IGxvY2FsT3JHbG9iYWxDb25maWcgPSBhd2FpdCBnZXRBbmFseXRpY3MobGV2ZWwpO1xuICAgIGlmIChsb2NhbE9yR2xvYmFsQ29uZmlnID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICghc2tpcFByb21wdCkge1xuICAgICAgICAvLyBjb25maWcgaXMgdW5zZXQsIHByb21wdCB1c2VyLlxuICAgICAgICAvLyBUT0RPOiBUaGlzIHNob3VsZCBob25vciB0aGUgYG5vLWludGVyYWN0aXZlYCBvcHRpb24uXG4gICAgICAgIC8vIEl0IGlzIGN1cnJlbnRseSBub3QgYW4gYG5nYCBvcHRpb24gYnV0IHJhdGhlciBvbmx5IGFuIG9wdGlvbiBmb3Igc3BlY2lmaWMgY29tbWFuZHMuXG4gICAgICAgIC8vIFRoZSBjb25jZXB0IG9mIGBuZ2Atd2lkZSBvcHRpb25zIGFyZSBuZWVkZWQgdG8gY2xlYW5seSBoYW5kbGUgdGhpcy5cbiAgICAgICAgYXdhaXQgcHJvbXB0QW5hbHl0aWNzKCF3b3Jrc3BhY2UgLyoqIGdsb2JhbCAqLyk7XG4gICAgICAgIGxvY2FsT3JHbG9iYWxDb25maWcgPSBhd2FpdCBnZXRBbmFseXRpY3MobGV2ZWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChsb2NhbE9yR2xvYmFsQ29uZmlnIGluc3RhbmNlb2YgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MpIHtcbiAgICAgIHJldHVybiBsb2NhbE9yR2xvYmFsQ29uZmlnO1xuICAgIH0gZWxzZSBpZiAobG9jYWxPckdsb2JhbENvbmZpZykge1xuICAgICAgLy8gRmF2b3IgbG9jYWwgc2V0dGluZ3Mgb3ZlciBnbG9iYWwgd2hlbiBkZWZpbmVkLlxuICAgICAgY29uZmlnID0gbG9jYWxPckdsb2JhbENvbmZpZztcbiAgICB9XG4gIH1cblxuICAvLyBHZXQgc2hhcmVkIGFuYWx5dGljc1xuICAvLyBUT0RPOiBldmFsdXRlIGlmIHRoaXMgc2hvdWxkIGJlIGNvbXBsZXRseSByZW1vdmVkLlxuICBjb25zdCBtYXliZVNoYXJlZEFuYWx5dGljcyA9IGF3YWl0IGdldFNoYXJlZEFuYWx5dGljcygpO1xuICBpZiAoY29uZmlnICYmIG1heWJlU2hhcmVkQW5hbHl0aWNzKSB7XG4gICAgcmV0dXJuIG5ldyBhbmFseXRpY3MuTXVsdGlBbmFseXRpY3MoW2NvbmZpZywgbWF5YmVTaGFyZWRBbmFseXRpY3NdKTtcbiAgfVxuXG4gIHJldHVybiBjb25maWcgPz8gbWF5YmVTaGFyZWRBbmFseXRpY3MgPz8gbmV3IGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzKCk7XG59XG5cbmZ1bmN0aW9uIGFuYWx5dGljc0NvbmZpZ1ZhbHVlVG9IdW1hbkZvcm1hdCh2YWx1ZTogdW5rbm93bik6ICdlbmFibGVkJyB8ICdkaXNhYmxlZCcgfCAnbm90IHNldCcge1xuICBpZiAodmFsdWUgPT09IGZhbHNlKSB7XG4gICAgcmV0dXJuICdkaXNhYmxlZCc7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB2YWx1ZSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiAnZW5hYmxlZCc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICdub3Qgc2V0JztcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QW5hbHl0aWNzSW5mb1N0cmluZygpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBbZ2xvYmFsV29ya3NwYWNlXSA9IGdldFdvcmtzcGFjZVJhdygnZ2xvYmFsJyk7XG4gIGNvbnN0IFtsb2NhbFdvcmtzcGFjZV0gPSBnZXRXb3Jrc3BhY2VSYXcoJ2xvY2FsJyk7XG4gIGNvbnN0IGdsb2JhbFNldHRpbmcgPSBnbG9iYWxXb3Jrc3BhY2U/LmdldChbJ2NsaScsICdhbmFseXRpY3MnXSk7XG4gIGNvbnN0IGxvY2FsU2V0dGluZyA9IGxvY2FsV29ya3NwYWNlPy5nZXQoWydjbGknLCAnYW5hbHl0aWNzJ10pO1xuXG4gIGNvbnN0IGFuYWx5dGljc0luc3RhbmNlID0gYXdhaXQgY3JlYXRlQW5hbHl0aWNzKFxuICAgICEhbG9jYWxXb3Jrc3BhY2UgLyoqIHdvcmtzcGFjZSAqLyxcbiAgICB0cnVlIC8qKiBza2lwUHJvbXB0ICovLFxuICApO1xuXG4gIHJldHVybiAoXG4gICAgdGFncy5zdHJpcEluZGVudHNgXG4gICAgR2xvYmFsIHNldHRpbmc6ICR7YW5hbHl0aWNzQ29uZmlnVmFsdWVUb0h1bWFuRm9ybWF0KGdsb2JhbFNldHRpbmcpfVxuICAgIExvY2FsIHNldHRpbmc6ICR7XG4gICAgICBsb2NhbFdvcmtzcGFjZVxuICAgICAgICA/IGFuYWx5dGljc0NvbmZpZ1ZhbHVlVG9IdW1hbkZvcm1hdChsb2NhbFNldHRpbmcpXG4gICAgICAgIDogJ05vIGxvY2FsIHdvcmtzcGFjZSBjb25maWd1cmF0aW9uIGZpbGUuJ1xuICAgIH1cbiAgICBFZmZlY3RpdmUgc3RhdHVzOiAke1xuICAgICAgYW5hbHl0aWNzSW5zdGFuY2UgaW5zdGFuY2VvZiBhbmFseXRpY3MuTm9vcEFuYWx5dGljcyA/ICdkaXNhYmxlZCcgOiAnZW5hYmxlZCdcbiAgICB9XG4gIGAgKyAnXFxuJ1xuICApO1xufVxuIl19