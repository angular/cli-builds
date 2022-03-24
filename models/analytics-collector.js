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
const version_1 = require("./version");
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
        this.parameters['cd' + core_1.analytics.NgCliAnalyticsDimensions.AngularCLIMajorVersion] =
            version_1.VERSION.major;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLWNvbGxlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9hbmFseXRpY3MtY29sbGVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQWlEO0FBQ2pELGlEQUF5QztBQUN6QyxrREFBMEI7QUFDMUIsNkNBQStCO0FBQy9CLHVDQUF5QjtBQUN6Qix5REFBMkM7QUFDM0MsdUNBQW9DO0FBaUVwQzs7R0FFRztBQUNILE1BQWEsa0JBQWtCO0lBSzdCLFlBQVksVUFBa0IsRUFBRSxNQUFjO1FBSnRDLHdCQUFtQixHQUFnRCxFQUFFLENBQUM7UUFDN0QsZUFBVSxHQUE4QyxFQUFFLENBQUM7UUFDM0Qsc0JBQWlCLEdBQUcsSUFBQSxlQUFLLEVBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUc3RCxjQUFjO1FBQ2QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDM0IsVUFBVTtRQUNWLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBQ2hDLFdBQVc7UUFDWCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLFVBQVUsQ0FBQztRQUVwQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUM5QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLHFCQUFxQixFQUFFLENBQUM7UUFDaEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxZQUFZLEVBQUUsQ0FBQztRQUV2Qyw2QkFBNkI7UUFDN0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxjQUFjLENBQUM7UUFDdkMsSUFBSSxDQUFDLFVBQVUs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RSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7S0FDN0M7QUFDSCxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBUyxZQUFZO0lBQ25CLG9FQUFvRTtJQUNwRSxPQUFPLENBQ0wsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksNkJBQTZCO1FBQ2pELE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxJQUFJLGtEQUFrRDtRQUMxRSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsSUFBSSx3REFBd0Q7UUFDaEYsdUJBQXVCLEVBQUU7UUFDekIsSUFBSSxDQUNMLENBQUMsQ0FBQyxZQUFZO0FBQ2pCLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxTQUFTLHVCQUF1QjtJQUM5QixJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNwQyxPQUFPLFNBQVMsQ0FBQztLQUNsQjtJQUVELElBQUk7UUFDRix5RkFBeUY7UUFDekYsZ0JBQWdCO1FBQ2hCLE9BQU8sSUFBQSx3QkFBUSxFQUFDLHdCQUF3QixDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7S0FDN0Q7SUFBQyxXQUFNLEdBQUU7SUFFVixPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGFuYWx5dGljcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGV4ZWNTeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnO1xuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSAnaHR0cHMnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcXVlcnlzdHJpbmcgZnJvbSAncXVlcnlzdHJpbmcnO1xuaW1wb3J0IHsgVkVSU0lPTiB9IGZyb20gJy4vdmVyc2lvbic7XG5cbmludGVyZmFjZSBCYXNlUGFyYW1ldGVycyBleHRlbmRzIGFuYWx5dGljcy5DdXN0b21EaW1lbnNpb25zQW5kTWV0cmljc09wdGlvbnMge1xuICBba2V5OiBzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgdW5kZWZpbmVkIHwgKHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCB1bmRlZmluZWQpW107XG59XG5cbmludGVyZmFjZSBTY3JlZW52aWV3UGFyYW1ldGVycyBleHRlbmRzIEJhc2VQYXJhbWV0ZXJzIHtcbiAgLyoqIFNjcmVlbiBOYW1lICovXG4gIGNkPzogc3RyaW5nO1xuICAvKiogQXBwbGljYXRpb24gTmFtZSAqL1xuICBhbj86IHN0cmluZztcbiAgLyoqIEFwcGxpY2F0aW9uIFZlcnNpb24gKi9cbiAgYXY/OiBzdHJpbmc7XG4gIC8qKiBBcHBsaWNhdGlvbiBJRCAqL1xuICBhaWQ/OiBzdHJpbmc7XG4gIC8qKiBBcHBsaWNhdGlvbiBJbnN0YWxsZXIgSUQgKi9cbiAgYWlpZD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFRpbWluZ1BhcmFtZXRlcnMgZXh0ZW5kcyBCYXNlUGFyYW1ldGVycyB7XG4gIC8qKiBVc2VyIHRpbWluZyBjYXRlZ29yeSAqL1xuICB1dGM/OiBzdHJpbmc7XG4gIC8qKiBVc2VyIHRpbWluZyB2YXJpYWJsZSBuYW1lICovXG4gIHV0dj86IHN0cmluZztcbiAgLyoqIFVzZXIgdGltaW5nIHRpbWUgKi9cbiAgdXR0Pzogc3RyaW5nIHwgbnVtYmVyO1xuICAvKiogVXNlciB0aW1pbmcgbGFiZWwgKi9cbiAgdXRsPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgUGFnZXZpZXdQYXJhbWV0ZXJzIGV4dGVuZHMgQmFzZVBhcmFtZXRlcnMge1xuICAvKipcbiAgICogRG9jdW1lbnQgUGF0aFxuICAgKiBUaGUgcGF0aCBwb3J0aW9uIG9mIHRoZSBwYWdlIFVSTC4gU2hvdWxkIGJlZ2luIHdpdGggJy8nLlxuICAgKi9cbiAgZHA/OiBzdHJpbmc7XG4gIC8qKiBEb2N1bWVudCBIb3N0IE5hbWUgKi9cbiAgZGg/OiBzdHJpbmc7XG4gIC8qKiBEb2N1bWVudCBUaXRsZSAqL1xuICBkdD86IHN0cmluZztcbiAgLyoqXG4gICAqIERvY3VtZW50IGxvY2F0aW9uIFVSTFxuICAgKiBVc2UgdGhpcyBwYXJhbWV0ZXIgdG8gc2VuZCB0aGUgZnVsbCBVUkwgKGRvY3VtZW50IGxvY2F0aW9uKSBvZiB0aGUgcGFnZSBvbiB3aGljaCBjb250ZW50IHJlc2lkZXMuXG4gICAqL1xuICBkbD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEV2ZW50UGFyYW1ldGVycyBleHRlbmRzIEJhc2VQYXJhbWV0ZXJzIHtcbiAgLyoqIEV2ZW50IENhdGVnb3J5ICovXG4gIGVjOiBzdHJpbmc7XG4gIC8qKiBFdmVudCBBY3Rpb24gKi9cbiAgZWE6IHN0cmluZztcbiAgLyoqIEV2ZW50IExhYmVsICovXG4gIGVsPzogc3RyaW5nO1xuICAvKipcbiAgICogRXZlbnQgVmFsdWVcbiAgICogU3BlY2lmaWVzIHRoZSBldmVudCB2YWx1ZS4gVmFsdWVzIG11c3QgYmUgbm9uLW5lZ2F0aXZlLlxuICAgKi9cbiAgZXY/OiBzdHJpbmcgfCBudW1iZXI7XG4gIC8qKiBQYWdlIFBhdGggKi9cbiAgcD86IHN0cmluZztcbiAgLyoqIFBhZ2UgKi9cbiAgZHA/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogU2VlOiBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS9hbmFseXRpY3MvZGV2Z3VpZGVzL2NvbGxlY3Rpb24vcHJvdG9jb2wvdjEvZGV2Z3VpZGVcbiAqL1xuZXhwb3J0IGNsYXNzIEFuYWx5dGljc0NvbGxlY3RvciBpbXBsZW1lbnRzIGFuYWx5dGljcy5BbmFseXRpY3Mge1xuICBwcml2YXRlIHRyYWNraW5nRXZlbnRzUXVldWU6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4+W10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBwYXJhbWV0ZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuPiA9IHt9O1xuICBwcml2YXRlIHJlYWRvbmx5IGFuYWx5dGljc0xvZ0RlYnVnID0gZGVidWcoJ25nOmFuYWx5dGljczpsb2cnKTtcblxuICBjb25zdHJ1Y3Rvcih0cmFja2luZ0lkOiBzdHJpbmcsIHVzZXJJZDogc3RyaW5nKSB7XG4gICAgLy8gQVBJIFZlcnNpb25cbiAgICB0aGlzLnBhcmFtZXRlcnNbJ3YnXSA9ICcxJztcbiAgICAvLyBVc2VyIElEXG4gICAgdGhpcy5wYXJhbWV0ZXJzWydjaWQnXSA9IHVzZXJJZDtcbiAgICAvLyBUcmFja2luZ1xuICAgIHRoaXMucGFyYW1ldGVyc1sndGlkJ10gPSB0cmFja2luZ0lkO1xuXG4gICAgdGhpcy5wYXJhbWV0ZXJzWydkcyddID0gJ2NsaSc7XG4gICAgdGhpcy5wYXJhbWV0ZXJzWyd1YSddID0gX2J1aWxkVXNlckFnZW50U3RyaW5nKCk7XG4gICAgdGhpcy5wYXJhbWV0ZXJzWyd1bCddID0gX2dldExhbmd1YWdlKCk7XG5cbiAgICAvLyBAYW5ndWxhci9jbGkgd2l0aCB2ZXJzaW9uLlxuICAgIHRoaXMucGFyYW1ldGVyc1snYW4nXSA9ICdAYW5ndWxhci9jbGknO1xuICAgIHRoaXMucGFyYW1ldGVyc1snYXYnXSA9IFZFUlNJT04uZnVsbDtcblxuICAgIC8vIFdlIHVzZSB0aGUgYXBwbGljYXRpb24gSUQgZm9yIHRoZSBOb2RlIHZlcnNpb24uIFRoaXMgc2hvdWxkIGJlIFwibm9kZSB2MTIuMTAuMFwiLlxuICAgIGNvbnN0IG5vZGVWZXJzaW9uID0gYG5vZGUgJHtwcm9jZXNzLnZlcnNpb259YDtcbiAgICB0aGlzLnBhcmFtZXRlcnNbJ2FpZCddID0gbm9kZVZlcnNpb247XG5cbiAgICAvLyBDdXN0b20gZGltZW50aW9uc1xuICAgIC8vIFdlIHNldCBjdXN0b20gbWV0cmljcyBmb3IgdmFsdWVzIHdlIGNhcmUgYWJvdXQuXG4gICAgdGhpcy5wYXJhbWV0ZXJzWydjZCcgKyBhbmFseXRpY3MuTmdDbGlBbmFseXRpY3NEaW1lbnNpb25zLkNwdUNvdW50XSA9IG9zLmNwdXMoKS5sZW5ndGg7XG4gICAgLy8gR2V0IHRoZSBmaXJzdCBDUFUncyBzcGVlZC4gSXQncyB2ZXJ5IHJhcmUgdG8gaGF2ZSBtdWx0aXBsZSBDUFVzIG9mIGRpZmZlcmVudCBzcGVlZCAoaW4gbW9zdFxuICAgIC8vIG5vbi1BUk0gY29uZmlndXJhdGlvbnMgYW55d2F5KSwgc28gdGhhdCdzIGFsbCB3ZSBjYXJlIGFib3V0LlxuICAgIHRoaXMucGFyYW1ldGVyc1snY2QnICsgYW5hbHl0aWNzLk5nQ2xpQW5hbHl0aWNzRGltZW5zaW9ucy5DcHVTcGVlZF0gPSBNYXRoLmZsb29yKFxuICAgICAgb3MuY3B1cygpWzBdLnNwZWVkLFxuICAgICk7XG4gICAgdGhpcy5wYXJhbWV0ZXJzWydjZCcgKyBhbmFseXRpY3MuTmdDbGlBbmFseXRpY3NEaW1lbnNpb25zLlJhbUluR2lnYWJ5dGVzXSA9IE1hdGgucm91bmQoXG4gICAgICBvcy50b3RhbG1lbSgpIC8gKDEwMjQgKiAxMDI0ICogMTAyNCksXG4gICAgKTtcbiAgICB0aGlzLnBhcmFtZXRlcnNbJ2NkJyArIGFuYWx5dGljcy5OZ0NsaUFuYWx5dGljc0RpbWVuc2lvbnMuTm9kZVZlcnNpb25dID0gbm9kZVZlcnNpb247XG5cbiAgICB0aGlzLnBhcmFtZXRlcnNbJ2NkJyArIGFuYWx5dGljcy5OZ0NsaUFuYWx5dGljc0RpbWVuc2lvbnMuQW5ndWxhckNMSU1ham9yVmVyc2lvbl0gPVxuICAgICAgVkVSU0lPTi5tYWpvcjtcbiAgfVxuXG4gIGV2ZW50KGVjOiBzdHJpbmcsIGVhOiBzdHJpbmcsIG9wdGlvbnM6IGFuYWx5dGljcy5FdmVudE9wdGlvbnMgPSB7fSk6IHZvaWQge1xuICAgIGNvbnN0IHsgbGFiZWw6IGVsLCB2YWx1ZTogZXYsIG1ldHJpY3MsIGRpbWVuc2lvbnMgfSA9IG9wdGlvbnM7XG4gICAgdGhpcy5hZGRUb1F1ZXVlKCdldmVudCcsIHsgZWMsIGVhLCBlbCwgZXYsIG1ldHJpY3MsIGRpbWVuc2lvbnMgfSk7XG4gIH1cblxuICBwYWdldmlldyhkcDogc3RyaW5nLCBvcHRpb25zOiBhbmFseXRpY3MuUGFnZXZpZXdPcHRpb25zID0ge30pOiB2b2lkIHtcbiAgICBjb25zdCB7IGhvc3RuYW1lOiBkaCwgdGl0bGU6IGR0LCBtZXRyaWNzLCBkaW1lbnNpb25zIH0gPSBvcHRpb25zO1xuICAgIHRoaXMuYWRkVG9RdWV1ZSgncGFnZXZpZXcnLCB7IGRwLCBkaCwgZHQsIG1ldHJpY3MsIGRpbWVuc2lvbnMgfSk7XG4gIH1cblxuICB0aW1pbmcoXG4gICAgdXRjOiBzdHJpbmcsXG4gICAgdXR2OiBzdHJpbmcsXG4gICAgdXR0OiBzdHJpbmcgfCBudW1iZXIsXG4gICAgb3B0aW9uczogYW5hbHl0aWNzLlRpbWluZ09wdGlvbnMgPSB7fSxcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgeyBsYWJlbDogdXRsLCBtZXRyaWNzLCBkaW1lbnNpb25zIH0gPSBvcHRpb25zO1xuICAgIHRoaXMuYWRkVG9RdWV1ZSgndGltaW5nJywgeyB1dGMsIHV0diwgdXR0LCB1dGwsIG1ldHJpY3MsIGRpbWVuc2lvbnMgfSk7XG4gIH1cblxuICBzY3JlZW52aWV3KGNkOiBzdHJpbmcsIGFuOiBzdHJpbmcsIG9wdGlvbnM6IGFuYWx5dGljcy5TY3JlZW52aWV3T3B0aW9ucyA9IHt9KTogdm9pZCB7XG4gICAgY29uc3QgeyBhcHBWZXJzaW9uOiBhdiwgYXBwSWQ6IGFpZCwgYXBwSW5zdGFsbGVySWQ6IGFpaWQsIG1ldHJpY3MsIGRpbWVuc2lvbnMgfSA9IG9wdGlvbnM7XG4gICAgdGhpcy5hZGRUb1F1ZXVlKCdzY3JlZW52aWV3JywgeyBjZCwgYW4sIGF2LCBhaWQsIGFpaWQsIG1ldHJpY3MsIGRpbWVuc2lvbnMgfSk7XG4gIH1cblxuICBhc3luYyBmbHVzaCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBwZW5kaW5nID0gdGhpcy50cmFja2luZ0V2ZW50c1F1ZXVlLmxlbmd0aDtcbiAgICB0aGlzLmFuYWx5dGljc0xvZ0RlYnVnKGBmbHVzaCBxdWV1ZSBzaXplOiAke3BlbmRpbmd9YCk7XG5cbiAgICBpZiAoIXBlbmRpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBUaGUgYmVsb3cgaXMgbmVlZGVkIHNvIHRoYXQgaWYgZmx1c2ggaXMgY2FsbGVkIG11bHRpcGxlIHRpbWVzLFxuICAgIC8vIHdlIGRvbid0IHJlcG9ydCB0aGUgc2FtZSBldmVudCBtdWx0aXBsZSB0aW1lcy5cbiAgICBjb25zdCBwZW5kaW5nVHJhY2tpbmdFdmVudHMgPSB0aGlzLnRyYWNraW5nRXZlbnRzUXVldWU7XG4gICAgdGhpcy50cmFja2luZ0V2ZW50c1F1ZXVlID0gW107XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zZW5kKHBlbmRpbmdUcmFja2luZ0V2ZW50cyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIEZhaWx1cmUgdG8gcmVwb3J0IGFuYWx5dGljcyBzaG91bGRuJ3QgY3Jhc2ggdGhlIENMSS5cbiAgICAgIHRoaXMuYW5hbHl0aWNzTG9nRGVidWcoJ3NlbmQgZXJyb3I6ICVqJywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYWRkVG9RdWV1ZShldmVudFR5cGU6ICdldmVudCcsIHBhcmFtZXRlcnM6IEV2ZW50UGFyYW1ldGVycyk6IHZvaWQ7XG4gIHByaXZhdGUgYWRkVG9RdWV1ZShldmVudFR5cGU6ICdwYWdldmlldycsIHBhcmFtZXRlcnM6IFBhZ2V2aWV3UGFyYW1ldGVycyk6IHZvaWQ7XG4gIHByaXZhdGUgYWRkVG9RdWV1ZShldmVudFR5cGU6ICd0aW1pbmcnLCBwYXJhbWV0ZXJzOiBUaW1pbmdQYXJhbWV0ZXJzKTogdm9pZDtcbiAgcHJpdmF0ZSBhZGRUb1F1ZXVlKGV2ZW50VHlwZTogJ3NjcmVlbnZpZXcnLCBwYXJhbWV0ZXJzOiBTY3JlZW52aWV3UGFyYW1ldGVycyk6IHZvaWQ7XG4gIHByaXZhdGUgYWRkVG9RdWV1ZShcbiAgICBldmVudFR5cGU6ICdldmVudCcgfCAncGFnZXZpZXcnIHwgJ3RpbWluZycgfCAnc2NyZWVudmlldycsXG4gICAgcGFyYW1ldGVyczogQmFzZVBhcmFtZXRlcnMsXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHsgbWV0cmljcywgZGltZW5zaW9ucywgLi4ucmVzdFBhcmFtZXRlcnMgfSA9IHBhcmFtZXRlcnM7XG4gICAgY29uc3QgZGF0YSA9IHtcbiAgICAgIC4uLnRoaXMucGFyYW1ldGVycyxcbiAgICAgIC4uLnJlc3RQYXJhbWV0ZXJzLFxuICAgICAgLi4udGhpcy5jdXN0b21WYXJpYWJsZXMoeyBtZXRyaWNzLCBkaW1lbnNpb25zIH0pLFxuICAgICAgdDogZXZlbnRUeXBlLFxuICAgIH07XG5cbiAgICB0aGlzLmFuYWx5dGljc0xvZ0RlYnVnKCdhZGQgZXZlbnQgdG8gcXVldWU6ICVqJywgZGF0YSk7XG4gICAgdGhpcy50cmFja2luZ0V2ZW50c1F1ZXVlLnB1c2goZGF0YSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNlbmQoZGF0YTogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbj5bXSk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuYW5hbHl0aWNzTG9nRGVidWcoJ3NlbmQgZXZlbnQ6ICVqJywgZGF0YSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgcmVxdWVzdCA9IGh0dHBzLnJlcXVlc3QoXG4gICAgICAgIHtcbiAgICAgICAgICBob3N0OiAnd3d3Lmdvb2dsZS1hbmFseXRpY3MuY29tJyxcbiAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICBwYXRoOiBkYXRhLmxlbmd0aCA+IDEgPyAnL2JhdGNoJyA6ICcvY29sbGVjdCcsXG4gICAgICAgIH0sXG4gICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlICE9PSAyMDApIHtcbiAgICAgICAgICAgIHJlamVjdChcbiAgICAgICAgICAgICAgbmV3IEVycm9yKGBBbmFseXRpY3MgcmVwb3J0aW5nIGZhaWxlZCB3aXRoIHN0YXR1cyBjb2RlOiAke3Jlc3BvbnNlLnN0YXR1c0NvZGV9LmApLFxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICk7XG5cbiAgICAgIHJlcXVlc3Qub24oJ2Vycm9yJywgcmVqZWN0KTtcblxuICAgICAgY29uc3QgcXVlcnlQYXJhbWV0ZXJzID0gZGF0YS5tYXAoKHApID0+IHF1ZXJ5c3RyaW5nLnN0cmluZ2lmeShwKSkuam9pbignXFxuJyk7XG4gICAgICByZXF1ZXN0LndyaXRlKHF1ZXJ5UGFyYW1ldGVycyk7XG4gICAgICByZXF1ZXN0LmVuZChyZXNvbHZlKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIHRoZSBkaW1lbnNpb24gYW5kIG1ldHJpY3MgdmFyaWFibGVzIHRvIGFkZCB0byB0aGUgcXVldWUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBwcml2YXRlIGN1c3RvbVZhcmlhYmxlcyhcbiAgICBvcHRpb25zOiBhbmFseXRpY3MuQ3VzdG9tRGltZW5zaW9uc0FuZE1ldHJpY3NPcHRpb25zLFxuICApOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuPiB7XG4gICAgY29uc3QgYWRkaXRpb25hbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4+ID0ge307XG5cbiAgICBjb25zdCB7IGRpbWVuc2lvbnMsIG1ldHJpY3MgfSA9IG9wdGlvbnM7XG4gICAgZGltZW5zaW9ucz8uZm9yRWFjaCgodiwgaSkgPT4gKGFkZGl0aW9uYWxzW2BjZCR7aX1gXSA9IHYpKTtcbiAgICBtZXRyaWNzPy5mb3JFYWNoKCh2LCBpKSA9PiAoYWRkaXRpb25hbHNbYGNtJHtpfWBdID0gdikpO1xuXG4gICAgcmV0dXJuIGFkZGl0aW9uYWxzO1xuICB9XG59XG5cbi8vIFRoZXNlIGFyZSBqdXN0IGFwcHJveGltYXRpb25zIG9mIFVBIHN0cmluZ3MuIFdlIGp1c3QgdHJ5IHRvIGZvb2wgR29vZ2xlIEFuYWx5dGljcyB0byBnaXZlIHVzIHRoZVxuLy8gZGF0YSB3ZSB3YW50LlxuLy8gU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy53aGF0aXNteWJyb3dzZXIuY29tL3VzZXJhZ2VudHMvXG5jb25zdCBvc1ZlcnNpb25NYXA6IFJlYWRvbmx5PHsgW29zOiBzdHJpbmddOiB7IFtyZWxlYXNlOiBzdHJpbmddOiBzdHJpbmcgfSB9PiA9IHtcbiAgZGFyd2luOiB7XG4gICAgJzEuMy4xJzogJzEwXzBfNCcsXG4gICAgJzEuNC4xJzogJzEwXzFfMCcsXG4gICAgJzUuMSc6ICcxMF8xXzEnLFxuICAgICc1LjInOiAnMTBfMV81JyxcbiAgICAnNi4wLjEnOiAnMTBfMicsXG4gICAgJzYuOCc6ICcxMF8yXzgnLFxuICAgICc3LjAnOiAnMTBfM18wJyxcbiAgICAnNy45JzogJzEwXzNfOScsXG4gICAgJzguMCc6ICcxMF80XzAnLFxuICAgICc4LjExJzogJzEwXzRfMTEnLFxuICAgICc5LjAnOiAnMTBfNV8wJyxcbiAgICAnOS44JzogJzEwXzVfOCcsXG4gICAgJzEwLjAnOiAnMTBfNl8wJyxcbiAgICAnMTAuOCc6ICcxMF82XzgnLFxuICAgIC8vIFdlIHN0b3AgaGVyZSBiZWNhdXNlIHdlIHRyeSB0byBtYXRoIG91dCB0aGUgdmVyc2lvbiBmb3IgYW55dGhpbmcgZ3JlYXRlciB0aGFuIDEwLCBhbmQgaXRcbiAgICAvLyB3b3Jrcy4gVGhvc2UgdmVyc2lvbnMgYXJlIHN0YW5kYXJkaXplZCB1c2luZyBhIGNhbGN1bGF0aW9uIG5vdy5cbiAgfSxcbiAgd2luMzI6IHtcbiAgICAnNi4zLjk2MDAnOiAnV2luZG93cyA4LjEnLFxuICAgICc2LjIuOTIwMCc6ICdXaW5kb3dzIDgnLFxuICAgICc2LjEuNzYwMSc6ICdXaW5kb3dzIDcgU1AxJyxcbiAgICAnNi4xLjc2MDAnOiAnV2luZG93cyA3JyxcbiAgICAnNi4wLjYwMDInOiAnV2luZG93cyBWaXN0YSBTUDInLFxuICAgICc2LjAuNjAwMCc6ICdXaW5kb3dzIFZpc3RhJyxcbiAgICAnNS4xLjI2MDAnOiAnV2luZG93cyBYUCcsXG4gIH0sXG59O1xuXG4vKipcbiAqIEJ1aWxkIGEgZmFrZSBVc2VyIEFnZW50IHN0cmluZy4gVGhpcyBnZXRzIHNlbnQgdG8gQW5hbHl0aWNzIHNvIGl0IHNob3dzIHRoZSBwcm9wZXIgT1MgdmVyc2lvbi5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9idWlsZFVzZXJBZ2VudFN0cmluZygpIHtcbiAgc3dpdGNoIChvcy5wbGF0Zm9ybSgpKSB7XG4gICAgY2FzZSAnZGFyd2luJzoge1xuICAgICAgbGV0IHYgPSBvc1ZlcnNpb25NYXAuZGFyd2luW29zLnJlbGVhc2UoKV07XG5cbiAgICAgIGlmICghdikge1xuICAgICAgICAvLyBSZW1vdmUgNCB0byB0aWUgRGFyd2luIHZlcnNpb24gdG8gT1NYIHZlcnNpb24sIGFkZCBvdGhlciBpbmZvLlxuICAgICAgICBjb25zdCB4ID0gcGFyc2VGbG9hdChvcy5yZWxlYXNlKCkpO1xuICAgICAgICBpZiAoeCA+IDEwKSB7XG4gICAgICAgICAgdiA9IGAxMF9gICsgKHggLSA0KS50b1N0cmluZygpLnJlcGxhY2UoJy4nLCAnXycpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNwdU1vZGVsID0gb3MuY3B1cygpWzBdLm1vZGVsLm1hdGNoKC9eW2Etel0rL2kpO1xuICAgICAgY29uc3QgY3B1ID0gY3B1TW9kZWwgPyBjcHVNb2RlbFswXSA6IG9zLmNwdXMoKVswXS5tb2RlbDtcblxuICAgICAgcmV0dXJuIGAoTWFjaW50b3NoOyAke2NwdX0gTWFjIE9TIFggJHt2IHx8IG9zLnJlbGVhc2UoKX0pYDtcbiAgICB9XG5cbiAgICBjYXNlICd3aW4zMic6XG4gICAgICByZXR1cm4gYChXaW5kb3dzIE5UICR7b3MucmVsZWFzZSgpfSlgO1xuXG4gICAgY2FzZSAnbGludXgnOlxuICAgICAgcmV0dXJuIGAoWDExOyBMaW51eCBpNjg2OyAke29zLnJlbGVhc2UoKX07ICR7b3MuY3B1cygpWzBdLm1vZGVsfSlgO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBvcy5wbGF0Zm9ybSgpICsgJyAnICsgb3MucmVsZWFzZSgpO1xuICB9XG59XG5cbi8qKlxuICogR2V0IGEgbGFuZ3VhZ2UgY29kZS5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9nZXRMYW5ndWFnZSgpIHtcbiAgLy8gTm90ZTogV2luZG93cyBkb2VzIG5vdCBleHBvc2UgdGhlIGNvbmZpZ3VyZWQgbGFuZ3VhZ2UgYnkgZGVmYXVsdC5cbiAgcmV0dXJuIChcbiAgICBwcm9jZXNzLmVudi5MQU5HIHx8IC8vIERlZmF1bHQgVW5peCBlbnYgdmFyaWFibGUuXG4gICAgcHJvY2Vzcy5lbnYuTENfQ1RZUEUgfHwgLy8gRm9yIEMgbGlicmFyaWVzLiBTb21ldGltZXMgdGhlIGFib3ZlIGlzbid0IHNldC5cbiAgICBwcm9jZXNzLmVudi5MQU5HU1BFQyB8fCAvLyBGb3IgV2luZG93cywgc29tZXRpbWVzIHRoaXMgd2lsbCBiZSBzZXQgKG5vdCBhbHdheXMpLlxuICAgIF9nZXRXaW5kb3dzTGFuZ3VhZ2VDb2RlKCkgfHxcbiAgICAnPz8nXG4gICk7IC8vIMKvXFxfKOODhClfL8KvXG59XG5cbi8qKlxuICogQXR0ZW1wdCB0byBnZXQgdGhlIFdpbmRvd3MgTGFuZ3VhZ2UgQ29kZSBzdHJpbmcuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfZ2V0V2luZG93c0xhbmd1YWdlQ29kZSgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAoIW9zLnBsYXRmb3JtKCkuc3RhcnRzV2l0aCgnd2luJykpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgdHJ5IHtcbiAgICAvLyBUaGlzIGlzIHRydWUgb24gV2luZG93cyBYUCwgNywgOCBhbmQgMTAgQUZBSUsuIFdvdWxkIHJldHVybiBlbXB0eSBzdHJpbmcgb3IgZmFpbCBpZiBpdFxuICAgIC8vIGRvZXNuJ3Qgd29yay5cbiAgICByZXR1cm4gZXhlY1N5bmMoJ3dtaWMuZXhlIG9zIGdldCBsb2NhbGUnKS50b1N0cmluZygpLnRyaW0oKTtcbiAgfSBjYXRjaCB7fVxuXG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG4iXX0=