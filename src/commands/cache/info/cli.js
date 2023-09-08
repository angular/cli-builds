"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheInfoCommandModule = void 0;
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const path_1 = require("path");
const command_module_1 = require("../../../command-builder/command-module");
const environment_options_1 = require("../../../utilities/environment-options");
const utilities_1 = require("../utilities");
class CacheInfoCommandModule extends command_module_1.CommandModule {
    command = 'info';
    describe = 'Prints persistent disk cache configuration and statistics in the console.';
    longDescriptionPath;
    scope = command_module_1.CommandScope.In;
    builder(localYargs) {
        return localYargs.strict();
    }
    async run() {
        const { path, environment, enabled } = (0, utilities_1.getCacheConfig)(this.context.workspace);
        this.context.logger.info(core_1.tags.stripIndents `
      Enabled: ${enabled ? 'yes' : 'no'}
      Environment: ${environment}
      Path: ${path}
      Size on disk: ${await this.getSizeOfDirectory(path)}
      Effective status on current machine: ${this.effectiveEnabledStatus() ? 'enabled' : 'disabled'}
    `);
    }
    async getSizeOfDirectory(path) {
        const directoriesStack = [path];
        let size = 0;
        while (directoriesStack.length) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const dirPath = directoriesStack.pop();
            let entries = [];
            try {
                entries = await fs_1.promises.readdir(dirPath);
            }
            catch { }
            for (const entry of entries) {
                const entryPath = (0, path_1.join)(dirPath, entry);
                const stats = await fs_1.promises.stat(entryPath);
                if (stats.isDirectory()) {
                    directoriesStack.push(entryPath);
                }
                size += stats.size;
            }
        }
        return this.formatSize(size);
    }
    formatSize(size) {
        if (size <= 0) {
            return '0 bytes';
        }
        const abbreviations = ['bytes', 'kB', 'MB', 'GB'];
        const index = Math.floor(Math.log(size) / Math.log(1024));
        const roundedSize = size / Math.pow(1024, index);
        // bytes don't have a fraction
        const fractionDigits = index === 0 ? 0 : 2;
        return `${roundedSize.toFixed(fractionDigits)} ${abbreviations[index]}`;
    }
    effectiveEnabledStatus() {
        const { enabled, environment } = (0, utilities_1.getCacheConfig)(this.context.workspace);
        if (enabled) {
            switch (environment) {
                case 'ci':
                    return environment_options_1.isCI;
                case 'local':
                    return !environment_options_1.isCI;
            }
        }
        return enabled;
    }
}
exports.CacheInfoCommandModule = CacheInfoCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NhY2hlL2luZm8vY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILCtDQUE0QztBQUM1QywyQkFBb0M7QUFDcEMsK0JBQTRCO0FBRTVCLDRFQUlpRDtBQUNqRCxnRkFBOEQ7QUFDOUQsNENBQThDO0FBRTlDLE1BQWEsc0JBQXVCLFNBQVEsOEJBQWE7SUFDdkQsT0FBTyxHQUFHLE1BQU0sQ0FBQztJQUNqQixRQUFRLEdBQUcsMkVBQTJFLENBQUM7SUFDdkYsbUJBQW1CLENBQXNCO0lBQ2hDLEtBQUssR0FBRyw2QkFBWSxDQUFDLEVBQUUsQ0FBQztJQUVqQyxPQUFPLENBQUMsVUFBZ0I7UUFDdEIsT0FBTyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHO1FBQ1AsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBQSwwQkFBYyxFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFOUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBQyxZQUFZLENBQUE7aUJBQzdCLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJO3FCQUNsQixXQUFXO2NBQ2xCLElBQUk7c0JBQ0ksTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDOzZDQUNaLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVU7S0FDOUYsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxJQUFZO1FBQzNDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7UUFFYixPQUFPLGdCQUFnQixDQUFDLE1BQU0sRUFBRTtZQUM5QixvRUFBb0U7WUFDcEUsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxFQUFHLENBQUM7WUFDeEMsSUFBSSxPQUFPLEdBQWEsRUFBRSxDQUFDO1lBRTNCLElBQUk7Z0JBQ0YsT0FBTyxHQUFHLE1BQU0sYUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNyQztZQUFDLE1BQU0sR0FBRTtZQUVWLEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxFQUFFO2dCQUMzQixNQUFNLFNBQVMsR0FBRyxJQUFBLFdBQUksRUFBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU0sS0FBSyxHQUFHLE1BQU0sYUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFFdkMsSUFBSSxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUU7b0JBQ3ZCLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztpQkFDbEM7Z0JBRUQsSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUM7YUFDcEI7U0FDRjtRQUVELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRU8sVUFBVSxDQUFDLElBQVk7UUFDN0IsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFO1lBQ2IsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFFRCxNQUFNLGFBQWEsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDMUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELDhCQUE4QjtRQUM5QixNQUFNLGNBQWMsR0FBRyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUzQyxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztJQUMxRSxDQUFDO0lBRU8sc0JBQXNCO1FBQzVCLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEdBQUcsSUFBQSwwQkFBYyxFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFeEUsSUFBSSxPQUFPLEVBQUU7WUFDWCxRQUFRLFdBQVcsRUFBRTtnQkFDbkIsS0FBSyxJQUFJO29CQUNQLE9BQU8sMEJBQUksQ0FBQztnQkFDZCxLQUFLLE9BQU87b0JBQ1YsT0FBTyxDQUFDLDBCQUFJLENBQUM7YUFDaEI7U0FDRjtRQUVELE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7Q0FDRjtBQTlFRCx3REE4RUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHByb21pc2VzIGFzIGZzIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGUsXG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgQ29tbWFuZFNjb3BlLFxufSBmcm9tICcuLi8uLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgaXNDSSB9IGZyb20gJy4uLy4uLy4uL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IGdldENhY2hlQ29uZmlnIH0gZnJvbSAnLi4vdXRpbGl0aWVzJztcblxuZXhwb3J0IGNsYXNzIENhY2hlSW5mb0NvbW1hbmRNb2R1bGUgZXh0ZW5kcyBDb21tYW5kTW9kdWxlIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uIHtcbiAgY29tbWFuZCA9ICdpbmZvJztcbiAgZGVzY3JpYmUgPSAnUHJpbnRzIHBlcnNpc3RlbnQgZGlzayBjYWNoZSBjb25maWd1cmF0aW9uIGFuZCBzdGF0aXN0aWNzIGluIHRoZSBjb25zb2xlLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIG92ZXJyaWRlIHNjb3BlID0gQ29tbWFuZFNjb3BlLkluO1xuXG4gIGJ1aWxkZXIobG9jYWxZYXJnczogQXJndik6IEFyZ3Yge1xuICAgIHJldHVybiBsb2NhbFlhcmdzLnN0cmljdCgpO1xuICB9XG5cbiAgYXN5bmMgcnVuKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHsgcGF0aCwgZW52aXJvbm1lbnQsIGVuYWJsZWQgfSA9IGdldENhY2hlQ29uZmlnKHRoaXMuY29udGV4dC53b3Jrc3BhY2UpO1xuXG4gICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgRW5hYmxlZDogJHtlbmFibGVkID8gJ3llcycgOiAnbm8nfVxuICAgICAgRW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9XG4gICAgICBQYXRoOiAke3BhdGh9XG4gICAgICBTaXplIG9uIGRpc2s6ICR7YXdhaXQgdGhpcy5nZXRTaXplT2ZEaXJlY3RvcnkocGF0aCl9XG4gICAgICBFZmZlY3RpdmUgc3RhdHVzIG9uIGN1cnJlbnQgbWFjaGluZTogJHt0aGlzLmVmZmVjdGl2ZUVuYWJsZWRTdGF0dXMoKSA/ICdlbmFibGVkJyA6ICdkaXNhYmxlZCd9XG4gICAgYCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldFNpemVPZkRpcmVjdG9yeShwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IGRpcmVjdG9yaWVzU3RhY2sgPSBbcGF0aF07XG4gICAgbGV0IHNpemUgPSAwO1xuXG4gICAgd2hpbGUgKGRpcmVjdG9yaWVzU3RhY2subGVuZ3RoKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgY29uc3QgZGlyUGF0aCA9IGRpcmVjdG9yaWVzU3RhY2sucG9wKCkhO1xuICAgICAgbGV0IGVudHJpZXM6IHN0cmluZ1tdID0gW107XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKGRpclBhdGgpO1xuICAgICAgfSBjYXRjaCB7fVxuXG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgY29uc3QgZW50cnlQYXRoID0gam9pbihkaXJQYXRoLCBlbnRyeSk7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMuc3RhdChlbnRyeVBhdGgpO1xuXG4gICAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgZGlyZWN0b3JpZXNTdGFjay5wdXNoKGVudHJ5UGF0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBzaXplICs9IHN0YXRzLnNpemU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0U2l6ZShzaXplKTtcbiAgfVxuXG4gIHByaXZhdGUgZm9ybWF0U2l6ZShzaXplOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGlmIChzaXplIDw9IDApIHtcbiAgICAgIHJldHVybiAnMCBieXRlcyc7XG4gICAgfVxuXG4gICAgY29uc3QgYWJicmV2aWF0aW9ucyA9IFsnYnl0ZXMnLCAna0InLCAnTUInLCAnR0InXTtcbiAgICBjb25zdCBpbmRleCA9IE1hdGguZmxvb3IoTWF0aC5sb2coc2l6ZSkgLyBNYXRoLmxvZygxMDI0KSk7XG4gICAgY29uc3Qgcm91bmRlZFNpemUgPSBzaXplIC8gTWF0aC5wb3coMTAyNCwgaW5kZXgpO1xuICAgIC8vIGJ5dGVzIGRvbid0IGhhdmUgYSBmcmFjdGlvblxuICAgIGNvbnN0IGZyYWN0aW9uRGlnaXRzID0gaW5kZXggPT09IDAgPyAwIDogMjtcblxuICAgIHJldHVybiBgJHtyb3VuZGVkU2l6ZS50b0ZpeGVkKGZyYWN0aW9uRGlnaXRzKX0gJHthYmJyZXZpYXRpb25zW2luZGV4XX1gO1xuICB9XG5cbiAgcHJpdmF0ZSBlZmZlY3RpdmVFbmFibGVkU3RhdHVzKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHsgZW5hYmxlZCwgZW52aXJvbm1lbnQgfSA9IGdldENhY2hlQ29uZmlnKHRoaXMuY29udGV4dC53b3Jrc3BhY2UpO1xuXG4gICAgaWYgKGVuYWJsZWQpIHtcbiAgICAgIHN3aXRjaCAoZW52aXJvbm1lbnQpIHtcbiAgICAgICAgY2FzZSAnY2knOlxuICAgICAgICAgIHJldHVybiBpc0NJO1xuICAgICAgICBjYXNlICdsb2NhbCc6XG4gICAgICAgICAgcmV0dXJuICFpc0NJO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBlbmFibGVkO1xuICB9XG59XG4iXX0=