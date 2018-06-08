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
// tslint:disable:no-global-tslint-disable no-any
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy91cGRhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUVILGlEQUFpRDtBQUNqRCwrQ0FBaUQ7QUFDakQsK0NBQXlEO0FBQ3pELG1FQUFxRjtBQUNyRixrREFBOEM7QUFROUMsbUJBQW1DLFNBQVEsb0NBQWdCO0lBQTNEOztRQUNrQixTQUFJLEdBQUcsUUFBUSxDQUFDO1FBQ2hCLGdCQUFXLEdBQUcsZ0RBQWdELENBQUM7UUFFL0QsVUFBSyxHQUFHLHNCQUFZLENBQUMsVUFBVSxDQUFDO1FBQ3pDLGNBQVMsR0FBYSxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBQ3JDLFlBQU8sR0FBYTtZQUN6QiwyQkFBMkI7WUFDM0IsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUFDO1NBQzlELENBQUM7UUFDYywwQkFBcUIsR0FBRyxJQUFJLENBQUM7UUFFckMsbUJBQWMsR0FBRyxvQkFBb0IsQ0FBQztRQUN0QyxrQkFBYSxHQUFHLFFBQVEsQ0FBQztRQUV6QixnQkFBVyxHQUFHLEtBQUssQ0FBQztJQWlEOUIsQ0FBQztJQWhEYyxVQUFVLENBQUMsT0FBWTs7O1lBQ2xDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUNyQixNQUFNLENBQUM7WUFDVCxDQUFDO1lBQ0QsTUFBTSxvQkFBZ0IsWUFBQyxPQUFPLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztZQUV4QixNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDN0MsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO2dCQUNqQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7YUFDcEMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3RCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN0RixDQUFDO0tBQUE7SUFFSyxRQUFRLENBQUMsT0FBWTs7O1lBQ3pCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksY0FBYzttQkFDM0IsT0FBTyxDQUFDLFdBQVcsS0FBSyxTQUFTO21CQUNqQyxPQUFPLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLHlDQUF5QztnQkFDekMsTUFBTSxrQkFBa0IsR0FBRztvQkFDekIsZ0JBQVMsQ0FBQyxtQkFBbUIsQ0FBQztvQkFDOUIsZ0JBQVMsQ0FBQyxrQkFBa0IsQ0FBQztpQkFDOUIsQ0FBQztnQkFDRixNQUFNLGlCQUFpQixHQUNyQixnQkFBTSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQzt1QkFDdEMsZ0JBQU0sQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFFM0MsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO29CQUN0QixPQUFPLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztvQkFDM0IsT0FBTyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7Z0JBQ3pCLENBQUM7WUFDSCxDQUFDO1lBRUQsTUFBTSxDQUFDLGtCQUFjLFlBQUMsT0FBTyxFQUFFO1FBQ2pDLENBQUM7S0FBQTtJQUdZLEdBQUcsQ0FBQyxPQUFzQjs7WUFDckMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ3ZCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztnQkFDbkMsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO2dCQUNqQyxnQkFBZ0IsRUFBRSxPQUFPO2dCQUN6QixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07Z0JBQ3RCLEtBQUssRUFBRSxLQUFLO2dCQUNaLGVBQWUsRUFBRSxLQUFLO2FBQ3ZCLENBQUMsQ0FBQztRQUNMLENBQUM7S0FBQTs7QUE1RGEscUJBQU8sR0FBYSxFQUFFLENBQUM7QUFIdkMsZ0NBZ0VDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgbm8tYW55XG5pbXBvcnQgeyBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBDb21tYW5kU2NvcGUsIE9wdGlvbiB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcbmltcG9ydCB7IENvcmVTY2hlbWF0aWNPcHRpb25zLCBTY2hlbWF0aWNDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL3NjaGVtYXRpYy1jb21tYW5kJztcbmltcG9ydCB7IGZpbmRVcCB9IGZyb20gJy4uL3V0aWxpdGllcy9maW5kLXVwJztcblxuZXhwb3J0IGludGVyZmFjZSBVcGRhdGVPcHRpb25zIGV4dGVuZHMgQ29yZVNjaGVtYXRpY09wdGlvbnMge1xuICBuZXh0OiBib29sZWFuO1xuICBzY2hlbWF0aWM/OiBib29sZWFuO1xufVxuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFVwZGF0ZUNvbW1hbmQgZXh0ZW5kcyBTY2hlbWF0aWNDb21tYW5kIHtcbiAgcHVibGljIHJlYWRvbmx5IG5hbWUgPSAndXBkYXRlJztcbiAgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJ1VwZGF0ZXMgeW91ciBhcHBsaWNhdGlvbiBhbmQgaXRzIGRlcGVuZGVuY2llcy4nO1xuICBwdWJsaWMgc3RhdGljIGFsaWFzZXM6IHN0cmluZ1tdID0gW107XG4gIHB1YmxpYyByZWFkb25seSBzY29wZSA9IENvbW1hbmRTY29wZS5ldmVyeXdoZXJlO1xuICBwdWJsaWMgYXJndW1lbnRzOiBzdHJpbmdbXSA9IFsgJ3BhY2thZ2VzJyBdO1xuICBwdWJsaWMgb3B0aW9uczogT3B0aW9uW10gPSBbXG4gICAgLy8gUmVtb3ZlIHRoZSAtLWZvcmNlIGZsYWcuXG4gICAgLi4udGhpcy5jb3JlT3B0aW9ucy5maWx0ZXIob3B0aW9uID0+IG9wdGlvbi5uYW1lICE9PSAnZm9yY2UnKSxcbiAgXTtcbiAgcHVibGljIHJlYWRvbmx5IGFsbG93TWlzc2luZ1dvcmtzcGFjZSA9IHRydWU7XG5cbiAgcHJpdmF0ZSBjb2xsZWN0aW9uTmFtZSA9ICdAc2NoZW1hdGljcy91cGRhdGUnO1xuICBwcml2YXRlIHNjaGVtYXRpY05hbWUgPSAndXBkYXRlJztcblxuICBwcml2YXRlIGluaXRpYWxpemVkID0gZmFsc2U7XG4gIHB1YmxpYyBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IGFueSkge1xuICAgIGlmICh0aGlzLmluaXRpYWxpemVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF3YWl0IHN1cGVyLmluaXRpYWxpemUob3B0aW9ucyk7XG4gICAgdGhpcy5pbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICBjb25zdCBzY2hlbWF0aWNPcHRpb25zID0gYXdhaXQgdGhpcy5nZXRPcHRpb25zKHtcbiAgICAgIHNjaGVtYXRpY05hbWU6IHRoaXMuc2NoZW1hdGljTmFtZSxcbiAgICAgIGNvbGxlY3Rpb25OYW1lOiB0aGlzLmNvbGxlY3Rpb25OYW1lLFxuICAgIH0pO1xuICAgIHRoaXMub3B0aW9ucyA9IHRoaXMub3B0aW9ucy5jb25jYXQoc2NoZW1hdGljT3B0aW9ucy5vcHRpb25zKTtcbiAgICB0aGlzLmFyZ3VtZW50cyA9IHRoaXMuYXJndW1lbnRzLmNvbmNhdChzY2hlbWF0aWNPcHRpb25zLmFyZ3VtZW50cy5tYXAoYSA9PiBhLm5hbWUpKTtcbiAgfVxuXG4gIGFzeW5jIHZhbGlkYXRlKG9wdGlvbnM6IGFueSkge1xuICAgIGlmIChvcHRpb25zLl9bMF0gPT0gJ0Bhbmd1bGFyL2NsaSdcbiAgICAgICAgJiYgb3B0aW9ucy5taWdyYXRlT25seSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICYmIG9wdGlvbnMuZnJvbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBDaGVjayBmb3IgYSAxLjcgYW5ndWxhci1jbGkuanNvbiBmaWxlLlxuICAgICAgY29uc3Qgb2xkQ29uZmlnRmlsZU5hbWVzID0gW1xuICAgICAgICBub3JtYWxpemUoJy5hbmd1bGFyLWNsaS5qc29uJyksXG4gICAgICAgIG5vcm1hbGl6ZSgnYW5ndWxhci1jbGkuanNvbicpLFxuICAgICAgXTtcbiAgICAgIGNvbnN0IG9sZENvbmZpZ0ZpbGVQYXRoID1cbiAgICAgICAgZmluZFVwKG9sZENvbmZpZ0ZpbGVOYW1lcywgcHJvY2Vzcy5jd2QoKSlcbiAgICAgICAgfHwgZmluZFVwKG9sZENvbmZpZ0ZpbGVOYW1lcywgX19kaXJuYW1lKTtcblxuICAgICAgaWYgKG9sZENvbmZpZ0ZpbGVQYXRoKSB7XG4gICAgICAgIG9wdGlvbnMubWlncmF0ZU9ubHkgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmZyb20gPSAnMS4wLjAnO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdXBlci52YWxpZGF0ZShvcHRpb25zKTtcbiAgfVxuXG5cbiAgcHVibGljIGFzeW5jIHJ1bihvcHRpb25zOiBVcGRhdGVPcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMucnVuU2NoZW1hdGljKHtcbiAgICAgIGNvbGxlY3Rpb25OYW1lOiB0aGlzLmNvbGxlY3Rpb25OYW1lLFxuICAgICAgc2NoZW1hdGljTmFtZTogdGhpcy5zY2hlbWF0aWNOYW1lLFxuICAgICAgc2NoZW1hdGljT3B0aW9uczogb3B0aW9ucyxcbiAgICAgIGRyeVJ1bjogb3B0aW9ucy5kcnlSdW4sXG4gICAgICBmb3JjZTogZmFsc2UsXG4gICAgICBzaG93Tm90aGluZ0RvbmU6IGZhbHNlLFxuICAgIH0pO1xuICB9XG59XG4iXX0=