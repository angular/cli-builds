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
const prompt_1 = require("../../utilities/prompt");
const tty_1 = require("../../utilities/tty");
const version_1 = require("../../utilities/version");
const ANGULAR_PACKAGES_REGEXP = /^@(?:angular|nguniversal)\//;
const UPDATE_SCHEMATIC_COLLECTION = path.join(__dirname, 'schematic/collection.json');
class UpdateCommandModule extends command_module_1.CommandModule {
    scope = command_module_1.CommandScope.In;
    shouldReportAnalytics = false;
    command = 'update [packages..]';
    describe = 'Updates your workspace and its dependencies. See https://update.angular.io/.';
    longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
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
            description: 'The name of the migration to run. Only available when a single package is updated.',
            type: 'string',
            conflicts: ['to', 'from'],
        })
            .option('from', {
            description: 'Version from which to migrate from. ' +
                `Only available when a single package is updated, and only with 'migrate-only'.`,
            type: 'string',
            implies: ['migrate-only'],
            conflicts: ['name'],
        })
            .option('to', {
            describe: 'Version up to which to apply migrations. Only available when a single package is updated, ' +
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
            .middleware((argv) => {
            if (argv.name) {
                argv['migrate-only'] = true;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return argv;
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
        const requiredMigrations = [];
        const optionalMigrations = [];
        for (const name of collection.listSchematicNames()) {
            const schematic = workflow.engine.createSchematic(name, collection);
            const description = schematic.description;
            description.version = coerceVersionNumber(description.version);
            if (!description.version) {
                continue;
            }
            if (semver.satisfies(description.version, migrationRange, { includePrerelease: true })) {
                (description.optional ? optionalMigrations : requiredMigrations).push(description);
            }
        }
        if (requiredMigrations.length === 0 && optionalMigrations.length === 0) {
            return 0;
        }
        // Required migrations
        if (requiredMigrations.length) {
            this.context.logger.info(color_1.colors.cyan(`** Executing migrations of package '${packageName}' **\n`));
            requiredMigrations.sort((a, b) => semver.compare(a.version, b.version) || a.name.localeCompare(b.name));
            const result = await this.executePackageMigrations(workflow, requiredMigrations, packageName, commit);
            if (result === 1) {
                return 1;
            }
        }
        // Optional migrations
        if (optionalMigrations.length) {
            this.context.logger.info(color_1.colors.magenta(`** Optional migrations of package '${packageName}' **\n`));
            optionalMigrations.sort((a, b) => semver.compare(a.version, b.version) || a.name.localeCompare(b.name));
            const migrationsToRun = await this.getOptionalMigrationsToRun(optionalMigrations, packageName);
            if (migrationsToRun?.length) {
                return this.executePackageMigrations(workflow, migrationsToRun, packageName, commit);
            }
        }
        return 0;
    }
    async executePackageMigrations(workflow, migrations, packageName, commit = false) {
        const { logger } = this.context;
        for (const migration of migrations) {
            const { title, description } = getMigrationTitleAndDescription(migration);
            logger.info(color_1.colors.cyan(color_1.colors.symbols.pointer) + ' ' + color_1.colors.bold(title));
            if (description) {
                logger.info('  ' + description);
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
    async getOptionalMigrationsToRun(optionalMigrations, packageName) {
        const { logger } = this.context;
        const numberOfMigrations = optionalMigrations.length;
        logger.info(`This package has ${numberOfMigrations} optional migration${numberOfMigrations > 1 ? 's' : ''} that can be executed.`);
        logger.info(''); // Extra trailing newline.
        if (!(0, tty_1.isTTY)()) {
            for (const migration of optionalMigrations) {
                const { title } = getMigrationTitleAndDescription(migration);
                logger.info(color_1.colors.cyan(color_1.colors.symbols.pointer) + ' ' + color_1.colors.bold(title));
                logger.info(color_1.colors.gray(`  ng update ${packageName} --name ${migration.name}`));
                logger.info(''); // Extra trailing newline.
            }
            return undefined;
        }
        const answer = await (0, prompt_1.askChoices)(`Select the migrations that you'd like to run`, optionalMigrations.map((migration) => {
            const { title } = getMigrationTitleAndDescription(migration);
            return {
                name: title,
                value: migration.name,
            };
        }), null);
        logger.info(''); // Extra trailing newline.
        return optionalMigrations.filter(({ name }) => answer?.includes(name));
    }
}
exports.default = UpdateCommandModule;
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
function getMigrationTitleAndDescription(migration) {
    const [title, ...description] = migration.description.split('. ');
    return {
        title: title.endsWith('.') ? title : title + '.',
        description: description.join('.\n  '),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3VwZGF0ZS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILDJEQUFpRztBQUNqRyw0REFJMEM7QUFDMUMsaURBQXNFO0FBQ3RFLDJCQUFnRDtBQUNoRCxtQ0FBdUM7QUFDdkMsc0VBQWtDO0FBQ2xDLDBFQUE2QztBQUM3QywyQ0FBNkI7QUFDN0IsK0JBQXFDO0FBQ3JDLCtDQUFpQztBQUVqQywyRUFBc0U7QUFDdEUseUVBSzhDO0FBQzlDLGlHQUE0RjtBQUM1RiwyRkFBeUY7QUFDekYsaURBQStDO0FBQy9DLDZFQUEwRTtBQUMxRSxpREFBc0Q7QUFDdEQsdURBQStEO0FBQy9ELHVFQUswQztBQUMxQywrREFLc0M7QUFDdEMsbURBQW9EO0FBQ3BELDZDQUE0QztBQUM1QyxxREFBa0Q7QUF5QmxELE1BQU0sdUJBQXVCLEdBQUcsNkJBQTZCLENBQUM7QUFDOUQsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO0FBRXRGLE1BQXFCLG1CQUFvQixTQUFRLDhCQUFnQztJQUN0RSxLQUFLLEdBQUcsNkJBQVksQ0FBQyxFQUFFLENBQUM7SUFDZCxxQkFBcUIsR0FBRyxLQUFLLENBQUM7SUFFakQsT0FBTyxHQUFHLHFCQUFxQixDQUFDO0lBQ2hDLFFBQVEsR0FBRyw4RUFBOEUsQ0FBQztJQUMxRixtQkFBbUIsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQUU3RCxPQUFPLENBQUMsVUFBZ0I7UUFDdEIsT0FBTyxVQUFVO2FBQ2QsVUFBVSxDQUFDLFVBQVUsRUFBRTtZQUN0QixXQUFXLEVBQUUsb0NBQW9D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QUFDLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDL0Y7YUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BCLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQzdGO2FBQU07WUFDTCxPQUFPLFNBQVMsQ0FBQztTQUNsQjtLQUNGO0lBRUQsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLFNBQVMsQ0FBQztBQUM1QyxDQUFDO0FBRUQsU0FBUywrQkFBK0IsQ0FBQyxTQUF3QztJQUkvRSxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsV0FBVyxDQUFDLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFbEUsT0FBTztRQUNMLEtBQUssRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxHQUFHO1FBQ2hELFdBQVcsRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztLQUN2QyxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBTY2hlbWF0aWNEZXNjcmlwdGlvbiwgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQge1xuICBGaWxlU3lzdGVtQ29sbGVjdGlvbkRlc2NyaXB0aW9uLFxuICBGaWxlU3lzdGVtU2NoZW1hdGljRGVzY3JpcHRpb24sXG4gIE5vZGVXb3JrZmxvdyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHsgU3Bhd25TeW5jUmV0dXJucywgZXhlY1N5bmMsIHNwYXduU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcHJvbWlzZXMgYXMgZnMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBjcmVhdGVSZXF1aXJlIH0gZnJvbSAnbW9kdWxlJztcbmltcG9ydCBucGEgZnJvbSAnbnBtLXBhY2thZ2UtYXJnJztcbmltcG9ydCBwaWNrTWFuaWZlc3QgZnJvbSAnbnBtLXBpY2stbWFuaWZlc3QnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vLi4vLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGUsXG4gIENvbW1hbmRNb2R1bGVFcnJvcixcbiAgQ29tbWFuZFNjb3BlLFxuICBPcHRpb25zLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgU2NoZW1hdGljRW5naW5lSG9zdCB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvc2NoZW1hdGljLWVuZ2luZS1ob3N0JztcbmltcG9ydCB7IHN1YnNjcmliZVRvV29ya2Zsb3cgfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvdXRpbGl0aWVzL3NjaGVtYXRpYy13b3JrZmxvdyc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgZGlzYWJsZVZlcnNpb25DaGVjayB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IGFzc2VydElzRXJyb3IgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvZXJyb3InO1xuaW1wb3J0IHsgd3JpdGVFcnJvclRvTG9nRmlsZSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9sb2ctZmlsZSc7XG5pbXBvcnQge1xuICBQYWNrYWdlSWRlbnRpZmllcixcbiAgUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNYW5pZmVzdCxcbiAgZmV0Y2hQYWNrYWdlTWV0YWRhdGEsXG59IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wYWNrYWdlLW1ldGFkYXRhJztcbmltcG9ydCB7XG4gIFBhY2thZ2VUcmVlTm9kZSxcbiAgZmluZFBhY2thZ2VKc29uLFxuICBnZXRQcm9qZWN0RGVwZW5kZW5jaWVzLFxuICByZWFkUGFja2FnZUpzb24sXG59IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wYWNrYWdlLXRyZWUnO1xuaW1wb3J0IHsgYXNrQ2hvaWNlcyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wcm9tcHQnO1xuaW1wb3J0IHsgaXNUVFkgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvdHR5JztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvdmVyc2lvbic7XG5cbmludGVyZmFjZSBVcGRhdGVDb21tYW5kQXJncyB7XG4gIHBhY2thZ2VzPzogc3RyaW5nW107XG4gIGZvcmNlOiBib29sZWFuO1xuICBuZXh0OiBib29sZWFuO1xuICAnbWlncmF0ZS1vbmx5Jz86IGJvb2xlYW47XG4gIG5hbWU/OiBzdHJpbmc7XG4gIGZyb20/OiBzdHJpbmc7XG4gIHRvPzogc3RyaW5nO1xuICAnYWxsb3ctZGlydHknOiBib29sZWFuO1xuICB2ZXJib3NlOiBib29sZWFuO1xuICAnY3JlYXRlLWNvbW1pdHMnOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgTWlncmF0aW9uU2NoZW1hdGljRGVzY3JpcHRpb25cbiAgZXh0ZW5kcyBTY2hlbWF0aWNEZXNjcmlwdGlvbjxGaWxlU3lzdGVtQ29sbGVjdGlvbkRlc2NyaXB0aW9uLCBGaWxlU3lzdGVtU2NoZW1hdGljRGVzY3JpcHRpb24+IHtcbiAgdmVyc2lvbj86IHN0cmluZztcbiAgb3B0aW9uYWw/OiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgTWlncmF0aW9uU2NoZW1hdGljRGVzY3JpcHRpb25XaXRoVmVyc2lvbiBleHRlbmRzIE1pZ3JhdGlvblNjaGVtYXRpY0Rlc2NyaXB0aW9uIHtcbiAgdmVyc2lvbjogc3RyaW5nO1xufVxuXG5jb25zdCBBTkdVTEFSX1BBQ0tBR0VTX1JFR0VYUCA9IC9eQCg/OmFuZ3VsYXJ8bmd1bml2ZXJzYWwpXFwvLztcbmNvbnN0IFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTiA9IHBhdGguam9pbihfX2Rpcm5hbWUsICdzY2hlbWF0aWMvY29sbGVjdGlvbi5qc29uJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFVwZGF0ZUNvbW1hbmRNb2R1bGUgZXh0ZW5kcyBDb21tYW5kTW9kdWxlPFVwZGF0ZUNvbW1hbmRBcmdzPiB7XG4gIG92ZXJyaWRlIHNjb3BlID0gQ29tbWFuZFNjb3BlLkluO1xuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgc2hvdWxkUmVwb3J0QW5hbHl0aWNzID0gZmFsc2U7XG5cbiAgY29tbWFuZCA9ICd1cGRhdGUgW3BhY2thZ2VzLi5dJztcbiAgZGVzY3JpYmUgPSAnVXBkYXRlcyB5b3VyIHdvcmtzcGFjZSBhbmQgaXRzIGRlcGVuZGVuY2llcy4gU2VlIGh0dHBzOi8vdXBkYXRlLmFuZ3VsYXIuaW8vLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSBqb2luKF9fZGlybmFtZSwgJ2xvbmctZGVzY3JpcHRpb24ubWQnKTtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2PFVwZGF0ZUNvbW1hbmRBcmdzPiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3NcbiAgICAgIC5wb3NpdGlvbmFsKCdwYWNrYWdlcycsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgbmFtZXMgb2YgcGFja2FnZShzKSB0byB1cGRhdGUuJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGFycmF5OiB0cnVlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2ZvcmNlJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ0lnbm9yZSBwZWVyIGRlcGVuZGVuY3kgdmVyc2lvbiBtaXNtYXRjaGVzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignbmV4dCcsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdVc2UgdGhlIHByZXJlbGVhc2UgdmVyc2lvbiwgaW5jbHVkaW5nIGJldGEgYW5kIFJDcy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ21pZ3JhdGUtb25seScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdPbmx5IHBlcmZvcm0gYSBtaWdyYXRpb24sIGRvIG5vdCB1cGRhdGUgdGhlIGluc3RhbGxlZCB2ZXJzaW9uLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCduYW1lJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAnVGhlIG5hbWUgb2YgdGhlIG1pZ3JhdGlvbiB0byBydW4uIE9ubHkgYXZhaWxhYmxlIHdoZW4gYSBzaW5nbGUgcGFja2FnZSBpcyB1cGRhdGVkLicsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBjb25mbGljdHM6IFsndG8nLCAnZnJvbSddLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2Zyb20nLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICdWZXJzaW9uIGZyb20gd2hpY2ggdG8gbWlncmF0ZSBmcm9tLiAnICtcbiAgICAgICAgICBgT25seSBhdmFpbGFibGUgd2hlbiBhIHNpbmdsZSBwYWNrYWdlIGlzIHVwZGF0ZWQsIGFuZCBvbmx5IHdpdGggJ21pZ3JhdGUtb25seScuYCxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGltcGxpZXM6IFsnbWlncmF0ZS1vbmx5J10sXG4gICAgICAgIGNvbmZsaWN0czogWyduYW1lJ10sXG4gICAgICB9KVxuICAgICAgLm9wdGlvbigndG8nLCB7XG4gICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICdWZXJzaW9uIHVwIHRvIHdoaWNoIHRvIGFwcGx5IG1pZ3JhdGlvbnMuIE9ubHkgYXZhaWxhYmxlIHdoZW4gYSBzaW5nbGUgcGFja2FnZSBpcyB1cGRhdGVkLCAnICtcbiAgICAgICAgICBgYW5kIG9ubHkgd2l0aCAnbWlncmF0ZS1vbmx5JyBvcHRpb24uIFJlcXVpcmVzICdmcm9tJyB0byBiZSBzcGVjaWZpZWQuIERlZmF1bHQgdG8gdGhlIGluc3RhbGxlZCB2ZXJzaW9uIGRldGVjdGVkLmAsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBpbXBsaWVzOiBbJ2Zyb20nLCAnbWlncmF0ZS1vbmx5J10sXG4gICAgICAgIGNvbmZsaWN0czogWyduYW1lJ10sXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignYWxsb3ctZGlydHknLCB7XG4gICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICdXaGV0aGVyIHRvIGFsbG93IHVwZGF0aW5nIHdoZW4gdGhlIHJlcG9zaXRvcnkgY29udGFpbnMgbW9kaWZpZWQgb3IgdW50cmFja2VkIGZpbGVzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbigndmVyYm9zZScsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdEaXNwbGF5IGFkZGl0aW9uYWwgZGV0YWlscyBhYm91dCBpbnRlcm5hbCBvcGVyYXRpb25zIGR1cmluZyBleGVjdXRpb24uJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdjcmVhdGUtY29tbWl0cycsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdDcmVhdGUgc291cmNlIGNvbnRyb2wgY29tbWl0cyBmb3IgdXBkYXRlcyBhbmQgbWlncmF0aW9ucy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGFsaWFzOiBbJ0MnXSxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm1pZGRsZXdhcmUoKGFyZ3YpID0+IHtcbiAgICAgICAgaWYgKGFyZ3YubmFtZSkge1xuICAgICAgICAgIGFyZ3ZbJ21pZ3JhdGUtb25seSddID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAgIHJldHVybiBhcmd2IGFzIGFueTtcbiAgICAgIH0pXG4gICAgICAuY2hlY2soKHsgcGFja2FnZXMsICdhbGxvdy1kaXJ0eSc6IGFsbG93RGlydHksICdtaWdyYXRlLW9ubHknOiBtaWdyYXRlT25seSB9KSA9PiB7XG4gICAgICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICAgICAgLy8gVGhpcyBhbGxvd3MgdGhlIHVzZXIgdG8gZWFzaWx5IHJlc2V0IGFueSBjaGFuZ2VzIGZyb20gdGhlIHVwZGF0ZS5cbiAgICAgICAgaWYgKHBhY2thZ2VzPy5sZW5ndGggJiYgIXRoaXMuY2hlY2tDbGVhbkdpdCgpKSB7XG4gICAgICAgICAgaWYgKGFsbG93RGlydHkpIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICAnUmVwb3NpdG9yeSBpcyBub3QgY2xlYW4uIFVwZGF0ZSBjaGFuZ2VzIHdpbGwgYmUgbWl4ZWQgd2l0aCBwcmUtZXhpc3RpbmcgY2hhbmdlcy4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihcbiAgICAgICAgICAgICAgJ1JlcG9zaXRvcnkgaXMgbm90IGNsZWFuLiBQbGVhc2UgY29tbWl0IG9yIHN0YXNoIGFueSBjaGFuZ2VzIGJlZm9yZSB1cGRhdGluZy4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWlncmF0ZU9ubHkpIHtcbiAgICAgICAgICBpZiAocGFja2FnZXM/Lmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihcbiAgICAgICAgICAgICAgYEEgc2luZ2xlIHBhY2thZ2UgbXVzdCBiZSBzcGVjaWZpZWQgd2hlbiB1c2luZyB0aGUgJ21pZ3JhdGUtb25seScgb3B0aW9uLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5zdHJpY3QoKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBPcHRpb25zPFVwZGF0ZUNvbW1hbmRBcmdzPik6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyLCBwYWNrYWdlTWFuYWdlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgaW5zdGFsbGVkIENMSSB2ZXJzaW9uIGlzIG9sZGVyIHRoYW4gdGhlIGxhdGVzdCBjb21wYXRpYmxlIHZlcnNpb24uXG4gICAgLy8gU2tpcCB3aGVuIHJ1bm5pbmcgYG5nIHVwZGF0ZWAgd2l0aG91dCBhIHBhY2thZ2UgbmFtZSBhcyB0aGlzIHdpbGwgbm90IHRyaWdnZXIgYW4gYWN0dWFsIHVwZGF0ZS5cbiAgICBpZiAoIWRpc2FibGVWZXJzaW9uQ2hlY2sgJiYgb3B0aW9ucy5wYWNrYWdlcz8ubGVuZ3RoKSB7XG4gICAgICBjb25zdCBjbGlWZXJzaW9uVG9JbnN0YWxsID0gYXdhaXQgdGhpcy5jaGVja0NMSVZlcnNpb24oXG4gICAgICAgIG9wdGlvbnMucGFja2FnZXMsXG4gICAgICAgIG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgb3B0aW9ucy5uZXh0LFxuICAgICAgKTtcblxuICAgICAgaWYgKGNsaVZlcnNpb25Ub0luc3RhbGwpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgJ1RoZSBpbnN0YWxsZWQgQW5ndWxhciBDTEkgdmVyc2lvbiBpcyBvdXRkYXRlZC5cXG4nICtcbiAgICAgICAgICAgIGBJbnN0YWxsaW5nIGEgdGVtcG9yYXJ5IEFuZ3VsYXIgQ0xJIHZlcnNpb25lZCAke2NsaVZlcnNpb25Ub0luc3RhbGx9IHRvIHBlcmZvcm0gdGhlIHVwZGF0ZS5gLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiB0aGlzLnJ1blRlbXBCaW5hcnkoYEBhbmd1bGFyL2NsaUAke2NsaVZlcnNpb25Ub0luc3RhbGx9YCwgcHJvY2Vzcy5hcmd2LnNsaWNlKDIpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlczogUGFja2FnZUlkZW50aWZpZXJbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgcmVxdWVzdCBvZiBvcHRpb25zLnBhY2thZ2VzID8/IFtdKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYWNrYWdlSWRlbnRpZmllciA9IG5wYShyZXF1ZXN0KTtcblxuICAgICAgICAvLyBvbmx5IHJlZ2lzdHJ5IGlkZW50aWZpZXJzIGFyZSBzdXBwb3J0ZWRcbiAgICAgICAgaWYgKCFwYWNrYWdlSWRlbnRpZmllci5yZWdpc3RyeSkge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcihgUGFja2FnZSAnJHtyZXF1ZXN0fScgaXMgbm90IGEgcmVnaXN0cnkgcGFja2FnZSBpZGVudGlmZXIuYCk7XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwYWNrYWdlcy5zb21lKCh2KSA9PiB2Lm5hbWUgPT09IHBhY2thZ2VJZGVudGlmaWVyLm5hbWUpKSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKGBEdXBsaWNhdGUgcGFja2FnZSAnJHtwYWNrYWdlSWRlbnRpZmllci5uYW1lfScgc3BlY2lmaWVkLmApO1xuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5taWdyYXRlT25seSAmJiBwYWNrYWdlSWRlbnRpZmllci5yYXdTcGVjICE9PSAnKicpIHtcbiAgICAgICAgICBsb2dnZXIud2FybignUGFja2FnZSBzcGVjaWZpZXIgaGFzIG5vIGVmZmVjdCB3aGVuIHVzaW5nIFwibWlncmF0ZS1vbmx5XCIgb3B0aW9uLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgbmV4dCBvcHRpb24gaXMgdXNlZCBhbmQgbm8gc3BlY2lmaWVyIHN1cHBsaWVkLCB1c2UgbmV4dCB0YWdcbiAgICAgICAgaWYgKG9wdGlvbnMubmV4dCAmJiBwYWNrYWdlSWRlbnRpZmllci5yYXdTcGVjID09PSAnKicpIHtcbiAgICAgICAgICBwYWNrYWdlSWRlbnRpZmllci5mZXRjaFNwZWMgPSAnbmV4dCc7XG4gICAgICAgIH1cblxuICAgICAgICBwYWNrYWdlcy5wdXNoKHBhY2thZ2VJZGVudGlmaWVyIGFzIFBhY2thZ2VJZGVudGlmaWVyKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGUubWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oYFVzaW5nIHBhY2thZ2UgbWFuYWdlcjogJHtjb2xvcnMuZ3JleShwYWNrYWdlTWFuYWdlci5uYW1lKX1gKTtcbiAgICBsb2dnZXIuaW5mbygnQ29sbGVjdGluZyBpbnN0YWxsZWQgZGVwZW5kZW5jaWVzLi4uJyk7XG5cbiAgICBjb25zdCByb290RGVwZW5kZW5jaWVzID0gYXdhaXQgZ2V0UHJvamVjdERlcGVuZGVuY2llcyh0aGlzLmNvbnRleHQucm9vdCk7XG4gICAgbG9nZ2VyLmluZm8oYEZvdW5kICR7cm9vdERlcGVuZGVuY2llcy5zaXplfSBkZXBlbmRlbmNpZXMuYCk7XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IG5ldyBOb2RlV29ya2Zsb3codGhpcy5jb250ZXh0LnJvb3QsIHtcbiAgICAgIHBhY2thZ2VNYW5hZ2VyOiBwYWNrYWdlTWFuYWdlci5uYW1lLFxuICAgICAgcGFja2FnZU1hbmFnZXJGb3JjZTogdGhpcy5wYWNrYWdlTWFuYWdlckZvcmNlKG9wdGlvbnMudmVyYm9zZSksXG4gICAgICAvLyBfX2Rpcm5hbWUgLT4gZmF2b3IgQHNjaGVtYXRpY3MvdXBkYXRlIGZyb20gdGhpcyBwYWNrYWdlXG4gICAgICAvLyBPdGhlcndpc2UsIHVzZSBwYWNrYWdlcyBmcm9tIHRoZSBhY3RpdmUgd29ya3NwYWNlIChtaWdyYXRpb25zKVxuICAgICAgcmVzb2x2ZVBhdGhzOiBbX19kaXJuYW1lLCB0aGlzLmNvbnRleHQucm9vdF0sXG4gICAgICBzY2hlbWFWYWxpZGF0aW9uOiB0cnVlLFxuICAgICAgZW5naW5lSG9zdENyZWF0b3I6IChvcHRpb25zKSA9PiBuZXcgU2NoZW1hdGljRW5naW5lSG9zdChvcHRpb25zLnJlc29sdmVQYXRocyksXG4gICAgfSk7XG5cbiAgICBpZiAocGFja2FnZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBTaG93IHN0YXR1c1xuICAgICAgY29uc3QgeyBzdWNjZXNzIH0gPSBhd2FpdCB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgICAgIHdvcmtmbG93LFxuICAgICAgICBVUERBVEVfU0NIRU1BVElDX0NPTExFQ1RJT04sXG4gICAgICAgICd1cGRhdGUnLFxuICAgICAgICB7XG4gICAgICAgICAgZm9yY2U6IG9wdGlvbnMuZm9yY2UsXG4gICAgICAgICAgbmV4dDogb3B0aW9ucy5uZXh0LFxuICAgICAgICAgIHZlcmJvc2U6IG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgICBwYWNrYWdlTWFuYWdlcjogcGFja2FnZU1hbmFnZXIubmFtZSxcbiAgICAgICAgICBwYWNrYWdlczogW10sXG4gICAgICAgIH0sXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gc3VjY2VzcyA/IDAgOiAxO1xuICAgIH1cblxuICAgIHJldHVybiBvcHRpb25zLm1pZ3JhdGVPbmx5XG4gICAgICA/IHRoaXMubWlncmF0ZU9ubHkod29ya2Zsb3csIChvcHRpb25zLnBhY2thZ2VzID8/IFtdKVswXSwgcm9vdERlcGVuZGVuY2llcywgb3B0aW9ucylcbiAgICAgIDogdGhpcy51cGRhdGVQYWNrYWdlc0FuZE1pZ3JhdGUod29ya2Zsb3csIHJvb3REZXBlbmRlbmNpZXMsIG9wdGlvbnMsIHBhY2thZ2VzKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIGNvbGxlY3Rpb246IHN0cmluZyxcbiAgICBzY2hlbWF0aWM6IHN0cmluZyxcbiAgICBvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9LFxuICApOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgZmlsZXM6IFNldDxzdHJpbmc+IH0+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHdvcmtmbG93U3Vic2NyaXB0aW9uID0gc3Vic2NyaWJlVG9Xb3JrZmxvdyh3b3JrZmxvdywgbG9nZ2VyKTtcblxuICAgIC8vIFRPRE86IEFsbG93IHBhc3NpbmcgYSBzY2hlbWF0aWMgaW5zdGFuY2UgZGlyZWN0bHlcbiAgICB0cnkge1xuICAgICAgYXdhaXQgd29ya2Zsb3dcbiAgICAgICAgLmV4ZWN1dGUoe1xuICAgICAgICAgIGNvbGxlY3Rpb24sXG4gICAgICAgICAgc2NoZW1hdGljLFxuICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgbG9nZ2VyLFxuICAgICAgICB9KVxuICAgICAgICAudG9Qcm9taXNlKCk7XG5cbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6ICF3b3JrZmxvd1N1YnNjcmlwdGlvbi5lcnJvciwgZmlsZXM6IHdvcmtmbG93U3Vic2NyaXB0aW9uLmZpbGVzIH07XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbikge1xuICAgICAgICBsb2dnZXIuZXJyb3IoYCR7Y29sb3JzLnN5bWJvbHMuY3Jvc3N9IE1pZ3JhdGlvbiBmYWlsZWQuIFNlZSBhYm92ZSBmb3IgZnVydGhlciBkZXRhaWxzLlxcbmApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgY29uc3QgbG9nUGF0aCA9IHdyaXRlRXJyb3JUb0xvZ0ZpbGUoZSk7XG4gICAgICAgIGxvZ2dlci5mYXRhbChcbiAgICAgICAgICBgJHtjb2xvcnMuc3ltYm9scy5jcm9zc30gTWlncmF0aW9uIGZhaWxlZDogJHtlLm1lc3NhZ2V9XFxuYCArXG4gICAgICAgICAgICBgICBTZWUgXCIke2xvZ1BhdGh9XCIgZm9yIGZ1cnRoZXIgZGV0YWlscy5cXG5gLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZmlsZXM6IHdvcmtmbG93U3Vic2NyaXB0aW9uLmZpbGVzIH07XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHdvcmtmbG93U3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIG1pZ3JhdGlvbiB3YXMgcGVyZm9ybWVkIHN1Y2Nlc3NmdWxseS5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZU1pZ3JhdGlvbihcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgY29sbGVjdGlvblBhdGg6IHN0cmluZyxcbiAgICBtaWdyYXRpb25OYW1lOiBzdHJpbmcsXG4gICAgY29tbWl0PzogYm9vbGVhbixcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uUGF0aCk7XG4gICAgY29uc3QgbmFtZSA9IGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKCkuZmluZCgobmFtZSkgPT4gbmFtZSA9PT0gbWlncmF0aW9uTmFtZSk7XG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYENhbm5vdCBmaW5kIG1pZ3JhdGlvbiAnJHttaWdyYXRpb25OYW1lfScgaW4gJyR7cGFja2FnZU5hbWV9Jy5gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oY29sb3JzLmN5YW4oYCoqIEV4ZWN1dGluZyAnJHttaWdyYXRpb25OYW1lfScgb2YgcGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nICoqXFxuYCkpO1xuICAgIGNvbnN0IHNjaGVtYXRpYyA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVTY2hlbWF0aWMobmFtZSwgY29sbGVjdGlvbik7XG5cbiAgICByZXR1cm4gdGhpcy5leGVjdXRlUGFja2FnZU1pZ3JhdGlvbnMod29ya2Zsb3csIFtzY2hlbWF0aWMuZGVzY3JpcHRpb25dLCBwYWNrYWdlTmFtZSwgY29tbWl0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSBtaWdyYXRpb25zIHdlcmUgcGVyZm9ybWVkIHN1Y2Nlc3NmdWxseS5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZU1pZ3JhdGlvbnMoXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIGNvbGxlY3Rpb25QYXRoOiBzdHJpbmcsXG4gICAgZnJvbTogc3RyaW5nLFxuICAgIHRvOiBzdHJpbmcsXG4gICAgY29tbWl0PzogYm9vbGVhbixcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvblBhdGgpO1xuICAgIGNvbnN0IG1pZ3JhdGlvblJhbmdlID0gbmV3IHNlbXZlci5SYW5nZShcbiAgICAgICc+JyArIChzZW12ZXIucHJlcmVsZWFzZShmcm9tKSA/IGZyb20uc3BsaXQoJy0nKVswXSArICctMCcgOiBmcm9tKSArICcgPD0nICsgdG8uc3BsaXQoJy0nKVswXSxcbiAgICApO1xuXG4gICAgY29uc3QgcmVxdWlyZWRNaWdyYXRpb25zOiBNaWdyYXRpb25TY2hlbWF0aWNEZXNjcmlwdGlvbldpdGhWZXJzaW9uW10gPSBbXTtcbiAgICBjb25zdCBvcHRpb25hbE1pZ3JhdGlvbnM6IE1pZ3JhdGlvblNjaGVtYXRpY0Rlc2NyaXB0aW9uV2l0aFZlcnNpb25bXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKCkpIHtcbiAgICAgIGNvbnN0IHNjaGVtYXRpYyA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVTY2hlbWF0aWMobmFtZSwgY29sbGVjdGlvbik7XG4gICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IHNjaGVtYXRpYy5kZXNjcmlwdGlvbiBhcyBNaWdyYXRpb25TY2hlbWF0aWNEZXNjcmlwdGlvbjtcblxuICAgICAgZGVzY3JpcHRpb24udmVyc2lvbiA9IGNvZXJjZVZlcnNpb25OdW1iZXIoZGVzY3JpcHRpb24udmVyc2lvbik7XG4gICAgICBpZiAoIWRlc2NyaXB0aW9uLnZlcnNpb24pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChzZW12ZXIuc2F0aXNmaWVzKGRlc2NyaXB0aW9uLnZlcnNpb24sIG1pZ3JhdGlvblJhbmdlLCB7IGluY2x1ZGVQcmVyZWxlYXNlOiB0cnVlIH0pKSB7XG4gICAgICAgIChkZXNjcmlwdGlvbi5vcHRpb25hbCA/IG9wdGlvbmFsTWlncmF0aW9ucyA6IHJlcXVpcmVkTWlncmF0aW9ucykucHVzaChcbiAgICAgICAgICBkZXNjcmlwdGlvbiBhcyBNaWdyYXRpb25TY2hlbWF0aWNEZXNjcmlwdGlvbldpdGhWZXJzaW9uLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChyZXF1aXJlZE1pZ3JhdGlvbnMubGVuZ3RoID09PSAwICYmIG9wdGlvbmFsTWlncmF0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIC8vIFJlcXVpcmVkIG1pZ3JhdGlvbnNcbiAgICBpZiAocmVxdWlyZWRNaWdyYXRpb25zLmxlbmd0aCkge1xuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKFxuICAgICAgICBjb2xvcnMuY3lhbihgKiogRXhlY3V0aW5nIG1pZ3JhdGlvbnMgb2YgcGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nICoqXFxuYCksXG4gICAgICApO1xuXG4gICAgICByZXF1aXJlZE1pZ3JhdGlvbnMuc29ydChcbiAgICAgICAgKGEsIGIpID0+IHNlbXZlci5jb21wYXJlKGEudmVyc2lvbiwgYi52ZXJzaW9uKSB8fCBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpLFxuICAgICAgKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlUGFja2FnZU1pZ3JhdGlvbnMoXG4gICAgICAgIHdvcmtmbG93LFxuICAgICAgICByZXF1aXJlZE1pZ3JhdGlvbnMsXG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICBjb21taXQsXG4gICAgICApO1xuXG4gICAgICBpZiAocmVzdWx0ID09PSAxKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE9wdGlvbmFsIG1pZ3JhdGlvbnNcbiAgICBpZiAob3B0aW9uYWxNaWdyYXRpb25zLmxlbmd0aCkge1xuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKFxuICAgICAgICBjb2xvcnMubWFnZW50YShgKiogT3B0aW9uYWwgbWlncmF0aW9ucyBvZiBwYWNrYWdlICcke3BhY2thZ2VOYW1lfScgKipcXG5gKSxcbiAgICAgICk7XG5cbiAgICAgIG9wdGlvbmFsTWlncmF0aW9ucy5zb3J0KFxuICAgICAgICAoYSwgYikgPT4gc2VtdmVyLmNvbXBhcmUoYS52ZXJzaW9uLCBiLnZlcnNpb24pIHx8IGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSksXG4gICAgICApO1xuXG4gICAgICBjb25zdCBtaWdyYXRpb25zVG9SdW4gPSBhd2FpdCB0aGlzLmdldE9wdGlvbmFsTWlncmF0aW9uc1RvUnVuKFxuICAgICAgICBvcHRpb25hbE1pZ3JhdGlvbnMsXG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgKTtcblxuICAgICAgaWYgKG1pZ3JhdGlvbnNUb1J1bj8ubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyh3b3JrZmxvdywgbWlncmF0aW9uc1RvUnVuLCBwYWNrYWdlTmFtZSwgY29tbWl0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVBhY2thZ2VNaWdyYXRpb25zKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgbWlncmF0aW9uczogTWlncmF0aW9uU2NoZW1hdGljRGVzY3JpcHRpb25bXSxcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIGNvbW1pdCA9IGZhbHNlLFxuICApOiBQcm9taXNlPDEgfCAwPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBmb3IgKGNvbnN0IG1pZ3JhdGlvbiBvZiBtaWdyYXRpb25zKSB7XG4gICAgICBjb25zdCB7IHRpdGxlLCBkZXNjcmlwdGlvbiB9ID0gZ2V0TWlncmF0aW9uVGl0bGVBbmREZXNjcmlwdGlvbihtaWdyYXRpb24pO1xuXG4gICAgICBsb2dnZXIuaW5mbyhjb2xvcnMuY3lhbihjb2xvcnMuc3ltYm9scy5wb2ludGVyKSArICcgJyArIGNvbG9ycy5ib2xkKHRpdGxlKSk7XG5cbiAgICAgIGlmIChkZXNjcmlwdGlvbikge1xuICAgICAgICBsb2dnZXIuaW5mbygnICAnICsgZGVzY3JpcHRpb24pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7IHN1Y2Nlc3MsIGZpbGVzIH0gPSBhd2FpdCB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgICAgIHdvcmtmbG93LFxuICAgICAgICBtaWdyYXRpb24uY29sbGVjdGlvbi5uYW1lLFxuICAgICAgICBtaWdyYXRpb24ubmFtZSxcbiAgICAgICk7XG4gICAgICBpZiAoIXN1Y2Nlc3MpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIGxldCBtb2RpZmllZEZpbGVzVGV4dDogc3RyaW5nO1xuICAgICAgc3dpdGNoIChmaWxlcy5zaXplKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICBtb2RpZmllZEZpbGVzVGV4dCA9ICdObyBjaGFuZ2VzIG1hZGUnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgbW9kaWZpZWRGaWxlc1RleHQgPSAnMSBmaWxlIG1vZGlmaWVkJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBtb2RpZmllZEZpbGVzVGV4dCA9IGAke2ZpbGVzLnNpemV9IGZpbGVzIG1vZGlmaWVkYDtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgbG9nZ2VyLmluZm8oYCAgTWlncmF0aW9uIGNvbXBsZXRlZCAoJHttb2RpZmllZEZpbGVzVGV4dH0pLmApO1xuXG4gICAgICAvLyBDb21taXQgbWlncmF0aW9uXG4gICAgICBpZiAoY29tbWl0KSB7XG4gICAgICAgIGNvbnN0IGNvbW1pdFByZWZpeCA9IGAke3BhY2thZ2VOYW1lfSBtaWdyYXRpb24gLSAke21pZ3JhdGlvbi5uYW1lfWA7XG4gICAgICAgIGNvbnN0IGNvbW1pdE1lc3NhZ2UgPSBtaWdyYXRpb24uZGVzY3JpcHRpb25cbiAgICAgICAgICA/IGAke2NvbW1pdFByZWZpeH1cXG5cXG4ke21pZ3JhdGlvbi5kZXNjcmlwdGlvbn1gXG4gICAgICAgICAgOiBjb21taXRQcmVmaXg7XG4gICAgICAgIGNvbnN0IGNvbW1pdHRlZCA9IHRoaXMuY29tbWl0KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgICBpZiAoIWNvbW1pdHRlZCkge1xuICAgICAgICAgIC8vIEZhaWxlZCB0byBjb21taXQsIHNvbWV0aGluZyB3ZW50IHdyb25nLiBBYm9ydCB0aGUgdXBkYXRlLlxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGxvZ2dlci5pbmZvKCcnKTsgLy8gRXh0cmEgdHJhaWxpbmcgbmV3bGluZS5cbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbWlncmF0ZU9ubHkoXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIHJvb3REZXBlbmRlbmNpZXM6IE1hcDxzdHJpbmcsIFBhY2thZ2VUcmVlTm9kZT4sXG4gICAgb3B0aW9uczogT3B0aW9uczxVcGRhdGVDb21tYW5kQXJncz4sXG4gICk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgcGFja2FnZURlcGVuZGVuY3kgPSByb290RGVwZW5kZW5jaWVzLmdldChwYWNrYWdlTmFtZSk7XG4gICAgbGV0IHBhY2thZ2VQYXRoID0gcGFja2FnZURlcGVuZGVuY3k/LnBhdGg7XG4gICAgbGV0IHBhY2thZ2VOb2RlID0gcGFja2FnZURlcGVuZGVuY3k/LnBhY2thZ2U7XG4gICAgaWYgKHBhY2thZ2VEZXBlbmRlbmN5ICYmICFwYWNrYWdlTm9kZSkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdQYWNrYWdlIGZvdW5kIGluIHBhY2thZ2UuanNvbiBidXQgaXMgbm90IGluc3RhbGxlZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmICghcGFja2FnZURlcGVuZGVuY3kpIHtcbiAgICAgIC8vIEFsbG93IHJ1bm5pbmcgbWlncmF0aW9ucyBvbiB0cmFuc2l0aXZlbHkgaW5zdGFsbGVkIGRlcGVuZGVuY2llc1xuICAgICAgLy8gVGhlcmUgY2FuIHRlY2huaWNhbGx5IGJlIG5lc3RlZCBtdWx0aXBsZSB2ZXJzaW9uc1xuICAgICAgLy8gVE9ETzogSWYgbXVsdGlwbGUsIHRoaXMgc2hvdWxkIGZpbmQgYWxsIHZlcnNpb25zIGFuZCBhc2sgd2hpY2ggb25lIHRvIHVzZVxuICAgICAgY29uc3QgcGFja2FnZUpzb24gPSBmaW5kUGFja2FnZUpzb24odGhpcy5jb250ZXh0LnJvb3QsIHBhY2thZ2VOYW1lKTtcbiAgICAgIGlmIChwYWNrYWdlSnNvbikge1xuICAgICAgICBwYWNrYWdlUGF0aCA9IHBhdGguZGlybmFtZShwYWNrYWdlSnNvbik7XG4gICAgICAgIHBhY2thZ2VOb2RlID0gYXdhaXQgcmVhZFBhY2thZ2VKc29uKHBhY2thZ2VKc29uKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXBhY2thZ2VOb2RlIHx8ICFwYWNrYWdlUGF0aCkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdQYWNrYWdlIGlzIG5vdCBpbnN0YWxsZWQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGNvbnN0IHVwZGF0ZU1ldGFkYXRhID0gcGFja2FnZU5vZGVbJ25nLXVwZGF0ZSddO1xuICAgIGxldCBtaWdyYXRpb25zID0gdXBkYXRlTWV0YWRhdGE/Lm1pZ3JhdGlvbnM7XG4gICAgaWYgKG1pZ3JhdGlvbnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdQYWNrYWdlIGRvZXMgbm90IHByb3ZpZGUgbWlncmF0aW9ucy4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbWlncmF0aW9ucyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBjb250YWlucyBhIG1hbGZvcm1lZCBtaWdyYXRpb25zIGZpZWxkLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKHBhdGgucG9zaXguaXNBYnNvbHV0ZShtaWdyYXRpb25zKSB8fCBwYXRoLndpbjMyLmlzQWJzb2x1dGUobWlncmF0aW9ucykpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgJ1BhY2thZ2UgY29udGFpbnMgYW4gaW52YWxpZCBtaWdyYXRpb25zIGZpZWxkLiBBYnNvbHV0ZSBwYXRocyBhcmUgbm90IHBlcm1pdHRlZC4nLFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gTm9ybWFsaXplIHNsYXNoZXNcbiAgICBtaWdyYXRpb25zID0gbWlncmF0aW9ucy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgICBpZiAobWlncmF0aW9ucy5zdGFydHNXaXRoKCcuLi8nKSkge1xuICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAnUGFja2FnZSBjb250YWlucyBhbiBpbnZhbGlkIG1pZ3JhdGlvbnMgZmllbGQuIFBhdGhzIG91dHNpZGUgdGhlIHBhY2thZ2Ugcm9vdCBhcmUgbm90IHBlcm1pdHRlZC4nLFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgaXQgaXMgYSBwYWNrYWdlLWxvY2FsIGxvY2F0aW9uXG4gICAgY29uc3QgbG9jYWxNaWdyYXRpb25zID0gcGF0aC5qb2luKHBhY2thZ2VQYXRoLCBtaWdyYXRpb25zKTtcbiAgICBpZiAoZXhpc3RzU3luYyhsb2NhbE1pZ3JhdGlvbnMpKSB7XG4gICAgICBtaWdyYXRpb25zID0gbG9jYWxNaWdyYXRpb25zO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUcnkgdG8gcmVzb2x2ZSBmcm9tIHBhY2thZ2UgbG9jYXRpb24uXG4gICAgICAvLyBUaGlzIGF2b2lkcyBpc3N1ZXMgd2l0aCBwYWNrYWdlIGhvaXN0aW5nLlxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcGFja2FnZVJlcXVpcmUgPSBjcmVhdGVSZXF1aXJlKHBhY2thZ2VQYXRoICsgJy8nKTtcbiAgICAgICAgbWlncmF0aW9ucyA9IHBhY2thZ2VSZXF1aXJlLnJlc29sdmUobWlncmF0aW9ucyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcignTWlncmF0aW9ucyBmb3IgcGFja2FnZSB3ZXJlIG5vdCBmb3VuZC4nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UuICBbJHtlLm1lc3NhZ2V9XWApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMubmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbihcbiAgICAgICAgd29ya2Zsb3csXG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICBtaWdyYXRpb25zLFxuICAgICAgICBvcHRpb25zLm5hbWUsXG4gICAgICAgIG9wdGlvbnMuY3JlYXRlQ29tbWl0cyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgZnJvbSA9IGNvZXJjZVZlcnNpb25OdW1iZXIob3B0aW9ucy5mcm9tKTtcbiAgICBpZiAoIWZyb20pIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgXCJmcm9tXCIgdmFsdWUgWyR7b3B0aW9ucy5mcm9tfV0gaXMgbm90IGEgdmFsaWQgdmVyc2lvbi5gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbnMoXG4gICAgICB3b3JrZmxvdyxcbiAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgbWlncmF0aW9ucyxcbiAgICAgIGZyb20sXG4gICAgICBvcHRpb25zLnRvIHx8IHBhY2thZ2VOb2RlLnZlcnNpb24sXG4gICAgICBvcHRpb25zLmNyZWF0ZUNvbW1pdHMsXG4gICAgKTtcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGluZXMtcGVyLWZ1bmN0aW9uXG4gIHByaXZhdGUgYXN5bmMgdXBkYXRlUGFja2FnZXNBbmRNaWdyYXRlKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgcm9vdERlcGVuZGVuY2llczogTWFwPHN0cmluZywgUGFja2FnZVRyZWVOb2RlPixcbiAgICBvcHRpb25zOiBPcHRpb25zPFVwZGF0ZUNvbW1hbmRBcmdzPixcbiAgICBwYWNrYWdlczogUGFja2FnZUlkZW50aWZpZXJbXSxcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgY29uc3QgbG9nVmVyYm9zZSA9IChtZXNzYWdlOiBzdHJpbmcpID0+IHtcbiAgICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8obWVzc2FnZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHJlcXVlc3RzOiB7XG4gICAgICBpZGVudGlmaWVyOiBQYWNrYWdlSWRlbnRpZmllcjtcbiAgICAgIG5vZGU6IFBhY2thZ2VUcmVlTm9kZTtcbiAgICB9W10gPSBbXTtcblxuICAgIC8vIFZhbGlkYXRlIHBhY2thZ2VzIGFjdHVhbGx5IGFyZSBwYXJ0IG9mIHRoZSB3b3Jrc3BhY2VcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlcykge1xuICAgICAgY29uc3Qgbm9kZSA9IHJvb3REZXBlbmRlbmNpZXMuZ2V0KHBrZy5uYW1lKTtcbiAgICAgIGlmICghbm9kZT8ucGFja2FnZSkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoYFBhY2thZ2UgJyR7cGtnLm5hbWV9JyBpcyBub3QgYSBkZXBlbmRlbmN5LmApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiBhIHNwZWNpZmljIHZlcnNpb24gaXMgcmVxdWVzdGVkIGFuZCBtYXRjaGVzIHRoZSBpbnN0YWxsZWQgdmVyc2lvbiwgc2tpcC5cbiAgICAgIGlmIChwa2cudHlwZSA9PT0gJ3ZlcnNpb24nICYmIG5vZGUucGFja2FnZS52ZXJzaW9uID09PSBwa2cuZmV0Y2hTcGVjKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBQYWNrYWdlICcke3BrZy5uYW1lfScgaXMgYWxyZWFkeSBhdCAnJHtwa2cuZmV0Y2hTcGVjfScuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0cy5wdXNoKHsgaWRlbnRpZmllcjogcGtnLCBub2RlIH0pO1xuICAgIH1cblxuICAgIGlmIChyZXF1ZXN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGxvZ2dlci5pbmZvKCdGZXRjaGluZyBkZXBlbmRlbmN5IG1ldGFkYXRhIGZyb20gcmVnaXN0cnkuLi4nKTtcblxuICAgIGNvbnN0IHBhY2thZ2VzVG9VcGRhdGU6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCB7IGlkZW50aWZpZXI6IHJlcXVlc3RJZGVudGlmaWVyLCBub2RlIH0gb2YgcmVxdWVzdHMpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VOYW1lID0gcmVxdWVzdElkZW50aWZpZXIubmFtZTtcblxuICAgICAgbGV0IG1ldGFkYXRhO1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gTWV0YWRhdGEgcmVxdWVzdHMgYXJlIGludGVybmFsbHkgY2FjaGVkOyBtdWx0aXBsZSByZXF1ZXN0cyBmb3Igc2FtZSBuYW1lXG4gICAgICAgIC8vIGRvZXMgbm90IHJlc3VsdCBpbiBhZGRpdGlvbmFsIG5ldHdvcmsgdHJhZmZpY1xuICAgICAgICBtZXRhZGF0YSA9IGF3YWl0IGZldGNoUGFja2FnZU1ldGFkYXRhKHBhY2thZ2VOYW1lLCBsb2dnZXIsIHtcbiAgICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGZldGNoaW5nIG1ldGFkYXRhIGZvciAnJHtwYWNrYWdlTmFtZX0nOiBgICsgZS5tZXNzYWdlKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgLy8gVHJ5IHRvIGZpbmQgYSBwYWNrYWdlIHZlcnNpb24gYmFzZWQgb24gdGhlIHVzZXIgcmVxdWVzdGVkIHBhY2thZ2Ugc3BlY2lmaWVyXG4gICAgICAvLyByZWdpc3RyeSBzcGVjaWZpZXIgdHlwZXMgYXJlIGVpdGhlciB2ZXJzaW9uLCByYW5nZSwgb3IgdGFnXG4gICAgICBsZXQgbWFuaWZlc3Q6IFBhY2thZ2VNYW5pZmVzdCB8IHVuZGVmaW5lZDtcbiAgICAgIGlmIChcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3ZlcnNpb24nIHx8XG4gICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICdyYW5nZScgfHxcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3RhZydcbiAgICAgICkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG1hbmlmZXN0ID0gcGlja01hbmlmZXN0KG1ldGFkYXRhLCByZXF1ZXN0SWRlbnRpZmllci5mZXRjaFNwZWMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgICBpZiAoZS5jb2RlID09PSAnRVRBUkdFVCcpIHtcbiAgICAgICAgICAgIC8vIElmIG5vdCBmb3VuZCBhbmQgbmV4dCB3YXMgdXNlZCBhbmQgdXNlciBkaWQgbm90IHByb3ZpZGUgYSBzcGVjaWZpZXIsIHRyeSBsYXRlc3QuXG4gICAgICAgICAgICAvLyBQYWNrYWdlIG1heSBub3QgaGF2ZSBhIG5leHQgdGFnLlxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICByZXF1ZXN0SWRlbnRpZmllci50eXBlID09PSAndGFnJyAmJlxuICAgICAgICAgICAgICByZXF1ZXN0SWRlbnRpZmllci5mZXRjaFNwZWMgPT09ICduZXh0JyAmJlxuICAgICAgICAgICAgICAhcmVxdWVzdElkZW50aWZpZXIucmF3U3BlY1xuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbWFuaWZlc3QgPSBwaWNrTWFuaWZlc3QobWV0YWRhdGEsICdsYXRlc3QnKTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgaWYgKGUuY29kZSAhPT0gJ0VUQVJHRVQnICYmIGUuY29kZSAhPT0gJ0VOT1ZFUlNJT05TJykge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKGUuY29kZSAhPT0gJ0VOT1ZFUlNJT05TJykge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFtYW5pZmVzdCkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgYFBhY2thZ2Ugc3BlY2lmaWVkIGJ5ICcke3JlcXVlc3RJZGVudGlmaWVyLnJhd30nIGRvZXMgbm90IGV4aXN0IHdpdGhpbiB0aGUgcmVnaXN0cnkuYCxcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1hbmlmZXN0LnZlcnNpb24gPT09IG5vZGUucGFja2FnZT8udmVyc2lvbikge1xuICAgICAgICBsb2dnZXIuaW5mbyhgUGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nIGlzIGFscmVhZHkgdXAgdG8gZGF0ZS5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChub2RlLnBhY2thZ2UgJiYgQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAudGVzdChub2RlLnBhY2thZ2UubmFtZSkpIHtcbiAgICAgICAgY29uc3QgeyBuYW1lLCB2ZXJzaW9uIH0gPSBub2RlLnBhY2thZ2U7XG4gICAgICAgIGNvbnN0IHRvQmVJbnN0YWxsZWRNYWpvclZlcnNpb24gPSArbWFuaWZlc3QudmVyc2lvbi5zcGxpdCgnLicpWzBdO1xuICAgICAgICBjb25zdCBjdXJyZW50TWFqb3JWZXJzaW9uID0gK3ZlcnNpb24uc3BsaXQoJy4nKVswXTtcblxuICAgICAgICBpZiAodG9CZUluc3RhbGxlZE1ham9yVmVyc2lvbiAtIGN1cnJlbnRNYWpvclZlcnNpb24gPiAxKSB7XG4gICAgICAgICAgLy8gT25seSBhbGxvdyB1cGRhdGluZyBhIHNpbmdsZSB2ZXJzaW9uIGF0IGEgdGltZS5cbiAgICAgICAgICBpZiAoY3VycmVudE1ham9yVmVyc2lvbiA8IDYpIHtcbiAgICAgICAgICAgIC8vIEJlZm9yZSB2ZXJzaW9uIDYsIHRoZSBtYWpvciB2ZXJzaW9ucyB3ZXJlIG5vdCBhbHdheXMgc2VxdWVudGlhbC5cbiAgICAgICAgICAgIC8vIEV4YW1wbGUgQGFuZ3VsYXIvY29yZSBza2lwcGVkIHZlcnNpb24gMywgQGFuZ3VsYXIvY2xpIHNraXBwZWQgdmVyc2lvbnMgMi01LlxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVXBkYXRpbmcgbXVsdGlwbGUgbWFqb3IgdmVyc2lvbnMgb2YgJyR7bmFtZX0nIGF0IG9uY2UgaXMgbm90IHN1cHBvcnRlZC4gUGxlYXNlIG1pZ3JhdGUgZWFjaCBtYWpvciB2ZXJzaW9uIGluZGl2aWR1YWxseS5cXG5gICtcbiAgICAgICAgICAgICAgICBgRm9yIG1vcmUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHVwZGF0ZSBwcm9jZXNzLCBzZWUgaHR0cHM6Ly91cGRhdGUuYW5ndWxhci5pby8uYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG5leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudCA9IGN1cnJlbnRNYWpvclZlcnNpb24gKyAxO1xuXG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBVcGRhdGluZyBtdWx0aXBsZSBtYWpvciB2ZXJzaW9ucyBvZiAnJHtuYW1lfScgYXQgb25jZSBpcyBub3Qgc3VwcG9ydGVkLiBQbGVhc2UgbWlncmF0ZSBlYWNoIG1ham9yIHZlcnNpb24gaW5kaXZpZHVhbGx5LlxcbmAgK1xuICAgICAgICAgICAgICAgIGBSdW4gJ25nIHVwZGF0ZSAke25hbWV9QCR7bmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50fScgaW4geW91ciB3b3Jrc3BhY2UgZGlyZWN0b3J5IGAgK1xuICAgICAgICAgICAgICAgIGB0byB1cGRhdGUgdG8gbGF0ZXN0ICcke25leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudH0ueCcgdmVyc2lvbiBvZiAnJHtuYW1lfScuXFxuXFxuYCArXG4gICAgICAgICAgICAgICAgYEZvciBtb3JlIGluZm9ybWF0aW9uIGFib3V0IHRoZSB1cGRhdGUgcHJvY2Vzcywgc2VlIGh0dHBzOi8vdXBkYXRlLmFuZ3VsYXIuaW8vP3Y9JHtjdXJyZW50TWFqb3JWZXJzaW9ufS4wLSR7bmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50fS4wYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcGFja2FnZXNUb1VwZGF0ZS5wdXNoKHJlcXVlc3RJZGVudGlmaWVyLnRvU3RyaW5nKCkpO1xuICAgIH1cblxuICAgIGlmIChwYWNrYWdlc1RvVXBkYXRlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgY29uc3QgeyBzdWNjZXNzIH0gPSBhd2FpdCB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgICB3b3JrZmxvdyxcbiAgICAgIFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTixcbiAgICAgICd1cGRhdGUnLFxuICAgICAge1xuICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UsXG4gICAgICAgIGZvcmNlOiBvcHRpb25zLmZvcmNlLFxuICAgICAgICBuZXh0OiBvcHRpb25zLm5leHQsXG4gICAgICAgIHBhY2thZ2VNYW5hZ2VyOiB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIubmFtZSxcbiAgICAgICAgcGFja2FnZXM6IHBhY2thZ2VzVG9VcGRhdGUsXG4gICAgICB9LFxuICAgICk7XG5cbiAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMucm0ocGF0aC5qb2luKHRoaXMuY29udGV4dC5yb290LCAnbm9kZV9tb2R1bGVzJyksIHtcbiAgICAgICAgICBmb3JjZTogdHJ1ZSxcbiAgICAgICAgICByZWN1cnNpdmU6IHRydWUsXG4gICAgICAgICAgbWF4UmV0cmllczogMyxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIHt9XG5cbiAgICAgIGNvbnN0IGluc3RhbGxhdGlvblN1Y2Nlc3MgPSBhd2FpdCB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIuaW5zdGFsbEFsbChcbiAgICAgICAgdGhpcy5wYWNrYWdlTWFuYWdlckZvcmNlKG9wdGlvbnMudmVyYm9zZSkgPyBbJy0tZm9yY2UnXSA6IFtdLFxuICAgICAgICB0aGlzLmNvbnRleHQucm9vdCxcbiAgICAgICk7XG5cbiAgICAgIGlmICghaW5zdGFsbGF0aW9uU3VjY2Vzcykge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VjY2VzcyAmJiBvcHRpb25zLmNyZWF0ZUNvbW1pdHMpIHtcbiAgICAgIGlmICghdGhpcy5jb21taXQoYEFuZ3VsYXIgQ0xJIHVwZGF0ZSBmb3IgcGFja2FnZXMgLSAke3BhY2thZ2VzVG9VcGRhdGUuam9pbignLCAnKX1gKSkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGlzIGlzIGEgdGVtcG9yYXJ5IHdvcmthcm91bmQgdG8gYWxsb3cgZGF0YSB0byBiZSBwYXNzZWQgYmFjayBmcm9tIHRoZSB1cGRhdGUgc2NoZW1hdGljXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCBtaWdyYXRpb25zID0gKGdsb2JhbCBhcyBhbnkpLmV4dGVybmFsTWlncmF0aW9ucyBhcyB7XG4gICAgICBwYWNrYWdlOiBzdHJpbmc7XG4gICAgICBjb2xsZWN0aW9uOiBzdHJpbmc7XG4gICAgICBmcm9tOiBzdHJpbmc7XG4gICAgICB0bzogc3RyaW5nO1xuICAgIH1bXTtcblxuICAgIGlmIChzdWNjZXNzICYmIG1pZ3JhdGlvbnMpIHtcbiAgICAgIGNvbnN0IHJvb3RSZXF1aXJlID0gY3JlYXRlUmVxdWlyZSh0aGlzLmNvbnRleHQucm9vdCArICcvJyk7XG4gICAgICBmb3IgKGNvbnN0IG1pZ3JhdGlvbiBvZiBtaWdyYXRpb25zKSB7XG4gICAgICAgIC8vIFJlc29sdmUgdGhlIHBhY2thZ2UgZnJvbSB0aGUgd29ya3NwYWNlIHJvb3QsIGFzIG90aGVyd2lzZSBpdCB3aWxsIGJlIHJlc29sdmVkIGZyb20gdGhlIHRlbXBcbiAgICAgICAgLy8gaW5zdGFsbGVkIENMSSB2ZXJzaW9uLlxuICAgICAgICBsZXQgcGFja2FnZVBhdGg7XG4gICAgICAgIGxvZ1ZlcmJvc2UoXG4gICAgICAgICAgYFJlc29sdmluZyBtaWdyYXRpb24gcGFja2FnZSAnJHttaWdyYXRpb24ucGFja2FnZX0nIGZyb20gJyR7dGhpcy5jb250ZXh0LnJvb3R9Jy4uLmAsXG4gICAgICAgICk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHBhY2thZ2VQYXRoID0gcGF0aC5kaXJuYW1lKFxuICAgICAgICAgICAgICAvLyBUaGlzIG1heSBmYWlsIGlmIHRoZSBgcGFja2FnZS5qc29uYCBpcyBub3QgZXhwb3J0ZWQgYXMgYW4gZW50cnkgcG9pbnRcbiAgICAgICAgICAgICAgcm9vdFJlcXVpcmUucmVzb2x2ZShwYXRoLmpvaW4obWlncmF0aW9uLnBhY2thZ2UsICdwYWNrYWdlLmpzb24nKSksXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gdHJ5aW5nIHRvIHJlc29sdmUgdGhlIHBhY2thZ2UncyBtYWluIGVudHJ5IHBvaW50XG4gICAgICAgICAgICAgIHBhY2thZ2VQYXRoID0gcm9vdFJlcXVpcmUucmVzb2x2ZShtaWdyYXRpb24ucGFja2FnZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICBsb2dWZXJib3NlKGUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBNaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkgd2VyZSBub3QgZm91bmQuYCArXG4gICAgICAgICAgICAgICAgJyBUaGUgcGFja2FnZSBjb3VsZCBub3QgYmUgZm91bmQgaW4gdGhlIHdvcmtzcGFjZS4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVW5hYmxlIHRvIHJlc29sdmUgbWlncmF0aW9ucyBmb3IgcGFja2FnZSAoJHttaWdyYXRpb24ucGFja2FnZX0pLiAgWyR7ZS5tZXNzYWdlfV1gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBtaWdyYXRpb25zO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0IGlzIGEgcGFja2FnZS1sb2NhbCBsb2NhdGlvblxuICAgICAgICBjb25zdCBsb2NhbE1pZ3JhdGlvbnMgPSBwYXRoLmpvaW4ocGFja2FnZVBhdGgsIG1pZ3JhdGlvbi5jb2xsZWN0aW9uKTtcbiAgICAgICAgaWYgKGV4aXN0c1N5bmMobG9jYWxNaWdyYXRpb25zKSkge1xuICAgICAgICAgIG1pZ3JhdGlvbnMgPSBsb2NhbE1pZ3JhdGlvbnM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVHJ5IHRvIHJlc29sdmUgZnJvbSBwYWNrYWdlIGxvY2F0aW9uLlxuICAgICAgICAgIC8vIFRoaXMgYXZvaWRzIGlzc3VlcyB3aXRoIHBhY2thZ2UgaG9pc3RpbmcuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VSZXF1aXJlID0gY3JlYXRlUmVxdWlyZShwYWNrYWdlUGF0aCArICcvJyk7XG4gICAgICAgICAgICBtaWdyYXRpb25zID0gcGFja2FnZVJlcXVpcmUucmVzb2x2ZShtaWdyYXRpb24uY29sbGVjdGlvbik7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoYE1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KSB3ZXJlIG5vdCBmb3VuZC5gKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgICBgVW5hYmxlIHRvIHJlc29sdmUgbWlncmF0aW9ucyBmb3IgcGFja2FnZSAoJHttaWdyYXRpb24ucGFja2FnZX0pLiAgWyR7ZS5tZXNzYWdlfV1gLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlTWlncmF0aW9ucyhcbiAgICAgICAgICB3b3JrZmxvdyxcbiAgICAgICAgICBtaWdyYXRpb24ucGFja2FnZSxcbiAgICAgICAgICBtaWdyYXRpb25zLFxuICAgICAgICAgIG1pZ3JhdGlvbi5mcm9tLFxuICAgICAgICAgIG1pZ3JhdGlvbi50byxcbiAgICAgICAgICBvcHRpb25zLmNyZWF0ZUNvbW1pdHMsXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gQSBub24temVybyB2YWx1ZSBpcyBhIGZhaWx1cmUgZm9yIHRoZSBwYWNrYWdlJ3MgbWlncmF0aW9uc1xuICAgICAgICBpZiAocmVzdWx0ICE9PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdWNjZXNzID8gMCA6IDE7XG4gIH1cbiAgLyoqXG4gICAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIGNvbW1pdCB3YXMgc3VjY2Vzc2Z1bC5cbiAgICovXG4gIHByaXZhdGUgY29tbWl0KG1lc3NhZ2U6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICAvLyBDaGVjayBpZiBhIGNvbW1pdCBpcyBuZWVkZWQuXG4gICAgbGV0IGNvbW1pdE5lZWRlZDogYm9vbGVhbjtcbiAgICB0cnkge1xuICAgICAgY29tbWl0TmVlZGVkID0gaGFzQ2hhbmdlc1RvQ29tbWl0KCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYCAgRmFpbGVkIHRvIHJlYWQgR2l0IHRyZWU6XFxuJHsoZXJyIGFzIFNwYXduU3luY1JldHVybnM8c3RyaW5nPikuc3RkZXJyfWApO1xuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFjb21taXROZWVkZWQpIHtcbiAgICAgIGxvZ2dlci5pbmZvKCcgIE5vIGNoYW5nZXMgdG8gY29tbWl0IGFmdGVyIG1pZ3JhdGlvbi4nKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gQ29tbWl0IGNoYW5nZXMgYW5kIGFib3J0IG9uIGVycm9yLlxuICAgIHRyeSB7XG4gICAgICBjcmVhdGVDb21taXQobWVzc2FnZSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgIGBGYWlsZWQgdG8gY29tbWl0IHVwZGF0ZSAoJHttZXNzYWdlfSk6XFxuJHsoZXJyIGFzIFNwYXduU3luY1JldHVybnM8c3RyaW5nPikuc3RkZXJyfWAsXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gTm90aWZ5IHVzZXIgb2YgdGhlIGNvbW1pdC5cbiAgICBjb25zdCBoYXNoID0gZmluZEN1cnJlbnRHaXRTaGEoKTtcbiAgICBjb25zdCBzaG9ydE1lc3NhZ2UgPSBtZXNzYWdlLnNwbGl0KCdcXG4nKVswXTtcbiAgICBpZiAoaGFzaCkge1xuICAgICAgbG9nZ2VyLmluZm8oYCAgQ29tbWl0dGVkIG1pZ3JhdGlvbiBzdGVwICgke2dldFNob3J0SGFzaChoYXNoKX0pOiAke3Nob3J0TWVzc2FnZX0uYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIENvbW1pdCB3YXMgc3VjY2Vzc2Z1bCwgYnV0IHJlYWRpbmcgdGhlIGhhc2ggd2FzIG5vdC4gU29tZXRoaW5nIHdlaXJkIGhhcHBlbmVkLFxuICAgICAgLy8gYnV0IG5vdGhpbmcgdGhhdCB3b3VsZCBzdG9wIHRoZSB1cGRhdGUuIEp1c3QgbG9nIHRoZSB3ZWlyZG5lc3MgYW5kIGNvbnRpbnVlLlxuICAgICAgbG9nZ2VyLmluZm8oYCAgQ29tbWl0dGVkIG1pZ3JhdGlvbiBzdGVwOiAke3Nob3J0TWVzc2FnZX0uYCk7XG4gICAgICBsb2dnZXIud2FybignICBGYWlsZWQgdG8gbG9vayB1cCBoYXNoIG9mIG1vc3QgcmVjZW50IGNvbW1pdCwgY29udGludWluZyBhbnl3YXlzLicpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBjaGVja0NsZWFuR2l0KCk6IGJvb2xlYW4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0b3BMZXZlbCA9IGV4ZWNTeW5jKCdnaXQgcmV2LXBhcnNlIC0tc2hvdy10b3BsZXZlbCcsIHtcbiAgICAgICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICAgICAgc3RkaW86ICdwaXBlJyxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcmVzdWx0ID0gZXhlY1N5bmMoJ2dpdCBzdGF0dXMgLS1wb3JjZWxhaW4nLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSk7XG4gICAgICBpZiAocmVzdWx0LnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgZmlsZXMgaW5zaWRlIHRoZSB3b3Jrc3BhY2Ugcm9vdCBhcmUgcmVsZXZhbnRcbiAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgcmVzdWx0LnNwbGl0KCdcXG4nKSkge1xuICAgICAgICBjb25zdCByZWxhdGl2ZUVudHJ5ID0gcGF0aC5yZWxhdGl2ZShcbiAgICAgICAgICBwYXRoLnJlc29sdmUodGhpcy5jb250ZXh0LnJvb3QpLFxuICAgICAgICAgIHBhdGgucmVzb2x2ZSh0b3BMZXZlbC50cmltKCksIGVudHJ5LnNsaWNlKDMpLnRyaW0oKSksXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKCFyZWxhdGl2ZUVudHJ5LnN0YXJ0c1dpdGgoJy4uJykgJiYgIXBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZUVudHJ5KSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2gge31cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgY3VycmVudCBpbnN0YWxsZWQgQ0xJIHZlcnNpb24gaXMgb2xkZXIgb3IgbmV3ZXIgdGhhbiBhIGNvbXBhdGlibGUgdmVyc2lvbi5cbiAgICogQHJldHVybnMgdGhlIHZlcnNpb24gdG8gaW5zdGFsbCBvciBudWxsIHdoZW4gdGhlcmUgaXMgbm8gdXBkYXRlIHRvIGluc3RhbGwuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGNoZWNrQ0xJVmVyc2lvbihcbiAgICBwYWNrYWdlc1RvVXBkYXRlOiBzdHJpbmdbXSxcbiAgICB2ZXJib3NlID0gZmFsc2UsXG4gICAgbmV4dCA9IGZhbHNlLFxuICApOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICBjb25zdCB7IHZlcnNpb24gfSA9IGF3YWl0IGZldGNoUGFja2FnZU1hbmlmZXN0KFxuICAgICAgYEBhbmd1bGFyL2NsaUAke3RoaXMuZ2V0Q0xJVXBkYXRlUnVubmVyVmVyc2lvbihwYWNrYWdlc1RvVXBkYXRlLCBuZXh0KX1gLFxuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlcixcbiAgICAgIHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgdXNpbmdZYXJuOiB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIubmFtZSA9PT0gUGFja2FnZU1hbmFnZXIuWWFybixcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIHJldHVybiBWRVJTSU9OLmZ1bGwgPT09IHZlcnNpb24gPyBudWxsIDogdmVyc2lvbjtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q0xJVXBkYXRlUnVubmVyVmVyc2lvbihcbiAgICBwYWNrYWdlc1RvVXBkYXRlOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCxcbiAgICBuZXh0OiBib29sZWFuLFxuICApOiBzdHJpbmcgfCBudW1iZXIge1xuICAgIGlmIChuZXh0KSB7XG4gICAgICByZXR1cm4gJ25leHQnO1xuICAgIH1cblxuICAgIGNvbnN0IHVwZGF0aW5nQW5ndWxhclBhY2thZ2UgPSBwYWNrYWdlc1RvVXBkYXRlPy5maW5kKChyKSA9PiBBTkdVTEFSX1BBQ0tBR0VTX1JFR0VYUC50ZXN0KHIpKTtcbiAgICBpZiAodXBkYXRpbmdBbmd1bGFyUGFja2FnZSkge1xuICAgICAgLy8gSWYgd2UgYXJlIHVwZGF0aW5nIGFueSBBbmd1bGFyIHBhY2thZ2Ugd2UgY2FuIHVwZGF0ZSB0aGUgQ0xJIHRvIHRoZSB0YXJnZXQgdmVyc2lvbiBiZWNhdXNlXG4gICAgICAvLyBtaWdyYXRpb25zIGZvciBAYW5ndWxhci9jb3JlQDEzIGNhbiBiZSBleGVjdXRlZCB1c2luZyBBbmd1bGFyL2NsaUAxMy5cbiAgICAgIC8vIFRoaXMgaXMgc2FtZSBiZWhhdmlvdXIgYXMgYG5weCBAYW5ndWxhci9jbGlAMTMgdXBkYXRlIEBhbmd1bGFyL2NvcmVAMTNgLlxuXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpQDEzYCAtPiBbJycsICdhbmd1bGFyL2NsaScsICcxMyddXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpYCAtPiBbJycsICdhbmd1bGFyL2NsaSddXG4gICAgICBjb25zdCB0ZW1wVmVyc2lvbiA9IGNvZXJjZVZlcnNpb25OdW1iZXIodXBkYXRpbmdBbmd1bGFyUGFja2FnZS5zcGxpdCgnQCcpWzJdKTtcblxuICAgICAgcmV0dXJuIHNlbXZlci5wYXJzZSh0ZW1wVmVyc2lvbik/Lm1ham9yID8/ICdsYXRlc3QnO1xuICAgIH1cblxuICAgIC8vIFdoZW4gbm90IHVwZGF0aW5nIGFuIEFuZ3VsYXIgcGFja2FnZSB3ZSBjYW5ub3QgZGV0ZXJtaW5lIHdoaWNoIHNjaGVtYXRpYyBydW50aW1lIHRoZSBtaWdyYXRpb24gc2hvdWxkIHRvIGJlIGV4ZWN1dGVkIGluLlxuICAgIC8vIFR5cGljYWxseSwgd2UgY2FuIGFzc3VtZSB0aGF0IHRoZSBgQGFuZ3VsYXIvY2xpYCB3YXMgdXBkYXRlZCBwcmV2aW91c2x5LlxuICAgIC8vIEV4YW1wbGU6IEFuZ3VsYXIgb2ZmaWNpYWwgcGFja2FnZXMgYXJlIHR5cGljYWxseSB1cGRhdGVkIHByaW9yIHRvIE5HUlggZXRjLi4uXG4gICAgLy8gVGhlcmVmb3JlLCB3ZSBvbmx5IHVwZGF0ZSB0byB0aGUgbGF0ZXN0IHBhdGNoIHZlcnNpb24gb2YgdGhlIGluc3RhbGxlZCBtYWpvciB2ZXJzaW9uIG9mIHRoZSBBbmd1bGFyIENMSS5cblxuICAgIC8vIFRoaXMgaXMgaW1wb3J0YW50IGJlY2F1c2Ugd2UgbWlnaHQgZW5kIHVwIGluIGEgc2NlbmFyaW8gd2hlcmUgbG9jYWxseSBBbmd1bGFyIHYxMiBpcyBpbnN0YWxsZWQsIHVwZGF0aW5nIE5HUlggZnJvbSAxMSB0byAxMi5cbiAgICAvLyBXZSBlbmQgdXAgdXNpbmcgQW5ndWxhciBDbEkgdjEzIHRvIHJ1biB0aGUgbWlncmF0aW9ucyBpZiB3ZSBydW4gdGhlIG1pZ3JhdGlvbnMgdXNpbmcgdGhlIENMSSBpbnN0YWxsZWQgbWFqb3IgdmVyc2lvbiArIDEgbG9naWMuXG4gICAgcmV0dXJuIFZFUlNJT04ubWFqb3I7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJ1blRlbXBCaW5hcnkocGFja2FnZU5hbWU6IHN0cmluZywgYXJnczogc3RyaW5nW10gPSBbXSk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBzdWNjZXNzLCB0ZW1wTm9kZU1vZHVsZXMgfSA9IGF3YWl0IHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci5pbnN0YWxsVGVtcChwYWNrYWdlTmFtZSk7XG4gICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgdmVyc2lvbi90YWcgZXRjLi4uIGZyb20gcGFja2FnZSBuYW1lXG4gICAgLy8gRXg6IEBhbmd1bGFyL2NsaUBsYXRlc3QgLT4gQGFuZ3VsYXIvY2xpXG4gICAgY29uc3QgcGFja2FnZU5hbWVOb1ZlcnNpb24gPSBwYWNrYWdlTmFtZS5zdWJzdHJpbmcoMCwgcGFja2FnZU5hbWUubGFzdEluZGV4T2YoJ0AnKSk7XG4gICAgY29uc3QgcGtnTG9jYXRpb24gPSBqb2luKHRlbXBOb2RlTW9kdWxlcywgcGFja2FnZU5hbWVOb1ZlcnNpb24pO1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IGpvaW4ocGtnTG9jYXRpb24sICdwYWNrYWdlLmpzb24nKTtcblxuICAgIC8vIEdldCBhIGJpbmFyeSBsb2NhdGlvbiBmb3IgdGhpcyBwYWNrYWdlXG4gICAgbGV0IGJpblBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBpZiAoZXhpc3RzU3luYyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoLCAndXRmLTgnKTtcbiAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgIGNvbnN0IHsgYmluID0ge30gfSA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgICAgIGNvbnN0IGJpbktleXMgPSBPYmplY3Qua2V5cyhiaW4pO1xuXG4gICAgICAgIGlmIChiaW5LZXlzLmxlbmd0aCkge1xuICAgICAgICAgIGJpblBhdGggPSByZXNvbHZlKHBrZ0xvY2F0aW9uLCBiaW5bYmluS2V5c1swXV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFiaW5QYXRoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBsb2NhdGUgYmluIGZvciB0ZW1wb3JhcnkgcGFja2FnZTogJHtwYWNrYWdlTmFtZU5vVmVyc2lvbn0uYCk7XG4gICAgfVxuXG4gICAgY29uc3QgeyBzdGF0dXMsIGVycm9yIH0gPSBzcGF3blN5bmMocHJvY2Vzcy5leGVjUGF0aCwgW2JpblBhdGgsIC4uLmFyZ3NdLCB7XG4gICAgICBzdGRpbzogJ2luaGVyaXQnLFxuICAgICAgZW52OiB7XG4gICAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgICBOR19ESVNBQkxFX1ZFUlNJT05fQ0hFQ0s6ICd0cnVlJyxcbiAgICAgICAgTkdfQ0xJX0FOQUxZVElDUzogJ2ZhbHNlJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBpZiAoc3RhdHVzID09PSBudWxsICYmIGVycm9yKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdHVzID8/IDA7XG4gIH1cblxuICBwcml2YXRlIHBhY2thZ2VNYW5hZ2VyRm9yY2UodmVyYm9zZTogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIC8vIG5wbSA3KyBjYW4gZmFpbCBkdWUgdG8gaXQgaW5jb3JyZWN0bHkgcmVzb2x2aW5nIHBlZXIgZGVwZW5kZW5jaWVzIHRoYXQgaGF2ZSB2YWxpZCBTZW1WZXJcbiAgICAvLyByYW5nZXMgZHVyaW5nIGFuIHVwZGF0ZS4gVXBkYXRlIHdpbGwgc2V0IGNvcnJlY3QgdmVyc2lvbnMgb2YgZGVwZW5kZW5jaWVzIHdpdGhpbiB0aGVcbiAgICAvLyBwYWNrYWdlLmpzb24gZmlsZS4gVGhlIGZvcmNlIG9wdGlvbiBpcyBzZXQgdG8gd29ya2Fyb3VuZCB0aGVzZSBlcnJvcnMuXG4gICAgLy8gRXhhbXBsZSBlcnJvcjpcbiAgICAvLyBucG0gRVJSISBDb25mbGljdGluZyBwZWVyIGRlcGVuZGVuY3k6IEBhbmd1bGFyL2NvbXBpbGVyLWNsaUAxNC4wLjAtcmMuMFxuICAgIC8vIG5wbSBFUlIhIG5vZGVfbW9kdWxlcy9AYW5ndWxhci9jb21waWxlci1jbGlcbiAgICAvLyBucG0gRVJSISAgIHBlZXIgQGFuZ3VsYXIvY29tcGlsZXItY2xpQFwiXjE0LjAuMCB8fCBeMTQuMC4wLXJjXCIgZnJvbSBAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhckAxNC4wLjAtcmMuMFxuICAgIC8vIG5wbSBFUlIhICAgbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyXG4gICAgLy8gbnBtIEVSUiEgICAgIGRldiBAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhckBcIn4xNC4wLjAtcmMuMFwiIGZyb20gdGhlIHJvb3QgcHJvamVjdFxuICAgIGlmIChcbiAgICAgIHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci5uYW1lID09PSBQYWNrYWdlTWFuYWdlci5OcG0gJiZcbiAgICAgIHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci52ZXJzaW9uICYmXG4gICAgICBzZW12ZXIuZ3RlKHRoaXMuY29udGV4dC5wYWNrYWdlTWFuYWdlci52ZXJzaW9uLCAnNy4wLjAnKVxuICAgICkge1xuICAgICAgaWYgKHZlcmJvc2UpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKFxuICAgICAgICAgICdOUE0gNysgZGV0ZWN0ZWQgLS0gZW5hYmxpbmcgZm9yY2Ugb3B0aW9uIGZvciBwYWNrYWdlIGluc3RhbGxhdGlvbicsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2V0T3B0aW9uYWxNaWdyYXRpb25zVG9SdW4oXG4gICAgb3B0aW9uYWxNaWdyYXRpb25zOiBNaWdyYXRpb25TY2hlbWF0aWNEZXNjcmlwdGlvbltdLFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICk6IFByb21pc2U8TWlncmF0aW9uU2NoZW1hdGljRGVzY3JpcHRpb25bXSB8IHVuZGVmaW5lZD4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgbnVtYmVyT2ZNaWdyYXRpb25zID0gb3B0aW9uYWxNaWdyYXRpb25zLmxlbmd0aDtcbiAgICBsb2dnZXIuaW5mbyhcbiAgICAgIGBUaGlzIHBhY2thZ2UgaGFzICR7bnVtYmVyT2ZNaWdyYXRpb25zfSBvcHRpb25hbCBtaWdyYXRpb24ke1xuICAgICAgICBudW1iZXJPZk1pZ3JhdGlvbnMgPiAxID8gJ3MnIDogJydcbiAgICAgIH0gdGhhdCBjYW4gYmUgZXhlY3V0ZWQuYCxcbiAgICApO1xuICAgIGxvZ2dlci5pbmZvKCcnKTsgLy8gRXh0cmEgdHJhaWxpbmcgbmV3bGluZS5cblxuICAgIGlmICghaXNUVFkoKSkge1xuICAgICAgZm9yIChjb25zdCBtaWdyYXRpb24gb2Ygb3B0aW9uYWxNaWdyYXRpb25zKSB7XG4gICAgICAgIGNvbnN0IHsgdGl0bGUgfSA9IGdldE1pZ3JhdGlvblRpdGxlQW5kRGVzY3JpcHRpb24obWlncmF0aW9uKTtcbiAgICAgICAgbG9nZ2VyLmluZm8oY29sb3JzLmN5YW4oY29sb3JzLnN5bWJvbHMucG9pbnRlcikgKyAnICcgKyBjb2xvcnMuYm9sZCh0aXRsZSkpO1xuICAgICAgICBsb2dnZXIuaW5mbyhjb2xvcnMuZ3JheShgICBuZyB1cGRhdGUgJHtwYWNrYWdlTmFtZX0gLS1uYW1lICR7bWlncmF0aW9uLm5hbWV9YCkpO1xuICAgICAgICBsb2dnZXIuaW5mbygnJyk7IC8vIEV4dHJhIHRyYWlsaW5nIG5ld2xpbmUuXG4gICAgICB9XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgYW5zd2VyID0gYXdhaXQgYXNrQ2hvaWNlcyhcbiAgICAgIGBTZWxlY3QgdGhlIG1pZ3JhdGlvbnMgdGhhdCB5b3UnZCBsaWtlIHRvIHJ1bmAsXG4gICAgICBvcHRpb25hbE1pZ3JhdGlvbnMubWFwKChtaWdyYXRpb24pID0+IHtcbiAgICAgICAgY29uc3QgeyB0aXRsZSB9ID0gZ2V0TWlncmF0aW9uVGl0bGVBbmREZXNjcmlwdGlvbihtaWdyYXRpb24pO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbmFtZTogdGl0bGUsXG4gICAgICAgICAgdmFsdWU6IG1pZ3JhdGlvbi5uYW1lLFxuICAgICAgICB9O1xuICAgICAgfSksXG4gICAgICBudWxsLFxuICAgICk7XG5cbiAgICBsb2dnZXIuaW5mbygnJyk7IC8vIEV4dHJhIHRyYWlsaW5nIG5ld2xpbmUuXG5cbiAgICByZXR1cm4gb3B0aW9uYWxNaWdyYXRpb25zLmZpbHRlcigoeyBuYW1lIH0pID0+IGFuc3dlcj8uaW5jbHVkZXMobmFtZSkpO1xuICB9XG59XG5cbi8qKlxuICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgd29ya2luZyBkaXJlY3RvcnkgaGFzIEdpdCBjaGFuZ2VzIHRvIGNvbW1pdC5cbiAqL1xuZnVuY3Rpb24gaGFzQ2hhbmdlc1RvQ29tbWl0KCk6IGJvb2xlYW4ge1xuICAvLyBMaXN0IGFsbCBtb2RpZmllZCBmaWxlcyBub3QgY292ZXJlZCBieSAuZ2l0aWdub3JlLlxuICAvLyBJZiBhbnkgZmlsZXMgYXJlIHJldHVybmVkLCB0aGVuIHRoZXJlIG11c3QgYmUgc29tZXRoaW5nIHRvIGNvbW1pdC5cblxuICByZXR1cm4gZXhlY1N5bmMoJ2dpdCBscy1maWxlcyAtbSAtZCAtbyAtLWV4Y2x1ZGUtc3RhbmRhcmQnKS50b1N0cmluZygpICE9PSAnJztcbn1cblxuLyoqXG4gKiBQcmVjb25kaXRpb246IE11c3QgaGF2ZSBwZW5kaW5nIGNoYW5nZXMgdG8gY29tbWl0LCB0aGV5IGRvIG5vdCBuZWVkIHRvIGJlIHN0YWdlZC5cbiAqIFBvc3Rjb25kaXRpb246IFRoZSBHaXQgd29ya2luZyB0cmVlIGlzIGNvbW1pdHRlZCBhbmQgdGhlIHJlcG8gaXMgY2xlYW4uXG4gKiBAcGFyYW0gbWVzc2FnZSBUaGUgY29tbWl0IG1lc3NhZ2UgdG8gdXNlLlxuICovXG5mdW5jdGlvbiBjcmVhdGVDb21taXQobWVzc2FnZTogc3RyaW5nKSB7XG4gIC8vIFN0YWdlIGVudGlyZSB3b3JraW5nIHRyZWUgZm9yIGNvbW1pdC5cbiAgZXhlY1N5bmMoJ2dpdCBhZGQgLUEnLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSk7XG5cbiAgLy8gQ29tbWl0IHdpdGggdGhlIG1lc3NhZ2UgcGFzc2VkIHZpYSBzdGRpbiB0byBhdm9pZCBiYXNoIGVzY2FwaW5nIGlzc3Vlcy5cbiAgZXhlY1N5bmMoJ2dpdCBjb21taXQgLS1uby12ZXJpZnkgLUYgLScsIHsgZW5jb2Rpbmc6ICd1dGY4Jywgc3RkaW86ICdwaXBlJywgaW5wdXQ6IG1lc3NhZ2UgfSk7XG59XG5cbi8qKlxuICogQHJldHVybiBUaGUgR2l0IFNIQSBoYXNoIG9mIHRoZSBIRUFEIGNvbW1pdC4gUmV0dXJucyBudWxsIGlmIHVuYWJsZSB0byByZXRyaWV2ZSB0aGUgaGFzaC5cbiAqL1xuZnVuY3Rpb24gZmluZEN1cnJlbnRHaXRTaGEoKTogc3RyaW5nIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGV4ZWNTeW5jKCdnaXQgcmV2LXBhcnNlIEhFQUQnLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSkudHJpbSgpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTaG9ydEhhc2goY29tbWl0SGFzaDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNvbW1pdEhhc2guc2xpY2UoMCwgOSk7XG59XG5cbmZ1bmN0aW9uIGNvZXJjZVZlcnNpb25OdW1iZXIodmVyc2lvbjogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKCF2ZXJzaW9uKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICghL15cXGR7MSwzMH1cXC5cXGR7MSwzMH1cXC5cXGR7MSwzMH0vLnRlc3QodmVyc2lvbikpIHtcbiAgICBjb25zdCBtYXRjaCA9IHZlcnNpb24ubWF0Y2goL15cXGR7MSwzMH0oXFwuXFxkezEsMzB9KSovKTtcblxuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKCFtYXRjaFsxXSkge1xuICAgICAgdmVyc2lvbiA9IHZlcnNpb24uc3Vic3RyaW5nKDAsIG1hdGNoWzBdLmxlbmd0aCkgKyAnLjAuMCcgKyB2ZXJzaW9uLnN1YnN0cmluZyhtYXRjaFswXS5sZW5ndGgpO1xuICAgIH0gZWxzZSBpZiAoIW1hdGNoWzJdKSB7XG4gICAgICB2ZXJzaW9uID0gdmVyc2lvbi5zdWJzdHJpbmcoMCwgbWF0Y2hbMF0ubGVuZ3RoKSArICcuMCcgKyB2ZXJzaW9uLnN1YnN0cmluZyhtYXRjaFswXS5sZW5ndGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBzZW12ZXIudmFsaWQodmVyc2lvbikgPz8gdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBnZXRNaWdyYXRpb25UaXRsZUFuZERlc2NyaXB0aW9uKG1pZ3JhdGlvbjogTWlncmF0aW9uU2NoZW1hdGljRGVzY3JpcHRpb24pOiB7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG59IHtcbiAgY29uc3QgW3RpdGxlLCAuLi5kZXNjcmlwdGlvbl0gPSBtaWdyYXRpb24uZGVzY3JpcHRpb24uc3BsaXQoJy4gJyk7XG5cbiAgcmV0dXJuIHtcbiAgICB0aXRsZTogdGl0bGUuZW5kc1dpdGgoJy4nKSA/IHRpdGxlIDogdGl0bGUgKyAnLicsXG4gICAgZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uLmpvaW4oJy5cXG4gICcpLFxuICB9O1xufVxuIl19