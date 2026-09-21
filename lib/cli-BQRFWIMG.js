import {
  ArchitectCommandModule
} from "./chunk-CAZUOCTC.js";
import "./chunk-DHWVZMLH.js";
import "./chunk-YM7ILCS5.js";
import "./chunk-XG3HVNIL.js";
import "./chunk-GHUUJYOY.js";
import "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/lint/long-description.md
var long_description_default = 'The command takes an optional project name, as specified in the `projects` section of the `angular.json` workspace configuration file.\nWhen a project name is not supplied, executes the `lint` builder for all projects.\n\nTo use the `ng lint` command, use `ng add` to add a package that implements linting capabilities. Adding the package automatically updates your workspace configuration, adding a lint [CLI builder](tools/cli/cli-builder).\nFor example:\n\n```json\n"projects": {\n  "my-project": {\n    ...\n    "architect": {\n      ...\n      "lint": {\n        "builder": "@angular-eslint/builder:lint",\n        "options": {}\n      }\n    }\n  }\n}\n```\n';

// packages/angular/cli/src/commands/lint/cli.js
var LintCommandModule = class extends ArchitectCommandModule {
  missingTargetChoices = [
    {
      name: "ESLint",
      value: "angular-eslint"
    }
  ];
  multiTarget = true;
  command = "lint [project]";
  longDescription = long_description_default;
  describe = "Runs linting tools on Angular application code in a given project folder.";
};
export {
  LintCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
