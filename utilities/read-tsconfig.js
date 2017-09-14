"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const ts = require("typescript");
function readTsconfig(tsconfigPath) {
    const configResult = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    const tsConfig = ts.parseJsonConfigFileContent(configResult.config, ts.sys, path.dirname(tsconfigPath), undefined, tsconfigPath);
    return tsConfig;
}
exports.readTsconfig = readTsconfig;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/utilities/read-tsconfig.js.map