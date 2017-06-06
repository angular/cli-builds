"use strict";
// Force Webpack to throw compilation errors. Useful with karma-webpack when in single-run mode.
// Workaround for https://github.com/webpack-contrib/karma-webpack/issues/66
Object.defineProperty(exports, "__esModule", { value: true });
class KarmaWebpackThrowError {
    constructor() { }
    apply(compiler) {
        compiler.plugin('done', (stats) => {
            if (stats.compilation.errors.length > 0) {
                throw new Error(stats.compilation.errors.map((err) => err.message || err));
            }
        });
    }
}
exports.KarmaWebpackThrowError = KarmaWebpackThrowError;
//# sourceMappingURL=/tmp/angular-cli-builds11756-6272-uix5qo.mmnh77gb9/angular-cli/plugins/karma-webpack-throw-error.js.map