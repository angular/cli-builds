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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvdXRpbGl0aWVzL3Byb21wdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILG1EQUFxQztBQUNyQywrQkFBOEI7QUFFdkIsS0FBSyxVQUFVLGVBQWUsQ0FDbkMsT0FBZSxFQUNmLGVBQXdCLEVBQ3hCLGFBQXVCO0lBRXZCLElBQUksQ0FBQyxJQUFBLFdBQUssR0FBRSxFQUFFO1FBQ1osT0FBTyxhQUFhLGFBQWIsYUFBYSxjQUFiLGFBQWEsR0FBSSxlQUFlLENBQUM7S0FDekM7SUFFRCxNQUFNLFFBQVEsR0FBc0I7UUFDbEMsSUFBSSxFQUFFLFNBQVM7UUFDZixJQUFJLEVBQUUsY0FBYztRQUNwQixNQUFNLEVBQUUsRUFBRTtRQUNWLE9BQU87UUFDUCxPQUFPLEVBQUUsZUFBZTtLQUN6QixDQUFDO0lBRUYsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUVsRCxPQUFPLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNqQyxDQUFDO0FBcEJELDBDQW9CQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyBpbnF1aXJlciBmcm9tICdpbnF1aXJlcic7XG5pbXBvcnQgeyBpc1RUWSB9IGZyb20gJy4vdHR5JztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFza0NvbmZpcm1hdGlvbihcbiAgbWVzc2FnZTogc3RyaW5nLFxuICBkZWZhdWx0UmVzcG9uc2U6IGJvb2xlYW4sXG4gIG5vVFRZUmVzcG9uc2U/OiBib29sZWFuLFxuKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGlmICghaXNUVFkoKSkge1xuICAgIHJldHVybiBub1RUWVJlc3BvbnNlID8/IGRlZmF1bHRSZXNwb25zZTtcbiAgfVxuXG4gIGNvbnN0IHF1ZXN0aW9uOiBpbnF1aXJlci5RdWVzdGlvbiA9IHtcbiAgICB0eXBlOiAnY29uZmlybScsXG4gICAgbmFtZTogJ2NvbmZpcm1hdGlvbicsXG4gICAgcHJlZml4OiAnJyxcbiAgICBtZXNzYWdlLFxuICAgIGRlZmF1bHQ6IGRlZmF1bHRSZXNwb25zZSxcbiAgfTtcblxuICBjb25zdCBhbnN3ZXJzID0gYXdhaXQgaW5xdWlyZXIucHJvbXB0KFtxdWVzdGlvbl0pO1xuXG4gIHJldHVybiBhbnN3ZXJzWydjb25maXJtYXRpb24nXTtcbn1cbiJdfQ==