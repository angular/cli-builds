"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command = void 0;
const core_1 = require("@angular-devkit/core");
class Command {
    constructor(context, commandName) {
        this.context = context;
        this.commandName = commandName;
        this.allowMissingWorkspace = false;
        this.useReportAnalytics = true;
        this.commandOptions = [];
        this.workspace = context.workspace;
        this.logger = context.logger;
        this.analytics = context.analytics || new core_1.analytics.NoopAnalytics();
    }
    async initialize(options) { }
    async reportAnalytics(paths, options, dimensions = [], metrics = []) {
        for (const option of this.commandOptions) {
            const ua = option.userAnalytics;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const v = options[option.name];
            if (v !== undefined && !Array.isArray(v) && ua) {
                dimensions[ua] = v;
            }
        }
        this.analytics.pageview('/command/' + paths.join('/'), { dimensions, metrics });
    }
    async validateAndRun(options) {
        let result = await this.initialize(options);
        if (typeof result === 'number' && result !== 0) {
            return result;
        }
        const startTime = +new Date();
        if (this.useReportAnalytics) {
            await this.reportAnalytics([this.commandName], options);
        }
        result = await this.run(options);
        const endTime = +new Date();
        this.analytics.timing(this.commandName, 'duration', endTime - startTime);
        return result;
    }
}
exports.Command = Command;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9jb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILCtDQUEwRDtBQVMxRCxNQUFzQixPQUFPO0lBUTNCLFlBQStCLE9BQXVCLEVBQXFCLFdBQW1CO1FBQS9ELFlBQU8sR0FBUCxPQUFPLENBQWdCO1FBQXFCLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBUHBGLDBCQUFxQixHQUFHLEtBQUssQ0FBQztRQUM5Qix1QkFBa0IsR0FBRyxJQUFJLENBQUM7UUFHakIsbUJBQWMsR0FBYSxFQUFFLENBQUM7UUFJL0MsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDO1FBQ25DLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM3QixJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLElBQUksSUFBSSxnQkFBUyxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3RFLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQVUsSUFBMkIsQ0FBQztJQUV2RCxLQUFLLENBQUMsZUFBZSxDQUNuQixLQUFlLEVBQ2YsT0FBVSxFQUNWLGFBQTRDLEVBQUUsRUFDOUMsVUFBeUMsRUFBRTtRQUUzQyxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDeEMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQztZQUNoQyw4REFBOEQ7WUFDOUQsTUFBTSxDQUFDLEdBQUksT0FBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV4QyxJQUFJLENBQUMsS0FBSyxTQUFTLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDOUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNwQjtTQUNGO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBSUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxPQUFVO1FBQzdCLElBQUksTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsSUFBSSxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzlDLE9BQU8sTUFBTSxDQUFDO1NBQ2Y7UUFFRCxNQUFNLFNBQVMsR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7UUFDOUIsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7WUFDM0IsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ3pEO1FBQ0QsTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNqQyxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7UUFFNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxVQUFVLEVBQUUsT0FBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDO1FBRXpFLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FDRjtBQXRERCwwQkFzREMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgYW5hbHl0aWNzLCBsb2dnaW5nIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgT3B0aW9uIH0gZnJvbSAnLi4vc3JjL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSB9IGZyb20gJy4uL3NyYy91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IENvbW1hbmRDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJhc2VDb21tYW5kT3B0aW9ucyB7XG4gIGpzb25IZWxwPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbW1hbmQ8VCA9IHt9PiB7XG4gIHByb3RlY3RlZCBhbGxvd01pc3NpbmdXb3Jrc3BhY2UgPSBmYWxzZTtcbiAgcHJvdGVjdGVkIHVzZVJlcG9ydEFuYWx5dGljcyA9IHRydWU7XG4gIHJlYWRvbmx5IHdvcmtzcGFjZT86IEFuZ3VsYXJXb3Jrc3BhY2U7XG4gIHByb3RlY3RlZCByZWFkb25seSBhbmFseXRpY3M6IGFuYWx5dGljcy5BbmFseXRpY3M7XG4gIHByb3RlY3RlZCByZWFkb25seSBjb21tYW5kT3B0aW9uczogT3B0aW9uW10gPSBbXTtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXI7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRvbmx5IGNvbnRleHQ6IENvbW1hbmRDb250ZXh0LCBwcm90ZWN0ZWQgcmVhZG9ubHkgY29tbWFuZE5hbWU6IHN0cmluZykge1xuICAgIHRoaXMud29ya3NwYWNlID0gY29udGV4dC53b3Jrc3BhY2U7XG4gICAgdGhpcy5sb2dnZXIgPSBjb250ZXh0LmxvZ2dlcjtcbiAgICB0aGlzLmFuYWx5dGljcyA9IGNvbnRleHQuYW5hbHl0aWNzIHx8IG5ldyBhbmFseXRpY3MuTm9vcEFuYWx5dGljcygpO1xuICB9XG5cbiAgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBUKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7fVxuXG4gIGFzeW5jIHJlcG9ydEFuYWx5dGljcyhcbiAgICBwYXRoczogc3RyaW5nW10sXG4gICAgb3B0aW9uczogVCxcbiAgICBkaW1lbnNpb25zOiAoYm9vbGVhbiB8IG51bWJlciB8IHN0cmluZylbXSA9IFtdLFxuICAgIG1ldHJpY3M6IChib29sZWFuIHwgbnVtYmVyIHwgc3RyaW5nKVtdID0gW10sXG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIHRoaXMuY29tbWFuZE9wdGlvbnMpIHtcbiAgICAgIGNvbnN0IHVhID0gb3B0aW9uLnVzZXJBbmFseXRpY3M7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgY29uc3QgdiA9IChvcHRpb25zIGFzIGFueSlbb3B0aW9uLm5hbWVdO1xuXG4gICAgICBpZiAodiAhPT0gdW5kZWZpbmVkICYmICFBcnJheS5pc0FycmF5KHYpICYmIHVhKSB7XG4gICAgICAgIGRpbWVuc2lvbnNbdWFdID0gdjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmFuYWx5dGljcy5wYWdldmlldygnL2NvbW1hbmQvJyArIHBhdGhzLmpvaW4oJy8nKSwgeyBkaW1lbnNpb25zLCBtZXRyaWNzIH0pO1xuICB9XG5cbiAgYWJzdHJhY3QgcnVuKG9wdGlvbnM6IFQpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+O1xuXG4gIGFzeW5jIHZhbGlkYXRlQW5kUnVuKG9wdGlvbnM6IFQpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgdGhpcy5pbml0aWFsaXplKG9wdGlvbnMpO1xuICAgIGlmICh0eXBlb2YgcmVzdWx0ID09PSAnbnVtYmVyJyAmJiByZXN1bHQgIT09IDApIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gK25ldyBEYXRlKCk7XG4gICAgaWYgKHRoaXMudXNlUmVwb3J0QW5hbHl0aWNzKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlcG9ydEFuYWx5dGljcyhbdGhpcy5jb21tYW5kTmFtZV0sIG9wdGlvbnMpO1xuICAgIH1cbiAgICByZXN1bHQgPSBhd2FpdCB0aGlzLnJ1bihvcHRpb25zKTtcbiAgICBjb25zdCBlbmRUaW1lID0gK25ldyBEYXRlKCk7XG5cbiAgICB0aGlzLmFuYWx5dGljcy50aW1pbmcodGhpcy5jb21tYW5kTmFtZSwgJ2R1cmF0aW9uJywgZW5kVGltZSAtIHN0YXJ0VGltZSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG4iXX0=