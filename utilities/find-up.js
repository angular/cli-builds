"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs_1 = require("fs");
function findUp(names, from, stopOnNodeModules = false) {
    if (!Array.isArray(names)) {
        names = [names];
    }
    const root = path.parse(from).root;
    let currentDir = from;
    while (currentDir && currentDir !== root) {
        for (const name of names) {
            const p = path.join(currentDir, name);
            if (fs_1.existsSync(p)) {
                return p;
            }
        }
        if (stopOnNodeModules) {
            const nodeModuleP = path.join(currentDir, 'node_modules');
            if (fs_1.existsSync(nodeModuleP)) {
                return null;
            }
        }
        currentDir = path.dirname(currentDir);
    }
    return null;
}
exports.findUp = findUp;
//# sourceMappingURL=/private/var/folders/lp/5h0nls311ws4fn75nn7kzz600037zs/t/angular-cli-builds11752-29458-1s41dfr.bcn9bv5cdi/angular-cli/utilities/find-up.js.map