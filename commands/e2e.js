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
class E2eCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.name = 'e2e';
        this.target = 'e2e';
        this.description = 'Run e2e tests in existing project.';
        this.scope = command_1.CommandScope.inProject;
        this.multiTarget = true;
        this.options = [
            this.prodOption,
            this.configurationOption,
        ];
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.runArchitectTarget(options);
        });
    }
}
E2eCommand.aliases = ['e'];
exports.default = E2eCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZTJlLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9lMmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUVILG1FQUF3RjtBQUN4RiwrQ0FBeUQ7QUFHekQsZ0JBQWdDLFNBQVEsb0NBQWdCO0lBQXhEOztRQUNrQixTQUFJLEdBQUcsS0FBSyxDQUFDO1FBQ2IsV0FBTSxHQUFHLEtBQUssQ0FBQztRQUNmLGdCQUFXLEdBQUcsb0NBQW9DLENBQUM7UUFFbkQsVUFBSyxHQUFHLHNCQUFZLENBQUMsU0FBUyxDQUFDO1FBQy9CLGdCQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ25CLFlBQU8sR0FBYTtZQUNsQyxJQUFJLENBQUMsVUFBVTtZQUNmLElBQUksQ0FBQyxtQkFBbUI7U0FDekIsQ0FBQztJQUtKLENBQUM7SUFIYyxHQUFHLENBQUMsT0FBZ0M7O1lBQy9DLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUMsQ0FBQztLQUFBOztBQVZhLGtCQUFPLEdBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUoxQyw2QkFlQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQXJjaGl0ZWN0Q29tbWFuZCwgQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgfSBmcm9tICcuLi9tb2RlbHMvYXJjaGl0ZWN0LWNvbW1hbmQnO1xuaW1wb3J0IHsgQ29tbWFuZFNjb3BlLCBPcHRpb24gfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRTJlQ29tbWFuZCBleHRlbmRzIEFyY2hpdGVjdENvbW1hbmQge1xuICBwdWJsaWMgcmVhZG9ubHkgbmFtZSA9ICdlMmUnO1xuICBwdWJsaWMgcmVhZG9ubHkgdGFyZ2V0ID0gJ2UyZSc7XG4gIHB1YmxpYyByZWFkb25seSBkZXNjcmlwdGlvbiA9ICdSdW4gZTJlIHRlc3RzIGluIGV4aXN0aW5nIHByb2plY3QuJztcbiAgcHVibGljIHN0YXRpYyBhbGlhc2VzOiBzdHJpbmdbXSA9IFsnZSddO1xuICBwdWJsaWMgcmVhZG9ubHkgc2NvcGUgPSBDb21tYW5kU2NvcGUuaW5Qcm9qZWN0O1xuICBwdWJsaWMgcmVhZG9ubHkgbXVsdGlUYXJnZXQgPSB0cnVlO1xuICBwdWJsaWMgcmVhZG9ubHkgb3B0aW9uczogT3B0aW9uW10gPSBbXG4gICAgdGhpcy5wcm9kT3B0aW9uLFxuICAgIHRoaXMuY29uZmlndXJhdGlvbk9wdGlvbixcbiAgXTtcblxuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMucnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnMpO1xuICB9XG59XG4iXX0=