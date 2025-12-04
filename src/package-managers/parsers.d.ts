/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * @fileoverview This file contains the parser functions that are used to
 * interpret the output of various package manager commands. Separating these
 * into their own file improves modularity and allows for focused testing.
 */
import { ErrorInfo } from './error';
import { Logger } from './logger';
import { PackageManifest, PackageMetadata } from './package-metadata';
import { InstalledPackage } from './package-tree';
/**
 * Parses the output of `npm list` or a compatible command.
 *
 * The expected JSON structure is:
 * ```json
 * {
 *   "dependencies": {
 *     "@angular/cli": {
 *       "version": "18.0.0",
 *       "path": "/path/to/project/node_modules/@angular/cli", // path is optional
 *       ... (other package.json properties)
 *     }
 *   }
 * }
 * ```
 *
 * @param stdout The standard output of the command.
 * @param logger An optional logger instance.
 * @returns A map of package names to their installed package details.
 */
export declare function parseNpmLikeDependencies(stdout: string, logger?: Logger): Map<string, InstalledPackage>;
/**
 * Parses the output of `yarn list` (classic).
 *
 * The expected output is a JSON stream (JSONL), where each line is a JSON object.
 * The relevant object has a `type` of `'tree'` with a `data` property.
 * Yarn classic does not provide a path, so the `path` property will be `undefined`.
 *
 * ```json
 * {"type":"tree","data":{"trees":[{"name":"@angular/cli@18.0.0","children":[]}]}}
 * ```
 *
 * @param stdout The standard output of the command.
 * @param logger An optional logger instance.
 * @returns A map of package names to their installed package details.
 */
export declare function parseYarnClassicDependencies(stdout: string, logger?: Logger): Map<string, InstalledPackage>;
/**
 * Parses the output of `yarn list` (modern).
 *
 * The expected JSON structure is a single object.
 * Yarn modern does not provide a path, so the `path` property will be `undefined`.
 *
 * ```json
 * {
 *   "trees": [
 *     { "name": "@angular/cli@18.0.0", "children": [] }
 *   ]
 * }
 * ```
 *
 * @param stdout The standard output of the command.
 * @param logger An optional logger instance.
 * @returns A map of package names to their installed package details.
 */
export declare function parseYarnModernDependencies(stdout: string, logger?: Logger): Map<string, InstalledPackage>;
/**
 * Parses the output of `npm view` or a compatible command to get a package manifest.
 * @param stdout The standard output of the command.
 * @param logger An optional logger instance.
 * @returns The package manifest object.
 */
export declare function parseNpmLikeManifest(stdout: string, logger?: Logger): PackageManifest | null;
/**
 * Parses the output of `npm view` or a compatible command to get package metadata.
 * @param stdout The standard output of the command.
 * @param logger An optional logger instance.
 * @returns The package metadata object.
 */
export declare function parseNpmLikeMetadata(stdout: string, logger?: Logger): PackageMetadata | null;
/**
 * Parses the output of `yarn info` (classic) to get a package manifest.
 *
 * When `yarn info --verbose` is used, the output is a JSONL stream. This function
 * iterates through the lines to find the object with `type: 'inspect'` which contains
 * the package manifest.
 *
 * For non-verbose output, it falls back to parsing a single JSON object.
 *
 * @param stdout The standard output of the command.
 * @param logger An optional logger instance.
 * @returns The package manifest object, or `null` if not found.
 */
export declare function parseYarnClassicManifest(stdout: string, logger?: Logger): PackageManifest | null;
/**
 * Parses the output of `yarn info` (classic) to get package metadata.
 * @param stdout The standard output of the command.
 * @param logger An optional logger instance.
 * @returns The package metadata object.
 */
export declare function parseYarnClassicMetadata(stdout: string, logger?: Logger): PackageMetadata | null;
/**
 * Parses the `stdout` or `stderr` output of npm, pnpm, modern yarn, or bun to extract structured error information.
 *
 * This parser uses a multi-stage approach. It first attempts to parse the entire `output` as a
 * single JSON object, which is the standard for modern tools like pnpm, yarn, and bun. If JSON
 * parsing fails, it falls back to a line-by-line regex-based approach to handle the plain
 * text output from older versions of npm.
 *
 * Example JSON output (pnpm):
 * ```json
 * {
 *   "code": "E404",
 *   "summary": "Not Found - GET https://registry.npmjs.org/@angular%2fnon-existent - Not found",
 *   "detail": "The requested resource '@angular/non-existent@*' could not be found or you do not have permission to access it."
 * }
 * ```
 *
 * Example text output (npm):
 * ```
 * npm error code E404
 * npm error 404 Not Found - GET https://registry.npmjs.org/@angular%2fnon-existent - Not found
 * ```
 *
 * @param output The standard output or standard error of the command.
 * @param logger An optional logger instance.
 * @returns An `ErrorInfo` object if parsing is successful, otherwise `null`.
 */
export declare function parseNpmLikeError(output: string, logger?: Logger): ErrorInfo | null;
/**
 * Parses the `stdout` or `stderr` output of yarn classic to extract structured error information.
 *
 * This parser first attempts to find an HTTP status code (e.g., 404, 401) in the verbose output.
 * If found, it returns a standardized error code (`E${statusCode}`).
 * If no HTTP status code is found, it falls back to parsing generic JSON error lines.
 *
 * Example verbose output (with HTTP status code):
 * ```json
 * {"type":"verbose","data":"Request \"https://registry.npmjs.org/@angular%2fnon-existent\" finished with status code 404."}
 * ```
 *
 * Example generic JSON error output:
 * ```json
 * {"type":"error","data":"Received invalid response from npm."}
 * ```
 *
 * @param output The standard output or standard error of the command.
 * @param logger An optional logger instance.
 * @returns An `ErrorInfo` object if parsing is successful, otherwise `null`.
 */
export declare function parseYarnClassicError(output: string, logger?: Logger): ErrorInfo | null;
