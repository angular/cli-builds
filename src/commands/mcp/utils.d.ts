/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * Returns simple structured content output from an MCP tool.
 *
 * @returns A structure with both `content` and `structuredContent` for maximum compatibility.
 */
export declare function createStructuredContentOutput<OutputType>(structuredContent: OutputType): {
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: OutputType;
};
/**
 * Searches for an angular.json file by traversing up the directory tree from a starting directory.
 *
 * @param startDir The directory path to start searching from
 * @param host The workspace host instance used to check file existence. Defaults to LocalWorkspaceHost
 * @returns The absolute path to the directory containing angular.json, or null if not found
 *
 * @remarks
 * This function performs an upward directory traversal starting from `startDir`.
 * It checks each directory for the presence of an angular.json file until either:
 * - The file is found (returns the directory path)
 * - The root of the filesystem is reached (returns null)
 */
export declare function findAngularJsonDir(startDir: string, host?: import("./host").Host): string | null;
