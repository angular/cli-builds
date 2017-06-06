"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webpack = require("webpack");
const webpack_xi18n_config_1 = require("../models/webpack-xi18n-config");
const app_utils_1 = require("../utilities/app-utils");
const Task = require('../ember-cli/lib/models/task');
const MemoryFS = require('memory-fs');
exports.Extracti18nTask = Task.extend({
    run: function (runTaskOptions) {
        const appConfig = app_utils_1.getAppFromConfig(runTaskOptions.app);
        const config = new webpack_xi18n_config_1.XI18nWebpackConfig({
            genDir: runTaskOptions.outputPath || appConfig.root,
            buildDir: '.tmp',
            i18nFormat: runTaskOptions.i18nFormat,
            locale: runTaskOptions.locale,
            outFile: runTaskOptions.outFile,
            verbose: runTaskOptions.verbose,
            progress: runTaskOptions.progress,
            app: runTaskOptions.app,
        }, appConfig).buildConfig();
        const webpackCompiler = webpack(config);
        webpackCompiler.outputFileSystem = new MemoryFS();
        return new Promise((resolve, reject) => {
            const callback = (err, stats) => {
                if (err) {
                    return reject(err);
                }
                if (stats.hasErrors()) {
                    reject();
                }
                else {
                    resolve();
                }
            };
            webpackCompiler.run(callback);
        })
            .catch((err) => {
            if (err) {
                this.ui.writeError('\nAn error occured during the i18n extraction:\n'
                    + ((err && err.stack) || err));
            }
        });
    }
});
//# sourceMappingURL=/private/var/folders/lp/5h0nls311ws4fn75nn7kzz600037zs/t/angular-cli-builds11756-62193-lhciji.cdxm8fflxr/angular-cli/tasks/extract-i18n.js.map