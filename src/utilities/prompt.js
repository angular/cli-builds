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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9wcm9tcHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCxtREFBcUM7QUFDckMsK0JBQThCO0FBRXZCLEtBQUssVUFBVSxlQUFlLENBQ25DLE9BQWUsRUFDZixlQUF3QixFQUN4QixhQUF1QjtJQUV2QixJQUFJLENBQUMsSUFBQSxXQUFLLEdBQUUsRUFBRTtRQUNaLE9BQU8sYUFBYSxhQUFiLGFBQWEsY0FBYixhQUFhLEdBQUksZUFBZSxDQUFDO0tBQ3pDO0lBRUQsTUFBTSxRQUFRLEdBQXNCO1FBQ2xDLElBQUksRUFBRSxTQUFTO1FBQ2YsSUFBSSxFQUFFLGNBQWM7UUFDcEIsTUFBTSxFQUFFLEVBQUU7UUFDVixPQUFPO1FBQ1AsT0FBTyxFQUFFLGVBQWU7S0FDekIsQ0FBQztJQUVGLE1BQU0sT0FBTyxHQUFHLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFFbEQsT0FBTyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDakMsQ0FBQztBQXBCRCwwQ0FvQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgaW5xdWlyZXIgZnJvbSAnaW5xdWlyZXInO1xuaW1wb3J0IHsgaXNUVFkgfSBmcm9tICcuL3R0eSc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhc2tDb25maXJtYXRpb24oXG4gIG1lc3NhZ2U6IHN0cmluZyxcbiAgZGVmYXVsdFJlc3BvbnNlOiBib29sZWFuLFxuICBub1RUWVJlc3BvbnNlPzogYm9vbGVhbixcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBpZiAoIWlzVFRZKCkpIHtcbiAgICByZXR1cm4gbm9UVFlSZXNwb25zZSA/PyBkZWZhdWx0UmVzcG9uc2U7XG4gIH1cblxuICBjb25zdCBxdWVzdGlvbjogaW5xdWlyZXIuUXVlc3Rpb24gPSB7XG4gICAgdHlwZTogJ2NvbmZpcm0nLFxuICAgIG5hbWU6ICdjb25maXJtYXRpb24nLFxuICAgIHByZWZpeDogJycsXG4gICAgbWVzc2FnZSxcbiAgICBkZWZhdWx0OiBkZWZhdWx0UmVzcG9uc2UsXG4gIH07XG5cbiAgY29uc3QgYW5zd2VycyA9IGF3YWl0IGlucXVpcmVyLnByb21wdChbcXVlc3Rpb25dKTtcblxuICByZXR1cm4gYW5zd2Vyc1snY29uZmlybWF0aW9uJ107XG59XG4iXX0=