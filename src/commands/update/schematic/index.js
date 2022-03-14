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
exports.angularMajorCompatGuarantee = void 0;
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const npa = __importStar(require("npm-package-arg"));
const semver = __importStar(require("semver"));
const package_metadata_1 = require("../../../../utilities/package-metadata");
// Angular guarantees that a major is compatible with its following major (so packages that depend
// on Angular 5 are also compatible with Angular 6). This is, in code, represented by verifying
// that all other packages that have a peer dependency of `"@angular/core": "^5.0.0"` actually
// supports 6.0, by adding that compatibility to the range, so it is `^5.0.0 || ^6.0.0`.
// We export it to allow for testing.
function angularMajorCompatGuarantee(range) {
    let newRange = semver.validRange(range);
    if (!newRange) {
        return range;
    }
    let major = 1;
    while (!semver.gtr(major + '.0.0', newRange)) {
        major++;
        if (major >= 99) {
            // Use original range if it supports a major this high
            // Range is most likely unbounded (e.g., >=5.0.0)
            return newRange;
        }
    }
    // Add the major version as compatible with the angular compatible, with all minors. This is
    // already one major above the greatest supported, because we increment `major` before checking.
    // We add minors like this because a minor beta is still compatible with a minor non-beta.
    newRange = range;
    for (let minor = 0; minor < 20; minor++) {
        newRange += ` || ^${major}.${minor}.0-alpha.0 `;
    }
    return semver.validRange(newRange) || range;
}
exports.angularMajorCompatGuarantee = angularMajorCompatGuarantee;
// This is a map of packageGroupName to range extending function. If it isn't found, the range is
// kept the same.
const knownPeerCompatibleList = {
    '@angular/core': angularMajorCompatGuarantee,
};
function _updatePeerVersion(infoMap, name, range) {
    // Resolve packageGroupName.
    const maybePackageInfo = infoMap.get(name);
    if (!maybePackageInfo) {
        return range;
    }
    if (maybePackageInfo.target) {
        name = maybePackageInfo.target.updateMetadata.packageGroupName || name;
    }
    else {
        name = maybePackageInfo.installed.updateMetadata.packageGroupName || name;
    }
    const maybeTransform = knownPeerCompatibleList[name];
    if (maybeTransform) {
        if (typeof maybeTransform == 'function') {
            return maybeTransform(range);
        }
        else {
            return maybeTransform;
        }
    }
    return range;
}
function _validateForwardPeerDependencies(name, infoMap, peers, peersMeta, logger, next) {
    let validationFailed = false;
    for (const [peer, range] of Object.entries(peers)) {
        logger.debug(`Checking forward peer ${peer}...`);
        const maybePeerInfo = infoMap.get(peer);
        const isOptional = peersMeta[peer] && !!peersMeta[peer].optional;
        if (!maybePeerInfo) {
            if (!isOptional) {
                logger.warn([
                    `Package ${JSON.stringify(name)} has a missing peer dependency of`,
                    `${JSON.stringify(peer)} @ ${JSON.stringify(range)}.`,
                ].join(' '));
            }
            continue;
        }
        const peerVersion = maybePeerInfo.target && maybePeerInfo.target.packageJson.version
            ? maybePeerInfo.target.packageJson.version
            : maybePeerInfo.installed.version;
        logger.debug(`  Range intersects(${range}, ${peerVersion})...`);
        if (!semver.satisfies(peerVersion, range, { includePrerelease: next || undefined })) {
            logger.error([
                `Package ${JSON.stringify(name)} has an incompatible peer dependency to`,
                `${JSON.stringify(peer)} (requires ${JSON.stringify(range)},`,
                `would install ${JSON.stringify(peerVersion)})`,
            ].join(' '));
            validationFailed = true;
            continue;
        }
    }
    return validationFailed;
}
function _validateReversePeerDependencies(name, version, infoMap, logger, next) {
    for (const [installed, installedInfo] of infoMap.entries()) {
        const installedLogger = logger.createChild(installed);
        installedLogger.debug(`${installed}...`);
        const peers = (installedInfo.target || installedInfo.installed).packageJson.peerDependencies;
        for (const [peer, range] of Object.entries(peers || {})) {
            if (peer != name) {
                // Only check peers to the packages we're updating. We don't care about peers
                // that are unmet but we have no effect on.
                continue;
            }
            // Ignore peerDependency mismatches for these packages.
            // They are deprecated and removed via a migration.
            const ignoredPackages = [
                'codelyzer',
                '@schematics/update',
                '@angular-devkit/build-ng-packagr',
                'tsickle',
            ];
            if (ignoredPackages.includes(installed)) {
                continue;
            }
            // Override the peer version range if it's known as a compatible.
            const extendedRange = _updatePeerVersion(infoMap, peer, range);
            if (!semver.satisfies(version, extendedRange, { includePrerelease: next || undefined })) {
                logger.error([
                    `Package ${JSON.stringify(installed)} has an incompatible peer dependency to`,
                    `${JSON.stringify(name)} (requires`,
                    `${JSON.stringify(range)}${extendedRange == range ? '' : ' (extended)'},`,
                    `would install ${JSON.stringify(version)}).`,
                ].join(' '));
                return true;
            }
        }
    }
    return false;
}
function _validateUpdatePackages(infoMap, force, next, logger) {
    logger.debug('Updating the following packages:');
    infoMap.forEach((info) => {
        if (info.target) {
            logger.debug(`  ${info.name} => ${info.target.version}`);
        }
    });
    let peerErrors = false;
    infoMap.forEach((info) => {
        const { name, target } = info;
        if (!target) {
            return;
        }
        const pkgLogger = logger.createChild(name);
        logger.debug(`${name}...`);
        const { peerDependencies = {}, peerDependenciesMeta = {} } = target.packageJson;
        peerErrors =
            _validateForwardPeerDependencies(name, infoMap, peerDependencies, peerDependenciesMeta, pkgLogger, next) || peerErrors;
        peerErrors =
            _validateReversePeerDependencies(name, target.version, infoMap, pkgLogger, next) ||
                peerErrors;
    });
    if (!force && peerErrors) {
        throw new schematics_1.SchematicsException(core_1.tags.stripIndents `Incompatible peer dependencies found.
      Peer dependency warnings when installing dependencies means that those dependencies might not work correctly together.
      You can use the '--force' option to ignore incompatible peer dependencies and instead address these warnings later.`);
    }
}
function _performUpdate(tree, context, infoMap, logger, migrateOnly) {
    const packageJsonContent = tree.read('/package.json');
    if (!packageJsonContent) {
        throw new schematics_1.SchematicsException('Could not find a package.json. Are you in a Node project?');
    }
    let packageJson;
    try {
        packageJson = JSON.parse(packageJsonContent.toString());
    }
    catch (e) {
        throw new schematics_1.SchematicsException('package.json could not be parsed: ' + e.message);
    }
    const updateDependency = (deps, name, newVersion) => {
        const oldVersion = deps[name];
        // We only respect caret and tilde ranges on update.
        const execResult = /^[\^~]/.exec(oldVersion);
        deps[name] = `${execResult ? execResult[0] : ''}${newVersion}`;
    };
    const toInstall = [...infoMap.values()]
        .map((x) => [x.name, x.target, x.installed])
        .filter(([name, target, installed]) => {
        return !!name && !!target && !!installed;
    });
    toInstall.forEach(([name, target, installed]) => {
        logger.info(`Updating package.json with dependency ${name} ` +
            `@ ${JSON.stringify(target.version)} (was ${JSON.stringify(installed.version)})...`);
        if (packageJson.dependencies && packageJson.dependencies[name]) {
            updateDependency(packageJson.dependencies, name, target.version);
            if (packageJson.devDependencies && packageJson.devDependencies[name]) {
                delete packageJson.devDependencies[name];
            }
            if (packageJson.peerDependencies && packageJson.peerDependencies[name]) {
                delete packageJson.peerDependencies[name];
            }
        }
        else if (packageJson.devDependencies && packageJson.devDependencies[name]) {
            updateDependency(packageJson.devDependencies, name, target.version);
            if (packageJson.peerDependencies && packageJson.peerDependencies[name]) {
                delete packageJson.peerDependencies[name];
            }
        }
        else if (packageJson.peerDependencies && packageJson.peerDependencies[name]) {
            updateDependency(packageJson.peerDependencies, name, target.version);
        }
        else {
            logger.warn(`Package ${name} was not found in dependencies.`);
        }
    });
    const newContent = JSON.stringify(packageJson, null, 2);
    if (packageJsonContent.toString() != newContent || migrateOnly) {
        if (!migrateOnly) {
            tree.overwrite('/package.json', JSON.stringify(packageJson, null, 2));
        }
        const externalMigrations = [];
        // Run the migrate schematics with the list of packages to use. The collection contains
        // version information and we need to do this post installation. Please note that the
        // migration COULD fail and leave side effects on disk.
        // Run the schematics task of those packages.
        toInstall.forEach(([name, target, installed]) => {
            if (!target.updateMetadata.migrations) {
                return;
            }
            externalMigrations.push({
                package: name,
                collection: target.updateMetadata.migrations,
                from: installed.version,
                to: target.version,
            });
            return;
        });
        if (externalMigrations.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            global.externalMigrations = externalMigrations;
        }
    }
}
function _getUpdateMetadata(packageJson, logger) {
    const metadata = packageJson['ng-update'];
    const result = {
        packageGroup: {},
        requirements: {},
    };
    if (!metadata || typeof metadata != 'object' || Array.isArray(metadata)) {
        return result;
    }
    if (metadata['packageGroup']) {
        const packageGroup = metadata['packageGroup'];
        // Verify that packageGroup is an array of strings or an map of versions. This is not an error
        // but we still warn the user and ignore the packageGroup keys.
        if (Array.isArray(packageGroup) && packageGroup.every((x) => typeof x == 'string')) {
            result.packageGroup = packageGroup.reduce((group, name) => {
                group[name] = packageJson.version;
                return group;
            }, result.packageGroup);
        }
        else if (typeof packageGroup == 'object' &&
            packageGroup &&
            Object.values(packageGroup).every((x) => typeof x == 'string')) {
            result.packageGroup = packageGroup;
        }
        else {
            logger.warn(`packageGroup metadata of package ${packageJson.name} is malformed. Ignoring.`);
        }
        result.packageGroupName = Object.keys(result.packageGroup)[0];
    }
    if (typeof metadata['packageGroupName'] == 'string') {
        result.packageGroupName = metadata['packageGroupName'];
    }
    if (metadata['requirements']) {
        const requirements = metadata['requirements'];
        // Verify that requirements are
        if (typeof requirements != 'object' ||
            Array.isArray(requirements) ||
            Object.keys(requirements).some((name) => typeof requirements[name] != 'string')) {
            logger.warn(`requirements metadata of package ${packageJson.name} is malformed. Ignoring.`);
        }
        else {
            result.requirements = requirements;
        }
    }
    if (metadata['migrations']) {
        const migrations = metadata['migrations'];
        if (typeof migrations != 'string') {
            logger.warn(`migrations metadata of package ${packageJson.name} is malformed. Ignoring.`);
        }
        else {
            result.migrations = migrations;
        }
    }
    return result;
}
function _usageMessage(options, infoMap, logger) {
    const packageGroups = new Map();
    const packagesToUpdate = [...infoMap.entries()]
        .map(([name, info]) => {
        var _a, _b;
        let tag = options.next
            ? info.npmPackageJson['dist-tags']['next']
                ? 'next'
                : 'latest'
            : 'latest';
        let version = info.npmPackageJson['dist-tags'][tag];
        let target = info.npmPackageJson.versions[version];
        const versionDiff = semver.diff(info.installed.version, version);
        if (versionDiff !== 'patch' &&
            versionDiff !== 'minor' &&
            /^@(?:angular|nguniversal)\//.test(name)) {
            const installedMajorVersion = (_a = semver.parse(info.installed.version)) === null || _a === void 0 ? void 0 : _a.major;
            const toInstallMajorVersion = (_b = semver.parse(version)) === null || _b === void 0 ? void 0 : _b.major;
            if (installedMajorVersion !== undefined &&
                toInstallMajorVersion !== undefined &&
                installedMajorVersion < toInstallMajorVersion - 1) {
                const nextMajorVersion = `${installedMajorVersion + 1}.`;
                const nextMajorVersions = Object.keys(info.npmPackageJson.versions)
                    .filter((v) => v.startsWith(nextMajorVersion))
                    .sort((a, b) => (a > b ? -1 : 1));
                if (nextMajorVersions.length) {
                    version = nextMajorVersions[0];
                    target = info.npmPackageJson.versions[version];
                    tag = '';
                }
            }
        }
        return {
            name,
            info,
            version,
            tag,
            target,
        };
    })
        .filter(({ info, version, target }) => (target === null || target === void 0 ? void 0 : target['ng-update']) && semver.compare(info.installed.version, version) < 0)
        .map(({ name, info, version, tag, target }) => {
        var _a;
        // Look for packageGroup.
        const packageGroup = target['ng-update']['packageGroup'];
        if (packageGroup) {
            const packageGroupName = target['ng-update']['packageGroupName'] || packageGroup[0];
            if (packageGroupName) {
                if (packageGroups.has(name)) {
                    return null;
                }
                packageGroup.forEach((x) => packageGroups.set(x, packageGroupName));
                packageGroups.set(packageGroupName, packageGroupName);
                name = packageGroupName;
            }
        }
        let command = `ng update ${name}`;
        if (!tag) {
            command += `@${((_a = semver.parse(version)) === null || _a === void 0 ? void 0 : _a.major) || version}`;
        }
        else if (tag == 'next') {
            command += ' --next';
        }
        return [name, `${info.installed.version} -> ${version} `, command];
    })
        .filter((x) => x !== null)
        .sort((a, b) => (a && b ? a[0].localeCompare(b[0]) : 0));
    if (packagesToUpdate.length == 0) {
        logger.info('We analyzed your package.json and everything seems to be in order. Good work!');
        return;
    }
    logger.info('We analyzed your package.json, there are some packages to update:\n');
    // Find the largest name to know the padding needed.
    let namePad = Math.max(...[...infoMap.keys()].map((x) => x.length)) + 2;
    if (!Number.isFinite(namePad)) {
        namePad = 30;
    }
    const pads = [namePad, 25, 0];
    logger.info('  ' + ['Name', 'Version', 'Command to update'].map((x, i) => x.padEnd(pads[i])).join(''));
    logger.info(' ' + '-'.repeat(pads.reduce((s, x) => (s += x), 0) + 20));
    packagesToUpdate.forEach((fields) => {
        if (!fields) {
            return;
        }
        logger.info('  ' + fields.map((x, i) => x.padEnd(pads[i])).join(''));
    });
    logger.info(`\nThere might be additional packages which don't provide 'ng update' capabilities that are outdated.\n` +
        `You can update the additional packages by running the update command of your package manager.`);
    return;
}
function _buildPackageInfo(tree, packages, allDependencies, npmPackageJson, logger) {
    const name = npmPackageJson.name;
    const packageJsonRange = allDependencies.get(name);
    if (!packageJsonRange) {
        throw new schematics_1.SchematicsException(`Package ${JSON.stringify(name)} was not found in package.json.`);
    }
    // Find out the currently installed version. Either from the package.json or the node_modules/
    // TODO: figure out a way to read package-lock.json and/or yarn.lock.
    let installedVersion;
    const packageContent = tree.read(`/node_modules/${name}/package.json`);
    if (packageContent) {
        const content = JSON.parse(packageContent.toString());
        installedVersion = content.version;
    }
    if (!installedVersion) {
        // Find the version from NPM that fits the range to max.
        installedVersion = semver.maxSatisfying(Object.keys(npmPackageJson.versions), packageJsonRange);
    }
    if (!installedVersion) {
        throw new schematics_1.SchematicsException(`An unexpected error happened; could not determine version for package ${name}.`);
    }
    const installedPackageJson = npmPackageJson.versions[installedVersion] || packageContent;
    if (!installedPackageJson) {
        throw new schematics_1.SchematicsException(`An unexpected error happened; package ${name} has no version ${installedVersion}.`);
    }
    let targetVersion = packages.get(name);
    if (targetVersion) {
        if (npmPackageJson['dist-tags'][targetVersion]) {
            targetVersion = npmPackageJson['dist-tags'][targetVersion];
        }
        else if (targetVersion == 'next') {
            targetVersion = npmPackageJson['dist-tags']['latest'];
        }
        else {
            targetVersion = semver.maxSatisfying(Object.keys(npmPackageJson.versions), targetVersion);
        }
    }
    if (targetVersion && semver.lte(targetVersion, installedVersion)) {
        logger.debug(`Package ${name} already satisfied by package.json (${packageJsonRange}).`);
        targetVersion = undefined;
    }
    const target = targetVersion
        ? {
            version: targetVersion,
            packageJson: npmPackageJson.versions[targetVersion],
            updateMetadata: _getUpdateMetadata(npmPackageJson.versions[targetVersion], logger),
        }
        : undefined;
    // Check if there's an installed version.
    return {
        name,
        npmPackageJson,
        installed: {
            version: installedVersion,
            packageJson: installedPackageJson,
            updateMetadata: _getUpdateMetadata(installedPackageJson, logger),
        },
        target,
        packageJsonRange,
    };
}
function _buildPackageList(options, projectDeps, logger) {
    // Parse the packages options to set the targeted version.
    const packages = new Map();
    const commandLinePackages = options.packages && options.packages.length > 0 ? options.packages : [];
    for (const pkg of commandLinePackages) {
        // Split the version asked on command line.
        const m = pkg.match(/^((?:@[^/]{1,100}\/)?[^@]{1,100})(?:@(.{1,100}))?$/);
        if (!m) {
            logger.warn(`Invalid package argument: ${JSON.stringify(pkg)}. Skipping.`);
            continue;
        }
        const [, npmName, maybeVersion] = m;
        const version = projectDeps.get(npmName);
        if (!version) {
            logger.warn(`Package not installed: ${JSON.stringify(npmName)}. Skipping.`);
            continue;
        }
        packages.set(npmName, (maybeVersion || (options.next ? 'next' : 'latest')));
    }
    return packages;
}
function _addPackageGroup(tree, packages, allDependencies, npmPackageJson, logger) {
    const maybePackage = packages.get(npmPackageJson.name);
    if (!maybePackage) {
        return;
    }
    const info = _buildPackageInfo(tree, packages, allDependencies, npmPackageJson, logger);
    const version = (info.target && info.target.version) ||
        npmPackageJson['dist-tags'][maybePackage] ||
        maybePackage;
    if (!npmPackageJson.versions[version]) {
        return;
    }
    const ngUpdateMetadata = npmPackageJson.versions[version]['ng-update'];
    if (!ngUpdateMetadata) {
        return;
    }
    let packageGroup = ngUpdateMetadata['packageGroup'];
    if (!packageGroup) {
        return;
    }
    if (Array.isArray(packageGroup) && !packageGroup.some((x) => typeof x != 'string')) {
        packageGroup = packageGroup.reduce((acc, curr) => {
            acc[curr] = maybePackage;
            return acc;
        }, {});
    }
    // Only need to check if it's an object because we set it right the time before.
    if (typeof packageGroup != 'object' ||
        packageGroup === null ||
        Object.values(packageGroup).some((v) => typeof v != 'string')) {
        logger.warn(`packageGroup metadata of package ${npmPackageJson.name} is malformed.`);
        return;
    }
    Object.keys(packageGroup)
        .filter((name) => !packages.has(name)) // Don't override names from the command line.
        .filter((name) => allDependencies.has(name)) // Remove packages that aren't installed.
        .forEach((name) => {
        packages.set(name, packageGroup[name]);
    });
}
/**
 * Add peer dependencies of packages on the command line to the list of packages to update.
 * We don't do verification of the versions here as this will be done by a later step (and can
 * be ignored by the --force flag).
 * @private
 */
function _addPeerDependencies(tree, packages, allDependencies, npmPackageJson, npmPackageJsonMap, logger) {
    const maybePackage = packages.get(npmPackageJson.name);
    if (!maybePackage) {
        return;
    }
    const info = _buildPackageInfo(tree, packages, allDependencies, npmPackageJson, logger);
    const version = (info.target && info.target.version) ||
        npmPackageJson['dist-tags'][maybePackage] ||
        maybePackage;
    if (!npmPackageJson.versions[version]) {
        return;
    }
    const packageJson = npmPackageJson.versions[version];
    const error = false;
    for (const [peer, range] of Object.entries(packageJson.peerDependencies || {})) {
        if (packages.has(peer)) {
            continue;
        }
        const peerPackageJson = npmPackageJsonMap.get(peer);
        if (peerPackageJson) {
            const peerInfo = _buildPackageInfo(tree, packages, allDependencies, peerPackageJson, logger);
            if (semver.satisfies(peerInfo.installed.version, range)) {
                continue;
            }
        }
        packages.set(peer, range);
    }
    if (error) {
        throw new schematics_1.SchematicsException('An error occured, see above.');
    }
}
function _getAllDependencies(tree) {
    const packageJsonContent = tree.read('/package.json');
    if (!packageJsonContent) {
        throw new schematics_1.SchematicsException('Could not find a package.json. Are you in a Node project?');
    }
    let packageJson;
    try {
        packageJson = JSON.parse(packageJsonContent.toString());
    }
    catch (e) {
        throw new schematics_1.SchematicsException('package.json could not be parsed: ' + e.message);
    }
    return [
        ...Object.entries(packageJson.peerDependencies || {}),
        ...Object.entries(packageJson.devDependencies || {}),
        ...Object.entries(packageJson.dependencies || {}),
    ];
}
function _formatVersion(version) {
    if (version === undefined) {
        return undefined;
    }
    if (!version.match(/^\d{1,30}\.\d{1,30}\.\d{1,30}/)) {
        version += '.0';
    }
    if (!version.match(/^\d{1,30}\.\d{1,30}\.\d{1,30}/)) {
        version += '.0';
    }
    if (!semver.valid(version)) {
        throw new schematics_1.SchematicsException(`Invalid migration version: ${JSON.stringify(version)}`);
    }
    return version;
}
/**
 * Returns whether or not the given package specifier (the value string in a
 * `package.json` dependency) is hosted in the NPM registry.
 * @throws When the specifier cannot be parsed.
 */
function isPkgFromRegistry(name, specifier) {
    const result = npa.resolve(name, specifier);
    return !!result.registry;
}
function default_1(options) {
    if (!options.packages) {
        // We cannot just return this because we need to fetch the packages from NPM still for the
        // help/guide to show.
        options.packages = [];
    }
    else {
        // We split every packages by commas to allow people to pass in multiple and make it an array.
        options.packages = options.packages.reduce((acc, curr) => {
            return acc.concat(curr.split(','));
        }, []);
    }
    if (options.migrateOnly && options.from) {
        if (options.packages.length !== 1) {
            throw new schematics_1.SchematicsException('--from requires that only a single package be passed.');
        }
    }
    options.from = _formatVersion(options.from);
    options.to = _formatVersion(options.to);
    const usingYarn = options.packageManager === 'yarn';
    return async (tree, context) => {
        const logger = context.logger;
        const npmDeps = new Map(_getAllDependencies(tree).filter(([name, specifier]) => {
            try {
                return isPkgFromRegistry(name, specifier);
            }
            catch (_a) {
                logger.warn(`Package ${name} was not found on the registry. Skipping.`);
                return false;
            }
        }));
        const packages = _buildPackageList(options, npmDeps, logger);
        // Grab all package.json from the npm repository. This requires a lot of HTTP calls so we
        // try to parallelize as many as possible.
        const allPackageMetadata = await Promise.all(Array.from(npmDeps.keys()).map((depName) => (0, package_metadata_1.getNpmPackageJson)(depName, logger, {
            registry: options.registry,
            usingYarn,
            verbose: options.verbose,
        })));
        // Build a map of all dependencies and their packageJson.
        const npmPackageJsonMap = allPackageMetadata.reduce((acc, npmPackageJson) => {
            // If the package was not found on the registry. It could be private, so we will just
            // ignore. If the package was part of the list, we will error out, but will simply ignore
            // if it's either not requested (so just part of package.json. silently) or if it's a
            // `--all` situation. There is an edge case here where a public package peer depends on a
            // private one, but it's rare enough.
            if (!npmPackageJson.name) {
                if (npmPackageJson.requestedName && packages.has(npmPackageJson.requestedName)) {
                    throw new schematics_1.SchematicsException(`Package ${JSON.stringify(npmPackageJson.requestedName)} was not found on the ` +
                        'registry. Cannot continue as this may be an error.');
                }
            }
            else {
                // If a name is present, it is assumed to be fully populated
                acc.set(npmPackageJson.name, npmPackageJson);
            }
            return acc;
        }, new Map());
        // Augment the command line package list with packageGroups and forward peer dependencies.
        // Each added package may uncover new package groups and peer dependencies, so we must
        // repeat this process until the package list stabilizes.
        let lastPackagesSize;
        do {
            lastPackagesSize = packages.size;
            npmPackageJsonMap.forEach((npmPackageJson) => {
                _addPackageGroup(tree, packages, npmDeps, npmPackageJson, logger);
                _addPeerDependencies(tree, packages, npmDeps, npmPackageJson, npmPackageJsonMap, logger);
            });
        } while (packages.size > lastPackagesSize);
        // Build the PackageInfo for each module.
        const packageInfoMap = new Map();
        npmPackageJsonMap.forEach((npmPackageJson) => {
            packageInfoMap.set(npmPackageJson.name, _buildPackageInfo(tree, packages, npmDeps, npmPackageJson, logger));
        });
        // Now that we have all the information, check the flags.
        if (packages.size > 0) {
            if (options.migrateOnly && options.from && options.packages) {
                return;
            }
            const sublog = new core_1.logging.LevelCapLogger('validation', logger.createChild(''), 'warn');
            _validateUpdatePackages(packageInfoMap, !!options.force, !!options.next, sublog);
            _performUpdate(tree, context, packageInfoMap, logger, !!options.migrateOnly);
        }
        else {
            _usageMessage(options, packageInfoMap, logger);
        }
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZHMvdXBkYXRlL3NjaGVtYXRpYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFxRDtBQUNyRCwyREFBK0Y7QUFDL0YscURBQXVDO0FBQ3ZDLCtDQUFpQztBQUVqQyw2RUFHZ0Q7QUFNaEQsa0dBQWtHO0FBQ2xHLCtGQUErRjtBQUMvRiw4RkFBOEY7QUFDOUYsd0ZBQXdGO0FBQ3hGLHFDQUFxQztBQUNyQyxTQUFnQiwyQkFBMkIsQ0FBQyxLQUFhO0lBQ3ZELElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEMsSUFBSSxDQUFDLFFBQVEsRUFBRTtRQUNiLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFDRCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDZCxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsTUFBTSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1FBQzVDLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxLQUFLLElBQUksRUFBRSxFQUFFO1lBQ2Ysc0RBQXNEO1lBQ3RELGlEQUFpRDtZQUNqRCxPQUFPLFFBQVEsQ0FBQztTQUNqQjtLQUNGO0lBRUQsNEZBQTRGO0lBQzVGLGdHQUFnRztJQUNoRywwRkFBMEY7SUFDMUYsUUFBUSxHQUFHLEtBQUssQ0FBQztJQUNqQixLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFO1FBQ3ZDLFFBQVEsSUFBSSxRQUFRLEtBQUssSUFBSSxLQUFLLGFBQWEsQ0FBQztLQUNqRDtJQUVELE9BQU8sTUFBTSxDQUFDLFVBQVUs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LENBQUMsV0FBVyxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRTtnQkFDM0QsT0FBTzthQUNSO1lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxjQUFPLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3hGLHVCQUF1QixDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUVqRixjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDOUU7YUFBTTtZQUNMLGFBQWEsQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ2hEO0lBQ0gsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTFHRCw0QkEwR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgbG9nZ2luZywgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IFJ1bGUsIFNjaGVtYXRpY0NvbnRleHQsIFNjaGVtYXRpY3NFeGNlcHRpb24sIFRyZWUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgKiBhcyBucGEgZnJvbSAnbnBtLXBhY2thZ2UtYXJnJztcbmltcG9ydCAqIGFzIHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgRGVwZW5kZW5jeSwgSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXMgfSBmcm9tICcuLi8uLi8uLi8uLi91dGlsaXRpZXMvcGFja2FnZS1qc29uJztcbmltcG9ydCB7XG4gIE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbixcbiAgZ2V0TnBtUGFja2FnZUpzb24sXG59IGZyb20gJy4uLy4uLy4uLy4uL3V0aWxpdGllcy9wYWNrYWdlLW1ldGFkYXRhJztcbmltcG9ydCB7IFNjaGVtYSBhcyBVcGRhdGVTY2hlbWEgfSBmcm9tICcuL3NjaGVtYSc7XG5cbnR5cGUgVmVyc2lvblJhbmdlID0gc3RyaW5nICYgeyBfX1ZFUlNJT05fUkFOR0U6IHZvaWQgfTtcbnR5cGUgUGVlclZlcnNpb25UcmFuc2Zvcm0gPSBzdHJpbmcgfCAoKHJhbmdlOiBzdHJpbmcpID0+IHN0cmluZyk7XG5cbi8vIEFuZ3VsYXIgZ3VhcmFudGVlcyB0aGF0IGEgbWFqb3IgaXMgY29tcGF0aWJsZSB3aXRoIGl0cyBmb2xsb3dpbmcgbWFqb3IgKHNvIHBhY2thZ2VzIHRoYXQgZGVwZW5kXG4vLyBvbiBBbmd1bGFyIDUgYXJlIGFsc28gY29tcGF0aWJsZSB3aXRoIEFuZ3VsYXIgNikuIFRoaXMgaXMsIGluIGNvZGUsIHJlcHJlc2VudGVkIGJ5IHZlcmlmeWluZ1xuLy8gdGhhdCBhbGwgb3RoZXIgcGFja2FnZXMgdGhhdCBoYXZlIGEgcGVlciBkZXBlbmRlbmN5IG9mIGBcIkBhbmd1bGFyL2NvcmVcIjogXCJeNS4wLjBcImAgYWN0dWFsbHlcbi8vIHN1cHBvcnRzIDYuMCwgYnkgYWRkaW5nIHRoYXQgY29tcGF0aWJpbGl0eSB0byB0aGUgcmFuZ2UsIHNvIGl0IGlzIGBeNS4wLjAgfHwgXjYuMC4wYC5cbi8vIFdlIGV4cG9ydCBpdCB0byBhbGxvdyBmb3IgdGVzdGluZy5cbmV4cG9ydCBmdW5jdGlvbiBhbmd1bGFyTWFqb3JDb21wYXRHdWFyYW50ZWUocmFuZ2U6IHN0cmluZykge1xuICBsZXQgbmV3UmFuZ2UgPSBzZW12ZXIudmFsaWRSYW5nZShyYW5nZSk7XG4gIGlmICghbmV3UmFuZ2UpIHtcbiAgICByZXR1cm4gcmFuZ2U7XG4gIH1cbiAgbGV0IG1ham9yID0gMTtcbiAgd2hpbGUgKCFzZW12ZXIuZ3RyKG1ham9yICsgJy4wLjAnLCBuZXdSYW5nZSkpIHtcbiAgICBtYWpvcisrO1xuICAgIGlmIChtYWpvciA+PSA5OSkge1xuICAgICAgLy8gVXNlIG9yaWdpbmFsIHJhbmdlIGlmIGl0IHN1cHBvcnRzIGEgbWFqb3IgdGhpcyBoaWdoXG4gICAgICAvLyBSYW5nZSBpcyBtb3N0IGxpa2VseSB1bmJvdW5kZWQgKGUuZy4sID49NS4wLjApXG4gICAgICByZXR1cm4gbmV3UmFuZ2U7XG4gICAgfVxuICB9XG5cbiAgLy8gQWRkIHRoZSBtYWpvciB2ZXJzaW9uIGFzIGNvbXBhdGlibGUgd2l0aCB0aGUgYW5ndWxhciBjb21wYXRpYmxlLCB3aXRoIGFsbCBtaW5vcnMuIFRoaXMgaXNcbiAgLy8gYWxyZWFkeSBvbmUgbWFqb3IgYWJvdmUgdGhlIGdyZWF0ZXN0IHN1cHBvcnRlZCwgYmVjYXVzZSB3ZSBpbmNyZW1lbnQgYG1ham9yYCBiZWZvcmUgY2hlY2tpbmcuXG4gIC8vIFdlIGFkZCBtaW5vcnMgbGlrZSB0aGlzIGJlY2F1c2UgYSBtaW5vciBiZXRhIGlzIHN0aWxsIGNvbXBhdGlibGUgd2l0aCBhIG1pbm9yIG5vbi1iZXRhLlxuICBuZXdSYW5nZSA9IHJhbmdlO1xuICBmb3IgKGxldCBtaW5vciA9IDA7IG1pbm9yIDwgMjA7IG1pbm9yKyspIHtcbiAgICBuZXdSYW5nZSArPSBgIHx8IF4ke21ham9yfS4ke21pbm9yfS4wLWFscGhhLjAgYDtcbiAgfVxuXG4gIHJldHVybiBzZW12ZXIudmFsaWRSYW5nZShuZXdSYW5nZSkgfHwgcmFuZ2U7XG59XG5cbi8vIFRoaXMgaXMgYSBtYXAgb2YgcGFja2FnZUdyb3VwTmFtZSB0byByYW5nZSBleHRlbmRpbmcgZnVuY3Rpb24uIElmIGl0IGlzbid0IGZvdW5kLCB0aGUgcmFuZ2UgaXNcbi8vIGtlcHQgdGhlIHNhbWUuXG5jb25zdCBrbm93blBlZXJDb21wYXRpYmxlTGlzdDogeyBbbmFtZTogc3RyaW5nXTogUGVlclZlcnNpb25UcmFuc2Zvcm0gfSA9IHtcbiAgJ0Bhbmd1bGFyL2NvcmUnOiBhbmd1bGFyTWFqb3JDb21wYXRHdWFyYW50ZWUsXG59O1xuXG5pbnRlcmZhY2UgUGFja2FnZVZlcnNpb25JbmZvIHtcbiAgdmVyc2lvbjogVmVyc2lvblJhbmdlO1xuICBwYWNrYWdlSnNvbjogSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXM7XG4gIHVwZGF0ZU1ldGFkYXRhOiBVcGRhdGVNZXRhZGF0YTtcbn1cblxuaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBucG1QYWNrYWdlSnNvbjogTnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uO1xuICBpbnN0YWxsZWQ6IFBhY2thZ2VWZXJzaW9uSW5mbztcbiAgdGFyZ2V0PzogUGFja2FnZVZlcnNpb25JbmZvO1xuICBwYWNrYWdlSnNvblJhbmdlOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBVcGRhdGVNZXRhZGF0YSB7XG4gIHBhY2thZ2VHcm91cE5hbWU/OiBzdHJpbmc7XG4gIHBhY2thZ2VHcm91cDogeyBbcGFja2FnZU5hbWU6IHN0cmluZ106IHN0cmluZyB9O1xuICByZXF1aXJlbWVudHM6IHsgW3BhY2thZ2VOYW1lOiBzdHJpbmddOiBzdHJpbmcgfTtcbiAgbWlncmF0aW9ucz86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gX3VwZGF0ZVBlZXJWZXJzaW9uKGluZm9NYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPiwgbmFtZTogc3RyaW5nLCByYW5nZTogc3RyaW5nKSB7XG4gIC8vIFJlc29sdmUgcGFja2FnZUdyb3VwTmFtZS5cbiAgY29uc3QgbWF5YmVQYWNrYWdlSW5mbyA9IGluZm9NYXAuZ2V0KG5hbWUpO1xuICBpZiAoIW1heWJlUGFja2FnZUluZm8pIHtcbiAgICByZXR1cm4gcmFuZ2U7XG4gIH1cbiAgaWYgKG1heWJlUGFja2FnZUluZm8udGFyZ2V0KSB7XG4gICAgbmFtZSA9IG1heWJlUGFja2FnZUluZm8udGFyZ2V0LnVwZGF0ZU1ldGFkYXRhLnBhY2thZ2VHcm91cE5hbWUgfHwgbmFtZTtcbiAgfSBlbHNlIHtcbiAgICBuYW1lID0gbWF5YmVQYWNrYWdlSW5mby5pbnN0YWxsZWQudXBkYXRlTWV0YWRhdGEucGFja2FnZUdyb3VwTmFtZSB8fCBuYW1lO1xuICB9XG5cbiAgY29uc3QgbWF5YmVUcmFuc2Zvcm0gPSBrbm93blBlZXJDb21wYXRpYmxlTGlzdFtuYW1lXTtcbiAgaWYgKG1heWJlVHJhbnNmb3JtKSB7XG4gICAgaWYgKHR5cGVvZiBtYXliZVRyYW5zZm9ybSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gbWF5YmVUcmFuc2Zvcm0ocmFuZ2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbWF5YmVUcmFuc2Zvcm07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJhbmdlO1xufVxuXG5mdW5jdGlvbiBfdmFsaWRhdGVGb3J3YXJkUGVlckRlcGVuZGVuY2llcyhcbiAgbmFtZTogc3RyaW5nLFxuICBpbmZvTWFwOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz4sXG4gIHBlZXJzOiB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfSxcbiAgcGVlcnNNZXRhOiB7IFtuYW1lOiBzdHJpbmddOiB7IG9wdGlvbmFsPzogYm9vbGVhbiB9IH0sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4gIG5leHQ6IGJvb2xlYW4sXG4pOiBib29sZWFuIHtcbiAgbGV0IHZhbGlkYXRpb25GYWlsZWQgPSBmYWxzZTtcbiAgZm9yIChjb25zdCBbcGVlciwgcmFuZ2VdIG9mIE9iamVjdC5lbnRyaWVzKHBlZXJzKSkge1xuICAgIGxvZ2dlci5kZWJ1ZyhgQ2hlY2tpbmcgZm9yd2FyZCBwZWVyICR7cGVlcn0uLi5gKTtcbiAgICBjb25zdCBtYXliZVBlZXJJbmZvID0gaW5mb01hcC5nZXQocGVlcik7XG4gICAgY29uc3QgaXNPcHRpb25hbCA9IHBlZXJzTWV0YVtwZWVyXSAmJiAhIXBlZXJzTWV0YVtwZWVyXS5vcHRpb25hbDtcbiAgICBpZiAoIW1heWJlUGVlckluZm8pIHtcbiAgICAgIGlmICghaXNPcHRpb25hbCkge1xuICAgICAgICBsb2dnZXIud2FybihcbiAgICAgICAgICBbXG4gICAgICAgICAgICBgUGFja2FnZSAke0pTT04uc3RyaW5naWZ5KG5hbWUpfSBoYXMgYSBtaXNzaW5nIHBlZXIgZGVwZW5kZW5jeSBvZmAsXG4gICAgICAgICAgICBgJHtKU09OLnN0cmluZ2lmeShwZWVyKX0gQCAke0pTT04uc3RyaW5naWZ5KHJhbmdlKX0uYCxcbiAgICAgICAgICBdLmpvaW4oJyAnKSxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgcGVlclZlcnNpb24gPVxuICAgICAgbWF5YmVQZWVySW5mby50YXJnZXQgJiYgbWF5YmVQZWVySW5mby50YXJnZXQucGFja2FnZUpzb24udmVyc2lvblxuICAgICAgICA/IG1heWJlUGVlckluZm8udGFyZ2V0LnBhY2thZ2VKc29uLnZlcnNpb25cbiAgICAgICAgOiBtYXliZVBlZXJJbmZvLmluc3RhbGxlZC52ZXJzaW9uO1xuXG4gICAgbG9nZ2VyLmRlYnVnKGAgIFJhbmdlIGludGVyc2VjdHMoJHtyYW5nZX0sICR7cGVlclZlcnNpb259KS4uLmApO1xuICAgIGlmICghc2VtdmVyLnNhdGlzZmllcyhwZWVyVmVyc2lvbiwgcmFuZ2UsIHsgaW5jbHVkZVByZXJlbGVhc2U6IG5leHQgfHwgdW5kZWZpbmVkIH0pKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgIFtcbiAgICAgICAgICBgUGFja2FnZSAke0pTT04uc3RyaW5naWZ5KG5hbWUpfSBoYXMgYW4gaW5jb21wYXRpYmxlIHBlZXIgZGVwZW5kZW5jeSB0b2AsXG4gICAgICAgICAgYCR7SlNPTi5zdHJpbmdpZnkocGVlcil9IChyZXF1aXJlcyAke0pTT04uc3RyaW5naWZ5KHJhbmdlKX0sYCxcbiAgICAgICAgICBgd291bGQgaW5zdGFsbCAke0pTT04uc3RyaW5naWZ5KHBlZXJWZXJzaW9uKX0pYCxcbiAgICAgICAgXS5qb2luKCcgJyksXG4gICAgICApO1xuXG4gICAgICB2YWxpZGF0aW9uRmFpbGVkID0gdHJ1ZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB2YWxpZGF0aW9uRmFpbGVkO1xufVxuXG5mdW5jdGlvbiBfdmFsaWRhdGVSZXZlcnNlUGVlckRlcGVuZGVuY2llcyhcbiAgbmFtZTogc3RyaW5nLFxuICB2ZXJzaW9uOiBzdHJpbmcsXG4gIGluZm9NYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbiAgbmV4dDogYm9vbGVhbixcbikge1xuICBmb3IgKGNvbnN0IFtpbnN0YWxsZWQsIGluc3RhbGxlZEluZm9dIG9mIGluZm9NYXAuZW50cmllcygpKSB7XG4gICAgY29uc3QgaW5zdGFsbGVkTG9nZ2VyID0gbG9nZ2VyLmNyZWF0ZUNoaWxkKGluc3RhbGxlZCk7XG4gICAgaW5zdGFsbGVkTG9nZ2VyLmRlYnVnKGAke2luc3RhbGxlZH0uLi5gKTtcbiAgICBjb25zdCBwZWVycyA9IChpbnN0YWxsZWRJbmZvLnRhcmdldCB8fCBpbnN0YWxsZWRJbmZvLmluc3RhbGxlZCkucGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llcztcblxuICAgIGZvciAoY29uc3QgW3BlZXIsIHJhbmdlXSBvZiBPYmplY3QuZW50cmllcyhwZWVycyB8fCB7fSkpIHtcbiAgICAgIGlmIChwZWVyICE9IG5hbWUpIHtcbiAgICAgICAgLy8gT25seSBjaGVjayBwZWVycyB0byB0aGUgcGFja2FnZXMgd2UncmUgdXBkYXRpbmcuIFdlIGRvbid0IGNhcmUgYWJvdXQgcGVlcnNcbiAgICAgICAgLy8gdGhhdCBhcmUgdW5tZXQgYnV0IHdlIGhhdmUgbm8gZWZmZWN0IG9uLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWdub3JlIHBlZXJEZXBlbmRlbmN5IG1pc21hdGNoZXMgZm9yIHRoZXNlIHBhY2thZ2VzLlxuICAgICAgLy8gVGhleSBhcmUgZGVwcmVjYXRlZCBhbmQgcmVtb3ZlZCB2aWEgYSBtaWdyYXRpb24uXG4gICAgICBjb25zdCBpZ25vcmVkUGFja2FnZXMgPSBbXG4gICAgICAgICdjb2RlbHl6ZXInLFxuICAgICAgICAnQHNjaGVtYXRpY3MvdXBkYXRlJyxcbiAgICAgICAgJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1uZy1wYWNrYWdyJyxcbiAgICAgICAgJ3RzaWNrbGUnLFxuICAgICAgXTtcbiAgICAgIGlmIChpZ25vcmVkUGFja2FnZXMuaW5jbHVkZXMoaW5zdGFsbGVkKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gT3ZlcnJpZGUgdGhlIHBlZXIgdmVyc2lvbiByYW5nZSBpZiBpdCdzIGtub3duIGFzIGEgY29tcGF0aWJsZS5cbiAgICAgIGNvbnN0IGV4dGVuZGVkUmFuZ2UgPSBfdXBkYXRlUGVlclZlcnNpb24oaW5mb01hcCwgcGVlciwgcmFuZ2UpO1xuXG4gICAgICBpZiAoIXNlbXZlci5zYXRpc2ZpZXModmVyc2lvbiwgZXh0ZW5kZWRSYW5nZSwgeyBpbmNsdWRlUHJlcmVsZWFzZTogbmV4dCB8fCB1bmRlZmluZWQgfSkpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgIFtcbiAgICAgICAgICAgIGBQYWNrYWdlICR7SlNPTi5zdHJpbmdpZnkoaW5zdGFsbGVkKX0gaGFzIGFuIGluY29tcGF0aWJsZSBwZWVyIGRlcGVuZGVuY3kgdG9gLFxuICAgICAgICAgICAgYCR7SlNPTi5zdHJpbmdpZnkobmFtZSl9IChyZXF1aXJlc2AsXG4gICAgICAgICAgICBgJHtKU09OLnN0cmluZ2lmeShyYW5nZSl9JHtleHRlbmRlZFJhbmdlID09IHJhbmdlID8gJycgOiAnIChleHRlbmRlZCknfSxgLFxuICAgICAgICAgICAgYHdvdWxkIGluc3RhbGwgJHtKU09OLnN0cmluZ2lmeSh2ZXJzaW9uKX0pLmAsXG4gICAgICAgICAgXS5qb2luKCcgJyksXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBfdmFsaWRhdGVVcGRhdGVQYWNrYWdlcyhcbiAgaW5mb01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm8+LFxuICBmb3JjZTogYm9vbGVhbixcbiAgbmV4dDogYm9vbGVhbixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbik6IHZvaWQge1xuICBsb2dnZXIuZGVidWcoJ1VwZGF0aW5nIHRoZSBmb2xsb3dpbmcgcGFja2FnZXM6Jyk7XG4gIGluZm9NYXAuZm9yRWFjaCgoaW5mbykgPT4ge1xuICAgIGlmIChpbmZvLnRhcmdldCkge1xuICAgICAgbG9nZ2VyLmRlYnVnKGAgICR7aW5mby5uYW1lfSA9PiAke2luZm8udGFyZ2V0LnZlcnNpb259YCk7XG4gICAgfVxuICB9KTtcblxuICBsZXQgcGVlckVycm9ycyA9IGZhbHNlO1xuICBpbmZvTWFwLmZvckVhY2goKGluZm8pID0+IHtcbiAgICBjb25zdCB7IG5hbWUsIHRhcmdldCB9ID0gaW5mbztcbiAgICBpZiAoIXRhcmdldCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHBrZ0xvZ2dlciA9IGxvZ2dlci5jcmVhdGVDaGlsZChuYW1lKTtcbiAgICBsb2dnZXIuZGVidWcoYCR7bmFtZX0uLi5gKTtcblxuICAgIGNvbnN0IHsgcGVlckRlcGVuZGVuY2llcyA9IHt9LCBwZWVyRGVwZW5kZW5jaWVzTWV0YSA9IHt9IH0gPSB0YXJnZXQucGFja2FnZUpzb247XG4gICAgcGVlckVycm9ycyA9XG4gICAgICBfdmFsaWRhdGVGb3J3YXJkUGVlckRlcGVuZGVuY2llcyhcbiAgICAgICAgbmFtZSxcbiAgICAgICAgaW5mb01hcCxcbiAgICAgICAgcGVlckRlcGVuZGVuY2llcyxcbiAgICAgICAgcGVlckRlcGVuZGVuY2llc01ldGEsXG4gICAgICAgIHBrZ0xvZ2dlcixcbiAgICAgICAgbmV4dCxcbiAgICAgICkgfHwgcGVlckVycm9ycztcbiAgICBwZWVyRXJyb3JzID1cbiAgICAgIF92YWxpZGF0ZVJldmVyc2VQZWVyRGVwZW5kZW5jaWVzKG5hbWUsIHRhcmdldC52ZXJzaW9uLCBpbmZvTWFwLCBwa2dMb2dnZXIsIG5leHQpIHx8XG4gICAgICBwZWVyRXJyb3JzO1xuICB9KTtcblxuICBpZiAoIWZvcmNlICYmIHBlZXJFcnJvcnMpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbih0YWdzLnN0cmlwSW5kZW50c2BJbmNvbXBhdGlibGUgcGVlciBkZXBlbmRlbmNpZXMgZm91bmQuXG4gICAgICBQZWVyIGRlcGVuZGVuY3kgd2FybmluZ3Mgd2hlbiBpbnN0YWxsaW5nIGRlcGVuZGVuY2llcyBtZWFucyB0aGF0IHRob3NlIGRlcGVuZGVuY2llcyBtaWdodCBub3Qgd29yayBjb3JyZWN0bHkgdG9nZXRoZXIuXG4gICAgICBZb3UgY2FuIHVzZSB0aGUgJy0tZm9yY2UnIG9wdGlvbiB0byBpZ25vcmUgaW5jb21wYXRpYmxlIHBlZXIgZGVwZW5kZW5jaWVzIGFuZCBpbnN0ZWFkIGFkZHJlc3MgdGhlc2Ugd2FybmluZ3MgbGF0ZXIuYCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX3BlcmZvcm1VcGRhdGUoXG4gIHRyZWU6IFRyZWUsXG4gIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQsXG4gIGluZm9NYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbiAgbWlncmF0ZU9ubHk6IGJvb2xlYW4sXG4pOiB2b2lkIHtcbiAgY29uc3QgcGFja2FnZUpzb25Db250ZW50ID0gdHJlZS5yZWFkKCcvcGFja2FnZS5qc29uJyk7XG4gIGlmICghcGFja2FnZUpzb25Db250ZW50KSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIGEgcGFja2FnZS5qc29uLiBBcmUgeW91IGluIGEgTm9kZSBwcm9qZWN0PycpO1xuICB9XG5cbiAgbGV0IHBhY2thZ2VKc29uOiBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcztcbiAgdHJ5IHtcbiAgICBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25Db250ZW50LnRvU3RyaW5nKCkpIGFzIEpzb25TY2hlbWFGb3JOcG1QYWNrYWdlSnNvbkZpbGVzO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ3BhY2thZ2UuanNvbiBjb3VsZCBub3QgYmUgcGFyc2VkOiAnICsgZS5tZXNzYWdlKTtcbiAgfVxuXG4gIGNvbnN0IHVwZGF0ZURlcGVuZGVuY3kgPSAoZGVwczogRGVwZW5kZW5jeSwgbmFtZTogc3RyaW5nLCBuZXdWZXJzaW9uOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBvbGRWZXJzaW9uID0gZGVwc1tuYW1lXTtcbiAgICAvLyBXZSBvbmx5IHJlc3BlY3QgY2FyZXQgYW5kIHRpbGRlIHJhbmdlcyBvbiB1cGRhdGUuXG4gICAgY29uc3QgZXhlY1Jlc3VsdCA9IC9eW1xcXn5dLy5leGVjKG9sZFZlcnNpb24pO1xuICAgIGRlcHNbbmFtZV0gPSBgJHtleGVjUmVzdWx0ID8gZXhlY1Jlc3VsdFswXSA6ICcnfSR7bmV3VmVyc2lvbn1gO1xuICB9O1xuXG4gIGNvbnN0IHRvSW5zdGFsbCA9IFsuLi5pbmZvTWFwLnZhbHVlcygpXVxuICAgIC5tYXAoKHgpID0+IFt4Lm5hbWUsIHgudGFyZ2V0LCB4Lmluc3RhbGxlZF0pXG4gICAgLmZpbHRlcigoW25hbWUsIHRhcmdldCwgaW5zdGFsbGVkXSkgPT4ge1xuICAgICAgcmV0dXJuICEhbmFtZSAmJiAhIXRhcmdldCAmJiAhIWluc3RhbGxlZDtcbiAgICB9KSBhcyBbc3RyaW5nLCBQYWNrYWdlVmVyc2lvbkluZm8sIFBhY2thZ2VWZXJzaW9uSW5mb11bXTtcblxuICB0b0luc3RhbGwuZm9yRWFjaCgoW25hbWUsIHRhcmdldCwgaW5zdGFsbGVkXSkgPT4ge1xuICAgIGxvZ2dlci5pbmZvKFxuICAgICAgYFVwZGF0aW5nIHBhY2thZ2UuanNvbiB3aXRoIGRlcGVuZGVuY3kgJHtuYW1lfSBgICtcbiAgICAgICAgYEAgJHtKU09OLnN0cmluZ2lmeSh0YXJnZXQudmVyc2lvbil9ICh3YXMgJHtKU09OLnN0cmluZ2lmeShpbnN0YWxsZWQudmVyc2lvbil9KS4uLmAsXG4gICAgKTtcblxuICAgIGlmIChwYWNrYWdlSnNvbi5kZXBlbmRlbmNpZXMgJiYgcGFja2FnZUpzb24uZGVwZW5kZW5jaWVzW25hbWVdKSB7XG4gICAgICB1cGRhdGVEZXBlbmRlbmN5KHBhY2thZ2VKc29uLmRlcGVuZGVuY2llcywgbmFtZSwgdGFyZ2V0LnZlcnNpb24pO1xuXG4gICAgICBpZiAocGFja2FnZUpzb24uZGV2RGVwZW5kZW5jaWVzICYmIHBhY2thZ2VKc29uLmRldkRlcGVuZGVuY2llc1tuYW1lXSkge1xuICAgICAgICBkZWxldGUgcGFja2FnZUpzb24uZGV2RGVwZW5kZW5jaWVzW25hbWVdO1xuICAgICAgfVxuICAgICAgaWYgKHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXMgJiYgcGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXSkge1xuICAgICAgICBkZWxldGUgcGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHBhY2thZ2VKc29uLmRldkRlcGVuZGVuY2llcyAmJiBwYWNrYWdlSnNvbi5kZXZEZXBlbmRlbmNpZXNbbmFtZV0pIHtcbiAgICAgIHVwZGF0ZURlcGVuZGVuY3kocGFja2FnZUpzb24uZGV2RGVwZW5kZW5jaWVzLCBuYW1lLCB0YXJnZXQudmVyc2lvbik7XG5cbiAgICAgIGlmIChwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzICYmIHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV0pIHtcbiAgICAgICAgZGVsZXRlIHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzICYmIHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV0pIHtcbiAgICAgIHVwZGF0ZURlcGVuZGVuY3kocGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llcywgbmFtZSwgdGFyZ2V0LnZlcnNpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIud2FybihgUGFja2FnZSAke25hbWV9IHdhcyBub3QgZm91bmQgaW4gZGVwZW5kZW5jaWVzLmApO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgbmV3Q29udGVudCA9IEpTT04uc3RyaW5naWZ5KHBhY2thZ2VKc29uLCBudWxsLCAyKTtcbiAgaWYgKHBhY2thZ2VKc29uQ29udGVudC50b1N0cmluZygpICE9IG5ld0NvbnRlbnQgfHwgbWlncmF0ZU9ubHkpIHtcbiAgICBpZiAoIW1pZ3JhdGVPbmx5KSB7XG4gICAgICB0cmVlLm92ZXJ3cml0ZSgnL3BhY2thZ2UuanNvbicsIEpTT04uc3RyaW5naWZ5KHBhY2thZ2VKc29uLCBudWxsLCAyKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZXh0ZXJuYWxNaWdyYXRpb25zOiB7fVtdID0gW107XG5cbiAgICAvLyBSdW4gdGhlIG1pZ3JhdGUgc2NoZW1hdGljcyB3aXRoIHRoZSBsaXN0IG9mIHBhY2thZ2VzIHRvIHVzZS4gVGhlIGNvbGxlY3Rpb24gY29udGFpbnNcbiAgICAvLyB2ZXJzaW9uIGluZm9ybWF0aW9uIGFuZCB3ZSBuZWVkIHRvIGRvIHRoaXMgcG9zdCBpbnN0YWxsYXRpb24uIFBsZWFzZSBub3RlIHRoYXQgdGhlXG4gICAgLy8gbWlncmF0aW9uIENPVUxEIGZhaWwgYW5kIGxlYXZlIHNpZGUgZWZmZWN0cyBvbiBkaXNrLlxuICAgIC8vIFJ1biB0aGUgc2NoZW1hdGljcyB0YXNrIG9mIHRob3NlIHBhY2thZ2VzLlxuICAgIHRvSW5zdGFsbC5mb3JFYWNoKChbbmFtZSwgdGFyZ2V0LCBpbnN0YWxsZWRdKSA9PiB7XG4gICAgICBpZiAoIXRhcmdldC51cGRhdGVNZXRhZGF0YS5taWdyYXRpb25zKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZXh0ZXJuYWxNaWdyYXRpb25zLnB1c2goe1xuICAgICAgICBwYWNrYWdlOiBuYW1lLFxuICAgICAgICBjb2xsZWN0aW9uOiB0YXJnZXQudXBkYXRlTWV0YWRhdGEubWlncmF0aW9ucyxcbiAgICAgICAgZnJvbTogaW5zdGFsbGVkLnZlcnNpb24sXG4gICAgICAgIHRvOiB0YXJnZXQudmVyc2lvbixcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm47XG4gICAgfSk7XG5cbiAgICBpZiAoZXh0ZXJuYWxNaWdyYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAoZ2xvYmFsIGFzIGFueSkuZXh0ZXJuYWxNaWdyYXRpb25zID0gZXh0ZXJuYWxNaWdyYXRpb25zO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBfZ2V0VXBkYXRlTWV0YWRhdGEoXG4gIHBhY2thZ2VKc29uOiBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcyxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbik6IFVwZGF0ZU1ldGFkYXRhIHtcbiAgY29uc3QgbWV0YWRhdGEgPSBwYWNrYWdlSnNvblsnbmctdXBkYXRlJ107XG5cbiAgY29uc3QgcmVzdWx0OiBVcGRhdGVNZXRhZGF0YSA9IHtcbiAgICBwYWNrYWdlR3JvdXA6IHt9LFxuICAgIHJlcXVpcmVtZW50czoge30sXG4gIH07XG5cbiAgaWYgKCFtZXRhZGF0YSB8fCB0eXBlb2YgbWV0YWRhdGEgIT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShtZXRhZGF0YSkpIHtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgaWYgKG1ldGFkYXRhWydwYWNrYWdlR3JvdXAnXSkge1xuICAgIGNvbnN0IHBhY2thZ2VHcm91cCA9IG1ldGFkYXRhWydwYWNrYWdlR3JvdXAnXTtcbiAgICAvLyBWZXJpZnkgdGhhdCBwYWNrYWdlR3JvdXAgaXMgYW4gYXJyYXkgb2Ygc3RyaW5ncyBvciBhbiBtYXAgb2YgdmVyc2lvbnMuIFRoaXMgaXMgbm90IGFuIGVycm9yXG4gICAgLy8gYnV0IHdlIHN0aWxsIHdhcm4gdGhlIHVzZXIgYW5kIGlnbm9yZSB0aGUgcGFja2FnZUdyb3VwIGtleXMuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkocGFja2FnZUdyb3VwKSAmJiBwYWNrYWdlR3JvdXAuZXZlcnkoKHgpID0+IHR5cGVvZiB4ID09ICdzdHJpbmcnKSkge1xuICAgICAgcmVzdWx0LnBhY2thZ2VHcm91cCA9IHBhY2thZ2VHcm91cC5yZWR1Y2UoKGdyb3VwLCBuYW1lKSA9PiB7XG4gICAgICAgIGdyb3VwW25hbWVdID0gcGFja2FnZUpzb24udmVyc2lvbjtcblxuICAgICAgICByZXR1cm4gZ3JvdXA7XG4gICAgICB9LCByZXN1bHQucGFja2FnZUdyb3VwKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgdHlwZW9mIHBhY2thZ2VHcm91cCA9PSAnb2JqZWN0JyAmJlxuICAgICAgcGFja2FnZUdyb3VwICYmXG4gICAgICBPYmplY3QudmFsdWVzKHBhY2thZ2VHcm91cCkuZXZlcnkoKHgpID0+IHR5cGVvZiB4ID09ICdzdHJpbmcnKVxuICAgICkge1xuICAgICAgcmVzdWx0LnBhY2thZ2VHcm91cCA9IHBhY2thZ2VHcm91cDtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLndhcm4oYHBhY2thZ2VHcm91cCBtZXRhZGF0YSBvZiBwYWNrYWdlICR7cGFja2FnZUpzb24ubmFtZX0gaXMgbWFsZm9ybWVkLiBJZ25vcmluZy5gKTtcbiAgICB9XG5cbiAgICByZXN1bHQucGFja2FnZUdyb3VwTmFtZSA9IE9iamVjdC5rZXlzKHJlc3VsdC5wYWNrYWdlR3JvdXApWzBdO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBtZXRhZGF0YVsncGFja2FnZUdyb3VwTmFtZSddID09ICdzdHJpbmcnKSB7XG4gICAgcmVzdWx0LnBhY2thZ2VHcm91cE5hbWUgPSBtZXRhZGF0YVsncGFja2FnZUdyb3VwTmFtZSddO1xuICB9XG5cbiAgaWYgKG1ldGFkYXRhWydyZXF1aXJlbWVudHMnXSkge1xuICAgIGNvbnN0IHJlcXVpcmVtZW50cyA9IG1ldGFkYXRhWydyZXF1aXJlbWVudHMnXTtcbiAgICAvLyBWZXJpZnkgdGhhdCByZXF1aXJlbWVudHMgYXJlXG4gICAgaWYgKFxuICAgICAgdHlwZW9mIHJlcXVpcmVtZW50cyAhPSAnb2JqZWN0JyB8fFxuICAgICAgQXJyYXkuaXNBcnJheShyZXF1aXJlbWVudHMpIHx8XG4gICAgICBPYmplY3Qua2V5cyhyZXF1aXJlbWVudHMpLnNvbWUoKG5hbWUpID0+IHR5cGVvZiByZXF1aXJlbWVudHNbbmFtZV0gIT0gJ3N0cmluZycpXG4gICAgKSB7XG4gICAgICBsb2dnZXIud2FybihgcmVxdWlyZW1lbnRzIG1ldGFkYXRhIG9mIHBhY2thZ2UgJHtwYWNrYWdlSnNvbi5uYW1lfSBpcyBtYWxmb3JtZWQuIElnbm9yaW5nLmApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucmVxdWlyZW1lbnRzID0gcmVxdWlyZW1lbnRzO1xuICAgIH1cbiAgfVxuXG4gIGlmIChtZXRhZGF0YVsnbWlncmF0aW9ucyddKSB7XG4gICAgY29uc3QgbWlncmF0aW9ucyA9IG1ldGFkYXRhWydtaWdyYXRpb25zJ107XG4gICAgaWYgKHR5cGVvZiBtaWdyYXRpb25zICE9ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIud2FybihgbWlncmF0aW9ucyBtZXRhZGF0YSBvZiBwYWNrYWdlICR7cGFja2FnZUpzb24ubmFtZX0gaXMgbWFsZm9ybWVkLiBJZ25vcmluZy5gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0Lm1pZ3JhdGlvbnMgPSBtaWdyYXRpb25zO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIF91c2FnZU1lc3NhZ2UoXG4gIG9wdGlvbnM6IFVwZGF0ZVNjaGVtYSxcbiAgaW5mb01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm8+LFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuKSB7XG4gIGNvbnN0IHBhY2thZ2VHcm91cHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCBwYWNrYWdlc1RvVXBkYXRlID0gWy4uLmluZm9NYXAuZW50cmllcygpXVxuICAgIC5tYXAoKFtuYW1lLCBpbmZvXSkgPT4ge1xuICAgICAgbGV0IHRhZyA9IG9wdGlvbnMubmV4dFxuICAgICAgICA/IGluZm8ubnBtUGFja2FnZUpzb25bJ2Rpc3QtdGFncyddWyduZXh0J11cbiAgICAgICAgICA/ICduZXh0J1xuICAgICAgICAgIDogJ2xhdGVzdCdcbiAgICAgICAgOiAnbGF0ZXN0JztcbiAgICAgIGxldCB2ZXJzaW9uID0gaW5mby5ucG1QYWNrYWdlSnNvblsnZGlzdC10YWdzJ11bdGFnXTtcbiAgICAgIGxldCB0YXJnZXQgPSBpbmZvLm5wbVBhY2thZ2VKc29uLnZlcnNpb25zW3ZlcnNpb25dO1xuXG4gICAgICBjb25zdCB2ZXJzaW9uRGlmZiA9IHNlbXZlci5kaWZmKGluZm8uaW5zdGFsbGVkLnZlcnNpb24sIHZlcnNpb24pO1xuICAgICAgaWYgKFxuICAgICAgICB2ZXJzaW9uRGlmZiAhPT0gJ3BhdGNoJyAmJlxuICAgICAgICB2ZXJzaW9uRGlmZiAhPT0gJ21pbm9yJyAmJlxuICAgICAgICAvXkAoPzphbmd1bGFyfG5ndW5pdmVyc2FsKVxcLy8udGVzdChuYW1lKVxuICAgICAgKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbGxlZE1ham9yVmVyc2lvbiA9IHNlbXZlci5wYXJzZShpbmZvLmluc3RhbGxlZC52ZXJzaW9uKT8ubWFqb3I7XG4gICAgICAgIGNvbnN0IHRvSW5zdGFsbE1ham9yVmVyc2lvbiA9IHNlbXZlci5wYXJzZSh2ZXJzaW9uKT8ubWFqb3I7XG4gICAgICAgIGlmIChcbiAgICAgICAgICBpbnN0YWxsZWRNYWpvclZlcnNpb24gIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgIHRvSW5zdGFsbE1ham9yVmVyc2lvbiAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgaW5zdGFsbGVkTWFqb3JWZXJzaW9uIDwgdG9JbnN0YWxsTWFqb3JWZXJzaW9uIC0gMVxuICAgICAgICApIHtcbiAgICAgICAgICBjb25zdCBuZXh0TWFqb3JWZXJzaW9uID0gYCR7aW5zdGFsbGVkTWFqb3JWZXJzaW9uICsgMX0uYDtcbiAgICAgICAgICBjb25zdCBuZXh0TWFqb3JWZXJzaW9ucyA9IE9iamVjdC5rZXlzKGluZm8ubnBtUGFja2FnZUpzb24udmVyc2lvbnMpXG4gICAgICAgICAgICAuZmlsdGVyKCh2KSA9PiB2LnN0YXJ0c1dpdGgobmV4dE1ham9yVmVyc2lvbikpXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gKGEgPiBiID8gLTEgOiAxKSk7XG5cbiAgICAgICAgICBpZiAobmV4dE1ham9yVmVyc2lvbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICB2ZXJzaW9uID0gbmV4dE1ham9yVmVyc2lvbnNbMF07XG4gICAgICAgICAgICB0YXJnZXQgPSBpbmZvLm5wbVBhY2thZ2VKc29uLnZlcnNpb25zW3ZlcnNpb25dO1xuICAgICAgICAgICAgdGFnID0gJyc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIGluZm8sXG4gICAgICAgIHZlcnNpb24sXG4gICAgICAgIHRhZyxcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgfTtcbiAgICB9KVxuICAgIC5maWx0ZXIoXG4gICAgICAoeyBpbmZvLCB2ZXJzaW9uLCB0YXJnZXQgfSkgPT5cbiAgICAgICAgdGFyZ2V0Py5bJ25nLXVwZGF0ZSddICYmIHNlbXZlci5jb21wYXJlKGluZm8uaW5zdGFsbGVkLnZlcnNpb24sIHZlcnNpb24pIDwgMCxcbiAgICApXG4gICAgLm1hcCgoeyBuYW1lLCBpbmZvLCB2ZXJzaW9uLCB0YWcsIHRhcmdldCB9KSA9PiB7XG4gICAgICAvLyBMb29rIGZvciBwYWNrYWdlR3JvdXAuXG4gICAgICBjb25zdCBwYWNrYWdlR3JvdXAgPSB0YXJnZXRbJ25nLXVwZGF0ZSddWydwYWNrYWdlR3JvdXAnXTtcbiAgICAgIGlmIChwYWNrYWdlR3JvdXApIHtcbiAgICAgICAgY29uc3QgcGFja2FnZUdyb3VwTmFtZSA9IHRhcmdldFsnbmctdXBkYXRlJ11bJ3BhY2thZ2VHcm91cE5hbWUnXSB8fCBwYWNrYWdlR3JvdXBbMF07XG4gICAgICAgIGlmIChwYWNrYWdlR3JvdXBOYW1lKSB7XG4gICAgICAgICAgaWYgKHBhY2thZ2VHcm91cHMuaGFzKG5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwYWNrYWdlR3JvdXAuZm9yRWFjaCgoeDogc3RyaW5nKSA9PiBwYWNrYWdlR3JvdXBzLnNldCh4LCBwYWNrYWdlR3JvdXBOYW1lKSk7XG4gICAgICAgICAgcGFja2FnZUdyb3Vwcy5zZXQocGFja2FnZUdyb3VwTmFtZSwgcGFja2FnZUdyb3VwTmFtZSk7XG4gICAgICAgICAgbmFtZSA9IHBhY2thZ2VHcm91cE5hbWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgbGV0IGNvbW1hbmQgPSBgbmcgdXBkYXRlICR7bmFtZX1gO1xuICAgICAgaWYgKCF0YWcpIHtcbiAgICAgICAgY29tbWFuZCArPSBgQCR7c2VtdmVyLnBhcnNlKHZlcnNpb24pPy5tYWpvciB8fCB2ZXJzaW9ufWA7XG4gICAgICB9IGVsc2UgaWYgKHRhZyA9PSAnbmV4dCcpIHtcbiAgICAgICAgY29tbWFuZCArPSAnIC0tbmV4dCc7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBbbmFtZSwgYCR7aW5mby5pbnN0YWxsZWQudmVyc2lvbn0gLT4gJHt2ZXJzaW9ufSBgLCBjb21tYW5kXTtcbiAgICB9KVxuICAgIC5maWx0ZXIoKHgpID0+IHggIT09IG51bGwpXG4gICAgLnNvcnQoKGEsIGIpID0+IChhICYmIGIgPyBhWzBdLmxvY2FsZUNvbXBhcmUoYlswXSkgOiAwKSk7XG5cbiAgaWYgKHBhY2thZ2VzVG9VcGRhdGUubGVuZ3RoID09IDApIHtcbiAgICBsb2dnZXIuaW5mbygnV2UgYW5hbHl6ZWQgeW91ciBwYWNrYWdlLmpzb24gYW5kIGV2ZXJ5dGhpbmcgc2VlbXMgdG8gYmUgaW4gb3JkZXIuIEdvb2Qgd29yayEnKTtcblxuICAgIHJldHVybjtcbiAgfVxuXG4gIGxvZ2dlci5pbmZvKCdXZSBhbmFseXplZCB5b3VyIHBhY2thZ2UuanNvbiwgdGhlcmUgYXJlIHNvbWUgcGFja2FnZXMgdG8gdXBkYXRlOlxcbicpO1xuXG4gIC8vIEZpbmQgdGhlIGxhcmdlc3QgbmFtZSB0byBrbm93IHRoZSBwYWRkaW5nIG5lZWRlZC5cbiAgbGV0IG5hbWVQYWQgPSBNYXRoLm1heCguLi5bLi4uaW5mb01hcC5rZXlzKCldLm1hcCgoeCkgPT4geC5sZW5ndGgpKSArIDI7XG4gIGlmICghTnVtYmVyLmlzRmluaXRlKG5hbWVQYWQpKSB7XG4gICAgbmFtZVBhZCA9IDMwO1xuICB9XG4gIGNvbnN0IHBhZHMgPSBbbmFtZVBhZCwgMjUsIDBdO1xuXG4gIGxvZ2dlci5pbmZvKFxuICAgICcgICcgKyBbJ05hbWUnLCAnVmVyc2lvbicsICdDb21tYW5kIHRvIHVwZGF0ZSddLm1hcCgoeCwgaSkgPT4geC5wYWRFbmQocGFkc1tpXSkpLmpvaW4oJycpLFxuICApO1xuICBsb2dnZXIuaW5mbygnICcgKyAnLScucmVwZWF0KHBhZHMucmVkdWNlKChzLCB4KSA9PiAocyArPSB4KSwgMCkgKyAyMCkpO1xuXG4gIHBhY2thZ2VzVG9VcGRhdGUuZm9yRWFjaCgoZmllbGRzKSA9PiB7XG4gICAgaWYgKCFmaWVsZHMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbygnICAnICsgZmllbGRzLm1hcCgoeCwgaSkgPT4geC5wYWRFbmQocGFkc1tpXSkpLmpvaW4oJycpKTtcbiAgfSk7XG5cbiAgbG9nZ2VyLmluZm8oXG4gICAgYFxcblRoZXJlIG1pZ2h0IGJlIGFkZGl0aW9uYWwgcGFja2FnZXMgd2hpY2ggZG9uJ3QgcHJvdmlkZSAnbmcgdXBkYXRlJyBjYXBhYmlsaXRpZXMgdGhhdCBhcmUgb3V0ZGF0ZWQuXFxuYCArXG4gICAgICBgWW91IGNhbiB1cGRhdGUgdGhlIGFkZGl0aW9uYWwgcGFja2FnZXMgYnkgcnVubmluZyB0aGUgdXBkYXRlIGNvbW1hbmQgb2YgeW91ciBwYWNrYWdlIG1hbmFnZXIuYCxcbiAgKTtcblxuICByZXR1cm47XG59XG5cbmZ1bmN0aW9uIF9idWlsZFBhY2thZ2VJbmZvKFxuICB0cmVlOiBUcmVlLFxuICBwYWNrYWdlczogTWFwPHN0cmluZywgVmVyc2lvblJhbmdlPixcbiAgYWxsRGVwZW5kZW5jaWVzOiBSZWFkb25seU1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4sXG4gIG5wbVBhY2thZ2VKc29uOiBOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IG5hbWUgPSBucG1QYWNrYWdlSnNvbi5uYW1lO1xuICBjb25zdCBwYWNrYWdlSnNvblJhbmdlID0gYWxsRGVwZW5kZW5jaWVzLmdldChuYW1lKTtcbiAgaWYgKCFwYWNrYWdlSnNvblJhbmdlKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFBhY2thZ2UgJHtKU09OLnN0cmluZ2lmeShuYW1lKX0gd2FzIG5vdCBmb3VuZCBpbiBwYWNrYWdlLmpzb24uYCk7XG4gIH1cblxuICAvLyBGaW5kIG91dCB0aGUgY3VycmVudGx5IGluc3RhbGxlZCB2ZXJzaW9uLiBFaXRoZXIgZnJvbSB0aGUgcGFja2FnZS5qc29uIG9yIHRoZSBub2RlX21vZHVsZXMvXG4gIC8vIFRPRE86IGZpZ3VyZSBvdXQgYSB3YXkgdG8gcmVhZCBwYWNrYWdlLWxvY2suanNvbiBhbmQvb3IgeWFybi5sb2NrLlxuICBsZXQgaW5zdGFsbGVkVmVyc2lvbjogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbDtcbiAgY29uc3QgcGFja2FnZUNvbnRlbnQgPSB0cmVlLnJlYWQoYC9ub2RlX21vZHVsZXMvJHtuYW1lfS9wYWNrYWdlLmpzb25gKTtcbiAgaWYgKHBhY2thZ2VDb250ZW50KSB7XG4gICAgY29uc3QgY29udGVudCA9IEpTT04ucGFyc2UocGFja2FnZUNvbnRlbnQudG9TdHJpbmcoKSkgYXMgSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXM7XG4gICAgaW5zdGFsbGVkVmVyc2lvbiA9IGNvbnRlbnQudmVyc2lvbjtcbiAgfVxuICBpZiAoIWluc3RhbGxlZFZlcnNpb24pIHtcbiAgICAvLyBGaW5kIHRoZSB2ZXJzaW9uIGZyb20gTlBNIHRoYXQgZml0cyB0aGUgcmFuZ2UgdG8gbWF4LlxuICAgIGluc3RhbGxlZFZlcnNpb24gPSBzZW12ZXIubWF4U2F0aXNmeWluZyhPYmplY3Qua2V5cyhucG1QYWNrYWdlSnNvbi52ZXJzaW9ucyksIHBhY2thZ2VKc29uUmFuZ2UpO1xuICB9XG5cbiAgaWYgKCFpbnN0YWxsZWRWZXJzaW9uKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oXG4gICAgICBgQW4gdW5leHBlY3RlZCBlcnJvciBoYXBwZW5lZDsgY291bGQgbm90IGRldGVybWluZSB2ZXJzaW9uIGZvciBwYWNrYWdlICR7bmFtZX0uYCxcbiAgICApO1xuICB9XG5cbiAgY29uc3QgaW5zdGFsbGVkUGFja2FnZUpzb24gPSBucG1QYWNrYWdlSnNvbi52ZXJzaW9uc1tpbnN0YWxsZWRWZXJzaW9uXSB8fCBwYWNrYWdlQ29udGVudDtcbiAgaWYgKCFpbnN0YWxsZWRQYWNrYWdlSnNvbikge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKFxuICAgICAgYEFuIHVuZXhwZWN0ZWQgZXJyb3IgaGFwcGVuZWQ7IHBhY2thZ2UgJHtuYW1lfSBoYXMgbm8gdmVyc2lvbiAke2luc3RhbGxlZFZlcnNpb259LmAsXG4gICAgKTtcbiAgfVxuXG4gIGxldCB0YXJnZXRWZXJzaW9uOiBWZXJzaW9uUmFuZ2UgfCB1bmRlZmluZWQgPSBwYWNrYWdlcy5nZXQobmFtZSk7XG4gIGlmICh0YXJnZXRWZXJzaW9uKSB7XG4gICAgaWYgKG5wbVBhY2thZ2VKc29uWydkaXN0LXRhZ3MnXVt0YXJnZXRWZXJzaW9uXSkge1xuICAgICAgdGFyZ2V0VmVyc2lvbiA9IG5wbVBhY2thZ2VKc29uWydkaXN0LXRhZ3MnXVt0YXJnZXRWZXJzaW9uXSBhcyBWZXJzaW9uUmFuZ2U7XG4gICAgfSBlbHNlIGlmICh0YXJnZXRWZXJzaW9uID09ICduZXh0Jykge1xuICAgICAgdGFyZ2V0VmVyc2lvbiA9IG5wbVBhY2thZ2VKc29uWydkaXN0LXRhZ3MnXVsnbGF0ZXN0J10gYXMgVmVyc2lvblJhbmdlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRWZXJzaW9uID0gc2VtdmVyLm1heFNhdGlzZnlpbmcoXG4gICAgICAgIE9iamVjdC5rZXlzKG5wbVBhY2thZ2VKc29uLnZlcnNpb25zKSxcbiAgICAgICAgdGFyZ2V0VmVyc2lvbixcbiAgICAgICkgYXMgVmVyc2lvblJhbmdlO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0YXJnZXRWZXJzaW9uICYmIHNlbXZlci5sdGUodGFyZ2V0VmVyc2lvbiwgaW5zdGFsbGVkVmVyc2lvbikpIHtcbiAgICBsb2dnZXIuZGVidWcoYFBhY2thZ2UgJHtuYW1lfSBhbHJlYWR5IHNhdGlzZmllZCBieSBwYWNrYWdlLmpzb24gKCR7cGFja2FnZUpzb25SYW5nZX0pLmApO1xuICAgIHRhcmdldFZlcnNpb24gPSB1bmRlZmluZWQ7XG4gIH1cblxuICBjb25zdCB0YXJnZXQ6IFBhY2thZ2VWZXJzaW9uSW5mbyB8IHVuZGVmaW5lZCA9IHRhcmdldFZlcnNpb25cbiAgICA/IHtcbiAgICAgICAgdmVyc2lvbjogdGFyZ2V0VmVyc2lvbixcbiAgICAgICAgcGFja2FnZUpzb246IG5wbVBhY2thZ2VKc29uLnZlcnNpb25zW3RhcmdldFZlcnNpb25dLFxuICAgICAgICB1cGRhdGVNZXRhZGF0YTogX2dldFVwZGF0ZU1ldGFkYXRhKG5wbVBhY2thZ2VKc29uLnZlcnNpb25zW3RhcmdldFZlcnNpb25dLCBsb2dnZXIpLFxuICAgICAgfVxuICAgIDogdW5kZWZpbmVkO1xuXG4gIC8vIENoZWNrIGlmIHRoZXJlJ3MgYW4gaW5zdGFsbGVkIHZlcnNpb24uXG4gIHJldHVybiB7XG4gICAgbmFtZSxcbiAgICBucG1QYWNrYWdlSnNvbixcbiAgICBpbnN0YWxsZWQ6IHtcbiAgICAgIHZlcnNpb246IGluc3RhbGxlZFZlcnNpb24gYXMgVmVyc2lvblJhbmdlLFxuICAgICAgcGFja2FnZUpzb246IGluc3RhbGxlZFBhY2thZ2VKc29uLFxuICAgICAgdXBkYXRlTWV0YWRhdGE6IF9nZXRVcGRhdGVNZXRhZGF0YShpbnN0YWxsZWRQYWNrYWdlSnNvbiwgbG9nZ2VyKSxcbiAgICB9LFxuICAgIHRhcmdldCxcbiAgICBwYWNrYWdlSnNvblJhbmdlLFxuICB9O1xufVxuXG5mdW5jdGlvbiBfYnVpbGRQYWNrYWdlTGlzdChcbiAgb3B0aW9uczogVXBkYXRlU2NoZW1hLFxuICBwcm9qZWN0RGVwczogTWFwPHN0cmluZywgVmVyc2lvblJhbmdlPixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbik6IE1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4ge1xuICAvLyBQYXJzZSB0aGUgcGFja2FnZXMgb3B0aW9ucyB0byBzZXQgdGhlIHRhcmdldGVkIHZlcnNpb24uXG4gIGNvbnN0IHBhY2thZ2VzID0gbmV3IE1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4oKTtcbiAgY29uc3QgY29tbWFuZExpbmVQYWNrYWdlcyA9XG4gICAgb3B0aW9ucy5wYWNrYWdlcyAmJiBvcHRpb25zLnBhY2thZ2VzLmxlbmd0aCA+IDAgPyBvcHRpb25zLnBhY2thZ2VzIDogW107XG5cbiAgZm9yIChjb25zdCBwa2cgb2YgY29tbWFuZExpbmVQYWNrYWdlcykge1xuICAgIC8vIFNwbGl0IHRoZSB2ZXJzaW9uIGFza2VkIG9uIGNvbW1hbmQgbGluZS5cbiAgICBjb25zdCBtID0gcGtnLm1hdGNoKC9eKCg/OkBbXi9dezEsMTAwfVxcLyk/W15AXXsxLDEwMH0pKD86QCguezEsMTAwfSkpPyQvKTtcbiAgICBpZiAoIW0pIHtcbiAgICAgIGxvZ2dlci53YXJuKGBJbnZhbGlkIHBhY2thZ2UgYXJndW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkocGtnKX0uIFNraXBwaW5nLmApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgWywgbnBtTmFtZSwgbWF5YmVWZXJzaW9uXSA9IG07XG5cbiAgICBjb25zdCB2ZXJzaW9uID0gcHJvamVjdERlcHMuZ2V0KG5wbU5hbWUpO1xuICAgIGlmICghdmVyc2lvbikge1xuICAgICAgbG9nZ2VyLndhcm4oYFBhY2thZ2Ugbm90IGluc3RhbGxlZDogJHtKU09OLnN0cmluZ2lmeShucG1OYW1lKX0uIFNraXBwaW5nLmApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcGFja2FnZXMuc2V0KG5wbU5hbWUsIChtYXliZVZlcnNpb24gfHwgKG9wdGlvbnMubmV4dCA/ICduZXh0JyA6ICdsYXRlc3QnKSkgYXMgVmVyc2lvblJhbmdlKTtcbiAgfVxuXG4gIHJldHVybiBwYWNrYWdlcztcbn1cblxuZnVuY3Rpb24gX2FkZFBhY2thZ2VHcm91cChcbiAgdHJlZTogVHJlZSxcbiAgcGFja2FnZXM6IE1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4sXG4gIGFsbERlcGVuZGVuY2llczogUmVhZG9ubHlNYXA8c3RyaW5nLCBWZXJzaW9uUmFuZ2U+LFxuICBucG1QYWNrYWdlSnNvbjogTnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uLFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuKTogdm9pZCB7XG4gIGNvbnN0IG1heWJlUGFja2FnZSA9IHBhY2thZ2VzLmdldChucG1QYWNrYWdlSnNvbi5uYW1lKTtcbiAgaWYgKCFtYXliZVBhY2thZ2UpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBpbmZvID0gX2J1aWxkUGFja2FnZUluZm8odHJlZSwgcGFja2FnZXMsIGFsbERlcGVuZGVuY2llcywgbnBtUGFja2FnZUpzb24sIGxvZ2dlcik7XG5cbiAgY29uc3QgdmVyc2lvbiA9XG4gICAgKGluZm8udGFyZ2V0ICYmIGluZm8udGFyZ2V0LnZlcnNpb24pIHx8XG4gICAgbnBtUGFja2FnZUpzb25bJ2Rpc3QtdGFncyddW21heWJlUGFja2FnZV0gfHxcbiAgICBtYXliZVBhY2thZ2U7XG4gIGlmICghbnBtUGFja2FnZUpzb24udmVyc2lvbnNbdmVyc2lvbl0pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgbmdVcGRhdGVNZXRhZGF0YSA9IG5wbVBhY2thZ2VKc29uLnZlcnNpb25zW3ZlcnNpb25dWyduZy11cGRhdGUnXTtcbiAgaWYgKCFuZ1VwZGF0ZU1ldGFkYXRhKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGV0IHBhY2thZ2VHcm91cCA9IG5nVXBkYXRlTWV0YWRhdGFbJ3BhY2thZ2VHcm91cCddO1xuICBpZiAoIXBhY2thZ2VHcm91cCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoQXJyYXkuaXNBcnJheShwYWNrYWdlR3JvdXApICYmICFwYWNrYWdlR3JvdXAuc29tZSgoeCkgPT4gdHlwZW9mIHggIT0gJ3N0cmluZycpKSB7XG4gICAgcGFja2FnZUdyb3VwID0gcGFja2FnZUdyb3VwLnJlZHVjZSgoYWNjLCBjdXJyKSA9PiB7XG4gICAgICBhY2NbY3Vycl0gPSBtYXliZVBhY2thZ2U7XG5cbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwge30gYXMgeyBbbmFtZTogc3RyaW5nXTogc3RyaW5nIH0pO1xuICB9XG5cbiAgLy8gT25seSBuZWVkIHRvIGNoZWNrIGlmIGl0J3MgYW4gb2JqZWN0IGJlY2F1c2Ugd2Ugc2V0IGl0IHJpZ2h0IHRoZSB0aW1lIGJlZm9yZS5cbiAgaWYgKFxuICAgIHR5cGVvZiBwYWNrYWdlR3JvdXAgIT0gJ29iamVjdCcgfHxcbiAgICBwYWNrYWdlR3JvdXAgPT09IG51bGwgfHxcbiAgICBPYmplY3QudmFsdWVzKHBhY2thZ2VHcm91cCkuc29tZSgodikgPT4gdHlwZW9mIHYgIT0gJ3N0cmluZycpXG4gICkge1xuICAgIGxvZ2dlci53YXJuKGBwYWNrYWdlR3JvdXAgbWV0YWRhdGEgb2YgcGFja2FnZSAke25wbVBhY2thZ2VKc29uLm5hbWV9IGlzIG1hbGZvcm1lZC5gKTtcblxuICAgIHJldHVybjtcbiAgfVxuXG4gIE9iamVjdC5rZXlzKHBhY2thZ2VHcm91cClcbiAgICAuZmlsdGVyKChuYW1lKSA9PiAhcGFja2FnZXMuaGFzKG5hbWUpKSAvLyBEb24ndCBvdmVycmlkZSBuYW1lcyBmcm9tIHRoZSBjb21tYW5kIGxpbmUuXG4gICAgLmZpbHRlcigobmFtZSkgPT4gYWxsRGVwZW5kZW5jaWVzLmhhcyhuYW1lKSkgLy8gUmVtb3ZlIHBhY2thZ2VzIHRoYXQgYXJlbid0IGluc3RhbGxlZC5cbiAgICAuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgcGFja2FnZXMuc2V0KG5hbWUsIHBhY2thZ2VHcm91cFtuYW1lXSk7XG4gICAgfSk7XG59XG5cbi8qKlxuICogQWRkIHBlZXIgZGVwZW5kZW5jaWVzIG9mIHBhY2thZ2VzIG9uIHRoZSBjb21tYW5kIGxpbmUgdG8gdGhlIGxpc3Qgb2YgcGFja2FnZXMgdG8gdXBkYXRlLlxuICogV2UgZG9uJ3QgZG8gdmVyaWZpY2F0aW9uIG9mIHRoZSB2ZXJzaW9ucyBoZXJlIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IGEgbGF0ZXIgc3RlcCAoYW5kIGNhblxuICogYmUgaWdub3JlZCBieSB0aGUgLS1mb3JjZSBmbGFnKS5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9hZGRQZWVyRGVwZW5kZW5jaWVzKFxuICB0cmVlOiBUcmVlLFxuICBwYWNrYWdlczogTWFwPHN0cmluZywgVmVyc2lvblJhbmdlPixcbiAgYWxsRGVwZW5kZW5jaWVzOiBSZWFkb25seU1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4sXG4gIG5wbVBhY2thZ2VKc29uOiBOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24sXG4gIG5wbVBhY2thZ2VKc29uTWFwOiBNYXA8c3RyaW5nLCBOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24+LFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuKTogdm9pZCB7XG4gIGNvbnN0IG1heWJlUGFja2FnZSA9IHBhY2thZ2VzLmdldChucG1QYWNrYWdlSnNvbi5uYW1lKTtcbiAgaWYgKCFtYXliZVBhY2thZ2UpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBpbmZvID0gX2J1aWxkUGFja2FnZUluZm8odHJlZSwgcGFja2FnZXMsIGFsbERlcGVuZGVuY2llcywgbnBtUGFja2FnZUpzb24sIGxvZ2dlcik7XG5cbiAgY29uc3QgdmVyc2lvbiA9XG4gICAgKGluZm8udGFyZ2V0ICYmIGluZm8udGFyZ2V0LnZlcnNpb24pIHx8XG4gICAgbnBtUGFja2FnZUpzb25bJ2Rpc3QtdGFncyddW21heWJlUGFja2FnZV0gfHxcbiAgICBtYXliZVBhY2thZ2U7XG4gIGlmICghbnBtUGFja2FnZUpzb24udmVyc2lvbnNbdmVyc2lvbl0pIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBwYWNrYWdlSnNvbiA9IG5wbVBhY2thZ2VKc29uLnZlcnNpb25zW3ZlcnNpb25dO1xuICBjb25zdCBlcnJvciA9IGZhbHNlO1xuXG4gIGZvciAoY29uc3QgW3BlZXIsIHJhbmdlXSBvZiBPYmplY3QuZW50cmllcyhwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzIHx8IHt9KSkge1xuICAgIGlmIChwYWNrYWdlcy5oYXMocGVlcikpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHBlZXJQYWNrYWdlSnNvbiA9IG5wbVBhY2thZ2VKc29uTWFwLmdldChwZWVyKTtcbiAgICBpZiAocGVlclBhY2thZ2VKc29uKSB7XG4gICAgICBjb25zdCBwZWVySW5mbyA9IF9idWlsZFBhY2thZ2VJbmZvKHRyZWUsIHBhY2thZ2VzLCBhbGxEZXBlbmRlbmNpZXMsIHBlZXJQYWNrYWdlSnNvbiwgbG9nZ2VyKTtcbiAgICAgIGlmIChzZW12ZXIuc2F0aXNmaWVzKHBlZXJJbmZvLmluc3RhbGxlZC52ZXJzaW9uLCByYW5nZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcGFja2FnZXMuc2V0KHBlZXIsIHJhbmdlIGFzIFZlcnNpb25SYW5nZSk7XG4gIH1cblxuICBpZiAoZXJyb3IpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQW4gZXJyb3Igb2NjdXJlZCwgc2VlIGFib3ZlLicpO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9nZXRBbGxEZXBlbmRlbmNpZXModHJlZTogVHJlZSk6IEFycmF5PHJlYWRvbmx5IFtzdHJpbmcsIFZlcnNpb25SYW5nZV0+IHtcbiAgY29uc3QgcGFja2FnZUpzb25Db250ZW50ID0gdHJlZS5yZWFkKCcvcGFja2FnZS5qc29uJyk7XG4gIGlmICghcGFja2FnZUpzb25Db250ZW50KSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIGEgcGFja2FnZS5qc29uLiBBcmUgeW91IGluIGEgTm9kZSBwcm9qZWN0PycpO1xuICB9XG5cbiAgbGV0IHBhY2thZ2VKc29uOiBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcztcbiAgdHJ5IHtcbiAgICBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25Db250ZW50LnRvU3RyaW5nKCkpIGFzIEpzb25TY2hlbWFGb3JOcG1QYWNrYWdlSnNvbkZpbGVzO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ3BhY2thZ2UuanNvbiBjb3VsZCBub3QgYmUgcGFyc2VkOiAnICsgZS5tZXNzYWdlKTtcbiAgfVxuXG4gIHJldHVybiBbXG4gICAgLi4uKE9iamVjdC5lbnRyaWVzKHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXMgfHwge30pIGFzIEFycmF5PFtzdHJpbmcsIFZlcnNpb25SYW5nZV0+KSxcbiAgICAuLi4oT2JqZWN0LmVudHJpZXMocGFja2FnZUpzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9KSBhcyBBcnJheTxbc3RyaW5nLCBWZXJzaW9uUmFuZ2VdPiksXG4gICAgLi4uKE9iamVjdC5lbnRyaWVzKHBhY2thZ2VKc29uLmRlcGVuZGVuY2llcyB8fCB7fSkgYXMgQXJyYXk8W3N0cmluZywgVmVyc2lvblJhbmdlXT4pLFxuICBdO1xufVxuXG5mdW5jdGlvbiBfZm9ybWF0VmVyc2lvbih2ZXJzaW9uOiBzdHJpbmcgfCB1bmRlZmluZWQpIHtcbiAgaWYgKHZlcnNpb24gPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAoIXZlcnNpb24ubWF0Y2goL15cXGR7MSwzMH1cXC5cXGR7MSwzMH1cXC5cXGR7MSwzMH0vKSkge1xuICAgIHZlcnNpb24gKz0gJy4wJztcbiAgfVxuICBpZiAoIXZlcnNpb24ubWF0Y2goL15cXGR7MSwzMH1cXC5cXGR7MSwzMH1cXC5cXGR7MSwzMH0vKSkge1xuICAgIHZlcnNpb24gKz0gJy4wJztcbiAgfVxuICBpZiAoIXNlbXZlci52YWxpZCh2ZXJzaW9uKSkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBJbnZhbGlkIG1pZ3JhdGlvbiB2ZXJzaW9uOiAke0pTT04uc3RyaW5naWZ5KHZlcnNpb24pfWApO1xuICB9XG5cbiAgcmV0dXJuIHZlcnNpb247XG59XG5cbi8qKlxuICogUmV0dXJucyB3aGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gcGFja2FnZSBzcGVjaWZpZXIgKHRoZSB2YWx1ZSBzdHJpbmcgaW4gYVxuICogYHBhY2thZ2UuanNvbmAgZGVwZW5kZW5jeSkgaXMgaG9zdGVkIGluIHRoZSBOUE0gcmVnaXN0cnkuXG4gKiBAdGhyb3dzIFdoZW4gdGhlIHNwZWNpZmllciBjYW5ub3QgYmUgcGFyc2VkLlxuICovXG5mdW5jdGlvbiBpc1BrZ0Zyb21SZWdpc3RyeShuYW1lOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlc3VsdCA9IG5wYS5yZXNvbHZlKG5hbWUsIHNwZWNpZmllcik7XG5cbiAgcmV0dXJuICEhcmVzdWx0LnJlZ2lzdHJ5O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogVXBkYXRlU2NoZW1hKTogUnVsZSB7XG4gIGlmICghb3B0aW9ucy5wYWNrYWdlcykge1xuICAgIC8vIFdlIGNhbm5vdCBqdXN0IHJldHVybiB0aGlzIGJlY2F1c2Ugd2UgbmVlZCB0byBmZXRjaCB0aGUgcGFja2FnZXMgZnJvbSBOUE0gc3RpbGwgZm9yIHRoZVxuICAgIC8vIGhlbHAvZ3VpZGUgdG8gc2hvdy5cbiAgICBvcHRpb25zLnBhY2thZ2VzID0gW107XG4gIH0gZWxzZSB7XG4gICAgLy8gV2Ugc3BsaXQgZXZlcnkgcGFja2FnZXMgYnkgY29tbWFzIHRvIGFsbG93IHBlb3BsZSB0byBwYXNzIGluIG11bHRpcGxlIGFuZCBtYWtlIGl0IGFuIGFycmF5LlxuICAgIG9wdGlvbnMucGFja2FnZXMgPSBvcHRpb25zLnBhY2thZ2VzLnJlZHVjZSgoYWNjLCBjdXJyKSA9PiB7XG4gICAgICByZXR1cm4gYWNjLmNvbmNhdChjdXJyLnNwbGl0KCcsJykpO1xuICAgIH0sIFtdIGFzIHN0cmluZ1tdKTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLm1pZ3JhdGVPbmx5ICYmIG9wdGlvbnMuZnJvbSkge1xuICAgIGlmIChvcHRpb25zLnBhY2thZ2VzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJy0tZnJvbSByZXF1aXJlcyB0aGF0IG9ubHkgYSBzaW5nbGUgcGFja2FnZSBiZSBwYXNzZWQuJyk7XG4gICAgfVxuICB9XG5cbiAgb3B0aW9ucy5mcm9tID0gX2Zvcm1hdFZlcnNpb24ob3B0aW9ucy5mcm9tKTtcbiAgb3B0aW9ucy50byA9IF9mb3JtYXRWZXJzaW9uKG9wdGlvbnMudG8pO1xuICBjb25zdCB1c2luZ1lhcm4gPSBvcHRpb25zLnBhY2thZ2VNYW5hZ2VyID09PSAneWFybic7XG5cbiAgcmV0dXJuIGFzeW5jICh0cmVlOiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgbG9nZ2VyID0gY29udGV4dC5sb2dnZXI7XG4gICAgY29uc3QgbnBtRGVwcyA9IG5ldyBNYXAoXG4gICAgICBfZ2V0QWxsRGVwZW5kZW5jaWVzKHRyZWUpLmZpbHRlcigoW25hbWUsIHNwZWNpZmllcl0pID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gaXNQa2dGcm9tUmVnaXN0cnkobmFtZSwgc3BlY2lmaWVyKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oYFBhY2thZ2UgJHtuYW1lfSB3YXMgbm90IGZvdW5kIG9uIHRoZSByZWdpc3RyeS4gU2tpcHBpbmcuYCk7XG5cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICk7XG4gICAgY29uc3QgcGFja2FnZXMgPSBfYnVpbGRQYWNrYWdlTGlzdChvcHRpb25zLCBucG1EZXBzLCBsb2dnZXIpO1xuXG4gICAgLy8gR3JhYiBhbGwgcGFja2FnZS5qc29uIGZyb20gdGhlIG5wbSByZXBvc2l0b3J5LiBUaGlzIHJlcXVpcmVzIGEgbG90IG9mIEhUVFAgY2FsbHMgc28gd2VcbiAgICAvLyB0cnkgdG8gcGFyYWxsZWxpemUgYXMgbWFueSBhcyBwb3NzaWJsZS5cbiAgICBjb25zdCBhbGxQYWNrYWdlTWV0YWRhdGEgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgIEFycmF5LmZyb20obnBtRGVwcy5rZXlzKCkpLm1hcCgoZGVwTmFtZSkgPT5cbiAgICAgICAgZ2V0TnBtUGFja2FnZUpzb24oZGVwTmFtZSwgbG9nZ2VyLCB7XG4gICAgICAgICAgcmVnaXN0cnk6IG9wdGlvbnMucmVnaXN0cnksXG4gICAgICAgICAgdXNpbmdZYXJuLFxuICAgICAgICAgIHZlcmJvc2U6IG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG5cbiAgICAvLyBCdWlsZCBhIG1hcCBvZiBhbGwgZGVwZW5kZW5jaWVzIGFuZCB0aGVpciBwYWNrYWdlSnNvbi5cbiAgICBjb25zdCBucG1QYWNrYWdlSnNvbk1hcCA9IGFsbFBhY2thZ2VNZXRhZGF0YS5yZWR1Y2UoKGFjYywgbnBtUGFja2FnZUpzb24pID0+IHtcbiAgICAgIC8vIElmIHRoZSBwYWNrYWdlIHdhcyBub3QgZm91bmQgb24gdGhlIHJlZ2lzdHJ5LiBJdCBjb3VsZCBiZSBwcml2YXRlLCBzbyB3ZSB3aWxsIGp1c3RcbiAgICAgIC8vIGlnbm9yZS4gSWYgdGhlIHBhY2thZ2Ugd2FzIHBhcnQgb2YgdGhlIGxpc3QsIHdlIHdpbGwgZXJyb3Igb3V0LCBidXQgd2lsbCBzaW1wbHkgaWdub3JlXG4gICAgICAvLyBpZiBpdCdzIGVpdGhlciBub3QgcmVxdWVzdGVkIChzbyBqdXN0IHBhcnQgb2YgcGFja2FnZS5qc29uLiBzaWxlbnRseSkgb3IgaWYgaXQncyBhXG4gICAgICAvLyBgLS1hbGxgIHNpdHVhdGlvbi4gVGhlcmUgaXMgYW4gZWRnZSBjYXNlIGhlcmUgd2hlcmUgYSBwdWJsaWMgcGFja2FnZSBwZWVyIGRlcGVuZHMgb24gYVxuICAgICAgLy8gcHJpdmF0ZSBvbmUsIGJ1dCBpdCdzIHJhcmUgZW5vdWdoLlxuICAgICAgaWYgKCFucG1QYWNrYWdlSnNvbi5uYW1lKSB7XG4gICAgICAgIGlmIChucG1QYWNrYWdlSnNvbi5yZXF1ZXN0ZWROYW1lICYmIHBhY2thZ2VzLmhhcyhucG1QYWNrYWdlSnNvbi5yZXF1ZXN0ZWROYW1lKSkge1xuICAgICAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKFxuICAgICAgICAgICAgYFBhY2thZ2UgJHtKU09OLnN0cmluZ2lmeShucG1QYWNrYWdlSnNvbi5yZXF1ZXN0ZWROYW1lKX0gd2FzIG5vdCBmb3VuZCBvbiB0aGUgYCArXG4gICAgICAgICAgICAgICdyZWdpc3RyeS4gQ2Fubm90IGNvbnRpbnVlIGFzIHRoaXMgbWF5IGJlIGFuIGVycm9yLicsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgYSBuYW1lIGlzIHByZXNlbnQsIGl0IGlzIGFzc3VtZWQgdG8gYmUgZnVsbHkgcG9wdWxhdGVkXG4gICAgICAgIGFjYy5zZXQobnBtUGFja2FnZUpzb24ubmFtZSwgbnBtUGFja2FnZUpzb24gYXMgTnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCBuZXcgTWFwPHN0cmluZywgTnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uPigpKTtcblxuICAgIC8vIEF1Z21lbnQgdGhlIGNvbW1hbmQgbGluZSBwYWNrYWdlIGxpc3Qgd2l0aCBwYWNrYWdlR3JvdXBzIGFuZCBmb3J3YXJkIHBlZXIgZGVwZW5kZW5jaWVzLlxuICAgIC8vIEVhY2ggYWRkZWQgcGFja2FnZSBtYXkgdW5jb3ZlciBuZXcgcGFja2FnZSBncm91cHMgYW5kIHBlZXIgZGVwZW5kZW5jaWVzLCBzbyB3ZSBtdXN0XG4gICAgLy8gcmVwZWF0IHRoaXMgcHJvY2VzcyB1bnRpbCB0aGUgcGFja2FnZSBsaXN0IHN0YWJpbGl6ZXMuXG4gICAgbGV0IGxhc3RQYWNrYWdlc1NpemU7XG4gICAgZG8ge1xuICAgICAgbGFzdFBhY2thZ2VzU2l6ZSA9IHBhY2thZ2VzLnNpemU7XG4gICAgICBucG1QYWNrYWdlSnNvbk1hcC5mb3JFYWNoKChucG1QYWNrYWdlSnNvbikgPT4ge1xuICAgICAgICBfYWRkUGFja2FnZUdyb3VwKHRyZWUsIHBhY2thZ2VzLCBucG1EZXBzLCBucG1QYWNrYWdlSnNvbiwgbG9nZ2VyKTtcbiAgICAgICAgX2FkZFBlZXJEZXBlbmRlbmNpZXModHJlZSwgcGFja2FnZXMsIG5wbURlcHMsIG5wbVBhY2thZ2VKc29uLCBucG1QYWNrYWdlSnNvbk1hcCwgbG9nZ2VyKTtcbiAgICAgIH0pO1xuICAgIH0gd2hpbGUgKHBhY2thZ2VzLnNpemUgPiBsYXN0UGFja2FnZXNTaXplKTtcblxuICAgIC8vIEJ1aWxkIHRoZSBQYWNrYWdlSW5mbyBmb3IgZWFjaCBtb2R1bGUuXG4gICAgY29uc3QgcGFja2FnZUluZm9NYXAgPSBuZXcgTWFwPHN0cmluZywgUGFja2FnZUluZm8+KCk7XG4gICAgbnBtUGFja2FnZUpzb25NYXAuZm9yRWFjaCgobnBtUGFja2FnZUpzb24pID0+IHtcbiAgICAgIHBhY2thZ2VJbmZvTWFwLnNldChcbiAgICAgICAgbnBtUGFja2FnZUpzb24ubmFtZSxcbiAgICAgICAgX2J1aWxkUGFja2FnZUluZm8odHJlZSwgcGFja2FnZXMsIG5wbURlcHMsIG5wbVBhY2thZ2VKc29uLCBsb2dnZXIpLFxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIC8vIE5vdyB0aGF0IHdlIGhhdmUgYWxsIHRoZSBpbmZvcm1hdGlvbiwgY2hlY2sgdGhlIGZsYWdzLlxuICAgIGlmIChwYWNrYWdlcy5zaXplID4gMCkge1xuICAgICAgaWYgKG9wdGlvbnMubWlncmF0ZU9ubHkgJiYgb3B0aW9ucy5mcm9tICYmIG9wdGlvbnMucGFja2FnZXMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzdWJsb2cgPSBuZXcgbG9nZ2luZy5MZXZlbENhcExvZ2dlcigndmFsaWRhdGlvbicsIGxvZ2dlci5jcmVhdGVDaGlsZCgnJyksICd3YXJuJyk7XG4gICAgICBfdmFsaWRhdGVVcGRhdGVQYWNrYWdlcyhwYWNrYWdlSW5mb01hcCwgISFvcHRpb25zLmZvcmNlLCAhIW9wdGlvbnMubmV4dCwgc3VibG9nKTtcblxuICAgICAgX3BlcmZvcm1VcGRhdGUodHJlZSwgY29udGV4dCwgcGFja2FnZUluZm9NYXAsIGxvZ2dlciwgISFvcHRpb25zLm1pZ3JhdGVPbmx5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgX3VzYWdlTWVzc2FnZShvcHRpb25zLCBwYWNrYWdlSW5mb01hcCwgbG9nZ2VyKTtcbiAgICB9XG4gIH07XG59XG4iXX0=