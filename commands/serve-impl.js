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
class ServeCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.target = 'serve';
    }
    validate(_options) {
        // Check Angular and TypeScript versions.
        version_1.Version.assertCompatibleAngularVersion(this.workspace.root);
        version_1.Version.assertTypescriptVersion(this.workspace.root);
        return true;
    }
    async run(options) {
        return this.runArchitectTarget(options);
    }
}
exports.ServeCommand = ServeCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmUtaW1wbC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvc2VydmUtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVILG1FQUF3RjtBQUN4RixnREFBNkM7QUFHN0MsTUFBYSxZQUFhLFNBQVEsb0NBQWdCO0lBQWxEOztRQUNrQixXQUFNLEdBQUcsT0FBTyxDQUFDO0lBYW5DLENBQUM7SUFYUSxRQUFRLENBQUMsUUFBaUM7UUFDL0MseUNBQXlDO1FBQ3pDLGlCQUFPLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1RCxpQkFBTyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFckQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFnQztRQUMvQyxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMxQyxDQUFDO0NBQ0Y7QUFkRCxvQ0FjQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQXJjaGl0ZWN0Q29tbWFuZCwgQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgfSBmcm9tICcuLi9tb2RlbHMvYXJjaGl0ZWN0LWNvbW1hbmQnO1xuaW1wb3J0IHsgVmVyc2lvbiB9IGZyb20gJy4uL3VwZ3JhZGUvdmVyc2lvbic7XG5cblxuZXhwb3J0IGNsYXNzIFNlcnZlQ29tbWFuZCBleHRlbmRzIEFyY2hpdGVjdENvbW1hbmQge1xuICBwdWJsaWMgcmVhZG9ubHkgdGFyZ2V0ID0gJ3NlcnZlJztcblxuICBwdWJsaWMgdmFsaWRhdGUoX29wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKSB7XG4gICAgLy8gQ2hlY2sgQW5ndWxhciBhbmQgVHlwZVNjcmlwdCB2ZXJzaW9ucy5cbiAgICBWZXJzaW9uLmFzc2VydENvbXBhdGlibGVBbmd1bGFyVmVyc2lvbih0aGlzLndvcmtzcGFjZS5yb290KTtcbiAgICBWZXJzaW9uLmFzc2VydFR5cGVzY3JpcHRWZXJzaW9uKHRoaXMud29ya3NwYWNlLnJvb3QpO1xuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMucnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnMpO1xuICB9XG59XG4iXX0=