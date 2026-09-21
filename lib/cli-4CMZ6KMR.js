import {
  ArchitectCommandModule
} from "./chunk-CAZUOCTC.js";
import "./chunk-DHWVZMLH.js";
import "./chunk-YM7ILCS5.js";
import "./chunk-XG3HVNIL.js";
import "./chunk-GHUUJYOY.js";
import "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/deploy/long-description.md
var long_description_default = 'The command takes an optional project name, as specified in the `projects` section of the `angular.json` workspace configuration file.\nWhen a project name is not supplied, executes the `deploy` builder for the default project.\n\nTo use the `ng deploy` command, use `ng add` to add a package that implements deployment capabilities to your favorite platform.\nAdding the package automatically updates your workspace configuration, adding a deployment\n[CLI builder](tools/cli/cli-builder).\nFor example:\n\n```json\n"projects": {\n  "my-project": {\n    ...\n    "architect": {\n      ...\n      "deploy": {\n        "builder": "@angular/fire:deploy",\n        "options": {}\n      }\n    }\n  }\n}\n```\n';

// packages/angular/cli/src/commands/deploy/cli.js
var DeployCommandModule = class extends ArchitectCommandModule {
  // The below choices should be kept in sync with the list in https://angular.dev/tools/cli/deployment
  missingTargetChoices = [
    {
      name: "Amazon S3",
      value: "@jefiozie/ngx-aws-deploy"
    },
    {
      name: "Firebase",
      value: "@angular/fire"
    },
    {
      name: "Netlify",
      value: "@netlify-builder/deploy"
    },
    {
      name: "GitHub Pages",
      value: "angular-cli-ghpages"
    }
  ];
  multiTarget = false;
  command = "deploy [project]";
  longDescription = long_description_default;
  describe = "Invokes the deploy builder for a specified project or for the default project in the workspace.";
};
export {
  DeployCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
