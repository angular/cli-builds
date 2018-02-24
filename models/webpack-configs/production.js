"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const semver = require("semver");
const common_tags_1 = require("common-tags");
const license_webpack_plugin_1 = require("license-webpack-plugin");
const bundle_budget_1 = require("../../plugins/bundle-budget");
const require_project_module_1 = require("../../utilities/require-project-module");
const service_worker_1 = require("../../utilities/service-worker");
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
    return {
        plugins: extraPlugins,
    };
}
exports.getProdConfig = getProdConfig;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/models/webpack-configs/production.js.map