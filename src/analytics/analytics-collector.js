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
const environment_options_1 = require("../utilities/environment-options");
const error_1 = require("../utilities/error");
const version_1 = require("../utilities/version");
const analytics_parameters_1 = require("./analytics-parameters");
const TRACKING_ID_PROD = 'G-VETNJBW8L4';
const TRACKING_ID_STAGING = 'G-TBMPRL1BTM';
class AnalyticsCollector {
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
            [analytics_parameters_1.RequestParameter.UserAgentPlatformVersion]: os.version(),
            // Set undefined to disable debug view.
            [analytics_parameters_1.RequestParameter.DebugView]: environment_options_1.ngDebug ? 1 : undefined,
        };
        this.requestParameterStringified = querystring.stringify(requestParameters);
        // Remove the `v` at the beginning.
        const nodeVersion = process.version.substring(1);
        const packageManagerVersion = context.packageManager.version;
        this.userParameters = {
            // While architecture is being collect by GA as UserAgentArchitecture.
            // It doesn't look like there is a way to query this. Therefore we collect this as a custom user dimension too.
            [analytics_parameters_1.UserCustomDimension.OsArchitecture]: os.arch(),
            // While User ID is being collected by GA, this is not visible in reports/for filtering.
            [analytics_parameters_1.UserCustomDimension.UserId]: userId,
            [analytics_parameters_1.UserCustomDimension.NodeVersion]: nodeVersion,
            [analytics_parameters_1.UserCustomDimension.NodeMajorVersion]: +nodeVersion.split('.', 1)[0],
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
        var _a;
        (_a = this.trackingEventsQueue) !== null && _a !== void 0 ? _a : (this.trackingEventsQueue = []);
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
            var _a;
            if ((_a = this.trackingEventsQueue) === null || _a === void 0 ? void 0 : _a.length) {
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
        this.context.logger.debug(`Analytics flush size. ${pendingTrackingEvents === null || pendingTrackingEvents === void 0 ? void 0 : pendingTrackingEvents.length}.`);
        if (!(pendingTrackingEvents === null || pendingTrackingEvents === void 0 ? void 0 : pendingTrackingEvents.length)) {
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
        // Temporarily disable sending analytics.
        if (true) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const request = https.request({
                host: 'www.google-analytics.com',
                method: 'POST',
                path: '/g/collect?' + this.requestParameterStringified,
            }, (response) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLWNvbGxlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy9hbmFseXRpY3MvYW5hbHl0aWNzLWNvbGxlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILG1DQUFvQztBQUNwQyw2Q0FBK0I7QUFDL0IsdUNBQXlCO0FBQ3pCLHlEQUEyQztBQUUzQywwRUFBMkQ7QUFDM0QsOENBQW1EO0FBQ25ELGtEQUErQztBQUMvQyxpRUFNZ0M7QUFFaEMsTUFBTSxnQkFBZ0IsR0FBRyxjQUFjLENBQUM7QUFDeEMsTUFBTSxtQkFBbUIsR0FBRyxjQUFjLENBQUM7QUFFM0MsTUFBYSxrQkFBa0I7SUFLN0IsWUFBb0IsT0FBdUIsRUFBRSxNQUFjO1FBQXZDLFlBQU8sR0FBUCxPQUFPLENBQWdCO1FBQ3pDLE1BQU0saUJBQWlCLEdBQXNEO1lBQzNFLENBQUMsdUNBQWdCLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxDQUFDLHVDQUFnQixDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU07WUFDbkMsQ0FBQyx1Q0FBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNO1lBQ2pDLENBQUMsdUNBQWdCLENBQUMsVUFBVSxDQUFDLEVBQzNCLGlCQUFpQixDQUFDLElBQUksQ0FBQyxpQkFBTyxDQUFDLElBQUksQ0FBQyxJQUFJLGlCQUFPLENBQUMsSUFBSSxLQUFLLE9BQU87Z0JBQzlELENBQUMsQ0FBQyxnQkFBZ0I7Z0JBQ2xCLENBQUMsQ0FBQyxtQkFBbUI7WUFFekIsMkJBQTJCO1lBQzNCLENBQUMsdUNBQWdCLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBQSxtQkFBVSxHQUFFO1lBQzFDLENBQUMsdUNBQWdCLENBQUMscUJBQXFCLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxF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LENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdFLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDL0IsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBcktELGdEQXFLQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyByYW5kb21VVUlEIH0gZnJvbSAnY3J5cHRvJztcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHF1ZXJ5c3RyaW5nIGZyb20gJ3F1ZXJ5c3RyaW5nJztcbmltcG9ydCB0eXBlIHsgQ29tbWFuZENvbnRleHQgfSBmcm9tICcuLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgbmdEZWJ1ZyB9IGZyb20gJy4uL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IGFzc2VydElzRXJyb3IgfSBmcm9tICcuLi91dGlsaXRpZXMvZXJyb3InO1xuaW1wb3J0IHsgVkVSU0lPTiB9IGZyb20gJy4uL3V0aWxpdGllcy92ZXJzaW9uJztcbmltcG9ydCB7XG4gIEV2ZW50Q3VzdG9tRGltZW5zaW9uLFxuICBFdmVudEN1c3RvbU1ldHJpYyxcbiAgUHJpbWl0aXZlVHlwZXMsXG4gIFJlcXVlc3RQYXJhbWV0ZXIsXG4gIFVzZXJDdXN0b21EaW1lbnNpb24sXG59IGZyb20gJy4vYW5hbHl0aWNzLXBhcmFtZXRlcnMnO1xuXG5jb25zdCBUUkFDS0lOR19JRF9QUk9EID0gJ0ctVkVUTkpCVzhMNCc7XG5jb25zdCBUUkFDS0lOR19JRF9TVEFHSU5HID0gJ0ctVEJNUFJMMUJUTSc7XG5cbmV4cG9ydCBjbGFzcyBBbmFseXRpY3NDb2xsZWN0b3Ige1xuICBwcml2YXRlIHRyYWNraW5nRXZlbnRzUXVldWU6IFJlY29yZDxzdHJpbmcsIFByaW1pdGl2ZVR5cGVzIHwgdW5kZWZpbmVkPltdIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIHJlYWRvbmx5IHJlcXVlc3RQYXJhbWV0ZXJTdHJpbmdpZmllZDogc3RyaW5nO1xuICBwcml2YXRlIHJlYWRvbmx5IHVzZXJQYXJhbWV0ZXJzOiBSZWNvcmQ8VXNlckN1c3RvbURpbWVuc2lvbiwgUHJpbWl0aXZlVHlwZXMgfCB1bmRlZmluZWQ+O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY29udGV4dDogQ29tbWFuZENvbnRleHQsIHVzZXJJZDogc3RyaW5nKSB7XG4gICAgY29uc3QgcmVxdWVzdFBhcmFtZXRlcnM6IFBhcnRpYWw8UmVjb3JkPFJlcXVlc3RQYXJhbWV0ZXIsIFByaW1pdGl2ZVR5cGVzPj4gPSB7XG4gICAgICBbUmVxdWVzdFBhcmFtZXRlci5Qcm90b2NvbFZlcnNpb25dOiAyLFxuICAgICAgW1JlcXVlc3RQYXJhbWV0ZXIuQ2xpZW50SWRdOiB1c2VySWQsXG4gICAgICBbUmVxdWVzdFBhcmFtZXRlci5Vc2VySWRdOiB1c2VySWQsXG4gICAgICBbUmVxdWVzdFBhcmFtZXRlci5UcmFja2luZ0lkXTpcbiAgICAgICAgL15cXGQrXFwuXFxkK1xcLlxcZCskLy50ZXN0KFZFUlNJT04uZnVsbCkgJiYgVkVSU0lPTi5mdWxsICE9PSAnMC4wLjAnXG4gICAgICAgICAgPyBUUkFDS0lOR19JRF9QUk9EXG4gICAgICAgICAgOiBUUkFDS0lOR19JRF9TVEFHSU5HLFxuXG4gICAgICAvLyBCdWlsdC1pbiB1c2VyIHByb3BlcnRpZXNcbiAgICAgIFtSZXF1ZXN0UGFyYW1ldGVyLlNlc3Npb25JZF06IHJhbmRvbVVVSUQoKSxcbiAgICAgIFtSZXF1ZXN0UGFyYW1ldGVyLlVzZXJBZ2VudEFyY2hpdGVjdHVyZV06IG9zLmFyY2goKSxcbiAgICAgIFtSZXF1ZXN0UGFyYW1ldGVyLlVzZXJBZ2VudFBsYXRmb3JtXTogb3MucGxhdGZvcm0oKSxcbiAgICAgIFtSZXF1ZXN0UGFyYW1ldGVyLlVzZXJBZ2VudFBsYXRmb3JtVmVyc2lvbl06IG9zLnZlcnNpb24oKSxcblxuICAgICAgLy8gU2V0IHVuZGVmaW5lZCB0byBkaXNhYmxlIGRlYnVnIHZpZXcuXG4gICAgICBbUmVxdWVzdFBhcmFtZXRlci5EZWJ1Z1ZpZXddOiBuZ0RlYnVnID8gMSA6IHVuZGVmaW5lZCxcbiAgICB9O1xuXG4gICAgdGhpcy5yZXF1ZXN0UGFyYW1ldGVyU3RyaW5naWZpZWQgPSBxdWVyeXN0cmluZy5zdHJpbmdpZnkocmVxdWVzdFBhcmFtZXRlcnMpO1xuXG4gICAgLy8gUmVtb3ZlIHRoZSBgdmAgYXQgdGhlIGJlZ2lubmluZy5cbiAgICBjb25zdCBub2RlVmVyc2lvbiA9IHByb2Nlc3MudmVyc2lvbi5zdWJzdHJpbmcoMSk7XG4gICAgY29uc3QgcGFja2FnZU1hbmFnZXJWZXJzaW9uID0gY29udGV4dC5wYWNrYWdlTWFuYWdlci52ZXJzaW9uO1xuXG4gICAgdGhpcy51c2VyUGFyYW1ldGVycyA9IHtcbiAgICAgIC8vIFdoaWxlIGFyY2hpdGVjdHVyZSBpcyBiZWluZyBjb2xsZWN0IGJ5IEdBIGFzIFVzZXJBZ2VudEFyY2hpdGVjdHVyZS5cbiAgICAgIC8vIEl0IGRvZXNuJ3QgbG9vayBsaWtlIHRoZXJlIGlzIGEgd2F5IHRvIHF1ZXJ5IHRoaXMuIFRoZXJlZm9yZSB3ZSBjb2xsZWN0IHRoaXMgYXMgYSBjdXN0b20gdXNlciBkaW1lbnNpb24gdG9vLlxuICAgICAgW1VzZXJDdXN0b21EaW1lbnNpb24uT3NBcmNoaXRlY3R1cmVdOiBvcy5hcmNoKCksXG4gICAgICAvLyBXaGlsZSBVc2VyIElEIGlzIGJlaW5nIGNvbGxlY3RlZCBieSBHQSwgdGhpcyBpcyBub3QgdmlzaWJsZSBpbiByZXBvcnRzL2ZvciBmaWx0ZXJpbmcuXG4gICAgICBbVXNlckN1c3RvbURpbWVuc2lvbi5Vc2VySWRdOiB1c2VySWQsXG4gICAgICBbVXNlckN1c3RvbURpbWVuc2lvbi5Ob2RlVmVyc2lvbl06IG5vZGVWZXJzaW9uLFxuICAgICAgW1VzZXJDdXN0b21EaW1lbnNpb24uTm9kZU1ham9yVmVyc2lvbl06ICtub2RlVmVyc2lvbi5zcGxpdCgnLicsIDEpWzBdLFxuICAgICAgW1VzZXJDdXN0b21EaW1lbnNpb24uUGFja2FnZU1hbmFnZXJdOiBjb250ZXh0LnBhY2thZ2VNYW5hZ2VyLm5hbWUsXG4gICAgICBbVXNlckN1c3RvbURpbWVuc2lvbi5QYWNrYWdlTWFuYWdlclZlcnNpb25dOiBwYWNrYWdlTWFuYWdlclZlcnNpb24sXG4gICAgICBbVXNlckN1c3RvbURpbWVuc2lvbi5QYWNrYWdlTWFuYWdlck1ham9yVmVyc2lvbl06IHBhY2thZ2VNYW5hZ2VyVmVyc2lvblxuICAgICAgICA/ICtwYWNrYWdlTWFuYWdlclZlcnNpb24uc3BsaXQoJy4nLCAxKVswXVxuICAgICAgICA6IHVuZGVmaW5lZCxcbiAgICAgIFtVc2VyQ3VzdG9tRGltZW5zaW9uLkFuZ3VsYXJDTElWZXJzaW9uXTogVkVSU0lPTi5mdWxsLFxuICAgICAgW1VzZXJDdXN0b21EaW1lbnNpb24uQW5ndWxhckNMSU1ham9yVmVyc2lvbl06IFZFUlNJT04ubWFqb3IsXG4gICAgfTtcbiAgfVxuXG4gIHJlcG9ydFdvcmtzcGFjZUluZm9FdmVudChcbiAgICBwYXJhbWV0ZXJzOiBQYXJ0aWFsPFJlY29yZDxFdmVudEN1c3RvbU1ldHJpYywgc3RyaW5nIHwgYm9vbGVhbiB8IG51bWJlciB8IHVuZGVmaW5lZD4+LFxuICApOiB2b2lkIHtcbiAgICB0aGlzLmV2ZW50KCd3b3Jrc3BhY2VfaW5mbycsIHBhcmFtZXRlcnMpO1xuICB9XG5cbiAgcmVwb3J0UmVidWlsZFJ1bkV2ZW50KFxuICAgIHBhcmFtZXRlcnM6IFBhcnRpYWw8XG4gICAgICBSZWNvcmQ8RXZlbnRDdXN0b21NZXRyaWMgJiBFdmVudEN1c3RvbURpbWVuc2lvbiwgc3RyaW5nIHwgYm9vbGVhbiB8IG51bWJlciB8IHVuZGVmaW5lZD5cbiAgICA+LFxuICApOiB2b2lkIHtcbiAgICB0aGlzLmV2ZW50KCdydW5fcmVidWlsZCcsIHBhcmFtZXRlcnMpO1xuICB9XG5cbiAgcmVwb3J0QnVpbGRSdW5FdmVudChcbiAgICBwYXJhbWV0ZXJzOiBQYXJ0aWFsPFxuICAgICAgUmVjb3JkPEV2ZW50Q3VzdG9tTWV0cmljICYgRXZlbnRDdXN0b21EaW1lbnNpb24sIHN0cmluZyB8IGJvb2xlYW4gfCBudW1iZXIgfCB1bmRlZmluZWQ+XG4gICAgPixcbiAgKTogdm9pZCB7XG4gICAgdGhpcy5ldmVudCgncnVuX2J1aWxkJywgcGFyYW1ldGVycyk7XG4gIH1cblxuICByZXBvcnRBcmNoaXRlY3RSdW5FdmVudChwYXJhbWV0ZXJzOiBQYXJ0aWFsPFJlY29yZDxFdmVudEN1c3RvbURpbWVuc2lvbiwgUHJpbWl0aXZlVHlwZXM+Pik6IHZvaWQge1xuICAgIHRoaXMuZXZlbnQoJ3J1bl9hcmNoaXRlY3QnLCBwYXJhbWV0ZXJzKTtcbiAgfVxuXG4gIHJlcG9ydFNjaGVtYXRpY1J1bkV2ZW50KHBhcmFtZXRlcnM6IFBhcnRpYWw8UmVjb3JkPEV2ZW50Q3VzdG9tRGltZW5zaW9uLCBQcmltaXRpdmVUeXBlcz4+KTogdm9pZCB7XG4gICAgdGhpcy5ldmVudCgncnVuX3NjaGVtYXRpYycsIHBhcmFtZXRlcnMpO1xuICB9XG5cbiAgcmVwb3J0Q29tbWFuZFJ1bkV2ZW50KGNvbW1hbmQ6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMuZXZlbnQoJ3J1bl9jb21tYW5kJywgeyBbRXZlbnRDdXN0b21EaW1lbnNpb24uQ29tbWFuZF06IGNvbW1hbmQgfSk7XG4gIH1cblxuICBwcml2YXRlIGV2ZW50KGV2ZW50TmFtZTogc3RyaW5nLCBwYXJhbWV0ZXJzPzogUmVjb3JkPHN0cmluZywgUHJpbWl0aXZlVHlwZXM+KTogdm9pZCB7XG4gICAgdGhpcy50cmFja2luZ0V2ZW50c1F1ZXVlID8/PSBbXTtcbiAgICB0aGlzLnRyYWNraW5nRXZlbnRzUXVldWUucHVzaCh7XG4gICAgICAuLi50aGlzLnVzZXJQYXJhbWV0ZXJzLFxuICAgICAgLi4ucGFyYW1ldGVycyxcbiAgICAgICdlbic6IGV2ZW50TmFtZSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGbHVzaCBvbiBhbiBpbnRlcnZhbCAoaWYgdGhlIGV2ZW50IGxvb3AgaXMgd2FpdGluZykuXG4gICAqXG4gICAqIEByZXR1cm5zIGEgbWV0aG9kIHRoYXQgd2hlbiBjYWxsZWQgd2lsbCB0ZXJtaW5hdGUgdGhlIHBlcmlvZGljXG4gICAqIGZsdXNoIGFuZCBjYWxsIGZsdXNoIG9uZSBsYXN0IHRpbWUuXG4gICAqL1xuICBwZXJpb2RGbHVzaCgpOiAoKSA9PiBQcm9taXNlPHZvaWQ+IHtcbiAgICBsZXQgYW5hbHl0aWNzRmx1c2hQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgY29uc3QgYW5hbHl0aWNzRmx1c2hJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIGlmICh0aGlzLnRyYWNraW5nRXZlbnRzUXVldWU/Lmxlbmd0aCkge1xuICAgICAgICBhbmFseXRpY3NGbHVzaFByb21pc2UgPSBhbmFseXRpY3NGbHVzaFByb21pc2UudGhlbigoKSA9PiB0aGlzLmZsdXNoKCkpO1xuICAgICAgfVxuICAgIH0sIDQwMDApO1xuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGNsZWFySW50ZXJ2YWwoYW5hbHl0aWNzRmx1c2hJbnRlcnZhbCk7XG5cbiAgICAgIC8vIEZsdXNoIG9uZSBsYXN0IHRpbWUuXG4gICAgICByZXR1cm4gYW5hbHl0aWNzRmx1c2hQcm9taXNlLnRoZW4oKCkgPT4gdGhpcy5mbHVzaCgpKTtcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgZmx1c2goKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcGVuZGluZ1RyYWNraW5nRXZlbnRzID0gdGhpcy50cmFja2luZ0V2ZW50c1F1ZXVlO1xuICAgIHRoaXMuY29udGV4dC5sb2dnZXIuZGVidWcoYEFuYWx5dGljcyBmbHVzaCBzaXplLiAke3BlbmRpbmdUcmFja2luZ0V2ZW50cz8ubGVuZ3RofS5gKTtcblxuICAgIGlmICghcGVuZGluZ1RyYWNraW5nRXZlbnRzPy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBUaGUgYmVsb3cgaXMgbmVlZGVkIHNvIHRoYXQgaWYgZmx1c2ggaXMgY2FsbGVkIG11bHRpcGxlIHRpbWVzLFxuICAgIC8vIHdlIGRvbid0IHJlcG9ydCB0aGUgc2FtZSBldmVudCBtdWx0aXBsZSB0aW1lcy5cbiAgICB0aGlzLnRyYWNraW5nRXZlbnRzUXVldWUgPSB1bmRlZmluZWQ7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zZW5kKHBlbmRpbmdUcmFja2luZ0V2ZW50cyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIEZhaWx1cmUgdG8gcmVwb3J0IGFuYWx5dGljcyBzaG91bGRuJ3QgY3Jhc2ggdGhlIENMSS5cbiAgICAgIGFzc2VydElzRXJyb3IoZXJyb3IpO1xuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5kZWJ1ZyhgU2VuZCBhbmFseXRpY3MgZXJyb3IuICR7ZXJyb3IubWVzc2FnZX0uYCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzZW5kKGRhdGE6IFJlY29yZDxzdHJpbmcsIFByaW1pdGl2ZVR5cGVzIHwgdW5kZWZpbmVkPltdKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSBzZW5kaW5nIGFuYWx5dGljcy5cbiAgICBpZiAodHJ1ZSBhcyBib29sZWFuKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHJlcXVlc3QgPSBodHRwcy5yZXF1ZXN0KFxuICAgICAgICB7XG4gICAgICAgICAgaG9zdDogJ3d3dy5nb29nbGUtYW5hbHl0aWNzLmNvbScsXG4gICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgcGF0aDogJy9nL2NvbGxlY3Q/JyArIHRoaXMucmVxdWVzdFBhcmFtZXRlclN0cmluZ2lmaWVkLFxuICAgICAgICB9LFxuICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSAhPT0gMjAwICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgIT09IDIwNCkge1xuICAgICAgICAgICAgcmVqZWN0KFxuICAgICAgICAgICAgICBuZXcgRXJyb3IoYEFuYWx5dGljcyByZXBvcnRpbmcgZmFpbGVkIHdpdGggc3RhdHVzIGNvZGU6ICR7cmVzcG9uc2Uuc3RhdHVzQ29kZX0uYCksXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgKTtcblxuICAgICAgcmVxdWVzdC5vbignZXJyb3InLCByZWplY3QpO1xuICAgICAgY29uc3QgcXVlcnlQYXJhbWV0ZXJzID0gZGF0YS5tYXAoKHApID0+IHF1ZXJ5c3RyaW5nLnN0cmluZ2lmeShwKSkuam9pbignXFxuJyk7XG4gICAgICByZXF1ZXN0LndyaXRlKHF1ZXJ5UGFyYW1ldGVycyk7XG4gICAgICByZXF1ZXN0LmVuZCgpO1xuICAgIH0pO1xuICB9XG59XG4iXX0=