"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const bazel_utils_1 = require("../utilities/bazel-utils");
const app_utils_1 = require("../utilities/app-utils");
const path = require("path");
const Task = require('../ember-cli/lib/models/task');
exports.default = Task.extend({
    run: function (serveTaskOptions) {
        const app = app_utils_1.getAppFromConfig(this.app);
        const bazelTarget = path.parse(app.root).dir;
        if (serveTaskOptions.watch) {
            // TODO vsavkin: remove the first build once the webpack rule handles static
            return bazel_utils_1.buildBazel(this.ui, `${bazelTarget}:compile_and_static`, true).then(() => {
                return startIBazelAndWebpack(this.ui, bazelTarget, serveTaskOptions);
            }).catch(() => {
                return startIBazelAndWebpack(this.ui, bazelTarget, serveTaskOptions);
            });
        }
        else {
            // TODO vsavkin: remove the first build once the webpack rule handles static
            return bazel_utils_1.buildBazel(this.ui, `${bazelTarget}:compile_and_static`, true).then(() => {
                return bazel_utils_1.buildBazel(this.ui, bazelTarget).then(() => {
                    return startWebpackDevServer(this.ui, bazelTarget, serveTaskOptions);
                });
            });
        }
    }
});
function startIBazelAndWebpack(ui, bazelTarget, serveTaskOptions) {
    const a = bazel_utils_1.buildIBazel(ui, `${bazelTarget}:compile_and_static`);
    const b = startWebpackDevServer(ui, bazelTarget, serveTaskOptions);
    return Promise.race([a, b]);
}
function startWebpackDevServer(_ui, app, serveTaskOptions) {
    return new Promise((resolve, reject) => {
        const webpack = child_process_1.spawn('webpack-dev-server', [
            '--config',
            'node_modules/@nrwl/bazel/src/utils/webpack.config.js',
            '--env.bin_dir',
            bazel_utils_1.bazelBinDirectory(),
            '--env.package',
            app,
            '--env.mode',
            'dev',
            '--port',
            serveTaskOptions.port.toString(),
            '--host',
            serveTaskOptions.host.toString()
        ], { stdio: [0, 1, 1] });
        webpack.on('close', (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                // print an error here
                reject();
            }
        });
    });
}
//# sourceMappingURL=/home/travis/build/angular/angular-cli/tasks/serve.js.map