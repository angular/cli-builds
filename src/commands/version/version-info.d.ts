/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * An object containing all the version information that will be displayed by the command.
 */
export interface VersionInfo {
    cli: {
        version: string;
    };
    system: {
        node: {
            version: string;
            unsupported: boolean;
        };
        os: {
            platform: string;
            architecture: string;
        };
        packageManager: {
            name: string;
            version: string | undefined;
        };
    };
    packages: Record<string, string>;
}
/**
 * Gathers all the version information from the environment and workspace.
 * @returns An object containing all the version information.
 */
export declare function gatherVersionInfo(context: {
    packageManager: {
        name: string;
        version: string | undefined;
    };
    root: string;
}): VersionInfo;
