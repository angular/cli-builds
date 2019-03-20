"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const tools_1 = require("@angular-devkit/schematics/tools");
const path_1 = require("path");
const semver_1 = require("semver");
const analytics_1 = require("../models/analytics");
const schematic_command_1 = require("../models/schematic-command");
const npm_install_1 = require("../tasks/npm-install");
const package_manager_1 = require("../utilities/package-manager");
const package_metadata_1 = require("../utilities/package-metadata");
const npa = require('npm-package-arg');
class AddCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.allowPrivateSchematics = true;
        this.allowAdditionalArgs = true;
        this.packageManager = package_manager_1.getPackageManager(this.workspace.root);
    }
    async run(options) {
        if (!options.collection) {
            this.logger.fatal(`The "ng add" command requires a name argument to be specified eg. `
                + `${core_1.terminal.yellow('ng add [name] ')}. For more details, use "ng help".`);
            return 1;
        }
        let packageIdentifier;
        try {
            packageIdentifier = npa(options.collection);
        }
        catch (e) {
            this.logger.error(e.message);
            return 1;
        }
        if (packageIdentifier.registry && this.isPackageInstalled(packageIdentifier.name)) {
            // Already installed so just run schematic
            this.logger.info('Skipping installation: Package already installed');
            return this.executeSchematic(packageIdentifier.name, options['--']);
        }
        const usingYarn = this.packageManager === 'yarn';
        if (packageIdentifier.type === 'tag' && !packageIdentifier.rawSpec) {
            // only package name provided; search for viable version
            // plus special cases for packages that did not have peer deps setup
            let packageMetadata;
            try {
                packageMetadata = await package_metadata_1.fetchPackageMetadata(packageIdentifier.name, this.logger, { usingYarn });
            }
            catch (e) {
                this.logger.error('Unable to fetch package metadata: ' + e.message);
                return 1;
            }
            const latestManifest = packageMetadata.tags['latest'];
            if (latestManifest && Object.keys(latestManifest.peerDependencies).length === 0) {
                if (latestManifest.name === '@angular/pwa') {
                    const version = await this.findProjectVersion('@angular/cli');
                    // tslint:disable-next-line:no-any
                    const semverOptions = { includePrerelease: true };
                    if (version
                        && ((semver_1.validRange(version) && semver_1.intersects(version, '7', semverOptions))
                            || (semver_1.valid(version) && semver_1.satisfies(version, '7', semverOptions)))) {
                        packageIdentifier = npa.resolve('@angular/pwa', '0.12');
                    }
                }
            }
            else if (!latestManifest || (await this.hasMismatchedPeer(latestManifest))) {
                // 'latest' is invalid so search for most recent matching package
                const versionManifests = Array.from(packageMetadata.versions.values())
                    .filter(value => !semver_1.prerelease(value.version));
                versionManifests.sort((a, b) => semver_1.rcompare(a.version, b.version, true));
                let newIdentifier;
                for (const versionManifest of versionManifests) {
                    if (!(await this.hasMismatchedPeer(versionManifest))) {
                        newIdentifier = npa.resolve(packageIdentifier.name, versionManifest.version);
                        break;
                    }
                }
                if (!newIdentifier) {
                    this.logger.warn('Unable to find compatible package.  Using \'latest\'.');
                }
                else {
                    packageIdentifier = newIdentifier;
                }
            }
        }
        let collectionName = packageIdentifier.name;
        if (!packageIdentifier.registry) {
            try {
                const manifest = await package_metadata_1.fetchPackageManifest(packageIdentifier, this.logger, { usingYarn });
                collectionName = manifest.name;
                if (await this.hasMismatchedPeer(manifest)) {
                    console.warn('Package has unmet peer dependencies. Adding the package may not succeed.');
                }
            }
            catch (e) {
                this.logger.error('Unable to fetch package manifest: ' + e.message);
                return 1;
            }
        }
        await npm_install_1.default(packageIdentifier.raw, this.logger, this.packageManager, this.workspace.root);
        return this.executeSchematic(collectionName, options['--']);
    }
    async reportAnalytics(paths, options, dimensions = [], metrics = []) {
        const collection = options.collection;
        // Add the collection if it's safe listed.
        if (collection && analytics_1.isPackageNameSafeForAnalytics(collection)) {
            dimensions[analytics_1.AnalyticsDimensions.NgAddCollection] = collection;
        }
        else {
            delete dimensions[analytics_1.AnalyticsDimensions.NgAddCollection];
        }
        return super.reportAnalytics(paths, options, dimensions, metrics);
    }
    isPackageInstalled(name) {
        try {
            node_1.resolve(name, {
                checkLocal: true,
                basedir: this.workspace.root,
                resolvePackageJson: true,
            });
            return true;
        }
        catch (e) {
            if (!(e instanceof node_1.ModuleNotFoundException)) {
                throw e;
            }
        }
        return false;
    }
    async executeSchematic(collectionName, options = []) {
        const runOptions = {
            schematicOptions: options,
            workingDir: this.workspace.root,
            collectionName,
            schematicName: 'ng-add',
            allowPrivate: true,
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
            installedPackage = node_1.resolve(name, { checkLocal: true, basedir: this.workspace.root, resolvePackageJson: true });
        }
        catch (_a) { }
        if (installedPackage) {
            try {
                const installed = await package_metadata_1.fetchPackageManifest(path_1.dirname(installedPackage), this.logger);
                return installed.version;
            }
            catch (_b) { }
        }
        let projectManifest;
        try {
            projectManifest = await package_metadata_1.fetchPackageManifest(this.workspace.root, this.logger);
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
                peerIdentifier = npa.resolve(peer, manifest.peerDependencies[peer]);
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
                    // tslint:disable-next-line:no-any
                    const options = { includePrerelease: true };
                    if (!semver_1.intersects(version, peerIdentifier.rawSpec, options)
                        && !semver_1.satisfies(version, peerIdentifier.rawSpec, options)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2FkZC1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQXNEO0FBQ3RELG9EQUE2RTtBQUM3RSw0REFBdUY7QUFDdkYsK0JBQStCO0FBQy9CLG1DQUF3RjtBQUN4RixtREFBeUY7QUFFekYsbUVBQStEO0FBQy9ELHNEQUE4QztBQUM5QyxrRUFBaUU7QUFDakUsb0VBSXVDO0FBR3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBRXZDLE1BQWEsVUFBVyxTQUFRLG9DQUFrQztJQUFsRTs7UUFDVywyQkFBc0IsR0FBRyxJQUFJLENBQUM7UUFDOUIsd0JBQW1CLEdBQUcsSUFBSSxDQUFDO1FBQzNCLG1CQUFjLEdBQUcsbUNBQWlCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQXdQbkUsQ0FBQztJQXRQQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQXFDO1FBQzdDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNmLG9FQUFvRTtrQkFDbEUsR0FBRyxlQUFRLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLG9DQUFvQyxDQUMzRSxDQUFDO1lBRUYsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELElBQUksaUJBQWlCLENBQUM7UUFDdEIsSUFBSTtZQUNGLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDN0M7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUU3QixPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsSUFBSSxpQkFB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T0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0NBQ0Y7QUEzUEQsZ0NBMlBDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgdGFncywgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBNb2R1bGVOb3RGb3VuZEV4Y2VwdGlvbiwgcmVzb2x2ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlL25vZGUnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VEb2VzTm90U3VwcG9ydFNjaGVtYXRpY3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBpbnRlcnNlY3RzLCBwcmVyZWxlYXNlLCByY29tcGFyZSwgc2F0aXNmaWVzLCB2YWxpZCwgdmFsaWRSYW5nZSB9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBBbmFseXRpY3NEaW1lbnNpb25zLCBpc1BhY2thZ2VOYW1lU2FmZUZvckFuYWx5dGljcyB9IGZyb20gJy4uL21vZGVscy9hbmFseXRpY3MnO1xuaW1wb3J0IHsgQXJndW1lbnRzIH0gZnJvbSAnLi4vbW9kZWxzL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBTY2hlbWF0aWNDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL3NjaGVtYXRpYy1jb21tYW5kJztcbmltcG9ydCBucG1JbnN0YWxsIGZyb20gJy4uL3Rhc2tzL25wbS1pbnN0YWxsJztcbmltcG9ydCB7IGdldFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWFuYWdlcic7XG5pbXBvcnQge1xuICBQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNZXRhZGF0YSxcbn0gZnJvbSAnLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWV0YWRhdGEnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEFkZENvbW1hbmRTY2hlbWEgfSBmcm9tICcuL2FkZCc7XG5cbmNvbnN0IG5wYSA9IHJlcXVpcmUoJ25wbS1wYWNrYWdlLWFyZycpO1xuXG5leHBvcnQgY2xhc3MgQWRkQ29tbWFuZCBleHRlbmRzIFNjaGVtYXRpY0NvbW1hbmQ8QWRkQ29tbWFuZFNjaGVtYT4ge1xuICByZWFkb25seSBhbGxvd1ByaXZhdGVTY2hlbWF0aWNzID0gdHJ1ZTtcbiAgcmVhZG9ubHkgYWxsb3dBZGRpdGlvbmFsQXJncyA9IHRydWU7XG4gIHJlYWRvbmx5IHBhY2thZ2VNYW5hZ2VyID0gZ2V0UGFja2FnZU1hbmFnZXIodGhpcy53b3Jrc3BhY2Uucm9vdCk7XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IEFkZENvbW1hbmRTY2hlbWEgJiBBcmd1bWVudHMpIHtcbiAgICBpZiAoIW9wdGlvbnMuY29sbGVjdGlvbikge1xuICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoXG4gICAgICAgIGBUaGUgXCJuZyBhZGRcIiBjb21tYW5kIHJlcXVpcmVzIGEgbmFtZSBhcmd1bWVudCB0byBiZSBzcGVjaWZpZWQgZWcuIGBcbiAgICAgICAgKyBgJHt0ZXJtaW5hbC55ZWxsb3coJ25nIGFkZCBbbmFtZV0gJyl9LiBGb3IgbW9yZSBkZXRhaWxzLCB1c2UgXCJuZyBoZWxwXCIuYCxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGxldCBwYWNrYWdlSWRlbnRpZmllcjtcbiAgICB0cnkge1xuICAgICAgcGFja2FnZUlkZW50aWZpZXIgPSBucGEob3B0aW9ucy5jb2xsZWN0aW9uKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcihlLm1lc3NhZ2UpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBpZiAocGFja2FnZUlkZW50aWZpZXIucmVnaXN0cnkgJiYgdGhpcy5pc1BhY2thZ2VJbnN0YWxsZWQocGFja2FnZUlkZW50aWZpZXIubmFtZSkpIHtcbiAgICAgIC8vIEFscmVhZHkgaW5zdGFsbGVkIHNvIGp1c3QgcnVuIHNjaGVtYXRpY1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbygnU2tpcHBpbmcgaW5zdGFsbGF0aW9uOiBQYWNrYWdlIGFscmVhZHkgaW5zdGFsbGVkJyk7XG5cbiAgICAgIHJldHVybiB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMocGFja2FnZUlkZW50aWZpZXIubmFtZSwgb3B0aW9uc1snLS0nXSk7XG4gICAgfVxuXG4gICAgY29uc3QgdXNpbmdZYXJuID0gdGhpcy5wYWNrYWdlTWFuYWdlciA9PT0gJ3lhcm4nO1xuXG4gICAgaWYgKHBhY2thZ2VJZGVudGlmaWVyLnR5cGUgPT09ICd0YWcnICYmICFwYWNrYWdlSWRlbnRpZmllci5yYXdTcGVjKSB7XG4gICAgICAvLyBvbmx5IHBhY2thZ2UgbmFtZSBwcm92aWRlZDsgc2VhcmNoIGZvciB2aWFibGUgdmVyc2lvblxuICAgICAgLy8gcGx1cyBzcGVjaWFsIGNhc2VzIGZvciBwYWNrYWdlcyB0aGF0IGRpZCBub3QgaGF2ZSBwZWVyIGRlcHMgc2V0dXBcbiAgICAgIGxldCBwYWNrYWdlTWV0YWRhdGE7XG4gICAgICB0cnkge1xuICAgICAgICBwYWNrYWdlTWV0YWRhdGEgPSBhd2FpdCBmZXRjaFBhY2thZ2VNZXRhZGF0YShcbiAgICAgICAgICBwYWNrYWdlSWRlbnRpZmllci5uYW1lLFxuICAgICAgICAgIHRoaXMubG9nZ2VyLFxuICAgICAgICAgIHsgdXNpbmdZYXJuIH0sXG4gICAgICAgICk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdVbmFibGUgdG8gZmV0Y2ggcGFja2FnZSBtZXRhZGF0YTogJyArIGUubWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGxhdGVzdE1hbmlmZXN0ID0gcGFja2FnZU1ldGFkYXRhLnRhZ3NbJ2xhdGVzdCddO1xuICAgICAgaWYgKGxhdGVzdE1hbmlmZXN0ICYmIE9iamVjdC5rZXlzKGxhdGVzdE1hbmlmZXN0LnBlZXJEZXBlbmRlbmNpZXMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBpZiAobGF0ZXN0TWFuaWZlc3QubmFtZSA9PT0gJ0Bhbmd1bGFyL3B3YScpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gYXdhaXQgdGhpcy5maW5kUHJvamVjdFZlcnNpb24oJ0Bhbmd1bGFyL2NsaScpO1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgICBjb25zdCBzZW12ZXJPcHRpb25zID0geyBpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZSB9IGFzIGFueTtcblxuICAgICAgICAgIGlmICh2ZXJzaW9uXG4gICAgICAgICAgICAgICYmICgodmFsaWRSYW5nZSh2ZXJzaW9uKSAmJiBpbnRlcnNlY3RzKHZlcnNpb24sICc3Jywgc2VtdmVyT3B0aW9ucykpXG4gICAgICAgICAgICAgICAgICB8fCAodmFsaWQodmVyc2lvbikgJiYgc2F0aXNmaWVzKHZlcnNpb24sICc3Jywgc2VtdmVyT3B0aW9ucykpKSkge1xuICAgICAgICAgICAgcGFja2FnZUlkZW50aWZpZXIgPSBucGEucmVzb2x2ZSgnQGFuZ3VsYXIvcHdhJywgJzAuMTInKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIWxhdGVzdE1hbmlmZXN0IHx8IChhd2FpdCB0aGlzLmhhc01pc21hdGNoZWRQZWVyKGxhdGVzdE1hbmlmZXN0KSkpIHtcbiAgICAgICAgLy8gJ2xhdGVzdCcgaXMgaW52YWxpZCBzbyBzZWFyY2ggZm9yIG1vc3QgcmVjZW50IG1hdGNoaW5nIHBhY2thZ2VcbiAgICAgICAgY29uc3QgdmVyc2lvbk1hbmlmZXN0cyA9IEFycmF5LmZyb20ocGFja2FnZU1ldGFkYXRhLnZlcnNpb25zLnZhbHVlcygpKVxuICAgICAgICAgIC5maWx0ZXIodmFsdWUgPT4gIXByZXJlbGVhc2UodmFsdWUudmVyc2lvbikpO1xuXG4gICAgICAgIHZlcnNpb25NYW5pZmVzdHMuc29ydCgoYSwgYikgPT4gcmNvbXBhcmUoYS52ZXJzaW9uLCBiLnZlcnNpb24sIHRydWUpKTtcblxuICAgICAgICBsZXQgbmV3SWRlbnRpZmllcjtcbiAgICAgICAgZm9yIChjb25zdCB2ZXJzaW9uTWFuaWZlc3Qgb2YgdmVyc2lvbk1hbmlmZXN0cykge1xuICAgICAgICAgIGlmICghKGF3YWl0IHRoaXMuaGFzTWlzbWF0Y2hlZFBlZXIodmVyc2lvbk1hbmlmZXN0KSkpIHtcbiAgICAgICAgICAgIG5ld0lkZW50aWZpZXIgPSBucGEucmVzb2x2ZShwYWNrYWdlSWRlbnRpZmllci5uYW1lLCB2ZXJzaW9uTWFuaWZlc3QudmVyc2lvbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5ld0lkZW50aWZpZXIpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdVbmFibGUgdG8gZmluZCBjb21wYXRpYmxlIHBhY2thZ2UuICBVc2luZyBcXCdsYXRlc3RcXCcuJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFja2FnZUlkZW50aWZpZXIgPSBuZXdJZGVudGlmaWVyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGNvbGxlY3Rpb25OYW1lID0gcGFja2FnZUlkZW50aWZpZXIubmFtZTtcbiAgICBpZiAoIXBhY2thZ2VJZGVudGlmaWVyLnJlZ2lzdHJ5KSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBtYW5pZmVzdCA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KFxuICAgICAgICAgIHBhY2thZ2VJZGVudGlmaWVyLFxuICAgICAgICAgIHRoaXMubG9nZ2VyLFxuICAgICAgICAgIHsgdXNpbmdZYXJuIH0sXG4gICAgICAgICk7XG5cbiAgICAgICAgY29sbGVjdGlvbk5hbWUgPSBtYW5pZmVzdC5uYW1lO1xuXG4gICAgICAgIGlmIChhd2FpdCB0aGlzLmhhc01pc21hdGNoZWRQZWVyKG1hbmlmZXN0KSkge1xuICAgICAgICAgIGNvbnNvbGUud2FybignUGFja2FnZSBoYXMgdW5tZXQgcGVlciBkZXBlbmRlbmNpZXMuIEFkZGluZyB0aGUgcGFja2FnZSBtYXkgbm90IHN1Y2NlZWQuJyk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1VuYWJsZSB0byBmZXRjaCBwYWNrYWdlIG1hbmlmZXN0OiAnICsgZS5tZXNzYWdlKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCBucG1JbnN0YWxsKFxuICAgICAgcGFja2FnZUlkZW50aWZpZXIucmF3LFxuICAgICAgdGhpcy5sb2dnZXIsXG4gICAgICB0aGlzLnBhY2thZ2VNYW5hZ2VyLFxuICAgICAgdGhpcy53b3Jrc3BhY2Uucm9vdCxcbiAgICApO1xuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyhjb2xsZWN0aW9uTmFtZSwgb3B0aW9uc1snLS0nXSk7XG4gIH1cblxuICBhc3luYyByZXBvcnRBbmFseXRpY3MoXG4gICAgcGF0aHM6IHN0cmluZ1tdLFxuICAgIG9wdGlvbnM6IEFkZENvbW1hbmRTY2hlbWEgJiBBcmd1bWVudHMsXG4gICAgZGltZW5zaW9uczogKGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcpW10gPSBbXSxcbiAgICBtZXRyaWNzOiAoYm9vbGVhbiB8IG51bWJlciB8IHN0cmluZylbXSA9IFtdLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gb3B0aW9ucy5jb2xsZWN0aW9uO1xuXG4gICAgLy8gQWRkIHRoZSBjb2xsZWN0aW9uIGlmIGl0J3Mgc2FmZSBsaXN0ZWQuXG4gICAgaWYgKGNvbGxlY3Rpb24gJiYgaXNQYWNrYWdlTmFtZVNhZmVGb3JBbmFseXRpY3MoY29sbGVjdGlvbikpIHtcbiAgICAgIGRpbWVuc2lvbnNbQW5hbHl0aWNzRGltZW5zaW9ucy5OZ0FkZENvbGxlY3Rpb25dID0gY29sbGVjdGlvbjtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIGRpbWVuc2lvbnNbQW5hbHl0aWNzRGltZW5zaW9ucy5OZ0FkZENvbGxlY3Rpb25dO1xuICAgIH1cblxuICAgIHJldHVybiBzdXBlci5yZXBvcnRBbmFseXRpY3MocGF0aHMsIG9wdGlvbnMsIGRpbWVuc2lvbnMsIG1ldHJpY3MpO1xuICB9XG5cbiAgcHJpdmF0ZSBpc1BhY2thZ2VJbnN0YWxsZWQobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgdHJ5IHtcbiAgICAgIHJlc29sdmUobmFtZSwge1xuICAgICAgICBjaGVja0xvY2FsOiB0cnVlLFxuICAgICAgICBiYXNlZGlyOiB0aGlzLndvcmtzcGFjZS5yb290LFxuICAgICAgICByZXNvbHZlUGFja2FnZUpzb246IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIE1vZHVsZU5vdEZvdW5kRXhjZXB0aW9uKSkge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IHN0cmluZ1tdID0gW10sXG4gICk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHJ1bk9wdGlvbnMgPSB7XG4gICAgICBzY2hlbWF0aWNPcHRpb25zOiBvcHRpb25zLFxuICAgICAgd29ya2luZ0RpcjogdGhpcy53b3Jrc3BhY2Uucm9vdCxcbiAgICAgIGNvbGxlY3Rpb25OYW1lLFxuICAgICAgc2NoZW1hdGljTmFtZTogJ25nLWFkZCcsXG4gICAgICBhbGxvd1ByaXZhdGU6IHRydWUsXG4gICAgICBkcnlSdW46IGZhbHNlLFxuICAgICAgZm9yY2U6IGZhbHNlLFxuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuU2NoZW1hdGljKHJ1bk9wdGlvbnMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9kZVBhY2thZ2VEb2VzTm90U3VwcG9ydFNjaGVtYXRpY3MpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IodGFncy5vbmVMaW5lYFxuICAgICAgICAgIFRoZSBwYWNrYWdlIHRoYXQgeW91IGFyZSB0cnlpbmcgdG8gYWRkIGRvZXMgbm90IHN1cHBvcnQgc2NoZW1hdGljcy4gWW91IGNhbiB0cnkgdXNpbmdcbiAgICAgICAgICBhIGRpZmZlcmVudCB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIG9yIGNvbnRhY3QgdGhlIHBhY2thZ2UgYXV0aG9yIHRvIGFkZCBuZy1hZGQgc3VwcG9ydC5cbiAgICAgICAgYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmaW5kUHJvamVjdFZlcnNpb24obmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgbGV0IGluc3RhbGxlZFBhY2thZ2U7XG4gICAgdHJ5IHtcbiAgICAgIGluc3RhbGxlZFBhY2thZ2UgPSByZXNvbHZlKFxuICAgICAgICBuYW1lLFxuICAgICAgICB7IGNoZWNrTG9jYWw6IHRydWUsIGJhc2VkaXI6IHRoaXMud29ya3NwYWNlLnJvb3QsIHJlc29sdmVQYWNrYWdlSnNvbjogdHJ1ZSB9LFxuICAgICAgKTtcbiAgICB9IGNhdGNoIHsgfVxuXG4gICAgaWYgKGluc3RhbGxlZFBhY2thZ2UpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGluc3RhbGxlZCA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KGRpcm5hbWUoaW5zdGFsbGVkUGFja2FnZSksIHRoaXMubG9nZ2VyKTtcblxuICAgICAgICByZXR1cm4gaW5zdGFsbGVkLnZlcnNpb247XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfVxuXG4gICAgbGV0IHByb2plY3RNYW5pZmVzdDtcbiAgICB0cnkge1xuICAgICAgcHJvamVjdE1hbmlmZXN0ID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWFuaWZlc3QodGhpcy53b3Jrc3BhY2Uucm9vdCwgdGhpcy5sb2dnZXIpO1xuICAgIH0gY2F0Y2gge31cblxuICAgIGlmIChwcm9qZWN0TWFuaWZlc3QpIHtcbiAgICAgIGNvbnN0IHZlcnNpb24gPSBwcm9qZWN0TWFuaWZlc3QuZGVwZW5kZW5jaWVzW25hbWVdIHx8IHByb2plY3RNYW5pZmVzdC5kZXZEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICBpZiAodmVyc2lvbikge1xuICAgICAgICByZXR1cm4gdmVyc2lvbjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFzTWlzbWF0Y2hlZFBlZXIobWFuaWZlc3Q6IFBhY2thZ2VNYW5pZmVzdCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgcGVlciBpbiBtYW5pZmVzdC5wZWVyRGVwZW5kZW5jaWVzKSB7XG4gICAgICBsZXQgcGVlcklkZW50aWZpZXI7XG4gICAgICB0cnkge1xuICAgICAgICBwZWVySWRlbnRpZmllciA9IG5wYS5yZXNvbHZlKHBlZXIsIG1hbmlmZXN0LnBlZXJEZXBlbmRlbmNpZXNbcGVlcl0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYEludmFsaWQgcGVlciBkZXBlbmRlbmN5ICR7cGVlcn0gZm91bmQgaW4gcGFja2FnZS5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwZWVySWRlbnRpZmllci50eXBlID09PSAndmVyc2lvbicgfHwgcGVlcklkZW50aWZpZXIudHlwZSA9PT0gJ3JhbmdlJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBhd2FpdCB0aGlzLmZpbmRQcm9qZWN0VmVyc2lvbihwZWVyKTtcbiAgICAgICAgICBpZiAoIXZlcnNpb24pIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgICBjb25zdCBvcHRpb25zID0geyBpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZSB9IGFzIGFueTtcblxuICAgICAgICAgIGlmICghaW50ZXJzZWN0cyh2ZXJzaW9uLCBwZWVySWRlbnRpZmllci5yYXdTcGVjLCBvcHRpb25zKVxuICAgICAgICAgICAgICAmJiAhc2F0aXNmaWVzKHZlcnNpb24sIHBlZXJJZGVudGlmaWVyLnJhd1NwZWMsIG9wdGlvbnMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIE5vdCBmb3VuZCBvciBpbnZhbGlkIHNvIGlnbm9yZVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB0eXBlID09PSAndGFnJyB8ICdmaWxlJyB8ICdkaXJlY3RvcnknIHwgJ3JlbW90ZScgfCAnZ2l0J1xuICAgICAgICAvLyBDYW5ub3QgYWNjdXJhdGVseSBjb21wYXJlIHRoZXNlIGFzIHRoZSB0YWcvbG9jYXRpb24gbWF5IGhhdmUgY2hhbmdlZCBzaW5jZSBpbnN0YWxsXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiJdfQ==