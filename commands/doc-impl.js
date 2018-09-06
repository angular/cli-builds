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
const command_1 = require("../models/command");
const opn = require('opn');
class DocCommand extends command_1.Command {
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            let searchUrl = `https://angular.io/api?query=${options.keyword}`;
            if (options.search) {
                searchUrl = `https://www.google.com/search?q=site%3Aangular.io+${options.keyword}`;
            }
            return opn(searchUrl, {
                wait: false,
            });
        });
    }
}
exports.DocCommand = DocCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2RvYy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCwrQ0FBZ0U7QUFDaEUsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBTzNCLE1BQWEsVUFBNEQsU0FBUSxpQkFBVTtJQUM1RSxHQUFHLENBQUMsT0FBVTs7WUFDekIsSUFBSSxTQUFTLEdBQUcsZ0NBQWdDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsRSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7Z0JBQ2xCLFNBQVMsR0FBRyxxREFBcUQsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQ3BGO1lBRUQsT0FBTyxHQUFHLENBQUMsU0FBUyxFQUFFO2dCQUNwQixJQUFJLEVBQUUsS0FBSzthQUNaLENBQUMsQ0FBQztRQUNMLENBQUM7S0FBQTtDQUNGO0FBWEQsZ0NBV0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEJhc2VDb21tYW5kT3B0aW9ucywgQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcbmNvbnN0IG9wbiA9IHJlcXVpcmUoJ29wbicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIERvY0NvbW1hbmRPcHRpb25zIGV4dGVuZHMgQmFzZUNvbW1hbmRPcHRpb25zIHtcbiAga2V5d29yZDogc3RyaW5nO1xuICBzZWFyY2g/OiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgRG9jQ29tbWFuZDxUIGV4dGVuZHMgRG9jQ29tbWFuZE9wdGlvbnMgPSBEb2NDb21tYW5kT3B0aW9ucz4gZXh0ZW5kcyBDb21tYW5kPFQ+IHtcbiAgcHVibGljIGFzeW5jIHJ1bihvcHRpb25zOiBUKSB7XG4gICAgbGV0IHNlYXJjaFVybCA9IGBodHRwczovL2FuZ3VsYXIuaW8vYXBpP3F1ZXJ5PSR7b3B0aW9ucy5rZXl3b3JkfWA7XG4gICAgaWYgKG9wdGlvbnMuc2VhcmNoKSB7XG4gICAgICBzZWFyY2hVcmwgPSBgaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9zZWFyY2g/cT1zaXRlJTNBYW5ndWxhci5pbyske29wdGlvbnMua2V5d29yZH1gO1xuICAgIH1cblxuICAgIHJldHVybiBvcG4oc2VhcmNoVXJsLCB7XG4gICAgICB3YWl0OiBmYWxzZSxcbiAgICB9KTtcbiAgfVxufVxuIl19