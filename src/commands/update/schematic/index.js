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
const package_metadata_1 = require("../../../utilities/package-metadata");
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
            !Array.isArray(packageGroup) &&
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
        var _a, _b, _c;
        // Look for packageGroup.
        const packageGroup = (_a = target['ng-update']) === null || _a === void 0 ? void 0 : _a['packageGroup'];
        if (packageGroup) {
            const packageGroupNames = Array.isArray(packageGroup)
                ? packageGroup
                : Object.keys(packageGroup);
            const packageGroupName = ((_b = target['ng-update']) === null || _b === void 0 ? void 0 : _b['packageGroupName']) || packageGroupNames[0];
            if (packageGroupName) {
                if (packageGroups.has(name)) {
                    return null;
                }
                packageGroupNames.forEach((x) => packageGroups.set(x, packageGroupName));
                packageGroups.set(packageGroupName, packageGroupName);
                name = packageGroupName;
            }
        }
        let command = `ng update ${name}`;
        if (!tag) {
            command += `@${((_c = semver.parse(version)) === null || _c === void 0 ? void 0 : _c.major) || version}`;
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
    const packageGroup = ngUpdateMetadata['packageGroup'];
    if (!packageGroup) {
        return;
    }
    let packageGroupNormalized = {};
    if (Array.isArray(packageGroup) && !packageGroup.some((x) => typeof x != 'string')) {
        packageGroupNormalized = packageGroup.reduce((acc, curr) => {
            acc[curr] = maybePackage;
            return acc;
        }, {});
    }
    else if (typeof packageGroup == 'object' &&
        packageGroup &&
        !Array.isArray(packageGroup) &&
        Object.values(packageGroup).every((x) => typeof x == 'string')) {
        packageGroupNormalized = packageGroup;
    }
    else {
        logger.warn(`packageGroup metadata of package ${npmPackageJson.name} is malformed. Ignoring.`);
        return;
    }
    for (const [name, value] of Object.entries(packageGroupNormalized)) {
        // Don't override names from the command line.
        // Remove packages that aren't installed.
        if (!packages.has(name) && allDependencies.has(name)) {
            packages.set(name, value);
        }
    }
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
            // if it's either not requested (so just part of package.json. silently).
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZHMvdXBkYXRlL3NjaGVtYXRpYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFxRDtBQUNyRCwyREFBK0Y7QUFDL0YscURBQXVDO0FBRXZDLCtDQUFpQztBQUNqQywwRUFJNkM7QUFVN0Msa0dBQWtHO0FBQ2xHLCtGQUErRjtBQUMvRiw4RkFBOEY7QUFDOUYsd0ZBQXdGO0FBQ3hGLHFDQUFxQztBQUNyQyxTQUFnQiwyQkFBMkIsQ0FBQyxLQUFhO0lBQ3ZELElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEMsSUFBSSxDQUFDLFFBQVEsRUFBRTtRQUNiLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFDRCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDZCxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsTUFBTSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1FBQzVDLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxLQUFLLElBQUksRUFBRSxFQUFFO1lBQ2Ysc0RBQXNEO1lBQ3RELGlEQUFpRDtZQUNqRCxPQUFPLFFBQVEsQ0FBQztTQUNqQjtLQUNGO0lBRUQsNEZBQTRGO0lBQzVGLGdHQUFnRztJQUNoRywwRkFBMEY7SUFDMUYsUUFBUSxHQUFHLEtBQUssQ0FBQztJQUNqQixLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFO1FBQ3ZDLFFBQVEsSUFBSSxRQUFRLEtBQUssSUFBSSxLQUFLLGFBQWEsQ0FBQztLQUNqRDtJQUVELE9BQU8sTUFBTSxDQUFDLFVBQVUs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QUFJLEVBQ25CLGlCQUFpQixDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FDbkUsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgseURBQXlEO1FBQ3pELElBQUksUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUU7WUFDckIsSUFBSSxPQUFPLENBQUMsV0FBVyxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRTtnQkFDM0QsT0FBTzthQUNSO1lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxjQUFPLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3hGLHVCQUF1QixDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUVqRixjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDOUU7YUFBTTtZQUNMLGFBQWEsQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ2hEO0lBQ0gsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXhHRCw0QkF3R0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgbG9nZ2luZywgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IFJ1bGUsIFNjaGVtYXRpY0NvbnRleHQsIFNjaGVtYXRpY3NFeGNlcHRpb24sIFRyZWUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgKiBhcyBucGEgZnJvbSAnbnBtLXBhY2thZ2UtYXJnJztcbmltcG9ydCB0eXBlIHsgTWFuaWZlc3QgfSBmcm9tICdwYWNvdGUnO1xuaW1wb3J0ICogYXMgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQge1xuICBOZ1BhY2thZ2VNYW5pZmVzdFByb3BlcnRpZXMsXG4gIE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbixcbiAgZ2V0TnBtUGFja2FnZUpzb24sXG59IGZyb20gJy4uLy4uLy4uL3V0aWxpdGllcy9wYWNrYWdlLW1ldGFkYXRhJztcbmltcG9ydCB7IFNjaGVtYSBhcyBVcGRhdGVTY2hlbWEgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmludGVyZmFjZSBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcyBleHRlbmRzIE1hbmlmZXN0LCBOZ1BhY2thZ2VNYW5pZmVzdFByb3BlcnRpZXMge1xuICBwZWVyRGVwZW5kZW5jaWVzTWV0YT86IFJlY29yZDxzdHJpbmcsIHsgb3B0aW9uYWw/OiBib29sZWFuIH0+O1xufVxuXG50eXBlIFZlcnNpb25SYW5nZSA9IHN0cmluZyAmIHsgX19WRVJTSU9OX1JBTkdFOiB2b2lkIH07XG50eXBlIFBlZXJWZXJzaW9uVHJhbnNmb3JtID0gc3RyaW5nIHwgKChyYW5nZTogc3RyaW5nKSA9PiBzdHJpbmcpO1xuXG4vLyBBbmd1bGFyIGd1YXJhbnRlZXMgdGhhdCBhIG1ham9yIGlzIGNvbXBhdGlibGUgd2l0aCBpdHMgZm9sbG93aW5nIG1ham9yIChzbyBwYWNrYWdlcyB0aGF0IGRlcGVuZFxuLy8gb24gQW5ndWxhciA1IGFyZSBhbHNvIGNvbXBhdGlibGUgd2l0aCBBbmd1bGFyIDYpLiBUaGlzIGlzLCBpbiBjb2RlLCByZXByZXNlbnRlZCBieSB2ZXJpZnlpbmdcbi8vIHRoYXQgYWxsIG90aGVyIHBhY2thZ2VzIHRoYXQgaGF2ZSBhIHBlZXIgZGVwZW5kZW5jeSBvZiBgXCJAYW5ndWxhci9jb3JlXCI6IFwiXjUuMC4wXCJgIGFjdHVhbGx5XG4vLyBzdXBwb3J0cyA2LjAsIGJ5IGFkZGluZyB0aGF0IGNvbXBhdGliaWxpdHkgdG8gdGhlIHJhbmdlLCBzbyBpdCBpcyBgXjUuMC4wIHx8IF42LjAuMGAuXG4vLyBXZSBleHBvcnQgaXQgdG8gYWxsb3cgZm9yIHRlc3RpbmcuXG5leHBvcnQgZnVuY3Rpb24gYW5ndWxhck1ham9yQ29tcGF0R3VhcmFudGVlKHJhbmdlOiBzdHJpbmcpIHtcbiAgbGV0IG5ld1JhbmdlID0gc2VtdmVyLnZhbGlkUmFuZ2UocmFuZ2UpO1xuICBpZiAoIW5ld1JhbmdlKSB7XG4gICAgcmV0dXJuIHJhbmdlO1xuICB9XG4gIGxldCBtYWpvciA9IDE7XG4gIHdoaWxlICghc2VtdmVyLmd0cihtYWpvciArICcuMC4wJywgbmV3UmFuZ2UpKSB7XG4gICAgbWFqb3IrKztcbiAgICBpZiAobWFqb3IgPj0gOTkpIHtcbiAgICAgIC8vIFVzZSBvcmlnaW5hbCByYW5nZSBpZiBpdCBzdXBwb3J0cyBhIG1ham9yIHRoaXMgaGlnaFxuICAgICAgLy8gUmFuZ2UgaXMgbW9zdCBsaWtlbHkgdW5ib3VuZGVkIChlLmcuLCA+PTUuMC4wKVxuICAgICAgcmV0dXJuIG5ld1JhbmdlO1xuICAgIH1cbiAgfVxuXG4gIC8vIEFkZCB0aGUgbWFqb3IgdmVyc2lvbiBhcyBjb21wYXRpYmxlIHdpdGggdGhlIGFuZ3VsYXIgY29tcGF0aWJsZSwgd2l0aCBhbGwgbWlub3JzLiBUaGlzIGlzXG4gIC8vIGFscmVhZHkgb25lIG1ham9yIGFib3ZlIHRoZSBncmVhdGVzdCBzdXBwb3J0ZWQsIGJlY2F1c2Ugd2UgaW5jcmVtZW50IGBtYWpvcmAgYmVmb3JlIGNoZWNraW5nLlxuICAvLyBXZSBhZGQgbWlub3JzIGxpa2UgdGhpcyBiZWNhdXNlIGEgbWlub3IgYmV0YSBpcyBzdGlsbCBjb21wYXRpYmxlIHdpdGggYSBtaW5vciBub24tYmV0YS5cbiAgbmV3UmFuZ2UgPSByYW5nZTtcbiAgZm9yIChsZXQgbWlub3IgPSAwOyBtaW5vciA8IDIwOyBtaW5vcisrKSB7XG4gICAgbmV3UmFuZ2UgKz0gYCB8fCBeJHttYWpvcn0uJHttaW5vcn0uMC1hbHBoYS4wIGA7XG4gIH1cblxuICByZXR1cm4gc2VtdmVyLnZhbGlkUmFuZ2UobmV3UmFuZ2UpIHx8IHJhbmdlO1xufVxuXG4vLyBUaGlzIGlzIGEgbWFwIG9mIHBhY2thZ2VHcm91cE5hbWUgdG8gcmFuZ2UgZXh0ZW5kaW5nIGZ1bmN0aW9uLiBJZiBpdCBpc24ndCBmb3VuZCwgdGhlIHJhbmdlIGlzXG4vLyBrZXB0IHRoZSBzYW1lLlxuY29uc3Qga25vd25QZWVyQ29tcGF0aWJsZUxpc3Q6IHsgW25hbWU6IHN0cmluZ106IFBlZXJWZXJzaW9uVHJhbnNmb3JtIH0gPSB7XG4gICdAYW5ndWxhci9jb3JlJzogYW5ndWxhck1ham9yQ29tcGF0R3VhcmFudGVlLFxufTtcblxuaW50ZXJmYWNlIFBhY2thZ2VWZXJzaW9uSW5mbyB7XG4gIHZlcnNpb246IFZlcnNpb25SYW5nZTtcbiAgcGFja2FnZUpzb246IEpzb25TY2hlbWFGb3JOcG1QYWNrYWdlSnNvbkZpbGVzO1xuICB1cGRhdGVNZXRhZGF0YTogVXBkYXRlTWV0YWRhdGE7XG59XG5cbmludGVyZmFjZSBQYWNrYWdlSW5mbyB7XG4gIG5hbWU6IHN0cmluZztcbiAgbnBtUGFja2FnZUpzb246IE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbjtcbiAgaW5zdGFsbGVkOiBQYWNrYWdlVmVyc2lvbkluZm87XG4gIHRhcmdldD86IFBhY2thZ2VWZXJzaW9uSW5mbztcbiAgcGFja2FnZUpzb25SYW5nZTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgVXBkYXRlTWV0YWRhdGEge1xuICBwYWNrYWdlR3JvdXBOYW1lPzogc3RyaW5nO1xuICBwYWNrYWdlR3JvdXA6IHsgW3BhY2thZ2VOYW1lOiBzdHJpbmddOiBzdHJpbmcgfTtcbiAgcmVxdWlyZW1lbnRzOiB7IFtwYWNrYWdlTmFtZTogc3RyaW5nXTogc3RyaW5nIH07XG4gIG1pZ3JhdGlvbnM/OiBzdHJpbmc7XG59XG5cbmZ1bmN0aW9uIF91cGRhdGVQZWVyVmVyc2lvbihpbmZvTWFwOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz4sIG5hbWU6IHN0cmluZywgcmFuZ2U6IHN0cmluZykge1xuICAvLyBSZXNvbHZlIHBhY2thZ2VHcm91cE5hbWUuXG4gIGNvbnN0IG1heWJlUGFja2FnZUluZm8gPSBpbmZvTWFwLmdldChuYW1lKTtcbiAgaWYgKCFtYXliZVBhY2thZ2VJbmZvKSB7XG4gICAgcmV0dXJuIHJhbmdlO1xuICB9XG4gIGlmIChtYXliZVBhY2thZ2VJbmZvLnRhcmdldCkge1xuICAgIG5hbWUgPSBtYXliZVBhY2thZ2VJbmZvLnRhcmdldC51cGRhdGVNZXRhZGF0YS5wYWNrYWdlR3JvdXBOYW1lIHx8IG5hbWU7XG4gIH0gZWxzZSB7XG4gICAgbmFtZSA9IG1heWJlUGFja2FnZUluZm8uaW5zdGFsbGVkLnVwZGF0ZU1ldGFkYXRhLnBhY2thZ2VHcm91cE5hbWUgfHwgbmFtZTtcbiAgfVxuXG4gIGNvbnN0IG1heWJlVHJhbnNmb3JtID0ga25vd25QZWVyQ29tcGF0aWJsZUxpc3RbbmFtZV07XG4gIGlmIChtYXliZVRyYW5zZm9ybSkge1xuICAgIGlmICh0eXBlb2YgbWF5YmVUcmFuc2Zvcm0gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIG1heWJlVHJhbnNmb3JtKHJhbmdlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG1heWJlVHJhbnNmb3JtO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByYW5nZTtcbn1cblxuZnVuY3Rpb24gX3ZhbGlkYXRlRm9yd2FyZFBlZXJEZXBlbmRlbmNpZXMoXG4gIG5hbWU6IHN0cmluZyxcbiAgaW5mb01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm8+LFxuICBwZWVyczogeyBbbmFtZTogc3RyaW5nXTogc3RyaW5nIH0sXG4gIHBlZXJzTWV0YTogeyBbbmFtZTogc3RyaW5nXTogeyBvcHRpb25hbD86IGJvb2xlYW4gfSB9LFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuICBuZXh0OiBib29sZWFuLFxuKTogYm9vbGVhbiB7XG4gIGxldCB2YWxpZGF0aW9uRmFpbGVkID0gZmFsc2U7XG4gIGZvciAoY29uc3QgW3BlZXIsIHJhbmdlXSBvZiBPYmplY3QuZW50cmllcyhwZWVycykpIHtcbiAgICBsb2dnZXIuZGVidWcoYENoZWNraW5nIGZvcndhcmQgcGVlciAke3BlZXJ9Li4uYCk7XG4gICAgY29uc3QgbWF5YmVQZWVySW5mbyA9IGluZm9NYXAuZ2V0KHBlZXIpO1xuICAgIGNvbnN0IGlzT3B0aW9uYWwgPSBwZWVyc01ldGFbcGVlcl0gJiYgISFwZWVyc01ldGFbcGVlcl0ub3B0aW9uYWw7XG4gICAgaWYgKCFtYXliZVBlZXJJbmZvKSB7XG4gICAgICBpZiAoIWlzT3B0aW9uYWwpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgW1xuICAgICAgICAgICAgYFBhY2thZ2UgJHtKU09OLnN0cmluZ2lmeShuYW1lKX0gaGFzIGEgbWlzc2luZyBwZWVyIGRlcGVuZGVuY3kgb2ZgLFxuICAgICAgICAgICAgYCR7SlNPTi5zdHJpbmdpZnkocGVlcil9IEAgJHtKU09OLnN0cmluZ2lmeShyYW5nZSl9LmAsXG4gICAgICAgICAgXS5qb2luKCcgJyksXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHBlZXJWZXJzaW9uID1cbiAgICAgIG1heWJlUGVlckluZm8udGFyZ2V0ICYmIG1heWJlUGVlckluZm8udGFyZ2V0LnBhY2thZ2VKc29uLnZlcnNpb25cbiAgICAgICAgPyBtYXliZVBlZXJJbmZvLnRhcmdldC5wYWNrYWdlSnNvbi52ZXJzaW9uXG4gICAgICAgIDogbWF5YmVQZWVySW5mby5pbnN0YWxsZWQudmVyc2lvbjtcblxuICAgIGxvZ2dlci5kZWJ1ZyhgICBSYW5nZSBpbnRlcnNlY3RzKCR7cmFuZ2V9LCAke3BlZXJWZXJzaW9ufSkuLi5gKTtcbiAgICBpZiAoIXNlbXZlci5zYXRpc2ZpZXMocGVlclZlcnNpb24sIHJhbmdlLCB7IGluY2x1ZGVQcmVyZWxlYXNlOiBuZXh0IHx8IHVuZGVmaW5lZCB9KSkge1xuICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICBbXG4gICAgICAgICAgYFBhY2thZ2UgJHtKU09OLnN0cmluZ2lmeShuYW1lKX0gaGFzIGFuIGluY29tcGF0aWJsZSBwZWVyIGRlcGVuZGVuY3kgdG9gLFxuICAgICAgICAgIGAke0pTT04uc3RyaW5naWZ5KHBlZXIpfSAocmVxdWlyZXMgJHtKU09OLnN0cmluZ2lmeShyYW5nZSl9LGAsXG4gICAgICAgICAgYHdvdWxkIGluc3RhbGwgJHtKU09OLnN0cmluZ2lmeShwZWVyVmVyc2lvbil9KWAsXG4gICAgICAgIF0uam9pbignICcpLFxuICAgICAgKTtcblxuICAgICAgdmFsaWRhdGlvbkZhaWxlZCA9IHRydWU7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsaWRhdGlvbkZhaWxlZDtcbn1cblxuZnVuY3Rpb24gX3ZhbGlkYXRlUmV2ZXJzZVBlZXJEZXBlbmRlbmNpZXMoXG4gIG5hbWU6IHN0cmluZyxcbiAgdmVyc2lvbjogc3RyaW5nLFxuICBpbmZvTWFwOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz4sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4gIG5leHQ6IGJvb2xlYW4sXG4pIHtcbiAgZm9yIChjb25zdCBbaW5zdGFsbGVkLCBpbnN0YWxsZWRJbmZvXSBvZiBpbmZvTWFwLmVudHJpZXMoKSkge1xuICAgIGNvbnN0IGluc3RhbGxlZExvZ2dlciA9IGxvZ2dlci5jcmVhdGVDaGlsZChpbnN0YWxsZWQpO1xuICAgIGluc3RhbGxlZExvZ2dlci5kZWJ1ZyhgJHtpbnN0YWxsZWR9Li4uYCk7XG4gICAgY29uc3QgcGVlcnMgPSAoaW5zdGFsbGVkSW5mby50YXJnZXQgfHwgaW5zdGFsbGVkSW5mby5pbnN0YWxsZWQpLnBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXM7XG5cbiAgICBmb3IgKGNvbnN0IFtwZWVyLCByYW5nZV0gb2YgT2JqZWN0LmVudHJpZXMocGVlcnMgfHwge30pKSB7XG4gICAgICBpZiAocGVlciAhPSBuYW1lKSB7XG4gICAgICAgIC8vIE9ubHkgY2hlY2sgcGVlcnMgdG8gdGhlIHBhY2thZ2VzIHdlJ3JlIHVwZGF0aW5nLiBXZSBkb24ndCBjYXJlIGFib3V0IHBlZXJzXG4gICAgICAgIC8vIHRoYXQgYXJlIHVubWV0IGJ1dCB3ZSBoYXZlIG5vIGVmZmVjdCBvbi5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIElnbm9yZSBwZWVyRGVwZW5kZW5jeSBtaXNtYXRjaGVzIGZvciB0aGVzZSBwYWNrYWdlcy5cbiAgICAgIC8vIFRoZXkgYXJlIGRlcHJlY2F0ZWQgYW5kIHJlbW92ZWQgdmlhIGEgbWlncmF0aW9uLlxuICAgICAgY29uc3QgaWdub3JlZFBhY2thZ2VzID0gW1xuICAgICAgICAnY29kZWx5emVyJyxcbiAgICAgICAgJ0BzY2hlbWF0aWNzL3VwZGF0ZScsXG4gICAgICAgICdAYW5ndWxhci1kZXZraXQvYnVpbGQtbmctcGFja2FncicsXG4gICAgICAgICd0c2lja2xlJyxcbiAgICAgIF07XG4gICAgICBpZiAoaWdub3JlZFBhY2thZ2VzLmluY2x1ZGVzKGluc3RhbGxlZCkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIE92ZXJyaWRlIHRoZSBwZWVyIHZlcnNpb24gcmFuZ2UgaWYgaXQncyBrbm93biBhcyBhIGNvbXBhdGlibGUuXG4gICAgICBjb25zdCBleHRlbmRlZFJhbmdlID0gX3VwZGF0ZVBlZXJWZXJzaW9uKGluZm9NYXAsIHBlZXIsIHJhbmdlKTtcblxuICAgICAgaWYgKCFzZW12ZXIuc2F0aXNmaWVzKHZlcnNpb24sIGV4dGVuZGVkUmFuZ2UsIHsgaW5jbHVkZVByZXJlbGVhc2U6IG5leHQgfHwgdW5kZWZpbmVkIH0pKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICBbXG4gICAgICAgICAgICBgUGFja2FnZSAke0pTT04uc3RyaW5naWZ5KGluc3RhbGxlZCl9IGhhcyBhbiBpbmNvbXBhdGlibGUgcGVlciBkZXBlbmRlbmN5IHRvYCxcbiAgICAgICAgICAgIGAke0pTT04uc3RyaW5naWZ5KG5hbWUpfSAocmVxdWlyZXNgLFxuICAgICAgICAgICAgYCR7SlNPTi5zdHJpbmdpZnkocmFuZ2UpfSR7ZXh0ZW5kZWRSYW5nZSA9PSByYW5nZSA/ICcnIDogJyAoZXh0ZW5kZWQpJ30sYCxcbiAgICAgICAgICAgIGB3b3VsZCBpbnN0YWxsICR7SlNPTi5zdHJpbmdpZnkodmVyc2lvbil9KS5gLFxuICAgICAgICAgIF0uam9pbignICcpLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gX3ZhbGlkYXRlVXBkYXRlUGFja2FnZXMoXG4gIGluZm9NYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPixcbiAgZm9yY2U6IGJvb2xlYW4sXG4gIG5leHQ6IGJvb2xlYW4sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pOiB2b2lkIHtcbiAgbG9nZ2VyLmRlYnVnKCdVcGRhdGluZyB0aGUgZm9sbG93aW5nIHBhY2thZ2VzOicpO1xuICBpbmZvTWFwLmZvckVhY2goKGluZm8pID0+IHtcbiAgICBpZiAoaW5mby50YXJnZXQpIHtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhgICAke2luZm8ubmFtZX0gPT4gJHtpbmZvLnRhcmdldC52ZXJzaW9ufWApO1xuICAgIH1cbiAgfSk7XG5cbiAgbGV0IHBlZXJFcnJvcnMgPSBmYWxzZTtcbiAgaW5mb01hcC5mb3JFYWNoKChpbmZvKSA9PiB7XG4gICAgY29uc3QgeyBuYW1lLCB0YXJnZXQgfSA9IGluZm87XG4gICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBwa2dMb2dnZXIgPSBsb2dnZXIuY3JlYXRlQ2hpbGQobmFtZSk7XG4gICAgbG9nZ2VyLmRlYnVnKGAke25hbWV9Li4uYCk7XG5cbiAgICBjb25zdCB7IHBlZXJEZXBlbmRlbmNpZXMgPSB7fSwgcGVlckRlcGVuZGVuY2llc01ldGEgPSB7fSB9ID0gdGFyZ2V0LnBhY2thZ2VKc29uO1xuICAgIHBlZXJFcnJvcnMgPVxuICAgICAgX3ZhbGlkYXRlRm9yd2FyZFBlZXJEZXBlbmRlbmNpZXMoXG4gICAgICAgIG5hbWUsXG4gICAgICAgIGluZm9NYXAsXG4gICAgICAgIHBlZXJEZXBlbmRlbmNpZXMsXG4gICAgICAgIHBlZXJEZXBlbmRlbmNpZXNNZXRhLFxuICAgICAgICBwa2dMb2dnZXIsXG4gICAgICAgIG5leHQsXG4gICAgICApIHx8IHBlZXJFcnJvcnM7XG4gICAgcGVlckVycm9ycyA9XG4gICAgICBfdmFsaWRhdGVSZXZlcnNlUGVlckRlcGVuZGVuY2llcyhuYW1lLCB0YXJnZXQudmVyc2lvbiwgaW5mb01hcCwgcGtnTG9nZ2VyLCBuZXh0KSB8fFxuICAgICAgcGVlckVycm9ycztcbiAgfSk7XG5cbiAgaWYgKCFmb3JjZSAmJiBwZWVyRXJyb3JzKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24odGFncy5zdHJpcEluZGVudHNgSW5jb21wYXRpYmxlIHBlZXIgZGVwZW5kZW5jaWVzIGZvdW5kLlxuICAgICAgUGVlciBkZXBlbmRlbmN5IHdhcm5pbmdzIHdoZW4gaW5zdGFsbGluZyBkZXBlbmRlbmNpZXMgbWVhbnMgdGhhdCB0aG9zZSBkZXBlbmRlbmNpZXMgbWlnaHQgbm90IHdvcmsgY29ycmVjdGx5IHRvZ2V0aGVyLlxuICAgICAgWW91IGNhbiB1c2UgdGhlICctLWZvcmNlJyBvcHRpb24gdG8gaWdub3JlIGluY29tcGF0aWJsZSBwZWVyIGRlcGVuZGVuY2llcyBhbmQgaW5zdGVhZCBhZGRyZXNzIHRoZXNlIHdhcm5pbmdzIGxhdGVyLmApO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9wZXJmb3JtVXBkYXRlKFxuICB0cmVlOiBUcmVlLFxuICBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0LFxuICBpbmZvTWFwOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz4sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4gIG1pZ3JhdGVPbmx5OiBib29sZWFuLFxuKTogdm9pZCB7XG4gIGNvbnN0IHBhY2thZ2VKc29uQ29udGVudCA9IHRyZWUucmVhZCgnL3BhY2thZ2UuanNvbicpO1xuICBpZiAoIXBhY2thZ2VKc29uQ29udGVudCkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgZmluZCBhIHBhY2thZ2UuanNvbi4gQXJlIHlvdSBpbiBhIE5vZGUgcHJvamVjdD8nKTtcbiAgfVxuXG4gIGxldCBwYWNrYWdlSnNvbjogSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXM7XG4gIHRyeSB7XG4gICAgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHBhY2thZ2VKc29uQ29udGVudC50b1N0cmluZygpKSBhcyBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcztcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdwYWNrYWdlLmpzb24gY291bGQgbm90IGJlIHBhcnNlZDogJyArIGUubWVzc2FnZSk7XG4gIH1cblxuICBjb25zdCB1cGRhdGVEZXBlbmRlbmN5ID0gKGRlcHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIG5hbWU6IHN0cmluZywgbmV3VmVyc2lvbjogc3RyaW5nKSA9PiB7XG4gICAgY29uc3Qgb2xkVmVyc2lvbiA9IGRlcHNbbmFtZV07XG4gICAgLy8gV2Ugb25seSByZXNwZWN0IGNhcmV0IGFuZCB0aWxkZSByYW5nZXMgb24gdXBkYXRlLlxuICAgIGNvbnN0IGV4ZWNSZXN1bHQgPSAvXltcXF5+XS8uZXhlYyhvbGRWZXJzaW9uKTtcbiAgICBkZXBzW25hbWVdID0gYCR7ZXhlY1Jlc3VsdCA/IGV4ZWNSZXN1bHRbMF0gOiAnJ30ke25ld1ZlcnNpb259YDtcbiAgfTtcblxuICBjb25zdCB0b0luc3RhbGwgPSBbLi4uaW5mb01hcC52YWx1ZXMoKV1cbiAgICAubWFwKCh4KSA9PiBbeC5uYW1lLCB4LnRhcmdldCwgeC5pbnN0YWxsZWRdKVxuICAgIC5maWx0ZXIoKFtuYW1lLCB0YXJnZXQsIGluc3RhbGxlZF0pID0+IHtcbiAgICAgIHJldHVybiAhIW5hbWUgJiYgISF0YXJnZXQgJiYgISFpbnN0YWxsZWQ7XG4gICAgfSkgYXMgW3N0cmluZywgUGFja2FnZVZlcnNpb25JbmZvLCBQYWNrYWdlVmVyc2lvbkluZm9dW107XG5cbiAgdG9JbnN0YWxsLmZvckVhY2goKFtuYW1lLCB0YXJnZXQsIGluc3RhbGxlZF0pID0+IHtcbiAgICBsb2dnZXIuaW5mbyhcbiAgICAgIGBVcGRhdGluZyBwYWNrYWdlLmpzb24gd2l0aCBkZXBlbmRlbmN5ICR7bmFtZX0gYCArXG4gICAgICAgIGBAICR7SlNPTi5zdHJpbmdpZnkodGFyZ2V0LnZlcnNpb24pfSAod2FzICR7SlNPTi5zdHJpbmdpZnkoaW5zdGFsbGVkLnZlcnNpb24pfSkuLi5gLFxuICAgICk7XG5cbiAgICBpZiAocGFja2FnZUpzb24uZGVwZW5kZW5jaWVzICYmIHBhY2thZ2VKc29uLmRlcGVuZGVuY2llc1tuYW1lXSkge1xuICAgICAgdXBkYXRlRGVwZW5kZW5jeShwYWNrYWdlSnNvbi5kZXBlbmRlbmNpZXMsIG5hbWUsIHRhcmdldC52ZXJzaW9uKTtcblxuICAgICAgaWYgKHBhY2thZ2VKc29uLmRldkRlcGVuZGVuY2llcyAmJiBwYWNrYWdlSnNvbi5kZXZEZXBlbmRlbmNpZXNbbmFtZV0pIHtcbiAgICAgICAgZGVsZXRlIHBhY2thZ2VKc29uLmRldkRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgIH1cbiAgICAgIGlmIChwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzICYmIHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV0pIHtcbiAgICAgICAgZGVsZXRlIHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwYWNrYWdlSnNvbi5kZXZEZXBlbmRlbmNpZXMgJiYgcGFja2FnZUpzb24uZGV2RGVwZW5kZW5jaWVzW25hbWVdKSB7XG4gICAgICB1cGRhdGVEZXBlbmRlbmN5KHBhY2thZ2VKc29uLmRldkRlcGVuZGVuY2llcywgbmFtZSwgdGFyZ2V0LnZlcnNpb24pO1xuXG4gICAgICBpZiAocGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llcyAmJiBwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzW25hbWVdKSB7XG4gICAgICAgIGRlbGV0ZSBwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzW25hbWVdO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llcyAmJiBwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzW25hbWVdKSB7XG4gICAgICB1cGRhdGVEZXBlbmRlbmN5KHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXMsIG5hbWUsIHRhcmdldC52ZXJzaW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLndhcm4oYFBhY2thZ2UgJHtuYW1lfSB3YXMgbm90IGZvdW5kIGluIGRlcGVuZGVuY2llcy5gKTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IG5ld0NvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShwYWNrYWdlSnNvbiwgbnVsbCwgMik7XG4gIGlmIChwYWNrYWdlSnNvbkNvbnRlbnQudG9TdHJpbmcoKSAhPSBuZXdDb250ZW50IHx8IG1pZ3JhdGVPbmx5KSB7XG4gICAgaWYgKCFtaWdyYXRlT25seSkge1xuICAgICAgdHJlZS5vdmVyd3JpdGUoJy9wYWNrYWdlLmpzb24nLCBKU09OLnN0cmluZ2lmeShwYWNrYWdlSnNvbiwgbnVsbCwgMikpO1xuICAgIH1cblxuICAgIGNvbnN0IGV4dGVybmFsTWlncmF0aW9uczoge31bXSA9IFtdO1xuXG4gICAgLy8gUnVuIHRoZSBtaWdyYXRlIHNjaGVtYXRpY3Mgd2l0aCB0aGUgbGlzdCBvZiBwYWNrYWdlcyB0byB1c2UuIFRoZSBjb2xsZWN0aW9uIGNvbnRhaW5zXG4gICAgLy8gdmVyc2lvbiBpbmZvcm1hdGlvbiBhbmQgd2UgbmVlZCB0byBkbyB0aGlzIHBvc3QgaW5zdGFsbGF0aW9uLiBQbGVhc2Ugbm90ZSB0aGF0IHRoZVxuICAgIC8vIG1pZ3JhdGlvbiBDT1VMRCBmYWlsIGFuZCBsZWF2ZSBzaWRlIGVmZmVjdHMgb24gZGlzay5cbiAgICAvLyBSdW4gdGhlIHNjaGVtYXRpY3MgdGFzayBvZiB0aG9zZSBwYWNrYWdlcy5cbiAgICB0b0luc3RhbGwuZm9yRWFjaCgoW25hbWUsIHRhcmdldCwgaW5zdGFsbGVkXSkgPT4ge1xuICAgICAgaWYgKCF0YXJnZXQudXBkYXRlTWV0YWRhdGEubWlncmF0aW9ucykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGV4dGVybmFsTWlncmF0aW9ucy5wdXNoKHtcbiAgICAgICAgcGFja2FnZTogbmFtZSxcbiAgICAgICAgY29sbGVjdGlvbjogdGFyZ2V0LnVwZGF0ZU1ldGFkYXRhLm1pZ3JhdGlvbnMsXG4gICAgICAgIGZyb206IGluc3RhbGxlZC52ZXJzaW9uLFxuICAgICAgICB0bzogdGFyZ2V0LnZlcnNpb24sXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuO1xuICAgIH0pO1xuXG4gICAgaWYgKGV4dGVybmFsTWlncmF0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgKGdsb2JhbCBhcyBhbnkpLmV4dGVybmFsTWlncmF0aW9ucyA9IGV4dGVybmFsTWlncmF0aW9ucztcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gX2dldFVwZGF0ZU1ldGFkYXRhKFxuICBwYWNrYWdlSnNvbjogSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXMsXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pOiBVcGRhdGVNZXRhZGF0YSB7XG4gIGNvbnN0IG1ldGFkYXRhID0gcGFja2FnZUpzb25bJ25nLXVwZGF0ZSddO1xuXG4gIGNvbnN0IHJlc3VsdDogVXBkYXRlTWV0YWRhdGEgPSB7XG4gICAgcGFja2FnZUdyb3VwOiB7fSxcbiAgICByZXF1aXJlbWVudHM6IHt9LFxuICB9O1xuXG4gIGlmICghbWV0YWRhdGEgfHwgdHlwZW9mIG1ldGFkYXRhICE9ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkobWV0YWRhdGEpKSB7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGlmIChtZXRhZGF0YVsncGFja2FnZUdyb3VwJ10pIHtcbiAgICBjb25zdCBwYWNrYWdlR3JvdXAgPSBtZXRhZGF0YVsncGFja2FnZUdyb3VwJ107XG4gICAgLy8gVmVyaWZ5IHRoYXQgcGFja2FnZUdyb3VwIGlzIGFuIGFycmF5IG9mIHN0cmluZ3Mgb3IgYW4gbWFwIG9mIHZlcnNpb25zLiBUaGlzIGlzIG5vdCBhbiBlcnJvclxuICAgIC8vIGJ1dCB3ZSBzdGlsbCB3YXJuIHRoZSB1c2VyIGFuZCBpZ25vcmUgdGhlIHBhY2thZ2VHcm91cCBrZXlzLlxuICAgIGlmIChBcnJheS5pc0FycmF5KHBhY2thZ2VHcm91cCkgJiYgcGFja2FnZUdyb3VwLmV2ZXJ5KCh4KSA9PiB0eXBlb2YgeCA9PSAnc3RyaW5nJykpIHtcbiAgICAgIHJlc3VsdC5wYWNrYWdlR3JvdXAgPSBwYWNrYWdlR3JvdXAucmVkdWNlKChncm91cCwgbmFtZSkgPT4ge1xuICAgICAgICBncm91cFtuYW1lXSA9IHBhY2thZ2VKc29uLnZlcnNpb247XG5cbiAgICAgICAgcmV0dXJuIGdyb3VwO1xuICAgICAgfSwgcmVzdWx0LnBhY2thZ2VHcm91cCk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIHR5cGVvZiBwYWNrYWdlR3JvdXAgPT0gJ29iamVjdCcgJiZcbiAgICAgIHBhY2thZ2VHcm91cCAmJlxuICAgICAgIUFycmF5LmlzQXJyYXkocGFja2FnZUdyb3VwKSAmJlxuICAgICAgT2JqZWN0LnZhbHVlcyhwYWNrYWdlR3JvdXApLmV2ZXJ5KCh4KSA9PiB0eXBlb2YgeCA9PSAnc3RyaW5nJylcbiAgICApIHtcbiAgICAgIHJlc3VsdC5wYWNrYWdlR3JvdXAgPSBwYWNrYWdlR3JvdXA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZ2dlci53YXJuKGBwYWNrYWdlR3JvdXAgbWV0YWRhdGEgb2YgcGFja2FnZSAke3BhY2thZ2VKc29uLm5hbWV9IGlzIG1hbGZvcm1lZC4gSWdub3JpbmcuYCk7XG4gICAgfVxuXG4gICAgcmVzdWx0LnBhY2thZ2VHcm91cE5hbWUgPSBPYmplY3Qua2V5cyhyZXN1bHQucGFja2FnZUdyb3VwKVswXTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgbWV0YWRhdGFbJ3BhY2thZ2VHcm91cE5hbWUnXSA9PSAnc3RyaW5nJykge1xuICAgIHJlc3VsdC5wYWNrYWdlR3JvdXBOYW1lID0gbWV0YWRhdGFbJ3BhY2thZ2VHcm91cE5hbWUnXTtcbiAgfVxuXG4gIGlmIChtZXRhZGF0YVsncmVxdWlyZW1lbnRzJ10pIHtcbiAgICBjb25zdCByZXF1aXJlbWVudHMgPSBtZXRhZGF0YVsncmVxdWlyZW1lbnRzJ107XG4gICAgLy8gVmVyaWZ5IHRoYXQgcmVxdWlyZW1lbnRzIGFyZVxuICAgIGlmIChcbiAgICAgIHR5cGVvZiByZXF1aXJlbWVudHMgIT0gJ29iamVjdCcgfHxcbiAgICAgIEFycmF5LmlzQXJyYXkocmVxdWlyZW1lbnRzKSB8fFxuICAgICAgT2JqZWN0LmtleXMocmVxdWlyZW1lbnRzKS5zb21lKChuYW1lKSA9PiB0eXBlb2YgcmVxdWlyZW1lbnRzW25hbWVdICE9ICdzdHJpbmcnKVxuICAgICkge1xuICAgICAgbG9nZ2VyLndhcm4oYHJlcXVpcmVtZW50cyBtZXRhZGF0YSBvZiBwYWNrYWdlICR7cGFja2FnZUpzb24ubmFtZX0gaXMgbWFsZm9ybWVkLiBJZ25vcmluZy5gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnJlcXVpcmVtZW50cyA9IHJlcXVpcmVtZW50cztcbiAgICB9XG4gIH1cblxuICBpZiAobWV0YWRhdGFbJ21pZ3JhdGlvbnMnXSkge1xuICAgIGNvbnN0IG1pZ3JhdGlvbnMgPSBtZXRhZGF0YVsnbWlncmF0aW9ucyddO1xuICAgIGlmICh0eXBlb2YgbWlncmF0aW9ucyAhPSAnc3RyaW5nJykge1xuICAgICAgbG9nZ2VyLndhcm4oYG1pZ3JhdGlvbnMgbWV0YWRhdGEgb2YgcGFja2FnZSAke3BhY2thZ2VKc29uLm5hbWV9IGlzIG1hbGZvcm1lZC4gSWdub3JpbmcuYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5taWdyYXRpb25zID0gbWlncmF0aW9ucztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBfdXNhZ2VNZXNzYWdlKFxuICBvcHRpb25zOiBVcGRhdGVTY2hlbWEsXG4gIGluZm9NYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbikge1xuICBjb25zdCBwYWNrYWdlR3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgcGFja2FnZXNUb1VwZGF0ZSA9IFsuLi5pbmZvTWFwLmVudHJpZXMoKV1cbiAgICAubWFwKChbbmFtZSwgaW5mb10pID0+IHtcbiAgICAgIGxldCB0YWcgPSBvcHRpb25zLm5leHRcbiAgICAgICAgPyBpbmZvLm5wbVBhY2thZ2VKc29uWydkaXN0LXRhZ3MnXVsnbmV4dCddXG4gICAgICAgICAgPyAnbmV4dCdcbiAgICAgICAgICA6ICdsYXRlc3QnXG4gICAgICAgIDogJ2xhdGVzdCc7XG4gICAgICBsZXQgdmVyc2lvbiA9IGluZm8ubnBtUGFja2FnZUpzb25bJ2Rpc3QtdGFncyddW3RhZ107XG4gICAgICBsZXQgdGFyZ2V0ID0gaW5mby5ucG1QYWNrYWdlSnNvbi52ZXJzaW9uc1t2ZXJzaW9uXTtcblxuICAgICAgY29uc3QgdmVyc2lvbkRpZmYgPSBzZW12ZXIuZGlmZihpbmZvLmluc3RhbGxlZC52ZXJzaW9uLCB2ZXJzaW9uKTtcbiAgICAgIGlmIChcbiAgICAgICAgdmVyc2lvbkRpZmYgIT09ICdwYXRjaCcgJiZcbiAgICAgICAgdmVyc2lvbkRpZmYgIT09ICdtaW5vcicgJiZcbiAgICAgICAgL15AKD86YW5ndWxhcnxuZ3VuaXZlcnNhbClcXC8vLnRlc3QobmFtZSlcbiAgICAgICkge1xuICAgICAgICBjb25zdCBpbnN0YWxsZWRNYWpvclZlcnNpb24gPSBzZW12ZXIucGFyc2UoaW5mby5pbnN0YWxsZWQudmVyc2lvbik/Lm1ham9yO1xuICAgICAgICBjb25zdCB0b0luc3RhbGxNYWpvclZlcnNpb24gPSBzZW12ZXIucGFyc2UodmVyc2lvbik/Lm1ham9yO1xuICAgICAgICBpZiAoXG4gICAgICAgICAgaW5zdGFsbGVkTWFqb3JWZXJzaW9uICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICB0b0luc3RhbGxNYWpvclZlcnNpb24gIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgIGluc3RhbGxlZE1ham9yVmVyc2lvbiA8IHRvSW5zdGFsbE1ham9yVmVyc2lvbiAtIDFcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29uc3QgbmV4dE1ham9yVmVyc2lvbiA9IGAke2luc3RhbGxlZE1ham9yVmVyc2lvbiArIDF9LmA7XG4gICAgICAgICAgY29uc3QgbmV4dE1ham9yVmVyc2lvbnMgPSBPYmplY3Qua2V5cyhpbmZvLm5wbVBhY2thZ2VKc29uLnZlcnNpb25zKVxuICAgICAgICAgICAgLmZpbHRlcigodikgPT4gdi5zdGFydHNXaXRoKG5leHRNYWpvclZlcnNpb24pKVxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IChhID4gYiA/IC0xIDogMSkpO1xuXG4gICAgICAgICAgaWYgKG5leHRNYWpvclZlcnNpb25zLmxlbmd0aCkge1xuICAgICAgICAgICAgdmVyc2lvbiA9IG5leHRNYWpvclZlcnNpb25zWzBdO1xuICAgICAgICAgICAgdGFyZ2V0ID0gaW5mby5ucG1QYWNrYWdlSnNvbi52ZXJzaW9uc1t2ZXJzaW9uXTtcbiAgICAgICAgICAgIHRhZyA9ICcnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICBpbmZvLFxuICAgICAgICB2ZXJzaW9uLFxuICAgICAgICB0YWcsXG4gICAgICAgIHRhcmdldCxcbiAgICAgIH07XG4gICAgfSlcbiAgICAuZmlsdGVyKFxuICAgICAgKHsgaW5mbywgdmVyc2lvbiwgdGFyZ2V0IH0pID0+XG4gICAgICAgIHRhcmdldD8uWyduZy11cGRhdGUnXSAmJiBzZW12ZXIuY29tcGFyZShpbmZvLmluc3RhbGxlZC52ZXJzaW9uLCB2ZXJzaW9uKSA8IDAsXG4gICAgKVxuICAgIC5tYXAoKHsgbmFtZSwgaW5mbywgdmVyc2lvbiwgdGFnLCB0YXJnZXQgfSkgPT4ge1xuICAgICAgLy8gTG9vayBmb3IgcGFja2FnZUdyb3VwLlxuICAgICAgY29uc3QgcGFja2FnZUdyb3VwID0gdGFyZ2V0WyduZy11cGRhdGUnXT8uWydwYWNrYWdlR3JvdXAnXTtcbiAgICAgIGlmIChwYWNrYWdlR3JvdXApIHtcbiAgICAgICAgY29uc3QgcGFja2FnZUdyb3VwTmFtZXMgPSBBcnJheS5pc0FycmF5KHBhY2thZ2VHcm91cClcbiAgICAgICAgICA/IHBhY2thZ2VHcm91cFxuICAgICAgICAgIDogT2JqZWN0LmtleXMocGFja2FnZUdyb3VwKTtcblxuICAgICAgICBjb25zdCBwYWNrYWdlR3JvdXBOYW1lID0gdGFyZ2V0WyduZy11cGRhdGUnXT8uWydwYWNrYWdlR3JvdXBOYW1lJ10gfHwgcGFja2FnZUdyb3VwTmFtZXNbMF07XG4gICAgICAgIGlmIChwYWNrYWdlR3JvdXBOYW1lKSB7XG4gICAgICAgICAgaWYgKHBhY2thZ2VHcm91cHMuaGFzKG5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwYWNrYWdlR3JvdXBOYW1lcy5mb3JFYWNoKCh4OiBzdHJpbmcpID0+IHBhY2thZ2VHcm91cHMuc2V0KHgsIHBhY2thZ2VHcm91cE5hbWUpKTtcbiAgICAgICAgICBwYWNrYWdlR3JvdXBzLnNldChwYWNrYWdlR3JvdXBOYW1lLCBwYWNrYWdlR3JvdXBOYW1lKTtcbiAgICAgICAgICBuYW1lID0gcGFja2FnZUdyb3VwTmFtZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBsZXQgY29tbWFuZCA9IGBuZyB1cGRhdGUgJHtuYW1lfWA7XG4gICAgICBpZiAoIXRhZykge1xuICAgICAgICBjb21tYW5kICs9IGBAJHtzZW12ZXIucGFyc2UodmVyc2lvbik/Lm1ham9yIHx8IHZlcnNpb259YDtcbiAgICAgIH0gZWxzZSBpZiAodGFnID09ICduZXh0Jykge1xuICAgICAgICBjb21tYW5kICs9ICcgLS1uZXh0JztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIFtuYW1lLCBgJHtpbmZvLmluc3RhbGxlZC52ZXJzaW9ufSAtPiAke3ZlcnNpb259IGAsIGNvbW1hbmRdO1xuICAgIH0pXG4gICAgLmZpbHRlcigoeCkgPT4geCAhPT0gbnVsbClcbiAgICAuc29ydCgoYSwgYikgPT4gKGEgJiYgYiA/IGFbMF0ubG9jYWxlQ29tcGFyZShiWzBdKSA6IDApKTtcblxuICBpZiAocGFja2FnZXNUb1VwZGF0ZS5sZW5ndGggPT0gMCkge1xuICAgIGxvZ2dlci5pbmZvKCdXZSBhbmFseXplZCB5b3VyIHBhY2thZ2UuanNvbiBhbmQgZXZlcnl0aGluZyBzZWVtcyB0byBiZSBpbiBvcmRlci4gR29vZCB3b3JrIScpO1xuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbG9nZ2VyLmluZm8oJ1dlIGFuYWx5emVkIHlvdXIgcGFja2FnZS5qc29uLCB0aGVyZSBhcmUgc29tZSBwYWNrYWdlcyB0byB1cGRhdGU6XFxuJyk7XG5cbiAgLy8gRmluZCB0aGUgbGFyZ2VzdCBuYW1lIHRvIGtub3cgdGhlIHBhZGRpbmcgbmVlZGVkLlxuICBsZXQgbmFtZVBhZCA9IE1hdGgubWF4KC4uLlsuLi5pbmZvTWFwLmtleXMoKV0ubWFwKCh4KSA9PiB4Lmxlbmd0aCkpICsgMjtcbiAgaWYgKCFOdW1iZXIuaXNGaW5pdGUobmFtZVBhZCkpIHtcbiAgICBuYW1lUGFkID0gMzA7XG4gIH1cbiAgY29uc3QgcGFkcyA9IFtuYW1lUGFkLCAyNSwgMF07XG5cbiAgbG9nZ2VyLmluZm8oXG4gICAgJyAgJyArIFsnTmFtZScsICdWZXJzaW9uJywgJ0NvbW1hbmQgdG8gdXBkYXRlJ10ubWFwKCh4LCBpKSA9PiB4LnBhZEVuZChwYWRzW2ldKSkuam9pbignJyksXG4gICk7XG4gIGxvZ2dlci5pbmZvKCcgJyArICctJy5yZXBlYXQocGFkcy5yZWR1Y2UoKHMsIHgpID0+IChzICs9IHgpLCAwKSArIDIwKSk7XG5cbiAgcGFja2FnZXNUb1VwZGF0ZS5mb3JFYWNoKChmaWVsZHMpID0+IHtcbiAgICBpZiAoIWZpZWxkcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxvZ2dlci5pbmZvKCcgICcgKyBmaWVsZHMubWFwKCh4LCBpKSA9PiB4LnBhZEVuZChwYWRzW2ldKSkuam9pbignJykpO1xuICB9KTtcblxuICBsb2dnZXIuaW5mbyhcbiAgICBgXFxuVGhlcmUgbWlnaHQgYmUgYWRkaXRpb25hbCBwYWNrYWdlcyB3aGljaCBkb24ndCBwcm92aWRlICduZyB1cGRhdGUnIGNhcGFiaWxpdGllcyB0aGF0IGFyZSBvdXRkYXRlZC5cXG5gICtcbiAgICAgIGBZb3UgY2FuIHVwZGF0ZSB0aGUgYWRkaXRpb25hbCBwYWNrYWdlcyBieSBydW5uaW5nIHRoZSB1cGRhdGUgY29tbWFuZCBvZiB5b3VyIHBhY2thZ2UgbWFuYWdlci5gLFxuICApO1xuXG4gIHJldHVybjtcbn1cblxuZnVuY3Rpb24gX2J1aWxkUGFja2FnZUluZm8oXG4gIHRyZWU6IFRyZWUsXG4gIHBhY2thZ2VzOiBNYXA8c3RyaW5nLCBWZXJzaW9uUmFuZ2U+LFxuICBhbGxEZXBlbmRlbmNpZXM6IFJlYWRvbmx5TWFwPHN0cmluZywgVmVyc2lvblJhbmdlPixcbiAgbnBtUGFja2FnZUpzb246IE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbik6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QgbmFtZSA9IG5wbVBhY2thZ2VKc29uLm5hbWU7XG4gIGNvbnN0IHBhY2thZ2VKc29uUmFuZ2UgPSBhbGxEZXBlbmRlbmNpZXMuZ2V0KG5hbWUpO1xuICBpZiAoIXBhY2thZ2VKc29uUmFuZ2UpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgUGFja2FnZSAke0pTT04uc3RyaW5naWZ5KG5hbWUpfSB3YXMgbm90IGZvdW5kIGluIHBhY2thZ2UuanNvbi5gKTtcbiAgfVxuXG4gIC8vIEZpbmQgb3V0IHRoZSBjdXJyZW50bHkgaW5zdGFsbGVkIHZlcnNpb24uIEVpdGhlciBmcm9tIHRoZSBwYWNrYWdlLmpzb24gb3IgdGhlIG5vZGVfbW9kdWxlcy9cbiAgLy8gVE9ETzogZmlndXJlIG91dCBhIHdheSB0byByZWFkIHBhY2thZ2UtbG9jay5qc29uIGFuZC9vciB5YXJuLmxvY2suXG4gIGxldCBpbnN0YWxsZWRWZXJzaW9uOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsO1xuICBjb25zdCBwYWNrYWdlQ29udGVudCA9IHRyZWUucmVhZChgL25vZGVfbW9kdWxlcy8ke25hbWV9L3BhY2thZ2UuanNvbmApO1xuICBpZiAocGFja2FnZUNvbnRlbnQpIHtcbiAgICBjb25zdCBjb250ZW50ID0gSlNPTi5wYXJzZShwYWNrYWdlQ29udGVudC50b1N0cmluZygpKSBhcyBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcztcbiAgICBpbnN0YWxsZWRWZXJzaW9uID0gY29udGVudC52ZXJzaW9uO1xuICB9XG4gIGlmICghaW5zdGFsbGVkVmVyc2lvbikge1xuICAgIC8vIEZpbmQgdGhlIHZlcnNpb24gZnJvbSBOUE0gdGhhdCBmaXRzIHRoZSByYW5nZSB0byBtYXguXG4gICAgaW5zdGFsbGVkVmVyc2lvbiA9IHNlbXZlci5tYXhTYXRpc2Z5aW5nKE9iamVjdC5rZXlzKG5wbVBhY2thZ2VKc29uLnZlcnNpb25zKSwgcGFja2FnZUpzb25SYW5nZSk7XG4gIH1cblxuICBpZiAoIWluc3RhbGxlZFZlcnNpb24pIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihcbiAgICAgIGBBbiB1bmV4cGVjdGVkIGVycm9yIGhhcHBlbmVkOyBjb3VsZCBub3QgZGV0ZXJtaW5lIHZlcnNpb24gZm9yIHBhY2thZ2UgJHtuYW1lfS5gLFxuICAgICk7XG4gIH1cblxuICBjb25zdCBpbnN0YWxsZWRQYWNrYWdlSnNvbiA9IG5wbVBhY2thZ2VKc29uLnZlcnNpb25zW2luc3RhbGxlZFZlcnNpb25dIHx8IHBhY2thZ2VDb250ZW50O1xuICBpZiAoIWluc3RhbGxlZFBhY2thZ2VKc29uKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oXG4gICAgICBgQW4gdW5leHBlY3RlZCBlcnJvciBoYXBwZW5lZDsgcGFja2FnZSAke25hbWV9IGhhcyBubyB2ZXJzaW9uICR7aW5zdGFsbGVkVmVyc2lvbn0uYCxcbiAgICApO1xuICB9XG5cbiAgbGV0IHRhcmdldFZlcnNpb246IFZlcnNpb25SYW5nZSB8IHVuZGVmaW5lZCA9IHBhY2thZ2VzLmdldChuYW1lKTtcbiAgaWYgKHRhcmdldFZlcnNpb24pIHtcbiAgICBpZiAobnBtUGFja2FnZUpzb25bJ2Rpc3QtdGFncyddW3RhcmdldFZlcnNpb25dKSB7XG4gICAgICB0YXJnZXRWZXJzaW9uID0gbnBtUGFja2FnZUpzb25bJ2Rpc3QtdGFncyddW3RhcmdldFZlcnNpb25dIGFzIFZlcnNpb25SYW5nZTtcbiAgICB9IGVsc2UgaWYgKHRhcmdldFZlcnNpb24gPT0gJ25leHQnKSB7XG4gICAgICB0YXJnZXRWZXJzaW9uID0gbnBtUGFja2FnZUpzb25bJ2Rpc3QtdGFncyddWydsYXRlc3QnXSBhcyBWZXJzaW9uUmFuZ2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFZlcnNpb24gPSBzZW12ZXIubWF4U2F0aXNmeWluZyhcbiAgICAgICAgT2JqZWN0LmtleXMobnBtUGFja2FnZUpzb24udmVyc2lvbnMpLFxuICAgICAgICB0YXJnZXRWZXJzaW9uLFxuICAgICAgKSBhcyBWZXJzaW9uUmFuZ2U7XG4gICAgfVxuICB9XG5cbiAgaWYgKHRhcmdldFZlcnNpb24gJiYgc2VtdmVyLmx0ZSh0YXJnZXRWZXJzaW9uLCBpbnN0YWxsZWRWZXJzaW9uKSkge1xuICAgIGxvZ2dlci5kZWJ1ZyhgUGFja2FnZSAke25hbWV9IGFscmVhZHkgc2F0aXNmaWVkIGJ5IHBhY2thZ2UuanNvbiAoJHtwYWNrYWdlSnNvblJhbmdlfSkuYCk7XG4gICAgdGFyZ2V0VmVyc2lvbiA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNvbnN0IHRhcmdldDogUGFja2FnZVZlcnNpb25JbmZvIHwgdW5kZWZpbmVkID0gdGFyZ2V0VmVyc2lvblxuICAgID8ge1xuICAgICAgICB2ZXJzaW9uOiB0YXJnZXRWZXJzaW9uLFxuICAgICAgICBwYWNrYWdlSnNvbjogbnBtUGFja2FnZUpzb24udmVyc2lvbnNbdGFyZ2V0VmVyc2lvbl0sXG4gICAgICAgIHVwZGF0ZU1ldGFkYXRhOiBfZ2V0VXBkYXRlTWV0YWRhdGEobnBtUGFja2FnZUpzb24udmVyc2lvbnNbdGFyZ2V0VmVyc2lvbl0sIGxvZ2dlciksXG4gICAgICB9XG4gICAgOiB1bmRlZmluZWQ7XG5cbiAgLy8gQ2hlY2sgaWYgdGhlcmUncyBhbiBpbnN0YWxsZWQgdmVyc2lvbi5cbiAgcmV0dXJuIHtcbiAgICBuYW1lLFxuICAgIG5wbVBhY2thZ2VKc29uLFxuICAgIGluc3RhbGxlZDoge1xuICAgICAgdmVyc2lvbjogaW5zdGFsbGVkVmVyc2lvbiBhcyBWZXJzaW9uUmFuZ2UsXG4gICAgICBwYWNrYWdlSnNvbjogaW5zdGFsbGVkUGFja2FnZUpzb24sXG4gICAgICB1cGRhdGVNZXRhZGF0YTogX2dldFVwZGF0ZU1ldGFkYXRhKGluc3RhbGxlZFBhY2thZ2VKc29uLCBsb2dnZXIpLFxuICAgIH0sXG4gICAgdGFyZ2V0LFxuICAgIHBhY2thZ2VKc29uUmFuZ2UsXG4gIH07XG59XG5cbmZ1bmN0aW9uIF9idWlsZFBhY2thZ2VMaXN0KFxuICBvcHRpb25zOiBVcGRhdGVTY2hlbWEsXG4gIHByb2plY3REZXBzOiBNYXA8c3RyaW5nLCBWZXJzaW9uUmFuZ2U+LFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuKTogTWFwPHN0cmluZywgVmVyc2lvblJhbmdlPiB7XG4gIC8vIFBhcnNlIHRoZSBwYWNrYWdlcyBvcHRpb25zIHRvIHNldCB0aGUgdGFyZ2V0ZWQgdmVyc2lvbi5cbiAgY29uc3QgcGFja2FnZXMgPSBuZXcgTWFwPHN0cmluZywgVmVyc2lvblJhbmdlPigpO1xuICBjb25zdCBjb21tYW5kTGluZVBhY2thZ2VzID1cbiAgICBvcHRpb25zLnBhY2thZ2VzICYmIG9wdGlvbnMucGFja2FnZXMubGVuZ3RoID4gMCA/IG9wdGlvbnMucGFja2FnZXMgOiBbXTtcblxuICBmb3IgKGNvbnN0IHBrZyBvZiBjb21tYW5kTGluZVBhY2thZ2VzKSB7XG4gICAgLy8gU3BsaXQgdGhlIHZlcnNpb24gYXNrZWQgb24gY29tbWFuZCBsaW5lLlxuICAgIGNvbnN0IG0gPSBwa2cubWF0Y2goL14oKD86QFteL117MSwxMDB9XFwvKT9bXkBdezEsMTAwfSkoPzpAKC57MSwxMDB9KSk/JC8pO1xuICAgIGlmICghbSkge1xuICAgICAgbG9nZ2VyLndhcm4oYEludmFsaWQgcGFja2FnZSBhcmd1bWVudDogJHtKU09OLnN0cmluZ2lmeShwa2cpfS4gU2tpcHBpbmcuYCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBbLCBucG1OYW1lLCBtYXliZVZlcnNpb25dID0gbTtcblxuICAgIGNvbnN0IHZlcnNpb24gPSBwcm9qZWN0RGVwcy5nZXQobnBtTmFtZSk7XG4gICAgaWYgKCF2ZXJzaW9uKSB7XG4gICAgICBsb2dnZXIud2FybihgUGFja2FnZSBub3QgaW5zdGFsbGVkOiAke0pTT04uc3RyaW5naWZ5KG5wbU5hbWUpfS4gU2tpcHBpbmcuYCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBwYWNrYWdlcy5zZXQobnBtTmFtZSwgKG1heWJlVmVyc2lvbiB8fCAob3B0aW9ucy5uZXh0ID8gJ25leHQnIDogJ2xhdGVzdCcpKSBhcyBWZXJzaW9uUmFuZ2UpO1xuICB9XG5cbiAgcmV0dXJuIHBhY2thZ2VzO1xufVxuXG5mdW5jdGlvbiBfYWRkUGFja2FnZUdyb3VwKFxuICB0cmVlOiBUcmVlLFxuICBwYWNrYWdlczogTWFwPHN0cmluZywgVmVyc2lvblJhbmdlPixcbiAgYWxsRGVwZW5kZW5jaWVzOiBSZWFkb25seU1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4sXG4gIG5wbVBhY2thZ2VKc29uOiBOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pOiB2b2lkIHtcbiAgY29uc3QgbWF5YmVQYWNrYWdlID0gcGFja2FnZXMuZ2V0KG5wbVBhY2thZ2VKc29uLm5hbWUpO1xuICBpZiAoIW1heWJlUGFja2FnZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGluZm8gPSBfYnVpbGRQYWNrYWdlSW5mbyh0cmVlLCBwYWNrYWdlcywgYWxsRGVwZW5kZW5jaWVzLCBucG1QYWNrYWdlSnNvbiwgbG9nZ2VyKTtcblxuICBjb25zdCB2ZXJzaW9uID1cbiAgICAoaW5mby50YXJnZXQgJiYgaW5mby50YXJnZXQudmVyc2lvbikgfHxcbiAgICBucG1QYWNrYWdlSnNvblsnZGlzdC10YWdzJ11bbWF5YmVQYWNrYWdlXSB8fFxuICAgIG1heWJlUGFja2FnZTtcbiAgaWYgKCFucG1QYWNrYWdlSnNvbi52ZXJzaW9uc1t2ZXJzaW9uXSkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBuZ1VwZGF0ZU1ldGFkYXRhID0gbnBtUGFja2FnZUpzb24udmVyc2lvbnNbdmVyc2lvbl1bJ25nLXVwZGF0ZSddO1xuICBpZiAoIW5nVXBkYXRlTWV0YWRhdGEpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBwYWNrYWdlR3JvdXAgPSBuZ1VwZGF0ZU1ldGFkYXRhWydwYWNrYWdlR3JvdXAnXTtcbiAgaWYgKCFwYWNrYWdlR3JvdXApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgbGV0IHBhY2thZ2VHcm91cE5vcm1hbGl6ZWQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgaWYgKEFycmF5LmlzQXJyYXkocGFja2FnZUdyb3VwKSAmJiAhcGFja2FnZUdyb3VwLnNvbWUoKHgpID0+IHR5cGVvZiB4ICE9ICdzdHJpbmcnKSkge1xuICAgIHBhY2thZ2VHcm91cE5vcm1hbGl6ZWQgPSBwYWNrYWdlR3JvdXAucmVkdWNlKChhY2MsIGN1cnIpID0+IHtcbiAgICAgIGFjY1tjdXJyXSA9IG1heWJlUGFja2FnZTtcblxuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCB7fSBhcyB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfSk7XG4gIH0gZWxzZSBpZiAoXG4gICAgdHlwZW9mIHBhY2thZ2VHcm91cCA9PSAnb2JqZWN0JyAmJlxuICAgIHBhY2thZ2VHcm91cCAmJlxuICAgICFBcnJheS5pc0FycmF5KHBhY2thZ2VHcm91cCkgJiZcbiAgICBPYmplY3QudmFsdWVzKHBhY2thZ2VHcm91cCkuZXZlcnkoKHgpID0+IHR5cGVvZiB4ID09ICdzdHJpbmcnKVxuICApIHtcbiAgICBwYWNrYWdlR3JvdXBOb3JtYWxpemVkID0gcGFja2FnZUdyb3VwO1xuICB9IGVsc2Uge1xuICAgIGxvZ2dlci53YXJuKGBwYWNrYWdlR3JvdXAgbWV0YWRhdGEgb2YgcGFja2FnZSAke25wbVBhY2thZ2VKc29uLm5hbWV9IGlzIG1hbGZvcm1lZC4gSWdub3JpbmcuYCk7XG5cbiAgICByZXR1cm47XG4gIH1cblxuICBmb3IgKGNvbnN0IFtuYW1lLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMocGFja2FnZUdyb3VwTm9ybWFsaXplZCkpIHtcbiAgICAvLyBEb24ndCBvdmVycmlkZSBuYW1lcyBmcm9tIHRoZSBjb21tYW5kIGxpbmUuXG4gICAgLy8gUmVtb3ZlIHBhY2thZ2VzIHRoYXQgYXJlbid0IGluc3RhbGxlZC5cbiAgICBpZiAoIXBhY2thZ2VzLmhhcyhuYW1lKSAmJiBhbGxEZXBlbmRlbmNpZXMuaGFzKG5hbWUpKSB7XG4gICAgICBwYWNrYWdlcy5zZXQobmFtZSwgdmFsdWUgYXMgVmVyc2lvblJhbmdlKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBZGQgcGVlciBkZXBlbmRlbmNpZXMgb2YgcGFja2FnZXMgb24gdGhlIGNvbW1hbmQgbGluZSB0byB0aGUgbGlzdCBvZiBwYWNrYWdlcyB0byB1cGRhdGUuXG4gKiBXZSBkb24ndCBkbyB2ZXJpZmljYXRpb24gb2YgdGhlIHZlcnNpb25zIGhlcmUgYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgYSBsYXRlciBzdGVwIChhbmQgY2FuXG4gKiBiZSBpZ25vcmVkIGJ5IHRoZSAtLWZvcmNlIGZsYWcpLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2FkZFBlZXJEZXBlbmRlbmNpZXMoXG4gIHRyZWU6IFRyZWUsXG4gIHBhY2thZ2VzOiBNYXA8c3RyaW5nLCBWZXJzaW9uUmFuZ2U+LFxuICBhbGxEZXBlbmRlbmNpZXM6IFJlYWRvbmx5TWFwPHN0cmluZywgVmVyc2lvblJhbmdlPixcbiAgbnBtUGFja2FnZUpzb246IE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbixcbiAgbnBtUGFja2FnZUpzb25NYXA6IE1hcDxzdHJpbmcsIE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbj4sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pOiB2b2lkIHtcbiAgY29uc3QgbWF5YmVQYWNrYWdlID0gcGFja2FnZXMuZ2V0KG5wbVBhY2thZ2VKc29uLm5hbWUpO1xuICBpZiAoIW1heWJlUGFja2FnZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGluZm8gPSBfYnVpbGRQYWNrYWdlSW5mbyh0cmVlLCBwYWNrYWdlcywgYWxsRGVwZW5kZW5jaWVzLCBucG1QYWNrYWdlSnNvbiwgbG9nZ2VyKTtcblxuICBjb25zdCB2ZXJzaW9uID1cbiAgICAoaW5mby50YXJnZXQgJiYgaW5mby50YXJnZXQudmVyc2lvbikgfHxcbiAgICBucG1QYWNrYWdlSnNvblsnZGlzdC10YWdzJ11bbWF5YmVQYWNrYWdlXSB8fFxuICAgIG1heWJlUGFja2FnZTtcbiAgaWYgKCFucG1QYWNrYWdlSnNvbi52ZXJzaW9uc1t2ZXJzaW9uXSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHBhY2thZ2VKc29uID0gbnBtUGFja2FnZUpzb24udmVyc2lvbnNbdmVyc2lvbl07XG4gIGNvbnN0IGVycm9yID0gZmFsc2U7XG5cbiAgZm9yIChjb25zdCBbcGVlciwgcmFuZ2VdIG9mIE9iamVjdC5lbnRyaWVzKHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXMgfHwge30pKSB7XG4gICAgaWYgKHBhY2thZ2VzLmhhcyhwZWVyKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgcGVlclBhY2thZ2VKc29uID0gbnBtUGFja2FnZUpzb25NYXAuZ2V0KHBlZXIpO1xuICAgIGlmIChwZWVyUGFja2FnZUpzb24pIHtcbiAgICAgIGNvbnN0IHBlZXJJbmZvID0gX2J1aWxkUGFja2FnZUluZm8odHJlZSwgcGFja2FnZXMsIGFsbERlcGVuZGVuY2llcywgcGVlclBhY2thZ2VKc29uLCBsb2dnZXIpO1xuICAgICAgaWYgKHNlbXZlci5zYXRpc2ZpZXMocGVlckluZm8uaW5zdGFsbGVkLnZlcnNpb24sIHJhbmdlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBwYWNrYWdlcy5zZXQocGVlciwgcmFuZ2UgYXMgVmVyc2lvblJhbmdlKTtcbiAgfVxuXG4gIGlmIChlcnJvcikge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdBbiBlcnJvciBvY2N1cmVkLCBzZWUgYWJvdmUuJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2dldEFsbERlcGVuZGVuY2llcyh0cmVlOiBUcmVlKTogQXJyYXk8cmVhZG9ubHkgW3N0cmluZywgVmVyc2lvblJhbmdlXT4ge1xuICBjb25zdCBwYWNrYWdlSnNvbkNvbnRlbnQgPSB0cmVlLnJlYWQoJy9wYWNrYWdlLmpzb24nKTtcbiAgaWYgKCFwYWNrYWdlSnNvbkNvbnRlbnQpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IGZpbmQgYSBwYWNrYWdlLmpzb24uIEFyZSB5b3UgaW4gYSBOb2RlIHByb2plY3Q/Jyk7XG4gIH1cblxuICBsZXQgcGFja2FnZUpzb246IEpzb25TY2hlbWFGb3JOcG1QYWNrYWdlSnNvbkZpbGVzO1xuICB0cnkge1xuICAgIHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShwYWNrYWdlSnNvbkNvbnRlbnQudG9TdHJpbmcoKSkgYXMgSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXM7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbigncGFja2FnZS5qc29uIGNvdWxkIG5vdCBiZSBwYXJzZWQ6ICcgKyBlLm1lc3NhZ2UpO1xuICB9XG5cbiAgcmV0dXJuIFtcbiAgICAuLi4oT2JqZWN0LmVudHJpZXMocGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llcyB8fCB7fSkgYXMgQXJyYXk8W3N0cmluZywgVmVyc2lvblJhbmdlXT4pLFxuICAgIC4uLihPYmplY3QuZW50cmllcyhwYWNrYWdlSnNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge30pIGFzIEFycmF5PFtzdHJpbmcsIFZlcnNpb25SYW5nZV0+KSxcbiAgICAuLi4oT2JqZWN0LmVudHJpZXMocGFja2FnZUpzb24uZGVwZW5kZW5jaWVzIHx8IHt9KSBhcyBBcnJheTxbc3RyaW5nLCBWZXJzaW9uUmFuZ2VdPiksXG4gIF07XG59XG5cbmZ1bmN0aW9uIF9mb3JtYXRWZXJzaW9uKHZlcnNpb246IHN0cmluZyB8IHVuZGVmaW5lZCkge1xuICBpZiAodmVyc2lvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICghdmVyc2lvbi5tYXRjaCgvXlxcZHsxLDMwfVxcLlxcZHsxLDMwfVxcLlxcZHsxLDMwfS8pKSB7XG4gICAgdmVyc2lvbiArPSAnLjAnO1xuICB9XG4gIGlmICghdmVyc2lvbi5tYXRjaCgvXlxcZHsxLDMwfVxcLlxcZHsxLDMwfVxcLlxcZHsxLDMwfS8pKSB7XG4gICAgdmVyc2lvbiArPSAnLjAnO1xuICB9XG4gIGlmICghc2VtdmVyLnZhbGlkKHZlcnNpb24pKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEludmFsaWQgbWlncmF0aW9uIHZlcnNpb246ICR7SlNPTi5zdHJpbmdpZnkodmVyc2lvbil9YCk7XG4gIH1cblxuICByZXR1cm4gdmVyc2lvbjtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBnaXZlbiBwYWNrYWdlIHNwZWNpZmllciAodGhlIHZhbHVlIHN0cmluZyBpbiBhXG4gKiBgcGFja2FnZS5qc29uYCBkZXBlbmRlbmN5KSBpcyBob3N0ZWQgaW4gdGhlIE5QTSByZWdpc3RyeS5cbiAqIEB0aHJvd3MgV2hlbiB0aGUgc3BlY2lmaWVyIGNhbm5vdCBiZSBwYXJzZWQuXG4gKi9cbmZ1bmN0aW9uIGlzUGtnRnJvbVJlZ2lzdHJ5KG5hbWU6IHN0cmluZywgc3BlY2lmaWVyOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcmVzdWx0ID0gbnBhLnJlc29sdmUobmFtZSwgc3BlY2lmaWVyKTtcblxuICByZXR1cm4gISFyZXN1bHQucmVnaXN0cnk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBVcGRhdGVTY2hlbWEpOiBSdWxlIHtcbiAgaWYgKCFvcHRpb25zLnBhY2thZ2VzKSB7XG4gICAgLy8gV2UgY2Fubm90IGp1c3QgcmV0dXJuIHRoaXMgYmVjYXVzZSB3ZSBuZWVkIHRvIGZldGNoIHRoZSBwYWNrYWdlcyBmcm9tIE5QTSBzdGlsbCBmb3IgdGhlXG4gICAgLy8gaGVscC9ndWlkZSB0byBzaG93LlxuICAgIG9wdGlvbnMucGFja2FnZXMgPSBbXTtcbiAgfSBlbHNlIHtcbiAgICAvLyBXZSBzcGxpdCBldmVyeSBwYWNrYWdlcyBieSBjb21tYXMgdG8gYWxsb3cgcGVvcGxlIHRvIHBhc3MgaW4gbXVsdGlwbGUgYW5kIG1ha2UgaXQgYW4gYXJyYXkuXG4gICAgb3B0aW9ucy5wYWNrYWdlcyA9IG9wdGlvbnMucGFja2FnZXMucmVkdWNlKChhY2MsIGN1cnIpID0+IHtcbiAgICAgIHJldHVybiBhY2MuY29uY2F0KGN1cnIuc3BsaXQoJywnKSk7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMubWlncmF0ZU9ubHkgJiYgb3B0aW9ucy5mcm9tKSB7XG4gICAgaWYgKG9wdGlvbnMucGFja2FnZXMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignLS1mcm9tIHJlcXVpcmVzIHRoYXQgb25seSBhIHNpbmdsZSBwYWNrYWdlIGJlIHBhc3NlZC4nKTtcbiAgICB9XG4gIH1cblxuICBvcHRpb25zLmZyb20gPSBfZm9ybWF0VmVyc2lvbihvcHRpb25zLmZyb20pO1xuICBvcHRpb25zLnRvID0gX2Zvcm1hdFZlcnNpb24ob3B0aW9ucy50byk7XG4gIGNvbnN0IHVzaW5nWWFybiA9IG9wdGlvbnMucGFja2FnZU1hbmFnZXIgPT09ICd5YXJuJztcblxuICByZXR1cm4gYXN5bmMgKHRyZWU6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBsb2dnZXIgPSBjb250ZXh0LmxvZ2dlcjtcbiAgICBjb25zdCBucG1EZXBzID0gbmV3IE1hcChcbiAgICAgIF9nZXRBbGxEZXBlbmRlbmNpZXModHJlZSkuZmlsdGVyKChbbmFtZSwgc3BlY2lmaWVyXSkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBpc1BrZ0Zyb21SZWdpc3RyeShuYW1lLCBzcGVjaWZpZXIpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICBsb2dnZXIud2FybihgUGFja2FnZSAke25hbWV9IHdhcyBub3QgZm91bmQgb24gdGhlIHJlZ2lzdHJ5LiBTa2lwcGluZy5gKTtcblxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgKTtcbiAgICBjb25zdCBwYWNrYWdlcyA9IF9idWlsZFBhY2thZ2VMaXN0KG9wdGlvbnMsIG5wbURlcHMsIGxvZ2dlcik7XG5cbiAgICAvLyBHcmFiIGFsbCBwYWNrYWdlLmpzb24gZnJvbSB0aGUgbnBtIHJlcG9zaXRvcnkuIFRoaXMgcmVxdWlyZXMgYSBsb3Qgb2YgSFRUUCBjYWxscyBzbyB3ZVxuICAgIC8vIHRyeSB0byBwYXJhbGxlbGl6ZSBhcyBtYW55IGFzIHBvc3NpYmxlLlxuICAgIGNvbnN0IGFsbFBhY2thZ2VNZXRhZGF0YSA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgQXJyYXkuZnJvbShucG1EZXBzLmtleXMoKSkubWFwKChkZXBOYW1lKSA9PlxuICAgICAgICBnZXROcG1QYWNrYWdlSnNvbihkZXBOYW1lLCBsb2dnZXIsIHtcbiAgICAgICAgICByZWdpc3RyeTogb3B0aW9ucy5yZWdpc3RyeSxcbiAgICAgICAgICB1c2luZ1lhcm4sXG4gICAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgKTtcblxuICAgIC8vIEJ1aWxkIGEgbWFwIG9mIGFsbCBkZXBlbmRlbmNpZXMgYW5kIHRoZWlyIHBhY2thZ2VKc29uLlxuICAgIGNvbnN0IG5wbVBhY2thZ2VKc29uTWFwID0gYWxsUGFja2FnZU1ldGFkYXRhLnJlZHVjZSgoYWNjLCBucG1QYWNrYWdlSnNvbikgPT4ge1xuICAgICAgLy8gSWYgdGhlIHBhY2thZ2Ugd2FzIG5vdCBmb3VuZCBvbiB0aGUgcmVnaXN0cnkuIEl0IGNvdWxkIGJlIHByaXZhdGUsIHNvIHdlIHdpbGwganVzdFxuICAgICAgLy8gaWdub3JlLiBJZiB0aGUgcGFja2FnZSB3YXMgcGFydCBvZiB0aGUgbGlzdCwgd2Ugd2lsbCBlcnJvciBvdXQsIGJ1dCB3aWxsIHNpbXBseSBpZ25vcmVcbiAgICAgIC8vIGlmIGl0J3MgZWl0aGVyIG5vdCByZXF1ZXN0ZWQgKHNvIGp1c3QgcGFydCBvZiBwYWNrYWdlLmpzb24uIHNpbGVudGx5KS5cbiAgICAgIGlmICghbnBtUGFja2FnZUpzb24ubmFtZSkge1xuICAgICAgICBpZiAobnBtUGFja2FnZUpzb24ucmVxdWVzdGVkTmFtZSAmJiBwYWNrYWdlcy5oYXMobnBtUGFja2FnZUpzb24ucmVxdWVzdGVkTmFtZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihcbiAgICAgICAgICAgIGBQYWNrYWdlICR7SlNPTi5zdHJpbmdpZnkobnBtUGFja2FnZUpzb24ucmVxdWVzdGVkTmFtZSl9IHdhcyBub3QgZm91bmQgb24gdGhlIGAgK1xuICAgICAgICAgICAgICAncmVnaXN0cnkuIENhbm5vdCBjb250aW51ZSBhcyB0aGlzIG1heSBiZSBhbiBlcnJvci4nLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIGEgbmFtZSBpcyBwcmVzZW50LCBpdCBpcyBhc3N1bWVkIHRvIGJlIGZ1bGx5IHBvcHVsYXRlZFxuICAgICAgICBhY2Muc2V0KG5wbVBhY2thZ2VKc29uLm5hbWUsIG5wbVBhY2thZ2VKc29uIGFzIE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwgbmV3IE1hcDxzdHJpbmcsIE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbj4oKSk7XG5cbiAgICAvLyBBdWdtZW50IHRoZSBjb21tYW5kIGxpbmUgcGFja2FnZSBsaXN0IHdpdGggcGFja2FnZUdyb3VwcyBhbmQgZm9yd2FyZCBwZWVyIGRlcGVuZGVuY2llcy5cbiAgICAvLyBFYWNoIGFkZGVkIHBhY2thZ2UgbWF5IHVuY292ZXIgbmV3IHBhY2thZ2UgZ3JvdXBzIGFuZCBwZWVyIGRlcGVuZGVuY2llcywgc28gd2UgbXVzdFxuICAgIC8vIHJlcGVhdCB0aGlzIHByb2Nlc3MgdW50aWwgdGhlIHBhY2thZ2UgbGlzdCBzdGFiaWxpemVzLlxuICAgIGxldCBsYXN0UGFja2FnZXNTaXplO1xuICAgIGRvIHtcbiAgICAgIGxhc3RQYWNrYWdlc1NpemUgPSBwYWNrYWdlcy5zaXplO1xuICAgICAgbnBtUGFja2FnZUpzb25NYXAuZm9yRWFjaCgobnBtUGFja2FnZUpzb24pID0+IHtcbiAgICAgICAgX2FkZFBhY2thZ2VHcm91cCh0cmVlLCBwYWNrYWdlcywgbnBtRGVwcywgbnBtUGFja2FnZUpzb24sIGxvZ2dlcik7XG4gICAgICAgIF9hZGRQZWVyRGVwZW5kZW5jaWVzKHRyZWUsIHBhY2thZ2VzLCBucG1EZXBzLCBucG1QYWNrYWdlSnNvbiwgbnBtUGFja2FnZUpzb25NYXAsIGxvZ2dlcik7XG4gICAgICB9KTtcbiAgICB9IHdoaWxlIChwYWNrYWdlcy5zaXplID4gbGFzdFBhY2thZ2VzU2l6ZSk7XG5cbiAgICAvLyBCdWlsZCB0aGUgUGFja2FnZUluZm8gZm9yIGVhY2ggbW9kdWxlLlxuICAgIGNvbnN0IHBhY2thZ2VJbmZvTWFwID0gbmV3IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPigpO1xuICAgIG5wbVBhY2thZ2VKc29uTWFwLmZvckVhY2goKG5wbVBhY2thZ2VKc29uKSA9PiB7XG4gICAgICBwYWNrYWdlSW5mb01hcC5zZXQoXG4gICAgICAgIG5wbVBhY2thZ2VKc29uLm5hbWUsXG4gICAgICAgIF9idWlsZFBhY2thZ2VJbmZvKHRyZWUsIHBhY2thZ2VzLCBucG1EZXBzLCBucG1QYWNrYWdlSnNvbiwgbG9nZ2VyKSxcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICAvLyBOb3cgdGhhdCB3ZSBoYXZlIGFsbCB0aGUgaW5mb3JtYXRpb24sIGNoZWNrIHRoZSBmbGFncy5cbiAgICBpZiAocGFja2FnZXMuc2l6ZSA+IDApIHtcbiAgICAgIGlmIChvcHRpb25zLm1pZ3JhdGVPbmx5ICYmIG9wdGlvbnMuZnJvbSAmJiBvcHRpb25zLnBhY2thZ2VzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc3VibG9nID0gbmV3IGxvZ2dpbmcuTGV2ZWxDYXBMb2dnZXIoJ3ZhbGlkYXRpb24nLCBsb2dnZXIuY3JlYXRlQ2hpbGQoJycpLCAnd2FybicpO1xuICAgICAgX3ZhbGlkYXRlVXBkYXRlUGFja2FnZXMocGFja2FnZUluZm9NYXAsICEhb3B0aW9ucy5mb3JjZSwgISFvcHRpb25zLm5leHQsIHN1YmxvZyk7XG5cbiAgICAgIF9wZXJmb3JtVXBkYXRlKHRyZWUsIGNvbnRleHQsIHBhY2thZ2VJbmZvTWFwLCBsb2dnZXIsICEhb3B0aW9ucy5taWdyYXRlT25seSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF91c2FnZU1lc3NhZ2Uob3B0aW9ucywgcGFja2FnZUluZm9NYXAsIGxvZ2dlcik7XG4gICAgfVxuICB9O1xufVxuIl19