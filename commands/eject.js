"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable file-header
const core_1 = require("@angular-devkit/core");
const command_1 = require("../models/command");
class EjectCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'eject';
        this.description = 'Temporarily disabled. Ejects your app and output the proper '
            + 'webpack configuration and scripts.';
        this.arguments = [];
        this.options = [];
    }
    run() {
        this.logger.info(core_1.tags.stripIndents `
      The 'eject' command has been temporarily disabled, as it is not yet compatible with the new
      angular.json format. The new configuration format provides further flexibility to modify the
      configuration of your workspace without ejecting. Ejection will be re-enabled in a future
      release of the CLI.

      If you need to eject today, use CLI 1.7 to eject your project.
    `);
    }
}
exports.default = EjectCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWplY3QuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2VqZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0RBQXNEO0FBQ3RELCtDQUE0QztBQUM1QywrQ0FBb0Q7QUFHcEQsa0JBQWtDLFNBQVEsaUJBQU87SUFBakQ7O1FBQ2tCLFNBQUksR0FBRyxPQUFPLENBQUM7UUFDZixnQkFBVyxHQUFHLDhEQUE4RDtjQUM5RCxvQ0FBb0MsQ0FBQztRQUNuRCxjQUFTLEdBQWEsRUFBRSxDQUFDO1FBQ3pCLFlBQU8sR0FBYSxFQUFFLENBQUM7SUFZekMsQ0FBQztJQVZDLEdBQUc7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFJLENBQUMsWUFBWSxDQUFBOzs7Ozs7O0tBT2pDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWpCRCwrQkFpQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgZmlsZS1oZWFkZXJcbmltcG9ydCB7IHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBDb21tYW5kLCBPcHRpb24gfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRWplY3RDb21tYW5kIGV4dGVuZHMgQ29tbWFuZCB7XG4gIHB1YmxpYyByZWFkb25seSBuYW1lID0gJ2VqZWN0JztcbiAgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJ1RlbXBvcmFyaWx5IGRpc2FibGVkLiBFamVjdHMgeW91ciBhcHAgYW5kIG91dHB1dCB0aGUgcHJvcGVyICdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICsgJ3dlYnBhY2sgY29uZmlndXJhdGlvbiBhbmQgc2NyaXB0cy4nO1xuICBwdWJsaWMgcmVhZG9ubHkgYXJndW1lbnRzOiBzdHJpbmdbXSA9IFtdO1xuICBwdWJsaWMgcmVhZG9ubHkgb3B0aW9uczogT3B0aW9uW10gPSBbXTtcblxuICBydW4oKSB7XG4gICAgdGhpcy5sb2dnZXIuaW5mbyh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgIFRoZSAnZWplY3QnIGNvbW1hbmQgaGFzIGJlZW4gdGVtcG9yYXJpbHkgZGlzYWJsZWQsIGFzIGl0IGlzIG5vdCB5ZXQgY29tcGF0aWJsZSB3aXRoIHRoZSBuZXdcbiAgICAgIGFuZ3VsYXIuanNvbiBmb3JtYXQuIFRoZSBuZXcgY29uZmlndXJhdGlvbiBmb3JtYXQgcHJvdmlkZXMgZnVydGhlciBmbGV4aWJpbGl0eSB0byBtb2RpZnkgdGhlXG4gICAgICBjb25maWd1cmF0aW9uIG9mIHlvdXIgd29ya3NwYWNlIHdpdGhvdXQgZWplY3RpbmcuIEVqZWN0aW9uIHdpbGwgYmUgcmUtZW5hYmxlZCBpbiBhIGZ1dHVyZVxuICAgICAgcmVsZWFzZSBvZiB0aGUgQ0xJLlxuXG4gICAgICBJZiB5b3UgbmVlZCB0byBlamVjdCB0b2RheSwgdXNlIENMSSAxLjcgdG8gZWplY3QgeW91ciBwcm9qZWN0LlxuICAgIGApO1xuICB9XG59XG4iXX0=