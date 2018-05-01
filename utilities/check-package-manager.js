"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
const child_process_1 = require("child_process");
const util_1 = require("util");
const config_1 = require("./config");
const execPromise = util_1.promisify(child_process_1.exec);
const packageManager = config_1.getPackageManager();
function checkYarnOrCNPM() {
    // Don't show messages if user has already changed the default.
    if (packageManager !== 'default') {
        return Promise.resolve();
    }
    return Promise
        .all([checkYarn(), checkCNPM()])
        .then((data) => {
        const [isYarnInstalled, isCNPMInstalled] = data;
        if (isYarnInstalled && isCNPMInstalled) {
            console.log(chalk_1.default.yellow('You can `ng config -g cli.packageManager yarn` '
                + 'or `ng config -g cli.packageManager cnpm`.'));
        }
        else if (isYarnInstalled) {
            console.log(chalk_1.default.yellow('You can `ng config -g cli.packageManager yarn`.'));
        }
        else if (isCNPMInstalled) {
            console.log(chalk_1.default.yellow('You can `ng config -g cli.packageManager cnpm`.'));
        }
        else {
            if (packageManager !== 'default' && packageManager !== 'npm') {
                console.log(chalk_1.default.yellow(`Seems that ${packageManager} is not installed.`));
                console.log(chalk_1.default.yellow('You can `ng config -g cli.packageManager npm`.'));
            }
        }
    });
}
exports.checkYarnOrCNPM = checkYarnOrCNPM;
function checkYarn() {
    return execPromise('yarn --version')
        .then(() => true, () => false);
}
function checkCNPM() {
    return execPromise('cnpm --version')
        .then(() => true, () => false);
}
//# sourceMappingURL=/home/travis/build/angular/angular-cli/utilities/check-package-manager.js.map