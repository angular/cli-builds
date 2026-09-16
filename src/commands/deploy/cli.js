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
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore strict-deps: Markdown files are asset dependencies bundled/loaded at runtime
const long_description_md_1 = __importDefault(require("./long-description.md"));
class DeployCommandModule extends architect_command_module_1.ArchitectCommandModule {
    // The below choices should be kept in sync with the list in https://angular.dev/tools/cli/deployment
    missingTargetChoices = [
        {
            name: 'Amazon S3',
            value: '@jefiozie/ngx-aws-deploy',
        },
        {
            name: 'Firebase',
            value: '@angular/fire',
        },
        {
            name: 'Netlify',
            value: '@netlify-builder/deploy',
        },
        {
            name: 'GitHub Pages',
            value: 'angular-cli-ghpages',
        },
    ];
    multiTarget = false;
    command = 'deploy [project]';
    longDescription = long_description_md_1.default;
    describe = 'Invokes the deploy builder for a specified project or for the default project in the workspace.';
}
exports.default = DeployCommandModule;
//# sourceMappingURL=cli.js.map