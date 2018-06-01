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
// tslint:disable:no-global-tslint-disable no-any file-header
const core_1 = require("@angular-devkit/core");
const command_1 = require("../models/command");
const schematic_command_1 = require("../models/schematic-command");
const find_up_1 = require("../utilities/find-up");
class UpdateCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.name = 'update';
        this.description = 'Updates your application and its dependencies.';
        this.scope = command_1.CommandScope.everywhere;
        this.arguments = ['packages'];
        this.options = [
            // Remove the --force flag.
            ...this.coreOptions.filter(option => option.name !== 'force'),
        ];
        this.allowMissingWorkspace = true;
        this.collectionName = '@schematics/update';
        this.schematicName = 'update';
        this.initialized = false;
    }
    initialize(options) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initialized) {
                return;
            }
            yield _super("initialize").call(this, options);
            this.initialized = true;
            const schematicOptions = yield this.getOptions({
                schematicName: this.schematicName,
                collectionName: this.collectionName,
            });
            this.options = this.options.concat(schematicOptions.options);
            this.arguments = this.arguments.concat(schematicOptions.arguments.map(a => a.name));
        });
    }
    validate(options) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            if (options._[0] == '@angular/cli'
                && options.migrateOnly === undefined
                && options.from === undefined) {
                // Check for a 1.7 angular-cli.json file.
                const oldConfigFileNames = [
                    core_1.normalize('.angular-cli.json'),
                    core_1.normalize('angular-cli.json'),
                ];
                const oldConfigFilePath = find_up_1.findUp(oldConfigFileNames, process.cwd())
                    || find_up_1.findUp(oldConfigFileNames, __dirname);
                if (oldConfigFilePath) {
                    options.migrateOnly = true;
                    options.from = '1.0.0';
                }
            }
            return _super("validate").call(this, options);
        });
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.runSchematic({
                collectionName: this.collectionName,
                schematicName: this.schematicName,
                schematicOptions: options,
                dryRun: options.dryRun,
                force: false,
                showNothingDone: false,
            });
        });
    }
}
UpdateCommand.aliases = [];
exports.default = UpdateCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy91cGRhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLDZEQUE2RDtBQUM3RCwrQ0FBaUQ7QUFDakQsK0NBQXlEO0FBQ3pELG1FQUFxRjtBQUNyRixrREFBOEM7QUFROUMsbUJBQW1DLFNBQVEsb0NBQWdCO0lBQTNEOztRQUNrQixTQUFJLEdBQUcsUUFBUSxDQUFDO1FBQ2hCLGdCQUFXLEdBQUcsZ0RBQWdELENBQUM7UUFFL0QsVUFBSyxHQUFHLHNCQUFZLENBQUMsVUFBVSxDQUFDO1FBQ3pDLGNBQVMsR0FBYSxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBQ3JDLFlBQU8sR0FBYTtZQUN6QiwyQkFBMkI7WUFDM0IsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUFDO1NBQzlELENBQUM7UUFDYywwQkFBcUIsR0FBRyxJQUFJLENBQUM7UUFFckMsbUJBQWMsR0FBRyxvQkFBb0IsQ0FBQztRQUN0QyxrQkFBYSxHQUFHLFFBQVEsQ0FBQztRQUV6QixnQkFBVyxHQUFHLEtBQUssQ0FBQztJQWlEOUIsQ0FBQztJQWhEYyxVQUFVLENBQUMsT0FBWTs7O1lBQ2xDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUNyQixNQUFNLENBQUM7WUFDVCxDQUFDO1lBQ0QsTUFBTSxvQkFBZ0IsWUFBQyxPQUFPLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztZQUV4QixNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDN0MsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO2dCQUNqQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7YUFDcEMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3RCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN0RixDQUFDO0tBQUE7SUFFSyxRQUFRLENBQUMsT0FBWTs7O1lBQ3pCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksY0FBYzttQkFDM0IsT0FBTyxDQUFDLFdBQVcsS0FBSyxTQUFTO21CQUNqQyxPQUFPLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLHlDQUF5QztnQkFDekMsTUFBTSxrQkFBa0IsR0FBRztvQkFDekIsZ0JBQVMsQ0FBQyxtQkFBbUIsQ0FBQztvQkFDOUIsZ0JBQVMsQ0FBQyxrQkFBa0IsQ0FBQztpQkFDOUIsQ0FBQztnQkFDRixNQUFNLGlCQUFpQixHQUNyQixnQkFBTSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQzt1QkFDdEMsZ0JBQU0sQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFFM0MsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO29CQUN0QixPQUFPLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztvQkFDM0IsT0FBTyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7Z0JBQ3pCLENBQUM7WUFDSCxDQUFDO1lBRUQsTUFBTSxDQUFDLGtCQUFjLFlBQUMsT0FBTyxFQUFFO1FBQ2pDLENBQUM7S0FBQTtJQUdZLEdBQUcsQ0FBQyxPQUFzQjs7WUFDckMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ3ZCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztnQkFDbkMsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO2dCQUNqQyxnQkFBZ0IsRUFBRSxPQUFPO2dCQUN6QixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07Z0JBQ3RCLEtBQUssRUFBRSxLQUFLO2dCQUNaLGVBQWUsRUFBRSxLQUFLO2FBQ3ZCLENBQUMsQ0FBQztRQUNMLENBQUM7S0FBQTs7QUE1RGEscUJBQU8sR0FBYSxFQUFFLENBQUM7QUFIdkMsZ0NBZ0VDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tZ2xvYmFsLXRzbGludC1kaXNhYmxlIG5vLWFueSBmaWxlLWhlYWRlclxuaW1wb3J0IHsgbm9ybWFsaXplIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQ29tbWFuZFNjb3BlLCBPcHRpb24gfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBDb3JlU2NoZW1hdGljT3B0aW9ucywgU2NoZW1hdGljQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZCc7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuLi91dGlsaXRpZXMvZmluZC11cCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVXBkYXRlT3B0aW9ucyBleHRlbmRzIENvcmVTY2hlbWF0aWNPcHRpb25zIHtcbiAgbmV4dDogYm9vbGVhbjtcbiAgc2NoZW1hdGljPzogYm9vbGVhbjtcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBVcGRhdGVDb21tYW5kIGV4dGVuZHMgU2NoZW1hdGljQ29tbWFuZCB7XG4gIHB1YmxpYyByZWFkb25seSBuYW1lID0gJ3VwZGF0ZSc7XG4gIHB1YmxpYyByZWFkb25seSBkZXNjcmlwdGlvbiA9ICdVcGRhdGVzIHlvdXIgYXBwbGljYXRpb24gYW5kIGl0cyBkZXBlbmRlbmNpZXMuJztcbiAgcHVibGljIHN0YXRpYyBhbGlhc2VzOiBzdHJpbmdbXSA9IFtdO1xuICBwdWJsaWMgcmVhZG9ubHkgc2NvcGUgPSBDb21tYW5kU2NvcGUuZXZlcnl3aGVyZTtcbiAgcHVibGljIGFyZ3VtZW50czogc3RyaW5nW10gPSBbICdwYWNrYWdlcycgXTtcbiAgcHVibGljIG9wdGlvbnM6IE9wdGlvbltdID0gW1xuICAgIC8vIFJlbW92ZSB0aGUgLS1mb3JjZSBmbGFnLlxuICAgIC4uLnRoaXMuY29yZU9wdGlvbnMuZmlsdGVyKG9wdGlvbiA9PiBvcHRpb24ubmFtZSAhPT0gJ2ZvcmNlJyksXG4gIF07XG4gIHB1YmxpYyByZWFkb25seSBhbGxvd01pc3NpbmdXb3Jrc3BhY2UgPSB0cnVlO1xuXG4gIHByaXZhdGUgY29sbGVjdGlvbk5hbWUgPSAnQHNjaGVtYXRpY3MvdXBkYXRlJztcbiAgcHJpdmF0ZSBzY2hlbWF0aWNOYW1lID0gJ3VwZGF0ZSc7XG5cbiAgcHJpdmF0ZSBpbml0aWFsaXplZCA9IGZhbHNlO1xuICBwdWJsaWMgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBhbnkpIHtcbiAgICBpZiAodGhpcy5pbml0aWFsaXplZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhd2FpdCBzdXBlci5pbml0aWFsaXplKG9wdGlvbnMpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gICAgY29uc3Qgc2NoZW1hdGljT3B0aW9ucyA9IGF3YWl0IHRoaXMuZ2V0T3B0aW9ucyh7XG4gICAgICBzY2hlbWF0aWNOYW1lOiB0aGlzLnNjaGVtYXRpY05hbWUsXG4gICAgICBjb2xsZWN0aW9uTmFtZTogdGhpcy5jb2xsZWN0aW9uTmFtZSxcbiAgICB9KTtcbiAgICB0aGlzLm9wdGlvbnMgPSB0aGlzLm9wdGlvbnMuY29uY2F0KHNjaGVtYXRpY09wdGlvbnMub3B0aW9ucyk7XG4gICAgdGhpcy5hcmd1bWVudHMgPSB0aGlzLmFyZ3VtZW50cy5jb25jYXQoc2NoZW1hdGljT3B0aW9ucy5hcmd1bWVudHMubWFwKGEgPT4gYS5uYW1lKSk7XG4gIH1cblxuICBhc3luYyB2YWxpZGF0ZShvcHRpb25zOiBhbnkpIHtcbiAgICBpZiAob3B0aW9ucy5fWzBdID09ICdAYW5ndWxhci9jbGknXG4gICAgICAgICYmIG9wdGlvbnMubWlncmF0ZU9ubHkgPT09IHVuZGVmaW5lZFxuICAgICAgICAmJiBvcHRpb25zLmZyb20gPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gQ2hlY2sgZm9yIGEgMS43IGFuZ3VsYXItY2xpLmpzb24gZmlsZS5cbiAgICAgIGNvbnN0IG9sZENvbmZpZ0ZpbGVOYW1lcyA9IFtcbiAgICAgICAgbm9ybWFsaXplKCcuYW5ndWxhci1jbGkuanNvbicpLFxuICAgICAgICBub3JtYWxpemUoJ2FuZ3VsYXItY2xpLmpzb24nKSxcbiAgICAgIF07XG4gICAgICBjb25zdCBvbGRDb25maWdGaWxlUGF0aCA9XG4gICAgICAgIGZpbmRVcChvbGRDb25maWdGaWxlTmFtZXMsIHByb2Nlc3MuY3dkKCkpXG4gICAgICAgIHx8IGZpbmRVcChvbGRDb25maWdGaWxlTmFtZXMsIF9fZGlybmFtZSk7XG5cbiAgICAgIGlmIChvbGRDb25maWdGaWxlUGF0aCkge1xuICAgICAgICBvcHRpb25zLm1pZ3JhdGVPbmx5ID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5mcm9tID0gJzEuMC4wJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXIudmFsaWRhdGUob3B0aW9ucyk7XG4gIH1cblxuXG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogVXBkYXRlT3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZTogdGhpcy5jb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWU6IHRoaXMuc2NoZW1hdGljTmFtZSxcbiAgICAgIHNjaGVtYXRpY09wdGlvbnM6IG9wdGlvbnMsXG4gICAgICBkcnlSdW46IG9wdGlvbnMuZHJ5UnVuLFxuICAgICAgZm9yY2U6IGZhbHNlLFxuICAgICAgc2hvd05vdGhpbmdEb25lOiBmYWxzZSxcbiAgICB9KTtcbiAgfVxufVxuIl19