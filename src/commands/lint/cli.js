"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const architect_command_module_1 = require("../../command-builder/architect-command-module");
const long_description_md_1 = __importDefault(require("./long-description.md"));
class LintCommandModule extends architect_command_module_1.ArchitectCommandModule {
    missingTargetChoices = [
        {
            name: 'ESLint',
            value: 'angular-eslint',
        },
    ];
    multiTarget = true;
    command = 'lint [project]';
    longDescription = long_description_md_1.default;
    describe = 'Runs linting tools on Angular application code in a given project folder.';
}
exports.default = LintCommandModule;
//# sourceMappingURL=cli.js.map