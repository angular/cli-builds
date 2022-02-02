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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZHMvdXBkYXRlL3NjaGVtYXRpYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQXFEO0FBQ3JELDJEQUErRjtBQUMvRixxREFBdUM7QUFDdkMsK0NBQWlDO0FBRWpDLDZFQUdnRDtBQU1oRCxrR0FBa0c7QUFDbEcsK0ZBQStGO0FBQy9GLDhGQUE4RjtBQUM5Rix3RkFBd0Y7QUFDeEYscUNBQXFDO0FBQ3JDLFNBQWdCLDJCQUEyQixDQUFDLEtBQWE7SUFDdkQsSUFBSSxRQUFRLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QyxJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2IsT0FBTyxLQUFLLENBQUM7S0FDZDtJQUNELElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztJQUNkLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxNQUFNLEVBQUUsUUFBUSxDQUFDLEVBQUU7UUFDNUMsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLEtBQUssSUFBSSxFQUFFLEVBQUU7WUFDZixzREFBc0Q7WUFDdEQsaURBQWlEO1lBQ2pELE9BQU8sUUFBUSxDQUFDO1NBQ2pCO0tBQ0Y7SUFFRCw0RkFBNEY7SUFDNUYsZ0dBQWdHO0lBQ2hHLDBGQUEwRjtJQUMxRixRQUFRLEdBQUcsS0FBSyxDQUFDO0lBQ2pCLEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUU7UUFDdkMsUUFBUSxJQUFJLFFBQVEsS0FBSyxJQUFJLEtBQUssYUFBYSxDQUFDO0tBQ2pEO0lBRUQsT0FBTyxNQUFNLENBQUMsVUFBVSxDQUFD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LElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRTtnQkFDM0QsT0FBTzthQUNSO1lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxjQUFPLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3hGLHVCQUF1QixDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUVqRixjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDOUU7YUFBTTtZQUNMLGFBQWEsQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ2hEO0lBQ0gsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXhHRCw0QkF3R0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgbG9nZ2luZywgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IFJ1bGUsIFNjaGVtYXRpY0NvbnRleHQsIFNjaGVtYXRpY3NFeGNlcHRpb24sIFRyZWUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgKiBhcyBucGEgZnJvbSAnbnBtLXBhY2thZ2UtYXJnJztcbmltcG9ydCAqIGFzIHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgRGVwZW5kZW5jeSwgSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXMgfSBmcm9tICcuLi8uLi8uLi8uLi91dGlsaXRpZXMvcGFja2FnZS1qc29uJztcbmltcG9ydCB7XG4gIE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbixcbiAgZ2V0TnBtUGFja2FnZUpzb24sXG59IGZyb20gJy4uLy4uLy4uLy4uL3V0aWxpdGllcy9wYWNrYWdlLW1ldGFkYXRhJztcbmltcG9ydCB7IFNjaGVtYSBhcyBVcGRhdGVTY2hlbWEgfSBmcm9tICcuL3NjaGVtYSc7XG5cbnR5cGUgVmVyc2lvblJhbmdlID0gc3RyaW5nICYgeyBfX1ZFUlNJT05fUkFOR0U6IHZvaWQgfTtcbnR5cGUgUGVlclZlcnNpb25UcmFuc2Zvcm0gPSBzdHJpbmcgfCAoKHJhbmdlOiBzdHJpbmcpID0+IHN0cmluZyk7XG5cbi8vIEFuZ3VsYXIgZ3VhcmFudGVlcyB0aGF0IGEgbWFqb3IgaXMgY29tcGF0aWJsZSB3aXRoIGl0cyBmb2xsb3dpbmcgbWFqb3IgKHNvIHBhY2thZ2VzIHRoYXQgZGVwZW5kXG4vLyBvbiBBbmd1bGFyIDUgYXJlIGFsc28gY29tcGF0aWJsZSB3aXRoIEFuZ3VsYXIgNikuIFRoaXMgaXMsIGluIGNvZGUsIHJlcHJlc2VudGVkIGJ5IHZlcmlmeWluZ1xuLy8gdGhhdCBhbGwgb3RoZXIgcGFja2FnZXMgdGhhdCBoYXZlIGEgcGVlciBkZXBlbmRlbmN5IG9mIGBcIkBhbmd1bGFyL2NvcmVcIjogXCJeNS4wLjBcImAgYWN0dWFsbHlcbi8vIHN1cHBvcnRzIDYuMCwgYnkgYWRkaW5nIHRoYXQgY29tcGF0aWJpbGl0eSB0byB0aGUgcmFuZ2UsIHNvIGl0IGlzIGBeNS4wLjAgfHwgXjYuMC4wYC5cbi8vIFdlIGV4cG9ydCBpdCB0byBhbGxvdyBmb3IgdGVzdGluZy5cbmV4cG9ydCBmdW5jdGlvbiBhbmd1bGFyTWFqb3JDb21wYXRHdWFyYW50ZWUocmFuZ2U6IHN0cmluZykge1xuICBsZXQgbmV3UmFuZ2UgPSBzZW12ZXIudmFsaWRSYW5nZShyYW5nZSk7XG4gIGlmICghbmV3UmFuZ2UpIHtcbiAgICByZXR1cm4gcmFuZ2U7XG4gIH1cbiAgbGV0IG1ham9yID0gMTtcbiAgd2hpbGUgKCFzZW12ZXIuZ3RyKG1ham9yICsgJy4wLjAnLCBuZXdSYW5nZSkpIHtcbiAgICBtYWpvcisrO1xuICAgIGlmIChtYWpvciA+PSA5OSkge1xuICAgICAgLy8gVXNlIG9yaWdpbmFsIHJhbmdlIGlmIGl0IHN1cHBvcnRzIGEgbWFqb3IgdGhpcyBoaWdoXG4gICAgICAvLyBSYW5nZSBpcyBtb3N0IGxpa2VseSB1bmJvdW5kZWQgKGUuZy4sID49NS4wLjApXG4gICAgICByZXR1cm4gbmV3UmFuZ2U7XG4gICAgfVxuICB9XG5cbiAgLy8gQWRkIHRoZSBtYWpvciB2ZXJzaW9uIGFzIGNvbXBhdGlibGUgd2l0aCB0aGUgYW5ndWxhciBjb21wYXRpYmxlLCB3aXRoIGFsbCBtaW5vcnMuIFRoaXMgaXNcbiAgLy8gYWxyZWFkeSBvbmUgbWFqb3IgYWJvdmUgdGhlIGdyZWF0ZXN0IHN1cHBvcnRlZCwgYmVjYXVzZSB3ZSBpbmNyZW1lbnQgYG1ham9yYCBiZWZvcmUgY2hlY2tpbmcuXG4gIC8vIFdlIGFkZCBtaW5vcnMgbGlrZSB0aGlzIGJlY2F1c2UgYSBtaW5vciBiZXRhIGlzIHN0aWxsIGNvbXBhdGlibGUgd2l0aCBhIG1pbm9yIG5vbi1iZXRhLlxuICBuZXdSYW5nZSA9IHJhbmdlO1xuICBmb3IgKGxldCBtaW5vciA9IDA7IG1pbm9yIDwgMjA7IG1pbm9yKyspIHtcbiAgICBuZXdSYW5nZSArPSBgIHx8IF4ke21ham9yfS4ke21pbm9yfS4wLWFscGhhLjAgYDtcbiAgfVxuXG4gIHJldHVybiBzZW12ZXIudmFsaWRSYW5nZShuZXdSYW5nZSkgfHwgcmFuZ2U7XG59XG5cbi8vIFRoaXMgaXMgYSBtYXAgb2YgcGFja2FnZUdyb3VwTmFtZSB0byByYW5nZSBleHRlbmRpbmcgZnVuY3Rpb24uIElmIGl0IGlzbid0IGZvdW5kLCB0aGUgcmFuZ2UgaXNcbi8vIGtlcHQgdGhlIHNhbWUuXG5jb25zdCBrbm93blBlZXJDb21wYXRpYmxlTGlzdDogeyBbbmFtZTogc3RyaW5nXTogUGVlclZlcnNpb25UcmFuc2Zvcm0gfSA9IHtcbiAgJ0Bhbmd1bGFyL2NvcmUnOiBhbmd1bGFyTWFqb3JDb21wYXRHdWFyYW50ZWUsXG59O1xuXG5pbnRlcmZhY2UgUGFja2FnZVZlcnNpb25JbmZvIHtcbiAgdmVyc2lvbjogVmVyc2lvblJhbmdlO1xuICBwYWNrYWdlSnNvbjogSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXM7XG4gIHVwZGF0ZU1ldGFkYXRhOiBVcGRhdGVNZXRhZGF0YTtcbn1cblxuaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBucG1QYWNrYWdlSnNvbjogTnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uO1xuICBpbnN0YWxsZWQ6IFBhY2thZ2VWZXJzaW9uSW5mbztcbiAgdGFyZ2V0PzogUGFja2FnZVZlcnNpb25JbmZvO1xuICBwYWNrYWdlSnNvblJhbmdlOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBVcGRhdGVNZXRhZGF0YSB7XG4gIHBhY2thZ2VHcm91cE5hbWU/OiBzdHJpbmc7XG4gIHBhY2thZ2VHcm91cDogeyBbcGFja2FnZU5hbWU6IHN0cmluZ106IHN0cmluZyB9O1xuICByZXF1aXJlbWVudHM6IHsgW3BhY2thZ2VOYW1lOiBzdHJpbmddOiBzdHJpbmcgfTtcbiAgbWlncmF0aW9ucz86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gX3VwZGF0ZVBlZXJWZXJzaW9uKGluZm9NYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPiwgbmFtZTogc3RyaW5nLCByYW5nZTogc3RyaW5nKSB7XG4gIC8vIFJlc29sdmUgcGFja2FnZUdyb3VwTmFtZS5cbiAgY29uc3QgbWF5YmVQYWNrYWdlSW5mbyA9IGluZm9NYXAuZ2V0KG5hbWUpO1xuICBpZiAoIW1heWJlUGFja2FnZUluZm8pIHtcbiAgICByZXR1cm4gcmFuZ2U7XG4gIH1cbiAgaWYgKG1heWJlUGFja2FnZUluZm8udGFyZ2V0KSB7XG4gICAgbmFtZSA9IG1heWJlUGFja2FnZUluZm8udGFyZ2V0LnVwZGF0ZU1ldGFkYXRhLnBhY2thZ2VHcm91cE5hbWUgfHwgbmFtZTtcbiAgfSBlbHNlIHtcbiAgICBuYW1lID0gbWF5YmVQYWNrYWdlSW5mby5pbnN0YWxsZWQudXBkYXRlTWV0YWRhdGEucGFja2FnZUdyb3VwTmFtZSB8fCBuYW1lO1xuICB9XG5cbiAgY29uc3QgbWF5YmVUcmFuc2Zvcm0gPSBrbm93blBlZXJDb21wYXRpYmxlTGlzdFtuYW1lXTtcbiAgaWYgKG1heWJlVHJhbnNmb3JtKSB7XG4gICAgaWYgKHR5cGVvZiBtYXliZVRyYW5zZm9ybSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gbWF5YmVUcmFuc2Zvcm0ocmFuZ2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbWF5YmVUcmFuc2Zvcm07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJhbmdlO1xufVxuXG5mdW5jdGlvbiBfdmFsaWRhdGVGb3J3YXJkUGVlckRlcGVuZGVuY2llcyhcbiAgbmFtZTogc3RyaW5nLFxuICBpbmZvTWFwOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz4sXG4gIHBlZXJzOiB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfSxcbiAgcGVlcnNNZXRhOiB7IFtuYW1lOiBzdHJpbmddOiB7IG9wdGlvbmFsPzogYm9vbGVhbiB9IH0sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4gIG5leHQ6IGJvb2xlYW4sXG4pOiBib29sZWFuIHtcbiAgbGV0IHZhbGlkYXRpb25GYWlsZWQgPSBmYWxzZTtcbiAgZm9yIChjb25zdCBbcGVlciwgcmFuZ2VdIG9mIE9iamVjdC5lbnRyaWVzKHBlZXJzKSkge1xuICAgIGxvZ2dlci5kZWJ1ZyhgQ2hlY2tpbmcgZm9yd2FyZCBwZWVyICR7cGVlcn0uLi5gKTtcbiAgICBjb25zdCBtYXliZVBlZXJJbmZvID0gaW5mb01hcC5nZXQocGVlcik7XG4gICAgY29uc3QgaXNPcHRpb25hbCA9IHBlZXJzTWV0YVtwZWVyXSAmJiAhIXBlZXJzTWV0YVtwZWVyXS5vcHRpb25hbDtcbiAgICBpZiAoIW1heWJlUGVlckluZm8pIHtcbiAgICAgIGlmICghaXNPcHRpb25hbCkge1xuICAgICAgICBsb2dnZXIud2FybihcbiAgICAgICAgICBbXG4gICAgICAgICAgICBgUGFja2FnZSAke0pTT04uc3RyaW5naWZ5KG5hbWUpfSBoYXMgYSBtaXNzaW5nIHBlZXIgZGVwZW5kZW5jeSBvZmAsXG4gICAgICAgICAgICBgJHtKU09OLnN0cmluZ2lmeShwZWVyKX0gQCAke0pTT04uc3RyaW5naWZ5KHJhbmdlKX0uYCxcbiAgICAgICAgICBdLmpvaW4oJyAnKSxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgcGVlclZlcnNpb24gPVxuICAgICAgbWF5YmVQZWVySW5mby50YXJnZXQgJiYgbWF5YmVQZWVySW5mby50YXJnZXQucGFja2FnZUpzb24udmVyc2lvblxuICAgICAgICA/IG1heWJlUGVlckluZm8udGFyZ2V0LnBhY2thZ2VKc29uLnZlcnNpb25cbiAgICAgICAgOiBtYXliZVBlZXJJbmZvLmluc3RhbGxlZC52ZXJzaW9uO1xuXG4gICAgbG9nZ2VyLmRlYnVnKGAgIFJhbmdlIGludGVyc2VjdHMoJHtyYW5nZX0sICR7cGVlclZlcnNpb259KS4uLmApO1xuICAgIGlmICghc2VtdmVyLnNhdGlzZmllcyhwZWVyVmVyc2lvbiwgcmFuZ2UsIHsgaW5jbHVkZVByZXJlbGVhc2U6IG5leHQgfHwgdW5kZWZpbmVkIH0pKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgIFtcbiAgICAgICAgICBgUGFja2FnZSAke0pTT04uc3RyaW5naWZ5KG5hbWUpfSBoYXMgYW4gaW5jb21wYXRpYmxlIHBlZXIgZGVwZW5kZW5jeSB0b2AsXG4gICAgICAgICAgYCR7SlNPTi5zdHJpbmdpZnkocGVlcil9IChyZXF1aXJlcyAke0pTT04uc3RyaW5naWZ5KHJhbmdlKX0sYCxcbiAgICAgICAgICBgd291bGQgaW5zdGFsbCAke0pTT04uc3RyaW5naWZ5KHBlZXJWZXJzaW9uKX0pYCxcbiAgICAgICAgXS5qb2luKCcgJyksXG4gICAgICApO1xuXG4gICAgICB2YWxpZGF0aW9uRmFpbGVkID0gdHJ1ZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB2YWxpZGF0aW9uRmFpbGVkO1xufVxuXG5mdW5jdGlvbiBfdmFsaWRhdGVSZXZlcnNlUGVlckRlcGVuZGVuY2llcyhcbiAgbmFtZTogc3RyaW5nLFxuICB2ZXJzaW9uOiBzdHJpbmcsXG4gIGluZm9NYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbiAgbmV4dDogYm9vbGVhbixcbikge1xuICBmb3IgKGNvbnN0IFtpbnN0YWxsZWQsIGluc3RhbGxlZEluZm9dIG9mIGluZm9NYXAuZW50cmllcygpKSB7XG4gICAgY29uc3QgaW5zdGFsbGVkTG9nZ2VyID0gbG9nZ2VyLmNyZWF0ZUNoaWxkKGluc3RhbGxlZCk7XG4gICAgaW5zdGFsbGVkTG9nZ2VyLmRlYnVnKGAke2luc3RhbGxlZH0uLi5gKTtcbiAgICBjb25zdCBwZWVycyA9IChpbnN0YWxsZWRJbmZvLnRhcmdldCB8fCBpbnN0YWxsZWRJbmZvLmluc3RhbGxlZCkucGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llcztcblxuICAgIGZvciAoY29uc3QgW3BlZXIsIHJhbmdlXSBvZiBPYmplY3QuZW50cmllcyhwZWVycyB8fCB7fSkpIHtcbiAgICAgIGlmIChwZWVyICE9IG5hbWUpIHtcbiAgICAgICAgLy8gT25seSBjaGVjayBwZWVycyB0byB0aGUgcGFja2FnZXMgd2UncmUgdXBkYXRpbmcuIFdlIGRvbid0IGNhcmUgYWJvdXQgcGVlcnNcbiAgICAgICAgLy8gdGhhdCBhcmUgdW5tZXQgYnV0IHdlIGhhdmUgbm8gZWZmZWN0IG9uLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWdub3JlIHBlZXJEZXBlbmRlbmN5IG1pc21hdGNoZXMgZm9yIHRoZXNlIHBhY2thZ2VzLlxuICAgICAgLy8gVGhleSBhcmUgZGVwcmVjYXRlZCBhbmQgcmVtb3ZlZCB2aWEgYSBtaWdyYXRpb24uXG4gICAgICBjb25zdCBpZ25vcmVkUGFja2FnZXMgPSBbXG4gICAgICAgICdjb2RlbHl6ZXInLFxuICAgICAgICAnQHNjaGVtYXRpY3MvdXBkYXRlJyxcbiAgICAgICAgJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1uZy1wYWNrYWdyJyxcbiAgICAgICAgJ3RzaWNrbGUnLFxuICAgICAgXTtcbiAgICAgIGlmIChpZ25vcmVkUGFja2FnZXMuaW5jbHVkZXMoaW5zdGFsbGVkKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gT3ZlcnJpZGUgdGhlIHBlZXIgdmVyc2lvbiByYW5nZSBpZiBpdCdzIGtub3duIGFzIGEgY29tcGF0aWJsZS5cbiAgICAgIGNvbnN0IGV4dGVuZGVkUmFuZ2UgPSBfdXBkYXRlUGVlclZlcnNpb24oaW5mb01hcCwgcGVlciwgcmFuZ2UpO1xuXG4gICAgICBpZiAoIXNlbXZlci5zYXRpc2ZpZXModmVyc2lvbiwgZXh0ZW5kZWRSYW5nZSwgeyBpbmNsdWRlUHJlcmVsZWFzZTogbmV4dCB8fCB1bmRlZmluZWQgfSkpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgIFtcbiAgICAgICAgICAgIGBQYWNrYWdlICR7SlNPTi5zdHJpbmdpZnkoaW5zdGFsbGVkKX0gaGFzIGFuIGluY29tcGF0aWJsZSBwZWVyIGRlcGVuZGVuY3kgdG9gLFxuICAgICAgICAgICAgYCR7SlNPTi5zdHJpbmdpZnkobmFtZSl9IChyZXF1aXJlc2AsXG4gICAgICAgICAgICBgJHtKU09OLnN0cmluZ2lmeShyYW5nZSl9JHtleHRlbmRlZFJhbmdlID09IHJhbmdlID8gJycgOiAnIChleHRlbmRlZCknfSxgLFxuICAgICAgICAgICAgYHdvdWxkIGluc3RhbGwgJHtKU09OLnN0cmluZ2lmeSh2ZXJzaW9uKX0pLmAsXG4gICAgICAgICAgXS5qb2luKCcgJyksXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBfdmFsaWRhdGVVcGRhdGVQYWNrYWdlcyhcbiAgaW5mb01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm8+LFxuICBmb3JjZTogYm9vbGVhbixcbiAgbmV4dDogYm9vbGVhbixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbik6IHZvaWQge1xuICBsb2dnZXIuZGVidWcoJ1VwZGF0aW5nIHRoZSBmb2xsb3dpbmcgcGFja2FnZXM6Jyk7XG4gIGluZm9NYXAuZm9yRWFjaCgoaW5mbykgPT4ge1xuICAgIGlmIChpbmZvLnRhcmdldCkge1xuICAgICAgbG9nZ2VyLmRlYnVnKGAgICR7aW5mby5uYW1lfSA9PiAke2luZm8udGFyZ2V0LnZlcnNpb259YCk7XG4gICAgfVxuICB9KTtcblxuICBsZXQgcGVlckVycm9ycyA9IGZhbHNlO1xuICBpbmZvTWFwLmZvckVhY2goKGluZm8pID0+IHtcbiAgICBjb25zdCB7IG5hbWUsIHRhcmdldCB9ID0gaW5mbztcbiAgICBpZiAoIXRhcmdldCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHBrZ0xvZ2dlciA9IGxvZ2dlci5jcmVhdGVDaGlsZChuYW1lKTtcbiAgICBsb2dnZXIuZGVidWcoYCR7bmFtZX0uLi5gKTtcblxuICAgIGNvbnN0IHsgcGVlckRlcGVuZGVuY2llcyA9IHt9LCBwZWVyRGVwZW5kZW5jaWVzTWV0YSA9IHt9IH0gPSB0YXJnZXQucGFja2FnZUpzb247XG4gICAgcGVlckVycm9ycyA9XG4gICAgICBfdmFsaWRhdGVGb3J3YXJkUGVlckRlcGVuZGVuY2llcyhcbiAgICAgICAgbmFtZSxcbiAgICAgICAgaW5mb01hcCxcbiAgICAgICAgcGVlckRlcGVuZGVuY2llcyxcbiAgICAgICAgcGVlckRlcGVuZGVuY2llc01ldGEsXG4gICAgICAgIHBrZ0xvZ2dlcixcbiAgICAgICAgbmV4dCxcbiAgICAgICkgfHwgcGVlckVycm9ycztcbiAgICBwZWVyRXJyb3JzID1cbiAgICAgIF92YWxpZGF0ZVJldmVyc2VQZWVyRGVwZW5kZW5jaWVzKG5hbWUsIHRhcmdldC52ZXJzaW9uLCBpbmZvTWFwLCBwa2dMb2dnZXIsIG5leHQpIHx8XG4gICAgICBwZWVyRXJyb3JzO1xuICB9KTtcblxuICBpZiAoIWZvcmNlICYmIHBlZXJFcnJvcnMpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbih0YWdzLnN0cmlwSW5kZW50c2BJbmNvbXBhdGlibGUgcGVlciBkZXBlbmRlbmNpZXMgZm91bmQuXG4gICAgICBQZWVyIGRlcGVuZGVuY3kgd2FybmluZ3Mgd2hlbiBpbnN0YWxsaW5nIGRlcGVuZGVuY2llcyBtZWFucyB0aGF0IHRob3NlIGRlcGVuZGVuY2llcyBtaWdodCBub3Qgd29yayBjb3JyZWN0bHkgdG9nZXRoZXIuXG4gICAgICBZb3UgY2FuIHVzZSB0aGUgJy0tZm9yY2UnIG9wdGlvbiB0byBpZ25vcmUgaW5jb21wYXRpYmxlIHBlZXIgZGVwZW5kZW5jaWVzIGFuZCBpbnN0ZWFkIGFkZHJlc3MgdGhlc2Ugd2FybmluZ3MgbGF0ZXIuYCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX3BlcmZvcm1VcGRhdGUoXG4gIHRyZWU6IFRyZWUsXG4gIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQsXG4gIGluZm9NYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbiAgbWlncmF0ZU9ubHk6IGJvb2xlYW4sXG4pOiB2b2lkIHtcbiAgY29uc3QgcGFja2FnZUpzb25Db250ZW50ID0gdHJlZS5yZWFkKCcvcGFja2FnZS5qc29uJyk7XG4gIGlmICghcGFja2FnZUpzb25Db250ZW50KSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIGEgcGFja2FnZS5qc29uLiBBcmUgeW91IGluIGEgTm9kZSBwcm9qZWN0PycpO1xuICB9XG5cbiAgbGV0IHBhY2thZ2VKc29uOiBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcztcbiAgdHJ5IHtcbiAgICBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25Db250ZW50LnRvU3RyaW5nKCkpIGFzIEpzb25TY2hlbWFGb3JOcG1QYWNrYWdlSnNvbkZpbGVzO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ3BhY2thZ2UuanNvbiBjb3VsZCBub3QgYmUgcGFyc2VkOiAnICsgZS5tZXNzYWdlKTtcbiAgfVxuXG4gIGNvbnN0IHVwZGF0ZURlcGVuZGVuY3kgPSAoZGVwczogRGVwZW5kZW5jeSwgbmFtZTogc3RyaW5nLCBuZXdWZXJzaW9uOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBvbGRWZXJzaW9uID0gZGVwc1tuYW1lXTtcbiAgICAvLyBXZSBvbmx5IHJlc3BlY3QgY2FyZXQgYW5kIHRpbGRlIHJhbmdlcyBvbiB1cGRhdGUuXG4gICAgY29uc3QgZXhlY1Jlc3VsdCA9IC9eW1xcXn5dLy5leGVjKG9sZFZlcnNpb24pO1xuICAgIGRlcHNbbmFtZV0gPSBgJHtleGVjUmVzdWx0ID8gZXhlY1Jlc3VsdFswXSA6ICcnfSR7bmV3VmVyc2lvbn1gO1xuICB9O1xuXG4gIGNvbnN0IHRvSW5zdGFsbCA9IFsuLi5pbmZvTWFwLnZhbHVlcygpXVxuICAgIC5tYXAoKHgpID0+IFt4Lm5hbWUsIHgudGFyZ2V0LCB4Lmluc3RhbGxlZF0pXG4gICAgLmZpbHRlcigoW25hbWUsIHRhcmdldCwgaW5zdGFsbGVkXSkgPT4ge1xuICAgICAgcmV0dXJuICEhbmFtZSAmJiAhIXRhcmdldCAmJiAhIWluc3RhbGxlZDtcbiAgICB9KSBhcyBbc3RyaW5nLCBQYWNrYWdlVmVyc2lvbkluZm8sIFBhY2thZ2VWZXJzaW9uSW5mb11bXTtcblxuICB0b0luc3RhbGwuZm9yRWFjaCgoW25hbWUsIHRhcmdldCwgaW5zdGFsbGVkXSkgPT4ge1xuICAgIGxvZ2dlci5pbmZvKFxuICAgICAgYFVwZGF0aW5nIHBhY2thZ2UuanNvbiB3aXRoIGRlcGVuZGVuY3kgJHtuYW1lfSBgICtcbiAgICAgICAgYEAgJHtKU09OLnN0cmluZ2lmeSh0YXJnZXQudmVyc2lvbil9ICh3YXMgJHtKU09OLnN0cmluZ2lmeShpbnN0YWxsZWQudmVyc2lvbil9KS4uLmAsXG4gICAgKTtcblxuICAgIGlmIChwYWNrYWdlSnNvbi5kZXBlbmRlbmNpZXMgJiYgcGFja2FnZUpzb24uZGVwZW5kZW5jaWVzW25hbWVdKSB7XG4gICAgICB1cGRhdGVEZXBlbmRlbmN5KHBhY2thZ2VKc29uLmRlcGVuZGVuY2llcywgbmFtZSwgdGFyZ2V0LnZlcnNpb24pO1xuXG4gICAgICBpZiAocGFja2FnZUpzb24uZGV2RGVwZW5kZW5jaWVzICYmIHBhY2thZ2VKc29uLmRldkRlcGVuZGVuY2llc1tuYW1lXSkge1xuICAgICAgICBkZWxldGUgcGFja2FnZUpzb24uZGV2RGVwZW5kZW5jaWVzW25hbWVdO1xuICAgICAgfVxuICAgICAgaWYgKHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXMgJiYgcGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXSkge1xuICAgICAgICBkZWxldGUgcGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHBhY2thZ2VKc29uLmRldkRlcGVuZGVuY2llcyAmJiBwYWNrYWdlSnNvbi5kZXZEZXBlbmRlbmNpZXNbbmFtZV0pIHtcbiAgICAgIHVwZGF0ZURlcGVuZGVuY3kocGFja2FnZUpzb24uZGV2RGVwZW5kZW5jaWVzLCBuYW1lLCB0YXJnZXQudmVyc2lvbik7XG5cbiAgICAgIGlmIChwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzICYmIHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV0pIHtcbiAgICAgICAgZGVsZXRlIHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzICYmIHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV0pIHtcbiAgICAgIHVwZGF0ZURlcGVuZGVuY3kocGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llcywgbmFtZSwgdGFyZ2V0LnZlcnNpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIud2FybihgUGFja2FnZSAke25hbWV9IHdhcyBub3QgZm91bmQgaW4gZGVwZW5kZW5jaWVzLmApO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgbmV3Q29udGVudCA9IEpTT04uc3RyaW5naWZ5KHBhY2thZ2VKc29uLCBudWxsLCAyKTtcbiAgaWYgKHBhY2thZ2VKc29uQ29udGVudC50b1N0cmluZygpICE9IG5ld0NvbnRlbnQgfHwgbWlncmF0ZU9ubHkpIHtcbiAgICBpZiAoIW1pZ3JhdGVPbmx5KSB7XG4gICAgICB0cmVlLm92ZXJ3cml0ZSgnL3BhY2thZ2UuanNvbicsIEpTT04uc3RyaW5naWZ5KHBhY2thZ2VKc29uLCBudWxsLCAyKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZXh0ZXJuYWxNaWdyYXRpb25zOiB7fVtdID0gW107XG5cbiAgICAvLyBSdW4gdGhlIG1pZ3JhdGUgc2NoZW1hdGljcyB3aXRoIHRoZSBsaXN0IG9mIHBhY2thZ2VzIHRvIHVzZS4gVGhlIGNvbGxlY3Rpb24gY29udGFpbnNcbiAgICAvLyB2ZXJzaW9uIGluZm9ybWF0aW9uIGFuZCB3ZSBuZWVkIHRvIGRvIHRoaXMgcG9zdCBpbnN0YWxsYXRpb24uIFBsZWFzZSBub3RlIHRoYXQgdGhlXG4gICAgLy8gbWlncmF0aW9uIENPVUxEIGZhaWwgYW5kIGxlYXZlIHNpZGUgZWZmZWN0cyBvbiBkaXNrLlxuICAgIC8vIFJ1biB0aGUgc2NoZW1hdGljcyB0YXNrIG9mIHRob3NlIHBhY2thZ2VzLlxuICAgIHRvSW5zdGFsbC5mb3JFYWNoKChbbmFtZSwgdGFyZ2V0LCBpbnN0YWxsZWRdKSA9PiB7XG4gICAgICBpZiAoIXRhcmdldC51cGRhdGVNZXRhZGF0YS5taWdyYXRpb25zKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZXh0ZXJuYWxNaWdyYXRpb25zLnB1c2goe1xuICAgICAgICBwYWNrYWdlOiBuYW1lLFxuICAgICAgICBjb2xsZWN0aW9uOiB0YXJnZXQudXBkYXRlTWV0YWRhdGEubWlncmF0aW9ucyxcbiAgICAgICAgZnJvbTogaW5zdGFsbGVkLnZlcnNpb24sXG4gICAgICAgIHRvOiB0YXJnZXQudmVyc2lvbixcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm47XG4gICAgfSk7XG5cbiAgICBpZiAoZXh0ZXJuYWxNaWdyYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAoZ2xvYmFsIGFzIGFueSkuZXh0ZXJuYWxNaWdyYXRpb25zID0gZXh0ZXJuYWxNaWdyYXRpb25zO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBfZ2V0VXBkYXRlTWV0YWRhdGEoXG4gIHBhY2thZ2VKc29uOiBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcyxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbik6IFVwZGF0ZU1ldGFkYXRhIHtcbiAgY29uc3QgbWV0YWRhdGEgPSBwYWNrYWdlSnNvblsnbmctdXBkYXRlJ107XG5cbiAgY29uc3QgcmVzdWx0OiBVcGRhdGVNZXRhZGF0YSA9IHtcbiAgICBwYWNrYWdlR3JvdXA6IHt9LFxuICAgIHJlcXVpcmVtZW50czoge30sXG4gIH07XG5cbiAgaWYgKCFtZXRhZGF0YSB8fCB0eXBlb2YgbWV0YWRhdGEgIT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShtZXRhZGF0YSkpIHtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgaWYgKG1ldGFkYXRhWydwYWNrYWdlR3JvdXAnXSkge1xuICAgIGNvbnN0IHBhY2thZ2VHcm91cCA9IG1ldGFkYXRhWydwYWNrYWdlR3JvdXAnXTtcbiAgICAvLyBWZXJpZnkgdGhhdCBwYWNrYWdlR3JvdXAgaXMgYW4gYXJyYXkgb2Ygc3RyaW5ncyBvciBhbiBtYXAgb2YgdmVyc2lvbnMuIFRoaXMgaXMgbm90IGFuIGVycm9yXG4gICAgLy8gYnV0IHdlIHN0aWxsIHdhcm4gdGhlIHVzZXIgYW5kIGlnbm9yZSB0aGUgcGFja2FnZUdyb3VwIGtleXMuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkocGFja2FnZUdyb3VwKSAmJiBwYWNrYWdlR3JvdXAuZXZlcnkoKHgpID0+IHR5cGVvZiB4ID09ICdzdHJpbmcnKSkge1xuICAgICAgcmVzdWx0LnBhY2thZ2VHcm91cCA9IHBhY2thZ2VHcm91cC5yZWR1Y2UoKGdyb3VwLCBuYW1lKSA9PiB7XG4gICAgICAgIGdyb3VwW25hbWVdID0gcGFja2FnZUpzb24udmVyc2lvbjtcblxuICAgICAgICByZXR1cm4gZ3JvdXA7XG4gICAgICB9LCByZXN1bHQucGFja2FnZUdyb3VwKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgdHlwZW9mIHBhY2thZ2VHcm91cCA9PSAnb2JqZWN0JyAmJlxuICAgICAgcGFja2FnZUdyb3VwICYmXG4gICAgICBPYmplY3QudmFsdWVzKHBhY2thZ2VHcm91cCkuZXZlcnkoKHgpID0+IHR5cGVvZiB4ID09ICdzdHJpbmcnKVxuICAgICkge1xuICAgICAgcmVzdWx0LnBhY2thZ2VHcm91cCA9IHBhY2thZ2VHcm91cDtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLndhcm4oYHBhY2thZ2VHcm91cCBtZXRhZGF0YSBvZiBwYWNrYWdlICR7cGFja2FnZUpzb24ubmFtZX0gaXMgbWFsZm9ybWVkLiBJZ25vcmluZy5gKTtcbiAgICB9XG5cbiAgICByZXN1bHQucGFja2FnZUdyb3VwTmFtZSA9IE9iamVjdC5rZXlzKHJlc3VsdC5wYWNrYWdlR3JvdXApWzBdO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBtZXRhZGF0YVsncGFja2FnZUdyb3VwTmFtZSddID09ICdzdHJpbmcnKSB7XG4gICAgcmVzdWx0LnBhY2thZ2VHcm91cE5hbWUgPSBtZXRhZGF0YVsncGFja2FnZUdyb3VwTmFtZSddO1xuICB9XG5cbiAgaWYgKG1ldGFkYXRhWydyZXF1aXJlbWVudHMnXSkge1xuICAgIGNvbnN0IHJlcXVpcmVtZW50cyA9IG1ldGFkYXRhWydyZXF1aXJlbWVudHMnXTtcbiAgICAvLyBWZXJpZnkgdGhhdCByZXF1aXJlbWVudHMgYXJlXG4gICAgaWYgKFxuICAgICAgdHlwZW9mIHJlcXVpcmVtZW50cyAhPSAnb2JqZWN0JyB8fFxuICAgICAgQXJyYXkuaXNBcnJheShyZXF1aXJlbWVudHMpIHx8XG4gICAgICBPYmplY3Qua2V5cyhyZXF1aXJlbWVudHMpLnNvbWUoKG5hbWUpID0+IHR5cGVvZiByZXF1aXJlbWVudHNbbmFtZV0gIT0gJ3N0cmluZycpXG4gICAgKSB7XG4gICAgICBsb2dnZXIud2FybihgcmVxdWlyZW1lbnRzIG1ldGFkYXRhIG9mIHBhY2thZ2UgJHtwYWNrYWdlSnNvbi5uYW1lfSBpcyBtYWxmb3JtZWQuIElnbm9yaW5nLmApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucmVxdWlyZW1lbnRzID0gcmVxdWlyZW1lbnRzO1xuICAgIH1cbiAgfVxuXG4gIGlmIChtZXRhZGF0YVsnbWlncmF0aW9ucyddKSB7XG4gICAgY29uc3QgbWlncmF0aW9ucyA9IG1ldGFkYXRhWydtaWdyYXRpb25zJ107XG4gICAgaWYgKHR5cGVvZiBtaWdyYXRpb25zICE9ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIud2FybihgbWlncmF0aW9ucyBtZXRhZGF0YSBvZiBwYWNrYWdlICR7cGFja2FnZUpzb24ubmFtZX0gaXMgbWFsZm9ybWVkLiBJZ25vcmluZy5gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0Lm1pZ3JhdGlvbnMgPSBtaWdyYXRpb25zO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIF91c2FnZU1lc3NhZ2UoXG4gIG9wdGlvbnM6IFVwZGF0ZVNjaGVtYSxcbiAgaW5mb01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm8+LFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuKSB7XG4gIGNvbnN0IHBhY2thZ2VHcm91cHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCBwYWNrYWdlc1RvVXBkYXRlID0gWy4uLmluZm9NYXAuZW50cmllcygpXVxuICAgIC5tYXAoKFtuYW1lLCBpbmZvXSkgPT4ge1xuICAgICAgbGV0IHRhZyA9IG9wdGlvbnMubmV4dFxuICAgICAgICA/IGluZm8ubnBtUGFja2FnZUpzb25bJ2Rpc3QtdGFncyddWyduZXh0J11cbiAgICAgICAgICA/ICduZXh0J1xuICAgICAgICAgIDogJ2xhdGVzdCdcbiAgICAgICAgOiAnbGF0ZXN0JztcbiAgICAgIGxldCB2ZXJzaW9uID0gaW5mby5ucG1QYWNrYWdlSnNvblsnZGlzdC10YWdzJ11bdGFnXTtcbiAgICAgIGxldCB0YXJnZXQgPSBpbmZvLm5wbVBhY2thZ2VKc29uLnZlcnNpb25zW3ZlcnNpb25dO1xuXG4gICAgICBjb25zdCB2ZXJzaW9uRGlmZiA9IHNlbXZlci5kaWZmKGluZm8uaW5zdGFsbGVkLnZlcnNpb24sIHZlcnNpb24pO1xuICAgICAgaWYgKFxuICAgICAgICB2ZXJzaW9uRGlmZiAhPT0gJ3BhdGNoJyAmJlxuICAgICAgICB2ZXJzaW9uRGlmZiAhPT0gJ21pbm9yJyAmJlxuICAgICAgICAvXkAoPzphbmd1bGFyfG5ndW5pdmVyc2FsKVxcLy8udGVzdChuYW1lKVxuICAgICAgKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbGxlZE1ham9yVmVyc2lvbiA9IHNlbXZlci5wYXJzZShpbmZvLmluc3RhbGxlZC52ZXJzaW9uKT8ubWFqb3I7XG4gICAgICAgIGNvbnN0IHRvSW5zdGFsbE1ham9yVmVyc2lvbiA9IHNlbXZlci5wYXJzZSh2ZXJzaW9uKT8ubWFqb3I7XG4gICAgICAgIGlmIChcbiAgICAgICAgICBpbnN0YWxsZWRNYWpvclZlcnNpb24gIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgIHRvSW5zdGFsbE1ham9yVmVyc2lvbiAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgaW5zdGFsbGVkTWFqb3JWZXJzaW9uIDwgdG9JbnN0YWxsTWFqb3JWZXJzaW9uIC0gMVxuICAgICAgICApIHtcbiAgICAgICAgICBjb25zdCBuZXh0TWFqb3JWZXJzaW9uID0gYCR7aW5zdGFsbGVkTWFqb3JWZXJzaW9uICsgMX0uYDtcbiAgICAgICAgICBjb25zdCBuZXh0TWFqb3JWZXJzaW9ucyA9IE9iamVjdC5rZXlzKGluZm8ubnBtUGFja2FnZUpzb24udmVyc2lvbnMpXG4gICAgICAgICAgICAuZmlsdGVyKCh2KSA9PiB2LnN0YXJ0c1dpdGgobmV4dE1ham9yVmVyc2lvbikpXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gKGEgPiBiID8gLTEgOiAxKSk7XG5cbiAgICAgICAgICBpZiAobmV4dE1ham9yVmVyc2lvbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICB2ZXJzaW9uID0gbmV4dE1ham9yVmVyc2lvbnNbMF07XG4gICAgICAgICAgICB0YXJnZXQgPSBpbmZvLm5wbVBhY2thZ2VKc29uLnZlcnNpb25zW3ZlcnNpb25dO1xuICAgICAgICAgICAgdGFnID0gJyc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIGluZm8sXG4gICAgICAgIHZlcnNpb24sXG4gICAgICAgIHRhZyxcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgfTtcbiAgICB9KVxuICAgIC5maWx0ZXIoXG4gICAgICAoeyBpbmZvLCB2ZXJzaW9uLCB0YXJnZXQgfSkgPT5cbiAgICAgICAgdGFyZ2V0Py5bJ25nLXVwZGF0ZSddICYmIHNlbXZlci5jb21wYXJlKGluZm8uaW5zdGFsbGVkLnZlcnNpb24sIHZlcnNpb24pIDwgMCxcbiAgICApXG4gICAgLm1hcCgoeyBuYW1lLCBpbmZvLCB2ZXJzaW9uLCB0YWcsIHRhcmdldCB9KSA9PiB7XG4gICAgICAvLyBMb29rIGZvciBwYWNrYWdlR3JvdXAuXG4gICAgICBjb25zdCBwYWNrYWdlR3JvdXAgPSB0YXJnZXRbJ25nLXVwZGF0ZSddWydwYWNrYWdlR3JvdXAnXTtcbiAgICAgIGlmIChwYWNrYWdlR3JvdXApIHtcbiAgICAgICAgY29uc3QgcGFja2FnZUdyb3VwTmFtZSA9IHRhcmdldFsnbmctdXBkYXRlJ11bJ3BhY2thZ2VHcm91cE5hbWUnXSB8fCBwYWNrYWdlR3JvdXBbMF07XG4gICAgICAgIGlmIChwYWNrYWdlR3JvdXBOYW1lKSB7XG4gICAgICAgICAgaWYgKHBhY2thZ2VHcm91cHMuaGFzKG5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwYWNrYWdlR3JvdXAuZm9yRWFjaCgoeDogc3RyaW5nKSA9PiBwYWNrYWdlR3JvdXBzLnNldCh4LCBwYWNrYWdlR3JvdXBOYW1lKSk7XG4gICAgICAgICAgcGFja2FnZUdyb3Vwcy5zZXQocGFja2FnZUdyb3VwTmFtZSwgcGFja2FnZUdyb3VwTmFtZSk7XG4gICAgICAgICAgbmFtZSA9IHBhY2thZ2VHcm91cE5hbWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgbGV0IGNvbW1hbmQgPSBgbmcgdXBkYXRlICR7bmFtZX1gO1xuICAgICAgaWYgKCF0YWcpIHtcbiAgICAgICAgY29tbWFuZCArPSBgQCR7c2VtdmVyLnBhcnNlKHZlcnNpb24pPy5tYWpvciB8fCB2ZXJzaW9ufWA7XG4gICAgICB9IGVsc2UgaWYgKHRhZyA9PSAnbmV4dCcpIHtcbiAgICAgICAgY29tbWFuZCArPSAnIC0tbmV4dCc7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBbbmFtZSwgYCR7aW5mby5pbnN0YWxsZWQudmVyc2lvbn0gLT4gJHt2ZXJzaW9ufSBgLCBjb21tYW5kXTtcbiAgICB9KVxuICAgIC5maWx0ZXIoKHgpID0+IHggIT09IG51bGwpXG4gICAgLnNvcnQoKGEsIGIpID0+IChhICYmIGIgPyBhWzBdLmxvY2FsZUNvbXBhcmUoYlswXSkgOiAwKSk7XG5cbiAgaWYgKHBhY2thZ2VzVG9VcGRhdGUubGVuZ3RoID09IDApIHtcbiAgICBsb2dnZXIuaW5mbygnV2UgYW5hbHl6ZWQgeW91ciBwYWNrYWdlLmpzb24gYW5kIGV2ZXJ5dGhpbmcgc2VlbXMgdG8gYmUgaW4gb3JkZXIuIEdvb2Qgd29yayEnKTtcblxuICAgIHJldHVybjtcbiAgfVxuXG4gIGxvZ2dlci5pbmZvKCdXZSBhbmFseXplZCB5b3VyIHBhY2thZ2UuanNvbiwgdGhlcmUgYXJlIHNvbWUgcGFja2FnZXMgdG8gdXBkYXRlOlxcbicpO1xuXG4gIC8vIEZpbmQgdGhlIGxhcmdlc3QgbmFtZSB0byBrbm93IHRoZSBwYWRkaW5nIG5lZWRlZC5cbiAgbGV0IG5hbWVQYWQgPSBNYXRoLm1heCguLi5bLi4uaW5mb01hcC5rZXlzKCldLm1hcCgoeCkgPT4geC5sZW5ndGgpKSArIDI7XG4gIGlmICghTnVtYmVyLmlzRmluaXRlKG5hbWVQYWQpKSB7XG4gICAgbmFtZVBhZCA9IDMwO1xuICB9XG4gIGNvbnN0IHBhZHMgPSBbbmFtZVBhZCwgMjUsIDBdO1xuXG4gIGxvZ2dlci5pbmZvKFxuICAgICcgICcgKyBbJ05hbWUnLCAnVmVyc2lvbicsICdDb21tYW5kIHRvIHVwZGF0ZSddLm1hcCgoeCwgaSkgPT4geC5wYWRFbmQocGFkc1tpXSkpLmpvaW4oJycpLFxuICApO1xuICBsb2dnZXIuaW5mbygnICcgKyAnLScucmVwZWF0KHBhZHMucmVkdWNlKChzLCB4KSA9PiAocyArPSB4KSwgMCkgKyAyMCkpO1xuXG4gIHBhY2thZ2VzVG9VcGRhdGUuZm9yRWFjaCgoZmllbGRzKSA9PiB7XG4gICAgaWYgKCFmaWVsZHMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbygnICAnICsgZmllbGRzLm1hcCgoeCwgaSkgPT4geC5wYWRFbmQocGFkc1tpXSkpLmpvaW4oJycpKTtcbiAgfSk7XG5cbiAgbG9nZ2VyLmluZm8oXG4gICAgYFxcblRoZXJlIG1pZ2h0IGJlIGFkZGl0aW9uYWwgcGFja2FnZXMgd2hpY2ggZG9uJ3QgcHJvdmlkZSAnbmcgdXBkYXRlJyBjYXBhYmlsaXRpZXMgdGhhdCBhcmUgb3V0ZGF0ZWQuXFxuYCArXG4gICAgICBgWW91IGNhbiB1cGRhdGUgdGhlIGFkZGl0aW9uYWwgcGFja2FnZXMgYnkgcnVubmluZyB0aGUgdXBkYXRlIGNvbW1hbmQgb2YgeW91ciBwYWNrYWdlIG1hbmFnZXIuYCxcbiAgKTtcblxuICByZXR1cm47XG59XG5cbmZ1bmN0aW9uIF9idWlsZFBhY2thZ2VJbmZvKFxuICB0cmVlOiBUcmVlLFxuICBwYWNrYWdlczogTWFwPHN0cmluZywgVmVyc2lvblJhbmdlPixcbiAgYWxsRGVwZW5kZW5jaWVzOiBSZWFkb25seU1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4sXG4gIG5wbVBhY2thZ2VKc29uOiBOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IG5hbWUgPSBucG1QYWNrYWdlSnNvbi5uYW1lO1xuICBjb25zdCBwYWNrYWdlSnNvblJhbmdlID0gYWxsRGVwZW5kZW5jaWVzLmdldChuYW1lKTtcbiAgaWYgKCFwYWNrYWdlSnNvblJhbmdlKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFBhY2thZ2UgJHtKU09OLnN0cmluZ2lmeShuYW1lKX0gd2FzIG5vdCBmb3VuZCBpbiBwYWNrYWdlLmpzb24uYCk7XG4gIH1cblxuICAvLyBGaW5kIG91dCB0aGUgY3VycmVudGx5IGluc3RhbGxlZCB2ZXJzaW9uLiBFaXRoZXIgZnJvbSB0aGUgcGFja2FnZS5qc29uIG9yIHRoZSBub2RlX21vZHVsZXMvXG4gIC8vIFRPRE86IGZpZ3VyZSBvdXQgYSB3YXkgdG8gcmVhZCBwYWNrYWdlLWxvY2suanNvbiBhbmQvb3IgeWFybi5sb2NrLlxuICBsZXQgaW5zdGFsbGVkVmVyc2lvbjogc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbDtcbiAgY29uc3QgcGFja2FnZUNvbnRlbnQgPSB0cmVlLnJlYWQoYC9ub2RlX21vZHVsZXMvJHtuYW1lfS9wYWNrYWdlLmpzb25gKTtcbiAgaWYgKHBhY2thZ2VDb250ZW50KSB7XG4gICAgY29uc3QgY29udGVudCA9IEpTT04ucGFyc2UocGFja2FnZUNvbnRlbnQudG9TdHJpbmcoKSkgYXMgSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXM7XG4gICAgaW5zdGFsbGVkVmVyc2lvbiA9IGNvbnRlbnQudmVyc2lvbjtcbiAgfVxuICBpZiAoIWluc3RhbGxlZFZlcnNpb24pIHtcbiAgICAvLyBGaW5kIHRoZSB2ZXJzaW9uIGZyb20gTlBNIHRoYXQgZml0cyB0aGUgcmFuZ2UgdG8gbWF4LlxuICAgIGluc3RhbGxlZFZlcnNpb24gPSBzZW12ZXIubWF4U2F0aXNmeWluZyhPYmplY3Qua2V5cyhucG1QYWNrYWdlSnNvbi52ZXJzaW9ucyksIHBhY2thZ2VKc29uUmFuZ2UpO1xuICB9XG5cbiAgaWYgKCFpbnN0YWxsZWRWZXJzaW9uKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oXG4gICAgICBgQW4gdW5leHBlY3RlZCBlcnJvciBoYXBwZW5lZDsgY291bGQgbm90IGRldGVybWluZSB2ZXJzaW9uIGZvciBwYWNrYWdlICR7bmFtZX0uYCxcbiAgICApO1xuICB9XG5cbiAgY29uc3QgaW5zdGFsbGVkUGFja2FnZUpzb24gPSBucG1QYWNrYWdlSnNvbi52ZXJzaW9uc1tpbnN0YWxsZWRWZXJzaW9uXSB8fCBwYWNrYWdlQ29udGVudDtcbiAgaWYgKCFpbnN0YWxsZWRQYWNrYWdlSnNvbikge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKFxuICAgICAgYEFuIHVuZXhwZWN0ZWQgZXJyb3IgaGFwcGVuZWQ7IHBhY2thZ2UgJHtuYW1lfSBoYXMgbm8gdmVyc2lvbiAke2luc3RhbGxlZFZlcnNpb259LmAsXG4gICAgKTtcbiAgfVxuXG4gIGxldCB0YXJnZXRWZXJzaW9uOiBWZXJzaW9uUmFuZ2UgfCB1bmRlZmluZWQgPSBwYWNrYWdlcy5nZXQobmFtZSk7XG4gIGlmICh0YXJnZXRWZXJzaW9uKSB7XG4gICAgaWYgKG5wbVBhY2thZ2VKc29uWydkaXN0LXRhZ3MnXVt0YXJnZXRWZXJzaW9uXSkge1xuICAgICAgdGFyZ2V0VmVyc2lvbiA9IG5wbVBhY2thZ2VKc29uWydkaXN0LXRhZ3MnXVt0YXJnZXRWZXJzaW9uXSBhcyBWZXJzaW9uUmFuZ2U7XG4gICAgfSBlbHNlIGlmICh0YXJnZXRWZXJzaW9uID09ICduZXh0Jykge1xuICAgICAgdGFyZ2V0VmVyc2lvbiA9IG5wbVBhY2thZ2VKc29uWydkaXN0LXRhZ3MnXVsnbGF0ZXN0J10gYXMgVmVyc2lvblJhbmdlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRWZXJzaW9uID0gc2VtdmVyLm1heFNhdGlzZnlpbmcoXG4gICAgICAgIE9iamVjdC5rZXlzKG5wbVBhY2thZ2VKc29uLnZlcnNpb25zKSxcbiAgICAgICAgdGFyZ2V0VmVyc2lvbixcbiAgICAgICkgYXMgVmVyc2lvblJhbmdlO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0YXJnZXRWZXJzaW9uICYmIHNlbXZlci5sdGUodGFyZ2V0VmVyc2lvbiwgaW5zdGFsbGVkVmVyc2lvbikpIHtcbiAgICBsb2dnZXIuZGVidWcoYFBhY2thZ2UgJHtuYW1lfSBhbHJlYWR5IHNhdGlzZmllZCBieSBwYWNrYWdlLmpzb24gKCR7cGFja2FnZUpzb25SYW5nZX0pLmApO1xuICAgIHRhcmdldFZlcnNpb24gPSB1bmRlZmluZWQ7XG4gIH1cblxuICBjb25zdCB0YXJnZXQ6IFBhY2thZ2VWZXJzaW9uSW5mbyB8IHVuZGVmaW5lZCA9IHRhcmdldFZlcnNpb25cbiAgICA/IHtcbiAgICAgICAgdmVyc2lvbjogdGFyZ2V0VmVyc2lvbixcbiAgICAgICAgcGFja2FnZUpzb246IG5wbVBhY2thZ2VKc29uLnZlcnNpb25zW3RhcmdldFZlcnNpb25dLFxuICAgICAgICB1cGRhdGVNZXRhZGF0YTogX2dldFVwZGF0ZU1ldGFkYXRhKG5wbVBhY2thZ2VKc29uLnZlcnNpb25zW3RhcmdldFZlcnNpb25dLCBsb2dnZXIpLFxuICAgICAgfVxuICAgIDogdW5kZWZpbmVkO1xuXG4gIC8vIENoZWNrIGlmIHRoZXJlJ3MgYW4gaW5zdGFsbGVkIHZlcnNpb24uXG4gIHJldHVybiB7XG4gICAgbmFtZSxcbiAgICBucG1QYWNrYWdlSnNvbixcbiAgICBpbnN0YWxsZWQ6IHtcbiAgICAgIHZlcnNpb246IGluc3RhbGxlZFZlcnNpb24gYXMgVmVyc2lvblJhbmdlLFxuICAgICAgcGFja2FnZUpzb246IGluc3RhbGxlZFBhY2thZ2VKc29uLFxuICAgICAgdXBkYXRlTWV0YWRhdGE6IF9nZXRVcGRhdGVNZXRhZGF0YShpbnN0YWxsZWRQYWNrYWdlSnNvbiwgbG9nZ2VyKSxcbiAgICB9LFxuICAgIHRhcmdldCxcbiAgICBwYWNrYWdlSnNvblJhbmdlLFxuICB9O1xufVxuXG5mdW5jdGlvbiBfYnVpbGRQYWNrYWdlTGlzdChcbiAgb3B0aW9uczogVXBkYXRlU2NoZW1hLFxuICBwcm9qZWN0RGVwczogTWFwPHN0cmluZywgVmVyc2lvblJhbmdlPixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbik6IE1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4ge1xuICAvLyBQYXJzZSB0aGUgcGFja2FnZXMgb3B0aW9ucyB0byBzZXQgdGhlIHRhcmdldGVkIHZlcnNpb24uXG4gIGNvbnN0IHBhY2thZ2VzID0gbmV3IE1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4oKTtcbiAgY29uc3QgY29tbWFuZExpbmVQYWNrYWdlcyA9XG4gICAgb3B0aW9ucy5wYWNrYWdlcyAmJiBvcHRpb25zLnBhY2thZ2VzLmxlbmd0aCA+IDAgPyBvcHRpb25zLnBhY2thZ2VzIDogW107XG5cbiAgZm9yIChjb25zdCBwa2cgb2YgY29tbWFuZExpbmVQYWNrYWdlcykge1xuICAgIC8vIFNwbGl0IHRoZSB2ZXJzaW9uIGFza2VkIG9uIGNvbW1hbmQgbGluZS5cbiAgICBjb25zdCBtID0gcGtnLm1hdGNoKC9eKCg/OkBbXi9dezEsMTAwfVxcLyk/W15AXXsxLDEwMH0pKD86QCguezEsMTAwfSkpPyQvKTtcbiAgICBpZiAoIW0pIHtcbiAgICAgIGxvZ2dlci53YXJuKGBJbnZhbGlkIHBhY2thZ2UgYXJndW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkocGtnKX0uIFNraXBwaW5nLmApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgWywgbnBtTmFtZSwgbWF5YmVWZXJzaW9uXSA9IG07XG5cbiAgICBjb25zdCB2ZXJzaW9uID0gcHJvamVjdERlcHMuZ2V0KG5wbU5hbWUpO1xuICAgIGlmICghdmVyc2lvbikge1xuICAgICAgbG9nZ2VyLndhcm4oYFBhY2thZ2Ugbm90IGluc3RhbGxlZDogJHtKU09OLnN0cmluZ2lmeShucG1OYW1lKX0uIFNraXBwaW5nLmApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcGFja2FnZXMuc2V0KG5wbU5hbWUsIChtYXliZVZlcnNpb24gfHwgKG9wdGlvbnMubmV4dCA/ICduZXh0JyA6ICdsYXRlc3QnKSkgYXMgVmVyc2lvblJhbmdlKTtcbiAgfVxuXG4gIHJldHVybiBwYWNrYWdlcztcbn1cblxuZnVuY3Rpb24gX2FkZFBhY2thZ2VHcm91cChcbiAgdHJlZTogVHJlZSxcbiAgcGFja2FnZXM6IE1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4sXG4gIGFsbERlcGVuZGVuY2llczogUmVhZG9ubHlNYXA8c3RyaW5nLCBWZXJzaW9uUmFuZ2U+LFxuICBucG1QYWNrYWdlSnNvbjogTnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uLFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuKTogdm9pZCB7XG4gIGNvbnN0IG1heWJlUGFja2FnZSA9IHBhY2thZ2VzLmdldChucG1QYWNrYWdlSnNvbi5uYW1lKTtcbiAgaWYgKCFtYXliZVBhY2thZ2UpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBpbmZvID0gX2J1aWxkUGFja2FnZUluZm8odHJlZSwgcGFja2FnZXMsIGFsbERlcGVuZGVuY2llcywgbnBtUGFja2FnZUpzb24sIGxvZ2dlcik7XG5cbiAgY29uc3QgdmVyc2lvbiA9XG4gICAgKGluZm8udGFyZ2V0ICYmIGluZm8udGFyZ2V0LnZlcnNpb24pIHx8XG4gICAgbnBtUGFja2FnZUpzb25bJ2Rpc3QtdGFncyddW21heWJlUGFja2FnZV0gfHxcbiAgICBtYXliZVBhY2thZ2U7XG4gIGlmICghbnBtUGFja2FnZUpzb24udmVyc2lvbnNbdmVyc2lvbl0pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgbmdVcGRhdGVNZXRhZGF0YSA9IG5wbVBhY2thZ2VKc29uLnZlcnNpb25zW3ZlcnNpb25dWyduZy11cGRhdGUnXTtcbiAgaWYgKCFuZ1VwZGF0ZU1ldGFkYXRhKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGV0IHBhY2thZ2VHcm91cCA9IG5nVXBkYXRlTWV0YWRhdGFbJ3BhY2thZ2VHcm91cCddO1xuICBpZiAoIXBhY2thZ2VHcm91cCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoQXJyYXkuaXNBcnJheShwYWNrYWdlR3JvdXApICYmICFwYWNrYWdlR3JvdXAuc29tZSgoeCkgPT4gdHlwZW9mIHggIT0gJ3N0cmluZycpKSB7XG4gICAgcGFja2FnZUdyb3VwID0gcGFja2FnZUdyb3VwLnJlZHVjZSgoYWNjLCBjdXJyKSA9PiB7XG4gICAgICBhY2NbY3Vycl0gPSBtYXliZVBhY2thZ2U7XG5cbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwge30gYXMgeyBbbmFtZTogc3RyaW5nXTogc3RyaW5nIH0pO1xuICB9XG5cbiAgLy8gT25seSBuZWVkIHRvIGNoZWNrIGlmIGl0J3MgYW4gb2JqZWN0IGJlY2F1c2Ugd2Ugc2V0IGl0IHJpZ2h0IHRoZSB0aW1lIGJlZm9yZS5cbiAgaWYgKFxuICAgIHR5cGVvZiBwYWNrYWdlR3JvdXAgIT0gJ29iamVjdCcgfHxcbiAgICBwYWNrYWdlR3JvdXAgPT09IG51bGwgfHxcbiAgICBPYmplY3QudmFsdWVzKHBhY2thZ2VHcm91cCkuc29tZSgodikgPT4gdHlwZW9mIHYgIT0gJ3N0cmluZycpXG4gICkge1xuICAgIGxvZ2dlci53YXJuKGBwYWNrYWdlR3JvdXAgbWV0YWRhdGEgb2YgcGFja2FnZSAke25wbVBhY2thZ2VKc29uLm5hbWV9IGlzIG1hbGZvcm1lZC5gKTtcblxuICAgIHJldHVybjtcbiAgfVxuXG4gIE9iamVjdC5rZXlzKHBhY2thZ2VHcm91cClcbiAgICAuZmlsdGVyKChuYW1lKSA9PiAhcGFja2FnZXMuaGFzKG5hbWUpKSAvLyBEb24ndCBvdmVycmlkZSBuYW1lcyBmcm9tIHRoZSBjb21tYW5kIGxpbmUuXG4gICAgLmZpbHRlcigobmFtZSkgPT4gYWxsRGVwZW5kZW5jaWVzLmhhcyhuYW1lKSkgLy8gUmVtb3ZlIHBhY2thZ2VzIHRoYXQgYXJlbid0IGluc3RhbGxlZC5cbiAgICAuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgcGFja2FnZXMuc2V0KG5hbWUsIHBhY2thZ2VHcm91cFtuYW1lXSk7XG4gICAgfSk7XG59XG5cbi8qKlxuICogQWRkIHBlZXIgZGVwZW5kZW5jaWVzIG9mIHBhY2thZ2VzIG9uIHRoZSBjb21tYW5kIGxpbmUgdG8gdGhlIGxpc3Qgb2YgcGFja2FnZXMgdG8gdXBkYXRlLlxuICogV2UgZG9uJ3QgZG8gdmVyaWZpY2F0aW9uIG9mIHRoZSB2ZXJzaW9ucyBoZXJlIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IGEgbGF0ZXIgc3RlcCAoYW5kIGNhblxuICogYmUgaWdub3JlZCBieSB0aGUgLS1mb3JjZSBmbGFnKS5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9hZGRQZWVyRGVwZW5kZW5jaWVzKFxuICB0cmVlOiBUcmVlLFxuICBwYWNrYWdlczogTWFwPHN0cmluZywgVmVyc2lvblJhbmdlPixcbiAgYWxsRGVwZW5kZW5jaWVzOiBSZWFkb25seU1hcDxzdHJpbmcsIFZlcnNpb25SYW5nZT4sXG4gIG5wbVBhY2thZ2VKc29uOiBOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24sXG4gIG5wbVBhY2thZ2VKc29uTWFwOiBNYXA8c3RyaW5nLCBOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24+LFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuKTogdm9pZCB7XG4gIGNvbnN0IG1heWJlUGFja2FnZSA9IHBhY2thZ2VzLmdldChucG1QYWNrYWdlSnNvbi5uYW1lKTtcbiAgaWYgKCFtYXliZVBhY2thZ2UpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBpbmZvID0gX2J1aWxkUGFja2FnZUluZm8odHJlZSwgcGFja2FnZXMsIGFsbERlcGVuZGVuY2llcywgbnBtUGFja2FnZUpzb24sIGxvZ2dlcik7XG5cbiAgY29uc3QgdmVyc2lvbiA9XG4gICAgKGluZm8udGFyZ2V0ICYmIGluZm8udGFyZ2V0LnZlcnNpb24pIHx8XG4gICAgbnBtUGFja2FnZUpzb25bJ2Rpc3QtdGFncyddW21heWJlUGFja2FnZV0gfHxcbiAgICBtYXliZVBhY2thZ2U7XG4gIGlmICghbnBtUGFja2FnZUpzb24udmVyc2lvbnNbdmVyc2lvbl0pIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBwYWNrYWdlSnNvbiA9IG5wbVBhY2thZ2VKc29uLnZlcnNpb25zW3ZlcnNpb25dO1xuICBjb25zdCBlcnJvciA9IGZhbHNlO1xuXG4gIGZvciAoY29uc3QgW3BlZXIsIHJhbmdlXSBvZiBPYmplY3QuZW50cmllcyhwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzIHx8IHt9KSkge1xuICAgIGlmIChwYWNrYWdlcy5oYXMocGVlcikpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHBlZXJQYWNrYWdlSnNvbiA9IG5wbVBhY2thZ2VKc29uTWFwLmdldChwZWVyKTtcbiAgICBpZiAocGVlclBhY2thZ2VKc29uKSB7XG4gICAgICBjb25zdCBwZWVySW5mbyA9IF9idWlsZFBhY2thZ2VJbmZvKHRyZWUsIHBhY2thZ2VzLCBhbGxEZXBlbmRlbmNpZXMsIHBlZXJQYWNrYWdlSnNvbiwgbG9nZ2VyKTtcbiAgICAgIGlmIChzZW12ZXIuc2F0aXNmaWVzKHBlZXJJbmZvLmluc3RhbGxlZC52ZXJzaW9uLCByYW5nZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcGFja2FnZXMuc2V0KHBlZXIsIHJhbmdlIGFzIFZlcnNpb25SYW5nZSk7XG4gIH1cblxuICBpZiAoZXJyb3IpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQW4gZXJyb3Igb2NjdXJlZCwgc2VlIGFib3ZlLicpO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9nZXRBbGxEZXBlbmRlbmNpZXModHJlZTogVHJlZSk6IEFycmF5PHJlYWRvbmx5IFtzdHJpbmcsIFZlcnNpb25SYW5nZV0+IHtcbiAgY29uc3QgcGFja2FnZUpzb25Db250ZW50ID0gdHJlZS5yZWFkKCcvcGFja2FnZS5qc29uJyk7XG4gIGlmICghcGFja2FnZUpzb25Db250ZW50KSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIGEgcGFja2FnZS5qc29uLiBBcmUgeW91IGluIGEgTm9kZSBwcm9qZWN0PycpO1xuICB9XG5cbiAgbGV0IHBhY2thZ2VKc29uOiBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcztcbiAgdHJ5IHtcbiAgICBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25Db250ZW50LnRvU3RyaW5nKCkpIGFzIEpzb25TY2hlbWFGb3JOcG1QYWNrYWdlSnNvbkZpbGVzO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ3BhY2thZ2UuanNvbiBjb3VsZCBub3QgYmUgcGFyc2VkOiAnICsgZS5tZXNzYWdlKTtcbiAgfVxuXG4gIHJldHVybiBbXG4gICAgLi4uKE9iamVjdC5lbnRyaWVzKHBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXMgfHwge30pIGFzIEFycmF5PFtzdHJpbmcsIFZlcnNpb25SYW5nZV0+KSxcbiAgICAuLi4oT2JqZWN0LmVudHJpZXMocGFja2FnZUpzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9KSBhcyBBcnJheTxbc3RyaW5nLCBWZXJzaW9uUmFuZ2VdPiksXG4gICAgLi4uKE9iamVjdC5lbnRyaWVzKHBhY2thZ2VKc29uLmRlcGVuZGVuY2llcyB8fCB7fSkgYXMgQXJyYXk8W3N0cmluZywgVmVyc2lvblJhbmdlXT4pLFxuICBdO1xufVxuXG5mdW5jdGlvbiBfZm9ybWF0VmVyc2lvbih2ZXJzaW9uOiBzdHJpbmcgfCB1bmRlZmluZWQpIHtcbiAgaWYgKHZlcnNpb24gPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAoIXZlcnNpb24ubWF0Y2goL15cXGR7MSwzMH1cXC5cXGR7MSwzMH1cXC5cXGR7MSwzMH0vKSkge1xuICAgIHZlcnNpb24gKz0gJy4wJztcbiAgfVxuICBpZiAoIXZlcnNpb24ubWF0Y2goL15cXGR7MSwzMH1cXC5cXGR7MSwzMH1cXC5cXGR7MSwzMH0vKSkge1xuICAgIHZlcnNpb24gKz0gJy4wJztcbiAgfVxuICBpZiAoIXNlbXZlci52YWxpZCh2ZXJzaW9uKSkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBJbnZhbGlkIG1pZ3JhdGlvbiB2ZXJzaW9uOiAke0pTT04uc3RyaW5naWZ5KHZlcnNpb24pfWApO1xuICB9XG5cbiAgcmV0dXJuIHZlcnNpb247XG59XG5cbi8qKlxuICogUmV0dXJucyB3aGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gcGFja2FnZSBzcGVjaWZpZXIgKHRoZSB2YWx1ZSBzdHJpbmcgaW4gYVxuICogYHBhY2thZ2UuanNvbmAgZGVwZW5kZW5jeSkgaXMgaG9zdGVkIGluIHRoZSBOUE0gcmVnaXN0cnkuXG4gKiBAdGhyb3dzIFdoZW4gdGhlIHNwZWNpZmllciBjYW5ub3QgYmUgcGFyc2VkLlxuICovXG5mdW5jdGlvbiBpc1BrZ0Zyb21SZWdpc3RyeShuYW1lOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlc3VsdCA9IG5wYS5yZXNvbHZlKG5hbWUsIHNwZWNpZmllcik7XG5cbiAgcmV0dXJuICEhcmVzdWx0LnJlZ2lzdHJ5O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogVXBkYXRlU2NoZW1hKTogUnVsZSB7XG4gIGlmICghb3B0aW9ucy5wYWNrYWdlcykge1xuICAgIC8vIFdlIGNhbm5vdCBqdXN0IHJldHVybiB0aGlzIGJlY2F1c2Ugd2UgbmVlZCB0byBmZXRjaCB0aGUgcGFja2FnZXMgZnJvbSBOUE0gc3RpbGwgZm9yIHRoZVxuICAgIC8vIGhlbHAvZ3VpZGUgdG8gc2hvdy5cbiAgICBvcHRpb25zLnBhY2thZ2VzID0gW107XG4gIH0gZWxzZSB7XG4gICAgLy8gV2Ugc3BsaXQgZXZlcnkgcGFja2FnZXMgYnkgY29tbWFzIHRvIGFsbG93IHBlb3BsZSB0byBwYXNzIGluIG11bHRpcGxlIGFuZCBtYWtlIGl0IGFuIGFycmF5LlxuICAgIG9wdGlvbnMucGFja2FnZXMgPSBvcHRpb25zLnBhY2thZ2VzLnJlZHVjZSgoYWNjLCBjdXJyKSA9PiB7XG4gICAgICByZXR1cm4gYWNjLmNvbmNhdChjdXJyLnNwbGl0KCcsJykpO1xuICAgIH0sIFtdIGFzIHN0cmluZ1tdKTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLm1pZ3JhdGVPbmx5ICYmIG9wdGlvbnMuZnJvbSkge1xuICAgIGlmIChvcHRpb25zLnBhY2thZ2VzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJy0tZnJvbSByZXF1aXJlcyB0aGF0IG9ubHkgYSBzaW5nbGUgcGFja2FnZSBiZSBwYXNzZWQuJyk7XG4gICAgfVxuICB9XG5cbiAgb3B0aW9ucy5mcm9tID0gX2Zvcm1hdFZlcnNpb24ob3B0aW9ucy5mcm9tKTtcbiAgb3B0aW9ucy50byA9IF9mb3JtYXRWZXJzaW9uKG9wdGlvbnMudG8pO1xuICBjb25zdCB1c2luZ1lhcm4gPSBvcHRpb25zLnBhY2thZ2VNYW5hZ2VyID09PSAneWFybic7XG5cbiAgcmV0dXJuIGFzeW5jICh0cmVlOiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgbG9nZ2VyID0gY29udGV4dC5sb2dnZXI7XG4gICAgY29uc3QgbnBtRGVwcyA9IG5ldyBNYXAoXG4gICAgICBfZ2V0QWxsRGVwZW5kZW5jaWVzKHRyZWUpLmZpbHRlcigoW25hbWUsIHNwZWNpZmllcl0pID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gaXNQa2dGcm9tUmVnaXN0cnkobmFtZSwgc3BlY2lmaWVyKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oYFBhY2thZ2UgJHtuYW1lfSB3YXMgbm90IGZvdW5kIG9uIHRoZSByZWdpc3RyeS4gU2tpcHBpbmcuYCk7XG5cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICk7XG4gICAgY29uc3QgcGFja2FnZXMgPSBfYnVpbGRQYWNrYWdlTGlzdChvcHRpb25zLCBucG1EZXBzLCBsb2dnZXIpO1xuXG4gICAgLy8gR3JhYiBhbGwgcGFja2FnZS5qc29uIGZyb20gdGhlIG5wbSByZXBvc2l0b3J5LiBUaGlzIHJlcXVpcmVzIGEgbG90IG9mIEhUVFAgY2FsbHMgc28gd2VcbiAgICAvLyB0cnkgdG8gcGFyYWxsZWxpemUgYXMgbWFueSBhcyBwb3NzaWJsZS5cbiAgICBjb25zdCBhbGxQYWNrYWdlTWV0YWRhdGEgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgIEFycmF5LmZyb20obnBtRGVwcy5rZXlzKCkpLm1hcCgoZGVwTmFtZSkgPT5cbiAgICAgICAgZ2V0TnBtUGFja2FnZUpzb24oZGVwTmFtZSwgbG9nZ2VyLCB7XG4gICAgICAgICAgcmVnaXN0cnk6IG9wdGlvbnMucmVnaXN0cnksXG4gICAgICAgICAgdXNpbmdZYXJuLFxuICAgICAgICAgIHZlcmJvc2U6IG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG5cbiAgICAvLyBCdWlsZCBhIG1hcCBvZiBhbGwgZGVwZW5kZW5jaWVzIGFuZCB0aGVpciBwYWNrYWdlSnNvbi5cbiAgICBjb25zdCBucG1QYWNrYWdlSnNvbk1hcCA9IGFsbFBhY2thZ2VNZXRhZGF0YS5yZWR1Y2UoKGFjYywgbnBtUGFja2FnZUpzb24pID0+IHtcbiAgICAgIC8vIElmIHRoZSBwYWNrYWdlIHdhcyBub3QgZm91bmQgb24gdGhlIHJlZ2lzdHJ5LiBJdCBjb3VsZCBiZSBwcml2YXRlLCBzbyB3ZSB3aWxsIGp1c3RcbiAgICAgIC8vIGlnbm9yZS4gSWYgdGhlIHBhY2thZ2Ugd2FzIHBhcnQgb2YgdGhlIGxpc3QsIHdlIHdpbGwgZXJyb3Igb3V0LCBidXQgd2lsbCBzaW1wbHkgaWdub3JlXG4gICAgICAvLyBpZiBpdCdzIGVpdGhlciBub3QgcmVxdWVzdGVkIChzbyBqdXN0IHBhcnQgb2YgcGFja2FnZS5qc29uLiBzaWxlbnRseSkuXG4gICAgICBpZiAoIW5wbVBhY2thZ2VKc29uLm5hbWUpIHtcbiAgICAgICAgaWYgKG5wbVBhY2thZ2VKc29uLnJlcXVlc3RlZE5hbWUgJiYgcGFja2FnZXMuaGFzKG5wbVBhY2thZ2VKc29uLnJlcXVlc3RlZE5hbWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oXG4gICAgICAgICAgICBgUGFja2FnZSAke0pTT04uc3RyaW5naWZ5KG5wbVBhY2thZ2VKc29uLnJlcXVlc3RlZE5hbWUpfSB3YXMgbm90IGZvdW5kIG9uIHRoZSBgICtcbiAgICAgICAgICAgICAgJ3JlZ2lzdHJ5LiBDYW5ub3QgY29udGludWUgYXMgdGhpcyBtYXkgYmUgYW4gZXJyb3IuJyxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiBhIG5hbWUgaXMgcHJlc2VudCwgaXQgaXMgYXNzdW1lZCB0byBiZSBmdWxseSBwb3B1bGF0ZWRcbiAgICAgICAgYWNjLnNldChucG1QYWNrYWdlSnNvbi5uYW1lLCBucG1QYWNrYWdlSnNvbiBhcyBOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIG5ldyBNYXA8c3RyaW5nLCBOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24+KCkpO1xuXG4gICAgLy8gQXVnbWVudCB0aGUgY29tbWFuZCBsaW5lIHBhY2thZ2UgbGlzdCB3aXRoIHBhY2thZ2VHcm91cHMgYW5kIGZvcndhcmQgcGVlciBkZXBlbmRlbmNpZXMuXG4gICAgLy8gRWFjaCBhZGRlZCBwYWNrYWdlIG1heSB1bmNvdmVyIG5ldyBwYWNrYWdlIGdyb3VwcyBhbmQgcGVlciBkZXBlbmRlbmNpZXMsIHNvIHdlIG11c3RcbiAgICAvLyByZXBlYXQgdGhpcyBwcm9jZXNzIHVudGlsIHRoZSBwYWNrYWdlIGxpc3Qgc3RhYmlsaXplcy5cbiAgICBsZXQgbGFzdFBhY2thZ2VzU2l6ZTtcbiAgICBkbyB7XG4gICAgICBsYXN0UGFja2FnZXNTaXplID0gcGFja2FnZXMuc2l6ZTtcbiAgICAgIG5wbVBhY2thZ2VKc29uTWFwLmZvckVhY2goKG5wbVBhY2thZ2VKc29uKSA9PiB7XG4gICAgICAgIF9hZGRQYWNrYWdlR3JvdXAodHJlZSwgcGFja2FnZXMsIG5wbURlcHMsIG5wbVBhY2thZ2VKc29uLCBsb2dnZXIpO1xuICAgICAgICBfYWRkUGVlckRlcGVuZGVuY2llcyh0cmVlLCBwYWNrYWdlcywgbnBtRGVwcywgbnBtUGFja2FnZUpzb24sIG5wbVBhY2thZ2VKc29uTWFwLCBsb2dnZXIpO1xuICAgICAgfSk7XG4gICAgfSB3aGlsZSAocGFja2FnZXMuc2l6ZSA+IGxhc3RQYWNrYWdlc1NpemUpO1xuXG4gICAgLy8gQnVpbGQgdGhlIFBhY2thZ2VJbmZvIGZvciBlYWNoIG1vZHVsZS5cbiAgICBjb25zdCBwYWNrYWdlSW5mb01hcCA9IG5ldyBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz4oKTtcbiAgICBucG1QYWNrYWdlSnNvbk1hcC5mb3JFYWNoKChucG1QYWNrYWdlSnNvbikgPT4ge1xuICAgICAgcGFja2FnZUluZm9NYXAuc2V0KFxuICAgICAgICBucG1QYWNrYWdlSnNvbi5uYW1lLFxuICAgICAgICBfYnVpbGRQYWNrYWdlSW5mbyh0cmVlLCBwYWNrYWdlcywgbnBtRGVwcywgbnBtUGFja2FnZUpzb24sIGxvZ2dlciksXG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgLy8gTm93IHRoYXQgd2UgaGF2ZSBhbGwgdGhlIGluZm9ybWF0aW9uLCBjaGVjayB0aGUgZmxhZ3MuXG4gICAgaWYgKHBhY2thZ2VzLnNpemUgPiAwKSB7XG4gICAgICBpZiAob3B0aW9ucy5taWdyYXRlT25seSAmJiBvcHRpb25zLmZyb20gJiYgb3B0aW9ucy5wYWNrYWdlcykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHN1YmxvZyA9IG5ldyBsb2dnaW5nLkxldmVsQ2FwTG9nZ2VyKCd2YWxpZGF0aW9uJywgbG9nZ2VyLmNyZWF0ZUNoaWxkKCcnKSwgJ3dhcm4nKTtcbiAgICAgIF92YWxpZGF0ZVVwZGF0ZVBhY2thZ2VzKHBhY2thZ2VJbmZvTWFwLCAhIW9wdGlvbnMuZm9yY2UsICEhb3B0aW9ucy5uZXh0LCBzdWJsb2cpO1xuXG4gICAgICBfcGVyZm9ybVVwZGF0ZSh0cmVlLCBjb250ZXh0LCBwYWNrYWdlSW5mb01hcCwgbG9nZ2VyLCAhIW9wdGlvbnMubWlncmF0ZU9ubHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBfdXNhZ2VNZXNzYWdlKG9wdGlvbnMsIHBhY2thZ2VJbmZvTWFwLCBsb2dnZXIpO1xuICAgIH1cbiAgfTtcbn1cbiJdfQ==