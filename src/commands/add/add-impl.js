"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCommandModule = void 0;
const core_1 = require("@angular-devkit/core");
const tools_1 = require("@angular-devkit/schematics/tools");
const npm_package_arg_1 = __importDefault(require("npm-package-arg"));
const path_1 = require("path");
const semver_1 = require("semver");
const workspace_schema_1 = require("../../../lib/config/workspace-schema");
const schematic_command_1 = require("../../../models/schematic-command");
const analytics_1 = require("../../analytics/analytics");
const color_1 = require("../../utilities/color");
const install_package_1 = require("../../utilities/install-package");
const package_manager_1 = require("../../utilities/package-manager");
const package_metadata_1 = require("../../utilities/package-metadata");
const prompt_1 = require("../../utilities/prompt");
const spinner_1 = require("../../utilities/spinner");
const tty_1 = require("../../utilities/tty");
/**
 * The set of packages that should have certain versions excluded from consideration
 * when attempting to find a compatible version for a package.
 * The key is a package name and the value is a SemVer range of versions to exclude.
 */
const packageVersionExclusions = {
    // @angular/localize@9.x versions do not have peer dependencies setup
    '@angular/localize': '9.x',
};
class AddCommandModule extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.allowPrivateSchematics = true;
    }
    // eslint-disable-next-line max-lines-per-function
    async run(options) {
        var _a;
        await (0, package_manager_1.ensureCompatibleNpm)(this.context.root);
        if (!options.collection) {
            this.logger.fatal(`The "ng add" command requires a name argument to be specified eg. ` +
                `${color_1.colors.yellow('ng add [name] ')}. For more details, use "ng help".`);
            return 1;
        }
        let packageIdentifier;
        try {
            packageIdentifier = (0, npm_package_arg_1.default)(options.collection);
        }
        catch (e) {
            this.logger.error(e.message);
            return 1;
        }
        if (packageIdentifier.name &&
            packageIdentifier.registry &&
            this.isPackageInstalled(packageIdentifier.name)) {
            const validVersion = await this.isProjectVersionValid(packageIdentifier);
            if (validVersion) {
                // Already installed so just run schematic
                this.logger.info('Skipping installation: Package already installed');
                return this.executeSchematic(packageIdentifier.name, options);
            }
        }
        const spinner = new spinner_1.Spinner();
        spinner.start('Determining package manager...');
        const packageManager = await (0, package_manager_1.getPackageManager)(this.context.root);
        const usingYarn = packageManager === workspace_schema_1.PackageManager.Yarn;
        spinner.info(`Using package manager: ${color_1.colors.grey(packageManager)}`);
        if (packageIdentifier.name && packageIdentifier.type === 'tag' && !packageIdentifier.rawSpec) {
            // only package name provided; search for viable version
            // plus special cases for packages that did not have peer deps setup
            spinner.start('Searching for compatible package version...');
            let packageMetadata;
            try {
                packageMetadata = await (0, package_metadata_1.fetchPackageMetadata)(packageIdentifier.name, this.logger, {
                    registry: options.registry,
                    usingYarn,
                    verbose: options.verbose,
                });
            }
            catch (e) {
                spinner.fail('Unable to load package information from registry: ' + e.message);
                return 1;
            }
            // Start with the version tagged as `latest` if it exists
            const latestManifest = packageMetadata.tags['latest'];
            if (latestManifest) {
                packageIdentifier = npm_package_arg_1.default.resolve(latestManifest.name, latestManifest.version);
            }
            // Adjust the version based on name and peer dependencies
            if (latestManifest && Object.keys(latestManifest.peerDependencies).length === 0) {
                if (latestManifest.name === '@angular/pwa') {
                    const version = await this.findProjectVersion('@angular/cli');
                    const semverOptions = { includePrerelease: true };
                    if (version &&
                        (((0, semver_1.validRange)(version) && (0, semver_1.intersects)(version, '7', semverOptions)) ||
                            ((0, semver_1.valid)(version) && (0, semver_1.satisfies)(version, '7', semverOptions)))) {
                        packageIdentifier = npm_package_arg_1.default.resolve('@angular/pwa', '0.12');
                    }
                }
                spinner.succeed(`Found compatible package version: ${color_1.colors.grey(packageIdentifier.toString())}.`);
            }
            else if (!latestManifest || (await this.hasMismatchedPeer(latestManifest))) {
                // 'latest' is invalid so search for most recent matching package
                const versionExclusions = packageVersionExclusions[packageMetadata.name];
                const versionManifests = Object.values(packageMetadata.versions).filter((value) => {
                    // Prerelease versions are not stable and should not be considered by default
                    if ((0, semver_1.prerelease)(value.version)) {
                        return false;
                    }
                    // Deprecated versions should not be used or considered
                    if (value.deprecated) {
                        return false;
                    }
                    // Excluded package versions should not be considered
                    if (versionExclusions && (0, semver_1.satisfies)(value.version, versionExclusions)) {
                        return false;
                    }
                    return true;
                });
                versionManifests.sort((a, b) => (0, semver_1.rcompare)(a.version, b.version, true));
                let newIdentifier;
                for (const versionManifest of versionManifests) {
                    if (!(await this.hasMismatchedPeer(versionManifest))) {
                        newIdentifier = npm_package_arg_1.default.resolve(versionManifest.name, versionManifest.version);
                        break;
                    }
                }
                if (!newIdentifier) {
                    spinner.warn("Unable to find compatible package. Using 'latest' tag.");
                }
                else {
                    packageIdentifier = newIdentifier;
                    spinner.succeed(`Found compatible package version: ${color_1.colors.grey(packageIdentifier.toString())}.`);
                }
            }
            else {
                spinner.succeed(`Found compatible package version: ${color_1.colors.grey(packageIdentifier.toString())}.`);
            }
        }
        let collectionName = packageIdentifier.name;
        let savePackage;
        try {
            spinner.start('Loading package information from registry...');
            const manifest = await (0, package_metadata_1.fetchPackageManifest)(packageIdentifier.toString(), this.logger, {
                registry: options.registry,
                verbose: options.verbose,
                usingYarn,
            });
            savePackage = (_a = manifest['ng-add']) === null || _a === void 0 ? void 0 : _a.save;
            collectionName = manifest.name;
            if (await this.hasMismatchedPeer(manifest)) {
                spinner.warn('Package has unmet peer dependencies. Adding the package may not succeed.');
            }
            else {
                spinner.succeed(`Package information loaded.`);
            }
        }
        catch (e) {
            spinner.fail(`Unable to fetch package information for '${packageIdentifier}': ${e.message}`);
            return 1;
        }
        if (!options.skipConfirmation) {
            const confirmationResponse = await (0, prompt_1.askConfirmation)(`\nThe package ${color_1.colors.blue(packageIdentifier.raw)} will be installed and executed.\n` +
                'Would you like to proceed?', true, false);
            if (!confirmationResponse) {
                if (!(0, tty_1.isTTY)()) {
                    this.logger.error('No terminal detected. ' +
                        `'--skip-confirmation' can be used to bypass installation confirmation. ` +
                        `Ensure package name is correct prior to '--skip-confirmation' option usage.`);
                }
                this.logger.error('Command aborted.');
                return 1;
            }
        }
        if (savePackage === false) {
            // Temporary packages are located in a different directory
            // Hence we need to resolve them using the temp path
            const { status, tempNodeModules } = await (0, install_package_1.installTempPackage)(packageIdentifier.raw, packageManager, options.registry ? [`--registry="${options.registry}"`] : undefined);
            const resolvedCollectionPath = require.resolve((0, path_1.join)(collectionName, 'package.json'), {
                paths: [tempNodeModules],
            });
            if (status !== 0) {
                return status;
            }
            collectionName = (0, path_1.dirname)(resolvedCollectionPath);
        }
        else {
            const status = await (0, install_package_1.installPackage)(packageIdentifier.raw, packageManager, savePackage, options.registry ? [`--registry="${options.registry}"`] : undefined);
            if (status !== 0) {
                return status;
            }
        }
        return this.executeSchematic(collectionName, options);
    }
    async isProjectVersionValid(packageIdentifier) {
        if (!packageIdentifier.name) {
            return false;
        }
        let validVersion = false;
        const installedVersion = await this.findProjectVersion(packageIdentifier.name);
        if (installedVersion) {
            if (packageIdentifier.type === 'range' && packageIdentifier.fetchSpec) {
                validVersion = (0, semver_1.satisfies)(installedVersion, packageIdentifier.fetchSpec);
            }
            else if (packageIdentifier.type === 'version') {
                const v1 = (0, semver_1.valid)(packageIdentifier.fetchSpec);
                const v2 = (0, semver_1.valid)(installedVersion);
                validVersion = v1 !== null && v1 === v2;
            }
            else if (!packageIdentifier.rawSpec) {
                validVersion = true;
            }
        }
        return validVersion;
    }
    async reportAnalytics(paths, options, dimensions = [], metrics = []) {
        const collection = options.collection;
        // Add the collection if it's safe listed.
        if (collection && (0, analytics_1.isPackageNameSafeForAnalytics)(collection)) {
            dimensions[core_1.analytics.NgCliAnalyticsDimensions.NgAddCollection] = collection;
        }
        else {
            delete dimensions[core_1.analytics.NgCliAnalyticsDimensions.NgAddCollection];
        }
        return super.reportAnalytics(paths, options, dimensions, metrics);
    }
    isPackageInstalled(name) {
        try {
            require.resolve((0, path_1.join)(name, 'package.json'), { paths: [this.context.root] });
            return true;
        }
        catch (e) {
            if (e.code !== 'MODULE_NOT_FOUND') {
                throw e;
            }
        }
        return false;
    }
    async executeSchematic(collectionName, options) {
        try {
            const { collection, verbose, registry, skipConfirmation, skipInstall, interactive, force, dryRun, defaults: defaultVal, ...schematicOptions } = options;
            return await this.runSchematic({
                schematicOptions,
                collectionName,
                schematicName: 'ng-add',
                dryRun: false,
                force: false,
            });
        }
        catch (e) {
            if (e instanceof tools_1.NodePackageDoesNotSupportSchematics) {
                this.logger.error(core_1.tags.oneLine `
          The package that you are trying to add does not support schematics. You can try using
          a different version of the package or contact the package author to add ng-add support.
        `);
                return 1;
            }
            throw e;
        }
    }
    async findProjectVersion(name) {
        let installedPackage;
        try {
            installedPackage = require.resolve((0, path_1.join)(name, 'package.json'), {
                paths: [this.context.root],
            });
        }
        catch (_a) { }
        if (installedPackage) {
            try {
                const installed = await (0, package_metadata_1.fetchPackageManifest)((0, path_1.dirname)(installedPackage), this.logger);
                return installed.version;
            }
            catch (_b) { }
        }
        let projectManifest;
        try {
            projectManifest = await (0, package_metadata_1.fetchPackageManifest)(this.context.root, this.logger);
        }
        catch (_c) { }
        if (projectManifest) {
            const version = projectManifest.dependencies[name] || projectManifest.devDependencies[name];
            if (version) {
                return version;
            }
        }
        return null;
    }
    async hasMismatchedPeer(manifest) {
        for (const peer in manifest.peerDependencies) {
            let peerIdentifier;
            try {
                peerIdentifier = npm_package_arg_1.default.resolve(peer, manifest.peerDependencies[peer]);
            }
            catch (_a) {
                this.logger.warn(`Invalid peer dependency ${peer} found in package.`);
                continue;
            }
            if (peerIdentifier.type === 'version' || peerIdentifier.type === 'range') {
                try {
                    const version = await this.findProjectVersion(peer);
                    if (!version) {
                        continue;
                    }
                    const options = { includePrerelease: true };
                    if (!(0, semver_1.intersects)(version, peerIdentifier.rawSpec, options) &&
                        !(0, semver_1.satisfies)(version, peerIdentifier.rawSpec, options)) {
                        return true;
                    }
                }
                catch (_b) {
                    // Not found or invalid so ignore
                    continue;
                }
            }
            else {
                // type === 'tag' | 'file' | 'directory' | 'remote' | 'git'
                // Cannot accurately compare these as the tag/location may have changed since install
            }
        }
        return false;
    }
}
exports.AddCommandModule = AddCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZHMvYWRkL2FkZC1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUVILCtDQUF1RDtBQUN2RCw0REFBdUY7QUFDdkYsc0VBQWtDO0FBQ2xDLCtCQUFxQztBQUNyQyxtQ0FBd0Y7QUFDeEYsMkVBQXNFO0FBQ3RFLHlFQUFxRTtBQUNyRSx5REFBMEU7QUFFMUUsaURBQStDO0FBQy9DLHFFQUFxRjtBQUNyRixxRUFBeUY7QUFDekYsdUVBSzBDO0FBQzFDLG1EQUF5RDtBQUN6RCxxREFBa0Q7QUFDbEQsNkNBQTRDO0FBSzVDOzs7O0dBSUc7QUFDSCxNQUFNLHdCQUF3QixHQUF1QztJQUNuRSxxRUFBcUU7SUFDckUsbUJBQW1CLEVBQUUsS0FBSztDQUMzQixDQUFDO0FBRUYsTUFBYSxnQkFBaUIsU0FBUSxvQ0FBbUM7SUFBekU7O1FBQ29CLDJCQUFzQixHQUFHLElBQUksQ0FBQztJQXVYbEQsQ0FBQztJQXJYQyxrREFBa0Q7SUFDbEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUEwQjs7UUFDbEMsTUFBTSxJQUFBLHFDQUFtQixFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFN0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUU7WUFDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2Ysb0VBQW9FO2dCQUNsRSxHQUFHLGNBQU0sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsb0NBQW9DLENBQ3pFLENBQUM7WUFFRixPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsSUFBSSxpQkFBaUIsQ0FBQztRQUN0QixJQUFJO1lBQ0YsaUJBQWlCLEdBQUcsSUFBQSx5QkFBRyxFQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMs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QWMsR0FBRyx5QkFBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDckU7WUFBQyxXQUFNO2dCQUNOLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDJCQUEyQixJQUFJLG9CQUFvQixDQUFDLENBQUM7Z0JBQ3RFLFNBQVM7YUFDVjtZQUVELElBQUksY0FBYyxDQUFDLElBQUksS0FBSyxTQUFTLElBQUksY0FBYyxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUU7Z0JBQ3hFLElBQUk7b0JBQ0YsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3BELElBQUksQ0FBQyxPQUFPLEVBQUU7d0JBQ1osU0FBUztxQkFDVjtvQkFFRCxNQUFNLE9BQU8sR0FBRyxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUFDO29CQUU1QyxJQUNFLENBQUMsSUFBQSxtQkFBVSxFQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQzt3QkFDckQsQ0FBQyxJQUFBLGtCQUFTLEVBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQ3BEO3dCQUNBLE9BQU8sSUFBSSxDQUFDO3FCQUNiO2lCQUNGO2dCQUFDLFdBQU07b0JBQ04saUNBQWlDO29CQUNqQyxTQUFTO2lCQUNWO2FBQ0Y7aUJBQU07Z0JBQ0wsMkRBQTJEO2dCQUMzRCxxRkFBcUY7YUFDdEY7U0FDRjtRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztDQUNGO0FBeFhELDRDQXdYQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBhbmFseXRpY3MsIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZURvZXNOb3RTdXBwb3J0U2NoZW1hdGljcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCBucGEgZnJvbSAnbnBtLXBhY2thZ2UtYXJnJztcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGludGVyc2VjdHMsIHByZXJlbGVhc2UsIHJjb21wYXJlLCBzYXRpc2ZpZXMsIHZhbGlkLCB2YWxpZFJhbmdlIH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vLi4vLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYXRpY0NvbW1hbmQgfSBmcm9tICcuLi8uLi8uLi9tb2RlbHMvc2NoZW1hdGljLWNvbW1hbmQnO1xuaW1wb3J0IHsgaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MgfSBmcm9tICcuLi8uLi9hbmFseXRpY3MvYW5hbHl0aWNzJztcbmltcG9ydCB7IE9wdGlvbnMgfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IGluc3RhbGxQYWNrYWdlLCBpbnN0YWxsVGVtcFBhY2thZ2UgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvaW5zdGFsbC1wYWNrYWdlJztcbmltcG9ydCB7IGVuc3VyZUNvbXBhdGlibGVOcG0sIGdldFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWFuYWdlcic7XG5pbXBvcnQge1xuICBOZ0FkZFNhdmVEZXBlZGVuY3ksXG4gIFBhY2thZ2VNYW5pZmVzdCxcbiAgZmV0Y2hQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1ldGFkYXRhLFxufSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcGFja2FnZS1tZXRhZGF0YSc7XG5pbXBvcnQgeyBhc2tDb25maXJtYXRpb24gfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcHJvbXB0JztcbmltcG9ydCB7IFNwaW5uZXIgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvc3Bpbm5lcic7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy90dHknO1xuaW1wb3J0IHsgQWRkQ29tbWFuZEFyZ3MgfSBmcm9tICcuL2NsaSc7XG5cbnR5cGUgQWRkQ29tbWFuZE9wdGlvbnMgPSBPcHRpb25zPEFkZENvbW1hbmRBcmdzPjtcblxuLyoqXG4gKiBUaGUgc2V0IG9mIHBhY2thZ2VzIHRoYXQgc2hvdWxkIGhhdmUgY2VydGFpbiB2ZXJzaW9ucyBleGNsdWRlZCBmcm9tIGNvbnNpZGVyYXRpb25cbiAqIHdoZW4gYXR0ZW1wdGluZyB0byBmaW5kIGEgY29tcGF0aWJsZSB2ZXJzaW9uIGZvciBhIHBhY2thZ2UuXG4gKiBUaGUga2V5IGlzIGEgcGFja2FnZSBuYW1lIGFuZCB0aGUgdmFsdWUgaXMgYSBTZW1WZXIgcmFuZ2Ugb2YgdmVyc2lvbnMgdG8gZXhjbHVkZS5cbiAqL1xuY29uc3QgcGFja2FnZVZlcnNpb25FeGNsdXNpb25zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCB1bmRlZmluZWQ+ID0ge1xuICAvLyBAYW5ndWxhci9sb2NhbGl6ZUA5LnggdmVyc2lvbnMgZG8gbm90IGhhdmUgcGVlciBkZXBlbmRlbmNpZXMgc2V0dXBcbiAgJ0Bhbmd1bGFyL2xvY2FsaXplJzogJzkueCcsXG59O1xuXG5leHBvcnQgY2xhc3MgQWRkQ29tbWFuZE1vZHVsZSBleHRlbmRzIFNjaGVtYXRpY0NvbW1hbmQ8QWRkQ29tbWFuZE9wdGlvbnM+IHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgYWxsb3dQcml2YXRlU2NoZW1hdGljcyA9IHRydWU7XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lcy1wZXItZnVuY3Rpb25cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IEFkZENvbW1hbmRPcHRpb25zKSB7XG4gICAgYXdhaXQgZW5zdXJlQ29tcGF0aWJsZU5wbSh0aGlzLmNvbnRleHQucm9vdCk7XG5cbiAgICBpZiAoIW9wdGlvbnMuY29sbGVjdGlvbikge1xuICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoXG4gICAgICAgIGBUaGUgXCJuZyBhZGRcIiBjb21tYW5kIHJlcXVpcmVzIGEgbmFtZSBhcmd1bWVudCB0byBiZSBzcGVjaWZpZWQgZWcuIGAgK1xuICAgICAgICAgIGAke2NvbG9ycy55ZWxsb3coJ25nIGFkZCBbbmFtZV0gJyl9LiBGb3IgbW9yZSBkZXRhaWxzLCB1c2UgXCJuZyBoZWxwXCIuYCxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGxldCBwYWNrYWdlSWRlbnRpZmllcjtcbiAgICB0cnkge1xuICAgICAgcGFja2FnZUlkZW50aWZpZXIgPSBucGEob3B0aW9ucy5jb2xsZWN0aW9uKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcihlLm1lc3NhZ2UpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgICBwYWNrYWdlSWRlbnRpZmllci5uYW1lICYmXG4gICAgICBwYWNrYWdlSWRlbnRpZmllci5yZWdpc3RyeSAmJlxuICAgICAgdGhpcy5pc1BhY2thZ2VJbnN0YWxsZWQocGFja2FnZUlkZW50aWZpZXIubmFtZSlcbiAgICApIHtcbiAgICAgIGNvbnN0IHZhbGlkVmVyc2lvbiA9IGF3YWl0IHRoaXMuaXNQcm9qZWN0VmVyc2lvblZhbGlkKHBhY2thZ2VJZGVudGlmaWVyKTtcbiAgICAgIGlmICh2YWxpZFZlcnNpb24pIHtcbiAgICAgICAgLy8gQWxyZWFkeSBpbnN0YWxsZWQgc28ganVzdCBydW4gc2NoZW1hdGljXG4gICAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ1NraXBwaW5nIGluc3RhbGxhdGlvbjogUGFja2FnZSBhbHJlYWR5IGluc3RhbGxlZCcpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMocGFja2FnZUlkZW50aWZpZXIubmFtZSwgb3B0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgc3Bpbm5lciA9IG5ldyBTcGlubmVyKCk7XG5cbiAgICBzcGlubmVyLnN0YXJ0KCdEZXRlcm1pbmluZyBwYWNrYWdlIG1hbmFnZXIuLi4nKTtcbiAgICBjb25zdCBwYWNrYWdlTWFuYWdlciA9IGF3YWl0IGdldFBhY2thZ2VNYW5hZ2VyKHRoaXMuY29udGV4dC5yb290KTtcbiAgICBjb25zdCB1c2luZ1lhcm4gPSBwYWNrYWdlTWFuYWdlciA9PT0gUGFja2FnZU1hbmFnZXIuWWFybjtcbiAgICBzcGlubmVyLmluZm8oYFVzaW5nIHBhY2thZ2UgbWFuYWdlcjogJHtjb2xvcnMuZ3JleShwYWNrYWdlTWFuYWdlcil9YCk7XG5cbiAgICBpZiAocGFja2FnZUlkZW50aWZpZXIubmFtZSAmJiBwYWNrYWdlSWRlbnRpZmllci50eXBlID09PSAndGFnJyAmJiAhcGFja2FnZUlkZW50aWZpZXIucmF3U3BlYykge1xuICAgICAgLy8gb25seSBwYWNrYWdlIG5hbWUgcHJvdmlkZWQ7IHNlYXJjaCBmb3IgdmlhYmxlIHZlcnNpb25cbiAgICAgIC8vIHBsdXMgc3BlY2lhbCBjYXNlcyBmb3IgcGFja2FnZXMgdGhhdCBkaWQgbm90IGhhdmUgcGVlciBkZXBzIHNldHVwXG4gICAgICBzcGlubmVyLnN0YXJ0KCdTZWFyY2hpbmcgZm9yIGNvbXBhdGlibGUgcGFja2FnZSB2ZXJzaW9uLi4uJyk7XG5cbiAgICAgIGxldCBwYWNrYWdlTWV0YWRhdGE7XG4gICAgICB0cnkge1xuICAgICAgICBwYWNrYWdlTWV0YWRhdGEgPSBhd2FpdCBmZXRjaFBhY2thZ2VNZXRhZGF0YShwYWNrYWdlSWRlbnRpZmllci5uYW1lLCB0aGlzLmxvZ2dlciwge1xuICAgICAgICAgIHJlZ2lzdHJ5OiBvcHRpb25zLnJlZ2lzdHJ5LFxuICAgICAgICAgIHVzaW5nWWFybixcbiAgICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBzcGlubmVyLmZhaWwoJ1VuYWJsZSB0byBsb2FkIHBhY2thZ2UgaW5mb3JtYXRpb24gZnJvbSByZWdpc3RyeTogJyArIGUubWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIFN0YXJ0IHdpdGggdGhlIHZlcnNpb24gdGFnZ2VkIGFzIGBsYXRlc3RgIGlmIGl0IGV4aXN0c1xuICAgICAgY29uc3QgbGF0ZXN0TWFuaWZlc3QgPSBwYWNrYWdlTWV0YWRhdGEudGFnc1snbGF0ZXN0J107XG4gICAgICBpZiAobGF0ZXN0TWFuaWZlc3QpIHtcbiAgICAgICAgcGFja2FnZUlkZW50aWZpZXIgPSBucGEucmVzb2x2ZShsYXRlc3RNYW5pZmVzdC5uYW1lLCBsYXRlc3RNYW5pZmVzdC52ZXJzaW9uKTtcbiAgICAgIH1cblxuICAgICAgLy8gQWRqdXN0IHRoZSB2ZXJzaW9uIGJhc2VkIG9uIG5hbWUgYW5kIHBlZXIgZGVwZW5kZW5jaWVzXG4gICAgICBpZiAobGF0ZXN0TWFuaWZlc3QgJiYgT2JqZWN0LmtleXMobGF0ZXN0TWFuaWZlc3QucGVlckRlcGVuZGVuY2llcykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGlmIChsYXRlc3RNYW5pZmVzdC5uYW1lID09PSAnQGFuZ3VsYXIvcHdhJykge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBhd2FpdCB0aGlzLmZpbmRQcm9qZWN0VmVyc2lvbignQGFuZ3VsYXIvY2xpJyk7XG4gICAgICAgICAgY29uc3Qgc2VtdmVyT3B0aW9ucyA9IHsgaW5jbHVkZVByZXJlbGVhc2U6IHRydWUgfTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHZlcnNpb24gJiZcbiAgICAgICAgICAgICgodmFsaWRSYW5nZSh2ZXJzaW9uKSAmJiBpbnRlcnNlY3RzKHZlcnNpb24sICc3Jywgc2VtdmVyT3B0aW9ucykpIHx8XG4gICAgICAgICAgICAgICh2YWxpZCh2ZXJzaW9uKSAmJiBzYXRpc2ZpZXModmVyc2lvbiwgJzcnLCBzZW12ZXJPcHRpb25zKSkpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBwYWNrYWdlSWRlbnRpZmllciA9IG5wYS5yZXNvbHZlKCdAYW5ndWxhci9wd2EnLCAnMC4xMicpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHNwaW5uZXIuc3VjY2VlZChcbiAgICAgICAgICBgRm91bmQgY29tcGF0aWJsZSBwYWNrYWdlIHZlcnNpb246ICR7Y29sb3JzLmdyZXkocGFja2FnZUlkZW50aWZpZXIudG9TdHJpbmcoKSl9LmAsXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKCFsYXRlc3RNYW5pZmVzdCB8fCAoYXdhaXQgdGhpcy5oYXNNaXNtYXRjaGVkUGVlcihsYXRlc3RNYW5pZmVzdCkpKSB7XG4gICAgICAgIC8vICdsYXRlc3QnIGlzIGludmFsaWQgc28gc2VhcmNoIGZvciBtb3N0IHJlY2VudCBtYXRjaGluZyBwYWNrYWdlXG4gICAgICAgIGNvbnN0IHZlcnNpb25FeGNsdXNpb25zID0gcGFja2FnZVZlcnNpb25FeGNsdXNpb25zW3BhY2thZ2VNZXRhZGF0YS5uYW1lXTtcbiAgICAgICAgY29uc3QgdmVyc2lvbk1hbmlmZXN0cyA9IE9iamVjdC52YWx1ZXMocGFja2FnZU1ldGFkYXRhLnZlcnNpb25zKS5maWx0ZXIoXG4gICAgICAgICAgKHZhbHVlOiBQYWNrYWdlTWFuaWZlc3QpID0+IHtcbiAgICAgICAgICAgIC8vIFByZXJlbGVhc2UgdmVyc2lvbnMgYXJlIG5vdCBzdGFibGUgYW5kIHNob3VsZCBub3QgYmUgY29uc2lkZXJlZCBieSBkZWZhdWx0XG4gICAgICAgICAgICBpZiAocHJlcmVsZWFzZSh2YWx1ZS52ZXJzaW9uKSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBEZXByZWNhdGVkIHZlcnNpb25zIHNob3VsZCBub3QgYmUgdXNlZCBvciBjb25zaWRlcmVkXG4gICAgICAgICAgICBpZiAodmFsdWUuZGVwcmVjYXRlZCkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBFeGNsdWRlZCBwYWNrYWdlIHZlcnNpb25zIHNob3VsZCBub3QgYmUgY29uc2lkZXJlZFxuICAgICAgICAgICAgaWYgKHZlcnNpb25FeGNsdXNpb25zICYmIHNhdGlzZmllcyh2YWx1ZS52ZXJzaW9uLCB2ZXJzaW9uRXhjbHVzaW9ucykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9LFxuICAgICAgICApO1xuXG4gICAgICAgIHZlcnNpb25NYW5pZmVzdHMuc29ydCgoYSwgYikgPT4gcmNvbXBhcmUoYS52ZXJzaW9uLCBiLnZlcnNpb24sIHRydWUpKTtcblxuICAgICAgICBsZXQgbmV3SWRlbnRpZmllcjtcbiAgICAgICAgZm9yIChjb25zdCB2ZXJzaW9uTWFuaWZlc3Qgb2YgdmVyc2lvbk1hbmlmZXN0cykge1xuICAgICAgICAgIGlmICghKGF3YWl0IHRoaXMuaGFzTWlzbWF0Y2hlZFBlZXIodmVyc2lvbk1hbmlmZXN0KSkpIHtcbiAgICAgICAgICAgIG5ld0lkZW50aWZpZXIgPSBucGEucmVzb2x2ZSh2ZXJzaW9uTWFuaWZlc3QubmFtZSwgdmVyc2lvbk1hbmlmZXN0LnZlcnNpb24pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFuZXdJZGVudGlmaWVyKSB7XG4gICAgICAgICAgc3Bpbm5lci53YXJuKFwiVW5hYmxlIHRvIGZpbmQgY29tcGF0aWJsZSBwYWNrYWdlLiBVc2luZyAnbGF0ZXN0JyB0YWcuXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhY2thZ2VJZGVudGlmaWVyID0gbmV3SWRlbnRpZmllcjtcbiAgICAgICAgICBzcGlubmVyLnN1Y2NlZWQoXG4gICAgICAgICAgICBgRm91bmQgY29tcGF0aWJsZSBwYWNrYWdlIHZlcnNpb246ICR7Y29sb3JzLmdyZXkocGFja2FnZUlkZW50aWZpZXIudG9TdHJpbmcoKSl9LmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3Bpbm5lci5zdWNjZWVkKFxuICAgICAgICAgIGBGb3VuZCBjb21wYXRpYmxlIHBhY2thZ2UgdmVyc2lvbjogJHtjb2xvcnMuZ3JleShwYWNrYWdlSWRlbnRpZmllci50b1N0cmluZygpKX0uYCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgY29sbGVjdGlvbk5hbWUgPSBwYWNrYWdlSWRlbnRpZmllci5uYW1lO1xuICAgIGxldCBzYXZlUGFja2FnZTogTmdBZGRTYXZlRGVwZWRlbmN5IHwgdW5kZWZpbmVkO1xuXG4gICAgdHJ5IHtcbiAgICAgIHNwaW5uZXIuc3RhcnQoJ0xvYWRpbmcgcGFja2FnZSBpbmZvcm1hdGlvbiBmcm9tIHJlZ2lzdHJ5Li4uJyk7XG4gICAgICBjb25zdCBtYW5pZmVzdCA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KHBhY2thZ2VJZGVudGlmaWVyLnRvU3RyaW5nKCksIHRoaXMubG9nZ2VyLCB7XG4gICAgICAgIHJlZ2lzdHJ5OiBvcHRpb25zLnJlZ2lzdHJ5LFxuICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgIHVzaW5nWWFybixcbiAgICAgIH0pO1xuXG4gICAgICBzYXZlUGFja2FnZSA9IG1hbmlmZXN0WyduZy1hZGQnXT8uc2F2ZTtcbiAgICAgIGNvbGxlY3Rpb25OYW1lID0gbWFuaWZlc3QubmFtZTtcblxuICAgICAgaWYgKGF3YWl0IHRoaXMuaGFzTWlzbWF0Y2hlZFBlZXIobWFuaWZlc3QpKSB7XG4gICAgICAgIHNwaW5uZXIud2FybignUGFja2FnZSBoYXMgdW5tZXQgcGVlciBkZXBlbmRlbmNpZXMuIEFkZGluZyB0aGUgcGFja2FnZSBtYXkgbm90IHN1Y2NlZWQuJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzcGlubmVyLnN1Y2NlZWQoYFBhY2thZ2UgaW5mb3JtYXRpb24gbG9hZGVkLmApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHNwaW5uZXIuZmFpbChgVW5hYmxlIHRvIGZldGNoIHBhY2thZ2UgaW5mb3JtYXRpb24gZm9yICcke3BhY2thZ2VJZGVudGlmaWVyfSc6ICR7ZS5tZXNzYWdlfWApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBpZiAoIW9wdGlvbnMuc2tpcENvbmZpcm1hdGlvbikge1xuICAgICAgY29uc3QgY29uZmlybWF0aW9uUmVzcG9uc2UgPSBhd2FpdCBhc2tDb25maXJtYXRpb24oXG4gICAgICAgIGBcXG5UaGUgcGFja2FnZSAke2NvbG9ycy5ibHVlKHBhY2thZ2VJZGVudGlmaWVyLnJhdyl9IHdpbGwgYmUgaW5zdGFsbGVkIGFuZCBleGVjdXRlZC5cXG5gICtcbiAgICAgICAgICAnV291bGQgeW91IGxpa2UgdG8gcHJvY2VlZD8nLFxuICAgICAgICB0cnVlLFxuICAgICAgICBmYWxzZSxcbiAgICAgICk7XG5cbiAgICAgIGlmICghY29uZmlybWF0aW9uUmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKCFpc1RUWSgpKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAnTm8gdGVybWluYWwgZGV0ZWN0ZWQuICcgK1xuICAgICAgICAgICAgICBgJy0tc2tpcC1jb25maXJtYXRpb24nIGNhbiBiZSB1c2VkIHRvIGJ5cGFzcyBpbnN0YWxsYXRpb24gY29uZmlybWF0aW9uLiBgICtcbiAgICAgICAgICAgICAgYEVuc3VyZSBwYWNrYWdlIG5hbWUgaXMgY29ycmVjdCBwcmlvciB0byAnLS1za2lwLWNvbmZpcm1hdGlvbicgb3B0aW9uIHVzYWdlLmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignQ29tbWFuZCBhYm9ydGVkLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzYXZlUGFja2FnZSA9PT0gZmFsc2UpIHtcbiAgICAgIC8vIFRlbXBvcmFyeSBwYWNrYWdlcyBhcmUgbG9jYXRlZCBpbiBhIGRpZmZlcmVudCBkaXJlY3RvcnlcbiAgICAgIC8vIEhlbmNlIHdlIG5lZWQgdG8gcmVzb2x2ZSB0aGVtIHVzaW5nIHRoZSB0ZW1wIHBhdGhcbiAgICAgIGNvbnN0IHsgc3RhdHVzLCB0ZW1wTm9kZU1vZHVsZXMgfSA9IGF3YWl0IGluc3RhbGxUZW1wUGFja2FnZShcbiAgICAgICAgcGFja2FnZUlkZW50aWZpZXIucmF3LFxuICAgICAgICBwYWNrYWdlTWFuYWdlcixcbiAgICAgICAgb3B0aW9ucy5yZWdpc3RyeSA/IFtgLS1yZWdpc3RyeT1cIiR7b3B0aW9ucy5yZWdpc3RyeX1cImBdIDogdW5kZWZpbmVkLFxuICAgICAgKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkQ29sbGVjdGlvblBhdGggPSByZXF1aXJlLnJlc29sdmUoam9pbihjb2xsZWN0aW9uTmFtZSwgJ3BhY2thZ2UuanNvbicpLCB7XG4gICAgICAgIHBhdGhzOiBbdGVtcE5vZGVNb2R1bGVzXSxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoc3RhdHVzICE9PSAwKSB7XG4gICAgICAgIHJldHVybiBzdGF0dXM7XG4gICAgICB9XG5cbiAgICAgIGNvbGxlY3Rpb25OYW1lID0gZGlybmFtZShyZXNvbHZlZENvbGxlY3Rpb25QYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgaW5zdGFsbFBhY2thZ2UoXG4gICAgICAgIHBhY2thZ2VJZGVudGlmaWVyLnJhdyxcbiAgICAgICAgcGFja2FnZU1hbmFnZXIsXG4gICAgICAgIHNhdmVQYWNrYWdlLFxuICAgICAgICBvcHRpb25zLnJlZ2lzdHJ5ID8gW2AtLXJlZ2lzdHJ5PVwiJHtvcHRpb25zLnJlZ2lzdHJ5fVwiYF0gOiB1bmRlZmluZWQsXG4gICAgICApO1xuXG4gICAgICBpZiAoc3RhdHVzICE9PSAwKSB7XG4gICAgICAgIHJldHVybiBzdGF0dXM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyhjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucyk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGlzUHJvamVjdFZlcnNpb25WYWxpZChwYWNrYWdlSWRlbnRpZmllcjogbnBhLlJlc3VsdCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghcGFja2FnZUlkZW50aWZpZXIubmFtZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCB2YWxpZFZlcnNpb24gPSBmYWxzZTtcbiAgICBjb25zdCBpbnN0YWxsZWRWZXJzaW9uID0gYXdhaXQgdGhpcy5maW5kUHJvamVjdFZlcnNpb24ocGFja2FnZUlkZW50aWZpZXIubmFtZSk7XG4gICAgaWYgKGluc3RhbGxlZFZlcnNpb24pIHtcbiAgICAgIGlmIChwYWNrYWdlSWRlbnRpZmllci50eXBlID09PSAncmFuZ2UnICYmIHBhY2thZ2VJZGVudGlmaWVyLmZldGNoU3BlYykge1xuICAgICAgICB2YWxpZFZlcnNpb24gPSBzYXRpc2ZpZXMoaW5zdGFsbGVkVmVyc2lvbiwgcGFja2FnZUlkZW50aWZpZXIuZmV0Y2hTcGVjKTtcbiAgICAgIH0gZWxzZSBpZiAocGFja2FnZUlkZW50aWZpZXIudHlwZSA9PT0gJ3ZlcnNpb24nKSB7XG4gICAgICAgIGNvbnN0IHYxID0gdmFsaWQocGFja2FnZUlkZW50aWZpZXIuZmV0Y2hTcGVjKTtcbiAgICAgICAgY29uc3QgdjIgPSB2YWxpZChpbnN0YWxsZWRWZXJzaW9uKTtcbiAgICAgICAgdmFsaWRWZXJzaW9uID0gdjEgIT09IG51bGwgJiYgdjEgPT09IHYyO1xuICAgICAgfSBlbHNlIGlmICghcGFja2FnZUlkZW50aWZpZXIucmF3U3BlYykge1xuICAgICAgICB2YWxpZFZlcnNpb24gPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWxpZFZlcnNpb247XG4gIH1cblxuICBvdmVycmlkZSBhc3luYyByZXBvcnRBbmFseXRpY3MoXG4gICAgcGF0aHM6IHN0cmluZ1tdLFxuICAgIG9wdGlvbnM6IEFkZENvbW1hbmRPcHRpb25zLFxuICAgIGRpbWVuc2lvbnM6IChib29sZWFuIHwgbnVtYmVyIHwgc3RyaW5nKVtdID0gW10sXG4gICAgbWV0cmljczogKGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcpW10gPSBbXSxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IG9wdGlvbnMuY29sbGVjdGlvbjtcblxuICAgIC8vIEFkZCB0aGUgY29sbGVjdGlvbiBpZiBpdCdzIHNhZmUgbGlzdGVkLlxuICAgIGlmIChjb2xsZWN0aW9uICYmIGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzKGNvbGxlY3Rpb24pKSB7XG4gICAgICBkaW1lbnNpb25zW2FuYWx5dGljcy5OZ0NsaUFuYWx5dGljc0RpbWVuc2lvbnMuTmdBZGRDb2xsZWN0aW9uXSA9IGNvbGxlY3Rpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlbGV0ZSBkaW1lbnNpb25zW2FuYWx5dGljcy5OZ0NsaUFuYWx5dGljc0RpbWVuc2lvbnMuTmdBZGRDb2xsZWN0aW9uXTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXIucmVwb3J0QW5hbHl0aWNzKHBhdGhzLCBvcHRpb25zLCBkaW1lbnNpb25zLCBtZXRyaWNzKTtcbiAgfVxuXG4gIHByaXZhdGUgaXNQYWNrYWdlSW5zdGFsbGVkKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHRyeSB7XG4gICAgICByZXF1aXJlLnJlc29sdmUoam9pbihuYW1lLCAncGFja2FnZS5qc29uJyksIHsgcGF0aHM6IFt0aGlzLmNvbnRleHQucm9vdF0gfSk7XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlLmNvZGUgIT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IEFkZENvbW1hbmRPcHRpb25zICYgUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gICk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGNvbGxlY3Rpb24sXG4gICAgICAgIHZlcmJvc2UsXG4gICAgICAgIHJlZ2lzdHJ5LFxuICAgICAgICBza2lwQ29uZmlybWF0aW9uLFxuICAgICAgICBza2lwSW5zdGFsbCxcbiAgICAgICAgaW50ZXJhY3RpdmUsXG4gICAgICAgIGZvcmNlLFxuICAgICAgICBkcnlSdW4sXG4gICAgICAgIGRlZmF1bHRzOiBkZWZhdWx0VmFsLFxuICAgICAgICAuLi5zY2hlbWF0aWNPcHRpb25zXG4gICAgICB9ID0gb3B0aW9ucztcblxuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuU2NoZW1hdGljKHtcbiAgICAgICAgc2NoZW1hdGljT3B0aW9ucyxcbiAgICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIHNjaGVtYXRpY05hbWU6ICduZy1hZGQnLFxuICAgICAgICBkcnlSdW46IGZhbHNlLFxuICAgICAgICBmb3JjZTogZmFsc2UsXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE5vZGVQYWNrYWdlRG9lc05vdFN1cHBvcnRTY2hlbWF0aWNzKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICBUaGUgcGFja2FnZSB0aGF0IHlvdSBhcmUgdHJ5aW5nIHRvIGFkZCBkb2VzIG5vdCBzdXBwb3J0IHNjaGVtYXRpY3MuIFlvdSBjYW4gdHJ5IHVzaW5nXG4gICAgICAgICAgYSBkaWZmZXJlbnQgdmVyc2lvbiBvZiB0aGUgcGFja2FnZSBvciBjb250YWN0IHRoZSBwYWNrYWdlIGF1dGhvciB0byBhZGQgbmctYWRkIHN1cHBvcnQuXG4gICAgICAgIGApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZmluZFByb2plY3RWZXJzaW9uKG5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICAgIGxldCBpbnN0YWxsZWRQYWNrYWdlO1xuICAgIHRyeSB7XG4gICAgICBpbnN0YWxsZWRQYWNrYWdlID0gcmVxdWlyZS5yZXNvbHZlKGpvaW4obmFtZSwgJ3BhY2thZ2UuanNvbicpLCB7XG4gICAgICAgIHBhdGhzOiBbdGhpcy5jb250ZXh0LnJvb3RdLFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgaWYgKGluc3RhbGxlZFBhY2thZ2UpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGluc3RhbGxlZCA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KGRpcm5hbWUoaW5zdGFsbGVkUGFja2FnZSksIHRoaXMubG9nZ2VyKTtcblxuICAgICAgICByZXR1cm4gaW5zdGFsbGVkLnZlcnNpb247XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfVxuXG4gICAgbGV0IHByb2plY3RNYW5pZmVzdDtcbiAgICB0cnkge1xuICAgICAgcHJvamVjdE1hbmlmZXN0ID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWFuaWZlc3QodGhpcy5jb250ZXh0LnJvb3QsIHRoaXMubG9nZ2VyKTtcbiAgICB9IGNhdGNoIHt9XG5cbiAgICBpZiAocHJvamVjdE1hbmlmZXN0KSB7XG4gICAgICBjb25zdCB2ZXJzaW9uID0gcHJvamVjdE1hbmlmZXN0LmRlcGVuZGVuY2llc1tuYW1lXSB8fCBwcm9qZWN0TWFuaWZlc3QuZGV2RGVwZW5kZW5jaWVzW25hbWVdO1xuICAgICAgaWYgKHZlcnNpb24pIHtcbiAgICAgICAgcmV0dXJuIHZlcnNpb247XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGhhc01pc21hdGNoZWRQZWVyKG1hbmlmZXN0OiBQYWNrYWdlTWFuaWZlc3QpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBmb3IgKGNvbnN0IHBlZXIgaW4gbWFuaWZlc3QucGVlckRlcGVuZGVuY2llcykge1xuICAgICAgbGV0IHBlZXJJZGVudGlmaWVyO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGVlcklkZW50aWZpZXIgPSBucGEucmVzb2x2ZShwZWVyLCBtYW5pZmVzdC5wZWVyRGVwZW5kZW5jaWVzW3BlZXJdKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBJbnZhbGlkIHBlZXIgZGVwZW5kZW5jeSAke3BlZXJ9IGZvdW5kIGluIHBhY2thZ2UuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGVlcklkZW50aWZpZXIudHlwZSA9PT0gJ3ZlcnNpb24nIHx8IHBlZXJJZGVudGlmaWVyLnR5cGUgPT09ICdyYW5nZScpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gYXdhaXQgdGhpcy5maW5kUHJvamVjdFZlcnNpb24ocGVlcik7XG4gICAgICAgICAgaWYgKCF2ZXJzaW9uKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBvcHRpb25zID0geyBpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZSB9O1xuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgIWludGVyc2VjdHModmVyc2lvbiwgcGVlcklkZW50aWZpZXIucmF3U3BlYywgb3B0aW9ucykgJiZcbiAgICAgICAgICAgICFzYXRpc2ZpZXModmVyc2lvbiwgcGVlcklkZW50aWZpZXIucmF3U3BlYywgb3B0aW9ucylcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gTm90IGZvdW5kIG9yIGludmFsaWQgc28gaWdub3JlXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHR5cGUgPT09ICd0YWcnIHwgJ2ZpbGUnIHwgJ2RpcmVjdG9yeScgfCAncmVtb3RlJyB8ICdnaXQnXG4gICAgICAgIC8vIENhbm5vdCBhY2N1cmF0ZWx5IGNvbXBhcmUgdGhlc2UgYXMgdGhlIHRhZy9sb2NhdGlvbiBtYXkgaGF2ZSBjaGFuZ2VkIHNpbmNlIGluc3RhbGxcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiJdfQ==