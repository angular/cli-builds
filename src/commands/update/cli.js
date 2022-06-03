"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCommandModule = void 0;
const schematics_1 = require("@angular-devkit/schematics");
const tools_1 = require("@angular-devkit/schematics/tools");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const npm_package_arg_1 = __importDefault(require("npm-package-arg"));
const npm_pick_manifest_1 = __importDefault(require("npm-pick-manifest"));
const path = __importStar(require("path"));
const path_1 = require("path");
const semver = __importStar(require("semver"));
const workspace_schema_1 = require("../../../lib/config/workspace-schema");
const command_module_1 = require("../../command-builder/command-module");
const schematic_engine_host_1 = require("../../command-builder/utilities/schematic-engine-host");
const schematic_workflow_1 = require("../../command-builder/utilities/schematic-workflow");
const color_1 = require("../../utilities/color");
const environment_options_1 = require("../../utilities/environment-options");
const log_file_1 = require("../../utilities/log-file");
const package_metadata_1 = require("../../utilities/package-metadata");
const package_tree_1 = require("../../utilities/package-tree");
const version_1 = require("../../utilities/version");
const ANGULAR_PACKAGES_REGEXP = /^@(?:angular|nguniversal)\//;
const UPDATE_SCHEMATIC_COLLECTION = path.join(__dirname, 'schematic/collection.json');
class UpdateCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.shouldReportAnalytics = false;
        this.command = 'update [packages..]';
        this.describe = 'Updates your workspace and its dependencies. See https://update.angular.io/.';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
    }
    builder(localYargs) {
        return localYargs
            .positional('packages', {
            description: 'The names of package(s) to update.',
            type: 'string',
            array: true,
        })
            .option('force', {
            description: 'Ignore peer dependency version mismatches. ' +
                `Passes the '--force' flag to the package manager when installing packages.`,
            type: 'boolean',
            default: false,
        })
            .option('next', {
            description: 'Use the prerelease version, including beta and RCs.',
            type: 'boolean',
            default: false,
        })
            .option('migrate-only', {
            description: 'Only perform a migration, do not update the installed version.',
            type: 'boolean',
        })
            .option('name', {
            description: 'The name of the migration to run. ' +
                `Only available with a single package being updated, and only with 'migrate-only' option.`,
            type: 'string',
            implies: ['migrate-only'],
            conflicts: ['to', 'from'],
        })
            .option('from', {
            description: 'Version from which to migrate from. ' +
                `Only available with a single package being updated, and only with 'migrate-only'.`,
            type: 'string',
            implies: ['to', 'migrate-only'],
            conflicts: ['name'],
        })
            .option('to', {
            describe: 'Version up to which to apply migrations. Only available with a single package being updated, ' +
                `and only with 'migrate-only' option. Requires 'from' to be specified. Default to the installed version detected.`,
            type: 'string',
            implies: ['from', 'migrate-only'],
            conflicts: ['name'],
        })
            .option('allow-dirty', {
            describe: 'Whether to allow updating when the repository contains modified or untracked files.',
            type: 'boolean',
            default: false,
        })
            .option('verbose', {
            describe: 'Display additional details about internal operations during execution.',
            type: 'boolean',
            default: false,
        })
            .option('create-commits', {
            describe: 'Create source control commits for updates and migrations.',
            type: 'boolean',
            alias: ['C'],
            default: false,
        })
            .check(({ packages, 'allow-dirty': allowDirty, 'migrate-only': migrateOnly }) => {
            const { logger } = this.context;
            // This allows the user to easily reset any changes from the update.
            if ((packages === null || packages === void 0 ? void 0 : packages.length) && !this.checkCleanGit()) {
                if (allowDirty) {
                    logger.warn('Repository is not clean. Update changes will be mixed with pre-existing changes.');
                }
                else {
                    throw new command_module_1.CommandModuleError('Repository is not clean. Please commit or stash any changes before updating.');
                }
            }
            if (migrateOnly) {
                if ((packages === null || packages === void 0 ? void 0 : packages.length) !== 1) {
                    throw new command_module_1.CommandModuleError(`A single package must be specified when using the 'migrate-only' option.`);
                }
            }
            return true;
        })
            .strict();
    }
    async run(options) {
        var _a, _b;
        const { logger, packageManager } = this.context;
        packageManager.ensureCompatibility();
        // Check if the current installed CLI version is older than the latest compatible version.
        if (!environment_options_1.disableVersionCheck) {
            const cliVersionToInstall = await this.checkCLIVersion(options.packages, options.verbose, options.next);
            if (cliVersionToInstall) {
                logger.warn('The installed Angular CLI version is outdated.\n' +
                    `Installing a temporary Angular CLI versioned ${cliVersionToInstall} to perform the update.`);
                return this.runTempBinary(`@angular/cli@${cliVersionToInstall}`, process.argv.slice(2));
            }
        }
        const packages = [];
        for (const request of (_a = options.packages) !== null && _a !== void 0 ? _a : []) {
            try {
                const packageIdentifier = (0, npm_package_arg_1.default)(request);
                // only registry identifiers are supported
                if (!packageIdentifier.registry) {
                    logger.error(`Package '${request}' is not a registry package identifer.`);
                    return 1;
                }
                if (packages.some((v) => v.name === packageIdentifier.name)) {
                    logger.error(`Duplicate package '${packageIdentifier.name}' specified.`);
                    return 1;
                }
                if (options.migrateOnly && packageIdentifier.rawSpec) {
                    logger.warn('Package specifier has no effect when using "migrate-only" option.');
                }
                // If next option is used and no specifier supplied, use next tag
                if (options.next && !packageIdentifier.rawSpec) {
                    packageIdentifier.fetchSpec = 'next';
                }
                packages.push(packageIdentifier);
            }
            catch (e) {
                logger.error(e.message);
                return 1;
            }
        }
        logger.info(`Using package manager: ${color_1.colors.grey(packageManager.name)}`);
        logger.info('Collecting installed dependencies...');
        const rootDependencies = await (0, package_tree_1.getProjectDependencies)(this.context.root);
        logger.info(`Found ${rootDependencies.size} dependencies.`);
        const workflow = new tools_1.NodeWorkflow(this.context.root, {
            packageManager: packageManager.name,
            packageManagerForce: options.force,
            // __dirname -> favor @schematics/update from this package
            // Otherwise, use packages from the active workspace (migrations)
            resolvePaths: [__dirname, this.context.root],
            schemaValidation: true,
            engineHostCreator: (options) => new schematic_engine_host_1.SchematicEngineHost(options.resolvePaths),
        });
        if (packages.length === 0) {
            // Show status
            const { success } = await this.executeSchematic(workflow, UPDATE_SCHEMATIC_COLLECTION, 'update', {
                force: options.force,
                next: options.next,
                verbose: options.verbose,
                packageManager: packageManager.name,
                packages: [],
            });
            return success ? 0 : 1;
        }
        return options.migrateOnly
            ? this.migrateOnly(workflow, ((_b = options.packages) !== null && _b !== void 0 ? _b : [])[0], rootDependencies, options)
            : this.updatePackagesAndMigrate(workflow, rootDependencies, options, packages);
    }
    async executeSchematic(workflow, collection, schematic, options = {}) {
        const { logger } = this.context;
        const workflowSubscription = (0, schematic_workflow_1.subscribeToWorkflow)(workflow, logger);
        // TODO: Allow passing a schematic instance directly
        try {
            await workflow
                .execute({
                collection,
                schematic,
                options,
                logger,
            })
                .toPromise();
            return { success: !workflowSubscription.error, files: workflowSubscription.files };
        }
        catch (e) {
            if (e instanceof schematics_1.UnsuccessfulWorkflowExecution) {
                logger.error(`${color_1.colors.symbols.cross} Migration failed. See above for further details.\n`);
            }
            else {
                const logPath = (0, log_file_1.writeErrorToLogFile)(e);
                logger.fatal(`${color_1.colors.symbols.cross} Migration failed: ${e.message}\n` +
                    `  See "${logPath}" for further details.\n`);
            }
            return { success: false, files: workflowSubscription.files };
        }
        finally {
            workflowSubscription.unsubscribe();
        }
    }
    /**
     * @return Whether or not the migration was performed successfully.
     */
    async executeMigration(workflow, packageName, collectionPath, migrationName, commit) {
        const { logger } = this.context;
        const collection = workflow.engine.createCollection(collectionPath);
        const name = collection.listSchematicNames().find((name) => name === migrationName);
        if (!name) {
            logger.error(`Cannot find migration '${migrationName}' in '${packageName}'.`);
            return 1;
        }
        logger.info(color_1.colors.cyan(`** Executing '${migrationName}' of package '${packageName}' **\n`));
        const schematic = workflow.engine.createSchematic(name, collection);
        return this.executePackageMigrations(workflow, [schematic.description], packageName, commit);
    }
    /**
     * @return Whether or not the migrations were performed successfully.
     */
    async executeMigrations(workflow, packageName, collectionPath, from, to, commit) {
        const collection = workflow.engine.createCollection(collectionPath);
        const migrationRange = new semver.Range('>' + (semver.prerelease(from) ? from.split('-')[0] + '-0' : from) + ' <=' + to.split('-')[0]);
        const migrations = [];
        for (const name of collection.listSchematicNames()) {
            const schematic = workflow.engine.createSchematic(name, collection);
            const description = schematic.description;
            description.version = coerceVersionNumber(description.version);
            if (!description.version) {
                continue;
            }
            if (semver.satisfies(description.version, migrationRange, { includePrerelease: true })) {
                migrations.push(description);
            }
        }
        if (migrations.length === 0) {
            return 0;
        }
        migrations.sort((a, b) => semver.compare(a.version, b.version) || a.name.localeCompare(b.name));
        this.context.logger.info(color_1.colors.cyan(`** Executing migrations of package '${packageName}' **\n`));
        return this.executePackageMigrations(workflow, migrations, packageName, commit);
    }
    async executePackageMigrations(workflow, migrations, packageName, commit = false) {
        const { logger } = this.context;
        for (const migration of migrations) {
            const [title, ...description] = migration.description.split('. ');
            logger.info(color_1.colors.cyan(color_1.colors.symbols.pointer) +
                ' ' +
                color_1.colors.bold(title.endsWith('.') ? title : title + '.'));
            if (description.length) {
                logger.info('  ' + description.join('.\n  '));
            }
            const result = await this.executeSchematic(workflow, migration.collection.name, migration.name);
            if (!result.success) {
                return 1;
            }
            logger.info('  Migration completed.');
            // Commit migration
            if (commit) {
                const commitPrefix = `${packageName} migration - ${migration.name}`;
                const commitMessage = migration.description
                    ? `${commitPrefix}\n\n${migration.description}`
                    : commitPrefix;
                const committed = this.commit(commitMessage);
                if (!committed) {
                    // Failed to commit, something went wrong. Abort the update.
                    return 1;
                }
            }
            logger.info(''); // Extra trailing newline.
        }
        return 0;
    }
    async migrateOnly(workflow, packageName, rootDependencies, options) {
        const { logger } = this.context;
        const packageDependency = rootDependencies.get(packageName);
        let packagePath = packageDependency === null || packageDependency === void 0 ? void 0 : packageDependency.path;
        let packageNode = packageDependency === null || packageDependency === void 0 ? void 0 : packageDependency.package;
        if (packageDependency && !packageNode) {
            logger.error('Package found in package.json but is not installed.');
            return 1;
        }
        else if (!packageDependency) {
            // Allow running migrations on transitively installed dependencies
            // There can technically be nested multiple versions
            // TODO: If multiple, this should find all versions and ask which one to use
            const packageJson = (0, package_tree_1.findPackageJson)(this.context.root, packageName);
            if (packageJson) {
                packagePath = path.dirname(packageJson);
                packageNode = await (0, package_tree_1.readPackageJson)(packageJson);
            }
        }
        if (!packageNode || !packagePath) {
            logger.error('Package is not installed.');
            return 1;
        }
        const updateMetadata = packageNode['ng-update'];
        let migrations = updateMetadata === null || updateMetadata === void 0 ? void 0 : updateMetadata.migrations;
        if (migrations === undefined) {
            logger.error('Package does not provide migrations.');
            return 1;
        }
        else if (typeof migrations !== 'string') {
            logger.error('Package contains a malformed migrations field.');
            return 1;
        }
        else if (path.posix.isAbsolute(migrations) || path.win32.isAbsolute(migrations)) {
            logger.error('Package contains an invalid migrations field. Absolute paths are not permitted.');
            return 1;
        }
        // Normalize slashes
        migrations = migrations.replace(/\\/g, '/');
        if (migrations.startsWith('../')) {
            logger.error('Package contains an invalid migrations field. Paths outside the package root are not permitted.');
            return 1;
        }
        // Check if it is a package-local location
        const localMigrations = path.join(packagePath, migrations);
        if ((0, fs_1.existsSync)(localMigrations)) {
            migrations = localMigrations;
        }
        else {
            // Try to resolve from package location.
            // This avoids issues with package hoisting.
            try {
                migrations = require.resolve(migrations, { paths: [packagePath] });
            }
            catch (e) {
                if (e.code === 'MODULE_NOT_FOUND') {
                    logger.error('Migrations for package were not found.');
                }
                else {
                    logger.error(`Unable to resolve migrations for package.  [${e.message}]`);
                }
                return 1;
            }
        }
        if (options.name) {
            return this.executeMigration(workflow, packageName, migrations, options.name, options.createCommits);
        }
        const from = coerceVersionNumber(options.from);
        if (!from) {
            logger.error(`"from" value [${options.from}] is not a valid version.`);
            return 1;
        }
        return this.executeMigrations(workflow, packageName, migrations, from, options.to || packageNode.version, options.createCommits);
    }
    // eslint-disable-next-line max-lines-per-function
    async updatePackagesAndMigrate(workflow, rootDependencies, options, packages) {
        var _a;
        const { logger } = this.context;
        const logVerbose = (message) => {
            if (options.verbose) {
                logger.info(message);
            }
        };
        const requests = [];
        // Validate packages actually are part of the workspace
        for (const pkg of packages) {
            const node = rootDependencies.get(pkg.name);
            if (!(node === null || node === void 0 ? void 0 : node.package)) {
                logger.error(`Package '${pkg.name}' is not a dependency.`);
                return 1;
            }
            // If a specific version is requested and matches the installed version, skip.
            if (pkg.type === 'version' && node.package.version === pkg.fetchSpec) {
                logger.info(`Package '${pkg.name}' is already at '${pkg.fetchSpec}'.`);
                continue;
            }
            requests.push({ identifier: pkg, node });
        }
        if (requests.length === 0) {
            return 0;
        }
        logger.info('Fetching dependency metadata from registry...');
        const packagesToUpdate = [];
        for (const { identifier: requestIdentifier, node } of requests) {
            const packageName = requestIdentifier.name;
            let metadata;
            try {
                // Metadata requests are internally cached; multiple requests for same name
                // does not result in additional network traffic
                metadata = await (0, package_metadata_1.fetchPackageMetadata)(packageName, logger, {
                    verbose: options.verbose,
                });
            }
            catch (e) {
                logger.error(`Error fetching metadata for '${packageName}': ` + e.message);
                return 1;
            }
            // Try to find a package version based on the user requested package specifier
            // registry specifier types are either version, range, or tag
            let manifest;
            if (requestIdentifier.type === 'version' ||
                requestIdentifier.type === 'range' ||
                requestIdentifier.type === 'tag') {
                try {
                    manifest = (0, npm_pick_manifest_1.default)(metadata, requestIdentifier.fetchSpec);
                }
                catch (e) {
                    if (e.code === 'ETARGET') {
                        // If not found and next was used and user did not provide a specifier, try latest.
                        // Package may not have a next tag.
                        if (requestIdentifier.type === 'tag' &&
                            requestIdentifier.fetchSpec === 'next' &&
                            !requestIdentifier.rawSpec) {
                            try {
                                manifest = (0, npm_pick_manifest_1.default)(metadata, 'latest');
                            }
                            catch (e) {
                                if (e.code !== 'ETARGET' && e.code !== 'ENOVERSIONS') {
                                    throw e;
                                }
                            }
                        }
                    }
                    else if (e.code !== 'ENOVERSIONS') {
                        throw e;
                    }
                }
            }
            if (!manifest) {
                logger.error(`Package specified by '${requestIdentifier.raw}' does not exist within the registry.`);
                return 1;
            }
            if (manifest.version === ((_a = node.package) === null || _a === void 0 ? void 0 : _a.version)) {
                logger.info(`Package '${packageName}' is already up to date.`);
                continue;
            }
            if (node.package && ANGULAR_PACKAGES_REGEXP.test(node.package.name)) {
                const { name, version } = node.package;
                const toBeInstalledMajorVersion = +manifest.version.split('.')[0];
                const currentMajorVersion = +version.split('.')[0];
                if (toBeInstalledMajorVersion - currentMajorVersion > 1) {
                    // Only allow updating a single version at a time.
                    if (currentMajorVersion < 6) {
                        // Before version 6, the major versions were not always sequential.
                        // Example @angular/core skipped version 3, @angular/cli skipped versions 2-5.
                        logger.error(`Updating multiple major versions of '${name}' at once is not supported. Please migrate each major version individually.\n` +
                            `For more information about the update process, see https://update.angular.io/.`);
                    }
                    else {
                        const nextMajorVersionFromCurrent = currentMajorVersion + 1;
                        logger.error(`Updating multiple major versions of '${name}' at once is not supported. Please migrate each major version individually.\n` +
                            `Run 'ng update ${name}@${nextMajorVersionFromCurrent}' in your workspace directory ` +
                            `to update to latest '${nextMajorVersionFromCurrent}.x' version of '${name}'.\n\n` +
                            `For more information about the update process, see https://update.angular.io/?v=${currentMajorVersion}.0-${nextMajorVersionFromCurrent}.0`);
                    }
                    return 1;
                }
            }
            packagesToUpdate.push(requestIdentifier.toString());
        }
        if (packagesToUpdate.length === 0) {
            return 0;
        }
        const { success } = await this.executeSchematic(workflow, UPDATE_SCHEMATIC_COLLECTION, 'update', {
            verbose: options.verbose,
            force: options.force,
            next: options.next,
            packageManager: this.context.packageManager.name,
            packages: packagesToUpdate,
        });
        if (success) {
            try {
                await fs_1.promises.rm(path.join(this.context.root, 'node_modules'), {
                    force: true,
                    recursive: true,
                    maxRetries: 3,
                });
            }
            catch (_b) { }
            let forceInstall = false;
            // npm 7+ can fail due to it incorrectly resolving peer dependencies that have valid SemVer
            // ranges during an update. Update will set correct versions of dependencies within the
            // package.json file. The force option is set to workaround these errors.
            // Example error:
            // npm ERR! Conflicting peer dependency: @angular/compiler-cli@14.0.0-rc.0
            // npm ERR! node_modules/@angular/compiler-cli
            // npm ERR!   peer @angular/compiler-cli@"^14.0.0 || ^14.0.0-rc" from @angular-devkit/build-angular@14.0.0-rc.0
            // npm ERR!   node_modules/@angular-devkit/build-angular
            // npm ERR!     dev @angular-devkit/build-angular@"~14.0.0-rc.0" from the root project
            if (this.context.packageManager.name === workspace_schema_1.PackageManager.Npm &&
                this.context.packageManager.version &&
                semver.gte(this.context.packageManager.version, '7.0.0', { includePrerelease: true })) {
                logVerbose('NPM 7+ detected -- enabling force option for package installation');
                forceInstall = true;
            }
            const installationSuccess = await this.context.packageManager.installAll(forceInstall ? ['--force'] : [], this.context.root);
            if (!installationSuccess) {
                return 1;
            }
        }
        if (success && options.createCommits) {
            if (!this.commit(`Angular CLI update for packages - ${packagesToUpdate.join(', ')}`)) {
                return 1;
            }
        }
        // This is a temporary workaround to allow data to be passed back from the update schematic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const migrations = global.externalMigrations;
        if (success && migrations) {
            for (const migration of migrations) {
                // Resolve the package from the workspace root, as otherwise it will be resolved from the temp
                // installed CLI version.
                let packagePath;
                logVerbose(`Resolving migration package '${migration.package}' from '${this.context.root}'...`);
                try {
                    try {
                        packagePath = path.dirname(
                        // This may fail if the `package.json` is not exported as an entry point
                        require.resolve(path.join(migration.package, 'package.json'), {
                            paths: [this.context.root],
                        }));
                    }
                    catch (e) {
                        if (e.code === 'MODULE_NOT_FOUND') {
                            // Fallback to trying to resolve the package's main entry point
                            packagePath = require.resolve(migration.package, { paths: [this.context.root] });
                        }
                        else {
                            throw e;
                        }
                    }
                }
                catch (e) {
                    if (e.code === 'MODULE_NOT_FOUND') {
                        logVerbose(e.toString());
                        logger.error(`Migrations for package (${migration.package}) were not found.` +
                            ' The package could not be found in the workspace.');
                    }
                    else {
                        logger.error(`Unable to resolve migrations for package (${migration.package}).  [${e.message}]`);
                    }
                    return 1;
                }
                let migrations;
                // Check if it is a package-local location
                const localMigrations = path.join(packagePath, migration.collection);
                if ((0, fs_1.existsSync)(localMigrations)) {
                    migrations = localMigrations;
                }
                else {
                    // Try to resolve from package location.
                    // This avoids issues with package hoisting.
                    try {
                        migrations = require.resolve(migration.collection, { paths: [packagePath] });
                    }
                    catch (e) {
                        if (e.code === 'MODULE_NOT_FOUND') {
                            logger.error(`Migrations for package (${migration.package}) were not found.`);
                        }
                        else {
                            logger.error(`Unable to resolve migrations for package (${migration.package}).  [${e.message}]`);
                        }
                        return 1;
                    }
                }
                const result = await this.executeMigrations(workflow, migration.package, migrations, migration.from, migration.to, options.createCommits);
                // A non-zero value is a failure for the package's migrations
                if (result !== 0) {
                    return result;
                }
            }
        }
        return success ? 0 : 1;
    }
    /**
     * @return Whether or not the commit was successful.
     */
    commit(message) {
        const { logger } = this.context;
        // Check if a commit is needed.
        let commitNeeded;
        try {
            commitNeeded = hasChangesToCommit();
        }
        catch (err) {
            logger.error(`  Failed to read Git tree:\n${err.stderr}`);
            return false;
        }
        if (!commitNeeded) {
            logger.info('  No changes to commit after migration.');
            return true;
        }
        // Commit changes and abort on error.
        try {
            createCommit(message);
        }
        catch (err) {
            logger.error(`Failed to commit update (${message}):\n${err.stderr}`);
            return false;
        }
        // Notify user of the commit.
        const hash = findCurrentGitSha();
        const shortMessage = message.split('\n')[0];
        if (hash) {
            logger.info(`  Committed migration step (${getShortHash(hash)}): ${shortMessage}.`);
        }
        else {
            // Commit was successful, but reading the hash was not. Something weird happened,
            // but nothing that would stop the update. Just log the weirdness and continue.
            logger.info(`  Committed migration step: ${shortMessage}.`);
            logger.warn('  Failed to look up hash of most recent commit, continuing anyways.');
        }
        return true;
    }
    checkCleanGit() {
        try {
            const topLevel = (0, child_process_1.execSync)('git rev-parse --show-toplevel', {
                encoding: 'utf8',
                stdio: 'pipe',
            });
            const result = (0, child_process_1.execSync)('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' });
            if (result.trim().length === 0) {
                return true;
            }
            // Only files inside the workspace root are relevant
            for (const entry of result.split('\n')) {
                const relativeEntry = path.relative(path.resolve(this.context.root), path.resolve(topLevel.trim(), entry.slice(3).trim()));
                if (!relativeEntry.startsWith('..') && !path.isAbsolute(relativeEntry)) {
                    return false;
                }
            }
        }
        catch (_a) { }
        return true;
    }
    /**
     * Checks if the current installed CLI version is older or newer than a compatible version.
     * @returns the version to install or null when there is no update to install.
     */
    async checkCLIVersion(packagesToUpdate, verbose = false, next = false) {
        const { version } = await (0, package_metadata_1.fetchPackageManifest)(`@angular/cli@${this.getCLIUpdateRunnerVersion(packagesToUpdate, next)}`, this.context.logger, {
            verbose,
            usingYarn: this.context.packageManager.name === workspace_schema_1.PackageManager.Yarn,
        });
        return version_1.VERSION.full === version ? null : version;
    }
    getCLIUpdateRunnerVersion(packagesToUpdate, next) {
        var _a, _b;
        if (next) {
            return 'next';
        }
        const updatingAngularPackage = packagesToUpdate === null || packagesToUpdate === void 0 ? void 0 : packagesToUpdate.find((r) => ANGULAR_PACKAGES_REGEXP.test(r));
        if (updatingAngularPackage) {
            // If we are updating any Angular package we can update the CLI to the target version because
            // migrations for @angular/core@13 can be executed using Angular/cli@13.
            // This is same behaviour as `npx @angular/cli@13 update @angular/core@13`.
            // `@angular/cli@13` -> ['', 'angular/cli', '13']
            // `@angular/cli` -> ['', 'angular/cli']
            const tempVersion = coerceVersionNumber(updatingAngularPackage.split('@')[2]);
            return (_b = (_a = semver.parse(tempVersion)) === null || _a === void 0 ? void 0 : _a.major) !== null && _b !== void 0 ? _b : 'latest';
        }
        // When not updating an Angular package we cannot determine which schematic runtime the migration should to be executed in.
        // Typically, we can assume that the `@angular/cli` was updated previously.
        // Example: Angular official packages are typically updated prior to NGRX etc...
        // Therefore, we only update to the latest patch version of the installed major version of the Angular CLI.
        // This is important because we might end up in a scenario where locally Angular v12 is installed, updating NGRX from 11 to 12.
        // We end up using Angular ClI v13 to run the migrations if we run the migrations using the CLI installed major version + 1 logic.
        return version_1.VERSION.major;
    }
    async runTempBinary(packageName, args = []) {
        const { success, tempNodeModules } = await this.context.packageManager.installTemp(packageName);
        if (!success) {
            return 1;
        }
        // Remove version/tag etc... from package name
        // Ex: @angular/cli@latest -> @angular/cli
        const packageNameNoVersion = packageName.substring(0, packageName.lastIndexOf('@'));
        const pkgLocation = (0, path_1.join)(tempNodeModules, packageNameNoVersion);
        const packageJsonPath = (0, path_1.join)(pkgLocation, 'package.json');
        // Get a binary location for this package
        let binPath;
        if ((0, fs_1.existsSync)(packageJsonPath)) {
            const content = await fs_1.promises.readFile(packageJsonPath, 'utf-8');
            if (content) {
                const { bin = {} } = JSON.parse(content);
                const binKeys = Object.keys(bin);
                if (binKeys.length) {
                    binPath = (0, path_1.resolve)(pkgLocation, bin[binKeys[0]]);
                }
            }
        }
        if (!binPath) {
            throw new Error(`Cannot locate bin for temporary package: ${packageNameNoVersion}.`);
        }
        const { status, error } = (0, child_process_1.spawnSync)(process.execPath, [binPath, ...args], {
            stdio: 'inherit',
            env: {
                ...process.env,
                NG_DISABLE_VERSION_CHECK: 'true',
                NG_CLI_ANALYTICS: 'false',
            },
        });
        if (status === null && error) {
            throw error;
        }
        return status !== null && status !== void 0 ? status : 0;
    }
}
exports.UpdateCommandModule = UpdateCommandModule;
UpdateCommandModule.scope = command_module_1.CommandScope.In;
/**
 * @return Whether or not the working directory has Git changes to commit.
 */
function hasChangesToCommit() {
    // List all modified files not covered by .gitignore.
    // If any files are returned, then there must be something to commit.
    return (0, child_process_1.execSync)('git ls-files -m -d -o --exclude-standard').toString() !== '';
}
/**
 * Precondition: Must have pending changes to commit, they do not need to be staged.
 * Postcondition: The Git working tree is committed and the repo is clean.
 * @param message The commit message to use.
 */
function createCommit(message) {
    // Stage entire working tree for commit.
    (0, child_process_1.execSync)('git add -A', { encoding: 'utf8', stdio: 'pipe' });
    // Commit with the message passed via stdin to avoid bash escaping issues.
    (0, child_process_1.execSync)('git commit --no-verify -F -', { encoding: 'utf8', stdio: 'pipe', input: message });
}
/**
 * @return The Git SHA hash of the HEAD commit. Returns null if unable to retrieve the hash.
 */
function findCurrentGitSha() {
    try {
        return (0, child_process_1.execSync)('git rev-parse HEAD', { encoding: 'utf8', stdio: 'pipe' }).trim();
    }
    catch (_a) {
        return null;
    }
}
function getShortHash(commitHash) {
    return commitHash.slice(0, 9);
}
function coerceVersionNumber(version) {
    var _a;
    if (!version) {
        return undefined;
    }
    if (!/^\d{1,30}\.\d{1,30}\.\d{1,30}/.test(version)) {
        const match = version.match(/^\d{1,30}(\.\d{1,30})*/);
        if (!match) {
            return undefined;
        }
        if (!match[1]) {
            version = version.substring(0, match[0].length) + '.0.0' + version.substring(match[0].length);
        }
        else if (!match[2]) {
            version = version.substring(0, match[0].length) + '.0' + version.substring(match[0].length);
        }
        else {
            return undefined;
        }
    }
    return (_a = semver.valid(version)) !== null && _a !== void 0 ? _a : undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3VwZGF0ZS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwyREFBMkU7QUFDM0UsNERBQWdFO0FBQ2hFLGlEQUFvRDtBQUNwRCwyQkFBZ0Q7QUFDaEQsc0VBQWtDO0FBQ2xDLDBFQUE2QztBQUM3QywyQ0FBNkI7QUFDN0IsK0JBQXFDO0FBQ3JDLCtDQUFpQztBQUVqQywyRUFBc0U7QUFDdEUseUVBSzhDO0FBQzlDLGlHQUE0RjtBQUM1RiwyRkFBeUY7QUFDekYsaURBQStDO0FBQy9DLDZFQUEwRTtBQUMxRSx1REFBK0Q7QUFDL0QsdUVBSzBDO0FBQzFDLCtEQUtzQztBQUN0QyxxREFBa0Q7QUFlbEQsTUFBTSx1QkFBdUIsR0FBRyw2QkFBNkIsQ0FBQztBQUM5RCxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDJCQUEyQixDQUFDLENBQUM7QUFFdEYsTUFBYSxtQkFBb0IsU0FBUSw4QkFBZ0M7SUFBekU7O1FBRXFCLDBCQUFxQixHQUFHLEtBQUssQ0FBQztRQUVqRCxZQUFPLEdBQUcscUJBQXFCLENBQUM7UUFDaEMsYUFBUSxHQUFHLDhFQUE4RSxDQUFDO1FBQzFGLHdCQUFtQixHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBbzVCL0QsQ0FBQztJQWw1QkMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVTthQUNkLFVBQVUsQ0FBQyxVQUFVLEVBQUU7WUFDdEIsV0FBVyxFQUFFLG9DQUFvQztZQUNqRCxJQUFJLEVBQUUsUUFBUTtZQUNkLEtBQUssRUFBRSxJQUFJO1NBQ1osQ0FBQzthQUNELE1BQU0sQ0FBQyxP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LEVBQUU7WUFDVixPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUVELElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDYixPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUMvRjthQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDcEIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDN0Y7YUFBTTtZQUNMLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO0tBQ0Y7SUFFRCxPQUFPLE1BQUEsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsbUNBQUksU0FBUyxDQUFDO0FBQzVDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlV29ya2Zsb3cgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgeyBleGVjU3luYywgc3Bhd25TeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCBwcm9taXNlcyBhcyBmcyB9IGZyb20gJ2ZzJztcbmltcG9ydCBucGEgZnJvbSAnbnBtLXBhY2thZ2UtYXJnJztcbmltcG9ydCBwaWNrTWFuaWZlc3QgZnJvbSAnbnBtLXBpY2stbWFuaWZlc3QnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vLi4vLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGUsXG4gIENvbW1hbmRNb2R1bGVFcnJvcixcbiAgQ29tbWFuZFNjb3BlLFxuICBPcHRpb25zLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgU2NoZW1hdGljRW5naW5lSG9zdCB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvc2NoZW1hdGljLWVuZ2luZS1ob3N0JztcbmltcG9ydCB7IHN1YnNjcmliZVRvV29ya2Zsb3cgfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvdXRpbGl0aWVzL3NjaGVtYXRpYy13b3JrZmxvdyc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgZGlzYWJsZVZlcnNpb25DaGVjayB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IHdyaXRlRXJyb3JUb0xvZ0ZpbGUgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvbG9nLWZpbGUnO1xuaW1wb3J0IHtcbiAgUGFja2FnZUlkZW50aWZpZXIsXG4gIFBhY2thZ2VNYW5pZmVzdCxcbiAgZmV0Y2hQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1ldGFkYXRhLFxufSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcGFja2FnZS1tZXRhZGF0YSc7XG5pbXBvcnQge1xuICBQYWNrYWdlVHJlZU5vZGUsXG4gIGZpbmRQYWNrYWdlSnNvbixcbiAgZ2V0UHJvamVjdERlcGVuZGVuY2llcyxcbiAgcmVhZFBhY2thZ2VKc29uLFxufSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcGFja2FnZS10cmVlJztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvdmVyc2lvbic7XG5cbmludGVyZmFjZSBVcGRhdGVDb21tYW5kQXJncyB7XG4gIHBhY2thZ2VzPzogc3RyaW5nW107XG4gIGZvcmNlOiBib29sZWFuO1xuICBuZXh0OiBib29sZWFuO1xuICAnbWlncmF0ZS1vbmx5Jz86IGJvb2xlYW47XG4gIG5hbWU/OiBzdHJpbmc7XG4gIGZyb20/OiBzdHJpbmc7XG4gIHRvPzogc3RyaW5nO1xuICAnYWxsb3ctZGlydHknOiBib29sZWFuO1xuICB2ZXJib3NlOiBib29sZWFuO1xuICAnY3JlYXRlLWNvbW1pdHMnOiBib29sZWFuO1xufVxuXG5jb25zdCBBTkdVTEFSX1BBQ0tBR0VTX1JFR0VYUCA9IC9eQCg/OmFuZ3VsYXJ8bmd1bml2ZXJzYWwpXFwvLztcbmNvbnN0IFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTiA9IHBhdGguam9pbihfX2Rpcm5hbWUsICdzY2hlbWF0aWMvY29sbGVjdGlvbi5qc29uJyk7XG5cbmV4cG9ydCBjbGFzcyBVcGRhdGVDb21tYW5kTW9kdWxlIGV4dGVuZHMgQ29tbWFuZE1vZHVsZTxVcGRhdGVDb21tYW5kQXJncz4ge1xuICBzdGF0aWMgb3ZlcnJpZGUgc2NvcGUgPSBDb21tYW5kU2NvcGUuSW47XG4gIHByb3RlY3RlZCBvdmVycmlkZSBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSBmYWxzZTtcblxuICBjb21tYW5kID0gJ3VwZGF0ZSBbcGFja2FnZXMuLl0nO1xuICBkZXNjcmliZSA9ICdVcGRhdGVzIHlvdXIgd29ya3NwYWNlIGFuZCBpdHMgZGVwZW5kZW5jaWVzLiBTZWUgaHR0cHM6Ly91cGRhdGUuYW5ndWxhci5pby8uJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnbG9uZy1kZXNjcmlwdGlvbi5tZCcpO1xuXG4gIGJ1aWxkZXIobG9jYWxZYXJnczogQXJndik6IEFyZ3Y8VXBkYXRlQ29tbWFuZEFyZ3M+IHtcbiAgICByZXR1cm4gbG9jYWxZYXJnc1xuICAgICAgLnBvc2l0aW9uYWwoJ3BhY2thZ2VzJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBuYW1lcyBvZiBwYWNrYWdlKHMpIHRvIHVwZGF0ZS4nLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgYXJyYXk6IHRydWUsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignZm9yY2UnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICdJZ25vcmUgcGVlciBkZXBlbmRlbmN5IHZlcnNpb24gbWlzbWF0Y2hlcy4gJyArXG4gICAgICAgICAgYFBhc3NlcyB0aGUgJy0tZm9yY2UnIGZsYWcgdG8gdGhlIHBhY2thZ2UgbWFuYWdlciB3aGVuIGluc3RhbGxpbmcgcGFja2FnZXMuYCxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCduZXh0Jywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ1VzZSB0aGUgcHJlcmVsZWFzZSB2ZXJzaW9uLCBpbmNsdWRpbmcgYmV0YSBhbmQgUkNzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignbWlncmF0ZS1vbmx5Jywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ09ubHkgcGVyZm9ybSBhIG1pZ3JhdGlvbiwgZG8gbm90IHVwZGF0ZSB0aGUgaW5zdGFsbGVkIHZlcnNpb24uJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ25hbWUnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICdUaGUgbmFtZSBvZiB0aGUgbWlncmF0aW9uIHRvIHJ1bi4gJyArXG4gICAgICAgICAgYE9ubHkgYXZhaWxhYmxlIHdpdGggYSBzaW5nbGUgcGFja2FnZSBiZWluZyB1cGRhdGVkLCBhbmQgb25seSB3aXRoICdtaWdyYXRlLW9ubHknIG9wdGlvbi5gLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgaW1wbGllczogWydtaWdyYXRlLW9ubHknXSxcbiAgICAgICAgY29uZmxpY3RzOiBbJ3RvJywgJ2Zyb20nXSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdmcm9tJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAnVmVyc2lvbiBmcm9tIHdoaWNoIHRvIG1pZ3JhdGUgZnJvbS4gJyArXG4gICAgICAgICAgYE9ubHkgYXZhaWxhYmxlIHdpdGggYSBzaW5nbGUgcGFja2FnZSBiZWluZyB1cGRhdGVkLCBhbmQgb25seSB3aXRoICdtaWdyYXRlLW9ubHknLmAsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBpbXBsaWVzOiBbJ3RvJywgJ21pZ3JhdGUtb25seSddLFxuICAgICAgICBjb25mbGljdHM6IFsnbmFtZSddLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ3RvJywge1xuICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAnVmVyc2lvbiB1cCB0byB3aGljaCB0byBhcHBseSBtaWdyYXRpb25zLiBPbmx5IGF2YWlsYWJsZSB3aXRoIGEgc2luZ2xlIHBhY2thZ2UgYmVpbmcgdXBkYXRlZCwgJyArXG4gICAgICAgICAgYGFuZCBvbmx5IHdpdGggJ21pZ3JhdGUtb25seScgb3B0aW9uLiBSZXF1aXJlcyAnZnJvbScgdG8gYmUgc3BlY2lmaWVkLiBEZWZhdWx0IHRvIHRoZSBpbnN0YWxsZWQgdmVyc2lvbiBkZXRlY3RlZC5gLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgaW1wbGllczogWydmcm9tJywgJ21pZ3JhdGUtb25seSddLFxuICAgICAgICBjb25mbGljdHM6IFsnbmFtZSddLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2FsbG93LWRpcnR5Jywge1xuICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAnV2hldGhlciB0byBhbGxvdyB1cGRhdGluZyB3aGVuIHRoZSByZXBvc2l0b3J5IGNvbnRhaW5zIG1vZGlmaWVkIG9yIHVudHJhY2tlZCBmaWxlcy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ3ZlcmJvc2UnLCB7XG4gICAgICAgIGRlc2NyaWJlOiAnRGlzcGxheSBhZGRpdGlvbmFsIGRldGFpbHMgYWJvdXQgaW50ZXJuYWwgb3BlcmF0aW9ucyBkdXJpbmcgZXhlY3V0aW9uLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignY3JlYXRlLWNvbW1pdHMnLCB7XG4gICAgICAgIGRlc2NyaWJlOiAnQ3JlYXRlIHNvdXJjZSBjb250cm9sIGNvbW1pdHMgZm9yIHVwZGF0ZXMgYW5kIG1pZ3JhdGlvbnMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBhbGlhczogWydDJ10sXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5jaGVjaygoeyBwYWNrYWdlcywgJ2FsbG93LWRpcnR5JzogYWxsb3dEaXJ0eSwgJ21pZ3JhdGUtb25seSc6IG1pZ3JhdGVPbmx5IH0pID0+IHtcbiAgICAgICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcblxuICAgICAgICAvLyBUaGlzIGFsbG93cyB0aGUgdXNlciB0byBlYXNpbHkgcmVzZXQgYW55IGNoYW5nZXMgZnJvbSB0aGUgdXBkYXRlLlxuICAgICAgICBpZiAocGFja2FnZXM/Lmxlbmd0aCAmJiAhdGhpcy5jaGVja0NsZWFuR2l0KCkpIHtcbiAgICAgICAgICBpZiAoYWxsb3dEaXJ0eSkge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgICdSZXBvc2l0b3J5IGlzIG5vdCBjbGVhbi4gVXBkYXRlIGNoYW5nZXMgd2lsbCBiZSBtaXhlZCB3aXRoIHByZS1leGlzdGluZyBjaGFuZ2VzLicsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKFxuICAgICAgICAgICAgICAnUmVwb3NpdG9yeSBpcyBub3QgY2xlYW4uIFBsZWFzZSBjb21taXQgb3Igc3Rhc2ggYW55IGNoYW5nZXMgYmVmb3JlIHVwZGF0aW5nLicsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtaWdyYXRlT25seSkge1xuICAgICAgICAgIGlmIChwYWNrYWdlcz8ubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKFxuICAgICAgICAgICAgICBgQSBzaW5nbGUgcGFja2FnZSBtdXN0IGJlIHNwZWNpZmllZCB3aGVuIHVzaW5nIHRoZSAnbWlncmF0ZS1vbmx5JyBvcHRpb24uYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLnN0cmljdCgpO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8VXBkYXRlQ29tbWFuZEFyZ3M+KTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgY29uc3QgeyBsb2dnZXIsIHBhY2thZ2VNYW5hZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICBwYWNrYWdlTWFuYWdlci5lbnN1cmVDb21wYXRpYmlsaXR5KCk7XG5cbiAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBpbnN0YWxsZWQgQ0xJIHZlcnNpb24gaXMgb2xkZXIgdGhhbiB0aGUgbGF0ZXN0IGNvbXBhdGlibGUgdmVyc2lvbi5cbiAgICBpZiAoIWRpc2FibGVWZXJzaW9uQ2hlY2spIHtcbiAgICAgIGNvbnN0IGNsaVZlcnNpb25Ub0luc3RhbGwgPSBhd2FpdCB0aGlzLmNoZWNrQ0xJVmVyc2lvbihcbiAgICAgICAgb3B0aW9ucy5wYWNrYWdlcyxcbiAgICAgICAgb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICBvcHRpb25zLm5leHQsXG4gICAgICApO1xuXG4gICAgICBpZiAoY2xpVmVyc2lvblRvSW5zdGFsbCkge1xuICAgICAgICBsb2dnZXIud2FybihcbiAgICAgICAgICAnVGhlIGluc3RhbGxlZCBBbmd1bGFyIENMSSB2ZXJzaW9uIGlzIG91dGRhdGVkLlxcbicgK1xuICAgICAgICAgICAgYEluc3RhbGxpbmcgYSB0ZW1wb3JhcnkgQW5ndWxhciBDTEkgdmVyc2lvbmVkICR7Y2xpVmVyc2lvblRvSW5zdGFsbH0gdG8gcGVyZm9ybSB0aGUgdXBkYXRlLmAsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMucnVuVGVtcEJpbmFyeShgQGFuZ3VsYXIvY2xpQCR7Y2xpVmVyc2lvblRvSW5zdGFsbH1gLCBwcm9jZXNzLmFyZ3Yuc2xpY2UoMikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHBhY2thZ2VzOiBQYWNrYWdlSWRlbnRpZmllcltdID0gW107XG4gICAgZm9yIChjb25zdCByZXF1ZXN0IG9mIG9wdGlvbnMucGFja2FnZXMgPz8gW10pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHBhY2thZ2VJZGVudGlmaWVyID0gbnBhKHJlcXVlc3QpO1xuXG4gICAgICAgIC8vIG9ubHkgcmVnaXN0cnkgaWRlbnRpZmllcnMgYXJlIHN1cHBvcnRlZFxuICAgICAgICBpZiAoIXBhY2thZ2VJZGVudGlmaWVyLnJlZ2lzdHJ5KSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKGBQYWNrYWdlICcke3JlcXVlc3R9JyBpcyBub3QgYSByZWdpc3RyeSBwYWNrYWdlIGlkZW50aWZlci5gKTtcblxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBhY2thZ2VzLnNvbWUoKHYpID0+IHYubmFtZSA9PT0gcGFja2FnZUlkZW50aWZpZXIubmFtZSkpIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoYER1cGxpY2F0ZSBwYWNrYWdlICcke3BhY2thZ2VJZGVudGlmaWVyLm5hbWV9JyBzcGVjaWZpZWQuYCk7XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLm1pZ3JhdGVPbmx5ICYmIHBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMpIHtcbiAgICAgICAgICBsb2dnZXIud2FybignUGFja2FnZSBzcGVjaWZpZXIgaGFzIG5vIGVmZmVjdCB3aGVuIHVzaW5nIFwibWlncmF0ZS1vbmx5XCIgb3B0aW9uLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgbmV4dCBvcHRpb24gaXMgdXNlZCBhbmQgbm8gc3BlY2lmaWVyIHN1cHBsaWVkLCB1c2UgbmV4dCB0YWdcbiAgICAgICAgaWYgKG9wdGlvbnMubmV4dCAmJiAhcGFja2FnZUlkZW50aWZpZXIucmF3U3BlYykge1xuICAgICAgICAgIHBhY2thZ2VJZGVudGlmaWVyLmZldGNoU3BlYyA9ICduZXh0JztcbiAgICAgICAgfVxuXG4gICAgICAgIHBhY2thZ2VzLnB1c2gocGFja2FnZUlkZW50aWZpZXIgYXMgUGFja2FnZUlkZW50aWZpZXIpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoZS5tZXNzYWdlKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbyhgVXNpbmcgcGFja2FnZSBtYW5hZ2VyOiAke2NvbG9ycy5ncmV5KHBhY2thZ2VNYW5hZ2VyLm5hbWUpfWApO1xuICAgIGxvZ2dlci5pbmZvKCdDb2xsZWN0aW5nIGluc3RhbGxlZCBkZXBlbmRlbmNpZXMuLi4nKTtcblxuICAgIGNvbnN0IHJvb3REZXBlbmRlbmNpZXMgPSBhd2FpdCBnZXRQcm9qZWN0RGVwZW5kZW5jaWVzKHRoaXMuY29udGV4dC5yb290KTtcbiAgICBsb2dnZXIuaW5mbyhgRm91bmQgJHtyb290RGVwZW5kZW5jaWVzLnNpemV9IGRlcGVuZGVuY2llcy5gKTtcblxuICAgIGNvbnN0IHdvcmtmbG93ID0gbmV3IE5vZGVXb3JrZmxvdyh0aGlzLmNvbnRleHQucm9vdCwge1xuICAgICAgcGFja2FnZU1hbmFnZXI6IHBhY2thZ2VNYW5hZ2VyLm5hbWUsXG4gICAgICBwYWNrYWdlTWFuYWdlckZvcmNlOiBvcHRpb25zLmZvcmNlLFxuICAgICAgLy8gX19kaXJuYW1lIC0+IGZhdm9yIEBzY2hlbWF0aWNzL3VwZGF0ZSBmcm9tIHRoaXMgcGFja2FnZVxuICAgICAgLy8gT3RoZXJ3aXNlLCB1c2UgcGFja2FnZXMgZnJvbSB0aGUgYWN0aXZlIHdvcmtzcGFjZSAobWlncmF0aW9ucylcbiAgICAgIHJlc29sdmVQYXRoczogW19fZGlybmFtZSwgdGhpcy5jb250ZXh0LnJvb3RdLFxuICAgICAgc2NoZW1hVmFsaWRhdGlvbjogdHJ1ZSxcbiAgICAgIGVuZ2luZUhvc3RDcmVhdG9yOiAob3B0aW9ucykgPT4gbmV3IFNjaGVtYXRpY0VuZ2luZUhvc3Qob3B0aW9ucy5yZXNvbHZlUGF0aHMpLFxuICAgIH0pO1xuXG4gICAgaWYgKHBhY2thZ2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gU2hvdyBzdGF0dXNcbiAgICAgIGNvbnN0IHsgc3VjY2VzcyB9ID0gYXdhaXQgdGhpcy5leGVjdXRlU2NoZW1hdGljKFxuICAgICAgICB3b3JrZmxvdyxcbiAgICAgICAgVVBEQVRFX1NDSEVNQVRJQ19DT0xMRUNUSU9OLFxuICAgICAgICAndXBkYXRlJyxcbiAgICAgICAge1xuICAgICAgICAgIGZvcmNlOiBvcHRpb25zLmZvcmNlLFxuICAgICAgICAgIG5leHQ6IG9wdGlvbnMubmV4dCxcbiAgICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgICAgcGFja2FnZU1hbmFnZXI6IHBhY2thZ2VNYW5hZ2VyLm5hbWUsXG4gICAgICAgICAgcGFja2FnZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIHN1Y2Nlc3MgPyAwIDogMTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0aW9ucy5taWdyYXRlT25seVxuICAgICAgPyB0aGlzLm1pZ3JhdGVPbmx5KHdvcmtmbG93LCAob3B0aW9ucy5wYWNrYWdlcyA/PyBbXSlbMF0sIHJvb3REZXBlbmRlbmNpZXMsIG9wdGlvbnMpXG4gICAgICA6IHRoaXMudXBkYXRlUGFja2FnZXNBbmRNaWdyYXRlKHdvcmtmbG93LCByb290RGVwZW5kZW5jaWVzLCBvcHRpb25zLCBwYWNrYWdlcyk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICBjb2xsZWN0aW9uOiBzdHJpbmcsXG4gICAgc2NoZW1hdGljOiBzdHJpbmcsXG4gICAgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fSxcbiAgKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGZpbGVzOiBTZXQ8c3RyaW5nPiB9PiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCB3b3JrZmxvd1N1YnNjcmlwdGlvbiA9IHN1YnNjcmliZVRvV29ya2Zsb3cod29ya2Zsb3csIGxvZ2dlcik7XG5cbiAgICAvLyBUT0RPOiBBbGxvdyBwYXNzaW5nIGEgc2NoZW1hdGljIGluc3RhbmNlIGRpcmVjdGx5XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHdvcmtmbG93XG4gICAgICAgIC5leGVjdXRlKHtcbiAgICAgICAgICBjb2xsZWN0aW9uLFxuICAgICAgICAgIHNjaGVtYXRpYyxcbiAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgIGxvZ2dlcixcbiAgICAgICAgfSlcbiAgICAgICAgLnRvUHJvbWlzZSgpO1xuXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiAhd29ya2Zsb3dTdWJzY3JpcHRpb24uZXJyb3IsIGZpbGVzOiB3b3JrZmxvd1N1YnNjcmlwdGlvbi5maWxlcyB9O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24pIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGAke2NvbG9ycy5zeW1ib2xzLmNyb3NzfSBNaWdyYXRpb24gZmFpbGVkLiBTZWUgYWJvdmUgZm9yIGZ1cnRoZXIgZGV0YWlscy5cXG5gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGxvZ1BhdGggPSB3cml0ZUVycm9yVG9Mb2dGaWxlKGUpO1xuICAgICAgICBsb2dnZXIuZmF0YWwoXG4gICAgICAgICAgYCR7Y29sb3JzLnN5bWJvbHMuY3Jvc3N9IE1pZ3JhdGlvbiBmYWlsZWQ6ICR7ZS5tZXNzYWdlfVxcbmAgK1xuICAgICAgICAgICAgYCAgU2VlIFwiJHtsb2dQYXRofVwiIGZvciBmdXJ0aGVyIGRldGFpbHMuXFxuYCxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGZpbGVzOiB3b3JrZmxvd1N1YnNjcmlwdGlvbi5maWxlcyB9O1xuICAgIH0gZmluYWxseSB7XG4gICAgICB3b3JrZmxvd1N1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSBtaWdyYXRpb24gd2FzIHBlcmZvcm1lZCBzdWNjZXNzZnVsbHkuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVNaWdyYXRpb24oXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIGNvbGxlY3Rpb25QYXRoOiBzdHJpbmcsXG4gICAgbWlncmF0aW9uTmFtZTogc3RyaW5nLFxuICAgIGNvbW1pdD86IGJvb2xlYW4sXG4gICk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvblBhdGgpO1xuICAgIGNvbnN0IG5hbWUgPSBjb2xsZWN0aW9uLmxpc3RTY2hlbWF0aWNOYW1lcygpLmZpbmQoKG5hbWUpID0+IG5hbWUgPT09IG1pZ3JhdGlvbk5hbWUpO1xuICAgIGlmICghbmFtZSkge1xuICAgICAgbG9nZ2VyLmVycm9yKGBDYW5ub3QgZmluZCBtaWdyYXRpb24gJyR7bWlncmF0aW9uTmFtZX0nIGluICcke3BhY2thZ2VOYW1lfScuYCk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGxvZ2dlci5pbmZvKGNvbG9ycy5jeWFuKGAqKiBFeGVjdXRpbmcgJyR7bWlncmF0aW9uTmFtZX0nIG9mIHBhY2thZ2UgJyR7cGFja2FnZU5hbWV9JyAqKlxcbmApKTtcbiAgICBjb25zdCBzY2hlbWF0aWMgPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlU2NoZW1hdGljKG5hbWUsIGNvbGxlY3Rpb24pO1xuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVBhY2thZ2VNaWdyYXRpb25zKHdvcmtmbG93LCBbc2NoZW1hdGljLmRlc2NyaXB0aW9uXSwgcGFja2FnZU5hbWUsIGNvbW1pdCk7XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgbWlncmF0aW9ucyB3ZXJlIHBlcmZvcm1lZCBzdWNjZXNzZnVsbHkuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVNaWdyYXRpb25zKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICBjb2xsZWN0aW9uUGF0aDogc3RyaW5nLFxuICAgIGZyb206IHN0cmluZyxcbiAgICB0bzogc3RyaW5nLFxuICAgIGNvbW1pdD86IGJvb2xlYW4sXG4gICk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25QYXRoKTtcbiAgICBjb25zdCBtaWdyYXRpb25SYW5nZSA9IG5ldyBzZW12ZXIuUmFuZ2UoXG4gICAgICAnPicgKyAoc2VtdmVyLnByZXJlbGVhc2UoZnJvbSkgPyBmcm9tLnNwbGl0KCctJylbMF0gKyAnLTAnIDogZnJvbSkgKyAnIDw9JyArIHRvLnNwbGl0KCctJylbMF0sXG4gICAgKTtcbiAgICBjb25zdCBtaWdyYXRpb25zID0gW107XG5cbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgY29sbGVjdGlvbi5saXN0U2NoZW1hdGljTmFtZXMoKSkge1xuICAgICAgY29uc3Qgc2NoZW1hdGljID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZVNjaGVtYXRpYyhuYW1lLCBjb2xsZWN0aW9uKTtcbiAgICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gc2NoZW1hdGljLmRlc2NyaXB0aW9uIGFzIHR5cGVvZiBzY2hlbWF0aWMuZGVzY3JpcHRpb24gJiB7XG4gICAgICAgIHZlcnNpb24/OiBzdHJpbmc7XG4gICAgICB9O1xuICAgICAgZGVzY3JpcHRpb24udmVyc2lvbiA9IGNvZXJjZVZlcnNpb25OdW1iZXIoZGVzY3JpcHRpb24udmVyc2lvbik7XG4gICAgICBpZiAoIWRlc2NyaXB0aW9uLnZlcnNpb24pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChzZW12ZXIuc2F0aXNmaWVzKGRlc2NyaXB0aW9uLnZlcnNpb24sIG1pZ3JhdGlvblJhbmdlLCB7IGluY2x1ZGVQcmVyZWxlYXNlOiB0cnVlIH0pKSB7XG4gICAgICAgIG1pZ3JhdGlvbnMucHVzaChkZXNjcmlwdGlvbiBhcyB0eXBlb2Ygc2NoZW1hdGljLmRlc2NyaXB0aW9uICYgeyB2ZXJzaW9uOiBzdHJpbmcgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1pZ3JhdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBtaWdyYXRpb25zLnNvcnQoKGEsIGIpID0+IHNlbXZlci5jb21wYXJlKGEudmVyc2lvbiwgYi52ZXJzaW9uKSB8fCBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpKTtcblxuICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyhcbiAgICAgIGNvbG9ycy5jeWFuKGAqKiBFeGVjdXRpbmcgbWlncmF0aW9ucyBvZiBwYWNrYWdlICcke3BhY2thZ2VOYW1lfScgKipcXG5gKSxcbiAgICApO1xuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVBhY2thZ2VNaWdyYXRpb25zKHdvcmtmbG93LCBtaWdyYXRpb25zLCBwYWNrYWdlTmFtZSwgY29tbWl0KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVBhY2thZ2VNaWdyYXRpb25zKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgbWlncmF0aW9uczogSXRlcmFibGU8eyBuYW1lOiBzdHJpbmc7IGRlc2NyaXB0aW9uOiBzdHJpbmc7IGNvbGxlY3Rpb246IHsgbmFtZTogc3RyaW5nIH0gfT4sXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICBjb21taXQgPSBmYWxzZSxcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGZvciAoY29uc3QgbWlncmF0aW9uIG9mIG1pZ3JhdGlvbnMpIHtcbiAgICAgIGNvbnN0IFt0aXRsZSwgLi4uZGVzY3JpcHRpb25dID0gbWlncmF0aW9uLmRlc2NyaXB0aW9uLnNwbGl0KCcuICcpO1xuXG4gICAgICBsb2dnZXIuaW5mbyhcbiAgICAgICAgY29sb3JzLmN5YW4oY29sb3JzLnN5bWJvbHMucG9pbnRlcikgK1xuICAgICAgICAgICcgJyArXG4gICAgICAgICAgY29sb3JzLmJvbGQodGl0bGUuZW5kc1dpdGgoJy4nKSA/IHRpdGxlIDogdGl0bGUgKyAnLicpLFxuICAgICAgKTtcblxuICAgICAgaWYgKGRlc2NyaXB0aW9uLmxlbmd0aCkge1xuICAgICAgICBsb2dnZXIuaW5mbygnICAnICsgZGVzY3JpcHRpb24uam9pbignLlxcbiAgJykpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgICAgIHdvcmtmbG93LFxuICAgICAgICBtaWdyYXRpb24uY29sbGVjdGlvbi5uYW1lLFxuICAgICAgICBtaWdyYXRpb24ubmFtZSxcbiAgICAgICk7XG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICBsb2dnZXIuaW5mbygnICBNaWdyYXRpb24gY29tcGxldGVkLicpO1xuXG4gICAgICAvLyBDb21taXQgbWlncmF0aW9uXG4gICAgICBpZiAoY29tbWl0KSB7XG4gICAgICAgIGNvbnN0IGNvbW1pdFByZWZpeCA9IGAke3BhY2thZ2VOYW1lfSBtaWdyYXRpb24gLSAke21pZ3JhdGlvbi5uYW1lfWA7XG4gICAgICAgIGNvbnN0IGNvbW1pdE1lc3NhZ2UgPSBtaWdyYXRpb24uZGVzY3JpcHRpb25cbiAgICAgICAgICA/IGAke2NvbW1pdFByZWZpeH1cXG5cXG4ke21pZ3JhdGlvbi5kZXNjcmlwdGlvbn1gXG4gICAgICAgICAgOiBjb21taXRQcmVmaXg7XG4gICAgICAgIGNvbnN0IGNvbW1pdHRlZCA9IHRoaXMuY29tbWl0KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgICBpZiAoIWNvbW1pdHRlZCkge1xuICAgICAgICAgIC8vIEZhaWxlZCB0byBjb21taXQsIHNvbWV0aGluZyB3ZW50IHdyb25nLiBBYm9ydCB0aGUgdXBkYXRlLlxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGxvZ2dlci5pbmZvKCcnKTsgLy8gRXh0cmEgdHJhaWxpbmcgbmV3bGluZS5cbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbWlncmF0ZU9ubHkoXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIHJvb3REZXBlbmRlbmNpZXM6IE1hcDxzdHJpbmcsIFBhY2thZ2VUcmVlTm9kZT4sXG4gICAgb3B0aW9uczogT3B0aW9uczxVcGRhdGVDb21tYW5kQXJncz4sXG4gICk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgcGFja2FnZURlcGVuZGVuY3kgPSByb290RGVwZW5kZW5jaWVzLmdldChwYWNrYWdlTmFtZSk7XG4gICAgbGV0IHBhY2thZ2VQYXRoID0gcGFja2FnZURlcGVuZGVuY3k/LnBhdGg7XG4gICAgbGV0IHBhY2thZ2VOb2RlID0gcGFja2FnZURlcGVuZGVuY3k/LnBhY2thZ2U7XG4gICAgaWYgKHBhY2thZ2VEZXBlbmRlbmN5ICYmICFwYWNrYWdlTm9kZSkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdQYWNrYWdlIGZvdW5kIGluIHBhY2thZ2UuanNvbiBidXQgaXMgbm90IGluc3RhbGxlZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmICghcGFja2FnZURlcGVuZGVuY3kpIHtcbiAgICAgIC8vIEFsbG93IHJ1bm5pbmcgbWlncmF0aW9ucyBvbiB0cmFuc2l0aXZlbHkgaW5zdGFsbGVkIGRlcGVuZGVuY2llc1xuICAgICAgLy8gVGhlcmUgY2FuIHRlY2huaWNhbGx5IGJlIG5lc3RlZCBtdWx0aXBsZSB2ZXJzaW9uc1xuICAgICAgLy8gVE9ETzogSWYgbXVsdGlwbGUsIHRoaXMgc2hvdWxkIGZpbmQgYWxsIHZlcnNpb25zIGFuZCBhc2sgd2hpY2ggb25lIHRvIHVzZVxuICAgICAgY29uc3QgcGFja2FnZUpzb24gPSBmaW5kUGFja2FnZUpzb24odGhpcy5jb250ZXh0LnJvb3QsIHBhY2thZ2VOYW1lKTtcbiAgICAgIGlmIChwYWNrYWdlSnNvbikge1xuICAgICAgICBwYWNrYWdlUGF0aCA9IHBhdGguZGlybmFtZShwYWNrYWdlSnNvbik7XG4gICAgICAgIHBhY2thZ2VOb2RlID0gYXdhaXQgcmVhZFBhY2thZ2VKc29uKHBhY2thZ2VKc29uKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXBhY2thZ2VOb2RlIHx8ICFwYWNrYWdlUGF0aCkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdQYWNrYWdlIGlzIG5vdCBpbnN0YWxsZWQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGNvbnN0IHVwZGF0ZU1ldGFkYXRhID0gcGFja2FnZU5vZGVbJ25nLXVwZGF0ZSddO1xuICAgIGxldCBtaWdyYXRpb25zID0gdXBkYXRlTWV0YWRhdGE/Lm1pZ3JhdGlvbnM7XG4gICAgaWYgKG1pZ3JhdGlvbnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdQYWNrYWdlIGRvZXMgbm90IHByb3ZpZGUgbWlncmF0aW9ucy4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbWlncmF0aW9ucyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBjb250YWlucyBhIG1hbGZvcm1lZCBtaWdyYXRpb25zIGZpZWxkLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKHBhdGgucG9zaXguaXNBYnNvbHV0ZShtaWdyYXRpb25zKSB8fCBwYXRoLndpbjMyLmlzQWJzb2x1dGUobWlncmF0aW9ucykpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgJ1BhY2thZ2UgY29udGFpbnMgYW4gaW52YWxpZCBtaWdyYXRpb25zIGZpZWxkLiBBYnNvbHV0ZSBwYXRocyBhcmUgbm90IHBlcm1pdHRlZC4nLFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gTm9ybWFsaXplIHNsYXNoZXNcbiAgICBtaWdyYXRpb25zID0gbWlncmF0aW9ucy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgICBpZiAobWlncmF0aW9ucy5zdGFydHNXaXRoKCcuLi8nKSkge1xuICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAnUGFja2FnZSBjb250YWlucyBhbiBpbnZhbGlkIG1pZ3JhdGlvbnMgZmllbGQuIFBhdGhzIG91dHNpZGUgdGhlIHBhY2thZ2Ugcm9vdCBhcmUgbm90IHBlcm1pdHRlZC4nLFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgaXQgaXMgYSBwYWNrYWdlLWxvY2FsIGxvY2F0aW9uXG4gICAgY29uc3QgbG9jYWxNaWdyYXRpb25zID0gcGF0aC5qb2luKHBhY2thZ2VQYXRoLCBtaWdyYXRpb25zKTtcbiAgICBpZiAoZXhpc3RzU3luYyhsb2NhbE1pZ3JhdGlvbnMpKSB7XG4gICAgICBtaWdyYXRpb25zID0gbG9jYWxNaWdyYXRpb25zO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUcnkgdG8gcmVzb2x2ZSBmcm9tIHBhY2thZ2UgbG9jYXRpb24uXG4gICAgICAvLyBUaGlzIGF2b2lkcyBpc3N1ZXMgd2l0aCBwYWNrYWdlIGhvaXN0aW5nLlxuICAgICAgdHJ5IHtcbiAgICAgICAgbWlncmF0aW9ucyA9IHJlcXVpcmUucmVzb2x2ZShtaWdyYXRpb25zLCB7IHBhdGhzOiBbcGFja2FnZVBhdGhdIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoJ01pZ3JhdGlvbnMgZm9yIHBhY2thZ2Ugd2VyZSBub3QgZm91bmQuJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKGBVbmFibGUgdG8gcmVzb2x2ZSBtaWdyYXRpb25zIGZvciBwYWNrYWdlLiAgWyR7ZS5tZXNzYWdlfV1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChvcHRpb25zLm5hbWUpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4ZWN1dGVNaWdyYXRpb24oXG4gICAgICAgIHdvcmtmbG93LFxuICAgICAgICBwYWNrYWdlTmFtZSxcbiAgICAgICAgbWlncmF0aW9ucyxcbiAgICAgICAgb3B0aW9ucy5uYW1lLFxuICAgICAgICBvcHRpb25zLmNyZWF0ZUNvbW1pdHMsXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IGZyb20gPSBjb2VyY2VWZXJzaW9uTnVtYmVyKG9wdGlvbnMuZnJvbSk7XG4gICAgaWYgKCFmcm9tKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYFwiZnJvbVwiIHZhbHVlIFske29wdGlvbnMuZnJvbX1dIGlzIG5vdCBhIHZhbGlkIHZlcnNpb24uYCk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVNaWdyYXRpb25zKFxuICAgICAgd29ya2Zsb3csXG4gICAgICBwYWNrYWdlTmFtZSxcbiAgICAgIG1pZ3JhdGlvbnMsXG4gICAgICBmcm9tLFxuICAgICAgb3B0aW9ucy50byB8fCBwYWNrYWdlTm9kZS52ZXJzaW9uLFxuICAgICAgb3B0aW9ucy5jcmVhdGVDb21taXRzLFxuICAgICk7XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxpbmVzLXBlci1mdW5jdGlvblxuICBwcml2YXRlIGFzeW5jIHVwZGF0ZVBhY2thZ2VzQW5kTWlncmF0ZShcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIHJvb3REZXBlbmRlbmNpZXM6IE1hcDxzdHJpbmcsIFBhY2thZ2VUcmVlTm9kZT4sXG4gICAgb3B0aW9uczogT3B0aW9uczxVcGRhdGVDb21tYW5kQXJncz4sXG4gICAgcGFja2FnZXM6IFBhY2thZ2VJZGVudGlmaWVyW10sXG4gICk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcblxuICAgIGNvbnN0IGxvZ1ZlcmJvc2UgPSAobWVzc2FnZTogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAob3B0aW9ucy52ZXJib3NlKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKG1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCByZXF1ZXN0czoge1xuICAgICAgaWRlbnRpZmllcjogUGFja2FnZUlkZW50aWZpZXI7XG4gICAgICBub2RlOiBQYWNrYWdlVHJlZU5vZGU7XG4gICAgfVtdID0gW107XG5cbiAgICAvLyBWYWxpZGF0ZSBwYWNrYWdlcyBhY3R1YWxseSBhcmUgcGFydCBvZiB0aGUgd29ya3NwYWNlXG4gICAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXMpIHtcbiAgICAgIGNvbnN0IG5vZGUgPSByb290RGVwZW5kZW5jaWVzLmdldChwa2cubmFtZSk7XG4gICAgICBpZiAoIW5vZGU/LnBhY2thZ2UpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBQYWNrYWdlICcke3BrZy5uYW1lfScgaXMgbm90IGEgZGVwZW5kZW5jeS5gKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgYSBzcGVjaWZpYyB2ZXJzaW9uIGlzIHJlcXVlc3RlZCBhbmQgbWF0Y2hlcyB0aGUgaW5zdGFsbGVkIHZlcnNpb24sIHNraXAuXG4gICAgICBpZiAocGtnLnR5cGUgPT09ICd2ZXJzaW9uJyAmJiBub2RlLnBhY2thZ2UudmVyc2lvbiA9PT0gcGtnLmZldGNoU3BlYykge1xuICAgICAgICBsb2dnZXIuaW5mbyhgUGFja2FnZSAnJHtwa2cubmFtZX0nIGlzIGFscmVhZHkgYXQgJyR7cGtnLmZldGNoU3BlY30nLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdHMucHVzaCh7IGlkZW50aWZpZXI6IHBrZywgbm9kZSB9KTtcbiAgICB9XG5cbiAgICBpZiAocmVxdWVzdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbygnRmV0Y2hpbmcgZGVwZW5kZW5jeSBtZXRhZGF0YSBmcm9tIHJlZ2lzdHJ5Li4uJyk7XG5cbiAgICBjb25zdCBwYWNrYWdlc1RvVXBkYXRlOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgeyBpZGVudGlmaWVyOiByZXF1ZXN0SWRlbnRpZmllciwgbm9kZSB9IG9mIHJlcXVlc3RzKSB7XG4gICAgICBjb25zdCBwYWNrYWdlTmFtZSA9IHJlcXVlc3RJZGVudGlmaWVyLm5hbWU7XG5cbiAgICAgIGxldCBtZXRhZGF0YTtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIE1ldGFkYXRhIHJlcXVlc3RzIGFyZSBpbnRlcm5hbGx5IGNhY2hlZDsgbXVsdGlwbGUgcmVxdWVzdHMgZm9yIHNhbWUgbmFtZVxuICAgICAgICAvLyBkb2VzIG5vdCByZXN1bHQgaW4gYWRkaXRpb25hbCBuZXR3b3JrIHRyYWZmaWNcbiAgICAgICAgbWV0YWRhdGEgPSBhd2FpdCBmZXRjaFBhY2thZ2VNZXRhZGF0YShwYWNrYWdlTmFtZSwgbG9nZ2VyLCB7XG4gICAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBmZXRjaGluZyBtZXRhZGF0YSBmb3IgJyR7cGFja2FnZU5hbWV9JzogYCArIGUubWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIFRyeSB0byBmaW5kIGEgcGFja2FnZSB2ZXJzaW9uIGJhc2VkIG9uIHRoZSB1c2VyIHJlcXVlc3RlZCBwYWNrYWdlIHNwZWNpZmllclxuICAgICAgLy8gcmVnaXN0cnkgc3BlY2lmaWVyIHR5cGVzIGFyZSBlaXRoZXIgdmVyc2lvbiwgcmFuZ2UsIG9yIHRhZ1xuICAgICAgbGV0IG1hbmlmZXN0OiBQYWNrYWdlTWFuaWZlc3QgfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoXG4gICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICd2ZXJzaW9uJyB8fFxuICAgICAgICByZXF1ZXN0SWRlbnRpZmllci50eXBlID09PSAncmFuZ2UnIHx8XG4gICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICd0YWcnXG4gICAgICApIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtYW5pZmVzdCA9IHBpY2tNYW5pZmVzdChtZXRhZGF0YSwgcmVxdWVzdElkZW50aWZpZXIuZmV0Y2hTcGVjKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdFVEFSR0VUJykge1xuICAgICAgICAgICAgLy8gSWYgbm90IGZvdW5kIGFuZCBuZXh0IHdhcyB1c2VkIGFuZCB1c2VyIGRpZCBub3QgcHJvdmlkZSBhIHNwZWNpZmllciwgdHJ5IGxhdGVzdC5cbiAgICAgICAgICAgIC8vIFBhY2thZ2UgbWF5IG5vdCBoYXZlIGEgbmV4dCB0YWcuXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICd0YWcnICYmXG4gICAgICAgICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLmZldGNoU3BlYyA9PT0gJ25leHQnICYmXG4gICAgICAgICAgICAgICFyZXF1ZXN0SWRlbnRpZmllci5yYXdTcGVjXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBtYW5pZmVzdCA9IHBpY2tNYW5pZmVzdChtZXRhZGF0YSwgJ2xhdGVzdCcpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUuY29kZSAhPT0gJ0VUQVJHRVQnICYmIGUuY29kZSAhPT0gJ0VOT1ZFUlNJT05TJykge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKGUuY29kZSAhPT0gJ0VOT1ZFUlNJT05TJykge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFtYW5pZmVzdCkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgYFBhY2thZ2Ugc3BlY2lmaWVkIGJ5ICcke3JlcXVlc3RJZGVudGlmaWVyLnJhd30nIGRvZXMgbm90IGV4aXN0IHdpdGhpbiB0aGUgcmVnaXN0cnkuYCxcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1hbmlmZXN0LnZlcnNpb24gPT09IG5vZGUucGFja2FnZT8udmVyc2lvbikge1xuICAgICAgICBsb2dnZXIuaW5mbyhgUGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nIGlzIGFscmVhZHkgdXAgdG8gZGF0ZS5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChub2RlLnBhY2thZ2UgJiYgQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAudGVzdChub2RlLnBhY2thZ2UubmFtZSkpIHtcbiAgICAgICAgY29uc3QgeyBuYW1lLCB2ZXJzaW9uIH0gPSBub2RlLnBhY2thZ2U7XG4gICAgICAgIGNvbnN0IHRvQmVJbnN0YWxsZWRNYWpvclZlcnNpb24gPSArbWFuaWZlc3QudmVyc2lvbi5zcGxpdCgnLicpWzBdO1xuICAgICAgICBjb25zdCBjdXJyZW50TWFqb3JWZXJzaW9uID0gK3ZlcnNpb24uc3BsaXQoJy4nKVswXTtcblxuICAgICAgICBpZiAodG9CZUluc3RhbGxlZE1ham9yVmVyc2lvbiAtIGN1cnJlbnRNYWpvclZlcnNpb24gPiAxKSB7XG4gICAgICAgICAgLy8gT25seSBhbGxvdyB1cGRhdGluZyBhIHNpbmdsZSB2ZXJzaW9uIGF0IGEgdGltZS5cbiAgICAgICAgICBpZiAoY3VycmVudE1ham9yVmVyc2lvbiA8IDYpIHtcbiAgICAgICAgICAgIC8vIEJlZm9yZSB2ZXJzaW9uIDYsIHRoZSBtYWpvciB2ZXJzaW9ucyB3ZXJlIG5vdCBhbHdheXMgc2VxdWVudGlhbC5cbiAgICAgICAgICAgIC8vIEV4YW1wbGUgQGFuZ3VsYXIvY29yZSBza2lwcGVkIHZlcnNpb24gMywgQGFuZ3VsYXIvY2xpIHNraXBwZWQgdmVyc2lvbnMgMi01LlxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVXBkYXRpbmcgbXVsdGlwbGUgbWFqb3IgdmVyc2lvbnMgb2YgJyR7bmFtZX0nIGF0IG9uY2UgaXMgbm90IHN1cHBvcnRlZC4gUGxlYXNlIG1pZ3JhdGUgZWFjaCBtYWpvciB2ZXJzaW9uIGluZGl2aWR1YWxseS5cXG5gICtcbiAgICAgICAgICAgICAgICBgRm9yIG1vcmUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHVwZGF0ZSBwcm9jZXNzLCBzZWUgaHR0cHM6Ly91cGRhdGUuYW5ndWxhci5pby8uYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG5leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudCA9IGN1cnJlbnRNYWpvclZlcnNpb24gKyAxO1xuXG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBVcGRhdGluZyBtdWx0aXBsZSBtYWpvciB2ZXJzaW9ucyBvZiAnJHtuYW1lfScgYXQgb25jZSBpcyBub3Qgc3VwcG9ydGVkLiBQbGVhc2UgbWlncmF0ZSBlYWNoIG1ham9yIHZlcnNpb24gaW5kaXZpZHVhbGx5LlxcbmAgK1xuICAgICAgICAgICAgICAgIGBSdW4gJ25nIHVwZGF0ZSAke25hbWV9QCR7bmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50fScgaW4geW91ciB3b3Jrc3BhY2UgZGlyZWN0b3J5IGAgK1xuICAgICAgICAgICAgICAgIGB0byB1cGRhdGUgdG8gbGF0ZXN0ICcke25leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudH0ueCcgdmVyc2lvbiBvZiAnJHtuYW1lfScuXFxuXFxuYCArXG4gICAgICAgICAgICAgICAgYEZvciBtb3JlIGluZm9ybWF0aW9uIGFib3V0IHRoZSB1cGRhdGUgcHJvY2Vzcywgc2VlIGh0dHBzOi8vdXBkYXRlLmFuZ3VsYXIuaW8vP3Y9JHtjdXJyZW50TWFqb3JWZXJzaW9ufS4wLSR7bmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50fS4wYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcGFja2FnZXNUb1VwZGF0ZS5wdXNoKHJlcXVlc3RJZGVudGlmaWVyLnRvU3RyaW5nKCkpO1xuICAgIH1cblxuICAgIGlmIChwYWNrYWdlc1RvVXBkYXRlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgY29uc3QgeyBzdWNjZXNzIH0gPSBhd2FpdCB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgICB3b3JrZmxvdyxcbiAgICAgIFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTixcbiAgICAgICd1cGRhdGUnLFxuICAgICAge1xuICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgIGZvcmNlOiBvcHRpb25zLmZvcmNlLFxuICAgICAgICBuZXh0OiBvcHRpb25zLm5leHQsXG4gICAgICAgIHBhY2thZ2VNYW5hZ2VyOiB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIubmFtZSxcbiAgICAgICAgcGFja2FnZXM6IHBhY2thZ2VzVG9VcGRhdGUsXG4gICAgICB9LFxuICAgICk7XG5cbiAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMucm0ocGF0aC5qb2luKHRoaXMuY29udGV4dC5yb290LCAnbm9kZV9tb2R1bGVzJyksIHtcbiAgICAgICAgICBmb3JjZTogdHJ1ZSxcbiAgICAgICAgICByZWN1cnNpdmU6IHRydWUsXG4gICAgICAgICAgbWF4UmV0cmllczogMyxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIHt9XG5cbiAgICAgIGxldCBmb3JjZUluc3RhbGwgPSBmYWxzZTtcbiAgICAgIC8vIG5wbSA3KyBjYW4gZmFpbCBkdWUgdG8gaXQgaW5jb3JyZWN0bHkgcmVzb2x2aW5nIHBlZXIgZGVwZW5kZW5jaWVzIHRoYXQgaGF2ZSB2YWxpZCBTZW1WZXJcbiAgICAgIC8vIHJhbmdlcyBkdXJpbmcgYW4gdXBkYXRlLiBVcGRhdGUgd2lsbCBzZXQgY29ycmVjdCB2ZXJzaW9ucyBvZiBkZXBlbmRlbmNpZXMgd2l0aGluIHRoZVxuICAgICAgLy8gcGFja2FnZS5qc29uIGZpbGUuIFRoZSBmb3JjZSBvcHRpb24gaXMgc2V0IHRvIHdvcmthcm91bmQgdGhlc2UgZXJyb3JzLlxuICAgICAgLy8gRXhhbXBsZSBlcnJvcjpcbiAgICAgIC8vIG5wbSBFUlIhIENvbmZsaWN0aW5nIHBlZXIgZGVwZW5kZW5jeTogQGFuZ3VsYXIvY29tcGlsZXItY2xpQDE0LjAuMC1yYy4wXG4gICAgICAvLyBucG0gRVJSISBub2RlX21vZHVsZXMvQGFuZ3VsYXIvY29tcGlsZXItY2xpXG4gICAgICAvLyBucG0gRVJSISAgIHBlZXIgQGFuZ3VsYXIvY29tcGlsZXItY2xpQFwiXjE0LjAuMCB8fCBeMTQuMC4wLXJjXCIgZnJvbSBAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhckAxNC4wLjAtcmMuMFxuICAgICAgLy8gbnBtIEVSUiEgICBub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXJcbiAgICAgIC8vIG5wbSBFUlIhICAgICBkZXYgQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXJAXCJ+MTQuMC4wLXJjLjBcIiBmcm9tIHRoZSByb290IHByb2plY3RcbiAgICAgIGlmIChcbiAgICAgICAgdGhpcy5jb250ZXh0LnBhY2thZ2VNYW5hZ2VyLm5hbWUgPT09IFBhY2thZ2VNYW5hZ2VyLk5wbSAmJlxuICAgICAgICB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIudmVyc2lvbiAmJlxuICAgICAgICBzZW12ZXIuZ3RlKHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci52ZXJzaW9uLCAnNy4wLjAnLCB7IGluY2x1ZGVQcmVyZWxlYXNlOiB0cnVlIH0pXG4gICAgICApIHtcbiAgICAgICAgbG9nVmVyYm9zZSgnTlBNIDcrIGRldGVjdGVkIC0tIGVuYWJsaW5nIGZvcmNlIG9wdGlvbiBmb3IgcGFja2FnZSBpbnN0YWxsYXRpb24nKTtcbiAgICAgICAgZm9yY2VJbnN0YWxsID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGluc3RhbGxhdGlvblN1Y2Nlc3MgPSBhd2FpdCB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIuaW5zdGFsbEFsbChcbiAgICAgICAgZm9yY2VJbnN0YWxsID8gWyctLWZvcmNlJ10gOiBbXSxcbiAgICAgICAgdGhpcy5jb250ZXh0LnJvb3QsXG4gICAgICApO1xuXG4gICAgICBpZiAoIWluc3RhbGxhdGlvblN1Y2Nlc3MpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1Y2Nlc3MgJiYgb3B0aW9ucy5jcmVhdGVDb21taXRzKSB7XG4gICAgICBpZiAoIXRoaXMuY29tbWl0KGBBbmd1bGFyIENMSSB1cGRhdGUgZm9yIHBhY2thZ2VzIC0gJHtwYWNrYWdlc1RvVXBkYXRlLmpvaW4oJywgJyl9YCkpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhpcyBpcyBhIHRlbXBvcmFyeSB3b3JrYXJvdW5kIHRvIGFsbG93IGRhdGEgdG8gYmUgcGFzc2VkIGJhY2sgZnJvbSB0aGUgdXBkYXRlIHNjaGVtYXRpY1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgY29uc3QgbWlncmF0aW9ucyA9IChnbG9iYWwgYXMgYW55KS5leHRlcm5hbE1pZ3JhdGlvbnMgYXMge1xuICAgICAgcGFja2FnZTogc3RyaW5nO1xuICAgICAgY29sbGVjdGlvbjogc3RyaW5nO1xuICAgICAgZnJvbTogc3RyaW5nO1xuICAgICAgdG86IHN0cmluZztcbiAgICB9W107XG5cbiAgICBpZiAoc3VjY2VzcyAmJiBtaWdyYXRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IG1pZ3JhdGlvbiBvZiBtaWdyYXRpb25zKSB7XG4gICAgICAgIC8vIFJlc29sdmUgdGhlIHBhY2thZ2UgZnJvbSB0aGUgd29ya3NwYWNlIHJvb3QsIGFzIG90aGVyd2lzZSBpdCB3aWxsIGJlIHJlc29sdmVkIGZyb20gdGhlIHRlbXBcbiAgICAgICAgLy8gaW5zdGFsbGVkIENMSSB2ZXJzaW9uLlxuICAgICAgICBsZXQgcGFja2FnZVBhdGg7XG4gICAgICAgIGxvZ1ZlcmJvc2UoXG4gICAgICAgICAgYFJlc29sdmluZyBtaWdyYXRpb24gcGFja2FnZSAnJHttaWdyYXRpb24ucGFja2FnZX0nIGZyb20gJyR7dGhpcy5jb250ZXh0LnJvb3R9Jy4uLmAsXG4gICAgICAgICk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHBhY2thZ2VQYXRoID0gcGF0aC5kaXJuYW1lKFxuICAgICAgICAgICAgICAvLyBUaGlzIG1heSBmYWlsIGlmIHRoZSBgcGFja2FnZS5qc29uYCBpcyBub3QgZXhwb3J0ZWQgYXMgYW4gZW50cnkgcG9pbnRcbiAgICAgICAgICAgICAgcmVxdWlyZS5yZXNvbHZlKHBhdGguam9pbihtaWdyYXRpb24ucGFja2FnZSwgJ3BhY2thZ2UuanNvbicpLCB7XG4gICAgICAgICAgICAgICAgcGF0aHM6IFt0aGlzLmNvbnRleHQucm9vdF0sXG4gICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gdHJ5aW5nIHRvIHJlc29sdmUgdGhlIHBhY2thZ2UncyBtYWluIGVudHJ5IHBvaW50XG4gICAgICAgICAgICAgIHBhY2thZ2VQYXRoID0gcmVxdWlyZS5yZXNvbHZlKG1pZ3JhdGlvbi5wYWNrYWdlLCB7IHBhdGhzOiBbdGhpcy5jb250ZXh0LnJvb3RdIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgIGxvZ1ZlcmJvc2UoZS50b1N0cmluZygpKTtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgYE1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KSB3ZXJlIG5vdCBmb3VuZC5gICtcbiAgICAgICAgICAgICAgICAnIFRoZSBwYWNrYWdlIGNvdWxkIG5vdCBiZSBmb3VuZCBpbiB0aGUgd29ya3NwYWNlLicsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBVbmFibGUgdG8gcmVzb2x2ZSBtaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkuICBbJHtlLm1lc3NhZ2V9XWAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG1pZ3JhdGlvbnM7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQgaXMgYSBwYWNrYWdlLWxvY2FsIGxvY2F0aW9uXG4gICAgICAgIGNvbnN0IGxvY2FsTWlncmF0aW9ucyA9IHBhdGguam9pbihwYWNrYWdlUGF0aCwgbWlncmF0aW9uLmNvbGxlY3Rpb24pO1xuICAgICAgICBpZiAoZXhpc3RzU3luYyhsb2NhbE1pZ3JhdGlvbnMpKSB7XG4gICAgICAgICAgbWlncmF0aW9ucyA9IGxvY2FsTWlncmF0aW9ucztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBUcnkgdG8gcmVzb2x2ZSBmcm9tIHBhY2thZ2UgbG9jYXRpb24uXG4gICAgICAgICAgLy8gVGhpcyBhdm9pZHMgaXNzdWVzIHdpdGggcGFja2FnZSBob2lzdGluZy5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgbWlncmF0aW9ucyA9IHJlcXVpcmUucmVzb2x2ZShtaWdyYXRpb24uY29sbGVjdGlvbiwgeyBwYXRoczogW3BhY2thZ2VQYXRoXSB9KTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBNaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkgd2VyZSBub3QgZm91bmQuYCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KS4gIFske2UubWVzc2FnZX1dYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbnMoXG4gICAgICAgICAgd29ya2Zsb3csXG4gICAgICAgICAgbWlncmF0aW9uLnBhY2thZ2UsXG4gICAgICAgICAgbWlncmF0aW9ucyxcbiAgICAgICAgICBtaWdyYXRpb24uZnJvbSxcbiAgICAgICAgICBtaWdyYXRpb24udG8sXG4gICAgICAgICAgb3B0aW9ucy5jcmVhdGVDb21taXRzLFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIEEgbm9uLXplcm8gdmFsdWUgaXMgYSBmYWlsdXJlIGZvciB0aGUgcGFja2FnZSdzIG1pZ3JhdGlvbnNcbiAgICAgICAgaWYgKHJlc3VsdCAhPT0gMCkge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3VjY2VzcyA/IDAgOiAxO1xuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSBjb21taXQgd2FzIHN1Y2Nlc3NmdWwuXG4gICAqL1xuICBwcml2YXRlIGNvbW1pdChtZXNzYWdlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgLy8gQ2hlY2sgaWYgYSBjb21taXQgaXMgbmVlZGVkLlxuICAgIGxldCBjb21taXROZWVkZWQ6IGJvb2xlYW47XG4gICAgdHJ5IHtcbiAgICAgIGNvbW1pdE5lZWRlZCA9IGhhc0NoYW5nZXNUb0NvbW1pdCgpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nZ2VyLmVycm9yKGAgIEZhaWxlZCB0byByZWFkIEdpdCB0cmVlOlxcbiR7ZXJyLnN0ZGVycn1gKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghY29tbWl0TmVlZGVkKSB7XG4gICAgICBsb2dnZXIuaW5mbygnICBObyBjaGFuZ2VzIHRvIGNvbW1pdCBhZnRlciBtaWdyYXRpb24uJyk7XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIENvbW1pdCBjaGFuZ2VzIGFuZCBhYm9ydCBvbiBlcnJvci5cbiAgICB0cnkge1xuICAgICAgY3JlYXRlQ29tbWl0KG1lc3NhZ2UpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nZ2VyLmVycm9yKGBGYWlsZWQgdG8gY29tbWl0IHVwZGF0ZSAoJHttZXNzYWdlfSk6XFxuJHtlcnIuc3RkZXJyfWApO1xuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gTm90aWZ5IHVzZXIgb2YgdGhlIGNvbW1pdC5cbiAgICBjb25zdCBoYXNoID0gZmluZEN1cnJlbnRHaXRTaGEoKTtcbiAgICBjb25zdCBzaG9ydE1lc3NhZ2UgPSBtZXNzYWdlLnNwbGl0KCdcXG4nKVswXTtcbiAgICBpZiAoaGFzaCkge1xuICAgICAgbG9nZ2VyLmluZm8oYCAgQ29tbWl0dGVkIG1pZ3JhdGlvbiBzdGVwICgke2dldFNob3J0SGFzaChoYXNoKX0pOiAke3Nob3J0TWVzc2FnZX0uYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIENvbW1pdCB3YXMgc3VjY2Vzc2Z1bCwgYnV0IHJlYWRpbmcgdGhlIGhhc2ggd2FzIG5vdC4gU29tZXRoaW5nIHdlaXJkIGhhcHBlbmVkLFxuICAgICAgLy8gYnV0IG5vdGhpbmcgdGhhdCB3b3VsZCBzdG9wIHRoZSB1cGRhdGUuIEp1c3QgbG9nIHRoZSB3ZWlyZG5lc3MgYW5kIGNvbnRpbnVlLlxuICAgICAgbG9nZ2VyLmluZm8oYCAgQ29tbWl0dGVkIG1pZ3JhdGlvbiBzdGVwOiAke3Nob3J0TWVzc2FnZX0uYCk7XG4gICAgICBsb2dnZXIud2FybignICBGYWlsZWQgdG8gbG9vayB1cCBoYXNoIG9mIG1vc3QgcmVjZW50IGNvbW1pdCwgY29udGludWluZyBhbnl3YXlzLicpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBjaGVja0NsZWFuR2l0KCk6IGJvb2xlYW4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0b3BMZXZlbCA9IGV4ZWNTeW5jKCdnaXQgcmV2LXBhcnNlIC0tc2hvdy10b3BsZXZlbCcsIHtcbiAgICAgICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICAgICAgc3RkaW86ICdwaXBlJyxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcmVzdWx0ID0gZXhlY1N5bmMoJ2dpdCBzdGF0dXMgLS1wb3JjZWxhaW4nLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSk7XG4gICAgICBpZiAocmVzdWx0LnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgZmlsZXMgaW5zaWRlIHRoZSB3b3Jrc3BhY2Ugcm9vdCBhcmUgcmVsZXZhbnRcbiAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgcmVzdWx0LnNwbGl0KCdcXG4nKSkge1xuICAgICAgICBjb25zdCByZWxhdGl2ZUVudHJ5ID0gcGF0aC5yZWxhdGl2ZShcbiAgICAgICAgICBwYXRoLnJlc29sdmUodGhpcy5jb250ZXh0LnJvb3QpLFxuICAgICAgICAgIHBhdGgucmVzb2x2ZSh0b3BMZXZlbC50cmltKCksIGVudHJ5LnNsaWNlKDMpLnRyaW0oKSksXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKCFyZWxhdGl2ZUVudHJ5LnN0YXJ0c1dpdGgoJy4uJykgJiYgIXBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZUVudHJ5KSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2gge31cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgY3VycmVudCBpbnN0YWxsZWQgQ0xJIHZlcnNpb24gaXMgb2xkZXIgb3IgbmV3ZXIgdGhhbiBhIGNvbXBhdGlibGUgdmVyc2lvbi5cbiAgICogQHJldHVybnMgdGhlIHZlcnNpb24gdG8gaW5zdGFsbCBvciBudWxsIHdoZW4gdGhlcmUgaXMgbm8gdXBkYXRlIHRvIGluc3RhbGwuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGNoZWNrQ0xJVmVyc2lvbihcbiAgICBwYWNrYWdlc1RvVXBkYXRlOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCxcbiAgICB2ZXJib3NlID0gZmFsc2UsXG4gICAgbmV4dCA9IGZhbHNlLFxuICApOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICBjb25zdCB7IHZlcnNpb24gfSA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KFxuICAgICAgYEBhbmd1bGFyL2NsaUAke3RoaXMuZ2V0Q0xJVXBkYXRlUnVubmVyVmVyc2lvbihwYWNrYWdlc1RvVXBkYXRlLCBuZXh0KX1gLFxuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlcixcbiAgICAgIHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgdXNpbmdZYXJuOiB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIubmFtZSA9PT0gUGFja2FnZU1hbmFnZXIuWWFybixcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIHJldHVybiBWRVJTSU9OLmZ1bGwgPT09IHZlcnNpb24gPyBudWxsIDogdmVyc2lvbjtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q0xJVXBkYXRlUnVubmVyVmVyc2lvbihcbiAgICBwYWNrYWdlc1RvVXBkYXRlOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCxcbiAgICBuZXh0OiBib29sZWFuLFxuICApOiBzdHJpbmcgfCBudW1iZXIge1xuICAgIGlmIChuZXh0KSB7XG4gICAgICByZXR1cm4gJ25leHQnO1xuICAgIH1cblxuICAgIGNvbnN0IHVwZGF0aW5nQW5ndWxhclBhY2thZ2UgPSBwYWNrYWdlc1RvVXBkYXRlPy5maW5kKChyKSA9PiBBTkdVTEFSX1BBQ0tBR0VTX1JFR0VYUC50ZXN0KHIpKTtcbiAgICBpZiAodXBkYXRpbmdBbmd1bGFyUGFja2FnZSkge1xuICAgICAgLy8gSWYgd2UgYXJlIHVwZGF0aW5nIGFueSBBbmd1bGFyIHBhY2thZ2Ugd2UgY2FuIHVwZGF0ZSB0aGUgQ0xJIHRvIHRoZSB0YXJnZXQgdmVyc2lvbiBiZWNhdXNlXG4gICAgICAvLyBtaWdyYXRpb25zIGZvciBAYW5ndWxhci9jb3JlQDEzIGNhbiBiZSBleGVjdXRlZCB1c2luZyBBbmd1bGFyL2NsaUAxMy5cbiAgICAgIC8vIFRoaXMgaXMgc2FtZSBiZWhhdmlvdXIgYXMgYG5weCBAYW5ndWxhci9jbGlAMTMgdXBkYXRlIEBhbmd1bGFyL2NvcmVAMTNgLlxuXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpQDEzYCAtPiBbJycsICdhbmd1bGFyL2NsaScsICcxMyddXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpYCAtPiBbJycsICdhbmd1bGFyL2NsaSddXG4gICAgICBjb25zdCB0ZW1wVmVyc2lvbiA9IGNvZXJjZVZlcnNpb25OdW1iZXIodXBkYXRpbmdBbmd1bGFyUGFja2FnZS5zcGxpdCgnQCcpWzJdKTtcblxuICAgICAgcmV0dXJuIHNlbXZlci5wYXJzZSh0ZW1wVmVyc2lvbik/Lm1ham9yID8/ICdsYXRlc3QnO1xuICAgIH1cblxuICAgIC8vIFdoZW4gbm90IHVwZGF0aW5nIGFuIEFuZ3VsYXIgcGFja2FnZSB3ZSBjYW5ub3QgZGV0ZXJtaW5lIHdoaWNoIHNjaGVtYXRpYyBydW50aW1lIHRoZSBtaWdyYXRpb24gc2hvdWxkIHRvIGJlIGV4ZWN1dGVkIGluLlxuICAgIC8vIFR5cGljYWxseSwgd2UgY2FuIGFzc3VtZSB0aGF0IHRoZSBgQGFuZ3VsYXIvY2xpYCB3YXMgdXBkYXRlZCBwcmV2aW91c2x5LlxuICAgIC8vIEV4YW1wbGU6IEFuZ3VsYXIgb2ZmaWNpYWwgcGFja2FnZXMgYXJlIHR5cGljYWxseSB1cGRhdGVkIHByaW9yIHRvIE5HUlggZXRjLi4uXG4gICAgLy8gVGhlcmVmb3JlLCB3ZSBvbmx5IHVwZGF0ZSB0byB0aGUgbGF0ZXN0IHBhdGNoIHZlcnNpb24gb2YgdGhlIGluc3RhbGxlZCBtYWpvciB2ZXJzaW9uIG9mIHRoZSBBbmd1bGFyIENMSS5cblxuICAgIC8vIFRoaXMgaXMgaW1wb3J0YW50IGJlY2F1c2Ugd2UgbWlnaHQgZW5kIHVwIGluIGEgc2NlbmFyaW8gd2hlcmUgbG9jYWxseSBBbmd1bGFyIHYxMiBpcyBpbnN0YWxsZWQsIHVwZGF0aW5nIE5HUlggZnJvbSAxMSB0byAxMi5cbiAgICAvLyBXZSBlbmQgdXAgdXNpbmcgQW5ndWxhciBDbEkgdjEzIHRvIHJ1biB0aGUgbWlncmF0aW9ucyBpZiB3ZSBydW4gdGhlIG1pZ3JhdGlvbnMgdXNpbmcgdGhlIENMSSBpbnN0YWxsZWQgbWFqb3IgdmVyc2lvbiArIDEgbG9naWMuXG4gICAgcmV0dXJuIFZFUlNJT04ubWFqb3I7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJ1blRlbXBCaW5hcnkocGFja2FnZU5hbWU6IHN0cmluZywgYXJnczogc3RyaW5nW10gPSBbXSk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBzdWNjZXNzLCB0ZW1wTm9kZU1vZHVsZXMgfSA9IGF3YWl0IHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci5pbnN0YWxsVGVtcChwYWNrYWdlTmFtZSk7XG4gICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgdmVyc2lvbi90YWcgZXRjLi4uIGZyb20gcGFja2FnZSBuYW1lXG4gICAgLy8gRXg6IEBhbmd1bGFyL2NsaUBsYXRlc3QgLT4gQGFuZ3VsYXIvY2xpXG4gICAgY29uc3QgcGFja2FnZU5hbWVOb1ZlcnNpb24gPSBwYWNrYWdlTmFtZS5zdWJzdHJpbmcoMCwgcGFja2FnZU5hbWUubGFzdEluZGV4T2YoJ0AnKSk7XG4gICAgY29uc3QgcGtnTG9jYXRpb24gPSBqb2luKHRlbXBOb2RlTW9kdWxlcywgcGFja2FnZU5hbWVOb1ZlcnNpb24pO1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IGpvaW4ocGtnTG9jYXRpb24sICdwYWNrYWdlLmpzb24nKTtcblxuICAgIC8vIEdldCBhIGJpbmFyeSBsb2NhdGlvbiBmb3IgdGhpcyBwYWNrYWdlXG4gICAgbGV0IGJpblBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBpZiAoZXhpc3RzU3luYyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoLCAndXRmLTgnKTtcbiAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgIGNvbnN0IHsgYmluID0ge30gfSA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgICAgIGNvbnN0IGJpbktleXMgPSBPYmplY3Qua2V5cyhiaW4pO1xuXG4gICAgICAgIGlmIChiaW5LZXlzLmxlbmd0aCkge1xuICAgICAgICAgIGJpblBhdGggPSByZXNvbHZlKHBrZ0xvY2F0aW9uLCBiaW5bYmluS2V5c1swXV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFiaW5QYXRoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBsb2NhdGUgYmluIGZvciB0ZW1wb3JhcnkgcGFja2FnZTogJHtwYWNrYWdlTmFtZU5vVmVyc2lvbn0uYCk7XG4gICAgfVxuXG4gICAgY29uc3QgeyBzdGF0dXMsIGVycm9yIH0gPSBzcGF3blN5bmMocHJvY2Vzcy5leGVjUGF0aCwgW2JpblBhdGgsIC4uLmFyZ3NdLCB7XG4gICAgICBzdGRpbzogJ2luaGVyaXQnLFxuICAgICAgZW52OiB7XG4gICAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgICBOR19ESVNBQkxFX1ZFUlNJT05fQ0hFQ0s6ICd0cnVlJyxcbiAgICAgICAgTkdfQ0xJX0FOQUxZVElDUzogJ2ZhbHNlJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBpZiAoc3RhdHVzID09PSBudWxsICYmIGVycm9yKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdHVzID8/IDA7XG4gIH1cbn1cblxuLyoqXG4gKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSB3b3JraW5nIGRpcmVjdG9yeSBoYXMgR2l0IGNoYW5nZXMgdG8gY29tbWl0LlxuICovXG5mdW5jdGlvbiBoYXNDaGFuZ2VzVG9Db21taXQoKTogYm9vbGVhbiB7XG4gIC8vIExpc3QgYWxsIG1vZGlmaWVkIGZpbGVzIG5vdCBjb3ZlcmVkIGJ5IC5naXRpZ25vcmUuXG4gIC8vIElmIGFueSBmaWxlcyBhcmUgcmV0dXJuZWQsIHRoZW4gdGhlcmUgbXVzdCBiZSBzb21ldGhpbmcgdG8gY29tbWl0LlxuXG4gIHJldHVybiBleGVjU3luYygnZ2l0IGxzLWZpbGVzIC1tIC1kIC1vIC0tZXhjbHVkZS1zdGFuZGFyZCcpLnRvU3RyaW5nKCkgIT09ICcnO1xufVxuXG4vKipcbiAqIFByZWNvbmRpdGlvbjogTXVzdCBoYXZlIHBlbmRpbmcgY2hhbmdlcyB0byBjb21taXQsIHRoZXkgZG8gbm90IG5lZWQgdG8gYmUgc3RhZ2VkLlxuICogUG9zdGNvbmRpdGlvbjogVGhlIEdpdCB3b3JraW5nIHRyZWUgaXMgY29tbWl0dGVkIGFuZCB0aGUgcmVwbyBpcyBjbGVhbi5cbiAqIEBwYXJhbSBtZXNzYWdlIFRoZSBjb21taXQgbWVzc2FnZSB0byB1c2UuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUNvbW1pdChtZXNzYWdlOiBzdHJpbmcpIHtcbiAgLy8gU3RhZ2UgZW50aXJlIHdvcmtpbmcgdHJlZSBmb3IgY29tbWl0LlxuICBleGVjU3luYygnZ2l0IGFkZCAtQScsIHsgZW5jb2Rpbmc6ICd1dGY4Jywgc3RkaW86ICdwaXBlJyB9KTtcblxuICAvLyBDb21taXQgd2l0aCB0aGUgbWVzc2FnZSBwYXNzZWQgdmlhIHN0ZGluIHRvIGF2b2lkIGJhc2ggZXNjYXBpbmcgaXNzdWVzLlxuICBleGVjU3luYygnZ2l0IGNvbW1pdCAtLW5vLXZlcmlmeSAtRiAtJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnLCBpbnB1dDogbWVzc2FnZSB9KTtcbn1cblxuLyoqXG4gKiBAcmV0dXJuIFRoZSBHaXQgU0hBIGhhc2ggb2YgdGhlIEhFQUQgY29tbWl0LiBSZXR1cm5zIG51bGwgaWYgdW5hYmxlIHRvIHJldHJpZXZlIHRoZSBoYXNoLlxuICovXG5mdW5jdGlvbiBmaW5kQ3VycmVudEdpdFNoYSgpOiBzdHJpbmcgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZXhlY1N5bmMoJ2dpdCByZXYtcGFyc2UgSEVBRCcsIHsgZW5jb2Rpbmc6ICd1dGY4Jywgc3RkaW86ICdwaXBlJyB9KS50cmltKCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFNob3J0SGFzaChjb21taXRIYXNoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY29tbWl0SGFzaC5zbGljZSgwLCA5KTtcbn1cblxuZnVuY3Rpb24gY29lcmNlVmVyc2lvbk51bWJlcih2ZXJzaW9uOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAoIXZlcnNpb24pIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKCEvXlxcZHsxLDMwfVxcLlxcZHsxLDMwfVxcLlxcZHsxLDMwfS8udGVzdCh2ZXJzaW9uKSkge1xuICAgIGNvbnN0IG1hdGNoID0gdmVyc2lvbi5tYXRjaCgvXlxcZHsxLDMwfShcXC5cXGR7MSwzMH0pKi8pO1xuXG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAoIW1hdGNoWzFdKSB7XG4gICAgICB2ZXJzaW9uID0gdmVyc2lvbi5zdWJzdHJpbmcoMCwgbWF0Y2hbMF0ubGVuZ3RoKSArICcuMC4wJyArIHZlcnNpb24uc3Vic3RyaW5nKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgfSBlbHNlIGlmICghbWF0Y2hbMl0pIHtcbiAgICAgIHZlcnNpb24gPSB2ZXJzaW9uLnN1YnN0cmluZygwLCBtYXRjaFswXS5sZW5ndGgpICsgJy4wJyArIHZlcnNpb24uc3Vic3RyaW5nKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHNlbXZlci52YWxpZCh2ZXJzaW9uKSA/PyB1bmRlZmluZWQ7XG59XG4iXX0=