import {
  ArchitectCommandModule
} from "./chunk-LN6ZEQXP.js";
import "./chunk-M6EN5FL5.js";
import {
  RootCommands
} from "./chunk-7ME2F4MX.js";
import "./chunk-5SOZ5CCD.js";
import "./chunk-R6JSQ5D5.js";
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
