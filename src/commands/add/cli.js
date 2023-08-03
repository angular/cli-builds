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
const core_1 = require("@angular-devkit/core");
const tools_1 = require("@angular-devkit/schematics/tools");
const module_1 = require("module");
const npm_package_arg_1 = __importDefault(require("npm-package-arg"));
const path_1 = require("path");
const semver_1 = require("semver");
const workspace_schema_1 = require("../../../lib/config/workspace-schema");
const schematics_command_module_1 = require("../../command-builder/schematics-command-module");
const color_1 = require("../../utilities/color");
const error_1 = require("../../utilities/error");
const package_metadata_1 = require("../../utilities/package-metadata");
const prompt_1 = require("../../utilities/prompt");
const spinner_1 = require("../../utilities/spinner");
const tty_1 = require("../../utilities/tty");
const version_1 = require("../../utilities/version");
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
class AddCommadModule extends schematics_command_module_1.SchematicsCommandModule {
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
            // Or when the collection value is a path to a tarball.
        }
        return localYargs;
    }
    // eslint-disable-next-line max-lines-per-function
    async run(options) {
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
        if (packageIdentifier.name &&
            packageIdentifier.type === 'range' &&
            packageIdentifier.rawSpec === '*') {
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
            if (latestManifest?.peerDependencies &&
                Object.keys(latestManifest.peerDependencies).length === 0) {
                spinner.succeed(`Found compatible package version: ${color_1.colors.grey(packageIdentifier.toString())}.`);
            }
            else if (!latestManifest || (await this.hasMismatchedPeer(latestManifest))) {
                // 'latest' is invalid so search for most recent matching package
                // Allow prelease versions if the CLI itself is a prerelease
                const allowPrereleases = (0, semver_1.prerelease)(version_1.VERSION.full);
                const versionExclusions = packageVersionExclusions[packageMetadata.name];
                const versionManifests = Object.values(packageMetadata.versions).filter((value) => {
                    // Prerelease versions are not stable and should not be considered by default
                    if (!allowPrereleases && (0, semver_1.prerelease)(value.version)) {
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
                // Sort in reverse SemVer order so that the newest compatible version is chosen
                versionManifests.sort((a, b) => (0, semver_1.compare)(b.version, a.version, true));
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
            savePackage = manifest['ng-add']?.save;
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
        const installedVersion = await this.findProjectVersion(packageIdentifier.name);
        if (!installedVersion) {
            return false;
        }
        if (packageIdentifier.rawSpec === '*') {
            return true;
        }
        if (packageIdentifier.type === 'range' &&
            packageIdentifier.fetchSpec &&
            packageIdentifier.fetchSpec !== '*') {
            return (0, semver_1.satisfies)(installedVersion, packageIdentifier.fetchSpec);
        }
        if (packageIdentifier.type === 'version') {
            const v1 = (0, semver_1.valid)(packageIdentifier.fetchSpec);
            const v2 = (0, semver_1.valid)(installedVersion);
            return v1 !== null && v1 === v2;
        }
        return false;
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
        const { logger, root } = this.context;
        let installedPackage;
        try {
            installedPackage = this.rootRequire.resolve((0, path_1.join)(name, 'package.json'));
        }
        catch { }
        if (installedPackage) {
            try {
                const installed = await (0, package_metadata_1.fetchPackageManifest)((0, path_1.dirname)(installedPackage), logger);
                return installed.version;
            }
            catch { }
        }
        let projectManifest;
        try {
            projectManifest = await (0, package_metadata_1.fetchPackageManifest)(root, logger);
        }
        catch { }
        if (projectManifest) {
            const version = projectManifest.dependencies?.[name] || projectManifest.devDependencies?.[name];
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
            catch {
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
                catch {
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
exports.default = AddCommadModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2FkZC9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7QUFFSCwrQ0FBNEM7QUFDNUMsNERBQXVGO0FBQ3ZGLG1DQUF1QztBQUN2QyxzRUFBa0M7QUFDbEMsK0JBQXFDO0FBQ3JDLG1DQUFrRjtBQUVsRiwyRUFBc0U7QUFNdEUsK0ZBR3lEO0FBQ3pELGlEQUErQztBQUMvQyxpREFBc0Q7QUFDdEQsdUVBSzBDO0FBQzFDLG1EQUF5RDtBQUN6RCxxREFBa0Q7QUFDbEQsNkNBQTRDO0FBQzVDLHFEQUFrRDtBQVNsRDs7OztHQUlHO0FBQ0gsTUFBTSx3QkFBd0IsR0FBbUM7SUFDL0QsZ0lBQWdJO0lBQ2hJLG1CQUFtQixFQUFFLFNBQVM7SUFDOUIsa0ZBQWtGO0lBQ2xGLG1CQUFtQixFQUFFLEtBQUs7Q0FDM0IsQ0FBQztBQUVGLE1BQXFCLGVBQ25CLFNBQVEsbURBQXVCO0lBRGpDOztRQUlFLFlBQU8sR0FBRyxrQkFBa0IsQ0FBQztRQUM3QixhQUFRLEdBQUcsdURBQXVELENBQUM7UUFDbkUsd0JBQW1CLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDMUMsMkJBQXNCLEdBQUcsSUFBSSxDQUFDO1FBQ2hDLGtCQUFhLEdBQUcsUUFBUSxDQUFDO1FBQ2xDLGdCQUFXLEdBQUcsSUFBQSxzQkFBYSxFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBOFovRCxDQUFDO0lBNVpVLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBVTtRQUMvQixNQUFNLFVBQVUsR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUMzQyxVQUFVLENBQUMsWUFB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QVM7cUJBQ1Y7b0JBRUQsTUFBTSxPQUFPLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQztvQkFFNUMsSUFDRSxDQUFDLElBQUEsbUJBQVUsRUFBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7d0JBQ3JELENBQUMsSUFBQSxrQkFBUyxFQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUNwRDt3QkFDQSxPQUFPLElBQUksQ0FBQztxQkFDYjtpQkFDRjtnQkFBQyxNQUFNO29CQUNOLGlDQUFpQztvQkFDakMsU0FBUztpQkFDVjthQUNGO2lCQUFNO2dCQUNMLDJEQUEyRDtnQkFDM0QscUZBQXFGO2FBQ3RGO1NBQ0Y7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7Q0FDRjtBQXZhRCxrQ0F1YUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlRG9lc05vdFN1cHBvcnRTY2hlbWF0aWNzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHsgY3JlYXRlUmVxdWlyZSB9IGZyb20gJ21vZHVsZSc7XG5pbXBvcnQgbnBhIGZyb20gJ25wbS1wYWNrYWdlLWFyZyc7XG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBSYW5nZSwgY29tcGFyZSwgaW50ZXJzZWN0cywgcHJlcmVsZWFzZSwgc2F0aXNmaWVzLCB2YWxpZCB9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi8uLi8uLi9saWIvY29uZmlnL3dvcmtzcGFjZS1zY2hlbWEnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBPcHRpb25zLFxuICBPdGhlck9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQge1xuICBTY2hlbWF0aWNzQ29tbWFuZEFyZ3MsXG4gIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgYXNzZXJ0SXNFcnJvciB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9lcnJvcic7XG5pbXBvcnQge1xuICBOZ0FkZFNhdmVEZXBlbmRlbmN5LFxuICBQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNZXRhZGF0YSxcbn0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWV0YWRhdGEnO1xuaW1wb3J0IHsgYXNrQ29uZmlybWF0aW9uIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3Byb21wdCc7XG5pbXBvcnQgeyBTcGlubmVyIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3NwaW5uZXInO1xuaW1wb3J0IHsgaXNUVFkgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvdHR5JztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvdmVyc2lvbic7XG5cbmludGVyZmFjZSBBZGRDb21tYW5kQXJncyBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kQXJncyB7XG4gIGNvbGxlY3Rpb246IHN0cmluZztcbiAgdmVyYm9zZT86IGJvb2xlYW47XG4gIHJlZ2lzdHJ5Pzogc3RyaW5nO1xuICAnc2tpcC1jb25maXJtYXRpb24nPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBUaGUgc2V0IG9mIHBhY2thZ2VzIHRoYXQgc2hvdWxkIGhhdmUgY2VydGFpbiB2ZXJzaW9ucyBleGNsdWRlZCBmcm9tIGNvbnNpZGVyYXRpb25cbiAqIHdoZW4gYXR0ZW1wdGluZyB0byBmaW5kIGEgY29tcGF0aWJsZSB2ZXJzaW9uIGZvciBhIHBhY2thZ2UuXG4gKiBUaGUga2V5IGlzIGEgcGFja2FnZSBuYW1lIGFuZCB0aGUgdmFsdWUgaXMgYSBTZW1WZXIgcmFuZ2Ugb2YgdmVyc2lvbnMgdG8gZXhjbHVkZS5cbiAqL1xuY29uc3QgcGFja2FnZVZlcnNpb25FeGNsdXNpb25zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBSYW5nZT4gPSB7XG4gIC8vIEBhbmd1bGFyL2xvY2FsaXplQDkueCBhbmQgZWFybGllciB2ZXJzaW9ucyBhcyB3ZWxsIGFzIEBhbmd1bGFyL2xvY2FsaXplQDEwLjAgcHJlcmVsZWFzZXMgZG8gbm90IGhhdmUgcGVlciBkZXBlbmRlbmNpZXMgc2V0dXAuXG4gICdAYW5ndWxhci9sb2NhbGl6ZSc6ICc8MTAuMC4wJyxcbiAgLy8gQGFuZ3VsYXIvbWF0ZXJpYWxANy54IHZlcnNpb25zIGhhdmUgdW5ib3VuZGVkIHBlZXIgZGVwZW5kZW5jeSByYW5nZXMgKD49Ny4wLjApLlxuICAnQGFuZ3VsYXIvbWF0ZXJpYWwnOiAnNy54Jyxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFkZENvbW1hZE1vZHVsZVxuICBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlXG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPEFkZENvbW1hbmRBcmdzPlxue1xuICBjb21tYW5kID0gJ2FkZCA8Y29sbGVjdGlvbj4nO1xuICBkZXNjcmliZSA9ICdBZGRzIHN1cHBvcnQgZm9yIGFuIGV4dGVybmFsIGxpYnJhcnkgdG8geW91ciBwcm9qZWN0Lic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSBqb2luKF9fZGlybmFtZSwgJ2xvbmctZGVzY3JpcHRpb24ubWQnKTtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIGFsbG93UHJpdmF0ZVNjaGVtYXRpY3MgPSB0cnVlO1xuICBwcml2YXRlIHJlYWRvbmx5IHNjaGVtYXRpY05hbWUgPSAnbmctYWRkJztcbiAgcHJpdmF0ZSByb290UmVxdWlyZSA9IGNyZWF0ZVJlcXVpcmUodGhpcy5jb250ZXh0LnJvb3QgKyAnLycpO1xuXG4gIG92ZXJyaWRlIGFzeW5jIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxBZGRDb21tYW5kQXJncz4+IHtcbiAgICBjb25zdCBsb2NhbFlhcmdzID0gKGF3YWl0IHN1cGVyLmJ1aWxkZXIoYXJndikpXG4gICAgICAucG9zaXRpb25hbCgnY29sbGVjdGlvbicsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgcGFja2FnZSB0byBiZSBhZGRlZC4nLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgZGVtYW5kT3B0aW9uOiB0cnVlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ3JlZ2lzdHJ5JywgeyBkZXNjcmlwdGlvbjogJ1RoZSBOUE0gcmVnaXN0cnkgdG8gdXNlLicsIHR5cGU6ICdzdHJpbmcnIH0pXG4gICAgICAub3B0aW9uKCd2ZXJib3NlJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ0Rpc3BsYXkgYWRkaXRpb25hbCBkZXRhaWxzIGFib3V0IGludGVybmFsIG9wZXJhdGlvbnMgZHVyaW5nIGV4ZWN1dGlvbi4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ3NraXAtY29uZmlybWF0aW9uJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAnU2tpcCBhc2tpbmcgYSBjb25maXJtYXRpb24gcHJvbXB0IGJlZm9yZSBpbnN0YWxsaW5nIGFuZCBleGVjdXRpbmcgdGhlIHBhY2thZ2UuICcgK1xuICAgICAgICAgICdFbnN1cmUgcGFja2FnZSBuYW1lIGlzIGNvcnJlY3QgcHJpb3IgdG8gdXNpbmcgdGhpcyBvcHRpb24uJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAvLyBQcmlvciB0byBkb3dubG9hZGluZyB3ZSBkb24ndCBrbm93IHRoZSBmdWxsIHNjaGVtYSBhbmQgdGhlcmVmb3JlIHdlIGNhbm5vdCBiZSBzdHJpY3Qgb24gdGhlIG9wdGlvbnMuXG4gICAgICAvLyBQb3NzaWJseSBpbiB0aGUgZnV0dXJlIHVwZGF0ZSB0aGUgbG9naWMgdG8gdXNlIHRoZSBmb2xsb3dpbmcgc3ludGF4OlxuICAgICAgLy8gYG5nIGFkZCBAYW5ndWxhci9sb2NhbGl6ZSAtLSAtLXBhY2thZ2Utb3B0aW9uc2AuXG4gICAgICAuc3RyaWN0KGZhbHNlKTtcblxuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gYXdhaXQgdGhpcy5nZXRDb2xsZWN0aW9uTmFtZSgpO1xuICAgIGNvbnN0IHdvcmtmbG93ID0gYXdhaXQgdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZSk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgY29sbGVjdGlvbiA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY09wdGlvbnMoY29sbGVjdGlvbiwgdGhpcy5zY2hlbWF0aWNOYW1lLCB3b3JrZmxvdyk7XG5cbiAgICAgIHJldHVybiB0aGlzLmFkZFNjaGVtYU9wdGlvbnNUb0NvbW1hbmQobG9jYWxZYXJncywgb3B0aW9ucyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIER1cmluZyBgbmcgYWRkYCBwcmlvciB0byB0aGUgZG93bmxvYWRpbmcgb2YgdGhlIHBhY2thZ2VcbiAgICAgIC8vIHdlIGFyZSBub3QgYWJsZSB0byByZXNvbHZlIGFuZCBjcmVhdGUgYSBjb2xsZWN0aW9uLlxuICAgICAgLy8gT3Igd2hlbiB0aGUgY29sbGVjdGlvbiB2YWx1ZSBpcyBhIHBhdGggdG8gYSB0YXJiYWxsLlxuICAgIH1cblxuICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICB9XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lcy1wZXItZnVuY3Rpb25cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8QWRkQ29tbWFuZEFyZ3M+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgY29uc3QgeyBsb2dnZXIsIHBhY2thZ2VNYW5hZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgeyB2ZXJib3NlLCByZWdpc3RyeSwgY29sbGVjdGlvbiwgc2tpcENvbmZpcm1hdGlvbiB9ID0gb3B0aW9ucztcbiAgICBwYWNrYWdlTWFuYWdlci5lbnN1cmVDb21wYXRpYmlsaXR5KCk7XG5cbiAgICBsZXQgcGFja2FnZUlkZW50aWZpZXI7XG4gICAgdHJ5IHtcbiAgICAgIHBhY2thZ2VJZGVudGlmaWVyID0gbnBhKGNvbGxlY3Rpb24pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICBsb2dnZXIuZXJyb3IoZS5tZXNzYWdlKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgcGFja2FnZUlkZW50aWZpZXIubmFtZSAmJlxuICAgICAgcGFja2FnZUlkZW50aWZpZXIucmVnaXN0cnkgJiZcbiAgICAgIHRoaXMuaXNQYWNrYWdlSW5zdGFsbGVkKHBhY2thZ2VJZGVudGlmaWVyLm5hbWUpXG4gICAgKSB7XG4gICAgICBjb25zdCB2YWxpZFZlcnNpb24gPSBhd2FpdCB0aGlzLmlzUHJvamVjdFZlcnNpb25WYWxpZChwYWNrYWdlSWRlbnRpZmllcik7XG4gICAgICBpZiAodmFsaWRWZXJzaW9uKSB7XG4gICAgICAgIC8vIEFscmVhZHkgaW5zdGFsbGVkIHNvIGp1c3QgcnVuIHNjaGVtYXRpY1xuICAgICAgICBsb2dnZXIuaW5mbygnU2tpcHBpbmcgaW5zdGFsbGF0aW9uOiBQYWNrYWdlIGFscmVhZHkgaW5zdGFsbGVkJyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyh7IC4uLm9wdGlvbnMsIGNvbGxlY3Rpb246IHBhY2thZ2VJZGVudGlmaWVyLm5hbWUgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgc3Bpbm5lciA9IG5ldyBTcGlubmVyKCk7XG5cbiAgICBzcGlubmVyLnN0YXJ0KCdEZXRlcm1pbmluZyBwYWNrYWdlIG1hbmFnZXIuLi4nKTtcbiAgICBjb25zdCB1c2luZ1lhcm4gPSBwYWNrYWdlTWFuYWdlci5uYW1lID09PSBQYWNrYWdlTWFuYWdlci5ZYXJuO1xuICAgIHNwaW5uZXIuaW5mbyhgVXNpbmcgcGFja2FnZSBtYW5hZ2VyOiAke2NvbG9ycy5ncmV5KHBhY2thZ2VNYW5hZ2VyLm5hbWUpfWApO1xuXG4gICAgaWYgKFxuICAgICAgcGFja2FnZUlkZW50aWZpZXIubmFtZSAmJlxuICAgICAgcGFja2FnZUlkZW50aWZpZXIudHlwZSA9PT0gJ3JhbmdlJyAmJlxuICAgICAgcGFja2FnZUlkZW50aWZpZXIucmF3U3BlYyA9PT0gJyonXG4gICAgKSB7XG4gICAgICAvLyBvbmx5IHBhY2thZ2UgbmFtZSBwcm92aWRlZDsgc2VhcmNoIGZvciB2aWFibGUgdmVyc2lvblxuICAgICAgLy8gcGx1cyBzcGVjaWFsIGNhc2VzIGZvciBwYWNrYWdlcyB0aGF0IGRpZCBub3QgaGF2ZSBwZWVyIGRlcHMgc2V0dXBcbiAgICAgIHNwaW5uZXIuc3RhcnQoJ1NlYXJjaGluZyBmb3IgY29tcGF0aWJsZSBwYWNrYWdlIHZlcnNpb24uLi4nKTtcblxuICAgICAgbGV0IHBhY2thZ2VNZXRhZGF0YTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHBhY2thZ2VNZXRhZGF0YSA9IGF3YWl0IGZldGNoUGFja2FnZU1ldGFkYXRhKHBhY2thZ2VJZGVudGlmaWVyLm5hbWUsIGxvZ2dlciwge1xuICAgICAgICAgIHJlZ2lzdHJ5LFxuICAgICAgICAgIHVzaW5nWWFybixcbiAgICAgICAgICB2ZXJib3NlLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgc3Bpbm5lci5mYWlsKGBVbmFibGUgdG8gbG9hZCBwYWNrYWdlIGluZm9ybWF0aW9uIGZyb20gcmVnaXN0cnk6ICR7ZS5tZXNzYWdlfWApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICAvLyBTdGFydCB3aXRoIHRoZSB2ZXJzaW9uIHRhZ2dlZCBhcyBgbGF0ZXN0YCBpZiBpdCBleGlzdHNcbiAgICAgIGNvbnN0IGxhdGVzdE1hbmlmZXN0ID0gcGFja2FnZU1ldGFkYXRhLnRhZ3NbJ2xhdGVzdCddO1xuICAgICAgaWYgKGxhdGVzdE1hbmlmZXN0KSB7XG4gICAgICAgIHBhY2thZ2VJZGVudGlmaWVyID0gbnBhLnJlc29sdmUobGF0ZXN0TWFuaWZlc3QubmFtZSwgbGF0ZXN0TWFuaWZlc3QudmVyc2lvbik7XG4gICAgICB9XG5cbiAgICAgIC8vIEFkanVzdCB0aGUgdmVyc2lvbiBiYXNlZCBvbiBuYW1lIGFuZCBwZWVyIGRlcGVuZGVuY2llc1xuICAgICAgaWYgKFxuICAgICAgICBsYXRlc3RNYW5pZmVzdD8ucGVlckRlcGVuZGVuY2llcyAmJlxuICAgICAgICBPYmplY3Qua2V5cyhsYXRlc3RNYW5pZmVzdC5wZWVyRGVwZW5kZW5jaWVzKS5sZW5ndGggPT09IDBcbiAgICAgICkge1xuICAgICAgICBzcGlubmVyLnN1Y2NlZWQoXG4gICAgICAgICAgYEZvdW5kIGNvbXBhdGlibGUgcGFja2FnZSB2ZXJzaW9uOiAke2NvbG9ycy5ncmV5KHBhY2thZ2VJZGVudGlmaWVyLnRvU3RyaW5nKCkpfS5gLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIGlmICghbGF0ZXN0TWFuaWZlc3QgfHwgKGF3YWl0IHRoaXMuaGFzTWlzbWF0Y2hlZFBlZXIobGF0ZXN0TWFuaWZlc3QpKSkge1xuICAgICAgICAvLyAnbGF0ZXN0JyBpcyBpbnZhbGlkIHNvIHNlYXJjaCBmb3IgbW9zdCByZWNlbnQgbWF0Y2hpbmcgcGFja2FnZVxuXG4gICAgICAgIC8vIEFsbG93IHByZWxlYXNlIHZlcnNpb25zIGlmIHRoZSBDTEkgaXRzZWxmIGlzIGEgcHJlcmVsZWFzZVxuICAgICAgICBjb25zdCBhbGxvd1ByZXJlbGVhc2VzID0gcHJlcmVsZWFzZShWRVJTSU9OLmZ1bGwpO1xuXG4gICAgICAgIGNvbnN0IHZlcnNpb25FeGNsdXNpb25zID0gcGFja2FnZVZlcnNpb25FeGNsdXNpb25zW3BhY2thZ2VNZXRhZGF0YS5uYW1lXTtcbiAgICAgICAgY29uc3QgdmVyc2lvbk1hbmlmZXN0cyA9IE9iamVjdC52YWx1ZXMocGFja2FnZU1ldGFkYXRhLnZlcnNpb25zKS5maWx0ZXIoXG4gICAgICAgICAgKHZhbHVlOiBQYWNrYWdlTWFuaWZlc3QpID0+IHtcbiAgICAgICAgICAgIC8vIFByZXJlbGVhc2UgdmVyc2lvbnMgYXJlIG5vdCBzdGFibGUgYW5kIHNob3VsZCBub3QgYmUgY29uc2lkZXJlZCBieSBkZWZhdWx0XG4gICAgICAgICAgICBpZiAoIWFsbG93UHJlcmVsZWFzZXMgJiYgcHJlcmVsZWFzZSh2YWx1ZS52ZXJzaW9uKSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBEZXByZWNhdGVkIHZlcnNpb25zIHNob3VsZCBub3QgYmUgdXNlZCBvciBjb25zaWRlcmVkXG4gICAgICAgICAgICBpZiAodmFsdWUuZGVwcmVjYXRlZCkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBFeGNsdWRlZCBwYWNrYWdlIHZlcnNpb25zIHNob3VsZCBub3QgYmUgY29uc2lkZXJlZFxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICB2ZXJzaW9uRXhjbHVzaW9ucyAmJlxuICAgICAgICAgICAgICBzYXRpc2ZpZXModmFsdWUudmVyc2lvbiwgdmVyc2lvbkV4Y2x1c2lvbnMsIHsgaW5jbHVkZVByZXJlbGVhc2U6IHRydWUgfSlcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH0sXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gU29ydCBpbiByZXZlcnNlIFNlbVZlciBvcmRlciBzbyB0aGF0IHRoZSBuZXdlc3QgY29tcGF0aWJsZSB2ZXJzaW9uIGlzIGNob3NlblxuICAgICAgICB2ZXJzaW9uTWFuaWZlc3RzLnNvcnQoKGEsIGIpID0+IGNvbXBhcmUoYi52ZXJzaW9uLCBhLnZlcnNpb24sIHRydWUpKTtcblxuICAgICAgICBsZXQgbmV3SWRlbnRpZmllcjtcbiAgICAgICAgZm9yIChjb25zdCB2ZXJzaW9uTWFuaWZlc3Qgb2YgdmVyc2lvbk1hbmlmZXN0cykge1xuICAgICAgICAgIGlmICghKGF3YWl0IHRoaXMuaGFzTWlzbWF0Y2hlZFBlZXIodmVyc2lvbk1hbmlmZXN0KSkpIHtcbiAgICAgICAgICAgIG5ld0lkZW50aWZpZXIgPSBucGEucmVzb2x2ZSh2ZXJzaW9uTWFuaWZlc3QubmFtZSwgdmVyc2lvbk1hbmlmZXN0LnZlcnNpb24pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFuZXdJZGVudGlmaWVyKSB7XG4gICAgICAgICAgc3Bpbm5lci53YXJuKFwiVW5hYmxlIHRvIGZpbmQgY29tcGF0aWJsZSBwYWNrYWdlLiBVc2luZyAnbGF0ZXN0JyB0YWcuXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhY2thZ2VJZGVudGlmaWVyID0gbmV3SWRlbnRpZmllcjtcbiAgICAgICAgICBzcGlubmVyLnN1Y2NlZWQoXG4gICAgICAgICAgICBgRm91bmQgY29tcGF0aWJsZSBwYWNrYWdlIHZlcnNpb246ICR7Y29sb3JzLmdyZXkocGFja2FnZUlkZW50aWZpZXIudG9TdHJpbmcoKSl9LmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3Bpbm5lci5zdWNjZWVkKFxuICAgICAgICAgIGBGb3VuZCBjb21wYXRpYmxlIHBhY2thZ2UgdmVyc2lvbjogJHtjb2xvcnMuZ3JleShwYWNrYWdlSWRlbnRpZmllci50b1N0cmluZygpKX0uYCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgY29sbGVjdGlvbk5hbWUgPSBwYWNrYWdlSWRlbnRpZmllci5uYW1lO1xuICAgIGxldCBzYXZlUGFja2FnZTogTmdBZGRTYXZlRGVwZW5kZW5jeSB8IHVuZGVmaW5lZDtcblxuICAgIHRyeSB7XG4gICAgICBzcGlubmVyLnN0YXJ0KCdMb2FkaW5nIHBhY2thZ2UgaW5mb3JtYXRpb24gZnJvbSByZWdpc3RyeS4uLicpO1xuICAgICAgY29uc3QgbWFuaWZlc3QgPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChwYWNrYWdlSWRlbnRpZmllci50b1N0cmluZygpLCBsb2dnZXIsIHtcbiAgICAgICAgcmVnaXN0cnksXG4gICAgICAgIHZlcmJvc2UsXG4gICAgICAgIHVzaW5nWWFybixcbiAgICAgIH0pO1xuXG4gICAgICBzYXZlUGFja2FnZSA9IG1hbmlmZXN0WyduZy1hZGQnXT8uc2F2ZTtcbiAgICAgIGNvbGxlY3Rpb25OYW1lID0gbWFuaWZlc3QubmFtZTtcblxuICAgICAgaWYgKGF3YWl0IHRoaXMuaGFzTWlzbWF0Y2hlZFBlZXIobWFuaWZlc3QpKSB7XG4gICAgICAgIHNwaW5uZXIud2FybignUGFja2FnZSBoYXMgdW5tZXQgcGVlciBkZXBlbmRlbmNpZXMuIEFkZGluZyB0aGUgcGFja2FnZSBtYXkgbm90IHN1Y2NlZWQuJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzcGlubmVyLnN1Y2NlZWQoYFBhY2thZ2UgaW5mb3JtYXRpb24gbG9hZGVkLmApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICBzcGlubmVyLmZhaWwoYFVuYWJsZSB0byBmZXRjaCBwYWNrYWdlIGluZm9ybWF0aW9uIGZvciAnJHtwYWNrYWdlSWRlbnRpZmllcn0nOiAke2UubWVzc2FnZX1gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgaWYgKCFza2lwQ29uZmlybWF0aW9uKSB7XG4gICAgICBjb25zdCBjb25maXJtYXRpb25SZXNwb25zZSA9IGF3YWl0IGFza0NvbmZpcm1hdGlvbihcbiAgICAgICAgYFxcblRoZSBwYWNrYWdlICR7Y29sb3JzLmJsdWUocGFja2FnZUlkZW50aWZpZXIucmF3KX0gd2lsbCBiZSBpbnN0YWxsZWQgYW5kIGV4ZWN1dGVkLlxcbmAgK1xuICAgICAgICAgICdXb3VsZCB5b3UgbGlrZSB0byBwcm9jZWVkPycsXG4gICAgICAgIHRydWUsXG4gICAgICAgIGZhbHNlLFxuICAgICAgKTtcblxuICAgICAgaWYgKCFjb25maXJtYXRpb25SZXNwb25zZSkge1xuICAgICAgICBpZiAoIWlzVFRZKCkpIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAnTm8gdGVybWluYWwgZGV0ZWN0ZWQuICcgK1xuICAgICAgICAgICAgICBgJy0tc2tpcC1jb25maXJtYXRpb24nIGNhbiBiZSB1c2VkIHRvIGJ5cGFzcyBpbnN0YWxsYXRpb24gY29uZmlybWF0aW9uLiBgICtcbiAgICAgICAgICAgICAgYEVuc3VyZSBwYWNrYWdlIG5hbWUgaXMgY29ycmVjdCBwcmlvciB0byAnLS1za2lwLWNvbmZpcm1hdGlvbicgb3B0aW9uIHVzYWdlLmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvZ2dlci5lcnJvcignQ29tbWFuZCBhYm9ydGVkLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzYXZlUGFja2FnZSA9PT0gZmFsc2UpIHtcbiAgICAgIC8vIFRlbXBvcmFyeSBwYWNrYWdlcyBhcmUgbG9jYXRlZCBpbiBhIGRpZmZlcmVudCBkaXJlY3RvcnlcbiAgICAgIC8vIEhlbmNlIHdlIG5lZWQgdG8gcmVzb2x2ZSB0aGVtIHVzaW5nIHRoZSB0ZW1wIHBhdGhcbiAgICAgIGNvbnN0IHsgc3VjY2VzcywgdGVtcE5vZGVNb2R1bGVzIH0gPSBhd2FpdCBwYWNrYWdlTWFuYWdlci5pbnN0YWxsVGVtcChcbiAgICAgICAgcGFja2FnZUlkZW50aWZpZXIucmF3LFxuICAgICAgICByZWdpc3RyeSA/IFtgLS1yZWdpc3RyeT1cIiR7cmVnaXN0cnl9XCJgXSA6IHVuZGVmaW5lZCxcbiAgICAgICk7XG4gICAgICBjb25zdCB0ZW1wUmVxdWlyZSA9IGNyZWF0ZVJlcXVpcmUodGVtcE5vZGVNb2R1bGVzICsgJy8nKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkQ29sbGVjdGlvblBhdGggPSB0ZW1wUmVxdWlyZS5yZXNvbHZlKGpvaW4oY29sbGVjdGlvbk5hbWUsICdwYWNrYWdlLmpzb24nKSk7XG5cbiAgICAgIGlmICghc3VjY2Vzcykge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgY29sbGVjdGlvbk5hbWUgPSBkaXJuYW1lKHJlc29sdmVkQ29sbGVjdGlvblBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzdWNjZXNzID0gYXdhaXQgcGFja2FnZU1hbmFnZXIuaW5zdGFsbChcbiAgICAgICAgcGFja2FnZUlkZW50aWZpZXIucmF3LFxuICAgICAgICBzYXZlUGFja2FnZSxcbiAgICAgICAgcmVnaXN0cnkgPyBbYC0tcmVnaXN0cnk9XCIke3JlZ2lzdHJ5fVwiYF0gOiB1bmRlZmluZWQsXG4gICAgICApO1xuXG4gICAgICBpZiAoIXN1Y2Nlc3MpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyh7IC4uLm9wdGlvbnMsIGNvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBpc1Byb2plY3RWZXJzaW9uVmFsaWQocGFja2FnZUlkZW50aWZpZXI6IG5wYS5SZXN1bHQpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIXBhY2thZ2VJZGVudGlmaWVyLm5hbWUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBpbnN0YWxsZWRWZXJzaW9uID0gYXdhaXQgdGhpcy5maW5kUHJvamVjdFZlcnNpb24ocGFja2FnZUlkZW50aWZpZXIubmFtZSk7XG4gICAgaWYgKCFpbnN0YWxsZWRWZXJzaW9uKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKHBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMgPT09ICcqJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgcGFja2FnZUlkZW50aWZpZXIudHlwZSA9PT0gJ3JhbmdlJyAmJlxuICAgICAgcGFja2FnZUlkZW50aWZpZXIuZmV0Y2hTcGVjICYmXG4gICAgICBwYWNrYWdlSWRlbnRpZmllci5mZXRjaFNwZWMgIT09ICcqJ1xuICAgICkge1xuICAgICAgcmV0dXJuIHNhdGlzZmllcyhpbnN0YWxsZWRWZXJzaW9uLCBwYWNrYWdlSWRlbnRpZmllci5mZXRjaFNwZWMpO1xuICAgIH1cblxuICAgIGlmIChwYWNrYWdlSWRlbnRpZmllci50eXBlID09PSAndmVyc2lvbicpIHtcbiAgICAgIGNvbnN0IHYxID0gdmFsaWQocGFja2FnZUlkZW50aWZpZXIuZmV0Y2hTcGVjKTtcbiAgICAgIGNvbnN0IHYyID0gdmFsaWQoaW5zdGFsbGVkVmVyc2lvbik7XG5cbiAgICAgIHJldHVybiB2MSAhPT0gbnVsbCAmJiB2MSA9PT0gdjI7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRDb2xsZWN0aW9uTmFtZSgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IFssIGNvbGxlY3Rpb25OYW1lXSA9IHRoaXMuY29udGV4dC5hcmdzLnBvc2l0aW9uYWw7XG5cbiAgICByZXR1cm4gY29sbGVjdGlvbk5hbWU7XG4gIH1cblxuICBwcml2YXRlIGlzUGFja2FnZUluc3RhbGxlZChuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICB0cnkge1xuICAgICAgdGhpcy5yb290UmVxdWlyZS5yZXNvbHZlKGpvaW4obmFtZSwgJ3BhY2thZ2UuanNvbicpKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgIGlmIChlLmNvZGUgIT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICBvcHRpb25zOiBPcHRpb25zPEFkZENvbW1hbmRBcmdzPiAmIE90aGVyT3B0aW9ucyxcbiAgKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgc2tpcENvbmZpcm1hdGlvbixcbiAgICAgICAgaW50ZXJhY3RpdmUsXG4gICAgICAgIGZvcmNlLFxuICAgICAgICBkcnlSdW4sXG4gICAgICAgIHJlZ2lzdHJ5LFxuICAgICAgICBkZWZhdWx0cyxcbiAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIC4uLnNjaGVtYXRpY09wdGlvbnNcbiAgICAgIH0gPSBvcHRpb25zO1xuXG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5ydW5TY2hlbWF0aWMoe1xuICAgICAgICBzY2hlbWF0aWNPcHRpb25zLFxuICAgICAgICBzY2hlbWF0aWNOYW1lOiB0aGlzLnNjaGVtYXRpY05hbWUsXG4gICAgICAgIGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICBleGVjdXRpb25PcHRpb25zOiB7XG4gICAgICAgICAgaW50ZXJhY3RpdmUsXG4gICAgICAgICAgZm9yY2UsXG4gICAgICAgICAgZHJ5UnVuLFxuICAgICAgICAgIGRlZmF1bHRzLFxuICAgICAgICAgIHBhY2thZ2VSZWdpc3RyeTogcmVnaXN0cnksXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE5vZGVQYWNrYWdlRG9lc05vdFN1cHBvcnRTY2hlbWF0aWNzKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuZXJyb3IodGFncy5vbmVMaW5lYFxuICAgICAgICAgIFRoZSBwYWNrYWdlIHRoYXQgeW91IGFyZSB0cnlpbmcgdG8gYWRkIGRvZXMgbm90IHN1cHBvcnQgc2NoZW1hdGljcy4gWW91IGNhbiB0cnkgdXNpbmdcbiAgICAgICAgICBhIGRpZmZlcmVudCB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIG9yIGNvbnRhY3QgdGhlIHBhY2thZ2UgYXV0aG9yIHRvIGFkZCBuZy1hZGQgc3VwcG9ydC5cbiAgICAgICAgYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmaW5kUHJvamVjdFZlcnNpb24obmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgeyBsb2dnZXIsIHJvb3QgfSA9IHRoaXMuY29udGV4dDtcbiAgICBsZXQgaW5zdGFsbGVkUGFja2FnZTtcbiAgICB0cnkge1xuICAgICAgaW5zdGFsbGVkUGFja2FnZSA9IHRoaXMucm9vdFJlcXVpcmUucmVzb2x2ZShqb2luKG5hbWUsICdwYWNrYWdlLmpzb24nKSk7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgaWYgKGluc3RhbGxlZFBhY2thZ2UpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGluc3RhbGxlZCA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KGRpcm5hbWUoaW5zdGFsbGVkUGFja2FnZSksIGxvZ2dlcik7XG5cbiAgICAgICAgcmV0dXJuIGluc3RhbGxlZC52ZXJzaW9uO1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cblxuICAgIGxldCBwcm9qZWN0TWFuaWZlc3Q7XG4gICAgdHJ5IHtcbiAgICAgIHByb2plY3RNYW5pZmVzdCA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KHJvb3QsIGxvZ2dlcik7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgaWYgKHByb2plY3RNYW5pZmVzdCkge1xuICAgICAgY29uc3QgdmVyc2lvbiA9XG4gICAgICAgIHByb2plY3RNYW5pZmVzdC5kZXBlbmRlbmNpZXM/LltuYW1lXSB8fCBwcm9qZWN0TWFuaWZlc3QuZGV2RGVwZW5kZW5jaWVzPy5bbmFtZV07XG4gICAgICBpZiAodmVyc2lvbikge1xuICAgICAgICByZXR1cm4gdmVyc2lvbjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFzTWlzbWF0Y2hlZFBlZXIobWFuaWZlc3Q6IFBhY2thZ2VNYW5pZmVzdCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgcGVlciBpbiBtYW5pZmVzdC5wZWVyRGVwZW5kZW5jaWVzKSB7XG4gICAgICBsZXQgcGVlcklkZW50aWZpZXI7XG4gICAgICB0cnkge1xuICAgICAgICBwZWVySWRlbnRpZmllciA9IG5wYS5yZXNvbHZlKHBlZXIsIG1hbmlmZXN0LnBlZXJEZXBlbmRlbmNpZXNbcGVlcl0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2FybihgSW52YWxpZCBwZWVyIGRlcGVuZGVuY3kgJHtwZWVyfSBmb3VuZCBpbiBwYWNrYWdlLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBlZXJJZGVudGlmaWVyLnR5cGUgPT09ICd2ZXJzaW9uJyB8fCBwZWVySWRlbnRpZmllci50eXBlID09PSAncmFuZ2UnKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGF3YWl0IHRoaXMuZmluZFByb2plY3RWZXJzaW9uKHBlZXIpO1xuICAgICAgICAgIGlmICghdmVyc2lvbikge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHsgaW5jbHVkZVByZXJlbGVhc2U6IHRydWUgfTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICFpbnRlcnNlY3RzKHZlcnNpb24sIHBlZXJJZGVudGlmaWVyLnJhd1NwZWMsIG9wdGlvbnMpICYmXG4gICAgICAgICAgICAhc2F0aXNmaWVzKHZlcnNpb24sIHBlZXJJZGVudGlmaWVyLnJhd1NwZWMsIG9wdGlvbnMpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIE5vdCBmb3VuZCBvciBpbnZhbGlkIHNvIGlnbm9yZVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB0eXBlID09PSAndGFnJyB8ICdmaWxlJyB8ICdkaXJlY3RvcnknIHwgJ3JlbW90ZScgfCAnZ2l0J1xuICAgICAgICAvLyBDYW5ub3QgYWNjdXJhdGVseSBjb21wYXJlIHRoZXNlIGFzIHRoZSB0YWcvbG9jYXRpb24gbWF5IGhhdmUgY2hhbmdlZCBzaW5jZSBpbnN0YWxsXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=