"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const command_module_1 = require("../../command-builder/command-module");
const color_1 = require("../../utilities/color");
class AwesomeCommandModule extends command_module_1.CommandModule {
    command = 'make-this-awesome';
    describe = false;
    deprecated = false;
    longDescriptionPath;
    builder(localYargs) {
        return localYargs;
    }
    run() {
        const pickOne = (of) => of[Math.floor(Math.random() * of.length)];
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
        this.context.logger.info(color_1.colors.green(phrase));
    }
}
exports.default = AwesomeCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL21ha2UtdGhpcy1hd2Vzb21lL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUdILHlFQUFrRztBQUNsRyxpREFBK0M7QUFFL0MsTUFBcUIsb0JBQ25CLFNBQVEsOEJBQWE7SUFHckIsT0FBTyxHQUFHLG1CQUFtQixDQUFDO0lBQzlCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFDMUIsVUFBVSxHQUFHLEtBQUssQ0FBQztJQUNuQixtQkFBbUIsQ0FBc0I7SUFFekMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxHQUFHO1FBQ0QsTUFBTSxPQUFPLEdBQUcsQ0FBQyxFQUFZLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUU1RSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUM7WUFDckIsNkNBQTZDO1lBQzdDLDJDQUEyQztZQUMzQyxvQkFBb0I7WUFDcEIsNkJBQTZCO1lBQzdCLDBDQUEwQztZQUMxQyxtQ0FBbUM7WUFDbkMsNkNBQTZDO1lBQzdDLDBCQUEwQjtTQUMzQixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2pELENBQUM7Q0FDRjtBQTdCRCx1Q0E2QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IENvbW1hbmRNb2R1bGUsIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbiB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29sb3InO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBd2Vzb21lQ29tbWFuZE1vZHVsZVxuICBleHRlbmRzIENvbW1hbmRNb2R1bGVcbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb25cbntcbiAgY29tbWFuZCA9ICdtYWtlLXRoaXMtYXdlc29tZSc7XG4gIGRlc2NyaWJlID0gZmFsc2UgYXMgY29uc3Q7XG4gIGRlcHJlY2F0ZWQgPSBmYWxzZTtcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2IHtcbiAgICByZXR1cm4gbG9jYWxZYXJncztcbiAgfVxuXG4gIHJ1bigpOiB2b2lkIHtcbiAgICBjb25zdCBwaWNrT25lID0gKG9mOiBzdHJpbmdbXSkgPT4gb2ZbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogb2YubGVuZ3RoKV07XG5cbiAgICBjb25zdCBwaHJhc2UgPSBwaWNrT25lKFtcbiAgICAgIGBZb3UncmUgb24gaXQsIHRoZXJlJ3Mgbm90aGluZyBmb3IgbWUgdG8gZG8hYCxcbiAgICAgIGBMZXQncyB0YWtlIGEgbG9vay4uLiBub3BlLCBpdCdzIGFsbCBnb29kIWAsXG4gICAgICBgWW91J3JlIGRvaW5nIGZpbmUuYCxcbiAgICAgIGBZb3UncmUgYWxyZWFkeSBkb2luZyBncmVhdC5gLFxuICAgICAgYE5vdGhpbmcgdG8gZG87IGFscmVhZHkgYXdlc29tZS4gRXhpdGluZy5gLFxuICAgICAgYEVycm9yIDQxODogQXMgQXdlc29tZSBBcyBDYW4gR2V0LmAsXG4gICAgICBgSSBzcHkgd2l0aCBteSBsaXR0bGUgZXllIGEgZ3JlYXQgZGV2ZWxvcGVyIWAsXG4gICAgICBgTm9vcC4uLiBhbHJlYWR5IGF3ZXNvbWUuYCxcbiAgICBdKTtcblxuICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyhjb2xvcnMuZ3JlZW4ocGhyYXNlKSk7XG4gIH1cbn1cbiJdfQ==