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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFsbC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9pbnN0YWxsLXBhY2thZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsaURBQWlEO0FBQ2pELDJCQUFtRztBQUNuRywyQkFBNEI7QUFDNUIsK0JBQXFDO0FBQ3JDLHdFQUFtRTtBQUVuRSx1Q0FBb0M7QUFXN0IsS0FBSyxVQUFVLGtCQUFrQixDQUN0QyxpQkFBaUMsaUNBQWMsQ0FBQyxHQUFHLEVBQ25ELFlBQXNCLEVBQUUsRUFDeEIsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUU7SUFFbkIsTUFBTSxrQkFBa0IsR0FBRywwQkFBMEIsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUV0RSxNQUFNLFdBQVcsR0FBYSxFQUFFLENBQUM7SUFDakMsSUFBSSxrQkFBa0IsQ0FBQyxVQUFVLEVBQUU7UUFDakMsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUNqRDtJQUNELFdBQVcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFNUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBTyxFQUFFLENBQUM7SUFDOUIsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBRXhDLE1BQU0sY0FBYyxHQUFtRCxFQUFFLENBQUM7SUFFMUUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTs7UUFDckMsTUFBTSxZQUFZLEdBQUcsSUFBQSxxQkFBSyxFQUFDLGNBQWMsRUFBRSxDQUFDLEdBQUcsV0FBVyxFQUFFLEdBQUcsU0FBUyxDQUFDLEVBQUU7WUFDekUsS0FBSyxFQUFFLE1BQU07WUFDYixLQUFLLEVBQUUsSUFBSTtZ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TExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBzcGF3biwgc3Bhd25TeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCBta2R0ZW1wU3luYywgcmVhZEZpbGVTeW5jLCByZWFscGF0aFN5bmMsIHJtZGlyU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IHRtcGRpciB9IGZyb20gJ29zJztcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7IE5nQWRkU2F2ZURlcGVkZW5jeSB9IGZyb20gJy4vcGFja2FnZS1tZXRhZGF0YSc7XG5pbXBvcnQgeyBTcGlubmVyIH0gZnJvbSAnLi9zcGlubmVyJztcblxuaW50ZXJmYWNlIFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyB7XG4gIHNpbGVudDogc3RyaW5nO1xuICBzYXZlRGV2OiBzdHJpbmc7XG4gIGluc3RhbGw6IHN0cmluZztcbiAgaW5zdGFsbEFsbD86IHN0cmluZztcbiAgcHJlZml4OiBzdHJpbmc7XG4gIG5vTG9ja2ZpbGU6IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbGxBbGxQYWNrYWdlcyhcbiAgcGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyID0gUGFja2FnZU1hbmFnZXIuTnBtLFxuICBleHRyYUFyZ3M6IHN0cmluZ1tdID0gW10sXG4gIGN3ZCA9IHByb2Nlc3MuY3dkKCksXG4pOiBQcm9taXNlPDEgfCAwPiB7XG4gIGNvbnN0IHBhY2thZ2VNYW5hZ2VyQXJncyA9IGdldFBhY2thZ2VNYW5hZ2VyQXJndW1lbnRzKHBhY2thZ2VNYW5hZ2VyKTtcblxuICBjb25zdCBpbnN0YWxsQXJnczogc3RyaW5nW10gPSBbXTtcbiAgaWYgKHBhY2thZ2VNYW5hZ2VyQXJncy5pbnN0YWxsQWxsKSB7XG4gICAgaW5zdGFsbEFyZ3MucHVzaChwYWNrYWdlTWFuYWdlckFyZ3MuaW5zdGFsbEFsbCk7XG4gIH1cbiAgaW5zdGFsbEFyZ3MucHVzaChwYWNrYWdlTWFuYWdlckFyZ3Muc2lsZW50KTtcblxuICBjb25zdCBzcGlubmVyID0gbmV3IFNwaW5uZXIoKTtcbiAgc3Bpbm5lci5zdGFydCgnSW5zdGFsbGluZyBwYWNrYWdlcy4uLicpO1xuXG4gIGNvbnN0IGJ1ZmZlcmVkT3V0cHV0OiB7IHN0cmVhbTogTm9kZUpTLldyaXRlU3RyZWFtOyBkYXRhOiBCdWZmZXIgfVtdID0gW107XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCBjaGlsZFByb2Nlc3MgPSBzcGF3bihwYWNrYWdlTWFuYWdlciwgWy4uLmluc3RhbGxBcmdzLCAuLi5leHRyYUFyZ3NdLCB7XG4gICAgICBzdGRpbzogJ3BpcGUnLFxuICAgICAgc2hlbGw6IHRydWUsXG4gICAgICBjd2QsXG4gICAgfSkub24oJ2Nsb3NlJywgKGNvZGU6IG51bWJlcikgPT4ge1xuICAgICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgICAgc3Bpbm5lci5zdWNjZWVkKCdQYWNrYWdlcyBzdWNjZXNzZnVsbHkgaW5zdGFsbGVkLicpO1xuICAgICAgICByZXNvbHZlKDApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3Bpbm5lci5zdG9wKCk7XG4gICAgICAgIGJ1ZmZlcmVkT3V0cHV0LmZvckVhY2goKHsgc3RyZWFtLCBkYXRhIH0pID0+IHN0cmVhbS53cml0ZShkYXRhKSk7XG4gICAgICAgIHNwaW5uZXIuZmFpbCgnUGFja2FnZSBpbnN0YWxsIGZhaWxlZCwgc2VlIGFib3ZlLicpO1xuICAgICAgICByZWplY3QoMSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjaGlsZFByb2Nlc3Muc3Rkb3V0Py5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+XG4gICAgICBidWZmZXJlZE91dHB1dC5wdXNoKHsgc3RyZWFtOiBwcm9jZXNzLnN0ZG91dCwgZGF0YTogZGF0YSB9KSxcbiAgICApO1xuICAgIGNoaWxkUHJvY2Vzcy5zdGRlcnI/Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT5cbiAgICAgIGJ1ZmZlcmVkT3V0cHV0LnB1c2goeyBzdHJlYW06IHByb2Nlc3Muc3RkZXJyLCBkYXRhOiBkYXRhIH0pLFxuICAgICk7XG4gIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFsbFBhY2thZ2UoXG4gIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gIHBhY2thZ2VNYW5hZ2VyOiBQYWNrYWdlTWFuYWdlciA9IFBhY2thZ2VNYW5hZ2VyLk5wbSxcbiAgc2F2ZTogRXhjbHVkZTxOZ0FkZFNhdmVEZXBlZGVuY3ksIGZhbHNlPiA9IHRydWUsXG4gIGV4dHJhQXJnczogc3RyaW5nW10gPSBbXSxcbiAgY3dkID0gcHJvY2Vzcy5jd2QoKSxcbik6IFByb21pc2U8MSB8IDA+IHtcbiAgY29uc3QgcGFja2FnZU1hbmFnZXJBcmdzID0gZ2V0UGFja2FnZU1hbmFnZXJBcmd1bWVudHMocGFja2FnZU1hbmFnZXIpO1xuXG4gIGNvbnN0IGluc3RhbGxBcmdzOiBzdHJpbmdbXSA9IFtcbiAgICBwYWNrYWdlTWFuYWdlckFyZ3MuaW5zdGFsbCxcbiAgICBwYWNrYWdlTmFtZSxcbiAgICBwYWNrYWdlTWFuYWdlckFyZ3Muc2lsZW50LFxuICBdO1xuXG4gIGNvbnN0IHNwaW5uZXIgPSBuZXcgU3Bpbm5lcigpO1xuICBzcGlubmVyLnN0YXJ0KCdJbnN0YWxsaW5nIHBhY2thZ2UuLi4nKTtcblxuICBpZiAoc2F2ZSA9PT0gJ2RldkRlcGVuZGVuY2llcycpIHtcbiAgICBpbnN0YWxsQXJncy5wdXNoKHBhY2thZ2VNYW5hZ2VyQXJncy5zYXZlRGV2KTtcbiAgfVxuICBjb25zdCBidWZmZXJlZE91dHB1dDogeyBzdHJlYW06IE5vZGVKUy5Xcml0ZVN0cmVhbTsgZGF0YTogQnVmZmVyIH1bXSA9IFtdO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgY2hpbGRQcm9jZXNzID0gc3Bhd24ocGFja2FnZU1hbmFnZXIsIFsuLi5pbnN0YWxsQXJncywgLi4uZXh0cmFBcmdzXSwge1xuICAgICAgc3RkaW86ICdwaXBlJyxcbiAgICAgIHNoZWxsOiB0cnVlLFxuICAgICAgY3dkLFxuICAgIH0pLm9uKCdjbG9zZScsIChjb2RlOiBudW1iZXIpID0+IHtcbiAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgIHNwaW5uZXIuc3VjY2VlZCgnUGFja2FnZSBzdWNjZXNzZnVsbHkgaW5zdGFsbGVkLicpO1xuICAgICAgICByZXNvbHZlKDApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3Bpbm5lci5zdG9wKCk7XG4gICAgICAgIGJ1ZmZlcmVkT3V0cHV0LmZvckVhY2goKHsgc3RyZWFtLCBkYXRhIH0pID0+IHN0cmVhbS53cml0ZShkYXRhKSk7XG4gICAgICAgIHNwaW5uZXIuZmFpbCgnUGFja2FnZSBpbnN0YWxsIGZhaWxlZCwgc2VlIGFib3ZlLicpO1xuICAgICAgICByZWplY3QoMSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjaGlsZFByb2Nlc3Muc3Rkb3V0Py5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+XG4gICAgICBidWZmZXJlZE91dHB1dC5wdXNoKHsgc3RyZWFtOiBwcm9jZXNzLnN0ZG91dCwgZGF0YTogZGF0YSB9KSxcbiAgICApO1xuICAgIGNoaWxkUHJvY2Vzcy5zdGRlcnI/Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT5cbiAgICAgIGJ1ZmZlcmVkT3V0cHV0LnB1c2goeyBzdHJlYW06IHByb2Nlc3Muc3RkZXJyLCBkYXRhOiBkYXRhIH0pLFxuICAgICk7XG4gIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFsbFRlbXBQYWNrYWdlKFxuICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICBwYWNrYWdlTWFuYWdlcjogUGFja2FnZU1hbmFnZXIgPSBQYWNrYWdlTWFuYWdlci5OcG0sXG4gIGV4dHJhQXJncz86IHN0cmluZ1tdLFxuKTogUHJvbWlzZTx7XG4gIHN0YXR1czogMSB8IDA7XG4gIHRlbXBOb2RlTW9kdWxlczogc3RyaW5nO1xufT4ge1xuICBjb25zdCB0ZW1wUGF0aCA9IG1rZHRlbXBTeW5jKGpvaW4ocmVhbHBhdGhTeW5jKHRtcGRpcigpKSwgJ2FuZ3VsYXItY2xpLXBhY2thZ2VzLScpKTtcblxuICAvLyBjbGVhbiB1cCB0ZW1wIGRpcmVjdG9yeSBvbiBwcm9jZXNzIGV4aXRcbiAgcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHtcbiAgICB0cnkge1xuICAgICAgcm1kaXJTeW5jKHRlbXBQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgbWF4UmV0cmllczogMyB9KTtcbiAgICB9IGNhdGNoIHt9XG4gIH0pO1xuXG4gIC8vIE5QTSB3aWxsIHdhcm4gd2hlbiBhIGBwYWNrYWdlLmpzb25gIGlzIG5vdCBmb3VuZCBpbiB0aGUgaW5zdGFsbCBkaXJlY3RvcnlcbiAgLy8gRXhhbXBsZTpcbiAgLy8gbnBtIFdBUk4gZW5vZW50IEVOT0VOVDogbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeSwgb3BlbiAnL3RtcC8ubmctdGVtcC1wYWNrYWdlcy04NFFpN3kvcGFja2FnZS5qc29uJ1xuICAvLyBucG0gV0FSTiAubmctdGVtcC1wYWNrYWdlcy04NFFpN3kgTm8gZGVzY3JpcHRpb25cbiAgLy8gbnBtIFdBUk4gLm5nLXRlbXAtcGFja2FnZXMtODRRaTd5IE5vIHJlcG9zaXRvcnkgZmllbGQuXG4gIC8vIG5wbSBXQVJOIC5uZy10ZW1wLXBhY2thZ2VzLTg0UWk3eSBObyBsaWNlbnNlIGZpZWxkLlxuXG4gIC8vIFdoaWxlIHdlIGNhbiB1c2UgYG5wbSBpbml0IC15YCB3ZSB3aWxsIGVuZCB1cCBuZWVkaW5nIHRvIHVwZGF0ZSB0aGUgJ3BhY2thZ2UuanNvbicgYW55d2F5c1xuICAvLyBiZWNhdXNlIG9mIG1pc3NpbmcgZmllbGRzLlxuICB3cml0ZUZpbGVTeW5jKFxuICAgIGpvaW4odGVtcFBhdGgsICdwYWNrYWdlLmpzb24nKSxcbiAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICBuYW1lOiAndGVtcC1jbGktaW5zdGFsbCcsXG4gICAgICBkZXNjcmlwdGlvbjogJ3RlbXAtY2xpLWluc3RhbGwnLFxuICAgICAgcmVwb3NpdG9yeTogJ3RlbXAtY2xpLWluc3RhbGwnLFxuICAgICAgbGljZW5zZTogJ01JVCcsXG4gICAgfSksXG4gICk7XG5cbiAgLy8gc2V0dXAgcHJlZml4L2dsb2JhbCBtb2R1bGVzIHBhdGhcbiAgY29uc3QgcGFja2FnZU1hbmFnZXJBcmdzID0gZ2V0UGFja2FnZU1hbmFnZXJBcmd1bWVudHMocGFja2FnZU1hbmFnZXIpO1xuICBjb25zdCB0ZW1wTm9kZU1vZHVsZXMgPSBqb2luKHRlbXBQYXRoLCAnbm9kZV9tb2R1bGVzJyk7XG4gIC8vIFlhcm4gd2lsbCBub3QgYXBwZW5kICdub2RlX21vZHVsZXMnIHRvIHRoZSBwYXRoXG4gIGNvbnN0IHByZWZpeFBhdGggPSBwYWNrYWdlTWFuYWdlciA9PT0gUGFja2FnZU1hbmFnZXIuWWFybiA/IHRlbXBOb2RlTW9kdWxlcyA6IHRlbXBQYXRoO1xuICBjb25zdCBpbnN0YWxsQXJnczogc3RyaW5nW10gPSBbXG4gICAgLi4uKGV4dHJhQXJncyB8fCBbXSksXG4gICAgYCR7cGFja2FnZU1hbmFnZXJBcmdzLnByZWZpeH09XCIke3ByZWZpeFBhdGh9XCJgLFxuICAgIHBhY2thZ2VNYW5hZ2VyQXJncy5ub0xvY2tmaWxlLFxuICBdO1xuXG4gIHJldHVybiB7XG4gICAgc3RhdHVzOiBhd2FpdCBpbnN0YWxsUGFja2FnZShwYWNrYWdlTmFtZSwgcGFja2FnZU1hbmFnZXIsIHRydWUsIGluc3RhbGxBcmdzLCB0ZW1wUGF0aCksXG4gICAgdGVtcE5vZGVNb2R1bGVzLFxuICB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuVGVtcFBhY2thZ2VCaW4oXG4gIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gIHBhY2thZ2VNYW5hZ2VyOiBQYWNrYWdlTWFuYWdlciA9IFBhY2thZ2VNYW5hZ2VyLk5wbSxcbiAgYXJnczogc3RyaW5nW10gPSBbXSxcbik6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IHsgc3RhdHVzOiBjb2RlLCB0ZW1wTm9kZU1vZHVsZXMgfSA9IGF3YWl0IGluc3RhbGxUZW1wUGFja2FnZShwYWNrYWdlTmFtZSwgcGFja2FnZU1hbmFnZXIpO1xuICBpZiAoY29kZSAhPT0gMCkge1xuICAgIHJldHVybiBjb2RlO1xuICB9XG5cbiAgLy8gUmVtb3ZlIHZlcnNpb24vdGFnIGV0Yy4uLiBmcm9tIHBhY2thZ2UgbmFtZVxuICAvLyBFeDogQGFuZ3VsYXIvY2xpQGxhdGVzdCAtPiBAYW5ndWxhci9jbGlcbiAgY29uc3QgcGFja2FnZU5hbWVOb1ZlcnNpb24gPSBwYWNrYWdlTmFtZS5zdWJzdHJpbmcoMCwgcGFja2FnZU5hbWUubGFzdEluZGV4T2YoJ0AnKSk7XG4gIGNvbnN0IHBrZ0xvY2F0aW9uID0gam9pbih0ZW1wTm9kZU1vZHVsZXMsIHBhY2thZ2VOYW1lTm9WZXJzaW9uKTtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gam9pbihwa2dMb2NhdGlvbiwgJ3BhY2thZ2UuanNvbicpO1xuXG4gIC8vIEdldCBhIGJpbmFyeSBsb2NhdGlvbiBmb3IgdGhpcyBwYWNrYWdlXG4gIGxldCBiaW5QYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGlmIChleGlzdHNTeW5jKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uUGF0aCwgJ3V0Zi04Jyk7XG4gICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgIGNvbnN0IHsgYmluID0ge30gfSA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgICBjb25zdCBiaW5LZXlzID0gT2JqZWN0LmtleXMoYmluKTtcblxuICAgICAgaWYgKGJpbktleXMubGVuZ3RoKSB7XG4gICAgICAgIGJpblBhdGggPSByZXNvbHZlKHBrZ0xvY2F0aW9uLCBiaW5bYmluS2V5c1swXV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmICghYmluUGF0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGxvY2F0ZSBiaW4gZm9yIHRlbXBvcmFyeSBwYWNrYWdlOiAke3BhY2thZ2VOYW1lTm9WZXJzaW9ufS5gKTtcbiAgfVxuXG4gIGNvbnN0IHsgc3RhdHVzLCBlcnJvciB9ID0gc3Bhd25TeW5jKHByb2Nlc3MuZXhlY1BhdGgsIFtiaW5QYXRoLCAuLi5hcmdzXSwge1xuICAgIHN0ZGlvOiAnaW5oZXJpdCcsXG4gICAgZW52OiB7XG4gICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgIE5HX0RJU0FCTEVfVkVSU0lPTl9DSEVDSzogJ3RydWUnLFxuICAgICAgTkdfQ0xJX0FOQUxZVElDUzogJ2ZhbHNlJyxcbiAgICB9LFxuICB9KTtcblxuICBpZiAoc3RhdHVzID09PSBudWxsICYmIGVycm9yKSB7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICByZXR1cm4gc3RhdHVzIHx8IDA7XG59XG5cbmZ1bmN0aW9uIGdldFBhY2thZ2VNYW5hZ2VyQXJndW1lbnRzKHBhY2thZ2VNYW5hZ2VyOiBQYWNrYWdlTWFuYWdlcik6IFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyB7XG4gIHN3aXRjaCAocGFja2FnZU1hbmFnZXIpIHtcbiAgICBjYXNlIFBhY2thZ2VNYW5hZ2VyLllhcm46XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzaWxlbnQ6ICctLXNpbGVudCcsXG4gICAgICAgIHNhdmVEZXY6ICctLWRldicsXG4gICAgICAgIGluc3RhbGw6ICdhZGQnLFxuICAgICAgICBwcmVmaXg6ICctLW1vZHVsZXMtZm9sZGVyJyxcbiAgICAgICAgbm9Mb2NrZmlsZTogJy0tbm8tbG9ja2ZpbGUnLFxuICAgICAgfTtcbiAgICBjYXNlIFBhY2thZ2VNYW5hZ2VyLlBucG06XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzaWxlbnQ6ICctLXNpbGVudCcsXG4gICAgICAgIHNhdmVEZXY6ICctLXNhdmUtZGV2JyxcbiAgICAgICAgaW5zdGFsbDogJ2FkZCcsXG4gICAgICAgIGluc3RhbGxBbGw6ICdpbnN0YWxsJyxcbiAgICAgICAgcHJlZml4OiAnLS1wcmVmaXgnLFxuICAgICAgICBub0xvY2tmaWxlOiAnLS1uby1sb2NrZmlsZScsXG4gICAgICB9O1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzaWxlbnQ6ICctLXF1aWV0JyxcbiAgICAgICAgc2F2ZURldjogJy0tc2F2ZS1kZXYnLFxuICAgICAgICBpbnN0YWxsOiAnaW5zdGFsbCcsXG4gICAgICAgIGluc3RhbGxBbGw6ICdpbnN0YWxsJyxcbiAgICAgICAgcHJlZml4OiAnLS1wcmVmaXgnLFxuICAgICAgICBub0xvY2tmaWxlOiAnLS1uby1wYWNrYWdlLWxvY2snLFxuICAgICAgfTtcbiAgfVxufVxuIl19