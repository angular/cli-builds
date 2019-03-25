/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { analytics } from '@angular-devkit/core';
/**
 * This is the ultimate safelist for checking if a package name is safe to report to analytics.
 */
export declare const analyticsPackageSafelist: (string | RegExp)[];
export declare function isPackageNameSafeForAnalytics(name: string): boolean;
/**
* MAKE SURE TO KEEP THIS IN SYNC WITH THE TABLE AND CONTENT IN `/docs/design/analytics.md`.
* WE LIST THOSE DIMENSIONS (AND MORE).
*/
export declare enum AnalyticsDimensions {
    NgAddCollection = 6,
    NgBuildBuildEventLog = 7
}
/**
 * Implementation of the Analytics interface for using `universal-analytics` package.
 */
export declare class UniversalAnalytics implements analytics.Analytics {
    private _ua;
    private _dirty;
    /**
     * @param trackingId The Google Analytics ID.
     * @param uid A User ID.
     */
    constructor(trackingId: string, uid: string);
    /**
     * Creates the dimension and metrics variables to pass to universal-analytics.
     * @private
     */
    private _customVariables;
    event(ec: string, ea: string, options?: analytics.EventOptions): void;
    screenview(cd: string, an: string, options?: analytics.ScreenviewOptions): void;
    pageview(dp: string, options?: analytics.PageviewOptions): void;
    timing(utc: string, utv: string, utt: string | number, options?: analytics.TimingOptions): void;
    flush(): Promise<void>;
}
/**
 * Set analytics settings. This does not work if the user is not inside a project.
 * @param level Which config to use. "global" for user-level, and "local" for project-level.
 * @param value Either a user ID, true to generate a new User ID, or false to disable analytics.
 */
export declare function setAnalyticsConfig(level: 'global' | 'local', value: string | boolean): void;
/**
 * Prompt the user for usage gathering permission.
 * @param force Whether to ask regardless of whether or not the user is using an interactive shell.
 * @return Whether or not the user was shown a prompt.
 */
export declare function promptGlobalAnalytics(force?: boolean): Promise<boolean>;
/**
 * Prompt the user for usage gathering permission for the local project. Fails if there is no
 * local workspace.
 * @param force Whether to ask regardless of whether or not the user is using an interactive shell.
 * @return Whether or not the user was shown a prompt.
 */
export declare function promptProjectAnalytics(force?: boolean): Promise<boolean>;
/**
 * Get the global analytics setting for the user. This returns a string for UID, false if the user
 * opted out of analytics, true if the user wants to stay anonymous (no client id), and undefined
 * if the user has not been prompted yet.
 *
 * If any problem happens, it is considered the user has been opting out of analytics.
 */
export declare function getGlobalAnalytics(): string | boolean | undefined;
