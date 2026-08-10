"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.colors = void 0;
exports.supportColor = supportColor;
const node_tty_1 = require("node:tty");
const node_util_1 = require("node:util");
exports.colors = Object.freeze({
    black: (text) => (0, node_util_1.styleText)('black', text),
    blue: (text) => (0, node_util_1.styleText)('blue', text),
    bold: (text) => (0, node_util_1.styleText)('bold', text),
    cyan: (text) => (0, node_util_1.styleText)('cyan', text),
    dim: (text) => (0, node_util_1.styleText)('dim', text),
    gray: (text) => (0, node_util_1.styleText)('gray', text),
    green: (text) => (0, node_util_1.styleText)('green', text),
    italic: (text) => (0, node_util_1.styleText)('italic', text),
    magenta: (text) => (0, node_util_1.styleText)('magenta', text),
    red: (text) => (0, node_util_1.styleText)('red', text),
    underline: (text) => (0, node_util_1.styleText)('underline', text),
    white: (text) => (0, node_util_1.styleText)('white', text),
    yellow: (text) => (0, node_util_1.styleText)('yellow', text),
});
function supportColor(stream = process.stdout) {
    if (stream instanceof node_tty_1.WriteStream) {
        return stream.hasColors();
    }
    try {
        // The hasColors function does not rely on any instance state and should ideally be static
        return node_tty_1.WriteStream.prototype.hasColors();
    }
    catch {
        return process.env['FORCE_COLOR'] !== undefined && process.env['FORCE_COLOR'] !== '0';
    }
}
//# sourceMappingURL=color.js.map