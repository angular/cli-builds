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
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZHMvdXBkYXRlL3NjaGVtYXRpYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQXFEO0FBQ3JELDJEQUErRjtBQUMvRixxREFBdUM7QUFDdkMsK0NBQWlDO0FBRWpDLDBFQUFrRztBQU1sRyxrR0FBa0c7QUFDbEcsK0ZBQStGO0FBQy9GLDhGQUE4RjtBQUM5Rix3RkFBd0Y7QUFDeEYscUNBQXFDO0FBQ3JDLFNBQWdCLDJCQUEyQixDQUFDLEtBQWE7SUFDdkQsSUFBSSxRQUFRLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QyxJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2IsT0FBTyxLQUFLLENBQUM7S0FDZDtJQUNELElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztJQUNkLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxNQUFNLEVBQUUsUUFBUSxDQUFDLEVBQUU7UUFDNUMsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLEtBQUssSUFBSSxFQUFFLEVBQUU7WUFDZixzREFBc0Q7WUFDdEQsaURBQWlEO1lBQ2pELE9BQU8sUUFBUSxDQUFDO1NBQ2pCO0tBQ0Y7SUFFRCw0RkFBNEY7SUFDNUYsZ0dBQWdHO0lBQ2hHLDBGQUEwRjtJQUMxRixRQUFRLEdBQUcsS0FBSyxDQUFDO0lBQ2pCLEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUU7UUFDdkMsUUFBUSxJQUFJLFFBQVEsS0FBSyxJQUFJLEtBQUssYUFBYSxDQUFDO0tBQ2pEO0lBRUQsT0FBTyxNQUFNLENBQUMsVUFBVSxDQUFD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LElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRTtnQkFDM0QsT0FBTzthQUNSO1lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxjQUFPLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3hGLHVCQUF1QixDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUVqRixjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDOUU7YUFBTTtZQUNMLGFBQWEsQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ2hEO0lBQ0gsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXhHRCw0QkF3R0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgbG9nZ2luZywgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IFJ1bGUsIFNjaGVtYXRpY0NvbnRleHQsIFNjaGVtYXRpY3NFeGNlcHRpb24sIFRyZWUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgKiBhcyBucGEgZnJvbSAnbnBtLXBhY2thZ2UtYXJnJztcbmltcG9ydCAqIGFzIHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgRGVwZW5kZW5jeSwgSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXMgfSBmcm9tICcuLi8uLi8uLi91dGlsaXRpZXMvcGFja2FnZS1qc29uJztcbmltcG9ydCB7IE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbiwgZ2V0TnBtUGFja2FnZUpzb24gfSBmcm9tICcuLi8uLi8uLi91dGlsaXRpZXMvcGFja2FnZS1tZXRhZGF0YSc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgVXBkYXRlU2NoZW1hIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG50eXBlIFZlcnNpb25SYW5nZSA9IHN0cmluZyAmIHsgX19WRVJTSU9OX1JBTkdFOiB2b2lkIH07XG50eXBlIFBlZXJWZXJzaW9uVHJhbnNmb3JtID0gc3RyaW5nIHwgKChyYW5nZTogc3RyaW5nKSA9PiBzdHJpbmcpO1xuXG4vLyBBbmd1bGFyIGd1YXJhbnRlZXMgdGhhdCBhIG1ham9yIGlzIGNvbXBhdGlibGUgd2l0aCBpdHMgZm9sbG93aW5nIG1ham9yIChzbyBwYWNrYWdlcyB0aGF0IGRlcGVuZFxuLy8gb24gQW5ndWxhciA1IGFyZSBhbHNvIGNvbXBhdGlibGUgd2l0aCBBbmd1bGFyIDYpLiBUaGlzIGlzLCBpbiBjb2RlLCByZXByZXNlbnRlZCBieSB2ZXJpZnlpbmdcbi8vIHRoYXQgYWxsIG90aGVyIHBhY2thZ2VzIHRoYXQgaGF2ZSBhIHBlZXIgZGVwZW5kZW5jeSBvZiBgXCJAYW5ndWxhci9jb3JlXCI6IFwiXjUuMC4wXCJgIGFjdHVhbGx5XG4vLyBzdXBwb3J0cyA2LjAsIGJ5IGFkZGluZyB0aGF0IGNvbXBhdGliaWxpdHkgdG8gdGhlIHJhbmdlLCBzbyBpdCBpcyBgXjUuMC4wIHx8IF42LjAuMGAuXG4vLyBXZSBleHBvcnQgaXQgdG8gYWxsb3cgZm9yIHRlc3RpbmcuXG5leHBvcnQgZnVuY3Rpb24gYW5ndWxhck1ham9yQ29tcGF0R3VhcmFudGVlKHJhbmdlOiBzdHJpbmcpIHtcbiAgbGV0IG5ld1JhbmdlID0gc2VtdmVyLnZhbGlkUmFuZ2UocmFuZ2UpO1xuICBpZiAoIW5ld1JhbmdlKSB7XG4gICAgcmV0dXJuIHJhbmdlO1xuICB9XG4gIGxldCBtYWpvciA9IDE7XG4gIHdoaWxlICghc2VtdmVyLmd0cihtYWpvciArICcuMC4wJywgbmV3UmFuZ2UpKSB7XG4gICAgbWFqb3IrKztcbiAgICBpZiAobWFqb3IgPj0gOTkpIHtcbiAgICAgIC8vIFVzZSBvcmlnaW5hbCByYW5nZSBpZiBpdCBzdXBwb3J0cyBhIG1ham9yIHRoaXMgaGlnaFxuICAgICAgLy8gUmFuZ2UgaXMgbW9zdCBsaWtlbHkgdW5ib3VuZGVkIChlLmcuLCA+PTUuMC4wKVxuICAgICAgcmV0dXJuIG5ld1JhbmdlO1xuICAgIH1cbiAgfVxuXG4gIC8vIEFkZCB0aGUgbWFqb3IgdmVyc2lvbiBhcyBjb21wYXRpYmxlIHdpdGggdGhlIGFuZ3VsYXIgY29tcGF0aWJsZSwgd2l0aCBhbGwgbWlub3JzLiBUaGlzIGlzXG4gIC8vIGFscmVhZHkgb25lIG1ham9yIGFib3ZlIHRoZSBncmVhdGVzdCBzdXBwb3J0ZWQsIGJlY2F1c2Ugd2UgaW5jcmVtZW50IGBtYWpvcmAgYmVmb3JlIGNoZWNraW5nLlxuICAvLyBXZSBhZGQgbWlub3JzIGxpa2UgdGhpcyBiZWNhdXNlIGEgbWlub3IgYmV0YSBpcyBzdGlsbCBjb21wYXRpYmxlIHdpdGggYSBtaW5vciBub24tYmV0YS5cbiAgbmV3UmFuZ2UgPSByYW5nZTtcbiAgZm9yIChsZXQgbWlub3IgPSAwOyBtaW5vciA8IDIwOyBtaW5vcisrKSB7XG4gICAgbmV3UmFuZ2UgKz0gYCB8fCBeJHttYWpvcn0uJHttaW5vcn0uMC1hbHBoYS4wIGA7XG4gIH1cblxuICByZXR1cm4gc2VtdmVyLnZhbGlkUmFuZ2UobmV3UmFuZ2UpIHx8IHJhbmdlO1xufVxuXG4vLyBUaGlzIGlzIGEgbWFwIG9mIHBhY2thZ2VHcm91cE5hbWUgdG8gcmFuZ2UgZXh0ZW5kaW5nIGZ1bmN0aW9uLiBJZiBpdCBpc24ndCBmb3VuZCwgdGhlIHJhbmdlIGlzXG4vLyBrZXB0IHRoZSBzYW1lLlxuY29uc3Qga25vd25QZWVyQ29tcGF0aWJsZUxpc3Q6IHsgW25hbWU6IHN0cmluZ106IFBlZXJWZXJzaW9uVHJhbnNmb3JtIH0gPSB7XG4gICdAYW5ndWxhci9jb3JlJzogYW5ndWxhck1ham9yQ29tcGF0R3VhcmFudGVlLFxufTtcblxuaW50ZXJmYWNlIFBhY2thZ2VWZXJzaW9uSW5mbyB7XG4gIHZlcnNpb246IFZlcnNpb25SYW5nZTtcbiAgcGFja2FnZUpzb246IEpzb25TY2hlbWFGb3JOcG1QYWNrYWdlSnNvbkZpbGVzO1xuICB1cGRhdGVNZXRhZGF0YTogVXBkYXRlTWV0YWRhdGE7XG59XG5cbmludGVyZmFjZSBQYWNrYWdlSW5mbyB7XG4gIG5hbWU6IHN0cmluZztcbiAgbnBtUGFja2FnZUpzb246IE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbjtcbiAgaW5zdGFsbGVkOiBQYWNrYWdlVmVyc2lvbkluZm87XG4gIHRhcmdldD86IFBhY2thZ2VWZXJzaW9uSW5mbztcbiAgcGFja2FnZUpzb25SYW5nZTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgVXBkYXRlTWV0YWRhdGEge1xuICBwYWNrYWdlR3JvdXBOYW1lPzogc3RyaW5nO1xuICBwYWNrYWdlR3JvdXA6IHsgW3BhY2thZ2VOYW1lOiBzdHJpbmddOiBzdHJpbmcgfTtcbiAgcmVxdWlyZW1lbnRzOiB7IFtwYWNrYWdlTmFtZTogc3RyaW5nXTogc3RyaW5nIH07XG4gIG1pZ3JhdGlvbnM/OiBzdHJpbmc7XG59XG5cbmZ1bmN0aW9uIF91cGRhdGVQZWVyVmVyc2lvbihpbmZvTWFwOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz4sIG5hbWU6IHN0cmluZywgcmFuZ2U6IHN0cmluZykge1xuICAvLyBSZXNvbHZlIHBhY2thZ2VHcm91cE5hbWUuXG4gIGNvbnN0IG1heWJlUGFja2FnZUluZm8gPSBpbmZvTWFwLmdldChuYW1lKTtcbiAgaWYgKCFtYXliZVBhY2thZ2VJbmZvKSB7XG4gICAgcmV0dXJuIHJhbmdlO1xuICB9XG4gIGlmIChtYXliZVBhY2thZ2VJbmZvLnRhcmdldCkge1xuICAgIG5hbWUgPSBtYXliZVBhY2thZ2VJbmZvLnRhcmdldC51cGRhdGVNZXRhZGF0YS5wYWNrYWdlR3JvdXBOYW1lIHx8IG5hbWU7XG4gIH0gZWxzZSB7XG4gICAgbmFtZSA9IG1heWJlUGFja2FnZUluZm8uaW5zdGFsbGVkLnVwZGF0ZU1ldGFkYXRhLnBhY2thZ2VHcm91cE5hbWUgfHwgbmFtZTtcbiAgfVxuXG4gIGNvbnN0IG1heWJlVHJhbnNmb3JtID0ga25vd25QZWVyQ29tcGF0aWJsZUxpc3RbbmFtZV07XG4gIGlmIChtYXliZVRyYW5zZm9ybSkge1xuICAgIGlmICh0eXBlb2YgbWF5YmVUcmFuc2Zvcm0gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIG1heWJlVHJhbnNmb3JtKHJhbmdlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG1heWJlVHJhbnNmb3JtO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByYW5nZTtcbn1cblxuZnVuY3Rpb24gX3ZhbGlkYXRlRm9yd2FyZFBlZXJEZXBlbmRlbmNpZXMoXG4gIG5hbWU6IHN0cmluZyxcbiAgaW5mb01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm8+LFxuICBwZWVyczogeyBbbmFtZTogc3RyaW5nXTogc3RyaW5nIH0sXG4gIHBlZXJzTWV0YTogeyBbbmFtZTogc3RyaW5nXTogeyBvcHRpb25hbD86IGJvb2xlYW4gfSB9LFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuICBuZXh0OiBib29sZWFuLFxuKTogYm9vbGVhbiB7XG4gIGxldCB2YWxpZGF0aW9uRmFpbGVkID0gZmFsc2U7XG4gIGZvciAoY29uc3QgW3BlZXIsIHJhbmdlXSBvZiBPYmplY3QuZW50cmllcyhwZWVycykpIHtcbiAgICBsb2dnZXIuZGVidWcoYENoZWNraW5nIGZvcndhcmQgcGVlciAke3BlZXJ9Li4uYCk7XG4gICAgY29uc3QgbWF5YmVQZWVySW5mbyA9IGluZm9NYXAuZ2V0KHBlZXIpO1xuICAgIGNvbnN0IGlzT3B0aW9uYWwgPSBwZWVyc01ldGFbcGVlcl0gJiYgISFwZWVyc01ldGFbcGVlcl0ub3B0aW9uYWw7XG4gICAgaWYgKCFtYXliZVBlZXJJbmZvKSB7XG4gICAgICBpZiAoIWlzT3B0aW9uYWwpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgW1xuICAgICAgICAgICAgYFBhY2thZ2UgJHtKU09OLnN0cmluZ2lmeShuYW1lKX0gaGFzIGEgbWlzc2luZyBwZWVyIGRlcGVuZGVuY3kgb2ZgLFxuICAgICAgICAgICAgYCR7SlNPTi5zdHJpbmdpZnkocGVlcil9IEAgJHtKU09OLnN0cmluZ2lmeShyYW5nZSl9LmAsXG4gICAgICAgICAgXS5qb2luKCcgJyksXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHBlZXJWZXJzaW9uID1cbiAgICAgIG1heWJlUGVlckluZm8udGFyZ2V0ICYmIG1heWJlUGVlckluZm8udGFyZ2V0LnBhY2thZ2VKc29uLnZlcnNpb25cbiAgICAgICAgPyBtYXliZVBlZXJJbmZvLnRhcmdldC5wYWNrYWdlSnNvbi52ZXJzaW9uXG4gICAgICAgIDogbWF5YmVQZWVySW5mby5pbnN0YWxsZWQudmVyc2lvbjtcblxuICAgIGxvZ2dlci5kZWJ1ZyhgICBSYW5nZSBpbnRlcnNlY3RzKCR7cmFuZ2V9LCAke3BlZXJWZXJzaW9ufSkuLi5gKTtcbiAgICBpZiAoIXNlbXZlci5zYXRpc2ZpZXMocGVlclZlcnNpb24sIHJhbmdlLCB7IGluY2x1ZGVQcmVyZWxlYXNlOiBuZXh0IHx8IHVuZGVmaW5lZCB9KSkge1xuICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICBbXG4gICAgICAgICAgYFBhY2thZ2UgJHtKU09OLnN0cmluZ2lmeShuYW1lKX0gaGFzIGFuIGluY29tcGF0aWJsZSBwZWVyIGRlcGVuZGVuY3kgdG9gLFxuICAgICAgICAgIGAke0pTT04uc3RyaW5naWZ5KHBlZXIpfSAocmVxdWlyZXMgJHtKU09OLnN0cmluZ2lmeShyYW5nZSl9LGAsXG4gICAgICAgICAgYHdvdWxkIGluc3RhbGwgJHtKU09OLnN0cmluZ2lmeShwZWVyVmVyc2lvbil9KWAsXG4gICAgICAgIF0uam9pbignICcpLFxuICAgICAgKTtcblxuICAgICAgdmFsaWRhdGlvbkZhaWxlZCA9IHRydWU7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsaWRhdGlvbkZhaWxlZDtcbn1cblxuZnVuY3Rpb24gX3ZhbGlkYXRlUmV2ZXJzZVBlZXJEZXBlbmRlbmNpZXMoXG4gIG5hbWU6IHN0cmluZyxcbiAgdmVyc2lvbjogc3RyaW5nLFxuICBpbmZvTWFwOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz4sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4gIG5leHQ6IGJvb2xlYW4sXG4pIHtcbiAgZm9yIChjb25zdCBbaW5zdGFsbGVkLCBpbnN0YWxsZWRJbmZvXSBvZiBpbmZvTWFwLmVudHJpZXMoKSkge1xuICAgIGNvbnN0IGluc3RhbGxlZExvZ2dlciA9IGxvZ2dlci5jcmVhdGVDaGlsZChpbnN0YWxsZWQpO1xuICAgIGluc3RhbGxlZExvZ2dlci5kZWJ1ZyhgJHtpbnN0YWxsZWR9Li4uYCk7XG4gICAgY29uc3QgcGVlcnMgPSAoaW5zdGFsbGVkSW5mby50YXJnZXQgfHwgaW5zdGFsbGVkSW5mby5pbnN0YWxsZWQpLnBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXM7XG5cbiAgICBmb3IgKGNvbnN0IFtwZWVyLCByYW5nZV0gb2YgT2JqZWN0LmVudHJpZXMocGVlcnMgfHwge30pKSB7XG4gICAgICBpZiAocGVlciAhPSBuYW1lKSB7XG4gICAgICAgIC8vIE9ubHkgY2hlY2sgcGVlcnMgdG8gdGhlIHBhY2thZ2VzIHdlJ3JlIHVwZGF0aW5nLiBXZSBkb24ndCBjYXJlIGFib3V0IHBlZXJzXG4gICAgICAgIC8vIHRoYXQgYXJlIHVubWV0IGJ1dCB3ZSBoYXZlIG5vIGVmZmVjdCBvbi5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIElnbm9yZSBwZWVyRGVwZW5kZW5jeSBtaXNtYXRjaGVzIGZvciB0aGVzZSBwYWNrYWdlcy5cbiAgICAgIC8vIFRoZXkgYXJlIGRlcHJlY2F0ZWQgYW5kIHJlbW92ZWQgdmlhIGEgbWlncmF0aW9uLlxuICAgICAgY29uc3QgaWdub3JlZFBhY2thZ2VzID0gW1xuICAgICAgICAnY29kZWx5emVyJyxcbiAgICAgICAgJ0BzY2hlbWF0aWNzL3VwZGF0ZScsXG4gICAgICAgICdAYW5ndWxhci1kZXZraXQvYnVpbGQtbmctcGFja2FncicsXG4gICAgICAgICd0c2lja2xlJyxcbiAgICAgIF07XG4gICAgICBpZiAoaWdub3JlZFBhY2thZ2VzLmluY2x1ZGVzKGluc3RhbGxlZCkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIE92ZXJyaWRlIHRoZSBwZWVyIHZlcnNpb24gcmFuZ2UgaWYgaXQncyBrbm93biBhcyBhIGNvbXBhdGlibGUuXG4gICAgICBjb25zdCBleHRlbmRlZFJhbmdlID0gX3VwZGF0ZVBlZXJWZXJzaW9uKGluZm9NYXAsIHBlZXIsIHJhbmdlKTtcblxuICAgICAgaWYgKCFzZW12ZXIuc2F0aXNmaWVzKHZlcnNpb24sIGV4dGVuZGVkUmFuZ2UsIHsgaW5jbHVkZVByZXJlbGVhc2U6IG5leHQgfHwgdW5kZWZpbmVkIH0pKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICBbXG4gICAgICAgICAgICBgUGFja2FnZSAke0pTT04uc3RyaW5naWZ5KGluc3RhbGxlZCl9IGhhcyBhbiBpbmNvbXBhdGlibGUgcGVlciBkZXBlbmRlbmN5IHRvYCxcbiAgICAgICAgICAgIGAke0pTT04uc3RyaW5naWZ5KG5hbWUpfSAocmVxdWlyZXNgLFxuICAgICAgICAgICAgYCR7SlNPTi5zdHJpbmdpZnkocmFuZ2UpfSR7ZXh0ZW5kZWRSYW5nZSA9PSByYW5nZSA/ICcnIDogJyAoZXh0ZW5kZWQpJ30sYCxcbiAgICAgICAgICAgIGB3b3VsZCBpbnN0YWxsICR7SlNPTi5zdHJpbmdpZnkodmVyc2lvbil9KS5gLFxuICAgICAgICAgIF0uam9pbignICcpLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gX3ZhbGlkYXRlVXBkYXRlUGFja2FnZXMoXG4gIGluZm9NYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPixcbiAgZm9yY2U6IGJvb2xlYW4sXG4gIG5leHQ6IGJvb2xlYW4sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pOiB2b2lkIHtcbiAgbG9nZ2VyLmRlYnVnKCdVcGRhdGluZyB0aGUgZm9sbG93aW5nIHBhY2thZ2VzOicpO1xuICBpbmZvTWFwLmZvckVhY2goKGluZm8pID0+IHtcbiAgICBpZiAoaW5mby50YXJnZXQpIHtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhgICAke2luZm8ubmFtZX0gPT4gJHtpbmZvLnRhcmdldC52ZXJzaW9ufWApO1xuICAgIH1cbiAgfSk7XG5cbiAgbGV0IHBlZXJFcnJvcnMgPSBmYWxzZTtcbiAgaW5mb01hcC5mb3JFYWNoKChpbmZvKSA9PiB7XG4gICAgY29uc3QgeyBuYW1lLCB0YXJnZXQgfSA9IGluZm87XG4gICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBwa2dMb2dnZXIgPSBsb2dnZXIuY3JlYXRlQ2hpbGQobmFtZSk7XG4gICAgbG9nZ2VyLmRlYnVnKGAke25hbWV9Li4uYCk7XG5cbiAgICBjb25zdCB7IHBlZXJEZXBlbmRlbmNpZXMgPSB7fSwgcGVlckRlcGVuZGVuY2llc01ldGEgPSB7fSB9ID0gdGFyZ2V0LnBhY2thZ2VKc29uO1xuICAgIHBlZXJFcnJvcnMgPVxuICAgICAgX3ZhbGlkYXRlRm9yd2FyZFBlZXJEZXBlbmRlbmNpZXMoXG4gICAgICAgIG5hbWUsXG4gICAgICAgIGluZm9NYXAsXG4gICAgICAgIHBlZXJEZXBlbmRlbmNpZXMsXG4gICAgICAgIHBlZXJEZXBlbmRlbmNpZXNNZXRhLFxuICAgICAgICBwa2dMb2dnZXIsXG4gICAgICAgIG5leHQsXG4gICAgICApIHx8IHBlZXJFcnJvcnM7XG4gICAgcGVlckVycm9ycyA9XG4gICAgICBfdmFsaWRhdGVSZXZlcnNlUGVlckRlcGVuZGVuY2llcyhuYW1lLCB0YXJnZXQudmVyc2lvbiwgaW5mb01hcCwgcGtnTG9nZ2VyLCBuZXh0KSB8fFxuICAgICAgcGVlckVycm9ycztcbiAgfSk7XG5cbiAgaWYgKCFmb3JjZSAmJiBwZWVyRXJyb3JzKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24odGFncy5zdHJpcEluZGVudHNgSW5jb21wYXRpYmxlIHBlZXIgZGVwZW5kZW5jaWVzIGZvdW5kLlxuICAgICAgUGVlciBkZXBlbmRlbmN5IHdhcm5pbmdzIHdoZW4gaW5zdGFsbGluZyBkZXBlbmRlbmNpZXMgbWVhbnMgdGhhdCB0aG9zZSBkZXBlbmRlbmNpZXMgbWlnaHQgbm90IHdvcmsgY29ycmVjdGx5IHRvZ2V0aGVyLlxuICAgICAgWW91IGNhbiB1c2UgdGhlICctLWZvcmNlJyBvcHRpb24gdG8gaWdub3JlIGluY29tcGF0aWJsZSBwZWVyIGRlcGVuZGVuY2llcyBhbmQgaW5zdGVhZCBhZGRyZXNzIHRoZXNlIHdhcm5pbmdzIGxhdGVyLmApO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9wZXJmb3JtVXBkYXRlKFxuICB0cmVlOiBUcmVlLFxuICBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0LFxuICBpbmZvTWFwOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz4sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4gIG1pZ3JhdGVPbmx5OiBib29sZWFuLFxuKTogdm9pZCB7XG4gIGNvbnN0IHBhY2thZ2VKc29uQ29udGVudCA9IHRyZWUucmVhZCgnL3BhY2thZ2UuanNvbicpO1xuICBpZiAoIXBhY2thZ2VKc29uQ29udGVudCkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgZmluZCBhIHBhY2thZ2UuanNvbi4gQXJlIHlvdSBpbiBhIE5vZGUgcHJvamVjdD8nKTtcbiAgfVxuXG4gIGxldCBwYWNrYWdlSnNvbjogSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXM7XG4gIHRyeSB7XG4gICAgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHBhY2thZ2VKc29uQ29udGVudC50b1N0cmluZygpKSBhcyBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcztcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdwYWNrYWdlLmpzb24gY291bGQgbm90IGJlIHBhcnNlZDogJyArIGUubWVzc2FnZSk7XG4gIH1cblxuICBjb25zdCB1cGRhdGVEZXBlbmRlbmN5ID0gKGRlcHM6IERlcGVuZGVuY3ksIG5hbWU6IHN0cmluZywgbmV3VmVyc2lvbjogc3RyaW5nKSA9PiB7XG4gICAgY29uc3Qgb2xkVmVyc2lvbiA9IGRlcHNbbmFtZV07XG4gICAgLy8gV2Ugb25seSByZXNwZWN0IGNhcmV0IGFuZCB0aWxkZSByYW5nZXMgb24gdXBkYXRlLlxuICAgIGNvbnN0IGV4ZWNSZXN1bHQgPSAvXltcXF5+XS8uZXhlYyhvbGRWZXJzaW9uKTtcbiAgICBkZXBzW25hbWVdID0gYCR7ZXhlY1Jlc3VsdCA/IGV4ZWNSZXN1bHRbMF0gOiAnJ30ke25ld1ZlcnNpb259YDtcbiAgfTtcblxuICBjb25zdCB0b0luc3RhbGwgPSBbLi4uaW5mb01hcC52YWx1ZXMoKV1cbiAgICAubWFwKCh4KSA9PiBbeC5uYW1lLCB4LnRhcmdldCwgeC5pbnN0YWxsZWRdKVxuICAgIC5maWx0ZXIoKFtuYW1lLCB0YXJnZXQsIGluc3RhbGxlZF0pID0+IHtcbiAgICAgIHJldHVybiAhIW5hbWUgJiYgISF0YXJnZXQgJiYgISFpbnN0YWxsZWQ7XG4gICAgfSkgYXMgW3N0cmluZywgUGFja2FnZVZlcnNpb25JbmZvLCBQYWNrYWdlVmVyc2lvbkluZm9dW107XG5cbiAgdG9JbnN0YWxsLmZvckVhY2goKFtuYW1lLCB0YXJnZXQsIGluc3RhbGxlZF0pID0+IHtcbiAgICBsb2dnZXIuaW5mbyhcbiAgICAgIGBVcGRhdGluZyBwYWNrYWdlLmpzb24gd2l0aCBkZXBlbmRlbmN5ICR7bmFtZX0gYCArXG4gICAgICAgIGBAICR7SlNPTi5zdHJpbmdpZnkodGFyZ2V0LnZlcnNpb24pfSAod2FzICR7SlNPTi5zdHJpbmdpZnkoaW5zdGFsbGVkLnZlcnNpb24pfSkuLi5gLFxuICAgICk7XG5cbiAgICBpZiAocGFja2FnZUpzb24uZGVwZW5kZW5jaWVzICYmIHBhY2thZ2VKc29uLmRlcGVuZGVuY2llc1tuYW1lXSkge1xuICAgICAgdXBkYXRlRGVwZW5kZW5jeShwYWNrYWdlSnNvbi5kZXBlbmRlbmNpZXMsIG5hbWUsIHRhcmdldC52ZXJzaW9uKTtcblxuICAgICAgaWYgKHBhY2thZ2VKc29uLmRldkRlcGVuZGVuY2llcyAmJiBwYWNrYWdlSnNvbi5kZXZEZXBlbmRlbmNpZXNbbmFtZV0pIHtcbiAgICAgICAgZGVsZXRlIHBhY2thZ2VKc29uLmRldkRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgIH1cbiAgICAgIGlmIChwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzICYmIHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV0pIHtcbiAgICAgICAgZGVsZXRlIHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwYWNrYWdlSnNvbi5kZXZEZXBlbmRlbmNpZXMgJiYgcGFja2FnZUpzb24uZGV2RGVwZW5kZW5jaWVzW25hbWVdKSB7XG4gICAgICB1cGRhdGVEZXBlbmRlbmN5KHBhY2thZ2VKc29uLmRldkRlcGVuZGVuY2llcywgbmFtZSwgdGFyZ2V0LnZlcnNpb24pO1xuXG4gICAgICBpZiAocGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llcyAmJiBwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzW25hbWVdKSB7XG4gICAgICAgIGRlbGV0ZSBwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzW25hbWVdO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llcyAmJiBwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzW25hbWVdKSB7XG4gICAgICB1cGRhdGVEZXBlbmRlbmN5KHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXMsIG5hbWUsIHRhcmdldC52ZXJzaW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLndhcm4oYFBhY2thZ2UgJHtuYW1lfSB3YXMgbm90IGZvdW5kIGluIGRlcGVuZGVuY2llcy5gKTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IG5ld0NvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShwYWNrYWdlSnNvbiwgbnVsbCwgMik7XG4gIGlmIChwYWNrYWdlSnNvbkNvbnRlbnQudG9TdHJpbmcoKSAhPSBuZXdDb250ZW50IHx8IG1pZ3JhdGVPbmx5KSB7XG4gICAgaWYgKCFtaWdyYXRlT25seSkge1xuICAgICAgdHJlZS5vdmVyd3JpdGUoJy9wYWNrYWdlLmpzb24nLCBKU09OLnN0cmluZ2lmeShwYWNrYWdlSnNvbiwgbnVsbCwgMikpO1xuICAgIH1cblxuICAgIGNvbnN0IGV4dGVybmFsTWlncmF0aW9uczoge31bXSA9IFtdO1xuXG4gICAgLy8gUnVuIHRoZSBtaWdyYXRlIHNjaGVtYXRpY3Mgd2l0aCB0aGUgbGlzdCBvZiBwYWNrYWdlcyB0byB1c2UuIFRoZSBjb2xsZWN0aW9uIGNvbnRhaW5zXG4gICAgLy8gdmVyc2lvbiBpbmZvcm1hdGlvbiBhbmQgd2UgbmVlZCB0byBkbyB0aGlzIHBvc3QgaW5zdGFsbGF0aW9uLiBQbGVhc2Ugbm90ZSB0aGF0IHRoZVxuICAgIC8vIG1pZ3JhdGlvbiBDT1VMRCBmYWlsIGFuZCBsZWF2ZSBzaWRlIGVmZmVjdHMgb24gZGlzay5cbiAgICAvLyBSdW4gdGhlIHNjaGVtYXRpY3MgdGFzayBvZiB0aG9zZSBwYWNrYWdlcy5cbiAgICB0b0luc3RhbGwuZm9yRWFjaCgoW25hbWUsIHRhcmdldCwgaW5zdGFsbGVkXSkgPT4ge1xuICAgICAgaWYgKCF0YXJnZXQudXBkYXRlTWV0YWRhdGEubWlncmF0aW9ucykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGV4dGVybmFsTWlncmF0aW9ucy5wdXNoKHtcbiAgICAgICAgcGFja2FnZTogbmFtZSxcbiAgICAgICAgY29sbGVjdGlvbjogdGFyZ2V0LnVwZGF0ZU1ldGFkYXRhLm1pZ3JhdGlvbnMsXG4gICAgICAgIGZyb206IGluc3RhbGxlZC52ZXJzaW9uLFxuICAgICAgICB0bzogdGFyZ2V0LnZlcnNpb24sXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuO1xuICAgIH0pO1xuXG4gICAgaWYgKGV4dGVybmFsTWlncmF0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgKGdsb2JhbCBhcyBhbnkpLmV4dGVybmFsTWlncmF0aW9ucyA9IGV4dGVybmFsTWlncmF0aW9ucztcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gX2dldFVwZGF0ZU1ldGFkYXRhKFxuICBwYWNrYWdlSnNvbjogSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXMsXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pOiBVcGRhdGVNZXRhZGF0YSB7XG4gIGNvbnN0IG1ldGFkYXRhID0gcGFja2FnZUpzb25bJ25nLXVwZGF0ZSddO1xuXG4gIGNvbnN0IHJlc3VsdDogVXBkYXRlTWV0YWRhdGEgPSB7XG4gICAgcGFja2FnZUdyb3VwOiB7fSxcbiAgICByZXF1aXJlbWVudHM6IHt9LFxuICB9O1xuXG4gIGlmICghbWV0YWRhdGEgfHwgdHlwZW9mIG1ldGFkYXRhICE9ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkobWV0YWRhdGEpKSB7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGlmIChtZXRhZGF0YVsncGFja2FnZUdyb3VwJ10pIHtcbiAgICBjb25zdCBwYWNrYWdlR3JvdXAgPSBtZXRhZGF0YVsncGFja2FnZUdyb3VwJ107XG4gICAgLy8gVmVyaWZ5IHRoYXQgcGFja2FnZUdyb3VwIGlzIGFuIGFycmF5IG9mIHN0cmluZ3Mgb3IgYW4gbWFwIG9mIHZlcnNpb25zLiBUaGlzIGlzIG5vdCBhbiBlcnJvclxuICAgIC8vIGJ1dCB3ZSBzdGlsbCB3YXJuIHRoZSB1c2VyIGFuZCBpZ25vcmUgdGhlIHBhY2thZ2VHcm91cCBrZXlzLlxuICAgIGlmIChBcnJheS5pc0FycmF5KHBhY2thZ2VHcm91cCkgJiYgcGFja2FnZUdyb3VwLmV2ZXJ5KCh4KSA9PiB0eXBlb2YgeCA9PSAnc3RyaW5nJykpIHtcbiAgICAgIHJlc3VsdC5wYWNrYWdlR3JvdXAgPSBwYWNrYWdlR3JvdXAucmVkdWNlKChncm91cCwgbmFtZSkgPT4ge1xuICAgICAgICBncm91cFtuYW1lXSA9IHBhY2thZ2VKc29uLnZlcnNpb247XG5cbiAgICAgICAgcmV0dXJuIGdyb3VwO1xuICAgICAgfSwgcmVzdWx0LnBhY2thZ2VHcm91cCk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIHR5cGVvZiBwYWNrYWdlR3JvdXAgPT0gJ29iamVjdCcgJiZcbiAgICAgIHBhY2thZ2VHcm91cCAmJlxuICAgICAgT2JqZWN0LnZhbHVlcyhwYWNrYWdlR3JvdXApLmV2ZXJ5KCh4KSA9PiB0eXBlb2YgeCA9PSAnc3RyaW5nJylcbiAgICApIHtcbiAgICAgIHJlc3VsdC5wYWNrYWdlR3JvdXAgPSBwYWNrYWdlR3JvdXA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZ2dlci53YXJuKGBwYWNrYWdlR3JvdXAgbWV0YWRhdGEgb2YgcGFja2FnZSAke3BhY2thZ2VKc29uLm5hbWV9IGlzIG1hbGZvcm1lZC4gSWdub3JpbmcuYCk7XG4gICAgfVxuXG4gICAgcmVzdWx0LnBhY2thZ2VHcm91cE5hbWUgPSBPYmplY3Qua2V5cyhyZXN1bHQucGFja2FnZUdyb3VwKVswXTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgbWV0YWRhdGFbJ3BhY2thZ2VHcm91cE5hbWUnXSA9PSAnc3RyaW5nJykge1xuICAgIHJlc3VsdC5wYWNrYWdlR3JvdXBOYW1lID0gbWV0YWRhdGFbJ3BhY2thZ2VHcm91cE5hbWUnXTtcbiAgfVxuXG4gIGlmIChtZXRhZGF0YVsncmVxdWlyZW1lbnRzJ10pIHtcbiAgICBjb25zdCByZXF1aXJlbWVudHMgPSBtZXRhZGF0YVsncmVxdWlyZW1lbnRzJ107XG4gICAgLy8gVmVyaWZ5IHRoYXQgcmVxdWlyZW1lbnRzIGFyZVxuICAgIGlmIChcbiAgICAgIHR5cGVvZiByZXF1aXJlbWVudHMgIT0gJ29iamVjdCcgfHxcbiAgICAgIEFycmF5LmlzQXJyYXkocmVxdWlyZW1lbnRzKSB8fFxuICAgICAgT2JqZWN0LmtleXMocmVxdWlyZW1lbnRzKS5zb21lKChuYW1lKSA9PiB0eXBlb2YgcmVxdWlyZW1lbnRzW25hbWVdICE9ICdzdHJpbmcnKVxuICAgICkge1xuICAgICAgbG9nZ2VyLndhcm4oYHJlcXVpcmVtZW50cyBtZXRhZGF0YSBvZiBwYWNrYWdlICR7cGFja2FnZUpzb24ubmFtZX0gaXMgbWFsZm9ybWVkLiBJZ25vcmluZy5gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnJlcXVpcmVtZW50cyA9IHJlcXVpcmVtZW50cztcbiAgICB9XG4gIH1cblxuICBpZiAobWV0YWRhdGFbJ21pZ3JhdGlvbnMnXSkge1xuICAgIGNvbnN0IG1pZ3JhdGlvbnMgPSBtZXRhZGF0YVsnbWlncmF0aW9ucyddO1xuICAgIGlmICh0eXBlb2YgbWlncmF0aW9ucyAhPSAnc3RyaW5nJykge1xuICAgICAgbG9nZ2VyLndhcm4oYG1pZ3JhdGlvbnMgbWV0YWRhdGEgb2YgcGFja2FnZSAke3BhY2thZ2VKc29uLm5hbWV9IGlzIG1hbGZvcm1lZC4gSWdub3JpbmcuYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5taWdyYXRpb25zID0gbWlncmF0aW9ucztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBfdXNhZ2VNZXNzYWdlKFxuICBvcHRpb25zOiBVcGRhdGVTY2hlbWEsXG4gIGluZm9NYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbikge1xuICBjb25zdCBwYWNrYWdlR3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgcGFja2FnZXNUb1VwZGF0ZSA9IFsuLi5pbmZvTWFwLmVudHJpZXMoKV1cbiAgICAubWFwKChbbmFtZSwgaW5mb10pID0+IHtcbiAgICAgIGxldCB0YWcgPSBvcHRpb25zLm5leHRcbiAgICAgICAgPyBpbmZvLm5wbVBhY2thZ2VKc29uWydkaXN0LXRhZ3MnXVsnbmV4dCddXG4gICAgICAgICAgPyAnbmV4dCdcbiAgICAgICAgICA6ICdsYXRlc3QnXG4gICAgICAgIDogJ2xhdGVzdCc7XG4gICAgICBsZXQgdmVyc2lvbiA9IGluZm8ubnBtUGFja2FnZUpzb25bJ2Rpc3QtdGFncyddW3RhZ107XG4gICAgICBsZXQgdGFyZ2V0ID0gaW5mby5ucG1QYWNrYWdlSnNvbi52ZXJzaW9uc1t2ZXJzaW9uXTtcblxuICAgICAgY29uc3QgdmVyc2lvbkRpZmYgPSBzZW12ZXIuZGlmZihpbmZvLmluc3RhbGxlZC52ZXJzaW9uLCB2ZXJzaW9uKTtcbiAgICAgIGlmIChcbiAgICAgICAgdmVyc2lvbkRpZmYgIT09ICdwYXRjaCcgJiZcbiAgICAgICAgdmVyc2lvbkRpZmYgIT09ICdtaW5vcicgJiZcbiAgICAgICAgL15AKD86YW5ndWxhcnxuZ3VuaXZlcnNhbClcXC8vLnRlc3QobmFtZSlcbiAgICAgICkge1xuICAgICAgICBjb25zdCBpbnN0YWxsZWRNYWpvclZlcnNpb24gPSBzZW12ZXIucGFyc2UoaW5mby5pbnN0YWxsZWQudmVyc2lvbik/Lm1ham9yO1xuICAgICAgICBjb25zdCB0b0luc3RhbGxNYWpvclZlcnNpb24gPSBzZW12ZXIucGFyc2UodmVyc2lvbik/Lm1ham9yO1xuICAgICAgICBpZiAoXG4gICAgICAgICAgaW5zdGFsbGVkTWFqb3JWZXJzaW9uICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICB0b0luc3RhbGxNYWpvclZlcnNpb24gIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgIGluc3RhbGxlZE1ham9yVmVyc2lvbiA8IHRvSW5zdGFsbE1ham9yVmVyc2lvbiAtIDFcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29uc3QgbmV4dE1ham9yVmVyc2lvbiA9IGAke2luc3RhbGxlZE1ham9yVmVyc2lvbiArIDF9LmA7XG4gICAgICAgICAgY29uc3QgbmV4dE1ham9yVmVyc2lvbnMgPSBPYmplY3Qua2V5cyhpbmZvLm5wbVBhY2thZ2VKc29uLnZlcnNpb25zKVxuICAgICAgICAgICAgLmZpbHRlcigodikgPT4gdi5zdGFydHNXaXRoKG5leHRNYWpvclZlcnNpb24pKVxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IChhID4gYiA/IC0xIDogMSkpO1xuXG4gICAgICAgICAgaWYgKG5leHRNYWpvclZlcnNpb25zLmxlbmd0aCkge1xuICAgICAgICAgICAgdmVyc2lvbiA9IG5leHRNYWpvclZlcnNpb25zWzBdO1xuICAgICAgICAgICAgdGFyZ2V0ID0gaW5mby5ucG1QYWNrYWdlSnNvbi52ZXJzaW9uc1t2ZXJzaW9uXTtcbiAgICAgICAgICAgIHRhZyA9ICcnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICBpbmZvLFxuICAgICAgICB2ZXJzaW9uLFxuICAgICAgICB0YWcsXG4gICAgICAgIHRhcmdldCxcbiAgICAgIH07XG4gICAgfSlcbiAgICAuZmlsdGVyKFxuICAgICAgKHsgaW5mbywgdmVyc2lvbiwgdGFyZ2V0IH0pID0+XG4gICAgICAgIHRhcmdldD8uWyduZy11cGRhdGUnXSAmJiBzZW12ZXIuY29tcGFyZShpbmZvLmluc3RhbGxlZC52ZXJzaW9uLCB2ZXJzaW9uKSA8IDAsXG4gICAgKVxuICAgIC5tYXAoKHsgbmFtZSwgaW5mbywgdmVyc2lvbiwgdGFnLCB0YXJnZXQgfSkgPT4ge1xuICAgICAgLy8gTG9vayBmb3IgcGFja2FnZUdyb3VwLlxuICAgICAgY29uc3QgcGFja2FnZUdyb3VwID0gdGFyZ2V0WyduZy11cGRhdGUnXVsncGFja2FnZUdyb3VwJ107XG4gICAgICBpZiAocGFja2FnZUdyb3VwKSB7XG4gICAgICAgIGNvbnN0IHBhY2thZ2VHcm91cE5hbWUgPSB0YXJnZXRbJ25nLXVwZGF0ZSddWydwYWNrYWdlR3JvdXBOYW1lJ10gfHwgcGFja2FnZUdyb3VwWzBdO1xuICAgICAgICBpZiAocGFja2FnZUdyb3VwTmFtZSkge1xuICAgICAgICAgIGlmIChwYWNrYWdlR3JvdXBzLmhhcyhuYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcGFja2FnZUdyb3VwLmZvckVhY2goKHg6IHN0cmluZykgPT4gcGFja2FnZUdyb3Vwcy5zZXQoeCwgcGFja2FnZUdyb3VwTmFtZSkpO1xuICAgICAgICAgIHBhY2thZ2VHcm91cHMuc2V0KHBhY2thZ2VHcm91cE5hbWUsIHBhY2thZ2VHcm91cE5hbWUpO1xuICAgICAgICAgIG5hbWUgPSBwYWNrYWdlR3JvdXBOYW1lO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGxldCBjb21tYW5kID0gYG5nIHVwZGF0ZSAke25hbWV9YDtcbiAgICAgIGlmICghdGFnKSB7XG4gICAgICAgIGNvbW1hbmQgKz0gYEAke3NlbXZlci5wYXJzZSh2ZXJzaW9uKT8ubWFqb3IgfHwgdmVyc2lvbn1gO1xuICAgICAgfSBlbHNlIGlmICh0YWcgPT0gJ25leHQnKSB7XG4gICAgICAgIGNvbW1hbmQgKz0gJyAtLW5leHQnO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gW25hbWUsIGAke2luZm8uaW5zdGFsbGVkLnZlcnNpb259IC0+ICR7dmVyc2lvbn0gYCwgY29tbWFuZF07XG4gICAgfSlcbiAgICAuZmlsdGVyKCh4KSA9PiB4ICE9PSBudWxsKVxuICAgIC5zb3J0KChhLCBiKSA9PiAoYSAmJiBiID8gYVswXS5sb2NhbGVDb21wYXJlKGJbMF0pIDogMCkpO1xuXG4gIGlmIChwYWNrYWdlc1RvVXBkYXRlLmxlbmd0aCA9PSAwKSB7XG4gICAgbG9nZ2VyLmluZm8oJ1dlIGFuYWx5emVkIHlvdXIgcGFja2FnZS5qc29uIGFuZCBldmVyeXRoaW5nIHNlZW1zIHRvIGJlIGluIG9yZGVyLiBHb29kIHdvcmshJyk7XG5cbiAgICByZXR1cm47XG4gIH1cblxuICBsb2dnZXIuaW5mbygnV2UgYW5hbHl6ZWQgeW91ciBwYWNrYWdlLmpzb24sIHRoZXJlIGFyZSBzb21lIHBhY2thZ2VzIHRvIHVwZGF0ZTpcXG4nKTtcblxuICAvLyBGaW5kIHRoZSBsYXJnZXN0IG5hbWUgdG8ga25vdyB0aGUgcGFkZGluZyBuZWVkZWQuXG4gIGxldCBuYW1lUGFkID0gTWF0aC5tYXgoLi4uWy4uLmluZm9NYXAua2V5cygpXS5tYXAoKHgpID0+IHgubGVuZ3RoKSkgKyAyO1xuICBpZiAoIU51bWJlci5pc0Zpbml0ZShuYW1lUGFkKSkge1xuICAgIG5hbWVQYWQgPSAzMDtcbiAgfVxuICBjb25zdCBwYWRzID0gW25hbWVQYWQsIDI1LCAwXTtcblxuICBsb2dnZXIuaW5mbyhcbiAgICAnICAnICsgWydOYW1lJywgJ1ZlcnNpb24nLCAnQ29tbWFuZCB0byB1cGRhdGUnXS5tYXAoKHgsIGkpID0+IHgucGFkRW5kKHBhZHNbaV0pKS5qb2luKCcnKSxcbiAgKTtcbiAgbG9nZ2VyLmluZm8oJyAnICsgJy0nLnJlcGVhdChwYWRzLnJlZHVjZSgocywgeCkgPT4gKHMgKz0geCksIDApICsgMjApKTtcblxuICBwYWNrYWdlc1RvVXBkYXRlLmZvckVhY2goKGZpZWxkcykgPT4ge1xuICAgIGlmICghZmllbGRzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oJyAgJyArIGZpZWxkcy5tYXAoKHgsIGkpID0+IHgucGFkRW5kKHBhZHNbaV0pKS5qb2luKCcnKSk7XG4gIH0pO1xuXG4gIGxvZ2dlci5pbmZvKFxuICAgIGBcXG5UaGVyZSBtaWdodCBiZSBhZGRpdGlvbmFsIHBhY2thZ2VzIHdoaWNoIGRvbid0IHByb3ZpZGUgJ25nIHVwZGF0ZScgY2FwYWJpbGl0aWVzIHRoYXQgYXJlIG91dGRhdGVkLlxcbmAgK1xuICAgICAgYFlvdSBjYW4gdXBkYXRlIHRoZSBhZGRpdGlvbmFsIHBhY2thZ2VzIGJ5IHJ1bm5pbmcgdGhlIHVwZGF0ZSBjb21tYW5kIG9mIHlvdXIgcGFja2FnZSBtYW5hZ2VyLmAsXG4gICk7XG5cbiAgcmV0dXJuO1xufVxuXG5mdW5jdGlvbiBfYnVpbGRQYWNrYWdlSW5mbyhcbiAgdHJlZTogVHJlZSxcbiAgcGFja2FnZXM6IE1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4sXG4gIGFsbERlcGVuZGVuY2llczogUmVhZG9ubHlNYXA8c3RyaW5nLCBWZXJzaW9uUmFuZ2U+LFxuICBucG1QYWNrYWdlSnNvbjogTnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uLFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuKTogUGFja2FnZUluZm8ge1xuICBjb25zdCBuYW1lID0gbnBtUGFja2FnZUpzb24ubmFtZTtcbiAgY29uc3QgcGFja2FnZUpzb25SYW5nZSA9IGFsbERlcGVuZGVuY2llcy5nZXQobmFtZSk7XG4gIGlmICghcGFja2FnZUpzb25SYW5nZSkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBQYWNrYWdlICR7SlNPTi5zdHJpbmdpZnkobmFtZSl9IHdhcyBub3QgZm91bmQgaW4gcGFja2FnZS5qc29uLmApO1xuICB9XG5cbiAgLy8gRmluZCBvdXQgdGhlIGN1cnJlbnRseSBpbnN0YWxsZWQgdmVyc2lvbi4gRWl0aGVyIGZyb20gdGhlIHBhY2thZ2UuanNvbiBvciB0aGUgbm9kZV9tb2R1bGVzL1xuICAvLyBUT0RPOiBmaWd1cmUgb3V0IGEgd2F5IHRvIHJlYWQgcGFja2FnZS1sb2NrLmpzb24gYW5kL29yIHlhcm4ubG9jay5cbiAgbGV0IGluc3RhbGxlZFZlcnNpb246IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGw7XG4gIGNvbnN0IHBhY2thZ2VDb250ZW50ID0gdHJlZS5yZWFkKGAvbm9kZV9tb2R1bGVzLyR7bmFtZX0vcGFja2FnZS5qc29uYCk7XG4gIGlmIChwYWNrYWdlQ29udGVudCkge1xuICAgIGNvbnN0IGNvbnRlbnQgPSBKU09OLnBhcnNlKHBhY2thZ2VDb250ZW50LnRvU3RyaW5nKCkpIGFzIEpzb25TY2hlbWFGb3JOcG1QYWNrYWdlSnNvbkZpbGVzO1xuICAgIGluc3RhbGxlZFZlcnNpb24gPSBjb250ZW50LnZlcnNpb247XG4gIH1cbiAgaWYgKCFpbnN0YWxsZWRWZXJzaW9uKSB7XG4gICAgLy8gRmluZCB0aGUgdmVyc2lvbiBmcm9tIE5QTSB0aGF0IGZpdHMgdGhlIHJhbmdlIHRvIG1heC5cbiAgICBpbnN0YWxsZWRWZXJzaW9uID0gc2VtdmVyLm1heFNhdGlzZnlpbmcoT2JqZWN0LmtleXMobnBtUGFja2FnZUpzb24udmVyc2lvbnMpLCBwYWNrYWdlSnNvblJhbmdlKTtcbiAgfVxuXG4gIGlmICghaW5zdGFsbGVkVmVyc2lvbikge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKFxuICAgICAgYEFuIHVuZXhwZWN0ZWQgZXJyb3IgaGFwcGVuZWQ7IGNvdWxkIG5vdCBkZXRlcm1pbmUgdmVyc2lvbiBmb3IgcGFja2FnZSAke25hbWV9LmAsXG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IGluc3RhbGxlZFBhY2thZ2VKc29uID0gbnBtUGFja2FnZUpzb24udmVyc2lvbnNbaW5zdGFsbGVkVmVyc2lvbl0gfHwgcGFja2FnZUNvbnRlbnQ7XG4gIGlmICghaW5zdGFsbGVkUGFja2FnZUpzb24pIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihcbiAgICAgIGBBbiB1bmV4cGVjdGVkIGVycm9yIGhhcHBlbmVkOyBwYWNrYWdlICR7bmFtZX0gaGFzIG5vIHZlcnNpb24gJHtpbnN0YWxsZWRWZXJzaW9ufS5gLFxuICAgICk7XG4gIH1cblxuICBsZXQgdGFyZ2V0VmVyc2lvbjogVmVyc2lvblJhbmdlIHwgdW5kZWZpbmVkID0gcGFja2FnZXMuZ2V0KG5hbWUpO1xuICBpZiAodGFyZ2V0VmVyc2lvbikge1xuICAgIGlmIChucG1QYWNrYWdlSnNvblsnZGlzdC10YWdzJ11bdGFyZ2V0VmVyc2lvbl0pIHtcbiAgICAgIHRhcmdldFZlcnNpb24gPSBucG1QYWNrYWdlSnNvblsnZGlzdC10YWdzJ11bdGFyZ2V0VmVyc2lvbl0gYXMgVmVyc2lvblJhbmdlO1xuICAgIH0gZWxzZSBpZiAodGFyZ2V0VmVyc2lvbiA9PSAnbmV4dCcpIHtcbiAgICAgIHRhcmdldFZlcnNpb24gPSBucG1QYWNrYWdlSnNvblsnZGlzdC10YWdzJ11bJ2xhdGVzdCddIGFzIFZlcnNpb25SYW5nZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0VmVyc2lvbiA9IHNlbXZlci5tYXhTYXRpc2Z5aW5nKFxuICAgICAgICBPYmplY3Qua2V5cyhucG1QYWNrYWdlSnNvbi52ZXJzaW9ucyksXG4gICAgICAgIHRhcmdldFZlcnNpb24sXG4gICAgICApIGFzIFZlcnNpb25SYW5nZTtcbiAgICB9XG4gIH1cblxuICBpZiAodGFyZ2V0VmVyc2lvbiAmJiBzZW12ZXIubHRlKHRhcmdldFZlcnNpb24sIGluc3RhbGxlZFZlcnNpb24pKSB7XG4gICAgbG9nZ2VyLmRlYnVnKGBQYWNrYWdlICR7bmFtZX0gYWxyZWFkeSBzYXRpc2ZpZWQgYnkgcGFja2FnZS5qc29uICgke3BhY2thZ2VKc29uUmFuZ2V9KS5gKTtcbiAgICB0YXJnZXRWZXJzaW9uID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgY29uc3QgdGFyZ2V0OiBQYWNrYWdlVmVyc2lvbkluZm8gfCB1bmRlZmluZWQgPSB0YXJnZXRWZXJzaW9uXG4gICAgPyB7XG4gICAgICAgIHZlcnNpb246IHRhcmdldFZlcnNpb24sXG4gICAgICAgIHBhY2thZ2VKc29uOiBucG1QYWNrYWdlSnNvbi52ZXJzaW9uc1t0YXJnZXRWZXJzaW9uXSxcbiAgICAgICAgdXBkYXRlTWV0YWRhdGE6IF9nZXRVcGRhdGVNZXRhZGF0YShucG1QYWNrYWdlSnNvbi52ZXJzaW9uc1t0YXJnZXRWZXJzaW9uXSwgbG9nZ2VyKSxcbiAgICAgIH1cbiAgICA6IHVuZGVmaW5lZDtcblxuICAvLyBDaGVjayBpZiB0aGVyZSdzIGFuIGluc3RhbGxlZCB2ZXJzaW9uLlxuICByZXR1cm4ge1xuICAgIG5hbWUsXG4gICAgbnBtUGFja2FnZUpzb24sXG4gICAgaW5zdGFsbGVkOiB7XG4gICAgICB2ZXJzaW9uOiBpbnN0YWxsZWRWZXJzaW9uIGFzIFZlcnNpb25SYW5nZSxcbiAgICAgIHBhY2thZ2VKc29uOiBpbnN0YWxsZWRQYWNrYWdlSnNvbixcbiAgICAgIHVwZGF0ZU1ldGFkYXRhOiBfZ2V0VXBkYXRlTWV0YWRhdGEoaW5zdGFsbGVkUGFja2FnZUpzb24sIGxvZ2dlciksXG4gICAgfSxcbiAgICB0YXJnZXQsXG4gICAgcGFja2FnZUpzb25SYW5nZSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gX2J1aWxkUGFja2FnZUxpc3QoXG4gIG9wdGlvbnM6IFVwZGF0ZVNjaGVtYSxcbiAgcHJvamVjdERlcHM6IE1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pOiBNYXA8c3RyaW5nLCBWZXJzaW9uUmFuZ2U+IHtcbiAgLy8gUGFyc2UgdGhlIHBhY2thZ2VzIG9wdGlvbnMgdG8gc2V0IHRoZSB0YXJnZXRlZCB2ZXJzaW9uLlxuICBjb25zdCBwYWNrYWdlcyA9IG5ldyBNYXA8c3RyaW5nLCBWZXJzaW9uUmFuZ2U+KCk7XG4gIGNvbnN0IGNvbW1hbmRMaW5lUGFja2FnZXMgPVxuICAgIG9wdGlvbnMucGFja2FnZXMgJiYgb3B0aW9ucy5wYWNrYWdlcy5sZW5ndGggPiAwID8gb3B0aW9ucy5wYWNrYWdlcyA6IFtdO1xuXG4gIGZvciAoY29uc3QgcGtnIG9mIGNvbW1hbmRMaW5lUGFja2FnZXMpIHtcbiAgICAvLyBTcGxpdCB0aGUgdmVyc2lvbiBhc2tlZCBvbiBjb21tYW5kIGxpbmUuXG4gICAgY29uc3QgbSA9IHBrZy5tYXRjaCgvXigoPzpAW14vXXsxLDEwMH1cXC8pP1teQF17MSwxMDB9KSg/OkAoLnsxLDEwMH0pKT8kLyk7XG4gICAgaWYgKCFtKSB7XG4gICAgICBsb2dnZXIud2FybihgSW52YWxpZCBwYWNrYWdlIGFyZ3VtZW50OiAke0pTT04uc3RyaW5naWZ5KHBrZyl9LiBTa2lwcGluZy5gKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IFssIG5wbU5hbWUsIG1heWJlVmVyc2lvbl0gPSBtO1xuXG4gICAgY29uc3QgdmVyc2lvbiA9IHByb2plY3REZXBzLmdldChucG1OYW1lKTtcbiAgICBpZiAoIXZlcnNpb24pIHtcbiAgICAgIGxvZ2dlci53YXJuKGBQYWNrYWdlIG5vdCBpbnN0YWxsZWQ6ICR7SlNPTi5zdHJpbmdpZnkobnBtTmFtZSl9LiBTa2lwcGluZy5gKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHBhY2thZ2VzLnNldChucG1OYW1lLCAobWF5YmVWZXJzaW9uIHx8IChvcHRpb25zLm5leHQgPyAnbmV4dCcgOiAnbGF0ZXN0JykpIGFzIFZlcnNpb25SYW5nZSk7XG4gIH1cblxuICByZXR1cm4gcGFja2FnZXM7XG59XG5cbmZ1bmN0aW9uIF9hZGRQYWNrYWdlR3JvdXAoXG4gIHRyZWU6IFRyZWUsXG4gIHBhY2thZ2VzOiBNYXA8c3RyaW5nLCBWZXJzaW9uUmFuZ2U+LFxuICBhbGxEZXBlbmRlbmNpZXM6IFJlYWRvbmx5TWFwPHN0cmluZywgVmVyc2lvblJhbmdlPixcbiAgbnBtUGFja2FnZUpzb246IE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbik6IHZvaWQge1xuICBjb25zdCBtYXliZVBhY2thZ2UgPSBwYWNrYWdlcy5nZXQobnBtUGFja2FnZUpzb24ubmFtZSk7XG4gIGlmICghbWF5YmVQYWNrYWdlKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgaW5mbyA9IF9idWlsZFBhY2thZ2VJbmZvKHRyZWUsIHBhY2thZ2VzLCBhbGxEZXBlbmRlbmNpZXMsIG5wbVBhY2thZ2VKc29uLCBsb2dnZXIpO1xuXG4gIGNvbnN0IHZlcnNpb24gPVxuICAgIChpbmZvLnRhcmdldCAmJiBpbmZvLnRhcmdldC52ZXJzaW9uKSB8fFxuICAgIG5wbVBhY2thZ2VKc29uWydkaXN0LXRhZ3MnXVttYXliZVBhY2thZ2VdIHx8XG4gICAgbWF5YmVQYWNrYWdlO1xuICBpZiAoIW5wbVBhY2thZ2VKc29uLnZlcnNpb25zW3ZlcnNpb25dKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IG5nVXBkYXRlTWV0YWRhdGEgPSBucG1QYWNrYWdlSnNvbi52ZXJzaW9uc1t2ZXJzaW9uXVsnbmctdXBkYXRlJ107XG4gIGlmICghbmdVcGRhdGVNZXRhZGF0YSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCBwYWNrYWdlR3JvdXAgPSBuZ1VwZGF0ZU1ldGFkYXRhWydwYWNrYWdlR3JvdXAnXTtcbiAgaWYgKCFwYWNrYWdlR3JvdXApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkocGFja2FnZUdyb3VwKSAmJiAhcGFja2FnZUdyb3VwLnNvbWUoKHgpID0+IHR5cGVvZiB4ICE9ICdzdHJpbmcnKSkge1xuICAgIHBhY2thZ2VHcm91cCA9IHBhY2thZ2VHcm91cC5yZWR1Y2UoKGFjYywgY3VycikgPT4ge1xuICAgICAgYWNjW2N1cnJdID0gbWF5YmVQYWNrYWdlO1xuXG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIHt9IGFzIHsgW25hbWU6IHN0cmluZ106IHN0cmluZyB9KTtcbiAgfVxuXG4gIC8vIE9ubHkgbmVlZCB0byBjaGVjayBpZiBpdCdzIGFuIG9iamVjdCBiZWNhdXNlIHdlIHNldCBpdCByaWdodCB0aGUgdGltZSBiZWZvcmUuXG4gIGlmIChcbiAgICB0eXBlb2YgcGFja2FnZUdyb3VwICE9ICdvYmplY3QnIHx8XG4gICAgcGFja2FnZUdyb3VwID09PSBudWxsIHx8XG4gICAgT2JqZWN0LnZhbHVlcyhwYWNrYWdlR3JvdXApLnNvbWUoKHYpID0+IHR5cGVvZiB2ICE9ICdzdHJpbmcnKVxuICApIHtcbiAgICBsb2dnZXIud2FybihgcGFja2FnZUdyb3VwIG1ldGFkYXRhIG9mIHBhY2thZ2UgJHtucG1QYWNrYWdlSnNvbi5uYW1lfSBpcyBtYWxmb3JtZWQuYCk7XG5cbiAgICByZXR1cm47XG4gIH1cblxuICBPYmplY3Qua2V5cyhwYWNrYWdlR3JvdXApXG4gICAgLmZpbHRlcigobmFtZSkgPT4gIXBhY2thZ2VzLmhhcyhuYW1lKSkgLy8gRG9uJ3Qgb3ZlcnJpZGUgbmFtZXMgZnJvbSB0aGUgY29tbWFuZCBsaW5lLlxuICAgIC5maWx0ZXIoKG5hbWUpID0+IGFsbERlcGVuZGVuY2llcy5oYXMobmFtZSkpIC8vIFJlbW92ZSBwYWNrYWdlcyB0aGF0IGFyZW4ndCBpbnN0YWxsZWQuXG4gICAgLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgIHBhY2thZ2VzLnNldChuYW1lLCBwYWNrYWdlR3JvdXBbbmFtZV0pO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIEFkZCBwZWVyIGRlcGVuZGVuY2llcyBvZiBwYWNrYWdlcyBvbiB0aGUgY29tbWFuZCBsaW5lIHRvIHRoZSBsaXN0IG9mIHBhY2thZ2VzIHRvIHVwZGF0ZS5cbiAqIFdlIGRvbid0IGRvIHZlcmlmaWNhdGlvbiBvZiB0aGUgdmVyc2lvbnMgaGVyZSBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSBhIGxhdGVyIHN0ZXAgKGFuZCBjYW5cbiAqIGJlIGlnbm9yZWQgYnkgdGhlIC0tZm9yY2UgZmxhZykuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfYWRkUGVlckRlcGVuZGVuY2llcyhcbiAgdHJlZTogVHJlZSxcbiAgcGFja2FnZXM6IE1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4sXG4gIGFsbERlcGVuZGVuY2llczogUmVhZG9ubHlNYXA8c3RyaW5nLCBWZXJzaW9uUmFuZ2U+LFxuICBucG1QYWNrYWdlSnNvbjogTnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uLFxuICBucG1QYWNrYWdlSnNvbk1hcDogTWFwPHN0cmluZywgTnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uPixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbik6IHZvaWQge1xuICBjb25zdCBtYXliZVBhY2thZ2UgPSBwYWNrYWdlcy5nZXQobnBtUGFja2FnZUpzb24ubmFtZSk7XG4gIGlmICghbWF5YmVQYWNrYWdlKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgaW5mbyA9IF9idWlsZFBhY2thZ2VJbmZvKHRyZWUsIHBhY2thZ2VzLCBhbGxEZXBlbmRlbmNpZXMsIG5wbVBhY2thZ2VKc29uLCBsb2dnZXIpO1xuXG4gIGNvbnN0IHZlcnNpb24gPVxuICAgIChpbmZvLnRhcmdldCAmJiBpbmZvLnRhcmdldC52ZXJzaW9uKSB8fFxuICAgIG5wbVBhY2thZ2VKc29uWydkaXN0LXRhZ3MnXVttYXliZVBhY2thZ2VdIHx8XG4gICAgbWF5YmVQYWNrYWdlO1xuICBpZiAoIW5wbVBhY2thZ2VKc29uLnZlcnNpb25zW3ZlcnNpb25dKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgcGFja2FnZUpzb24gPSBucG1QYWNrYWdlSnNvbi52ZXJzaW9uc1t2ZXJzaW9uXTtcbiAgY29uc3QgZXJyb3IgPSBmYWxzZTtcblxuICBmb3IgKGNvbnN0IFtwZWVyLCByYW5nZV0gb2YgT2JqZWN0LmVudHJpZXMocGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llcyB8fCB7fSkpIHtcbiAgICBpZiAocGFja2FnZXMuaGFzKHBlZXIpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBwZWVyUGFja2FnZUpzb24gPSBucG1QYWNrYWdlSnNvbk1hcC5nZXQocGVlcik7XG4gICAgaWYgKHBlZXJQYWNrYWdlSnNvbikge1xuICAgICAgY29uc3QgcGVlckluZm8gPSBfYnVpbGRQYWNrYWdlSW5mbyh0cmVlLCBwYWNrYWdlcywgYWxsRGVwZW5kZW5jaWVzLCBwZWVyUGFja2FnZUpzb24sIGxvZ2dlcik7XG4gICAgICBpZiAoc2VtdmVyLnNhdGlzZmllcyhwZWVySW5mby5pbnN0YWxsZWQudmVyc2lvbiwgcmFuZ2UpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHBhY2thZ2VzLnNldChwZWVyLCByYW5nZSBhcyBWZXJzaW9uUmFuZ2UpO1xuICB9XG5cbiAgaWYgKGVycm9yKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0FuIGVycm9yIG9jY3VyZWQsIHNlZSBhYm92ZS4nKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfZ2V0QWxsRGVwZW5kZW5jaWVzKHRyZWU6IFRyZWUpOiBBcnJheTxyZWFkb25seSBbc3RyaW5nLCBWZXJzaW9uUmFuZ2VdPiB7XG4gIGNvbnN0IHBhY2thZ2VKc29uQ29udGVudCA9IHRyZWUucmVhZCgnL3BhY2thZ2UuanNvbicpO1xuICBpZiAoIXBhY2thZ2VKc29uQ29udGVudCkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgZmluZCBhIHBhY2thZ2UuanNvbi4gQXJlIHlvdSBpbiBhIE5vZGUgcHJvamVjdD8nKTtcbiAgfVxuXG4gIGxldCBwYWNrYWdlSnNvbjogSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXM7XG4gIHRyeSB7XG4gICAgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHBhY2thZ2VKc29uQ29udGVudC50b1N0cmluZygpKSBhcyBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcztcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdwYWNrYWdlLmpzb24gY291bGQgbm90IGJlIHBhcnNlZDogJyArIGUubWVzc2FnZSk7XG4gIH1cblxuICByZXR1cm4gW1xuICAgIC4uLihPYmplY3QuZW50cmllcyhwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzIHx8IHt9KSBhcyBBcnJheTxbc3RyaW5nLCBWZXJzaW9uUmFuZ2VdPiksXG4gICAgLi4uKE9iamVjdC5lbnRyaWVzKHBhY2thZ2VKc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fSkgYXMgQXJyYXk8W3N0cmluZywgVmVyc2lvblJhbmdlXT4pLFxuICAgIC4uLihPYmplY3QuZW50cmllcyhwYWNrYWdlSnNvbi5kZXBlbmRlbmNpZXMgfHwge30pIGFzIEFycmF5PFtzdHJpbmcsIFZlcnNpb25SYW5nZV0+KSxcbiAgXTtcbn1cblxuZnVuY3Rpb24gX2Zvcm1hdFZlcnNpb24odmVyc2lvbjogc3RyaW5nIHwgdW5kZWZpbmVkKSB7XG4gIGlmICh2ZXJzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKCF2ZXJzaW9uLm1hdGNoKC9eXFxkezEsMzB9XFwuXFxkezEsMzB9XFwuXFxkezEsMzB9LykpIHtcbiAgICB2ZXJzaW9uICs9ICcuMCc7XG4gIH1cbiAgaWYgKCF2ZXJzaW9uLm1hdGNoKC9eXFxkezEsMzB9XFwuXFxkezEsMzB9XFwuXFxkezEsMzB9LykpIHtcbiAgICB2ZXJzaW9uICs9ICcuMCc7XG4gIH1cbiAgaWYgKCFzZW12ZXIudmFsaWQodmVyc2lvbikpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgSW52YWxpZCBtaWdyYXRpb24gdmVyc2lvbjogJHtKU09OLnN0cmluZ2lmeSh2ZXJzaW9uKX1gKTtcbiAgfVxuXG4gIHJldHVybiB2ZXJzaW9uO1xufVxuXG4vKipcbiAqIFJldHVybnMgd2hldGhlciBvciBub3QgdGhlIGdpdmVuIHBhY2thZ2Ugc3BlY2lmaWVyICh0aGUgdmFsdWUgc3RyaW5nIGluIGFcbiAqIGBwYWNrYWdlLmpzb25gIGRlcGVuZGVuY3kpIGlzIGhvc3RlZCBpbiB0aGUgTlBNIHJlZ2lzdHJ5LlxuICogQHRocm93cyBXaGVuIHRoZSBzcGVjaWZpZXIgY2Fubm90IGJlIHBhcnNlZC5cbiAqL1xuZnVuY3Rpb24gaXNQa2dGcm9tUmVnaXN0cnkobmFtZTogc3RyaW5nLCBzcGVjaWZpZXI6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCByZXN1bHQgPSBucGEucmVzb2x2ZShuYW1lLCBzcGVjaWZpZXIpO1xuXG4gIHJldHVybiAhIXJlc3VsdC5yZWdpc3RyeTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IFVwZGF0ZVNjaGVtYSk6IFJ1bGUge1xuICBpZiAoIW9wdGlvbnMucGFja2FnZXMpIHtcbiAgICAvLyBXZSBjYW5ub3QganVzdCByZXR1cm4gdGhpcyBiZWNhdXNlIHdlIG5lZWQgdG8gZmV0Y2ggdGhlIHBhY2thZ2VzIGZyb20gTlBNIHN0aWxsIGZvciB0aGVcbiAgICAvLyBoZWxwL2d1aWRlIHRvIHNob3cuXG4gICAgb3B0aW9ucy5wYWNrYWdlcyA9IFtdO1xuICB9IGVsc2Uge1xuICAgIC8vIFdlIHNwbGl0IGV2ZXJ5IHBhY2thZ2VzIGJ5IGNvbW1hcyB0byBhbGxvdyBwZW9wbGUgdG8gcGFzcyBpbiBtdWx0aXBsZSBhbmQgbWFrZSBpdCBhbiBhcnJheS5cbiAgICBvcHRpb25zLnBhY2thZ2VzID0gb3B0aW9ucy5wYWNrYWdlcy5yZWR1Y2UoKGFjYywgY3VycikgPT4ge1xuICAgICAgcmV0dXJuIGFjYy5jb25jYXQoY3Vyci5zcGxpdCgnLCcpKTtcbiAgICB9LCBbXSBhcyBzdHJpbmdbXSk7XG4gIH1cblxuICBpZiAob3B0aW9ucy5taWdyYXRlT25seSAmJiBvcHRpb25zLmZyb20pIHtcbiAgICBpZiAob3B0aW9ucy5wYWNrYWdlcy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCctLWZyb20gcmVxdWlyZXMgdGhhdCBvbmx5IGEgc2luZ2xlIHBhY2thZ2UgYmUgcGFzc2VkLicpO1xuICAgIH1cbiAgfVxuXG4gIG9wdGlvbnMuZnJvbSA9IF9mb3JtYXRWZXJzaW9uKG9wdGlvbnMuZnJvbSk7XG4gIG9wdGlvbnMudG8gPSBfZm9ybWF0VmVyc2lvbihvcHRpb25zLnRvKTtcbiAgY29uc3QgdXNpbmdZYXJuID0gb3B0aW9ucy5wYWNrYWdlTWFuYWdlciA9PT0gJ3lhcm4nO1xuXG4gIHJldHVybiBhc3luYyAodHJlZTogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IGxvZ2dlciA9IGNvbnRleHQubG9nZ2VyO1xuICAgIGNvbnN0IG5wbURlcHMgPSBuZXcgTWFwKFxuICAgICAgX2dldEFsbERlcGVuZGVuY2llcyh0cmVlKS5maWx0ZXIoKFtuYW1lLCBzcGVjaWZpZXJdKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIGlzUGtnRnJvbVJlZ2lzdHJ5KG5hbWUsIHNwZWNpZmllcik7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIGxvZ2dlci53YXJuKGBQYWNrYWdlICR7bmFtZX0gd2FzIG5vdCBmb3VuZCBvbiB0aGUgcmVnaXN0cnkuIFNraXBwaW5nLmApO1xuXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICApO1xuICAgIGNvbnN0IHBhY2thZ2VzID0gX2J1aWxkUGFja2FnZUxpc3Qob3B0aW9ucywgbnBtRGVwcywgbG9nZ2VyKTtcblxuICAgIC8vIEdyYWIgYWxsIHBhY2thZ2UuanNvbiBmcm9tIHRoZSBucG0gcmVwb3NpdG9yeS4gVGhpcyByZXF1aXJlcyBhIGxvdCBvZiBIVFRQIGNhbGxzIHNvIHdlXG4gICAgLy8gdHJ5IHRvIHBhcmFsbGVsaXplIGFzIG1hbnkgYXMgcG9zc2libGUuXG4gICAgY29uc3QgYWxsUGFja2FnZU1ldGFkYXRhID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICBBcnJheS5mcm9tKG5wbURlcHMua2V5cygpKS5tYXAoKGRlcE5hbWUpID0+XG4gICAgICAgIGdldE5wbVBhY2thZ2VKc29uKGRlcE5hbWUsIGxvZ2dlciwge1xuICAgICAgICAgIHJlZ2lzdHJ5OiBvcHRpb25zLnJlZ2lzdHJ5LFxuICAgICAgICAgIHVzaW5nWWFybixcbiAgICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gICAgLy8gQnVpbGQgYSBtYXAgb2YgYWxsIGRlcGVuZGVuY2llcyBhbmQgdGhlaXIgcGFja2FnZUpzb24uXG4gICAgY29uc3QgbnBtUGFja2FnZUpzb25NYXAgPSBhbGxQYWNrYWdlTWV0YWRhdGEucmVkdWNlKChhY2MsIG5wbVBhY2thZ2VKc29uKSA9PiB7XG4gICAgICAvLyBJZiB0aGUgcGFja2FnZSB3YXMgbm90IGZvdW5kIG9uIHRoZSByZWdpc3RyeS4gSXQgY291bGQgYmUgcHJpdmF0ZSwgc28gd2Ugd2lsbCBqdXN0XG4gICAgICAvLyBpZ25vcmUuIElmIHRoZSBwYWNrYWdlIHdhcyBwYXJ0IG9mIHRoZSBsaXN0LCB3ZSB3aWxsIGVycm9yIG91dCwgYnV0IHdpbGwgc2ltcGx5IGlnbm9yZVxuICAgICAgLy8gaWYgaXQncyBlaXRoZXIgbm90IHJlcXVlc3RlZCAoc28ganVzdCBwYXJ0IG9mIHBhY2thZ2UuanNvbi4gc2lsZW50bHkpLlxuICAgICAgaWYgKCFucG1QYWNrYWdlSnNvbi5uYW1lKSB7XG4gICAgICAgIGlmIChucG1QYWNrYWdlSnNvbi5yZXF1ZXN0ZWROYW1lICYmIHBhY2thZ2VzLmhhcyhucG1QYWNrYWdlSnNvbi5yZXF1ZXN0ZWROYW1lKSkge1xuICAgICAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKFxuICAgICAgICAgICAgYFBhY2thZ2UgJHtKU09OLnN0cmluZ2lmeShucG1QYWNrYWdlSnNvbi5yZXF1ZXN0ZWROYW1lKX0gd2FzIG5vdCBmb3VuZCBvbiB0aGUgYCArXG4gICAgICAgICAgICAgICdyZWdpc3RyeS4gQ2Fubm90IGNvbnRpbnVlIGFzIHRoaXMgbWF5IGJlIGFuIGVycm9yLicsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgYSBuYW1lIGlzIHByZXNlbnQsIGl0IGlzIGFzc3VtZWQgdG8gYmUgZnVsbHkgcG9wdWxhdGVkXG4gICAgICAgIGFjYy5zZXQobnBtUGFja2FnZUpzb24ubmFtZSwgbnBtUGFja2FnZUpzb24gYXMgTnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCBuZXcgTWFwPHN0cmluZywgTnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uPigpKTtcblxuICAgIC8vIEF1Z21lbnQgdGhlIGNvbW1hbmQgbGluZSBwYWNrYWdlIGxpc3Qgd2l0aCBwYWNrYWdlR3JvdXBzIGFuZCBmb3J3YXJkIHBlZXIgZGVwZW5kZW5jaWVzLlxuICAgIC8vIEVhY2ggYWRkZWQgcGFja2FnZSBtYXkgdW5jb3ZlciBuZXcgcGFja2FnZSBncm91cHMgYW5kIHBlZXIgZGVwZW5kZW5jaWVzLCBzbyB3ZSBtdXN0XG4gICAgLy8gcmVwZWF0IHRoaXMgcHJvY2VzcyB1bnRpbCB0aGUgcGFja2FnZSBsaXN0IHN0YWJpbGl6ZXMuXG4gICAgbGV0IGxhc3RQYWNrYWdlc1NpemU7XG4gICAgZG8ge1xuICAgICAgbGFzdFBhY2thZ2VzU2l6ZSA9IHBhY2thZ2VzLnNpemU7XG4gICAgICBucG1QYWNrYWdlSnNvbk1hcC5mb3JFYWNoKChucG1QYWNrYWdlSnNvbikgPT4ge1xuICAgICAgICBfYWRkUGFja2FnZUdyb3VwKHRyZWUsIHBhY2thZ2VzLCBucG1EZXBzLCBucG1QYWNrYWdlSnNvbiwgbG9nZ2VyKTtcbiAgICAgICAgX2FkZFBlZXJEZXBlbmRlbmNpZXModHJlZSwgcGFja2FnZXMsIG5wbURlcHMsIG5wbVBhY2thZ2VKc29uLCBucG1QYWNrYWdlSnNvbk1hcCwgbG9nZ2VyKTtcbiAgICAgIH0pO1xuICAgIH0gd2hpbGUgKHBhY2thZ2VzLnNpemUgPiBsYXN0UGFja2FnZXNTaXplKTtcblxuICAgIC8vIEJ1aWxkIHRoZSBQYWNrYWdlSW5mbyBmb3IgZWFjaCBtb2R1bGUuXG4gICAgY29uc3QgcGFja2FnZUluZm9NYXAgPSBuZXcgTWFwPHN0cmluZywgUGFja2FnZUluZm8+KCk7XG4gICAgbnBtUGFja2FnZUpzb25NYXAuZm9yRWFjaCgobnBtUGFja2FnZUpzb24pID0+IHtcbiAgICAgIHBhY2thZ2VJbmZvTWFwLnNldChcbiAgICAgICAgbnBtUGFja2FnZUpzb24ubmFtZSxcbiAgICAgICAgX2J1aWxkUGFja2FnZUluZm8odHJlZSwgcGFja2FnZXMsIG5wbURlcHMsIG5wbVBhY2thZ2VKc29uLCBsb2dnZXIpLFxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIC8vIE5vdyB0aGF0IHdlIGhhdmUgYWxsIHRoZSBpbmZvcm1hdGlvbiwgY2hlY2sgdGhlIGZsYWdzLlxuICAgIGlmIChwYWNrYWdlcy5zaXplID4gMCkge1xuICAgICAgaWYgKG9wdGlvbnMubWlncmF0ZU9ubHkgJiYgb3B0aW9ucy5mcm9tICYmIG9wdGlvbnMucGFja2FnZXMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzdWJsb2cgPSBuZXcgbG9nZ2luZy5MZXZlbENhcExvZ2dlcigndmFsaWRhdGlvbicsIGxvZ2dlci5jcmVhdGVDaGlsZCgnJyksICd3YXJuJyk7XG4gICAgICBfdmFsaWRhdGVVcGRhdGVQYWNrYWdlcyhwYWNrYWdlSW5mb01hcCwgISFvcHRpb25zLmZvcmNlLCAhIW9wdGlvbnMubmV4dCwgc3VibG9nKTtcblxuICAgICAgX3BlcmZvcm1VcGRhdGUodHJlZSwgY29udGV4dCwgcGFja2FnZUluZm9NYXAsIGxvZ2dlciwgISFvcHRpb25zLm1pZ3JhdGVPbmx5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgX3VzYWdlTWVzc2FnZShvcHRpb25zLCBwYWNrYWdlSW5mb01hcCwgbG9nZ2VyKTtcbiAgICB9XG4gIH07XG59XG4iXX0=