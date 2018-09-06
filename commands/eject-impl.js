"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const command_1 = require("../models/command");
class EjectCommand extends command_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.error(core_1.tags.stripIndents `
      The 'eject' command has been temporarily disabled, as it is not yet compatible with the new
      angular.json format. The new configuration format provides further flexibility to modify the
      configuration of your workspace without ejecting. Ejection will be re-enabled in a future
      release of the CLI.

      If you need to eject today, use CLI 1.7 to eject your project.
    `);
            return 1;
        });
    }
}
exports.EjectCommand = EjectCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWplY3QtaW1wbC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvZWplY3QtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBRUgsK0NBQTRDO0FBQzVDLCtDQUE0QztBQUc1QyxrQkFBMEIsU0FBUSxpQkFBTztJQUNqQyxHQUFHOztZQUNQLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQUksQ0FBQyxZQUFZLENBQUE7Ozs7Ozs7S0FPbEMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxDQUFDLENBQUM7UUFDWCxDQUFDO0tBQUE7Q0FDRjtBQWJELG9DQWFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcblxuXG5leHBvcnQgY2xhc3MgRWplY3RDb21tYW5kIGV4dGVuZHMgQ29tbWFuZCB7XG4gIGFzeW5jIHJ1bigpIHtcbiAgICB0aGlzLmxvZ2dlci5lcnJvcih0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgIFRoZSAnZWplY3QnIGNvbW1hbmQgaGFzIGJlZW4gdGVtcG9yYXJpbHkgZGlzYWJsZWQsIGFzIGl0IGlzIG5vdCB5ZXQgY29tcGF0aWJsZSB3aXRoIHRoZSBuZXdcbiAgICAgIGFuZ3VsYXIuanNvbiBmb3JtYXQuIFRoZSBuZXcgY29uZmlndXJhdGlvbiBmb3JtYXQgcHJvdmlkZXMgZnVydGhlciBmbGV4aWJpbGl0eSB0byBtb2RpZnkgdGhlXG4gICAgICBjb25maWd1cmF0aW9uIG9mIHlvdXIgd29ya3NwYWNlIHdpdGhvdXQgZWplY3RpbmcuIEVqZWN0aW9uIHdpbGwgYmUgcmUtZW5hYmxlZCBpbiBhIGZ1dHVyZVxuICAgICAgcmVsZWFzZSBvZiB0aGUgQ0xJLlxuXG4gICAgICBJZiB5b3UgbmVlZCB0byBlamVjdCB0b2RheSwgdXNlIENMSSAxLjcgdG8gZWplY3QgeW91ciBwcm9qZWN0LlxuICAgIGApO1xuXG4gICAgcmV0dXJuIDE7XG4gIH1cbn1cbiJdfQ==