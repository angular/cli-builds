/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { McpToolContext } from '../tool-registry';
/**
 * Attempts to find version-specific example databases from the user's installed
 * versions of known Angular packages. It looks for a custom `angular` metadata property in each
 * package's `package.json` to locate the database.
 *
 * @example A sample `package.json` `angular` field:
 * ```json
 * {
 *   "angular": {
 *     "examples": {
 *       "format": "sqlite",
 *       "path": "./resources/code-examples.db"
 *     }
 *   }
 * }
 * ```
 *
 * @param workspacePath The absolute path to the user's `angular.json` file.
 * @param logger The MCP tool context logger for reporting warnings.
 * @param host The host interface for file system and module resolution operations.
 * @returns A promise that resolves to an array of objects, each containing a database path and source.
 */
export declare function getVersionSpecificExampleDatabases(workspacePath: string, logger: McpToolContext['logger'], host: McpToolContext['host']): Promise<{
    dbPath: string;
    source: string;
}[]>;
