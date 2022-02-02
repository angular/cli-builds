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
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
exports.askConfirmation = void 0;
const inquirer = __importStar(require("inquirer"));
const tty_1 = require("./tty");
async function askConfirmation(message, defaultResponse, noTTYResponse) {
    if (!(0, tty_1.isTTY)()) {
        return noTTYResponse !== null && noTTYResponse !== void 0 ? noTTYResponse : defaultResponse;
    }
    const question = {
        type: 'confirm',
        name: 'confirmation',
        prefix: '',
        message,
        default: defaultResponse,
    };
    const answers = await inquirer.prompt([question]);
    return answers['confirmation'];
}
exports.askConfirmation = askConfirmation;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvdXRpbGl0aWVzL3Byb21wdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsbURBQXFDO0FBQ3JDLCtCQUE4QjtBQUV2QixLQUFLLFVBQVUsZUFBZSxDQUNuQyxPQUFlLEVBQ2YsZUFBd0IsRUFDeEIsYUFBdUI7SUFFdkIsSUFBSSxDQUFDLElBQUEsV0FBSyxHQUFFLEVBQUU7UUFDWixPQUFPLGFBQWEsYUFBYixhQUFhLGNBQWIsYUFBYSxHQUFJLGVBQWUsQ0FBQztLQUN6QztJQUVELE1BQU0sUUFBUSxHQUFzQjtRQUNsQyxJQUFJLEVBQUUsU0FBUztRQUNmLElBQUksRUFBRSxjQUFjO1FBQ3BCLE1BQU0sRUFBRSxFQUFFO1FBQ1YsT0FBTztRQUNQLE9BQU8sRUFBRSxlQUFlO0tBQ3pCLENBQUM7SUFFRixNQUFNLE9BQU8sR0FBRyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBRWxELE9BQU8sT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ2pDLENBQUM7QUFwQkQsMENBb0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIGlucXVpcmVyIGZyb20gJ2lucXVpcmVyJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi90dHknO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXNrQ29uZmlybWF0aW9uKFxuICBtZXNzYWdlOiBzdHJpbmcsXG4gIGRlZmF1bHRSZXNwb25zZTogYm9vbGVhbixcbiAgbm9UVFlSZXNwb25zZT86IGJvb2xlYW4sXG4pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgaWYgKCFpc1RUWSgpKSB7XG4gICAgcmV0dXJuIG5vVFRZUmVzcG9uc2UgPz8gZGVmYXVsdFJlc3BvbnNlO1xuICB9XG5cbiAgY29uc3QgcXVlc3Rpb246IGlucXVpcmVyLlF1ZXN0aW9uID0ge1xuICAgIHR5cGU6ICdjb25maXJtJyxcbiAgICBuYW1lOiAnY29uZmlybWF0aW9uJyxcbiAgICBwcmVmaXg6ICcnLFxuICAgIG1lc3NhZ2UsXG4gICAgZGVmYXVsdDogZGVmYXVsdFJlc3BvbnNlLFxuICB9O1xuXG4gIGNvbnN0IGFuc3dlcnMgPSBhd2FpdCBpbnF1aXJlci5wcm9tcHQoW3F1ZXN0aW9uXSk7XG5cbiAgcmV0dXJuIGFuc3dlcnNbJ2NvbmZpcm1hdGlvbiddO1xufVxuIl19