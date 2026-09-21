import {
  addCommandModuleToYargs,
  demandCommandFailureMessage
} from "./chunk-G7TRU43D.js";
import {
  CommandModule,
  getAnalyticsInfoString,
  promptAnalytics,
  setAnalyticsConfig
} from "./chunk-YM7ILCS5.js";
import "./chunk-XG3HVNIL.js";
import "./chunk-GHUUJYOY.js";
import "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/analytics/info/cli.js
var AnalyticsInfoCommandModule = class extends CommandModule {
  command = "info";
  describe = "Prints analytics gathering and reporting configuration in the console.";
  builder(localYargs) {
    return localYargs.strict();
  }
  async run(_options) {
    this.context.logger.info(await getAnalyticsInfoString(this.context));
  }
};

// packages/angular/cli/src/commands/analytics/long-description.md
var long_description_default = "You can help the Angular Team to prioritize features and improvements by permitting the Angular team to send command-line command usage statistics to Google.\nThe Angular Team does not collect usage statistics unless you explicitly opt in. When installing the Angular CLI you are prompted to allow global collection of usage statistics.\nIf you say no or skip the prompt, no data is collected.\n\n### What is collected?\n\nUsage analytics include the commands and selected flags for each execution.\nUsage analytics may include the following information:\n\n- Your operating system \\(macOS, Linux distribution, Windows\\) and its version.\n- Package manager name and version \\(local version only\\).\n- Node.js version \\(local version only\\).\n- Angular CLI version \\(local version only\\).\n- Command name that was run.\n- Workspace information, the number of application and library projects.\n- For schematics commands \\(add, generate and new\\), the schematic collection and name and a list of selected flags.\n- For build commands \\(build, serve\\), the builder name, the number and size of bundles \\(initial and lazy\\), compilation units, the time it took to build and rebuild, and basic Angular-specific API usage.\n\nOnly Angular owned and developed schematics and builders are reported.\nThird-party schematics and builders do not send data to the Angular Team.\n";

// packages/angular/cli/src/commands/analytics/settings/cli.js
var AnalyticsSettingModule = class extends CommandModule {
  builder(localYargs) {
    return localYargs.option("global", {
      description: `Configure analytics gathering and reporting globally in the caller's home directory.`,
      alias: ["g"],
      type: "boolean",
      default: false
    }).strict();
  }
};
var AnalyticsDisableModule = class extends AnalyticsSettingModule {
  command = "disable";
  aliases = "off";
  describe = "Disables analytics gathering and reporting for the user.";
  async run({ global }) {
    await setAnalyticsConfig(global, false);
    process.stderr.write(await getAnalyticsInfoString(this.context));
  }
};
var AnalyticsEnableModule = class extends AnalyticsSettingModule {
  command = "enable";
  aliases = "on";
  describe = "Enables analytics gathering and reporting for the user.";
  async run({ global }) {
    await setAnalyticsConfig(global, true);
    process.stderr.write(await getAnalyticsInfoString(this.context));
  }
};
var AnalyticsPromptModule = class extends AnalyticsSettingModule {
  command = "prompt";
  describe = "Prompts the user to set the analytics gathering status interactively.";
  async run({ global }) {
    await promptAnalytics(this.context, global, true);
  }
};

// packages/angular/cli/src/commands/analytics/cli.js
var AnalyticsCommandModule = class extends CommandModule {
  command = "analytics";
  describe = "Configures the gathering of Angular CLI usage metrics.";
  longDescription = long_description_default;
  builder(localYargs) {
    const subcommands = [
      AnalyticsInfoCommandModule,
      AnalyticsDisableModule,
      AnalyticsEnableModule,
      AnalyticsPromptModule
    ].sort();
    for (const module of subcommands) {
      addCommandModuleToYargs(module, this.context);
    }
    return localYargs.demandCommand(1, demandCommandFailureMessage).strict();
  }
  run(_options) {
  }
};
export {
  AnalyticsCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
