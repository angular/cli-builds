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
exports.askQuestion = exports.askConfirmation = void 0;
const tty_1 = require("./tty");
async function askConfirmation(message, defaultResponse, noTTYResponse) {
    if (!(0, tty_1.isTTY)()) {
        return noTTYResponse ?? defaultResponse;
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
async function askQuestion(message, choices, defaultResponseIndex, noTTYResponse) {
    if (!(0, tty_1.isTTY)()) {
        return noTTYResponse;
    }
    const question = {
        type: 'list',
        name: 'answer',
        prefix: '',
        message,
        choices,
        default: defaultResponseIndex,
    };
    const { prompt } = await Promise.resolve().then(() => __importStar(require('inquirer')));
    const answers = await prompt([question]);
    return answers['answer'];
}
exports.askQuestion = askQuestion;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9wcm9tcHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCwrQkFBOEI7QUFFdkIsS0FBSyxVQUFVLGVBQWUsQ0FDbkMsT0FBZSxFQUNmLGVBQXdCLEVBQ3hCLGFBQXVCO0lBRXZCLElBQUksQ0FBQyxJQUFBLFdBQUssR0FBRSxFQUFFO1FBQ1osT0FBTyxhQUFhLElBQUksZUFBZSxDQUFDO0tBQ3pDO0lBQ0QsTUFBTSxRQUFRLEdBQWE7UUFDekIsSUFBSSxFQUFFLFNBQVM7UUFDZixJQUFJLEVBQUUsY0FBYztRQUNwQixNQUFNLEVBQUUsRUFBRTtRQUNWLE9BQU87UUFDUCxPQUFPLEVBQUUsZUFBZTtLQUN6QixDQUFDO0lBRUYsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLHdEQUFhLFVBQVUsR0FBQyxDQUFDO0lBQzVDLE1BQU0sT0FBTyxHQUFHLE1BQU0sTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUV6QyxPQUFPLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNqQyxDQUFDO0FBcEJELDBDQW9CQztBQUVNLEtBQUssVUFBVSxXQUFXLENBQy9CLE9BQWUsRUFDZixPQUE0QixFQUM1QixvQkFBNEIsRUFDNUIsYUFBNEI7SUFFNUIsSUFBSSxDQUFDLElBQUEsV0FBSyxHQUFFLEVBQUU7UUFDWixPQUFPLGFBQWEsQ0FBQztLQUN0QjtJQUNELE1BQU0sUUFBUSxHQUFpQjtRQUM3QixJQUFJLEVBQUUsTUFBTTtRQUNaLElBQUksRUFBRSxRQUFRO1FBQ2QsTUFBTSxFQUFFLEVBQUU7UUFDVixPQUFPO1FBQ1AsT0FBTztRQUNQLE9BQU8sRUFBRSxvQkFBb0I7S0FDOUIsQ0FBQztJQUVGLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyx3REFBYSxVQUFVLEdBQUMsQ0FBQztJQUM1QyxNQUFNLE9BQU8sR0FBRyxNQUFNLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFFekMsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQXRCRCxrQ0FzQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBMaXN0Q2hvaWNlT3B0aW9ucywgTGlzdFF1ZXN0aW9uLCBRdWVzdGlvbiB9IGZyb20gJ2lucXVpcmVyJztcbmltcG9ydCB7IGlzVFRZIH0gZnJvbSAnLi90dHknO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXNrQ29uZmlybWF0aW9uKFxuICBtZXNzYWdlOiBzdHJpbmcsXG4gIGRlZmF1bHRSZXNwb25zZTogYm9vbGVhbixcbiAgbm9UVFlSZXNwb25zZT86IGJvb2xlYW4sXG4pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgaWYgKCFpc1RUWSgpKSB7XG4gICAgcmV0dXJuIG5vVFRZUmVzcG9uc2UgPz8gZGVmYXVsdFJlc3BvbnNlO1xuICB9XG4gIGNvbnN0IHF1ZXN0aW9uOiBRdWVzdGlvbiA9IHtcbiAgICB0eXBlOiAnY29uZmlybScsXG4gICAgbmFtZTogJ2NvbmZpcm1hdGlvbicsXG4gICAgcHJlZml4OiAnJyxcbiAgICBtZXNzYWdlLFxuICAgIGRlZmF1bHQ6IGRlZmF1bHRSZXNwb25zZSxcbiAgfTtcblxuICBjb25zdCB7IHByb21wdCB9ID0gYXdhaXQgaW1wb3J0KCdpbnF1aXJlcicpO1xuICBjb25zdCBhbnN3ZXJzID0gYXdhaXQgcHJvbXB0KFtxdWVzdGlvbl0pO1xuXG4gIHJldHVybiBhbnN3ZXJzWydjb25maXJtYXRpb24nXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFza1F1ZXN0aW9uKFxuICBtZXNzYWdlOiBzdHJpbmcsXG4gIGNob2ljZXM6IExpc3RDaG9pY2VPcHRpb25zW10sXG4gIGRlZmF1bHRSZXNwb25zZUluZGV4OiBudW1iZXIsXG4gIG5vVFRZUmVzcG9uc2U6IG51bGwgfCBzdHJpbmcsXG4pOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgaWYgKCFpc1RUWSgpKSB7XG4gICAgcmV0dXJuIG5vVFRZUmVzcG9uc2U7XG4gIH1cbiAgY29uc3QgcXVlc3Rpb246IExpc3RRdWVzdGlvbiA9IHtcbiAgICB0eXBlOiAnbGlzdCcsXG4gICAgbmFtZTogJ2Fuc3dlcicsXG4gICAgcHJlZml4OiAnJyxcbiAgICBtZXNzYWdlLFxuICAgIGNob2ljZXMsXG4gICAgZGVmYXVsdDogZGVmYXVsdFJlc3BvbnNlSW5kZXgsXG4gIH07XG5cbiAgY29uc3QgeyBwcm9tcHQgfSA9IGF3YWl0IGltcG9ydCgnaW5xdWlyZXInKTtcbiAgY29uc3QgYW5zd2VycyA9IGF3YWl0IHByb21wdChbcXVlc3Rpb25dKTtcblxuICByZXR1cm4gYW5zd2Vyc1snYW5zd2VyJ107XG59XG4iXX0=