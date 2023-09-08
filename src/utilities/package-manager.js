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
            result ?? (result = getPackageManager(localWorkspace.extensions['cli']));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQTBEO0FBQzFELGlEQUFnRDtBQUNoRCwyQkFBc0U7QUFDdEUsMkJBQTRCO0FBQzVCLCtCQUE0QjtBQUM1Qix3RUFBbUU7QUFDbkUscUNBQTZEO0FBQzdELHVDQUFvQztBQUNwQyx1Q0FBb0M7QUFnQnBDLE1BQWEsbUJBQW1CO0lBQzlCLFlBQTZCLE9BQW1DO1FBQW5DLFlBQU8sR0FBUCxPQUFPLENBQTRCO0lBQUcsQ0FBQztJQUVwRSxvQ0FBb0M7SUFDcEMsSUFBSSxJQUFJO1FBQ04sT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVELHVDQUF1QztJQUN2QyxJQUFJLE9BQU87UUFDVCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxnQ0FBZ0M7SUFDaEMsS0FBSyxDQUFDLE9BQU8sQ0FDWCxXQUFtQixFQUNuQixPQUFrRCxJQUFJLEVBQ3RELFlBQXNCLEVBQUUsRUFDeEIsR0FBWTtRQUVaLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQy9DLE1BQU0sV0FBVyxHQUFhLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRXhFLElBQUksSUFBSSxLQUFLLGlCQUFpQixFQUFFO1lBQzlCLFdBQVcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDOUM7UUFFRCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFdBQVcsRUFBRSxH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SUFBSSxJQUFBLG1CQUFZLEVBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ2xDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUN2QyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRTtvQkFDN0IsT0FBTyxLQUF1QixDQUFDO2lCQUNoQzthQUNGO1lBRUQsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQyxDQUFDO1FBRUYsSUFBSSxNQUFrQyxDQUFDO1FBQ3ZDLE1BQU0sRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDekYsSUFBSSxjQUFjLEVBQUU7WUFDbEIsTUFBTSxPQUFPLEdBQUcsSUFBQSx3QkFBZSxFQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ2hELElBQUksT0FBTyxFQUFFO2dCQUNYLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUNyRjtZQUVELE1BQU0sS0FBTixNQUFNLEdBQUssaUJBQWlCLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDO1NBQ2hFO1FBRUQsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDL0Q7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0NBQ0Y7QUFsUkQsa0RBa1JDO0FBakhTO0lBRFAsaUJBQU87Ozs7cURBZ0JQO0FBR087SUFEUCxpQkFBTzs7OztrREErQ1AiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgaXNKc29uT2JqZWN0LCBqc29uIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgZXhlY1N5bmMsIHNwYXduIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCBwcm9taXNlcyBhcyBmcywgcmVhbHBhdGhTeW5jLCBybVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyB0bXBkaXIgfSBmcm9tICdvcyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uLy4uL2xpYi9jb25maWcvd29ya3NwYWNlLXNjaGVtYSc7XG5pbXBvcnQgeyBBbmd1bGFyV29ya3NwYWNlLCBnZXRQcm9qZWN0QnlDd2QgfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgeyBtZW1vaXplIH0gZnJvbSAnLi9tZW1vaXplJztcbmltcG9ydCB7IFNwaW5uZXIgfSBmcm9tICcuL3NwaW5uZXInO1xuXG5pbnRlcmZhY2UgUGFja2FnZU1hbmFnZXJPcHRpb25zIHtcbiAgc2F2ZURldjogc3RyaW5nO1xuICBpbnN0YWxsOiBzdHJpbmc7XG4gIGluc3RhbGxBbGw/OiBzdHJpbmc7XG4gIHByZWZpeDogc3RyaW5nO1xuICBub0xvY2tmaWxlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZU1hbmFnZXJVdGlsc0NvbnRleHQge1xuICBnbG9iYWxDb25maWd1cmF0aW9uOiBBbmd1bGFyV29ya3NwYWNlO1xuICB3b3Jrc3BhY2U/OiBBbmd1bGFyV29ya3NwYWNlO1xuICByb290OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBQYWNrYWdlTWFuYWdlclV0aWxzIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb250ZXh0OiBQYWNrYWdlTWFuYWdlclV0aWxzQ29udGV4dCkge31cblxuICAvKiogR2V0IHRoZSBwYWNrYWdlIG1hbmFnZXIgbmFtZS4gKi9cbiAgZ2V0IG5hbWUoKTogUGFja2FnZU1hbmFnZXIge1xuICAgIHJldHVybiB0aGlzLmdldE5hbWUoKTtcbiAgfVxuXG4gIC8qKiBHZXQgdGhlIHBhY2thZ2UgbWFuYWdlciB2ZXJzaW9uLiAqL1xuICBnZXQgdmVyc2lvbigpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmdldFZlcnNpb24odGhpcy5uYW1lKTtcbiAgfVxuXG4gIC8qKiBJbnN0YWxsIGEgc2luZ2xlIHBhY2thZ2UuICovXG4gIGFzeW5jIGluc3RhbGwoXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICBzYXZlOiAnZGVwZW5kZW5jaWVzJyB8ICdkZXZEZXBlbmRlbmNpZXMnIHwgdHJ1ZSA9IHRydWUsXG4gICAgZXh0cmFBcmdzOiBzdHJpbmdbXSA9IFtdLFxuICAgIGN3ZD86IHN0cmluZyxcbiAgKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgcGFja2FnZU1hbmFnZXJBcmdzID0gdGhpcy5nZXRBcmd1bWVudHMoKTtcbiAgICBjb25zdCBpbnN0YWxsQXJnczogc3RyaW5nW10gPSBbcGFja2FnZU1hbmFnZXJBcmdzLmluc3RhbGwsIHBhY2thZ2VOYW1lXTtcblxuICAgIGlmIChzYXZlID09PSAnZGV2RGVwZW5kZW5jaWVzJykge1xuICAgICAgaW5zdGFsbEFyZ3MucHVzaChwYWNrYWdlTWFuYWdlckFyZ3Muc2F2ZURldik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucnVuKFsuLi5pbnN0YWxsQXJncywgLi4uZXh0cmFBcmdzXSwgeyBjd2QsIHNpbGVudDogdHJ1ZSB9KTtcbiAgfVxuXG4gIC8qKiBJbnN0YWxsIGFsbCBwYWNrYWdlcy4gKi9cbiAgYXN5bmMgaW5zdGFsbEFsbChleHRyYUFyZ3M6IHN0cmluZ1tdID0gW10sIGN3ZD86IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IHBhY2thZ2VNYW5hZ2VyQXJncyA9IHRoaXMuZ2V0QXJndW1lbnRzKCk7XG4gICAgY29uc3QgaW5zdGFsbEFyZ3M6IHN0cmluZ1tdID0gW107XG4gICAgaWYgKHBhY2thZ2VNYW5hZ2VyQXJncy5pbnN0YWxsQWxsKSB7XG4gICAgICBpbnN0YWxsQXJncy5wdXNoKHBhY2thZ2VNYW5hZ2VyQXJncy5pbnN0YWxsQWxsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5ydW4oWy4uLmluc3RhbGxBcmdzLCAuLi5leHRyYUFyZ3NdLCB7IGN3ZCwgc2lsZW50OiB0cnVlIH0pO1xuICB9XG5cbiAgLyoqIEluc3RhbGwgYSBzaW5nbGUgcGFja2FnZSB0ZW1wb3JhcnkuICovXG4gIGFzeW5jIGluc3RhbGxUZW1wKFxuICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgZXh0cmFBcmdzPzogc3RyaW5nW10sXG4gICk6IFByb21pc2U8e1xuICAgIHN1Y2Nlc3M6IGJvb2xlYW47XG4gICAgdGVtcE5vZGVNb2R1bGVzOiBzdHJpbmc7XG4gIH0+IHtcbiAgICBjb25zdCB0ZW1wUGF0aCA9IGF3YWl0IGZzLm1rZHRlbXAoam9pbihyZWFscGF0aFN5bmModG1wZGlyKCkpLCAnYW5ndWxhci1jbGktcGFja2FnZXMtJykpO1xuXG4gICAgLy8gY2xlYW4gdXAgdGVtcCBkaXJlY3Rvcnkgb24gcHJvY2VzcyBleGl0XG4gICAgcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJtU3luYyh0ZW1wUGF0aCwgeyByZWN1cnNpdmU6IHRydWUsIG1heFJldHJpZXM6IDMgfSk7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfSk7XG5cbiAgICAvLyBOUE0gd2lsbCB3YXJuIHdoZW4gYSBgcGFja2FnZS5qc29uYCBpcyBub3QgZm91bmQgaW4gdGhlIGluc3RhbGwgZGlyZWN0b3J5XG4gICAgLy8gRXhhbXBsZTpcbiAgICAvLyBucG0gV0FSTiBlbm9lbnQgRU5PRU5UOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5LCBvcGVuICcvdG1wLy5uZy10ZW1wLXBhY2thZ2VzLTg0UWk3eS9wYWNrYWdlLmpzb24nXG4gICAgLy8gbnBtIFdBUk4gLm5nLXRlbXAtcGFja2FnZXMtODRRaTd5IE5vIGRlc2NyaXB0aW9uXG4gICAgLy8gbnBtIFdBUk4gLm5nLXRlbXAtcGFja2FnZXMtODRRaTd5IE5vIHJlcG9zaXRvcnkgZmllbGQuXG4gICAgLy8gbnBtIFdBUk4gLm5nLXRlbXAtcGFja2FnZXMtODRRaTd5IE5vIGxpY2Vuc2UgZmllbGQuXG5cbiAgICAvLyBXaGlsZSB3ZSBjYW4gdXNlIGBucG0gaW5pdCAteWAgd2Ugd2lsbCBlbmQgdXAgbmVlZGluZyB0byB1cGRhdGUgdGhlICdwYWNrYWdlLmpzb24nIGFueXdheXNcbiAgICAvLyBiZWNhdXNlIG9mIG1pc3NpbmcgZmllbGRzLlxuICAgIGF3YWl0IGZzLndyaXRlRmlsZShcbiAgICAgIGpvaW4odGVtcFBhdGgsICdwYWNrYWdlLmpzb24nKSxcbiAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbmFtZTogJ3RlbXAtY2xpLWluc3RhbGwnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ3RlbXAtY2xpLWluc3RhbGwnLFxuICAgICAgICByZXBvc2l0b3J5OiAndGVtcC1jbGktaW5zdGFsbCcsXG4gICAgICAgIGxpY2Vuc2U6ICdNSVQnLFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIC8vIHNldHVwIHByZWZpeC9nbG9iYWwgbW9kdWxlcyBwYXRoXG4gICAgY29uc3QgcGFja2FnZU1hbmFnZXJBcmdzID0gdGhpcy5nZXRBcmd1bWVudHMoKTtcbiAgICBjb25zdCB0ZW1wTm9kZU1vZHVsZXMgPSBqb2luKHRlbXBQYXRoLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgLy8gWWFybiB3aWxsIG5vdCBhcHBlbmQgJ25vZGVfbW9kdWxlcycgdG8gdGhlIHBhdGhcbiAgICBjb25zdCBwcmVmaXhQYXRoID0gdGhpcy5uYW1lID09PSBQYWNrYWdlTWFuYWdlci5ZYXJuID8gdGVtcE5vZGVNb2R1bGVzIDogdGVtcFBhdGg7XG4gICAgY29uc3QgaW5zdGFsbEFyZ3M6IHN0cmluZ1tdID0gW1xuICAgICAgLi4uKGV4dHJhQXJncyA/PyBbXSksXG4gICAgICBgJHtwYWNrYWdlTWFuYWdlckFyZ3MucHJlZml4fT1cIiR7cHJlZml4UGF0aH1cImAsXG4gICAgICBwYWNrYWdlTWFuYWdlckFyZ3Mubm9Mb2NrZmlsZSxcbiAgICBdO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IGF3YWl0IHRoaXMuaW5zdGFsbChwYWNrYWdlTmFtZSwgdHJ1ZSwgaW5zdGFsbEFyZ3MsIHRlbXBQYXRoKSxcbiAgICAgIHRlbXBOb2RlTW9kdWxlcyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRBcmd1bWVudHMoKTogUGFja2FnZU1hbmFnZXJPcHRpb25zIHtcbiAgICBzd2l0Y2ggKHRoaXMubmFtZSkge1xuICAgICAgY2FzZSBQYWNrYWdlTWFuYWdlci5ZYXJuOlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNhdmVEZXY6ICctLWRldicsXG4gICAgICAgICAgaW5zdGFsbDogJ2FkZCcsXG4gICAgICAgICAgcHJlZml4OiAnLS1tb2R1bGVzLWZvbGRlcicsXG4gICAgICAgICAgbm9Mb2NrZmlsZTogJy0tbm8tbG9ja2ZpbGUnLFxuICAgICAgICB9O1xuICAgICAgY2FzZSBQYWNrYWdlTWFuYWdlci5QbnBtOlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNhdmVEZXY6ICctLXNhdmUtZGV2JyxcbiAgICAgICAgICBpbnN0YWxsOiAnYWRkJyxcbiAgICAgICAgICBpbnN0YWxsQWxsOiAnaW5zdGFsbCcsXG4gICAgICAgICAgcHJlZml4OiAnLS1wcmVmaXgnLFxuICAgICAgICAgIG5vTG9ja2ZpbGU6ICctLW5vLWxvY2tmaWxlJyxcbiAgICAgICAgfTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc2F2ZURldjogJy0tc2F2ZS1kZXYnLFxuICAgICAgICAgIGluc3RhbGw6ICdpbnN0YWxsJyxcbiAgICAgICAgICBpbnN0YWxsQWxsOiAnaW5zdGFsbCcsXG4gICAgICAgICAgcHJlZml4OiAnLS1wcmVmaXgnLFxuICAgICAgICAgIG5vTG9ja2ZpbGU6ICctLW5vLXBhY2thZ2UtbG9jaycsXG4gICAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBydW4oXG4gICAgYXJnczogc3RyaW5nW10sXG4gICAgb3B0aW9uczogeyBjd2Q/OiBzdHJpbmc7IHNpbGVudD86IGJvb2xlYW4gfSA9IHt9LFxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCB7IGN3ZCA9IHByb2Nlc3MuY3dkKCksIHNpbGVudCA9IGZhbHNlIH0gPSBvcHRpb25zO1xuXG4gICAgY29uc3Qgc3Bpbm5lciA9IG5ldyBTcGlubmVyKCk7XG4gICAgc3Bpbm5lci5zdGFydCgnSW5zdGFsbGluZyBwYWNrYWdlcy4uLicpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICBjb25zdCBidWZmZXJlZE91dHB1dDogeyBzdHJlYW06IE5vZGVKUy5Xcml0ZVN0cmVhbTsgZGF0YTogQnVmZmVyIH1bXSA9IFtdO1xuXG4gICAgICBjb25zdCBjaGlsZFByb2Nlc3MgPSBzcGF3bih0aGlzLm5hbWUsIGFyZ3MsIHtcbiAgICAgICAgLy8gQWx3YXlzIHBpcGUgc3RkZXJyIHRvIGFsbG93IGZvciBmYWlsdXJlcyB0byBiZSByZXBvcnRlZFxuICAgICAgICBzdGRpbzogc2lsZW50ID8gWydpZ25vcmUnLCAnaWdub3JlJywgJ3BpcGUnXSA6ICdwaXBlJyxcbiAgICAgICAgc2hlbGw6IHRydWUsXG4gICAgICAgIGN3ZCxcbiAgICAgIH0pLm9uKCdjbG9zZScsIChjb2RlOiBudW1iZXIpID0+IHtcbiAgICAgICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgICAgICBzcGlubmVyLnN1Y2NlZWQoJ1BhY2thZ2VzIHN1Y2Nlc3NmdWxseSBpbnN0YWxsZWQuJyk7XG4gICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzcGlubmVyLnN0b3AoKTtcbiAgICAgICAgICBidWZmZXJlZE91dHB1dC5mb3JFYWNoKCh7IHN0cmVhbSwgZGF0YSB9KSA9PiBzdHJlYW0ud3JpdGUoZGF0YSkpO1xuICAgICAgICAgIHNwaW5uZXIuZmFpbCgnUGFja2FnZXMgaW5zdGFsbGF0aW9uIGZhaWxlZCwgc2VlIGFib3ZlLicpO1xuICAgICAgICAgIHJlc29sdmUoZmFsc2UpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY2hpbGRQcm9jZXNzLnN0ZG91dD8ub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PlxuICAgICAgICBidWZmZXJlZE91dHB1dC5wdXNoKHsgc3RyZWFtOiBwcm9jZXNzLnN0ZG91dCwgZGF0YTogZGF0YSB9KSxcbiAgICAgICk7XG4gICAgICBjaGlsZFByb2Nlc3Muc3RkZXJyPy5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+XG4gICAgICAgIGJ1ZmZlcmVkT3V0cHV0LnB1c2goeyBzdHJlYW06IHByb2Nlc3Muc3RkZXJyLCBkYXRhOiBkYXRhIH0pLFxuICAgICAgKTtcbiAgICB9KTtcbiAgfVxuXG4gIEBtZW1vaXplXG4gIHByaXZhdGUgZ2V0VmVyc2lvbihuYW1lOiBQYWNrYWdlTWFuYWdlcik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBleGVjU3luYyhgJHtuYW1lfSAtLXZlcnNpb25gLCB7XG4gICAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICAgIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ2lnbm9yZSddLFxuICAgICAgICBlbnY6IHtcbiAgICAgICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgICAgICAvLyAgTlBNIHVwZGF0ZXIgbm90aWZpZXIgd2lsbCBwcmV2ZW50cyB0aGUgY2hpbGQgcHJvY2VzcyBmcm9tIGNsb3NpbmcgdW50aWwgaXQgdGltZW91dCBhZnRlciAzIG1pbnV0ZXMuXG4gICAgICAgICAgTk9fVVBEQVRFX05PVElGSUVSOiAnMScsXG4gICAgICAgICAgTlBNX0NPTkZJR19VUERBVEVfTk9USUZJRVI6ICdmYWxzZScsXG4gICAgICAgIH0sXG4gICAgICB9KS50cmltKCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIEBtZW1vaXplXG4gIHByaXZhdGUgZ2V0TmFtZSgpOiBQYWNrYWdlTWFuYWdlciB7XG4gICAgY29uc3QgcGFja2FnZU1hbmFnZXIgPSB0aGlzLmdldENvbmZpZ3VyZWRQYWNrYWdlTWFuYWdlcigpO1xuICAgIGlmIChwYWNrYWdlTWFuYWdlcikge1xuICAgICAgcmV0dXJuIHBhY2thZ2VNYW5hZ2VyO1xuICAgIH1cblxuICAgIGNvbnN0IGhhc05wbUxvY2sgPSB0aGlzLmhhc0xvY2tmaWxlKFBhY2thZ2VNYW5hZ2VyLk5wbSk7XG4gICAgY29uc3QgaGFzWWFybkxvY2sgPSB0aGlzLmhhc0xvY2tmaWxlKFBhY2thZ2VNYW5hZ2VyLllhcm4pO1xuICAgIGNvbnN0IGhhc1BucG1Mb2NrID0gdGhpcy5oYXNMb2NrZmlsZShQYWNrYWdlTWFuYWdlci5QbnBtKTtcblxuICAgIC8vIFBFUkYgTk9URTogYHRoaXMuZ2V0VmVyc2lvbmAgc3Bhd25zIHRoZSBwYWNrYWdlIGEgdGhlIGNoaWxkX3Byb2Nlc3Mgd2hpY2ggY2FuIHRha2UgYXJvdW5kIH4zMDBtcyBhdCB0aW1lcy5cbiAgICAvLyBUaGVyZWZvcmUsIHdlIHNob3VsZCBvbmx5IGNhbGwgdGhpcyBtZXRob2Qgd2hlbiBuZWVkZWQuIElFOiBkb24ndCBjYWxsIGB0aGlzLmdldFZlcnNpb24oUGFja2FnZU1hbmFnZXIuUG5wbSlgIHVubGVzcyB0cnVseSBuZWVkZWQuXG4gICAgLy8gVGhlIHJlc3VsdCBvZiB0aGlzIG1ldGhvZCBpcyBub3Qgc3RvcmVkIGluIGEgdmFyaWFibGUgYmVjYXVzZSBpdCdzIG1lbW9pemVkLlxuXG4gICAgaWYgKGhhc05wbUxvY2spIHtcbiAgICAgIC8vIEhhcyBOUE0gbG9jayBmaWxlLlxuICAgICAgaWYgKCFoYXNZYXJuTG9jayAmJiAhaGFzUG5wbUxvY2sgJiYgdGhpcy5nZXRWZXJzaW9uKFBhY2thZ2VNYW5hZ2VyLk5wbSkpIHtcbiAgICAgICAgLy8gT25seSBOUE0gbG9jayBmaWxlIGFuZCBOUE0gYmluYXJ5IGlzIGF2YWlsYWJsZS5cbiAgICAgICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLk5wbTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm8gTlBNIGxvY2sgZmlsZS5cbiAgICAgIGlmIChoYXNZYXJuTG9jayAmJiB0aGlzLmdldFZlcnNpb24oUGFja2FnZU1hbmFnZXIuWWFybikpIHtcbiAgICAgICAgLy8gWWFybiBsb2NrIGZpbGUgYW5kIFlhcm4gYmluYXJ5IGlzIGF2YWlsYWJsZS5cbiAgICAgICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLllhcm47XG4gICAgICB9IGVsc2UgaWYgKGhhc1BucG1Mb2NrICYmIHRoaXMuZ2V0VmVyc2lvbihQYWNrYWdlTWFuYWdlci5QbnBtKSkge1xuICAgICAgICAvLyBQTlBNIGxvY2sgZmlsZSBhbmQgUE5QTSBiaW5hcnkgaXMgYXZhaWxhYmxlLlxuICAgICAgICByZXR1cm4gUGFja2FnZU1hbmFnZXIuUG5wbTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZ2V0VmVyc2lvbihQYWNrYWdlTWFuYWdlci5OcG0pKSB7XG4gICAgICAvLyBEb2Vzbid0IGhhdmUgTlBNIGluc3RhbGxlZC5cbiAgICAgIGNvbnN0IGhhc1lhcm4gPSAhIXRoaXMuZ2V0VmVyc2lvbihQYWNrYWdlTWFuYWdlci5ZYXJuKTtcbiAgICAgIGNvbnN0IGhhc1BucG0gPSAhIXRoaXMuZ2V0VmVyc2lvbihQYWNrYWdlTWFuYWdlci5QbnBtKTtcblxuICAgICAgaWYgKGhhc1lhcm4gJiYgIWhhc1BucG0pIHtcbiAgICAgICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLllhcm47XG4gICAgICB9IGVsc2UgaWYgKCFoYXNZYXJuICYmIGhhc1BucG0pIHtcbiAgICAgICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLlBucG07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVE9ETzogVGhpcyBzaG91bGQgZXZlbnR1YWxseSBpbmZvcm0gdGhlIHVzZXIgb2YgYW1iaWd1b3VzIHBhY2thZ2UgbWFuYWdlciB1c2FnZS5cbiAgICAvLyAgICAgICBQb3RlbnRpYWxseSB3aXRoIGEgcHJvbXB0IHRvIGNob29zZSBhbmQgb3B0aW9uYWxseSBzZXQgYXMgdGhlIGRlZmF1bHQuXG4gICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLk5wbTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzTG9ja2ZpbGUocGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyKTogYm9vbGVhbiB7XG4gICAgbGV0IGxvY2tmaWxlTmFtZTogc3RyaW5nO1xuICAgIHN3aXRjaCAocGFja2FnZU1hbmFnZXIpIHtcbiAgICAgIGNhc2UgUGFja2FnZU1hbmFnZXIuWWFybjpcbiAgICAgICAgbG9ja2ZpbGVOYW1lID0gJ3lhcm4ubG9jayc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBQYWNrYWdlTWFuYWdlci5QbnBtOlxuICAgICAgICBsb2NrZmlsZU5hbWUgPSAncG5wbS1sb2NrLnlhbWwnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgUGFja2FnZU1hbmFnZXIuTnBtOlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbG9ja2ZpbGVOYW1lID0gJ3BhY2thZ2UtbG9jay5qc29uJztcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIGV4aXN0c1N5bmMoam9pbih0aGlzLmNvbnRleHQucm9vdCwgbG9ja2ZpbGVOYW1lKSk7XG4gIH1cblxuICBwcml2YXRlIGdldENvbmZpZ3VyZWRQYWNrYWdlTWFuYWdlcigpOiBQYWNrYWdlTWFuYWdlciB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZ2V0UGFja2FnZU1hbmFnZXIgPSAoc291cmNlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IFBhY2thZ2VNYW5hZ2VyIHwgdW5kZWZpbmVkID0+IHtcbiAgICAgIGlmIChzb3VyY2UgJiYgaXNKc29uT2JqZWN0KHNvdXJjZSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBzb3VyY2VbJ3BhY2thZ2VNYW5hZ2VyJ107XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlIGFzIFBhY2thZ2VNYW5hZ2VyO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfTtcblxuICAgIGxldCByZXN1bHQ6IFBhY2thZ2VNYW5hZ2VyIHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IHsgd29ya3NwYWNlOiBsb2NhbFdvcmtzcGFjZSwgZ2xvYmFsQ29uZmlndXJhdGlvbjogZ2xvYmFsV29ya3NwYWNlIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgaWYgKGxvY2FsV29ya3NwYWNlKSB7XG4gICAgICBjb25zdCBwcm9qZWN0ID0gZ2V0UHJvamVjdEJ5Q3dkKGxvY2FsV29ya3NwYWNlKTtcbiAgICAgIGlmIChwcm9qZWN0KSB7XG4gICAgICAgIHJlc3VsdCA9IGdldFBhY2thZ2VNYW5hZ2VyKGxvY2FsV29ya3NwYWNlLnByb2plY3RzLmdldChwcm9qZWN0KT8uZXh0ZW5zaW9uc1snY2xpJ10pO1xuICAgICAgfVxuXG4gICAgICByZXN1bHQgPz89IGdldFBhY2thZ2VNYW5hZ2VyKGxvY2FsV29ya3NwYWNlLmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgICB9XG5cbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgcmVzdWx0ID0gZ2V0UGFja2FnZU1hbmFnZXIoZ2xvYmFsV29ya3NwYWNlLmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG4iXX0=