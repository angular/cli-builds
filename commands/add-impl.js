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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2FkZC1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQXNEO0FBQ3RELG9EQUE2RTtBQUM3RSw0REFBdUY7QUFDdkYsK0JBQStCO0FBQy9CLG1DQUF3RjtBQUV4RixtRUFBK0Q7QUFDL0Qsc0RBQThDO0FBQzlDLGtFQUFpRTtBQUNqRSxvRUFJdUM7QUFHdkMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFFdkMsTUFBYSxVQUFXLFNBQVEsb0NBQWtDO0lBQWxFOztRQUNXLDJCQUFzQixHQUFHLElBQUksQ0FBQztRQUM5Qix3QkFBbUIsR0FBRyxJQUFJLENBQUM7UUFDM0IsbUJBQWMsR0FBRyxtQ0FBaUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBc09uRSxDQUFDO0lBcE9DLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBcUM7UUFDN0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUU7WUFDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2Ysb0VBQW9FO2tCQUNsRSxHQUFHLGVBQVEsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsb0NBQW9DLENBQzNFLENBQUM7WUFFRixPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsSUFBSSxpQkFBaUIsQ0FBQztRQUN0QixJQUFJO1lBQ0YsaUJBQWlCLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUM3QztRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRTdCLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFFRCxJQUFJLGlCQUFpQixDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDakYsMENBQTBDO1lBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtEQUFrRCxDQUFDLENBQUM7WUFFckUsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ3JFO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsS0FBSyxNQUFNLENBQUM7UUFFakQsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFO1lBQ2xFLHdEQUF3RDtZQUN4RCxvRUFBb0U7WUFDcEUsSUFBSSxlQUFlLENBQUM7WUFDcEIsSUFBSTtnQkFDRixlQUFlLEdBQUcsTUFBTSx1Q0FBb0IsQ0FDMUMsaUJBQWlCLENBQUMsSUFBSSxFQUN0QixJQUFJLENBQUMsTUFBTSxFQUNYLEVBQUUsU0FBUyxFQUFFLENBQ2QsQ0FBQzthQUNIO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsb0NBQW9DLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUVwRSxPQUFPLENBQUMsQ0FBQzthQUNWO1lBRUQsTUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN0RCxJQUFJLGNBQWMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQy9FLElBQUksY0FBYyxDQUFDLElBQUksS0FBSyxjQUFjLEVBQUU7b0JBQzFDLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUM5RCxrQ0FBa0M7b0JBQ2xDLE1BQU0sYUFBYSxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFTLENBQUM7b0JBRXpELElBQUksT0FBTzsyQkFDSixDQUFDLENBQUMsbUJBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxtQkFBVSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7K0JBQzdELENBQUMsY0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLGtCQUFTLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQ3RFLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO3FCQUN6RDtpQkFDRjthQUNGO2lCQUFNLElBQUksQ0FBQyxjQUFjLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFO2dCQUM1RSxpRUFBaUU7Z0JBQ2pFLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO3FCQUNuRSxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLG1CQUFVLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBRS9DLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLGlCQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBRXRFLElBQUksYUFBYSxDQUFDO2dCQUNsQixLQUFLLE1BQU0sZUFBZSxJQUFJLGdCQUFnQixFQUFFO29CQUM5QyxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFO3dCQUNwRCxhQUFhLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUM3RSxNQUFNO3FCQUNQO2lCQUNGO2dCQUVELElBQUksQ0FBQyxhQUFhLEVBQUU7b0JBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHVEQUF1RCxDQUFDLENBQUM7aUJBQzNFO3FCQUFNO29CQUNMLGlCQUFpQixHQUFHLGFBQWEsQ0FBQztpQkFDbkM7YUFDRjtTQUNGO1FBRUQsSUFBSSxjQUFjLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDO1FBQzVDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUU7WUFDL0IsSUFBSTtnQkFDRixNQUFNLFFBQVEsR0FBRyxNQUFNLHVDQUFvQixDQUN6QyxpQkFBaUIsRUFDakIsSUFBSSxDQUFDLE1BQU0sRUFDWCxFQUFFLFNBQVMsRUFBRSxDQUNkLENBQUM7Z0JBRUYsY0FBYyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBRS9CLElBQUksTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQzFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsMEVBQTBFLENBQUMsQ0FBQztpQkFDMUY7YUFDRjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFFcEUsT0FBTyxDQUFDLENBQUM7YUFDVjtTQUNGO1FBRUQsTUFBTSxxQkFBVSxDQUNkLGlCQUFpQixDQUFDLEdBQUcsRUFDckIsSUFBSSxDQUFDLE1BQU0sRUFDWCxJQUFJLENBQUMsY0FBYyxFQUNuQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDcEIsQ0FBQztRQUVGLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRU8sa0JBQWtCLENBQUMsSUFBWTtRQUNyQyxJQUFJO1lBQ0YsY0FBTyxDQUFDLElBQUksRUFBRTtnQkFDWixVQUFVLEVBQUUsSUFBSTtnQkFDaEIsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSTtnQkFDNUIsa0JBQWtCLEVBQUUsSUFBSTthQUN6QixDQUFDLENBQUM7WUFFSCxPQUFPLElBQUksQ0FBQztTQUNiO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksOEJBQXVCLENBQUMsRUFBRTtnQkFDM0MsTUFBTSxDQUFDLENBQUM7YUFDVDtTQUNGO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRU8sS0FBSyxDQUFDLGdCQUFnQixDQUM1QixjQUFzQixFQUN0QixVQUFvQixFQUFFO1FBRXRCLE1BQU0sVUFBVSxHQUFHO1lBQ2pCLGdCQUFnQixFQUFFLE9BQU87WUFDekIsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSTtZQUMvQixjQUFjO1lBQ2QsYUFBYSxFQUFFLFFBQVE7WUFDdkIsWUFBWSxFQUFFLElBQUk7WUFDbEIsTUFBTSxFQUFFLEtBQUs7WUFDYixLQUFLLEVBQUUsS0FBSztTQUNiLENBQUM7UUFFRixJQUFJO1lBQ0YsT0FBTyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDNUM7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLElBQUksQ0FBQyxZQUFZLDJDQUFtQyxFQUFFO2dCQUNwRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFJLENBQUMsT0FBTyxDQUFBOzs7U0FHN0IsQ0FBQyxDQUFDO2dCQUVILE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7WUFFRCxNQUFNLENBQUMsQ0FBQztTQUNUO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxJQUFZO1FBQzNDLElBQUksZ0JBQWdCLENBQUM7UUFDckIsSUFBSTtZQUNGLGdCQUFnQixHQUFHLGNBQU8sQ0FDeEIsSUFBSSxFQUNKLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLENBQzdFLENBQUM7U0FDSDtRQUFDLFdBQU0sR0FBRztRQUVYLElBQUksZ0JBQWdCLEVBQUU7WUFDcEIsSUFBSTtnQkFDRixNQUFNLFNBQVMsR0FBRyxNQUFNLHVDQUFvQixDQUFDLGNBQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFFckYsT0FBTyxTQUFTLENBQUMsT0FBTyxDQUFDO2FBQzFCO1lBQUMsV0FBTSxHQUFFO1NBQ1g7UUFFRCxJQUFJLGVBQWUsQ0FBQztRQUNwQixJQUFJO1lBQ0YsZUFBZSxHQUFHLE1BQU0sdUNBQW9CLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ2hGO1FBQUMsV0FBTSxHQUFFO1FBRVYsSUFBSSxlQUFlLEVBQUU7WUFDbkIsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxlQUFlLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzVGLElBQUksT0FBTyxFQUFFO2dCQUNYLE9BQU8sT0FBTyxDQUFDO2FBQ2hCO1NBQ0Y7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCLENBQUMsUUFBeUI7UUFDdkQsS0FBSyxNQUFNLElBQUksSUFBSSxRQUFRLENBQUMsZ0JBQWdCLEVBQUU7WUFDNUMsSUFBSSxjQUFjLENBQUM7WUFDbkIsSUFBSTtnQkFDRixjQUFjLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDckU7WUFBQyxXQUFNO2dCQUNOLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDJCQUEyQixJQUFJLG9CQUFvQixDQUFDLENBQUM7Z0JBQ3RFLFNBQVM7YUFDVjtZQUVELElBQUksY0FBYyxDQUFDLElBQUksS0FBSyxTQUFTLElBQUksY0FBYyxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUU7Z0JBQ3hFLElBQUk7b0JBQ0YsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3BELElBQUksQ0FBQyxPQUFPLEVBQUU7d0JBQ1osU0FBUztxQkFDVjtvQkFFRCxrQ0FBa0M7b0JBQ2xDLE1BQU0sT0FBTyxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFTLENBQUM7b0JBRW5ELElBQUksQ0FBQyxtQkFBVSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQzsyQkFDbEQsQ0FBQyxrQkFBUyxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUFFO3dCQUMzRCxPQUFPLElBQUksQ0FBQztxQkFDYjtpQkFDRjtnQkFBQyxXQUFNO29CQUNOLGlDQUFpQztvQkFDakMsU0FBUztpQkFDVjthQUNGO2lCQUFNO2dCQUNMLDJEQUEyRDtnQkFDM0QscUZBQXFGO2FBQ3RGO1NBRUY7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7Q0FDRjtBQXpPRCxnQ0F5T0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyB0YWdzLCB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE1vZHVsZU5vdEZvdW5kRXhjZXB0aW9uLCByZXNvbHZlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZURvZXNOb3RTdXBwb3J0U2NoZW1hdGljcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGludGVyc2VjdHMsIHByZXJlbGVhc2UsIHJjb21wYXJlLCBzYXRpc2ZpZXMsIHZhbGlkLCB2YWxpZFJhbmdlIH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IEFyZ3VtZW50cyB9IGZyb20gJy4uL21vZGVscy9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgU2NoZW1hdGljQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZCc7XG5pbXBvcnQgbnBtSW5zdGFsbCBmcm9tICcuLi90YXNrcy9ucG0taW5zdGFsbCc7XG5pbXBvcnQgeyBnZXRQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXInO1xuaW1wb3J0IHtcbiAgUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNYW5pZmVzdCxcbiAgZmV0Y2hQYWNrYWdlTWV0YWRhdGEsXG59IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLW1ldGFkYXRhJztcbmltcG9ydCB7IFNjaGVtYSBhcyBBZGRDb21tYW5kU2NoZW1hIH0gZnJvbSAnLi9hZGQnO1xuXG5jb25zdCBucGEgPSByZXF1aXJlKCducG0tcGFja2FnZS1hcmcnKTtcblxuZXhwb3J0IGNsYXNzIEFkZENvbW1hbmQgZXh0ZW5kcyBTY2hlbWF0aWNDb21tYW5kPEFkZENvbW1hbmRTY2hlbWE+IHtcbiAgcmVhZG9ubHkgYWxsb3dQcml2YXRlU2NoZW1hdGljcyA9IHRydWU7XG4gIHJlYWRvbmx5IGFsbG93QWRkaXRpb25hbEFyZ3MgPSB0cnVlO1xuICByZWFkb25seSBwYWNrYWdlTWFuYWdlciA9IGdldFBhY2thZ2VNYW5hZ2VyKHRoaXMud29ya3NwYWNlLnJvb3QpO1xuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBBZGRDb21tYW5kU2NoZW1hICYgQXJndW1lbnRzKSB7XG4gICAgaWYgKCFvcHRpb25zLmNvbGxlY3Rpb24pIHtcbiAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKFxuICAgICAgICBgVGhlIFwibmcgYWRkXCIgY29tbWFuZCByZXF1aXJlcyBhIG5hbWUgYXJndW1lbnQgdG8gYmUgc3BlY2lmaWVkIGVnLiBgXG4gICAgICAgICsgYCR7dGVybWluYWwueWVsbG93KCduZyBhZGQgW25hbWVdICcpfS4gRm9yIG1vcmUgZGV0YWlscywgdXNlIFwibmcgaGVscFwiLmAsXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBsZXQgcGFja2FnZUlkZW50aWZpZXI7XG4gICAgdHJ5IHtcbiAgICAgIHBhY2thZ2VJZGVudGlmaWVyID0gbnBhKG9wdGlvbnMuY29sbGVjdGlvbik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoZS5tZXNzYWdlKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgaWYgKHBhY2thZ2VJZGVudGlmaWVyLnJlZ2lzdHJ5ICYmIHRoaXMuaXNQYWNrYWdlSW5zdGFsbGVkKHBhY2thZ2VJZGVudGlmaWVyLm5hbWUpKSB7XG4gICAgICAvLyBBbHJlYWR5IGluc3RhbGxlZCBzbyBqdXN0IHJ1biBzY2hlbWF0aWNcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ1NraXBwaW5nIGluc3RhbGxhdGlvbjogUGFja2FnZSBhbHJlYWR5IGluc3RhbGxlZCcpO1xuXG4gICAgICByZXR1cm4gdGhpcy5leGVjdXRlU2NoZW1hdGljKHBhY2thZ2VJZGVudGlmaWVyLm5hbWUsIG9wdGlvbnNbJy0tJ10pO1xuICAgIH1cblxuICAgIGNvbnN0IHVzaW5nWWFybiA9IHRoaXMucGFja2FnZU1hbmFnZXIgPT09ICd5YXJuJztcblxuICAgIGlmIChwYWNrYWdlSWRlbnRpZmllci50eXBlID09PSAndGFnJyAmJiAhcGFja2FnZUlkZW50aWZpZXIucmF3U3BlYykge1xuICAgICAgLy8gb25seSBwYWNrYWdlIG5hbWUgcHJvdmlkZWQ7IHNlYXJjaCBmb3IgdmlhYmxlIHZlcnNpb25cbiAgICAgIC8vIHBsdXMgc3BlY2lhbCBjYXNlcyBmb3IgcGFja2FnZXMgdGhhdCBkaWQgbm90IGhhdmUgcGVlciBkZXBzIHNldHVwXG4gICAgICBsZXQgcGFja2FnZU1ldGFkYXRhO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGFja2FnZU1ldGFkYXRhID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWV0YWRhdGEoXG4gICAgICAgICAgcGFja2FnZUlkZW50aWZpZXIubmFtZSxcbiAgICAgICAgICB0aGlzLmxvZ2dlcixcbiAgICAgICAgICB7IHVzaW5nWWFybiB9LFxuICAgICAgICApO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVW5hYmxlIHRvIGZldGNoIHBhY2thZ2UgbWV0YWRhdGE6ICcgKyBlLm1lc3NhZ2UpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsYXRlc3RNYW5pZmVzdCA9IHBhY2thZ2VNZXRhZGF0YS50YWdzWydsYXRlc3QnXTtcbiAgICAgIGlmIChsYXRlc3RNYW5pZmVzdCAmJiBPYmplY3Qua2V5cyhsYXRlc3RNYW5pZmVzdC5wZWVyRGVwZW5kZW5jaWVzKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgaWYgKGxhdGVzdE1hbmlmZXN0Lm5hbWUgPT09ICdAYW5ndWxhci9wd2EnKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGF3YWl0IHRoaXMuZmluZFByb2plY3RWZXJzaW9uKCdAYW5ndWxhci9jbGknKTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgICAgY29uc3Qgc2VtdmVyT3B0aW9ucyA9IHsgaW5jbHVkZVByZXJlbGVhc2U6IHRydWUgfSBhcyBhbnk7XG5cbiAgICAgICAgICBpZiAodmVyc2lvblxuICAgICAgICAgICAgICAmJiAoKHZhbGlkUmFuZ2UodmVyc2lvbikgJiYgaW50ZXJzZWN0cyh2ZXJzaW9uLCAnNycsIHNlbXZlck9wdGlvbnMpKVxuICAgICAgICAgICAgICAgICAgfHwgKHZhbGlkKHZlcnNpb24pICYmIHNhdGlzZmllcyh2ZXJzaW9uLCAnNycsIHNlbXZlck9wdGlvbnMpKSkpIHtcbiAgICAgICAgICAgIHBhY2thZ2VJZGVudGlmaWVyID0gbnBhLnJlc29sdmUoJ0Bhbmd1bGFyL3B3YScsICcwLjEyJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCFsYXRlc3RNYW5pZmVzdCB8fCAoYXdhaXQgdGhpcy5oYXNNaXNtYXRjaGVkUGVlcihsYXRlc3RNYW5pZmVzdCkpKSB7XG4gICAgICAgIC8vICdsYXRlc3QnIGlzIGludmFsaWQgc28gc2VhcmNoIGZvciBtb3N0IHJlY2VudCBtYXRjaGluZyBwYWNrYWdlXG4gICAgICAgIGNvbnN0IHZlcnNpb25NYW5pZmVzdHMgPSBBcnJheS5mcm9tKHBhY2thZ2VNZXRhZGF0YS52ZXJzaW9ucy52YWx1ZXMoKSlcbiAgICAgICAgICAuZmlsdGVyKHZhbHVlID0+ICFwcmVyZWxlYXNlKHZhbHVlLnZlcnNpb24pKTtcblxuICAgICAgICB2ZXJzaW9uTWFuaWZlc3RzLnNvcnQoKGEsIGIpID0+IHJjb21wYXJlKGEudmVyc2lvbiwgYi52ZXJzaW9uLCB0cnVlKSk7XG5cbiAgICAgICAgbGV0IG5ld0lkZW50aWZpZXI7XG4gICAgICAgIGZvciAoY29uc3QgdmVyc2lvbk1hbmlmZXN0IG9mIHZlcnNpb25NYW5pZmVzdHMpIHtcbiAgICAgICAgICBpZiAoIShhd2FpdCB0aGlzLmhhc01pc21hdGNoZWRQZWVyKHZlcnNpb25NYW5pZmVzdCkpKSB7XG4gICAgICAgICAgICBuZXdJZGVudGlmaWVyID0gbnBhLnJlc29sdmUocGFja2FnZUlkZW50aWZpZXIubmFtZSwgdmVyc2lvbk1hbmlmZXN0LnZlcnNpb24pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFuZXdJZGVudGlmaWVyKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybignVW5hYmxlIHRvIGZpbmQgY29tcGF0aWJsZSBwYWNrYWdlLiAgVXNpbmcgXFwnbGF0ZXN0XFwnLicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhY2thZ2VJZGVudGlmaWVyID0gbmV3SWRlbnRpZmllcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBjb2xsZWN0aW9uTmFtZSA9IHBhY2thZ2VJZGVudGlmaWVyLm5hbWU7XG4gICAgaWYgKCFwYWNrYWdlSWRlbnRpZmllci5yZWdpc3RyeSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgbWFuaWZlc3QgPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChcbiAgICAgICAgICBwYWNrYWdlSWRlbnRpZmllcixcbiAgICAgICAgICB0aGlzLmxvZ2dlcixcbiAgICAgICAgICB7IHVzaW5nWWFybiB9LFxuICAgICAgICApO1xuXG4gICAgICAgIGNvbGxlY3Rpb25OYW1lID0gbWFuaWZlc3QubmFtZTtcblxuICAgICAgICBpZiAoYXdhaXQgdGhpcy5oYXNNaXNtYXRjaGVkUGVlcihtYW5pZmVzdCkpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ1BhY2thZ2UgaGFzIHVubWV0IHBlZXIgZGVwZW5kZW5jaWVzLiBBZGRpbmcgdGhlIHBhY2thZ2UgbWF5IG5vdCBzdWNjZWVkLicpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdVbmFibGUgdG8gZmV0Y2ggcGFja2FnZSBtYW5pZmVzdDogJyArIGUubWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXdhaXQgbnBtSW5zdGFsbChcbiAgICAgIHBhY2thZ2VJZGVudGlmaWVyLnJhdyxcbiAgICAgIHRoaXMubG9nZ2VyLFxuICAgICAgdGhpcy5wYWNrYWdlTWFuYWdlcixcbiAgICAgIHRoaXMud29ya3NwYWNlLnJvb3QsXG4gICAgKTtcblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoY29sbGVjdGlvbk5hbWUsIG9wdGlvbnNbJy0tJ10pO1xuICB9XG5cbiAgcHJpdmF0ZSBpc1BhY2thZ2VJbnN0YWxsZWQobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgdHJ5IHtcbiAgICAgIHJlc29sdmUobmFtZSwge1xuICAgICAgICBjaGVja0xvY2FsOiB0cnVlLFxuICAgICAgICBiYXNlZGlyOiB0aGlzLndvcmtzcGFjZS5yb290LFxuICAgICAgICByZXNvbHZlUGFja2FnZUpzb246IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIE1vZHVsZU5vdEZvdW5kRXhjZXB0aW9uKSkge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IHN0cmluZ1tdID0gW10sXG4gICk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHJ1bk9wdGlvbnMgPSB7XG4gICAgICBzY2hlbWF0aWNPcHRpb25zOiBvcHRpb25zLFxuICAgICAgd29ya2luZ0RpcjogdGhpcy53b3Jrc3BhY2Uucm9vdCxcbiAgICAgIGNvbGxlY3Rpb25OYW1lLFxuICAgICAgc2NoZW1hdGljTmFtZTogJ25nLWFkZCcsXG4gICAgICBhbGxvd1ByaXZhdGU6IHRydWUsXG4gICAgICBkcnlSdW46IGZhbHNlLFxuICAgICAgZm9yY2U6IGZhbHNlLFxuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuU2NoZW1hdGljKHJ1bk9wdGlvbnMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9kZVBhY2thZ2VEb2VzTm90U3VwcG9ydFNjaGVtYXRpY3MpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IodGFncy5vbmVMaW5lYFxuICAgICAgICAgIFRoZSBwYWNrYWdlIHRoYXQgeW91IGFyZSB0cnlpbmcgdG8gYWRkIGRvZXMgbm90IHN1cHBvcnQgc2NoZW1hdGljcy4gWW91IGNhbiB0cnkgdXNpbmdcbiAgICAgICAgICBhIGRpZmZlcmVudCB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIG9yIGNvbnRhY3QgdGhlIHBhY2thZ2UgYXV0aG9yIHRvIGFkZCBuZy1hZGQgc3VwcG9ydC5cbiAgICAgICAgYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmaW5kUHJvamVjdFZlcnNpb24obmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgbGV0IGluc3RhbGxlZFBhY2thZ2U7XG4gICAgdHJ5IHtcbiAgICAgIGluc3RhbGxlZFBhY2thZ2UgPSByZXNvbHZlKFxuICAgICAgICBuYW1lLFxuICAgICAgICB7IGNoZWNrTG9jYWw6IHRydWUsIGJhc2VkaXI6IHRoaXMud29ya3NwYWNlLnJvb3QsIHJlc29sdmVQYWNrYWdlSnNvbjogdHJ1ZSB9LFxuICAgICAgKTtcbiAgICB9IGNhdGNoIHsgfVxuXG4gICAgaWYgKGluc3RhbGxlZFBhY2thZ2UpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGluc3RhbGxlZCA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KGRpcm5hbWUoaW5zdGFsbGVkUGFja2FnZSksIHRoaXMubG9nZ2VyKTtcblxuICAgICAgICByZXR1cm4gaW5zdGFsbGVkLnZlcnNpb247XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfVxuXG4gICAgbGV0IHByb2plY3RNYW5pZmVzdDtcbiAgICB0cnkge1xuICAgICAgcHJvamVjdE1hbmlmZXN0ID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWFuaWZlc3QodGhpcy53b3Jrc3BhY2Uucm9vdCwgdGhpcy5sb2dnZXIpO1xuICAgIH0gY2F0Y2gge31cblxuICAgIGlmIChwcm9qZWN0TWFuaWZlc3QpIHtcbiAgICAgIGNvbnN0IHZlcnNpb24gPSBwcm9qZWN0TWFuaWZlc3QuZGVwZW5kZW5jaWVzW25hbWVdIHx8IHByb2plY3RNYW5pZmVzdC5kZXZEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICBpZiAodmVyc2lvbikge1xuICAgICAgICByZXR1cm4gdmVyc2lvbjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFzTWlzbWF0Y2hlZFBlZXIobWFuaWZlc3Q6IFBhY2thZ2VNYW5pZmVzdCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgcGVlciBpbiBtYW5pZmVzdC5wZWVyRGVwZW5kZW5jaWVzKSB7XG4gICAgICBsZXQgcGVlcklkZW50aWZpZXI7XG4gICAgICB0cnkge1xuICAgICAgICBwZWVySWRlbnRpZmllciA9IG5wYS5yZXNvbHZlKHBlZXIsIG1hbmlmZXN0LnBlZXJEZXBlbmRlbmNpZXNbcGVlcl0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYEludmFsaWQgcGVlciBkZXBlbmRlbmN5ICR7cGVlcn0gZm91bmQgaW4gcGFja2FnZS5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwZWVySWRlbnRpZmllci50eXBlID09PSAndmVyc2lvbicgfHwgcGVlcklkZW50aWZpZXIudHlwZSA9PT0gJ3JhbmdlJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBhd2FpdCB0aGlzLmZpbmRQcm9qZWN0VmVyc2lvbihwZWVyKTtcbiAgICAgICAgICBpZiAoIXZlcnNpb24pIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgICBjb25zdCBvcHRpb25zID0geyBpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZSB9IGFzIGFueTtcblxuICAgICAgICAgIGlmICghaW50ZXJzZWN0cyh2ZXJzaW9uLCBwZWVySWRlbnRpZmllci5yYXdTcGVjLCBvcHRpb25zKVxuICAgICAgICAgICAgICAmJiAhc2F0aXNmaWVzKHZlcnNpb24sIHBlZXJJZGVudGlmaWVyLnJhd1NwZWMsIG9wdGlvbnMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIE5vdCBmb3VuZCBvciBpbnZhbGlkIHNvIGlnbm9yZVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB0eXBlID09PSAndGFnJyB8ICdmaWxlJyB8ICdkaXJlY3RvcnknIHwgJ3JlbW90ZScgfCAnZ2l0J1xuICAgICAgICAvLyBDYW5ub3QgYWNjdXJhdGVseSBjb21wYXJlIHRoZXNlIGFzIHRoZSB0YWcvbG9jYXRpb24gbWF5IGhhdmUgY2hhbmdlZCBzaW5jZSBpbnN0YWxsXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiJdfQ==