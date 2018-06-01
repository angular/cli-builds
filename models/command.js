"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable no-any file-header
const core_1 = require("@angular-devkit/core");
var CommandScope;
(function (CommandScope) {
    CommandScope[CommandScope["everywhere"] = 0] = "everywhere";
    CommandScope[CommandScope["inProject"] = 1] = "inProject";
    CommandScope[CommandScope["outsideProject"] = 2] = "outsideProject";
})(CommandScope = exports.CommandScope || (exports.CommandScope = {}));
var ArgumentStrategy;
(function (ArgumentStrategy) {
    ArgumentStrategy[ArgumentStrategy["MapToOptions"] = 0] = "MapToOptions";
    ArgumentStrategy[ArgumentStrategy["Nothing"] = 1] = "Nothing";
})(ArgumentStrategy = exports.ArgumentStrategy || (exports.ArgumentStrategy = {}));
class Command {
    constructor(context, logger) {
        this.allowMissingWorkspace = false;
        this.argStrategy = ArgumentStrategy.MapToOptions;
        this.hidden = false;
        this.unknown = false;
        this.scope = CommandScope.everywhere;
        this.logger = logger;
        if (context) {
            this.project = context.project;
        }
    }
    initializeRaw(args) {
        return __awaiter(this, void 0, void 0, function* () {
            this._rawArgs = args;
            return args;
        });
    }
    initialize(_options) {
        return __awaiter(this, void 0, void 0, function* () {
            return;
        });
    }
    validate(_options) {
        return true;
    }
    printHelp(_options) {
        this.printHelpUsage(this.name, this.arguments, this.options);
        this.printHelpOptions(this.options);
    }
    printHelpUsage(name, args, options) {
        const argDisplay = args && args.length > 0
            ? ' ' + args.map(a => `<${a}>`).join(' ')
            : '';
        const optionsDisplay = options && options.length > 0
            ? ` [options]`
            : ``;
        this.logger.info(`usage: ng ${name}${argDisplay}${optionsDisplay}`);
    }
    printHelpOptions(options) {
        if (options && this.options.length > 0) {
            this.logger.info(`options:`);
            this.options
                .filter(o => !o.hidden)
                .sort((a, b) => a.name >= b.name ? 1 : -1)
                .forEach(o => {
                const aliases = o.aliases && o.aliases.length > 0
                    ? '(' + o.aliases.map(a => `-${a}`).join(' ') + ')'
                    : '';
                this.logger.info(`  ${core_1.terminal.cyan('--' + o.name)} ${aliases}`);
                this.logger.info(`    ${o.description}`);
            });
        }
    }
}
exports.Command = Command;
class Option {
    constructor() {
        this.hidden = false;
    }
}
exports.Option = Option;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvbW9kZWxzL2NvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLDZEQUE2RDtBQUM3RCwrQ0FBeUQ7QUFRekQsSUFBWSxZQUlYO0FBSkQsV0FBWSxZQUFZO0lBQ3RCLDJEQUFVLENBQUE7SUFDVix5REFBUyxDQUFBO0lBQ1QsbUVBQWMsQ0FBQTtBQUNoQixDQUFDLEVBSlcsWUFBWSxHQUFaLG9CQUFZLEtBQVosb0JBQVksUUFJdkI7QUFFRCxJQUFZLGdCQUdYO0FBSEQsV0FBWSxnQkFBZ0I7SUFDMUIsdUVBQVksQ0FBQTtJQUNaLDZEQUFPLENBQUE7QUFDVCxDQUFDLEVBSFcsZ0JBQWdCLEdBQWhCLHdCQUFnQixLQUFoQix3QkFBZ0IsUUFHM0I7QUFFRDtJQUlFLFlBQVksT0FBdUIsRUFBRSxNQUFzQjtRQUZwRCwwQkFBcUIsR0FBRyxLQUFLLENBQUM7UUEwRDlCLGdCQUFXLEdBQUcsZ0JBQWdCLENBQUMsWUFBWSxDQUFDO1FBQzVDLFdBQU0sR0FBRyxLQUFLLENBQUM7UUFDZixZQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ2hCLFVBQUssR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDO1FBMURyQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ1osSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1FBQ2pDLENBQUM7SUFDSCxDQUFDO0lBRUssYUFBYSxDQUFDLElBQWM7O1lBQ2hDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1lBRXJCLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDZCxDQUFDO0tBQUE7SUFDSyxVQUFVLENBQUMsUUFBYTs7WUFDNUIsTUFBTSxDQUFDO1FBQ1QsQ0FBQztLQUFBO0lBRUQsUUFBUSxDQUFDLFFBQVc7UUFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxTQUFTLENBQUMsUUFBVztRQUNuQixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRVMsY0FBYyxDQUFDLElBQVksRUFBRSxJQUFjLEVBQUUsT0FBaUI7UUFDdEUsTUFBTSxVQUFVLEdBQUcsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUN4QyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUN6QyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ1AsTUFBTSxjQUFjLEdBQUcsT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUNsRCxDQUFDLENBQUMsWUFBWTtZQUNkLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDUCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksR0FBRyxVQUFVLEdBQUcsY0FBYyxFQUFFLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRVMsZ0JBQWdCLENBQUMsT0FBaUI7UUFDMUMsRUFBRSxDQUFDLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDN0IsSUFBSSxDQUFDLE9BQU87aUJBQ1QsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO2lCQUN0QixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ3pDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDYixNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUM7b0JBQy9DLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUc7b0JBQ25ELENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxlQUFRLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDakUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztZQUMzQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDO0NBYUY7QUFsRUQsMEJBa0VDO0FBTUQ7SUFBQTtRQVNXLFdBQU0sR0FBYSxLQUFLLENBQUM7SUFDcEMsQ0FBQztDQUFBO0FBVkQsd0JBVUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgbm8tYW55IGZpbGUtaGVhZGVyXG5pbXBvcnQgeyBsb2dnaW5nLCB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kQ29uc3RydWN0b3Ige1xuICBuZXcoY29udGV4dDogQ29tbWFuZENvbnRleHQsIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIpOiBDb21tYW5kO1xuICBhbGlhc2VzOiBzdHJpbmdbXTtcbiAgc2NvcGU6IENvbW1hbmRTY29wZS5ldmVyeXdoZXJlO1xufVxuXG5leHBvcnQgZW51bSBDb21tYW5kU2NvcGUge1xuICBldmVyeXdoZXJlLFxuICBpblByb2plY3QsXG4gIG91dHNpZGVQcm9qZWN0LFxufVxuXG5leHBvcnQgZW51bSBBcmd1bWVudFN0cmF0ZWd5IHtcbiAgTWFwVG9PcHRpb25zLFxuICBOb3RoaW5nLFxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29tbWFuZDxUID0gYW55PiB7XG4gIHByb3RlY3RlZCBfcmF3QXJnczogc3RyaW5nW107XG4gIHB1YmxpYyBhbGxvd01pc3NpbmdXb3Jrc3BhY2UgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3Rvcihjb250ZXh0OiBDb21tYW5kQ29udGV4dCwgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcikge1xuICAgIHRoaXMubG9nZ2VyID0gbG9nZ2VyO1xuICAgIGlmIChjb250ZXh0KSB7XG4gICAgICB0aGlzLnByb2plY3QgPSBjb250ZXh0LnByb2plY3Q7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgaW5pdGlhbGl6ZVJhdyhhcmdzOiBzdHJpbmdbXSk6IFByb21pc2U8YW55PiB7XG4gICAgdGhpcy5fcmF3QXJncyA9IGFyZ3M7XG5cbiAgICByZXR1cm4gYXJncztcbiAgfVxuICBhc3luYyBpbml0aWFsaXplKF9vcHRpb25zOiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YWxpZGF0ZShfb3B0aW9uczogVCk6IGJvb2xlYW4gfCBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaW50SGVscChfb3B0aW9uczogVCk6IHZvaWQge1xuICAgIHRoaXMucHJpbnRIZWxwVXNhZ2UodGhpcy5uYW1lLCB0aGlzLmFyZ3VtZW50cywgdGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLnByaW50SGVscE9wdGlvbnModGhpcy5vcHRpb25zKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwcmludEhlbHBVc2FnZShuYW1lOiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdLCBvcHRpb25zOiBPcHRpb25bXSkge1xuICAgIGNvbnN0IGFyZ0Rpc3BsYXkgPSBhcmdzICYmIGFyZ3MubGVuZ3RoID4gMFxuICAgICAgPyAnICcgKyBhcmdzLm1hcChhID0+IGA8JHthfT5gKS5qb2luKCcgJylcbiAgICAgIDogJyc7XG4gICAgY29uc3Qgb3B0aW9uc0Rpc3BsYXkgPSBvcHRpb25zICYmIG9wdGlvbnMubGVuZ3RoID4gMFxuICAgICAgPyBgIFtvcHRpb25zXWBcbiAgICAgIDogYGA7XG4gICAgdGhpcy5sb2dnZXIuaW5mbyhgdXNhZ2U6IG5nICR7bmFtZX0ke2FyZ0Rpc3BsYXl9JHtvcHRpb25zRGlzcGxheX1gKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwcmludEhlbHBPcHRpb25zKG9wdGlvbnM6IE9wdGlvbltdKSB7XG4gICAgaWYgKG9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oYG9wdGlvbnM6YCk7XG4gICAgICB0aGlzLm9wdGlvbnNcbiAgICAgICAgLmZpbHRlcihvID0+ICFvLmhpZGRlbilcbiAgICAgICAgLnNvcnQoKGEsIGIpID0+IGEubmFtZSA+PSBiLm5hbWUgPyAxIDogLTEpXG4gICAgICAgIC5mb3JFYWNoKG8gPT4ge1xuICAgICAgICBjb25zdCBhbGlhc2VzID0gby5hbGlhc2VzICYmIG8uYWxpYXNlcy5sZW5ndGggPiAwXG4gICAgICAgICAgPyAnKCcgKyBvLmFsaWFzZXMubWFwKGEgPT4gYC0ke2F9YCkuam9pbignICcpICsgJyknXG4gICAgICAgICAgOiAnJztcbiAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgICAke3Rlcm1pbmFsLmN5YW4oJy0tJyArIG8ubmFtZSl9ICR7YWxpYXNlc31gKTtcbiAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgICAgICR7by5kZXNjcmlwdGlvbn1gKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGFic3RyYWN0IHJ1bihvcHRpb25zOiBUKTogbnVtYmVyIHwgdm9pZCB8IFByb21pc2U8bnVtYmVyIHwgdm9pZD47XG4gIGFic3RyYWN0IHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgYWJzdHJhY3QgcmVhZG9ubHkgZGVzY3JpcHRpb246IHN0cmluZztcbiAgYWJzdHJhY3QgcmVhZG9ubHkgYXJndW1lbnRzOiBzdHJpbmdbXTtcbiAgYWJzdHJhY3QgcmVhZG9ubHkgb3B0aW9uczogT3B0aW9uW107XG4gIHB1YmxpYyBhcmdTdHJhdGVneSA9IEFyZ3VtZW50U3RyYXRlZ3kuTWFwVG9PcHRpb25zO1xuICBwdWJsaWMgaGlkZGVuID0gZmFsc2U7XG4gIHB1YmxpYyB1bmtub3duID0gZmFsc2U7XG4gIHB1YmxpYyBzY29wZSA9IENvbW1hbmRTY29wZS5ldmVyeXdoZXJlO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcjtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHByb2plY3Q6IGFueTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kQ29udGV4dCB7XG4gIHByb2plY3Q6IGFueTtcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIE9wdGlvbiB7XG4gIGFic3RyYWN0IHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgYWJzdHJhY3QgcmVhZG9ubHkgZGVzY3JpcHRpb246IHN0cmluZztcbiAgcmVhZG9ubHkgZGVmYXVsdD86IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW47XG4gIHJlYWRvbmx5IHJlcXVpcmVkPzogYm9vbGVhbjtcbiAgYWJzdHJhY3QgcmVhZG9ubHkgYWxpYXNlcz86IHN0cmluZ1tdO1xuICBhYnN0cmFjdCByZWFkb25seSB0eXBlOiBhbnk7XG4gIHJlYWRvbmx5IGZvcm1hdD86IHN0cmluZztcbiAgcmVhZG9ubHkgdmFsdWVzPzogYW55W107XG4gIHJlYWRvbmx5IGhpZGRlbj86IGJvb2xlYW4gPSBmYWxzZTtcbn1cbiJdfQ==