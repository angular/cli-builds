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
