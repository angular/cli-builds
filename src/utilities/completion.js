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
            ' Zsh.');
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
/** Returns an ordered list of possibile candidates of RC files used by the given shell. */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy91dGlsaXRpZXMvY29tcGxldGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFxRDtBQUNyRCwyQkFBb0M7QUFDcEMsMkNBQTZCO0FBQzdCLHFDQUE4QjtBQUM5Qiw4Q0FBNEM7QUFDNUMsZ0RBQW1EO0FBQ25ELDBFQUFxRTtBQUNyRSwwQ0FBeUM7QUFXekM7Ozs7O0dBS0c7QUFDSSxLQUFLLFVBQVUsK0JBQStCLENBQ25ELE9BQWUsRUFDZixNQUFzQjtJQUV0Qiw4REFBOEQ7SUFDOUQsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLG1CQUFtQixFQUFFLENBQUM7SUFDckQsSUFBSSxDQUFDLENBQUMsTUFBTSxrQ0FBa0MsQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFO1FBQzFFLE9BQU8sU0FBUyxDQUFDLENBQUMsd0RBQXdEO0tBQzNFO0lBRUQsNkNBQTZDO0lBQzdDLE1BQU0seUJBQXlCLEdBQUcsTUFBTSx1QkFBdUIsRUFBRSxDQUFDO0lBQ2xFLElBQUksQ0FBQyx5QkFBeUIsRUFBRTtRQUM5Qiw0REFBNEQ7UUFDNUQsTUFBTSxDQUFDLElBQUksQ0FDVDs7O01BR0EsY0FBTSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUM7S0FDL0IsQ0FBQyxJQUFJLEVBQUUsQ0FDUCxDQUFDO1FBRUYsdUZBQXVGO1FBQ3ZGLE1BQU0sbUJBQW1CLENBQUMsRUFBRSxHQUFHLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRW5FLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0lBRUQsbURBQW1EO0lBQ25ELElBQUksTUFBYyxDQUFDO0lBQ25CLElBQUk7UUFDRixNQUFNLEdBQUcsTUFB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LENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ3RGO1NBQU0sSUFBSSxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQzlDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUNwRjtTQUFNO1FBQ0wsT0FBTyxTQUFTLENBQUM7S0FDbEI7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpzb24sIGxvZ2dpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBwcm9taXNlcyBhcyBmcyB9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBlbnYgfSBmcm9tICdwcm9jZXNzJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IGZvcmNlQXV0b2NvbXBsZXRlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2Vudmlyb25tZW50LW9wdGlvbnMnO1xuaW1wb3J0IHsgaXNUVFkgfSBmcm9tICcuLi91dGlsaXRpZXMvdHR5JztcblxuLyoqIEludGVyZmFjZSBmb3IgdGhlIGF1dG9jb21wbGV0aW9uIGNvbmZpZ3VyYXRpb24gc3RvcmVkIGluIHRoZSBnbG9iYWwgd29ya3NwYWNlLiAqL1xuaW50ZXJmYWNlIENvbXBsZXRpb25Db25maWcge1xuICAvKipcbiAgICogV2hldGhlciBvciBub3QgdGhlIHVzZXIgaGFzIGJlZW4gcHJvbXB0ZWQgdG8gc2V0IHVwIGF1dG9jb21wbGV0aW9uLiBJZiBgdHJ1ZWAsIHNob3VsZCAqbm90KlxuICAgKiBwcm9tcHQgdGhlbSBhZ2Fpbi5cbiAgICovXG4gIHByb21wdGVkPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgaXQgaXMgYXBwcm9wcmlhdGUgdG8gcHJvbXB0IHRoZSB1c2VyIHRvIHNldHVwIGF1dG9jb21wbGV0aW9uLiBJZiBub3QsIGRvZXMgbm90aGluZy4gSWZcbiAqIHNvIHByb21wdHMgYW5kIHNldHMgdXAgYXV0b2NvbXBsZXRpb24gZm9yIHRoZSB1c2VyLiBSZXR1cm5zIGFuIGV4aXQgY29kZSBpZiB0aGUgcHJvZ3JhbSBzaG91bGRcbiAqIHRlcm1pbmF0ZSwgb3RoZXJ3aXNlIHJldHVybnMgYHVuZGVmaW5lZGAuXG4gKiBAcmV0dXJucyBhbiBleGl0IGNvZGUgaWYgdGhlIHByb2dyYW0gc2hvdWxkIHRlcm1pbmF0ZSwgdW5kZWZpbmVkIG90aGVyd2lzZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbnNpZGVyU2V0dGluZ1VwQXV0b2NvbXBsZXRpb24oXG4gIGNvbW1hbmQ6IHN0cmluZyxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcixcbik6IFByb21pc2U8bnVtYmVyIHwgdW5kZWZpbmVkPiB7XG4gIC8vIENoZWNrIGlmIHdlIHNob3VsZCBwcm9tcHQgdGhlIHVzZXIgdG8gc2V0dXAgYXV0b2NvbXBsZXRpb24uXG4gIGNvbnN0IGNvbXBsZXRpb25Db25maWcgPSBhd2FpdCBnZXRDb21wbGV0aW9uQ29uZmlnKCk7XG4gIGlmICghKGF3YWl0IHNob3VsZFByb21wdEZvckF1dG9jb21wbGV0aW9uU2V0dXAoY29tbWFuZCwgY29tcGxldGlvbkNvbmZpZykpKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDsgLy8gQWxyZWFkeSBzZXQgdXAgb3IgcHJvbXB0ZWQgcHJldmlvdXNseSwgbm90aGluZyB0byBkby5cbiAgfVxuXG4gIC8vIFByb21wdCB0aGUgdXNlciBhbmQgcmVjb3JkIHRoZWlyIHJlc3BvbnNlLlxuICBjb25zdCBzaG91bGRTZXR1cEF1dG9jb21wbGV0aW9uID0gYXdhaXQgcHJvbXB0Rm9yQXV0b2NvbXBsZXRpb24oKTtcbiAgaWYgKCFzaG91bGRTZXR1cEF1dG9jb21wbGV0aW9uKSB7XG4gICAgLy8gVXNlciByZWplY3RlZCB0aGUgcHJvbXB0IGFuZCBkb2Vzbid0IHdhbnQgYXV0b2NvbXBsZXRpb24uXG4gICAgbG9nZ2VyLmluZm8oXG4gICAgICBgXG5PaywgeW91IHdvbid0IGJlIHByb21wdGVkIGFnYWluLiBTaG91bGQgeW91IGNoYW5nZSB5b3VyIG1pbmQsIHRoZSBmb2xsb3dpbmcgY29tbWFuZCB3aWxsIHNldCB1cCBhdXRvY29tcGxldGlvbiBmb3IgeW91OlxuXG4gICAgJHtjb2xvcnMueWVsbG93KGBuZyBjb21wbGV0aW9uYCl9XG4gICAgYC50cmltKCksXG4gICAgKTtcblxuICAgIC8vIFNhdmUgY29uZmlndXJhdGlvbiB0byByZW1lbWJlciB0aGF0IHRoZSB1c2VyIHdhcyBwcm9tcHRlZCBhbmQgYXZvaWQgcHJvbXB0aW5nIGFnYWluLlxuICAgIGF3YWl0IHNldENvbXBsZXRpb25Db25maWcoeyAuLi5jb21wbGV0aW9uQ29uZmlnLCBwcm9tcHRlZDogdHJ1ZSB9KTtcblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBVc2VyIGFjY2VwdGVkIHRoZSBwcm9tcHQsIHNldCB1cCBhdXRvY29tcGxldGlvbi5cbiAgbGV0IHJjRmlsZTogc3RyaW5nO1xuICB0cnkge1xuICAgIHJjRmlsZSA9IGF3YWl0IGluaXRpYWxpemVBdXRvY29tcGxldGUoKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgLy8gRmFpbGVkIHRvIHNldCB1cCBhdXRvY29tcGVsZXRpb24sIGxvZyB0aGUgZXJyb3IgYW5kIGFib3J0LlxuICAgIGxvZ2dlci5lcnJvcihlcnIubWVzc2FnZSk7XG5cbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIC8vIE5vdGlmeSB0aGUgdXNlciBhdXRvY29tcGxldGlvbiB3YXMgc2V0IHVwIHN1Y2Nlc3NmdWxseS5cbiAgbG9nZ2VyLmluZm8oXG4gICAgYFxuQXBwZW5kZWQgXFxgc291cmNlIDwobmcgY29tcGxldGlvbiBzY3JpcHQpXFxgIHRvIFxcYCR7cmNGaWxlfVxcYC4gUmVzdGFydCB5b3VyIHRlcm1pbmFsIG9yIHJ1biB0aGUgZm9sbG93aW5nIHRvIGF1dG9jb21wbGV0ZSBcXGBuZ1xcYCBjb21tYW5kczpcblxuICAgICR7Y29sb3JzLnllbGxvdyhgc291cmNlIDwobmcgY29tcGxldGlvbiBzY3JpcHQpYCl9XG4gICAgYC50cmltKCksXG4gICk7XG5cbiAgLy8gU2F2ZSBjb25maWd1cmF0aW9uIHRvIHJlbWVtYmVyIHRoYXQgdGhlIHVzZXIgd2FzIHByb21wdGVkLlxuICBhd2FpdCBzZXRDb21wbGV0aW9uQ29uZmlnKHsgLi4uY29tcGxldGlvbkNvbmZpZywgcHJvbXB0ZWQ6IHRydWUgfSk7XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0Q29tcGxldGlvbkNvbmZpZygpOiBQcm9taXNlPENvbXBsZXRpb25Db25maWcgfCB1bmRlZmluZWQ+IHtcbiAgY29uc3Qgd2tzcCA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG5cbiAgcmV0dXJuIHdrc3A/LmdldENsaSgpPy5bJ2NvbXBsZXRpb24nXTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2V0Q29tcGxldGlvbkNvbmZpZyhjb25maWc6IENvbXBsZXRpb25Db25maWcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3Qgd2tzcCA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gIGlmICghd2tzcCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgZ2xvYmFsIHdvcmtzcGFjZWApO1xuICB9XG5cbiAgd2tzcC5leHRlbnNpb25zWydjbGknXSA/Pz0ge307XG4gIGNvbnN0IGNsaSA9IHdrc3AuZXh0ZW5zaW9uc1snY2xpJ107XG4gIGlmICghanNvbi5pc0pzb25PYmplY3QoY2xpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBJbnZhbGlkIGNvbmZpZyBmb3VuZCBhdCAke3drc3AuZmlsZVBhdGh9LiBcXGBleHRlbnNpb25zLmNsaVxcYCBzaG91bGQgYmUgYW4gb2JqZWN0LmAsXG4gICAgKTtcbiAgfVxuICBjbGkuY29tcGxldGlvbiA9IGNvbmZpZyBhcyBqc29uLkpzb25PYmplY3Q7XG4gIGF3YWl0IHdrc3Auc2F2ZSgpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzaG91bGRQcm9tcHRGb3JBdXRvY29tcGxldGlvblNldHVwKFxuICBjb21tYW5kOiBzdHJpbmcsXG4gIGNvbmZpZz86IENvbXBsZXRpb25Db25maWcsXG4pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgLy8gRm9yY2Ugd2hldGhlciBvciBub3QgdG8gcHJvbXB0IGZvciBhdXRvY29tcGxldGUgdG8gZ2l2ZSBhbiBlYXN5IHBhdGggZm9yIGUyZSB0ZXN0aW5nIHRvIHNraXAuXG4gIGlmIChmb3JjZUF1dG9jb21wbGV0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGZvcmNlQXV0b2NvbXBsZXRlO1xuICB9XG5cbiAgLy8gRG9uJ3QgcHJvbXB0IG9uIGBuZyB1cGRhdGVgIG9yIGBuZyBjb21wbGV0aW9uYC5cbiAgaWYgKGNvbW1hbmQgPT09ICd1cGRhdGUnIHx8IGNvbW1hbmQgPT09ICdjb21wbGV0aW9uJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIE5vbi1pbnRlcmFjdGl2ZSBhbmQgY29udGludW91cyBpbnRlZ3JhdGlvbiBzeXN0ZW1zIGRvbid0IGNhcmUgYWJvdXQgYXV0b2NvbXBsZXRpb24uXG4gIGlmICghaXNUVFkoKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFNraXAgcHJvbXB0IGlmIHRoZSB1c2VyIGhhcyBhbHJlYWR5IGJlZW4gcHJvbXB0ZWQuXG4gIGlmIChjb25maWc/LnByb21wdGVkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gYCRIT01FYCB2YXJpYWJsZSBpcyBuZWNlc3NhcnkgdG8gZmluZCBSQyBmaWxlcyB0byBtb2RpZnkuXG4gIGNvbnN0IGhvbWUgPSBlbnZbJ0hPTUUnXTtcbiAgaWYgKCFob21lKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gR2V0IHBvc3NpYmxlIFJDIGZpbGVzIGZvciB0aGUgY3VycmVudCBzaGVsbC5cbiAgY29uc3Qgc2hlbGwgPSBlbnZbJ1NIRUxMJ107XG4gIGlmICghc2hlbGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgcmNGaWxlcyA9IGdldFNoZWxsUnVuQ29tbWFuZENhbmRpZGF0ZXMoc2hlbGwsIGhvbWUpO1xuICBpZiAoIXJjRmlsZXMpIHtcbiAgICByZXR1cm4gZmFsc2U7IC8vIFVua25vd24gc2hlbGwuXG4gIH1cblxuICAvLyBDaGVjayBlYWNoIFJDIGZpbGUgaWYgdGhleSBhbHJlYWR5IHVzZSBgbmcgY29tcGxldGlvbiBzY3JpcHRgIGluIGFueSBjYXBhY2l0eSBhbmQgZG9uJ3QgcHJvbXB0LlxuICBmb3IgKGNvbnN0IHJjRmlsZSBvZiByY0ZpbGVzKSB7XG4gICAgY29uc3QgY29udGVudHMgPSBhd2FpdCBmcy5yZWFkRmlsZShyY0ZpbGUsICd1dGYtOCcpLmNhdGNoKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgaWYgKGNvbnRlbnRzPy5pbmNsdWRlcygnbmcgY29tcGxldGlvbiBzY3JpcHQnKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9tcHRGb3JBdXRvY29tcGxldGlvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgLy8gRHluYW1pY2FsbHkgbG9hZCBgaW5xdWlyZXJgIHNvIHVzZXJzIGRvbid0IGhhdmUgdG8gcGF5IHRoZSBjb3N0IG9mIHBhcnNpbmcgYW5kIGV4ZWN1dGluZyBpdCBmb3JcbiAgLy8gdGhlIDk5JSBvZiBidWlsZHMgdGhhdCAqZG9uJ3QqIHByb21wdCBmb3IgYXV0b2NvbXBsZXRpb24uXG4gIGNvbnN0IHsgcHJvbXB0IH0gPSBhd2FpdCBpbXBvcnQoJ2lucXVpcmVyJyk7XG4gIGNvbnN0IHsgYXV0b2NvbXBsZXRlIH0gPSBhd2FpdCBwcm9tcHQ8eyBhdXRvY29tcGxldGU6IGJvb2xlYW4gfT4oW1xuICAgIHtcbiAgICAgIG5hbWU6ICdhdXRvY29tcGxldGUnLFxuICAgICAgdHlwZTogJ2NvbmZpcm0nLFxuICAgICAgbWVzc2FnZTogYFxuV291bGQgeW91IGxpa2UgdG8gZW5hYmxlIGF1dG9jb21wbGV0aW9uPyBUaGlzIHdpbGwgc2V0IHVwIHlvdXIgdGVybWluYWwgc28gcHJlc3NpbmcgVEFCIHdoaWxlIHR5cGluZ1xuQW5ndWxhciBDTEkgY29tbWFuZHMgd2lsbCBzaG93IHBvc3NpYmxlIG9wdGlvbnMgYW5kIGF1dG9jb21wbGV0ZSBhcmd1bWVudHMuIChFbmFibGluZyBhdXRvY29tcGxldGlvblxud2lsbCBtb2RpZnkgY29uZmlndXJhdGlvbiBmaWxlcyBpbiB5b3VyIGhvbWUgZGlyZWN0b3J5LilcbiAgICAgIGBcbiAgICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgICAuam9pbignICcpXG4gICAgICAgIC50cmltKCksXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgIH0sXG4gIF0pO1xuXG4gIHJldHVybiBhdXRvY29tcGxldGU7XG59XG5cbi8qKlxuICogU2V0cyB1cCBhdXRvY29tcGxldGlvbiBmb3IgdGhlIHVzZXIncyB0ZXJtaW5hbC4gVGhpcyBhdHRlbXB0cyB0byBmaW5kIHRoZSBjb25maWd1cmF0aW9uIGZpbGUgZm9yXG4gKiB0aGUgY3VycmVudCBzaGVsbCAoYC5iYXNocmNgLCBgLnpzaHJjYCwgZXRjLikgYW5kIGFwcGVuZCBhIGNvbW1hbmQgd2hpY2ggZW5hYmxlcyBhdXRvY29tcGxldGlvblxuICogZm9yIHRoZSBBbmd1bGFyIENMSS4gU3VwcG9ydHMgb25seSBCYXNoIGFuZCBac2guIFJldHVybnMgd2hldGhlciBvciBub3QgaXQgd2FzIHN1Y2Nlc3NmdWwuXG4gKiBAcmV0dXJuIFRoZSBmdWxsIHBhdGggb2YgdGhlIGNvbmZpZ3VyYXRpb24gZmlsZSBtb2RpZmllZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXRpYWxpemVBdXRvY29tcGxldGUoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgLy8gR2V0IHRoZSBjdXJyZW50bHkgYWN0aXZlIGAkU0hFTExgIGFuZCBgJEhPTUVgIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAgY29uc3Qgc2hlbGwgPSBlbnZbJ1NIRUxMJ107XG4gIGlmICghc2hlbGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnYCRTSEVMTGAgZW52aXJvbm1lbnQgdmFyaWFibGUgbm90IHNldC4gQW5ndWxhciBDTEkgYXV0b2NvbXBsZXRpb24gb25seSBzdXBwb3J0cyBCYXNoIG9yJyArXG4gICAgICAgICcgWnNoLicsXG4gICAgKTtcbiAgfVxuICBjb25zdCBob21lID0gZW52WydIT01FJ107XG4gIGlmICghaG9tZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdgJEhPTUVgIGVudmlyb25tZW50IHZhcmlhYmxlIG5vdCBzZXQuIFNldHRpbmcgdXAgYXV0b2NvbXBsZXRpb24gbW9kaWZpZXMgY29uZmlndXJhdGlvbiBmaWxlcycgK1xuICAgICAgICAnIGluIHRoZSBob21lIGRpcmVjdG9yeSBhbmQgbXVzdCBiZSBzZXQuJyxcbiAgICApO1xuICB9XG5cbiAgLy8gR2V0IGFsbCB0aGUgZmlsZXMgd2UgY2FuIGFkZCBgbmcgY29tcGxldGlvbmAgdG8gd2hpY2ggYXBwbHkgdG8gdGhlIHVzZXIncyBgJFNIRUxMYC5cbiAgY29uc3QgcnVuQ29tbWFuZENhbmRpZGF0ZXMgPSBnZXRTaGVsbFJ1bkNvbW1hbmRDYW5kaWRhdGVzKHNoZWxsLCBob21lKTtcbiAgaWYgKCFydW5Db21tYW5kQ2FuZGlkYXRlcykge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBVbmtub3duIFxcYCRTSEVMTFxcYCBlbnZpcm9ubWVudCB2YXJpYWJsZSB2YWx1ZSAoJHtzaGVsbH0pLiBBbmd1bGFyIENMSSBhdXRvY29tcGxldGlvbiBvbmx5IHN1cHBvcnRzIEJhc2ggb3IgWnNoLmAsXG4gICAgKTtcbiAgfVxuXG4gIC8vIEdldCB0aGUgZmlyc3QgZmlsZSB0aGF0IGFscmVhZHkgZXhpc3RzIG9yIGZhbGxiYWNrIHRvIGEgbmV3IGZpbGUgb2YgdGhlIGZpcnN0IGNhbmRpZGF0ZS5cbiAgY29uc3QgY2FuZGlkYXRlcyA9IGF3YWl0IFByb21pc2UuYWxsU2V0dGxlZChcbiAgICBydW5Db21tYW5kQ2FuZGlkYXRlcy5tYXAoKHJjRmlsZSkgPT4gZnMuYWNjZXNzKHJjRmlsZSkudGhlbigoKSA9PiByY0ZpbGUpKSxcbiAgKTtcbiAgY29uc3QgcmNGaWxlID1cbiAgICBjYW5kaWRhdGVzLmZpbmQoXG4gICAgICAocmVzdWx0KTogcmVzdWx0IGlzIFByb21pc2VGdWxmaWxsZWRSZXN1bHQ8c3RyaW5nPiA9PiByZXN1bHQuc3RhdHVzID09PSAnZnVsZmlsbGVkJyxcbiAgICApPy52YWx1ZSA/PyBydW5Db21tYW5kQ2FuZGlkYXRlc1swXTtcblxuICAvLyBBcHBlbmQgQW5ndWxhciBhdXRvY29tcGxldGlvbiBzZXR1cCB0byBSQyBmaWxlLlxuICB0cnkge1xuICAgIGF3YWl0IGZzLmFwcGVuZEZpbGUoXG4gICAgICByY0ZpbGUsXG4gICAgICAnXFxuXFxuIyBMb2FkIEFuZ3VsYXIgQ0xJIGF1dG9jb21wbGV0aW9uLlxcbnNvdXJjZSA8KG5nIGNvbXBsZXRpb24gc2NyaXB0KVxcbicsXG4gICAgKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gYXBwZW5kIGF1dG9jb21wbGV0aW9uIHNldHVwIHRvIFxcYCR7cmNGaWxlfVxcYDpcXG4ke2Vyci5tZXNzYWdlfWApO1xuICB9XG5cbiAgcmV0dXJuIHJjRmlsZTtcbn1cblxuLyoqIFJldHVybnMgYW4gb3JkZXJlZCBsaXN0IG9mIHBvc3NpYmlsZSBjYW5kaWRhdGVzIG9mIFJDIGZpbGVzIHVzZWQgYnkgdGhlIGdpdmVuIHNoZWxsLiAqL1xuZnVuY3Rpb24gZ2V0U2hlbGxSdW5Db21tYW5kQ2FuZGlkYXRlcyhzaGVsbDogc3RyaW5nLCBob21lOiBzdHJpbmcpOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCB7XG4gIGlmIChzaGVsbC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdiYXNoJykpIHtcbiAgICByZXR1cm4gWycuYmFzaHJjJywgJy5iYXNoX3Byb2ZpbGUnLCAnLnByb2ZpbGUnXS5tYXAoKGZpbGUpID0+IHBhdGguam9pbihob21lLCBmaWxlKSk7XG4gIH0gZWxzZSBpZiAoc2hlbGwudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnenNoJykpIHtcbiAgICByZXR1cm4gWycuenNocmMnLCAnLnpzaF9wcm9maWxlJywgJy5wcm9maWxlJ10ubWFwKChmaWxlKSA9PiBwYXRoLmpvaW4oaG9tZSwgZmlsZSkpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cbiJdfQ==