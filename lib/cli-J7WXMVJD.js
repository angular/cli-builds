import {
  ArchitectCommandModule
} from "./chunk-CZLPEMBR.js";
import "./chunk-U7XTJETY.js";
import {
  RootCommands
} from "./chunk-KDUGTS72.js";
import "./chunk-OSXE72P6.js";
import "./chunk-XG3HVNIL.js";
import "./chunk-GHUUJYOY.js";
import "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/test/long-description.md
var long_description_default = "Takes the name of the project, as specified in the `projects` section of the `angular.json` workspace configuration file.\nWhen a project name is not supplied, it will execute for all projects.\n";

// packages/angular/cli/src/commands/test/cli.js
var TestCommandModule = class extends ArchitectCommandModule {
  multiTarget = true;
  command = "test [project]";
  aliases = RootCommands["test"].aliases;
  describe = "Runs unit tests in a project.";
  longDescription = long_description_default;
};
export {
  TestCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
