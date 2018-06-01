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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmUuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL3NlcnZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxzREFBc0Q7QUFDdEQsbUVBQXdGO0FBQ3hGLCtDQUF5RDtBQUN6RCxnREFBNkM7QUFHN0Msa0JBQWtDLFNBQVEsb0NBQWdCO0lBQTFEOztRQUNrQixTQUFJLEdBQUcsT0FBTyxDQUFDO1FBQ2YsV0FBTSxHQUFHLE9BQU8sQ0FBQztRQUNqQixnQkFBVyxHQUFHLHlEQUF5RCxDQUFDO1FBRXhFLFVBQUssR0FBRyxzQkFBWSxDQUFDLFNBQVMsQ0FBQztRQUMvQixZQUFPLEdBQWE7WUFDbEMsSUFBSSxDQUFDLFVBQVU7WUFDZixJQUFJLENBQUMsbUJBQW1CO1NBQ3pCLENBQUM7SUFhSixDQUFDO0lBWFEsUUFBUSxDQUFDLFFBQWlDO1FBQy9DLHlDQUF5QztRQUN6QyxpQkFBTyxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUQsaUJBQU8sQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRW5ELE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRVksR0FBRyxDQUFDLE9BQWdDOztZQUMvQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFDLENBQUM7S0FBQTs7QUFqQmEsb0JBQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBSmhDLCtCQXNCQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWdsb2JhbC10c2xpbnQtZGlzYWJsZSBmaWxlLWhlYWRlclxuaW1wb3J0IHsgQXJjaGl0ZWN0Q29tbWFuZCwgQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgfSBmcm9tICcuLi9tb2RlbHMvYXJjaGl0ZWN0LWNvbW1hbmQnO1xuaW1wb3J0IHsgQ29tbWFuZFNjb3BlLCBPcHRpb24gfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBWZXJzaW9uIH0gZnJvbSAnLi4vdXBncmFkZS92ZXJzaW9uJztcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTZXJ2ZUNvbW1hbmQgZXh0ZW5kcyBBcmNoaXRlY3RDb21tYW5kIHtcbiAgcHVibGljIHJlYWRvbmx5IG5hbWUgPSAnc2VydmUnO1xuICBwdWJsaWMgcmVhZG9ubHkgdGFyZ2V0ID0gJ3NlcnZlJztcbiAgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJ0J1aWxkcyBhbmQgc2VydmVzIHlvdXIgYXBwLCByZWJ1aWxkaW5nIG9uIGZpbGUgY2hhbmdlcy4nO1xuICBwdWJsaWMgc3RhdGljIGFsaWFzZXMgPSBbJ3MnXTtcbiAgcHVibGljIHJlYWRvbmx5IHNjb3BlID0gQ29tbWFuZFNjb3BlLmluUHJvamVjdDtcbiAgcHVibGljIHJlYWRvbmx5IG9wdGlvbnM6IE9wdGlvbltdID0gW1xuICAgIHRoaXMucHJvZE9wdGlvbixcbiAgICB0aGlzLmNvbmZpZ3VyYXRpb25PcHRpb24sXG4gIF07XG5cbiAgcHVibGljIHZhbGlkYXRlKF9vcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucykge1xuICAgIC8vIENoZWNrIEFuZ3VsYXIgYW5kIFR5cGVTY3JpcHQgdmVyc2lvbnMuXG4gICAgVmVyc2lvbi5hc3NlcnRDb21wYXRpYmxlQW5ndWxhclZlcnNpb24odGhpcy5wcm9qZWN0LnJvb3QpO1xuICAgIFZlcnNpb24uYXNzZXJ0VHlwZXNjcmlwdFZlcnNpb24odGhpcy5wcm9qZWN0LnJvb3QpO1xuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMucnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnMpO1xuICB9XG59XG4iXX0=