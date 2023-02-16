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
const module_1 = require("module");
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
            implies: ['migrate-only'],
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
            if (packages?.length && !this.checkCleanGit()) {
                if (allowDirty) {
                    logger.warn('Repository is not clean. Update changes will be mixed with pre-existing changes.');
                }
                else {
                    throw new command_module_1.CommandModuleError('Repository is not clean. Please commit or stash any changes before updating.');
                }
            }
            if (migrateOnly) {
                if (packages?.length !== 1) {
                    throw new command_module_1.CommandModuleError(`A single package must be specified when using the 'migrate-only' option.`);
                }
            }
            return true;
        })
            .strict();
    }
    async run(options) {
        const { logger, packageManager } = this.context;
        packageManager.ensureCompatibility();
        // Check if the current installed CLI version is older than the latest compatible version.
        // Skip when running `ng update` without a package name as this will not trigger an actual update.
        if (!environment_options_1.disableVersionCheck && options.packages?.length) {
            const cliVersionToInstall = await this.checkCLIVersion(options.packages, options.verbose, options.next);
            if (cliVersionToInstall) {
                logger.warn('The installed Angular CLI version is outdated.\n' +
                    `Installing a temporary Angular CLI versioned ${cliVersionToInstall} to perform the update.`);
                return this.runTempBinary(`@angular/cli@${cliVersionToInstall}`, process.argv.slice(2));
            }
        }
        const packages = [];
        for (const request of options.packages ?? []) {
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
                if (options.migrateOnly && packageIdentifier.rawSpec !== '*') {
                    logger.warn('Package specifier has no effect when using "migrate-only" option.');
                }
                // If next option is used and no specifier supplied, use next tag
                if (options.next && packageIdentifier.rawSpec === '*') {
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
            ? this.migrateOnly(workflow, (options.packages ?? [])[0], rootDependencies, options)
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
            const { success, files } = await this.executeSchematic(workflow, migration.collection.name, migration.name);
            if (!success) {
                return 1;
            }
            let modifiedFilesText;
            switch (files.size) {
                case 0:
                    modifiedFilesText = 'No changes made';
                    break;
                case 1:
                    modifiedFilesText = '1 file modified';
                    break;
                default:
                    modifiedFilesText = `${files.size} files modified`;
                    break;
            }
            logger.info(`  Migration completed (${modifiedFilesText}).`);
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
        let packagePath = packageDependency?.path;
        let packageNode = packageDependency?.package;
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
        let migrations = updateMetadata?.migrations;
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
                const packageRequire = (0, module_1.createRequire)(packagePath + '/');
                migrations = packageRequire.resolve(migrations);
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
            if (!node?.package) {
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
            if (manifest.version === node.package?.version) {
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
            catch { }
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
            const rootRequire = (0, module_1.createRequire)(this.context.root + '/');
            for (const migration of migrations) {
                // Resolve the package from the workspace root, as otherwise it will be resolved from the temp
                // installed CLI version.
                let packagePath;
                logVerbose(`Resolving migration package '${migration.package}' from '${this.context.root}'...`);
                try {
                    try {
                        packagePath = path.dirname(
                        // This may fail if the `package.json` is not exported as an entry point
                        rootRequire.resolve(path.join(migration.package, 'package.json')));
                    }
                    catch (e) {
                        (0, error_1.assertIsError)(e);
                        if (e.code === 'MODULE_NOT_FOUND') {
                            // Fallback to trying to resolve the package's main entry point
                            packagePath = rootRequire.resolve(migration.package);
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
                        const packageRequire = (0, module_1.createRequire)(packagePath + '/');
                        migrations = packageRequire.resolve(migration.collection);
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
        catch { }
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
        if (next) {
            return 'next';
        }
        const updatingAngularPackage = packagesToUpdate?.find((r) => ANGULAR_PACKAGES_REGEXP.test(r));
        if (updatingAngularPackage) {
            // If we are updating any Angular package we can update the CLI to the target version because
            // migrations for @angular/core@13 can be executed using Angular/cli@13.
            // This is same behaviour as `npx @angular/cli@13 update @angular/core@13`.
            // `@angular/cli@13` -> ['', 'angular/cli', '13']
            // `@angular/cli` -> ['', 'angular/cli']
            const tempVersion = coerceVersionNumber(updatingAngularPackage.split('@')[2]);
            return semver.parse(tempVersion)?.major ?? 'latest';
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
        return status ?? 0;
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
    catch {
        return null;
    }
}
function getShortHash(commitHash) {
    return commitHash.slice(0, 9);
}
function coerceVersionNumber(version) {
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
    return semver.valid(version) ?? undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3VwZGF0ZS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwyREFBMkU7QUFDM0UsNERBQWdFO0FBQ2hFLGlEQUFzRTtBQUN0RSwyQkFBZ0Q7QUFDaEQsbUNBQXVDO0FBQ3ZDLHNFQUFrQztBQUNsQywwRUFBNkM7QUFDN0MsMkNBQTZCO0FBQzdCLCtCQUFxQztBQUNyQywrQ0FBaUM7QUFFakMsMkVBQXNFO0FBQ3RFLHlFQUs4QztBQUM5QyxpR0FBNEY7QUFDNUYsMkZBQXlGO0FBQ3pGLGlEQUErQztBQUMvQyw2RUFBMEU7QUFDMUUsaURBQXNEO0FBQ3RELHVEQUErRDtBQUMvRCx1RUFLMEM7QUFDMUMsK0RBS3NDO0FBQ3RDLHFEQUFrRDtBQWVsRCxNQUFNLHVCQUF1QixHQUFHLDZCQUE2QixDQUFDO0FBQzlELE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztBQUV0RixNQUFhLG1CQUFvQixTQUFRLDhCQUFnQztJQUF6RTs7UUFDVyxVQUFLLEdBQUcsNkJBQVksQ0FBQyxFQUFFLENBQUM7UUFDZCwwQkFBcUIsR0FBRyxLQUFLLENBQUM7UUFFakQsWUFBTyxHQUFHLHFCQUFxQixDQUFDO1FBQ2hDLGFBQVEsR0FBRyw4RUFBOEUsQ0FBQztRQUMxRix3QkFBbUIsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQXE3Qi9ELENBQUM7SUFuN0JDLE9BQU8sQ0FBQyxVQUFnQjtRQUN0QixPQUFPLFVBQVU7YUFDZCxVQUFVLENBQUMsVUFBVSxFQUFFO1lBQ3RCLFdBQVcsRUFBRSxvQ0FBb0M7WUFDakQs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LENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUM3RjthQUFNO1lBQ0wsT0FBTyxTQUFTLENBQUM7U0FDbEI7S0FDRjtJQUVELE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxTQUFTLENBQUM7QUFDNUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVXb3JrZmxvdyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB7IFNwYXduU3luY1JldHVybnMsIGV4ZWNTeW5jLCBzcGF3blN5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHByb21pc2VzIGFzIGZzIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgY3JlYXRlUmVxdWlyZSB9IGZyb20gJ21vZHVsZSc7XG5pbXBvcnQgbnBhIGZyb20gJ25wbS1wYWNrYWdlLWFyZyc7XG5pbXBvcnQgcGlja01hbmlmZXN0IGZyb20gJ25wbS1waWNrLW1hbmlmZXN0JztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBqb2luLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBzZW12ZXIgZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uLy4uLy4uL2xpYi9jb25maWcvd29ya3NwYWNlLXNjaGVtYSc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kTW9kdWxlRXJyb3IsXG4gIENvbW1hbmRTY29wZSxcbiAgT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IFNjaGVtYXRpY0VuZ2luZUhvc3QgfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvdXRpbGl0aWVzL3NjaGVtYXRpYy1lbmdpbmUtaG9zdCc7XG5pbXBvcnQgeyBzdWJzY3JpYmVUb1dvcmtmbG93IH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL3V0aWxpdGllcy9zY2hlbWF0aWMtd29ya2Zsb3cnO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IGRpc2FibGVWZXJzaW9uQ2hlY2sgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvZW52aXJvbm1lbnQtb3B0aW9ucyc7XG5pbXBvcnQgeyBhc3NlcnRJc0Vycm9yIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2Vycm9yJztcbmltcG9ydCB7IHdyaXRlRXJyb3JUb0xvZ0ZpbGUgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvbG9nLWZpbGUnO1xuaW1wb3J0IHtcbiAgUGFja2FnZUlkZW50aWZpZXIsXG4gIFBhY2thZ2VNYW5pZmVzdCxcbiAgZmV0Y2hQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1ldGFkYXRhLFxufSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcGFja2FnZS1tZXRhZGF0YSc7XG5pbXBvcnQge1xuICBQYWNrYWdlVHJlZU5vZGUsXG4gIGZpbmRQYWNrYWdlSnNvbixcbiAgZ2V0UHJvamVjdERlcGVuZGVuY2llcyxcbiAgcmVhZFBhY2thZ2VKc29uLFxufSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcGFja2FnZS10cmVlJztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvdmVyc2lvbic7XG5cbmludGVyZmFjZSBVcGRhdGVDb21tYW5kQXJncyB7XG4gIHBhY2thZ2VzPzogc3RyaW5nW107XG4gIGZvcmNlOiBib29sZWFuO1xuICBuZXh0OiBib29sZWFuO1xuICAnbWlncmF0ZS1vbmx5Jz86IGJvb2xlYW47XG4gIG5hbWU/OiBzdHJpbmc7XG4gIGZyb20/OiBzdHJpbmc7XG4gIHRvPzogc3RyaW5nO1xuICAnYWxsb3ctZGlydHknOiBib29sZWFuO1xuICB2ZXJib3NlOiBib29sZWFuO1xuICAnY3JlYXRlLWNvbW1pdHMnOiBib29sZWFuO1xufVxuXG5jb25zdCBBTkdVTEFSX1BBQ0tBR0VTX1JFR0VYUCA9IC9eQCg/OmFuZ3VsYXJ8bmd1bml2ZXJzYWwpXFwvLztcbmNvbnN0IFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTiA9IHBhdGguam9pbihfX2Rpcm5hbWUsICdzY2hlbWF0aWMvY29sbGVjdGlvbi5qc29uJyk7XG5cbmV4cG9ydCBjbGFzcyBVcGRhdGVDb21tYW5kTW9kdWxlIGV4dGVuZHMgQ29tbWFuZE1vZHVsZTxVcGRhdGVDb21tYW5kQXJncz4ge1xuICBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5JbjtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIHNob3VsZFJlcG9ydEFuYWx5dGljcyA9IGZhbHNlO1xuXG4gIGNvbW1hbmQgPSAndXBkYXRlIFtwYWNrYWdlcy4uXSc7XG4gIGRlc2NyaWJlID0gJ1VwZGF0ZXMgeW91ciB3b3Jrc3BhY2UgYW5kIGl0cyBkZXBlbmRlbmNpZXMuIFNlZSBodHRwczovL3VwZGF0ZS5hbmd1bGFyLmlvLy4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoID0gam9pbihfX2Rpcm5hbWUsICdsb25nLWRlc2NyaXB0aW9uLm1kJyk7XG5cbiAgYnVpbGRlcihsb2NhbFlhcmdzOiBBcmd2KTogQXJndjxVcGRhdGVDb21tYW5kQXJncz4ge1xuICAgIHJldHVybiBsb2NhbFlhcmdzXG4gICAgICAucG9zaXRpb25hbCgncGFja2FnZXMnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIG5hbWVzIG9mIHBhY2thZ2UocykgdG8gdXBkYXRlLicsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBhcnJheTogdHJ1ZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdmb3JjZScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdJZ25vcmUgcGVlciBkZXBlbmRlbmN5IHZlcnNpb24gbWlzbWF0Y2hlcy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ25leHQnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnVXNlIHRoZSBwcmVyZWxlYXNlIHZlcnNpb24sIGluY2x1ZGluZyBiZXRhIGFuZCBSQ3MuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdtaWdyYXRlLW9ubHknLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnT25seSBwZXJmb3JtIGEgbWlncmF0aW9uLCBkbyBub3QgdXBkYXRlIHRoZSBpbnN0YWxsZWQgdmVyc2lvbi4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignbmFtZScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgJ1RoZSBuYW1lIG9mIHRoZSBtaWdyYXRpb24gdG8gcnVuLiAnICtcbiAgICAgICAgICBgT25seSBhdmFpbGFibGUgd2l0aCBhIHNpbmdsZSBwYWNrYWdlIGJlaW5nIHVwZGF0ZWQsIGFuZCBvbmx5IHdpdGggJ21pZ3JhdGUtb25seScgb3B0aW9uLmAsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBpbXBsaWVzOiBbJ21pZ3JhdGUtb25seSddLFxuICAgICAgICBjb25mbGljdHM6IFsndG8nLCAnZnJvbSddLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2Zyb20nLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICdWZXJzaW9uIGZyb20gd2hpY2ggdG8gbWlncmF0ZSBmcm9tLiAnICtcbiAgICAgICAgICBgT25seSBhdmFpbGFibGUgd2l0aCBhIHNpbmdsZSBwYWNrYWdlIGJlaW5nIHVwZGF0ZWQsIGFuZCBvbmx5IHdpdGggJ21pZ3JhdGUtb25seScuYCxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGltcGxpZXM6IFsnbWlncmF0ZS1vbmx5J10sXG4gICAgICAgIGNvbmZsaWN0czogWyduYW1lJ10sXG4gICAgICB9KVxuICAgICAgLm9wdGlvbigndG8nLCB7XG4gICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICdWZXJzaW9uIHVwIHRvIHdoaWNoIHRvIGFwcGx5IG1pZ3JhdGlvbnMuIE9ubHkgYXZhaWxhYmxlIHdpdGggYSBzaW5nbGUgcGFja2FnZSBiZWluZyB1cGRhdGVkLCAnICtcbiAgICAgICAgICBgYW5kIG9ubHkgd2l0aCAnbWlncmF0ZS1vbmx5JyBvcHRpb24uIFJlcXVpcmVzICdmcm9tJyB0byBiZSBzcGVjaWZpZWQuIERlZmF1bHQgdG8gdGhlIGluc3RhbGxlZCB2ZXJzaW9uIGRldGVjdGVkLmAsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBpbXBsaWVzOiBbJ2Zyb20nLCAnbWlncmF0ZS1vbmx5J10sXG4gICAgICAgIGNvbmZsaWN0czogWyduYW1lJ10sXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignYWxsb3ctZGlydHknLCB7XG4gICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICdXaGV0aGVyIHRvIGFsbG93IHVwZGF0aW5nIHdoZW4gdGhlIHJlcG9zaXRvcnkgY29udGFpbnMgbW9kaWZpZWQgb3IgdW50cmFja2VkIGZpbGVzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbigndmVyYm9zZScsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdEaXNwbGF5IGFkZGl0aW9uYWwgZGV0YWlscyBhYm91dCBpbnRlcm5hbCBvcGVyYXRpb25zIGR1cmluZyBleGVjdXRpb24uJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdjcmVhdGUtY29tbWl0cycsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdDcmVhdGUgc291cmNlIGNvbnRyb2wgY29tbWl0cyBmb3IgdXBkYXRlcyBhbmQgbWlncmF0aW9ucy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGFsaWFzOiBbJ0MnXSxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLmNoZWNrKCh7IHBhY2thZ2VzLCAnYWxsb3ctZGlydHknOiBhbGxvd0RpcnR5LCAnbWlncmF0ZS1vbmx5JzogbWlncmF0ZU9ubHkgfSkgPT4ge1xuICAgICAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgICAgIC8vIFRoaXMgYWxsb3dzIHRoZSB1c2VyIHRvIGVhc2lseSByZXNldCBhbnkgY2hhbmdlcyBmcm9tIHRoZSB1cGRhdGUuXG4gICAgICAgIGlmIChwYWNrYWdlcz8ubGVuZ3RoICYmICF0aGlzLmNoZWNrQ2xlYW5HaXQoKSkge1xuICAgICAgICAgIGlmIChhbGxvd0RpcnR5KSB7XG4gICAgICAgICAgICBsb2dnZXIud2FybihcbiAgICAgICAgICAgICAgJ1JlcG9zaXRvcnkgaXMgbm90IGNsZWFuLiBVcGRhdGUgY2hhbmdlcyB3aWxsIGJlIG1peGVkIHdpdGggcHJlLWV4aXN0aW5nIGNoYW5nZXMuJyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IoXG4gICAgICAgICAgICAgICdSZXBvc2l0b3J5IGlzIG5vdCBjbGVhbi4gUGxlYXNlIGNvbW1pdCBvciBzdGFzaCBhbnkgY2hhbmdlcyBiZWZvcmUgdXBkYXRpbmcuJyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1pZ3JhdGVPbmx5KSB7XG4gICAgICAgICAgaWYgKHBhY2thZ2VzPy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IoXG4gICAgICAgICAgICAgIGBBIHNpbmdsZSBwYWNrYWdlIG11c3QgYmUgc3BlY2lmaWVkIHdoZW4gdXNpbmcgdGhlICdtaWdyYXRlLW9ubHknIG9wdGlvbi5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pXG4gICAgICAuc3RyaWN0KCk7XG4gIH1cblxuICBhc3luYyBydW4ob3B0aW9uczogT3B0aW9uczxVcGRhdGVDb21tYW5kQXJncz4pOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBjb25zdCB7IGxvZ2dlciwgcGFja2FnZU1hbmFnZXIgfSA9IHRoaXMuY29udGV4dDtcblxuICAgIHBhY2thZ2VNYW5hZ2VyLmVuc3VyZUNvbXBhdGliaWxpdHkoKTtcblxuICAgIC8vIENoZWNrIGlmIHRoZSBjdXJyZW50IGluc3RhbGxlZCBDTEkgdmVyc2lvbiBpcyBvbGRlciB0aGFuIHRoZSBsYXRlc3QgY29tcGF0aWJsZSB2ZXJzaW9uLlxuICAgIC8vIFNraXAgd2hlbiBydW5uaW5nIGBuZyB1cGRhdGVgIHdpdGhvdXQgYSBwYWNrYWdlIG5hbWUgYXMgdGhpcyB3aWxsIG5vdCB0cmlnZ2VyIGFuIGFjdHVhbCB1cGRhdGUuXG4gICAgaWYgKCFkaXNhYmxlVmVyc2lvbkNoZWNrICYmIG9wdGlvbnMucGFja2FnZXM/Lmxlbmd0aCkge1xuICAgICAgY29uc3QgY2xpVmVyc2lvblRvSW5zdGFsbCA9IGF3YWl0IHRoaXMuY2hlY2tDTElWZXJzaW9uKFxuICAgICAgICBvcHRpb25zLnBhY2thZ2VzLFxuICAgICAgICBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgIG9wdGlvbnMubmV4dCxcbiAgICAgICk7XG5cbiAgICAgIGlmIChjbGlWZXJzaW9uVG9JbnN0YWxsKSB7XG4gICAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICAgICdUaGUgaW5zdGFsbGVkIEFuZ3VsYXIgQ0xJIHZlcnNpb24gaXMgb3V0ZGF0ZWQuXFxuJyArXG4gICAgICAgICAgICBgSW5zdGFsbGluZyBhIHRlbXBvcmFyeSBBbmd1bGFyIENMSSB2ZXJzaW9uZWQgJHtjbGlWZXJzaW9uVG9JbnN0YWxsfSB0byBwZXJmb3JtIHRoZSB1cGRhdGUuYCxcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5ydW5UZW1wQmluYXJ5KGBAYW5ndWxhci9jbGlAJHtjbGlWZXJzaW9uVG9JbnN0YWxsfWAsIHByb2Nlc3MuYXJndi5zbGljZSgyKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcGFja2FnZXM6IFBhY2thZ2VJZGVudGlmaWVyW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJlcXVlc3Qgb2Ygb3B0aW9ucy5wYWNrYWdlcyA/PyBbXSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcGFja2FnZUlkZW50aWZpZXIgPSBucGEocmVxdWVzdCk7XG5cbiAgICAgICAgLy8gb25seSByZWdpc3RyeSBpZGVudGlmaWVycyBhcmUgc3VwcG9ydGVkXG4gICAgICAgIGlmICghcGFja2FnZUlkZW50aWZpZXIucmVnaXN0cnkpIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoYFBhY2thZ2UgJyR7cmVxdWVzdH0nIGlzIG5vdCBhIHJlZ2lzdHJ5IHBhY2thZ2UgaWRlbnRpZmVyLmApO1xuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocGFja2FnZXMuc29tZSgodikgPT4gdi5uYW1lID09PSBwYWNrYWdlSWRlbnRpZmllci5uYW1lKSkge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcihgRHVwbGljYXRlIHBhY2thZ2UgJyR7cGFja2FnZUlkZW50aWZpZXIubmFtZX0nIHNwZWNpZmllZC5gKTtcblxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMubWlncmF0ZU9ubHkgJiYgcGFja2FnZUlkZW50aWZpZXIucmF3U3BlYyAhPT0gJyonKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oJ1BhY2thZ2Ugc3BlY2lmaWVyIGhhcyBubyBlZmZlY3Qgd2hlbiB1c2luZyBcIm1pZ3JhdGUtb25seVwiIG9wdGlvbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIG5leHQgb3B0aW9uIGlzIHVzZWQgYW5kIG5vIHNwZWNpZmllciBzdXBwbGllZCwgdXNlIG5leHQgdGFnXG4gICAgICAgIGlmIChvcHRpb25zLm5leHQgJiYgcGFja2FnZUlkZW50aWZpZXIucmF3U3BlYyA9PT0gJyonKSB7XG4gICAgICAgICAgcGFja2FnZUlkZW50aWZpZXIuZmV0Y2hTcGVjID0gJ25leHQnO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFja2FnZXMucHVzaChwYWNrYWdlSWRlbnRpZmllciBhcyBQYWNrYWdlSWRlbnRpZmllcik7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgIGxvZ2dlci5lcnJvcihlLm1lc3NhZ2UpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxvZ2dlci5pbmZvKGBVc2luZyBwYWNrYWdlIG1hbmFnZXI6ICR7Y29sb3JzLmdyZXkocGFja2FnZU1hbmFnZXIubmFtZSl9YCk7XG4gICAgbG9nZ2VyLmluZm8oJ0NvbGxlY3RpbmcgaW5zdGFsbGVkIGRlcGVuZGVuY2llcy4uLicpO1xuXG4gICAgY29uc3Qgcm9vdERlcGVuZGVuY2llcyA9IGF3YWl0IGdldFByb2plY3REZXBlbmRlbmNpZXModGhpcy5jb250ZXh0LnJvb3QpO1xuICAgIGxvZ2dlci5pbmZvKGBGb3VuZCAke3Jvb3REZXBlbmRlbmNpZXMuc2l6ZX0gZGVwZW5kZW5jaWVzLmApO1xuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSBuZXcgTm9kZVdvcmtmbG93KHRoaXMuY29udGV4dC5yb290LCB7XG4gICAgICBwYWNrYWdlTWFuYWdlcjogcGFja2FnZU1hbmFnZXIubmFtZSxcbiAgICAgIHBhY2thZ2VNYW5hZ2VyRm9yY2U6IHRoaXMucGFja2FnZU1hbmFnZXJGb3JjZShvcHRpb25zLnZlcmJvc2UpLFxuICAgICAgLy8gX19kaXJuYW1lIC0+IGZhdm9yIEBzY2hlbWF0aWNzL3VwZGF0ZSBmcm9tIHRoaXMgcGFja2FnZVxuICAgICAgLy8gT3RoZXJ3aXNlLCB1c2UgcGFja2FnZXMgZnJvbSB0aGUgYWN0aXZlIHdvcmtzcGFjZSAobWlncmF0aW9ucylcbiAgICAgIHJlc29sdmVQYXRoczogW19fZGlybmFtZSwgdGhpcy5jb250ZXh0LnJvb3RdLFxuICAgICAgc2NoZW1hVmFsaWRhdGlvbjogdHJ1ZSxcbiAgICAgIGVuZ2luZUhvc3RDcmVhdG9yOiAob3B0aW9ucykgPT4gbmV3IFNjaGVtYXRpY0VuZ2luZUhvc3Qob3B0aW9ucy5yZXNvbHZlUGF0aHMpLFxuICAgIH0pO1xuXG4gICAgaWYgKHBhY2thZ2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gU2hvdyBzdGF0dXNcbiAgICAgIGNvbnN0IHsgc3VjY2VzcyB9ID0gYXdhaXQgdGhpcy5leGVjdXRlU2NoZW1hdGljKFxuICAgICAgICB3b3JrZmxvdyxcbiAgICAgICAgVVBEQVRFX1NDSEVNQVRJQ19DT0xMRUNUSU9OLFxuICAgICAgICAndXBkYXRlJyxcbiAgICAgICAge1xuICAgICAgICAgIGZvcmNlOiBvcHRpb25zLmZvcmNlLFxuICAgICAgICAgIG5leHQ6IG9wdGlvbnMubmV4dCxcbiAgICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgICAgcGFja2FnZU1hbmFnZXI6IHBhY2thZ2VNYW5hZ2VyLm5hbWUsXG4gICAgICAgICAgcGFja2FnZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIHN1Y2Nlc3MgPyAwIDogMTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0aW9ucy5taWdyYXRlT25seVxuICAgICAgPyB0aGlzLm1pZ3JhdGVPbmx5KHdvcmtmbG93LCAob3B0aW9ucy5wYWNrYWdlcyA/PyBbXSlbMF0sIHJvb3REZXBlbmRlbmNpZXMsIG9wdGlvbnMpXG4gICAgICA6IHRoaXMudXBkYXRlUGFja2FnZXNBbmRNaWdyYXRlKHdvcmtmbG93LCByb290RGVwZW5kZW5jaWVzLCBvcHRpb25zLCBwYWNrYWdlcyk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICBjb2xsZWN0aW9uOiBzdHJpbmcsXG4gICAgc2NoZW1hdGljOiBzdHJpbmcsXG4gICAgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fSxcbiAgKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGZpbGVzOiBTZXQ8c3RyaW5nPiB9PiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCB3b3JrZmxvd1N1YnNjcmlwdGlvbiA9IHN1YnNjcmliZVRvV29ya2Zsb3cod29ya2Zsb3csIGxvZ2dlcik7XG5cbiAgICAvLyBUT0RPOiBBbGxvdyBwYXNzaW5nIGEgc2NoZW1hdGljIGluc3RhbmNlIGRpcmVjdGx5XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHdvcmtmbG93XG4gICAgICAgIC5leGVjdXRlKHtcbiAgICAgICAgICBjb2xsZWN0aW9uLFxuICAgICAgICAgIHNjaGVtYXRpYyxcbiAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgIGxvZ2dlcixcbiAgICAgICAgfSlcbiAgICAgICAgLnRvUHJvbWlzZSgpO1xuXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiAhd29ya2Zsb3dTdWJzY3JpcHRpb24uZXJyb3IsIGZpbGVzOiB3b3JrZmxvd1N1YnNjcmlwdGlvbi5maWxlcyB9O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24pIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGAke2NvbG9ycy5zeW1ib2xzLmNyb3NzfSBNaWdyYXRpb24gZmFpbGVkLiBTZWUgYWJvdmUgZm9yIGZ1cnRoZXIgZGV0YWlscy5cXG5gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgIGNvbnN0IGxvZ1BhdGggPSB3cml0ZUVycm9yVG9Mb2dGaWxlKGUpO1xuICAgICAgICBsb2dnZXIuZmF0YWwoXG4gICAgICAgICAgYCR7Y29sb3JzLnN5bWJvbHMuY3Jvc3N9IE1pZ3JhdGlvbiBmYWlsZWQ6ICR7ZS5tZXNzYWdlfVxcbmAgK1xuICAgICAgICAgICAgYCAgU2VlIFwiJHtsb2dQYXRofVwiIGZvciBmdXJ0aGVyIGRldGFpbHMuXFxuYCxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGZpbGVzOiB3b3JrZmxvd1N1YnNjcmlwdGlvbi5maWxlcyB9O1xuICAgIH0gZmluYWxseSB7XG4gICAgICB3b3JrZmxvd1N1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSBtaWdyYXRpb24gd2FzIHBlcmZvcm1lZCBzdWNjZXNzZnVsbHkuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVNaWdyYXRpb24oXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIGNvbGxlY3Rpb25QYXRoOiBzdHJpbmcsXG4gICAgbWlncmF0aW9uTmFtZTogc3RyaW5nLFxuICAgIGNvbW1pdD86IGJvb2xlYW4sXG4gICk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvblBhdGgpO1xuICAgIGNvbnN0IG5hbWUgPSBjb2xsZWN0aW9uLmxpc3RTY2hlbWF0aWNOYW1lcygpLmZpbmQoKG5hbWUpID0+IG5hbWUgPT09IG1pZ3JhdGlvbk5hbWUpO1xuICAgIGlmICghbmFtZSkge1xuICAgICAgbG9nZ2VyLmVycm9yKGBDYW5ub3QgZmluZCBtaWdyYXRpb24gJyR7bWlncmF0aW9uTmFtZX0nIGluICcke3BhY2thZ2VOYW1lfScuYCk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGxvZ2dlci5pbmZvKGNvbG9ycy5jeWFuKGAqKiBFeGVjdXRpbmcgJyR7bWlncmF0aW9uTmFtZX0nIG9mIHBhY2thZ2UgJyR7cGFja2FnZU5hbWV9JyAqKlxcbmApKTtcbiAgICBjb25zdCBzY2hlbWF0aWMgPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlU2NoZW1hdGljKG5hbWUsIGNvbGxlY3Rpb24pO1xuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVBhY2thZ2VNaWdyYXRpb25zKHdvcmtmbG93LCBbc2NoZW1hdGljLmRlc2NyaXB0aW9uXSwgcGFja2FnZU5hbWUsIGNvbW1pdCk7XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgbWlncmF0aW9ucyB3ZXJlIHBlcmZvcm1lZCBzdWNjZXNzZnVsbHkuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVNaWdyYXRpb25zKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICBjb2xsZWN0aW9uUGF0aDogc3RyaW5nLFxuICAgIGZyb206IHN0cmluZyxcbiAgICB0bzogc3RyaW5nLFxuICAgIGNvbW1pdD86IGJvb2xlYW4sXG4gICk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25QYXRoKTtcbiAgICBjb25zdCBtaWdyYXRpb25SYW5nZSA9IG5ldyBzZW12ZXIuUmFuZ2UoXG4gICAgICAnPicgKyAoc2VtdmVyLnByZXJlbGVhc2UoZnJvbSkgPyBmcm9tLnNwbGl0KCctJylbMF0gKyAnLTAnIDogZnJvbSkgKyAnIDw9JyArIHRvLnNwbGl0KCctJylbMF0sXG4gICAgKTtcbiAgICBjb25zdCBtaWdyYXRpb25zID0gW107XG5cbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgY29sbGVjdGlvbi5saXN0U2NoZW1hdGljTmFtZXMoKSkge1xuICAgICAgY29uc3Qgc2NoZW1hdGljID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZVNjaGVtYXRpYyhuYW1lLCBjb2xsZWN0aW9uKTtcbiAgICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gc2NoZW1hdGljLmRlc2NyaXB0aW9uIGFzIHR5cGVvZiBzY2hlbWF0aWMuZGVzY3JpcHRpb24gJiB7XG4gICAgICAgIHZlcnNpb24/OiBzdHJpbmc7XG4gICAgICB9O1xuICAgICAgZGVzY3JpcHRpb24udmVyc2lvbiA9IGNvZXJjZVZlcnNpb25OdW1iZXIoZGVzY3JpcHRpb24udmVyc2lvbik7XG4gICAgICBpZiAoIWRlc2NyaXB0aW9uLnZlcnNpb24pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChzZW12ZXIuc2F0aXNmaWVzKGRlc2NyaXB0aW9uLnZlcnNpb24sIG1pZ3JhdGlvblJhbmdlLCB7IGluY2x1ZGVQcmVyZWxlYXNlOiB0cnVlIH0pKSB7XG4gICAgICAgIG1pZ3JhdGlvbnMucHVzaChkZXNjcmlwdGlvbiBhcyB0eXBlb2Ygc2NoZW1hdGljLmRlc2NyaXB0aW9uICYgeyB2ZXJzaW9uOiBzdHJpbmcgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1pZ3JhdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBtaWdyYXRpb25zLnNvcnQoKGEsIGIpID0+IHNlbXZlci5jb21wYXJlKGEudmVyc2lvbiwgYi52ZXJzaW9uKSB8fCBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpKTtcblxuICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyhcbiAgICAgIGNvbG9ycy5jeWFuKGAqKiBFeGVjdXRpbmcgbWlncmF0aW9ucyBvZiBwYWNrYWdlICcke3BhY2thZ2VOYW1lfScgKipcXG5gKSxcbiAgICApO1xuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVBhY2thZ2VNaWdyYXRpb25zKHdvcmtmbG93LCBtaWdyYXRpb25zLCBwYWNrYWdlTmFtZSwgY29tbWl0KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVBhY2thZ2VNaWdyYXRpb25zKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgbWlncmF0aW9uczogSXRlcmFibGU8eyBuYW1lOiBzdHJpbmc7IGRlc2NyaXB0aW9uOiBzdHJpbmc7IGNvbGxlY3Rpb246IHsgbmFtZTogc3RyaW5nIH0gfT4sXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICBjb21taXQgPSBmYWxzZSxcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGZvciAoY29uc3QgbWlncmF0aW9uIG9mIG1pZ3JhdGlvbnMpIHtcbiAgICAgIGNvbnN0IFt0aXRsZSwgLi4uZGVzY3JpcHRpb25dID0gbWlncmF0aW9uLmRlc2NyaXB0aW9uLnNwbGl0KCcuICcpO1xuXG4gICAgICBsb2dnZXIuaW5mbyhcbiAgICAgICAgY29sb3JzLmN5YW4oY29sb3JzLnN5bWJvbHMucG9pbnRlcikgK1xuICAgICAgICAgICcgJyArXG4gICAgICAgICAgY29sb3JzLmJvbGQodGl0bGUuZW5kc1dpdGgoJy4nKSA/IHRpdGxlIDogdGl0bGUgKyAnLicpLFxuICAgICAgKTtcblxuICAgICAgaWYgKGRlc2NyaXB0aW9uLmxlbmd0aCkge1xuICAgICAgICBsb2dnZXIuaW5mbygnICAnICsgZGVzY3JpcHRpb24uam9pbignLlxcbiAgJykpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7IHN1Y2Nlc3MsIGZpbGVzIH0gPSBhd2FpdCB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgICAgIHdvcmtmbG93LFxuICAgICAgICBtaWdyYXRpb24uY29sbGVjdGlvbi5uYW1lLFxuICAgICAgICBtaWdyYXRpb24ubmFtZSxcbiAgICAgICk7XG4gICAgICBpZiAoIXN1Y2Nlc3MpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIGxldCBtb2RpZmllZEZpbGVzVGV4dDogc3RyaW5nO1xuICAgICAgc3dpdGNoIChmaWxlcy5zaXplKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICBtb2RpZmllZEZpbGVzVGV4dCA9ICdObyBjaGFuZ2VzIG1hZGUnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgbW9kaWZpZWRGaWxlc1RleHQgPSAnMSBmaWxlIG1vZGlmaWVkJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBtb2RpZmllZEZpbGVzVGV4dCA9IGAke2ZpbGVzLnNpemV9IGZpbGVzIG1vZGlmaWVkYDtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgbG9nZ2VyLmluZm8oYCAgTWlncmF0aW9uIGNvbXBsZXRlZCAoJHttb2RpZmllZEZpbGVzVGV4dH0pLmApO1xuXG4gICAgICAvLyBDb21taXQgbWlncmF0aW9uXG4gICAgICBpZiAoY29tbWl0KSB7XG4gICAgICAgIGNvbnN0IGNvbW1pdFByZWZpeCA9IGAke3BhY2thZ2VOYW1lfSBtaWdyYXRpb24gLSAke21pZ3JhdGlvbi5uYW1lfWA7XG4gICAgICAgIGNvbnN0IGNvbW1pdE1lc3NhZ2UgPSBtaWdyYXRpb24uZGVzY3JpcHRpb25cbiAgICAgICAgICA/IGAke2NvbW1pdFByZWZpeH1cXG5cXG4ke21pZ3JhdGlvbi5kZXNjcmlwdGlvbn1gXG4gICAgICAgICAgOiBjb21taXRQcmVmaXg7XG4gICAgICAgIGNvbnN0IGNvbW1pdHRlZCA9IHRoaXMuY29tbWl0KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgICBpZiAoIWNvbW1pdHRlZCkge1xuICAgICAgICAgIC8vIEZhaWxlZCB0byBjb21taXQsIHNvbWV0aGluZyB3ZW50IHdyb25nLiBBYm9ydCB0aGUgdXBkYXRlLlxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGxvZ2dlci5pbmZvKCcnKTsgLy8gRXh0cmEgdHJhaWxpbmcgbmV3bGluZS5cbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbWlncmF0ZU9ubHkoXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIHJvb3REZXBlbmRlbmNpZXM6IE1hcDxzdHJpbmcsIFBhY2thZ2VUcmVlTm9kZT4sXG4gICAgb3B0aW9uczogT3B0aW9uczxVcGRhdGVDb21tYW5kQXJncz4sXG4gICk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgcGFja2FnZURlcGVuZGVuY3kgPSByb290RGVwZW5kZW5jaWVzLmdldChwYWNrYWdlTmFtZSk7XG4gICAgbGV0IHBhY2thZ2VQYXRoID0gcGFja2FnZURlcGVuZGVuY3k/LnBhdGg7XG4gICAgbGV0IHBhY2thZ2VOb2RlID0gcGFja2FnZURlcGVuZGVuY3k/LnBhY2thZ2U7XG4gICAgaWYgKHBhY2thZ2VEZXBlbmRlbmN5ICYmICFwYWNrYWdlTm9kZSkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdQYWNrYWdlIGZvdW5kIGluIHBhY2thZ2UuanNvbiBidXQgaXMgbm90IGluc3RhbGxlZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmICghcGFja2FnZURlcGVuZGVuY3kpIHtcbiAgICAgIC8vIEFsbG93IHJ1bm5pbmcgbWlncmF0aW9ucyBvbiB0cmFuc2l0aXZlbHkgaW5zdGFsbGVkIGRlcGVuZGVuY2llc1xuICAgICAgLy8gVGhlcmUgY2FuIHRlY2huaWNhbGx5IGJlIG5lc3RlZCBtdWx0aXBsZSB2ZXJzaW9uc1xuICAgICAgLy8gVE9ETzogSWYgbXVsdGlwbGUsIHRoaXMgc2hvdWxkIGZpbmQgYWxsIHZlcnNpb25zIGFuZCBhc2sgd2hpY2ggb25lIHRvIHVzZVxuICAgICAgY29uc3QgcGFja2FnZUpzb24gPSBmaW5kUGFja2FnZUpzb24odGhpcy5jb250ZXh0LnJvb3QsIHBhY2thZ2VOYW1lKTtcbiAgICAgIGlmIChwYWNrYWdlSnNvbikge1xuICAgICAgICBwYWNrYWdlUGF0aCA9IHBhdGguZGlybmFtZShwYWNrYWdlSnNvbik7XG4gICAgICAgIHBhY2thZ2VOb2RlID0gYXdhaXQgcmVhZFBhY2thZ2VKc29uKHBhY2thZ2VKc29uKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXBhY2thZ2VOb2RlIHx8ICFwYWNrYWdlUGF0aCkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdQYWNrYWdlIGlzIG5vdCBpbnN0YWxsZWQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGNvbnN0IHVwZGF0ZU1ldGFkYXRhID0gcGFja2FnZU5vZGVbJ25nLXVwZGF0ZSddO1xuICAgIGxldCBtaWdyYXRpb25zID0gdXBkYXRlTWV0YWRhdGE/Lm1pZ3JhdGlvbnM7XG4gICAgaWYgKG1pZ3JhdGlvbnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdQYWNrYWdlIGRvZXMgbm90IHByb3ZpZGUgbWlncmF0aW9ucy4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbWlncmF0aW9ucyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBjb250YWlucyBhIG1hbGZvcm1lZCBtaWdyYXRpb25zIGZpZWxkLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKHBhdGgucG9zaXguaXNBYnNvbHV0ZShtaWdyYXRpb25zKSB8fCBwYXRoLndpbjMyLmlzQWJzb2x1dGUobWlncmF0aW9ucykpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgJ1BhY2thZ2UgY29udGFpbnMgYW4gaW52YWxpZCBtaWdyYXRpb25zIGZpZWxkLiBBYnNvbHV0ZSBwYXRocyBhcmUgbm90IHBlcm1pdHRlZC4nLFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gTm9ybWFsaXplIHNsYXNoZXNcbiAgICBtaWdyYXRpb25zID0gbWlncmF0aW9ucy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgICBpZiAobWlncmF0aW9ucy5zdGFydHNXaXRoKCcuLi8nKSkge1xuICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAnUGFja2FnZSBjb250YWlucyBhbiBpbnZhbGlkIG1pZ3JhdGlvbnMgZmllbGQuIFBhdGhzIG91dHNpZGUgdGhlIHBhY2thZ2Ugcm9vdCBhcmUgbm90IHBlcm1pdHRlZC4nLFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgaXQgaXMgYSBwYWNrYWdlLWxvY2FsIGxvY2F0aW9uXG4gICAgY29uc3QgbG9jYWxNaWdyYXRpb25zID0gcGF0aC5qb2luKHBhY2thZ2VQYXRoLCBtaWdyYXRpb25zKTtcbiAgICBpZiAoZXhpc3RzU3luYyhsb2NhbE1pZ3JhdGlvbnMpKSB7XG4gICAgICBtaWdyYXRpb25zID0gbG9jYWxNaWdyYXRpb25zO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUcnkgdG8gcmVzb2x2ZSBmcm9tIHBhY2thZ2UgbG9jYXRpb24uXG4gICAgICAvLyBUaGlzIGF2b2lkcyBpc3N1ZXMgd2l0aCBwYWNrYWdlIGhvaXN0aW5nLlxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcGFja2FnZVJlcXVpcmUgPSBjcmVhdGVSZXF1aXJlKHBhY2thZ2VQYXRoICsgJy8nKTtcbiAgICAgICAgbWlncmF0aW9ucyA9IHBhY2thZ2VSZXF1aXJlLnJlc29sdmUobWlncmF0aW9ucyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcignTWlncmF0aW9ucyBmb3IgcGFja2FnZSB3ZXJlIG5vdCBmb3VuZC4nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UuICBbJHtlLm1lc3NhZ2V9XWApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMubmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbihcbiAgICAgICAgd29ya2Zsb3csXG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICBtaWdyYXRpb25zLFxuICAgICAgICBvcHRpb25zLm5hbWUsXG4gICAgICAgIG9wdGlvbnMuY3JlYXRlQ29tbWl0cyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgZnJvbSA9IGNvZXJjZVZlcnNpb25OdW1iZXIob3B0aW9ucy5mcm9tKTtcbiAgICBpZiAoIWZyb20pIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgXCJmcm9tXCIgdmFsdWUgWyR7b3B0aW9ucy5mcm9tfV0gaXMgbm90IGEgdmFsaWQgdmVyc2lvbi5gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbnMoXG4gICAgICB3b3JrZmxvdyxcbiAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgbWlncmF0aW9ucyxcbiAgICAgIGZyb20sXG4gICAgICBvcHRpb25zLnRvIHx8IHBhY2thZ2VOb2RlLnZlcnNpb24sXG4gICAgICBvcHRpb25zLmNyZWF0ZUNvbW1pdHMsXG4gICAgKTtcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGluZXMtcGVyLWZ1bmN0aW9uXG4gIHByaXZhdGUgYXN5bmMgdXBkYXRlUGFja2FnZXNBbmRNaWdyYXRlKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgcm9vdERlcGVuZGVuY2llczogTWFwPHN0cmluZywgUGFja2FnZVRyZWVOb2RlPixcbiAgICBvcHRpb25zOiBPcHRpb25zPFVwZGF0ZUNvbW1hbmRBcmdzPixcbiAgICBwYWNrYWdlczogUGFja2FnZUlkZW50aWZpZXJbXSxcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgY29uc3QgbG9nVmVyYm9zZSA9IChtZXNzYWdlOiBzdHJpbmcpID0+IHtcbiAgICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8obWVzc2FnZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHJlcXVlc3RzOiB7XG4gICAgICBpZGVudGlmaWVyOiBQYWNrYWdlSWRlbnRpZmllcjtcbiAgICAgIG5vZGU6IFBhY2thZ2VUcmVlTm9kZTtcbiAgICB9W10gPSBbXTtcblxuICAgIC8vIFZhbGlkYXRlIHBhY2thZ2VzIGFjdHVhbGx5IGFyZSBwYXJ0IG9mIHRoZSB3b3Jrc3BhY2VcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlcykge1xuICAgICAgY29uc3Qgbm9kZSA9IHJvb3REZXBlbmRlbmNpZXMuZ2V0KHBrZy5uYW1lKTtcbiAgICAgIGlmICghbm9kZT8ucGFja2FnZSkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoYFBhY2thZ2UgJyR7cGtnLm5hbWV9JyBpcyBub3QgYSBkZXBlbmRlbmN5LmApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiBhIHNwZWNpZmljIHZlcnNpb24gaXMgcmVxdWVzdGVkIGFuZCBtYXRjaGVzIHRoZSBpbnN0YWxsZWQgdmVyc2lvbiwgc2tpcC5cbiAgICAgIGlmIChwa2cudHlwZSA9PT0gJ3ZlcnNpb24nICYmIG5vZGUucGFja2FnZS52ZXJzaW9uID09PSBwa2cuZmV0Y2hTcGVjKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBQYWNrYWdlICcke3BrZy5uYW1lfScgaXMgYWxyZWFkeSBhdCAnJHtwa2cuZmV0Y2hTcGVjfScuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0cy5wdXNoKHsgaWRlbnRpZmllcjogcGtnLCBub2RlIH0pO1xuICAgIH1cblxuICAgIGlmIChyZXF1ZXN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGxvZ2dlci5pbmZvKCdGZXRjaGluZyBkZXBlbmRlbmN5IG1ldGFkYXRhIGZyb20gcmVnaXN0cnkuLi4nKTtcblxuICAgIGNvbnN0IHBhY2thZ2VzVG9VcGRhdGU6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCB7IGlkZW50aWZpZXI6IHJlcXVlc3RJZGVudGlmaWVyLCBub2RlIH0gb2YgcmVxdWVzdHMpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VOYW1lID0gcmVxdWVzdElkZW50aWZpZXIubmFtZTtcblxuICAgICAgbGV0IG1ldGFkYXRhO1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gTWV0YWRhdGEgcmVxdWVzdHMgYXJlIGludGVybmFsbHkgY2FjaGVkOyBtdWx0aXBsZSByZXF1ZXN0cyBmb3Igc2FtZSBuYW1lXG4gICAgICAgIC8vIGRvZXMgbm90IHJlc3VsdCBpbiBhZGRpdGlvbmFsIG5ldHdvcmsgdHJhZmZpY1xuICAgICAgICBtZXRhZGF0YSA9IGF3YWl0IGZldGNoUGFja2FnZU1ldGFkYXRhKHBhY2thZ2VOYW1lLCBsb2dnZXIsIHtcbiAgICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGZldGNoaW5nIG1ldGFkYXRhIGZvciAnJHtwYWNrYWdlTmFtZX0nOiBgICsgZS5tZXNzYWdlKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgLy8gVHJ5IHRvIGZpbmQgYSBwYWNrYWdlIHZlcnNpb24gYmFzZWQgb24gdGhlIHVzZXIgcmVxdWVzdGVkIHBhY2thZ2Ugc3BlY2lmaWVyXG4gICAgICAvLyByZWdpc3RyeSBzcGVjaWZpZXIgdHlwZXMgYXJlIGVpdGhlciB2ZXJzaW9uLCByYW5nZSwgb3IgdGFnXG4gICAgICBsZXQgbWFuaWZlc3Q6IFBhY2thZ2VNYW5pZmVzdCB8IHVuZGVmaW5lZDtcbiAgICAgIGlmIChcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3ZlcnNpb24nIHx8XG4gICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICdyYW5nZScgfHxcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3RhZydcbiAgICAgICkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG1hbmlmZXN0ID0gcGlja01hbmlmZXN0KG1ldGFkYXRhLCByZXF1ZXN0SWRlbnRpZmllci5mZXRjaFNwZWMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgICBpZiAoZS5jb2RlID09PSAnRVRBUkdFVCcpIHtcbiAgICAgICAgICAgIC8vIElmIG5vdCBmb3VuZCBhbmQgbmV4dCB3YXMgdXNlZCBhbmQgdXNlciBkaWQgbm90IHByb3ZpZGUgYSBzcGVjaWZpZXIsIHRyeSBsYXRlc3QuXG4gICAgICAgICAgICAvLyBQYWNrYWdlIG1heSBub3QgaGF2ZSBhIG5leHQgdGFnLlxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICByZXF1ZXN0SWRlbnRpZmllci50eXBlID09PSAndGFnJyAmJlxuICAgICAgICAgICAgICByZXF1ZXN0SWRlbnRpZmllci5mZXRjaFNwZWMgPT09ICduZXh0JyAmJlxuICAgICAgICAgICAgICAhcmVxdWVzdElkZW50aWZpZXIucmF3U3BlY1xuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbWFuaWZlc3QgPSBwaWNrTWFuaWZlc3QobWV0YWRhdGEsICdsYXRlc3QnKTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgaWYgKGUuY29kZSAhPT0gJ0VUQVJHRVQnICYmIGUuY29kZSAhPT0gJ0VOT1ZFUlNJT05TJykge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKGUuY29kZSAhPT0gJ0VOT1ZFUlNJT05TJykge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFtYW5pZmVzdCkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgYFBhY2thZ2Ugc3BlY2lmaWVkIGJ5ICcke3JlcXVlc3RJZGVudGlmaWVyLnJhd30nIGRvZXMgbm90IGV4aXN0IHdpdGhpbiB0aGUgcmVnaXN0cnkuYCxcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1hbmlmZXN0LnZlcnNpb24gPT09IG5vZGUucGFja2FnZT8udmVyc2lvbikge1xuICAgICAgICBsb2dnZXIuaW5mbyhgUGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nIGlzIGFscmVhZHkgdXAgdG8gZGF0ZS5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChub2RlLnBhY2thZ2UgJiYgQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAudGVzdChub2RlLnBhY2thZ2UubmFtZSkpIHtcbiAgICAgICAgY29uc3QgeyBuYW1lLCB2ZXJzaW9uIH0gPSBub2RlLnBhY2thZ2U7XG4gICAgICAgIGNvbnN0IHRvQmVJbnN0YWxsZWRNYWpvclZlcnNpb24gPSArbWFuaWZlc3QudmVyc2lvbi5zcGxpdCgnLicpWzBdO1xuICAgICAgICBjb25zdCBjdXJyZW50TWFqb3JWZXJzaW9uID0gK3ZlcnNpb24uc3BsaXQoJy4nKVswXTtcblxuICAgICAgICBpZiAodG9CZUluc3RhbGxlZE1ham9yVmVyc2lvbiAtIGN1cnJlbnRNYWpvclZlcnNpb24gPiAxKSB7XG4gICAgICAgICAgLy8gT25seSBhbGxvdyB1cGRhdGluZyBhIHNpbmdsZSB2ZXJzaW9uIGF0IGEgdGltZS5cbiAgICAgICAgICBpZiAoY3VycmVudE1ham9yVmVyc2lvbiA8IDYpIHtcbiAgICAgICAgICAgIC8vIEJlZm9yZSB2ZXJzaW9uIDYsIHRoZSBtYWpvciB2ZXJzaW9ucyB3ZXJlIG5vdCBhbHdheXMgc2VxdWVudGlhbC5cbiAgICAgICAgICAgIC8vIEV4YW1wbGUgQGFuZ3VsYXIvY29yZSBza2lwcGVkIHZlcnNpb24gMywgQGFuZ3VsYXIvY2xpIHNraXBwZWQgdmVyc2lvbnMgMi01LlxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVXBkYXRpbmcgbXVsdGlwbGUgbWFqb3IgdmVyc2lvbnMgb2YgJyR7bmFtZX0nIGF0IG9uY2UgaXMgbm90IHN1cHBvcnRlZC4gUGxlYXNlIG1pZ3JhdGUgZWFjaCBtYWpvciB2ZXJzaW9uIGluZGl2aWR1YWxseS5cXG5gICtcbiAgICAgICAgICAgICAgICBgRm9yIG1vcmUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHVwZGF0ZSBwcm9jZXNzLCBzZWUgaHR0cHM6Ly91cGRhdGUuYW5ndWxhci5pby8uYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG5leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudCA9IGN1cnJlbnRNYWpvclZlcnNpb24gKyAxO1xuXG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBVcGRhdGluZyBtdWx0aXBsZSBtYWpvciB2ZXJzaW9ucyBvZiAnJHtuYW1lfScgYXQgb25jZSBpcyBub3Qgc3VwcG9ydGVkLiBQbGVhc2UgbWlncmF0ZSBlYWNoIG1ham9yIHZlcnNpb24gaW5kaXZpZHVhbGx5LlxcbmAgK1xuICAgICAgICAgICAgICAgIGBSdW4gJ25nIHVwZGF0ZSAke25hbWV9QCR7bmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50fScgaW4geW91ciB3b3Jrc3BhY2UgZGlyZWN0b3J5IGAgK1xuICAgICAgICAgICAgICAgIGB0byB1cGRhdGUgdG8gbGF0ZXN0ICcke25leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudH0ueCcgdmVyc2lvbiBvZiAnJHtuYW1lfScuXFxuXFxuYCArXG4gICAgICAgICAgICAgICAgYEZvciBtb3JlIGluZm9ybWF0aW9uIGFib3V0IHRoZSB1cGRhdGUgcHJvY2Vzcywgc2VlIGh0dHBzOi8vdXBkYXRlLmFuZ3VsYXIuaW8vP3Y9JHtjdXJyZW50TWFqb3JWZXJzaW9ufS4wLSR7bmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50fS4wYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcGFja2FnZXNUb1VwZGF0ZS5wdXNoKHJlcXVlc3RJZGVudGlmaWVyLnRvU3RyaW5nKCkpO1xuICAgIH1cblxuICAgIGlmIChwYWNrYWdlc1RvVXBkYXRlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgY29uc3QgeyBzdWNjZXNzIH0gPSBhd2FpdCB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgICB3b3JrZmxvdyxcbiAgICAgIFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTixcbiAgICAgICd1cGRhdGUnLFxuICAgICAge1xuICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgIGZvcmNlOiBvcHRpb25zLmZvcmNlLFxuICAgICAgICBuZXh0OiBvcHRpb25zLm5leHQsXG4gICAgICAgIHBhY2thZ2VNYW5hZ2VyOiB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIubmFtZSxcbiAgICAgICAgcGFja2FnZXM6IHBhY2thZ2VzVG9VcGRhdGUsXG4gICAgICB9LFxuICAgICk7XG5cbiAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMucm0ocGF0aC5qb2luKHRoaXMuY29udGV4dC5yb290LCAnbm9kZV9tb2R1bGVzJyksIHtcbiAgICAgICAgICBmb3JjZTogdHJ1ZSxcbiAgICAgICAgICByZWN1cnNpdmU6IHRydWUsXG4gICAgICAgICAgbWF4UmV0cmllczogMyxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIHt9XG5cbiAgICAgIGNvbnN0IGluc3RhbGxhdGlvblN1Y2Nlc3MgPSBhd2FpdCB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIuaW5zdGFsbEFsbChcbiAgICAgICAgdGhpcy5wYWNrYWdlTWFuYWdlckZvcmNlKG9wdGlvbnMudmVyYm9zZSkgPyBbJy0tZm9yY2UnXSA6IFtdLFxuICAgICAgICB0aGlzLmNvbnRleHQucm9vdCxcbiAgICAgICk7XG5cbiAgICAgIGlmICghaW5zdGFsbGF0aW9uU3VjY2Vzcykge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VjY2VzcyAmJiBvcHRpb25zLmNyZWF0ZUNvbW1pdHMpIHtcbiAgICAgIGlmICghdGhpcy5jb21taXQoYEFuZ3VsYXIgQ0xJIHVwZGF0ZSBmb3IgcGFja2FnZXMgLSAke3BhY2thZ2VzVG9VcGRhdGUuam9pbignLCAnKX1gKSkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGlzIGlzIGEgdGVtcG9yYXJ5IHdvcmthcm91bmQgdG8gYWxsb3cgZGF0YSB0byBiZSBwYXNzZWQgYmFjayBmcm9tIHRoZSB1cGRhdGUgc2NoZW1hdGljXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCBtaWdyYXRpb25zID0gKGdsb2JhbCBhcyBhbnkpLmV4dGVybmFsTWlncmF0aW9ucyBhcyB7XG4gICAgICBwYWNrYWdlOiBzdHJpbmc7XG4gICAgICBjb2xsZWN0aW9uOiBzdHJpbmc7XG4gICAgICBmcm9tOiBzdHJpbmc7XG4gICAgICB0bzogc3RyaW5nO1xuICAgIH1bXTtcblxuICAgIGlmIChzdWNjZXNzICYmIG1pZ3JhdGlvbnMpIHtcbiAgICAgIGNvbnN0IHJvb3RSZXF1aXJlID0gY3JlYXRlUmVxdWlyZSh0aGlzLmNvbnRleHQucm9vdCArICcvJyk7XG4gICAgICBmb3IgKGNvbnN0IG1pZ3JhdGlvbiBvZiBtaWdyYXRpb25zKSB7XG4gICAgICAgIC8vIFJlc29sdmUgdGhlIHBhY2thZ2UgZnJvbSB0aGUgd29ya3NwYWNlIHJvb3QsIGFzIG90aGVyd2lzZSBpdCB3aWxsIGJlIHJlc29sdmVkIGZyb20gdGhlIHRlbXBcbiAgICAgICAgLy8gaW5zdGFsbGVkIENMSSB2ZXJzaW9uLlxuICAgICAgICBsZXQgcGFja2FnZVBhdGg7XG4gICAgICAgIGxvZ1ZlcmJvc2UoXG4gICAgICAgICAgYFJlc29sdmluZyBtaWdyYXRpb24gcGFja2FnZSAnJHttaWdyYXRpb24ucGFja2FnZX0nIGZyb20gJyR7dGhpcy5jb250ZXh0LnJvb3R9Jy4uLmAsXG4gICAgICAgICk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHBhY2thZ2VQYXRoID0gcGF0aC5kaXJuYW1lKFxuICAgICAgICAgICAgICAvLyBUaGlzIG1heSBmYWlsIGlmIHRoZSBgcGFja2FnZS5qc29uYCBpcyBub3QgZXhwb3J0ZWQgYXMgYW4gZW50cnkgcG9pbnRcbiAgICAgICAgICAgICAgcm9vdFJlcXVpcmUucmVzb2x2ZShwYXRoLmpvaW4obWlncmF0aW9uLnBhY2thZ2UsICdwYWNrYWdlLmpzb24nKSksXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gdHJ5aW5nIHRvIHJlc29sdmUgdGhlIHBhY2thZ2UncyBtYWluIGVudHJ5IHBvaW50XG4gICAgICAgICAgICAgIHBhY2thZ2VQYXRoID0gcm9vdFJlcXVpcmUucmVzb2x2ZShtaWdyYXRpb24ucGFja2FnZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICBsb2dWZXJib3NlKGUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBNaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkgd2VyZSBub3QgZm91bmQuYCArXG4gICAgICAgICAgICAgICAgJyBUaGUgcGFja2FnZSBjb3VsZCBub3QgYmUgZm91bmQgaW4gdGhlIHdvcmtzcGFjZS4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVW5hYmxlIHRvIHJlc29sdmUgbWlncmF0aW9ucyBmb3IgcGFja2FnZSAoJHttaWdyYXRpb24ucGFja2FnZX0pLiAgWyR7ZS5tZXNzYWdlfV1gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBtaWdyYXRpb25zO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0IGlzIGEgcGFja2FnZS1sb2NhbCBsb2NhdGlvblxuICAgICAgICBjb25zdCBsb2NhbE1pZ3JhdGlvbnMgPSBwYXRoLmpvaW4ocGFja2FnZVBhdGgsIG1pZ3JhdGlvbi5jb2xsZWN0aW9uKTtcbiAgICAgICAgaWYgKGV4aXN0c1N5bmMobG9jYWxNaWdyYXRpb25zKSkge1xuICAgICAgICAgIG1pZ3JhdGlvbnMgPSBsb2NhbE1pZ3JhdGlvbnM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVHJ5IHRvIHJlc29sdmUgZnJvbSBwYWNrYWdlIGxvY2F0aW9uLlxuICAgICAgICAgIC8vIFRoaXMgYXZvaWRzIGlzc3VlcyB3aXRoIHBhY2thZ2UgaG9pc3RpbmcuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VSZXF1aXJlID0gY3JlYXRlUmVxdWlyZShwYWNrYWdlUGF0aCArICcvJyk7XG4gICAgICAgICAgICBtaWdyYXRpb25zID0gcGFja2FnZVJlcXVpcmUucmVzb2x2ZShtaWdyYXRpb24uY29sbGVjdGlvbik7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoYE1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KSB3ZXJlIG5vdCBmb3VuZC5gKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgICBgVW5hYmxlIHRvIHJlc29sdmUgbWlncmF0aW9ucyBmb3IgcGFja2FnZSAoJHttaWdyYXRpb24ucGFja2FnZX0pLiAgWyR7ZS5tZXNzYWdlfV1gLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlTWlncmF0aW9ucyhcbiAgICAgICAgICB3b3JrZmxvdyxcbiAgICAgICAgICBtaWdyYXRpb24ucGFja2FnZSxcbiAgICAgICAgICBtaWdyYXRpb25zLFxuICAgICAgICAgIG1pZ3JhdGlvbi5mcm9tLFxuICAgICAgICAgIG1pZ3JhdGlvbi50byxcbiAgICAgICAgICBvcHRpb25zLmNyZWF0ZUNvbW1pdHMsXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gQSBub24temVybyB2YWx1ZSBpcyBhIGZhaWx1cmUgZm9yIHRoZSBwYWNrYWdlJ3MgbWlncmF0aW9uc1xuICAgICAgICBpZiAocmVzdWx0ICE9PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdWNjZXNzID8gMCA6IDE7XG4gIH1cbiAgLyoqXG4gICAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIGNvbW1pdCB3YXMgc3VjY2Vzc2Z1bC5cbiAgICovXG4gIHByaXZhdGUgY29tbWl0KG1lc3NhZ2U6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICAvLyBDaGVjayBpZiBhIGNvbW1pdCBpcyBuZWVkZWQuXG4gICAgbGV0IGNvbW1pdE5lZWRlZDogYm9vbGVhbjtcbiAgICB0cnkge1xuICAgICAgY29tbWl0TmVlZGVkID0gaGFzQ2hhbmdlc1RvQ29tbWl0KCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYCAgRmFpbGVkIHRvIHJlYWQgR2l0IHRyZWU6XFxuJHsoZXJyIGFzIFNwYXduU3luY1JldHVybnM8c3RyaW5nPikuc3RkZXJyfWApO1xuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFjb21taXROZWVkZWQpIHtcbiAgICAgIGxvZ2dlci5pbmZvKCcgIE5vIGNoYW5nZXMgdG8gY29tbWl0IGFmdGVyIG1pZ3JhdGlvbi4nKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gQ29tbWl0IGNoYW5nZXMgYW5kIGFib3J0IG9uIGVycm9yLlxuICAgIHRyeSB7XG4gICAgICBjcmVhdGVDb21taXQobWVzc2FnZSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgIGBGYWlsZWQgdG8gY29tbWl0IHVwZGF0ZSAoJHttZXNzYWdlfSk6XFxuJHsoZXJyIGFzIFNwYXduU3luY1JldHVybnM8c3RyaW5nPikuc3RkZXJyfWAsXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gTm90aWZ5IHVzZXIgb2YgdGhlIGNvbW1pdC5cbiAgICBjb25zdCBoYXNoID0gZmluZEN1cnJlbnRHaXRTaGEoKTtcbiAgICBjb25zdCBzaG9ydE1lc3NhZ2UgPSBtZXNzYWdlLnNwbGl0KCdcXG4nKVswXTtcbiAgICBpZiAoaGFzaCkge1xuICAgICAgbG9nZ2VyLmluZm8oYCAgQ29tbWl0dGVkIG1pZ3JhdGlvbiBzdGVwICgke2dldFNob3J0SGFzaChoYXNoKX0pOiAke3Nob3J0TWVzc2FnZX0uYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIENvbW1pdCB3YXMgc3VjY2Vzc2Z1bCwgYnV0IHJlYWRpbmcgdGhlIGhhc2ggd2FzIG5vdC4gU29tZXRoaW5nIHdlaXJkIGhhcHBlbmVkLFxuICAgICAgLy8gYnV0IG5vdGhpbmcgdGhhdCB3b3VsZCBzdG9wIHRoZSB1cGRhdGUuIEp1c3QgbG9nIHRoZSB3ZWlyZG5lc3MgYW5kIGNvbnRpbnVlLlxuICAgICAgbG9nZ2VyLmluZm8oYCAgQ29tbWl0dGVkIG1pZ3JhdGlvbiBzdGVwOiAke3Nob3J0TWVzc2FnZX0uYCk7XG4gICAgICBsb2dnZXIud2FybignICBGYWlsZWQgdG8gbG9vayB1cCBoYXNoIG9mIG1vc3QgcmVjZW50IGNvbW1pdCwgY29udGludWluZyBhbnl3YXlzLicpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBjaGVja0NsZWFuR2l0KCk6IGJvb2xlYW4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0b3BMZXZlbCA9IGV4ZWNTeW5jKCdnaXQgcmV2LXBhcnNlIC0tc2hvdy10b3BsZXZlbCcsIHtcbiAgICAgICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICAgICAgc3RkaW86ICdwaXBlJyxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcmVzdWx0ID0gZXhlY1N5bmMoJ2dpdCBzdGF0dXMgLS1wb3JjZWxhaW4nLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSk7XG4gICAgICBpZiAocmVzdWx0LnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgZmlsZXMgaW5zaWRlIHRoZSB3b3Jrc3BhY2Ugcm9vdCBhcmUgcmVsZXZhbnRcbiAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgcmVzdWx0LnNwbGl0KCdcXG4nKSkge1xuICAgICAgICBjb25zdCByZWxhdGl2ZUVudHJ5ID0gcGF0aC5yZWxhdGl2ZShcbiAgICAgICAgICBwYXRoLnJlc29sdmUodGhpcy5jb250ZXh0LnJvb3QpLFxuICAgICAgICAgIHBhdGgucmVzb2x2ZSh0b3BMZXZlbC50cmltKCksIGVudHJ5LnNsaWNlKDMpLnRyaW0oKSksXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKCFyZWxhdGl2ZUVudHJ5LnN0YXJ0c1dpdGgoJy4uJykgJiYgIXBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZUVudHJ5KSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2gge31cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgY3VycmVudCBpbnN0YWxsZWQgQ0xJIHZlcnNpb24gaXMgb2xkZXIgb3IgbmV3ZXIgdGhhbiBhIGNvbXBhdGlibGUgdmVyc2lvbi5cbiAgICogQHJldHVybnMgdGhlIHZlcnNpb24gdG8gaW5zdGFsbCBvciBudWxsIHdoZW4gdGhlcmUgaXMgbm8gdXBkYXRlIHRvIGluc3RhbGwuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGNoZWNrQ0xJVmVyc2lvbihcbiAgICBwYWNrYWdlc1RvVXBkYXRlOiBzdHJpbmdbXSxcbiAgICB2ZXJib3NlID0gZmFsc2UsXG4gICAgbmV4dCA9IGZhbHNlLFxuICApOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICBjb25zdCB7IHZlcnNpb24gfSA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KFxuICAgICAgYEBhbmd1bGFyL2NsaUAke3RoaXMuZ2V0Q0xJVXBkYXRlUnVubmVyVmVyc2lvbihwYWNrYWdlc1RvVXBkYXRlLCBuZXh0KX1gLFxuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlcixcbiAgICAgIHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgdXNpbmdZYXJuOiB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIubmFtZSA9PT0gUGFja2FnZU1hbmFnZXIuWWFybixcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIHJldHVybiBWRVJTSU9OLmZ1bGwgPT09IHZlcnNpb24gPyBudWxsIDogdmVyc2lvbjtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q0xJVXBkYXRlUnVubmVyVmVyc2lvbihcbiAgICBwYWNrYWdlc1RvVXBkYXRlOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCxcbiAgICBuZXh0OiBib29sZWFuLFxuICApOiBzdHJpbmcgfCBudW1iZXIge1xuICAgIGlmIChuZXh0KSB7XG4gICAgICByZXR1cm4gJ25leHQnO1xuICAgIH1cblxuICAgIGNvbnN0IHVwZGF0aW5nQW5ndWxhclBhY2thZ2UgPSBwYWNrYWdlc1RvVXBkYXRlPy5maW5kKChyKSA9PiBBTkdVTEFSX1BBQ0tBR0VTX1JFR0VYUC50ZXN0KHIpKTtcbiAgICBpZiAodXBkYXRpbmdBbmd1bGFyUGFja2FnZSkge1xuICAgICAgLy8gSWYgd2UgYXJlIHVwZGF0aW5nIGFueSBBbmd1bGFyIHBhY2thZ2Ugd2UgY2FuIHVwZGF0ZSB0aGUgQ0xJIHRvIHRoZSB0YXJnZXQgdmVyc2lvbiBiZWNhdXNlXG4gICAgICAvLyBtaWdyYXRpb25zIGZvciBAYW5ndWxhci9jb3JlQDEzIGNhbiBiZSBleGVjdXRlZCB1c2luZyBBbmd1bGFyL2NsaUAxMy5cbiAgICAgIC8vIFRoaXMgaXMgc2FtZSBiZWhhdmlvdXIgYXMgYG5weCBAYW5ndWxhci9jbGlAMTMgdXBkYXRlIEBhbmd1bGFyL2NvcmVAMTNgLlxuXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpQDEzYCAtPiBbJycsICdhbmd1bGFyL2NsaScsICcxMyddXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpYCAtPiBbJycsICdhbmd1bGFyL2NsaSddXG4gICAgICBjb25zdCB0ZW1wVmVyc2lvbiA9IGNvZXJjZVZlcnNpb25OdW1iZXIodXBkYXRpbmdBbmd1bGFyUGFja2FnZS5zcGxpdCgnQCcpWzJdKTtcblxuICAgICAgcmV0dXJuIHNlbXZlci5wYXJzZSh0ZW1wVmVyc2lvbik/Lm1ham9yID8/ICdsYXRlc3QnO1xuICAgIH1cblxuICAgIC8vIFdoZW4gbm90IHVwZGF0aW5nIGFuIEFuZ3VsYXIgcGFja2FnZSB3ZSBjYW5ub3QgZGV0ZXJtaW5lIHdoaWNoIHNjaGVtYXRpYyBydW50aW1lIHRoZSBtaWdyYXRpb24gc2hvdWxkIHRvIGJlIGV4ZWN1dGVkIGluLlxuICAgIC8vIFR5cGljYWxseSwgd2UgY2FuIGFzc3VtZSB0aGF0IHRoZSBgQGFuZ3VsYXIvY2xpYCB3YXMgdXBkYXRlZCBwcmV2aW91c2x5LlxuICAgIC8vIEV4YW1wbGU6IEFuZ3VsYXIgb2ZmaWNpYWwgcGFja2FnZXMgYXJlIHR5cGljYWxseSB1cGRhdGVkIHByaW9yIHRvIE5HUlggZXRjLi4uXG4gICAgLy8gVGhlcmVmb3JlLCB3ZSBvbmx5IHVwZGF0ZSB0byB0aGUgbGF0ZXN0IHBhdGNoIHZlcnNpb24gb2YgdGhlIGluc3RhbGxlZCBtYWpvciB2ZXJzaW9uIG9mIHRoZSBBbmd1bGFyIENMSS5cblxuICAgIC8vIFRoaXMgaXMgaW1wb3J0YW50IGJlY2F1c2Ugd2UgbWlnaHQgZW5kIHVwIGluIGEgc2NlbmFyaW8gd2hlcmUgbG9jYWxseSBBbmd1bGFyIHYxMiBpcyBpbnN0YWxsZWQsIHVwZGF0aW5nIE5HUlggZnJvbSAxMSB0byAxMi5cbiAgICAvLyBXZSBlbmQgdXAgdXNpbmcgQW5ndWxhciBDbEkgdjEzIHRvIHJ1biB0aGUgbWlncmF0aW9ucyBpZiB3ZSBydW4gdGhlIG1pZ3JhdGlvbnMgdXNpbmcgdGhlIENMSSBpbnN0YWxsZWQgbWFqb3IgdmVyc2lvbiArIDEgbG9naWMuXG4gICAgcmV0dXJuIFZFUlNJT04ubWFqb3I7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJ1blRlbXBCaW5hcnkocGFja2FnZU5hbWU6IHN0cmluZywgYXJnczogc3RyaW5nW10gPSBbXSk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBzdWNjZXNzLCB0ZW1wTm9kZU1vZHVsZXMgfSA9IGF3YWl0IHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci5pbnN0YWxsVGVtcChwYWNrYWdlTmFtZSk7XG4gICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgdmVyc2lvbi90YWcgZXRjLi4uIGZyb20gcGFja2FnZSBuYW1lXG4gICAgLy8gRXg6IEBhbmd1bGFyL2NsaUBsYXRlc3QgLT4gQGFuZ3VsYXIvY2xpXG4gICAgY29uc3QgcGFja2FnZU5hbWVOb1ZlcnNpb24gPSBwYWNrYWdlTmFtZS5zdWJzdHJpbmcoMCwgcGFja2FnZU5hbWUubGFzdEluZGV4T2YoJ0AnKSk7XG4gICAgY29uc3QgcGtnTG9jYXRpb24gPSBqb2luKHRlbXBOb2RlTW9kdWxlcywgcGFja2FnZU5hbWVOb1ZlcnNpb24pO1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IGpvaW4ocGtnTG9jYXRpb24sICdwYWNrYWdlLmpzb24nKTtcblxuICAgIC8vIEdldCBhIGJpbmFyeSBsb2NhdGlvbiBmb3IgdGhpcyBwYWNrYWdlXG4gICAgbGV0IGJpblBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBpZiAoZXhpc3RzU3luYyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoLCAndXRmLTgnKTtcbiAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgIGNvbnN0IHsgYmluID0ge30gfSA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgICAgIGNvbnN0IGJpbktleXMgPSBPYmplY3Qua2V5cyhiaW4pO1xuXG4gICAgICAgIGlmIChiaW5LZXlzLmxlbmd0aCkge1xuICAgICAgICAgIGJpblBhdGggPSByZXNvbHZlKHBrZ0xvY2F0aW9uLCBiaW5bYmluS2V5c1swXV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFiaW5QYXRoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBsb2NhdGUgYmluIGZvciB0ZW1wb3JhcnkgcGFja2FnZTogJHtwYWNrYWdlTmFtZU5vVmVyc2lvbn0uYCk7XG4gICAgfVxuXG4gICAgY29uc3QgeyBzdGF0dXMsIGVycm9yIH0gPSBzcGF3blN5bmMocHJvY2Vzcy5leGVjUGF0aCwgW2JpblBhdGgsIC4uLmFyZ3NdLCB7XG4gICAgICBzdGRpbzogJ2luaGVyaXQnLFxuICAgICAgZW52OiB7XG4gICAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgICBOR19ESVNBQkxFX1ZFUlNJT05fQ0hFQ0s6ICd0cnVlJyxcbiAgICAgICAgTkdfQ0xJX0FOQUxZVElDUzogJ2ZhbHNlJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBpZiAoc3RhdHVzID09PSBudWxsICYmIGVycm9yKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdHVzID8/IDA7XG4gIH1cblxuICBwcml2YXRlIHBhY2thZ2VNYW5hZ2VyRm9yY2UodmVyYm9zZTogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIC8vIG5wbSA3KyBjYW4gZmFpbCBkdWUgdG8gaXQgaW5jb3JyZWN0bHkgcmVzb2x2aW5nIHBlZXIgZGVwZW5kZW5jaWVzIHRoYXQgaGF2ZSB2YWxpZCBTZW1WZXJcbiAgICAvLyByYW5nZXMgZHVyaW5nIGFuIHVwZGF0ZS4gVXBkYXRlIHdpbGwgc2V0IGNvcnJlY3QgdmVyc2lvbnMgb2YgZGVwZW5kZW5jaWVzIHdpdGhpbiB0aGVcbiAgICAvLyBwYWNrYWdlLmpzb24gZmlsZS4gVGhlIGZvcmNlIG9wdGlvbiBpcyBzZXQgdG8gd29ya2Fyb3VuZCB0aGVzZSBlcnJvcnMuXG4gICAgLy8gRXhhbXBsZSBlcnJvcjpcbiAgICAvLyBucG0gRVJSISBDb25mbGljdGluZyBwZWVyIGRlcGVuZGVuY3k6IEBhbmd1bGFyL2NvbXBpbGVyLWNsaUAxNC4wLjAtcmMuMFxuICAgIC8vIG5wbSBFUlIhIG5vZGVfbW9kdWxlcy9AYW5ndWxhci9jb21waWxlci1jbGlcbiAgICAvLyBucG0gRVJSISAgIHBlZXIgQGFuZ3VsYXIvY29tcGlsZXItY2xpQFwiXjE0LjAuMCB8fCBeMTQuMC4wLXJjXCIgZnJvbSBAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhckAxNC4wLjAtcmMuMFxuICAgIC8vIG5wbSBFUlIhICAgbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyXG4gICAgLy8gbnBtIEVSUiEgICAgIGRldiBAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhckBcIn4xNC4wLjAtcmMuMFwiIGZyb20gdGhlIHJvb3QgcHJvamVjdFxuICAgIGlmIChcbiAgICAgIHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci5uYW1lID09PSBQYWNrYWdlTWFuYWdlci5OcG0gJiZcbiAgICAgIHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci52ZXJzaW9uICYmXG4gICAgICBzZW12ZXIuZ3RlKHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci52ZXJzaW9uLCAnNy4wLjAnKVxuICAgICkge1xuICAgICAgaWYgKHZlcmJvc2UpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKFxuICAgICAgICAgICdOUE0gNysgZGV0ZWN0ZWQgLS0gZW5hYmxpbmcgZm9yY2Ugb3B0aW9uIGZvciBwYWNrYWdlIGluc3RhbGxhdGlvbicsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIHdvcmtpbmcgZGlyZWN0b3J5IGhhcyBHaXQgY2hhbmdlcyB0byBjb21taXQuXG4gKi9cbmZ1bmN0aW9uIGhhc0NoYW5nZXNUb0NvbW1pdCgpOiBib29sZWFuIHtcbiAgLy8gTGlzdCBhbGwgbW9kaWZpZWQgZmlsZXMgbm90IGNvdmVyZWQgYnkgLmdpdGlnbm9yZS5cbiAgLy8gSWYgYW55IGZpbGVzIGFyZSByZXR1cm5lZCwgdGhlbiB0aGVyZSBtdXN0IGJlIHNvbWV0aGluZyB0byBjb21taXQuXG5cbiAgcmV0dXJuIGV4ZWNTeW5jKCdnaXQgbHMtZmlsZXMgLW0gLWQgLW8gLS1leGNsdWRlLXN0YW5kYXJkJykudG9TdHJpbmcoKSAhPT0gJyc7XG59XG5cbi8qKlxuICogUHJlY29uZGl0aW9uOiBNdXN0IGhhdmUgcGVuZGluZyBjaGFuZ2VzIHRvIGNvbW1pdCwgdGhleSBkbyBub3QgbmVlZCB0byBiZSBzdGFnZWQuXG4gKiBQb3N0Y29uZGl0aW9uOiBUaGUgR2l0IHdvcmtpbmcgdHJlZSBpcyBjb21taXR0ZWQgYW5kIHRoZSByZXBvIGlzIGNsZWFuLlxuICogQHBhcmFtIG1lc3NhZ2UgVGhlIGNvbW1pdCBtZXNzYWdlIHRvIHVzZS5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQ29tbWl0KG1lc3NhZ2U6IHN0cmluZykge1xuICAvLyBTdGFnZSBlbnRpcmUgd29ya2luZyB0cmVlIGZvciBjb21taXQuXG4gIGV4ZWNTeW5jKCdnaXQgYWRkIC1BJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pO1xuXG4gIC8vIENvbW1pdCB3aXRoIHRoZSBtZXNzYWdlIHBhc3NlZCB2aWEgc3RkaW4gdG8gYXZvaWQgYmFzaCBlc2NhcGluZyBpc3N1ZXMuXG4gIGV4ZWNTeW5jKCdnaXQgY29tbWl0IC0tbm8tdmVyaWZ5IC1GIC0nLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScsIGlucHV0OiBtZXNzYWdlIH0pO1xufVxuXG4vKipcbiAqIEByZXR1cm4gVGhlIEdpdCBTSEEgaGFzaCBvZiB0aGUgSEVBRCBjb21taXQuIFJldHVybnMgbnVsbCBpZiB1bmFibGUgdG8gcmV0cmlldmUgdGhlIGhhc2guXG4gKi9cbmZ1bmN0aW9uIGZpbmRDdXJyZW50R2l0U2hhKCk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBleGVjU3luYygnZ2l0IHJldi1wYXJzZSBIRUFEJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pLnRyaW0oKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U2hvcnRIYXNoKGNvbW1pdEhhc2g6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBjb21taXRIYXNoLnNsaWNlKDAsIDkpO1xufVxuXG5mdW5jdGlvbiBjb2VyY2VWZXJzaW9uTnVtYmVyKHZlcnNpb246IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmICghdmVyc2lvbikge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAoIS9eXFxkezEsMzB9XFwuXFxkezEsMzB9XFwuXFxkezEsMzB9Ly50ZXN0KHZlcnNpb24pKSB7XG4gICAgY29uc3QgbWF0Y2ggPSB2ZXJzaW9uLm1hdGNoKC9eXFxkezEsMzB9KFxcLlxcZHsxLDMwfSkqLyk7XG5cbiAgICBpZiAoIW1hdGNoKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICghbWF0Y2hbMV0pIHtcbiAgICAgIHZlcnNpb24gPSB2ZXJzaW9uLnN1YnN0cmluZygwLCBtYXRjaFswXS5sZW5ndGgpICsgJy4wLjAnICsgdmVyc2lvbi5zdWJzdHJpbmcobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICB9IGVsc2UgaWYgKCFtYXRjaFsyXSkge1xuICAgICAgdmVyc2lvbiA9IHZlcnNpb24uc3Vic3RyaW5nKDAsIG1hdGNoWzBdLmxlbmd0aCkgKyAnLjAnICsgdmVyc2lvbi5zdWJzdHJpbmcobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gc2VtdmVyLnZhbGlkKHZlcnNpb24pID8/IHVuZGVmaW5lZDtcbn1cbiJdfQ==