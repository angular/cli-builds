"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const glob = require("glob");
const config_1 = require("../config");
/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('istanbul-instrumenter-loader')
 *
 */
function getTestConfig(wco) {
    const { projectRoot, buildOptions, appConfig } = wco;
    const extraRules = [];
    const extraPlugins = [];
    if (buildOptions.codeCoverage && config_1.CliConfig.fromProject()) {
        const codeCoverageExclude = config_1.CliConfig.fromProject().get('test.codeCoverage.exclude');
        let exclude = [
            /\.(e2e|spec)\.ts$/,
            /node_modules/
        ];
        if (codeCoverageExclude) {
            codeCoverageExclude.forEach((excludeGlob) => {
                const excludeFiles = glob
                    .sync(path.join(projectRoot, excludeGlob), { nodir: true })
                    .map(file => path.normalize(file));
                exclude.push(...excludeFiles);
            });
        }
        extraRules.push({
            test: /\.(js|ts)$/, loader: 'istanbul-instrumenter-loader',
            options: { esModules: true },
            enforce: 'post',
            exclude
        });
    }
    return {
        resolve: {
            mainFields: [
                ...(wco.supportES2015 ? ['es2015'] : []),
                'browser', 'module', 'main'
            ]
        },
        devtool: buildOptions.sourcemaps ? 'inline-source-map' : 'eval',
        entry: {
            main: path.resolve(projectRoot, appConfig.root, appConfig.test)
        },
        module: {
            rules: [].concat(extraRules)
        },
        plugins: extraPlugins,
        optimization: {
            // runtimeChunk: 'single',
            splitChunks: {
                chunks: buildOptions.commonChunk ? 'all' : 'initial',
                cacheGroups: {
                    vendors: false,
                    vendor: buildOptions.vendorChunk && {
                        name: 'vendor',
                        chunks: 'initial',
                        test: (module, chunks) => {
                            const moduleName = module.nameForCondition ? module.nameForCondition() : '';
                            return /[\\/]node_modules[\\/]/.test(moduleName)
                                && !chunks.some(({ name }) => name === 'polyfills');
                        },
                    },
                }
            }
        },
    };
}
exports.getTestConfig = getTestConfig;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/models/webpack-configs/test.js.map