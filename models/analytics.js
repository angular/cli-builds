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
        analyticsDebug('Client Analytics config found: %j', analyticsConfig);
        if (analyticsConfig === false) {
            return false;
        }
        else if (analyticsConfig === undefined || analyticsConfig === null) {
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
            analyticsDebug('client id: %s', uid);
            return uid;
        }
    }
    catch (err) {
        analyticsDebug('Error happened during reading of analytics config: %s', err.message);
        return false;
    }
}
exports.getGlobalAnalytics = getGlobalAnalytics;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvYW5hbHl0aWNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQXVFO0FBQ3ZFLCtDQUErQztBQUMvQywrQkFBK0I7QUFDL0IsMkJBQW1DO0FBQ25DLHFDQUFxQztBQUNyQyx5QkFBeUI7QUFDekIsMENBQTBDO0FBQzFDLCtCQUFvQztBQUNwQyxnREFBb0U7QUFFcEUsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUUsb0RBQW9EO0FBQ25HLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBRSx5QkFBeUI7QUFFL0UsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBRXhDOztHQUVHO0FBQ1UsUUFBQSx3QkFBd0IsR0FBRztJQUN0QyxhQUFhO0lBQ2Isb0JBQW9CO0lBQ3BCLGFBQWE7SUFDYixxQkFBcUI7SUFDckIsd0JBQXdCO0lBQ3hCLG9CQUFvQjtDQUNyQixDQUFDO0FBRUYsU0FBZ0IsNkJBQTZCLENBQUMsSUFBWTtJQUN4RCxPQUFPLGdDQUF3QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUM3QyxJQUFJLE9BQU8sT0FBTyxJQUFJLFFBQVEsRUFBRTtZQUM5QixPQUFPLE9BQU8sS0FBSyxJQUFJLENBQUM7U0FDekI7YUFBTTtZQUNMLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMzQjtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQVJELHNFQVFDO0FBRUM7OztFQUdDO0FBQ0gsSUFBWSxtQkFHWDtBQUhELFdBQVksbUJBQW1CO0lBQzdCLG1GQUFtQixDQUFBO0lBQ25CLDZGQUF3QixDQUFBO0FBQzFCLENBQUMsRUFIVyxtQkFBbUIsR0FBbkIs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QUM7S0FDZDtBQUNILENBQUM7QUFoREQsZ0RBZ0RDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgYW5hbHl0aWNzLCBqc29uLCB0YWdzLCB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5pbXBvcnQgeyB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgaW5xdWlyZXIgZnJvbSAnaW5xdWlyZXInO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgdWEgZnJvbSAndW5pdmVyc2FsLWFuYWx5dGljcyc7XG5pbXBvcnQgeyB2NCBhcyB1dWlkVjQgfSBmcm9tICd1dWlkJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgZ2V0V29ya3NwYWNlUmF3IH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5cbmNvbnN0IGFuYWx5dGljc0RlYnVnID0gZGVidWcoJ25nOmFuYWx5dGljcycpOyAgLy8gR2VuZXJhdGUgYW5hbHl0aWNzLCBpbmNsdWRpbmcgc2V0dGluZ3MgYW5kIHVzZXJzLlxuY29uc3QgYW5hbHl0aWNzTG9nRGVidWcgPSBkZWJ1Zygnbmc6YW5hbHl0aWNzOmxvZycpOyAgLy8gQWN0dWFsIGxvZ3Mgb2YgZXZlbnRzLlxuXG5jb25zdCBCWVRFU19QRVJfTUVHQUJZVEVTID0gMTAyNCAqIDEwMjQ7XG5cbi8qKlxuICogVGhpcyBpcyB0aGUgdWx0aW1hdGUgc2FmZWxpc3QgZm9yIGNoZWNraW5nIGlmIGEgcGFja2FnZSBuYW1lIGlzIHNhZmUgdG8gcmVwb3J0IHRvIGFuYWx5dGljcy5cbiAqL1xuZXhwb3J0IGNvbnN0IGFuYWx5dGljc1BhY2thZ2VTYWZlbGlzdCA9IFtcbiAgL15AYW5ndWxhclxcLy8sXG4gIC9eQGFuZ3VsYXItZGV2a2l0XFwvLyxcbiAgL15Abmd0b29sc1xcLy8sXG4gICdAc2NoZW1hdGljcy9hbmd1bGFyJyxcbiAgJ0BzY2hlbWF0aWNzL3NjaGVtYXRpY3MnLFxuICAnQHNjaGVtYXRpY3MvdXBkYXRlJyxcbl07XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyhuYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuIGFuYWx5dGljc1BhY2thZ2VTYWZlbGlzdC5zb21lKHBhdHRlcm4gPT4ge1xuICAgIGlmICh0eXBlb2YgcGF0dGVybiA9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIHBhdHRlcm4gPT09IG5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBwYXR0ZXJuLnRlc3QobmFtZSk7XG4gICAgfVxuICB9KTtcbn1cblxuICAvKipcbiAqIE1BS0UgU1VSRSBUTyBLRUVQIFRISVMgSU4gU1lOQyBXSVRIIFRIRSBUQUJMRSBBTkQgQ09OVEVOVCBJTiBgL2RvY3MvZGVzaWduL2FuYWx5dGljcy5tZGAuXG4gKiBXRSBMSVNUIFRIT1NFIERJTUVOU0lPTlMgKEFORCBNT1JFKS5cbiAqL1xuZXhwb3J0IGVudW0gQW5hbHl0aWNzRGltZW5zaW9ucyB7XG4gIE5nQWRkQ29sbGVjdGlvbiA9IDYsXG4gIE5nQnVpbGRCdWlsZEV2ZW50TG9nID0gNyxcbn1cblxuXG4vKipcbiAqIEF0dGVtcHQgdG8gZ2V0IHRoZSBXaW5kb3dzIExhbmd1YWdlIENvZGUgc3RyaW5nLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2dldFdpbmRvd3NMYW5ndWFnZUNvZGUoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKCFvcy5wbGF0Zm9ybSgpLnN0YXJ0c1dpdGgoJ3dpbicpKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHRyeSB7XG4gICAgLy8gVGhpcyBpcyB0cnVlIG9uIFdpbmRvd3MgWFAsIDcsIDggYW5kIDEwIEFGQUlLLiBXb3VsZCByZXR1cm4gZW1wdHkgc3RyaW5nIG9yIGZhaWwgaWYgaXRcbiAgICAvLyBkb2Vzbid0IHdvcmsuXG4gICAgcmV0dXJuIGNoaWxkX3Byb2Nlc3MuZXhlY1N5bmMoJ3dtaWMuZXhlIG9zIGdldCBsb2NhbGUnKS50b1N0cmluZygpLnRyaW0oKTtcbiAgfSBjYXRjaCAoXykge31cblxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEdldCBhIGxhbmd1YWdlIGNvZGUuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfZ2V0TGFuZ3VhZ2UoKSB7XG4gIC8vIE5vdGU6IFdpbmRvd3MgZG9lcyBub3QgZXhwb3NlIHRoZSBjb25maWd1cmVkIGxhbmd1YWdlIGJ5IGRlZmF1bHQuXG4gIHJldHVybiBwcm9jZXNzLmVudi5MQU5HICAvLyBEZWZhdWx0IFVuaXggZW52IHZhcmlhYmxlLlxuICAgICAgfHwgcHJvY2Vzcy5lbnYuTENfQ1RZUEUgIC8vIEZvciBDIGxpYnJhcmllcy4gU29tZXRpbWVzIHRoZSBhYm92ZSBpc24ndCBzZXQuXG4gICAgICB8fCBwcm9jZXNzLmVudi5MQU5HU1BFQyAgLy8gRm9yIFdpbmRvd3MsIHNvbWV0aW1lcyB0aGlzIHdpbGwgYmUgc2V0IChub3QgYWx3YXlzKS5cbiAgICAgIHx8IF9nZXRXaW5kb3dzTGFuZ3VhZ2VDb2RlKClcbiAgICAgIHx8ICc/Pyc7ICAvLyDCr1xcXyjjg4QpXy/Cr1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgbnVtYmVyIG9mIENQVXMuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfZ2V0Q3B1Q291bnQoKSB7XG4gIGNvbnN0IGNwdXMgPSBvcy5jcHVzKCk7XG5cbiAgLy8gUmV0dXJuIFwiKGNvdW50KXgoYXZlcmFnZSBzcGVlZClcIi5cbiAgcmV0dXJuIGNwdXMubGVuZ3RoO1xufVxuXG4vKipcbiAqIEdldCB0aGUgZmlyc3QgQ1BVJ3Mgc3BlZWQuIEl0J3MgdmVyeSByYXJlIHRvIGhhdmUgbXVsdGlwbGUgQ1BVcyBvZiBkaWZmZXJlbnQgc3BlZWQgKGluIG1vc3RcbiAqIG5vbi1BUk0gY29uZmlndXJhdGlvbnMgYW55d2F5KSwgc28gdGhhdCdzIGFsbCB3ZSBjYXJlIGFib3V0LlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2dldENwdVNwZWVkKCkge1xuICBjb25zdCBjcHVzID0gb3MuY3B1cygpO1xuXG4gIHJldHVybiBNYXRoLmZsb29yKGNwdXNbMF0uc3BlZWQpO1xufVxuXG4vKipcbiAqIEdldCB0aGUgYW1vdW50IG9mIG1lbW9yeSwgaW4gbWVnYWJ5dGVzLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2dldFJhbVNpemUoKSB7XG4gIC8vIFJlcG9ydCBpbiBtZWdhYnl0ZXMuIE90aGVyd2lzZSBpdCdzIHRvbyBtdWNoIG5vaXNlLlxuICByZXR1cm4gTWF0aC5mbG9vcihvcy50b3RhbG1lbSgpIC8gQllURVNfUEVSX01FR0FCWVRFUyk7XG59XG5cbi8qKlxuICogR2V0IHRoZSBOb2RlIG5hbWUgYW5kIHZlcnNpb24uIFRoaXMgcmV0dXJucyBhIHN0cmluZyBsaWtlIFwiTm9kZSAxMC4xMVwiLCBvciBcImlvLmpzIDMuNVwiLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2dldE5vZGVWZXJzaW9uKCkge1xuICAvLyBXZSB1c2UgYW55IGhlcmUgYmVjYXVzZSBwLnJlbGVhc2UgaXMgYSBuZXcgTm9kZSBjb25zdHJ1Y3QgaW4gTm9kZSAxMCAoYW5kIG91ciB0eXBpbmdzIGFyZSB0aGVcbiAgLy8gbWluaW1hbCB2ZXJzaW9uIG9mIE5vZGUgd2Ugc3VwcG9ydCkuXG4gIGNvbnN0IHAgPSBwcm9jZXNzIGFzIGFueTsgIC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8tYW55XG4gIGNvbnN0IG5hbWUgPSB0eXBlb2YgcC5yZWxlYXNlID09ICdvYmplY3QnICYmIHR5cGVvZiBwLnJlbGVhc2UubmFtZSA9PSAnc3RyaW5nJyAmJiBwLnJlbGVhc2UubmFtZVxuICAgICAgICAgIHx8IHByb2Nlc3MuYXJndjA7XG5cbiAgcmV0dXJuIG5hbWUgKyAnICcgKyBwcm9jZXNzLnZlcnNpb247XG59XG5cbi8qKlxuICogR2V0IGEgbnVtZXJpY2FsIE1BSk9SLk1JTk9SIHZlcnNpb24gb2Ygbm9kZS4gV2UgcmVwb3J0IHRoaXMgYXMgYSBtZXRyaWMuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfZ2V0TnVtZXJpY05vZGVWZXJzaW9uKCkge1xuICBjb25zdCBwID0gcHJvY2Vzcy52ZXJzaW9uO1xuICBjb25zdCBtID0gcC5tYXRjaCgvXFxkK1xcLlxcZCsvKTtcblxuICByZXR1cm4gbSAmJiBtWzBdICYmIHBhcnNlRmxvYXQobVswXSkgfHwgMDtcbn1cblxuXG4vLyBUaGVzZSBhcmUganVzdCBhcHByb3hpbWF0aW9ucyBvZiBVQSBzdHJpbmdzLiBXZSBqdXN0IHRyeSB0byBmb29sIEdvb2dsZSBBbmFseXRpY3MgdG8gZ2l2ZSB1cyB0aGVcbi8vIGRhdGEgd2Ugd2FudC5cbi8vIFNlZSBodHRwczovL2RldmVsb3BlcnMud2hhdGlzbXlicm93c2VyLmNvbS91c2VyYWdlbnRzL1xuY29uc3Qgb3NWZXJzaW9uTWFwOiB7IFtvczogc3RyaW5nXTogeyBbcmVsZWFzZTogc3RyaW5nXTogc3RyaW5nIH0gfSA9IHtcbiAgZGFyd2luOiB7XG4gICAgJzEuMy4xJzogJzEwXzBfNCcsXG4gICAgJzEuNC4xJzogJzEwXzFfMCcsXG4gICAgJzUuMSc6ICcxMF8xXzEnLFxuICAgICc1LjInOiAnMTBfMV81JyxcbiAgICAnNi4wLjEnOiAnMTBfMicsXG4gICAgJzYuOCc6ICcxMF8yXzgnLFxuICAgICc3LjAnOiAnMTBfM18wJyxcbiAgICAnNy45JzogJzEwXzNfOScsXG4gICAgJzguMCc6ICcxMF80XzAnLFxuICAgICc4LjExJzogJzEwXzRfMTEnLFxuICAgICc5LjAnOiAnMTBfNV8wJyxcbiAgICAnOS44JzogJzEwXzVfOCcsXG4gICAgJzEwLjAnOiAnMTBfNl8wJyxcbiAgICAnMTAuOCc6ICcxMF82XzgnLFxuICAgIC8vIFdlIHN0b3AgaGVyZSBiZWNhdXNlIHdlIHRyeSB0byBtYXRoIG91dCB0aGUgdmVyc2lvbiBmb3IgYW55dGhpbmcgZ3JlYXRlciB0aGFuIDEwLCBhbmQgaXRcbiAgICAvLyB3b3Jrcy4gVGhvc2UgdmVyc2lvbnMgYXJlIHN0YW5kYXJkaXplZCB1c2luZyBhIGNhbGN1bGF0aW9uIG5vdy5cbiAgfSxcbiAgd2luMzI6IHtcbiAgICAnNi4zLjk2MDAnOiAnV2luZG93cyA4LjEnLFxuICAgICc2LjIuOTIwMCc6ICdXaW5kb3dzIDgnLFxuICAgICc2LjEuNzYwMSc6ICdXaW5kb3dzIDcgU1AxJyxcbiAgICAnNi4xLjc2MDAnOiAnV2luZG93cyA3JyxcbiAgICAnNi4wLjYwMDInOiAnV2luZG93cyBWaXN0YSBTUDInLFxuICAgICc2LjAuNjAwMCc6ICdXaW5kb3dzIFZpc3RhJyxcbiAgICAnNS4xLjI2MDAnOiAnV2luZG93cyBYUCcsXG4gIH0sXG59O1xuXG5cbi8qKlxuICogQnVpbGQgYSBmYWtlIFVzZXIgQWdlbnQgc3RyaW5nIGZvciBPU1guIFRoaXMgZ2V0cyBzZW50IHRvIEFuYWx5dGljcyBzbyBpdCBzaG93cyB0aGUgcHJvcGVyIE9TLFxuICogdmVyc2lvbnMgYW5kIG90aGVycy5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9idWlsZFVzZXJBZ2VudFN0cmluZ0Zvck9zeCgpIHtcbiAgbGV0IHYgPSBvc1ZlcnNpb25NYXAuZGFyd2luW29zLnJlbGVhc2UoKV07XG5cbiAgaWYgKCF2KSB7XG4gICAgLy8gUmVtb3ZlIDQgdG8gdGllIERhcndpbiB2ZXJzaW9uIHRvIE9TWCB2ZXJzaW9uLCBhZGQgb3RoZXIgaW5mby5cbiAgICBjb25zdCB4ID0gcGFyc2VGbG9hdChvcy5yZWxlYXNlKCkpO1xuICAgIGlmICh4ID4gMTApIHtcbiAgICAgIHYgPSBgMTBfYCArICh4IC0gNCkudG9TdHJpbmcoKS5yZXBsYWNlKCcuJywgJ18nKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBjcHVNb2RlbCA9IG9zLmNwdXMoKVswXS5tb2RlbC5tYXRjaCgvXlthLXpdKy9pKTtcbiAgY29uc3QgY3B1ID0gY3B1TW9kZWwgPyBjcHVNb2RlbFswXSA6IG9zLmNwdXMoKVswXS5tb2RlbDtcblxuICByZXR1cm4gYChNYWNpbnRvc2g7ICR7Y3B1fSBNYWMgT1MgWCAke3YgfHwgb3MucmVsZWFzZSgpfSlgO1xufVxuXG4vKipcbiAqIEJ1aWxkIGEgZmFrZSBVc2VyIEFnZW50IHN0cmluZyBmb3IgV2luZG93cy4gVGhpcyBnZXRzIHNlbnQgdG8gQW5hbHl0aWNzIHNvIGl0IHNob3dzIHRoZSBwcm9wZXJcbiAqIE9TLCB2ZXJzaW9ucyBhbmQgb3RoZXJzLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2J1aWxkVXNlckFnZW50U3RyaW5nRm9yV2luZG93cygpIHtcbiAgcmV0dXJuIGAoV2luZG93cyBOVCAke29zLnJlbGVhc2UoKX0pYDtcbn1cblxuLyoqXG4gKiBCdWlsZCBhIGZha2UgVXNlciBBZ2VudCBzdHJpbmcgZm9yIExpbnV4LiBUaGlzIGdldHMgc2VudCB0byBBbmFseXRpY3Mgc28gaXQgc2hvd3MgdGhlIHByb3BlciBPUyxcbiAqIHZlcnNpb25zIGFuZCBvdGhlcnMuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfYnVpbGRVc2VyQWdlbnRTdHJpbmdGb3JMaW51eCgpIHtcbiAgcmV0dXJuIGAoWDExOyBMaW51eCBpNjg2OyAke29zLnJlbGVhc2UoKX07ICR7b3MuY3B1cygpWzBdLm1vZGVsfSlgO1xufVxuXG4vKipcbiAqIEJ1aWxkIGEgZmFrZSBVc2VyIEFnZW50IHN0cmluZy4gVGhpcyBnZXRzIHNlbnQgdG8gQW5hbHl0aWNzIHNvIGl0IHNob3dzIHRoZSBwcm9wZXIgT1MgdmVyc2lvbi5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9idWlsZFVzZXJBZ2VudFN0cmluZygpIHtcbiAgc3dpdGNoIChvcy5wbGF0Zm9ybSgpKSB7XG4gICAgY2FzZSAnZGFyd2luJzpcbiAgICAgIHJldHVybiBfYnVpbGRVc2VyQWdlbnRTdHJpbmdGb3JPc3goKTtcblxuICAgIGNhc2UgJ3dpbjMyJzpcbiAgICAgIHJldHVybiBfYnVpbGRVc2VyQWdlbnRTdHJpbmdGb3JXaW5kb3dzKCk7XG5cbiAgICBjYXNlICdsaW51eCc6XG4gICAgICByZXR1cm4gX2J1aWxkVXNlckFnZW50U3RyaW5nRm9yTGludXgoKTtcblxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gb3MucGxhdGZvcm0oKSArICcgJyArIG9zLnJlbGVhc2UoKTtcbiAgfVxufVxuXG5cbi8qKlxuICogSW1wbGVtZW50YXRpb24gb2YgdGhlIEFuYWx5dGljcyBpbnRlcmZhY2UgZm9yIHVzaW5nIGB1bml2ZXJzYWwtYW5hbHl0aWNzYCBwYWNrYWdlLlxuICovXG5leHBvcnQgY2xhc3MgVW5pdmVyc2FsQW5hbHl0aWNzIGltcGxlbWVudHMgYW5hbHl0aWNzLkFuYWx5dGljcyB7XG4gIHByaXZhdGUgX3VhOiB1YS5WaXNpdG9yO1xuICBwcml2YXRlIF9kaXJ0eSA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBAcGFyYW0gdHJhY2tpbmdJZCBUaGUgR29vZ2xlIEFuYWx5dGljcyBJRC5cbiAgICogQHBhcmFtIHVpZCBBIFVzZXIgSUQuXG4gICAqL1xuICBjb25zdHJ1Y3Rvcih0cmFja2luZ0lkOiBzdHJpbmcsIHVpZDogc3RyaW5nKSB7XG4gICAgdGhpcy5fdWEgPSB1YSh0cmFja2luZ0lkLCB1aWQsIHtcbiAgICAgIGVuYWJsZUJhdGNoaW5nOiB0cnVlLFxuICAgICAgYmF0Y2hTaXplOiA1LFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIHBlcnNpc3RlbnQgcGFyYW1zIGZvciBhcHBWZXJzaW9uLlxuICAgIHRoaXMuX3VhLnNldCgnZHMnLCAnY2xpJyk7XG4gICAgdGhpcy5fdWEuc2V0KCd1YScsIF9idWlsZFVzZXJBZ2VudFN0cmluZygpKTtcbiAgICB0aGlzLl91YS5zZXQoJ3VsJywgX2dldExhbmd1YWdlKCkpO1xuXG4gICAgLy8gQGFuZ3VsYXIvY2xpIHdpdGggdmVyc2lvbi5cbiAgICB0aGlzLl91YS5zZXQoJ2FuJywgcmVxdWlyZSgnLi4vcGFja2FnZS5qc29uJykubmFtZSk7XG4gICAgdGhpcy5fdWEuc2V0KCdhdicsIHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpLnZlcnNpb24pO1xuXG4gICAgLy8gV2UgdXNlIHRoZSBhcHBsaWNhdGlvbiBJRCBmb3IgdGhlIE5vZGUgdmVyc2lvbi4gVGhpcyBzaG91bGQgYmUgXCJub2RlIDEwLjEwLjBcIi5cbiAgICAvLyBXZSBhbHNvIHVzZSBhIGN1c3RvbSBtZXRyaWNzLCBidXRcbiAgICB0aGlzLl91YS5zZXQoJ2FpZCcsIF9nZXROb2RlVmVyc2lvbigpKTtcblxuICAgIC8vIFdlIHNldCBjdXN0b20gbWV0cmljcyBmb3IgdmFsdWVzIHdlIGNhcmUgYWJvdXQuXG4gICAgdGhpcy5fdWEuc2V0KCdjbTEnLCBfZ2V0Q3B1Q291bnQoKSk7XG4gICAgdGhpcy5fdWEuc2V0KCdjbTInLCBfZ2V0Q3B1U3BlZWQoKSk7XG4gICAgdGhpcy5fdWEuc2V0KCdjbTMnLCBfZ2V0UmFtU2l6ZSgpKTtcbiAgICB0aGlzLl91YS5zZXQoJ2NtNCcsIF9nZXROdW1lcmljTm9kZVZlcnNpb24oKSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyB0aGUgZGltZW5zaW9uIGFuZCBtZXRyaWNzIHZhcmlhYmxlcyB0byBwYXNzIHRvIHVuaXZlcnNhbC1hbmFseXRpY3MuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBwcml2YXRlIF9jdXN0b21WYXJpYWJsZXMob3B0aW9uczogYW5hbHl0aWNzLkN1c3RvbURpbWVuc2lvbnNBbmRNZXRyaWNzT3B0aW9ucykge1xuICAgIGNvbnN0IGFkZGl0aW9uYWxzOiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcgfSA9IHt9O1xuICAgIChvcHRpb25zLmRpbWVuc2lvbnMgfHwgW10pLmZvckVhY2goKHYsIGkpID0+IGFkZGl0aW9uYWxzWydjZCcgKyBpXSA9IHYpO1xuICAgIChvcHRpb25zLm1ldHJpY3MgfHwgW10pLmZvckVhY2goKHYsIGkpID0+IGFkZGl0aW9uYWxzWydjbScgKyBpXSA9IHYpO1xuXG4gICAgcmV0dXJuIGFkZGl0aW9uYWxzO1xuICB9XG5cbiAgZXZlbnQoZWM6IHN0cmluZywgZWE6IHN0cmluZywgb3B0aW9uczogYW5hbHl0aWNzLkV2ZW50T3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgdmFycyA9IHRoaXMuX2N1c3RvbVZhcmlhYmxlcyhvcHRpb25zKTtcbiAgICBhbmFseXRpY3NMb2dEZWJ1ZygnZXZlbnQgZWM9JWosIGVhPSVqLCAlaicsIGVjLCBlYSwgdmFycyk7XG5cbiAgICBjb25zdCB7IGxhYmVsOiBlbCwgdmFsdWU6IGV2IH0gPSBvcHRpb25zO1xuICAgIHRoaXMuX2RpcnR5ID0gdHJ1ZTtcbiAgICB0aGlzLl91YS5ldmVudCh7IGVjLCBlYSwgZWwsIGV2LCAuLi52YXJzIH0pO1xuICB9XG4gIHNjcmVlbnZpZXcoY2Q6IHN0cmluZywgYW46IHN0cmluZywgb3B0aW9uczogYW5hbHl0aWNzLlNjcmVlbnZpZXdPcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB2YXJzID0gdGhpcy5fY3VzdG9tVmFyaWFibGVzKG9wdGlvbnMpO1xuICAgIGFuYWx5dGljc0xvZ0RlYnVnKCdzY3JlZW52aWV3IGNkPSVqLCBhbj0laiwgJWonLCBjZCwgYW4sIHZhcnMpO1xuXG4gICAgY29uc3QgeyBhcHBWZXJzaW9uOiBhdiwgYXBwSWQ6IGFpZCwgYXBwSW5zdGFsbGVySWQ6IGFpaWQgfSA9IG9wdGlvbnM7XG4gICAgdGhpcy5fZGlydHkgPSB0cnVlO1xuICAgIHRoaXMuX3VhLnNjcmVlbnZpZXcoeyBjZCwgYW4sIGF2LCBhaWQsIGFpaWQsIC4uLnZhcnMgfSk7XG4gIH1cbiAgcGFnZXZpZXcoZHA6IHN0cmluZywgb3B0aW9uczogYW5hbHl0aWNzLlBhZ2V2aWV3T3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgdmFycyA9IHRoaXMuX2N1c3RvbVZhcmlhYmxlcyhvcHRpb25zKTtcbiAgICBhbmFseXRpY3NMb2dEZWJ1ZygncGFnZXZpZXcgZHA9JWosICVqJywgZHAsIHZhcnMpO1xuXG4gICAgY29uc3QgeyBob3N0bmFtZTogZGgsIHRpdGxlOiBkdCB9ID0gb3B0aW9ucztcbiAgICB0aGlzLl9kaXJ0eSA9IHRydWU7XG4gICAgdGhpcy5fdWEucGFnZXZpZXcoeyBkcCwgZGgsIGR0LCAuLi52YXJzIH0pO1xuICB9XG4gIHRpbWluZyh1dGM6IHN0cmluZywgdXR2OiBzdHJpbmcsIHV0dDogc3RyaW5nIHwgbnVtYmVyLCBvcHRpb25zOiBhbmFseXRpY3MuVGltaW5nT3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgdmFycyA9IHRoaXMuX2N1c3RvbVZhcmlhYmxlcyhvcHRpb25zKTtcbiAgICBhbmFseXRpY3NMb2dEZWJ1ZygndGltaW5nIHV0Yz0laiwgdXR2PSVqLCB1dGw9JWosICVqJywgdXRjLCB1dHYsIHV0dCwgdmFycyk7XG5cbiAgICBjb25zdCB7IGxhYmVsOiB1dGwgfSA9IG9wdGlvbnM7XG4gICAgdGhpcy5fZGlydHkgPSB0cnVlO1xuICAgIHRoaXMuX3VhLnRpbWluZyh7IHV0YywgdXR2LCB1dHQsIHV0bCwgLi4udmFycyB9KTtcbiAgfVxuXG4gIGZsdXNoKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5fZGlydHkpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9kaXJ0eSA9IGZhbHNlO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gdGhpcy5fdWEuc2VuZChyZXNvbHZlKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBTZXQgYW5hbHl0aWNzIHNldHRpbmdzLiBUaGlzIGRvZXMgbm90IHdvcmsgaWYgdGhlIHVzZXIgaXMgbm90IGluc2lkZSBhIHByb2plY3QuXG4gKiBAcGFyYW0gbGV2ZWwgV2hpY2ggY29uZmlnIHRvIHVzZS4gXCJnbG9iYWxcIiBmb3IgdXNlci1sZXZlbCwgYW5kIFwibG9jYWxcIiBmb3IgcHJvamVjdC1sZXZlbC5cbiAqIEBwYXJhbSB2YWx1ZSBFaXRoZXIgYSB1c2VyIElELCB0cnVlIHRvIGdlbmVyYXRlIGEgbmV3IFVzZXIgSUQsIG9yIGZhbHNlIHRvIGRpc2FibGUgYW5hbHl0aWNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0QW5hbHl0aWNzQ29uZmlnKGxldmVsOiAnZ2xvYmFsJyB8ICdsb2NhbCcsIHZhbHVlOiBzdHJpbmcgfCBib29sZWFuKSB7XG4gIGFuYWx5dGljc0RlYnVnKCdzZXR0aW5nICVzIGxldmVsIGFuYWx5dGljcyB0bzogJXMnLCBsZXZlbCwgdmFsdWUpO1xuICBjb25zdCBbY29uZmlnLCBjb25maWdQYXRoXSA9IGdldFdvcmtzcGFjZVJhdyhsZXZlbCk7XG4gIGlmICghY29uZmlnIHx8ICFjb25maWdQYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCAke2xldmVsfSB3b3Jrc3BhY2UuYCk7XG4gIH1cblxuICBjb25zdCBjb25maWdWYWx1ZSA9IGNvbmZpZy52YWx1ZTtcbiAgY29uc3QgY2xpOiBqc29uLkpzb25WYWx1ZSA9IGNvbmZpZ1ZhbHVlWydjbGknXSB8fCAoY29uZmlnVmFsdWVbJ2NsaSddID0ge30pO1xuXG4gIGlmICghanNvbi5pc0pzb25PYmplY3QoY2xpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWcgZm91bmQgYXQgJHtjb25maWdQYXRofS4gQ0xJIHNob3VsZCBiZSBhbiBvYmplY3QuYCk7XG4gIH1cblxuICBpZiAodmFsdWUgPT09IHRydWUpIHtcbiAgICB2YWx1ZSA9IHV1aWRWNCgpO1xuICB9XG4gIGNsaVsnYW5hbHl0aWNzJ10gPSB2YWx1ZTtcblxuICBjb25zdCBvdXRwdXQgPSBKU09OLnN0cmluZ2lmeShjb25maWdWYWx1ZSwgbnVsbCwgMik7XG4gIHdyaXRlRmlsZVN5bmMoY29uZmlnUGF0aCwgb3V0cHV0KTtcbiAgYW5hbHl0aWNzRGVidWcoJ2RvbmUnKTtcbn1cblxuLyoqXG4gKiBQcm9tcHQgdGhlIHVzZXIgZm9yIHVzYWdlIGdhdGhlcmluZyBwZXJtaXNzaW9uLlxuICogQHBhcmFtIGZvcmNlIFdoZXRoZXIgdG8gYXNrIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBvciBub3QgdGhlIHVzZXIgaXMgdXNpbmcgYW4gaW50ZXJhY3RpdmUgc2hlbGwuXG4gKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIHdhcyBzaG93biBhIHByb21wdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByb21wdEdsb2JhbEFuYWx5dGljcyhmb3JjZSA9IGZhbHNlKSB7XG4gIGFuYWx5dGljc0RlYnVnKCdwcm9tcHRpbmcgZ2xvYmFsIGFuYWx5dGljcy4nKTtcbiAgaWYgKGZvcmNlIHx8IChwcm9jZXNzLnN0ZG91dC5pc1RUWSAmJiBwcm9jZXNzLnN0ZGluLmlzVFRZKSkge1xuICAgIGNvbnN0IGFuc3dlcnMgPSBhd2FpdCBpbnF1aXJlci5wcm9tcHQ8eyBhbmFseXRpY3M6IGJvb2xlYW4gfT4oW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnY29uZmlybScsXG4gICAgICAgIG5hbWU6ICdhbmFseXRpY3MnLFxuICAgICAgICBtZXNzYWdlOiB0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBXb3VsZCB5b3UgbGlrZSB0byBzaGFyZSBhbm9ueW1vdXMgdXNhZ2UgZGF0YSB3aXRoIHRoZSBBbmd1bGFyIFRlYW0gYXQgR29vZ2xlIHVuZGVyXG4gICAgICAgICAgR29vZ2xl4oCZcyBQcml2YWN5IFBvbGljeSBhdCBodHRwczovL3BvbGljaWVzLmdvb2dsZS5jb20vcHJpdmFjeT8gRm9yIG1vcmUgZGV0YWlscyBhbmRcbiAgICAgICAgICBob3cgdG8gY2hhbmdlIHRoaXMgc2V0dGluZywgc2VlIGh0dHA6Ly9hbmd1bGFyLmlvL2FuYWx5dGljcy5cbiAgICAgICAgYCxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9LFxuICAgIF0pO1xuXG4gICAgc2V0QW5hbHl0aWNzQ29uZmlnKCdnbG9iYWwnLCBhbnN3ZXJzLmFuYWx5dGljcyk7XG5cbiAgICBpZiAoYW5zd2Vycy5hbmFseXRpY3MpIHtcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIGNvbnNvbGUubG9nKHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIFRoYW5rIHlvdSBmb3Igc2hhcmluZyBhbm9ueW1vdXMgdXNhZ2UgZGF0YS4gV291bGQgeW91IGNoYW5nZSB5b3VyIG1pbmQsIHRoZSBmb2xsb3dpbmdcbiAgICAgICAgY29tbWFuZCB3aWxsIGRpc2FibGUgdGhpcyBmZWF0dXJlIGVudGlyZWx5OlxuXG4gICAgICAgICAgICAke3Rlcm1pbmFsLnllbGxvdygnbmcgYW5hbHl0aWNzIG9mZicpfVxuICAgICAgYCk7XG4gICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgYW5hbHl0aWNzRGVidWcoJ0VpdGhlciBTVERPVVQgb3IgU1RESU4gYXJlIG5vdCBUVFkgYW5kIHdlIHNraXBwZWQgdGhlIHByb21wdC4nKTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBQcm9tcHQgdGhlIHVzZXIgZm9yIHVzYWdlIGdhdGhlcmluZyBwZXJtaXNzaW9uIGZvciB0aGUgbG9jYWwgcHJvamVjdC4gRmFpbHMgaWYgdGhlcmUgaXMgbm9cbiAqIGxvY2FsIHdvcmtzcGFjZS5cbiAqIEBwYXJhbSBmb3JjZSBXaGV0aGVyIHRvIGFzayByZWdhcmRsZXNzIG9mIHdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIGlzIHVzaW5nIGFuIGludGVyYWN0aXZlIHNoZWxsLlxuICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgdXNlciB3YXMgc2hvd24gYSBwcm9tcHQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm9tcHRQcm9qZWN0QW5hbHl0aWNzKGZvcmNlID0gZmFsc2UpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgYW5hbHl0aWNzRGVidWcoJ3Byb21wdGluZyB1c2VyJyk7XG4gIGNvbnN0IFtjb25maWcsIGNvbmZpZ1BhdGhdID0gZ2V0V29ya3NwYWNlUmF3KCdsb2NhbCcpO1xuICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnUGF0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgYSBsb2NhbCB3b3Jrc3BhY2UuIEFyZSB5b3UgaW4gYSBwcm9qZWN0P2ApO1xuICB9XG5cbiAgaWYgKGZvcmNlIHx8IChwcm9jZXNzLnN0ZG91dC5pc1RUWSAmJiBwcm9jZXNzLnN0ZGluLmlzVFRZKSkge1xuICAgIGNvbnN0IGFuc3dlcnMgPSBhd2FpdCBpbnF1aXJlci5wcm9tcHQ8eyBhbmFseXRpY3M6IGJvb2xlYW4gfT4oW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnY29uZmlybScsXG4gICAgICAgIG5hbWU6ICdhbmFseXRpY3MnLFxuICAgICAgICBtZXNzYWdlOiB0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBXb3VsZCB5b3UgbGlrZSB0byBzaGFyZSBhbm9ueW1vdXMgdXNhZ2UgZGF0YSBhYm91dCB0aGlzIHByb2plY3Qgd2l0aCB0aGUgQW5ndWxhciBUZWFtIGF0XG4gICAgICAgICAgR29vZ2xlIHVuZGVyIEdvb2dsZeKAmXMgUHJpdmFjeSBQb2xpY3kgYXQgaHR0cHM6Ly9wb2xpY2llcy5nb29nbGUuY29tL3ByaXZhY3k/IEZvciBtb3JlXG4gICAgICAgICAgZGV0YWlscyBhbmQgaG93IHRvIGNoYW5nZSB0aGlzIHNldHRpbmcsIHNlZSBodHRwOi8vYW5ndWxhci5pby9hbmFseXRpY3MuXG5cbiAgICAgICAgYCxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9LFxuICAgIF0pO1xuXG4gICAgc2V0QW5hbHl0aWNzQ29uZmlnKCdsb2NhbCcsIGFuc3dlcnMuYW5hbHl0aWNzKTtcblxuICAgIGlmIChhbnN3ZXJzLmFuYWx5dGljcykge1xuICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgY29uc29sZS5sb2codGFncy5zdHJpcEluZGVudGBcbiAgICAgICAgVGhhbmsgeW91IGZvciBzaGFyaW5nIGFub255bW91cyB1c2FnZSBkYXRhLiBXb3VsZCB5b3UgY2hhbmdlIHlvdXIgbWluZCwgdGhlIGZvbGxvd2luZ1xuICAgICAgICBjb21tYW5kIHdpbGwgZGlzYWJsZSB0aGlzIGZlYXR1cmUgZW50aXJlbHk6XG5cbiAgICAgICAgICAgICR7dGVybWluYWwueWVsbG93KCduZyBhbmFseXRpY3MgcHJvamVjdCBvZmYnKX1cbiAgICAgIGApO1xuICAgICAgY29uc29sZS5sb2coJycpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5cbi8qKlxuICogR2V0IHRoZSBnbG9iYWwgYW5hbHl0aWNzIHNldHRpbmcgZm9yIHRoZSB1c2VyLiBUaGlzIHJldHVybnMgYSBzdHJpbmcgZm9yIFVJRCwgZmFsc2UgaWYgdGhlIHVzZXJcbiAqIG9wdGVkIG91dCBvZiBhbmFseXRpY3MsIHRydWUgaWYgdGhlIHVzZXIgd2FudHMgdG8gc3RheSBhbm9ueW1vdXMgKG5vIGNsaWVudCBpZCksIGFuZCB1bmRlZmluZWRcbiAqIGlmIHRoZSB1c2VyIGhhcyBub3QgYmVlbiBwcm9tcHRlZCB5ZXQuXG4gKlxuICogSWYgYW55IHByb2JsZW0gaGFwcGVucywgaXQgaXMgY29uc2lkZXJlZCB0aGUgdXNlciBoYXMgYmVlbiBvcHRpbmcgb3V0IG9mIGFuYWx5dGljcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEdsb2JhbEFuYWx5dGljcygpOiBzdHJpbmcgfCBib29sZWFuIHwgdW5kZWZpbmVkIHtcbiAgYW5hbHl0aWNzRGVidWcoJ2dldEdsb2JhbEFuYWx5dGljcycpO1xuXG4gIGlmICgnTkdfQ0xJX0FOQUxZVElDUycgaW4gcHJvY2Vzcy5lbnYpIHtcbiAgICBpZiAocHJvY2Vzcy5lbnZbJ05HX0NMSV9BTkFMWVRJQ1MnXSA9PSAnZmFsc2UnIHx8IHByb2Nlc3MuZW52WydOR19DTElfQU5BTFlUSUNTJ10gPT0gJycpIHtcbiAgICAgIGFuYWx5dGljc0RlYnVnKCdOR19DTElfQU5BTFlUSUNTIGlzIGZhbHNlJyk7XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHByb2Nlc3MuZW52WydOR19DTElfQU5BTFlUSUNTJ10gPT09ICdjaScpIHtcbiAgICAgIGFuYWx5dGljc0RlYnVnKCdSdW5uaW5nIGluIENJIG1vZGUnKTtcblxuICAgICAgcmV0dXJuICdjaSc7XG4gICAgfVxuICB9XG5cbiAgLy8gSWYgYW55dGhpbmcgaGFwcGVucyB3ZSBqdXN0IGtlZXAgdGhlIE5PT1AgYW5hbHl0aWNzLlxuICB0cnkge1xuICAgIGNvbnN0IGdsb2JhbFdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgY29uc3QgYW5hbHl0aWNzQ29uZmlnID0gZ2xvYmFsV29ya3NwYWNlXG4gICAgICAmJiBnbG9iYWxXb3Jrc3BhY2UuZ2V0Q2xpKClcbiAgICAgICYmIGdsb2JhbFdvcmtzcGFjZS5nZXRDbGkoKVsnYW5hbHl0aWNzJ107XG4gICAgYW5hbHl0aWNzRGVidWcoJ0NsaWVudCBBbmFseXRpY3MgY29uZmlnIGZvdW5kOiAlaicsIGFuYWx5dGljc0NvbmZpZyk7XG5cbiAgICBpZiAoYW5hbHl0aWNzQ29uZmlnID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoYW5hbHl0aWNzQ29uZmlnID09PSB1bmRlZmluZWQgfHwgYW5hbHl0aWNzQ29uZmlnID09PSBudWxsKSB7XG4gICAgICAvLyBnbG9iYWxXb3Jrc3BhY2UgY2FuIGJlIG51bGwgaWYgdGhlcmUgaXMgbm8gZmlsZS4gYW5hbHl0aWNzQ29uZmlnIHdvdWxkIGJlIG51bGwgaW4gdGhpc1xuICAgICAgLy8gY2FzZS4gU2luY2UgdGhlcmUgaXMgbm8gZmlsZSwgdGhlIHVzZXIgaGFzbid0IGFuc3dlcmVkIGFuZCB0aGUgZXhwZWN0ZWQgcmV0dXJuIHZhbHVlIGlzXG4gICAgICAvLyB1bmRlZmluZWQuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgdWlkOiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICBpZiAodHlwZW9mIGFuYWx5dGljc0NvbmZpZyA9PSAnc3RyaW5nJykge1xuICAgICAgICB1aWQgPSBhbmFseXRpY3NDb25maWc7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhbmFseXRpY3NDb25maWcgPT0gJ29iamVjdCcgJiYgdHlwZW9mIGFuYWx5dGljc0NvbmZpZ1sndWlkJ10gPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdWlkID0gYW5hbHl0aWNzQ29uZmlnWyd1aWQnXTtcbiAgICAgIH1cblxuICAgICAgYW5hbHl0aWNzRGVidWcoJ2NsaWVudCBpZDogJXMnLCB1aWQpO1xuXG4gICAgICByZXR1cm4gdWlkO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgYW5hbHl0aWNzRGVidWcoJ0Vycm9yIGhhcHBlbmVkIGR1cmluZyByZWFkaW5nIG9mIGFuYWx5dGljcyBjb25maWc6ICVzJywgZXJyLm1lc3NhZ2UpO1xuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=