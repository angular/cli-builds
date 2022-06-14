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
        this.scope = command_module_1.CommandScope.In;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3VwZGF0ZS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwyREFBMkU7QUFDM0UsNERBQWdFO0FBQ2hFLGlEQUFvRDtBQUNwRCwyQkFBZ0Q7QUFDaEQsc0VBQWtDO0FBQ2xDLDBFQUE2QztBQUM3QywyQ0FBNkI7QUFDN0IsK0JBQXFDO0FBQ3JDLCtDQUFpQztBQUVqQywyRUFBc0U7QUFDdEUseUVBSzhDO0FBQzlDLGlHQUE0RjtBQUM1RiwyRkFBeUY7QUFDekYsaURBQStDO0FBQy9DLDZFQUEwRTtBQUMxRSx1REFBK0Q7QUFDL0QsdUVBSzBDO0FBQzFDLCtEQUtzQztBQUN0QyxxREFBa0Q7QUFlbEQsTUFBTSx1QkFBdUIsR0FBRyw2QkFBNkIsQ0FBQztBQUM5RCxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDJCQUEyQixDQUFDLENBQUM7QUFFdEYsTUFBYSxtQkFBb0IsU0FBUSw4QkFBZ0M7SUFBekU7O1FBQ1csVUFBSyxHQUFHLDZCQUFZLENBQUMsRUFBRSxDQUFDO1FBQ2QsMEJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBRWpELFlBQU8sR0FBRyxxQkFBcUIsQ0FBQztRQUNoQyxhQUFRLEdBQUcsOEVBQThFLENBQUM7UUFDMUYsd0JBQW1CLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7SUFvNUIvRCxDQUFDO0lBbDVCQyxPQUFPLENBQUMsVUFBZ0I7UUFDdEIsT0FBTyxVQUFVO2FBQ2QsVUFBVSxDQUFDLFVBQVUsRUFBRTtZQUN0QixXQUFXLEVBQUUsb0NBQW9DO1lBQ2pELElBQUksRUFBRSxRQUFRO1lBQ2QsS0FBSyxF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RTtZQUNWLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNiLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQy9GO2FBQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNwQixPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUM3RjthQUFNO1lBQ0wsT0FBTyxTQUFTLENBQUM7U0FDbEI7S0FDRjtJQUVELE9BQU8sTUFBQSxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxtQ0FBSSxTQUFTLENBQUM7QUFDNUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVXb3JrZmxvdyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB7IGV4ZWNTeW5jLCBzcGF3blN5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHByb21pc2VzIGFzIGZzIH0gZnJvbSAnZnMnO1xuaW1wb3J0IG5wYSBmcm9tICducG0tcGFja2FnZS1hcmcnO1xuaW1wb3J0IHBpY2tNYW5pZmVzdCBmcm9tICducG0tcGljay1tYW5pZmVzdCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgam9pbiwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi8uLi8uLi9saWIvY29uZmlnL3dvcmtzcGFjZS1zY2hlbWEnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUVycm9yLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBTY2hlbWF0aWNFbmdpbmVIb3N0IH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL3V0aWxpdGllcy9zY2hlbWF0aWMtZW5naW5lLWhvc3QnO1xuaW1wb3J0IHsgc3Vic2NyaWJlVG9Xb3JrZmxvdyB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvc2NoZW1hdGljLXdvcmtmbG93JztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBkaXNhYmxlVmVyc2lvbkNoZWNrIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2Vudmlyb25tZW50LW9wdGlvbnMnO1xuaW1wb3J0IHsgd3JpdGVFcnJvclRvTG9nRmlsZSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9sb2ctZmlsZSc7XG5pbXBvcnQge1xuICBQYWNrYWdlSWRlbnRpZmllcixcbiAgUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNYW5pZmVzdCxcbiAgZmV0Y2hQYWNrYWdlTWV0YWRhdGEsXG59IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wYWNrYWdlLW1ldGFkYXRhJztcbmltcG9ydCB7XG4gIFBhY2thZ2VUcmVlTm9kZSxcbiAgZmluZFBhY2thZ2VKc29uLFxuICBnZXRQcm9qZWN0RGVwZW5kZW5jaWVzLFxuICByZWFkUGFja2FnZUpzb24sXG59IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wYWNrYWdlLXRyZWUnO1xuaW1wb3J0IHsgVkVSU0lPTiB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy92ZXJzaW9uJztcblxuaW50ZXJmYWNlIFVwZGF0ZUNvbW1hbmRBcmdzIHtcbiAgcGFja2FnZXM/OiBzdHJpbmdbXTtcbiAgZm9yY2U6IGJvb2xlYW47XG4gIG5leHQ6IGJvb2xlYW47XG4gICdtaWdyYXRlLW9ubHknPzogYm9vbGVhbjtcbiAgbmFtZT86IHN0cmluZztcbiAgZnJvbT86IHN0cmluZztcbiAgdG8/OiBzdHJpbmc7XG4gICdhbGxvdy1kaXJ0eSc6IGJvb2xlYW47XG4gIHZlcmJvc2U6IGJvb2xlYW47XG4gICdjcmVhdGUtY29tbWl0cyc6IGJvb2xlYW47XG59XG5cbmNvbnN0IEFOR1VMQVJfUEFDS0FHRVNfUkVHRVhQID0gL15AKD86YW5ndWxhcnxuZ3VuaXZlcnNhbClcXC8vO1xuY29uc3QgVVBEQVRFX1NDSEVNQVRJQ19DT0xMRUNUSU9OID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJ3NjaGVtYXRpYy9jb2xsZWN0aW9uLmpzb24nKTtcblxuZXhwb3J0IGNsYXNzIFVwZGF0ZUNvbW1hbmRNb2R1bGUgZXh0ZW5kcyBDb21tYW5kTW9kdWxlPFVwZGF0ZUNvbW1hbmRBcmdzPiB7XG4gIG92ZXJyaWRlIHNjb3BlID0gQ29tbWFuZFNjb3BlLkluO1xuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgc2hvdWxkUmVwb3J0QW5hbHl0aWNzID0gZmFsc2U7XG5cbiAgY29tbWFuZCA9ICd1cGRhdGUgW3BhY2thZ2VzLi5dJztcbiAgZGVzY3JpYmUgPSAnVXBkYXRlcyB5b3VyIHdvcmtzcGFjZSBhbmQgaXRzIGRlcGVuZGVuY2llcy4gU2VlIGh0dHBzOi8vdXBkYXRlLmFuZ3VsYXIuaW8vLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSBqb2luKF9fZGlybmFtZSwgJ2xvbmctZGVzY3JpcHRpb24ubWQnKTtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2PFVwZGF0ZUNvbW1hbmRBcmdzPiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3NcbiAgICAgIC5wb3NpdGlvbmFsKCdwYWNrYWdlcycsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgbmFtZXMgb2YgcGFja2FnZShzKSB0byB1cGRhdGUuJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGFycmF5OiB0cnVlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2ZvcmNlJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAnSWdub3JlIHBlZXIgZGVwZW5kZW5jeSB2ZXJzaW9uIG1pc21hdGNoZXMuICcgK1xuICAgICAgICAgIGBQYXNzZXMgdGhlICctLWZvcmNlJyBmbGFnIHRvIHRoZSBwYWNrYWdlIG1hbmFnZXIgd2hlbiBpbnN0YWxsaW5nIHBhY2thZ2VzLmAsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignbmV4dCcsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdVc2UgdGhlIHByZXJlbGVhc2UgdmVyc2lvbiwgaW5jbHVkaW5nIGJldGEgYW5kIFJDcy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ21pZ3JhdGUtb25seScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdPbmx5IHBlcmZvcm0gYSBtaWdyYXRpb24sIGRvIG5vdCB1cGRhdGUgdGhlIGluc3RhbGxlZCB2ZXJzaW9uLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCduYW1lJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAnVGhlIG5hbWUgb2YgdGhlIG1pZ3JhdGlvbiB0byBydW4uICcgK1xuICAgICAgICAgIGBPbmx5IGF2YWlsYWJsZSB3aXRoIGEgc2luZ2xlIHBhY2thZ2UgYmVpbmcgdXBkYXRlZCwgYW5kIG9ubHkgd2l0aCAnbWlncmF0ZS1vbmx5JyBvcHRpb24uYCxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGltcGxpZXM6IFsnbWlncmF0ZS1vbmx5J10sXG4gICAgICAgIGNvbmZsaWN0czogWyd0bycsICdmcm9tJ10sXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignZnJvbScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgJ1ZlcnNpb24gZnJvbSB3aGljaCB0byBtaWdyYXRlIGZyb20uICcgK1xuICAgICAgICAgIGBPbmx5IGF2YWlsYWJsZSB3aXRoIGEgc2luZ2xlIHBhY2thZ2UgYmVpbmcgdXBkYXRlZCwgYW5kIG9ubHkgd2l0aCAnbWlncmF0ZS1vbmx5Jy5gLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgaW1wbGllczogWyd0bycsICdtaWdyYXRlLW9ubHknXSxcbiAgICAgICAgY29uZmxpY3RzOiBbJ25hbWUnXSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCd0bycsIHtcbiAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgJ1ZlcnNpb24gdXAgdG8gd2hpY2ggdG8gYXBwbHkgbWlncmF0aW9ucy4gT25seSBhdmFpbGFibGUgd2l0aCBhIHNpbmdsZSBwYWNrYWdlIGJlaW5nIHVwZGF0ZWQsICcgK1xuICAgICAgICAgIGBhbmQgb25seSB3aXRoICdtaWdyYXRlLW9ubHknIG9wdGlvbi4gUmVxdWlyZXMgJ2Zyb20nIHRvIGJlIHNwZWNpZmllZC4gRGVmYXVsdCB0byB0aGUgaW5zdGFsbGVkIHZlcnNpb24gZGV0ZWN0ZWQuYCxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGltcGxpZXM6IFsnZnJvbScsICdtaWdyYXRlLW9ubHknXSxcbiAgICAgICAgY29uZmxpY3RzOiBbJ25hbWUnXSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdhbGxvdy1kaXJ0eScsIHtcbiAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgJ1doZXRoZXIgdG8gYWxsb3cgdXBkYXRpbmcgd2hlbiB0aGUgcmVwb3NpdG9yeSBjb250YWlucyBtb2RpZmllZCBvciB1bnRyYWNrZWQgZmlsZXMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCd2ZXJib3NlJywge1xuICAgICAgICBkZXNjcmliZTogJ0Rpc3BsYXkgYWRkaXRpb25hbCBkZXRhaWxzIGFib3V0IGludGVybmFsIG9wZXJhdGlvbnMgZHVyaW5nIGV4ZWN1dGlvbi4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2NyZWF0ZS1jb21taXRzJywge1xuICAgICAgICBkZXNjcmliZTogJ0NyZWF0ZSBzb3VyY2UgY29udHJvbCBjb21taXRzIGZvciB1cGRhdGVzIGFuZCBtaWdyYXRpb25zLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgYWxpYXM6IFsnQyddLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAuY2hlY2soKHsgcGFja2FnZXMsICdhbGxvdy1kaXJ0eSc6IGFsbG93RGlydHksICdtaWdyYXRlLW9ubHknOiBtaWdyYXRlT25seSB9KSA9PiB7XG4gICAgICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICAgICAgLy8gVGhpcyBhbGxvd3MgdGhlIHVzZXIgdG8gZWFzaWx5IHJlc2V0IGFueSBjaGFuZ2VzIGZyb20gdGhlIHVwZGF0ZS5cbiAgICAgICAgaWYgKHBhY2thZ2VzPy5sZW5ndGggJiYgIXRoaXMuY2hlY2tDbGVhbkdpdCgpKSB7XG4gICAgICAgICAgaWYgKGFsbG93RGlydHkpIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICAnUmVwb3NpdG9yeSBpcyBub3QgY2xlYW4uIFVwZGF0ZSBjaGFuZ2VzIHdpbGwgYmUgbWl4ZWQgd2l0aCBwcmUtZXhpc3RpbmcgY2hhbmdlcy4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihcbiAgICAgICAgICAgICAgJ1JlcG9zaXRvcnkgaXMgbm90IGNsZWFuLiBQbGVhc2UgY29tbWl0IG9yIHN0YXNoIGFueSBjaGFuZ2VzIGJlZm9yZSB1cGRhdGluZy4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWlncmF0ZU9ubHkpIHtcbiAgICAgICAgICBpZiAocGFja2FnZXM/Lmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihcbiAgICAgICAgICAgICAgYEEgc2luZ2xlIHBhY2thZ2UgbXVzdCBiZSBzcGVjaWZpZWQgd2hlbiB1c2luZyB0aGUgJ21pZ3JhdGUtb25seScgb3B0aW9uLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5zdHJpY3QoKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBPcHRpb25zPFVwZGF0ZUNvbW1hbmRBcmdzPik6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyLCBwYWNrYWdlTWFuYWdlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgcGFja2FnZU1hbmFnZXIuZW5zdXJlQ29tcGF0aWJpbGl0eSgpO1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgaW5zdGFsbGVkIENMSSB2ZXJzaW9uIGlzIG9sZGVyIHRoYW4gdGhlIGxhdGVzdCBjb21wYXRpYmxlIHZlcnNpb24uXG4gICAgaWYgKCFkaXNhYmxlVmVyc2lvbkNoZWNrKSB7XG4gICAgICBjb25zdCBjbGlWZXJzaW9uVG9JbnN0YWxsID0gYXdhaXQgdGhpcy5jaGVja0NMSVZlcnNpb24oXG4gICAgICAgIG9wdGlvbnMucGFja2FnZXMsXG4gICAgICAgIG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgb3B0aW9ucy5uZXh0LFxuICAgICAgKTtcblxuICAgICAgaWYgKGNsaVZlcnNpb25Ub0luc3RhbGwpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgJ1RoZSBpbnN0YWxsZWQgQW5ndWxhciBDTEkgdmVyc2lvbiBpcyBvdXRkYXRlZC5cXG4nICtcbiAgICAgICAgICAgIGBJbnN0YWxsaW5nIGEgdGVtcG9yYXJ5IEFuZ3VsYXIgQ0xJIHZlcnNpb25lZCAke2NsaVZlcnNpb25Ub0luc3RhbGx9IHRvIHBlcmZvcm0gdGhlIHVwZGF0ZS5gLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiB0aGlzLnJ1blRlbXBCaW5hcnkoYEBhbmd1bGFyL2NsaUAke2NsaVZlcnNpb25Ub0luc3RhbGx9YCwgcHJvY2Vzcy5hcmd2LnNsaWNlKDIpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlczogUGFja2FnZUlkZW50aWZpZXJbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgcmVxdWVzdCBvZiBvcHRpb25zLnBhY2thZ2VzID8/IFtdKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYWNrYWdlSWRlbnRpZmllciA9IG5wYShyZXF1ZXN0KTtcblxuICAgICAgICAvLyBvbmx5IHJlZ2lzdHJ5IGlkZW50aWZpZXJzIGFyZSBzdXBwb3J0ZWRcbiAgICAgICAgaWYgKCFwYWNrYWdlSWRlbnRpZmllci5yZWdpc3RyeSkge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcihgUGFja2FnZSAnJHtyZXF1ZXN0fScgaXMgbm90IGEgcmVnaXN0cnkgcGFja2FnZSBpZGVudGlmZXIuYCk7XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwYWNrYWdlcy5zb21lKCh2KSA9PiB2Lm5hbWUgPT09IHBhY2thZ2VJZGVudGlmaWVyLm5hbWUpKSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKGBEdXBsaWNhdGUgcGFja2FnZSAnJHtwYWNrYWdlSWRlbnRpZmllci5uYW1lfScgc3BlY2lmaWVkLmApO1xuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5taWdyYXRlT25seSAmJiBwYWNrYWdlSWRlbnRpZmllci5yYXdTcGVjKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oJ1BhY2thZ2Ugc3BlY2lmaWVyIGhhcyBubyBlZmZlY3Qgd2hlbiB1c2luZyBcIm1pZ3JhdGUtb25seVwiIG9wdGlvbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIG5leHQgb3B0aW9uIGlzIHVzZWQgYW5kIG5vIHNwZWNpZmllciBzdXBwbGllZCwgdXNlIG5leHQgdGFnXG4gICAgICAgIGlmIChvcHRpb25zLm5leHQgJiYgIXBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMpIHtcbiAgICAgICAgICBwYWNrYWdlSWRlbnRpZmllci5mZXRjaFNwZWMgPSAnbmV4dCc7XG4gICAgICAgIH1cblxuICAgICAgICBwYWNrYWdlcy5wdXNoKHBhY2thZ2VJZGVudGlmaWVyIGFzIFBhY2thZ2VJZGVudGlmaWVyKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGUubWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oYFVzaW5nIHBhY2thZ2UgbWFuYWdlcjogJHtjb2xvcnMuZ3JleShwYWNrYWdlTWFuYWdlci5uYW1lKX1gKTtcbiAgICBsb2dnZXIuaW5mbygnQ29sbGVjdGluZyBpbnN0YWxsZWQgZGVwZW5kZW5jaWVzLi4uJyk7XG5cbiAgICBjb25zdCByb290RGVwZW5kZW5jaWVzID0gYXdhaXQgZ2V0UHJvamVjdERlcGVuZGVuY2llcyh0aGlzLmNvbnRleHQucm9vdCk7XG4gICAgbG9nZ2VyLmluZm8oYEZvdW5kICR7cm9vdERlcGVuZGVuY2llcy5zaXplfSBkZXBlbmRlbmNpZXMuYCk7XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IG5ldyBOb2RlV29ya2Zsb3codGhpcy5jb250ZXh0LnJvb3QsIHtcbiAgICAgIHBhY2thZ2VNYW5hZ2VyOiBwYWNrYWdlTWFuYWdlci5uYW1lLFxuICAgICAgcGFja2FnZU1hbmFnZXJGb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICAgIC8vIF9fZGlybmFtZSAtPiBmYXZvciBAc2NoZW1hdGljcy91cGRhdGUgZnJvbSB0aGlzIHBhY2thZ2VcbiAgICAgIC8vIE90aGVyd2lzZSwgdXNlIHBhY2thZ2VzIGZyb20gdGhlIGFjdGl2ZSB3b3Jrc3BhY2UgKG1pZ3JhdGlvbnMpXG4gICAgICByZXNvbHZlUGF0aHM6IFtfX2Rpcm5hbWUsIHRoaXMuY29udGV4dC5yb290XSxcbiAgICAgIHNjaGVtYVZhbGlkYXRpb246IHRydWUsXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KTtcblxuICAgIGlmIChwYWNrYWdlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIFNob3cgc3RhdHVzXG4gICAgICBjb25zdCB7IHN1Y2Nlc3MgfSA9IGF3YWl0IHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICAgICAgd29ya2Zsb3csXG4gICAgICAgIFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTixcbiAgICAgICAgJ3VwZGF0ZScsXG4gICAgICAgIHtcbiAgICAgICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICAgICAgICBuZXh0OiBvcHRpb25zLm5leHQsXG4gICAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICAgIHBhY2thZ2VNYW5hZ2VyOiBwYWNrYWdlTWFuYWdlci5uYW1lLFxuICAgICAgICAgIHBhY2thZ2VzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiBzdWNjZXNzID8gMCA6IDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdGlvbnMubWlncmF0ZU9ubHlcbiAgICAgID8gdGhpcy5taWdyYXRlT25seSh3b3JrZmxvdywgKG9wdGlvbnMucGFja2FnZXMgPz8gW10pWzBdLCByb290RGVwZW5kZW5jaWVzLCBvcHRpb25zKVxuICAgICAgOiB0aGlzLnVwZGF0ZVBhY2thZ2VzQW5kTWlncmF0ZSh3b3JrZmxvdywgcm9vdERlcGVuZGVuY2llcywgb3B0aW9ucywgcGFja2FnZXMpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlU2NoZW1hdGljKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgY29sbGVjdGlvbjogc3RyaW5nLFxuICAgIHNjaGVtYXRpYzogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge30sXG4gICk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBmaWxlczogU2V0PHN0cmluZz4gfT4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3Qgd29ya2Zsb3dTdWJzY3JpcHRpb24gPSBzdWJzY3JpYmVUb1dvcmtmbG93KHdvcmtmbG93LCBsb2dnZXIpO1xuXG4gICAgLy8gVE9ETzogQWxsb3cgcGFzc2luZyBhIHNjaGVtYXRpYyBpbnN0YW5jZSBkaXJlY3RseVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB3b3JrZmxvd1xuICAgICAgICAuZXhlY3V0ZSh7XG4gICAgICAgICAgY29sbGVjdGlvbixcbiAgICAgICAgICBzY2hlbWF0aWMsXG4gICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICBsb2dnZXIsXG4gICAgICAgIH0pXG4gICAgICAgIC50b1Byb21pc2UoKTtcblxuICAgICAgcmV0dXJuIHsgc3VjY2VzczogIXdvcmtmbG93U3Vic2NyaXB0aW9uLmVycm9yLCBmaWxlczogd29ya2Zsb3dTdWJzY3JpcHRpb24uZmlsZXMgfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgJHtjb2xvcnMuc3ltYm9scy5jcm9zc30gTWlncmF0aW9uIGZhaWxlZC4gU2VlIGFib3ZlIGZvciBmdXJ0aGVyIGRldGFpbHMuXFxuYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBsb2dQYXRoID0gd3JpdGVFcnJvclRvTG9nRmlsZShlKTtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKFxuICAgICAgICAgIGAke2NvbG9ycy5zeW1ib2xzLmNyb3NzfSBNaWdyYXRpb24gZmFpbGVkOiAke2UubWVzc2FnZX1cXG5gICtcbiAgICAgICAgICAgIGAgIFNlZSBcIiR7bG9nUGF0aH1cIiBmb3IgZnVydGhlciBkZXRhaWxzLlxcbmAsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBmaWxlczogd29ya2Zsb3dTdWJzY3JpcHRpb24uZmlsZXMgfTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgd29ya2Zsb3dTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgbWlncmF0aW9uIHdhcyBwZXJmb3JtZWQgc3VjY2Vzc2Z1bGx5LlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlTWlncmF0aW9uKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICBjb2xsZWN0aW9uUGF0aDogc3RyaW5nLFxuICAgIG1pZ3JhdGlvbk5hbWU6IHN0cmluZyxcbiAgICBjb21taXQ/OiBib29sZWFuLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25QYXRoKTtcbiAgICBjb25zdCBuYW1lID0gY29sbGVjdGlvbi5saXN0U2NoZW1hdGljTmFtZXMoKS5maW5kKChuYW1lKSA9PiBuYW1lID09PSBtaWdyYXRpb25OYW1lKTtcbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgQ2Fubm90IGZpbmQgbWlncmF0aW9uICcke21pZ3JhdGlvbk5hbWV9JyBpbiAnJHtwYWNrYWdlTmFtZX0nLmApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbyhjb2xvcnMuY3lhbihgKiogRXhlY3V0aW5nICcke21pZ3JhdGlvbk5hbWV9JyBvZiBwYWNrYWdlICcke3BhY2thZ2VOYW1lfScgKipcXG5gKSk7XG4gICAgY29uc3Qgc2NoZW1hdGljID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZVNjaGVtYXRpYyhuYW1lLCBjb2xsZWN0aW9uKTtcblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyh3b3JrZmxvdywgW3NjaGVtYXRpYy5kZXNjcmlwdGlvbl0sIHBhY2thZ2VOYW1lLCBjb21taXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIG1pZ3JhdGlvbnMgd2VyZSBwZXJmb3JtZWQgc3VjY2Vzc2Z1bGx5LlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlTWlncmF0aW9ucyhcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgY29sbGVjdGlvblBhdGg6IHN0cmluZyxcbiAgICBmcm9tOiBzdHJpbmcsXG4gICAgdG86IHN0cmluZyxcbiAgICBjb21taXQ/OiBib29sZWFuLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uUGF0aCk7XG4gICAgY29uc3QgbWlncmF0aW9uUmFuZ2UgPSBuZXcgc2VtdmVyLlJhbmdlKFxuICAgICAgJz4nICsgKHNlbXZlci5wcmVyZWxlYXNlKGZyb20pID8gZnJvbS5zcGxpdCgnLScpWzBdICsgJy0wJyA6IGZyb20pICsgJyA8PScgKyB0by5zcGxpdCgnLScpWzBdLFxuICAgICk7XG4gICAgY29uc3QgbWlncmF0aW9ucyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKCkpIHtcbiAgICAgIGNvbnN0IHNjaGVtYXRpYyA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVTY2hlbWF0aWMobmFtZSwgY29sbGVjdGlvbik7XG4gICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IHNjaGVtYXRpYy5kZXNjcmlwdGlvbiBhcyB0eXBlb2Ygc2NoZW1hdGljLmRlc2NyaXB0aW9uICYge1xuICAgICAgICB2ZXJzaW9uPzogc3RyaW5nO1xuICAgICAgfTtcbiAgICAgIGRlc2NyaXB0aW9uLnZlcnNpb24gPSBjb2VyY2VWZXJzaW9uTnVtYmVyKGRlc2NyaXB0aW9uLnZlcnNpb24pO1xuICAgICAgaWYgKCFkZXNjcmlwdGlvbi52ZXJzaW9uKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2VtdmVyLnNhdGlzZmllcyhkZXNjcmlwdGlvbi52ZXJzaW9uLCBtaWdyYXRpb25SYW5nZSwgeyBpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZSB9KSkge1xuICAgICAgICBtaWdyYXRpb25zLnB1c2goZGVzY3JpcHRpb24gYXMgdHlwZW9mIHNjaGVtYXRpYy5kZXNjcmlwdGlvbiAmIHsgdmVyc2lvbjogc3RyaW5nIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtaWdyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgbWlncmF0aW9ucy5zb3J0KChhLCBiKSA9PiBzZW12ZXIuY29tcGFyZShhLnZlcnNpb24sIGIudmVyc2lvbikgfHwgYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKSk7XG5cbiAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmluZm8oXG4gICAgICBjb2xvcnMuY3lhbihgKiogRXhlY3V0aW5nIG1pZ3JhdGlvbnMgb2YgcGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nICoqXFxuYCksXG4gICAgKTtcblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyh3b3JrZmxvdywgbWlncmF0aW9ucywgcGFja2FnZU5hbWUsIGNvbW1pdCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyhcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIG1pZ3JhdGlvbnM6IEl0ZXJhYmxlPHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbjogc3RyaW5nOyBjb2xsZWN0aW9uOiB7IG5hbWU6IHN0cmluZyB9IH0+LFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgY29tbWl0ID0gZmFsc2UsXG4gICk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBmb3IgKGNvbnN0IG1pZ3JhdGlvbiBvZiBtaWdyYXRpb25zKSB7XG4gICAgICBjb25zdCBbdGl0bGUsIC4uLmRlc2NyaXB0aW9uXSA9IG1pZ3JhdGlvbi5kZXNjcmlwdGlvbi5zcGxpdCgnLiAnKTtcblxuICAgICAgbG9nZ2VyLmluZm8oXG4gICAgICAgIGNvbG9ycy5jeWFuKGNvbG9ycy5zeW1ib2xzLnBvaW50ZXIpICtcbiAgICAgICAgICAnICcgK1xuICAgICAgICAgIGNvbG9ycy5ib2xkKHRpdGxlLmVuZHNXaXRoKCcuJykgPyB0aXRsZSA6IHRpdGxlICsgJy4nKSxcbiAgICAgICk7XG5cbiAgICAgIGlmIChkZXNjcmlwdGlvbi5sZW5ndGgpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJyAgJyArIGRlc2NyaXB0aW9uLmpvaW4oJy5cXG4gICcpKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlU2NoZW1hdGljKFxuICAgICAgICB3b3JrZmxvdyxcbiAgICAgICAgbWlncmF0aW9uLmNvbGxlY3Rpb24ubmFtZSxcbiAgICAgICAgbWlncmF0aW9uLm5hbWUsXG4gICAgICApO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgbG9nZ2VyLmluZm8oJyAgTWlncmF0aW9uIGNvbXBsZXRlZC4nKTtcblxuICAgICAgLy8gQ29tbWl0IG1pZ3JhdGlvblxuICAgICAgaWYgKGNvbW1pdCkge1xuICAgICAgICBjb25zdCBjb21taXRQcmVmaXggPSBgJHtwYWNrYWdlTmFtZX0gbWlncmF0aW9uIC0gJHttaWdyYXRpb24ubmFtZX1gO1xuICAgICAgICBjb25zdCBjb21taXRNZXNzYWdlID0gbWlncmF0aW9uLmRlc2NyaXB0aW9uXG4gICAgICAgICAgPyBgJHtjb21taXRQcmVmaXh9XFxuXFxuJHttaWdyYXRpb24uZGVzY3JpcHRpb259YFxuICAgICAgICAgIDogY29tbWl0UHJlZml4O1xuICAgICAgICBjb25zdCBjb21taXR0ZWQgPSB0aGlzLmNvbW1pdChjb21taXRNZXNzYWdlKTtcbiAgICAgICAgaWYgKCFjb21taXR0ZWQpIHtcbiAgICAgICAgICAvLyBGYWlsZWQgdG8gY29tbWl0LCBzb21ldGhpbmcgd2VudCB3cm9uZy4gQWJvcnQgdGhlIHVwZGF0ZS5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBsb2dnZXIuaW5mbygnJyk7IC8vIEV4dHJhIHRyYWlsaW5nIG5ld2xpbmUuXG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG1pZ3JhdGVPbmx5KFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICByb290RGVwZW5kZW5jaWVzOiBNYXA8c3RyaW5nLCBQYWNrYWdlVHJlZU5vZGU+LFxuICAgIG9wdGlvbnM6IE9wdGlvbnM8VXBkYXRlQ29tbWFuZEFyZ3M+LFxuICApOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHBhY2thZ2VEZXBlbmRlbmN5ID0gcm9vdERlcGVuZGVuY2llcy5nZXQocGFja2FnZU5hbWUpO1xuICAgIGxldCBwYWNrYWdlUGF0aCA9IHBhY2thZ2VEZXBlbmRlbmN5Py5wYXRoO1xuICAgIGxldCBwYWNrYWdlTm9kZSA9IHBhY2thZ2VEZXBlbmRlbmN5Py5wYWNrYWdlO1xuICAgIGlmIChwYWNrYWdlRGVwZW5kZW5jeSAmJiAhcGFja2FnZU5vZGUpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBmb3VuZCBpbiBwYWNrYWdlLmpzb24gYnV0IGlzIG5vdCBpbnN0YWxsZWQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAoIXBhY2thZ2VEZXBlbmRlbmN5KSB7XG4gICAgICAvLyBBbGxvdyBydW5uaW5nIG1pZ3JhdGlvbnMgb24gdHJhbnNpdGl2ZWx5IGluc3RhbGxlZCBkZXBlbmRlbmNpZXNcbiAgICAgIC8vIFRoZXJlIGNhbiB0ZWNobmljYWxseSBiZSBuZXN0ZWQgbXVsdGlwbGUgdmVyc2lvbnNcbiAgICAgIC8vIFRPRE86IElmIG11bHRpcGxlLCB0aGlzIHNob3VsZCBmaW5kIGFsbCB2ZXJzaW9ucyBhbmQgYXNrIHdoaWNoIG9uZSB0byB1c2VcbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gZmluZFBhY2thZ2VKc29uKHRoaXMuY29udGV4dC5yb290LCBwYWNrYWdlTmFtZSk7XG4gICAgICBpZiAocGFja2FnZUpzb24pIHtcbiAgICAgICAgcGFja2FnZVBhdGggPSBwYXRoLmRpcm5hbWUocGFja2FnZUpzb24pO1xuICAgICAgICBwYWNrYWdlTm9kZSA9IGF3YWl0IHJlYWRQYWNrYWdlSnNvbihwYWNrYWdlSnNvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwYWNrYWdlTm9kZSB8fCAhcGFja2FnZVBhdGgpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBpcyBub3QgaW5zdGFsbGVkLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBjb25zdCB1cGRhdGVNZXRhZGF0YSA9IHBhY2thZ2VOb2RlWyduZy11cGRhdGUnXTtcbiAgICBsZXQgbWlncmF0aW9ucyA9IHVwZGF0ZU1ldGFkYXRhPy5taWdyYXRpb25zO1xuICAgIGlmIChtaWdyYXRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBkb2VzIG5vdCBwcm92aWRlIG1pZ3JhdGlvbnMuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1pZ3JhdGlvbnMgIT09ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1BhY2thZ2UgY29udGFpbnMgYSBtYWxmb3JtZWQgbWlncmF0aW9ucyBmaWVsZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmIChwYXRoLnBvc2l4LmlzQWJzb2x1dGUobWlncmF0aW9ucykgfHwgcGF0aC53aW4zMi5pc0Fic29sdXRlKG1pZ3JhdGlvbnMpKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICdQYWNrYWdlIGNvbnRhaW5zIGFuIGludmFsaWQgbWlncmF0aW9ucyBmaWVsZC4gQWJzb2x1dGUgcGF0aHMgYXJlIG5vdCBwZXJtaXR0ZWQuJyxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIC8vIE5vcm1hbGl6ZSBzbGFzaGVzXG4gICAgbWlncmF0aW9ucyA9IG1pZ3JhdGlvbnMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gICAgaWYgKG1pZ3JhdGlvbnMuc3RhcnRzV2l0aCgnLi4vJykpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgJ1BhY2thZ2UgY29udGFpbnMgYW4gaW52YWxpZCBtaWdyYXRpb25zIGZpZWxkLiBQYXRocyBvdXRzaWRlIHRoZSBwYWNrYWdlIHJvb3QgYXJlIG5vdCBwZXJtaXR0ZWQuJyxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIGl0IGlzIGEgcGFja2FnZS1sb2NhbCBsb2NhdGlvblxuICAgIGNvbnN0IGxvY2FsTWlncmF0aW9ucyA9IHBhdGguam9pbihwYWNrYWdlUGF0aCwgbWlncmF0aW9ucyk7XG4gICAgaWYgKGV4aXN0c1N5bmMobG9jYWxNaWdyYXRpb25zKSkge1xuICAgICAgbWlncmF0aW9ucyA9IGxvY2FsTWlncmF0aW9ucztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVHJ5IHRvIHJlc29sdmUgZnJvbSBwYWNrYWdlIGxvY2F0aW9uLlxuICAgICAgLy8gVGhpcyBhdm9pZHMgaXNzdWVzIHdpdGggcGFja2FnZSBob2lzdGluZy5cbiAgICAgIHRyeSB7XG4gICAgICAgIG1pZ3JhdGlvbnMgPSByZXF1aXJlLnJlc29sdmUobWlncmF0aW9ucywgeyBwYXRoczogW3BhY2thZ2VQYXRoXSB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKCdNaWdyYXRpb25zIGZvciBwYWNrYWdlIHdlcmUgbm90IGZvdW5kLicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcihgVW5hYmxlIHRvIHJlc29sdmUgbWlncmF0aW9ucyBmb3IgcGFja2FnZS4gIFske2UubWVzc2FnZX1dYCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5uYW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5leGVjdXRlTWlncmF0aW9uKFxuICAgICAgICB3b3JrZmxvdyxcbiAgICAgICAgcGFja2FnZU5hbWUsXG4gICAgICAgIG1pZ3JhdGlvbnMsXG4gICAgICAgIG9wdGlvbnMubmFtZSxcbiAgICAgICAgb3B0aW9ucy5jcmVhdGVDb21taXRzLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCBmcm9tID0gY29lcmNlVmVyc2lvbk51bWJlcihvcHRpb25zLmZyb20pO1xuICAgIGlmICghZnJvbSkge1xuICAgICAgbG9nZ2VyLmVycm9yKGBcImZyb21cIiB2YWx1ZSBbJHtvcHRpb25zLmZyb219XSBpcyBub3QgYSB2YWxpZCB2ZXJzaW9uLmApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5leGVjdXRlTWlncmF0aW9ucyhcbiAgICAgIHdvcmtmbG93LFxuICAgICAgcGFja2FnZU5hbWUsXG4gICAgICBtaWdyYXRpb25zLFxuICAgICAgZnJvbSxcbiAgICAgIG9wdGlvbnMudG8gfHwgcGFja2FnZU5vZGUudmVyc2lvbixcbiAgICAgIG9wdGlvbnMuY3JlYXRlQ29tbWl0cyxcbiAgICApO1xuICB9XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lcy1wZXItZnVuY3Rpb25cbiAgcHJpdmF0ZSBhc3luYyB1cGRhdGVQYWNrYWdlc0FuZE1pZ3JhdGUoXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICByb290RGVwZW5kZW5jaWVzOiBNYXA8c3RyaW5nLCBQYWNrYWdlVHJlZU5vZGU+LFxuICAgIG9wdGlvbnM6IE9wdGlvbnM8VXBkYXRlQ29tbWFuZEFyZ3M+LFxuICAgIHBhY2thZ2VzOiBQYWNrYWdlSWRlbnRpZmllcltdLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICBjb25zdCBsb2dWZXJib3NlID0gKG1lc3NhZ2U6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICBsb2dnZXIuaW5mbyhtZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgcmVxdWVzdHM6IHtcbiAgICAgIGlkZW50aWZpZXI6IFBhY2thZ2VJZGVudGlmaWVyO1xuICAgICAgbm9kZTogUGFja2FnZVRyZWVOb2RlO1xuICAgIH1bXSA9IFtdO1xuXG4gICAgLy8gVmFsaWRhdGUgcGFja2FnZXMgYWN0dWFsbHkgYXJlIHBhcnQgb2YgdGhlIHdvcmtzcGFjZVxuICAgIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzKSB7XG4gICAgICBjb25zdCBub2RlID0gcm9vdERlcGVuZGVuY2llcy5nZXQocGtnLm5hbWUpO1xuICAgICAgaWYgKCFub2RlPy5wYWNrYWdlKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgUGFja2FnZSAnJHtwa2cubmFtZX0nIGlzIG5vdCBhIGRlcGVuZGVuY3kuYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIGEgc3BlY2lmaWMgdmVyc2lvbiBpcyByZXF1ZXN0ZWQgYW5kIG1hdGNoZXMgdGhlIGluc3RhbGxlZCB2ZXJzaW9uLCBza2lwLlxuICAgICAgaWYgKHBrZy50eXBlID09PSAndmVyc2lvbicgJiYgbm9kZS5wYWNrYWdlLnZlcnNpb24gPT09IHBrZy5mZXRjaFNwZWMpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFBhY2thZ2UgJyR7cGtnLm5hbWV9JyBpcyBhbHJlYWR5IGF0ICcke3BrZy5mZXRjaFNwZWN9Jy5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHJlcXVlc3RzLnB1c2goeyBpZGVudGlmaWVyOiBwa2csIG5vZGUgfSk7XG4gICAgfVxuXG4gICAgaWYgKHJlcXVlc3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oJ0ZldGNoaW5nIGRlcGVuZGVuY3kgbWV0YWRhdGEgZnJvbSByZWdpc3RyeS4uLicpO1xuXG4gICAgY29uc3QgcGFja2FnZXNUb1VwZGF0ZTogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHsgaWRlbnRpZmllcjogcmVxdWVzdElkZW50aWZpZXIsIG5vZGUgfSBvZiByZXF1ZXN0cykge1xuICAgICAgY29uc3QgcGFja2FnZU5hbWUgPSByZXF1ZXN0SWRlbnRpZmllci5uYW1lO1xuXG4gICAgICBsZXQgbWV0YWRhdGE7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBNZXRhZGF0YSByZXF1ZXN0cyBhcmUgaW50ZXJuYWxseSBjYWNoZWQ7IG11bHRpcGxlIHJlcXVlc3RzIGZvciBzYW1lIG5hbWVcbiAgICAgICAgLy8gZG9lcyBub3QgcmVzdWx0IGluIGFkZGl0aW9uYWwgbmV0d29yayB0cmFmZmljXG4gICAgICAgIG1ldGFkYXRhID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWV0YWRhdGEocGFja2FnZU5hbWUsIGxvZ2dlciwge1xuICAgICAgICAgIHZlcmJvc2U6IG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3IgZmV0Y2hpbmcgbWV0YWRhdGEgZm9yICcke3BhY2thZ2VOYW1lfSc6IGAgKyBlLm1lc3NhZ2UpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICAvLyBUcnkgdG8gZmluZCBhIHBhY2thZ2UgdmVyc2lvbiBiYXNlZCBvbiB0aGUgdXNlciByZXF1ZXN0ZWQgcGFja2FnZSBzcGVjaWZpZXJcbiAgICAgIC8vIHJlZ2lzdHJ5IHNwZWNpZmllciB0eXBlcyBhcmUgZWl0aGVyIHZlcnNpb24sIHJhbmdlLCBvciB0YWdcbiAgICAgIGxldCBtYW5pZmVzdDogUGFja2FnZU1hbmlmZXN0IHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKFxuICAgICAgICByZXF1ZXN0SWRlbnRpZmllci50eXBlID09PSAndmVyc2lvbicgfHxcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3JhbmdlJyB8fFxuICAgICAgICByZXF1ZXN0SWRlbnRpZmllci50eXBlID09PSAndGFnJ1xuICAgICAgKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbWFuaWZlc3QgPSBwaWNrTWFuaWZlc3QobWV0YWRhdGEsIHJlcXVlc3RJZGVudGlmaWVyLmZldGNoU3BlYyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlID09PSAnRVRBUkdFVCcpIHtcbiAgICAgICAgICAgIC8vIElmIG5vdCBmb3VuZCBhbmQgbmV4dCB3YXMgdXNlZCBhbmQgdXNlciBkaWQgbm90IHByb3ZpZGUgYSBzcGVjaWZpZXIsIHRyeSBsYXRlc3QuXG4gICAgICAgICAgICAvLyBQYWNrYWdlIG1heSBub3QgaGF2ZSBhIG5leHQgdGFnLlxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICByZXF1ZXN0SWRlbnRpZmllci50eXBlID09PSAndGFnJyAmJlxuICAgICAgICAgICAgICByZXF1ZXN0SWRlbnRpZmllci5mZXRjaFNwZWMgPT09ICduZXh0JyAmJlxuICAgICAgICAgICAgICAhcmVxdWVzdElkZW50aWZpZXIucmF3U3BlY1xuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbWFuaWZlc3QgPSBwaWNrTWFuaWZlc3QobWV0YWRhdGEsICdsYXRlc3QnKTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLmNvZGUgIT09ICdFVEFSR0VUJyAmJiBlLmNvZGUgIT09ICdFTk9WRVJTSU9OUycpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChlLmNvZGUgIT09ICdFTk9WRVJTSU9OUycpIHtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICghbWFuaWZlc3QpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgIGBQYWNrYWdlIHNwZWNpZmllZCBieSAnJHtyZXF1ZXN0SWRlbnRpZmllci5yYXd9JyBkb2VzIG5vdCBleGlzdCB3aXRoaW4gdGhlIHJlZ2lzdHJ5LmAsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIGlmIChtYW5pZmVzdC52ZXJzaW9uID09PSBub2RlLnBhY2thZ2U/LnZlcnNpb24pIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFBhY2thZ2UgJyR7cGFja2FnZU5hbWV9JyBpcyBhbHJlYWR5IHVwIHRvIGRhdGUuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZS5wYWNrYWdlICYmIEFOR1VMQVJfUEFDS0FHRVNfUkVHRVhQLnRlc3Qobm9kZS5wYWNrYWdlLm5hbWUpKSB7XG4gICAgICAgIGNvbnN0IHsgbmFtZSwgdmVyc2lvbiB9ID0gbm9kZS5wYWNrYWdlO1xuICAgICAgICBjb25zdCB0b0JlSW5zdGFsbGVkTWFqb3JWZXJzaW9uID0gK21hbmlmZXN0LnZlcnNpb24uc3BsaXQoJy4nKVswXTtcbiAgICAgICAgY29uc3QgY3VycmVudE1ham9yVmVyc2lvbiA9ICt2ZXJzaW9uLnNwbGl0KCcuJylbMF07XG5cbiAgICAgICAgaWYgKHRvQmVJbnN0YWxsZWRNYWpvclZlcnNpb24gLSBjdXJyZW50TWFqb3JWZXJzaW9uID4gMSkge1xuICAgICAgICAgIC8vIE9ubHkgYWxsb3cgdXBkYXRpbmcgYSBzaW5nbGUgdmVyc2lvbiBhdCBhIHRpbWUuXG4gICAgICAgICAgaWYgKGN1cnJlbnRNYWpvclZlcnNpb24gPCA2KSB7XG4gICAgICAgICAgICAvLyBCZWZvcmUgdmVyc2lvbiA2LCB0aGUgbWFqb3IgdmVyc2lvbnMgd2VyZSBub3QgYWx3YXlzIHNlcXVlbnRpYWwuXG4gICAgICAgICAgICAvLyBFeGFtcGxlIEBhbmd1bGFyL2NvcmUgc2tpcHBlZCB2ZXJzaW9uIDMsIEBhbmd1bGFyL2NsaSBza2lwcGVkIHZlcnNpb25zIDItNS5cbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgYFVwZGF0aW5nIG11bHRpcGxlIG1ham9yIHZlcnNpb25zIG9mICcke25hbWV9JyBhdCBvbmNlIGlzIG5vdCBzdXBwb3J0ZWQuIFBsZWFzZSBtaWdyYXRlIGVhY2ggbWFqb3IgdmVyc2lvbiBpbmRpdmlkdWFsbHkuXFxuYCArXG4gICAgICAgICAgICAgICAgYEZvciBtb3JlIGluZm9ybWF0aW9uIGFib3V0IHRoZSB1cGRhdGUgcHJvY2Vzcywgc2VlIGh0dHBzOi8vdXBkYXRlLmFuZ3VsYXIuaW8vLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBuZXh0TWFqb3JWZXJzaW9uRnJvbUN1cnJlbnQgPSBjdXJyZW50TWFqb3JWZXJzaW9uICsgMTtcblxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVXBkYXRpbmcgbXVsdGlwbGUgbWFqb3IgdmVyc2lvbnMgb2YgJyR7bmFtZX0nIGF0IG9uY2UgaXMgbm90IHN1cHBvcnRlZC4gUGxlYXNlIG1pZ3JhdGUgZWFjaCBtYWpvciB2ZXJzaW9uIGluZGl2aWR1YWxseS5cXG5gICtcbiAgICAgICAgICAgICAgICBgUnVuICduZyB1cGRhdGUgJHtuYW1lfUAke25leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudH0nIGluIHlvdXIgd29ya3NwYWNlIGRpcmVjdG9yeSBgICtcbiAgICAgICAgICAgICAgICBgdG8gdXBkYXRlIHRvIGxhdGVzdCAnJHtuZXh0TWFqb3JWZXJzaW9uRnJvbUN1cnJlbnR9LngnIHZlcnNpb24gb2YgJyR7bmFtZX0nLlxcblxcbmAgK1xuICAgICAgICAgICAgICAgIGBGb3IgbW9yZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdXBkYXRlIHByb2Nlc3MsIHNlZSBodHRwczovL3VwZGF0ZS5hbmd1bGFyLmlvLz92PSR7Y3VycmVudE1ham9yVmVyc2lvbn0uMC0ke25leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudH0uMGAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHBhY2thZ2VzVG9VcGRhdGUucHVzaChyZXF1ZXN0SWRlbnRpZmllci50b1N0cmluZygpKTtcbiAgICB9XG5cbiAgICBpZiAocGFja2FnZXNUb1VwZGF0ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGNvbnN0IHsgc3VjY2VzcyB9ID0gYXdhaXQgdGhpcy5leGVjdXRlU2NoZW1hdGljKFxuICAgICAgd29ya2Zsb3csXG4gICAgICBVUERBVEVfU0NIRU1BVElDX0NPTExFQ1RJT04sXG4gICAgICAndXBkYXRlJyxcbiAgICAgIHtcbiAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICAgICAgbmV4dDogb3B0aW9ucy5uZXh0LFxuICAgICAgICBwYWNrYWdlTWFuYWdlcjogdGhpcy5jb250ZXh0LnBhY2thZ2VNYW5hZ2VyLm5hbWUsXG4gICAgICAgIHBhY2thZ2VzOiBwYWNrYWdlc1RvVXBkYXRlLFxuICAgICAgfSxcbiAgICApO1xuXG4gICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZzLnJtKHBhdGguam9pbih0aGlzLmNvbnRleHQucm9vdCwgJ25vZGVfbW9kdWxlcycpLCB7XG4gICAgICAgICAgZm9yY2U6IHRydWUsXG4gICAgICAgICAgcmVjdXJzaXZlOiB0cnVlLFxuICAgICAgICAgIG1heFJldHJpZXM6IDMsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCB7fVxuXG4gICAgICBsZXQgZm9yY2VJbnN0YWxsID0gZmFsc2U7XG4gICAgICAvLyBucG0gNysgY2FuIGZhaWwgZHVlIHRvIGl0IGluY29ycmVjdGx5IHJlc29sdmluZyBwZWVyIGRlcGVuZGVuY2llcyB0aGF0IGhhdmUgdmFsaWQgU2VtVmVyXG4gICAgICAvLyByYW5nZXMgZHVyaW5nIGFuIHVwZGF0ZS4gVXBkYXRlIHdpbGwgc2V0IGNvcnJlY3QgdmVyc2lvbnMgb2YgZGVwZW5kZW5jaWVzIHdpdGhpbiB0aGVcbiAgICAgIC8vIHBhY2thZ2UuanNvbiBmaWxlLiBUaGUgZm9yY2Ugb3B0aW9uIGlzIHNldCB0byB3b3JrYXJvdW5kIHRoZXNlIGVycm9ycy5cbiAgICAgIC8vIEV4YW1wbGUgZXJyb3I6XG4gICAgICAvLyBucG0gRVJSISBDb25mbGljdGluZyBwZWVyIGRlcGVuZGVuY3k6IEBhbmd1bGFyL2NvbXBpbGVyLWNsaUAxNC4wLjAtcmMuMFxuICAgICAgLy8gbnBtIEVSUiEgbm9kZV9tb2R1bGVzL0Bhbmd1bGFyL2NvbXBpbGVyLWNsaVxuICAgICAgLy8gbnBtIEVSUiEgICBwZWVyIEBhbmd1bGFyL2NvbXBpbGVyLWNsaUBcIl4xNC4wLjAgfHwgXjE0LjAuMC1yY1wiIGZyb20gQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXJAMTQuMC4wLXJjLjBcbiAgICAgIC8vIG5wbSBFUlIhICAgbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyXG4gICAgICAvLyBucG0gRVJSISAgICAgZGV2IEBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyQFwifjE0LjAuMC1yYy4wXCIgZnJvbSB0aGUgcm9vdCBwcm9qZWN0XG4gICAgICBpZiAoXG4gICAgICAgIHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci5uYW1lID09PSBQYWNrYWdlTWFuYWdlci5OcG0gJiZcbiAgICAgICAgdGhpcy5jb250ZXh0LnBhY2thZ2VNYW5hZ2VyLnZlcnNpb24gJiZcbiAgICAgICAgc2VtdmVyLmd0ZSh0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIudmVyc2lvbiwgJzcuMC4wJywgeyBpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZSB9KVxuICAgICAgKSB7XG4gICAgICAgIGxvZ1ZlcmJvc2UoJ05QTSA3KyBkZXRlY3RlZCAtLSBlbmFibGluZyBmb3JjZSBvcHRpb24gZm9yIHBhY2thZ2UgaW5zdGFsbGF0aW9uJyk7XG4gICAgICAgIGZvcmNlSW5zdGFsbCA9IHRydWU7XG4gICAgICB9XG4gICAgICBjb25zdCBpbnN0YWxsYXRpb25TdWNjZXNzID0gYXdhaXQgdGhpcy5jb250ZXh0LnBhY2thZ2VNYW5hZ2VyLmluc3RhbGxBbGwoXG4gICAgICAgIGZvcmNlSW5zdGFsbCA/IFsnLS1mb3JjZSddIDogW10sXG4gICAgICAgIHRoaXMuY29udGV4dC5yb290LFxuICAgICAgKTtcblxuICAgICAgaWYgKCFpbnN0YWxsYXRpb25TdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdWNjZXNzICYmIG9wdGlvbnMuY3JlYXRlQ29tbWl0cykge1xuICAgICAgaWYgKCF0aGlzLmNvbW1pdChgQW5ndWxhciBDTEkgdXBkYXRlIGZvciBwYWNrYWdlcyAtICR7cGFja2FnZXNUb1VwZGF0ZS5qb2luKCcsICcpfWApKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoaXMgaXMgYSB0ZW1wb3Jhcnkgd29ya2Fyb3VuZCB0byBhbGxvdyBkYXRhIHRvIGJlIHBhc3NlZCBiYWNrIGZyb20gdGhlIHVwZGF0ZSBzY2hlbWF0aWNcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IG1pZ3JhdGlvbnMgPSAoZ2xvYmFsIGFzIGFueSkuZXh0ZXJuYWxNaWdyYXRpb25zIGFzIHtcbiAgICAgIHBhY2thZ2U6IHN0cmluZztcbiAgICAgIGNvbGxlY3Rpb246IHN0cmluZztcbiAgICAgIGZyb206IHN0cmluZztcbiAgICAgIHRvOiBzdHJpbmc7XG4gICAgfVtdO1xuXG4gICAgaWYgKHN1Y2Nlc3MgJiYgbWlncmF0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBtaWdyYXRpb24gb2YgbWlncmF0aW9ucykge1xuICAgICAgICAvLyBSZXNvbHZlIHRoZSBwYWNrYWdlIGZyb20gdGhlIHdvcmtzcGFjZSByb290LCBhcyBvdGhlcndpc2UgaXQgd2lsbCBiZSByZXNvbHZlZCBmcm9tIHRoZSB0ZW1wXG4gICAgICAgIC8vIGluc3RhbGxlZCBDTEkgdmVyc2lvbi5cbiAgICAgICAgbGV0IHBhY2thZ2VQYXRoO1xuICAgICAgICBsb2dWZXJib3NlKFxuICAgICAgICAgIGBSZXNvbHZpbmcgbWlncmF0aW9uIHBhY2thZ2UgJyR7bWlncmF0aW9uLnBhY2thZ2V9JyBmcm9tICcke3RoaXMuY29udGV4dC5yb290fScuLi5gLFxuICAgICAgICApO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwYWNrYWdlUGF0aCA9IHBhdGguZGlybmFtZShcbiAgICAgICAgICAgICAgLy8gVGhpcyBtYXkgZmFpbCBpZiB0aGUgYHBhY2thZ2UuanNvbmAgaXMgbm90IGV4cG9ydGVkIGFzIGFuIGVudHJ5IHBvaW50XG4gICAgICAgICAgICAgIHJlcXVpcmUucmVzb2x2ZShwYXRoLmpvaW4obWlncmF0aW9uLnBhY2thZ2UsICdwYWNrYWdlLmpzb24nKSwge1xuICAgICAgICAgICAgICAgIHBhdGhzOiBbdGhpcy5jb250ZXh0LnJvb3RdLFxuICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRyeWluZyB0byByZXNvbHZlIHRoZSBwYWNrYWdlJ3MgbWFpbiBlbnRyeSBwb2ludFxuICAgICAgICAgICAgICBwYWNrYWdlUGF0aCA9IHJlcXVpcmUucmVzb2x2ZShtaWdyYXRpb24ucGFja2FnZSwgeyBwYXRoczogW3RoaXMuY29udGV4dC5yb290XSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICBsb2dWZXJib3NlKGUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBNaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkgd2VyZSBub3QgZm91bmQuYCArXG4gICAgICAgICAgICAgICAgJyBUaGUgcGFja2FnZSBjb3VsZCBub3QgYmUgZm91bmQgaW4gdGhlIHdvcmtzcGFjZS4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVW5hYmxlIHRvIHJlc29sdmUgbWlncmF0aW9ucyBmb3IgcGFja2FnZSAoJHttaWdyYXRpb24ucGFja2FnZX0pLiAgWyR7ZS5tZXNzYWdlfV1gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBtaWdyYXRpb25zO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0IGlzIGEgcGFja2FnZS1sb2NhbCBsb2NhdGlvblxuICAgICAgICBjb25zdCBsb2NhbE1pZ3JhdGlvbnMgPSBwYXRoLmpvaW4ocGFja2FnZVBhdGgsIG1pZ3JhdGlvbi5jb2xsZWN0aW9uKTtcbiAgICAgICAgaWYgKGV4aXN0c1N5bmMobG9jYWxNaWdyYXRpb25zKSkge1xuICAgICAgICAgIG1pZ3JhdGlvbnMgPSBsb2NhbE1pZ3JhdGlvbnM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVHJ5IHRvIHJlc29sdmUgZnJvbSBwYWNrYWdlIGxvY2F0aW9uLlxuICAgICAgICAgIC8vIFRoaXMgYXZvaWRzIGlzc3VlcyB3aXRoIHBhY2thZ2UgaG9pc3RpbmcuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG1pZ3JhdGlvbnMgPSByZXF1aXJlLnJlc29sdmUobWlncmF0aW9uLmNvbGxlY3Rpb24sIHsgcGF0aHM6IFtwYWNrYWdlUGF0aF0gfSk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgTWlncmF0aW9ucyBmb3IgcGFja2FnZSAoJHttaWdyYXRpb24ucGFja2FnZX0pIHdlcmUgbm90IGZvdW5kLmApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICAgIGBVbmFibGUgdG8gcmVzb2x2ZSBtaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkuICBbJHtlLm1lc3NhZ2V9XWAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVNaWdyYXRpb25zKFxuICAgICAgICAgIHdvcmtmbG93LFxuICAgICAgICAgIG1pZ3JhdGlvbi5wYWNrYWdlLFxuICAgICAgICAgIG1pZ3JhdGlvbnMsXG4gICAgICAgICAgbWlncmF0aW9uLmZyb20sXG4gICAgICAgICAgbWlncmF0aW9uLnRvLFxuICAgICAgICAgIG9wdGlvbnMuY3JlYXRlQ29tbWl0cyxcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBBIG5vbi16ZXJvIHZhbHVlIGlzIGEgZmFpbHVyZSBmb3IgdGhlIHBhY2thZ2UncyBtaWdyYXRpb25zXG4gICAgICAgIGlmIChyZXN1bHQgIT09IDApIHtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1Y2Nlc3MgPyAwIDogMTtcbiAgfVxuICAvKipcbiAgICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgY29tbWl0IHdhcyBzdWNjZXNzZnVsLlxuICAgKi9cbiAgcHJpdmF0ZSBjb21taXQobWVzc2FnZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcblxuICAgIC8vIENoZWNrIGlmIGEgY29tbWl0IGlzIG5lZWRlZC5cbiAgICBsZXQgY29tbWl0TmVlZGVkOiBib29sZWFuO1xuICAgIHRyeSB7XG4gICAgICBjb21taXROZWVkZWQgPSBoYXNDaGFuZ2VzVG9Db21taXQoKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgICBGYWlsZWQgdG8gcmVhZCBHaXQgdHJlZTpcXG4ke2Vyci5zdGRlcnJ9YCk7XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWNvbW1pdE5lZWRlZCkge1xuICAgICAgbG9nZ2VyLmluZm8oJyAgTm8gY2hhbmdlcyB0byBjb21taXQgYWZ0ZXIgbWlncmF0aW9uLicpO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBDb21taXQgY2hhbmdlcyBhbmQgYWJvcnQgb24gZXJyb3IuXG4gICAgdHJ5IHtcbiAgICAgIGNyZWF0ZUNvbW1pdChtZXNzYWdlKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGNvbW1pdCB1cGRhdGUgKCR7bWVzc2FnZX0pOlxcbiR7ZXJyLnN0ZGVycn1gKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE5vdGlmeSB1c2VyIG9mIHRoZSBjb21taXQuXG4gICAgY29uc3QgaGFzaCA9IGZpbmRDdXJyZW50R2l0U2hhKCk7XG4gICAgY29uc3Qgc2hvcnRNZXNzYWdlID0gbWVzc2FnZS5zcGxpdCgnXFxuJylbMF07XG4gICAgaWYgKGhhc2gpIHtcbiAgICAgIGxvZ2dlci5pbmZvKGAgIENvbW1pdHRlZCBtaWdyYXRpb24gc3RlcCAoJHtnZXRTaG9ydEhhc2goaGFzaCl9KTogJHtzaG9ydE1lc3NhZ2V9LmApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDb21taXQgd2FzIHN1Y2Nlc3NmdWwsIGJ1dCByZWFkaW5nIHRoZSBoYXNoIHdhcyBub3QuIFNvbWV0aGluZyB3ZWlyZCBoYXBwZW5lZCxcbiAgICAgIC8vIGJ1dCBub3RoaW5nIHRoYXQgd291bGQgc3RvcCB0aGUgdXBkYXRlLiBKdXN0IGxvZyB0aGUgd2VpcmRuZXNzIGFuZCBjb250aW51ZS5cbiAgICAgIGxvZ2dlci5pbmZvKGAgIENvbW1pdHRlZCBtaWdyYXRpb24gc3RlcDogJHtzaG9ydE1lc3NhZ2V9LmApO1xuICAgICAgbG9nZ2VyLndhcm4oJyAgRmFpbGVkIHRvIGxvb2sgdXAgaGFzaCBvZiBtb3N0IHJlY2VudCBjb21taXQsIGNvbnRpbnVpbmcgYW55d2F5cy4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tDbGVhbkdpdCgpOiBib29sZWFuIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdG9wTGV2ZWwgPSBleGVjU3luYygnZ2l0IHJldi1wYXJzZSAtLXNob3ctdG9wbGV2ZWwnLCB7XG4gICAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICAgIHN0ZGlvOiAncGlwZScsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGV4ZWNTeW5jKCdnaXQgc3RhdHVzIC0tcG9yY2VsYWluJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pO1xuICAgICAgaWYgKHJlc3VsdC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IGZpbGVzIGluc2lkZSB0aGUgd29ya3NwYWNlIHJvb3QgYXJlIHJlbGV2YW50XG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHJlc3VsdC5zcGxpdCgnXFxuJykpIHtcbiAgICAgICAgY29uc3QgcmVsYXRpdmVFbnRyeSA9IHBhdGgucmVsYXRpdmUoXG4gICAgICAgICAgcGF0aC5yZXNvbHZlKHRoaXMuY29udGV4dC5yb290KSxcbiAgICAgICAgICBwYXRoLnJlc29sdmUodG9wTGV2ZWwudHJpbSgpLCBlbnRyeS5zbGljZSgzKS50cmltKCkpLFxuICAgICAgICApO1xuXG4gICAgICAgIGlmICghcmVsYXRpdmVFbnRyeS5zdGFydHNXaXRoKCcuLicpICYmICFwYXRoLmlzQWJzb2x1dGUocmVsYXRpdmVFbnRyeSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIHt9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIGN1cnJlbnQgaW5zdGFsbGVkIENMSSB2ZXJzaW9uIGlzIG9sZGVyIG9yIG5ld2VyIHRoYW4gYSBjb21wYXRpYmxlIHZlcnNpb24uXG4gICAqIEByZXR1cm5zIHRoZSB2ZXJzaW9uIHRvIGluc3RhbGwgb3IgbnVsbCB3aGVuIHRoZXJlIGlzIG5vIHVwZGF0ZSB0byBpbnN0YWxsLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBjaGVja0NMSVZlcnNpb24oXG4gICAgcGFja2FnZXNUb1VwZGF0ZTogc3RyaW5nW10gfCB1bmRlZmluZWQsXG4gICAgdmVyYm9zZSA9IGZhbHNlLFxuICAgIG5leHQgPSBmYWxzZSxcbiAgKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgeyB2ZXJzaW9uIH0gPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChcbiAgICAgIGBAYW5ndWxhci9jbGlAJHt0aGlzLmdldENMSVVwZGF0ZVJ1bm5lclZlcnNpb24ocGFja2FnZXNUb1VwZGF0ZSwgbmV4dCl9YCxcbiAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIsXG4gICAgICB7XG4gICAgICAgIHZlcmJvc2UsXG4gICAgICAgIHVzaW5nWWFybjogdGhpcy5jb250ZXh0LnBhY2thZ2VNYW5hZ2VyLm5hbWUgPT09IFBhY2thZ2VNYW5hZ2VyLllhcm4sXG4gICAgICB9LFxuICAgICk7XG5cbiAgICByZXR1cm4gVkVSU0lPTi5mdWxsID09PSB2ZXJzaW9uID8gbnVsbCA6IHZlcnNpb247XG4gIH1cblxuICBwcml2YXRlIGdldENMSVVwZGF0ZVJ1bm5lclZlcnNpb24oXG4gICAgcGFja2FnZXNUb1VwZGF0ZTogc3RyaW5nW10gfCB1bmRlZmluZWQsXG4gICAgbmV4dDogYm9vbGVhbixcbiAgKTogc3RyaW5nIHwgbnVtYmVyIHtcbiAgICBpZiAobmV4dCkge1xuICAgICAgcmV0dXJuICduZXh0JztcbiAgICB9XG5cbiAgICBjb25zdCB1cGRhdGluZ0FuZ3VsYXJQYWNrYWdlID0gcGFja2FnZXNUb1VwZGF0ZT8uZmluZCgocikgPT4gQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAudGVzdChyKSk7XG4gICAgaWYgKHVwZGF0aW5nQW5ndWxhclBhY2thZ2UpIHtcbiAgICAgIC8vIElmIHdlIGFyZSB1cGRhdGluZyBhbnkgQW5ndWxhciBwYWNrYWdlIHdlIGNhbiB1cGRhdGUgdGhlIENMSSB0byB0aGUgdGFyZ2V0IHZlcnNpb24gYmVjYXVzZVxuICAgICAgLy8gbWlncmF0aW9ucyBmb3IgQGFuZ3VsYXIvY29yZUAxMyBjYW4gYmUgZXhlY3V0ZWQgdXNpbmcgQW5ndWxhci9jbGlAMTMuXG4gICAgICAvLyBUaGlzIGlzIHNhbWUgYmVoYXZpb3VyIGFzIGBucHggQGFuZ3VsYXIvY2xpQDEzIHVwZGF0ZSBAYW5ndWxhci9jb3JlQDEzYC5cblxuICAgICAgLy8gYEBhbmd1bGFyL2NsaUAxM2AgLT4gWycnLCAnYW5ndWxhci9jbGknLCAnMTMnXVxuICAgICAgLy8gYEBhbmd1bGFyL2NsaWAgLT4gWycnLCAnYW5ndWxhci9jbGknXVxuICAgICAgY29uc3QgdGVtcFZlcnNpb24gPSBjb2VyY2VWZXJzaW9uTnVtYmVyKHVwZGF0aW5nQW5ndWxhclBhY2thZ2Uuc3BsaXQoJ0AnKVsyXSk7XG5cbiAgICAgIHJldHVybiBzZW12ZXIucGFyc2UodGVtcFZlcnNpb24pPy5tYWpvciA/PyAnbGF0ZXN0JztcbiAgICB9XG5cbiAgICAvLyBXaGVuIG5vdCB1cGRhdGluZyBhbiBBbmd1bGFyIHBhY2thZ2Ugd2UgY2Fubm90IGRldGVybWluZSB3aGljaCBzY2hlbWF0aWMgcnVudGltZSB0aGUgbWlncmF0aW9uIHNob3VsZCB0byBiZSBleGVjdXRlZCBpbi5cbiAgICAvLyBUeXBpY2FsbHksIHdlIGNhbiBhc3N1bWUgdGhhdCB0aGUgYEBhbmd1bGFyL2NsaWAgd2FzIHVwZGF0ZWQgcHJldmlvdXNseS5cbiAgICAvLyBFeGFtcGxlOiBBbmd1bGFyIG9mZmljaWFsIHBhY2thZ2VzIGFyZSB0eXBpY2FsbHkgdXBkYXRlZCBwcmlvciB0byBOR1JYIGV0Yy4uLlxuICAgIC8vIFRoZXJlZm9yZSwgd2Ugb25seSB1cGRhdGUgdG8gdGhlIGxhdGVzdCBwYXRjaCB2ZXJzaW9uIG9mIHRoZSBpbnN0YWxsZWQgbWFqb3IgdmVyc2lvbiBvZiB0aGUgQW5ndWxhciBDTEkuXG5cbiAgICAvLyBUaGlzIGlzIGltcG9ydGFudCBiZWNhdXNlIHdlIG1pZ2h0IGVuZCB1cCBpbiBhIHNjZW5hcmlvIHdoZXJlIGxvY2FsbHkgQW5ndWxhciB2MTIgaXMgaW5zdGFsbGVkLCB1cGRhdGluZyBOR1JYIGZyb20gMTEgdG8gMTIuXG4gICAgLy8gV2UgZW5kIHVwIHVzaW5nIEFuZ3VsYXIgQ2xJIHYxMyB0byBydW4gdGhlIG1pZ3JhdGlvbnMgaWYgd2UgcnVuIHRoZSBtaWdyYXRpb25zIHVzaW5nIHRoZSBDTEkgaW5zdGFsbGVkIG1ham9yIHZlcnNpb24gKyAxIGxvZ2ljLlxuICAgIHJldHVybiBWRVJTSU9OLm1ham9yO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBydW5UZW1wQmluYXJ5KHBhY2thZ2VOYW1lOiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdID0gW10pOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgc3VjY2VzcywgdGVtcE5vZGVNb2R1bGVzIH0gPSBhd2FpdCB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIuaW5zdGFsbFRlbXAocGFja2FnZU5hbWUpO1xuICAgIGlmICghc3VjY2Vzcykge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIHZlcnNpb24vdGFnIGV0Yy4uLiBmcm9tIHBhY2thZ2UgbmFtZVxuICAgIC8vIEV4OiBAYW5ndWxhci9jbGlAbGF0ZXN0IC0+IEBhbmd1bGFyL2NsaVxuICAgIGNvbnN0IHBhY2thZ2VOYW1lTm9WZXJzaW9uID0gcGFja2FnZU5hbWUuc3Vic3RyaW5nKDAsIHBhY2thZ2VOYW1lLmxhc3RJbmRleE9mKCdAJykpO1xuICAgIGNvbnN0IHBrZ0xvY2F0aW9uID0gam9pbih0ZW1wTm9kZU1vZHVsZXMsIHBhY2thZ2VOYW1lTm9WZXJzaW9uKTtcbiAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBqb2luKHBrZ0xvY2F0aW9uLCAncGFja2FnZS5qc29uJyk7XG5cbiAgICAvLyBHZXQgYSBiaW5hcnkgbG9jYXRpb24gZm9yIHRoaXMgcGFja2FnZVxuICAgIGxldCBiaW5QYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGV4aXN0c1N5bmMocGFja2FnZUpzb25QYXRoKSkge1xuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCwgJ3V0Zi04Jyk7XG4gICAgICBpZiAoY29udGVudCkge1xuICAgICAgICBjb25zdCB7IGJpbiA9IHt9IH0gPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICBjb25zdCBiaW5LZXlzID0gT2JqZWN0LmtleXMoYmluKTtcblxuICAgICAgICBpZiAoYmluS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICBiaW5QYXRoID0gcmVzb2x2ZShwa2dMb2NhdGlvbiwgYmluW2JpbktleXNbMF1dKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghYmluUGF0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgbG9jYXRlIGJpbiBmb3IgdGVtcG9yYXJ5IHBhY2thZ2U6ICR7cGFja2FnZU5hbWVOb1ZlcnNpb259LmApO1xuICAgIH1cblxuICAgIGNvbnN0IHsgc3RhdHVzLCBlcnJvciB9ID0gc3Bhd25TeW5jKHByb2Nlc3MuZXhlY1BhdGgsIFtiaW5QYXRoLCAuLi5hcmdzXSwge1xuICAgICAgc3RkaW86ICdpbmhlcml0JyxcbiAgICAgIGVudjoge1xuICAgICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgICAgTkdfRElTQUJMRV9WRVJTSU9OX0NIRUNLOiAndHJ1ZScsXG4gICAgICAgIE5HX0NMSV9BTkFMWVRJQ1M6ICdmYWxzZScsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKHN0YXR1cyA9PT0gbnVsbCAmJiBlcnJvcikge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXR1cyA/PyAwO1xuICB9XG59XG5cbi8qKlxuICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgd29ya2luZyBkaXJlY3RvcnkgaGFzIEdpdCBjaGFuZ2VzIHRvIGNvbW1pdC5cbiAqL1xuZnVuY3Rpb24gaGFzQ2hhbmdlc1RvQ29tbWl0KCk6IGJvb2xlYW4ge1xuICAvLyBMaXN0IGFsbCBtb2RpZmllZCBmaWxlcyBub3QgY292ZXJlZCBieSAuZ2l0aWdub3JlLlxuICAvLyBJZiBhbnkgZmlsZXMgYXJlIHJldHVybmVkLCB0aGVuIHRoZXJlIG11c3QgYmUgc29tZXRoaW5nIHRvIGNvbW1pdC5cblxuICByZXR1cm4gZXhlY1N5bmMoJ2dpdCBscy1maWxlcyAtbSAtZCAtbyAtLWV4Y2x1ZGUtc3RhbmRhcmQnKS50b1N0cmluZygpICE9PSAnJztcbn1cblxuLyoqXG4gKiBQcmVjb25kaXRpb246IE11c3QgaGF2ZSBwZW5kaW5nIGNoYW5nZXMgdG8gY29tbWl0LCB0aGV5IGRvIG5vdCBuZWVkIHRvIGJlIHN0YWdlZC5cbiAqIFBvc3Rjb25kaXRpb246IFRoZSBHaXQgd29ya2luZyB0cmVlIGlzIGNvbW1pdHRlZCBhbmQgdGhlIHJlcG8gaXMgY2xlYW4uXG4gKiBAcGFyYW0gbWVzc2FnZSBUaGUgY29tbWl0IG1lc3NhZ2UgdG8gdXNlLlxuICovXG5mdW5jdGlvbiBjcmVhdGVDb21taXQobWVzc2FnZTogc3RyaW5nKSB7XG4gIC8vIFN0YWdlIGVudGlyZSB3b3JraW5nIHRyZWUgZm9yIGNvbW1pdC5cbiAgZXhlY1N5bmMoJ2dpdCBhZGQgLUEnLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSk7XG5cbiAgLy8gQ29tbWl0IHdpdGggdGhlIG1lc3NhZ2UgcGFzc2VkIHZpYSBzdGRpbiB0byBhdm9pZCBiYXNoIGVzY2FwaW5nIGlzc3Vlcy5cbiAgZXhlY1N5bmMoJ2dpdCBjb21taXQgLS1uby12ZXJpZnkgLUYgLScsIHsgZW5jb2Rpbmc6ICd1dGY4Jywgc3RkaW86ICdwaXBlJywgaW5wdXQ6IG1lc3NhZ2UgfSk7XG59XG5cbi8qKlxuICogQHJldHVybiBUaGUgR2l0IFNIQSBoYXNoIG9mIHRoZSBIRUFEIGNvbW1pdC4gUmV0dXJucyBudWxsIGlmIHVuYWJsZSB0byByZXRyaWV2ZSB0aGUgaGFzaC5cbiAqL1xuZnVuY3Rpb24gZmluZEN1cnJlbnRHaXRTaGEoKTogc3RyaW5nIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGV4ZWNTeW5jKCdnaXQgcmV2LXBhcnNlIEhFQUQnLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSkudHJpbSgpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTaG9ydEhhc2goY29tbWl0SGFzaDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNvbW1pdEhhc2guc2xpY2UoMCwgOSk7XG59XG5cbmZ1bmN0aW9uIGNvZXJjZVZlcnNpb25OdW1iZXIodmVyc2lvbjogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKCF2ZXJzaW9uKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICghL15cXGR7MSwzMH1cXC5cXGR7MSwzMH1cXC5cXGR7MSwzMH0vLnRlc3QodmVyc2lvbikpIHtcbiAgICBjb25zdCBtYXRjaCA9IHZlcnNpb24ubWF0Y2goL15cXGR7MSwzMH0oXFwuXFxkezEsMzB9KSovKTtcblxuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKCFtYXRjaFsxXSkge1xuICAgICAgdmVyc2lvbiA9IHZlcnNpb24uc3Vic3RyaW5nKDAsIG1hdGNoWzBdLmxlbmd0aCkgKyAnLjAuMCcgKyB2ZXJzaW9uLnN1YnN0cmluZyhtYXRjaFswXS5sZW5ndGgpO1xuICAgIH0gZWxzZSBpZiAoIW1hdGNoWzJdKSB7XG4gICAgICB2ZXJzaW9uID0gdmVyc2lvbi5zdWJzdHJpbmcoMCwgbWF0Y2hbMF0ubGVuZ3RoKSArICcuMCcgKyB2ZXJzaW9uLnN1YnN0cmluZyhtYXRjaFswXS5sZW5ndGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBzZW12ZXIudmFsaWQodmVyc2lvbikgPz8gdW5kZWZpbmVkO1xufVxuIl19