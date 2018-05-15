"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path = require("path");
function findUp(names, from) {
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
        currentDir = path.dirname(currentDir);
    }
    return null;
}
exports.findUp = findUp;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/utilities/find-up.js.map