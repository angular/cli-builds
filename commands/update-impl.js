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
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const core_1 = require("@angular-devkit/core");
const schematic_command_1 = require("../models/schematic-command");
const find_up_1 = require("../utilities/find-up");
const json_schema_1 = require("../utilities/json-schema");
class UpdateCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.allowMissingWorkspace = true;
        this.collectionName = '@schematics/update';
        this.schematicName = 'update';
    }
    initialize(input) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            yield _super("initialize").call(this, input);
            // Set the options.
            const collection = this.getCollection(this.collectionName);
            const schematic = this.getSchematic(collection, this.schematicName, true);
            const options = yield json_schema_1.parseJsonSchemaToOptions(this._workflow.registry, schematic.description.schemaJson || {});
            this.description.options.push(...options);
        });
    }
    parseArguments(schematicOptions, schema) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            const args = yield _super("parseArguments").call(this, schematicOptions, schema);
            const maybeArgsLeftovers = args['--'];
            if (maybeArgsLeftovers
                && maybeArgsLeftovers.length == 1
                && maybeArgsLeftovers[0] == '@angular/cli'
                && args.migrateOnly === undefined
                && args.from === undefined) {
                // Check for a 1.7 angular-cli.json file.
                const oldConfigFileNames = [
                    core_1.normalize('.angular-cli.json'),
                    core_1.normalize('angular-cli.json'),
                ];
                const oldConfigFilePath = find_up_1.findUp(oldConfigFileNames, process.cwd())
                    || find_up_1.findUp(oldConfigFileNames, __dirname);
                if (oldConfigFilePath) {
                    args.migrateOnly = true;
                    args.from = '1.0.0';
                }
            }
            // Move `--` to packages.
            if (args.packages == undefined && args['--']) {
                args.packages = args['--'];
                delete args['--'];
            }
            return args;
        });
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.runSchematic({
                collectionName: this.collectionName,
                schematicName: this.schematicName,
                schematicOptions: options['--'],
                dryRun: options.dryRun,
                force: false,
                showNothingDone: false,
            });
        });
    }
}
exports.UpdateCommand = UpdateCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL3VwZGF0ZS1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwrQ0FBaUQ7QUFFakQsbUVBQXFGO0FBQ3JGLGtEQUE4QztBQUM5QywwREFBb0U7QUFnQnBFLG1CQUFvRSxTQUFRLG9DQUFtQjtJQUEvRjs7UUFDa0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDO1FBRXJDLG1CQUFjLEdBQUcsb0JBQW9CLENBQUM7UUFDdEMsa0JBQWEsR0FBRyxRQUFRLENBQUM7SUEwRG5DLENBQUM7SUF4RE8sVUFBVSxDQUFDLEtBQVE7OztZQUN2QixNQUFNLG9CQUFnQixZQUFDLEtBQUssQ0FBQyxDQUFDO1lBRTlCLG1CQUFtQjtZQUNuQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUMzRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzFFLE1BQU0sT0FBTyxHQUFHLE1BQU0sc0NBQXdCLENBQzVDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUN2QixTQUFTLENBQUMsV0FBVyxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQ3ZDLENBQUM7WUFFRixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQztRQUM1QyxDQUFDO0tBQUE7SUFFSyxjQUFjLENBQUMsZ0JBQTBCLEVBQUUsTUFBZ0I7OztZQUMvRCxNQUFNLElBQUksR0FBRyxNQUFNLHdCQUFvQixZQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBMkIsQ0FBQztZQUM1RixNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV0QyxJQUFJLGtCQUFrQjttQkFDZixrQkFBa0IsQ0FBQyxNQUFNLElBQUksQ0FBQzttQkFDOUIsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLElBQUksY0FBYzttQkFDdkMsSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTO21CQUM5QixJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtnQkFDOUIseUNBQXlDO2dCQUN6QyxNQUFNLGtCQUFrQixHQUFHO29CQUN6QixnQkFBUyxDQUFDLG1CQUFtQixDQUFDO29CQUM5QixnQkFBUyxDQUFDLGtCQUFrQixDQUFDO2lCQUM5QixDQUFDO2dCQUNGLE1BQU0saUJBQWlCLEdBQUcsZ0JBQU0sQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7dUJBQ3pDLGdCQUFNLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBRWhFLElBQUksaUJBQWlCLEVBQUU7b0JBQ3JCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO29CQUN4QixJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQztpQkFDckI7YUFDRjtZQUVELHlCQUF5QjtZQUN6QixJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksU0FBUyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDNUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzNCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ25CO1lBRUQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO0tBQUE7SUFFSyxHQUFHLENBQUMsT0FBc0I7O1lBQzlCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztnQkFDdkIsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO2dCQUNuQyxhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7Z0JBQ2pDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQy9CLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtnQkFDdEIsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osZUFBZSxFQUFFLEtBQUs7YUFDdkIsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUFBO0NBQ0Y7QUE5REQsc0NBOERDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgbm9ybWFsaXplIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQXJndW1lbnRzLCBPcHRpb24gfSBmcm9tICcuLi9tb2RlbHMvaW50ZXJmYWNlJztcbmltcG9ydCB7IEJhc2VTY2hlbWF0aWNPcHRpb25zLCBTY2hlbWF0aWNDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL3NjaGVtYXRpYy1jb21tYW5kJztcbmltcG9ydCB7IGZpbmRVcCB9IGZyb20gJy4uL3V0aWxpdGllcy9maW5kLXVwJztcbmltcG9ydCB7IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyB9IGZyb20gJy4uL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVXBkYXRlT3B0aW9ucyBleHRlbmRzIEJhc2VTY2hlbWF0aWNPcHRpb25zIHtcbiAgbmV4dDogYm9vbGVhbjtcbiAgc2NoZW1hdGljPzogYm9vbGVhbjtcbiAgZHJ5UnVuOiBib29sZWFuO1xuICBmb3JjZTogYm9vbGVhbjtcbn1cblxudHlwZSBVcGRhdGVTY2hlbWF0aWNPcHRpb25zID0gQXJndW1lbnRzICYge1xuICBtaWdyYXRlT25seT86IGJvb2xlYW47XG4gIGZyb20/OiBzdHJpbmc7XG4gIHBhY2thZ2VzPzogc3RyaW5nIHwgc3RyaW5nW107XG59O1xuXG5cbmV4cG9ydCBjbGFzcyBVcGRhdGVDb21tYW5kPFQgZXh0ZW5kcyBVcGRhdGVPcHRpb25zID0gVXBkYXRlT3B0aW9ucz4gZXh0ZW5kcyBTY2hlbWF0aWNDb21tYW5kPFQ+IHtcbiAgcHVibGljIHJlYWRvbmx5IGFsbG93TWlzc2luZ1dvcmtzcGFjZSA9IHRydWU7XG5cbiAgcHJpdmF0ZSBjb2xsZWN0aW9uTmFtZSA9ICdAc2NoZW1hdGljcy91cGRhdGUnO1xuICBwcml2YXRlIHNjaGVtYXRpY05hbWUgPSAndXBkYXRlJztcblxuICBhc3luYyBpbml0aWFsaXplKGlucHV0OiBUKSB7XG4gICAgYXdhaXQgc3VwZXIuaW5pdGlhbGl6ZShpbnB1dCk7XG5cbiAgICAvLyBTZXQgdGhlIG9wdGlvbnMuXG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMuZ2V0Q29sbGVjdGlvbih0aGlzLmNvbGxlY3Rpb25OYW1lKTtcbiAgICBjb25zdCBzY2hlbWF0aWMgPSB0aGlzLmdldFNjaGVtYXRpYyhjb2xsZWN0aW9uLCB0aGlzLnNjaGVtYXRpY05hbWUsIHRydWUpO1xuICAgIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMoXG4gICAgICB0aGlzLl93b3JrZmxvdy5yZWdpc3RyeSxcbiAgICAgIHNjaGVtYXRpYy5kZXNjcmlwdGlvbi5zY2hlbWFKc29uIHx8IHt9LFxuICAgICk7XG5cbiAgICB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMucHVzaCguLi5vcHRpb25zKTtcbiAgfVxuXG4gIGFzeW5jIHBhcnNlQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnM6IHN0cmluZ1tdLCBzY2hlbWE6IE9wdGlvbltdKTogUHJvbWlzZTxBcmd1bWVudHM+IHtcbiAgICBjb25zdCBhcmdzID0gYXdhaXQgc3VwZXIucGFyc2VBcmd1bWVudHMoc2NoZW1hdGljT3B0aW9ucywgc2NoZW1hKSBhcyBVcGRhdGVTY2hlbWF0aWNPcHRpb25zO1xuICAgIGNvbnN0IG1heWJlQXJnc0xlZnRvdmVycyA9IGFyZ3NbJy0tJ107XG5cbiAgICBpZiAobWF5YmVBcmdzTGVmdG92ZXJzXG4gICAgICAgICYmIG1heWJlQXJnc0xlZnRvdmVycy5sZW5ndGggPT0gMVxuICAgICAgICAmJiBtYXliZUFyZ3NMZWZ0b3ZlcnNbMF0gPT0gJ0Bhbmd1bGFyL2NsaSdcbiAgICAgICAgJiYgYXJncy5taWdyYXRlT25seSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICYmIGFyZ3MuZnJvbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBDaGVjayBmb3IgYSAxLjcgYW5ndWxhci1jbGkuanNvbiBmaWxlLlxuICAgICAgY29uc3Qgb2xkQ29uZmlnRmlsZU5hbWVzID0gW1xuICAgICAgICBub3JtYWxpemUoJy5hbmd1bGFyLWNsaS5qc29uJyksXG4gICAgICAgIG5vcm1hbGl6ZSgnYW5ndWxhci1jbGkuanNvbicpLFxuICAgICAgXTtcbiAgICAgIGNvbnN0IG9sZENvbmZpZ0ZpbGVQYXRoID0gZmluZFVwKG9sZENvbmZpZ0ZpbGVOYW1lcywgcHJvY2Vzcy5jd2QoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgZmluZFVwKG9sZENvbmZpZ0ZpbGVOYW1lcywgX19kaXJuYW1lKTtcblxuICAgICAgaWYgKG9sZENvbmZpZ0ZpbGVQYXRoKSB7XG4gICAgICAgIGFyZ3MubWlncmF0ZU9ubHkgPSB0cnVlO1xuICAgICAgICBhcmdzLmZyb20gPSAnMS4wLjAnO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE1vdmUgYC0tYCB0byBwYWNrYWdlcy5cbiAgICBpZiAoYXJncy5wYWNrYWdlcyA9PSB1bmRlZmluZWQgJiYgYXJnc1snLS0nXSkge1xuICAgICAgYXJncy5wYWNrYWdlcyA9IGFyZ3NbJy0tJ107XG4gICAgICBkZWxldGUgYXJnc1snLS0nXTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJncztcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBVcGRhdGVPcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMucnVuU2NoZW1hdGljKHtcbiAgICAgIGNvbGxlY3Rpb25OYW1lOiB0aGlzLmNvbGxlY3Rpb25OYW1lLFxuICAgICAgc2NoZW1hdGljTmFtZTogdGhpcy5zY2hlbWF0aWNOYW1lLFxuICAgICAgc2NoZW1hdGljT3B0aW9uczogb3B0aW9uc1snLS0nXSxcbiAgICAgIGRyeVJ1bjogb3B0aW9ucy5kcnlSdW4sXG4gICAgICBmb3JjZTogZmFsc2UsXG4gICAgICBzaG93Tm90aGluZ0RvbmU6IGZhbHNlLFxuICAgIH0pO1xuICB9XG59XG4iXX0=