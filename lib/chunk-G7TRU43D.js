import {
  CommandModuleError,
  CommandScope
} from "./chunk-YM7ILCS5.js";

// packages/angular/cli/src/command-builder/utilities/command.js
var demandCommandFailureMessage = `You need to specify a command before moving on. Use '--help' to view the available commands.`;
function addCommandModuleToYargs(commandModule, context) {
  const cmd = new commandModule(context);
  const { args: { options: { jsonHelp } }, workspace } = context;
  const describe = jsonHelp ? cmd.fullDescribe : cmd.describe;
  context.yargsInstance.command({
    command: cmd.command,
    aliases: cmd.aliases,
    describe: (
      // We cannot add custom fields in help, such as long command description which is used in AIO.
      // Therefore, we get around this by adding a complex object as a string which we later parse when generating the help files.
      typeof describe === "object" ? JSON.stringify(describe) : describe
    ),
    deprecated: cmd.deprecated,
    builder: (argv) => {
      const isInvalidScope = !jsonHelp && (cmd.scope === CommandScope.In && !workspace || cmd.scope === CommandScope.Out && workspace);
      if (isInvalidScope) {
        throw new CommandModuleError(`This command is not available when running the Angular CLI ${workspace ? "inside" : "outside"} a workspace.`);
      }
      return cmd.builder(argv);
    },
    handler: (args) => cmd.handler(args)
  });
}

export {
  demandCommandFailureMessage,
  addCommandModuleToYargs
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
