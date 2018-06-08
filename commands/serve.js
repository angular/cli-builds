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
class ServeCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.name = 'serve';
        this.target = 'serve';
        this.description = 'Builds and serves your app, rebuilding on file changes.';
        this.scope = command_1.CommandScope.inProject;
        this.options = [
            this.prodOption,
            this.configurationOption,
        ];
    }
    validate(_options) {
        // Check Angular and TypeScript versions.
        version_1.Version.assertCompatibleAngularVersion(this.project.root);
        version_1.Version.assertTypescriptVersion(this.project.root);
        return true;
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.runArchitectTarget(options);
        });
    }
}
ServeCommand.aliases = ['s'];
exports.default = ServeCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmUuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL3NlcnZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCxtRUFBd0Y7QUFDeEYsK0NBQXlEO0FBQ3pELGdEQUE2QztBQUc3QyxrQkFBa0MsU0FBUSxvQ0FBZ0I7SUFBMUQ7O1FBQ2tCLFNBQUksR0FBRyxPQUFPLENBQUM7UUFDZixXQUFNLEdBQUcsT0FBTyxDQUFDO1FBQ2pCLGdCQUFXLEdBQUcseURBQXlELENBQUM7UUFFeEUsVUFBSyxHQUFHLHNCQUFZLENBQUMsU0FBUyxDQUFDO1FBQy9CLFlBQU8sR0FBYTtZQUNsQyxJQUFJLENBQUMsVUFBVTtZQUNmLElBQUksQ0FBQyxtQkFBbUI7U0FDekIsQ0FBQztJQWFKLENBQUM7SUFYUSxRQUFRLENBQUMsUUFBaUM7UUFDL0MseUNBQXlDO1FBQ3pDLGlCQUFPLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxRCxpQkFBTyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFbkQsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUM7SUFFWSxHQUFHLENBQUMsT0FBZ0M7O1lBQy9DLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUMsQ0FBQztLQUFBOztBQWpCYSxvQkFBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFKaEMsK0JBc0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBBcmNoaXRlY3RDb21tYW5kLCBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyB9IGZyb20gJy4uL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZCc7XG5pbXBvcnQgeyBDb21tYW5kU2NvcGUsIE9wdGlvbiB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcbmltcG9ydCB7IFZlcnNpb24gfSBmcm9tICcuLi91cGdyYWRlL3ZlcnNpb24nO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNlcnZlQ29tbWFuZCBleHRlbmRzIEFyY2hpdGVjdENvbW1hbmQge1xuICBwdWJsaWMgcmVhZG9ubHkgbmFtZSA9ICdzZXJ2ZSc7XG4gIHB1YmxpYyByZWFkb25seSB0YXJnZXQgPSAnc2VydmUnO1xuICBwdWJsaWMgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSAnQnVpbGRzIGFuZCBzZXJ2ZXMgeW91ciBhcHAsIHJlYnVpbGRpbmcgb24gZmlsZSBjaGFuZ2VzLic7XG4gIHB1YmxpYyBzdGF0aWMgYWxpYXNlcyA9IFsncyddO1xuICBwdWJsaWMgcmVhZG9ubHkgc2NvcGUgPSBDb21tYW5kU2NvcGUuaW5Qcm9qZWN0O1xuICBwdWJsaWMgcmVhZG9ubHkgb3B0aW9uczogT3B0aW9uW10gPSBbXG4gICAgdGhpcy5wcm9kT3B0aW9uLFxuICAgIHRoaXMuY29uZmlndXJhdGlvbk9wdGlvbixcbiAgXTtcblxuICBwdWJsaWMgdmFsaWRhdGUoX29wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKSB7XG4gICAgLy8gQ2hlY2sgQW5ndWxhciBhbmQgVHlwZVNjcmlwdCB2ZXJzaW9ucy5cbiAgICBWZXJzaW9uLmFzc2VydENvbXBhdGlibGVBbmd1bGFyVmVyc2lvbih0aGlzLnByb2plY3Qucm9vdCk7XG4gICAgVmVyc2lvbi5hc3NlcnRUeXBlc2NyaXB0VmVyc2lvbih0aGlzLnByb2plY3Qucm9vdCk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5ydW5BcmNoaXRlY3RUYXJnZXQob3B0aW9ucyk7XG4gIH1cbn1cbiJdfQ==