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
            description: 'Ignore peer dependency version mismatches.',
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
            packageManagerForce: this.packageManagerForce(options.verbose),
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
            const installationSuccess = await this.context.packageManager.installAll(this.packageManagerForce(options.verbose) ? ['--force'] : [], this.context.root);
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
    packageManagerForce(verbose) {
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
            if (verbose) {
                this.context.logger.info('NPM 7+ detected -- enabling force option for package installation');
            }
            return true;
        }
        return false;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3VwZGF0ZS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwyREFBMkU7QUFDM0UsNERBQWdFO0FBQ2hFLGlEQUFvRDtBQUNwRCwyQkFBZ0Q7QUFDaEQsc0VBQWtDO0FBQ2xDLDBFQUE2QztBQUM3QywyQ0FBNkI7QUFDN0IsK0JBQXFDO0FBQ3JDLCtDQUFpQztBQUVqQywyRUFBc0U7QUFDdEUseUVBSzhDO0FBQzlDLGlHQUE0RjtBQUM1RiwyRkFBeUY7QUFDekYsaURBQStDO0FBQy9DLDZFQUEwRTtBQUMxRSx1REFBK0Q7QUFDL0QsdUVBSzBDO0FBQzFDLCtEQUtzQztBQUN0QyxxREFBa0Q7QUFlbEQsTUFBTSx1QkFBdUIsR0FBRyw2QkFBNkIsQ0FBQztBQUM5RCxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDJCQUEyQixDQUFDLENBQUM7QUFFdEYsTUFBYSxtQkFBb0IsU0FBUSw4QkFBZ0M7SUFBekU7O1FBQ1csVUFBSyxHQUFHLDZCQUFZLENBQUMsRUFBRSxDQUFDO1FBQ2QsMEJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBRWpELFlBQU8sR0FBRyxxQkFBcUIsQ0FBQztRQUNoQyxhQUFRLEdBQUcsOEVBQThFLENBQUM7UUFDMUYsd0JBQW1CLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7SUEyNUIvRCxDQUFDO0lBejVCQyxPQUFPLENBQUMsVUFBZ0I7UUFDdEIsT0FBTyxVQUFVO2FBQ2QsVUFBVSxDQUFDLFVBQVUsRUFBRTtZQUN0QixXQUFXLEVBQUUsb0NBQW9DO1lBQ2pELElBQUksRUFBRSxRQUFRO1lBQ2QsS0FBSyxF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LCtCQUErQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNsRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFFdEQsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNiLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQy9GO2FBQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNwQixPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUM3RjthQUFNO1lBQ0wsT0FBTyxTQUFTLENBQUM7U0FDbEI7S0FDRjtJQUVELE9BQU8sTUFBQSxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxtQ0FBSSxTQUFTLENBQUM7QUFDNUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVXb3JrZmxvdyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB7IGV4ZWNTeW5jLCBzcGF3blN5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHByb21pc2VzIGFzIGZzIH0gZnJvbSAnZnMnO1xuaW1wb3J0IG5wYSBmcm9tICducG0tcGFja2FnZS1hcmcnO1xuaW1wb3J0IHBpY2tNYW5pZmVzdCBmcm9tICducG0tcGljay1tYW5pZmVzdCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgam9pbiwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi8uLi8uLi9saWIvY29uZmlnL3dvcmtzcGFjZS1zY2hlbWEnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUVycm9yLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBTY2hlbWF0aWNFbmdpbmVIb3N0IH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL3V0aWxpdGllcy9zY2hlbWF0aWMtZW5naW5lLWhvc3QnO1xuaW1wb3J0IHsgc3Vic2NyaWJlVG9Xb3JrZmxvdyB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvc2NoZW1hdGljLXdvcmtmbG93JztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBkaXNhYmxlVmVyc2lvbkNoZWNrIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2Vudmlyb25tZW50LW9wdGlvbnMnO1xuaW1wb3J0IHsgd3JpdGVFcnJvclRvTG9nRmlsZSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9sb2ctZmlsZSc7XG5pbXBvcnQge1xuICBQYWNrYWdlSWRlbnRpZmllcixcbiAgUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNYW5pZmVzdCxcbiAgZmV0Y2hQYWNrYWdlTWV0YWRhdGEsXG59IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wYWNrYWdlLW1ldGFkYXRhJztcbmltcG9ydCB7XG4gIFBhY2thZ2VUcmVlTm9kZSxcbiAgZmluZFBhY2thZ2VKc29uLFxuICBnZXRQcm9qZWN0RGVwZW5kZW5jaWVzLFxuICByZWFkUGFja2FnZUpzb24sXG59IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wYWNrYWdlLXRyZWUnO1xuaW1wb3J0IHsgVkVSU0lPTiB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy92ZXJzaW9uJztcblxuaW50ZXJmYWNlIFVwZGF0ZUNvbW1hbmRBcmdzIHtcbiAgcGFja2FnZXM/OiBzdHJpbmdbXTtcbiAgZm9yY2U6IGJvb2xlYW47XG4gIG5leHQ6IGJvb2xlYW47XG4gICdtaWdyYXRlLW9ubHknPzogYm9vbGVhbjtcbiAgbmFtZT86IHN0cmluZztcbiAgZnJvbT86IHN0cmluZztcbiAgdG8/OiBzdHJpbmc7XG4gICdhbGxvdy1kaXJ0eSc6IGJvb2xlYW47XG4gIHZlcmJvc2U6IGJvb2xlYW47XG4gICdjcmVhdGUtY29tbWl0cyc6IGJvb2xlYW47XG59XG5cbmNvbnN0IEFOR1VMQVJfUEFDS0FHRVNfUkVHRVhQID0gL15AKD86YW5ndWxhcnxuZ3VuaXZlcnNhbClcXC8vO1xuY29uc3QgVVBEQVRFX1NDSEVNQVRJQ19DT0xMRUNUSU9OID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJ3NjaGVtYXRpYy9jb2xsZWN0aW9uLmpzb24nKTtcblxuZXhwb3J0IGNsYXNzIFVwZGF0ZUNvbW1hbmRNb2R1bGUgZXh0ZW5kcyBDb21tYW5kTW9kdWxlPFVwZGF0ZUNvbW1hbmRBcmdzPiB7XG4gIG92ZXJyaWRlIHNjb3BlID0gQ29tbWFuZFNjb3BlLkluO1xuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgc2hvdWxkUmVwb3J0QW5hbHl0aWNzID0gZmFsc2U7XG5cbiAgY29tbWFuZCA9ICd1cGRhdGUgW3BhY2thZ2VzLi5dJztcbiAgZGVzY3JpYmUgPSAnVXBkYXRlcyB5b3VyIHdvcmtzcGFjZSBhbmQgaXRzIGRlcGVuZGVuY2llcy4gU2VlIGh0dHBzOi8vdXBkYXRlLmFuZ3VsYXIuaW8vLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSBqb2luKF9fZGlybmFtZSwgJ2xvbmctZGVzY3JpcHRpb24ubWQnKTtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2PFVwZGF0ZUNvbW1hbmRBcmdzPiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3NcbiAgICAgIC5wb3NpdGlvbmFsKCdwYWNrYWdlcycsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgbmFtZXMgb2YgcGFja2FnZShzKSB0byB1cGRhdGUuJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGFycmF5OiB0cnVlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2ZvcmNlJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ0lnbm9yZSBwZWVyIGRlcGVuZGVuY3kgdmVyc2lvbiBtaXNtYXRjaGVzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignbmV4dCcsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdVc2UgdGhlIHByZXJlbGVhc2UgdmVyc2lvbiwgaW5jbHVkaW5nIGJldGEgYW5kIFJDcy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ21pZ3JhdGUtb25seScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdPbmx5IHBlcmZvcm0gYSBtaWdyYXRpb24sIGRvIG5vdCB1cGRhdGUgdGhlIGluc3RhbGxlZCB2ZXJzaW9uLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCduYW1lJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAnVGhlIG5hbWUgb2YgdGhlIG1pZ3JhdGlvbiB0byBydW4uICcgK1xuICAgICAgICAgIGBPbmx5IGF2YWlsYWJsZSB3aXRoIGEgc2luZ2xlIHBhY2thZ2UgYmVpbmcgdXBkYXRlZCwgYW5kIG9ubHkgd2l0aCAnbWlncmF0ZS1vbmx5JyBvcHRpb24uYCxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGltcGxpZXM6IFsnbWlncmF0ZS1vbmx5J10sXG4gICAgICAgIGNvbmZsaWN0czogWyd0bycsICdmcm9tJ10sXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignZnJvbScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgJ1ZlcnNpb24gZnJvbSB3aGljaCB0byBtaWdyYXRlIGZyb20uICcgK1xuICAgICAgICAgIGBPbmx5IGF2YWlsYWJsZSB3aXRoIGEgc2luZ2xlIHBhY2thZ2UgYmVpbmcgdXBkYXRlZCwgYW5kIG9ubHkgd2l0aCAnbWlncmF0ZS1vbmx5Jy5gLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgaW1wbGllczogWyd0bycsICdtaWdyYXRlLW9ubHknXSxcbiAgICAgICAgY29uZmxpY3RzOiBbJ25hbWUnXSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCd0bycsIHtcbiAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgJ1ZlcnNpb24gdXAgdG8gd2hpY2ggdG8gYXBwbHkgbWlncmF0aW9ucy4gT25seSBhdmFpbGFibGUgd2l0aCBhIHNpbmdsZSBwYWNrYWdlIGJlaW5nIHVwZGF0ZWQsICcgK1xuICAgICAgICAgIGBhbmQgb25seSB3aXRoICdtaWdyYXRlLW9ubHknIG9wdGlvbi4gUmVxdWlyZXMgJ2Zyb20nIHRvIGJlIHNwZWNpZmllZC4gRGVmYXVsdCB0byB0aGUgaW5zdGFsbGVkIHZlcnNpb24gZGV0ZWN0ZWQuYCxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGltcGxpZXM6IFsnZnJvbScsICdtaWdyYXRlLW9ubHknXSxcbiAgICAgICAgY29uZmxpY3RzOiBbJ25hbWUnXSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdhbGxvdy1kaXJ0eScsIHtcbiAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgJ1doZXRoZXIgdG8gYWxsb3cgdXBkYXRpbmcgd2hlbiB0aGUgcmVwb3NpdG9yeSBjb250YWlucyBtb2RpZmllZCBvciB1bnRyYWNrZWQgZmlsZXMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCd2ZXJib3NlJywge1xuICAgICAgICBkZXNjcmliZTogJ0Rpc3BsYXkgYWRkaXRpb25hbCBkZXRhaWxzIGFib3V0IGludGVybmFsIG9wZXJhdGlvbnMgZHVyaW5nIGV4ZWN1dGlvbi4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2NyZWF0ZS1jb21taXRzJywge1xuICAgICAgICBkZXNjcmliZTogJ0NyZWF0ZSBzb3VyY2UgY29udHJvbCBjb21taXRzIGZvciB1cGRhdGVzIGFuZCBtaWdyYXRpb25zLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgYWxpYXM6IFsnQyddLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAuY2hlY2soKHsgcGFja2FnZXMsICdhbGxvdy1kaXJ0eSc6IGFsbG93RGlydHksICdtaWdyYXRlLW9ubHknOiBtaWdyYXRlT25seSB9KSA9PiB7XG4gICAgICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICAgICAgLy8gVGhpcyBhbGxvd3MgdGhlIHVzZXIgdG8gZWFzaWx5IHJlc2V0IGFueSBjaGFuZ2VzIGZyb20gdGhlIHVwZGF0ZS5cbiAgICAgICAgaWYgKHBhY2thZ2VzPy5sZW5ndGggJiYgIXRoaXMuY2hlY2tDbGVhbkdpdCgpKSB7XG4gICAgICAgICAgaWYgKGFsbG93RGlydHkpIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICAnUmVwb3NpdG9yeSBpcyBub3QgY2xlYW4uIFVwZGF0ZSBjaGFuZ2VzIHdpbGwgYmUgbWl4ZWQgd2l0aCBwcmUtZXhpc3RpbmcgY2hhbmdlcy4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihcbiAgICAgICAgICAgICAgJ1JlcG9zaXRvcnkgaXMgbm90IGNsZWFuLiBQbGVhc2UgY29tbWl0IG9yIHN0YXNoIGFueSBjaGFuZ2VzIGJlZm9yZSB1cGRhdGluZy4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWlncmF0ZU9ubHkpIHtcbiAgICAgICAgICBpZiAocGFja2FnZXM/Lmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihcbiAgICAgICAgICAgICAgYEEgc2luZ2xlIHBhY2thZ2UgbXVzdCBiZSBzcGVjaWZpZWQgd2hlbiB1c2luZyB0aGUgJ21pZ3JhdGUtb25seScgb3B0aW9uLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5zdHJpY3QoKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBPcHRpb25zPFVwZGF0ZUNvbW1hbmRBcmdzPik6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyLCBwYWNrYWdlTWFuYWdlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgcGFja2FnZU1hbmFnZXIuZW5zdXJlQ29tcGF0aWJpbGl0eSgpO1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgaW5zdGFsbGVkIENMSSB2ZXJzaW9uIGlzIG9sZGVyIHRoYW4gdGhlIGxhdGVzdCBjb21wYXRpYmxlIHZlcnNpb24uXG4gICAgaWYgKCFkaXNhYmxlVmVyc2lvbkNoZWNrKSB7XG4gICAgICBjb25zdCBjbGlWZXJzaW9uVG9JbnN0YWxsID0gYXdhaXQgdGhpcy5jaGVja0NMSVZlcnNpb24oXG4gICAgICAgIG9wdGlvbnMucGFja2FnZXMsXG4gICAgICAgIG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgb3B0aW9ucy5uZXh0LFxuICAgICAgKTtcblxuICAgICAgaWYgKGNsaVZlcnNpb25Ub0luc3RhbGwpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgJ1RoZSBpbnN0YWxsZWQgQW5ndWxhciBDTEkgdmVyc2lvbiBpcyBvdXRkYXRlZC5cXG4nICtcbiAgICAgICAgICAgIGBJbnN0YWxsaW5nIGEgdGVtcG9yYXJ5IEFuZ3VsYXIgQ0xJIHZlcnNpb25lZCAke2NsaVZlcnNpb25Ub0luc3RhbGx9IHRvIHBlcmZvcm0gdGhlIHVwZGF0ZS5gLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiB0aGlzLnJ1blRlbXBCaW5hcnkoYEBhbmd1bGFyL2NsaUAke2NsaVZlcnNpb25Ub0luc3RhbGx9YCwgcHJvY2Vzcy5hcmd2LnNsaWNlKDIpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlczogUGFja2FnZUlkZW50aWZpZXJbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgcmVxdWVzdCBvZiBvcHRpb25zLnBhY2thZ2VzID8/IFtdKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYWNrYWdlSWRlbnRpZmllciA9IG5wYShyZXF1ZXN0KTtcblxuICAgICAgICAvLyBvbmx5IHJlZ2lzdHJ5IGlkZW50aWZpZXJzIGFyZSBzdXBwb3J0ZWRcbiAgICAgICAgaWYgKCFwYWNrYWdlSWRlbnRpZmllci5yZWdpc3RyeSkge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcihgUGFja2FnZSAnJHtyZXF1ZXN0fScgaXMgbm90IGEgcmVnaXN0cnkgcGFja2FnZSBpZGVudGlmZXIuYCk7XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwYWNrYWdlcy5zb21lKCh2KSA9PiB2Lm5hbWUgPT09IHBhY2thZ2VJZGVudGlmaWVyLm5hbWUpKSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKGBEdXBsaWNhdGUgcGFja2FnZSAnJHtwYWNrYWdlSWRlbnRpZmllci5uYW1lfScgc3BlY2lmaWVkLmApO1xuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5taWdyYXRlT25seSAmJiBwYWNrYWdlSWRlbnRpZmllci5yYXdTcGVjKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oJ1BhY2thZ2Ugc3BlY2lmaWVyIGhhcyBubyBlZmZlY3Qgd2hlbiB1c2luZyBcIm1pZ3JhdGUtb25seVwiIG9wdGlvbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIG5leHQgb3B0aW9uIGlzIHVzZWQgYW5kIG5vIHNwZWNpZmllciBzdXBwbGllZCwgdXNlIG5leHQgdGFnXG4gICAgICAgIGlmIChvcHRpb25zLm5leHQgJiYgIXBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMpIHtcbiAgICAgICAgICBwYWNrYWdlSWRlbnRpZmllci5mZXRjaFNwZWMgPSAnbmV4dCc7XG4gICAgICAgIH1cblxuICAgICAgICBwYWNrYWdlcy5wdXNoKHBhY2thZ2VJZGVudGlmaWVyIGFzIFBhY2thZ2VJZGVudGlmaWVyKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGUubWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oYFVzaW5nIHBhY2thZ2UgbWFuYWdlcjogJHtjb2xvcnMuZ3JleShwYWNrYWdlTWFuYWdlci5uYW1lKX1gKTtcbiAgICBsb2dnZXIuaW5mbygnQ29sbGVjdGluZyBpbnN0YWxsZWQgZGVwZW5kZW5jaWVzLi4uJyk7XG5cbiAgICBjb25zdCByb290RGVwZW5kZW5jaWVzID0gYXdhaXQgZ2V0UHJvamVjdERlcGVuZGVuY2llcyh0aGlzLmNvbnRleHQucm9vdCk7XG4gICAgbG9nZ2VyLmluZm8oYEZvdW5kICR7cm9vdERlcGVuZGVuY2llcy5zaXplfSBkZXBlbmRlbmNpZXMuYCk7XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IG5ldyBOb2RlV29ya2Zsb3codGhpcy5jb250ZXh0LnJvb3QsIHtcbiAgICAgIHBhY2thZ2VNYW5hZ2VyOiBwYWNrYWdlTWFuYWdlci5uYW1lLFxuICAgICAgcGFja2FnZU1hbmFnZXJGb3JjZTogdGhpcy5wYWNrYWdlTWFuYWdlckZvcmNlKG9wdGlvbnMudmVyYm9zZSksXG4gICAgICAvLyBfX2Rpcm5hbWUgLT4gZmF2b3IgQHNjaGVtYXRpY3MvdXBkYXRlIGZyb20gdGhpcyBwYWNrYWdlXG4gICAgICAvLyBPdGhlcndpc2UsIHVzZSBwYWNrYWdlcyBmcm9tIHRoZSBhY3RpdmUgd29ya3NwYWNlIChtaWdyYXRpb25zKVxuICAgICAgcmVzb2x2ZVBhdGhzOiBbX19kaXJuYW1lLCB0aGlzLmNvbnRleHQucm9vdF0sXG4gICAgICBzY2hlbWFWYWxpZGF0aW9uOiB0cnVlLFxuICAgICAgZW5naW5lSG9zdENyZWF0b3I6IChvcHRpb25zKSA9PiBuZXcgU2NoZW1hdGljRW5naW5lSG9zdChvcHRpb25zLnJlc29sdmVQYXRocyksXG4gICAgfSk7XG5cbiAgICBpZiAocGFja2FnZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBTaG93IHN0YXR1c1xuICAgICAgY29uc3QgeyBzdWNjZXNzIH0gPSBhd2FpdCB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgICAgIHdvcmtmbG93LFxuICAgICAgICBVUERBVEVfU0NIRU1BVElDX0NPTExFQ1RJT04sXG4gICAgICAgICd1cGRhdGUnLFxuICAgICAgICB7XG4gICAgICAgICAgZm9yY2U6IG9wdGlvbnMuZm9yY2UsXG4gICAgICAgICAgbmV4dDogb3B0aW9ucy5uZXh0LFxuICAgICAgICAgIHZlcmJvc2U6IG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgICBwYWNrYWdlTWFuYWdlcjogcGFja2FnZU1hbmFnZXIubmFtZSxcbiAgICAgICAgICBwYWNrYWdlczogW10sXG4gICAgICAgIH0sXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gc3VjY2VzcyA/IDAgOiAxO1xuICAgIH1cblxuICAgIHJldHVybiBvcHRpb25zLm1pZ3JhdGVPbmx5XG4gICAgICA/IHRoaXMubWlncmF0ZU9ubHkod29ya2Zsb3csIChvcHRpb25zLnBhY2thZ2VzID8/IFtdKVswXSwgcm9vdERlcGVuZGVuY2llcywgb3B0aW9ucylcbiAgICAgIDogdGhpcy51cGRhdGVQYWNrYWdlc0FuZE1pZ3JhdGUod29ya2Zsb3csIHJvb3REZXBlbmRlbmNpZXMsIG9wdGlvbnMsIHBhY2thZ2VzKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIGNvbGxlY3Rpb246IHN0cmluZyxcbiAgICBzY2hlbWF0aWM6IHN0cmluZyxcbiAgICBvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9LFxuICApOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgZmlsZXM6IFNldDxzdHJpbmc+IH0+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHdvcmtmbG93U3Vic2NyaXB0aW9uID0gc3Vic2NyaWJlVG9Xb3JrZmxvdyh3b3JrZmxvdywgbG9nZ2VyKTtcblxuICAgIC8vIFRPRE86IEFsbG93IHBhc3NpbmcgYSBzY2hlbWF0aWMgaW5zdGFuY2UgZGlyZWN0bHlcbiAgICB0cnkge1xuICAgICAgYXdhaXQgd29ya2Zsb3dcbiAgICAgICAgLmV4ZWN1dGUoe1xuICAgICAgICAgIGNvbGxlY3Rpb24sXG4gICAgICAgICAgc2NoZW1hdGljLFxuICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgbG9nZ2VyLFxuICAgICAgICB9KVxuICAgICAgICAudG9Qcm9taXNlKCk7XG5cbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6ICF3b3JrZmxvd1N1YnNjcmlwdGlvbi5lcnJvciwgZmlsZXM6IHdvcmtmbG93U3Vic2NyaXB0aW9uLmZpbGVzIH07XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbikge1xuICAgICAgICBsb2dnZXIuZXJyb3IoYCR7Y29sb3JzLnN5bWJvbHMuY3Jvc3N9IE1pZ3JhdGlvbiBmYWlsZWQuIFNlZSBhYm92ZSBmb3IgZnVydGhlciBkZXRhaWxzLlxcbmApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgbG9nUGF0aCA9IHdyaXRlRXJyb3JUb0xvZ0ZpbGUoZSk7XG4gICAgICAgIGxvZ2dlci5mYXRhbChcbiAgICAgICAgICBgJHtjb2xvcnMuc3ltYm9scy5jcm9zc30gTWlncmF0aW9uIGZhaWxlZDogJHtlLm1lc3NhZ2V9XFxuYCArXG4gICAgICAgICAgICBgICBTZWUgXCIke2xvZ1BhdGh9XCIgZm9yIGZ1cnRoZXIgZGV0YWlscy5cXG5gLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZmlsZXM6IHdvcmtmbG93U3Vic2NyaXB0aW9uLmZpbGVzIH07XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHdvcmtmbG93U3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIG1pZ3JhdGlvbiB3YXMgcGVyZm9ybWVkIHN1Y2Nlc3NmdWxseS5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZU1pZ3JhdGlvbihcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgY29sbGVjdGlvblBhdGg6IHN0cmluZyxcbiAgICBtaWdyYXRpb25OYW1lOiBzdHJpbmcsXG4gICAgY29tbWl0PzogYm9vbGVhbixcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uUGF0aCk7XG4gICAgY29uc3QgbmFtZSA9IGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKCkuZmluZCgobmFtZSkgPT4gbmFtZSA9PT0gbWlncmF0aW9uTmFtZSk7XG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYENhbm5vdCBmaW5kIG1pZ3JhdGlvbiAnJHttaWdyYXRpb25OYW1lfScgaW4gJyR7cGFja2FnZU5hbWV9Jy5gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oY29sb3JzLmN5YW4oYCoqIEV4ZWN1dGluZyAnJHttaWdyYXRpb25OYW1lfScgb2YgcGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nICoqXFxuYCkpO1xuICAgIGNvbnN0IHNjaGVtYXRpYyA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVTY2hlbWF0aWMobmFtZSwgY29sbGVjdGlvbik7XG5cbiAgICByZXR1cm4gdGhpcy5leGVjdXRlUGFja2FnZU1pZ3JhdGlvbnMod29ya2Zsb3csIFtzY2hlbWF0aWMuZGVzY3JpcHRpb25dLCBwYWNrYWdlTmFtZSwgY29tbWl0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSBtaWdyYXRpb25zIHdlcmUgcGVyZm9ybWVkIHN1Y2Nlc3NmdWxseS5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZU1pZ3JhdGlvbnMoXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIGNvbGxlY3Rpb25QYXRoOiBzdHJpbmcsXG4gICAgZnJvbTogc3RyaW5nLFxuICAgIHRvOiBzdHJpbmcsXG4gICAgY29tbWl0PzogYm9vbGVhbixcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvblBhdGgpO1xuICAgIGNvbnN0IG1pZ3JhdGlvblJhbmdlID0gbmV3IHNlbXZlci5SYW5nZShcbiAgICAgICc+JyArIChzZW12ZXIucHJlcmVsZWFzZShmcm9tKSA/IGZyb20uc3BsaXQoJy0nKVswXSArICctMCcgOiBmcm9tKSArICcgPD0nICsgdG8uc3BsaXQoJy0nKVswXSxcbiAgICApO1xuICAgIGNvbnN0IG1pZ3JhdGlvbnMgPSBbXTtcblxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBjb2xsZWN0aW9uLmxpc3RTY2hlbWF0aWNOYW1lcygpKSB7XG4gICAgICBjb25zdCBzY2hlbWF0aWMgPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlU2NoZW1hdGljKG5hbWUsIGNvbGxlY3Rpb24pO1xuICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSBzY2hlbWF0aWMuZGVzY3JpcHRpb24gYXMgdHlwZW9mIHNjaGVtYXRpYy5kZXNjcmlwdGlvbiAmIHtcbiAgICAgICAgdmVyc2lvbj86IHN0cmluZztcbiAgICAgIH07XG4gICAgICBkZXNjcmlwdGlvbi52ZXJzaW9uID0gY29lcmNlVmVyc2lvbk51bWJlcihkZXNjcmlwdGlvbi52ZXJzaW9uKTtcbiAgICAgIGlmICghZGVzY3JpcHRpb24udmVyc2lvbikge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNlbXZlci5zYXRpc2ZpZXMoZGVzY3JpcHRpb24udmVyc2lvbiwgbWlncmF0aW9uUmFuZ2UsIHsgaW5jbHVkZVByZXJlbGVhc2U6IHRydWUgfSkpIHtcbiAgICAgICAgbWlncmF0aW9ucy5wdXNoKGRlc2NyaXB0aW9uIGFzIHR5cGVvZiBzY2hlbWF0aWMuZGVzY3JpcHRpb24gJiB7IHZlcnNpb246IHN0cmluZyB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWlncmF0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIG1pZ3JhdGlvbnMuc29ydCgoYSwgYikgPT4gc2VtdmVyLmNvbXBhcmUoYS52ZXJzaW9uLCBiLnZlcnNpb24pIHx8IGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSkpO1xuXG4gICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKFxuICAgICAgY29sb3JzLmN5YW4oYCoqIEV4ZWN1dGluZyBtaWdyYXRpb25zIG9mIHBhY2thZ2UgJyR7cGFja2FnZU5hbWV9JyAqKlxcbmApLFxuICAgICk7XG5cbiAgICByZXR1cm4gdGhpcy5leGVjdXRlUGFja2FnZU1pZ3JhdGlvbnMod29ya2Zsb3csIG1pZ3JhdGlvbnMsIHBhY2thZ2VOYW1lLCBjb21taXQpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlUGFja2FnZU1pZ3JhdGlvbnMoXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICBtaWdyYXRpb25zOiBJdGVyYWJsZTx7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb246IHN0cmluZzsgY29sbGVjdGlvbjogeyBuYW1lOiBzdHJpbmcgfSB9PixcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIGNvbW1pdCA9IGZhbHNlLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgZm9yIChjb25zdCBtaWdyYXRpb24gb2YgbWlncmF0aW9ucykge1xuICAgICAgY29uc3QgW3RpdGxlLCAuLi5kZXNjcmlwdGlvbl0gPSBtaWdyYXRpb24uZGVzY3JpcHRpb24uc3BsaXQoJy4gJyk7XG5cbiAgICAgIGxvZ2dlci5pbmZvKFxuICAgICAgICBjb2xvcnMuY3lhbihjb2xvcnMuc3ltYm9scy5wb2ludGVyKSArXG4gICAgICAgICAgJyAnICtcbiAgICAgICAgICBjb2xvcnMuYm9sZCh0aXRsZS5lbmRzV2l0aCgnLicpID8gdGl0bGUgOiB0aXRsZSArICcuJyksXG4gICAgICApO1xuXG4gICAgICBpZiAoZGVzY3JpcHRpb24ubGVuZ3RoKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKCcgICcgKyBkZXNjcmlwdGlvbi5qb2luKCcuXFxuICAnKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICAgICAgd29ya2Zsb3csXG4gICAgICAgIG1pZ3JhdGlvbi5jb2xsZWN0aW9uLm5hbWUsXG4gICAgICAgIG1pZ3JhdGlvbi5uYW1lLFxuICAgICAgKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIGxvZ2dlci5pbmZvKCcgIE1pZ3JhdGlvbiBjb21wbGV0ZWQuJyk7XG5cbiAgICAgIC8vIENvbW1pdCBtaWdyYXRpb25cbiAgICAgIGlmIChjb21taXQpIHtcbiAgICAgICAgY29uc3QgY29tbWl0UHJlZml4ID0gYCR7cGFja2FnZU5hbWV9IG1pZ3JhdGlvbiAtICR7bWlncmF0aW9uLm5hbWV9YDtcbiAgICAgICAgY29uc3QgY29tbWl0TWVzc2FnZSA9IG1pZ3JhdGlvbi5kZXNjcmlwdGlvblxuICAgICAgICAgID8gYCR7Y29tbWl0UHJlZml4fVxcblxcbiR7bWlncmF0aW9uLmRlc2NyaXB0aW9ufWBcbiAgICAgICAgICA6IGNvbW1pdFByZWZpeDtcbiAgICAgICAgY29uc3QgY29tbWl0dGVkID0gdGhpcy5jb21taXQoY29tbWl0TWVzc2FnZSk7XG4gICAgICAgIGlmICghY29tbWl0dGVkKSB7XG4gICAgICAgICAgLy8gRmFpbGVkIHRvIGNvbW1pdCwgc29tZXRoaW5nIHdlbnQgd3JvbmcuIEFib3J0IHRoZSB1cGRhdGUuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgbG9nZ2VyLmluZm8oJycpOyAvLyBFeHRyYSB0cmFpbGluZyBuZXdsaW5lLlxuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBtaWdyYXRlT25seShcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgcm9vdERlcGVuZGVuY2llczogTWFwPHN0cmluZywgUGFja2FnZVRyZWVOb2RlPixcbiAgICBvcHRpb25zOiBPcHRpb25zPFVwZGF0ZUNvbW1hbmRBcmdzPixcbiAgKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCBwYWNrYWdlRGVwZW5kZW5jeSA9IHJvb3REZXBlbmRlbmNpZXMuZ2V0KHBhY2thZ2VOYW1lKTtcbiAgICBsZXQgcGFja2FnZVBhdGggPSBwYWNrYWdlRGVwZW5kZW5jeT8ucGF0aDtcbiAgICBsZXQgcGFja2FnZU5vZGUgPSBwYWNrYWdlRGVwZW5kZW5jeT8ucGFja2FnZTtcbiAgICBpZiAocGFja2FnZURlcGVuZGVuY3kgJiYgIXBhY2thZ2VOb2RlKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1BhY2thZ2UgZm91bmQgaW4gcGFja2FnZS5qc29uIGJ1dCBpcyBub3QgaW5zdGFsbGVkLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKCFwYWNrYWdlRGVwZW5kZW5jeSkge1xuICAgICAgLy8gQWxsb3cgcnVubmluZyBtaWdyYXRpb25zIG9uIHRyYW5zaXRpdmVseSBpbnN0YWxsZWQgZGVwZW5kZW5jaWVzXG4gICAgICAvLyBUaGVyZSBjYW4gdGVjaG5pY2FsbHkgYmUgbmVzdGVkIG11bHRpcGxlIHZlcnNpb25zXG4gICAgICAvLyBUT0RPOiBJZiBtdWx0aXBsZSwgdGhpcyBzaG91bGQgZmluZCBhbGwgdmVyc2lvbnMgYW5kIGFzayB3aGljaCBvbmUgdG8gdXNlXG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGZpbmRQYWNrYWdlSnNvbih0aGlzLmNvbnRleHQucm9vdCwgcGFja2FnZU5hbWUpO1xuICAgICAgaWYgKHBhY2thZ2VKc29uKSB7XG4gICAgICAgIHBhY2thZ2VQYXRoID0gcGF0aC5kaXJuYW1lKHBhY2thZ2VKc29uKTtcbiAgICAgICAgcGFja2FnZU5vZGUgPSBhd2FpdCByZWFkUGFja2FnZUpzb24ocGFja2FnZUpzb24pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghcGFja2FnZU5vZGUgfHwgIXBhY2thZ2VQYXRoKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1BhY2thZ2UgaXMgbm90IGluc3RhbGxlZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgY29uc3QgdXBkYXRlTWV0YWRhdGEgPSBwYWNrYWdlTm9kZVsnbmctdXBkYXRlJ107XG4gICAgbGV0IG1pZ3JhdGlvbnMgPSB1cGRhdGVNZXRhZGF0YT8ubWlncmF0aW9ucztcbiAgICBpZiAobWlncmF0aW9ucyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1BhY2thZ2UgZG9lcyBub3QgcHJvdmlkZSBtaWdyYXRpb25zLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtaWdyYXRpb25zICE9PSAnc3RyaW5nJykge1xuICAgICAgbG9nZ2VyLmVycm9yKCdQYWNrYWdlIGNvbnRhaW5zIGEgbWFsZm9ybWVkIG1pZ3JhdGlvbnMgZmllbGQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAocGF0aC5wb3NpeC5pc0Fic29sdXRlKG1pZ3JhdGlvbnMpIHx8IHBhdGgud2luMzIuaXNBYnNvbHV0ZShtaWdyYXRpb25zKSkge1xuICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAnUGFja2FnZSBjb250YWlucyBhbiBpbnZhbGlkIG1pZ3JhdGlvbnMgZmllbGQuIEFic29sdXRlIHBhdGhzIGFyZSBub3QgcGVybWl0dGVkLicsXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICAvLyBOb3JtYWxpemUgc2xhc2hlc1xuICAgIG1pZ3JhdGlvbnMgPSBtaWdyYXRpb25zLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICAgIGlmIChtaWdyYXRpb25zLnN0YXJ0c1dpdGgoJy4uLycpKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICdQYWNrYWdlIGNvbnRhaW5zIGFuIGludmFsaWQgbWlncmF0aW9ucyBmaWVsZC4gUGF0aHMgb3V0c2lkZSB0aGUgcGFja2FnZSByb290IGFyZSBub3QgcGVybWl0dGVkLicsXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBpdCBpcyBhIHBhY2thZ2UtbG9jYWwgbG9jYXRpb25cbiAgICBjb25zdCBsb2NhbE1pZ3JhdGlvbnMgPSBwYXRoLmpvaW4ocGFja2FnZVBhdGgsIG1pZ3JhdGlvbnMpO1xuICAgIGlmIChleGlzdHNTeW5jKGxvY2FsTWlncmF0aW9ucykpIHtcbiAgICAgIG1pZ3JhdGlvbnMgPSBsb2NhbE1pZ3JhdGlvbnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRyeSB0byByZXNvbHZlIGZyb20gcGFja2FnZSBsb2NhdGlvbi5cbiAgICAgIC8vIFRoaXMgYXZvaWRzIGlzc3VlcyB3aXRoIHBhY2thZ2UgaG9pc3RpbmcuXG4gICAgICB0cnkge1xuICAgICAgICBtaWdyYXRpb25zID0gcmVxdWlyZS5yZXNvbHZlKG1pZ3JhdGlvbnMsIHsgcGF0aHM6IFtwYWNrYWdlUGF0aF0gfSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcignTWlncmF0aW9ucyBmb3IgcGFja2FnZSB3ZXJlIG5vdCBmb3VuZC4nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UuICBbJHtlLm1lc3NhZ2V9XWApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMubmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbihcbiAgICAgICAgd29ya2Zsb3csXG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICBtaWdyYXRpb25zLFxuICAgICAgICBvcHRpb25zLm5hbWUsXG4gICAgICAgIG9wdGlvbnMuY3JlYXRlQ29tbWl0cyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgZnJvbSA9IGNvZXJjZVZlcnNpb25OdW1iZXIob3B0aW9ucy5mcm9tKTtcbiAgICBpZiAoIWZyb20pIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgXCJmcm9tXCIgdmFsdWUgWyR7b3B0aW9ucy5mcm9tfV0gaXMgbm90IGEgdmFsaWQgdmVyc2lvbi5gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbnMoXG4gICAgICB3b3JrZmxvdyxcbiAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgbWlncmF0aW9ucyxcbiAgICAgIGZyb20sXG4gICAgICBvcHRpb25zLnRvIHx8IHBhY2thZ2VOb2RlLnZlcnNpb24sXG4gICAgICBvcHRpb25zLmNyZWF0ZUNvbW1pdHMsXG4gICAgKTtcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGluZXMtcGVyLWZ1bmN0aW9uXG4gIHByaXZhdGUgYXN5bmMgdXBkYXRlUGFja2FnZXNBbmRNaWdyYXRlKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgcm9vdERlcGVuZGVuY2llczogTWFwPHN0cmluZywgUGFja2FnZVRyZWVOb2RlPixcbiAgICBvcHRpb25zOiBPcHRpb25zPFVwZGF0ZUNvbW1hbmRBcmdzPixcbiAgICBwYWNrYWdlczogUGFja2FnZUlkZW50aWZpZXJbXSxcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgY29uc3QgbG9nVmVyYm9zZSA9IChtZXNzYWdlOiBzdHJpbmcpID0+IHtcbiAgICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8obWVzc2FnZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHJlcXVlc3RzOiB7XG4gICAgICBpZGVudGlmaWVyOiBQYWNrYWdlSWRlbnRpZmllcjtcbiAgICAgIG5vZGU6IFBhY2thZ2VUcmVlTm9kZTtcbiAgICB9W10gPSBbXTtcblxuICAgIC8vIFZhbGlkYXRlIHBhY2thZ2VzIGFjdHVhbGx5IGFyZSBwYXJ0IG9mIHRoZSB3b3Jrc3BhY2VcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlcykge1xuICAgICAgY29uc3Qgbm9kZSA9IHJvb3REZXBlbmRlbmNpZXMuZ2V0KHBrZy5uYW1lKTtcbiAgICAgIGlmICghbm9kZT8ucGFja2FnZSkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoYFBhY2thZ2UgJyR7cGtnLm5hbWV9JyBpcyBub3QgYSBkZXBlbmRlbmN5LmApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiBhIHNwZWNpZmljIHZlcnNpb24gaXMgcmVxdWVzdGVkIGFuZCBtYXRjaGVzIHRoZSBpbnN0YWxsZWQgdmVyc2lvbiwgc2tpcC5cbiAgICAgIGlmIChwa2cudHlwZSA9PT0gJ3ZlcnNpb24nICYmIG5vZGUucGFja2FnZS52ZXJzaW9uID09PSBwa2cuZmV0Y2hTcGVjKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBQYWNrYWdlICcke3BrZy5uYW1lfScgaXMgYWxyZWFkeSBhdCAnJHtwa2cuZmV0Y2hTcGVjfScuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0cy5wdXNoKHsgaWRlbnRpZmllcjogcGtnLCBub2RlIH0pO1xuICAgIH1cblxuICAgIGlmIChyZXF1ZXN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGxvZ2dlci5pbmZvKCdGZXRjaGluZyBkZXBlbmRlbmN5IG1ldGFkYXRhIGZyb20gcmVnaXN0cnkuLi4nKTtcblxuICAgIGNvbnN0IHBhY2thZ2VzVG9VcGRhdGU6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCB7IGlkZW50aWZpZXI6IHJlcXVlc3RJZGVudGlmaWVyLCBub2RlIH0gb2YgcmVxdWVzdHMpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VOYW1lID0gcmVxdWVzdElkZW50aWZpZXIubmFtZTtcblxuICAgICAgbGV0IG1ldGFkYXRhO1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gTWV0YWRhdGEgcmVxdWVzdHMgYXJlIGludGVybmFsbHkgY2FjaGVkOyBtdWx0aXBsZSByZXF1ZXN0cyBmb3Igc2FtZSBuYW1lXG4gICAgICAgIC8vIGRvZXMgbm90IHJlc3VsdCBpbiBhZGRpdGlvbmFsIG5ldHdvcmsgdHJhZmZpY1xuICAgICAgICBtZXRhZGF0YSA9IGF3YWl0IGZldGNoUGFja2FnZU1ldGFkYXRhKHBhY2thZ2VOYW1lLCBsb2dnZXIsIHtcbiAgICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGZldGNoaW5nIG1ldGFkYXRhIGZvciAnJHtwYWNrYWdlTmFtZX0nOiBgICsgZS5tZXNzYWdlKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgLy8gVHJ5IHRvIGZpbmQgYSBwYWNrYWdlIHZlcnNpb24gYmFzZWQgb24gdGhlIHVzZXIgcmVxdWVzdGVkIHBhY2thZ2Ugc3BlY2lmaWVyXG4gICAgICAvLyByZWdpc3RyeSBzcGVjaWZpZXIgdHlwZXMgYXJlIGVpdGhlciB2ZXJzaW9uLCByYW5nZSwgb3IgdGFnXG4gICAgICBsZXQgbWFuaWZlc3Q6IFBhY2thZ2VNYW5pZmVzdCB8IHVuZGVmaW5lZDtcbiAgICAgIGlmIChcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3ZlcnNpb24nIHx8XG4gICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICdyYW5nZScgfHxcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3RhZydcbiAgICAgICkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG1hbmlmZXN0ID0gcGlja01hbmlmZXN0KG1ldGFkYXRhLCByZXF1ZXN0SWRlbnRpZmllci5mZXRjaFNwZWMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ0VUQVJHRVQnKSB7XG4gICAgICAgICAgICAvLyBJZiBub3QgZm91bmQgYW5kIG5leHQgd2FzIHVzZWQgYW5kIHVzZXIgZGlkIG5vdCBwcm92aWRlIGEgc3BlY2lmaWVyLCB0cnkgbGF0ZXN0LlxuICAgICAgICAgICAgLy8gUGFja2FnZSBtYXkgbm90IGhhdmUgYSBuZXh0IHRhZy5cbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3RhZycgJiZcbiAgICAgICAgICAgICAgcmVxdWVzdElkZW50aWZpZXIuZmV0Y2hTcGVjID09PSAnbmV4dCcgJiZcbiAgICAgICAgICAgICAgIXJlcXVlc3RJZGVudGlmaWVyLnJhd1NwZWNcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG1hbmlmZXN0ID0gcGlja01hbmlmZXN0KG1ldGFkYXRhLCAnbGF0ZXN0Jyk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS5jb2RlICE9PSAnRVRBUkdFVCcgJiYgZS5jb2RlICE9PSAnRU5PVkVSU0lPTlMnKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoZS5jb2RlICE9PSAnRU5PVkVSU0lPTlMnKSB7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIW1hbmlmZXN0KSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICBgUGFja2FnZSBzcGVjaWZpZWQgYnkgJyR7cmVxdWVzdElkZW50aWZpZXIucmF3fScgZG9lcyBub3QgZXhpc3Qgd2l0aGluIHRoZSByZWdpc3RyeS5gLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICBpZiAobWFuaWZlc3QudmVyc2lvbiA9PT0gbm9kZS5wYWNrYWdlPy52ZXJzaW9uKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBQYWNrYWdlICcke3BhY2thZ2VOYW1lfScgaXMgYWxyZWFkeSB1cCB0byBkYXRlLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG5vZGUucGFja2FnZSAmJiBBTkdVTEFSX1BBQ0tBR0VTX1JFR0VYUC50ZXN0KG5vZGUucGFja2FnZS5uYW1lKSkge1xuICAgICAgICBjb25zdCB7IG5hbWUsIHZlcnNpb24gfSA9IG5vZGUucGFja2FnZTtcbiAgICAgICAgY29uc3QgdG9CZUluc3RhbGxlZE1ham9yVmVyc2lvbiA9ICttYW5pZmVzdC52ZXJzaW9uLnNwbGl0KCcuJylbMF07XG4gICAgICAgIGNvbnN0IGN1cnJlbnRNYWpvclZlcnNpb24gPSArdmVyc2lvbi5zcGxpdCgnLicpWzBdO1xuXG4gICAgICAgIGlmICh0b0JlSW5zdGFsbGVkTWFqb3JWZXJzaW9uIC0gY3VycmVudE1ham9yVmVyc2lvbiA+IDEpIHtcbiAgICAgICAgICAvLyBPbmx5IGFsbG93IHVwZGF0aW5nIGEgc2luZ2xlIHZlcnNpb24gYXQgYSB0aW1lLlxuICAgICAgICAgIGlmIChjdXJyZW50TWFqb3JWZXJzaW9uIDwgNikge1xuICAgICAgICAgICAgLy8gQmVmb3JlIHZlcnNpb24gNiwgdGhlIG1ham9yIHZlcnNpb25zIHdlcmUgbm90IGFsd2F5cyBzZXF1ZW50aWFsLlxuICAgICAgICAgICAgLy8gRXhhbXBsZSBAYW5ndWxhci9jb3JlIHNraXBwZWQgdmVyc2lvbiAzLCBAYW5ndWxhci9jbGkgc2tpcHBlZCB2ZXJzaW9ucyAyLTUuXG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBVcGRhdGluZyBtdWx0aXBsZSBtYWpvciB2ZXJzaW9ucyBvZiAnJHtuYW1lfScgYXQgb25jZSBpcyBub3Qgc3VwcG9ydGVkLiBQbGVhc2UgbWlncmF0ZSBlYWNoIG1ham9yIHZlcnNpb24gaW5kaXZpZHVhbGx5LlxcbmAgK1xuICAgICAgICAgICAgICAgIGBGb3IgbW9yZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdXBkYXRlIHByb2Nlc3MsIHNlZSBodHRwczovL3VwZGF0ZS5hbmd1bGFyLmlvLy5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50ID0gY3VycmVudE1ham9yVmVyc2lvbiArIDE7XG5cbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgYFVwZGF0aW5nIG11bHRpcGxlIG1ham9yIHZlcnNpb25zIG9mICcke25hbWV9JyBhdCBvbmNlIGlzIG5vdCBzdXBwb3J0ZWQuIFBsZWFzZSBtaWdyYXRlIGVhY2ggbWFqb3IgdmVyc2lvbiBpbmRpdmlkdWFsbHkuXFxuYCArXG4gICAgICAgICAgICAgICAgYFJ1biAnbmcgdXBkYXRlICR7bmFtZX1AJHtuZXh0TWFqb3JWZXJzaW9uRnJvbUN1cnJlbnR9JyBpbiB5b3VyIHdvcmtzcGFjZSBkaXJlY3RvcnkgYCArXG4gICAgICAgICAgICAgICAgYHRvIHVwZGF0ZSB0byBsYXRlc3QgJyR7bmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50fS54JyB2ZXJzaW9uIG9mICcke25hbWV9Jy5cXG5cXG5gICtcbiAgICAgICAgICAgICAgICBgRm9yIG1vcmUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHVwZGF0ZSBwcm9jZXNzLCBzZWUgaHR0cHM6Ly91cGRhdGUuYW5ndWxhci5pby8/dj0ke2N1cnJlbnRNYWpvclZlcnNpb259LjAtJHtuZXh0TWFqb3JWZXJzaW9uRnJvbUN1cnJlbnR9LjBgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwYWNrYWdlc1RvVXBkYXRlLnB1c2gocmVxdWVzdElkZW50aWZpZXIudG9TdHJpbmcoKSk7XG4gICAgfVxuXG4gICAgaWYgKHBhY2thZ2VzVG9VcGRhdGUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBjb25zdCB7IHN1Y2Nlc3MgfSA9IGF3YWl0IHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICAgIHdvcmtmbG93LFxuICAgICAgVVBEQVRFX1NDSEVNQVRJQ19DT0xMRUNUSU9OLFxuICAgICAgJ3VwZGF0ZScsXG4gICAgICB7XG4gICAgICAgIHZlcmJvc2U6IG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgZm9yY2U6IG9wdGlvbnMuZm9yY2UsXG4gICAgICAgIG5leHQ6IG9wdGlvbnMubmV4dCxcbiAgICAgICAgcGFja2FnZU1hbmFnZXI6IHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci5uYW1lLFxuICAgICAgICBwYWNrYWdlczogcGFja2FnZXNUb1VwZGF0ZSxcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5ybShwYXRoLmpvaW4odGhpcy5jb250ZXh0LnJvb3QsICdub2RlX21vZHVsZXMnKSwge1xuICAgICAgICAgIGZvcmNlOiB0cnVlLFxuICAgICAgICAgIHJlY3Vyc2l2ZTogdHJ1ZSxcbiAgICAgICAgICBtYXhSZXRyaWVzOiAzLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2gge31cblxuICAgICAgY29uc3QgaW5zdGFsbGF0aW9uU3VjY2VzcyA9IGF3YWl0IHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci5pbnN0YWxsQWxsKFxuICAgICAgICB0aGlzLnBhY2thZ2VNYW5hZ2VyRm9yY2Uob3B0aW9ucy52ZXJib3NlKSA/IFsnLS1mb3JjZSddIDogW10sXG4gICAgICAgIHRoaXMuY29udGV4dC5yb290LFxuICAgICAgKTtcblxuICAgICAgaWYgKCFpbnN0YWxsYXRpb25TdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdWNjZXNzICYmIG9wdGlvbnMuY3JlYXRlQ29tbWl0cykge1xuICAgICAgaWYgKCF0aGlzLmNvbW1pdChgQW5ndWxhciBDTEkgdXBkYXRlIGZvciBwYWNrYWdlcyAtICR7cGFja2FnZXNUb1VwZGF0ZS5qb2luKCcsICcpfWApKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoaXMgaXMgYSB0ZW1wb3Jhcnkgd29ya2Fyb3VuZCB0byBhbGxvdyBkYXRhIHRvIGJlIHBhc3NlZCBiYWNrIGZyb20gdGhlIHVwZGF0ZSBzY2hlbWF0aWNcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IG1pZ3JhdGlvbnMgPSAoZ2xvYmFsIGFzIGFueSkuZXh0ZXJuYWxNaWdyYXRpb25zIGFzIHtcbiAgICAgIHBhY2thZ2U6IHN0cmluZztcbiAgICAgIGNvbGxlY3Rpb246IHN0cmluZztcbiAgICAgIGZyb206IHN0cmluZztcbiAgICAgIHRvOiBzdHJpbmc7XG4gICAgfVtdO1xuXG4gICAgaWYgKHN1Y2Nlc3MgJiYgbWlncmF0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBtaWdyYXRpb24gb2YgbWlncmF0aW9ucykge1xuICAgICAgICAvLyBSZXNvbHZlIHRoZSBwYWNrYWdlIGZyb20gdGhlIHdvcmtzcGFjZSByb290LCBhcyBvdGhlcndpc2UgaXQgd2lsbCBiZSByZXNvbHZlZCBmcm9tIHRoZSB0ZW1wXG4gICAgICAgIC8vIGluc3RhbGxlZCBDTEkgdmVyc2lvbi5cbiAgICAgICAgbGV0IHBhY2thZ2VQYXRoO1xuICAgICAgICBsb2dWZXJib3NlKFxuICAgICAgICAgIGBSZXNvbHZpbmcgbWlncmF0aW9uIHBhY2thZ2UgJyR7bWlncmF0aW9uLnBhY2thZ2V9JyBmcm9tICcke3RoaXMuY29udGV4dC5yb290fScuLi5gLFxuICAgICAgICApO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwYWNrYWdlUGF0aCA9IHBhdGguZGlybmFtZShcbiAgICAgICAgICAgICAgLy8gVGhpcyBtYXkgZmFpbCBpZiB0aGUgYHBhY2thZ2UuanNvbmAgaXMgbm90IGV4cG9ydGVkIGFzIGFuIGVudHJ5IHBvaW50XG4gICAgICAgICAgICAgIHJlcXVpcmUucmVzb2x2ZShwYXRoLmpvaW4obWlncmF0aW9uLnBhY2thZ2UsICdwYWNrYWdlLmpzb24nKSwge1xuICAgICAgICAgICAgICAgIHBhdGhzOiBbdGhpcy5jb250ZXh0LnJvb3RdLFxuICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRyeWluZyB0byByZXNvbHZlIHRoZSBwYWNrYWdlJ3MgbWFpbiBlbnRyeSBwb2ludFxuICAgICAgICAgICAgICBwYWNrYWdlUGF0aCA9IHJlcXVpcmUucmVzb2x2ZShtaWdyYXRpb24ucGFja2FnZSwgeyBwYXRoczogW3RoaXMuY29udGV4dC5yb290XSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICBsb2dWZXJib3NlKGUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBNaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkgd2VyZSBub3QgZm91bmQuYCArXG4gICAgICAgICAgICAgICAgJyBUaGUgcGFja2FnZSBjb3VsZCBub3QgYmUgZm91bmQgaW4gdGhlIHdvcmtzcGFjZS4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVW5hYmxlIHRvIHJlc29sdmUgbWlncmF0aW9ucyBmb3IgcGFja2FnZSAoJHttaWdyYXRpb24ucGFja2FnZX0pLiAgWyR7ZS5tZXNzYWdlfV1gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBtaWdyYXRpb25zO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0IGlzIGEgcGFja2FnZS1sb2NhbCBsb2NhdGlvblxuICAgICAgICBjb25zdCBsb2NhbE1pZ3JhdGlvbnMgPSBwYXRoLmpvaW4ocGFja2FnZVBhdGgsIG1pZ3JhdGlvbi5jb2xsZWN0aW9uKTtcbiAgICAgICAgaWYgKGV4aXN0c1N5bmMobG9jYWxNaWdyYXRpb25zKSkge1xuICAgICAgICAgIG1pZ3JhdGlvbnMgPSBsb2NhbE1pZ3JhdGlvbnM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVHJ5IHRvIHJlc29sdmUgZnJvbSBwYWNrYWdlIGxvY2F0aW9uLlxuICAgICAgICAgIC8vIFRoaXMgYXZvaWRzIGlzc3VlcyB3aXRoIHBhY2thZ2UgaG9pc3RpbmcuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG1pZ3JhdGlvbnMgPSByZXF1aXJlLnJlc29sdmUobWlncmF0aW9uLmNvbGxlY3Rpb24sIHsgcGF0aHM6IFtwYWNrYWdlUGF0aF0gfSk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgTWlncmF0aW9ucyBmb3IgcGFja2FnZSAoJHttaWdyYXRpb24ucGFja2FnZX0pIHdlcmUgbm90IGZvdW5kLmApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICAgIGBVbmFibGUgdG8gcmVzb2x2ZSBtaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkuICBbJHtlLm1lc3NhZ2V9XWAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVNaWdyYXRpb25zKFxuICAgICAgICAgIHdvcmtmbG93LFxuICAgICAgICAgIG1pZ3JhdGlvbi5wYWNrYWdlLFxuICAgICAgICAgIG1pZ3JhdGlvbnMsXG4gICAgICAgICAgbWlncmF0aW9uLmZyb20sXG4gICAgICAgICAgbWlncmF0aW9uLnRvLFxuICAgICAgICAgIG9wdGlvbnMuY3JlYXRlQ29tbWl0cyxcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBBIG5vbi16ZXJvIHZhbHVlIGlzIGEgZmFpbHVyZSBmb3IgdGhlIHBhY2thZ2UncyBtaWdyYXRpb25zXG4gICAgICAgIGlmIChyZXN1bHQgIT09IDApIHtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1Y2Nlc3MgPyAwIDogMTtcbiAgfVxuICAvKipcbiAgICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgY29tbWl0IHdhcyBzdWNjZXNzZnVsLlxuICAgKi9cbiAgcHJpdmF0ZSBjb21taXQobWVzc2FnZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcblxuICAgIC8vIENoZWNrIGlmIGEgY29tbWl0IGlzIG5lZWRlZC5cbiAgICBsZXQgY29tbWl0TmVlZGVkOiBib29sZWFuO1xuICAgIHRyeSB7XG4gICAgICBjb21taXROZWVkZWQgPSBoYXNDaGFuZ2VzVG9Db21taXQoKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgICBGYWlsZWQgdG8gcmVhZCBHaXQgdHJlZTpcXG4ke2Vyci5zdGRlcnJ9YCk7XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWNvbW1pdE5lZWRlZCkge1xuICAgICAgbG9nZ2VyLmluZm8oJyAgTm8gY2hhbmdlcyB0byBjb21taXQgYWZ0ZXIgbWlncmF0aW9uLicpO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBDb21taXQgY2hhbmdlcyBhbmQgYWJvcnQgb24gZXJyb3IuXG4gICAgdHJ5IHtcbiAgICAgIGNyZWF0ZUNvbW1pdChtZXNzYWdlKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGNvbW1pdCB1cGRhdGUgKCR7bWVzc2FnZX0pOlxcbiR7ZXJyLnN0ZGVycn1gKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE5vdGlmeSB1c2VyIG9mIHRoZSBjb21taXQuXG4gICAgY29uc3QgaGFzaCA9IGZpbmRDdXJyZW50R2l0U2hhKCk7XG4gICAgY29uc3Qgc2hvcnRNZXNzYWdlID0gbWVzc2FnZS5zcGxpdCgnXFxuJylbMF07XG4gICAgaWYgKGhhc2gpIHtcbiAgICAgIGxvZ2dlci5pbmZvKGAgIENvbW1pdHRlZCBtaWdyYXRpb24gc3RlcCAoJHtnZXRTaG9ydEhhc2goaGFzaCl9KTogJHtzaG9ydE1lc3NhZ2V9LmApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDb21taXQgd2FzIHN1Y2Nlc3NmdWwsIGJ1dCByZWFkaW5nIHRoZSBoYXNoIHdhcyBub3QuIFNvbWV0aGluZyB3ZWlyZCBoYXBwZW5lZCxcbiAgICAgIC8vIGJ1dCBub3RoaW5nIHRoYXQgd291bGQgc3RvcCB0aGUgdXBkYXRlLiBKdXN0IGxvZyB0aGUgd2VpcmRuZXNzIGFuZCBjb250aW51ZS5cbiAgICAgIGxvZ2dlci5pbmZvKGAgIENvbW1pdHRlZCBtaWdyYXRpb24gc3RlcDogJHtzaG9ydE1lc3NhZ2V9LmApO1xuICAgICAgbG9nZ2VyLndhcm4oJyAgRmFpbGVkIHRvIGxvb2sgdXAgaGFzaCBvZiBtb3N0IHJlY2VudCBjb21taXQsIGNvbnRpbnVpbmcgYW55d2F5cy4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tDbGVhbkdpdCgpOiBib29sZWFuIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdG9wTGV2ZWwgPSBleGVjU3luYygnZ2l0IHJldi1wYXJzZSAtLXNob3ctdG9wbGV2ZWwnLCB7XG4gICAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICAgIHN0ZGlvOiAncGlwZScsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGV4ZWNTeW5jKCdnaXQgc3RhdHVzIC0tcG9yY2VsYWluJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pO1xuICAgICAgaWYgKHJlc3VsdC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IGZpbGVzIGluc2lkZSB0aGUgd29ya3NwYWNlIHJvb3QgYXJlIHJlbGV2YW50XG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHJlc3VsdC5zcGxpdCgnXFxuJykpIHtcbiAgICAgICAgY29uc3QgcmVsYXRpdmVFbnRyeSA9IHBhdGgucmVsYXRpdmUoXG4gICAgICAgICAgcGF0aC5yZXNvbHZlKHRoaXMuY29udGV4dC5yb290KSxcbiAgICAgICAgICBwYXRoLnJlc29sdmUodG9wTGV2ZWwudHJpbSgpLCBlbnRyeS5zbGljZSgzKS50cmltKCkpLFxuICAgICAgICApO1xuXG4gICAgICAgIGlmICghcmVsYXRpdmVFbnRyeS5zdGFydHNXaXRoKCcuLicpICYmICFwYXRoLmlzQWJzb2x1dGUocmVsYXRpdmVFbnRyeSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIHt9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIGN1cnJlbnQgaW5zdGFsbGVkIENMSSB2ZXJzaW9uIGlzIG9sZGVyIG9yIG5ld2VyIHRoYW4gYSBjb21wYXRpYmxlIHZlcnNpb24uXG4gICAqIEByZXR1cm5zIHRoZSB2ZXJzaW9uIHRvIGluc3RhbGwgb3IgbnVsbCB3aGVuIHRoZXJlIGlzIG5vIHVwZGF0ZSB0byBpbnN0YWxsLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBjaGVja0NMSVZlcnNpb24oXG4gICAgcGFja2FnZXNUb1VwZGF0ZTogc3RyaW5nW10gfCB1bmRlZmluZWQsXG4gICAgdmVyYm9zZSA9IGZhbHNlLFxuICAgIG5leHQgPSBmYWxzZSxcbiAgKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgeyB2ZXJzaW9uIH0gPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChcbiAgICAgIGBAYW5ndWxhci9jbGlAJHt0aGlzLmdldENMSVVwZGF0ZVJ1bm5lclZlcnNpb24ocGFja2FnZXNUb1VwZGF0ZSwgbmV4dCl9YCxcbiAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIsXG4gICAgICB7XG4gICAgICAgIHZlcmJvc2UsXG4gICAgICAgIHVzaW5nWWFybjogdGhpcy5jb250ZXh0LnBhY2thZ2VNYW5hZ2VyLm5hbWUgPT09IFBhY2thZ2VNYW5hZ2VyLllhcm4sXG4gICAgICB9LFxuICAgICk7XG5cbiAgICByZXR1cm4gVkVSU0lPTi5mdWxsID09PSB2ZXJzaW9uID8gbnVsbCA6IHZlcnNpb247XG4gIH1cblxuICBwcml2YXRlIGdldENMSVVwZGF0ZVJ1bm5lclZlcnNpb24oXG4gICAgcGFja2FnZXNUb1VwZGF0ZTogc3RyaW5nW10gfCB1bmRlZmluZWQsXG4gICAgbmV4dDogYm9vbGVhbixcbiAgKTogc3RyaW5nIHwgbnVtYmVyIHtcbiAgICBpZiAobmV4dCkge1xuICAgICAgcmV0dXJuICduZXh0JztcbiAgICB9XG5cbiAgICBjb25zdCB1cGRhdGluZ0FuZ3VsYXJQYWNrYWdlID0gcGFja2FnZXNUb1VwZGF0ZT8uZmluZCgocikgPT4gQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAudGVzdChyKSk7XG4gICAgaWYgKHVwZGF0aW5nQW5ndWxhclBhY2thZ2UpIHtcbiAgICAgIC8vIElmIHdlIGFyZSB1cGRhdGluZyBhbnkgQW5ndWxhciBwYWNrYWdlIHdlIGNhbiB1cGRhdGUgdGhlIENMSSB0byB0aGUgdGFyZ2V0IHZlcnNpb24gYmVjYXVzZVxuICAgICAgLy8gbWlncmF0aW9ucyBmb3IgQGFuZ3VsYXIvY29yZUAxMyBjYW4gYmUgZXhlY3V0ZWQgdXNpbmcgQW5ndWxhci9jbGlAMTMuXG4gICAgICAvLyBUaGlzIGlzIHNhbWUgYmVoYXZpb3VyIGFzIGBucHggQGFuZ3VsYXIvY2xpQDEzIHVwZGF0ZSBAYW5ndWxhci9jb3JlQDEzYC5cblxuICAgICAgLy8gYEBhbmd1bGFyL2NsaUAxM2AgLT4gWycnLCAnYW5ndWxhci9jbGknLCAnMTMnXVxuICAgICAgLy8gYEBhbmd1bGFyL2NsaWAgLT4gWycnLCAnYW5ndWxhci9jbGknXVxuICAgICAgY29uc3QgdGVtcFZlcnNpb24gPSBjb2VyY2VWZXJzaW9uTnVtYmVyKHVwZGF0aW5nQW5ndWxhclBhY2thZ2Uuc3BsaXQoJ0AnKVsyXSk7XG5cbiAgICAgIHJldHVybiBzZW12ZXIucGFyc2UodGVtcFZlcnNpb24pPy5tYWpvciA/PyAnbGF0ZXN0JztcbiAgICB9XG5cbiAgICAvLyBXaGVuIG5vdCB1cGRhdGluZyBhbiBBbmd1bGFyIHBhY2thZ2Ugd2UgY2Fubm90IGRldGVybWluZSB3aGljaCBzY2hlbWF0aWMgcnVudGltZSB0aGUgbWlncmF0aW9uIHNob3VsZCB0byBiZSBleGVjdXRlZCBpbi5cbiAgICAvLyBUeXBpY2FsbHksIHdlIGNhbiBhc3N1bWUgdGhhdCB0aGUgYEBhbmd1bGFyL2NsaWAgd2FzIHVwZGF0ZWQgcHJldmlvdXNseS5cbiAgICAvLyBFeGFtcGxlOiBBbmd1bGFyIG9mZmljaWFsIHBhY2thZ2VzIGFyZSB0eXBpY2FsbHkgdXBkYXRlZCBwcmlvciB0byBOR1JYIGV0Yy4uLlxuICAgIC8vIFRoZXJlZm9yZSwgd2Ugb25seSB1cGRhdGUgdG8gdGhlIGxhdGVzdCBwYXRjaCB2ZXJzaW9uIG9mIHRoZSBpbnN0YWxsZWQgbWFqb3IgdmVyc2lvbiBvZiB0aGUgQW5ndWxhciBDTEkuXG5cbiAgICAvLyBUaGlzIGlzIGltcG9ydGFudCBiZWNhdXNlIHdlIG1pZ2h0IGVuZCB1cCBpbiBhIHNjZW5hcmlvIHdoZXJlIGxvY2FsbHkgQW5ndWxhciB2MTIgaXMgaW5zdGFsbGVkLCB1cGRhdGluZyBOR1JYIGZyb20gMTEgdG8gMTIuXG4gICAgLy8gV2UgZW5kIHVwIHVzaW5nIEFuZ3VsYXIgQ2xJIHYxMyB0byBydW4gdGhlIG1pZ3JhdGlvbnMgaWYgd2UgcnVuIHRoZSBtaWdyYXRpb25zIHVzaW5nIHRoZSBDTEkgaW5zdGFsbGVkIG1ham9yIHZlcnNpb24gKyAxIGxvZ2ljLlxuICAgIHJldHVybiBWRVJTSU9OLm1ham9yO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBydW5UZW1wQmluYXJ5KHBhY2thZ2VOYW1lOiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdID0gW10pOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgc3VjY2VzcywgdGVtcE5vZGVNb2R1bGVzIH0gPSBhd2FpdCB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIuaW5zdGFsbFRlbXAocGFja2FnZU5hbWUpO1xuICAgIGlmICghc3VjY2Vzcykge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIHZlcnNpb24vdGFnIGV0Yy4uLiBmcm9tIHBhY2thZ2UgbmFtZVxuICAgIC8vIEV4OiBAYW5ndWxhci9jbGlAbGF0ZXN0IC0+IEBhbmd1bGFyL2NsaVxuICAgIGNvbnN0IHBhY2thZ2VOYW1lTm9WZXJzaW9uID0gcGFja2FnZU5hbWUuc3Vic3RyaW5nKDAsIHBhY2thZ2VOYW1lLmxhc3RJbmRleE9mKCdAJykpO1xuICAgIGNvbnN0IHBrZ0xvY2F0aW9uID0gam9pbih0ZW1wTm9kZU1vZHVsZXMsIHBhY2thZ2VOYW1lTm9WZXJzaW9uKTtcbiAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBqb2luKHBrZ0xvY2F0aW9uLCAncGFja2FnZS5qc29uJyk7XG5cbiAgICAvLyBHZXQgYSBiaW5hcnkgbG9jYXRpb24gZm9yIHRoaXMgcGFja2FnZVxuICAgIGxldCBiaW5QYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGV4aXN0c1N5bmMocGFja2FnZUpzb25QYXRoKSkge1xuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCwgJ3V0Zi04Jyk7XG4gICAgICBpZiAoY29udGVudCkge1xuICAgICAgICBjb25zdCB7IGJpbiA9IHt9IH0gPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICBjb25zdCBiaW5LZXlzID0gT2JqZWN0LmtleXMoYmluKTtcblxuICAgICAgICBpZiAoYmluS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICBiaW5QYXRoID0gcmVzb2x2ZShwa2dMb2NhdGlvbiwgYmluW2JpbktleXNbMF1dKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghYmluUGF0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgbG9jYXRlIGJpbiBmb3IgdGVtcG9yYXJ5IHBhY2thZ2U6ICR7cGFja2FnZU5hbWVOb1ZlcnNpb259LmApO1xuICAgIH1cblxuICAgIGNvbnN0IHsgc3RhdHVzLCBlcnJvciB9ID0gc3Bhd25TeW5jKHByb2Nlc3MuZXhlY1BhdGgsIFtiaW5QYXRoLCAuLi5hcmdzXSwge1xuICAgICAgc3RkaW86ICdpbmhlcml0JyxcbiAgICAgIGVudjoge1xuICAgICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgICAgTkdfRElTQUJMRV9WRVJTSU9OX0NIRUNLOiAndHJ1ZScsXG4gICAgICAgIE5HX0NMSV9BTkFMWVRJQ1M6ICdmYWxzZScsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKHN0YXR1cyA9PT0gbnVsbCAmJiBlcnJvcikge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXR1cyA/PyAwO1xuICB9XG5cbiAgcHJpdmF0ZSBwYWNrYWdlTWFuYWdlckZvcmNlKHZlcmJvc2U6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAvLyBucG0gNysgY2FuIGZhaWwgZHVlIHRvIGl0IGluY29ycmVjdGx5IHJlc29sdmluZyBwZWVyIGRlcGVuZGVuY2llcyB0aGF0IGhhdmUgdmFsaWQgU2VtVmVyXG4gICAgLy8gcmFuZ2VzIGR1cmluZyBhbiB1cGRhdGUuIFVwZGF0ZSB3aWxsIHNldCBjb3JyZWN0IHZlcnNpb25zIG9mIGRlcGVuZGVuY2llcyB3aXRoaW4gdGhlXG4gICAgLy8gcGFja2FnZS5qc29uIGZpbGUuIFRoZSBmb3JjZSBvcHRpb24gaXMgc2V0IHRvIHdvcmthcm91bmQgdGhlc2UgZXJyb3JzLlxuICAgIC8vIEV4YW1wbGUgZXJyb3I6XG4gICAgLy8gbnBtIEVSUiEgQ29uZmxpY3RpbmcgcGVlciBkZXBlbmRlbmN5OiBAYW5ndWxhci9jb21waWxlci1jbGlAMTQuMC4wLXJjLjBcbiAgICAvLyBucG0gRVJSISBub2RlX21vZHVsZXMvQGFuZ3VsYXIvY29tcGlsZXItY2xpXG4gICAgLy8gbnBtIEVSUiEgICBwZWVyIEBhbmd1bGFyL2NvbXBpbGVyLWNsaUBcIl4xNC4wLjAgfHwgXjE0LjAuMC1yY1wiIGZyb20gQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXJAMTQuMC4wLXJjLjBcbiAgICAvLyBucG0gRVJSISAgIG5vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhclxuICAgIC8vIG5wbSBFUlIhICAgICBkZXYgQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXJAXCJ+MTQuMC4wLXJjLjBcIiBmcm9tIHRoZSByb290IHByb2plY3RcbiAgICBpZiAoXG4gICAgICB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIubmFtZSA9PT0gUGFja2FnZU1hbmFnZXIuTnBtICYmXG4gICAgICB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIudmVyc2lvbiAmJlxuICAgICAgc2VtdmVyLmd0ZSh0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIudmVyc2lvbiwgJzcuMC4wJywgeyBpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZSB9KVxuICAgICkge1xuICAgICAgaWYgKHZlcmJvc2UpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKFxuICAgICAgICAgICdOUE0gNysgZGV0ZWN0ZWQgLS0gZW5hYmxpbmcgZm9yY2Ugb3B0aW9uIGZvciBwYWNrYWdlIGluc3RhbGxhdGlvbicsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIHdvcmtpbmcgZGlyZWN0b3J5IGhhcyBHaXQgY2hhbmdlcyB0byBjb21taXQuXG4gKi9cbmZ1bmN0aW9uIGhhc0NoYW5nZXNUb0NvbW1pdCgpOiBib29sZWFuIHtcbiAgLy8gTGlzdCBhbGwgbW9kaWZpZWQgZmlsZXMgbm90IGNvdmVyZWQgYnkgLmdpdGlnbm9yZS5cbiAgLy8gSWYgYW55IGZpbGVzIGFyZSByZXR1cm5lZCwgdGhlbiB0aGVyZSBtdXN0IGJlIHNvbWV0aGluZyB0byBjb21taXQuXG5cbiAgcmV0dXJuIGV4ZWNTeW5jKCdnaXQgbHMtZmlsZXMgLW0gLWQgLW8gLS1leGNsdWRlLXN0YW5kYXJkJykudG9TdHJpbmcoKSAhPT0gJyc7XG59XG5cbi8qKlxuICogUHJlY29uZGl0aW9uOiBNdXN0IGhhdmUgcGVuZGluZyBjaGFuZ2VzIHRvIGNvbW1pdCwgdGhleSBkbyBub3QgbmVlZCB0byBiZSBzdGFnZWQuXG4gKiBQb3N0Y29uZGl0aW9uOiBUaGUgR2l0IHdvcmtpbmcgdHJlZSBpcyBjb21taXR0ZWQgYW5kIHRoZSByZXBvIGlzIGNsZWFuLlxuICogQHBhcmFtIG1lc3NhZ2UgVGhlIGNvbW1pdCBtZXNzYWdlIHRvIHVzZS5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQ29tbWl0KG1lc3NhZ2U6IHN0cmluZykge1xuICAvLyBTdGFnZSBlbnRpcmUgd29ya2luZyB0cmVlIGZvciBjb21taXQuXG4gIGV4ZWNTeW5jKCdnaXQgYWRkIC1BJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pO1xuXG4gIC8vIENvbW1pdCB3aXRoIHRoZSBtZXNzYWdlIHBhc3NlZCB2aWEgc3RkaW4gdG8gYXZvaWQgYmFzaCBlc2NhcGluZyBpc3N1ZXMuXG4gIGV4ZWNTeW5jKCdnaXQgY29tbWl0IC0tbm8tdmVyaWZ5IC1GIC0nLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScsIGlucHV0OiBtZXNzYWdlIH0pO1xufVxuXG4vKipcbiAqIEByZXR1cm4gVGhlIEdpdCBTSEEgaGFzaCBvZiB0aGUgSEVBRCBjb21taXQuIFJldHVybnMgbnVsbCBpZiB1bmFibGUgdG8gcmV0cmlldmUgdGhlIGhhc2guXG4gKi9cbmZ1bmN0aW9uIGZpbmRDdXJyZW50R2l0U2hhKCk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBleGVjU3luYygnZ2l0IHJldi1wYXJzZSBIRUFEJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pLnRyaW0oKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U2hvcnRIYXNoKGNvbW1pdEhhc2g6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBjb21taXRIYXNoLnNsaWNlKDAsIDkpO1xufVxuXG5mdW5jdGlvbiBjb2VyY2VWZXJzaW9uTnVtYmVyKHZlcnNpb246IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmICghdmVyc2lvbikge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAoIS9eXFxkezEsMzB9XFwuXFxkezEsMzB9XFwuXFxkezEsMzB9Ly50ZXN0KHZlcnNpb24pKSB7XG4gICAgY29uc3QgbWF0Y2ggPSB2ZXJzaW9uLm1hdGNoKC9eXFxkezEsMzB9KFxcLlxcZHsxLDMwfSkqLyk7XG5cbiAgICBpZiAoIW1hdGNoKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICghbWF0Y2hbMV0pIHtcbiAgICAgIHZlcnNpb24gPSB2ZXJzaW9uLnN1YnN0cmluZygwLCBtYXRjaFswXS5sZW5ndGgpICsgJy4wLjAnICsgdmVyc2lvbi5zdWJzdHJpbmcobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICB9IGVsc2UgaWYgKCFtYXRjaFsyXSkge1xuICAgICAgdmVyc2lvbiA9IHZlcnNpb24uc3Vic3RyaW5nKDAsIG1hdGNoWzBdLmxlbmd0aCkgKyAnLjAnICsgdmVyc2lvbi5zdWJzdHJpbmcobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gc2VtdmVyLnZhbGlkKHZlcnNpb24pID8/IHVuZGVmaW5lZDtcbn1cbiJdfQ==