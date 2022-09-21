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
const module_1 = require("module");
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
    // @angular/localize@9.x versions do not have peer dependencies setup
    '@angular/localize': '9.x',
};
class AddCommandModule extends schematics_command_module_1.SchematicsCommandModule {
    constructor() {
        super(...arguments);
        this.command = 'add <collection>';
        this.describe = 'Adds support for an external library to your project.';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
        this.allowPrivateSchematics = true;
        this.schematicName = 'ng-add';
        this.rootRequire = (0, module_1.createRequire)(this.context.root + '/');
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
                    if (versionExclusions && (0, semver_1.satisfies)(value.version, versionExclusions)) {
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
            const tempRequire = (0, module_1.createRequire)(tempNodeModules + '/');
            const resolvedCollectionPath = tempRequire.resolve((0, path_1.join)(collectionName, 'package.json'));
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
            this.rootRequire.resolve((0, path_1.join)(name, 'package.json'));
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
            installedPackage = this.rootRequire.resolve((0, path_1.join)(name, 'package.json'));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2FkZC9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7O0FBRUgsK0NBQXVEO0FBQ3ZELDREQUF1RjtBQUN2RixtQ0FBdUM7QUFDdkMsc0VBQWtDO0FBQ2xDLCtCQUFxQztBQUNyQyxtQ0FBMkU7QUFFM0UsMkVBQXNFO0FBQ3RFLHlEQUEwRTtBQU0xRSwrRkFHeUQ7QUFDekQsaURBQStDO0FBQy9DLGlEQUFzRDtBQUN0RCx1RUFLMEM7QUFDMUMsbURBQXlEO0FBQ3pELHFEQUFrRDtBQUNsRCw2Q0FBNEM7QUFTNUM7Ozs7R0FJRztBQUNILE1BQU0sd0JBQXdCLEdBQXVDO0lBQ25FLHFFQUFxRTtJQUNyRSxtQkFBbUIsRUFBRSxLQUFLO0NBQzNCLENBQUM7QUFFRixNQUFhLGdCQUNYLFNBQVEsbURBQXVCO0lBRGpDOztRQUlFLFlBQU8sR0FBRyxrQkFBa0IsQ0FBQztRQUM3QixhQUFRLEdBQUcsdURBQXVELENBQUM7UUFDbkUsd0JBQW1CLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDMUMsMkJBQXNCLEdBQUcsSUFBSSxDQUFDO1FBQ2hDLGtCQUFhLEdBQUcsUUFBUSxDQUFDO1FBQ2xDLGdCQUFXLEdBQUcsSUFBQSxzQkFBYSxFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBbVovRCxDQUFDO0lBalpVLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBVTtRQUMvQixNQUFNLFVBQVUsR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUMzQyxVQUFVLENBQUMsWUFBWSxFQUFFO1lBQ3hCLFdBQVcsRUFBRSwwQkFBMEI7WUFDdkMs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O2FBQ1Y7WUFFRCxJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssU0FBUyxJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFO2dCQUN4RSxJQUFJO29CQUNGLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNwRCxJQUFJLENBQUMsT0FBTyxFQUFFO3dCQUNaLFNBQVM7cUJBQ1Y7b0JBRUQsTUFBTSxPQUFPLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQztvQkFFNUMsSUFDRSxDQUFDLElBQUEsbUJBQVUsRUFBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7d0JBQ3JELENBQUMsSUFBQSxrQkFBUyxFQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUNwRDt3QkFDQSxPQUFPLElBQUksQ0FBQztxQkFDYjtpQkFDRjtnQkFBQyxXQUFNO29CQUNOLGlDQUFpQztvQkFDakMsU0FBUztpQkFDVjthQUNGO2lCQUFNO2dCQUNMLDJEQUEyRDtnQkFDM0QscUZBQXFGO2FBQ3RGO1NBQ0Y7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7Q0FDRjtBQTVaRCw0Q0E0WkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgYW5hbHl0aWNzLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VEb2VzTm90U3VwcG9ydFNjaGVtYXRpY3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgeyBjcmVhdGVSZXF1aXJlIH0gZnJvbSAnbW9kdWxlJztcbmltcG9ydCBucGEgZnJvbSAnbnBtLXBhY2thZ2UtYXJnJztcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGNvbXBhcmUsIGludGVyc2VjdHMsIHByZXJlbGVhc2UsIHNhdGlzZmllcywgdmFsaWQgfSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vLi4vLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7IGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzIH0gZnJvbSAnLi4vLi4vYW5hbHl0aWNzL2FuYWx5dGljcyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7XG4gIFNjaGVtYXRpY3NDb21tYW5kQXJncyxcbiAgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGUsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9zY2hlbWF0aWNzLWNvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBhc3NlcnRJc0Vycm9yIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2Vycm9yJztcbmltcG9ydCB7XG4gIE5nQWRkU2F2ZURlcGVuZGVuY3ksXG4gIFBhY2thZ2VNYW5pZmVzdCxcbiAgZmV0Y2hQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1ldGFkYXRhLFxufSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcGFja2FnZS1tZXRhZGF0YSc7XG5pbXBvcnQgeyBhc2tDb25maXJtYXRpb24gfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcHJvbXB0JztcbmltcG9ydCB7IFNwaW5uZXIgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvc3Bpbm5lcic7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy90dHknO1xuXG5pbnRlcmZhY2UgQWRkQ29tbWFuZEFyZ3MgZXh0ZW5kcyBTY2hlbWF0aWNzQ29tbWFuZEFyZ3Mge1xuICBjb2xsZWN0aW9uOiBzdHJpbmc7XG4gIHZlcmJvc2U/OiBib29sZWFuO1xuICByZWdpc3RyeT86IHN0cmluZztcbiAgJ3NraXAtY29uZmlybWF0aW9uJz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogVGhlIHNldCBvZiBwYWNrYWdlcyB0aGF0IHNob3VsZCBoYXZlIGNlcnRhaW4gdmVyc2lvbnMgZXhjbHVkZWQgZnJvbSBjb25zaWRlcmF0aW9uXG4gKiB3aGVuIGF0dGVtcHRpbmcgdG8gZmluZCBhIGNvbXBhdGlibGUgdmVyc2lvbiBmb3IgYSBwYWNrYWdlLlxuICogVGhlIGtleSBpcyBhIHBhY2thZ2UgbmFtZSBhbmQgdGhlIHZhbHVlIGlzIGEgU2VtVmVyIHJhbmdlIG9mIHZlcnNpb25zIHRvIGV4Y2x1ZGUuXG4gKi9cbmNvbnN0IHBhY2thZ2VWZXJzaW9uRXhjbHVzaW9uczogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgdW5kZWZpbmVkPiA9IHtcbiAgLy8gQGFuZ3VsYXIvbG9jYWxpemVAOS54IHZlcnNpb25zIGRvIG5vdCBoYXZlIHBlZXIgZGVwZW5kZW5jaWVzIHNldHVwXG4gICdAYW5ndWxhci9sb2NhbGl6ZSc6ICc5LngnLFxufTtcblxuZXhwb3J0IGNsYXNzIEFkZENvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBTY2hlbWF0aWNzQ29tbWFuZE1vZHVsZVxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxBZGRDb21tYW5kQXJncz5cbntcbiAgY29tbWFuZCA9ICdhZGQgPGNvbGxlY3Rpb24+JztcbiAgZGVzY3JpYmUgPSAnQWRkcyBzdXBwb3J0IGZvciBhbiBleHRlcm5hbCBsaWJyYXJ5IHRvIHlvdXIgcHJvamVjdC4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoID0gam9pbihfX2Rpcm5hbWUsICdsb25nLWRlc2NyaXB0aW9uLm1kJyk7XG4gIHByb3RlY3RlZCBvdmVycmlkZSBhbGxvd1ByaXZhdGVTY2hlbWF0aWNzID0gdHJ1ZTtcbiAgcHJpdmF0ZSByZWFkb25seSBzY2hlbWF0aWNOYW1lID0gJ25nLWFkZCc7XG4gIHByaXZhdGUgcm9vdFJlcXVpcmUgPSBjcmVhdGVSZXF1aXJlKHRoaXMuY29udGV4dC5yb290ICsgJy8nKTtcblxuICBvdmVycmlkZSBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8QWRkQ29tbWFuZEFyZ3M+PiB7XG4gICAgY29uc3QgbG9jYWxZYXJncyA9IChhd2FpdCBzdXBlci5idWlsZGVyKGFyZ3YpKVxuICAgICAgLnBvc2l0aW9uYWwoJ2NvbGxlY3Rpb24nLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIHBhY2thZ2UgdG8gYmUgYWRkZWQuJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGRlbWFuZE9wdGlvbjogdHJ1ZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdyZWdpc3RyeScsIHsgZGVzY3JpcHRpb246ICdUaGUgTlBNIHJlZ2lzdHJ5IHRvIHVzZS4nLCB0eXBlOiAnc3RyaW5nJyB9KVxuICAgICAgLm9wdGlvbigndmVyYm9zZScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdEaXNwbGF5IGFkZGl0aW9uYWwgZGV0YWlscyBhYm91dCBpbnRlcm5hbCBvcGVyYXRpb25zIGR1cmluZyBleGVjdXRpb24uJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdza2lwLWNvbmZpcm1hdGlvbicsIHtcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgJ1NraXAgYXNraW5nIGEgY29uZmlybWF0aW9uIHByb21wdCBiZWZvcmUgaW5zdGFsbGluZyBhbmQgZXhlY3V0aW5nIHRoZSBwYWNrYWdlLiAnICtcbiAgICAgICAgICAnRW5zdXJlIHBhY2thZ2UgbmFtZSBpcyBjb3JyZWN0IHByaW9yIHRvIHVzaW5nIHRoaXMgb3B0aW9uLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLy8gUHJpb3IgdG8gZG93bmxvYWRpbmcgd2UgZG9uJ3Qga25vdyB0aGUgZnVsbCBzY2hlbWEgYW5kIHRoZXJlZm9yZSB3ZSBjYW5ub3QgYmUgc3RyaWN0IG9uIHRoZSBvcHRpb25zLlxuICAgICAgLy8gUG9zc2libHkgaW4gdGhlIGZ1dHVyZSB1cGRhdGUgdGhlIGxvZ2ljIHRvIHVzZSB0aGUgZm9sbG93aW5nIHN5bnRheDpcbiAgICAgIC8vIGBuZyBhZGQgQGFuZ3VsYXIvbG9jYWxpemUgLS0gLS1wYWNrYWdlLW9wdGlvbnNgLlxuICAgICAgLnN0cmljdChmYWxzZSk7XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IGF3YWl0IHRoaXMuZ2V0Q29sbGVjdGlvbk5hbWUoKTtcbiAgICBjb25zdCB3b3JrZmxvdyA9IGF3YWl0IHRoaXMuZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckJ1aWxkZXIoY29sbGVjdGlvbk5hbWUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gICAgICBjb25zdCBvcHRpb25zID0gYXdhaXQgdGhpcy5nZXRTY2hlbWF0aWNPcHRpb25zKGNvbGxlY3Rpb24sIHRoaXMuc2NoZW1hdGljTmFtZSwgd29ya2Zsb3cpO1xuXG4gICAgICByZXR1cm4gdGhpcy5hZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kKGxvY2FsWWFyZ3MsIG9wdGlvbnMpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBEdXJpbmcgYG5nIGFkZGAgcHJpb3IgdG8gdGhlIGRvd25sb2FkaW5nIG9mIHRoZSBwYWNrYWdlXG4gICAgICAvLyB3ZSBhcmUgbm90IGFibGUgdG8gcmVzb2x2ZSBhbmQgY3JlYXRlIGEgY29sbGVjdGlvbi5cbiAgICAgIC8vIE9yIHdoZW4gdGhlIHRoZSBjb2xsZWN0aW9uIHZhbHVlIGlzIGEgcGF0aCB0byBhIHRhcmJhbGwuXG4gICAgfVxuXG4gICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxpbmVzLXBlci1mdW5jdGlvblxuICBhc3luYyBydW4ob3B0aW9uczogT3B0aW9uczxBZGRDb21tYW5kQXJncz4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBjb25zdCB7IGxvZ2dlciwgcGFja2FnZU1hbmFnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCB7IHZlcmJvc2UsIHJlZ2lzdHJ5LCBjb2xsZWN0aW9uLCBza2lwQ29uZmlybWF0aW9uIH0gPSBvcHRpb25zO1xuICAgIHBhY2thZ2VNYW5hZ2VyLmVuc3VyZUNvbXBhdGliaWxpdHkoKTtcblxuICAgIGxldCBwYWNrYWdlSWRlbnRpZmllcjtcbiAgICB0cnkge1xuICAgICAgcGFja2FnZUlkZW50aWZpZXIgPSBucGEoY29sbGVjdGlvbik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgIGxvZ2dlci5lcnJvcihlLm1lc3NhZ2UpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgICBwYWNrYWdlSWRlbnRpZmllci5uYW1lICYmXG4gICAgICBwYWNrYWdlSWRlbnRpZmllci5yZWdpc3RyeSAmJlxuICAgICAgdGhpcy5pc1BhY2thZ2VJbnN0YWxsZWQocGFja2FnZUlkZW50aWZpZXIubmFtZSlcbiAgICApIHtcbiAgICAgIGNvbnN0IHZhbGlkVmVyc2lvbiA9IGF3YWl0IHRoaXMuaXNQcm9qZWN0VmVyc2lvblZhbGlkKHBhY2thZ2VJZGVudGlmaWVyKTtcbiAgICAgIGlmICh2YWxpZFZlcnNpb24pIHtcbiAgICAgICAgLy8gQWxyZWFkeSBpbnN0YWxsZWQgc28ganVzdCBydW4gc2NoZW1hdGljXG4gICAgICAgIGxvZ2dlci5pbmZvKCdTa2lwcGluZyBpbnN0YWxsYXRpb246IFBhY2thZ2UgYWxyZWFkeSBpbnN0YWxsZWQnKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5leGVjdXRlU2NoZW1hdGljKHsgLi4ub3B0aW9ucywgY29sbGVjdGlvbjogcGFja2FnZUlkZW50aWZpZXIubmFtZSB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzcGlubmVyID0gbmV3IFNwaW5uZXIoKTtcblxuICAgIHNwaW5uZXIuc3RhcnQoJ0RldGVybWluaW5nIHBhY2thZ2UgbWFuYWdlci4uLicpO1xuICAgIGNvbnN0IHVzaW5nWWFybiA9IHBhY2thZ2VNYW5hZ2VyLm5hbWUgPT09IFBhY2thZ2VNYW5hZ2VyLllhcm47XG4gICAgc3Bpbm5lci5pbmZvKGBVc2luZyBwYWNrYWdlIG1hbmFnZXI6ICR7Y29sb3JzLmdyZXkocGFja2FnZU1hbmFnZXIubmFtZSl9YCk7XG5cbiAgICBpZiAocGFja2FnZUlkZW50aWZpZXIubmFtZSAmJiBwYWNrYWdlSWRlbnRpZmllci50eXBlID09PSAndGFnJyAmJiAhcGFja2FnZUlkZW50aWZpZXIucmF3U3BlYykge1xuICAgICAgLy8gb25seSBwYWNrYWdlIG5hbWUgcHJvdmlkZWQ7IHNlYXJjaCBmb3IgdmlhYmxlIHZlcnNpb25cbiAgICAgIC8vIHBsdXMgc3BlY2lhbCBjYXNlcyBmb3IgcGFja2FnZXMgdGhhdCBkaWQgbm90IGhhdmUgcGVlciBkZXBzIHNldHVwXG4gICAgICBzcGlubmVyLnN0YXJ0KCdTZWFyY2hpbmcgZm9yIGNvbXBhdGlibGUgcGFja2FnZSB2ZXJzaW9uLi4uJyk7XG5cbiAgICAgIGxldCBwYWNrYWdlTWV0YWRhdGE7XG4gICAgICB0cnkge1xuICAgICAgICBwYWNrYWdlTWV0YWRhdGEgPSBhd2FpdCBmZXRjaFBhY2thZ2VNZXRhZGF0YShwYWNrYWdlSWRlbnRpZmllci5uYW1lLCBsb2dnZXIsIHtcbiAgICAgICAgICByZWdpc3RyeSxcbiAgICAgICAgICB1c2luZ1lhcm4sXG4gICAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgIHNwaW5uZXIuZmFpbChgVW5hYmxlIHRvIGxvYWQgcGFja2FnZSBpbmZvcm1hdGlvbiBmcm9tIHJlZ2lzdHJ5OiAke2UubWVzc2FnZX1gKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgLy8gU3RhcnQgd2l0aCB0aGUgdmVyc2lvbiB0YWdnZWQgYXMgYGxhdGVzdGAgaWYgaXQgZXhpc3RzXG4gICAgICBjb25zdCBsYXRlc3RNYW5pZmVzdCA9IHBhY2thZ2VNZXRhZGF0YS50YWdzWydsYXRlc3QnXTtcbiAgICAgIGlmIChsYXRlc3RNYW5pZmVzdCkge1xuICAgICAgICBwYWNrYWdlSWRlbnRpZmllciA9IG5wYS5yZXNvbHZlKGxhdGVzdE1hbmlmZXN0Lm5hbWUsIGxhdGVzdE1hbmlmZXN0LnZlcnNpb24pO1xuICAgICAgfVxuXG4gICAgICAvLyBBZGp1c3QgdGhlIHZlcnNpb24gYmFzZWQgb24gbmFtZSBhbmQgcGVlciBkZXBlbmRlbmNpZXNcbiAgICAgIGlmIChcbiAgICAgICAgbGF0ZXN0TWFuaWZlc3Q/LnBlZXJEZXBlbmRlbmNpZXMgJiZcbiAgICAgICAgT2JqZWN0LmtleXMobGF0ZXN0TWFuaWZlc3QucGVlckRlcGVuZGVuY2llcykubGVuZ3RoID09PSAwXG4gICAgICApIHtcbiAgICAgICAgc3Bpbm5lci5zdWNjZWVkKFxuICAgICAgICAgIGBGb3VuZCBjb21wYXRpYmxlIHBhY2thZ2UgdmVyc2lvbjogJHtjb2xvcnMuZ3JleShwYWNrYWdlSWRlbnRpZmllci50b1N0cmluZygpKX0uYCxcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSBpZiAoIWxhdGVzdE1hbmlmZXN0IHx8IChhd2FpdCB0aGlzLmhhc01pc21hdGNoZWRQZWVyKGxhdGVzdE1hbmlmZXN0KSkpIHtcbiAgICAgICAgLy8gJ2xhdGVzdCcgaXMgaW52YWxpZCBzbyBzZWFyY2ggZm9yIG1vc3QgcmVjZW50IG1hdGNoaW5nIHBhY2thZ2VcbiAgICAgICAgY29uc3QgdmVyc2lvbkV4Y2x1c2lvbnMgPSBwYWNrYWdlVmVyc2lvbkV4Y2x1c2lvbnNbcGFja2FnZU1ldGFkYXRhLm5hbWVdO1xuICAgICAgICBjb25zdCB2ZXJzaW9uTWFuaWZlc3RzID0gT2JqZWN0LnZhbHVlcyhwYWNrYWdlTWV0YWRhdGEudmVyc2lvbnMpLmZpbHRlcihcbiAgICAgICAgICAodmFsdWU6IFBhY2thZ2VNYW5pZmVzdCkgPT4ge1xuICAgICAgICAgICAgLy8gUHJlcmVsZWFzZSB2ZXJzaW9ucyBhcmUgbm90IHN0YWJsZSBhbmQgc2hvdWxkIG5vdCBiZSBjb25zaWRlcmVkIGJ5IGRlZmF1bHRcbiAgICAgICAgICAgIGlmIChwcmVyZWxlYXNlKHZhbHVlLnZlcnNpb24pKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIERlcHJlY2F0ZWQgdmVyc2lvbnMgc2hvdWxkIG5vdCBiZSB1c2VkIG9yIGNvbnNpZGVyZWRcbiAgICAgICAgICAgIGlmICh2YWx1ZS5kZXByZWNhdGVkKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEV4Y2x1ZGVkIHBhY2thZ2UgdmVyc2lvbnMgc2hvdWxkIG5vdCBiZSBjb25zaWRlcmVkXG4gICAgICAgICAgICBpZiAodmVyc2lvbkV4Y2x1c2lvbnMgJiYgc2F0aXNmaWVzKHZhbHVlLnZlcnNpb24sIHZlcnNpb25FeGNsdXNpb25zKSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH0sXG4gICAgICAgICk7XG5cbiAgICAgICAgdmVyc2lvbk1hbmlmZXN0cy5zb3J0KChhLCBiKSA9PiBjb21wYXJlKGEudmVyc2lvbiwgYi52ZXJzaW9uLCB0cnVlKSk7XG5cbiAgICAgICAgbGV0IG5ld0lkZW50aWZpZXI7XG4gICAgICAgIGZvciAoY29uc3QgdmVyc2lvbk1hbmlmZXN0IG9mIHZlcnNpb25NYW5pZmVzdHMpIHtcbiAgICAgICAgICBpZiAoIShhd2FpdCB0aGlzLmhhc01pc21hdGNoZWRQZWVyKHZlcnNpb25NYW5pZmVzdCkpKSB7XG4gICAgICAgICAgICBuZXdJZGVudGlmaWVyID0gbnBhLnJlc29sdmUodmVyc2lvbk1hbmlmZXN0Lm5hbWUsIHZlcnNpb25NYW5pZmVzdC52ZXJzaW9uKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbmV3SWRlbnRpZmllcikge1xuICAgICAgICAgIHNwaW5uZXIud2FybihcIlVuYWJsZSB0byBmaW5kIGNvbXBhdGlibGUgcGFja2FnZS4gVXNpbmcgJ2xhdGVzdCcgdGFnLlwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYWNrYWdlSWRlbnRpZmllciA9IG5ld0lkZW50aWZpZXI7XG4gICAgICAgICAgc3Bpbm5lci5zdWNjZWVkKFxuICAgICAgICAgICAgYEZvdW5kIGNvbXBhdGlibGUgcGFja2FnZSB2ZXJzaW9uOiAke2NvbG9ycy5ncmV5KHBhY2thZ2VJZGVudGlmaWVyLnRvU3RyaW5nKCkpfS5gLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNwaW5uZXIuc3VjY2VlZChcbiAgICAgICAgICBgRm91bmQgY29tcGF0aWJsZSBwYWNrYWdlIHZlcnNpb246ICR7Y29sb3JzLmdyZXkocGFja2FnZUlkZW50aWZpZXIudG9TdHJpbmcoKSl9LmAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGNvbGxlY3Rpb25OYW1lID0gcGFja2FnZUlkZW50aWZpZXIubmFtZTtcbiAgICBsZXQgc2F2ZVBhY2thZ2U6IE5nQWRkU2F2ZURlcGVuZGVuY3kgfCB1bmRlZmluZWQ7XG5cbiAgICB0cnkge1xuICAgICAgc3Bpbm5lci5zdGFydCgnTG9hZGluZyBwYWNrYWdlIGluZm9ybWF0aW9uIGZyb20gcmVnaXN0cnkuLi4nKTtcbiAgICAgIGNvbnN0IG1hbmlmZXN0ID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWFuaWZlc3QocGFja2FnZUlkZW50aWZpZXIudG9TdHJpbmcoKSwgbG9nZ2VyLCB7XG4gICAgICAgIHJlZ2lzdHJ5LFxuICAgICAgICB2ZXJib3NlLFxuICAgICAgICB1c2luZ1lhcm4sXG4gICAgICB9KTtcblxuICAgICAgc2F2ZVBhY2thZ2UgPSBtYW5pZmVzdFsnbmctYWRkJ10/LnNhdmU7XG4gICAgICBjb2xsZWN0aW9uTmFtZSA9IG1hbmlmZXN0Lm5hbWU7XG5cbiAgICAgIGlmIChhd2FpdCB0aGlzLmhhc01pc21hdGNoZWRQZWVyKG1hbmlmZXN0KSkge1xuICAgICAgICBzcGlubmVyLndhcm4oJ1BhY2thZ2UgaGFzIHVubWV0IHBlZXIgZGVwZW5kZW5jaWVzLiBBZGRpbmcgdGhlIHBhY2thZ2UgbWF5IG5vdCBzdWNjZWVkLicpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3Bpbm5lci5zdWNjZWVkKGBQYWNrYWdlIGluZm9ybWF0aW9uIGxvYWRlZC5gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgc3Bpbm5lci5mYWlsKGBVbmFibGUgdG8gZmV0Y2ggcGFja2FnZSBpbmZvcm1hdGlvbiBmb3IgJyR7cGFja2FnZUlkZW50aWZpZXJ9JzogJHtlLm1lc3NhZ2V9YCk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGlmICghc2tpcENvbmZpcm1hdGlvbikge1xuICAgICAgY29uc3QgY29uZmlybWF0aW9uUmVzcG9uc2UgPSBhd2FpdCBhc2tDb25maXJtYXRpb24oXG4gICAgICAgIGBcXG5UaGUgcGFja2FnZSAke2NvbG9ycy5ibHVlKHBhY2thZ2VJZGVudGlmaWVyLnJhdyl9IHdpbGwgYmUgaW5zdGFsbGVkIGFuZCBleGVjdXRlZC5cXG5gICtcbiAgICAgICAgICAnV291bGQgeW91IGxpa2UgdG8gcHJvY2VlZD8nLFxuICAgICAgICB0cnVlLFxuICAgICAgICBmYWxzZSxcbiAgICAgICk7XG5cbiAgICAgIGlmICghY29uZmlybWF0aW9uUmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKCFpc1RUWSgpKSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgJ05vIHRlcm1pbmFsIGRldGVjdGVkLiAnICtcbiAgICAgICAgICAgICAgYCctLXNraXAtY29uZmlybWF0aW9uJyBjYW4gYmUgdXNlZCB0byBieXBhc3MgaW5zdGFsbGF0aW9uIGNvbmZpcm1hdGlvbi4gYCArXG4gICAgICAgICAgICAgIGBFbnN1cmUgcGFja2FnZSBuYW1lIGlzIGNvcnJlY3QgcHJpb3IgdG8gJy0tc2tpcC1jb25maXJtYXRpb24nIG9wdGlvbiB1c2FnZS5gLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBsb2dnZXIuZXJyb3IoJ0NvbW1hbmQgYWJvcnRlZC4nKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2F2ZVBhY2thZ2UgPT09IGZhbHNlKSB7XG4gICAgICAvLyBUZW1wb3JhcnkgcGFja2FnZXMgYXJlIGxvY2F0ZWQgaW4gYSBkaWZmZXJlbnQgZGlyZWN0b3J5XG4gICAgICAvLyBIZW5jZSB3ZSBuZWVkIHRvIHJlc29sdmUgdGhlbSB1c2luZyB0aGUgdGVtcCBwYXRoXG4gICAgICBjb25zdCB7IHN1Y2Nlc3MsIHRlbXBOb2RlTW9kdWxlcyB9ID0gYXdhaXQgcGFja2FnZU1hbmFnZXIuaW5zdGFsbFRlbXAoXG4gICAgICAgIHBhY2thZ2VJZGVudGlmaWVyLnJhdyxcbiAgICAgICAgcmVnaXN0cnkgPyBbYC0tcmVnaXN0cnk9XCIke3JlZ2lzdHJ5fVwiYF0gOiB1bmRlZmluZWQsXG4gICAgICApO1xuICAgICAgY29uc3QgdGVtcFJlcXVpcmUgPSBjcmVhdGVSZXF1aXJlKHRlbXBOb2RlTW9kdWxlcyArICcvJyk7XG4gICAgICBjb25zdCByZXNvbHZlZENvbGxlY3Rpb25QYXRoID0gdGVtcFJlcXVpcmUucmVzb2x2ZShqb2luKGNvbGxlY3Rpb25OYW1lLCAncGFja2FnZS5qc29uJykpO1xuXG4gICAgICBpZiAoIXN1Y2Nlc3MpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIGNvbGxlY3Rpb25OYW1lID0gZGlybmFtZShyZXNvbHZlZENvbGxlY3Rpb25QYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3VjY2VzcyA9IGF3YWl0IHBhY2thZ2VNYW5hZ2VyLmluc3RhbGwoXG4gICAgICAgIHBhY2thZ2VJZGVudGlmaWVyLnJhdyxcbiAgICAgICAgc2F2ZVBhY2thZ2UsXG4gICAgICAgIHJlZ2lzdHJ5ID8gW2AtLXJlZ2lzdHJ5PVwiJHtyZWdpc3RyeX1cImBdIDogdW5kZWZpbmVkLFxuICAgICAgKTtcblxuICAgICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoeyAuLi5vcHRpb25zLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaXNQcm9qZWN0VmVyc2lvblZhbGlkKHBhY2thZ2VJZGVudGlmaWVyOiBucGEuUmVzdWx0KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCFwYWNrYWdlSWRlbnRpZmllci5uYW1lKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IHZhbGlkVmVyc2lvbiA9IGZhbHNlO1xuICAgIGNvbnN0IGluc3RhbGxlZFZlcnNpb24gPSBhd2FpdCB0aGlzLmZpbmRQcm9qZWN0VmVyc2lvbihwYWNrYWdlSWRlbnRpZmllci5uYW1lKTtcbiAgICBpZiAoaW5zdGFsbGVkVmVyc2lvbikge1xuICAgICAgaWYgKHBhY2thZ2VJZGVudGlmaWVyLnR5cGUgPT09ICdyYW5nZScgJiYgcGFja2FnZUlkZW50aWZpZXIuZmV0Y2hTcGVjKSB7XG4gICAgICAgIHZhbGlkVmVyc2lvbiA9IHNhdGlzZmllcyhpbnN0YWxsZWRWZXJzaW9uLCBwYWNrYWdlSWRlbnRpZmllci5mZXRjaFNwZWMpO1xuICAgICAgfSBlbHNlIGlmIChwYWNrYWdlSWRlbnRpZmllci50eXBlID09PSAndmVyc2lvbicpIHtcbiAgICAgICAgY29uc3QgdjEgPSB2YWxpZChwYWNrYWdlSWRlbnRpZmllci5mZXRjaFNwZWMpO1xuICAgICAgICBjb25zdCB2MiA9IHZhbGlkKGluc3RhbGxlZFZlcnNpb24pO1xuICAgICAgICB2YWxpZFZlcnNpb24gPSB2MSAhPT0gbnVsbCAmJiB2MSA9PT0gdjI7XG4gICAgICB9IGVsc2UgaWYgKCFwYWNrYWdlSWRlbnRpZmllci5yYXdTcGVjKSB7XG4gICAgICAgIHZhbGlkVmVyc2lvbiA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbGlkVmVyc2lvbjtcbiAgfVxuXG4gIG92ZXJyaWRlIGFzeW5jIHJlcG9ydEFuYWx5dGljcyhvcHRpb25zOiBPdGhlck9wdGlvbnMsIHBhdGhzOiBzdHJpbmdbXSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSBhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25OYW1lKCk7XG4gICAgY29uc3QgZGltZW5zaW9uczogc3RyaW5nW10gPSBbXTtcbiAgICAvLyBBZGQgdGhlIGNvbGxlY3Rpb24gaWYgaXQncyBzYWZlIGxpc3RlZC5cbiAgICBpZiAoY29sbGVjdGlvbiAmJiBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyhjb2xsZWN0aW9uKSkge1xuICAgICAgZGltZW5zaW9uc1thbmFseXRpY3MuTmdDbGlBbmFseXRpY3NEaW1lbnNpb25zLk5nQWRkQ29sbGVjdGlvbl0gPSBjb2xsZWN0aW9uO1xuICAgIH1cblxuICAgIHJldHVybiBzdXBlci5yZXBvcnRBbmFseXRpY3Mob3B0aW9ucywgcGF0aHMsIGRpbWVuc2lvbnMpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRDb2xsZWN0aW9uTmFtZSgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IFssIGNvbGxlY3Rpb25OYW1lXSA9IHRoaXMuY29udGV4dC5hcmdzLnBvc2l0aW9uYWw7XG5cbiAgICByZXR1cm4gY29sbGVjdGlvbk5hbWU7XG4gIH1cblxuICBwcml2YXRlIGlzUGFja2FnZUluc3RhbGxlZChuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICB0cnkge1xuICAgICAgdGhpcy5yb290UmVxdWlyZS5yZXNvbHZlKGpvaW4obmFtZSwgJ3BhY2thZ2UuanNvbicpKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgIGlmIChlLmNvZGUgIT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICBvcHRpb25zOiBPcHRpb25zPEFkZENvbW1hbmRBcmdzPiAmIE90aGVyT3B0aW9ucyxcbiAgKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgc2tpcENvbmZpcm1hdGlvbixcbiAgICAgICAgaW50ZXJhY3RpdmUsXG4gICAgICAgIGZvcmNlLFxuICAgICAgICBkcnlSdW4sXG4gICAgICAgIHJlZ2lzdHJ5LFxuICAgICAgICBkZWZhdWx0cyxcbiAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIC4uLnNjaGVtYXRpY09wdGlvbnNcbiAgICAgIH0gPSBvcHRpb25zO1xuXG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5ydW5TY2hlbWF0aWMoe1xuICAgICAgICBzY2hlbWF0aWNPcHRpb25zLFxuICAgICAgICBzY2hlbWF0aWNOYW1lOiB0aGlzLnNjaGVtYXRpY05hbWUsXG4gICAgICAgIGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICBleGVjdXRpb25PcHRpb25zOiB7XG4gICAgICAgICAgaW50ZXJhY3RpdmUsXG4gICAgICAgICAgZm9yY2UsXG4gICAgICAgICAgZHJ5UnVuLFxuICAgICAgICAgIGRlZmF1bHRzLFxuICAgICAgICAgIHBhY2thZ2VSZWdpc3RyeTogcmVnaXN0cnksXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE5vZGVQYWNrYWdlRG9lc05vdFN1cHBvcnRTY2hlbWF0aWNzKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuZXJyb3IodGFncy5vbmVMaW5lYFxuICAgICAgICAgIFRoZSBwYWNrYWdlIHRoYXQgeW91IGFyZSB0cnlpbmcgdG8gYWRkIGRvZXMgbm90IHN1cHBvcnQgc2NoZW1hdGljcy4gWW91IGNhbiB0cnkgdXNpbmdcbiAgICAgICAgICBhIGRpZmZlcmVudCB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIG9yIGNvbnRhY3QgdGhlIHBhY2thZ2UgYXV0aG9yIHRvIGFkZCBuZy1hZGQgc3VwcG9ydC5cbiAgICAgICAgYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmaW5kUHJvamVjdFZlcnNpb24obmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgeyBsb2dnZXIsIHJvb3QgfSA9IHRoaXMuY29udGV4dDtcbiAgICBsZXQgaW5zdGFsbGVkUGFja2FnZTtcbiAgICB0cnkge1xuICAgICAgaW5zdGFsbGVkUGFja2FnZSA9IHRoaXMucm9vdFJlcXVpcmUucmVzb2x2ZShqb2luKG5hbWUsICdwYWNrYWdlLmpzb24nKSk7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgaWYgKGluc3RhbGxlZFBhY2thZ2UpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGluc3RhbGxlZCA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KGRpcm5hbWUoaW5zdGFsbGVkUGFja2FnZSksIGxvZ2dlcik7XG5cbiAgICAgICAgcmV0dXJuIGluc3RhbGxlZC52ZXJzaW9uO1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cblxuICAgIGxldCBwcm9qZWN0TWFuaWZlc3Q7XG4gICAgdHJ5IHtcbiAgICAgIHByb2plY3RNYW5pZmVzdCA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KHJvb3QsIGxvZ2dlcik7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgaWYgKHByb2plY3RNYW5pZmVzdCkge1xuICAgICAgY29uc3QgdmVyc2lvbiA9XG4gICAgICAgIHByb2plY3RNYW5pZmVzdC5kZXBlbmRlbmNpZXM/LltuYW1lXSB8fCBwcm9qZWN0TWFuaWZlc3QuZGV2RGVwZW5kZW5jaWVzPy5bbmFtZV07XG4gICAgICBpZiAodmVyc2lvbikge1xuICAgICAgICByZXR1cm4gdmVyc2lvbjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFzTWlzbWF0Y2hlZFBlZXIobWFuaWZlc3Q6IFBhY2thZ2VNYW5pZmVzdCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgcGVlciBpbiBtYW5pZmVzdC5wZWVyRGVwZW5kZW5jaWVzKSB7XG4gICAgICBsZXQgcGVlcklkZW50aWZpZXI7XG4gICAgICB0cnkge1xuICAgICAgICBwZWVySWRlbnRpZmllciA9IG5wYS5yZXNvbHZlKHBlZXIsIG1hbmlmZXN0LnBlZXJEZXBlbmRlbmNpZXNbcGVlcl0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2FybihgSW52YWxpZCBwZWVyIGRlcGVuZGVuY3kgJHtwZWVyfSBmb3VuZCBpbiBwYWNrYWdlLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBlZXJJZGVudGlmaWVyLnR5cGUgPT09ICd2ZXJzaW9uJyB8fCBwZWVySWRlbnRpZmllci50eXBlID09PSAncmFuZ2UnKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGF3YWl0IHRoaXMuZmluZFByb2plY3RWZXJzaW9uKHBlZXIpO1xuICAgICAgICAgIGlmICghdmVyc2lvbikge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHsgaW5jbHVkZVByZXJlbGVhc2U6IHRydWUgfTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICFpbnRlcnNlY3RzKHZlcnNpb24sIHBlZXJJZGVudGlmaWVyLnJhd1NwZWMsIG9wdGlvbnMpICYmXG4gICAgICAgICAgICAhc2F0aXNmaWVzKHZlcnNpb24sIHBlZXJJZGVudGlmaWVyLnJhd1NwZWMsIG9wdGlvbnMpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIE5vdCBmb3VuZCBvciBpbnZhbGlkIHNvIGlnbm9yZVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB0eXBlID09PSAndGFnJyB8ICdmaWxlJyB8ICdkaXJlY3RvcnknIHwgJ3JlbW90ZScgfCAnZ2l0J1xuICAgICAgICAvLyBDYW5ub3QgYWNjdXJhdGVseSBjb21wYXJlIHRoZXNlIGFzIHRoZSB0YWcvbG9jYXRpb24gbWF5IGhhdmUgY2hhbmdlZCBzaW5jZSBpbnN0YWxsXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=