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
        const { logger, packageManager } = this.context;
        const { verbose, registry, collection, skipConfirmation } = options;
        packageManager.ensureCompatibility();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2FkZC9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7O0FBRUgsK0NBQXVEO0FBQ3ZELDREQUF1RjtBQUN2RixzRUFBa0M7QUFDbEMsK0JBQXFDO0FBQ3JDLG1DQUEyRTtBQUUzRSwyRUFBc0U7QUFDdEUseURBQTBFO0FBTTFFLCtGQUd5RDtBQUN6RCxpREFBK0M7QUFDL0MsdUVBSzBDO0FBQzFDLG1EQUF5RDtBQUN6RCxxREFBa0Q7QUFDbEQsNkNBQTRDO0FBUzVDOzs7O0dBSUc7QUFDSCxNQUFNLHdCQUF3QixHQUF1QztJQUNuRSxxRUFBcUU7SUFDckUsbUJBQW1CLEVBQUUsS0FBSztDQUMzQixDQUFDO0FBRUYsTUFBYSxnQkFDWCxTQUFRLG1EQUF1QjtJQURqQzs7UUFJRSxZQUFPLEdBQUcsa0JBQWtCLENBQUM7UUFDN0IsYUFBUSxHQUFHLHVEQUF1RCxDQUFDO1FBQ25FLHdCQUFtQixHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQzFDLDJCQUFzQixHQUFHLElBQUksQ0FBQztRQUNoQyxrQkFBYSxHQUFHLFFBQVEsQ0FBQztJQWtaNUMsQ0FBQztJQWhaVSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVU7UUFDL0IsTUFBTSxVQUFVLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDM0MsVUFBVSxDQUFDLFlBQVksRUFBRTtZQUN4QixXQUFXLEVBQUUsMEJBQTBCO1lBQ3ZDLElBQUksRUFBRSxRQUFRO1lBQ2QsWUFBWSxFQUFFLElBQUk7U0FDbkIsQ0FBQzthQUNELE1BQU0sQ0FBQyxVQUFVLEVBQUUsRUFBRSxXQUFXLEVBQUUsMEJBQTBCLEVBQUUsSUFBSSxF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Q1Y7b0JBRUQsTUFBTSxPQUFPLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQztvQkFFNUMsSUFDRSxDQUFDLElBQUEsbUJBQVUsRUFBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7d0JBQ3JELENBQUMsSUFBQSxrQkFBUyxFQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUNwRDt3QkFDQSxPQUFPLElBQUksQ0FBQztxQkFDYjtpQkFDRjtnQkFBQyxXQUFNO29CQUNOLGlDQUFpQztvQkFDakMsU0FBUztpQkFDVjthQUNGO2lCQUFNO2dCQUNMLDJEQUEyRDtnQkFDM0QscUZBQXFGO2FBQ3RGO1NBQ0Y7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7Q0FDRjtBQTFaRCw0Q0EwWkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgYW5hbHl0aWNzLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VEb2VzTm90U3VwcG9ydFNjaGVtYXRpY3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgbnBhIGZyb20gJ25wbS1wYWNrYWdlLWFyZyc7XG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBjb21wYXJlLCBpbnRlcnNlY3RzLCBwcmVyZWxlYXNlLCBzYXRpc2ZpZXMsIHZhbGlkIH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uLy4uLy4uL2xpYi9jb25maWcvd29ya3NwYWNlLXNjaGVtYSc7XG5pbXBvcnQgeyBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyB9IGZyb20gJy4uLy4uL2FuYWx5dGljcy9hbmFseXRpY3MnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBPcHRpb25zLFxuICBPdGhlck9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQge1xuICBTY2hlbWF0aWNzQ29tbWFuZEFyZ3MsXG4gIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHtcbiAgTmdBZGRTYXZlRGVwZW5kZW5jeSxcbiAgUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNYW5pZmVzdCxcbiAgZmV0Y2hQYWNrYWdlTWV0YWRhdGEsXG59IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wYWNrYWdlLW1ldGFkYXRhJztcbmltcG9ydCB7IGFza0NvbmZpcm1hdGlvbiB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wcm9tcHQnO1xuaW1wb3J0IHsgU3Bpbm5lciB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9zcGlubmVyJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3R0eSc7XG5cbmludGVyZmFjZSBBZGRDb21tYW5kQXJncyBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kQXJncyB7XG4gIGNvbGxlY3Rpb246IHN0cmluZztcbiAgdmVyYm9zZT86IGJvb2xlYW47XG4gIHJlZ2lzdHJ5Pzogc3RyaW5nO1xuICAnc2tpcC1jb25maXJtYXRpb24nPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBUaGUgc2V0IG9mIHBhY2thZ2VzIHRoYXQgc2hvdWxkIGhhdmUgY2VydGFpbiB2ZXJzaW9ucyBleGNsdWRlZCBmcm9tIGNvbnNpZGVyYXRpb25cbiAqIHdoZW4gYXR0ZW1wdGluZyB0byBmaW5kIGEgY29tcGF0aWJsZSB2ZXJzaW9uIGZvciBhIHBhY2thZ2UuXG4gKiBUaGUga2V5IGlzIGEgcGFja2FnZSBuYW1lIGFuZCB0aGUgdmFsdWUgaXMgYSBTZW1WZXIgcmFuZ2Ugb2YgdmVyc2lvbnMgdG8gZXhjbHVkZS5cbiAqL1xuY29uc3QgcGFja2FnZVZlcnNpb25FeGNsdXNpb25zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCB1bmRlZmluZWQ+ID0ge1xuICAvLyBAYW5ndWxhci9sb2NhbGl6ZUA5LnggdmVyc2lvbnMgZG8gbm90IGhhdmUgcGVlciBkZXBlbmRlbmNpZXMgc2V0dXBcbiAgJ0Bhbmd1bGFyL2xvY2FsaXplJzogJzkueCcsXG59O1xuXG5leHBvcnQgY2xhc3MgQWRkQ29tbWFuZE1vZHVsZVxuICBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlXG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPEFkZENvbW1hbmRBcmdzPlxue1xuICBjb21tYW5kID0gJ2FkZCA8Y29sbGVjdGlvbj4nO1xuICBkZXNjcmliZSA9ICdBZGRzIHN1cHBvcnQgZm9yIGFuIGV4dGVybmFsIGxpYnJhcnkgdG8geW91ciBwcm9qZWN0Lic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSBqb2luKF9fZGlybmFtZSwgJ2xvbmctZGVzY3JpcHRpb24ubWQnKTtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIGFsbG93UHJpdmF0ZVNjaGVtYXRpY3MgPSB0cnVlO1xuICBwcml2YXRlIHJlYWRvbmx5IHNjaGVtYXRpY05hbWUgPSAnbmctYWRkJztcblxuICBvdmVycmlkZSBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8QWRkQ29tbWFuZEFyZ3M+PiB7XG4gICAgY29uc3QgbG9jYWxZYXJncyA9IChhd2FpdCBzdXBlci5idWlsZGVyKGFyZ3YpKVxuICAgICAgLnBvc2l0aW9uYWwoJ2NvbGxlY3Rpb24nLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIHBhY2thZ2UgdG8gYmUgYWRkZWQuJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGRlbWFuZE9wdGlvbjogdHJ1ZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdyZWdpc3RyeScsIHsgZGVzY3JpcHRpb246ICdUaGUgTlBNIHJlZ2lzdHJ5IHRvIHVzZS4nLCB0eXBlOiAnc3RyaW5nJyB9KVxuICAgICAgLm9wdGlvbigndmVyYm9zZScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdEaXNwbGF5IGFkZGl0aW9uYWwgZGV0YWlscyBhYm91dCBpbnRlcm5hbCBvcGVyYXRpb25zIGR1cmluZyBleGVjdXRpb24uJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdza2lwLWNvbmZpcm1hdGlvbicsIHtcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgJ1NraXAgYXNraW5nIGEgY29uZmlybWF0aW9uIHByb21wdCBiZWZvcmUgaW5zdGFsbGluZyBhbmQgZXhlY3V0aW5nIHRoZSBwYWNrYWdlLiAnICtcbiAgICAgICAgICAnRW5zdXJlIHBhY2thZ2UgbmFtZSBpcyBjb3JyZWN0IHByaW9yIHRvIHVzaW5nIHRoaXMgb3B0aW9uLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLy8gUHJpb3IgdG8gZG93bmxvYWRpbmcgd2UgZG9uJ3Qga25vdyB0aGUgZnVsbCBzY2hlbWEgYW5kIHRoZXJlZm9yZSB3ZSBjYW5ub3QgYmUgc3RyaWN0IG9uIHRoZSBvcHRpb25zLlxuICAgICAgLy8gUG9zc2libHkgaW4gdGhlIGZ1dHVyZSB1cGRhdGUgdGhlIGxvZ2ljIHRvIHVzZSB0aGUgZm9sbG93aW5nIHN5bnRheDpcbiAgICAgIC8vIGBuZyBhZGQgQGFuZ3VsYXIvbG9jYWxpemUgLS0gLS1wYWNrYWdlLW9wdGlvbnNgLlxuICAgICAgLnN0cmljdChmYWxzZSk7XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IGF3YWl0IHRoaXMuZ2V0Q29sbGVjdGlvbk5hbWUoKTtcbiAgICBjb25zdCB3b3JrZmxvdyA9IGF3YWl0IHRoaXMuZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckJ1aWxkZXIoY29sbGVjdGlvbk5hbWUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gICAgICBjb25zdCBvcHRpb25zID0gYXdhaXQgdGhpcy5nZXRTY2hlbWF0aWNPcHRpb25zKGNvbGxlY3Rpb24sIHRoaXMuc2NoZW1hdGljTmFtZSwgd29ya2Zsb3cpO1xuXG4gICAgICByZXR1cm4gdGhpcy5hZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kKGxvY2FsWWFyZ3MsIG9wdGlvbnMpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBEdXJpbmcgYG5nIGFkZGAgcHJpb3IgdG8gdGhlIGRvd25sb2FkaW5nIG9mIHRoZSBwYWNrYWdlXG4gICAgICAvLyB3ZSBhcmUgbm90IGFibGUgdG8gcmVzb2x2ZSBhbmQgY3JlYXRlIGEgY29sbGVjdGlvbi5cbiAgICAgIC8vIE9yIHdoZW4gdGhlIHRoZSBjb2xsZWN0aW9uIHZhbHVlIGlzIGEgcGF0aCB0byBhIHRhcmJhbGwuXG4gICAgfVxuXG4gICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxpbmVzLXBlci1mdW5jdGlvblxuICBhc3luYyBydW4ob3B0aW9uczogT3B0aW9uczxBZGRDb21tYW5kQXJncz4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBjb25zdCB7IGxvZ2dlciwgcGFja2FnZU1hbmFnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCB7IHZlcmJvc2UsIHJlZ2lzdHJ5LCBjb2xsZWN0aW9uLCBza2lwQ29uZmlybWF0aW9uIH0gPSBvcHRpb25zO1xuICAgIHBhY2thZ2VNYW5hZ2VyLmVuc3VyZUNvbXBhdGliaWxpdHkoKTtcblxuICAgIGxldCBwYWNrYWdlSWRlbnRpZmllcjtcbiAgICB0cnkge1xuICAgICAgcGFja2FnZUlkZW50aWZpZXIgPSBucGEoY29sbGVjdGlvbik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nZ2VyLmVycm9yKGUubWVzc2FnZSk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgIHBhY2thZ2VJZGVudGlmaWVyLm5hbWUgJiZcbiAgICAgIHBhY2thZ2VJZGVudGlmaWVyLnJlZ2lzdHJ5ICYmXG4gICAgICB0aGlzLmlzUGFja2FnZUluc3RhbGxlZChwYWNrYWdlSWRlbnRpZmllci5uYW1lKVxuICAgICkge1xuICAgICAgY29uc3QgdmFsaWRWZXJzaW9uID0gYXdhaXQgdGhpcy5pc1Byb2plY3RWZXJzaW9uVmFsaWQocGFja2FnZUlkZW50aWZpZXIpO1xuICAgICAgaWYgKHZhbGlkVmVyc2lvbikge1xuICAgICAgICAvLyBBbHJlYWR5IGluc3RhbGxlZCBzbyBqdXN0IHJ1biBzY2hlbWF0aWNcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1NraXBwaW5nIGluc3RhbGxhdGlvbjogUGFja2FnZSBhbHJlYWR5IGluc3RhbGxlZCcpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoeyAuLi5vcHRpb25zLCBjb2xsZWN0aW9uOiBwYWNrYWdlSWRlbnRpZmllci5uYW1lIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHNwaW5uZXIgPSBuZXcgU3Bpbm5lcigpO1xuXG4gICAgc3Bpbm5lci5zdGFydCgnRGV0ZXJtaW5pbmcgcGFja2FnZSBtYW5hZ2VyLi4uJyk7XG4gICAgY29uc3QgdXNpbmdZYXJuID0gcGFja2FnZU1hbmFnZXIubmFtZSA9PT0gUGFja2FnZU1hbmFnZXIuWWFybjtcbiAgICBzcGlubmVyLmluZm8oYFVzaW5nIHBhY2thZ2UgbWFuYWdlcjogJHtjb2xvcnMuZ3JleShwYWNrYWdlTWFuYWdlci5uYW1lKX1gKTtcblxuICAgIGlmIChwYWNrYWdlSWRlbnRpZmllci5uYW1lICYmIHBhY2thZ2VJZGVudGlmaWVyLnR5cGUgPT09ICd0YWcnICYmICFwYWNrYWdlSWRlbnRpZmllci5yYXdTcGVjKSB7XG4gICAgICAvLyBvbmx5IHBhY2thZ2UgbmFtZSBwcm92aWRlZDsgc2VhcmNoIGZvciB2aWFibGUgdmVyc2lvblxuICAgICAgLy8gcGx1cyBzcGVjaWFsIGNhc2VzIGZvciBwYWNrYWdlcyB0aGF0IGRpZCBub3QgaGF2ZSBwZWVyIGRlcHMgc2V0dXBcbiAgICAgIHNwaW5uZXIuc3RhcnQoJ1NlYXJjaGluZyBmb3IgY29tcGF0aWJsZSBwYWNrYWdlIHZlcnNpb24uLi4nKTtcblxuICAgICAgbGV0IHBhY2thZ2VNZXRhZGF0YTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHBhY2thZ2VNZXRhZGF0YSA9IGF3YWl0IGZldGNoUGFja2FnZU1ldGFkYXRhKHBhY2thZ2VJZGVudGlmaWVyLm5hbWUsIGxvZ2dlciwge1xuICAgICAgICAgIHJlZ2lzdHJ5LFxuICAgICAgICAgIHVzaW5nWWFybixcbiAgICAgICAgICB2ZXJib3NlLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgc3Bpbm5lci5mYWlsKGBVbmFibGUgdG8gbG9hZCBwYWNrYWdlIGluZm9ybWF0aW9uIGZyb20gcmVnaXN0cnk6ICR7ZS5tZXNzYWdlfWApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICAvLyBTdGFydCB3aXRoIHRoZSB2ZXJzaW9uIHRhZ2dlZCBhcyBgbGF0ZXN0YCBpZiBpdCBleGlzdHNcbiAgICAgIGNvbnN0IGxhdGVzdE1hbmlmZXN0ID0gcGFja2FnZU1ldGFkYXRhLnRhZ3NbJ2xhdGVzdCddO1xuICAgICAgaWYgKGxhdGVzdE1hbmlmZXN0KSB7XG4gICAgICAgIHBhY2thZ2VJZGVudGlmaWVyID0gbnBhLnJlc29sdmUobGF0ZXN0TWFuaWZlc3QubmFtZSwgbGF0ZXN0TWFuaWZlc3QudmVyc2lvbik7XG4gICAgICB9XG5cbiAgICAgIC8vIEFkanVzdCB0aGUgdmVyc2lvbiBiYXNlZCBvbiBuYW1lIGFuZCBwZWVyIGRlcGVuZGVuY2llc1xuICAgICAgaWYgKFxuICAgICAgICBsYXRlc3RNYW5pZmVzdD8ucGVlckRlcGVuZGVuY2llcyAmJlxuICAgICAgICBPYmplY3Qua2V5cyhsYXRlc3RNYW5pZmVzdC5wZWVyRGVwZW5kZW5jaWVzKS5sZW5ndGggPT09IDBcbiAgICAgICkge1xuICAgICAgICBzcGlubmVyLnN1Y2NlZWQoXG4gICAgICAgICAgYEZvdW5kIGNvbXBhdGlibGUgcGFja2FnZSB2ZXJzaW9uOiAke2NvbG9ycy5ncmV5KHBhY2thZ2VJZGVudGlmaWVyLnRvU3RyaW5nKCkpfS5gLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIGlmICghbGF0ZXN0TWFuaWZlc3QgfHwgKGF3YWl0IHRoaXMuaGFzTWlzbWF0Y2hlZFBlZXIobGF0ZXN0TWFuaWZlc3QpKSkge1xuICAgICAgICAvLyAnbGF0ZXN0JyBpcyBpbnZhbGlkIHNvIHNlYXJjaCBmb3IgbW9zdCByZWNlbnQgbWF0Y2hpbmcgcGFja2FnZVxuICAgICAgICBjb25zdCB2ZXJzaW9uRXhjbHVzaW9ucyA9IHBhY2thZ2VWZXJzaW9uRXhjbHVzaW9uc1twYWNrYWdlTWV0YWRhdGEubmFtZV07XG4gICAgICAgIGNvbnN0IHZlcnNpb25NYW5pZmVzdHMgPSBPYmplY3QudmFsdWVzKHBhY2thZ2VNZXRhZGF0YS52ZXJzaW9ucykuZmlsdGVyKFxuICAgICAgICAgICh2YWx1ZTogUGFja2FnZU1hbmlmZXN0KSA9PiB7XG4gICAgICAgICAgICAvLyBQcmVyZWxlYXNlIHZlcnNpb25zIGFyZSBub3Qgc3RhYmxlIGFuZCBzaG91bGQgbm90IGJlIGNvbnNpZGVyZWQgYnkgZGVmYXVsdFxuICAgICAgICAgICAgaWYgKHByZXJlbGVhc2UodmFsdWUudmVyc2lvbikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRGVwcmVjYXRlZCB2ZXJzaW9ucyBzaG91bGQgbm90IGJlIHVzZWQgb3IgY29uc2lkZXJlZFxuICAgICAgICAgICAgaWYgKHZhbHVlLmRlcHJlY2F0ZWQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRXhjbHVkZWQgcGFja2FnZSB2ZXJzaW9ucyBzaG91bGQgbm90IGJlIGNvbnNpZGVyZWRcbiAgICAgICAgICAgIGlmICh2ZXJzaW9uRXhjbHVzaW9ucyAmJiBzYXRpc2ZpZXModmFsdWUudmVyc2lvbiwgdmVyc2lvbkV4Y2x1c2lvbnMpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfSxcbiAgICAgICAgKTtcblxuICAgICAgICB2ZXJzaW9uTWFuaWZlc3RzLnNvcnQoKGEsIGIpID0+IGNvbXBhcmUoYS52ZXJzaW9uLCBiLnZlcnNpb24sIHRydWUpKTtcblxuICAgICAgICBsZXQgbmV3SWRlbnRpZmllcjtcbiAgICAgICAgZm9yIChjb25zdCB2ZXJzaW9uTWFuaWZlc3Qgb2YgdmVyc2lvbk1hbmlmZXN0cykge1xuICAgICAgICAgIGlmICghKGF3YWl0IHRoaXMuaGFzTWlzbWF0Y2hlZFBlZXIodmVyc2lvbk1hbmlmZXN0KSkpIHtcbiAgICAgICAgICAgIG5ld0lkZW50aWZpZXIgPSBucGEucmVzb2x2ZSh2ZXJzaW9uTWFuaWZlc3QubmFtZSwgdmVyc2lvbk1hbmlmZXN0LnZlcnNpb24pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFuZXdJZGVudGlmaWVyKSB7XG4gICAgICAgICAgc3Bpbm5lci53YXJuKFwiVW5hYmxlIHRvIGZpbmQgY29tcGF0aWJsZSBwYWNrYWdlLiBVc2luZyAnbGF0ZXN0JyB0YWcuXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhY2thZ2VJZGVudGlmaWVyID0gbmV3SWRlbnRpZmllcjtcbiAgICAgICAgICBzcGlubmVyLnN1Y2NlZWQoXG4gICAgICAgICAgICBgRm91bmQgY29tcGF0aWJsZSBwYWNrYWdlIHZlcnNpb246ICR7Y29sb3JzLmdyZXkocGFja2FnZUlkZW50aWZpZXIudG9TdHJpbmcoKSl9LmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3Bpbm5lci5zdWNjZWVkKFxuICAgICAgICAgIGBGb3VuZCBjb21wYXRpYmxlIHBhY2thZ2UgdmVyc2lvbjogJHtjb2xvcnMuZ3JleShwYWNrYWdlSWRlbnRpZmllci50b1N0cmluZygpKX0uYCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgY29sbGVjdGlvbk5hbWUgPSBwYWNrYWdlSWRlbnRpZmllci5uYW1lO1xuICAgIGxldCBzYXZlUGFja2FnZTogTmdBZGRTYXZlRGVwZW5kZW5jeSB8IHVuZGVmaW5lZDtcblxuICAgIHRyeSB7XG4gICAgICBzcGlubmVyLnN0YXJ0KCdMb2FkaW5nIHBhY2thZ2UgaW5mb3JtYXRpb24gZnJvbSByZWdpc3RyeS4uLicpO1xuICAgICAgY29uc3QgbWFuaWZlc3QgPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChwYWNrYWdlSWRlbnRpZmllci50b1N0cmluZygpLCBsb2dnZXIsIHtcbiAgICAgICAgcmVnaXN0cnksXG4gICAgICAgIHZlcmJvc2UsXG4gICAgICAgIHVzaW5nWWFybixcbiAgICAgIH0pO1xuXG4gICAgICBzYXZlUGFja2FnZSA9IG1hbmlmZXN0WyduZy1hZGQnXT8uc2F2ZTtcbiAgICAgIGNvbGxlY3Rpb25OYW1lID0gbWFuaWZlc3QubmFtZTtcblxuICAgICAgaWYgKGF3YWl0IHRoaXMuaGFzTWlzbWF0Y2hlZFBlZXIobWFuaWZlc3QpKSB7XG4gICAgICAgIHNwaW5uZXIud2FybignUGFja2FnZSBoYXMgdW5tZXQgcGVlciBkZXBlbmRlbmNpZXMuIEFkZGluZyB0aGUgcGFja2FnZSBtYXkgbm90IHN1Y2NlZWQuJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzcGlubmVyLnN1Y2NlZWQoYFBhY2thZ2UgaW5mb3JtYXRpb24gbG9hZGVkLmApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHNwaW5uZXIuZmFpbChgVW5hYmxlIHRvIGZldGNoIHBhY2thZ2UgaW5mb3JtYXRpb24gZm9yICcke3BhY2thZ2VJZGVudGlmaWVyfSc6ICR7ZS5tZXNzYWdlfWApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBpZiAoIXNraXBDb25maXJtYXRpb24pIHtcbiAgICAgIGNvbnN0IGNvbmZpcm1hdGlvblJlc3BvbnNlID0gYXdhaXQgYXNrQ29uZmlybWF0aW9uKFxuICAgICAgICBgXFxuVGhlIHBhY2thZ2UgJHtjb2xvcnMuYmx1ZShwYWNrYWdlSWRlbnRpZmllci5yYXcpfSB3aWxsIGJlIGluc3RhbGxlZCBhbmQgZXhlY3V0ZWQuXFxuYCArXG4gICAgICAgICAgJ1dvdWxkIHlvdSBsaWtlIHRvIHByb2NlZWQ/JyxcbiAgICAgICAgdHJ1ZSxcbiAgICAgICAgZmFsc2UsXG4gICAgICApO1xuXG4gICAgICBpZiAoIWNvbmZpcm1hdGlvblJlc3BvbnNlKSB7XG4gICAgICAgIGlmICghaXNUVFkoKSkge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICdObyB0ZXJtaW5hbCBkZXRlY3RlZC4gJyArXG4gICAgICAgICAgICAgIGAnLS1za2lwLWNvbmZpcm1hdGlvbicgY2FuIGJlIHVzZWQgdG8gYnlwYXNzIGluc3RhbGxhdGlvbiBjb25maXJtYXRpb24uIGAgK1xuICAgICAgICAgICAgICBgRW5zdXJlIHBhY2thZ2UgbmFtZSBpcyBjb3JyZWN0IHByaW9yIHRvICctLXNraXAtY29uZmlybWF0aW9uJyBvcHRpb24gdXNhZ2UuYCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9nZ2VyLmVycm9yKCdDb21tYW5kIGFib3J0ZWQuJyk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNhdmVQYWNrYWdlID09PSBmYWxzZSkge1xuICAgICAgLy8gVGVtcG9yYXJ5IHBhY2thZ2VzIGFyZSBsb2NhdGVkIGluIGEgZGlmZmVyZW50IGRpcmVjdG9yeVxuICAgICAgLy8gSGVuY2Ugd2UgbmVlZCB0byByZXNvbHZlIHRoZW0gdXNpbmcgdGhlIHRlbXAgcGF0aFxuICAgICAgY29uc3QgeyBzdWNjZXNzLCB0ZW1wTm9kZU1vZHVsZXMgfSA9IGF3YWl0IHBhY2thZ2VNYW5hZ2VyLmluc3RhbGxUZW1wKFxuICAgICAgICBwYWNrYWdlSWRlbnRpZmllci5yYXcsXG4gICAgICAgIHJlZ2lzdHJ5ID8gW2AtLXJlZ2lzdHJ5PVwiJHtyZWdpc3RyeX1cImBdIDogdW5kZWZpbmVkLFxuICAgICAgKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkQ29sbGVjdGlvblBhdGggPSByZXF1aXJlLnJlc29sdmUoam9pbihjb2xsZWN0aW9uTmFtZSwgJ3BhY2thZ2UuanNvbicpLCB7XG4gICAgICAgIHBhdGhzOiBbdGVtcE5vZGVNb2R1bGVzXSxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIXN1Y2Nlc3MpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIGNvbGxlY3Rpb25OYW1lID0gZGlybmFtZShyZXNvbHZlZENvbGxlY3Rpb25QYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3VjY2VzcyA9IGF3YWl0IHBhY2thZ2VNYW5hZ2VyLmluc3RhbGwoXG4gICAgICAgIHBhY2thZ2VJZGVudGlmaWVyLnJhdyxcbiAgICAgICAgc2F2ZVBhY2thZ2UsXG4gICAgICAgIHJlZ2lzdHJ5ID8gW2AtLXJlZ2lzdHJ5PVwiJHtyZWdpc3RyeX1cImBdIDogdW5kZWZpbmVkLFxuICAgICAgKTtcblxuICAgICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoeyAuLi5vcHRpb25zLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaXNQcm9qZWN0VmVyc2lvblZhbGlkKHBhY2thZ2VJZGVudGlmaWVyOiBucGEuUmVzdWx0KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCFwYWNrYWdlSWRlbnRpZmllci5uYW1lKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IHZhbGlkVmVyc2lvbiA9IGZhbHNlO1xuICAgIGNvbnN0IGluc3RhbGxlZFZlcnNpb24gPSBhd2FpdCB0aGlzLmZpbmRQcm9qZWN0VmVyc2lvbihwYWNrYWdlSWRlbnRpZmllci5uYW1lKTtcbiAgICBpZiAoaW5zdGFsbGVkVmVyc2lvbikge1xuICAgICAgaWYgKHBhY2thZ2VJZGVudGlmaWVyLnR5cGUgPT09ICdyYW5nZScgJiYgcGFja2FnZUlkZW50aWZpZXIuZmV0Y2hTcGVjKSB7XG4gICAgICAgIHZhbGlkVmVyc2lvbiA9IHNhdGlzZmllcyhpbnN0YWxsZWRWZXJzaW9uLCBwYWNrYWdlSWRlbnRpZmllci5mZXRjaFNwZWMpO1xuICAgICAgfSBlbHNlIGlmIChwYWNrYWdlSWRlbnRpZmllci50eXBlID09PSAndmVyc2lvbicpIHtcbiAgICAgICAgY29uc3QgdjEgPSB2YWxpZChwYWNrYWdlSWRlbnRpZmllci5mZXRjaFNwZWMpO1xuICAgICAgICBjb25zdCB2MiA9IHZhbGlkKGluc3RhbGxlZFZlcnNpb24pO1xuICAgICAgICB2YWxpZFZlcnNpb24gPSB2MSAhPT0gbnVsbCAmJiB2MSA9PT0gdjI7XG4gICAgICB9IGVsc2UgaWYgKCFwYWNrYWdlSWRlbnRpZmllci5yYXdTcGVjKSB7XG4gICAgICAgIHZhbGlkVmVyc2lvbiA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbGlkVmVyc2lvbjtcbiAgfVxuXG4gIG92ZXJyaWRlIGFzeW5jIHJlcG9ydEFuYWx5dGljcyhvcHRpb25zOiBPdGhlck9wdGlvbnMsIHBhdGhzOiBzdHJpbmdbXSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSBhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25OYW1lKCk7XG4gICAgY29uc3QgZGltZW5zaW9uczogc3RyaW5nW10gPSBbXTtcbiAgICAvLyBBZGQgdGhlIGNvbGxlY3Rpb24gaWYgaXQncyBzYWZlIGxpc3RlZC5cbiAgICBpZiAoY29sbGVjdGlvbiAmJiBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyhjb2xsZWN0aW9uKSkge1xuICAgICAgZGltZW5zaW9uc1thbmFseXRpY3MuTmdDbGlBbmFseXRpY3NEaW1lbnNpb25zLk5nQWRkQ29sbGVjdGlvbl0gPSBjb2xsZWN0aW9uO1xuICAgIH1cblxuICAgIHJldHVybiBzdXBlci5yZXBvcnRBbmFseXRpY3Mob3B0aW9ucywgcGF0aHMsIGRpbWVuc2lvbnMpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRDb2xsZWN0aW9uTmFtZSgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IFssIGNvbGxlY3Rpb25OYW1lXSA9IHRoaXMuY29udGV4dC5hcmdzLnBvc2l0aW9uYWw7XG5cbiAgICByZXR1cm4gY29sbGVjdGlvbk5hbWU7XG4gIH1cblxuICBwcml2YXRlIGlzUGFja2FnZUluc3RhbGxlZChuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICB0cnkge1xuICAgICAgcmVxdWlyZS5yZXNvbHZlKGpvaW4obmFtZSwgJ3BhY2thZ2UuanNvbicpLCB7IHBhdGhzOiBbdGhpcy5jb250ZXh0LnJvb3RdIH0pO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5jb2RlICE9PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgb3B0aW9uczogT3B0aW9uczxBZGRDb21tYW5kQXJncz4gJiBPdGhlck9wdGlvbnMsXG4gICk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIHZlcmJvc2UsXG4gICAgICAgIHNraXBDb25maXJtYXRpb24sXG4gICAgICAgIGludGVyYWN0aXZlLFxuICAgICAgICBmb3JjZSxcbiAgICAgICAgZHJ5UnVuLFxuICAgICAgICByZWdpc3RyeSxcbiAgICAgICAgZGVmYXVsdHMsXG4gICAgICAgIGNvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICAuLi5zY2hlbWF0aWNPcHRpb25zXG4gICAgICB9ID0gb3B0aW9ucztcblxuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuU2NoZW1hdGljKHtcbiAgICAgICAgc2NoZW1hdGljT3B0aW9ucyxcbiAgICAgICAgc2NoZW1hdGljTmFtZTogdGhpcy5zY2hlbWF0aWNOYW1lLFxuICAgICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgZXhlY3V0aW9uT3B0aW9uczoge1xuICAgICAgICAgIGludGVyYWN0aXZlLFxuICAgICAgICAgIGZvcmNlLFxuICAgICAgICAgIGRyeVJ1bixcbiAgICAgICAgICBkZWZhdWx0cyxcbiAgICAgICAgICBwYWNrYWdlUmVnaXN0cnk6IHJlZ2lzdHJ5LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb2RlUGFja2FnZURvZXNOb3RTdXBwb3J0U2NoZW1hdGljcykge1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmVycm9yKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICBUaGUgcGFja2FnZSB0aGF0IHlvdSBhcmUgdHJ5aW5nIHRvIGFkZCBkb2VzIG5vdCBzdXBwb3J0IHNjaGVtYXRpY3MuIFlvdSBjYW4gdHJ5IHVzaW5nXG4gICAgICAgICAgYSBkaWZmZXJlbnQgdmVyc2lvbiBvZiB0aGUgcGFja2FnZSBvciBjb250YWN0IHRoZSBwYWNrYWdlIGF1dGhvciB0byBhZGQgbmctYWRkIHN1cHBvcnQuXG4gICAgICAgIGApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZmluZFByb2plY3RWZXJzaW9uKG5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyLCByb290IH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgbGV0IGluc3RhbGxlZFBhY2thZ2U7XG4gICAgdHJ5IHtcbiAgICAgIGluc3RhbGxlZFBhY2thZ2UgPSByZXF1aXJlLnJlc29sdmUoam9pbihuYW1lLCAncGFja2FnZS5qc29uJyksIHtcbiAgICAgICAgcGF0aHM6IFtyb290XSxcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2gge31cblxuICAgIGlmIChpbnN0YWxsZWRQYWNrYWdlKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBpbnN0YWxsZWQgPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChkaXJuYW1lKGluc3RhbGxlZFBhY2thZ2UpLCBsb2dnZXIpO1xuXG4gICAgICAgIHJldHVybiBpbnN0YWxsZWQudmVyc2lvbjtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICBsZXQgcHJvamVjdE1hbmlmZXN0O1xuICAgIHRyeSB7XG4gICAgICBwcm9qZWN0TWFuaWZlc3QgPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChyb290LCBsb2dnZXIpO1xuICAgIH0gY2F0Y2gge31cblxuICAgIGlmIChwcm9qZWN0TWFuaWZlc3QpIHtcbiAgICAgIGNvbnN0IHZlcnNpb24gPVxuICAgICAgICBwcm9qZWN0TWFuaWZlc3QuZGVwZW5kZW5jaWVzPy5bbmFtZV0gfHwgcHJvamVjdE1hbmlmZXN0LmRldkRlcGVuZGVuY2llcz8uW25hbWVdO1xuICAgICAgaWYgKHZlcnNpb24pIHtcbiAgICAgICAgcmV0dXJuIHZlcnNpb247XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGhhc01pc21hdGNoZWRQZWVyKG1hbmlmZXN0OiBQYWNrYWdlTWFuaWZlc3QpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBmb3IgKGNvbnN0IHBlZXIgaW4gbWFuaWZlc3QucGVlckRlcGVuZGVuY2llcykge1xuICAgICAgbGV0IHBlZXJJZGVudGlmaWVyO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGVlcklkZW50aWZpZXIgPSBucGEucmVzb2x2ZShwZWVyLCBtYW5pZmVzdC5wZWVyRGVwZW5kZW5jaWVzW3BlZXJdKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLndhcm4oYEludmFsaWQgcGVlciBkZXBlbmRlbmN5ICR7cGVlcn0gZm91bmQgaW4gcGFja2FnZS5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwZWVySWRlbnRpZmllci50eXBlID09PSAndmVyc2lvbicgfHwgcGVlcklkZW50aWZpZXIudHlwZSA9PT0gJ3JhbmdlJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBhd2FpdCB0aGlzLmZpbmRQcm9qZWN0VmVyc2lvbihwZWVyKTtcbiAgICAgICAgICBpZiAoIXZlcnNpb24pIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7IGluY2x1ZGVQcmVyZWxlYXNlOiB0cnVlIH07XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhaW50ZXJzZWN0cyh2ZXJzaW9uLCBwZWVySWRlbnRpZmllci5yYXdTcGVjLCBvcHRpb25zKSAmJlxuICAgICAgICAgICAgIXNhdGlzZmllcyh2ZXJzaW9uLCBwZWVySWRlbnRpZmllci5yYXdTcGVjLCBvcHRpb25zKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBOb3QgZm91bmQgb3IgaW52YWxpZCBzbyBpZ25vcmVcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gdHlwZSA9PT0gJ3RhZycgfCAnZmlsZScgfCAnZGlyZWN0b3J5JyB8ICdyZW1vdGUnIHwgJ2dpdCdcbiAgICAgICAgLy8gQ2Fubm90IGFjY3VyYXRlbHkgY29tcGFyZSB0aGVzZSBhcyB0aGUgdGFnL2xvY2F0aW9uIG1heSBoYXZlIGNoYW5nZWQgc2luY2UgaW5zdGFsbFxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19