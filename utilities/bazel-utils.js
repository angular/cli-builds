"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
function bazelBinDirectory() {
    const s = child_process_1.execSync('bazel info bazel-bin').toString();
    return s.substring(0, s.length - 1);
}
exports.bazelBinDirectory = bazelBinDirectory;
function buildBazel(_ui, target, silence = false) {
    const stdio = silence ? ['ignore', 'ignore', 'ignore'] : [0, 1, 1];
    return new Promise((resolve, reject) => {
        const bazel = child_process_1.spawn('bazel', ['build', target], { stdio });
        bazel.on('close', (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                reject();
            }
        });
    });
}
exports.buildBazel = buildBazel;
function buildIBazel(_ui, target) {
    return new Promise((resolve, reject) => {
        const r = child_process_1.spawn('ibazel', ['build', target], { stdio: [0, 1, 1] });
        r.on('close', (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                reject();
            }
        });
    });
}
exports.buildIBazel = buildIBazel;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/utilities/bazel-utils.js.map