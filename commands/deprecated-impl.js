"use strict";
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
    async run() {
        let message = 'The "${this.description.name}" command has been deprecated.';
        if (this.description.name == 'get' || this.description.name == 'set') {
            message = 'get/set have been deprecated in favor of the config command.';
        }
        this.logger.error(message);
        return 0;
    }
}
exports.DeprecatedCommand = DeprecatedCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwcmVjYXRlZC1pbXBsLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9kZXByZWNhdGVkLWltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwrQ0FBNEM7QUFFNUMsTUFBYSxpQkFBa0IsU0FBUSxpQkFBTztJQUNyQyxLQUFLLENBQUMsR0FBRztRQUNkLElBQUksT0FBTyxHQUFHLDZEQUE2RCxDQUFDO1FBQzVFLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLEtBQUssRUFBRTtZQUNwRSxPQUFPLEdBQUcsOERBQThELENBQUM7U0FDMUU7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUUzQixPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7Q0FDRjtBQVhELDhDQVdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcblxuZXhwb3J0IGNsYXNzIERlcHJlY2F0ZWRDb21tYW5kIGV4dGVuZHMgQ29tbWFuZCB7XG4gIHB1YmxpYyBhc3luYyBydW4oKSB7XG4gICAgbGV0IG1lc3NhZ2UgPSAnVGhlIFwiJHt0aGlzLmRlc2NyaXB0aW9uLm5hbWV9XCIgY29tbWFuZCBoYXMgYmVlbiBkZXByZWNhdGVkLic7XG4gICAgaWYgKHRoaXMuZGVzY3JpcHRpb24ubmFtZSA9PSAnZ2V0JyB8fCB0aGlzLmRlc2NyaXB0aW9uLm5hbWUgPT0gJ3NldCcpIHtcbiAgICAgIG1lc3NhZ2UgPSAnZ2V0L3NldCBoYXZlIGJlZW4gZGVwcmVjYXRlZCBpbiBmYXZvciBvZiB0aGUgY29uZmlnIGNvbW1hbmQuJztcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5lcnJvcihtZXNzYWdlKTtcblxuICAgIHJldHVybiAwO1xuICB9XG59XG4iXX0=