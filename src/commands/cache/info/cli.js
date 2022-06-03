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
    constructor() {
        super(...arguments);
        this.command = 'info';
        this.describe = 'Prints persistent disk cache configuration and statistics in the console.';
    }
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
            catch (_a) { }
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
CacheInfoCommandModule.scope = command_module_1.CommandScope.In;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NhY2hlL2luZm8vY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILCtDQUE0QztBQUM1QywyQkFBb0M7QUFDcEMsK0JBQTRCO0FBRTVCLDRFQUlpRDtBQUNqRCxnRkFBOEQ7QUFDOUQsNENBQThDO0FBRTlDLE1BQWEsc0JBQXVCLFNBQVEsOEJBQWE7SUFBekQ7O1FBQ0UsWUFBTyxHQUFHLE1BQU0sQ0FBQztRQUNqQixhQUFRLEdBQUcsMkVBQTJFLENBQUM7SUE0RXpGLENBQUM7SUF4RUMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRztRQUNQLE1BQU0sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUEsMEJBQWMsRUFBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTlFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFJLENBQUMsWUFBWSxDQUFBO2lCQUM3QixPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSTtxQkFDbEIsV0FBVztjQUNsQixJQUFJO3NCQUNJLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQzs2Q0FDWixJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVO0tBQzlGLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBWTtRQUMzQyxNQUFNLGdCQUFnQixHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBRWIsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUU7WUFDOUIsb0VBQW9FO1lBQ3BFLE1BQU0sT0FBTyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsRUFBRyxDQUFDO1lBQ3hDLElBQUksT0FBTyxHQUFhLEVBQUUsQ0FBQztZQUUzQixJQUFJO2dCQUNGLE9BQU8sR0FBRyxNQUFNLGFBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDckM7WUFBQyxXQUFNLEdBQUU7WUFFVixLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sRUFBRTtnQkFDM0IsTUFBTSxTQUFTLEdBQUcsSUFBQSxXQUFJLEVBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN2QyxNQUFNLEtBQUssR0FBRyxNQUFNLGFBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBRXZDLElBQUksS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFO29CQUN2QixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQ2xDO2dCQUVELElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDO2FBQ3BCO1NBQ0Y7UUFFRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVPLFVBQVUsQ0FBQyxJQUFZO1FBQzdCLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtZQUNiLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBRUQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzFELE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRCw4QkFBOEI7UUFDOUIsTUFBTSxjQUFjLEdBQUcsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFM0MsT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7SUFDMUUsQ0FBQztJQUVPLHNCQUFzQjtRQUM1QixNQUFNLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxHQUFHLElBQUEsMEJBQWMsRUFBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXhFLElBQUksT0FBTyxFQUFFO1lBQ1gsUUFBUSxXQUFXLEVBQUU7Z0JBQ25CLEtBQUssSUFBSTtvQkFDUCxPQUFPLDBCQUFJLENBQUM7Z0JBQ2QsS0FBSyxPQUFPO29CQUNWLE9BQU8sQ0FBQywwQkFBSSxDQUFDO2FBQ2hCO1NBQ0Y7UUFFRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDOztBQTdFSCx3REE4RUM7QUExRWlCLDRCQUFLLEdBQUcsNkJBQVksQ0FBQyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHByb21pc2VzIGFzIGZzIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGUsXG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgQ29tbWFuZFNjb3BlLFxufSBmcm9tICcuLi8uLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgaXNDSSB9IGZyb20gJy4uLy4uLy4uL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IGdldENhY2hlQ29uZmlnIH0gZnJvbSAnLi4vdXRpbGl0aWVzJztcblxuZXhwb3J0IGNsYXNzIENhY2hlSW5mb0NvbW1hbmRNb2R1bGUgZXh0ZW5kcyBDb21tYW5kTW9kdWxlIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uIHtcbiAgY29tbWFuZCA9ICdpbmZvJztcbiAgZGVzY3JpYmUgPSAnUHJpbnRzIHBlcnNpc3RlbnQgZGlzayBjYWNoZSBjb25maWd1cmF0aW9uIGFuZCBzdGF0aXN0aWNzIGluIHRoZSBjb25zb2xlLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHN0YXRpYyBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5JbjtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2IHtcbiAgICByZXR1cm4gbG9jYWxZYXJncy5zdHJpY3QoKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IHBhdGgsIGVudmlyb25tZW50LCBlbmFibGVkIH0gPSBnZXRDYWNoZUNvbmZpZyh0aGlzLmNvbnRleHQud29ya3NwYWNlKTtcblxuICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgIEVuYWJsZWQ6ICR7ZW5hYmxlZCA/ICd5ZXMnIDogJ25vJ31cbiAgICAgIEVudmlyb25tZW50OiAke2Vudmlyb25tZW50fVxuICAgICAgUGF0aDogJHtwYXRofVxuICAgICAgU2l6ZSBvbiBkaXNrOiAke2F3YWl0IHRoaXMuZ2V0U2l6ZU9mRGlyZWN0b3J5KHBhdGgpfVxuICAgICAgRWZmZWN0aXZlIHN0YXR1cyBvbiBjdXJyZW50IG1hY2hpbmU6ICR7dGhpcy5lZmZlY3RpdmVFbmFibGVkU3RhdHVzKCkgPyAnZW5hYmxlZCcgOiAnZGlzYWJsZWQnfVxuICAgIGApO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRTaXplT2ZEaXJlY3RvcnkocGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBkaXJlY3Rvcmllc1N0YWNrID0gW3BhdGhdO1xuICAgIGxldCBzaXplID0gMDtcblxuICAgIHdoaWxlIChkaXJlY3Rvcmllc1N0YWNrLmxlbmd0aCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgIGNvbnN0IGRpclBhdGggPSBkaXJlY3Rvcmllc1N0YWNrLnBvcCgpITtcbiAgICAgIGxldCBlbnRyaWVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgICB0cnkge1xuICAgICAgICBlbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihkaXJQYXRoKTtcbiAgICAgIH0gY2F0Y2gge31cblxuICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgIGNvbnN0IGVudHJ5UGF0aCA9IGpvaW4oZGlyUGF0aCwgZW50cnkpO1xuICAgICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLnN0YXQoZW50cnlQYXRoKTtcblxuICAgICAgICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgIGRpcmVjdG9yaWVzU3RhY2sucHVzaChlbnRyeVBhdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2l6ZSArPSBzdGF0cy5zaXplO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmZvcm1hdFNpemUoc2l6ZSk7XG4gIH1cblxuICBwcml2YXRlIGZvcm1hdFNpemUoc2l6ZTogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBpZiAoc2l6ZSA8PSAwKSB7XG4gICAgICByZXR1cm4gJzAgYnl0ZXMnO1xuICAgIH1cblxuICAgIGNvbnN0IGFiYnJldmlhdGlvbnMgPSBbJ2J5dGVzJywgJ2tCJywgJ01CJywgJ0dCJ107XG4gICAgY29uc3QgaW5kZXggPSBNYXRoLmZsb29yKE1hdGgubG9nKHNpemUpIC8gTWF0aC5sb2coMTAyNCkpO1xuICAgIGNvbnN0IHJvdW5kZWRTaXplID0gc2l6ZSAvIE1hdGgucG93KDEwMjQsIGluZGV4KTtcbiAgICAvLyBieXRlcyBkb24ndCBoYXZlIGEgZnJhY3Rpb25cbiAgICBjb25zdCBmcmFjdGlvbkRpZ2l0cyA9IGluZGV4ID09PSAwID8gMCA6IDI7XG5cbiAgICByZXR1cm4gYCR7cm91bmRlZFNpemUudG9GaXhlZChmcmFjdGlvbkRpZ2l0cyl9ICR7YWJicmV2aWF0aW9uc1tpbmRleF19YDtcbiAgfVxuXG4gIHByaXZhdGUgZWZmZWN0aXZlRW5hYmxlZFN0YXR1cygpOiBib29sZWFuIHtcbiAgICBjb25zdCB7IGVuYWJsZWQsIGVudmlyb25tZW50IH0gPSBnZXRDYWNoZUNvbmZpZyh0aGlzLmNvbnRleHQud29ya3NwYWNlKTtcblxuICAgIGlmIChlbmFibGVkKSB7XG4gICAgICBzd2l0Y2ggKGVudmlyb25tZW50KSB7XG4gICAgICAgIGNhc2UgJ2NpJzpcbiAgICAgICAgICByZXR1cm4gaXNDSTtcbiAgICAgICAgY2FzZSAnbG9jYWwnOlxuICAgICAgICAgIHJldHVybiAhaXNDSTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZW5hYmxlZDtcbiAgfVxufVxuIl19