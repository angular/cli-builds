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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZHMvdXBkYXRlL3NjaGVtYXRpYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFxRDtBQUNyRCwyREFBK0Y7QUFDL0YscURBQXVDO0FBQ3ZDLCtDQUFpQztBQUVqQywwRUFBa0c7QUFNbEcsa0dBQWtHO0FBQ2xHLCtGQUErRjtBQUMvRiw4RkFBOEY7QUFDOUYsd0ZBQXdGO0FBQ3hGLHFDQUFxQztBQUNyQyxTQUFnQiwyQkFBMkIsQ0FBQyxLQUFhO0lBQ3ZELElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEMsSUFBSSxDQUFDLFFBQVEsRUFBRTtRQUNiLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFDRCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDZCxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsTUFBTSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1FBQzVDLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxLQUFLLElBQUksRUFBRSxFQUFFO1lBQ2Ysc0RBQXNEO1lBQ3RELGlEQUFpRDtZQUNqRCxPQUFPLFFBQVEsQ0FBQztTQUNqQjtLQUNGO0lBRUQsNEZBQTRGO0lBQzVGLGdHQUFnRztJQUNoRywwRkFBMEY7SUFDMUYsUUFBUSxHQUFHLEtBQUssQ0FBQztJQUNqQixLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFO1FBQ3ZDLFFBQVEsSUFBSSxRQUFRLEtBQUssSUFBSSxLQUFLLGFBQWEsQ0FBQztLQUNqRDtJQUVELE9BQU8sTUFBTSxDQUFDLFVBQVUs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SUFBSSxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUU7Z0JBQzNELE9BQU87YUFDUjtZQUVELE1BQU0sTUFBTSxHQUFHLElBQUksY0FBTyxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN4Rix1QkFBdUIsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFakYsY0FBYyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQzlFO2FBQU07WUFDTCxhQUFhLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUNoRDtJQUNILENBQUMsQ0FBQztBQUNKLENBQUM7QUF4R0QsNEJBd0dDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGxvZ2dpbmcsIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBSdWxlLCBTY2hlbWF0aWNDb250ZXh0LCBTY2hlbWF0aWNzRXhjZXB0aW9uLCBUcmVlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0ICogYXMgbnBhIGZyb20gJ25wbS1wYWNrYWdlLWFyZyc7XG5pbXBvcnQgKiBhcyBzZW12ZXIgZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IERlcGVuZGVuY3ksIEpzb25TY2hlbWFGb3JOcG1QYWNrYWdlSnNvbkZpbGVzIH0gZnJvbSAnLi4vLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtanNvbic7XG5pbXBvcnQgeyBOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24sIGdldE5wbVBhY2thZ2VKc29uIH0gZnJvbSAnLi4vLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWV0YWRhdGEnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFVwZGF0ZVNjaGVtYSB9IGZyb20gJy4vc2NoZW1hJztcblxudHlwZSBWZXJzaW9uUmFuZ2UgPSBzdHJpbmcgJiB7IF9fVkVSU0lPTl9SQU5HRTogdm9pZCB9O1xudHlwZSBQZWVyVmVyc2lvblRyYW5zZm9ybSA9IHN0cmluZyB8ICgocmFuZ2U6IHN0cmluZykgPT4gc3RyaW5nKTtcblxuLy8gQW5ndWxhciBndWFyYW50ZWVzIHRoYXQgYSBtYWpvciBpcyBjb21wYXRpYmxlIHdpdGggaXRzIGZvbGxvd2luZyBtYWpvciAoc28gcGFja2FnZXMgdGhhdCBkZXBlbmRcbi8vIG9uIEFuZ3VsYXIgNSBhcmUgYWxzbyBjb21wYXRpYmxlIHdpdGggQW5ndWxhciA2KS4gVGhpcyBpcywgaW4gY29kZSwgcmVwcmVzZW50ZWQgYnkgdmVyaWZ5aW5nXG4vLyB0aGF0IGFsbCBvdGhlciBwYWNrYWdlcyB0aGF0IGhhdmUgYSBwZWVyIGRlcGVuZGVuY3kgb2YgYFwiQGFuZ3VsYXIvY29yZVwiOiBcIl41LjAuMFwiYCBhY3R1YWxseVxuLy8gc3VwcG9ydHMgNi4wLCBieSBhZGRpbmcgdGhhdCBjb21wYXRpYmlsaXR5IHRvIHRoZSByYW5nZSwgc28gaXQgaXMgYF41LjAuMCB8fCBeNi4wLjBgLlxuLy8gV2UgZXhwb3J0IGl0IHRvIGFsbG93IGZvciB0ZXN0aW5nLlxuZXhwb3J0IGZ1bmN0aW9uIGFuZ3VsYXJNYWpvckNvbXBhdEd1YXJhbnRlZShyYW5nZTogc3RyaW5nKSB7XG4gIGxldCBuZXdSYW5nZSA9IHNlbXZlci52YWxpZFJhbmdlKHJhbmdlKTtcbiAgaWYgKCFuZXdSYW5nZSkge1xuICAgIHJldHVybiByYW5nZTtcbiAgfVxuICBsZXQgbWFqb3IgPSAxO1xuICB3aGlsZSAoIXNlbXZlci5ndHIobWFqb3IgKyAnLjAuMCcsIG5ld1JhbmdlKSkge1xuICAgIG1ham9yKys7XG4gICAgaWYgKG1ham9yID49IDk5KSB7XG4gICAgICAvLyBVc2Ugb3JpZ2luYWwgcmFuZ2UgaWYgaXQgc3VwcG9ydHMgYSBtYWpvciB0aGlzIGhpZ2hcbiAgICAgIC8vIFJhbmdlIGlzIG1vc3QgbGlrZWx5IHVuYm91bmRlZCAoZS5nLiwgPj01LjAuMClcbiAgICAgIHJldHVybiBuZXdSYW5nZTtcbiAgICB9XG4gIH1cblxuICAvLyBBZGQgdGhlIG1ham9yIHZlcnNpb24gYXMgY29tcGF0aWJsZSB3aXRoIHRoZSBhbmd1bGFyIGNvbXBhdGlibGUsIHdpdGggYWxsIG1pbm9ycy4gVGhpcyBpc1xuICAvLyBhbHJlYWR5IG9uZSBtYWpvciBhYm92ZSB0aGUgZ3JlYXRlc3Qgc3VwcG9ydGVkLCBiZWNhdXNlIHdlIGluY3JlbWVudCBgbWFqb3JgIGJlZm9yZSBjaGVja2luZy5cbiAgLy8gV2UgYWRkIG1pbm9ycyBsaWtlIHRoaXMgYmVjYXVzZSBhIG1pbm9yIGJldGEgaXMgc3RpbGwgY29tcGF0aWJsZSB3aXRoIGEgbWlub3Igbm9uLWJldGEuXG4gIG5ld1JhbmdlID0gcmFuZ2U7XG4gIGZvciAobGV0IG1pbm9yID0gMDsgbWlub3IgPCAyMDsgbWlub3IrKykge1xuICAgIG5ld1JhbmdlICs9IGAgfHwgXiR7bWFqb3J9LiR7bWlub3J9LjAtYWxwaGEuMCBgO1xuICB9XG5cbiAgcmV0dXJuIHNlbXZlci52YWxpZFJhbmdlKG5ld1JhbmdlKSB8fCByYW5nZTtcbn1cblxuLy8gVGhpcyBpcyBhIG1hcCBvZiBwYWNrYWdlR3JvdXBOYW1lIHRvIHJhbmdlIGV4dGVuZGluZyBmdW5jdGlvbi4gSWYgaXQgaXNuJ3QgZm91bmQsIHRoZSByYW5nZSBpc1xuLy8ga2VwdCB0aGUgc2FtZS5cbmNvbnN0IGtub3duUGVlckNvbXBhdGlibGVMaXN0OiB7IFtuYW1lOiBzdHJpbmddOiBQZWVyVmVyc2lvblRyYW5zZm9ybSB9ID0ge1xuICAnQGFuZ3VsYXIvY29yZSc6IGFuZ3VsYXJNYWpvckNvbXBhdEd1YXJhbnRlZSxcbn07XG5cbmludGVyZmFjZSBQYWNrYWdlVmVyc2lvbkluZm8ge1xuICB2ZXJzaW9uOiBWZXJzaW9uUmFuZ2U7XG4gIHBhY2thZ2VKc29uOiBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcztcbiAgdXBkYXRlTWV0YWRhdGE6IFVwZGF0ZU1ldGFkYXRhO1xufVxuXG5pbnRlcmZhY2UgUGFja2FnZUluZm8ge1xuICBuYW1lOiBzdHJpbmc7XG4gIG5wbVBhY2thZ2VKc29uOiBOcG1SZXBvc2l0b3J5UGFja2FnZUpzb247XG4gIGluc3RhbGxlZDogUGFja2FnZVZlcnNpb25JbmZvO1xuICB0YXJnZXQ/OiBQYWNrYWdlVmVyc2lvbkluZm87XG4gIHBhY2thZ2VKc29uUmFuZ2U6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFVwZGF0ZU1ldGFkYXRhIHtcbiAgcGFja2FnZUdyb3VwTmFtZT86IHN0cmluZztcbiAgcGFja2FnZUdyb3VwOiB7IFtwYWNrYWdlTmFtZTogc3RyaW5nXTogc3RyaW5nIH07XG4gIHJlcXVpcmVtZW50czogeyBbcGFja2FnZU5hbWU6IHN0cmluZ106IHN0cmluZyB9O1xuICBtaWdyYXRpb25zPzogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBfdXBkYXRlUGVlclZlcnNpb24oaW5mb01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm8+LCBuYW1lOiBzdHJpbmcsIHJhbmdlOiBzdHJpbmcpIHtcbiAgLy8gUmVzb2x2ZSBwYWNrYWdlR3JvdXBOYW1lLlxuICBjb25zdCBtYXliZVBhY2thZ2VJbmZvID0gaW5mb01hcC5nZXQobmFtZSk7XG4gIGlmICghbWF5YmVQYWNrYWdlSW5mbykge1xuICAgIHJldHVybiByYW5nZTtcbiAgfVxuICBpZiAobWF5YmVQYWNrYWdlSW5mby50YXJnZXQpIHtcbiAgICBuYW1lID0gbWF5YmVQYWNrYWdlSW5mby50YXJnZXQudXBkYXRlTWV0YWRhdGEucGFja2FnZUdyb3VwTmFtZSB8fCBuYW1lO1xuICB9IGVsc2Uge1xuICAgIG5hbWUgPSBtYXliZVBhY2thZ2VJbmZvLmluc3RhbGxlZC51cGRhdGVNZXRhZGF0YS5wYWNrYWdlR3JvdXBOYW1lIHx8IG5hbWU7XG4gIH1cblxuICBjb25zdCBtYXliZVRyYW5zZm9ybSA9IGtub3duUGVlckNvbXBhdGlibGVMaXN0W25hbWVdO1xuICBpZiAobWF5YmVUcmFuc2Zvcm0pIHtcbiAgICBpZiAodHlwZW9mIG1heWJlVHJhbnNmb3JtID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBtYXliZVRyYW5zZm9ybShyYW5nZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBtYXliZVRyYW5zZm9ybTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmFuZ2U7XG59XG5cbmZ1bmN0aW9uIF92YWxpZGF0ZUZvcndhcmRQZWVyRGVwZW5kZW5jaWVzKFxuICBuYW1lOiBzdHJpbmcsXG4gIGluZm9NYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPixcbiAgcGVlcnM6IHsgW25hbWU6IHN0cmluZ106IHN0cmluZyB9LFxuICBwZWVyc01ldGE6IHsgW25hbWU6IHN0cmluZ106IHsgb3B0aW9uYWw/OiBib29sZWFuIH0gfSxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbiAgbmV4dDogYm9vbGVhbixcbik6IGJvb2xlYW4ge1xuICBsZXQgdmFsaWRhdGlvbkZhaWxlZCA9IGZhbHNlO1xuICBmb3IgKGNvbnN0IFtwZWVyLCByYW5nZV0gb2YgT2JqZWN0LmVudHJpZXMocGVlcnMpKSB7XG4gICAgbG9nZ2VyLmRlYnVnKGBDaGVja2luZyBmb3J3YXJkIHBlZXIgJHtwZWVyfS4uLmApO1xuICAgIGNvbnN0IG1heWJlUGVlckluZm8gPSBpbmZvTWFwLmdldChwZWVyKTtcbiAgICBjb25zdCBpc09wdGlvbmFsID0gcGVlcnNNZXRhW3BlZXJdICYmICEhcGVlcnNNZXRhW3BlZXJdLm9wdGlvbmFsO1xuICAgIGlmICghbWF5YmVQZWVySW5mbykge1xuICAgICAgaWYgKCFpc09wdGlvbmFsKSB7XG4gICAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICAgIFtcbiAgICAgICAgICAgIGBQYWNrYWdlICR7SlNPTi5zdHJpbmdpZnkobmFtZSl9IGhhcyBhIG1pc3NpbmcgcGVlciBkZXBlbmRlbmN5IG9mYCxcbiAgICAgICAgICAgIGAke0pTT04uc3RyaW5naWZ5KHBlZXIpfSBAICR7SlNPTi5zdHJpbmdpZnkocmFuZ2UpfS5gLFxuICAgICAgICAgIF0uam9pbignICcpLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBwZWVyVmVyc2lvbiA9XG4gICAgICBtYXliZVBlZXJJbmZvLnRhcmdldCAmJiBtYXliZVBlZXJJbmZvLnRhcmdldC5wYWNrYWdlSnNvbi52ZXJzaW9uXG4gICAgICAgID8gbWF5YmVQZWVySW5mby50YXJnZXQucGFja2FnZUpzb24udmVyc2lvblxuICAgICAgICA6IG1heWJlUGVlckluZm8uaW5zdGFsbGVkLnZlcnNpb247XG5cbiAgICBsb2dnZXIuZGVidWcoYCAgUmFuZ2UgaW50ZXJzZWN0cygke3JhbmdlfSwgJHtwZWVyVmVyc2lvbn0pLi4uYCk7XG4gICAgaWYgKCFzZW12ZXIuc2F0aXNmaWVzKHBlZXJWZXJzaW9uLCByYW5nZSwgeyBpbmNsdWRlUHJlcmVsZWFzZTogbmV4dCB8fCB1bmRlZmluZWQgfSkpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgW1xuICAgICAgICAgIGBQYWNrYWdlICR7SlNPTi5zdHJpbmdpZnkobmFtZSl9IGhhcyBhbiBpbmNvbXBhdGlibGUgcGVlciBkZXBlbmRlbmN5IHRvYCxcbiAgICAgICAgICBgJHtKU09OLnN0cmluZ2lmeShwZWVyKX0gKHJlcXVpcmVzICR7SlNPTi5zdHJpbmdpZnkocmFuZ2UpfSxgLFxuICAgICAgICAgIGB3b3VsZCBpbnN0YWxsICR7SlNPTi5zdHJpbmdpZnkocGVlclZlcnNpb24pfSlgLFxuICAgICAgICBdLmpvaW4oJyAnKSxcbiAgICAgICk7XG5cbiAgICAgIHZhbGlkYXRpb25GYWlsZWQgPSB0cnVlO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHZhbGlkYXRpb25GYWlsZWQ7XG59XG5cbmZ1bmN0aW9uIF92YWxpZGF0ZVJldmVyc2VQZWVyRGVwZW5kZW5jaWVzKFxuICBuYW1lOiBzdHJpbmcsXG4gIHZlcnNpb246IHN0cmluZyxcbiAgaW5mb01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm8+LFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuICBuZXh0OiBib29sZWFuLFxuKSB7XG4gIGZvciAoY29uc3QgW2luc3RhbGxlZCwgaW5zdGFsbGVkSW5mb10gb2YgaW5mb01hcC5lbnRyaWVzKCkpIHtcbiAgICBjb25zdCBpbnN0YWxsZWRMb2dnZXIgPSBsb2dnZXIuY3JlYXRlQ2hpbGQoaW5zdGFsbGVkKTtcbiAgICBpbnN0YWxsZWRMb2dnZXIuZGVidWcoYCR7aW5zdGFsbGVkfS4uLmApO1xuICAgIGNvbnN0IHBlZXJzID0gKGluc3RhbGxlZEluZm8udGFyZ2V0IHx8IGluc3RhbGxlZEluZm8uaW5zdGFsbGVkKS5wYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzO1xuXG4gICAgZm9yIChjb25zdCBbcGVlciwgcmFuZ2VdIG9mIE9iamVjdC5lbnRyaWVzKHBlZXJzIHx8IHt9KSkge1xuICAgICAgaWYgKHBlZXIgIT0gbmFtZSkge1xuICAgICAgICAvLyBPbmx5IGNoZWNrIHBlZXJzIHRvIHRoZSBwYWNrYWdlcyB3ZSdyZSB1cGRhdGluZy4gV2UgZG9uJ3QgY2FyZSBhYm91dCBwZWVyc1xuICAgICAgICAvLyB0aGF0IGFyZSB1bm1ldCBidXQgd2UgaGF2ZSBubyBlZmZlY3Qgb24uXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBJZ25vcmUgcGVlckRlcGVuZGVuY3kgbWlzbWF0Y2hlcyBmb3IgdGhlc2UgcGFja2FnZXMuXG4gICAgICAvLyBUaGV5IGFyZSBkZXByZWNhdGVkIGFuZCByZW1vdmVkIHZpYSBhIG1pZ3JhdGlvbi5cbiAgICAgIGNvbnN0IGlnbm9yZWRQYWNrYWdlcyA9IFtcbiAgICAgICAgJ2NvZGVseXplcicsXG4gICAgICAgICdAc2NoZW1hdGljcy91cGRhdGUnLFxuICAgICAgICAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLW5nLXBhY2thZ3InLFxuICAgICAgICAndHNpY2tsZScsXG4gICAgICBdO1xuICAgICAgaWYgKGlnbm9yZWRQYWNrYWdlcy5pbmNsdWRlcyhpbnN0YWxsZWQpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBPdmVycmlkZSB0aGUgcGVlciB2ZXJzaW9uIHJhbmdlIGlmIGl0J3Mga25vd24gYXMgYSBjb21wYXRpYmxlLlxuICAgICAgY29uc3QgZXh0ZW5kZWRSYW5nZSA9IF91cGRhdGVQZWVyVmVyc2lvbihpbmZvTWFwLCBwZWVyLCByYW5nZSk7XG5cbiAgICAgIGlmICghc2VtdmVyLnNhdGlzZmllcyh2ZXJzaW9uLCBleHRlbmRlZFJhbmdlLCB7IGluY2x1ZGVQcmVyZWxlYXNlOiBuZXh0IHx8IHVuZGVmaW5lZCB9KSkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgW1xuICAgICAgICAgICAgYFBhY2thZ2UgJHtKU09OLnN0cmluZ2lmeShpbnN0YWxsZWQpfSBoYXMgYW4gaW5jb21wYXRpYmxlIHBlZXIgZGVwZW5kZW5jeSB0b2AsXG4gICAgICAgICAgICBgJHtKU09OLnN0cmluZ2lmeShuYW1lKX0gKHJlcXVpcmVzYCxcbiAgICAgICAgICAgIGAke0pTT04uc3RyaW5naWZ5KHJhbmdlKX0ke2V4dGVuZGVkUmFuZ2UgPT0gcmFuZ2UgPyAnJyA6ICcgKGV4dGVuZGVkKSd9LGAsXG4gICAgICAgICAgICBgd291bGQgaW5zdGFsbCAke0pTT04uc3RyaW5naWZ5KHZlcnNpb24pfSkuYCxcbiAgICAgICAgICBdLmpvaW4oJyAnKSxcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIF92YWxpZGF0ZVVwZGF0ZVBhY2thZ2VzKFxuICBpbmZvTWFwOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz4sXG4gIGZvcmNlOiBib29sZWFuLFxuICBuZXh0OiBib29sZWFuLFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuKTogdm9pZCB7XG4gIGxvZ2dlci5kZWJ1ZygnVXBkYXRpbmcgdGhlIGZvbGxvd2luZyBwYWNrYWdlczonKTtcbiAgaW5mb01hcC5mb3JFYWNoKChpbmZvKSA9PiB7XG4gICAgaWYgKGluZm8udGFyZ2V0KSB7XG4gICAgICBsb2dnZXIuZGVidWcoYCAgJHtpbmZvLm5hbWV9ID0+ICR7aW5mby50YXJnZXQudmVyc2lvbn1gKTtcbiAgICB9XG4gIH0pO1xuXG4gIGxldCBwZWVyRXJyb3JzID0gZmFsc2U7XG4gIGluZm9NYXAuZm9yRWFjaCgoaW5mbykgPT4ge1xuICAgIGNvbnN0IHsgbmFtZSwgdGFyZ2V0IH0gPSBpbmZvO1xuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGtnTG9nZ2VyID0gbG9nZ2VyLmNyZWF0ZUNoaWxkKG5hbWUpO1xuICAgIGxvZ2dlci5kZWJ1ZyhgJHtuYW1lfS4uLmApO1xuXG4gICAgY29uc3QgeyBwZWVyRGVwZW5kZW5jaWVzID0ge30sIHBlZXJEZXBlbmRlbmNpZXNNZXRhID0ge30gfSA9IHRhcmdldC5wYWNrYWdlSnNvbjtcbiAgICBwZWVyRXJyb3JzID1cbiAgICAgIF92YWxpZGF0ZUZvcndhcmRQZWVyRGVwZW5kZW5jaWVzKFxuICAgICAgICBuYW1lLFxuICAgICAgICBpbmZvTWFwLFxuICAgICAgICBwZWVyRGVwZW5kZW5jaWVzLFxuICAgICAgICBwZWVyRGVwZW5kZW5jaWVzTWV0YSxcbiAgICAgICAgcGtnTG9nZ2VyLFxuICAgICAgICBuZXh0LFxuICAgICAgKSB8fCBwZWVyRXJyb3JzO1xuICAgIHBlZXJFcnJvcnMgPVxuICAgICAgX3ZhbGlkYXRlUmV2ZXJzZVBlZXJEZXBlbmRlbmNpZXMobmFtZSwgdGFyZ2V0LnZlcnNpb24sIGluZm9NYXAsIHBrZ0xvZ2dlciwgbmV4dCkgfHxcbiAgICAgIHBlZXJFcnJvcnM7XG4gIH0pO1xuXG4gIGlmICghZm9yY2UgJiYgcGVlckVycm9ycykge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKHRhZ3Muc3RyaXBJbmRlbnRzYEluY29tcGF0aWJsZSBwZWVyIGRlcGVuZGVuY2llcyBmb3VuZC5cbiAgICAgIFBlZXIgZGVwZW5kZW5jeSB3YXJuaW5ncyB3aGVuIGluc3RhbGxpbmcgZGVwZW5kZW5jaWVzIG1lYW5zIHRoYXQgdGhvc2UgZGVwZW5kZW5jaWVzIG1pZ2h0IG5vdCB3b3JrIGNvcnJlY3RseSB0b2dldGhlci5cbiAgICAgIFlvdSBjYW4gdXNlIHRoZSAnLS1mb3JjZScgb3B0aW9uIHRvIGlnbm9yZSBpbmNvbXBhdGlibGUgcGVlciBkZXBlbmRlbmNpZXMgYW5kIGluc3RlYWQgYWRkcmVzcyB0aGVzZSB3YXJuaW5ncyBsYXRlci5gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfcGVyZm9ybVVwZGF0ZShcbiAgdHJlZTogVHJlZSxcbiAgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCxcbiAgaW5mb01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm8+LFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuICBtaWdyYXRlT25seTogYm9vbGVhbixcbik6IHZvaWQge1xuICBjb25zdCBwYWNrYWdlSnNvbkNvbnRlbnQgPSB0cmVlLnJlYWQoJy9wYWNrYWdlLmpzb24nKTtcbiAgaWYgKCFwYWNrYWdlSnNvbkNvbnRlbnQpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IGZpbmQgYSBwYWNrYWdlLmpzb24uIEFyZSB5b3UgaW4gYSBOb2RlIHByb2plY3Q/Jyk7XG4gIH1cblxuICBsZXQgcGFja2FnZUpzb246IEpzb25TY2hlbWFGb3JOcG1QYWNrYWdlSnNvbkZpbGVzO1xuICB0cnkge1xuICAgIHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShwYWNrYWdlSnNvbkNvbnRlbnQudG9TdHJpbmcoKSkgYXMgSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXM7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbigncGFja2FnZS5qc29uIGNvdWxkIG5vdCBiZSBwYXJzZWQ6ICcgKyBlLm1lc3NhZ2UpO1xuICB9XG5cbiAgY29uc3QgdXBkYXRlRGVwZW5kZW5jeSA9IChkZXBzOiBEZXBlbmRlbmN5LCBuYW1lOiBzdHJpbmcsIG5ld1ZlcnNpb246IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IG9sZFZlcnNpb24gPSBkZXBzW25hbWVdO1xuICAgIC8vIFdlIG9ubHkgcmVzcGVjdCBjYXJldCBhbmQgdGlsZGUgcmFuZ2VzIG9uIHVwZGF0ZS5cbiAgICBjb25zdCBleGVjUmVzdWx0ID0gL15bXFxefl0vLmV4ZWMob2xkVmVyc2lvbik7XG4gICAgZGVwc1tuYW1lXSA9IGAke2V4ZWNSZXN1bHQgPyBleGVjUmVzdWx0WzBdIDogJyd9JHtuZXdWZXJzaW9ufWA7XG4gIH07XG5cbiAgY29uc3QgdG9JbnN0YWxsID0gWy4uLmluZm9NYXAudmFsdWVzKCldXG4gICAgLm1hcCgoeCkgPT4gW3gubmFtZSwgeC50YXJnZXQsIHguaW5zdGFsbGVkXSlcbiAgICAuZmlsdGVyKChbbmFtZSwgdGFyZ2V0LCBpbnN0YWxsZWRdKSA9PiB7XG4gICAgICByZXR1cm4gISFuYW1lICYmICEhdGFyZ2V0ICYmICEhaW5zdGFsbGVkO1xuICAgIH0pIGFzIFtzdHJpbmcsIFBhY2thZ2VWZXJzaW9uSW5mbywgUGFja2FnZVZlcnNpb25JbmZvXVtdO1xuXG4gIHRvSW5zdGFsbC5mb3JFYWNoKChbbmFtZSwgdGFyZ2V0LCBpbnN0YWxsZWRdKSA9PiB7XG4gICAgbG9nZ2VyLmluZm8oXG4gICAgICBgVXBkYXRpbmcgcGFja2FnZS5qc29uIHdpdGggZGVwZW5kZW5jeSAke25hbWV9IGAgK1xuICAgICAgICBgQCAke0pTT04uc3RyaW5naWZ5KHRhcmdldC52ZXJzaW9uKX0gKHdhcyAke0pTT04uc3RyaW5naWZ5KGluc3RhbGxlZC52ZXJzaW9uKX0pLi4uYCxcbiAgICApO1xuXG4gICAgaWYgKHBhY2thZ2VKc29uLmRlcGVuZGVuY2llcyAmJiBwYWNrYWdlSnNvbi5kZXBlbmRlbmNpZXNbbmFtZV0pIHtcbiAgICAgIHVwZGF0ZURlcGVuZGVuY3kocGFja2FnZUpzb24uZGVwZW5kZW5jaWVzLCBuYW1lLCB0YXJnZXQudmVyc2lvbik7XG5cbiAgICAgIGlmIChwYWNrYWdlSnNvbi5kZXZEZXBlbmRlbmNpZXMgJiYgcGFja2FnZUpzb24uZGV2RGVwZW5kZW5jaWVzW25hbWVdKSB7XG4gICAgICAgIGRlbGV0ZSBwYWNrYWdlSnNvbi5kZXZEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICB9XG4gICAgICBpZiAocGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llcyAmJiBwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzW25hbWVdKSB7XG4gICAgICAgIGRlbGV0ZSBwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzW25hbWVdO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocGFja2FnZUpzb24uZGV2RGVwZW5kZW5jaWVzICYmIHBhY2thZ2VKc29uLmRldkRlcGVuZGVuY2llc1tuYW1lXSkge1xuICAgICAgdXBkYXRlRGVwZW5kZW5jeShwYWNrYWdlSnNvbi5kZXZEZXBlbmRlbmNpZXMsIG5hbWUsIHRhcmdldC52ZXJzaW9uKTtcblxuICAgICAgaWYgKHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXMgJiYgcGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXSkge1xuICAgICAgICBkZWxldGUgcGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXMgJiYgcGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXSkge1xuICAgICAgdXBkYXRlRGVwZW5kZW5jeShwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzLCBuYW1lLCB0YXJnZXQudmVyc2lvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZ2dlci53YXJuKGBQYWNrYWdlICR7bmFtZX0gd2FzIG5vdCBmb3VuZCBpbiBkZXBlbmRlbmNpZXMuYCk7XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBuZXdDb250ZW50ID0gSlNPTi5zdHJpbmdpZnkocGFja2FnZUpzb24sIG51bGwsIDIpO1xuICBpZiAocGFja2FnZUpzb25Db250ZW50LnRvU3RyaW5nKCkgIT0gbmV3Q29udGVudCB8fCBtaWdyYXRlT25seSkge1xuICAgIGlmICghbWlncmF0ZU9ubHkpIHtcbiAgICAgIHRyZWUub3ZlcndyaXRlKCcvcGFja2FnZS5qc29uJywgSlNPTi5zdHJpbmdpZnkocGFja2FnZUpzb24sIG51bGwsIDIpKTtcbiAgICB9XG5cbiAgICBjb25zdCBleHRlcm5hbE1pZ3JhdGlvbnM6IHt9W10gPSBbXTtcblxuICAgIC8vIFJ1biB0aGUgbWlncmF0ZSBzY2hlbWF0aWNzIHdpdGggdGhlIGxpc3Qgb2YgcGFja2FnZXMgdG8gdXNlLiBUaGUgY29sbGVjdGlvbiBjb250YWluc1xuICAgIC8vIHZlcnNpb24gaW5mb3JtYXRpb24gYW5kIHdlIG5lZWQgdG8gZG8gdGhpcyBwb3N0IGluc3RhbGxhdGlvbi4gUGxlYXNlIG5vdGUgdGhhdCB0aGVcbiAgICAvLyBtaWdyYXRpb24gQ09VTEQgZmFpbCBhbmQgbGVhdmUgc2lkZSBlZmZlY3RzIG9uIGRpc2suXG4gICAgLy8gUnVuIHRoZSBzY2hlbWF0aWNzIHRhc2sgb2YgdGhvc2UgcGFja2FnZXMuXG4gICAgdG9JbnN0YWxsLmZvckVhY2goKFtuYW1lLCB0YXJnZXQsIGluc3RhbGxlZF0pID0+IHtcbiAgICAgIGlmICghdGFyZ2V0LnVwZGF0ZU1ldGFkYXRhLm1pZ3JhdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBleHRlcm5hbE1pZ3JhdGlvbnMucHVzaCh7XG4gICAgICAgIHBhY2thZ2U6IG5hbWUsXG4gICAgICAgIGNvbGxlY3Rpb246IHRhcmdldC51cGRhdGVNZXRhZGF0YS5taWdyYXRpb25zLFxuICAgICAgICBmcm9tOiBpbnN0YWxsZWQudmVyc2lvbixcbiAgICAgICAgdG86IHRhcmdldC52ZXJzaW9uLFxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9KTtcblxuICAgIGlmIChleHRlcm5hbE1pZ3JhdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgIChnbG9iYWwgYXMgYW55KS5leHRlcm5hbE1pZ3JhdGlvbnMgPSBleHRlcm5hbE1pZ3JhdGlvbnM7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIF9nZXRVcGRhdGVNZXRhZGF0YShcbiAgcGFja2FnZUpzb246IEpzb25TY2hlbWFGb3JOcG1QYWNrYWdlSnNvbkZpbGVzLFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuKTogVXBkYXRlTWV0YWRhdGEge1xuICBjb25zdCBtZXRhZGF0YSA9IHBhY2thZ2VKc29uWyduZy11cGRhdGUnXTtcblxuICBjb25zdCByZXN1bHQ6IFVwZGF0ZU1ldGFkYXRhID0ge1xuICAgIHBhY2thZ2VHcm91cDoge30sXG4gICAgcmVxdWlyZW1lbnRzOiB7fSxcbiAgfTtcblxuICBpZiAoIW1ldGFkYXRhIHx8IHR5cGVvZiBtZXRhZGF0YSAhPSAnb2JqZWN0JyB8fCBBcnJheS5pc0FycmF5KG1ldGFkYXRhKSkge1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBpZiAobWV0YWRhdGFbJ3BhY2thZ2VHcm91cCddKSB7XG4gICAgY29uc3QgcGFja2FnZUdyb3VwID0gbWV0YWRhdGFbJ3BhY2thZ2VHcm91cCddO1xuICAgIC8vIFZlcmlmeSB0aGF0IHBhY2thZ2VHcm91cCBpcyBhbiBhcnJheSBvZiBzdHJpbmdzIG9yIGFuIG1hcCBvZiB2ZXJzaW9ucy4gVGhpcyBpcyBub3QgYW4gZXJyb3JcbiAgICAvLyBidXQgd2Ugc3RpbGwgd2FybiB0aGUgdXNlciBhbmQgaWdub3JlIHRoZSBwYWNrYWdlR3JvdXAga2V5cy5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShwYWNrYWdlR3JvdXApICYmIHBhY2thZ2VHcm91cC5ldmVyeSgoeCkgPT4gdHlwZW9mIHggPT0gJ3N0cmluZycpKSB7XG4gICAgICByZXN1bHQucGFja2FnZUdyb3VwID0gcGFja2FnZUdyb3VwLnJlZHVjZSgoZ3JvdXAsIG5hbWUpID0+IHtcbiAgICAgICAgZ3JvdXBbbmFtZV0gPSBwYWNrYWdlSnNvbi52ZXJzaW9uO1xuXG4gICAgICAgIHJldHVybiBncm91cDtcbiAgICAgIH0sIHJlc3VsdC5wYWNrYWdlR3JvdXApO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICB0eXBlb2YgcGFja2FnZUdyb3VwID09ICdvYmplY3QnICYmXG4gICAgICBwYWNrYWdlR3JvdXAgJiZcbiAgICAgIE9iamVjdC52YWx1ZXMocGFja2FnZUdyb3VwKS5ldmVyeSgoeCkgPT4gdHlwZW9mIHggPT0gJ3N0cmluZycpXG4gICAgKSB7XG4gICAgICByZXN1bHQucGFja2FnZUdyb3VwID0gcGFja2FnZUdyb3VwO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIud2FybihgcGFja2FnZUdyb3VwIG1ldGFkYXRhIG9mIHBhY2thZ2UgJHtwYWNrYWdlSnNvbi5uYW1lfSBpcyBtYWxmb3JtZWQuIElnbm9yaW5nLmApO1xuICAgIH1cblxuICAgIHJlc3VsdC5wYWNrYWdlR3JvdXBOYW1lID0gT2JqZWN0LmtleXMocmVzdWx0LnBhY2thZ2VHcm91cClbMF07XG4gIH1cblxuICBpZiAodHlwZW9mIG1ldGFkYXRhWydwYWNrYWdlR3JvdXBOYW1lJ10gPT0gJ3N0cmluZycpIHtcbiAgICByZXN1bHQucGFja2FnZUdyb3VwTmFtZSA9IG1ldGFkYXRhWydwYWNrYWdlR3JvdXBOYW1lJ107XG4gIH1cblxuICBpZiAobWV0YWRhdGFbJ3JlcXVpcmVtZW50cyddKSB7XG4gICAgY29uc3QgcmVxdWlyZW1lbnRzID0gbWV0YWRhdGFbJ3JlcXVpcmVtZW50cyddO1xuICAgIC8vIFZlcmlmeSB0aGF0IHJlcXVpcmVtZW50cyBhcmVcbiAgICBpZiAoXG4gICAgICB0eXBlb2YgcmVxdWlyZW1lbnRzICE9ICdvYmplY3QnIHx8XG4gICAgICBBcnJheS5pc0FycmF5KHJlcXVpcmVtZW50cykgfHxcbiAgICAgIE9iamVjdC5rZXlzKHJlcXVpcmVtZW50cykuc29tZSgobmFtZSkgPT4gdHlwZW9mIHJlcXVpcmVtZW50c1tuYW1lXSAhPSAnc3RyaW5nJylcbiAgICApIHtcbiAgICAgIGxvZ2dlci53YXJuKGByZXF1aXJlbWVudHMgbWV0YWRhdGEgb2YgcGFja2FnZSAke3BhY2thZ2VKc29uLm5hbWV9IGlzIG1hbGZvcm1lZC4gSWdub3JpbmcuYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5yZXF1aXJlbWVudHMgPSByZXF1aXJlbWVudHM7XG4gICAgfVxuICB9XG5cbiAgaWYgKG1ldGFkYXRhWydtaWdyYXRpb25zJ10pIHtcbiAgICBjb25zdCBtaWdyYXRpb25zID0gbWV0YWRhdGFbJ21pZ3JhdGlvbnMnXTtcbiAgICBpZiAodHlwZW9mIG1pZ3JhdGlvbnMgIT0gJ3N0cmluZycpIHtcbiAgICAgIGxvZ2dlci53YXJuKGBtaWdyYXRpb25zIG1ldGFkYXRhIG9mIHBhY2thZ2UgJHtwYWNrYWdlSnNvbi5uYW1lfSBpcyBtYWxmb3JtZWQuIElnbm9yaW5nLmApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQubWlncmF0aW9ucyA9IG1pZ3JhdGlvbnM7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gX3VzYWdlTWVzc2FnZShcbiAgb3B0aW9uczogVXBkYXRlU2NoZW1hLFxuICBpbmZvTWFwOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz4sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pIHtcbiAgY29uc3QgcGFja2FnZUdyb3VwcyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IHBhY2thZ2VzVG9VcGRhdGUgPSBbLi4uaW5mb01hcC5lbnRyaWVzKCldXG4gICAgLm1hcCgoW25hbWUsIGluZm9dKSA9PiB7XG4gICAgICBsZXQgdGFnID0gb3B0aW9ucy5uZXh0XG4gICAgICAgID8gaW5mby5ucG1QYWNrYWdlSnNvblsnZGlzdC10YWdzJ11bJ25leHQnXVxuICAgICAgICAgID8gJ25leHQnXG4gICAgICAgICAgOiAnbGF0ZXN0J1xuICAgICAgICA6ICdsYXRlc3QnO1xuICAgICAgbGV0IHZlcnNpb24gPSBpbmZvLm5wbVBhY2thZ2VKc29uWydkaXN0LXRhZ3MnXVt0YWddO1xuICAgICAgbGV0IHRhcmdldCA9IGluZm8ubnBtUGFja2FnZUpzb24udmVyc2lvbnNbdmVyc2lvbl07XG5cbiAgICAgIGNvbnN0IHZlcnNpb25EaWZmID0gc2VtdmVyLmRpZmYoaW5mby5pbnN0YWxsZWQudmVyc2lvbiwgdmVyc2lvbik7XG4gICAgICBpZiAoXG4gICAgICAgIHZlcnNpb25EaWZmICE9PSAncGF0Y2gnICYmXG4gICAgICAgIHZlcnNpb25EaWZmICE9PSAnbWlub3InICYmXG4gICAgICAgIC9eQCg/OmFuZ3VsYXJ8bmd1bml2ZXJzYWwpXFwvLy50ZXN0KG5hbWUpXG4gICAgICApIHtcbiAgICAgICAgY29uc3QgaW5zdGFsbGVkTWFqb3JWZXJzaW9uID0gc2VtdmVyLnBhcnNlKGluZm8uaW5zdGFsbGVkLnZlcnNpb24pPy5tYWpvcjtcbiAgICAgICAgY29uc3QgdG9JbnN0YWxsTWFqb3JWZXJzaW9uID0gc2VtdmVyLnBhcnNlKHZlcnNpb24pPy5tYWpvcjtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGluc3RhbGxlZE1ham9yVmVyc2lvbiAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgdG9JbnN0YWxsTWFqb3JWZXJzaW9uICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICBpbnN0YWxsZWRNYWpvclZlcnNpb24gPCB0b0luc3RhbGxNYWpvclZlcnNpb24gLSAxXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnN0IG5leHRNYWpvclZlcnNpb24gPSBgJHtpbnN0YWxsZWRNYWpvclZlcnNpb24gKyAxfS5gO1xuICAgICAgICAgIGNvbnN0IG5leHRNYWpvclZlcnNpb25zID0gT2JqZWN0LmtleXMoaW5mby5ucG1QYWNrYWdlSnNvbi52ZXJzaW9ucylcbiAgICAgICAgICAgIC5maWx0ZXIoKHYpID0+IHYuc3RhcnRzV2l0aChuZXh0TWFqb3JWZXJzaW9uKSlcbiAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiAoYSA+IGIgPyAtMSA6IDEpKTtcblxuICAgICAgICAgIGlmIChuZXh0TWFqb3JWZXJzaW9ucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHZlcnNpb24gPSBuZXh0TWFqb3JWZXJzaW9uc1swXTtcbiAgICAgICAgICAgIHRhcmdldCA9IGluZm8ubnBtUGFja2FnZUpzb24udmVyc2lvbnNbdmVyc2lvbl07XG4gICAgICAgICAgICB0YWcgPSAnJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgaW5mbyxcbiAgICAgICAgdmVyc2lvbixcbiAgICAgICAgdGFnLFxuICAgICAgICB0YXJnZXQsXG4gICAgICB9O1xuICAgIH0pXG4gICAgLmZpbHRlcihcbiAgICAgICh7IGluZm8sIHZlcnNpb24sIHRhcmdldCB9KSA9PlxuICAgICAgICB0YXJnZXQ/LlsnbmctdXBkYXRlJ10gJiYgc2VtdmVyLmNvbXBhcmUoaW5mby5pbnN0YWxsZWQudmVyc2lvbiwgdmVyc2lvbikgPCAwLFxuICAgIClcbiAgICAubWFwKCh7IG5hbWUsIGluZm8sIHZlcnNpb24sIHRhZywgdGFyZ2V0IH0pID0+IHtcbiAgICAgIC8vIExvb2sgZm9yIHBhY2thZ2VHcm91cC5cbiAgICAgIGNvbnN0IHBhY2thZ2VHcm91cCA9IHRhcmdldFsnbmctdXBkYXRlJ11bJ3BhY2thZ2VHcm91cCddO1xuICAgICAgaWYgKHBhY2thZ2VHcm91cCkge1xuICAgICAgICBjb25zdCBwYWNrYWdlR3JvdXBOYW1lID0gdGFyZ2V0WyduZy11cGRhdGUnXVsncGFja2FnZUdyb3VwTmFtZSddIHx8IHBhY2thZ2VHcm91cFswXTtcbiAgICAgICAgaWYgKHBhY2thZ2VHcm91cE5hbWUpIHtcbiAgICAgICAgICBpZiAocGFja2FnZUdyb3Vwcy5oYXMobmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHBhY2thZ2VHcm91cC5mb3JFYWNoKCh4OiBzdHJpbmcpID0+IHBhY2thZ2VHcm91cHMuc2V0KHgsIHBhY2thZ2VHcm91cE5hbWUpKTtcbiAgICAgICAgICBwYWNrYWdlR3JvdXBzLnNldChwYWNrYWdlR3JvdXBOYW1lLCBwYWNrYWdlR3JvdXBOYW1lKTtcbiAgICAgICAgICBuYW1lID0gcGFja2FnZUdyb3VwTmFtZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBsZXQgY29tbWFuZCA9IGBuZyB1cGRhdGUgJHtuYW1lfWA7XG4gICAgICBpZiAoIXRhZykge1xuICAgICAgICBjb21tYW5kICs9IGBAJHtzZW12ZXIucGFyc2UodmVyc2lvbik/Lm1ham9yIHx8IHZlcnNpb259YDtcbiAgICAgIH0gZWxzZSBpZiAodGFnID09ICduZXh0Jykge1xuICAgICAgICBjb21tYW5kICs9ICcgLS1uZXh0JztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIFtuYW1lLCBgJHtpbmZvLmluc3RhbGxlZC52ZXJzaW9ufSAtPiAke3ZlcnNpb259IGAsIGNvbW1hbmRdO1xuICAgIH0pXG4gICAgLmZpbHRlcigoeCkgPT4geCAhPT0gbnVsbClcbiAgICAuc29ydCgoYSwgYikgPT4gKGEgJiYgYiA/IGFbMF0ubG9jYWxlQ29tcGFyZShiWzBdKSA6IDApKTtcblxuICBpZiAocGFja2FnZXNUb1VwZGF0ZS5sZW5ndGggPT0gMCkge1xuICAgIGxvZ2dlci5pbmZvKCdXZSBhbmFseXplZCB5b3VyIHBhY2thZ2UuanNvbiBhbmQgZXZlcnl0aGluZyBzZWVtcyB0byBiZSBpbiBvcmRlci4gR29vZCB3b3JrIScpO1xuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbG9nZ2VyLmluZm8oJ1dlIGFuYWx5emVkIHlvdXIgcGFja2FnZS5qc29uLCB0aGVyZSBhcmUgc29tZSBwYWNrYWdlcyB0byB1cGRhdGU6XFxuJyk7XG5cbiAgLy8gRmluZCB0aGUgbGFyZ2VzdCBuYW1lIHRvIGtub3cgdGhlIHBhZGRpbmcgbmVlZGVkLlxuICBsZXQgbmFtZVBhZCA9IE1hdGgubWF4KC4uLlsuLi5pbmZvTWFwLmtleXMoKV0ubWFwKCh4KSA9PiB4Lmxlbmd0aCkpICsgMjtcbiAgaWYgKCFOdW1iZXIuaXNGaW5pdGUobmFtZVBhZCkpIHtcbiAgICBuYW1lUGFkID0gMzA7XG4gIH1cbiAgY29uc3QgcGFkcyA9IFtuYW1lUGFkLCAyNSwgMF07XG5cbiAgbG9nZ2VyLmluZm8oXG4gICAgJyAgJyArIFsnTmFtZScsICdWZXJzaW9uJywgJ0NvbW1hbmQgdG8gdXBkYXRlJ10ubWFwKCh4LCBpKSA9PiB4LnBhZEVuZChwYWRzW2ldKSkuam9pbignJyksXG4gICk7XG4gIGxvZ2dlci5pbmZvKCcgJyArICctJy5yZXBlYXQocGFkcy5yZWR1Y2UoKHMsIHgpID0+IChzICs9IHgpLCAwKSArIDIwKSk7XG5cbiAgcGFja2FnZXNUb1VwZGF0ZS5mb3JFYWNoKChmaWVsZHMpID0+IHtcbiAgICBpZiAoIWZpZWxkcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxvZ2dlci5pbmZvKCcgICcgKyBmaWVsZHMubWFwKCh4LCBpKSA9PiB4LnBhZEVuZChwYWRzW2ldKSkuam9pbignJykpO1xuICB9KTtcblxuICBsb2dnZXIuaW5mbyhcbiAgICBgXFxuVGhlcmUgbWlnaHQgYmUgYWRkaXRpb25hbCBwYWNrYWdlcyB3aGljaCBkb24ndCBwcm92aWRlICduZyB1cGRhdGUnIGNhcGFiaWxpdGllcyB0aGF0IGFyZSBvdXRkYXRlZC5cXG5gICtcbiAgICAgIGBZb3UgY2FuIHVwZGF0ZSB0aGUgYWRkaXRpb25hbCBwYWNrYWdlcyBieSBydW5uaW5nIHRoZSB1cGRhdGUgY29tbWFuZCBvZiB5b3VyIHBhY2thZ2UgbWFuYWdlci5gLFxuICApO1xuXG4gIHJldHVybjtcbn1cblxuZnVuY3Rpb24gX2J1aWxkUGFja2FnZUluZm8oXG4gIHRyZWU6IFRyZWUsXG4gIHBhY2thZ2VzOiBNYXA8c3RyaW5nLCBWZXJzaW9uUmFuZ2U+LFxuICBhbGxEZXBlbmRlbmNpZXM6IFJlYWRvbmx5TWFwPHN0cmluZywgVmVyc2lvblJhbmdlPixcbiAgbnBtUGFja2FnZUpzb246IE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbik6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QgbmFtZSA9IG5wbVBhY2thZ2VKc29uLm5hbWU7XG4gIGNvbnN0IHBhY2thZ2VKc29uUmFuZ2UgPSBhbGxEZXBlbmRlbmNpZXMuZ2V0KG5hbWUpO1xuICBpZiAoIXBhY2thZ2VKc29uUmFuZ2UpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgUGFja2FnZSAke0pTT04uc3RyaW5naWZ5KG5hbWUpfSB3YXMgbm90IGZvdW5kIGluIHBhY2thZ2UuanNvbi5gKTtcbiAgfVxuXG4gIC8vIEZpbmQgb3V0IHRoZSBjdXJyZW50bHkgaW5zdGFsbGVkIHZlcnNpb24uIEVpdGhlciBmcm9tIHRoZSBwYWNrYWdlLmpzb24gb3IgdGhlIG5vZGVfbW9kdWxlcy9cbiAgLy8gVE9ETzogZmlndXJlIG91dCBhIHdheSB0byByZWFkIHBhY2thZ2UtbG9jay5qc29uIGFuZC9vciB5YXJuLmxvY2suXG4gIGxldCBpbnN0YWxsZWRWZXJzaW9uOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsO1xuICBjb25zdCBwYWNrYWdlQ29udGVudCA9IHRyZWUucmVhZChgL25vZGVfbW9kdWxlcy8ke25hbWV9L3BhY2thZ2UuanNvbmApO1xuICBpZiAocGFja2FnZUNvbnRlbnQpIHtcbiAgICBjb25zdCBjb250ZW50ID0gSlNPTi5wYXJzZShwYWNrYWdlQ29udGVudC50b1N0cmluZygpKSBhcyBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcztcbiAgICBpbnN0YWxsZWRWZXJzaW9uID0gY29udGVudC52ZXJzaW9uO1xuICB9XG4gIGlmICghaW5zdGFsbGVkVmVyc2lvbikge1xuICAgIC8vIEZpbmQgdGhlIHZlcnNpb24gZnJvbSBOUE0gdGhhdCBmaXRzIHRoZSByYW5nZSB0byBtYXguXG4gICAgaW5zdGFsbGVkVmVyc2lvbiA9IHNlbXZlci5tYXhTYXRpc2Z5aW5nKE9iamVjdC5rZXlzKG5wbVBhY2thZ2VKc29uLnZlcnNpb25zKSwgcGFja2FnZUpzb25SYW5nZSk7XG4gIH1cblxuICBpZiAoIWluc3RhbGxlZFZlcnNpb24pIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihcbiAgICAgIGBBbiB1bmV4cGVjdGVkIGVycm9yIGhhcHBlbmVkOyBjb3VsZCBub3QgZGV0ZXJtaW5lIHZlcnNpb24gZm9yIHBhY2thZ2UgJHtuYW1lfS5gLFxuICAgICk7XG4gIH1cblxuICBjb25zdCBpbnN0YWxsZWRQYWNrYWdlSnNvbiA9IG5wbVBhY2thZ2VKc29uLnZlcnNpb25zW2luc3RhbGxlZFZlcnNpb25dIHx8IHBhY2thZ2VDb250ZW50O1xuICBpZiAoIWluc3RhbGxlZFBhY2thZ2VKc29uKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oXG4gICAgICBgQW4gdW5leHBlY3RlZCBlcnJvciBoYXBwZW5lZDsgcGFja2FnZSAke25hbWV9IGhhcyBubyB2ZXJzaW9uICR7aW5zdGFsbGVkVmVyc2lvbn0uYCxcbiAgICApO1xuICB9XG5cbiAgbGV0IHRhcmdldFZlcnNpb246IFZlcnNpb25SYW5nZSB8IHVuZGVmaW5lZCA9IHBhY2thZ2VzLmdldChuYW1lKTtcbiAgaWYgKHRhcmdldFZlcnNpb24pIHtcbiAgICBpZiAobnBtUGFja2FnZUpzb25bJ2Rpc3QtdGFncyddW3RhcmdldFZlcnNpb25dKSB7XG4gICAgICB0YXJnZXRWZXJzaW9uID0gbnBtUGFja2FnZUpzb25bJ2Rpc3QtdGFncyddW3RhcmdldFZlcnNpb25dIGFzIFZlcnNpb25SYW5nZTtcbiAgICB9IGVsc2UgaWYgKHRhcmdldFZlcnNpb24gPT0gJ25leHQnKSB7XG4gICAgICB0YXJnZXRWZXJzaW9uID0gbnBtUGFja2FnZUpzb25bJ2Rpc3QtdGFncyddWydsYXRlc3QnXSBhcyBWZXJzaW9uUmFuZ2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFZlcnNpb24gPSBzZW12ZXIubWF4U2F0aXNmeWluZyhcbiAgICAgICAgT2JqZWN0LmtleXMobnBtUGFja2FnZUpzb24udmVyc2lvbnMpLFxuICAgICAgICB0YXJnZXRWZXJzaW9uLFxuICAgICAgKSBhcyBWZXJzaW9uUmFuZ2U7XG4gICAgfVxuICB9XG5cbiAgaWYgKHRhcmdldFZlcnNpb24gJiYgc2VtdmVyLmx0ZSh0YXJnZXRWZXJzaW9uLCBpbnN0YWxsZWRWZXJzaW9uKSkge1xuICAgIGxvZ2dlci5kZWJ1ZyhgUGFja2FnZSAke25hbWV9IGFscmVhZHkgc2F0aXNmaWVkIGJ5IHBhY2thZ2UuanNvbiAoJHtwYWNrYWdlSnNvblJhbmdlfSkuYCk7XG4gICAgdGFyZ2V0VmVyc2lvbiA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNvbnN0IHRhcmdldDogUGFja2FnZVZlcnNpb25JbmZvIHwgdW5kZWZpbmVkID0gdGFyZ2V0VmVyc2lvblxuICAgID8ge1xuICAgICAgICB2ZXJzaW9uOiB0YXJnZXRWZXJzaW9uLFxuICAgICAgICBwYWNrYWdlSnNvbjogbnBtUGFja2FnZUpzb24udmVyc2lvbnNbdGFyZ2V0VmVyc2lvbl0sXG4gICAgICAgIHVwZGF0ZU1ldGFkYXRhOiBfZ2V0VXBkYXRlTWV0YWRhdGEobnBtUGFja2FnZUpzb24udmVyc2lvbnNbdGFyZ2V0VmVyc2lvbl0sIGxvZ2dlciksXG4gICAgICB9XG4gICAgOiB1bmRlZmluZWQ7XG5cbiAgLy8gQ2hlY2sgaWYgdGhlcmUncyBhbiBpbnN0YWxsZWQgdmVyc2lvbi5cbiAgcmV0dXJuIHtcbiAgICBuYW1lLFxuICAgIG5wbVBhY2thZ2VKc29uLFxuICAgIGluc3RhbGxlZDoge1xuICAgICAgdmVyc2lvbjogaW5zdGFsbGVkVmVyc2lvbiBhcyBWZXJzaW9uUmFuZ2UsXG4gICAgICBwYWNrYWdlSnNvbjogaW5zdGFsbGVkUGFja2FnZUpzb24sXG4gICAgICB1cGRhdGVNZXRhZGF0YTogX2dldFVwZGF0ZU1ldGFkYXRhKGluc3RhbGxlZFBhY2thZ2VKc29uLCBsb2dnZXIpLFxuICAgIH0sXG4gICAgdGFyZ2V0LFxuICAgIHBhY2thZ2VKc29uUmFuZ2UsXG4gIH07XG59XG5cbmZ1bmN0aW9uIF9idWlsZFBhY2thZ2VMaXN0KFxuICBvcHRpb25zOiBVcGRhdGVTY2hlbWEsXG4gIHByb2plY3REZXBzOiBNYXA8c3RyaW5nLCBWZXJzaW9uUmFuZ2U+LFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuKTogTWFwPHN0cmluZywgVmVyc2lvblJhbmdlPiB7XG4gIC8vIFBhcnNlIHRoZSBwYWNrYWdlcyBvcHRpb25zIHRvIHNldCB0aGUgdGFyZ2V0ZWQgdmVyc2lvbi5cbiAgY29uc3QgcGFja2FnZXMgPSBuZXcgTWFwPHN0cmluZywgVmVyc2lvblJhbmdlPigpO1xuICBjb25zdCBjb21tYW5kTGluZVBhY2thZ2VzID1cbiAgICBvcHRpb25zLnBhY2thZ2VzICYmIG9wdGlvbnMucGFja2FnZXMubGVuZ3RoID4gMCA/IG9wdGlvbnMucGFja2FnZXMgOiBbXTtcblxuICBmb3IgKGNvbnN0IHBrZyBvZiBjb21tYW5kTGluZVBhY2thZ2VzKSB7XG4gICAgLy8gU3BsaXQgdGhlIHZlcnNpb24gYXNrZWQgb24gY29tbWFuZCBsaW5lLlxuICAgIGNvbnN0IG0gPSBwa2cubWF0Y2goL14oKD86QFteL117MSwxMDB9XFwvKT9bXkBdezEsMTAwfSkoPzpAKC57MSwxMDB9KSk/JC8pO1xuICAgIGlmICghbSkge1xuICAgICAgbG9nZ2VyLndhcm4oYEludmFsaWQgcGFja2FnZSBhcmd1bWVudDogJHtKU09OLnN0cmluZ2lmeShwa2cpfS4gU2tpcHBpbmcuYCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBbLCBucG1OYW1lLCBtYXliZVZlcnNpb25dID0gbTtcblxuICAgIGNvbnN0IHZlcnNpb24gPSBwcm9qZWN0RGVwcy5nZXQobnBtTmFtZSk7XG4gICAgaWYgKCF2ZXJzaW9uKSB7XG4gICAgICBsb2dnZXIud2FybihgUGFja2FnZSBub3QgaW5zdGFsbGVkOiAke0pTT04uc3RyaW5naWZ5KG5wbU5hbWUpfS4gU2tpcHBpbmcuYCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBwYWNrYWdlcy5zZXQobnBtTmFtZSwgKG1heWJlVmVyc2lvbiB8fCAob3B0aW9ucy5uZXh0ID8gJ25leHQnIDogJ2xhdGVzdCcpKSBhcyBWZXJzaW9uUmFuZ2UpO1xuICB9XG5cbiAgcmV0dXJuIHBhY2thZ2VzO1xufVxuXG5mdW5jdGlvbiBfYWRkUGFja2FnZUdyb3VwKFxuICB0cmVlOiBUcmVlLFxuICBwYWNrYWdlczogTWFwPHN0cmluZywgVmVyc2lvblJhbmdlPixcbiAgYWxsRGVwZW5kZW5jaWVzOiBSZWFkb25seU1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4sXG4gIG5wbVBhY2thZ2VKc29uOiBOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pOiB2b2lkIHtcbiAgY29uc3QgbWF5YmVQYWNrYWdlID0gcGFja2FnZXMuZ2V0KG5wbVBhY2thZ2VKc29uLm5hbWUpO1xuICBpZiAoIW1heWJlUGFja2FnZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGluZm8gPSBfYnVpbGRQYWNrYWdlSW5mbyh0cmVlLCBwYWNrYWdlcywgYWxsRGVwZW5kZW5jaWVzLCBucG1QYWNrYWdlSnNvbiwgbG9nZ2VyKTtcblxuICBjb25zdCB2ZXJzaW9uID1cbiAgICAoaW5mby50YXJnZXQgJiYgaW5mby50YXJnZXQudmVyc2lvbikgfHxcbiAgICBucG1QYWNrYWdlSnNvblsnZGlzdC10YWdzJ11bbWF5YmVQYWNrYWdlXSB8fFxuICAgIG1heWJlUGFja2FnZTtcbiAgaWYgKCFucG1QYWNrYWdlSnNvbi52ZXJzaW9uc1t2ZXJzaW9uXSkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBuZ1VwZGF0ZU1ldGFkYXRhID0gbnBtUGFja2FnZUpzb24udmVyc2lvbnNbdmVyc2lvbl1bJ25nLXVwZGF0ZSddO1xuICBpZiAoIW5nVXBkYXRlTWV0YWRhdGEpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBsZXQgcGFja2FnZUdyb3VwID0gbmdVcGRhdGVNZXRhZGF0YVsncGFja2FnZUdyb3VwJ107XG4gIGlmICghcGFja2FnZUdyb3VwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChBcnJheS5pc0FycmF5KHBhY2thZ2VHcm91cCkgJiYgIXBhY2thZ2VHcm91cC5zb21lKCh4KSA9PiB0eXBlb2YgeCAhPSAnc3RyaW5nJykpIHtcbiAgICBwYWNrYWdlR3JvdXAgPSBwYWNrYWdlR3JvdXAucmVkdWNlKChhY2MsIGN1cnIpID0+IHtcbiAgICAgIGFjY1tjdXJyXSA9IG1heWJlUGFja2FnZTtcblxuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCB7fSBhcyB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfSk7XG4gIH1cblxuICAvLyBPbmx5IG5lZWQgdG8gY2hlY2sgaWYgaXQncyBhbiBvYmplY3QgYmVjYXVzZSB3ZSBzZXQgaXQgcmlnaHQgdGhlIHRpbWUgYmVmb3JlLlxuICBpZiAoXG4gICAgdHlwZW9mIHBhY2thZ2VHcm91cCAhPSAnb2JqZWN0JyB8fFxuICAgIHBhY2thZ2VHcm91cCA9PT0gbnVsbCB8fFxuICAgIE9iamVjdC52YWx1ZXMocGFja2FnZUdyb3VwKS5zb21lKCh2KSA9PiB0eXBlb2YgdiAhPSAnc3RyaW5nJylcbiAgKSB7XG4gICAgbG9nZ2VyLndhcm4oYHBhY2thZ2VHcm91cCBtZXRhZGF0YSBvZiBwYWNrYWdlICR7bnBtUGFja2FnZUpzb24ubmFtZX0gaXMgbWFsZm9ybWVkLmApO1xuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgT2JqZWN0LmtleXMocGFja2FnZUdyb3VwKVxuICAgIC5maWx0ZXIoKG5hbWUpID0+ICFwYWNrYWdlcy5oYXMobmFtZSkpIC8vIERvbid0IG92ZXJyaWRlIG5hbWVzIGZyb20gdGhlIGNvbW1hbmQgbGluZS5cbiAgICAuZmlsdGVyKChuYW1lKSA9PiBhbGxEZXBlbmRlbmNpZXMuaGFzKG5hbWUpKSAvLyBSZW1vdmUgcGFja2FnZXMgdGhhdCBhcmVuJ3QgaW5zdGFsbGVkLlxuICAgIC5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgICBwYWNrYWdlcy5zZXQobmFtZSwgcGFja2FnZUdyb3VwW25hbWVdKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBBZGQgcGVlciBkZXBlbmRlbmNpZXMgb2YgcGFja2FnZXMgb24gdGhlIGNvbW1hbmQgbGluZSB0byB0aGUgbGlzdCBvZiBwYWNrYWdlcyB0byB1cGRhdGUuXG4gKiBXZSBkb24ndCBkbyB2ZXJpZmljYXRpb24gb2YgdGhlIHZlcnNpb25zIGhlcmUgYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgYSBsYXRlciBzdGVwIChhbmQgY2FuXG4gKiBiZSBpZ25vcmVkIGJ5IHRoZSAtLWZvcmNlIGZsYWcpLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2FkZFBlZXJEZXBlbmRlbmNpZXMoXG4gIHRyZWU6IFRyZWUsXG4gIHBhY2thZ2VzOiBNYXA8c3RyaW5nLCBWZXJzaW9uUmFuZ2U+LFxuICBhbGxEZXBlbmRlbmNpZXM6IFJlYWRvbmx5TWFwPHN0cmluZywgVmVyc2lvblJhbmdlPixcbiAgbnBtUGFja2FnZUpzb246IE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbixcbiAgbnBtUGFja2FnZUpzb25NYXA6IE1hcDxzdHJpbmcsIE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbj4sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pOiB2b2lkIHtcbiAgY29uc3QgbWF5YmVQYWNrYWdlID0gcGFja2FnZXMuZ2V0KG5wbVBhY2thZ2VKc29uLm5hbWUpO1xuICBpZiAoIW1heWJlUGFja2FnZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGluZm8gPSBfYnVpbGRQYWNrYWdlSW5mbyh0cmVlLCBwYWNrYWdlcywgYWxsRGVwZW5kZW5jaWVzLCBucG1QYWNrYWdlSnNvbiwgbG9nZ2VyKTtcblxuICBjb25zdCB2ZXJzaW9uID1cbiAgICAoaW5mby50YXJnZXQgJiYgaW5mby50YXJnZXQudmVyc2lvbikgfHxcbiAgICBucG1QYWNrYWdlSnNvblsnZGlzdC10YWdzJ11bbWF5YmVQYWNrYWdlXSB8fFxuICAgIG1heWJlUGFja2FnZTtcbiAgaWYgKCFucG1QYWNrYWdlSnNvbi52ZXJzaW9uc1t2ZXJzaW9uXSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHBhY2thZ2VKc29uID0gbnBtUGFja2FnZUpzb24udmVyc2lvbnNbdmVyc2lvbl07XG4gIGNvbnN0IGVycm9yID0gZmFsc2U7XG5cbiAgZm9yIChjb25zdCBbcGVlciwgcmFuZ2VdIG9mIE9iamVjdC5lbnRyaWVzKHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXMgfHwge30pKSB7XG4gICAgaWYgKHBhY2thZ2VzLmhhcyhwZWVyKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgcGVlclBhY2thZ2VKc29uID0gbnBtUGFja2FnZUpzb25NYXAuZ2V0KHBlZXIpO1xuICAgIGlmIChwZWVyUGFja2FnZUpzb24pIHtcbiAgICAgIGNvbnN0IHBlZXJJbmZvID0gX2J1aWxkUGFja2FnZUluZm8odHJlZSwgcGFja2FnZXMsIGFsbERlcGVuZGVuY2llcywgcGVlclBhY2thZ2VKc29uLCBsb2dnZXIpO1xuICAgICAgaWYgKHNlbXZlci5zYXRpc2ZpZXMocGVlckluZm8uaW5zdGFsbGVkLnZlcnNpb24sIHJhbmdlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBwYWNrYWdlcy5zZXQocGVlciwgcmFuZ2UgYXMgVmVyc2lvblJhbmdlKTtcbiAgfVxuXG4gIGlmIChlcnJvcikge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdBbiBlcnJvciBvY2N1cmVkLCBzZWUgYWJvdmUuJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2dldEFsbERlcGVuZGVuY2llcyh0cmVlOiBUcmVlKTogQXJyYXk8cmVhZG9ubHkgW3N0cmluZywgVmVyc2lvblJhbmdlXT4ge1xuICBjb25zdCBwYWNrYWdlSnNvbkNvbnRlbnQgPSB0cmVlLnJlYWQoJy9wYWNrYWdlLmpzb24nKTtcbiAgaWYgKCFwYWNrYWdlSnNvbkNvbnRlbnQpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IGZpbmQgYSBwYWNrYWdlLmpzb24uIEFyZSB5b3UgaW4gYSBOb2RlIHByb2plY3Q/Jyk7XG4gIH1cblxuICBsZXQgcGFja2FnZUpzb246IEpzb25TY2hlbWFGb3JOcG1QYWNrYWdlSnNvbkZpbGVzO1xuICB0cnkge1xuICAgIHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShwYWNrYWdlSnNvbkNvbnRlbnQudG9TdHJpbmcoKSkgYXMgSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXM7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbigncGFja2FnZS5qc29uIGNvdWxkIG5vdCBiZSBwYXJzZWQ6ICcgKyBlLm1lc3NhZ2UpO1xuICB9XG5cbiAgcmV0dXJuIFtcbiAgICAuLi4oT2JqZWN0LmVudHJpZXMocGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llcyB8fCB7fSkgYXMgQXJyYXk8W3N0cmluZywgVmVyc2lvblJhbmdlXT4pLFxuICAgIC4uLihPYmplY3QuZW50cmllcyhwYWNrYWdlSnNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge30pIGFzIEFycmF5PFtzdHJpbmcsIFZlcnNpb25SYW5nZV0+KSxcbiAgICAuLi4oT2JqZWN0LmVudHJpZXMocGFja2FnZUpzb24uZGVwZW5kZW5jaWVzIHx8IHt9KSBhcyBBcnJheTxbc3RyaW5nLCBWZXJzaW9uUmFuZ2VdPiksXG4gIF07XG59XG5cbmZ1bmN0aW9uIF9mb3JtYXRWZXJzaW9uKHZlcnNpb246IHN0cmluZyB8IHVuZGVmaW5lZCkge1xuICBpZiAodmVyc2lvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICghdmVyc2lvbi5tYXRjaCgvXlxcZHsxLDMwfVxcLlxcZHsxLDMwfVxcLlxcZHsxLDMwfS8pKSB7XG4gICAgdmVyc2lvbiArPSAnLjAnO1xuICB9XG4gIGlmICghdmVyc2lvbi5tYXRjaCgvXlxcZHsxLDMwfVxcLlxcZHsxLDMwfVxcLlxcZHsxLDMwfS8pKSB7XG4gICAgdmVyc2lvbiArPSAnLjAnO1xuICB9XG4gIGlmICghc2VtdmVyLnZhbGlkKHZlcnNpb24pKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEludmFsaWQgbWlncmF0aW9uIHZlcnNpb246ICR7SlNPTi5zdHJpbmdpZnkodmVyc2lvbil9YCk7XG4gIH1cblxuICByZXR1cm4gdmVyc2lvbjtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBnaXZlbiBwYWNrYWdlIHNwZWNpZmllciAodGhlIHZhbHVlIHN0cmluZyBpbiBhXG4gKiBgcGFja2FnZS5qc29uYCBkZXBlbmRlbmN5KSBpcyBob3N0ZWQgaW4gdGhlIE5QTSByZWdpc3RyeS5cbiAqIEB0aHJvd3MgV2hlbiB0aGUgc3BlY2lmaWVyIGNhbm5vdCBiZSBwYXJzZWQuXG4gKi9cbmZ1bmN0aW9uIGlzUGtnRnJvbVJlZ2lzdHJ5KG5hbWU6IHN0cmluZywgc3BlY2lmaWVyOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcmVzdWx0ID0gbnBhLnJlc29sdmUobmFtZSwgc3BlY2lmaWVyKTtcblxuICByZXR1cm4gISFyZXN1bHQucmVnaXN0cnk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBVcGRhdGVTY2hlbWEpOiBSdWxlIHtcbiAgaWYgKCFvcHRpb25zLnBhY2thZ2VzKSB7XG4gICAgLy8gV2UgY2Fubm90IGp1c3QgcmV0dXJuIHRoaXMgYmVjYXVzZSB3ZSBuZWVkIHRvIGZldGNoIHRoZSBwYWNrYWdlcyBmcm9tIE5QTSBzdGlsbCBmb3IgdGhlXG4gICAgLy8gaGVscC9ndWlkZSB0byBzaG93LlxuICAgIG9wdGlvbnMucGFja2FnZXMgPSBbXTtcbiAgfSBlbHNlIHtcbiAgICAvLyBXZSBzcGxpdCBldmVyeSBwYWNrYWdlcyBieSBjb21tYXMgdG8gYWxsb3cgcGVvcGxlIHRvIHBhc3MgaW4gbXVsdGlwbGUgYW5kIG1ha2UgaXQgYW4gYXJyYXkuXG4gICAgb3B0aW9ucy5wYWNrYWdlcyA9IG9wdGlvbnMucGFja2FnZXMucmVkdWNlKChhY2MsIGN1cnIpID0+IHtcbiAgICAgIHJldHVybiBhY2MuY29uY2F0KGN1cnIuc3BsaXQoJywnKSk7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMubWlncmF0ZU9ubHkgJiYgb3B0aW9ucy5mcm9tKSB7XG4gICAgaWYgKG9wdGlvbnMucGFja2FnZXMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignLS1mcm9tIHJlcXVpcmVzIHRoYXQgb25seSBhIHNpbmdsZSBwYWNrYWdlIGJlIHBhc3NlZC4nKTtcbiAgICB9XG4gIH1cblxuICBvcHRpb25zLmZyb20gPSBfZm9ybWF0VmVyc2lvbihvcHRpb25zLmZyb20pO1xuICBvcHRpb25zLnRvID0gX2Zvcm1hdFZlcnNpb24ob3B0aW9ucy50byk7XG4gIGNvbnN0IHVzaW5nWWFybiA9IG9wdGlvbnMucGFja2FnZU1hbmFnZXIgPT09ICd5YXJuJztcblxuICByZXR1cm4gYXN5bmMgKHRyZWU6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBsb2dnZXIgPSBjb250ZXh0LmxvZ2dlcjtcbiAgICBjb25zdCBucG1EZXBzID0gbmV3IE1hcChcbiAgICAgIF9nZXRBbGxEZXBlbmRlbmNpZXModHJlZSkuZmlsdGVyKChbbmFtZSwgc3BlY2lmaWVyXSkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBpc1BrZ0Zyb21SZWdpc3RyeShuYW1lLCBzcGVjaWZpZXIpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICBsb2dnZXIud2FybihgUGFja2FnZSAke25hbWV9IHdhcyBub3QgZm91bmQgb24gdGhlIHJlZ2lzdHJ5LiBTa2lwcGluZy5gKTtcblxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgKTtcbiAgICBjb25zdCBwYWNrYWdlcyA9IF9idWlsZFBhY2thZ2VMaXN0KG9wdGlvbnMsIG5wbURlcHMsIGxvZ2dlcik7XG5cbiAgICAvLyBHcmFiIGFsbCBwYWNrYWdlLmpzb24gZnJvbSB0aGUgbnBtIHJlcG9zaXRvcnkuIFRoaXMgcmVxdWlyZXMgYSBsb3Qgb2YgSFRUUCBjYWxscyBzbyB3ZVxuICAgIC8vIHRyeSB0byBwYXJhbGxlbGl6ZSBhcyBtYW55IGFzIHBvc3NpYmxlLlxuICAgIGNvbnN0IGFsbFBhY2thZ2VNZXRhZGF0YSA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgQXJyYXkuZnJvbShucG1EZXBzLmtleXMoKSkubWFwKChkZXBOYW1lKSA9PlxuICAgICAgICBnZXROcG1QYWNrYWdlSnNvbihkZXBOYW1lLCBsb2dnZXIsIHtcbiAgICAgICAgICByZWdpc3RyeTogb3B0aW9ucy5yZWdpc3RyeSxcbiAgICAgICAgICB1c2luZ1lhcm4sXG4gICAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgKTtcblxuICAgIC8vIEJ1aWxkIGEgbWFwIG9mIGFsbCBkZXBlbmRlbmNpZXMgYW5kIHRoZWlyIHBhY2thZ2VKc29uLlxuICAgIGNvbnN0IG5wbVBhY2thZ2VKc29uTWFwID0gYWxsUGFja2FnZU1ldGFkYXRhLnJlZHVjZSgoYWNjLCBucG1QYWNrYWdlSnNvbikgPT4ge1xuICAgICAgLy8gSWYgdGhlIHBhY2thZ2Ugd2FzIG5vdCBmb3VuZCBvbiB0aGUgcmVnaXN0cnkuIEl0IGNvdWxkIGJlIHByaXZhdGUsIHNvIHdlIHdpbGwganVzdFxuICAgICAgLy8gaWdub3JlLiBJZiB0aGUgcGFja2FnZSB3YXMgcGFydCBvZiB0aGUgbGlzdCwgd2Ugd2lsbCBlcnJvciBvdXQsIGJ1dCB3aWxsIHNpbXBseSBpZ25vcmVcbiAgICAgIC8vIGlmIGl0J3MgZWl0aGVyIG5vdCByZXF1ZXN0ZWQgKHNvIGp1c3QgcGFydCBvZiBwYWNrYWdlLmpzb24uIHNpbGVudGx5KS5cbiAgICAgIGlmICghbnBtUGFja2FnZUpzb24ubmFtZSkge1xuICAgICAgICBpZiAobnBtUGFja2FnZUpzb24ucmVxdWVzdGVkTmFtZSAmJiBwYWNrYWdlcy5oYXMobnBtUGFja2FnZUpzb24ucmVxdWVzdGVkTmFtZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihcbiAgICAgICAgICAgIGBQYWNrYWdlICR7SlNPTi5zdHJpbmdpZnkobnBtUGFja2FnZUpzb24ucmVxdWVzdGVkTmFtZSl9IHdhcyBub3QgZm91bmQgb24gdGhlIGAgK1xuICAgICAgICAgICAgICAncmVnaXN0cnkuIENhbm5vdCBjb250aW51ZSBhcyB0aGlzIG1heSBiZSBhbiBlcnJvci4nLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIGEgbmFtZSBpcyBwcmVzZW50LCBpdCBpcyBhc3N1bWVkIHRvIGJlIGZ1bGx5IHBvcHVsYXRlZFxuICAgICAgICBhY2Muc2V0KG5wbVBhY2thZ2VKc29uLm5hbWUsIG5wbVBhY2thZ2VKc29uIGFzIE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwgbmV3IE1hcDxzdHJpbmcsIE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbj4oKSk7XG5cbiAgICAvLyBBdWdtZW50IHRoZSBjb21tYW5kIGxpbmUgcGFja2FnZSBsaXN0IHdpdGggcGFja2FnZUdyb3VwcyBhbmQgZm9yd2FyZCBwZWVyIGRlcGVuZGVuY2llcy5cbiAgICAvLyBFYWNoIGFkZGVkIHBhY2thZ2UgbWF5IHVuY292ZXIgbmV3IHBhY2thZ2UgZ3JvdXBzIGFuZCBwZWVyIGRlcGVuZGVuY2llcywgc28gd2UgbXVzdFxuICAgIC8vIHJlcGVhdCB0aGlzIHByb2Nlc3MgdW50aWwgdGhlIHBhY2thZ2UgbGlzdCBzdGFiaWxpemVzLlxuICAgIGxldCBsYXN0UGFja2FnZXNTaXplO1xuICAgIGRvIHtcbiAgICAgIGxhc3RQYWNrYWdlc1NpemUgPSBwYWNrYWdlcy5zaXplO1xuICAgICAgbnBtUGFja2FnZUpzb25NYXAuZm9yRWFjaCgobnBtUGFja2FnZUpzb24pID0+IHtcbiAgICAgICAgX2FkZFBhY2thZ2VHcm91cCh0cmVlLCBwYWNrYWdlcywgbnBtRGVwcywgbnBtUGFja2FnZUpzb24sIGxvZ2dlcik7XG4gICAgICAgIF9hZGRQZWVyRGVwZW5kZW5jaWVzKHRyZWUsIHBhY2thZ2VzLCBucG1EZXBzLCBucG1QYWNrYWdlSnNvbiwgbnBtUGFja2FnZUpzb25NYXAsIGxvZ2dlcik7XG4gICAgICB9KTtcbiAgICB9IHdoaWxlIChwYWNrYWdlcy5zaXplID4gbGFzdFBhY2thZ2VzU2l6ZSk7XG5cbiAgICAvLyBCdWlsZCB0aGUgUGFja2FnZUluZm8gZm9yIGVhY2ggbW9kdWxlLlxuICAgIGNvbnN0IHBhY2thZ2VJbmZvTWFwID0gbmV3IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPigpO1xuICAgIG5wbVBhY2thZ2VKc29uTWFwLmZvckVhY2goKG5wbVBhY2thZ2VKc29uKSA9PiB7XG4gICAgICBwYWNrYWdlSW5mb01hcC5zZXQoXG4gICAgICAgIG5wbVBhY2thZ2VKc29uLm5hbWUsXG4gICAgICAgIF9idWlsZFBhY2thZ2VJbmZvKHRyZWUsIHBhY2thZ2VzLCBucG1EZXBzLCBucG1QYWNrYWdlSnNvbiwgbG9nZ2VyKSxcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICAvLyBOb3cgdGhhdCB3ZSBoYXZlIGFsbCB0aGUgaW5mb3JtYXRpb24sIGNoZWNrIHRoZSBmbGFncy5cbiAgICBpZiAocGFja2FnZXMuc2l6ZSA+IDApIHtcbiAgICAgIGlmIChvcHRpb25zLm1pZ3JhdGVPbmx5ICYmIG9wdGlvbnMuZnJvbSAmJiBvcHRpb25zLnBhY2thZ2VzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc3VibG9nID0gbmV3IGxvZ2dpbmcuTGV2ZWxDYXBMb2dnZXIoJ3ZhbGlkYXRpb24nLCBsb2dnZXIuY3JlYXRlQ2hpbGQoJycpLCAnd2FybicpO1xuICAgICAgX3ZhbGlkYXRlVXBkYXRlUGFja2FnZXMocGFja2FnZUluZm9NYXAsICEhb3B0aW9ucy5mb3JjZSwgISFvcHRpb25zLm5leHQsIHN1YmxvZyk7XG5cbiAgICAgIF9wZXJmb3JtVXBkYXRlKHRyZWUsIGNvbnRleHQsIHBhY2thZ2VJbmZvTWFwLCBsb2dnZXIsICEhb3B0aW9ucy5taWdyYXRlT25seSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF91c2FnZU1lc3NhZ2Uob3B0aW9ucywgcGFja2FnZUluZm9NYXAsIGxvZ2dlcik7XG4gICAgfVxuICB9O1xufVxuIl19