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
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jLWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9kb2MtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGdEQUF3QjtBQUN4QiwrQ0FBNEM7QUFJNUMsTUFBYSxVQUFXLFNBQVEsaUJBQXlCO0lBQ2hELEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBcUM7UUFDcEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7WUFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0VBQXNFLENBQUMsQ0FBQztZQUUxRixPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsSUFBSSxNQUFNLEdBQUcsWUFBWSxDQUFDO1FBRTFCLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNuQixtREFBbUQ7WUFDbkQsSUFBSSxPQUFPLENBQUMsT0FBTyxJQUFJLE1BQU0sRUFBRTtnQkFDN0IsTUFBTSxHQUFHLGlCQUFpQixDQUFDO2dCQUMzQixpRkFBaUY7YUFDbEY7aUJBQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQzVFLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBQyxPQUFPLGFBQWEsQ0FBQzthQUMzQztpQkFBTTtnQkFDTCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyw2REFBNkQsQ0FBQyxDQUFDO2dCQUVqRixPQUFPLENBQUMsQ0FBQzthQUNWO1NBQ0Y7YUFBTTtZQUNMLDJEQUEyRDtZQUMzRCwrQkFBK0I7WUFDL0IsSUFBSTtnQkFDRixnRUFBZ0U7Z0JBQ2hFLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyx3REFBYSxlQUFlLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7Z0JBQ3ZFLE1BQU0sR0FBRyxJQUFJLGdCQUFnQixhQUFhLENBQUM7YUFDNUM7WUFBQyxXQUFNLEdBQUU7U0FDWDtRQUVELE1BQU0sSUFBQSxjQUFJLEVBQ1IsT0FBTyxDQUFDLE1BQU07WUFDWixDQUFDLENBQUMsV0FBVyxNQUFNLGNBQWMsT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNsRCxDQUFDLENBQUMsV0FBVyxNQUFNLGdCQUFnQixPQUFPLENBQUMsT0FBTyxFQUFFLENBQ3ZELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUF0Q0QsZ0NBc0NDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCBvcGVuIGZyb20gJ29wZW4nO1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcbmltcG9ydCB7IEFyZ3VtZW50cyB9IGZyb20gJy4uL21vZGVscy9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIERvY0NvbW1hbmRTY2hlbWEgfSBmcm9tICcuL2RvYyc7XG5cbmV4cG9ydCBjbGFzcyBEb2NDb21tYW5kIGV4dGVuZHMgQ29tbWFuZDxEb2NDb21tYW5kU2NoZW1hPiB7XG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogRG9jQ29tbWFuZFNjaGVtYSAmIEFyZ3VtZW50cykge1xuICAgIGlmICghb3B0aW9ucy5rZXl3b3JkKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignWW91IHNob3VsZCBzcGVjaWZ5IGEga2V5d29yZCwgZm9yIGluc3RhbmNlLCBgbmcgZG9jIEFjdGl2YXRlZFJvdXRlYC4nKTtcblxuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgbGV0IGRvbWFpbiA9ICdhbmd1bGFyLmlvJztcblxuICAgIGlmIChvcHRpb25zLnZlcnNpb24pIHtcbiAgICAgIC8vIHZlcnNpb24gY2FuIGVpdGhlciBiZSBhIHN0cmluZyBjb250YWluaW5nIFwibmV4dFwiXG4gICAgICBpZiAob3B0aW9ucy52ZXJzaW9uID09ICduZXh0Jykge1xuICAgICAgICBkb21haW4gPSAnbmV4dC5hbmd1bGFyLmlvJztcbiAgICAgICAgLy8gb3IgYSBudW1iZXIgd2hlcmUgdmVyc2lvbiBtdXN0IGJlIGEgdmFsaWQgQW5ndWxhciB2ZXJzaW9uIChpLmUuIG5vdCAwLCAxIG9yIDMpXG4gICAgICB9IGVsc2UgaWYgKCFpc05hTigrb3B0aW9ucy52ZXJzaW9uKSAmJiAhWzAsIDEsIDNdLmluY2x1ZGVzKCtvcHRpb25zLnZlcnNpb24pKSB7XG4gICAgICAgIGRvbWFpbiA9IGB2JHtvcHRpb25zLnZlcnNpb259LmFuZ3VsYXIuaW9gO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZlcnNpb24gc2hvdWxkIGVpdGhlciBiZSBhIG51bWJlciAoMiwgNCwgNSwgNi4uLikgb3IgXCJuZXh0XCInKTtcblxuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gd2UgdHJ5IHRvIGdldCB0aGUgY3VycmVudCBBbmd1bGFyIHZlcnNpb24gb2YgdGhlIHByb2plY3RcbiAgICAgIC8vIGFuZCB1c2UgaXQgaWYgd2UgY2FuIGZpbmQgaXRcbiAgICAgIHRyeSB7XG4gICAgICAgIC8qIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBpbXBvcnQvbm8tZXh0cmFuZW91cy1kZXBlbmRlbmNpZXMgKi9cbiAgICAgICAgY29uc3QgY3VycmVudE5nVmVyc2lvbiA9IChhd2FpdCBpbXBvcnQoJ0Bhbmd1bGFyL2NvcmUnKSkuVkVSU0lPTi5tYWpvcjtcbiAgICAgICAgZG9tYWluID0gYHYke2N1cnJlbnROZ1ZlcnNpb259LmFuZ3VsYXIuaW9gO1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cblxuICAgIGF3YWl0IG9wZW4oXG4gICAgICBvcHRpb25zLnNlYXJjaFxuICAgICAgICA/IGBodHRwczovLyR7ZG9tYWlufS9hcGk/cXVlcnk9JHtvcHRpb25zLmtleXdvcmR9YFxuICAgICAgICA6IGBodHRwczovLyR7ZG9tYWlufS9kb2NzP3NlYXJjaD0ke29wdGlvbnMua2V5d29yZH1gLFxuICAgICk7XG4gIH1cbn1cbiJdfQ==