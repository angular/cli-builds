"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const find_up_1 = require("./find-up");
function insideProject() {
    const possibleConfigFiles = ['angular.json', '.angular.json'];
    return find_up_1.findUp(possibleConfigFiles, process.cwd()) !== null;
}
exports.insideProject = insideProject;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/utilities/project.js.map