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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL3VwZGF0ZS1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwrQ0FBaUQ7QUFFakQsbUVBQXFGO0FBQ3JGLGtEQUE4QztBQUM5QywwREFBb0U7QUFnQnBFLE1BQWEsYUFBdUQsU0FBUSxvQ0FBbUI7SUFBL0Y7O1FBQ2tCLDBCQUFxQixHQUFHLElBQUksQ0FBQztRQUVyQyxtQkFBYyxHQUFHLG9CQUFvQixDQUFDO1FBQ3RDLGtCQUFhLEdBQUcsUUFBUSxDQUFDO0lBMERuQyxDQUFDO0lBeERPLFVBQVUsQ0FBQyxLQUFROzs7WUFDdkIsTUFBTSxvQkFBZ0IsWUFBQyxLQUFLLENBQUMsQ0FBQztZQUU5QixtQkFBbUI7WUFDbkIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDM0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMxRSxNQUFNLE9BQU8sR0FBRyxNQUFNLHNDQUF3QixDQUM1QyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFDdkIsU0FBUyxDQUFDLFdBQVcsQ0FBQyxVQUFVLElBQUksRUFBRSxDQUN2QyxDQUFDO1lBRUYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDNUMsQ0FBQztLQUFBO0lBRUssY0FBYyxDQUFDLGdCQUEwQixFQUFFLE1BQWdCOzs7WUFDL0QsTUFBTSxJQUFJLEdBQUcsTUFBTSx3QkFBb0IsWUFBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQTJCLENBQUM7WUFDNUYsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFdEMsSUFBSSxrQkFBa0I7bUJBQ2Ysa0JBQWtCLENBQUMsTUFBTSxJQUFJLENBQUM7bUJBQzlCLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxJQUFJLGNBQWM7bUJBQ3ZDLElBQUksQ0FBQyxXQUFXLEtBQUssU0FBUzttQkFDOUIsSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQzlCLHlDQUF5QztnQkFDekMsTUFBTSxrQkFBa0IsR0FBRztvQkFDekIsZ0JBQVMsQ0FBQyxtQkFBbUIsQ0FBQztvQkFDOUIsZ0JBQVMsQ0FBQyxrQkFBa0IsQ0FBQztpQkFDOUIsQ0FBQztnQkFDRixNQUFNLGlCQUFpQixHQUFHLGdCQUFNLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO3VCQUN6QyxnQkFBTSxDQUFDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUVoRSxJQUFJLGlCQUFpQixFQUFFO29CQUNyQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztvQkFDeEIsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7aUJBQ3JCO2FBQ0Y7WUFFRCx5QkFBeUI7WUFDekIsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLFNBQVMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzVDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMzQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNuQjtZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztLQUFBO0lBRUssR0FBRyxDQUFDLE9BQXNCOztZQUM5QixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ3ZCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztnQkFDbkMsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO2dCQUNqQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUMvQixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07Z0JBQ3RCLEtBQUssRUFBRSxLQUFLO2dCQUNaLGVBQWUsRUFBRSxLQUFLO2FBQ3ZCLENBQUMsQ0FBQztRQUNMLENBQUM7S0FBQTtDQUNGO0FBOURELHNDQThEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7IG5vcm1hbGl6ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IEFyZ3VtZW50cywgT3B0aW9uIH0gZnJvbSAnLi4vbW9kZWxzL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBCYXNlU2NoZW1hdGljT3B0aW9ucywgU2NoZW1hdGljQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZCc7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuLi91dGlsaXRpZXMvZmluZC11cCc7XG5pbXBvcnQgeyBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMgfSBmcm9tICcuLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFVwZGF0ZU9wdGlvbnMgZXh0ZW5kcyBCYXNlU2NoZW1hdGljT3B0aW9ucyB7XG4gIG5leHQ6IGJvb2xlYW47XG4gIHNjaGVtYXRpYz86IGJvb2xlYW47XG4gIGRyeVJ1bjogYm9vbGVhbjtcbiAgZm9yY2U6IGJvb2xlYW47XG59XG5cbnR5cGUgVXBkYXRlU2NoZW1hdGljT3B0aW9ucyA9IEFyZ3VtZW50cyAmIHtcbiAgbWlncmF0ZU9ubHk/OiBib29sZWFuO1xuICBmcm9tPzogc3RyaW5nO1xuICBwYWNrYWdlcz86IHN0cmluZyB8IHN0cmluZ1tdO1xufTtcblxuXG5leHBvcnQgY2xhc3MgVXBkYXRlQ29tbWFuZDxUIGV4dGVuZHMgVXBkYXRlT3B0aW9ucyA9IFVwZGF0ZU9wdGlvbnM+IGV4dGVuZHMgU2NoZW1hdGljQ29tbWFuZDxUPiB7XG4gIHB1YmxpYyByZWFkb25seSBhbGxvd01pc3NpbmdXb3Jrc3BhY2UgPSB0cnVlO1xuXG4gIHByaXZhdGUgY29sbGVjdGlvbk5hbWUgPSAnQHNjaGVtYXRpY3MvdXBkYXRlJztcbiAgcHJpdmF0ZSBzY2hlbWF0aWNOYW1lID0gJ3VwZGF0ZSc7XG5cbiAgYXN5bmMgaW5pdGlhbGl6ZShpbnB1dDogVCkge1xuICAgIGF3YWl0IHN1cGVyLmluaXRpYWxpemUoaW5wdXQpO1xuXG4gICAgLy8gU2V0IHRoZSBvcHRpb25zLlxuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB0aGlzLmdldENvbGxlY3Rpb24odGhpcy5jb2xsZWN0aW9uTmFtZSk7XG4gICAgY29uc3Qgc2NoZW1hdGljID0gdGhpcy5nZXRTY2hlbWF0aWMoY29sbGVjdGlvbiwgdGhpcy5zY2hlbWF0aWNOYW1lLCB0cnVlKTtcbiAgICBjb25zdCBvcHRpb25zID0gYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKFxuICAgICAgdGhpcy5fd29ya2Zsb3cucmVnaXN0cnksXG4gICAgICBzY2hlbWF0aWMuZGVzY3JpcHRpb24uc2NoZW1hSnNvbiB8fCB7fSxcbiAgICApO1xuXG4gICAgdGhpcy5kZXNjcmlwdGlvbi5vcHRpb25zLnB1c2goLi4ub3B0aW9ucyk7XG4gIH1cblxuICBhc3luYyBwYXJzZUFyZ3VtZW50cyhzY2hlbWF0aWNPcHRpb25zOiBzdHJpbmdbXSwgc2NoZW1hOiBPcHRpb25bXSk6IFByb21pc2U8QXJndW1lbnRzPiB7XG4gICAgY29uc3QgYXJncyA9IGF3YWl0IHN1cGVyLnBhcnNlQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnMsIHNjaGVtYSkgYXMgVXBkYXRlU2NoZW1hdGljT3B0aW9ucztcbiAgICBjb25zdCBtYXliZUFyZ3NMZWZ0b3ZlcnMgPSBhcmdzWyctLSddO1xuXG4gICAgaWYgKG1heWJlQXJnc0xlZnRvdmVyc1xuICAgICAgICAmJiBtYXliZUFyZ3NMZWZ0b3ZlcnMubGVuZ3RoID09IDFcbiAgICAgICAgJiYgbWF5YmVBcmdzTGVmdG92ZXJzWzBdID09ICdAYW5ndWxhci9jbGknXG4gICAgICAgICYmIGFyZ3MubWlncmF0ZU9ubHkgPT09IHVuZGVmaW5lZFxuICAgICAgICAmJiBhcmdzLmZyb20gPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gQ2hlY2sgZm9yIGEgMS43IGFuZ3VsYXItY2xpLmpzb24gZmlsZS5cbiAgICAgIGNvbnN0IG9sZENvbmZpZ0ZpbGVOYW1lcyA9IFtcbiAgICAgICAgbm9ybWFsaXplKCcuYW5ndWxhci1jbGkuanNvbicpLFxuICAgICAgICBub3JtYWxpemUoJ2FuZ3VsYXItY2xpLmpzb24nKSxcbiAgICAgIF07XG4gICAgICBjb25zdCBvbGRDb25maWdGaWxlUGF0aCA9IGZpbmRVcChvbGRDb25maWdGaWxlTmFtZXMsIHByb2Nlc3MuY3dkKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IGZpbmRVcChvbGRDb25maWdGaWxlTmFtZXMsIF9fZGlybmFtZSk7XG5cbiAgICAgIGlmIChvbGRDb25maWdGaWxlUGF0aCkge1xuICAgICAgICBhcmdzLm1pZ3JhdGVPbmx5ID0gdHJ1ZTtcbiAgICAgICAgYXJncy5mcm9tID0gJzEuMC4wJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBNb3ZlIGAtLWAgdG8gcGFja2FnZXMuXG4gICAgaWYgKGFyZ3MucGFja2FnZXMgPT0gdW5kZWZpbmVkICYmIGFyZ3NbJy0tJ10pIHtcbiAgICAgIGFyZ3MucGFja2FnZXMgPSBhcmdzWyctLSddO1xuICAgICAgZGVsZXRlIGFyZ3NbJy0tJ107XG4gICAgfVxuXG4gICAgcmV0dXJuIGFyZ3M7XG4gIH1cblxuICBhc3luYyBydW4ob3B0aW9uczogVXBkYXRlT3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZTogdGhpcy5jb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWU6IHRoaXMuc2NoZW1hdGljTmFtZSxcbiAgICAgIHNjaGVtYXRpY09wdGlvbnM6IG9wdGlvbnNbJy0tJ10sXG4gICAgICBkcnlSdW46IG9wdGlvbnMuZHJ5UnVuLFxuICAgICAgZm9yY2U6IGZhbHNlLFxuICAgICAgc2hvd05vdGhpbmdEb25lOiBmYWxzZSxcbiAgICB9KTtcbiAgfVxufVxuIl19