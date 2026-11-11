import {
  ArchitectCommandModule
} from "./chunk-Q6NLYQGP.js";
import "./chunk-BW4VY5LI.js";
import {
  RootCommands
} from "./chunk-IKODOVDL.js";
import "./chunk-5SOZ5CCD.js";
import "./chunk-MS4D2WE3.js";
import "./chunk-XG3HVNIL.js";
import "./chunk-GHUUJYOY.js";
import "./chunk-CGRNL7CG.js";

// packages/angular/cli/src/commands/test/long-description.md
var long_description_default = "Takes the name of the project, as specified in the `projects` section of the `angular.json` workspace configuration file.\nWhen a project name is not supplied, it will execute for all projects.\n";

// packages/angular/cli/src/commands/test/cli.js
var TestCommandModule = class extends ArchitectCommandModule {
  multiTarget = true;
  builders = {
    "Unit-test": "@angular/build:unit-test",
    "Karma": "@angular/build:karma"
  };
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
