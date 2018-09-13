"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const command_1 = require("../models/command");
class EjectCommand extends command_1.Command {
    async run() {
        this.logger.error(core_1.tags.stripIndents `
      The 'eject' command has been temporarily disabled, as it is not yet compatible with the new
      angular.json format. The new configuration format provides further flexibility to modify the
      configuration of your workspace without ejecting. Ejection will be re-enabled in a future
      release of the CLI.

      If you need to eject today, use CLI 1.7 to eject your project.
    `);
        return 1;
    }
}
exports.EjectCommand = EjectCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWplY3QtaW1wbC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvZWplY3QtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVILCtDQUE0QztBQUM1QywrQ0FBNEM7QUFHNUMsTUFBYSxZQUFhLFNBQVEsaUJBQU87SUFDdkMsS0FBSyxDQUFDLEdBQUc7UUFDUCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFJLENBQUMsWUFBWSxDQUFBOzs7Ozs7O0tBT2xDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztDQUNGO0FBYkQsb0NBYUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL2NvbW1hbmQnO1xuXG5cbmV4cG9ydCBjbGFzcyBFamVjdENvbW1hbmQgZXh0ZW5kcyBDb21tYW5kIHtcbiAgYXN5bmMgcnVuKCkge1xuICAgIHRoaXMubG9nZ2VyLmVycm9yKHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgVGhlICdlamVjdCcgY29tbWFuZCBoYXMgYmVlbiB0ZW1wb3JhcmlseSBkaXNhYmxlZCwgYXMgaXQgaXMgbm90IHlldCBjb21wYXRpYmxlIHdpdGggdGhlIG5ld1xuICAgICAgYW5ndWxhci5qc29uIGZvcm1hdC4gVGhlIG5ldyBjb25maWd1cmF0aW9uIGZvcm1hdCBwcm92aWRlcyBmdXJ0aGVyIGZsZXhpYmlsaXR5IHRvIG1vZGlmeSB0aGVcbiAgICAgIGNvbmZpZ3VyYXRpb24gb2YgeW91ciB3b3Jrc3BhY2Ugd2l0aG91dCBlamVjdGluZy4gRWplY3Rpb24gd2lsbCBiZSByZS1lbmFibGVkIGluIGEgZnV0dXJlXG4gICAgICByZWxlYXNlIG9mIHRoZSBDTEkuXG5cbiAgICAgIElmIHlvdSBuZWVkIHRvIGVqZWN0IHRvZGF5LCB1c2UgQ0xJIDEuNyB0byBlamVjdCB5b3VyIHByb2plY3QuXG4gICAgYCk7XG5cbiAgICByZXR1cm4gMTtcbiAgfVxufVxuIl19