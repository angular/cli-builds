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

// packages/angular/cli/src/commands/e2e/cli.js
var E2eCommandModule = class extends ArchitectCommandModule {
  missingTargetChoices = [
    {
      name: "Playwright",
      value: "playwright-ng-schematics"
    },
    {
      name: "Cypress",
      value: "@cypress/schematic"
    },
    {
      name: "Nightwatch",
      value: "@nightwatch/schematics"
    },
    {
      name: "WebdriverIO",
      value: "@wdio/schematics"
    },
    {
      name: "Puppeteer",
      value: "@puppeteer/ng-schematics"
    }
  ];
  multiTarget = true;
  command = "e2e [project]";
  aliases = RootCommands["e2e"].aliases;
  describe = "Builds and serves an Angular application, then runs end-to-end tests.";
};
export {
  E2eCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
