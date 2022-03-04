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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy91cGRhdGUtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsMkRBQTJFO0FBQzNFLDREQUFnRTtBQUNoRSxpREFBeUM7QUFDekMsdUNBQXlCO0FBQ3pCLHNFQUFrQztBQUNsQywwRUFBNkM7QUFDN0MsMkNBQTZCO0FBQzdCLCtDQUFpQztBQUNqQyxxRUFBZ0U7QUFDaEUsK0NBQTRDO0FBRTVDLDJFQUFzRTtBQUN0RSwrQ0FBNEM7QUFDNUMsOENBQTRDO0FBQzVDLGtFQUFxRjtBQUNyRixvREFBNEQ7QUFDNUQsa0VBQXNGO0FBQ3RGLG9FQUt1QztBQUN2Qyw0REFLbUM7QUFHbkMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUMzQyxTQUFTLEVBQ1Qsa0RBQWtELENBQ25ELENBQUM7QUFFRjs7O0dBR0c7QUFDSCxNQUFNLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUN2RSxNQUFNLG1CQUFtQixHQUN2QixzQkFBc0IsS0FBSyxTQUFTO0lBQ3BDLHNCQUFzQixLQUFLLEdBQUc7SUFDOUIsc0JBQXNCLENBQUMsV0FBVyxFQUFFLEtBQUssT0FBTyxDQUFDO0FBRW5ELE1BQU0sdUJBQXVCLEdBQUcsNkJBQTZCLENBQUM7QUFFOUQsTUFBYSxhQUFjLFNBQVEsaUJBQTRCO0lBQS9EOztRQUMyQiwwQkFBcUIsR0FBRyxJQUFJLENBQUM7UUFFOUMsbUJBQWMsR0FBRyxpQ0FBYyxDQUFDLEdBQUcsQ0FBQztJQSt5QjlDLENBQUM7SUE3eUJVLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBd0M7UUFDaEUsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLElBQUEsbUNB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LENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFFdEQsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2IsT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDekY7YUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BCLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3ZGO2FBQU07WUFDTCxPQUFPLElBQUksQ0FBQztTQUNiO0tBQ0Y7SUFFRCxPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBVbnN1Y2Nlc3NmdWxXb3JrZmxvd0V4ZWN1dGlvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVXb3JrZmxvdyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB7IGV4ZWNTeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgbnBhIGZyb20gJ25wbS1wYWNrYWdlLWFyZyc7XG5pbXBvcnQgcGlja01hbmlmZXN0IGZyb20gJ25wbS1waWNrLW1hbmlmZXN0JztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBzZW12ZXIgZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBBcmd1bWVudHMgfSBmcm9tICcuLi9tb2RlbHMvaW50ZXJmYWNlJztcbmltcG9ydCB7IFNjaGVtYXRpY0VuZ2luZUhvc3QgfSBmcm9tICcuLi9tb2RlbHMvc2NoZW1hdGljLWVuZ2luZS1ob3N0JztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi9tb2RlbHMvdmVyc2lvbic7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgaW5zdGFsbEFsbFBhY2thZ2VzLCBydW5UZW1wUGFja2FnZUJpbiB9IGZyb20gJy4uL3V0aWxpdGllcy9pbnN0YWxsLXBhY2thZ2UnO1xuaW1wb3J0IHsgd3JpdGVFcnJvclRvTG9nRmlsZSB9IGZyb20gJy4uL3V0aWxpdGllcy9sb2ctZmlsZSc7XG5pbXBvcnQgeyBlbnN1cmVDb21wYXRpYmxlTnBtLCBnZXRQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXInO1xuaW1wb3J0IHtcbiAgUGFja2FnZUlkZW50aWZpZXIsXG4gIFBhY2thZ2VNYW5pZmVzdCxcbiAgZmV0Y2hQYWNrYWdlTWFuaWZlc3QsXG4gIGZldGNoUGFja2FnZU1ldGFkYXRhLFxufSBmcm9tICcuLi91dGlsaXRpZXMvcGFja2FnZS1tZXRhZGF0YSc7XG5pbXBvcnQge1xuICBQYWNrYWdlVHJlZU5vZGUsXG4gIGZpbmRQYWNrYWdlSnNvbixcbiAgZ2V0UHJvamVjdERlcGVuZGVuY2llcyxcbiAgcmVhZFBhY2thZ2VKc29uLFxufSBmcm9tICcuLi91dGlsaXRpZXMvcGFja2FnZS10cmVlJztcbmltcG9ydCB7IFNjaGVtYSBhcyBVcGRhdGVDb21tYW5kU2NoZW1hIH0gZnJvbSAnLi91cGRhdGUnO1xuXG5jb25zdCBVUERBVEVfU0NIRU1BVElDX0NPTExFQ1RJT04gPSBwYXRoLmpvaW4oXG4gIF9fZGlybmFtZSxcbiAgJy4uL3NyYy9jb21tYW5kcy91cGRhdGUvc2NoZW1hdGljL2NvbGxlY3Rpb24uanNvbicsXG4pO1xuXG4vKipcbiAqIERpc2FibGUgQ0xJIHZlcnNpb24gbWlzbWF0Y2ggY2hlY2tzIGFuZCBmb3JjZXMgdXNhZ2Ugb2YgdGhlIGludm9rZWQgQ0xJXG4gKiBpbnN0ZWFkIG9mIGludm9raW5nIHRoZSBsb2NhbCBpbnN0YWxsZWQgdmVyc2lvbi5cbiAqL1xuY29uc3QgZGlzYWJsZVZlcnNpb25DaGVja0VudiA9IHByb2Nlc3MuZW52WydOR19ESVNBQkxFX1ZFUlNJT05fQ0hFQ0snXTtcbmNvbnN0IGRpc2FibGVWZXJzaW9uQ2hlY2sgPVxuICBkaXNhYmxlVmVyc2lvbkNoZWNrRW52ICE9PSB1bmRlZmluZWQgJiZcbiAgZGlzYWJsZVZlcnNpb25DaGVja0VudiAhPT0gJzAnICYmXG4gIGRpc2FibGVWZXJzaW9uQ2hlY2tFbnYudG9Mb3dlckNhc2UoKSAhPT0gJ2ZhbHNlJztcblxuY29uc3QgQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAgPSAvXkAoPzphbmd1bGFyfG5ndW5pdmVyc2FsKVxcLy87XG5cbmV4cG9ydCBjbGFzcyBVcGRhdGVDb21tYW5kIGV4dGVuZHMgQ29tbWFuZDxVcGRhdGVDb21tYW5kU2NoZW1hPiB7XG4gIHB1YmxpYyBvdmVycmlkZSByZWFkb25seSBhbGxvd01pc3NpbmdXb3Jrc3BhY2UgPSB0cnVlO1xuICBwcml2YXRlIHdvcmtmbG93ITogTm9kZVdvcmtmbG93O1xuICBwcml2YXRlIHBhY2thZ2VNYW5hZ2VyID0gUGFja2FnZU1hbmFnZXIuTnBtO1xuXG4gIG92ZXJyaWRlIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogVXBkYXRlQ29tbWFuZFNjaGVtYSAmIEFyZ3VtZW50cykge1xuICAgIHRoaXMucGFja2FnZU1hbmFnZXIgPSBhd2FpdCBnZXRQYWNrYWdlTWFuYWdlcih0aGlzLmNvbnRleHQucm9vdCk7XG4gICAgdGhpcy53b3JrZmxvdyA9IG5ldyBOb2RlV29ya2Zsb3codGhpcy5jb250ZXh0LnJvb3QsIHtcbiAgICAgIHBhY2thZ2VNYW5hZ2VyOiB0aGlzLnBhY2thZ2VNYW5hZ2VyLFxuICAgICAgcGFja2FnZU1hbmFnZXJGb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICAgIC8vIF9fZGlybmFtZSAtPiBmYXZvciBAc2NoZW1hdGljcy91cGRhdGUgZnJvbSB0aGlzIHBhY2thZ2VcbiAgICAgIC8vIE90aGVyd2lzZSwgdXNlIHBhY2thZ2VzIGZyb20gdGhlIGFjdGl2ZSB3b3Jrc3BhY2UgKG1pZ3JhdGlvbnMpXG4gICAgICByZXNvbHZlUGF0aHM6IFtfX2Rpcm5hbWUsIHRoaXMuY29udGV4dC5yb290XSxcbiAgICAgIHNjaGVtYVZhbGlkYXRpb246IHRydWUsXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjaGVtYXRpYyhcbiAgICBjb2xsZWN0aW9uOiBzdHJpbmcsXG4gICAgc2NoZW1hdGljOiBzdHJpbmcsXG4gICAgb3B0aW9ucyA9IHt9LFxuICApOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgZmlsZXM6IFNldDxzdHJpbmc+IH0+IHtcbiAgICBsZXQgZXJyb3IgPSBmYWxzZTtcbiAgICBsZXQgbG9nczogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCBmaWxlcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgY29uc3QgcmVwb3J0ZXJTdWJzY3JpcHRpb24gPSB0aGlzLndvcmtmbG93LnJlcG9ydGVyLnN1YnNjcmliZSgoZXZlbnQpID0+IHtcbiAgICAgIC8vIFN0cmlwIGxlYWRpbmcgc2xhc2ggdG8gcHJldmVudCBjb25mdXNpb24uXG4gICAgICBjb25zdCBldmVudFBhdGggPSBldmVudC5wYXRoLnN0YXJ0c1dpdGgoJy8nKSA/IGV2ZW50LnBhdGguc3Vic3RyKDEpIDogZXZlbnQucGF0aDtcblxuICAgICAgc3dpdGNoIChldmVudC5raW5kKSB7XG4gICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICBlcnJvciA9IHRydWU7XG4gICAgICAgICAgY29uc3QgZGVzYyA9IGV2ZW50LmRlc2NyaXB0aW9uID09ICdhbHJlYWR5RXhpc3QnID8gJ2FscmVhZHkgZXhpc3RzJyA6ICdkb2VzIG5vdCBleGlzdC4nO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGBFUlJPUiEgJHtldmVudFBhdGh9ICR7ZGVzY30uYCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3VwZGF0ZSc6XG4gICAgICAgICAgbG9ncy5wdXNoKGAke2NvbG9ycy5jeWFuKCdVUERBVEUnKX0gJHtldmVudFBhdGh9ICgke2V2ZW50LmNvbnRlbnQubGVuZ3RofSBieXRlcylgKTtcbiAgICAgICAgICBmaWxlcy5hZGQoZXZlbnRQYXRoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnY3JlYXRlJzpcbiAgICAgICAgICBsb2dzLnB1c2goYCR7Y29sb3JzLmdyZWVuKCdDUkVBVEUnKX0gJHtldmVudFBhdGh9ICgke2V2ZW50LmNvbnRlbnQubGVuZ3RofSBieXRlcylgKTtcbiAgICAgICAgICBmaWxlcy5hZGQoZXZlbnRQYXRoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICBsb2dzLnB1c2goYCR7Y29sb3JzLnllbGxvdygnREVMRVRFJyl9ICR7ZXZlbnRQYXRofWApO1xuICAgICAgICAgIGZpbGVzLmFkZChldmVudFBhdGgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdyZW5hbWUnOlxuICAgICAgICAgIGNvbnN0IGV2ZW50VG9QYXRoID0gZXZlbnQudG8uc3RhcnRzV2l0aCgnLycpID8gZXZlbnQudG8uc3Vic3RyKDEpIDogZXZlbnQudG87XG4gICAgICAgICAgbG9ncy5wdXNoKGAke2NvbG9ycy5ibHVlKCdSRU5BTUUnKX0gJHtldmVudFBhdGh9ID0+ICR7ZXZlbnRUb1BhdGh9YCk7XG4gICAgICAgICAgZmlsZXMuYWRkKGV2ZW50UGF0aCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBsaWZlY3ljbGVTdWJzY3JpcHRpb24gPSB0aGlzLndvcmtmbG93LmxpZmVDeWNsZS5zdWJzY3JpYmUoKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoZXZlbnQua2luZCA9PSAnZW5kJyB8fCBldmVudC5raW5kID09ICdwb3N0LXRhc2tzLXN0YXJ0Jykge1xuICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgLy8gT3V0cHV0IHRoZSBsb2dnaW5nIHF1ZXVlLCBubyBlcnJvciBoYXBwZW5lZC5cbiAgICAgICAgICBsb2dzLmZvckVhY2goKGxvZykgPT4gdGhpcy5sb2dnZXIuaW5mbyhgICAke2xvZ31gKSk7XG4gICAgICAgICAgbG9ncyA9IFtdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBUT0RPOiBBbGxvdyBwYXNzaW5nIGEgc2NoZW1hdGljIGluc3RhbmNlIGRpcmVjdGx5XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMud29ya2Zsb3dcbiAgICAgICAgLmV4ZWN1dGUoe1xuICAgICAgICAgIGNvbGxlY3Rpb24sXG4gICAgICAgICAgc2NoZW1hdGljLFxuICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgbG9nZ2VyOiB0aGlzLmxvZ2dlcixcbiAgICAgICAgfSlcbiAgICAgICAgLnRvUHJvbWlzZSgpO1xuXG4gICAgICByZXBvcnRlclN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgbGlmZWN5Y2xlU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG5cbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6ICFlcnJvciwgZmlsZXMgfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIFVuc3VjY2Vzc2Z1bFdvcmtmbG93RXhlY3V0aW9uKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgIGAke2NvbG9ycy5zeW1ib2xzLmNyb3NzfSBNaWdyYXRpb24gZmFpbGVkLiBTZWUgYWJvdmUgZm9yIGZ1cnRoZXIgZGV0YWlscy5cXG5gLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgbG9nUGF0aCA9IHdyaXRlRXJyb3JUb0xvZ0ZpbGUoZSk7XG4gICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKFxuICAgICAgICAgIGAke2NvbG9ycy5zeW1ib2xzLmNyb3NzfSBNaWdyYXRpb24gZmFpbGVkOiAke2UubWVzc2FnZX1cXG5gICtcbiAgICAgICAgICAgIGAgIFNlZSBcIiR7bG9nUGF0aH1cIiBmb3IgZnVydGhlciBkZXRhaWxzLlxcbmAsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBmaWxlcyB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIFdoZXRoZXIgb3Igbm90IHRoZSBtaWdyYXRpb24gd2FzIHBlcmZvcm1lZCBzdWNjZXNzZnVsbHkuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVNaWdyYXRpb24oXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICBjb2xsZWN0aW9uUGF0aDogc3RyaW5nLFxuICAgIG1pZ3JhdGlvbk5hbWU6IHN0cmluZyxcbiAgICBjb21taXQ/OiBib29sZWFuLFxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gdGhpcy53b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uUGF0aCk7XG4gICAgY29uc3QgbmFtZSA9IGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKCkuZmluZCgobmFtZSkgPT4gbmFtZSA9PT0gbWlncmF0aW9uTmFtZSk7XG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcihgQ2Fubm90IGZpbmQgbWlncmF0aW9uICcke21pZ3JhdGlvbk5hbWV9JyBpbiAnJHtwYWNrYWdlTmFtZX0nLmApO1xuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3Qgc2NoZW1hdGljID0gdGhpcy53b3JrZmxvdy5lbmdpbmUuY3JlYXRlU2NoZW1hdGljKG5hbWUsIGNvbGxlY3Rpb24pO1xuXG4gICAgdGhpcy5sb2dnZXIuaW5mbyhcbiAgICAgIGNvbG9ycy5jeWFuKGAqKiBFeGVjdXRpbmcgJyR7bWlncmF0aW9uTmFtZX0nIG9mIHBhY2thZ2UgJyR7cGFja2FnZU5hbWV9JyAqKlxcbmApLFxuICAgICk7XG5cbiAgICByZXR1cm4gdGhpcy5leGVjdXRlUGFja2FnZU1pZ3JhdGlvbnMoW3NjaGVtYXRpYy5kZXNjcmlwdGlvbl0sIHBhY2thZ2VOYW1lLCBjb21taXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIG1pZ3JhdGlvbnMgd2VyZSBwZXJmb3JtZWQgc3VjY2Vzc2Z1bGx5LlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlTWlncmF0aW9ucyhcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIGNvbGxlY3Rpb25QYXRoOiBzdHJpbmcsXG4gICAgZnJvbTogc3RyaW5nLFxuICAgIHRvOiBzdHJpbmcsXG4gICAgY29tbWl0PzogYm9vbGVhbixcbiAgKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMud29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvblBhdGgpO1xuICAgIGNvbnN0IG1pZ3JhdGlvblJhbmdlID0gbmV3IHNlbXZlci5SYW5nZShcbiAgICAgICc+JyArIChzZW12ZXIucHJlcmVsZWFzZShmcm9tKSA/IGZyb20uc3BsaXQoJy0nKVswXSArICctMCcgOiBmcm9tKSArICcgPD0nICsgdG8uc3BsaXQoJy0nKVswXSxcbiAgICApO1xuICAgIGNvbnN0IG1pZ3JhdGlvbnMgPSBbXTtcblxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBjb2xsZWN0aW9uLmxpc3RTY2hlbWF0aWNOYW1lcygpKSB7XG4gICAgICBjb25zdCBzY2hlbWF0aWMgPSB0aGlzLndvcmtmbG93LmVuZ2luZS5jcmVhdGVTY2hlbWF0aWMobmFtZSwgY29sbGVjdGlvbik7XG4gICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IHNjaGVtYXRpYy5kZXNjcmlwdGlvbiBhcyB0eXBlb2Ygc2NoZW1hdGljLmRlc2NyaXB0aW9uICYge1xuICAgICAgICB2ZXJzaW9uPzogc3RyaW5nO1xuICAgICAgfTtcbiAgICAgIGRlc2NyaXB0aW9uLnZlcnNpb24gPSBjb2VyY2VWZXJzaW9uTnVtYmVyKGRlc2NyaXB0aW9uLnZlcnNpb24pIHx8IHVuZGVmaW5lZDtcbiAgICAgIGlmICghZGVzY3JpcHRpb24udmVyc2lvbikge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNlbXZlci5zYXRpc2ZpZXMoZGVzY3JpcHRpb24udmVyc2lvbiwgbWlncmF0aW9uUmFuZ2UsIHsgaW5jbHVkZVByZXJlbGVhc2U6IHRydWUgfSkpIHtcbiAgICAgICAgbWlncmF0aW9ucy5wdXNoKGRlc2NyaXB0aW9uIGFzIHR5cGVvZiBzY2hlbWF0aWMuZGVzY3JpcHRpb24gJiB7IHZlcnNpb246IHN0cmluZyB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBtaWdyYXRpb25zLnNvcnQoKGEsIGIpID0+IHNlbXZlci5jb21wYXJlKGEudmVyc2lvbiwgYi52ZXJzaW9uKSB8fCBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpKTtcblxuICAgIGlmIChtaWdyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuaW5mbyhjb2xvcnMuY3lhbihgKiogRXhlY3V0aW5nIG1pZ3JhdGlvbnMgb2YgcGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nICoqXFxuYCkpO1xuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVBhY2thZ2VNaWdyYXRpb25zKG1pZ3JhdGlvbnMsIHBhY2thZ2VOYW1lLCBjb21taXQpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlUGFja2FnZU1pZ3JhdGlvbnMoXG4gICAgbWlncmF0aW9uczogSXRlcmFibGU8eyBuYW1lOiBzdHJpbmc7IGRlc2NyaXB0aW9uOiBzdHJpbmc7IGNvbGxlY3Rpb246IHsgbmFtZTogc3RyaW5nIH0gfT4sXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICBjb21taXQgPSBmYWxzZSxcbiAgKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgZm9yIChjb25zdCBtaWdyYXRpb24gb2YgbWlncmF0aW9ucykge1xuICAgICAgY29uc3QgW3RpdGxlLCAuLi5kZXNjcmlwdGlvbl0gPSBtaWdyYXRpb24uZGVzY3JpcHRpb24uc3BsaXQoJy4gJyk7XG5cbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oXG4gICAgICAgIGNvbG9ycy5jeWFuKGNvbG9ycy5zeW1ib2xzLnBvaW50ZXIpICtcbiAgICAgICAgICAnICcgK1xuICAgICAgICAgIGNvbG9ycy5ib2xkKHRpdGxlLmVuZHNXaXRoKCcuJykgPyB0aXRsZSA6IHRpdGxlICsgJy4nKSxcbiAgICAgICk7XG5cbiAgICAgIGlmIChkZXNjcmlwdGlvbi5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuaW5mbygnICAnICsgZGVzY3JpcHRpb24uam9pbignLlxcbiAgJykpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMobWlncmF0aW9uLmNvbGxlY3Rpb24ubmFtZSwgbWlncmF0aW9uLm5hbWUpO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oJyAgTWlncmF0aW9uIGNvbXBsZXRlZC4nKTtcblxuICAgICAgLy8gQ29tbWl0IG1pZ3JhdGlvblxuICAgICAgaWYgKGNvbW1pdCkge1xuICAgICAgICBjb25zdCBjb21taXRQcmVmaXggPSBgJHtwYWNrYWdlTmFtZX0gbWlncmF0aW9uIC0gJHttaWdyYXRpb24ubmFtZX1gO1xuICAgICAgICBjb25zdCBjb21taXRNZXNzYWdlID0gbWlncmF0aW9uLmRlc2NyaXB0aW9uXG4gICAgICAgICAgPyBgJHtjb21taXRQcmVmaXh9XFxuXFxuJHttaWdyYXRpb24uZGVzY3JpcHRpb259YFxuICAgICAgICAgIDogY29tbWl0UHJlZml4O1xuICAgICAgICBjb25zdCBjb21taXR0ZWQgPSB0aGlzLmNvbW1pdChjb21taXRNZXNzYWdlKTtcbiAgICAgICAgaWYgKCFjb21taXR0ZWQpIHtcbiAgICAgICAgICAvLyBGYWlsZWQgdG8gY29tbWl0LCBzb21ldGhpbmcgd2VudCB3cm9uZy4gQWJvcnQgdGhlIHVwZGF0ZS5cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5sb2dnZXIuaW5mbygnJyk7IC8vIEV4dHJhIHRyYWlsaW5nIG5ld2xpbmUuXG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxpbmVzLXBlci1mdW5jdGlvblxuICBhc3luYyBydW4ob3B0aW9uczogVXBkYXRlQ29tbWFuZFNjaGVtYSAmIEFyZ3VtZW50cykge1xuICAgIGF3YWl0IGVuc3VyZUNvbXBhdGlibGVOcG0odGhpcy5jb250ZXh0LnJvb3QpO1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgaW5zdGFsbGVkIENMSSB2ZXJzaW9uIGlzIG9sZGVyIHRoYW4gdGhlIGxhdGVzdCBjb21wYXRpYmxlIHZlcnNpb24uXG4gICAgaWYgKCFkaXNhYmxlVmVyc2lvbkNoZWNrKSB7XG4gICAgICBjb25zdCBjbGlWZXJzaW9uVG9JbnN0YWxsID0gYXdhaXQgdGhpcy5jaGVja0NMSVZlcnNpb24oXG4gICAgICAgIG9wdGlvbnNbJy0tJ10sXG4gICAgICAgIG9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgb3B0aW9ucy5uZXh0LFxuICAgICAgKTtcblxuICAgICAgaWYgKGNsaVZlcnNpb25Ub0luc3RhbGwpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAnVGhlIGluc3RhbGxlZCBBbmd1bGFyIENMSSB2ZXJzaW9uIGlzIG91dGRhdGVkLlxcbicgK1xuICAgICAgICAgICAgYEluc3RhbGxpbmcgYSB0ZW1wb3JhcnkgQW5ndWxhciBDTEkgdmVyc2lvbmVkICR7Y2xpVmVyc2lvblRvSW5zdGFsbH0gdG8gcGVyZm9ybSB0aGUgdXBkYXRlLmAsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHJ1blRlbXBQYWNrYWdlQmluKFxuICAgICAgICAgIGBAYW5ndWxhci9jbGlAJHtjbGlWZXJzaW9uVG9JbnN0YWxsfWAsXG4gICAgICAgICAgdGhpcy5wYWNrYWdlTWFuYWdlcixcbiAgICAgICAgICBwcm9jZXNzLmFyZ3Yuc2xpY2UoMiksXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbG9nVmVyYm9zZSA9IChtZXNzYWdlOiBzdHJpbmcpID0+IHtcbiAgICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhtZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgcGFja2FnZXM6IFBhY2thZ2VJZGVudGlmaWVyW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJlcXVlc3Qgb2Ygb3B0aW9uc1snLS0nXSB8fCBbXSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcGFja2FnZUlkZW50aWZpZXIgPSBucGEocmVxdWVzdCk7XG5cbiAgICAgICAgLy8gb25seSByZWdpc3RyeSBpZGVudGlmaWVycyBhcmUgc3VwcG9ydGVkXG4gICAgICAgIGlmICghcGFja2FnZUlkZW50aWZpZXIucmVnaXN0cnkpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihgUGFja2FnZSAnJHtyZXF1ZXN0fScgaXMgbm90IGEgcmVnaXN0cnkgcGFja2FnZSBpZGVudGlmZXIuYCk7XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwYWNrYWdlcy5zb21lKCh2KSA9PiB2Lm5hbWUgPT09IHBhY2thZ2VJZGVudGlmaWVyLm5hbWUpKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoYER1cGxpY2F0ZSBwYWNrYWdlICcke3BhY2thZ2VJZGVudGlmaWVyLm5hbWV9JyBzcGVjaWZpZWQuYCk7XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLm1pZ3JhdGVPbmx5ICYmIHBhY2thZ2VJZGVudGlmaWVyLnJhd1NwZWMpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdQYWNrYWdlIHNwZWNpZmllciBoYXMgbm8gZWZmZWN0IHdoZW4gdXNpbmcgXCJtaWdyYXRlLW9ubHlcIiBvcHRpb24uJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBuZXh0IG9wdGlvbiBpcyB1c2VkIGFuZCBubyBzcGVjaWZpZXIgc3VwcGxpZWQsIHVzZSBuZXh0IHRhZ1xuICAgICAgICBpZiAob3B0aW9ucy5uZXh0ICYmICFwYWNrYWdlSWRlbnRpZmllci5yYXdTcGVjKSB7XG4gICAgICAgICAgcGFja2FnZUlkZW50aWZpZXIuZmV0Y2hTcGVjID0gJ25leHQnO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFja2FnZXMucHVzaChwYWNrYWdlSWRlbnRpZmllciBhcyBQYWNrYWdlSWRlbnRpZmllcik7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGUubWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zLm1pZ3JhdGVPbmx5ICYmIChvcHRpb25zLmZyb20gfHwgb3B0aW9ucy50bykpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdDYW4gb25seSB1c2UgXCJmcm9tXCIgb3IgXCJ0b1wiIG9wdGlvbnMgd2l0aCBcIm1pZ3JhdGUtb25seVwiIG9wdGlvbi4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gSWYgbm90IGFza2luZyBmb3Igc3RhdHVzIHRoZW4gY2hlY2sgZm9yIGEgY2xlYW4gZ2l0IHJlcG9zaXRvcnkuXG4gICAgLy8gVGhpcyBhbGxvd3MgdGhlIHVzZXIgdG8gZWFzaWx5IHJlc2V0IGFueSBjaGFuZ2VzIGZyb20gdGhlIHVwZGF0ZS5cbiAgICBpZiAocGFja2FnZXMubGVuZ3RoICYmICF0aGlzLmNoZWNrQ2xlYW5HaXQoKSkge1xuICAgICAgaWYgKG9wdGlvbnMuYWxsb3dEaXJ0eSkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICdSZXBvc2l0b3J5IGlzIG5vdCBjbGVhbi4gVXBkYXRlIGNoYW5nZXMgd2lsbCBiZSBtaXhlZCB3aXRoIHByZS1leGlzdGluZyBjaGFuZ2VzLicsXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAnUmVwb3NpdG9yeSBpcyBub3QgY2xlYW4uIFBsZWFzZSBjb21taXQgb3Igc3Rhc2ggYW55IGNoYW5nZXMgYmVmb3JlIHVwZGF0aW5nLicsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIDI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuaW5mbyhgVXNpbmcgcGFja2FnZSBtYW5hZ2VyOiAnJHt0aGlzLnBhY2thZ2VNYW5hZ2VyfSdgKTtcbiAgICB0aGlzLmxvZ2dlci5pbmZvKCdDb2xsZWN0aW5nIGluc3RhbGxlZCBkZXBlbmRlbmNpZXMuLi4nKTtcblxuICAgIGNvbnN0IHJvb3REZXBlbmRlbmNpZXMgPSBhd2FpdCBnZXRQcm9qZWN0RGVwZW5kZW5jaWVzKHRoaXMuY29udGV4dC5yb290KTtcblxuICAgIHRoaXMubG9nZ2VyLmluZm8oYEZvdW5kICR7cm9vdERlcGVuZGVuY2llcy5zaXplfSBkZXBlbmRlbmNpZXMuYCk7XG5cbiAgICBpZiAocGFja2FnZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBTaG93IHN0YXR1c1xuICAgICAgY29uc3QgeyBzdWNjZXNzIH0gPSBhd2FpdCB0aGlzLmV4ZWN1dGVTY2hlbWF0aWMoVVBEQVRFX1NDSEVNQVRJQ19DT0xMRUNUSU9OLCAndXBkYXRlJywge1xuICAgICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSB8fCBmYWxzZSxcbiAgICAgICAgbmV4dDogb3B0aW9ucy5uZXh0IHx8IGZhbHNlLFxuICAgICAgICB2ZXJib3NlOiBvcHRpb25zLnZlcmJvc2UgfHwgZmFsc2UsXG4gICAgICAgIHBhY2thZ2VNYW5hZ2VyOiB0aGlzLnBhY2thZ2VNYW5hZ2VyLFxuICAgICAgICBwYWNrYWdlczogW10sXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHN1Y2Nlc3MgPyAwIDogMTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5taWdyYXRlT25seSkge1xuICAgICAgaWYgKCFvcHRpb25zLmZyb20gJiYgdHlwZW9mIG9wdGlvbnMubWlncmF0ZU9ubHkgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICdcImZyb21cIiBvcHRpb24gaXMgcmVxdWlyZWQgd2hlbiB1c2luZyB0aGUgXCJtaWdyYXRlLW9ubHlcIiBvcHRpb24gd2l0aG91dCBhIG1pZ3JhdGlvbiBuYW1lLicsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2UgaWYgKHBhY2thZ2VzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAnQSBzaW5nbGUgcGFja2FnZSBtdXN0IGJlIHNwZWNpZmllZCB3aGVuIHVzaW5nIHRoZSBcIm1pZ3JhdGUtb25seVwiIG9wdGlvbi4nLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICBpZiAob3B0aW9ucy5uZXh0KSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ1wibmV4dFwiIG9wdGlvbiBoYXMgbm8gZWZmZWN0IHdoZW4gdXNpbmcgXCJtaWdyYXRlLW9ubHlcIiBvcHRpb24uJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHBhY2thZ2VOYW1lID0gcGFja2FnZXNbMF0ubmFtZTtcbiAgICAgIGNvbnN0IHBhY2thZ2VEZXBlbmRlbmN5ID0gcm9vdERlcGVuZGVuY2llcy5nZXQocGFja2FnZU5hbWUpO1xuICAgICAgbGV0IHBhY2thZ2VQYXRoID0gcGFja2FnZURlcGVuZGVuY3k/LnBhdGg7XG4gICAgICBsZXQgcGFja2FnZU5vZGUgPSBwYWNrYWdlRGVwZW5kZW5jeT8ucGFja2FnZTtcbiAgICAgIGlmIChwYWNrYWdlRGVwZW5kZW5jeSAmJiAhcGFja2FnZU5vZGUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1BhY2thZ2UgZm91bmQgaW4gcGFja2FnZS5qc29uIGJ1dCBpcyBub3QgaW5zdGFsbGVkLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSBlbHNlIGlmICghcGFja2FnZURlcGVuZGVuY3kpIHtcbiAgICAgICAgLy8gQWxsb3cgcnVubmluZyBtaWdyYXRpb25zIG9uIHRyYW5zaXRpdmVseSBpbnN0YWxsZWQgZGVwZW5kZW5jaWVzXG4gICAgICAgIC8vIFRoZXJlIGNhbiB0ZWNobmljYWxseSBiZSBuZXN0ZWQgbXVsdGlwbGUgdmVyc2lvbnNcbiAgICAgICAgLy8gVE9ETzogSWYgbXVsdGlwbGUsIHRoaXMgc2hvdWxkIGZpbmQgYWxsIHZlcnNpb25zIGFuZCBhc2sgd2hpY2ggb25lIHRvIHVzZVxuICAgICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGZpbmRQYWNrYWdlSnNvbih0aGlzLmNvbnRleHQucm9vdCwgcGFja2FnZU5hbWUpO1xuICAgICAgICBpZiAocGFja2FnZUpzb24pIHtcbiAgICAgICAgICBwYWNrYWdlUGF0aCA9IHBhdGguZGlybmFtZShwYWNrYWdlSnNvbik7XG4gICAgICAgICAgcGFja2FnZU5vZGUgPSBhd2FpdCByZWFkUGFja2FnZUpzb24ocGFja2FnZUpzb24pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICghcGFja2FnZU5vZGUgfHwgIXBhY2thZ2VQYXRoKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdQYWNrYWdlIGlzIG5vdCBpbnN0YWxsZWQuJyk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHVwZGF0ZU1ldGFkYXRhID0gcGFja2FnZU5vZGVbJ25nLXVwZGF0ZSddO1xuICAgICAgbGV0IG1pZ3JhdGlvbnMgPSB1cGRhdGVNZXRhZGF0YT8ubWlncmF0aW9ucztcbiAgICAgIGlmIChtaWdyYXRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1BhY2thZ2UgZG9lcyBub3QgcHJvdmlkZSBtaWdyYXRpb25zLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbWlncmF0aW9ucyAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1BhY2thZ2UgY29udGFpbnMgYSBtYWxmb3JtZWQgbWlncmF0aW9ucyBmaWVsZC4nKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH0gZWxzZSBpZiAocGF0aC5wb3NpeC5pc0Fic29sdXRlKG1pZ3JhdGlvbnMpIHx8IHBhdGgud2luMzIuaXNBYnNvbHV0ZShtaWdyYXRpb25zKSkge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAnUGFja2FnZSBjb250YWlucyBhbiBpbnZhbGlkIG1pZ3JhdGlvbnMgZmllbGQuIEFic29sdXRlIHBhdGhzIGFyZSBub3QgcGVybWl0dGVkLicsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vcm1hbGl6ZSBzbGFzaGVzXG4gICAgICBtaWdyYXRpb25zID0gbWlncmF0aW9ucy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgICAgIGlmIChtaWdyYXRpb25zLnN0YXJ0c1dpdGgoJy4uLycpKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICdQYWNrYWdlIGNvbnRhaW5zIGFuIGludmFsaWQgbWlncmF0aW9ucyBmaWVsZC4gUGF0aHMgb3V0c2lkZSB0aGUgcGFja2FnZSByb290IGFyZSBub3QgcGVybWl0dGVkLicsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGlmIGl0IGlzIGEgcGFja2FnZS1sb2NhbCBsb2NhdGlvblxuICAgICAgY29uc3QgbG9jYWxNaWdyYXRpb25zID0gcGF0aC5qb2luKHBhY2thZ2VQYXRoLCBtaWdyYXRpb25zKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGxvY2FsTWlncmF0aW9ucykpIHtcbiAgICAgICAgbWlncmF0aW9ucyA9IGxvY2FsTWlncmF0aW9ucztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRyeSB0byByZXNvbHZlIGZyb20gcGFja2FnZSBsb2NhdGlvbi5cbiAgICAgICAgLy8gVGhpcyBhdm9pZHMgaXNzdWVzIHdpdGggcGFja2FnZSBob2lzdGluZy5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtaWdyYXRpb25zID0gcmVxdWlyZS5yZXNvbHZlKG1pZ3JhdGlvbnMsIHsgcGF0aHM6IFtwYWNrYWdlUGF0aF0gfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdNaWdyYXRpb25zIGZvciBwYWNrYWdlIHdlcmUgbm90IGZvdW5kLicpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihgVW5hYmxlIHRvIHJlc29sdmUgbWlncmF0aW9ucyBmb3IgcGFja2FnZS4gIFske2UubWVzc2FnZX1dYCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgbGV0IHJlc3VsdDogYm9vbGVhbjtcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5taWdyYXRlT25seSA9PSAnc3RyaW5nJykge1xuICAgICAgICByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVNaWdyYXRpb24oXG4gICAgICAgICAgcGFja2FnZU5hbWUsXG4gICAgICAgICAgbWlncmF0aW9ucyxcbiAgICAgICAgICBvcHRpb25zLm1pZ3JhdGVPbmx5LFxuICAgICAgICAgIG9wdGlvbnMuY3JlYXRlQ29tbWl0cyxcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGZyb20gPSBjb2VyY2VWZXJzaW9uTnVtYmVyKG9wdGlvbnMuZnJvbSk7XG4gICAgICAgIGlmICghZnJvbSkge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGBcImZyb21cIiB2YWx1ZSBbJHtvcHRpb25zLmZyb219XSBpcyBub3QgYSB2YWxpZCB2ZXJzaW9uLmApO1xuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVNaWdyYXRpb25zKFxuICAgICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICAgIG1pZ3JhdGlvbnMsXG4gICAgICAgICAgZnJvbSxcbiAgICAgICAgICBvcHRpb25zLnRvIHx8IHBhY2thZ2VOb2RlLnZlcnNpb24sXG4gICAgICAgICAgb3B0aW9ucy5jcmVhdGVDb21taXRzLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0ID8gMCA6IDE7XG4gICAgfVxuXG4gICAgY29uc3QgcmVxdWVzdHM6IHtcbiAgICAgIGlkZW50aWZpZXI6IFBhY2thZ2VJZGVudGlmaWVyO1xuICAgICAgbm9kZTogUGFja2FnZVRyZWVOb2RlO1xuICAgIH1bXSA9IFtdO1xuXG4gICAgLy8gVmFsaWRhdGUgcGFja2FnZXMgYWN0dWFsbHkgYXJlIHBhcnQgb2YgdGhlIHdvcmtzcGFjZVxuICAgIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzKSB7XG4gICAgICBjb25zdCBub2RlID0gcm9vdERlcGVuZGVuY2llcy5nZXQocGtnLm5hbWUpO1xuICAgICAgaWYgKCFub2RlPy5wYWNrYWdlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGBQYWNrYWdlICcke3BrZy5uYW1lfScgaXMgbm90IGEgZGVwZW5kZW5jeS5gKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgYSBzcGVjaWZpYyB2ZXJzaW9uIGlzIHJlcXVlc3RlZCBhbmQgbWF0Y2hlcyB0aGUgaW5zdGFsbGVkIHZlcnNpb24sIHNraXAuXG4gICAgICBpZiAocGtnLnR5cGUgPT09ICd2ZXJzaW9uJyAmJiBub2RlLnBhY2thZ2UudmVyc2lvbiA9PT0gcGtnLmZldGNoU3BlYykge1xuICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKGBQYWNrYWdlICcke3BrZy5uYW1lfScgaXMgYWxyZWFkeSBhdCAnJHtwa2cuZmV0Y2hTcGVjfScuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0cy5wdXNoKHsgaWRlbnRpZmllcjogcGtnLCBub2RlIH0pO1xuICAgIH1cblxuICAgIGlmIChyZXF1ZXN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGNvbnN0IHBhY2thZ2VzVG9VcGRhdGU6IHN0cmluZ1tdID0gW107XG5cbiAgICB0aGlzLmxvZ2dlci5pbmZvKCdGZXRjaGluZyBkZXBlbmRlbmN5IG1ldGFkYXRhIGZyb20gcmVnaXN0cnkuLi4nKTtcbiAgICBmb3IgKGNvbnN0IHsgaWRlbnRpZmllcjogcmVxdWVzdElkZW50aWZpZXIsIG5vZGUgfSBvZiByZXF1ZXN0cykge1xuICAgICAgY29uc3QgcGFja2FnZU5hbWUgPSByZXF1ZXN0SWRlbnRpZmllci5uYW1lO1xuXG4gICAgICBsZXQgbWV0YWRhdGE7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBNZXRhZGF0YSByZXF1ZXN0cyBhcmUgaW50ZXJuYWxseSBjYWNoZWQ7IG11bHRpcGxlIHJlcXVlc3RzIGZvciBzYW1lIG5hbWVcbiAgICAgICAgLy8gZG9lcyBub3QgcmVzdWx0IGluIGFkZGl0aW9uYWwgbmV0d29yayB0cmFmZmljXG4gICAgICAgIG1ldGFkYXRhID0gYXdhaXQgZmV0Y2hQYWNrYWdlTWV0YWRhdGEocGFja2FnZU5hbWUsIHRoaXMubG9nZ2VyLCB7XG4gICAgICAgICAgdmVyYm9zZTogb3B0aW9ucy52ZXJib3NlLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoYEVycm9yIGZldGNoaW5nIG1ldGFkYXRhIGZvciAnJHtwYWNrYWdlTmFtZX0nOiBgICsgZS5tZXNzYWdlKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgLy8gVHJ5IHRvIGZpbmQgYSBwYWNrYWdlIHZlcnNpb24gYmFzZWQgb24gdGhlIHVzZXIgcmVxdWVzdGVkIHBhY2thZ2Ugc3BlY2lmaWVyXG4gICAgICAvLyByZWdpc3RyeSBzcGVjaWZpZXIgdHlwZXMgYXJlIGVpdGhlciB2ZXJzaW9uLCByYW5nZSwgb3IgdGFnXG4gICAgICBsZXQgbWFuaWZlc3Q6IFBhY2thZ2VNYW5pZmVzdCB8IHVuZGVmaW5lZDtcbiAgICAgIGlmIChcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3ZlcnNpb24nIHx8XG4gICAgICAgIHJlcXVlc3RJZGVudGlmaWVyLnR5cGUgPT09ICdyYW5nZScgfHxcbiAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3RhZydcbiAgICAgICkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG1hbmlmZXN0ID0gcGlja01hbmlmZXN0KG1ldGFkYXRhLCByZXF1ZXN0SWRlbnRpZmllci5mZXRjaFNwZWMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ0VUQVJHRVQnKSB7XG4gICAgICAgICAgICAvLyBJZiBub3QgZm91bmQgYW5kIG5leHQgd2FzIHVzZWQgYW5kIHVzZXIgZGlkIG5vdCBwcm92aWRlIGEgc3BlY2lmaWVyLCB0cnkgbGF0ZXN0LlxuICAgICAgICAgICAgLy8gUGFja2FnZSBtYXkgbm90IGhhdmUgYSBuZXh0IHRhZy5cbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgcmVxdWVzdElkZW50aWZpZXIudHlwZSA9PT0gJ3RhZycgJiZcbiAgICAgICAgICAgICAgcmVxdWVzdElkZW50aWZpZXIuZmV0Y2hTcGVjID09PSAnbmV4dCcgJiZcbiAgICAgICAgICAgICAgIXJlcXVlc3RJZGVudGlmaWVyLnJhd1NwZWNcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG1hbmlmZXN0ID0gcGlja01hbmlmZXN0KG1ldGFkYXRhLCAnbGF0ZXN0Jyk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS5jb2RlICE9PSAnRVRBUkdFVCcgJiYgZS5jb2RlICE9PSAnRU5PVkVSU0lPTlMnKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoZS5jb2RlICE9PSAnRU5PVkVSU0lPTlMnKSB7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIW1hbmlmZXN0KSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgIGBQYWNrYWdlIHNwZWNpZmllZCBieSAnJHtyZXF1ZXN0SWRlbnRpZmllci5yYXd9JyBkb2VzIG5vdCBleGlzdCB3aXRoaW4gdGhlIHJlZ2lzdHJ5LmAsXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIGlmIChtYW5pZmVzdC52ZXJzaW9uID09PSBub2RlLnBhY2thZ2U/LnZlcnNpb24pIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgUGFja2FnZSAnJHtwYWNrYWdlTmFtZX0nIGlzIGFscmVhZHkgdXAgdG8gZGF0ZS5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChub2RlLnBhY2thZ2UgJiYgQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAudGVzdChub2RlLnBhY2thZ2UubmFtZSkpIHtcbiAgICAgICAgY29uc3QgeyBuYW1lLCB2ZXJzaW9uIH0gPSBub2RlLnBhY2thZ2U7XG4gICAgICAgIGNvbnN0IHRvQmVJbnN0YWxsZWRNYWpvclZlcnNpb24gPSArbWFuaWZlc3QudmVyc2lvbi5zcGxpdCgnLicpWzBdO1xuICAgICAgICBjb25zdCBjdXJyZW50TWFqb3JWZXJzaW9uID0gK3ZlcnNpb24uc3BsaXQoJy4nKVswXTtcblxuICAgICAgICBpZiAodG9CZUluc3RhbGxlZE1ham9yVmVyc2lvbiAtIGN1cnJlbnRNYWpvclZlcnNpb24gPiAxKSB7XG4gICAgICAgICAgLy8gT25seSBhbGxvdyB1cGRhdGluZyBhIHNpbmdsZSB2ZXJzaW9uIGF0IGEgdGltZS5cbiAgICAgICAgICBpZiAoY3VycmVudE1ham9yVmVyc2lvbiA8IDYpIHtcbiAgICAgICAgICAgIC8vIEJlZm9yZSB2ZXJzaW9uIDYsIHRoZSBtYWpvciB2ZXJzaW9ucyB3ZXJlIG5vdCBhbHdheXMgc2VxdWVudGlhbC5cbiAgICAgICAgICAgIC8vIEV4YW1wbGUgQGFuZ3VsYXIvY29yZSBza2lwcGVkIHZlcnNpb24gMywgQGFuZ3VsYXIvY2xpIHNraXBwZWQgdmVyc2lvbnMgMi01LlxuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBVcGRhdGluZyBtdWx0aXBsZSBtYWpvciB2ZXJzaW9ucyBvZiAnJHtuYW1lfScgYXQgb25jZSBpcyBub3Qgc3VwcG9ydGVkLiBQbGVhc2UgbWlncmF0ZSBlYWNoIG1ham9yIHZlcnNpb24gaW5kaXZpZHVhbGx5LlxcbmAgK1xuICAgICAgICAgICAgICAgIGBGb3IgbW9yZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdXBkYXRlIHByb2Nlc3MsIHNlZSBodHRwczovL3VwZGF0ZS5hbmd1bGFyLmlvLy5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbmV4dE1ham9yVmVyc2lvbkZyb21DdXJyZW50ID0gY3VycmVudE1ham9yVmVyc2lvbiArIDE7XG5cbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBgVXBkYXRpbmcgbXVsdGlwbGUgbWFqb3IgdmVyc2lvbnMgb2YgJyR7bmFtZX0nIGF0IG9uY2UgaXMgbm90IHN1cHBvcnRlZC4gUGxlYXNlIG1pZ3JhdGUgZWFjaCBtYWpvciB2ZXJzaW9uIGluZGl2aWR1YWxseS5cXG5gICtcbiAgICAgICAgICAgICAgICBgUnVuICduZyB1cGRhdGUgJHtuYW1lfUAke25leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudH0nIGluIHlvdXIgd29ya3NwYWNlIGRpcmVjdG9yeSBgICtcbiAgICAgICAgICAgICAgICBgdG8gdXBkYXRlIHRvIGxhdGVzdCAnJHtuZXh0TWFqb3JWZXJzaW9uRnJvbUN1cnJlbnR9LngnIHZlcnNpb24gb2YgJyR7bmFtZX0nLlxcblxcbmAgK1xuICAgICAgICAgICAgICAgIGBGb3IgbW9yZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdXBkYXRlIHByb2Nlc3MsIHNlZSBodHRwczovL3VwZGF0ZS5hbmd1bGFyLmlvLz92PSR7Y3VycmVudE1ham9yVmVyc2lvbn0uMC0ke25leHRNYWpvclZlcnNpb25Gcm9tQ3VycmVudH0uMGAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHBhY2thZ2VzVG9VcGRhdGUucHVzaChyZXF1ZXN0SWRlbnRpZmllci50b1N0cmluZygpKTtcbiAgICB9XG5cbiAgICBpZiAocGFja2FnZXNUb1VwZGF0ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGNvbnN0IHsgc3VjY2VzcyB9ID0gYXdhaXQgdGhpcy5leGVjdXRlU2NoZW1hdGljKFVQREFURV9TQ0hFTUFUSUNfQ09MTEVDVElPTiwgJ3VwZGF0ZScsIHtcbiAgICAgIHZlcmJvc2U6IG9wdGlvbnMudmVyYm9zZSB8fCBmYWxzZSxcbiAgICAgIGZvcmNlOiBvcHRpb25zLmZvcmNlIHx8IGZhbHNlLFxuICAgICAgbmV4dDogISFvcHRpb25zLm5leHQsXG4gICAgICBwYWNrYWdlTWFuYWdlcjogdGhpcy5wYWNrYWdlTWFuYWdlcixcbiAgICAgIHBhY2thZ2VzOiBwYWNrYWdlc1RvVXBkYXRlLFxuICAgIH0pO1xuXG4gICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFJlbW92ZSBleGlzdGluZyBub2RlIG1vZHVsZXMgZGlyZWN0b3J5IHRvIHByb3ZpZGUgYSBzdHJvbmdlciBndWFyYW50ZWUgdGhhdCBwYWNrYWdlc1xuICAgICAgICAvLyB3aWxsIGJlIGhvaXN0ZWQgaW50byB0aGUgY29ycmVjdCBsb2NhdGlvbnMuXG4gICAgICAgIGF3YWl0IGZzLnByb21pc2VzLnJtKHBhdGguam9pbih0aGlzLmNvbnRleHQucm9vdCwgJ25vZGVfbW9kdWxlcycpLCB7XG4gICAgICAgICAgZm9yY2U6IHRydWUsXG4gICAgICAgICAgcmVjdXJzaXZlOiB0cnVlLFxuICAgICAgICAgIG1heFJldHJpZXM6IDMsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCB7fVxuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBpbnN0YWxsQWxsUGFja2FnZXMoXG4gICAgICAgIHRoaXMucGFja2FnZU1hbmFnZXIsXG4gICAgICAgIG9wdGlvbnMuZm9yY2UgPyBbJy0tZm9yY2UnXSA6IFtdLFxuICAgICAgICB0aGlzLmNvbnRleHQucm9vdCxcbiAgICAgICk7XG4gICAgICBpZiAocmVzdWx0ICE9PSAwKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1Y2Nlc3MgJiYgb3B0aW9ucy5jcmVhdGVDb21taXRzKSB7XG4gICAgICBjb25zdCBjb21taXR0ZWQgPSB0aGlzLmNvbW1pdChcbiAgICAgICAgYEFuZ3VsYXIgQ0xJIHVwZGF0ZSBmb3IgcGFja2FnZXMgLSAke3BhY2thZ2VzVG9VcGRhdGUuam9pbignLCAnKX1gLFxuICAgICAgKTtcbiAgICAgIGlmICghY29tbWl0dGVkKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoaXMgaXMgYSB0ZW1wb3Jhcnkgd29ya2Fyb3VuZCB0byBhbGxvdyBkYXRhIHRvIGJlIHBhc3NlZCBiYWNrIGZyb20gdGhlIHVwZGF0ZSBzY2hlbWF0aWNcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IG1pZ3JhdGlvbnMgPSAoZ2xvYmFsIGFzIGFueSkuZXh0ZXJuYWxNaWdyYXRpb25zIGFzIHtcbiAgICAgIHBhY2thZ2U6IHN0cmluZztcbiAgICAgIGNvbGxlY3Rpb246IHN0cmluZztcbiAgICAgIGZyb206IHN0cmluZztcbiAgICAgIHRvOiBzdHJpbmc7XG4gICAgfVtdO1xuXG4gICAgaWYgKHN1Y2Nlc3MgJiYgbWlncmF0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBtaWdyYXRpb24gb2YgbWlncmF0aW9ucykge1xuICAgICAgICAvLyBSZXNvbHZlIHRoZSBwYWNrYWdlIGZyb20gdGhlIHdvcmtzcGFjZSByb290LCBhcyBvdGhlcndpc2UgaXQgd2lsbCBiZSByZXNvbHZlZCBmcm9tIHRoZSB0ZW1wXG4gICAgICAgIC8vIGluc3RhbGxlZCBDTEkgdmVyc2lvbi5cbiAgICAgICAgbGV0IHBhY2thZ2VQYXRoO1xuICAgICAgICBsb2dWZXJib3NlKFxuICAgICAgICAgIGBSZXNvbHZpbmcgbWlncmF0aW9uIHBhY2thZ2UgJyR7bWlncmF0aW9uLnBhY2thZ2V9JyBmcm9tICcke3RoaXMuY29udGV4dC5yb290fScuLi5gLFxuICAgICAgICApO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwYWNrYWdlUGF0aCA9IHBhdGguZGlybmFtZShcbiAgICAgICAgICAgICAgLy8gVGhpcyBtYXkgZmFpbCBpZiB0aGUgYHBhY2thZ2UuanNvbmAgaXMgbm90IGV4cG9ydGVkIGFzIGFuIGVudHJ5IHBvaW50XG4gICAgICAgICAgICAgIHJlcXVpcmUucmVzb2x2ZShwYXRoLmpvaW4obWlncmF0aW9uLnBhY2thZ2UsICdwYWNrYWdlLmpzb24nKSwge1xuICAgICAgICAgICAgICAgIHBhdGhzOiBbdGhpcy5jb250ZXh0LnJvb3RdLFxuICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRyeWluZyB0byByZXNvbHZlIHRoZSBwYWNrYWdlJ3MgbWFpbiBlbnRyeSBwb2ludFxuICAgICAgICAgICAgICBwYWNrYWdlUGF0aCA9IHJlcXVpcmUucmVzb2x2ZShtaWdyYXRpb24ucGFja2FnZSwgeyBwYXRoczogW3RoaXMuY29udGV4dC5yb290XSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICBsb2dWZXJib3NlKGUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgYE1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KSB3ZXJlIG5vdCBmb3VuZC5gICtcbiAgICAgICAgICAgICAgICAnIFRoZSBwYWNrYWdlIGNvdWxkIG5vdCBiZSBmb3VuZCBpbiB0aGUgd29ya3NwYWNlLicsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KS4gIFske2UubWVzc2FnZX1dYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbWlncmF0aW9ucztcblxuICAgICAgICAvLyBDaGVjayBpZiBpdCBpcyBhIHBhY2thZ2UtbG9jYWwgbG9jYXRpb25cbiAgICAgICAgY29uc3QgbG9jYWxNaWdyYXRpb25zID0gcGF0aC5qb2luKHBhY2thZ2VQYXRoLCBtaWdyYXRpb24uY29sbGVjdGlvbik7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGxvY2FsTWlncmF0aW9ucykpIHtcbiAgICAgICAgICBtaWdyYXRpb25zID0gbG9jYWxNaWdyYXRpb25zO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFRyeSB0byByZXNvbHZlIGZyb20gcGFja2FnZSBsb2NhdGlvbi5cbiAgICAgICAgICAvLyBUaGlzIGF2b2lkcyBpc3N1ZXMgd2l0aCBwYWNrYWdlIGhvaXN0aW5nLlxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtaWdyYXRpb25zID0gcmVxdWlyZS5yZXNvbHZlKG1pZ3JhdGlvbi5jb2xsZWN0aW9uLCB7IHBhdGhzOiBbcGFja2FnZVBhdGhdIH0pO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihgTWlncmF0aW9ucyBmb3IgcGFja2FnZSAoJHttaWdyYXRpb24ucGFja2FnZX0pIHdlcmUgbm90IGZvdW5kLmApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgYFVuYWJsZSB0byByZXNvbHZlIG1pZ3JhdGlvbnMgZm9yIHBhY2thZ2UgKCR7bWlncmF0aW9uLnBhY2thZ2V9KS4gIFske2UubWVzc2FnZX1dYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbnMoXG4gICAgICAgICAgbWlncmF0aW9uLnBhY2thZ2UsXG4gICAgICAgICAgbWlncmF0aW9ucyxcbiAgICAgICAgICBtaWdyYXRpb24uZnJvbSxcbiAgICAgICAgICBtaWdyYXRpb24udG8sXG4gICAgICAgICAgb3B0aW9ucy5jcmVhdGVDb21taXRzLFxuICAgICAgICApO1xuXG4gICAgICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3VjY2VzcyA/IDAgOiAxO1xuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm4gV2hldGhlciBvciBub3QgdGhlIGNvbW1pdCB3YXMgc3VjY2Vzc2Z1bC5cbiAgICovXG4gIHByaXZhdGUgY29tbWl0KG1lc3NhZ2U6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIENoZWNrIGlmIGEgY29tbWl0IGlzIG5lZWRlZC5cbiAgICBsZXQgY29tbWl0TmVlZGVkOiBib29sZWFuO1xuICAgIHRyeSB7XG4gICAgICBjb21taXROZWVkZWQgPSBoYXNDaGFuZ2VzVG9Db21taXQoKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGAgIEZhaWxlZCB0byByZWFkIEdpdCB0cmVlOlxcbiR7ZXJyLnN0ZGVycn1gKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghY29tbWl0TmVlZGVkKSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCcgIE5vIGNoYW5nZXMgdG8gY29tbWl0IGFmdGVyIG1pZ3JhdGlvbi4nKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gQ29tbWl0IGNoYW5nZXMgYW5kIGFib3J0IG9uIGVycm9yLlxuICAgIHRyeSB7XG4gICAgICBjcmVhdGVDb21taXQobWVzc2FnZSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGNvbW1pdCB1cGRhdGUgKCR7bWVzc2FnZX0pOlxcbiR7ZXJyLnN0ZGVycn1gKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE5vdGlmeSB1c2VyIG9mIHRoZSBjb21taXQuXG4gICAgY29uc3QgaGFzaCA9IGZpbmRDdXJyZW50R2l0U2hhKCk7XG4gICAgY29uc3Qgc2hvcnRNZXNzYWdlID0gbWVzc2FnZS5zcGxpdCgnXFxuJylbMF07XG4gICAgaWYgKGhhc2gpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oYCAgQ29tbWl0dGVkIG1pZ3JhdGlvbiBzdGVwICgke2dldFNob3J0SGFzaChoYXNoKX0pOiAke3Nob3J0TWVzc2FnZX0uYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIENvbW1pdCB3YXMgc3VjY2Vzc2Z1bCwgYnV0IHJlYWRpbmcgdGhlIGhhc2ggd2FzIG5vdC4gU29tZXRoaW5nIHdlaXJkIGhhcHBlbmVkLFxuICAgICAgLy8gYnV0IG5vdGhpbmcgdGhhdCB3b3VsZCBzdG9wIHRoZSB1cGRhdGUuIEp1c3QgbG9nIHRoZSB3ZWlyZG5lc3MgYW5kIGNvbnRpbnVlLlxuICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgICBDb21taXR0ZWQgbWlncmF0aW9uIHN0ZXA6ICR7c2hvcnRNZXNzYWdlfS5gKTtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJyAgRmFpbGVkIHRvIGxvb2sgdXAgaGFzaCBvZiBtb3N0IHJlY2VudCBjb21taXQsIGNvbnRpbnVpbmcgYW55d2F5cy4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tDbGVhbkdpdCgpOiBib29sZWFuIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdG9wTGV2ZWwgPSBleGVjU3luYygnZ2l0IHJldi1wYXJzZSAtLXNob3ctdG9wbGV2ZWwnLCB7XG4gICAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICAgIHN0ZGlvOiAncGlwZScsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGV4ZWNTeW5jKCdnaXQgc3RhdHVzIC0tcG9yY2VsYWluJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pO1xuICAgICAgaWYgKHJlc3VsdC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IGZpbGVzIGluc2lkZSB0aGUgd29ya3NwYWNlIHJvb3QgYXJlIHJlbGV2YW50XG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHJlc3VsdC5zcGxpdCgnXFxuJykpIHtcbiAgICAgICAgY29uc3QgcmVsYXRpdmVFbnRyeSA9IHBhdGgucmVsYXRpdmUoXG4gICAgICAgICAgcGF0aC5yZXNvbHZlKHRoaXMuY29udGV4dC5yb290KSxcbiAgICAgICAgICBwYXRoLnJlc29sdmUodG9wTGV2ZWwudHJpbSgpLCBlbnRyeS5zbGljZSgzKS50cmltKCkpLFxuICAgICAgICApO1xuXG4gICAgICAgIGlmICghcmVsYXRpdmVFbnRyeS5zdGFydHNXaXRoKCcuLicpICYmICFwYXRoLmlzQWJzb2x1dGUocmVsYXRpdmVFbnRyeSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIHt9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIGN1cnJlbnQgaW5zdGFsbGVkIENMSSB2ZXJzaW9uIGlzIG9sZGVyIG9yIG5ld2VyIHRoYW4gYSBjb21wYXRpYmxlIHZlcnNpb24uXG4gICAqIEByZXR1cm5zIHRoZSB2ZXJzaW9uIHRvIGluc3RhbGwgb3IgbnVsbCB3aGVuIHRoZXJlIGlzIG5vIHVwZGF0ZSB0byBpbnN0YWxsLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBjaGVja0NMSVZlcnNpb24oXG4gICAgcGFja2FnZXNUb1VwZGF0ZTogc3RyaW5nW10gfCB1bmRlZmluZWQsXG4gICAgdmVyYm9zZSA9IGZhbHNlLFxuICAgIG5leHQgPSBmYWxzZSxcbiAgKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgeyB2ZXJzaW9uIH0gPSBhd2FpdCBmZXRjaFBhY2thZ2VNYW5pZmVzdChcbiAgICAgIGBAYW5ndWxhci9jbGlAJHt0aGlzLmdldENMSVVwZGF0ZVJ1bm5lclZlcnNpb24ocGFja2FnZXNUb1VwZGF0ZSwgbmV4dCl9YCxcbiAgICAgIHRoaXMubG9nZ2VyLFxuICAgICAge1xuICAgICAgICB2ZXJib3NlLFxuICAgICAgICB1c2luZ1lhcm46IHRoaXMucGFja2FnZU1hbmFnZXIgPT09IFBhY2thZ2VNYW5hZ2VyLllhcm4sXG4gICAgICB9LFxuICAgICk7XG5cbiAgICByZXR1cm4gVkVSU0lPTi5mdWxsID09PSB2ZXJzaW9uID8gbnVsbCA6IHZlcnNpb247XG4gIH1cblxuICBwcml2YXRlIGdldENMSVVwZGF0ZVJ1bm5lclZlcnNpb24oXG4gICAgcGFja2FnZXNUb1VwZGF0ZTogc3RyaW5nW10gfCB1bmRlZmluZWQsXG4gICAgbmV4dDogYm9vbGVhbixcbiAgKTogc3RyaW5nIHwgbnVtYmVyIHtcbiAgICBpZiAobmV4dCkge1xuICAgICAgcmV0dXJuICduZXh0JztcbiAgICB9XG5cbiAgICBjb25zdCB1cGRhdGluZ0FuZ3VsYXJQYWNrYWdlID0gcGFja2FnZXNUb1VwZGF0ZT8uZmluZCgocikgPT4gQU5HVUxBUl9QQUNLQUdFU19SRUdFWFAudGVzdChyKSk7XG4gICAgaWYgKHVwZGF0aW5nQW5ndWxhclBhY2thZ2UpIHtcbiAgICAgIC8vIElmIHdlIGFyZSB1cGRhdGluZyBhbnkgQW5ndWxhciBwYWNrYWdlIHdlIGNhbiB1cGRhdGUgdGhlIENMSSB0byB0aGUgdGFyZ2V0IHZlcnNpb24gYmVjYXVzZVxuICAgICAgLy8gbWlncmF0aW9ucyBmb3IgQGFuZ3VsYXIvY29yZUAxMyBjYW4gYmUgZXhlY3V0ZWQgdXNpbmcgQW5ndWxhci9jbGlAMTMuXG4gICAgICAvLyBUaGlzIGlzIHNhbWUgYmVoYXZpb3VyIGFzIGBucHggQGFuZ3VsYXIvY2xpQDEzIHVwZGF0ZSBAYW5ndWxhci9jb3JlQDEzYC5cblxuICAgICAgLy8gYEBhbmd1bGFyL2NsaUAxM2AgLT4gWycnLCAnYW5ndWxhci9jbGknLCAnMTMnXVxuICAgICAgLy8gYEBhbmd1bGFyL2NsaWAgLT4gWycnLCAnYW5ndWxhci9jbGknXVxuICAgICAgY29uc3QgdGVtcFZlcnNpb24gPSBjb2VyY2VWZXJzaW9uTnVtYmVyKHVwZGF0aW5nQW5ndWxhclBhY2thZ2Uuc3BsaXQoJ0AnKVsyXSk7XG5cbiAgICAgIHJldHVybiBzZW12ZXIucGFyc2UodGVtcFZlcnNpb24pPy5tYWpvciA/PyAnbGF0ZXN0JztcbiAgICB9XG5cbiAgICAvLyBXaGVuIG5vdCB1cGRhdGluZyBhbiBBbmd1bGFyIHBhY2thZ2Ugd2UgY2Fubm90IGRldGVybWluZSB3aGljaCBzY2hlbWF0aWMgcnVudGltZSB0aGUgbWlncmF0aW9uIHNob3VsZCB0byBiZSBleGVjdXRlZCBpbi5cbiAgICAvLyBUeXBpY2FsbHksIHdlIGNhbiBhc3N1bWUgdGhhdCB0aGUgYEBhbmd1bGFyL2NsaWAgd2FzIHVwZGF0ZWQgcHJldmlvdXNseS5cbiAgICAvLyBFeGFtcGxlOiBBbmd1bGFyIG9mZmljaWFsIHBhY2thZ2VzIGFyZSB0eXBpY2FsbHkgdXBkYXRlZCBwcmlvciB0byBOR1JYIGV0Yy4uLlxuICAgIC8vIFRoZXJlZm9yZSwgd2Ugb25seSB1cGRhdGUgdG8gdGhlIGxhdGVzdCBwYXRjaCB2ZXJzaW9uIG9mIHRoZSBpbnN0YWxsZWQgbWFqb3IgdmVyc2lvbiBvZiB0aGUgQW5ndWxhciBDTEkuXG5cbiAgICAvLyBUaGlzIGlzIGltcG9ydGFudCBiZWNhdXNlIHdlIG1pZ2h0IGVuZCB1cCBpbiBhIHNjZW5hcmlvIHdoZXJlIGxvY2FsbHkgQW5ndWxhciB2MTIgaXMgaW5zdGFsbGVkLCB1cGRhdGluZyBOR1JYIGZyb20gMTEgdG8gMTIuXG4gICAgLy8gV2UgZW5kIHVwIHVzaW5nIEFuZ3VsYXIgQ2xJIHYxMyB0byBydW4gdGhlIG1pZ3JhdGlvbnMgaWYgd2UgcnVuIHRoZSBtaWdyYXRpb25zIHVzaW5nIHRoZSBDTEkgaW5zdGFsbGVkIG1ham9yIHZlcnNpb24gKyAxIGxvZ2ljLlxuICAgIHJldHVybiBWRVJTSU9OLm1ham9yO1xuICB9XG59XG5cbi8qKlxuICogQHJldHVybiBXaGV0aGVyIG9yIG5vdCB0aGUgd29ya2luZyBkaXJlY3RvcnkgaGFzIEdpdCBjaGFuZ2VzIHRvIGNvbW1pdC5cbiAqL1xuZnVuY3Rpb24gaGFzQ2hhbmdlc1RvQ29tbWl0KCk6IGJvb2xlYW4ge1xuICAvLyBMaXN0IGFsbCBtb2RpZmllZCBmaWxlcyBub3QgY292ZXJlZCBieSAuZ2l0aWdub3JlLlxuICBjb25zdCBmaWxlcyA9IGV4ZWNTeW5jKCdnaXQgbHMtZmlsZXMgLW0gLWQgLW8gLS1leGNsdWRlLXN0YW5kYXJkJykudG9TdHJpbmcoKTtcblxuICAvLyBJZiBhbnkgZmlsZXMgYXJlIHJldHVybmVkLCB0aGVuIHRoZXJlIG11c3QgYmUgc29tZXRoaW5nIHRvIGNvbW1pdC5cbiAgcmV0dXJuIGZpbGVzICE9PSAnJztcbn1cblxuLyoqXG4gKiBQcmVjb25kaXRpb246IE11c3QgaGF2ZSBwZW5kaW5nIGNoYW5nZXMgdG8gY29tbWl0LCB0aGV5IGRvIG5vdCBuZWVkIHRvIGJlIHN0YWdlZC5cbiAqIFBvc3Rjb25kaXRpb246IFRoZSBHaXQgd29ya2luZyB0cmVlIGlzIGNvbW1pdHRlZCBhbmQgdGhlIHJlcG8gaXMgY2xlYW4uXG4gKiBAcGFyYW0gbWVzc2FnZSBUaGUgY29tbWl0IG1lc3NhZ2UgdG8gdXNlLlxuICovXG5mdW5jdGlvbiBjcmVhdGVDb21taXQobWVzc2FnZTogc3RyaW5nKSB7XG4gIC8vIFN0YWdlIGVudGlyZSB3b3JraW5nIHRyZWUgZm9yIGNvbW1pdC5cbiAgZXhlY1N5bmMoJ2dpdCBhZGQgLUEnLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSk7XG5cbiAgLy8gQ29tbWl0IHdpdGggdGhlIG1lc3NhZ2UgcGFzc2VkIHZpYSBzdGRpbiB0byBhdm9pZCBiYXNoIGVzY2FwaW5nIGlzc3Vlcy5cbiAgZXhlY1N5bmMoJ2dpdCBjb21taXQgLS1uby12ZXJpZnkgLUYgLScsIHsgZW5jb2Rpbmc6ICd1dGY4Jywgc3RkaW86ICdwaXBlJywgaW5wdXQ6IG1lc3NhZ2UgfSk7XG59XG5cbi8qKlxuICogQHJldHVybiBUaGUgR2l0IFNIQSBoYXNoIG9mIHRoZSBIRUFEIGNvbW1pdC4gUmV0dXJucyBudWxsIGlmIHVuYWJsZSB0byByZXRyaWV2ZSB0aGUgaGFzaC5cbiAqL1xuZnVuY3Rpb24gZmluZEN1cnJlbnRHaXRTaGEoKTogc3RyaW5nIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgY29uc3QgaGFzaCA9IGV4ZWNTeW5jKCdnaXQgcmV2LXBhcnNlIEhFQUQnLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSk7XG5cbiAgICByZXR1cm4gaGFzaC50cmltKCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFNob3J0SGFzaChjb21taXRIYXNoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY29tbWl0SGFzaC5zbGljZSgwLCA5KTtcbn1cblxuZnVuY3Rpb24gY29lcmNlVmVyc2lvbk51bWJlcih2ZXJzaW9uOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKCF2ZXJzaW9uKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpZiAoIXZlcnNpb24ubWF0Y2goL15cXGR7MSwzMH1cXC5cXGR7MSwzMH1cXC5cXGR7MSwzMH0vKSkge1xuICAgIGNvbnN0IG1hdGNoID0gdmVyc2lvbi5tYXRjaCgvXlxcZHsxLDMwfShcXC5cXGR7MSwzMH0pKi8pO1xuXG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKCFtYXRjaFsxXSkge1xuICAgICAgdmVyc2lvbiA9IHZlcnNpb24uc3Vic3RyKDAsIG1hdGNoWzBdLmxlbmd0aCkgKyAnLjAuMCcgKyB2ZXJzaW9uLnN1YnN0cihtYXRjaFswXS5sZW5ndGgpO1xuICAgIH0gZWxzZSBpZiAoIW1hdGNoWzJdKSB7XG4gICAgICB2ZXJzaW9uID0gdmVyc2lvbi5zdWJzdHIoMCwgbWF0Y2hbMF0ubGVuZ3RoKSArICcuMCcgKyB2ZXJzaW9uLnN1YnN0cihtYXRjaFswXS5sZW5ndGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gc2VtdmVyLnZhbGlkKHZlcnNpb24pO1xufVxuIl19