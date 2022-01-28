"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractI18nCommand = void 0;
const architect_command_1 = require("../models/architect-command");
class ExtractI18nCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.target = 'extract-i18n';
    }
    async run(options) {
        const version = process.version.substr(1).split('.');
        if (Number(version[0]) === 12 && Number(version[1]) === 0) {
            this.logger.error('Due to a defect in Node.js 12.0, the command is not supported on this Node.js version. ' +
                'Please upgrade to Node.js 12.1 or later.');
            return 1;
        }
        const commandName = process.argv[2];
        if (['xi18n', 'i18n-extract'].includes(commandName)) {
            this.logger.warn(`Warning: "ng ${commandName}" has been deprecated and will be removed in a future major version. ` +
                'Please use "ng extract-i18n" instead.');
        }
        return this.runArchitectTarget(options);
    }
}
exports.ExtractI18nCommand = ExtractI18nCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdC1pMThuLWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9leHRyYWN0LWkxOG4taW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCxtRUFBK0Q7QUFJL0QsTUFBYSxrQkFBbUIsU0FBUSxvQ0FBMEM7SUFBbEY7O1FBQzJCLFdBQU0sR0FBRyxjQUFjLENBQUM7SUF1Qm5ELENBQUM7SUFyQmlCLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBNkM7UUFDckUsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JELElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3pELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNmLHlGQUF5RjtnQkFDdkYsMENBQTBDLENBQzdDLENBQUM7WUFFRixPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUNuRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDZCxnQkFBZ0IsV0FBVyx1RUFBdUU7Z0JBQ2hHLHVDQUF1QyxDQUMxQyxDQUFDO1NBQ0g7UUFFRCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMxQyxDQUFDO0NBQ0Y7QUF4QkQsZ0RBd0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEFyY2hpdGVjdENvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvYXJjaGl0ZWN0LWNvbW1hbmQnO1xuaW1wb3J0IHsgQXJndW1lbnRzIH0gZnJvbSAnLi4vbW9kZWxzL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgRXh0cmFjdEkxOG5Db21tYW5kU2NoZW1hIH0gZnJvbSAnLi9leHRyYWN0LWkxOG4nO1xuXG5leHBvcnQgY2xhc3MgRXh0cmFjdEkxOG5Db21tYW5kIGV4dGVuZHMgQXJjaGl0ZWN0Q29tbWFuZDxFeHRyYWN0STE4bkNvbW1hbmRTY2hlbWE+IHtcbiAgcHVibGljIG92ZXJyaWRlIHJlYWRvbmx5IHRhcmdldCA9ICdleHRyYWN0LWkxOG4nO1xuXG4gIHB1YmxpYyBvdmVycmlkZSBhc3luYyBydW4ob3B0aW9uczogRXh0cmFjdEkxOG5Db21tYW5kU2NoZW1hICYgQXJndW1lbnRzKSB7XG4gICAgY29uc3QgdmVyc2lvbiA9IHByb2Nlc3MudmVyc2lvbi5zdWJzdHIoMSkuc3BsaXQoJy4nKTtcbiAgICBpZiAoTnVtYmVyKHZlcnNpb25bMF0pID09PSAxMiAmJiBOdW1iZXIodmVyc2lvblsxXSkgPT09IDApIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAnRHVlIHRvIGEgZGVmZWN0IGluIE5vZGUuanMgMTIuMCwgdGhlIGNvbW1hbmQgaXMgbm90IHN1cHBvcnRlZCBvbiB0aGlzIE5vZGUuanMgdmVyc2lvbi4gJyArXG4gICAgICAgICAgJ1BsZWFzZSB1cGdyYWRlIHRvIE5vZGUuanMgMTIuMSBvciBsYXRlci4nLFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgY29uc3QgY29tbWFuZE5hbWUgPSBwcm9jZXNzLmFyZ3ZbMl07XG4gICAgaWYgKFsneGkxOG4nLCAnaTE4bi1leHRyYWN0J10uaW5jbHVkZXMoY29tbWFuZE5hbWUpKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICBgV2FybmluZzogXCJuZyAke2NvbW1hbmROYW1lfVwiIGhhcyBiZWVuIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiBhIGZ1dHVyZSBtYWpvciB2ZXJzaW9uLiBgICtcbiAgICAgICAgICAnUGxlYXNlIHVzZSBcIm5nIGV4dHJhY3QtaTE4blwiIGluc3RlYWQuJyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnMpO1xuICB9XG59XG4iXX0=