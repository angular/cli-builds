"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webpack = require("webpack");
// This just extends webpack.NamedChunksPlugin to prevent name collisions.
class NamedLazyChunksWebpackPlugin extends webpack.NamedChunksPlugin {
    constructor() {
        // Append a dot and number if the name already exists.
        const nameMap = new Map();
        function getUniqueName(baseName) {
            let name = baseName;
            let num = 0;
            while (nameMap.has(name)) {
                name = `${baseName}.${num++}`;
            }
            nameMap.set(name, true);
            return name;
        }
        const nameResolver = (chunk) => {
            // Entry chunks have a name already, use it.
            if (chunk.name) {
                return chunk.name;
            }
            // Try to figure out if it's a lazy loaded route.
            if (chunk.blocks
                && chunk.blocks.length > 0
                && chunk.blocks[0].dependencies
                && chunk.blocks[0].dependencies.length > 0
                && chunk.blocks[0].dependencies[0].lazyRouteChunkName) {
                // lazyRouteChunkName was added by @ngtools/webpack.
                return getUniqueName(chunk.blocks[0].dependencies[0].lazyRouteChunkName);
            }
            return null;
        };
        super(nameResolver);
    }
}
exports.NamedLazyChunksWebpackPlugin = NamedLazyChunksWebpackPlugin;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/plugins/named-lazy-chunks-webpack-plugin.js.map