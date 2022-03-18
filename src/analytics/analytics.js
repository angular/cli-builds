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
const inquirer = __importStar(require("inquirer"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2FuYWx5dGljcy9hbmFseXRpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBNkQ7QUFDN0Qsa0RBQTBCO0FBQzFCLG1EQUFxQztBQUNyQywrQkFBb0M7QUFDcEMsOENBQTRDO0FBQzVDLGdEQUFvRTtBQUNwRSwwRUFBNkY7QUFDN0YsMENBQXlDO0FBQ3pDLGtEQUErQztBQUMvQywrREFBMkQ7QUFFM0QsK0JBQStCO0FBQy9CLE1BQU0sY0FBYyxHQUFHLElBQUEsZUFBSyxFQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsb0RBQW9EO0FBRWxHLElBQUksK0JBQXVDLENBQUM7QUFDL0IsUUFBQSxtQkFBbUIsR0FBRztJQUNqQyxjQUFjLEVBQUUsZUFBZTtJQUMvQixpQkFBaUIsRUFBRSxlQUFlO0lBQ2xDLElBQUksaUJBQWlCO1FBQ25CLElBQUksK0JBQStCLEVBQUU7WUFDbkMsT0FBTywrQkFBK0IsQ0FBQztTQUN4QztRQUVELE1BQU0sQ0FBQyxHQUFHLGlCQUFPLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLCtFQUErRTtRQUMvRSwrQkFBK0I7WUFDN0IsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxPQUFPO2dCQUN4QyxDQUFDLENBQUMsMkJBQW1CLENBQUMsY0FBYztnQkFDcEMsQ0FBQyxDQUFDLDJCQUFtQixDQUFDLGlCQUFpQixDQUFDO1FBRTVDLE9BQU8sK0JBQStCLENBQUM7SUFDekMsQ0FBQztDQUNGLENBQUM7QUFFRjs7R0FFRztBQUNVLFFBQUEsd0JBQXdCLEdBQUc7SUFDdEMsYUFBYTtJQUNiLG9CQUFvQjtJQUNwQixhQUFhO0lBQ2IscUJBQXFCO0NBQ3RCLENBQUM7QUFFRixTQUFnQiw2QkFBNkIsQ0FBQyxJQUFZO0lBQ3hELE9BQU8sZ0NBQXdCLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDL0MsSUFBSSxPQUFPLE9BQU8sSUFBSSxRQUFRLEVBQUU7WUFDOUIsT0FBTyxPQUFPLEtBQUssSUFBSSxDQUFDO1NBQ3pCO2FBQU07WUFDTCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDM0I7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFSRCxzRUFRQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FBQyxNQUFlLEVBQUUsS0FBdUI7SUFDekUsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUMxQyxjQUFjLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2xFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEdBQUcsSUFBQSx3QkFBZSxFQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3BELElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsS0FBSyxhQUFhLENBQUMsQ0FBQztLQUN2RDtJQUVELE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBRWhDLElBQUksR0FBRyxLQUFLLFNBQVMsSUFBSSxDQUFDLFdBQUksQ0FBQyxZQUFZLENBQUMsR0FBcUIsQ0FBQyxFQUFFO1FBQ2xFLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLFVBQVUsNEJBQTRCLENBQUMsQ0FBQztLQUNwRjtJQUVELElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtRQUNsQixLQUFLLEdBQUcsSUFBQSxTQUFNLEdBQUUsQ0FBQztLQUNsQjtJQUVELE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDM0MsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO0lBRWQsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3pCLENBQUM7QUF0QkQsZ0RBc0JDO0FBRUQ7Ozs7R0FJRztBQUNJLEtBQUssVUFBVSxlQUFlLENBQUMsTUFBZSxFQUFFLEtBQUssR0FBRyxLQUFLO0lBQ2xFLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2pDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDMUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsR0FBRyxJQUFBLHdCQUFlLEVBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEQsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixLQUFLLG1DQUFtQyxDQUFDLENBQUM7S0FDL0U7SUFFRCxJQUFJLEtBQUssSUFBSSxJQUFBLFdBQUssR0FBRSxFQUFFO1FBQ3BCLE1BQU0sT0FBTyxHQUFHLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBeUI7WUFDNUQ7Z0JBQ0UsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLE9BQU8sRUFBRSxXQUFJLENBQUMsWUFBWSxDQUFBOzs7OztTQUt6QjtnQkFDRCxPQUFPLEVBQUUsS0FBSzthQUNmO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsa0JBQWtCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUU5QyxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUU7WUFDckIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNoQixPQUFPLENBQUMsR0FBRyxDQUNULFdBQUksQ0FBQyxXQUFXLENBQUE7Ozs7Y0FJVixjQUFNLENBQUMsTUFBTSxDQUFDLHVCQUF1QixNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7T0FDeEUsQ0FDQSxDQUFDO1lBQ0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVoQiwwQ0FBMEM7WUFDMUMsTUFBTSxFQUFFLEdBQUcsSUFBSSx3Q0FBa0IsQ0FBQywyQkFBbUIsQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNsRixFQUFFLENBQUMsUUFBUSxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDeEMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7U0FDbEI7YUFBTTtZQUNMLDJFQUEyRTtZQUMzRSxNQUFNLEVBQUUsR0FBRyxJQUFJLHdDQUFrQixDQUFDLDJCQUFtQixDQUFDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ25GLEVBQUUsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUN6QyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUNsQjtRQUVELE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBRXJELE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFFRCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUF0REQsMENBc0RDO0FBRUQ7Ozs7Ozs7R0FPRztBQUNJLEtBQUssVUFBVSxZQUFZLENBQ2hDLEtBQXlCO0lBRXpCLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUUvQixJQUFJLHVDQUFpQixFQUFFO1FBQ3JCLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBRTVDLE9BQU8sSUFBSSxnQkFBUyxDQUFDLGFBQWEsRUFBRSxDQUFDO0tBQ3RDO0lBRUQsSUFBSTtRQUNGLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBQSxxQkFBWSxFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVDLE1BQU0sZUFBZSxHQUNuQixTQUFTLGFBQVQsU0FBUyx1QkFBVCxTQUFTLENBQUUsTUFBTSxHQUFHLFdBQVcsQ0FBQyxDQUFDO1FBQ25DLGNBQWMsQ0FBQyxzQ0FBc0MsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUV4RSxJQUFJLGVBQWUsS0FBSyxLQUFLLEVBQUU7WUFDN0IsT0FBTyxJQUFJLGdCQUFTLENBQUMsYUFBYSxFQUFFLENBQUM7U0FDdEM7YUFBTSxJQUFJLGVBQWUsS0FBSyxTQUFTLElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtZQUNwRSxPQUFPLFNBQVMsQ0FBQztTQUNsQjthQUFNO1lBQ0wsSUFBSSxHQUFHLEdBQXVCLFNBQVMsQ0FBQztZQUV4QyxJQUFJLE9BQU8sZUFBZSxJQUFJLFFBQVEsRUFBRTtnQkFDdEMsR0FBRyxHQUFHLGVBQWUsQ0FBQzthQUN2QjtpQkFBTSxJQUFJLE9BQU8sZUFBZSxJQUFJLFFBQVEsSUFBSSxPQUFPLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxRQUFRLEVBQUU7Z0JBQzFGLEdBQUcsR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDOUI7WUFFRCxjQUFjLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxJQUFJLFNBQVMsRUFBRTtnQkFDcEIsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFFRCxPQUFPLElBQUksd0NBQWtCLENBQUMsMkJBQW1CLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDM0U7S0FDRjtJQUFDLE9BQU8sR0FBRyxFQUFFO1FBQ1osY0FBYyxDQUFDLHVEQUF1RCxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVyRixPQUFPLFNBQVMsQ0FBQztLQUNsQjtBQUNILENBQUM7QUExQ0Qsb0NBMENDO0FBRUQ7OztHQUdHO0FBQ0ksS0FBSyxVQUFVLGtCQUFrQjtJQUN0QyxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUVyQyxJQUFJLDRDQUFzQixFQUFFO1FBQzFCLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBRTVDLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0lBRUQsdURBQXVEO0lBQ3ZELElBQUk7UUFDRixNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUEscUJBQVksRUFBQyxRQUFRLENBQUMsQ0FBQztRQUNyRCxNQUFNLGVBQWUsR0FBRyxlQUFlLGFBQWYsZUFBZSx1QkFBZixlQUFlLENBQUUsTUFBTSxHQUFHLGtCQUFrQixDQUFDLENBQUM7UUFFdEUsSUFBSSxDQUFDLGVBQWUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFO1lBQzFFLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO2FBQU07WUFDTCxjQUFjLENBQUMsNEJBQTRCLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFFOUQsT0FBTyxJQUFJLHdDQUFrQixDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQy9FO0tBQ0Y7SUFBQyxPQUFPLEdBQUcsRUFBRTtRQUNaLGNBQWMsQ0FBQywrREFBK0QsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFN0YsT0FBTyxTQUFTLENBQUM7S0FDbEI7QUFDSCxDQUFDO0FBMUJELGdEQTBCQztBQUVNLEtBQUssVUFBVSxlQUFlLENBQ25DLFNBQWtCLEVBQ2xCLFVBQVUsR0FBRyxLQUFLO0lBRWxCLGdGQUFnRjtJQUNoRixNQUFNO0lBQ04sK0NBQStDO0lBQy9DLHlDQUF5Qzs7SUFFekMsZUFBZTtJQUNmLE1BQU0sWUFBWSxHQUFHLE1BQU0sWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2xELElBQUksWUFBWSxZQUFZLGdCQUFTLENBQUMsYUFBYSxFQUFFO1FBQ25ELE9BQU8sWUFBWSxDQUFDO0tBQ3JCO0lBRUQsSUFBSSxNQUFNLEdBQUcsWUFBWSxDQUFDO0lBQzFCLHdDQUF3QztJQUN4QyxJQUFJLFNBQVMsRUFBRTtRQUNiLElBQUksV0FBVyxHQUFHLE1BQU0sWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlDLElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRTtZQUM3QixJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLG1DQUFtQztnQkFFbkMsdURBQXVEO2dCQUN2RCxzRkFBc0Y7Z0JBQ3RGLHNFQUFzRTtnQkFDdEUsTUFBTSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzdCLFdBQVcsR0FBRyxNQUFNLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUMzQztTQUNGO1FBRUQsSUFBSSxXQUFXLFlBQVksZ0JBQVMsQ0FBQyxhQUFhLEVBQUU7WUFDbEQsT0FBTyxXQUFXLENBQUM7U0FDcEI7YUFBTSxJQUFJLFdBQVcsRUFBRTtZQUN0QixpREFBaUQ7WUFDakQsTUFBTSxHQUFHLFdBQVcsQ0FBQztTQUN0QjtLQUNGO0lBRUQsdUJBQXVCO0lBQ3ZCLHFEQUFxRDtJQUNyRCxNQUFNLG9CQUFvQixHQUFHLE1BQU0sa0JBQWtCLEVBQUUsQ0FBQztJQUN4RCxJQUFJLE1BQU0sSUFBSSxvQkFBb0IsRUFBRTtRQUNsQyxPQUFPLElBQUksZ0JBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO0tBQ3JFO0lBRUQsT0FBTyxNQUFBLE1BQU0sYUFBTixNQUFNLGNBQU4sTUFBTSxHQUFJLG9CQUFvQixtQ0FBSSxJQUFJLGdCQUFTLENBQUMsYUFBYSxFQUFFLENBQUM7QUFDekUsQ0FBQztBQS9DRCwwQ0ErQ0M7QUFFRCxTQUFTLGlDQUFpQyxDQUFDLEtBQWM7SUFDdkQsSUFBSSxLQUFLLEtBQUssS0FBSyxFQUFFO1FBQ25CLE9BQU8sVUFBVSxDQUFDO0tBQ25CO1NBQU0sSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtRQUN0RCxPQUFPLFNBQVMsQ0FBQztLQUNsQjtTQUFNO1FBQ0wsT0FBTyxTQUFTLENBQUM7S0FDbEI7QUFDSCxDQUFDO0FBRU0sS0FBSyxVQUFVLHNCQUFzQjtJQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsSUFBQSx3QkFBZSxFQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BELE1BQU0sQ0FBQyxjQUFjLENBQUMsR0FBRyxJQUFBLHdCQUFlLEVBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEQsTUFBTSxhQUFhLEdBQUcsZUFBZSxhQUFmLGVBQWUsdUJBQWYsZUFBZSxDQUFFLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQ2pFLE1BQU0sWUFBWSxHQUFHLGNBQWMsYUFBZCxjQUFjLHVCQUFkLGNBQWMsQ0FBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUUvRCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sZUFBZSxDQUM3QyxDQUFDLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUNqQyxJQUFJLENBQUMsaUJBQWlCLENBQ3ZCLENBQUM7SUFFRixPQUFPLENBQ0wsV0FBSSxDQUFDLFlBQVksQ0FBQTtzQkFDQyxpQ0FBaUMsQ0FBQyxhQUFhLENBQUM7cUJBRWhFLGNBQWM7UUFDWixDQUFDLENBQUMsaUNBQWlDLENBQUMsWUFBWSxDQUFDO1FBQ2pELENBQUMsQ0FBQyx3Q0FDTjt3QkFFRSxpQkFBaUIsWUFBWSxnQkFBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUN0RTtHQUNELEdBQUcsSUFBSSxDQUNQLENBQUM7QUFDSixDQUFDO0FBeEJELHdEQXdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBhbmFseXRpY3MsIGpzb24sIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnO1xuaW1wb3J0ICogYXMgaW5xdWlyZXIgZnJvbSAnaW5xdWlyZXInO1xuaW1wb3J0IHsgdjQgYXMgdXVpZFY0IH0gZnJvbSAndXVpZCc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCBnZXRXb3Jrc3BhY2VSYXcgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IGFuYWx5dGljc0Rpc2FibGVkLCBhbmFseXRpY3NTaGFyZURpc2FibGVkIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2Vudmlyb25tZW50LW9wdGlvbnMnO1xuaW1wb3J0IHsgaXNUVFkgfSBmcm9tICcuLi91dGlsaXRpZXMvdHR5JztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi91dGlsaXRpZXMvdmVyc2lvbic7XG5pbXBvcnQgeyBBbmFseXRpY3NDb2xsZWN0b3IgfSBmcm9tICcuL2FuYWx5dGljcy1jb2xsZWN0b3InO1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5jb25zdCBhbmFseXRpY3NEZWJ1ZyA9IGRlYnVnKCduZzphbmFseXRpY3MnKTsgLy8gR2VuZXJhdGUgYW5hbHl0aWNzLCBpbmNsdWRpbmcgc2V0dGluZ3MgYW5kIHVzZXJzLlxuXG5sZXQgX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZTogc3RyaW5nO1xuZXhwb3J0IGNvbnN0IEFuYWx5dGljc1Byb3BlcnRpZXMgPSB7XG4gIEFuZ3VsYXJDbGlQcm9kOiAnVUEtODU5NDM0Ni0yOScsXG4gIEFuZ3VsYXJDbGlTdGFnaW5nOiAnVUEtODU5NDM0Ni0zMicsXG4gIGdldCBBbmd1bGFyQ2xpRGVmYXVsdCgpOiBzdHJpbmcge1xuICAgIGlmIChfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlKSB7XG4gICAgICByZXR1cm4gX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZTtcbiAgICB9XG5cbiAgICBjb25zdCB2ID0gVkVSU0lPTi5mdWxsO1xuICAgIC8vIFRoZSBsb2dpYyBpcyBpZiBpdCdzIGEgZnVsbCB2ZXJzaW9uIHRoZW4gd2Ugc2hvdWxkIHVzZSB0aGUgcHJvZCBHQSBwcm9wZXJ0eS5cbiAgICBfZGVmYXVsdEFuZ3VsYXJDbGlQcm9wZXJ0eUNhY2hlID1cbiAgICAgIC9eXFxkK1xcLlxcZCtcXC5cXGQrJC8udGVzdCh2KSAmJiB2ICE9PSAnMC4wLjAnXG4gICAgICAgID8gQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpUHJvZFxuICAgICAgICA6IEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaVN0YWdpbmc7XG5cbiAgICByZXR1cm4gX2RlZmF1bHRBbmd1bGFyQ2xpUHJvcGVydHlDYWNoZTtcbiAgfSxcbn07XG5cbi8qKlxuICogVGhpcyBpcyB0aGUgdWx0aW1hdGUgc2FmZWxpc3QgZm9yIGNoZWNraW5nIGlmIGEgcGFja2FnZSBuYW1lIGlzIHNhZmUgdG8gcmVwb3J0IHRvIGFuYWx5dGljcy5cbiAqL1xuZXhwb3J0IGNvbnN0IGFuYWx5dGljc1BhY2thZ2VTYWZlbGlzdCA9IFtcbiAgL15AYW5ndWxhclxcLy8sXG4gIC9eQGFuZ3VsYXItZGV2a2l0XFwvLyxcbiAgL15Abmd0b29sc1xcLy8sXG4gICdAc2NoZW1hdGljcy9hbmd1bGFyJyxcbl07XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGFuYWx5dGljc1BhY2thZ2VTYWZlbGlzdC5zb21lKChwYXR0ZXJuKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBwYXR0ZXJuID09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gcGF0dGVybiA9PT0gbmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHBhdHRlcm4udGVzdChuYW1lKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIFNldCBhbmFseXRpY3Mgc2V0dGluZ3MuIFRoaXMgZG9lcyBub3Qgd29yayBpZiB0aGUgdXNlciBpcyBub3QgaW5zaWRlIGEgcHJvamVjdC5cbiAqIEBwYXJhbSBnbG9iYWwgV2hpY2ggY29uZmlnIHRvIHVzZS4gXCJnbG9iYWxcIiBmb3IgdXNlci1sZXZlbCwgYW5kIFwibG9jYWxcIiBmb3IgcHJvamVjdC1sZXZlbC5cbiAqIEBwYXJhbSB2YWx1ZSBFaXRoZXIgYSB1c2VyIElELCB0cnVlIHRvIGdlbmVyYXRlIGEgbmV3IFVzZXIgSUQsIG9yIGZhbHNlIHRvIGRpc2FibGUgYW5hbHl0aWNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0QW5hbHl0aWNzQ29uZmlnKGdsb2JhbDogYm9vbGVhbiwgdmFsdWU6IHN0cmluZyB8IGJvb2xlYW4pOiB2b2lkIHtcbiAgY29uc3QgbGV2ZWwgPSBnbG9iYWwgPyAnZ2xvYmFsJyA6ICdsb2NhbCc7XG4gIGFuYWx5dGljc0RlYnVnKCdzZXR0aW5nICVzIGxldmVsIGFuYWx5dGljcyB0bzogJXMnLCBsZXZlbCwgdmFsdWUpO1xuICBjb25zdCBbY29uZmlnLCBjb25maWdQYXRoXSA9IGdldFdvcmtzcGFjZVJhdyhsZXZlbCk7XG4gIGlmICghY29uZmlnIHx8ICFjb25maWdQYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCAke2xldmVsfSB3b3Jrc3BhY2UuYCk7XG4gIH1cblxuICBjb25zdCBjbGkgPSBjb25maWcuZ2V0KFsnY2xpJ10pO1xuXG4gIGlmIChjbGkgIT09IHVuZGVmaW5lZCAmJiAhanNvbi5pc0pzb25PYmplY3QoY2xpIGFzIGpzb24uSnNvblZhbHVlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWcgZm91bmQgYXQgJHtjb25maWdQYXRofS4gQ0xJIHNob3VsZCBiZSBhbiBvYmplY3QuYCk7XG4gIH1cblxuICBpZiAodmFsdWUgPT09IHRydWUpIHtcbiAgICB2YWx1ZSA9IHV1aWRWNCgpO1xuICB9XG5cbiAgY29uZmlnLm1vZGlmeShbJ2NsaScsICdhbmFseXRpY3MnXSwgdmFsdWUpO1xuICBjb25maWcuc2F2ZSgpO1xuXG4gIGFuYWx5dGljc0RlYnVnKCdkb25lJyk7XG59XG5cbi8qKlxuICogUHJvbXB0IHRoZSB1c2VyIGZvciB1c2FnZSBnYXRoZXJpbmcgcGVybWlzc2lvbi5cbiAqIEBwYXJhbSBmb3JjZSBXaGV0aGVyIHRvIGFzayByZWdhcmRsZXNzIG9mIHdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIGlzIHVzaW5nIGFuIGludGVyYWN0aXZlIHNoZWxsLlxuICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgdXNlciB3YXMgc2hvd24gYSBwcm9tcHQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm9tcHRBbmFseXRpY3MoZ2xvYmFsOiBib29sZWFuLCBmb3JjZSA9IGZhbHNlKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGFuYWx5dGljc0RlYnVnKCdwcm9tcHRpbmcgdXNlcicpO1xuICBjb25zdCBsZXZlbCA9IGdsb2JhbCA/ICdnbG9iYWwnIDogJ2xvY2FsJztcbiAgY29uc3QgW2NvbmZpZywgY29uZmlnUGF0aF0gPSBnZXRXb3Jrc3BhY2VSYXcobGV2ZWwpO1xuICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnUGF0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgYSAke2xldmVsfSB3b3Jrc3BhY2UuIEFyZSB5b3UgaW4gYSBwcm9qZWN0P2ApO1xuICB9XG5cbiAgaWYgKGZvcmNlIHx8IGlzVFRZKCkpIHtcbiAgICBjb25zdCBhbnN3ZXJzID0gYXdhaXQgaW5xdWlyZXIucHJvbXB0PHsgYW5hbHl0aWNzOiBib29sZWFuIH0+KFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NvbmZpcm0nLFxuICAgICAgICBuYW1lOiAnYW5hbHl0aWNzJyxcbiAgICAgICAgbWVzc2FnZTogdGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgICAgV291bGQgeW91IGxpa2UgdG8gc2hhcmUgYW5vbnltb3VzIHVzYWdlIGRhdGEgYWJvdXQgdGhpcyBwcm9qZWN0IHdpdGggdGhlIEFuZ3VsYXIgVGVhbSBhdFxuICAgICAgICAgIEdvb2dsZSB1bmRlciBHb29nbGXigJlzIFByaXZhY3kgUG9saWN5IGF0IGh0dHBzOi8vcG9saWNpZXMuZ29vZ2xlLmNvbS9wcml2YWN5LiBGb3IgbW9yZVxuICAgICAgICAgIGRldGFpbHMgYW5kIGhvdyB0byBjaGFuZ2UgdGhpcyBzZXR0aW5nLCBzZWUgaHR0cHM6Ly9hbmd1bGFyLmlvL2FuYWx5dGljcy5cblxuICAgICAgICBgLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0sXG4gICAgXSk7XG5cbiAgICBzZXRBbmFseXRpY3NDb25maWcoZ2xvYmFsLCBhbnN3ZXJzLmFuYWx5dGljcyk7XG5cbiAgICBpZiAoYW5zd2Vycy5hbmFseXRpY3MpIHtcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICB0YWdzLnN0cmlwSW5kZW50YFxuICAgICAgICBUaGFuayB5b3UgZm9yIHNoYXJpbmcgYW5vbnltb3VzIHVzYWdlIGRhdGEuIFNob3VsZCB5b3UgY2hhbmdlIHlvdXIgbWluZCwgdGhlIGZvbGxvd2luZ1xuICAgICAgICBjb21tYW5kIHdpbGwgZGlzYWJsZSB0aGlzIGZlYXR1cmUgZW50aXJlbHk6XG5cbiAgICAgICAgICAgICR7Y29sb3JzLnllbGxvdyhgbmcgYW5hbHl0aWNzIGRpc2FibGUke2dsb2JhbCA/ICcgLS1nbG9iYWwnIDogJyd9YCl9XG4gICAgICBgLFxuICAgICAgKTtcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcblxuICAgICAgLy8gU2VuZCBiYWNrIGEgcGluZyB3aXRoIHRoZSB1c2VyIGBvcHRpbmAuXG4gICAgICBjb25zdCB1YSA9IG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoQW5hbHl0aWNzUHJvcGVydGllcy5Bbmd1bGFyQ2xpRGVmYXVsdCwgJ29wdGluJyk7XG4gICAgICB1YS5wYWdldmlldygnL3RlbGVtZXRyeS9wcm9qZWN0L29wdGluJyk7XG4gICAgICBhd2FpdCB1YS5mbHVzaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTZW5kIGJhY2sgYSBwaW5nIHdpdGggdGhlIHVzZXIgYG9wdG91dGAuIFRoaXMgaXMgdGhlIG9ubHkgdGhpbmcgd2Ugc2VuZC5cbiAgICAgIGNvbnN0IHVhID0gbmV3IEFuYWx5dGljc0NvbGxlY3RvcihBbmFseXRpY3NQcm9wZXJ0aWVzLkFuZ3VsYXJDbGlEZWZhdWx0LCAnb3B0b3V0Jyk7XG4gICAgICB1YS5wYWdldmlldygnL3RlbGVtZXRyeS9wcm9qZWN0L29wdG91dCcpO1xuICAgICAgYXdhaXQgdWEuZmx1c2goKTtcbiAgICB9XG5cbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShhd2FpdCBnZXRBbmFseXRpY3NJbmZvU3RyaW5nKCkpO1xuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogR2V0IHRoZSBhbmFseXRpY3Mgb2JqZWN0IGZvciB0aGUgdXNlci5cbiAqXG4gKiBAcmV0dXJuc1xuICogLSBgQW5hbHl0aWNzQ29sbGVjdG9yYCB3aGVuIGVuYWJsZWQuXG4gKiAtIGBhbmFseXRpY3MuTm9vcEFuYWx5dGljc2Agd2hlbiBkaXNhYmxlZC5cbiAqIC0gYHVuZGVmaW5lZGAgd2hlbiBub3QgY29uZmlndXJlZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFuYWx5dGljcyhcbiAgbGV2ZWw6ICdsb2NhbCcgfCAnZ2xvYmFsJyxcbik6IFByb21pc2U8QW5hbHl0aWNzQ29sbGVjdG9yIHwgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MgfCB1bmRlZmluZWQ+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ2dldEFuYWx5dGljcycpO1xuXG4gIGlmIChhbmFseXRpY3NEaXNhYmxlZCkge1xuICAgIGFuYWx5dGljc0RlYnVnKCdOR19DTElfQU5BTFlUSUNTIGlzIGZhbHNlJyk7XG5cbiAgICByZXR1cm4gbmV3IGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzKCk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZShsZXZlbCk7XG4gICAgY29uc3QgYW5hbHl0aWNzQ29uZmlnOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsIHwgeyB1aWQ/OiBzdHJpbmcgfSA9XG4gICAgICB3b3Jrc3BhY2U/LmdldENsaSgpWydhbmFseXRpY3MnXTtcbiAgICBhbmFseXRpY3NEZWJ1ZygnV29ya3NwYWNlIEFuYWx5dGljcyBjb25maWcgZm91bmQ6ICVqJywgYW5hbHl0aWNzQ29uZmlnKTtcblxuICAgIGlmIChhbmFseXRpY3NDb25maWcgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gbmV3IGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzKCk7XG4gICAgfSBlbHNlIGlmIChhbmFseXRpY3NDb25maWcgPT09IHVuZGVmaW5lZCB8fCBhbmFseXRpY3NDb25maWcgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB1aWQ6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAgICAgaWYgKHR5cGVvZiBhbmFseXRpY3NDb25maWcgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdWlkID0gYW5hbHl0aWNzQ29uZmlnO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYW5hbHl0aWNzQ29uZmlnID09ICdvYmplY3QnICYmIHR5cGVvZiBhbmFseXRpY3NDb25maWdbJ3VpZCddID09ICdzdHJpbmcnKSB7XG4gICAgICAgIHVpZCA9IGFuYWx5dGljc0NvbmZpZ1sndWlkJ107XG4gICAgICB9XG5cbiAgICAgIGFuYWx5dGljc0RlYnVnKCdjbGllbnQgaWQ6ICVqJywgdWlkKTtcbiAgICAgIGlmICh1aWQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKEFuYWx5dGljc1Byb3BlcnRpZXMuQW5ndWxhckNsaURlZmF1bHQsIHVpZCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBhbmFseXRpY3NEZWJ1ZygnRXJyb3IgaGFwcGVuZWQgZHVyaW5nIHJlYWRpbmcgb2YgYW5hbHl0aWNzIGNvbmZpZzogJXMnLCBlcnIubWVzc2FnZSk7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSB1c2FnZSBhbmFseXRpY3Mgc2hhcmluZyBzZXR0aW5nLCB3aGljaCBpcyBlaXRoZXIgYSBwcm9wZXJ0eSBzdHJpbmcgKEdBLVhYWFhYWFgtWFgpLFxuICogb3IgdW5kZWZpbmVkIGlmIG5vIHNoYXJpbmcuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRTaGFyZWRBbmFseXRpY3MoKTogUHJvbWlzZTxBbmFseXRpY3NDb2xsZWN0b3IgfCB1bmRlZmluZWQ+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ2dldFNoYXJlZEFuYWx5dGljcycpO1xuXG4gIGlmIChhbmFseXRpY3NTaGFyZURpc2FibGVkKSB7XG4gICAgYW5hbHl0aWNzRGVidWcoJ05HX0NMSV9BTkFMWVRJQ1MgaXMgZmFsc2UnKTtcblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBJZiBhbnl0aGluZyBoYXBwZW5zIHdlIGp1c3Qga2VlcCB0aGUgTk9PUCBhbmFseXRpY3MuXG4gIHRyeSB7XG4gICAgY29uc3QgZ2xvYmFsV29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcbiAgICBjb25zdCBhbmFseXRpY3NDb25maWcgPSBnbG9iYWxXb3Jrc3BhY2U/LmdldENsaSgpWydhbmFseXRpY3NTaGFyaW5nJ107XG5cbiAgICBpZiAoIWFuYWx5dGljc0NvbmZpZyB8fCAhYW5hbHl0aWNzQ29uZmlnLnRyYWNraW5nIHx8ICFhbmFseXRpY3NDb25maWcudXVpZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgYW5hbHl0aWNzRGVidWcoJ0FuYWx5dGljcyBzaGFyaW5nIGluZm86ICVqJywgYW5hbHl0aWNzQ29uZmlnKTtcblxuICAgICAgcmV0dXJuIG5ldyBBbmFseXRpY3NDb2xsZWN0b3IoYW5hbHl0aWNzQ29uZmlnLnRyYWNraW5nLCBhbmFseXRpY3NDb25maWcudXVpZCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBhbmFseXRpY3NEZWJ1ZygnRXJyb3IgaGFwcGVuZWQgZHVyaW5nIHJlYWRpbmcgb2YgYW5hbHl0aWNzIHNoYXJpbmcgY29uZmlnOiAlcycsIGVyci5tZXNzYWdlKTtcblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUFuYWx5dGljcyhcbiAgd29ya3NwYWNlOiBib29sZWFuLFxuICBza2lwUHJvbXB0ID0gZmFsc2UsXG4pOiBQcm9taXNlPGFuYWx5dGljcy5BbmFseXRpY3M+IHtcbiAgLy8gR2xvYmFsIGNvbmZpZyB0YWtlcyBwcmVjZWRlbmNlIG92ZXIgbG9jYWwgY29uZmlnIG9ubHkgZm9yIHRoZSBkaXNhYmxlZCBjaGVjay5cbiAgLy8gSUU6XG4gIC8vIGdsb2JhbDogZGlzYWJsZWQgJiBsb2NhbDogZW5hYmxlZCA9IGRpc2FibGVkXG4gIC8vIGdsb2JhbDogaWQ6IDEyMyAmIGxvY2FsOiBpZDogNDU2ID0gNDU2XG5cbiAgLy8gY2hlY2sgZ2xvYmFsXG4gIGNvbnN0IGdsb2JhbENvbmZpZyA9IGF3YWl0IGdldEFuYWx5dGljcygnZ2xvYmFsJyk7XG4gIGlmIChnbG9iYWxDb25maWcgaW5zdGFuY2VvZiBhbmFseXRpY3MuTm9vcEFuYWx5dGljcykge1xuICAgIHJldHVybiBnbG9iYWxDb25maWc7XG4gIH1cblxuICBsZXQgY29uZmlnID0gZ2xvYmFsQ29uZmlnO1xuICAvLyBOb3QgZGlzYWJsZWQgZ2xvYmFsbHksIGNoZWNrIGxvY2FsbHkuXG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICBsZXQgbG9jYWxDb25maWcgPSBhd2FpdCBnZXRBbmFseXRpY3MoJ2xvY2FsJyk7XG4gICAgaWYgKGxvY2FsQ29uZmlnID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICghc2tpcFByb21wdCkge1xuICAgICAgICAvLyBsb2NhbCBpcyBub3QgdW5zZXQsIHByb21wdCB1c2VyLlxuXG4gICAgICAgIC8vIFRPRE86IFRoaXMgc2hvdWxkIGhvbm9yIHRoZSBgbm8taW50ZXJhY3RpdmVgIG9wdGlvbi5cbiAgICAgICAgLy8gSXQgaXMgY3VycmVudGx5IG5vdCBhbiBgbmdgIG9wdGlvbiBidXQgcmF0aGVyIG9ubHkgYW4gb3B0aW9uIGZvciBzcGVjaWZpYyBjb21tYW5kcy5cbiAgICAgICAgLy8gVGhlIGNvbmNlcHQgb2YgYG5nYC13aWRlIG9wdGlvbnMgYXJlIG5lZWRlZCB0byBjbGVhbmx5IGhhbmRsZSB0aGlzLlxuICAgICAgICBhd2FpdCBwcm9tcHRBbmFseXRpY3MoZmFsc2UpO1xuICAgICAgICBsb2NhbENvbmZpZyA9IGF3YWl0IGdldEFuYWx5dGljcygnbG9jYWwnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobG9jYWxDb25maWcgaW5zdGFuY2VvZiBhbmFseXRpY3MuTm9vcEFuYWx5dGljcykge1xuICAgICAgcmV0dXJuIGxvY2FsQ29uZmlnO1xuICAgIH0gZWxzZSBpZiAobG9jYWxDb25maWcpIHtcbiAgICAgIC8vIEZhdm9yIGxvY2FsIHNldHRpbmdzIG92ZXIgZ2xvYmFsIHdoZW4gZGVmaW5lZC5cbiAgICAgIGNvbmZpZyA9IGxvY2FsQ29uZmlnO1xuICAgIH1cbiAgfVxuXG4gIC8vIEdldCBzaGFyZWQgYW5hbHl0aWNzXG4gIC8vIFRPRE86IGV2YWx1dGUgaWYgdGhpcyBzaG91bGQgYmUgY29tcGxldGx5IHJlbW92ZWQuXG4gIGNvbnN0IG1heWJlU2hhcmVkQW5hbHl0aWNzID0gYXdhaXQgZ2V0U2hhcmVkQW5hbHl0aWNzKCk7XG4gIGlmIChjb25maWcgJiYgbWF5YmVTaGFyZWRBbmFseXRpY3MpIHtcbiAgICByZXR1cm4gbmV3IGFuYWx5dGljcy5NdWx0aUFuYWx5dGljcyhbY29uZmlnLCBtYXliZVNoYXJlZEFuYWx5dGljc10pO1xuICB9XG5cbiAgcmV0dXJuIGNvbmZpZyA/PyBtYXliZVNoYXJlZEFuYWx5dGljcyA/PyBuZXcgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MoKTtcbn1cblxuZnVuY3Rpb24gYW5hbHl0aWNzQ29uZmlnVmFsdWVUb0h1bWFuRm9ybWF0KHZhbHVlOiB1bmtub3duKTogJ2VuYWJsZWQnIHwgJ2Rpc2FibGVkJyB8ICdub3Qgc2V0JyB7XG4gIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHtcbiAgICByZXR1cm4gJ2Rpc2FibGVkJztcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IHZhbHVlID09PSB0cnVlKSB7XG4gICAgcmV0dXJuICdlbmFibGVkJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJ25vdCBzZXQnO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRBbmFseXRpY3NJbmZvU3RyaW5nKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IFtnbG9iYWxXb3Jrc3BhY2VdID0gZ2V0V29ya3NwYWNlUmF3KCdnbG9iYWwnKTtcbiAgY29uc3QgW2xvY2FsV29ya3NwYWNlXSA9IGdldFdvcmtzcGFjZVJhdygnbG9jYWwnKTtcbiAgY29uc3QgZ2xvYmFsU2V0dGluZyA9IGdsb2JhbFdvcmtzcGFjZT8uZ2V0KFsnY2xpJywgJ2FuYWx5dGljcyddKTtcbiAgY29uc3QgbG9jYWxTZXR0aW5nID0gbG9jYWxXb3Jrc3BhY2U/LmdldChbJ2NsaScsICdhbmFseXRpY3MnXSk7XG5cbiAgY29uc3QgYW5hbHl0aWNzSW5zdGFuY2UgPSBhd2FpdCBjcmVhdGVBbmFseXRpY3MoXG4gICAgISFsb2NhbFdvcmtzcGFjZSAvKiogd29ya3NwYWNlICovLFxuICAgIHRydWUgLyoqIHNraXBQcm9tcHQgKi8sXG4gICk7XG5cbiAgcmV0dXJuIChcbiAgICB0YWdzLnN0cmlwSW5kZW50c2BcbiAgICBHbG9iYWwgc2V0dGluZzogJHthbmFseXRpY3NDb25maWdWYWx1ZVRvSHVtYW5Gb3JtYXQoZ2xvYmFsU2V0dGluZyl9XG4gICAgTG9jYWwgc2V0dGluZzogJHtcbiAgICAgIGxvY2FsV29ya3NwYWNlXG4gICAgICAgID8gYW5hbHl0aWNzQ29uZmlnVmFsdWVUb0h1bWFuRm9ybWF0KGxvY2FsU2V0dGluZylcbiAgICAgICAgOiAnTm8gbG9jYWwgd29ya3NwYWNlIGNvbmZpZ3VyYXRpb24gZmlsZS4nXG4gICAgfVxuICAgIEVmZmVjdGl2ZSBzdGF0dXM6ICR7XG4gICAgICBhbmFseXRpY3NJbnN0YW5jZSBpbnN0YW5jZW9mIGFuYWx5dGljcy5Ob29wQW5hbHl0aWNzID8gJ2Rpc2FibGVkJyA6ICdlbmFibGVkJ1xuICAgIH1cbiAgYCArICdcXG4nXG4gICk7XG59XG4iXX0=