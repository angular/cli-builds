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
exports.hasGlobalCliInstall = exports.initializeAutocomplete = exports.considerSettingUpAutocompletion = void 0;
const core_1 = require("@angular-devkit/core");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const process_1 = require("process");
const color_1 = require("../utilities/color");
const config_1 = require("../utilities/config");
const environment_options_1 = require("../utilities/environment-options");
const tty_1 = require("../utilities/tty");
const error_1 = require("./error");
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
        (0, error_1.assertIsError)(err);
        // Failed to set up autocompeletion, log the error and abort.
        logger.error(err.message);
        return 1;
    }
    // Notify the user autocompletion was set up successfully.
    logger.info(`
Appended \`source <(ng completion script)\` to \`${rcFile}\`. Restart your terminal or run the following to autocomplete \`ng\` commands:

    ${color_1.colors.yellow(`source <(ng completion script)`)}
    `.trim());
    if (!(await hasGlobalCliInstall())) {
        logger.warn('Setup completed successfully, but there does not seem to be a global install of the' +
            ' Angular CLI. For autocompletion to work, the CLI will need to be on your `$PATH`, which' +
            ' is typically done with the `-g` flag in `npm install -g @angular/cli`.' +
            '\n\n' +
            'For more information, see https://angular.io/cli/completion#global-install');
    }
    // Save configuration to remember that the user was prompted.
    await setCompletionConfig({ ...completionConfig, prompted: true });
    return undefined;
}
exports.considerSettingUpAutocompletion = considerSettingUpAutocompletion;
async function getCompletionConfig() {
    const wksp = await (0, config_1.getWorkspace)('global');
    return wksp?.getCli()?.['completion'];
}
async function setCompletionConfig(config) {
    const wksp = await (0, config_1.getWorkspace)('global');
    if (!wksp) {
        throw new Error(`Could not find global workspace`);
    }
    wksp.extensions['cli'] ??= {};
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
    if (config?.prompted) {
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
    // Don't prompt if the user is missing a global CLI install. Autocompletion won't work after setup
    // anyway and could be annoying for users running one-off commands via `npx` or using `npm start`.
    if ((await hasGlobalCliInstall()) === false) {
        return false;
    }
    // Check each RC file if they already use `ng completion script` in any capacity and don't prompt.
    for (const rcFile of rcFiles) {
        const contents = await fs_1.promises.readFile(rcFile, 'utf-8').catch(() => undefined);
        if (contents?.includes('ng completion script')) {
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
    const rcFile = candidates.find((result) => result.status === 'fulfilled')?.value ?? runCommandCandidates[0];
    // Append Angular autocompletion setup to RC file.
    try {
        await fs_1.promises.appendFile(rcFile, '\n\n# Load Angular CLI autocompletion.\nsource <(ng completion script)\n');
    }
    catch (err) {
        (0, error_1.assertIsError)(err);
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
/**
 * Returns whether the user has a global CLI install.
 * Execution from `npx` is *not* considered a global CLI install.
 *
 * This does *not* mean the current execution is from a global CLI install, only that a global
 * install exists on the system.
 */
function hasGlobalCliInstall() {
    // List all binaries with the `ng` name on the user's `$PATH`.
    return new Promise((resolve) => {
        (0, child_process_1.execFile)('which', ['-a', 'ng'], (error, stdout) => {
            if (error) {
                // No instances of `ng` on the user's `$PATH`
                // `which` returns exit code 2 if an invalid option is specified and `-a` doesn't appear to be
                // supported on all systems. Other exit codes mean unknown errors occurred. Can't tell whether
                // CLI is globally installed, so treat this as inconclusive.
                // `which` was killed by a signal and did not exit gracefully. Maybe it hung or something else
                // went very wrong, so treat this as inconclusive.
                resolve(false);
                return;
            }
            // Successfully listed all `ng` binaries on the `$PATH`. Look for at least one line which is a
            // global install. We can't easily identify global installs, but local installs are typically
            // placed in `node_modules/.bin` by NPM / Yarn. `npx` also currently caches files at
            // `~/.npm/_npx/*/node_modules/.bin/`, so the same logic applies.
            const lines = stdout.split('\n').filter((line) => line !== '');
            const hasGlobalInstall = lines.some((line) => {
                // A binary is a local install if it is a direct child of a `node_modules/.bin/` directory.
                const parent = path.parse(path.parse(line).dir);
                const grandparent = path.parse(parent.dir);
                const localInstall = grandparent.base === 'node_modules' && parent.base === '.bin';
                return !localInstall;
            });
            return resolve(hasGlobalInstall);
        });
    });
}
exports.hasGlobalCliInstall = hasGlobalCliInstall;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy91dGlsaXRpZXMvY29tcGxldGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFxRDtBQUNyRCxpREFBeUM7QUFDekMsMkJBQW9DO0FBQ3BDLDJDQUE2QjtBQUM3QixxQ0FBOEI7QUFDOUIsOENBQTRDO0FBQzVDLGdEQUFtRDtBQUNuRCwwRUFBcUU7QUFDckUsMENBQXlDO0FBQ3pDLG1DQUF3QztBQVd4Qzs7Ozs7R0FLRztBQUNJLEtBQUssVUFBVSwrQkFBK0IsQ0FDbkQsT0FBZSxFQUNmLE1BQXNCO0lBRXRCLDhEQUE4RDtJQUM5RCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQztJQUNyRCxJQUFJLENBQUMsQ0FBQyxNQUFNLGtDQUFrQyxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUU7UUFDMUUsT0FBTyxTQUFTLENBQUMsQ0FBQyx3REFBd0Q7S0FDM0U7SUFFRCw2Q0FBNkM7SUFDN0MsTUFBTSx5QkFBeUIsR0FBRyxNQUFNLHVCQUF1QixFQUFFLENBQUM7SUFDbEUsSUFBSSxDQUFDLHlCQUF5QixFQUFFO1FBQzlCLDREQUE0RDtRQUM1RCxNQUFNLENBQUMsSUFBSSxDQUNUOzs7TUFHQSxjQUFNLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztLQUMvQixDQUFDLElBQUksRUFBRSxDQUNQLENBQUM7UUFFRix1RkFBdUY7UUFDdkYsTUFBTSxtQkFBbUIsQ0FBQyxFQUFFLEdBQUcsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFbkUsT0FBTyxTQUFTLENBQUM7S0FDbEI7SUFFRCxtREFBbUQ7SUFDbkQsSUFBSSxNQUFjLENBQUM7SUFD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O2dCQUM5RixrREFBa0Q7Z0JBQ2xELE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFFZixPQUFPO2FBQ1I7WUFFRCw4RkFBOEY7WUFDOUYsNkZBQTZGO1lBQzdGLG9GQUFvRjtZQUNwRixpRUFBaUU7WUFDakUsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztZQUMvRCxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDM0MsMkZBQTJGO2dCQUMzRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2hELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsSUFBSSxLQUFLLGNBQWMsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQztnQkFFbkYsT0FBTyxDQUFDLFlBQVksQ0FBQztZQUN2QixDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDbkMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFuQ0Qsa0RBbUNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpzb24sIGxvZ2dpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgcHJvbWlzZXMgYXMgZnMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZW52IH0gZnJvbSAncHJvY2Vzcyc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBmb3JjZUF1dG9jb21wbGV0ZSB9IGZyb20gJy4uL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3R0eSc7XG5pbXBvcnQgeyBhc3NlcnRJc0Vycm9yIH0gZnJvbSAnLi9lcnJvcic7XG5cbi8qKiBJbnRlcmZhY2UgZm9yIHRoZSBhdXRvY29tcGxldGlvbiBjb25maWd1cmF0aW9uIHN0b3JlZCBpbiB0aGUgZ2xvYmFsIHdvcmtzcGFjZS4gKi9cbmludGVyZmFjZSBDb21wbGV0aW9uQ29uZmlnIHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIGhhcyBiZWVuIHByb21wdGVkIHRvIHNldCB1cCBhdXRvY29tcGxldGlvbi4gSWYgYHRydWVgLCBzaG91bGQgKm5vdCpcbiAgICogcHJvbXB0IHRoZW0gYWdhaW4uXG4gICAqL1xuICBwcm9tcHRlZD86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGl0IGlzIGFwcHJvcHJpYXRlIHRvIHByb21wdCB0aGUgdXNlciB0byBzZXR1cCBhdXRvY29tcGxldGlvbi4gSWYgbm90LCBkb2VzIG5vdGhpbmcuIElmXG4gKiBzbyBwcm9tcHRzIGFuZCBzZXRzIHVwIGF1dG9jb21wbGV0aW9uIGZvciB0aGUgdXNlci4gUmV0dXJucyBhbiBleGl0IGNvZGUgaWYgdGhlIHByb2dyYW0gc2hvdWxkXG4gKiB0ZXJtaW5hdGUsIG90aGVyd2lzZSByZXR1cm5zIGB1bmRlZmluZWRgLlxuICogQHJldHVybnMgYW4gZXhpdCBjb2RlIGlmIHRoZSBwcm9ncmFtIHNob3VsZCB0ZXJtaW5hdGUsIHVuZGVmaW5lZCBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb25zaWRlclNldHRpbmdVcEF1dG9jb21wbGV0aW9uKFxuICBjb21tYW5kOiBzdHJpbmcsXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIsXG4pOiBQcm9taXNlPG51bWJlciB8IHVuZGVmaW5lZD4ge1xuICAvLyBDaGVjayBpZiB3ZSBzaG91bGQgcHJvbXB0IHRoZSB1c2VyIHRvIHNldHVwIGF1dG9jb21wbGV0aW9uLlxuICBjb25zdCBjb21wbGV0aW9uQ29uZmlnID0gYXdhaXQgZ2V0Q29tcGxldGlvbkNvbmZpZygpO1xuICBpZiAoIShhd2FpdCBzaG91bGRQcm9tcHRGb3JBdXRvY29tcGxldGlvblNldHVwKGNvbW1hbmQsIGNvbXBsZXRpb25Db25maWcpKSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7IC8vIEFscmVhZHkgc2V0IHVwIG9yIHByb21wdGVkIHByZXZpb3VzbHksIG5vdGhpbmcgdG8gZG8uXG4gIH1cblxuICAvLyBQcm9tcHQgdGhlIHVzZXIgYW5kIHJlY29yZCB0aGVpciByZXNwb25zZS5cbiAgY29uc3Qgc2hvdWxkU2V0dXBBdXRvY29tcGxldGlvbiA9IGF3YWl0IHByb21wdEZvckF1dG9jb21wbGV0aW9uKCk7XG4gIGlmICghc2hvdWxkU2V0dXBBdXRvY29tcGxldGlvbikge1xuICAgIC8vIFVzZXIgcmVqZWN0ZWQgdGhlIHByb21wdCBhbmQgZG9lc24ndCB3YW50IGF1dG9jb21wbGV0aW9uLlxuICAgIGxvZ2dlci5pbmZvKFxuICAgICAgYFxuT2ssIHlvdSB3b24ndCBiZSBwcm9tcHRlZCBhZ2Fpbi4gU2hvdWxkIHlvdSBjaGFuZ2UgeW91ciBtaW5kLCB0aGUgZm9sbG93aW5nIGNvbW1hbmQgd2lsbCBzZXQgdXAgYXV0b2NvbXBsZXRpb24gZm9yIHlvdTpcblxuICAgICR7Y29sb3JzLnllbGxvdyhgbmcgY29tcGxldGlvbmApfVxuICAgIGAudHJpbSgpLFxuICAgICk7XG5cbiAgICAvLyBTYXZlIGNvbmZpZ3VyYXRpb24gdG8gcmVtZW1iZXIgdGhhdCB0aGUgdXNlciB3YXMgcHJvbXB0ZWQgYW5kIGF2b2lkIHByb21wdGluZyBhZ2Fpbi5cbiAgICBhd2FpdCBzZXRDb21wbGV0aW9uQ29uZmlnKHsgLi4uY29tcGxldGlvbkNvbmZpZywgcHJvbXB0ZWQ6IHRydWUgfSk7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gVXNlciBhY2NlcHRlZCB0aGUgcHJvbXB0LCBzZXQgdXAgYXV0b2NvbXBsZXRpb24uXG4gIGxldCByY0ZpbGU6IHN0cmluZztcbiAgdHJ5IHtcbiAgICByY0ZpbGUgPSBhd2FpdCBpbml0aWFsaXplQXV0b2NvbXBsZXRlKCk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGFzc2VydElzRXJyb3IoZXJyKTtcbiAgICAvLyBGYWlsZWQgdG8gc2V0IHVwIGF1dG9jb21wZWxldGlvbiwgbG9nIHRoZSBlcnJvciBhbmQgYWJvcnQuXG4gICAgbG9nZ2VyLmVycm9yKGVyci5tZXNzYWdlKTtcblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgLy8gTm90aWZ5IHRoZSB1c2VyIGF1dG9jb21wbGV0aW9uIHdhcyBzZXQgdXAgc3VjY2Vzc2Z1bGx5LlxuICBsb2dnZXIuaW5mbyhcbiAgICBgXG5BcHBlbmRlZCBcXGBzb3VyY2UgPChuZyBjb21wbGV0aW9uIHNjcmlwdClcXGAgdG8gXFxgJHtyY0ZpbGV9XFxgLiBSZXN0YXJ0IHlvdXIgdGVybWluYWwgb3IgcnVuIHRoZSBmb2xsb3dpbmcgdG8gYXV0b2NvbXBsZXRlIFxcYG5nXFxgIGNvbW1hbmRzOlxuXG4gICAgJHtjb2xvcnMueWVsbG93KGBzb3VyY2UgPChuZyBjb21wbGV0aW9uIHNjcmlwdClgKX1cbiAgICBgLnRyaW0oKSxcbiAgKTtcblxuICBpZiAoIShhd2FpdCBoYXNHbG9iYWxDbGlJbnN0YWxsKCkpKSB7XG4gICAgbG9nZ2VyLndhcm4oXG4gICAgICAnU2V0dXAgY29tcGxldGVkIHN1Y2Nlc3NmdWxseSwgYnV0IHRoZXJlIGRvZXMgbm90IHNlZW0gdG8gYmUgYSBnbG9iYWwgaW5zdGFsbCBvZiB0aGUnICtcbiAgICAgICAgJyBBbmd1bGFyIENMSS4gRm9yIGF1dG9jb21wbGV0aW9uIHRvIHdvcmssIHRoZSBDTEkgd2lsbCBuZWVkIHRvIGJlIG9uIHlvdXIgYCRQQVRIYCwgd2hpY2gnICtcbiAgICAgICAgJyBpcyB0eXBpY2FsbHkgZG9uZSB3aXRoIHRoZSBgLWdgIGZsYWcgaW4gYG5wbSBpbnN0YWxsIC1nIEBhbmd1bGFyL2NsaWAuJyArXG4gICAgICAgICdcXG5cXG4nICtcbiAgICAgICAgJ0ZvciBtb3JlIGluZm9ybWF0aW9uLCBzZWUgaHR0cHM6Ly9hbmd1bGFyLmlvL2NsaS9jb21wbGV0aW9uI2dsb2JhbC1pbnN0YWxsJyxcbiAgICApO1xuICB9XG5cbiAgLy8gU2F2ZSBjb25maWd1cmF0aW9uIHRvIHJlbWVtYmVyIHRoYXQgdGhlIHVzZXIgd2FzIHByb21wdGVkLlxuICBhd2FpdCBzZXRDb21wbGV0aW9uQ29uZmlnKHsgLi4uY29tcGxldGlvbkNvbmZpZywgcHJvbXB0ZWQ6IHRydWUgfSk7XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0Q29tcGxldGlvbkNvbmZpZygpOiBQcm9taXNlPENvbXBsZXRpb25Db25maWcgfCB1bmRlZmluZWQ+IHtcbiAgY29uc3Qgd2tzcCA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG5cbiAgcmV0dXJuIHdrc3A/LmdldENsaSgpPy5bJ2NvbXBsZXRpb24nXTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2V0Q29tcGxldGlvbkNvbmZpZyhjb25maWc6IENvbXBsZXRpb25Db25maWcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3Qgd2tzcCA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gIGlmICghd2tzcCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgZ2xvYmFsIHdvcmtzcGFjZWApO1xuICB9XG5cbiAgd2tzcC5leHRlbnNpb25zWydjbGknXSA/Pz0ge307XG4gIGNvbnN0IGNsaSA9IHdrc3AuZXh0ZW5zaW9uc1snY2xpJ107XG4gIGlmICghanNvbi5pc0pzb25PYmplY3QoY2xpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBJbnZhbGlkIGNvbmZpZyBmb3VuZCBhdCAke3drc3AuZmlsZVBhdGh9LiBcXGBleHRlbnNpb25zLmNsaVxcYCBzaG91bGQgYmUgYW4gb2JqZWN0LmAsXG4gICAgKTtcbiAgfVxuICBjbGkuY29tcGxldGlvbiA9IGNvbmZpZyBhcyBqc29uLkpzb25PYmplY3Q7XG4gIGF3YWl0IHdrc3Auc2F2ZSgpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzaG91bGRQcm9tcHRGb3JBdXRvY29tcGxldGlvblNldHVwKFxuICBjb21tYW5kOiBzdHJpbmcsXG4gIGNvbmZpZz86IENvbXBsZXRpb25Db25maWcsXG4pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgLy8gRm9yY2Ugd2hldGhlciBvciBub3QgdG8gcHJvbXB0IGZvciBhdXRvY29tcGxldGUgdG8gZ2l2ZSBhbiBlYXN5IHBhdGggZm9yIGUyZSB0ZXN0aW5nIHRvIHNraXAuXG4gIGlmIChmb3JjZUF1dG9jb21wbGV0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGZvcmNlQXV0b2NvbXBsZXRlO1xuICB9XG5cbiAgLy8gRG9uJ3QgcHJvbXB0IG9uIGBuZyB1cGRhdGVgIG9yIGBuZyBjb21wbGV0aW9uYC5cbiAgaWYgKGNvbW1hbmQgPT09ICd1cGRhdGUnIHx8IGNvbW1hbmQgPT09ICdjb21wbGV0aW9uJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIE5vbi1pbnRlcmFjdGl2ZSBhbmQgY29udGludW91cyBpbnRlZ3JhdGlvbiBzeXN0ZW1zIGRvbid0IGNhcmUgYWJvdXQgYXV0b2NvbXBsZXRpb24uXG4gIGlmICghaXNUVFkoKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFNraXAgcHJvbXB0IGlmIHRoZSB1c2VyIGhhcyBhbHJlYWR5IGJlZW4gcHJvbXB0ZWQuXG4gIGlmIChjb25maWc/LnByb21wdGVkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gYCRIT01FYCB2YXJpYWJsZSBpcyBuZWNlc3NhcnkgdG8gZmluZCBSQyBmaWxlcyB0byBtb2RpZnkuXG4gIGNvbnN0IGhvbWUgPSBlbnZbJ0hPTUUnXTtcbiAgaWYgKCFob21lKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gR2V0IHBvc3NpYmxlIFJDIGZpbGVzIGZvciB0aGUgY3VycmVudCBzaGVsbC5cbiAgY29uc3Qgc2hlbGwgPSBlbnZbJ1NIRUxMJ107XG4gIGlmICghc2hlbGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgcmNGaWxlcyA9IGdldFNoZWxsUnVuQ29tbWFuZENhbmRpZGF0ZXMoc2hlbGwsIGhvbWUpO1xuICBpZiAoIXJjRmlsZXMpIHtcbiAgICByZXR1cm4gZmFsc2U7IC8vIFVua25vd24gc2hlbGwuXG4gIH1cblxuICAvLyBEb24ndCBwcm9tcHQgaWYgdGhlIHVzZXIgaXMgbWlzc2luZyBhIGdsb2JhbCBDTEkgaW5zdGFsbC4gQXV0b2NvbXBsZXRpb24gd29uJ3Qgd29yayBhZnRlciBzZXR1cFxuICAvLyBhbnl3YXkgYW5kIGNvdWxkIGJlIGFubm95aW5nIGZvciB1c2VycyBydW5uaW5nIG9uZS1vZmYgY29tbWFuZHMgdmlhIGBucHhgIG9yIHVzaW5nIGBucG0gc3RhcnRgLlxuICBpZiAoKGF3YWl0IGhhc0dsb2JhbENsaUluc3RhbGwoKSkgPT09IGZhbHNlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gQ2hlY2sgZWFjaCBSQyBmaWxlIGlmIHRoZXkgYWxyZWFkeSB1c2UgYG5nIGNvbXBsZXRpb24gc2NyaXB0YCBpbiBhbnkgY2FwYWNpdHkgYW5kIGRvbid0IHByb21wdC5cbiAgZm9yIChjb25zdCByY0ZpbGUgb2YgcmNGaWxlcykge1xuICAgIGNvbnN0IGNvbnRlbnRzID0gYXdhaXQgZnMucmVhZEZpbGUocmNGaWxlLCAndXRmLTgnKS5jYXRjaCgoKSA9PiB1bmRlZmluZWQpO1xuICAgIGlmIChjb250ZW50cz8uaW5jbHVkZXMoJ25nIGNvbXBsZXRpb24gc2NyaXB0JykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvbXB0Rm9yQXV0b2NvbXBsZXRpb24oKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIC8vIER5bmFtaWNhbGx5IGxvYWQgYGlucXVpcmVyYCBzbyB1c2VycyBkb24ndCBoYXZlIHRvIHBheSB0aGUgY29zdCBvZiBwYXJzaW5nIGFuZCBleGVjdXRpbmcgaXQgZm9yXG4gIC8vIHRoZSA5OSUgb2YgYnVpbGRzIHRoYXQgKmRvbid0KiBwcm9tcHQgZm9yIGF1dG9jb21wbGV0aW9uLlxuICBjb25zdCB7IHByb21wdCB9ID0gYXdhaXQgaW1wb3J0KCdpbnF1aXJlcicpO1xuICBjb25zdCB7IGF1dG9jb21wbGV0ZSB9ID0gYXdhaXQgcHJvbXB0PHsgYXV0b2NvbXBsZXRlOiBib29sZWFuIH0+KFtcbiAgICB7XG4gICAgICBuYW1lOiAnYXV0b2NvbXBsZXRlJyxcbiAgICAgIHR5cGU6ICdjb25maXJtJyxcbiAgICAgIG1lc3NhZ2U6IGBcbldvdWxkIHlvdSBsaWtlIHRvIGVuYWJsZSBhdXRvY29tcGxldGlvbj8gVGhpcyB3aWxsIHNldCB1cCB5b3VyIHRlcm1pbmFsIHNvIHByZXNzaW5nIFRBQiB3aGlsZSB0eXBpbmdcbkFuZ3VsYXIgQ0xJIGNvbW1hbmRzIHdpbGwgc2hvdyBwb3NzaWJsZSBvcHRpb25zIGFuZCBhdXRvY29tcGxldGUgYXJndW1lbnRzLiAoRW5hYmxpbmcgYXV0b2NvbXBsZXRpb25cbndpbGwgbW9kaWZ5IGNvbmZpZ3VyYXRpb24gZmlsZXMgaW4geW91ciBob21lIGRpcmVjdG9yeS4pXG4gICAgICBgXG4gICAgICAgIC5zcGxpdCgnXFxuJylcbiAgICAgICAgLmpvaW4oJyAnKVxuICAgICAgICAudHJpbSgpLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICB9LFxuICBdKTtcblxuICByZXR1cm4gYXV0b2NvbXBsZXRlO1xufVxuXG4vKipcbiAqIFNldHMgdXAgYXV0b2NvbXBsZXRpb24gZm9yIHRoZSB1c2VyJ3MgdGVybWluYWwuIFRoaXMgYXR0ZW1wdHMgdG8gZmluZCB0aGUgY29uZmlndXJhdGlvbiBmaWxlIGZvclxuICogdGhlIGN1cnJlbnQgc2hlbGwgKGAuYmFzaHJjYCwgYC56c2hyY2AsIGV0Yy4pIGFuZCBhcHBlbmQgYSBjb21tYW5kIHdoaWNoIGVuYWJsZXMgYXV0b2NvbXBsZXRpb25cbiAqIGZvciB0aGUgQW5ndWxhciBDTEkuIFN1cHBvcnRzIG9ubHkgQmFzaCBhbmQgWnNoLiBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IGl0IHdhcyBzdWNjZXNzZnVsLlxuICogQHJldHVybiBUaGUgZnVsbCBwYXRoIG9mIHRoZSBjb25maWd1cmF0aW9uIGZpbGUgbW9kaWZpZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0aWFsaXplQXV0b2NvbXBsZXRlKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIC8vIEdldCB0aGUgY3VycmVudGx5IGFjdGl2ZSBgJFNIRUxMYCBhbmQgYCRIT01FYCBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gIGNvbnN0IHNoZWxsID0gZW52WydTSEVMTCddO1xuICBpZiAoIXNoZWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ2AkU0hFTExgIGVudmlyb25tZW50IHZhcmlhYmxlIG5vdCBzZXQuIEFuZ3VsYXIgQ0xJIGF1dG9jb21wbGV0aW9uIG9ubHkgc3VwcG9ydHMgQmFzaCBvcicgK1xuICAgICAgICBcIiBac2guIElmIHlvdSdyZSBvbiBXaW5kb3dzLCBDbWQgYW5kIFBvd2Vyc2hlbGwgZG9uJ3Qgc3VwcG9ydCBjb21tYW5kIGF1dG9jb21wbGV0aW9uLFwiICtcbiAgICAgICAgJyBidXQgR2l0IEJhc2ggb3IgV2luZG93cyBTdWJzeXN0ZW0gZm9yIExpbnV4IHNob3VsZCB3b3JrLCBzbyBwbGVhc2UgdHJ5IGFnYWluIGluIG9uZSBvZicgK1xuICAgICAgICAnIHRob3NlIGVudmlyb25tZW50cy4nLFxuICAgICk7XG4gIH1cbiAgY29uc3QgaG9tZSA9IGVudlsnSE9NRSddO1xuICBpZiAoIWhvbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnYCRIT01FYCBlbnZpcm9ubWVudCB2YXJpYWJsZSBub3Qgc2V0LiBTZXR0aW5nIHVwIGF1dG9jb21wbGV0aW9uIG1vZGlmaWVzIGNvbmZpZ3VyYXRpb24gZmlsZXMnICtcbiAgICAgICAgJyBpbiB0aGUgaG9tZSBkaXJlY3RvcnkgYW5kIG11c3QgYmUgc2V0LicsXG4gICAgKTtcbiAgfVxuXG4gIC8vIEdldCBhbGwgdGhlIGZpbGVzIHdlIGNhbiBhZGQgYG5nIGNvbXBsZXRpb25gIHRvIHdoaWNoIGFwcGx5IHRvIHRoZSB1c2VyJ3MgYCRTSEVMTGAuXG4gIGNvbnN0IHJ1bkNvbW1hbmRDYW5kaWRhdGVzID0gZ2V0U2hlbGxSdW5Db21tYW5kQ2FuZGlkYXRlcyhzaGVsbCwgaG9tZSk7XG4gIGlmICghcnVuQ29tbWFuZENhbmRpZGF0ZXMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgVW5rbm93biBcXGAkU0hFTExcXGAgZW52aXJvbm1lbnQgdmFyaWFibGUgdmFsdWUgKCR7c2hlbGx9KS4gQW5ndWxhciBDTEkgYXV0b2NvbXBsZXRpb24gb25seSBzdXBwb3J0cyBCYXNoIG9yIFpzaC5gLFxuICAgICk7XG4gIH1cblxuICAvLyBHZXQgdGhlIGZpcnN0IGZpbGUgdGhhdCBhbHJlYWR5IGV4aXN0cyBvciBmYWxsYmFjayB0byBhIG5ldyBmaWxlIG9mIHRoZSBmaXJzdCBjYW5kaWRhdGUuXG4gIGNvbnN0IGNhbmRpZGF0ZXMgPSBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoXG4gICAgcnVuQ29tbWFuZENhbmRpZGF0ZXMubWFwKChyY0ZpbGUpID0+IGZzLmFjY2VzcyhyY0ZpbGUpLnRoZW4oKCkgPT4gcmNGaWxlKSksXG4gICk7XG4gIGNvbnN0IHJjRmlsZSA9XG4gICAgY2FuZGlkYXRlcy5maW5kKFxuICAgICAgKHJlc3VsdCk6IHJlc3VsdCBpcyBQcm9taXNlRnVsZmlsbGVkUmVzdWx0PHN0cmluZz4gPT4gcmVzdWx0LnN0YXR1cyA9PT0gJ2Z1bGZpbGxlZCcsXG4gICAgKT8udmFsdWUgPz8gcnVuQ29tbWFuZENhbmRpZGF0ZXNbMF07XG5cbiAgLy8gQXBwZW5kIEFuZ3VsYXIgYXV0b2NvbXBsZXRpb24gc2V0dXAgdG8gUkMgZmlsZS5cbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5hcHBlbmRGaWxlKFxuICAgICAgcmNGaWxlLFxuICAgICAgJ1xcblxcbiMgTG9hZCBBbmd1bGFyIENMSSBhdXRvY29tcGxldGlvbi5cXG5zb3VyY2UgPChuZyBjb21wbGV0aW9uIHNjcmlwdClcXG4nLFxuICAgICk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGFzc2VydElzRXJyb3IoZXJyKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBhcHBlbmQgYXV0b2NvbXBsZXRpb24gc2V0dXAgdG8gXFxgJHtyY0ZpbGV9XFxgOlxcbiR7ZXJyLm1lc3NhZ2V9YCk7XG4gIH1cblxuICByZXR1cm4gcmNGaWxlO1xufVxuXG4vKiogUmV0dXJucyBhbiBvcmRlcmVkIGxpc3Qgb2YgcG9zc2libGUgY2FuZGlkYXRlcyBvZiBSQyBmaWxlcyB1c2VkIGJ5IHRoZSBnaXZlbiBzaGVsbC4gKi9cbmZ1bmN0aW9uIGdldFNoZWxsUnVuQ29tbWFuZENhbmRpZGF0ZXMoc2hlbGw6IHN0cmluZywgaG9tZTogc3RyaW5nKTogc3RyaW5nW10gfCB1bmRlZmluZWQge1xuICBpZiAoc2hlbGwudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnYmFzaCcpKSB7XG4gICAgcmV0dXJuIFsnLmJhc2hyYycsICcuYmFzaF9wcm9maWxlJywgJy5wcm9maWxlJ10ubWFwKChmaWxlKSA9PiBwYXRoLmpvaW4oaG9tZSwgZmlsZSkpO1xuICB9IGVsc2UgaWYgKHNoZWxsLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3pzaCcpKSB7XG4gICAgcmV0dXJuIFsnLnpzaHJjJywgJy56c2hfcHJvZmlsZScsICcucHJvZmlsZSddLm1hcCgoZmlsZSkgPT4gcGF0aC5qb2luKGhvbWUsIGZpbGUpKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyB3aGV0aGVyIHRoZSB1c2VyIGhhcyBhIGdsb2JhbCBDTEkgaW5zdGFsbC5cbiAqIEV4ZWN1dGlvbiBmcm9tIGBucHhgIGlzICpub3QqIGNvbnNpZGVyZWQgYSBnbG9iYWwgQ0xJIGluc3RhbGwuXG4gKlxuICogVGhpcyBkb2VzICpub3QqIG1lYW4gdGhlIGN1cnJlbnQgZXhlY3V0aW9uIGlzIGZyb20gYSBnbG9iYWwgQ0xJIGluc3RhbGwsIG9ubHkgdGhhdCBhIGdsb2JhbFxuICogaW5zdGFsbCBleGlzdHMgb24gdGhlIHN5c3RlbS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc0dsb2JhbENsaUluc3RhbGwoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIC8vIExpc3QgYWxsIGJpbmFyaWVzIHdpdGggdGhlIGBuZ2AgbmFtZSBvbiB0aGUgdXNlcidzIGAkUEFUSGAuXG4gIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzb2x2ZSkgPT4ge1xuICAgIGV4ZWNGaWxlKCd3aGljaCcsIFsnLWEnLCAnbmcnXSwgKGVycm9yLCBzdGRvdXQpID0+IHtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAvLyBObyBpbnN0YW5jZXMgb2YgYG5nYCBvbiB0aGUgdXNlcidzIGAkUEFUSGBcblxuICAgICAgICAvLyBgd2hpY2hgIHJldHVybnMgZXhpdCBjb2RlIDIgaWYgYW4gaW52YWxpZCBvcHRpb24gaXMgc3BlY2lmaWVkIGFuZCBgLWFgIGRvZXNuJ3QgYXBwZWFyIHRvIGJlXG4gICAgICAgIC8vIHN1cHBvcnRlZCBvbiBhbGwgc3lzdGVtcy4gT3RoZXIgZXhpdCBjb2RlcyBtZWFuIHVua25vd24gZXJyb3JzIG9jY3VycmVkLiBDYW4ndCB0ZWxsIHdoZXRoZXJcbiAgICAgICAgLy8gQ0xJIGlzIGdsb2JhbGx5IGluc3RhbGxlZCwgc28gdHJlYXQgdGhpcyBhcyBpbmNvbmNsdXNpdmUuXG5cbiAgICAgICAgLy8gYHdoaWNoYCB3YXMga2lsbGVkIGJ5IGEgc2lnbmFsIGFuZCBkaWQgbm90IGV4aXQgZ3JhY2VmdWxseS4gTWF5YmUgaXQgaHVuZyBvciBzb21ldGhpbmcgZWxzZVxuICAgICAgICAvLyB3ZW50IHZlcnkgd3JvbmcsIHNvIHRyZWF0IHRoaXMgYXMgaW5jb25jbHVzaXZlLlxuICAgICAgICByZXNvbHZlKGZhbHNlKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFN1Y2Nlc3NmdWxseSBsaXN0ZWQgYWxsIGBuZ2AgYmluYXJpZXMgb24gdGhlIGAkUEFUSGAuIExvb2sgZm9yIGF0IGxlYXN0IG9uZSBsaW5lIHdoaWNoIGlzIGFcbiAgICAgIC8vIGdsb2JhbCBpbnN0YWxsLiBXZSBjYW4ndCBlYXNpbHkgaWRlbnRpZnkgZ2xvYmFsIGluc3RhbGxzLCBidXQgbG9jYWwgaW5zdGFsbHMgYXJlIHR5cGljYWxseVxuICAgICAgLy8gcGxhY2VkIGluIGBub2RlX21vZHVsZXMvLmJpbmAgYnkgTlBNIC8gWWFybi4gYG5weGAgYWxzbyBjdXJyZW50bHkgY2FjaGVzIGZpbGVzIGF0XG4gICAgICAvLyBgfi8ubnBtL19ucHgvKi9ub2RlX21vZHVsZXMvLmJpbi9gLCBzbyB0aGUgc2FtZSBsb2dpYyBhcHBsaWVzLlxuICAgICAgY29uc3QgbGluZXMgPSBzdGRvdXQuc3BsaXQoJ1xcbicpLmZpbHRlcigobGluZSkgPT4gbGluZSAhPT0gJycpO1xuICAgICAgY29uc3QgaGFzR2xvYmFsSW5zdGFsbCA9IGxpbmVzLnNvbWUoKGxpbmUpID0+IHtcbiAgICAgICAgLy8gQSBiaW5hcnkgaXMgYSBsb2NhbCBpbnN0YWxsIGlmIGl0IGlzIGEgZGlyZWN0IGNoaWxkIG9mIGEgYG5vZGVfbW9kdWxlcy8uYmluL2AgZGlyZWN0b3J5LlxuICAgICAgICBjb25zdCBwYXJlbnQgPSBwYXRoLnBhcnNlKHBhdGgucGFyc2UobGluZSkuZGlyKTtcbiAgICAgICAgY29uc3QgZ3JhbmRwYXJlbnQgPSBwYXRoLnBhcnNlKHBhcmVudC5kaXIpO1xuICAgICAgICBjb25zdCBsb2NhbEluc3RhbGwgPSBncmFuZHBhcmVudC5iYXNlID09PSAnbm9kZV9tb2R1bGVzJyAmJiBwYXJlbnQuYmFzZSA9PT0gJy5iaW4nO1xuXG4gICAgICAgIHJldHVybiAhbG9jYWxJbnN0YWxsO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiByZXNvbHZlKGhhc0dsb2JhbEluc3RhbGwpO1xuICAgIH0pO1xuICB9KTtcbn1cbiJdfQ==