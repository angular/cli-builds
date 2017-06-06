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
//# sourceMappingURL=/private/var/folders/lp/5h0nls311ws4fn75nn7kzz600037zs/t/angular-cli-builds11756-42871-zwooiw.iwbxnr8uxr/angular-cli/plugins/static-asset.js.map