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
        const { root, logger, packageManager } = this.context;
        const { verbose, registry, collection, skipConfirmation } = options;
        await (0, package_manager_1.ensureCompatibleNpm)(root);
        let packageIdentifier;
        try {
            packageIdentifier = (0, npm_package_arg_1.default)(collection);
        }
        catch (e) {
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
        const usingYarn = packageManager === workspace_schema_1.PackageManager.Yarn;
        spinner.info(`Using package manager: ${color_1.colors.grey(packageManager)}`);
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
                spinner.fail(`Unable to load package information from registry: ${e.message}`);
                return 1;
            }
            // Start with the version tagged as `latest` if it exists
            const latestManifest = packageMetadata.tags['latest'];
            if (latestManifest) {
                packageIdentifier = npm_package_arg_1.default.resolve(latestManifest.name, latestManifest.version);
            }
            // Adjust the version based on name and peer dependencies
            if (latestManifest && Object.keys(latestManifest.peerDependencies).length === 0) {
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
            const { status, tempNodeModules } = await (0, install_package_1.installTempPackage)(packageIdentifier.raw, packageManager, registry ? [`--registry="${registry}"`] : undefined);
            const resolvedCollectionPath = require.resolve((0, path_1.join)(collectionName, 'package.json'), {
                paths: [tempNodeModules],
            });
            if (status !== 0) {
                return status;
            }
            collectionName = (0, path_1.dirname)(resolvedCollectionPath);
        }
        else {
            const status = await (0, install_package_1.installPackage)(packageIdentifier.raw, packageManager, savePackage, registry ? [`--registry="${registry}"`] : undefined);
            if (status !== 0) {
                return status;
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
        const { logger, root } = this.context;
        let installedPackage;
        try {
            installedPackage = require.resolve((0, path_1.join)(name, 'package.json'), {
                paths: [root],
            });
        }
        catch (_a) { }
        if (installedPackage) {
            try {
                const installed = await (0, package_metadata_1.fetchPackageManifest)((0, path_1.dirname)(installedPackage), logger);
                return installed.version;
            }
            catch (_b) { }
        }
        let projectManifest;
        try {
            projectManifest = await (0, package_metadata_1.fetchPackageManifest)(root, logger);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2FkZC9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7O0FBRUgsK0NBQXVEO0FBQ3ZELDREQUF1RjtBQUN2RixzRUFBa0M7QUFDbEMsK0JBQXFDO0FBQ3JDLG1DQUEyRTtBQUUzRSwyRUFBc0U7QUFDdEUseURBQTBFO0FBTTFFLCtGQUd5RDtBQUN6RCxpREFBK0M7QUFDL0MscUVBQXFGO0FBQ3JGLHFFQUFzRTtBQUN0RSx1RUFLMEM7QUFDMUMsbURBQXlEO0FBQ3pELHFEQUFrRDtBQUNsRCw2Q0FBNEM7QUFTNUM7Ozs7R0FJRztBQUNILE1BQU0sd0JBQXdCLEdBQXVDO0lBQ25FLHFFQUFxRTtJQUNyRSxtQkFBbUIsRUFBRSxLQUFLO0NBQzNCLENBQUM7QUFFRixNQUFhLGdCQUNYLFNBQVEsbURBQXVCO0lBRGpDOztRQUlFLFlBQU8sR0FBRyxrQkFBa0IsQ0FBQztRQUM3QixhQUFRLEdBQUcsdURBQXVELENBQUM7UUFDbkUsd0JBQW1CLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDMUMsMkJBQXNCLEdBQUcsSUFBSSxDQUFDO1FBQ2hDLGtCQUFhLEdBQUcsUUFBUSxDQUFDO0lBZ1o1QyxDQUFDO0lBOVlVLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBVTtRQUMvQixNQUFNLFVBQVUsR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUMzQyxVQUFVLENBQUMsWUFBWSxFQUFFO1lBQ3hCLFdBQVcsRUFBRSwwQkFBMEI7WUFDdkMsSUFBSSxFQUFFLFFBQVE7WUFDZCxZQUFZLEVBQUUsSUFBSTtTQUNuQixDQUFDO2FBQ0QsTUFBTSxDQUFDLFVBQVUsRUFBRSxFQUFFLFdB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TSxPQUFPLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQztvQkFFNUMsSUFDRSxDQUFDLElBQUEsbUJBQVUsRUFBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7d0JBQ3JELENBQUMsSUFBQSxrQkFBUyxFQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUNwRDt3QkFDQSxPQUFPLElBQUksQ0FBQztxQkFDYjtpQkFDRjtnQkFBQyxXQUFNO29CQUNOLGlDQUFpQztvQkFDakMsU0FBUztpQkFDVjthQUNGO2lCQUFNO2dCQUNMLDJEQUEyRDtnQkFDM0QscUZBQXFGO2FBQ3RGO1NBQ0Y7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7Q0FDRjtBQXhaRCw0Q0F3WkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgYW5hbHl0aWNzLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VEb2VzTm90U3VwcG9ydFNjaGVtYXRpY3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgbnBhIGZyb20gJ25wbS1wYWNrYWdlLWFyZyc7XG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBjb21wYXJlLCBpbnRlcnNlY3RzLCBwcmVyZWxlYXNlLCBzYXRpc2ZpZXMsIHZhbGlkIH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uLy4uLy4uL2xpYi9jb25maWcvd29ya3NwYWNlLXNjaGVtYSc7XG5pbXBvcnQgeyBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyB9IGZyb20gJy4uLy4uL2FuYWx5dGljcy9hbmFseXRpY3MnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBPcHRpb25zLFxuICBPdGhlck9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQge1xuICBTY2hlbWF0aWNzQ29tbWFuZEFyZ3MsXG4gIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgaW5zdGFsbFBhY2thZ2UsIGluc3RhbGxUZW1wUGFja2FnZSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9pbnN0YWxsLXBhY2thZ2UnO1xuaW1wb3J0IHsgZW5zdXJlQ29tcGF0aWJsZU5wbSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXInO1xuaW1wb3J0IHtcbiAgTmdBZGRTYXZlRGVwZWRlbmN5LFxuICBQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNZXRhZGF0YSxcbn0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWV0YWRhdGEnO1xuaW1wb3J0IHsgYXNrQ29uZmlybWF0aW9uIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3Byb21wdCc7XG5pbXBvcnQgeyBTcGlubmVyIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3NwaW5uZXInO1xuaW1wb3J0IHsgaXNUVFkgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvdHR5JztcblxuaW50ZXJmYWNlIEFkZENvbW1hbmRBcmdzIGV4dGVuZHMgU2NoZW1hdGljc0NvbW1hbmRBcmdzIHtcbiAgY29sbGVjdGlvbjogc3RyaW5nO1xuICB2ZXJib3NlPzogYm9vbGVhbjtcbiAgcmVnaXN0cnk/OiBzdHJpbmc7XG4gICdza2lwLWNvbmZpcm1hdGlvbic/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRoZSBzZXQgb2YgcGFja2FnZXMgdGhhdCBzaG91bGQgaGF2ZSBjZXJ0YWluIHZlcnNpb25zIGV4Y2x1ZGVkIGZyb20gY29uc2lkZXJhdGlvblxuICogd2hlbiBhdHRlbXB0aW5nIHRvIGZpbmQgYSBjb21wYXRpYmxlIHZlcnNpb24gZm9yIGEgcGFja2FnZS5cbiAqIFRoZSBrZXkgaXMgYSBwYWNrYWdlIG5hbWUgYW5kIHRoZSB2YWx1ZSBpcyBhIFNlbVZlciByYW5nZSBvZiB2ZXJzaW9ucyB0byBleGNsdWRlLlxuICovXG5jb25zdCBwYWNrYWdlVmVyc2lvbkV4Y2x1c2lvbnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IHVuZGVmaW5lZD4gPSB7XG4gIC8vIEBhbmd1bGFyL2xvY2FsaXplQDkueCB2ZXJzaW9ucyBkbyBub3QgaGF2ZSBwZWVyIGRlcGVuZGVuY2llcyBzZXR1cFxuICAnQGFuZ3VsYXIvbG9jYWxpemUnOiAnOS54Jyxcbn07XG5cbmV4cG9ydCBjbGFzcyBBZGRDb21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGVcbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248QWRkQ29tbWFuZEFyZ3M+XG57XG4gIGNvbW1hbmQgPSAnYWRkIDxjb2xsZWN0aW9uPic7XG4gIGRlc2NyaWJlID0gJ0FkZHMgc3VwcG9ydCBmb3IgYW4gZXh0ZXJuYWwgbGlicmFyeSB0byB5b3VyIHByb2plY3QuJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnbG9uZy1kZXNjcmlwdGlvbi5tZCcpO1xuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgYWxsb3dQcml2YXRlU2NoZW1hdGljcyA9IHRydWU7XG4gIHByaXZhdGUgcmVhZG9ubHkgc2NoZW1hdGljTmFtZSA9ICduZy1hZGQnO1xuXG4gIG92ZXJyaWRlIGFzeW5jIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxBZGRDb21tYW5kQXJncz4+IHtcbiAgICBjb25zdCBsb2NhbFlhcmdzID0gKGF3YWl0IHN1cGVyLmJ1aWxkZXIoYXJndikpXG4gICAgICAucG9zaXRpb25hbCgnY29sbGVjdGlvbicsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgcGFja2FnZSB0byBiZSBhZGRlZC4nLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgZGVtYW5kT3B0aW9uOiB0cnVlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ3JlZ2lzdHJ5JywgeyBkZXNjcmlwdGlvbjogJ1RoZSBOUE0gcmVnaXN0cnkgdG8gdXNlLicsIHR5cGU6ICdzdHJpbmcnIH0pXG4gICAgICAub3B0aW9uKCd2ZXJib3NlJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ0Rpc3BsYXkgYWRkaXRpb25hbCBkZXRhaWxzIGFib3V0IGludGVybmFsIG9wZXJhdGlvbnMgZHVyaW5nIGV4ZWN1dGlvbi4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ3NraXAtY29uZmlybWF0aW9uJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAnU2tpcCBhc2tpbmcgYSBjb25maXJtYXRpb24gcHJvbXB0IGJlZm9yZSBpbnN0YWxsaW5nIGFuZCBleGVjdXRpbmcgdGhlIHBhY2thZ2UuICcgK1xuICAgICAgICAgICdFbnN1cmUgcGFja2FnZSBuYW1lIGlzIGNvcnJlY3QgcHJpb3IgdG8gdXNpbmcgdGhpcyBvcHRpb24uJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAvLyBQcmlvciB0byBkb3dubG9hZGluZyB3ZSBkb24ndCBrbm93IHRoZSBmdWxsIHNjaGVtYSBhbmQgdGhlcmVmb3JlIHdlIGNhbm5vdCBiZSBzdHJpY3Qgb24gdGhlIG9wdGlvbnMuXG4gICAgICAvLyBQb3NzaWJseSBpbiB0aGUgZnV0dXJlIHVwZGF0ZSB0aGUgbG9naWMgdG8gdXNlIHRoZSBmb2xsb3dpbmcgc3ludGF4OlxuICAgICAgLy8gYG5nIGFkZCBAYW5ndWxhci9sb2NhbGl6ZSAtLSAtLXBhY2thZ2Utb3B0aW9uc2AuXG4gICAgICAuc3RyaWN0KGZhbHNlKTtcblxuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gYXdhaXQgdGhpcy5nZXRDb2xsZWN0aW9uTmFtZSgpO1xuICAgIGNvbnN0IHdvcmtmbG93ID0gYXdhaXQgdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZSk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgY29sbGVjdGlvbiA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY09wdGlvbnMoY29sbGVjdGlvbiwgdGhpcy5zY2hlbWF0aWNOYW1lLCB3b3JrZmxvdyk7XG5cbiAgICAgIHJldHVybiB0aGlzLmFkZFNjaGVtYU9wdGlvbnNUb0NvbW1hbmQobG9jYWxZYXJncywgb3B0aW9ucyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIER1cmluZyBgbmcgYWRkYCBwcmlvciB0byB0aGUgZG93bmxvYWRpbmcgb2YgdGhlIHBhY2thZ2VcbiAgICAgIC8vIHdlIGFyZSBub3QgYWJsZSB0byByZXNvbHZlIGFuZCBjcmVhdGUgYSBjb2xsZWN0aW9uLlxuICAgICAgLy8gT3Igd2hlbiB0aGUgdGhlIGNvbGxlY3Rpb24gdmFsdWUgaXMgYSBwYXRoIHRvIGEgdGFyYmFsbC5cbiAgICB9XG5cbiAgICByZXR1cm4gbG9jYWxZYXJncztcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGluZXMtcGVyLWZ1bmN0aW9uXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBPcHRpb25zPEFkZENvbW1hbmRBcmdzPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHsgcm9vdCwgbG9nZ2VyLCBwYWNrYWdlTWFuYWdlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHsgdmVyYm9zZSwgcmVnaXN0cnksIGNvbGxlY3Rpb24sIHNraXBDb25maXJtYXRpb24gfSA9IG9wdGlvbnM7XG4gICAgYXdhaXQgZW5zdXJlQ29tcGF0aWJsZU5wbShyb290KTtcblxuICAgIGxldCBwYWNrYWdlSWRlbnRpZmllcjtcbiAgICB0cnkge1xuICAgICAgcGFja2FnZUlkZW50aWZpZXIgPSBucGEoY29sbGVjdGlvbik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nZ2VyLmVycm9yKGUubWVzc2FnZSk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgIHBhY2thZ2VJZGVudGlmaWVyLm5hbWUgJiZcbiAgICAgIHBhY2thZ2VJZGVudGlmaWVyLnJlZ2lzdHJ5ICYmXG4gICAgICB0aGlzLmlzUGFja2FnZUluc3RhbGxlZChwYWNrYWdlSWRlbnRpZmllci5uYW1lKVxuICAgICkge1xuICAgICAgY29uc3QgdmFsaWRWZXJzaW9uID0gYXdhaXQgdGhpcy5pc1Byb2plY3RWZXJzaW9uVmFsaWQocGFja2FnZUlkZW50aWZpZXIpO1xuICAgICAgaWYgKHZhbGlkVmVyc2lvbikge1xuICAgICAgICAvLyBBbHJlYWR5IGluc3RhbGxlZCBzbyBqdXN0IHJ1biBzY2hlbWF0aWNcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1NraXBwaW5nIGluc3RhbGxhdGlvbjogUGFja2FnZSBhbHJlYWR5IGluc3RhbGxlZCcpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoeyAuLi5vcHRpb25zLCBjb2xsZWN0aW9uOiBwYWNrYWdlSWRlbnRpZmllci5uYW1lIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHNwaW5uZXIgPSBuZXcgU3Bpbm5lcigpO1xuXG4gICAgc3Bpbm5lci5zdGFydCgnRGV0ZXJtaW5pbmcgcGFja2FnZSBtYW5hZ2VyLi4uJyk7XG4gICAgY29uc3QgdXNpbmdZYXJuID0gcGFja2FnZU1hbmFnZXIgPT09IFBhY2thZ2VNYW5hZ2VyLllhcm47XG4gICAgc3Bpbm5lci5pbmZvKGBVc2luZyBwYWNrYWdlIG1hbmFnZXI6ICR7Y29sb3JzLmdyZXkocGFja2FnZU1hbmFnZXIpfWApO1xuXG4gICAgaWYgKHBhY2thZ2VJZGVudGlmaWVyLm5hbWUgJiYgcGFja2FnZUlkZW50aWZpZXIudHlwZSA9PT0gJ3RhZycgJiYgIXBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMpIHtcbiAgICAgIC8vIG9ubHkgcGFja2FnZSBuYW1lIHByb3ZpZGVkOyBzZWFyY2ggZm9yIHZpYWJsZSB2ZXJzaW9uXG4gICAgICAvLyBwbHVzIHNwZWNpYWwgY2FzZXMgZm9yIHBhY2thZ2VzIHRoYXQgZGlkIG5vdCBoYXZlIHBlZXIgZGVwcyBzZXR1cFxuICAgICAgc3Bpbm5lci5zdGFydCgnU2VhcmNoaW5nIGZvciBjb21wYXRpYmxlIHBhY2thZ2UgdmVyc2lvbi4uLicpO1xuXG4gICAgICBsZXQgcGFja2FnZU1ldGFkYXRhO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGFja2FnZU1ldGFkYXRhID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWV0YWRhdGEocGFja2FnZUlkZW50aWZpZXIubmFtZSwgbG9nZ2VyLCB7XG4gICAgICAgICAgcmVnaXN0cnksXG4gICAgICAgICAgdXNpbmdZYXJuLFxuICAgICAgICAgIHZlcmJvc2UsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBzcGlubmVyLmZhaWwoYFVuYWJsZSB0byBsb2FkIHBhY2thZ2UgaW5mb3JtYXRpb24gZnJvbSByZWdpc3RyeTogJHtlLm1lc3NhZ2V9YCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIFN0YXJ0IHdpdGggdGhlIHZlcnNpb24gdGFnZ2VkIGFzIGBsYXRlc3RgIGlmIGl0IGV4aXN0c1xuICAgICAgY29uc3QgbGF0ZXN0TWFuaWZlc3QgPSBwYWNrYWdlTWV0YWRhdGEudGFnc1snbGF0ZXN0J107XG4gICAgICBpZiAobGF0ZXN0TWFuaWZlc3QpIHtcbiAgICAgICAgcGFja2FnZUlkZW50aWZpZXIgPSBucGEucmVzb2x2ZShsYXRlc3RNYW5pZmVzdC5uYW1lLCBsYXRlc3RNYW5pZmVzdC52ZXJzaW9uKTtcbiAgICAgIH1cblxuICAgICAgLy8gQWRqdXN0IHRoZSB2ZXJzaW9uIGJhc2VkIG9uIG5hbWUgYW5kIHBlZXIgZGVwZW5kZW5jaWVzXG4gICAgICBpZiAobGF0ZXN0TWFuaWZlc3QgJiYgT2JqZWN0LmtleXMobGF0ZXN0TWFuaWZlc3QucGVlckRlcGVuZGVuY2llcykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHNwaW5uZXIuc3VjY2VlZChcbiAgICAgICAgICBgRm91bmQgY29tcGF0aWJsZSBwYWNrYWdlIHZlcnNpb246ICR7Y29sb3JzLmdyZXkocGFja2FnZUlkZW50aWZpZXIudG9TdHJpbmcoKSl9LmAsXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKCFsYXRlc3RNYW5pZmVzdCB8fCAoYXdhaXQgdGhpcy5oYXNNaXNtYXRjaGVkUGVlcihsYXRlc3RNYW5pZmVzdCkpKSB7XG4gICAgICAgIC8vICdsYXRlc3QnIGlzIGludmFsaWQgc28gc2VhcmNoIGZvciBtb3N0IHJlY2VudCBtYXRjaGluZyBwYWNrYWdlXG4gICAgICAgIGNvbnN0IHZlcnNpb25FeGNsdXNpb25zID0gcGFja2FnZVZlcnNpb25FeGNsdXNpb25zW3BhY2thZ2VNZXRhZGF0YS5uYW1lXTtcbiAgICAgICAgY29uc3QgdmVyc2lvbk1hbmlmZXN0cyA9IE9iamVjdC52YWx1ZXMocGFja2FnZU1ldGFkYXRhLnZlcnNpb25zKS5maWx0ZXIoXG4gICAgICAgICAgKHZhbHVlOiBQYWNrYWdlTWFuaWZlc3QpID0+IHtcbiAgICAgICAgICAgIC8vIFByZXJlbGVhc2UgdmVyc2lvbnMgYXJlIG5vdCBzdGFibGUgYW5kIHNob3VsZCBub3QgYmUgY29uc2lkZXJlZCBieSBkZWZhdWx0XG4gICAgICAgICAgICBpZiAocHJlcmVsZWFzZSh2YWx1ZS52ZXJzaW9uKSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBEZXByZWNhdGVkIHZlcnNpb25zIHNob3VsZCBub3QgYmUgdXNlZCBvciBjb25zaWRlcmVkXG4gICAgICAgICAgICBpZiAodmFsdWUuZGVwcmVjYXRlZCkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBFeGNsdWRlZCBwYWNrYWdlIHZlcnNpb25zIHNob3VsZCBub3QgYmUgY29uc2lkZXJlZFxuICAgICAgICAgICAgaWYgKHZlcnNpb25FeGNsdXNpb25zICYmIHNhdGlzZmllcyh2YWx1ZS52ZXJzaW9uLCB2ZXJzaW9uRXhjbHVzaW9ucykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9LFxuICAgICAgICApO1xuXG4gICAgICAgIHZlcnNpb25NYW5pZmVzdHMuc29ydCgoYSwgYikgPT4gY29tcGFyZShhLnZlcnNpb24sIGIudmVyc2lvbiwgdHJ1ZSkpO1xuXG4gICAgICAgIGxldCBuZXdJZGVudGlmaWVyO1xuICAgICAgICBmb3IgKGNvbnN0IHZlcnNpb25NYW5pZmVzdCBvZiB2ZXJzaW9uTWFuaWZlc3RzKSB7XG4gICAgICAgICAgaWYgKCEoYXdhaXQgdGhpcy5oYXNNaXNtYXRjaGVkUGVlcih2ZXJzaW9uTWFuaWZlc3QpKSkge1xuICAgICAgICAgICAgbmV3SWRlbnRpZmllciA9IG5wYS5yZXNvbHZlKHZlcnNpb25NYW5pZmVzdC5uYW1lLCB2ZXJzaW9uTWFuaWZlc3QudmVyc2lvbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5ld0lkZW50aWZpZXIpIHtcbiAgICAgICAgICBzcGlubmVyLndhcm4oXCJVbmFibGUgdG8gZmluZCBjb21wYXRpYmxlIHBhY2thZ2UuIFVzaW5nICdsYXRlc3QnIHRhZy5cIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFja2FnZUlkZW50aWZpZXIgPSBuZXdJZGVudGlmaWVyO1xuICAgICAgICAgIHNwaW5uZXIuc3VjY2VlZChcbiAgICAgICAgICAgIGBGb3VuZCBjb21wYXRpYmxlIHBhY2thZ2UgdmVyc2lvbjogJHtjb2xvcnMuZ3JleShwYWNrYWdlSWRlbnRpZmllci50b1N0cmluZygpKX0uYCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzcGlubmVyLnN1Y2NlZWQoXG4gICAgICAgICAgYEZvdW5kIGNvbXBhdGlibGUgcGFja2FnZSB2ZXJzaW9uOiAke2NvbG9ycy5ncmV5KHBhY2thZ2VJZGVudGlmaWVyLnRvU3RyaW5nKCkpfS5gLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBjb2xsZWN0aW9uTmFtZSA9IHBhY2thZ2VJZGVudGlmaWVyLm5hbWU7XG4gICAgbGV0IHNhdmVQYWNrYWdlOiBOZ0FkZFNhdmVEZXBlZGVuY3kgfCB1bmRlZmluZWQ7XG5cbiAgICB0cnkge1xuICAgICAgc3Bpbm5lci5zdGFydCgnTG9hZGluZyBwYWNrYWdlIGluZm9ybWF0aW9uIGZyb20gcmVnaXN0cnkuLi4nKTtcbiAgICAgIGNvbnN0IG1hbmlmZXN0ID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWFuaWZlc3QocGFja2FnZUlkZW50aWZpZXIudG9TdHJpbmcoKSwgbG9nZ2VyLCB7XG4gICAgICAgIHJlZ2lzdHJ5LFxuICAgICAgICB2ZXJib3NlLFxuICAgICAgICB1c2luZ1lhcm4sXG4gICAgICB9KTtcblxuICAgICAgc2F2ZVBhY2thZ2UgPSBtYW5pZmVzdFsnbmctYWRkJ10/LnNhdmU7XG4gICAgICBjb2xsZWN0aW9uTmFtZSA9IG1hbmlmZXN0Lm5hbWU7XG5cbiAgICAgIGlmIChhd2FpdCB0aGlzLmhhc01pc21hdGNoZWRQZWVyKG1hbmlmZXN0KSkge1xuICAgICAgICBzcGlubmVyLndhcm4oJ1BhY2thZ2UgaGFzIHVubWV0IHBlZXIgZGVwZW5kZW5jaWVzLiBBZGRpbmcgdGhlIHBhY2thZ2UgbWF5IG5vdCBzdWNjZWVkLicpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3Bpbm5lci5zdWNjZWVkKGBQYWNrYWdlIGluZm9ybWF0aW9uIGxvYWRlZC5gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBzcGlubmVyLmZhaWwoYFVuYWJsZSB0byBmZXRjaCBwYWNrYWdlIGluZm9ybWF0aW9uIGZvciAnJHtwYWNrYWdlSWRlbnRpZmllcn0nOiAke2UubWVzc2FnZX1gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgaWYgKCFza2lwQ29uZmlybWF0aW9uKSB7XG4gICAgICBjb25zdCBjb25maXJtYXRpb25SZXNwb25zZSA9IGF3YWl0IGFza0NvbmZpcm1hdGlvbihcbiAgICAgICAgYFxcblRoZSBwYWNrYWdlICR7Y29sb3JzLmJsdWUocGFja2FnZUlkZW50aWZpZXIucmF3KX0gd2lsbCBiZSBpbnN0YWxsZWQgYW5kIGV4ZWN1dGVkLlxcbmAgK1xuICAgICAgICAgICdXb3VsZCB5b3UgbGlrZSB0byBwcm9jZWVkPycsXG4gICAgICAgIHRydWUsXG4gICAgICAgIGZhbHNlLFxuICAgICAgKTtcblxuICAgICAgaWYgKCFjb25maXJtYXRpb25SZXNwb25zZSkge1xuICAgICAgICBpZiAoIWlzVFRZKCkpIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAnTm8gdGVybWluYWwgZGV0ZWN0ZWQuICcgK1xuICAgICAgICAgICAgICBgJy0tc2tpcC1jb25maXJtYXRpb24nIGNhbiBiZSB1c2VkIHRvIGJ5cGFzcyBpbnN0YWxsYXRpb24gY29uZmlybWF0aW9uLiBgICtcbiAgICAgICAgICAgICAgYEVuc3VyZSBwYWNrYWdlIG5hbWUgaXMgY29ycmVjdCBwcmlvciB0byAnLS1za2lwLWNvbmZpcm1hdGlvbicgb3B0aW9uIHVzYWdlLmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvZ2dlci5lcnJvcignQ29tbWFuZCBhYm9ydGVkLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzYXZlUGFja2FnZSA9PT0gZmFsc2UpIHtcbiAgICAgIC8vIFRlbXBvcmFyeSBwYWNrYWdlcyBhcmUgbG9jYXRlZCBpbiBhIGRpZmZlcmVudCBkaXJlY3RvcnlcbiAgICAgIC8vIEhlbmNlIHdlIG5lZWQgdG8gcmVzb2x2ZSB0aGVtIHVzaW5nIHRoZSB0ZW1wIHBhdGhcbiAgICAgIGNvbnN0IHsgc3RhdHVzLCB0ZW1wTm9kZU1vZHVsZXMgfSA9IGF3YWl0IGluc3RhbGxUZW1wUGFja2FnZShcbiAgICAgICAgcGFja2FnZUlkZW50aWZpZXIucmF3LFxuICAgICAgICBwYWNrYWdlTWFuYWdlcixcbiAgICAgICAgcmVnaXN0cnkgPyBbYC0tcmVnaXN0cnk9XCIke3JlZ2lzdHJ5fVwiYF0gOiB1bmRlZmluZWQsXG4gICAgICApO1xuICAgICAgY29uc3QgcmVzb2x2ZWRDb2xsZWN0aW9uUGF0aCA9IHJlcXVpcmUucmVzb2x2ZShqb2luKGNvbGxlY3Rpb25OYW1lLCAncGFja2FnZS5qc29uJyksIHtcbiAgICAgICAgcGF0aHM6IFt0ZW1wTm9kZU1vZHVsZXNdLFxuICAgICAgfSk7XG5cbiAgICAgIGlmIChzdGF0dXMgIT09IDApIHtcbiAgICAgICAgcmV0dXJuIHN0YXR1cztcbiAgICAgIH1cblxuICAgICAgY29sbGVjdGlvbk5hbWUgPSBkaXJuYW1lKHJlc29sdmVkQ29sbGVjdGlvblBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzdGF0dXMgPSBhd2FpdCBpbnN0YWxsUGFja2FnZShcbiAgICAgICAgcGFja2FnZUlkZW50aWZpZXIucmF3LFxuICAgICAgICBwYWNrYWdlTWFuYWdlcixcbiAgICAgICAgc2F2ZVBhY2thZ2UsXG4gICAgICAgIHJlZ2lzdHJ5ID8gW2AtLXJlZ2lzdHJ5PVwiJHtyZWdpc3RyeX1cImBdIDogdW5kZWZpbmVkLFxuICAgICAgKTtcblxuICAgICAgaWYgKHN0YXR1cyAhPT0gMCkge1xuICAgICAgICByZXR1cm4gc3RhdHVzO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoeyAuLi5vcHRpb25zLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaXNQcm9qZWN0VmVyc2lvblZhbGlkKHBhY2thZ2VJZGVudGlmaWVyOiBucGEuUmVzdWx0KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCFwYWNrYWdlSWRlbnRpZmllci5uYW1lKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IHZhbGlkVmVyc2lvbiA9IGZhbHNlO1xuICAgIGNvbnN0IGluc3RhbGxlZFZlcnNpb24gPSBhd2FpdCB0aGlzLmZpbmRQcm9qZWN0VmVyc2lvbihwYWNrYWdlSWRlbnRpZmllci5uYW1lKTtcbiAgICBpZiAoaW5zdGFsbGVkVmVyc2lvbikge1xuICAgICAgaWYgKHBhY2thZ2VJZGVudGlmaWVyLnR5cGUgPT09ICdyYW5nZScgJiYgcGFja2FnZUlkZW50aWZpZXIuZmV0Y2hTcGVjKSB7XG4gICAgICAgIHZhbGlkVmVyc2lvbiA9IHNhdGlzZmllcyhpbnN0YWxsZWRWZXJzaW9uLCBwYWNrYWdlSWRlbnRpZmllci5mZXRjaFNwZWMpO1xuICAgICAgfSBlbHNlIGlmIChwYWNrYWdlSWRlbnRpZmllci50eXBlID09PSAndmVyc2lvbicpIHtcbiAgICAgICAgY29uc3QgdjEgPSB2YWxpZChwYWNrYWdlSWRlbnRpZmllci5mZXRjaFNwZWMpO1xuICAgICAgICBjb25zdCB2MiA9IHZhbGlkKGluc3RhbGxlZFZlcnNpb24pO1xuICAgICAgICB2YWxpZFZlcnNpb24gPSB2MSAhPT0gbnVsbCAmJiB2MSA9PT0gdjI7XG4gICAgICB9IGVsc2UgaWYgKCFwYWNrYWdlSWRlbnRpZmllci5yYXdTcGVjKSB7XG4gICAgICAgIHZhbGlkVmVyc2lvbiA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbGlkVmVyc2lvbjtcbiAgfVxuXG4gIG92ZXJyaWRlIGFzeW5jIHJlcG9ydEFuYWx5dGljcyhvcHRpb25zOiBPdGhlck9wdGlvbnMsIHBhdGhzOiBzdHJpbmdbXSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSBhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25OYW1lKCk7XG4gICAgY29uc3QgZGltZW5zaW9uczogc3RyaW5nW10gPSBbXTtcbiAgICAvLyBBZGQgdGhlIGNvbGxlY3Rpb24gaWYgaXQncyBzYWZlIGxpc3RlZC5cbiAgICBpZiAoY29sbGVjdGlvbiAmJiBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyhjb2xsZWN0aW9uKSkge1xuICAgICAgZGltZW5zaW9uc1thbmFseXRpY3MuTmdDbGlBbmFseXRpY3NEaW1lbnNpb25zLk5nQWRkQ29sbGVjdGlvbl0gPSBjb2xsZWN0aW9uO1xuICAgIH1cblxuICAgIHJldHVybiBzdXBlci5yZXBvcnRBbmFseXRpY3Mob3B0aW9ucywgcGF0aHMsIGRpbWVuc2lvbnMpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRDb2xsZWN0aW9uTmFtZSgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IFssIGNvbGxlY3Rpb25OYW1lXSA9IHRoaXMuY29udGV4dC5hcmdzLnBvc2l0aW9uYWw7XG5cbiAgICByZXR1cm4gY29sbGVjdGlvbk5hbWU7XG4gIH1cblxuICBwcml2YXRlIGlzUGFja2FnZUluc3RhbGxlZChuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICB0cnkge1xuICAgICAgcmVxdWlyZS5yZXNvbHZlKGpvaW4obmFtZSwgJ3BhY2thZ2UuanNvbicpLCB7IHBhdGhzOiBbdGhpcy5jb250ZXh0LnJvb3RdIH0pO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5jb2RlICE9PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgb3B0aW9uczogT3B0aW9uczxBZGRDb21tYW5kQXJncz4gJiBPdGhlck9wdGlvbnMsXG4gICk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIHZlcmJvc2UsXG4gICAgICAgIHNraXBDb25maXJtYXRpb24sXG4gICAgICAgIGludGVyYWN0aXZlLFxuICAgICAgICBmb3JjZSxcbiAgICAgICAgZHJ5UnVuLFxuICAgICAgICByZWdpc3RyeSxcbiAgICAgICAgZGVmYXVsdHMsXG4gICAgICAgIGNvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICAuLi5zY2hlbWF0aWNPcHRpb25zXG4gICAgICB9ID0gb3B0aW9ucztcblxuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuU2NoZW1hdGljKHtcbiAgICAgICAgc2NoZW1hdGljT3B0aW9ucyxcbiAgICAgICAgc2NoZW1hdGljTmFtZTogdGhpcy5zY2hlbWF0aWNOYW1lLFxuICAgICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgZXhlY3V0aW9uT3B0aW9uczoge1xuICAgICAgICAgIGludGVyYWN0aXZlLFxuICAgICAgICAgIGZvcmNlLFxuICAgICAgICAgIGRyeVJ1bixcbiAgICAgICAgICBkZWZhdWx0cyxcbiAgICAgICAgICBwYWNrYWdlUmVnaXN0cnk6IHJlZ2lzdHJ5LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb2RlUGFja2FnZURvZXNOb3RTdXBwb3J0U2NoZW1hdGljcykge1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmVycm9yKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICBUaGUgcGFja2FnZSB0aGF0IHlvdSBhcmUgdHJ5aW5nIHRvIGFkZCBkb2VzIG5vdCBzdXBwb3J0IHNjaGVtYXRpY3MuIFlvdSBjYW4gdHJ5IHVzaW5nXG4gICAgICAgICAgYSBkaWZmZXJlbnQgdmVyc2lvbiBvZiB0aGUgcGFja2FnZSBvciBjb250YWN0IHRoZSBwYWNrYWdlIGF1dGhvciB0byBhZGQgbmctYWRkIHN1cHBvcnQuXG4gICAgICAgIGApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZmluZFByb2plY3RWZXJzaW9uKG5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyLCByb290IH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgbGV0IGluc3RhbGxlZFBhY2thZ2U7XG4gICAgdHJ5IHtcbiAgICAgIGluc3RhbGxlZFBhY2thZ2UgPSByZXF1aXJlLnJlc29sdmUoam9pbihuYW1lLCAncGFja2FnZS5qc29uJyksIHtcbiAgICAgICAgcGF0aHM6IFtyb290XSxcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2gge31cblxuICAgIGlmIChpbnN0YWxsZWRQYWNrYWdlKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBpbnN0YWxsZWQgPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChkaXJuYW1lKGluc3RhbGxlZFBhY2thZ2UpLCBsb2dnZXIpO1xuXG4gICAgICAgIHJldHVybiBpbnN0YWxsZWQudmVyc2lvbjtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICBsZXQgcHJvamVjdE1hbmlmZXN0O1xuICAgIHRyeSB7XG4gICAgICBwcm9qZWN0TWFuaWZlc3QgPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChyb290LCBsb2dnZXIpO1xuICAgIH0gY2F0Y2gge31cblxuICAgIGlmIChwcm9qZWN0TWFuaWZlc3QpIHtcbiAgICAgIGNvbnN0IHZlcnNpb24gPSBwcm9qZWN0TWFuaWZlc3QuZGVwZW5kZW5jaWVzW25hbWVdIHx8IHByb2plY3RNYW5pZmVzdC5kZXZEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICBpZiAodmVyc2lvbikge1xuICAgICAgICByZXR1cm4gdmVyc2lvbjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFzTWlzbWF0Y2hlZFBlZXIobWFuaWZlc3Q6IFBhY2thZ2VNYW5pZmVzdCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgcGVlciBpbiBtYW5pZmVzdC5wZWVyRGVwZW5kZW5jaWVzKSB7XG4gICAgICBsZXQgcGVlcklkZW50aWZpZXI7XG4gICAgICB0cnkge1xuICAgICAgICBwZWVySWRlbnRpZmllciA9IG5wYS5yZXNvbHZlKHBlZXIsIG1hbmlmZXN0LnBlZXJEZXBlbmRlbmNpZXNbcGVlcl0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2FybihgSW52YWxpZCBwZWVyIGRlcGVuZGVuY3kgJHtwZWVyfSBmb3VuZCBpbiBwYWNrYWdlLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBlZXJJZGVudGlmaWVyLnR5cGUgPT09ICd2ZXJzaW9uJyB8fCBwZWVySWRlbnRpZmllci50eXBlID09PSAncmFuZ2UnKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGF3YWl0IHRoaXMuZmluZFByb2plY3RWZXJzaW9uKHBlZXIpO1xuICAgICAgICAgIGlmICghdmVyc2lvbikge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHsgaW5jbHVkZVByZXJlbGVhc2U6IHRydWUgfTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICFpbnRlcnNlY3RzKHZlcnNpb24sIHBlZXJJZGVudGlmaWVyLnJhd1NwZWMsIG9wdGlvbnMpICYmXG4gICAgICAgICAgICAhc2F0aXNmaWVzKHZlcnNpb24sIHBlZXJJZGVudGlmaWVyLnJhd1NwZWMsIG9wdGlvbnMpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIE5vdCBmb3VuZCBvciBpbnZhbGlkIHNvIGlnbm9yZVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB0eXBlID09PSAndGFnJyB8ICdmaWxlJyB8ICdkaXJlY3RvcnknIHwgJ3JlbW90ZScgfCAnZ2l0J1xuICAgICAgICAvLyBDYW5ub3QgYWNjdXJhdGVseSBjb21wYXJlIHRoZXNlIGFzIHRoZSB0YWcvbG9jYXRpb24gbWF5IGhhdmUgY2hhbmdlZCBzaW5jZSBpbnN0YWxsXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=