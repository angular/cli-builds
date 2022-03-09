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
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLWNvbGxlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy9hbmFseXRpY3MvYW5hbHl0aWNzLWNvbGxlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQWlEO0FBQ2pELGlEQUF5QztBQUN6QyxrREFBMEI7QUFDMUIsNkNBQStCO0FBQy9CLHVDQUF5QjtBQUN6Qix5REFBMkM7QUFDM0Msa0RBQStDO0FBaUUvQzs7R0FFRztBQUNILE1BQWEsa0JBQWtCO0lBSzdCLFlBQVksVUFBa0IsRUFBRSxNQUFjO1FBSnRDLHdCQUFtQixHQUFnRCxFQUFFLENBQUM7UUFDN0QsZUFBVSxHQUE4QyxFQUFFLENBQUM7UUFDM0Qsc0JBQWlCLEdBQUcsSUFBQSxlQUFLLEVBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUc3RCxjQUFjO1FBQ2QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDM0IsVUFBVTtRQUNWLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBQ2hDLFdBQVc7UUFDWCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLFVBQVUsQ0FBQztRQUVwQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUM5QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLHFCQUFxQixFQUFFLENBQUM7UUFDaEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxZQUFZLEVBQUUsQ0FBQztRQUV2Qyw2QkFBNkI7UUFDN0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxjQUFjLENBQUM7UUFDdkMsSUFBSSxDQUFD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RUFBb0U7SUFDcEUsT0FBTyxDQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLDZCQUE2QjtRQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsSUFBSSxrREFBa0Q7UUFDMUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksd0RBQXdEO1FBQ2hGLHVCQUF1QixFQUFFO1FBQ3pCLElBQUksQ0FDTCxDQUFDLENBQUMsWUFBWTtBQUNqQixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBUyx1QkFBdUI7SUFDOUIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDcEMsT0FBTyxTQUFTLENBQUM7S0FDbEI7SUFFRCxJQUFJO1FBQ0YseUZBQXlGO1FBQ3pGLGdCQUFnQjtRQUNoQixPQUFPLElBQUEsd0JBQVEsRUFBQyx3QkFBd0IsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO0tBQzdEO0lBQUMsV0FBTSxHQUFFO0lBRVYsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBhbmFseXRpY3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBleGVjU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IGRlYnVnIGZyb20gJ2RlYnVnJztcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHF1ZXJ5c3RyaW5nIGZyb20gJ3F1ZXJ5c3RyaW5nJztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi91dGlsaXRpZXMvdmVyc2lvbic7XG5cbmludGVyZmFjZSBCYXNlUGFyYW1ldGVycyBleHRlbmRzIGFuYWx5dGljcy5DdXN0b21EaW1lbnNpb25zQW5kTWV0cmljc09wdGlvbnMge1xuICBba2V5OiBzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgdW5kZWZpbmVkIHwgKHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCB1bmRlZmluZWQpW107XG59XG5cbmludGVyZmFjZSBTY3JlZW52aWV3UGFyYW1ldGVycyBleHRlbmRzIEJhc2VQYXJhbWV0ZXJzIHtcbiAgLyoqIFNjcmVlbiBOYW1lICovXG4gIGNkPzogc3RyaW5nO1xuICAvKiogQXBwbGljYXRpb24gTmFtZSAqL1xuICBhbj86IHN0cmluZztcbiAgLyoqIEFwcGxpY2F0aW9uIFZlcnNpb24gKi9cbiAgYXY/OiBzdHJpbmc7XG4gIC8qKiBBcHBsaWNhdGlvbiBJRCAqL1xuICBhaWQ/OiBzdHJpbmc7XG4gIC8qKiBBcHBsaWNhdGlvbiBJbnN0YWxsZXIgSUQgKi9cbiAgYWlpZD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFRpbWluZ1BhcmFtZXRlcnMgZXh0ZW5kcyBCYXNlUGFyYW1ldGVycyB7XG4gIC8qKiBVc2VyIHRpbWluZyBjYXRlZ29yeSAqL1xuICB1dGM/OiBzdHJpbmc7XG4gIC8qKiBVc2VyIHRpbWluZyB2YXJpYWJsZSBuYW1lICovXG4gIHV0dj86IHN0cmluZztcbiAgLyoqIFVzZXIgdGltaW5nIHRpbWUgKi9cbiAgdXR0Pzogc3RyaW5nIHwgbnVtYmVyO1xuICAvKiogVXNlciB0aW1pbmcgbGFiZWwgKi9cbiAgdXRsPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgUGFnZXZpZXdQYXJhbWV0ZXJzIGV4dGVuZHMgQmFzZVBhcmFtZXRlcnMge1xuICAvKipcbiAgICogRG9jdW1lbnQgUGF0aFxuICAgKiBUaGUgcGF0aCBwb3J0aW9uIG9mIHRoZSBwYWdlIFVSTC4gU2hvdWxkIGJlZ2luIHdpdGggJy8nLlxuICAgKi9cbiAgZHA/OiBzdHJpbmc7XG4gIC8qKiBEb2N1bWVudCBIb3N0IE5hbWUgKi9cbiAgZGg/OiBzdHJpbmc7XG4gIC8qKiBEb2N1bWVudCBUaXRsZSAqL1xuICBkdD86IHN0cmluZztcbiAgLyoqXG4gICAqIERvY3VtZW50IGxvY2F0aW9uIFVSTFxuICAgKiBVc2UgdGhpcyBwYXJhbWV0ZXIgdG8gc2VuZCB0aGUgZnVsbCBVUkwgKGRvY3VtZW50IGxvY2F0aW9uKSBvZiB0aGUgcGFnZSBvbiB3aGljaCBjb250ZW50IHJlc2lkZXMuXG4gICAqL1xuICBkbD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEV2ZW50UGFyYW1ldGVycyBleHRlbmRzIEJhc2VQYXJhbWV0ZXJzIHtcbiAgLyoqIEV2ZW50IENhdGVnb3J5ICovXG4gIGVjOiBzdHJpbmc7XG4gIC8qKiBFdmVudCBBY3Rpb24gKi9cbiAgZWE6IHN0cmluZztcbiAgLyoqIEV2ZW50IExhYmVsICovXG4gIGVsPzogc3RyaW5nO1xuICAvKipcbiAgICogRXZlbnQgVmFsdWVcbiAgICogU3BlY2lmaWVzIHRoZSBldmVudCB2YWx1ZS4gVmFsdWVzIG11c3QgYmUgbm9uLW5lZ2F0aXZlLlxuICAgKi9cbiAgZXY/OiBzdHJpbmcgfCBudW1iZXI7XG4gIC8qKiBQYWdlIFBhdGggKi9cbiAgcD86IHN0cmluZztcbiAgLyoqIFBhZ2UgKi9cbiAgZHA/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogU2VlOiBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS9hbmFseXRpY3MvZGV2Z3VpZGVzL2NvbGxlY3Rpb24vcHJvdG9jb2wvdjEvZGV2Z3VpZGVcbiAqL1xuZXhwb3J0IGNsYXNzIEFuYWx5dGljc0NvbGxlY3RvciBpbXBsZW1lbnRzIGFuYWx5dGljcy5BbmFseXRpY3Mge1xuICBwcml2YXRlIHRyYWNraW5nRXZlbnRzUXVldWU6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4+W10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBwYXJhbWV0ZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuPiA9IHt9O1xuICBwcml2YXRlIHJlYWRvbmx5IGFuYWx5dGljc0xvZ0RlYnVnID0gZGVidWcoJ25nOmFuYWx5dGljczpsb2cnKTtcblxuICBjb25zdHJ1Y3Rvcih0cmFja2luZ0lkOiBzdHJpbmcsIHVzZXJJZDogc3RyaW5nKSB7XG4gICAgLy8gQVBJIFZlcnNpb25cbiAgICB0aGlzLnBhcmFtZXRlcnNbJ3YnXSA9ICcxJztcbiAgICAvLyBVc2VyIElEXG4gICAgdGhpcy5wYXJhbWV0ZXJzWydjaWQnXSA9IHVzZXJJZDtcbiAgICAvLyBUcmFja2luZ1xuICAgIHRoaXMucGFyYW1ldGVyc1sndGlkJ10gPSB0cmFja2luZ0lkO1xuXG4gICAgdGhpcy5wYXJhbWV0ZXJzWydkcyddID0gJ2NsaSc7XG4gICAgdGhpcy5wYXJhbWV0ZXJzWyd1YSddID0gX2J1aWxkVXNlckFnZW50U3RyaW5nKCk7XG4gICAgdGhpcy5wYXJhbWV0ZXJzWyd1bCddID0gX2dldExhbmd1YWdlKCk7XG5cbiAgICAvLyBAYW5ndWxhci9jbGkgd2l0aCB2ZXJzaW9uLlxuICAgIHRoaXMucGFyYW1ldGVyc1snYW4nXSA9ICdAYW5ndWxhci9jbGknO1xuICAgIHRoaXMucGFyYW1ldGVyc1snYXYnXSA9IFZFUlNJT04uZnVsbDtcblxuICAgIC8vIFdlIHVzZSB0aGUgYXBwbGljYXRpb24gSUQgZm9yIHRoZSBOb2RlIHZlcnNpb24uIFRoaXMgc2hvdWxkIGJlIFwibm9kZSB2MTIuMTAuMFwiLlxuICAgIGNvbnN0IG5vZGVWZXJzaW9uID0gYG5vZGUgJHtwcm9jZXNzLnZlcnNpb259YDtcbiAgICB0aGlzLnBhcmFtZXRlcnNbJ2FpZCddID0gbm9kZVZlcnNpb247XG5cbiAgICAvLyBDdXN0b20gZGltZW50aW9uc1xuICAgIC8vIFdlIHNldCBjdXN0b20gbWV0cmljcyBmb3IgdmFsdWVzIHdlIGNhcmUgYWJvdXQuXG4gICAgdGhpcy5wYXJhbWV0ZXJzWydjZCcgKyBhbmFseXRpY3MuTmdDbGlBbmFseXRpY3NEaW1lbnNpb25zLkNwdUNvdW50XSA9IG9zLmNwdXMoKS5sZW5ndGg7XG4gICAgLy8gR2V0IHRoZSBmaXJzdCBDUFUncyBzcGVlZC4gSXQncyB2ZXJ5IHJhcmUgdG8gaGF2ZSBtdWx0aXBsZSBDUFVzIG9mIGRpZmZlcmVudCBzcGVlZCAoaW4gbW9zdFxuICAgIC8vIG5vbi1BUk0gY29uZmlndXJhdGlvbnMgYW55d2F5KSwgc28gdGhhdCdzIGFsbCB3ZSBjYXJlIGFib3V0LlxuICAgIHRoaXMucGFyYW1ldGVyc1snY2QnICsgYW5hbHl0aWNzLk5nQ2xpQW5hbHl0aWNzRGltZW5zaW9ucy5DcHVTcGVlZF0gPSBNYXRoLmZsb29yKFxuICAgICAgb3MuY3B1cygpWzBdLnNwZWVkLFxuICAgICk7XG4gICAgdGhpcy5wYXJhbWV0ZXJzWydjZCcgKyBhbmFseXRpY3MuTmdDbGlBbmFseXRpY3NEaW1lbnNpb25zLlJhbUluR2lnYWJ5dGVzXSA9IE1hdGgucm91bmQoXG4gICAgICBvcy50b3RhbG1lbSgpIC8gKDEwMjQgKiAxMDI0ICogMTAyNCksXG4gICAgKTtcbiAgICB0aGlzLnBhcmFtZXRlcnNbJ2NkJyArIGFuYWx5dGljcy5OZ0NsaUFuYWx5dGljc0RpbWVuc2lvbnMuTm9kZVZlcnNpb25dID0gbm9kZVZlcnNpb247XG4gIH1cblxuICBldmVudChlYzogc3RyaW5nLCBlYTogc3RyaW5nLCBvcHRpb25zOiBhbmFseXRpY3MuRXZlbnRPcHRpb25zID0ge30pOiB2b2lkIHtcbiAgICBjb25zdCB7IGxhYmVsOiBlbCwgdmFsdWU6IGV2LCBtZXRyaWNzLCBkaW1lbnNpb25zIH0gPSBvcHRpb25zO1xuICAgIHRoaXMuYWRkVG9RdWV1ZSgnZXZlbnQnLCB7IGVjLCBlYSwgZWwsIGV2LCBtZXRyaWNzLCBkaW1lbnNpb25zIH0pO1xuICB9XG5cbiAgcGFnZXZpZXcoZHA6IHN0cmluZywgb3B0aW9uczogYW5hbHl0aWNzLlBhZ2V2aWV3T3B0aW9ucyA9IHt9KTogdm9pZCB7XG4gICAgY29uc3QgeyBob3N0bmFtZTogZGgsIHRpdGxlOiBkdCwgbWV0cmljcywgZGltZW5zaW9ucyB9ID0gb3B0aW9ucztcbiAgICB0aGlzLmFkZFRvUXVldWUoJ3BhZ2V2aWV3JywgeyBkcCwgZGgsIGR0LCBtZXRyaWNzLCBkaW1lbnNpb25zIH0pO1xuICB9XG5cbiAgdGltaW5nKFxuICAgIHV0Yzogc3RyaW5nLFxuICAgIHV0djogc3RyaW5nLFxuICAgIHV0dDogc3RyaW5nIHwgbnVtYmVyLFxuICAgIG9wdGlvbnM6IGFuYWx5dGljcy5UaW1pbmdPcHRpb25zID0ge30sXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHsgbGFiZWw6IHV0bCwgbWV0cmljcywgZGltZW5zaW9ucyB9ID0gb3B0aW9ucztcbiAgICB0aGlzLmFkZFRvUXVldWUoJ3RpbWluZycsIHsgdXRjLCB1dHYsIHV0dCwgdXRsLCBtZXRyaWNzLCBkaW1lbnNpb25zIH0pO1xuICB9XG5cbiAgc2NyZWVudmlldyhjZDogc3RyaW5nLCBhbjogc3RyaW5nLCBvcHRpb25zOiBhbmFseXRpY3MuU2NyZWVudmlld09wdGlvbnMgPSB7fSk6IHZvaWQge1xuICAgIGNvbnN0IHsgYXBwVmVyc2lvbjogYXYsIGFwcElkOiBhaWQsIGFwcEluc3RhbGxlcklkOiBhaWlkLCBtZXRyaWNzLCBkaW1lbnNpb25zIH0gPSBvcHRpb25zO1xuICAgIHRoaXMuYWRkVG9RdWV1ZSgnc2NyZWVudmlldycsIHsgY2QsIGFuLCBhdiwgYWlkLCBhaWlkLCBtZXRyaWNzLCBkaW1lbnNpb25zIH0pO1xuICB9XG5cbiAgYXN5bmMgZmx1c2goKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcGVuZGluZyA9IHRoaXMudHJhY2tpbmdFdmVudHNRdWV1ZS5sZW5ndGg7XG4gICAgdGhpcy5hbmFseXRpY3NMb2dEZWJ1ZyhgZmx1c2ggcXVldWUgc2l6ZTogJHtwZW5kaW5nfWApO1xuXG4gICAgaWYgKCFwZW5kaW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVGhlIGJlbG93IGlzIG5lZWRlZCBzbyB0aGF0IGlmIGZsdXNoIGlzIGNhbGxlZCBtdWx0aXBsZSB0aW1lcyxcbiAgICAvLyB3ZSBkb24ndCByZXBvcnQgdGhlIHNhbWUgZXZlbnQgbXVsdGlwbGUgdGltZXMuXG4gICAgY29uc3QgcGVuZGluZ1RyYWNraW5nRXZlbnRzID0gdGhpcy50cmFja2luZ0V2ZW50c1F1ZXVlO1xuICAgIHRoaXMudHJhY2tpbmdFdmVudHNRdWV1ZSA9IFtdO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2VuZChwZW5kaW5nVHJhY2tpbmdFdmVudHMpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBGYWlsdXJlIHRvIHJlcG9ydCBhbmFseXRpY3Mgc2hvdWxkbid0IGNyYXNoIHRoZSBDTEkuXG4gICAgICB0aGlzLmFuYWx5dGljc0xvZ0RlYnVnKCdzZW5kIGVycm9yOiAlaicsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFkZFRvUXVldWUoZXZlbnRUeXBlOiAnZXZlbnQnLCBwYXJhbWV0ZXJzOiBFdmVudFBhcmFtZXRlcnMpOiB2b2lkO1xuICBwcml2YXRlIGFkZFRvUXVldWUoZXZlbnRUeXBlOiAncGFnZXZpZXcnLCBwYXJhbWV0ZXJzOiBQYWdldmlld1BhcmFtZXRlcnMpOiB2b2lkO1xuICBwcml2YXRlIGFkZFRvUXVldWUoZXZlbnRUeXBlOiAndGltaW5nJywgcGFyYW1ldGVyczogVGltaW5nUGFyYW1ldGVycyk6IHZvaWQ7XG4gIHByaXZhdGUgYWRkVG9RdWV1ZShldmVudFR5cGU6ICdzY3JlZW52aWV3JywgcGFyYW1ldGVyczogU2NyZWVudmlld1BhcmFtZXRlcnMpOiB2b2lkO1xuICBwcml2YXRlIGFkZFRvUXVldWUoXG4gICAgZXZlbnRUeXBlOiAnZXZlbnQnIHwgJ3BhZ2V2aWV3JyB8ICd0aW1pbmcnIHwgJ3NjcmVlbnZpZXcnLFxuICAgIHBhcmFtZXRlcnM6IEJhc2VQYXJhbWV0ZXJzLFxuICApOiB2b2lkIHtcbiAgICBjb25zdCB7IG1ldHJpY3MsIGRpbWVuc2lvbnMsIC4uLnJlc3RQYXJhbWV0ZXJzIH0gPSBwYXJhbWV0ZXJzO1xuICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAuLi50aGlzLnBhcmFtZXRlcnMsXG4gICAgICAuLi5yZXN0UGFyYW1ldGVycyxcbiAgICAgIC4uLnRoaXMuY3VzdG9tVmFyaWFibGVzKHsgbWV0cmljcywgZGltZW5zaW9ucyB9KSxcbiAgICAgIHQ6IGV2ZW50VHlwZSxcbiAgICB9O1xuXG4gICAgdGhpcy5hbmFseXRpY3NMb2dEZWJ1ZygnYWRkIGV2ZW50IHRvIHF1ZXVlOiAlaicsIGRhdGEpO1xuICAgIHRoaXMudHJhY2tpbmdFdmVudHNRdWV1ZS5wdXNoKGRhdGEpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzZW5kKGRhdGE6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4+W10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLmFuYWx5dGljc0xvZ0RlYnVnKCdzZW5kIGV2ZW50OiAlaicsIGRhdGEpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHJlcXVlc3QgPSBodHRwcy5yZXF1ZXN0KFxuICAgICAgICB7XG4gICAgICAgICAgaG9zdDogJ3d3dy5nb29nbGUtYW5hbHl0aWNzLmNvbScsXG4gICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgcGF0aDogZGF0YS5sZW5ndGggPiAxID8gJy9iYXRjaCcgOiAnL2NvbGxlY3QnLFxuICAgICAgICB9LFxuICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG4gICAgICAgICAgICByZWplY3QoXG4gICAgICAgICAgICAgIG5ldyBFcnJvcihgQW5hbHl0aWNzIHJlcG9ydGluZyBmYWlsZWQgd2l0aCBzdGF0dXMgY29kZTogJHtyZXNwb25zZS5zdGF0dXNDb2RlfS5gKSxcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICApO1xuXG4gICAgICByZXF1ZXN0Lm9uKCdlcnJvcicsIHJlamVjdCk7XG5cbiAgICAgIGNvbnN0IHF1ZXJ5UGFyYW1ldGVycyA9IGRhdGEubWFwKChwKSA9PiBxdWVyeXN0cmluZy5zdHJpbmdpZnkocCkpLmpvaW4oJ1xcbicpO1xuICAgICAgcmVxdWVzdC53cml0ZShxdWVyeVBhcmFtZXRlcnMpO1xuICAgICAgcmVxdWVzdC5lbmQocmVzb2x2ZSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyB0aGUgZGltZW5zaW9uIGFuZCBtZXRyaWNzIHZhcmlhYmxlcyB0byBhZGQgdG8gdGhlIHF1ZXVlLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgcHJpdmF0ZSBjdXN0b21WYXJpYWJsZXMoXG4gICAgb3B0aW9uczogYW5hbHl0aWNzLkN1c3RvbURpbWVuc2lvbnNBbmRNZXRyaWNzT3B0aW9ucyxcbiAgKTogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbj4ge1xuICAgIGNvbnN0IGFkZGl0aW9uYWxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuPiA9IHt9O1xuXG4gICAgY29uc3QgeyBkaW1lbnNpb25zLCBtZXRyaWNzIH0gPSBvcHRpb25zO1xuICAgIGRpbWVuc2lvbnM/LmZvckVhY2goKHYsIGkpID0+IChhZGRpdGlvbmFsc1tgY2Qke2l9YF0gPSB2KSk7XG4gICAgbWV0cmljcz8uZm9yRWFjaCgodiwgaSkgPT4gKGFkZGl0aW9uYWxzW2BjbSR7aX1gXSA9IHYpKTtcblxuICAgIHJldHVybiBhZGRpdGlvbmFscztcbiAgfVxufVxuXG4vLyBUaGVzZSBhcmUganVzdCBhcHByb3hpbWF0aW9ucyBvZiBVQSBzdHJpbmdzLiBXZSBqdXN0IHRyeSB0byBmb29sIEdvb2dsZSBBbmFseXRpY3MgdG8gZ2l2ZSB1cyB0aGVcbi8vIGRhdGEgd2Ugd2FudC5cbi8vIFNlZSBodHRwczovL2RldmVsb3BlcnMud2hhdGlzbXlicm93c2VyLmNvbS91c2VyYWdlbnRzL1xuY29uc3Qgb3NWZXJzaW9uTWFwOiBSZWFkb25seTx7IFtvczogc3RyaW5nXTogeyBbcmVsZWFzZTogc3RyaW5nXTogc3RyaW5nIH0gfT4gPSB7XG4gIGRhcndpbjoge1xuICAgICcxLjMuMSc6ICcxMF8wXzQnLFxuICAgICcxLjQuMSc6ICcxMF8xXzAnLFxuICAgICc1LjEnOiAnMTBfMV8xJyxcbiAgICAnNS4yJzogJzEwXzFfNScsXG4gICAgJzYuMC4xJzogJzEwXzInLFxuICAgICc2LjgnOiAnMTBfMl84JyxcbiAgICAnNy4wJzogJzEwXzNfMCcsXG4gICAgJzcuOSc6ICcxMF8zXzknLFxuICAgICc4LjAnOiAnMTBfNF8wJyxcbiAgICAnOC4xMSc6ICcxMF80XzExJyxcbiAgICAnOS4wJzogJzEwXzVfMCcsXG4gICAgJzkuOCc6ICcxMF81XzgnLFxuICAgICcxMC4wJzogJzEwXzZfMCcsXG4gICAgJzEwLjgnOiAnMTBfNl84JyxcbiAgICAvLyBXZSBzdG9wIGhlcmUgYmVjYXVzZSB3ZSB0cnkgdG8gbWF0aCBvdXQgdGhlIHZlcnNpb24gZm9yIGFueXRoaW5nIGdyZWF0ZXIgdGhhbiAxMCwgYW5kIGl0XG4gICAgLy8gd29ya3MuIFRob3NlIHZlcnNpb25zIGFyZSBzdGFuZGFyZGl6ZWQgdXNpbmcgYSBjYWxjdWxhdGlvbiBub3cuXG4gIH0sXG4gIHdpbjMyOiB7XG4gICAgJzYuMy45NjAwJzogJ1dpbmRvd3MgOC4xJyxcbiAgICAnNi4yLjkyMDAnOiAnV2luZG93cyA4JyxcbiAgICAnNi4xLjc2MDEnOiAnV2luZG93cyA3IFNQMScsXG4gICAgJzYuMS43NjAwJzogJ1dpbmRvd3MgNycsXG4gICAgJzYuMC42MDAyJzogJ1dpbmRvd3MgVmlzdGEgU1AyJyxcbiAgICAnNi4wLjYwMDAnOiAnV2luZG93cyBWaXN0YScsXG4gICAgJzUuMS4yNjAwJzogJ1dpbmRvd3MgWFAnLFxuICB9LFxufTtcblxuLyoqXG4gKiBCdWlsZCBhIGZha2UgVXNlciBBZ2VudCBzdHJpbmcuIFRoaXMgZ2V0cyBzZW50IHRvIEFuYWx5dGljcyBzbyBpdCBzaG93cyB0aGUgcHJvcGVyIE9TIHZlcnNpb24uXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfYnVpbGRVc2VyQWdlbnRTdHJpbmcoKSB7XG4gIHN3aXRjaCAob3MucGxhdGZvcm0oKSkge1xuICAgIGNhc2UgJ2Rhcndpbic6IHtcbiAgICAgIGxldCB2ID0gb3NWZXJzaW9uTWFwLmRhcndpbltvcy5yZWxlYXNlKCldO1xuXG4gICAgICBpZiAoIXYpIHtcbiAgICAgICAgLy8gUmVtb3ZlIDQgdG8gdGllIERhcndpbiB2ZXJzaW9uIHRvIE9TWCB2ZXJzaW9uLCBhZGQgb3RoZXIgaW5mby5cbiAgICAgICAgY29uc3QgeCA9IHBhcnNlRmxvYXQob3MucmVsZWFzZSgpKTtcbiAgICAgICAgaWYgKHggPiAxMCkge1xuICAgICAgICAgIHYgPSBgMTBfYCArICh4IC0gNCkudG9TdHJpbmcoKS5yZXBsYWNlKCcuJywgJ18nKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBjcHVNb2RlbCA9IG9zLmNwdXMoKVswXS5tb2RlbC5tYXRjaCgvXlthLXpdKy9pKTtcbiAgICAgIGNvbnN0IGNwdSA9IGNwdU1vZGVsID8gY3B1TW9kZWxbMF0gOiBvcy5jcHVzKClbMF0ubW9kZWw7XG5cbiAgICAgIHJldHVybiBgKE1hY2ludG9zaDsgJHtjcHV9IE1hYyBPUyBYICR7diB8fCBvcy5yZWxlYXNlKCl9KWA7XG4gICAgfVxuXG4gICAgY2FzZSAnd2luMzInOlxuICAgICAgcmV0dXJuIGAoV2luZG93cyBOVCAke29zLnJlbGVhc2UoKX0pYDtcblxuICAgIGNhc2UgJ2xpbnV4JzpcbiAgICAgIHJldHVybiBgKFgxMTsgTGludXggaTY4NjsgJHtvcy5yZWxlYXNlKCl9OyAke29zLmNwdXMoKVswXS5tb2RlbH0pYDtcblxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gb3MucGxhdGZvcm0oKSArICcgJyArIG9zLnJlbGVhc2UoKTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBhIGxhbmd1YWdlIGNvZGUuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfZ2V0TGFuZ3VhZ2UoKSB7XG4gIC8vIE5vdGU6IFdpbmRvd3MgZG9lcyBub3QgZXhwb3NlIHRoZSBjb25maWd1cmVkIGxhbmd1YWdlIGJ5IGRlZmF1bHQuXG4gIHJldHVybiAoXG4gICAgcHJvY2Vzcy5lbnYuTEFORyB8fCAvLyBEZWZhdWx0IFVuaXggZW52IHZhcmlhYmxlLlxuICAgIHByb2Nlc3MuZW52LkxDX0NUWVBFIHx8IC8vIEZvciBDIGxpYnJhcmllcy4gU29tZXRpbWVzIHRoZSBhYm92ZSBpc24ndCBzZXQuXG4gICAgcHJvY2Vzcy5lbnYuTEFOR1NQRUMgfHwgLy8gRm9yIFdpbmRvd3MsIHNvbWV0aW1lcyB0aGlzIHdpbGwgYmUgc2V0IChub3QgYWx3YXlzKS5cbiAgICBfZ2V0V2luZG93c0xhbmd1YWdlQ29kZSgpIHx8XG4gICAgJz8/J1xuICApOyAvLyDCr1xcXyjjg4QpXy/Cr1xufVxuXG4vKipcbiAqIEF0dGVtcHQgdG8gZ2V0IHRoZSBXaW5kb3dzIExhbmd1YWdlIENvZGUgc3RyaW5nLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2dldFdpbmRvd3NMYW5ndWFnZUNvZGUoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKCFvcy5wbGF0Zm9ybSgpLnN0YXJ0c1dpdGgoJ3dpbicpKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHRyeSB7XG4gICAgLy8gVGhpcyBpcyB0cnVlIG9uIFdpbmRvd3MgWFAsIDcsIDggYW5kIDEwIEFGQUlLLiBXb3VsZCByZXR1cm4gZW1wdHkgc3RyaW5nIG9yIGZhaWwgaWYgaXRcbiAgICAvLyBkb2Vzbid0IHdvcmsuXG4gICAgcmV0dXJuIGV4ZWNTeW5jKCd3bWljLmV4ZSBvcyBnZXQgbG9jYWxlJykudG9TdHJpbmcoKS50cmltKCk7XG4gIH0gY2F0Y2gge31cblxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuIl19