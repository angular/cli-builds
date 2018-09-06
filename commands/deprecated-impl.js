"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const command_1 = require("../models/command");
class DeprecatedCommand extends command_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            let message = 'The "${this.description.name}" command has been deprecated.';
            if (this.description.name == 'get' || this.description.name == 'set') {
                message = 'get/set have been deprecated in favor of the config command.';
            }
            this.logger.error(message);
            return 0;
        });
    }
}
exports.DeprecatedCommand = DeprecatedCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwcmVjYXRlZC1pbXBsLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9kZXByZWNhdGVkLWltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUE0QztBQUU1QyxNQUFhLGlCQUFrQixTQUFRLGlCQUFPO0lBQy9CLEdBQUc7O1lBQ2QsSUFBSSxPQUFPLEdBQUcsNkRBQTZELENBQUM7WUFDNUUsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUksS0FBSyxFQUFFO2dCQUNwRSxPQUFPLEdBQUcsOERBQThELENBQUM7YUFDMUU7WUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUzQixPQUFPLENBQUMsQ0FBQztRQUNYLENBQUM7S0FBQTtDQUNGO0FBWEQsOENBV0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL2NvbW1hbmQnO1xuXG5leHBvcnQgY2xhc3MgRGVwcmVjYXRlZENvbW1hbmQgZXh0ZW5kcyBDb21tYW5kIHtcbiAgcHVibGljIGFzeW5jIHJ1bigpIHtcbiAgICBsZXQgbWVzc2FnZSA9ICdUaGUgXCIke3RoaXMuZGVzY3JpcHRpb24ubmFtZX1cIiBjb21tYW5kIGhhcyBiZWVuIGRlcHJlY2F0ZWQuJztcbiAgICBpZiAodGhpcy5kZXNjcmlwdGlvbi5uYW1lID09ICdnZXQnIHx8IHRoaXMuZGVzY3JpcHRpb24ubmFtZSA9PSAnc2V0Jykge1xuICAgICAgbWVzc2FnZSA9ICdnZXQvc2V0IGhhdmUgYmVlbiBkZXByZWNhdGVkIGluIGZhdm9yIG9mIHRoZSBjb25maWcgY29tbWFuZC4nO1xuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmVycm9yKG1lc3NhZ2UpO1xuXG4gICAgcmV0dXJuIDA7XG4gIH1cbn1cbiJdfQ==