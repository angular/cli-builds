"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("../models/command");
const opn = require('opn');
class DocCommand extends command_1.Command {
    async run(options) {
        if (!options.keyword) {
            this.logger.error('You should specify a keyword, for instance, `ng doc ActivatedRoute`.');
            return 0;
        }
        let searchUrl = `https://angular.io/api?query=${options.keyword}`;
        if (options.search) {
            searchUrl = `https://www.google.com/search?q=site%3Aangular.io+${options.keyword}`;
        }
        return opn(searchUrl, {
            wait: false,
        });
    }
}
exports.DocCommand = DocCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2RvYy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQTRDO0FBSTVDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUUzQixNQUFhLFVBQVcsU0FBUSxpQkFBeUI7SUFDaEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFxQztRQUNwRCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxzRUFBc0UsQ0FBQyxDQUFDO1lBRTFGLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFDRCxJQUFJLFNBQVMsR0FBRyxnQ0FBZ0MsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xFLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNsQixTQUFTLEdBQUcscURBQXFELE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUNwRjtRQUVELE9BQU8sR0FBRyxDQUFDLFNBQVMsRUFBRTtZQUNwQixJQUFJLEVBQUUsS0FBSztTQUNaLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWhCRCxnQ0FnQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBBcmd1bWVudHMgfSBmcm9tICcuLi9tb2RlbHMvaW50ZXJmYWNlJztcbmltcG9ydCB7IFNjaGVtYSBhcyBEb2NDb21tYW5kU2NoZW1hIH0gZnJvbSAnLi9kb2MnO1xuXG5jb25zdCBvcG4gPSByZXF1aXJlKCdvcG4nKTtcblxuZXhwb3J0IGNsYXNzIERvY0NvbW1hbmQgZXh0ZW5kcyBDb21tYW5kPERvY0NvbW1hbmRTY2hlbWE+IHtcbiAgcHVibGljIGFzeW5jIHJ1bihvcHRpb25zOiBEb2NDb21tYW5kU2NoZW1hICYgQXJndW1lbnRzKSB7XG4gICAgaWYgKCFvcHRpb25zLmtleXdvcmQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdZb3Ugc2hvdWxkIHNwZWNpZnkgYSBrZXl3b3JkLCBmb3IgaW5zdGFuY2UsIGBuZyBkb2MgQWN0aXZhdGVkUm91dGVgLicpO1xuXG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgbGV0IHNlYXJjaFVybCA9IGBodHRwczovL2FuZ3VsYXIuaW8vYXBpP3F1ZXJ5PSR7b3B0aW9ucy5rZXl3b3JkfWA7XG4gICAgaWYgKG9wdGlvbnMuc2VhcmNoKSB7XG4gICAgICBzZWFyY2hVcmwgPSBgaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9zZWFyY2g/cT1zaXRlJTNBYW5ndWxhci5pbyske29wdGlvbnMua2V5d29yZH1gO1xuICAgIH1cblxuICAgIHJldHVybiBvcG4oc2VhcmNoVXJsLCB7XG4gICAgICB3YWl0OiBmYWxzZSxcbiAgICB9KTtcbiAgfVxufVxuIl19