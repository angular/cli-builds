import {
  CommandModule
} from "./chunk-YM7ILCS5.js";
import "./chunk-XG3HVNIL.js";
import {
  colors
} from "./chunk-GHUUJYOY.js";
import "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/make-this-awesome/cli.js
var AwesomeCommandModule = class extends CommandModule {
  command = "make-this-awesome";
  describe = false;
  deprecated = false;
  builder(localYargs) {
    return localYargs;
  }
  run() {
    const pickOne = (of) => of[Math.floor(Math.random() * of.length)];
    const phrase = pickOne([
      `You're on it, there's nothing for me to do!`,
      `Let's take a look... nope, it's all good!`,
      `You're doing fine.`,
      `You're already doing great.`,
      `Nothing to do; already awesome. Exiting.`,
      `Error 418: As Awesome As Can Get.`,
      `I spy with my little eye a great developer!`,
      `Noop... already awesome.`
    ]);
    this.context.logger.info(colors.green(phrase));
  }
};
export {
  AwesomeCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
