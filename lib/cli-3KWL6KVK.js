import {
  ArchitectCommandModule
} from "./chunk-CAZUOCTC.js";
import "./chunk-DHWVZMLH.js";
import {
  RootCommands
} from "./chunk-BXDUCIEO.js";
import "./chunk-YM7ILCS5.js";
import "./chunk-XG3HVNIL.js";
import "./chunk-GHUUJYOY.js";
import "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/build/long-description.md
var long_description_default = 'The command can be used to build a project of type "application" or "library".\nWhen used to build a library, a different builder is invoked, and only the `ts-config`, `configuration`, `poll` and `watch` options are applied.\nAll other options apply only to building applications.\n\nThe application builder uses the [esbuild](https://esbuild.github.io/) build tool, with default configuration options specified in the workspace configuration file (`angular.json`) or with a named alternative configuration.\nA "development" configuration is created by default when you use the CLI to create the project, and you can use that configuration by specifying the `--configuration development`.\n\nThe configuration options generally correspond to the command options.\nYou can override individual configuration defaults by specifying the corresponding options on the command line.\nThe command can accept option names given in dash-case.\nNote that in the configuration file, you must specify names in camelCase.\n\nSome additional options can only be set through the configuration file,\neither by direct editing or with the `ng config` command.\nThese include `assets`, `styles`, and `scripts` objects that provide runtime-global resources to include in the project.\nResources in CSS, such as images and fonts, are automatically written and fingerprinted at the root of the output folder.\n\nFor further details, see [Workspace Configuration](reference/configs/workspace-config).\n';

// packages/angular/cli/src/commands/build/cli.js
var BuildCommandModule = class extends ArchitectCommandModule {
  multiTarget = false;
  command = "build [project]";
  aliases = RootCommands["build"].aliases;
  describe = "Compiles an Angular application or library into an output directory named dist/ at the given output path.";
  longDescription = long_description_default;
};
export {
  BuildCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
