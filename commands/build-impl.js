"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const architect_command_1 = require("../models/architect-command");
const version_1 = require("../upgrade/version");
class BuildCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.target = 'build';
    }
    async run(options) {
        // Check Angular and TypeScript versions.
        version_1.Version.assertCompatibleAngularVersion(this.workspace.root);
        version_1.Version.assertTypescriptVersion(this.workspace.root);
        return this.runArchitectTarget(options);
    }
}
exports.BuildCommand = BuildCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQtaW1wbC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvYnVpbGQtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVILG1FQUF3RjtBQUN4RixnREFBNkM7QUFFN0MsTUFBYSxZQUFhLFNBQVEsb0NBQWdCO0lBQWxEOztRQUNrQixXQUFNLEdBQUcsT0FBTyxDQUFDO0lBU25DLENBQUM7SUFQUSxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQWdDO1FBQy9DLHlDQUF5QztRQUN6QyxpQkFBTyxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUQsaUJBQU8sQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXJELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzFDLENBQUM7Q0FDRjtBQVZELG9DQVVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBBcmNoaXRlY3RDb21tYW5kLCBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyB9IGZyb20gJy4uL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZCc7XG5pbXBvcnQgeyBWZXJzaW9uIH0gZnJvbSAnLi4vdXBncmFkZS92ZXJzaW9uJztcblxuZXhwb3J0IGNsYXNzIEJ1aWxkQ29tbWFuZCBleHRlbmRzIEFyY2hpdGVjdENvbW1hbmQge1xuICBwdWJsaWMgcmVhZG9ubHkgdGFyZ2V0ID0gJ2J1aWxkJztcblxuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKSB7XG4gICAgLy8gQ2hlY2sgQW5ndWxhciBhbmQgVHlwZVNjcmlwdCB2ZXJzaW9ucy5cbiAgICBWZXJzaW9uLmFzc2VydENvbXBhdGlibGVBbmd1bGFyVmVyc2lvbih0aGlzLndvcmtzcGFjZS5yb290KTtcbiAgICBWZXJzaW9uLmFzc2VydFR5cGVzY3JpcHRWZXJzaW9uKHRoaXMud29ya3NwYWNlLnJvb3QpO1xuXG4gICAgcmV0dXJuIHRoaXMucnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnMpO1xuICB9XG59XG4iXX0=