"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const architect_command_module_1 = require("../../command-builder/architect-command-module");
const command_config_1 = require("../command-config");
class E2eCommandModule extends architect_command_module_1.ArchitectCommandModule {
    missingTargetChoices = [
        {
            name: 'Cypress',
            value: '@cypress/schematic',
        },
        {
            name: 'Nightwatch',
            value: '@nightwatch/schematics',
        },
        {
            name: 'WebdriverIO',
            value: '@wdio/schematics',
        },
        {
            name: 'Puppeteer',
            value: '@puppeteer/ng-schematics',
        },
    ];
    multiTarget = true;
    command = 'e2e [project]';
    aliases = command_config_1.RootCommands['e2e'].aliases;
    describe = 'Builds and serves an Angular application, then runs end-to-end tests.';
    longDescriptionPath;
}
exports.default = E2eCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2UyZS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFHSCw2RkFBd0Y7QUFFeEYsc0RBQWlEO0FBRWpELE1BQXFCLGdCQUNuQixTQUFRLGlEQUFzQjtJQUdyQixvQkFBb0IsR0FBMEI7UUFDckQ7WUFDRSxJQUFJLEVBQUUsU0FBUztZQUNmLEtBQUssRUFBRSxvQkFBb0I7U0FDNUI7UUFDRDtZQUNFLElBQUksRUFBRSxZQUFZO1lBQ2xCLEtBQUssRUFBRSx3QkFBd0I7U0FDaEM7UUFDRDtZQUNFLElBQUksRUFBRSxhQUFhO1lBQ25CLEtBQUssRUFBRSxrQkFBa0I7U0FDMUI7UUFDRDtZQUNFLElBQUksRUFBRSxXQUFXO1lBQ2pCLEtBQUssRUFBRSwwQkFBMEI7U0FDbEM7S0FDRixDQUFDO0lBRUYsV0FBVyxHQUFHLElBQUksQ0FBQztJQUNuQixPQUFPLEdBQUcsZUFBZSxDQUFDO0lBQzFCLE9BQU8sR0FBRyw2QkFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUN0QyxRQUFRLEdBQUcsdUVBQXVFLENBQUM7SUFDbkYsbUJBQW1CLENBQVU7Q0FDOUI7QUE1QkQsbUNBNEJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IE1pc3NpbmdUYXJnZXRDaG9pY2UgfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvYXJjaGl0ZWN0LWJhc2UtY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgQXJjaGl0ZWN0Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9hcmNoaXRlY3QtY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uIH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IFJvb3RDb21tYW5kcyB9IGZyb20gJy4uL2NvbW1hbmQtY29uZmlnJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRTJlQ29tbWFuZE1vZHVsZVxuICBleHRlbmRzIEFyY2hpdGVjdENvbW1hbmRNb2R1bGVcbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb25cbntcbiAgb3ZlcnJpZGUgbWlzc2luZ1RhcmdldENob2ljZXM6IE1pc3NpbmdUYXJnZXRDaG9pY2VbXSA9IFtcbiAgICB7XG4gICAgICBuYW1lOiAnQ3lwcmVzcycsXG4gICAgICB2YWx1ZTogJ0BjeXByZXNzL3NjaGVtYXRpYycsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiAnTmlnaHR3YXRjaCcsXG4gICAgICB2YWx1ZTogJ0BuaWdodHdhdGNoL3NjaGVtYXRpY3MnLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogJ1dlYmRyaXZlcklPJyxcbiAgICAgIHZhbHVlOiAnQHdkaW8vc2NoZW1hdGljcycsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiAnUHVwcGV0ZWVyJyxcbiAgICAgIHZhbHVlOiAnQHB1cHBldGVlci9uZy1zY2hlbWF0aWNzJyxcbiAgICB9LFxuICBdO1xuXG4gIG11bHRpVGFyZ2V0ID0gdHJ1ZTtcbiAgY29tbWFuZCA9ICdlMmUgW3Byb2plY3RdJztcbiAgYWxpYXNlcyA9IFJvb3RDb21tYW5kc1snZTJlJ10uYWxpYXNlcztcbiAgZGVzY3JpYmUgPSAnQnVpbGRzIGFuZCBzZXJ2ZXMgYW4gQW5ndWxhciBhcHBsaWNhdGlvbiwgdGhlbiBydW5zIGVuZC10by1lbmQgdGVzdHMuJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZztcbn1cbiJdfQ==