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
exports.DocCommandModule = void 0;
const open_1 = __importDefault(require("open"));
const command_module_1 = require("../../command-builder/command-module");
class DocCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'doc <keyword>';
        this.aliases = ['d'];
        this.describe = 'Opens the official Angular documentation (angular.io) in a browser, and searches for a given keyword.';
    }
    builder(localYargs) {
        return localYargs
            .positional('keyword', {
            description: 'The keyword to search for, as provided in the search bar in angular.io.',
            type: 'string',
            demandOption: true,
        })
            .option('search', {
            description: `Search all of angular.io. Otherwise, searches only API reference documentation.`,
            alias: ['s'],
            type: 'boolean',
            default: false,
        })
            .option('version', {
            description: 'Contains the version of Angular to use for the documentation. ' +
                'If not provided, the command uses your current Angular core version.',
            type: 'string',
        })
            .strict();
    }
    async run(options) {
        let domain = 'angular.io';
        if (options.version) {
            // version can either be a string containing "next"
            if (options.version === 'next') {
                domain = 'next.angular.io';
            }
            else if (options.version === 'rc') {
                domain = 'rc.angular.io';
                // or a number where version must be a valid Angular version (i.e. not 0, 1 or 3)
            }
            else if (!isNaN(+options.version) && ![0, 1, 3].includes(+options.version)) {
                domain = `v${options.version}.angular.io`;
            }
            else {
                this.context.logger.error('Version should either be a number (2, 4, 5, 6...), "rc" or "next"');
                return 1;
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
exports.DocCommandModule = DocCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2RvYy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGdEQUF3QjtBQUV4Qix5RUFJOEM7QUFROUMsTUFBYSxnQkFDWCxTQUFRLDhCQUE2QjtJQUR2Qzs7UUFJRSxZQUFPLEdBQUcsZUFBZSxDQUFDO1FBQzFCLFlBQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLGFBQVEsR0FDTix1R0FBdUcsQ0FBQztJQTRENUcsQ0FBQztJQXpEQyxPQUFPLENBQUMsVUFBZ0I7UUFDdEIsT0FBTyxVQUFVO2FBQ2QsVUFBVSxDQUFDLFNBQVMsRUFBRTtZQUNyQixXQUFXLEVBQUUseUVBQXlFO1lBQ3RGLElBQUksRUFBRSxRQUFRO1lBQ2QsWUFBWSxFQUFFLElBQUk7U0FDbkIsQ0FBQzthQUNELE1BQU0sQ0FBQyxRQUFRLEVBQUU7WUFDaEIsV0FBVyxFQUFFLGlGQUFpRjtZQUM5RixLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUM7WUFDWixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQzthQUNELE1BQU0sQ0FBQyxTQUFTLEVBQUU7WUFDakIsV0FBVyxFQUNULGdFQUFnRTtnQkFDaEUsc0VBQXNFO1lBQ3hFLElBQUksRUFBRSxRQUFRO1NBQ2YsQ0FBQzthQUNELE1BQU0sRUFBRSxDQUFDO0lBQ2QsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBZ0M7UUFDeEMsSUFBSSxNQUFNLEdBQUcsWUFBWSxDQUFDO1FBRTFCLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNuQixtREFBbUQ7WUFDbkQsSUFBSSxPQUFPLENBQUMsT0FBTyxLQUFLLE1BQU0sRUFBRTtnQkFDOUIsTUFBTSxHQUFHLGlCQUFpQixDQUFDO2FBQzVCO2lCQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sS0FBSyxJQUFJLEVBQUU7Z0JBQ25DLE1BQU0sR0FBRyxlQUFlLENBQUM7Z0JBQ3pCLGlGQUFpRjthQUNsRjtpQkFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDNUUsTUFBTSxHQUFHLElBQUksT0FBTyxDQUFDLE9BQU8sYUFBYSxDQUFDO2FBQzNDO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FDdkIsbUVBQW1FLENBQ3BFLENBQUM7Z0JBRUYsT0FBTyxDQUFDLENBQUM7YUFDVjtTQUNGO2FBQU07WUFDTCwyREFBMkQ7WUFDM0QsK0JBQStCO1lBQy9CLElBQUk7Z0JBQ0YsZ0VBQWdFO2dCQUNoRSxNQUFNLGdCQUFnQixHQUFHLENBQUMsd0RBQWEsZUFBZSxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO2dCQUN2RSxNQUFNLEdBQUcsSUFBSSxnQkFBZ0IsYUFBYSxDQUFDO2FBQzVDO1lBQUMsV0FBTSxHQUFFO1NBQ1g7UUFFRCxNQUFNLElBQUEsY0FBSSxFQUNSLE9BQU8sQ0FBQyxNQUFNO1lBQ1osQ0FBQyxDQUFDLFdBQVcsTUFBTSxjQUFjLE9BQU8sQ0FBQyxPQUFPLEVBQUU7WUFDbEQsQ0FBQyxDQUFDLFdBQVcsTUFBTSxnQkFBZ0IsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUN2RCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBbkVELDRDQW1FQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgb3BlbiBmcm9tICdvcGVuJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIE9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5cbmludGVyZmFjZSBEb2NDb21tYW5kQXJncyB7XG4gIGtleXdvcmQ6IHN0cmluZztcbiAgc2VhcmNoPzogYm9vbGVhbjtcbiAgdmVyc2lvbj86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIERvY0NvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBDb21tYW5kTW9kdWxlPERvY0NvbW1hbmRBcmdzPlxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxEb2NDb21tYW5kQXJncz5cbntcbiAgY29tbWFuZCA9ICdkb2MgPGtleXdvcmQ+JztcbiAgYWxpYXNlcyA9IFsnZCddO1xuICBkZXNjcmliZSA9XG4gICAgJ09wZW5zIHRoZSBvZmZpY2lhbCBBbmd1bGFyIGRvY3VtZW50YXRpb24gKGFuZ3VsYXIuaW8pIGluIGEgYnJvd3NlciwgYW5kIHNlYXJjaGVzIGZvciBhIGdpdmVuIGtleXdvcmQuJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2PERvY0NvbW1hbmRBcmdzPiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3NcbiAgICAgIC5wb3NpdGlvbmFsKCdrZXl3b3JkJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBrZXl3b3JkIHRvIHNlYXJjaCBmb3IsIGFzIHByb3ZpZGVkIGluIHRoZSBzZWFyY2ggYmFyIGluIGFuZ3VsYXIuaW8uJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGRlbWFuZE9wdGlvbjogdHJ1ZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdzZWFyY2gnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiBgU2VhcmNoIGFsbCBvZiBhbmd1bGFyLmlvLiBPdGhlcndpc2UsIHNlYXJjaGVzIG9ubHkgQVBJIHJlZmVyZW5jZSBkb2N1bWVudGF0aW9uLmAsXG4gICAgICAgIGFsaWFzOiBbJ3MnXSxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCd2ZXJzaW9uJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAnQ29udGFpbnMgdGhlIHZlcnNpb24gb2YgQW5ndWxhciB0byB1c2UgZm9yIHRoZSBkb2N1bWVudGF0aW9uLiAnICtcbiAgICAgICAgICAnSWYgbm90IHByb3ZpZGVkLCB0aGUgY29tbWFuZCB1c2VzIHlvdXIgY3VycmVudCBBbmd1bGFyIGNvcmUgdmVyc2lvbi4nLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIH0pXG4gICAgICAuc3RyaWN0KCk7XG4gIH1cblxuICBhc3luYyBydW4ob3B0aW9uczogT3B0aW9uczxEb2NDb21tYW5kQXJncz4pOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBsZXQgZG9tYWluID0gJ2FuZ3VsYXIuaW8nO1xuXG4gICAgaWYgKG9wdGlvbnMudmVyc2lvbikge1xuICAgICAgLy8gdmVyc2lvbiBjYW4gZWl0aGVyIGJlIGEgc3RyaW5nIGNvbnRhaW5pbmcgXCJuZXh0XCJcbiAgICAgIGlmIChvcHRpb25zLnZlcnNpb24gPT09ICduZXh0Jykge1xuICAgICAgICBkb21haW4gPSAnbmV4dC5hbmd1bGFyLmlvJztcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy52ZXJzaW9uID09PSAncmMnKSB7XG4gICAgICAgIGRvbWFpbiA9ICdyYy5hbmd1bGFyLmlvJztcbiAgICAgICAgLy8gb3IgYSBudW1iZXIgd2hlcmUgdmVyc2lvbiBtdXN0IGJlIGEgdmFsaWQgQW5ndWxhciB2ZXJzaW9uIChpLmUuIG5vdCAwLCAxIG9yIDMpXG4gICAgICB9IGVsc2UgaWYgKCFpc05hTigrb3B0aW9ucy52ZXJzaW9uKSAmJiAhWzAsIDEsIDNdLmluY2x1ZGVzKCtvcHRpb25zLnZlcnNpb24pKSB7XG4gICAgICAgIGRvbWFpbiA9IGB2JHtvcHRpb25zLnZlcnNpb259LmFuZ3VsYXIuaW9gO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAnVmVyc2lvbiBzaG91bGQgZWl0aGVyIGJlIGEgbnVtYmVyICgyLCA0LCA1LCA2Li4uKSwgXCJyY1wiIG9yIFwibmV4dFwiJyxcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gd2UgdHJ5IHRvIGdldCB0aGUgY3VycmVudCBBbmd1bGFyIHZlcnNpb24gb2YgdGhlIHByb2plY3RcbiAgICAgIC8vIGFuZCB1c2UgaXQgaWYgd2UgY2FuIGZpbmQgaXRcbiAgICAgIHRyeSB7XG4gICAgICAgIC8qIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBpbXBvcnQvbm8tZXh0cmFuZW91cy1kZXBlbmRlbmNpZXMgKi9cbiAgICAgICAgY29uc3QgY3VycmVudE5nVmVyc2lvbiA9IChhd2FpdCBpbXBvcnQoJ0Bhbmd1bGFyL2NvcmUnKSkuVkVSU0lPTi5tYWpvcjtcbiAgICAgICAgZG9tYWluID0gYHYke2N1cnJlbnROZ1ZlcnNpb259LmFuZ3VsYXIuaW9gO1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cblxuICAgIGF3YWl0IG9wZW4oXG4gICAgICBvcHRpb25zLnNlYXJjaFxuICAgICAgICA/IGBodHRwczovLyR7ZG9tYWlufS9hcGk/cXVlcnk9JHtvcHRpb25zLmtleXdvcmR9YFxuICAgICAgICA6IGBodHRwczovLyR7ZG9tYWlufS9kb2NzP3NlYXJjaD0ke29wdGlvbnMua2V5d29yZH1gLFxuICAgICk7XG4gIH1cbn1cbiJdfQ==