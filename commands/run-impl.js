"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunCommand = void 0;
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const architect_command_1 = require("../models/architect-command");
class RunCommand extends architect_command_1.ArchitectCommand {
    async run(options) {
        if (options.target) {
            return this.runArchitectTarget(options);
        }
        else {
            throw new Error('Invalid architect target.');
        }
    }
}
exports.RunCommand = RunCommand;
