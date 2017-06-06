"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class StaticAssetPlugin {
    constructor(name, contents) {
        this.name = name;
        this.contents = contents;
    }
    apply(compiler) {
        compiler.plugin('emit', (compilation, cb) => {
            compilation.assets[this.name] = {
                size: () => this.contents.length,
                source: () => this.contents,
            };
            cb();
        });
    }
}
exports.StaticAssetPlugin = StaticAssetPlugin;
//# sourceMappingURL=/tmp/angular-cli-builds11756-6272-uix5qo.mmnh77gb9/angular-cli/plugins/static-asset.js.map