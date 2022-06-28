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
exports.colors = exports.removeColor = void 0;
const ansiColors = __importStar(require("ansi-colors"));
const tty_1 = require("tty");
function supportColor() {
    if (process.env.FORCE_COLOR !== undefined) {
        // 2 colors: FORCE_COLOR = 0 (Disables colors), depth 1
        // 16 colors: FORCE_COLOR = 1, depth 4
        // 256 colors: FORCE_COLOR = 2, depth 8
        // 16,777,216 colors: FORCE_COLOR = 3, depth 16
        // See: https://nodejs.org/dist/latest-v12.x/docs/api/tty.html#tty_writestream_getcolordepth_env
        // and https://github.com/nodejs/node/blob/b9f36062d7b5c5039498e98d2f2c180dca2a7065/lib/internal/tty.js#L106;
        switch (process.env.FORCE_COLOR) {
            case '':
            case 'true':
            case '1':
            case '2':
            case '3':
                return true;
            default:
                return false;
        }
    }
    if (process.stdout instanceof tty_1.WriteStream) {
        return process.stdout.getColorDepth() > 1;
    }
    return false;
}
function removeColor(text) {
    // This has been created because when colors.enabled is false unstyle doesn't work
    // see: https://github.com/doowb/ansi-colors/blob/a4794363369d7b4d1872d248fc43a12761640d8e/index.js#L38
    return text.replace(ansiColors.ansiRegex, '');
}
exports.removeColor = removeColor;
// Create a separate instance to prevent unintended global changes to the color configuration
const colors = ansiColors.create();
exports.colors = colors;
colors.enabled = supportColor();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvdXRpbGl0aWVzL2NvbG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsd0RBQTBDO0FBQzFDLDZCQUFrQztBQUlsQyxTQUFTLFlBQVk7SUFDbkIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUU7UUFDekMsdURBQXVEO1FBQ3ZELHNDQUFzQztRQUN0Qyx1Q0FBdUM7UUFDdkMsK0NBQStDO1FBQy9DLGdHQUFnRztRQUNoRyw2R0FBNkc7UUFDN0csUUFBUSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRTtZQUMvQixLQUFLLEVBQUUsQ0FBQztZQUNSLEtBQUssTUFBTSxDQUFDO1lBQ1osS0FBSyxHQUFHLENBQUM7WUFDVCxLQUFLLEdBQUcsQ0FBQztZQUNULEtBQUssR0FBRztnQkFDTixPQUFPLElBQUksQ0FBQztZQUNkO2dCQUNFLE9BQU8sS0FBSyxDQUFDO1NBQ2hCO0tBQ0Y7SUFFRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLFlBQVksaUJBQVcsRUFBRTtRQUN6QyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQzNDO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDO0FBRUQsU0FBZ0IsV0FBVyxDQUFDLElBQVk7SUFDdEMsa0ZBQWtGO0lBQ2xGLHVHQUF1RztJQUN2RyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNoRCxDQUFDO0FBSkQsa0NBSUM7QUFFRCw2RkFBNkY7QUFDN0YsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRzFCLHdCQUFNO0FBRmYsTUFBTSxDQUFDLE9BQU8sR0FBRyxZQUFZLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyBhbnNpQ29sb3JzIGZyb20gJ2Fuc2ktY29sb3JzJztcbmltcG9ydCB7IFdyaXRlU3RyZWFtIH0gZnJvbSAndHR5JztcblxudHlwZSBBbnNpQ29sb3JzID0gdHlwZW9mIGFuc2lDb2xvcnM7XG5cbmZ1bmN0aW9uIHN1cHBvcnRDb2xvcigpOiBib29sZWFuIHtcbiAgaWYgKHByb2Nlc3MuZW52LkZPUkNFX0NPTE9SICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyAyIGNvbG9yczogRk9SQ0VfQ09MT1IgPSAwIChEaXNhYmxlcyBjb2xvcnMpLCBkZXB0aCAxXG4gICAgLy8gMTYgY29sb3JzOiBGT1JDRV9DT0xPUiA9IDEsIGRlcHRoIDRcbiAgICAvLyAyNTYgY29sb3JzOiBGT1JDRV9DT0xPUiA9IDIsIGRlcHRoIDhcbiAgICAvLyAxNiw3NzcsMjE2IGNvbG9yczogRk9SQ0VfQ09MT1IgPSAzLCBkZXB0aCAxNlxuICAgIC8vIFNlZTogaHR0cHM6Ly9ub2RlanMub3JnL2Rpc3QvbGF0ZXN0LXYxMi54L2RvY3MvYXBpL3R0eS5odG1sI3R0eV93cml0ZXN0cmVhbV9nZXRjb2xvcmRlcHRoX2VudlxuICAgIC8vIGFuZCBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvYmxvYi9iOWYzNjA2MmQ3YjVjNTAzOTQ5OGU5OGQyZjJjMTgwZGNhMmE3MDY1L2xpYi9pbnRlcm5hbC90dHkuanMjTDEwNjtcbiAgICBzd2l0Y2ggKHByb2Nlc3MuZW52LkZPUkNFX0NPTE9SKSB7XG4gICAgICBjYXNlICcnOlxuICAgICAgY2FzZSAndHJ1ZSc6XG4gICAgICBjYXNlICcxJzpcbiAgICAgIGNhc2UgJzInOlxuICAgICAgY2FzZSAnMyc6XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmIChwcm9jZXNzLnN0ZG91dCBpbnN0YW5jZW9mIFdyaXRlU3RyZWFtKSB7XG4gICAgcmV0dXJuIHByb2Nlc3Muc3Rkb3V0LmdldENvbG9yRGVwdGgoKSA+IDE7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVDb2xvcih0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBUaGlzIGhhcyBiZWVuIGNyZWF0ZWQgYmVjYXVzZSB3aGVuIGNvbG9ycy5lbmFibGVkIGlzIGZhbHNlIHVuc3R5bGUgZG9lc24ndCB3b3JrXG4gIC8vIHNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Rvb3diL2Fuc2ktY29sb3JzL2Jsb2IvYTQ3OTQzNjMzNjlkN2I0ZDE4NzJkMjQ4ZmM0M2ExMjc2MTY0MGQ4ZS9pbmRleC5qcyNMMzhcbiAgcmV0dXJuIHRleHQucmVwbGFjZShhbnNpQ29sb3JzLmFuc2lSZWdleCwgJycpO1xufVxuXG4vLyBDcmVhdGUgYSBzZXBhcmF0ZSBpbnN0YW5jZSB0byBwcmV2ZW50IHVuaW50ZW5kZWQgZ2xvYmFsIGNoYW5nZXMgdG8gdGhlIGNvbG9yIGNvbmZpZ3VyYXRpb25cbmNvbnN0IGNvbG9ycyA9IGFuc2lDb2xvcnMuY3JlYXRlKCk7XG5jb2xvcnMuZW5hYmxlZCA9IHN1cHBvcnRDb2xvcigpO1xuXG5leHBvcnQgeyBjb2xvcnMgfTtcbiJdfQ==