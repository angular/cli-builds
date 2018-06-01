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
            const pathOptions = this.setPathOptions(options, '/');
            options = Object.assign({}, options, pathOptions);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3LmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9uZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLDZEQUE2RDtBQUM3RCwrQ0FBeUQ7QUFDekQsbUVBQStEO0FBQy9ELGdEQUFvRTtBQUdwRSxnQkFBZ0MsU0FBUSxvQ0FBZ0I7SUFBeEQ7O1FBQ2tCLFNBQUksR0FBRyxLQUFLLENBQUM7UUFDYixnQkFBVyxHQUN6QixnREFBZ0QsQ0FBQztRQUU1QyxVQUFLLEdBQUcsc0JBQVksQ0FBQyxjQUFjLENBQUM7UUFDM0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDO1FBQ3RDLGNBQVMsR0FBYSxFQUFFLENBQUM7UUFDekIsWUFBTyxHQUFhO1lBQ3pCLEdBQUcsSUFBSSxDQUFDLFdBQVc7WUFDbkI7Z0JBQ0UsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO2dCQUNkLFdBQVcsRUFBRSxzQ0FBc0M7YUFDcEQ7WUFDRDtnQkFDRSxJQUFJLEVBQUUsWUFBWTtnQkFDbEIsSUFBSSxFQUFFLE1BQU07Z0JBQ1osT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO2dCQUNkLFdBQVcsRUFBRSwrQkFBK0I7YUFDN0M7U0FDRixDQUFDO1FBQ00sa0JBQWEsR0FBRyxRQUFRLENBQUM7UUFFekIsZ0JBQVcsR0FBRyxLQUFLLENBQUM7SUFtRTlCLENBQUM7SUFsRVEsVUFBVSxDQUFDLE9BQVk7UUFDNUIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzQixDQUFDO1FBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMsV0FBVyxH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c0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tZ2xvYmFsLXRzbGludC1kaXNhYmxlIG5vLWFueSBmaWxlLWhlYWRlclxuaW1wb3J0IHsgQ29tbWFuZFNjb3BlLCBPcHRpb24gfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBTY2hlbWF0aWNDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL3NjaGVtYXRpYy1jb21tYW5kJztcbmltcG9ydCB7IGdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTmV3Q29tbWFuZCBleHRlbmRzIFNjaGVtYXRpY0NvbW1hbmQge1xuICBwdWJsaWMgcmVhZG9ubHkgbmFtZSA9ICduZXcnO1xuICBwdWJsaWMgcmVhZG9ubHkgZGVzY3JpcHRpb24gPVxuICAgICdDcmVhdGVzIGEgbmV3IGRpcmVjdG9yeSBhbmQgYSBuZXcgQW5ndWxhciBhcHAuJztcbiAgcHVibGljIHN0YXRpYyBhbGlhc2VzID0gWyduJ107XG4gIHB1YmxpYyBzY29wZSA9IENvbW1hbmRTY29wZS5vdXRzaWRlUHJvamVjdDtcbiAgcHVibGljIHJlYWRvbmx5IGFsbG93TWlzc2luZ1dvcmtzcGFjZSA9IHRydWU7XG4gIHB1YmxpYyBhcmd1bWVudHM6IHN0cmluZ1tdID0gW107XG4gIHB1YmxpYyBvcHRpb25zOiBPcHRpb25bXSA9IFtcbiAgICAuLi50aGlzLmNvcmVPcHRpb25zLFxuICAgIHtcbiAgICAgIG5hbWU6ICd2ZXJib3NlJyxcbiAgICAgIHR5cGU6IEJvb2xlYW4sXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGFsaWFzZXM6IFsndiddLFxuICAgICAgZGVzY3JpcHRpb246ICdBZGRzIG1vcmUgZGV0YWlscyB0byBvdXRwdXQgbG9nZ2luZy4nLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogJ2NvbGxlY3Rpb24nLFxuICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgYWxpYXNlczogWydjJ10sXG4gICAgICBkZXNjcmlwdGlvbjogJ1NjaGVtYXRpY3MgY29sbGVjdGlvbiB0byB1c2UuJyxcbiAgICB9LFxuICBdO1xuICBwcml2YXRlIHNjaGVtYXRpY05hbWUgPSAnbmctbmV3JztcblxuICBwcml2YXRlIGluaXRpYWxpemVkID0gZmFsc2U7XG4gIHB1YmxpYyBpbml0aWFsaXplKG9wdGlvbnM6IGFueSkge1xuICAgIGlmICh0aGlzLmluaXRpYWxpemVkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuICAgIHN1cGVyLmluaXRpYWxpemUob3B0aW9ucyk7XG4gICAgdGhpcy5pbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IHRoaXMucGFyc2VDb2xsZWN0aW9uTmFtZShvcHRpb25zKTtcblxuICAgIHJldHVybiB0aGlzLmdldE9wdGlvbnMoe1xuICAgICAgICBzY2hlbWF0aWNOYW1lOiB0aGlzLnNjaGVtYXRpY05hbWUsXG4gICAgICAgIGNvbGxlY3Rpb25OYW1lLFxuICAgICAgfSlcbiAgICAgIC50aGVuKChzY2hlbWF0aWNPcHRpb25zKSA9PiB7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHRoaXMub3B0aW9ucy5jb25jYXQoc2NoZW1hdGljT3B0aW9ucy5vcHRpb25zKTtcbiAgICAgICAgY29uc3QgYXJncyA9IHNjaGVtYXRpY09wdGlvbnMuYXJndW1lbnRzLm1hcChhcmcgPT4gYXJnLm5hbWUpO1xuICAgICAgICB0aGlzLmFyZ3VtZW50cyA9IHRoaXMuYXJndW1lbnRzLmNvbmNhdChhcmdzKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHJ1bihvcHRpb25zOiBhbnkpIHtcbiAgICBpZiAob3B0aW9ucy5kcnlSdW4pIHtcbiAgICAgIG9wdGlvbnMuc2tpcEdpdCA9IHRydWU7XG4gICAgfVxuXG4gICAgbGV0IGNvbGxlY3Rpb25OYW1lOiBzdHJpbmc7XG4gICAgaWYgKG9wdGlvbnMuY29sbGVjdGlvbikge1xuICAgICAgY29sbGVjdGlvbk5hbWUgPSBvcHRpb25zLmNvbGxlY3Rpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbGxlY3Rpb25OYW1lID0gdGhpcy5wYXJzZUNvbGxlY3Rpb25OYW1lKG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGNvbnN0IHBhdGhPcHRpb25zID0gdGhpcy5zZXRQYXRoT3B0aW9ucyhvcHRpb25zLCAnLycpO1xuICAgIG9wdGlvbnMgPSB7IC4uLm9wdGlvbnMsIC4uLnBhdGhPcHRpb25zIH07XG5cbiAgICBjb25zdCBwYWNrYWdlSnNvbiA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpO1xuICAgIG9wdGlvbnMudmVyc2lvbiA9IHBhY2thZ2VKc29uLnZlcnNpb247XG5cbiAgICAvLyBFbnN1cmUgc2tpcEdpdCBoYXMgYSBib29sZWFuIHZhbHVlLlxuICAgIG9wdGlvbnMuc2tpcEdpdCA9IG9wdGlvbnMuc2tpcEdpdCA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBvcHRpb25zLnNraXBHaXQ7XG5cbiAgICBvcHRpb25zID0gdGhpcy5yZW1vdmVMb2NhbE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICByZXR1cm4gdGhpcy5ydW5TY2hlbWF0aWMoe1xuICAgICAgY29sbGVjdGlvbk5hbWU6IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgc2NoZW1hdGljTmFtZTogdGhpcy5zY2hlbWF0aWNOYW1lLFxuICAgICAgc2NoZW1hdGljT3B0aW9uczogb3B0aW9ucyxcbiAgICAgIGRlYnVnOiBvcHRpb25zLmRlYnVnLFxuICAgICAgZHJ5UnVuOiBvcHRpb25zLmRyeVJ1bixcbiAgICAgIGZvcmNlOiBvcHRpb25zLmZvcmNlLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUNvbGxlY3Rpb25OYW1lKG9wdGlvbnM6IGFueSk6IHN0cmluZyB7XG4gICAgY29uc3QgY29sbGVjdGlvbk5hbWUgPSBvcHRpb25zLmNvbGxlY3Rpb24gfHwgb3B0aW9ucy5jIHx8IGdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCk7XG5cbiAgICByZXR1cm4gY29sbGVjdGlvbk5hbWU7XG4gIH1cblxuICBwcml2YXRlIHJlbW92ZUxvY2FsT3B0aW9ucyhvcHRpb25zOiBhbnkpOiBhbnkge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKTtcbiAgICBkZWxldGUgb3B0cy52ZXJib3NlO1xuICAgIGRlbGV0ZSBvcHRzLmNvbGxlY3Rpb247XG5cbiAgICByZXR1cm4gb3B0cztcbiAgfVxufVxuIl19