"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable file-header
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWFzdGVyLWVnZy5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvZWFzdGVyLWVnZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNEQUFzRDtBQUN0RCwrQ0FBZ0Q7QUFDaEQsK0NBQW9EO0FBRXBELGlCQUFpQixFQUFZO0lBQzNCLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQUVELG9CQUFvQyxTQUFRLGlCQUFPO0lBQW5EOztRQUNrQixTQUFJLEdBQUcsbUJBQW1CLENBQUM7UUFDM0IsZ0JBQVcsR0FBRyxFQUFFLENBQUM7UUFDakIsV0FBTSxHQUFHLElBQUksQ0FBQztRQUNyQixjQUFTLEdBQWEsRUFBRSxDQUFDO1FBQ3pCLFlBQU8sR0FBYSxFQUFFLENBQUM7SUFlbEMsQ0FBQztJQWJDLEdBQUc7UUFDRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUM7WUFDckIsNkNBQTZDO1lBQzdDLDJDQUEyQztZQUMzQyxvQkFBb0I7WUFDcEIsNkJBQTZCO1lBQzdCLDBDQUEwQztZQUMxQyxtQ0FBbUM7WUFDbkMsNkNBQTZDO1lBQzdDLDBCQUEwQjtTQUMzQixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDM0MsQ0FBQztDQUNGO0FBcEJELGlDQW9CQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWdsb2JhbC10c2xpbnQtZGlzYWJsZSBmaWxlLWhlYWRlclxuaW1wb3J0IHsgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBDb21tYW5kLCBPcHRpb24gfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5cbmZ1bmN0aW9uIHBpY2tPbmUob2Y6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgcmV0dXJuIG9mW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG9mLmxlbmd0aCldO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBd2Vzb21lQ29tbWFuZCBleHRlbmRzIENvbW1hbmQge1xuICBwdWJsaWMgcmVhZG9ubHkgbmFtZSA9ICdtYWtlLXRoaXMtYXdlc29tZSc7XG4gIHB1YmxpYyByZWFkb25seSBkZXNjcmlwdGlvbiA9ICcnO1xuICBwdWJsaWMgcmVhZG9ubHkgaGlkZGVuID0gdHJ1ZTtcbiAgcmVhZG9ubHkgYXJndW1lbnRzOiBzdHJpbmdbXSA9IFtdO1xuICByZWFkb25seSBvcHRpb25zOiBPcHRpb25bXSA9IFtdO1xuXG4gIHJ1bigpIHtcbiAgICBjb25zdCBwaHJhc2UgPSBwaWNrT25lKFtcbiAgICAgIGBZb3UncmUgb24gaXQsIHRoZXJlJ3Mgbm90aGluZyBmb3IgbWUgdG8gZG8hYCxcbiAgICAgIGBMZXQncyB0YWtlIGEgbG9vay4uLiBub3BlLCBpdCdzIGFsbCBnb29kIWAsXG4gICAgICBgWW91J3JlIGRvaW5nIGZpbmUuYCxcbiAgICAgIGBZb3UncmUgYWxyZWFkeSBkb2luZyBncmVhdC5gLFxuICAgICAgYE5vdGhpbmcgdG8gZG87IGFscmVhZHkgYXdlc29tZS4gRXhpdGluZy5gLFxuICAgICAgYEVycm9yIDQxODogQXMgQXdlc29tZSBBcyBDYW4gR2V0LmAsXG4gICAgICBgSSBzcHkgd2l0aCBteSBsaXR0bGUgZXllIGEgZ3JlYXQgZGV2ZWxvcGVyIWAsXG4gICAgICBgTm9vcC4uLiBhbHJlYWR5IGF3ZXNvbWUuYCxcbiAgICBdKTtcbiAgICB0aGlzLmxvZ2dlci5pbmZvKHRlcm1pbmFsLmdyZWVuKHBocmFzZSkpO1xuICB9XG59XG4iXX0=