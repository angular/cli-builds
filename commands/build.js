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
const version_1 = require("../upgrade/version");
class BuildCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.name = 'build';
        this.target = 'build';
        this.description = 'Builds your app and places it into the output path (dist/ by default).';
        this.scope = command_1.CommandScope.inProject;
        this.options = [
            this.prodOption,
            this.configurationOption,
        ];
    }
    validate(options) {
        // Check Angular and TypeScript versions.
        version_1.Version.assertCompatibleAngularVersion(this.project.root);
        version_1.Version.assertTypescriptVersion(this.project.root);
        return super.validate(options);
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.runArchitectTarget(options);
        });
    }
}
BuildCommand.aliases = ['b'];
exports.default = BuildCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2J1aWxkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCxtRUFBd0Y7QUFDeEYsK0NBQXlEO0FBQ3pELGdEQUE2QztBQUU3QyxrQkFBa0MsU0FBUSxvQ0FBZ0I7SUFBMUQ7O1FBQ2tCLFNBQUksR0FBRyxPQUFPLENBQUM7UUFDZixXQUFNLEdBQUcsT0FBTyxDQUFDO1FBQ2pCLGdCQUFXLEdBQ3pCLHdFQUF3RSxDQUFDO1FBRXBFLFVBQUssR0FBRyxzQkFBWSxDQUFDLFNBQVMsQ0FBQztRQUMvQixZQUFPLEdBQWE7WUFDekIsSUFBSSxDQUFDLFVBQVU7WUFDZixJQUFJLENBQUMsbUJBQW1CO1NBQ3pCLENBQUM7SUFhSixDQUFDO0lBWFEsUUFBUSxDQUFDLE9BQWdDO1FBQzlDLHlDQUF5QztRQUN6QyxpQkFBTyxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUQsaUJBQU8sQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRW5ELE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFWSxHQUFHLENBQUMsT0FBZ0M7O1lBQy9DLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUMsQ0FBQztLQUFBOztBQWpCYSxvQkFBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFMaEMsK0JBdUJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBBcmNoaXRlY3RDb21tYW5kLCBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyB9IGZyb20gJy4uL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZCc7XG5pbXBvcnQgeyBDb21tYW5kU2NvcGUsIE9wdGlvbiB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcbmltcG9ydCB7IFZlcnNpb24gfSBmcm9tICcuLi91cGdyYWRlL3ZlcnNpb24nO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBCdWlsZENvbW1hbmQgZXh0ZW5kcyBBcmNoaXRlY3RDb21tYW5kIHtcbiAgcHVibGljIHJlYWRvbmx5IG5hbWUgPSAnYnVpbGQnO1xuICBwdWJsaWMgcmVhZG9ubHkgdGFyZ2V0ID0gJ2J1aWxkJztcbiAgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uID1cbiAgICAnQnVpbGRzIHlvdXIgYXBwIGFuZCBwbGFjZXMgaXQgaW50byB0aGUgb3V0cHV0IHBhdGggKGRpc3QvIGJ5IGRlZmF1bHQpLic7XG4gIHB1YmxpYyBzdGF0aWMgYWxpYXNlcyA9IFsnYiddO1xuICBwdWJsaWMgc2NvcGUgPSBDb21tYW5kU2NvcGUuaW5Qcm9qZWN0O1xuICBwdWJsaWMgb3B0aW9uczogT3B0aW9uW10gPSBbXG4gICAgdGhpcy5wcm9kT3B0aW9uLFxuICAgIHRoaXMuY29uZmlndXJhdGlvbk9wdGlvbixcbiAgXTtcblxuICBwdWJsaWMgdmFsaWRhdGUob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpIHtcbiAgICAvLyBDaGVjayBBbmd1bGFyIGFuZCBUeXBlU2NyaXB0IHZlcnNpb25zLlxuICAgIFZlcnNpb24uYXNzZXJ0Q29tcGF0aWJsZUFuZ3VsYXJWZXJzaW9uKHRoaXMucHJvamVjdC5yb290KTtcbiAgICBWZXJzaW9uLmFzc2VydFR5cGVzY3JpcHRWZXJzaW9uKHRoaXMucHJvamVjdC5yb290KTtcblxuICAgIHJldHVybiBzdXBlci52YWxpZGF0ZShvcHRpb25zKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5ydW5BcmNoaXRlY3RUYXJnZXQob3B0aW9ucyk7XG4gIH1cbn1cbiJdfQ==