"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocCommand = void 0;
const open_1 = __importDefault(require("open"));
const command_1 = require("../models/command");
class DocCommand extends command_1.Command {
    async run(options) {
        if (!options.keyword) {
            this.logger.error('You should specify a keyword, for instance, `ng doc ActivatedRoute`.');
            return 0;
        }
        let domain = 'angular.io';
        if (options.version) {
            // version can either be a string containing "next"
            if (options.version == 'next') {
                domain = 'next.angular.io';
                // or a number where version must be a valid Angular version (i.e. not 0, 1 or 3)
            }
            else if (!isNaN(+options.version) && ![0, 1, 3].includes(+options.version)) {
                domain = `v${options.version}.angular.io`;
            }
            else {
                this.logger.error('Version should either be a number (2, 4, 5, 6...) or "next"');
                return 0;
            }
        }
        else {
            // we try to get the current Angular version of the project
            // and use it if we can find it
            try {
                /* eslint-disable-next-line import/no-extraneous-dependencies */
                const currentNgVersion = (await Promise.resolve().then(() => __importStar(require('@angular/core')))).VERSION.major;
                domain = `v${currentNgVersion}.angular.io`;
            }
            catch (_a) { }
        }
        await (0, open_1.default)(options.search
            ? `https://${domain}/api?query=${options.keyword}`
            : `https://${domain}/docs?search=${options.keyword}`);
    }
}
exports.DocCommand = DocCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jLWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9kb2MtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsZ0RBQXdCO0FBQ3hCLCtDQUE0QztBQUk1QyxNQUFhLFVBQVcsU0FBUSxpQkFBeUI7SUFDaEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFxQztRQUNwRCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxzRUFBc0UsQ0FBQyxDQUFDO1lBRTFGLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFFRCxJQUFJLE1BQU0sR0FBRyxZQUFZLENBQUM7UUFFMUIsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQ25CLG1EQUFtRDtZQUNuRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLElBQUksTUFBTSxFQUFFO2dCQUM3QixNQUFNLEdBQUcsaUJBQWlCLENBQUM7Z0JBQzNCLGlGQUFpRjthQUNsRjtpQkFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDNUUsTUFBTSxHQUFHLElBQUksT0FBTyxDQUFDLE9BQU8sYUFBYSxDQUFDO2FBQzNDO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLDZEQUE2RCxDQUFDLENBQUM7Z0JBRWpGLE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7U0FDRjthQUFNO1lBQ0wsMkRBQTJEO1lBQzNELCtCQUErQjtZQUMvQixJQUFJO2dCQUNGLGdFQUFnRTtnQkFDaEUsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLHdEQUFhLGVBQWUsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztnQkFDdkUsTUFBTSxHQUFHLElBQUksZ0JBQWdCLGFBQWEsQ0FBQzthQUM1QztZQUFDLFdBQU0sR0FBRTtTQUNYO1FBRUQsTUFBTSxJQUFBLGNBQUksRUFDUixPQUFPLENBQUMsTUFBTTtZQUNaLENBQUMsQ0FBQyxXQUFXLE1BQU0sY0FBYyxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQ2xELENBQUMsQ0FBQyxXQUFXLE1BQU0sZ0JBQWdCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FDdkQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXRDRCxnQ0FzQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IG9wZW4gZnJvbSAnb3Blbic7XG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL2NvbW1hbmQnO1xuaW1wb3J0IHsgQXJndW1lbnRzIH0gZnJvbSAnLi4vbW9kZWxzL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgRG9jQ29tbWFuZFNjaGVtYSB9IGZyb20gJy4vZG9jJztcblxuZXhwb3J0IGNsYXNzIERvY0NvbW1hbmQgZXh0ZW5kcyBDb21tYW5kPERvY0NvbW1hbmRTY2hlbWE+IHtcbiAgcHVibGljIGFzeW5jIHJ1bihvcHRpb25zOiBEb2NDb21tYW5kU2NoZW1hICYgQXJndW1lbnRzKSB7XG4gICAgaWYgKCFvcHRpb25zLmtleXdvcmQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdZb3Ugc2hvdWxkIHNwZWNpZnkgYSBrZXl3b3JkLCBmb3IgaW5zdGFuY2UsIGBuZyBkb2MgQWN0aXZhdGVkUm91dGVgLicpO1xuXG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBsZXQgZG9tYWluID0gJ2FuZ3VsYXIuaW8nO1xuXG4gICAgaWYgKG9wdGlvbnMudmVyc2lvbikge1xuICAgICAgLy8gdmVyc2lvbiBjYW4gZWl0aGVyIGJlIGEgc3RyaW5nIGNvbnRhaW5pbmcgXCJuZXh0XCJcbiAgICAgIGlmIChvcHRpb25zLnZlcnNpb24gPT0gJ25leHQnKSB7XG4gICAgICAgIGRvbWFpbiA9ICduZXh0LmFuZ3VsYXIuaW8nO1xuICAgICAgICAvLyBvciBhIG51bWJlciB3aGVyZSB2ZXJzaW9uIG11c3QgYmUgYSB2YWxpZCBBbmd1bGFyIHZlcnNpb24gKGkuZS4gbm90IDAsIDEgb3IgMylcbiAgICAgIH0gZWxzZSBpZiAoIWlzTmFOKCtvcHRpb25zLnZlcnNpb24pICYmICFbMCwgMSwgM10uaW5jbHVkZXMoK29wdGlvbnMudmVyc2lvbikpIHtcbiAgICAgICAgZG9tYWluID0gYHYke29wdGlvbnMudmVyc2lvbn0uYW5ndWxhci5pb2A7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmVyc2lvbiBzaG91bGQgZWl0aGVyIGJlIGEgbnVtYmVyICgyLCA0LCA1LCA2Li4uKSBvciBcIm5leHRcIicpO1xuXG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyB3ZSB0cnkgdG8gZ2V0IHRoZSBjdXJyZW50IEFuZ3VsYXIgdmVyc2lvbiBvZiB0aGUgcHJvamVjdFxuICAgICAgLy8gYW5kIHVzZSBpdCBpZiB3ZSBjYW4gZmluZCBpdFxuICAgICAgdHJ5IHtcbiAgICAgICAgLyogZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGltcG9ydC9uby1leHRyYW5lb3VzLWRlcGVuZGVuY2llcyAqL1xuICAgICAgICBjb25zdCBjdXJyZW50TmdWZXJzaW9uID0gKGF3YWl0IGltcG9ydCgnQGFuZ3VsYXIvY29yZScpKS5WRVJTSU9OLm1ham9yO1xuICAgICAgICBkb21haW4gPSBgdiR7Y3VycmVudE5nVmVyc2lvbn0uYW5ndWxhci5pb2A7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfVxuXG4gICAgYXdhaXQgb3BlbihcbiAgICAgIG9wdGlvbnMuc2VhcmNoXG4gICAgICAgID8gYGh0dHBzOi8vJHtkb21haW59L2FwaT9xdWVyeT0ke29wdGlvbnMua2V5d29yZH1gXG4gICAgICAgIDogYGh0dHBzOi8vJHtkb21haW59L2RvY3M/c2VhcmNoPSR7b3B0aW9ucy5rZXl3b3JkfWAsXG4gICAgKTtcbiAgfVxufVxuIl19