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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2J1aWxkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxzREFBc0Q7QUFDdEQsbUVBQXdGO0FBQ3hGLCtDQUF5RDtBQUN6RCxnREFBNkM7QUFFN0Msa0JBQWtDLFNBQVEsb0NBQWdCO0lBQTFEOztRQUNrQixTQUFJLEdBQUcsT0FBTyxDQUFDO1FBQ2YsV0FBTSxHQUFHLE9BQU8sQ0FBQztRQUNqQixnQkFBVyxHQUN6Qix3RUFBd0UsQ0FBQztRQUVwRSxVQUFLLEdBQUcsc0JBQVksQ0FBQyxTQUFTLENBQUM7UUFDL0IsWUFBTyxHQUFhO1lBQ3pCLElBQUksQ0FBQyxVQUFVO1lBQ2YsSUFBSSxDQUFDLG1CQUFtQjtTQUN6QixDQUFDO0lBYUosQ0FBQztJQVhRLFFBQVEsQ0FBQyxPQUFnQztRQUM5Qyx5Q0FBeUM7UUFDekMsaUJBQU8sQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFELGlCQUFPLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVuRCxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRVksR0FBRyxDQUFDLE9BQWdDOztZQUMvQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFDLENBQUM7S0FBQTs7QUFqQmEsb0JBQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBTGhDLCtCQXVCQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWdsb2JhbC10c2xpbnQtZGlzYWJsZSBmaWxlLWhlYWRlclxuaW1wb3J0IHsgQXJjaGl0ZWN0Q29tbWFuZCwgQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgfSBmcm9tICcuLi9tb2RlbHMvYXJjaGl0ZWN0LWNvbW1hbmQnO1xuaW1wb3J0IHsgQ29tbWFuZFNjb3BlLCBPcHRpb24gfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBWZXJzaW9uIH0gZnJvbSAnLi4vdXBncmFkZS92ZXJzaW9uJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQnVpbGRDb21tYW5kIGV4dGVuZHMgQXJjaGl0ZWN0Q29tbWFuZCB7XG4gIHB1YmxpYyByZWFkb25seSBuYW1lID0gJ2J1aWxkJztcbiAgcHVibGljIHJlYWRvbmx5IHRhcmdldCA9ICdidWlsZCc7XG4gIHB1YmxpYyByZWFkb25seSBkZXNjcmlwdGlvbiA9XG4gICAgJ0J1aWxkcyB5b3VyIGFwcCBhbmQgcGxhY2VzIGl0IGludG8gdGhlIG91dHB1dCBwYXRoIChkaXN0LyBieSBkZWZhdWx0KS4nO1xuICBwdWJsaWMgc3RhdGljIGFsaWFzZXMgPSBbJ2InXTtcbiAgcHVibGljIHNjb3BlID0gQ29tbWFuZFNjb3BlLmluUHJvamVjdDtcbiAgcHVibGljIG9wdGlvbnM6IE9wdGlvbltdID0gW1xuICAgIHRoaXMucHJvZE9wdGlvbixcbiAgICB0aGlzLmNvbmZpZ3VyYXRpb25PcHRpb24sXG4gIF07XG5cbiAgcHVibGljIHZhbGlkYXRlKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKSB7XG4gICAgLy8gQ2hlY2sgQW5ndWxhciBhbmQgVHlwZVNjcmlwdCB2ZXJzaW9ucy5cbiAgICBWZXJzaW9uLmFzc2VydENvbXBhdGlibGVBbmd1bGFyVmVyc2lvbih0aGlzLnByb2plY3Qucm9vdCk7XG4gICAgVmVyc2lvbi5hc3NlcnRUeXBlc2NyaXB0VmVyc2lvbih0aGlzLnByb2plY3Qucm9vdCk7XG5cbiAgICByZXR1cm4gc3VwZXIudmFsaWRhdGUob3B0aW9ucyk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMucnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnMpO1xuICB9XG59XG4iXX0=