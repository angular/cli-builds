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
class Xi18nCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.target = 'extract-i18n';
    }
    async run(options) {
        return this.runArchitectTarget(options);
    }
}
exports.Xi18nCommand = Xi18nCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieGkxOG4taW1wbC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMveGkxOG4taW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVILG1FQUF3RjtBQUd4RixNQUFhLFlBQWEsU0FBUSxvQ0FBZ0I7SUFBbEQ7O1FBQ2tCLFdBQU0sR0FBRyxjQUFjLENBQUM7SUFNMUMsQ0FBQztJQUhRLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBZ0M7UUFDL0MsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDMUMsQ0FBQztDQUNGO0FBUEQsb0NBT0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEFyY2hpdGVjdENvbW1hbmQsIEFyY2hpdGVjdENvbW1hbmRPcHRpb25zIH0gZnJvbSAnLi4vbW9kZWxzL2FyY2hpdGVjdC1jb21tYW5kJztcblxuXG5leHBvcnQgY2xhc3MgWGkxOG5Db21tYW5kIGV4dGVuZHMgQXJjaGl0ZWN0Q29tbWFuZCB7XG4gIHB1YmxpYyByZWFkb25seSB0YXJnZXQgPSAnZXh0cmFjdC1pMThuJztcbiAgcHVibGljIHJlYWRvbmx5IG11bHRpVGFyZ2V0OiB0cnVlO1xuXG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5ydW5BcmNoaXRlY3RUYXJnZXQob3B0aW9ucyk7XG4gIH1cbn1cbiJdfQ==