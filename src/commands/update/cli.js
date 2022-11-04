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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3VwZGF0ZS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwyREFBMkU7QUFDM0UsNERBQWdFO0FBQ2hFLGlEQUFzRTtBQUN0RSwyQkFBZ0Q7QUFDaEQsbUNBQXVDO0FBQ3ZDLHNFQUFrQztBQUNsQywwRUFBNkM7QUFDN0MsMkNBQTZCO0FBQzdCLCtCQUFxQztBQUNyQywrQ0FBaUM7QUFFakMsMkVBQXNFO0FBQ3RFLHlFQUs4QztBQUM5QyxpR0FBNEY7QUFDNUYsMkZBQXlGO0FBQ3pGLGlEQUErQztBQUMvQyw2RUFBMEU7QUFDMUUsaURBQXNEO0FBQ3RELHVEQUErRDtBQUMvRCx1RUFLMEM7QUFDMUMsK0RBS3NDO0FBQ3RDLHFEQUFrRDtBQWVsRCxNQUFNLHVCQUF1QixHQUFHLDZCQUE2QixDQUFDO0FBQzlELE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztBQUV0RixNQUFhLG1CQUFvQixTQUFRLDhCQUFnQztJQUF6RTs7UUFDVyxVQUFLLEdBQUcsNkJBQVksQ0FBQyxFQUFFLENBQUM7UUFDZCwwQkFBcUIsR0FBRyxLQUFLLENBQUM7UUFFakQsWUFBTyxHQUFHLHFCQUFxQixDQUFDO1FBQ2hDLGFBQVEsR0FBRyw4RUFBOEUsQ0FBQztRQUMxRix3QkFBbUIsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQXc2Qi9ELENBQUM7SUF0NkJDLE9BQU8sQ0FBQyxVQUFnQjtRQUN0QixPQUFPLFVBQVU7YUFDZCxVQUFVLENBQUMsVUFBVSxFQUFFO1lBQ3RCLFdBQVcsRUFBRSxvQ0FBb0M7WUFDakQs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TyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDN0Y7YUFBTTtZQUNMLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO0tBQ0Y7SUFFRCxPQUFPLE1BQUEsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsbUNBQUksU0FBUyxDQUFDO0FBQzVDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlV29ya2Zsb3cgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgeyBTcGF3blN5bmNSZXR1cm5zLCBleGVjU3luYywgc3Bhd25TeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCBwcm9taXNlcyBhcyBmcyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IGNyZWF0ZVJlcXVpcmUgfSBmcm9tICdtb2R1bGUnO1xuaW1wb3J0IG5wYSBmcm9tICducG0tcGFja2FnZS1hcmcnO1xuaW1wb3J0IHBpY2tNYW5pZmVzdCBmcm9tICducG0tcGljay1tYW5pZmVzdCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgam9pbiwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi8uLi8uLi9saWIvY29uZmlnL3dvcmtzcGFjZS1zY2hlbWEnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUVycm9yLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBTY2hlbWF0aWNFbmdpbmVIb3N0IH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL3V0aWxpdGllcy9zY2hlbWF0aWMtZW5naW5lLWhvc3QnO1xuaW1wb3J0IHsgc3Vic2NyaWJlVG9Xb3JrZmxvdyB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvc2NoZW1hdGljLXdvcmtmbG93JztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBkaXNhYmxlVmVyc2lvbkNoZWNrIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2Vudmlyb25tZW50LW9wdGlvbnMnO1xuaW1wb3J0IHsgYXNzZXJ0SXNFcnJvciB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9lcnJvcic7XG5pbXBvcnQgeyB3cml0ZUVycm9yVG9Mb2dGaWxlIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2xvZy1maWxlJztcbmltcG9ydCB7XG4gIFBhY2thZ2VJZGVudGlmaWVyLFxuICBQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNZXRhZGF0YSxcbn0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWV0YWRhdGEnO1xuaW1wb3J0IHtcbiAgUGFja2FnZVRyZWVOb2RlLFxuICBmaW5kUGFja2FnZUpzb24sXG4gIGdldFByb2plY3REZXBlbmRlbmNpZXMsXG4gIHJlYWRQYWNrYWdlSnNvbixcbn0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtdHJlZSc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3ZlcnNpb24nO1xuXG5pbnRlcmZhY2UgVXBkYXRlQ29tbWFuZEFyZ3Mge1xuICBwYWNrYWdlcz86IHN0cmluZ1tdO1xuICBmb3JjZTogYm9vbGVhbjtcbiAgbmV4dDogYm9vbGVhbjtcbiAgJ21pZ3JhdGUtb25seSc/OiBib29sZWFuO1xuICBuYW1lPzogc3RyaW5nO1xuICBmcm9tPzogc3RyaW5nO1xuICB0bz86IHN0cmluZztcbiAgJ2FsbG93LWRpcnR5JzogYm9vbGVhbjtcbiAgdmVyYm9zZTogYm9vbGVhbjtcbiAgJ2NyZWF0ZS1jb21taXRzJzogYm9vbGVhbjtcbn1cblxuY29uc3QgQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAgPSAvXkAoPzphbmd1bGFyfG5ndW5pdmVyc2FsKVxcLy87XG5jb25zdCBVUERBVEVfU0NIRU1BVElDX0NPTExFQ1RJT04gPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnc2NoZW1hdGljL2NvbGxlY3Rpb24uanNvbicpO1xuXG5leHBvcnQgY2xhc3MgVXBkYXRlQ29tbWFuZE1vZHVsZSBleHRlbmRzIENvbW1hbmRNb2R1bGU8VXBkYXRlQ29tbWFuZEFyZ3M+IHtcbiAgb3ZlcnJpZGUgc2NvcGUgPSBDb21tYW5kU2NvcGUuSW47XG4gIHByb3RlY3RlZCBvdmVycmlkZSBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSBmYWxzZTtcblxuICBjb21tYW5kID0gJ3VwZGF0ZSBbcGFja2FnZXMuLl0nO1xuICBkZXNjcmliZSA9ICdVcGRhdGVzIHlvdXIgd29ya3NwYWNlIGFuZCBpdHMgZGVwZW5kZW5jaWVzLiBTZWUgaHR0cHM6Ly91cGRhdGUuYW5ndWxhci5pby8uJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnbG9uZy1kZXNjcmlwdGlvbi5tZCcpO1xuXG4gIGJ1aWxkZXIobG9jYWxZYXJnczogQXJndik6IEFyZ3Y8VXBkYXRlQ29tbWFuZEFyZ3M+IHtcbiAgICByZXR1cm4gbG9jYWxZYXJnc1xuICAgICAgLnBvc2l0aW9uYWwoJ3BhY2thZ2VzJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBuYW1lcyBvZiBwYWNrYWdlKHMpIHRvIHVwZGF0ZS4nLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgYXJyYXk6IHRydWUsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignZm9yY2UnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnSWdub3JlIHBlZXIgZGVwZW5kZW5jeSB2ZXJzaW9uIG1pc21hdGNoZXMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCduZXh0Jywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ1VzZSB0aGUgcHJlcmVsZWFzZSB2ZXJzaW9uLCBpbmNsdWRpbmcgYmV0YSBhbmQgUkNzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignbWlncmF0ZS1vbmx5Jywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ09ubHkgcGVyZm9ybSBhIG1pZ3JhdGlvbiwgZG8gbm90IHVwZGF0ZSB0aGUgaW5zdGFsbGVkIHZlcnNpb24uJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ25hbWUnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICdUaGUgbmFtZSBvZiB0aGUgbWlncmF0aW9uIHRvIHJ1bi4gJyArXG4gICAgICAgICAgYE9ubHkgYXZhaWxhYmxlIHdpdGggYSBzaW5nbGUgcGFja2FnZSBiZWluZyB1cGRhdGVkLCBhbmQgb25seSB3aXRoICdtaWdyYXRlLW9ubHknIG9wdGlvbi5gLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgaW1wbGllczogWydtaWdyYXRlLW9ubHknXSxcbiAgICAgICAgY29uZmxpY3RzOiBbJ3RvJywgJ2Zyb20nXSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdmcm9tJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAnVmVyc2lvbiBmcm9tIHdoaWNoIHRvIG1pZ3JhdGUgZnJvbS4gJyArXG4gICAgICAgICAgYE9ubHkgYXZhaWxhYmxlIHdpdGggYSBzaW5nbGUgcGFja2FnZSBiZWluZyB1cGRhdGVkLCBhbmQgb25seSB3aXRoICdtaWdyYXRlLW9ubHknLmAsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBpbXBsaWVzOiBbJ3RvJywgJ21pZ3JhdGUtb25seSddLFxuICAgICAgICBjb25mbGljdHM6IFsnbmFtZSddLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ3RvJywge1xuICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAnVmVyc2lvbiB1cCB0byB3aGljaCB0byBhcHBseSBtaWdyYXRpb25zLiBPbmx5IGF2YWlsYWJsZSB3aXRoIGEgc2luZ2xlIHBhY2thZ2UgYmVpbmcgdXBkYXRlZCwgJyArXG4gICAgICAgICAgYGFuZCBvbmx5IHdpdGggJ21pZ3JhdGUtb25seScgb3B0aW9uLiBSZXF1aXJlcyAnZnJvbScgdG8gYmUgc3BlY2lmaWVkLiBEZWZhdWx0IHRvIHRoZSBpbnN0YWxsZWQgdmVyc2lvbiBkZXRlY3RlZC5gLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgaW1wbGllczogWydmcm9tJywgJ21pZ3JhdGUtb25seSddLFxuICAgICAgICBjb25mbGljdHM6IFsnbmFtZSddLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2FsbG93LWRpcnR5Jywge1xuICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAnV2hldGhlciB0byBhbGxvdyB1cGRhdGluZyB3aGVuIHRoZSByZXBvc2l0b3J5IGNvbnRhaW5zIG1vZGlmaWVkIG9yIHVudHJhY2tlZCBmaWxlcy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ3ZlcmJvc2UnLCB7XG4gICAgICAgIGRlc2NyaWJlOiAnRGlzcGxheSBhZGRpdGlvbmFsIGRldGFpbHMgYWJvdXQgaW50ZXJuYWwgb3BlcmF0aW9ucyBkdXJpbmcgZXhlY3V0aW9uLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignY3JlYXRlLWNvbW1pdHMnLCB7XG4gICAgICAgIGRlc2NyaWJlOiAnQ3JlYXRlIHNvdXJjZSBjb250cm9sIGNvbW1pdHMgZm9yIHVwZGF0ZXMgYW5kIG1pZ3JhdGlvbnMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBhbGlhczogWydDJ10sXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5jaGVjaygoeyBwYWNrYWdlcywgJ2FsbG93LWRpcnR5JzogYWxsb3dEaXJ0eSwgJ21pZ3JhdGUtb25seSc6IG1pZ3JhdGVPbmx5IH0pID0+IHtcbiAgICAgICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcblxuICAgICAgICAvLyBUaGlzIGFsbG93cyB0aGUgdXNlciB0byBlYXNpbHkgcmVzZXQgYW55IGNoYW5nZXMgZnJvbSB0aGUgdXBkYXRlLlxuICAgICAgICBpZiAocGFja2FnZXM/Lmxlbmd0aCAmJiAhdGhpcy5jaGVja0NsZWFuR2l0KCkpIHtcbiAgICAgICAgICBpZiAoYWxsb3dEaXJ0eSkge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgICdSZXBvc2l0b3J5IGlzIG5vdCBjbGVhbi4gVXBkYXRlIGNoYW5nZXMgd2lsbCBiZSBtaXhlZCB3aXRoIHByZS1leGlzdGluZyBjaGFuZ2VzLicsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKFxuICAgICAgICAgICAgICAnUmVwb3NpdG9yeSBpcyBub3QgY2xlYW4uIFBsZWFzZSBjb21taXQgb3Igc3Rhc2ggYW55IGNoYW5nZXMgYmVmb3JlIHVwZGF0aW5nLicsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtaWdyYXRlT25seSkge1xuICAgICAgICAgIGlmIChwYWNrYWdlcz8ubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKFxuICAgICAgICAgICAgICBgQSBzaW5nbGUgcGFja2FnZSBtdXN0IGJlIHNwZWNpZmllZCB3aGVuIHVzaW5nIHRoZSAnbWlncmF0ZS1vbmx5JyBvcHRpb24uYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLnN0cmljdCgpO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8VXBkYXRlQ29tbWFuZEFyZ3M+KTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgY29uc3QgeyBsb2dnZXIsIHBhY2thZ2VNYW5hZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICBwYWNrYWdlTWFuYWdlci5lbnN1cmVDb21wYXRpYmlsaXR5KCk7XG5cbiAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBpbnN0YWxsZWQgQ0xJIHZlcnNpb24gaXMgb2xkZXIgdGhhbiB0aGUgbGF0ZXN0IGNvbXBhdGlibGUgdmVyc2lvbi5cbiAgICAvLyBTa2lwIHdoZW4gcnVubmluZyBgbmcgdXBkYXRlYCB3aXRob3V0IGEgcGFja2FnZSBuYW1lIGFzIHRoaXMgd2lsbCBub3QgdHJpZ2dlciBhbiBhY3R1YWwgdXBkYXRlLlxuICAgIGlmICghZGlzYWJsZVZlcnNpb25DaGVjayAmJiBvcHRpb25zLnBhY2thZ2VzPy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IGNsaVZlcnNpb25Ub0luc3RhbGwgPSBhd2FpdCB0aGlzLmNoZWNrQ0xJVmVyc2lvbihcbiAgICAgICAgb3B0aW9ucy5wYWNrYWdlcyxcbiAgICAgICAgb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICBvcHRpb25zLm5leHQsXG4gICAgICApO1xuXG4gICAgICBpZiAoY2xpVmVyc2lvblRvSW5zdGFsbCkge1xuICAgICAgICBsb2dnZXIud2FybihcbiAgICAgICAgICAnVGhlIGluc3RhbGxlZCBBbmd1bGFyIENMSSB2ZXJzaW9uIGlzIG91dGRhdGVkLlxcbicgK1xuICAgICAgICAgICAgYEluc3RhbGxpbmcgYSB0ZW1wb3JhcnkgQW5ndWxhciBDTEkgdmVyc2lvbmVkICR7Y2xpVmVyc2lvblRvSW5zdGFsbH0gdG8gcGVyZm9ybSB0aGUgdXBkYXRlLmAsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMucnVuVGVtcEJpbmFyeShgQGFuZ3VsYXIvY2xpQCR7Y2xpVmVyc2lvblRvSW5zdGFsbH1gLCBwcm9jZXNzLmFyZ3Yuc2xpY2UoMikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHBhY2thZ2VzOiBQYWNrYWdlSWRlbnRpZmllcltdID0gW107XG4gICAgZm9yIChjb25zdCByZXF1ZXN0IG9mIG9wdGlvbnMucGFja2FnZXMgPz8gW10pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHBhY2thZ2VJZGVudGlmaWVyID0gbnBhKHJlcXVlc3QpO1xuXG4gICAgICAgIC8vIG9ubHkgcmVnaXN0cnkgaWRlbnRpZmllcnMgYXJlIHN1cHBvcnRlZFxuICAgICAgICBpZiAoIXBhY2thZ2VJZGVudGlmaWVyLnJlZ2lzdHJ5KSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKGBQYWNrYWdlICcke3JlcXVlc3R9JyBpcyBub3QgYSByZWdpc3RyeSBwYWNrYWdlIGlkZW50aWZlci5gKTtcblxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBhY2thZ2VzLnNvbWUoKHYpID0+IHYubmFtZSA9PT0gcGFja2FnZUlkZW50aWZpZXIubmFtZSkpIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoYER1cGxpY2F0ZSBwYWNrYWdlICcke3BhY2thZ2VJZGVudGlmaWVyLm5hbWV9JyBzcGVjaWZpZWQuYCk7XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLm1pZ3JhdGVPbmx5ICYmIHBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMgIT09ICcqJykge1xuICAgICAgICAgIGxvZ2dlci53YXJuKCdQYWNrYWdlIHNwZWNpZmllciBoYXMgbm8gZWZmZWN0IHdoZW4gdXNpbmcgXCJtaWdyYXRlLW9ubHlcIiBvcHRpb24uJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBuZXh0IG9wdGlvbiBpcyB1c2VkIGFuZCBubyBzcGVjaWZpZXIgc3VwcGxpZWQsIHVzZSBuZXh0IHRhZ1xuICAgICAgICBpZiAob3B0aW9ucy5uZXh0ICYmIHBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMgPT09ICcqJykge1xuICAgICAgICAgIHBhY2thZ2VJZGVudGlmaWVyLmZldGNoU3BlYyA9ICduZXh0JztcbiAgICAgICAgfVxuXG4gICAgICAgIHBhY2thZ2VzLnB1c2gocGFja2FnZUlkZW50aWZpZXIgYXMgUGFja2FnZUlkZW50aWZpZXIpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgICBsb2dnZXIuZXJyb3IoZS5tZXNzYWdlKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbyhgVXNpbmcgcGFja2FnZSBtYW5hZ2VyOiAke2NvbG9ycy5ncmV5KHBhY2thZ2VNYW5hZ2VyLm5hbWUpfWApO1xuICAgIGxvZ2dlci5pbmZvKCdDb2xsZWN0aW5nIGluc3RhbGxlZCBkZXBlbmRlbmNpZXMuLi4nKTtcblxuICAgIGNvbnN0IHJvb3REZXBlbmRlbmNpZXMgPSBhd2FpdCBnZXRQcm9qZWN0RGVwZW5kZW5jaWVzKHRoaXMuY29udGV4dC5yb290KTtcbiAgICBsb2dnZXIuaW5mbyhgRm91bmQgJHtyb290RGVwZW5kZW5jaWVzLnNpemV9IGRlcGVuZGVuY2llcy5gKTtcblxuICAgIGNvbnN0IHdvcmtmbG93ID0gbmV3IE5vZGVXb3JrZmxvdyh0aGlzLmNvbnRleHQucm9vdCwge1xuICAgICAgcGFja2FnZU1hbmFnZXI6IHBhY2thZ2VNYW5hZ2VyLm5hbWUsXG4gICAgICBwYWNrYWdlTWFuYWdlckZvcmNlOiB0aGlzLnBhY2thZ2VNYW5hZ2VyRm9yY2Uob3B0aW9ucy52ZXJib3NlKSxcbiAgICAgIC8vIF9fZGlybmFtZSAtPiBmYXZvciBAc2NoZW1hdGljcy91cGRhdGUgZnJvbSB0aGlzIHBhY2thZ2VcbiAgICAgIC8vIE90aGVyd2lzZSwgdXNlIHBhY2thZ2VzIGZyb20gdGhlIGFjdGl2ZSB3b3Jrc3BhY2UgKG1pZ3JhdGlvbnMpXG4gICAgICByZXNvbHZlUGF0aHM6IFtfX2Rpcm5hbWUsIHRoaXMuY29udGV4dC5yb290XSxcbiAgICAgIHNjaGVtYVZhbGlkYXRpb246IHRydWUsXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KTtcblxuICAgIGlmIChwYWNrYWdlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIFNob3cgc3RhdHVzXG4gICAgICBjb25zdCB7IHN1Y2Nlc3MgfSA9IGF3YWl0IHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICAgICAgd29ya2Zsb3csXG4gICAgICAgIFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTixcbiAgICAgICAgJ3VwZGF0ZScsXG4gICAgICAgIHtcbiAgICAgICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICAgICAgICBuZXh0OiBvcHRpb25zLm5leHQsXG4gICAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICAgIHBhY2thZ2VNYW5hZ2VyOiBwYWNrYWdlTWFuYWdlci5uYW1lLFxuICAgICAgICAgIHBhY2thZ2VzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiBzdWNjZXNzID8gMCA6IDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdGlvbnMubWlncmF0ZU9ubHlcbiAgICAgID8gdGhpcy5taWdyYXRlT25seSh3b3JrZmxvdywgKG9wdGlvbnMucGFja2FnZXMgPz8gW10pWzBdLCByb290RGVwZW5kZW5jaWVzLCBvcHRpb25zKVxuICAgICAgOiB0aGlzLnVwZGF0ZVBhY2thZ2VzQW5kTWlncmF0ZSh3b3JrZmxvdywgcm9vdERlcGVuZGVuY2llcywgb3B0aW9ucywgcGFja2FnZXMpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlU2NoZW1hdGljKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgY29sbGVjdGlvbjogc3RyaW5nLFxuICAgIHNjaGVtYXRpYzogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge30sXG4gICk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBmaWxlczogU2V0PHN0cmluZz4gfT4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3Qgd29ya2Zsb3dTdWJzY3JpcHRpb24gPSBzdWJzY3JpYmVUb1dvcmtmbG93KHdvcmtmbG93LCBsb2dnZXIpO1xuXG4gICAgLy8gVE9ETzogQWxsb3cgcGFzc2luZyBhIHNjaGVtYXRpYyBpbnN0YW5jZSBkaXJlY3RseVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB3b3JrZmxvd1xuICAgICAgICAuZXhlY3V0ZSh7XG4gICAgICAgICAgY29sbGVjdGlvbixcbiAgICAgICAgICBzY2hlbWF0aWMsXG4gICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICBsb2dnZXIsXG4gICAgICAgIH0pXG4gICAgICAgIC50b1Byb21pc2UoKTtcblxuICAgICAgcmV0dXJuIHsgc3VjY2VzczogIXdvcmtmbG93U3Vic2NyaXB0aW9uLmVycm9yLCBmaWxlczogd29ya2Zsb3dTdWJzY3JpcHRpb24uZmlsZXMgfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgJHtjb2xvcnMuc3ltYm9scy5jcm9zc30gTWlncmF0aW9uIGZhaWxlZC4gU2VlIGFib3ZlIGZvciBmdXJ0aGVyIGRldGFpbHMuXFxuYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgICBjb25zdCBsb2dQYXRoID0gd3JpdGVFcnJvclRvTG9nRmlsZShlKTtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKFxuICAgICAgICAgIGAke2NvbG9ycy5zeW1ib2xzLmNyb3NzfSBNaWdyYXRpb24gZmFpbGVkOiAke2UubWVzc2FnZX1cXG5gICtcbiAgICAgICAgICAgIGAgIFNlZSBcIiR7bG9nUGF0aH1cIiBmb3IgZnVydGhlciBkZXRhaWxzLlxcbmAsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBmaWxlczogd29ya2Zsb3dTdWJzY3JpcHRpb24uZmlsZXMgfTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgd29ya2Zsb3dTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgbWlncmF0aW9uIHdhcyBwZXJmb3JtZWQgc3VjY2Vzc2Z1bGx5LlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlTWlncmF0aW9uKFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICBjb2xsZWN0aW9uUGF0aDogc3RyaW5nLFxuICAgIG1pZ3JhdGlvbk5hbWU6IHN0cmluZyxcbiAgICBjb21taXQ/OiBib29sZWFuLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25QYXRoKTtcbiAgICBjb25zdCBuYW1lID0gY29sbGVjdGlvbi5saXN0U2NoZW1hdGljTmFtZXMoKS5maW5kKChuYW1lKSA9PiBuYW1lID09PSBtaWdyYXRpb25OYW1lKTtcbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgQ2Fubm90IGZpbmQgbWlncmF0aW9uICcke21pZ3JhdGlvbk5hbWV9JyBpbiAnJHtwYWNrYWdlTmFtZX0nLmApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbyhjb2xvcnMuY3lhbihgKiogRXhlY3V0aW5nICcke21pZ3JhdGlvbk5hbWV9JyBvZiBwYWNrYWdlICcke3BhY2thZ2VOYW1lfScgKipcXG5gKSk7XG4gICAgY29uc3Qgc2NoZW1hdGljID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZVNjaGVtYXRpYyhuYW1lLCBjb2xsZWN0aW9uKTtcblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyh3b3JrZmxvdywgW3NjaGVtYXRpYy5kZXNjcmlwdGlvbl0sIHBhY2thZ2VOYW1lLCBjb21taXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIG1pZ3JhdGlvbnMgd2VyZSBwZXJmb3JtZWQgc3VjY2Vzc2Z1bGx5LlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlTWlncmF0aW9ucyhcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgY29sbGVjdGlvblBhdGg6IHN0cmluZyxcbiAgICBmcm9tOiBzdHJpbmcsXG4gICAgdG86IHN0cmluZyxcbiAgICBjb21taXQ/OiBib29sZWFuLFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uUGF0aCk7XG4gICAgY29uc3QgbWlncmF0aW9uUmFuZ2UgPSBuZXcgc2VtdmVyLlJhbmdlKFxuICAgICAgJz4nICsgKHNlbXZlci5wcmVyZWxlYXNlKGZyb20pID8gZnJvbS5zcGxpdCgnLScpWzBdICsgJy0wJyA6IGZyb20pICsgJyA8PScgKyB0by5zcGxpdCgnLScpWzBdLFxuICAgICk7XG4gICAgY29uc3QgbWlncmF0aW9ucyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKCkpIHtcbiAgICAgIGNvbnN0IHNjaGVtYXRpYyA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVTY2hlbWF0aWMobmFtZSwgY29sbGVjdGlvbik7XG4gICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IHNjaGVtYXRpYy5kZXNjcmlwdGlvbiBhcyB0eXBlb2Ygc2NoZW1hdGljLmRlc2NyaXB0aW9uICYge1xuICAgICAgICB2ZXJzaW9uPzogc3RyaW5nO1xuICAgICAgfTtcbiAgICAgIGRlc2NyaXB0aW9uLnZlcnNpb24gPSBjb2VyY2VWZXJzaW9uTnVtYmVyKGRlc2NyaXB0aW9uLnZlcnNpb24pO1xuICAgICAgaWYgKCFkZXNjcmlwdGlvbi52ZXJzaW9uKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2VtdmVyLnNhdGlzZmllcyhkZXNjcmlwdGlvbi52ZXJzaW9uLCBtaWdyYXRpb25SYW5nZSwgeyBpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZSB9KSkge1xuICAgICAgICBtaWdyYXRpb25zLnB1c2goZGVzY3JpcHRpb24gYXMgdHlwZW9mIHNjaGVtYXRpYy5kZXNjcmlwdGlvbiAmIHsgdmVyc2lvbjogc3RyaW5nIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtaWdyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgbWlncmF0aW9ucy5zb3J0KChhLCBiKSA9PiBzZW12ZXIuY29tcGFyZShhLnZlcnNpb24sIGIudmVyc2lvbikgfHwgYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKSk7XG5cbiAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmluZm8oXG4gICAgICBjb2xvcnMuY3lhbihgKiogRXhlY3V0aW5nIG1pZ3JhdGlvbnMgb2YgcGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nICoqXFxuYCksXG4gICAgKTtcblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyh3b3JrZmxvdywgbWlncmF0aW9ucywgcGFja2FnZU5hbWUsIGNvbW1pdCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyhcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIG1pZ3JhdGlvbnM6IEl0ZXJhYmxlPHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbjogc3RyaW5nOyBjb2xsZWN0aW9uOiB7IG5hbWU6IHN0cmluZyB9IH0+LFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgY29tbWl0ID0gZmFsc2UsXG4gICk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcbiAgICBmb3IgKGNvbnN0IG1pZ3JhdGlvbiBvZiBtaWdyYXRpb25zKSB7XG4gICAgICBjb25zdCBbdGl0bGUsIC4uLmRlc2NyaXB0aW9uXSA9IG1pZ3JhdGlvbi5kZXNjcmlwdGlvbi5zcGxpdCgnLiAnKTtcblxuICAgICAgbG9nZ2VyLmluZm8oXG4gICAgICAgIGNvbG9ycy5jeWFuKGNvbG9ycy5zeW1ib2xzLnBvaW50ZXIpICtcbiAgICAgICAgICAnICcgK1xuICAgICAgICAgIGNvbG9ycy5ib2xkKHRpdGxlLmVuZHNXaXRoKCcuJykgPyB0aXRsZSA6IHRpdGxlICsgJy4nKSxcbiAgICAgICk7XG5cbiAgICAgIGlmIChkZXNjcmlwdGlvbi5sZW5ndGgpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJyAgJyArIGRlc2NyaXB0aW9uLmpvaW4oJy5cXG4gICcpKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlU2NoZW1hdGljKFxuICAgICAgICB3b3JrZmxvdyxcbiAgICAgICAgbWlncmF0aW9uLmNvbGxlY3Rpb24ubmFtZSxcbiAgICAgICAgbWlncmF0aW9uLm5hbWUsXG4gICAgICApO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgbG9nZ2VyLmluZm8oJyAgTWlncmF0aW9uIGNvbXBsZXRlZC4nKTtcblxuICAgICAgLy8gQ29tbWl0IG1pZ3JhdGlvblxuICAgICAgaWYgKGNvbW1pdCkge1xuICAgICAgICBjb25zdCBjb21taXRQcmVmaXggPSBgJHtwYWNrYWdlTmFtZX0gbWlncmF0aW9uIC0gJHttaWdyYXRpb24ubmFtZX1gO1xuICAgICAgICBjb25zdCBjb21taXRNZXNzYWdlID0gbWlncmF0aW9uLmRlc2NyaXB0aW9uXG4gICAgICAgICAgPyBgJHtjb21taXRQcmVmaXh9XFxuXFxuJHttaWdyYXRpb24uZGVzY3JpcHRpb259YFxuICAgICAgICAgIDogY29tbWl0UHJlZml4O1xuICAgICAgICBjb25zdCBjb21taXR0ZWQgPSB0aGlzLmNvbW1pdChjb21taXRNZXNzYWdlKTtcbiAgICAgICAgaWYgKCFjb21taXR0ZWQpIHtcbiAgICAgICAgICAvLyBGYWlsZWQgdG8gY29tbWl0LCBzb21ldGhpbmcgd2VudCB3cm9uZy4gQWJvcnQgdGhlIHVwZGF0ZS5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBsb2dnZXIuaW5mbygnJyk7IC8vIEV4dHJhIHRyYWlsaW5nIG5ld2xpbmUuXG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG1pZ3JhdGVPbmx5KFxuICAgIHdvcmtmbG93OiBOb2RlV29ya2Zsb3csXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICByb290RGVwZW5kZW5jaWVzOiBNYXA8c3RyaW5nLCBQYWNrYWdlVHJlZU5vZGU+LFxuICAgIG9wdGlvbnM6IE9wdGlvbnM8VXBkYXRlQ29tbWFuZEFyZ3M+LFxuICApOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGNvbnN0IHBhY2thZ2VEZXBlbmRlbmN5ID0gcm9vdERlcGVuZGVuY2llcy5nZXQocGFja2FnZU5hbWUpO1xuICAgIGxldCBwYWNrYWdlUGF0aCA9IHBhY2thZ2VEZXBlbmRlbmN5Py5wYXRoO1xuICAgIGxldCBwYWNrYWdlTm9kZSA9IHBhY2thZ2VEZXBlbmRlbmN5Py5wYWNrYWdlO1xuICAgIGlmIChwYWNrYWdlRGVwZW5kZW5jeSAmJiAhcGFja2FnZU5vZGUpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBmb3VuZCBpbiBwYWNrYWdlLmpzb24gYnV0IGlzIG5vdCBpbnN0YWxsZWQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAoIXBhY2thZ2VEZXBlbmRlbmN5KSB7XG4gICAgICAvLyBBbGxvdyBydW5uaW5nIG1pZ3JhdGlvbnMgb24gdHJhbnNpdGl2ZWx5IGluc3RhbGxlZCBkZXBlbmRlbmNpZXNcbiAgICAgIC8vIFRoZXJlIGNhbiB0ZWNobmljYWxseSBiZSBuZXN0ZWQgbXVsdGlwbGUgdmVyc2lvbnNcbiAgICAgIC8vIFRPRE86IElmIG11bHRpcGxlLCB0aGlzIHNob3VsZCBmaW5kIGFsbCB2ZXJzaW9ucyBhbmQgYXNrIHdoaWNoIG9uZSB0byB1c2VcbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gZmluZFBhY2thZ2VKc29uKHRoaXMuY29udGV4dC5yb290LCBwYWNrYWdlTmFtZSk7XG4gICAgICBpZiAocGFja2FnZUpzb24pIHtcbiAgICAgICAgcGFja2FnZVBhdGggPSBwYXRoLmRpcm5hbWUocGFja2FnZUpzb24pO1xuICAgICAgICBwYWNrYWdlTm9kZSA9IGF3YWl0IHJlYWRQYWNrYWdlSnNvbihwYWNrYWdlSnNvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwYWNrYWdlTm9kZSB8fCAhcGFja2FnZVBhdGgpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBpcyBub3QgaW5zdGFsbGVkLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBjb25zdCB1cGRhdGVNZXRhZGF0YSA9IHBhY2thZ2VOb2RlWyduZy11cGRhdGUnXTtcbiAgICBsZXQgbWlncmF0aW9ucyA9IHVwZGF0ZU1ldGFkYXRhPy5taWdyYXRpb25zO1xuICAgIGlmIChtaWdyYXRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignUGFja2FnZSBkb2VzIG5vdCBwcm92aWRlIG1pZ3JhdGlvbnMuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1pZ3JhdGlvbnMgIT09ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1BhY2thZ2UgY29udGFpbnMgYSBtYWxmb3JtZWQgbWlncmF0aW9ucyBmaWVsZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmIChwYXRoLnBvc2l4LmlzQWJzb2x1dGUobWlncmF0aW9ucykgfHwgcGF0aC53aW4zMi5pc0Fic29sdXRlKG1pZ3JhdGlvbnMpKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICdQYWNrYWdlIGNvbnRhaW5zIGFuIGludmFsaWQgbWlncmF0aW9ucyBmaWVsZC4gQWJzb2x1dGUgcGF0aHMgYXJlIG5vdCBwZXJtaXR0ZWQuJyxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIC8vIE5vcm1hbGl6ZSBzbGFzaGVzXG4gICAgbWlncmF0aW9ucyA9IG1pZ3JhdGlvbnMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gICAgaWYgKG1pZ3JhdGlvbnMuc3RhcnRzV2l0aCgnLi4vJykpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgJ1BhY2thZ2UgY29udGFpbnMgYW4gaW52YWxpZCBtaWdyYXRpb25zIGZpZWxkLiBQYXRocyBvdXRzaWRlIHRoZSBwYWNrYWdlIHJvb3QgYXJlIG5vdCBwZXJtaXR0ZWQuJyxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIGl0IGlzIGEgcGFja2FnZS1sb2NhbCBsb2NhdGlvblxuICAgIGNvbnN0IGxvY2FsTWlncmF0aW9ucyA9IHBhdGguam9pbihwYWNrYWdlUGF0aCwgbWlncmF0aW9ucyk7XG4gICAgaWYgKGV4aXN0c1N5bmMobG9jYWxNaWdyYXRpb25zKSkge1xuICAgICAgbWlncmF0aW9ucyA9IGxvY2FsTWlncmF0aW9ucztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVHJ5IHRvIHJlc29sdmUgZnJvbSBwYWNrYWdlIGxvY2F0aW9uLlxuICAgICAgLy8gVGhpcyBhdm9pZHMgaXNzdWVzIHdpdGggcGFja2FnZSBob2lzdGluZy5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHBhY2thZ2VSZXF1aXJlID0gY3JlYXRlUmVxdWlyZShwYWNrYWdlUGF0aCArICcvJyk7XG4gICAgICAgIG1pZ3JhdGlvbnMgPSBwYWNrYWdlUmVxdWlyZS5yZXNvbHZlKG1pZ3JhdGlvbnMpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoJ01pZ3JhdGlvbnMgZm9yIHBhY2thZ2Ugd2VyZSBub3QgZm91bmQuJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKGBVbmFibGUgdG8gcmVzb2x2ZSBtaWdyYXRpb25zIGZvciBwYWNrYWdlLiAgWyR7ZS5tZXNzYWdlfV1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChvcHRpb25zLm5hbWUpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4ZWN1dGVNaWdyYXRpb24oXG4gICAgICAgIHdvcmtmbG93LFxuICAgICAgICBwYWNrYWdlTmFtZSxcbiAgICAgICAgbWlncmF0aW9ucyxcbiAgICAgICAgb3B0aW9ucy5uYW1lLFxuICAgICAgICBvcHRpb25zLmNyZWF0ZUNvbW1pdHMsXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IGZyb20gPSBjb2VyY2VWZXJzaW9uTnVtYmVyKG9wdGlvbnMuZnJvbSk7XG4gICAgaWYgKCFmcm9tKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYFwiZnJvbVwiIHZhbHVlIFske29wdGlvbnMuZnJvbX1dIGlzIG5vdCBhIHZhbGlkIHZlcnNpb24uYCk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVNaWdyYXRpb25zKFxuICAgICAgd29ya2Zsb3csXG4gICAgICBwYWNrYWdlTmFtZSxcbiAgICAgIG1pZ3JhdGlvbnMsXG4gICAgICBmcm9tLFxuICAgICAgb3B0aW9ucy50byB8fCBwYWNrYWdlTm9kZS52ZXJzaW9uLFxuICAgICAgb3B0aW9ucy5jcmVhdGVDb21taXRzLFxuICAgICk7XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxpbmVzLXBlci1mdW5jdGlvblxuICBwcml2YXRlIGFzeW5jIHVwZGF0ZVBhY2thZ2VzQW5kTWlncmF0ZShcbiAgICB3b3JrZmxvdzogTm9kZVdvcmtmbG93LFxuICAgIHJvb3REZXBlbmRlbmNpZXM6IE1hcDxzdHJpbmcsIFBhY2thZ2VUcmVlTm9kZT4sXG4gICAgb3B0aW9uczogT3B0aW9uczxVcGRhdGVDb21tYW5kQXJncz4sXG4gICAgcGFja2FnZXM6IFBhY2thZ2VJZGVudGlmaWVyW10sXG4gICk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcblxuICAgIGNvbnN0IGxvZ1ZlcmJvc2UgPSAobWVzc2FnZTogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAob3B0aW9ucy52ZXJib3NlKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKG1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCByZXF1ZXN0czoge1xuICAgICAgaWRlbnRpZmllcjogUGFja2FnZUlkZW50aWZpZXI7XG4gICAgICBub2RlOiBQYWNrYWdlVHJlZU5vZGU7XG4gICAgfVtdID0gW107XG5cbiAgICAvLyBWYWxpZGF0ZSBwYWNrYWdlcyBhY3R1YWxseSBhcmUgcGFydCBvZiB0aGUgd29ya3NwYWNlXG4gICAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXMpIHtcbiAgICAgIGNvbnN0IG5vZGUgPSByb290RGVwZW5kZW5jaWVzLmdldChwa2cubmFtZSk7XG4gICAgICBpZiAoIW5vZGU/LnBhY2thZ2UpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBQYWNrYWdlICcke3BrZy5uYW1lfScgaXMgbm90IGEgZGVwZW5kZW5jeS5gKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgYSBzcGVjaWZpYyB2ZXJzaW9uIGlzIHJlcXVlc3RlZCBhbmQgbWF0Y2hlcyB0aGUgaW5zdGFsbGVkIHZlcnNpb24sIHNraXAuXG4gICAgICBpZiAocGtnLnR5cGUgPT09ICd2ZXJzaW9uJyAmJiBub2RlLnBhY2thZ2UudmVyc2lvbiA9PT0gcGtnLmZldGNoU3BlYykge1xuICAgICAgICBsb2dnZXIuaW5mbyhgUGFja2FnZSAnJHtwa2cubmFtZX0nIGlzIGFscmVhZHkgYXQgJyR7cGtnLmZldGNoU3BlY30nLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdHMucHVzaCh7IGlkZW50aWZpZXI6IHBrZywgbm9kZSB9KTtcbiAgICB9XG5cbiAgICBpZiAocmVxdWVzdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbygnRmV0Y2hpbmcgZGVwZW5kZW5jeSBtZXRhZGF0YSBmcm9tIHJlZ2lzdHJ5Li4uJyk7XG5cbiAgICBjb25zdCBwYWNrYWdlc1RvVXBkYXRlOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgeyBpZGVudGlmaWVyOiByZXF1ZXN0SWRlbnRpZmllciwgbm9kZSB9IG9mIHJlcXVlc3RzKSB7XG4gICAgICBjb25zdCBwYWNrYWdlTmFtZSA9IHJlcXVlc3RJZGVudGlmaWVyLm5hbWU7XG5cbiAgICAgIGxldCBtZXRhZGF0YTtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIE1ldGFkYXRhIHJlcXVlc3RzIGFyZSBpbnRlcm5hbGx5IGNhY2hlZDsgbXVsdGlwbGUgcmVxdWVzdHMgZm9yIHNhbWUgbmFtZVxuICAgICAgICAvLyBkb2VzIG5vdCByZXN1bHQgaW4gYWRkaXRpb25hbCBuZXR3b3JrIHRyYWZmaWNcbiAgICAgICAgbWV0YWRhdGEgPSBhd2FpdCBmZXRjaFBhY2thZ2VNZXRhZGF0YShwYWNrYWdlTmFtZSwgbG9nZ2VyLCB7XG4gICAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBmZXRjaGluZyBtZXRhZGF0YSBmb3IgJyR7cGFja2FnZU5hbWV9JzogYCArIGUubWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIFRyeSB0byBmaW5kIGEgcGFja2FnZSB2ZXJzaW9uIGJhc2VkIG9uIHRoZSB1c2VyIHJlcXVlc3RlZCBwYWNrYWdlIHNwZWNpZmllclxuICAgICAgLy8gcmVnaXN0cnkgc3BlY2lmaWVyIHR5cGVzIGFyZSBlaXRoZXIgdmVyc2lvbiwgcmFuZ2UsIG9yIHRhZ1xuICAgICAgbGV0IG1hbmlmZXN0OiBQYWNrYWdlTWFuaWZlc3QgfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoXG4gICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICd2ZXJzaW9uJyB8fFxuICAgICAgICByZXF1ZXN0SWRlbnRpZmllci50eXBlID09PSAncmFuZ2UnIHx8XG4gICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICd0YWcnXG4gICAgICApIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtYW5pZmVzdCA9IHBpY2tNYW5pZmVzdChtZXRhZGF0YSwgcmVxdWVzdElkZW50aWZpZXIuZmV0Y2hTcGVjKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ0VUQVJHRVQnKSB7XG4gICAgICAgICAgICAvLyBJZiBub3QgZm91bmQgYW5kIG5leHQgd2FzIHVzZWQgYW5kIHVzZXIgZGlkIG5vdCBwcm92aWRlIGEgc3BlY2lmaWVyLCB0cnkgbGF0ZXN0LlxuICAgICAgICAgICAgLy8gUGFja2FnZSBtYXkgbm90IGhhdmUgYSBuZXh0IHRhZy5cbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3RhZycgJiZcbiAgICAgICAgICAgICAgcmVxdWVzdElkZW50aWZpZXIuZmV0Y2hTcGVjID09PSAnbmV4dCcgJiZcbiAgICAgICAgICAgICAgIXJlcXVlc3RJZGVudGlmaWVyLnJhd1NwZWNcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG1hbmlmZXN0ID0gcGlja01hbmlmZXN0KG1ldGFkYXRhLCAnbGF0ZXN0Jyk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgICAgICAgICAgIGlmIChlLmNvZGUgIT09ICdFVEFSR0VUJyAmJiBlLmNvZGUgIT09ICdFTk9WRVJTSU9OUycpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChlLmNvZGUgIT09ICdFTk9WRVJTSU9OUycpIHtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICghbWFuaWZlc3QpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgIGBQYWNrYWdlIHNwZWNpZmllZCBieSAnJHtyZXF1ZXN0SWRlbnRpZmllci5yYXd9JyBkb2VzIG5vdCBleGlzdCB3aXRoaW4gdGhlIHJlZ2lzdHJ5LmAsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIGlmIChtYW5pZmVzdC52ZXJzaW9uID09PSBub2RlLnBhY2thZ2U/LnZlcnNpb24pIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFBhY2thZ2UgJyR7cGFja2FnZU5hbWV9JyBpcyBhbHJlYWR5IHVwIHRvIGRhdGUuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZS5wYWNrYWdlICYmIEFOR1VMQVJfUEFDS0FHRVNfUkVHRVhQLnRlc3Qobm9kZS5wYWNrYWdlLm5hbWUpKSB7XG4gICAgICAgIGNvbnN0IHsgbmFtZSwgdmVyc2lvbiB9ID0gbm9kZS5wYWNrYWdlO1xuICAgICAgICBjb25zdCB0b0JlSW5zdGFsbGVkTWFqb3JWZXJzaW9uID0gK21hbmlmZXN0LnZlcnNpb24uc3BsaXQoJy4nKVswXTtcbiAgICAgICAgY29uc3QgY3VycmVudE1ham9yVmVyc2lvbiA9ICt2ZXJzaW9uLnNwbGl0KCcuJylbMF07XG5cbiAgICAgICAgaWYgKHRvQmVJbnN0YWxsZWRNYWpvclZlcnNpb24gLSBjdXJyZW50TWFqb3JWZXJzaW9uID4gMSkge1xuICAgICAgICAgIC8vIE9ubHkgYWxsb3cgdXBkYXRpbmcgYSBzaW5nbGUgdmVyc2lvbiBhdCBhIHRpbWUuXG4gICAgICAgICAgaWYgKGN1cnJlbnRNYWpvclZlcnNpb24gPCA2KSB7XG4gICAgICAgICAgICAvLyBCZWZvcmUgdmVyc2lvbiA2LCB0aGUgbWFqb3IgdmVyc2lvbnMgd2VyZSBub3QgYWx3YXlzIHNlcXVlbnRpYWwuXG4gICAgICAgICAgICAvLyBFeGFtcGxlIEBhbmd1bGFyL2NvcmUgc2tpcHBlZCB2ZXJzaW9uIDMsIEBhbmd1bGFyL2NsaSBza2lwcGVkIHZlcnNpb25zIDItNS5cbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgYFVwZGF0aW5nIG11bHRpcGxlIG1ham9yIHZlcnNpb25zIG9mICcke25hbWV9JyBhdCBvbmNlIGlzIG5vdCBzdXBwb3J0ZWQuIFBsZWFzZSBtaWdyYXRlIGVhY2ggbWFqb3IgdmVyc2lvbiBpbmRpdmlkdWFsbHkuXFxuYCArXG4gICAgICAgICAgICAgICAgYEZvciBtb3JlIGluZm9ybWF0aW9uIGFib3V0IHRoZSB1cGRhdGUgcHJvY2Vzcywgc2VlIGh0dHBzOi8vdXBkYXRlLmFuZ3VsYXIuaW8vLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBuZXh0TWFqb3JWZXJzaW9uRnJvbUN1cnJlbnQgPSBjdXJyZW50TWFqb3JWZXJzaW9uICsgMTtcblxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVXBkYXRpbmcgbXVsdGlwbGUgbWFqb3IgdmVyc2lvbnMgb2YgJyR7bmFtZX0nIGF0IG9uY2UgaXMgbm90IHN1cHBvcnRlZC4gUGxlYXNlIG1pZ3JhdGUgZWFjaCBtYWpvciB2ZXJzaW9uIGluZGl2aWR1YWxseS5cXG5gICtcbiAgICAgICAgICAgICAgICBgUnVuICduZyB1cGRhdGUgJHtuYW1lfUAke25leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudH0nIGluIHlvdXIgd29ya3NwYWNlIGRpcmVjdG9yeSBgICtcbiAgICAgICAgICAgICAgICBgdG8gdXBkYXRlIHRvIGxhdGVzdCAnJHtuZXh0TWFqb3JWZXJzaW9uRnJvbUN1cnJlbnR9LngnIHZlcnNpb24gb2YgJyR7bmFtZX0nLlxcblxcbmAgK1xuICAgICAgICAgICAgICAgIGBGb3IgbW9yZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdXBkYXRlIHByb2Nlc3MsIHNlZSBodHRwczovL3VwZGF0ZS5hbmd1bGFyLmlvLz92PSR7Y3VycmVudE1ham9yVmVyc2lvbn0uMC0ke25leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudH0uMGAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHBhY2thZ2VzVG9VcGRhdGUucHVzaChyZXF1ZXN0SWRlbnRpZmllci50b1N0cmluZygpKTtcbiAgICB9XG5cbiAgICBpZiAocGFja2FnZXNUb1VwZGF0ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGNvbnN0IHsgc3VjY2VzcyB9ID0gYXdhaXQgdGhpcy5leGVjdXRlU2NoZW1hdGljKFxuICAgICAgd29ya2Zsb3csXG4gICAgICBVUERBVEVfU0NIRU1BVElDX0NPTExFQ1RJT04sXG4gICAgICAndXBkYXRlJyxcbiAgICAgIHtcbiAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICAgICAgbmV4dDogb3B0aW9ucy5uZXh0LFxuICAgICAgICBwYWNrYWdlTWFuYWdlcjogdGhpcy5jb250ZXh0LnBhY2thZ2VNYW5hZ2VyLm5hbWUsXG4gICAgICAgIHBhY2thZ2VzOiBwYWNrYWdlc1RvVXBkYXRlLFxuICAgICAgfSxcbiAgICApO1xuXG4gICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZzLnJtKHBhdGguam9pbih0aGlzLmNvbnRleHQucm9vdCwgJ25vZGVfbW9kdWxlcycpLCB7XG4gICAgICAgICAgZm9yY2U6IHRydWUsXG4gICAgICAgICAgcmVjdXJzaXZlOiB0cnVlLFxuICAgICAgICAgIG1heFJldHJpZXM6IDMsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCB7fVxuXG4gICAgICBjb25zdCBpbnN0YWxsYXRpb25TdWNjZXNzID0gYXdhaXQgdGhpcy5jb250ZXh0LnBhY2thZ2VNYW5hZ2VyLmluc3RhbGxBbGwoXG4gICAgICAgIHRoaXMucGFja2FnZU1hbmFnZXJGb3JjZShvcHRpb25zLnZlcmJvc2UpID8gWyctLWZvcmNlJ10gOiBbXSxcbiAgICAgICAgdGhpcy5jb250ZXh0LnJvb3QsXG4gICAgICApO1xuXG4gICAgICBpZiAoIWluc3RhbGxhdGlvblN1Y2Nlc3MpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1Y2Nlc3MgJiYgb3B0aW9ucy5jcmVhdGVDb21taXRzKSB7XG4gICAgICBpZiAoIXRoaXMuY29tbWl0KGBBbmd1bGFyIENMSSB1cGRhdGUgZm9yIHBhY2thZ2VzIC0gJHtwYWNrYWdlc1RvVXBkYXRlLmpvaW4oJywgJyl9YCkpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhpcyBpcyBhIHRlbXBvcmFyeSB3b3JrYXJvdW5kIHRvIGFsbG93IGRhdGEgdG8gYmUgcGFzc2VkIGJhY2sgZnJvbSB0aGUgdXBkYXRlIHNjaGVtYXRpY1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgY29uc3QgbWlncmF0aW9ucyA9IChnbG9iYWwgYXMgYW55KS5leHRlcm5hbE1pZ3JhdGlvbnMgYXMge1xuICAgICAgcGFja2FnZTogc3RyaW5nO1xuICAgICAgY29sbGVjdGlvbjogc3RyaW5nO1xuICAgICAgZnJvbTogc3RyaW5nO1xuICAgICAgdG86IHN0cmluZztcbiAgICB9W107XG5cbiAgICBpZiAoc3VjY2VzcyAmJiBtaWdyYXRpb25zKSB7XG4gICAgICBjb25zdCByb290UmVxdWlyZSA9IGNyZWF0ZVJlcXVpcmUodGhpcy5jb250ZXh0LnJvb3QgKyAnLycpO1xuICAgICAgZm9yIChjb25zdCBtaWdyYXRpb24gb2YgbWlncmF0aW9ucykge1xuICAgICAgICAvLyBSZXNvbHZlIHRoZSBwYWNrYWdlIGZyb20gdGhlIHdvcmtzcGFjZSByb290LCBhcyBvdGhlcndpc2UgaXQgd2lsbCBiZSByZXNvbHZlZCBmcm9tIHRoZSB0ZW1wXG4gICAgICAgIC8vIGluc3RhbGxlZCBDTEkgdmVyc2lvbi5cbiAgICAgICAgbGV0IHBhY2thZ2VQYXRoO1xuICAgICAgICBsb2dWZXJib3NlKFxuICAgICAgICAgIGBSZXNvbHZpbmcgbWlncmF0aW9uIHBhY2thZ2UgJyR7bWlncmF0aW9uLnBhY2thZ2V9JyBmcm9tICcke3RoaXMuY29udGV4dC5yb290fScuLi5gLFxuICAgICAgICApO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwYWNrYWdlUGF0aCA9IHBhdGguZGlybmFtZShcbiAgICAgICAgICAgICAgLy8gVGhpcyBtYXkgZmFpbCBpZiB0aGUgYHBhY2thZ2UuanNvbmAgaXMgbm90IGV4cG9ydGVkIGFzIGFuIGVudHJ5IHBvaW50XG4gICAgICAgICAgICAgIHJvb3RSZXF1aXJlLnJlc29sdmUocGF0aC5qb2luKG1pZ3JhdGlvbi5wYWNrYWdlLCAncGFja2FnZS5qc29uJykpLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRyeWluZyB0byByZXNvbHZlIHRoZSBwYWNrYWdlJ3MgbWFpbiBlbnRyeSBwb2ludFxuICAgICAgICAgICAgICBwYWNrYWdlUGF0aCA9IHJvb3RSZXF1aXJlLnJlc29sdmUobWlncmF0aW9uLnBhY2thZ2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBhc3NlcnRJc0Vycm9yKGUpO1xuICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgICAgbG9nVmVyYm9zZShlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgTWlncmF0aW9ucyBmb3IgcGFja2FnZSAoJHttaWdyYXRpb24ucGFja2FnZX0pIHdlcmUgbm90IGZvdW5kLmAgK1xuICAgICAgICAgICAgICAgICcgVGhlIHBhY2thZ2UgY291bGQgbm90IGJlIGZvdW5kIGluIHRoZSB3b3Jrc3BhY2UuJyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KS4gIFske2UubWVzc2FnZX1dYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbWlncmF0aW9ucztcblxuICAgICAgICAvLyBDaGVjayBpZiBpdCBpcyBhIHBhY2thZ2UtbG9jYWwgbG9jYXRpb25cbiAgICAgICAgY29uc3QgbG9jYWxNaWdyYXRpb25zID0gcGF0aC5qb2luKHBhY2thZ2VQYXRoLCBtaWdyYXRpb24uY29sbGVjdGlvbik7XG4gICAgICAgIGlmIChleGlzdHNTeW5jKGxvY2FsTWlncmF0aW9ucykpIHtcbiAgICAgICAgICBtaWdyYXRpb25zID0gbG9jYWxNaWdyYXRpb25zO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFRyeSB0byByZXNvbHZlIGZyb20gcGFja2FnZSBsb2NhdGlvbi5cbiAgICAgICAgICAvLyBUaGlzIGF2b2lkcyBpc3N1ZXMgd2l0aCBwYWNrYWdlIGhvaXN0aW5nLlxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwYWNrYWdlUmVxdWlyZSA9IGNyZWF0ZVJlcXVpcmUocGFja2FnZVBhdGggKyAnLycpO1xuICAgICAgICAgICAgbWlncmF0aW9ucyA9IHBhY2thZ2VSZXF1aXJlLnJlc29sdmUobWlncmF0aW9uLmNvbGxlY3Rpb24pO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBNaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkgd2VyZSBub3QgZm91bmQuYCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KS4gIFske2UubWVzc2FnZX1dYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbnMoXG4gICAgICAgICAgd29ya2Zsb3csXG4gICAgICAgICAgbWlncmF0aW9uLnBhY2thZ2UsXG4gICAgICAgICAgbWlncmF0aW9ucyxcbiAgICAgICAgICBtaWdyYXRpb24uZnJvbSxcbiAgICAgICAgICBtaWdyYXRpb24udG8sXG4gICAgICAgICAgb3B0aW9ucy5jcmVhdGVDb21taXRzLFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIEEgbm9uLXplcm8gdmFsdWUgaXMgYSBmYWlsdXJlIGZvciB0aGUgcGFja2FnZSdzIG1pZ3JhdGlvbnNcbiAgICAgICAgaWYgKHJlc3VsdCAhPT0gMCkge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3VjY2VzcyA/IDAgOiAxO1xuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSBjb21taXQgd2FzIHN1Y2Nlc3NmdWwuXG4gICAqL1xuICBwcml2YXRlIGNvbW1pdChtZXNzYWdlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgLy8gQ2hlY2sgaWYgYSBjb21taXQgaXMgbmVlZGVkLlxuICAgIGxldCBjb21taXROZWVkZWQ6IGJvb2xlYW47XG4gICAgdHJ5IHtcbiAgICAgIGNvbW1pdE5lZWRlZCA9IGhhc0NoYW5nZXNUb0NvbW1pdCgpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nZ2VyLmVycm9yKGAgIEZhaWxlZCB0byByZWFkIEdpdCB0cmVlOlxcbiR7KGVyciBhcyBTcGF3blN5bmNSZXR1cm5zPHN0cmluZz4pLnN0ZGVycn1gKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghY29tbWl0TmVlZGVkKSB7XG4gICAgICBsb2dnZXIuaW5mbygnICBObyBjaGFuZ2VzIHRvIGNvbW1pdCBhZnRlciBtaWdyYXRpb24uJyk7XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIENvbW1pdCBjaGFuZ2VzIGFuZCBhYm9ydCBvbiBlcnJvci5cbiAgICB0cnkge1xuICAgICAgY3JlYXRlQ29tbWl0KG1lc3NhZ2UpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICBgRmFpbGVkIHRvIGNvbW1pdCB1cGRhdGUgKCR7bWVzc2FnZX0pOlxcbiR7KGVyciBhcyBTcGF3blN5bmNSZXR1cm5zPHN0cmluZz4pLnN0ZGVycn1gLFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE5vdGlmeSB1c2VyIG9mIHRoZSBjb21taXQuXG4gICAgY29uc3QgaGFzaCA9IGZpbmRDdXJyZW50R2l0U2hhKCk7XG4gICAgY29uc3Qgc2hvcnRNZXNzYWdlID0gbWVzc2FnZS5zcGxpdCgnXFxuJylbMF07XG4gICAgaWYgKGhhc2gpIHtcbiAgICAgIGxvZ2dlci5pbmZvKGAgIENvbW1pdHRlZCBtaWdyYXRpb24gc3RlcCAoJHtnZXRTaG9ydEhhc2goaGFzaCl9KTogJHtzaG9ydE1lc3NhZ2V9LmApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDb21taXQgd2FzIHN1Y2Nlc3NmdWwsIGJ1dCByZWFkaW5nIHRoZSBoYXNoIHdhcyBub3QuIFNvbWV0aGluZyB3ZWlyZCBoYXBwZW5lZCxcbiAgICAgIC8vIGJ1dCBub3RoaW5nIHRoYXQgd291bGQgc3RvcCB0aGUgdXBkYXRlLiBKdXN0IGxvZyB0aGUgd2VpcmRuZXNzIGFuZCBjb250aW51ZS5cbiAgICAgIGxvZ2dlci5pbmZvKGAgIENvbW1pdHRlZCBtaWdyYXRpb24gc3RlcDogJHtzaG9ydE1lc3NhZ2V9LmApO1xuICAgICAgbG9nZ2VyLndhcm4oJyAgRmFpbGVkIHRvIGxvb2sgdXAgaGFzaCBvZiBtb3N0IHJlY2VudCBjb21taXQsIGNvbnRpbnVpbmcgYW55d2F5cy4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tDbGVhbkdpdCgpOiBib29sZWFuIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdG9wTGV2ZWwgPSBleGVjU3luYygnZ2l0IHJldi1wYXJzZSAtLXNob3ctdG9wbGV2ZWwnLCB7XG4gICAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICAgIHN0ZGlvOiAncGlwZScsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGV4ZWNTeW5jKCdnaXQgc3RhdHVzIC0tcG9yY2VsYWluJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pO1xuICAgICAgaWYgKHJlc3VsdC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IGZpbGVzIGluc2lkZSB0aGUgd29ya3NwYWNlIHJvb3QgYXJlIHJlbGV2YW50XG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHJlc3VsdC5zcGxpdCgnXFxuJykpIHtcbiAgICAgICAgY29uc3QgcmVsYXRpdmVFbnRyeSA9IHBhdGgucmVsYXRpdmUoXG4gICAgICAgICAgcGF0aC5yZXNvbHZlKHRoaXMuY29udGV4dC5yb290KSxcbiAgICAgICAgICBwYXRoLnJlc29sdmUodG9wTGV2ZWwudHJpbSgpLCBlbnRyeS5zbGljZSgzKS50cmltKCkpLFxuICAgICAgICApO1xuXG4gICAgICAgIGlmICghcmVsYXRpdmVFbnRyeS5zdGFydHNXaXRoKCcuLicpICYmICFwYXRoLmlzQWJzb2x1dGUocmVsYXRpdmVFbnRyeSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIHt9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIGN1cnJlbnQgaW5zdGFsbGVkIENMSSB2ZXJzaW9uIGlzIG9sZGVyIG9yIG5ld2VyIHRoYW4gYSBjb21wYXRpYmxlIHZlcnNpb24uXG4gICAqIEByZXR1cm5zIHRoZSB2ZXJzaW9uIHRvIGluc3RhbGwgb3IgbnVsbCB3aGVuIHRoZXJlIGlzIG5vIHVwZGF0ZSB0byBpbnN0YWxsLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBjaGVja0NMSVZlcnNpb24oXG4gICAgcGFja2FnZXNUb1VwZGF0ZTogc3RyaW5nW10sXG4gICAgdmVyYm9zZSA9IGZhbHNlLFxuICAgIG5leHQgPSBmYWxzZSxcbiAgKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgeyB2ZXJzaW9uIH0gPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChcbiAgICAgIGBAYW5ndWxhci9jbGlAJHt0aGlzLmdldENMSVVwZGF0ZVJ1bm5lclZlcnNpb24ocGFja2FnZXNUb1VwZGF0ZSwgbmV4dCl9YCxcbiAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIsXG4gICAgICB7XG4gICAgICAgIHZlcmJvc2UsXG4gICAgICAgIHVzaW5nWWFybjogdGhpcy5jb250ZXh0LnBhY2thZ2VNYW5hZ2VyLm5hbWUgPT09IFBhY2thZ2VNYW5hZ2VyLllhcm4sXG4gICAgICB9LFxuICAgICk7XG5cbiAgICByZXR1cm4gVkVSU0lPTi5mdWxsID09PSB2ZXJzaW9uID8gbnVsbCA6IHZlcnNpb247XG4gIH1cblxuICBwcml2YXRlIGdldENMSVVwZGF0ZVJ1bm5lclZlcnNpb24oXG4gICAgcGFja2FnZXNUb1VwZGF0ZTogc3RyaW5nW10gfCB1bmRlZmluZWQsXG4gICAgbmV4dDogYm9vbGVhbixcbiAgKTogc3RyaW5nIHwgbnVtYmVyIHtcbiAgICBpZiAobmV4dCkge1xuICAgICAgcmV0dXJuICduZXh0JztcbiAgICB9XG5cbiAgICBjb25zdCB1cGRhdGluZ0FuZ3VsYXJQYWNrYWdlID0gcGFja2FnZXNUb1VwZGF0ZT8uZmluZCgocikgPT4gQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAudGVzdChyKSk7XG4gICAgaWYgKHVwZGF0aW5nQW5ndWxhclBhY2thZ2UpIHtcbiAgICAgIC8vIElmIHdlIGFyZSB1cGRhdGluZyBhbnkgQW5ndWxhciBwYWNrYWdlIHdlIGNhbiB1cGRhdGUgdGhlIENMSSB0byB0aGUgdGFyZ2V0IHZlcnNpb24gYmVjYXVzZVxuICAgICAgLy8gbWlncmF0aW9ucyBmb3IgQGFuZ3VsYXIvY29yZUAxMyBjYW4gYmUgZXhlY3V0ZWQgdXNpbmcgQW5ndWxhci9jbGlAMTMuXG4gICAgICAvLyBUaGlzIGlzIHNhbWUgYmVoYXZpb3VyIGFzIGBucHggQGFuZ3VsYXIvY2xpQDEzIHVwZGF0ZSBAYW5ndWxhci9jb3JlQDEzYC5cblxuICAgICAgLy8gYEBhbmd1bGFyL2NsaUAxM2AgLT4gWycnLCAnYW5ndWxhci9jbGknLCAnMTMnXVxuICAgICAgLy8gYEBhbmd1bGFyL2NsaWAgLT4gWycnLCAnYW5ndWxhci9jbGknXVxuICAgICAgY29uc3QgdGVtcFZlcnNpb24gPSBjb2VyY2VWZXJzaW9uTnVtYmVyKHVwZGF0aW5nQW5ndWxhclBhY2thZ2Uuc3BsaXQoJ0AnKVsyXSk7XG5cbiAgICAgIHJldHVybiBzZW12ZXIucGFyc2UodGVtcFZlcnNpb24pPy5tYWpvciA/PyAnbGF0ZXN0JztcbiAgICB9XG5cbiAgICAvLyBXaGVuIG5vdCB1cGRhdGluZyBhbiBBbmd1bGFyIHBhY2thZ2Ugd2UgY2Fubm90IGRldGVybWluZSB3aGljaCBzY2hlbWF0aWMgcnVudGltZSB0aGUgbWlncmF0aW9uIHNob3VsZCB0byBiZSBleGVjdXRlZCBpbi5cbiAgICAvLyBUeXBpY2FsbHksIHdlIGNhbiBhc3N1bWUgdGhhdCB0aGUgYEBhbmd1bGFyL2NsaWAgd2FzIHVwZGF0ZWQgcHJldmlvdXNseS5cbiAgICAvLyBFeGFtcGxlOiBBbmd1bGFyIG9mZmljaWFsIHBhY2thZ2VzIGFyZSB0eXBpY2FsbHkgdXBkYXRlZCBwcmlvciB0byBOR1JYIGV0Yy4uLlxuICAgIC8vIFRoZXJlZm9yZSwgd2Ugb25seSB1cGRhdGUgdG8gdGhlIGxhdGVzdCBwYXRjaCB2ZXJzaW9uIG9mIHRoZSBpbnN0YWxsZWQgbWFqb3IgdmVyc2lvbiBvZiB0aGUgQW5ndWxhciBDTEkuXG5cbiAgICAvLyBUaGlzIGlzIGltcG9ydGFudCBiZWNhdXNlIHdlIG1pZ2h0IGVuZCB1cCBpbiBhIHNjZW5hcmlvIHdoZXJlIGxvY2FsbHkgQW5ndWxhciB2MTIgaXMgaW5zdGFsbGVkLCB1cGRhdGluZyBOR1JYIGZyb20gMTEgdG8gMTIuXG4gICAgLy8gV2UgZW5kIHVwIHVzaW5nIEFuZ3VsYXIgQ2xJIHYxMyB0byBydW4gdGhlIG1pZ3JhdGlvbnMgaWYgd2UgcnVuIHRoZSBtaWdyYXRpb25zIHVzaW5nIHRoZSBDTEkgaW5zdGFsbGVkIG1ham9yIHZlcnNpb24gKyAxIGxvZ2ljLlxuICAgIHJldHVybiBWRVJTSU9OLm1ham9yO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBydW5UZW1wQmluYXJ5KHBhY2thZ2VOYW1lOiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdID0gW10pOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgc3VjY2VzcywgdGVtcE5vZGVNb2R1bGVzIH0gPSBhd2FpdCB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIuaW5zdGFsbFRlbXAocGFja2FnZU5hbWUpO1xuICAgIGlmICghc3VjY2Vzcykge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIHZlcnNpb24vdGFnIGV0Yy4uLiBmcm9tIHBhY2thZ2UgbmFtZVxuICAgIC8vIEV4OiBAYW5ndWxhci9jbGlAbGF0ZXN0IC0+IEBhbmd1bGFyL2NsaVxuICAgIGNvbnN0IHBhY2thZ2VOYW1lTm9WZXJzaW9uID0gcGFja2FnZU5hbWUuc3Vic3RyaW5nKDAsIHBhY2thZ2VOYW1lLmxhc3RJbmRleE9mKCdAJykpO1xuICAgIGNvbnN0IHBrZ0xvY2F0aW9uID0gam9pbih0ZW1wTm9kZU1vZHVsZXMsIHBhY2thZ2VOYW1lTm9WZXJzaW9uKTtcbiAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBqb2luKHBrZ0xvY2F0aW9uLCAncGFja2FnZS5qc29uJyk7XG5cbiAgICAvLyBHZXQgYSBiaW5hcnkgbG9jYXRpb24gZm9yIHRoaXMgcGFja2FnZVxuICAgIGxldCBiaW5QYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGV4aXN0c1N5bmMocGFja2FnZUpzb25QYXRoKSkge1xuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCwgJ3V0Zi04Jyk7XG4gICAgICBpZiAoY29udGVudCkge1xuICAgICAgICBjb25zdCB7IGJpbiA9IHt9IH0gPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICBjb25zdCBiaW5LZXlzID0gT2JqZWN0LmtleXMoYmluKTtcblxuICAgICAgICBpZiAoYmluS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICBiaW5QYXRoID0gcmVzb2x2ZShwa2dMb2NhdGlvbiwgYmluW2JpbktleXNbMF1dKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghYmluUGF0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgbG9jYXRlIGJpbiBmb3IgdGVtcG9yYXJ5IHBhY2thZ2U6ICR7cGFja2FnZU5hbWVOb1ZlcnNpb259LmApO1xuICAgIH1cblxuICAgIGNvbnN0IHsgc3RhdHVzLCBlcnJvciB9ID0gc3Bhd25TeW5jKHByb2Nlc3MuZXhlY1BhdGgsIFtiaW5QYXRoLCAuLi5hcmdzXSwge1xuICAgICAgc3RkaW86ICdpbmhlcml0JyxcbiAgICAgIGVudjoge1xuICAgICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgICAgTkdfRElTQUJMRV9WRVJTSU9OX0NIRUNLOiAndHJ1ZScsXG4gICAgICAgIE5HX0NMSV9BTkFMWVRJQ1M6ICdmYWxzZScsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKHN0YXR1cyA9PT0gbnVsbCAmJiBlcnJvcikge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXR1cyA/PyAwO1xuICB9XG5cbiAgcHJpdmF0ZSBwYWNrYWdlTWFuYWdlckZvcmNlKHZlcmJvc2U6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICAvLyBucG0gNysgY2FuIGZhaWwgZHVlIHRvIGl0IGluY29ycmVjdGx5IHJlc29sdmluZyBwZWVyIGRlcGVuZGVuY2llcyB0aGF0IGhhdmUgdmFsaWQgU2VtVmVyXG4gICAgLy8gcmFuZ2VzIGR1cmluZyBhbiB1cGRhdGUuIFVwZGF0ZSB3aWxsIHNldCBjb3JyZWN0IHZlcnNpb25zIG9mIGRlcGVuZGVuY2llcyB3aXRoaW4gdGhlXG4gICAgLy8gcGFja2FnZS5qc29uIGZpbGUuIFRoZSBmb3JjZSBvcHRpb24gaXMgc2V0IHRvIHdvcmthcm91bmQgdGhlc2UgZXJyb3JzLlxuICAgIC8vIEV4YW1wbGUgZXJyb3I6XG4gICAgLy8gbnBtIEVSUiEgQ29uZmxpY3RpbmcgcGVlciBkZXBlbmRlbmN5OiBAYW5ndWxhci9jb21waWxlci1jbGlAMTQuMC4wLXJjLjBcbiAgICAvLyBucG0gRVJSISBub2RlX21vZHVsZXMvQGFuZ3VsYXIvY29tcGlsZXItY2xpXG4gICAgLy8gbnBtIEVSUiEgICBwZWVyIEBhbmd1bGFyL2NvbXBpbGVyLWNsaUBcIl4xNC4wLjAgfHwgXjE0LjAuMC1yY1wiIGZyb20gQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXJAMTQuMC4wLXJjLjBcbiAgICAvLyBucG0gRVJSISAgIG5vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhclxuICAgIC8vIG5wbSBFUlIhICAgICBkZXYgQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXJAXCJ+MTQuMC4wLXJjLjBcIiBmcm9tIHRoZSByb290IHByb2plY3RcbiAgICBpZiAoXG4gICAgICB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIubmFtZSA9PT0gUGFja2FnZU1hbmFnZXIuTnBtICYmXG4gICAgICB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIudmVyc2lvbiAmJlxuICAgICAgc2VtdmVyLmd0ZSh0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIudmVyc2lvbiwgJzcuMC4wJylcbiAgICApIHtcbiAgICAgIGlmICh2ZXJib3NlKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyhcbiAgICAgICAgICAnTlBNIDcrIGRldGVjdGVkIC0tIGVuYWJsaW5nIGZvcmNlIG9wdGlvbiBmb3IgcGFja2FnZSBpbnN0YWxsYXRpb24nLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSB3b3JraW5nIGRpcmVjdG9yeSBoYXMgR2l0IGNoYW5nZXMgdG8gY29tbWl0LlxuICovXG5mdW5jdGlvbiBoYXNDaGFuZ2VzVG9Db21taXQoKTogYm9vbGVhbiB7XG4gIC8vIExpc3QgYWxsIG1vZGlmaWVkIGZpbGVzIG5vdCBjb3ZlcmVkIGJ5IC5naXRpZ25vcmUuXG4gIC8vIElmIGFueSBmaWxlcyBhcmUgcmV0dXJuZWQsIHRoZW4gdGhlcmUgbXVzdCBiZSBzb21ldGhpbmcgdG8gY29tbWl0LlxuXG4gIHJldHVybiBleGVjU3luYygnZ2l0IGxzLWZpbGVzIC1tIC1kIC1vIC0tZXhjbHVkZS1zdGFuZGFyZCcpLnRvU3RyaW5nKCkgIT09ICcnO1xufVxuXG4vKipcbiAqIFByZWNvbmRpdGlvbjogTXVzdCBoYXZlIHBlbmRpbmcgY2hhbmdlcyB0byBjb21taXQsIHRoZXkgZG8gbm90IG5lZWQgdG8gYmUgc3RhZ2VkLlxuICogUG9zdGNvbmRpdGlvbjogVGhlIEdpdCB3b3JraW5nIHRyZWUgaXMgY29tbWl0dGVkIGFuZCB0aGUgcmVwbyBpcyBjbGVhbi5cbiAqIEBwYXJhbSBtZXNzYWdlIFRoZSBjb21taXQgbWVzc2FnZSB0byB1c2UuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUNvbW1pdChtZXNzYWdlOiBzdHJpbmcpIHtcbiAgLy8gU3RhZ2UgZW50aXJlIHdvcmtpbmcgdHJlZSBmb3IgY29tbWl0LlxuICBleGVjU3luYygnZ2l0IGFkZCAtQScsIHsgZW5jb2Rpbmc6ICd1dGY4Jywgc3RkaW86ICdwaXBlJyB9KTtcblxuICAvLyBDb21taXQgd2l0aCB0aGUgbWVzc2FnZSBwYXNzZWQgdmlhIHN0ZGluIHRvIGF2b2lkIGJhc2ggZXNjYXBpbmcgaXNzdWVzLlxuICBleGVjU3luYygnZ2l0IGNvbW1pdCAtLW5vLXZlcmlmeSAtRiAtJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnLCBpbnB1dDogbWVzc2FnZSB9KTtcbn1cblxuLyoqXG4gKiBAcmV0dXJuIFRoZSBHaXQgU0hBIGhhc2ggb2YgdGhlIEhFQUQgY29tbWl0LiBSZXR1cm5zIG51bGwgaWYgdW5hYmxlIHRvIHJldHJpZXZlIHRoZSBoYXNoLlxuICovXG5mdW5jdGlvbiBmaW5kQ3VycmVudEdpdFNoYSgpOiBzdHJpbmcgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZXhlY1N5bmMoJ2dpdCByZXYtcGFyc2UgSEVBRCcsIHsgZW5jb2Rpbmc6ICd1dGY4Jywgc3RkaW86ICdwaXBlJyB9KS50cmltKCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFNob3J0SGFzaChjb21taXRIYXNoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY29tbWl0SGFzaC5zbGljZSgwLCA5KTtcbn1cblxuZnVuY3Rpb24gY29lcmNlVmVyc2lvbk51bWJlcih2ZXJzaW9uOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAoIXZlcnNpb24pIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKCEvXlxcZHsxLDMwfVxcLlxcZHsxLDMwfVxcLlxcZHsxLDMwfS8udGVzdCh2ZXJzaW9uKSkge1xuICAgIGNvbnN0IG1hdGNoID0gdmVyc2lvbi5tYXRjaCgvXlxcZHsxLDMwfShcXC5cXGR7MSwzMH0pKi8pO1xuXG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAoIW1hdGNoWzFdKSB7XG4gICAgICB2ZXJzaW9uID0gdmVyc2lvbi5zdWJzdHJpbmcoMCwgbWF0Y2hbMF0ubGVuZ3RoKSArICcuMC4wJyArIHZlcnNpb24uc3Vic3RyaW5nKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgfSBlbHNlIGlmICghbWF0Y2hbMl0pIHtcbiAgICAgIHZlcnNpb24gPSB2ZXJzaW9uLnN1YnN0cmluZygwLCBtYXRjaFswXS5sZW5ndGgpICsgJy4wJyArIHZlcnNpb24uc3Vic3RyaW5nKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHNlbXZlci52YWxpZCh2ZXJzaW9uKSA/PyB1bmRlZmluZWQ7XG59XG4iXX0=