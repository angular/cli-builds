"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwesomeCommandModule = void 0;
const command_module_1 = require("../../command-builder/command-module");
const color_1 = require("../../utilities/color");
class AwesomeCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'make-this-awesome';
        this.describe = false;
        this.deprecated = false;
    }
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
exports.AwesomeCommandModule = AwesomeCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL21ha2UtdGhpcy1hd2Vzb21lL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFHSCx5RUFBa0c7QUFDbEcsaURBQStDO0FBRS9DLE1BQWEsb0JBQXFCLFNBQVEsOEJBQWE7SUFBdkQ7O1FBQ0UsWUFBTyxHQUFHLG1CQUFtQixDQUFDO1FBQzlCLGFBQVEsR0FBVSxLQUFLLENBQUM7UUFDeEIsZUFBVSxHQUFHLEtBQUssQ0FBQztJQXVCckIsQ0FBQztJQXBCQyxPQUFPLENBQUMsVUFBZ0I7UUFDdEIsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztJQUVELEdBQUc7UUFDRCxNQUFNLE9BQU8sR0FBRyxDQUFDLEVBQVksRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRTVFLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQztZQUNyQiw2Q0FBNkM7WUFDN0MsMkNBQTJDO1lBQzNDLG9CQUFvQjtZQUNwQiw2QkFBNkI7WUFDN0IsMENBQTBDO1lBQzFDLG1DQUFtQztZQUNuQyw2Q0FBNkM7WUFDN0MsMEJBQTBCO1NBQzNCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztDQUNGO0FBMUJELG9EQTBCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgQ29tbWFuZE1vZHVsZSwgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uIH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb2xvcic7XG5cbmV4cG9ydCBjbGFzcyBBd2Vzb21lQ29tbWFuZE1vZHVsZSBleHRlbmRzIENvbW1hbmRNb2R1bGUgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24ge1xuICBjb21tYW5kID0gJ21ha2UtdGhpcy1hd2Vzb21lJztcbiAgZGVzY3JpYmU6IGZhbHNlID0gZmFsc2U7XG4gIGRlcHJlY2F0ZWQgPSBmYWxzZTtcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2IHtcbiAgICByZXR1cm4gbG9jYWxZYXJncztcbiAgfVxuXG4gIHJ1bigpOiB2b2lkIHtcbiAgICBjb25zdCBwaWNrT25lID0gKG9mOiBzdHJpbmdbXSkgPT4gb2ZbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogb2YubGVuZ3RoKV07XG5cbiAgICBjb25zdCBwaHJhc2UgPSBwaWNrT25lKFtcbiAgICAgIGBZb3UncmUgb24gaXQsIHRoZXJlJ3Mgbm90aGluZyBmb3IgbWUgdG8gZG8hYCxcbiAgICAgIGBMZXQncyB0YWtlIGEgbG9vay4uLiBub3BlLCBpdCdzIGFsbCBnb29kIWAsXG4gICAgICBgWW91J3JlIGRvaW5nIGZpbmUuYCxcbiAgICAgIGBZb3UncmUgYWxyZWFkeSBkb2luZyBncmVhdC5gLFxuICAgICAgYE5vdGhpbmcgdG8gZG87IGFscmVhZHkgYXdlc29tZS4gRXhpdGluZy5gLFxuICAgICAgYEVycm9yIDQxODogQXMgQXdlc29tZSBBcyBDYW4gR2V0LmAsXG4gICAgICBgSSBzcHkgd2l0aCBteSBsaXR0bGUgZXllIGEgZ3JlYXQgZGV2ZWxvcGVyIWAsXG4gICAgICBgTm9vcC4uLiBhbHJlYWR5IGF3ZXNvbWUuYCxcbiAgICBdKTtcblxuICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyhjb2xvcnMuZ3JlZW4ocGhyYXNlKSk7XG4gIH1cbn1cbiJdfQ==