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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsCollector = void 0;
const crypto_1 = require("crypto");
const https = __importStar(require("https"));
const os = __importStar(require("os"));
const querystring = __importStar(require("querystring"));
const semver = __importStar(require("semver"));
const environment_options_1 = require("../utilities/environment-options");
const error_1 = require("../utilities/error");
const version_1 = require("../utilities/version");
const analytics_parameters_1 = require("./analytics-parameters");
const TRACKING_ID_PROD = 'G-VETNJBW8L4';
const TRACKING_ID_STAGING = 'G-TBMPRL1BTM';
class AnalyticsCollector {
    context;
    trackingEventsQueue;
    requestParameterStringified;
    userParameters;
    constructor(context, userId) {
        this.context = context;
        const requestParameters = {
            [analytics_parameters_1.RequestParameter.ProtocolVersion]: 2,
            [analytics_parameters_1.RequestParameter.ClientId]: userId,
            [analytics_parameters_1.RequestParameter.UserId]: userId,
            [analytics_parameters_1.RequestParameter.TrackingId]: /^\d+\.\d+\.\d+$/.test(version_1.VERSION.full) && version_1.VERSION.full !== '0.0.0'
                ? TRACKING_ID_PROD
                : TRACKING_ID_STAGING,
            // Built-in user properties
            [analytics_parameters_1.RequestParameter.SessionId]: (0, crypto_1.randomUUID)(),
            [analytics_parameters_1.RequestParameter.UserAgentArchitecture]: os.arch(),
            [analytics_parameters_1.RequestParameter.UserAgentPlatform]: os.platform(),
            [analytics_parameters_1.RequestParameter.UserAgentPlatformVersion]: os.release(),
            [analytics_parameters_1.RequestParameter.UserAgentMobile]: 0,
            [analytics_parameters_1.RequestParameter.SessionEngaged]: 1,
            // The below is needed for tech details to be collected.
            [analytics_parameters_1.RequestParameter.UserAgentFullVersionList]: 'Google%20Chrome;111.0.5563.64|Not(A%3ABrand;8.0.0.0|Chromium;111.0.5563.64',
        };
        if (environment_options_1.ngDebug) {
            requestParameters[analytics_parameters_1.RequestParameter.DebugView] = 1;
        }
        this.requestParameterStringified = querystring.stringify(requestParameters);
        const parsedVersion = semver.parse(process.version);
        const packageManagerVersion = context.packageManager.version;
        this.userParameters = {
            // While architecture is being collect by GA as UserAgentArchitecture.
            // It doesn't look like there is a way to query this. Therefore we collect this as a custom user dimension too.
            [analytics_parameters_1.UserCustomDimension.OsArchitecture]: os.arch(),
            // While User ID is being collected by GA, this is not visible in reports/for filtering.
            [analytics_parameters_1.UserCustomDimension.UserId]: userId,
            [analytics_parameters_1.UserCustomDimension.NodeVersion]: parsedVersion
                ? `${parsedVersion.major}.${parsedVersion.minor}.${parsedVersion.patch}`
                : 'other',
            [analytics_parameters_1.UserCustomDimension.NodeMajorVersion]: parsedVersion?.major,
            [analytics_parameters_1.UserCustomDimension.PackageManager]: context.packageManager.name,
            [analytics_parameters_1.UserCustomDimension.PackageManagerVersion]: packageManagerVersion,
            [analytics_parameters_1.UserCustomDimension.PackageManagerMajorVersion]: packageManagerVersion
                ? +packageManagerVersion.split('.', 1)[0]
                : undefined,
            [analytics_parameters_1.UserCustomDimension.AngularCLIVersion]: version_1.VERSION.full,
            [analytics_parameters_1.UserCustomDimension.AngularCLIMajorVersion]: version_1.VERSION.major,
        };
    }
    reportWorkspaceInfoEvent(parameters) {
        this.event('workspace_info', parameters);
    }
    reportRebuildRunEvent(parameters) {
        this.event('run_rebuild', parameters);
    }
    reportBuildRunEvent(parameters) {
        this.event('run_build', parameters);
    }
    reportArchitectRunEvent(parameters) {
        this.event('run_architect', parameters);
    }
    reportSchematicRunEvent(parameters) {
        this.event('run_schematic', parameters);
    }
    reportCommandRunEvent(command) {
        this.event('run_command', { [analytics_parameters_1.EventCustomDimension.Command]: command });
    }
    event(eventName, parameters) {
        this.trackingEventsQueue ??= [];
        this.trackingEventsQueue.push({
            ...this.userParameters,
            ...parameters,
            'en': eventName,
        });
    }
    /**
     * Flush on an interval (if the event loop is waiting).
     *
     * @returns a method that when called will terminate the periodic
     * flush and call flush one last time.
     */
    periodFlush() {
        let analyticsFlushPromise = Promise.resolve();
        const analyticsFlushInterval = setInterval(() => {
            if (this.trackingEventsQueue?.length) {
                analyticsFlushPromise = analyticsFlushPromise.then(() => this.flush());
            }
        }, 4000);
        return () => {
            clearInterval(analyticsFlushInterval);
            // Flush one last time.
            return analyticsFlushPromise.then(() => this.flush());
        };
    }
    async flush() {
        const pendingTrackingEvents = this.trackingEventsQueue;
        this.context.logger.debug(`Analytics flush size. ${pendingTrackingEvents?.length}.`);
        if (!pendingTrackingEvents?.length) {
            return;
        }
        // The below is needed so that if flush is called multiple times,
        // we don't report the same event multiple times.
        this.trackingEventsQueue = undefined;
        try {
            await this.send(pendingTrackingEvents);
        }
        catch (error) {
            // Failure to report analytics shouldn't crash the CLI.
            (0, error_1.assertIsError)(error);
            this.context.logger.debug(`Send analytics error. ${error.message}.`);
        }
    }
    async send(data) {
        return new Promise((resolve, reject) => {
            const request = https.request({
                host: 'www.google-analytics.com',
                method: 'POST',
                path: '/g/collect?' + this.requestParameterStringified,
                headers: {
                    // The below is needed for tech details to be collected even though we provide our own information from the OS Node.js module
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                },
            }, (response) => {
                // The below is needed as otherwise the response will never close which will cause the CLI not to terminate.
                response.on('data', () => { });
                if (response.statusCode !== 200 && response.statusCode !== 204) {
                    reject(new Error(`Analytics reporting failed with status code: ${response.statusCode}.`));
                }
                else {
                    resolve();
                }
            });
            request.on('error', reject);
            const queryParameters = data.map((p) => querystring.stringify(p)).join('\n');
            request.write(queryParameters);
            request.end();
        });
    }
}
exports.AnalyticsCollector = AnalyticsCollector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLWNvbGxlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy9hbmFseXRpY3MvYW5hbHl0aWNzLWNvbGxlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILG1DQUFvQztBQUNwQyw2Q0FBK0I7QUFDL0IsdUNBQXlCO0FBQ3pCLHlEQUEyQztBQUMzQywrQ0FBaUM7QUFFakMsMEVBQTJEO0FBQzNELDhDQUFtRDtBQUNuRCxrREFBK0M7QUFDL0MsaUVBTWdDO0FBRWhDLE1BQU0sZ0JBQWdCLEdBQUcsY0FBYyxDQUFDO0FBQ3hDLE1BQU0sbUJBQW1CLEdBQUcsY0FBYyxDQUFDO0FBRTNDLE1BQWEsa0JBQWtCO0lBS1Q7SUFKWixtQkFBbUIsQ0FBMkQ7SUFDckUsMkJBQTJCLENBQVM7SUFDcEMsY0FBYyxDQUEwRDtJQUV6RixZQUFvQixPQUF1QixFQUFFLE1BQWM7UUFBdkMsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7UUFDekMsTUFBTSxpQkFBaUIsR0FBc0Q7WUFDM0UsQ0FBQyx1Q0FBZ0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQ3JDLENBQUMsdUNBQWdCLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTTtZQUNuQyxDQUFDLHVDQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU07WUFDakMsQ0FBQyx1Q0FBZ0IsQ0FBQyxVQUFVLENBQUMsRUFDM0IsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGlCQUFPLENBQUMsSUFBSSxDQUFDLElBQUksaUJBQU8sQ0FBQyxJQUFJLEtBQUssT0FBTztnQkFDOUQsQ0FBQyxDQUFDLGdCQUFnQjtnQkFDbEIsQ0FBQyxDQUFDLG1CQUFtQjtZQUV6QiwyQkFBMkI7WUFDM0IsQ0FBQyx1Q0FBZ0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxJ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QUM7aUJBQ0g7cUJBQU07b0JBQ0wsT0FBTyxFQUFFLENBQUM7aUJBQ1g7WUFDSCxDQUFDLENBQ0YsQ0FBQztZQUVGLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzVCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0UsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUMvQixPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUEvS0QsZ0RBK0tDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IHJhbmRvbVVVSUQgfSBmcm9tICdjcnlwdG8nO1xuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSAnaHR0cHMnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcXVlcnlzdHJpbmcgZnJvbSAncXVlcnlzdHJpbmcnO1xuaW1wb3J0ICogYXMgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgdHlwZSB7IENvbW1hbmRDb250ZXh0IH0gZnJvbSAnLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IG5nRGVidWcgfSBmcm9tICcuLi91dGlsaXRpZXMvZW52aXJvbm1lbnQtb3B0aW9ucyc7XG5pbXBvcnQgeyBhc3NlcnRJc0Vycm9yIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2Vycm9yJztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi91dGlsaXRpZXMvdmVyc2lvbic7XG5pbXBvcnQge1xuICBFdmVudEN1c3RvbURpbWVuc2lvbixcbiAgRXZlbnRDdXN0b21NZXRyaWMsXG4gIFByaW1pdGl2ZVR5cGVzLFxuICBSZXF1ZXN0UGFyYW1ldGVyLFxuICBVc2VyQ3VzdG9tRGltZW5zaW9uLFxufSBmcm9tICcuL2FuYWx5dGljcy1wYXJhbWV0ZXJzJztcblxuY29uc3QgVFJBQ0tJTkdfSURfUFJPRCA9ICdHLVZFVE5KQlc4TDQnO1xuY29uc3QgVFJBQ0tJTkdfSURfU1RBR0lORyA9ICdHLVRCTVBSTDFCVE0nO1xuXG5leHBvcnQgY2xhc3MgQW5hbHl0aWNzQ29sbGVjdG9yIHtcbiAgcHJpdmF0ZSB0cmFja2luZ0V2ZW50c1F1ZXVlOiBSZWNvcmQ8c3RyaW5nLCBQcmltaXRpdmVUeXBlcyB8IHVuZGVmaW5lZD5bXSB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSByZWFkb25seSByZXF1ZXN0UGFyYW1ldGVyU3RyaW5naWZpZWQ6IHN0cmluZztcbiAgcHJpdmF0ZSByZWFkb25seSB1c2VyUGFyYW1ldGVyczogUmVjb3JkPFVzZXJDdXN0b21EaW1lbnNpb24sIFByaW1pdGl2ZVR5cGVzIHwgdW5kZWZpbmVkPjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvbnRleHQ6IENvbW1hbmRDb250ZXh0LCB1c2VySWQ6IHN0cmluZykge1xuICAgIGNvbnN0IHJlcXVlc3RQYXJhbWV0ZXJzOiBQYXJ0aWFsPFJlY29yZDxSZXF1ZXN0UGFyYW1ldGVyLCBQcmltaXRpdmVUeXBlcz4+ID0ge1xuICAgICAgW1JlcXVlc3RQYXJhbWV0ZXIuUHJvdG9jb2xWZXJzaW9uXTogMixcbiAgICAgIFtSZXF1ZXN0UGFyYW1ldGVyLkNsaWVudElkXTogdXNlcklkLFxuICAgICAgW1JlcXVlc3RQYXJhbWV0ZXIuVXNlcklkXTogdXNlcklkLFxuICAgICAgW1JlcXVlc3RQYXJhbWV0ZXIuVHJhY2tpbmdJZF06XG4gICAgICAgIC9eXFxkK1xcLlxcZCtcXC5cXGQrJC8udGVzdChWRVJTSU9OLmZ1bGwpICYmIFZFUlNJT04uZnVsbCAhPT0gJzAuMC4wJ1xuICAgICAgICAgID8gVFJBQ0tJTkdfSURfUFJPRFxuICAgICAgICAgIDogVFJBQ0tJTkdfSURfU1RBR0lORyxcblxuICAgICAgLy8gQnVpbHQtaW4gdXNlciBwcm9wZXJ0aWVzXG4gICAgICBbUmVxdWVzdFBhcmFtZXRlci5TZXNzaW9uSWRdOiByYW5kb21VVUlEKCksXG4gICAgICBbUmVxdWVzdFBhcmFtZXRlci5Vc2VyQWdlbnRBcmNoaXRlY3R1cmVdOiBvcy5hcmNoKCksXG4gICAgICBbUmVxdWVzdFBhcmFtZXRlci5Vc2VyQWdlbnRQbGF0Zm9ybV06IG9zLnBsYXRmb3JtKCksXG4gICAgICBbUmVxdWVzdFBhcmFtZXRlci5Vc2VyQWdlbnRQbGF0Zm9ybVZlcnNpb25dOiBvcy5yZWxlYXNlKCksXG4gICAgICBbUmVxdWVzdFBhcmFtZXRlci5Vc2VyQWdlbnRNb2JpbGVdOiAwLFxuICAgICAgW1JlcXVlc3RQYXJhbWV0ZXIuU2Vzc2lvbkVuZ2FnZWRdOiAxLFxuICAgICAgLy8gVGhlIGJlbG93IGlzIG5lZWRlZCBmb3IgdGVjaCBkZXRhaWxzIHRvIGJlIGNvbGxlY3RlZC5cbiAgICAgIFtSZXF1ZXN0UGFyYW1ldGVyLlVzZXJBZ2VudEZ1bGxWZXJzaW9uTGlzdF06XG4gICAgICAgICdHb29nbGUlMjBDaHJvbWU7MTExLjAuNTU2My42NHxOb3QoQSUzQUJyYW5kOzguMC4wLjB8Q2hyb21pdW07MTExLjAuNTU2My42NCcsXG4gICAgfTtcblxuICAgIGlmIChuZ0RlYnVnKSB7XG4gICAgICByZXF1ZXN0UGFyYW1ldGVyc1tSZXF1ZXN0UGFyYW1ldGVyLkRlYnVnVmlld10gPSAxO1xuICAgIH1cblxuICAgIHRoaXMucmVxdWVzdFBhcmFtZXRlclN0cmluZ2lmaWVkID0gcXVlcnlzdHJpbmcuc3RyaW5naWZ5KHJlcXVlc3RQYXJhbWV0ZXJzKTtcblxuICAgIGNvbnN0IHBhcnNlZFZlcnNpb24gPSBzZW12ZXIucGFyc2UocHJvY2Vzcy52ZXJzaW9uKTtcbiAgICBjb25zdCBwYWNrYWdlTWFuYWdlclZlcnNpb24gPSBjb250ZXh0LnBhY2thZ2VNYW5hZ2VyLnZlcnNpb247XG5cbiAgICB0aGlzLnVzZXJQYXJhbWV0ZXJzID0ge1xuICAgICAgLy8gV2hpbGUgYXJjaGl0ZWN0dXJlIGlzIGJlaW5nIGNvbGxlY3QgYnkgR0EgYXMgVXNlckFnZW50QXJjaGl0ZWN0dXJlLlxuICAgICAgLy8gSXQgZG9lc24ndCBsb29rIGxpa2UgdGhlcmUgaXMgYSB3YXkgdG8gcXVlcnkgdGhpcy4gVGhlcmVmb3JlIHdlIGNvbGxlY3QgdGhpcyBhcyBhIGN1c3RvbSB1c2VyIGRpbWVuc2lvbiB0b28uXG4gICAgICBbVXNlckN1c3RvbURpbWVuc2lvbi5Pc0FyY2hpdGVjdHVyZV06IG9zLmFyY2goKSxcbiAgICAgIC8vIFdoaWxlIFVzZXIgSUQgaXMgYmVpbmcgY29sbGVjdGVkIGJ5IEdBLCB0aGlzIGlzIG5vdCB2aXNpYmxlIGluIHJlcG9ydHMvZm9yIGZpbHRlcmluZy5cbiAgICAgIFtVc2VyQ3VzdG9tRGltZW5zaW9uLlVzZXJJZF06IHVzZXJJZCxcbiAgICAgIFtVc2VyQ3VzdG9tRGltZW5zaW9uLk5vZGVWZXJzaW9uXTogcGFyc2VkVmVyc2lvblxuICAgICAgICA/IGAke3BhcnNlZFZlcnNpb24ubWFqb3J9LiR7cGFyc2VkVmVyc2lvbi5taW5vcn0uJHtwYXJzZWRWZXJzaW9uLnBhdGNofWBcbiAgICAgICAgOiAnb3RoZXInLFxuICAgICAgW1VzZXJDdXN0b21EaW1lbnNpb24uTm9kZU1ham9yVmVyc2lvbl06IHBhcnNlZFZlcnNpb24/Lm1ham9yLFxuICAgICAgW1VzZXJDdXN0b21EaW1lbnNpb24uUGFja2FnZU1hbmFnZXJdOiBjb250ZXh0LnBhY2thZ2VNYW5hZ2VyLm5hbWUsXG4gICAgICBbVXNlckN1c3RvbURpbWVuc2lvbi5QYWNrYWdlTWFuYWdlclZlcnNpb25dOiBwYWNrYWdlTWFuYWdlclZlcnNpb24sXG4gICAgICBbVXNlckN1c3RvbURpbWVuc2lvbi5QYWNrYWdlTWFuYWdlck1ham9yVmVyc2lvbl06IHBhY2thZ2VNYW5hZ2VyVmVyc2lvblxuICAgICAgICA/ICtwYWNrYWdlTWFuYWdlclZlcnNpb24uc3BsaXQoJy4nLCAxKVswXVxuICAgICAgICA6IHVuZGVmaW5lZCxcbiAgICAgIFtVc2VyQ3VzdG9tRGltZW5zaW9uLkFuZ3VsYXJDTElWZXJzaW9uXTogVkVSU0lPTi5mdWxsLFxuICAgICAgW1VzZXJDdXN0b21EaW1lbnNpb24uQW5ndWxhckNMSU1ham9yVmVyc2lvbl06IFZFUlNJT04ubWFqb3IsXG4gICAgfTtcbiAgfVxuXG4gIHJlcG9ydFdvcmtzcGFjZUluZm9FdmVudChcbiAgICBwYXJhbWV0ZXJzOiBQYXJ0aWFsPFJlY29yZDxFdmVudEN1c3RvbU1ldHJpYywgc3RyaW5nIHwgYm9vbGVhbiB8IG51bWJlciB8IHVuZGVmaW5lZD4+LFxuICApOiB2b2lkIHtcbiAgICB0aGlzLmV2ZW50KCd3b3Jrc3BhY2VfaW5mbycsIHBhcmFtZXRlcnMpO1xuICB9XG5cbiAgcmVwb3J0UmVidWlsZFJ1bkV2ZW50KFxuICAgIHBhcmFtZXRlcnM6IFBhcnRpYWw8XG4gICAgICBSZWNvcmQ8RXZlbnRDdXN0b21NZXRyaWMgJiBFdmVudEN1c3RvbURpbWVuc2lvbiwgc3RyaW5nIHwgYm9vbGVhbiB8IG51bWJlciB8IHVuZGVmaW5lZD5cbiAgICA+LFxuICApOiB2b2lkIHtcbiAgICB0aGlzLmV2ZW50KCdydW5fcmVidWlsZCcsIHBhcmFtZXRlcnMpO1xuICB9XG5cbiAgcmVwb3J0QnVpbGRSdW5FdmVudChcbiAgICBwYXJhbWV0ZXJzOiBQYXJ0aWFsPFxuICAgICAgUmVjb3JkPEV2ZW50Q3VzdG9tTWV0cmljICYgRXZlbnRDdXN0b21EaW1lbnNpb24sIHN0cmluZyB8IGJvb2xlYW4gfCBudW1iZXIgfCB1bmRlZmluZWQ+XG4gICAgPixcbiAgKTogdm9pZCB7XG4gICAgdGhpcy5ldmVudCgncnVuX2J1aWxkJywgcGFyYW1ldGVycyk7XG4gIH1cblxuICByZXBvcnRBcmNoaXRlY3RSdW5FdmVudChwYXJhbWV0ZXJzOiBQYXJ0aWFsPFJlY29yZDxFdmVudEN1c3RvbURpbWVuc2lvbiwgUHJpbWl0aXZlVHlwZXM+Pik6IHZvaWQge1xuICAgIHRoaXMuZXZlbnQoJ3J1bl9hcmNoaXRlY3QnLCBwYXJhbWV0ZXJzKTtcbiAgfVxuXG4gIHJlcG9ydFNjaGVtYXRpY1J1bkV2ZW50KHBhcmFtZXRlcnM6IFBhcnRpYWw8UmVjb3JkPEV2ZW50Q3VzdG9tRGltZW5zaW9uLCBQcmltaXRpdmVUeXBlcz4+KTogdm9pZCB7XG4gICAgdGhpcy5ldmVudCgncnVuX3NjaGVtYXRpYycsIHBhcmFtZXRlcnMpO1xuICB9XG5cbiAgcmVwb3J0Q29tbWFuZFJ1bkV2ZW50KGNvbW1hbmQ6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMuZXZlbnQoJ3J1bl9jb21tYW5kJywgeyBbRXZlbnRDdXN0b21EaW1lbnNpb24uQ29tbWFuZF06IGNvbW1hbmQgfSk7XG4gIH1cblxuICBwcml2YXRlIGV2ZW50KGV2ZW50TmFtZTogc3RyaW5nLCBwYXJhbWV0ZXJzPzogUmVjb3JkPHN0cmluZywgUHJpbWl0aXZlVHlwZXM+KTogdm9pZCB7XG4gICAgdGhpcy50cmFja2luZ0V2ZW50c1F1ZXVlID8/PSBbXTtcbiAgICB0aGlzLnRyYWNraW5nRXZlbnRzUXVldWUucHVzaCh7XG4gICAgICAuLi50aGlzLnVzZXJQYXJhbWV0ZXJzLFxuICAgICAgLi4ucGFyYW1ldGVycyxcbiAgICAgICdlbic6IGV2ZW50TmFtZSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGbHVzaCBvbiBhbiBpbnRlcnZhbCAoaWYgdGhlIGV2ZW50IGxvb3AgaXMgd2FpdGluZykuXG4gICAqXG4gICAqIEByZXR1cm5zIGEgbWV0aG9kIHRoYXQgd2hlbiBjYWxsZWQgd2lsbCB0ZXJtaW5hdGUgdGhlIHBlcmlvZGljXG4gICAqIGZsdXNoIGFuZCBjYWxsIGZsdXNoIG9uZSBsYXN0IHRpbWUuXG4gICAqL1xuICBwZXJpb2RGbHVzaCgpOiAoKSA9PiBQcm9taXNlPHZvaWQ+IHtcbiAgICBsZXQgYW5hbHl0aWNzRmx1c2hQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgY29uc3QgYW5hbHl0aWNzRmx1c2hJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIGlmICh0aGlzLnRyYWNraW5nRXZlbnRzUXVldWU/Lmxlbmd0aCkge1xuICAgICAgICBhbmFseXRpY3NGbHVzaFByb21pc2UgPSBhbmFseXRpY3NGbHVzaFByb21pc2UudGhlbigoKSA9PiB0aGlzLmZsdXNoKCkpO1xuICAgICAgfVxuICAgIH0sIDQwMDApO1xuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGNsZWFySW50ZXJ2YWwoYW5hbHl0aWNzRmx1c2hJbnRlcnZhbCk7XG5cbiAgICAgIC8vIEZsdXNoIG9uZSBsYXN0IHRpbWUuXG4gICAgICByZXR1cm4gYW5hbHl0aWNzRmx1c2hQcm9taXNlLnRoZW4oKCkgPT4gdGhpcy5mbHVzaCgpKTtcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgZmx1c2goKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcGVuZGluZ1RyYWNraW5nRXZlbnRzID0gdGhpcy50cmFja2luZ0V2ZW50c1F1ZXVlO1xuICAgIHRoaXMuY29udGV4dC5sb2dnZXIuZGVidWcoYEFuYWx5dGljcyBmbHVzaCBzaXplLiAke3BlbmRpbmdUcmFja2luZ0V2ZW50cz8ubGVuZ3RofS5gKTtcblxuICAgIGlmICghcGVuZGluZ1RyYWNraW5nRXZlbnRzPy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBUaGUgYmVsb3cgaXMgbmVlZGVkIHNvIHRoYXQgaWYgZmx1c2ggaXMgY2FsbGVkIG11bHRpcGxlIHRpbWVzLFxuICAgIC8vIHdlIGRvbid0IHJlcG9ydCB0aGUgc2FtZSBldmVudCBtdWx0aXBsZSB0aW1lcy5cbiAgICB0aGlzLnRyYWNraW5nRXZlbnRzUXVldWUgPSB1bmRlZmluZWQ7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zZW5kKHBlbmRpbmdUcmFja2luZ0V2ZW50cyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIEZhaWx1cmUgdG8gcmVwb3J0IGFuYWx5dGljcyBzaG91bGRuJ3QgY3Jhc2ggdGhlIENMSS5cbiAgICAgIGFzc2VydElzRXJyb3IoZXJyb3IpO1xuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5kZWJ1ZyhgU2VuZCBhbmFseXRpY3MgZXJyb3IuICR7ZXJyb3IubWVzc2FnZX0uYCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzZW5kKGRhdGE6IFJlY29yZDxzdHJpbmcsIFByaW1pdGl2ZVR5cGVzIHwgdW5kZWZpbmVkPltdKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHJlcXVlc3QgPSBodHRwcy5yZXF1ZXN0KFxuICAgICAgICB7XG4gICAgICAgICAgaG9zdDogJ3d3dy5nb29nbGUtYW5hbHl0aWNzLmNvbScsXG4gICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgcGF0aDogJy9nL2NvbGxlY3Q/JyArIHRoaXMucmVxdWVzdFBhcmFtZXRlclN0cmluZ2lmaWVkLFxuICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgIC8vIFRoZSBiZWxvdyBpcyBuZWVkZWQgZm9yIHRlY2ggZGV0YWlscyB0byBiZSBjb2xsZWN0ZWQgZXZlbiB0aG91Z2ggd2UgcHJvdmlkZSBvdXIgb3duIGluZm9ybWF0aW9uIGZyb20gdGhlIE9TIE5vZGUuanMgbW9kdWxlXG4gICAgICAgICAgICAndXNlci1hZ2VudCc6XG4gICAgICAgICAgICAgICdNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvMTExLjAuMC4wIFNhZmFyaS81MzcuMzYnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgIC8vIFRoZSBiZWxvdyBpcyBuZWVkZWQgYXMgb3RoZXJ3aXNlIHRoZSByZXNwb25zZSB3aWxsIG5ldmVyIGNsb3NlIHdoaWNoIHdpbGwgY2F1c2UgdGhlIENMSSBub3QgdG8gdGVybWluYXRlLlxuICAgICAgICAgIHJlc3BvbnNlLm9uKCdkYXRhJywgKCkgPT4ge30pO1xuXG4gICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgIT09IDIwMCAmJiByZXNwb25zZS5zdGF0dXNDb2RlICE9PSAyMDQpIHtcbiAgICAgICAgICAgIHJlamVjdChcbiAgICAgICAgICAgICAgbmV3IEVycm9yKGBBbmFseXRpY3MgcmVwb3J0aW5nIGZhaWxlZCB3aXRoIHN0YXR1cyBjb2RlOiAke3Jlc3BvbnNlLnN0YXR1c0NvZGV9LmApLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICk7XG5cbiAgICAgIHJlcXVlc3Qub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgICAgIGNvbnN0IHF1ZXJ5UGFyYW1ldGVycyA9IGRhdGEubWFwKChwKSA9PiBxdWVyeXN0cmluZy5zdHJpbmdpZnkocCkpLmpvaW4oJ1xcbicpO1xuICAgICAgcmVxdWVzdC53cml0ZShxdWVyeVBhcmFtZXRlcnMpO1xuICAgICAgcmVxdWVzdC5lbmQoKTtcbiAgICB9KTtcbiAgfVxufVxuIl19