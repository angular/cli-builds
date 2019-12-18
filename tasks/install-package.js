"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const rimraf = require("rimraf");
const schema_1 = require("../lib/config/schema");
const color_1 = require("../utilities/color");
function installPackage(packageName, logger, packageManager = schema_1.PackageManager.Npm, extraArgs = [], global = false) {
    const packageManagerArgs = getPackageManagerArguments(packageManager);
    const installArgs = [
        packageManagerArgs.install,
        packageName,
        packageManagerArgs.silent,
    ];
    logger.info(color_1.colors.green(`Installing packages for tooling via ${packageManager}.`));
    if (global) {
        if (packageManager === schema_1.PackageManager.Yarn) {
            installArgs.unshift('global');
        }
        else {
            installArgs.push('--global');
        }
    }
    const { status } = child_process_1.spawnSync(packageManager, [
        ...installArgs,
        ...extraArgs,
    ], {
        stdio: 'inherit',
        shell: true,
    });
    if (status !== 0) {
        throw new Error('Package install failed, see above.');
    }
    logger.info(color_1.colors.green(`Installed packages for tooling via ${packageManager}.`));
}
exports.installPackage = installPackage;
function installTempPackage(packageName, logger, packageManager = schema_1.PackageManager.Npm) {
    const tempPath = fs_1.mkdtempSync(path_1.join(fs_1.realpathSync(os_1.tmpdir()), '.ng-temp-packages-'));
    // clean up temp directory on process exit
    process.on('exit', () => rimraf.sync(tempPath));
    // setup prefix/global modules path
    const packageManagerArgs = getPackageManagerArguments(packageManager);
    const installArgs = [
        packageManagerArgs.prefix,
        tempPath,
    ];
    installPackage(packageName, logger, packageManager, installArgs, true);
    let tempNodeModules;
    if (packageManager !== schema_1.PackageManager.Yarn && process.platform !== 'win32') {
        // Global installs on Unix systems go to {prefix}/lib/node_modules.
        // Global installs on Windows go to {prefix}/node_modules (that is, no lib folder.)
        tempNodeModules = path_1.join(tempPath, 'lib', 'node_modules');
    }
    else {
        tempNodeModules = path_1.join(tempPath, 'node_modules');
    }
    // Needed to resolve schematics from this location since we use a custom
    // resolve strategy in '@angular/devkit-core/node'
    // todo: this should be removed when we change the resolutions to use require.resolve
    process.env.NG_TEMP_MODULES_DIR = tempNodeModules;
    return tempNodeModules;
}
exports.installTempPackage = installTempPackage;
function runTempPackageBin(packageName, logger, packageManager = schema_1.PackageManager.Npm, args = []) {
    const tempNodeModulesPath = installTempPackage(packageName, logger, packageManager);
    // Remove version/tag etc... from package name
    // Ex: @angular/cli@latest -> @angular/cli
    const packageNameNoVersion = packageName.substring(0, packageName.lastIndexOf('@'));
    const pkgLocation = path_1.join(tempNodeModulesPath, packageNameNoVersion);
    const packageJsonPath = path_1.join(pkgLocation, 'package.json');
    // Get a binary location for this package
    let binPath;
    if (fs_1.existsSync(packageJsonPath)) {
        const content = fs_1.readFileSync(packageJsonPath, 'utf-8');
        if (content) {
            const { bin = {} } = JSON.parse(content);
            const binKeys = Object.keys(bin);
            if (binKeys.length) {
                binPath = path_1.resolve(pkgLocation, bin[binKeys[0]]);
            }
        }
    }
    if (!binPath) {
        throw new Error(`Cannot locate bin for temporary package: ${packageNameNoVersion}.`);
    }
    const argv = [
        binPath,
        ...args,
    ];
    const { status, error } = child_process_1.spawnSync('node', argv, {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            NG_DISABLE_VERSION_CHECK: 'true',
        },
    });
    if (status === null && error) {
        throw error;
    }
    return status || 0;
}
exports.runTempPackageBin = runTempPackageBin;
function getPackageManagerArguments(packageManager) {
    return packageManager === schema_1.PackageManager.Yarn
        ? {
            silent: '--silent',
            install: 'add',
            prefix: '--global-folder',
        }
        : {
            silent: '--quiet',
            install: 'install',
            prefix: '--prefix',
        };
}
