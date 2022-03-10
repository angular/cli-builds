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
exports.UpdateCommand = void 0;
const schematics_1 = require("@angular-devkit/schematics");
const tools_1 = require("@angular-devkit/schematics/tools");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const npm_package_arg_1 = __importDefault(require("npm-package-arg"));
const npm_pick_manifest_1 = __importDefault(require("npm-pick-manifest"));
const path = __importStar(require("path"));
const semver = __importStar(require("semver"));
const workspace_schema_1 = require("../../../lib/config/workspace-schema");
const command_1 = require("../../../models/command");
const schematic_engine_host_1 = require("../../../models/schematic-engine-host");
const color_1 = require("../../utilities/color");
const install_package_1 = require("../../utilities/install-package");
const log_file_1 = require("../../utilities/log-file");
const package_manager_1 = require("../../utilities/package-manager");
const package_metadata_1 = require("../../utilities/package-metadata");
const package_tree_1 = require("../../utilities/package-tree");
const version_1 = require("../../utilities/version");
const UPDATE_SCHEMATIC_COLLECTION = path.join(__dirname, 'schematic/collection.json');
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
            const cliVersionToInstall = await this.checkCLIVersion(options.packages, options.verbose, options.next);
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
        const packages = [];
        const packagesFromOptions = typeof options.packages === 'string' ? [options.packages] : options.packages;
        for (const request of packagesFromOptions !== null && packagesFromOptions !== void 0 ? packagesFromOptions : []) {
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
            if (options.name) {
                result = await this.executeMigration(packageName, migrations, options.name, options.createCommits);
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
                await fs.promises.rm(path.join(this.context.root, 'node_modules'), {
                    force: true,
                    recursive: true,
                    maxRetries: 3,
                });
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
        const { version } = await (0, package_metadata_1.fetchPackageManifest)(`@angular/cli@${this.getCLIUpdateRunnerVersion(typeof packagesToUpdate === 'string' ? [packagesToUpdate] : packagesToUpdate, next)}`, this.logger, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZHMvdXBkYXRlL3VwZGF0ZS1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsMkRBQTJFO0FBQzNFLDREQUFnRTtBQUNoRSxpREFBeUM7QUFDekMsdUNBQXlCO0FBQ3pCLHNFQUFrQztBQUNsQywwRUFBNkM7QUFDN0MsMkNBQTZCO0FBQzdCLCtDQUFpQztBQUNqQywyRUFBc0U7QUFDdEUscURBQWtEO0FBQ2xELGlGQUE0RTtBQUU1RSxpREFBK0M7QUFDL0MscUVBQXdGO0FBQ3hGLHVEQUErRDtBQUMvRCxxRUFBeUY7QUFDekYsdUVBSzBDO0FBQzFDLCtEQUtzQztBQUN0QyxxREFBa0Q7QUFHbEQsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO0FBSXRGOzs7R0FHRztBQUNILE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQ3ZFLE1BQU0sbUJBQW1CLEdBQ3ZCLHNCQUFzQixLQUFLLFNBQVM7SUFDcEMsc0JBQXNCLEtBQUssR0FBRztJQUM5QixzQkFBc0IsQ0FBQyxXQUFXLEVBQUUsS0FBSyxPQUFPLENBQUM7QUFFbkQsTUFBTSx1QkFBdUIsR0FBRyw2QkFBNkIsQ0FBQztBQUM5RCxNQUFhLGFBQWMsU0FBUSxpQkFBNkI7SUFBaEU7O1FBQzJCLDBCQUFxQixHQUFHLElBQUksQ0FBQztRQUU5QyxtQkFBYyxHQUFHLGlDQUFjLENBQUMsR0FBRyxDQUFDO0lBb3pCOUMsQ0FBQztJQWx6QlUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUE2QjtRQUNyRCxJQUFJLENBQUMsY0FB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VUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsT0FBMkI7SUFDdEQsSUFBSSxDQUFDLE9BQU8sRUFBRTtRQUNaLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxFQUFFO1FBQ25ELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUV0RCxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ1YsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDYixPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUN6RjthQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDcEIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDdkY7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7S0FDRjtJQUVELE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVdvcmtmbG93IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCBucGEgZnJvbSAnbnBtLXBhY2thZ2UtYXJnJztcbmltcG9ydCBwaWNrTWFuaWZlc3QgZnJvbSAnbnBtLXBpY2stbWFuaWZlc3QnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi8uLi8uLi9saWIvY29uZmlnL3dvcmtzcGFjZS1zY2hlbWEnO1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4uLy4uLy4uL21vZGVscy9jb21tYW5kJztcbmltcG9ydCB7IFNjaGVtYXRpY0VuZ2luZUhvc3QgfSBmcm9tICcuLi8uLi8uLi9tb2RlbHMvc2NoZW1hdGljLWVuZ2luZS1ob3N0JztcbmltcG9ydCB7IE9wdGlvbnMgfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IGluc3RhbGxBbGxQYWNrYWdlcywgcnVuVGVtcFBhY2thZ2VCaW4gfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvaW5zdGFsbC1wYWNrYWdlJztcbmltcG9ydCB7IHdyaXRlRXJyb3JUb0xvZ0ZpbGUgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvbG9nLWZpbGUnO1xuaW1wb3J0IHsgZW5zdXJlQ29tcGF0aWJsZU5wbSwgZ2V0UGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcGFja2FnZS1tYW5hZ2VyJztcbmltcG9ydCB7XG4gIFBhY2thZ2VJZGVudGlmaWVyLFxuICBQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1hbmlmZXN0LFxuICBmZXRjaFBhY2thZ2VNZXRhZGF0YSxcbn0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWV0YWRhdGEnO1xuaW1wb3J0IHtcbiAgUGFja2FnZVRyZWVOb2RlLFxuICBmaW5kUGFja2FnZUpzb24sXG4gIGdldFByb2plY3REZXBlbmRlbmNpZXMsXG4gIHJlYWRQYWNrYWdlSnNvbixcbn0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtdHJlZSc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3ZlcnNpb24nO1xuaW1wb3J0IHsgVXBkYXRlQ29tbWFuZEFyZ3MgfSBmcm9tICcuL2NsaSc7XG5cbmNvbnN0IFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTiA9IHBhdGguam9pbihfX2Rpcm5hbWUsICdzY2hlbWF0aWMvY29sbGVjdGlvbi5qc29uJyk7XG5cbnR5cGUgVXBkYXRlQ29tbWFuZE9wdGlvbnMgPSBPcHRpb25zPFVwZGF0ZUNvbW1hbmRBcmdzPjtcblxuLyoqXG4gKiBEaXNhYmxlIENMSSB2ZXJzaW9uIG1pc21hdGNoIGNoZWNrcyBhbmQgZm9yY2VzIHVzYWdlIG9mIHRoZSBpbnZva2VkIENMSVxuICogaW5zdGVhZCBvZiBpbnZva2luZyB0aGUgbG9jYWwgaW5zdGFsbGVkIHZlcnNpb24uXG4gKi9cbmNvbnN0IGRpc2FibGVWZXJzaW9uQ2hlY2tFbnYgPSBwcm9jZXNzLmVudlsnTkdfRElTQUJMRV9WRVJTSU9OX0NIRUNLJ107XG5jb25zdCBkaXNhYmxlVmVyc2lvbkNoZWNrID1cbiAgZGlzYWJsZVZlcnNpb25DaGVja0VudiAhPT0gdW5kZWZpbmVkICYmXG4gIGRpc2FibGVWZXJzaW9uQ2hlY2tFbnYgIT09ICcwJyAmJlxuICBkaXNhYmxlVmVyc2lvbkNoZWNrRW52LnRvTG93ZXJDYXNlKCkgIT09ICdmYWxzZSc7XG5cbmNvbnN0IEFOR1VMQVJfUEFDS0FHRVNfUkVHRVhQID0gL15AKD86YW5ndWxhcnxuZ3VuaXZlcnNhbClcXC8vO1xuZXhwb3J0IGNsYXNzIFVwZGF0ZUNvbW1hbmQgZXh0ZW5kcyBDb21tYW5kPFVwZGF0ZUNvbW1hbmRPcHRpb25zPiB7XG4gIHB1YmxpYyBvdmVycmlkZSByZWFkb25seSBhbGxvd01pc3NpbmdXb3Jrc3BhY2UgPSB0cnVlO1xuICBwcml2YXRlIHdvcmtmbG93ITogTm9kZVdvcmtmbG93O1xuICBwcml2YXRlIHBhY2thZ2VNYW5hZ2VyID0gUGFja2FnZU1hbmFnZXIuTnBtO1xuXG4gIG92ZXJyaWRlIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogVXBkYXRlQ29tbWFuZE9wdGlvbnMpIHtcbiAgICB0aGlzLnBhY2thZ2VNYW5hZ2VyID0gYXdhaXQgZ2V0UGFja2FnZU1hbmFnZXIodGhpcy5jb250ZXh0LnJvb3QpO1xuICAgIHRoaXMud29ya2Zsb3cgPSBuZXcgTm9kZVdvcmtmbG93KHRoaXMuY29udGV4dC5yb290LCB7XG4gICAgICBwYWNrYWdlTWFuYWdlcjogdGhpcy5wYWNrYWdlTWFuYWdlcixcbiAgICAgIHBhY2thZ2VNYW5hZ2VyRm9yY2U6IG9wdGlvbnMuZm9yY2UsXG4gICAgICAvLyBfX2Rpcm5hbWUgLT4gZmF2b3IgQHNjaGVtYXRpY3MvdXBkYXRlIGZyb20gdGhpcyBwYWNrYWdlXG4gICAgICAvLyBPdGhlcndpc2UsIHVzZSBwYWNrYWdlcyBmcm9tIHRoZSBhY3RpdmUgd29ya3NwYWNlIChtaWdyYXRpb25zKVxuICAgICAgcmVzb2x2ZVBhdGhzOiBbX19kaXJuYW1lLCB0aGlzLmNvbnRleHQucm9vdF0sXG4gICAgICBzY2hlbWFWYWxpZGF0aW9uOiB0cnVlLFxuICAgICAgZW5naW5lSG9zdENyZWF0b3I6IChvcHRpb25zKSA9PiBuZXcgU2NoZW1hdGljRW5naW5lSG9zdChvcHRpb25zLnJlc29sdmVQYXRocyksXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVTY2hlbWF0aWMoXG4gICAgY29sbGVjdGlvbjogc3RyaW5nLFxuICAgIHNjaGVtYXRpYzogc3RyaW5nLFxuICAgIG9wdGlvbnMgPSB7fSxcbiAgKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGZpbGVzOiBTZXQ8c3RyaW5nPiB9PiB7XG4gICAgbGV0IGVycm9yID0gZmFsc2U7XG4gICAgbGV0IGxvZ3M6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgZmlsZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgIGNvbnN0IHJlcG9ydGVyU3Vic2NyaXB0aW9uID0gdGhpcy53b3JrZmxvdy5yZXBvcnRlci5zdWJzY3JpYmUoKGV2ZW50KSA9PiB7XG4gICAgICAvLyBTdHJpcCBsZWFkaW5nIHNsYXNoIHRvIHByZXZlbnQgY29uZnVzaW9uLlxuICAgICAgY29uc3QgZXZlbnRQYXRoID0gZXZlbnQucGF0aC5zdGFydHNXaXRoKCcvJykgPyBldmVudC5wYXRoLnN1YnN0cigxKSA6IGV2ZW50LnBhdGg7XG5cbiAgICAgIHN3aXRjaCAoZXZlbnQua2luZCkge1xuICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgZXJyb3IgPSB0cnVlO1xuICAgICAgICAgIGNvbnN0IGRlc2MgPSBldmVudC5kZXNjcmlwdGlvbiA9PSAnYWxyZWFkeUV4aXN0JyA/ICdhbHJlYWR5IGV4aXN0cycgOiAnZG9lcyBub3QgZXhpc3QuJztcbiAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihgRVJST1IhICR7ZXZlbnRQYXRofSAke2Rlc2N9LmApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgICAgIGxvZ3MucHVzaChgJHtjb2xvcnMuY3lhbignVVBEQVRFJyl9ICR7ZXZlbnRQYXRofSAoJHtldmVudC5jb250ZW50Lmxlbmd0aH0gYnl0ZXMpYCk7XG4gICAgICAgICAgZmlsZXMuYWRkKGV2ZW50UGF0aCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgICAgbG9ncy5wdXNoKGAke2NvbG9ycy5ncmVlbignQ1JFQVRFJyl9ICR7ZXZlbnRQYXRofSAoJHtldmVudC5jb250ZW50Lmxlbmd0aH0gYnl0ZXMpYCk7XG4gICAgICAgICAgZmlsZXMuYWRkKGV2ZW50UGF0aCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2RlbGV0ZSc6XG4gICAgICAgICAgbG9ncy5wdXNoKGAke2NvbG9ycy55ZWxsb3coJ0RFTEVURScpfSAke2V2ZW50UGF0aH1gKTtcbiAgICAgICAgICBmaWxlcy5hZGQoZXZlbnRQYXRoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncmVuYW1lJzpcbiAgICAgICAgICBjb25zdCBldmVudFRvUGF0aCA9IGV2ZW50LnRvLnN0YXJ0c1dpdGgoJy8nKSA/IGV2ZW50LnRvLnN1YnN0cigxKSA6IGV2ZW50LnRvO1xuICAgICAgICAgIGxvZ3MucHVzaChgJHtjb2xvcnMuYmx1ZSgnUkVOQU1FJyl9ICR7ZXZlbnRQYXRofSA9PiAke2V2ZW50VG9QYXRofWApO1xuICAgICAgICAgIGZpbGVzLmFkZChldmVudFBhdGgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgbGlmZWN5Y2xlU3Vic2NyaXB0aW9uID0gdGhpcy53b3JrZmxvdy5saWZlQ3ljbGUuc3Vic2NyaWJlKChldmVudCkgPT4ge1xuICAgICAgaWYgKGV2ZW50LmtpbmQgPT0gJ2VuZCcgfHwgZXZlbnQua2luZCA9PSAncG9zdC10YXNrcy1zdGFydCcpIHtcbiAgICAgICAgaWYgKCFlcnJvcikge1xuICAgICAgICAgIC8vIE91dHB1dCB0aGUgbG9nZ2luZyBxdWV1ZSwgbm8gZXJyb3IgaGFwcGVuZWQuXG4gICAgICAgICAgbG9ncy5mb3JFYWNoKChsb2cpID0+IHRoaXMubG9nZ2VyLmluZm8oYCAgJHtsb2d9YCkpO1xuICAgICAgICAgIGxvZ3MgPSBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVE9ETzogQWxsb3cgcGFzc2luZyBhIHNjaGVtYXRpYyBpbnN0YW5jZSBkaXJlY3RseVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLndvcmtmbG93XG4gICAgICAgIC5leGVjdXRlKHtcbiAgICAgICAgICBjb2xsZWN0aW9uLFxuICAgICAgICAgIHNjaGVtYXRpYyxcbiAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgIGxvZ2dlcjogdGhpcy5sb2dnZXIsXG4gICAgICAgIH0pXG4gICAgICAgIC50b1Byb21pc2UoKTtcblxuICAgICAgcmVwb3J0ZXJTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgIGxpZmVjeWNsZVN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiAhZXJyb3IsIGZpbGVzIH07XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbikge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICBgJHtjb2xvcnMuc3ltYm9scy5jcm9zc30gTWlncmF0aW9uIGZhaWxlZC4gU2VlIGFib3ZlIGZvciBmdXJ0aGVyIGRldGFpbHMuXFxuYCxcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGxvZ1BhdGggPSB3cml0ZUVycm9yVG9Mb2dGaWxlKGUpO1xuICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChcbiAgICAgICAgICBgJHtjb2xvcnMuc3ltYm9scy5jcm9zc30gTWlncmF0aW9uIGZhaWxlZDogJHtlLm1lc3NhZ2V9XFxuYCArXG4gICAgICAgICAgICBgICBTZWUgXCIke2xvZ1BhdGh9XCIgZm9yIGZ1cnRoZXIgZGV0YWlscy5cXG5gLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZmlsZXMgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgbWlncmF0aW9uIHdhcyBwZXJmb3JtZWQgc3VjY2Vzc2Z1bGx5LlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlTWlncmF0aW9uKFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgY29sbGVjdGlvblBhdGg6IHN0cmluZyxcbiAgICBtaWdyYXRpb25OYW1lOiBzdHJpbmcsXG4gICAgY29tbWl0PzogYm9vbGVhbixcbiAgKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMud29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvblBhdGgpO1xuICAgIGNvbnN0IG5hbWUgPSBjb2xsZWN0aW9uLmxpc3RTY2hlbWF0aWNOYW1lcygpLmZpbmQoKG5hbWUpID0+IG5hbWUgPT09IG1pZ3JhdGlvbk5hbWUpO1xuICAgIGlmICghbmFtZSkge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoYENhbm5vdCBmaW5kIG1pZ3JhdGlvbiAnJHttaWdyYXRpb25OYW1lfScgaW4gJyR7cGFja2FnZU5hbWV9Jy5gKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IHNjaGVtYXRpYyA9IHRoaXMud29ya2Zsb3cuZW5naW5lLmNyZWF0ZVNjaGVtYXRpYyhuYW1lLCBjb2xsZWN0aW9uKTtcblxuICAgIHRoaXMubG9nZ2VyLmluZm8oXG4gICAgICBjb2xvcnMuY3lhbihgKiogRXhlY3V0aW5nICcke21pZ3JhdGlvbk5hbWV9JyBvZiBwYWNrYWdlICcke3BhY2thZ2VOYW1lfScgKipcXG5gKSxcbiAgICApO1xuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVBhY2thZ2VNaWdyYXRpb25zKFtzY2hlbWF0aWMuZGVzY3JpcHRpb25dLCBwYWNrYWdlTmFtZSwgY29tbWl0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSBtaWdyYXRpb25zIHdlcmUgcGVyZm9ybWVkIHN1Y2Nlc3NmdWxseS5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZU1pZ3JhdGlvbnMoXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICBjb2xsZWN0aW9uUGF0aDogc3RyaW5nLFxuICAgIGZyb206IHN0cmluZyxcbiAgICB0bzogc3RyaW5nLFxuICAgIGNvbW1pdD86IGJvb2xlYW4sXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB0aGlzLndvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25QYXRoKTtcbiAgICBjb25zdCBtaWdyYXRpb25SYW5nZSA9IG5ldyBzZW12ZXIuUmFuZ2UoXG4gICAgICAnPicgKyAoc2VtdmVyLnByZXJlbGVhc2UoZnJvbSkgPyBmcm9tLnNwbGl0KCctJylbMF0gKyAnLTAnIDogZnJvbSkgKyAnIDw9JyArIHRvLnNwbGl0KCctJylbMF0sXG4gICAgKTtcbiAgICBjb25zdCBtaWdyYXRpb25zID0gW107XG5cbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgY29sbGVjdGlvbi5saXN0U2NoZW1hdGljTmFtZXMoKSkge1xuICAgICAgY29uc3Qgc2NoZW1hdGljID0gdGhpcy53b3JrZmxvdy5lbmdpbmUuY3JlYXRlU2NoZW1hdGljKG5hbWUsIGNvbGxlY3Rpb24pO1xuICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSBzY2hlbWF0aWMuZGVzY3JpcHRpb24gYXMgdHlwZW9mIHNjaGVtYXRpYy5kZXNjcmlwdGlvbiAmIHtcbiAgICAgICAgdmVyc2lvbj86IHN0cmluZztcbiAgICAgIH07XG4gICAgICBkZXNjcmlwdGlvbi52ZXJzaW9uID0gY29lcmNlVmVyc2lvbk51bWJlcihkZXNjcmlwdGlvbi52ZXJzaW9uKSB8fCB1bmRlZmluZWQ7XG4gICAgICBpZiAoIWRlc2NyaXB0aW9uLnZlcnNpb24pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChzZW12ZXIuc2F0aXNmaWVzKGRlc2NyaXB0aW9uLnZlcnNpb24sIG1pZ3JhdGlvblJhbmdlLCB7IGluY2x1ZGVQcmVyZWxlYXNlOiB0cnVlIH0pKSB7XG4gICAgICAgIG1pZ3JhdGlvbnMucHVzaChkZXNjcmlwdGlvbiBhcyB0eXBlb2Ygc2NoZW1hdGljLmRlc2NyaXB0aW9uICYgeyB2ZXJzaW9uOiBzdHJpbmcgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbWlncmF0aW9ucy5zb3J0KChhLCBiKSA9PiBzZW12ZXIuY29tcGFyZShhLnZlcnNpb24sIGIudmVyc2lvbikgfHwgYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKSk7XG5cbiAgICBpZiAobWlncmF0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmluZm8oY29sb3JzLmN5YW4oYCoqIEV4ZWN1dGluZyBtaWdyYXRpb25zIG9mIHBhY2thZ2UgJyR7cGFja2FnZU5hbWV9JyAqKlxcbmApKTtcblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVQYWNrYWdlTWlncmF0aW9ucyhtaWdyYXRpb25zLCBwYWNrYWdlTmFtZSwgY29tbWl0KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVBhY2thZ2VNaWdyYXRpb25zKFxuICAgIG1pZ3JhdGlvbnM6IEl0ZXJhYmxlPHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbjogc3RyaW5nOyBjb2xsZWN0aW9uOiB7IG5hbWU6IHN0cmluZyB9IH0+LFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgY29tbWl0ID0gZmFsc2UsXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgbWlncmF0aW9uIG9mIG1pZ3JhdGlvbnMpIHtcbiAgICAgIGNvbnN0IFt0aXRsZSwgLi4uZGVzY3JpcHRpb25dID0gbWlncmF0aW9uLmRlc2NyaXB0aW9uLnNwbGl0KCcuICcpO1xuXG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKFxuICAgICAgICBjb2xvcnMuY3lhbihjb2xvcnMuc3ltYm9scy5wb2ludGVyKSArXG4gICAgICAgICAgJyAnICtcbiAgICAgICAgICBjb2xvcnMuYm9sZCh0aXRsZS5lbmRzV2l0aCgnLicpID8gdGl0bGUgOiB0aXRsZSArICcuJyksXG4gICAgICApO1xuXG4gICAgICBpZiAoZGVzY3JpcHRpb24ubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmluZm8oJyAgJyArIGRlc2NyaXB0aW9uLmpvaW4oJy5cXG4gICcpKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlU2NoZW1hdGljKG1pZ3JhdGlvbi5jb2xsZWN0aW9uLm5hbWUsIG1pZ3JhdGlvbi5uYW1lKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCcgIE1pZ3JhdGlvbiBjb21wbGV0ZWQuJyk7XG5cbiAgICAgIC8vIENvbW1pdCBtaWdyYXRpb25cbiAgICAgIGlmIChjb21taXQpIHtcbiAgICAgICAgY29uc3QgY29tbWl0UHJlZml4ID0gYCR7cGFja2FnZU5hbWV9IG1pZ3JhdGlvbiAtICR7bWlncmF0aW9uLm5hbWV9YDtcbiAgICAgICAgY29uc3QgY29tbWl0TWVzc2FnZSA9IG1pZ3JhdGlvbi5kZXNjcmlwdGlvblxuICAgICAgICAgID8gYCR7Y29tbWl0UHJlZml4fVxcblxcbiR7bWlncmF0aW9uLmRlc2NyaXB0aW9ufWBcbiAgICAgICAgICA6IGNvbW1pdFByZWZpeDtcbiAgICAgICAgY29uc3QgY29tbWl0dGVkID0gdGhpcy5jb21taXQoY29tbWl0TWVzc2FnZSk7XG4gICAgICAgIGlmICghY29tbWl0dGVkKSB7XG4gICAgICAgICAgLy8gRmFpbGVkIHRvIGNvbW1pdCwgc29tZXRoaW5nIHdlbnQgd3JvbmcuIEFib3J0IHRoZSB1cGRhdGUuXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oJycpOyAvLyBFeHRyYSB0cmFpbGluZyBuZXdsaW5lLlxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lcy1wZXItZnVuY3Rpb25cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IFVwZGF0ZUNvbW1hbmRPcHRpb25zKSB7XG4gICAgYXdhaXQgZW5zdXJlQ29tcGF0aWJsZU5wbSh0aGlzLmNvbnRleHQucm9vdCk7XG5cbiAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBpbnN0YWxsZWQgQ0xJIHZlcnNpb24gaXMgb2xkZXIgdGhhbiB0aGUgbGF0ZXN0IGNvbXBhdGlibGUgdmVyc2lvbi5cbiAgICBpZiAoIWRpc2FibGVWZXJzaW9uQ2hlY2spIHtcbiAgICAgIGNvbnN0IGNsaVZlcnNpb25Ub0luc3RhbGwgPSBhd2FpdCB0aGlzLmNoZWNrQ0xJVmVyc2lvbihcbiAgICAgICAgb3B0aW9ucy5wYWNrYWdlcyxcbiAgICAgICAgb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICBvcHRpb25zLm5leHQsXG4gICAgICApO1xuXG4gICAgICBpZiAoY2xpVmVyc2lvblRvSW5zdGFsbCkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICdUaGUgaW5zdGFsbGVkIEFuZ3VsYXIgQ0xJIHZlcnNpb24gaXMgb3V0ZGF0ZWQuXFxuJyArXG4gICAgICAgICAgICBgSW5zdGFsbGluZyBhIHRlbXBvcmFyeSBBbmd1bGFyIENMSSB2ZXJzaW9uZWQgJHtjbGlWZXJzaW9uVG9JbnN0YWxsfSB0byBwZXJmb3JtIHRoZSB1cGRhdGUuYCxcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gcnVuVGVtcFBhY2thZ2VCaW4oXG4gICAgICAgICAgYEBhbmd1bGFyL2NsaUAke2NsaVZlcnNpb25Ub0luc3RhbGx9YCxcbiAgICAgICAgICB0aGlzLnBhY2thZ2VNYW5hZ2VyLFxuICAgICAgICAgIHByb2Nlc3MuYXJndi5zbGljZSgyKSxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBsb2dWZXJib3NlID0gKG1lc3NhZ2U6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKG1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBwYWNrYWdlczogUGFja2FnZUlkZW50aWZpZXJbXSA9IFtdO1xuICAgIGNvbnN0IHBhY2thZ2VzRnJvbU9wdGlvbnMgPVxuICAgICAgdHlwZW9mIG9wdGlvbnMucGFja2FnZXMgPT09ICdzdHJpbmcnID8gW29wdGlvbnMucGFja2FnZXNdIDogb3B0aW9ucy5wYWNrYWdlcztcbiAgICBmb3IgKGNvbnN0IHJlcXVlc3Qgb2YgcGFja2FnZXNGcm9tT3B0aW9ucyA/PyBbXSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcGFja2FnZUlkZW50aWZpZXIgPSBucGEocmVxdWVzdCk7XG5cbiAgICAgICAgLy8gb25seSByZWdpc3RyeSBpZGVudGlmaWVycyBhcmUgc3VwcG9ydGVkXG4gICAgICAgIGlmICghcGFja2FnZUlkZW50aWZpZXIucmVnaXN0cnkpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihgUGFja2FnZSAnJHtyZXF1ZXN0fScgaXMgbm90IGEgcmVnaXN0cnkgcGFja2FnZSBpZGVudGlmZXIuYCk7XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwYWNrYWdlcy5zb21lKCh2KSA9PiB2Lm5hbWUgPT09IHBhY2thZ2VJZGVudGlmaWVyLm5hbWUpKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoYER1cGxpY2F0ZSBwYWNrYWdlICcke3BhY2thZ2VJZGVudGlmaWVyLm5hbWV9JyBzcGVjaWZpZWQuYCk7XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLm1pZ3JhdGVPbmx5ICYmIHBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdQYWNrYWdlIHNwZWNpZmllciBoYXMgbm8gZWZmZWN0IHdoZW4gdXNpbmcgXCJtaWdyYXRlLW9ubHlcIiBvcHRpb24uJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBuZXh0IG9wdGlvbiBpcyB1c2VkIGFuZCBubyBzcGVjaWZpZXIgc3VwcGxpZWQsIHVzZSBuZXh0IHRhZ1xuICAgICAgICBpZiAob3B0aW9ucy5uZXh0ICYmICFwYWNrYWdlSWRlbnRpZmllci5yYXdTcGVjKSB7XG4gICAgICAgICAgcGFja2FnZUlkZW50aWZpZXIuZmV0Y2hTcGVjID0gJ25leHQnO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFja2FnZXMucHVzaChwYWNrYWdlSWRlbnRpZmllciBhcyBQYWNrYWdlSWRlbnRpZmllcik7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGUubWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zLm1pZ3JhdGVPbmx5ICYmIChvcHRpb25zLmZyb20gfHwgb3B0aW9ucy50bykpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdDYW4gb25seSB1c2UgXCJmcm9tXCIgb3IgXCJ0b1wiIG9wdGlvbnMgd2l0aCBcIm1pZ3JhdGUtb25seVwiIG9wdGlvbi4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gSWYgbm90IGFza2luZyBmb3Igc3RhdHVzIHRoZW4gY2hlY2sgZm9yIGEgY2xlYW4gZ2l0IHJlcG9zaXRvcnkuXG4gICAgLy8gVGhpcyBhbGxvd3MgdGhlIHVzZXIgdG8gZWFzaWx5IHJlc2V0IGFueSBjaGFuZ2VzIGZyb20gdGhlIHVwZGF0ZS5cbiAgICBpZiAocGFja2FnZXMubGVuZ3RoICYmICF0aGlzLmNoZWNrQ2xlYW5HaXQoKSkge1xuICAgICAgaWYgKG9wdGlvbnMuYWxsb3dEaXJ0eSkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICdSZXBvc2l0b3J5IGlzIG5vdCBjbGVhbi4gVXBkYXRlIGNoYW5nZXMgd2lsbCBiZSBtaXhlZCB3aXRoIHByZS1leGlzdGluZyBjaGFuZ2VzLicsXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAnUmVwb3NpdG9yeSBpcyBub3QgY2xlYW4uIFBsZWFzZSBjb21taXQgb3Igc3Rhc2ggYW55IGNoYW5nZXMgYmVmb3JlIHVwZGF0aW5nLicsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIDI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuaW5mbyhgVXNpbmcgcGFja2FnZSBtYW5hZ2VyOiAnJHt0aGlzLnBhY2thZ2VNYW5hZ2VyfSdgKTtcbiAgICB0aGlzLmxvZ2dlci5pbmZvKCdDb2xsZWN0aW5nIGluc3RhbGxlZCBkZXBlbmRlbmNpZXMuLi4nKTtcblxuICAgIGNvbnN0IHJvb3REZXBlbmRlbmNpZXMgPSBhd2FpdCBnZXRQcm9qZWN0RGVwZW5kZW5jaWVzKHRoaXMuY29udGV4dC5yb290KTtcblxuICAgIHRoaXMubG9nZ2VyLmluZm8oYEZvdW5kICR7cm9vdERlcGVuZGVuY2llcy5zaXplfSBkZXBlbmRlbmNpZXMuYCk7XG5cbiAgICBpZiAocGFja2FnZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBTaG93IHN0YXR1c1xuICAgICAgY29uc3QgeyBzdWNjZXNzIH0gPSBhd2FpdCB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoVVBEQVRFX1NDSEVNQVRJQ19DT0xMRUNUSU9OLCAndXBkYXRlJywge1xuICAgICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSB8fCBmYWxzZSxcbiAgICAgICAgbmV4dDogb3B0aW9ucy5uZXh0IHx8IGZhbHNlLFxuICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UgfHwgZmFsc2UsXG4gICAgICAgIHBhY2thZ2VNYW5hZ2VyOiB0aGlzLnBhY2thZ2VNYW5hZ2VyLFxuICAgICAgICBwYWNrYWdlczogW10sXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHN1Y2Nlc3MgPyAwIDogMTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5taWdyYXRlT25seSkge1xuICAgICAgaWYgKCFvcHRpb25zLmZyb20gJiYgdHlwZW9mIG9wdGlvbnMubWlncmF0ZU9ubHkgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICdcImZyb21cIiBvcHRpb24gaXMgcmVxdWlyZWQgd2hlbiB1c2luZyB0aGUgXCJtaWdyYXRlLW9ubHlcIiBvcHRpb24gd2l0aG91dCBhIG1pZ3JhdGlvbiBuYW1lLicsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2UgaWYgKHBhY2thZ2VzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAnQSBzaW5nbGUgcGFja2FnZSBtdXN0IGJlIHNwZWNpZmllZCB3aGVuIHVzaW5nIHRoZSBcIm1pZ3JhdGUtb25seVwiIG9wdGlvbi4nLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICBpZiAob3B0aW9ucy5uZXh0KSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ1wibmV4dFwiIG9wdGlvbiBoYXMgbm8gZWZmZWN0IHdoZW4gdXNpbmcgXCJtaWdyYXRlLW9ubHlcIiBvcHRpb24uJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHBhY2thZ2VOYW1lID0gcGFja2FnZXNbMF0ubmFtZTtcbiAgICAgIGNvbnN0IHBhY2thZ2VEZXBlbmRlbmN5ID0gcm9vdERlcGVuZGVuY2llcy5nZXQocGFja2FnZU5hbWUpO1xuICAgICAgbGV0IHBhY2thZ2VQYXRoID0gcGFja2FnZURlcGVuZGVuY3k/LnBhdGg7XG4gICAgICBsZXQgcGFja2FnZU5vZGUgPSBwYWNrYWdlRGVwZW5kZW5jeT8ucGFja2FnZTtcbiAgICAgIGlmIChwYWNrYWdlRGVwZW5kZW5jeSAmJiAhcGFja2FnZU5vZGUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1BhY2thZ2UgZm91bmQgaW4gcGFja2FnZS5qc29uIGJ1dCBpcyBub3QgaW5zdGFsbGVkLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSBlbHNlIGlmICghcGFja2FnZURlcGVuZGVuY3kpIHtcbiAgICAgICAgLy8gQWxsb3cgcnVubmluZyBtaWdyYXRpb25zIG9uIHRyYW5zaXRpdmVseSBpbnN0YWxsZWQgZGVwZW5kZW5jaWVzXG4gICAgICAgIC8vIFRoZXJlIGNhbiB0ZWNobmljYWxseSBiZSBuZXN0ZWQgbXVsdGlwbGUgdmVyc2lvbnNcbiAgICAgICAgLy8gVE9ETzogSWYgbXVsdGlwbGUsIHRoaXMgc2hvdWxkIGZpbmQgYWxsIHZlcnNpb25zIGFuZCBhc2sgd2hpY2ggb25lIHRvIHVzZVxuICAgICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGZpbmRQYWNrYWdlSnNvbih0aGlzLmNvbnRleHQucm9vdCwgcGFja2FnZU5hbWUpO1xuICAgICAgICBpZiAocGFja2FnZUpzb24pIHtcbiAgICAgICAgICBwYWNrYWdlUGF0aCA9IHBhdGguZGlybmFtZShwYWNrYWdlSnNvbik7XG4gICAgICAgICAgcGFja2FnZU5vZGUgPSBhd2FpdCByZWFkUGFja2FnZUpzb24ocGFja2FnZUpzb24pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICghcGFja2FnZU5vZGUgfHwgIXBhY2thZ2VQYXRoKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdQYWNrYWdlIGlzIG5vdCBpbnN0YWxsZWQuJyk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHVwZGF0ZU1ldGFkYXRhID0gcGFja2FnZU5vZGVbJ25nLXVwZGF0ZSddO1xuICAgICAgbGV0IG1pZ3JhdGlvbnMgPSB1cGRhdGVNZXRhZGF0YT8ubWlncmF0aW9ucztcbiAgICAgIGlmIChtaWdyYXRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1BhY2thZ2UgZG9lcyBub3QgcHJvdmlkZSBtaWdyYXRpb25zLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbWlncmF0aW9ucyAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1BhY2thZ2UgY29udGFpbnMgYSBtYWxmb3JtZWQgbWlncmF0aW9ucyBmaWVsZC4nKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH0gZWxzZSBpZiAocGF0aC5wb3NpeC5pc0Fic29sdXRlKG1pZ3JhdGlvbnMpIHx8IHBhdGgud2luMzIuaXNBYnNvbHV0ZShtaWdyYXRpb25zKSkge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAnUGFja2FnZSBjb250YWlucyBhbiBpbnZhbGlkIG1pZ3JhdGlvbnMgZmllbGQuIEFic29sdXRlIHBhdGhzIGFyZSBub3QgcGVybWl0dGVkLicsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vcm1hbGl6ZSBzbGFzaGVzXG4gICAgICBtaWdyYXRpb25zID0gbWlncmF0aW9ucy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgICAgIGlmIChtaWdyYXRpb25zLnN0YXJ0c1dpdGgoJy4uLycpKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICdQYWNrYWdlIGNvbnRhaW5zIGFuIGludmFsaWQgbWlncmF0aW9ucyBmaWVsZC4gUGF0aHMgb3V0c2lkZSB0aGUgcGFja2FnZSByb290IGFyZSBub3QgcGVybWl0dGVkLicsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGlmIGl0IGlzIGEgcGFja2FnZS1sb2NhbCBsb2NhdGlvblxuICAgICAgY29uc3QgbG9jYWxNaWdyYXRpb25zID0gcGF0aC5qb2luKHBhY2thZ2VQYXRoLCBtaWdyYXRpb25zKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGxvY2FsTWlncmF0aW9ucykpIHtcbiAgICAgICAgbWlncmF0aW9ucyA9IGxvY2FsTWlncmF0aW9ucztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRyeSB0byByZXNvbHZlIGZyb20gcGFja2FnZSBsb2NhdGlvbi5cbiAgICAgICAgLy8gVGhpcyBhdm9pZHMgaXNzdWVzIHdpdGggcGFja2FnZSBob2lzdGluZy5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtaWdyYXRpb25zID0gcmVxdWlyZS5yZXNvbHZlKG1pZ3JhdGlvbnMsIHsgcGF0aHM6IFtwYWNrYWdlUGF0aF0gfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdNaWdyYXRpb25zIGZvciBwYWNrYWdlIHdlcmUgbm90IGZvdW5kLicpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihgVW5hYmxlIHRvIHJlc29sdmUgbWlncmF0aW9ucyBmb3IgcGFja2FnZS4gIFske2UubWVzc2FnZX1dYCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgbGV0IHJlc3VsdDogYm9vbGVhbjtcbiAgICAgIGlmIChvcHRpb25zLm5hbWUpIHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlTWlncmF0aW9uKFxuICAgICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICAgIG1pZ3JhdGlvbnMsXG4gICAgICAgICAgb3B0aW9ucy5uYW1lLFxuICAgICAgICAgIG9wdGlvbnMuY3JlYXRlQ29tbWl0cyxcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGZyb20gPSBjb2VyY2VWZXJzaW9uTnVtYmVyKG9wdGlvbnMuZnJvbSk7XG4gICAgICAgIGlmICghZnJvbSkge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGBcImZyb21cIiB2YWx1ZSBbJHtvcHRpb25zLmZyb219XSBpcyBub3QgYSB2YWxpZCB2ZXJzaW9uLmApO1xuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVNaWdyYXRpb25zKFxuICAgICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICAgIG1pZ3JhdGlvbnMsXG4gICAgICAgICAgZnJvbSxcbiAgICAgICAgICBvcHRpb25zLnRvIHx8IHBhY2thZ2VOb2RlLnZlcnNpb24sXG4gICAgICAgICAgb3B0aW9ucy5jcmVhdGVDb21taXRzLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0ID8gMCA6IDE7XG4gICAgfVxuXG4gICAgY29uc3QgcmVxdWVzdHM6IHtcbiAgICAgIGlkZW50aWZpZXI6IFBhY2thZ2VJZGVudGlmaWVyO1xuICAgICAgbm9kZTogUGFja2FnZVRyZWVOb2RlO1xuICAgIH1bXSA9IFtdO1xuXG4gICAgLy8gVmFsaWRhdGUgcGFja2FnZXMgYWN0dWFsbHkgYXJlIHBhcnQgb2YgdGhlIHdvcmtzcGFjZVxuICAgIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzKSB7XG4gICAgICBjb25zdCBub2RlID0gcm9vdERlcGVuZGVuY2llcy5nZXQocGtnLm5hbWUpO1xuICAgICAgaWYgKCFub2RlPy5wYWNrYWdlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGBQYWNrYWdlICcke3BrZy5uYW1lfScgaXMgbm90IGEgZGVwZW5kZW5jeS5gKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgYSBzcGVjaWZpYyB2ZXJzaW9uIGlzIHJlcXVlc3RlZCBhbmQgbWF0Y2hlcyB0aGUgaW5zdGFsbGVkIHZlcnNpb24sIHNraXAuXG4gICAgICBpZiAocGtnLnR5cGUgPT09ICd2ZXJzaW9uJyAmJiBub2RlLnBhY2thZ2UudmVyc2lvbiA9PT0gcGtnLmZldGNoU3BlYykge1xuICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKGBQYWNrYWdlICcke3BrZy5uYW1lfScgaXMgYWxyZWFkeSBhdCAnJHtwa2cuZmV0Y2hTcGVjfScuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0cy5wdXNoKHsgaWRlbnRpZmllcjogcGtnLCBub2RlIH0pO1xuICAgIH1cblxuICAgIGlmIChyZXF1ZXN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGNvbnN0IHBhY2thZ2VzVG9VcGRhdGU6IHN0cmluZ1tdID0gW107XG5cbiAgICB0aGlzLmxvZ2dlci5pbmZvKCdGZXRjaGluZyBkZXBlbmRlbmN5IG1ldGFkYXRhIGZyb20gcmVnaXN0cnkuLi4nKTtcbiAgICBmb3IgKGNvbnN0IHsgaWRlbnRpZmllcjogcmVxdWVzdElkZW50aWZpZXIsIG5vZGUgfSBvZiByZXF1ZXN0cykge1xuICAgICAgY29uc3QgcGFja2FnZU5hbWUgPSByZXF1ZXN0SWRlbnRpZmllci5uYW1lO1xuXG4gICAgICBsZXQgbWV0YWRhdGE7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBNZXRhZGF0YSByZXF1ZXN0cyBhcmUgaW50ZXJuYWxseSBjYWNoZWQ7IG11bHRpcGxlIHJlcXVlc3RzIGZvciBzYW1lIG5hbWVcbiAgICAgICAgLy8gZG9lcyBub3QgcmVzdWx0IGluIGFkZGl0aW9uYWwgbmV0d29yayB0cmFmZmljXG4gICAgICAgIG1ldGFkYXRhID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWV0YWRhdGEocGFja2FnZU5hbWUsIHRoaXMubG9nZ2VyLCB7XG4gICAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoYEVycm9yIGZldGNoaW5nIG1ldGFkYXRhIGZvciAnJHtwYWNrYWdlTmFtZX0nOiBgICsgZS5tZXNzYWdlKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgLy8gVHJ5IHRvIGZpbmQgYSBwYWNrYWdlIHZlcnNpb24gYmFzZWQgb24gdGhlIHVzZXIgcmVxdWVzdGVkIHBhY2thZ2Ugc3BlY2lmaWVyXG4gICAgICAvLyByZWdpc3RyeSBzcGVjaWZpZXIgdHlwZXMgYXJlIGVpdGhlciB2ZXJzaW9uLCByYW5nZSwgb3IgdGFnXG4gICAgICBsZXQgbWFuaWZlc3Q6IFBhY2thZ2VNYW5pZmVzdCB8IHVuZGVmaW5lZDtcbiAgICAgIGlmIChcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3ZlcnNpb24nIHx8XG4gICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICdyYW5nZScgfHxcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3RhZydcbiAgICAgICkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG1hbmlmZXN0ID0gcGlja01hbmlmZXN0KG1ldGFkYXRhLCByZXF1ZXN0SWRlbnRpZmllci5mZXRjaFNwZWMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ0VUQVJHRVQnKSB7XG4gICAgICAgICAgICAvLyBJZiBub3QgZm91bmQgYW5kIG5leHQgd2FzIHVzZWQgYW5kIHVzZXIgZGlkIG5vdCBwcm92aWRlIGEgc3BlY2lmaWVyLCB0cnkgbGF0ZXN0LlxuICAgICAgICAgICAgLy8gUGFja2FnZSBtYXkgbm90IGhhdmUgYSBuZXh0IHRhZy5cbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3RhZycgJiZcbiAgICAgICAgICAgICAgcmVxdWVzdElkZW50aWZpZXIuZmV0Y2hTcGVjID09PSAnbmV4dCcgJiZcbiAgICAgICAgICAgICAgIXJlcXVlc3RJZGVudGlmaWVyLnJhd1NwZWNcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG1hbmlmZXN0ID0gcGlja01hbmlmZXN0KG1ldGFkYXRhLCAnbGF0ZXN0Jyk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS5jb2RlICE9PSAnRVRBUkdFVCcgJiYgZS5jb2RlICE9PSAnRU5PVkVSU0lPTlMnKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoZS5jb2RlICE9PSAnRU5PVkVSU0lPTlMnKSB7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIW1hbmlmZXN0KSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgIGBQYWNrYWdlIHNwZWNpZmllZCBieSAnJHtyZXF1ZXN0SWRlbnRpZmllci5yYXd9JyBkb2VzIG5vdCBleGlzdCB3aXRoaW4gdGhlIHJlZ2lzdHJ5LmAsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIGlmIChtYW5pZmVzdC52ZXJzaW9uID09PSBub2RlLnBhY2thZ2U/LnZlcnNpb24pIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgUGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nIGlzIGFscmVhZHkgdXAgdG8gZGF0ZS5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChub2RlLnBhY2thZ2UgJiYgQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAudGVzdChub2RlLnBhY2thZ2UubmFtZSkpIHtcbiAgICAgICAgY29uc3QgeyBuYW1lLCB2ZXJzaW9uIH0gPSBub2RlLnBhY2thZ2U7XG4gICAgICAgIGNvbnN0IHRvQmVJbnN0YWxsZWRNYWpvclZlcnNpb24gPSArbWFuaWZlc3QudmVyc2lvbi5zcGxpdCgnLicpWzBdO1xuICAgICAgICBjb25zdCBjdXJyZW50TWFqb3JWZXJzaW9uID0gK3ZlcnNpb24uc3BsaXQoJy4nKVswXTtcblxuICAgICAgICBpZiAodG9CZUluc3RhbGxlZE1ham9yVmVyc2lvbiAtIGN1cnJlbnRNYWpvclZlcnNpb24gPiAxKSB7XG4gICAgICAgICAgLy8gT25seSBhbGxvdyB1cGRhdGluZyBhIHNpbmdsZSB2ZXJzaW9uIGF0IGEgdGltZS5cbiAgICAgICAgICBpZiAoY3VycmVudE1ham9yVmVyc2lvbiA8IDYpIHtcbiAgICAgICAgICAgIC8vIEJlZm9yZSB2ZXJzaW9uIDYsIHRoZSBtYWpvciB2ZXJzaW9ucyB3ZXJlIG5vdCBhbHdheXMgc2VxdWVudGlhbC5cbiAgICAgICAgICAgIC8vIEV4YW1wbGUgQGFuZ3VsYXIvY29yZSBza2lwcGVkIHZlcnNpb24gMywgQGFuZ3VsYXIvY2xpIHNraXBwZWQgdmVyc2lvbnMgMi01LlxuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBVcGRhdGluZyBtdWx0aXBsZSBtYWpvciB2ZXJzaW9ucyBvZiAnJHtuYW1lfScgYXQgb25jZSBpcyBub3Qgc3VwcG9ydGVkLiBQbGVhc2UgbWlncmF0ZSBlYWNoIG1ham9yIHZlcnNpb24gaW5kaXZpZHVhbGx5LlxcbmAgK1xuICAgICAgICAgICAgICAgIGBGb3IgbW9yZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdXBkYXRlIHByb2Nlc3MsIHNlZSBodHRwczovL3VwZGF0ZS5hbmd1bGFyLmlvLy5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50ID0gY3VycmVudE1ham9yVmVyc2lvbiArIDE7XG5cbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVXBkYXRpbmcgbXVsdGlwbGUgbWFqb3IgdmVyc2lvbnMgb2YgJyR7bmFtZX0nIGF0IG9uY2UgaXMgbm90IHN1cHBvcnRlZC4gUGxlYXNlIG1pZ3JhdGUgZWFjaCBtYWpvciB2ZXJzaW9uIGluZGl2aWR1YWxseS5cXG5gICtcbiAgICAgICAgICAgICAgICBgUnVuICduZyB1cGRhdGUgJHtuYW1lfUAke25leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudH0nIGluIHlvdXIgd29ya3NwYWNlIGRpcmVjdG9yeSBgICtcbiAgICAgICAgICAgICAgICBgdG8gdXBkYXRlIHRvIGxhdGVzdCAnJHtuZXh0TWFqb3JWZXJzaW9uRnJvbUN1cnJlbnR9LngnIHZlcnNpb24gb2YgJyR7bmFtZX0nLlxcblxcbmAgK1xuICAgICAgICAgICAgICAgIGBGb3IgbW9yZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdXBkYXRlIHByb2Nlc3MsIHNlZSBodHRwczovL3VwZGF0ZS5hbmd1bGFyLmlvLz92PSR7Y3VycmVudE1ham9yVmVyc2lvbn0uMC0ke25leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudH0uMGAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHBhY2thZ2VzVG9VcGRhdGUucHVzaChyZXF1ZXN0SWRlbnRpZmllci50b1N0cmluZygpKTtcbiAgICB9XG5cbiAgICBpZiAocGFja2FnZXNUb1VwZGF0ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGNvbnN0IHsgc3VjY2VzcyB9ID0gYXdhaXQgdGhpcy5leGVjdXRlU2NoZW1hdGljKFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTiwgJ3VwZGF0ZScsIHtcbiAgICAgIHZlcmJvc2U6IG9wdGlvbnMudmVyYm9zZSB8fCBmYWxzZSxcbiAgICAgIGZvcmNlOiBvcHRpb25zLmZvcmNlIHx8IGZhbHNlLFxuICAgICAgbmV4dDogISFvcHRpb25zLm5leHQsXG4gICAgICBwYWNrYWdlTWFuYWdlcjogdGhpcy5wYWNrYWdlTWFuYWdlcixcbiAgICAgIHBhY2thZ2VzOiBwYWNrYWdlc1RvVXBkYXRlLFxuICAgIH0pO1xuXG4gICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFJlbW92ZSBleGlzdGluZyBub2RlIG1vZHVsZXMgZGlyZWN0b3J5IHRvIHByb3ZpZGUgYSBzdHJvbmdlciBndWFyYW50ZWUgdGhhdCBwYWNrYWdlc1xuICAgICAgICAvLyB3aWxsIGJlIGhvaXN0ZWQgaW50byB0aGUgY29ycmVjdCBsb2NhdGlvbnMuXG4gICAgICAgIGF3YWl0IGZzLnByb21pc2VzLnJtKHBhdGguam9pbih0aGlzLmNvbnRleHQucm9vdCwgJ25vZGVfbW9kdWxlcycpLCB7XG4gICAgICAgICAgZm9yY2U6IHRydWUsXG4gICAgICAgICAgcmVjdXJzaXZlOiB0cnVlLFxuICAgICAgICAgIG1heFJldHJpZXM6IDMsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCB7fVxuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBpbnN0YWxsQWxsUGFja2FnZXMoXG4gICAgICAgIHRoaXMucGFja2FnZU1hbmFnZXIsXG4gICAgICAgIG9wdGlvbnMuZm9yY2UgPyBbJy0tZm9yY2UnXSA6IFtdLFxuICAgICAgICB0aGlzLmNvbnRleHQucm9vdCxcbiAgICAgICk7XG4gICAgICBpZiAocmVzdWx0ICE9PSAwKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1Y2Nlc3MgJiYgb3B0aW9ucy5jcmVhdGVDb21taXRzKSB7XG4gICAgICBjb25zdCBjb21taXR0ZWQgPSB0aGlzLmNvbW1pdChcbiAgICAgICAgYEFuZ3VsYXIgQ0xJIHVwZGF0ZSBmb3IgcGFja2FnZXMgLSAke3BhY2thZ2VzVG9VcGRhdGUuam9pbignLCAnKX1gLFxuICAgICAgKTtcbiAgICAgIGlmICghY29tbWl0dGVkKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoaXMgaXMgYSB0ZW1wb3Jhcnkgd29ya2Fyb3VuZCB0byBhbGxvdyBkYXRhIHRvIGJlIHBhc3NlZCBiYWNrIGZyb20gdGhlIHVwZGF0ZSBzY2hlbWF0aWNcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IG1pZ3JhdGlvbnMgPSAoZ2xvYmFsIGFzIGFueSkuZXh0ZXJuYWxNaWdyYXRpb25zIGFzIHtcbiAgICAgIHBhY2thZ2U6IHN0cmluZztcbiAgICAgIGNvbGxlY3Rpb246IHN0cmluZztcbiAgICAgIGZyb206IHN0cmluZztcbiAgICAgIHRvOiBzdHJpbmc7XG4gICAgfVtdO1xuXG4gICAgaWYgKHN1Y2Nlc3MgJiYgbWlncmF0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBtaWdyYXRpb24gb2YgbWlncmF0aW9ucykge1xuICAgICAgICAvLyBSZXNvbHZlIHRoZSBwYWNrYWdlIGZyb20gdGhlIHdvcmtzcGFjZSByb290LCBhcyBvdGhlcndpc2UgaXQgd2lsbCBiZSByZXNvbHZlZCBmcm9tIHRoZSB0ZW1wXG4gICAgICAgIC8vIGluc3RhbGxlZCBDTEkgdmVyc2lvbi5cbiAgICAgICAgbGV0IHBhY2thZ2VQYXRoO1xuICAgICAgICBsb2dWZXJib3NlKFxuICAgICAgICAgIGBSZXNvbHZpbmcgbWlncmF0aW9uIHBhY2thZ2UgJyR7bWlncmF0aW9uLnBhY2thZ2V9JyBmcm9tICcke3RoaXMuY29udGV4dC5yb290fScuLi5gLFxuICAgICAgICApO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwYWNrYWdlUGF0aCA9IHBhdGguZGlybmFtZShcbiAgICAgICAgICAgICAgLy8gVGhpcyBtYXkgZmFpbCBpZiB0aGUgYHBhY2thZ2UuanNvbmAgaXMgbm90IGV4cG9ydGVkIGFzIGFuIGVudHJ5IHBvaW50XG4gICAgICAgICAgICAgIHJlcXVpcmUucmVzb2x2ZShwYXRoLmpvaW4obWlncmF0aW9uLnBhY2thZ2UsICdwYWNrYWdlLmpzb24nKSwge1xuICAgICAgICAgICAgICAgIHBhdGhzOiBbdGhpcy5jb250ZXh0LnJvb3RdLFxuICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRyeWluZyB0byByZXNvbHZlIHRoZSBwYWNrYWdlJ3MgbWFpbiBlbnRyeSBwb2ludFxuICAgICAgICAgICAgICBwYWNrYWdlUGF0aCA9IHJlcXVpcmUucmVzb2x2ZShtaWdyYXRpb24ucGFja2FnZSwgeyBwYXRoczogW3RoaXMuY29udGV4dC5yb290XSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICBsb2dWZXJib3NlKGUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgYE1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KSB3ZXJlIG5vdCBmb3VuZC5gICtcbiAgICAgICAgICAgICAgICAnIFRoZSBwYWNrYWdlIGNvdWxkIG5vdCBiZSBmb3VuZCBpbiB0aGUgd29ya3NwYWNlLicsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KS4gIFske2UubWVzc2FnZX1dYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbWlncmF0aW9ucztcblxuICAgICAgICAvLyBDaGVjayBpZiBpdCBpcyBhIHBhY2thZ2UtbG9jYWwgbG9jYXRpb25cbiAgICAgICAgY29uc3QgbG9jYWxNaWdyYXRpb25zID0gcGF0aC5qb2luKHBhY2thZ2VQYXRoLCBtaWdyYXRpb24uY29sbGVjdGlvbik7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGxvY2FsTWlncmF0aW9ucykpIHtcbiAgICAgICAgICBtaWdyYXRpb25zID0gbG9jYWxNaWdyYXRpb25zO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFRyeSB0byByZXNvbHZlIGZyb20gcGFja2FnZSBsb2NhdGlvbi5cbiAgICAgICAgICAvLyBUaGlzIGF2b2lkcyBpc3N1ZXMgd2l0aCBwYWNrYWdlIGhvaXN0aW5nLlxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtaWdyYXRpb25zID0gcmVxdWlyZS5yZXNvbHZlKG1pZ3JhdGlvbi5jb2xsZWN0aW9uLCB7IHBhdGhzOiBbcGFja2FnZVBhdGhdIH0pO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihgTWlncmF0aW9ucyBmb3IgcGFja2FnZSAoJHttaWdyYXRpb24ucGFja2FnZX0pIHdlcmUgbm90IGZvdW5kLmApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KS4gIFske2UubWVzc2FnZX1dYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbnMoXG4gICAgICAgICAgbWlncmF0aW9uLnBhY2thZ2UsXG4gICAgICAgICAgbWlncmF0aW9ucyxcbiAgICAgICAgICBtaWdyYXRpb24uZnJvbSxcbiAgICAgICAgICBtaWdyYXRpb24udG8sXG4gICAgICAgICAgb3B0aW9ucy5jcmVhdGVDb21taXRzLFxuICAgICAgICApO1xuXG4gICAgICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3VjY2VzcyA/IDAgOiAxO1xuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIGNvbW1pdCB3YXMgc3VjY2Vzc2Z1bC5cbiAgICovXG4gIHByaXZhdGUgY29tbWl0KG1lc3NhZ2U6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIENoZWNrIGlmIGEgY29tbWl0IGlzIG5lZWRlZC5cbiAgICBsZXQgY29tbWl0TmVlZGVkOiBib29sZWFuO1xuICAgIHRyeSB7XG4gICAgICBjb21taXROZWVkZWQgPSBoYXNDaGFuZ2VzVG9Db21taXQoKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGAgIEZhaWxlZCB0byByZWFkIEdpdCB0cmVlOlxcbiR7ZXJyLnN0ZGVycn1gKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghY29tbWl0TmVlZGVkKSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCcgIE5vIGNoYW5nZXMgdG8gY29tbWl0IGFmdGVyIG1pZ3JhdGlvbi4nKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gQ29tbWl0IGNoYW5nZXMgYW5kIGFib3J0IG9uIGVycm9yLlxuICAgIHRyeSB7XG4gICAgICBjcmVhdGVDb21taXQobWVzc2FnZSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGNvbW1pdCB1cGRhdGUgKCR7bWVzc2FnZX0pOlxcbiR7ZXJyLnN0ZGVycn1gKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE5vdGlmeSB1c2VyIG9mIHRoZSBjb21taXQuXG4gICAgY29uc3QgaGFzaCA9IGZpbmRDdXJyZW50R2l0U2hhKCk7XG4gICAgY29uc3Qgc2hvcnRNZXNzYWdlID0gbWVzc2FnZS5zcGxpdCgnXFxuJylbMF07XG4gICAgaWYgKGhhc2gpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oYCAgQ29tbWl0dGVkIG1pZ3JhdGlvbiBzdGVwICgke2dldFNob3J0SGFzaChoYXNoKX0pOiAke3Nob3J0TWVzc2FnZX0uYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIENvbW1pdCB3YXMgc3VjY2Vzc2Z1bCwgYnV0IHJlYWRpbmcgdGhlIGhhc2ggd2FzIG5vdC4gU29tZXRoaW5nIHdlaXJkIGhhcHBlbmVkLFxuICAgICAgLy8gYnV0IG5vdGhpbmcgdGhhdCB3b3VsZCBzdG9wIHRoZSB1cGRhdGUuIEp1c3QgbG9nIHRoZSB3ZWlyZG5lc3MgYW5kIGNvbnRpbnVlLlxuICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgICBDb21taXR0ZWQgbWlncmF0aW9uIHN0ZXA6ICR7c2hvcnRNZXNzYWdlfS5gKTtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJyAgRmFpbGVkIHRvIGxvb2sgdXAgaGFzaCBvZiBtb3N0IHJlY2VudCBjb21taXQsIGNvbnRpbnVpbmcgYW55d2F5cy4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tDbGVhbkdpdCgpOiBib29sZWFuIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdG9wTGV2ZWwgPSBleGVjU3luYygnZ2l0IHJldi1wYXJzZSAtLXNob3ctdG9wbGV2ZWwnLCB7XG4gICAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICAgIHN0ZGlvOiAncGlwZScsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGV4ZWNTeW5jKCdnaXQgc3RhdHVzIC0tcG9yY2VsYWluJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pO1xuICAgICAgaWYgKHJlc3VsdC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IGZpbGVzIGluc2lkZSB0aGUgd29ya3NwYWNlIHJvb3QgYXJlIHJlbGV2YW50XG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHJlc3VsdC5zcGxpdCgnXFxuJykpIHtcbiAgICAgICAgY29uc3QgcmVsYXRpdmVFbnRyeSA9IHBhdGgucmVsYXRpdmUoXG4gICAgICAgICAgcGF0aC5yZXNvbHZlKHRoaXMuY29udGV4dC5yb290KSxcbiAgICAgICAgICBwYXRoLnJlc29sdmUodG9wTGV2ZWwudHJpbSgpLCBlbnRyeS5zbGljZSgzKS50cmltKCkpLFxuICAgICAgICApO1xuXG4gICAgICAgIGlmICghcmVsYXRpdmVFbnRyeS5zdGFydHNXaXRoKCcuLicpICYmICFwYXRoLmlzQWJzb2x1dGUocmVsYXRpdmVFbnRyeSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIHt9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIGN1cnJlbnQgaW5zdGFsbGVkIENMSSB2ZXJzaW9uIGlzIG9sZGVyIG9yIG5ld2VyIHRoYW4gYSBjb21wYXRpYmxlIHZlcnNpb24uXG4gICAqIEByZXR1cm5zIHRoZSB2ZXJzaW9uIHRvIGluc3RhbGwgb3IgbnVsbCB3aGVuIHRoZXJlIGlzIG5vIHVwZGF0ZSB0byBpbnN0YWxsLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBjaGVja0NMSVZlcnNpb24oXG4gICAgcGFja2FnZXNUb1VwZGF0ZTogc3RyaW5nW10gfCBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgdmVyYm9zZSA9IGZhbHNlLFxuICAgIG5leHQgPSBmYWxzZSxcbiAgKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgeyB2ZXJzaW9uIH0gPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChcbiAgICAgIGBAYW5ndWxhci9jbGlAJHt0aGlzLmdldENMSVVwZGF0ZVJ1bm5lclZlcnNpb24oXG4gICAgICAgIHR5cGVvZiBwYWNrYWdlc1RvVXBkYXRlID09PSAnc3RyaW5nJyA/IFtwYWNrYWdlc1RvVXBkYXRlXSA6IHBhY2thZ2VzVG9VcGRhdGUsXG4gICAgICAgIG5leHQsXG4gICAgICApfWAsXG4gICAgICB0aGlzLmxvZ2dlcixcbiAgICAgIHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgdXNpbmdZYXJuOiB0aGlzLnBhY2thZ2VNYW5hZ2VyID09PSBQYWNrYWdlTWFuYWdlci5ZYXJuLFxuICAgICAgfSxcbiAgICApO1xuXG4gICAgcmV0dXJuIFZFUlNJT04uZnVsbCA9PT0gdmVyc2lvbiA/IG51bGwgOiB2ZXJzaW9uO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRDTElVcGRhdGVSdW5uZXJWZXJzaW9uKFxuICAgIHBhY2thZ2VzVG9VcGRhdGU6IHN0cmluZ1tdIHwgdW5kZWZpbmVkLFxuICAgIG5leHQ6IGJvb2xlYW4sXG4gICk6IHN0cmluZyB8IG51bWJlciB7XG4gICAgaWYgKG5leHQpIHtcbiAgICAgIHJldHVybiAnbmV4dCc7XG4gICAgfVxuXG4gICAgY29uc3QgdXBkYXRpbmdBbmd1bGFyUGFja2FnZSA9IHBhY2thZ2VzVG9VcGRhdGU/LmZpbmQoKHIpID0+IEFOR1VMQVJfUEFDS0FHRVNfUkVHRVhQLnRlc3QocikpO1xuICAgIGlmICh1cGRhdGluZ0FuZ3VsYXJQYWNrYWdlKSB7XG4gICAgICAvLyBJZiB3ZSBhcmUgdXBkYXRpbmcgYW55IEFuZ3VsYXIgcGFja2FnZSB3ZSBjYW4gdXBkYXRlIHRoZSBDTEkgdG8gdGhlIHRhcmdldCB2ZXJzaW9uIGJlY2F1c2VcbiAgICAgIC8vIG1pZ3JhdGlvbnMgZm9yIEBhbmd1bGFyL2NvcmVAMTMgY2FuIGJlIGV4ZWN1dGVkIHVzaW5nIEFuZ3VsYXIvY2xpQDEzLlxuICAgICAgLy8gVGhpcyBpcyBzYW1lIGJlaGF2aW91ciBhcyBgbnB4IEBhbmd1bGFyL2NsaUAxMyB1cGRhdGUgQGFuZ3VsYXIvY29yZUAxM2AuXG5cbiAgICAgIC8vIGBAYW5ndWxhci9jbGlAMTNgIC0+IFsnJywgJ2FuZ3VsYXIvY2xpJywgJzEzJ11cbiAgICAgIC8vIGBAYW5ndWxhci9jbGlgIC0+IFsnJywgJ2FuZ3VsYXIvY2xpJ11cbiAgICAgIGNvbnN0IHRlbXBWZXJzaW9uID0gY29lcmNlVmVyc2lvbk51bWJlcih1cGRhdGluZ0FuZ3VsYXJQYWNrYWdlLnNwbGl0KCdAJylbMl0pO1xuXG4gICAgICByZXR1cm4gc2VtdmVyLnBhcnNlKHRlbXBWZXJzaW9uKT8ubWFqb3IgPz8gJ2xhdGVzdCc7XG4gICAgfVxuXG4gICAgLy8gV2hlbiBub3QgdXBkYXRpbmcgYW4gQW5ndWxhciBwYWNrYWdlIHdlIGNhbm5vdCBkZXRlcm1pbmUgd2hpY2ggc2NoZW1hdGljIHJ1bnRpbWUgdGhlIG1pZ3JhdGlvbiBzaG91bGQgdG8gYmUgZXhlY3V0ZWQgaW4uXG4gICAgLy8gVHlwaWNhbGx5LCB3ZSBjYW4gYXNzdW1lIHRoYXQgdGhlIGBAYW5ndWxhci9jbGlgIHdhcyB1cGRhdGVkIHByZXZpb3VzbHkuXG4gICAgLy8gRXhhbXBsZTogQW5ndWxhciBvZmZpY2lhbCBwYWNrYWdlcyBhcmUgdHlwaWNhbGx5IHVwZGF0ZWQgcHJpb3IgdG8gTkdSWCBldGMuLi5cbiAgICAvLyBUaGVyZWZvcmUsIHdlIG9ubHkgdXBkYXRlIHRvIHRoZSBsYXRlc3QgcGF0Y2ggdmVyc2lvbiBvZiB0aGUgaW5zdGFsbGVkIG1ham9yIHZlcnNpb24gb2YgdGhlIEFuZ3VsYXIgQ0xJLlxuXG4gICAgLy8gVGhpcyBpcyBpbXBvcnRhbnQgYmVjYXVzZSB3ZSBtaWdodCBlbmQgdXAgaW4gYSBzY2VuYXJpbyB3aGVyZSBsb2NhbGx5IEFuZ3VsYXIgdjEyIGlzIGluc3RhbGxlZCwgdXBkYXRpbmcgTkdSWCBmcm9tIDExIHRvIDEyLlxuICAgIC8vIFdlIGVuZCB1cCB1c2luZyBBbmd1bGFyIENsSSB2MTMgdG8gcnVuIHRoZSBtaWdyYXRpb25zIGlmIHdlIHJ1biB0aGUgbWlncmF0aW9ucyB1c2luZyB0aGUgQ0xJIGluc3RhbGxlZCBtYWpvciB2ZXJzaW9uICsgMSBsb2dpYy5cbiAgICByZXR1cm4gVkVSU0lPTi5tYWpvcjtcbiAgfVxufVxuXG4vKipcbiAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIHdvcmtpbmcgZGlyZWN0b3J5IGhhcyBHaXQgY2hhbmdlcyB0byBjb21taXQuXG4gKi9cbmZ1bmN0aW9uIGhhc0NoYW5nZXNUb0NvbW1pdCgpOiBib29sZWFuIHtcbiAgLy8gTGlzdCBhbGwgbW9kaWZpZWQgZmlsZXMgbm90IGNvdmVyZWQgYnkgLmdpdGlnbm9yZS5cbiAgY29uc3QgZmlsZXMgPSBleGVjU3luYygnZ2l0IGxzLWZpbGVzIC1tIC1kIC1vIC0tZXhjbHVkZS1zdGFuZGFyZCcpLnRvU3RyaW5nKCk7XG5cbiAgLy8gSWYgYW55IGZpbGVzIGFyZSByZXR1cm5lZCwgdGhlbiB0aGVyZSBtdXN0IGJlIHNvbWV0aGluZyB0byBjb21taXQuXG4gIHJldHVybiBmaWxlcyAhPT0gJyc7XG59XG5cbi8qKlxuICogUHJlY29uZGl0aW9uOiBNdXN0IGhhdmUgcGVuZGluZyBjaGFuZ2VzIHRvIGNvbW1pdCwgdGhleSBkbyBub3QgbmVlZCB0byBiZSBzdGFnZWQuXG4gKiBQb3N0Y29uZGl0aW9uOiBUaGUgR2l0IHdvcmtpbmcgdHJlZSBpcyBjb21taXR0ZWQgYW5kIHRoZSByZXBvIGlzIGNsZWFuLlxuICogQHBhcmFtIG1lc3NhZ2UgVGhlIGNvbW1pdCBtZXNzYWdlIHRvIHVzZS5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQ29tbWl0KG1lc3NhZ2U6IHN0cmluZykge1xuICAvLyBTdGFnZSBlbnRpcmUgd29ya2luZyB0cmVlIGZvciBjb21taXQuXG4gIGV4ZWNTeW5jKCdnaXQgYWRkIC1BJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pO1xuXG4gIC8vIENvbW1pdCB3aXRoIHRoZSBtZXNzYWdlIHBhc3NlZCB2aWEgc3RkaW4gdG8gYXZvaWQgYmFzaCBlc2NhcGluZyBpc3N1ZXMuXG4gIGV4ZWNTeW5jKCdnaXQgY29tbWl0IC0tbm8tdmVyaWZ5IC1GIC0nLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScsIGlucHV0OiBtZXNzYWdlIH0pO1xufVxuXG4vKipcbiAqIEByZXR1cm4gVGhlIEdpdCBTSEEgaGFzaCBvZiB0aGUgSEVBRCBjb21taXQuIFJldHVybnMgbnVsbCBpZiB1bmFibGUgdG8gcmV0cmlldmUgdGhlIGhhc2guXG4gKi9cbmZ1bmN0aW9uIGZpbmRDdXJyZW50R2l0U2hhKCk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIGNvbnN0IGhhc2ggPSBleGVjU3luYygnZ2l0IHJldi1wYXJzZSBIRUFEJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pO1xuXG4gICAgcmV0dXJuIGhhc2gudHJpbSgpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTaG9ydEhhc2goY29tbWl0SGFzaDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNvbW1pdEhhc2guc2xpY2UoMCwgOSk7XG59XG5cbmZ1bmN0aW9uIGNvZXJjZVZlcnNpb25OdW1iZXIodmVyc2lvbjogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICghdmVyc2lvbikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgaWYgKCF2ZXJzaW9uLm1hdGNoKC9eXFxkezEsMzB9XFwuXFxkezEsMzB9XFwuXFxkezEsMzB9LykpIHtcbiAgICBjb25zdCBtYXRjaCA9IHZlcnNpb24ubWF0Y2goL15cXGR7MSwzMH0oXFwuXFxkezEsMzB9KSovKTtcblxuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghbWF0Y2hbMV0pIHtcbiAgICAgIHZlcnNpb24gPSB2ZXJzaW9uLnN1YnN0cigwLCBtYXRjaFswXS5sZW5ndGgpICsgJy4wLjAnICsgdmVyc2lvbi5zdWJzdHIobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICB9IGVsc2UgaWYgKCFtYXRjaFsyXSkge1xuICAgICAgdmVyc2lvbiA9IHZlcnNpb24uc3Vic3RyKDAsIG1hdGNoWzBdLmxlbmd0aCkgKyAnLjAnICsgdmVyc2lvbi5zdWJzdHIobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHNlbXZlci52YWxpZCh2ZXJzaW9uKTtcbn1cbiJdfQ==