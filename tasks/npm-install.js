"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("@angular-devkit/core/node");
const Task = require('../ember-cli/lib/models/task');
const chalk_1 = require("chalk");
const child_process_1 = require("child_process");
exports.default = Task.extend({
    run: function () {
        return __awaiter(this, void 0, void 0, function* () {
            const ui = this.ui;
            let packageManager = this.packageManager;
            if (packageManager === 'default') {
                packageManager = 'npm';
            }
            ui.writeLine(chalk_1.default.green(`Installing packages for tooling via ${packageManager}.`));
            const installArgs = ['install'];
            if (packageManager === 'npm') {
                installArgs.push('--quiet');
            }
            if (this.packageName) {
                try {
                    // Verify if we need to install the package (it might already be there).
                    // If it's available and we shouldn't save, simply return. Nothing to be done.
                    node_1.resolve(this.packageName, { checkLocal: true, basedir: this.project.root });
                    if (!this.save) {
                        return;
                    }
                }
                catch (e) {
                    if (!(e instanceof node_1.ModuleNotFoundException)) {
                        throw e;
                    }
                }
                installArgs.push(this.packageName);
            }
            if (!this.save) {
                installArgs.push('--no-save');
            }
            const installOptions = {
                stdio: 'inherit',
                shell: true
            };
            yield new Promise((resolve, reject) => {
                child_process_1.spawn(packageManager, installArgs, installOptions)
                    .on('close', (code) => {
                    if (code === 0) {
                        ui.writeLine(chalk_1.default.green(`Installed packages for tooling via ${packageManager}.`));
                        resolve();
                    }
                    else {
                        const message = 'Package install failed, see above.';
                        ui.writeLine(chalk_1.default.red(message));
                        reject(message);
                    }
                });
            });
        });
    }
});
//# sourceMappingURL=/home/travis/build/angular/angular-cli/tasks/npm-install.js.map