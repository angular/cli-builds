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
        (0, utilities_1.updateCacheConfig)('enabled', false);
    }
}
exports.CacheDisableModule = CacheDisableModule;
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
        (0, utilities_1.updateCacheConfig)('enabled', true);
    }
}
exports.CacheEnableModule = CacheEnableModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NhY2hlL3NldHRpbmdzL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFHSCw0RUFJaUQ7QUFDakQsNENBQWlEO0FBRWpELE1BQWEsa0JBQW1CLFNBQVEsOEJBQWE7SUFBckQ7O1FBQ0UsWUFBTyxHQUFHLFNBQVMsQ0FBQztRQUNwQixZQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ2hCLGFBQVEsR0FBRyxtRUFBbUUsQ0FBQztJQVdqRixDQUFDO0lBUEMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxHQUFHO1FBQ0QsSUFBQSw2QkFBaUIsRUFBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdEMsQ0FBQztDQUNGO0FBZEQsZ0RBY0M7QUFFRCxNQUFhLGlCQUFrQixTQUFRLDhCQUFhO0lBQXBEOztRQUNFLFlBQU8sR0FBRyxRQUFRLENBQUM7UUFDbkIsWUFBTyxHQUFHLElBQUksQ0FBQztRQUNmLGFBQVEsR0FBRyx1REFBdUQsQ0FBQztJQVdyRSxDQUFDO0lBUEMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxHQUFHO1FBQ0QsSUFBQSw2QkFBaUIsRUFBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDckMsQ0FBQztDQUNGO0FBZEQsOENBY0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGUsXG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgQ29tbWFuZFNjb3BlLFxufSBmcm9tICcuLi8uLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgdXBkYXRlQ2FjaGVDb25maWcgfSBmcm9tICcuLi91dGlsaXRpZXMnO1xuXG5leHBvcnQgY2xhc3MgQ2FjaGVEaXNhYmxlTW9kdWxlIGV4dGVuZHMgQ29tbWFuZE1vZHVsZSBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbiB7XG4gIGNvbW1hbmQgPSAnZGlzYWJsZSc7XG4gIGFsaWFzZXMgPSAnb2ZmJztcbiAgZGVzY3JpYmUgPSAnRGlzYWJsZXMgcGVyc2lzdGVudCBkaXNrIGNhY2hlIGZvciBhbGwgcHJvamVjdHMgaW4gdGhlIHdvcmtzcGFjZS4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHN0YXRpYyBvdmVycmlkZSBzY29wZTogQ29tbWFuZFNjb3BlLkluO1xuXG4gIGJ1aWxkZXIobG9jYWxZYXJnczogQXJndik6IEFyZ3Yge1xuICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICB9XG5cbiAgcnVuKCk6IHZvaWQge1xuICAgIHVwZGF0ZUNhY2hlQ29uZmlnKCdlbmFibGVkJywgZmFsc2UpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDYWNoZUVuYWJsZU1vZHVsZSBleHRlbmRzIENvbW1hbmRNb2R1bGUgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24ge1xuICBjb21tYW5kID0gJ2VuYWJsZSc7XG4gIGFsaWFzZXMgPSAnb24nO1xuICBkZXNjcmliZSA9ICdFbmFibGVzIGRpc2sgY2FjaGUgZm9yIGFsbCBwcm9qZWN0cyBpbiB0aGUgd29ya3NwYWNlLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgc3RhdGljIG92ZXJyaWRlIHNjb3BlOiBDb21tYW5kU2NvcGUuSW47XG5cbiAgYnVpbGRlcihsb2NhbFlhcmdzOiBBcmd2KTogQXJndiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gIH1cblxuICBydW4oKTogdm9pZCB7XG4gICAgdXBkYXRlQ2FjaGVDb25maWcoJ2VuYWJsZWQnLCB0cnVlKTtcbiAgfVxufVxuIl19