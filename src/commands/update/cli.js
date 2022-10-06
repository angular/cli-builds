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
        var _a, _b, _c;
        const { logger, packageManager } = this.context;
        packageManager.ensureCompatibility();
        // Check if the current installed CLI version is older than the latest compatible version.
        // Skip when running `ng update` without a package name as this will not trigger an actual update.
        if (!environment_options_1.disableVersionCheck && ((_a = options.packages) === null || _a === void 0 ? void 0 : _a.length)) {
            const cliVersionToInstall = await this.checkCLIVersion(options.packages, options.verbose, options.next);
            if (cliVersionToInstall) {
                logger.warn('The installed Angular CLI version is outdated.\n' +
                    `Installing a temporary Angular CLI versioned ${cliVersionToInstall} to perform the update.`);
                return this.runTempBinary(`@angular/cli@${cliVersionToInstall}`, process.argv.slice(2));
            }
        }
        const packages = [];
        for (const request of (_b = options.packages) !== null && _b !== void 0 ? _b : []) {
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
            ? this.migrateOnly(workflow, ((_c = options.packages) !== null && _c !== void 0 ? _c : [])[0], rootDependencies, options)
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
            semver.gte(this.context.packageManager.version, '7.0.0')) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3VwZGF0ZS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwyREFBMkU7QUFDM0UsNERBQWdFO0FBQ2hFLGlEQUFzRTtBQUN0RSwyQkFBZ0Q7QUFDaEQsc0VBQWtDO0FBQ2xDLDBFQUE2QztBQUM3QywyQ0FBNkI7QUFDN0IsK0JBQXFDO0FBQ3JDLCtDQUFpQztBQUVqQywyRUFBc0U7QUFDdEUseUVBSzhDO0FBQzlDLGlHQUE0RjtBQUM1RiwyRkFBeUY7QUFDekYsaURBQStDO0FBQy9DLDZFQUEwRTtBQUMxRSxpREFBc0Q7QUFDdEQsdURBQStEO0FBQy9ELHVFQUswQztBQUMxQywrREFLc0M7QUFDdEMscURBQWtEO0FBZWxELE1BQU0sdUJBQXVCLEdBQUcsNkJBQTZCLENBQUM7QUFDOUQsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO0FBRXRGLE1BQWEsbUJBQW9CLFNBQVEsOEJBQWdDO0lBQXpFOztRQUNXLFVBQUssR0FBRyw2QkFBWSxDQUFDLEVBQUUsQ0FBQztRQUNkLDBCQUFxQixHQUFHLEtBQUssQ0FBQztRQUVqRCxZQUFPLEdBQUcscUJBQXFCLENBQUM7UUFDaEMsYUFBUSxHQUFHLDhFQUE4RSxDQUFDO1FBQzFGLHdCQUFtQixHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBdTZCL0QsQ0FBQztJQXI2QkMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVTthQUNkLFVBQVUsQ0FBQyxVQUFVLEVBQUU7WUFDdEIsV0FBVyxFQUFFLG9DQUFvQztZQUNqRCxJQUFJLEVBQUUsUUFB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QUFDLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDN0Y7YUFBTTtZQUNMLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO0tBQ0Y7SUFFRCxPQUFPLE1BQUEsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsbUNBQUksU0FBUyxDQUFDO0FBQzVDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlV29ya2Zsb3cgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgeyBTcGF3blN5bmNSZXR1cm5zLCBleGVjU3luYywgc3Bhd25TeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCBwcm9taXNlcyBhcyBmcyB9IGZyb20gJ2ZzJztcbmltcG9ydCBucGEgZnJvbSAnbnBtLXBhY2thZ2UtYXJnJztcbmltcG9ydCBwaWNrTWFuaWZlc3QgZnJvbSAnbnBtLXBpY2stbWFuaWZlc3QnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vLi4vLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGUsXG4gIENvbW1hbmRNb2R1bGVFcnJvcixcbiAgQ29tbWFuZFNjb3BlLFxuICBPcHRpb25zLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgU2NoZW1hdGljRW5naW5lSG9zdCB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvc2NoZW1hdGljLWVuZ2luZS1ob3N0JztcbmltcG9ydCB7IHN1YnNjcmliZVRvV29ya2Zsb3cgfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvdXRpbGl0aWVzL3NjaGVtYXRpYy13b3JrZmxvdyc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgZGlzYWJsZVZlcnNpb25DaGVjayB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IGFzc2VydElzRXJyb3IgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvZXJyb3InO1xuaW1wb3J0IHsgd3JpdGVFcnJvclRvTG9nRmlsZSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9sb2ctZmlsZSc7XG5pbXBvcnQge1xuICBQYWNrYWdlSWRlbnRpZmllcixcbiAgUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNYW5pZmVzdCxcbiAgZmV0Y2hQYWNrYWdlTWV0YWRhdGEsXG59IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wYWNrYWdlLW1ldGFkYXRhJztcbmltcG9ydCB7XG4gIFBhY2thZ2VUcmVlTm9kZSxcbiAgZmluZFBhY2thZ2VKc29uLFxuICBnZXRQcm9qZWN0RGVwZW5kZW5jaWVzLFxuICByZWFkUGFja2FnZUpzb24sXG59IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wYWNrYWdlLXRyZWUnO1xuaW1wb3J0IHsgVkVSU0lPTiB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy92ZXJzaW9uJztcblxuaW50ZXJmYWNlIFVwZGF0ZUNvbW1hbmRBcmdzIHtcbiAgcGFja2FnZXM/OiBzdHJpbmdbXTtcbiAgZm9yY2U6IGJvb2xlYW47XG4gIG5leHQ6IGJvb2xlYW47XG4gICdtaWdyYXRlLW9ubHknPzogYm9vbGVhbjtcbiAgbmFtZT86IHN0cmluZztcbiAgZnJvbT86IHN0cmluZztcbiAgdG8/OiBzdHJpbmc7XG4gICdhbGxvdy1kaXJ0eSc6IGJvb2xlYW47XG4gIHZlcmJvc2U6IGJvb2xlYW47XG4gICdjcmVhdGUtY29tbWl0cyc6IGJvb2xlYW47XG59XG5cbmNvbnN0IEFOR1VMQVJfUEFDS0FHRVNfUkVHRVhQID0gL15AKD86YW5ndWxhcnxuZ3VuaXZlcnNhbClcXC8vO1xuY29uc3QgVVBEQVRFX1NDSEVNQVRJQ19DT0xMRUNUSU9OID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJ3NjaGVtYXRpYy9jb2xsZWN0aW9uLmpzb24nKTtcblxuZXhwb3J0IGNsYXNzIFVwZGF0ZUNvbW1hbmRNb2R1bGUgZXh0ZW5kcyBDb21tYW5kTW9kdWxlPFVwZGF0ZUNvbW1hbmRBcmdzPiB7XG4gIG92ZXJyaWRlIHNjb3BlID0gQ29tbWFuZFNjb3BlLkluO1xuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgc2hvdWxkUmVwb3J0QW5hbHl0aWNzID0gZmFsc2U7XG5cbiAgY29tbWFuZCA9ICd1cGRhdGUgW3BhY2thZ2VzLi5dJztcbiAgZGVzY3JpYmUgPSAnVXBkYXRlcyB5b3VyIHdvcmtzcGFjZSBhbmQgaXRzIGRlcGVuZGVuY2llcy4gU2VlIGh0dHBzOi8vdXBkYXRlLmFuZ3VsYXIuaW8vLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSBqb2luKF9fZGlybmFtZSwgJ2xvbmctZGVzY3JpcHRpb24ubWQnKTtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2PFVwZGF0ZUNvbW1hbmRBcmdzPiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3NcbiAgICAgIC5wb3NpdGlvbmFsKCdwYWNrYWdlcycsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgbmFtZXMgb2YgcGFja2FnZShzKSB0byB1cGRhdGUuJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGFycmF5OiB0cnVlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2ZvcmNlJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ0lnbm9yZSBwZWVyIGRlcGVuZGVuY3kgdmVyc2lvbiBtaXNtYXRjaGVzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignbmV4dCcsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdVc2UgdGhlIHByZXJlbGVhc2UgdmVyc2lvbiwgaW5jbHVkaW5nIGJldGEgYW5kIFJDcy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ21pZ3JhdGUtb25seScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdPbmx5IHBlcmZvcm0gYSBtaWdyYXRpb24sIGRvIG5vdCB1cGRhdGUgdGhlIGluc3RhbGxlZCB2ZXJzaW9uLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCduYW1lJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAnVGhlIG5hbWUgb2YgdGhlIG1pZ3JhdGlvbiB0byBydW4uICcgK1xuICAgICAgICAgIGBPbmx5IGF2YWlsYWJsZSB3aXRoIGEgc2luZ2xlIHBhY2thZ2UgYmVpbmcgdXBkYXRlZCwgYW5kIG9ubHkgd2l0aCAnbWlncmF0ZS1vbmx5JyBvcHRpb24uYCxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGltcGxpZXM6IFsnbWlncmF0ZS1vbmx5J10sXG4gICAgICAgIGNvbmZsaWN0czogWyd0bycsICdmcm9tJ10sXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignZnJvbScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgJ1ZlcnNpb24gZnJvbSB3aGljaCB0byBtaWdyYXRlIGZyb20uICcgK1xuICAgICAgICAgIGBPbmx5IGF2YWlsYWJsZSB3aXRoIGEgc2luZ2xlIHBhY2thZ2UgYmVpbmcgdXBkYXRlZCwgYW5kIG9ubHkgd2l0aCAnbWlncmF0ZS1vbmx5Jy5gLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgaW1wbGllczogWyd0bycsICdtaWdyYXRlLW9ubHknXSxcbiAgICAgICAgY29uZmxpY3RzOiBbJ25hbWUnXSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCd0bycsIHtcbiAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgJ1ZlcnNpb24gdXAgdG8gd2hpY2ggdG8gYXBwbHkgbWlncmF0aW9ucy4gT25seSBhdmFpbGFibGUgd2l0aCBhIHNpbmdsZSBwYWNrYWdlIGJlaW5nIHVwZGF0ZWQsICcgK1xuICAgICAgICAgIGBhbmQgb25seSB3aXRoICdtaWdyYXRlLW9ubHknIG9wdGlvbi4gUmVxdWlyZXMgJ2Zyb20nIHRvIGJlIHNwZWNpZmllZC4gRGVmYXVsdCB0byB0aGUgaW5zdGFsbGVkIHZlcnNpb24gZGV0ZWN0ZWQuYCxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGltcGxpZXM6IFsnZnJvbScsICdtaWdyYXRlLW9ubHknXSxcbiAgICAgICAgY29uZmxpY3RzOiBbJ25hbWUnXSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdhbGxvdy1kaXJ0eScsIHtcbiAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgJ1doZXRoZXIgdG8gYWxsb3cgdXBkYXRpbmcgd2hlbiB0aGUgcmVwb3NpdG9yeSBjb250YWlucyBtb2RpZmllZCBvciB1bnRyYWNrZWQgZmlsZXMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCd2ZXJib3NlJywge1xuICAgICAgICBkZXNjcmliZTogJ0Rpc3BsYXkgYWRkaXRpb25hbCBkZXRhaWxzIGFib3V0IGludGVybmFsIG9wZXJhdGlvbnMgZHVyaW5nIGV4ZWN1dGlvbi4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2NyZWF0ZS1jb21taXRzJywge1xuICAgICAgICBkZXNjcmliZTogJ0NyZWF0ZSBzb3VyY2UgY29udHJvbCBjb21taXRzIGZvciB1cGRhdGVzIGFuZCBtaWdyYXRpb25zLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgYWxpYXM6IFsnQyddLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAuY2hlY2soKHsgcGFja2FnZXMsICdhbGxvdy1kaXJ0eSc6IGFsbG93RGlydHksICdtaWdyYXRlLW9ubHknOiBtaWdyYXRlT25seSB9KSA9PiB7XG4gICAgICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICAgICAgLy8gVGhpcyBhbGxvd3MgdGhlIHVzZXIgdG8gZWFzaWx5IHJlc2V0IGFueSBjaGFuZ2VzIGZyb20gdGhlIHVwZGF0ZS5cbiAgICAgICAgaWYgKHBhY2thZ2VzPy5sZW5ndGggJiYgIXRoaXMuY2hlY2tDbGVhbkdpdCgpKSB7XG4gICAgICAgICAgaWYgKGFsbG93RGlydHkpIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICAnUmVwb3NpdG9yeSBpcyBub3QgY2xlYW4uIFVwZGF0ZSBjaGFuZ2VzIHdpbGwgYmUgbWl4ZWQgd2l0aCBwcmUtZXhpc3RpbmcgY2hhbmdlcy4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihcbiAgICAgICAgICAgICAgJ1JlcG9zaXRvcnkgaXMgbm90IGNsZWFuLiBQbGVhc2UgY29tbWl0IG9yIHN0YXNoIGFueSBjaGFuZ2VzIGJlZm9yZSB1cGRhdGluZy4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWlncmF0ZU9ubHkpIHtcbiAgICAgICAgICBpZiAocGFja2FnZXM/Lmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihcbiAgICAgICAgICAgICAgYEEgc2luZ2xlIHBhY2thZ2UgbXVzdCBiZSBzcGVjaWZpZWQgd2hlbiB1c2luZyB0aGUgJ21pZ3JhdGUtb25seScgb3B0aW9uLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5zdHJpY3QoKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBPcHRpb25zPFVwZGF0ZUNvbW1hbmRBcmdzPik6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyLCBwYWNrYWdlTWFuYWdlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgcGFja2FnZU1hbmFnZXIuZW5zdXJlQ29tcGF0aWJpbGl0eSgpO1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgaW5zdGFsbGVkIENMSSB2ZXJzaW9uIGlzIG9sZGVyIHRoYW4gdGhlIGxhdGVzdCBjb21wYXRpYmxlIHZlcnNpb24uXG4gICAgLy8gU2tpcCB3aGVuIHJ1bm5pbmcgYG5nIHVwZGF0ZWAgd2l0aG91dCBhIHBhY2thZ2UgbmFtZSBhcyB0aGlzIHdpbGwgbm90IHRyaWdnZXIgYW4gYWN0dWFsIHVwZGF0ZS5cbiAgICBpZiAoIWRpc2FibGVWZXJzaW9uQ2hlY2sgJiYgb3B0aW9ucy5wYWNrYWdlcz8ubGVuZ3RoKSB7XG4gICAgICBjb25zdCBjbGlWZXJzaW9uVG9JbnN0YWxsID0gYXdhaXQgdGhpcy5jaGVja0NMSVZlcnNpb24oXG4gICAgICAgIG9wdGlvbnMucGFja2FnZXMsXG4gICAgICAgIG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgb3B0aW9ucy5uZXh0LFxuICAgICAgKTtcblxuICAgICAgaWYgKGNsaVZlcnNpb25Ub0luc3RhbGwpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgJ1RoZSBpbnN0YWxsZWQgQW5ndWxhciBDTEkgdmVyc2lvbiBpcyBvdXRkYXRlZC5cXG4nICtcbiAgICAgICAgICAgIGBJbnN0YWxsaW5nIGEgdGVtcG9yYXJ5IEFuZ3VsYXIgQ0xJIHZlcnNpb25lZCAke2NsaVZlcnNpb25Ub0luc3RhbGx9IHRvIHBlcmZvcm0gdGhlIHVwZGF0ZS5gLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiB0aGlzLnJ1blRlbXBCaW5hcnkoYEBhbmd1bGFyL2NsaUAke2NsaVZlcnNpb25Ub0luc3RhbGx9YCwgcHJvY2Vzcy5hcmd2LnNsaWNlKDIpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlczogUGFja2FnZUlkZW50aWZpZXJbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgcmVxdWVzdCBvZiBvcHRpb25zLnBhY2thZ2VzID8/IFtdKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYWNrYWdlSWRlbnRpZmllciA9IG5wYShyZXF1ZXN0KTtcblxuICAgICAgICAvLyBvbmx5IHJlZ2lzdHJ5IGlkZW50aWZpZXJzIGFyZSBzdXBwb3J0ZWRcbiAgICAgICAgaWYgKCFwYWNrYWdlSWRlbnRpZmllci5yZWdpc3RyeSkge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcihgUGFja2FnZSAnJHtyZXF1ZXN0fScgaXMgbm90IGEgcmVnaXN0cnkgcGFja2FnZSBpZGVudGlmZXIuYCk7XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwYWNrYWdlcy5zb21lKCh2KSA9PiB2Lm5hbWUgPT09IHBhY2thZ2VJZGVudGlmaWVyLm5hbWUpKSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKGBEdXBsaWNhdGUgcGFja2FnZSAnJHtwYWNrYWdlSWRlbnRpZmllci5uYW1lfScgc3BlY2lmaWVkLmApO1xuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5taWdyYXRlT25seSAmJiBwYWNrYWdlSWRlbnRpZmllci5yYXdTcGVjKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oJ1BhY2thZ2Ugc3BlY2lmaWVyIGhhcyBubyBlZmZlY3Qgd2hlbiB1c2luZyBcIm1pZ3JhdGUtb25seVwiIG9wdGlvbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIG5leHQgb3B0aW9uIGlzIHVzZWQgYW5kIG5vIHNwZWNpZmllciBzdXBwbGllZCwgdXNlIG5leHQgdGFnXG4gICAgICAgIGlmIChvcHRpb25zLm5leHQgJiYgIXBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMpIHtcbiAgICAgICAgICBwYWNrYWdlSWRlbnRpZmllci5mZXRjaFNwZWMgPSAnbmV4dCc7XG4gICAgICAgIH1cblxuICAgICAgICBwYWNrYWdlcy5wdXNoKHBhY2thZ2VJZGVudGlmaWVyIGFzIFBhY2thZ2VJZGVudGlmaWVyKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGUubWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oYFVzaW5nIHBhY2thZ2UgbWFuYWdlcjogJHtjb2xvcnMuZ3JleShwYWNrYWdlTWFuYWdlci5uYW1lKX1gKTtcbiAgICBsb2dnZXIuaW5mbygnQ29sbGVjdGluZyBpbnN0YWxsZWQgZGVwZW5kZW5jaWVzLi4uJyk7XG5cbiAgICBjb25zdCByb290RGVwZW5kZW5jaWVzID0gYXdhaXQgZ2V0UHJvamVjdERlcGVuZGVuY2llcyh0aGlzLmNvbnRleHQucm9vdCk7XG4gICAgbG9nZ2VyLmluZm8oYEZvdW5kICR7cm9vdERlcGVuZGVuY2llcy5zaXplfSBkZXBlbmRlbmNpZXMuYCk7XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IG5ldyBOb2RlV29ya2Zsb3codGhpcy5jb250ZXh0LnJvb3QsIHtcbiAgICAgIHBhY2thZ2VNYW5hZ2VyOiBwYWNrYWdlTWFuYWdlci5uYW1lLFxuICAgICAgcGFja2FnZU1hbmFnZXJGb3JjZTogdGhpcy5wYWNrYWdlTWFuYWdlckZvcmNlKG9wdGlvbnMudmVyYm9zZSksXG4gICAgICAvLyBfX2Rpcm5hbWUgLT4gZmF2b3IgQHNjaGVtYXRpY3MvdXBkYXRlIGZyb20gdGhpcyBwYWNrYWdlXG4gICAgICAvLyBPdGhlcndpc2UsIHVzZSBwYWNrYWdlcyBmcm9tIHRoZSBhY3RpdmUgd29ya3NwYWNlIChtaWdyYXRpb25zKVxuICAgICAgcmVzb2x2ZVBhdGhzOiBbX19kaXJuYW1lLCB0aGlzLmNvbnRleHQucm9vdF0sXG4gICAgICBzY2hlbWFWYWxpZGF0aW9uOiB0cnVlLFxuICAgICAgZW5naW5lSG9zdENyZWF0b3I6IChvcHRpb25zKSA9PiBuZXcgU2NoZW1hdGljRW5naW5lSG9zdChvcHRpb25zLnJlc29sdmVQYXRocyksXG4gICAgfSk7XG5cbiAgICBpZiAocGFja2FnZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBTaG93IHN0YXR1c1xuICAgICAgY29uc3QgeyBzdWNjZXNzIH0gPSBhd2FpdCB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgICAgIHdvcmtmbG93LFxuICAgICAgICBVUERBVEVfU0NIRU1BVElDX0NPTExFQ1RJT04sXG4gICAgICAgICd1cGRhdGUnLFxuICAgICAgICB7XG4gICAgICAgICAgZm9yY2U6IG9wdGlvbnMuZm9yY2UsXG4gICAgICAgICAgbmV4dDogb3B0aW9ucy5uZXh0LFxuICAgICAgICAgIHZlcmJvc2U6IG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgICBwYWNrYWdlTWFuYWdlcjogcGFja2FnZU1hbmFnZXIubmFtZSxcbiAgICAgICAgICBwYWNrYWdlczogW10sXG4gICAgICAgIH0sXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gc3VjY2VzcyA/IDAgOiAxO1xuICAgIH1cblxuICAgIHJldHVybiBvcHRpb25zLm1pZ3JhdGVPbmx5XG4gICAgICA/IHRoaXMubWlncmF0ZU9ubHkod29ya2Zsb3csIChvcHRpb25zLnBhY2thZ2VzID8/IFtdKVswXSwgcm9vdERlcGVuZGVuY2llcywgb3B0aW9ucylcbiAgICAgIDogdGhpcy51cGRhdGVQYWNrYWdlc0FuZE1pZ3JhdGUod29ya2Zsb3csIHJvb3REZXBlbmRlbmNpZXMsIG9wdGlvbnMsIHBhY2thZ2VzKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIGNvbGxlY3Rpb246IHN0cmluZyxcbiAgICBzY2hlbWF0aWM6IHN0cmluZyxcbiAgICBvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9LFxuICApOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgZmlsZXM6IFNldDxzdHJpbmc+IH0+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHdvcmtmbG93U3Vic2NyaXB0aW9uID0gc3Vic2NyaWJlVG9Xb3JrZmxvdyh3b3JrZmxvdywgbG9nZ2VyKTtcblxuICAgIC8vIFRPRE86IEFsbG93IHBhc3NpbmcgYSBzY2hlbWF0aWMgaW5zdGFuY2UgZGlyZWN0bHlcbiAgICB0cnkge1xuICAgICAgYXdhaXQgd29ya2Zsb3dcbiAgICAgICAgLmV4ZWN1dGUoe1xuICAgICAgICAgIGNvbGxlY3Rpb24sXG4gICAgICAgICAgc2NoZW1hdGljLFxuICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgbG9nZ2VyLFxuICAgICAgICB9KVxuICAgICAgICAudG9Qcm9taXNlKCk7XG5cbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6ICF3b3JrZmxvd1N1YnNjcmlwdGlvbi5lcnJvciwgZmlsZXM6IHdvcmtmbG93U3Vic2NyaXB0aW9uLmZpbGVzIH07XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbikge1xuICAgICAgICBsb2dnZXIuZXJyb3IoYCR7Y29sb3JzLnN5bWJvbHMuY3Jvc3N9IE1pZ3JhdGlvbiBmYWlsZWQuIFNlZSBhYm92ZSBmb3IgZnVydGhlciBkZXRhaWxzLlxcbmApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgY29uc3QgbG9nUGF0aCA9IHdyaXRlRXJyb3JUb0xvZ0ZpbGUoZSk7XG4gICAgICAgIGxvZ2dlci5mYXRhbChcbiAgICAgICAgICBgJHtjb2xvcnMuc3ltYm9scy5jcm9zc30gTWlncmF0aW9uIGZhaWxlZDogJHtlLm1lc3NhZ2V9XFxuYCArXG4gICAgICAgICAgICBgICBTZWUgXCIke2xvZ1BhdGh9XCIgZm9yIGZ1cnRoZXIgZGV0YWlscy5cXG5gLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZmlsZXM6IHdvcmtmbG93U3Vic2NyaXB0aW9uLmZpbGVzIH07XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHdvcmtmbG93U3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIG1pZ3JhdGlvbiB3YXMgcGVyZm9ybWVkIHN1Y2Nlc3NmdWxseS5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZU1pZ3JhdGlvbihcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgY29sbGVjdGlvblBhdGg6IHN0cmluZyxcbiAgICBtaWdyYXRpb25OYW1lOiBzdHJpbmcsXG4gICAgY29tbWl0PzogYm9vbGVhbixcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uUGF0aCk7XG4gICAgY29uc3QgbmFtZSA9IGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKCkuZmluZCgobmFtZSkgPT4gbmFtZSA9PT0gbWlncmF0aW9uTmFtZSk7XG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYENhbm5vdCBmaW5kIG1pZ3JhdGlvbiAnJHttaWdyYXRpb25OYW1lfScgaW4gJyR7cGFja2FnZU5hbWV9Jy5gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oY29sb3JzLmN5YW4oYCoqIEV4ZWN1dGluZyAnJHttaWdyYXRpb25OYW1lfScgb2YgcGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nICoqXFxuYCkpO1xuICAgIGNvbnN0IHNjaGVtYXRpYyA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVTY2hlbWF0aWMobmFtZSwgY29sbGVjdGlvbik7XG5cbiAgICByZXR1cm4gdGhpcy5leGVjdXRlUGFja2FnZU1pZ3JhdGlvbnMod29ya2Zsb3csIFtzY2hlbWF0aWMuZGVzY3JpcHRpb25dLCBwYWNrYWdlTmFtZSwgY29tbWl0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSBtaWdyYXRpb25zIHdlcmUgcGVyZm9ybWVkIHN1Y2Nlc3NmdWxseS5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZU1pZ3JhdGlvbnMoXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIGNvbGxlY3Rpb25QYXRoOiBzdHJpbmcsXG4gICAgZnJvbTogc3RyaW5nLFxuICAgIHRvOiBzdHJpbmcsXG4gICAgY29tbWl0PzogYm9vbGVhbixcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvblBhdGgpO1xuICAgIGNvbnN0IG1pZ3JhdGlvblJhbmdlID0gbmV3IHNlbXZlci5SYW5nZShcbiAgICAgICc+JyArIChzZW12ZXIucHJlcmVsZWFzZShmcm9tKSA/IGZyb20uc3BsaXQoJy0nKVswXSArICctMCcgOiBmcm9tKSArICcgPD0nICsgdG8uc3BsaXQoJy0nKVswXSxcbiAgICApO1xuICAgIGNvbnN0IG1pZ3JhdGlvbnMgPSBbXTtcblxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBjb2xsZWN0aW9uLmxpc3RTY2hlbWF0aWNOYW1lcygpKSB7XG4gICAgICBjb25zdCBzY2hlbWF0aWMgPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlU2NoZW1hdGljKG5hbWUsIGNvbGxlY3Rpb24pO1xuICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSBzY2hlbWF0aWMuZGVzY3JpcHRpb24gYXMgdHlwZW9mIHNjaGVtYXRpYy5kZXNjcmlwdGlvbiAmIHtcbiAgICAgICAgdmVyc2lvbj86IHN0cmluZztcbiAgICAgIH07XG4gICAgICBkZXNjcmlwdGlvbi52ZXJzaW9uID0gY29lcmNlVmVyc2lvbk51bWJlcihkZXNjcmlwdGlvbi52ZXJzaW9uKTtcbiAgICAgIGlmICghZGVzY3JpcHRpb24udmVyc2lvbikge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNlbXZlci5zYXRpc2ZpZXMoZGVzY3JpcHRpb24udmVyc2lvbiwgbWlncmF0aW9uUmFuZ2UsIHsgaW5jbHVkZVByZXJlbGVhc2U6IHRydWUgfSkpIHtcbiAgICAgICAgbWlncmF0aW9ucy5wdXNoKGRlc2NyaXB0aW9uIGFzIHR5cGVvZiBzY2hlbWF0aWMuZGVzY3JpcHRpb24gJiB7IHZlcnNpb246IHN0cmluZyB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWlncmF0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIG1pZ3JhdGlvbnMuc29ydCgoYSwgYikgPT4gc2VtdmVyLmNvbXBhcmUoYS52ZXJzaW9uLCBiLnZlcnNpb24pIHx8IGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSkpO1xuXG4gICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKFxuICAgICAgY29sb3JzLmN5YW4oYCoqIEV4ZWN1dGluZyBtaWdyYXRpb25zIG9mIHBhY2thZ2UgJyR7cGFja2FnZU5hbWV9JyAqKlxcbmApLFxuICAgICk7XG5cbiAgICByZXR1cm4gdGhpcy5leGVjdXRlUGFja2FnZU1pZ3JhdGlvbnMod29ya2Zsb3csIG1pZ3JhdGlvbnMsIHBhY2thZ2VOYW1lLCBjb21taXQpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlUGFja2FnZU1pZ3JhdGlvbnMoXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICBtaWdyYXRpb25zOiBJdGVyYWJsZTx7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb246IHN0cmluZzsgY29sbGVjdGlvbjogeyBuYW1lOiBzdHJpbmcgfSB9PixcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIGNvbW1pdCA9IGZhbHNlLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgZm9yIChjb25zdCBtaWdyYXRpb24gb2YgbWlncmF0aW9ucykge1xuICAgICAgY29uc3QgW3RpdGxlLCAuLi5kZXNjcmlwdGlvbl0gPSBtaWdyYXRpb24uZGVzY3JpcHRpb24uc3BsaXQoJy4gJyk7XG5cbiAgICAgIGxvZ2dlci5pbmZvKFxuICAgICAgICBjb2xvcnMuY3lhbihjb2xvcnMuc3ltYm9scy5wb2ludGVyKSArXG4gICAgICAgICAgJyAnICtcbiAgICAgICAgICBjb2xvcnMuYm9sZCh0aXRsZS5lbmRzV2l0aCgnLicpID8gdGl0bGUgOiB0aXRsZSArICcuJyksXG4gICAgICApO1xuXG4gICAgICBpZiAoZGVzY3JpcHRpb24ubGVuZ3RoKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKCcgICcgKyBkZXNjcmlwdGlvbi5qb2luKCcuXFxuICAnKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICAgICAgd29ya2Zsb3csXG4gICAgICAgIG1pZ3JhdGlvbi5jb2xsZWN0aW9uLm5hbWUsXG4gICAgICAgIG1pZ3JhdGlvbi5uYW1lLFxuICAgICAgKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIGxvZ2dlci5pbmZvKCcgIE1pZ3JhdGlvbiBjb21wbGV0ZWQuJyk7XG5cbiAgICAgIC8vIENvbW1pdCBtaWdyYXRpb25cbiAgICAgIGlmIChjb21taXQpIHtcbiAgICAgICAgY29uc3QgY29tbWl0UHJlZml4ID0gYCR7cGFja2FnZU5hbWV9IG1pZ3JhdGlvbiAtICR7bWlncmF0aW9uLm5hbWV9YDtcbiAgICAgICAgY29uc3QgY29tbWl0TWVzc2FnZSA9IG1pZ3JhdGlvbi5kZXNjcmlwdGlvblxuICAgICAgICAgID8gYCR7Y29tbWl0UHJlZml4fVxcblxcbiR7bWlncmF0aW9uLmRlc2NyaXB0aW9ufWBcbiAgICAgICAgICA6IGNvbW1pdFByZWZpeDtcbiAgICAgICAgY29uc3QgY29tbWl0dGVkID0gdGhpcy5jb21taXQoY29tbWl0TWVzc2FnZSk7XG4gICAgICAgIGlmICghY29tbWl0dGVkKSB7XG4gICAgICAgICAgLy8gRmFpbGVkIHRvIGNvbW1pdCwgc29tZXRoaW5nIHdlbnQgd3JvbmcuIEFib3J0IHRoZSB1cGRhdGUuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgbG9nZ2VyLmluZm8oJycpOyAvLyBFeHRyYSB0cmFpbGluZyBuZXdsaW5lLlxuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBtaWdyYXRlT25seShcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgcm9vdERlcGVuZGVuY2llczogTWFwPHN0cmluZywgUGFja2FnZVRyZWVOb2RlPixcbiAgICBvcHRpb25zOiBPcHRpb25zPFVwZGF0ZUNvbW1hbmRBcmdzPixcbiAgKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCBwYWNrYWdlRGVwZW5kZW5jeSA9IHJvb3REZXBlbmRlbmNpZXMuZ2V0KHBhY2thZ2VOYW1lKTtcbiAgICBsZXQgcGFja2FnZVBhdGggPSBwYWNrYWdlRGVwZW5kZW5jeT8ucGF0aDtcbiAgICBsZXQgcGFja2FnZU5vZGUgPSBwYWNrYWdlRGVwZW5kZW5jeT8ucGFja2FnZTtcbiAgICBpZiAocGFja2FnZURlcGVuZGVuY3kgJiYgIXBhY2thZ2VOb2RlKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1BhY2thZ2UgZm91bmQgaW4gcGFja2FnZS5qc29uIGJ1dCBpcyBub3QgaW5zdGFsbGVkLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKCFwYWNrYWdlRGVwZW5kZW5jeSkge1xuICAgICAgLy8gQWxsb3cgcnVubmluZyBtaWdyYXRpb25zIG9uIHRyYW5zaXRpdmVseSBpbnN0YWxsZWQgZGVwZW5kZW5jaWVzXG4gICAgICAvLyBUaGVyZSBjYW4gdGVjaG5pY2FsbHkgYmUgbmVzdGVkIG11bHRpcGxlIHZlcnNpb25zXG4gICAgICAvLyBUT0RPOiBJZiBtdWx0aXBsZSwgdGhpcyBzaG91bGQgZmluZCBhbGwgdmVyc2lvbnMgYW5kIGFzayB3aGljaCBvbmUgdG8gdXNlXG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGZpbmRQYWNrYWdlSnNvbih0aGlzLmNvbnRleHQucm9vdCwgcGFja2FnZU5hbWUpO1xuICAgICAgaWYgKHBhY2thZ2VKc29uKSB7XG4gICAgICAgIHBhY2thZ2VQYXRoID0gcGF0aC5kaXJuYW1lKHBhY2thZ2VKc29uKTtcbiAgICAgICAgcGFja2FnZU5vZGUgPSBhd2FpdCByZWFkUGFja2FnZUpzb24ocGFja2FnZUpzb24pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghcGFja2FnZU5vZGUgfHwgIXBhY2thZ2VQYXRoKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1BhY2thZ2UgaXMgbm90IGluc3RhbGxlZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgY29uc3QgdXBkYXRlTWV0YWRhdGEgPSBwYWNrYWdlTm9kZVsnbmctdXBkYXRlJ107XG4gICAgbGV0IG1pZ3JhdGlvbnMgPSB1cGRhdGVNZXRhZGF0YT8ubWlncmF0aW9ucztcbiAgICBpZiAobWlncmF0aW9ucyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1BhY2thZ2UgZG9lcyBub3QgcHJvdmlkZSBtaWdyYXRpb25zLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtaWdyYXRpb25zICE9PSAnc3RyaW5nJykge1xuICAgICAgbG9nZ2VyLmVycm9yKCdQYWNrYWdlIGNvbnRhaW5zIGEgbWFsZm9ybWVkIG1pZ3JhdGlvbnMgZmllbGQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAocGF0aC5wb3NpeC5pc0Fic29sdXRlKG1pZ3JhdGlvbnMpIHx8IHBhdGgud2luMzIuaXNBYnNvbHV0ZShtaWdyYXRpb25zKSkge1xuICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAnUGFja2FnZSBjb250YWlucyBhbiBpbnZhbGlkIG1pZ3JhdGlvbnMgZmllbGQuIEFic29sdXRlIHBhdGhzIGFyZSBub3QgcGVybWl0dGVkLicsXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICAvLyBOb3JtYWxpemUgc2xhc2hlc1xuICAgIG1pZ3JhdGlvbnMgPSBtaWdyYXRpb25zLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICAgIGlmIChtaWdyYXRpb25zLnN0YXJ0c1dpdGgoJy4uLycpKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICdQYWNrYWdlIGNvbnRhaW5zIGFuIGludmFsaWQgbWlncmF0aW9ucyBmaWVsZC4gUGF0aHMgb3V0c2lkZSB0aGUgcGFja2FnZSByb290IGFyZSBub3QgcGVybWl0dGVkLicsXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBpdCBpcyBhIHBhY2thZ2UtbG9jYWwgbG9jYXRpb25cbiAgICBjb25zdCBsb2NhbE1pZ3JhdGlvbnMgPSBwYXRoLmpvaW4ocGFja2FnZVBhdGgsIG1pZ3JhdGlvbnMpO1xuICAgIGlmIChleGlzdHNTeW5jKGxvY2FsTWlncmF0aW9ucykpIHtcbiAgICAgIG1pZ3JhdGlvbnMgPSBsb2NhbE1pZ3JhdGlvbnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRyeSB0byByZXNvbHZlIGZyb20gcGFja2FnZSBsb2NhdGlvbi5cbiAgICAgIC8vIFRoaXMgYXZvaWRzIGlzc3VlcyB3aXRoIHBhY2thZ2UgaG9pc3RpbmcuXG4gICAgICB0cnkge1xuICAgICAgICBtaWdyYXRpb25zID0gcmVxdWlyZS5yZXNvbHZlKG1pZ3JhdGlvbnMsIHsgcGF0aHM6IFtwYWNrYWdlUGF0aF0gfSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcignTWlncmF0aW9ucyBmb3IgcGFja2FnZSB3ZXJlIG5vdCBmb3VuZC4nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UuICBbJHtlLm1lc3NhZ2V9XWApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMubmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbihcbiAgICAgICAgd29ya2Zsb3csXG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICBtaWdyYXRpb25zLFxuICAgICAgICBvcHRpb25zLm5hbWUsXG4gICAgICAgIG9wdGlvbnMuY3JlYXRlQ29tbWl0cyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgZnJvbSA9IGNvZXJjZVZlcnNpb25OdW1iZXIob3B0aW9ucy5mcm9tKTtcbiAgICBpZiAoIWZyb20pIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgXCJmcm9tXCIgdmFsdWUgWyR7b3B0aW9ucy5mcm9tfV0gaXMgbm90IGEgdmFsaWQgdmVyc2lvbi5gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbnMoXG4gICAgICB3b3JrZmxvdyxcbiAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgbWlncmF0aW9ucyxcbiAgICAgIGZyb20sXG4gICAgICBvcHRpb25zLnRvIHx8IHBhY2thZ2VOb2RlLnZlcnNpb24sXG4gICAgICBvcHRpb25zLmNyZWF0ZUNvbW1pdHMsXG4gICAgKTtcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGluZXMtcGVyLWZ1bmN0aW9uXG4gIHByaXZhdGUgYXN5bmMgdXBkYXRlUGFja2FnZXNBbmRNaWdyYXRlKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgcm9vdERlcGVuZGVuY2llczogTWFwPHN0cmluZywgUGFja2FnZVRyZWVOb2RlPixcbiAgICBvcHRpb25zOiBPcHRpb25zPFVwZGF0ZUNvbW1hbmRBcmdzPixcbiAgICBwYWNrYWdlczogUGFja2FnZUlkZW50aWZpZXJbXSxcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgY29uc3QgbG9nVmVyYm9zZSA9IChtZXNzYWdlOiBzdHJpbmcpID0+IHtcbiAgICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8obWVzc2FnZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHJlcXVlc3RzOiB7XG4gICAgICBpZGVudGlmaWVyOiBQYWNrYWdlSWRlbnRpZmllcjtcbiAgICAgIG5vZGU6IFBhY2thZ2VUcmVlTm9kZTtcbiAgICB9W10gPSBbXTtcblxuICAgIC8vIFZhbGlkYXRlIHBhY2thZ2VzIGFjdHVhbGx5IGFyZSBwYXJ0IG9mIHRoZSB3b3Jrc3BhY2VcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlcykge1xuICAgICAgY29uc3Qgbm9kZSA9IHJvb3REZXBlbmRlbmNpZXMuZ2V0KHBrZy5uYW1lKTtcbiAgICAgIGlmICghbm9kZT8ucGFja2FnZSkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoYFBhY2thZ2UgJyR7cGtnLm5hbWV9JyBpcyBub3QgYSBkZXBlbmRlbmN5LmApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiBhIHNwZWNpZmljIHZlcnNpb24gaXMgcmVxdWVzdGVkIGFuZCBtYXRjaGVzIHRoZSBpbnN0YWxsZWQgdmVyc2lvbiwgc2tpcC5cbiAgICAgIGlmIChwa2cudHlwZSA9PT0gJ3ZlcnNpb24nICYmIG5vZGUucGFja2FnZS52ZXJzaW9uID09PSBwa2cuZmV0Y2hTcGVjKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBQYWNrYWdlICcke3BrZy5uYW1lfScgaXMgYWxyZWFkeSBhdCAnJHtwa2cuZmV0Y2hTcGVjfScuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0cy5wdXNoKHsgaWRlbnRpZmllcjogcGtnLCBub2RlIH0pO1xuICAgIH1cblxuICAgIGlmIChyZXF1ZXN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGxvZ2dlci5pbmZvKCdGZXRjaGluZyBkZXBlbmRlbmN5IG1ldGFkYXRhIGZyb20gcmVnaXN0cnkuLi4nKTtcblxuICAgIGNvbnN0IHBhY2thZ2VzVG9VcGRhdGU6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCB7IGlkZW50aWZpZXI6IHJlcXVlc3RJZGVudGlmaWVyLCBub2RlIH0gb2YgcmVxdWVzdHMpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VOYW1lID0gcmVxdWVzdElkZW50aWZpZXIubmFtZTtcblxuICAgICAgbGV0IG1ldGFkYXRhO1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gTWV0YWRhdGEgcmVxdWVzdHMgYXJlIGludGVybmFsbHkgY2FjaGVkOyBtdWx0aXBsZSByZXF1ZXN0cyBmb3Igc2FtZSBuYW1lXG4gICAgICAgIC8vIGRvZXMgbm90IHJlc3VsdCBpbiBhZGRpdGlvbmFsIG5ldHdvcmsgdHJhZmZpY1xuICAgICAgICBtZXRhZGF0YSA9IGF3YWl0IGZldGNoUGFja2FnZU1ldGFkYXRhKHBhY2thZ2VOYW1lLCBsb2dnZXIsIHtcbiAgICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGZldGNoaW5nIG1ldGFkYXRhIGZvciAnJHtwYWNrYWdlTmFtZX0nOiBgICsgZS5tZXNzYWdlKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgLy8gVHJ5IHRvIGZpbmQgYSBwYWNrYWdlIHZlcnNpb24gYmFzZWQgb24gdGhlIHVzZXIgcmVxdWVzdGVkIHBhY2thZ2Ugc3BlY2lmaWVyXG4gICAgICAvLyByZWdpc3RyeSBzcGVjaWZpZXIgdHlwZXMgYXJlIGVpdGhlciB2ZXJzaW9uLCByYW5nZSwgb3IgdGFnXG4gICAgICBsZXQgbWFuaWZlc3Q6IFBhY2thZ2VNYW5pZmVzdCB8IHVuZGVmaW5lZDtcbiAgICAgIGlmIChcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3ZlcnNpb24nIHx8XG4gICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICdyYW5nZScgfHxcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3RhZydcbiAgICAgICkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG1hbmlmZXN0ID0gcGlja01hbmlmZXN0KG1ldGFkYXRhLCByZXF1ZXN0SWRlbnRpZmllci5mZXRjaFNwZWMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgICBpZiAoZS5jb2RlID09PSAnRVRBUkdFVCcpIHtcbiAgICAgICAgICAgIC8vIElmIG5vdCBmb3VuZCBhbmQgbmV4dCB3YXMgdXNlZCBhbmQgdXNlciBkaWQgbm90IHByb3ZpZGUgYSBzcGVjaWZpZXIsIHRyeSBsYXRlc3QuXG4gICAgICAgICAgICAvLyBQYWNrYWdlIG1heSBub3QgaGF2ZSBhIG5leHQgdGFnLlxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICByZXF1ZXN0SWRlbnRpZmllci50eXBlID09PSAndGFnJyAmJlxuICAgICAgICAgICAgICByZXF1ZXN0SWRlbnRpZmllci5mZXRjaFNwZWMgPT09ICduZXh0JyAmJlxuICAgICAgICAgICAgICAhcmVxdWVzdElkZW50aWZpZXIucmF3U3BlY1xuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbWFuaWZlc3QgPSBwaWNrTWFuaWZlc3QobWV0YWRhdGEsICdsYXRlc3QnKTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgaWYgKGUuY29kZSAhPT0gJ0VUQVJHRVQnICYmIGUuY29kZSAhPT0gJ0VOT1ZFUlNJT05TJykge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKGUuY29kZSAhPT0gJ0VOT1ZFUlNJT05TJykge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFtYW5pZmVzdCkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgYFBhY2thZ2Ugc3BlY2lmaWVkIGJ5ICcke3JlcXVlc3RJZGVudGlmaWVyLnJhd30nIGRvZXMgbm90IGV4aXN0IHdpdGhpbiB0aGUgcmVnaXN0cnkuYCxcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1hbmlmZXN0LnZlcnNpb24gPT09IG5vZGUucGFja2FnZT8udmVyc2lvbikge1xuICAgICAgICBsb2dnZXIuaW5mbyhgUGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nIGlzIGFscmVhZHkgdXAgdG8gZGF0ZS5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChub2RlLnBhY2thZ2UgJiYgQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAudGVzdChub2RlLnBhY2thZ2UubmFtZSkpIHtcbiAgICAgICAgY29uc3QgeyBuYW1lLCB2ZXJzaW9uIH0gPSBub2RlLnBhY2thZ2U7XG4gICAgICAgIGNvbnN0IHRvQmVJbnN0YWxsZWRNYWpvclZlcnNpb24gPSArbWFuaWZlc3QudmVyc2lvbi5zcGxpdCgnLicpWzBdO1xuICAgICAgICBjb25zdCBjdXJyZW50TWFqb3JWZXJzaW9uID0gK3ZlcnNpb24uc3BsaXQoJy4nKVswXTtcblxuICAgICAgICBpZiAodG9CZUluc3RhbGxlZE1ham9yVmVyc2lvbiAtIGN1cnJlbnRNYWpvclZlcnNpb24gPiAxKSB7XG4gICAgICAgICAgLy8gT25seSBhbGxvdyB1cGRhdGluZyBhIHNpbmdsZSB2ZXJzaW9uIGF0IGEgdGltZS5cbiAgICAgICAgICBpZiAoY3VycmVudE1ham9yVmVyc2lvbiA8IDYpIHtcbiAgICAgICAgICAgIC8vIEJlZm9yZSB2ZXJzaW9uIDYsIHRoZSBtYWpvciB2ZXJzaW9ucyB3ZXJlIG5vdCBhbHdheXMgc2VxdWVudGlhbC5cbiAgICAgICAgICAgIC8vIEV4YW1wbGUgQGFuZ3VsYXIvY29yZSBza2lwcGVkIHZlcnNpb24gMywgQGFuZ3VsYXIvY2xpIHNraXBwZWQgdmVyc2lvbnMgMi01LlxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVXBkYXRpbmcgbXVsdGlwbGUgbWFqb3IgdmVyc2lvbnMgb2YgJyR7bmFtZX0nIGF0IG9uY2UgaXMgbm90IHN1cHBvcnRlZC4gUGxlYXNlIG1pZ3JhdGUgZWFjaCBtYWpvciB2ZXJzaW9uIGluZGl2aWR1YWxseS5cXG5gICtcbiAgICAgICAgICAgICAgICBgRm9yIG1vcmUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHVwZGF0ZSBwcm9jZXNzLCBzZWUgaHR0cHM6Ly91cGRhdGUuYW5ndWxhci5pby8uYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG5leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudCA9IGN1cnJlbnRNYWpvclZlcnNpb24gKyAxO1xuXG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBVcGRhdGluZyBtdWx0aXBsZSBtYWpvciB2ZXJzaW9ucyBvZiAnJHtuYW1lfScgYXQgb25jZSBpcyBub3Qgc3VwcG9ydGVkLiBQbGVhc2UgbWlncmF0ZSBlYWNoIG1ham9yIHZlcnNpb24gaW5kaXZpZHVhbGx5LlxcbmAgK1xuICAgICAgICAgICAgICAgIGBSdW4gJ25nIHVwZGF0ZSAke25hbWV9QCR7bmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50fScgaW4geW91ciB3b3Jrc3BhY2UgZGlyZWN0b3J5IGAgK1xuICAgICAgICAgICAgICAgIGB0byB1cGRhdGUgdG8gbGF0ZXN0ICcke25leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudH0ueCcgdmVyc2lvbiBvZiAnJHtuYW1lfScuXFxuXFxuYCArXG4gICAgICAgICAgICAgICAgYEZvciBtb3JlIGluZm9ybWF0aW9uIGFib3V0IHRoZSB1cGRhdGUgcHJvY2Vzcywgc2VlIGh0dHBzOi8vdXBkYXRlLmFuZ3VsYXIuaW8vP3Y9JHtjdXJyZW50TWFqb3JWZXJzaW9ufS4wLSR7bmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50fS4wYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcGFja2FnZXNUb1VwZGF0ZS5wdXNoKHJlcXVlc3RJZGVudGlmaWVyLnRvU3RyaW5nKCkpO1xuICAgIH1cblxuICAgIGlmIChwYWNrYWdlc1RvVXBkYXRlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgY29uc3QgeyBzdWNjZXNzIH0gPSBhd2FpdCB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgICB3b3JrZmxvdyxcbiAgICAgIFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTixcbiAgICAgICd1cGRhdGUnLFxuICAgICAge1xuICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgIGZvcmNlOiBvcHRpb25zLmZvcmNlLFxuICAgICAgICBuZXh0OiBvcHRpb25zLm5leHQsXG4gICAgICAgIHBhY2thZ2VNYW5hZ2VyOiB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIubmFtZSxcbiAgICAgICAgcGFja2FnZXM6IHBhY2thZ2VzVG9VcGRhdGUsXG4gICAgICB9LFxuICAgICk7XG5cbiAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMucm0ocGF0aC5qb2luKHRoaXMuY29udGV4dC5yb290LCAnbm9kZV9tb2R1bGVzJyksIHtcbiAgICAgICAgICBmb3JjZTogdHJ1ZSxcbiAgICAgICAgICByZWN1cnNpdmU6IHRydWUsXG4gICAgICAgICAgbWF4UmV0cmllczogMyxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIHt9XG5cbiAgICAgIGNvbnN0IGluc3RhbGxhdGlvblN1Y2Nlc3MgPSBhd2FpdCB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIuaW5zdGFsbEFsbChcbiAgICAgICAgdGhpcy5wYWNrYWdlTWFuYWdlckZvcmNlKG9wdGlvbnMudmVyYm9zZSkgPyBbJy0tZm9yY2UnXSA6IFtdLFxuICAgICAgICB0aGlzLmNvbnRleHQucm9vdCxcbiAgICAgICk7XG5cbiAgICAgIGlmICghaW5zdGFsbGF0aW9uU3VjY2Vzcykge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VjY2VzcyAmJiBvcHRpb25zLmNyZWF0ZUNvbW1pdHMpIHtcbiAgICAgIGlmICghdGhpcy5jb21taXQoYEFuZ3VsYXIgQ0xJIHVwZGF0ZSBmb3IgcGFja2FnZXMgLSAke3BhY2thZ2VzVG9VcGRhdGUuam9pbignLCAnKX1gKSkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGlzIGlzIGEgdGVtcG9yYXJ5IHdvcmthcm91bmQgdG8gYWxsb3cgZGF0YSB0byBiZSBwYXNzZWQgYmFjayBmcm9tIHRoZSB1cGRhdGUgc2NoZW1hdGljXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCBtaWdyYXRpb25zID0gKGdsb2JhbCBhcyBhbnkpLmV4dGVybmFsTWlncmF0aW9ucyBhcyB7XG4gICAgICBwYWNrYWdlOiBzdHJpbmc7XG4gICAgICBjb2xsZWN0aW9uOiBzdHJpbmc7XG4gICAgICBmcm9tOiBzdHJpbmc7XG4gICAgICB0bzogc3RyaW5nO1xuICAgIH1bXTtcblxuICAgIGlmIChzdWNjZXNzICYmIG1pZ3JhdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3QgbWlncmF0aW9uIG9mIG1pZ3JhdGlvbnMpIHtcbiAgICAgICAgLy8gUmVzb2x2ZSB0aGUgcGFja2FnZSBmcm9tIHRoZSB3b3Jrc3BhY2Ugcm9vdCwgYXMgb3RoZXJ3aXNlIGl0IHdpbGwgYmUgcmVzb2x2ZWQgZnJvbSB0aGUgdGVtcFxuICAgICAgICAvLyBpbnN0YWxsZWQgQ0xJIHZlcnNpb24uXG4gICAgICAgIGxldCBwYWNrYWdlUGF0aDtcbiAgICAgICAgbG9nVmVyYm9zZShcbiAgICAgICAgICBgUmVzb2x2aW5nIG1pZ3JhdGlvbiBwYWNrYWdlICcke21pZ3JhdGlvbi5wYWNrYWdlfScgZnJvbSAnJHt0aGlzLmNvbnRleHQucm9vdH0nLi4uYCxcbiAgICAgICAgKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgcGFja2FnZVBhdGggPSBwYXRoLmRpcm5hbWUoXG4gICAgICAgICAgICAgIC8vIFRoaXMgbWF5IGZhaWwgaWYgdGhlIGBwYWNrYWdlLmpzb25gIGlzIG5vdCBleHBvcnRlZCBhcyBhbiBlbnRyeSBwb2ludFxuICAgICAgICAgICAgICByZXF1aXJlLnJlc29sdmUocGF0aC5qb2luKG1pZ3JhdGlvbi5wYWNrYWdlLCAncGFja2FnZS5qc29uJyksIHtcbiAgICAgICAgICAgICAgICBwYXRoczogW3RoaXMuY29udGV4dC5yb290XSxcbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gdHJ5aW5nIHRvIHJlc29sdmUgdGhlIHBhY2thZ2UncyBtYWluIGVudHJ5IHBvaW50XG4gICAgICAgICAgICAgIHBhY2thZ2VQYXRoID0gcmVxdWlyZS5yZXNvbHZlKG1pZ3JhdGlvbi5wYWNrYWdlLCB7IHBhdGhzOiBbdGhpcy5jb250ZXh0LnJvb3RdIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgICAgbG9nVmVyYm9zZShlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgTWlncmF0aW9ucyBmb3IgcGFja2FnZSAoJHttaWdyYXRpb24ucGFja2FnZX0pIHdlcmUgbm90IGZvdW5kLmAgK1xuICAgICAgICAgICAgICAgICcgVGhlIHBhY2thZ2UgY291bGQgbm90IGJlIGZvdW5kIGluIHRoZSB3b3Jrc3BhY2UuJyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KS4gIFske2UubWVzc2FnZX1dYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbWlncmF0aW9ucztcblxuICAgICAgICAvLyBDaGVjayBpZiBpdCBpcyBhIHBhY2thZ2UtbG9jYWwgbG9jYXRpb25cbiAgICAgICAgY29uc3QgbG9jYWxNaWdyYXRpb25zID0gcGF0aC5qb2luKHBhY2thZ2VQYXRoLCBtaWdyYXRpb24uY29sbGVjdGlvbik7XG4gICAgICAgIGlmIChleGlzdHNTeW5jKGxvY2FsTWlncmF0aW9ucykpIHtcbiAgICAgICAgICBtaWdyYXRpb25zID0gbG9jYWxNaWdyYXRpb25zO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFRyeSB0byByZXNvbHZlIGZyb20gcGFja2FnZSBsb2NhdGlvbi5cbiAgICAgICAgICAvLyBUaGlzIGF2b2lkcyBpc3N1ZXMgd2l0aCBwYWNrYWdlIGhvaXN0aW5nLlxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtaWdyYXRpb25zID0gcmVxdWlyZS5yZXNvbHZlKG1pZ3JhdGlvbi5jb2xsZWN0aW9uLCB7IHBhdGhzOiBbcGFja2FnZVBhdGhdIH0pO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBNaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkgd2VyZSBub3QgZm91bmQuYCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KS4gIFske2UubWVzc2FnZX1dYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbnMoXG4gICAgICAgICAgd29ya2Zsb3csXG4gICAgICAgICAgbWlncmF0aW9uLnBhY2thZ2UsXG4gICAgICAgICAgbWlncmF0aW9ucyxcbiAgICAgICAgICBtaWdyYXRpb24uZnJvbSxcbiAgICAgICAgICBtaWdyYXRpb24udG8sXG4gICAgICAgICAgb3B0aW9ucy5jcmVhdGVDb21taXRzLFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIEEgbm9uLXplcm8gdmFsdWUgaXMgYSBmYWlsdXJlIGZvciB0aGUgcGFja2FnZSdzIG1pZ3JhdGlvbnNcbiAgICAgICAgaWYgKHJlc3VsdCAhPT0gMCkge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3VjY2VzcyA/IDAgOiAxO1xuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSBjb21taXQgd2FzIHN1Y2Nlc3NmdWwuXG4gICAqL1xuICBwcml2YXRlIGNvbW1pdChtZXNzYWdlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgLy8gQ2hlY2sgaWYgYSBjb21taXQgaXMgbmVlZGVkLlxuICAgIGxldCBjb21taXROZWVkZWQ6IGJvb2xlYW47XG4gICAgdHJ5IHtcbiAgICAgIGNvbW1pdE5lZWRlZCA9IGhhc0NoYW5nZXNUb0NvbW1pdCgpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nZ2VyLmVycm9yKGAgIEZhaWxlZCB0byByZWFkIEdpdCB0cmVlOlxcbiR7KGVyciBhcyBTcGF3blN5bmNSZXR1cm5zPHN0cmluZz4pLnN0ZGVycn1gKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghY29tbWl0TmVlZGVkKSB7XG4gICAgICBsb2dnZXIuaW5mbygnICBObyBjaGFuZ2VzIHRvIGNvbW1pdCBhZnRlciBtaWdyYXRpb24uJyk7XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIENvbW1pdCBjaGFuZ2VzIGFuZCBhYm9ydCBvbiBlcnJvci5cbiAgICB0cnkge1xuICAgICAgY3JlYXRlQ29tbWl0KG1lc3NhZ2UpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICBgRmFpbGVkIHRvIGNvbW1pdCB1cGRhdGUgKCR7bWVzc2FnZX0pOlxcbiR7KGVyciBhcyBTcGF3blN5bmNSZXR1cm5zPHN0cmluZz4pLnN0ZGVycn1gLFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE5vdGlmeSB1c2VyIG9mIHRoZSBjb21taXQuXG4gICAgY29uc3QgaGFzaCA9IGZpbmRDdXJyZW50R2l0U2hhKCk7XG4gICAgY29uc3Qgc2hvcnRNZXNzYWdlID0gbWVzc2FnZS5zcGxpdCgnXFxuJylbMF07XG4gICAgaWYgKGhhc2gpIHtcbiAgICAgIGxvZ2dlci5pbmZvKGAgIENvbW1pdHRlZCBtaWdyYXRpb24gc3RlcCAoJHtnZXRTaG9ydEhhc2goaGFzaCl9KTogJHtzaG9ydE1lc3NhZ2V9LmApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDb21taXQgd2FzIHN1Y2Nlc3NmdWwsIGJ1dCByZWFkaW5nIHRoZSBoYXNoIHdhcyBub3QuIFNvbWV0aGluZyB3ZWlyZCBoYXBwZW5lZCxcbiAgICAgIC8vIGJ1dCBub3RoaW5nIHRoYXQgd291bGQgc3RvcCB0aGUgdXBkYXRlLiBKdXN0IGxvZyB0aGUgd2VpcmRuZXNzIGFuZCBjb250aW51ZS5cbiAgICAgIGxvZ2dlci5pbmZvKGAgIENvbW1pdHRlZCBtaWdyYXRpb24gc3RlcDogJHtzaG9ydE1lc3NhZ2V9LmApO1xuICAgICAgbG9nZ2VyLndhcm4oJyAgRmFpbGVkIHRvIGxvb2sgdXAgaGFzaCBvZiBtb3N0IHJlY2VudCBjb21taXQsIGNvbnRpbnVpbmcgYW55d2F5cy4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tDbGVhbkdpdCgpOiBib29sZWFuIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdG9wTGV2ZWwgPSBleGVjU3luYygnZ2l0IHJldi1wYXJzZSAtLXNob3ctdG9wbGV2ZWwnLCB7XG4gICAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICAgIHN0ZGlvOiAncGlwZScsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGV4ZWNTeW5jKCdnaXQgc3RhdHVzIC0tcG9yY2VsYWluJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pO1xuICAgICAgaWYgKHJlc3VsdC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IGZpbGVzIGluc2lkZSB0aGUgd29ya3NwYWNlIHJvb3QgYXJlIHJlbGV2YW50XG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHJlc3VsdC5zcGxpdCgnXFxuJykpIHtcbiAgICAgICAgY29uc3QgcmVsYXRpdmVFbnRyeSA9IHBhdGgucmVsYXRpdmUoXG4gICAgICAgICAgcGF0aC5yZXNvbHZlKHRoaXMuY29udGV4dC5yb290KSxcbiAgICAgICAgICBwYXRoLnJlc29sdmUodG9wTGV2ZWwudHJpbSgpLCBlbnRyeS5zbGljZSgzKS50cmltKCkpLFxuICAgICAgICApO1xuXG4gICAgICAgIGlmICghcmVsYXRpdmVFbnRyeS5zdGFydHNXaXRoKCcuLicpICYmICFwYXRoLmlzQWJzb2x1dGUocmVsYXRpdmVFbnRyeSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIHt9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIGN1cnJlbnQgaW5zdGFsbGVkIENMSSB2ZXJzaW9uIGlzIG9sZGVyIG9yIG5ld2VyIHRoYW4gYSBjb21wYXRpYmxlIHZlcnNpb24uXG4gICAqIEByZXR1cm5zIHRoZSB2ZXJzaW9uIHRvIGluc3RhbGwgb3IgbnVsbCB3aGVuIHRoZXJlIGlzIG5vIHVwZGF0ZSB0byBpbnN0YWxsLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBjaGVja0NMSVZlcnNpb24oXG4gICAgcGFja2FnZXNUb1VwZGF0ZTogc3RyaW5nW10sXG4gICAgdmVyYm9zZSA9IGZhbHNlLFxuICAgIG5leHQgPSBmYWxzZSxcbiAgKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgeyB2ZXJzaW9uIH0gPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChcbiAgICAgIGBAYW5ndWxhci9jbGlAJHt0aGlzLmdldENMSVVwZGF0ZVJ1bm5lclZlcnNpb24ocGFja2FnZXNUb1VwZGF0ZSwgbmV4dCl9YCxcbiAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIsXG4gICAgICB7XG4gICAgICAgIHZlcmJvc2UsXG4gICAgICAgIHVzaW5nWWFybjogdGhpcy5jb250ZXh0LnBhY2thZ2VNYW5hZ2VyLm5hbWUgPT09IFBhY2thZ2VNYW5hZ2VyLllhcm4sXG4gICAgICB9LFxuICAgICk7XG5cbiAgICByZXR1cm4gVkVSU0lPTi5mdWxsID09PSB2ZXJzaW9uID8gbnVsbCA6IHZlcnNpb247XG4gIH1cblxuICBwcml2YXRlIGdldENMSVVwZGF0ZVJ1bm5lclZlcnNpb24oXG4gICAgcGFja2FnZXNUb1VwZGF0ZTogc3RyaW5nW10gfCB1bmRlZmluZWQsXG4gICAgbmV4dDogYm9vbGVhbixcbiAgKTogc3RyaW5nIHwgbnVtYmVyIHtcbiAgICBpZiAobmV4dCkge1xuICAgICAgcmV0dXJuICduZXh0JztcbiAgICB9XG5cbiAgICBjb25zdCB1cGRhdGluZ0FuZ3VsYXJQYWNrYWdlID0gcGFja2FnZXNUb1VwZGF0ZT8uZmluZCgocikgPT4gQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAudGVzdChyKSk7XG4gICAgaWYgKHVwZGF0aW5nQW5ndWxhclBhY2thZ2UpIHtcbiAgICAgIC8vIElmIHdlIGFyZSB1cGRhdGluZyBhbnkgQW5ndWxhciBwYWNrYWdlIHdlIGNhbiB1cGRhdGUgdGhlIENMSSB0byB0aGUgdGFyZ2V0IHZlcnNpb24gYmVjYXVzZVxuICAgICAgLy8gbWlncmF0aW9ucyBmb3IgQGFuZ3VsYXIvY29yZUAxMyBjYW4gYmUgZXhlY3V0ZWQgdXNpbmcgQW5ndWxhci9jbGlAMTMuXG4gICAgICAvLyBUaGlzIGlzIHNhbWUgYmVoYXZpb3VyIGFzIGBucHggQGFuZ3VsYXIvY2xpQDEzIHVwZGF0ZSBAYW5ndWxhci9jb3JlQDEzYC5cblxuICAgICAgLy8gYEBhbmd1bGFyL2NsaUAxM2AgLT4gWycnLCAnYW5ndWxhci9jbGknLCAnMTMnXVxuICAgICAgLy8gYEBhbmd1bGFyL2NsaWAgLT4gWycnLCAnYW5ndWxhci9jbGknXVxuICAgICAgY29uc3QgdGVtcFZlcnNpb24gPSBjb2VyY2VWZXJzaW9uTnVtYmVyKHVwZGF0aW5nQW5ndWxhclBhY2thZ2Uuc3BsaXQoJ0AnKVsyXSk7XG5cbiAgICAgIHJldHVybiBzZW12ZXIucGFyc2UodGVtcFZlcnNpb24pPy5tYWpvciA/PyAnbGF0ZXN0JztcbiAgICB9XG5cbiAgICAvLyBXaGVuIG5vdCB1cGRhdGluZyBhbiBBbmd1bGFyIHBhY2thZ2Ugd2UgY2Fubm90IGRldGVybWluZSB3aGljaCBzY2hlbWF0aWMgcnVudGltZSB0aGUgbWlncmF0aW9uIHNob3VsZCB0byBiZSBleGVjdXRlZCBpbi5cbiAgICAvLyBUeXBpY2FsbHksIHdlIGNhbiBhc3N1bWUgdGhhdCB0aGUgYEBhbmd1bGFyL2NsaWAgd2FzIHVwZGF0ZWQgcHJldmlvdXNseS5cbiAgICAvLyBFeGFtcGxlOiBBbmd1bGFyIG9mZmljaWFsIHBhY2thZ2VzIGFyZSB0eXBpY2FsbHkgdXBkYXRlZCBwcmlvciB0byBOR1JYIGV0Yy4uLlxuICAgIC8vIFRoZXJlZm9yZSwgd2Ugb25seSB1cGRhdGUgdG8gdGhlIGxhdGVzdCBwYXRjaCB2ZXJzaW9uIG9mIHRoZSBpbnN0YWxsZWQgbWFqb3IgdmVyc2lvbiBvZiB0aGUgQW5ndWxhciBDTEkuXG5cbiAgICAvLyBUaGlzIGlzIGltcG9ydGFudCBiZWNhdXNlIHdlIG1pZ2h0IGVuZCB1cCBpbiBhIHNjZW5hcmlvIHdoZXJlIGxvY2FsbHkgQW5ndWxhciB2MTIgaXMgaW5zdGFsbGVkLCB1cGRhdGluZyBOR1JYIGZyb20gMTEgdG8gMTIuXG4gICAgLy8gV2UgZW5kIHVwIHVzaW5nIEFuZ3VsYXIgQ2xJIHYxMyB0byBydW4gdGhlIG1pZ3JhdGlvbnMgaWYgd2UgcnVuIHRoZSBtaWdyYXRpb25zIHVzaW5nIHRoZSBDTEkgaW5zdGFsbGVkIG1ham9yIHZlcnNpb24gKyAxIGxvZ2ljLlxuICAgIHJldHVybiBWRVJTSU9OLm1ham9yO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBydW5UZW1wQmluYXJ5KHBhY2thZ2VOYW1lOiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdID0gW10pOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgc3VjY2VzcywgdGVtcE5vZGVNb2R1bGVzIH0gPSBhd2FpdCB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIuaW5zdGFsbFRlbXAocGFja2FnZU5hbWUpO1xuICAgIGlmICghc3VjY2Vzcykge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIHZlcnNpb24vdGFnIGV0Yy4uLiBmcm9tIHBhY2thZ2UgbmFtZVxuICAgIC8vIEV4OiBAYW5ndWxhci9jbGlAbGF0ZXN0IC0+IEBhbmd1bGFyL2NsaVxuICAgIGNvbnN0IHBhY2thZ2VOYW1lTm9WZXJzaW9uID0gcGFja2FnZU5hbWUuc3Vic3RyaW5nKDAsIHBhY2thZ2VOYW1lLmxhc3RJbmRleE9mKCdAJykpO1xuICAgIGNvbnN0IHBrZ0xvY2F0aW9uID0gam9pbih0ZW1wTm9kZU1vZHVsZXMsIHBhY2thZ2VOYW1lTm9WZXJzaW9uKTtcbiAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBqb2luKHBrZ0xvY2F0aW9uLCAncGFja2FnZS5qc29uJyk7XG5cbiAgICAvLyBHZXQgYSBiaW5hcnkgbG9jYXRpb24gZm9yIHRoaXMgcGFja2FnZVxuICAgIGxldCBiaW5QYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGV4aXN0c1N5bmMocGFja2FnZUpzb25QYXRoKSkge1xuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCwgJ3V0Zi04Jyk7XG4gICAgICBpZiAoY29udGVudCkge1xuICAgICAgICBjb25zdCB7IGJpbiA9IHt9IH0gPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICBjb25zdCBiaW5LZXlzID0gT2JqZWN0LmtleXMoYmluKTtcblxuICAgICAgICBpZiAoYmluS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICBiaW5QYXRoID0gcmVzb2x2ZShwa2dMb2NhdGlvbiwgYmluW2JpbktleXNbMF1dKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghYmluUGF0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgbG9jYXRlIGJpbiBmb3IgdGVtcG9yYXJ5IHBhY2thZ2U6ICR7cGFja2FnZU5hbWVOb1ZlcnNpb259LmApO1xuICAgIH1cblxuICAgIGNvbnN0IHsgc3RhdHVzLCBlcnJvciB9ID0gc3Bhd25TeW5jKHByb2Nlc3MuZXhlY1BhdGgsIFtiaW5QYXRoLCAuLi5hcmdzXSwge1xuICAgICAgc3RkaW86ICdpbmhlcml0JyxcbiAgICAgIGVudjoge1xuICAgICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgICAgTkdfRElTQUJMRV9WRVJTSU9OX0NIRUNLOiAndHJ1ZScsXG4gICAgICAgIE5HX0NMSV9BTkFMWVRJQ1M6ICdmYWxzZScsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKHN0YXR1cyA9PT0gbnVsbCAmJiBlcnJvcikge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXR1cyA/PyAwO1xuICB9XG5cbiAgcHJpdmF0ZSBwYWNrYWdlTWFuYWdlckZvcmNlKHZlcmJvc2U6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAvLyBucG0gNysgY2FuIGZhaWwgZHVlIHRvIGl0IGluY29ycmVjdGx5IHJlc29sdmluZyBwZWVyIGRlcGVuZGVuY2llcyB0aGF0IGhhdmUgdmFsaWQgU2VtVmVyXG4gICAgLy8gcmFuZ2VzIGR1cmluZyBhbiB1cGRhdGUuIFVwZGF0ZSB3aWxsIHNldCBjb3JyZWN0IHZlcnNpb25zIG9mIGRlcGVuZGVuY2llcyB3aXRoaW4gdGhlXG4gICAgLy8gcGFja2FnZS5qc29uIGZpbGUuIFRoZSBmb3JjZSBvcHRpb24gaXMgc2V0IHRvIHdvcmthcm91bmQgdGhlc2UgZXJyb3JzLlxuICAgIC8vIEV4YW1wbGUgZXJyb3I6XG4gICAgLy8gbnBtIEVSUiEgQ29uZmxpY3RpbmcgcGVlciBkZXBlbmRlbmN5OiBAYW5ndWxhci9jb21waWxlci1jbGlAMTQuMC4wLXJjLjBcbiAgICAvLyBucG0gRVJSISBub2RlX21vZHVsZXMvQGFuZ3VsYXIvY29tcGlsZXItY2xpXG4gICAgLy8gbnBtIEVSUiEgICBwZWVyIEBhbmd1bGFyL2NvbXBpbGVyLWNsaUBcIl4xNC4wLjAgfHwgXjE0LjAuMC1yY1wiIGZyb20gQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXJAMTQuMC4wLXJjLjBcbiAgICAvLyBucG0gRVJSISAgIG5vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhclxuICAgIC8vIG5wbSBFUlIhICAgICBkZXYgQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXJAXCJ+MTQuMC4wLXJjLjBcIiBmcm9tIHRoZSByb290IHByb2plY3RcbiAgICBpZiAoXG4gICAgICB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIubmFtZSA9PT0gUGFja2FnZU1hbmFnZXIuTnBtICYmXG4gICAgICB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIudmVyc2lvbiAmJlxuICAgICAgc2VtdmVyLmd0ZSh0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIudmVyc2lvbiwgJzcuMC4wJylcbiAgICApIHtcbiAgICAgIGlmICh2ZXJib3NlKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyhcbiAgICAgICAgICAnTlBNIDcrIGRldGVjdGVkIC0tIGVuYWJsaW5nIGZvcmNlIG9wdGlvbiBmb3IgcGFja2FnZSBpbnN0YWxsYXRpb24nLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSB3b3JraW5nIGRpcmVjdG9yeSBoYXMgR2l0IGNoYW5nZXMgdG8gY29tbWl0LlxuICovXG5mdW5jdGlvbiBoYXNDaGFuZ2VzVG9Db21taXQoKTogYm9vbGVhbiB7XG4gIC8vIExpc3QgYWxsIG1vZGlmaWVkIGZpbGVzIG5vdCBjb3ZlcmVkIGJ5IC5naXRpZ25vcmUuXG4gIC8vIElmIGFueSBmaWxlcyBhcmUgcmV0dXJuZWQsIHRoZW4gdGhlcmUgbXVzdCBiZSBzb21ldGhpbmcgdG8gY29tbWl0LlxuXG4gIHJldHVybiBleGVjU3luYygnZ2l0IGxzLWZpbGVzIC1tIC1kIC1vIC0tZXhjbHVkZS1zdGFuZGFyZCcpLnRvU3RyaW5nKCkgIT09ICcnO1xufVxuXG4vKipcbiAqIFByZWNvbmRpdGlvbjogTXVzdCBoYXZlIHBlbmRpbmcgY2hhbmdlcyB0byBjb21taXQsIHRoZXkgZG8gbm90IG5lZWQgdG8gYmUgc3RhZ2VkLlxuICogUG9zdGNvbmRpdGlvbjogVGhlIEdpdCB3b3JraW5nIHRyZWUgaXMgY29tbWl0dGVkIGFuZCB0aGUgcmVwbyBpcyBjbGVhbi5cbiAqIEBwYXJhbSBtZXNzYWdlIFRoZSBjb21taXQgbWVzc2FnZSB0byB1c2UuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUNvbW1pdChtZXNzYWdlOiBzdHJpbmcpIHtcbiAgLy8gU3RhZ2UgZW50aXJlIHdvcmtpbmcgdHJlZSBmb3IgY29tbWl0LlxuICBleGVjU3luYygnZ2l0IGFkZCAtQScsIHsgZW5jb2Rpbmc6ICd1dGY4Jywgc3RkaW86ICdwaXBlJyB9KTtcblxuICAvLyBDb21taXQgd2l0aCB0aGUgbWVzc2FnZSBwYXNzZWQgdmlhIHN0ZGluIHRvIGF2b2lkIGJhc2ggZXNjYXBpbmcgaXNzdWVzLlxuICBleGVjU3luYygnZ2l0IGNvbW1pdCAtLW5vLXZlcmlmeSAtRiAtJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnLCBpbnB1dDogbWVzc2FnZSB9KTtcbn1cblxuLyoqXG4gKiBAcmV0dXJuIFRoZSBHaXQgU0hBIGhhc2ggb2YgdGhlIEhFQUQgY29tbWl0LiBSZXR1cm5zIG51bGwgaWYgdW5hYmxlIHRvIHJldHJpZXZlIHRoZSBoYXNoLlxuICovXG5mdW5jdGlvbiBmaW5kQ3VycmVudEdpdFNoYSgpOiBzdHJpbmcgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZXhlY1N5bmMoJ2dpdCByZXYtcGFyc2UgSEVBRCcsIHsgZW5jb2Rpbmc6ICd1dGY4Jywgc3RkaW86ICdwaXBlJyB9KS50cmltKCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFNob3J0SGFzaChjb21taXRIYXNoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY29tbWl0SGFzaC5zbGljZSgwLCA5KTtcbn1cblxuZnVuY3Rpb24gY29lcmNlVmVyc2lvbk51bWJlcih2ZXJzaW9uOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAoIXZlcnNpb24pIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKCEvXlxcZHsxLDMwfVxcLlxcZHsxLDMwfVxcLlxcZHsxLDMwfS8udGVzdCh2ZXJzaW9uKSkge1xuICAgIGNvbnN0IG1hdGNoID0gdmVyc2lvbi5tYXRjaCgvXlxcZHsxLDMwfShcXC5cXGR7MSwzMH0pKi8pO1xuXG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAoIW1hdGNoWzFdKSB7XG4gICAgICB2ZXJzaW9uID0gdmVyc2lvbi5zdWJzdHJpbmcoMCwgbWF0Y2hbMF0ubGVuZ3RoKSArICcuMC4wJyArIHZlcnNpb24uc3Vic3RyaW5nKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgfSBlbHNlIGlmICghbWF0Y2hbMl0pIHtcbiAgICAgIHZlcnNpb24gPSB2ZXJzaW9uLnN1YnN0cmluZygwLCBtYXRjaFswXS5sZW5ndGgpICsgJy4wJyArIHZlcnNpb24uc3Vic3RyaW5nKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHNlbXZlci52YWxpZCh2ZXJzaW9uKSA/PyB1bmRlZmluZWQ7XG59XG4iXX0=