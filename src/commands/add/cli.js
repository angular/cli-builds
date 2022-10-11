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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2FkZC9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7O0FBRUgsK0NBQTRDO0FBQzVDLDREQUF1RjtBQUN2RixtQ0FBdUM7QUFDdkMsc0VBQWtDO0FBQ2xDLCtCQUFxQztBQUNyQyxtQ0FBMkU7QUFFM0UsMkVBQXNFO0FBTXRFLCtGQUd5RDtBQUN6RCxpREFBK0M7QUFDL0MsaURBQXNEO0FBQ3RELHVFQUswQztBQUMxQyxtREFBeUQ7QUFDekQscURBQWtEO0FBQ2xELDZDQUE0QztBQVM1Qzs7OztHQUlHO0FBQ0gsTUFBTSx3QkFBd0IsR0FBdUM7SUFDbkUscUVBQXFFO0lBQ3JFLG1CQUFtQixFQUFFLEtBQUs7Q0FDM0IsQ0FBQztBQUVGLE1BQWEsZ0JBQ1gsU0FBUSxtREFBdUI7SUFEakM7O1FBSUUsWUFBTyxHQUFHLGtCQUFrQixDQUFDO1FBQzdCLGFBQVEsR0FBRyx1REFBdUQsQ0FBQztRQUNuRSx3QkFBbUIsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUMxQywyQkFBc0IsR0FBRyxJQUFJLENBQUM7UUFDaEMsa0JBQWEsR0FBRyxRQUFRLENBQUM7UUFDbEMsZ0JBQVcsR0FBRyxJQUFBLHNCQUFhLEVBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7SUF3WS9ELENBQUM7SUF0WVUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFVO1FBQy9CLE1BQU0sVUFBVSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzNDLFVBQVUsQ0FBQyxZQUFZLEVBQUU7WUFDeEIsV0FBVyxFQUFFLDBCQUEwQjtZQUN2QyxJQUFJLEVBQUUsUUFB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QUFPLEVBQUUsY0FBYyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFDcEQ7d0JBQ0EsT0FBTyxJQUFJLENBQUM7cUJBQ2I7aUJBQ0Y7Z0JBQUMsV0FBTTtvQkFDTixpQ0FBaUM7b0JBQ2pDLFNBQVM7aUJBQ1Y7YUFDRjtpQkFBTTtnQkFDTCwyREFBMkQ7Z0JBQzNELHFGQUFxRjthQUN0RjtTQUNGO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0NBQ0Y7QUFqWkQsNENBaVpDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZURvZXNOb3RTdXBwb3J0U2NoZW1hdGljcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB7IGNyZWF0ZVJlcXVpcmUgfSBmcm9tICdtb2R1bGUnO1xuaW1wb3J0IG5wYSBmcm9tICducG0tcGFja2FnZS1hcmcnO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgY29tcGFyZSwgaW50ZXJzZWN0cywgcHJlcmVsZWFzZSwgc2F0aXNmaWVzLCB2YWxpZCB9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi8uLi8uLi9saWIvY29uZmlnL3dvcmtzcGFjZS1zY2hlbWEnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBPcHRpb25zLFxuICBPdGhlck9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQge1xuICBTY2hlbWF0aWNzQ29tbWFuZEFyZ3MsXG4gIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgYXNzZXJ0SXNFcnJvciB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9lcnJvcic7XG5pbXBvcnQge1xuICBOZ0FkZFNhdmVEZXBlbmRlbmN5LFxuICBQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNZXRhZGF0YSxcbn0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWV0YWRhdGEnO1xuaW1wb3J0IHsgYXNrQ29uZmlybWF0aW9uIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3Byb21wdCc7XG5pbXBvcnQgeyBTcGlubmVyIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3NwaW5uZXInO1xuaW1wb3J0IHsgaXNUVFkgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvdHR5JztcblxuaW50ZXJmYWNlIEFkZENvbW1hbmRBcmdzIGV4dGVuZHMgU2NoZW1hdGljc0NvbW1hbmRBcmdzIHtcbiAgY29sbGVjdGlvbjogc3RyaW5nO1xuICB2ZXJib3NlPzogYm9vbGVhbjtcbiAgcmVnaXN0cnk/OiBzdHJpbmc7XG4gICdza2lwLWNvbmZpcm1hdGlvbic/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRoZSBzZXQgb2YgcGFja2FnZXMgdGhhdCBzaG91bGQgaGF2ZSBjZXJ0YWluIHZlcnNpb25zIGV4Y2x1ZGVkIGZyb20gY29uc2lkZXJhdGlvblxuICogd2hlbiBhdHRlbXB0aW5nIHRvIGZpbmQgYSBjb21wYXRpYmxlIHZlcnNpb24gZm9yIGEgcGFja2FnZS5cbiAqIFRoZSBrZXkgaXMgYSBwYWNrYWdlIG5hbWUgYW5kIHRoZSB2YWx1ZSBpcyBhIFNlbVZlciByYW5nZSBvZiB2ZXJzaW9ucyB0byBleGNsdWRlLlxuICovXG5jb25zdCBwYWNrYWdlVmVyc2lvbkV4Y2x1c2lvbnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IHVuZGVmaW5lZD4gPSB7XG4gIC8vIEBhbmd1bGFyL2xvY2FsaXplQDkueCB2ZXJzaW9ucyBkbyBub3QgaGF2ZSBwZWVyIGRlcGVuZGVuY2llcyBzZXR1cFxuICAnQGFuZ3VsYXIvbG9jYWxpemUnOiAnOS54Jyxcbn07XG5cbmV4cG9ydCBjbGFzcyBBZGRDb21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGVcbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248QWRkQ29tbWFuZEFyZ3M+XG57XG4gIGNvbW1hbmQgPSAnYWRkIDxjb2xsZWN0aW9uPic7XG4gIGRlc2NyaWJlID0gJ0FkZHMgc3VwcG9ydCBmb3IgYW4gZXh0ZXJuYWwgbGlicmFyeSB0byB5b3VyIHByb2plY3QuJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnbG9uZy1kZXNjcmlwdGlvbi5tZCcpO1xuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgYWxsb3dQcml2YXRlU2NoZW1hdGljcyA9IHRydWU7XG4gIHByaXZhdGUgcmVhZG9ubHkgc2NoZW1hdGljTmFtZSA9ICduZy1hZGQnO1xuICBwcml2YXRlIHJvb3RSZXF1aXJlID0gY3JlYXRlUmVxdWlyZSh0aGlzLmNvbnRleHQucm9vdCArICcvJyk7XG5cbiAgb3ZlcnJpZGUgYXN5bmMgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PEFkZENvbW1hbmRBcmdzPj4ge1xuICAgIGNvbnN0IGxvY2FsWWFyZ3MgPSAoYXdhaXQgc3VwZXIuYnVpbGRlcihhcmd2KSlcbiAgICAgIC5wb3NpdGlvbmFsKCdjb2xsZWN0aW9uJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBwYWNrYWdlIHRvIGJlIGFkZGVkLicsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBkZW1hbmRPcHRpb246IHRydWUsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbigncmVnaXN0cnknLCB7IGRlc2NyaXB0aW9uOiAnVGhlIE5QTSByZWdpc3RyeSB0byB1c2UuJywgdHlwZTogJ3N0cmluZycgfSlcbiAgICAgIC5vcHRpb24oJ3ZlcmJvc2UnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRGlzcGxheSBhZGRpdGlvbmFsIGRldGFpbHMgYWJvdXQgaW50ZXJuYWwgb3BlcmF0aW9ucyBkdXJpbmcgZXhlY3V0aW9uLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignc2tpcC1jb25maXJtYXRpb24nLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICdTa2lwIGFza2luZyBhIGNvbmZpcm1hdGlvbiBwcm9tcHQgYmVmb3JlIGluc3RhbGxpbmcgYW5kIGV4ZWN1dGluZyB0aGUgcGFja2FnZS4gJyArXG4gICAgICAgICAgJ0Vuc3VyZSBwYWNrYWdlIG5hbWUgaXMgY29ycmVjdCBwcmlvciB0byB1c2luZyB0aGlzIG9wdGlvbi4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC8vIFByaW9yIHRvIGRvd25sb2FkaW5nIHdlIGRvbid0IGtub3cgdGhlIGZ1bGwgc2NoZW1hIGFuZCB0aGVyZWZvcmUgd2UgY2Fubm90IGJlIHN0cmljdCBvbiB0aGUgb3B0aW9ucy5cbiAgICAgIC8vIFBvc3NpYmx5IGluIHRoZSBmdXR1cmUgdXBkYXRlIHRoZSBsb2dpYyB0byB1c2UgdGhlIGZvbGxvd2luZyBzeW50YXg6XG4gICAgICAvLyBgbmcgYWRkIEBhbmd1bGFyL2xvY2FsaXplIC0tIC0tcGFja2FnZS1vcHRpb25zYC5cbiAgICAgIC5zdHJpY3QoZmFsc2UpO1xuXG4gICAgY29uc3QgY29sbGVjdGlvbk5hbWUgPSBhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25OYW1lKCk7XG4gICAgY29uc3Qgd29ya2Zsb3cgPSBhd2FpdCB0aGlzLmdldE9yQ3JlYXRlV29ya2Zsb3dGb3JCdWlsZGVyKGNvbGxlY3Rpb25OYW1lKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IGF3YWl0IHRoaXMuZ2V0U2NoZW1hdGljT3B0aW9ucyhjb2xsZWN0aW9uLCB0aGlzLnNjaGVtYXRpY05hbWUsIHdvcmtmbG93KTtcblxuICAgICAgcmV0dXJuIHRoaXMuYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZChsb2NhbFlhcmdzLCBvcHRpb25zKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gRHVyaW5nIGBuZyBhZGRgIHByaW9yIHRvIHRoZSBkb3dubG9hZGluZyBvZiB0aGUgcGFja2FnZVxuICAgICAgLy8gd2UgYXJlIG5vdCBhYmxlIHRvIHJlc29sdmUgYW5kIGNyZWF0ZSBhIGNvbGxlY3Rpb24uXG4gICAgICAvLyBPciB3aGVuIHRoZSB0aGUgY29sbGVjdGlvbiB2YWx1ZSBpcyBhIHBhdGggdG8gYSB0YXJiYWxsLlxuICAgIH1cblxuICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICB9XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lcy1wZXItZnVuY3Rpb25cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8QWRkQ29tbWFuZEFyZ3M+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgY29uc3QgeyBsb2dnZXIsIHBhY2thZ2VNYW5hZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgeyB2ZXJib3NlLCByZWdpc3RyeSwgY29sbGVjdGlvbiwgc2tpcENvbmZpcm1hdGlvbiB9ID0gb3B0aW9ucztcbiAgICBwYWNrYWdlTWFuYWdlci5lbnN1cmVDb21wYXRpYmlsaXR5KCk7XG5cbiAgICBsZXQgcGFja2FnZUlkZW50aWZpZXI7XG4gICAgdHJ5IHtcbiAgICAgIHBhY2thZ2VJZGVudGlmaWVyID0gbnBhKGNvbGxlY3Rpb24pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICBsb2dnZXIuZXJyb3IoZS5tZXNzYWdlKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgcGFja2FnZUlkZW50aWZpZXIubmFtZSAmJlxuICAgICAgcGFja2FnZUlkZW50aWZpZXIucmVnaXN0cnkgJiZcbiAgICAgIHRoaXMuaXNQYWNrYWdlSW5zdGFsbGVkKHBhY2thZ2VJZGVudGlmaWVyLm5hbWUpXG4gICAgKSB7XG4gICAgICBjb25zdCB2YWxpZFZlcnNpb24gPSBhd2FpdCB0aGlzLmlzUHJvamVjdFZlcnNpb25WYWxpZChwYWNrYWdlSWRlbnRpZmllcik7XG4gICAgICBpZiAodmFsaWRWZXJzaW9uKSB7XG4gICAgICAgIC8vIEFscmVhZHkgaW5zdGFsbGVkIHNvIGp1c3QgcnVuIHNjaGVtYXRpY1xuICAgICAgICBsb2dnZXIuaW5mbygnU2tpcHBpbmcgaW5zdGFsbGF0aW9uOiBQYWNrYWdlIGFscmVhZHkgaW5zdGFsbGVkJyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyh7IC4uLm9wdGlvbnMsIGNvbGxlY3Rpb246IHBhY2thZ2VJZGVudGlmaWVyLm5hbWUgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgc3Bpbm5lciA9IG5ldyBTcGlubmVyKCk7XG5cbiAgICBzcGlubmVyLnN0YXJ0KCdEZXRlcm1pbmluZyBwYWNrYWdlIG1hbmFnZXIuLi4nKTtcbiAgICBjb25zdCB1c2luZ1lhcm4gPSBwYWNrYWdlTWFuYWdlci5uYW1lID09PSBQYWNrYWdlTWFuYWdlci5ZYXJuO1xuICAgIHNwaW5uZXIuaW5mbyhgVXNpbmcgcGFja2FnZSBtYW5hZ2VyOiAke2NvbG9ycy5ncmV5KHBhY2thZ2VNYW5hZ2VyLm5hbWUpfWApO1xuXG4gICAgaWYgKHBhY2thZ2VJZGVudGlmaWVyLm5hbWUgJiYgcGFja2FnZUlkZW50aWZpZXIudHlwZSA9PT0gJ3RhZycgJiYgIXBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMpIHtcbiAgICAgIC8vIG9ubHkgcGFja2FnZSBuYW1lIHByb3ZpZGVkOyBzZWFyY2ggZm9yIHZpYWJsZSB2ZXJzaW9uXG4gICAgICAvLyBwbHVzIHNwZWNpYWwgY2FzZXMgZm9yIHBhY2thZ2VzIHRoYXQgZGlkIG5vdCBoYXZlIHBlZXIgZGVwcyBzZXR1cFxuICAgICAgc3Bpbm5lci5zdGFydCgnU2VhcmNoaW5nIGZvciBjb21wYXRpYmxlIHBhY2thZ2UgdmVyc2lvbi4uLicpO1xuXG4gICAgICBsZXQgcGFja2FnZU1ldGFkYXRhO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGFja2FnZU1ldGFkYXRhID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWV0YWRhdGEocGFja2FnZUlkZW50aWZpZXIubmFtZSwgbG9nZ2VyLCB7XG4gICAgICAgICAgcmVnaXN0cnksXG4gICAgICAgICAgdXNpbmdZYXJuLFxuICAgICAgICAgIHZlcmJvc2UsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgICBzcGlubmVyLmZhaWwoYFVuYWJsZSB0byBsb2FkIHBhY2thZ2UgaW5mb3JtYXRpb24gZnJvbSByZWdpc3RyeTogJHtlLm1lc3NhZ2V9YCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIFN0YXJ0IHdpdGggdGhlIHZlcnNpb24gdGFnZ2VkIGFzIGBsYXRlc3RgIGlmIGl0IGV4aXN0c1xuICAgICAgY29uc3QgbGF0ZXN0TWFuaWZlc3QgPSBwYWNrYWdlTWV0YWRhdGEudGFnc1snbGF0ZXN0J107XG4gICAgICBpZiAobGF0ZXN0TWFuaWZlc3QpIHtcbiAgICAgICAgcGFja2FnZUlkZW50aWZpZXIgPSBucGEucmVzb2x2ZShsYXRlc3RNYW5pZmVzdC5uYW1lLCBsYXRlc3RNYW5pZmVzdC52ZXJzaW9uKTtcbiAgICAgIH1cblxuICAgICAgLy8gQWRqdXN0IHRoZSB2ZXJzaW9uIGJhc2VkIG9uIG5hbWUgYW5kIHBlZXIgZGVwZW5kZW5jaWVzXG4gICAgICBpZiAoXG4gICAgICAgIGxhdGVzdE1hbmlmZXN0Py5wZWVyRGVwZW5kZW5jaWVzICYmXG4gICAgICAgIE9iamVjdC5rZXlzKGxhdGVzdE1hbmlmZXN0LnBlZXJEZXBlbmRlbmNpZXMpLmxlbmd0aCA9PT0gMFxuICAgICAgKSB7XG4gICAgICAgIHNwaW5uZXIuc3VjY2VlZChcbiAgICAgICAgICBgRm91bmQgY29tcGF0aWJsZSBwYWNrYWdlIHZlcnNpb246ICR7Y29sb3JzLmdyZXkocGFja2FnZUlkZW50aWZpZXIudG9TdHJpbmcoKSl9LmAsXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKCFsYXRlc3RNYW5pZmVzdCB8fCAoYXdhaXQgdGhpcy5oYXNNaXNtYXRjaGVkUGVlcihsYXRlc3RNYW5pZmVzdCkpKSB7XG4gICAgICAgIC8vICdsYXRlc3QnIGlzIGludmFsaWQgc28gc2VhcmNoIGZvciBtb3N0IHJlY2VudCBtYXRjaGluZyBwYWNrYWdlXG4gICAgICAgIGNvbnN0IHZlcnNpb25FeGNsdXNpb25zID0gcGFja2FnZVZlcnNpb25FeGNsdXNpb25zW3BhY2thZ2VNZXRhZGF0YS5uYW1lXTtcbiAgICAgICAgY29uc3QgdmVyc2lvbk1hbmlmZXN0cyA9IE9iamVjdC52YWx1ZXMocGFja2FnZU1ldGFkYXRhLnZlcnNpb25zKS5maWx0ZXIoXG4gICAgICAgICAgKHZhbHVlOiBQYWNrYWdlTWFuaWZlc3QpID0+IHtcbiAgICAgICAgICAgIC8vIFByZXJlbGVhc2UgdmVyc2lvbnMgYXJlIG5vdCBzdGFibGUgYW5kIHNob3VsZCBub3QgYmUgY29uc2lkZXJlZCBieSBkZWZhdWx0XG4gICAgICAgICAgICBpZiAocHJlcmVsZWFzZSh2YWx1ZS52ZXJzaW9uKSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBEZXByZWNhdGVkIHZlcnNpb25zIHNob3VsZCBub3QgYmUgdXNlZCBvciBjb25zaWRlcmVkXG4gICAgICAgICAgICBpZiAodmFsdWUuZGVwcmVjYXRlZCkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBFeGNsdWRlZCBwYWNrYWdlIHZlcnNpb25zIHNob3VsZCBub3QgYmUgY29uc2lkZXJlZFxuICAgICAgICAgICAgaWYgKHZlcnNpb25FeGNsdXNpb25zICYmIHNhdGlzZmllcyh2YWx1ZS52ZXJzaW9uLCB2ZXJzaW9uRXhjbHVzaW9ucykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9LFxuICAgICAgICApO1xuXG4gICAgICAgIHZlcnNpb25NYW5pZmVzdHMuc29ydCgoYSwgYikgPT4gY29tcGFyZShhLnZlcnNpb24sIGIudmVyc2lvbiwgdHJ1ZSkpO1xuXG4gICAgICAgIGxldCBuZXdJZGVudGlmaWVyO1xuICAgICAgICBmb3IgKGNvbnN0IHZlcnNpb25NYW5pZmVzdCBvZiB2ZXJzaW9uTWFuaWZlc3RzKSB7XG4gICAgICAgICAgaWYgKCEoYXdhaXQgdGhpcy5oYXNNaXNtYXRjaGVkUGVlcih2ZXJzaW9uTWFuaWZlc3QpKSkge1xuICAgICAgICAgICAgbmV3SWRlbnRpZmllciA9IG5wYS5yZXNvbHZlKHZlcnNpb25NYW5pZmVzdC5uYW1lLCB2ZXJzaW9uTWFuaWZlc3QudmVyc2lvbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5ld0lkZW50aWZpZXIpIHtcbiAgICAgICAgICBzcGlubmVyLndhcm4oXCJVbmFibGUgdG8gZmluZCBjb21wYXRpYmxlIHBhY2thZ2UuIFVzaW5nICdsYXRlc3QnIHRhZy5cIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFja2FnZUlkZW50aWZpZXIgPSBuZXdJZGVudGlmaWVyO1xuICAgICAgICAgIHNwaW5uZXIuc3VjY2VlZChcbiAgICAgICAgICAgIGBGb3VuZCBjb21wYXRpYmxlIHBhY2thZ2UgdmVyc2lvbjogJHtjb2xvcnMuZ3JleShwYWNrYWdlSWRlbnRpZmllci50b1N0cmluZygpKX0uYCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzcGlubmVyLnN1Y2NlZWQoXG4gICAgICAgICAgYEZvdW5kIGNvbXBhdGlibGUgcGFja2FnZSB2ZXJzaW9uOiAke2NvbG9ycy5ncmV5KHBhY2thZ2VJZGVudGlmaWVyLnRvU3RyaW5nKCkpfS5gLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBjb2xsZWN0aW9uTmFtZSA9IHBhY2thZ2VJZGVudGlmaWVyLm5hbWU7XG4gICAgbGV0IHNhdmVQYWNrYWdlOiBOZ0FkZFNhdmVEZXBlbmRlbmN5IHwgdW5kZWZpbmVkO1xuXG4gICAgdHJ5IHtcbiAgICAgIHNwaW5uZXIuc3RhcnQoJ0xvYWRpbmcgcGFja2FnZSBpbmZvcm1hdGlvbiBmcm9tIHJlZ2lzdHJ5Li4uJyk7XG4gICAgICBjb25zdCBtYW5pZmVzdCA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KHBhY2thZ2VJZGVudGlmaWVyLnRvU3RyaW5nKCksIGxvZ2dlciwge1xuICAgICAgICByZWdpc3RyeSxcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgdXNpbmdZYXJuLFxuICAgICAgfSk7XG5cbiAgICAgIHNhdmVQYWNrYWdlID0gbWFuaWZlc3RbJ25nLWFkZCddPy5zYXZlO1xuICAgICAgY29sbGVjdGlvbk5hbWUgPSBtYW5pZmVzdC5uYW1lO1xuXG4gICAgICBpZiAoYXdhaXQgdGhpcy5oYXNNaXNtYXRjaGVkUGVlcihtYW5pZmVzdCkpIHtcbiAgICAgICAgc3Bpbm5lci53YXJuKCdQYWNrYWdlIGhhcyB1bm1ldCBwZWVyIGRlcGVuZGVuY2llcy4gQWRkaW5nIHRoZSBwYWNrYWdlIG1heSBub3Qgc3VjY2VlZC4nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNwaW5uZXIuc3VjY2VlZChgUGFja2FnZSBpbmZvcm1hdGlvbiBsb2FkZWQuYCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgIHNwaW5uZXIuZmFpbChgVW5hYmxlIHRvIGZldGNoIHBhY2thZ2UgaW5mb3JtYXRpb24gZm9yICcke3BhY2thZ2VJZGVudGlmaWVyfSc6ICR7ZS5tZXNzYWdlfWApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBpZiAoIXNraXBDb25maXJtYXRpb24pIHtcbiAgICAgIGNvbnN0IGNvbmZpcm1hdGlvblJlc3BvbnNlID0gYXdhaXQgYXNrQ29uZmlybWF0aW9uKFxuICAgICAgICBgXFxuVGhlIHBhY2thZ2UgJHtjb2xvcnMuYmx1ZShwYWNrYWdlSWRlbnRpZmllci5yYXcpfSB3aWxsIGJlIGluc3RhbGxlZCBhbmQgZXhlY3V0ZWQuXFxuYCArXG4gICAgICAgICAgJ1dvdWxkIHlvdSBsaWtlIHRvIHByb2NlZWQ/JyxcbiAgICAgICAgdHJ1ZSxcbiAgICAgICAgZmFsc2UsXG4gICAgICApO1xuXG4gICAgICBpZiAoIWNvbmZpcm1hdGlvblJlc3BvbnNlKSB7XG4gICAgICAgIGlmICghaXNUVFkoKSkge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICdObyB0ZXJtaW5hbCBkZXRlY3RlZC4gJyArXG4gICAgICAgICAgICAgIGAnLS1za2lwLWNvbmZpcm1hdGlvbicgY2FuIGJlIHVzZWQgdG8gYnlwYXNzIGluc3RhbGxhdGlvbiBjb25maXJtYXRpb24uIGAgK1xuICAgICAgICAgICAgICBgRW5zdXJlIHBhY2thZ2UgbmFtZSBpcyBjb3JyZWN0IHByaW9yIHRvICctLXNraXAtY29uZmlybWF0aW9uJyBvcHRpb24gdXNhZ2UuYCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9nZ2VyLmVycm9yKCdDb21tYW5kIGFib3J0ZWQuJyk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNhdmVQYWNrYWdlID09PSBmYWxzZSkge1xuICAgICAgLy8gVGVtcG9yYXJ5IHBhY2thZ2VzIGFyZSBsb2NhdGVkIGluIGEgZGlmZmVyZW50IGRpcmVjdG9yeVxuICAgICAgLy8gSGVuY2Ugd2UgbmVlZCB0byByZXNvbHZlIHRoZW0gdXNpbmcgdGhlIHRlbXAgcGF0aFxuICAgICAgY29uc3QgeyBzdWNjZXNzLCB0ZW1wTm9kZU1vZHVsZXMgfSA9IGF3YWl0IHBhY2thZ2VNYW5hZ2VyLmluc3RhbGxUZW1wKFxuICAgICAgICBwYWNrYWdlSWRlbnRpZmllci5yYXcsXG4gICAgICAgIHJlZ2lzdHJ5ID8gW2AtLXJlZ2lzdHJ5PVwiJHtyZWdpc3RyeX1cImBdIDogdW5kZWZpbmVkLFxuICAgICAgKTtcbiAgICAgIGNvbnN0IHRlbXBSZXF1aXJlID0gY3JlYXRlUmVxdWlyZSh0ZW1wTm9kZU1vZHVsZXMgKyAnLycpO1xuICAgICAgY29uc3QgcmVzb2x2ZWRDb2xsZWN0aW9uUGF0aCA9IHRlbXBSZXF1aXJlLnJlc29sdmUoam9pbihjb2xsZWN0aW9uTmFtZSwgJ3BhY2thZ2UuanNvbicpKTtcblxuICAgICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICBjb2xsZWN0aW9uTmFtZSA9IGRpcm5hbWUocmVzb2x2ZWRDb2xsZWN0aW9uUGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHN1Y2Nlc3MgPSBhd2FpdCBwYWNrYWdlTWFuYWdlci5pbnN0YWxsKFxuICAgICAgICBwYWNrYWdlSWRlbnRpZmllci5yYXcsXG4gICAgICAgIHNhdmVQYWNrYWdlLFxuICAgICAgICByZWdpc3RyeSA/IFtgLS1yZWdpc3RyeT1cIiR7cmVnaXN0cnl9XCJgXSA6IHVuZGVmaW5lZCxcbiAgICAgICk7XG5cbiAgICAgIGlmICghc3VjY2Vzcykge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5leGVjdXRlU2NoZW1hdGljKHsgLi4ub3B0aW9ucywgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGlzUHJvamVjdFZlcnNpb25WYWxpZChwYWNrYWdlSWRlbnRpZmllcjogbnBhLlJlc3VsdCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghcGFja2FnZUlkZW50aWZpZXIubmFtZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCB2YWxpZFZlcnNpb24gPSBmYWxzZTtcbiAgICBjb25zdCBpbnN0YWxsZWRWZXJzaW9uID0gYXdhaXQgdGhpcy5maW5kUHJvamVjdFZlcnNpb24ocGFja2FnZUlkZW50aWZpZXIubmFtZSk7XG4gICAgaWYgKGluc3RhbGxlZFZlcnNpb24pIHtcbiAgICAgIGlmIChwYWNrYWdlSWRlbnRpZmllci50eXBlID09PSAncmFuZ2UnICYmIHBhY2thZ2VJZGVudGlmaWVyLmZldGNoU3BlYykge1xuICAgICAgICB2YWxpZFZlcnNpb24gPSBzYXRpc2ZpZXMoaW5zdGFsbGVkVmVyc2lvbiwgcGFja2FnZUlkZW50aWZpZXIuZmV0Y2hTcGVjKTtcbiAgICAgIH0gZWxzZSBpZiAocGFja2FnZUlkZW50aWZpZXIudHlwZSA9PT0gJ3ZlcnNpb24nKSB7XG4gICAgICAgIGNvbnN0IHYxID0gdmFsaWQocGFja2FnZUlkZW50aWZpZXIuZmV0Y2hTcGVjKTtcbiAgICAgICAgY29uc3QgdjIgPSB2YWxpZChpbnN0YWxsZWRWZXJzaW9uKTtcbiAgICAgICAgdmFsaWRWZXJzaW9uID0gdjEgIT09IG51bGwgJiYgdjEgPT09IHYyO1xuICAgICAgfSBlbHNlIGlmICghcGFja2FnZUlkZW50aWZpZXIucmF3U3BlYykge1xuICAgICAgICB2YWxpZFZlcnNpb24gPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWxpZFZlcnNpb247XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldENvbGxlY3Rpb25OYW1lKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgWywgY29sbGVjdGlvbk5hbWVdID0gdGhpcy5jb250ZXh0LmFyZ3MucG9zaXRpb25hbDtcblxuICAgIHJldHVybiBjb2xsZWN0aW9uTmFtZTtcbiAgfVxuXG4gIHByaXZhdGUgaXNQYWNrYWdlSW5zdGFsbGVkKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHRyeSB7XG4gICAgICB0aGlzLnJvb3RSZXF1aXJlLnJlc29sdmUoam9pbihuYW1lLCAncGFja2FnZS5qc29uJykpO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgaWYgKGUuY29kZSAhPT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlU2NoZW1hdGljKFxuICAgIG9wdGlvbnM6IE9wdGlvbnM8QWRkQ29tbWFuZEFyZ3M+ICYgT3RoZXJPcHRpb25zLFxuICApOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qge1xuICAgICAgICB2ZXJib3NlLFxuICAgICAgICBza2lwQ29uZmlybWF0aW9uLFxuICAgICAgICBpbnRlcmFjdGl2ZSxcbiAgICAgICAgZm9yY2UsXG4gICAgICAgIGRyeVJ1bixcbiAgICAgICAgcmVnaXN0cnksXG4gICAgICAgIGRlZmF1bHRzLFxuICAgICAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgLi4uc2NoZW1hdGljT3B0aW9uc1xuICAgICAgfSA9IG9wdGlvbnM7XG5cbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICAgIHNjaGVtYXRpY09wdGlvbnMsXG4gICAgICAgIHNjaGVtYXRpY05hbWU6IHRoaXMuc2NoZW1hdGljTmFtZSxcbiAgICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIGV4ZWN1dGlvbk9wdGlvbnM6IHtcbiAgICAgICAgICBpbnRlcmFjdGl2ZSxcbiAgICAgICAgICBmb3JjZSxcbiAgICAgICAgICBkcnlSdW4sXG4gICAgICAgICAgZGVmYXVsdHMsXG4gICAgICAgICAgcGFja2FnZVJlZ2lzdHJ5OiByZWdpc3RyeSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9kZVBhY2thZ2VEb2VzTm90U3VwcG9ydFNjaGVtYXRpY3MpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcih0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgVGhlIHBhY2thZ2UgdGhhdCB5b3UgYXJlIHRyeWluZyB0byBhZGQgZG9lcyBub3Qgc3VwcG9ydCBzY2hlbWF0aWNzLiBZb3UgY2FuIHRyeSB1c2luZ1xuICAgICAgICAgIGEgZGlmZmVyZW50IHZlcnNpb24gb2YgdGhlIHBhY2thZ2Ugb3IgY29udGFjdCB0aGUgcGFja2FnZSBhdXRob3IgdG8gYWRkIG5nLWFkZCBzdXBwb3J0LlxuICAgICAgICBgKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGZpbmRQcm9qZWN0VmVyc2lvbihuYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICBjb25zdCB7IGxvZ2dlciwgcm9vdCB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGxldCBpbnN0YWxsZWRQYWNrYWdlO1xuICAgIHRyeSB7XG4gICAgICBpbnN0YWxsZWRQYWNrYWdlID0gdGhpcy5yb290UmVxdWlyZS5yZXNvbHZlKGpvaW4obmFtZSwgJ3BhY2thZ2UuanNvbicpKTtcbiAgICB9IGNhdGNoIHt9XG5cbiAgICBpZiAoaW5zdGFsbGVkUGFja2FnZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgaW5zdGFsbGVkID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWFuaWZlc3QoZGlybmFtZShpbnN0YWxsZWRQYWNrYWdlKSwgbG9nZ2VyKTtcblxuICAgICAgICByZXR1cm4gaW5zdGFsbGVkLnZlcnNpb247XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfVxuXG4gICAgbGV0IHByb2plY3RNYW5pZmVzdDtcbiAgICB0cnkge1xuICAgICAgcHJvamVjdE1hbmlmZXN0ID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWFuaWZlc3Qocm9vdCwgbG9nZ2VyKTtcbiAgICB9IGNhdGNoIHt9XG5cbiAgICBpZiAocHJvamVjdE1hbmlmZXN0KSB7XG4gICAgICBjb25zdCB2ZXJzaW9uID1cbiAgICAgICAgcHJvamVjdE1hbmlmZXN0LmRlcGVuZGVuY2llcz8uW25hbWVdIHx8IHByb2plY3RNYW5pZmVzdC5kZXZEZXBlbmRlbmNpZXM/LltuYW1lXTtcbiAgICAgIGlmICh2ZXJzaW9uKSB7XG4gICAgICAgIHJldHVybiB2ZXJzaW9uO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBoYXNNaXNtYXRjaGVkUGVlcihtYW5pZmVzdDogUGFja2FnZU1hbmlmZXN0KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgZm9yIChjb25zdCBwZWVyIGluIG1hbmlmZXN0LnBlZXJEZXBlbmRlbmNpZXMpIHtcbiAgICAgIGxldCBwZWVySWRlbnRpZmllcjtcbiAgICAgIHRyeSB7XG4gICAgICAgIHBlZXJJZGVudGlmaWVyID0gbnBhLnJlc29sdmUocGVlciwgbWFuaWZlc3QucGVlckRlcGVuZGVuY2llc1twZWVyXSk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci53YXJuKGBJbnZhbGlkIHBlZXIgZGVwZW5kZW5jeSAke3BlZXJ9IGZvdW5kIGluIHBhY2thZ2UuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGVlcklkZW50aWZpZXIudHlwZSA9PT0gJ3ZlcnNpb24nIHx8IHBlZXJJZGVudGlmaWVyLnR5cGUgPT09ICdyYW5nZScpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gYXdhaXQgdGhpcy5maW5kUHJvamVjdFZlcnNpb24ocGVlcik7XG4gICAgICAgICAgaWYgKCF2ZXJzaW9uKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBvcHRpb25zID0geyBpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZSB9O1xuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgIWludGVyc2VjdHModmVyc2lvbiwgcGVlcklkZW50aWZpZXIucmF3U3BlYywgb3B0aW9ucykgJiZcbiAgICAgICAgICAgICFzYXRpc2ZpZXModmVyc2lvbiwgcGVlcklkZW50aWZpZXIucmF3U3BlYywgb3B0aW9ucylcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gTm90IGZvdW5kIG9yIGludmFsaWQgc28gaWdub3JlXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHR5cGUgPT09ICd0YWcnIHwgJ2ZpbGUnIHwgJ2RpcmVjdG9yeScgfCAncmVtb3RlJyB8ICdnaXQnXG4gICAgICAgIC8vIENhbm5vdCBhY2N1cmF0ZWx5IGNvbXBhcmUgdGhlc2UgYXMgdGhlIHRhZy9sb2NhdGlvbiBtYXkgaGF2ZSBjaGFuZ2VkIHNpbmNlIGluc3RhbGxcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiJdfQ==