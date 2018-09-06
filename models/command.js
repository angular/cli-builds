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
// tslint:disable:no-global-tslint-disable no-any
const core_1 = require("@angular-devkit/core");
const config_1 = require("../utilities/config");
const interface_1 = require("./interface");
class Command {
    constructor(context, description, logger) {
        this.description = description;
        this.logger = logger;
        this.allowMissingWorkspace = false;
        this.workspace = context.workspace;
    }
    static setCommandMap(map) {
        this.commandMap = map;
    }
    initialize(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return;
        });
    }
    printHelp(options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.printHelpUsage();
            yield this.printHelpOptions();
            return 0;
        });
    }
    printJsonHelp(_options) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info(JSON.stringify(this.description));
            return 0;
        });
    }
    printHelpUsage() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info(this.description.description);
            const name = this.description.name;
            const args = this.description.options.filter(x => x.positional !== undefined);
            const opts = this.description.options.filter(x => x.positional === undefined);
            const argDisplay = args && args.length > 0
                ? ' ' + args.map(a => `<${a.name}>`).join(' ')
                : '';
            const optionsDisplay = opts && opts.length > 0
                ? ` [options]`
                : ``;
            this.logger.info(`usage: ng ${name}${argDisplay}${optionsDisplay}`);
            this.logger.info('');
        });
    }
    printHelpOptions(options = this.description.options) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = options.filter(opt => opt.positional !== undefined);
            const opts = options.filter(opt => opt.positional === undefined);
            if (args.length > 0) {
                this.logger.info(`arguments:`);
                args.forEach(o => {
                    this.logger.info(`  ${core_1.terminal.cyan(o.name)}`);
                    if (o.description) {
                        this.logger.info(`    ${o.description}`);
                    }
                });
            }
            if (options.length > 0) {
                if (args.length > 0) {
                    this.logger.info('');
                }
                this.logger.info(`options:`);
                opts
                    .filter(o => !o.hidden)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .forEach(o => {
                    const aliases = o.aliases && o.aliases.length > 0
                        ? '(' + o.aliases.map(a => `-${a}`).join(' ') + ')'
                        : '';
                    this.logger.info(`  ${core_1.terminal.cyan('--' + core_1.strings.dasherize(o.name))} ${aliases}`);
                    if (o.description) {
                        this.logger.info(`    ${o.description}`);
                    }
                });
            }
        });
    }
    validateScope() {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.description.scope) {
                case interface_1.CommandScope.OutProject:
                    if (this.workspace.configFile || config_1.getWorkspace('local') !== null) {
                        this.logger.fatal(core_1.tags.oneLine `
            The ${this.description.name} command requires to be run outside of a project, but a
            project definition was found at "${this.workspace.root}".
          `);
                        throw 1;
                    }
                    break;
                case interface_1.CommandScope.InProject:
                    if (!this.workspace.configFile || config_1.getWorkspace('local') === null) {
                        this.logger.fatal(core_1.tags.oneLine `
            The ${this.description.name} command requires to be run in an Angular project, but a
            project definition could not be found.
          `);
                        throw 1;
                    }
                    break;
                case interface_1.CommandScope.Everywhere:
                    // Can't miss this.
                    break;
            }
        });
    }
    validateAndRun(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options.help && !options.helpJson) {
                yield this.validateScope();
            }
            yield this.initialize(options);
            if (options.help) {
                return this.printHelp(options);
            }
            else if (options.helpJson) {
                return this.printJsonHelp(options);
            }
            else {
                return yield this.run(options);
            }
        });
    }
}
exports.Command = Command;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvbW9kZWxzL2NvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUVILGlEQUFpRDtBQUNqRCwrQ0FBd0U7QUFDeEUsZ0RBQW1EO0FBQ25ELDJDQVFxQjtBQU9yQixNQUFzQixPQUFPO0lBUzNCLFlBQ0UsT0FBdUIsRUFDUCxXQUErQixFQUM1QixNQUFzQjtRQUR6QixnQkFBVyxHQUFYLFdBQVcsQ0FBb0I7UUFDNUIsV0FBTSxHQUFOLE1BQU0sQ0FBZ0I7UUFYcEMsMEJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBYW5DLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztJQUNyQyxDQUFDO0lBVkQsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUEwQjtRQUM3QyxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQztJQUN4QixDQUFDO0lBVUssVUFBVSxDQUFDLE9BQVU7O1lBQ3pCLE9BQU87UUFDVCxDQUFDO0tBQUE7SUFFSyxTQUFTLENBQUMsT0FBVTs7WUFDeEIsTUFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDNUIsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUU5QixPQUFPLENBQUMsQ0FBQztRQUNYLENBQUM7S0FBQTtJQUVLLGFBQWEsQ0FBQyxRQUFXOztZQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBRW5ELE9BQU8sQ0FBQyxDQUFDO1FBQ1gsQ0FBQztLQUFBO0lBRWUsY0FBYzs7WUFDNUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUUvQyxNQUFNLElBQUksR0FB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RTt3QkFDaEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FBQTtrQkFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJOztXQUU1QixDQUFDLENBQUM7d0JBQ0gsTUFBTSxDQUFDLENBQUM7cUJBQ1Q7b0JBQ0QsTUFBTTtnQkFDUixLQUFLLHdCQUFZLENBQUMsVUFBVTtvQkFDMUIsbUJBQW1CO29CQUNuQixNQUFNO2FBQ1Q7UUFDSCxDQUFDO0tBQUE7SUFJSyxjQUFjLENBQUMsT0FBc0I7O1lBQ3pDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRTtnQkFDdEMsTUFBTSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7YUFDNUI7WUFDRCxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFL0IsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO2dCQUNoQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDaEM7aUJBQU0sSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO2dCQUMzQixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDcEM7aUJBQU07Z0JBQ0wsT0FBTyxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDaEM7UUFDSCxDQUFDO0tBQUE7Q0FDRjtBQS9IRCwwQkErSEMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIHRzbGludDpkaXNhYmxlOm5vLWdsb2JhbC10c2xpbnQtZGlzYWJsZSBuby1hbnlcbmltcG9ydCB7IGxvZ2dpbmcsIHN0cmluZ3MsIHRhZ3MsIHRlcm1pbmFsIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQge1xuICBBcmd1bWVudHMsXG4gIENvbW1hbmRDb250ZXh0LFxuICBDb21tYW5kRGVzY3JpcHRpb24sXG4gIENvbW1hbmREZXNjcmlwdGlvbk1hcCxcbiAgQ29tbWFuZFNjb3BlLFxuICBDb21tYW5kV29ya3NwYWNlLFxuICBPcHRpb24sXG59IGZyb20gJy4vaW50ZXJmYWNlJztcblxuZXhwb3J0IGludGVyZmFjZSBCYXNlQ29tbWFuZE9wdGlvbnMgZXh0ZW5kcyBBcmd1bWVudHMge1xuICBoZWxwPzogYm9vbGVhbjtcbiAgaGVscEpzb24/OiBib29sZWFuO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29tbWFuZDxUIGV4dGVuZHMgQmFzZUNvbW1hbmRPcHRpb25zID0gQmFzZUNvbW1hbmRPcHRpb25zPiB7XG4gIHB1YmxpYyBhbGxvd01pc3NpbmdXb3Jrc3BhY2UgPSBmYWxzZTtcbiAgcHVibGljIHdvcmtzcGFjZTogQ29tbWFuZFdvcmtzcGFjZTtcblxuICBwcm90ZWN0ZWQgc3RhdGljIGNvbW1hbmRNYXA6IENvbW1hbmREZXNjcmlwdGlvbk1hcDtcbiAgc3RhdGljIHNldENvbW1hbmRNYXAobWFwOiBDb21tYW5kRGVzY3JpcHRpb25NYXApIHtcbiAgICB0aGlzLmNvbW1hbmRNYXAgPSBtYXA7XG4gIH1cblxuICBjb25zdHJ1Y3RvcihcbiAgICBjb250ZXh0OiBDb21tYW5kQ29udGV4dCxcbiAgICBwdWJsaWMgcmVhZG9ubHkgZGVzY3JpcHRpb246IENvbW1hbmREZXNjcmlwdGlvbixcbiAgICBwcm90ZWN0ZWQgcmVhZG9ubHkgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcixcbiAgKSB7XG4gICAgdGhpcy53b3Jrc3BhY2UgPSBjb250ZXh0LndvcmtzcGFjZTtcbiAgfVxuXG4gIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogVCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGFzeW5jIHByaW50SGVscChvcHRpb25zOiBUKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBhd2FpdCB0aGlzLnByaW50SGVscFVzYWdlKCk7XG4gICAgYXdhaXQgdGhpcy5wcmludEhlbHBPcHRpb25zKCk7XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIGFzeW5jIHByaW50SnNvbkhlbHAoX29wdGlvbnM6IFQpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIHRoaXMubG9nZ2VyLmluZm8oSlNPTi5zdHJpbmdpZnkodGhpcy5kZXNjcmlwdGlvbikpO1xuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcHJpbnRIZWxwVXNhZ2UoKSB7XG4gICAgdGhpcy5sb2dnZXIuaW5mbyh0aGlzLmRlc2NyaXB0aW9uLmRlc2NyaXB0aW9uKTtcblxuICAgIGNvbnN0IG5hbWUgPSB0aGlzLmRlc2NyaXB0aW9uLm5hbWU7XG4gICAgY29uc3QgYXJncyA9IHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5maWx0ZXIoeCA9PiB4LnBvc2l0aW9uYWwgIT09IHVuZGVmaW5lZCk7XG4gICAgY29uc3Qgb3B0cyA9IHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5maWx0ZXIoeCA9PiB4LnBvc2l0aW9uYWwgPT09IHVuZGVmaW5lZCk7XG5cbiAgICBjb25zdCBhcmdEaXNwbGF5ID0gYXJncyAmJiBhcmdzLmxlbmd0aCA+IDBcbiAgICAgID8gJyAnICsgYXJncy5tYXAoYSA9PiBgPCR7YS5uYW1lfT5gKS5qb2luKCcgJylcbiAgICAgIDogJyc7XG4gICAgY29uc3Qgb3B0aW9uc0Rpc3BsYXkgPSBvcHRzICYmIG9wdHMubGVuZ3RoID4gMFxuICAgICAgPyBgIFtvcHRpb25zXWBcbiAgICAgIDogYGA7XG5cbiAgICB0aGlzLmxvZ2dlci5pbmZvKGB1c2FnZTogbmcgJHtuYW1lfSR7YXJnRGlzcGxheX0ke29wdGlvbnNEaXNwbGF5fWApO1xuICAgIHRoaXMubG9nZ2VyLmluZm8oJycpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHByaW50SGVscE9wdGlvbnMob3B0aW9uczogT3B0aW9uW10gPSB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMpIHtcbiAgICBjb25zdCBhcmdzID0gb3B0aW9ucy5maWx0ZXIob3B0ID0+IG9wdC5wb3NpdGlvbmFsICE9PSB1bmRlZmluZWQpO1xuICAgIGNvbnN0IG9wdHMgPSBvcHRpb25zLmZpbHRlcihvcHQgPT4gb3B0LnBvc2l0aW9uYWwgPT09IHVuZGVmaW5lZCk7XG5cbiAgICBpZiAoYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKGBhcmd1bWVudHM6YCk7XG4gICAgICBhcmdzLmZvckVhY2gobyA9PiB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmluZm8oYCAgJHt0ZXJtaW5hbC5jeWFuKG8ubmFtZSl9YCk7XG4gICAgICAgIGlmIChvLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgICAgICR7by5kZXNjcmlwdGlvbn1gKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuaW5mbygnJyk7XG4gICAgICB9XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKGBvcHRpb25zOmApO1xuICAgICAgb3B0c1xuICAgICAgICAuZmlsdGVyKG8gPT4gIW8uaGlkZGVuKVxuICAgICAgICAuc29ydCgoYSwgYikgPT4gYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKSlcbiAgICAgICAgLmZvckVhY2gobyA9PiB7XG4gICAgICAgICAgY29uc3QgYWxpYXNlcyA9IG8uYWxpYXNlcyAmJiBvLmFsaWFzZXMubGVuZ3RoID4gMFxuICAgICAgICAgICAgPyAnKCcgKyBvLmFsaWFzZXMubWFwKGEgPT4gYC0ke2F9YCkuam9pbignICcpICsgJyknXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmluZm8oYCAgJHt0ZXJtaW5hbC5jeWFuKCctLScgKyBzdHJpbmdzLmRhc2hlcml6ZShvLm5hbWUpKX0gJHthbGlhc2VzfWApO1xuICAgICAgICAgIGlmIChvLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKGAgICAgJHtvLmRlc2NyaXB0aW9ufWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdmFsaWRhdGVTY29wZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBzd2l0Y2ggKHRoaXMuZGVzY3JpcHRpb24uc2NvcGUpIHtcbiAgICAgIGNhc2UgQ29tbWFuZFNjb3BlLk91dFByb2plY3Q6XG4gICAgICAgIGlmICh0aGlzLndvcmtzcGFjZS5jb25maWdGaWxlIHx8IGdldFdvcmtzcGFjZSgnbG9jYWwnKSAhPT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgIFRoZSAke3RoaXMuZGVzY3JpcHRpb24ubmFtZX0gY29tbWFuZCByZXF1aXJlcyB0byBiZSBydW4gb3V0c2lkZSBvZiBhIHByb2plY3QsIGJ1dCBhXG4gICAgICAgICAgICBwcm9qZWN0IGRlZmluaXRpb24gd2FzIGZvdW5kIGF0IFwiJHt0aGlzLndvcmtzcGFjZS5yb290fVwiLlxuICAgICAgICAgIGApO1xuICAgICAgICAgIHRocm93IDE7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIENvbW1hbmRTY29wZS5JblByb2plY3Q6XG4gICAgICAgIGlmICghdGhpcy53b3Jrc3BhY2UuY29uZmlnRmlsZSB8fCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJykgPT09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbCh0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICBUaGUgJHt0aGlzLmRlc2NyaXB0aW9uLm5hbWV9IGNvbW1hbmQgcmVxdWlyZXMgdG8gYmUgcnVuIGluIGFuIEFuZ3VsYXIgcHJvamVjdCwgYnV0IGFcbiAgICAgICAgICAgIHByb2plY3QgZGVmaW5pdGlvbiBjb3VsZCBub3QgYmUgZm91bmQuXG4gICAgICAgICAgYCk7XG4gICAgICAgICAgdGhyb3cgMTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQ29tbWFuZFNjb3BlLkV2ZXJ5d2hlcmU6XG4gICAgICAgIC8vIENhbid0IG1pc3MgdGhpcy5cbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgYWJzdHJhY3QgYXN5bmMgcnVuKG9wdGlvbnM6IFQgJiBBcmd1bWVudHMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+O1xuXG4gIGFzeW5jIHZhbGlkYXRlQW5kUnVuKG9wdGlvbnM6IFQgJiBBcmd1bWVudHMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBpZiAoIW9wdGlvbnMuaGVscCAmJiAhb3B0aW9ucy5oZWxwSnNvbikge1xuICAgICAgYXdhaXQgdGhpcy52YWxpZGF0ZVNjb3BlKCk7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMuaW5pdGlhbGl6ZShvcHRpb25zKTtcblxuICAgIGlmIChvcHRpb25zLmhlbHApIHtcbiAgICAgIHJldHVybiB0aGlzLnByaW50SGVscChvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMuaGVscEpzb24pIHtcbiAgICAgIHJldHVybiB0aGlzLnByaW50SnNvbkhlbHAob3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJ1bihvcHRpb25zKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==