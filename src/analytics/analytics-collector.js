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
exports.AnalyticsCollector = void 0;
const core_1 = require("@angular-devkit/core");
const child_process_1 = require("child_process");
const debug_1 = __importDefault(require("debug"));
const https = __importStar(require("https"));
const os = __importStar(require("os"));
const querystring = __importStar(require("querystring"));
const version_1 = require("../utilities/version");
/**
 * See: https://developers.google.com/analytics/devguides/collection/protocol/v1/devguide
 */
class AnalyticsCollector {
    constructor(trackingId, userId) {
        this.trackingEventsQueue = [];
        this.parameters = {};
        this.analyticsLogDebug = (0, debug_1.default)('ng:analytics:log');
        // API Version
        this.parameters['v'] = '1';
        // User ID
        this.parameters['cid'] = userId;
        // Tracking
        this.parameters['tid'] = trackingId;
        this.parameters['ds'] = 'cli';
        this.parameters['ua'] = _buildUserAgentString();
        this.parameters['ul'] = _getLanguage();
        // @angular/cli with version.
        this.parameters['an'] = '@angular/cli';
        this.parameters['av'] = version_1.VERSION.full;
        // We use the application ID for the Node version. This should be "node v12.10.0".
        const nodeVersion = `node ${process.version}`;
        this.parameters['aid'] = nodeVersion;
        // Custom dimentions
        // We set custom metrics for values we care about.
        this.parameters['cd' + core_1.analytics.NgCliAnalyticsDimensions.CpuCount] = os.cpus().length;
        // Get the first CPU's speed. It's very rare to have multiple CPUs of different speed (in most
        // non-ARM configurations anyway), so that's all we care about.
        this.parameters['cd' + core_1.analytics.NgCliAnalyticsDimensions.CpuSpeed] = Math.floor(os.cpus()[0].speed);
        this.parameters['cd' + core_1.analytics.NgCliAnalyticsDimensions.RamInGigabytes] = Math.round(os.totalmem() / (1024 * 1024 * 1024));
        this.parameters['cd' + core_1.analytics.NgCliAnalyticsDimensions.NodeVersion] = nodeVersion;
    }
    event(ec, ea, options = {}) {
        const { label: el, value: ev, metrics, dimensions } = options;
        this.addToQueue('event', { ec, ea, el, ev, metrics, dimensions });
    }
    pageview(dp, options = {}) {
        const { hostname: dh, title: dt, metrics, dimensions } = options;
        this.addToQueue('pageview', { dp, dh, dt, metrics, dimensions });
    }
    timing(utc, utv, utt, options = {}) {
        const { label: utl, metrics, dimensions } = options;
        this.addToQueue('timing', { utc, utv, utt, utl, metrics, dimensions });
    }
    screenview(cd, an, options = {}) {
        const { appVersion: av, appId: aid, appInstallerId: aiid, metrics, dimensions } = options;
        this.addToQueue('screenview', { cd, an, av, aid, aiid, metrics, dimensions });
    }
    async flush() {
        const pending = this.trackingEventsQueue.length;
        this.analyticsLogDebug(`flush queue size: ${pending}`);
        if (!pending) {
            return;
        }
        // The below is needed so that if flush is called multiple times,
        // we don't report the same event multiple times.
        const pendingTrackingEvents = this.trackingEventsQueue;
        this.trackingEventsQueue = [];
        try {
            await this.send(pendingTrackingEvents);
        }
        catch (error) {
            // Failure to report analytics shouldn't crash the CLI.
            this.analyticsLogDebug('send error: %j', error);
        }
    }
    addToQueue(eventType, parameters) {
        const { metrics, dimensions, ...restParameters } = parameters;
        const data = {
            ...this.parameters,
            ...restParameters,
            ...this.customVariables({ metrics, dimensions }),
            t: eventType,
        };
        this.analyticsLogDebug('add event to queue: %j', data);
        this.trackingEventsQueue.push(data);
    }
    async send(data) {
        this.analyticsLogDebug('send event: %j', data);
        return new Promise((resolve, reject) => {
            const request = https.request({
                host: 'www.google-analytics.com',
                method: 'POST',
                path: data.length > 1 ? '/batch' : '/collect',
            }, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Analytics reporting failed with status code: ${response.statusCode}.`));
                    return;
                }
            });
            request.on('error', reject);
            const queryParameters = data.map((p) => querystring.stringify(p)).join('\n');
            request.write(queryParameters);
            request.end(resolve);
        });
    }
    /**
     * Creates the dimension and metrics variables to add to the queue.
     * @private
     */
    customVariables(options) {
        const additionals = {};
        const { dimensions, metrics } = options;
        dimensions === null || dimensions === void 0 ? void 0 : dimensions.forEach((v, i) => (additionals[`cd${i}`] = v));
        metrics === null || metrics === void 0 ? void 0 : metrics.forEach((v, i) => (additionals[`cm${i}`] = v));
        return additionals;
    }
}
exports.AnalyticsCollector = AnalyticsCollector;
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
        // We stop here because we try to math out the version for anything greater than 10, and it
        // works. Those versions are standardized using a calculation now.
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
 * Build a fake User Agent string. This gets sent to Analytics so it shows the proper OS version.
 * @private
 */
function _buildUserAgentString() {
    switch (os.platform()) {
        case 'darwin': {
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
        case 'win32':
            return `(Windows NT ${os.release()})`;
        case 'linux':
            return `(X11; Linux i686; ${os.release()}; ${os.cpus()[0].model})`;
        default:
            return os.platform() + ' ' + os.release();
    }
}
/**
 * Get a language code.
 * @private
 */
function _getLanguage() {
    // Note: Windows does not expose the configured language by default.
    return (process.env.LANG || // Default Unix env variable.
        process.env.LC_CTYPE || // For C libraries. Sometimes the above isn't set.
        process.env.LANGSPEC || // For Windows, sometimes this will be set (not always).
        _getWindowsLanguageCode() ||
        '??'); // ¯\_(ツ)_/¯
}
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
        return (0, child_process_1.execSync)('wmic.exe os get locale').toString().trim();
    }
    catch (_a) { }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLWNvbGxlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy9hbmFseXRpY3MvYW5hbHl0aWNzLWNvbGxlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFpRDtBQUNqRCxpREFBeUM7QUFDekMsa0RBQTBCO0FBQzFCLDZDQUErQjtBQUMvQix1Q0FBeUI7QUFDekIseURBQTJDO0FBQzNDLGtEQUErQztBQWlFL0M7O0dBRUc7QUFDSCxNQUFhLGtCQUFrQjtJQUs3QixZQUFZLFVBQWtCLEVBQUUsTUFBYztRQUp0Qyx3QkFBbUIsR0FBZ0QsRUFBRSxDQUFDO1FBQzdELGVBQVUsR0FBOEMsRUFBRSxDQUFDO1FBQzNELHNCQUFpQixHQUFHLElBQUEsZUFBSyxFQUFDLGtCQUFrQixDQUFDLENBQUM7UUFHN0QsY0FBYztRQUNkLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQzNCLFVBQVU7UUFDVixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQztRQUNoQyxXQUFXO1FBQ1gsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxVQUFVLENBQUM7UUFFcEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDOUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxxQkFBcUIsRUFBRSxDQUFDO1FBQ2hELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsWUFBWSxFQUFFLENBQUM7UUFFdkMsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsY0FBYyxDQUFDO1FBQ3ZDLElBQUks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bkIsb0VBQW9FO0lBQ3BFLE9BQU8sQ0FDTCxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSw2QkFBNkI7UUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksa0RBQWtEO1FBQzFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxJQUFJLHdEQUF3RDtRQUNoRix1QkFBdUIsRUFBRTtRQUN6QixJQUFJLENBQ0wsQ0FBQyxDQUFDLFlBQVk7QUFDakIsQ0FBQztBQUVEOzs7R0FHRztBQUNILFNBQVMsdUJBQXVCO0lBQzlCLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ3BDLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0lBRUQsSUFBSTtRQUNGLHlGQUF5RjtRQUN6RixnQkFBZ0I7UUFDaEIsT0FBTyxJQUFBLHdCQUFRLEVBQUMsd0JBQXdCLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztLQUM3RDtJQUFDLFdBQU0sR0FBRTtJQUVWLE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgYW5hbHl0aWNzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5pbXBvcnQgKiBhcyBodHRwcyBmcm9tICdodHRwcyc7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyBxdWVyeXN0cmluZyBmcm9tICdxdWVyeXN0cmluZyc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3ZlcnNpb24nO1xuXG5pbnRlcmZhY2UgQmFzZVBhcmFtZXRlcnMgZXh0ZW5kcyBhbmFseXRpY3MuQ3VzdG9tRGltZW5zaW9uc0FuZE1ldHJpY3NPcHRpb25zIHtcbiAgW2tleTogc3RyaW5nXTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHVuZGVmaW5lZCB8IChzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgdW5kZWZpbmVkKVtdO1xufVxuXG5pbnRlcmZhY2UgU2NyZWVudmlld1BhcmFtZXRlcnMgZXh0ZW5kcyBCYXNlUGFyYW1ldGVycyB7XG4gIC8qKiBTY3JlZW4gTmFtZSAqL1xuICBjZD86IHN0cmluZztcbiAgLyoqIEFwcGxpY2F0aW9uIE5hbWUgKi9cbiAgYW4/OiBzdHJpbmc7XG4gIC8qKiBBcHBsaWNhdGlvbiBWZXJzaW9uICovXG4gIGF2Pzogc3RyaW5nO1xuICAvKiogQXBwbGljYXRpb24gSUQgKi9cbiAgYWlkPzogc3RyaW5nO1xuICAvKiogQXBwbGljYXRpb24gSW5zdGFsbGVyIElEICovXG4gIGFpaWQ/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBUaW1pbmdQYXJhbWV0ZXJzIGV4dGVuZHMgQmFzZVBhcmFtZXRlcnMge1xuICAvKiogVXNlciB0aW1pbmcgY2F0ZWdvcnkgKi9cbiAgdXRjPzogc3RyaW5nO1xuICAvKiogVXNlciB0aW1pbmcgdmFyaWFibGUgbmFtZSAqL1xuICB1dHY/OiBzdHJpbmc7XG4gIC8qKiBVc2VyIHRpbWluZyB0aW1lICovXG4gIHV0dD86IHN0cmluZyB8IG51bWJlcjtcbiAgLyoqIFVzZXIgdGltaW5nIGxhYmVsICovXG4gIHV0bD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFBhZ2V2aWV3UGFyYW1ldGVycyBleHRlbmRzIEJhc2VQYXJhbWV0ZXJzIHtcbiAgLyoqXG4gICAqIERvY3VtZW50IFBhdGhcbiAgICogVGhlIHBhdGggcG9ydGlvbiBvZiB0aGUgcGFnZSBVUkwuIFNob3VsZCBiZWdpbiB3aXRoICcvJy5cbiAgICovXG4gIGRwPzogc3RyaW5nO1xuICAvKiogRG9jdW1lbnQgSG9zdCBOYW1lICovXG4gIGRoPzogc3RyaW5nO1xuICAvKiogRG9jdW1lbnQgVGl0bGUgKi9cbiAgZHQ/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBEb2N1bWVudCBsb2NhdGlvbiBVUkxcbiAgICogVXNlIHRoaXMgcGFyYW1ldGVyIHRvIHNlbmQgdGhlIGZ1bGwgVVJMIChkb2N1bWVudCBsb2NhdGlvbikgb2YgdGhlIHBhZ2Ugb24gd2hpY2ggY29udGVudCByZXNpZGVzLlxuICAgKi9cbiAgZGw/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBFdmVudFBhcmFtZXRlcnMgZXh0ZW5kcyBCYXNlUGFyYW1ldGVycyB7XG4gIC8qKiBFdmVudCBDYXRlZ29yeSAqL1xuICBlYzogc3RyaW5nO1xuICAvKiogRXZlbnQgQWN0aW9uICovXG4gIGVhOiBzdHJpbmc7XG4gIC8qKiBFdmVudCBMYWJlbCAqL1xuICBlbD86IHN0cmluZztcbiAgLyoqXG4gICAqIEV2ZW50IFZhbHVlXG4gICAqIFNwZWNpZmllcyB0aGUgZXZlbnQgdmFsdWUuIFZhbHVlcyBtdXN0IGJlIG5vbi1uZWdhdGl2ZS5cbiAgICovXG4gIGV2Pzogc3RyaW5nIHwgbnVtYmVyO1xuICAvKiogUGFnZSBQYXRoICovXG4gIHA/OiBzdHJpbmc7XG4gIC8qKiBQYWdlICovXG4gIGRwPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFNlZTogaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20vYW5hbHl0aWNzL2Rldmd1aWRlcy9jb2xsZWN0aW9uL3Byb3RvY29sL3YxL2Rldmd1aWRlXG4gKi9cbmV4cG9ydCBjbGFzcyBBbmFseXRpY3NDb2xsZWN0b3IgaW1wbGVtZW50cyBhbmFseXRpY3MuQW5hbHl0aWNzIHtcbiAgcHJpdmF0ZSB0cmFja2luZ0V2ZW50c1F1ZXVlOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuPltdID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgcGFyYW1ldGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbj4gPSB7fTtcbiAgcHJpdmF0ZSByZWFkb25seSBhbmFseXRpY3NMb2dEZWJ1ZyA9IGRlYnVnKCduZzphbmFseXRpY3M6bG9nJyk7XG5cbiAgY29uc3RydWN0b3IodHJhY2tpbmdJZDogc3RyaW5nLCB1c2VySWQ6IHN0cmluZykge1xuICAgIC8vIEFQSSBWZXJzaW9uXG4gICAgdGhpcy5wYXJhbWV0ZXJzWyd2J10gPSAnMSc7XG4gICAgLy8gVXNlciBJRFxuICAgIHRoaXMucGFyYW1ldGVyc1snY2lkJ10gPSB1c2VySWQ7XG4gICAgLy8gVHJhY2tpbmdcbiAgICB0aGlzLnBhcmFtZXRlcnNbJ3RpZCddID0gdHJhY2tpbmdJZDtcblxuICAgIHRoaXMucGFyYW1ldGVyc1snZHMnXSA9ICdjbGknO1xuICAgIHRoaXMucGFyYW1ldGVyc1sndWEnXSA9IF9idWlsZFVzZXJBZ2VudFN0cmluZygpO1xuICAgIHRoaXMucGFyYW1ldGVyc1sndWwnXSA9IF9nZXRMYW5ndWFnZSgpO1xuXG4gICAgLy8gQGFuZ3VsYXIvY2xpIHdpdGggdmVyc2lvbi5cbiAgICB0aGlzLnBhcmFtZXRlcnNbJ2FuJ10gPSAnQGFuZ3VsYXIvY2xpJztcbiAgICB0aGlzLnBhcmFtZXRlcnNbJ2F2J10gPSBWRVJTSU9OLmZ1bGw7XG5cbiAgICAvLyBXZSB1c2UgdGhlIGFwcGxpY2F0aW9uIElEIGZvciB0aGUgTm9kZSB2ZXJzaW9uLiBUaGlzIHNob3VsZCBiZSBcIm5vZGUgdjEyLjEwLjBcIi5cbiAgICBjb25zdCBub2RlVmVyc2lvbiA9IGBub2RlICR7cHJvY2Vzcy52ZXJzaW9ufWA7XG4gICAgdGhpcy5wYXJhbWV0ZXJzWydhaWQnXSA9IG5vZGVWZXJzaW9uO1xuXG4gICAgLy8gQ3VzdG9tIGRpbWVudGlvbnNcbiAgICAvLyBXZSBzZXQgY3VzdG9tIG1ldHJpY3MgZm9yIHZhbHVlcyB3ZSBjYXJlIGFib3V0LlxuICAgIHRoaXMucGFyYW1ldGVyc1snY2QnICsgYW5hbHl0aWNzLk5nQ2xpQW5hbHl0aWNzRGltZW5zaW9ucy5DcHVDb3VudF0gPSBvcy5jcHVzKCkubGVuZ3RoO1xuICAgIC8vIEdldCB0aGUgZmlyc3QgQ1BVJ3Mgc3BlZWQuIEl0J3MgdmVyeSByYXJlIHRvIGhhdmUgbXVsdGlwbGUgQ1BVcyBvZiBkaWZmZXJlbnQgc3BlZWQgKGluIG1vc3RcbiAgICAvLyBub24tQVJNIGNvbmZpZ3VyYXRpb25zIGFueXdheSksIHNvIHRoYXQncyBhbGwgd2UgY2FyZSBhYm91dC5cbiAgICB0aGlzLnBhcmFtZXRlcnNbJ2NkJyArIGFuYWx5dGljcy5OZ0NsaUFuYWx5dGljc0RpbWVuc2lvbnMuQ3B1U3BlZWRdID0gTWF0aC5mbG9vcihcbiAgICAgIG9zLmNwdXMoKVswXS5zcGVlZCxcbiAgICApO1xuICAgIHRoaXMucGFyYW1ldGVyc1snY2QnICsgYW5hbHl0aWNzLk5nQ2xpQW5hbHl0aWNzRGltZW5zaW9ucy5SYW1JbkdpZ2FieXRlc10gPSBNYXRoLnJvdW5kKFxuICAgICAgb3MudG90YWxtZW0oKSAvICgxMDI0ICogMTAyNCAqIDEwMjQpLFxuICAgICk7XG4gICAgdGhpcy5wYXJhbWV0ZXJzWydjZCcgKyBhbmFseXRpY3MuTmdDbGlBbmFseXRpY3NEaW1lbnNpb25zLk5vZGVWZXJzaW9uXSA9IG5vZGVWZXJzaW9uO1xuICB9XG5cbiAgZXZlbnQoZWM6IHN0cmluZywgZWE6IHN0cmluZywgb3B0aW9uczogYW5hbHl0aWNzLkV2ZW50T3B0aW9ucyA9IHt9KTogdm9pZCB7XG4gICAgY29uc3QgeyBsYWJlbDogZWwsIHZhbHVlOiBldiwgbWV0cmljcywgZGltZW5zaW9ucyB9ID0gb3B0aW9ucztcbiAgICB0aGlzLmFkZFRvUXVldWUoJ2V2ZW50JywgeyBlYywgZWEsIGVsLCBldiwgbWV0cmljcywgZGltZW5zaW9ucyB9KTtcbiAgfVxuXG4gIHBhZ2V2aWV3KGRwOiBzdHJpbmcsIG9wdGlvbnM6IGFuYWx5dGljcy5QYWdldmlld09wdGlvbnMgPSB7fSk6IHZvaWQge1xuICAgIGNvbnN0IHsgaG9zdG5hbWU6IGRoLCB0aXRsZTogZHQsIG1ldHJpY3MsIGRpbWVuc2lvbnMgfSA9IG9wdGlvbnM7XG4gICAgdGhpcy5hZGRUb1F1ZXVlKCdwYWdldmlldycsIHsgZHAsIGRoLCBkdCwgbWV0cmljcywgZGltZW5zaW9ucyB9KTtcbiAgfVxuXG4gIHRpbWluZyhcbiAgICB1dGM6IHN0cmluZyxcbiAgICB1dHY6IHN0cmluZyxcbiAgICB1dHQ6IHN0cmluZyB8IG51bWJlcixcbiAgICBvcHRpb25zOiBhbmFseXRpY3MuVGltaW5nT3B0aW9ucyA9IHt9LFxuICApOiB2b2lkIHtcbiAgICBjb25zdCB7IGxhYmVsOiB1dGwsIG1ldHJpY3MsIGRpbWVuc2lvbnMgfSA9IG9wdGlvbnM7XG4gICAgdGhpcy5hZGRUb1F1ZXVlKCd0aW1pbmcnLCB7IHV0YywgdXR2LCB1dHQsIHV0bCwgbWV0cmljcywgZGltZW5zaW9ucyB9KTtcbiAgfVxuXG4gIHNjcmVlbnZpZXcoY2Q6IHN0cmluZywgYW46IHN0cmluZywgb3B0aW9uczogYW5hbHl0aWNzLlNjcmVlbnZpZXdPcHRpb25zID0ge30pOiB2b2lkIHtcbiAgICBjb25zdCB7IGFwcFZlcnNpb246IGF2LCBhcHBJZDogYWlkLCBhcHBJbnN0YWxsZXJJZDogYWlpZCwgbWV0cmljcywgZGltZW5zaW9ucyB9ID0gb3B0aW9ucztcbiAgICB0aGlzLmFkZFRvUXVldWUoJ3NjcmVlbnZpZXcnLCB7IGNkLCBhbiwgYXYsIGFpZCwgYWlpZCwgbWV0cmljcywgZGltZW5zaW9ucyB9KTtcbiAgfVxuXG4gIGFzeW5jIGZsdXNoKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHBlbmRpbmcgPSB0aGlzLnRyYWNraW5nRXZlbnRzUXVldWUubGVuZ3RoO1xuICAgIHRoaXMuYW5hbHl0aWNzTG9nRGVidWcoYGZsdXNoIHF1ZXVlIHNpemU6ICR7cGVuZGluZ31gKTtcblxuICAgIGlmICghcGVuZGluZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRoZSBiZWxvdyBpcyBuZWVkZWQgc28gdGhhdCBpZiBmbHVzaCBpcyBjYWxsZWQgbXVsdGlwbGUgdGltZXMsXG4gICAgLy8gd2UgZG9uJ3QgcmVwb3J0IHRoZSBzYW1lIGV2ZW50IG11bHRpcGxlIHRpbWVzLlxuICAgIGNvbnN0IHBlbmRpbmdUcmFja2luZ0V2ZW50cyA9IHRoaXMudHJhY2tpbmdFdmVudHNRdWV1ZTtcbiAgICB0aGlzLnRyYWNraW5nRXZlbnRzUXVldWUgPSBbXTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnNlbmQocGVuZGluZ1RyYWNraW5nRXZlbnRzKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gRmFpbHVyZSB0byByZXBvcnQgYW5hbHl0aWNzIHNob3VsZG4ndCBjcmFzaCB0aGUgQ0xJLlxuICAgICAgdGhpcy5hbmFseXRpY3NMb2dEZWJ1Zygnc2VuZCBlcnJvcjogJWonLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhZGRUb1F1ZXVlKGV2ZW50VHlwZTogJ2V2ZW50JywgcGFyYW1ldGVyczogRXZlbnRQYXJhbWV0ZXJzKTogdm9pZDtcbiAgcHJpdmF0ZSBhZGRUb1F1ZXVlKGV2ZW50VHlwZTogJ3BhZ2V2aWV3JywgcGFyYW1ldGVyczogUGFnZXZpZXdQYXJhbWV0ZXJzKTogdm9pZDtcbiAgcHJpdmF0ZSBhZGRUb1F1ZXVlKGV2ZW50VHlwZTogJ3RpbWluZycsIHBhcmFtZXRlcnM6IFRpbWluZ1BhcmFtZXRlcnMpOiB2b2lkO1xuICBwcml2YXRlIGFkZFRvUXVldWUoZXZlbnRUeXBlOiAnc2NyZWVudmlldycsIHBhcmFtZXRlcnM6IFNjcmVlbnZpZXdQYXJhbWV0ZXJzKTogdm9pZDtcbiAgcHJpdmF0ZSBhZGRUb1F1ZXVlKFxuICAgIGV2ZW50VHlwZTogJ2V2ZW50JyB8ICdwYWdldmlldycgfCAndGltaW5nJyB8ICdzY3JlZW52aWV3JyxcbiAgICBwYXJhbWV0ZXJzOiBCYXNlUGFyYW1ldGVycyxcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgeyBtZXRyaWNzLCBkaW1lbnNpb25zLCAuLi5yZXN0UGFyYW1ldGVycyB9ID0gcGFyYW1ldGVycztcbiAgICBjb25zdCBkYXRhID0ge1xuICAgICAgLi4udGhpcy5wYXJhbWV0ZXJzLFxuICAgICAgLi4ucmVzdFBhcmFtZXRlcnMsXG4gICAgICAuLi50aGlzLmN1c3RvbVZhcmlhYmxlcyh7IG1ldHJpY3MsIGRpbWVuc2lvbnMgfSksXG4gICAgICB0OiBldmVudFR5cGUsXG4gICAgfTtcblxuICAgIHRoaXMuYW5hbHl0aWNzTG9nRGVidWcoJ2FkZCBldmVudCB0byBxdWV1ZTogJWonLCBkYXRhKTtcbiAgICB0aGlzLnRyYWNraW5nRXZlbnRzUXVldWUucHVzaChkYXRhKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2VuZChkYXRhOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuPltdKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5hbmFseXRpY3NMb2dEZWJ1Zygnc2VuZCBldmVudDogJWonLCBkYXRhKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCByZXF1ZXN0ID0gaHR0cHMucmVxdWVzdChcbiAgICAgICAge1xuICAgICAgICAgIGhvc3Q6ICd3d3cuZ29vZ2xlLWFuYWx5dGljcy5jb20nLFxuICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgIHBhdGg6IGRhdGEubGVuZ3RoID4gMSA/ICcvYmF0Y2gnIDogJy9jb2xsZWN0JyxcbiAgICAgICAgfSxcbiAgICAgICAgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgIT09IDIwMCkge1xuICAgICAgICAgICAgcmVqZWN0KFxuICAgICAgICAgICAgICBuZXcgRXJyb3IoYEFuYWx5dGljcyByZXBvcnRpbmcgZmFpbGVkIHdpdGggc3RhdHVzIGNvZGU6ICR7cmVzcG9uc2Uuc3RhdHVzQ29kZX0uYCksXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgKTtcblxuICAgICAgcmVxdWVzdC5vbignZXJyb3InLCByZWplY3QpO1xuXG4gICAgICBjb25zdCBxdWVyeVBhcmFtZXRlcnMgPSBkYXRhLm1hcCgocCkgPT4gcXVlcnlzdHJpbmcuc3RyaW5naWZ5KHApKS5qb2luKCdcXG4nKTtcbiAgICAgIHJlcXVlc3Qud3JpdGUocXVlcnlQYXJhbWV0ZXJzKTtcbiAgICAgIHJlcXVlc3QuZW5kKHJlc29sdmUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgdGhlIGRpbWVuc2lvbiBhbmQgbWV0cmljcyB2YXJpYWJsZXMgdG8gYWRkIHRvIHRoZSBxdWV1ZS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIHByaXZhdGUgY3VzdG9tVmFyaWFibGVzKFxuICAgIG9wdGlvbnM6IGFuYWx5dGljcy5DdXN0b21EaW1lbnNpb25zQW5kTWV0cmljc09wdGlvbnMsXG4gICk6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4+IHtcbiAgICBjb25zdCBhZGRpdGlvbmFsczogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbj4gPSB7fTtcblxuICAgIGNvbnN0IHsgZGltZW5zaW9ucywgbWV0cmljcyB9ID0gb3B0aW9ucztcbiAgICBkaW1lbnNpb25zPy5mb3JFYWNoKCh2LCBpKSA9PiAoYWRkaXRpb25hbHNbYGNkJHtpfWBdID0gdikpO1xuICAgIG1ldHJpY3M/LmZvckVhY2goKHYsIGkpID0+IChhZGRpdGlvbmFsc1tgY20ke2l9YF0gPSB2KSk7XG5cbiAgICByZXR1cm4gYWRkaXRpb25hbHM7XG4gIH1cbn1cblxuLy8gVGhlc2UgYXJlIGp1c3QgYXBwcm94aW1hdGlvbnMgb2YgVUEgc3RyaW5ncy4gV2UganVzdCB0cnkgdG8gZm9vbCBHb29nbGUgQW5hbHl0aWNzIHRvIGdpdmUgdXMgdGhlXG4vLyBkYXRhIHdlIHdhbnQuXG4vLyBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLndoYXRpc215YnJvd3Nlci5jb20vdXNlcmFnZW50cy9cbmNvbnN0IG9zVmVyc2lvbk1hcDogUmVhZG9ubHk8eyBbb3M6IHN0cmluZ106IHsgW3JlbGVhc2U6IHN0cmluZ106IHN0cmluZyB9IH0+ID0ge1xuICBkYXJ3aW46IHtcbiAgICAnMS4zLjEnOiAnMTBfMF80JyxcbiAgICAnMS40LjEnOiAnMTBfMV8wJyxcbiAgICAnNS4xJzogJzEwXzFfMScsXG4gICAgJzUuMic6ICcxMF8xXzUnLFxuICAgICc2LjAuMSc6ICcxMF8yJyxcbiAgICAnNi44JzogJzEwXzJfOCcsXG4gICAgJzcuMCc6ICcxMF8zXzAnLFxuICAgICc3LjknOiAnMTBfM185JyxcbiAgICAnOC4wJzogJzEwXzRfMCcsXG4gICAgJzguMTEnOiAnMTBfNF8xMScsXG4gICAgJzkuMCc6ICcxMF81XzAnLFxuICAgICc5LjgnOiAnMTBfNV84JyxcbiAgICAnMTAuMCc6ICcxMF82XzAnLFxuICAgICcxMC44JzogJzEwXzZfOCcsXG4gICAgLy8gV2Ugc3RvcCBoZXJlIGJlY2F1c2Ugd2UgdHJ5IHRvIG1hdGggb3V0IHRoZSB2ZXJzaW9uIGZvciBhbnl0aGluZyBncmVhdGVyIHRoYW4gMTAsIGFuZCBpdFxuICAgIC8vIHdvcmtzLiBUaG9zZSB2ZXJzaW9ucyBhcmUgc3RhbmRhcmRpemVkIHVzaW5nIGEgY2FsY3VsYXRpb24gbm93LlxuICB9LFxuICB3aW4zMjoge1xuICAgICc2LjMuOTYwMCc6ICdXaW5kb3dzIDguMScsXG4gICAgJzYuMi45MjAwJzogJ1dpbmRvd3MgOCcsXG4gICAgJzYuMS43NjAxJzogJ1dpbmRvd3MgNyBTUDEnLFxuICAgICc2LjEuNzYwMCc6ICdXaW5kb3dzIDcnLFxuICAgICc2LjAuNjAwMic6ICdXaW5kb3dzIFZpc3RhIFNQMicsXG4gICAgJzYuMC42MDAwJzogJ1dpbmRvd3MgVmlzdGEnLFxuICAgICc1LjEuMjYwMCc6ICdXaW5kb3dzIFhQJyxcbiAgfSxcbn07XG5cbi8qKlxuICogQnVpbGQgYSBmYWtlIFVzZXIgQWdlbnQgc3RyaW5nLiBUaGlzIGdldHMgc2VudCB0byBBbmFseXRpY3Mgc28gaXQgc2hvd3MgdGhlIHByb3BlciBPUyB2ZXJzaW9uLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2J1aWxkVXNlckFnZW50U3RyaW5nKCkge1xuICBzd2l0Y2ggKG9zLnBsYXRmb3JtKCkpIHtcbiAgICBjYXNlICdkYXJ3aW4nOiB7XG4gICAgICBsZXQgdiA9IG9zVmVyc2lvbk1hcC5kYXJ3aW5bb3MucmVsZWFzZSgpXTtcblxuICAgICAgaWYgKCF2KSB7XG4gICAgICAgIC8vIFJlbW92ZSA0IHRvIHRpZSBEYXJ3aW4gdmVyc2lvbiB0byBPU1ggdmVyc2lvbiwgYWRkIG90aGVyIGluZm8uXG4gICAgICAgIGNvbnN0IHggPSBwYXJzZUZsb2F0KG9zLnJlbGVhc2UoKSk7XG4gICAgICAgIGlmICh4ID4gMTApIHtcbiAgICAgICAgICB2ID0gYDEwX2AgKyAoeCAtIDQpLnRvU3RyaW5nKCkucmVwbGFjZSgnLicsICdfJyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgY3B1TW9kZWwgPSBvcy5jcHVzKClbMF0ubW9kZWwubWF0Y2goL15bYS16XSsvaSk7XG4gICAgICBjb25zdCBjcHUgPSBjcHVNb2RlbCA/IGNwdU1vZGVsWzBdIDogb3MuY3B1cygpWzBdLm1vZGVsO1xuXG4gICAgICByZXR1cm4gYChNYWNpbnRvc2g7ICR7Y3B1fSBNYWMgT1MgWCAke3YgfHwgb3MucmVsZWFzZSgpfSlgO1xuICAgIH1cblxuICAgIGNhc2UgJ3dpbjMyJzpcbiAgICAgIHJldHVybiBgKFdpbmRvd3MgTlQgJHtvcy5yZWxlYXNlKCl9KWA7XG5cbiAgICBjYXNlICdsaW51eCc6XG4gICAgICByZXR1cm4gYChYMTE7IExpbnV4IGk2ODY7ICR7b3MucmVsZWFzZSgpfTsgJHtvcy5jcHVzKClbMF0ubW9kZWx9KWA7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIG9zLnBsYXRmb3JtKCkgKyAnICcgKyBvcy5yZWxlYXNlKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBHZXQgYSBsYW5ndWFnZSBjb2RlLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2dldExhbmd1YWdlKCkge1xuICAvLyBOb3RlOiBXaW5kb3dzIGRvZXMgbm90IGV4cG9zZSB0aGUgY29uZmlndXJlZCBsYW5ndWFnZSBieSBkZWZhdWx0LlxuICByZXR1cm4gKFxuICAgIHByb2Nlc3MuZW52LkxBTkcgfHwgLy8gRGVmYXVsdCBVbml4IGVudiB2YXJpYWJsZS5cbiAgICBwcm9jZXNzLmVudi5MQ19DVFlQRSB8fCAvLyBGb3IgQyBsaWJyYXJpZXMuIFNvbWV0aW1lcyB0aGUgYWJvdmUgaXNuJ3Qgc2V0LlxuICAgIHByb2Nlc3MuZW52LkxBTkdTUEVDIHx8IC8vIEZvciBXaW5kb3dzLCBzb21ldGltZXMgdGhpcyB3aWxsIGJlIHNldCAobm90IGFsd2F5cykuXG4gICAgX2dldFdpbmRvd3NMYW5ndWFnZUNvZGUoKSB8fFxuICAgICc/PydcbiAgKTsgLy8gwq9cXF8o44OEKV8vwq9cbn1cblxuLyoqXG4gKiBBdHRlbXB0IHRvIGdldCB0aGUgV2luZG93cyBMYW5ndWFnZSBDb2RlIHN0cmluZy5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9nZXRXaW5kb3dzTGFuZ3VhZ2VDb2RlKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmICghb3MucGxhdGZvcm0oKS5zdGFydHNXaXRoKCd3aW4nKSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICB0cnkge1xuICAgIC8vIFRoaXMgaXMgdHJ1ZSBvbiBXaW5kb3dzIFhQLCA3LCA4IGFuZCAxMCBBRkFJSy4gV291bGQgcmV0dXJuIGVtcHR5IHN0cmluZyBvciBmYWlsIGlmIGl0XG4gICAgLy8gZG9lc24ndCB3b3JrLlxuICAgIHJldHVybiBleGVjU3luYygnd21pYy5leGUgb3MgZ2V0IGxvY2FsZScpLnRvU3RyaW5nKCkudHJpbSgpO1xuICB9IGNhdGNoIHt9XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbiJdfQ==