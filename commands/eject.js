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
    constructor() {
        super(...arguments);
        this.name = 'eject';
        this.description = 'Temporarily disabled. Ejects your app and output the proper '
            + 'webpack configuration and scripts.';
        this.arguments = [];
        this.options = [];
    }
    run() {
        this.logger.info(core_1.tags.stripIndents `
      The 'eject' command has been temporarily disabled, as it is not yet compatible with the new
      angular.json format. The new configuration format provides further flexibility to modify the
      configuration of your workspace without ejecting. Ejection will be re-enabled in a future
      release of the CLI.

      If you need to eject today, use CLI 1.7 to eject your project.
    `);
    }
}
exports.default = EjectCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWplY3QuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2VqZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQTRDO0FBQzVDLCtDQUFvRDtBQUdwRCxrQkFBa0MsU0FBUSxpQkFBTztJQUFqRDs7UUFDa0IsU0FBSSxHQUFHLE9BQU8sQ0FBQztRQUNmLGdCQUFXLEdBQUcsOERBQThEO2NBQzlELG9DQUFvQyxDQUFDO1FBQ25ELGNBQVMsR0FBYSxFQUFFLENBQUM7UUFDekIsWUFBTyxHQUFhLEVBQUUsQ0FBQztJQVl6QyxDQUFDO0lBVkMsR0FBRztRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBQyxZQUFZLENBQUE7Ozs7Ozs7S0FPakMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBakJELCtCQWlCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IENvbW1hbmQsIE9wdGlvbiB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFamVjdENvbW1hbmQgZXh0ZW5kcyBDb21tYW5kIHtcbiAgcHVibGljIHJlYWRvbmx5IG5hbWUgPSAnZWplY3QnO1xuICBwdWJsaWMgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSAnVGVtcG9yYXJpbHkgZGlzYWJsZWQuIEVqZWN0cyB5b3VyIGFwcCBhbmQgb3V0cHV0IHRoZSBwcm9wZXIgJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKyAnd2VicGFjayBjb25maWd1cmF0aW9uIGFuZCBzY3JpcHRzLic7XG4gIHB1YmxpYyByZWFkb25seSBhcmd1bWVudHM6IHN0cmluZ1tdID0gW107XG4gIHB1YmxpYyByZWFkb25seSBvcHRpb25zOiBPcHRpb25bXSA9IFtdO1xuXG4gIHJ1bigpIHtcbiAgICB0aGlzLmxvZ2dlci5pbmZvKHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgVGhlICdlamVjdCcgY29tbWFuZCBoYXMgYmVlbiB0ZW1wb3JhcmlseSBkaXNhYmxlZCwgYXMgaXQgaXMgbm90IHlldCBjb21wYXRpYmxlIHdpdGggdGhlIG5ld1xuICAgICAgYW5ndWxhci5qc29uIGZvcm1hdC4gVGhlIG5ldyBjb25maWd1cmF0aW9uIGZvcm1hdCBwcm92aWRlcyBmdXJ0aGVyIGZsZXhpYmlsaXR5IHRvIG1vZGlmeSB0aGVcbiAgICAgIGNvbmZpZ3VyYXRpb24gb2YgeW91ciB3b3Jrc3BhY2Ugd2l0aG91dCBlamVjdGluZy4gRWplY3Rpb24gd2lsbCBiZSByZS1lbmFibGVkIGluIGEgZnV0dXJlXG4gICAgICByZWxlYXNlIG9mIHRoZSBDTEkuXG5cbiAgICAgIElmIHlvdSBuZWVkIHRvIGVqZWN0IHRvZGF5LCB1c2UgQ0xJIDEuNyB0byBlamVjdCB5b3VyIHByb2plY3QuXG4gICAgYCk7XG4gIH1cbn1cbiJdfQ==