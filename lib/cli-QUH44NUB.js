import {
  addCommandModuleToYargs
} from "./chunk-G7TRU43D.js";
import {
  CommandModule,
  hasGlobalCliInstall,
  initializeAutocomplete
} from "./chunk-YM7ILCS5.js";
import "./chunk-XG3HVNIL.js";
import {
  colors
} from "./chunk-GHUUJYOY.js";
import {
  assertIsError
} from "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/completion/long-description.md
var long_description_default = "Setting up autocompletion configures your terminal, so pressing the `<TAB>` key while in the middle\nof typing will display various commands and options available to you. This makes it very easy to\ndiscover and use CLI commands without lots of memorization.\n\n![A demo of Angular CLI autocompletion in a terminal. The user types several partial `ng` commands,\nusing autocompletion to finish several arguments and list contextual options.\n](assets/images/guide/cli/completion.gif)\n\n## Automated setup\n\nThe CLI should prompt and ask to set up autocompletion for you the first time you use it (v14+).\nSimply answer \"Yes\" and the CLI will take care of the rest.\n\n```\n$ ng serve\n? Would you like to enable autocompletion? This will set up your terminal so pressing TAB while typing Angular CLI commands will show possible options and autocomplete arguments. (Enabling autocompletion will modify configuration files in your home directory.) Yes\nAppended `source <(ng completion script)` to `/home/my-username/.bashrc`. Restart your terminal or run:\n\nsource <(ng completion script)\n\nto autocomplete `ng` commands.\n\n# Serve output...\n```\n\nIf you already refused the prompt, it won't ask again. But you can run `ng completion` to\ndo the same thing automatically.\n\nThis modifies your terminal environment to load Angular CLI autocompletion, but can't update your\ncurrent terminal session. Either restart it or run `source <(ng completion script)` directly to\nenable autocompletion in your current session.\n\nTest it out by typing `ng ser<TAB>` and it should autocomplete to `ng serve`. Ambiguous arguments\nwill show all possible options and their documentation, such as `ng generate <TAB>`.\n\n## Manual setup\n\nSome users may have highly customized terminal setups, possibly with configuration files checked\ninto source control with an opinionated structure. `ng completion` only ever appends Angular's setup\nto an existing configuration file for your current shell, or creates one if none exists. If you want\nmore control over exactly where this configuration lives, you can manually set it up by having your\nshell run at startup:\n\n```bash\nsource <(ng completion script)\n```\n\nThis is equivalent to what `ng completion` will automatically set up, and gives power users more\nflexibility in their environments when desired.\n\n## Platform support\n\nAngular CLI supports autocompletion for the Bash and Zsh shells on MacOS and Linux operating\nsystems. On Windows, Git Bash and [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/)\nusing Bash or Zsh are supported.\n\n## Global install\n\nAutocompletion works by configuring your terminal to invoke the Angular CLI on startup to load the\nsetup script. This means the terminal must be able to find and execute the Angular CLI, typically\nthrough a global install that places the binary on the user's `$PATH`. If you get\n`command not found: ng`, make sure the CLI is installed globally which you can do with the `-g`\nflag:\n\n```bash\nnpm install -g @angular/cli\n```\n";

// packages/angular/cli/src/commands/completion/cli.js
var CompletionCommandModule = class extends CommandModule {
  command = "completion";
  describe = "Set up Angular CLI autocompletion for your terminal.";
  longDescription = long_description_default;
  builder(localYargs) {
    addCommandModuleToYargs(CompletionScriptCommandModule, this.context);
    return localYargs;
  }
  async run() {
    let rcFile;
    try {
      rcFile = await initializeAutocomplete();
    } catch (err) {
      assertIsError(err);
      this.context.logger.error(err.message);
      return 1;
    }
    this.context.logger.info(`
Appended \`source <(ng completion script)\` to \`${rcFile}\`. Restart your terminal or run the following to autocomplete \`ng\` commands:

    ${colors.yellow("source <(ng completion script)")}
      `.trim());
    if (await hasGlobalCliInstall() === false) {
      this.context.logger.warn("Setup completed successfully, but there does not seem to be a global install of the Angular CLI. For autocompletion to work, the CLI will need to be on your `$PATH`, which is typically done with the `-g` flag in `npm install -g @angular/cli`.\n\nFor more information, see https://angular.dev/cli/completion#global-install");
    }
    return 0;
  }
};
var CompletionScriptCommandModule = class extends CommandModule {
  command = "script";
  describe = "Generate a bash and zsh real-time type-ahead autocompletion script.";
  builder(localYargs) {
    return localYargs;
  }
  run() {
    this.context.yargsInstance.showCompletionScript();
  }
};
export {
  CompletionCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
