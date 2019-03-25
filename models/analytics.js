"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const core_1 = require("@angular-devkit/core");
const child_process = require("child_process");
const debug = require("debug");
const fs_1 = require("fs");
const inquirer = require("inquirer");
const os = require("os");
const ua = require("universal-analytics");
const uuid_1 = require("uuid");
const config_1 = require("../utilities/config");
const analyticsDebug = debug('ng:analytics'); // Generate analytics, including settings and users.
const analyticsLogDebug = debug('ng:analytics:log'); // Actual logs of events.
const BYTES_PER_MEGABYTES = 1024 * 1024;
/**
 * This is the ultimate safelist for checking if a package name is safe to report to analytics.
 */
exports.analyticsPackageSafelist = [
    /^@angular\//,
    /^@angular-devkit\//,
    /^@ngtools\//,
    '@schematics/angular',
    '@schematics/schematics',
    '@schematics/update',
];
function isPackageNameSafeForAnalytics(name) {
    return exports.analyticsPackageSafelist.some(pattern => {
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
* MAKE SURE TO KEEP THIS IN SYNC WITH THE TABLE AND CONTENT IN `/docs/design/analytics.md`.
* WE LIST THOSE DIMENSIONS (AND MORE).
*/
var AnalyticsDimensions;
(function (AnalyticsDimensions) {
    AnalyticsDimensions[AnalyticsDimensions["NgAddCollection"] = 6] = "NgAddCollection";
    AnalyticsDimensions[AnalyticsDimensions["NgBuildBuildEventLog"] = 7] = "NgBuildBuildEventLog";
})(AnalyticsDimensions = exports.AnalyticsDimensions || (exports.AnalyticsDimensions = {}));
/**
 * Attempt to get the Windows Language Code string.
 * @private
 */
function _getWindowsLanguageCode() {
    if (!os.platform().startsWith('win')) {
        return undefined;
    }
    try {
        // This is true on Windows XP, 7, 8 and 10 AFAIK. Would return empty string or fail if it
        // doesn't work.
        return child_process.execSync('wmic.exe os get locale').toString().trim();
    }
    catch (_) { }
    return undefined;
}
/**
 * Get a language code.
 * @private
 */
function _getLanguage() {
    // Note: Windows does not expose the configured language by default.
    return process.env.LANG // Default Unix env variable.
        || process.env.LC_CTYPE // For C libraries. Sometimes the above isn't set.
        || process.env.LANGSPEC // For Windows, sometimes this will be set (not always).
        || _getWindowsLanguageCode()
        || '??'; // ¯\_(ツ)_/¯
}
/**
 * Return the number of CPUs.
 * @private
 */
function _getCpuCount() {
    const cpus = os.cpus();
    // Return "(count)x(average speed)".
    return cpus.length;
}
/**
 * Get the first CPU's speed. It's very rare to have multiple CPUs of different speed (in most
 * non-ARM configurations anyway), so that's all we care about.
 * @private
 */
function _getCpuSpeed() {
    const cpus = os.cpus();
    return Math.floor(cpus[0].speed);
}
/**
 * Get the amount of memory, in megabytes.
 * @private
 */
function _getRamSize() {
    // Report in megabytes. Otherwise it's too much noise.
    return Math.floor(os.totalmem() / BYTES_PER_MEGABYTES);
}
/**
 * Get the Node name and version. This returns a string like "Node 10.11", or "io.js 3.5".
 * @private
 */
function _getNodeVersion() {
    // We use any here because p.release is a new Node construct in Node 10 (and our typings are the
    // minimal version of Node we support).
    const p = process; // tslint:disable-line:no-any
    const name = typeof p.release == 'object' && typeof p.release.name == 'string' && p.release.name
        || process.argv0;
    return name + ' ' + process.version;
}
/**
 * Get a numerical MAJOR.MINOR version of node. We report this as a metric.
 * @private
 */
function _getNumericNodeVersion() {
    const p = process.version;
    const m = p.match(/\d+\.\d+/);
    return m && m[0] && parseFloat(m[0]) || 0;
}
// These are just approximations of UA strings. We just try to fool Google Analytics to give us the
// data we want.
// See https://developers.whatismybrowser.com/useragents/
const osVersionMap = {
    darwin: {
        '1.3.1': '10_0_4',
        '1.4.1': '10_1_0',
        '5.1': '10_1_1',
        '5.2': '10_1_5',
        '6.0.1': '10_2',
        '6.8': '10_2_8',
        '7.0': '10_3_0',
        '7.9': '10_3_9',
        '8.0': '10_4_0',
        '8.11': '10_4_11',
        '9.0': '10_5_0',
        '9.8': '10_5_8',
        '10.0': '10_6_0',
        '10.8': '10_6_8',
    },
    win32: {
        '6.3.9600': 'Windows 8.1',
        '6.2.9200': 'Windows 8',
        '6.1.7601': 'Windows 7 SP1',
        '6.1.7600': 'Windows 7',
        '6.0.6002': 'Windows Vista SP2',
        '6.0.6000': 'Windows Vista',
        '5.1.2600': 'Windows XP',
    },
};
/**
 * Build a fake User Agent string for OSX. This gets sent to Analytics so it shows the proper OS,
 * versions and others.
 * @private
 */
function _buildUserAgentStringForOsx() {
    let v = osVersionMap.darwin[os.release()];
    if (!v) {
        // Remove 4 to tie Darwin version to OSX version, add other info.
        const x = parseFloat(os.release());
        if (x > 10) {
            v = `10_` + (x - 4).toString().replace('.', '_');
        }
    }
    const cpuModel = os.cpus()[0].model.match(/^[a-z]+/i);
    const cpu = cpuModel ? cpuModel[0] : os.cpus()[0].model;
    return `(Macintosh; ${cpu} Mac OS X ${v || os.release()})`;
}
/**
 * Build a fake User Agent string for Windows. This gets sent to Analytics so it shows the proper
 * OS, versions and others.
 * @private
 */
function _buildUserAgentStringForWindows() {
    return `(Windows NT ${os.release()})`;
}
/**
 * Build a fake User Agent string for Linux. This gets sent to Analytics so it shows the proper OS,
 * versions and others.
 * @private
 */
function _buildUserAgentStringForLinux() {
    return `(X11; Linux i686; ${os.release()}; ${os.cpus()[0].model})`;
}
/**
 * Build a fake User Agent string. This gets sent to Analytics so it shows the proper OS version.
 * @private
 */
function _buildUserAgentString() {
    switch (os.platform()) {
        case 'darwin':
            return _buildUserAgentStringForOsx();
        case 'win32':
            return _buildUserAgentStringForWindows();
        case 'linux':
            return _buildUserAgentStringForLinux();
        default:
            return os.platform() + ' ' + os.release();
    }
}
/**
 * Implementation of the Analytics interface for using `universal-analytics` package.
 */
class UniversalAnalytics {
    /**
     * @param trackingId The Google Analytics ID.
     * @param uid A User ID.
     */
    constructor(trackingId, uid) {
        this._dirty = false;
        this._ua = ua(trackingId, uid, {
            enableBatching: true,
            batchSize: 5,
        });
        // Add persistent params for appVersion.
        this._ua.set('ds', 'cli');
        this._ua.set('ua', _buildUserAgentString());
        this._ua.set('ul', _getLanguage());
        // @angular/cli with version.
        this._ua.set('an', require('../package.json').name);
        this._ua.set('av', require('../package.json').version);
        // We use the application ID for the Node version. This should be "node 10.10.0".
        // We also use a custom metrics, but
        this._ua.set('aid', _getNodeVersion());
        // We set custom metrics for values we care about.
        this._ua.set('cm1', _getCpuCount());
        this._ua.set('cm2', _getCpuSpeed());
        this._ua.set('cm3', _getRamSize());
        this._ua.set('cm4', _getNumericNodeVersion());
    }
    /**
     * Creates the dimension and metrics variables to pass to universal-analytics.
     * @private
     */
    _customVariables(options) {
        const additionals = {};
        (options.dimensions || []).forEach((v, i) => additionals['cd' + i] = v);
        (options.metrics || []).forEach((v, i) => additionals['cm' + i] = v);
        return additionals;
    }
    event(ec, ea, options = {}) {
        const vars = this._customVariables(options);
        analyticsLogDebug('event ec=%j, ea=%j, %j', ec, ea, vars);
        const { label: el, value: ev } = options;
        this._dirty = true;
        this._ua.event(Object.assign({ ec, ea, el, ev }, vars));
    }
    screenview(cd, an, options = {}) {
        const vars = this._customVariables(options);
        analyticsLogDebug('screenview cd=%j, an=%j, %j', cd, an, vars);
        const { appVersion: av, appId: aid, appInstallerId: aiid } = options;
        this._dirty = true;
        this._ua.screenview(Object.assign({ cd, an, av, aid, aiid }, vars));
    }
    pageview(dp, options = {}) {
        const vars = this._customVariables(options);
        analyticsLogDebug('pageview dp=%j, %j', dp, vars);
        const { hostname: dh, title: dt } = options;
        this._dirty = true;
        this._ua.pageview(Object.assign({ dp, dh, dt }, vars));
    }
    timing(utc, utv, utt, options = {}) {
        const vars = this._customVariables(options);
        analyticsLogDebug('timing utc=%j, utv=%j, utl=%j, %j', utc, utv, utt, vars);
        const { label: utl } = options;
        this._dirty = true;
        this._ua.timing(Object.assign({ utc, utv, utt, utl }, vars));
    }
    flush() {
        if (!this._dirty) {
            return Promise.resolve();
        }
        this._dirty = false;
        return new Promise(resolve => this._ua.send(resolve));
    }
}
exports.UniversalAnalytics = UniversalAnalytics;
/**
 * Set analytics settings. This does not work if the user is not inside a project.
 * @param level Which config to use. "global" for user-level, and "local" for project-level.
 * @param value Either a user ID, true to generate a new User ID, or false to disable analytics.
 */
function setAnalyticsConfig(level, value) {
    analyticsDebug('setting %s level analytics to: %s', level, value);
    const [config, configPath] = config_1.getWorkspaceRaw(level);
    if (!config || !configPath) {
        throw new Error(`Could not find ${level} workspace.`);
    }
    const configValue = config.value;
    const cli = configValue['cli'] || (configValue['cli'] = {});
    if (!core_1.json.isJsonObject(cli)) {
        throw new Error(`Invalid config found at ${configPath}. CLI should be an object.`);
    }
    if (value === true) {
        value = uuid_1.v4();
    }
    cli['analytics'] = value;
    const output = JSON.stringify(configValue, null, 2);
    fs_1.writeFileSync(configPath, output);
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
    if (force || (process.stdout.isTTY && process.stdin.isTTY)) {
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'analytics',
                message: core_1.tags.stripIndents `
          Would you like to share anonymous usage data with the Angular Team at Google under
          Google’s Privacy Policy at https://policies.google.com/privacy? For more details and
          how to change this setting, see http://angular.io/analytics.
        `,
                default: false,
            },
        ]);
        setAnalyticsConfig('global', answers.analytics);
        if (answers.analytics) {
            console.log('');
            console.log(core_1.tags.stripIndent `
        Thank you for sharing anonymous usage data. Would you change your mind, the following
        command will disable this feature entirely:

            ${core_1.terminal.yellow('ng analytics off')}
      `);
            console.log('');
        }
        return true;
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
    const [config, configPath] = config_1.getWorkspaceRaw('local');
    if (!config || !configPath) {
        throw new Error(`Could not find a local workspace. Are you in a project?`);
    }
    if (force || (process.stdout.isTTY && process.stdin.isTTY)) {
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'analytics',
                message: core_1.tags.stripIndents `
          Would you like to share anonymous usage data about this project with the Angular Team at
          Google under Google’s Privacy Policy at https://policies.google.com/privacy? For more
          details and how to change this setting, see http://angular.io/analytics.

        `,
                default: false,
            },
        ]);
        setAnalyticsConfig('local', answers.analytics);
        if (answers.analytics) {
            console.log('');
            console.log(core_1.tags.stripIndent `
        Thank you for sharing anonymous usage data. Would you change your mind, the following
        command will disable this feature entirely:

            ${core_1.terminal.yellow('ng analytics project off')}
      `);
            console.log('');
        }
        return true;
    }
    return false;
}
exports.promptProjectAnalytics = promptProjectAnalytics;
/**
 * Get the global analytics setting for the user. This returns a string for UID, false if the user
 * opted out of analytics, true if the user wants to stay anonymous (no client id), and undefined
 * if the user has not been prompted yet.
 *
 * If any problem happens, it is considered the user has been opting out of analytics.
 */
function getGlobalAnalytics() {
    analyticsDebug('getGlobalAnalytics');
    if ('NG_CLI_ANALYTICS' in process.env) {
        if (process.env['NG_CLI_ANALYTICS'] == 'false' || process.env['NG_CLI_ANALYTICS'] == '') {
            analyticsDebug('NG_CLI_ANALYTICS is false');
            return false;
        }
        if (process.env['NG_CLI_ANALYTICS'] === 'ci') {
            analyticsDebug('Running in CI mode');
            return 'ci';
        }
    }
    // If anything happens we just keep the NOOP analytics.
    try {
        const globalWorkspace = config_1.getWorkspace('global');
        const analyticsConfig = globalWorkspace
            && globalWorkspace.getCli()
            && globalWorkspace.getCli()['analytics'];
        if (analyticsConfig === false) {
            return false;
        }
        else if (analyticsConfig === undefined) {
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
            analyticsDebug('client id: %s', uid);
            return uid;
        }
    }
    catch (_a) {
        return false;
    }
}
exports.getGlobalAnalytics = getGlobalAnalytics;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvYW5hbHl0aWNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQXVFO0FBQ3ZFLCtDQUErQztBQUMvQywrQkFBK0I7QUFDL0IsMkJBQW1DO0FBQ25DLHFDQUFxQztBQUNyQyx5QkFBeUI7QUFDekIsMENBQTBDO0FBQzFDLCtCQUFvQztBQUNwQyxnREFBb0U7QUFFcEUsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUUsb0RBQW9EO0FBQ25HLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBRSx5QkFBeUI7QUFFL0UsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBRXhDOztHQUVHO0FBQ1UsUUFBQSx3QkFBd0IsR0FBRztJQUN0QyxhQUFhO0lBQ2Isb0JBQW9CO0lBQ3BCLGFBQWE7SUFDYixxQkFBcUI7SUFDckIsd0JBQXdCO0lBQ3hCLG9CQUFvQjtDQUNyQixDQUFDO0FBRUYsU0FBZ0IsNkJBQTZCLENBQUMsSUFBWTtJQUN4RCxPQUFPLGdDQUF3QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUM3QyxJQUFJLE9BQU8sT0FBTyxJQUFJLFFBQVEsRUFBRTtZQUM5QixPQUFPLE9BQU8sS0FBSyxJQUFJLENBQUM7U0FDekI7YUFBTTtZQUNMLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMzQjtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQVJELHNFQVFDO0FBRUM7OztFQUdDO0FBQ0gsSUFBWSxtQkFHWDtBQUhELFdBQVksbUJBQW1CO0lBQzdCLG1GQUFtQixDQUFBO0lBQ25CLDZGQUF3QixDQUFBO0FBQzFCLENBQUMsRUFIVyxtQkFBbUIsR0FBbkIs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a0IsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUM1QyxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUVyQyxPQUFPLElBQUksQ0FBQztTQUNiO0tBQ0Y7SUFFRCx1REFBdUQ7SUFDdkQsSUFBSTtRQUNGLE1BQU0sZUFBZSxHQUFHLHFCQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsTUFBTSxlQUFlLEdBQUcsZUFBZTtlQUNsQyxlQUFlLENBQUMsTUFBTSxFQUFFO2VBQ3hCLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUUzQyxJQUFJLGVBQWUsS0FBSyxLQUFLLEVBQUU7WUFDN0IsT0FBTyxLQUFLLENBQUM7U0FDZDthQUFNLElBQUksZUFBZSxLQUFLLFNBQVMsRUFBRTtZQUN4QyxPQUFPLFNBQVMsQ0FBQztTQUNsQjthQUFNO1lBQ0wsSUFBSSxHQUFHLEdBQXVCLFNBQVMsQ0FBQztZQUN4QyxJQUFJLE9BQU8sZUFBZSxJQUFJLFFBQVEsRUFBRTtnQkFDdEMsR0FBRyxHQUFHLGVBQWUsQ0FBQzthQUN2QjtpQkFBTSxJQUFJLE9BQU8sZUFBZSxJQUFJLFFBQVEsSUFBSSxPQUFPLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxRQUFRLEVBQUU7Z0JBQzFGLEdBQUcsR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDOUI7WUFFRCxjQUFjLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRXJDLE9BQU8sR0FBRyxDQUFDO1NBQ1o7S0FDRjtJQUFDLFdBQU07UUFDTixPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQztBQTFDRCxnREEwQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBhbmFseXRpY3MsIGpzb24sIHRhZ3MsIHRlcm1pbmFsIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcbmltcG9ydCB7IHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBpbnF1aXJlciBmcm9tICdpbnF1aXJlcic7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyB1YSBmcm9tICd1bml2ZXJzYWwtYW5hbHl0aWNzJztcbmltcG9ydCB7IHY0IGFzIHV1aWRWNCB9IGZyb20gJ3V1aWQnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCBnZXRXb3Jrc3BhY2VSYXcgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcblxuY29uc3QgYW5hbHl0aWNzRGVidWcgPSBkZWJ1Zygnbmc6YW5hbHl0aWNzJyk7ICAvLyBHZW5lcmF0ZSBhbmFseXRpY3MsIGluY2x1ZGluZyBzZXR0aW5ncyBhbmQgdXNlcnMuXG5jb25zdCBhbmFseXRpY3NMb2dEZWJ1ZyA9IGRlYnVnKCduZzphbmFseXRpY3M6bG9nJyk7ICAvLyBBY3R1YWwgbG9ncyBvZiBldmVudHMuXG5cbmNvbnN0IEJZVEVTX1BFUl9NRUdBQllURVMgPSAxMDI0ICogMTAyNDtcblxuLyoqXG4gKiBUaGlzIGlzIHRoZSB1bHRpbWF0ZSBzYWZlbGlzdCBmb3IgY2hlY2tpbmcgaWYgYSBwYWNrYWdlIG5hbWUgaXMgc2FmZSB0byByZXBvcnQgdG8gYW5hbHl0aWNzLlxuICovXG5leHBvcnQgY29uc3QgYW5hbHl0aWNzUGFja2FnZVNhZmVsaXN0ID0gW1xuICAvXkBhbmd1bGFyXFwvLyxcbiAgL15AYW5ndWxhci1kZXZraXRcXC8vLFxuICAvXkBuZ3Rvb2xzXFwvLyxcbiAgJ0BzY2hlbWF0aWNzL2FuZ3VsYXInLFxuICAnQHNjaGVtYXRpY3Mvc2NoZW1hdGljcycsXG4gICdAc2NoZW1hdGljcy91cGRhdGUnLFxuXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzKG5hbWU6IHN0cmluZykge1xuICByZXR1cm4gYW5hbHl0aWNzUGFja2FnZVNhZmVsaXN0LnNvbWUocGF0dGVybiA9PiB7XG4gICAgaWYgKHR5cGVvZiBwYXR0ZXJuID09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gcGF0dGVybiA9PT0gbmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHBhdHRlcm4udGVzdChuYW1lKTtcbiAgICB9XG4gIH0pO1xufVxuXG4gIC8qKlxuICogTUFLRSBTVVJFIFRPIEtFRVAgVEhJUyBJTiBTWU5DIFdJVEggVEhFIFRBQkxFIEFORCBDT05URU5UIElOIGAvZG9jcy9kZXNpZ24vYW5hbHl0aWNzLm1kYC5cbiAqIFdFIExJU1QgVEhPU0UgRElNRU5TSU9OUyAoQU5EIE1PUkUpLlxuICovXG5leHBvcnQgZW51bSBBbmFseXRpY3NEaW1lbnNpb25zIHtcbiAgTmdBZGRDb2xsZWN0aW9uID0gNixcbiAgTmdCdWlsZEJ1aWxkRXZlbnRMb2cgPSA3LFxufVxuXG5cbi8qKlxuICogQXR0ZW1wdCB0byBnZXQgdGhlIFdpbmRvd3MgTGFuZ3VhZ2UgQ29kZSBzdHJpbmcuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfZ2V0V2luZG93c0xhbmd1YWdlQ29kZSgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAoIW9zLnBsYXRmb3JtKCkuc3RhcnRzV2l0aCgnd2luJykpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgdHJ5IHtcbiAgICAvLyBUaGlzIGlzIHRydWUgb24gV2luZG93cyBYUCwgNywgOCBhbmQgMTAgQUZBSUsuIFdvdWxkIHJldHVybiBlbXB0eSBzdHJpbmcgb3IgZmFpbCBpZiBpdFxuICAgIC8vIGRvZXNuJ3Qgd29yay5cbiAgICByZXR1cm4gY2hpbGRfcHJvY2Vzcy5leGVjU3luYygnd21pYy5leGUgb3MgZ2V0IGxvY2FsZScpLnRvU3RyaW5nKCkudHJpbSgpO1xuICB9IGNhdGNoIChfKSB7fVxuXG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogR2V0IGEgbGFuZ3VhZ2UgY29kZS5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9nZXRMYW5ndWFnZSgpIHtcbiAgLy8gTm90ZTogV2luZG93cyBkb2VzIG5vdCBleHBvc2UgdGhlIGNvbmZpZ3VyZWQgbGFuZ3VhZ2UgYnkgZGVmYXVsdC5cbiAgcmV0dXJuIHByb2Nlc3MuZW52LkxBTkcgIC8vIERlZmF1bHQgVW5peCBlbnYgdmFyaWFibGUuXG4gICAgICB8fCBwcm9jZXNzLmVudi5MQ19DVFlQRSAgLy8gRm9yIEMgbGlicmFyaWVzLiBTb21ldGltZXMgdGhlIGFib3ZlIGlzbid0IHNldC5cbiAgICAgIHx8IHByb2Nlc3MuZW52LkxBTkdTUEVDICAvLyBGb3IgV2luZG93cywgc29tZXRpbWVzIHRoaXMgd2lsbCBiZSBzZXQgKG5vdCBhbHdheXMpLlxuICAgICAgfHwgX2dldFdpbmRvd3NMYW5ndWFnZUNvZGUoKVxuICAgICAgfHwgJz8/JzsgIC8vIMKvXFxfKOODhClfL8KvXG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBudW1iZXIgb2YgQ1BVcy5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9nZXRDcHVDb3VudCgpIHtcbiAgY29uc3QgY3B1cyA9IG9zLmNwdXMoKTtcblxuICAvLyBSZXR1cm4gXCIoY291bnQpeChhdmVyYWdlIHNwZWVkKVwiLlxuICByZXR1cm4gY3B1cy5sZW5ndGg7XG59XG5cbi8qKlxuICogR2V0IHRoZSBmaXJzdCBDUFUncyBzcGVlZC4gSXQncyB2ZXJ5IHJhcmUgdG8gaGF2ZSBtdWx0aXBsZSBDUFVzIG9mIGRpZmZlcmVudCBzcGVlZCAoaW4gbW9zdFxuICogbm9uLUFSTSBjb25maWd1cmF0aW9ucyBhbnl3YXkpLCBzbyB0aGF0J3MgYWxsIHdlIGNhcmUgYWJvdXQuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfZ2V0Q3B1U3BlZWQoKSB7XG4gIGNvbnN0IGNwdXMgPSBvcy5jcHVzKCk7XG5cbiAgcmV0dXJuIE1hdGguZmxvb3IoY3B1c1swXS5zcGVlZCk7XG59XG5cbi8qKlxuICogR2V0IHRoZSBhbW91bnQgb2YgbWVtb3J5LCBpbiBtZWdhYnl0ZXMuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfZ2V0UmFtU2l6ZSgpIHtcbiAgLy8gUmVwb3J0IGluIG1lZ2FieXRlcy4gT3RoZXJ3aXNlIGl0J3MgdG9vIG11Y2ggbm9pc2UuXG4gIHJldHVybiBNYXRoLmZsb29yKG9zLnRvdGFsbWVtKCkgLyBCWVRFU19QRVJfTUVHQUJZVEVTKTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIE5vZGUgbmFtZSBhbmQgdmVyc2lvbi4gVGhpcyByZXR1cm5zIGEgc3RyaW5nIGxpa2UgXCJOb2RlIDEwLjExXCIsIG9yIFwiaW8uanMgMy41XCIuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfZ2V0Tm9kZVZlcnNpb24oKSB7XG4gIC8vIFdlIHVzZSBhbnkgaGVyZSBiZWNhdXNlIHAucmVsZWFzZSBpcyBhIG5ldyBOb2RlIGNvbnN0cnVjdCBpbiBOb2RlIDEwIChhbmQgb3VyIHR5cGluZ3MgYXJlIHRoZVxuICAvLyBtaW5pbWFsIHZlcnNpb24gb2YgTm9kZSB3ZSBzdXBwb3J0KS5cbiAgY29uc3QgcCA9IHByb2Nlc3MgYXMgYW55OyAgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1hbnlcbiAgY29uc3QgbmFtZSA9IHR5cGVvZiBwLnJlbGVhc2UgPT0gJ29iamVjdCcgJiYgdHlwZW9mIHAucmVsZWFzZS5uYW1lID09ICdzdHJpbmcnICYmIHAucmVsZWFzZS5uYW1lXG4gICAgICAgICAgfHwgcHJvY2Vzcy5hcmd2MDtcblxuICByZXR1cm4gbmFtZSArICcgJyArIHByb2Nlc3MudmVyc2lvbjtcbn1cblxuLyoqXG4gKiBHZXQgYSBudW1lcmljYWwgTUFKT1IuTUlOT1IgdmVyc2lvbiBvZiBub2RlLiBXZSByZXBvcnQgdGhpcyBhcyBhIG1ldHJpYy5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9nZXROdW1lcmljTm9kZVZlcnNpb24oKSB7XG4gIGNvbnN0IHAgPSBwcm9jZXNzLnZlcnNpb247XG4gIGNvbnN0IG0gPSBwLm1hdGNoKC9cXGQrXFwuXFxkKy8pO1xuXG4gIHJldHVybiBtICYmIG1bMF0gJiYgcGFyc2VGbG9hdChtWzBdKSB8fCAwO1xufVxuXG5cbi8vIFRoZXNlIGFyZSBqdXN0IGFwcHJveGltYXRpb25zIG9mIFVBIHN0cmluZ3MuIFdlIGp1c3QgdHJ5IHRvIGZvb2wgR29vZ2xlIEFuYWx5dGljcyB0byBnaXZlIHVzIHRoZVxuLy8gZGF0YSB3ZSB3YW50LlxuLy8gU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy53aGF0aXNteWJyb3dzZXIuY29tL3VzZXJhZ2VudHMvXG5jb25zdCBvc1ZlcnNpb25NYXA6IHsgW29zOiBzdHJpbmddOiB7IFtyZWxlYXNlOiBzdHJpbmddOiBzdHJpbmcgfSB9ID0ge1xuICBkYXJ3aW46IHtcbiAgICAnMS4zLjEnOiAnMTBfMF80JyxcbiAgICAnMS40LjEnOiAnMTBfMV8wJyxcbiAgICAnNS4xJzogJzEwXzFfMScsXG4gICAgJzUuMic6ICcxMF8xXzUnLFxuICAgICc2LjAuMSc6ICcxMF8yJyxcbiAgICAnNi44JzogJzEwXzJfOCcsXG4gICAgJzcuMCc6ICcxMF8zXzAnLFxuICAgICc3LjknOiAnMTBfM185JyxcbiAgICAnOC4wJzogJzEwXzRfMCcsXG4gICAgJzguMTEnOiAnMTBfNF8xMScsXG4gICAgJzkuMCc6ICcxMF81XzAnLFxuICAgICc5LjgnOiAnMTBfNV84JyxcbiAgICAnMTAuMCc6ICcxMF82XzAnLFxuICAgICcxMC44JzogJzEwXzZfOCcsXG4gICAgLy8gV2Ugc3RvcCBoZXJlIGJlY2F1c2Ugd2UgdHJ5IHRvIG1hdGggb3V0IHRoZSB2ZXJzaW9uIGZvciBhbnl0aGluZyBncmVhdGVyIHRoYW4gMTAsIGFuZCBpdFxuICAgIC8vIHdvcmtzLiBUaG9zZSB2ZXJzaW9ucyBhcmUgc3RhbmRhcmRpemVkIHVzaW5nIGEgY2FsY3VsYXRpb24gbm93LlxuICB9LFxuICB3aW4zMjoge1xuICAgICc2LjMuOTYwMCc6ICdXaW5kb3dzIDguMScsXG4gICAgJzYuMi45MjAwJzogJ1dpbmRvd3MgOCcsXG4gICAgJzYuMS43NjAxJzogJ1dpbmRvd3MgNyBTUDEnLFxuICAgICc2LjEuNzYwMCc6ICdXaW5kb3dzIDcnLFxuICAgICc2LjAuNjAwMic6ICdXaW5kb3dzIFZpc3RhIFNQMicsXG4gICAgJzYuMC42MDAwJzogJ1dpbmRvd3MgVmlzdGEnLFxuICAgICc1LjEuMjYwMCc6ICdXaW5kb3dzIFhQJyxcbiAgfSxcbn07XG5cblxuLyoqXG4gKiBCdWlsZCBhIGZha2UgVXNlciBBZ2VudCBzdHJpbmcgZm9yIE9TWC4gVGhpcyBnZXRzIHNlbnQgdG8gQW5hbHl0aWNzIHNvIGl0IHNob3dzIHRoZSBwcm9wZXIgT1MsXG4gKiB2ZXJzaW9ucyBhbmQgb3RoZXJzLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2J1aWxkVXNlckFnZW50U3RyaW5nRm9yT3N4KCkge1xuICBsZXQgdiA9IG9zVmVyc2lvbk1hcC5kYXJ3aW5bb3MucmVsZWFzZSgpXTtcblxuICBpZiAoIXYpIHtcbiAgICAvLyBSZW1vdmUgNCB0byB0aWUgRGFyd2luIHZlcnNpb24gdG8gT1NYIHZlcnNpb24sIGFkZCBvdGhlciBpbmZvLlxuICAgIGNvbnN0IHggPSBwYXJzZUZsb2F0KG9zLnJlbGVhc2UoKSk7XG4gICAgaWYgKHggPiAxMCkge1xuICAgICAgdiA9IGAxMF9gICsgKHggLSA0KS50b1N0cmluZygpLnJlcGxhY2UoJy4nLCAnXycpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGNwdU1vZGVsID0gb3MuY3B1cygpWzBdLm1vZGVsLm1hdGNoKC9eW2Etel0rL2kpO1xuICBjb25zdCBjcHUgPSBjcHVNb2RlbCA/IGNwdU1vZGVsWzBdIDogb3MuY3B1cygpWzBdLm1vZGVsO1xuXG4gIHJldHVybiBgKE1hY2ludG9zaDsgJHtjcHV9IE1hYyBPUyBYICR7diB8fCBvcy5yZWxlYXNlKCl9KWA7XG59XG5cbi8qKlxuICogQnVpbGQgYSBmYWtlIFVzZXIgQWdlbnQgc3RyaW5nIGZvciBXaW5kb3dzLiBUaGlzIGdldHMgc2VudCB0byBBbmFseXRpY3Mgc28gaXQgc2hvd3MgdGhlIHByb3BlclxuICogT1MsIHZlcnNpb25zIGFuZCBvdGhlcnMuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfYnVpbGRVc2VyQWdlbnRTdHJpbmdGb3JXaW5kb3dzKCkge1xuICByZXR1cm4gYChXaW5kb3dzIE5UICR7b3MucmVsZWFzZSgpfSlgO1xufVxuXG4vKipcbiAqIEJ1aWxkIGEgZmFrZSBVc2VyIEFnZW50IHN0cmluZyBmb3IgTGludXguIFRoaXMgZ2V0cyBzZW50IHRvIEFuYWx5dGljcyBzbyBpdCBzaG93cyB0aGUgcHJvcGVyIE9TLFxuICogdmVyc2lvbnMgYW5kIG90aGVycy5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9idWlsZFVzZXJBZ2VudFN0cmluZ0ZvckxpbnV4KCkge1xuICByZXR1cm4gYChYMTE7IExpbnV4IGk2ODY7ICR7b3MucmVsZWFzZSgpfTsgJHtvcy5jcHVzKClbMF0ubW9kZWx9KWA7XG59XG5cbi8qKlxuICogQnVpbGQgYSBmYWtlIFVzZXIgQWdlbnQgc3RyaW5nLiBUaGlzIGdldHMgc2VudCB0byBBbmFseXRpY3Mgc28gaXQgc2hvd3MgdGhlIHByb3BlciBPUyB2ZXJzaW9uLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2J1aWxkVXNlckFnZW50U3RyaW5nKCkge1xuICBzd2l0Y2ggKG9zLnBsYXRmb3JtKCkpIHtcbiAgICBjYXNlICdkYXJ3aW4nOlxuICAgICAgcmV0dXJuIF9idWlsZFVzZXJBZ2VudFN0cmluZ0Zvck9zeCgpO1xuXG4gICAgY2FzZSAnd2luMzInOlxuICAgICAgcmV0dXJuIF9idWlsZFVzZXJBZ2VudFN0cmluZ0ZvcldpbmRvd3MoKTtcblxuICAgIGNhc2UgJ2xpbnV4JzpcbiAgICAgIHJldHVybiBfYnVpbGRVc2VyQWdlbnRTdHJpbmdGb3JMaW51eCgpO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBvcy5wbGF0Zm9ybSgpICsgJyAnICsgb3MucmVsZWFzZSgpO1xuICB9XG59XG5cblxuLyoqXG4gKiBJbXBsZW1lbnRhdGlvbiBvZiB0aGUgQW5hbHl0aWNzIGludGVyZmFjZSBmb3IgdXNpbmcgYHVuaXZlcnNhbC1hbmFseXRpY3NgIHBhY2thZ2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBVbml2ZXJzYWxBbmFseXRpY3MgaW1wbGVtZW50cyBhbmFseXRpY3MuQW5hbHl0aWNzIHtcbiAgcHJpdmF0ZSBfdWE6IHVhLlZpc2l0b3I7XG4gIHByaXZhdGUgX2RpcnR5ID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB0cmFja2luZ0lkIFRoZSBHb29nbGUgQW5hbHl0aWNzIElELlxuICAgKiBAcGFyYW0gdWlkIEEgVXNlciBJRC5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHRyYWNraW5nSWQ6IHN0cmluZywgdWlkOiBzdHJpbmcpIHtcbiAgICB0aGlzLl91YSA9IHVhKHRyYWNraW5nSWQsIHVpZCwge1xuICAgICAgZW5hYmxlQmF0Y2hpbmc6IHRydWUsXG4gICAgICBiYXRjaFNpemU6IDUsXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgcGVyc2lzdGVudCBwYXJhbXMgZm9yIGFwcFZlcnNpb24uXG4gICAgdGhpcy5fdWEuc2V0KCdkcycsICdjbGknKTtcbiAgICB0aGlzLl91YS5zZXQoJ3VhJywgX2J1aWxkVXNlckFnZW50U3RyaW5nKCkpO1xuICAgIHRoaXMuX3VhLnNldCgndWwnLCBfZ2V0TGFuZ3VhZ2UoKSk7XG5cbiAgICAvLyBAYW5ndWxhci9jbGkgd2l0aCB2ZXJzaW9uLlxuICAgIHRoaXMuX3VhLnNldCgnYW4nLCByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKS5uYW1lKTtcbiAgICB0aGlzLl91YS5zZXQoJ2F2JywgcmVxdWlyZSgnLi4vcGFja2FnZS5qc29uJykudmVyc2lvbik7XG5cbiAgICAvLyBXZSB1c2UgdGhlIGFwcGxpY2F0aW9uIElEIGZvciB0aGUgTm9kZSB2ZXJzaW9uLiBUaGlzIHNob3VsZCBiZSBcIm5vZGUgMTAuMTAuMFwiLlxuICAgIC8vIFdlIGFsc28gdXNlIGEgY3VzdG9tIG1ldHJpY3MsIGJ1dFxuICAgIHRoaXMuX3VhLnNldCgnYWlkJywgX2dldE5vZGVWZXJzaW9uKCkpO1xuXG4gICAgLy8gV2Ugc2V0IGN1c3RvbSBtZXRyaWNzIGZvciB2YWx1ZXMgd2UgY2FyZSBhYm91dC5cbiAgICB0aGlzLl91YS5zZXQoJ2NtMScsIF9nZXRDcHVDb3VudCgpKTtcbiAgICB0aGlzLl91YS5zZXQoJ2NtMicsIF9nZXRDcHVTcGVlZCgpKTtcbiAgICB0aGlzLl91YS5zZXQoJ2NtMycsIF9nZXRSYW1TaXplKCkpO1xuICAgIHRoaXMuX3VhLnNldCgnY200JywgX2dldE51bWVyaWNOb2RlVmVyc2lvbigpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIHRoZSBkaW1lbnNpb24gYW5kIG1ldHJpY3MgdmFyaWFibGVzIHRvIHBhc3MgdG8gdW5pdmVyc2FsLWFuYWx5dGljcy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIHByaXZhdGUgX2N1c3RvbVZhcmlhYmxlcyhvcHRpb25zOiBhbmFseXRpY3MuQ3VzdG9tRGltZW5zaW9uc0FuZE1ldHJpY3NPcHRpb25zKSB7XG4gICAgY29uc3QgYWRkaXRpb25hbHM6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB8IG51bWJlciB8IHN0cmluZyB9ID0ge307XG4gICAgKG9wdGlvbnMuZGltZW5zaW9ucyB8fCBbXSkuZm9yRWFjaCgodiwgaSkgPT4gYWRkaXRpb25hbHNbJ2NkJyArIGldID0gdik7XG4gICAgKG9wdGlvbnMubWV0cmljcyB8fCBbXSkuZm9yRWFjaCgodiwgaSkgPT4gYWRkaXRpb25hbHNbJ2NtJyArIGldID0gdik7XG5cbiAgICByZXR1cm4gYWRkaXRpb25hbHM7XG4gIH1cblxuICBldmVudChlYzogc3RyaW5nLCBlYTogc3RyaW5nLCBvcHRpb25zOiBhbmFseXRpY3MuRXZlbnRPcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB2YXJzID0gdGhpcy5fY3VzdG9tVmFyaWFibGVzKG9wdGlvbnMpO1xuICAgIGFuYWx5dGljc0xvZ0RlYnVnKCdldmVudCBlYz0laiwgZWE9JWosICVqJywgZWMsIGVhLCB2YXJzKTtcblxuICAgIGNvbnN0IHsgbGFiZWw6IGVsLCB2YWx1ZTogZXYgfSA9IG9wdGlvbnM7XG4gICAgdGhpcy5fZGlydHkgPSB0cnVlO1xuICAgIHRoaXMuX3VhLmV2ZW50KHsgZWMsIGVhLCBlbCwgZXYsIC4uLnZhcnMgfSk7XG4gIH1cbiAgc2NyZWVudmlldyhjZDogc3RyaW5nLCBhbjogc3RyaW5nLCBvcHRpb25zOiBhbmFseXRpY3MuU2NyZWVudmlld09wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHZhcnMgPSB0aGlzLl9jdXN0b21WYXJpYWJsZXMob3B0aW9ucyk7XG4gICAgYW5hbHl0aWNzTG9nRGVidWcoJ3NjcmVlbnZpZXcgY2Q9JWosIGFuPSVqLCAlaicsIGNkLCBhbiwgdmFycyk7XG5cbiAgICBjb25zdCB7IGFwcFZlcnNpb246IGF2LCBhcHBJZDogYWlkLCBhcHBJbnN0YWxsZXJJZDogYWlpZCB9ID0gb3B0aW9ucztcbiAgICB0aGlzLl9kaXJ0eSA9IHRydWU7XG4gICAgdGhpcy5fdWEuc2NyZWVudmlldyh7IGNkLCBhbiwgYXYsIGFpZCwgYWlpZCwgLi4udmFycyB9KTtcbiAgfVxuICBwYWdldmlldyhkcDogc3RyaW5nLCBvcHRpb25zOiBhbmFseXRpY3MuUGFnZXZpZXdPcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB2YXJzID0gdGhpcy5fY3VzdG9tVmFyaWFibGVzKG9wdGlvbnMpO1xuICAgIGFuYWx5dGljc0xvZ0RlYnVnKCdwYWdldmlldyBkcD0laiwgJWonLCBkcCwgdmFycyk7XG5cbiAgICBjb25zdCB7IGhvc3RuYW1lOiBkaCwgdGl0bGU6IGR0IH0gPSBvcHRpb25zO1xuICAgIHRoaXMuX2RpcnR5ID0gdHJ1ZTtcbiAgICB0aGlzLl91YS5wYWdldmlldyh7IGRwLCBkaCwgZHQsIC4uLnZhcnMgfSk7XG4gIH1cbiAgdGltaW5nKHV0Yzogc3RyaW5nLCB1dHY6IHN0cmluZywgdXR0OiBzdHJpbmcgfCBudW1iZXIsIG9wdGlvbnM6IGFuYWx5dGljcy5UaW1pbmdPcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB2YXJzID0gdGhpcy5fY3VzdG9tVmFyaWFibGVzKG9wdGlvbnMpO1xuICAgIGFuYWx5dGljc0xvZ0RlYnVnKCd0aW1pbmcgdXRjPSVqLCB1dHY9JWosIHV0bD0laiwgJWonLCB1dGMsIHV0diwgdXR0LCB2YXJzKTtcblxuICAgIGNvbnN0IHsgbGFiZWw6IHV0bCB9ID0gb3B0aW9ucztcbiAgICB0aGlzLl9kaXJ0eSA9IHRydWU7XG4gICAgdGhpcy5fdWEudGltaW5nKHsgdXRjLCB1dHYsIHV0dCwgdXRsLCAuLi52YXJzIH0pO1xuICB9XG5cbiAgZmx1c2goKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLl9kaXJ0eSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIHRoaXMuX2RpcnR5ID0gZmFsc2U7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB0aGlzLl91YS5zZW5kKHJlc29sdmUpKTtcbiAgfVxufVxuXG4vKipcbiAqIFNldCBhbmFseXRpY3Mgc2V0dGluZ3MuIFRoaXMgZG9lcyBub3Qgd29yayBpZiB0aGUgdXNlciBpcyBub3QgaW5zaWRlIGEgcHJvamVjdC5cbiAqIEBwYXJhbSBsZXZlbCBXaGljaCBjb25maWcgdG8gdXNlLiBcImdsb2JhbFwiIGZvciB1c2VyLWxldmVsLCBhbmQgXCJsb2NhbFwiIGZvciBwcm9qZWN0LWxldmVsLlxuICogQHBhcmFtIHZhbHVlIEVpdGhlciBhIHVzZXIgSUQsIHRydWUgdG8gZ2VuZXJhdGUgYSBuZXcgVXNlciBJRCwgb3IgZmFsc2UgdG8gZGlzYWJsZSBhbmFseXRpY3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRBbmFseXRpY3NDb25maWcobGV2ZWw6ICdnbG9iYWwnIHwgJ2xvY2FsJywgdmFsdWU6IHN0cmluZyB8IGJvb2xlYW4pIHtcbiAgYW5hbHl0aWNzRGVidWcoJ3NldHRpbmcgJXMgbGV2ZWwgYW5hbHl0aWNzIHRvOiAlcycsIGxldmVsLCB2YWx1ZSk7XG4gIGNvbnN0IFtjb25maWcsIGNvbmZpZ1BhdGhdID0gZ2V0V29ya3NwYWNlUmF3KGxldmVsKTtcbiAgaWYgKCFjb25maWcgfHwgIWNvbmZpZ1BhdGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kICR7bGV2ZWx9IHdvcmtzcGFjZS5gKTtcbiAgfVxuXG4gIGNvbnN0IGNvbmZpZ1ZhbHVlID0gY29uZmlnLnZhbHVlO1xuICBjb25zdCBjbGk6IGpzb24uSnNvblZhbHVlID0gY29uZmlnVmFsdWVbJ2NsaSddIHx8IChjb25maWdWYWx1ZVsnY2xpJ10gPSB7fSk7XG5cbiAgaWYgKCFqc29uLmlzSnNvbk9iamVjdChjbGkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZyBmb3VuZCBhdCAke2NvbmZpZ1BhdGh9LiBDTEkgc2hvdWxkIGJlIGFuIG9iamVjdC5gKTtcbiAgfVxuXG4gIGlmICh2YWx1ZSA9PT0gdHJ1ZSkge1xuICAgIHZhbHVlID0gdXVpZFY0KCk7XG4gIH1cbiAgY2xpWydhbmFseXRpY3MnXSA9IHZhbHVlO1xuXG4gIGNvbnN0IG91dHB1dCA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZ1ZhbHVlLCBudWxsLCAyKTtcbiAgd3JpdGVGaWxlU3luYyhjb25maWdQYXRoLCBvdXRwdXQpO1xuICBhbmFseXRpY3NEZWJ1ZygnZG9uZScpO1xufVxuXG4vKipcbiAqIFByb21wdCB0aGUgdXNlciBmb3IgdXNhZ2UgZ2F0aGVyaW5nIHBlcm1pc3Npb24uXG4gKiBAcGFyYW0gZm9yY2UgV2hldGhlciB0byBhc2sgcmVnYXJkbGVzcyBvZiB3aGV0aGVyIG9yIG5vdCB0aGUgdXNlciBpcyB1c2luZyBhbiBpbnRlcmFjdGl2ZSBzaGVsbC5cbiAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIHVzZXIgd2FzIHNob3duIGEgcHJvbXB0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJvbXB0R2xvYmFsQW5hbHl0aWNzKGZvcmNlID0gZmFsc2UpIHtcbiAgYW5hbHl0aWNzRGVidWcoJ3Byb21wdGluZyBnbG9iYWwgYW5hbHl0aWNzLicpO1xuICBpZiAoZm9yY2UgfHwgKHByb2Nlc3Muc3Rkb3V0LmlzVFRZICYmIHByb2Nlc3Muc3RkaW4uaXNUVFkpKSB7XG4gICAgY29uc3QgYW5zd2VycyA9IGF3YWl0IGlucXVpcmVyLnByb21wdDx7IGFuYWx5dGljczogYm9vbGVhbiB9PihbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjb25maXJtJyxcbiAgICAgICAgbmFtZTogJ2FuYWx5dGljcycsXG4gICAgICAgIG1lc3NhZ2U6IHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICAgIFdvdWxkIHlvdSBsaWtlIHRvIHNoYXJlIGFub255bW91cyB1c2FnZSBkYXRhIHdpdGggdGhlIEFuZ3VsYXIgVGVhbSBhdCBHb29nbGUgdW5kZXJcbiAgICAgICAgICBHb29nbGXigJlzIFByaXZhY3kgUG9saWN5IGF0IGh0dHBzOi8vcG9saWNpZXMuZ29vZ2xlLmNvbS9wcml2YWN5PyBGb3IgbW9yZSBkZXRhaWxzIGFuZFxuICAgICAgICAgIGhvdyB0byBjaGFuZ2UgdGhpcyBzZXR0aW5nLCBzZWUgaHR0cDovL2FuZ3VsYXIuaW8vYW5hbHl0aWNzLlxuICAgICAgICBgLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0sXG4gICAgXSk7XG5cbiAgICBzZXRBbmFseXRpY3NDb25maWcoJ2dsb2JhbCcsIGFuc3dlcnMuYW5hbHl0aWNzKTtcblxuICAgIGlmIChhbnN3ZXJzLmFuYWx5dGljcykge1xuICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgY29uc29sZS5sb2codGFncy5zdHJpcEluZGVudGBcbiAgICAgICAgVGhhbmsgeW91IGZvciBzaGFyaW5nIGFub255bW91cyB1c2FnZSBkYXRhLiBXb3VsZCB5b3UgY2hhbmdlIHlvdXIgbWluZCwgdGhlIGZvbGxvd2luZ1xuICAgICAgICBjb21tYW5kIHdpbGwgZGlzYWJsZSB0aGlzIGZlYXR1cmUgZW50aXJlbHk6XG5cbiAgICAgICAgICAgICR7dGVybWluYWwueWVsbG93KCduZyBhbmFseXRpY3Mgb2ZmJyl9XG4gICAgICBgKTtcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBQcm9tcHQgdGhlIHVzZXIgZm9yIHVzYWdlIGdhdGhlcmluZyBwZXJtaXNzaW9uIGZvciB0aGUgbG9jYWwgcHJvamVjdC4gRmFpbHMgaWYgdGhlcmUgaXMgbm9cbiAqIGxvY2FsIHdvcmtzcGFjZS5cbiAqIEBwYXJhbSBmb3JjZSBXaGV0aGVyIHRvIGFzayByZWdhcmRsZXNzIG9mIHdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIGlzIHVzaW5nIGFuIGludGVyYWN0aXZlIHNoZWxsLlxuICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgdXNlciB3YXMgc2hvd24gYSBwcm9tcHQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm9tcHRQcm9qZWN0QW5hbHl0aWNzKGZvcmNlID0gZmFsc2UpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ3Byb21wdGluZyB1c2VyJyk7XG4gIGNvbnN0IFtjb25maWcsIGNvbmZpZ1BhdGhdID0gZ2V0V29ya3NwYWNlUmF3KCdsb2NhbCcpO1xuICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnUGF0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgYSBsb2NhbCB3b3Jrc3BhY2UuIEFyZSB5b3UgaW4gYSBwcm9qZWN0P2ApO1xuICB9XG5cbiAgaWYgKGZvcmNlIHx8IChwcm9jZXNzLnN0ZG91dC5pc1RUWSAmJiBwcm9jZXNzLnN0ZGluLmlzVFRZKSkge1xuICAgIGNvbnN0IGFuc3dlcnMgPSBhd2FpdCBpbnF1aXJlci5wcm9tcHQ8eyBhbmFseXRpY3M6IGJvb2xlYW4gfT4oW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnY29uZmlybScsXG4gICAgICAgIG5hbWU6ICdhbmFseXRpY3MnLFxuICAgICAgICBtZXNzYWdlOiB0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBXb3VsZCB5b3UgbGlrZSB0byBzaGFyZSBhbm9ueW1vdXMgdXNhZ2UgZGF0YSBhYm91dCB0aGlzIHByb2plY3Qgd2l0aCB0aGUgQW5ndWxhciBUZWFtIGF0XG4gICAgICAgICAgR29vZ2xlIHVuZGVyIEdvb2dsZeKAmXMgUHJpdmFjeSBQb2xpY3kgYXQgaHR0cHM6Ly9wb2xpY2llcy5nb29nbGUuY29tL3ByaXZhY3k/IEZvciBtb3JlXG4gICAgICAgICAgZGV0YWlscyBhbmQgaG93IHRvIGNoYW5nZSB0aGlzIHNldHRpbmcsIHNlZSBodHRwOi8vYW5ndWxhci5pby9hbmFseXRpY3MuXG5cbiAgICAgICAgYCxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9LFxuICAgIF0pO1xuXG4gICAgc2V0QW5hbHl0aWNzQ29uZmlnKCdsb2NhbCcsIGFuc3dlcnMuYW5hbHl0aWNzKTtcblxuICAgIGlmIChhbnN3ZXJzLmFuYWx5dGljcykge1xuICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgY29uc29sZS5sb2codGFncy5zdHJpcEluZGVudGBcbiAgICAgICAgVGhhbmsgeW91IGZvciBzaGFyaW5nIGFub255bW91cyB1c2FnZSBkYXRhLiBXb3VsZCB5b3UgY2hhbmdlIHlvdXIgbWluZCwgdGhlIGZvbGxvd2luZ1xuICAgICAgICBjb21tYW5kIHdpbGwgZGlzYWJsZSB0aGlzIGZlYXR1cmUgZW50aXJlbHk6XG5cbiAgICAgICAgICAgICR7dGVybWluYWwueWVsbG93KCduZyBhbmFseXRpY3MgcHJvamVjdCBvZmYnKX1cbiAgICAgIGApO1xuICAgICAgY29uc29sZS5sb2coJycpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5cbi8qKlxuICogR2V0IHRoZSBnbG9iYWwgYW5hbHl0aWNzIHNldHRpbmcgZm9yIHRoZSB1c2VyLiBUaGlzIHJldHVybnMgYSBzdHJpbmcgZm9yIFVJRCwgZmFsc2UgaWYgdGhlIHVzZXJcbiAqIG9wdGVkIG91dCBvZiBhbmFseXRpY3MsIHRydWUgaWYgdGhlIHVzZXIgd2FudHMgdG8gc3RheSBhbm9ueW1vdXMgKG5vIGNsaWVudCBpZCksIGFuZCB1bmRlZmluZWRcbiAqIGlmIHRoZSB1c2VyIGhhcyBub3QgYmVlbiBwcm9tcHRlZCB5ZXQuXG4gKlxuICogSWYgYW55IHByb2JsZW0gaGFwcGVucywgaXQgaXMgY29uc2lkZXJlZCB0aGUgdXNlciBoYXMgYmVlbiBvcHRpbmcgb3V0IG9mIGFuYWx5dGljcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEdsb2JhbEFuYWx5dGljcygpOiBzdHJpbmcgfCBib29sZWFuIHwgdW5kZWZpbmVkIHtcbiAgYW5hbHl0aWNzRGVidWcoJ2dldEdsb2JhbEFuYWx5dGljcycpO1xuXG4gIGlmICgnTkdfQ0xJX0FOQUxZVElDUycgaW4gcHJvY2Vzcy5lbnYpIHtcbiAgICBpZiAocHJvY2Vzcy5lbnZbJ05HX0NMSV9BTkFMWVRJQ1MnXSA9PSAnZmFsc2UnIHx8IHByb2Nlc3MuZW52WydOR19DTElfQU5BTFlUSUNTJ10gPT0gJycpIHtcbiAgICAgIGFuYWx5dGljc0RlYnVnKCdOR19DTElfQU5BTFlUSUNTIGlzIGZhbHNlJyk7XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHByb2Nlc3MuZW52WydOR19DTElfQU5BTFlUSUNTJ10gPT09ICdjaScpIHtcbiAgICAgIGFuYWx5dGljc0RlYnVnKCdSdW5uaW5nIGluIENJIG1vZGUnKTtcblxuICAgICAgcmV0dXJuICdjaSc7XG4gICAgfVxuICB9XG5cbiAgLy8gSWYgYW55dGhpbmcgaGFwcGVucyB3ZSBqdXN0IGtlZXAgdGhlIE5PT1AgYW5hbHl0aWNzLlxuICB0cnkge1xuICAgIGNvbnN0IGdsb2JhbFdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgY29uc3QgYW5hbHl0aWNzQ29uZmlnID0gZ2xvYmFsV29ya3NwYWNlXG4gICAgICAmJiBnbG9iYWxXb3Jrc3BhY2UuZ2V0Q2xpKClcbiAgICAgICYmIGdsb2JhbFdvcmtzcGFjZS5nZXRDbGkoKVsnYW5hbHl0aWNzJ107XG5cbiAgICBpZiAoYW5hbHl0aWNzQ29uZmlnID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoYW5hbHl0aWNzQ29uZmlnID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB1aWQ6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgIGlmICh0eXBlb2YgYW5hbHl0aWNzQ29uZmlnID09ICdzdHJpbmcnKSB7XG4gICAgICAgIHVpZCA9IGFuYWx5dGljc0NvbmZpZztcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGFuYWx5dGljc0NvbmZpZyA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgYW5hbHl0aWNzQ29uZmlnWyd1aWQnXSA9PSAnc3RyaW5nJykge1xuICAgICAgICB1aWQgPSBhbmFseXRpY3NDb25maWdbJ3VpZCddO1xuICAgICAgfVxuXG4gICAgICBhbmFseXRpY3NEZWJ1ZygnY2xpZW50IGlkOiAlcycsIHVpZCk7XG5cbiAgICAgIHJldHVybiB1aWQ7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiJdfQ==