"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable file-header
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieGkxOG4uanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL3hpMThuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxzREFBc0Q7QUFDdEQsbUVBQXdGO0FBQ3hGLCtDQUF5RDtBQUd6RCxrQkFBa0MsU0FBUSxvQ0FBZ0I7SUFBMUQ7O1FBQ2tCLFNBQUksR0FBRyxPQUFPLENBQUM7UUFDZixXQUFNLEdBQUcsY0FBYyxDQUFDO1FBQ3hCLGdCQUFXLEdBQUcsMENBQTBDLENBQUM7UUFDekQsVUFBSyxHQUFHLHNCQUFZLENBQUMsU0FBUyxDQUFDO1FBRS9CLFlBQU8sR0FBYTtZQUNsQyxJQUFJLENBQUMsbUJBQW1CO1NBQ3pCLENBQUM7SUFLSixDQUFDO0lBSGMsR0FBRyxDQUFDLE9BQWdDOztZQUMvQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFDLENBQUM7S0FBQTtDQUNGO0FBYkQsK0JBYUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgZmlsZS1oZWFkZXJcbmltcG9ydCB7IEFyY2hpdGVjdENvbW1hbmQsIEFyY2hpdGVjdENvbW1hbmRPcHRpb25zIH0gZnJvbSAnLi4vbW9kZWxzL2FyY2hpdGVjdC1jb21tYW5kJztcbmltcG9ydCB7IENvbW1hbmRTY29wZSwgT3B0aW9uIH0gZnJvbSAnLi4vbW9kZWxzL2NvbW1hbmQnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFhpMThuQ29tbWFuZCBleHRlbmRzIEFyY2hpdGVjdENvbW1hbmQge1xuICBwdWJsaWMgcmVhZG9ubHkgbmFtZSA9ICd4aTE4bic7XG4gIHB1YmxpYyByZWFkb25seSB0YXJnZXQgPSAnZXh0cmFjdC1pMThuJztcbiAgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJ0V4dHJhY3RzIGkxOG4gbWVzc2FnZXMgZnJvbSBzb3VyY2UgY29kZS4nO1xuICBwdWJsaWMgcmVhZG9ubHkgc2NvcGUgPSBDb21tYW5kU2NvcGUuaW5Qcm9qZWN0O1xuICBwdWJsaWMgcmVhZG9ubHkgbXVsdGlUYXJnZXQ6IHRydWU7XG4gIHB1YmxpYyByZWFkb25seSBvcHRpb25zOiBPcHRpb25bXSA9IFtcbiAgICB0aGlzLmNvbmZpZ3VyYXRpb25PcHRpb24sXG4gIF07XG5cbiAgcHVibGljIGFzeW5jIHJ1bihvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLnJ1bkFyY2hpdGVjdFRhcmdldChvcHRpb25zKTtcbiAgfVxufVxuIl19