import {
  ArchitectBaseCommandModule
} from "./chunk-DHWVZMLH.js";
import {
  CommandModuleError,
  CommandScope
} from "./chunk-YM7ILCS5.js";
import "./chunk-XG3HVNIL.js";
import "./chunk-GHUUJYOY.js";
import "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/run/long-description.md
var long_description_default = "Architect is the tool that the CLI uses to perform complex tasks such as compilation, according to provided configurations.\nThe CLI commands run Architect targets such as `build`, `serve`, `test`, and `lint`.\nEach named target has a default configuration, specified by an `options` object,\nand an optional set of named alternate configurations in the `configurations` object.\n\nFor example, the `serve` target for a newly generated app has a predefined\nalternate configuration named `production`.\n\nYou can define new targets and their configuration options in the `architect` section\nof the `angular.json` file which you can run them from the command line using the `ng run` command.\n";

// packages/angular/cli/src/commands/run/cli.js
var RunCommandModule = class extends ArchitectBaseCommandModule {
  scope = CommandScope.In;
  command = "run <target>";
  describe = "Runs an Architect target with an optional custom builder configuration defined in your project.";
  longDescription = long_description_default;
  async builder(argv) {
    const { jsonHelp, getYargsCompletions, help } = this.context.args.options;
    const localYargs = argv.positional("target", {
      describe: "The Architect target to run provided in the following format `project:target[:configuration]`.",
      type: "string",
      demandOption: true,
      // Show only in when using --help and auto completion because otherwise comma seperated configuration values will be invalid.
      // Also, hide choices from JSON help so that we don't display them in AIO.
      choices: (getYargsCompletions || help) && !jsonHelp ? this.getTargetChoices() : void 0
    }).middleware((args) => {
      const { configuration, target: target2 } = args;
      if (typeof configuration === "string" && target2) {
        const targetWithConfig = target2.split(":", 2);
        targetWithConfig.push(configuration);
        throw new CommandModuleError(`Unknown argument: configuration.
Provide the configuration as part of the target 'ng run ${targetWithConfig.join(":")}'.`);
      }
    }, true).strict();
    const target = this.makeTargetSpecifier();
    if (!target) {
      return localYargs;
    }
    const schemaOptions = await this.getArchitectTargetOptions(target);
    return this.addSchemaOptionsToCommand(localYargs, schemaOptions);
  }
  async run(options) {
    const target = this.makeTargetSpecifier(options);
    const { target: _target, ...extraOptions } = options;
    if (!target) {
      throw new CommandModuleError("Cannot determine project or target.");
    }
    return this.runSingleTarget(target, extraOptions);
  }
  makeTargetSpecifier(options) {
    const architectTarget = options?.target ?? this.context.args.positional[1];
    if (!architectTarget) {
      return void 0;
    }
    const [project = "", target = "", configuration] = architectTarget.split(":");
    return {
      project,
      target,
      configuration
    };
  }
  /** @returns a sorted list of target specifiers to be used for auto completion. */
  getTargetChoices() {
    if (!this.context.workspace) {
      return;
    }
    const targets = [];
    for (const [projectName, project] of this.context.workspace.projects) {
      for (const [targetName, target] of project.targets) {
        const currentTarget = `${projectName}:${targetName}`;
        targets.push(currentTarget);
        if (!target.configurations) {
          continue;
        }
        for (const configName of Object.keys(target.configurations)) {
          targets.push(`${currentTarget}:${configName}`);
        }
      }
    }
    return targets.sort();
  }
};
export {
  RunCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
