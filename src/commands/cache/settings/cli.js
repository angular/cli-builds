"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheEnableModule = exports.CacheDisableModule = void 0;
const command_module_1 = require("../../../command-builder/command-module");
const utilities_1 = require("../utilities");
class CacheDisableModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'disable';
        this.aliases = 'off';
        this.describe = 'Disables persistent disk cache for all projects in the workspace.';
    }
    builder(localYargs) {
        return localYargs;
    }
    run() {
        return (0, utilities_1.updateCacheConfig)(this.getWorkspaceOrThrow(), 'enabled', false);
    }
}
exports.CacheDisableModule = CacheDisableModule;
CacheDisableModule.scope = command_module_1.CommandScope.In;
class CacheEnableModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'enable';
        this.aliases = 'on';
        this.describe = 'Enables disk cache for all projects in the workspace.';
    }
    builder(localYargs) {
        return localYargs;
    }
    run() {
        return (0, utilities_1.updateCacheConfig)(this.getWorkspaceOrThrow(), 'enabled', true);
    }
}
exports.CacheEnableModule = CacheEnableModule;
CacheEnableModule.scope = command_module_1.CommandScope.In;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NhY2hlL3NldHRpbmdzL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFHSCw0RUFJaUQ7QUFDakQsNENBQWlEO0FBRWpELE1BQWEsa0JBQW1CLFNBQVEsOEJBQWE7SUFBckQ7O1FBQ0UsWUFBTyxHQUFHLFNBQVMsQ0FBQztRQUNwQixZQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ2hCLGFBQVEsR0FBRyxtRUFBbUUsQ0FBQztJQVdqRixDQUFDO0lBUEMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxHQUFHO1FBQ0QsT0FBTyxJQUFBLDZCQUFpQixFQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN6RSxDQUFDOztBQWJILGdEQWNDO0FBVGlCLHdCQUFLLEdBQUcsNkJBQVksQ0FBQyxFQUFFLENBQUM7QUFXMUMsTUFBYSxpQkFBa0IsU0FBUSw4QkFBYTtJQUFwRDs7UUFDRSxZQUFPLEdBQUcsUUFBUSxDQUFDO1FBQ25CLFlBQU8sR0FBRyxJQUFJLENBQUM7UUFDZixhQUFRLEdBQUcsdURBQXVELENBQUM7SUFXckUsQ0FBQztJQVBDLE9BQU8sQ0FBQyxVQUFnQjtRQUN0QixPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBRUQsR0FBRztRQUNELE9BQU8sSUFBQSw2QkFBaUIsRUFBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDeEUsQ0FBQzs7QUFiSCw4Q0FjQztBQVRpQix1QkFBSyxHQUFHLDZCQUFZLENBQUMsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIENvbW1hbmRTY29wZSxcbn0gZnJvbSAnLi4vLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IHVwZGF0ZUNhY2hlQ29uZmlnIH0gZnJvbSAnLi4vdXRpbGl0aWVzJztcblxuZXhwb3J0IGNsYXNzIENhY2hlRGlzYWJsZU1vZHVsZSBleHRlbmRzIENvbW1hbmRNb2R1bGUgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24ge1xuICBjb21tYW5kID0gJ2Rpc2FibGUnO1xuICBhbGlhc2VzID0gJ29mZic7XG4gIGRlc2NyaWJlID0gJ0Rpc2FibGVzIHBlcnNpc3RlbnQgZGlzayBjYWNoZSBmb3IgYWxsIHByb2plY3RzIGluIHRoZSB3b3Jrc3BhY2UuJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBzdGF0aWMgb3ZlcnJpZGUgc2NvcGUgPSBDb21tYW5kU2NvcGUuSW47XG5cbiAgYnVpbGRlcihsb2NhbFlhcmdzOiBBcmd2KTogQXJndiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gIH1cblxuICBydW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHVwZGF0ZUNhY2hlQ29uZmlnKHRoaXMuZ2V0V29ya3NwYWNlT3JUaHJvdygpLCAnZW5hYmxlZCcsIGZhbHNlKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2FjaGVFbmFibGVNb2R1bGUgZXh0ZW5kcyBDb21tYW5kTW9kdWxlIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uIHtcbiAgY29tbWFuZCA9ICdlbmFibGUnO1xuICBhbGlhc2VzID0gJ29uJztcbiAgZGVzY3JpYmUgPSAnRW5hYmxlcyBkaXNrIGNhY2hlIGZvciBhbGwgcHJvamVjdHMgaW4gdGhlIHdvcmtzcGFjZS4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHN0YXRpYyBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5JbjtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2IHtcbiAgICByZXR1cm4gbG9jYWxZYXJncztcbiAgfVxuXG4gIHJ1bigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gdXBkYXRlQ2FjaGVDb25maWcodGhpcy5nZXRXb3Jrc3BhY2VPclRocm93KCksICdlbmFibGVkJywgdHJ1ZSk7XG4gIH1cbn1cbiJdfQ==