"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveManifestDependencies = resolveManifestDependencies;
const node_path_1 = require("node:path");
/**
 * Maximum number of concurrent file system read operations to prevent OS file descriptor exhaustion.
 */
const MAX_CONCURRENT_READS = 16;
/**
 * Maps each item to a result using an asynchronous function, running at most `limit` operations
 * concurrently. Results are returned in the same order as the input items.
 */
async function mapConcurrent(items, limit, fn) {
    const results = new Array(items.length);
    let index = 0;
    const worker = async () => {
        while (index < items.length) {
            const i = index++;
            results[i] = await fn(items[i]);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}
/**
 * Checks whether a path exists and matches the expected type.
 */
async function isPathOfType(host, path, type) {
    try {
        const stats = await host.stat(path);
        switch (type) {
            case 'file':
                return stats.isFile();
            case 'directory':
                return stats.isDirectory();
            case 'any':
                return true;
        }
    }
    catch {
        return false;
    }
}
/**
 * Finds existing `node_modules` directories starting from `startDir` and walking up
 * ancestor directories until reaching a directory with one of `lockfiles` or the git repository root.
 */
async function findNodeModulesDirectories(host, startDir, lockfiles) {
    const directories = [];
    let currentDir = startDir;
    while (true) {
        const nodeModulesPath = (0, node_path_1.join)(currentDir, 'node_modules');
        const [hasNodeModules, isGitRoot, ...lockfileChecks] = await Promise.all([
            isPathOfType(host, nodeModulesPath, 'directory'),
            // `.git` is a file (not a directory) in git worktrees and submodules.
            isPathOfType(host, (0, node_path_1.join)(currentDir, '.git'), 'any'),
            ...lockfiles.map((lockfile) => isPathOfType(host, (0, node_path_1.join)(currentDir, lockfile), 'file')),
        ]);
        if (hasNodeModules) {
            directories.push(nodeModulesPath);
        }
        // Stop walking up once we reach a directory containing the package manager's lockfile
        // or the git repository root.
        if (isGitRoot || lockfileChecks.some(Boolean)) {
            break;
        }
        const parentDir = (0, node_path_1.dirname)(currentDir);
        if (parentDir === currentDir) {
            break;
        }
        currentDir = parentDir;
    }
    return directories;
}
/**
 * Resolves the installed manifest of a package by searching the given `node_modules`
 * directories in order.
 */
async function resolveInstalledPackage(host, packageName, nodeModulesDirs) {
    for (const nodeModulesDir of nodeModulesDirs) {
        const packagePath = (0, node_path_1.join)(nodeModulesDir, packageName);
        try {
            const pkgContent = await host.readFile((0, node_path_1.join)(packagePath, 'package.json'));
            const { version } = JSON.parse(pkgContent);
            if (typeof version === 'string') {
                return { name: packageName, version, path: packagePath };
            }
        }
        catch {
            // Continue searching ancestor node_modules directories.
        }
    }
    return undefined;
}
/**
 * Resolves installed versions of dependencies declared in the given directory's `package.json`
 * by searching ancestor `node_modules` directories starting from `cwd`.
 *
 * The returned map preserves the declaration order of the manifest.
 */
async function resolveManifestDependencies(host, cwd, lockfiles) {
    const resolvedDependencies = new Map();
    let manifest;
    try {
        manifest = JSON.parse(await host.readFile((0, node_path_1.join)(cwd, 'package.json')));
    }
    catch {
        return resolvedDependencies;
    }
    if (!manifest || typeof manifest !== 'object') {
        return resolvedDependencies;
    }
    const declaredPackages = new Set();
    for (const depMap of [manifest.dependencies, manifest.devDependencies]) {
        if (!depMap || typeof depMap !== 'object') {
            continue;
        }
        for (const [name, specifier] of Object.entries(depMap)) {
            if (typeof specifier === 'string' && !specifier.startsWith('workspace:')) {
                declaredPackages.add(name);
            }
        }
    }
    if (declaredPackages.size === 0) {
        return resolvedDependencies;
    }
    const nodeModulesDirs = await findNodeModulesDirectories(host, cwd, lockfiles);
    if (nodeModulesDirs.length === 0) {
        return resolvedDependencies;
    }
    const installedPackages = await mapConcurrent([...declaredPackages], MAX_CONCURRENT_READS, (packageName) => resolveInstalledPackage(host, packageName, nodeModulesDirs));
    for (const installedPackage of installedPackages) {
        if (installedPackage) {
            resolvedDependencies.set(installedPackage.name, installedPackage);
        }
    }
    return resolvedDependencies;
}
//# sourceMappingURL=manifest-dependencies.js.map