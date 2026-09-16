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
const command_module_1 = require("../../command-builder/command-module");
const command_1 = require("../../command-builder/utilities/command");
const color_1 = require("../../utilities/color");
const completion_1 = require("../../utilities/completion");
const error_1 = require("../../utilities/error");
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore strict-deps: Markdown files are asset dependencies bundled/loaded at runtime
const long_description_md_1 = __importDefault(require("./long-description.md"));
class CompletionCommandModule extends command_module_1.CommandModule {
    command = 'completion';
    describe = 'Set up Angular CLI autocompletion for your terminal.';
    longDescription = long_description_md_1.default;
    builder(localYargs) {
        (0, command_1.addCommandModuleToYargs)(CompletionScriptCommandModule, this.context);
        return localYargs;
    }
    async run() {
        let rcFile;
        try {
            rcFile = await (0, completion_1.initializeAutocomplete)();
        }
        catch (err) {
            (0, error_1.assertIsError)(err);
            this.context.logger.error(err.message);
            return 1;
        }
        this.context.logger.info(`
Appended \`source <(ng completion script)\` to \`${rcFile}\`. Restart your terminal or run the following to autocomplete \`ng\` commands:

    ${color_1.colors.yellow('source <(ng completion script)')}
      `.trim());
        if ((await (0, completion_1.hasGlobalCliInstall)()) === false) {
            this.context.logger.warn('Setup completed successfully, but there does not seem to be a global install of the' +
                ' Angular CLI. For autocompletion to work, the CLI will need to be on your `$PATH`, which' +
                ' is typically done with the `-g` flag in `npm install -g @angular/cli`.' +
                '\n\n' +
                'For more information, see https://angular.dev/cli/completion#global-install');
        }
        return 0;
    }
}
exports.default = CompletionCommandModule;
class CompletionScriptCommandModule extends command_module_1.CommandModule {
    command = 'script';
    describe = 'Generate a bash and zsh real-time type-ahead autocompletion script.';
    builder(localYargs) {
        return localYargs;
    }
    run() {
        this.context.yargsInstance.showCompletionScript();
    }
}
//# sourceMappingURL=cli.js.map