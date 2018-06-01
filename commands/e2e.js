"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable file-header
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
        return this.runArchitectTarget(options);
    }
}
E2eCommand.aliases = ['e'];
exports.default = E2eCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZTJlLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9lMmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxzREFBc0Q7QUFDdEQsbUVBQXdGO0FBQ3hGLCtDQUF5RDtBQUd6RCxnQkFBZ0MsU0FBUSxvQ0FBZ0I7SUFBeEQ7O1FBQ2tCLFNBQUksR0FBRyxLQUFLLENBQUM7UUFDYixXQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ2YsZ0JBQVcsR0FBRyxvQ0FBb0MsQ0FBQztRQUVuRCxVQUFLLEdBQUcsc0JBQVksQ0FBQyxTQUFTLENBQUM7UUFDL0IsZ0JBQVcsR0FBRyxJQUFJLENBQUM7UUFDbkIsWUFBTyxHQUFhO1lBQ2xDLElBQUksQ0FBQyxVQUFVO1lBQ2YsSUFBSSxDQUFDLG1CQUFtQjtTQUN6QixDQUFDO0lBS0osQ0FBQztJQUhRLEdBQUcsQ0FBQyxPQUFnQztRQUN6QyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzFDLENBQUM7O0FBVmEsa0JBQU8sR0FBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBSjFDLDZCQWVDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tZ2xvYmFsLXRzbGludC1kaXNhYmxlIGZpbGUtaGVhZGVyXG5pbXBvcnQgeyBBcmNoaXRlY3RDb21tYW5kLCBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyB9IGZyb20gJy4uL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZCc7XG5pbXBvcnQgeyBDb21tYW5kU2NvcGUsIE9wdGlvbiB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFMmVDb21tYW5kIGV4dGVuZHMgQXJjaGl0ZWN0Q29tbWFuZCB7XG4gIHB1YmxpYyByZWFkb25seSBuYW1lID0gJ2UyZSc7XG4gIHB1YmxpYyByZWFkb25seSB0YXJnZXQgPSAnZTJlJztcbiAgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJ1J1biBlMmUgdGVzdHMgaW4gZXhpc3RpbmcgcHJvamVjdC4nO1xuICBwdWJsaWMgc3RhdGljIGFsaWFzZXM6IHN0cmluZ1tdID0gWydlJ107XG4gIHB1YmxpYyByZWFkb25seSBzY29wZSA9IENvbW1hbmRTY29wZS5pblByb2plY3Q7XG4gIHB1YmxpYyByZWFkb25seSBtdWx0aVRhcmdldCA9IHRydWU7XG4gIHB1YmxpYyByZWFkb25seSBvcHRpb25zOiBPcHRpb25bXSA9IFtcbiAgICB0aGlzLnByb2RPcHRpb24sXG4gICAgdGhpcy5jb25maWd1cmF0aW9uT3B0aW9uLFxuICBdO1xuXG4gIHB1YmxpYyBydW4ob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5ydW5BcmNoaXRlY3RUYXJnZXQob3B0aW9ucyk7XG4gIH1cbn1cbiJdfQ==