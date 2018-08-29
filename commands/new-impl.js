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
const schematic_command_1 = require("../models/schematic-command");
class NewCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.allowMissingWorkspace = true;
        this.schematicName = 'ng-new';
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
            const collectionName = this.parseCollectionName(options);
            const schematicOptions = yield this.getOptions({
                schematicName: this.schematicName,
                collectionName,
            });
            this.addOptions(this.options.concat(schematicOptions));
        });
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (options.dryRun) {
                options.skipGit = true;
            }
            let collectionName;
            if (options.collection) {
                collectionName = options.collection;
            }
            else {
                collectionName = this.parseCollectionName(options);
            }
            const packageJson = require('../package.json');
            options.version = packageJson.version;
            // Ensure skipGit has a boolean value.
            options.skipGit = options.skipGit === undefined ? false : options.skipGit;
            return this.runSchematic({
                collectionName: collectionName,
                schematicName: this.schematicName,
                schematicOptions: this.removeLocalOptions(options),
                debug: options.debug,
                dryRun: options.dryRun,
                force: options.force,
                interactive: options.interactive,
            });
        });
    }
    parseCollectionName(options) {
        const collectionName = options.collection || options.c || this.getDefaultSchematicCollection();
        return collectionName;
    }
    removeLocalOptions(options) {
        const opts = Object.assign({}, options);
        delete opts.verbose;
        delete opts.collection;
        delete opts.interactive;
        return opts;
    }
}
exports.NewCommand = NewCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3LWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL25ldy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCxpREFBaUQ7QUFDakQsbUVBQStEO0FBRS9ELGdCQUF3QixTQUFRLG9DQUFnQjtJQUFoRDs7UUFDa0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDO1FBQ3JDLGtCQUFhLEdBQUcsUUFBUSxDQUFDO1FBRXpCLGdCQUFXLEdBQUcsS0FBSyxDQUFDO0lBOEQ5QixDQUFDO0lBN0RjLFVBQVUsQ0FBQyxPQUFZOzs7WUFDbEMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNwQixPQUFPO2FBQ1I7WUFFRCxNQUFNLG9CQUFnQixZQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRWhDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1lBRXhCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUV6RCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDN0MsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO2dCQUNqQyxjQUFjO2FBQ2YsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDekQsQ0FBQztLQUFBO0lBRVksR0FBRyxDQUFDLE9BQVk7O1lBQzNCLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtnQkFDbEIsT0FBTyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7YUFDeEI7WUFFRCxJQUFJLGNBQXNCLENBQUM7WUFDM0IsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO2dCQUN0QixjQUFjLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQzthQUNyQztpQkFBTTtnQkFDTCxjQUFjLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3BEO1lBRUQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDL0MsT0FBTyxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDO1lBRXRDLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFFMUUsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO2dCQUN2QixjQUFjLEVBQUUsY0FBYztnQkFDOUIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO2dCQUNqQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDO2dCQUNsRCxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7Z0JBQ3BCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtnQkFDdEIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO2dCQUNwQixXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7YUFDakMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUFBO0lBRU8sbUJBQW1CLENBQUMsT0FBWTtRQUN0QyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsVUFBVSxJQUFJLE9BQU8sQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUM7UUFFL0YsT0FBTyxjQUFjLENBQUM7SUFDeEIsQ0FBQztJQUVPLGtCQUFrQixDQUFDLE9BQVk7UUFDckMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUN2QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7UUFFeEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUFsRUQsZ0NBa0VDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgbm8tYW55XG5pbXBvcnQgeyBTY2hlbWF0aWNDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL3NjaGVtYXRpYy1jb21tYW5kJztcblxuZXhwb3J0IGNsYXNzIE5ld0NvbW1hbmQgZXh0ZW5kcyBTY2hlbWF0aWNDb21tYW5kIHtcbiAgcHVibGljIHJlYWRvbmx5IGFsbG93TWlzc2luZ1dvcmtzcGFjZSA9IHRydWU7XG4gIHByaXZhdGUgc2NoZW1hdGljTmFtZSA9ICduZy1uZXcnO1xuXG4gIHByaXZhdGUgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgcHVibGljIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogYW55KSB7XG4gICAgaWYgKHRoaXMuaW5pdGlhbGl6ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCBzdXBlci5pbml0aWFsaXplKG9wdGlvbnMpO1xuXG4gICAgdGhpcy5pbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IHRoaXMucGFyc2VDb2xsZWN0aW9uTmFtZShvcHRpb25zKTtcblxuICAgIGNvbnN0IHNjaGVtYXRpY09wdGlvbnMgPSBhd2FpdCB0aGlzLmdldE9wdGlvbnMoe1xuICAgICAgc2NoZW1hdGljTmFtZTogdGhpcy5zY2hlbWF0aWNOYW1lLFxuICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgfSk7XG4gICAgdGhpcy5hZGRPcHRpb25zKHRoaXMub3B0aW9ucy5jb25jYXQoc2NoZW1hdGljT3B0aW9ucykpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHJ1bihvcHRpb25zOiBhbnkpIHtcbiAgICBpZiAob3B0aW9ucy5kcnlSdW4pIHtcbiAgICAgIG9wdGlvbnMuc2tpcEdpdCA9IHRydWU7XG4gICAgfVxuXG4gICAgbGV0IGNvbGxlY3Rpb25OYW1lOiBzdHJpbmc7XG4gICAgaWYgKG9wdGlvbnMuY29sbGVjdGlvbikge1xuICAgICAgY29sbGVjdGlvbk5hbWUgPSBvcHRpb25zLmNvbGxlY3Rpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbGxlY3Rpb25OYW1lID0gdGhpcy5wYXJzZUNvbGxlY3Rpb25OYW1lKG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGNvbnN0IHBhY2thZ2VKc29uID0gcmVxdWlyZSgnLi4vcGFja2FnZS5qc29uJyk7XG4gICAgb3B0aW9ucy52ZXJzaW9uID0gcGFja2FnZUpzb24udmVyc2lvbjtcblxuICAgIC8vIEVuc3VyZSBza2lwR2l0IGhhcyBhIGJvb2xlYW4gdmFsdWUuXG4gICAgb3B0aW9ucy5za2lwR2l0ID0gb3B0aW9ucy5za2lwR2l0ID09PSB1bmRlZmluZWQgPyBmYWxzZSA6IG9wdGlvbnMuc2tpcEdpdDtcblxuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZTogY29sbGVjdGlvbk5hbWUsXG4gICAgICBzY2hlbWF0aWNOYW1lOiB0aGlzLnNjaGVtYXRpY05hbWUsXG4gICAgICBzY2hlbWF0aWNPcHRpb25zOiB0aGlzLnJlbW92ZUxvY2FsT3B0aW9ucyhvcHRpb25zKSxcbiAgICAgIGRlYnVnOiBvcHRpb25zLmRlYnVnLFxuICAgICAgZHJ5UnVuOiBvcHRpb25zLmRyeVJ1bixcbiAgICAgIGZvcmNlOiBvcHRpb25zLmZvcmNlLFxuICAgICAgaW50ZXJhY3RpdmU6IG9wdGlvbnMuaW50ZXJhY3RpdmUsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQ29sbGVjdGlvbk5hbWUob3B0aW9uczogYW55KTogc3RyaW5nIHtcbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IG9wdGlvbnMuY29sbGVjdGlvbiB8fCBvcHRpb25zLmMgfHwgdGhpcy5nZXREZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbigpO1xuXG4gICAgcmV0dXJuIGNvbGxlY3Rpb25OYW1lO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVMb2NhbE9wdGlvbnMob3B0aW9uczogYW55KTogYW55IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyk7XG4gICAgZGVsZXRlIG9wdHMudmVyYm9zZTtcbiAgICBkZWxldGUgb3B0cy5jb2xsZWN0aW9uO1xuICAgIGRlbGV0ZSBvcHRzLmludGVyYWN0aXZlO1xuXG4gICAgcmV0dXJuIG9wdHM7XG4gIH1cbn1cbiJdfQ==