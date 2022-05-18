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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy91dGlsaXRpZXMvY29tcGxldGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFxRDtBQUNyRCxpREFBeUM7QUFDekMsMkJBQW9DO0FBQ3BDLDJDQUE2QjtBQUM3QixxQ0FBOEI7QUFDOUIsOENBQTRDO0FBQzVDLGdEQUFtRDtBQUNuRCwwRUFBcUU7QUFDckUsMENBQXlDO0FBV3pDOzs7OztHQUtHO0FBQ0ksS0FBSyxVQUFVLCtCQUErQixDQUNuRCxPQUFlLEVBQ2YsTUFBc0I7SUFFdEIsOERBQThEO0lBQzlELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxtQkFBbUIsRUFBRSxDQUFDO0lBQ3JELElBQUksQ0FBQyxDQUFDLE1BQU0sa0NBQWtDLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLENBQUMsRUFBRTtRQUMxRSxPQUFPLFNBQVMsQ0FBQyxDQUFDLHdEQUF3RDtLQUMzRTtJQUVELDZDQUE2QztJQUM3QyxNQUFNLHlCQUF5QixHQUFHLE1BQU0sdUJBQXVCLEVBQUUsQ0FBQztJQUNsRSxJQUFJLENBQUMseUJBQXlCLEVBQUU7UUFDOUIsNERBQTREO1FBQzVELE1BQU0sQ0FBQyxJQUFJLENBQ1Q7OztNQUdBLGNBQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDO0tBQy9CLENBQUMsSUFBSSxFQUFFLENBQ1AsQ0FBQztRQUVGLHVGQUF1RjtRQUN2RixNQUFNLG1CQUFtQixDQUFDLEVBQUUsR0FBRyxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUVuRSxPQUFPLFNBQVMsQ0FBQztLQUNsQjtJQUVELG1EQUFtRDtJQUNuRCxJQUFJLE1BQWMsQ0FBQztJQUNuQixJQUFJO1FBQ0Ys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QUFTLENBQUM7UUFDbkI7WUFDRSw4RkFBOEY7WUFDOUYsOEZBQThGO1lBQzlGLDREQUE0RDtZQUM1RCxPQUFPLFNBQVMsQ0FBQztLQUNwQjtBQUNILENBQUM7QUEzQ0Qsa0RBMkNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpzb24sIGxvZ2dpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgcHJvbWlzZXMgYXMgZnMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZW52IH0gZnJvbSAncHJvY2Vzcyc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBmb3JjZUF1dG9jb21wbGV0ZSB9IGZyb20gJy4uL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3R0eSc7XG5cbi8qKiBJbnRlcmZhY2UgZm9yIHRoZSBhdXRvY29tcGxldGlvbiBjb25maWd1cmF0aW9uIHN0b3JlZCBpbiB0aGUgZ2xvYmFsIHdvcmtzcGFjZS4gKi9cbmludGVyZmFjZSBDb21wbGV0aW9uQ29uZmlnIHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIGhhcyBiZWVuIHByb21wdGVkIHRvIHNldCB1cCBhdXRvY29tcGxldGlvbi4gSWYgYHRydWVgLCBzaG91bGQgKm5vdCpcbiAgICogcHJvbXB0IHRoZW0gYWdhaW4uXG4gICAqL1xuICBwcm9tcHRlZD86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGl0IGlzIGFwcHJvcHJpYXRlIHRvIHByb21wdCB0aGUgdXNlciB0byBzZXR1cCBhdXRvY29tcGxldGlvbi4gSWYgbm90LCBkb2VzIG5vdGhpbmcuIElmXG4gKiBzbyBwcm9tcHRzIGFuZCBzZXRzIHVwIGF1dG9jb21wbGV0aW9uIGZvciB0aGUgdXNlci4gUmV0dXJucyBhbiBleGl0IGNvZGUgaWYgdGhlIHByb2dyYW0gc2hvdWxkXG4gKiB0ZXJtaW5hdGUsIG90aGVyd2lzZSByZXR1cm5zIGB1bmRlZmluZWRgLlxuICogQHJldHVybnMgYW4gZXhpdCBjb2RlIGlmIHRoZSBwcm9ncmFtIHNob3VsZCB0ZXJtaW5hdGUsIHVuZGVmaW5lZCBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb25zaWRlclNldHRpbmdVcEF1dG9jb21wbGV0aW9uKFxuICBjb21tYW5kOiBzdHJpbmcsXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIsXG4pOiBQcm9taXNlPG51bWJlciB8IHVuZGVmaW5lZD4ge1xuICAvLyBDaGVjayBpZiB3ZSBzaG91bGQgcHJvbXB0IHRoZSB1c2VyIHRvIHNldHVwIGF1dG9jb21wbGV0aW9uLlxuICBjb25zdCBjb21wbGV0aW9uQ29uZmlnID0gYXdhaXQgZ2V0Q29tcGxldGlvbkNvbmZpZygpO1xuICBpZiAoIShhd2FpdCBzaG91bGRQcm9tcHRGb3JBdXRvY29tcGxldGlvblNldHVwKGNvbW1hbmQsIGNvbXBsZXRpb25Db25maWcpKSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7IC8vIEFscmVhZHkgc2V0IHVwIG9yIHByb21wdGVkIHByZXZpb3VzbHksIG5vdGhpbmcgdG8gZG8uXG4gIH1cblxuICAvLyBQcm9tcHQgdGhlIHVzZXIgYW5kIHJlY29yZCB0aGVpciByZXNwb25zZS5cbiAgY29uc3Qgc2hvdWxkU2V0dXBBdXRvY29tcGxldGlvbiA9IGF3YWl0IHByb21wdEZvckF1dG9jb21wbGV0aW9uKCk7XG4gIGlmICghc2hvdWxkU2V0dXBBdXRvY29tcGxldGlvbikge1xuICAgIC8vIFVzZXIgcmVqZWN0ZWQgdGhlIHByb21wdCBhbmQgZG9lc24ndCB3YW50IGF1dG9jb21wbGV0aW9uLlxuICAgIGxvZ2dlci5pbmZvKFxuICAgICAgYFxuT2ssIHlvdSB3b24ndCBiZSBwcm9tcHRlZCBhZ2Fpbi4gU2hvdWxkIHlvdSBjaGFuZ2UgeW91ciBtaW5kLCB0aGUgZm9sbG93aW5nIGNvbW1hbmQgd2lsbCBzZXQgdXAgYXV0b2NvbXBsZXRpb24gZm9yIHlvdTpcblxuICAgICR7Y29sb3JzLnllbGxvdyhgbmcgY29tcGxldGlvbmApfVxuICAgIGAudHJpbSgpLFxuICAgICk7XG5cbiAgICAvLyBTYXZlIGNvbmZpZ3VyYXRpb24gdG8gcmVtZW1iZXIgdGhhdCB0aGUgdXNlciB3YXMgcHJvbXB0ZWQgYW5kIGF2b2lkIHByb21wdGluZyBhZ2Fpbi5cbiAgICBhd2FpdCBzZXRDb21wbGV0aW9uQ29uZmlnKHsgLi4uY29tcGxldGlvbkNvbmZpZywgcHJvbXB0ZWQ6IHRydWUgfSk7XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gVXNlciBhY2NlcHRlZCB0aGUgcHJvbXB0LCBzZXQgdXAgYXV0b2NvbXBsZXRpb24uXG4gIGxldCByY0ZpbGU6IHN0cmluZztcbiAgdHJ5IHtcbiAgICByY0ZpbGUgPSBhd2FpdCBpbml0aWFsaXplQXV0b2NvbXBsZXRlKCk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIC8vIEZhaWxlZCB0byBzZXQgdXAgYXV0b2NvbXBlbGV0aW9uLCBsb2cgdGhlIGVycm9yIGFuZCBhYm9ydC5cbiAgICBsb2dnZXIuZXJyb3IoZXJyLm1lc3NhZ2UpO1xuXG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICAvLyBOb3RpZnkgdGhlIHVzZXIgYXV0b2NvbXBsZXRpb24gd2FzIHNldCB1cCBzdWNjZXNzZnVsbHkuXG4gIGxvZ2dlci5pbmZvKFxuICAgIGBcbkFwcGVuZGVkIFxcYHNvdXJjZSA8KG5nIGNvbXBsZXRpb24gc2NyaXB0KVxcYCB0byBcXGAke3JjRmlsZX1cXGAuIFJlc3RhcnQgeW91ciB0ZXJtaW5hbCBvciBydW4gdGhlIGZvbGxvd2luZyB0byBhdXRvY29tcGxldGUgXFxgbmdcXGAgY29tbWFuZHM6XG5cbiAgICAke2NvbG9ycy55ZWxsb3coYHNvdXJjZSA8KG5nIGNvbXBsZXRpb24gc2NyaXB0KWApfVxuICAgIGAudHJpbSgpLFxuICApO1xuXG4gIGlmICgoYXdhaXQgaGFzR2xvYmFsQ2xpSW5zdGFsbCgpKSA9PT0gZmFsc2UpIHtcbiAgICBsb2dnZXIud2FybihcbiAgICAgICdTZXR1cCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LCBidXQgdGhlcmUgZG9lcyBub3Qgc2VlbSB0byBiZSBhIGdsb2JhbCBpbnN0YWxsIG9mIHRoZScgK1xuICAgICAgICAnIEFuZ3VsYXIgQ0xJLiBGb3IgYXV0b2NvbXBsZXRpb24gdG8gd29yaywgdGhlIENMSSB3aWxsIG5lZWQgdG8gYmUgb24geW91ciBgJFBBVEhgLCB3aGljaCcgK1xuICAgICAgICAnIGlzIHR5cGljYWxseSBkb25lIHdpdGggdGhlIGAtZ2AgZmxhZyBpbiBgbnBtIGluc3RhbGwgLWcgQGFuZ3VsYXIvY2xpYC4nICtcbiAgICAgICAgJ1xcblxcbicgK1xuICAgICAgICAnRm9yIG1vcmUgaW5mb3JtYXRpb24sIHNlZSBodHRwczovL2FuZ3VsYXIuaW8vY2xpL2NvbXBsZXRpb24jZ2xvYmFsLWluc3RhbGwnLFxuICAgICk7XG4gIH1cblxuICAvLyBTYXZlIGNvbmZpZ3VyYXRpb24gdG8gcmVtZW1iZXIgdGhhdCB0aGUgdXNlciB3YXMgcHJvbXB0ZWQuXG4gIGF3YWl0IHNldENvbXBsZXRpb25Db25maWcoeyAuLi5jb21wbGV0aW9uQ29uZmlnLCBwcm9tcHRlZDogdHJ1ZSB9KTtcblxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRDb21wbGV0aW9uQ29uZmlnKCk6IFByb21pc2U8Q29tcGxldGlvbkNvbmZpZyB8IHVuZGVmaW5lZD4ge1xuICBjb25zdCB3a3NwID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcblxuICByZXR1cm4gd2tzcD8uZ2V0Q2xpKCk/LlsnY29tcGxldGlvbiddO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzZXRDb21wbGV0aW9uQ29uZmlnKGNvbmZpZzogQ29tcGxldGlvbkNvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB3a3NwID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcbiAgaWYgKCF3a3NwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBnbG9iYWwgd29ya3NwYWNlYCk7XG4gIH1cblxuICB3a3NwLmV4dGVuc2lvbnNbJ2NsaSddID8/PSB7fTtcbiAgY29uc3QgY2xpID0gd2tzcC5leHRlbnNpb25zWydjbGknXTtcbiAgaWYgKCFqc29uLmlzSnNvbk9iamVjdChjbGkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEludmFsaWQgY29uZmlnIGZvdW5kIGF0ICR7d2tzcC5maWxlUGF0aH0uIFxcYGV4dGVuc2lvbnMuY2xpXFxgIHNob3VsZCBiZSBhbiBvYmplY3QuYCxcbiAgICApO1xuICB9XG4gIGNsaS5jb21wbGV0aW9uID0gY29uZmlnIGFzIGpzb24uSnNvbk9iamVjdDtcbiAgYXdhaXQgd2tzcC5zYXZlKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNob3VsZFByb21wdEZvckF1dG9jb21wbGV0aW9uU2V0dXAoXG4gIGNvbW1hbmQ6IHN0cmluZyxcbiAgY29uZmlnPzogQ29tcGxldGlvbkNvbmZpZyxcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAvLyBGb3JjZSB3aGV0aGVyIG9yIG5vdCB0byBwcm9tcHQgZm9yIGF1dG9jb21wbGV0ZSB0byBnaXZlIGFuIGVhc3kgcGF0aCBmb3IgZTJlIHRlc3RpbmcgdG8gc2tpcC5cbiAgaWYgKGZvcmNlQXV0b2NvbXBsZXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZm9yY2VBdXRvY29tcGxldGU7XG4gIH1cblxuICAvLyBEb24ndCBwcm9tcHQgb24gYG5nIHVwZGF0ZWAgb3IgYG5nIGNvbXBsZXRpb25gLlxuICBpZiAoY29tbWFuZCA9PT0gJ3VwZGF0ZScgfHwgY29tbWFuZCA9PT0gJ2NvbXBsZXRpb24nKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gTm9uLWludGVyYWN0aXZlIGFuZCBjb250aW51b3VzIGludGVncmF0aW9uIHN5c3RlbXMgZG9uJ3QgY2FyZSBhYm91dCBhdXRvY29tcGxldGlvbi5cbiAgaWYgKCFpc1RUWSgpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gU2tpcCBwcm9tcHQgaWYgdGhlIHVzZXIgaGFzIGFscmVhZHkgYmVlbiBwcm9tcHRlZC5cbiAgaWYgKGNvbmZpZz8ucHJvbXB0ZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBgJEhPTUVgIHZhcmlhYmxlIGlzIG5lY2Vzc2FyeSB0byBmaW5kIFJDIGZpbGVzIHRvIG1vZGlmeS5cbiAgY29uc3QgaG9tZSA9IGVudlsnSE9NRSddO1xuICBpZiAoIWhvbWUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBHZXQgcG9zc2libGUgUkMgZmlsZXMgZm9yIHRoZSBjdXJyZW50IHNoZWxsLlxuICBjb25zdCBzaGVsbCA9IGVudlsnU0hFTEwnXTtcbiAgaWYgKCFzaGVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCByY0ZpbGVzID0gZ2V0U2hlbGxSdW5Db21tYW5kQ2FuZGlkYXRlcyhzaGVsbCwgaG9tZSk7XG4gIGlmICghcmNGaWxlcykge1xuICAgIHJldHVybiBmYWxzZTsgLy8gVW5rbm93biBzaGVsbC5cbiAgfVxuXG4gIC8vIERvbid0IHByb21wdCBpZiB0aGUgdXNlciBpcyBtaXNzaW5nIGEgZ2xvYmFsIENMSSBpbnN0YWxsLiBBdXRvY29tcGxldGlvbiB3b24ndCB3b3JrIGFmdGVyIHNldHVwXG4gIC8vIGFueXdheSBhbmQgY291bGQgYmUgYW5ub3lpbmcgZm9yIHVzZXJzIHJ1bm5pbmcgb25lLW9mZiBjb21tYW5kcyB2aWEgYG5weGAgb3IgdXNpbmcgYG5wbSBzdGFydGAuXG4gIGlmICgoYXdhaXQgaGFzR2xvYmFsQ2xpSW5zdGFsbCgpKSA9PT0gZmFsc2UpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBDaGVjayBlYWNoIFJDIGZpbGUgaWYgdGhleSBhbHJlYWR5IHVzZSBgbmcgY29tcGxldGlvbiBzY3JpcHRgIGluIGFueSBjYXBhY2l0eSBhbmQgZG9uJ3QgcHJvbXB0LlxuICBmb3IgKGNvbnN0IHJjRmlsZSBvZiByY0ZpbGVzKSB7XG4gICAgY29uc3QgY29udGVudHMgPSBhd2FpdCBmcy5yZWFkRmlsZShyY0ZpbGUsICd1dGYtOCcpLmNhdGNoKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgaWYgKGNvbnRlbnRzPy5pbmNsdWRlcygnbmcgY29tcGxldGlvbiBzY3JpcHQnKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9tcHRGb3JBdXRvY29tcGxldGlvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgLy8gRHluYW1pY2FsbHkgbG9hZCBgaW5xdWlyZXJgIHNvIHVzZXJzIGRvbid0IGhhdmUgdG8gcGF5IHRoZSBjb3N0IG9mIHBhcnNpbmcgYW5kIGV4ZWN1dGluZyBpdCBmb3JcbiAgLy8gdGhlIDk5JSBvZiBidWlsZHMgdGhhdCAqZG9uJ3QqIHByb21wdCBmb3IgYXV0b2NvbXBsZXRpb24uXG4gIGNvbnN0IHsgcHJvbXB0IH0gPSBhd2FpdCBpbXBvcnQoJ2lucXVpcmVyJyk7XG4gIGNvbnN0IHsgYXV0b2NvbXBsZXRlIH0gPSBhd2FpdCBwcm9tcHQ8eyBhdXRvY29tcGxldGU6IGJvb2xlYW4gfT4oW1xuICAgIHtcbiAgICAgIG5hbWU6ICdhdXRvY29tcGxldGUnLFxuICAgICAgdHlwZTogJ2NvbmZpcm0nLFxuICAgICAgbWVzc2FnZTogYFxuV291bGQgeW91IGxpa2UgdG8gZW5hYmxlIGF1dG9jb21wbGV0aW9uPyBUaGlzIHdpbGwgc2V0IHVwIHlvdXIgdGVybWluYWwgc28gcHJlc3NpbmcgVEFCIHdoaWxlIHR5cGluZ1xuQW5ndWxhciBDTEkgY29tbWFuZHMgd2lsbCBzaG93IHBvc3NpYmxlIG9wdGlvbnMgYW5kIGF1dG9jb21wbGV0ZSBhcmd1bWVudHMuIChFbmFibGluZyBhdXRvY29tcGxldGlvblxud2lsbCBtb2RpZnkgY29uZmlndXJhdGlvbiBmaWxlcyBpbiB5b3VyIGhvbWUgZGlyZWN0b3J5LilcbiAgICAgIGBcbiAgICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgICAuam9pbignICcpXG4gICAgICAgIC50cmltKCksXG4gICAgICBkZWZhdWx0OiB0cnVlLFxuICAgIH0sXG4gIF0pO1xuXG4gIHJldHVybiBhdXRvY29tcGxldGU7XG59XG5cbi8qKlxuICogU2V0cyB1cCBhdXRvY29tcGxldGlvbiBmb3IgdGhlIHVzZXIncyB0ZXJtaW5hbC4gVGhpcyBhdHRlbXB0cyB0byBmaW5kIHRoZSBjb25maWd1cmF0aW9uIGZpbGUgZm9yXG4gKiB0aGUgY3VycmVudCBzaGVsbCAoYC5iYXNocmNgLCBgLnpzaHJjYCwgZXRjLikgYW5kIGFwcGVuZCBhIGNvbW1hbmQgd2hpY2ggZW5hYmxlcyBhdXRvY29tcGxldGlvblxuICogZm9yIHRoZSBBbmd1bGFyIENMSS4gU3VwcG9ydHMgb25seSBCYXNoIGFuZCBac2guIFJldHVybnMgd2hldGhlciBvciBub3QgaXQgd2FzIHN1Y2Nlc3NmdWwuXG4gKiBAcmV0dXJuIFRoZSBmdWxsIHBhdGggb2YgdGhlIGNvbmZpZ3VyYXRpb24gZmlsZSBtb2RpZmllZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXRpYWxpemVBdXRvY29tcGxldGUoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgLy8gR2V0IHRoZSBjdXJyZW50bHkgYWN0aXZlIGAkU0hFTExgIGFuZCBgJEhPTUVgIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAgY29uc3Qgc2hlbGwgPSBlbnZbJ1NIRUxMJ107XG4gIGlmICghc2hlbGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnYCRTSEVMTGAgZW52aXJvbm1lbnQgdmFyaWFibGUgbm90IHNldC4gQW5ndWxhciBDTEkgYXV0b2NvbXBsZXRpb24gb25seSBzdXBwb3J0cyBCYXNoIG9yJyArXG4gICAgICAgIFwiIFpzaC4gSWYgeW91J3JlIG9uIFdpbmRvd3MsIENtZCBhbmQgUG93ZXJzaGVsbCBkb24ndCBzdXBwb3J0IGNvbW1hbmQgYXV0b2NvbXBsZXRpb24sXCIgK1xuICAgICAgICAnIGJ1dCBHaXQgQmFzaCBvciBXaW5kb3dzIFN1YnN5c3RlbSBmb3IgTGludXggc2hvdWxkIHdvcmssIHNvIHBsZWFzZSB0cnkgYWdhaW4gaW4gb25lIG9mJyArXG4gICAgICAgICcgdGhvc2UgZW52aXJvbm1lbnRzLicsXG4gICAgKTtcbiAgfVxuICBjb25zdCBob21lID0gZW52WydIT01FJ107XG4gIGlmICghaG9tZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdgJEhPTUVgIGVudmlyb25tZW50IHZhcmlhYmxlIG5vdCBzZXQuIFNldHRpbmcgdXAgYXV0b2NvbXBsZXRpb24gbW9kaWZpZXMgY29uZmlndXJhdGlvbiBmaWxlcycgK1xuICAgICAgICAnIGluIHRoZSBob21lIGRpcmVjdG9yeSBhbmQgbXVzdCBiZSBzZXQuJyxcbiAgICApO1xuICB9XG5cbiAgLy8gR2V0IGFsbCB0aGUgZmlsZXMgd2UgY2FuIGFkZCBgbmcgY29tcGxldGlvbmAgdG8gd2hpY2ggYXBwbHkgdG8gdGhlIHVzZXIncyBgJFNIRUxMYC5cbiAgY29uc3QgcnVuQ29tbWFuZENhbmRpZGF0ZXMgPSBnZXRTaGVsbFJ1bkNvbW1hbmRDYW5kaWRhdGVzKHNoZWxsLCBob21lKTtcbiAgaWYgKCFydW5Db21tYW5kQ2FuZGlkYXRlcykge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBVbmtub3duIFxcYCRTSEVMTFxcYCBlbnZpcm9ubWVudCB2YXJpYWJsZSB2YWx1ZSAoJHtzaGVsbH0pLiBBbmd1bGFyIENMSSBhdXRvY29tcGxldGlvbiBvbmx5IHN1cHBvcnRzIEJhc2ggb3IgWnNoLmAsXG4gICAgKTtcbiAgfVxuXG4gIC8vIEdldCB0aGUgZmlyc3QgZmlsZSB0aGF0IGFscmVhZHkgZXhpc3RzIG9yIGZhbGxiYWNrIHRvIGEgbmV3IGZpbGUgb2YgdGhlIGZpcnN0IGNhbmRpZGF0ZS5cbiAgY29uc3QgY2FuZGlkYXRlcyA9IGF3YWl0IFByb21pc2UuYWxsU2V0dGxlZChcbiAgICBydW5Db21tYW5kQ2FuZGlkYXRlcy5tYXAoKHJjRmlsZSkgPT4gZnMuYWNjZXNzKHJjRmlsZSkudGhlbigoKSA9PiByY0ZpbGUpKSxcbiAgKTtcbiAgY29uc3QgcmNGaWxlID1cbiAgICBjYW5kaWRhdGVzLmZpbmQoXG4gICAgICAocmVzdWx0KTogcmVzdWx0IGlzIFByb21pc2VGdWxmaWxsZWRSZXN1bHQ8c3RyaW5nPiA9PiByZXN1bHQuc3RhdHVzID09PSAnZnVsZmlsbGVkJyxcbiAgICApPy52YWx1ZSA/PyBydW5Db21tYW5kQ2FuZGlkYXRlc1swXTtcblxuICAvLyBBcHBlbmQgQW5ndWxhciBhdXRvY29tcGxldGlvbiBzZXR1cCB0byBSQyBmaWxlLlxuICB0cnkge1xuICAgIGF3YWl0IGZzLmFwcGVuZEZpbGUoXG4gICAgICByY0ZpbGUsXG4gICAgICAnXFxuXFxuIyBMb2FkIEFuZ3VsYXIgQ0xJIGF1dG9jb21wbGV0aW9uLlxcbnNvdXJjZSA8KG5nIGNvbXBsZXRpb24gc2NyaXB0KVxcbicsXG4gICAgKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gYXBwZW5kIGF1dG9jb21wbGV0aW9uIHNldHVwIHRvIFxcYCR7cmNGaWxlfVxcYDpcXG4ke2Vyci5tZXNzYWdlfWApO1xuICB9XG5cbiAgcmV0dXJuIHJjRmlsZTtcbn1cblxuLyoqIFJldHVybnMgYW4gb3JkZXJlZCBsaXN0IG9mIHBvc3NpYmxlIGNhbmRpZGF0ZXMgb2YgUkMgZmlsZXMgdXNlZCBieSB0aGUgZ2l2ZW4gc2hlbGwuICovXG5mdW5jdGlvbiBnZXRTaGVsbFJ1bkNvbW1hbmRDYW5kaWRhdGVzKHNoZWxsOiBzdHJpbmcsIGhvbWU6IHN0cmluZyk6IHN0cmluZ1tdIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHNoZWxsLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2Jhc2gnKSkge1xuICAgIHJldHVybiBbJy5iYXNocmMnLCAnLmJhc2hfcHJvZmlsZScsICcucHJvZmlsZSddLm1hcCgoZmlsZSkgPT4gcGF0aC5qb2luKGhvbWUsIGZpbGUpKTtcbiAgfSBlbHNlIGlmIChzaGVsbC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCd6c2gnKSkge1xuICAgIHJldHVybiBbJy56c2hyYycsICcuenNoX3Byb2ZpbGUnLCAnLnByb2ZpbGUnXS5tYXAoKGZpbGUpID0+IHBhdGguam9pbihob21lLCBmaWxlKSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgd2hldGhlciB0aGUgdXNlciBoYXMgYSBnbG9iYWwgQ0xJIGluc3RhbGwgb3IgYHVuZGVmaW5lZGAgaWYgdGhpcyBjYW4ndCBiZSBkZXRlcm1pbmVkLlxuICogRXhlY3V0aW9uIGZyb20gYG5weGAgaXMgKm5vdCogY29uc2lkZXJlZCBhIGdsb2JhbCBDTEkgaW5zdGFsbC5cbiAqXG4gKiBUaGlzIGRvZXMgKm5vdCogbWVhbiB0aGUgY3VycmVudCBleGVjdXRpb24gaXMgZnJvbSBhIGdsb2JhbCBDTEkgaW5zdGFsbCwgb25seSB0aGF0IGEgZ2xvYmFsXG4gKiBpbnN0YWxsIGV4aXN0cyBvbiB0aGUgc3lzdGVtLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFzR2xvYmFsQ2xpSW5zdGFsbCgpOiBQcm9taXNlPGJvb2xlYW4gfCB1bmRlZmluZWQ+IHtcbiAgLy8gTGlzdCBhbGwgYmluYXJpZXMgd2l0aCB0aGUgYG5nYCBuYW1lIG9uIHRoZSB1c2VyJ3MgYCRQQVRIYC5cbiAgY29uc3QgcHJvYyA9IGV4ZWNGaWxlKCd3aGljaCcsIFsnLWEnLCAnbmcnXSk7XG4gIGxldCBzdGRvdXQgPSAnJztcbiAgcHJvYy5zdGRvdXQ/LmFkZExpc3RlbmVyKCdkYXRhJywgKGNvbnRlbnQpID0+IHtcbiAgICBzdGRvdXQgKz0gY29udGVudDtcbiAgfSk7XG4gIGNvbnN0IGV4aXRDb2RlID0gYXdhaXQgbmV3IFByb21pc2U8bnVtYmVyIHwgbnVsbD4oKHJlc29sdmUpID0+IHtcbiAgICBwcm9jLmFkZExpc3RlbmVyKCdleGl0JywgKGV4aXRDb2RlKSA9PiB7XG4gICAgICByZXNvbHZlKGV4aXRDb2RlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgc3dpdGNoIChleGl0Q29kZSkge1xuICAgIGNhc2UgMDpcbiAgICAgIC8vIFN1Y2Nlc3NmdWxseSBsaXN0ZWQgYWxsIGBuZ2AgYmluYXJpZXMgb24gdGhlIGAkUEFUSGAuIExvb2sgZm9yIGF0IGxlYXN0IG9uZSBsaW5lIHdoaWNoIGlzIGFcbiAgICAgIC8vIGdsb2JhbCBpbnN0YWxsLiBXZSBjYW4ndCBlYXNpbHkgaWRlbnRpZnkgZ2xvYmFsIGluc3RhbGxzLCBidXQgbG9jYWwgaW5zdGFsbHMgYXJlIHR5cGljYWxseVxuICAgICAgLy8gcGxhY2VkIGluIGBub2RlX21vZHVsZXMvLmJpbmAgYnkgTlBNIC8gWWFybi4gYG5weGAgYWxzbyBjdXJyZW50bHkgY2FjaGVzIGZpbGVzIGF0XG4gICAgICAvLyBgfi8ubnBtL19ucHgvKi9ub2RlX21vZHVsZXMvLmJpbi9gLCBzbyB0aGUgc2FtZSBsb2dpYyBhcHBsaWVzLlxuICAgICAgY29uc3QgbGluZXMgPSBzdGRvdXQuc3BsaXQoJ1xcbicpLmZpbHRlcigobGluZSkgPT4gbGluZSAhPT0gJycpO1xuICAgICAgY29uc3QgaGFzR2xvYmFsSW5zdGFsbCA9IGxpbmVzLnNvbWUoKGxpbmUpID0+IHtcbiAgICAgICAgLy8gQSBiaW5hcnkgaXMgYSBsb2NhbCBpbnN0YWxsIGlmIGl0IGlzIGEgZGlyZWN0IGNoaWxkIG9mIGEgYG5vZGVfbW9kdWxlcy8uYmluL2AgZGlyZWN0b3J5LlxuICAgICAgICBjb25zdCBwYXJlbnQgPSBwYXRoLnBhcnNlKHBhdGgucGFyc2UobGluZSkuZGlyKTtcbiAgICAgICAgY29uc3QgZ3JhbmRwYXJlbnQgPSBwYXRoLnBhcnNlKHBhcmVudC5kaXIpO1xuICAgICAgICBjb25zdCBsb2NhbEluc3RhbGwgPSBncmFuZHBhcmVudC5iYXNlID09PSAnbm9kZV9tb2R1bGVzJyAmJiBwYXJlbnQuYmFzZSA9PT0gJy5iaW4nO1xuXG4gICAgICAgIHJldHVybiAhbG9jYWxJbnN0YWxsO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBoYXNHbG9iYWxJbnN0YWxsO1xuICAgIGNhc2UgMTpcbiAgICAgIC8vIE5vIGluc3RhbmNlcyBvZiBgbmdgIG9uIHRoZSB1c2VyJ3MgYCRQQVRIYC5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjYXNlIG51bGw6XG4gICAgICAvLyBgd2hpY2hgIHdhcyBraWxsZWQgYnkgYSBzaWduYWwgYW5kIGRpZCBub3QgZXhpdCBncmFjZWZ1bGx5LiBNYXliZSBpdCBodW5nIG9yIHNvbWV0aGluZyBlbHNlXG4gICAgICAvLyB3ZW50IHZlcnkgd3JvbmcsIHNvIHRyZWF0IHRoaXMgYXMgaW5jb25jbHVzaXZlLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBkZWZhdWx0OlxuICAgICAgLy8gYHdoaWNoYCByZXR1cm5zIGV4aXQgY29kZSAyIGlmIGFuIGludmFsaWQgb3B0aW9uIGlzIHNwZWNpZmllZCBhbmQgYC1hYCBkb2Vzbid0IGFwcGVhciB0byBiZVxuICAgICAgLy8gc3VwcG9ydGVkIG9uIGFsbCBzeXN0ZW1zLiBPdGhlciBleGl0IGNvZGVzIG1lYW4gdW5rbm93biBlcnJvcnMgb2NjdXJyZWQuIENhbid0IHRlbGwgd2hldGhlclxuICAgICAgLy8gQ0xJIGlzIGdsb2JhbGx5IGluc3RhbGxlZCwgc28gdHJlYXQgdGhpcyBhcyBpbmNvbmNsdXNpdmUuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG4iXX0=