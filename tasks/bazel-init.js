"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Task = require('../ember-cli/lib/models/task');
const chalk = require("chalk");
const child_process_1 = require("child_process");
exports.default = Task.extend({
    run: function () {
        const ui = this.ui;
        ui.writeLine(chalk.green(`Initializing Bazel workspace.`));
        return new Promise((resolve, reject) => {
            child_process_1.exec(`bazel build :init`, (err, _stdout, stderr) => {
                if (err) {
                    ui.writeLine(stderr);
                    const message = 'Bazel initializaiton failed, see above.';
                    ui.writeLine(chalk.red(message));
                    reject(message);
                }
                else {
                    ui.writeLine(chalk.green(`Initialized Bazel workspace.`));
                    resolve();
                }
            });
        });
    }
});
//# sourceMappingURL=/home/travis/build/angular/angular-cli/tasks/bazel-init.js.map