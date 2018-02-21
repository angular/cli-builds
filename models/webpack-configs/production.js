"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webpack = require("webpack");
const fs = require("fs");
const semver = require("semver");
const common_tags_1 = require("common-tags");
const license_webpack_plugin_1 = require("license-webpack-plugin");
const build_optimizer_1 = require("@angular-devkit/build-optimizer");
const bundle_budget_1 = require("../../plugins/bundle-budget");
const require_project_module_1 = require("../../utilities/require-project-module");
const service_worker_1 = require("../../utilities/service-worker");
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
/**
 * license-webpack-plugin has a peer dependency on webpack-sources, list it in a comment to
 * let the dependency validator know it is used.
 *
 * require('webpack-sources')
 */
function getProdConfig(wco) {
    const { projectRoot, buildOptions, appConfig } = wco;
    let extraPlugins = [];
    if (appConfig.serviceWorker) {
        let swPackageJsonPath;
        try {
            swPackageJsonPath = require_project_module_1.resolveProjectModule(projectRoot, '@angular/service-worker/package.json');
        }
        catch (_) {
            // @angular/service-worker is required to be installed when serviceWorker is true.
            throw new Error(common_tags_1.stripIndent `
        Your project is configured with serviceWorker = true, but @angular/service-worker
        is not installed. Run \`npm install --save-dev @angular/service-worker\`
        and try again, or run \`ng set apps.0.serviceWorker=false\` in your .angular-cli.json.
      `);
        }
        // Read the version of @angular/service-worker and throw if it doesn't match the
        // expected version.
        const swPackageJson = fs.readFileSync(swPackageJsonPath).toString();
        const swVersion = JSON.parse(swPackageJson)['version'];
        const isModernSw = semver.gte(swVersion, service_worker_1.NEW_SW_VERSION);
        if (!isModernSw) {
            throw new Error(common_tags_1.stripIndent `
        The installed version of @angular/service-worker is ${swVersion}. This version of the CLI
        requires the @angular/service-worker version to satisfy ${service_worker_1.NEW_SW_VERSION}. Please upgrade
        your service worker version.
      `);
        }
    }
    extraPlugins.push(new bundle_budget_1.BundleBudgetPlugin({
        budgets: appConfig.budgets
    }));
    if (buildOptions.extractLicenses) {
        extraPlugins.push(new license_webpack_plugin_1.LicenseWebpackPlugin({
            pattern: /^(MIT|ISC|BSD.*)$/,
            suppressErrors: true,
            perChunkOutput: false,
            outputFilename: `3rdpartylicenses.txt`
        }));
    }
    const uglifyCompressOptions = {
        // Disabled because of an issue with Mapbox GL when using the Webpack node global and UglifyJS:
        // https://github.com/mapbox/mapbox-gl-js/issues/4359#issuecomment-303880888
        // https://github.com/angular/angular-cli/issues/5804
        // https://github.com/angular/angular-cli/pull/7931
        typeofs: false
    };
    if (buildOptions.buildOptimizer) {
        // This plugin must be before webpack.optimize.UglifyJsPlugin.
        extraPlugins.push(new build_optimizer_1.PurifyPlugin());
        uglifyCompressOptions.pure_getters = true;
        // PURE comments work best with 3 passes.
        // See https://github.com/webpack/webpack/issues/2899#issuecomment-317425926.
        uglifyCompressOptions.passes = 3;
    }
    return {
        plugins: [
            new webpack.EnvironmentPlugin({
                'NODE_ENV': 'production'
            }),
            new webpack.HashedModuleIdsPlugin(),
            new webpack.optimize.ModuleConcatenationPlugin(),
            ...extraPlugins,
            // Uglify should be the last plugin as PurifyPlugin needs to be before it.
            new UglifyJSPlugin({
                sourceMap: buildOptions.sourcemaps,
                parallel: true,
                cache: true,
                uglifyOptions: {
                    ecma: wco.supportES2015 ? 6 : 5,
                    warnings: buildOptions.verbose,
                    ie8: false,
                    mangle: {
                        safari10: true,
                    },
                    compress: uglifyCompressOptions,
                    output: {
                        ascii_only: true,
                        comments: false,
                        webkit: true,
                    },
                }
            }),
        ]
    };
}
exports.getProdConfig = getProdConfig;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/models/webpack-configs/production.js.map