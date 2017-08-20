"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
function bazelBinDirectory() {
    const s = child_process_1.execSync('bazel info bazel-bin').toString();
    return s.substring(0, s.length - 1);
}
exports.bazelBinDirectory = bazelBinDirectory;
function buildBazel(ui, target) {
    // TODO: vsavkin remove it once static are handled properly
    return new Promise((resolve, reject) => {
        child_process_1.exec(`bazel build ${target}`, (err, stdout, stderr) => {
            if (err) {
                ui.writeError(stderr.toString());
                reject();
            }
            else {
                ui.write(stdout.toString());
                resolve();
            }
        });
    });
}
exports.buildBazel = buildBazel;
function buildIBazel(ui, target) {
    return new Promise((resolve, reject) => {
        const r = child_process_1.spawn('ibazel', ['build', target]);
        r.stdout.on('data', (data) => {
            const s = data.toString();
            if (!s.startsWith('Watching:') && !s.startsWith('State:') &&
                !s.startsWith('Detected source change.')) {
                ui.write(s.toString());
            }
        });
        r.stderr.on('data', (data) => {
            ui.write(data.toString());
        });
        r.on('close', (code) => {
            if (code === 0) {
                resolve(null);
            }
            else {
                reject();
            }
        });
    });
}
exports.buildIBazel = buildIBazel;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/utilities/bazel-utils.js.map