"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheCleanModule = void 0;
const fs_1 = require("fs");
const command_module_1 = require("../../../command-builder/command-module");
const utilities_1 = require("../utilities");
class CacheCleanModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'clean';
        this.describe = 'Deletes persistent disk cache from disk.';
    }
    builder(localYargs) {
        return localYargs.strict();
    }
    run() {
        const { path } = (0, utilities_1.getCacheConfig)(this.context.workspace);
        return fs_1.promises.rm(path, {
            force: true,
            recursive: true,
            maxRetries: 3,
        });
    }
}
exports.CacheCleanModule = CacheCleanModule;
CacheCleanModule.scope = command_module_1.CommandScope.In;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NhY2hlL2NsZWFuL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwyQkFBb0M7QUFFcEMsNEVBSWlEO0FBQ2pELDRDQUE4QztBQUU5QyxNQUFhLGdCQUFpQixTQUFRLDhCQUFhO0lBQW5EOztRQUNFLFlBQU8sR0FBRyxPQUFPLENBQUM7UUFDbEIsYUFBUSxHQUFHLDBDQUEwQyxDQUFDO0lBaUJ4RCxDQUFDO0lBYkMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFFRCxHQUFHO1FBQ0QsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUEsMEJBQWMsRUFBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXhELE9BQU8sYUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUU7WUFDakIsS0FBSyxFQUFFLElBQUk7WUFDWCxTQUFTLEVBQUUsSUFBSTtZQUNmLFVBQVUsRUFBRSxDQUFDO1NBQ2QsQ0FBQyxDQUFDO0lBQ0wsQ0FBQzs7QUFsQkgsNENBbUJDO0FBZmlCLHNCQUFLLEdBQUcsNkJBQVksQ0FBQyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgcHJvbWlzZXMgYXMgZnMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBDb21tYW5kU2NvcGUsXG59IGZyb20gJy4uLy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBnZXRDYWNoZUNvbmZpZyB9IGZyb20gJy4uL3V0aWxpdGllcyc7XG5cbmV4cG9ydCBjbGFzcyBDYWNoZUNsZWFuTW9kdWxlIGV4dGVuZHMgQ29tbWFuZE1vZHVsZSBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbiB7XG4gIGNvbW1hbmQgPSAnY2xlYW4nO1xuICBkZXNjcmliZSA9ICdEZWxldGVzIHBlcnNpc3RlbnQgZGlzayBjYWNoZSBmcm9tIGRpc2suJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBzdGF0aWMgb3ZlcnJpZGUgc2NvcGUgPSBDb21tYW5kU2NvcGUuSW47XG5cbiAgYnVpbGRlcihsb2NhbFlhcmdzOiBBcmd2KTogQXJndiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3Muc3RyaWN0KCk7XG4gIH1cblxuICBydW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyBwYXRoIH0gPSBnZXRDYWNoZUNvbmZpZyh0aGlzLmNvbnRleHQud29ya3NwYWNlKTtcblxuICAgIHJldHVybiBmcy5ybShwYXRoLCB7XG4gICAgICBmb3JjZTogdHJ1ZSxcbiAgICAgIHJlY3Vyc2l2ZTogdHJ1ZSxcbiAgICAgIG1heFJldHJpZXM6IDMsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==