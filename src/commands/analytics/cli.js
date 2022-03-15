"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsCommandModule = void 0;
const command_module_1 = require("../../command-builder/command-module");
const command_1 = require("../../command-builder/utilities/command");
const cli_1 = require("./info/cli");
const cli_2 = require("./settings/cli");
class AnalyticsCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'analytics';
        this.describe = 'Configures the gathering of Angular CLI usage metrics. See https://angular.io/cli/usage-analytics-gathering';
    }
    builder(localYargs) {
        const subcommands = [
            cli_1.AnalyticsInfoCommandModule,
            cli_2.AnalyticsDisableModule,
            cli_2.AnalyticsEnableModule,
            cli_2.AnalyticsPromptModule,
        ].sort(); // sort by class name.
        for (const module of subcommands) {
            localYargs = (0, command_1.addCommandModuleToYargs)(localYargs, module, this.context);
        }
        return localYargs.demandCommand(1, command_1.demandCommandFailureMessage).strict();
    }
    run(_options) { }
}
exports.AnalyticsCommandModule = AnalyticsCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2FuYWx5dGljcy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gseUVBSThDO0FBQzlDLHFFQUdpRDtBQUNqRCxvQ0FBd0Q7QUFDeEQsd0NBSXdCO0FBRXhCLE1BQWEsc0JBQXVCLFNBQVEsOEJBQWE7SUFBekQ7O1FBQ0UsWUFBTyxHQUFHLFdBQVcsQ0FBQztRQUN0QixhQUFRLEdBQ04sNkdBQTZHLENBQUM7SUFtQmxILENBQUM7SUFoQkMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE1BQU0sV0FBVyxHQUFHO1lBQ2xCLGdDQUEwQjtZQUMxQiw0QkFBc0I7WUFDdEIsMkJBQXFCO1lBQ3JCLDJCQUFxQjtTQUN0QixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsc0JBQXNCO1FBRWhDLEtBQUssTUFBTSxNQUFNLElBQUksV0FBVyxFQUFFO1lBQ2hDLFVBQVUsR0FBRyxJQUFBLGlDQUF1QixFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ3hFO1FBRUQsT0FBTyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxxQ0FBMkIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzNFLENBQUM7SUFFRCxHQUFHLENBQUMsUUFBcUIsSUFBUyxDQUFDO0NBQ3BDO0FBdEJELHdEQXNCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBPcHRpb25zLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHtcbiAgYWRkQ29tbWFuZE1vZHVsZVRvWWFyZ3MsXG4gIGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL3V0aWxpdGllcy9jb21tYW5kJztcbmltcG9ydCB7IEFuYWx5dGljc0luZm9Db21tYW5kTW9kdWxlIH0gZnJvbSAnLi9pbmZvL2NsaSc7XG5pbXBvcnQge1xuICBBbmFseXRpY3NEaXNhYmxlTW9kdWxlLFxuICBBbmFseXRpY3NFbmFibGVNb2R1bGUsXG4gIEFuYWx5dGljc1Byb21wdE1vZHVsZSxcbn0gZnJvbSAnLi9zZXR0aW5ncy9jbGknO1xuXG5leHBvcnQgY2xhc3MgQW5hbHl0aWNzQ29tbWFuZE1vZHVsZSBleHRlbmRzIENvbW1hbmRNb2R1bGUgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24ge1xuICBjb21tYW5kID0gJ2FuYWx5dGljcyc7XG4gIGRlc2NyaWJlID1cbiAgICAnQ29uZmlndXJlcyB0aGUgZ2F0aGVyaW5nIG9mIEFuZ3VsYXIgQ0xJIHVzYWdlIG1ldHJpY3MuIFNlZSBodHRwczovL2FuZ3VsYXIuaW8vY2xpL3VzYWdlLWFuYWx5dGljcy1nYXRoZXJpbmcnO1xuICBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGJ1aWxkZXIobG9jYWxZYXJnczogQXJndik6IEFyZ3Yge1xuICAgIGNvbnN0IHN1YmNvbW1hbmRzID0gW1xuICAgICAgQW5hbHl0aWNzSW5mb0NvbW1hbmRNb2R1bGUsXG4gICAgICBBbmFseXRpY3NEaXNhYmxlTW9kdWxlLFxuICAgICAgQW5hbHl0aWNzRW5hYmxlTW9kdWxlLFxuICAgICAgQW5hbHl0aWNzUHJvbXB0TW9kdWxlLFxuICAgIF0uc29ydCgpOyAvLyBzb3J0IGJ5IGNsYXNzIG5hbWUuXG5cbiAgICBmb3IgKGNvbnN0IG1vZHVsZSBvZiBzdWJjb21tYW5kcykge1xuICAgICAgbG9jYWxZYXJncyA9IGFkZENvbW1hbmRNb2R1bGVUb1lhcmdzKGxvY2FsWWFyZ3MsIG1vZHVsZSwgdGhpcy5jb250ZXh0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbG9jYWxZYXJncy5kZW1hbmRDb21tYW5kKDEsIGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSkuc3RyaWN0KCk7XG4gIH1cblxuICBydW4oX29wdGlvbnM6IE9wdGlvbnM8e30+KTogdm9pZCB7fVxufVxuIl19