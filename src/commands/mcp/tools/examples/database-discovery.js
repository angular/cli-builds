"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVersionSpecificExampleDatabases = getVersionSpecificExampleDatabases;
const node_path_1 = require("node:path");
/**
 * A list of known Angular packages that may contain example databases.
 * The tool will attempt to resolve and load example databases from these packages.
 */
const KNOWN_EXAMPLE_PACKAGES = ['@angular/core', '@angular/aria', '@angular/forms'];
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
async function getVersionSpecificExampleDatabases(workspacePath, logger, host) {
    const databases = [];
    for (const packageName of KNOWN_EXAMPLE_PACKAGES) {
        // 1. Resolve the path to package.json
        let pkgJsonPath;
        try {
            pkgJsonPath = host.resolveModule(`${packageName}/package.json`, workspacePath);
        }
        catch (e) {
            // This is not a warning because the user may not have all known packages installed.
            continue;
        }
        // 2. Read and parse package.json, then find the database.
        try {
            const pkgJsonContent = await host.readFile(pkgJsonPath, 'utf-8');
            const pkgJson = JSON.parse(pkgJsonContent);
            const examplesInfo = pkgJson['angular']?.examples;
            if (examplesInfo &&
                examplesInfo.format === 'sqlite' &&
                typeof examplesInfo.path === 'string') {
                const packageDirectory = (0, node_path_1.dirname)(pkgJsonPath);
                const dbPath = (0, node_path_1.resolve)(packageDirectory, examplesInfo.path);
                // Ensure the resolved database path is within the package boundary.
                const relativePath = (0, node_path_1.relative)(packageDirectory, dbPath);
                if (relativePath.startsWith('..') || (0, node_path_1.isAbsolute)(relativePath)) {
                    logger.warn(`Detected a potential path traversal attempt in '${pkgJsonPath}'. ` +
                        `The path '${examplesInfo.path}' escapes the package boundary. ` +
                        'This database will be skipped.');
                    continue;
                }
                // Check the file size to prevent reading a very large file.
                const stats = await host.stat(dbPath);
                if (stats.size > 10 * 1024 * 1024) {
                    // 10MB
                    logger.warn(`The example database at '${dbPath}' is larger than 10MB (${stats.size} bytes). ` +
                        'This is unexpected and the file will not be used.');
                    continue;
                }
                const source = `package ${packageName}@${pkgJson.version}`;
                databases.push({ dbPath, source });
            }
        }
        catch (e) {
            logger.warn(`Failed to read or parse version-specific examples metadata referenced in '${pkgJsonPath}': ${e instanceof Error ? e.message : e}.`);
        }
    }
    return databases;
}
//# sourceMappingURL=database-discovery.js.map