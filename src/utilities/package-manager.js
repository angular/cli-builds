"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageManagerUtils = void 0;
const core_1 = require("@angular-devkit/core");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const workspace_schema_1 = require("../../lib/config/workspace-schema");
const config_1 = require("./config");
const memoize_1 = require("./memoize");
const spinner_1 = require("./spinner");
class PackageManagerUtils {
    context;
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
    /** Install a single package. */
    async install(packageName, save = true, extraArgs = [], cwd) {
        const packageManagerArgs = this.getArguments();
        const installArgs = [packageManagerArgs.install, packageName];
        if (save === 'devDependencies') {
            installArgs.push(packageManagerArgs.saveDev);
        }
        return this.run([...installArgs, ...extraArgs], { cwd, silent: true });
    }
    /** Install all packages. */
    async installAll(extraArgs = [], cwd) {
        const packageManagerArgs = this.getArguments();
        const installArgs = [];
        if (packageManagerArgs.installAll) {
            installArgs.push(packageManagerArgs.installAll);
        }
        return this.run([...installArgs, ...extraArgs], { cwd, silent: true });
    }
    /** Install a single package temporary. */
    async installTemp(packageName, extraArgs) {
        const tempPath = await fs_1.promises.mkdtemp((0, path_1.join)((0, fs_1.realpathSync)((0, os_1.tmpdir)()), 'angular-cli-packages-'));
        // clean up temp directory on process exit
        process.on('exit', () => {
            try {
                (0, fs_1.rmSync)(tempPath, { recursive: true, maxRetries: 3 });
            }
            catch { }
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
            ...(extraArgs ?? []),
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
                    saveDev: '--dev',
                    install: 'add',
                    prefix: '--modules-folder',
                    noLockfile: '--no-lockfile',
                };
            case workspace_schema_1.PackageManager.Pnpm:
                return {
                    saveDev: '--save-dev',
                    install: 'add',
                    installAll: 'install',
                    prefix: '--prefix',
                    noLockfile: '--no-lockfile',
                };
            default:
                return {
                    saveDev: '--save-dev',
                    install: 'install',
                    installAll: 'install',
                    prefix: '--prefix',
                    noLockfile: '--no-package-lock',
                };
        }
    }
    async run(args, options = {}) {
        const { cwd = process.cwd(), silent = false } = options;
        const spinner = new spinner_1.Spinner();
        spinner.start('Installing packages...');
        return new Promise((resolve) => {
            const bufferedOutput = [];
            const childProcess = (0, child_process_1.spawn)(this.name, args, {
                // Always pipe stderr to allow for failures to be reported
                stdio: silent ? ['ignore', 'ignore', 'pipe'] : 'pipe',
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
            childProcess.stdout?.on('data', (data) => bufferedOutput.push({ stream: process.stdout, data: data }));
            childProcess.stderr?.on('data', (data) => bufferedOutput.push({ stream: process.stderr, data: data }));
        });
    }
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
        catch {
            return undefined;
        }
    }
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
                result = getPackageManager(localWorkspace.projects.get(project)?.extensions['cli']);
            }
            result ??= getPackageManager(localWorkspace.extensions['cli']);
        }
        if (!result) {
            result = getPackageManager(globalWorkspace.extensions['cli']);
        }
        return result;
    }
}
exports.PackageManagerUtils = PackageManagerUtils;
__decorate([
    memoize_1.memoize,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], PackageManagerUtils.prototype, "getVersion", null);
__decorate([
    memoize_1.memoize,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], PackageManagerUtils.prototype, "getName", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQTBEO0FBQzFELGlEQUFnRDtBQUNoRCwyQkFBc0U7QUFDdEUsMkJBQTRCO0FBQzVCLCtCQUE0QjtBQUM1Qix3RUFBbUU7QUFDbkUscUNBQTZEO0FBQzdELHVDQUFvQztBQUNwQyx1Q0FBb0M7QUFnQnBDLE1BQWEsbUJBQW1CO0lBQ0Q7SUFBN0IsWUFBNkIsT0FBbUM7UUFBbkMsWUFBTyxHQUFQLE9BQU8sQ0FBNEI7SUFBRyxDQUFDO0lBRXBFLG9DQUFvQztJQUNwQyxJQUFJLElBQUk7UUFDTixPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRUQsdUNBQXVDO0lBQ3ZDLElBQUksT0FBTztRQUNULE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELGdDQUFnQztJQUNoQyxLQUFLLENBQUMsT0FBTyxDQUNYLFdBQW1CLEVBQ25CLE9BQWtELElBQUksRUFDdEQsWUFBc0IsRUFBRSxFQUN4QixHQUFZO1FBRVosTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDL0MsTUFBTSxXQUFXLEdBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFeEUsSUFBSSxJQUFJLEtBQUssaUJBQWlCLEVBQUU7WUFDOUIsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUM5QztRQUVELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsV0FBVyxF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TUFBTSxJQUFJLElBQUEsbUJBQVksRUFBQyxNQUFNLENBQUMsRUFBRTtnQkFDbEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQ3ZDLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFO29CQUM3QixPQUFPLEtBQXVCLENBQUM7aUJBQ2hDO2FBQ0Y7WUFFRCxPQUFPLFNBQVMsQ0FBQztRQUNuQixDQUFDLENBQUM7UUFFRixJQUFJLE1BQWtDLENBQUM7UUFDdkMsTUFBTSxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN6RixJQUFJLGNBQWMsRUFBRTtZQUNsQixNQUFNLE9BQU8sR0FBRyxJQUFBLHdCQUFlLEVBQUMsY0FBYyxDQUFDLENBQUM7WUFDaEQsSUFBSSxPQUFPLEVBQUU7Z0JBQ1gsTUFBTSxHQUFHLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2FBQ3JGO1lBRUQsTUFBTSxLQUFLLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUNoRTtRQUVELElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDWCxNQUFNLEdBQUcsaUJBQWlCLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQy9EO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztDQUNGO0FBbFJELGtEQWtSQztBQWpIUztJQURQLGlCQUFPOzs7O3FEQWdCUDtBQUdPO0lBRFAsaUJBQU87Ozs7a0RBK0NQIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGlzSnNvbk9iamVjdCwganNvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGV4ZWNTeW5jLCBzcGF3biB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcHJvbWlzZXMgYXMgZnMsIHJlYWxwYXRoU3luYywgcm1TeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgdG1wZGlyIH0gZnJvbSAnb3MnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi8uLi9saWIvY29uZmlnL3dvcmtzcGFjZS1zY2hlbWEnO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSwgZ2V0UHJvamVjdEJ5Q3dkIH0gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHsgbWVtb2l6ZSB9IGZyb20gJy4vbWVtb2l6ZSc7XG5pbXBvcnQgeyBTcGlubmVyIH0gZnJvbSAnLi9zcGlubmVyJztcblxuaW50ZXJmYWNlIFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyB7XG4gIHNhdmVEZXY6IHN0cmluZztcbiAgaW5zdGFsbDogc3RyaW5nO1xuICBpbnN0YWxsQWxsPzogc3RyaW5nO1xuICBwcmVmaXg6IHN0cmluZztcbiAgbm9Mb2NrZmlsZTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VNYW5hZ2VyVXRpbHNDb250ZXh0IHtcbiAgZ2xvYmFsQ29uZmlndXJhdGlvbjogQW5ndWxhcldvcmtzcGFjZTtcbiAgd29ya3NwYWNlPzogQW5ndWxhcldvcmtzcGFjZTtcbiAgcm9vdDogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgUGFja2FnZU1hbmFnZXJVdGlscyB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29udGV4dDogUGFja2FnZU1hbmFnZXJVdGlsc0NvbnRleHQpIHt9XG5cbiAgLyoqIEdldCB0aGUgcGFja2FnZSBtYW5hZ2VyIG5hbWUuICovXG4gIGdldCBuYW1lKCk6IFBhY2thZ2VNYW5hZ2VyIHtcbiAgICByZXR1cm4gdGhpcy5nZXROYW1lKCk7XG4gIH1cblxuICAvKiogR2V0IHRoZSBwYWNrYWdlIG1hbmFnZXIgdmVyc2lvbi4gKi9cbiAgZ2V0IHZlcnNpb24oKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5nZXRWZXJzaW9uKHRoaXMubmFtZSk7XG4gIH1cblxuICAvKiogSW5zdGFsbCBhIHNpbmdsZSBwYWNrYWdlLiAqL1xuICBhc3luYyBpbnN0YWxsKFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgc2F2ZTogJ2RlcGVuZGVuY2llcycgfCAnZGV2RGVwZW5kZW5jaWVzJyB8IHRydWUgPSB0cnVlLFxuICAgIGV4dHJhQXJnczogc3RyaW5nW10gPSBbXSxcbiAgICBjd2Q/OiBzdHJpbmcsXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IHBhY2thZ2VNYW5hZ2VyQXJncyA9IHRoaXMuZ2V0QXJndW1lbnRzKCk7XG4gICAgY29uc3QgaW5zdGFsbEFyZ3M6IHN0cmluZ1tdID0gW3BhY2thZ2VNYW5hZ2VyQXJncy5pbnN0YWxsLCBwYWNrYWdlTmFtZV07XG5cbiAgICBpZiAoc2F2ZSA9PT0gJ2RldkRlcGVuZGVuY2llcycpIHtcbiAgICAgIGluc3RhbGxBcmdzLnB1c2gocGFja2FnZU1hbmFnZXJBcmdzLnNhdmVEZXYpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ1bihbLi4uaW5zdGFsbEFyZ3MsIC4uLmV4dHJhQXJnc10sIHsgY3dkLCBzaWxlbnQ6IHRydWUgfSk7XG4gIH1cblxuICAvKiogSW5zdGFsbCBhbGwgcGFja2FnZXMuICovXG4gIGFzeW5jIGluc3RhbGxBbGwoZXh0cmFBcmdzOiBzdHJpbmdbXSA9IFtdLCBjd2Q/OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBwYWNrYWdlTWFuYWdlckFyZ3MgPSB0aGlzLmdldEFyZ3VtZW50cygpO1xuICAgIGNvbnN0IGluc3RhbGxBcmdzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGlmIChwYWNrYWdlTWFuYWdlckFyZ3MuaW5zdGFsbEFsbCkge1xuICAgICAgaW5zdGFsbEFyZ3MucHVzaChwYWNrYWdlTWFuYWdlckFyZ3MuaW5zdGFsbEFsbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucnVuKFsuLi5pbnN0YWxsQXJncywgLi4uZXh0cmFBcmdzXSwgeyBjd2QsIHNpbGVudDogdHJ1ZSB9KTtcbiAgfVxuXG4gIC8qKiBJbnN0YWxsIGEgc2luZ2xlIHBhY2thZ2UgdGVtcG9yYXJ5LiAqL1xuICBhc3luYyBpbnN0YWxsVGVtcChcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIGV4dHJhQXJncz86IHN0cmluZ1tdLFxuICApOiBQcm9taXNlPHtcbiAgICBzdWNjZXNzOiBib29sZWFuO1xuICAgIHRlbXBOb2RlTW9kdWxlczogc3RyaW5nO1xuICB9PiB7XG4gICAgY29uc3QgdGVtcFBhdGggPSBhd2FpdCBmcy5ta2R0ZW1wKGpvaW4ocmVhbHBhdGhTeW5jKHRtcGRpcigpKSwgJ2FuZ3VsYXItY2xpLXBhY2thZ2VzLScpKTtcblxuICAgIC8vIGNsZWFuIHVwIHRlbXAgZGlyZWN0b3J5IG9uIHByb2Nlc3MgZXhpdFxuICAgIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBybVN5bmModGVtcFBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlLCBtYXhSZXRyaWVzOiAzIH0pO1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH0pO1xuXG4gICAgLy8gTlBNIHdpbGwgd2FybiB3aGVuIGEgYHBhY2thZ2UuanNvbmAgaXMgbm90IGZvdW5kIGluIHRoZSBpbnN0YWxsIGRpcmVjdG9yeVxuICAgIC8vIEV4YW1wbGU6XG4gICAgLy8gbnBtIFdBUk4gZW5vZW50IEVOT0VOVDogbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeSwgb3BlbiAnL3RtcC8ubmctdGVtcC1wYWNrYWdlcy04NFFpN3kvcGFja2FnZS5qc29uJ1xuICAgIC8vIG5wbSBXQVJOIC5uZy10ZW1wLXBhY2thZ2VzLTg0UWk3eSBObyBkZXNjcmlwdGlvblxuICAgIC8vIG5wbSBXQVJOIC5uZy10ZW1wLXBhY2thZ2VzLTg0UWk3eSBObyByZXBvc2l0b3J5IGZpZWxkLlxuICAgIC8vIG5wbSBXQVJOIC5uZy10ZW1wLXBhY2thZ2VzLTg0UWk3eSBObyBsaWNlbnNlIGZpZWxkLlxuXG4gICAgLy8gV2hpbGUgd2UgY2FuIHVzZSBgbnBtIGluaXQgLXlgIHdlIHdpbGwgZW5kIHVwIG5lZWRpbmcgdG8gdXBkYXRlIHRoZSAncGFja2FnZS5qc29uJyBhbnl3YXlzXG4gICAgLy8gYmVjYXVzZSBvZiBtaXNzaW5nIGZpZWxkcy5cbiAgICBhd2FpdCBmcy53cml0ZUZpbGUoXG4gICAgICBqb2luKHRlbXBQYXRoLCAncGFja2FnZS5qc29uJyksXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG5hbWU6ICd0ZW1wLWNsaS1pbnN0YWxsJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICd0ZW1wLWNsaS1pbnN0YWxsJyxcbiAgICAgICAgcmVwb3NpdG9yeTogJ3RlbXAtY2xpLWluc3RhbGwnLFxuICAgICAgICBsaWNlbnNlOiAnTUlUJyxcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICAvLyBzZXR1cCBwcmVmaXgvZ2xvYmFsIG1vZHVsZXMgcGF0aFxuICAgIGNvbnN0IHBhY2thZ2VNYW5hZ2VyQXJncyA9IHRoaXMuZ2V0QXJndW1lbnRzKCk7XG4gICAgY29uc3QgdGVtcE5vZGVNb2R1bGVzID0gam9pbih0ZW1wUGF0aCwgJ25vZGVfbW9kdWxlcycpO1xuICAgIC8vIFlhcm4gd2lsbCBub3QgYXBwZW5kICdub2RlX21vZHVsZXMnIHRvIHRoZSBwYXRoXG4gICAgY29uc3QgcHJlZml4UGF0aCA9IHRoaXMubmFtZSA9PT0gUGFja2FnZU1hbmFnZXIuWWFybiA/IHRlbXBOb2RlTW9kdWxlcyA6IHRlbXBQYXRoO1xuICAgIGNvbnN0IGluc3RhbGxBcmdzOiBzdHJpbmdbXSA9IFtcbiAgICAgIC4uLihleHRyYUFyZ3MgPz8gW10pLFxuICAgICAgYCR7cGFja2FnZU1hbmFnZXJBcmdzLnByZWZpeH09XCIke3ByZWZpeFBhdGh9XCJgLFxuICAgICAgcGFja2FnZU1hbmFnZXJBcmdzLm5vTG9ja2ZpbGUsXG4gICAgXTtcblxuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiBhd2FpdCB0aGlzLmluc3RhbGwocGFja2FnZU5hbWUsIHRydWUsIGluc3RhbGxBcmdzLCB0ZW1wUGF0aCksXG4gICAgICB0ZW1wTm9kZU1vZHVsZXMsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0QXJndW1lbnRzKCk6IFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyB7XG4gICAgc3dpdGNoICh0aGlzLm5hbWUpIHtcbiAgICAgIGNhc2UgUGFja2FnZU1hbmFnZXIuWWFybjpcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzYXZlRGV2OiAnLS1kZXYnLFxuICAgICAgICAgIGluc3RhbGw6ICdhZGQnLFxuICAgICAgICAgIHByZWZpeDogJy0tbW9kdWxlcy1mb2xkZXInLFxuICAgICAgICAgIG5vTG9ja2ZpbGU6ICctLW5vLWxvY2tmaWxlJyxcbiAgICAgICAgfTtcbiAgICAgIGNhc2UgUGFja2FnZU1hbmFnZXIuUG5wbTpcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzYXZlRGV2OiAnLS1zYXZlLWRldicsXG4gICAgICAgICAgaW5zdGFsbDogJ2FkZCcsXG4gICAgICAgICAgaW5zdGFsbEFsbDogJ2luc3RhbGwnLFxuICAgICAgICAgIHByZWZpeDogJy0tcHJlZml4JyxcbiAgICAgICAgICBub0xvY2tmaWxlOiAnLS1uby1sb2NrZmlsZScsXG4gICAgICAgIH07XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNhdmVEZXY6ICctLXNhdmUtZGV2JyxcbiAgICAgICAgICBpbnN0YWxsOiAnaW5zdGFsbCcsXG4gICAgICAgICAgaW5zdGFsbEFsbDogJ2luc3RhbGwnLFxuICAgICAgICAgIHByZWZpeDogJy0tcHJlZml4JyxcbiAgICAgICAgICBub0xvY2tmaWxlOiAnLS1uby1wYWNrYWdlLWxvY2snLFxuICAgICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcnVuKFxuICAgIGFyZ3M6IHN0cmluZ1tdLFxuICAgIG9wdGlvbnM6IHsgY3dkPzogc3RyaW5nOyBzaWxlbnQ/OiBib29sZWFuIH0gPSB7fSxcbiAgKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgeyBjd2QgPSBwcm9jZXNzLmN3ZCgpLCBzaWxlbnQgPSBmYWxzZSB9ID0gb3B0aW9ucztcblxuICAgIGNvbnN0IHNwaW5uZXIgPSBuZXcgU3Bpbm5lcigpO1xuICAgIHNwaW5uZXIuc3RhcnQoJ0luc3RhbGxpbmcgcGFja2FnZXMuLi4nKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgY29uc3QgYnVmZmVyZWRPdXRwdXQ6IHsgc3RyZWFtOiBOb2RlSlMuV3JpdGVTdHJlYW07IGRhdGE6IEJ1ZmZlciB9W10gPSBbXTtcblxuICAgICAgY29uc3QgY2hpbGRQcm9jZXNzID0gc3Bhd24odGhpcy5uYW1lLCBhcmdzLCB7XG4gICAgICAgIC8vIEFsd2F5cyBwaXBlIHN0ZGVyciB0byBhbGxvdyBmb3IgZmFpbHVyZXMgdG8gYmUgcmVwb3J0ZWRcbiAgICAgICAgc3RkaW86IHNpbGVudCA/IFsnaWdub3JlJywgJ2lnbm9yZScsICdwaXBlJ10gOiAncGlwZScsXG4gICAgICAgIHNoZWxsOiB0cnVlLFxuICAgICAgICBjd2QsXG4gICAgICB9KS5vbignY2xvc2UnLCAoY29kZTogbnVtYmVyKSA9PiB7XG4gICAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgICAgc3Bpbm5lci5zdWNjZWVkKCdQYWNrYWdlcyBzdWNjZXNzZnVsbHkgaW5zdGFsbGVkLicpO1xuICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3Bpbm5lci5zdG9wKCk7XG4gICAgICAgICAgYnVmZmVyZWRPdXRwdXQuZm9yRWFjaCgoeyBzdHJlYW0sIGRhdGEgfSkgPT4gc3RyZWFtLndyaXRlKGRhdGEpKTtcbiAgICAgICAgICBzcGlubmVyLmZhaWwoJ1BhY2thZ2VzIGluc3RhbGxhdGlvbiBmYWlsZWQsIHNlZSBhYm92ZS4nKTtcbiAgICAgICAgICByZXNvbHZlKGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGNoaWxkUHJvY2Vzcy5zdGRvdXQ/Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT5cbiAgICAgICAgYnVmZmVyZWRPdXRwdXQucHVzaCh7IHN0cmVhbTogcHJvY2Vzcy5zdGRvdXQsIGRhdGE6IGRhdGEgfSksXG4gICAgICApO1xuICAgICAgY2hpbGRQcm9jZXNzLnN0ZGVycj8ub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PlxuICAgICAgICBidWZmZXJlZE91dHB1dC5wdXNoKHsgc3RyZWFtOiBwcm9jZXNzLnN0ZGVyciwgZGF0YTogZGF0YSB9KSxcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cblxuICBAbWVtb2l6ZVxuICBwcml2YXRlIGdldFZlcnNpb24obmFtZTogUGFja2FnZU1hbmFnZXIpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZXhlY1N5bmMoYCR7bmFtZX0gLS12ZXJzaW9uYCwge1xuICAgICAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgICAgICBzdGRpbzogWydpZ25vcmUnLCAncGlwZScsICdpZ25vcmUnXSxcbiAgICAgICAgZW52OiB7XG4gICAgICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAgICAgLy8gIE5QTSB1cGRhdGVyIG5vdGlmaWVyIHdpbGwgcHJldmVudHMgdGhlIGNoaWxkIHByb2Nlc3MgZnJvbSBjbG9zaW5nIHVudGlsIGl0IHRpbWVvdXQgYWZ0ZXIgMyBtaW51dGVzLlxuICAgICAgICAgIE5PX1VQREFURV9OT1RJRklFUjogJzEnLFxuICAgICAgICAgIE5QTV9DT05GSUdfVVBEQVRFX05PVElGSUVSOiAnZmFsc2UnLFxuICAgICAgICB9LFxuICAgICAgfSkudHJpbSgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBAbWVtb2l6ZVxuICBwcml2YXRlIGdldE5hbWUoKTogUGFja2FnZU1hbmFnZXIge1xuICAgIGNvbnN0IHBhY2thZ2VNYW5hZ2VyID0gdGhpcy5nZXRDb25maWd1cmVkUGFja2FnZU1hbmFnZXIoKTtcbiAgICBpZiAocGFja2FnZU1hbmFnZXIpIHtcbiAgICAgIHJldHVybiBwYWNrYWdlTWFuYWdlcjtcbiAgICB9XG5cbiAgICBjb25zdCBoYXNOcG1Mb2NrID0gdGhpcy5oYXNMb2NrZmlsZShQYWNrYWdlTWFuYWdlci5OcG0pO1xuICAgIGNvbnN0IGhhc1lhcm5Mb2NrID0gdGhpcy5oYXNMb2NrZmlsZShQYWNrYWdlTWFuYWdlci5ZYXJuKTtcbiAgICBjb25zdCBoYXNQbnBtTG9jayA9IHRoaXMuaGFzTG9ja2ZpbGUoUGFja2FnZU1hbmFnZXIuUG5wbSk7XG5cbiAgICAvLyBQRVJGIE5PVEU6IGB0aGlzLmdldFZlcnNpb25gIHNwYXducyB0aGUgcGFja2FnZSBhIHRoZSBjaGlsZF9wcm9jZXNzIHdoaWNoIGNhbiB0YWtlIGFyb3VuZCB+MzAwbXMgYXQgdGltZXMuXG4gICAgLy8gVGhlcmVmb3JlLCB3ZSBzaG91bGQgb25seSBjYWxsIHRoaXMgbWV0aG9kIHdoZW4gbmVlZGVkLiBJRTogZG9uJ3QgY2FsbCBgdGhpcy5nZXRWZXJzaW9uKFBhY2thZ2VNYW5hZ2VyLlBucG0pYCB1bmxlc3MgdHJ1bHkgbmVlZGVkLlxuICAgIC8vIFRoZSByZXN1bHQgb2YgdGhpcyBtZXRob2QgaXMgbm90IHN0b3JlZCBpbiBhIHZhcmlhYmxlIGJlY2F1c2UgaXQncyBtZW1vaXplZC5cblxuICAgIGlmIChoYXNOcG1Mb2NrKSB7XG4gICAgICAvLyBIYXMgTlBNIGxvY2sgZmlsZS5cbiAgICAgIGlmICghaGFzWWFybkxvY2sgJiYgIWhhc1BucG1Mb2NrICYmIHRoaXMuZ2V0VmVyc2lvbihQYWNrYWdlTWFuYWdlci5OcG0pKSB7XG4gICAgICAgIC8vIE9ubHkgTlBNIGxvY2sgZmlsZSBhbmQgTlBNIGJpbmFyeSBpcyBhdmFpbGFibGUuXG4gICAgICAgIHJldHVybiBQYWNrYWdlTWFuYWdlci5OcG07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE5vIE5QTSBsb2NrIGZpbGUuXG4gICAgICBpZiAoaGFzWWFybkxvY2sgJiYgdGhpcy5nZXRWZXJzaW9uKFBhY2thZ2VNYW5hZ2VyLllhcm4pKSB7XG4gICAgICAgIC8vIFlhcm4gbG9jayBmaWxlIGFuZCBZYXJuIGJpbmFyeSBpcyBhdmFpbGFibGUuXG4gICAgICAgIHJldHVybiBQYWNrYWdlTWFuYWdlci5ZYXJuO1xuICAgICAgfSBlbHNlIGlmIChoYXNQbnBtTG9jayAmJiB0aGlzLmdldFZlcnNpb24oUGFja2FnZU1hbmFnZXIuUG5wbSkpIHtcbiAgICAgICAgLy8gUE5QTSBsb2NrIGZpbGUgYW5kIFBOUE0gYmluYXJ5IGlzIGF2YWlsYWJsZS5cbiAgICAgICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLlBucG07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmdldFZlcnNpb24oUGFja2FnZU1hbmFnZXIuTnBtKSkge1xuICAgICAgLy8gRG9lc24ndCBoYXZlIE5QTSBpbnN0YWxsZWQuXG4gICAgICBjb25zdCBoYXNZYXJuID0gISF0aGlzLmdldFZlcnNpb24oUGFja2FnZU1hbmFnZXIuWWFybik7XG4gICAgICBjb25zdCBoYXNQbnBtID0gISF0aGlzLmdldFZlcnNpb24oUGFja2FnZU1hbmFnZXIuUG5wbSk7XG5cbiAgICAgIGlmIChoYXNZYXJuICYmICFoYXNQbnBtKSB7XG4gICAgICAgIHJldHVybiBQYWNrYWdlTWFuYWdlci5ZYXJuO1xuICAgICAgfSBlbHNlIGlmICghaGFzWWFybiAmJiBoYXNQbnBtKSB7XG4gICAgICAgIHJldHVybiBQYWNrYWdlTWFuYWdlci5QbnBtO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRPRE86IFRoaXMgc2hvdWxkIGV2ZW50dWFsbHkgaW5mb3JtIHRoZSB1c2VyIG9mIGFtYmlndW91cyBwYWNrYWdlIG1hbmFnZXIgdXNhZ2UuXG4gICAgLy8gICAgICAgUG90ZW50aWFsbHkgd2l0aCBhIHByb21wdCB0byBjaG9vc2UgYW5kIG9wdGlvbmFsbHkgc2V0IGFzIHRoZSBkZWZhdWx0LlxuICAgIHJldHVybiBQYWNrYWdlTWFuYWdlci5OcG07XG4gIH1cblxuICBwcml2YXRlIGhhc0xvY2tmaWxlKHBhY2thZ2VNYW5hZ2VyOiBQYWNrYWdlTWFuYWdlcik6IGJvb2xlYW4ge1xuICAgIGxldCBsb2NrZmlsZU5hbWU6IHN0cmluZztcbiAgICBzd2l0Y2ggKHBhY2thZ2VNYW5hZ2VyKSB7XG4gICAgICBjYXNlIFBhY2thZ2VNYW5hZ2VyLllhcm46XG4gICAgICAgIGxvY2tmaWxlTmFtZSA9ICd5YXJuLmxvY2snO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgUGFja2FnZU1hbmFnZXIuUG5wbTpcbiAgICAgICAgbG9ja2ZpbGVOYW1lID0gJ3BucG0tbG9jay55YW1sJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFBhY2thZ2VNYW5hZ2VyLk5wbTpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxvY2tmaWxlTmFtZSA9ICdwYWNrYWdlLWxvY2suanNvbic7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiBleGlzdHNTeW5jKGpvaW4odGhpcy5jb250ZXh0LnJvb3QsIGxvY2tmaWxlTmFtZSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRDb25maWd1cmVkUGFja2FnZU1hbmFnZXIoKTogUGFja2FnZU1hbmFnZXIgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IGdldFBhY2thZ2VNYW5hZ2VyID0gKHNvdXJjZToganNvbi5Kc29uVmFsdWUgfCB1bmRlZmluZWQpOiBQYWNrYWdlTWFuYWdlciB8IHVuZGVmaW5lZCA9PiB7XG4gICAgICBpZiAoc291cmNlICYmIGlzSnNvbk9iamVjdChzb3VyY2UpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gc291cmNlWydwYWNrYWdlTWFuYWdlciddO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiB2YWx1ZSBhcyBQYWNrYWdlTWFuYWdlcjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH07XG5cbiAgICBsZXQgcmVzdWx0OiBQYWNrYWdlTWFuYWdlciB8IHVuZGVmaW5lZDtcbiAgICBjb25zdCB7IHdvcmtzcGFjZTogbG9jYWxXb3Jrc3BhY2UsIGdsb2JhbENvbmZpZ3VyYXRpb246IGdsb2JhbFdvcmtzcGFjZSB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGlmIChsb2NhbFdvcmtzcGFjZSkge1xuICAgICAgY29uc3QgcHJvamVjdCA9IGdldFByb2plY3RCeUN3ZChsb2NhbFdvcmtzcGFjZSk7XG4gICAgICBpZiAocHJvamVjdCkge1xuICAgICAgICByZXN1bHQgPSBnZXRQYWNrYWdlTWFuYWdlcihsb2NhbFdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdCk/LmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgICAgIH1cblxuICAgICAgcmVzdWx0ID8/PSBnZXRQYWNrYWdlTWFuYWdlcihsb2NhbFdvcmtzcGFjZS5leHRlbnNpb25zWydjbGknXSk7XG4gICAgfVxuXG4gICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgIHJlc3VsdCA9IGdldFBhY2thZ2VNYW5hZ2VyKGdsb2JhbFdvcmtzcGFjZS5leHRlbnNpb25zWydjbGknXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuIl19