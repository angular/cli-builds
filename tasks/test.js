"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const config_1 = require("../models/config");
const require_project_module_1 = require("../utilities/require-project-module");
const app_utils_1 = require("../utilities/app-utils");
const bazel_utils_1 = require("../utilities/bazel-utils");
const Task = require('../ember-cli/lib/models/task');
const SilentError = require('silent-error');
// This is temporary.
// Once Alex E implement a karma bazel rule, this should get much simpler
exports.default = Task.extend({
    run: function (options) {
        const projectConfig = config_1.CliConfig.fromProject().config;
        const projectRoot = this.project.root;
        const appConfig = app_utils_1.getAppFromConfig(this.app);
        if (projectConfig.project && projectConfig.project.ejected) {
            throw new SilentError('An ejected project cannot use the build command anymore.');
        }
        if (appConfig.platform === 'server') {
            throw new SilentError('ng test for platform server applications is coming soon!');
        }
        return new Promise((resolve) => {
            const karma = require_project_module_1.requireProjectModule(projectRoot, 'karma');
            const karmaConfig = path.join(projectRoot, options.config ||
                config_1.CliConfig.getValue('test.karma.config'));
            let karmaOptions = Object.assign({}, options);
            // Convert browsers from a string to an array
            if (options.browsers) {
                karmaOptions.browsers = options.browsers.split(',');
            }
            karmaOptions.opts = {
                bin_dir: bazel_utils_1.bazelBinDirectory(),
                app: appConfig.root,
                color: options.colors,
                progress: options.progress,
                log: options.log,
                port: options.port,
                reporters: options.reporters,
                sourcemaps: options.sourcemaps // TODO check that it works
            };
            // Assign additional karmaConfig options to the local ngapp config
            karmaOptions.configFile = karmaConfig;
            const karmaServer = new karma.Server(karmaOptions, resolve);
            const bazelTarget = path.parse(appConfig.root).dir;
            if (options.singleRun) {
                bazel_utils_1.buildBazel(this.ui, `${bazelTarget}:compile_and_static`).then(() => {
                    karmaServer.start();
                }).catch(() => {
                    process.exit(1);
                });
            }
            else {
                bazel_utils_1.buildIBazel(this.ui, `${bazelTarget}:compile_and_static`);
                karmaServer.start();
            }
        });
    }
});
//# sourceMappingURL=/home/travis/build/angular/angular-cli/tasks/test.js.map