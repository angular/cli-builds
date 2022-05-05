"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAutocomplete = exports.considerSettingUpAutocompletion = void 0;
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const process_1 = require("process");
const color_1 = require("../utilities/color");
const config_1 = require("../utilities/config");
const environment_options_1 = require("../utilities/environment-options");
const tty_1 = require("../utilities/tty");
/**
 * Checks if it is appropriate to prompt the user to setup autocompletion. If not, does nothing. If
 * so prompts and sets up autocompletion for the user. Returns an exit code if the program should
 * terminate, otherwise returns `undefined`.
 * @returns an exit code if the program should terminate, undefined otherwise.
 */
async function considerSettingUpAutocompletion(command, logger) {
    // Check if we should prompt the user to setup autocompletion.
    const completionConfig = await getCompletionConfig();
    if (!(await shouldPromptForAutocompletionSetup(command, completionConfig))) {
        return undefined; // Already set up or prompted previously, nothing to do.
    }
    // Prompt the user and record their response.
    const shouldSetupAutocompletion = await promptForAutocompletion();
    if (!shouldSetupAutocompletion) {
        // User rejected the prompt and doesn't want autocompletion.
        logger.info(`
Ok, you won't be prompted again. Should you change your mind, the following command will set up autocompletion for you:

    ${color_1.colors.yellow(`ng completion`)}
    `.trim());
        // Save configuration to remember that the user was prompted and avoid prompting again.
        await setCompletionConfig({ ...completionConfig, prompted: true });
        return undefined;
    }
    // User accepted the prompt, set up autocompletion.
    let rcFile;
    try {
        rcFile = await initializeAutocomplete();
    }
    catch (err) {
        // Failed to set up autocompeletion, log the error and abort.
        logger.error(err.message);
        return 1;
    }
    // Notify the user autocompletion was set up successfully.
    logger.info(`
Appended \`source <(ng completion script)\` to \`${rcFile}\`. Restart your terminal or run the following to autocomplete \`ng\` commands:

    ${color_1.colors.yellow(`source <(ng completion script)`)}
    `.trim());
    // Save configuration to remember that the user was prompted.
    await setCompletionConfig({ ...completionConfig, prompted: true });
    return undefined;
}
exports.considerSettingUpAutocompletion = considerSettingUpAutocompletion;
async function getCompletionConfig() {
    var _a;
    const wksp = await (0, config_1.getWorkspace)('global');
    return (_a = wksp === null || wksp === void 0 ? void 0 : wksp.getCli()) === null || _a === void 0 ? void 0 : _a['completion'];
}
async function setCompletionConfig(config) {
    var _a;
    var _b;
    const wksp = await (0, config_1.getWorkspace)('global');
    if (!wksp) {
        throw new Error(`Could not find global workspace`);
    }
    (_a = (_b = wksp.extensions)['cli']) !== null && _a !== void 0 ? _a : (_b['cli'] = {});
    const cli = wksp.extensions['cli'];
    if (!core_1.json.isJsonObject(cli)) {
        throw new Error(`Invalid config found at ${wksp.filePath}. \`extensions.cli\` should be an object.`);
    }
    cli.completion = config;
    await wksp.save();
}
async function shouldPromptForAutocompletionSetup(command, config) {
    // Force whether or not to prompt for autocomplete to give an easy path for e2e testing to skip.
    if (environment_options_1.forceAutocomplete !== undefined) {
        return environment_options_1.forceAutocomplete;
    }
    // Don't prompt on `ng update` or `ng completion`.
    if (command === 'update' || command === 'completion') {
        return false;
    }
    // Non-interactive and continuous integration systems don't care about autocompletion.
    if (!(0, tty_1.isTTY)()) {
        return false;
    }
    // Skip prompt if the user has already been prompted.
    if (config === null || config === void 0 ? void 0 : config.prompted) {
        return false;
    }
    // `$HOME` variable is necessary to find RC files to modify.
    const home = process_1.env['HOME'];
    if (!home) {
        return false;
    }
    // Get possible RC files for the current shell.
    const shell = process_1.env['SHELL'];
    if (!shell) {
        return false;
    }
    const rcFiles = getShellRunCommandCandidates(shell, home);
    if (!rcFiles) {
        return false; // Unknown shell.
    }
    // Check each RC file if they already use `ng completion script` in any capacity and don't prompt.
    for (const rcFile of rcFiles) {
        const contents = await fs_1.promises.readFile(rcFile, 'utf-8').catch(() => undefined);
        if (contents === null || contents === void 0 ? void 0 : contents.includes('ng completion script')) {
            return false;
        }
    }
    return true;
}
async function promptForAutocompletion() {
    // Dynamically load `inquirer` so users don't have to pay the cost of parsing and executing it for
    // the 99% of builds that *don't* prompt for autocompletion.
    const { prompt } = await Promise.resolve().then(() => __importStar(require('inquirer')));
    const { autocomplete } = await prompt([
        {
            name: 'autocomplete',
            type: 'confirm',
            message: `
Would you like to enable autocompletion? This will set up your terminal so pressing TAB while typing
Angular CLI commands will show possible options and autocomplete arguments. (Enabling autocompletion
will modify configuration files in your home directory.)
      `
                .split('\n')
                .join(' ')
                .trim(),
            default: true,
        },
    ]);
    return autocomplete;
}
/**
 * Sets up autocompletion for the user's terminal. This attempts to find the configuration file for
 * the current shell (`.bashrc`, `.zshrc`, etc.) and append a command which enables autocompletion
 * for the Angular CLI. Supports only Bash and Zsh. Returns whether or not it was successful.
 * @return The full path of the configuration file modified.
 */
async function initializeAutocomplete() {
    var _a, _b;
    // Get the currently active `$SHELL` and `$HOME` environment variables.
    const shell = process_1.env['SHELL'];
    if (!shell) {
        throw new Error('`$SHELL` environment variable not set. Angular CLI autocompletion only supports Bash or' +
            " Zsh. If you're on Windows, Cmd and Powershell don't support command autocompletion," +
            ' but Git Bash or Windows Subsystem for Linux should work, so please try again in one of' +
            ' those environments.');
    }
    const home = process_1.env['HOME'];
    if (!home) {
        throw new Error('`$HOME` environment variable not set. Setting up autocompletion modifies configuration files' +
            ' in the home directory and must be set.');
    }
    // Get all the files we can add `ng completion` to which apply to the user's `$SHELL`.
    const runCommandCandidates = getShellRunCommandCandidates(shell, home);
    if (!runCommandCandidates) {
        throw new Error(`Unknown \`$SHELL\` environment variable value (${shell}). Angular CLI autocompletion only supports Bash or Zsh.`);
    }
    // Get the first file that already exists or fallback to a new file of the first candidate.
    const candidates = await Promise.allSettled(runCommandCandidates.map((rcFile) => fs_1.promises.access(rcFile).then(() => rcFile)));
    const rcFile = (_b = (_a = candidates.find((result) => result.status === 'fulfilled')) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : runCommandCandidates[0];
    // Append Angular autocompletion setup to RC file.
    try {
        await fs_1.promises.appendFile(rcFile, '\n\n# Load Angular CLI autocompletion.\nsource <(ng completion script)\n');
    }
    catch (err) {
        throw new Error(`Failed to append autocompletion setup to \`${rcFile}\`:\n${err.message}`);
    }
    return rcFile;
}
exports.initializeAutocomplete = initializeAutocomplete;
/** Returns an ordered list of possible candidates of RC files used by the given shell. */
function getShellRunCommandCandidates(shell, home) {
    if (shell.toLowerCase().includes('bash')) {
        return ['.bashrc', '.bash_profile', '.profile'].map((file) => path.join(home, file));
    }
    else if (shell.toLowerCase().includes('zsh')) {
        return ['.zshrc', '.zsh_profile', '.profile'].map((file) => path.join(home, file));
    }
    else {
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy91dGlsaXRpZXMvY29tcGxldGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFxRDtBQUNyRCwyQkFBb0M7QUFDcEMsMkNBQTZCO0FBQzdCLHFDQUE4QjtBQUM5Qiw4Q0FBNEM7QUFDNUMsZ0RBQW1EO0FBQ25ELDBFQUFxRTtBQUNyRSwwQ0FBeUM7QUFXekM7Ozs7O0dBS0c7QUFDSSxLQUFLLFVBQVUsK0JBQStCLENBQ25ELE9BQWUsRUFDZixNQUFzQjtJQUV0Qiw4REFBOEQ7SUFDOUQsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLG1CQUFtQixFQUFFLENBQUM7SUFDckQsSUFBSSxDQUFDLENBQUMsTUFBTSxrQ0FBa0MsQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFO1FBQzFFLE9BQU8sU0FBUyxDQUFDLENBQUMsd0RBQXdEO0tBQzNFO0lBRUQsNkNBQTZDO0lBQzdDLE1BQU0seUJBQXlCLEdBQUcsTUFBTSx1QkFBdUIsRUFBRSxDQUFDO0lBQ2xFLElBQUksQ0FBQyx5QkFBeUIsRUFBRTtRQUM5Qiw0REFBNEQ7UUFDNUQsTUFBTSxDQUFDLElBQUksQ0FDVDs7O01BR0EsY0FBTSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUM7S0FDL0IsQ0FBQyxJQUFJLEVBQUUsQ0FDUCxDQUFDO1FBRUYsdUZBQXVGO1FBQ3ZGLE1BQU0sbUJBQW1CLENBQUMsRUFBRSxHQUFHLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRW5FLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0lBRUQsbURBQW1EO0lBQ25ELElBQUksTUFBYyxDQUFDO0lBQ25CLElBQUk7UUFDRixNQUFNLEdBQUcsTUFB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U0FBUyxFQUFFLGVBQWUsRUFBRSxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDdEY7U0FBTSxJQUFJLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDOUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ3BGO1NBQU07UUFDTCxPQUFPLFNBQVMsQ0FBQztLQUNsQjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsganNvbiwgbG9nZ2luZyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHByb21pc2VzIGFzIGZzIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGVudiB9IGZyb20gJ3Byb2Nlc3MnO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgZm9yY2VBdXRvY29tcGxldGUgfSBmcm9tICcuLi91dGlsaXRpZXMvZW52aXJvbm1lbnQtb3B0aW9ucyc7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4uL3V0aWxpdGllcy90dHknO1xuXG4vKiogSW50ZXJmYWNlIGZvciB0aGUgYXV0b2NvbXBsZXRpb24gY29uZmlndXJhdGlvbiBzdG9yZWQgaW4gdGhlIGdsb2JhbCB3b3Jrc3BhY2UuICovXG5pbnRlcmZhY2UgQ29tcGxldGlvbkNvbmZpZyB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIG9yIG5vdCB0aGUgdXNlciBoYXMgYmVlbiBwcm9tcHRlZCB0byBzZXQgdXAgYXV0b2NvbXBsZXRpb24uIElmIGB0cnVlYCwgc2hvdWxkICpub3QqXG4gICAqIHByb21wdCB0aGVtIGFnYWluLlxuICAgKi9cbiAgcHJvbXB0ZWQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBpdCBpcyBhcHByb3ByaWF0ZSB0byBwcm9tcHQgdGhlIHVzZXIgdG8gc2V0dXAgYXV0b2NvbXBsZXRpb24uIElmIG5vdCwgZG9lcyBub3RoaW5nLiBJZlxuICogc28gcHJvbXB0cyBhbmQgc2V0cyB1cCBhdXRvY29tcGxldGlvbiBmb3IgdGhlIHVzZXIuIFJldHVybnMgYW4gZXhpdCBjb2RlIGlmIHRoZSBwcm9ncmFtIHNob3VsZFxuICogdGVybWluYXRlLCBvdGhlcndpc2UgcmV0dXJucyBgdW5kZWZpbmVkYC5cbiAqIEByZXR1cm5zIGFuIGV4aXQgY29kZSBpZiB0aGUgcHJvZ3JhbSBzaG91bGQgdGVybWluYXRlLCB1bmRlZmluZWQgb3RoZXJ3aXNlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29uc2lkZXJTZXR0aW5nVXBBdXRvY29tcGxldGlvbihcbiAgY29tbWFuZDogc3RyaW5nLFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyLFxuKTogUHJvbWlzZTxudW1iZXIgfCB1bmRlZmluZWQ+IHtcbiAgLy8gQ2hlY2sgaWYgd2Ugc2hvdWxkIHByb21wdCB0aGUgdXNlciB0byBzZXR1cCBhdXRvY29tcGxldGlvbi5cbiAgY29uc3QgY29tcGxldGlvbkNvbmZpZyA9IGF3YWl0IGdldENvbXBsZXRpb25Db25maWcoKTtcbiAgaWYgKCEoYXdhaXQgc2hvdWxkUHJvbXB0Rm9yQXV0b2NvbXBsZXRpb25TZXR1cChjb21tYW5kLCBjb21wbGV0aW9uQ29uZmlnKSkpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkOyAvLyBBbHJlYWR5IHNldCB1cCBvciBwcm9tcHRlZCBwcmV2aW91c2x5LCBub3RoaW5nIHRvIGRvLlxuICB9XG5cbiAgLy8gUHJvbXB0IHRoZSB1c2VyIGFuZCByZWNvcmQgdGhlaXIgcmVzcG9uc2UuXG4gIGNvbnN0IHNob3VsZFNldHVwQXV0b2NvbXBsZXRpb24gPSBhd2FpdCBwcm9tcHRGb3JBdXRvY29tcGxldGlvbigpO1xuICBpZiAoIXNob3VsZFNldHVwQXV0b2NvbXBsZXRpb24pIHtcbiAgICAvLyBVc2VyIHJlamVjdGVkIHRoZSBwcm9tcHQgYW5kIGRvZXNuJ3Qgd2FudCBhdXRvY29tcGxldGlvbi5cbiAgICBsb2dnZXIuaW5mbyhcbiAgICAgIGBcbk9rLCB5b3Ugd29uJ3QgYmUgcHJvbXB0ZWQgYWdhaW4uIFNob3VsZCB5b3UgY2hhbmdlIHlvdXIgbWluZCwgdGhlIGZvbGxvd2luZyBjb21tYW5kIHdpbGwgc2V0IHVwIGF1dG9jb21wbGV0aW9uIGZvciB5b3U6XG5cbiAgICAke2NvbG9ycy55ZWxsb3coYG5nIGNvbXBsZXRpb25gKX1cbiAgICBgLnRyaW0oKSxcbiAgICApO1xuXG4gICAgLy8gU2F2ZSBjb25maWd1cmF0aW9uIHRvIHJlbWVtYmVyIHRoYXQgdGhlIHVzZXIgd2FzIHByb21wdGVkIGFuZCBhdm9pZCBwcm9tcHRpbmcgYWdhaW4uXG4gICAgYXdhaXQgc2V0Q29tcGxldGlvbkNvbmZpZyh7IC4uLmNvbXBsZXRpb25Db25maWcsIHByb21wdGVkOiB0cnVlIH0pO1xuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIFVzZXIgYWNjZXB0ZWQgdGhlIHByb21wdCwgc2V0IHVwIGF1dG9jb21wbGV0aW9uLlxuICBsZXQgcmNGaWxlOiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgcmNGaWxlID0gYXdhaXQgaW5pdGlhbGl6ZUF1dG9jb21wbGV0ZSgpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICAvLyBGYWlsZWQgdG8gc2V0IHVwIGF1dG9jb21wZWxldGlvbiwgbG9nIHRoZSBlcnJvciBhbmQgYWJvcnQuXG4gICAgbG9nZ2VyLmVycm9yKGVyci5tZXNzYWdlKTtcblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgLy8gTm90aWZ5IHRoZSB1c2VyIGF1dG9jb21wbGV0aW9uIHdhcyBzZXQgdXAgc3VjY2Vzc2Z1bGx5LlxuICBsb2dnZXIuaW5mbyhcbiAgICBgXG5BcHBlbmRlZCBcXGBzb3VyY2UgPChuZyBjb21wbGV0aW9uIHNjcmlwdClcXGAgdG8gXFxgJHtyY0ZpbGV9XFxgLiBSZXN0YXJ0IHlvdXIgdGVybWluYWwgb3IgcnVuIHRoZSBmb2xsb3dpbmcgdG8gYXV0b2NvbXBsZXRlIFxcYG5nXFxgIGNvbW1hbmRzOlxuXG4gICAgJHtjb2xvcnMueWVsbG93KGBzb3VyY2UgPChuZyBjb21wbGV0aW9uIHNjcmlwdClgKX1cbiAgICBgLnRyaW0oKSxcbiAgKTtcblxuICAvLyBTYXZlIGNvbmZpZ3VyYXRpb24gdG8gcmVtZW1iZXIgdGhhdCB0aGUgdXNlciB3YXMgcHJvbXB0ZWQuXG4gIGF3YWl0IHNldENvbXBsZXRpb25Db25maWcoeyAuLi5jb21wbGV0aW9uQ29uZmlnLCBwcm9tcHRlZDogdHJ1ZSB9KTtcblxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRDb21wbGV0aW9uQ29uZmlnKCk6IFByb21pc2U8Q29tcGxldGlvbkNvbmZpZyB8IHVuZGVmaW5lZD4ge1xuICBjb25zdCB3a3NwID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcblxuICByZXR1cm4gd2tzcD8uZ2V0Q2xpKCk/LlsnY29tcGxldGlvbiddO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzZXRDb21wbGV0aW9uQ29uZmlnKGNvbmZpZzogQ29tcGxldGlvbkNvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB3a3NwID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcbiAgaWYgKCF3a3NwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBnbG9iYWwgd29ya3NwYWNlYCk7XG4gIH1cblxuICB3a3NwLmV4dGVuc2lvbnNbJ2NsaSddID8/PSB7fTtcbiAgY29uc3QgY2xpID0gd2tzcC5leHRlbnNpb25zWydjbGknXTtcbiAgaWYgKCFqc29uLmlzSnNvbk9iamVjdChjbGkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEludmFsaWQgY29uZmlnIGZvdW5kIGF0ICR7d2tzcC5maWxlUGF0aH0uIFxcYGV4dGVuc2lvbnMuY2xpXFxgIHNob3VsZCBiZSBhbiBvYmplY3QuYCxcbiAgICApO1xuICB9XG4gIGNsaS5jb21wbGV0aW9uID0gY29uZmlnIGFzIGpzb24uSnNvbk9iamVjdDtcbiAgYXdhaXQgd2tzcC5zYXZlKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNob3VsZFByb21wdEZvckF1dG9jb21wbGV0aW9uU2V0dXAoXG4gIGNvbW1hbmQ6IHN0cmluZyxcbiAgY29uZmlnPzogQ29tcGxldGlvbkNvbmZpZyxcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAvLyBGb3JjZSB3aGV0aGVyIG9yIG5vdCB0byBwcm9tcHQgZm9yIGF1dG9jb21wbGV0ZSB0byBnaXZlIGFuIGVhc3kgcGF0aCBmb3IgZTJlIHRlc3RpbmcgdG8gc2tpcC5cbiAgaWYgKGZvcmNlQXV0b2NvbXBsZXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZm9yY2VBdXRvY29tcGxldGU7XG4gIH1cblxuICAvLyBEb24ndCBwcm9tcHQgb24gYG5nIHVwZGF0ZWAgb3IgYG5nIGNvbXBsZXRpb25gLlxuICBpZiAoY29tbWFuZCA9PT0gJ3VwZGF0ZScgfHwgY29tbWFuZCA9PT0gJ2NvbXBsZXRpb24nKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gTm9uLWludGVyYWN0aXZlIGFuZCBjb250aW51b3VzIGludGVncmF0aW9uIHN5c3RlbXMgZG9uJ3QgY2FyZSBhYm91dCBhdXRvY29tcGxldGlvbi5cbiAgaWYgKCFpc1RUWSgpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gU2tpcCBwcm9tcHQgaWYgdGhlIHVzZXIgaGFzIGFscmVhZHkgYmVlbiBwcm9tcHRlZC5cbiAgaWYgKGNvbmZpZz8ucHJvbXB0ZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBgJEhPTUVgIHZhcmlhYmxlIGlzIG5lY2Vzc2FyeSB0byBmaW5kIFJDIGZpbGVzIHRvIG1vZGlmeS5cbiAgY29uc3QgaG9tZSA9IGVudlsnSE9NRSddO1xuICBpZiAoIWhvbWUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBHZXQgcG9zc2libGUgUkMgZmlsZXMgZm9yIHRoZSBjdXJyZW50IHNoZWxsLlxuICBjb25zdCBzaGVsbCA9IGVudlsnU0hFTEwnXTtcbiAgaWYgKCFzaGVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCByY0ZpbGVzID0gZ2V0U2hlbGxSdW5Db21tYW5kQ2FuZGlkYXRlcyhzaGVsbCwgaG9tZSk7XG4gIGlmICghcmNGaWxlcykge1xuICAgIHJldHVybiBmYWxzZTsgLy8gVW5rbm93biBzaGVsbC5cbiAgfVxuXG4gIC8vIENoZWNrIGVhY2ggUkMgZmlsZSBpZiB0aGV5IGFscmVhZHkgdXNlIGBuZyBjb21wbGV0aW9uIHNjcmlwdGAgaW4gYW55IGNhcGFjaXR5IGFuZCBkb24ndCBwcm9tcHQuXG4gIGZvciAoY29uc3QgcmNGaWxlIG9mIHJjRmlsZXMpIHtcbiAgICBjb25zdCBjb250ZW50cyA9IGF3YWl0IGZzLnJlYWRGaWxlKHJjRmlsZSwgJ3V0Zi04JykuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKTtcbiAgICBpZiAoY29udGVudHM/LmluY2x1ZGVzKCduZyBjb21wbGV0aW9uIHNjcmlwdCcpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb21wdEZvckF1dG9jb21wbGV0aW9uKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAvLyBEeW5hbWljYWxseSBsb2FkIGBpbnF1aXJlcmAgc28gdXNlcnMgZG9uJ3QgaGF2ZSB0byBwYXkgdGhlIGNvc3Qgb2YgcGFyc2luZyBhbmQgZXhlY3V0aW5nIGl0IGZvclxuICAvLyB0aGUgOTklIG9mIGJ1aWxkcyB0aGF0ICpkb24ndCogcHJvbXB0IGZvciBhdXRvY29tcGxldGlvbi5cbiAgY29uc3QgeyBwcm9tcHQgfSA9IGF3YWl0IGltcG9ydCgnaW5xdWlyZXInKTtcbiAgY29uc3QgeyBhdXRvY29tcGxldGUgfSA9IGF3YWl0IHByb21wdDx7IGF1dG9jb21wbGV0ZTogYm9vbGVhbiB9PihbXG4gICAge1xuICAgICAgbmFtZTogJ2F1dG9jb21wbGV0ZScsXG4gICAgICB0eXBlOiAnY29uZmlybScsXG4gICAgICBtZXNzYWdlOiBgXG5Xb3VsZCB5b3UgbGlrZSB0byBlbmFibGUgYXV0b2NvbXBsZXRpb24/IFRoaXMgd2lsbCBzZXQgdXAgeW91ciB0ZXJtaW5hbCBzbyBwcmVzc2luZyBUQUIgd2hpbGUgdHlwaW5nXG5Bbmd1bGFyIENMSSBjb21tYW5kcyB3aWxsIHNob3cgcG9zc2libGUgb3B0aW9ucyBhbmQgYXV0b2NvbXBsZXRlIGFyZ3VtZW50cy4gKEVuYWJsaW5nIGF1dG9jb21wbGV0aW9uXG53aWxsIG1vZGlmeSBjb25maWd1cmF0aW9uIGZpbGVzIGluIHlvdXIgaG9tZSBkaXJlY3RvcnkuKVxuICAgICAgYFxuICAgICAgICAuc3BsaXQoJ1xcbicpXG4gICAgICAgIC5qb2luKCcgJylcbiAgICAgICAgLnRyaW0oKSxcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgfSxcbiAgXSk7XG5cbiAgcmV0dXJuIGF1dG9jb21wbGV0ZTtcbn1cblxuLyoqXG4gKiBTZXRzIHVwIGF1dG9jb21wbGV0aW9uIGZvciB0aGUgdXNlcidzIHRlcm1pbmFsLiBUaGlzIGF0dGVtcHRzIHRvIGZpbmQgdGhlIGNvbmZpZ3VyYXRpb24gZmlsZSBmb3JcbiAqIHRoZSBjdXJyZW50IHNoZWxsIChgLmJhc2hyY2AsIGAuenNocmNgLCBldGMuKSBhbmQgYXBwZW5kIGEgY29tbWFuZCB3aGljaCBlbmFibGVzIGF1dG9jb21wbGV0aW9uXG4gKiBmb3IgdGhlIEFuZ3VsYXIgQ0xJLiBTdXBwb3J0cyBvbmx5IEJhc2ggYW5kIFpzaC4gUmV0dXJucyB3aGV0aGVyIG9yIG5vdCBpdCB3YXMgc3VjY2Vzc2Z1bC5cbiAqIEByZXR1cm4gVGhlIGZ1bGwgcGF0aCBvZiB0aGUgY29uZmlndXJhdGlvbiBmaWxlIG1vZGlmaWVkLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5pdGlhbGl6ZUF1dG9jb21wbGV0ZSgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAvLyBHZXQgdGhlIGN1cnJlbnRseSBhY3RpdmUgYCRTSEVMTGAgYW5kIGAkSE9NRWAgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICBjb25zdCBzaGVsbCA9IGVudlsnU0hFTEwnXTtcbiAgaWYgKCFzaGVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdgJFNIRUxMYCBlbnZpcm9ubWVudCB2YXJpYWJsZSBub3Qgc2V0LiBBbmd1bGFyIENMSSBhdXRvY29tcGxldGlvbiBvbmx5IHN1cHBvcnRzIEJhc2ggb3InICtcbiAgICAgICAgXCIgWnNoLiBJZiB5b3UncmUgb24gV2luZG93cywgQ21kIGFuZCBQb3dlcnNoZWxsIGRvbid0IHN1cHBvcnQgY29tbWFuZCBhdXRvY29tcGxldGlvbixcIiArXG4gICAgICAgICcgYnV0IEdpdCBCYXNoIG9yIFdpbmRvd3MgU3Vic3lzdGVtIGZvciBMaW51eCBzaG91bGQgd29yaywgc28gcGxlYXNlIHRyeSBhZ2FpbiBpbiBvbmUgb2YnICtcbiAgICAgICAgJyB0aG9zZSBlbnZpcm9ubWVudHMuJyxcbiAgICApO1xuICB9XG4gIGNvbnN0IGhvbWUgPSBlbnZbJ0hPTUUnXTtcbiAgaWYgKCFob21lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ2AkSE9NRWAgZW52aXJvbm1lbnQgdmFyaWFibGUgbm90IHNldC4gU2V0dGluZyB1cCBhdXRvY29tcGxldGlvbiBtb2RpZmllcyBjb25maWd1cmF0aW9uIGZpbGVzJyArXG4gICAgICAgICcgaW4gdGhlIGhvbWUgZGlyZWN0b3J5IGFuZCBtdXN0IGJlIHNldC4nLFxuICAgICk7XG4gIH1cblxuICAvLyBHZXQgYWxsIHRoZSBmaWxlcyB3ZSBjYW4gYWRkIGBuZyBjb21wbGV0aW9uYCB0byB3aGljaCBhcHBseSB0byB0aGUgdXNlcidzIGAkU0hFTExgLlxuICBjb25zdCBydW5Db21tYW5kQ2FuZGlkYXRlcyA9IGdldFNoZWxsUnVuQ29tbWFuZENhbmRpZGF0ZXMoc2hlbGwsIGhvbWUpO1xuICBpZiAoIXJ1bkNvbW1hbmRDYW5kaWRhdGVzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFVua25vd24gXFxgJFNIRUxMXFxgIGVudmlyb25tZW50IHZhcmlhYmxlIHZhbHVlICgke3NoZWxsfSkuIEFuZ3VsYXIgQ0xJIGF1dG9jb21wbGV0aW9uIG9ubHkgc3VwcG9ydHMgQmFzaCBvciBac2guYCxcbiAgICApO1xuICB9XG5cbiAgLy8gR2V0IHRoZSBmaXJzdCBmaWxlIHRoYXQgYWxyZWFkeSBleGlzdHMgb3IgZmFsbGJhY2sgdG8gYSBuZXcgZmlsZSBvZiB0aGUgZmlyc3QgY2FuZGlkYXRlLlxuICBjb25zdCBjYW5kaWRhdGVzID0gYXdhaXQgUHJvbWlzZS5hbGxTZXR0bGVkKFxuICAgIHJ1bkNvbW1hbmRDYW5kaWRhdGVzLm1hcCgocmNGaWxlKSA9PiBmcy5hY2Nlc3MocmNGaWxlKS50aGVuKCgpID0+IHJjRmlsZSkpLFxuICApO1xuICBjb25zdCByY0ZpbGUgPVxuICAgIGNhbmRpZGF0ZXMuZmluZChcbiAgICAgIChyZXN1bHQpOiByZXN1bHQgaXMgUHJvbWlzZUZ1bGZpbGxlZFJlc3VsdDxzdHJpbmc+ID0+IHJlc3VsdC5zdGF0dXMgPT09ICdmdWxmaWxsZWQnLFxuICAgICk/LnZhbHVlID8/IHJ1bkNvbW1hbmRDYW5kaWRhdGVzWzBdO1xuXG4gIC8vIEFwcGVuZCBBbmd1bGFyIGF1dG9jb21wbGV0aW9uIHNldHVwIHRvIFJDIGZpbGUuXG4gIHRyeSB7XG4gICAgYXdhaXQgZnMuYXBwZW5kRmlsZShcbiAgICAgIHJjRmlsZSxcbiAgICAgICdcXG5cXG4jIExvYWQgQW5ndWxhciBDTEkgYXV0b2NvbXBsZXRpb24uXFxuc291cmNlIDwobmcgY29tcGxldGlvbiBzY3JpcHQpXFxuJyxcbiAgICApO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBhcHBlbmQgYXV0b2NvbXBsZXRpb24gc2V0dXAgdG8gXFxgJHtyY0ZpbGV9XFxgOlxcbiR7ZXJyLm1lc3NhZ2V9YCk7XG4gIH1cblxuICByZXR1cm4gcmNGaWxlO1xufVxuXG4vKiogUmV0dXJucyBhbiBvcmRlcmVkIGxpc3Qgb2YgcG9zc2libGUgY2FuZGlkYXRlcyBvZiBSQyBmaWxlcyB1c2VkIGJ5IHRoZSBnaXZlbiBzaGVsbC4gKi9cbmZ1bmN0aW9uIGdldFNoZWxsUnVuQ29tbWFuZENhbmRpZGF0ZXMoc2hlbGw6IHN0cmluZywgaG9tZTogc3RyaW5nKTogc3RyaW5nW10gfCB1bmRlZmluZWQge1xuICBpZiAoc2hlbGwudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnYmFzaCcpKSB7XG4gICAgcmV0dXJuIFsnLmJhc2hyYycsICcuYmFzaF9wcm9maWxlJywgJy5wcm9maWxlJ10ubWFwKChmaWxlKSA9PiBwYXRoLmpvaW4oaG9tZSwgZmlsZSkpO1xuICB9IGVsc2UgaWYgKHNoZWxsLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3pzaCcpKSB7XG4gICAgcmV0dXJuIFsnLnpzaHJjJywgJy56c2hfcHJvZmlsZScsICcucHJvZmlsZSddLm1hcCgoZmlsZSkgPT4gcGF0aC5qb2luKGhvbWUsIGZpbGUpKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG4iXX0=