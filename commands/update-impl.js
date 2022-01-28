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
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
exports.UpdateCommand = void 0;
const schematics_1 = require("@angular-devkit/schematics");
const tools_1 = require("@angular-devkit/schematics/tools");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const npm_package_arg_1 = __importDefault(require("npm-package-arg"));
const npm_pick_manifest_1 = __importDefault(require("npm-pick-manifest"));
const path = __importStar(require("path"));
const semver = __importStar(require("semver"));
const workspace_schema_1 = require("../lib/config/workspace-schema");
const command_1 = require("../models/command");
const schematic_engine_host_1 = require("../models/schematic-engine-host");
const version_1 = require("../models/version");
const color_1 = require("../utilities/color");
const install_package_1 = require("../utilities/install-package");
const log_file_1 = require("../utilities/log-file");
const package_manager_1 = require("../utilities/package-manager");
const package_metadata_1 = require("../utilities/package-metadata");
const package_tree_1 = require("../utilities/package-tree");
const UPDATE_SCHEMATIC_COLLECTION = path.join(__dirname, '../src/commands/update/schematic/collection.json');
/**
 * Disable CLI version mismatch checks and forces usage of the invoked CLI
 * instead of invoking the local installed version.
 */
const disableVersionCheckEnv = process.env['NG_DISABLE_VERSION_CHECK'];
const disableVersionCheck = disableVersionCheckEnv !== undefined &&
    disableVersionCheckEnv !== '0' &&
    disableVersionCheckEnv.toLowerCase() !== 'false';
const ANGULAR_PACKAGES_REGEXP = /^@(?:angular|nguniversal)\//;
class UpdateCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.allowMissingWorkspace = true;
        this.packageManager = workspace_schema_1.PackageManager.Npm;
    }
    async initialize(options) {
        this.packageManager = await (0, package_manager_1.getPackageManager)(this.context.root);
        this.workflow = new tools_1.NodeWorkflow(this.context.root, {
            packageManager: this.packageManager,
            packageManagerForce: options.force,
            // __dirname -> favor @schematics/update from this package
            // Otherwise, use packages from the active workspace (migrations)
            resolvePaths: [__dirname, this.context.root],
            schemaValidation: true,
            engineHostCreator: (options) => new schematic_engine_host_1.SchematicEngineHost(options.resolvePaths),
        });
    }
    async executeSchematic(collection, schematic, options = {}) {
        let error = false;
        let logs = [];
        const files = new Set();
        const reporterSubscription = this.workflow.reporter.subscribe((event) => {
            // Strip leading slash to prevent confusion.
            const eventPath = event.path.startsWith('/') ? event.path.substr(1) : event.path;
            switch (event.kind) {
                case 'error':
                    error = true;
                    const desc = event.description == 'alreadyExist' ? 'already exists' : 'does not exist.';
                    this.logger.error(`ERROR! ${eventPath} ${desc}.`);
                    break;
                case 'update':
                    logs.push(`${color_1.colors.cyan('UPDATE')} ${eventPath} (${event.content.length} bytes)`);
                    files.add(eventPath);
                    break;
                case 'create':
                    logs.push(`${color_1.colors.green('CREATE')} ${eventPath} (${event.content.length} bytes)`);
                    files.add(eventPath);
                    break;
                case 'delete':
                    logs.push(`${color_1.colors.yellow('DELETE')} ${eventPath}`);
                    files.add(eventPath);
                    break;
                case 'rename':
                    const eventToPath = event.to.startsWith('/') ? event.to.substr(1) : event.to;
                    logs.push(`${color_1.colors.blue('RENAME')} ${eventPath} => ${eventToPath}`);
                    files.add(eventPath);
                    break;
            }
        });
        const lifecycleSubscription = this.workflow.lifeCycle.subscribe((event) => {
            if (event.kind == 'end' || event.kind == 'post-tasks-start') {
                if (!error) {
                    // Output the logging queue, no error happened.
                    logs.forEach((log) => this.logger.info(`  ${log}`));
                    logs = [];
                }
            }
        });
        // TODO: Allow passing a schematic instance directly
        try {
            await this.workflow
                .execute({
                collection,
                schematic,
                options,
                logger: this.logger,
            })
                .toPromise();
            reporterSubscription.unsubscribe();
            lifecycleSubscription.unsubscribe();
            return { success: !error, files };
        }
        catch (e) {
            if (e instanceof schematics_1.UnsuccessfulWorkflowExecution) {
                this.logger.error(`${color_1.colors.symbols.cross} Migration failed. See above for further details.\n`);
            }
            else {
                const logPath = (0, log_file_1.writeErrorToLogFile)(e);
                this.logger.fatal(`${color_1.colors.symbols.cross} Migration failed: ${e.message}\n` +
                    `  See "${logPath}" for further details.\n`);
            }
            return { success: false, files };
        }
    }
    /**
     * @return Whether or not the migration was performed successfully.
     */
    async executeMigration(packageName, collectionPath, migrationName, commit) {
        const collection = this.workflow.engine.createCollection(collectionPath);
        const name = collection.listSchematicNames().find((name) => name === migrationName);
        if (!name) {
            this.logger.error(`Cannot find migration '${migrationName}' in '${packageName}'.`);
            return false;
        }
        const schematic = this.workflow.engine.createSchematic(name, collection);
        this.logger.info(color_1.colors.cyan(`** Executing '${migrationName}' of package '${packageName}' **\n`));
        return this.executePackageMigrations([schematic.description], packageName, commit);
    }
    /**
     * @return Whether or not the migrations were performed successfully.
     */
    async executeMigrations(packageName, collectionPath, from, to, commit) {
        const collection = this.workflow.engine.createCollection(collectionPath);
        const migrationRange = new semver.Range('>' + (semver.prerelease(from) ? from.split('-')[0] + '-0' : from) + ' <=' + to.split('-')[0]);
        const migrations = [];
        for (const name of collection.listSchematicNames()) {
            const schematic = this.workflow.engine.createSchematic(name, collection);
            const description = schematic.description;
            description.version = coerceVersionNumber(description.version) || undefined;
            if (!description.version) {
                continue;
            }
            if (semver.satisfies(description.version, migrationRange, { includePrerelease: true })) {
                migrations.push(description);
            }
        }
        migrations.sort((a, b) => semver.compare(a.version, b.version) || a.name.localeCompare(b.name));
        if (migrations.length === 0) {
            return true;
        }
        this.logger.info(color_1.colors.cyan(`** Executing migrations of package '${packageName}' **\n`));
        return this.executePackageMigrations(migrations, packageName, commit);
    }
    async executePackageMigrations(migrations, packageName, commit = false) {
        for (const migration of migrations) {
            const [title, ...description] = migration.description.split('. ');
            this.logger.info(color_1.colors.cyan(color_1.colors.symbols.pointer) +
                ' ' +
                color_1.colors.bold(title.endsWith('.') ? title : title + '.'));
            if (description.length) {
                this.logger.info('  ' + description.join('.\n  '));
            }
            const result = await this.executeSchematic(migration.collection.name, migration.name);
            if (!result.success) {
                return false;
            }
            this.logger.info('  Migration completed.');
            // Commit migration
            if (commit) {
                const commitPrefix = `${packageName} migration - ${migration.name}`;
                const commitMessage = migration.description
                    ? `${commitPrefix}\n\n${migration.description}`
                    : commitPrefix;
                const committed = this.commit(commitMessage);
                if (!committed) {
                    // Failed to commit, something went wrong. Abort the update.
                    return false;
                }
            }
            this.logger.info(''); // Extra trailing newline.
        }
        return true;
    }
    // eslint-disable-next-line max-lines-per-function
    async run(options) {
        var _a;
        await (0, package_manager_1.ensureCompatibleNpm)(this.context.root);
        // Check if the current installed CLI version is older than the latest compatible version.
        if (!disableVersionCheck) {
            const cliVersionToInstall = await this.checkCLIVersion(options['--'], options.verbose, options.next);
            if (cliVersionToInstall) {
                this.logger.warn('The installed Angular CLI version is outdated.\n' +
                    `Installing a temporary Angular CLI versioned ${cliVersionToInstall} to perform the update.`);
                return (0, install_package_1.runTempPackageBin)(`@angular/cli@${cliVersionToInstall}`, this.packageManager, process.argv.slice(2));
            }
        }
        const logVerbose = (message) => {
            if (options.verbose) {
                this.logger.info(message);
            }
        };
        if (options.all) {
            const updateCmd = this.packageManager === workspace_schema_1.PackageManager.Yarn
                ? `'yarn upgrade-interactive' or 'yarn upgrade'`
                : `'${this.packageManager} update'`;
            this.logger.warn(`
        '--all' functionality has been removed as updating multiple packages at once is not recommended.
        To update packages which don’t provide 'ng update' capabilities in your workspace 'package.json' use ${updateCmd} instead.
        Run the package manager update command after updating packages which provide 'ng update' capabilities.
      `);
            return 0;
        }
        const packages = [];
        for (const request of options['--'] || []) {
            try {
                const packageIdentifier = (0, npm_package_arg_1.default)(request);
                // only registry identifiers are supported
                if (!packageIdentifier.registry) {
                    this.logger.error(`Package '${request}' is not a registry package identifer.`);
                    return 1;
                }
                if (packages.some((v) => v.name === packageIdentifier.name)) {
                    this.logger.error(`Duplicate package '${packageIdentifier.name}' specified.`);
                    return 1;
                }
                if (options.migrateOnly && packageIdentifier.rawSpec) {
                    this.logger.warn('Package specifier has no effect when using "migrate-only" option.');
                }
                // If next option is used and no specifier supplied, use next tag
                if (options.next && !packageIdentifier.rawSpec) {
                    packageIdentifier.fetchSpec = 'next';
                }
                packages.push(packageIdentifier);
            }
            catch (e) {
                this.logger.error(e.message);
                return 1;
            }
        }
        if (!options.migrateOnly && (options.from || options.to)) {
            this.logger.error('Can only use "from" or "to" options with "migrate-only" option.');
            return 1;
        }
        // If not asking for status then check for a clean git repository.
        // This allows the user to easily reset any changes from the update.
        if (packages.length && !this.checkCleanGit()) {
            if (options.allowDirty) {
                this.logger.warn('Repository is not clean. Update changes will be mixed with pre-existing changes.');
            }
            else {
                this.logger.error('Repository is not clean. Please commit or stash any changes before updating.');
                return 2;
            }
        }
        this.logger.info(`Using package manager: '${this.packageManager}'`);
        this.logger.info('Collecting installed dependencies...');
        const rootDependencies = await (0, package_tree_1.getProjectDependencies)(this.context.root);
        this.logger.info(`Found ${rootDependencies.size} dependencies.`);
        if (packages.length === 0) {
            // Show status
            const { success } = await this.executeSchematic(UPDATE_SCHEMATIC_COLLECTION, 'update', {
                force: options.force || false,
                next: options.next || false,
                verbose: options.verbose || false,
                packageManager: this.packageManager,
                packages: [],
            });
            return success ? 0 : 1;
        }
        if (options.migrateOnly) {
            if (!options.from && typeof options.migrateOnly !== 'string') {
                this.logger.error('"from" option is required when using the "migrate-only" option without a migration name.');
                return 1;
            }
            else if (packages.length !== 1) {
                this.logger.error('A single package must be specified when using the "migrate-only" option.');
                return 1;
            }
            if (options.next) {
                this.logger.warn('"next" option has no effect when using "migrate-only" option.');
            }
            const packageName = packages[0].name;
            const packageDependency = rootDependencies.get(packageName);
            let packagePath = packageDependency === null || packageDependency === void 0 ? void 0 : packageDependency.path;
            let packageNode = packageDependency === null || packageDependency === void 0 ? void 0 : packageDependency.package;
            if (packageDependency && !packageNode) {
                this.logger.error('Package found in package.json but is not installed.');
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
                this.logger.error('Package is not installed.');
                return 1;
            }
            const updateMetadata = packageNode['ng-update'];
            let migrations = updateMetadata === null || updateMetadata === void 0 ? void 0 : updateMetadata.migrations;
            if (migrations === undefined) {
                this.logger.error('Package does not provide migrations.');
                return 1;
            }
            else if (typeof migrations !== 'string') {
                this.logger.error('Package contains a malformed migrations field.');
                return 1;
            }
            else if (path.posix.isAbsolute(migrations) || path.win32.isAbsolute(migrations)) {
                this.logger.error('Package contains an invalid migrations field. Absolute paths are not permitted.');
                return 1;
            }
            // Normalize slashes
            migrations = migrations.replace(/\\/g, '/');
            if (migrations.startsWith('../')) {
                this.logger.error('Package contains an invalid migrations field. Paths outside the package root are not permitted.');
                return 1;
            }
            // Check if it is a package-local location
            const localMigrations = path.join(packagePath, migrations);
            if (fs.existsSync(localMigrations)) {
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
                        this.logger.error('Migrations for package were not found.');
                    }
                    else {
                        this.logger.error(`Unable to resolve migrations for package.  [${e.message}]`);
                    }
                    return 1;
                }
            }
            let result;
            if (typeof options.migrateOnly == 'string') {
                result = await this.executeMigration(packageName, migrations, options.migrateOnly, options.createCommits);
            }
            else {
                const from = coerceVersionNumber(options.from);
                if (!from) {
                    this.logger.error(`"from" value [${options.from}] is not a valid version.`);
                    return 1;
                }
                result = await this.executeMigrations(packageName, migrations, from, options.to || packageNode.version, options.createCommits);
            }
            return result ? 0 : 1;
        }
        const requests = [];
        // Validate packages actually are part of the workspace
        for (const pkg of packages) {
            const node = rootDependencies.get(pkg.name);
            if (!(node === null || node === void 0 ? void 0 : node.package)) {
                this.logger.error(`Package '${pkg.name}' is not a dependency.`);
                return 1;
            }
            // If a specific version is requested and matches the installed version, skip.
            if (pkg.type === 'version' && node.package.version === pkg.fetchSpec) {
                this.logger.info(`Package '${pkg.name}' is already at '${pkg.fetchSpec}'.`);
                continue;
            }
            requests.push({ identifier: pkg, node });
        }
        if (requests.length === 0) {
            return 0;
        }
        const packagesToUpdate = [];
        this.logger.info('Fetching dependency metadata from registry...');
        for (const { identifier: requestIdentifier, node } of requests) {
            const packageName = requestIdentifier.name;
            let metadata;
            try {
                // Metadata requests are internally cached; multiple requests for same name
                // does not result in additional network traffic
                metadata = await (0, package_metadata_1.fetchPackageMetadata)(packageName, this.logger, {
                    verbose: options.verbose,
                });
            }
            catch (e) {
                this.logger.error(`Error fetching metadata for '${packageName}': ` + e.message);
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
                this.logger.error(`Package specified by '${requestIdentifier.raw}' does not exist within the registry.`);
                return 1;
            }
            if (manifest.version === ((_a = node.package) === null || _a === void 0 ? void 0 : _a.version)) {
                this.logger.info(`Package '${packageName}' is already up to date.`);
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
                        this.logger.error(`Updating multiple major versions of '${name}' at once is not supported. Please migrate each major version individually.\n` +
                            `For more information about the update process, see https://update.angular.io/.`);
                    }
                    else {
                        const nextMajorVersionFromCurrent = currentMajorVersion + 1;
                        this.logger.error(`Updating multiple major versions of '${name}' at once is not supported. Please migrate each major version individually.\n` +
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
        const { success } = await this.executeSchematic(UPDATE_SCHEMATIC_COLLECTION, 'update', {
            verbose: options.verbose || false,
            force: options.force || false,
            next: !!options.next,
            packageManager: this.packageManager,
            packages: packagesToUpdate,
        });
        if (success) {
            try {
                // Remove existing node modules directory to provide a stronger guarantee that packages
                // will be hoisted into the correct locations.
                // The below should be removed and replaced with just `rm` when support for Node.Js 12 is removed.
                const { rm, rmdir } = fs.promises;
                if (rm) {
                    await rm(path.join(this.context.root, 'node_modules'), {
                        force: true,
                        recursive: true,
                        maxRetries: 3,
                    });
                }
                else {
                    await rmdir(path.join(this.context.root, 'node_modules'), {
                        recursive: true,
                        maxRetries: 3,
                    });
                }
            }
            catch (_b) { }
            const result = await (0, install_package_1.installAllPackages)(this.packageManager, options.force ? ['--force'] : [], this.context.root);
            if (result !== 0) {
                return result;
            }
        }
        if (success && options.createCommits) {
            const committed = this.commit(`Angular CLI update for packages - ${packagesToUpdate.join(', ')}`);
            if (!committed) {
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
                        this.logger.error(`Migrations for package (${migration.package}) were not found.` +
                            ' The package could not be found in the workspace.');
                    }
                    else {
                        this.logger.error(`Unable to resolve migrations for package (${migration.package}).  [${e.message}]`);
                    }
                    return 1;
                }
                let migrations;
                // Check if it is a package-local location
                const localMigrations = path.join(packagePath, migration.collection);
                if (fs.existsSync(localMigrations)) {
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
                            this.logger.error(`Migrations for package (${migration.package}) were not found.`);
                        }
                        else {
                            this.logger.error(`Unable to resolve migrations for package (${migration.package}).  [${e.message}]`);
                        }
                        return 1;
                    }
                }
                const result = await this.executeMigrations(migration.package, migrations, migration.from, migration.to, options.createCommits);
                if (!result) {
                    return 0;
                }
            }
        }
        return success ? 0 : 1;
    }
    /**
     * @return Whether or not the commit was successful.
     */
    commit(message) {
        // Check if a commit is needed.
        let commitNeeded;
        try {
            commitNeeded = hasChangesToCommit();
        }
        catch (err) {
            this.logger.error(`  Failed to read Git tree:\n${err.stderr}`);
            return false;
        }
        if (!commitNeeded) {
            this.logger.info('  No changes to commit after migration.');
            return true;
        }
        // Commit changes and abort on error.
        try {
            createCommit(message);
        }
        catch (err) {
            this.logger.error(`Failed to commit update (${message}):\n${err.stderr}`);
            return false;
        }
        // Notify user of the commit.
        const hash = findCurrentGitSha();
        const shortMessage = message.split('\n')[0];
        if (hash) {
            this.logger.info(`  Committed migration step (${getShortHash(hash)}): ${shortMessage}.`);
        }
        else {
            // Commit was successful, but reading the hash was not. Something weird happened,
            // but nothing that would stop the update. Just log the weirdness and continue.
            this.logger.info(`  Committed migration step: ${shortMessage}.`);
            this.logger.warn('  Failed to look up hash of most recent commit, continuing anyways.');
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
        const { version } = await (0, package_metadata_1.fetchPackageManifest)(`@angular/cli@${this.getCLIUpdateRunnerVersion(packagesToUpdate, next)}`, this.logger, {
            verbose,
            usingYarn: this.packageManager === workspace_schema_1.PackageManager.Yarn,
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
}
exports.UpdateCommand = UpdateCommand;
/**
 * @return Whether or not the working directory has Git changes to commit.
 */
function hasChangesToCommit() {
    // List all modified files not covered by .gitignore.
    const files = (0, child_process_1.execSync)('git ls-files -m -d -o --exclude-standard').toString();
    // If any files are returned, then there must be something to commit.
    return files !== '';
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
        const hash = (0, child_process_1.execSync)('git rev-parse HEAD', { encoding: 'utf8', stdio: 'pipe' });
        return hash.trim();
    }
    catch (_a) {
        return null;
    }
}
function getShortHash(commitHash) {
    return commitHash.slice(0, 9);
}
function coerceVersionNumber(version) {
    if (!version) {
        return null;
    }
    if (!version.match(/^\d{1,30}\.\d{1,30}\.\d{1,30}/)) {
        const match = version.match(/^\d{1,30}(\.\d{1,30})*/);
        if (!match) {
            return null;
        }
        if (!match[1]) {
            version = version.substr(0, match[0].length) + '.0.0' + version.substr(match[0].length);
        }
        else if (!match[2]) {
            version = version.substr(0, match[0].length) + '.0' + version.substr(match[0].length);
        }
        else {
            return null;
        }
    }
    return semver.valid(version);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy91cGRhdGUtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsMkRBQTJFO0FBQzNFLDREQUFnRTtBQUNoRSxpREFBeUM7QUFDekMsdUNBQXlCO0FBQ3pCLHNFQUFrQztBQUNsQywwRUFBNkM7QUFDN0MsMkNBQTZCO0FBQzdCLCtDQUFpQztBQUNqQyxxRUFBZ0U7QUFDaEUsK0NBQTRDO0FBRTVDLDJFQUFzRTtBQUN0RSwrQ0FBNEM7QUFDNUMsOENBQTRDO0FBQzVDLGtFQUFxRjtBQUNyRixvREFBNEQ7QUFDNUQsa0VBQXNGO0FBQ3RGLG9FQUt1QztBQUN2Qyw0REFLbUM7QUFHbkMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUMzQyxTQUFTLEVBQ1Qsa0RBQWtELENBQ25ELENBQUM7QUFFRjs7O0dBR0c7QUFDSCxNQUFNLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUN2RSxNQUFNLG1CQUFtQixHQUN2QixzQkFBc0IsS0FBSyxTQUFTO0lBQ3BDLHNCQUFzQixLQUFLLEdBQUc7SUFDOUIsc0JBQXNCLENBQUMsV0FBVyxFQUFFLEtBQUssT0FBTyxDQUFDO0FBRW5ELE1BQU0sdUJBQXVCLEdBQUcsNkJBQTZCLENBQUM7QUFFOUQsTUFBYSxhQUFjLFNBQVEsaUJBQTRCO0lBQS9EOztRQUMyQiwwQkFBcUIsR0FBRyxJQUFJLENBQUM7UUFFOUMsbUJBQWMsR0FBRyxpQ0FBYyxDQUFDLEdBQUcsQ0FBQztJQW0xQjlDLENBQUM7SUFqMUJVLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBd0M7UUFDaEUsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLElBQUEsbUNB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QUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDdkY7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7S0FDRjtJQUVELE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVdvcmtmbG93IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCBucGEgZnJvbSAnbnBtLXBhY2thZ2UtYXJnJztcbmltcG9ydCBwaWNrTWFuaWZlc3QgZnJvbSAnbnBtLXBpY2stbWFuaWZlc3QnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi9saWIvY29uZmlnL3dvcmtzcGFjZS1zY2hlbWEnO1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcbmltcG9ydCB7IEFyZ3VtZW50cyB9IGZyb20gJy4uL21vZGVscy9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgU2NoZW1hdGljRW5naW5lSG9zdCB9IGZyb20gJy4uL21vZGVscy9zY2hlbWF0aWMtZW5naW5lLWhvc3QnO1xuaW1wb3J0IHsgVkVSU0lPTiB9IGZyb20gJy4uL21vZGVscy92ZXJzaW9uJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBpbnN0YWxsQWxsUGFja2FnZXMsIHJ1blRlbXBQYWNrYWdlQmluIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2luc3RhbGwtcGFja2FnZSc7XG5pbXBvcnQgeyB3cml0ZUVycm9yVG9Mb2dGaWxlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2xvZy1maWxlJztcbmltcG9ydCB7IGVuc3VyZUNvbXBhdGlibGVOcG0sIGdldFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWFuYWdlcic7XG5pbXBvcnQge1xuICBQYWNrYWdlSWRlbnRpZmllcixcbiAgUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNYW5pZmVzdCxcbiAgZmV0Y2hQYWNrYWdlTWV0YWRhdGEsXG59IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLW1ldGFkYXRhJztcbmltcG9ydCB7XG4gIFBhY2thZ2VUcmVlTm9kZSxcbiAgZmluZFBhY2thZ2VKc29uLFxuICBnZXRQcm9qZWN0RGVwZW5kZW5jaWVzLFxuICByZWFkUGFja2FnZUpzb24sXG59IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLXRyZWUnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFVwZGF0ZUNvbW1hbmRTY2hlbWEgfSBmcm9tICcuL3VwZGF0ZSc7XG5cbmNvbnN0IFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTiA9IHBhdGguam9pbihcbiAgX19kaXJuYW1lLFxuICAnLi4vc3JjL2NvbW1hbmRzL3VwZGF0ZS9zY2hlbWF0aWMvY29sbGVjdGlvbi5qc29uJyxcbik7XG5cbi8qKlxuICogRGlzYWJsZSBDTEkgdmVyc2lvbiBtaXNtYXRjaCBjaGVja3MgYW5kIGZvcmNlcyB1c2FnZSBvZiB0aGUgaW52b2tlZCBDTElcbiAqIGluc3RlYWQgb2YgaW52b2tpbmcgdGhlIGxvY2FsIGluc3RhbGxlZCB2ZXJzaW9uLlxuICovXG5jb25zdCBkaXNhYmxlVmVyc2lvbkNoZWNrRW52ID0gcHJvY2Vzcy5lbnZbJ05HX0RJU0FCTEVfVkVSU0lPTl9DSEVDSyddO1xuY29uc3QgZGlzYWJsZVZlcnNpb25DaGVjayA9XG4gIGRpc2FibGVWZXJzaW9uQ2hlY2tFbnYgIT09IHVuZGVmaW5lZCAmJlxuICBkaXNhYmxlVmVyc2lvbkNoZWNrRW52ICE9PSAnMCcgJiZcbiAgZGlzYWJsZVZlcnNpb25DaGVja0Vudi50b0xvd2VyQ2FzZSgpICE9PSAnZmFsc2UnO1xuXG5jb25zdCBBTkdVTEFSX1BBQ0tBR0VTX1JFR0VYUCA9IC9eQCg/OmFuZ3VsYXJ8bmd1bml2ZXJzYWwpXFwvLztcblxuZXhwb3J0IGNsYXNzIFVwZGF0ZUNvbW1hbmQgZXh0ZW5kcyBDb21tYW5kPFVwZGF0ZUNvbW1hbmRTY2hlbWE+IHtcbiAgcHVibGljIG92ZXJyaWRlIHJlYWRvbmx5IGFsbG93TWlzc2luZ1dvcmtzcGFjZSA9IHRydWU7XG4gIHByaXZhdGUgd29ya2Zsb3chOiBOb2RlV29ya2Zsb3c7XG4gIHByaXZhdGUgcGFja2FnZU1hbmFnZXIgPSBQYWNrYWdlTWFuYWdlci5OcG07XG5cbiAgb3ZlcnJpZGUgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBVcGRhdGVDb21tYW5kU2NoZW1hICYgQXJndW1lbnRzKSB7XG4gICAgdGhpcy5wYWNrYWdlTWFuYWdlciA9IGF3YWl0IGdldFBhY2thZ2VNYW5hZ2VyKHRoaXMuY29udGV4dC5yb290KTtcbiAgICB0aGlzLndvcmtmbG93ID0gbmV3IE5vZGVXb3JrZmxvdyh0aGlzLmNvbnRleHQucm9vdCwge1xuICAgICAgcGFja2FnZU1hbmFnZXI6IHRoaXMucGFja2FnZU1hbmFnZXIsXG4gICAgICBwYWNrYWdlTWFuYWdlckZvcmNlOiBvcHRpb25zLmZvcmNlLFxuICAgICAgLy8gX19kaXJuYW1lIC0+IGZhdm9yIEBzY2hlbWF0aWNzL3VwZGF0ZSBmcm9tIHRoaXMgcGFja2FnZVxuICAgICAgLy8gT3RoZXJ3aXNlLCB1c2UgcGFja2FnZXMgZnJvbSB0aGUgYWN0aXZlIHdvcmtzcGFjZSAobWlncmF0aW9ucylcbiAgICAgIHJlc29sdmVQYXRoczogW19fZGlybmFtZSwgdGhpcy5jb250ZXh0LnJvb3RdLFxuICAgICAgc2NoZW1hVmFsaWRhdGlvbjogdHJ1ZSxcbiAgICAgIGVuZ2luZUhvc3RDcmVhdG9yOiAob3B0aW9ucykgPT4gbmV3IFNjaGVtYXRpY0VuZ2luZUhvc3Qob3B0aW9ucy5yZXNvbHZlUGF0aHMpLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlU2NoZW1hdGljKFxuICAgIGNvbGxlY3Rpb246IHN0cmluZyxcbiAgICBzY2hlbWF0aWM6IHN0cmluZyxcbiAgICBvcHRpb25zID0ge30sXG4gICk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBmaWxlczogU2V0PHN0cmluZz4gfT4ge1xuICAgIGxldCBlcnJvciA9IGZhbHNlO1xuICAgIGxldCBsb2dzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IGZpbGVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICBjb25zdCByZXBvcnRlclN1YnNjcmlwdGlvbiA9IHRoaXMud29ya2Zsb3cucmVwb3J0ZXIuc3Vic2NyaWJlKChldmVudCkgPT4ge1xuICAgICAgLy8gU3RyaXAgbGVhZGluZyBzbGFzaCB0byBwcmV2ZW50IGNvbmZ1c2lvbi5cbiAgICAgIGNvbnN0IGV2ZW50UGF0aCA9IGV2ZW50LnBhdGguc3RhcnRzV2l0aCgnLycpID8gZXZlbnQucGF0aC5zdWJzdHIoMSkgOiBldmVudC5wYXRoO1xuXG4gICAgICBzd2l0Y2ggKGV2ZW50LmtpbmQpIHtcbiAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgIGVycm9yID0gdHJ1ZTtcbiAgICAgICAgICBjb25zdCBkZXNjID0gZXZlbnQuZGVzY3JpcHRpb24gPT0gJ2FscmVhZHlFeGlzdCcgPyAnYWxyZWFkeSBleGlzdHMnIDogJ2RvZXMgbm90IGV4aXN0Lic7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoYEVSUk9SISAke2V2ZW50UGF0aH0gJHtkZXNjfS5gKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAndXBkYXRlJzpcbiAgICAgICAgICBsb2dzLnB1c2goYCR7Y29sb3JzLmN5YW4oJ1VQREFURScpfSAke2V2ZW50UGF0aH0gKCR7ZXZlbnQuY29udGVudC5sZW5ndGh9IGJ5dGVzKWApO1xuICAgICAgICAgIGZpbGVzLmFkZChldmVudFBhdGgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjcmVhdGUnOlxuICAgICAgICAgIGxvZ3MucHVzaChgJHtjb2xvcnMuZ3JlZW4oJ0NSRUFURScpfSAke2V2ZW50UGF0aH0gKCR7ZXZlbnQuY29udGVudC5sZW5ndGh9IGJ5dGVzKWApO1xuICAgICAgICAgIGZpbGVzLmFkZChldmVudFBhdGgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICAgIGxvZ3MucHVzaChgJHtjb2xvcnMueWVsbG93KCdERUxFVEUnKX0gJHtldmVudFBhdGh9YCk7XG4gICAgICAgICAgZmlsZXMuYWRkKGV2ZW50UGF0aCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3JlbmFtZSc6XG4gICAgICAgICAgY29uc3QgZXZlbnRUb1BhdGggPSBldmVudC50by5zdGFydHNXaXRoKCcvJykgPyBldmVudC50by5zdWJzdHIoMSkgOiBldmVudC50bztcbiAgICAgICAgICBsb2dzLnB1c2goYCR7Y29sb3JzLmJsdWUoJ1JFTkFNRScpfSAke2V2ZW50UGF0aH0gPT4gJHtldmVudFRvUGF0aH1gKTtcbiAgICAgICAgICBmaWxlcy5hZGQoZXZlbnRQYXRoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGxpZmVjeWNsZVN1YnNjcmlwdGlvbiA9IHRoaXMud29ya2Zsb3cubGlmZUN5Y2xlLnN1YnNjcmliZSgoZXZlbnQpID0+IHtcbiAgICAgIGlmIChldmVudC5raW5kID09ICdlbmQnIHx8IGV2ZW50LmtpbmQgPT0gJ3Bvc3QtdGFza3Mtc3RhcnQnKSB7XG4gICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAvLyBPdXRwdXQgdGhlIGxvZ2dpbmcgcXVldWUsIG5vIGVycm9yIGhhcHBlbmVkLlxuICAgICAgICAgIGxvZ3MuZm9yRWFjaCgobG9nKSA9PiB0aGlzLmxvZ2dlci5pbmZvKGAgICR7bG9nfWApKTtcbiAgICAgICAgICBsb2dzID0gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFRPRE86IEFsbG93IHBhc3NpbmcgYSBzY2hlbWF0aWMgaW5zdGFuY2UgZGlyZWN0bHlcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy53b3JrZmxvd1xuICAgICAgICAuZXhlY3V0ZSh7XG4gICAgICAgICAgY29sbGVjdGlvbixcbiAgICAgICAgICBzY2hlbWF0aWMsXG4gICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICBsb2dnZXI6IHRoaXMubG9nZ2VyLFxuICAgICAgICB9KVxuICAgICAgICAudG9Qcm9taXNlKCk7XG5cbiAgICAgIHJlcG9ydGVyU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICBsaWZlY3ljbGVTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcblxuICAgICAgcmV0dXJuIHsgc3VjY2VzczogIWVycm9yLCBmaWxlcyB9O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgVW5zdWNjZXNzZnVsV29ya2Zsb3dFeGVjdXRpb24pIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgYCR7Y29sb3JzLnN5bWJvbHMuY3Jvc3N9IE1pZ3JhdGlvbiBmYWlsZWQuIFNlZSBhYm92ZSBmb3IgZnVydGhlciBkZXRhaWxzLlxcbmAsXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBsb2dQYXRoID0gd3JpdGVFcnJvclRvTG9nRmlsZShlKTtcbiAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoXG4gICAgICAgICAgYCR7Y29sb3JzLnN5bWJvbHMuY3Jvc3N9IE1pZ3JhdGlvbiBmYWlsZWQ6ICR7ZS5tZXNzYWdlfVxcbmAgK1xuICAgICAgICAgICAgYCAgU2VlIFwiJHtsb2dQYXRofVwiIGZvciBmdXJ0aGVyIGRldGFpbHMuXFxuYCxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGZpbGVzIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIG1pZ3JhdGlvbiB3YXMgcGVyZm9ybWVkIHN1Y2Nlc3NmdWxseS5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZU1pZ3JhdGlvbihcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIGNvbGxlY3Rpb25QYXRoOiBzdHJpbmcsXG4gICAgbWlncmF0aW9uTmFtZTogc3RyaW5nLFxuICAgIGNvbW1pdD86IGJvb2xlYW4sXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB0aGlzLndvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25QYXRoKTtcbiAgICBjb25zdCBuYW1lID0gY29sbGVjdGlvbi5saXN0U2NoZW1hdGljTmFtZXMoKS5maW5kKChuYW1lKSA9PiBuYW1lID09PSBtaWdyYXRpb25OYW1lKTtcbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGBDYW5ub3QgZmluZCBtaWdyYXRpb24gJyR7bWlncmF0aW9uTmFtZX0nIGluICcke3BhY2thZ2VOYW1lfScuYCk7XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBzY2hlbWF0aWMgPSB0aGlzLndvcmtmbG93LmVuZ2luZS5jcmVhdGVTY2hlbWF0aWMobmFtZSwgY29sbGVjdGlvbik7XG5cbiAgICB0aGlzLmxvZ2dlci5pbmZvKFxuICAgICAgY29sb3JzLmN5YW4oYCoqIEV4ZWN1dGluZyAnJHttaWdyYXRpb25OYW1lfScgb2YgcGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nICoqXFxuYCksXG4gICAgKTtcblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyhbc2NoZW1hdGljLmRlc2NyaXB0aW9uXSwgcGFja2FnZU5hbWUsIGNvbW1pdCk7XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgbWlncmF0aW9ucyB3ZXJlIHBlcmZvcm1lZCBzdWNjZXNzZnVsbHkuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVNaWdyYXRpb25zKFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgY29sbGVjdGlvblBhdGg6IHN0cmluZyxcbiAgICBmcm9tOiBzdHJpbmcsXG4gICAgdG86IHN0cmluZyxcbiAgICBjb21taXQ/OiBib29sZWFuLFxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gdGhpcy53b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uUGF0aCk7XG4gICAgY29uc3QgbWlncmF0aW9uUmFuZ2UgPSBuZXcgc2VtdmVyLlJhbmdlKFxuICAgICAgJz4nICsgKHNlbXZlci5wcmVyZWxlYXNlKGZyb20pID8gZnJvbS5zcGxpdCgnLScpWzBdICsgJy0wJyA6IGZyb20pICsgJyA8PScgKyB0by5zcGxpdCgnLScpWzBdLFxuICAgICk7XG4gICAgY29uc3QgbWlncmF0aW9ucyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKCkpIHtcbiAgICAgIGNvbnN0IHNjaGVtYXRpYyA9IHRoaXMud29ya2Zsb3cuZW5naW5lLmNyZWF0ZVNjaGVtYXRpYyhuYW1lLCBjb2xsZWN0aW9uKTtcbiAgICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gc2NoZW1hdGljLmRlc2NyaXB0aW9uIGFzIHR5cGVvZiBzY2hlbWF0aWMuZGVzY3JpcHRpb24gJiB7XG4gICAgICAgIHZlcnNpb24/OiBzdHJpbmc7XG4gICAgICB9O1xuICAgICAgZGVzY3JpcHRpb24udmVyc2lvbiA9IGNvZXJjZVZlcnNpb25OdW1iZXIoZGVzY3JpcHRpb24udmVyc2lvbikgfHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKCFkZXNjcmlwdGlvbi52ZXJzaW9uKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2VtdmVyLnNhdGlzZmllcyhkZXNjcmlwdGlvbi52ZXJzaW9uLCBtaWdyYXRpb25SYW5nZSwgeyBpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZSB9KSkge1xuICAgICAgICBtaWdyYXRpb25zLnB1c2goZGVzY3JpcHRpb24gYXMgdHlwZW9mIHNjaGVtYXRpYy5kZXNjcmlwdGlvbiAmIHsgdmVyc2lvbjogc3RyaW5nIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIG1pZ3JhdGlvbnMuc29ydCgoYSwgYikgPT4gc2VtdmVyLmNvbXBhcmUoYS52ZXJzaW9uLCBiLnZlcnNpb24pIHx8IGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSkpO1xuXG4gICAgaWYgKG1pZ3JhdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5pbmZvKGNvbG9ycy5jeWFuKGAqKiBFeGVjdXRpbmcgbWlncmF0aW9ucyBvZiBwYWNrYWdlICcke3BhY2thZ2VOYW1lfScgKipcXG5gKSk7XG5cbiAgICByZXR1cm4gdGhpcy5leGVjdXRlUGFja2FnZU1pZ3JhdGlvbnMobWlncmF0aW9ucywgcGFja2FnZU5hbWUsIGNvbW1pdCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyhcbiAgICBtaWdyYXRpb25zOiBJdGVyYWJsZTx7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb246IHN0cmluZzsgY29sbGVjdGlvbjogeyBuYW1lOiBzdHJpbmcgfSB9PixcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIGNvbW1pdCA9IGZhbHNlLFxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBmb3IgKGNvbnN0IG1pZ3JhdGlvbiBvZiBtaWdyYXRpb25zKSB7XG4gICAgICBjb25zdCBbdGl0bGUsIC4uLmRlc2NyaXB0aW9uXSA9IG1pZ3JhdGlvbi5kZXNjcmlwdGlvbi5zcGxpdCgnLiAnKTtcblxuICAgICAgdGhpcy5sb2dnZXIuaW5mbyhcbiAgICAgICAgY29sb3JzLmN5YW4oY29sb3JzLnN5bWJvbHMucG9pbnRlcikgK1xuICAgICAgICAgICcgJyArXG4gICAgICAgICAgY29sb3JzLmJvbGQodGl0bGUuZW5kc1dpdGgoJy4nKSA/IHRpdGxlIDogdGl0bGUgKyAnLicpLFxuICAgICAgKTtcblxuICAgICAgaWYgKGRlc2NyaXB0aW9uLmxlbmd0aCkge1xuICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKCcgICcgKyBkZXNjcmlwdGlvbi5qb2luKCcuXFxuICAnKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyhtaWdyYXRpb24uY29sbGVjdGlvbi5uYW1lLCBtaWdyYXRpb24ubmFtZSk7XG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5sb2dnZXIuaW5mbygnICBNaWdyYXRpb24gY29tcGxldGVkLicpO1xuXG4gICAgICAvLyBDb21taXQgbWlncmF0aW9uXG4gICAgICBpZiAoY29tbWl0KSB7XG4gICAgICAgIGNvbnN0IGNvbW1pdFByZWZpeCA9IGAke3BhY2thZ2VOYW1lfSBtaWdyYXRpb24gLSAke21pZ3JhdGlvbi5uYW1lfWA7XG4gICAgICAgIGNvbnN0IGNvbW1pdE1lc3NhZ2UgPSBtaWdyYXRpb24uZGVzY3JpcHRpb25cbiAgICAgICAgICA/IGAke2NvbW1pdFByZWZpeH1cXG5cXG4ke21pZ3JhdGlvbi5kZXNjcmlwdGlvbn1gXG4gICAgICAgICAgOiBjb21taXRQcmVmaXg7XG4gICAgICAgIGNvbnN0IGNvbW1pdHRlZCA9IHRoaXMuY29tbWl0KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgICBpZiAoIWNvbW1pdHRlZCkge1xuICAgICAgICAgIC8vIEZhaWxlZCB0byBjb21taXQsIHNvbWV0aGluZyB3ZW50IHdyb25nLiBBYm9ydCB0aGUgdXBkYXRlLlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCcnKTsgLy8gRXh0cmEgdHJhaWxpbmcgbmV3bGluZS5cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGluZXMtcGVyLWZ1bmN0aW9uXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBVcGRhdGVDb21tYW5kU2NoZW1hICYgQXJndW1lbnRzKSB7XG4gICAgYXdhaXQgZW5zdXJlQ29tcGF0aWJsZU5wbSh0aGlzLmNvbnRleHQucm9vdCk7XG5cbiAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBpbnN0YWxsZWQgQ0xJIHZlcnNpb24gaXMgb2xkZXIgdGhhbiB0aGUgbGF0ZXN0IGNvbXBhdGlibGUgdmVyc2lvbi5cbiAgICBpZiAoIWRpc2FibGVWZXJzaW9uQ2hlY2spIHtcbiAgICAgIGNvbnN0IGNsaVZlcnNpb25Ub0luc3RhbGwgPSBhd2FpdCB0aGlzLmNoZWNrQ0xJVmVyc2lvbihcbiAgICAgICAgb3B0aW9uc1snLS0nXSxcbiAgICAgICAgb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICBvcHRpb25zLm5leHQsXG4gICAgICApO1xuXG4gICAgICBpZiAoY2xpVmVyc2lvblRvSW5zdGFsbCkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICdUaGUgaW5zdGFsbGVkIEFuZ3VsYXIgQ0xJIHZlcnNpb24gaXMgb3V0ZGF0ZWQuXFxuJyArXG4gICAgICAgICAgICBgSW5zdGFsbGluZyBhIHRlbXBvcmFyeSBBbmd1bGFyIENMSSB2ZXJzaW9uZWQgJHtjbGlWZXJzaW9uVG9JbnN0YWxsfSB0byBwZXJmb3JtIHRoZSB1cGRhdGUuYCxcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gcnVuVGVtcFBhY2thZ2VCaW4oXG4gICAgICAgICAgYEBhbmd1bGFyL2NsaUAke2NsaVZlcnNpb25Ub0luc3RhbGx9YCxcbiAgICAgICAgICB0aGlzLnBhY2thZ2VNYW5hZ2VyLFxuICAgICAgICAgIHByb2Nlc3MuYXJndi5zbGljZSgyKSxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBsb2dWZXJib3NlID0gKG1lc3NhZ2U6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKG1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAob3B0aW9ucy5hbGwpIHtcbiAgICAgIGNvbnN0IHVwZGF0ZUNtZCA9XG4gICAgICAgIHRoaXMucGFja2FnZU1hbmFnZXIgPT09IFBhY2thZ2VNYW5hZ2VyLllhcm5cbiAgICAgICAgICA/IGAneWFybiB1cGdyYWRlLWludGVyYWN0aXZlJyBvciAneWFybiB1cGdyYWRlJ2BcbiAgICAgICAgICA6IGAnJHt0aGlzLnBhY2thZ2VNYW5hZ2VyfSB1cGRhdGUnYDtcblxuICAgICAgdGhpcy5sb2dnZXIud2FybihgXG4gICAgICAgICctLWFsbCcgZnVuY3Rpb25hbGl0eSBoYXMgYmVlbiByZW1vdmVkIGFzIHVwZGF0aW5nIG11bHRpcGxlIHBhY2thZ2VzIGF0IG9uY2UgaXMgbm90IHJlY29tbWVuZGVkLlxuICAgICAgICBUbyB1cGRhdGUgcGFja2FnZXMgd2hpY2ggZG9u4oCZdCBwcm92aWRlICduZyB1cGRhdGUnIGNhcGFiaWxpdGllcyBpbiB5b3VyIHdvcmtzcGFjZSAncGFja2FnZS5qc29uJyB1c2UgJHt1cGRhdGVDbWR9IGluc3RlYWQuXG4gICAgICAgIFJ1biB0aGUgcGFja2FnZSBtYW5hZ2VyIHVwZGF0ZSBjb21tYW5kIGFmdGVyIHVwZGF0aW5nIHBhY2thZ2VzIHdoaWNoIHByb3ZpZGUgJ25nIHVwZGF0ZScgY2FwYWJpbGl0aWVzLlxuICAgICAgYCk7XG5cbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGNvbnN0IHBhY2thZ2VzOiBQYWNrYWdlSWRlbnRpZmllcltdID0gW107XG4gICAgZm9yIChjb25zdCByZXF1ZXN0IG9mIG9wdGlvbnNbJy0tJ10gfHwgW10pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHBhY2thZ2VJZGVudGlmaWVyID0gbnBhKHJlcXVlc3QpO1xuXG4gICAgICAgIC8vIG9ubHkgcmVnaXN0cnkgaWRlbnRpZmllcnMgYXJlIHN1cHBvcnRlZFxuICAgICAgICBpZiAoIXBhY2thZ2VJZGVudGlmaWVyLnJlZ2lzdHJ5KSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoYFBhY2thZ2UgJyR7cmVxdWVzdH0nIGlzIG5vdCBhIHJlZ2lzdHJ5IHBhY2thZ2UgaWRlbnRpZmVyLmApO1xuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocGFja2FnZXMuc29tZSgodikgPT4gdi5uYW1lID09PSBwYWNrYWdlSWRlbnRpZmllci5uYW1lKSkge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGBEdXBsaWNhdGUgcGFja2FnZSAnJHtwYWNrYWdlSWRlbnRpZmllci5uYW1lfScgc3BlY2lmaWVkLmApO1xuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5taWdyYXRlT25seSAmJiBwYWNrYWdlSWRlbnRpZmllci5yYXdTcGVjKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybignUGFja2FnZSBzcGVjaWZpZXIgaGFzIG5vIGVmZmVjdCB3aGVuIHVzaW5nIFwibWlncmF0ZS1vbmx5XCIgb3B0aW9uLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgbmV4dCBvcHRpb24gaXMgdXNlZCBhbmQgbm8gc3BlY2lmaWVyIHN1cHBsaWVkLCB1c2UgbmV4dCB0YWdcbiAgICAgICAgaWYgKG9wdGlvbnMubmV4dCAmJiAhcGFja2FnZUlkZW50aWZpZXIucmF3U3BlYykge1xuICAgICAgICAgIHBhY2thZ2VJZGVudGlmaWVyLmZldGNoU3BlYyA9ICduZXh0JztcbiAgICAgICAgfVxuXG4gICAgICAgIHBhY2thZ2VzLnB1c2gocGFja2FnZUlkZW50aWZpZXIgYXMgUGFja2FnZUlkZW50aWZpZXIpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihlLm1lc3NhZ2UpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghb3B0aW9ucy5taWdyYXRlT25seSAmJiAob3B0aW9ucy5mcm9tIHx8IG9wdGlvbnMudG8pKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignQ2FuIG9ubHkgdXNlIFwiZnJvbVwiIG9yIFwidG9cIiBvcHRpb25zIHdpdGggXCJtaWdyYXRlLW9ubHlcIiBvcHRpb24uJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIC8vIElmIG5vdCBhc2tpbmcgZm9yIHN0YXR1cyB0aGVuIGNoZWNrIGZvciBhIGNsZWFuIGdpdCByZXBvc2l0b3J5LlxuICAgIC8vIFRoaXMgYWxsb3dzIHRoZSB1c2VyIHRvIGVhc2lseSByZXNldCBhbnkgY2hhbmdlcyBmcm9tIHRoZSB1cGRhdGUuXG4gICAgaWYgKHBhY2thZ2VzLmxlbmd0aCAmJiAhdGhpcy5jaGVja0NsZWFuR2l0KCkpIHtcbiAgICAgIGlmIChvcHRpb25zLmFsbG93RGlydHkpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAnUmVwb3NpdG9yeSBpcyBub3QgY2xlYW4uIFVwZGF0ZSBjaGFuZ2VzIHdpbGwgYmUgbWl4ZWQgd2l0aCBwcmUtZXhpc3RpbmcgY2hhbmdlcy4nLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgJ1JlcG9zaXRvcnkgaXMgbm90IGNsZWFuLiBQbGVhc2UgY29tbWl0IG9yIHN0YXNoIGFueSBjaGFuZ2VzIGJlZm9yZSB1cGRhdGluZy4nLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiAyO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmluZm8oYFVzaW5nIHBhY2thZ2UgbWFuYWdlcjogJyR7dGhpcy5wYWNrYWdlTWFuYWdlcn0nYCk7XG4gICAgdGhpcy5sb2dnZXIuaW5mbygnQ29sbGVjdGluZyBpbnN0YWxsZWQgZGVwZW5kZW5jaWVzLi4uJyk7XG5cbiAgICBjb25zdCByb290RGVwZW5kZW5jaWVzID0gYXdhaXQgZ2V0UHJvamVjdERlcGVuZGVuY2llcyh0aGlzLmNvbnRleHQucm9vdCk7XG5cbiAgICB0aGlzLmxvZ2dlci5pbmZvKGBGb3VuZCAke3Jvb3REZXBlbmRlbmNpZXMuc2l6ZX0gZGVwZW5kZW5jaWVzLmApO1xuXG4gICAgaWYgKHBhY2thZ2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gU2hvdyBzdGF0dXNcbiAgICAgIGNvbnN0IHsgc3VjY2VzcyB9ID0gYXdhaXQgdGhpcy5leGVjdXRlU2NoZW1hdGljKFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTiwgJ3VwZGF0ZScsIHtcbiAgICAgICAgZm9yY2U6IG9wdGlvbnMuZm9yY2UgfHwgZmFsc2UsXG4gICAgICAgIG5leHQ6IG9wdGlvbnMubmV4dCB8fCBmYWxzZSxcbiAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlIHx8IGZhbHNlLFxuICAgICAgICBwYWNrYWdlTWFuYWdlcjogdGhpcy5wYWNrYWdlTWFuYWdlcixcbiAgICAgICAgcGFja2FnZXM6IFtdLFxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBzdWNjZXNzID8gMCA6IDE7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMubWlncmF0ZU9ubHkpIHtcbiAgICAgIGlmICghb3B0aW9ucy5mcm9tICYmIHR5cGVvZiBvcHRpb25zLm1pZ3JhdGVPbmx5ICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAnXCJmcm9tXCIgb3B0aW9uIGlzIHJlcXVpcmVkIHdoZW4gdXNpbmcgdGhlIFwibWlncmF0ZS1vbmx5XCIgb3B0aW9uIHdpdGhvdXQgYSBtaWdyYXRpb24gbmFtZS4nLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSBlbHNlIGlmIChwYWNrYWdlcy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgJ0Egc2luZ2xlIHBhY2thZ2UgbXVzdCBiZSBzcGVjaWZpZWQgd2hlbiB1c2luZyB0aGUgXCJtaWdyYXRlLW9ubHlcIiBvcHRpb24uJyxcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9wdGlvbnMubmV4dCkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdcIm5leHRcIiBvcHRpb24gaGFzIG5vIGVmZmVjdCB3aGVuIHVzaW5nIFwibWlncmF0ZS1vbmx5XCIgb3B0aW9uLicpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwYWNrYWdlTmFtZSA9IHBhY2thZ2VzWzBdLm5hbWU7XG4gICAgICBjb25zdCBwYWNrYWdlRGVwZW5kZW5jeSA9IHJvb3REZXBlbmRlbmNpZXMuZ2V0KHBhY2thZ2VOYW1lKTtcbiAgICAgIGxldCBwYWNrYWdlUGF0aCA9IHBhY2thZ2VEZXBlbmRlbmN5Py5wYXRoO1xuICAgICAgbGV0IHBhY2thZ2VOb2RlID0gcGFja2FnZURlcGVuZGVuY3k/LnBhY2thZ2U7XG4gICAgICBpZiAocGFja2FnZURlcGVuZGVuY3kgJiYgIXBhY2thZ2VOb2RlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdQYWNrYWdlIGZvdW5kIGluIHBhY2thZ2UuanNvbiBidXQgaXMgbm90IGluc3RhbGxlZC4nKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH0gZWxzZSBpZiAoIXBhY2thZ2VEZXBlbmRlbmN5KSB7XG4gICAgICAgIC8vIEFsbG93IHJ1bm5pbmcgbWlncmF0aW9ucyBvbiB0cmFuc2l0aXZlbHkgaW5zdGFsbGVkIGRlcGVuZGVuY2llc1xuICAgICAgICAvLyBUaGVyZSBjYW4gdGVjaG5pY2FsbHkgYmUgbmVzdGVkIG11bHRpcGxlIHZlcnNpb25zXG4gICAgICAgIC8vIFRPRE86IElmIG11bHRpcGxlLCB0aGlzIHNob3VsZCBmaW5kIGFsbCB2ZXJzaW9ucyBhbmQgYXNrIHdoaWNoIG9uZSB0byB1c2VcbiAgICAgICAgY29uc3QgcGFja2FnZUpzb24gPSBmaW5kUGFja2FnZUpzb24odGhpcy5jb250ZXh0LnJvb3QsIHBhY2thZ2VOYW1lKTtcbiAgICAgICAgaWYgKHBhY2thZ2VKc29uKSB7XG4gICAgICAgICAgcGFja2FnZVBhdGggPSBwYXRoLmRpcm5hbWUocGFja2FnZUpzb24pO1xuICAgICAgICAgIHBhY2thZ2VOb2RlID0gYXdhaXQgcmVhZFBhY2thZ2VKc29uKHBhY2thZ2VKc29uKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIXBhY2thZ2VOb2RlIHx8ICFwYWNrYWdlUGF0aCkge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignUGFja2FnZSBpcyBub3QgaW5zdGFsbGVkLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB1cGRhdGVNZXRhZGF0YSA9IHBhY2thZ2VOb2RlWyduZy11cGRhdGUnXTtcbiAgICAgIGxldCBtaWdyYXRpb25zID0gdXBkYXRlTWV0YWRhdGE/Lm1pZ3JhdGlvbnM7XG4gICAgICBpZiAobWlncmF0aW9ucyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdQYWNrYWdlIGRvZXMgbm90IHByb3ZpZGUgbWlncmF0aW9ucy4nKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG1pZ3JhdGlvbnMgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdQYWNrYWdlIGNvbnRhaW5zIGEgbWFsZm9ybWVkIG1pZ3JhdGlvbnMgZmllbGQuJyk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2UgaWYgKHBhdGgucG9zaXguaXNBYnNvbHV0ZShtaWdyYXRpb25zKSB8fCBwYXRoLndpbjMyLmlzQWJzb2x1dGUobWlncmF0aW9ucykpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgJ1BhY2thZ2UgY29udGFpbnMgYW4gaW52YWxpZCBtaWdyYXRpb25zIGZpZWxkLiBBYnNvbHV0ZSBwYXRocyBhcmUgbm90IHBlcm1pdHRlZC4nLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICAvLyBOb3JtYWxpemUgc2xhc2hlc1xuICAgICAgbWlncmF0aW9ucyA9IG1pZ3JhdGlvbnMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gICAgICBpZiAobWlncmF0aW9ucy5zdGFydHNXaXRoKCcuLi8nKSkge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAnUGFja2FnZSBjb250YWlucyBhbiBpbnZhbGlkIG1pZ3JhdGlvbnMgZmllbGQuIFBhdGhzIG91dHNpZGUgdGhlIHBhY2thZ2Ugcm9vdCBhcmUgbm90IHBlcm1pdHRlZC4nLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBpZiBpdCBpcyBhIHBhY2thZ2UtbG9jYWwgbG9jYXRpb25cbiAgICAgIGNvbnN0IGxvY2FsTWlncmF0aW9ucyA9IHBhdGguam9pbihwYWNrYWdlUGF0aCwgbWlncmF0aW9ucyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhsb2NhbE1pZ3JhdGlvbnMpKSB7XG4gICAgICAgIG1pZ3JhdGlvbnMgPSBsb2NhbE1pZ3JhdGlvbnM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUcnkgdG8gcmVzb2x2ZSBmcm9tIHBhY2thZ2UgbG9jYXRpb24uXG4gICAgICAgIC8vIFRoaXMgYXZvaWRzIGlzc3VlcyB3aXRoIHBhY2thZ2UgaG9pc3RpbmcuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbWlncmF0aW9ucyA9IHJlcXVpcmUucmVzb2x2ZShtaWdyYXRpb25zLCB7IHBhdGhzOiBbcGFja2FnZVBhdGhdIH0pO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignTWlncmF0aW9ucyBmb3IgcGFja2FnZSB3ZXJlIG5vdCBmb3VuZC4nKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UuICBbJHtlLm1lc3NhZ2V9XWApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGxldCByZXN1bHQ6IGJvb2xlYW47XG4gICAgICBpZiAodHlwZW9mIG9wdGlvbnMubWlncmF0ZU9ubHkgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlTWlncmF0aW9uKFxuICAgICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICAgIG1pZ3JhdGlvbnMsXG4gICAgICAgICAgb3B0aW9ucy5taWdyYXRlT25seSxcbiAgICAgICAgICBvcHRpb25zLmNyZWF0ZUNvbW1pdHMsXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmcm9tID0gY29lcmNlVmVyc2lvbk51bWJlcihvcHRpb25zLmZyb20pO1xuICAgICAgICBpZiAoIWZyb20pIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihgXCJmcm9tXCIgdmFsdWUgWyR7b3B0aW9ucy5mcm9tfV0gaXMgbm90IGEgdmFsaWQgdmVyc2lvbi5gKTtcblxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlTWlncmF0aW9ucyhcbiAgICAgICAgICBwYWNrYWdlTmFtZSxcbiAgICAgICAgICBtaWdyYXRpb25zLFxuICAgICAgICAgIGZyb20sXG4gICAgICAgICAgb3B0aW9ucy50byB8fCBwYWNrYWdlTm9kZS52ZXJzaW9uLFxuICAgICAgICAgIG9wdGlvbnMuY3JlYXRlQ29tbWl0cyxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdCA/IDAgOiAxO1xuICAgIH1cblxuICAgIGNvbnN0IHJlcXVlc3RzOiB7XG4gICAgICBpZGVudGlmaWVyOiBQYWNrYWdlSWRlbnRpZmllcjtcbiAgICAgIG5vZGU6IFBhY2thZ2VUcmVlTm9kZTtcbiAgICB9W10gPSBbXTtcblxuICAgIC8vIFZhbGlkYXRlIHBhY2thZ2VzIGFjdHVhbGx5IGFyZSBwYXJ0IG9mIHRoZSB3b3Jrc3BhY2VcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlcykge1xuICAgICAgY29uc3Qgbm9kZSA9IHJvb3REZXBlbmRlbmNpZXMuZ2V0KHBrZy5uYW1lKTtcbiAgICAgIGlmICghbm9kZT8ucGFja2FnZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihgUGFja2FnZSAnJHtwa2cubmFtZX0nIGlzIG5vdCBhIGRlcGVuZGVuY3kuYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIGEgc3BlY2lmaWMgdmVyc2lvbiBpcyByZXF1ZXN0ZWQgYW5kIG1hdGNoZXMgdGhlIGluc3RhbGxlZCB2ZXJzaW9uLCBza2lwLlxuICAgICAgaWYgKHBrZy50eXBlID09PSAndmVyc2lvbicgJiYgbm9kZS5wYWNrYWdlLnZlcnNpb24gPT09IHBrZy5mZXRjaFNwZWMpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgUGFja2FnZSAnJHtwa2cubmFtZX0nIGlzIGFscmVhZHkgYXQgJyR7cGtnLmZldGNoU3BlY30nLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdHMucHVzaCh7IGlkZW50aWZpZXI6IHBrZywgbm9kZSB9KTtcbiAgICB9XG5cbiAgICBpZiAocmVxdWVzdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlc1RvVXBkYXRlOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgdGhpcy5sb2dnZXIuaW5mbygnRmV0Y2hpbmcgZGVwZW5kZW5jeSBtZXRhZGF0YSBmcm9tIHJlZ2lzdHJ5Li4uJyk7XG4gICAgZm9yIChjb25zdCB7IGlkZW50aWZpZXI6IHJlcXVlc3RJZGVudGlmaWVyLCBub2RlIH0gb2YgcmVxdWVzdHMpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VOYW1lID0gcmVxdWVzdElkZW50aWZpZXIubmFtZTtcblxuICAgICAgbGV0IG1ldGFkYXRhO1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gTWV0YWRhdGEgcmVxdWVzdHMgYXJlIGludGVybmFsbHkgY2FjaGVkOyBtdWx0aXBsZSByZXF1ZXN0cyBmb3Igc2FtZSBuYW1lXG4gICAgICAgIC8vIGRvZXMgbm90IHJlc3VsdCBpbiBhZGRpdGlvbmFsIG5ldHdvcmsgdHJhZmZpY1xuICAgICAgICBtZXRhZGF0YSA9IGF3YWl0IGZldGNoUGFja2FnZU1ldGFkYXRhKHBhY2thZ2VOYW1lLCB0aGlzLmxvZ2dlciwge1xuICAgICAgICAgIHZlcmJvc2U6IG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGBFcnJvciBmZXRjaGluZyBtZXRhZGF0YSBmb3IgJyR7cGFja2FnZU5hbWV9JzogYCArIGUubWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIFRyeSB0byBmaW5kIGEgcGFja2FnZSB2ZXJzaW9uIGJhc2VkIG9uIHRoZSB1c2VyIHJlcXVlc3RlZCBwYWNrYWdlIHNwZWNpZmllclxuICAgICAgLy8gcmVnaXN0cnkgc3BlY2lmaWVyIHR5cGVzIGFyZSBlaXRoZXIgdmVyc2lvbiwgcmFuZ2UsIG9yIHRhZ1xuICAgICAgbGV0IG1hbmlmZXN0OiBQYWNrYWdlTWFuaWZlc3QgfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoXG4gICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICd2ZXJzaW9uJyB8fFxuICAgICAgICByZXF1ZXN0SWRlbnRpZmllci50eXBlID09PSAncmFuZ2UnIHx8XG4gICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICd0YWcnXG4gICAgICApIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtYW5pZmVzdCA9IHBpY2tNYW5pZmVzdChtZXRhZGF0YSwgcmVxdWVzdElkZW50aWZpZXIuZmV0Y2hTcGVjKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdFVEFSR0VUJykge1xuICAgICAgICAgICAgLy8gSWYgbm90IGZvdW5kIGFuZCBuZXh0IHdhcyB1c2VkIGFuZCB1c2VyIGRpZCBub3QgcHJvdmlkZSBhIHNwZWNpZmllciwgdHJ5IGxhdGVzdC5cbiAgICAgICAgICAgIC8vIFBhY2thZ2UgbWF5IG5vdCBoYXZlIGEgbmV4dCB0YWcuXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICd0YWcnICYmXG4gICAgICAgICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLmZldGNoU3BlYyA9PT0gJ25leHQnICYmXG4gICAgICAgICAgICAgICFyZXF1ZXN0SWRlbnRpZmllci5yYXdTcGVjXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBtYW5pZmVzdCA9IHBpY2tNYW5pZmVzdChtZXRhZGF0YSwgJ2xhdGVzdCcpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUuY29kZSAhPT0gJ0VUQVJHRVQnICYmIGUuY29kZSAhPT0gJ0VOT1ZFUlNJT05TJykge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKGUuY29kZSAhPT0gJ0VOT1ZFUlNJT05TJykge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFtYW5pZmVzdCkge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICBgUGFja2FnZSBzcGVjaWZpZWQgYnkgJyR7cmVxdWVzdElkZW50aWZpZXIucmF3fScgZG9lcyBub3QgZXhpc3Qgd2l0aGluIHRoZSByZWdpc3RyeS5gLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICBpZiAobWFuaWZlc3QudmVyc2lvbiA9PT0gbm9kZS5wYWNrYWdlPy52ZXJzaW9uKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmluZm8oYFBhY2thZ2UgJyR7cGFja2FnZU5hbWV9JyBpcyBhbHJlYWR5IHVwIHRvIGRhdGUuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZS5wYWNrYWdlICYmIEFOR1VMQVJfUEFDS0FHRVNfUkVHRVhQLnRlc3Qobm9kZS5wYWNrYWdlLm5hbWUpKSB7XG4gICAgICAgIGNvbnN0IHsgbmFtZSwgdmVyc2lvbiB9ID0gbm9kZS5wYWNrYWdlO1xuICAgICAgICBjb25zdCB0b0JlSW5zdGFsbGVkTWFqb3JWZXJzaW9uID0gK21hbmlmZXN0LnZlcnNpb24uc3BsaXQoJy4nKVswXTtcbiAgICAgICAgY29uc3QgY3VycmVudE1ham9yVmVyc2lvbiA9ICt2ZXJzaW9uLnNwbGl0KCcuJylbMF07XG5cbiAgICAgICAgaWYgKHRvQmVJbnN0YWxsZWRNYWpvclZlcnNpb24gLSBjdXJyZW50TWFqb3JWZXJzaW9uID4gMSkge1xuICAgICAgICAgIC8vIE9ubHkgYWxsb3cgdXBkYXRpbmcgYSBzaW5nbGUgdmVyc2lvbiBhdCBhIHRpbWUuXG4gICAgICAgICAgaWYgKGN1cnJlbnRNYWpvclZlcnNpb24gPCA2KSB7XG4gICAgICAgICAgICAvLyBCZWZvcmUgdmVyc2lvbiA2LCB0aGUgbWFqb3IgdmVyc2lvbnMgd2VyZSBub3QgYWx3YXlzIHNlcXVlbnRpYWwuXG4gICAgICAgICAgICAvLyBFeGFtcGxlIEBhbmd1bGFyL2NvcmUgc2tpcHBlZCB2ZXJzaW9uIDMsIEBhbmd1bGFyL2NsaSBza2lwcGVkIHZlcnNpb25zIDItNS5cbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVXBkYXRpbmcgbXVsdGlwbGUgbWFqb3IgdmVyc2lvbnMgb2YgJyR7bmFtZX0nIGF0IG9uY2UgaXMgbm90IHN1cHBvcnRlZC4gUGxlYXNlIG1pZ3JhdGUgZWFjaCBtYWpvciB2ZXJzaW9uIGluZGl2aWR1YWxseS5cXG5gICtcbiAgICAgICAgICAgICAgICBgRm9yIG1vcmUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHVwZGF0ZSBwcm9jZXNzLCBzZWUgaHR0cHM6Ly91cGRhdGUuYW5ndWxhci5pby8uYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG5leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudCA9IGN1cnJlbnRNYWpvclZlcnNpb24gKyAxO1xuXG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgYFVwZGF0aW5nIG11bHRpcGxlIG1ham9yIHZlcnNpb25zIG9mICcke25hbWV9JyBhdCBvbmNlIGlzIG5vdCBzdXBwb3J0ZWQuIFBsZWFzZSBtaWdyYXRlIGVhY2ggbWFqb3IgdmVyc2lvbiBpbmRpdmlkdWFsbHkuXFxuYCArXG4gICAgICAgICAgICAgICAgYFJ1biAnbmcgdXBkYXRlICR7bmFtZX1AJHtuZXh0TWFqb3JWZXJzaW9uRnJvbUN1cnJlbnR9JyBpbiB5b3VyIHdvcmtzcGFjZSBkaXJlY3RvcnkgYCArXG4gICAgICAgICAgICAgICAgYHRvIHVwZGF0ZSB0byBsYXRlc3QgJyR7bmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50fS54JyB2ZXJzaW9uIG9mICcke25hbWV9Jy5cXG5cXG5gICtcbiAgICAgICAgICAgICAgICBgRm9yIG1vcmUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHVwZGF0ZSBwcm9jZXNzLCBzZWUgaHR0cHM6Ly91cGRhdGUuYW5ndWxhci5pby8/dj0ke2N1cnJlbnRNYWpvclZlcnNpb259LjAtJHtuZXh0TWFqb3JWZXJzaW9uRnJvbUN1cnJlbnR9LjBgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwYWNrYWdlc1RvVXBkYXRlLnB1c2gocmVxdWVzdElkZW50aWZpZXIudG9TdHJpbmcoKSk7XG4gICAgfVxuXG4gICAgaWYgKHBhY2thZ2VzVG9VcGRhdGUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBjb25zdCB7IHN1Y2Nlc3MgfSA9IGF3YWl0IHRoaXMuZXhlY3V0ZVNjaGVtYXRpYyhVUERBVEVfU0NIRU1BVElDX0NPTExFQ1RJT04sICd1cGRhdGUnLCB7XG4gICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UgfHwgZmFsc2UsXG4gICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSB8fCBmYWxzZSxcbiAgICAgIG5leHQ6ICEhb3B0aW9ucy5uZXh0LFxuICAgICAgcGFja2FnZU1hbmFnZXI6IHRoaXMucGFja2FnZU1hbmFnZXIsXG4gICAgICBwYWNrYWdlczogcGFja2FnZXNUb1VwZGF0ZSxcbiAgICB9KTtcblxuICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBSZW1vdmUgZXhpc3Rpbmcgbm9kZSBtb2R1bGVzIGRpcmVjdG9yeSB0byBwcm92aWRlIGEgc3Ryb25nZXIgZ3VhcmFudGVlIHRoYXQgcGFja2FnZXNcbiAgICAgICAgLy8gd2lsbCBiZSBob2lzdGVkIGludG8gdGhlIGNvcnJlY3QgbG9jYXRpb25zLlxuXG4gICAgICAgIC8vIFRoZSBiZWxvdyBzaG91bGQgYmUgcmVtb3ZlZCBhbmQgcmVwbGFjZWQgd2l0aCBqdXN0IGBybWAgd2hlbiBzdXBwb3J0IGZvciBOb2RlLkpzIDEyIGlzIHJlbW92ZWQuXG4gICAgICAgIGNvbnN0IHsgcm0sIHJtZGlyIH0gPSBmcy5wcm9taXNlcyBhcyB0eXBlb2YgZnMucHJvbWlzZXMgJiB7XG4gICAgICAgICAgcm0/OiAoXG4gICAgICAgICAgICBwYXRoOiBmcy5QYXRoTGlrZSxcbiAgICAgICAgICAgIG9wdGlvbnM/OiB7XG4gICAgICAgICAgICAgIGZvcmNlPzogYm9vbGVhbjtcbiAgICAgICAgICAgICAgbWF4UmV0cmllcz86IG51bWJlcjtcbiAgICAgICAgICAgICAgcmVjdXJzaXZlPzogYm9vbGVhbjtcbiAgICAgICAgICAgICAgcmV0cnlEZWxheT86IG51bWJlcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgKSA9PiBQcm9taXNlPHZvaWQ+O1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChybSkge1xuICAgICAgICAgIGF3YWl0IHJtKHBhdGguam9pbih0aGlzLmNvbnRleHQucm9vdCwgJ25vZGVfbW9kdWxlcycpLCB7XG4gICAgICAgICAgICBmb3JjZTogdHJ1ZSxcbiAgICAgICAgICAgIHJlY3Vyc2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgIG1heFJldHJpZXM6IDMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgcm1kaXIocGF0aC5qb2luKHRoaXMuY29udGV4dC5yb290LCAnbm9kZV9tb2R1bGVzJyksIHtcbiAgICAgICAgICAgIHJlY3Vyc2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgIG1heFJldHJpZXM6IDMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2gge31cblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaW5zdGFsbEFsbFBhY2thZ2VzKFxuICAgICAgICB0aGlzLnBhY2thZ2VNYW5hZ2VyLFxuICAgICAgICBvcHRpb25zLmZvcmNlID8gWyctLWZvcmNlJ10gOiBbXSxcbiAgICAgICAgdGhpcy5jb250ZXh0LnJvb3QsXG4gICAgICApO1xuICAgICAgaWYgKHJlc3VsdCAhPT0gMCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdWNjZXNzICYmIG9wdGlvbnMuY3JlYXRlQ29tbWl0cykge1xuICAgICAgY29uc3QgY29tbWl0dGVkID0gdGhpcy5jb21taXQoXG4gICAgICAgIGBBbmd1bGFyIENMSSB1cGRhdGUgZm9yIHBhY2thZ2VzIC0gJHtwYWNrYWdlc1RvVXBkYXRlLmpvaW4oJywgJyl9YCxcbiAgICAgICk7XG4gICAgICBpZiAoIWNvbW1pdHRlZCkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGlzIGlzIGEgdGVtcG9yYXJ5IHdvcmthcm91bmQgdG8gYWxsb3cgZGF0YSB0byBiZSBwYXNzZWQgYmFjayBmcm9tIHRoZSB1cGRhdGUgc2NoZW1hdGljXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCBtaWdyYXRpb25zID0gKGdsb2JhbCBhcyBhbnkpLmV4dGVybmFsTWlncmF0aW9ucyBhcyB7XG4gICAgICBwYWNrYWdlOiBzdHJpbmc7XG4gICAgICBjb2xsZWN0aW9uOiBzdHJpbmc7XG4gICAgICBmcm9tOiBzdHJpbmc7XG4gICAgICB0bzogc3RyaW5nO1xuICAgIH1bXTtcblxuICAgIGlmIChzdWNjZXNzICYmIG1pZ3JhdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3QgbWlncmF0aW9uIG9mIG1pZ3JhdGlvbnMpIHtcbiAgICAgICAgLy8gUmVzb2x2ZSB0aGUgcGFja2FnZSBmcm9tIHRoZSB3b3Jrc3BhY2Ugcm9vdCwgYXMgb3RoZXJ3aXNlIGl0IHdpbGwgYmUgcmVzb2x2ZWQgZnJvbSB0aGUgdGVtcFxuICAgICAgICAvLyBpbnN0YWxsZWQgQ0xJIHZlcnNpb24uXG4gICAgICAgIGxldCBwYWNrYWdlUGF0aDtcbiAgICAgICAgbG9nVmVyYm9zZShcbiAgICAgICAgICBgUmVzb2x2aW5nIG1pZ3JhdGlvbiBwYWNrYWdlICcke21pZ3JhdGlvbi5wYWNrYWdlfScgZnJvbSAnJHt0aGlzLmNvbnRleHQucm9vdH0nLi4uYCxcbiAgICAgICAgKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgcGFja2FnZVBhdGggPSBwYXRoLmRpcm5hbWUoXG4gICAgICAgICAgICAgIC8vIFRoaXMgbWF5IGZhaWwgaWYgdGhlIGBwYWNrYWdlLmpzb25gIGlzIG5vdCBleHBvcnRlZCBhcyBhbiBlbnRyeSBwb2ludFxuICAgICAgICAgICAgICByZXF1aXJlLnJlc29sdmUocGF0aC5qb2luKG1pZ3JhdGlvbi5wYWNrYWdlLCAncGFja2FnZS5qc29uJyksIHtcbiAgICAgICAgICAgICAgICBwYXRoczogW3RoaXMuY29udGV4dC5yb290XSxcbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byB0cnlpbmcgdG8gcmVzb2x2ZSB0aGUgcGFja2FnZSdzIG1haW4gZW50cnkgcG9pbnRcbiAgICAgICAgICAgICAgcGFja2FnZVBhdGggPSByZXF1aXJlLnJlc29sdmUobWlncmF0aW9uLnBhY2thZ2UsIHsgcGF0aHM6IFt0aGlzLmNvbnRleHQucm9vdF0gfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgICAgbG9nVmVyYm9zZShlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBNaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkgd2VyZSBub3QgZm91bmQuYCArXG4gICAgICAgICAgICAgICAgJyBUaGUgcGFja2FnZSBjb3VsZCBub3QgYmUgZm91bmQgaW4gdGhlIHdvcmtzcGFjZS4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBVbmFibGUgdG8gcmVzb2x2ZSBtaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkuICBbJHtlLm1lc3NhZ2V9XWAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG1pZ3JhdGlvbnM7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQgaXMgYSBwYWNrYWdlLWxvY2FsIGxvY2F0aW9uXG4gICAgICAgIGNvbnN0IGxvY2FsTWlncmF0aW9ucyA9IHBhdGguam9pbihwYWNrYWdlUGF0aCwgbWlncmF0aW9uLmNvbGxlY3Rpb24pO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhsb2NhbE1pZ3JhdGlvbnMpKSB7XG4gICAgICAgICAgbWlncmF0aW9ucyA9IGxvY2FsTWlncmF0aW9ucztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBUcnkgdG8gcmVzb2x2ZSBmcm9tIHBhY2thZ2UgbG9jYXRpb24uXG4gICAgICAgICAgLy8gVGhpcyBhdm9pZHMgaXNzdWVzIHdpdGggcGFja2FnZSBob2lzdGluZy5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgbWlncmF0aW9ucyA9IHJlcXVpcmUucmVzb2x2ZShtaWdyYXRpb24uY29sbGVjdGlvbiwgeyBwYXRoczogW3BhY2thZ2VQYXRoXSB9KTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoYE1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KSB3ZXJlIG5vdCBmb3VuZC5gKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICAgIGBVbmFibGUgdG8gcmVzb2x2ZSBtaWdyYXRpb25zIGZvciBwYWNrYWdlICgke21pZ3JhdGlvbi5wYWNrYWdlfSkuICBbJHtlLm1lc3NhZ2V9XWAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVNaWdyYXRpb25zKFxuICAgICAgICAgIG1pZ3JhdGlvbi5wYWNrYWdlLFxuICAgICAgICAgIG1pZ3JhdGlvbnMsXG4gICAgICAgICAgbWlncmF0aW9uLmZyb20sXG4gICAgICAgICAgbWlncmF0aW9uLnRvLFxuICAgICAgICAgIG9wdGlvbnMuY3JlYXRlQ29tbWl0cyxcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1Y2Nlc3MgPyAwIDogMTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSBjb21taXQgd2FzIHN1Y2Nlc3NmdWwuXG4gICAqL1xuICBwcml2YXRlIGNvbW1pdChtZXNzYWdlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBDaGVjayBpZiBhIGNvbW1pdCBpcyBuZWVkZWQuXG4gICAgbGV0IGNvbW1pdE5lZWRlZDogYm9vbGVhbjtcbiAgICB0cnkge1xuICAgICAgY29tbWl0TmVlZGVkID0gaGFzQ2hhbmdlc1RvQ29tbWl0KCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcihgICBGYWlsZWQgdG8gcmVhZCBHaXQgdHJlZTpcXG4ke2Vyci5zdGRlcnJ9YCk7XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWNvbW1pdE5lZWRlZCkge1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbygnICBObyBjaGFuZ2VzIHRvIGNvbW1pdCBhZnRlciBtaWdyYXRpb24uJyk7XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIENvbW1pdCBjaGFuZ2VzIGFuZCBhYm9ydCBvbiBlcnJvci5cbiAgICB0cnkge1xuICAgICAgY3JlYXRlQ29tbWl0KG1lc3NhZ2UpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoYEZhaWxlZCB0byBjb21taXQgdXBkYXRlICgke21lc3NhZ2V9KTpcXG4ke2Vyci5zdGRlcnJ9YCk7XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBOb3RpZnkgdXNlciBvZiB0aGUgY29tbWl0LlxuICAgIGNvbnN0IGhhc2ggPSBmaW5kQ3VycmVudEdpdFNoYSgpO1xuICAgIGNvbnN0IHNob3J0TWVzc2FnZSA9IG1lc3NhZ2Uuc3BsaXQoJ1xcbicpWzBdO1xuICAgIGlmIChoYXNoKSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKGAgIENvbW1pdHRlZCBtaWdyYXRpb24gc3RlcCAoJHtnZXRTaG9ydEhhc2goaGFzaCl9KTogJHtzaG9ydE1lc3NhZ2V9LmApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDb21taXQgd2FzIHN1Y2Nlc3NmdWwsIGJ1dCByZWFkaW5nIHRoZSBoYXNoIHdhcyBub3QuIFNvbWV0aGluZyB3ZWlyZCBoYXBwZW5lZCxcbiAgICAgIC8vIGJ1dCBub3RoaW5nIHRoYXQgd291bGQgc3RvcCB0aGUgdXBkYXRlLiBKdXN0IGxvZyB0aGUgd2VpcmRuZXNzIGFuZCBjb250aW51ZS5cbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oYCAgQ29tbWl0dGVkIG1pZ3JhdGlvbiBzdGVwOiAke3Nob3J0TWVzc2FnZX0uYCk7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCcgIEZhaWxlZCB0byBsb29rIHVwIGhhc2ggb2YgbW9zdCByZWNlbnQgY29tbWl0LCBjb250aW51aW5nIGFueXdheXMuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwcml2YXRlIGNoZWNrQ2xlYW5HaXQoKTogYm9vbGVhbiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRvcExldmVsID0gZXhlY1N5bmMoJ2dpdCByZXYtcGFyc2UgLS1zaG93LXRvcGxldmVsJywge1xuICAgICAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgICAgICBzdGRpbzogJ3BpcGUnLFxuICAgICAgfSk7XG4gICAgICBjb25zdCByZXN1bHQgPSBleGVjU3luYygnZ2l0IHN0YXR1cyAtLXBvcmNlbGFpbicsIHsgZW5jb2Rpbmc6ICd1dGY4Jywgc3RkaW86ICdwaXBlJyB9KTtcbiAgICAgIGlmIChyZXN1bHQudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gT25seSBmaWxlcyBpbnNpZGUgdGhlIHdvcmtzcGFjZSByb290IGFyZSByZWxldmFudFxuICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiByZXN1bHQuc3BsaXQoJ1xcbicpKSB7XG4gICAgICAgIGNvbnN0IHJlbGF0aXZlRW50cnkgPSBwYXRoLnJlbGF0aXZlKFxuICAgICAgICAgIHBhdGgucmVzb2x2ZSh0aGlzLmNvbnRleHQucm9vdCksXG4gICAgICAgICAgcGF0aC5yZXNvbHZlKHRvcExldmVsLnRyaW0oKSwgZW50cnkuc2xpY2UoMykudHJpbSgpKSxcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAoIXJlbGF0aXZlRW50cnkuc3RhcnRzV2l0aCgnLi4nKSAmJiAhcGF0aC5pc0Fic29sdXRlKHJlbGF0aXZlRW50cnkpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBjdXJyZW50IGluc3RhbGxlZCBDTEkgdmVyc2lvbiBpcyBvbGRlciBvciBuZXdlciB0aGFuIGEgY29tcGF0aWJsZSB2ZXJzaW9uLlxuICAgKiBAcmV0dXJucyB0aGUgdmVyc2lvbiB0byBpbnN0YWxsIG9yIG51bGwgd2hlbiB0aGVyZSBpcyBubyB1cGRhdGUgdG8gaW5zdGFsbC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tDTElWZXJzaW9uKFxuICAgIHBhY2thZ2VzVG9VcGRhdGU6IHN0cmluZ1tdIHwgdW5kZWZpbmVkLFxuICAgIHZlcmJvc2UgPSBmYWxzZSxcbiAgICBuZXh0ID0gZmFsc2UsXG4gICk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICAgIGNvbnN0IHsgdmVyc2lvbiB9ID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWFuaWZlc3QoXG4gICAgICBgQGFuZ3VsYXIvY2xpQCR7dGhpcy5nZXRDTElVcGRhdGVSdW5uZXJWZXJzaW9uKHBhY2thZ2VzVG9VcGRhdGUsIG5leHQpfWAsXG4gICAgICB0aGlzLmxvZ2dlcixcbiAgICAgIHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgdXNpbmdZYXJuOiB0aGlzLnBhY2thZ2VNYW5hZ2VyID09PSBQYWNrYWdlTWFuYWdlci5ZYXJuLFxuICAgICAgfSxcbiAgICApO1xuXG4gICAgcmV0dXJuIFZFUlNJT04uZnVsbCA9PT0gdmVyc2lvbiA/IG51bGwgOiB2ZXJzaW9uO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRDTElVcGRhdGVSdW5uZXJWZXJzaW9uKFxuICAgIHBhY2thZ2VzVG9VcGRhdGU6IHN0cmluZ1tdIHwgdW5kZWZpbmVkLFxuICAgIG5leHQ6IGJvb2xlYW4sXG4gICk6IHN0cmluZyB8IG51bWJlciB7XG4gICAgaWYgKG5leHQpIHtcbiAgICAgIHJldHVybiAnbmV4dCc7XG4gICAgfVxuXG4gICAgY29uc3QgdXBkYXRpbmdBbmd1bGFyUGFja2FnZSA9IHBhY2thZ2VzVG9VcGRhdGU/LmZpbmQoKHIpID0+IEFOR1VMQVJfUEFDS0FHRVNfUkVHRVhQLnRlc3QocikpO1xuICAgIGlmICh1cGRhdGluZ0FuZ3VsYXJQYWNrYWdlKSB7XG4gICAgICAvLyBJZiB3ZSBhcmUgdXBkYXRpbmcgYW55IEFuZ3VsYXIgcGFja2FnZSB3ZSBjYW4gdXBkYXRlIHRoZSBDTEkgdG8gdGhlIHRhcmdldCB2ZXJzaW9uIGJlY2F1c2VcbiAgICAgIC8vIG1pZ3JhdGlvbnMgZm9yIEBhbmd1bGFyL2NvcmVAMTMgY2FuIGJlIGV4ZWN1dGVkIHVzaW5nIEFuZ3VsYXIvY2xpQDEzLlxuICAgICAgLy8gVGhpcyBpcyBzYW1lIGJlaGF2aW91ciBhcyBgbnB4IEBhbmd1bGFyL2NsaUAxMyB1cGRhdGUgQGFuZ3VsYXIvY29yZUAxM2AuXG5cbiAgICAgIC8vIGBAYW5ndWxhci9jbGlAMTNgIC0+IFsnJywgJ2FuZ3VsYXIvY2xpJywgJzEzJ11cbiAgICAgIC8vIGBAYW5ndWxhci9jbGlgIC0+IFsnJywgJ2FuZ3VsYXIvY2xpJ11cbiAgICAgIGNvbnN0IHRlbXBWZXJzaW9uID0gY29lcmNlVmVyc2lvbk51bWJlcih1cGRhdGluZ0FuZ3VsYXJQYWNrYWdlLnNwbGl0KCdAJylbMl0pO1xuXG4gICAgICByZXR1cm4gc2VtdmVyLnBhcnNlKHRlbXBWZXJzaW9uKT8ubWFqb3IgPz8gJ2xhdGVzdCc7XG4gICAgfVxuXG4gICAgLy8gV2hlbiBub3QgdXBkYXRpbmcgYW4gQW5ndWxhciBwYWNrYWdlIHdlIGNhbm5vdCBkZXRlcm1pbmUgd2hpY2ggc2NoZW1hdGljIHJ1bnRpbWUgdGhlIG1pZ3JhdGlvbiBzaG91bGQgdG8gYmUgZXhlY3V0ZWQgaW4uXG4gICAgLy8gVHlwaWNhbGx5LCB3ZSBjYW4gYXNzdW1lIHRoYXQgdGhlIGBAYW5ndWxhci9jbGlgIHdhcyB1cGRhdGVkIHByZXZpb3VzbHkuXG4gICAgLy8gRXhhbXBsZTogQW5ndWxhciBvZmZpY2lhbCBwYWNrYWdlcyBhcmUgdHlwaWNhbGx5IHVwZGF0ZWQgcHJpb3IgdG8gTkdSWCBldGMuLi5cbiAgICAvLyBUaGVyZWZvcmUsIHdlIG9ubHkgdXBkYXRlIHRvIHRoZSBsYXRlc3QgcGF0Y2ggdmVyc2lvbiBvZiB0aGUgaW5zdGFsbGVkIG1ham9yIHZlcnNpb24gb2YgdGhlIEFuZ3VsYXIgQ0xJLlxuXG4gICAgLy8gVGhpcyBpcyBpbXBvcnRhbnQgYmVjYXVzZSB3ZSBtaWdodCBlbmQgdXAgaW4gYSBzY2VuYXJpbyB3aGVyZSBsb2NhbGx5IEFuZ3VsYXIgdjEyIGlzIGluc3RhbGxlZCwgdXBkYXRpbmcgTkdSWCBmcm9tIDExIHRvIDEyLlxuICAgIC8vIFdlIGVuZCB1cCB1c2luZyBBbmd1bGFyIENsSSB2MTMgdG8gcnVuIHRoZSBtaWdyYXRpb25zIGlmIHdlIHJ1biB0aGUgbWlncmF0aW9ucyB1c2luZyB0aGUgQ0xJIGluc3RhbGxlZCBtYWpvciB2ZXJzaW9uICsgMSBsb2dpYy5cbiAgICByZXR1cm4gVkVSU0lPTi5tYWpvcjtcbiAgfVxufVxuXG4vKipcbiAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIHdvcmtpbmcgZGlyZWN0b3J5IGhhcyBHaXQgY2hhbmdlcyB0byBjb21taXQuXG4gKi9cbmZ1bmN0aW9uIGhhc0NoYW5nZXNUb0NvbW1pdCgpOiBib29sZWFuIHtcbiAgLy8gTGlzdCBhbGwgbW9kaWZpZWQgZmlsZXMgbm90IGNvdmVyZWQgYnkgLmdpdGlnbm9yZS5cbiAgY29uc3QgZmlsZXMgPSBleGVjU3luYygnZ2l0IGxzLWZpbGVzIC1tIC1kIC1vIC0tZXhjbHVkZS1zdGFuZGFyZCcpLnRvU3RyaW5nKCk7XG5cbiAgLy8gSWYgYW55IGZpbGVzIGFyZSByZXR1cm5lZCwgdGhlbiB0aGVyZSBtdXN0IGJlIHNvbWV0aGluZyB0byBjb21taXQuXG4gIHJldHVybiBmaWxlcyAhPT0gJyc7XG59XG5cbi8qKlxuICogUHJlY29uZGl0aW9uOiBNdXN0IGhhdmUgcGVuZGluZyBjaGFuZ2VzIHRvIGNvbW1pdCwgdGhleSBkbyBub3QgbmVlZCB0byBiZSBzdGFnZWQuXG4gKiBQb3N0Y29uZGl0aW9uOiBUaGUgR2l0IHdvcmtpbmcgdHJlZSBpcyBjb21taXR0ZWQgYW5kIHRoZSByZXBvIGlzIGNsZWFuLlxuICogQHBhcmFtIG1lc3NhZ2UgVGhlIGNvbW1pdCBtZXNzYWdlIHRvIHVzZS5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQ29tbWl0KG1lc3NhZ2U6IHN0cmluZykge1xuICAvLyBTdGFnZSBlbnRpcmUgd29ya2luZyB0cmVlIGZvciBjb21taXQuXG4gIGV4ZWNTeW5jKCdnaXQgYWRkIC1BJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pO1xuXG4gIC8vIENvbW1pdCB3aXRoIHRoZSBtZXNzYWdlIHBhc3NlZCB2aWEgc3RkaW4gdG8gYXZvaWQgYmFzaCBlc2NhcGluZyBpc3N1ZXMuXG4gIGV4ZWNTeW5jKCdnaXQgY29tbWl0IC0tbm8tdmVyaWZ5IC1GIC0nLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScsIGlucHV0OiBtZXNzYWdlIH0pO1xufVxuXG4vKipcbiAqIEByZXR1cm4gVGhlIEdpdCBTSEEgaGFzaCBvZiB0aGUgSEVBRCBjb21taXQuIFJldHVybnMgbnVsbCBpZiB1bmFibGUgdG8gcmV0cmlldmUgdGhlIGhhc2guXG4gKi9cbmZ1bmN0aW9uIGZpbmRDdXJyZW50R2l0U2hhKCk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIGNvbnN0IGhhc2ggPSBleGVjU3luYygnZ2l0IHJldi1wYXJzZSBIRUFEJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pO1xuXG4gICAgcmV0dXJuIGhhc2gudHJpbSgpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTaG9ydEhhc2goY29tbWl0SGFzaDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNvbW1pdEhhc2guc2xpY2UoMCwgOSk7XG59XG5cbmZ1bmN0aW9uIGNvZXJjZVZlcnNpb25OdW1iZXIodmVyc2lvbjogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICghdmVyc2lvbikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgaWYgKCF2ZXJzaW9uLm1hdGNoKC9eXFxkezEsMzB9XFwuXFxkezEsMzB9XFwuXFxkezEsMzB9LykpIHtcbiAgICBjb25zdCBtYXRjaCA9IHZlcnNpb24ubWF0Y2goL15cXGR7MSwzMH0oXFwuXFxkezEsMzB9KSovKTtcblxuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghbWF0Y2hbMV0pIHtcbiAgICAgIHZlcnNpb24gPSB2ZXJzaW9uLnN1YnN0cigwLCBtYXRjaFswXS5sZW5ndGgpICsgJy4wLjAnICsgdmVyc2lvbi5zdWJzdHIobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICB9IGVsc2UgaWYgKCFtYXRjaFsyXSkge1xuICAgICAgdmVyc2lvbiA9IHZlcnNpb24uc3Vic3RyKDAsIG1hdGNoWzBdLmxlbmd0aCkgKyAnLjAnICsgdmVyc2lvbi5zdWJzdHIobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHNlbXZlci52YWxpZCh2ZXJzaW9uKTtcbn1cbiJdfQ==