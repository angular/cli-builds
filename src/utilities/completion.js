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
    if ((await hasGlobalCliInstall()) === false) {
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
    // Don't prompt if the user is missing a global CLI install. Autocompletion won't work after setup
    // anyway and could be annoying for users running one-off commands via `npx` or using `npm start`.
    if ((await hasGlobalCliInstall()) === false) {
        return false;
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
 * Returns whether the user has a global CLI install or `undefined` if this can't be determined.
 * Execution from `npx` is *not* considered a global CLI install.
 *
 * This does *not* mean the current execution is from a global CLI install, only that a global
 * install exists on the system.
 */
async function hasGlobalCliInstall() {
    var _a;
    // List all binaries with the `ng` name on the user's `$PATH`.
    const proc = (0, child_process_1.execFile)('which', ['-a', 'ng']);
    let stdout = '';
    (_a = proc.stdout) === null || _a === void 0 ? void 0 : _a.addListener('data', (content) => {
        stdout += content;
    });
    const exitCode = await new Promise((resolve) => {
        proc.addListener('exit', (exitCode) => {
            resolve(exitCode);
        });
    });
    switch (exitCode) {
        case 0:
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
            return hasGlobalInstall;
        case 1:
            // No instances of `ng` on the user's `$PATH`.
            return false;
        case null:
            // `which` was killed by a signal and did not exit gracefully. Maybe it hung or something else
            // went very wrong, so treat this as inconclusive.
            return undefined;
        default:
            // `which` returns exit code 2 if an invalid option is specified and `-a` doesn't appear to be
            // supported on all systems. Other exit codes mean unknown errors occurred. Can't tell whether
            // CLI is globally installed, so treat this as inconclusive.
            return undefined;
    }
}
exports.hasGlobalCliInstall = hasGlobalCliInstall;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy91dGlsaXRpZXMvY29tcGxldGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFxRDtBQUNyRCxpREFBeUM7QUFDekMsMkJBQW9DO0FBQ3BDLDJDQUE2QjtBQUM3QixxQ0FBOEI7QUFDOUIsOENBQTRDO0FBQzVDLGdEQUFtRDtBQUNuRCwwRUFBcUU7QUFDckUsMENBQXlDO0FBQ3pDLG1DQUF3QztBQVd4Qzs7Ozs7R0FLRztBQUNJLEtBQUssVUFBVSwrQkFBK0IsQ0FDbkQsT0FBZSxFQUNmLE1BQXNCO0lBRXRCLDhEQUE4RDtJQUM5RCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQztJQUNyRCxJQUFJLENBQUMsQ0FBQyxNQUFNLGtDQUFrQyxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUU7UUFDMUUsT0FBTyxTQUFTLENBQUMsQ0FBQyx3REFBd0Q7S0FDM0U7SUFFRCw2Q0FBNkM7SUFDN0MsTUFBTSx5QkFBeUIsR0FBRyxNQUFNLHVCQUF1QixFQUFFLENBQUM7SUFDbEUsSUFBSSxDQUFDLHlCQUF5QixFQUFFO1FBQzlCLDREQUE0RDtRQUM1RCxNQUFNLENBQUMsSUFBSSxDQUNUOzs7TUFHQSxjQUFNLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztLQUMvQixDQUFDLElBQUksRUFBRSxDQUNQLENBQUM7UUFFRix1RkFBdUY7UUFDdkYsTUFBTSxtQkFBbUIsQ0FBQyxFQUFFLEdBQUcsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFbkUsT0FBTyxTQUFTLENBQUM7S0FDbEI7SUFFRCxtREFBbUQ7SUFDbkQsSUFBSSxNQUFjLENBQUM7SUFD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QztZQUNKLDhDQUE4QztZQUM5QyxPQUFPLEtBQUssQ0FBQztRQUNmLEtBQUssSUFBSTtZQUNQLDhGQUE4RjtZQUM5RixrREFBa0Q7WUFDbEQsT0FBTyxTQUFTLENBQUM7UUFDbkI7WUFDRSw4RkFBOEY7WUFDOUYsOEZBQThGO1lBQzlGLDREQUE0RDtZQUM1RCxPQUFPLFNBQVMsQ0FBQztLQUNwQjtBQUNILENBQUM7QUEzQ0Qsa0RBMkNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpzb24sIGxvZ2dpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgcHJvbWlzZXMgYXMgZnMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZW52IH0gZnJvbSAncHJvY2Vzcyc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBmb3JjZUF1dG9jb21wbGV0ZSB9IGZyb20gJy4uL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3R0eSc7XG5pbXBvcnQgeyBhc3NlcnRJc0Vycm9yIH0gZnJvbSAnLi9lcnJvcic7XG5cbi8qKiBJbnRlcmZhY2UgZm9yIHRoZSBhdXRvY29tcGxldGlvbiBjb25maWd1cmF0aW9uIHN0b3JlZCBpbiB0aGUgZ2xvYmFsIHdvcmtzcGFjZS4gKi9cbmludGVyZmFjZSBDb21wbGV0aW9uQ29uZmlnIHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIGhhcyBiZWVuIHByb21wdGVkIHRvIHNldCB1cCBhdXRvY29tcGxldGlvbi4gSWYgYHRydWVgLCBzaG91bGQgKm5vdCpcbiAgICogcHJvbXB0IHRoZW0gYWdhaW4uXG4gICAqL1xuICBwcm9tcHRlZD86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGl0IGlzIGFwcHJvcHJpYXRlIHRvIHByb21wdCB0aGUgdXNlciB0byBzZXR1cCBhdXRvY29tcGxldGlvbi4gSWYgbm90LCBkb2VzIG5vdGhpbmcuIElmXG4gKiBzbyBwcm9tcHRzIGFuZCBzZXRzIHVwIGF1dG9jb21wbGV0aW9uIGZvciB0aGUgdXNlci4gUmV0dXJucyBhbiBleGl0IGNvZGUgaWYgdGhlIHByb2dyYW0gc2hvdWxkXG4gKiB0ZXJtaW5hdGUsIG90aGVyd2lzZSByZXR1cm5zIGB1bmRlZmluZWRgLlxuICogQHJldHVybnMgYW4gZXhpdCBjb2RlIGlmIHRoZSBwcm9ncmFtIHNob3VsZCB0ZXJtaW5hdGUsIHVuZGVmaW5lZCBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb25zaWRlclNldHRpbmdVcEF1dG9jb21wbGV0aW9uKFxuICBjb21tYW5kOiBzdHJpbmcsXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIsXG4pOiBQcm9taXNlPG51bWJlciB8IHVuZGVmaW5lZD4ge1xuICAvLyBDaGVjayBpZiB3ZSBzaG91bGQgcHJvbXB0IHRoZSB1c2VyIHRvIHNldHVwIGF1dG9jb21wbGV0aW9uLlxuICBjb25zdCBjb21wbGV0aW9uQ29uZmlnID0gYXdhaXQgZ2V0Q29tcGxldGlvbkNvbmZpZygpO1xuICBpZiAoIShhd2FpdCBzaG91bGRQcm9tcHRGb3JBdXRvY29tcGxldGlvblNldHVwKGNvbW1hbmQsIGNvbXBsZXRpb25Db25maWcpKSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7IC8vIEFscmVhZHkgc2V0IHVwIG9yIHByb21wdGVkIHByZXZpb3VzbHksIG5vdGhpbmcgdG8gZG8uXG4gIH1cblxuICAvLyBQcm9tcHQgdGhlIHVzZXIgYW5kIHJlY29yZCB0aGVpciByZXNwb25zZS5cbiAgY29uc3Qgc2hvdWxkU2V0dXBBdXRvY29tcGxldGlvbiA9IGF3YWl0IHByb21wdEZvckF1dG9jb21wbGV0aW9uKCk7XG4gIGlmICghc2hvdWxkU2V0dXBBdXRvY29tcGxldGlvbikge1xuICAgIC8vIFVzZXIgcmVqZWN0ZWQgdGhlIHByb21wdCBhbmQgZG9lc24ndCB3YW50IGF1dG9jb21wbGV0aW9uLlxuICAgIGxvZ2dlci5pbmZvKFxuICAgICAgYFxuT2ssIHlvdSB3b24ndCBiZSBwcm9tcHRlZCBhZ2Fpbi4gU2hvdWxkIHlvdSBjaGFuZ2UgeW91ciBtaW5kLCB0aGUgZm9sbG93aW5nIGNvbW1hbmQgd2lsbCBzZXQgdXAgYXV0b2NvbXBsZXRpb24gZm9yIHlvdTpcblxuICAgICR7Y29sb3JzLnllbGxvdyhgbmcgY29tcGxldGlvbmApfVxuICAgIGAudHJpbSgpLFxuICAgICk7XG5cbiAgICAvLyBTYXZlIGNvbmZpZ3VyYXRpb24gdG8gcmVtZW1iZXIgdGhhdCB0aGUgdXNlciB3YXMgcHJvbXB0ZWQgYW5kIGF2b2lkIHByb21wdGluZyBhZ2Fpbi5cbiAgICBhd2FpdCBzZXRDb21wbGV0aW9uQ29uZmlnKHsgLi4uY29tcGxldGlvbkNvbmZpZywgcHJvbXB0ZWQ6IHRydWUgfSk7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gVXNlciBhY2NlcHRlZCB0aGUgcHJvbXB0LCBzZXQgdXAgYXV0b2NvbXBsZXRpb24uXG4gIGxldCByY0ZpbGU6IHN0cmluZztcbiAgdHJ5IHtcbiAgICByY0ZpbGUgPSBhd2FpdCBpbml0aWFsaXplQXV0b2NvbXBsZXRlKCk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGFzc2VydElzRXJyb3IoZXJyKTtcbiAgICAvLyBGYWlsZWQgdG8gc2V0IHVwIGF1dG9jb21wZWxldGlvbiwgbG9nIHRoZSBlcnJvciBhbmQgYWJvcnQuXG4gICAgbG9nZ2VyLmVycm9yKGVyci5tZXNzYWdlKTtcblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgLy8gTm90aWZ5IHRoZSB1c2VyIGF1dG9jb21wbGV0aW9uIHdhcyBzZXQgdXAgc3VjY2Vzc2Z1bGx5LlxuICBsb2dnZXIuaW5mbyhcbiAgICBgXG5BcHBlbmRlZCBcXGBzb3VyY2UgPChuZyBjb21wbGV0aW9uIHNjcmlwdClcXGAgdG8gXFxgJHtyY0ZpbGV9XFxgLiBSZXN0YXJ0IHlvdXIgdGVybWluYWwgb3IgcnVuIHRoZSBmb2xsb3dpbmcgdG8gYXV0b2NvbXBsZXRlIFxcYG5nXFxgIGNvbW1hbmRzOlxuXG4gICAgJHtjb2xvcnMueWVsbG93KGBzb3VyY2UgPChuZyBjb21wbGV0aW9uIHNjcmlwdClgKX1cbiAgICBgLnRyaW0oKSxcbiAgKTtcblxuICBpZiAoKGF3YWl0IGhhc0dsb2JhbENsaUluc3RhbGwoKSkgPT09IGZhbHNlKSB7XG4gICAgbG9nZ2VyLndhcm4oXG4gICAgICAnU2V0dXAgY29tcGxldGVkIHN1Y2Nlc3NmdWxseSwgYnV0IHRoZXJlIGRvZXMgbm90IHNlZW0gdG8gYmUgYSBnbG9iYWwgaW5zdGFsbCBvZiB0aGUnICtcbiAgICAgICAgJyBBbmd1bGFyIENMSS4gRm9yIGF1dG9jb21wbGV0aW9uIHRvIHdvcmssIHRoZSBDTEkgd2lsbCBuZWVkIHRvIGJlIG9uIHlvdXIgYCRQQVRIYCwgd2hpY2gnICtcbiAgICAgICAgJyBpcyB0eXBpY2FsbHkgZG9uZSB3aXRoIHRoZSBgLWdgIGZsYWcgaW4gYG5wbSBpbnN0YWxsIC1nIEBhbmd1bGFyL2NsaWAuJyArXG4gICAgICAgICdcXG5cXG4nICtcbiAgICAgICAgJ0ZvciBtb3JlIGluZm9ybWF0aW9uLCBzZWUgaHR0cHM6Ly9hbmd1bGFyLmlvL2NsaS9jb21wbGV0aW9uI2dsb2JhbC1pbnN0YWxsJyxcbiAgICApO1xuICB9XG5cbiAgLy8gU2F2ZSBjb25maWd1cmF0aW9uIHRvIHJlbWVtYmVyIHRoYXQgdGhlIHVzZXIgd2FzIHByb21wdGVkLlxuICBhd2FpdCBzZXRDb21wbGV0aW9uQ29uZmlnKHsgLi4uY29tcGxldGlvbkNvbmZpZywgcHJvbXB0ZWQ6IHRydWUgfSk7XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0Q29tcGxldGlvbkNvbmZpZygpOiBQcm9taXNlPENvbXBsZXRpb25Db25maWcgfCB1bmRlZmluZWQ+IHtcbiAgY29uc3Qgd2tzcCA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG5cbiAgcmV0dXJuIHdrc3A/LmdldENsaSgpPy5bJ2NvbXBsZXRpb24nXTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2V0Q29tcGxldGlvbkNvbmZpZyhjb25maWc6IENvbXBsZXRpb25Db25maWcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3Qgd2tzcCA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gIGlmICghd2tzcCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgZ2xvYmFsIHdvcmtzcGFjZWApO1xuICB9XG5cbiAgd2tzcC5leHRlbnNpb25zWydjbGknXSA/Pz0ge307XG4gIGNvbnN0IGNsaSA9IHdrc3AuZXh0ZW5zaW9uc1snY2xpJ107XG4gIGlmICghanNvbi5pc0pzb25PYmplY3QoY2xpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBJbnZhbGlkIGNvbmZpZyBmb3VuZCBhdCAke3drc3AuZmlsZVBhdGh9LiBcXGBleHRlbnNpb25zLmNsaVxcYCBzaG91bGQgYmUgYW4gb2JqZWN0LmAsXG4gICAgKTtcbiAgfVxuICBjbGkuY29tcGxldGlvbiA9IGNvbmZpZyBhcyBqc29uLkpzb25PYmplY3Q7XG4gIGF3YWl0IHdrc3Auc2F2ZSgpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzaG91bGRQcm9tcHRGb3JBdXRvY29tcGxldGlvblNldHVwKFxuICBjb21tYW5kOiBzdHJpbmcsXG4gIGNvbmZpZz86IENvbXBsZXRpb25Db25maWcsXG4pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgLy8gRm9yY2Ugd2hldGhlciBvciBub3QgdG8gcHJvbXB0IGZvciBhdXRvY29tcGxldGUgdG8gZ2l2ZSBhbiBlYXN5IHBhdGggZm9yIGUyZSB0ZXN0aW5nIHRvIHNraXAuXG4gIGlmIChmb3JjZUF1dG9jb21wbGV0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGZvcmNlQXV0b2NvbXBsZXRlO1xuICB9XG5cbiAgLy8gRG9uJ3QgcHJvbXB0IG9uIGBuZyB1cGRhdGVgIG9yIGBuZyBjb21wbGV0aW9uYC5cbiAgaWYgKGNvbW1hbmQgPT09ICd1cGRhdGUnIHx8IGNvbW1hbmQgPT09ICdjb21wbGV0aW9uJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIE5vbi1pbnRlcmFjdGl2ZSBhbmQgY29udGludW91cyBpbnRlZ3JhdGlvbiBzeXN0ZW1zIGRvbid0IGNhcmUgYWJvdXQgYXV0b2NvbXBsZXRpb24uXG4gIGlmICghaXNUVFkoKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFNraXAgcHJvbXB0IGlmIHRoZSB1c2VyIGhhcyBhbHJlYWR5IGJlZW4gcHJvbXB0ZWQuXG4gIGlmIChjb25maWc/LnByb21wdGVkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gYCRIT01FYCB2YXJpYWJsZSBpcyBuZWNlc3NhcnkgdG8gZmluZCBSQyBmaWxlcyB0byBtb2RpZnkuXG4gIGNvbnN0IGhvbWUgPSBlbnZbJ0hPTUUnXTtcbiAgaWYgKCFob21lKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gR2V0IHBvc3NpYmxlIFJDIGZpbGVzIGZvciB0aGUgY3VycmVudCBzaGVsbC5cbiAgY29uc3Qgc2hlbGwgPSBlbnZbJ1NIRUxMJ107XG4gIGlmICghc2hlbGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgcmNGaWxlcyA9IGdldFNoZWxsUnVuQ29tbWFuZENhbmRpZGF0ZXMoc2hlbGwsIGhvbWUpO1xuICBpZiAoIXJjRmlsZXMpIHtcbiAgICByZXR1cm4gZmFsc2U7IC8vIFVua25vd24gc2hlbGwuXG4gIH1cblxuICAvLyBEb24ndCBwcm9tcHQgaWYgdGhlIHVzZXIgaXMgbWlzc2luZyBhIGdsb2JhbCBDTEkgaW5zdGFsbC4gQXV0b2NvbXBsZXRpb24gd29uJ3Qgd29yayBhZnRlciBzZXR1cFxuICAvLyBhbnl3YXkgYW5kIGNvdWxkIGJlIGFubm95aW5nIGZvciB1c2VycyBydW5uaW5nIG9uZS1vZmYgY29tbWFuZHMgdmlhIGBucHhgIG9yIHVzaW5nIGBucG0gc3RhcnRgLlxuICBpZiAoKGF3YWl0IGhhc0dsb2JhbENsaUluc3RhbGwoKSkgPT09IGZhbHNlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gQ2hlY2sgZWFjaCBSQyBmaWxlIGlmIHRoZXkgYWxyZWFkeSB1c2UgYG5nIGNvbXBsZXRpb24gc2NyaXB0YCBpbiBhbnkgY2FwYWNpdHkgYW5kIGRvbid0IHByb21wdC5cbiAgZm9yIChjb25zdCByY0ZpbGUgb2YgcmNGaWxlcykge1xuICAgIGNvbnN0IGNvbnRlbnRzID0gYXdhaXQgZnMucmVhZEZpbGUocmNGaWxlLCAndXRmLTgnKS5jYXRjaCgoKSA9PiB1bmRlZmluZWQpO1xuICAgIGlmIChjb250ZW50cz8uaW5jbHVkZXMoJ25nIGNvbXBsZXRpb24gc2NyaXB0JykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvbXB0Rm9yQXV0b2NvbXBsZXRpb24oKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIC8vIER5bmFtaWNhbGx5IGxvYWQgYGlucXVpcmVyYCBzbyB1c2VycyBkb24ndCBoYXZlIHRvIHBheSB0aGUgY29zdCBvZiBwYXJzaW5nIGFuZCBleGVjdXRpbmcgaXQgZm9yXG4gIC8vIHRoZSA5OSUgb2YgYnVpbGRzIHRoYXQgKmRvbid0KiBwcm9tcHQgZm9yIGF1dG9jb21wbGV0aW9uLlxuICBjb25zdCB7IHByb21wdCB9ID0gYXdhaXQgaW1wb3J0KCdpbnF1aXJlcicpO1xuICBjb25zdCB7IGF1dG9jb21wbGV0ZSB9ID0gYXdhaXQgcHJvbXB0PHsgYXV0b2NvbXBsZXRlOiBib29sZWFuIH0+KFtcbiAgICB7XG4gICAgICBuYW1lOiAnYXV0b2NvbXBsZXRlJyxcbiAgICAgIHR5cGU6ICdjb25maXJtJyxcbiAgICAgIG1lc3NhZ2U6IGBcbldvdWxkIHlvdSBsaWtlIHRvIGVuYWJsZSBhdXRvY29tcGxldGlvbj8gVGhpcyB3aWxsIHNldCB1cCB5b3VyIHRlcm1pbmFsIHNvIHByZXNzaW5nIFRBQiB3aGlsZSB0eXBpbmdcbkFuZ3VsYXIgQ0xJIGNvbW1hbmRzIHdpbGwgc2hvdyBwb3NzaWJsZSBvcHRpb25zIGFuZCBhdXRvY29tcGxldGUgYXJndW1lbnRzLiAoRW5hYmxpbmcgYXV0b2NvbXBsZXRpb25cbndpbGwgbW9kaWZ5IGNvbmZpZ3VyYXRpb24gZmlsZXMgaW4geW91ciBob21lIGRpcmVjdG9yeS4pXG4gICAgICBgXG4gICAgICAgIC5zcGxpdCgnXFxuJylcbiAgICAgICAgLmpvaW4oJyAnKVxuICAgICAgICAudHJpbSgpLFxuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICB9LFxuICBdKTtcblxuICByZXR1cm4gYXV0b2NvbXBsZXRlO1xufVxuXG4vKipcbiAqIFNldHMgdXAgYXV0b2NvbXBsZXRpb24gZm9yIHRoZSB1c2VyJ3MgdGVybWluYWwuIFRoaXMgYXR0ZW1wdHMgdG8gZmluZCB0aGUgY29uZmlndXJhdGlvbiBmaWxlIGZvclxuICogdGhlIGN1cnJlbnQgc2hlbGwgKGAuYmFzaHJjYCwgYC56c2hyY2AsIGV0Yy4pIGFuZCBhcHBlbmQgYSBjb21tYW5kIHdoaWNoIGVuYWJsZXMgYXV0b2NvbXBsZXRpb25cbiAqIGZvciB0aGUgQW5ndWxhciBDTEkuIFN1cHBvcnRzIG9ubHkgQmFzaCBhbmQgWnNoLiBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IGl0IHdhcyBzdWNjZXNzZnVsLlxuICogQHJldHVybiBUaGUgZnVsbCBwYXRoIG9mIHRoZSBjb25maWd1cmF0aW9uIGZpbGUgbW9kaWZpZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0aWFsaXplQXV0b2NvbXBsZXRlKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIC8vIEdldCB0aGUgY3VycmVudGx5IGFjdGl2ZSBgJFNIRUxMYCBhbmQgYCRIT01FYCBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gIGNvbnN0IHNoZWxsID0gZW52WydTSEVMTCddO1xuICBpZiAoIXNoZWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ2AkU0hFTExgIGVudmlyb25tZW50IHZhcmlhYmxlIG5vdCBzZXQuIEFuZ3VsYXIgQ0xJIGF1dG9jb21wbGV0aW9uIG9ubHkgc3VwcG9ydHMgQmFzaCBvcicgK1xuICAgICAgICBcIiBac2guIElmIHlvdSdyZSBvbiBXaW5kb3dzLCBDbWQgYW5kIFBvd2Vyc2hlbGwgZG9uJ3Qgc3VwcG9ydCBjb21tYW5kIGF1dG9jb21wbGV0aW9uLFwiICtcbiAgICAgICAgJyBidXQgR2l0IEJhc2ggb3IgV2luZG93cyBTdWJzeXN0ZW0gZm9yIExpbnV4IHNob3VsZCB3b3JrLCBzbyBwbGVhc2UgdHJ5IGFnYWluIGluIG9uZSBvZicgK1xuICAgICAgICAnIHRob3NlIGVudmlyb25tZW50cy4nLFxuICAgICk7XG4gIH1cbiAgY29uc3QgaG9tZSA9IGVudlsnSE9NRSddO1xuICBpZiAoIWhvbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnYCRIT01FYCBlbnZpcm9ubWVudCB2YXJpYWJsZSBub3Qgc2V0LiBTZXR0aW5nIHVwIGF1dG9jb21wbGV0aW9uIG1vZGlmaWVzIGNvbmZpZ3VyYXRpb24gZmlsZXMnICtcbiAgICAgICAgJyBpbiB0aGUgaG9tZSBkaXJlY3RvcnkgYW5kIG11c3QgYmUgc2V0LicsXG4gICAgKTtcbiAgfVxuXG4gIC8vIEdldCBhbGwgdGhlIGZpbGVzIHdlIGNhbiBhZGQgYG5nIGNvbXBsZXRpb25gIHRvIHdoaWNoIGFwcGx5IHRvIHRoZSB1c2VyJ3MgYCRTSEVMTGAuXG4gIGNvbnN0IHJ1bkNvbW1hbmRDYW5kaWRhdGVzID0gZ2V0U2hlbGxSdW5Db21tYW5kQ2FuZGlkYXRlcyhzaGVsbCwgaG9tZSk7XG4gIGlmICghcnVuQ29tbWFuZENhbmRpZGF0ZXMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgVW5rbm93biBcXGAkU0hFTExcXGAgZW52aXJvbm1lbnQgdmFyaWFibGUgdmFsdWUgKCR7c2hlbGx9KS4gQW5ndWxhciBDTEkgYXV0b2NvbXBsZXRpb24gb25seSBzdXBwb3J0cyBCYXNoIG9yIFpzaC5gLFxuICAgICk7XG4gIH1cblxuICAvLyBHZXQgdGhlIGZpcnN0IGZpbGUgdGhhdCBhbHJlYWR5IGV4aXN0cyBvciBmYWxsYmFjayB0byBhIG5ldyBmaWxlIG9mIHRoZSBmaXJzdCBjYW5kaWRhdGUuXG4gIGNvbnN0IGNhbmRpZGF0ZXMgPSBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoXG4gICAgcnVuQ29tbWFuZENhbmRpZGF0ZXMubWFwKChyY0ZpbGUpID0+IGZzLmFjY2VzcyhyY0ZpbGUpLnRoZW4oKCkgPT4gcmNGaWxlKSksXG4gICk7XG4gIGNvbnN0IHJjRmlsZSA9XG4gICAgY2FuZGlkYXRlcy5maW5kKFxuICAgICAgKHJlc3VsdCk6IHJlc3VsdCBpcyBQcm9taXNlRnVsZmlsbGVkUmVzdWx0PHN0cmluZz4gPT4gcmVzdWx0LnN0YXR1cyA9PT0gJ2Z1bGZpbGxlZCcsXG4gICAgKT8udmFsdWUgPz8gcnVuQ29tbWFuZENhbmRpZGF0ZXNbMF07XG5cbiAgLy8gQXBwZW5kIEFuZ3VsYXIgYXV0b2NvbXBsZXRpb24gc2V0dXAgdG8gUkMgZmlsZS5cbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5hcHBlbmRGaWxlKFxuICAgICAgcmNGaWxlLFxuICAgICAgJ1xcblxcbiMgTG9hZCBBbmd1bGFyIENMSSBhdXRvY29tcGxldGlvbi5cXG5zb3VyY2UgPChuZyBjb21wbGV0aW9uIHNjcmlwdClcXG4nLFxuICAgICk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGFzc2VydElzRXJyb3IoZXJyKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBhcHBlbmQgYXV0b2NvbXBsZXRpb24gc2V0dXAgdG8gXFxgJHtyY0ZpbGV9XFxgOlxcbiR7ZXJyLm1lc3NhZ2V9YCk7XG4gIH1cblxuICByZXR1cm4gcmNGaWxlO1xufVxuXG4vKiogUmV0dXJucyBhbiBvcmRlcmVkIGxpc3Qgb2YgcG9zc2libGUgY2FuZGlkYXRlcyBvZiBSQyBmaWxlcyB1c2VkIGJ5IHRoZSBnaXZlbiBzaGVsbC4gKi9cbmZ1bmN0aW9uIGdldFNoZWxsUnVuQ29tbWFuZENhbmRpZGF0ZXMoc2hlbGw6IHN0cmluZywgaG9tZTogc3RyaW5nKTogc3RyaW5nW10gfCB1bmRlZmluZWQge1xuICBpZiAoc2hlbGwudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnYmFzaCcpKSB7XG4gICAgcmV0dXJuIFsnLmJhc2hyYycsICcuYmFzaF9wcm9maWxlJywgJy5wcm9maWxlJ10ubWFwKChmaWxlKSA9PiBwYXRoLmpvaW4oaG9tZSwgZmlsZSkpO1xuICB9IGVsc2UgaWYgKHNoZWxsLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3pzaCcpKSB7XG4gICAgcmV0dXJuIFsnLnpzaHJjJywgJy56c2hfcHJvZmlsZScsICcucHJvZmlsZSddLm1hcCgoZmlsZSkgPT4gcGF0aC5qb2luKGhvbWUsIGZpbGUpKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyB3aGV0aGVyIHRoZSB1c2VyIGhhcyBhIGdsb2JhbCBDTEkgaW5zdGFsbCBvciBgdW5kZWZpbmVkYCBpZiB0aGlzIGNhbid0IGJlIGRldGVybWluZWQuXG4gKiBFeGVjdXRpb24gZnJvbSBgbnB4YCBpcyAqbm90KiBjb25zaWRlcmVkIGEgZ2xvYmFsIENMSSBpbnN0YWxsLlxuICpcbiAqIFRoaXMgZG9lcyAqbm90KiBtZWFuIHRoZSBjdXJyZW50IGV4ZWN1dGlvbiBpcyBmcm9tIGEgZ2xvYmFsIENMSSBpbnN0YWxsLCBvbmx5IHRoYXQgYSBnbG9iYWxcbiAqIGluc3RhbGwgZXhpc3RzIG9uIHRoZSBzeXN0ZW0uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYXNHbG9iYWxDbGlJbnN0YWxsKCk6IFByb21pc2U8Ym9vbGVhbiB8IHVuZGVmaW5lZD4ge1xuICAvLyBMaXN0IGFsbCBiaW5hcmllcyB3aXRoIHRoZSBgbmdgIG5hbWUgb24gdGhlIHVzZXIncyBgJFBBVEhgLlxuICBjb25zdCBwcm9jID0gZXhlY0ZpbGUoJ3doaWNoJywgWyctYScsICduZyddKTtcbiAgbGV0IHN0ZG91dCA9ICcnO1xuICBwcm9jLnN0ZG91dD8uYWRkTGlzdGVuZXIoJ2RhdGEnLCAoY29udGVudCkgPT4ge1xuICAgIHN0ZG91dCArPSBjb250ZW50O1xuICB9KTtcbiAgY29uc3QgZXhpdENvZGUgPSBhd2FpdCBuZXcgUHJvbWlzZTxudW1iZXIgfCBudWxsPigocmVzb2x2ZSkgPT4ge1xuICAgIHByb2MuYWRkTGlzdGVuZXIoJ2V4aXQnLCAoZXhpdENvZGUpID0+IHtcbiAgICAgIHJlc29sdmUoZXhpdENvZGUpO1xuICAgIH0pO1xuICB9KTtcblxuICBzd2l0Y2ggKGV4aXRDb2RlKSB7XG4gICAgY2FzZSAwOlxuICAgICAgLy8gU3VjY2Vzc2Z1bGx5IGxpc3RlZCBhbGwgYG5nYCBiaW5hcmllcyBvbiB0aGUgYCRQQVRIYC4gTG9vayBmb3IgYXQgbGVhc3Qgb25lIGxpbmUgd2hpY2ggaXMgYVxuICAgICAgLy8gZ2xvYmFsIGluc3RhbGwuIFdlIGNhbid0IGVhc2lseSBpZGVudGlmeSBnbG9iYWwgaW5zdGFsbHMsIGJ1dCBsb2NhbCBpbnN0YWxscyBhcmUgdHlwaWNhbGx5XG4gICAgICAvLyBwbGFjZWQgaW4gYG5vZGVfbW9kdWxlcy8uYmluYCBieSBOUE0gLyBZYXJuLiBgbnB4YCBhbHNvIGN1cnJlbnRseSBjYWNoZXMgZmlsZXMgYXRcbiAgICAgIC8vIGB+Ly5ucG0vX25weC8qL25vZGVfbW9kdWxlcy8uYmluL2AsIHNvIHRoZSBzYW1lIGxvZ2ljIGFwcGxpZXMuXG4gICAgICBjb25zdCBsaW5lcyA9IHN0ZG91dC5zcGxpdCgnXFxuJykuZmlsdGVyKChsaW5lKSA9PiBsaW5lICE9PSAnJyk7XG4gICAgICBjb25zdCBoYXNHbG9iYWxJbnN0YWxsID0gbGluZXMuc29tZSgobGluZSkgPT4ge1xuICAgICAgICAvLyBBIGJpbmFyeSBpcyBhIGxvY2FsIGluc3RhbGwgaWYgaXQgaXMgYSBkaXJlY3QgY2hpbGQgb2YgYSBgbm9kZV9tb2R1bGVzLy5iaW4vYCBkaXJlY3RvcnkuXG4gICAgICAgIGNvbnN0IHBhcmVudCA9IHBhdGgucGFyc2UocGF0aC5wYXJzZShsaW5lKS5kaXIpO1xuICAgICAgICBjb25zdCBncmFuZHBhcmVudCA9IHBhdGgucGFyc2UocGFyZW50LmRpcik7XG4gICAgICAgIGNvbnN0IGxvY2FsSW5zdGFsbCA9IGdyYW5kcGFyZW50LmJhc2UgPT09ICdub2RlX21vZHVsZXMnICYmIHBhcmVudC5iYXNlID09PSAnLmJpbic7XG5cbiAgICAgICAgcmV0dXJuICFsb2NhbEluc3RhbGw7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIGhhc0dsb2JhbEluc3RhbGw7XG4gICAgY2FzZSAxOlxuICAgICAgLy8gTm8gaW5zdGFuY2VzIG9mIGBuZ2Agb24gdGhlIHVzZXIncyBgJFBBVEhgLlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNhc2UgbnVsbDpcbiAgICAgIC8vIGB3aGljaGAgd2FzIGtpbGxlZCBieSBhIHNpZ25hbCBhbmQgZGlkIG5vdCBleGl0IGdyYWNlZnVsbHkuIE1heWJlIGl0IGh1bmcgb3Igc29tZXRoaW5nIGVsc2VcbiAgICAgIC8vIHdlbnQgdmVyeSB3cm9uZywgc28gdHJlYXQgdGhpcyBhcyBpbmNvbmNsdXNpdmUuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBgd2hpY2hgIHJldHVybnMgZXhpdCBjb2RlIDIgaWYgYW4gaW52YWxpZCBvcHRpb24gaXMgc3BlY2lmaWVkIGFuZCBgLWFgIGRvZXNuJ3QgYXBwZWFyIHRvIGJlXG4gICAgICAvLyBzdXBwb3J0ZWQgb24gYWxsIHN5c3RlbXMuIE90aGVyIGV4aXQgY29kZXMgbWVhbiB1bmtub3duIGVycm9ycyBvY2N1cnJlZC4gQ2FuJ3QgdGVsbCB3aGV0aGVyXG4gICAgICAvLyBDTEkgaXMgZ2xvYmFsbHkgaW5zdGFsbGVkLCBzbyB0cmVhdCB0aGlzIGFzIGluY29uY2x1c2l2ZS5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cbiJdfQ==