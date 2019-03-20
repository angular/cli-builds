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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvYW5hbHl0aWNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQXVFO0FBQ3ZFLCtDQUErQztBQUMvQywrQkFBK0I7QUFDL0IsMkJBQW1DO0FBQ25DLHFDQUFxQztBQUNyQyx5QkFBeUI7QUFDekIsMENBQTBDO0FBQzFDLCtCQUFvQztBQUVwQyxnREFBb0U7QUFFcEUsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUUsb0RBQW9EO0FBQ25HLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBRSx5QkFBeUI7QUFFL0UsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBRXhDOztHQUVHO0FBQ1UsUUFBQSx3QkFBd0IsR0FBRztJQUN0QyxhQUFhO0lBQ2Isb0JBQW9CO0lBQ3BCLGFBQWE7SUFDYixxQkFBcUI7SUFDckIsd0JBQXdCO0lBQ3hCLG9CQUFvQjtDQUNyQixDQUFDO0FBRUYsU0FBZ0IsNkJBQTZCLENBQUMsSUFBWTtJQUN4RCxPQUFPLGdDQUF3QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUM3QyxJQUFJLE9BQU8sT0FBTyxJQUFJLFFBQVEsRUFBRTtZQUM5QixPQUFPLE9BQU8sS0FBSyxJQUFJLENBQUM7U0FDekI7YUFBTTtZQUNMLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMzQjtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQVJELHNFQVFDO0FBRUM7OztFQUdDO0FBQ0gsSUFBWSxtQkFHWDtBQUhELFdBQVksbUJBQW1CO0lBQzdCLG1GQUFtQixDQUFBO0lBQ25CLDZGQUF3QixDQUFBO0FBQzFCLENBQUMsRUFIVyxtQkFBbUIsR0FBbkIs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a0IsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUM1QyxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUVyQyxPQUFPLElBQUksQ0FBQztTQUNiO0tBQ0Y7SUFFRCx1REFBdUQ7SUFDdkQsSUFBSTtRQUNGLE1BQU0sZUFBZSxHQUFHLHFCQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsTUFBTSxlQUFlLEdBQUcsZUFBZTtlQUNsQyxlQUFlLENBQUMsTUFBTSxFQUFFO2VBQ3hCLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUUzQyxJQUFJLGVBQWUsS0FBSyxLQUFLLEVBQUU7WUFDN0IsT0FBTyxLQUFLLENBQUM7U0FDZDthQUFNLElBQUksZUFBZSxLQUFLLFNBQVMsRUFBRTtZQUN4QyxPQUFPLFNBQVMsQ0FBQztTQUNsQjthQUFNO1lBQ0wsSUFBSSxHQUFHLEdBQXVCLFNBQVMsQ0FBQztZQUN4QyxJQUFJLE9BQU8sZUFBZSxJQUFJLFFBQVEsRUFBRTtnQkFDdEMsR0FBRyxHQUFHLGVBQWUsQ0FBQzthQUN2QjtpQkFBTSxJQUFJLE9BQU8sZUFBZSxJQUFJLFFBQVEsSUFBSSxPQUFPLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxRQUFRLEVBQUU7Z0JBQzFGLEdBQUcsR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDOUI7WUFFRCxjQUFjLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRXJDLE9BQU8sR0FBRyxDQUFDO1NBQ1o7S0FDRjtJQUFDLFdBQU07UUFDTixPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQztBQTFDRCxnREEwQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBhbmFseXRpY3MsIGpzb24sIHRhZ3MsIHRlcm1pbmFsIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcbmltcG9ydCB7IHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBpbnF1aXJlciBmcm9tICdpbnF1aXJlcic7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyB1YSBmcm9tICd1bml2ZXJzYWwtYW5hbHl0aWNzJztcbmltcG9ydCB7IHY0IGFzIHV1aWRWNCB9IGZyb20gJ3V1aWQnO1xuaW1wb3J0IHsgVGltaW5nT3B0aW9ucyB9IGZyb20gJy4uLy4uLy4uL2FuZ3VsYXJfZGV2a2l0L2NvcmUvc3JjL2FuYWx5dGljcyc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UsIGdldFdvcmtzcGFjZVJhdyB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuXG5jb25zdCBhbmFseXRpY3NEZWJ1ZyA9IGRlYnVnKCduZzphbmFseXRpY3MnKTsgIC8vIEdlbmVyYXRlIGFuYWx5dGljcywgaW5jbHVkaW5nIHNldHRpbmdzIGFuZCB1c2Vycy5cbmNvbnN0IGFuYWx5dGljc0xvZ0RlYnVnID0gZGVidWcoJ25nOmFuYWx5dGljczpsb2cnKTsgIC8vIEFjdHVhbCBsb2dzIG9mIGV2ZW50cy5cblxuY29uc3QgQllURVNfUEVSX01FR0FCWVRFUyA9IDEwMjQgKiAxMDI0O1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIHVsdGltYXRlIHNhZmVsaXN0IGZvciBjaGVja2luZyBpZiBhIHBhY2thZ2UgbmFtZSBpcyBzYWZlIHRvIHJlcG9ydCB0byBhbmFseXRpY3MuXG4gKi9cbmV4cG9ydCBjb25zdCBhbmFseXRpY3NQYWNrYWdlU2FmZWxpc3QgPSBbXG4gIC9eQGFuZ3VsYXJcXC8vLFxuICAvXkBhbmd1bGFyLWRldmtpdFxcLy8sXG4gIC9eQG5ndG9vbHNcXC8vLFxuICAnQHNjaGVtYXRpY3MvYW5ndWxhcicsXG4gICdAc2NoZW1hdGljcy9zY2hlbWF0aWNzJyxcbiAgJ0BzY2hlbWF0aWNzL3VwZGF0ZScsXG5dO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MobmFtZTogc3RyaW5nKSB7XG4gIHJldHVybiBhbmFseXRpY3NQYWNrYWdlU2FmZWxpc3Quc29tZShwYXR0ZXJuID0+IHtcbiAgICBpZiAodHlwZW9mIHBhdHRlcm4gPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBwYXR0ZXJuID09PSBuYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcGF0dGVybi50ZXN0KG5hbWUpO1xuICAgIH1cbiAgfSk7XG59XG5cbiAgLyoqXG4gKiBNQUtFIFNVUkUgVE8gS0VFUCBUSElTIElOIFNZTkMgV0lUSCBUSEUgVEFCTEUgQU5EIENPTlRFTlQgSU4gYC9kb2NzL2Rlc2lnbi9hbmFseXRpY3MubWRgLlxuICogV0UgTElTVCBUSE9TRSBESU1FTlNJT05TIChBTkQgTU9SRSkuXG4gKi9cbmV4cG9ydCBlbnVtIEFuYWx5dGljc0RpbWVuc2lvbnMge1xuICBOZ0FkZENvbGxlY3Rpb24gPSA2LFxuICBOZ0J1aWxkQnVpbGRFdmVudExvZyA9IDcsXG59XG5cblxuLyoqXG4gKiBBdHRlbXB0IHRvIGdldCB0aGUgV2luZG93cyBMYW5ndWFnZSBDb2RlIHN0cmluZy5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9nZXRXaW5kb3dzTGFuZ3VhZ2VDb2RlKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmICghb3MucGxhdGZvcm0oKS5zdGFydHNXaXRoKCd3aW4nKSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICB0cnkge1xuICAgIC8vIFRoaXMgaXMgdHJ1ZSBvbiBXaW5kb3dzIFhQLCA3LCA4IGFuZCAxMCBBRkFJSy4gV291bGQgcmV0dXJuIGVtcHR5IHN0cmluZyBvciBmYWlsIGlmIGl0XG4gICAgLy8gZG9lc24ndCB3b3JrLlxuICAgIHJldHVybiBjaGlsZF9wcm9jZXNzLmV4ZWNTeW5jKCd3bWljLmV4ZSBvcyBnZXQgbG9jYWxlJykudG9TdHJpbmcoKS50cmltKCk7XG4gIH0gY2F0Y2ggKF8pIHt9XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBHZXQgYSBsYW5ndWFnZSBjb2RlLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2dldExhbmd1YWdlKCkge1xuICAvLyBOb3RlOiBXaW5kb3dzIGRvZXMgbm90IGV4cG9zZSB0aGUgY29uZmlndXJlZCBsYW5ndWFnZSBieSBkZWZhdWx0LlxuICByZXR1cm4gcHJvY2Vzcy5lbnYuTEFORyAgLy8gRGVmYXVsdCBVbml4IGVudiB2YXJpYWJsZS5cbiAgICAgIHx8IHByb2Nlc3MuZW52LkxDX0NUWVBFICAvLyBGb3IgQyBsaWJyYXJpZXMuIFNvbWV0aW1lcyB0aGUgYWJvdmUgaXNuJ3Qgc2V0LlxuICAgICAgfHwgcHJvY2Vzcy5lbnYuTEFOR1NQRUMgIC8vIEZvciBXaW5kb3dzLCBzb21ldGltZXMgdGhpcyB3aWxsIGJlIHNldCAobm90IGFsd2F5cykuXG4gICAgICB8fCBfZ2V0V2luZG93c0xhbmd1YWdlQ29kZSgpXG4gICAgICB8fCAnPz8nOyAgLy8gwq9cXF8o44OEKV8vwq9cbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIG51bWJlciBvZiBDUFVzLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2dldENwdUNvdW50KCkge1xuICBjb25zdCBjcHVzID0gb3MuY3B1cygpO1xuXG4gIC8vIFJldHVybiBcIihjb3VudCl4KGF2ZXJhZ2Ugc3BlZWQpXCIuXG4gIHJldHVybiBjcHVzLmxlbmd0aDtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGZpcnN0IENQVSdzIHNwZWVkLiBJdCdzIHZlcnkgcmFyZSB0byBoYXZlIG11bHRpcGxlIENQVXMgb2YgZGlmZmVyZW50IHNwZWVkIChpbiBtb3N0XG4gKiBub24tQVJNIGNvbmZpZ3VyYXRpb25zIGFueXdheSksIHNvIHRoYXQncyBhbGwgd2UgY2FyZSBhYm91dC5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9nZXRDcHVTcGVlZCgpIHtcbiAgY29uc3QgY3B1cyA9IG9zLmNwdXMoKTtcblxuICByZXR1cm4gTWF0aC5mbG9vcihjcHVzWzBdLnNwZWVkKTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGFtb3VudCBvZiBtZW1vcnksIGluIG1lZ2FieXRlcy5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9nZXRSYW1TaXplKCkge1xuICAvLyBSZXBvcnQgaW4gbWVnYWJ5dGVzLiBPdGhlcndpc2UgaXQncyB0b28gbXVjaCBub2lzZS5cbiAgcmV0dXJuIE1hdGguZmxvb3Iob3MudG90YWxtZW0oKSAvIEJZVEVTX1BFUl9NRUdBQllURVMpO1xufVxuXG4vKipcbiAqIEdldCB0aGUgTm9kZSBuYW1lIGFuZCB2ZXJzaW9uLiBUaGlzIHJldHVybnMgYSBzdHJpbmcgbGlrZSBcIk5vZGUgMTAuMTFcIiwgb3IgXCJpby5qcyAzLjVcIi5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9nZXROb2RlVmVyc2lvbigpIHtcbiAgLy8gV2UgdXNlIGFueSBoZXJlIGJlY2F1c2UgcC5yZWxlYXNlIGlzIGEgbmV3IE5vZGUgY29uc3RydWN0IGluIE5vZGUgMTAgKGFuZCBvdXIgdHlwaW5ncyBhcmUgdGhlXG4gIC8vIG1pbmltYWwgdmVyc2lvbiBvZiBOb2RlIHdlIHN1cHBvcnQpLlxuICBjb25zdCBwID0gcHJvY2VzcyBhcyBhbnk7ICAvLyB0c2xpbnQ6ZGlzYWJsZS1saW5lOm5vLWFueVxuICBjb25zdCBuYW1lID0gdHlwZW9mIHAucmVsZWFzZSA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgcC5yZWxlYXNlLm5hbWUgPT0gJ3N0cmluZycgJiYgcC5yZWxlYXNlLm5hbWVcbiAgICAgICAgICB8fCBwcm9jZXNzLmFyZ3YwO1xuXG4gIHJldHVybiBuYW1lICsgJyAnICsgcHJvY2Vzcy52ZXJzaW9uO1xufVxuXG4vKipcbiAqIEdldCBhIG51bWVyaWNhbCBNQUpPUi5NSU5PUiB2ZXJzaW9uIG9mIG5vZGUuIFdlIHJlcG9ydCB0aGlzIGFzIGEgbWV0cmljLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2dldE51bWVyaWNOb2RlVmVyc2lvbigpIHtcbiAgY29uc3QgcCA9IHByb2Nlc3MudmVyc2lvbjtcbiAgY29uc3QgbSA9IHAubWF0Y2goL1xcZCtcXC5cXGQrLyk7XG5cbiAgcmV0dXJuIG0gJiYgbVswXSAmJiBwYXJzZUZsb2F0KG1bMF0pIHx8IDA7XG59XG5cblxuLy8gVGhlc2UgYXJlIGp1c3QgYXBwcm94aW1hdGlvbnMgb2YgVUEgc3RyaW5ncy4gV2UganVzdCB0cnkgdG8gZm9vbCBHb29nbGUgQW5hbHl0aWNzIHRvIGdpdmUgdXMgdGhlXG4vLyBkYXRhIHdlIHdhbnQuXG4vLyBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLndoYXRpc215YnJvd3Nlci5jb20vdXNlcmFnZW50cy9cbmNvbnN0IG9zVmVyc2lvbk1hcDogeyBbb3M6IHN0cmluZ106IHsgW3JlbGVhc2U6IHN0cmluZ106IHN0cmluZyB9IH0gPSB7XG4gIGRhcndpbjoge1xuICAgICcxLjMuMSc6ICcxMF8wXzQnLFxuICAgICcxLjQuMSc6ICcxMF8xXzAnLFxuICAgICc1LjEnOiAnMTBfMV8xJyxcbiAgICAnNS4yJzogJzEwXzFfNScsXG4gICAgJzYuMC4xJzogJzEwXzInLFxuICAgICc2LjgnOiAnMTBfMl84JyxcbiAgICAnNy4wJzogJzEwXzNfMCcsXG4gICAgJzcuOSc6ICcxMF8zXzknLFxuICAgICc4LjAnOiAnMTBfNF8wJyxcbiAgICAnOC4xMSc6ICcxMF80XzExJyxcbiAgICAnOS4wJzogJzEwXzVfMCcsXG4gICAgJzkuOCc6ICcxMF81XzgnLFxuICAgICcxMC4wJzogJzEwXzZfMCcsXG4gICAgJzEwLjgnOiAnMTBfNl84JyxcbiAgICAvLyBXZSBzdG9wIGhlcmUgYmVjYXVzZSB3ZSB0cnkgdG8gbWF0aCBvdXQgdGhlIHZlcnNpb24gZm9yIGFueXRoaW5nIGdyZWF0ZXIgdGhhbiAxMCwgYW5kIGl0XG4gICAgLy8gd29ya3MuIFRob3NlIHZlcnNpb25zIGFyZSBzdGFuZGFyZGl6ZWQgdXNpbmcgYSBjYWxjdWxhdGlvbiBub3cuXG4gIH0sXG4gIHdpbjMyOiB7XG4gICAgJzYuMy45NjAwJzogJ1dpbmRvd3MgOC4xJyxcbiAgICAnNi4yLjkyMDAnOiAnV2luZG93cyA4JyxcbiAgICAnNi4xLjc2MDEnOiAnV2luZG93cyA3IFNQMScsXG4gICAgJzYuMS43NjAwJzogJ1dpbmRvd3MgNycsXG4gICAgJzYuMC42MDAyJzogJ1dpbmRvd3MgVmlzdGEgU1AyJyxcbiAgICAnNi4wLjYwMDAnOiAnV2luZG93cyBWaXN0YScsXG4gICAgJzUuMS4yNjAwJzogJ1dpbmRvd3MgWFAnLFxuICB9LFxufTtcblxuXG4vKipcbiAqIEJ1aWxkIGEgZmFrZSBVc2VyIEFnZW50IHN0cmluZyBmb3IgT1NYLiBUaGlzIGdldHMgc2VudCB0byBBbmFseXRpY3Mgc28gaXQgc2hvd3MgdGhlIHByb3BlciBPUyxcbiAqIHZlcnNpb25zIGFuZCBvdGhlcnMuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfYnVpbGRVc2VyQWdlbnRTdHJpbmdGb3JPc3goKSB7XG4gIGxldCB2ID0gb3NWZXJzaW9uTWFwLmRhcndpbltvcy5yZWxlYXNlKCldO1xuXG4gIGlmICghdikge1xuICAgIC8vIFJlbW92ZSA0IHRvIHRpZSBEYXJ3aW4gdmVyc2lvbiB0byBPU1ggdmVyc2lvbiwgYWRkIG90aGVyIGluZm8uXG4gICAgY29uc3QgeCA9IHBhcnNlRmxvYXQob3MucmVsZWFzZSgpKTtcbiAgICBpZiAoeCA+IDEwKSB7XG4gICAgICB2ID0gYDEwX2AgKyAoeCAtIDQpLnRvU3RyaW5nKCkucmVwbGFjZSgnLicsICdfJyk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgY3B1TW9kZWwgPSBvcy5jcHVzKClbMF0ubW9kZWwubWF0Y2goL15bYS16XSsvaSk7XG4gIGNvbnN0IGNwdSA9IGNwdU1vZGVsID8gY3B1TW9kZWxbMF0gOiBvcy5jcHVzKClbMF0ubW9kZWw7XG5cbiAgcmV0dXJuIGAoTWFjaW50b3NoOyAke2NwdX0gTWFjIE9TIFggJHt2IHx8IG9zLnJlbGVhc2UoKX0pYDtcbn1cblxuLyoqXG4gKiBCdWlsZCBhIGZha2UgVXNlciBBZ2VudCBzdHJpbmcgZm9yIFdpbmRvd3MuIFRoaXMgZ2V0cyBzZW50IHRvIEFuYWx5dGljcyBzbyBpdCBzaG93cyB0aGUgcHJvcGVyXG4gKiBPUywgdmVyc2lvbnMgYW5kIG90aGVycy5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9idWlsZFVzZXJBZ2VudFN0cmluZ0ZvcldpbmRvd3MoKSB7XG4gIHJldHVybiBgKFdpbmRvd3MgTlQgJHtvcy5yZWxlYXNlKCl9KWA7XG59XG5cbi8qKlxuICogQnVpbGQgYSBmYWtlIFVzZXIgQWdlbnQgc3RyaW5nIGZvciBMaW51eC4gVGhpcyBnZXRzIHNlbnQgdG8gQW5hbHl0aWNzIHNvIGl0IHNob3dzIHRoZSBwcm9wZXIgT1MsXG4gKiB2ZXJzaW9ucyBhbmQgb3RoZXJzLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2J1aWxkVXNlckFnZW50U3RyaW5nRm9yTGludXgoKSB7XG4gIHJldHVybiBgKFgxMTsgTGludXggaTY4NjsgJHtvcy5yZWxlYXNlKCl9OyAke29zLmNwdXMoKVswXS5tb2RlbH0pYDtcbn1cblxuLyoqXG4gKiBCdWlsZCBhIGZha2UgVXNlciBBZ2VudCBzdHJpbmcuIFRoaXMgZ2V0cyBzZW50IHRvIEFuYWx5dGljcyBzbyBpdCBzaG93cyB0aGUgcHJvcGVyIE9TIHZlcnNpb24uXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfYnVpbGRVc2VyQWdlbnRTdHJpbmcoKSB7XG4gIHN3aXRjaCAob3MucGxhdGZvcm0oKSkge1xuICAgIGNhc2UgJ2Rhcndpbic6XG4gICAgICByZXR1cm4gX2J1aWxkVXNlckFnZW50U3RyaW5nRm9yT3N4KCk7XG5cbiAgICBjYXNlICd3aW4zMic6XG4gICAgICByZXR1cm4gX2J1aWxkVXNlckFnZW50U3RyaW5nRm9yV2luZG93cygpO1xuXG4gICAgY2FzZSAnbGludXgnOlxuICAgICAgcmV0dXJuIF9idWlsZFVzZXJBZ2VudFN0cmluZ0ZvckxpbnV4KCk7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIG9zLnBsYXRmb3JtKCkgKyAnICcgKyBvcy5yZWxlYXNlKCk7XG4gIH1cbn1cblxuXG4vKipcbiAqIEltcGxlbWVudGF0aW9uIG9mIHRoZSBBbmFseXRpY3MgaW50ZXJmYWNlIGZvciB1c2luZyBgdW5pdmVyc2FsLWFuYWx5dGljc2AgcGFja2FnZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFVuaXZlcnNhbEFuYWx5dGljcyBpbXBsZW1lbnRzIGFuYWx5dGljcy5BbmFseXRpY3Mge1xuICBwcml2YXRlIF91YTogdWEuVmlzaXRvcjtcbiAgcHJpdmF0ZSBfZGlydHkgPSBmYWxzZTtcblxuICAvKipcbiAgICogQHBhcmFtIHRyYWNraW5nSWQgVGhlIEdvb2dsZSBBbmFseXRpY3MgSUQuXG4gICAqIEBwYXJhbSB1aWQgQSBVc2VyIElELlxuICAgKi9cbiAgY29uc3RydWN0b3IodHJhY2tpbmdJZDogc3RyaW5nLCB1aWQ6IHN0cmluZykge1xuICAgIHRoaXMuX3VhID0gdWEodHJhY2tpbmdJZCwgdWlkLCB7XG4gICAgICBlbmFibGVCYXRjaGluZzogdHJ1ZSxcbiAgICAgIGJhdGNoU2l6ZTogNSxcbiAgICB9KTtcblxuICAgIC8vIEFkZCBwZXJzaXN0ZW50IHBhcmFtcyBmb3IgYXBwVmVyc2lvbi5cbiAgICB0aGlzLl91YS5zZXQoJ2RzJywgJ2NsaScpO1xuICAgIHRoaXMuX3VhLnNldCgndWEnLCBfYnVpbGRVc2VyQWdlbnRTdHJpbmcoKSk7XG4gICAgdGhpcy5fdWEuc2V0KCd1bCcsIF9nZXRMYW5ndWFnZSgpKTtcblxuICAgIC8vIEBhbmd1bGFyL2NsaSB3aXRoIHZlcnNpb24uXG4gICAgdGhpcy5fdWEuc2V0KCdhbicsIHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpLm5hbWUpO1xuICAgIHRoaXMuX3VhLnNldCgnYXYnLCByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKS52ZXJzaW9uKTtcblxuICAgIC8vIFdlIHVzZSB0aGUgYXBwbGljYXRpb24gSUQgZm9yIHRoZSBOb2RlIHZlcnNpb24uIFRoaXMgc2hvdWxkIGJlIFwibm9kZSAxMC4xMC4wXCIuXG4gICAgLy8gV2UgYWxzbyB1c2UgYSBjdXN0b20gbWV0cmljcywgYnV0XG4gICAgdGhpcy5fdWEuc2V0KCdhaWQnLCBfZ2V0Tm9kZVZlcnNpb24oKSk7XG5cbiAgICAvLyBXZSBzZXQgY3VzdG9tIG1ldHJpY3MgZm9yIHZhbHVlcyB3ZSBjYXJlIGFib3V0LlxuICAgIHRoaXMuX3VhLnNldCgnY20xJywgX2dldENwdUNvdW50KCkpO1xuICAgIHRoaXMuX3VhLnNldCgnY20yJywgX2dldENwdVNwZWVkKCkpO1xuICAgIHRoaXMuX3VhLnNldCgnY20zJywgX2dldFJhbVNpemUoKSk7XG4gICAgdGhpcy5fdWEuc2V0KCdjbTQnLCBfZ2V0TnVtZXJpY05vZGVWZXJzaW9uKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgdGhlIGRpbWVuc2lvbiBhbmQgbWV0cmljcyB2YXJpYWJsZXMgdG8gcGFzcyB0byB1bml2ZXJzYWwtYW5hbHl0aWNzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgcHJpdmF0ZSBfY3VzdG9tVmFyaWFibGVzKG9wdGlvbnM6IGFuYWx5dGljcy5DdXN0b21EaW1lbnNpb25zQW5kTWV0cmljc09wdGlvbnMpIHtcbiAgICBjb25zdCBhZGRpdGlvbmFsczogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIHwgbnVtYmVyIHwgc3RyaW5nIH0gPSB7fTtcbiAgICAob3B0aW9ucy5kaW1lbnNpb25zIHx8IFtdKS5mb3JFYWNoKCh2LCBpKSA9PiBhZGRpdGlvbmFsc1snY2QnICsgaV0gPSB2KTtcbiAgICAob3B0aW9ucy5tZXRyaWNzIHx8IFtdKS5mb3JFYWNoKCh2LCBpKSA9PiBhZGRpdGlvbmFsc1snY20nICsgaV0gPSB2KTtcblxuICAgIHJldHVybiBhZGRpdGlvbmFscztcbiAgfVxuXG4gIGV2ZW50KGVjOiBzdHJpbmcsIGVhOiBzdHJpbmcsIG9wdGlvbnM6IGFuYWx5dGljcy5FdmVudE9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHZhcnMgPSB0aGlzLl9jdXN0b21WYXJpYWJsZXMob3B0aW9ucyk7XG4gICAgYW5hbHl0aWNzTG9nRGVidWcoJ2V2ZW50IGVjPSVqLCBlYT0laiwgJWonLCBlYywgZWEsIHZhcnMpO1xuXG4gICAgY29uc3QgeyBsYWJlbDogZWwsIHZhbHVlOiBldiB9ID0gb3B0aW9ucztcbiAgICB0aGlzLl9kaXJ0eSA9IHRydWU7XG4gICAgdGhpcy5fdWEuZXZlbnQoeyBlYywgZWEsIGVsLCBldiwgLi4udmFycyB9KTtcbiAgfVxuICBzY3JlZW52aWV3KGNkOiBzdHJpbmcsIGFuOiBzdHJpbmcsIG9wdGlvbnM6IGFuYWx5dGljcy5TY3JlZW52aWV3T3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgdmFycyA9IHRoaXMuX2N1c3RvbVZhcmlhYmxlcyhvcHRpb25zKTtcbiAgICBhbmFseXRpY3NMb2dEZWJ1Zygnc2NyZWVudmlldyBjZD0laiwgYW49JWosICVqJywgY2QsIGFuLCB2YXJzKTtcblxuICAgIGNvbnN0IHsgYXBwVmVyc2lvbjogYXYsIGFwcElkOiBhaWQsIGFwcEluc3RhbGxlcklkOiBhaWlkIH0gPSBvcHRpb25zO1xuICAgIHRoaXMuX2RpcnR5ID0gdHJ1ZTtcbiAgICB0aGlzLl91YS5zY3JlZW52aWV3KHsgY2QsIGFuLCBhdiwgYWlkLCBhaWlkLCAuLi52YXJzIH0pO1xuICB9XG4gIHBhZ2V2aWV3KGRwOiBzdHJpbmcsIG9wdGlvbnM6IGFuYWx5dGljcy5QYWdldmlld09wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHZhcnMgPSB0aGlzLl9jdXN0b21WYXJpYWJsZXMob3B0aW9ucyk7XG4gICAgYW5hbHl0aWNzTG9nRGVidWcoJ3BhZ2V2aWV3IGRwPSVqLCAlaicsIGRwLCB2YXJzKTtcblxuICAgIGNvbnN0IHsgaG9zdG5hbWU6IGRoLCB0aXRsZTogZHQgfSA9IG9wdGlvbnM7XG4gICAgdGhpcy5fZGlydHkgPSB0cnVlO1xuICAgIHRoaXMuX3VhLnBhZ2V2aWV3KHsgZHAsIGRoLCBkdCwgLi4udmFycyB9KTtcbiAgfVxuICB0aW1pbmcodXRjOiBzdHJpbmcsIHV0djogc3RyaW5nLCB1dHQ6IHN0cmluZyB8IG51bWJlciwgb3B0aW9uczogVGltaW5nT3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgdmFycyA9IHRoaXMuX2N1c3RvbVZhcmlhYmxlcyhvcHRpb25zKTtcbiAgICBhbmFseXRpY3NMb2dEZWJ1ZygndGltaW5nIHV0Yz0laiwgdXR2PSVqLCB1dGw9JWosICVqJywgdXRjLCB1dHYsIHV0dCwgdmFycyk7XG5cbiAgICBjb25zdCB7IGxhYmVsOiB1dGwgfSA9IG9wdGlvbnM7XG4gICAgdGhpcy5fZGlydHkgPSB0cnVlO1xuICAgIHRoaXMuX3VhLnRpbWluZyh7IHV0YywgdXR2LCB1dHQsIHV0bCwgLi4udmFycyB9KTtcbiAgfVxuXG4gIGZsdXNoKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5fZGlydHkpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9kaXJ0eSA9IGZhbHNlO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gdGhpcy5fdWEuc2VuZChyZXNvbHZlKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBTZXQgYW5hbHl0aWNzIHNldHRpbmdzLiBUaGlzIGRvZXMgbm90IHdvcmsgaWYgdGhlIHVzZXIgaXMgbm90IGluc2lkZSBhIHByb2plY3QuXG4gKiBAcGFyYW0gbGV2ZWwgV2hpY2ggY29uZmlnIHRvIHVzZS4gXCJnbG9iYWxcIiBmb3IgdXNlci1sZXZlbCwgYW5kIFwibG9jYWxcIiBmb3IgcHJvamVjdC1sZXZlbC5cbiAqIEBwYXJhbSB2YWx1ZSBFaXRoZXIgYSB1c2VyIElELCB0cnVlIHRvIGdlbmVyYXRlIGEgbmV3IFVzZXIgSUQsIG9yIGZhbHNlIHRvIGRpc2FibGUgYW5hbHl0aWNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0QW5hbHl0aWNzQ29uZmlnKGxldmVsOiAnZ2xvYmFsJyB8ICdsb2NhbCcsIHZhbHVlOiBzdHJpbmcgfCBib29sZWFuKSB7XG4gIGFuYWx5dGljc0RlYnVnKCdzZXR0aW5nICVzIGxldmVsIGFuYWx5dGljcyB0bzogJXMnLCBsZXZlbCwgdmFsdWUpO1xuICBjb25zdCBbY29uZmlnLCBjb25maWdQYXRoXSA9IGdldFdvcmtzcGFjZVJhdyhsZXZlbCk7XG4gIGlmICghY29uZmlnIHx8ICFjb25maWdQYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCAke2xldmVsfSB3b3Jrc3BhY2UuYCk7XG4gIH1cblxuICBjb25zdCBjb25maWdWYWx1ZSA9IGNvbmZpZy52YWx1ZTtcbiAgY29uc3QgY2xpOiBqc29uLkpzb25WYWx1ZSA9IGNvbmZpZ1ZhbHVlWydjbGknXSB8fCAoY29uZmlnVmFsdWVbJ2NsaSddID0ge30pO1xuXG4gIGlmICghanNvbi5pc0pzb25PYmplY3QoY2xpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWcgZm91bmQgYXQgJHtjb25maWdQYXRofS4gQ0xJIHNob3VsZCBiZSBhbiBvYmplY3QuYCk7XG4gIH1cblxuICBpZiAodmFsdWUgPT09IHRydWUpIHtcbiAgICB2YWx1ZSA9IHV1aWRWNCgpO1xuICB9XG4gIGNsaVsnYW5hbHl0aWNzJ10gPSB2YWx1ZTtcblxuICBjb25zdCBvdXRwdXQgPSBKU09OLnN0cmluZ2lmeShjb25maWdWYWx1ZSwgbnVsbCwgMik7XG4gIHdyaXRlRmlsZVN5bmMoY29uZmlnUGF0aCwgb3V0cHV0KTtcbiAgYW5hbHl0aWNzRGVidWcoJ2RvbmUnKTtcbn1cblxuLyoqXG4gKiBQcm9tcHQgdGhlIHVzZXIgZm9yIHVzYWdlIGdhdGhlcmluZyBwZXJtaXNzaW9uLlxuICogQHBhcmFtIGZvcmNlIFdoZXRoZXIgdG8gYXNrIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBvciBub3QgdGhlIHVzZXIgaXMgdXNpbmcgYW4gaW50ZXJhY3RpdmUgc2hlbGwuXG4gKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIHdhcyBzaG93biBhIHByb21wdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByb21wdEdsb2JhbEFuYWx5dGljcyhmb3JjZSA9IGZhbHNlKSB7XG4gIGFuYWx5dGljc0RlYnVnKCdwcm9tcHRpbmcgZ2xvYmFsIGFuYWx5dGljcy4nKTtcbiAgaWYgKGZvcmNlIHx8IChwcm9jZXNzLnN0ZG91dC5pc1RUWSAmJiBwcm9jZXNzLnN0ZGluLmlzVFRZKSkge1xuICAgIGNvbnN0IGFuc3dlcnMgPSBhd2FpdCBpbnF1aXJlci5wcm9tcHQ8eyBhbmFseXRpY3M6IGJvb2xlYW4gfT4oW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnY29uZmlybScsXG4gICAgICAgIG5hbWU6ICdhbmFseXRpY3MnLFxuICAgICAgICBtZXNzYWdlOiB0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBXb3VsZCB5b3UgbGlrZSB0byBzaGFyZSBhbm9ueW1vdXMgdXNhZ2UgZGF0YSB3aXRoIHRoZSBBbmd1bGFyIFRlYW0gYXQgR29vZ2xlIHVuZGVyXG4gICAgICAgICAgR29vZ2xl4oCZcyBQcml2YWN5IFBvbGljeSBhdCBodHRwczovL3BvbGljaWVzLmdvb2dsZS5jb20vcHJpdmFjeT8gRm9yIG1vcmUgZGV0YWlscyBhbmRcbiAgICAgICAgICBob3cgdG8gY2hhbmdlIHRoaXMgc2V0dGluZywgc2VlIGh0dHA6Ly9hbmd1bGFyLmlvL2FuYWx5dGljcy5cbiAgICAgICAgYCxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9LFxuICAgIF0pO1xuXG4gICAgc2V0QW5hbHl0aWNzQ29uZmlnKCdnbG9iYWwnLCBhbnN3ZXJzLmFuYWx5dGljcyk7XG5cbiAgICBpZiAoYW5zd2Vycy5hbmFseXRpY3MpIHtcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIGNvbnNvbGUubG9nKHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIFRoYW5rIHlvdSBmb3Igc2hhcmluZyBhbm9ueW1vdXMgdXNhZ2UgZGF0YS4gV291bGQgeW91IGNoYW5nZSB5b3VyIG1pbmQsIHRoZSBmb2xsb3dpbmdcbiAgICAgICAgY29tbWFuZCB3aWxsIGRpc2FibGUgdGhpcyBmZWF0dXJlIGVudGlyZWx5OlxuXG4gICAgICAgICAgICAke3Rlcm1pbmFsLnllbGxvdygnbmcgYW5hbHl0aWNzIG9mZicpfVxuICAgICAgYCk7XG4gICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogUHJvbXB0IHRoZSB1c2VyIGZvciB1c2FnZSBnYXRoZXJpbmcgcGVybWlzc2lvbiBmb3IgdGhlIGxvY2FsIHByb2plY3QuIEZhaWxzIGlmIHRoZXJlIGlzIG5vXG4gKiBsb2NhbCB3b3Jrc3BhY2UuXG4gKiBAcGFyYW0gZm9yY2UgV2hldGhlciB0byBhc2sgcmVnYXJkbGVzcyBvZiB3aGV0aGVyIG9yIG5vdCB0aGUgdXNlciBpcyB1c2luZyBhbiBpbnRlcmFjdGl2ZSBzaGVsbC5cbiAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIHVzZXIgd2FzIHNob3duIGEgcHJvbXB0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJvbXB0UHJvamVjdEFuYWx5dGljcyhmb3JjZSA9IGZhbHNlKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGFuYWx5dGljc0RlYnVnKCdwcm9tcHRpbmcgdXNlcicpO1xuICBjb25zdCBbY29uZmlnLCBjb25maWdQYXRoXSA9IGdldFdvcmtzcGFjZVJhdygnbG9jYWwnKTtcbiAgaWYgKCFjb25maWcgfHwgIWNvbmZpZ1BhdGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGEgbG9jYWwgd29ya3NwYWNlLiBBcmUgeW91IGluIGEgcHJvamVjdD9gKTtcbiAgfVxuXG4gIGlmIChmb3JjZSB8fCAocHJvY2Vzcy5zdGRvdXQuaXNUVFkgJiYgcHJvY2Vzcy5zdGRpbi5pc1RUWSkpIHtcbiAgICBjb25zdCBhbnN3ZXJzID0gYXdhaXQgaW5xdWlyZXIucHJvbXB0PHsgYW5hbHl0aWNzOiBib29sZWFuIH0+KFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NvbmZpcm0nLFxuICAgICAgICBuYW1lOiAnYW5hbHl0aWNzJyxcbiAgICAgICAgbWVzc2FnZTogdGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgICAgV291bGQgeW91IGxpa2UgdG8gc2hhcmUgYW5vbnltb3VzIHVzYWdlIGRhdGEgYWJvdXQgdGhpcyBwcm9qZWN0IHdpdGggdGhlIEFuZ3VsYXIgVGVhbSBhdFxuICAgICAgICAgIEdvb2dsZSB1bmRlciBHb29nbGXigJlzIFByaXZhY3kgUG9saWN5IGF0IGh0dHBzOi8vcG9saWNpZXMuZ29vZ2xlLmNvbS9wcml2YWN5PyBGb3IgbW9yZVxuICAgICAgICAgIGRldGFpbHMgYW5kIGhvdyB0byBjaGFuZ2UgdGhpcyBzZXR0aW5nLCBzZWUgaHR0cDovL2FuZ3VsYXIuaW8vYW5hbHl0aWNzLlxuXG4gICAgICAgIGAsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSxcbiAgICBdKTtcblxuICAgIHNldEFuYWx5dGljc0NvbmZpZygnbG9jYWwnLCBhbnN3ZXJzLmFuYWx5dGljcyk7XG5cbiAgICBpZiAoYW5zd2Vycy5hbmFseXRpY3MpIHtcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIGNvbnNvbGUubG9nKHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIFRoYW5rIHlvdSBmb3Igc2hhcmluZyBhbm9ueW1vdXMgdXNhZ2UgZGF0YS4gV291bGQgeW91IGNoYW5nZSB5b3VyIG1pbmQsIHRoZSBmb2xsb3dpbmdcbiAgICAgICAgY29tbWFuZCB3aWxsIGRpc2FibGUgdGhpcyBmZWF0dXJlIGVudGlyZWx5OlxuXG4gICAgICAgICAgICAke3Rlcm1pbmFsLnllbGxvdygnbmcgYW5hbHl0aWNzIHByb2plY3Qgb2ZmJyl9XG4gICAgICBgKTtcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuXG4vKipcbiAqIEdldCB0aGUgZ2xvYmFsIGFuYWx5dGljcyBzZXR0aW5nIGZvciB0aGUgdXNlci4gVGhpcyByZXR1cm5zIGEgc3RyaW5nIGZvciBVSUQsIGZhbHNlIGlmIHRoZSB1c2VyXG4gKiBvcHRlZCBvdXQgb2YgYW5hbHl0aWNzLCB0cnVlIGlmIHRoZSB1c2VyIHdhbnRzIHRvIHN0YXkgYW5vbnltb3VzIChubyBjbGllbnQgaWQpLCBhbmQgdW5kZWZpbmVkXG4gKiBpZiB0aGUgdXNlciBoYXMgbm90IGJlZW4gcHJvbXB0ZWQgeWV0LlxuICpcbiAqIElmIGFueSBwcm9ibGVtIGhhcHBlbnMsIGl0IGlzIGNvbnNpZGVyZWQgdGhlIHVzZXIgaGFzIGJlZW4gb3B0aW5nIG91dCBvZiBhbmFseXRpY3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWxBbmFseXRpY3MoKTogc3RyaW5nIHwgYm9vbGVhbiB8IHVuZGVmaW5lZCB7XG4gIGFuYWx5dGljc0RlYnVnKCdnZXRHbG9iYWxBbmFseXRpY3MnKTtcblxuICBpZiAoJ05HX0NMSV9BTkFMWVRJQ1MnIGluIHByb2Nlc3MuZW52KSB7XG4gICAgaWYgKHByb2Nlc3MuZW52WydOR19DTElfQU5BTFlUSUNTJ10gPT0gJ2ZhbHNlJyB8fCBwcm9jZXNzLmVudlsnTkdfQ0xJX0FOQUxZVElDUyddID09ICcnKSB7XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnTkdfQ0xJX0FOQUxZVElDUyBpcyBmYWxzZScpO1xuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChwcm9jZXNzLmVudlsnTkdfQ0xJX0FOQUxZVElDUyddID09PSAnY2knKSB7XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnUnVubmluZyBpbiBDSSBtb2RlJyk7XG5cbiAgICAgIHJldHVybiAnY2knO1xuICAgIH1cbiAgfVxuXG4gIC8vIElmIGFueXRoaW5nIGhhcHBlbnMgd2UganVzdCBrZWVwIHRoZSBOT09QIGFuYWx5dGljcy5cbiAgdHJ5IHtcbiAgICBjb25zdCBnbG9iYWxXb3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIGNvbnN0IGFuYWx5dGljc0NvbmZpZyA9IGdsb2JhbFdvcmtzcGFjZVxuICAgICAgJiYgZ2xvYmFsV29ya3NwYWNlLmdldENsaSgpXG4gICAgICAmJiBnbG9iYWxXb3Jrc3BhY2UuZ2V0Q2xpKClbJ2FuYWx5dGljcyddO1xuXG4gICAgaWYgKGFuYWx5dGljc0NvbmZpZyA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKGFuYWx5dGljc0NvbmZpZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgdWlkOiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICBpZiAodHlwZW9mIGFuYWx5dGljc0NvbmZpZyA9PSAnc3RyaW5nJykge1xuICAgICAgICB1aWQgPSBhbmFseXRpY3NDb25maWc7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhbmFseXRpY3NDb25maWcgPT0gJ29iamVjdCcgJiYgdHlwZW9mIGFuYWx5dGljc0NvbmZpZ1sndWlkJ10gPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdWlkID0gYW5hbHl0aWNzQ29uZmlnWyd1aWQnXTtcbiAgICAgIH1cblxuICAgICAgYW5hbHl0aWNzRGVidWcoJ2NsaWVudCBpZDogJXMnLCB1aWQpO1xuXG4gICAgICByZXR1cm4gdWlkO1xuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=