import {
  ArchitectCommandModule
} from "./chunk-CAZUOCTC.js";
import "./chunk-DHWVZMLH.js";
import "./chunk-YM7ILCS5.js";
import "./chunk-XG3HVNIL.js";
import "./chunk-GHUUJYOY.js";
import "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/extract-i18n/cli.js
import { createRequire } from "node:module";
import { join } from "node:path";
var ExtractI18nCommandModule = class extends ArchitectCommandModule {
  multiTarget = false;
  command = "extract-i18n [project]";
  describe = "Extracts i18n messages from source code.";
  async findDefaultBuilderName(project) {
    if (project.extensions["projectType"] !== "application") {
      return;
    }
    const buildTarget = project.targets.get("build");
    if (!buildTarget) {
      return;
    }
    switch (buildTarget.builder) {
      case "@angular-devkit/build-angular:application":
      case "@angular-devkit/build-angular:browser-esbuild":
      case "@angular-devkit/build-angular:browser":
        return "@angular-devkit/build-angular:extract-i18n";
      case "@angular/build:application":
        return "@angular/build:extract-i18n";
    }
    try {
      const projectRequire = createRequire(join(this.context.root, project.root) + "/");
      projectRequire.resolve("@angular-devkit/build-angular");
      return "@angular-devkit/build-angular:extract-i18n";
    } catch {
    }
  }
};
export {
  ExtractI18nCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
