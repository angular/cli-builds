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
const error_1 = require("../../utilities/error");
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
                (0, error_1.assertIsError)(e);
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
                (0, error_1.assertIsError)(e);
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
                (0, error_1.assertIsError)(e);
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
                (0, error_1.assertIsError)(e);
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
                    (0, error_1.assertIsError)(e);
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
                                (0, error_1.assertIsError)(e);
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
                        (0, error_1.assertIsError)(e);
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
                    (0, error_1.assertIsError)(e);
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
                        (0, error_1.assertIsError)(e);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3VwZGF0ZS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwyREFBMkU7QUFDM0UsNERBQWdFO0FBQ2hFLGlEQUFzRTtBQUN0RSwyQkFBZ0Q7QUFDaEQsc0VBQWtDO0FBQ2xDLDBFQUE2QztBQUM3QywyQ0FBNkI7QUFDN0IsK0JBQXFDO0FBQ3JDLCtDQUFpQztBQUVqQywyRUFBc0U7QUFDdEUseUVBSzhDO0FBQzlDLGlHQUE0RjtBQUM1RiwyRkFBeUY7QUFDekYsaURBQStDO0FBQy9DLDZFQUEwRTtBQUMxRSxpREFBc0Q7QUFDdEQsdURBQStEO0FBQy9ELHVFQUswQztBQUMxQywrREFLc0M7QUFDdEMscURBQWtEO0FBZWxELE1BQU0sdUJBQXVCLEdBQUcsNkJBQTZCLENBQUM7QUFDOUQsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO0FBRXRGLE1BQWEsbUJBQW9CLFNBQVEsOEJBQWdDO0lBQXpFOztRQUNXLFVBQUssR0FBRyw2QkFBWSxDQUFDLEVBQUUsQ0FBQztRQUNkLDBCQUFxQixHQUFHLEtBQUssQ0FBQztRQUVqRCxZQUFPLEdBQUcscUJBQXFCLENBQUM7UUFDaEMsYUFBUSxHQUFHLDhFQUE4RSxDQUFDO1FBQzFGLHdCQUFtQixHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBczZCL0QsQ0FBQztJQXA2QkMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVTthQUNkLFVBQVUsQ0FBQyxVQUFVLEVBQUU7WUFDdEIsV0FBVyxFQUFFLG9DQUFvQztZQUNqRCxJQUFJLEVBQUUsUUFBUTtZQUNkLEtBQUssRUFBRSxJQUFJO1NBQ1osQ0FBQzthQUNELE1BQU0sQ0FBQyxPQUFPLEVBQUU7WUFDZixXQUFXLEVBQUUsNENBQTRDO1lBQ3pELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDO2FBQ0QsTUFBTSxDQUFDLE1BQU0sRUFBRTtZQUNkLFdBQVcsRUFBRSxxREFBcUQ7WUFDbEUsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFNLENBQUMsY0FBYyxFQUFFO1lBQ3RCLFdBQVcsRUFBRSxnRUFBZ0U7WUFDN0UsSUFBSSxFQUFFLFNBQVM7U0FDaEIsQ0FBQzthQUNELE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDZCxXQUFXLEVBQ1Qsb0NBQW9DO2dCQUNwQywwRkFBMEY7WUFDNUYsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUM7WUFDekIsU0FBUyxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztTQUMxQixDQUFDO2FBQ0QsTUFBTSxDQUFDLE1BQU0sRUFBRTtZQUNkLFdBQVcsRUFDVCxzQ0FBc0M7Z0JBQ3RDLG1GQUFtRjtZQUNyRixJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUM7WUFDL0IsU0FBUyxFQUFFLENBQUMsTUFBTSxDQUFDO1NBQ3BCLENBQUM7YUFDRCxNQUFNLENBQUMsSUFBSSxFQUFFO1lBQ1osUUFBUSxFQUNOLCtGQUErRjtnQkFDL0Ysa0hBQWtIO1lBQ3BILElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQztZQUNqQyxTQUFTLEVBQUUsQ0FBQyxNQUFNLENBQUM7U0FDcEIsQ0FBQzthQUNELE1BQU0sQ0FBQyxhQUFhLEVBQUU7WUFDckIsUUFBUSxFQUNOLHFGQUFxRjtZQUN2RixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQzthQUNELE1BQU0sQ0FBQyxTQUFTLEVBQUU7WUFDakIsUUFBUSxFQUFFLHdFQUF3RTtZQUNsRixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQzthQUNELE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRTtZQUN4QixRQUFRLEVBQUUsMkRBQTJEO1lBQ3JFLElBQUksRUFBRSxTQUFTO1lBQ2YsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDO1lBQ1osT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDO2FBQ0QsS0FBSyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRTtZQUM5RSxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUVoQyxvRUFBb0U7WUFDcEUsSUFBSSxDQUFBLFFBQVEsYUFBUixRQUFRLHVCQUFSLFFBQVEsQ0FBRSxNQUFNLEtBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUU7Z0JBQzdDLElBQUksVUFBVSxFQUFFO29CQUNkLE1BQU0sQ0FBQyxJQUFJLENBQ1Qsa0ZBQWtGLENBQ25GLENBQUM7aUJBQ0g7cUJBQU07b0JBQ0wsTUFBTSxJQUFJLG1DQUFrQixDQUMxQiw4RUFBOEUsQ0FDL0UsQ0FBQztpQkFDSDthQUNGO1lBRUQsSUFBSSxXQUFXLEVBQUU7Z0JBQ2YsSUFBSSxDQUFBLFFBQVEsYUFBUixRQUFRLHVCQUFSLFFBQVEsQ0FBRSxNQUFNLE1BQUssQ0FBQyxFQUFFO29CQUMxQixNQUFNLElBQUksbUNBQWtCLENBQzFCLDBFQUEwRSxDQUMzRSxDQUFDO2lCQUNIO2FBQ0Y7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQzthQUNELE1BQU0sRUFBRSxDQUFDO0lBQ2QsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBbUM7O1FBQzNDLE1BQU0sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUVoRCxjQUFjLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUVyQywwRkFBMEY7UUFDMUYsSUFBSSxDQUFDLHlDQUFtQixFQUFFO1lBQ3hCLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUNwRCxPQUFPLENBQUMsUUFBUSxFQUNoQixPQUFPLENBQUMsT0FBTyxFQUNmLE9BQU8sQ0FBQyxJQUFJLENBQ2IsQ0FBQztZQUVGLElBQUksbUJBQW1CLEVBQUU7Z0JBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQ1Qsa0RBQWtEO29CQUNoRCxnREFBZ0QsbUJBQW1CLHlCQUF5QixDQUMvRixDQUFDO2dCQUVGLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsbUJBQW1CLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3pGO1NBQ0Y7UUFFRCxNQUFNLFFBQVEsR0FBd0IsRUFBRSxDQUFDO1FBQ3pDLEtBQUssTUFBTSxPQUFPLElBQUksTUFBQSxPQUFPLENBQUMsUUFBUSxtQ0FBSSxFQUFFLEVBQUU7WUFDNUMsSUFBSTtnQkFDRixNQUFNLGlCQUFpQixHQUFHLElBQUEseUJBQUcsRUFBQyxPQUFPLENBQUMsQ0FBQztnQkFFdkMsMENBQTBDO2dCQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFO29CQUMvQixNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksT0FBTyx3Q0FBd0MsQ0FBQyxDQUFDO29CQUUxRSxPQUFPLENBQUMsQ0FBQztpQkFDVjtnQkFFRCxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQzNELE1BQU0sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLGlCQUFpQixDQUFDLElBQUksY0FBYyxDQUFDLENBQUM7b0JBRXpFLE9BQU8sQ0FBQyxDQUFDO2lCQUNWO2dCQUVELElBQUksT0FBTyxDQUFDLFdBQVcsSUFBSSxpQkFBaUIsQ0FBQyxPQUFPLEVBQUU7b0JBQ3BELE1BQU0sQ0FBQyxJQUFJLENBQUMsbUVBQW1FLENBQUMsQ0FBQztpQkFDbEY7Z0JBRUQsaUVBQWlFO2dCQUNqRSxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUU7b0JBQzlDLGlCQUFpQixDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUM7aUJBQ3RDO2dCQUVELFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQXNDLENBQUMsQ0FBQzthQUN2RDtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLElBQUEscUJBQWEsRUFBQyxDQUFDLENBQUMsQ0FBQztnQkFDakIsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBRXhCLE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7U0FDRjtRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLGNBQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMxRSxNQUFNLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFFcEQsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLElBQUEscUNBQXNCLEVBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6RSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsZ0JBQWdCLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDO1FBRTVELE1BQU0sUUFBUSxHQUFHLElBQUksb0JBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRTtZQUNuRCxjQUFjLEVBQUUsY0FBYyxDQUFDLElBQUk7WUFDbkMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDOUQsMERBQTBEO1lBQzFELGlFQUFpRTtZQUNqRSxZQUFZLEVBQUUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDNUMsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixpQkFBaUIsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSwyQ0FBbUIsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO1NBQzlFLENBQUMsQ0FBQztRQUVILElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDekIsY0FBYztZQUNkLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FDN0MsUUFBUSxFQUNSLDJCQUEyQixFQUMzQixRQUFRLEVBQ1I7Z0JBQ0UsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO2dCQUNwQixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7Z0JBQ2xCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztnQkFDeEIsY0FBYyxFQUFFLGNBQWMsQ0FBQyxJQUFJO2dCQUNuQyxRQUFRLEVBQUUsRUFBRTthQUNiLENBQ0YsQ0FBQztZQUVGLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN4QjtRQUVELE9BQU8sT0FBTyxDQUFDLFdBQVc7WUFDeEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBQSxPQUFPLENBQUMsUUFBUSxtQ0FBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLENBQUM7WUFDcEYsQ0FBQyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ25GLENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCLENBQzVCLFFBQXNCLEVBQ3RCLFVBQWtCLEVBQ2xCLFNBQWlCLEVBQ2pCLFVBQW1DLEVBQUU7UUFFckMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDaEMsTUFBTSxvQkFBb0IsR0FBRyxJQUFBLHdDQUFtQixFQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVuRSxvREFBb0Q7UUFDcEQsSUFBSTtZQUNGLE1BQU0sUUFBUTtpQkFDWCxPQUFPLENBQUM7Z0JBQ1AsVUFBVTtnQkFDVixTQUFTO2dCQUNULE9BQU87Z0JBQ1AsTUFBTTthQUNQLENBQUM7aUJBQ0QsU0FBUyxFQUFFLENBQUM7WUFFZixPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUNwRjtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsSUFBSSxDQUFDLFlBQVksMENBQTZCLEVBQUU7Z0JBQzlDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxjQUFNLENBQUMsT0FBTyxDQUFDLEtBQUsscURBQXFELENBQUMsQ0FBQzthQUM1RjtpQkFBTTtnQkFDTCxJQUFBLHFCQUFhLEVBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pCLE1BQU0sT0FBTyxHQUFHLElBQUEsOEJBQW1CLEVBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU0sQ0FBQyxLQUFLLENBQ1YsR0FBRyxjQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssc0JBQXNCLENBQUMsQ0FBQyxPQUFPLElBQUk7b0JBQ3hELFVBQVUsT0FBTywwQkFBMEIsQ0FDOUMsQ0FBQzthQUNIO1lBRUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFDO1NBQzlEO2dCQUFTO1lBQ1Isb0JBQW9CLENBQUMsV0FBVyxFQUFFLENBQUM7U0FDcEM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxLQUFLLENBQUMsZ0JBQWdCLENBQzVCLFFBQXNCLEVBQ3RCLFdBQW1CLEVBQ25CLGNBQXNCLEVBQ3RCLGFBQXFCLEVBQ3JCLE1BQWdCO1FBRWhCLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ2hDLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDcEUsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLGtCQUFrQixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssYUFBYSxDQUFDLENBQUM7UUFDcEYsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNULE1BQU0sQ0FBQyxLQUFLLENBQUMsMEJBQTBCLGFBQWEsU0FBUyxXQUFXLElBQUksQ0FBQyxDQUFDO1lBRTlFLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLGFBQWEsaUJBQWlCLFdBQVcsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUM3RixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFcEUsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMvRixDQUFDO0lBRUQ7O09BRUc7SUFDSyxLQUFLLENBQUMsaUJBQWlCLENBQzdCLFFBQXNCLEVBQ3RCLFdBQW1CLEVBQ25CLGNBQXNCLEVBQ3RCLElBQVksRUFDWixFQUFVLEVBQ1YsTUFBZ0I7UUFFaEIsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNwRSxNQUFNLGNBQWMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQ3JDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDOUYsQ0FBQztRQUNGLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQztRQUV0QixLQUFLLE1BQU0sSUFBSSxJQUFJLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFO1lBQ2xELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNwRSxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsV0FFN0IsQ0FBQztZQUNGLFdBQVcsQ0FBQyxPQUFPLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9ELElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFO2dCQUN4QixTQUFTO2FBQ1Y7WUFFRCxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFO2dCQUN0RixVQUFVLENBQUMsSUFBSSxDQUFDLFdBQWlFLENBQUMsQ0FBQzthQUNwRjtTQUNGO1FBRUQsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMzQixPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFaEcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUN0QixjQUFNLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxXQUFXLFFBQVEsQ0FBQyxDQUN4RSxDQUFDO1FBRUYsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbEYsQ0FBQztJQUVPLEtBQUssQ0FBQyx3QkFBd0IsQ0FDcEMsUUFBc0IsRUFDdEIsVUFBeUYsRUFDekYsV0FBbUIsRUFDbkIsTUFBTSxHQUFHLEtBQUs7UUFFZCxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUNoQyxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRTtZQUNsQyxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsV0FBVyxDQUFDLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFbEUsTUFBTSxDQUFDLElBQUksQ0FDVCxjQUFNLENBQUMsSUFBSSxDQUFDLGNBQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO2dCQUNqQyxHQUFHO2dCQUNILGNBQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQ3pELENBQUM7WUFFRixJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3RCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzthQUMvQztZQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUN4QyxRQUFRLEVBQ1IsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQ3pCLFNBQVMsQ0FBQyxJQUFJLENBQ2YsQ0FBQztZQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO2dCQUNuQixPQUFPLENBQUMsQ0FBQzthQUNWO1lBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBRXRDLG1CQUFtQjtZQUNuQixJQUFJLE1BQU0sRUFBRTtnQkFDVixNQUFNLFlBQVksR0FBRyxHQUFHLFdBQVcsZ0JBQWdCLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDcEUsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLFdBQVc7b0JBQ3pDLENBQUMsQ0FBQyxHQUFHLFlBQVksT0FBTyxTQUFTLENBQUMsV0FBVyxFQUFFO29CQUMvQyxDQUFDLENBQUMsWUFBWSxDQUFDO2dCQUNqQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUM3QyxJQUFJLENBQUMsU0FBUyxFQUFFO29CQUNkLDREQUE0RDtvQkFDNUQsT0FBTyxDQUFDLENBQUM7aUJBQ1Y7YUFDRjtZQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQywwQkFBMEI7U0FDNUM7UUFFRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVyxDQUN2QixRQUFzQixFQUN0QixXQUFtQixFQUNuQixnQkFBOEMsRUFDOUMsT0FBbUM7UUFFbkMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDaEMsTUFBTSxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDNUQsSUFBSSxXQUFXLEdBQUcsaUJBQWlCLGFBQWpCLGlCQUFpQix1QkFBakIsaUJBQWlCLENBQUUsSUFBSSxDQUFDO1FBQzFDLElBQUksV0FBVyxHQUFHLGlCQUFpQixhQUFqQixpQkFBaUIsdUJBQWpCLGlCQUFpQixDQUFFLE9BQU8sQ0FBQztRQUM3QyxJQUFJLGlCQUFpQixJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ3JDLE1BQU0sQ0FBQyxLQUFLLENBQUMscURBQXFELENBQUMsQ0FBQztZQUVwRSxPQUFPLENBQUMsQ0FBQztTQUNWO2FBQU0sSUFBSSxDQUFDLGlCQUFpQixFQUFFO1lBQzdCLGtFQUFrRTtZQUNsRSxvREFBb0Q7WUFDcEQsNEVBQTRFO1lBQzVFLE1BQU0sV0FBVyxHQUFHLElBQUEsOEJBQWUsRUFBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztZQUNwRSxJQUFJLFdBQVcsRUFBRTtnQkFDZixXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDeEMsV0FBVyxHQUFHLE1BQU0sSUFBQSw4QkFBZSxFQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQ2xEO1NBQ0Y7UUFFRCxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ2hDLE1BQU0sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUUxQyxPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2hELElBQUksVUFBVSxHQUFHLGNBQWMsYUFBZCxjQUFjLHVCQUFkLGNBQWMsQ0FBRSxVQUFVLENBQUM7UUFDNUMsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO1lBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0NBQXNDLENBQUMsQ0FBQztZQUVyRCxPQUFPLENBQUMsQ0FBQztTQUNWO2FBQU0sSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLEVBQUU7WUFDekMsTUFBTSxDQUFDLEtBQUssQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO1lBRS9ELE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7YUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ2pGLE1BQU0sQ0FBQyxLQUFLLENBQ1YsaUZBQWlGLENBQ2xGLENBQUM7WUFFRixPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsb0JBQW9CO1FBQ3BCLFVBQVUsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUU1QyxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDaEMsTUFBTSxDQUFDLEtBQUssQ0FDVixpR0FBaUcsQ0FDbEcsQ0FBQztZQUVGLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFFRCwwQ0FBMEM7UUFDMUMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDM0QsSUFBSSxJQUFBLGVBQVUsRUFBQyxlQUFlLENBQUMsRUFBRTtZQUMvQixVQUFVLEdBQUcsZUFBZSxDQUFDO1NBQzlCO2FBQU07WUFDTCx3Q0FBd0M7WUFDeEMsNENBQTRDO1lBQzVDLElBQUk7Z0JBQ0YsVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3BFO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsSUFBQSxxQkFBYSxFQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqQixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssa0JBQWtCLEVBQUU7b0JBQ2pDLE1BQU0sQ0FBQyxLQUFLLENBQUMsd0NBQXdDLENBQUMsQ0FBQztpQkFDeEQ7cUJBQU07b0JBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7aUJBQzNFO2dCQUVELE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7U0FDRjtRQUVELElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUNoQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FDMUIsUUFBUSxFQUNSLFdBQVcsRUFDWCxVQUFVLEVBQ1YsT0FBTyxDQUFDLElBQUksRUFDWixPQUFPLENBQUMsYUFBYSxDQUN0QixDQUFDO1NBQ0g7UUFFRCxNQUFNLElBQUksR0FBRyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNULE1BQU0sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLE9BQU8sQ0FBQyxJQUFJLDJCQUEyQixDQUFDLENBQUM7WUFFdkUsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUMzQixRQUFRLEVBQ1IsV0FBVyxFQUNYLFVBQVUsRUFDVixJQUFJLEVBQ0osT0FBTyxDQUFDLEVBQUUsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUNqQyxPQUFPLENBQUMsYUFBYSxDQUN0QixDQUFDO0lBQ0osQ0FBQztJQUVELGtEQUFrRDtJQUMxQyxLQUFLLENBQUMsd0JBQXdCLENBQ3BDLFFBQXNCLEVBQ3RCLGdCQUE4QyxFQUM5QyxPQUFtQyxFQUNuQyxRQUE2Qjs7UUFFN0IsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFFaEMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxPQUFlLEVBQUUsRUFBRTtZQUNyQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7Z0JBQ25CLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDdEI7UUFDSCxDQUFDLENBQUM7UUFFRixNQUFNLFFBQVEsR0FHUixFQUFFLENBQUM7UUFFVCx1REFBdUQ7UUFDdkQsS0FBSyxNQUFNLEdBQUcsSUFBSSxRQUFRLEVBQUU7WUFDMUIsTUFBTSxJQUFJLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsQ0FBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsT0FBTyxDQUFBLEVBQUU7Z0JBQ2xCLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLENBQUMsSUFBSSx3QkFBd0IsQ0FBQyxDQUFDO2dCQUUzRCxPQUFPLENBQUMsQ0FBQzthQUNWO1lBRUQsOEVBQThFO1lBQzlFLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEtBQUssR0FBRyxDQUFDLFNBQVMsRUFBRTtnQkFDcEUsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxJQUFJLG9CQUFvQixHQUFHLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQztnQkFDdkUsU0FBUzthQUNWO1lBRUQsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztTQUMxQztRQUVELElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDekIsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsK0NBQStDLENBQUMsQ0FBQztRQUU3RCxNQUFNLGdCQUFnQixHQUFhLEVBQUUsQ0FBQztRQUN0QyxLQUFLLE1BQU0sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLElBQUksUUFBUSxFQUFFO1lBQzlELE1BQU0sV0FBVyxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQztZQUUzQyxJQUFJLFFBQVEsQ0FBQztZQUNiLElBQUk7Z0JBQ0YsMkVBQTJFO2dCQUMzRSxnREFBZ0Q7Z0JBQ2hELFFBQVEsR0FBRyxNQUFNLElBQUEsdUNBQW9CLEVBQUMsV0FBVyxFQUFFLE1BQU0sRUFBRTtvQkFDekQsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO2lCQUN6QixDQUFDLENBQUM7YUFDSjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLElBQUEscUJBQWEsRUFBQyxDQUFDLENBQUMsQ0FBQztnQkFDakIsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsV0FBVyxLQUFLLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUUzRSxPQUFPLENBQUMsQ0FBQzthQUNWO1lBRUQsOEVBQThFO1lBQzlFLDZEQUE2RDtZQUM3RCxJQUFJLFFBQXFDLENBQUM7WUFDMUMsSUFDRSxpQkFBaUIsQ0FBQyxJQUFJLEtBQUssU0FBUztnQkFDcEMsaUJBQWlCLENBQUMsSUFBSSxLQUFLLE9BQU87Z0JBQ2xDLGlCQUFpQixDQUFDLElBQUksS0FBSyxLQUFLLEVBQ2hDO2dCQUNBLElBQUk7b0JBQ0YsUUFBUSxHQUFHLElBQUEsMkJBQVksRUFBQyxRQUFRLEVBQUUsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQ2hFO2dCQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNWLElBQUEscUJBQWEsRUFBQyxDQUFDLENBQUMsQ0FBQztvQkFDakIsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTt3QkFDeEIsbUZBQW1GO3dCQUNuRixtQ0FBbUM7d0JBQ25DLElBQ0UsaUJBQWlCLENBQUMsSUFBSSxLQUFLLEtBQUs7NEJBQ2hDLGlCQUFpQixDQUFDLFNBQVMsS0FBSyxNQUFNOzRCQUN0QyxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFDMUI7NEJBQ0EsSUFBSTtnQ0FDRixRQUFRLEdBQUcsSUFBQSwyQkFBWSxFQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQzs2QkFDN0M7NEJBQUMsT0FBTyxDQUFDLEVBQUU7Z0NBQ1YsSUFBQSxxQkFBYSxFQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUNqQixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssU0FBUyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssYUFBYSxFQUFFO29DQUNwRCxNQUFNLENBQUMsQ0FBQztpQ0FDVDs2QkFDRjt5QkFDRjtxQkFDRjt5QkFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssYUFBYSxFQUFFO3dCQUNuQyxNQUFNLENBQUMsQ0FBQztxQkFDVDtpQkFDRjthQUNGO1lBRUQsSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDYixNQUFNLENBQUMsS0FBSyxDQUNWLHlCQUF5QixpQkFBaUIsQ0FBQyxHQUFHLHVDQUF1QyxDQUN0RixDQUFDO2dCQUVGLE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7WUFFRCxJQUFJLFFBQVEsQ0FBQyxPQUFPLE1BQUssTUFBQSxJQUFJLENBQUMsT0FBTywwQ0FBRSxPQUFPLENBQUEsRUFBRTtnQkFDOUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLFdBQVcsMEJBQTBCLENBQUMsQ0FBQztnQkFDL0QsU0FBUzthQUNWO1lBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNuRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7Z0JBQ3ZDLE1BQU0seUJBQXlCLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbEUsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRW5ELElBQUkseUJBQXlCLEdBQUcsbUJBQW1CLEdBQUcsQ0FBQyxFQUFFO29CQUN2RCxrREFBa0Q7b0JBQ2xELElBQUksbUJBQW1CLEdBQUcsQ0FBQyxFQUFFO3dCQUMzQixtRUFBbUU7d0JBQ25FLDhFQUE4RTt3QkFDOUUsTUFBTSxDQUFDLEtBQUssQ0FDVix3Q0FBd0MsSUFBSSwrRUFBK0U7NEJBQ3pILGdGQUFnRixDQUNuRixDQUFDO3FCQUNIO3lCQUFNO3dCQUNMLE1BQU0sMkJBQTJCLEdBQUcsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDO3dCQUU1RCxNQUFNLENBQUMsS0FBSyxDQUNWLHdDQUF3QyxJQUFJLCtFQUErRTs0QkFDekgsa0JBQWtCLElBQUksSUFBSSwyQkFBMkIsZ0NBQWdDOzRCQUNyRix3QkFBd0IsMkJBQTJCLG1CQUFtQixJQUFJLFFBQVE7NEJBQ2xGLG1GQUFtRixtQkFBbUIsTUFBTSwyQkFBMkIsSUFBSSxDQUM5SSxDQUFDO3FCQUNIO29CQUVELE9BQU8sQ0FBQyxDQUFDO2lCQUNWO2FBQ0Y7WUFFRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztTQUNyRDtRQUVELElBQUksZ0JBQWdCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNqQyxPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUM3QyxRQUFRLEVBQ1IsMkJBQTJCLEVBQzNCLFFBQVEsRUFDUjtZQUNFLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztZQUN4QixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7WUFDcEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ2xCLGNBQWMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJO1lBQ2hELFFBQVEsRUFBRSxnQkFBZ0I7U0FDM0IsQ0FDRixDQUFDO1FBRUYsSUFBSSxPQUFPLEVBQUU7WUFDWCxJQUFJO2dCQUNGLE1BQU0sYUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxFQUFFO29CQUN4RCxLQUFLLEVBQUUsSUFBSTtvQkFDWCxTQUFTLEVBQUUsSUFBSTtvQkFDZixVQUFVLEVBQUUsQ0FBQztpQkFDZCxDQUFDLENBQUM7YUFDSjtZQUFDLFdBQU0sR0FBRTtZQUVWLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQ3RFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFDNUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQ2xCLENBQUM7WUFFRixJQUFJLENBQUMsbUJBQW1CLEVBQUU7Z0JBQ3hCLE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7U0FDRjtRQUVELElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxhQUFhLEVBQUU7WUFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMscUNBQXFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ3BGLE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7U0FDRjtRQUVELDJGQUEyRjtRQUMzRiw4REFBOEQ7UUFDOUQsTUFBTSxVQUFVLEdBQUksTUFBYyxDQUFDLGtCQUtoQyxDQUFDO1FBRUosSUFBSSxPQUFPLElBQUksVUFBVSxFQUFFO1lBQ3pCLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFO2dCQUNsQyw4RkFBOEY7Z0JBQzlGLHlCQUF5QjtnQkFDekIsSUFBSSxXQUFXLENBQUM7Z0JBQ2hCLFVBQVUsQ0FDUixnQ0FBZ0MsU0FBUyxDQUFDLE9BQU8sV0FBVyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUNwRixDQUFDO2dCQUNGLElBQUk7b0JBQ0YsSUFBSTt3QkFDRixXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU87d0JBQ3hCLHdFQUF3RTt3QkFDeEUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLEVBQUU7NEJBQzVELEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO3lCQUMzQixDQUFDLENBQ0gsQ0FBQztxQkFDSDtvQkFBQyxPQUFPLENBQUMsRUFBRTt3QkFDVixJQUFBLHFCQUFhLEVBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2pCLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxrQkFBa0IsRUFBRTs0QkFDakMsK0RBQStEOzRCQUMvRCxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7eUJBQ2xGOzZCQUFNOzRCQUNMLE1BQU0sQ0FBQyxDQUFDO3lCQUNUO3FCQUNGO2lCQUNGO2dCQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNWLElBQUEscUJBQWEsRUFBQyxDQUFDLENBQUMsQ0FBQztvQkFDakIsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLGtCQUFrQixFQUFFO3dCQUNqQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7d0JBQ3pCLE1BQU0sQ0FBQyxLQUFLLENBQ1YsMkJBQTJCLFNBQVMsQ0FBQyxPQUFPLG1CQUFtQjs0QkFDN0QsbURBQW1ELENBQ3RELENBQUM7cUJBQ0g7eUJBQU07d0JBQ0wsTUFBTSxDQUFDLEtBQUssQ0FDViw2Q0FBNkMsU0FBUyxDQUFDLE9BQU8sUUFBUSxDQUFDLENBQUMsT0FBTyxHQUFHLENBQ25GLENBQUM7cUJBQ0g7b0JBRUQsT0FBTyxDQUFDLENBQUM7aUJBQ1Y7Z0JBRUQsSUFBSSxVQUFVLENBQUM7Z0JBRWYsMENBQTBDO2dCQUMxQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3JFLElBQUksSUFBQSxlQUFVLEVBQUMsZUFBZSxDQUFDLEVBQUU7b0JBQy9CLFVBQVUsR0FBRyxlQUFlLENBQUM7aUJBQzlCO3FCQUFNO29CQUNMLHdDQUF3QztvQkFDeEMsNENBQTRDO29CQUM1QyxJQUFJO3dCQUNGLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQzlFO29CQUFDLE9BQU8sQ0FBQyxFQUFFO3dCQUNWLElBQUEscUJBQWEsRUFBQyxDQUFDLENBQUMsQ0FBQzt3QkFDakIsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLGtCQUFrQixFQUFFOzRCQUNqQyxNQUFNLENBQUMsS0FBSyxDQUFDLDJCQUEyQixTQUFTLENBQUMsT0FBTyxtQkFBbUIsQ0FBQyxDQUFDO3lCQUMvRTs2QkFBTTs0QkFDTCxNQUFNLENBQUMsS0FBSyxDQUNWLDZDQUE2QyxTQUFTLENBQUMsT0FBTyxRQUFRLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FDbkYsQ0FBQzt5QkFDSDt3QkFFRCxPQUFPLENBQUMsQ0FBQztxQkFDVjtpQkFDRjtnQkFDRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FDekMsUUFBUSxFQUNSLFNBQVMsQ0FBQyxPQUFPLEVBQ2pCLFVBQVUsRUFDVixTQUFTLENBQUMsSUFBSSxFQUNkLFNBQVMsQ0FBQyxFQUFFLEVBQ1osT0FBTyxDQUFDLGFBQWEsQ0FDdEIsQ0FBQztnQkFFRiw2REFBNkQ7Z0JBQzdELElBQUksTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDaEIsT0FBTyxNQUFNLENBQUM7aUJBQ2Y7YUFDRjtTQUNGO1FBRUQsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFDRDs7T0FFRztJQUNLLE1BQU0sQ0FBQyxPQUFlO1FBQzVCLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBRWhDLCtCQUErQjtRQUMvQixJQUFJLFlBQXFCLENBQUM7UUFDMUIsSUFBSTtZQUNGLFlBQVksR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1NBQ3JDO1FBQUMsT0FBTyxHQUFHLEVBQUU7WUFDWixNQUFNLENBQUMsS0FBSyxDQUFDLCtCQUFnQyxHQUFnQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFFeEYsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUVELElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDakIsTUFBTSxDQUFDLElBQUksQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1lBRXZELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxxQ0FBcUM7UUFDckMsSUFBSTtZQUNGLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUN2QjtRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ1osTUFBTSxDQUFDLEtBQUssQ0FDViw0QkFBNEIsT0FBTyxPQUFRLEdBQWdDLENBQUMsTUFBTSxFQUFFLENBQ3JGLENBQUM7WUFFRixPQUFPLEtBQUssQ0FBQztTQUNkO1FBRUQsNkJBQTZCO1FBQzdCLE1BQU0sSUFBSSxHQUFHLGlCQUFpQixFQUFFLENBQUM7UUFDakMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1QyxJQUFJLElBQUksRUFBRTtZQUNSLE1BQU0sQ0FBQyxJQUFJLENBQUMsK0JBQStCLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDO1NBQ3JGO2FBQU07WUFDTCxpRkFBaUY7WUFDakYsK0VBQStFO1lBQy9FLE1BQU0sQ0FBQyxJQUFJLENBQUMsK0JBQStCLFlBQVksR0FBRyxDQUFDLENBQUM7WUFDNUQsTUFBTSxDQUFDLElBQUksQ0FBQyxxRUFBcUUsQ0FBQyxDQUFDO1NBQ3BGO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRU8sYUFBYTtRQUNuQixJQUFJO1lBQ0YsTUFBTSxRQUFRLEdBQUcsSUFBQSx3QkFBUSxFQUFDLCtCQUErQixFQUFFO2dCQUN6RCxRQUFRLEVBQUUsTUFBTTtnQkFDaEIsS0FBSyxFQUFFLE1BQU07YUFDZCxDQUFDLENBQUM7WUFDSCxNQUFNLE1BQU0sR0FBRyxJQUFBLHdCQUFRLEVBQUMsd0JBQXdCLEVBQUUsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZGLElBQUksTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQzlCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxvREFBb0Q7WUFDcEQsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN0QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQy9CLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FDckQsQ0FBQztnQkFFRixJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLEVBQUU7b0JBQ3RFLE9BQU8sS0FBSyxDQUFDO2lCQUNkO2FBQ0Y7U0FDRjtRQUFDLFdBQU0sR0FBRTtRQUVWLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7T0FHRztJQUNLLEtBQUssQ0FBQyxlQUFlLENBQzNCLGdCQUFzQyxFQUN0QyxPQUFPLEdBQUcsS0FBSyxFQUNmLElBQUksR0FBRyxLQUFLO1FBRVosTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sSUFBQSx1Q0FBb0IsRUFDNUMsZ0JBQWdCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUN4RSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFDbkI7WUFDRSxPQUFPO1lBQ1AsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksS0FBSyxpQ0FBYyxDQUFDLElBQUk7U0FDcEUsQ0FDRixDQUFDO1FBRUYsT0FBTyxpQkFBTyxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ25ELENBQUM7SUFFTyx5QkFBeUIsQ0FDL0IsZ0JBQXNDLEVBQ3RDLElBQWE7O1FBRWIsSUFBSSxJQUFJLEVBQUU7WUFDUixPQUFPLE1BQU0sQ0FBQztTQUNmO1FBRUQsTUFBTSxzQkFBc0IsR0FBRyxnQkFBZ0IsYUFBaEIsZ0JBQWdCLHVCQUFoQixnQkFBZ0IsQ0FBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlGLElBQUksc0JBQXNCLEVBQUU7WUFDMUIsNkZBQTZGO1lBQzdGLHdFQUF3RTtZQUN4RSwyRUFBMkU7WUFFM0UsaURBQWlEO1lBQ2pELHdDQUF3QztZQUN4QyxNQUFNLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU5RSxPQUFPLE1BQUEsTUFBQSxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQywwQ0FBRSxLQUFLLG1DQUFJLFFBQVEsQ0FBQztTQUNyRDtRQUVELDJIQUEySDtRQUMzSCwyRUFBMkU7UUFDM0UsZ0ZBQWdGO1FBQ2hGLDJHQUEyRztRQUUzRywrSEFBK0g7UUFDL0gsa0lBQWtJO1FBQ2xJLE9BQU8saUJBQU8sQ0FBQyxLQUFLLENBQUM7SUFDdkIsQ0FBQztJQUVPLEtBQUssQ0FBQyxhQUFhLENBQUMsV0FBbUIsRUFBRSxPQUFpQixFQUFFO1FBQ2xFLE1BQU0sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDaEcsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNaLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFFRCw4Q0FBOEM7UUFDOUMsMENBQTBDO1FBQzFDLE1BQU0sb0JBQW9CLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sV0FBVyxHQUFHLElBQUEsV0FBSSxFQUFDLGVBQWUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sZUFBZSxHQUFHLElBQUEsV0FBSSxFQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUUxRCx5Q0FBeUM7UUFDekMsSUFBSSxPQUEyQixDQUFDO1FBQ2hDLElBQUksSUFBQSxlQUFVLEVBQUMsZUFBZSxDQUFDLEVBQUU7WUFDL0IsTUFBTSxPQUFPLEdBQUcsTUFBTSxhQUFFLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUM1RCxJQUFJLE9BQU8sRUFBRTtnQkFDWCxNQUFNLEVBQUUsR0FBRyxHQUFHLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3pDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBRWpDLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtvQkFDbEIsT0FBTyxHQUFHLElBQUEsY0FBTyxFQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDakQ7YUFDRjtTQUNGO1FBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsNENBQTRDLG9CQUFvQixHQUFHLENBQUMsQ0FBQztTQUN0RjtRQUVELE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBQSx5QkFBUyxFQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRTtZQUN4RSxLQUFLLEVBQUUsU0FBUztZQUNoQixHQUFHLEVBQUU7Z0JBQ0gsR0FBRyxPQUFPLENBQUMsR0FBRztnQkFDZCx3QkFBd0IsRUFBRSxNQUFNO2dCQUNoQyxnQkFBZ0IsRUFBRSxPQUFPO2FBQzFCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLEtBQUssRUFBRTtZQUM1QixNQUFNLEtBQUssQ0FBQztTQUNiO1FBRUQsT0FBTyxNQUFNLGFBQU4sTUFBTSxjQUFOLE1BQU0sR0FBSSxDQUFDLENBQUM7SUFDckIsQ0FBQztJQUVPLG1CQUFtQixDQUFDLE9BQWdCO1FBQzFDLDJGQUEyRjtRQUMzRix1RkFBdUY7UUFDdkYseUVBQXlFO1FBQ3pFLGlCQUFpQjtRQUNqQiwwRUFBMEU7UUFDMUUsOENBQThDO1FBQzlDLCtHQUErRztRQUMvRyx3REFBd0Q7UUFDeEQsc0ZBQXNGO1FBQ3RGLElBQ0UsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxLQUFLLGlDQUFjLENBQUMsR0FBRztZQUN2RCxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPO1lBQ25DLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUFDLEVBQ3JGO1lBQ0EsSUFBSSxPQUFPLEVBQUU7Z0JBQ1gsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUN0QixtRUFBbUUsQ0FDcEUsQ0FBQzthQUNIO1lBRUQsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztDQUNGO0FBNTZCRCxrREE0NkJDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGtCQUFrQjtJQUN6QixxREFBcUQ7SUFDckQscUVBQXFFO0lBRXJFLE9BQU8sSUFBQSx3QkFBUSxFQUFDLDBDQUEwQyxDQUFDLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDO0FBQ2hGLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBUyxZQUFZLENBQUMsT0FBZTtJQUNuQyx3Q0FBd0M7SUFDeEMsSUFBQSx3QkFBUSxFQUFDLFlBQVksRUFBRSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFFNUQsMEVBQTBFO0lBQzFFLElBQUEsd0JBQVEsRUFBQyw2QkFBNkIsRUFBRSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUMvRixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGlCQUFpQjtJQUN4QixJQUFJO1FBQ0YsT0FBTyxJQUFBLHdCQUFRLEVBQUMsb0JBQW9CLEVBQUUsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0tBQ25GO0lBQUMsV0FBTTtRQUNOLE9BQU8sSUFBSSxDQUFDO0tBQ2I7QUFDSCxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsVUFBa0I7SUFDdEMsT0FBTyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNoQyxDQUFDO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxPQUEyQjs7SUFDdEQsSUFBSSxDQUFDLE9BQU8sRUFBRTtRQUNaLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0lBRUQsSUFBSSxDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNsRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFFdEQsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNiLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQy9GO2FBQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNwQixPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUM3RjthQUFNO1lBQ0wsT0FBTyxTQUFTLENBQUM7U0FDbEI7S0FDRjtJQUVELE9BQU8sTUFBQSxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxtQ0FBSSxTQUFTLENBQUM7QUFDNUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVXb3JrZmxvdyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB7IFNwYXduU3luY1JldHVybnMsIGV4ZWNTeW5jLCBzcGF3blN5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHByb21pc2VzIGFzIGZzIH0gZnJvbSAnZnMnO1xuaW1wb3J0IG5wYSBmcm9tICducG0tcGFja2FnZS1hcmcnO1xuaW1wb3J0IHBpY2tNYW5pZmVzdCBmcm9tICducG0tcGljay1tYW5pZmVzdCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgam9pbiwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi8uLi8uLi9saWIvY29uZmlnL3dvcmtzcGFjZS1zY2hlbWEnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUVycm9yLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBTY2hlbWF0aWNFbmdpbmVIb3N0IH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL3V0aWxpdGllcy9zY2hlbWF0aWMtZW5naW5lLWhvc3QnO1xuaW1wb3J0IHsgc3Vic2NyaWJlVG9Xb3JrZmxvdyB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvc2NoZW1hdGljLXdvcmtmbG93JztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBkaXNhYmxlVmVyc2lvbkNoZWNrIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2Vudmlyb25tZW50LW9wdGlvbnMnO1xuaW1wb3J0IHsgYXNzZXJ0SXNFcnJvciB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9lcnJvcic7XG5pbXBvcnQgeyB3cml0ZUVycm9yVG9Mb2dGaWxlIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2xvZy1maWxlJztcbmltcG9ydCB7XG4gIFBhY2thZ2VJZGVudGlmaWVyLFxuICBQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNZXRhZGF0YSxcbn0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWV0YWRhdGEnO1xuaW1wb3J0IHtcbiAgUGFja2FnZVRyZWVOb2RlLFxuICBmaW5kUGFja2FnZUpzb24sXG4gIGdldFByb2plY3REZXBlbmRlbmNpZXMsXG4gIHJlYWRQYWNrYWdlSnNvbixcbn0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtdHJlZSc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3ZlcnNpb24nO1xuXG5pbnRlcmZhY2UgVXBkYXRlQ29tbWFuZEFyZ3Mge1xuICBwYWNrYWdlcz86IHN0cmluZ1tdO1xuICBmb3JjZTogYm9vbGVhbjtcbiAgbmV4dDogYm9vbGVhbjtcbiAgJ21pZ3JhdGUtb25seSc/OiBib29sZWFuO1xuICBuYW1lPzogc3RyaW5nO1xuICBmcm9tPzogc3RyaW5nO1xuICB0bz86IHN0cmluZztcbiAgJ2FsbG93LWRpcnR5JzogYm9vbGVhbjtcbiAgdmVyYm9zZTogYm9vbGVhbjtcbiAgJ2NyZWF0ZS1jb21taXRzJzogYm9vbGVhbjtcbn1cblxuY29uc3QgQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAgPSAvXkAoPzphbmd1bGFyfG5ndW5pdmVyc2FsKVxcLy87XG5jb25zdCBVUERBVEVfU0NIRU1BVElDX0NPTExFQ1RJT04gPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnc2NoZW1hdGljL2NvbGxlY3Rpb24uanNvbicpO1xuXG5leHBvcnQgY2xhc3MgVXBkYXRlQ29tbWFuZE1vZHVsZSBleHRlbmRzIENvbW1hbmRNb2R1bGU8VXBkYXRlQ29tbWFuZEFyZ3M+IHtcbiAgb3ZlcnJpZGUgc2NvcGUgPSBDb21tYW5kU2NvcGUuSW47XG4gIHByb3RlY3RlZCBvdmVycmlkZSBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSBmYWxzZTtcblxuICBjb21tYW5kID0gJ3VwZGF0ZSBbcGFja2FnZXMuLl0nO1xuICBkZXNjcmliZSA9ICdVcGRhdGVzIHlvdXIgd29ya3NwYWNlIGFuZCBpdHMgZGVwZW5kZW5jaWVzLiBTZWUgaHR0cHM6Ly91cGRhdGUuYW5ndWxhci5pby8uJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnbG9uZy1kZXNjcmlwdGlvbi5tZCcpO1xuXG4gIGJ1aWxkZXIobG9jYWxZYXJnczogQXJndik6IEFyZ3Y8VXBkYXRlQ29tbWFuZEFyZ3M+IHtcbiAgICByZXR1cm4gbG9jYWxZYXJnc1xuICAgICAgLnBvc2l0aW9uYWwoJ3BhY2thZ2VzJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBuYW1lcyBvZiBwYWNrYWdlKHMpIHRvIHVwZGF0ZS4nLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgYXJyYXk6IHRydWUsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignZm9yY2UnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnSWdub3JlIHBlZXIgZGVwZW5kZW5jeSB2ZXJzaW9uIG1pc21hdGNoZXMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCduZXh0Jywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ1VzZSB0aGUgcHJlcmVsZWFzZSB2ZXJzaW9uLCBpbmNsdWRpbmcgYmV0YSBhbmQgUkNzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignbWlncmF0ZS1vbmx5Jywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ09ubHkgcGVyZm9ybSBhIG1pZ3JhdGlvbiwgZG8gbm90IHVwZGF0ZSB0aGUgaW5zdGFsbGVkIHZlcnNpb24uJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ25hbWUnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICdUaGUgbmFtZSBvZiB0aGUgbWlncmF0aW9uIHRvIHJ1bi4gJyArXG4gICAgICAgICAgYE9ubHkgYXZhaWxhYmxlIHdpdGggYSBzaW5nbGUgcGFja2FnZSBiZWluZyB1cGRhdGVkLCBhbmQgb25seSB3aXRoICdtaWdyYXRlLW9ubHknIG9wdGlvbi5gLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgaW1wbGllczogWydtaWdyYXRlLW9ubHknXSxcbiAgICAgICAgY29uZmxpY3RzOiBbJ3RvJywgJ2Zyb20nXSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdmcm9tJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAnVmVyc2lvbiBmcm9tIHdoaWNoIHRvIG1pZ3JhdGUgZnJvbS4gJyArXG4gICAgICAgICAgYE9ubHkgYXZhaWxhYmxlIHdpdGggYSBzaW5nbGUgcGFja2FnZSBiZWluZyB1cGRhdGVkLCBhbmQgb25seSB3aXRoICdtaWdyYXRlLW9ubHknLmAsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBpbXBsaWVzOiBbJ3RvJywgJ21pZ3JhdGUtb25seSddLFxuICAgICAgICBjb25mbGljdHM6IFsnbmFtZSddLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ3RvJywge1xuICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAnVmVyc2lvbiB1cCB0byB3aGljaCB0byBhcHBseSBtaWdyYXRpb25zLiBPbmx5IGF2YWlsYWJsZSB3aXRoIGEgc2luZ2xlIHBhY2thZ2UgYmVpbmcgdXBkYXRlZCwgJyArXG4gICAgICAgICAgYGFuZCBvbmx5IHdpdGggJ21pZ3JhdGUtb25seScgb3B0aW9uLiBSZXF1aXJlcyAnZnJvbScgdG8gYmUgc3BlY2lmaWVkLiBEZWZhdWx0IHRvIHRoZSBpbnN0YWxsZWQgdmVyc2lvbiBkZXRlY3RlZC5gLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgaW1wbGllczogWydmcm9tJywgJ21pZ3JhdGUtb25seSddLFxuICAgICAgICBjb25mbGljdHM6IFsnbmFtZSddLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2FsbG93LWRpcnR5Jywge1xuICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAnV2hldGhlciB0byBhbGxvdyB1cGRhdGluZyB3aGVuIHRoZSByZXBvc2l0b3J5IGNvbnRhaW5zIG1vZGlmaWVkIG9yIHVudHJhY2tlZCBmaWxlcy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ3ZlcmJvc2UnLCB7XG4gICAgICAgIGRlc2NyaWJlOiAnRGlzcGxheSBhZGRpdGlvbmFsIGRldGFpbHMgYWJvdXQgaW50ZXJuYWwgb3BlcmF0aW9ucyBkdXJpbmcgZXhlY3V0aW9uLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignY3JlYXRlLWNvbW1pdHMnLCB7XG4gICAgICAgIGRlc2NyaWJlOiAnQ3JlYXRlIHNvdXJjZSBjb250cm9sIGNvbW1pdHMgZm9yIHVwZGF0ZXMgYW5kIG1pZ3JhdGlvbnMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBhbGlhczogWydDJ10sXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5jaGVjaygoeyBwYWNrYWdlcywgJ2FsbG93LWRpcnR5JzogYWxsb3dEaXJ0eSwgJ21pZ3JhdGUtb25seSc6IG1pZ3JhdGVPbmx5IH0pID0+IHtcbiAgICAgICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcblxuICAgICAgICAvLyBUaGlzIGFsbG93cyB0aGUgdXNlciB0byBlYXNpbHkgcmVzZXQgYW55IGNoYW5nZXMgZnJvbSB0aGUgdXBkYXRlLlxuICAgICAgICBpZiAocGFja2FnZXM/Lmxlbmd0aCAmJiAhdGhpcy5jaGVja0NsZWFuR2l0KCkpIHtcbiAgICAgICAgICBpZiAoYWxsb3dEaXJ0eSkge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgICdSZXBvc2l0b3J5IGlzIG5vdCBjbGVhbi4gVXBkYXRlIGNoYW5nZXMgd2lsbCBiZSBtaXhlZCB3aXRoIHByZS1leGlzdGluZyBjaGFuZ2VzLicsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKFxuICAgICAgICAgICAgICAnUmVwb3NpdG9yeSBpcyBub3QgY2xlYW4uIFBsZWFzZSBjb21taXQgb3Igc3Rhc2ggYW55IGNoYW5nZXMgYmVmb3JlIHVwZGF0aW5nLicsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtaWdyYXRlT25seSkge1xuICAgICAgICAgIGlmIChwYWNrYWdlcz8ubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKFxuICAgICAgICAgICAgICBgQSBzaW5nbGUgcGFja2FnZSBtdXN0IGJlIHNwZWNpZmllZCB3aGVuIHVzaW5nIHRoZSAnbWlncmF0ZS1vbmx5JyBvcHRpb24uYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLnN0cmljdCgpO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8VXBkYXRlQ29tbWFuZEFyZ3M+KTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgY29uc3QgeyBsb2dnZXIsIHBhY2thZ2VNYW5hZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICBwYWNrYWdlTWFuYWdlci5lbnN1cmVDb21wYXRpYmlsaXR5KCk7XG5cbiAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBpbnN0YWxsZWQgQ0xJIHZlcnNpb24gaXMgb2xkZXIgdGhhbiB0aGUgbGF0ZXN0IGNvbXBhdGlibGUgdmVyc2lvbi5cbiAgICBpZiAoIWRpc2FibGVWZXJzaW9uQ2hlY2spIHtcbiAgICAgIGNvbnN0IGNsaVZlcnNpb25Ub0luc3RhbGwgPSBhd2FpdCB0aGlzLmNoZWNrQ0xJVmVyc2lvbihcbiAgICAgICAgb3B0aW9ucy5wYWNrYWdlcyxcbiAgICAgICAgb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICBvcHRpb25zLm5leHQsXG4gICAgICApO1xuXG4gICAgICBpZiAoY2xpVmVyc2lvblRvSW5zdGFsbCkge1xuICAgICAgICBsb2dnZXIud2FybihcbiAgICAgICAgICAnVGhlIGluc3RhbGxlZCBBbmd1bGFyIENMSSB2ZXJzaW9uIGlzIG91dGRhdGVkLlxcbicgK1xuICAgICAgICAgICAgYEluc3RhbGxpbmcgYSB0ZW1wb3JhcnkgQW5ndWxhciBDTEkgdmVyc2lvbmVkICR7Y2xpVmVyc2lvblRvSW5zdGFsbH0gdG8gcGVyZm9ybSB0aGUgdXBkYXRlLmAsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMucnVuVGVtcEJpbmFyeShgQGFuZ3VsYXIvY2xpQCR7Y2xpVmVyc2lvblRvSW5zdGFsbH1gLCBwcm9jZXNzLmFyZ3Yuc2xpY2UoMikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHBhY2thZ2VzOiBQYWNrYWdlSWRlbnRpZmllcltdID0gW107XG4gICAgZm9yIChjb25zdCByZXF1ZXN0IG9mIG9wdGlvbnMucGFja2FnZXMgPz8gW10pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHBhY2thZ2VJZGVudGlmaWVyID0gbnBhKHJlcXVlc3QpO1xuXG4gICAgICAgIC8vIG9ubHkgcmVnaXN0cnkgaWRlbnRpZmllcnMgYXJlIHN1cHBvcnRlZFxuICAgICAgICBpZiAoIXBhY2thZ2VJZGVudGlmaWVyLnJlZ2lzdHJ5KSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKGBQYWNrYWdlICcke3JlcXVlc3R9JyBpcyBub3QgYSByZWdpc3RyeSBwYWNrYWdlIGlkZW50aWZlci5gKTtcblxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBhY2thZ2VzLnNvbWUoKHYpID0+IHYubmFtZSA9PT0gcGFja2FnZUlkZW50aWZpZXIubmFtZSkpIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoYER1cGxpY2F0ZSBwYWNrYWdlICcke3BhY2thZ2VJZGVudGlmaWVyLm5hbWV9JyBzcGVjaWZpZWQuYCk7XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLm1pZ3JhdGVPbmx5ICYmIHBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMpIHtcbiAgICAgICAgICBsb2dnZXIud2FybignUGFja2FnZSBzcGVjaWZpZXIgaGFzIG5vIGVmZmVjdCB3aGVuIHVzaW5nIFwibWlncmF0ZS1vbmx5XCIgb3B0aW9uLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgbmV4dCBvcHRpb24gaXMgdXNlZCBhbmQgbm8gc3BlY2lmaWVyIHN1cHBsaWVkLCB1c2UgbmV4dCB0YWdcbiAgICAgICAgaWYgKG9wdGlvbnMubmV4dCAmJiAhcGFja2FnZUlkZW50aWZpZXIucmF3U3BlYykge1xuICAgICAgICAgIHBhY2thZ2VJZGVudGlmaWVyLmZldGNoU3BlYyA9ICduZXh0JztcbiAgICAgICAgfVxuXG4gICAgICAgIHBhY2thZ2VzLnB1c2gocGFja2FnZUlkZW50aWZpZXIgYXMgUGFja2FnZUlkZW50aWZpZXIpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgICBsb2dnZXIuZXJyb3IoZS5tZXNzYWdlKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbyhgVXNpbmcgcGFja2FnZSBtYW5hZ2VyOiAke2NvbG9ycy5ncmV5KHBhY2thZ2VNYW5hZ2VyLm5hbWUpfWApO1xuICAgIGxvZ2dlci5pbmZvKCdDb2xsZWN0aW5nIGluc3RhbGxlZCBkZXBlbmRlbmNpZXMuLi4nKTtcblxuICAgIGNvbnN0IHJvb3REZXBlbmRlbmNpZXMgPSBhd2FpdCBnZXRQcm9qZWN0RGVwZW5kZW5jaWVzKHRoaXMuY29udGV4dC5yb290KTtcbiAgICBsb2dnZXIuaW5mbyhgRm91bmQgJHtyb290RGVwZW5kZW5jaWVzLnNpemV9IGRlcGVuZGVuY2llcy5gKTtcblxuICAgIGNvbnN0IHdvcmtmbG93ID0gbmV3IE5vZGVXb3JrZmxvdyh0aGlzLmNvbnRleHQucm9vdCwge1xuICAgICAgcGFja2FnZU1hbmFnZXI6IHBhY2thZ2VNYW5hZ2VyLm5hbWUsXG4gICAgICBwYWNrYWdlTWFuYWdlckZvcmNlOiB0aGlzLnBhY2thZ2VNYW5hZ2VyRm9yY2Uob3B0aW9ucy52ZXJib3NlKSxcbiAgICAgIC8vIF9fZGlybmFtZSAtPiBmYXZvciBAc2NoZW1hdGljcy91cGRhdGUgZnJvbSB0aGlzIHBhY2thZ2VcbiAgICAgIC8vIE90aGVyd2lzZSwgdXNlIHBhY2thZ2VzIGZyb20gdGhlIGFjdGl2ZSB3b3Jrc3BhY2UgKG1pZ3JhdGlvbnMpXG4gICAgICByZXNvbHZlUGF0aHM6IFtfX2Rpcm5hbWUsIHRoaXMuY29udGV4dC5yb290XSxcbiAgICAgIHNjaGVtYVZhbGlkYXRpb246IHRydWUsXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KTtcblxuICAgIGlmIChwYWNrYWdlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIFNob3cgc3RhdHVzXG4gICAgICBjb25zdCB7IHN1Y2Nlc3MgfSA9IGF3YWl0IHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICAgICAgd29ya2Zsb3csXG4gICAgICAgIFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTixcbiAgICAgICAgJ3VwZGF0ZScsXG4gICAgICAgIHtcbiAgICAgICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICAgICAgICBuZXh0OiBvcHRpb25zLm5leHQsXG4gICAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICAgIHBhY2thZ2VNYW5hZ2VyOiBwYWNrYWdlTWFuYWdlci5uYW1lLFxuICAgICAgICAgIHBhY2thZ2VzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiBzdWNjZXNzID8gMCA6IDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdGlvbnMubWlncmF0ZU9ubHlcbiAgICAgID8gdGhpcy5taWdyYXRlT25seSh3b3JrZmxvdywgKG9wdGlvbnMucGFja2FnZXMgPz8gW10pWzBdLCByb290RGVwZW5kZW5jaWVzLCBvcHRpb25zKVxuICAgICAgOiB0aGlzLnVwZGF0ZVBhY2thZ2VzQW5kTWlncmF0ZSh3b3JrZmxvdywgcm9vdERlcGVuZGVuY2llcywgb3B0aW9ucywgcGFja2FnZXMpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlU2NoZW1hdGljKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgY29sbGVjdGlvbjogc3RyaW5nLFxuICAgIHNjaGVtYXRpYzogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge30sXG4gICk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBmaWxlczogU2V0PHN0cmluZz4gfT4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3Qgd29ya2Zsb3dTdWJzY3JpcHRpb24gPSBzdWJzY3JpYmVUb1dvcmtmbG93KHdvcmtmbG93LCBsb2dnZXIpO1xuXG4gICAgLy8gVE9ETzogQWxsb3cgcGFzc2luZyBhIHNjaGVtYXRpYyBpbnN0YW5jZSBkaXJlY3RseVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB3b3JrZmxvd1xuICAgICAgICAuZXhlY3V0ZSh7XG4gICAgICAgICAgY29sbGVjdGlvbixcbiAgICAgICAgICBzY2hlbWF0aWMsXG4gICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICBsb2dnZXIsXG4gICAgICAgIH0pXG4gICAgICAgIC50b1Byb21pc2UoKTtcblxuICAgICAgcmV0dXJuIHsgc3VjY2VzczogIXdvcmtmbG93U3Vic2NyaXB0aW9uLmVycm9yLCBmaWxlczogd29ya2Zsb3dTdWJzY3JpcHRpb24uZmlsZXMgfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgJHtjb2xvcnMuc3ltYm9scy5jcm9zc30gTWlncmF0aW9uIGZhaWxlZC4gU2VlIGFib3ZlIGZvciBmdXJ0aGVyIGRldGFpbHMuXFxuYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgICBjb25zdCBsb2dQYXRoID0gd3JpdGVFcnJvclRvTG9nRmlsZShlKTtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKFxuICAgICAgICAgIGAke2NvbG9ycy5zeW1ib2xzLmNyb3NzfSBNaWdyYXRpb24gZmFpbGVkOiAke2UubWVzc2FnZX1cXG5gICtcbiAgICAgICAgICAgIGAgIFNlZSBcIiR7bG9nUGF0aH1cIiBmb3IgZnVydGhlciBkZXRhaWxzLlxcbmAsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBmaWxlczogd29ya2Zsb3dTdWJzY3JpcHRpb24uZmlsZXMgfTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgd29ya2Zsb3dTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgbWlncmF0aW9uIHdhcyBwZXJmb3JtZWQgc3VjY2Vzc2Z1bGx5LlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlTWlncmF0aW9uKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICBjb2xsZWN0aW9uUGF0aDogc3RyaW5nLFxuICAgIG1pZ3JhdGlvbk5hbWU6IHN0cmluZyxcbiAgICBjb21taXQ/OiBib29sZWFuLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25QYXRoKTtcbiAgICBjb25zdCBuYW1lID0gY29sbGVjdGlvbi5saXN0U2NoZW1hdGljTmFtZXMoKS5maW5kKChuYW1lKSA9PiBuYW1lID09PSBtaWdyYXRpb25OYW1lKTtcbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgQ2Fubm90IGZpbmQgbWlncmF0aW9uICcke21pZ3JhdGlvbk5hbWV9JyBpbiAnJHtwYWNrYWdlTmFtZX0nLmApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbyhjb2xvcnMuY3lhbihgKiogRXhlY3V0aW5nICcke21pZ3JhdGlvbk5hbWV9JyBvZiBwYWNrYWdlICcke3BhY2thZ2VOYW1lfScgKipcXG5gKSk7XG4gICAgY29uc3Qgc2NoZW1hdGljID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZVNjaGVtYXRpYyhuYW1lLCBjb2xsZWN0aW9uKTtcblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyh3b3JrZmxvdywgW3NjaGVtYXRpYy5kZXNjcmlwdGlvbl0sIHBhY2thZ2VOYW1lLCBjb21taXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIG1pZ3JhdGlvbnMgd2VyZSBwZXJmb3JtZWQgc3VjY2Vzc2Z1bGx5LlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlTWlncmF0aW9ucyhcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgY29sbGVjdGlvblBhdGg6IHN0cmluZyxcbiAgICBmcm9tOiBzdHJpbmcsXG4gICAgdG86IHN0cmluZyxcbiAgICBjb21taXQ/OiBib29sZWFuLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uUGF0aCk7XG4gICAgY29uc3QgbWlncmF0aW9uUmFuZ2UgPSBuZXcgc2VtdmVyLlJhbmdlKFxuICAgICAgJz4nICsgKHNlbXZlci5wcmVyZWxlYXNlKGZyb20pID8gZnJvbS5zcGxpdCgnLScpWzBdICsgJy0wJyA6IGZyb20pICsgJyA8PScgKyB0by5zcGxpdCgnLScpWzBdLFxuICAgICk7XG4gICAgY29uc3QgbWlncmF0aW9ucyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKCkpIHtcbiAgICAgIGNvbnN0IHNjaGVtYXRpYyA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVTY2hlbWF0aWMobmFtZSwgY29sbGVjdGlvbik7XG4gICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IHNjaGVtYXRpYy5kZXNjcmlwdGlvbiBhcyB0eXBlb2Ygc2NoZW1hdGljLmRlc2NyaXB0aW9uICYge1xuICAgICAgICB2ZXJzaW9uPzogc3RyaW5nO1xuICAgICAgfTtcbiAgICAgIGRlc2NyaXB0aW9uLnZlcnNpb24gPSBjb2VyY2VWZXJzaW9uTnVtYmVyKGRlc2NyaXB0aW9uLnZlcnNpb24pO1xuICAgICAgaWYgKCFkZXNjcmlwdGlvbi52ZXJzaW9uKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2VtdmVyLnNhdGlzZmllcyhkZXNjcmlwdGlvbi52ZXJzaW9uLCBtaWdyYXRpb25SYW5nZSwgeyBpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZSB9KSkge1xuICAgICAgICBtaWdyYXRpb25zLnB1c2goZGVzY3JpcHRpb24gYXMgdHlwZW9mIHNjaGVtYXRpYy5kZXNjcmlwdGlvbiAmIHsgdmVyc2lvbjogc3RyaW5nIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtaWdyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgbWlncmF0aW9ucy5zb3J0KChhLCBiKSA9PiBzZW12ZXIuY29tcGFyZShhLnZlcnNpb24sIGIudmVyc2lvbikgfHwgYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKSk7XG5cbiAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmluZm8oXG4gICAgICBjb2xvcnMuY3lhbihgKiogRXhlY3V0aW5nIG1pZ3JhdGlvbnMgb2YgcGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nICoqXFxuYCksXG4gICAgKTtcblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyh3b3JrZmxvdywgbWlncmF0aW9ucywgcGFja2FnZU5hbWUsIGNvbW1pdCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyhcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIG1pZ3JhdGlvbnM6IEl0ZXJhYmxlPHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbjogc3RyaW5nOyBjb2xsZWN0aW9uOiB7IG5hbWU6IHN0cmluZyB9IH0+LFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgY29tbWl0ID0gZmFsc2UsXG4gICk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBmb3IgKGNvbnN0IG1pZ3JhdGlvbiBvZiBtaWdyYXRpb25zKSB7XG4gICAgICBjb25zdCBbdGl0bGUsIC4uLmRlc2NyaXB0aW9uXSA9IG1pZ3JhdGlvbi5kZXNjcmlwdGlvbi5zcGxpdCgnLiAnKTtcblxuICAgICAgbG9nZ2VyLmluZm8oXG4gICAgICAgIGNvbG9ycy5jeWFuKGNvbG9ycy5zeW1ib2xzLnBvaW50ZXIpICtcbiAgICAgICAgICAnICcgK1xuICAgICAgICAgIGNvbG9ycy5ib2xkKHRpdGxlLmVuZHNXaXRoKCcuJykgPyB0aXRsZSA6IHRpdGxlICsgJy4nKSxcbiAgICAgICk7XG5cbiAgICAgIGlmIChkZXNjcmlwdGlvbi5sZW5ndGgpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJyAgJyArIGRlc2NyaXB0aW9uLmpvaW4oJy5cXG4gICcpKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlU2NoZW1hdGljKFxuICAgICAgICB3b3JrZmxvdyxcbiAgICAgICAgbWlncmF0aW9uLmNvbGxlY3Rpb24ubmFtZSxcbiAgICAgICAgbWlncmF0aW9uLm5hbWUsXG4gICAgICApO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgbG9nZ2VyLmluZm8oJyAgTWlncmF0aW9uIGNvbXBsZXRlZC4nKTtcblxuICAgICAgLy8gQ29tbWl0IG1pZ3JhdGlvblxuICAgICAgaWYgKGNvbW1pdCkge1xuICAgICAgICBjb25zdCBjb21taXRQcmVmaXggPSBgJHtwYWNrYWdlTmFtZX0gbWlncmF0aW9uIC0gJHttaWdyYXRpb24ubmFtZX1gO1xuICAgICAgICBjb25zdCBjb21taXRNZXNzYWdlID0gbWlncmF0aW9uLmRlc2NyaXB0aW9uXG4gICAgICAgICAgPyBgJHtjb21taXRQcmVmaXh9XFxuXFxuJHttaWdyYXRpb24uZGVzY3JpcHRpb259YFxuICAgICAgICAgIDogY29tbWl0UHJlZml4O1xuICAgICAgICBjb25zdCBjb21taXR0ZWQgPSB0aGlzLmNvbW1pdChjb21taXRNZXNzYWdlKTtcbiAgICAgICAgaWYgKCFjb21taXR0ZWQpIHtcbiAgICAgICAgICAvLyBGYWlsZWQgdG8gY29tbWl0LCBzb21ldGhpbmcgd2VudCB3cm9uZy4gQWJvcnQgdGhlIHVwZGF0ZS5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBsb2dnZXIuaW5mbygnJyk7IC8vIEV4dHJhIHRyYWlsaW5nIG5ld2xpbmUuXG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG1pZ3JhdGVPbmx5KFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICByb290RGVwZW5kZW5jaWVzOiBNYXA8c3RyaW5nLCBQYWNrYWdlVHJlZU5vZGU+LFxuICAgIG9wdGlvbnM6IE9wdGlvbnM8VXBkYXRlQ29tbWFuZEFyZ3M+LFxuICApOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHBhY2thZ2VEZXBlbmRlbmN5ID0gcm9vdERlcGVuZGVuY2llcy5nZXQocGFja2FnZU5hbWUpO1xuICAgIGxldCBwYWNrYWdlUGF0aCA9IHBhY2thZ2VEZXBlbmRlbmN5Py5wYXRoO1xuICAgIGxldCBwYWNrYWdlTm9kZSA9IHBhY2thZ2VEZXBlbmRlbmN5Py5wYWNrYWdlO1xuICAgIGlmIChwYWNrYWdlRGVwZW5kZW5jeSAmJiAhcGFja2FnZU5vZGUpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBmb3VuZCBpbiBwYWNrYWdlLmpzb24gYnV0IGlzIG5vdCBpbnN0YWxsZWQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAoIXBhY2thZ2VEZXBlbmRlbmN5KSB7XG4gICAgICAvLyBBbGxvdyBydW5uaW5nIG1pZ3JhdGlvbnMgb24gdHJhbnNpdGl2ZWx5IGluc3RhbGxlZCBkZXBlbmRlbmNpZXNcbiAgICAgIC8vIFRoZXJlIGNhbiB0ZWNobmljYWxseSBiZSBuZXN0ZWQgbXVsdGlwbGUgdmVyc2lvbnNcbiAgICAgIC8vIFRPRE86IElmIG11bHRpcGxlLCB0aGlzIHNob3VsZCBmaW5kIGFsbCB2ZXJzaW9ucyBhbmQgYXNrIHdoaWNoIG9uZSB0byB1c2VcbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gZmluZFBhY2thZ2VKc29uKHRoaXMuY29udGV4dC5yb290LCBwYWNrYWdlTmFtZSk7XG4gICAgICBpZiAocGFja2FnZUpzb24pIHtcbiAgICAgICAgcGFja2FnZVBhdGggPSBwYXRoLmRpcm5hbWUocGFja2FnZUpzb24pO1xuICAgICAgICBwYWNrYWdlTm9kZSA9IGF3YWl0IHJlYWRQYWNrYWdlSnNvbihwYWNrYWdlSnNvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwYWNrYWdlTm9kZSB8fCAhcGFja2FnZVBhdGgpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBpcyBub3QgaW5zdGFsbGVkLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBjb25zdCB1cGRhdGVNZXRhZGF0YSA9IHBhY2thZ2VOb2RlWyduZy11cGRhdGUnXTtcbiAgICBsZXQgbWlncmF0aW9ucyA9IHVwZGF0ZU1ldGFkYXRhPy5taWdyYXRpb25zO1xuICAgIGlmIChtaWdyYXRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBkb2VzIG5vdCBwcm92aWRlIG1pZ3JhdGlvbnMuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1pZ3JhdGlvbnMgIT09ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1BhY2thZ2UgY29udGFpbnMgYSBtYWxmb3JtZWQgbWlncmF0aW9ucyBmaWVsZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmIChwYXRoLnBvc2l4LmlzQWJzb2x1dGUobWlncmF0aW9ucykgfHwgcGF0aC53aW4zMi5pc0Fic29sdXRlKG1pZ3JhdGlvbnMpKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICdQYWNrYWdlIGNvbnRhaW5zIGFuIGludmFsaWQgbWlncmF0aW9ucyBmaWVsZC4gQWJzb2x1dGUgcGF0aHMgYXJlIG5vdCBwZXJtaXR0ZWQuJyxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIC8vIE5vcm1hbGl6ZSBzbGFzaGVzXG4gICAgbWlncmF0aW9ucyA9IG1pZ3JhdGlvbnMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gICAgaWYgKG1pZ3JhdGlvbnMuc3RhcnRzV2l0aCgnLi4vJykpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgJ1BhY2thZ2UgY29udGFpbnMgYW4gaW52YWxpZCBtaWdyYXRpb25zIGZpZWxkLiBQYXRocyBvdXRzaWRlIHRoZSBwYWNrYWdlIHJvb3QgYXJlIG5vdCBwZXJtaXR0ZWQuJyxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIGl0IGlzIGEgcGFja2FnZS1sb2NhbCBsb2NhdGlvblxuICAgIGNvbnN0IGxvY2FsTWlncmF0aW9ucyA9IHBhdGguam9pbihwYWNrYWdlUGF0aCwgbWlncmF0aW9ucyk7XG4gICAgaWYgKGV4aXN0c1N5bmMobG9jYWxNaWdyYXRpb25zKSkge1xuICAgICAgbWlncmF0aW9ucyA9IGxvY2FsTWlncmF0aW9ucztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVHJ5IHRvIHJlc29sdmUgZnJvbSBwYWNrYWdlIGxvY2F0aW9uLlxuICAgICAgLy8gVGhpcyBhdm9pZHMgaXNzdWVzIHdpdGggcGFja2FnZSBob2lzdGluZy5cbiAgICAgIHRyeSB7XG4gICAgICAgIG1pZ3JhdGlvbnMgPSByZXF1aXJlLnJlc29sdmUobWlncmF0aW9ucywgeyBwYXRoczogW3BhY2thZ2VQYXRoXSB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKCdNaWdyYXRpb25zIGZvciBwYWNrYWdlIHdlcmUgbm90IGZvdW5kLicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcihgVW5hYmxlIHRvIHJlc29sdmUgbWlncmF0aW9ucyBmb3IgcGFja2FnZS4gIFske2UubWVzc2FnZX1dYCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5uYW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5leGVjdXRlTWlncmF0aW9uKFxuICAgICAgICB3b3JrZmxvdyxcbiAgICAgICAgcGFja2FnZU5hbWUsXG4gICAgICAgIG1pZ3JhdGlvbnMsXG4gICAgICAgIG9wdGlvbnMubmFtZSxcbiAgICAgICAgb3B0aW9ucy5jcmVhdGVDb21taXRzLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCBmcm9tID0gY29lcmNlVmVyc2lvbk51bWJlcihvcHRpb25zLmZyb20pO1xuICAgIGlmICghZnJvbSkge1xuICAgICAgbG9nZ2VyLmVycm9yKGBcImZyb21cIiB2YWx1ZSBbJHtvcHRpb25zLmZyb219XSBpcyBub3QgYSB2YWxpZCB2ZXJzaW9uLmApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5leGVjdXRlTWlncmF0aW9ucyhcbiAgICAgIHdvcmtmbG93LFxuICAgICAgcGFja2FnZU5hbWUsXG4gICAgICBtaWdyYXRpb25zLFxuICAgICAgZnJvbSxcbiAgICAgIG9wdGlvbnMudG8gfHwgcGFja2FnZU5vZGUudmVyc2lvbixcbiAgICAgIG9wdGlvbnMuY3JlYXRlQ29tbWl0cyxcbiAgICApO1xuICB9XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lcy1wZXItZnVuY3Rpb25cbiAgcHJpdmF0ZSBhc3luYyB1cGRhdGVQYWNrYWdlc0FuZE1pZ3JhdGUoXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICByb290RGVwZW5kZW5jaWVzOiBNYXA8c3RyaW5nLCBQYWNrYWdlVHJlZU5vZGU+LFxuICAgIG9wdGlvbnM6IE9wdGlvbnM8VXBkYXRlQ29tbWFuZEFyZ3M+LFxuICAgIHBhY2thZ2VzOiBQYWNrYWdlSWRlbnRpZmllcltdLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICBjb25zdCBsb2dWZXJib3NlID0gKG1lc3NhZ2U6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICBsb2dnZXIuaW5mbyhtZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgcmVxdWVzdHM6IHtcbiAgICAgIGlkZW50aWZpZXI6IFBhY2thZ2VJZGVudGlmaWVyO1xuICAgICAgbm9kZTogUGFja2FnZVRyZWVOb2RlO1xuICAgIH1bXSA9IFtdO1xuXG4gICAgLy8gVmFsaWRhdGUgcGFja2FnZXMgYWN0dWFsbHkgYXJlIHBhcnQgb2YgdGhlIHdvcmtzcGFjZVxuICAgIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzKSB7XG4gICAgICBjb25zdCBub2RlID0gcm9vdERlcGVuZGVuY2llcy5nZXQocGtnLm5hbWUpO1xuICAgICAgaWYgKCFub2RlPy5wYWNrYWdlKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgUGFja2FnZSAnJHtwa2cubmFtZX0nIGlzIG5vdCBhIGRlcGVuZGVuY3kuYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIGEgc3BlY2lmaWMgdmVyc2lvbiBpcyByZXF1ZXN0ZWQgYW5kIG1hdGNoZXMgdGhlIGluc3RhbGxlZCB2ZXJzaW9uLCBza2lwLlxuICAgICAgaWYgKHBrZy50eXBlID09PSAndmVyc2lvbicgJiYgbm9kZS5wYWNrYWdlLnZlcnNpb24gPT09IHBrZy5mZXRjaFNwZWMpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFBhY2thZ2UgJyR7cGtnLm5hbWV9JyBpcyBhbHJlYWR5IGF0ICcke3BrZy5mZXRjaFNwZWN9Jy5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHJlcXVlc3RzLnB1c2goeyBpZGVudGlmaWVyOiBwa2csIG5vZGUgfSk7XG4gICAgfVxuXG4gICAgaWYgKHJlcXVlc3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oJ0ZldGNoaW5nIGRlcGVuZGVuY3kgbWV0YWRhdGEgZnJvbSByZWdpc3RyeS4uLicpO1xuXG4gICAgY29uc3QgcGFja2FnZXNUb1VwZGF0ZTogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHsgaWRlbnRpZmllcjogcmVxdWVzdElkZW50aWZpZXIsIG5vZGUgfSBvZiByZXF1ZXN0cykge1xuICAgICAgY29uc3QgcGFja2FnZU5hbWUgPSByZXF1ZXN0SWRlbnRpZmllci5uYW1lO1xuXG4gICAgICBsZXQgbWV0YWRhdGE7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBNZXRhZGF0YSByZXF1ZXN0cyBhcmUgaW50ZXJuYWxseSBjYWNoZWQ7IG11bHRpcGxlIHJlcXVlc3RzIGZvciBzYW1lIG5hbWVcbiAgICAgICAgLy8gZG9lcyBub3QgcmVzdWx0IGluIGFkZGl0aW9uYWwgbmV0d29yayB0cmFmZmljXG4gICAgICAgIG1ldGFkYXRhID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWV0YWRhdGEocGFja2FnZU5hbWUsIGxvZ2dlciwge1xuICAgICAgICAgIHZlcmJvc2U6IG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3IgZmV0Y2hpbmcgbWV0YWRhdGEgZm9yICcke3BhY2thZ2VOYW1lfSc6IGAgKyBlLm1lc3NhZ2UpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICAvLyBUcnkgdG8gZmluZCBhIHBhY2thZ2UgdmVyc2lvbiBiYXNlZCBvbiB0aGUgdXNlciByZXF1ZXN0ZWQgcGFja2FnZSBzcGVjaWZpZXJcbiAgICAgIC8vIHJlZ2lzdHJ5IHNwZWNpZmllciB0eXBlcyBhcmUgZWl0aGVyIHZlcnNpb24sIHJhbmdlLCBvciB0YWdcbiAgICAgIGxldCBtYW5pZmVzdDogUGFja2FnZU1hbmlmZXN0IHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKFxuICAgICAgICByZXF1ZXN0SWRlbnRpZmllci50eXBlID09PSAndmVyc2lvbicgfHxcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3JhbmdlJyB8fFxuICAgICAgICByZXF1ZXN0SWRlbnRpZmllci50eXBlID09PSAndGFnJ1xuICAgICAgKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbWFuaWZlc3QgPSBwaWNrTWFuaWZlc3QobWV0YWRhdGEsIHJlcXVlc3RJZGVudGlmaWVyLmZldGNoU3BlYyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdFVEFSR0VUJykge1xuICAgICAgICAgICAgLy8gSWYgbm90IGZvdW5kIGFuZCBuZXh0IHdhcyB1c2VkIGFuZCB1c2VyIGRpZCBub3QgcHJvdmlkZSBhIHNwZWNpZmllciwgdHJ5IGxhdGVzdC5cbiAgICAgICAgICAgIC8vIFBhY2thZ2UgbWF5IG5vdCBoYXZlIGEgbmV4dCB0YWcuXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICd0YWcnICYmXG4gICAgICAgICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLmZldGNoU3BlYyA9PT0gJ25leHQnICYmXG4gICAgICAgICAgICAgICFyZXF1ZXN0SWRlbnRpZmllci5yYXdTcGVjXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBtYW5pZmVzdCA9IHBpY2tNYW5pZmVzdChtZXRhZGF0YSwgJ2xhdGVzdCcpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgICAgICAgICBpZiAoZS5jb2RlICE9PSAnRVRBUkdFVCcgJiYgZS5jb2RlICE9PSAnRU5PVkVSU0lPTlMnKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoZS5jb2RlICE9PSAnRU5PVkVSU0lPTlMnKSB7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIW1hbmlmZXN0KSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICBgUGFja2FnZSBzcGVjaWZpZWQgYnkgJyR7cmVxdWVzdElkZW50aWZpZXIucmF3fScgZG9lcyBub3QgZXhpc3Qgd2l0aGluIHRoZSByZWdpc3RyeS5gLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICBpZiAobWFuaWZlc3QudmVyc2lvbiA9PT0gbm9kZS5wYWNrYWdlPy52ZXJzaW9uKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBQYWNrYWdlICcke3BhY2thZ2VOYW1lfScgaXMgYWxyZWFkeSB1cCB0byBkYXRlLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG5vZGUucGFja2FnZSAmJiBBTkdVTEFSX1BBQ0tBR0VTX1JFR0VYUC50ZXN0KG5vZGUucGFja2FnZS5uYW1lKSkge1xuICAgICAgICBjb25zdCB7IG5hbWUsIHZlcnNpb24gfSA9IG5vZGUucGFja2FnZTtcbiAgICAgICAgY29uc3QgdG9CZUluc3RhbGxlZE1ham9yVmVyc2lvbiA9ICttYW5pZmVzdC52ZXJzaW9uLnNwbGl0KCcuJylbMF07XG4gICAgICAgIGNvbnN0IGN1cnJlbnRNYWpvclZlcnNpb24gPSArdmVyc2lvbi5zcGxpdCgnLicpWzBdO1xuXG4gICAgICAgIGlmICh0b0JlSW5zdGFsbGVkTWFqb3JWZXJzaW9uIC0gY3VycmVudE1ham9yVmVyc2lvbiA+IDEpIHtcbiAgICAgICAgICAvLyBPbmx5IGFsbG93IHVwZGF0aW5nIGEgc2luZ2xlIHZlcnNpb24gYXQgYSB0aW1lLlxuICAgICAgICAgIGlmIChjdXJyZW50TWFqb3JWZXJzaW9uIDwgNikge1xuICAgICAgICAgICAgLy8gQmVmb3JlIHZlcnNpb24gNiwgdGhlIG1ham9yIHZlcnNpb25zIHdlcmUgbm90IGFsd2F5cyBzZXF1ZW50aWFsLlxuICAgICAgICAgICAgLy8gRXhhbXBsZSBAYW5ndWxhci9jb3JlIHNraXBwZWQgdmVyc2lvbiAzLCBAYW5ndWxhci9jbGkgc2tpcHBlZCB2ZXJzaW9ucyAyLTUuXG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBVcGRhdGluZyBtdWx0aXBsZSBtYWpvciB2ZXJzaW9ucyBvZiAnJHtuYW1lfScgYXQgb25jZSBpcyBub3Qgc3VwcG9ydGVkLiBQbGVhc2UgbWlncmF0ZSBlYWNoIG1ham9yIHZlcnNpb24gaW5kaXZpZHVhbGx5LlxcbmAgK1xuICAgICAgICAgICAgICAgIGBGb3IgbW9yZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdXBkYXRlIHByb2Nlc3MsIHNlZSBodHRwczovL3VwZGF0ZS5hbmd1bGFyLmlvLy5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50ID0gY3VycmVudE1ham9yVmVyc2lvbiArIDE7XG5cbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgYFVwZGF0aW5nIG11bHRpcGxlIG1ham9yIHZlcnNpb25zIG9mICcke25hbWV9JyBhdCBvbmNlIGlzIG5vdCBzdXBwb3J0ZWQuIFBsZWFzZSBtaWdyYXRlIGVhY2ggbWFqb3IgdmVyc2lvbiBpbmRpdmlkdWFsbHkuXFxuYCArXG4gICAgICAgICAgICAgICAgYFJ1biAnbmcgdXBkYXRlICR7bmFtZX1AJHtuZXh0TWFqb3JWZXJzaW9uRnJvbUN1cnJlbnR9JyBpbiB5b3VyIHdvcmtzcGFjZSBkaXJlY3RvcnkgYCArXG4gICAgICAgICAgICAgICAgYHRvIHVwZGF0ZSB0byBsYXRlc3QgJyR7bmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50fS54JyB2ZXJzaW9uIG9mICcke25hbWV9Jy5cXG5cXG5gICtcbiAgICAgICAgICAgICAgICBgRm9yIG1vcmUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHVwZGF0ZSBwcm9jZXNzLCBzZWUgaHR0cHM6Ly91cGRhdGUuYW5ndWxhci5pby8/dj0ke2N1cnJlbnRNYWpvclZlcnNpb259LjAtJHtuZXh0TWFqb3JWZXJzaW9uRnJvbUN1cnJlbnR9LjBgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwYWNrYWdlc1RvVXBkYXRlLnB1c2gocmVxdWVzdElkZW50aWZpZXIudG9TdHJpbmcoKSk7XG4gICAgfVxuXG4gICAgaWYgKHBhY2thZ2VzVG9VcGRhdGUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBjb25zdCB7IHN1Y2Nlc3MgfSA9IGF3YWl0IHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICAgIHdvcmtmbG93LFxuICAgICAgVVBEQVRFX1NDSEVNQVRJQ19DT0xMRUNUSU9OLFxuICAgICAgJ3VwZGF0ZScsXG4gICAgICB7XG4gICAgICAgIHZlcmJvc2U6IG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgZm9yY2U6IG9wdGlvbnMuZm9yY2UsXG4gICAgICAgIG5leHQ6IG9wdGlvbnMubmV4dCxcbiAgICAgICAgcGFja2FnZU1hbmFnZXI6IHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci5uYW1lLFxuICAgICAgICBwYWNrYWdlczogcGFja2FnZXNUb1VwZGF0ZSxcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5ybShwYXRoLmpvaW4odGhpcy5jb250ZXh0LnJvb3QsICdub2RlX21vZHVsZXMnKSwge1xuICAgICAgICAgIGZvcmNlOiB0cnVlLFxuICAgICAgICAgIHJlY3Vyc2l2ZTogdHJ1ZSxcbiAgICAgICAgICBtYXhSZXRyaWVzOiAzLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2gge31cblxuICAgICAgY29uc3QgaW5zdGFsbGF0aW9uU3VjY2VzcyA9IGF3YWl0IHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci5pbnN0YWxsQWxsKFxuICAgICAgICB0aGlzLnBhY2thZ2VNYW5hZ2VyRm9yY2Uob3B0aW9ucy52ZXJib3NlKSA/IFsnLS1mb3JjZSddIDogW10sXG4gICAgICAgIHRoaXMuY29udGV4dC5yb290LFxuICAgICAgKTtcblxuICAgICAgaWYgKCFpbnN0YWxsYXRpb25TdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdWNjZXNzICYmIG9wdGlvbnMuY3JlYXRlQ29tbWl0cykge1xuICAgICAgaWYgKCF0aGlzLmNvbW1pdChgQW5ndWxhciBDTEkgdXBkYXRlIGZvciBwYWNrYWdlcyAtICR7cGFja2FnZXNUb1VwZGF0ZS5qb2luKCcsICcpfWApKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoaXMgaXMgYSB0ZW1wb3Jhcnkgd29ya2Fyb3VuZCB0byBhbGxvdyBkYXRhIHRvIGJlIHBhc3NlZCBiYWNrIGZyb20gdGhlIHVwZGF0ZSBzY2hlbWF0aWNcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IG1pZ3JhdGlvbnMgPSAoZ2xvYmFsIGFzIGFueSkuZXh0ZXJuYWxNaWdyYXRpb25zIGFzIHtcbiAgICAgIHBhY2thZ2U6IHN0cmluZztcbiAgICAgIGNvbGxlY3Rpb246IHN0cmluZztcbiAgICAgIGZyb206IHN0cmluZztcbiAgICAgIHRvOiBzdHJpbmc7XG4gICAgfVtdO1xuXG4gICAgaWYgKHN1Y2Nlc3MgJiYgbWlncmF0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBtaWdyYXRpb24gb2YgbWlncmF0aW9ucykge1xuICAgICAgICAvLyBSZXNvbHZlIHRoZSBwYWNrYWdlIGZyb20gdGhlIHdvcmtzcGFjZSByb290LCBhcyBvdGhlcndpc2UgaXQgd2lsbCBiZSByZXNvbHZlZCBmcm9tIHRoZSB0ZW1wXG4gICAgICAgIC8vIGluc3RhbGxlZCBDTEkgdmVyc2lvbi5cbiAgICAgICAgbGV0IHBhY2thZ2VQYXRoO1xuICAgICAgICBsb2dWZXJib3NlKFxuICAgICAgICAgIGBSZXNvbHZpbmcgbWlncmF0aW9uIHBhY2thZ2UgJyR7bWlncmF0aW9uLnBhY2thZ2V9JyBmcm9tICcke3RoaXMuY29udGV4dC5yb290fScuLi5gLFxuICAgICAgICApO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwYWNrYWdlUGF0aCA9IHBhdGguZGlybmFtZShcbiAgICAgICAgICAgICAgLy8gVGhpcyBtYXkgZmFpbCBpZiB0aGUgYHBhY2thZ2UuanNvbmAgaXMgbm90IGV4cG9ydGVkIGFzIGFuIGVudHJ5IHBvaW50XG4gICAgICAgICAgICAgIHJlcXVpcmUucmVzb2x2ZShwYXRoLmpvaW4obWlncmF0aW9uLnBhY2thZ2UsICdwYWNrYWdlLmpzb24nKSwge1xuICAgICAgICAgICAgICAgIHBhdGhzOiBbdGhpcy5jb250ZXh0LnJvb3RdLFxuICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byB0cnlpbmcgdG8gcmVzb2x2ZSB0aGUgcGFja2FnZSdzIG1haW4gZW50cnkgcG9pbnRcbiAgICAgICAgICAgICAgcGFja2FnZVBhdGggPSByZXF1aXJlLnJlc29sdmUobWlncmF0aW9uLnBhY2thZ2UsIHsgcGF0aHM6IFt0aGlzLmNvbnRleHQucm9vdF0gfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICBsb2dWZXJib3NlKGUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBNaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkgd2VyZSBub3QgZm91bmQuYCArXG4gICAgICAgICAgICAgICAgJyBUaGUgcGFja2FnZSBjb3VsZCBub3QgYmUgZm91bmQgaW4gdGhlIHdvcmtzcGFjZS4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVW5hYmxlIHRvIHJlc29sdmUgbWlncmF0aW9ucyBmb3IgcGFja2FnZSAoJHttaWdyYXRpb24ucGFja2FnZX0pLiAgWyR7ZS5tZXNzYWdlfV1gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBtaWdyYXRpb25zO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0IGlzIGEgcGFja2FnZS1sb2NhbCBsb2NhdGlvblxuICAgICAgICBjb25zdCBsb2NhbE1pZ3JhdGlvbnMgPSBwYXRoLmpvaW4ocGFja2FnZVBhdGgsIG1pZ3JhdGlvbi5jb2xsZWN0aW9uKTtcbiAgICAgICAgaWYgKGV4aXN0c1N5bmMobG9jYWxNaWdyYXRpb25zKSkge1xuICAgICAgICAgIG1pZ3JhdGlvbnMgPSBsb2NhbE1pZ3JhdGlvbnM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVHJ5IHRvIHJlc29sdmUgZnJvbSBwYWNrYWdlIGxvY2F0aW9uLlxuICAgICAgICAgIC8vIFRoaXMgYXZvaWRzIGlzc3VlcyB3aXRoIHBhY2thZ2UgaG9pc3RpbmcuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG1pZ3JhdGlvbnMgPSByZXF1aXJlLnJlc29sdmUobWlncmF0aW9uLmNvbGxlY3Rpb24sIHsgcGF0aHM6IFtwYWNrYWdlUGF0aF0gfSk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoYE1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KSB3ZXJlIG5vdCBmb3VuZC5gKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgICBgVW5hYmxlIHRvIHJlc29sdmUgbWlncmF0aW9ucyBmb3IgcGFja2FnZSAoJHttaWdyYXRpb24ucGFja2FnZX0pLiAgWyR7ZS5tZXNzYWdlfV1gLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlTWlncmF0aW9ucyhcbiAgICAgICAgICB3b3JrZmxvdyxcbiAgICAgICAgICBtaWdyYXRpb24ucGFja2FnZSxcbiAgICAgICAgICBtaWdyYXRpb25zLFxuICAgICAgICAgIG1pZ3JhdGlvbi5mcm9tLFxuICAgICAgICAgIG1pZ3JhdGlvbi50byxcbiAgICAgICAgICBvcHRpb25zLmNyZWF0ZUNvbW1pdHMsXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gQSBub24temVybyB2YWx1ZSBpcyBhIGZhaWx1cmUgZm9yIHRoZSBwYWNrYWdlJ3MgbWlncmF0aW9uc1xuICAgICAgICBpZiAocmVzdWx0ICE9PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdWNjZXNzID8gMCA6IDE7XG4gIH1cbiAgLyoqXG4gICAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIGNvbW1pdCB3YXMgc3VjY2Vzc2Z1bC5cbiAgICovXG4gIHByaXZhdGUgY29tbWl0KG1lc3NhZ2U6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICAvLyBDaGVjayBpZiBhIGNvbW1pdCBpcyBuZWVkZWQuXG4gICAgbGV0IGNvbW1pdE5lZWRlZDogYm9vbGVhbjtcbiAgICB0cnkge1xuICAgICAgY29tbWl0TmVlZGVkID0gaGFzQ2hhbmdlc1RvQ29tbWl0KCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYCAgRmFpbGVkIHRvIHJlYWQgR2l0IHRyZWU6XFxuJHsoZXJyIGFzIFNwYXduU3luY1JldHVybnM8c3RyaW5nPikuc3RkZXJyfWApO1xuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFjb21taXROZWVkZWQpIHtcbiAgICAgIGxvZ2dlci5pbmZvKCcgIE5vIGNoYW5nZXMgdG8gY29tbWl0IGFmdGVyIG1pZ3JhdGlvbi4nKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gQ29tbWl0IGNoYW5nZXMgYW5kIGFib3J0IG9uIGVycm9yLlxuICAgIHRyeSB7XG4gICAgICBjcmVhdGVDb21taXQobWVzc2FnZSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgIGBGYWlsZWQgdG8gY29tbWl0IHVwZGF0ZSAoJHttZXNzYWdlfSk6XFxuJHsoZXJyIGFzIFNwYXduU3luY1JldHVybnM8c3RyaW5nPikuc3RkZXJyfWAsXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gTm90aWZ5IHVzZXIgb2YgdGhlIGNvbW1pdC5cbiAgICBjb25zdCBoYXNoID0gZmluZEN1cnJlbnRHaXRTaGEoKTtcbiAgICBjb25zdCBzaG9ydE1lc3NhZ2UgPSBtZXNzYWdlLnNwbGl0KCdcXG4nKVswXTtcbiAgICBpZiAoaGFzaCkge1xuICAgICAgbG9nZ2VyLmluZm8oYCAgQ29tbWl0dGVkIG1pZ3JhdGlvbiBzdGVwICgke2dldFNob3J0SGFzaChoYXNoKX0pOiAke3Nob3J0TWVzc2FnZX0uYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIENvbW1pdCB3YXMgc3VjY2Vzc2Z1bCwgYnV0IHJlYWRpbmcgdGhlIGhhc2ggd2FzIG5vdC4gU29tZXRoaW5nIHdlaXJkIGhhcHBlbmVkLFxuICAgICAgLy8gYnV0IG5vdGhpbmcgdGhhdCB3b3VsZCBzdG9wIHRoZSB1cGRhdGUuIEp1c3QgbG9nIHRoZSB3ZWlyZG5lc3MgYW5kIGNvbnRpbnVlLlxuICAgICAgbG9nZ2VyLmluZm8oYCAgQ29tbWl0dGVkIG1pZ3JhdGlvbiBzdGVwOiAke3Nob3J0TWVzc2FnZX0uYCk7XG4gICAgICBsb2dnZXIud2FybignICBGYWlsZWQgdG8gbG9vayB1cCBoYXNoIG9mIG1vc3QgcmVjZW50IGNvbW1pdCwgY29udGludWluZyBhbnl3YXlzLicpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBjaGVja0NsZWFuR2l0KCk6IGJvb2xlYW4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0b3BMZXZlbCA9IGV4ZWNTeW5jKCdnaXQgcmV2LXBhcnNlIC0tc2hvdy10b3BsZXZlbCcsIHtcbiAgICAgICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICAgICAgc3RkaW86ICdwaXBlJyxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcmVzdWx0ID0gZXhlY1N5bmMoJ2dpdCBzdGF0dXMgLS1wb3JjZWxhaW4nLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSk7XG4gICAgICBpZiAocmVzdWx0LnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgZmlsZXMgaW5zaWRlIHRoZSB3b3Jrc3BhY2Ugcm9vdCBhcmUgcmVsZXZhbnRcbiAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgcmVzdWx0LnNwbGl0KCdcXG4nKSkge1xuICAgICAgICBjb25zdCByZWxhdGl2ZUVudHJ5ID0gcGF0aC5yZWxhdGl2ZShcbiAgICAgICAgICBwYXRoLnJlc29sdmUodGhpcy5jb250ZXh0LnJvb3QpLFxuICAgICAgICAgIHBhdGgucmVzb2x2ZSh0b3BMZXZlbC50cmltKCksIGVudHJ5LnNsaWNlKDMpLnRyaW0oKSksXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKCFyZWxhdGl2ZUVudHJ5LnN0YXJ0c1dpdGgoJy4uJykgJiYgIXBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZUVudHJ5KSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2gge31cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgY3VycmVudCBpbnN0YWxsZWQgQ0xJIHZlcnNpb24gaXMgb2xkZXIgb3IgbmV3ZXIgdGhhbiBhIGNvbXBhdGlibGUgdmVyc2lvbi5cbiAgICogQHJldHVybnMgdGhlIHZlcnNpb24gdG8gaW5zdGFsbCBvciBudWxsIHdoZW4gdGhlcmUgaXMgbm8gdXBkYXRlIHRvIGluc3RhbGwuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGNoZWNrQ0xJVmVyc2lvbihcbiAgICBwYWNrYWdlc1RvVXBkYXRlOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCxcbiAgICB2ZXJib3NlID0gZmFsc2UsXG4gICAgbmV4dCA9IGZhbHNlLFxuICApOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICBjb25zdCB7IHZlcnNpb24gfSA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KFxuICAgICAgYEBhbmd1bGFyL2NsaUAke3RoaXMuZ2V0Q0xJVXBkYXRlUnVubmVyVmVyc2lvbihwYWNrYWdlc1RvVXBkYXRlLCBuZXh0KX1gLFxuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlcixcbiAgICAgIHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgdXNpbmdZYXJuOiB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIubmFtZSA9PT0gUGFja2FnZU1hbmFnZXIuWWFybixcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIHJldHVybiBWRVJTSU9OLmZ1bGwgPT09IHZlcnNpb24gPyBudWxsIDogdmVyc2lvbjtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q0xJVXBkYXRlUnVubmVyVmVyc2lvbihcbiAgICBwYWNrYWdlc1RvVXBkYXRlOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCxcbiAgICBuZXh0OiBib29sZWFuLFxuICApOiBzdHJpbmcgfCBudW1iZXIge1xuICAgIGlmIChuZXh0KSB7XG4gICAgICByZXR1cm4gJ25leHQnO1xuICAgIH1cblxuICAgIGNvbnN0IHVwZGF0aW5nQW5ndWxhclBhY2thZ2UgPSBwYWNrYWdlc1RvVXBkYXRlPy5maW5kKChyKSA9PiBBTkdVTEFSX1BBQ0tBR0VTX1JFR0VYUC50ZXN0KHIpKTtcbiAgICBpZiAodXBkYXRpbmdBbmd1bGFyUGFja2FnZSkge1xuICAgICAgLy8gSWYgd2UgYXJlIHVwZGF0aW5nIGFueSBBbmd1bGFyIHBhY2thZ2Ugd2UgY2FuIHVwZGF0ZSB0aGUgQ0xJIHRvIHRoZSB0YXJnZXQgdmVyc2lvbiBiZWNhdXNlXG4gICAgICAvLyBtaWdyYXRpb25zIGZvciBAYW5ndWxhci9jb3JlQDEzIGNhbiBiZSBleGVjdXRlZCB1c2luZyBBbmd1bGFyL2NsaUAxMy5cbiAgICAgIC8vIFRoaXMgaXMgc2FtZSBiZWhhdmlvdXIgYXMgYG5weCBAYW5ndWxhci9jbGlAMTMgdXBkYXRlIEBhbmd1bGFyL2NvcmVAMTNgLlxuXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpQDEzYCAtPiBbJycsICdhbmd1bGFyL2NsaScsICcxMyddXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpYCAtPiBbJycsICdhbmd1bGFyL2NsaSddXG4gICAgICBjb25zdCB0ZW1wVmVyc2lvbiA9IGNvZXJjZVZlcnNpb25OdW1iZXIodXBkYXRpbmdBbmd1bGFyUGFja2FnZS5zcGxpdCgnQCcpWzJdKTtcblxuICAgICAgcmV0dXJuIHNlbXZlci5wYXJzZSh0ZW1wVmVyc2lvbik/Lm1ham9yID8/ICdsYXRlc3QnO1xuICAgIH1cblxuICAgIC8vIFdoZW4gbm90IHVwZGF0aW5nIGFuIEFuZ3VsYXIgcGFja2FnZSB3ZSBjYW5ub3QgZGV0ZXJtaW5lIHdoaWNoIHNjaGVtYXRpYyBydW50aW1lIHRoZSBtaWdyYXRpb24gc2hvdWxkIHRvIGJlIGV4ZWN1dGVkIGluLlxuICAgIC8vIFR5cGljYWxseSwgd2UgY2FuIGFzc3VtZSB0aGF0IHRoZSBgQGFuZ3VsYXIvY2xpYCB3YXMgdXBkYXRlZCBwcmV2aW91c2x5LlxuICAgIC8vIEV4YW1wbGU6IEFuZ3VsYXIgb2ZmaWNpYWwgcGFja2FnZXMgYXJlIHR5cGljYWxseSB1cGRhdGVkIHByaW9yIHRvIE5HUlggZXRjLi4uXG4gICAgLy8gVGhlcmVmb3JlLCB3ZSBvbmx5IHVwZGF0ZSB0byB0aGUgbGF0ZXN0IHBhdGNoIHZlcnNpb24gb2YgdGhlIGluc3RhbGxlZCBtYWpvciB2ZXJzaW9uIG9mIHRoZSBBbmd1bGFyIENMSS5cblxuICAgIC8vIFRoaXMgaXMgaW1wb3J0YW50IGJlY2F1c2Ugd2UgbWlnaHQgZW5kIHVwIGluIGEgc2NlbmFyaW8gd2hlcmUgbG9jYWxseSBBbmd1bGFyIHYxMiBpcyBpbnN0YWxsZWQsIHVwZGF0aW5nIE5HUlggZnJvbSAxMSB0byAxMi5cbiAgICAvLyBXZSBlbmQgdXAgdXNpbmcgQW5ndWxhciBDbEkgdjEzIHRvIHJ1biB0aGUgbWlncmF0aW9ucyBpZiB3ZSBydW4gdGhlIG1pZ3JhdGlvbnMgdXNpbmcgdGhlIENMSSBpbnN0YWxsZWQgbWFqb3IgdmVyc2lvbiArIDEgbG9naWMuXG4gICAgcmV0dXJuIFZFUlNJT04ubWFqb3I7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJ1blRlbXBCaW5hcnkocGFja2FnZU5hbWU6IHN0cmluZywgYXJnczogc3RyaW5nW10gPSBbXSk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBzdWNjZXNzLCB0ZW1wTm9kZU1vZHVsZXMgfSA9IGF3YWl0IHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci5pbnN0YWxsVGVtcChwYWNrYWdlTmFtZSk7XG4gICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgdmVyc2lvbi90YWcgZXRjLi4uIGZyb20gcGFja2FnZSBuYW1lXG4gICAgLy8gRXg6IEBhbmd1bGFyL2NsaUBsYXRlc3QgLT4gQGFuZ3VsYXIvY2xpXG4gICAgY29uc3QgcGFja2FnZU5hbWVOb1ZlcnNpb24gPSBwYWNrYWdlTmFtZS5zdWJzdHJpbmcoMCwgcGFja2FnZU5hbWUubGFzdEluZGV4T2YoJ0AnKSk7XG4gICAgY29uc3QgcGtnTG9jYXRpb24gPSBqb2luKHRlbXBOb2RlTW9kdWxlcywgcGFja2FnZU5hbWVOb1ZlcnNpb24pO1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IGpvaW4ocGtnTG9jYXRpb24sICdwYWNrYWdlLmpzb24nKTtcblxuICAgIC8vIEdldCBhIGJpbmFyeSBsb2NhdGlvbiBmb3IgdGhpcyBwYWNrYWdlXG4gICAgbGV0IGJpblBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBpZiAoZXhpc3RzU3luYyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoLCAndXRmLTgnKTtcbiAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgIGNvbnN0IHsgYmluID0ge30gfSA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgICAgIGNvbnN0IGJpbktleXMgPSBPYmplY3Qua2V5cyhiaW4pO1xuXG4gICAgICAgIGlmIChiaW5LZXlzLmxlbmd0aCkge1xuICAgICAgICAgIGJpblBhdGggPSByZXNvbHZlKHBrZ0xvY2F0aW9uLCBiaW5bYmluS2V5c1swXV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFiaW5QYXRoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBsb2NhdGUgYmluIGZvciB0ZW1wb3JhcnkgcGFja2FnZTogJHtwYWNrYWdlTmFtZU5vVmVyc2lvbn0uYCk7XG4gICAgfVxuXG4gICAgY29uc3QgeyBzdGF0dXMsIGVycm9yIH0gPSBzcGF3blN5bmMocHJvY2Vzcy5leGVjUGF0aCwgW2JpblBhdGgsIC4uLmFyZ3NdLCB7XG4gICAgICBzdGRpbzogJ2luaGVyaXQnLFxuICAgICAgZW52OiB7XG4gICAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgICBOR19ESVNBQkxFX1ZFUlNJT05fQ0hFQ0s6ICd0cnVlJyxcbiAgICAgICAgTkdfQ0xJX0FOQUxZVElDUzogJ2ZhbHNlJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBpZiAoc3RhdHVzID09PSBudWxsICYmIGVycm9yKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdHVzID8/IDA7XG4gIH1cblxuICBwcml2YXRlIHBhY2thZ2VNYW5hZ2VyRm9yY2UodmVyYm9zZTogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIC8vIG5wbSA3KyBjYW4gZmFpbCBkdWUgdG8gaXQgaW5jb3JyZWN0bHkgcmVzb2x2aW5nIHBlZXIgZGVwZW5kZW5jaWVzIHRoYXQgaGF2ZSB2YWxpZCBTZW1WZXJcbiAgICAvLyByYW5nZXMgZHVyaW5nIGFuIHVwZGF0ZS4gVXBkYXRlIHdpbGwgc2V0IGNvcnJlY3QgdmVyc2lvbnMgb2YgZGVwZW5kZW5jaWVzIHdpdGhpbiB0aGVcbiAgICAvLyBwYWNrYWdlLmpzb24gZmlsZS4gVGhlIGZvcmNlIG9wdGlvbiBpcyBzZXQgdG8gd29ya2Fyb3VuZCB0aGVzZSBlcnJvcnMuXG4gICAgLy8gRXhhbXBsZSBlcnJvcjpcbiAgICAvLyBucG0gRVJSISBDb25mbGljdGluZyBwZWVyIGRlcGVuZGVuY3k6IEBhbmd1bGFyL2NvbXBpbGVyLWNsaUAxNC4wLjAtcmMuMFxuICAgIC8vIG5wbSBFUlIhIG5vZGVfbW9kdWxlcy9AYW5ndWxhci9jb21waWxlci1jbGlcbiAgICAvLyBucG0gRVJSISAgIHBlZXIgQGFuZ3VsYXIvY29tcGlsZXItY2xpQFwiXjE0LjAuMCB8fCBeMTQuMC4wLXJjXCIgZnJvbSBAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhckAxNC4wLjAtcmMuMFxuICAgIC8vIG5wbSBFUlIhICAgbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyXG4gICAgLy8gbnBtIEVSUiEgICAgIGRldiBAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhckBcIn4xNC4wLjAtcmMuMFwiIGZyb20gdGhlIHJvb3QgcHJvamVjdFxuICAgIGlmIChcbiAgICAgIHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci5uYW1lID09PSBQYWNrYWdlTWFuYWdlci5OcG0gJiZcbiAgICAgIHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci52ZXJzaW9uICYmXG4gICAgICBzZW12ZXIuZ3RlKHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci52ZXJzaW9uLCAnNy4wLjAnLCB7IGluY2x1ZGVQcmVyZWxlYXNlOiB0cnVlIH0pXG4gICAgKSB7XG4gICAgICBpZiAodmVyYm9zZSkge1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmluZm8oXG4gICAgICAgICAgJ05QTSA3KyBkZXRlY3RlZCAtLSBlbmFibGluZyBmb3JjZSBvcHRpb24gZm9yIHBhY2thZ2UgaW5zdGFsbGF0aW9uJyxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgd29ya2luZyBkaXJlY3RvcnkgaGFzIEdpdCBjaGFuZ2VzIHRvIGNvbW1pdC5cbiAqL1xuZnVuY3Rpb24gaGFzQ2hhbmdlc1RvQ29tbWl0KCk6IGJvb2xlYW4ge1xuICAvLyBMaXN0IGFsbCBtb2RpZmllZCBmaWxlcyBub3QgY292ZXJlZCBieSAuZ2l0aWdub3JlLlxuICAvLyBJZiBhbnkgZmlsZXMgYXJlIHJldHVybmVkLCB0aGVuIHRoZXJlIG11c3QgYmUgc29tZXRoaW5nIHRvIGNvbW1pdC5cblxuICByZXR1cm4gZXhlY1N5bmMoJ2dpdCBscy1maWxlcyAtbSAtZCAtbyAtLWV4Y2x1ZGUtc3RhbmRhcmQnKS50b1N0cmluZygpICE9PSAnJztcbn1cblxuLyoqXG4gKiBQcmVjb25kaXRpb246IE11c3QgaGF2ZSBwZW5kaW5nIGNoYW5nZXMgdG8gY29tbWl0LCB0aGV5IGRvIG5vdCBuZWVkIHRvIGJlIHN0YWdlZC5cbiAqIFBvc3Rjb25kaXRpb246IFRoZSBHaXQgd29ya2luZyB0cmVlIGlzIGNvbW1pdHRlZCBhbmQgdGhlIHJlcG8gaXMgY2xlYW4uXG4gKiBAcGFyYW0gbWVzc2FnZSBUaGUgY29tbWl0IG1lc3NhZ2UgdG8gdXNlLlxuICovXG5mdW5jdGlvbiBjcmVhdGVDb21taXQobWVzc2FnZTogc3RyaW5nKSB7XG4gIC8vIFN0YWdlIGVudGlyZSB3b3JraW5nIHRyZWUgZm9yIGNvbW1pdC5cbiAgZXhlY1N5bmMoJ2dpdCBhZGQgLUEnLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSk7XG5cbiAgLy8gQ29tbWl0IHdpdGggdGhlIG1lc3NhZ2UgcGFzc2VkIHZpYSBzdGRpbiB0byBhdm9pZCBiYXNoIGVzY2FwaW5nIGlzc3Vlcy5cbiAgZXhlY1N5bmMoJ2dpdCBjb21taXQgLS1uby12ZXJpZnkgLUYgLScsIHsgZW5jb2Rpbmc6ICd1dGY4Jywgc3RkaW86ICdwaXBlJywgaW5wdXQ6IG1lc3NhZ2UgfSk7XG59XG5cbi8qKlxuICogQHJldHVybiBUaGUgR2l0IFNIQSBoYXNoIG9mIHRoZSBIRUFEIGNvbW1pdC4gUmV0dXJucyBudWxsIGlmIHVuYWJsZSB0byByZXRyaWV2ZSB0aGUgaGFzaC5cbiAqL1xuZnVuY3Rpb24gZmluZEN1cnJlbnRHaXRTaGEoKTogc3RyaW5nIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGV4ZWNTeW5jKCdnaXQgcmV2LXBhcnNlIEhFQUQnLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSkudHJpbSgpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTaG9ydEhhc2goY29tbWl0SGFzaDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNvbW1pdEhhc2guc2xpY2UoMCwgOSk7XG59XG5cbmZ1bmN0aW9uIGNvZXJjZVZlcnNpb25OdW1iZXIodmVyc2lvbjogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKCF2ZXJzaW9uKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICghL15cXGR7MSwzMH1cXC5cXGR7MSwzMH1cXC5cXGR7MSwzMH0vLnRlc3QodmVyc2lvbikpIHtcbiAgICBjb25zdCBtYXRjaCA9IHZlcnNpb24ubWF0Y2goL15cXGR7MSwzMH0oXFwuXFxkezEsMzB9KSovKTtcblxuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKCFtYXRjaFsxXSkge1xuICAgICAgdmVyc2lvbiA9IHZlcnNpb24uc3Vic3RyaW5nKDAsIG1hdGNoWzBdLmxlbmd0aCkgKyAnLjAuMCcgKyB2ZXJzaW9uLnN1YnN0cmluZyhtYXRjaFswXS5sZW5ndGgpO1xuICAgIH0gZWxzZSBpZiAoIW1hdGNoWzJdKSB7XG4gICAgICB2ZXJzaW9uID0gdmVyc2lvbi5zdWJzdHJpbmcoMCwgbWF0Y2hbMF0ubGVuZ3RoKSArICcuMCcgKyB2ZXJzaW9uLnN1YnN0cmluZyhtYXRjaFswXS5sZW5ndGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBzZW12ZXIudmFsaWQodmVyc2lvbikgPz8gdW5kZWZpbmVkO1xufVxuIl19