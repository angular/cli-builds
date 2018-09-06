"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const command_1 = require("../models/command");
function pickOne(of) {
    return of[Math.floor(Math.random() * of.length)];
}
class AwesomeCommand extends command_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const phrase = pickOne([
                `You're on it, there's nothing for me to do!`,
                `Let's take a look... nope, it's all good!`,
                `You're doing fine.`,
                `You're already doing great.`,
                `Nothing to do; already awesome. Exiting.`,
                `Error 418: As Awesome As Can Get.`,
                `I spy with my little eye a great developer!`,
                `Noop... already awesome.`,
            ]);
            this.logger.info(core_1.terminal.green(phrase));
        });
    }
}
exports.AwesomeCommand = AwesomeCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWFzdGVyLWVnZy1pbXBsLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9lYXN0ZXItZWdnLWltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUVILCtDQUFnRDtBQUNoRCwrQ0FBNEM7QUFFNUMsU0FBUyxPQUFPLENBQUMsRUFBWTtJQUMzQixPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNuRCxDQUFDO0FBRUQsTUFBYSxjQUFlLFNBQVEsaUJBQU87SUFDbkMsR0FBRzs7WUFDUCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUM7Z0JBQ3JCLDZDQUE2QztnQkFDN0MsMkNBQTJDO2dCQUMzQyxvQkFBb0I7Z0JBQ3BCLDZCQUE2QjtnQkFDN0IsMENBQTBDO2dCQUMxQyxtQ0FBbUM7Z0JBQ25DLDZDQUE2QztnQkFDN0MsMEJBQTBCO2FBQzNCLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUMzQyxDQUFDO0tBQUE7Q0FDRjtBQWRELHdDQWNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5cbmZ1bmN0aW9uIHBpY2tPbmUob2Y6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgcmV0dXJuIG9mW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG9mLmxlbmd0aCldO1xufVxuXG5leHBvcnQgY2xhc3MgQXdlc29tZUNvbW1hbmQgZXh0ZW5kcyBDb21tYW5kIHtcbiAgYXN5bmMgcnVuKCkge1xuICAgIGNvbnN0IHBocmFzZSA9IHBpY2tPbmUoW1xuICAgICAgYFlvdSdyZSBvbiBpdCwgdGhlcmUncyBub3RoaW5nIGZvciBtZSB0byBkbyFgLFxuICAgICAgYExldCdzIHRha2UgYSBsb29rLi4uIG5vcGUsIGl0J3MgYWxsIGdvb2QhYCxcbiAgICAgIGBZb3UncmUgZG9pbmcgZmluZS5gLFxuICAgICAgYFlvdSdyZSBhbHJlYWR5IGRvaW5nIGdyZWF0LmAsXG4gICAgICBgTm90aGluZyB0byBkbzsgYWxyZWFkeSBhd2Vzb21lLiBFeGl0aW5nLmAsXG4gICAgICBgRXJyb3IgNDE4OiBBcyBBd2Vzb21lIEFzIENhbiBHZXQuYCxcbiAgICAgIGBJIHNweSB3aXRoIG15IGxpdHRsZSBleWUgYSBncmVhdCBkZXZlbG9wZXIhYCxcbiAgICAgIGBOb29wLi4uIGFscmVhZHkgYXdlc29tZS5gLFxuICAgIF0pO1xuICAgIHRoaXMubG9nZ2VyLmluZm8odGVybWluYWwuZ3JlZW4ocGhyYXNlKSk7XG4gIH1cbn1cbiJdfQ==