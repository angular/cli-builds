"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwesomeCommand = void 0;
const command_1 = require("../models/command");
const color_1 = require("../utilities/color");
function pickOne(of) {
    return of[Math.floor(Math.random() * of.length)];
}
class AwesomeCommand extends command_1.Command {
    async run() {
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
        this.logger.info(color_1.colors.green(phrase));
    }
}
exports.AwesomeCommand = AwesomeCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWFzdGVyLWVnZy1pbXBsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvZWFzdGVyLWVnZy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILCtDQUE0QztBQUM1Qyw4Q0FBNEM7QUFHNUMsU0FBUyxPQUFPLENBQUMsRUFBWTtJQUMzQixPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNuRCxDQUFDO0FBRUQsTUFBYSxjQUFlLFNBQVEsaUJBQTZCO0lBQy9ELEtBQUssQ0FBQyxHQUFHO1FBQ1AsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDO1lBQ3JCLDZDQUE2QztZQUM3QywyQ0FBMkM7WUFDM0Msb0JBQW9CO1lBQ3BCLDZCQUE2QjtZQUM3QiwwQ0FBMEM7WUFDMUMsbUNBQW1DO1lBQ25DLDZDQUE2QztZQUM3QywwQkFBMEI7U0FDM0IsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7Q0FDRjtBQWRELHdDQWNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEF3ZXNvbWVDb21tYW5kU2NoZW1hIH0gZnJvbSAnLi9lYXN0ZXItZWdnJztcblxuZnVuY3Rpb24gcGlja09uZShvZjogc3RyaW5nW10pOiBzdHJpbmcge1xuICByZXR1cm4gb2ZbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogb2YubGVuZ3RoKV07XG59XG5cbmV4cG9ydCBjbGFzcyBBd2Vzb21lQ29tbWFuZCBleHRlbmRzIENvbW1hbmQ8QXdlc29tZUNvbW1hbmRTY2hlbWE+IHtcbiAgYXN5bmMgcnVuKCkge1xuICAgIGNvbnN0IHBocmFzZSA9IHBpY2tPbmUoW1xuICAgICAgYFlvdSdyZSBvbiBpdCwgdGhlcmUncyBub3RoaW5nIGZvciBtZSB0byBkbyFgLFxuICAgICAgYExldCdzIHRha2UgYSBsb29rLi4uIG5vcGUsIGl0J3MgYWxsIGdvb2QhYCxcbiAgICAgIGBZb3UncmUgZG9pbmcgZmluZS5gLFxuICAgICAgYFlvdSdyZSBhbHJlYWR5IGRvaW5nIGdyZWF0LmAsXG4gICAgICBgTm90aGluZyB0byBkbzsgYWxyZWFkeSBhd2Vzb21lLiBFeGl0aW5nLmAsXG4gICAgICBgRXJyb3IgNDE4OiBBcyBBd2Vzb21lIEFzIENhbiBHZXQuYCxcbiAgICAgIGBJIHNweSB3aXRoIG15IGxpdHRsZSBleWUgYSBncmVhdCBkZXZlbG9wZXIhYCxcbiAgICAgIGBOb29wLi4uIGFscmVhZHkgYXdlc29tZS5gLFxuICAgIF0pO1xuICAgIHRoaXMubG9nZ2VyLmluZm8oY29sb3JzLmdyZWVuKHBocmFzZSkpO1xuICB9XG59XG4iXX0=