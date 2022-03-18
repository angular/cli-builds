"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheCommandModule = void 0;
const path_1 = require("path");
const command_module_1 = require("../../command-builder/command-module");
const command_1 = require("../../command-builder/utilities/command");
const cli_1 = require("./clean/cli");
const cli_2 = require("./info/cli");
const cli_3 = require("./settings/cli");
class CacheCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'cache';
        this.describe = 'Configure persistent disk cache and retrieve cache statistics.';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
    }
    builder(localYargs) {
        const subcommands = [
            cli_3.CacheEnableModule,
            cli_3.CacheDisableModule,
            cli_1.CacheCleanModule,
            cli_2.CacheInfoCommandModule,
        ].sort();
        for (const module of subcommands) {
            localYargs = (0, command_1.addCommandModuleToYargs)(localYargs, module, this.context);
        }
        return localYargs.demandCommand(1, command_1.demandCommandFailureMessage).strict();
    }
    run(_options) { }
}
exports.CacheCommandModule = CacheCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NhY2hlL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwrQkFBNEI7QUFFNUIseUVBSzhDO0FBQzlDLHFFQUdpRDtBQUNqRCxxQ0FBK0M7QUFDL0Msb0NBQW9EO0FBQ3BELHdDQUF1RTtBQUV2RSxNQUFhLGtCQUFtQixTQUFRLDhCQUFhO0lBQXJEOztRQUNFLFlBQU8sR0FBRyxPQUFPLENBQUM7UUFDbEIsYUFBUSxHQUFHLGdFQUFnRSxDQUFDO1FBQzVFLHdCQUFtQixHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBbUIvRCxDQUFDO0lBaEJDLE9BQU8sQ0FBQyxVQUFnQjtRQUN0QixNQUFNLFdBQVcsR0FBRztZQUNsQix1QkFBaUI7WUFDakIsd0JBQWtCO1lBQ2xCLHNCQUFnQjtZQUNoQiw0QkFBc0I7U0FDdkIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVULEtBQUssTUFBTSxNQUFNLElBQUksV0FBVyxFQUFFO1lBQ2hDLFVBQVUsR0FBRyxJQUFBLGlDQUF1QixFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ3hFO1FBRUQsT0FBTyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxxQ0FBMkIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzNFLENBQUM7SUFFRCxHQUFHLENBQUMsUUFBcUIsSUFBUyxDQUFDO0NBQ3BDO0FBdEJELGdEQXNCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQge1xuICBhZGRDb21tYW5kTW9kdWxlVG9ZYXJncyxcbiAgZGVtYW5kQ29tbWFuZEZhaWx1cmVNZXNzYWdlLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvdXRpbGl0aWVzL2NvbW1hbmQnO1xuaW1wb3J0IHsgQ2FjaGVDbGVhbk1vZHVsZSB9IGZyb20gJy4vY2xlYW4vY2xpJztcbmltcG9ydCB7IENhY2hlSW5mb0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuL2luZm8vY2xpJztcbmltcG9ydCB7IENhY2hlRGlzYWJsZU1vZHVsZSwgQ2FjaGVFbmFibGVNb2R1bGUgfSBmcm9tICcuL3NldHRpbmdzL2NsaSc7XG5cbmV4cG9ydCBjbGFzcyBDYWNoZUNvbW1hbmRNb2R1bGUgZXh0ZW5kcyBDb21tYW5kTW9kdWxlIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uIHtcbiAgY29tbWFuZCA9ICdjYWNoZSc7XG4gIGRlc2NyaWJlID0gJ0NvbmZpZ3VyZSBwZXJzaXN0ZW50IGRpc2sgY2FjaGUgYW5kIHJldHJpZXZlIGNhY2hlIHN0YXRpc3RpY3MuJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnbG9uZy1kZXNjcmlwdGlvbi5tZCcpO1xuICBzdGF0aWMgb3ZlcnJpZGUgc2NvcGU6IENvbW1hbmRTY29wZS5JbjtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2IHtcbiAgICBjb25zdCBzdWJjb21tYW5kcyA9IFtcbiAgICAgIENhY2hlRW5hYmxlTW9kdWxlLFxuICAgICAgQ2FjaGVEaXNhYmxlTW9kdWxlLFxuICAgICAgQ2FjaGVDbGVhbk1vZHVsZSxcbiAgICAgIENhY2hlSW5mb0NvbW1hbmRNb2R1bGUsXG4gICAgXS5zb3J0KCk7XG5cbiAgICBmb3IgKGNvbnN0IG1vZHVsZSBvZiBzdWJjb21tYW5kcykge1xuICAgICAgbG9jYWxZYXJncyA9IGFkZENvbW1hbmRNb2R1bGVUb1lhcmdzKGxvY2FsWWFyZ3MsIG1vZHVsZSwgdGhpcy5jb250ZXh0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbG9jYWxZYXJncy5kZW1hbmRDb21tYW5kKDEsIGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSkuc3RyaWN0KCk7XG4gIH1cblxuICBydW4oX29wdGlvbnM6IE9wdGlvbnM8e30+KTogdm9pZCB7fVxufVxuIl19