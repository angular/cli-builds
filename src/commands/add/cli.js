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
const analytics_1 = require("../../analytics/analytics");
const schematics_command_module_1 = require("../../command-builder/schematics-command-module");
const color_1 = require("../../utilities/color");
const error_1 = require("../../utilities/error");
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
    // @angular/localize@9.x and earlier versions as well as @angular/localize@10.0 prereleases do not have peer dependencies setup.
    '@angular/localize': '<10.0.0',
    // @angular/material@7.x versions have unbounded peer dependency ranges (>=7.0.0).
    '@angular/material': '7.x',
};
class AddCommandModule extends schematics_command_module_1.SchematicsCommandModule {
    constructor() {
        super(...arguments);
        this.command = 'add <collection>';
        this.describe = 'Adds support for an external library to your project.';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
        this.allowPrivateSchematics = true;
        this.schematicName = 'ng-add';
    }
    async builder(argv) {
        const localYargs = (await super.builder(argv))
            .positional('collection', {
            description: 'The package to be added.',
            type: 'string',
            demandOption: true,
        })
            .option('registry', { description: 'The NPM registry to use.', type: 'string' })
            .option('verbose', {
            description: 'Display additional details about internal operations during execution.',
            type: 'boolean',
            default: false,
        })
            .option('skip-confirmation', {
            description: 'Skip asking a confirmation prompt before installing and executing the package. ' +
                'Ensure package name is correct prior to using this option.',
            type: 'boolean',
            default: false,
        })
            // Prior to downloading we don't know the full schema and therefore we cannot be strict on the options.
            // Possibly in the future update the logic to use the following syntax:
            // `ng add @angular/localize -- --package-options`.
            .strict(false);
        const collectionName = await this.getCollectionName();
        const workflow = await this.getOrCreateWorkflowForBuilder(collectionName);
        try {
            const collection = workflow.engine.createCollection(collectionName);
            const options = await this.getSchematicOptions(collection, this.schematicName, workflow);
            return this.addSchemaOptionsToCommand(localYargs, options);
        }
        catch (error) {
            // During `ng add` prior to the downloading of the package
            // we are not able to resolve and create a collection.
            // Or when the the collection value is a path to a tarball.
        }
        return localYargs;
    }
    // eslint-disable-next-line max-lines-per-function
    async run(options) {
        var _a;
        const { logger, packageManager } = this.context;
        const { verbose, registry, collection, skipConfirmation } = options;
        packageManager.ensureCompatibility();
        let packageIdentifier;
        try {
            packageIdentifier = (0, npm_package_arg_1.default)(collection);
        }
        catch (e) {
            (0, error_1.assertIsError)(e);
            logger.error(e.message);
            return 1;
        }
        if (packageIdentifier.name &&
            packageIdentifier.registry &&
            this.isPackageInstalled(packageIdentifier.name)) {
            const validVersion = await this.isProjectVersionValid(packageIdentifier);
            if (validVersion) {
                // Already installed so just run schematic
                logger.info('Skipping installation: Package already installed');
                return this.executeSchematic({ ...options, collection: packageIdentifier.name });
            }
        }
        const spinner = new spinner_1.Spinner();
        spinner.start('Determining package manager...');
        const usingYarn = packageManager.name === workspace_schema_1.PackageManager.Yarn;
        spinner.info(`Using package manager: ${color_1.colors.grey(packageManager.name)}`);
        if (packageIdentifier.name && packageIdentifier.type === 'tag' && !packageIdentifier.rawSpec) {
            // only package name provided; search for viable version
            // plus special cases for packages that did not have peer deps setup
            spinner.start('Searching for compatible package version...');
            let packageMetadata;
            try {
                packageMetadata = await (0, package_metadata_1.fetchPackageMetadata)(packageIdentifier.name, logger, {
                    registry,
                    usingYarn,
                    verbose,
                });
            }
            catch (e) {
                (0, error_1.assertIsError)(e);
                spinner.fail(`Unable to load package information from registry: ${e.message}`);
                return 1;
            }
            // Start with the version tagged as `latest` if it exists
            const latestManifest = packageMetadata.tags['latest'];
            if (latestManifest) {
                packageIdentifier = npm_package_arg_1.default.resolve(latestManifest.name, latestManifest.version);
            }
            // Adjust the version based on name and peer dependencies
            if ((latestManifest === null || latestManifest === void 0 ? void 0 : latestManifest.peerDependencies) &&
                Object.keys(latestManifest.peerDependencies).length === 0) {
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
                    if (versionExclusions &&
                        (0, semver_1.satisfies)(value.version, versionExclusions, { includePrerelease: true })) {
                        return false;
                    }
                    return true;
                });
                versionManifests.sort((a, b) => (0, semver_1.compare)(a.version, b.version, true));
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
            const manifest = await (0, package_metadata_1.fetchPackageManifest)(packageIdentifier.toString(), logger, {
                registry,
                verbose,
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
            (0, error_1.assertIsError)(e);
            spinner.fail(`Unable to fetch package information for '${packageIdentifier}': ${e.message}`);
            return 1;
        }
        if (!skipConfirmation) {
            const confirmationResponse = await (0, prompt_1.askConfirmation)(`\nThe package ${color_1.colors.blue(packageIdentifier.raw)} will be installed and executed.\n` +
                'Would you like to proceed?', true, false);
            if (!confirmationResponse) {
                if (!(0, tty_1.isTTY)()) {
                    logger.error('No terminal detected. ' +
                        `'--skip-confirmation' can be used to bypass installation confirmation. ` +
                        `Ensure package name is correct prior to '--skip-confirmation' option usage.`);
                }
                logger.error('Command aborted.');
                return 1;
            }
        }
        if (savePackage === false) {
            // Temporary packages are located in a different directory
            // Hence we need to resolve them using the temp path
            const { success, tempNodeModules } = await packageManager.installTemp(packageIdentifier.raw, registry ? [`--registry="${registry}"`] : undefined);
            const resolvedCollectionPath = require.resolve((0, path_1.join)(collectionName, 'package.json'), {
                paths: [tempNodeModules],
            });
            if (!success) {
                return 1;
            }
            collectionName = (0, path_1.dirname)(resolvedCollectionPath);
        }
        else {
            const success = await packageManager.install(packageIdentifier.raw, savePackage, registry ? [`--registry="${registry}"`] : undefined);
            if (!success) {
                return 1;
            }
        }
        return this.executeSchematic({ ...options, collection: collectionName });
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
    async reportAnalytics(options, paths) {
        const collection = await this.getCollectionName();
        const dimensions = [];
        // Add the collection if it's safe listed.
        if (collection && (0, analytics_1.isPackageNameSafeForAnalytics)(collection)) {
            dimensions[core_1.analytics.NgCliAnalyticsDimensions.NgAddCollection] = collection;
        }
        return super.reportAnalytics(options, paths, dimensions);
    }
    async getCollectionName() {
        const [, collectionName] = this.context.args.positional;
        return collectionName;
    }
    isPackageInstalled(name) {
        try {
            require.resolve((0, path_1.join)(name, 'package.json'), { paths: [this.context.root] });
            return true;
        }
        catch (e) {
            (0, error_1.assertIsError)(e);
            if (e.code !== 'MODULE_NOT_FOUND') {
                throw e;
            }
        }
        return false;
    }
    async executeSchematic(options) {
        try {
            const { verbose, skipConfirmation, interactive, force, dryRun, registry, defaults, collection: collectionName, ...schematicOptions } = options;
            return await this.runSchematic({
                schematicOptions,
                schematicName: this.schematicName,
                collectionName,
                executionOptions: {
                    interactive,
                    force,
                    dryRun,
                    defaults,
                    packageRegistry: registry,
                },
            });
        }
        catch (e) {
            if (e instanceof tools_1.NodePackageDoesNotSupportSchematics) {
                this.context.logger.error(core_1.tags.oneLine `
          The package that you are trying to add does not support schematics. You can try using
          a different version of the package or contact the package author to add ng-add support.
        `);
                return 1;
            }
            throw e;
        }
    }
    async findProjectVersion(name) {
        var _a, _b;
        const { logger, root } = this.context;
        let installedPackage;
        try {
            installedPackage = require.resolve((0, path_1.join)(name, 'package.json'), {
                paths: [root],
            });
        }
        catch (_c) { }
        if (installedPackage) {
            try {
                const installed = await (0, package_metadata_1.fetchPackageManifest)((0, path_1.dirname)(installedPackage), logger);
                return installed.version;
            }
            catch (_d) { }
        }
        let projectManifest;
        try {
            projectManifest = await (0, package_metadata_1.fetchPackageManifest)(root, logger);
        }
        catch (_e) { }
        if (projectManifest) {
            const version = ((_a = projectManifest.dependencies) === null || _a === void 0 ? void 0 : _a[name]) || ((_b = projectManifest.devDependencies) === null || _b === void 0 ? void 0 : _b[name]);
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
                this.context.logger.warn(`Invalid peer dependency ${peer} found in package.`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2FkZC9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7O0FBRUgsK0NBQXVEO0FBQ3ZELDREQUF1RjtBQUN2RixzRUFBa0M7QUFDbEMsK0JBQXFDO0FBQ3JDLG1DQUFrRjtBQUVsRiwyRUFBc0U7QUFDdEUseURBQTBFO0FBTTFFLCtGQUd5RDtBQUN6RCxpREFBK0M7QUFDL0MsaURBQXNEO0FBQ3RELHVFQUswQztBQUMxQyxtREFBeUQ7QUFDekQscURBQWtEO0FBQ2xELDZDQUE0QztBQVM1Qzs7OztHQUlHO0FBQ0gsTUFBTSx3QkFBd0IsR0FBbUM7SUFDL0QsZ0lBQWdJO0lBQ2hJLG1CQUFtQixFQUFFLFNBQVM7SUFDOUIsa0ZBQWtGO0lBQ2xGLG1CQUFtQixFQUFFLEtBQUs7Q0FDM0IsQ0FBQztBQUVGLE1BQWEsZ0JBQ1gsU0FBUSxtREFBdUI7SUFEakM7O1FBSUUsWUFBTyxHQUFHLGtCQUFrQixDQUFDO1FBQzdCLGFBQVEsR0FBRyx1REFBdUQsQ0FBQztRQUNuRSx3QkFBbUIsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUMxQywyQkFBc0IsR0FBRyxJQUFJLENBQUM7UUFDaEMsa0JBQWEsR0FBRyxRQUFRLENBQUM7SUF5WjVDLENBQUM7SUF2WlUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFVO1FBQy9CLE1BQU0sVUFBVSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzNDLFVBQVUsQ0FBQyxZQUFZLEVBQUU7WUFDeEIsV0FBVyxFQUFFLDBCQUEwQjtZQUN2QyxJQUFJLEVBQUUsUUFBUTtZQUNkLFlBQVksRUFBRSxJQUFJO1NBQ25CLENBQUM7YUFDRCxNQUFN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MkJBQTJCLElBQUksb0JBQW9CLENBQUMsQ0FBQztnQkFDOUUsU0FBUzthQUNWO1lBRUQsSUFBSSxjQUFjLENBQUMsSUFBSSxLQUFLLFNBQVMsSUFBSSxjQUFjLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtnQkFDeEUsSUFBSTtvQkFDRixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDcEQsSUFBSSxDQUFDLE9BQU8sRUFBRTt3QkFDWixTQUFTO3FCQUNWO29CQUVELE1BQU0sT0FBTyxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUM7b0JBRTVDLElBQ0UsQ0FBQyxJQUFBLG1CQUFVLEVBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO3dCQUNyRCxDQUFDLElBQUEsa0JBQVMsRUFBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFDcEQ7d0JBQ0EsT0FBTyxJQUFJLENBQUM7cUJBQ2I7aUJBQ0Y7Z0JBQUMsV0FBTTtvQkFDTixpQ0FBaUM7b0JBQ2pDLFNBQVM7aUJBQ1Y7YUFDRjtpQkFBTTtnQkFDTCwyREFBMkQ7Z0JBQzNELHFGQUFxRjthQUN0RjtTQUNGO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0NBQ0Y7QUFqYUQsNENBaWFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGFuYWx5dGljcywgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlRG9lc05vdFN1cHBvcnRTY2hlbWF0aWNzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IG5wYSBmcm9tICducG0tcGFja2FnZS1hcmcnO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgUmFuZ2UsIGNvbXBhcmUsIGludGVyc2VjdHMsIHByZXJlbGVhc2UsIHNhdGlzZmllcywgdmFsaWQgfSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vLi4vLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7IGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzIH0gZnJvbSAnLi4vLi4vYW5hbHl0aWNzL2FuYWx5dGljcyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7XG4gIFNjaGVtYXRpY3NDb21tYW5kQXJncyxcbiAgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGUsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9zY2hlbWF0aWNzLWNvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBhc3NlcnRJc0Vycm9yIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2Vycm9yJztcbmltcG9ydCB7XG4gIE5nQWRkU2F2ZURlcGVuZGVuY3ksXG4gIFBhY2thZ2VNYW5pZmVzdCxcbiAgZmV0Y2hQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1ldGFkYXRhLFxufSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcGFja2FnZS1tZXRhZGF0YSc7XG5pbXBvcnQgeyBhc2tDb25maXJtYXRpb24gfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcHJvbXB0JztcbmltcG9ydCB7IFNwaW5uZXIgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvc3Bpbm5lcic7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy90dHknO1xuXG5pbnRlcmZhY2UgQWRkQ29tbWFuZEFyZ3MgZXh0ZW5kcyBTY2hlbWF0aWNzQ29tbWFuZEFyZ3Mge1xuICBjb2xsZWN0aW9uOiBzdHJpbmc7XG4gIHZlcmJvc2U/OiBib29sZWFuO1xuICByZWdpc3RyeT86IHN0cmluZztcbiAgJ3NraXAtY29uZmlybWF0aW9uJz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogVGhlIHNldCBvZiBwYWNrYWdlcyB0aGF0IHNob3VsZCBoYXZlIGNlcnRhaW4gdmVyc2lvbnMgZXhjbHVkZWQgZnJvbSBjb25zaWRlcmF0aW9uXG4gKiB3aGVuIGF0dGVtcHRpbmcgdG8gZmluZCBhIGNvbXBhdGlibGUgdmVyc2lvbiBmb3IgYSBwYWNrYWdlLlxuICogVGhlIGtleSBpcyBhIHBhY2thZ2UgbmFtZSBhbmQgdGhlIHZhbHVlIGlzIGEgU2VtVmVyIHJhbmdlIG9mIHZlcnNpb25zIHRvIGV4Y2x1ZGUuXG4gKi9cbmNvbnN0IHBhY2thZ2VWZXJzaW9uRXhjbHVzaW9uczogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgUmFuZ2U+ID0ge1xuICAvLyBAYW5ndWxhci9sb2NhbGl6ZUA5LnggYW5kIGVhcmxpZXIgdmVyc2lvbnMgYXMgd2VsbCBhcyBAYW5ndWxhci9sb2NhbGl6ZUAxMC4wIHByZXJlbGVhc2VzIGRvIG5vdCBoYXZlIHBlZXIgZGVwZW5kZW5jaWVzIHNldHVwLlxuICAnQGFuZ3VsYXIvbG9jYWxpemUnOiAnPDEwLjAuMCcsXG4gIC8vIEBhbmd1bGFyL21hdGVyaWFsQDcueCB2ZXJzaW9ucyBoYXZlIHVuYm91bmRlZCBwZWVyIGRlcGVuZGVuY3kgcmFuZ2VzICg+PTcuMC4wKS5cbiAgJ0Bhbmd1bGFyL21hdGVyaWFsJzogJzcueCcsXG59O1xuXG5leHBvcnQgY2xhc3MgQWRkQ29tbWFuZE1vZHVsZVxuICBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlXG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPEFkZENvbW1hbmRBcmdzPlxue1xuICBjb21tYW5kID0gJ2FkZCA8Y29sbGVjdGlvbj4nO1xuICBkZXNjcmliZSA9ICdBZGRzIHN1cHBvcnQgZm9yIGFuIGV4dGVybmFsIGxpYnJhcnkgdG8geW91ciBwcm9qZWN0Lic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSBqb2luKF9fZGlybmFtZSwgJ2xvbmctZGVzY3JpcHRpb24ubWQnKTtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIGFsbG93UHJpdmF0ZVNjaGVtYXRpY3MgPSB0cnVlO1xuICBwcml2YXRlIHJlYWRvbmx5IHNjaGVtYXRpY05hbWUgPSAnbmctYWRkJztcblxuICBvdmVycmlkZSBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8QWRkQ29tbWFuZEFyZ3M+PiB7XG4gICAgY29uc3QgbG9jYWxZYXJncyA9IChhd2FpdCBzdXBlci5idWlsZGVyKGFyZ3YpKVxuICAgICAgLnBvc2l0aW9uYWwoJ2NvbGxlY3Rpb24nLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIHBhY2thZ2UgdG8gYmUgYWRkZWQuJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGRlbWFuZE9wdGlvbjogdHJ1ZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdyZWdpc3RyeScsIHsgZGVzY3JpcHRpb246ICdUaGUgTlBNIHJlZ2lzdHJ5IHRvIHVzZS4nLCB0eXBlOiAnc3RyaW5nJyB9KVxuICAgICAgLm9wdGlvbigndmVyYm9zZScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdEaXNwbGF5IGFkZGl0aW9uYWwgZGV0YWlscyBhYm91dCBpbnRlcm5hbCBvcGVyYXRpb25zIGR1cmluZyBleGVjdXRpb24uJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdza2lwLWNvbmZpcm1hdGlvbicsIHtcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgJ1NraXAgYXNraW5nIGEgY29uZmlybWF0aW9uIHByb21wdCBiZWZvcmUgaW5zdGFsbGluZyBhbmQgZXhlY3V0aW5nIHRoZSBwYWNrYWdlLiAnICtcbiAgICAgICAgICAnRW5zdXJlIHBhY2thZ2UgbmFtZSBpcyBjb3JyZWN0IHByaW9yIHRvIHVzaW5nIHRoaXMgb3B0aW9uLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLy8gUHJpb3IgdG8gZG93bmxvYWRpbmcgd2UgZG9uJ3Qga25vdyB0aGUgZnVsbCBzY2hlbWEgYW5kIHRoZXJlZm9yZSB3ZSBjYW5ub3QgYmUgc3RyaWN0IG9uIHRoZSBvcHRpb25zLlxuICAgICAgLy8gUG9zc2libHkgaW4gdGhlIGZ1dHVyZSB1cGRhdGUgdGhlIGxvZ2ljIHRvIHVzZSB0aGUgZm9sbG93aW5nIHN5bnRheDpcbiAgICAgIC8vIGBuZyBhZGQgQGFuZ3VsYXIvbG9jYWxpemUgLS0gLS1wYWNrYWdlLW9wdGlvbnNgLlxuICAgICAgLnN0cmljdChmYWxzZSk7XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IGF3YWl0IHRoaXMuZ2V0Q29sbGVjdGlvbk5hbWUoKTtcbiAgICBjb25zdCB3b3JrZmxvdyA9IGF3YWl0IHRoaXMuZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckJ1aWxkZXIoY29sbGVjdGlvbk5hbWUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gICAgICBjb25zdCBvcHRpb25zID0gYXdhaXQgdGhpcy5nZXRTY2hlbWF0aWNPcHRpb25zKGNvbGxlY3Rpb24sIHRoaXMuc2NoZW1hdGljTmFtZSwgd29ya2Zsb3cpO1xuXG4gICAgICByZXR1cm4gdGhpcy5hZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kKGxvY2FsWWFyZ3MsIG9wdGlvbnMpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBEdXJpbmcgYG5nIGFkZGAgcHJpb3IgdG8gdGhlIGRvd25sb2FkaW5nIG9mIHRoZSBwYWNrYWdlXG4gICAgICAvLyB3ZSBhcmUgbm90IGFibGUgdG8gcmVzb2x2ZSBhbmQgY3JlYXRlIGEgY29sbGVjdGlvbi5cbiAgICAgIC8vIE9yIHdoZW4gdGhlIHRoZSBjb2xsZWN0aW9uIHZhbHVlIGlzIGEgcGF0aCB0byBhIHRhcmJhbGwuXG4gICAgfVxuXG4gICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxpbmVzLXBlci1mdW5jdGlvblxuICBhc3luYyBydW4ob3B0aW9uczogT3B0aW9uczxBZGRDb21tYW5kQXJncz4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBjb25zdCB7IGxvZ2dlciwgcGFja2FnZU1hbmFnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCB7IHZlcmJvc2UsIHJlZ2lzdHJ5LCBjb2xsZWN0aW9uLCBza2lwQ29uZmlybWF0aW9uIH0gPSBvcHRpb25zO1xuICAgIHBhY2thZ2VNYW5hZ2VyLmVuc3VyZUNvbXBhdGliaWxpdHkoKTtcblxuICAgIGxldCBwYWNrYWdlSWRlbnRpZmllcjtcbiAgICB0cnkge1xuICAgICAgcGFja2FnZUlkZW50aWZpZXIgPSBucGEoY29sbGVjdGlvbik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgIGxvZ2dlci5lcnJvcihlLm1lc3NhZ2UpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgICBwYWNrYWdlSWRlbnRpZmllci5uYW1lICYmXG4gICAgICBwYWNrYWdlSWRlbnRpZmllci5yZWdpc3RyeSAmJlxuICAgICAgdGhpcy5pc1BhY2thZ2VJbnN0YWxsZWQocGFja2FnZUlkZW50aWZpZXIubmFtZSlcbiAgICApIHtcbiAgICAgIGNvbnN0IHZhbGlkVmVyc2lvbiA9IGF3YWl0IHRoaXMuaXNQcm9qZWN0VmVyc2lvblZhbGlkKHBhY2thZ2VJZGVudGlmaWVyKTtcbiAgICAgIGlmICh2YWxpZFZlcnNpb24pIHtcbiAgICAgICAgLy8gQWxyZWFkeSBpbnN0YWxsZWQgc28ganVzdCBydW4gc2NoZW1hdGljXG4gICAgICAgIGxvZ2dlci5pbmZvKCdTa2lwcGluZyBpbnN0YWxsYXRpb246IFBhY2thZ2UgYWxyZWFkeSBpbnN0YWxsZWQnKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5leGVjdXRlU2NoZW1hdGljKHsgLi4ub3B0aW9ucywgY29sbGVjdGlvbjogcGFja2FnZUlkZW50aWZpZXIubmFtZSB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzcGlubmVyID0gbmV3IFNwaW5uZXIoKTtcblxuICAgIHNwaW5uZXIuc3RhcnQoJ0RldGVybWluaW5nIHBhY2thZ2UgbWFuYWdlci4uLicpO1xuICAgIGNvbnN0IHVzaW5nWWFybiA9IHBhY2thZ2VNYW5hZ2VyLm5hbWUgPT09IFBhY2thZ2VNYW5hZ2VyLllhcm47XG4gICAgc3Bpbm5lci5pbmZvKGBVc2luZyBwYWNrYWdlIG1hbmFnZXI6ICR7Y29sb3JzLmdyZXkocGFja2FnZU1hbmFnZXIubmFtZSl9YCk7XG5cbiAgICBpZiAocGFja2FnZUlkZW50aWZpZXIubmFtZSAmJiBwYWNrYWdlSWRlbnRpZmllci50eXBlID09PSAndGFnJyAmJiAhcGFja2FnZUlkZW50aWZpZXIucmF3U3BlYykge1xuICAgICAgLy8gb25seSBwYWNrYWdlIG5hbWUgcHJvdmlkZWQ7IHNlYXJjaCBmb3IgdmlhYmxlIHZlcnNpb25cbiAgICAgIC8vIHBsdXMgc3BlY2lhbCBjYXNlcyBmb3IgcGFja2FnZXMgdGhhdCBkaWQgbm90IGhhdmUgcGVlciBkZXBzIHNldHVwXG4gICAgICBzcGlubmVyLnN0YXJ0KCdTZWFyY2hpbmcgZm9yIGNvbXBhdGlibGUgcGFja2FnZSB2ZXJzaW9uLi4uJyk7XG5cbiAgICAgIGxldCBwYWNrYWdlTWV0YWRhdGE7XG4gICAgICB0cnkge1xuICAgICAgICBwYWNrYWdlTWV0YWRhdGEgPSBhd2FpdCBmZXRjaFBhY2thZ2VNZXRhZGF0YShwYWNrYWdlSWRlbnRpZmllci5uYW1lLCBsb2dnZXIsIHtcbiAgICAgICAgICByZWdpc3RyeSxcbiAgICAgICAgICB1c2luZ1lhcm4sXG4gICAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgIHNwaW5uZXIuZmFpbChgVW5hYmxlIHRvIGxvYWQgcGFja2FnZSBpbmZvcm1hdGlvbiBmcm9tIHJlZ2lzdHJ5OiAke2UubWVzc2FnZX1gKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgLy8gU3RhcnQgd2l0aCB0aGUgdmVyc2lvbiB0YWdnZWQgYXMgYGxhdGVzdGAgaWYgaXQgZXhpc3RzXG4gICAgICBjb25zdCBsYXRlc3RNYW5pZmVzdCA9IHBhY2thZ2VNZXRhZGF0YS50YWdzWydsYXRlc3QnXTtcbiAgICAgIGlmIChsYXRlc3RNYW5pZmVzdCkge1xuICAgICAgICBwYWNrYWdlSWRlbnRpZmllciA9IG5wYS5yZXNvbHZlKGxhdGVzdE1hbmlmZXN0Lm5hbWUsIGxhdGVzdE1hbmlmZXN0LnZlcnNpb24pO1xuICAgICAgfVxuXG4gICAgICAvLyBBZGp1c3QgdGhlIHZlcnNpb24gYmFzZWQgb24gbmFtZSBhbmQgcGVlciBkZXBlbmRlbmNpZXNcbiAgICAgIGlmIChcbiAgICAgICAgbGF0ZXN0TWFuaWZlc3Q/LnBlZXJEZXBlbmRlbmNpZXMgJiZcbiAgICAgICAgT2JqZWN0LmtleXMobGF0ZXN0TWFuaWZlc3QucGVlckRlcGVuZGVuY2llcykubGVuZ3RoID09PSAwXG4gICAgICApIHtcbiAgICAgICAgc3Bpbm5lci5zdWNjZWVkKFxuICAgICAgICAgIGBGb3VuZCBjb21wYXRpYmxlIHBhY2thZ2UgdmVyc2lvbjogJHtjb2xvcnMuZ3JleShwYWNrYWdlSWRlbnRpZmllci50b1N0cmluZygpKX0uYCxcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSBpZiAoIWxhdGVzdE1hbmlmZXN0IHx8IChhd2FpdCB0aGlzLmhhc01pc21hdGNoZWRQZWVyKGxhdGVzdE1hbmlmZXN0KSkpIHtcbiAgICAgICAgLy8gJ2xhdGVzdCcgaXMgaW52YWxpZCBzbyBzZWFyY2ggZm9yIG1vc3QgcmVjZW50IG1hdGNoaW5nIHBhY2thZ2VcbiAgICAgICAgY29uc3QgdmVyc2lvbkV4Y2x1c2lvbnMgPSBwYWNrYWdlVmVyc2lvbkV4Y2x1c2lvbnNbcGFja2FnZU1ldGFkYXRhLm5hbWVdO1xuICAgICAgICBjb25zdCB2ZXJzaW9uTWFuaWZlc3RzID0gT2JqZWN0LnZhbHVlcyhwYWNrYWdlTWV0YWRhdGEudmVyc2lvbnMpLmZpbHRlcihcbiAgICAgICAgICAodmFsdWU6IFBhY2thZ2VNYW5pZmVzdCkgPT4ge1xuICAgICAgICAgICAgLy8gUHJlcmVsZWFzZSB2ZXJzaW9ucyBhcmUgbm90IHN0YWJsZSBhbmQgc2hvdWxkIG5vdCBiZSBjb25zaWRlcmVkIGJ5IGRlZmF1bHRcbiAgICAgICAgICAgIGlmIChwcmVyZWxlYXNlKHZhbHVlLnZlcnNpb24pKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIERlcHJlY2F0ZWQgdmVyc2lvbnMgc2hvdWxkIG5vdCBiZSB1c2VkIG9yIGNvbnNpZGVyZWRcbiAgICAgICAgICAgIGlmICh2YWx1ZS5kZXByZWNhdGVkKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEV4Y2x1ZGVkIHBhY2thZ2UgdmVyc2lvbnMgc2hvdWxkIG5vdCBiZSBjb25zaWRlcmVkXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIHZlcnNpb25FeGNsdXNpb25zICYmXG4gICAgICAgICAgICAgIHNhdGlzZmllcyh2YWx1ZS52ZXJzaW9uLCB2ZXJzaW9uRXhjbHVzaW9ucywgeyBpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZSB9KVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfSxcbiAgICAgICAgKTtcblxuICAgICAgICB2ZXJzaW9uTWFuaWZlc3RzLnNvcnQoKGEsIGIpID0+IGNvbXBhcmUoYS52ZXJzaW9uLCBiLnZlcnNpb24sIHRydWUpKTtcblxuICAgICAgICBsZXQgbmV3SWRlbnRpZmllcjtcbiAgICAgICAgZm9yIChjb25zdCB2ZXJzaW9uTWFuaWZlc3Qgb2YgdmVyc2lvbk1hbmlmZXN0cykge1xuICAgICAgICAgIGlmICghKGF3YWl0IHRoaXMuaGFzTWlzbWF0Y2hlZFBlZXIodmVyc2lvbk1hbmlmZXN0KSkpIHtcbiAgICAgICAgICAgIG5ld0lkZW50aWZpZXIgPSBucGEucmVzb2x2ZSh2ZXJzaW9uTWFuaWZlc3QubmFtZSwgdmVyc2lvbk1hbmlmZXN0LnZlcnNpb24pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFuZXdJZGVudGlmaWVyKSB7XG4gICAgICAgICAgc3Bpbm5lci53YXJuKFwiVW5hYmxlIHRvIGZpbmQgY29tcGF0aWJsZSBwYWNrYWdlLiBVc2luZyAnbGF0ZXN0JyB0YWcuXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhY2thZ2VJZGVudGlmaWVyID0gbmV3SWRlbnRpZmllcjtcbiAgICAgICAgICBzcGlubmVyLnN1Y2NlZWQoXG4gICAgICAgICAgICBgRm91bmQgY29tcGF0aWJsZSBwYWNrYWdlIHZlcnNpb246ICR7Y29sb3JzLmdyZXkocGFja2FnZUlkZW50aWZpZXIudG9TdHJpbmcoKSl9LmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3Bpbm5lci5zdWNjZWVkKFxuICAgICAgICAgIGBGb3VuZCBjb21wYXRpYmxlIHBhY2thZ2UgdmVyc2lvbjogJHtjb2xvcnMuZ3JleShwYWNrYWdlSWRlbnRpZmllci50b1N0cmluZygpKX0uYCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgY29sbGVjdGlvbk5hbWUgPSBwYWNrYWdlSWRlbnRpZmllci5uYW1lO1xuICAgIGxldCBzYXZlUGFja2FnZTogTmdBZGRTYXZlRGVwZW5kZW5jeSB8IHVuZGVmaW5lZDtcblxuICAgIHRyeSB7XG4gICAgICBzcGlubmVyLnN0YXJ0KCdMb2FkaW5nIHBhY2thZ2UgaW5mb3JtYXRpb24gZnJvbSByZWdpc3RyeS4uLicpO1xuICAgICAgY29uc3QgbWFuaWZlc3QgPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChwYWNrYWdlSWRlbnRpZmllci50b1N0cmluZygpLCBsb2dnZXIsIHtcbiAgICAgICAgcmVnaXN0cnksXG4gICAgICAgIHZlcmJvc2UsXG4gICAgICAgIHVzaW5nWWFybixcbiAgICAgIH0pO1xuXG4gICAgICBzYXZlUGFja2FnZSA9IG1hbmlmZXN0WyduZy1hZGQnXT8uc2F2ZTtcbiAgICAgIGNvbGxlY3Rpb25OYW1lID0gbWFuaWZlc3QubmFtZTtcblxuICAgICAgaWYgKGF3YWl0IHRoaXMuaGFzTWlzbWF0Y2hlZFBlZXIobWFuaWZlc3QpKSB7XG4gICAgICAgIHNwaW5uZXIud2FybignUGFja2FnZSBoYXMgdW5tZXQgcGVlciBkZXBlbmRlbmNpZXMuIEFkZGluZyB0aGUgcGFja2FnZSBtYXkgbm90IHN1Y2NlZWQuJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzcGlubmVyLnN1Y2NlZWQoYFBhY2thZ2UgaW5mb3JtYXRpb24gbG9hZGVkLmApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICBzcGlubmVyLmZhaWwoYFVuYWJsZSB0byBmZXRjaCBwYWNrYWdlIGluZm9ybWF0aW9uIGZvciAnJHtwYWNrYWdlSWRlbnRpZmllcn0nOiAke2UubWVzc2FnZX1gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgaWYgKCFza2lwQ29uZmlybWF0aW9uKSB7XG4gICAgICBjb25zdCBjb25maXJtYXRpb25SZXNwb25zZSA9IGF3YWl0IGFza0NvbmZpcm1hdGlvbihcbiAgICAgICAgYFxcblRoZSBwYWNrYWdlICR7Y29sb3JzLmJsdWUocGFja2FnZUlkZW50aWZpZXIucmF3KX0gd2lsbCBiZSBpbnN0YWxsZWQgYW5kIGV4ZWN1dGVkLlxcbmAgK1xuICAgICAgICAgICdXb3VsZCB5b3UgbGlrZSB0byBwcm9jZWVkPycsXG4gICAgICAgIHRydWUsXG4gICAgICAgIGZhbHNlLFxuICAgICAgKTtcblxuICAgICAgaWYgKCFjb25maXJtYXRpb25SZXNwb25zZSkge1xuICAgICAgICBpZiAoIWlzVFRZKCkpIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAnTm8gdGVybWluYWwgZGV0ZWN0ZWQuICcgK1xuICAgICAgICAgICAgICBgJy0tc2tpcC1jb25maXJtYXRpb24nIGNhbiBiZSB1c2VkIHRvIGJ5cGFzcyBpbnN0YWxsYXRpb24gY29uZmlybWF0aW9uLiBgICtcbiAgICAgICAgICAgICAgYEVuc3VyZSBwYWNrYWdlIG5hbWUgaXMgY29ycmVjdCBwcmlvciB0byAnLS1za2lwLWNvbmZpcm1hdGlvbicgb3B0aW9uIHVzYWdlLmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvZ2dlci5lcnJvcignQ29tbWFuZCBhYm9ydGVkLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzYXZlUGFja2FnZSA9PT0gZmFsc2UpIHtcbiAgICAgIC8vIFRlbXBvcmFyeSBwYWNrYWdlcyBhcmUgbG9jYXRlZCBpbiBhIGRpZmZlcmVudCBkaXJlY3RvcnlcbiAgICAgIC8vIEhlbmNlIHdlIG5lZWQgdG8gcmVzb2x2ZSB0aGVtIHVzaW5nIHRoZSB0ZW1wIHBhdGhcbiAgICAgIGNvbnN0IHsgc3VjY2VzcywgdGVtcE5vZGVNb2R1bGVzIH0gPSBhd2FpdCBwYWNrYWdlTWFuYWdlci5pbnN0YWxsVGVtcChcbiAgICAgICAgcGFja2FnZUlkZW50aWZpZXIucmF3LFxuICAgICAgICByZWdpc3RyeSA/IFtgLS1yZWdpc3RyeT1cIiR7cmVnaXN0cnl9XCJgXSA6IHVuZGVmaW5lZCxcbiAgICAgICk7XG4gICAgICBjb25zdCByZXNvbHZlZENvbGxlY3Rpb25QYXRoID0gcmVxdWlyZS5yZXNvbHZlKGpvaW4oY29sbGVjdGlvbk5hbWUsICdwYWNrYWdlLmpzb24nKSwge1xuICAgICAgICBwYXRoczogW3RlbXBOb2RlTW9kdWxlc10sXG4gICAgICB9KTtcblxuICAgICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICBjb2xsZWN0aW9uTmFtZSA9IGRpcm5hbWUocmVzb2x2ZWRDb2xsZWN0aW9uUGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHN1Y2Nlc3MgPSBhd2FpdCBwYWNrYWdlTWFuYWdlci5pbnN0YWxsKFxuICAgICAgICBwYWNrYWdlSWRlbnRpZmllci5yYXcsXG4gICAgICAgIHNhdmVQYWNrYWdlLFxuICAgICAgICByZWdpc3RyeSA/IFtgLS1yZWdpc3RyeT1cIiR7cmVnaXN0cnl9XCJgXSA6IHVuZGVmaW5lZCxcbiAgICAgICk7XG5cbiAgICAgIGlmICghc3VjY2Vzcykge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5leGVjdXRlU2NoZW1hdGljKHsgLi4ub3B0aW9ucywgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGlzUHJvamVjdFZlcnNpb25WYWxpZChwYWNrYWdlSWRlbnRpZmllcjogbnBhLlJlc3VsdCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghcGFja2FnZUlkZW50aWZpZXIubmFtZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCB2YWxpZFZlcnNpb24gPSBmYWxzZTtcbiAgICBjb25zdCBpbnN0YWxsZWRWZXJzaW9uID0gYXdhaXQgdGhpcy5maW5kUHJvamVjdFZlcnNpb24ocGFja2FnZUlkZW50aWZpZXIubmFtZSk7XG4gICAgaWYgKGluc3RhbGxlZFZlcnNpb24pIHtcbiAgICAgIGlmIChwYWNrYWdlSWRlbnRpZmllci50eXBlID09PSAncmFuZ2UnICYmIHBhY2thZ2VJZGVudGlmaWVyLmZldGNoU3BlYykge1xuICAgICAgICB2YWxpZFZlcnNpb24gPSBzYXRpc2ZpZXMoaW5zdGFsbGVkVmVyc2lvbiwgcGFja2FnZUlkZW50aWZpZXIuZmV0Y2hTcGVjKTtcbiAgICAgIH0gZWxzZSBpZiAocGFja2FnZUlkZW50aWZpZXIudHlwZSA9PT0gJ3ZlcnNpb24nKSB7XG4gICAgICAgIGNvbnN0IHYxID0gdmFsaWQocGFja2FnZUlkZW50aWZpZXIuZmV0Y2hTcGVjKTtcbiAgICAgICAgY29uc3QgdjIgPSB2YWxpZChpbnN0YWxsZWRWZXJzaW9uKTtcbiAgICAgICAgdmFsaWRWZXJzaW9uID0gdjEgIT09IG51bGwgJiYgdjEgPT09IHYyO1xuICAgICAgfSBlbHNlIGlmICghcGFja2FnZUlkZW50aWZpZXIucmF3U3BlYykge1xuICAgICAgICB2YWxpZFZlcnNpb24gPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWxpZFZlcnNpb247XG4gIH1cblxuICBvdmVycmlkZSBhc3luYyByZXBvcnRBbmFseXRpY3Mob3B0aW9uczogT3RoZXJPcHRpb25zLCBwYXRoczogc3RyaW5nW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gYXdhaXQgdGhpcy5nZXRDb2xsZWN0aW9uTmFtZSgpO1xuICAgIGNvbnN0IGRpbWVuc2lvbnM6IHN0cmluZ1tdID0gW107XG4gICAgLy8gQWRkIHRoZSBjb2xsZWN0aW9uIGlmIGl0J3Mgc2FmZSBsaXN0ZWQuXG4gICAgaWYgKGNvbGxlY3Rpb24gJiYgaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MoY29sbGVjdGlvbikpIHtcbiAgICAgIGRpbWVuc2lvbnNbYW5hbHl0aWNzLk5nQ2xpQW5hbHl0aWNzRGltZW5zaW9ucy5OZ0FkZENvbGxlY3Rpb25dID0gY29sbGVjdGlvbjtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXIucmVwb3J0QW5hbHl0aWNzKG9wdGlvbnMsIHBhdGhzLCBkaW1lbnNpb25zKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2V0Q29sbGVjdGlvbk5hbWUoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBbLCBjb2xsZWN0aW9uTmFtZV0gPSB0aGlzLmNvbnRleHQuYXJncy5wb3NpdGlvbmFsO1xuXG4gICAgcmV0dXJuIGNvbGxlY3Rpb25OYW1lO1xuICB9XG5cbiAgcHJpdmF0ZSBpc1BhY2thZ2VJbnN0YWxsZWQobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgdHJ5IHtcbiAgICAgIHJlcXVpcmUucmVzb2x2ZShqb2luKG5hbWUsICdwYWNrYWdlLmpzb24nKSwgeyBwYXRoczogW3RoaXMuY29udGV4dC5yb290XSB9KTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgIGlmIChlLmNvZGUgIT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICBvcHRpb25zOiBPcHRpb25zPEFkZENvbW1hbmRBcmdzPiAmIE90aGVyT3B0aW9ucyxcbiAgKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgc2tpcENvbmZpcm1hdGlvbixcbiAgICAgICAgaW50ZXJhY3RpdmUsXG4gICAgICAgIGZvcmNlLFxuICAgICAgICBkcnlSdW4sXG4gICAgICAgIHJlZ2lzdHJ5LFxuICAgICAgICBkZWZhdWx0cyxcbiAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIC4uLnNjaGVtYXRpY09wdGlvbnNcbiAgICAgIH0gPSBvcHRpb25zO1xuXG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5ydW5TY2hlbWF0aWMoe1xuICAgICAgICBzY2hlbWF0aWNPcHRpb25zLFxuICAgICAgICBzY2hlbWF0aWNOYW1lOiB0aGlzLnNjaGVtYXRpY05hbWUsXG4gICAgICAgIGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICBleGVjdXRpb25PcHRpb25zOiB7XG4gICAgICAgICAgaW50ZXJhY3RpdmUsXG4gICAgICAgICAgZm9yY2UsXG4gICAgICAgICAgZHJ5UnVuLFxuICAgICAgICAgIGRlZmF1bHRzLFxuICAgICAgICAgIHBhY2thZ2VSZWdpc3RyeTogcmVnaXN0cnksXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE5vZGVQYWNrYWdlRG9lc05vdFN1cHBvcnRTY2hlbWF0aWNzKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuZXJyb3IodGFncy5vbmVMaW5lYFxuICAgICAgICAgIFRoZSBwYWNrYWdlIHRoYXQgeW91IGFyZSB0cnlpbmcgdG8gYWRkIGRvZXMgbm90IHN1cHBvcnQgc2NoZW1hdGljcy4gWW91IGNhbiB0cnkgdXNpbmdcbiAgICAgICAgICBhIGRpZmZlcmVudCB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIG9yIGNvbnRhY3QgdGhlIHBhY2thZ2UgYXV0aG9yIHRvIGFkZCBuZy1hZGQgc3VwcG9ydC5cbiAgICAgICAgYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmaW5kUHJvamVjdFZlcnNpb24obmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgeyBsb2dnZXIsIHJvb3QgfSA9IHRoaXMuY29udGV4dDtcbiAgICBsZXQgaW5zdGFsbGVkUGFja2FnZTtcbiAgICB0cnkge1xuICAgICAgaW5zdGFsbGVkUGFja2FnZSA9IHJlcXVpcmUucmVzb2x2ZShqb2luKG5hbWUsICdwYWNrYWdlLmpzb24nKSwge1xuICAgICAgICBwYXRoczogW3Jvb3RdLFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgaWYgKGluc3RhbGxlZFBhY2thZ2UpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGluc3RhbGxlZCA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KGRpcm5hbWUoaW5zdGFsbGVkUGFja2FnZSksIGxvZ2dlcik7XG5cbiAgICAgICAgcmV0dXJuIGluc3RhbGxlZC52ZXJzaW9uO1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cblxuICAgIGxldCBwcm9qZWN0TWFuaWZlc3Q7XG4gICAgdHJ5IHtcbiAgICAgIHByb2plY3RNYW5pZmVzdCA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KHJvb3QsIGxvZ2dlcik7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgaWYgKHByb2plY3RNYW5pZmVzdCkge1xuICAgICAgY29uc3QgdmVyc2lvbiA9XG4gICAgICAgIHByb2plY3RNYW5pZmVzdC5kZXBlbmRlbmNpZXM/LltuYW1lXSB8fCBwcm9qZWN0TWFuaWZlc3QuZGV2RGVwZW5kZW5jaWVzPy5bbmFtZV07XG4gICAgICBpZiAodmVyc2lvbikge1xuICAgICAgICByZXR1cm4gdmVyc2lvbjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFzTWlzbWF0Y2hlZFBlZXIobWFuaWZlc3Q6IFBhY2thZ2VNYW5pZmVzdCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgcGVlciBpbiBtYW5pZmVzdC5wZWVyRGVwZW5kZW5jaWVzKSB7XG4gICAgICBsZXQgcGVlcklkZW50aWZpZXI7XG4gICAgICB0cnkge1xuICAgICAgICBwZWVySWRlbnRpZmllciA9IG5wYS5yZXNvbHZlKHBlZXIsIG1hbmlmZXN0LnBlZXJEZXBlbmRlbmNpZXNbcGVlcl0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2FybihgSW52YWxpZCBwZWVyIGRlcGVuZGVuY3kgJHtwZWVyfSBmb3VuZCBpbiBwYWNrYWdlLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBlZXJJZGVudGlmaWVyLnR5cGUgPT09ICd2ZXJzaW9uJyB8fCBwZWVySWRlbnRpZmllci50eXBlID09PSAncmFuZ2UnKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGF3YWl0IHRoaXMuZmluZFByb2plY3RWZXJzaW9uKHBlZXIpO1xuICAgICAgICAgIGlmICghdmVyc2lvbikge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHsgaW5jbHVkZVByZXJlbGVhc2U6IHRydWUgfTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICFpbnRlcnNlY3RzKHZlcnNpb24sIHBlZXJJZGVudGlmaWVyLnJhd1NwZWMsIG9wdGlvbnMpICYmXG4gICAgICAgICAgICAhc2F0aXNmaWVzKHZlcnNpb24sIHBlZXJJZGVudGlmaWVyLnJhd1NwZWMsIG9wdGlvbnMpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIE5vdCBmb3VuZCBvciBpbnZhbGlkIHNvIGlnbm9yZVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB0eXBlID09PSAndGFnJyB8ICdmaWxlJyB8ICdkaXJlY3RvcnknIHwgJ3JlbW90ZScgfCAnZ2l0J1xuICAgICAgICAvLyBDYW5ub3QgYWNjdXJhdGVseSBjb21wYXJlIHRoZXNlIGFzIHRoZSB0YWcvbG9jYXRpb24gbWF5IGhhdmUgY2hhbmdlZCBzaW5jZSBpbnN0YWxsXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=