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
//# sourceMappingURL=/private/var/folders/lp/5h0nls311ws4fn75nn7kzz600037zs/t/angular-cli-builds11756-42871-zwooiw.iwbxnr8uxr/angular-cli/plugins/karma-webpack-throw-error.js.map