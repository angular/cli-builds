"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const command_1 = require("../models/command");
function pickOne(of) {
    return of[Math.floor(Math.random() * of.length)];
}
class AwesomeCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'make-this-awesome';
        this.description = '';
        this.hidden = true;
        this.arguments = [];
        this.options = [];
    }
    run() {
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
    }
}
exports.default = AwesomeCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWFzdGVyLWVnZy5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvZWFzdGVyLWVnZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVILCtDQUFnRDtBQUNoRCwrQ0FBb0Q7QUFFcEQsaUJBQWlCLEVBQVk7SUFDM0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNuRCxDQUFDO0FBRUQsb0JBQW9DLFNBQVEsaUJBQU87SUFBbkQ7O1FBQ2tCLFNBQUksR0FBRyxtQkFBbUIsQ0FBQztRQUMzQixnQkFBVyxHQUFHLEVBQUUsQ0FBQztRQUNqQixXQUFNLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLGNBQVMsR0FBYSxFQUFFLENBQUM7UUFDekIsWUFBTyxHQUFhLEVBQUUsQ0FBQztJQWVsQyxDQUFDO0lBYkMsR0FBRztRQUNELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQztZQUNyQiw2Q0FBNkM7WUFDN0MsMkNBQTJDO1lBQzNDLG9CQUFvQjtZQUNwQiw2QkFBNkI7WUFDN0IsMENBQTBDO1lBQzFDLG1DQUFtQztZQUNuQyw2Q0FBNkM7WUFDN0MsMEJBQTBCO1NBQzNCLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMzQyxDQUFDO0NBQ0Y7QUFwQkQsaUNBb0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IENvbW1hbmQsIE9wdGlvbiB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcblxuZnVuY3Rpb24gcGlja09uZShvZjogc3RyaW5nW10pOiBzdHJpbmcge1xuICByZXR1cm4gb2ZbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogb2YubGVuZ3RoKV07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEF3ZXNvbWVDb21tYW5kIGV4dGVuZHMgQ29tbWFuZCB7XG4gIHB1YmxpYyByZWFkb25seSBuYW1lID0gJ21ha2UtdGhpcy1hd2Vzb21lJztcbiAgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJyc7XG4gIHB1YmxpYyByZWFkb25seSBoaWRkZW4gPSB0cnVlO1xuICByZWFkb25seSBhcmd1bWVudHM6IHN0cmluZ1tdID0gW107XG4gIHJlYWRvbmx5IG9wdGlvbnM6IE9wdGlvbltdID0gW107XG5cbiAgcnVuKCkge1xuICAgIGNvbnN0IHBocmFzZSA9IHBpY2tPbmUoW1xuICAgICAgYFlvdSdyZSBvbiBpdCwgdGhlcmUncyBub3RoaW5nIGZvciBtZSB0byBkbyFgLFxuICAgICAgYExldCdzIHRha2UgYSBsb29rLi4uIG5vcGUsIGl0J3MgYWxsIGdvb2QhYCxcbiAgICAgIGBZb3UncmUgZG9pbmcgZmluZS5gLFxuICAgICAgYFlvdSdyZSBhbHJlYWR5IGRvaW5nIGdyZWF0LmAsXG4gICAgICBgTm90aGluZyB0byBkbzsgYWxyZWFkeSBhd2Vzb21lLiBFeGl0aW5nLmAsXG4gICAgICBgRXJyb3IgNDE4OiBBcyBBd2Vzb21lIEFzIENhbiBHZXQuYCxcbiAgICAgIGBJIHNweSB3aXRoIG15IGxpdHRsZSBleWUgYSBncmVhdCBkZXZlbG9wZXIhYCxcbiAgICAgIGBOb29wLi4uIGFscmVhZHkgYXdlc29tZS5gLFxuICAgIF0pO1xuICAgIHRoaXMubG9nZ2VyLmluZm8odGVybWluYWwuZ3JlZW4ocGhyYXNlKSk7XG4gIH1cbn1cbiJdfQ==