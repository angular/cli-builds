"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_utils_1 = require("../utilities/app-utils");
const bazel_utils_1 = require("../utilities/bazel-utils");
const path = require("path");
const Task = require('../ember-cli/lib/models/task');
exports.default = Task.extend({
    run: function (runTaskOptions) {
        const app = app_utils_1.getAppFromConfig(this.app);
        const bazelTarget = path.parse(app.root).dir;
        if (runTaskOptions.watch) {
            // TODO vsavkin: remove the first build once the webpack rule handles static
            return bazel_utils_1.buildBazel(this.ui, `${bazelTarget}:compile_and_static`).then(() => {
                return bazel_utils_1.buildIBazel(this.ui, bazelTarget);
            }).catch(() => {
                return bazel_utils_1.buildIBazel(this.ui, bazelTarget);
            });
        }
        else {
            // TODO vsavkin: remove the first build once the webpack rule handles static
            return bazel_utils_1.buildBazel(this.ui, `${bazelTarget}:compile_and_static`).then(() => {
                return bazel_utils_1.buildBazel(this.ui, bazelTarget);
            });
        }
    }
});
//# sourceMappingURL=/home/travis/build/angular/angular-cli/tasks/build.js.map