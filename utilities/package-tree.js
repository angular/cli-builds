"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectDependencies = exports.findPackageJson = exports.readPackageJson = void 0;
const fs = require("fs");
const path_1 = require("path");
const resolve = require("resolve");
const util_1 = require("util");
const readFile = util_1.promisify(fs.readFile);
async function readJSON(file) {
    const buffer = await readFile(file);
    return JSON.parse(buffer.toString());
}
function getAllDependencies(pkg) {
    return new Set([
        ...Object.entries(pkg.dependencies || []),
        ...Object.entries(pkg.devDependencies || []),
        ...Object.entries(pkg.peerDependencies || []),
        ...Object.entries(pkg.optionalDependencies || []),
    ]);
}
async function readPackageJson(packageJsonPath) {
    try {
        return await readJSON(packageJsonPath);
    }
    catch (err) {
        return undefined;
    }
}
exports.readPackageJson = readPackageJson;
function findPackageJson(workspaceDir, packageName) {
    try {
        // avoid require.resolve here, see: https://github.com/angular/angular-cli/pull/18610#issuecomment-681980185
        const packageJsonPath = resolve.sync(`${packageName}/package.json`, { paths: [workspaceDir] });
        return packageJsonPath;
    }
    catch (err) {
        return undefined;
    }
}
exports.findPackageJson = findPackageJson;
async function getProjectDependencies(dir) {
    const pkgJsonPath = resolve.sync(path_1.join(dir, `package.json`));
    if (!pkgJsonPath) {
        throw new Error('Could not find package.json');
    }
    const pkg = await readJSON(pkgJsonPath);
    const results = new Map();
    await Promise.all(Array.from(getAllDependencies(pkg)).map(async ([name, version]) => {
        const packageJsonPath = findPackageJson(dir, name);
        if (packageJsonPath) {
            const currentDependency = {
                name,
                version,
                path: path_1.dirname(packageJsonPath),
                package: await readPackageJson(packageJsonPath),
            };
            results.set(currentDependency.name, currentDependency);
        }
    }));
    return results;
}
exports.getProjectDependencies = getProjectDependencies;
