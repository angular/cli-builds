// packages/angular/cli/src/utilities/color.js
import { WriteStream } from "node:tty";
import { styleText } from "node:util";
var colors = Object.freeze({
  black: (text) => styleText("black", text),
  blue: (text) => styleText("blue", text),
  bold: (text) => styleText("bold", text),
  cyan: (text) => styleText("cyan", text),
  dim: (text) => styleText("dim", text),
  gray: (text) => styleText("gray", text),
  green: (text) => styleText("green", text),
  italic: (text) => styleText("italic", text),
  magenta: (text) => styleText("magenta", text),
  red: (text) => styleText("red", text),
  underline: (text) => styleText("underline", text),
  white: (text) => styleText("white", text),
  yellow: (text) => styleText("yellow", text)
});
function supportColor(stream = process.stdout) {
  if (stream instanceof WriteStream) {
    return stream.hasColors();
  }
  try {
    return WriteStream.prototype.hasColors();
  } catch {
    return process.env["FORCE_COLOR"] !== void 0 && process.env["FORCE_COLOR"] !== "0";
  }
}

export {
  colors,
  supportColor
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
