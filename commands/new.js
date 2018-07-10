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
const command_1 = require("../models/command");
const schematic_command_1 = require("../models/schematic-command");
const config_1 = require("../utilities/config");
class NewCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.name = 'new';
        this.description = 'Creates a new directory and a new Angular app.';
        this.scope = command_1.CommandScope.outsideProject;
        this.allowMissingWorkspace = true;
        this.arguments = [];
        this.options = [
            ...this.coreOptions,
            {
                name: 'verbose',
                type: Boolean,
                default: false,
                aliases: ['v'],
                description: 'Adds more details to output logging.',
            },
            {
                name: 'collection',
                type: String,
                aliases: ['c'],
                description: 'Schematics collection to use.',
            },
        ];
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
            this.options = this.options.concat(schematicOptions.options);
            const args = schematicOptions.arguments.map(arg => arg.name);
            this.arguments = this.arguments.concat(args);
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
            options = this.removeLocalOptions(options);
            return this.runSchematic({
                collectionName: collectionName,
                schematicName: this.schematicName,
                schematicOptions: options,
                debug: options.debug,
                dryRun: options.dryRun,
                force: options.force,
            });
        });
    }
    parseCollectionName(options) {
        const collectionName = options.collection || options.c || config_1.getDefaultSchematicCollection();
        return collectionName;
    }
    removeLocalOptions(options) {
        const opts = Object.assign({}, options);
        delete opts.verbose;
        delete opts.collection;
        return opts;
    }
}
NewCommand.aliases = ['n'];
exports.default = NewCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3LmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9uZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUVILGlEQUFpRDtBQUNqRCwrQ0FBeUQ7QUFDekQsbUVBQStEO0FBQy9ELGdEQUFvRTtBQUdwRSxnQkFBZ0MsU0FBUSxvQ0FBZ0I7SUFBeEQ7O1FBQ2tCLFNBQUksR0FBRyxLQUFLLENBQUM7UUFDYixnQkFBVyxHQUN6QixnREFBZ0QsQ0FBQztRQUU1QyxVQUFLLEdBQUcsc0JBQVksQ0FBQyxjQUFjLENBQUM7UUFDM0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDO1FBQ3RDLGNBQVMsR0FBYSxFQUFFLENBQUM7UUFDekIsWUFBTyxHQUFhO1lBQ3pCLEdBQUcsSUFBSSxDQUFDLFdBQVc7WUFDbkI7Z0JBQ0UsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO2dCQUNkLFdBQVcsRUFBRSxzQ0FBc0M7YUFDcEQ7WUFDRDtnQkFDRSxJQUFJLEVBQUUsWUFBWTtnQkFDbEIsSUFBSSxFQUFFLE1BQU07Z0JBQ1osT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO2dCQUNkLFdBQVcsRUFBRSwrQkFBK0I7YUFDN0M7U0FDRixDQUFDO1FBQ00sa0JBQWEsR0FBRyxRQUFRLENBQUM7UUFFekIsZ0JBQVcsR0FBRyxLQUFLLENBQUM7SUFpRTlCLENBQUM7SUFoRWMsVUFBVSxDQUFDLE9BQVk7OztZQUNsQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDckIsTUFBTSxDQUFDO1lBQ1QsQ0FBQztZQUVELE1BQU0sb0JBQWdCLFlBQUMsT0FBTyxDQUFDLENBQUM7WUFFaEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7WUFFeEIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXpELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUM3QyxhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7Z0JBQ2pDLGNBQWM7YUFDZixDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzdELE1BQU0sSUFBSSxHQUFHLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQyxDQUFDO0tBQUE7SUFFWSxHQUFHLENBQUMsT0FBWTs7WUFDM0IsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ25CLE9BQU8sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ3pCLENBQUM7WUFFRCxJQUFJLGNBQXNCLENBQUM7WUFDM0IsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLGNBQWMsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO1lBQ3RDLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTixjQUFjLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELENBQUM7WUFFRCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUMvQyxPQUFPLENBQUMsT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUM7WUFFdEMsc0NBQXNDO1lBQ3RDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztZQUUxRSxPQUFPLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRTNDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO2dCQUN2QixjQUFjLEVBQUUsY0FBYztnQkFDOUIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO2dCQUNqQyxnQkFBZ0IsRUFBRSxPQUFPO2dCQUN6QixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7Z0JBQ3BCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtnQkFDdEIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO2FBQ3JCLENBQUMsQ0FBQztRQUNMLENBQUM7S0FBQTtJQUVPLG1CQUFtQixDQUFDLE9BQVk7UUFDdEMsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFVBQVUsSUFBSSxPQUFPLENBQUMsQ0FBQyxJQUFJLHNDQUE2QixFQUFFLENBQUM7UUFFMUYsTUFBTSxDQUFDLGNBQWMsQ0FBQztJQUN4QixDQUFDO0lBRU8sa0JBQWtCLENBQUMsT0FBWTtRQUNyQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDcEIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBRXZCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDOztBQXRGYSxrQkFBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFKaEMsNkJBMkZDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgbm8tYW55XG5pbXBvcnQgeyBDb21tYW5kU2NvcGUsIE9wdGlvbiB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcbmltcG9ydCB7IFNjaGVtYXRpY0NvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvc2NoZW1hdGljLWNvbW1hbmQnO1xuaW1wb3J0IHsgZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24gfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBOZXdDb21tYW5kIGV4dGVuZHMgU2NoZW1hdGljQ29tbWFuZCB7XG4gIHB1YmxpYyByZWFkb25seSBuYW1lID0gJ25ldyc7XG4gIHB1YmxpYyByZWFkb25seSBkZXNjcmlwdGlvbiA9XG4gICAgJ0NyZWF0ZXMgYSBuZXcgZGlyZWN0b3J5IGFuZCBhIG5ldyBBbmd1bGFyIGFwcC4nO1xuICBwdWJsaWMgc3RhdGljIGFsaWFzZXMgPSBbJ24nXTtcbiAgcHVibGljIHNjb3BlID0gQ29tbWFuZFNjb3BlLm91dHNpZGVQcm9qZWN0O1xuICBwdWJsaWMgcmVhZG9ubHkgYWxsb3dNaXNzaW5nV29ya3NwYWNlID0gdHJ1ZTtcbiAgcHVibGljIGFyZ3VtZW50czogc3RyaW5nW10gPSBbXTtcbiAgcHVibGljIG9wdGlvbnM6IE9wdGlvbltdID0gW1xuICAgIC4uLnRoaXMuY29yZU9wdGlvbnMsXG4gICAge1xuICAgICAgbmFtZTogJ3ZlcmJvc2UnLFxuICAgICAgdHlwZTogQm9vbGVhbixcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgYWxpYXNlczogWyd2J10sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FkZHMgbW9yZSBkZXRhaWxzIHRvIG91dHB1dCBsb2dnaW5nLicsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiAnY29sbGVjdGlvbicsXG4gICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICBhbGlhc2VzOiBbJ2MnXSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2NoZW1hdGljcyBjb2xsZWN0aW9uIHRvIHVzZS4nLFxuICAgIH0sXG4gIF07XG4gIHByaXZhdGUgc2NoZW1hdGljTmFtZSA9ICduZy1uZXcnO1xuXG4gIHByaXZhdGUgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgcHVibGljIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogYW55KSB7XG4gICAgaWYgKHRoaXMuaW5pdGlhbGl6ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCBzdXBlci5pbml0aWFsaXplKG9wdGlvbnMpO1xuXG4gICAgdGhpcy5pbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IHRoaXMucGFyc2VDb2xsZWN0aW9uTmFtZShvcHRpb25zKTtcblxuICAgIGNvbnN0IHNjaGVtYXRpY09wdGlvbnMgPSBhd2FpdCB0aGlzLmdldE9wdGlvbnMoe1xuICAgICAgc2NoZW1hdGljTmFtZTogdGhpcy5zY2hlbWF0aWNOYW1lLFxuICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgfSk7XG5cbiAgICB0aGlzLm9wdGlvbnMgPSB0aGlzLm9wdGlvbnMuY29uY2F0KHNjaGVtYXRpY09wdGlvbnMub3B0aW9ucyk7XG4gICAgY29uc3QgYXJncyA9IHNjaGVtYXRpY09wdGlvbnMuYXJndW1lbnRzLm1hcChhcmcgPT4gYXJnLm5hbWUpO1xuICAgIHRoaXMuYXJndW1lbnRzID0gdGhpcy5hcmd1bWVudHMuY29uY2F0KGFyZ3MpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHJ1bihvcHRpb25zOiBhbnkpIHtcbiAgICBpZiAob3B0aW9ucy5kcnlSdW4pIHtcbiAgICAgIG9wdGlvbnMuc2tpcEdpdCA9IHRydWU7XG4gICAgfVxuXG4gICAgbGV0IGNvbGxlY3Rpb25OYW1lOiBzdHJpbmc7XG4gICAgaWYgKG9wdGlvbnMuY29sbGVjdGlvbikge1xuICAgICAgY29sbGVjdGlvbk5hbWUgPSBvcHRpb25zLmNvbGxlY3Rpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbGxlY3Rpb25OYW1lID0gdGhpcy5wYXJzZUNvbGxlY3Rpb25OYW1lKG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGNvbnN0IHBhY2thZ2VKc29uID0gcmVxdWlyZSgnLi4vcGFja2FnZS5qc29uJyk7XG4gICAgb3B0aW9ucy52ZXJzaW9uID0gcGFja2FnZUpzb24udmVyc2lvbjtcblxuICAgIC8vIEVuc3VyZSBza2lwR2l0IGhhcyBhIGJvb2xlYW4gdmFsdWUuXG4gICAgb3B0aW9ucy5za2lwR2l0ID0gb3B0aW9ucy5za2lwR2l0ID09PSB1bmRlZmluZWQgPyBmYWxzZSA6IG9wdGlvbnMuc2tpcEdpdDtcblxuICAgIG9wdGlvbnMgPSB0aGlzLnJlbW92ZUxvY2FsT3B0aW9ucyhvcHRpb25zKTtcblxuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZTogY29sbGVjdGlvbk5hbWUsXG4gICAgICBzY2hlbWF0aWNOYW1lOiB0aGlzLnNjaGVtYXRpY05hbWUsXG4gICAgICBzY2hlbWF0aWNPcHRpb25zOiBvcHRpb25zLFxuICAgICAgZGVidWc6IG9wdGlvbnMuZGVidWcsXG4gICAgICBkcnlSdW46IG9wdGlvbnMuZHJ5UnVuLFxuICAgICAgZm9yY2U6IG9wdGlvbnMuZm9yY2UsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQ29sbGVjdGlvbk5hbWUob3B0aW9uczogYW55KTogc3RyaW5nIHtcbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IG9wdGlvbnMuY29sbGVjdGlvbiB8fCBvcHRpb25zLmMgfHwgZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKTtcblxuICAgIHJldHVybiBjb2xsZWN0aW9uTmFtZTtcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlTG9jYWxPcHRpb25zKG9wdGlvbnM6IGFueSk6IGFueSB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpO1xuICAgIGRlbGV0ZSBvcHRzLnZlcmJvc2U7XG4gICAgZGVsZXRlIG9wdHMuY29sbGVjdGlvbjtcblxuICAgIHJldHVybiBvcHRzO1xuICB9XG59XG4iXX0=