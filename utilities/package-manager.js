"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureCompatibleNpm = exports.getPackageManager = exports.supportsNpm = exports.supportsYarn = void 0;
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const schema_1 = require("../lib/config/schema");
const config_1 = require("./config");
function supports(name) {
    try {
        child_process_1.execSync(`${name} --version`, { stdio: 'ignore' });
        return true;
    }
    catch (_a) {
        return false;
    }
}
function supportsYarn() {
    return supports('yarn');
}
exports.supportsYarn = supportsYarn;
function supportsNpm() {
    return supports('npm');
}
exports.supportsNpm = supportsNpm;
async function getPackageManager(root) {
    let packageManager = await config_1.getConfiguredPackageManager();
    if (packageManager) {
        return packageManager;
    }
    const hasYarn = supportsYarn();
    const hasYarnLock = fs_1.existsSync(path_1.join(root, 'yarn.lock'));
    const hasNpm = supportsNpm();
    const hasNpmLock = fs_1.existsSync(path_1.join(root, 'package-lock.json'));
    if (hasYarn && hasYarnLock && !hasNpmLock) {
        packageManager = schema_1.PackageManager.Yarn;
    }
    else if (hasNpm && hasNpmLock && !hasYarnLock) {
        packageManager = schema_1.PackageManager.Npm;
    }
    else if (hasYarn && !hasNpm) {
        packageManager = schema_1.PackageManager.Yarn;
    }
    else if (hasNpm && !hasYarn) {
        packageManager = schema_1.PackageManager.Npm;
    }
    // TODO: This should eventually inform the user of ambiguous package manager usage.
    //       Potentially with a prompt to choose and optionally set as the default.
    return packageManager || schema_1.PackageManager.Npm;
}
exports.getPackageManager = getPackageManager;
/**
 * Checks if the npm version is version 6.x.  If not, display a message and exit.
 */
async function ensureCompatibleNpm(root) {
    var _a;
    if ((await getPackageManager(root)) !== schema_1.PackageManager.Npm) {
        return;
    }
    try {
        const version = child_process_1.execSync('npm --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
        const major = Number((_a = version.match(/^(\d+)\./)) === null || _a === void 0 ? void 0 : _a[1]);
        if (major <= 6) {
            return;
        }
        // tslint:disable-next-line: no-console
        console.error(`npm version ${version} detected. The Angular CLI temporarily requires npm version 6 while upstream issues are addressed.\n\n` +
            'Please install a compatible version to proceed (`npm install --global npm@6`).\n' +
            'For additional information and alternative workarounds, please see ' +
            'https://github.com/angular/angular-cli/issues/19957#issuecomment-775407654');
        process.exit(3);
    }
    catch (_b) {
        // npm is not installed
    }
}
exports.ensureCompatibleNpm = ensureCompatibleNpm;
