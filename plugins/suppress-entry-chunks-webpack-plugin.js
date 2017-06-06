"use strict";
// Remove .js files from entry points consisting entirely of .css|scss|sass|less|styl.
// To be used together with ExtractTextPlugin.
Object.defineProperty(exports, "__esModule", { value: true });
class SuppressExtractedTextChunksWebpackPlugin {
    constructor() { }
    apply(compiler) {
        compiler.plugin('compilation', function (compilation) {
            // find which chunks have css only entry points
            const cssOnlyChunks = [];
            const entryPoints = compilation.options.entry;
            // determine which entry points are composed entirely of css files
            for (let entryPoint of Object.keys(entryPoints)) {
                if (entryPoints[entryPoint].every((el) => el.match(/\.(css|scss|sass|less|styl)$/))) {
                    cssOnlyChunks.push(entryPoint);
                }
            }
            // Remove the js file for supressed chunks
            compilation.plugin('after-seal', (callback) => {
                compilation.chunks
                    .filter((chunk) => cssOnlyChunks.indexOf(chunk.name) !== -1)
                    .forEach((chunk) => {
                    let newFiles = [];
                    chunk.files.forEach((file) => {
                        if (file.match(/\.js(\.map)?$/)) {
                            // remove js files
                            delete compilation.assets[file];
                        }
                        else {
                            newFiles.push(file);
                        }
                    });
                    chunk.files = newFiles;
                });
                callback();
            });
            // Remove scripts tags with a css file as source, because HtmlWebpackPlugin will use
            // a css file as a script for chunks without js files.
            compilation.plugin('html-webpack-plugin-alter-asset-tags', (htmlPluginData, callback) => {
                const filterFn = (tag) => !(tag.tagName === 'script' && tag.attributes.src.match(/\.css$/));
                htmlPluginData.head = htmlPluginData.head.filter(filterFn);
                htmlPluginData.body = htmlPluginData.body.filter(filterFn);
                callback(null, htmlPluginData);
            });
        });
    }
}
exports.SuppressExtractedTextChunksWebpackPlugin = SuppressExtractedTextChunksWebpackPlugin;
//# sourceMappingURL=/private/var/folders/lp/5h0nls311ws4fn75nn7kzz600037zs/t/angular-cli-builds11756-34955-heb2o6.8aqm9xjemi/angular-cli/plugins/suppress-entry-chunks-webpack-plugin.js.map