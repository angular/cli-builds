"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunCommand = void 0;
const architect_command_1 = require("../models/architect-command");
class RunCommand extends architect_command_1.ArchitectCommand {
    async run(options) {
        if (options.target) {
            return this.runArchitectTarget(options);
        }
        else {
            throw new Error('Invalid architect target.');
        }
    }
}
exports.RunCommand = RunCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuLWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9ydW4taW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCxtRUFBd0Y7QUFJeEYsTUFBYSxVQUFXLFNBQVEsb0NBQWtDO0lBQ2hELEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBNEM7UUFDcEUsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFO1lBQ2xCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ3pDO2FBQU07WUFDTCxNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7U0FDOUM7SUFDSCxDQUFDO0NBQ0Y7QUFSRCxnQ0FRQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBBcmNoaXRlY3RDb21tYW5kLCBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyB9IGZyb20gJy4uL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZCc7XG5pbXBvcnQgeyBBcmd1bWVudHMgfSBmcm9tICcuLi9tb2RlbHMvaW50ZXJmYWNlJztcbmltcG9ydCB7IFNjaGVtYSBhcyBSdW5Db21tYW5kU2NoZW1hIH0gZnJvbSAnLi9ydW4nO1xuXG5leHBvcnQgY2xhc3MgUnVuQ29tbWFuZCBleHRlbmRzIEFyY2hpdGVjdENvbW1hbmQ8UnVuQ29tbWFuZFNjaGVtYT4ge1xuICBwdWJsaWMgb3ZlcnJpZGUgYXN5bmMgcnVuKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zICYgQXJndW1lbnRzKSB7XG4gICAgaWYgKG9wdGlvbnMudGFyZ2V0KSB7XG4gICAgICByZXR1cm4gdGhpcy5ydW5BcmNoaXRlY3RUYXJnZXQob3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBhcmNoaXRlY3QgdGFyZ2V0LicpO1xuICAgIH1cbiAgfVxufVxuIl19