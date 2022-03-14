"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewCommand = void 0;
const schematic_command_1 = require("../models/schematic-command");
const version_1 = require("../models/version");
class NewCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.allowMissingWorkspace = true;
        this.schematicName = 'ng-new';
    }
    async initialize(options) {
        this.collectionName = options.collection || (await this.getDefaultSchematicCollection());
        return super.initialize(options);
    }
    async run(options) {
        // Register the version of the CLI in the registry.
        const version = version_1.VERSION.full;
        this._workflow.registry.addSmartDefaultProvider('ng-cli-version', () => version);
        return this.runSchematic({
            collectionName: this.collectionName,
            schematicName: this.schematicName,
            schematicOptions: options['--'] || [],
            debug: !!options.debug,
            dryRun: !!options.dryRun,
            force: !!options.force,
        });
    }
}
exports.NewCommand = NewCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3LWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9uZXctaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFHSCxtRUFBK0Q7QUFDL0QsK0NBQTRDO0FBRzVDLE1BQWEsVUFBVyxTQUFRLG9DQUFrQztJQUFsRTs7UUFDMkIsMEJBQXFCLEdBQUcsSUFBSSxDQUFDO1FBQzdDLGtCQUFhLEdBQUcsUUFBUSxDQUFDO0lBc0JwQyxDQUFDO0lBcEJVLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBcUM7UUFDN0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMsVUFBVSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDO1FBRXpGLE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFxQztRQUNwRCxtREFBbUQ7UUFDbkQsTUFBTSxPQUFPLEdBQUcsaUJBQU8sQ0FBQyxJQUFJLENBQUM7UUFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFakYsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQ3ZCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztZQUNuQyxhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7WUFDakMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDckMsS0FBSyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSztZQUN0QixNQUFNLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNO1lBQ3hCLEtBQUssRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUs7U0FDdkIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBeEJELGdDQXdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBBcmd1bWVudHMgfSBmcm9tICcuLi9tb2RlbHMvaW50ZXJmYWNlJztcbmltcG9ydCB7IFNjaGVtYXRpY0NvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvc2NoZW1hdGljLWNvbW1hbmQnO1xuaW1wb3J0IHsgVkVSU0lPTiB9IGZyb20gJy4uL21vZGVscy92ZXJzaW9uJztcbmltcG9ydCB7IFNjaGVtYSBhcyBOZXdDb21tYW5kU2NoZW1hIH0gZnJvbSAnLi9uZXcnO1xuXG5leHBvcnQgY2xhc3MgTmV3Q29tbWFuZCBleHRlbmRzIFNjaGVtYXRpY0NvbW1hbmQ8TmV3Q29tbWFuZFNjaGVtYT4ge1xuICBwdWJsaWMgb3ZlcnJpZGUgcmVhZG9ubHkgYWxsb3dNaXNzaW5nV29ya3NwYWNlID0gdHJ1ZTtcbiAgb3ZlcnJpZGUgc2NoZW1hdGljTmFtZSA9ICduZy1uZXcnO1xuXG4gIG92ZXJyaWRlIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogTmV3Q29tbWFuZFNjaGVtYSAmIEFyZ3VtZW50cykge1xuICAgIHRoaXMuY29sbGVjdGlvbk5hbWUgPSBvcHRpb25zLmNvbGxlY3Rpb24gfHwgKGF3YWl0IHRoaXMuZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKSk7XG5cbiAgICByZXR1cm4gc3VwZXIuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogTmV3Q29tbWFuZFNjaGVtYSAmIEFyZ3VtZW50cykge1xuICAgIC8vIFJlZ2lzdGVyIHRoZSB2ZXJzaW9uIG9mIHRoZSBDTEkgaW4gdGhlIHJlZ2lzdHJ5LlxuICAgIGNvbnN0IHZlcnNpb24gPSBWRVJTSU9OLmZ1bGw7XG4gICAgdGhpcy5fd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ25nLWNsaS12ZXJzaW9uJywgKCkgPT4gdmVyc2lvbik7XG5cbiAgICByZXR1cm4gdGhpcy5ydW5TY2hlbWF0aWMoe1xuICAgICAgY29sbGVjdGlvbk5hbWU6IHRoaXMuY29sbGVjdGlvbk5hbWUsXG4gICAgICBzY2hlbWF0aWNOYW1lOiB0aGlzLnNjaGVtYXRpY05hbWUsXG4gICAgICBzY2hlbWF0aWNPcHRpb25zOiBvcHRpb25zWyctLSddIHx8IFtdLFxuICAgICAgZGVidWc6ICEhb3B0aW9ucy5kZWJ1ZyxcbiAgICAgIGRyeVJ1bjogISFvcHRpb25zLmRyeVJ1bixcbiAgICAgIGZvcmNlOiAhIW9wdGlvbnMuZm9yY2UsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==