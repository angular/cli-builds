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
exports.AddCommand = void 0;
const core_1 = require("@angular-devkit/core");
const tools_1 = require("@angular-devkit/schematics/tools");
const npm_package_arg_1 = __importDefault(require("npm-package-arg"));
const path_1 = require("path");
const semver_1 = require("semver");
const workspace_schema_1 = require("../lib/config/workspace-schema");
const analytics_1 = require("../models/analytics");
const schematic_command_1 = require("../models/schematic-command");
const color_1 = require("../utilities/color");
const install_package_1 = require("../utilities/install-package");
const package_manager_1 = require("../utilities/package-manager");
const package_metadata_1 = require("../utilities/package-metadata");
const prompt_1 = require("../utilities/prompt");
const spinner_1 = require("../utilities/spinner");
const tty_1 = require("../utilities/tty");
/**
 * The set of packages that should have certain versions excluded from consideration
 * when attempting to find a compatible version for a package.
 * The key is a package name and the value is a SemVer range of versions to exclude.
 */
const packageVersionExclusions = {
    // @angular/localize@9.x versions do not have peer dependencies setup
    '@angular/localize': '9.x',
};
class AddCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.allowPrivateSchematics = true;
    }
    async initialize(options) {
        if (options.registry) {
            return super.initialize({ ...options, packageRegistry: options.registry });
        }
        else {
            return super.initialize(options);
        }
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
                return this.executeSchematic(packageIdentifier.name, options['--']);
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
        return this.executeSchematic(collectionName, options['--']);
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
    async executeSchematic(collectionName, options = []) {
        const runOptions = {
            schematicOptions: options,
            collectionName,
            schematicName: 'ng-add',
            dryRun: false,
            force: false,
        };
        try {
            return await this.runSchematic(runOptions);
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
exports.AddCommand = AddCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9hZGQtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7QUFFSCwrQ0FBdUQ7QUFDdkQsNERBQXVGO0FBQ3ZGLHNFQUFrQztBQUNsQywrQkFBcUM7QUFDckMsbUNBQXdGO0FBQ3hGLHFFQUFnRTtBQUNoRSxtREFBb0U7QUFFcEUsbUVBQW9GO0FBQ3BGLDhDQUE0QztBQUM1QyxrRUFBa0Y7QUFDbEYsa0VBQXNGO0FBQ3RGLG9FQUt1QztBQUN2QyxnREFBc0Q7QUFDdEQsa0RBQStDO0FBQy9DLDBDQUF5QztBQUd6Qzs7OztHQUlHO0FBQ0gsTUFBTSx3QkFBd0IsR0FBdUM7SUFDbkUscUVBQXFFO0lBQ3JFLG1CQUFtQixFQUFFLEtBQUs7Q0FDM0IsQ0FBQztBQUVGLE1BQWEsVUFBVyxTQUFRLG9DQUFrQztJQUFsRTs7UUFDb0IsMkJBQXNCLEdBQUcsSUFBSSxDQUFDO0lBb1hsRCxDQUFDO0lBbFhVLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBcUM7UUFDN0QsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO1lBQ3BCLE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEdBQUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztTQUM1RTthQUFNO1lBQ0wsT0FBTyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ2xDO0lBQ0gsQ0FBQztJQUVELGtEQUFrRDtJQUNsRCxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQXFDOztRQUM3QyxNQUFNLElBQUEscUNBQW1CLEVBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU3QyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRTtZQUN2QixJ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Y2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBhbmFseXRpY3MsIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZURvZXNOb3RTdXBwb3J0U2NoZW1hdGljcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCBucGEgZnJvbSAnbnBtLXBhY2thZ2UtYXJnJztcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGludGVyc2VjdHMsIHByZXJlbGVhc2UsIHJjb21wYXJlLCBzYXRpc2ZpZXMsIHZhbGlkLCB2YWxpZFJhbmdlIH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7IGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzIH0gZnJvbSAnLi4vbW9kZWxzL2FuYWx5dGljcyc7XG5pbXBvcnQgeyBBcmd1bWVudHMgfSBmcm9tICcuLi9tb2RlbHMvaW50ZXJmYWNlJztcbmltcG9ydCB7IFJ1blNjaGVtYXRpY09wdGlvbnMsIFNjaGVtYXRpY0NvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvc2NoZW1hdGljLWNvbW1hbmQnO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IGluc3RhbGxQYWNrYWdlLCBpbnN0YWxsVGVtcFBhY2thZ2UgfSBmcm9tICcuLi91dGlsaXRpZXMvaW5zdGFsbC1wYWNrYWdlJztcbmltcG9ydCB7IGVuc3VyZUNvbXBhdGlibGVOcG0sIGdldFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWFuYWdlcic7XG5pbXBvcnQge1xuICBOZ0FkZFNhdmVEZXBlZGVuY3ksXG4gIFBhY2thZ2VNYW5pZmVzdCxcbiAgZmV0Y2hQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1ldGFkYXRhLFxufSBmcm9tICcuLi91dGlsaXRpZXMvcGFja2FnZS1tZXRhZGF0YSc7XG5pbXBvcnQgeyBhc2tDb25maXJtYXRpb24gfSBmcm9tICcuLi91dGlsaXRpZXMvcHJvbXB0JztcbmltcG9ydCB7IFNwaW5uZXIgfSBmcm9tICcuLi91dGlsaXRpZXMvc3Bpbm5lcic7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4uL3V0aWxpdGllcy90dHknO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEFkZENvbW1hbmRTY2hlbWEgfSBmcm9tICcuL2FkZCc7XG5cbi8qKlxuICogVGhlIHNldCBvZiBwYWNrYWdlcyB0aGF0IHNob3VsZCBoYXZlIGNlcnRhaW4gdmVyc2lvbnMgZXhjbHVkZWQgZnJvbSBjb25zaWRlcmF0aW9uXG4gKiB3aGVuIGF0dGVtcHRpbmcgdG8gZmluZCBhIGNvbXBhdGlibGUgdmVyc2lvbiBmb3IgYSBwYWNrYWdlLlxuICogVGhlIGtleSBpcyBhIHBhY2thZ2UgbmFtZSBhbmQgdGhlIHZhbHVlIGlzIGEgU2VtVmVyIHJhbmdlIG9mIHZlcnNpb25zIHRvIGV4Y2x1ZGUuXG4gKi9cbmNvbnN0IHBhY2thZ2VWZXJzaW9uRXhjbHVzaW9uczogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgdW5kZWZpbmVkPiA9IHtcbiAgLy8gQGFuZ3VsYXIvbG9jYWxpemVAOS54IHZlcnNpb25zIGRvIG5vdCBoYXZlIHBlZXIgZGVwZW5kZW5jaWVzIHNldHVwXG4gICdAYW5ndWxhci9sb2NhbGl6ZSc6ICc5LngnLFxufTtcblxuZXhwb3J0IGNsYXNzIEFkZENvbW1hbmQgZXh0ZW5kcyBTY2hlbWF0aWNDb21tYW5kPEFkZENvbW1hbmRTY2hlbWE+IHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgYWxsb3dQcml2YXRlU2NoZW1hdGljcyA9IHRydWU7XG5cbiAgb3ZlcnJpZGUgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBBZGRDb21tYW5kU2NoZW1hICYgQXJndW1lbnRzKSB7XG4gICAgaWYgKG9wdGlvbnMucmVnaXN0cnkpIHtcbiAgICAgIHJldHVybiBzdXBlci5pbml0aWFsaXplKHsgLi4ub3B0aW9ucywgcGFja2FnZVJlZ2lzdHJ5OiBvcHRpb25zLnJlZ2lzdHJ5IH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc3VwZXIuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxpbmVzLXBlci1mdW5jdGlvblxuICBhc3luYyBydW4ob3B0aW9uczogQWRkQ29tbWFuZFNjaGVtYSAmIEFyZ3VtZW50cykge1xuICAgIGF3YWl0IGVuc3VyZUNvbXBhdGlibGVOcG0odGhpcy5jb250ZXh0LnJvb3QpO1xuXG4gICAgaWYgKCFvcHRpb25zLmNvbGxlY3Rpb24pIHtcbiAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKFxuICAgICAgICBgVGhlIFwibmcgYWRkXCIgY29tbWFuZCByZXF1aXJlcyBhIG5hbWUgYXJndW1lbnQgdG8gYmUgc3BlY2lmaWVkIGVnLiBgICtcbiAgICAgICAgICBgJHtjb2xvcnMueWVsbG93KCduZyBhZGQgW25hbWVdICcpfS4gRm9yIG1vcmUgZGV0YWlscywgdXNlIFwibmcgaGVscFwiLmAsXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBsZXQgcGFja2FnZUlkZW50aWZpZXI7XG4gICAgdHJ5IHtcbiAgICAgIHBhY2thZ2VJZGVudGlmaWVyID0gbnBhKG9wdGlvbnMuY29sbGVjdGlvbik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoZS5tZXNzYWdlKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgcGFja2FnZUlkZW50aWZpZXIubmFtZSAmJlxuICAgICAgcGFja2FnZUlkZW50aWZpZXIucmVnaXN0cnkgJiZcbiAgICAgIHRoaXMuaXNQYWNrYWdlSW5zdGFsbGVkKHBhY2thZ2VJZGVudGlmaWVyLm5hbWUpXG4gICAgKSB7XG4gICAgICBjb25zdCB2YWxpZFZlcnNpb24gPSBhd2FpdCB0aGlzLmlzUHJvamVjdFZlcnNpb25WYWxpZChwYWNrYWdlSWRlbnRpZmllcik7XG4gICAgICBpZiAodmFsaWRWZXJzaW9uKSB7XG4gICAgICAgIC8vIEFscmVhZHkgaW5zdGFsbGVkIHNvIGp1c3QgcnVuIHNjaGVtYXRpY1xuICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKCdTa2lwcGluZyBpbnN0YWxsYXRpb246IFBhY2thZ2UgYWxyZWFkeSBpbnN0YWxsZWQnKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5leGVjdXRlU2NoZW1hdGljKHBhY2thZ2VJZGVudGlmaWVyLm5hbWUsIG9wdGlvbnNbJy0tJ10pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHNwaW5uZXIgPSBuZXcgU3Bpbm5lcigpO1xuXG4gICAgc3Bpbm5lci5zdGFydCgnRGV0ZXJtaW5pbmcgcGFja2FnZSBtYW5hZ2VyLi4uJyk7XG4gICAgY29uc3QgcGFja2FnZU1hbmFnZXIgPSBhd2FpdCBnZXRQYWNrYWdlTWFuYWdlcih0aGlzLmNvbnRleHQucm9vdCk7XG4gICAgY29uc3QgdXNpbmdZYXJuID0gcGFja2FnZU1hbmFnZXIgPT09IFBhY2thZ2VNYW5hZ2VyLllhcm47XG4gICAgc3Bpbm5lci5pbmZvKGBVc2luZyBwYWNrYWdlIG1hbmFnZXI6ICR7Y29sb3JzLmdyZXkocGFja2FnZU1hbmFnZXIpfWApO1xuXG4gICAgaWYgKHBhY2thZ2VJZGVudGlmaWVyLm5hbWUgJiYgcGFja2FnZUlkZW50aWZpZXIudHlwZSA9PT0gJ3RhZycgJiYgIXBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMpIHtcbiAgICAgIC8vIG9ubHkgcGFja2FnZSBuYW1lIHByb3ZpZGVkOyBzZWFyY2ggZm9yIHZpYWJsZSB2ZXJzaW9uXG4gICAgICAvLyBwbHVzIHNwZWNpYWwgY2FzZXMgZm9yIHBhY2thZ2VzIHRoYXQgZGlkIG5vdCBoYXZlIHBlZXIgZGVwcyBzZXR1cFxuICAgICAgc3Bpbm5lci5zdGFydCgnU2VhcmNoaW5nIGZvciBjb21wYXRpYmxlIHBhY2thZ2UgdmVyc2lvbi4uLicpO1xuXG4gICAgICBsZXQgcGFja2FnZU1ldGFkYXRhO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGFja2FnZU1ldGFkYXRhID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWV0YWRhdGEocGFja2FnZUlkZW50aWZpZXIubmFtZSwgdGhpcy5sb2dnZXIsIHtcbiAgICAgICAgICByZWdpc3RyeTogb3B0aW9ucy5yZWdpc3RyeSxcbiAgICAgICAgICB1c2luZ1lhcm4sXG4gICAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgc3Bpbm5lci5mYWlsKCdVbmFibGUgdG8gbG9hZCBwYWNrYWdlIGluZm9ybWF0aW9uIGZyb20gcmVnaXN0cnk6ICcgKyBlLm1lc3NhZ2UpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICAvLyBTdGFydCB3aXRoIHRoZSB2ZXJzaW9uIHRhZ2dlZCBhcyBgbGF0ZXN0YCBpZiBpdCBleGlzdHNcbiAgICAgIGNvbnN0IGxhdGVzdE1hbmlmZXN0ID0gcGFja2FnZU1ldGFkYXRhLnRhZ3NbJ2xhdGVzdCddO1xuICAgICAgaWYgKGxhdGVzdE1hbmlmZXN0KSB7XG4gICAgICAgIHBhY2thZ2VJZGVudGlmaWVyID0gbnBhLnJlc29sdmUobGF0ZXN0TWFuaWZlc3QubmFtZSwgbGF0ZXN0TWFuaWZlc3QudmVyc2lvbik7XG4gICAgICB9XG5cbiAgICAgIC8vIEFkanVzdCB0aGUgdmVyc2lvbiBiYXNlZCBvbiBuYW1lIGFuZCBwZWVyIGRlcGVuZGVuY2llc1xuICAgICAgaWYgKGxhdGVzdE1hbmlmZXN0ICYmIE9iamVjdC5rZXlzKGxhdGVzdE1hbmlmZXN0LnBlZXJEZXBlbmRlbmNpZXMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBpZiAobGF0ZXN0TWFuaWZlc3QubmFtZSA9PT0gJ0Bhbmd1bGFyL3B3YScpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gYXdhaXQgdGhpcy5maW5kUHJvamVjdFZlcnNpb24oJ0Bhbmd1bGFyL2NsaScpO1xuICAgICAgICAgIGNvbnN0IHNlbXZlck9wdGlvbnMgPSB7IGluY2x1ZGVQcmVyZWxlYXNlOiB0cnVlIH07XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICB2ZXJzaW9uICYmXG4gICAgICAgICAgICAoKHZhbGlkUmFuZ2UodmVyc2lvbikgJiYgaW50ZXJzZWN0cyh2ZXJzaW9uLCAnNycsIHNlbXZlck9wdGlvbnMpKSB8fFxuICAgICAgICAgICAgICAodmFsaWQodmVyc2lvbikgJiYgc2F0aXNmaWVzKHZlcnNpb24sICc3Jywgc2VtdmVyT3B0aW9ucykpKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcGFja2FnZUlkZW50aWZpZXIgPSBucGEucmVzb2x2ZSgnQGFuZ3VsYXIvcHdhJywgJzAuMTInKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBzcGlubmVyLnN1Y2NlZWQoXG4gICAgICAgICAgYEZvdW5kIGNvbXBhdGlibGUgcGFja2FnZSB2ZXJzaW9uOiAke2NvbG9ycy5ncmV5KHBhY2thZ2VJZGVudGlmaWVyLnRvU3RyaW5nKCkpfS5gLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIGlmICghbGF0ZXN0TWFuaWZlc3QgfHwgKGF3YWl0IHRoaXMuaGFzTWlzbWF0Y2hlZFBlZXIobGF0ZXN0TWFuaWZlc3QpKSkge1xuICAgICAgICAvLyAnbGF0ZXN0JyBpcyBpbnZhbGlkIHNvIHNlYXJjaCBmb3IgbW9zdCByZWNlbnQgbWF0Y2hpbmcgcGFja2FnZVxuICAgICAgICBjb25zdCB2ZXJzaW9uRXhjbHVzaW9ucyA9IHBhY2thZ2VWZXJzaW9uRXhjbHVzaW9uc1twYWNrYWdlTWV0YWRhdGEubmFtZV07XG4gICAgICAgIGNvbnN0IHZlcnNpb25NYW5pZmVzdHMgPSBPYmplY3QudmFsdWVzKHBhY2thZ2VNZXRhZGF0YS52ZXJzaW9ucykuZmlsdGVyKFxuICAgICAgICAgICh2YWx1ZTogUGFja2FnZU1hbmlmZXN0KSA9PiB7XG4gICAgICAgICAgICAvLyBQcmVyZWxlYXNlIHZlcnNpb25zIGFyZSBub3Qgc3RhYmxlIGFuZCBzaG91bGQgbm90IGJlIGNvbnNpZGVyZWQgYnkgZGVmYXVsdFxuICAgICAgICAgICAgaWYgKHByZXJlbGVhc2UodmFsdWUudmVyc2lvbikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRGVwcmVjYXRlZCB2ZXJzaW9ucyBzaG91bGQgbm90IGJlIHVzZWQgb3IgY29uc2lkZXJlZFxuICAgICAgICAgICAgaWYgKHZhbHVlLmRlcHJlY2F0ZWQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRXhjbHVkZWQgcGFja2FnZSB2ZXJzaW9ucyBzaG91bGQgbm90IGJlIGNvbnNpZGVyZWRcbiAgICAgICAgICAgIGlmICh2ZXJzaW9uRXhjbHVzaW9ucyAmJiBzYXRpc2ZpZXModmFsdWUudmVyc2lvbiwgdmVyc2lvbkV4Y2x1c2lvbnMpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfSxcbiAgICAgICAgKTtcblxuICAgICAgICB2ZXJzaW9uTWFuaWZlc3RzLnNvcnQoKGEsIGIpID0+IHJjb21wYXJlKGEudmVyc2lvbiwgYi52ZXJzaW9uLCB0cnVlKSk7XG5cbiAgICAgICAgbGV0IG5ld0lkZW50aWZpZXI7XG4gICAgICAgIGZvciAoY29uc3QgdmVyc2lvbk1hbmlmZXN0IG9mIHZlcnNpb25NYW5pZmVzdHMpIHtcbiAgICAgICAgICBpZiAoIShhd2FpdCB0aGlzLmhhc01pc21hdGNoZWRQZWVyKHZlcnNpb25NYW5pZmVzdCkpKSB7XG4gICAgICAgICAgICBuZXdJZGVudGlmaWVyID0gbnBhLnJlc29sdmUodmVyc2lvbk1hbmlmZXN0Lm5hbWUsIHZlcnNpb25NYW5pZmVzdC52ZXJzaW9uKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbmV3SWRlbnRpZmllcikge1xuICAgICAgICAgIHNwaW5uZXIud2FybihcIlVuYWJsZSB0byBmaW5kIGNvbXBhdGlibGUgcGFja2FnZS4gVXNpbmcgJ2xhdGVzdCcgdGFnLlwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYWNrYWdlSWRlbnRpZmllciA9IG5ld0lkZW50aWZpZXI7XG4gICAgICAgICAgc3Bpbm5lci5zdWNjZWVkKFxuICAgICAgICAgICAgYEZvdW5kIGNvbXBhdGlibGUgcGFja2FnZSB2ZXJzaW9uOiAke2NvbG9ycy5ncmV5KHBhY2thZ2VJZGVudGlmaWVyLnRvU3RyaW5nKCkpfS5gLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNwaW5uZXIuc3VjY2VlZChcbiAgICAgICAgICBgRm91bmQgY29tcGF0aWJsZSBwYWNrYWdlIHZlcnNpb246ICR7Y29sb3JzLmdyZXkocGFja2FnZUlkZW50aWZpZXIudG9TdHJpbmcoKSl9LmAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGNvbGxlY3Rpb25OYW1lID0gcGFja2FnZUlkZW50aWZpZXIubmFtZTtcbiAgICBsZXQgc2F2ZVBhY2thZ2U6IE5nQWRkU2F2ZURlcGVkZW5jeSB8IHVuZGVmaW5lZDtcblxuICAgIHRyeSB7XG4gICAgICBzcGlubmVyLnN0YXJ0KCdMb2FkaW5nIHBhY2thZ2UgaW5mb3JtYXRpb24gZnJvbSByZWdpc3RyeS4uLicpO1xuICAgICAgY29uc3QgbWFuaWZlc3QgPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChwYWNrYWdlSWRlbnRpZmllci50b1N0cmluZygpLCB0aGlzLmxvZ2dlciwge1xuICAgICAgICByZWdpc3RyeTogb3B0aW9ucy5yZWdpc3RyeSxcbiAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICB1c2luZ1lhcm4sXG4gICAgICB9KTtcblxuICAgICAgc2F2ZVBhY2thZ2UgPSBtYW5pZmVzdFsnbmctYWRkJ10/LnNhdmU7XG4gICAgICBjb2xsZWN0aW9uTmFtZSA9IG1hbmlmZXN0Lm5hbWU7XG5cbiAgICAgIGlmIChhd2FpdCB0aGlzLmhhc01pc21hdGNoZWRQZWVyKG1hbmlmZXN0KSkge1xuICAgICAgICBzcGlubmVyLndhcm4oJ1BhY2thZ2UgaGFzIHVubWV0IHBlZXIgZGVwZW5kZW5jaWVzLiBBZGRpbmcgdGhlIHBhY2thZ2UgbWF5IG5vdCBzdWNjZWVkLicpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3Bpbm5lci5zdWNjZWVkKGBQYWNrYWdlIGluZm9ybWF0aW9uIGxvYWRlZC5gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBzcGlubmVyLmZhaWwoYFVuYWJsZSB0byBmZXRjaCBwYWNrYWdlIGluZm9ybWF0aW9uIGZvciAnJHtwYWNrYWdlSWRlbnRpZmllcn0nOiAke2UubWVzc2FnZX1gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zLnNraXBDb25maXJtYXRpb24pIHtcbiAgICAgIGNvbnN0IGNvbmZpcm1hdGlvblJlc3BvbnNlID0gYXdhaXQgYXNrQ29uZmlybWF0aW9uKFxuICAgICAgICBgXFxuVGhlIHBhY2thZ2UgJHtjb2xvcnMuYmx1ZShwYWNrYWdlSWRlbnRpZmllci5yYXcpfSB3aWxsIGJlIGluc3RhbGxlZCBhbmQgZXhlY3V0ZWQuXFxuYCArXG4gICAgICAgICAgJ1dvdWxkIHlvdSBsaWtlIHRvIHByb2NlZWQ/JyxcbiAgICAgICAgdHJ1ZSxcbiAgICAgICAgZmFsc2UsXG4gICAgICApO1xuXG4gICAgICBpZiAoIWNvbmZpcm1hdGlvblJlc3BvbnNlKSB7XG4gICAgICAgIGlmICghaXNUVFkoKSkge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgJ05vIHRlcm1pbmFsIGRldGVjdGVkLiAnICtcbiAgICAgICAgICAgICAgYCctLXNraXAtY29uZmlybWF0aW9uJyBjYW4gYmUgdXNlZCB0byBieXBhc3MgaW5zdGFsbGF0aW9uIGNvbmZpcm1hdGlvbi4gYCArXG4gICAgICAgICAgICAgIGBFbnN1cmUgcGFja2FnZSBuYW1lIGlzIGNvcnJlY3QgcHJpb3IgdG8gJy0tc2tpcC1jb25maXJtYXRpb24nIG9wdGlvbiB1c2FnZS5gLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ0NvbW1hbmQgYWJvcnRlZC4nKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2F2ZVBhY2thZ2UgPT09IGZhbHNlKSB7XG4gICAgICAvLyBUZW1wb3JhcnkgcGFja2FnZXMgYXJlIGxvY2F0ZWQgaW4gYSBkaWZmZXJlbnQgZGlyZWN0b3J5XG4gICAgICAvLyBIZW5jZSB3ZSBuZWVkIHRvIHJlc29sdmUgdGhlbSB1c2luZyB0aGUgdGVtcCBwYXRoXG4gICAgICBjb25zdCB7IHN0YXR1cywgdGVtcE5vZGVNb2R1bGVzIH0gPSBhd2FpdCBpbnN0YWxsVGVtcFBhY2thZ2UoXG4gICAgICAgIHBhY2thZ2VJZGVudGlmaWVyLnJhdyxcbiAgICAgICAgcGFja2FnZU1hbmFnZXIsXG4gICAgICAgIG9wdGlvbnMucmVnaXN0cnkgPyBbYC0tcmVnaXN0cnk9XCIke29wdGlvbnMucmVnaXN0cnl9XCJgXSA6IHVuZGVmaW5lZCxcbiAgICAgICk7XG4gICAgICBjb25zdCByZXNvbHZlZENvbGxlY3Rpb25QYXRoID0gcmVxdWlyZS5yZXNvbHZlKGpvaW4oY29sbGVjdGlvbk5hbWUsICdwYWNrYWdlLmpzb24nKSwge1xuICAgICAgICBwYXRoczogW3RlbXBOb2RlTW9kdWxlc10sXG4gICAgICB9KTtcblxuICAgICAgaWYgKHN0YXR1cyAhPT0gMCkge1xuICAgICAgICByZXR1cm4gc3RhdHVzO1xuICAgICAgfVxuXG4gICAgICBjb2xsZWN0aW9uTmFtZSA9IGRpcm5hbWUocmVzb2x2ZWRDb2xsZWN0aW9uUGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IGluc3RhbGxQYWNrYWdlKFxuICAgICAgICBwYWNrYWdlSWRlbnRpZmllci5yYXcsXG4gICAgICAgIHBhY2thZ2VNYW5hZ2VyLFxuICAgICAgICBzYXZlUGFja2FnZSxcbiAgICAgICAgb3B0aW9ucy5yZWdpc3RyeSA/IFtgLS1yZWdpc3RyeT1cIiR7b3B0aW9ucy5yZWdpc3RyeX1cImBdIDogdW5kZWZpbmVkLFxuICAgICAgKTtcblxuICAgICAgaWYgKHN0YXR1cyAhPT0gMCkge1xuICAgICAgICByZXR1cm4gc3RhdHVzO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoY29sbGVjdGlvbk5hbWUsIG9wdGlvbnNbJy0tJ10pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBpc1Byb2plY3RWZXJzaW9uVmFsaWQocGFja2FnZUlkZW50aWZpZXI6IG5wYS5SZXN1bHQpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIXBhY2thZ2VJZGVudGlmaWVyLm5hbWUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgdmFsaWRWZXJzaW9uID0gZmFsc2U7XG4gICAgY29uc3QgaW5zdGFsbGVkVmVyc2lvbiA9IGF3YWl0IHRoaXMuZmluZFByb2plY3RWZXJzaW9uKHBhY2thZ2VJZGVudGlmaWVyLm5hbWUpO1xuICAgIGlmIChpbnN0YWxsZWRWZXJzaW9uKSB7XG4gICAgICBpZiAocGFja2FnZUlkZW50aWZpZXIudHlwZSA9PT0gJ3JhbmdlJyAmJiBwYWNrYWdlSWRlbnRpZmllci5mZXRjaFNwZWMpIHtcbiAgICAgICAgdmFsaWRWZXJzaW9uID0gc2F0aXNmaWVzKGluc3RhbGxlZFZlcnNpb24sIHBhY2thZ2VJZGVudGlmaWVyLmZldGNoU3BlYyk7XG4gICAgICB9IGVsc2UgaWYgKHBhY2thZ2VJZGVudGlmaWVyLnR5cGUgPT09ICd2ZXJzaW9uJykge1xuICAgICAgICBjb25zdCB2MSA9IHZhbGlkKHBhY2thZ2VJZGVudGlmaWVyLmZldGNoU3BlYyk7XG4gICAgICAgIGNvbnN0IHYyID0gdmFsaWQoaW5zdGFsbGVkVmVyc2lvbik7XG4gICAgICAgIHZhbGlkVmVyc2lvbiA9IHYxICE9PSBudWxsICYmIHYxID09PSB2MjtcbiAgICAgIH0gZWxzZSBpZiAoIXBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMpIHtcbiAgICAgICAgdmFsaWRWZXJzaW9uID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdmFsaWRWZXJzaW9uO1xuICB9XG5cbiAgb3ZlcnJpZGUgYXN5bmMgcmVwb3J0QW5hbHl0aWNzKFxuICAgIHBhdGhzOiBzdHJpbmdbXSxcbiAgICBvcHRpb25zOiBBZGRDb21tYW5kU2NoZW1hICYgQXJndW1lbnRzLFxuICAgIGRpbWVuc2lvbnM6IChib29sZWFuIHwgbnVtYmVyIHwgc3RyaW5nKVtdID0gW10sXG4gICAgbWV0cmljczogKGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcpW10gPSBbXSxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IG9wdGlvbnMuY29sbGVjdGlvbjtcblxuICAgIC8vIEFkZCB0aGUgY29sbGVjdGlvbiBpZiBpdCdzIHNhZmUgbGlzdGVkLlxuICAgIGlmIChjb2xsZWN0aW9uICYmIGlzUGFja2FnZU5hbWVTYWZlRm9yQW5hbHl0aWNzKGNvbGxlY3Rpb24pKSB7XG4gICAgICBkaW1lbnNpb25zW2FuYWx5dGljcy5OZ0NsaUFuYWx5dGljc0RpbWVuc2lvbnMuTmdBZGRDb2xsZWN0aW9uXSA9IGNvbGxlY3Rpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlbGV0ZSBkaW1lbnNpb25zW2FuYWx5dGljcy5OZ0NsaUFuYWx5dGljc0RpbWVuc2lvbnMuTmdBZGRDb2xsZWN0aW9uXTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXIucmVwb3J0QW5hbHl0aWNzKHBhdGhzLCBvcHRpb25zLCBkaW1lbnNpb25zLCBtZXRyaWNzKTtcbiAgfVxuXG4gIHByaXZhdGUgaXNQYWNrYWdlSW5zdGFsbGVkKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHRyeSB7XG4gICAgICByZXF1aXJlLnJlc29sdmUoam9pbihuYW1lLCAncGFja2FnZS5qc29uJyksIHsgcGF0aHM6IFt0aGlzLmNvbnRleHQucm9vdF0gfSk7XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlLmNvZGUgIT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IHN0cmluZ1tdID0gW10sXG4gICk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHJ1bk9wdGlvbnM6IFJ1blNjaGVtYXRpY09wdGlvbnMgPSB7XG4gICAgICBzY2hlbWF0aWNPcHRpb25zOiBvcHRpb25zLFxuICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICBzY2hlbWF0aWNOYW1lOiAnbmctYWRkJyxcbiAgICAgIGRyeVJ1bjogZmFsc2UsXG4gICAgICBmb3JjZTogZmFsc2UsXG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5ydW5TY2hlbWF0aWMocnVuT3B0aW9ucyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb2RlUGFja2FnZURvZXNOb3RTdXBwb3J0U2NoZW1hdGljcykge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcih0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgVGhlIHBhY2thZ2UgdGhhdCB5b3UgYXJlIHRyeWluZyB0byBhZGQgZG9lcyBub3Qgc3VwcG9ydCBzY2hlbWF0aWNzLiBZb3UgY2FuIHRyeSB1c2luZ1xuICAgICAgICAgIGEgZGlmZmVyZW50IHZlcnNpb24gb2YgdGhlIHBhY2thZ2Ugb3IgY29udGFjdCB0aGUgcGFja2FnZSBhdXRob3IgdG8gYWRkIG5nLWFkZCBzdXBwb3J0LlxuICAgICAgICBgKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGZpbmRQcm9qZWN0VmVyc2lvbihuYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICBsZXQgaW5zdGFsbGVkUGFja2FnZTtcbiAgICB0cnkge1xuICAgICAgaW5zdGFsbGVkUGFja2FnZSA9IHJlcXVpcmUucmVzb2x2ZShqb2luKG5hbWUsICdwYWNrYWdlLmpzb24nKSwge1xuICAgICAgICBwYXRoczogW3RoaXMuY29udGV4dC5yb290XSxcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2gge31cblxuICAgIGlmIChpbnN0YWxsZWRQYWNrYWdlKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBpbnN0YWxsZWQgPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChkaXJuYW1lKGluc3RhbGxlZFBhY2thZ2UpLCB0aGlzLmxvZ2dlcik7XG5cbiAgICAgICAgcmV0dXJuIGluc3RhbGxlZC52ZXJzaW9uO1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cblxuICAgIGxldCBwcm9qZWN0TWFuaWZlc3Q7XG4gICAgdHJ5IHtcbiAgICAgIHByb2plY3RNYW5pZmVzdCA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KHRoaXMuY29udGV4dC5yb290LCB0aGlzLmxvZ2dlcik7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgaWYgKHByb2plY3RNYW5pZmVzdCkge1xuICAgICAgY29uc3QgdmVyc2lvbiA9IHByb2plY3RNYW5pZmVzdC5kZXBlbmRlbmNpZXNbbmFtZV0gfHwgcHJvamVjdE1hbmlmZXN0LmRldkRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgIGlmICh2ZXJzaW9uKSB7XG4gICAgICAgIHJldHVybiB2ZXJzaW9uO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBoYXNNaXNtYXRjaGVkUGVlcihtYW5pZmVzdDogUGFja2FnZU1hbmlmZXN0KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgZm9yIChjb25zdCBwZWVyIGluIG1hbmlmZXN0LnBlZXJEZXBlbmRlbmNpZXMpIHtcbiAgICAgIGxldCBwZWVySWRlbnRpZmllcjtcbiAgICAgIHRyeSB7XG4gICAgICAgIHBlZXJJZGVudGlmaWVyID0gbnBhLnJlc29sdmUocGVlciwgbWFuaWZlc3QucGVlckRlcGVuZGVuY2llc1twZWVyXSk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgSW52YWxpZCBwZWVyIGRlcGVuZGVuY3kgJHtwZWVyfSBmb3VuZCBpbiBwYWNrYWdlLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBlZXJJZGVudGlmaWVyLnR5cGUgPT09ICd2ZXJzaW9uJyB8fCBwZWVySWRlbnRpZmllci50eXBlID09PSAncmFuZ2UnKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGF3YWl0IHRoaXMuZmluZFByb2plY3RWZXJzaW9uKHBlZXIpO1xuICAgICAgICAgIGlmICghdmVyc2lvbikge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHsgaW5jbHVkZVByZXJlbGVhc2U6IHRydWUgfTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICFpbnRlcnNlY3RzKHZlcnNpb24sIHBlZXJJZGVudGlmaWVyLnJhd1NwZWMsIG9wdGlvbnMpICYmXG4gICAgICAgICAgICAhc2F0aXNmaWVzKHZlcnNpb24sIHBlZXJJZGVudGlmaWVyLnJhd1NwZWMsIG9wdGlvbnMpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIE5vdCBmb3VuZCBvciBpbnZhbGlkIHNvIGlnbm9yZVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB0eXBlID09PSAndGFnJyB8ICdmaWxlJyB8ICdkaXJlY3RvcnknIHwgJ3JlbW90ZScgfCAnZ2l0J1xuICAgICAgICAvLyBDYW5ub3QgYWNjdXJhdGVseSBjb21wYXJlIHRoZXNlIGFzIHRoZSB0YWcvbG9jYXRpb24gbWF5IGhhdmUgY2hhbmdlZCBzaW5jZSBpbnN0YWxsXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=