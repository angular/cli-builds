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
const architect_command_1 = require("../models/architect-command");
const command_1 = require("../models/command");
class Xi18nCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.name = 'xi18n';
        this.target = 'extract-i18n';
        this.description = 'Extracts i18n messages from source code.';
        this.scope = command_1.CommandScope.inProject;
        this.options = [
            this.configurationOption,
        ];
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.runArchitectTarget(options);
        });
    }
}
exports.default = Xi18nCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieGkxOG4uanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL3hpMThuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCxtRUFBd0Y7QUFDeEYsK0NBQXlEO0FBR3pELGtCQUFrQyxTQUFRLG9DQUFnQjtJQUExRDs7UUFDa0IsU0FBSSxHQUFHLE9BQU8sQ0FBQztRQUNmLFdBQU0sR0FBRyxjQUFjLENBQUM7UUFDeEIsZ0JBQVcsR0FBRywwQ0FBMEMsQ0FBQztRQUN6RCxVQUFLLEdBQUcsc0JBQVksQ0FBQyxTQUFTLENBQUM7UUFFL0IsWUFBTyxHQUFhO1lBQ2xDLElBQUksQ0FBQyxtQkFBbUI7U0FDekIsQ0FBQztJQUtKLENBQUM7SUFIYyxHQUFHLENBQUMsT0FBZ0M7O1lBQy9DLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUMsQ0FBQztLQUFBO0NBQ0Y7QUFiRCwrQkFhQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQXJjaGl0ZWN0Q29tbWFuZCwgQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgfSBmcm9tICcuLi9tb2RlbHMvYXJjaGl0ZWN0LWNvbW1hbmQnO1xuaW1wb3J0IHsgQ29tbWFuZFNjb3BlLCBPcHRpb24gfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgWGkxOG5Db21tYW5kIGV4dGVuZHMgQXJjaGl0ZWN0Q29tbWFuZCB7XG4gIHB1YmxpYyByZWFkb25seSBuYW1lID0gJ3hpMThuJztcbiAgcHVibGljIHJlYWRvbmx5IHRhcmdldCA9ICdleHRyYWN0LWkxOG4nO1xuICBwdWJsaWMgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSAnRXh0cmFjdHMgaTE4biBtZXNzYWdlcyBmcm9tIHNvdXJjZSBjb2RlLic7XG4gIHB1YmxpYyByZWFkb25seSBzY29wZSA9IENvbW1hbmRTY29wZS5pblByb2plY3Q7XG4gIHB1YmxpYyByZWFkb25seSBtdWx0aVRhcmdldDogdHJ1ZTtcbiAgcHVibGljIHJlYWRvbmx5IG9wdGlvbnM6IE9wdGlvbltdID0gW1xuICAgIHRoaXMuY29uZmlndXJhdGlvbk9wdGlvbixcbiAgXTtcblxuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMucnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnMpO1xuICB9XG59XG4iXX0=