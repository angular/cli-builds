"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageManagerUtils = void 0;
const core_1 = require("@angular-devkit/core");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const semver_1 = require("semver");
const workspace_schema_1 = require("../../lib/config/workspace-schema");
const config_1 = require("./config");
const spinner_1 = require("./spinner");
class PackageManagerUtils {
    constructor(context) {
        this.context = context;
    }
    /** Get the package manager name. */
    get name() {
        return this.getName();
    }
    /** Get the package manager version. */
    get version() {
        return this.getVersion(this.name);
    }
    /**
     * Checks if the package manager is supported. If not, display a warning.
     */
    ensureCompatibility() {
        if (this.name !== workspace_schema_1.PackageManager.Npm) {
            return;
        }
        try {
            const version = (0, semver_1.valid)(this.version);
            if (!version) {
                return;
            }
            if ((0, semver_1.satisfies)(version, '>=7 <7.5.6')) {
                // eslint-disable-next-line no-console
                console.warn(`npm version ${version} detected.` +
                    ' When using npm 7 with the Angular CLI, npm version 7.5.6 or higher is recommended.');
            }
        }
        catch (_a) {
            // npm is not installed.
        }
    }
    /** Install a single package. */
    async install(packageName, save = true, extraArgs = [], cwd) {
        const packageManagerArgs = this.getArguments();
        const installArgs = [
            packageManagerArgs.install,
            packageName,
            packageManagerArgs.silent,
        ];
        if (save === 'devDependencies') {
            installArgs.push(packageManagerArgs.saveDev);
        }
        return this.run([...installArgs, ...extraArgs], cwd);
    }
    /** Install all packages. */
    async installAll(extraArgs = [], cwd) {
        const packageManagerArgs = this.getArguments();
        const installArgs = [packageManagerArgs.silent];
        if (packageManagerArgs.installAll) {
            installArgs.push(packageManagerArgs.installAll);
        }
        return this.run([...installArgs, ...extraArgs], cwd);
    }
    /** Install a single package temporary. */
    async installTemp(packageName, extraArgs) {
        const tempPath = await fs_1.promises.mkdtemp((0, path_1.join)((0, fs_1.realpathSync)((0, os_1.tmpdir)()), 'angular-cli-packages-'));
        // clean up temp directory on process exit
        process.on('exit', () => {
            try {
                (0, fs_1.rmdirSync)(tempPath, { recursive: true, maxRetries: 3 });
            }
            catch (_a) { }
        });
        // NPM will warn when a `package.json` is not found in the install directory
        // Example:
        // npm WARN enoent ENOENT: no such file or directory, open '/tmp/.ng-temp-packages-84Qi7y/package.json'
        // npm WARN .ng-temp-packages-84Qi7y No description
        // npm WARN .ng-temp-packages-84Qi7y No repository field.
        // npm WARN .ng-temp-packages-84Qi7y No license field.
        // While we can use `npm init -y` we will end up needing to update the 'package.json' anyways
        // because of missing fields.
        await fs_1.promises.writeFile((0, path_1.join)(tempPath, 'package.json'), JSON.stringify({
            name: 'temp-cli-install',
            description: 'temp-cli-install',
            repository: 'temp-cli-install',
            license: 'MIT',
        }));
        // setup prefix/global modules path
        const packageManagerArgs = this.getArguments();
        const tempNodeModules = (0, path_1.join)(tempPath, 'node_modules');
        // Yarn will not append 'node_modules' to the path
        const prefixPath = this.name === workspace_schema_1.PackageManager.Yarn ? tempNodeModules : tempPath;
        const installArgs = [
            ...(extraArgs !== null && extraArgs !== void 0 ? extraArgs : []),
            `${packageManagerArgs.prefix}="${prefixPath}"`,
            packageManagerArgs.noLockfile,
        ];
        return {
            success: await this.install(packageName, true, installArgs, tempPath),
            tempNodeModules,
        };
    }
    getArguments() {
        switch (this.name) {
            case workspace_schema_1.PackageManager.Yarn:
                return {
                    silent: '--silent',
                    saveDev: '--dev',
                    install: 'add',
                    prefix: '--modules-folder',
                    noLockfile: '--no-lockfile',
                };
            case workspace_schema_1.PackageManager.Pnpm:
                return {
                    silent: '--silent',
                    saveDev: '--save-dev',
                    install: 'add',
                    installAll: 'install',
                    prefix: '--prefix',
                    noLockfile: '--no-lockfile',
                };
            default:
                return {
                    silent: '--quiet',
                    saveDev: '--save-dev',
                    install: 'install',
                    installAll: 'install',
                    prefix: '--prefix',
                    noLockfile: '--no-package-lock',
                };
        }
    }
    async run(args, cwd = process.cwd()) {
        const spinner = new spinner_1.Spinner();
        spinner.start('Installing packages...');
        return new Promise((resolve) => {
            var _a, _b;
            const bufferedOutput = [];
            const childProcess = (0, child_process_1.spawn)(this.name, args, {
                stdio: 'pipe',
                shell: true,
                cwd,
            }).on('close', (code) => {
                if (code === 0) {
                    spinner.succeed('Packages successfully installed.');
                    resolve(true);
                }
                else {
                    spinner.stop();
                    bufferedOutput.forEach(({ stream, data }) => stream.write(data));
                    spinner.fail('Packages installation failed, see above.');
                    resolve(false);
                }
            });
            (_a = childProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => bufferedOutput.push({ stream: process.stdout, data: data }));
            (_b = childProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (data) => bufferedOutput.push({ stream: process.stderr, data: data }));
        });
    }
    // TODO(alan-agius4): use the memoize decorator when it's merged.
    getVersion(name) {
        try {
            return (0, child_process_1.execSync)(`${name} --version`, {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
                env: {
                    ...process.env,
                    //  NPM updater notifier will prevents the child process from closing until it timeout after 3 minutes.
                    NO_UPDATE_NOTIFIER: '1',
                    NPM_CONFIG_UPDATE_NOTIFIER: 'false',
                },
            }).trim();
        }
        catch (_a) {
            return undefined;
        }
    }
    // TODO(alan-agius4): use the memoize decorator when it's merged.
    getName() {
        const packageManager = this.getConfiguredPackageManager();
        if (packageManager) {
            return packageManager;
        }
        const hasNpmLock = this.hasLockfile(workspace_schema_1.PackageManager.Npm);
        const hasYarnLock = this.hasLockfile(workspace_schema_1.PackageManager.Yarn);
        const hasPnpmLock = this.hasLockfile(workspace_schema_1.PackageManager.Pnpm);
        // PERF NOTE: `this.getVersion` spawns the package a the child_process which can take around ~300ms at times.
        // Therefore, we should only call this method when needed. IE: don't call `this.getVersion(PackageManager.Pnpm)` unless truly needed.
        // The result of this method is not stored in a variable because it's memoized.
        if (hasNpmLock) {
            // Has NPM lock file.
            if (!hasYarnLock && !hasPnpmLock && this.getVersion(workspace_schema_1.PackageManager.Npm)) {
                // Only NPM lock file and NPM binary is available.
                return workspace_schema_1.PackageManager.Npm;
            }
        }
        else {
            // No NPM lock file.
            if (hasYarnLock && this.getVersion(workspace_schema_1.PackageManager.Yarn)) {
                // Yarn lock file and Yarn binary is available.
                return workspace_schema_1.PackageManager.Yarn;
            }
            else if (hasPnpmLock && this.getVersion(workspace_schema_1.PackageManager.Pnpm)) {
                // PNPM lock file and PNPM binary is available.
                return workspace_schema_1.PackageManager.Pnpm;
            }
        }
        if (!this.getVersion(workspace_schema_1.PackageManager.Npm)) {
            // Doesn't have NPM installed.
            const hasYarn = !!this.getVersion(workspace_schema_1.PackageManager.Yarn);
            const hasPnpm = !!this.getVersion(workspace_schema_1.PackageManager.Pnpm);
            if (hasYarn && !hasPnpm) {
                return workspace_schema_1.PackageManager.Yarn;
            }
            else if (!hasYarn && hasPnpm) {
                return workspace_schema_1.PackageManager.Pnpm;
            }
        }
        // TODO: This should eventually inform the user of ambiguous package manager usage.
        //       Potentially with a prompt to choose and optionally set as the default.
        return workspace_schema_1.PackageManager.Npm;
    }
    hasLockfile(packageManager) {
        let lockfileName;
        switch (packageManager) {
            case workspace_schema_1.PackageManager.Yarn:
                lockfileName = 'yarn.lock';
                break;
            case workspace_schema_1.PackageManager.Pnpm:
                lockfileName = 'pnpm-lock.yaml';
                break;
            case workspace_schema_1.PackageManager.Npm:
            default:
                lockfileName = 'package-lock.json';
                break;
        }
        return (0, fs_1.existsSync)((0, path_1.join)(this.context.root, lockfileName));
    }
    getConfiguredPackageManager() {
        var _a;
        const getPackageManager = (source) => {
            if (source && (0, core_1.isJsonObject)(source)) {
                const value = source['packageManager'];
                if (typeof value === 'string') {
                    return value;
                }
            }
            return undefined;
        };
        let result;
        const { workspace: localWorkspace, globalConfiguration: globalWorkspace } = this.context;
        if (localWorkspace) {
            const project = (0, config_1.getProjectByCwd)(localWorkspace);
            if (project) {
                result = getPackageManager((_a = localWorkspace.projects.get(project)) === null || _a === void 0 ? void 0 : _a.extensions['cli']);
            }
            result !== null && result !== void 0 ? result : (result = getPackageManager(localWorkspace.extensions['cli']));
        }
        if (!result) {
            result = getPackageManager(globalWorkspace === null || globalWorkspace === void 0 ? void 0 : globalWorkspace.extensions['cli']);
        }
        return result;
    }
}
exports.PackageManagerUtils = PackageManagerUtils;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsK0NBQTBEO0FBQzFELGlEQUFnRDtBQUNoRCwyQkFBeUU7QUFDekUsMkJBQTRCO0FBQzVCLCtCQUE0QjtBQUM1QixtQ0FBMEM7QUFDMUMsd0VBQW1FO0FBQ25FLHFDQUE2RDtBQUM3RCx1Q0FBb0M7QUFpQnBDLE1BQWEsbUJBQW1CO0lBQzlCLFlBQTZCLE9BQW1DO1FBQW5DLFlBQU8sR0FBUCxPQUFPLENBQTRCO0lBQUcsQ0FBQztJQUVwRSxvQ0FBb0M7SUFDcEMsSUFBSSxJQUFJO1FBQ04sT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVELHVDQUF1QztJQUN2QyxJQUFJLE9BQU87UUFDVCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRDs7T0FFRztJQUNILG1CQUFtQjtRQUNqQixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssaUNBQWMsQ0FBQyxHQUFHLEVBQUU7WUFDcEMsT0FBTztTQUNSO1FBRUQsSUFBSTtZQUNGLE1BQU0sT0FBTyxHQUFHLElBQUEsY0FBSyxFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNwQyxJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUNaLE9BQU87YUFDUjtZQUVELElBQUksSUFBQSxrQkFBUyxFQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsRUFBRTtnQkFDcEMsc0NBQXNDO2dCQUN0QyxPQUFPLENBQUMsSUFBSSxDQUNWLGVBQWUsT0FBTyxZQUFZO29CQUNoQyxxRkFBcUYsQ0FDeEYsQ0FBQzthQUNIO1NBQ0Y7UUFBQyxXQUFNO1lBQ04sd0JBQXdCO1NBQ3pCO0lBQ0gsQ0FBQztJQUVELGdDQUFnQztJQUNoQyxLQUFLLENBQUMsT0FBTyxDQUNYLFdBQW1CLEVBQ25CLE9BQWtELElBQUksRUFDdEQsWUFBc0IsRUFBRSxFQUN4QixHQUFZO1FBRVosTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDL0MsTUFBTSxXQUFXLEdBQWE7WUFDNUIsa0JBQWtCLENBQUMsT0FBTztZQUMxQixXQUFXO1lBQ1gsa0JBQWtCLENBQUMsTUFBTTtTQUMxQixDQUFDO1FBRUYsSUFBSSxJQUFJLEtBQUssaUJBQWlCLEVBQUU7WUFDOUIsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUM5QztRQUVELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsV0FBVyxFQUFFLEdBQUcsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELDRCQUE0QjtJQUM1QixLQUFLLENBQUMsVUFBVSxDQUFDLFlBQXNCLEVBQUUsRUFBRSxHQUFZO1FBQ3JELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQy9DLE1BQU0sV0FBVyxHQUFhLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUQsSUFBSSxrQkFBa0IsQ0FBQyxVQUFVLEVBQUU7WUFDakMsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNqRDtRQUVELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsV0FBVyxFQUFFLEdBQUcsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELDBDQUEwQztJQUMxQyxLQUFLLENBQUMsV0FBVyxDQUNmLFdBQW1CLEVBQ25CLFNBQW9CO1FBS3BCLE1BQU0sUUFBUSxHQUFHLE1BQU0sYUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFBLFdBQUksRUFBQyxJQUFBLGlCQUFZLEVBQUMsSUFBQSxXQUFNLEdBQUUsQ0FBQyxFQUFFLHVCQUF1QixDQUFDLENBQUMsQ0FBQztRQUV6RiwwQ0FBMEM7UUFDMUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1lBQ3RCLElBQUk7Z0JBQ0YsSUFBQSxjQUFTLEVBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN6RDtZQUFDLFdBQU0sR0FBRTtRQUNaLENBQUMsQ0FBQyxDQUFDO1FBRUgsNEVBQTRFO1FBQzVFLFdBQVc7UUFDWCx1R0FBdUc7UUFDdkcsbURBQW1EO1FBQ25ELHlEQUF5RDtRQUN6RCxzREFBc0Q7UUFFdEQsNkZBQTZGO1FBQzdGLDZCQUE2QjtRQUM3QixNQUFNLGFBQUUsQ0FBQyxTQUFTLENBQ2hCLElBQUEsV0FBSSxFQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsRUFDOUIsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNiLElBQUksRUFBRSxrQkFBa0I7WUFDeEIsV0FBVyxFQUFFLGtCQUFrQjtZQUMvQixVQUFVLEVBQUUsa0JBQWtCO1lBQzlCLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQyxDQUNILENBQUM7UUFFRixtQ0FBbUM7UUFDbkMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDL0MsTUFBTSxlQUFlLEdBQUcsSUFBQSxXQUFJLEVBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZELGtEQUFrRDtRQUNsRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxLQUFLLGlDQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztRQUNsRixNQUFNLFdBQVcsR0FBYTtZQUM1QixHQUFHLENBQUMsU0FBUyxhQUFULFNBQVMsY0FBVCxTQUFTLEdBQUksRUFBRSxDQUFDO1lBQ3BCLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxLQUFLLFVBQVUsR0FBRztZQUM5QyxrQkFBa0IsQ0FBQyxVQUFVO1NBQzlCLENBQUM7UUFFRixPQUFPO1lBQ0wsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUM7WUFDckUsZUFBZTtTQUNoQixDQUFDO0lBQ0osQ0FBQztJQUVPLFlBQVk7UUFDbEIsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2pCLEtBQUssaUNBQWMsQ0FBQyxJQUFJO2dCQUN0QixPQUFPO29CQUNMLE1BQU0sRUFBRSxVQUFVO29CQUNsQixPQUFPLEVBQUUsT0FBTztvQkFDaEIsT0FBTyxFQUFFLEtBQUs7b0JBQ2QsTUFBTSxFQUFFLGtCQUFrQjtvQkFDMUIsVUFBVSxFQUFFLGVBQWU7aUJBQzVCLENBQUM7WUFDSixLQUFLLGlDQUFjLENBQUMsSUFBSTtnQkFDdEIsT0FBTztvQkFDTCxNQUFNLEVBQUUsVUFBVTtvQkFDbEIsT0FBTyxFQUFFLFlBQVk7b0JBQ3JCLE9BQU8sRUFBRSxLQUFLO29CQUNkLFVBQVUsRUFBRSxTQUFTO29CQUNyQixNQUFNLEVBQUUsVUFBVTtvQkFDbEIsVUFBVSxFQUFFLGVBQWU7aUJBQzVCLENBQUM7WUFDSjtnQkFDRSxPQUFPO29CQUNMLE1BQU0sRUFBRSxTQUFTO29CQUNqQixPQUFPLEVBQUUsWUFBWTtvQkFDckIsT0FBTyxFQUFFLFNBQVM7b0JBQ2xCLFVBQVUsRUFBRSxTQUFTO29CQUNyQixNQUFNLEVBQUUsVUFBVTtvQkFDbEIsVUFBVSxFQUFFLG1CQUFtQjtpQkFDaEMsQ0FBQztTQUNMO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBYyxFQUFFLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFO1FBQ25ELE1BQU0sT0FBTyxHQUFHLElBQUksaUJBQU8sRUFBRSxDQUFDO1FBQzlCLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUV4QyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7O1lBQzdCLE1BQU0sY0FBYyxHQUFtRCxFQUFFLENBQUM7WUFFMUUsTUFBTSxZQUFZLEdBQUcsSUFBQSxxQkFBSyxFQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFO2dCQUMxQyxLQUFLLEVBQUUsTUFBTTtnQkFDYixLQUFLLEVBQUUsSUFBSTtnQkFDWCxHQUFHO2FBQ0osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRTtnQkFDOUIsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFO29CQUNkLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0NBQWtDLENBQUMsQ0FBQztvQkFDcEQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNmO3FCQUFNO29CQUNMLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDZixjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDakUsT0FBTyxDQUFDLElBQUksQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO29CQUN6RCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ2hCO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFBLFlBQVksQ0FBQyxNQUFNLDBDQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUMvQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQzVELENBQUM7WUFDRixNQUFBLFlBQVksQ0FBQyxNQUFNLDBDQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUMvQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQzVELENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxpRUFBaUU7SUFDekQsVUFBVSxDQUFDLElBQW9CO1FBQ3JDLElBQUk7WUFDRixPQUFPLElBQUEsd0JBQVEsRUFBQyxHQUFHLElBQUksWUFBWSxFQUFFO2dCQUNuQyxRQUFRLEVBQUUsTUFBTTtnQkFDaEIsS0FBSyxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUM7Z0JBQ25DLEdBQUcsRUFBRTtvQkFDSCxHQUFHLE9BQU8sQ0FBQyxHQUFHO29CQUNkLHVHQUF1RztvQkFDdkcsa0JBQWtCLEVBQUUsR0FBRztvQkFDdkIsMEJBQTBCLEVBQUUsT0FBTztpQkFDcEM7YUFDRixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDWDtRQUFDLFdBQU07WUFDTixPQUFPLFNBQVMsQ0FBQztTQUNsQjtJQUNILENBQUM7SUFFRCxpRUFBaUU7SUFDekQsT0FBTztRQUNiLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1FBQzFELElBQUksY0FBYyxFQUFFO1lBQ2xCLE9BQU8sY0FBYyxDQUFDO1NBQ3ZCO1FBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQ0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsaUNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGlDQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFMUQsNkdBQTZHO1FBQzdHLHFJQUFxSTtRQUNySSwrRUFBK0U7UUFFL0UsSUFBSSxVQUFVLEVBQUU7WUFDZCxxQkFBcUI7WUFDckIsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLGlDQUFjLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3ZFLGtEQUFrRDtnQkFDbEQsT0FBTyxpQ0FBYyxDQUFDLEdBQUcsQ0FBQzthQUMzQjtTQUNGO2FBQU07WUFDTCxvQkFBb0I7WUFDcEIsSUFBSSxXQUFXLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQ0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN2RCwrQ0FBK0M7Z0JBQy9DLE9BQU8saUNBQWMsQ0FBQyxJQUFJLENBQUM7YUFDNUI7aUJBQU0sSUFBSSxXQUFXLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQ0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM5RCwrQ0FBK0M7Z0JBQy9DLE9BQU8saUNBQWMsQ0FBQyxJQUFJLENBQUM7YUFDNUI7U0FDRjtRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGlDQUFjLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDeEMsOEJBQThCO1lBQzlCLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGlDQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsaUNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV2RCxJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRTtnQkFDdkIsT0FBTyxpQ0FBYyxDQUFDLElBQUksQ0FBQzthQUM1QjtpQkFBTSxJQUFJLENBQUMsT0FBTyxJQUFJLE9BQU8sRUFBRTtnQkFDOUIsT0FBTyxpQ0FBYyxDQUFDLElBQUksQ0FBQzthQUM1QjtTQUNGO1FBRUQsbUZBQW1GO1FBQ25GLCtFQUErRTtRQUMvRSxPQUFPLGlDQUFjLENBQUMsR0FBRyxDQUFDO0lBQzVCLENBQUM7SUFFTyxXQUFXLENBQUMsY0FBOEI7UUFDaEQsSUFBSSxZQUFvQixDQUFDO1FBQ3pCLFFBQVEsY0FBYyxFQUFFO1lBQ3RCLEtBQUssaUNBQWMsQ0FBQyxJQUFJO2dCQUN0QixZQUFZLEdBQUcsV0FBVyxDQUFDO2dCQUMzQixNQUFNO1lBQ1IsS0FBSyxpQ0FBYyxDQUFDLElBQUk7Z0JBQ3RCLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQztnQkFDaEMsTUFBTTtZQUNSLEtBQUssaUNBQWMsQ0FBQyxHQUFHLENBQUM7WUFDeEI7Z0JBQ0UsWUFBWSxHQUFHLG1CQUFtQixDQUFDO2dCQUNuQyxNQUFNO1NBQ1Q7UUFFRCxPQUFPLElBQUEsZUFBVSxFQUFDLElBQUEsV0FBSSxFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVPLDJCQUEyQjs7UUFDakMsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLE1BQWtDLEVBQThCLEVBQUU7WUFDM0YsSUFBSSxNQUFNLElBQUksSUFBQSxtQkFBWSxFQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNsQyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDdkMsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUU7b0JBQzdCLE9BQU8sS0FBdUIsQ0FBQztpQkFDaEM7YUFDRjtZQUVELE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUMsQ0FBQztRQUVGLElBQUksTUFBa0MsQ0FBQztRQUN2QyxNQUFNLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3pGLElBQUksY0FBYyxFQUFFO1lBQ2xCLE1BQU0sT0FBTyxHQUFHLElBQUEsd0JBQWUsRUFBQyxjQUFjLENBQUMsQ0FBQztZQUNoRCxJQUFJLE9BQU8sRUFBRTtnQkFDWCxNQUFNLEdBQUcsaUJBQWlCLENBQUMsTUFBQSxjQUFjLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsMENBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDckY7WUFFRCxNQUFNLGFBQU4sTUFBTSxjQUFOLE1BQU0sSUFBTixNQUFNLEdBQUssaUJBQWlCLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDO1NBQ2hFO1FBRUQsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxlQUFlLGFBQWYsZUFBZSx1QkFBZixlQUFlLENBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDaEU7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0NBQ0Y7QUE3U0Qsa0RBNlNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGlzSnNvbk9iamVjdCwganNvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGV4ZWNTeW5jLCBzcGF3biB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcHJvbWlzZXMgYXMgZnMsIHJlYWxwYXRoU3luYywgcm1kaXJTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgdG1wZGlyIH0gZnJvbSAnb3MnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgc2F0aXNmaWVzLCB2YWxpZCB9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uLy4uL2xpYi9jb25maWcvd29ya3NwYWNlLXNjaGVtYSc7XG5pbXBvcnQgeyBBbmd1bGFyV29ya3NwYWNlLCBnZXRQcm9qZWN0QnlDd2QgfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgeyBTcGlubmVyIH0gZnJvbSAnLi9zcGlubmVyJztcblxuaW50ZXJmYWNlIFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyB7XG4gIHNpbGVudDogc3RyaW5nO1xuICBzYXZlRGV2OiBzdHJpbmc7XG4gIGluc3RhbGw6IHN0cmluZztcbiAgaW5zdGFsbEFsbD86IHN0cmluZztcbiAgcHJlZml4OiBzdHJpbmc7XG4gIG5vTG9ja2ZpbGU6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlTWFuYWdlclV0aWxzQ29udGV4dCB7XG4gIGdsb2JhbENvbmZpZ3VyYXRpb24/OiBBbmd1bGFyV29ya3NwYWNlO1xuICB3b3Jrc3BhY2U/OiBBbmd1bGFyV29ya3NwYWNlO1xuICByb290OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBQYWNrYWdlTWFuYWdlclV0aWxzIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb250ZXh0OiBQYWNrYWdlTWFuYWdlclV0aWxzQ29udGV4dCkge31cblxuICAvKiogR2V0IHRoZSBwYWNrYWdlIG1hbmFnZXIgbmFtZS4gKi9cbiAgZ2V0IG5hbWUoKTogUGFja2FnZU1hbmFnZXIge1xuICAgIHJldHVybiB0aGlzLmdldE5hbWUoKTtcbiAgfVxuXG4gIC8qKiBHZXQgdGhlIHBhY2thZ2UgbWFuYWdlciB2ZXJzaW9uLiAqL1xuICBnZXQgdmVyc2lvbigpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmdldFZlcnNpb24odGhpcy5uYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIHBhY2thZ2UgbWFuYWdlciBpcyBzdXBwb3J0ZWQuIElmIG5vdCwgZGlzcGxheSBhIHdhcm5pbmcuXG4gICAqL1xuICBlbnN1cmVDb21wYXRpYmlsaXR5KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLm5hbWUgIT09IFBhY2thZ2VNYW5hZ2VyLk5wbSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB2ZXJzaW9uID0gdmFsaWQodGhpcy52ZXJzaW9uKTtcbiAgICAgIGlmICghdmVyc2lvbikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChzYXRpc2ZpZXModmVyc2lvbiwgJz49NyA8Ny41LjYnKSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgYG5wbSB2ZXJzaW9uICR7dmVyc2lvbn0gZGV0ZWN0ZWQuYCArXG4gICAgICAgICAgICAnIFdoZW4gdXNpbmcgbnBtIDcgd2l0aCB0aGUgQW5ndWxhciBDTEksIG5wbSB2ZXJzaW9uIDcuNS42IG9yIGhpZ2hlciBpcyByZWNvbW1lbmRlZC4nLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gbnBtIGlzIG5vdCBpbnN0YWxsZWQuXG4gICAgfVxuICB9XG5cbiAgLyoqIEluc3RhbGwgYSBzaW5nbGUgcGFja2FnZS4gKi9cbiAgYXN5bmMgaW5zdGFsbChcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIHNhdmU6ICdkZXBlbmRlbmNpZXMnIHwgJ2RldkRlcGVuZGVuY2llcycgfCB0cnVlID0gdHJ1ZSxcbiAgICBleHRyYUFyZ3M6IHN0cmluZ1tdID0gW10sXG4gICAgY3dkPzogc3RyaW5nLFxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBwYWNrYWdlTWFuYWdlckFyZ3MgPSB0aGlzLmdldEFyZ3VtZW50cygpO1xuICAgIGNvbnN0IGluc3RhbGxBcmdzOiBzdHJpbmdbXSA9IFtcbiAgICAgIHBhY2thZ2VNYW5hZ2VyQXJncy5pbnN0YWxsLFxuICAgICAgcGFja2FnZU5hbWUsXG4gICAgICBwYWNrYWdlTWFuYWdlckFyZ3Muc2lsZW50LFxuICAgIF07XG5cbiAgICBpZiAoc2F2ZSA9PT0gJ2RldkRlcGVuZGVuY2llcycpIHtcbiAgICAgIGluc3RhbGxBcmdzLnB1c2gocGFja2FnZU1hbmFnZXJBcmdzLnNhdmVEZXYpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ1bihbLi4uaW5zdGFsbEFyZ3MsIC4uLmV4dHJhQXJnc10sIGN3ZCk7XG4gIH1cblxuICAvKiogSW5zdGFsbCBhbGwgcGFja2FnZXMuICovXG4gIGFzeW5jIGluc3RhbGxBbGwoZXh0cmFBcmdzOiBzdHJpbmdbXSA9IFtdLCBjd2Q/OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBwYWNrYWdlTWFuYWdlckFyZ3MgPSB0aGlzLmdldEFyZ3VtZW50cygpO1xuICAgIGNvbnN0IGluc3RhbGxBcmdzOiBzdHJpbmdbXSA9IFtwYWNrYWdlTWFuYWdlckFyZ3Muc2lsZW50XTtcbiAgICBpZiAocGFja2FnZU1hbmFnZXJBcmdzLmluc3RhbGxBbGwpIHtcbiAgICAgIGluc3RhbGxBcmdzLnB1c2gocGFja2FnZU1hbmFnZXJBcmdzLmluc3RhbGxBbGwpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ1bihbLi4uaW5zdGFsbEFyZ3MsIC4uLmV4dHJhQXJnc10sIGN3ZCk7XG4gIH1cblxuICAvKiogSW5zdGFsbCBhIHNpbmdsZSBwYWNrYWdlIHRlbXBvcmFyeS4gKi9cbiAgYXN5bmMgaW5zdGFsbFRlbXAoXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICBleHRyYUFyZ3M/OiBzdHJpbmdbXSxcbiAgKTogUHJvbWlzZTx7XG4gICAgc3VjY2VzczogYm9vbGVhbjtcbiAgICB0ZW1wTm9kZU1vZHVsZXM6IHN0cmluZztcbiAgfT4ge1xuICAgIGNvbnN0IHRlbXBQYXRoID0gYXdhaXQgZnMubWtkdGVtcChqb2luKHJlYWxwYXRoU3luYyh0bXBkaXIoKSksICdhbmd1bGFyLWNsaS1wYWNrYWdlcy0nKSk7XG5cbiAgICAvLyBjbGVhbiB1cCB0ZW1wIGRpcmVjdG9yeSBvbiBwcm9jZXNzIGV4aXRcbiAgICBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcm1kaXJTeW5jKHRlbXBQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgbWF4UmV0cmllczogMyB9KTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9KTtcblxuICAgIC8vIE5QTSB3aWxsIHdhcm4gd2hlbiBhIGBwYWNrYWdlLmpzb25gIGlzIG5vdCBmb3VuZCBpbiB0aGUgaW5zdGFsbCBkaXJlY3RvcnlcbiAgICAvLyBFeGFtcGxlOlxuICAgIC8vIG5wbSBXQVJOIGVub2VudCBFTk9FTlQ6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnksIG9wZW4gJy90bXAvLm5nLXRlbXAtcGFja2FnZXMtODRRaTd5L3BhY2thZ2UuanNvbidcbiAgICAvLyBucG0gV0FSTiAubmctdGVtcC1wYWNrYWdlcy04NFFpN3kgTm8gZGVzY3JpcHRpb25cbiAgICAvLyBucG0gV0FSTiAubmctdGVtcC1wYWNrYWdlcy04NFFpN3kgTm8gcmVwb3NpdG9yeSBmaWVsZC5cbiAgICAvLyBucG0gV0FSTiAubmctdGVtcC1wYWNrYWdlcy04NFFpN3kgTm8gbGljZW5zZSBmaWVsZC5cblxuICAgIC8vIFdoaWxlIHdlIGNhbiB1c2UgYG5wbSBpbml0IC15YCB3ZSB3aWxsIGVuZCB1cCBuZWVkaW5nIHRvIHVwZGF0ZSB0aGUgJ3BhY2thZ2UuanNvbicgYW55d2F5c1xuICAgIC8vIGJlY2F1c2Ugb2YgbWlzc2luZyBmaWVsZHMuXG4gICAgYXdhaXQgZnMud3JpdGVGaWxlKFxuICAgICAgam9pbih0ZW1wUGF0aCwgJ3BhY2thZ2UuanNvbicpLFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBuYW1lOiAndGVtcC1jbGktaW5zdGFsbCcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAndGVtcC1jbGktaW5zdGFsbCcsXG4gICAgICAgIHJlcG9zaXRvcnk6ICd0ZW1wLWNsaS1pbnN0YWxsJyxcbiAgICAgICAgbGljZW5zZTogJ01JVCcsXG4gICAgICB9KSxcbiAgICApO1xuXG4gICAgLy8gc2V0dXAgcHJlZml4L2dsb2JhbCBtb2R1bGVzIHBhdGhcbiAgICBjb25zdCBwYWNrYWdlTWFuYWdlckFyZ3MgPSB0aGlzLmdldEFyZ3VtZW50cygpO1xuICAgIGNvbnN0IHRlbXBOb2RlTW9kdWxlcyA9IGpvaW4odGVtcFBhdGgsICdub2RlX21vZHVsZXMnKTtcbiAgICAvLyBZYXJuIHdpbGwgbm90IGFwcGVuZCAnbm9kZV9tb2R1bGVzJyB0byB0aGUgcGF0aFxuICAgIGNvbnN0IHByZWZpeFBhdGggPSB0aGlzLm5hbWUgPT09IFBhY2thZ2VNYW5hZ2VyLllhcm4gPyB0ZW1wTm9kZU1vZHVsZXMgOiB0ZW1wUGF0aDtcbiAgICBjb25zdCBpbnN0YWxsQXJnczogc3RyaW5nW10gPSBbXG4gICAgICAuLi4oZXh0cmFBcmdzID8/IFtdKSxcbiAgICAgIGAke3BhY2thZ2VNYW5hZ2VyQXJncy5wcmVmaXh9PVwiJHtwcmVmaXhQYXRofVwiYCxcbiAgICAgIHBhY2thZ2VNYW5hZ2VyQXJncy5ub0xvY2tmaWxlLFxuICAgIF07XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogYXdhaXQgdGhpcy5pbnN0YWxsKHBhY2thZ2VOYW1lLCB0cnVlLCBpbnN0YWxsQXJncywgdGVtcFBhdGgpLFxuICAgICAgdGVtcE5vZGVNb2R1bGVzLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldEFyZ3VtZW50cygpOiBQYWNrYWdlTWFuYWdlck9wdGlvbnMge1xuICAgIHN3aXRjaCAodGhpcy5uYW1lKSB7XG4gICAgICBjYXNlIFBhY2thZ2VNYW5hZ2VyLllhcm46XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc2lsZW50OiAnLS1zaWxlbnQnLFxuICAgICAgICAgIHNhdmVEZXY6ICctLWRldicsXG4gICAgICAgICAgaW5zdGFsbDogJ2FkZCcsXG4gICAgICAgICAgcHJlZml4OiAnLS1tb2R1bGVzLWZvbGRlcicsXG4gICAgICAgICAgbm9Mb2NrZmlsZTogJy0tbm8tbG9ja2ZpbGUnLFxuICAgICAgICB9O1xuICAgICAgY2FzZSBQYWNrYWdlTWFuYWdlci5QbnBtOlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNpbGVudDogJy0tc2lsZW50JyxcbiAgICAgICAgICBzYXZlRGV2OiAnLS1zYXZlLWRldicsXG4gICAgICAgICAgaW5zdGFsbDogJ2FkZCcsXG4gICAgICAgICAgaW5zdGFsbEFsbDogJ2luc3RhbGwnLFxuICAgICAgICAgIHByZWZpeDogJy0tcHJlZml4JyxcbiAgICAgICAgICBub0xvY2tmaWxlOiAnLS1uby1sb2NrZmlsZScsXG4gICAgICAgIH07XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNpbGVudDogJy0tcXVpZXQnLFxuICAgICAgICAgIHNhdmVEZXY6ICctLXNhdmUtZGV2JyxcbiAgICAgICAgICBpbnN0YWxsOiAnaW5zdGFsbCcsXG4gICAgICAgICAgaW5zdGFsbEFsbDogJ2luc3RhbGwnLFxuICAgICAgICAgIHByZWZpeDogJy0tcHJlZml4JyxcbiAgICAgICAgICBub0xvY2tmaWxlOiAnLS1uby1wYWNrYWdlLWxvY2snLFxuICAgICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcnVuKGFyZ3M6IHN0cmluZ1tdLCBjd2QgPSBwcm9jZXNzLmN3ZCgpKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3Qgc3Bpbm5lciA9IG5ldyBTcGlubmVyKCk7XG4gICAgc3Bpbm5lci5zdGFydCgnSW5zdGFsbGluZyBwYWNrYWdlcy4uLicpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICBjb25zdCBidWZmZXJlZE91dHB1dDogeyBzdHJlYW06IE5vZGVKUy5Xcml0ZVN0cmVhbTsgZGF0YTogQnVmZmVyIH1bXSA9IFtdO1xuXG4gICAgICBjb25zdCBjaGlsZFByb2Nlc3MgPSBzcGF3bih0aGlzLm5hbWUsIGFyZ3MsIHtcbiAgICAgICAgc3RkaW86ICdwaXBlJyxcbiAgICAgICAgc2hlbGw6IHRydWUsXG4gICAgICAgIGN3ZCxcbiAgICAgIH0pLm9uKCdjbG9zZScsIChjb2RlOiBudW1iZXIpID0+IHtcbiAgICAgICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgICAgICBzcGlubmVyLnN1Y2NlZWQoJ1BhY2thZ2VzIHN1Y2Nlc3NmdWxseSBpbnN0YWxsZWQuJyk7XG4gICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzcGlubmVyLnN0b3AoKTtcbiAgICAgICAgICBidWZmZXJlZE91dHB1dC5mb3JFYWNoKCh7IHN0cmVhbSwgZGF0YSB9KSA9PiBzdHJlYW0ud3JpdGUoZGF0YSkpO1xuICAgICAgICAgIHNwaW5uZXIuZmFpbCgnUGFja2FnZXMgaW5zdGFsbGF0aW9uIGZhaWxlZCwgc2VlIGFib3ZlLicpO1xuICAgICAgICAgIHJlc29sdmUoZmFsc2UpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY2hpbGRQcm9jZXNzLnN0ZG91dD8ub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PlxuICAgICAgICBidWZmZXJlZE91dHB1dC5wdXNoKHsgc3RyZWFtOiBwcm9jZXNzLnN0ZG91dCwgZGF0YTogZGF0YSB9KSxcbiAgICAgICk7XG4gICAgICBjaGlsZFByb2Nlc3Muc3RkZXJyPy5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+XG4gICAgICAgIGJ1ZmZlcmVkT3V0cHV0LnB1c2goeyBzdHJlYW06IHByb2Nlc3Muc3RkZXJyLCBkYXRhOiBkYXRhIH0pLFxuICAgICAgKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFRPRE8oYWxhbi1hZ2l1czQpOiB1c2UgdGhlIG1lbW9pemUgZGVjb3JhdG9yIHdoZW4gaXQncyBtZXJnZWQuXG4gIHByaXZhdGUgZ2V0VmVyc2lvbihuYW1lOiBQYWNrYWdlTWFuYWdlcik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBleGVjU3luYyhgJHtuYW1lfSAtLXZlcnNpb25gLCB7XG4gICAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICAgIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ2lnbm9yZSddLFxuICAgICAgICBlbnY6IHtcbiAgICAgICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgICAgICAvLyAgTlBNIHVwZGF0ZXIgbm90aWZpZXIgd2lsbCBwcmV2ZW50cyB0aGUgY2hpbGQgcHJvY2VzcyBmcm9tIGNsb3NpbmcgdW50aWwgaXQgdGltZW91dCBhZnRlciAzIG1pbnV0ZXMuXG4gICAgICAgICAgTk9fVVBEQVRFX05PVElGSUVSOiAnMScsXG4gICAgICAgICAgTlBNX0NPTkZJR19VUERBVEVfTk9USUZJRVI6ICdmYWxzZScsXG4gICAgICAgIH0sXG4gICAgICB9KS50cmltKCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRPRE8oYWxhbi1hZ2l1czQpOiB1c2UgdGhlIG1lbW9pemUgZGVjb3JhdG9yIHdoZW4gaXQncyBtZXJnZWQuXG4gIHByaXZhdGUgZ2V0TmFtZSgpOiBQYWNrYWdlTWFuYWdlciB7XG4gICAgY29uc3QgcGFja2FnZU1hbmFnZXIgPSB0aGlzLmdldENvbmZpZ3VyZWRQYWNrYWdlTWFuYWdlcigpO1xuICAgIGlmIChwYWNrYWdlTWFuYWdlcikge1xuICAgICAgcmV0dXJuIHBhY2thZ2VNYW5hZ2VyO1xuICAgIH1cblxuICAgIGNvbnN0IGhhc05wbUxvY2sgPSB0aGlzLmhhc0xvY2tmaWxlKFBhY2thZ2VNYW5hZ2VyLk5wbSk7XG4gICAgY29uc3QgaGFzWWFybkxvY2sgPSB0aGlzLmhhc0xvY2tmaWxlKFBhY2thZ2VNYW5hZ2VyLllhcm4pO1xuICAgIGNvbnN0IGhhc1BucG1Mb2NrID0gdGhpcy5oYXNMb2NrZmlsZShQYWNrYWdlTWFuYWdlci5QbnBtKTtcblxuICAgIC8vIFBFUkYgTk9URTogYHRoaXMuZ2V0VmVyc2lvbmAgc3Bhd25zIHRoZSBwYWNrYWdlIGEgdGhlIGNoaWxkX3Byb2Nlc3Mgd2hpY2ggY2FuIHRha2UgYXJvdW5kIH4zMDBtcyBhdCB0aW1lcy5cbiAgICAvLyBUaGVyZWZvcmUsIHdlIHNob3VsZCBvbmx5IGNhbGwgdGhpcyBtZXRob2Qgd2hlbiBuZWVkZWQuIElFOiBkb24ndCBjYWxsIGB0aGlzLmdldFZlcnNpb24oUGFja2FnZU1hbmFnZXIuUG5wbSlgIHVubGVzcyB0cnVseSBuZWVkZWQuXG4gICAgLy8gVGhlIHJlc3VsdCBvZiB0aGlzIG1ldGhvZCBpcyBub3Qgc3RvcmVkIGluIGEgdmFyaWFibGUgYmVjYXVzZSBpdCdzIG1lbW9pemVkLlxuXG4gICAgaWYgKGhhc05wbUxvY2spIHtcbiAgICAgIC8vIEhhcyBOUE0gbG9jayBmaWxlLlxuICAgICAgaWYgKCFoYXNZYXJuTG9jayAmJiAhaGFzUG5wbUxvY2sgJiYgdGhpcy5nZXRWZXJzaW9uKFBhY2thZ2VNYW5hZ2VyLk5wbSkpIHtcbiAgICAgICAgLy8gT25seSBOUE0gbG9jayBmaWxlIGFuZCBOUE0gYmluYXJ5IGlzIGF2YWlsYWJsZS5cbiAgICAgICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLk5wbTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm8gTlBNIGxvY2sgZmlsZS5cbiAgICAgIGlmIChoYXNZYXJuTG9jayAmJiB0aGlzLmdldFZlcnNpb24oUGFja2FnZU1hbmFnZXIuWWFybikpIHtcbiAgICAgICAgLy8gWWFybiBsb2NrIGZpbGUgYW5kIFlhcm4gYmluYXJ5IGlzIGF2YWlsYWJsZS5cbiAgICAgICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLllhcm47XG4gICAgICB9IGVsc2UgaWYgKGhhc1BucG1Mb2NrICYmIHRoaXMuZ2V0VmVyc2lvbihQYWNrYWdlTWFuYWdlci5QbnBtKSkge1xuICAgICAgICAvLyBQTlBNIGxvY2sgZmlsZSBhbmQgUE5QTSBiaW5hcnkgaXMgYXZhaWxhYmxlLlxuICAgICAgICByZXR1cm4gUGFja2FnZU1hbmFnZXIuUG5wbTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZ2V0VmVyc2lvbihQYWNrYWdlTWFuYWdlci5OcG0pKSB7XG4gICAgICAvLyBEb2Vzbid0IGhhdmUgTlBNIGluc3RhbGxlZC5cbiAgICAgIGNvbnN0IGhhc1lhcm4gPSAhIXRoaXMuZ2V0VmVyc2lvbihQYWNrYWdlTWFuYWdlci5ZYXJuKTtcbiAgICAgIGNvbnN0IGhhc1BucG0gPSAhIXRoaXMuZ2V0VmVyc2lvbihQYWNrYWdlTWFuYWdlci5QbnBtKTtcblxuICAgICAgaWYgKGhhc1lhcm4gJiYgIWhhc1BucG0pIHtcbiAgICAgICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLllhcm47XG4gICAgICB9IGVsc2UgaWYgKCFoYXNZYXJuICYmIGhhc1BucG0pIHtcbiAgICAgICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLlBucG07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVE9ETzogVGhpcyBzaG91bGQgZXZlbnR1YWxseSBpbmZvcm0gdGhlIHVzZXIgb2YgYW1iaWd1b3VzIHBhY2thZ2UgbWFuYWdlciB1c2FnZS5cbiAgICAvLyAgICAgICBQb3RlbnRpYWxseSB3aXRoIGEgcHJvbXB0IHRvIGNob29zZSBhbmQgb3B0aW9uYWxseSBzZXQgYXMgdGhlIGRlZmF1bHQuXG4gICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLk5wbTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzTG9ja2ZpbGUocGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyKTogYm9vbGVhbiB7XG4gICAgbGV0IGxvY2tmaWxlTmFtZTogc3RyaW5nO1xuICAgIHN3aXRjaCAocGFja2FnZU1hbmFnZXIpIHtcbiAgICAgIGNhc2UgUGFja2FnZU1hbmFnZXIuWWFybjpcbiAgICAgICAgbG9ja2ZpbGVOYW1lID0gJ3lhcm4ubG9jayc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBQYWNrYWdlTWFuYWdlci5QbnBtOlxuICAgICAgICBsb2NrZmlsZU5hbWUgPSAncG5wbS1sb2NrLnlhbWwnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgUGFja2FnZU1hbmFnZXIuTnBtOlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbG9ja2ZpbGVOYW1lID0gJ3BhY2thZ2UtbG9jay5qc29uJztcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIGV4aXN0c1N5bmMoam9pbih0aGlzLmNvbnRleHQucm9vdCwgbG9ja2ZpbGVOYW1lKSk7XG4gIH1cblxuICBwcml2YXRlIGdldENvbmZpZ3VyZWRQYWNrYWdlTWFuYWdlcigpOiBQYWNrYWdlTWFuYWdlciB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZ2V0UGFja2FnZU1hbmFnZXIgPSAoc291cmNlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IFBhY2thZ2VNYW5hZ2VyIHwgdW5kZWZpbmVkID0+IHtcbiAgICAgIGlmIChzb3VyY2UgJiYgaXNKc29uT2JqZWN0KHNvdXJjZSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBzb3VyY2VbJ3BhY2thZ2VNYW5hZ2VyJ107XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlIGFzIFBhY2thZ2VNYW5hZ2VyO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfTtcblxuICAgIGxldCByZXN1bHQ6IFBhY2thZ2VNYW5hZ2VyIHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IHsgd29ya3NwYWNlOiBsb2NhbFdvcmtzcGFjZSwgZ2xvYmFsQ29uZmlndXJhdGlvbjogZ2xvYmFsV29ya3NwYWNlIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgaWYgKGxvY2FsV29ya3NwYWNlKSB7XG4gICAgICBjb25zdCBwcm9qZWN0ID0gZ2V0UHJvamVjdEJ5Q3dkKGxvY2FsV29ya3NwYWNlKTtcbiAgICAgIGlmIChwcm9qZWN0KSB7XG4gICAgICAgIHJlc3VsdCA9IGdldFBhY2thZ2VNYW5hZ2VyKGxvY2FsV29ya3NwYWNlLnByb2plY3RzLmdldChwcm9qZWN0KT8uZXh0ZW5zaW9uc1snY2xpJ10pO1xuICAgICAgfVxuXG4gICAgICByZXN1bHQgPz89IGdldFBhY2thZ2VNYW5hZ2VyKGxvY2FsV29ya3NwYWNlLmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgICB9XG5cbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgcmVzdWx0ID0gZ2V0UGFja2FnZU1hbmFnZXIoZ2xvYmFsV29ya3NwYWNlPy5leHRlbnNpb25zWydjbGknXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuIl19