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
const workspace_schema_1 = require("../../lib/config/workspace-schema");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFsbC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9pbnN0YWxsLXBhY2thZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsaURBQWlEO0FBQ2pELDJCQUFtRztBQUNuRywyQkFBNEI7QUFDNUIsK0JBQXFDO0FBQ3JDLHdFQUFtRTtBQUVuRSx1Q0FBb0M7QUFXN0IsS0FBSyxVQUFVLGtCQUFrQixDQUN0QyxpQkFBaUMsaUNBQWMsQ0FBQyxHQUFHLEVBQ25ELFlBQXNCLEVBQUUsRUFDeEIsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUU7SUFFbkIsTUFBTSxrQkFBa0IsR0FBRywwQkFBMEIsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUV0RSxNQUFNLFdBQVcsR0FBYSxFQUFFLENBQUM7SUFDakMsSUFBSSxrQkFBa0IsQ0FBQyxVQUFVLEVBQUU7UUFDakMsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUNqRDtJQUNELFdBQVcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFNUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBTyxFQUFFLENBQUM7SUFDOUIsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBRXhDLE1BQU0sY0FBYyxHQUFtRCxFQUFFLENBQUM7SUFFMUUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTs7UUFDckMsTUFBTSxZQUFZLEdBQUcsSUFBQSxxQkFBSyxFQUFDLGNBQWMsRUFBRSxDQUFDLEdBQUcsV0FBVyxFQUFFLEdBQUcsU0FBUyxDQUFDLEVBQUU7WUFDekUsS0FBSyxFQUFFLE1BQU07WUFDYixLQUFLLEVBQUUsSUFBSTtZ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TExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBzcGF3biwgc3Bhd25TeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCBta2R0ZW1wU3luYywgcmVhZEZpbGVTeW5jLCByZWFscGF0aFN5bmMsIHJtZGlyU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IHRtcGRpciB9IGZyb20gJ29zJztcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7IE5nQWRkU2F2ZURlcGVuZGVuY3kgfSBmcm9tICcuL3BhY2thZ2UtbWV0YWRhdGEnO1xuaW1wb3J0IHsgU3Bpbm5lciB9IGZyb20gJy4vc3Bpbm5lcic7XG5cbmludGVyZmFjZSBQYWNrYWdlTWFuYWdlck9wdGlvbnMge1xuICBzaWxlbnQ6IHN0cmluZztcbiAgc2F2ZURldjogc3RyaW5nO1xuICBpbnN0YWxsOiBzdHJpbmc7XG4gIGluc3RhbGxBbGw/OiBzdHJpbmc7XG4gIHByZWZpeDogc3RyaW5nO1xuICBub0xvY2tmaWxlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YWxsQWxsUGFja2FnZXMoXG4gIHBhY2thZ2VNYW5hZ2VyOiBQYWNrYWdlTWFuYWdlciA9IFBhY2thZ2VNYW5hZ2VyLk5wbSxcbiAgZXh0cmFBcmdzOiBzdHJpbmdbXSA9IFtdLFxuICBjd2QgPSBwcm9jZXNzLmN3ZCgpLFxuKTogUHJvbWlzZTwxIHwgMD4ge1xuICBjb25zdCBwYWNrYWdlTWFuYWdlckFyZ3MgPSBnZXRQYWNrYWdlTWFuYWdlckFyZ3VtZW50cyhwYWNrYWdlTWFuYWdlcik7XG5cbiAgY29uc3QgaW5zdGFsbEFyZ3M6IHN0cmluZ1tdID0gW107XG4gIGlmIChwYWNrYWdlTWFuYWdlckFyZ3MuaW5zdGFsbEFsbCkge1xuICAgIGluc3RhbGxBcmdzLnB1c2gocGFja2FnZU1hbmFnZXJBcmdzLmluc3RhbGxBbGwpO1xuICB9XG4gIGluc3RhbGxBcmdzLnB1c2gocGFja2FnZU1hbmFnZXJBcmdzLnNpbGVudCk7XG5cbiAgY29uc3Qgc3Bpbm5lciA9IG5ldyBTcGlubmVyKCk7XG4gIHNwaW5uZXIuc3RhcnQoJ0luc3RhbGxpbmcgcGFja2FnZXMuLi4nKTtcblxuICBjb25zdCBidWZmZXJlZE91dHB1dDogeyBzdHJlYW06IE5vZGVKUy5Xcml0ZVN0cmVhbTsgZGF0YTogQnVmZmVyIH1bXSA9IFtdO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgY2hpbGRQcm9jZXNzID0gc3Bhd24ocGFja2FnZU1hbmFnZXIsIFsuLi5pbnN0YWxsQXJncywgLi4uZXh0cmFBcmdzXSwge1xuICAgICAgc3RkaW86ICdwaXBlJyxcbiAgICAgIHNoZWxsOiB0cnVlLFxuICAgICAgY3dkLFxuICAgIH0pLm9uKCdjbG9zZScsIChjb2RlOiBudW1iZXIpID0+IHtcbiAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgIHNwaW5uZXIuc3VjY2VlZCgnUGFja2FnZXMgc3VjY2Vzc2Z1bGx5IGluc3RhbGxlZC4nKTtcbiAgICAgICAgcmVzb2x2ZSgwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNwaW5uZXIuc3RvcCgpO1xuICAgICAgICBidWZmZXJlZE91dHB1dC5mb3JFYWNoKCh7IHN0cmVhbSwgZGF0YSB9KSA9PiBzdHJlYW0ud3JpdGUoZGF0YSkpO1xuICAgICAgICBzcGlubmVyLmZhaWwoJ1BhY2thZ2UgaW5zdGFsbCBmYWlsZWQsIHNlZSBhYm92ZS4nKTtcbiAgICAgICAgcmVqZWN0KDEpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY2hpbGRQcm9jZXNzLnN0ZG91dD8ub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PlxuICAgICAgYnVmZmVyZWRPdXRwdXQucHVzaCh7IHN0cmVhbTogcHJvY2Vzcy5zdGRvdXQsIGRhdGE6IGRhdGEgfSksXG4gICAgKTtcbiAgICBjaGlsZFByb2Nlc3Muc3RkZXJyPy5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+XG4gICAgICBidWZmZXJlZE91dHB1dC5wdXNoKHsgc3RyZWFtOiBwcm9jZXNzLnN0ZGVyciwgZGF0YTogZGF0YSB9KSxcbiAgICApO1xuICB9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbGxQYWNrYWdlKFxuICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICBwYWNrYWdlTWFuYWdlcjogUGFja2FnZU1hbmFnZXIgPSBQYWNrYWdlTWFuYWdlci5OcG0sXG4gIHNhdmU6IEV4Y2x1ZGU8TmdBZGRTYXZlRGVwZW5kZW5jeSwgZmFsc2U+ID0gdHJ1ZSxcbiAgZXh0cmFBcmdzOiBzdHJpbmdbXSA9IFtdLFxuICBjd2QgPSBwcm9jZXNzLmN3ZCgpLFxuKTogUHJvbWlzZTwxIHwgMD4ge1xuICBjb25zdCBwYWNrYWdlTWFuYWdlckFyZ3MgPSBnZXRQYWNrYWdlTWFuYWdlckFyZ3VtZW50cyhwYWNrYWdlTWFuYWdlcik7XG5cbiAgY29uc3QgaW5zdGFsbEFyZ3M6IHN0cmluZ1tdID0gW1xuICAgIHBhY2thZ2VNYW5hZ2VyQXJncy5pbnN0YWxsLFxuICAgIHBhY2thZ2VOYW1lLFxuICAgIHBhY2thZ2VNYW5hZ2VyQXJncy5zaWxlbnQsXG4gIF07XG5cbiAgY29uc3Qgc3Bpbm5lciA9IG5ldyBTcGlubmVyKCk7XG4gIHNwaW5uZXIuc3RhcnQoJ0luc3RhbGxpbmcgcGFja2FnZS4uLicpO1xuXG4gIGlmIChzYXZlID09PSAnZGV2RGVwZW5kZW5jaWVzJykge1xuICAgIGluc3RhbGxBcmdzLnB1c2gocGFja2FnZU1hbmFnZXJBcmdzLnNhdmVEZXYpO1xuICB9XG4gIGNvbnN0IGJ1ZmZlcmVkT3V0cHV0OiB7IHN0cmVhbTogTm9kZUpTLldyaXRlU3RyZWFtOyBkYXRhOiBCdWZmZXIgfVtdID0gW107XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCBjaGlsZFByb2Nlc3MgPSBzcGF3bihwYWNrYWdlTWFuYWdlciwgWy4uLmluc3RhbGxBcmdzLCAuLi5leHRyYUFyZ3NdLCB7XG4gICAgICBzdGRpbzogJ3BpcGUnLFxuICAgICAgc2hlbGw6IHRydWUsXG4gICAgICBjd2QsXG4gICAgfSkub24oJ2Nsb3NlJywgKGNvZGU6IG51bWJlcikgPT4ge1xuICAgICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgICAgc3Bpbm5lci5zdWNjZWVkKCdQYWNrYWdlIHN1Y2Nlc3NmdWxseSBpbnN0YWxsZWQuJyk7XG4gICAgICAgIHJlc29sdmUoMCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzcGlubmVyLnN0b3AoKTtcbiAgICAgICAgYnVmZmVyZWRPdXRwdXQuZm9yRWFjaCgoeyBzdHJlYW0sIGRhdGEgfSkgPT4gc3RyZWFtLndyaXRlKGRhdGEpKTtcbiAgICAgICAgc3Bpbm5lci5mYWlsKCdQYWNrYWdlIGluc3RhbGwgZmFpbGVkLCBzZWUgYWJvdmUuJyk7XG4gICAgICAgIHJlamVjdCgxKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNoaWxkUHJvY2Vzcy5zdGRvdXQ/Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT5cbiAgICAgIGJ1ZmZlcmVkT3V0cHV0LnB1c2goeyBzdHJlYW06IHByb2Nlc3Muc3Rkb3V0LCBkYXRhOiBkYXRhIH0pLFxuICAgICk7XG4gICAgY2hpbGRQcm9jZXNzLnN0ZGVycj8ub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PlxuICAgICAgYnVmZmVyZWRPdXRwdXQucHVzaCh7IHN0cmVhbTogcHJvY2Vzcy5zdGRlcnIsIGRhdGE6IGRhdGEgfSksXG4gICAgKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YWxsVGVtcFBhY2thZ2UoXG4gIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gIHBhY2thZ2VNYW5hZ2VyOiBQYWNrYWdlTWFuYWdlciA9IFBhY2thZ2VNYW5hZ2VyLk5wbSxcbiAgZXh0cmFBcmdzPzogc3RyaW5nW10sXG4pOiBQcm9taXNlPHtcbiAgc3RhdHVzOiAxIHwgMDtcbiAgdGVtcE5vZGVNb2R1bGVzOiBzdHJpbmc7XG59PiB7XG4gIGNvbnN0IHRlbXBQYXRoID0gbWtkdGVtcFN5bmMoam9pbihyZWFscGF0aFN5bmModG1wZGlyKCkpLCAnYW5ndWxhci1jbGktcGFja2FnZXMtJykpO1xuXG4gIC8vIGNsZWFuIHVwIHRlbXAgZGlyZWN0b3J5IG9uIHByb2Nlc3MgZXhpdFxuICBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBybWRpclN5bmModGVtcFBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlLCBtYXhSZXRyaWVzOiAzIH0pO1xuICAgIH0gY2F0Y2gge31cbiAgfSk7XG5cbiAgLy8gTlBNIHdpbGwgd2FybiB3aGVuIGEgYHBhY2thZ2UuanNvbmAgaXMgbm90IGZvdW5kIGluIHRoZSBpbnN0YWxsIGRpcmVjdG9yeVxuICAvLyBFeGFtcGxlOlxuICAvLyBucG0gV0FSTiBlbm9lbnQgRU5PRU5UOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5LCBvcGVuICcvdG1wLy5uZy10ZW1wLXBhY2thZ2VzLTg0UWk3eS9wYWNrYWdlLmpzb24nXG4gIC8vIG5wbSBXQVJOIC5uZy10ZW1wLXBhY2thZ2VzLTg0UWk3eSBObyBkZXNjcmlwdGlvblxuICAvLyBucG0gV0FSTiAubmctdGVtcC1wYWNrYWdlcy04NFFpN3kgTm8gcmVwb3NpdG9yeSBmaWVsZC5cbiAgLy8gbnBtIFdBUk4gLm5nLXRlbXAtcGFja2FnZXMtODRRaTd5IE5vIGxpY2Vuc2UgZmllbGQuXG5cbiAgLy8gV2hpbGUgd2UgY2FuIHVzZSBgbnBtIGluaXQgLXlgIHdlIHdpbGwgZW5kIHVwIG5lZWRpbmcgdG8gdXBkYXRlIHRoZSAncGFja2FnZS5qc29uJyBhbnl3YXlzXG4gIC8vIGJlY2F1c2Ugb2YgbWlzc2luZyBmaWVsZHMuXG4gIHdyaXRlRmlsZVN5bmMoXG4gICAgam9pbih0ZW1wUGF0aCwgJ3BhY2thZ2UuanNvbicpLFxuICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIG5hbWU6ICd0ZW1wLWNsaS1pbnN0YWxsJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAndGVtcC1jbGktaW5zdGFsbCcsXG4gICAgICByZXBvc2l0b3J5OiAndGVtcC1jbGktaW5zdGFsbCcsXG4gICAgICBsaWNlbnNlOiAnTUlUJyxcbiAgICB9KSxcbiAgKTtcblxuICAvLyBzZXR1cCBwcmVmaXgvZ2xvYmFsIG1vZHVsZXMgcGF0aFxuICBjb25zdCBwYWNrYWdlTWFuYWdlckFyZ3MgPSBnZXRQYWNrYWdlTWFuYWdlckFyZ3VtZW50cyhwYWNrYWdlTWFuYWdlcik7XG4gIGNvbnN0IHRlbXBOb2RlTW9kdWxlcyA9IGpvaW4odGVtcFBhdGgsICdub2RlX21vZHVsZXMnKTtcbiAgLy8gWWFybiB3aWxsIG5vdCBhcHBlbmQgJ25vZGVfbW9kdWxlcycgdG8gdGhlIHBhdGhcbiAgY29uc3QgcHJlZml4UGF0aCA9IHBhY2thZ2VNYW5hZ2VyID09PSBQYWNrYWdlTWFuYWdlci5ZYXJuID8gdGVtcE5vZGVNb2R1bGVzIDogdGVtcFBhdGg7XG4gIGNvbnN0IGluc3RhbGxBcmdzOiBzdHJpbmdbXSA9IFtcbiAgICAuLi4oZXh0cmFBcmdzIHx8IFtdKSxcbiAgICBgJHtwYWNrYWdlTWFuYWdlckFyZ3MucHJlZml4fT1cIiR7cHJlZml4UGF0aH1cImAsXG4gICAgcGFja2FnZU1hbmFnZXJBcmdzLm5vTG9ja2ZpbGUsXG4gIF07XG5cbiAgcmV0dXJuIHtcbiAgICBzdGF0dXM6IGF3YWl0IGluc3RhbGxQYWNrYWdlKHBhY2thZ2VOYW1lLCBwYWNrYWdlTWFuYWdlciwgdHJ1ZSwgaW5zdGFsbEFyZ3MsIHRlbXBQYXRoKSxcbiAgICB0ZW1wTm9kZU1vZHVsZXMsXG4gIH07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5UZW1wUGFja2FnZUJpbihcbiAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgcGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyID0gUGFja2FnZU1hbmFnZXIuTnBtLFxuICBhcmdzOiBzdHJpbmdbXSA9IFtdLFxuKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzdGF0dXM6IGNvZGUsIHRlbXBOb2RlTW9kdWxlcyB9ID0gYXdhaXQgaW5zdGFsbFRlbXBQYWNrYWdlKHBhY2thZ2VOYW1lLCBwYWNrYWdlTWFuYWdlcik7XG4gIGlmIChjb2RlICE9PSAwKSB7XG4gICAgcmV0dXJuIGNvZGU7XG4gIH1cblxuICAvLyBSZW1vdmUgdmVyc2lvbi90YWcgZXRjLi4uIGZyb20gcGFja2FnZSBuYW1lXG4gIC8vIEV4OiBAYW5ndWxhci9jbGlAbGF0ZXN0IC0+IEBhbmd1bGFyL2NsaVxuICBjb25zdCBwYWNrYWdlTmFtZU5vVmVyc2lvbiA9IHBhY2thZ2VOYW1lLnN1YnN0cmluZygwLCBwYWNrYWdlTmFtZS5sYXN0SW5kZXhPZignQCcpKTtcbiAgY29uc3QgcGtnTG9jYXRpb24gPSBqb2luKHRlbXBOb2RlTW9kdWxlcywgcGFja2FnZU5hbWVOb1ZlcnNpb24pO1xuICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBqb2luKHBrZ0xvY2F0aW9uLCAncGFja2FnZS5qc29uJyk7XG5cbiAgLy8gR2V0IGEgYmluYXJ5IGxvY2F0aW9uIGZvciB0aGlzIHBhY2thZ2VcbiAgbGV0IGJpblBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgaWYgKGV4aXN0c1N5bmMocGFja2FnZUpzb25QYXRoKSkge1xuICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMocGFja2FnZUpzb25QYXRoLCAndXRmLTgnKTtcbiAgICBpZiAoY29udGVudCkge1xuICAgICAgY29uc3QgeyBiaW4gPSB7fSB9ID0gSlNPTi5wYXJzZShjb250ZW50KTtcbiAgICAgIGNvbnN0IGJpbktleXMgPSBPYmplY3Qua2V5cyhiaW4pO1xuXG4gICAgICBpZiAoYmluS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgYmluUGF0aCA9IHJlc29sdmUocGtnTG9jYXRpb24sIGJpbltiaW5LZXlzWzBdXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKCFiaW5QYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgbG9jYXRlIGJpbiBmb3IgdGVtcG9yYXJ5IHBhY2thZ2U6ICR7cGFja2FnZU5hbWVOb1ZlcnNpb259LmApO1xuICB9XG5cbiAgY29uc3QgeyBzdGF0dXMsIGVycm9yIH0gPSBzcGF3blN5bmMocHJvY2Vzcy5leGVjUGF0aCwgW2JpblBhdGgsIC4uLmFyZ3NdLCB7XG4gICAgc3RkaW86ICdpbmhlcml0JyxcbiAgICBlbnY6IHtcbiAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgTkdfRElTQUJMRV9WRVJTSU9OX0NIRUNLOiAndHJ1ZScsXG4gICAgICBOR19DTElfQU5BTFlUSUNTOiAnZmFsc2UnLFxuICAgIH0sXG4gIH0pO1xuXG4gIGlmIChzdGF0dXMgPT09IG51bGwgJiYgZXJyb3IpIHtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIHJldHVybiBzdGF0dXMgfHwgMDtcbn1cblxuZnVuY3Rpb24gZ2V0UGFja2FnZU1hbmFnZXJBcmd1bWVudHMocGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyKTogUGFja2FnZU1hbmFnZXJPcHRpb25zIHtcbiAgc3dpdGNoIChwYWNrYWdlTWFuYWdlcikge1xuICAgIGNhc2UgUGFja2FnZU1hbmFnZXIuWWFybjpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNpbGVudDogJy0tc2lsZW50JyxcbiAgICAgICAgc2F2ZURldjogJy0tZGV2JyxcbiAgICAgICAgaW5zdGFsbDogJ2FkZCcsXG4gICAgICAgIHByZWZpeDogJy0tbW9kdWxlcy1mb2xkZXInLFxuICAgICAgICBub0xvY2tmaWxlOiAnLS1uby1sb2NrZmlsZScsXG4gICAgICB9O1xuICAgIGNhc2UgUGFja2FnZU1hbmFnZXIuUG5wbTpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNpbGVudDogJy0tc2lsZW50JyxcbiAgICAgICAgc2F2ZURldjogJy0tc2F2ZS1kZXYnLFxuICAgICAgICBpbnN0YWxsOiAnYWRkJyxcbiAgICAgICAgaW5zdGFsbEFsbDogJ2luc3RhbGwnLFxuICAgICAgICBwcmVmaXg6ICctLXByZWZpeCcsXG4gICAgICAgIG5vTG9ja2ZpbGU6ICctLW5vLWxvY2tmaWxlJyxcbiAgICAgIH07XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNpbGVudDogJy0tcXVpZXQnLFxuICAgICAgICBzYXZlRGV2OiAnLS1zYXZlLWRldicsXG4gICAgICAgIGluc3RhbGw6ICdpbnN0YWxsJyxcbiAgICAgICAgaW5zdGFsbEFsbDogJ2luc3RhbGwnLFxuICAgICAgICBwcmVmaXg6ICctLXByZWZpeCcsXG4gICAgICAgIG5vTG9ja2ZpbGU6ICctLW5vLXBhY2thZ2UtbG9jaycsXG4gICAgICB9O1xuICB9XG59XG4iXX0=