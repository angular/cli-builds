"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsPromptModule = exports.AnalyticsEnableModule = exports.AnalyticsDisableModule = void 0;
const analytics_1 = require("../../../analytics/analytics");
const command_module_1 = require("../../../command-builder/command-module");
class AnalyticsSettingModule extends command_module_1.CommandModule {
    builder(localYargs) {
        return localYargs
            .option('global', {
            description: `Configure analytics gathering and reporting globally in the caller's home directory.`,
            alias: ['g'],
            type: 'boolean',
            default: false,
        })
            .strict();
    }
}
class AnalyticsDisableModule extends AnalyticsSettingModule {
    constructor() {
        super(...arguments);
        this.command = 'disable';
        this.aliases = 'off';
        this.describe = 'Disables analytics gathering and reporting for the user.';
    }
    async run({ global }) {
        (0, analytics_1.setAnalyticsConfig)(global, false);
        process.stderr.write(await (0, analytics_1.getAnalyticsInfoString)());
    }
}
exports.AnalyticsDisableModule = AnalyticsDisableModule;
class AnalyticsEnableModule extends AnalyticsSettingModule {
    constructor() {
        super(...arguments);
        this.command = 'enable';
        this.aliases = 'on';
        this.describe = 'Enables analytics gathering and reporting for the user.';
    }
    async run({ global }) {
        (0, analytics_1.setAnalyticsConfig)(global, true);
        process.stderr.write(await (0, analytics_1.getAnalyticsInfoString)());
    }
}
exports.AnalyticsEnableModule = AnalyticsEnableModule;
class AnalyticsPromptModule extends AnalyticsSettingModule {
    constructor() {
        super(...arguments);
        this.command = 'prompt';
        this.describe = 'Prompts the user to set the analytics gathering status interactively.';
    }
    async run({ global }) {
        await (0, analytics_1.promptAnalytics)(global, true);
    }
}
exports.AnalyticsPromptModule = AnalyticsPromptModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2FuYWx5dGljcy9zZXR0aW5ncy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gsNERBSXNDO0FBQ3RDLDRFQUlpRDtBQU1qRCxNQUFlLHNCQUNiLFNBQVEsOEJBQW1DO0lBSzNDLE9BQU8sQ0FBQyxVQUFnQjtRQUN0QixPQUFPLFVBQVU7YUFDZCxNQUFNLENBQUMsUUFBUSxFQUFFO1lBQ2hCLFdBQVcsRUFBRSxzRkFBc0Y7WUFDbkcsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDO1lBQ1osSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFNLEVBQUUsQ0FBQztJQUNkLENBQUM7Q0FHRjtBQUVELE1BQWEsc0JBQ1gsU0FBUSxzQkFBc0I7SUFEaEM7O1FBSUUsWUFBTyxHQUFHLFNBQVMsQ0FBQztRQUNwQixZQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ2hCLGFBQVEsR0FBRywwREFBMEQsQ0FBQztJQU14RSxDQUFDO0lBSkMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sRUFBaUM7UUFDakQsSUFBQSw4QkFBa0IsRUFBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFBLGtDQUFzQixHQUFFLENBQUMsQ0FBQztJQUN2RCxDQUFDO0NBQ0Y7QUFaRCx3REFZQztBQUVELE1BQWEscUJBQ1gsU0FBUSxzQkFBc0I7SUFEaEM7O1FBSUUsWUFBTyxHQUFHLFFBQVEsQ0FBQztRQUNuQixZQUFPLEdBQUcsSUFBSSxDQUFDO1FBQ2YsYUFBUSxHQUFHLHlEQUF5RCxDQUFDO0lBS3ZFLENBQUM7SUFKQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxFQUFpQztRQUNqRCxJQUFBLDhCQUFrQixFQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUEsa0NBQXNCLEdBQUUsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7Q0FDRjtBQVhELHNEQVdDO0FBRUQsTUFBYSxxQkFDWCxTQUFRLHNCQUFzQjtJQURoQzs7UUFJRSxZQUFPLEdBQUcsUUFBUSxDQUFDO1FBQ25CLGFBQVEsR0FBRyx1RUFBdUUsQ0FBQztJQUtyRixDQUFDO0lBSEMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sRUFBaUM7UUFDakQsTUFBTSxJQUFBLDJCQUFlLEVBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUM7Q0FDRjtBQVZELHNEQVVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQge1xuICBnZXRBbmFseXRpY3NJbmZvU3RyaW5nLFxuICBwcm9tcHRBbmFseXRpY3MsXG4gIHNldEFuYWx5dGljc0NvbmZpZyxcbn0gZnJvbSAnLi4vLi4vLi4vYW5hbHl0aWNzL2FuYWx5dGljcyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIE9wdGlvbnMsXG59IGZyb20gJy4uLy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5cbmludGVyZmFjZSBBbmFseXRpY3NDb21tYW5kQXJncyB7XG4gIGdsb2JhbDogYm9vbGVhbjtcbn1cblxuYWJzdHJhY3QgY2xhc3MgQW5hbHl0aWNzU2V0dGluZ01vZHVsZVxuICBleHRlbmRzIENvbW1hbmRNb2R1bGU8QW5hbHl0aWNzQ29tbWFuZEFyZ3M+XG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPEFuYWx5dGljc0NvbW1hbmRBcmdzPlxue1xuICBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nO1xuXG4gIGJ1aWxkZXIobG9jYWxZYXJnczogQXJndik6IEFyZ3Y8QW5hbHl0aWNzQ29tbWFuZEFyZ3M+IHtcbiAgICByZXR1cm4gbG9jYWxZYXJnc1xuICAgICAgLm9wdGlvbignZ2xvYmFsJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogYENvbmZpZ3VyZSBhbmFseXRpY3MgZ2F0aGVyaW5nIGFuZCByZXBvcnRpbmcgZ2xvYmFsbHkgaW4gdGhlIGNhbGxlcidzIGhvbWUgZGlyZWN0b3J5LmAsXG4gICAgICAgIGFsaWFzOiBbJ2cnXSxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAuc3RyaWN0KCk7XG4gIH1cblxuICBhYnN0cmFjdCBvdmVycmlkZSBydW4oeyBnbG9iYWwgfTogT3B0aW9uczxBbmFseXRpY3NDb21tYW5kQXJncz4pOiBQcm9taXNlPHZvaWQ+O1xufVxuXG5leHBvcnQgY2xhc3MgQW5hbHl0aWNzRGlzYWJsZU1vZHVsZVxuICBleHRlbmRzIEFuYWx5dGljc1NldHRpbmdNb2R1bGVcbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248QW5hbHl0aWNzQ29tbWFuZEFyZ3M+XG57XG4gIGNvbW1hbmQgPSAnZGlzYWJsZSc7XG4gIGFsaWFzZXMgPSAnb2ZmJztcbiAgZGVzY3JpYmUgPSAnRGlzYWJsZXMgYW5hbHl0aWNzIGdhdGhlcmluZyBhbmQgcmVwb3J0aW5nIGZvciB0aGUgdXNlci4nO1xuXG4gIGFzeW5jIHJ1bih7IGdsb2JhbCB9OiBPcHRpb25zPEFuYWx5dGljc0NvbW1hbmRBcmdzPik6IFByb21pc2U8dm9pZD4ge1xuICAgIHNldEFuYWx5dGljc0NvbmZpZyhnbG9iYWwsIGZhbHNlKTtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShhd2FpdCBnZXRBbmFseXRpY3NJbmZvU3RyaW5nKCkpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBbmFseXRpY3NFbmFibGVNb2R1bGVcbiAgZXh0ZW5kcyBBbmFseXRpY3NTZXR0aW5nTW9kdWxlXG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPEFuYWx5dGljc0NvbW1hbmRBcmdzPlxue1xuICBjb21tYW5kID0gJ2VuYWJsZSc7XG4gIGFsaWFzZXMgPSAnb24nO1xuICBkZXNjcmliZSA9ICdFbmFibGVzIGFuYWx5dGljcyBnYXRoZXJpbmcgYW5kIHJlcG9ydGluZyBmb3IgdGhlIHVzZXIuJztcbiAgYXN5bmMgcnVuKHsgZ2xvYmFsIH06IE9wdGlvbnM8QW5hbHl0aWNzQ29tbWFuZEFyZ3M+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgc2V0QW5hbHl0aWNzQ29uZmlnKGdsb2JhbCwgdHJ1ZSk7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYXdhaXQgZ2V0QW5hbHl0aWNzSW5mb1N0cmluZygpKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQW5hbHl0aWNzUHJvbXB0TW9kdWxlXG4gIGV4dGVuZHMgQW5hbHl0aWNzU2V0dGluZ01vZHVsZVxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxBbmFseXRpY3NDb21tYW5kQXJncz5cbntcbiAgY29tbWFuZCA9ICdwcm9tcHQnO1xuICBkZXNjcmliZSA9ICdQcm9tcHRzIHRoZSB1c2VyIHRvIHNldCB0aGUgYW5hbHl0aWNzIGdhdGhlcmluZyBzdGF0dXMgaW50ZXJhY3RpdmVseS4nO1xuXG4gIGFzeW5jIHJ1bih7IGdsb2JhbCB9OiBPcHRpb25zPEFuYWx5dGljc0NvbW1hbmRBcmdzPik6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHByb21wdEFuYWx5dGljcyhnbG9iYWwsIHRydWUpO1xuICB9XG59XG4iXX0=