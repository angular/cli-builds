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
class RunCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.name = 'run';
        this.description = 'Runs Architect targets.';
        this.scope = command_1.CommandScope.inProject;
        this.arguments = ['target'];
        this.options = [
            this.configurationOption,
        ];
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (options.target) {
                return this.runArchitectTarget(options);
            }
            else {
                throw new Error('Invalid architect target.');
            }
        });
    }
}
exports.default = RunCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9ydW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLHNEQUFzRDtBQUN0RCxtRUFBd0Y7QUFDeEYsK0NBQXlEO0FBR3pELGdCQUFnQyxTQUFRLG9DQUFnQjtJQUF4RDs7UUFDa0IsU0FBSSxHQUFHLEtBQUssQ0FBQztRQUNiLGdCQUFXLEdBQUcseUJBQXlCLENBQUM7UUFDeEMsVUFBSyxHQUFHLHNCQUFZLENBQUMsU0FBUyxDQUFDO1FBQy9CLGNBQVMsR0FBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pDLFlBQU8sR0FBYTtZQUNsQyxJQUFJLENBQUMsbUJBQW1CO1NBQ3pCLENBQUM7SUFTSixDQUFDO0lBUGMsR0FBRyxDQUFDLE9BQWdDOztZQUMvQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDbkIsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMxQyxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ04sTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1lBQy9DLENBQUM7UUFDSCxDQUFDO0tBQUE7Q0FDRjtBQWhCRCw2QkFnQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgZmlsZS1oZWFkZXJcbmltcG9ydCB7IEFyY2hpdGVjdENvbW1hbmQsIEFyY2hpdGVjdENvbW1hbmRPcHRpb25zIH0gZnJvbSAnLi4vbW9kZWxzL2FyY2hpdGVjdC1jb21tYW5kJztcbmltcG9ydCB7IENvbW1hbmRTY29wZSwgT3B0aW9uIH0gZnJvbSAnLi4vbW9kZWxzL2NvbW1hbmQnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJ1bkNvbW1hbmQgZXh0ZW5kcyBBcmNoaXRlY3RDb21tYW5kIHtcbiAgcHVibGljIHJlYWRvbmx5IG5hbWUgPSAncnVuJztcbiAgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJ1J1bnMgQXJjaGl0ZWN0IHRhcmdldHMuJztcbiAgcHVibGljIHJlYWRvbmx5IHNjb3BlID0gQ29tbWFuZFNjb3BlLmluUHJvamVjdDtcbiAgcHVibGljIHJlYWRvbmx5IGFyZ3VtZW50czogc3RyaW5nW10gPSBbJ3RhcmdldCddO1xuICBwdWJsaWMgcmVhZG9ubHkgb3B0aW9uczogT3B0aW9uW10gPSBbXG4gICAgdGhpcy5jb25maWd1cmF0aW9uT3B0aW9uLFxuICBdO1xuXG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucy50YXJnZXQpIHtcbiAgICAgIHJldHVybiB0aGlzLnJ1bkFyY2hpdGVjdFRhcmdldChvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGFyY2hpdGVjdCB0YXJnZXQuJyk7XG4gICAgfVxuICB9XG59XG4iXX0=