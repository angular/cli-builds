"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// resolve dependencies within the target project
function resolveProjectModule(root, moduleName) {
    return require.resolve(moduleName, { paths: [root] });
}
exports.resolveProjectModule = resolveProjectModule;
// require dependencies within the target project
function requireProjectModule(root, moduleName) {
    return require(resolveProjectModule(root, moduleName));
}
exports.requireProjectModule = requireProjectModule;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/utilities/require-project-module.js.map