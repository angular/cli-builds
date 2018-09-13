"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const core_1 = require("@angular-devkit/core");
const command_1 = require("../models/command");
class HelpCommand extends command_1.Command {
    async run() {
        this.logger.info(`Available Commands:`);
        for (const name of Object.keys(command_1.Command.commandMap)) {
            const cmd = command_1.Command.commandMap[name];
            if (cmd.hidden) {
                continue;
            }
            const aliasInfo = cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
            this.logger.info(`  ${core_1.terminal.cyan(cmd.name)}${aliasInfo} ${cmd.description}`);
        }
        this.logger.info(`\nFor more detailed help run "ng [command name] --help"`);
    }
}
exports.HelpCommand = HelpCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscC1pbXBsLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9oZWxwLWltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwrQ0FBZ0Q7QUFDaEQsK0NBQTRDO0FBRTVDLE1BQWEsV0FBWSxTQUFRLGlCQUFPO0lBQ3RDLEtBQUssQ0FBQyxHQUFHO1FBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUV4QyxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUNsRCxNQUFNLEdBQUcsR0FBRyxpQkFBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVyQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2QsU0FBUzthQUNWO1lBRUQsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUMvRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLGVBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsSUFBSSxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztTQUNqRjtRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHlEQUF5RCxDQUFDLENBQUM7SUFDOUUsQ0FBQztDQUNGO0FBaEJELGtDQWdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7IHRlcm1pbmFsIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcblxuZXhwb3J0IGNsYXNzIEhlbHBDb21tYW5kIGV4dGVuZHMgQ29tbWFuZCB7XG4gIGFzeW5jIHJ1bigpIHtcbiAgICB0aGlzLmxvZ2dlci5pbmZvKGBBdmFpbGFibGUgQ29tbWFuZHM6YCk7XG5cbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoQ29tbWFuZC5jb21tYW5kTWFwKSkge1xuICAgICAgY29uc3QgY21kID0gQ29tbWFuZC5jb21tYW5kTWFwW25hbWVdO1xuXG4gICAgICBpZiAoY21kLmhpZGRlbikge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYWxpYXNJbmZvID0gY21kLmFsaWFzZXMubGVuZ3RoID4gMCA/IGAgKCR7Y21kLmFsaWFzZXMuam9pbignLCAnKX0pYCA6ICcnO1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgICAke3Rlcm1pbmFsLmN5YW4oY21kLm5hbWUpfSR7YWxpYXNJbmZvfSAke2NtZC5kZXNjcmlwdGlvbn1gKTtcbiAgICB9XG4gICAgdGhpcy5sb2dnZXIuaW5mbyhgXFxuRm9yIG1vcmUgZGV0YWlsZWQgaGVscCBydW4gXCJuZyBbY29tbWFuZCBuYW1lXSAtLWhlbHBcImApO1xuICB9XG59XG4iXX0=