"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const node_1 = require("@angular-devkit/core/node");
const colors = require("ansi-colors");
const tty_1 = require("tty");
const util_1 = require("util");
const command_runner_1 = require("../../models/command-runner");
const config_1 = require("../../utilities/config");
const project_1 = require("../../utilities/project");
async function default_1(options) {
    // Typings do not contain the function call (added in Node.js v9.9.0)
    const supportsColor = process.stdout instanceof tty_1.WriteStream &&
        process.stdout.getColorDepth() > 1;
    const logger = node_1.createConsoleLogger(false, process.stdout, process.stderr, {
        info: s => supportsColor ? s : colors.unstyle(s),
        debug: s => supportsColor ? s : colors.unstyle(s),
        warn: s => supportsColor ? colors.bold.yellow(s) : colors.unstyle(s),
        error: s => supportsColor ? colors.bold.red(s) : colors.unstyle(s),
        fatal: s => supportsColor ? colors.bold.red(s) : colors.unstyle(s),
    });
    // Redirect console to logger
    console.log = function () { logger.info(util_1.format.apply(null, arguments)); };
    console.info = function () { logger.info(util_1.format.apply(null, arguments)); };
    console.warn = function () { logger.warn(util_1.format.apply(null, arguments)); };
    console.error = function () { logger.error(util_1.format.apply(null, arguments)); };
    let projectDetails = project_1.getWorkspaceDetails();
    if (projectDetails === null) {
        const [, localPath] = config_1.getWorkspaceRaw('local');
        if (localPath !== null) {
            logger.fatal(`An invalid configuration file was found ['${localPath}'].`
                + ' Please delete the file before running the command.');
            return 1;
        }
        projectDetails = { root: process.cwd() };
    }
    try {
        const maybeExitCode = await command_runner_1.runCommand(options.cliArgs, logger, projectDetails);
        if (typeof maybeExitCode === 'number') {
            console.assert(Number.isInteger(maybeExitCode));
            return maybeExitCode;
        }
        return 0;
    }
    catch (err) {
        if (err instanceof Error) {
            logger.fatal(err.message);
            if (err.stack) {
                logger.fatal(err.stack);
            }
        }
        else if (typeof err === 'string') {
            logger.fatal(err);
        }
        else if (typeof err === 'number') {
            // Log nothing.
        }
        else {
            logger.fatal('An unexpected error occurred: ' + JSON.stringify(err));
        }
        if (options.testing) {
            debugger;
            throw err;
        }
        return 1;
    }
}
exports.default = default_1;
