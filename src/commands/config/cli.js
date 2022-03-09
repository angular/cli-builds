"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigCommandModule = void 0;
const path_1 = require("path");
const command_module_1 = require("../../command-builder/command-module");
const config_impl_1 = require("./config-impl");
class ConfigCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'config <json-path> [value]';
        this.describe = 'Retrieves or sets Angular configuration values in the angular.json file for the workspace.';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
    }
    builder(localYargs) {
        return localYargs
            .positional('json-path', {
            description: `The configuration key to set or query, in JSON path format. ` +
                `For example: "a[3].foo.bar[2]". If no new value is provided, returns the current value of this key.`,
            type: 'string',
            demandOption: true,
        })
            .positional('value', {
            description: 'If provided, a new value for the given configuration key.',
            type: 'string',
        })
            .option('global', {
            description: `Access the global configuration in the caller's home directory.`,
            alias: ['g'],
            type: 'boolean',
            default: false,
        })
            .strict();
    }
    run(options) {
        const command = new config_impl_1.ConfigCommand(this.context, 'config');
        return command.validateAndRun(options);
    }
}
exports.ConfigCommandModule = ConfigCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NvbmZpZy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsK0JBQTRCO0FBRTVCLHlFQUk4QztBQUM5QywrQ0FBOEM7QUFROUMsTUFBYSxtQkFDWCxTQUFRLDhCQUFnQztJQUQxQzs7UUFJRSxZQUFPLEdBQUcsNEJBQTRCLENBQUM7UUFDdkMsYUFBUSxHQUNOLDRGQUE0RixDQUFDO1FBQy9GLHdCQUFtQixHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBNkIvRCxDQUFDO0lBM0JDLE9BQU8sQ0FBQyxVQUFnQjtRQUN0QixPQUFPLFVBQVU7YUFDZCxVQUFVLENBQUMsV0FBVyxFQUFFO1lBQ3ZCLFdBQVcsRUFDVCw4REFBOEQ7Z0JBQzlELHFHQUFxRztZQUN2RyxJQUFJLEVBQUUsUUFBUTtZQUNkLFlBQVksRUFBRSxJQUFJO1NBQ25CLENBQUM7YUFDRCxVQUFVLENBQUMsT0FBTyxFQUFFO1lBQ25CLFdBQVcsRUFBRSwyREFBMkQ7WUFDeEUsSUFBSSxFQUFFLFFBQVE7U0FDZixDQUFDO2FBQ0QsTUFBTSxDQUFDLFFBQVEsRUFBRTtZQUNoQixXQUFXLEVBQUUsaUVBQWlFO1lBQzlFLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQztZQUNaLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDO2FBQ0QsTUFBTSxFQUFFLENBQUM7SUFDZCxDQUFDO0lBRUQsR0FBRyxDQUFDLE9BQW1DO1FBQ3JDLE1BQU0sT0FBTyxHQUFHLElBQUksMkJBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRTFELE9BQU8sT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6QyxDQUFDO0NBQ0Y7QUFwQ0Qsa0RBb0NDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIE9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBDb25maWdDb21tYW5kIH0gZnJvbSAnLi9jb25maWctaW1wbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uZmlnQ29tbWFuZEFyZ3Mge1xuICAnanNvbi1wYXRoJzogc3RyaW5nO1xuICB2YWx1ZT86IHN0cmluZztcbiAgZ2xvYmFsPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNsYXNzIENvbmZpZ0NvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBDb21tYW5kTW9kdWxlPENvbmZpZ0NvbW1hbmRBcmdzPlxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxDb25maWdDb21tYW5kQXJncz5cbntcbiAgY29tbWFuZCA9ICdjb25maWcgPGpzb24tcGF0aD4gW3ZhbHVlXSc7XG4gIGRlc2NyaWJlID1cbiAgICAnUmV0cmlldmVzIG9yIHNldHMgQW5ndWxhciBjb25maWd1cmF0aW9uIHZhbHVlcyBpbiB0aGUgYW5ndWxhci5qc29uIGZpbGUgZm9yIHRoZSB3b3Jrc3BhY2UuJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnbG9uZy1kZXNjcmlwdGlvbi5tZCcpO1xuXG4gIGJ1aWxkZXIobG9jYWxZYXJnczogQXJndik6IEFyZ3Y8Q29uZmlnQ29tbWFuZEFyZ3M+IHtcbiAgICByZXR1cm4gbG9jYWxZYXJnc1xuICAgICAgLnBvc2l0aW9uYWwoJ2pzb24tcGF0aCcsIHtcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgYFRoZSBjb25maWd1cmF0aW9uIGtleSB0byBzZXQgb3IgcXVlcnksIGluIEpTT04gcGF0aCBmb3JtYXQuIGAgK1xuICAgICAgICAgIGBGb3IgZXhhbXBsZTogXCJhWzNdLmZvby5iYXJbMl1cIi4gSWYgbm8gbmV3IHZhbHVlIGlzIHByb3ZpZGVkLCByZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoaXMga2V5LmAsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBkZW1hbmRPcHRpb246IHRydWUsXG4gICAgICB9KVxuICAgICAgLnBvc2l0aW9uYWwoJ3ZhbHVlJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ0lmIHByb3ZpZGVkLCBhIG5ldyB2YWx1ZSBmb3IgdGhlIGdpdmVuIGNvbmZpZ3VyYXRpb24ga2V5LicsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2dsb2JhbCcsIHtcbiAgICAgICAgZGVzY3JpcHRpb246IGBBY2Nlc3MgdGhlIGdsb2JhbCBjb25maWd1cmF0aW9uIGluIHRoZSBjYWxsZXIncyBob21lIGRpcmVjdG9yeS5gLFxuICAgICAgICBhbGlhczogWydnJ10sXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLnN0cmljdCgpO1xuICB9XG5cbiAgcnVuKG9wdGlvbnM6IE9wdGlvbnM8Q29uZmlnQ29tbWFuZEFyZ3M+KTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBDb25maWdDb21tYW5kKHRoaXMuY29udGV4dCwgJ2NvbmZpZycpO1xuXG4gICAgcmV0dXJuIGNvbW1hbmQudmFsaWRhdGVBbmRSdW4ob3B0aW9ucyk7XG4gIH1cbn1cbiJdfQ==