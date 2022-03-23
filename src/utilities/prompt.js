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
exports.askConfirmation = void 0;
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
    const { prompt } = await Promise.resolve().then(() => __importStar(require('inquirer')));
    const answers = await prompt([question]);
    return answers['confirmation'];
}
exports.askConfirmation = askConfirmation;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9wcm9tcHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCwrQkFBOEI7QUFFdkIsS0FBSyxVQUFVLGVBQWUsQ0FDbkMsT0FBZSxFQUNmLGVBQXdCLEVBQ3hCLGFBQXVCO0lBRXZCLElBQUksQ0FBQyxJQUFBLFdBQUssR0FBRSxFQUFFO1FBQ1osT0FBTyxhQUFhLGFBQWIsYUFBYSxjQUFiLGFBQWEsR0FBSSxlQUFlLENBQUM7S0FDekM7SUFDRCxNQUFNLFFBQVEsR0FBYTtRQUN6QixJQUFJLEVBQUUsU0FBUztRQUNmLElBQUksRUFBRSxjQUFjO1FBQ3BCLE1BQU0sRUFBRSxFQUFFO1FBQ1YsT0FBTztRQUNQLE9BQU8sRUFBRSxlQUFlO0tBQ3pCLENBQUM7SUFFRixNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsd0RBQWEsVUFBVSxHQUFDLENBQUM7SUFDNUMsTUFBTSxPQUFPLEdBQUcsTUFBTSxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBRXpDLE9BQU8sT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ2pDLENBQUM7QUFwQkQsMENBb0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB0eXBlIHsgUXVlc3Rpb24gfSBmcm9tICdpbnF1aXJlcic7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4vdHR5JztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFza0NvbmZpcm1hdGlvbihcbiAgbWVzc2FnZTogc3RyaW5nLFxuICBkZWZhdWx0UmVzcG9uc2U6IGJvb2xlYW4sXG4gIG5vVFRZUmVzcG9uc2U/OiBib29sZWFuLFxuKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGlmICghaXNUVFkoKSkge1xuICAgIHJldHVybiBub1RUWVJlc3BvbnNlID8/IGRlZmF1bHRSZXNwb25zZTtcbiAgfVxuICBjb25zdCBxdWVzdGlvbjogUXVlc3Rpb24gPSB7XG4gICAgdHlwZTogJ2NvbmZpcm0nLFxuICAgIG5hbWU6ICdjb25maXJtYXRpb24nLFxuICAgIHByZWZpeDogJycsXG4gICAgbWVzc2FnZSxcbiAgICBkZWZhdWx0OiBkZWZhdWx0UmVzcG9uc2UsXG4gIH07XG5cbiAgY29uc3QgeyBwcm9tcHQgfSA9IGF3YWl0IGltcG9ydCgnaW5xdWlyZXInKTtcbiAgY29uc3QgYW5zd2VycyA9IGF3YWl0IHByb21wdChbcXVlc3Rpb25dKTtcblxuICByZXR1cm4gYW5zd2Vyc1snY29uZmlybWF0aW9uJ107XG59XG4iXX0=