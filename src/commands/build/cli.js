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
const command_config_1 = require("../command-config");
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore strict-deps: Markdown files are asset dependencies bundled/loaded at runtime
const long_description_md_1 = __importDefault(require("./long-description.md"));
class BuildCommandModule extends architect_command_module_1.ArchitectCommandModule {
    multiTarget = false;
    command = 'build [project]';
    aliases = command_config_1.RootCommands['build'].aliases;
    describe = 'Compiles an Angular application or library into an output directory named dist/ at the given output path.';
    longDescription = long_description_md_1.default;
}
exports.default = BuildCommandModule;
//# sourceMappingURL=cli.js.map