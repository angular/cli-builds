"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resolve = require('resolve');
// require dependencies within the target project
function requireProjectModule(root, moduleName) {
    return require(resolve.sync(moduleName, { basedir: root }));
}
exports.requireProjectModule = requireProjectModule;
//# sourceMappingURL=/tmp/angular-cli-builds11756-6272-uix5qo.mmnh77gb9/angular-cli/utilities/require-project-module.js.map