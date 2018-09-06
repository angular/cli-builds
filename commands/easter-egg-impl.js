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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWFzdGVyLWVnZy1pbXBsLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9lYXN0ZXItZWdnLWltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUVILCtDQUFnRDtBQUNoRCwrQ0FBNEM7QUFFNUMsaUJBQWlCLEVBQVk7SUFDM0IsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQUVELG9CQUE0QixTQUFRLGlCQUFPO0lBQ25DLEdBQUc7O1lBQ1AsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDO2dCQUNyQiw2Q0FBNkM7Z0JBQzdDLDJDQUEyQztnQkFDM0Msb0JBQW9CO2dCQUNwQiw2QkFBNkI7Z0JBQzdCLDBDQUEwQztnQkFDMUMsbUNBQW1DO2dCQUNuQyw2Q0FBNkM7Z0JBQzdDLDBCQUEwQjthQUMzQixDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDM0MsQ0FBQztLQUFBO0NBQ0Y7QUFkRCx3Q0FjQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL2NvbW1hbmQnO1xuXG5mdW5jdGlvbiBwaWNrT25lKG9mOiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gIHJldHVybiBvZltNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBvZi5sZW5ndGgpXTtcbn1cblxuZXhwb3J0IGNsYXNzIEF3ZXNvbWVDb21tYW5kIGV4dGVuZHMgQ29tbWFuZCB7XG4gIGFzeW5jIHJ1bigpIHtcbiAgICBjb25zdCBwaHJhc2UgPSBwaWNrT25lKFtcbiAgICAgIGBZb3UncmUgb24gaXQsIHRoZXJlJ3Mgbm90aGluZyBmb3IgbWUgdG8gZG8hYCxcbiAgICAgIGBMZXQncyB0YWtlIGEgbG9vay4uLiBub3BlLCBpdCdzIGFsbCBnb29kIWAsXG4gICAgICBgWW91J3JlIGRvaW5nIGZpbmUuYCxcbiAgICAgIGBZb3UncmUgYWxyZWFkeSBkb2luZyBncmVhdC5gLFxuICAgICAgYE5vdGhpbmcgdG8gZG87IGFscmVhZHkgYXdlc29tZS4gRXhpdGluZy5gLFxuICAgICAgYEVycm9yIDQxODogQXMgQXdlc29tZSBBcyBDYW4gR2V0LmAsXG4gICAgICBgSSBzcHkgd2l0aCBteSBsaXR0bGUgZXllIGEgZ3JlYXQgZGV2ZWxvcGVyIWAsXG4gICAgICBgTm9vcC4uLiBhbHJlYWR5IGF3ZXNvbWUuYCxcbiAgICBdKTtcbiAgICB0aGlzLmxvZ2dlci5pbmZvKHRlcm1pbmFsLmdyZWVuKHBocmFzZSkpO1xuICB9XG59XG4iXX0=