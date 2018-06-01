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
class LintCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.name = 'lint';
        this.target = 'lint';
        this.description = 'Lints code in existing project.';
        this.scope = command_1.CommandScope.inProject;
        this.multiTarget = true;
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
LintCommand.aliases = ['l'];
exports.default = LintCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGludC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvbGludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsc0RBQXNEO0FBQ3RELG1FQUF3RjtBQUN4RiwrQ0FBeUQ7QUFHekQsaUJBQWlDLFNBQVEsb0NBQWdCO0lBQXpEOztRQUNrQixTQUFJLEdBQUcsTUFBTSxDQUFDO1FBQ2QsV0FBTSxHQUFHLE1BQU0sQ0FBQztRQUNoQixnQkFBVyxHQUFHLGlDQUFpQyxDQUFDO1FBRWhELFVBQUssR0FBRyxzQkFBWSxDQUFDLFNBQVMsQ0FBQztRQUMvQixnQkFBVyxHQUFHLElBQUksQ0FBQztRQUNuQixZQUFPLEdBQWE7WUFDbEMsSUFBSSxDQUFDLG1CQUFtQjtTQUN6QixDQUFDO0lBS0osQ0FBQztJQUhjLEdBQUcsQ0FBQyxPQUFnQzs7WUFDL0MsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQyxDQUFDO0tBQUE7O0FBVGEsbUJBQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBSmhDLDhCQWNDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tZ2xvYmFsLXRzbGludC1kaXNhYmxlIGZpbGUtaGVhZGVyXG5pbXBvcnQgeyBBcmNoaXRlY3RDb21tYW5kLCBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyB9IGZyb20gJy4uL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZCc7XG5pbXBvcnQgeyBDb21tYW5kU2NvcGUsIE9wdGlvbiB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMaW50Q29tbWFuZCBleHRlbmRzIEFyY2hpdGVjdENvbW1hbmQge1xuICBwdWJsaWMgcmVhZG9ubHkgbmFtZSA9ICdsaW50JztcbiAgcHVibGljIHJlYWRvbmx5IHRhcmdldCA9ICdsaW50JztcbiAgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJ0xpbnRzIGNvZGUgaW4gZXhpc3RpbmcgcHJvamVjdC4nO1xuICBwdWJsaWMgc3RhdGljIGFsaWFzZXMgPSBbJ2wnXTtcbiAgcHVibGljIHJlYWRvbmx5IHNjb3BlID0gQ29tbWFuZFNjb3BlLmluUHJvamVjdDtcbiAgcHVibGljIHJlYWRvbmx5IG11bHRpVGFyZ2V0ID0gdHJ1ZTtcbiAgcHVibGljIHJlYWRvbmx5IG9wdGlvbnM6IE9wdGlvbltdID0gW1xuICAgIHRoaXMuY29uZmlndXJhdGlvbk9wdGlvbixcbiAgXTtcblxuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMucnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnMpO1xuICB9XG59XG4iXX0=