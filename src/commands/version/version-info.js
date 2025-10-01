"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatherVersionInfo = gatherVersionInfo;
const node_module_1 = require("node:module");
const version_1 = require("../../utilities/version");
/**
 * Major versions of Node.js that are officially supported by Angular.
 * @see https://angular.dev/reference/versions#supported-node-js-versions
 */
const SUPPORTED_NODE_MAJORS = [20, 22, 24];
/**
 * A list of regular expression patterns that match package names that should be included in the
 * version output.
 */
const PACKAGE_PATTERNS = [
    /^@angular\/.*/,
    /^@angular-devkit\/.*/,
    /^@ngtools\/.*/,
    /^@schematics\/.*/,
    /^rxjs$/,
    /^typescript$/,
    /^ng-packagr$/,
    /^webpack$/,
    /^zone\.js$/,
];
/**
 * Gathers all the version information from the environment and workspace.
 * @returns An object containing all the version information.
 */
function gatherVersionInfo(context) {
    // Trailing slash is used to allow the path to be treated as a directory
    const workspaceRequire = (0, node_module_1.createRequire)(context.root + '/');
    let workspacePackage;
    try {
        workspacePackage = workspaceRequire('./package.json');
    }
    catch { }
    const [nodeMajor] = process.versions.node.split('.').map((part) => Number(part));
    const unsupportedNodeVersion = !SUPPORTED_NODE_MAJORS.includes(nodeMajor);
    const packageNames = new Set(Object.keys({
        ...workspacePackage?.dependencies,
        ...workspacePackage?.devDependencies,
    }));
    const versions = {};
    for (const name of packageNames) {
        if (PACKAGE_PATTERNS.some((p) => p.test(name))) {
            versions[name] = getVersion(name, workspaceRequire);
        }
    }
    return {
        ngCliVersion: version_1.VERSION.full,
        versions,
        unsupportedNodeVersion,
        nodeVersion: process.versions.node,
        packageManagerName: context.packageManager.name,
        packageManagerVersion: context.packageManager.version,
        os: process.platform,
        arch: process.arch,
    };
}
/**
 * Gets the version of a package.
 * @param moduleName The name of the package.
 * @param workspaceRequire A `require` function for the workspace.
 * @param localRequire A `require` function for the CLI.
 * @returns The version of the package, or `<error>` if it could not be found.
 */
function getVersion(moduleName, workspaceRequire) {
    let packageInfo;
    // Try to find the package in the workspace
    try {
        packageInfo = workspaceRequire(`${moduleName}/package.json`);
    }
    catch { }
    // If found, attempt to get the version
    if (packageInfo) {
        return packageInfo.version;
    }
    return '<error>';
}
