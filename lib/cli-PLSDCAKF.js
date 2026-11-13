import {
  ArchitectCommandModule
} from "./chunk-Q6NLYQGP.js";
import "./chunk-BW4VY5LI.js";
import {
  RootCommands
} from "./chunk-N7GHKOP4.js";
import "./chunk-5SOZ5CCD.js";
import "./chunk-MS4D2WE3.js";
import "./chunk-XG3HVNIL.js";
import "./chunk-GHUUJYOY.js";
import "./chunk-CGRNL7CG.js";

// packages/angular/cli/src/commands/serve/cli.js
var ServeCommandModule = class extends ArchitectCommandModule {
  multiTarget = false;
  command = "serve [project]";
  aliases = RootCommands["serve"].aliases;
  describe = "Builds and serves your application, rebuilding on file changes.";
};
export {
  ServeCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
