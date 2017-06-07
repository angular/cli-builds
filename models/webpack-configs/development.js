"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webpack_1 = require("webpack");
exports.getDevConfig = function (_wco) {
    return {
        plugins: [new webpack_1.NamedModulesPlugin()]
    };
};
//# sourceMappingURL=/home/travis/build/angular/angular-cli/models/webpack-configs/development.js.map