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
            let forceInstall = options.force;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3VwZGF0ZS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwyREFBMkU7QUFDM0UsNERBQWdFO0FBQ2hFLGlEQUFvRDtBQUNwRCwyQkFBZ0Q7QUFDaEQsc0VBQWtDO0FBQ2xDLDBFQUE2QztBQUM3QywyQ0FBNkI7QUFDN0IsK0JBQXFDO0FBQ3JDLCtDQUFpQztBQUVqQywyRUFBc0U7QUFDdEUseUVBSzhDO0FBQzlDLGlHQUE0RjtBQUM1RiwyRkFBeUY7QUFDekYsaURBQStDO0FBQy9DLDZFQUEwRTtBQUMxRSx1REFBK0Q7QUFDL0QsdUVBSzBDO0FBQzFDLCtEQUtzQztBQUN0QyxxREFBa0Q7QUFlbEQsTUFBTSx1QkFBdUIsR0FBRyw2QkFBNkIsQ0FBQztBQUM5RCxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDJCQUEyQixDQUFDLENBQUM7QUFFdEYsTUFBYSxtQkFBb0IsU0FBUSw4QkFBZ0M7SUFBekU7O1FBRXFCLDBCQUFxQixHQUFHLEtBQUssQ0FBQztRQUVqRCxZQUFPLEdBQUcscUJBQXFCLENBQUM7UUFDaEMsYUFBUSxHQUFHLDhFQUE4RSxDQUFDO1FBQzFGLHdCQUFtQixHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBbzVCL0QsQ0FBQztJQWw1QkMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVTthQUNkLFVBQVUsQ0FBQyxVQUFVLEVBQUU7WUFDdEIsV0FBVyxFQUFFLG9DQUFvQztZQUNqRCxJQUFJLEVBQUUsUUFBUTtZQUNkLEtBQUssRUFBRSxJQUFJO1NBQ1osQ0FBQzthQUNELE1BQU0sQ0FBQyxP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LENBQUMsS0FBSyxFQUFFO1lBQ1YsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2IsT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxNQUFNLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDL0Y7YUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BCLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQzdGO2FBQU07WUFDTCxPQUFPLFNBQVMsQ0FBQztTQUNsQjtLQUNGO0lBRUQsT0FBTyxNQUFBLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLG1DQUFJLFNBQVMsQ0FBQztBQUM1QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVdvcmtmbG93IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHsgZXhlY1N5bmMsIHNwYXduU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcHJvbWlzZXMgYXMgZnMgfSBmcm9tICdmcyc7XG5pbXBvcnQgbnBhIGZyb20gJ25wbS1wYWNrYWdlLWFyZyc7XG5pbXBvcnQgcGlja01hbmlmZXN0IGZyb20gJ25wbS1waWNrLW1hbmlmZXN0JztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBqb2luLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBzZW12ZXIgZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uLy4uLy4uL2xpYi9jb25maWcvd29ya3NwYWNlLXNjaGVtYSc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kTW9kdWxlRXJyb3IsXG4gIENvbW1hbmRTY29wZSxcbiAgT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IFNjaGVtYXRpY0VuZ2luZUhvc3QgfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvdXRpbGl0aWVzL3NjaGVtYXRpYy1lbmdpbmUtaG9zdCc7XG5pbXBvcnQgeyBzdWJzY3JpYmVUb1dvcmtmbG93IH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL3V0aWxpdGllcy9zY2hlbWF0aWMtd29ya2Zsb3cnO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IGRpc2FibGVWZXJzaW9uQ2hlY2sgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvZW52aXJvbm1lbnQtb3B0aW9ucyc7XG5pbXBvcnQgeyB3cml0ZUVycm9yVG9Mb2dGaWxlIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2xvZy1maWxlJztcbmltcG9ydCB7XG4gIFBhY2thZ2VJZGVudGlmaWVyLFxuICBQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNZXRhZGF0YSxcbn0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWV0YWRhdGEnO1xuaW1wb3J0IHtcbiAgUGFja2FnZVRyZWVOb2RlLFxuICBmaW5kUGFja2FnZUpzb24sXG4gIGdldFByb2plY3REZXBlbmRlbmNpZXMsXG4gIHJlYWRQYWNrYWdlSnNvbixcbn0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtdHJlZSc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3ZlcnNpb24nO1xuXG5pbnRlcmZhY2UgVXBkYXRlQ29tbWFuZEFyZ3Mge1xuICBwYWNrYWdlcz86IHN0cmluZ1tdO1xuICBmb3JjZTogYm9vbGVhbjtcbiAgbmV4dDogYm9vbGVhbjtcbiAgJ21pZ3JhdGUtb25seSc/OiBib29sZWFuO1xuICBuYW1lPzogc3RyaW5nO1xuICBmcm9tPzogc3RyaW5nO1xuICB0bz86IHN0cmluZztcbiAgJ2FsbG93LWRpcnR5JzogYm9vbGVhbjtcbiAgdmVyYm9zZTogYm9vbGVhbjtcbiAgJ2NyZWF0ZS1jb21taXRzJzogYm9vbGVhbjtcbn1cblxuY29uc3QgQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAgPSAvXkAoPzphbmd1bGFyfG5ndW5pdmVyc2FsKVxcLy87XG5jb25zdCBVUERBVEVfU0NIRU1BVElDX0NPTExFQ1RJT04gPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnc2NoZW1hdGljL2NvbGxlY3Rpb24uanNvbicpO1xuXG5leHBvcnQgY2xhc3MgVXBkYXRlQ29tbWFuZE1vZHVsZSBleHRlbmRzIENvbW1hbmRNb2R1bGU8VXBkYXRlQ29tbWFuZEFyZ3M+IHtcbiAgc3RhdGljIG92ZXJyaWRlIHNjb3BlID0gQ29tbWFuZFNjb3BlLkluO1xuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgc2hvdWxkUmVwb3J0QW5hbHl0aWNzID0gZmFsc2U7XG5cbiAgY29tbWFuZCA9ICd1cGRhdGUgW3BhY2thZ2VzLi5dJztcbiAgZGVzY3JpYmUgPSAnVXBkYXRlcyB5b3VyIHdvcmtzcGFjZSBhbmQgaXRzIGRlcGVuZGVuY2llcy4gU2VlIGh0dHBzOi8vdXBkYXRlLmFuZ3VsYXIuaW8vLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSBqb2luKF9fZGlybmFtZSwgJ2xvbmctZGVzY3JpcHRpb24ubWQnKTtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2PFVwZGF0ZUNvbW1hbmRBcmdzPiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3NcbiAgICAgIC5wb3NpdGlvbmFsKCdwYWNrYWdlcycsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgbmFtZXMgb2YgcGFja2FnZShzKSB0byB1cGRhdGUuJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGFycmF5OiB0cnVlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2ZvcmNlJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAnSWdub3JlIHBlZXIgZGVwZW5kZW5jeSB2ZXJzaW9uIG1pc21hdGNoZXMuICcgK1xuICAgICAgICAgIGBQYXNzZXMgdGhlICctLWZvcmNlJyBmbGFnIHRvIHRoZSBwYWNrYWdlIG1hbmFnZXIgd2hlbiBpbnN0YWxsaW5nIHBhY2thZ2VzLmAsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignbmV4dCcsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdVc2UgdGhlIHByZXJlbGVhc2UgdmVyc2lvbiwgaW5jbHVkaW5nIGJldGEgYW5kIFJDcy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ21pZ3JhdGUtb25seScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdPbmx5IHBlcmZvcm0gYSBtaWdyYXRpb24sIGRvIG5vdCB1cGRhdGUgdGhlIGluc3RhbGxlZCB2ZXJzaW9uLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCduYW1lJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAnVGhlIG5hbWUgb2YgdGhlIG1pZ3JhdGlvbiB0byBydW4uICcgK1xuICAgICAgICAgIGBPbmx5IGF2YWlsYWJsZSB3aXRoIGEgc2luZ2xlIHBhY2thZ2UgYmVpbmcgdXBkYXRlZCwgYW5kIG9ubHkgd2l0aCAnbWlncmF0ZS1vbmx5JyBvcHRpb24uYCxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGltcGxpZXM6IFsnbWlncmF0ZS1vbmx5J10sXG4gICAgICAgIGNvbmZsaWN0czogWyd0bycsICdmcm9tJ10sXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignZnJvbScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgJ1ZlcnNpb24gZnJvbSB3aGljaCB0byBtaWdyYXRlIGZyb20uICcgK1xuICAgICAgICAgIGBPbmx5IGF2YWlsYWJsZSB3aXRoIGEgc2luZ2xlIHBhY2thZ2UgYmVpbmcgdXBkYXRlZCwgYW5kIG9ubHkgd2l0aCAnbWlncmF0ZS1vbmx5Jy5gLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgaW1wbGllczogWyd0bycsICdtaWdyYXRlLW9ubHknXSxcbiAgICAgICAgY29uZmxpY3RzOiBbJ25hbWUnXSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCd0bycsIHtcbiAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgJ1ZlcnNpb24gdXAgdG8gd2hpY2ggdG8gYXBwbHkgbWlncmF0aW9ucy4gT25seSBhdmFpbGFibGUgd2l0aCBhIHNpbmdsZSBwYWNrYWdlIGJlaW5nIHVwZGF0ZWQsICcgK1xuICAgICAgICAgIGBhbmQgb25seSB3aXRoICdtaWdyYXRlLW9ubHknIG9wdGlvbi4gUmVxdWlyZXMgJ2Zyb20nIHRvIGJlIHNwZWNpZmllZC4gRGVmYXVsdCB0byB0aGUgaW5zdGFsbGVkIHZlcnNpb24gZGV0ZWN0ZWQuYCxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGltcGxpZXM6IFsnZnJvbScsICdtaWdyYXRlLW9ubHknXSxcbiAgICAgICAgY29uZmxpY3RzOiBbJ25hbWUnXSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdhbGxvdy1kaXJ0eScsIHtcbiAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgJ1doZXRoZXIgdG8gYWxsb3cgdXBkYXRpbmcgd2hlbiB0aGUgcmVwb3NpdG9yeSBjb250YWlucyBtb2RpZmllZCBvciB1bnRyYWNrZWQgZmlsZXMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCd2ZXJib3NlJywge1xuICAgICAgICBkZXNjcmliZTogJ0Rpc3BsYXkgYWRkaXRpb25hbCBkZXRhaWxzIGFib3V0IGludGVybmFsIG9wZXJhdGlvbnMgZHVyaW5nIGV4ZWN1dGlvbi4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2NyZWF0ZS1jb21taXRzJywge1xuICAgICAgICBkZXNjcmliZTogJ0NyZWF0ZSBzb3VyY2UgY29udHJvbCBjb21taXRzIGZvciB1cGRhdGVzIGFuZCBtaWdyYXRpb25zLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgYWxpYXM6IFsnQyddLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAuY2hlY2soKHsgcGFja2FnZXMsICdhbGxvdy1kaXJ0eSc6IGFsbG93RGlydHksICdtaWdyYXRlLW9ubHknOiBtaWdyYXRlT25seSB9KSA9PiB7XG4gICAgICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICAgICAgLy8gVGhpcyBhbGxvd3MgdGhlIHVzZXIgdG8gZWFzaWx5IHJlc2V0IGFueSBjaGFuZ2VzIGZyb20gdGhlIHVwZGF0ZS5cbiAgICAgICAgaWYgKHBhY2thZ2VzPy5sZW5ndGggJiYgIXRoaXMuY2hlY2tDbGVhbkdpdCgpKSB7XG4gICAgICAgICAgaWYgKGFsbG93RGlydHkpIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICAnUmVwb3NpdG9yeSBpcyBub3QgY2xlYW4uIFVwZGF0ZSBjaGFuZ2VzIHdpbGwgYmUgbWl4ZWQgd2l0aCBwcmUtZXhpc3RpbmcgY2hhbmdlcy4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihcbiAgICAgICAgICAgICAgJ1JlcG9zaXRvcnkgaXMgbm90IGNsZWFuLiBQbGVhc2UgY29tbWl0IG9yIHN0YXNoIGFueSBjaGFuZ2VzIGJlZm9yZSB1cGRhdGluZy4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWlncmF0ZU9ubHkpIHtcbiAgICAgICAgICBpZiAocGFja2FnZXM/Lmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihcbiAgICAgICAgICAgICAgYEEgc2luZ2xlIHBhY2thZ2UgbXVzdCBiZSBzcGVjaWZpZWQgd2hlbiB1c2luZyB0aGUgJ21pZ3JhdGUtb25seScgb3B0aW9uLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5zdHJpY3QoKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBPcHRpb25zPFVwZGF0ZUNvbW1hbmRBcmdzPik6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyLCBwYWNrYWdlTWFuYWdlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgcGFja2FnZU1hbmFnZXIuZW5zdXJlQ29tcGF0aWJpbGl0eSgpO1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgaW5zdGFsbGVkIENMSSB2ZXJzaW9uIGlzIG9sZGVyIHRoYW4gdGhlIGxhdGVzdCBjb21wYXRpYmxlIHZlcnNpb24uXG4gICAgaWYgKCFkaXNhYmxlVmVyc2lvbkNoZWNrKSB7XG4gICAgICBjb25zdCBjbGlWZXJzaW9uVG9JbnN0YWxsID0gYXdhaXQgdGhpcy5jaGVja0NMSVZlcnNpb24oXG4gICAgICAgIG9wdGlvbnMucGFja2FnZXMsXG4gICAgICAgIG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgb3B0aW9ucy5uZXh0LFxuICAgICAgKTtcblxuICAgICAgaWYgKGNsaVZlcnNpb25Ub0luc3RhbGwpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgJ1RoZSBpbnN0YWxsZWQgQW5ndWxhciBDTEkgdmVyc2lvbiBpcyBvdXRkYXRlZC5cXG4nICtcbiAgICAgICAgICAgIGBJbnN0YWxsaW5nIGEgdGVtcG9yYXJ5IEFuZ3VsYXIgQ0xJIHZlcnNpb25lZCAke2NsaVZlcnNpb25Ub0luc3RhbGx9IHRvIHBlcmZvcm0gdGhlIHVwZGF0ZS5gLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiB0aGlzLnJ1blRlbXBCaW5hcnkoYEBhbmd1bGFyL2NsaUAke2NsaVZlcnNpb25Ub0luc3RhbGx9YCwgcHJvY2Vzcy5hcmd2LnNsaWNlKDIpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlczogUGFja2FnZUlkZW50aWZpZXJbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgcmVxdWVzdCBvZiBvcHRpb25zLnBhY2thZ2VzID8/IFtdKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYWNrYWdlSWRlbnRpZmllciA9IG5wYShyZXF1ZXN0KTtcblxuICAgICAgICAvLyBvbmx5IHJlZ2lzdHJ5IGlkZW50aWZpZXJzIGFyZSBzdXBwb3J0ZWRcbiAgICAgICAgaWYgKCFwYWNrYWdlSWRlbnRpZmllci5yZWdpc3RyeSkge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcihgUGFja2FnZSAnJHtyZXF1ZXN0fScgaXMgbm90IGEgcmVnaXN0cnkgcGFja2FnZSBpZGVudGlmZXIuYCk7XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwYWNrYWdlcy5zb21lKCh2KSA9PiB2Lm5hbWUgPT09IHBhY2thZ2VJZGVudGlmaWVyLm5hbWUpKSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKGBEdXBsaWNhdGUgcGFja2FnZSAnJHtwYWNrYWdlSWRlbnRpZmllci5uYW1lfScgc3BlY2lmaWVkLmApO1xuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5taWdyYXRlT25seSAmJiBwYWNrYWdlSWRlbnRpZmllci5yYXdTcGVjKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oJ1BhY2thZ2Ugc3BlY2lmaWVyIGhhcyBubyBlZmZlY3Qgd2hlbiB1c2luZyBcIm1pZ3JhdGUtb25seVwiIG9wdGlvbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIG5leHQgb3B0aW9uIGlzIHVzZWQgYW5kIG5vIHNwZWNpZmllciBzdXBwbGllZCwgdXNlIG5leHQgdGFnXG4gICAgICAgIGlmIChvcHRpb25zLm5leHQgJiYgIXBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMpIHtcbiAgICAgICAgICBwYWNrYWdlSWRlbnRpZmllci5mZXRjaFNwZWMgPSAnbmV4dCc7XG4gICAgICAgIH1cblxuICAgICAgICBwYWNrYWdlcy5wdXNoKHBhY2thZ2VJZGVudGlmaWVyIGFzIFBhY2thZ2VJZGVudGlmaWVyKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGUubWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oYFVzaW5nIHBhY2thZ2UgbWFuYWdlcjogJHtjb2xvcnMuZ3JleShwYWNrYWdlTWFuYWdlci5uYW1lKX1gKTtcbiAgICBsb2dnZXIuaW5mbygnQ29sbGVjdGluZyBpbnN0YWxsZWQgZGVwZW5kZW5jaWVzLi4uJyk7XG5cbiAgICBjb25zdCByb290RGVwZW5kZW5jaWVzID0gYXdhaXQgZ2V0UHJvamVjdERlcGVuZGVuY2llcyh0aGlzLmNvbnRleHQucm9vdCk7XG4gICAgbG9nZ2VyLmluZm8oYEZvdW5kICR7cm9vdERlcGVuZGVuY2llcy5zaXplfSBkZXBlbmRlbmNpZXMuYCk7XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IG5ldyBOb2RlV29ya2Zsb3codGhpcy5jb250ZXh0LnJvb3QsIHtcbiAgICAgIHBhY2thZ2VNYW5hZ2VyOiBwYWNrYWdlTWFuYWdlci5uYW1lLFxuICAgICAgcGFja2FnZU1hbmFnZXJGb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICAgIC8vIF9fZGlybmFtZSAtPiBmYXZvciBAc2NoZW1hdGljcy91cGRhdGUgZnJvbSB0aGlzIHBhY2thZ2VcbiAgICAgIC8vIE90aGVyd2lzZSwgdXNlIHBhY2thZ2VzIGZyb20gdGhlIGFjdGl2ZSB3b3Jrc3BhY2UgKG1pZ3JhdGlvbnMpXG4gICAgICByZXNvbHZlUGF0aHM6IFtfX2Rpcm5hbWUsIHRoaXMuY29udGV4dC5yb290XSxcbiAgICAgIHNjaGVtYVZhbGlkYXRpb246IHRydWUsXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KTtcblxuICAgIGlmIChwYWNrYWdlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIFNob3cgc3RhdHVzXG4gICAgICBjb25zdCB7IHN1Y2Nlc3MgfSA9IGF3YWl0IHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICAgICAgd29ya2Zsb3csXG4gICAgICAgIFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTixcbiAgICAgICAgJ3VwZGF0ZScsXG4gICAgICAgIHtcbiAgICAgICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICAgICAgICBuZXh0OiBvcHRpb25zLm5leHQsXG4gICAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICAgIHBhY2thZ2VNYW5hZ2VyOiBwYWNrYWdlTWFuYWdlci5uYW1lLFxuICAgICAgICAgIHBhY2thZ2VzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiBzdWNjZXNzID8gMCA6IDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdGlvbnMubWlncmF0ZU9ubHlcbiAgICAgID8gdGhpcy5taWdyYXRlT25seSh3b3JrZmxvdywgKG9wdGlvbnMucGFja2FnZXMgPz8gW10pWzBdLCByb290RGVwZW5kZW5jaWVzLCBvcHRpb25zKVxuICAgICAgOiB0aGlzLnVwZGF0ZVBhY2thZ2VzQW5kTWlncmF0ZSh3b3JrZmxvdywgcm9vdERlcGVuZGVuY2llcywgb3B0aW9ucywgcGFja2FnZXMpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlU2NoZW1hdGljKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgY29sbGVjdGlvbjogc3RyaW5nLFxuICAgIHNjaGVtYXRpYzogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge30sXG4gICk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBmaWxlczogU2V0PHN0cmluZz4gfT4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3Qgd29ya2Zsb3dTdWJzY3JpcHRpb24gPSBzdWJzY3JpYmVUb1dvcmtmbG93KHdvcmtmbG93LCBsb2dnZXIpO1xuXG4gICAgLy8gVE9ETzogQWxsb3cgcGFzc2luZyBhIHNjaGVtYXRpYyBpbnN0YW5jZSBkaXJlY3RseVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB3b3JrZmxvd1xuICAgICAgICAuZXhlY3V0ZSh7XG4gICAgICAgICAgY29sbGVjdGlvbixcbiAgICAgICAgICBzY2hlbWF0aWMsXG4gICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICBsb2dnZXIsXG4gICAgICAgIH0pXG4gICAgICAgIC50b1Byb21pc2UoKTtcblxuICAgICAgcmV0dXJuIHsgc3VjY2VzczogIXdvcmtmbG93U3Vic2NyaXB0aW9uLmVycm9yLCBmaWxlczogd29ya2Zsb3dTdWJzY3JpcHRpb24uZmlsZXMgfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgJHtjb2xvcnMuc3ltYm9scy5jcm9zc30gTWlncmF0aW9uIGZhaWxlZC4gU2VlIGFib3ZlIGZvciBmdXJ0aGVyIGRldGFpbHMuXFxuYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBsb2dQYXRoID0gd3JpdGVFcnJvclRvTG9nRmlsZShlKTtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKFxuICAgICAgICAgIGAke2NvbG9ycy5zeW1ib2xzLmNyb3NzfSBNaWdyYXRpb24gZmFpbGVkOiAke2UubWVzc2FnZX1cXG5gICtcbiAgICAgICAgICAgIGAgIFNlZSBcIiR7bG9nUGF0aH1cIiBmb3IgZnVydGhlciBkZXRhaWxzLlxcbmAsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBmaWxlczogd29ya2Zsb3dTdWJzY3JpcHRpb24uZmlsZXMgfTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgd29ya2Zsb3dTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgbWlncmF0aW9uIHdhcyBwZXJmb3JtZWQgc3VjY2Vzc2Z1bGx5LlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlTWlncmF0aW9uKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICBjb2xsZWN0aW9uUGF0aDogc3RyaW5nLFxuICAgIG1pZ3JhdGlvbk5hbWU6IHN0cmluZyxcbiAgICBjb21taXQ/OiBib29sZWFuLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25QYXRoKTtcbiAgICBjb25zdCBuYW1lID0gY29sbGVjdGlvbi5saXN0U2NoZW1hdGljTmFtZXMoKS5maW5kKChuYW1lKSA9PiBuYW1lID09PSBtaWdyYXRpb25OYW1lKTtcbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgQ2Fubm90IGZpbmQgbWlncmF0aW9uICcke21pZ3JhdGlvbk5hbWV9JyBpbiAnJHtwYWNrYWdlTmFtZX0nLmApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbyhjb2xvcnMuY3lhbihgKiogRXhlY3V0aW5nICcke21pZ3JhdGlvbk5hbWV9JyBvZiBwYWNrYWdlICcke3BhY2thZ2VOYW1lfScgKipcXG5gKSk7XG4gICAgY29uc3Qgc2NoZW1hdGljID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZVNjaGVtYXRpYyhuYW1lLCBjb2xsZWN0aW9uKTtcblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyh3b3JrZmxvdywgW3NjaGVtYXRpYy5kZXNjcmlwdGlvbl0sIHBhY2thZ2VOYW1lLCBjb21taXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIG1pZ3JhdGlvbnMgd2VyZSBwZXJmb3JtZWQgc3VjY2Vzc2Z1bGx5LlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlTWlncmF0aW9ucyhcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgY29sbGVjdGlvblBhdGg6IHN0cmluZyxcbiAgICBmcm9tOiBzdHJpbmcsXG4gICAgdG86IHN0cmluZyxcbiAgICBjb21taXQ/OiBib29sZWFuLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uUGF0aCk7XG4gICAgY29uc3QgbWlncmF0aW9uUmFuZ2UgPSBuZXcgc2VtdmVyLlJhbmdlKFxuICAgICAgJz4nICsgKHNlbXZlci5wcmVyZWxlYXNlKGZyb20pID8gZnJvbS5zcGxpdCgnLScpWzBdICsgJy0wJyA6IGZyb20pICsgJyA8PScgKyB0by5zcGxpdCgnLScpWzBdLFxuICAgICk7XG4gICAgY29uc3QgbWlncmF0aW9ucyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKCkpIHtcbiAgICAgIGNvbnN0IHNjaGVtYXRpYyA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVTY2hlbWF0aWMobmFtZSwgY29sbGVjdGlvbik7XG4gICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IHNjaGVtYXRpYy5kZXNjcmlwdGlvbiBhcyB0eXBlb2Ygc2NoZW1hdGljLmRlc2NyaXB0aW9uICYge1xuICAgICAgICB2ZXJzaW9uPzogc3RyaW5nO1xuICAgICAgfTtcbiAgICAgIGRlc2NyaXB0aW9uLnZlcnNpb24gPSBjb2VyY2VWZXJzaW9uTnVtYmVyKGRlc2NyaXB0aW9uLnZlcnNpb24pO1xuICAgICAgaWYgKCFkZXNjcmlwdGlvbi52ZXJzaW9uKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2VtdmVyLnNhdGlzZmllcyhkZXNjcmlwdGlvbi52ZXJzaW9uLCBtaWdyYXRpb25SYW5nZSwgeyBpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZSB9KSkge1xuICAgICAgICBtaWdyYXRpb25zLnB1c2goZGVzY3JpcHRpb24gYXMgdHlwZW9mIHNjaGVtYXRpYy5kZXNjcmlwdGlvbiAmIHsgdmVyc2lvbjogc3RyaW5nIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtaWdyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgbWlncmF0aW9ucy5zb3J0KChhLCBiKSA9PiBzZW12ZXIuY29tcGFyZShhLnZlcnNpb24sIGIudmVyc2lvbikgfHwgYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKSk7XG5cbiAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmluZm8oXG4gICAgICBjb2xvcnMuY3lhbihgKiogRXhlY3V0aW5nIG1pZ3JhdGlvbnMgb2YgcGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nICoqXFxuYCksXG4gICAgKTtcblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyh3b3JrZmxvdywgbWlncmF0aW9ucywgcGFja2FnZU5hbWUsIGNvbW1pdCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyhcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIG1pZ3JhdGlvbnM6IEl0ZXJhYmxlPHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbjogc3RyaW5nOyBjb2xsZWN0aW9uOiB7IG5hbWU6IHN0cmluZyB9IH0+LFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgY29tbWl0ID0gZmFsc2UsXG4gICk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBmb3IgKGNvbnN0IG1pZ3JhdGlvbiBvZiBtaWdyYXRpb25zKSB7XG4gICAgICBjb25zdCBbdGl0bGUsIC4uLmRlc2NyaXB0aW9uXSA9IG1pZ3JhdGlvbi5kZXNjcmlwdGlvbi5zcGxpdCgnLiAnKTtcblxuICAgICAgbG9nZ2VyLmluZm8oXG4gICAgICAgIGNvbG9ycy5jeWFuKGNvbG9ycy5zeW1ib2xzLnBvaW50ZXIpICtcbiAgICAgICAgICAnICcgK1xuICAgICAgICAgIGNvbG9ycy5ib2xkKHRpdGxlLmVuZHNXaXRoKCcuJykgPyB0aXRsZSA6IHRpdGxlICsgJy4nKSxcbiAgICAgICk7XG5cbiAgICAgIGlmIChkZXNjcmlwdGlvbi5sZW5ndGgpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJyAgJyArIGRlc2NyaXB0aW9uLmpvaW4oJy5cXG4gICcpKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlU2NoZW1hdGljKFxuICAgICAgICB3b3JrZmxvdyxcbiAgICAgICAgbWlncmF0aW9uLmNvbGxlY3Rpb24ubmFtZSxcbiAgICAgICAgbWlncmF0aW9uLm5hbWUsXG4gICAgICApO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgbG9nZ2VyLmluZm8oJyAgTWlncmF0aW9uIGNvbXBsZXRlZC4nKTtcblxuICAgICAgLy8gQ29tbWl0IG1pZ3JhdGlvblxuICAgICAgaWYgKGNvbW1pdCkge1xuICAgICAgICBjb25zdCBjb21taXRQcmVmaXggPSBgJHtwYWNrYWdlTmFtZX0gbWlncmF0aW9uIC0gJHttaWdyYXRpb24ubmFtZX1gO1xuICAgICAgICBjb25zdCBjb21taXRNZXNzYWdlID0gbWlncmF0aW9uLmRlc2NyaXB0aW9uXG4gICAgICAgICAgPyBgJHtjb21taXRQcmVmaXh9XFxuXFxuJHttaWdyYXRpb24uZGVzY3JpcHRpb259YFxuICAgICAgICAgIDogY29tbWl0UHJlZml4O1xuICAgICAgICBjb25zdCBjb21taXR0ZWQgPSB0aGlzLmNvbW1pdChjb21taXRNZXNzYWdlKTtcbiAgICAgICAgaWYgKCFjb21taXR0ZWQpIHtcbiAgICAgICAgICAvLyBGYWlsZWQgdG8gY29tbWl0LCBzb21ldGhpbmcgd2VudCB3cm9uZy4gQWJvcnQgdGhlIHVwZGF0ZS5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBsb2dnZXIuaW5mbygnJyk7IC8vIEV4dHJhIHRyYWlsaW5nIG5ld2xpbmUuXG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG1pZ3JhdGVPbmx5KFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICByb290RGVwZW5kZW5jaWVzOiBNYXA8c3RyaW5nLCBQYWNrYWdlVHJlZU5vZGU+LFxuICAgIG9wdGlvbnM6IE9wdGlvbnM8VXBkYXRlQ29tbWFuZEFyZ3M+LFxuICApOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHBhY2thZ2VEZXBlbmRlbmN5ID0gcm9vdERlcGVuZGVuY2llcy5nZXQocGFja2FnZU5hbWUpO1xuICAgIGxldCBwYWNrYWdlUGF0aCA9IHBhY2thZ2VEZXBlbmRlbmN5Py5wYXRoO1xuICAgIGxldCBwYWNrYWdlTm9kZSA9IHBhY2thZ2VEZXBlbmRlbmN5Py5wYWNrYWdlO1xuICAgIGlmIChwYWNrYWdlRGVwZW5kZW5jeSAmJiAhcGFja2FnZU5vZGUpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBmb3VuZCBpbiBwYWNrYWdlLmpzb24gYnV0IGlzIG5vdCBpbnN0YWxsZWQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAoIXBhY2thZ2VEZXBlbmRlbmN5KSB7XG4gICAgICAvLyBBbGxvdyBydW5uaW5nIG1pZ3JhdGlvbnMgb24gdHJhbnNpdGl2ZWx5IGluc3RhbGxlZCBkZXBlbmRlbmNpZXNcbiAgICAgIC8vIFRoZXJlIGNhbiB0ZWNobmljYWxseSBiZSBuZXN0ZWQgbXVsdGlwbGUgdmVyc2lvbnNcbiAgICAgIC8vIFRPRE86IElmIG11bHRpcGxlLCB0aGlzIHNob3VsZCBmaW5kIGFsbCB2ZXJzaW9ucyBhbmQgYXNrIHdoaWNoIG9uZSB0byB1c2VcbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gZmluZFBhY2thZ2VKc29uKHRoaXMuY29udGV4dC5yb290LCBwYWNrYWdlTmFtZSk7XG4gICAgICBpZiAocGFja2FnZUpzb24pIHtcbiAgICAgICAgcGFja2FnZVBhdGggPSBwYXRoLmRpcm5hbWUocGFja2FnZUpzb24pO1xuICAgICAgICBwYWNrYWdlTm9kZSA9IGF3YWl0IHJlYWRQYWNrYWdlSnNvbihwYWNrYWdlSnNvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwYWNrYWdlTm9kZSB8fCAhcGFja2FnZVBhdGgpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBpcyBub3QgaW5zdGFsbGVkLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBjb25zdCB1cGRhdGVNZXRhZGF0YSA9IHBhY2thZ2VOb2RlWyduZy11cGRhdGUnXTtcbiAgICBsZXQgbWlncmF0aW9ucyA9IHVwZGF0ZU1ldGFkYXRhPy5taWdyYXRpb25zO1xuICAgIGlmIChtaWdyYXRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBkb2VzIG5vdCBwcm92aWRlIG1pZ3JhdGlvbnMuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1pZ3JhdGlvbnMgIT09ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1BhY2thZ2UgY29udGFpbnMgYSBtYWxmb3JtZWQgbWlncmF0aW9ucyBmaWVsZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmIChwYXRoLnBvc2l4LmlzQWJzb2x1dGUobWlncmF0aW9ucykgfHwgcGF0aC53aW4zMi5pc0Fic29sdXRlKG1pZ3JhdGlvbnMpKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICdQYWNrYWdlIGNvbnRhaW5zIGFuIGludmFsaWQgbWlncmF0aW9ucyBmaWVsZC4gQWJzb2x1dGUgcGF0aHMgYXJlIG5vdCBwZXJtaXR0ZWQuJyxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIC8vIE5vcm1hbGl6ZSBzbGFzaGVzXG4gICAgbWlncmF0aW9ucyA9IG1pZ3JhdGlvbnMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gICAgaWYgKG1pZ3JhdGlvbnMuc3RhcnRzV2l0aCgnLi4vJykpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgJ1BhY2thZ2UgY29udGFpbnMgYW4gaW52YWxpZCBtaWdyYXRpb25zIGZpZWxkLiBQYXRocyBvdXRzaWRlIHRoZSBwYWNrYWdlIHJvb3QgYXJlIG5vdCBwZXJtaXR0ZWQuJyxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIGl0IGlzIGEgcGFja2FnZS1sb2NhbCBsb2NhdGlvblxuICAgIGNvbnN0IGxvY2FsTWlncmF0aW9ucyA9IHBhdGguam9pbihwYWNrYWdlUGF0aCwgbWlncmF0aW9ucyk7XG4gICAgaWYgKGV4aXN0c1N5bmMobG9jYWxNaWdyYXRpb25zKSkge1xuICAgICAgbWlncmF0aW9ucyA9IGxvY2FsTWlncmF0aW9ucztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVHJ5IHRvIHJlc29sdmUgZnJvbSBwYWNrYWdlIGxvY2F0aW9uLlxuICAgICAgLy8gVGhpcyBhdm9pZHMgaXNzdWVzIHdpdGggcGFja2FnZSBob2lzdGluZy5cbiAgICAgIHRyeSB7XG4gICAgICAgIG1pZ3JhdGlvbnMgPSByZXF1aXJlLnJlc29sdmUobWlncmF0aW9ucywgeyBwYXRoczogW3BhY2thZ2VQYXRoXSB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKCdNaWdyYXRpb25zIGZvciBwYWNrYWdlIHdlcmUgbm90IGZvdW5kLicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcihgVW5hYmxlIHRvIHJlc29sdmUgbWlncmF0aW9ucyBmb3IgcGFja2FnZS4gIFske2UubWVzc2FnZX1dYCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5uYW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5leGVjdXRlTWlncmF0aW9uKFxuICAgICAgICB3b3JrZmxvdyxcbiAgICAgICAgcGFja2FnZU5hbWUsXG4gICAgICAgIG1pZ3JhdGlvbnMsXG4gICAgICAgIG9wdGlvbnMubmFtZSxcbiAgICAgICAgb3B0aW9ucy5jcmVhdGVDb21taXRzLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCBmcm9tID0gY29lcmNlVmVyc2lvbk51bWJlcihvcHRpb25zLmZyb20pO1xuICAgIGlmICghZnJvbSkge1xuICAgICAgbG9nZ2VyLmVycm9yKGBcImZyb21cIiB2YWx1ZSBbJHtvcHRpb25zLmZyb219XSBpcyBub3QgYSB2YWxpZCB2ZXJzaW9uLmApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5leGVjdXRlTWlncmF0aW9ucyhcbiAgICAgIHdvcmtmbG93LFxuICAgICAgcGFja2FnZU5hbWUsXG4gICAgICBtaWdyYXRpb25zLFxuICAgICAgZnJvbSxcbiAgICAgIG9wdGlvbnMudG8gfHwgcGFja2FnZU5vZGUudmVyc2lvbixcbiAgICAgIG9wdGlvbnMuY3JlYXRlQ29tbWl0cyxcbiAgICApO1xuICB9XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lcy1wZXItZnVuY3Rpb25cbiAgcHJpdmF0ZSBhc3luYyB1cGRhdGVQYWNrYWdlc0FuZE1pZ3JhdGUoXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICByb290RGVwZW5kZW5jaWVzOiBNYXA8c3RyaW5nLCBQYWNrYWdlVHJlZU5vZGU+LFxuICAgIG9wdGlvbnM6IE9wdGlvbnM8VXBkYXRlQ29tbWFuZEFyZ3M+LFxuICAgIHBhY2thZ2VzOiBQYWNrYWdlSWRlbnRpZmllcltdLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICBjb25zdCBsb2dWZXJib3NlID0gKG1lc3NhZ2U6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICBsb2dnZXIuaW5mbyhtZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgcmVxdWVzdHM6IHtcbiAgICAgIGlkZW50aWZpZXI6IFBhY2thZ2VJZGVudGlmaWVyO1xuICAgICAgbm9kZTogUGFja2FnZVRyZWVOb2RlO1xuICAgIH1bXSA9IFtdO1xuXG4gICAgLy8gVmFsaWRhdGUgcGFja2FnZXMgYWN0dWFsbHkgYXJlIHBhcnQgb2YgdGhlIHdvcmtzcGFjZVxuICAgIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzKSB7XG4gICAgICBjb25zdCBub2RlID0gcm9vdERlcGVuZGVuY2llcy5nZXQocGtnLm5hbWUpO1xuICAgICAgaWYgKCFub2RlPy5wYWNrYWdlKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgUGFja2FnZSAnJHtwa2cubmFtZX0nIGlzIG5vdCBhIGRlcGVuZGVuY3kuYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIGEgc3BlY2lmaWMgdmVyc2lvbiBpcyByZXF1ZXN0ZWQgYW5kIG1hdGNoZXMgdGhlIGluc3RhbGxlZCB2ZXJzaW9uLCBza2lwLlxuICAgICAgaWYgKHBrZy50eXBlID09PSAndmVyc2lvbicgJiYgbm9kZS5wYWNrYWdlLnZlcnNpb24gPT09IHBrZy5mZXRjaFNwZWMpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFBhY2thZ2UgJyR7cGtnLm5hbWV9JyBpcyBhbHJlYWR5IGF0ICcke3BrZy5mZXRjaFNwZWN9Jy5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHJlcXVlc3RzLnB1c2goeyBpZGVudGlmaWVyOiBwa2csIG5vZGUgfSk7XG4gICAgfVxuXG4gICAgaWYgKHJlcXVlc3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oJ0ZldGNoaW5nIGRlcGVuZGVuY3kgbWV0YWRhdGEgZnJvbSByZWdpc3RyeS4uLicpO1xuXG4gICAgY29uc3QgcGFja2FnZXNUb1VwZGF0ZTogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHsgaWRlbnRpZmllcjogcmVxdWVzdElkZW50aWZpZXIsIG5vZGUgfSBvZiByZXF1ZXN0cykge1xuICAgICAgY29uc3QgcGFja2FnZU5hbWUgPSByZXF1ZXN0SWRlbnRpZmllci5uYW1lO1xuXG4gICAgICBsZXQgbWV0YWRhdGE7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBNZXRhZGF0YSByZXF1ZXN0cyBhcmUgaW50ZXJuYWxseSBjYWNoZWQ7IG11bHRpcGxlIHJlcXVlc3RzIGZvciBzYW1lIG5hbWVcbiAgICAgICAgLy8gZG9lcyBub3QgcmVzdWx0IGluIGFkZGl0aW9uYWwgbmV0d29yayB0cmFmZmljXG4gICAgICAgIG1ldGFkYXRhID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWV0YWRhdGEocGFja2FnZU5hbWUsIGxvZ2dlciwge1xuICAgICAgICAgIHZlcmJvc2U6IG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3IgZmV0Y2hpbmcgbWV0YWRhdGEgZm9yICcke3BhY2thZ2VOYW1lfSc6IGAgKyBlLm1lc3NhZ2UpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICAvLyBUcnkgdG8gZmluZCBhIHBhY2thZ2UgdmVyc2lvbiBiYXNlZCBvbiB0aGUgdXNlciByZXF1ZXN0ZWQgcGFja2FnZSBzcGVjaWZpZXJcbiAgICAgIC8vIHJlZ2lzdHJ5IHNwZWNpZmllciB0eXBlcyBhcmUgZWl0aGVyIHZlcnNpb24sIHJhbmdlLCBvciB0YWdcbiAgICAgIGxldCBtYW5pZmVzdDogUGFja2FnZU1hbmlmZXN0IHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKFxuICAgICAgICByZXF1ZXN0SWRlbnRpZmllci50eXBlID09PSAndmVyc2lvbicgfHxcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3JhbmdlJyB8fFxuICAgICAgICByZXF1ZXN0SWRlbnRpZmllci50eXBlID09PSAndGFnJ1xuICAgICAgKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbWFuaWZlc3QgPSBwaWNrTWFuaWZlc3QobWV0YWRhdGEsIHJlcXVlc3RJZGVudGlmaWVyLmZldGNoU3BlYyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlID09PSAnRVRBUkdFVCcpIHtcbiAgICAgICAgICAgIC8vIElmIG5vdCBmb3VuZCBhbmQgbmV4dCB3YXMgdXNlZCBhbmQgdXNlciBkaWQgbm90IHByb3ZpZGUgYSBzcGVjaWZpZXIsIHRyeSBsYXRlc3QuXG4gICAgICAgICAgICAvLyBQYWNrYWdlIG1heSBub3QgaGF2ZSBhIG5leHQgdGFnLlxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICByZXF1ZXN0SWRlbnRpZmllci50eXBlID09PSAndGFnJyAmJlxuICAgICAgICAgICAgICByZXF1ZXN0SWRlbnRpZmllci5mZXRjaFNwZWMgPT09ICduZXh0JyAmJlxuICAgICAgICAgICAgICAhcmVxdWVzdElkZW50aWZpZXIucmF3U3BlY1xuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbWFuaWZlc3QgPSBwaWNrTWFuaWZlc3QobWV0YWRhdGEsICdsYXRlc3QnKTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLmNvZGUgIT09ICdFVEFSR0VUJyAmJiBlLmNvZGUgIT09ICdFTk9WRVJTSU9OUycpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChlLmNvZGUgIT09ICdFTk9WRVJTSU9OUycpIHtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICghbWFuaWZlc3QpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgIGBQYWNrYWdlIHNwZWNpZmllZCBieSAnJHtyZXF1ZXN0SWRlbnRpZmllci5yYXd9JyBkb2VzIG5vdCBleGlzdCB3aXRoaW4gdGhlIHJlZ2lzdHJ5LmAsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIGlmIChtYW5pZmVzdC52ZXJzaW9uID09PSBub2RlLnBhY2thZ2U/LnZlcnNpb24pIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFBhY2thZ2UgJyR7cGFja2FnZU5hbWV9JyBpcyBhbHJlYWR5IHVwIHRvIGRhdGUuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZS5wYWNrYWdlICYmIEFOR1VMQVJfUEFDS0FHRVNfUkVHRVhQLnRlc3Qobm9kZS5wYWNrYWdlLm5hbWUpKSB7XG4gICAgICAgIGNvbnN0IHsgbmFtZSwgdmVyc2lvbiB9ID0gbm9kZS5wYWNrYWdlO1xuICAgICAgICBjb25zdCB0b0JlSW5zdGFsbGVkTWFqb3JWZXJzaW9uID0gK21hbmlmZXN0LnZlcnNpb24uc3BsaXQoJy4nKVswXTtcbiAgICAgICAgY29uc3QgY3VycmVudE1ham9yVmVyc2lvbiA9ICt2ZXJzaW9uLnNwbGl0KCcuJylbMF07XG5cbiAgICAgICAgaWYgKHRvQmVJbnN0YWxsZWRNYWpvclZlcnNpb24gLSBjdXJyZW50TWFqb3JWZXJzaW9uID4gMSkge1xuICAgICAgICAgIC8vIE9ubHkgYWxsb3cgdXBkYXRpbmcgYSBzaW5nbGUgdmVyc2lvbiBhdCBhIHRpbWUuXG4gICAgICAgICAgaWYgKGN1cnJlbnRNYWpvclZlcnNpb24gPCA2KSB7XG4gICAgICAgICAgICAvLyBCZWZvcmUgdmVyc2lvbiA2LCB0aGUgbWFqb3IgdmVyc2lvbnMgd2VyZSBub3QgYWx3YXlzIHNlcXVlbnRpYWwuXG4gICAgICAgICAgICAvLyBFeGFtcGxlIEBhbmd1bGFyL2NvcmUgc2tpcHBlZCB2ZXJzaW9uIDMsIEBhbmd1bGFyL2NsaSBza2lwcGVkIHZlcnNpb25zIDItNS5cbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgYFVwZGF0aW5nIG11bHRpcGxlIG1ham9yIHZlcnNpb25zIG9mICcke25hbWV9JyBhdCBvbmNlIGlzIG5vdCBzdXBwb3J0ZWQuIFBsZWFzZSBtaWdyYXRlIGVhY2ggbWFqb3IgdmVyc2lvbiBpbmRpdmlkdWFsbHkuXFxuYCArXG4gICAgICAgICAgICAgICAgYEZvciBtb3JlIGluZm9ybWF0aW9uIGFib3V0IHRoZSB1cGRhdGUgcHJvY2Vzcywgc2VlIGh0dHBzOi8vdXBkYXRlLmFuZ3VsYXIuaW8vLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBuZXh0TWFqb3JWZXJzaW9uRnJvbUN1cnJlbnQgPSBjdXJyZW50TWFqb3JWZXJzaW9uICsgMTtcblxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVXBkYXRpbmcgbXVsdGlwbGUgbWFqb3IgdmVyc2lvbnMgb2YgJyR7bmFtZX0nIGF0IG9uY2UgaXMgbm90IHN1cHBvcnRlZC4gUGxlYXNlIG1pZ3JhdGUgZWFjaCBtYWpvciB2ZXJzaW9uIGluZGl2aWR1YWxseS5cXG5gICtcbiAgICAgICAgICAgICAgICBgUnVuICduZyB1cGRhdGUgJHtuYW1lfUAke25leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudH0nIGluIHlvdXIgd29ya3NwYWNlIGRpcmVjdG9yeSBgICtcbiAgICAgICAgICAgICAgICBgdG8gdXBkYXRlIHRvIGxhdGVzdCAnJHtuZXh0TWFqb3JWZXJzaW9uRnJvbUN1cnJlbnR9LngnIHZlcnNpb24gb2YgJyR7bmFtZX0nLlxcblxcbmAgK1xuICAgICAgICAgICAgICAgIGBGb3IgbW9yZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdXBkYXRlIHByb2Nlc3MsIHNlZSBodHRwczovL3VwZGF0ZS5hbmd1bGFyLmlvLz92PSR7Y3VycmVudE1ham9yVmVyc2lvbn0uMC0ke25leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudH0uMGAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHBhY2thZ2VzVG9VcGRhdGUucHVzaChyZXF1ZXN0SWRlbnRpZmllci50b1N0cmluZygpKTtcbiAgICB9XG5cbiAgICBpZiAocGFja2FnZXNUb1VwZGF0ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGNvbnN0IHsgc3VjY2VzcyB9ID0gYXdhaXQgdGhpcy5leGVjdXRlU2NoZW1hdGljKFxuICAgICAgd29ya2Zsb3csXG4gICAgICBVUERBVEVfU0NIRU1BVElDX0NPTExFQ1RJT04sXG4gICAgICAndXBkYXRlJyxcbiAgICAgIHtcbiAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICAgICAgbmV4dDogb3B0aW9ucy5uZXh0LFxuICAgICAgICBwYWNrYWdlTWFuYWdlcjogdGhpcy5jb250ZXh0LnBhY2thZ2VNYW5hZ2VyLm5hbWUsXG4gICAgICAgIHBhY2thZ2VzOiBwYWNrYWdlc1RvVXBkYXRlLFxuICAgICAgfSxcbiAgICApO1xuXG4gICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZzLnJtKHBhdGguam9pbih0aGlzLmNvbnRleHQucm9vdCwgJ25vZGVfbW9kdWxlcycpLCB7XG4gICAgICAgICAgZm9yY2U6IHRydWUsXG4gICAgICAgICAgcmVjdXJzaXZlOiB0cnVlLFxuICAgICAgICAgIG1heFJldHJpZXM6IDMsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCB7fVxuXG4gICAgICBsZXQgZm9yY2VJbnN0YWxsID0gb3B0aW9ucy5mb3JjZTtcbiAgICAgIC8vIG5wbSA3KyBjYW4gZmFpbCBkdWUgdG8gaXQgaW5jb3JyZWN0bHkgcmVzb2x2aW5nIHBlZXIgZGVwZW5kZW5jaWVzIHRoYXQgaGF2ZSB2YWxpZCBTZW1WZXJcbiAgICAgIC8vIHJhbmdlcyBkdXJpbmcgYW4gdXBkYXRlLiBVcGRhdGUgd2lsbCBzZXQgY29ycmVjdCB2ZXJzaW9ucyBvZiBkZXBlbmRlbmNpZXMgd2l0aGluIHRoZVxuICAgICAgLy8gcGFja2FnZS5qc29uIGZpbGUuIFRoZSBmb3JjZSBvcHRpb24gaXMgc2V0IHRvIHdvcmthcm91bmQgdGhlc2UgZXJyb3JzLlxuICAgICAgLy8gRXhhbXBsZSBlcnJvcjpcbiAgICAgIC8vIG5wbSBFUlIhIENvbmZsaWN0aW5nIHBlZXIgZGVwZW5kZW5jeTogQGFuZ3VsYXIvY29tcGlsZXItY2xpQDE0LjAuMC1yYy4wXG4gICAgICAvLyBucG0gRVJSISBub2RlX21vZHVsZXMvQGFuZ3VsYXIvY29tcGlsZXItY2xpXG4gICAgICAvLyBucG0gRVJSISAgIHBlZXIgQGFuZ3VsYXIvY29tcGlsZXItY2xpQFwiXjE0LjAuMCB8fCBeMTQuMC4wLXJjXCIgZnJvbSBAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhckAxNC4wLjAtcmMuMFxuICAgICAgLy8gbnBtIEVSUiEgICBub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXJcbiAgICAgIC8vIG5wbSBFUlIhICAgICBkZXYgQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXJAXCJ+MTQuMC4wLXJjLjBcIiBmcm9tIHRoZSByb290IHByb2plY3RcbiAgICAgIGlmIChcbiAgICAgICAgdGhpcy5jb250ZXh0LnBhY2thZ2VNYW5hZ2VyLm5hbWUgPT09IFBhY2thZ2VNYW5hZ2VyLk5wbSAmJlxuICAgICAgICB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIudmVyc2lvbiAmJlxuICAgICAgICBzZW12ZXIuZ3RlKHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci52ZXJzaW9uLCAnNy4wLjAnLCB7IGluY2x1ZGVQcmVyZWxlYXNlOiB0cnVlIH0pXG4gICAgICApIHtcbiAgICAgICAgbG9nVmVyYm9zZSgnTlBNIDcrIGRldGVjdGVkIC0tIGVuYWJsaW5nIGZvcmNlIG9wdGlvbiBmb3IgcGFja2FnZSBpbnN0YWxsYXRpb24nKTtcbiAgICAgICAgZm9yY2VJbnN0YWxsID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGluc3RhbGxhdGlvblN1Y2Nlc3MgPSBhd2FpdCB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIuaW5zdGFsbEFsbChcbiAgICAgICAgZm9yY2VJbnN0YWxsID8gWyctLWZvcmNlJ10gOiBbXSxcbiAgICAgICAgdGhpcy5jb250ZXh0LnJvb3QsXG4gICAgICApO1xuXG4gICAgICBpZiAoIWluc3RhbGxhdGlvblN1Y2Nlc3MpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1Y2Nlc3MgJiYgb3B0aW9ucy5jcmVhdGVDb21taXRzKSB7XG4gICAgICBpZiAoIXRoaXMuY29tbWl0KGBBbmd1bGFyIENMSSB1cGRhdGUgZm9yIHBhY2thZ2VzIC0gJHtwYWNrYWdlc1RvVXBkYXRlLmpvaW4oJywgJyl9YCkpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhpcyBpcyBhIHRlbXBvcmFyeSB3b3JrYXJvdW5kIHRvIGFsbG93IGRhdGEgdG8gYmUgcGFzc2VkIGJhY2sgZnJvbSB0aGUgdXBkYXRlIHNjaGVtYXRpY1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgY29uc3QgbWlncmF0aW9ucyA9IChnbG9iYWwgYXMgYW55KS5leHRlcm5hbE1pZ3JhdGlvbnMgYXMge1xuICAgICAgcGFja2FnZTogc3RyaW5nO1xuICAgICAgY29sbGVjdGlvbjogc3RyaW5nO1xuICAgICAgZnJvbTogc3RyaW5nO1xuICAgICAgdG86IHN0cmluZztcbiAgICB9W107XG5cbiAgICBpZiAoc3VjY2VzcyAmJiBtaWdyYXRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IG1pZ3JhdGlvbiBvZiBtaWdyYXRpb25zKSB7XG4gICAgICAgIC8vIFJlc29sdmUgdGhlIHBhY2thZ2UgZnJvbSB0aGUgd29ya3NwYWNlIHJvb3QsIGFzIG90aGVyd2lzZSBpdCB3aWxsIGJlIHJlc29sdmVkIGZyb20gdGhlIHRlbXBcbiAgICAgICAgLy8gaW5zdGFsbGVkIENMSSB2ZXJzaW9uLlxuICAgICAgICBsZXQgcGFja2FnZVBhdGg7XG4gICAgICAgIGxvZ1ZlcmJvc2UoXG4gICAgICAgICAgYFJlc29sdmluZyBtaWdyYXRpb24gcGFja2FnZSAnJHttaWdyYXRpb24ucGFja2FnZX0nIGZyb20gJyR7dGhpcy5jb250ZXh0LnJvb3R9Jy4uLmAsXG4gICAgICAgICk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHBhY2thZ2VQYXRoID0gcGF0aC5kaXJuYW1lKFxuICAgICAgICAgICAgICAvLyBUaGlzIG1heSBmYWlsIGlmIHRoZSBgcGFja2FnZS5qc29uYCBpcyBub3QgZXhwb3J0ZWQgYXMgYW4gZW50cnkgcG9pbnRcbiAgICAgICAgICAgICAgcmVxdWlyZS5yZXNvbHZlKHBhdGguam9pbihtaWdyYXRpb24ucGFja2FnZSwgJ3BhY2thZ2UuanNvbicpLCB7XG4gICAgICAgICAgICAgICAgcGF0aHM6IFt0aGlzLmNvbnRleHQucm9vdF0sXG4gICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gdHJ5aW5nIHRvIHJlc29sdmUgdGhlIHBhY2thZ2UncyBtYWluIGVudHJ5IHBvaW50XG4gICAgICAgICAgICAgIHBhY2thZ2VQYXRoID0gcmVxdWlyZS5yZXNvbHZlKG1pZ3JhdGlvbi5wYWNrYWdlLCB7IHBhdGhzOiBbdGhpcy5jb250ZXh0LnJvb3RdIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgIGxvZ1ZlcmJvc2UoZS50b1N0cmluZygpKTtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgYE1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KSB3ZXJlIG5vdCBmb3VuZC5gICtcbiAgICAgICAgICAgICAgICAnIFRoZSBwYWNrYWdlIGNvdWxkIG5vdCBiZSBmb3VuZCBpbiB0aGUgd29ya3NwYWNlLicsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBVbmFibGUgdG8gcmVzb2x2ZSBtaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkuICBbJHtlLm1lc3NhZ2V9XWAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG1pZ3JhdGlvbnM7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQgaXMgYSBwYWNrYWdlLWxvY2FsIGxvY2F0aW9uXG4gICAgICAgIGNvbnN0IGxvY2FsTWlncmF0aW9ucyA9IHBhdGguam9pbihwYWNrYWdlUGF0aCwgbWlncmF0aW9uLmNvbGxlY3Rpb24pO1xuICAgICAgICBpZiAoZXhpc3RzU3luYyhsb2NhbE1pZ3JhdGlvbnMpKSB7XG4gICAgICAgICAgbWlncmF0aW9ucyA9IGxvY2FsTWlncmF0aW9ucztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBUcnkgdG8gcmVzb2x2ZSBmcm9tIHBhY2thZ2UgbG9jYXRpb24uXG4gICAgICAgICAgLy8gVGhpcyBhdm9pZHMgaXNzdWVzIHdpdGggcGFja2FnZSBob2lzdGluZy5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgbWlncmF0aW9ucyA9IHJlcXVpcmUucmVzb2x2ZShtaWdyYXRpb24uY29sbGVjdGlvbiwgeyBwYXRoczogW3BhY2thZ2VQYXRoXSB9KTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBNaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkgd2VyZSBub3QgZm91bmQuYCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KS4gIFske2UubWVzc2FnZX1dYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbnMoXG4gICAgICAgICAgd29ya2Zsb3csXG4gICAgICAgICAgbWlncmF0aW9uLnBhY2thZ2UsXG4gICAgICAgICAgbWlncmF0aW9ucyxcbiAgICAgICAgICBtaWdyYXRpb24uZnJvbSxcbiAgICAgICAgICBtaWdyYXRpb24udG8sXG4gICAgICAgICAgb3B0aW9ucy5jcmVhdGVDb21taXRzLFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIEEgbm9uLXplcm8gdmFsdWUgaXMgYSBmYWlsdXJlIGZvciB0aGUgcGFja2FnZSdzIG1pZ3JhdGlvbnNcbiAgICAgICAgaWYgKHJlc3VsdCAhPT0gMCkge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3VjY2VzcyA/IDAgOiAxO1xuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSBjb21taXQgd2FzIHN1Y2Nlc3NmdWwuXG4gICAqL1xuICBwcml2YXRlIGNvbW1pdChtZXNzYWdlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgLy8gQ2hlY2sgaWYgYSBjb21taXQgaXMgbmVlZGVkLlxuICAgIGxldCBjb21taXROZWVkZWQ6IGJvb2xlYW47XG4gICAgdHJ5IHtcbiAgICAgIGNvbW1pdE5lZWRlZCA9IGhhc0NoYW5nZXNUb0NvbW1pdCgpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nZ2VyLmVycm9yKGAgIEZhaWxlZCB0byByZWFkIEdpdCB0cmVlOlxcbiR7ZXJyLnN0ZGVycn1gKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghY29tbWl0TmVlZGVkKSB7XG4gICAgICBsb2dnZXIuaW5mbygnICBObyBjaGFuZ2VzIHRvIGNvbW1pdCBhZnRlciBtaWdyYXRpb24uJyk7XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIENvbW1pdCBjaGFuZ2VzIGFuZCBhYm9ydCBvbiBlcnJvci5cbiAgICB0cnkge1xuICAgICAgY3JlYXRlQ29tbWl0KG1lc3NhZ2UpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nZ2VyLmVycm9yKGBGYWlsZWQgdG8gY29tbWl0IHVwZGF0ZSAoJHttZXNzYWdlfSk6XFxuJHtlcnIuc3RkZXJyfWApO1xuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gTm90aWZ5IHVzZXIgb2YgdGhlIGNvbW1pdC5cbiAgICBjb25zdCBoYXNoID0gZmluZEN1cnJlbnRHaXRTaGEoKTtcbiAgICBjb25zdCBzaG9ydE1lc3NhZ2UgPSBtZXNzYWdlLnNwbGl0KCdcXG4nKVswXTtcbiAgICBpZiAoaGFzaCkge1xuICAgICAgbG9nZ2VyLmluZm8oYCAgQ29tbWl0dGVkIG1pZ3JhdGlvbiBzdGVwICgke2dldFNob3J0SGFzaChoYXNoKX0pOiAke3Nob3J0TWVzc2FnZX0uYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIENvbW1pdCB3YXMgc3VjY2Vzc2Z1bCwgYnV0IHJlYWRpbmcgdGhlIGhhc2ggd2FzIG5vdC4gU29tZXRoaW5nIHdlaXJkIGhhcHBlbmVkLFxuICAgICAgLy8gYnV0IG5vdGhpbmcgdGhhdCB3b3VsZCBzdG9wIHRoZSB1cGRhdGUuIEp1c3QgbG9nIHRoZSB3ZWlyZG5lc3MgYW5kIGNvbnRpbnVlLlxuICAgICAgbG9nZ2VyLmluZm8oYCAgQ29tbWl0dGVkIG1pZ3JhdGlvbiBzdGVwOiAke3Nob3J0TWVzc2FnZX0uYCk7XG4gICAgICBsb2dnZXIud2FybignICBGYWlsZWQgdG8gbG9vayB1cCBoYXNoIG9mIG1vc3QgcmVjZW50IGNvbW1pdCwgY29udGludWluZyBhbnl3YXlzLicpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBjaGVja0NsZWFuR2l0KCk6IGJvb2xlYW4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0b3BMZXZlbCA9IGV4ZWNTeW5jKCdnaXQgcmV2LXBhcnNlIC0tc2hvdy10b3BsZXZlbCcsIHtcbiAgICAgICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICAgICAgc3RkaW86ICdwaXBlJyxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcmVzdWx0ID0gZXhlY1N5bmMoJ2dpdCBzdGF0dXMgLS1wb3JjZWxhaW4nLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSk7XG4gICAgICBpZiAocmVzdWx0LnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgZmlsZXMgaW5zaWRlIHRoZSB3b3Jrc3BhY2Ugcm9vdCBhcmUgcmVsZXZhbnRcbiAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgcmVzdWx0LnNwbGl0KCdcXG4nKSkge1xuICAgICAgICBjb25zdCByZWxhdGl2ZUVudHJ5ID0gcGF0aC5yZWxhdGl2ZShcbiAgICAgICAgICBwYXRoLnJlc29sdmUodGhpcy5jb250ZXh0LnJvb3QpLFxuICAgICAgICAgIHBhdGgucmVzb2x2ZSh0b3BMZXZlbC50cmltKCksIGVudHJ5LnNsaWNlKDMpLnRyaW0oKSksXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKCFyZWxhdGl2ZUVudHJ5LnN0YXJ0c1dpdGgoJy4uJykgJiYgIXBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZUVudHJ5KSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2gge31cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgY3VycmVudCBpbnN0YWxsZWQgQ0xJIHZlcnNpb24gaXMgb2xkZXIgb3IgbmV3ZXIgdGhhbiBhIGNvbXBhdGlibGUgdmVyc2lvbi5cbiAgICogQHJldHVybnMgdGhlIHZlcnNpb24gdG8gaW5zdGFsbCBvciBudWxsIHdoZW4gdGhlcmUgaXMgbm8gdXBkYXRlIHRvIGluc3RhbGwuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGNoZWNrQ0xJVmVyc2lvbihcbiAgICBwYWNrYWdlc1RvVXBkYXRlOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCxcbiAgICB2ZXJib3NlID0gZmFsc2UsXG4gICAgbmV4dCA9IGZhbHNlLFxuICApOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICBjb25zdCB7IHZlcnNpb24gfSA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KFxuICAgICAgYEBhbmd1bGFyL2NsaUAke3RoaXMuZ2V0Q0xJVXBkYXRlUnVubmVyVmVyc2lvbihwYWNrYWdlc1RvVXBkYXRlLCBuZXh0KX1gLFxuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlcixcbiAgICAgIHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgdXNpbmdZYXJuOiB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIubmFtZSA9PT0gUGFja2FnZU1hbmFnZXIuWWFybixcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIHJldHVybiBWRVJTSU9OLmZ1bGwgPT09IHZlcnNpb24gPyBudWxsIDogdmVyc2lvbjtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q0xJVXBkYXRlUnVubmVyVmVyc2lvbihcbiAgICBwYWNrYWdlc1RvVXBkYXRlOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCxcbiAgICBuZXh0OiBib29sZWFuLFxuICApOiBzdHJpbmcgfCBudW1iZXIge1xuICAgIGlmIChuZXh0KSB7XG4gICAgICByZXR1cm4gJ25leHQnO1xuICAgIH1cblxuICAgIGNvbnN0IHVwZGF0aW5nQW5ndWxhclBhY2thZ2UgPSBwYWNrYWdlc1RvVXBkYXRlPy5maW5kKChyKSA9PiBBTkdVTEFSX1BBQ0tBR0VTX1JFR0VYUC50ZXN0KHIpKTtcbiAgICBpZiAodXBkYXRpbmdBbmd1bGFyUGFja2FnZSkge1xuICAgICAgLy8gSWYgd2UgYXJlIHVwZGF0aW5nIGFueSBBbmd1bGFyIHBhY2thZ2Ugd2UgY2FuIHVwZGF0ZSB0aGUgQ0xJIHRvIHRoZSB0YXJnZXQgdmVyc2lvbiBiZWNhdXNlXG4gICAgICAvLyBtaWdyYXRpb25zIGZvciBAYW5ndWxhci9jb3JlQDEzIGNhbiBiZSBleGVjdXRlZCB1c2luZyBBbmd1bGFyL2NsaUAxMy5cbiAgICAgIC8vIFRoaXMgaXMgc2FtZSBiZWhhdmlvdXIgYXMgYG5weCBAYW5ndWxhci9jbGlAMTMgdXBkYXRlIEBhbmd1bGFyL2NvcmVAMTNgLlxuXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpQDEzYCAtPiBbJycsICdhbmd1bGFyL2NsaScsICcxMyddXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpYCAtPiBbJycsICdhbmd1bGFyL2NsaSddXG4gICAgICBjb25zdCB0ZW1wVmVyc2lvbiA9IGNvZXJjZVZlcnNpb25OdW1iZXIodXBkYXRpbmdBbmd1bGFyUGFja2FnZS5zcGxpdCgnQCcpWzJdKTtcblxuICAgICAgcmV0dXJuIHNlbXZlci5wYXJzZSh0ZW1wVmVyc2lvbik/Lm1ham9yID8/ICdsYXRlc3QnO1xuICAgIH1cblxuICAgIC8vIFdoZW4gbm90IHVwZGF0aW5nIGFuIEFuZ3VsYXIgcGFja2FnZSB3ZSBjYW5ub3QgZGV0ZXJtaW5lIHdoaWNoIHNjaGVtYXRpYyBydW50aW1lIHRoZSBtaWdyYXRpb24gc2hvdWxkIHRvIGJlIGV4ZWN1dGVkIGluLlxuICAgIC8vIFR5cGljYWxseSwgd2UgY2FuIGFzc3VtZSB0aGF0IHRoZSBgQGFuZ3VsYXIvY2xpYCB3YXMgdXBkYXRlZCBwcmV2aW91c2x5LlxuICAgIC8vIEV4YW1wbGU6IEFuZ3VsYXIgb2ZmaWNpYWwgcGFja2FnZXMgYXJlIHR5cGljYWxseSB1cGRhdGVkIHByaW9yIHRvIE5HUlggZXRjLi4uXG4gICAgLy8gVGhlcmVmb3JlLCB3ZSBvbmx5IHVwZGF0ZSB0byB0aGUgbGF0ZXN0IHBhdGNoIHZlcnNpb24gb2YgdGhlIGluc3RhbGxlZCBtYWpvciB2ZXJzaW9uIG9mIHRoZSBBbmd1bGFyIENMSS5cblxuICAgIC8vIFRoaXMgaXMgaW1wb3J0YW50IGJlY2F1c2Ugd2UgbWlnaHQgZW5kIHVwIGluIGEgc2NlbmFyaW8gd2hlcmUgbG9jYWxseSBBbmd1bGFyIHYxMiBpcyBpbnN0YWxsZWQsIHVwZGF0aW5nIE5HUlggZnJvbSAxMSB0byAxMi5cbiAgICAvLyBXZSBlbmQgdXAgdXNpbmcgQW5ndWxhciBDbEkgdjEzIHRvIHJ1biB0aGUgbWlncmF0aW9ucyBpZiB3ZSBydW4gdGhlIG1pZ3JhdGlvbnMgdXNpbmcgdGhlIENMSSBpbnN0YWxsZWQgbWFqb3IgdmVyc2lvbiArIDEgbG9naWMuXG4gICAgcmV0dXJuIFZFUlNJT04ubWFqb3I7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJ1blRlbXBCaW5hcnkocGFja2FnZU5hbWU6IHN0cmluZywgYXJnczogc3RyaW5nW10gPSBbXSk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBzdWNjZXNzLCB0ZW1wTm9kZU1vZHVsZXMgfSA9IGF3YWl0IHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci5pbnN0YWxsVGVtcChwYWNrYWdlTmFtZSk7XG4gICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgdmVyc2lvbi90YWcgZXRjLi4uIGZyb20gcGFja2FnZSBuYW1lXG4gICAgLy8gRXg6IEBhbmd1bGFyL2NsaUBsYXRlc3QgLT4gQGFuZ3VsYXIvY2xpXG4gICAgY29uc3QgcGFja2FnZU5hbWVOb1ZlcnNpb24gPSBwYWNrYWdlTmFtZS5zdWJzdHJpbmcoMCwgcGFja2FnZU5hbWUubGFzdEluZGV4T2YoJ0AnKSk7XG4gICAgY29uc3QgcGtnTG9jYXRpb24gPSBqb2luKHRlbXBOb2RlTW9kdWxlcywgcGFja2FnZU5hbWVOb1ZlcnNpb24pO1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IGpvaW4ocGtnTG9jYXRpb24sICdwYWNrYWdlLmpzb24nKTtcblxuICAgIC8vIEdldCBhIGJpbmFyeSBsb2NhdGlvbiBmb3IgdGhpcyBwYWNrYWdlXG4gICAgbGV0IGJpblBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBpZiAoZXhpc3RzU3luYyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoLCAndXRmLTgnKTtcbiAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgIGNvbnN0IHsgYmluID0ge30gfSA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgICAgIGNvbnN0IGJpbktleXMgPSBPYmplY3Qua2V5cyhiaW4pO1xuXG4gICAgICAgIGlmIChiaW5LZXlzLmxlbmd0aCkge1xuICAgICAgICAgIGJpblBhdGggPSByZXNvbHZlKHBrZ0xvY2F0aW9uLCBiaW5bYmluS2V5c1swXV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFiaW5QYXRoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBsb2NhdGUgYmluIGZvciB0ZW1wb3JhcnkgcGFja2FnZTogJHtwYWNrYWdlTmFtZU5vVmVyc2lvbn0uYCk7XG4gICAgfVxuXG4gICAgY29uc3QgeyBzdGF0dXMsIGVycm9yIH0gPSBzcGF3blN5bmMocHJvY2Vzcy5leGVjUGF0aCwgW2JpblBhdGgsIC4uLmFyZ3NdLCB7XG4gICAgICBzdGRpbzogJ2luaGVyaXQnLFxuICAgICAgZW52OiB7XG4gICAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgICBOR19ESVNBQkxFX1ZFUlNJT05fQ0hFQ0s6ICd0cnVlJyxcbiAgICAgICAgTkdfQ0xJX0FOQUxZVElDUzogJ2ZhbHNlJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBpZiAoc3RhdHVzID09PSBudWxsICYmIGVycm9yKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdHVzID8/IDA7XG4gIH1cbn1cblxuLyoqXG4gKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSB3b3JraW5nIGRpcmVjdG9yeSBoYXMgR2l0IGNoYW5nZXMgdG8gY29tbWl0LlxuICovXG5mdW5jdGlvbiBoYXNDaGFuZ2VzVG9Db21taXQoKTogYm9vbGVhbiB7XG4gIC8vIExpc3QgYWxsIG1vZGlmaWVkIGZpbGVzIG5vdCBjb3ZlcmVkIGJ5IC5naXRpZ25vcmUuXG4gIC8vIElmIGFueSBmaWxlcyBhcmUgcmV0dXJuZWQsIHRoZW4gdGhlcmUgbXVzdCBiZSBzb21ldGhpbmcgdG8gY29tbWl0LlxuXG4gIHJldHVybiBleGVjU3luYygnZ2l0IGxzLWZpbGVzIC1tIC1kIC1vIC0tZXhjbHVkZS1zdGFuZGFyZCcpLnRvU3RyaW5nKCkgIT09ICcnO1xufVxuXG4vKipcbiAqIFByZWNvbmRpdGlvbjogTXVzdCBoYXZlIHBlbmRpbmcgY2hhbmdlcyB0byBjb21taXQsIHRoZXkgZG8gbm90IG5lZWQgdG8gYmUgc3RhZ2VkLlxuICogUG9zdGNvbmRpdGlvbjogVGhlIEdpdCB3b3JraW5nIHRyZWUgaXMgY29tbWl0dGVkIGFuZCB0aGUgcmVwbyBpcyBjbGVhbi5cbiAqIEBwYXJhbSBtZXNzYWdlIFRoZSBjb21taXQgbWVzc2FnZSB0byB1c2UuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUNvbW1pdChtZXNzYWdlOiBzdHJpbmcpIHtcbiAgLy8gU3RhZ2UgZW50aXJlIHdvcmtpbmcgdHJlZSBmb3IgY29tbWl0LlxuICBleGVjU3luYygnZ2l0IGFkZCAtQScsIHsgZW5jb2Rpbmc6ICd1dGY4Jywgc3RkaW86ICdwaXBlJyB9KTtcblxuICAvLyBDb21taXQgd2l0aCB0aGUgbWVzc2FnZSBwYXNzZWQgdmlhIHN0ZGluIHRvIGF2b2lkIGJhc2ggZXNjYXBpbmcgaXNzdWVzLlxuICBleGVjU3luYygnZ2l0IGNvbW1pdCAtLW5vLXZlcmlmeSAtRiAtJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnLCBpbnB1dDogbWVzc2FnZSB9KTtcbn1cblxuLyoqXG4gKiBAcmV0dXJuIFRoZSBHaXQgU0hBIGhhc2ggb2YgdGhlIEhFQUQgY29tbWl0LiBSZXR1cm5zIG51bGwgaWYgdW5hYmxlIHRvIHJldHJpZXZlIHRoZSBoYXNoLlxuICovXG5mdW5jdGlvbiBmaW5kQ3VycmVudEdpdFNoYSgpOiBzdHJpbmcgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZXhlY1N5bmMoJ2dpdCByZXYtcGFyc2UgSEVBRCcsIHsgZW5jb2Rpbmc6ICd1dGY4Jywgc3RkaW86ICdwaXBlJyB9KS50cmltKCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFNob3J0SGFzaChjb21taXRIYXNoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY29tbWl0SGFzaC5zbGljZSgwLCA5KTtcbn1cblxuZnVuY3Rpb24gY29lcmNlVmVyc2lvbk51bWJlcih2ZXJzaW9uOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAoIXZlcnNpb24pIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKCEvXlxcZHsxLDMwfVxcLlxcZHsxLDMwfVxcLlxcZHsxLDMwfS8udGVzdCh2ZXJzaW9uKSkge1xuICAgIGNvbnN0IG1hdGNoID0gdmVyc2lvbi5tYXRjaCgvXlxcZHsxLDMwfShcXC5cXGR7MSwzMH0pKi8pO1xuXG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAoIW1hdGNoWzFdKSB7XG4gICAgICB2ZXJzaW9uID0gdmVyc2lvbi5zdWJzdHJpbmcoMCwgbWF0Y2hbMF0ubGVuZ3RoKSArICcuMC4wJyArIHZlcnNpb24uc3Vic3RyaW5nKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgfSBlbHNlIGlmICghbWF0Y2hbMl0pIHtcbiAgICAgIHZlcnNpb24gPSB2ZXJzaW9uLnN1YnN0cmluZygwLCBtYXRjaFswXS5sZW5ndGgpICsgJy4wJyArIHZlcnNpb24uc3Vic3RyaW5nKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHNlbXZlci52YWxpZCh2ZXJzaW9uKSA/PyB1bmRlZmluZWQ7XG59XG4iXX0=