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
        if (this.initialized) {
            return Promise.resolve();
        }
        super.initialize(options);
        this.initialized = true;
        const collectionName = this.parseCollectionName(options);
        return this.getOptions({
            schematicName: this.schematicName,
            collectionName,
        })
            .then((schematicOptions) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3LmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9uZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUVILGlEQUFpRDtBQUNqRCwrQ0FBeUQ7QUFDekQsbUVBQStEO0FBQy9ELGdEQUFvRTtBQUdwRSxnQkFBZ0MsU0FBUSxvQ0FBZ0I7SUFBeEQ7O1FBQ2tCLFNBQUksR0FBRyxLQUFLLENBQUM7UUFDYixnQkFBVyxHQUN6QixnREFBZ0QsQ0FBQztRQUU1QyxVQUFLLEdBQUcsc0JBQVksQ0FBQyxjQUFjLENBQUM7UUFDM0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDO1FBQ3RDLGNBQVMsR0FBYSxFQUFFLENBQUM7UUFDekIsWUFBTyxHQUFhO1lBQ3pCLEdBQUcsSUFBSSxDQUFDLFdBQVc7WUFDbkI7Z0JBQ0UsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO2dCQUNkLFdBQVcsRUFBRSxzQ0FBc0M7YUFDcEQ7WUFDRDtnQkFDRSxJQUFJLEVBQUUsWUFBWTtnQkFDbEIsSUFBSSxFQUFFLE1BQU07Z0JBQ1osT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO2dCQUNkLFdBQVcsRUFBRSwrQkFBK0I7YUFDN0M7U0FDRixDQUFDO1FBQ00sa0JBQWEsR0FBRyxRQUFRLENBQUM7UUFFekIsZ0JBQVcsR0FBRyxLQUFLLENBQUM7SUFnRTlCLENBQUM7SUEvRFEsVUFBVSxDQUFDLE9BQVk7UUFDNUIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzQixDQUFDO1FBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUV4QixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFekQsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDbkIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2pDLGNBQWM7U0FDZixDQUFDO2FBQ0QsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsRUFBRTtZQUN6QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzdELE1BQU0sSUFBSSxHQUFHLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQyxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFWSxHQUFHLENBQUMsT0FBWTs7WUFDM0IsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ25CLE9BQU8sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ3pCLENBQUM7WUFFRCxJQUFJLGNBQXNCLENBQUM7WUFDM0IsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLGNBQWMsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO1lBQ3RDLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTixjQUFjLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELENBQUM7WUFFRCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUMvQyxPQUFPLENBQUMsT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUM7WUFFdEMsc0NBQXNDO1lBQ3RDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztZQUUxRSxPQUFPLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRTNDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO2dCQUN2QixjQUFjLEVBQUUsY0FBYztnQkFDOUIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO2dCQUNqQyxnQkFBZ0IsRUFBRSxPQUFPO2dCQUN6QixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7Z0JBQ3BCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtnQkFDdEIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO2FBQ3JCLENBQUMsQ0FBQztRQUNMLENBQUM7S0FBQTtJQUVPLG1CQUFtQixDQUFDLE9BQVk7UUFDdEMsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFVBQVUsSUFBSSxPQUFPLENBQUMsQ0FBQyxJQUFJLHNDQUE2QixFQUFFLENBQUM7UUFFMUYsTUFBTSxDQUFDLGNBQWMsQ0FBQztJQUN4QixDQUFDO0lBRU8sa0JBQWtCLENBQUMsT0FBWTtRQUNyQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDcEIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBRXZCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDOztBQXJGYSxrQkFBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFKaEMsNkJBMEZDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgbm8tYW55XG5pbXBvcnQgeyBDb21tYW5kU2NvcGUsIE9wdGlvbiB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcbmltcG9ydCB7IFNjaGVtYXRpY0NvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvc2NoZW1hdGljLWNvbW1hbmQnO1xuaW1wb3J0IHsgZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24gfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBOZXdDb21tYW5kIGV4dGVuZHMgU2NoZW1hdGljQ29tbWFuZCB7XG4gIHB1YmxpYyByZWFkb25seSBuYW1lID0gJ25ldyc7XG4gIHB1YmxpYyByZWFkb25seSBkZXNjcmlwdGlvbiA9XG4gICAgJ0NyZWF0ZXMgYSBuZXcgZGlyZWN0b3J5IGFuZCBhIG5ldyBBbmd1bGFyIGFwcC4nO1xuICBwdWJsaWMgc3RhdGljIGFsaWFzZXMgPSBbJ24nXTtcbiAgcHVibGljIHNjb3BlID0gQ29tbWFuZFNjb3BlLm91dHNpZGVQcm9qZWN0O1xuICBwdWJsaWMgcmVhZG9ubHkgYWxsb3dNaXNzaW5nV29ya3NwYWNlID0gdHJ1ZTtcbiAgcHVibGljIGFyZ3VtZW50czogc3RyaW5nW10gPSBbXTtcbiAgcHVibGljIG9wdGlvbnM6IE9wdGlvbltdID0gW1xuICAgIC4uLnRoaXMuY29yZU9wdGlvbnMsXG4gICAge1xuICAgICAgbmFtZTogJ3ZlcmJvc2UnLFxuICAgICAgdHlwZTogQm9vbGVhbixcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgYWxpYXNlczogWyd2J10sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FkZHMgbW9yZSBkZXRhaWxzIHRvIG91dHB1dCBsb2dnaW5nLicsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiAnY29sbGVjdGlvbicsXG4gICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICBhbGlhc2VzOiBbJ2MnXSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2NoZW1hdGljcyBjb2xsZWN0aW9uIHRvIHVzZS4nLFxuICAgIH0sXG4gIF07XG4gIHByaXZhdGUgc2NoZW1hdGljTmFtZSA9ICduZy1uZXcnO1xuXG4gIHByaXZhdGUgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgcHVibGljIGluaXRpYWxpemUob3B0aW9uczogYW55KSB7XG4gICAgaWYgKHRoaXMuaW5pdGlhbGl6ZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG4gICAgc3VwZXIuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gdGhpcy5wYXJzZUNvbGxlY3Rpb25OYW1lKG9wdGlvbnMpO1xuXG4gICAgcmV0dXJuIHRoaXMuZ2V0T3B0aW9ucyh7XG4gICAgICAgIHNjaGVtYXRpY05hbWU6IHRoaXMuc2NoZW1hdGljTmFtZSxcbiAgICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICB9KVxuICAgICAgLnRoZW4oKHNjaGVtYXRpY09wdGlvbnMpID0+IHtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gdGhpcy5vcHRpb25zLmNvbmNhdChzY2hlbWF0aWNPcHRpb25zLm9wdGlvbnMpO1xuICAgICAgICBjb25zdCBhcmdzID0gc2NoZW1hdGljT3B0aW9ucy5hcmd1bWVudHMubWFwKGFyZyA9PiBhcmcubmFtZSk7XG4gICAgICAgIHRoaXMuYXJndW1lbnRzID0gdGhpcy5hcmd1bWVudHMuY29uY2F0KGFyZ3MpO1xuICAgICAgfSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IGFueSkge1xuICAgIGlmIChvcHRpb25zLmRyeVJ1bikge1xuICAgICAgb3B0aW9ucy5za2lwR2l0ID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBsZXQgY29sbGVjdGlvbk5hbWU6IHN0cmluZztcbiAgICBpZiAob3B0aW9ucy5jb2xsZWN0aW9uKSB7XG4gICAgICBjb2xsZWN0aW9uTmFtZSA9IG9wdGlvbnMuY29sbGVjdGlvbjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29sbGVjdGlvbk5hbWUgPSB0aGlzLnBhcnNlQ29sbGVjdGlvbk5hbWUob3B0aW9ucyk7XG4gICAgfVxuXG4gICAgY29uc3QgcGFja2FnZUpzb24gPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKTtcbiAgICBvcHRpb25zLnZlcnNpb24gPSBwYWNrYWdlSnNvbi52ZXJzaW9uO1xuXG4gICAgLy8gRW5zdXJlIHNraXBHaXQgaGFzIGEgYm9vbGVhbiB2YWx1ZS5cbiAgICBvcHRpb25zLnNraXBHaXQgPSBvcHRpb25zLnNraXBHaXQgPT09IHVuZGVmaW5lZCA/IGZhbHNlIDogb3B0aW9ucy5za2lwR2l0O1xuXG4gICAgb3B0aW9ucyA9IHRoaXMucmVtb3ZlTG9jYWxPcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgcmV0dXJuIHRoaXMucnVuU2NoZW1hdGljKHtcbiAgICAgIGNvbGxlY3Rpb25OYW1lOiBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWU6IHRoaXMuc2NoZW1hdGljTmFtZSxcbiAgICAgIHNjaGVtYXRpY09wdGlvbnM6IG9wdGlvbnMsXG4gICAgICBkZWJ1Zzogb3B0aW9ucy5kZWJ1ZyxcbiAgICAgIGRyeVJ1bjogb3B0aW9ucy5kcnlSdW4sXG4gICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VDb2xsZWN0aW9uTmFtZShvcHRpb25zOiBhbnkpOiBzdHJpbmcge1xuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gb3B0aW9ucy5jb2xsZWN0aW9uIHx8IG9wdGlvbnMuYyB8fCBnZXREZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbigpO1xuXG4gICAgcmV0dXJuIGNvbGxlY3Rpb25OYW1lO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVMb2NhbE9wdGlvbnMob3B0aW9uczogYW55KTogYW55IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyk7XG4gICAgZGVsZXRlIG9wdHMudmVyYm9zZTtcbiAgICBkZWxldGUgb3B0cy5jb2xsZWN0aW9uO1xuXG4gICAgcmV0dXJuIG9wdHM7XG4gIH1cbn1cbiJdfQ==