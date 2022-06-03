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
CacheCommandModule.scope = command_module_1.CommandScope.In;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NhY2hlL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwrQkFBNEI7QUFFNUIseUVBSzhDO0FBQzlDLHFFQUdpRDtBQUNqRCxxQ0FBK0M7QUFDL0Msb0NBQW9EO0FBQ3BELHdDQUF1RTtBQUV2RSxNQUFhLGtCQUFtQixTQUFRLDhCQUFhO0lBQXJEOztRQUNFLFlBQU8sR0FBRyxPQUFPLENBQUM7UUFDbEIsYUFBUSxHQUFHLGdFQUFnRSxDQUFDO1FBQzVFLHdCQUFtQixHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBbUIvRCxDQUFDO0lBaEJDLE9BQU8sQ0FBQyxVQUFnQjtRQUN0QixNQUFNLFdBQVcsR0FBRztZQUNsQix1QkFBaUI7WUFDakIsd0JBQWtCO1lBQ2xCLHNCQUFnQjtZQUNoQiw0QkFBc0I7U0FDdkIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVULEtBQUssTUFBTSxNQUFNLElBQUksV0FBVyxFQUFFO1lBQ2hDLFVBQVUsR0FBRyxJQUFBLGlDQUF1QixFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ3hFO1FBRUQsT0FBTyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxxQ0FBMkIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzNFLENBQUM7SUFFRCxHQUFHLENBQUMsUUFBcUIsSUFBUyxDQUFDOztBQXJCckMsZ0RBc0JDO0FBbEJpQix3QkFBSyxHQUFHLDZCQUFZLENBQUMsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIENvbW1hbmRTY29wZSxcbiAgT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7XG4gIGFkZENvbW1hbmRNb2R1bGVUb1lhcmdzLFxuICBkZW1hbmRDb21tYW5kRmFpbHVyZU1lc3NhZ2UsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvY29tbWFuZCc7XG5pbXBvcnQgeyBDYWNoZUNsZWFuTW9kdWxlIH0gZnJvbSAnLi9jbGVhbi9jbGknO1xuaW1wb3J0IHsgQ2FjaGVJbmZvQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4vaW5mby9jbGknO1xuaW1wb3J0IHsgQ2FjaGVEaXNhYmxlTW9kdWxlLCBDYWNoZUVuYWJsZU1vZHVsZSB9IGZyb20gJy4vc2V0dGluZ3MvY2xpJztcblxuZXhwb3J0IGNsYXNzIENhY2hlQ29tbWFuZE1vZHVsZSBleHRlbmRzIENvbW1hbmRNb2R1bGUgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24ge1xuICBjb21tYW5kID0gJ2NhY2hlJztcbiAgZGVzY3JpYmUgPSAnQ29uZmlndXJlIHBlcnNpc3RlbnQgZGlzayBjYWNoZSBhbmQgcmV0cmlldmUgY2FjaGUgc3RhdGlzdGljcy4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoID0gam9pbihfX2Rpcm5hbWUsICdsb25nLWRlc2NyaXB0aW9uLm1kJyk7XG4gIHN0YXRpYyBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5JbjtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2IHtcbiAgICBjb25zdCBzdWJjb21tYW5kcyA9IFtcbiAgICAgIENhY2hlRW5hYmxlTW9kdWxlLFxuICAgICAgQ2FjaGVEaXNhYmxlTW9kdWxlLFxuICAgICAgQ2FjaGVDbGVhbk1vZHVsZSxcbiAgICAgIENhY2hlSW5mb0NvbW1hbmRNb2R1bGUsXG4gICAgXS5zb3J0KCk7XG5cbiAgICBmb3IgKGNvbnN0IG1vZHVsZSBvZiBzdWJjb21tYW5kcykge1xuICAgICAgbG9jYWxZYXJncyA9IGFkZENvbW1hbmRNb2R1bGVUb1lhcmdzKGxvY2FsWWFyZ3MsIG1vZHVsZSwgdGhpcy5jb250ZXh0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbG9jYWxZYXJncy5kZW1hbmRDb21tYW5kKDEsIGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSkuc3RyaWN0KCk7XG4gIH1cblxuICBydW4oX29wdGlvbnM6IE9wdGlvbnM8e30+KTogdm9pZCB7fVxufVxuIl19