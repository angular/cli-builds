"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFiles = formatFiles;
const node_child_process_1 = require("node:child_process");
const promises_1 = require("node:fs/promises");
const node_module_1 = require("node:module");
const node_path_1 = require("node:path");
const node_util_1 = require("node:util");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
let prettierCliPath;
/**
 * Formats files using Prettier.
 * @param cwd The current working directory.
 * @param files The files to format.
 */
async function formatFiles(cwd, files) {
    if (!files.size) {
        return;
    }
    if (prettierCliPath === undefined) {
        try {
            const prettierPath = (0, node_module_1.createRequire)(cwd + '/').resolve('prettier/package.json');
            const prettierPackageJson = JSON.parse(await (0, promises_1.readFile)(prettierPath, 'utf-8'));
            prettierCliPath = (0, node_path_1.join)((0, node_path_1.dirname)(prettierPath), prettierPackageJson.bin);
        }
        catch {
            // Prettier is not installed.
            prettierCliPath = null;
        }
    }
    if (!prettierCliPath) {
        return;
    }
    await execFileAsync(process.execPath, [prettierCliPath, '--write', '--no-error-on-unmatched-pattern', ...files], {
        cwd,
        shell: false,
    });
}
//# sourceMappingURL=prettier.js.map