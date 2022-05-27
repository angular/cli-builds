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
const semver_1 = require("semver");
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
            var _a, _b;
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
            (_a = childProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => bufferedOutput.push({ stream: process.stdout, data: data }));
            (_b = childProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (data) => bufferedOutput.push({ stream: process.stderr, data: data }));
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
        catch (_a) {
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
exports.PackageManagerUtils = PackageManagerUtils;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQTBEO0FBQzFELGlEQUFnRDtBQUNoRCwyQkFBeUU7QUFDekUsMkJBQTRCO0FBQzVCLCtCQUE0QjtBQUM1QixtQ0FBMEM7QUFDMUMsd0VBQW1FO0FBQ25FLHFDQUE2RDtBQUM3RCx1Q0FBb0M7QUFDcEMsdUNBQW9DO0FBZ0JwQyxNQUFhLG1CQUFtQjtJQUM5QixZQUE2QixPQUFtQztRQUFuQyxZQUFPLEdBQVAsT0FBTyxDQUE0QjtJQUFHLENBQUM7SUFFcEUsb0NBQW9DO0lBQ3BDLElBQUksSUFBSTtRQUNOLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFRCx1Q0FBdUM7SUFDdkMsSUFBSSxPQUFPO1FBQ1QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxtQkFBbUI7UUFDakIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLGlDQUFjLENBQUMsR0FBRyxFQUFFO1lBQ3BDLE9BQU87U0FDUjtRQUVELElBQUk7WUFDRixNQUFNLE9BQU8sR0FBRyxJQUFBLGNBQUssRUFBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDcEMsSUFBSSxDQUFDLE9BQU8sRUFBRTtnQkFDWixPQUFPO2FBQ1I7WUFFRCxJQUFJLElBQUEsa0JBQVMsRUFBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLEVBQUU7Z0JBQ3BDLHNDQUFzQztnQkFDdEMsT0FBTyxDQUFDLElBQUksQ0FDVixlQUFlLE9BQU8sWUFBWTtvQkFDaEMscUZBQXFGLENBQ3hG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VUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDckY7WUFFRCxNQUFNLGFBQU4sTUFBTSxjQUFOLE1BQU0sSUFBTixNQUFNLEdBQUssaUJBQWlCLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDO1NBQ2hFO1FBRUQsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxlQUFlLGFBQWYsZUFBZSx1QkFBZixlQUFlLENBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDaEU7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0NBQ0Y7QUFqSEM7SUFEQyxpQkFBTzs7OztxREFnQlA7QUFHRDtJQURDLGlCQUFPOzs7O2tEQStDUDtBQTNQSCxrREE0U0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgaXNKc29uT2JqZWN0LCBqc29uIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgZXhlY1N5bmMsIHNwYXduIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCBwcm9taXNlcyBhcyBmcywgcmVhbHBhdGhTeW5jLCBybWRpclN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyB0bXBkaXIgfSBmcm9tICdvcyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBzYXRpc2ZpZXMsIHZhbGlkIH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7IEFuZ3VsYXJXb3Jrc3BhY2UsIGdldFByb2plY3RCeUN3ZCB9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7IG1lbW9pemUgfSBmcm9tICcuL21lbW9pemUnO1xuaW1wb3J0IHsgU3Bpbm5lciB9IGZyb20gJy4vc3Bpbm5lcic7XG5cbmludGVyZmFjZSBQYWNrYWdlTWFuYWdlck9wdGlvbnMge1xuICBzYXZlRGV2OiBzdHJpbmc7XG4gIGluc3RhbGw6IHN0cmluZztcbiAgaW5zdGFsbEFsbD86IHN0cmluZztcbiAgcHJlZml4OiBzdHJpbmc7XG4gIG5vTG9ja2ZpbGU6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlTWFuYWdlclV0aWxzQ29udGV4dCB7XG4gIGdsb2JhbENvbmZpZ3VyYXRpb24/OiBBbmd1bGFyV29ya3NwYWNlO1xuICB3b3Jrc3BhY2U/OiBBbmd1bGFyV29ya3NwYWNlO1xuICByb290OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBQYWNrYWdlTWFuYWdlclV0aWxzIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb250ZXh0OiBQYWNrYWdlTWFuYWdlclV0aWxzQ29udGV4dCkge31cblxuICAvKiogR2V0IHRoZSBwYWNrYWdlIG1hbmFnZXIgbmFtZS4gKi9cbiAgZ2V0IG5hbWUoKTogUGFja2FnZU1hbmFnZXIge1xuICAgIHJldHVybiB0aGlzLmdldE5hbWUoKTtcbiAgfVxuXG4gIC8qKiBHZXQgdGhlIHBhY2thZ2UgbWFuYWdlciB2ZXJzaW9uLiAqL1xuICBnZXQgdmVyc2lvbigpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmdldFZlcnNpb24odGhpcy5uYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIHBhY2thZ2UgbWFuYWdlciBpcyBzdXBwb3J0ZWQuIElmIG5vdCwgZGlzcGxheSBhIHdhcm5pbmcuXG4gICAqL1xuICBlbnN1cmVDb21wYXRpYmlsaXR5KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLm5hbWUgIT09IFBhY2thZ2VNYW5hZ2VyLk5wbSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB2ZXJzaW9uID0gdmFsaWQodGhpcy52ZXJzaW9uKTtcbiAgICAgIGlmICghdmVyc2lvbikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChzYXRpc2ZpZXModmVyc2lvbiwgJz49NyA8Ny41LjYnKSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgYG5wbSB2ZXJzaW9uICR7dmVyc2lvbn0gZGV0ZWN0ZWQuYCArXG4gICAgICAgICAgICAnIFdoZW4gdXNpbmcgbnBtIDcgd2l0aCB0aGUgQW5ndWxhciBDTEksIG5wbSB2ZXJzaW9uIDcuNS42IG9yIGhpZ2hlciBpcyByZWNvbW1lbmRlZC4nLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gbnBtIGlzIG5vdCBpbnN0YWxsZWQuXG4gICAgfVxuICB9XG5cbiAgLyoqIEluc3RhbGwgYSBzaW5nbGUgcGFja2FnZS4gKi9cbiAgYXN5bmMgaW5zdGFsbChcbiAgICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgIHNhdmU6ICdkZXBlbmRlbmNpZXMnIHwgJ2RldkRlcGVuZGVuY2llcycgfCB0cnVlID0gdHJ1ZSxcbiAgICBleHRyYUFyZ3M6IHN0cmluZ1tdID0gW10sXG4gICAgY3dkPzogc3RyaW5nLFxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBwYWNrYWdlTWFuYWdlckFyZ3MgPSB0aGlzLmdldEFyZ3VtZW50cygpO1xuICAgIGNvbnN0IGluc3RhbGxBcmdzOiBzdHJpbmdbXSA9IFtwYWNrYWdlTWFuYWdlckFyZ3MuaW5zdGFsbCwgcGFja2FnZU5hbWVdO1xuXG4gICAgaWYgKHNhdmUgPT09ICdkZXZEZXBlbmRlbmNpZXMnKSB7XG4gICAgICBpbnN0YWxsQXJncy5wdXNoKHBhY2thZ2VNYW5hZ2VyQXJncy5zYXZlRGV2KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5ydW4oWy4uLmluc3RhbGxBcmdzLCAuLi5leHRyYUFyZ3NdLCB7IGN3ZCwgc2lsZW50OiB0cnVlIH0pO1xuICB9XG5cbiAgLyoqIEluc3RhbGwgYWxsIHBhY2thZ2VzLiAqL1xuICBhc3luYyBpbnN0YWxsQWxsKGV4dHJhQXJnczogc3RyaW5nW10gPSBbXSwgY3dkPzogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgcGFja2FnZU1hbmFnZXJBcmdzID0gdGhpcy5nZXRBcmd1bWVudHMoKTtcbiAgICBjb25zdCBpbnN0YWxsQXJnczogc3RyaW5nW10gPSBbXTtcbiAgICBpZiAocGFja2FnZU1hbmFnZXJBcmdzLmluc3RhbGxBbGwpIHtcbiAgICAgIGluc3RhbGxBcmdzLnB1c2gocGFja2FnZU1hbmFnZXJBcmdzLmluc3RhbGxBbGwpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ1bihbLi4uaW5zdGFsbEFyZ3MsIC4uLmV4dHJhQXJnc10sIHsgY3dkLCBzaWxlbnQ6IHRydWUgfSk7XG4gIH1cblxuICAvKiogSW5zdGFsbCBhIHNpbmdsZSBwYWNrYWdlIHRlbXBvcmFyeS4gKi9cbiAgYXN5bmMgaW5zdGFsbFRlbXAoXG4gICAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICBleHRyYUFyZ3M/OiBzdHJpbmdbXSxcbiAgKTogUHJvbWlzZTx7XG4gICAgc3VjY2VzczogYm9vbGVhbjtcbiAgICB0ZW1wTm9kZU1vZHVsZXM6IHN0cmluZztcbiAgfT4ge1xuICAgIGNvbnN0IHRlbXBQYXRoID0gYXdhaXQgZnMubWtkdGVtcChqb2luKHJlYWxwYXRoU3luYyh0bXBkaXIoKSksICdhbmd1bGFyLWNsaS1wYWNrYWdlcy0nKSk7XG5cbiAgICAvLyBjbGVhbiB1cCB0ZW1wIGRpcmVjdG9yeSBvbiBwcm9jZXNzIGV4aXRcbiAgICBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcm1kaXJTeW5jKHRlbXBQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgbWF4UmV0cmllczogMyB9KTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9KTtcblxuICAgIC8vIE5QTSB3aWxsIHdhcm4gd2hlbiBhIGBwYWNrYWdlLmpzb25gIGlzIG5vdCBmb3VuZCBpbiB0aGUgaW5zdGFsbCBkaXJlY3RvcnlcbiAgICAvLyBFeGFtcGxlOlxuICAgIC8vIG5wbSBXQVJOIGVub2VudCBFTk9FTlQ6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnksIG9wZW4gJy90bXAvLm5nLXRlbXAtcGFja2FnZXMtODRRaTd5L3BhY2thZ2UuanNvbidcbiAgICAvLyBucG0gV0FSTiAubmctdGVtcC1wYWNrYWdlcy04NFFpN3kgTm8gZGVzY3JpcHRpb25cbiAgICAvLyBucG0gV0FSTiAubmctdGVtcC1wYWNrYWdlcy04NFFpN3kgTm8gcmVwb3NpdG9yeSBmaWVsZC5cbiAgICAvLyBucG0gV0FSTiAubmctdGVtcC1wYWNrYWdlcy04NFFpN3kgTm8gbGljZW5zZSBmaWVsZC5cblxuICAgIC8vIFdoaWxlIHdlIGNhbiB1c2UgYG5wbSBpbml0IC15YCB3ZSB3aWxsIGVuZCB1cCBuZWVkaW5nIHRvIHVwZGF0ZSB0aGUgJ3BhY2thZ2UuanNvbicgYW55d2F5c1xuICAgIC8vIGJlY2F1c2Ugb2YgbWlzc2luZyBmaWVsZHMuXG4gICAgYXdhaXQgZnMud3JpdGVGaWxlKFxuICAgICAgam9pbih0ZW1wUGF0aCwgJ3BhY2thZ2UuanNvbicpLFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBuYW1lOiAndGVtcC1jbGktaW5zdGFsbCcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAndGVtcC1jbGktaW5zdGFsbCcsXG4gICAgICAgIHJlcG9zaXRvcnk6ICd0ZW1wLWNsaS1pbnN0YWxsJyxcbiAgICAgICAgbGljZW5zZTogJ01JVCcsXG4gICAgICB9KSxcbiAgICApO1xuXG4gICAgLy8gc2V0dXAgcHJlZml4L2dsb2JhbCBtb2R1bGVzIHBhdGhcbiAgICBjb25zdCBwYWNrYWdlTWFuYWdlckFyZ3MgPSB0aGlzLmdldEFyZ3VtZW50cygpO1xuICAgIGNvbnN0IHRlbXBOb2RlTW9kdWxlcyA9IGpvaW4odGVtcFBhdGgsICdub2RlX21vZHVsZXMnKTtcbiAgICAvLyBZYXJuIHdpbGwgbm90IGFwcGVuZCAnbm9kZV9tb2R1bGVzJyB0byB0aGUgcGF0aFxuICAgIGNvbnN0IHByZWZpeFBhdGggPSB0aGlzLm5hbWUgPT09IFBhY2thZ2VNYW5hZ2VyLllhcm4gPyB0ZW1wTm9kZU1vZHVsZXMgOiB0ZW1wUGF0aDtcbiAgICBjb25zdCBpbnN0YWxsQXJnczogc3RyaW5nW10gPSBbXG4gICAgICAuLi4oZXh0cmFBcmdzID8/IFtdKSxcbiAgICAgIGAke3BhY2thZ2VNYW5hZ2VyQXJncy5wcmVmaXh9PVwiJHtwcmVmaXhQYXRofVwiYCxcbiAgICAgIHBhY2thZ2VNYW5hZ2VyQXJncy5ub0xvY2tmaWxlLFxuICAgIF07XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogYXdhaXQgdGhpcy5pbnN0YWxsKHBhY2thZ2VOYW1lLCB0cnVlLCBpbnN0YWxsQXJncywgdGVtcFBhdGgpLFxuICAgICAgdGVtcE5vZGVNb2R1bGVzLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldEFyZ3VtZW50cygpOiBQYWNrYWdlTWFuYWdlck9wdGlvbnMge1xuICAgIHN3aXRjaCAodGhpcy5uYW1lKSB7XG4gICAgICBjYXNlIFBhY2thZ2VNYW5hZ2VyLllhcm46XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc2F2ZURldjogJy0tZGV2JyxcbiAgICAgICAgICBpbnN0YWxsOiAnYWRkJyxcbiAgICAgICAgICBwcmVmaXg6ICctLW1vZHVsZXMtZm9sZGVyJyxcbiAgICAgICAgICBub0xvY2tmaWxlOiAnLS1uby1sb2NrZmlsZScsXG4gICAgICAgIH07XG4gICAgICBjYXNlIFBhY2thZ2VNYW5hZ2VyLlBucG06XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc2F2ZURldjogJy0tc2F2ZS1kZXYnLFxuICAgICAgICAgIGluc3RhbGw6ICdhZGQnLFxuICAgICAgICAgIGluc3RhbGxBbGw6ICdpbnN0YWxsJyxcbiAgICAgICAgICBwcmVmaXg6ICctLXByZWZpeCcsXG4gICAgICAgICAgbm9Mb2NrZmlsZTogJy0tbm8tbG9ja2ZpbGUnLFxuICAgICAgICB9O1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzYXZlRGV2OiAnLS1zYXZlLWRldicsXG4gICAgICAgICAgaW5zdGFsbDogJ2luc3RhbGwnLFxuICAgICAgICAgIGluc3RhbGxBbGw6ICdpbnN0YWxsJyxcbiAgICAgICAgICBwcmVmaXg6ICctLXByZWZpeCcsXG4gICAgICAgICAgbm9Mb2NrZmlsZTogJy0tbm8tcGFja2FnZS1sb2NrJyxcbiAgICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJ1bihcbiAgICBhcmdzOiBzdHJpbmdbXSxcbiAgICBvcHRpb25zOiB7IGN3ZD86IHN0cmluZzsgc2lsZW50PzogYm9vbGVhbiB9ID0ge30sXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IHsgY3dkID0gcHJvY2Vzcy5jd2QoKSwgc2lsZW50ID0gZmFsc2UgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCBzcGlubmVyID0gbmV3IFNwaW5uZXIoKTtcbiAgICBzcGlubmVyLnN0YXJ0KCdJbnN0YWxsaW5nIHBhY2thZ2VzLi4uJyk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgIGNvbnN0IGJ1ZmZlcmVkT3V0cHV0OiB7IHN0cmVhbTogTm9kZUpTLldyaXRlU3RyZWFtOyBkYXRhOiBCdWZmZXIgfVtdID0gW107XG5cbiAgICAgIGNvbnN0IGNoaWxkUHJvY2VzcyA9IHNwYXduKHRoaXMubmFtZSwgYXJncywge1xuICAgICAgICAvLyBBbHdheXMgcGlwZSBzdGRlcnIgdG8gYWxsb3cgZm9yIGZhaWx1cmVzIHRvIGJlIHJlcG9ydGVkXG4gICAgICAgIHN0ZGlvOiBzaWxlbnQgPyBbJ2lnbm9yZScsICdpZ25vcmUnLCAncGlwZSddIDogJ3BpcGUnLFxuICAgICAgICBzaGVsbDogdHJ1ZSxcbiAgICAgICAgY3dkLFxuICAgICAgfSkub24oJ2Nsb3NlJywgKGNvZGU6IG51bWJlcikgPT4ge1xuICAgICAgICBpZiAoY29kZSA9PT0gMCkge1xuICAgICAgICAgIHNwaW5uZXIuc3VjY2VlZCgnUGFja2FnZXMgc3VjY2Vzc2Z1bGx5IGluc3RhbGxlZC4nKTtcbiAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNwaW5uZXIuc3RvcCgpO1xuICAgICAgICAgIGJ1ZmZlcmVkT3V0cHV0LmZvckVhY2goKHsgc3RyZWFtLCBkYXRhIH0pID0+IHN0cmVhbS53cml0ZShkYXRhKSk7XG4gICAgICAgICAgc3Bpbm5lci5mYWlsKCdQYWNrYWdlcyBpbnN0YWxsYXRpb24gZmFpbGVkLCBzZWUgYWJvdmUuJyk7XG4gICAgICAgICAgcmVzb2x2ZShmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBjaGlsZFByb2Nlc3Muc3Rkb3V0Py5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+XG4gICAgICAgIGJ1ZmZlcmVkT3V0cHV0LnB1c2goeyBzdHJlYW06IHByb2Nlc3Muc3Rkb3V0LCBkYXRhOiBkYXRhIH0pLFxuICAgICAgKTtcbiAgICAgIGNoaWxkUHJvY2Vzcy5zdGRlcnI/Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT5cbiAgICAgICAgYnVmZmVyZWRPdXRwdXQucHVzaCh7IHN0cmVhbTogcHJvY2Vzcy5zdGRlcnIsIGRhdGE6IGRhdGEgfSksXG4gICAgICApO1xuICAgIH0pO1xuICB9XG5cbiAgQG1lbW9pemVcbiAgcHJpdmF0ZSBnZXRWZXJzaW9uKG5hbWU6IFBhY2thZ2VNYW5hZ2VyKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGV4ZWNTeW5jKGAke25hbWV9IC0tdmVyc2lvbmAsIHtcbiAgICAgICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICAgICAgc3RkaW86IFsnaWdub3JlJywgJ3BpcGUnLCAnaWdub3JlJ10sXG4gICAgICAgIGVudjoge1xuICAgICAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgICAgIC8vICBOUE0gdXBkYXRlciBub3RpZmllciB3aWxsIHByZXZlbnRzIHRoZSBjaGlsZCBwcm9jZXNzIGZyb20gY2xvc2luZyB1bnRpbCBpdCB0aW1lb3V0IGFmdGVyIDMgbWludXRlcy5cbiAgICAgICAgICBOT19VUERBVEVfTk9USUZJRVI6ICcxJyxcbiAgICAgICAgICBOUE1fQ09ORklHX1VQREFURV9OT1RJRklFUjogJ2ZhbHNlJyxcbiAgICAgICAgfSxcbiAgICAgIH0pLnRyaW0oKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgQG1lbW9pemVcbiAgcHJpdmF0ZSBnZXROYW1lKCk6IFBhY2thZ2VNYW5hZ2VyIHtcbiAgICBjb25zdCBwYWNrYWdlTWFuYWdlciA9IHRoaXMuZ2V0Q29uZmlndXJlZFBhY2thZ2VNYW5hZ2VyKCk7XG4gICAgaWYgKHBhY2thZ2VNYW5hZ2VyKSB7XG4gICAgICByZXR1cm4gcGFja2FnZU1hbmFnZXI7XG4gICAgfVxuXG4gICAgY29uc3QgaGFzTnBtTG9jayA9IHRoaXMuaGFzTG9ja2ZpbGUoUGFja2FnZU1hbmFnZXIuTnBtKTtcbiAgICBjb25zdCBoYXNZYXJuTG9jayA9IHRoaXMuaGFzTG9ja2ZpbGUoUGFja2FnZU1hbmFnZXIuWWFybik7XG4gICAgY29uc3QgaGFzUG5wbUxvY2sgPSB0aGlzLmhhc0xvY2tmaWxlKFBhY2thZ2VNYW5hZ2VyLlBucG0pO1xuXG4gICAgLy8gUEVSRiBOT1RFOiBgdGhpcy5nZXRWZXJzaW9uYCBzcGF3bnMgdGhlIHBhY2thZ2UgYSB0aGUgY2hpbGRfcHJvY2VzcyB3aGljaCBjYW4gdGFrZSBhcm91bmQgfjMwMG1zIGF0IHRpbWVzLlxuICAgIC8vIFRoZXJlZm9yZSwgd2Ugc2hvdWxkIG9ubHkgY2FsbCB0aGlzIG1ldGhvZCB3aGVuIG5lZWRlZC4gSUU6IGRvbid0IGNhbGwgYHRoaXMuZ2V0VmVyc2lvbihQYWNrYWdlTWFuYWdlci5QbnBtKWAgdW5sZXNzIHRydWx5IG5lZWRlZC5cbiAgICAvLyBUaGUgcmVzdWx0IG9mIHRoaXMgbWV0aG9kIGlzIG5vdCBzdG9yZWQgaW4gYSB2YXJpYWJsZSBiZWNhdXNlIGl0J3MgbWVtb2l6ZWQuXG5cbiAgICBpZiAoaGFzTnBtTG9jaykge1xuICAgICAgLy8gSGFzIE5QTSBsb2NrIGZpbGUuXG4gICAgICBpZiAoIWhhc1lhcm5Mb2NrICYmICFoYXNQbnBtTG9jayAmJiB0aGlzLmdldFZlcnNpb24oUGFja2FnZU1hbmFnZXIuTnBtKSkge1xuICAgICAgICAvLyBPbmx5IE5QTSBsb2NrIGZpbGUgYW5kIE5QTSBiaW5hcnkgaXMgYXZhaWxhYmxlLlxuICAgICAgICByZXR1cm4gUGFja2FnZU1hbmFnZXIuTnBtO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBObyBOUE0gbG9jayBmaWxlLlxuICAgICAgaWYgKGhhc1lhcm5Mb2NrICYmIHRoaXMuZ2V0VmVyc2lvbihQYWNrYWdlTWFuYWdlci5ZYXJuKSkge1xuICAgICAgICAvLyBZYXJuIGxvY2sgZmlsZSBhbmQgWWFybiBiaW5hcnkgaXMgYXZhaWxhYmxlLlxuICAgICAgICByZXR1cm4gUGFja2FnZU1hbmFnZXIuWWFybjtcbiAgICAgIH0gZWxzZSBpZiAoaGFzUG5wbUxvY2sgJiYgdGhpcy5nZXRWZXJzaW9uKFBhY2thZ2VNYW5hZ2VyLlBucG0pKSB7XG4gICAgICAgIC8vIFBOUE0gbG9jayBmaWxlIGFuZCBQTlBNIGJpbmFyeSBpcyBhdmFpbGFibGUuXG4gICAgICAgIHJldHVybiBQYWNrYWdlTWFuYWdlci5QbnBtO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghdGhpcy5nZXRWZXJzaW9uKFBhY2thZ2VNYW5hZ2VyLk5wbSkpIHtcbiAgICAgIC8vIERvZXNuJ3QgaGF2ZSBOUE0gaW5zdGFsbGVkLlxuICAgICAgY29uc3QgaGFzWWFybiA9ICEhdGhpcy5nZXRWZXJzaW9uKFBhY2thZ2VNYW5hZ2VyLllhcm4pO1xuICAgICAgY29uc3QgaGFzUG5wbSA9ICEhdGhpcy5nZXRWZXJzaW9uKFBhY2thZ2VNYW5hZ2VyLlBucG0pO1xuXG4gICAgICBpZiAoaGFzWWFybiAmJiAhaGFzUG5wbSkge1xuICAgICAgICByZXR1cm4gUGFja2FnZU1hbmFnZXIuWWFybjtcbiAgICAgIH0gZWxzZSBpZiAoIWhhc1lhcm4gJiYgaGFzUG5wbSkge1xuICAgICAgICByZXR1cm4gUGFja2FnZU1hbmFnZXIuUG5wbTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUT0RPOiBUaGlzIHNob3VsZCBldmVudHVhbGx5IGluZm9ybSB0aGUgdXNlciBvZiBhbWJpZ3VvdXMgcGFja2FnZSBtYW5hZ2VyIHVzYWdlLlxuICAgIC8vICAgICAgIFBvdGVudGlhbGx5IHdpdGggYSBwcm9tcHQgdG8gY2hvb3NlIGFuZCBvcHRpb25hbGx5IHNldCBhcyB0aGUgZGVmYXVsdC5cbiAgICByZXR1cm4gUGFja2FnZU1hbmFnZXIuTnBtO1xuICB9XG5cbiAgcHJpdmF0ZSBoYXNMb2NrZmlsZShwYWNrYWdlTWFuYWdlcjogUGFja2FnZU1hbmFnZXIpOiBib29sZWFuIHtcbiAgICBsZXQgbG9ja2ZpbGVOYW1lOiBzdHJpbmc7XG4gICAgc3dpdGNoIChwYWNrYWdlTWFuYWdlcikge1xuICAgICAgY2FzZSBQYWNrYWdlTWFuYWdlci5ZYXJuOlxuICAgICAgICBsb2NrZmlsZU5hbWUgPSAneWFybi5sb2NrJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFBhY2thZ2VNYW5hZ2VyLlBucG06XG4gICAgICAgIGxvY2tmaWxlTmFtZSA9ICdwbnBtLWxvY2sueWFtbCc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBQYWNrYWdlTWFuYWdlci5OcG06XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsb2NrZmlsZU5hbWUgPSAncGFja2FnZS1sb2NrLmpzb24nO1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICByZXR1cm4gZXhpc3RzU3luYyhqb2luKHRoaXMuY29udGV4dC5yb290LCBsb2NrZmlsZU5hbWUpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q29uZmlndXJlZFBhY2thZ2VNYW5hZ2VyKCk6IFBhY2thZ2VNYW5hZ2VyIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBnZXRQYWNrYWdlTWFuYWdlciA9IChzb3VyY2U6IGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkKTogUGFja2FnZU1hbmFnZXIgfCB1bmRlZmluZWQgPT4ge1xuICAgICAgaWYgKHNvdXJjZSAmJiBpc0pzb25PYmplY3Qoc291cmNlKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHNvdXJjZVsncGFja2FnZU1hbmFnZXInXTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWUgYXMgUGFja2FnZU1hbmFnZXI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgbGV0IHJlc3VsdDogUGFja2FnZU1hbmFnZXIgfCB1bmRlZmluZWQ7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2U6IGxvY2FsV29ya3NwYWNlLCBnbG9iYWxDb25maWd1cmF0aW9uOiBnbG9iYWxXb3Jrc3BhY2UgfSA9IHRoaXMuY29udGV4dDtcbiAgICBpZiAobG9jYWxXb3Jrc3BhY2UpIHtcbiAgICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2QobG9jYWxXb3Jrc3BhY2UpO1xuICAgICAgaWYgKHByb2plY3QpIHtcbiAgICAgICAgcmVzdWx0ID0gZ2V0UGFja2FnZU1hbmFnZXIobG9jYWxXb3Jrc3BhY2UucHJvamVjdHMuZ2V0KHByb2plY3QpPy5leHRlbnNpb25zWydjbGknXSk7XG4gICAgICB9XG5cbiAgICAgIHJlc3VsdCA/Pz0gZ2V0UGFja2FnZU1hbmFnZXIobG9jYWxXb3Jrc3BhY2UuZXh0ZW5zaW9uc1snY2xpJ10pO1xuICAgIH1cblxuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICByZXN1bHQgPSBnZXRQYWNrYWdlTWFuYWdlcihnbG9iYWxXb3Jrc3BhY2U/LmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG4iXX0=