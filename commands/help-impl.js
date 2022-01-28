"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpCommand = void 0;
const command_1 = require("../models/command");
const color_1 = require("../utilities/color");
class HelpCommand extends command_1.Command {
    async run() {
        this.logger.info(`Available Commands:`);
        for (const cmd of Object.values(await command_1.Command.commandMap())) {
            if (cmd.hidden) {
                continue;
            }
            const aliasInfo = cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
            this.logger.info(`  ${color_1.colors.cyan(cmd.name)}${aliasInfo} ${cmd.description}`);
        }
        this.logger.info(`\nFor more detailed help run "ng [command name] --help"`);
    }
}
exports.HelpCommand = HelpCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscC1pbXBsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvaGVscC1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILCtDQUE0QztBQUM1Qyw4Q0FBNEM7QUFHNUMsTUFBYSxXQUFZLFNBQVEsaUJBQTBCO0lBQ3pELEtBQUssQ0FBQyxHQUFHO1FBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUV4QyxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxpQkFBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUU7WUFDM0QsSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFO2dCQUNkLFNBQVM7YUFDVjtZQUVELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDL0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxjQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLElBQUksR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7U0FDL0U7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO0lBQzlFLENBQUM7Q0FDRjtBQWRELGtDQWNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEhlbHBDb21tYW5kU2NoZW1hIH0gZnJvbSAnLi9oZWxwJztcblxuZXhwb3J0IGNsYXNzIEhlbHBDb21tYW5kIGV4dGVuZHMgQ29tbWFuZDxIZWxwQ29tbWFuZFNjaGVtYT4ge1xuICBhc3luYyBydW4oKSB7XG4gICAgdGhpcy5sb2dnZXIuaW5mbyhgQXZhaWxhYmxlIENvbW1hbmRzOmApO1xuXG4gICAgZm9yIChjb25zdCBjbWQgb2YgT2JqZWN0LnZhbHVlcyhhd2FpdCBDb21tYW5kLmNvbW1hbmRNYXAoKSkpIHtcbiAgICAgIGlmIChjbWQuaGlkZGVuKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhbGlhc0luZm8gPSBjbWQuYWxpYXNlcy5sZW5ndGggPiAwID8gYCAoJHtjbWQuYWxpYXNlcy5qb2luKCcsICcpfSlgIDogJyc7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKGAgICR7Y29sb3JzLmN5YW4oY21kLm5hbWUpfSR7YWxpYXNJbmZvfSAke2NtZC5kZXNjcmlwdGlvbn1gKTtcbiAgICB9XG4gICAgdGhpcy5sb2dnZXIuaW5mbyhgXFxuRm9yIG1vcmUgZGV0YWlsZWQgaGVscCBydW4gXCJuZyBbY29tbWFuZCBuYW1lXSAtLWhlbHBcImApO1xuICB9XG59XG4iXX0=