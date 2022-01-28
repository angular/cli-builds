"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTempPackageBin = exports.installTempPackage = exports.installPackage = exports.installAllPackages = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const workspace_schema_1 = require("../lib/config/workspace-schema");
const spinner_1 = require("./spinner");
async function installAllPackages(packageManager = workspace_schema_1.PackageManager.Npm, extraArgs = [], cwd = process.cwd()) {
    const packageManagerArgs = getPackageManagerArguments(packageManager);
    const installArgs = [];
    if (packageManagerArgs.installAll) {
        installArgs.push(packageManagerArgs.installAll);
    }
    installArgs.push(packageManagerArgs.silent);
    const spinner = new spinner_1.Spinner();
    spinner.start('Installing packages...');
    const bufferedOutput = [];
    return new Promise((resolve, reject) => {
        var _a, _b;
        const childProcess = (0, child_process_1.spawn)(packageManager, [...installArgs, ...extraArgs], {
            stdio: 'pipe',
            shell: true,
            cwd,
        }).on('close', (code) => {
            if (code === 0) {
                spinner.succeed('Packages successfully installed.');
                resolve(0);
            }
            else {
                spinner.stop();
                bufferedOutput.forEach(({ stream, data }) => stream.write(data));
                spinner.fail('Package install failed, see above.');
                reject(1);
            }
        });
        (_a = childProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => bufferedOutput.push({ stream: process.stdout, data: data }));
        (_b = childProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (data) => bufferedOutput.push({ stream: process.stderr, data: data }));
    });
}
exports.installAllPackages = installAllPackages;
async function installPackage(packageName, packageManager = workspace_schema_1.PackageManager.Npm, save = true, extraArgs = [], cwd = process.cwd()) {
    const packageManagerArgs = getPackageManagerArguments(packageManager);
    const installArgs = [
        packageManagerArgs.install,
        packageName,
        packageManagerArgs.silent,
    ];
    const spinner = new spinner_1.Spinner();
    spinner.start('Installing package...');
    if (save === 'devDependencies') {
        installArgs.push(packageManagerArgs.saveDev);
    }
    const bufferedOutput = [];
    return new Promise((resolve, reject) => {
        var _a, _b;
        const childProcess = (0, child_process_1.spawn)(packageManager, [...installArgs, ...extraArgs], {
            stdio: 'pipe',
            shell: true,
            cwd,
        }).on('close', (code) => {
            if (code === 0) {
                spinner.succeed('Package successfully installed.');
                resolve(0);
            }
            else {
                spinner.stop();
                bufferedOutput.forEach(({ stream, data }) => stream.write(data));
                spinner.fail('Package install failed, see above.');
                reject(1);
            }
        });
        (_a = childProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => bufferedOutput.push({ stream: process.stdout, data: data }));
        (_b = childProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (data) => bufferedOutput.push({ stream: process.stderr, data: data }));
    });
}
exports.installPackage = installPackage;
async function installTempPackage(packageName, packageManager = workspace_schema_1.PackageManager.Npm, extraArgs) {
    const tempPath = (0, fs_1.mkdtempSync)((0, path_1.join)((0, fs_1.realpathSync)((0, os_1.tmpdir)()), 'angular-cli-packages-'));
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
    (0, fs_1.writeFileSync)((0, path_1.join)(tempPath, 'package.json'), JSON.stringify({
        name: 'temp-cli-install',
        description: 'temp-cli-install',
        repository: 'temp-cli-install',
        license: 'MIT',
    }));
    // setup prefix/global modules path
    const packageManagerArgs = getPackageManagerArguments(packageManager);
    const tempNodeModules = (0, path_1.join)(tempPath, 'node_modules');
    // Yarn will not append 'node_modules' to the path
    const prefixPath = packageManager === workspace_schema_1.PackageManager.Yarn ? tempNodeModules : tempPath;
    const installArgs = [
        ...(extraArgs || []),
        `${packageManagerArgs.prefix}="${prefixPath}"`,
        packageManagerArgs.noLockfile,
    ];
    return {
        status: await installPackage(packageName, packageManager, true, installArgs, tempPath),
        tempNodeModules,
    };
}
exports.installTempPackage = installTempPackage;
async function runTempPackageBin(packageName, packageManager = workspace_schema_1.PackageManager.Npm, args = []) {
    const { status: code, tempNodeModules } = await installTempPackage(packageName, packageManager);
    if (code !== 0) {
        return code;
    }
    // Remove version/tag etc... from package name
    // Ex: @angular/cli@latest -> @angular/cli
    const packageNameNoVersion = packageName.substring(0, packageName.lastIndexOf('@'));
    const pkgLocation = (0, path_1.join)(tempNodeModules, packageNameNoVersion);
    const packageJsonPath = (0, path_1.join)(pkgLocation, 'package.json');
    // Get a binary location for this package
    let binPath;
    if ((0, fs_1.existsSync)(packageJsonPath)) {
        const content = (0, fs_1.readFileSync)(packageJsonPath, 'utf-8');
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
    return status || 0;
}
exports.runTempPackageBin = runTempPackageBin;
function getPackageManagerArguments(packageManager) {
    switch (packageManager) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFsbC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvdXRpbGl0aWVzL2luc3RhbGwtcGFja2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCxpREFBaUQ7QUFDakQsMkJBQW1HO0FBQ25HLDJCQUE0QjtBQUM1QiwrQkFBcUM7QUFDckMscUVBQWdFO0FBRWhFLHVDQUFvQztBQVc3QixLQUFLLFVBQVUsa0JBQWtCLENBQ3RDLGlCQUFpQyxpQ0FBYyxDQUFDLEdBQUcsRUFDbkQsWUFBc0IsRUFBRSxFQUN4QixHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRTtJQUVuQixNQUFNLGtCQUFrQixHQUFHLDBCQUEwQixDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBRXRFLE1BQU0sV0FBVyxHQUFhLEVBQUUsQ0FBQztJQUNqQyxJQUFJLGtCQUFrQixDQUFDLFVBQVUsRUFBRTtRQUNqQyxXQUFXLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0tBQ2pEO0lBQ0QsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUU1QyxNQUFNLE9BQU8sR0FBRyxJQUFJLGlCQUFPLEVBQUUsQ0FBQztJQUM5QixPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFFeEMsTUFBTSxjQUFjLEdBQW1ELEVBQUUsQ0FBQztJQUUxRSxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFOztRQUNyQyxNQUFNLFlBQVksR0FBRyxJQUFBLHFCQUFLLEVBQUMsY0FBYyxFQUFFLENBQUMsR0FBRyxXQUFXLEVBQUUsR0FBRyxTQUFTLENBQUMsRUFBRTtZQUN6RSxLQUFLLEVBQUUsTUFBTTtZQUNiLEtBQUssRUFBRSxJQUFJO1lBQ1gsR0FB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IFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IHNwYXduLCBzcGF3blN5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIG1rZHRlbXBTeW5jLCByZWFkRmlsZVN5bmMsIHJlYWxwYXRoU3luYywgcm1kaXJTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgdG1wZGlyIH0gZnJvbSAnb3MnO1xuaW1wb3J0IHsgam9pbiwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi9saWIvY29uZmlnL3dvcmtzcGFjZS1zY2hlbWEnO1xuaW1wb3J0IHsgTmdBZGRTYXZlRGVwZWRlbmN5IH0gZnJvbSAnLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWV0YWRhdGEnO1xuaW1wb3J0IHsgU3Bpbm5lciB9IGZyb20gJy4vc3Bpbm5lcic7XG5cbmludGVyZmFjZSBQYWNrYWdlTWFuYWdlck9wdGlvbnMge1xuICBzaWxlbnQ6IHN0cmluZztcbiAgc2F2ZURldjogc3RyaW5nO1xuICBpbnN0YWxsOiBzdHJpbmc7XG4gIGluc3RhbGxBbGw/OiBzdHJpbmc7XG4gIHByZWZpeDogc3RyaW5nO1xuICBub0xvY2tmaWxlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YWxsQWxsUGFja2FnZXMoXG4gIHBhY2thZ2VNYW5hZ2VyOiBQYWNrYWdlTWFuYWdlciA9IFBhY2thZ2VNYW5hZ2VyLk5wbSxcbiAgZXh0cmFBcmdzOiBzdHJpbmdbXSA9IFtdLFxuICBjd2QgPSBwcm9jZXNzLmN3ZCgpLFxuKTogUHJvbWlzZTwxIHwgMD4ge1xuICBjb25zdCBwYWNrYWdlTWFuYWdlckFyZ3MgPSBnZXRQYWNrYWdlTWFuYWdlckFyZ3VtZW50cyhwYWNrYWdlTWFuYWdlcik7XG5cbiAgY29uc3QgaW5zdGFsbEFyZ3M6IHN0cmluZ1tdID0gW107XG4gIGlmIChwYWNrYWdlTWFuYWdlckFyZ3MuaW5zdGFsbEFsbCkge1xuICAgIGluc3RhbGxBcmdzLnB1c2gocGFja2FnZU1hbmFnZXJBcmdzLmluc3RhbGxBbGwpO1xuICB9XG4gIGluc3RhbGxBcmdzLnB1c2gocGFja2FnZU1hbmFnZXJBcmdzLnNpbGVudCk7XG5cbiAgY29uc3Qgc3Bpbm5lciA9IG5ldyBTcGlubmVyKCk7XG4gIHNwaW5uZXIuc3RhcnQoJ0luc3RhbGxpbmcgcGFja2FnZXMuLi4nKTtcblxuICBjb25zdCBidWZmZXJlZE91dHB1dDogeyBzdHJlYW06IE5vZGVKUy5Xcml0ZVN0cmVhbTsgZGF0YTogQnVmZmVyIH1bXSA9IFtdO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgY2hpbGRQcm9jZXNzID0gc3Bhd24ocGFja2FnZU1hbmFnZXIsIFsuLi5pbnN0YWxsQXJncywgLi4uZXh0cmFBcmdzXSwge1xuICAgICAgc3RkaW86ICdwaXBlJyxcbiAgICAgIHNoZWxsOiB0cnVlLFxuICAgICAgY3dkLFxuICAgIH0pLm9uKCdjbG9zZScsIChjb2RlOiBudW1iZXIpID0+IHtcbiAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgIHNwaW5uZXIuc3VjY2VlZCgnUGFja2FnZXMgc3VjY2Vzc2Z1bGx5IGluc3RhbGxlZC4nKTtcbiAgICAgICAgcmVzb2x2ZSgwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNwaW5uZXIuc3RvcCgpO1xuICAgICAgICBidWZmZXJlZE91dHB1dC5mb3JFYWNoKCh7IHN0cmVhbSwgZGF0YSB9KSA9PiBzdHJlYW0ud3JpdGUoZGF0YSkpO1xuICAgICAgICBzcGlubmVyLmZhaWwoJ1BhY2thZ2UgaW5zdGFsbCBmYWlsZWQsIHNlZSBhYm92ZS4nKTtcbiAgICAgICAgcmVqZWN0KDEpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY2hpbGRQcm9jZXNzLnN0ZG91dD8ub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PlxuICAgICAgYnVmZmVyZWRPdXRwdXQucHVzaCh7IHN0cmVhbTogcHJvY2Vzcy5zdGRvdXQsIGRhdGE6IGRhdGEgfSksXG4gICAgKTtcbiAgICBjaGlsZFByb2Nlc3Muc3RkZXJyPy5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+XG4gICAgICBidWZmZXJlZE91dHB1dC5wdXNoKHsgc3RyZWFtOiBwcm9jZXNzLnN0ZGVyciwgZGF0YTogZGF0YSB9KSxcbiAgICApO1xuICB9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbGxQYWNrYWdlKFxuICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICBwYWNrYWdlTWFuYWdlcjogUGFja2FnZU1hbmFnZXIgPSBQYWNrYWdlTWFuYWdlci5OcG0sXG4gIHNhdmU6IEV4Y2x1ZGU8TmdBZGRTYXZlRGVwZWRlbmN5LCBmYWxzZT4gPSB0cnVlLFxuICBleHRyYUFyZ3M6IHN0cmluZ1tdID0gW10sXG4gIGN3ZCA9IHByb2Nlc3MuY3dkKCksXG4pOiBQcm9taXNlPDEgfCAwPiB7XG4gIGNvbnN0IHBhY2thZ2VNYW5hZ2VyQXJncyA9IGdldFBhY2thZ2VNYW5hZ2VyQXJndW1lbnRzKHBhY2thZ2VNYW5hZ2VyKTtcblxuICBjb25zdCBpbnN0YWxsQXJnczogc3RyaW5nW10gPSBbXG4gICAgcGFja2FnZU1hbmFnZXJBcmdzLmluc3RhbGwsXG4gICAgcGFja2FnZU5hbWUsXG4gICAgcGFja2FnZU1hbmFnZXJBcmdzLnNpbGVudCxcbiAgXTtcblxuICBjb25zdCBzcGlubmVyID0gbmV3IFNwaW5uZXIoKTtcbiAgc3Bpbm5lci5zdGFydCgnSW5zdGFsbGluZyBwYWNrYWdlLi4uJyk7XG5cbiAgaWYgKHNhdmUgPT09ICdkZXZEZXBlbmRlbmNpZXMnKSB7XG4gICAgaW5zdGFsbEFyZ3MucHVzaChwYWNrYWdlTWFuYWdlckFyZ3Muc2F2ZURldik7XG4gIH1cbiAgY29uc3QgYnVmZmVyZWRPdXRwdXQ6IHsgc3RyZWFtOiBOb2RlSlMuV3JpdGVTdHJlYW07IGRhdGE6IEJ1ZmZlciB9W10gPSBbXTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGNoaWxkUHJvY2VzcyA9IHNwYXduKHBhY2thZ2VNYW5hZ2VyLCBbLi4uaW5zdGFsbEFyZ3MsIC4uLmV4dHJhQXJnc10sIHtcbiAgICAgIHN0ZGlvOiAncGlwZScsXG4gICAgICBzaGVsbDogdHJ1ZSxcbiAgICAgIGN3ZCxcbiAgICB9KS5vbignY2xvc2UnLCAoY29kZTogbnVtYmVyKSA9PiB7XG4gICAgICBpZiAoY29kZSA9PT0gMCkge1xuICAgICAgICBzcGlubmVyLnN1Y2NlZWQoJ1BhY2thZ2Ugc3VjY2Vzc2Z1bGx5IGluc3RhbGxlZC4nKTtcbiAgICAgICAgcmVzb2x2ZSgwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNwaW5uZXIuc3RvcCgpO1xuICAgICAgICBidWZmZXJlZE91dHB1dC5mb3JFYWNoKCh7IHN0cmVhbSwgZGF0YSB9KSA9PiBzdHJlYW0ud3JpdGUoZGF0YSkpO1xuICAgICAgICBzcGlubmVyLmZhaWwoJ1BhY2thZ2UgaW5zdGFsbCBmYWlsZWQsIHNlZSBhYm92ZS4nKTtcbiAgICAgICAgcmVqZWN0KDEpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY2hpbGRQcm9jZXNzLnN0ZG91dD8ub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PlxuICAgICAgYnVmZmVyZWRPdXRwdXQucHVzaCh7IHN0cmVhbTogcHJvY2Vzcy5zdGRvdXQsIGRhdGE6IGRhdGEgfSksXG4gICAgKTtcbiAgICBjaGlsZFByb2Nlc3Muc3RkZXJyPy5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+XG4gICAgICBidWZmZXJlZE91dHB1dC5wdXNoKHsgc3RyZWFtOiBwcm9jZXNzLnN0ZGVyciwgZGF0YTogZGF0YSB9KSxcbiAgICApO1xuICB9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbGxUZW1wUGFja2FnZShcbiAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgcGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyID0gUGFja2FnZU1hbmFnZXIuTnBtLFxuICBleHRyYUFyZ3M/OiBzdHJpbmdbXSxcbik6IFByb21pc2U8e1xuICBzdGF0dXM6IDEgfCAwO1xuICB0ZW1wTm9kZU1vZHVsZXM6IHN0cmluZztcbn0+IHtcbiAgY29uc3QgdGVtcFBhdGggPSBta2R0ZW1wU3luYyhqb2luKHJlYWxwYXRoU3luYyh0bXBkaXIoKSksICdhbmd1bGFyLWNsaS1wYWNrYWdlcy0nKSk7XG5cbiAgLy8gY2xlYW4gdXAgdGVtcCBkaXJlY3Rvcnkgb24gcHJvY2VzcyBleGl0XG4gIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIHJtZGlyU3luYyh0ZW1wUGF0aCwgeyByZWN1cnNpdmU6IHRydWUsIG1heFJldHJpZXM6IDMgfSk7XG4gICAgfSBjYXRjaCB7fVxuICB9KTtcblxuICAvLyBOUE0gd2lsbCB3YXJuIHdoZW4gYSBgcGFja2FnZS5qc29uYCBpcyBub3QgZm91bmQgaW4gdGhlIGluc3RhbGwgZGlyZWN0b3J5XG4gIC8vIEV4YW1wbGU6XG4gIC8vIG5wbSBXQVJOIGVub2VudCBFTk9FTlQ6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnksIG9wZW4gJy90bXAvLm5nLXRlbXAtcGFja2FnZXMtODRRaTd5L3BhY2thZ2UuanNvbidcbiAgLy8gbnBtIFdBUk4gLm5nLXRlbXAtcGFja2FnZXMtODRRaTd5IE5vIGRlc2NyaXB0aW9uXG4gIC8vIG5wbSBXQVJOIC5uZy10ZW1wLXBhY2thZ2VzLTg0UWk3eSBObyByZXBvc2l0b3J5IGZpZWxkLlxuICAvLyBucG0gV0FSTiAubmctdGVtcC1wYWNrYWdlcy04NFFpN3kgTm8gbGljZW5zZSBmaWVsZC5cblxuICAvLyBXaGlsZSB3ZSBjYW4gdXNlIGBucG0gaW5pdCAteWAgd2Ugd2lsbCBlbmQgdXAgbmVlZGluZyB0byB1cGRhdGUgdGhlICdwYWNrYWdlLmpzb24nIGFueXdheXNcbiAgLy8gYmVjYXVzZSBvZiBtaXNzaW5nIGZpZWxkcy5cbiAgd3JpdGVGaWxlU3luYyhcbiAgICBqb2luKHRlbXBQYXRoLCAncGFja2FnZS5qc29uJyksXG4gICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgbmFtZTogJ3RlbXAtY2xpLWluc3RhbGwnLFxuICAgICAgZGVzY3JpcHRpb246ICd0ZW1wLWNsaS1pbnN0YWxsJyxcbiAgICAgIHJlcG9zaXRvcnk6ICd0ZW1wLWNsaS1pbnN0YWxsJyxcbiAgICAgIGxpY2Vuc2U6ICdNSVQnLFxuICAgIH0pLFxuICApO1xuXG4gIC8vIHNldHVwIHByZWZpeC9nbG9iYWwgbW9kdWxlcyBwYXRoXG4gIGNvbnN0IHBhY2thZ2VNYW5hZ2VyQXJncyA9IGdldFBhY2thZ2VNYW5hZ2VyQXJndW1lbnRzKHBhY2thZ2VNYW5hZ2VyKTtcbiAgY29uc3QgdGVtcE5vZGVNb2R1bGVzID0gam9pbih0ZW1wUGF0aCwgJ25vZGVfbW9kdWxlcycpO1xuICAvLyBZYXJuIHdpbGwgbm90IGFwcGVuZCAnbm9kZV9tb2R1bGVzJyB0byB0aGUgcGF0aFxuICBjb25zdCBwcmVmaXhQYXRoID0gcGFja2FnZU1hbmFnZXIgPT09IFBhY2thZ2VNYW5hZ2VyLllhcm4gPyB0ZW1wTm9kZU1vZHVsZXMgOiB0ZW1wUGF0aDtcbiAgY29uc3QgaW5zdGFsbEFyZ3M6IHN0cmluZ1tdID0gW1xuICAgIC4uLihleHRyYUFyZ3MgfHwgW10pLFxuICAgIGAke3BhY2thZ2VNYW5hZ2VyQXJncy5wcmVmaXh9PVwiJHtwcmVmaXhQYXRofVwiYCxcbiAgICBwYWNrYWdlTWFuYWdlckFyZ3Mubm9Mb2NrZmlsZSxcbiAgXTtcblxuICByZXR1cm4ge1xuICAgIHN0YXR1czogYXdhaXQgaW5zdGFsbFBhY2thZ2UocGFja2FnZU5hbWUsIHBhY2thZ2VNYW5hZ2VyLCB0cnVlLCBpbnN0YWxsQXJncywgdGVtcFBhdGgpLFxuICAgIHRlbXBOb2RlTW9kdWxlcyxcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1blRlbXBQYWNrYWdlQmluKFxuICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICBwYWNrYWdlTWFuYWdlcjogUGFja2FnZU1hbmFnZXIgPSBQYWNrYWdlTWFuYWdlci5OcG0sXG4gIGFyZ3M6IHN0cmluZ1tdID0gW10sXG4pOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCB7IHN0YXR1czogY29kZSwgdGVtcE5vZGVNb2R1bGVzIH0gPSBhd2FpdCBpbnN0YWxsVGVtcFBhY2thZ2UocGFja2FnZU5hbWUsIHBhY2thZ2VNYW5hZ2VyKTtcbiAgaWYgKGNvZGUgIT09IDApIHtcbiAgICByZXR1cm4gY29kZTtcbiAgfVxuXG4gIC8vIFJlbW92ZSB2ZXJzaW9uL3RhZyBldGMuLi4gZnJvbSBwYWNrYWdlIG5hbWVcbiAgLy8gRXg6IEBhbmd1bGFyL2NsaUBsYXRlc3QgLT4gQGFuZ3VsYXIvY2xpXG4gIGNvbnN0IHBhY2thZ2VOYW1lTm9WZXJzaW9uID0gcGFja2FnZU5hbWUuc3Vic3RyaW5nKDAsIHBhY2thZ2VOYW1lLmxhc3RJbmRleE9mKCdAJykpO1xuICBjb25zdCBwa2dMb2NhdGlvbiA9IGpvaW4odGVtcE5vZGVNb2R1bGVzLCBwYWNrYWdlTmFtZU5vVmVyc2lvbik7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IGpvaW4ocGtnTG9jYXRpb24sICdwYWNrYWdlLmpzb24nKTtcblxuICAvLyBHZXQgYSBiaW5hcnkgbG9jYXRpb24gZm9yIHRoaXMgcGFja2FnZVxuICBsZXQgYmluUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBpZiAoZXhpc3RzU3luYyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhwYWNrYWdlSnNvblBhdGgsICd1dGYtOCcpO1xuICAgIGlmIChjb250ZW50KSB7XG4gICAgICBjb25zdCB7IGJpbiA9IHt9IH0gPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgY29uc3QgYmluS2V5cyA9IE9iamVjdC5rZXlzKGJpbik7XG5cbiAgICAgIGlmIChiaW5LZXlzLmxlbmd0aCkge1xuICAgICAgICBiaW5QYXRoID0gcmVzb2x2ZShwa2dMb2NhdGlvbiwgYmluW2JpbktleXNbMF1dKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoIWJpblBhdGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBsb2NhdGUgYmluIGZvciB0ZW1wb3JhcnkgcGFja2FnZTogJHtwYWNrYWdlTmFtZU5vVmVyc2lvbn0uYCk7XG4gIH1cblxuICBjb25zdCB7IHN0YXR1cywgZXJyb3IgfSA9IHNwYXduU3luYyhwcm9jZXNzLmV4ZWNQYXRoLCBbYmluUGF0aCwgLi4uYXJnc10sIHtcbiAgICBzdGRpbzogJ2luaGVyaXQnLFxuICAgIGVudjoge1xuICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICBOR19ESVNBQkxFX1ZFUlNJT05fQ0hFQ0s6ICd0cnVlJyxcbiAgICAgIE5HX0NMSV9BTkFMWVRJQ1M6ICdmYWxzZScsXG4gICAgfSxcbiAgfSk7XG5cbiAgaWYgKHN0YXR1cyA9PT0gbnVsbCAmJiBlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgcmV0dXJuIHN0YXR1cyB8fCAwO1xufVxuXG5mdW5jdGlvbiBnZXRQYWNrYWdlTWFuYWdlckFyZ3VtZW50cyhwYWNrYWdlTWFuYWdlcjogUGFja2FnZU1hbmFnZXIpOiBQYWNrYWdlTWFuYWdlck9wdGlvbnMge1xuICBzd2l0Y2ggKHBhY2thZ2VNYW5hZ2VyKSB7XG4gICAgY2FzZSBQYWNrYWdlTWFuYWdlci5ZYXJuOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2lsZW50OiAnLS1zaWxlbnQnLFxuICAgICAgICBzYXZlRGV2OiAnLS1kZXYnLFxuICAgICAgICBpbnN0YWxsOiAnYWRkJyxcbiAgICAgICAgcHJlZml4OiAnLS1tb2R1bGVzLWZvbGRlcicsXG4gICAgICAgIG5vTG9ja2ZpbGU6ICctLW5vLWxvY2tmaWxlJyxcbiAgICAgIH07XG4gICAgY2FzZSBQYWNrYWdlTWFuYWdlci5QbnBtOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2lsZW50OiAnLS1zaWxlbnQnLFxuICAgICAgICBzYXZlRGV2OiAnLS1zYXZlLWRldicsXG4gICAgICAgIGluc3RhbGw6ICdhZGQnLFxuICAgICAgICBpbnN0YWxsQWxsOiAnaW5zdGFsbCcsXG4gICAgICAgIHByZWZpeDogJy0tcHJlZml4JyxcbiAgICAgICAgbm9Mb2NrZmlsZTogJy0tbm8tbG9ja2ZpbGUnLFxuICAgICAgfTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2lsZW50OiAnLS1xdWlldCcsXG4gICAgICAgIHNhdmVEZXY6ICctLXNhdmUtZGV2JyxcbiAgICAgICAgaW5zdGFsbDogJ2luc3RhbGwnLFxuICAgICAgICBpbnN0YWxsQWxsOiAnaW5zdGFsbCcsXG4gICAgICAgIHByZWZpeDogJy0tcHJlZml4JyxcbiAgICAgICAgbm9Mb2NrZmlsZTogJy0tbm8tcGFja2FnZS1sb2NrJyxcbiAgICAgIH07XG4gIH1cbn1cbiJdfQ==