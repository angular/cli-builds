import {
  ArchitectCommandModule
} from "./chunk-JLFJ7HKL.js";
import "./chunk-AHU2Z4G4.js";
import {
  RootCommands
} from "./chunk-PTAJ56VD.js";
import "./chunk-WVZCCJXU.js";
import "./chunk-XG3HVNIL.js";
import "./chunk-GHUUJYOY.js";
import "./chunk-FZ5GFCWU.js";

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
