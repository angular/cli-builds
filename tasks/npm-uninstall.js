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
const color_1 = require("../utilities/color");
async function default_1(packageName, logger, packageManager) {
    const installArgs = [];
    switch (packageManager) {
        case 'cnpm':
        case 'pnpm':
        case 'npm':
            installArgs.push('uninstall');
            break;
        case 'yarn':
            installArgs.push('remove');
            break;
        default:
            packageManager = 'npm';
            installArgs.push('uninstall');
            break;
    }
    installArgs.push(packageName, '--quiet');
    logger.info(color_1.colors.green(`Uninstalling packages for tooling via ${packageManager}.`));
    await new Promise((resolve, reject) => {
        child_process_1.spawn(packageManager, installArgs, { stdio: 'inherit', shell: true }).on('close', (code) => {
            if (code === 0) {
                logger.info(color_1.colors.green(`Uninstalling packages for tooling via ${packageManager}.`));
                resolve();
            }
            else {
                reject('Package uninstallation failed, see above.');
            }
        });
    });
}
exports.default = default_1;
