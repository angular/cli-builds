"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsInfoCommandModule = void 0;
const analytics_1 = require("../../../analytics/analytics");
const command_module_1 = require("../../../command-builder/command-module");
class AnalyticsInfoCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'info';
        this.describe = 'Prints analytics gathering and reporting configuration in the console.';
    }
    builder(localYargs) {
        return localYargs.strict();
    }
    async run(_options) {
        this.context.logger.info(await (0, analytics_1.getAnalyticsInfoString)());
    }
}
exports.AnalyticsInfoCommandModule = AnalyticsInfoCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2FuYWx5dGljcy9pbmZvL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFHSCw0REFBc0U7QUFDdEUsNEVBSWlEO0FBRWpELE1BQWEsMEJBQ1gsU0FBUSw4QkFBYTtJQUR2Qjs7UUFJRSxZQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ2pCLGFBQVEsR0FBRyx3RUFBd0UsQ0FBQztJQVV0RixDQUFDO0lBUEMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQXFCO1FBQzdCLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUEsa0NBQXNCLEdBQUUsQ0FBQyxDQUFDO0lBQzNELENBQUM7Q0FDRjtBQWZELGdFQWVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBnZXRBbmFseXRpY3NJbmZvU3RyaW5nIH0gZnJvbSAnLi4vLi4vLi4vYW5hbHl0aWNzL2FuYWx5dGljcyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIE9wdGlvbnMsXG59IGZyb20gJy4uLy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5cbmV4cG9ydCBjbGFzcyBBbmFseXRpY3NJbmZvQ29tbWFuZE1vZHVsZVxuICBleHRlbmRzIENvbW1hbmRNb2R1bGVcbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb25cbntcbiAgY29tbWFuZCA9ICdpbmZvJztcbiAgZGVzY3JpYmUgPSAnUHJpbnRzIGFuYWx5dGljcyBnYXRoZXJpbmcgYW5kIHJlcG9ydGluZyBjb25maWd1cmF0aW9uIGluIHRoZSBjb25zb2xlLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgYnVpbGRlcihsb2NhbFlhcmdzOiBBcmd2KTogQXJndiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3Muc3RyaWN0KCk7XG4gIH1cblxuICBhc3luYyBydW4oX29wdGlvbnM6IE9wdGlvbnM8e30+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKGF3YWl0IGdldEFuYWx5dGljc0luZm9TdHJpbmcoKSk7XG4gIH1cbn1cbiJdfQ==