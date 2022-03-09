"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewCommandModule = void 0;
const command_module_1 = require("../../command-builder/command-module");
const schematics_command_module_1 = require("../../command-builder/schematics-command-module");
const new_impl_1 = require("./new-impl");
class NewCommandModule extends schematics_command_module_1.SchematicsCommandModule {
    constructor() {
        super(...arguments);
        this.schematicName = 'ng-new';
        this.command = 'new [name]';
        this.aliases = 'n';
        this.describe = 'Creates a new Angular workspace.';
    }
    async builder(argv) {
        const baseYargs = await super.builder(argv);
        return baseYargs.option('collection', {
            alias: 'c',
            describe: 'A collection of schematics to use in generating the initial application.',
            type: 'string',
        });
    }
    run(options) {
        const command = new new_impl_1.NewCommand(this.context, 'new');
        return command.validateAndRun(options);
    }
}
exports.NewCommandModule = NewCommandModule;
NewCommandModule.scope = command_module_1.CommandScope.Out;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL25ldy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gseUVBSzhDO0FBQzlDLCtGQUd5RDtBQUN6RCx5Q0FBd0M7QUFNeEMsTUFBYSxnQkFDWCxTQUFRLG1EQUF1QjtJQURqQzs7UUFJcUIsa0JBQWEsR0FBRyxRQUFRLENBQUM7UUFHNUMsWUFBTyxHQUFHLFlBQVksQ0FBQztRQUN2QixZQUFPLEdBQUcsR0FBRyxDQUFDO1FBQ2QsYUFBUSxHQUFHLGtDQUFrQyxDQUFDO0lBa0JoRCxDQUFDO0lBZlUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFVO1FBQy9CLE1BQU0sU0FBUyxHQUFHLE1BQU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU1QyxPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFO1lBQ3BDLEtBQUssRUFBRSxHQUFHO1lBQ1YsUUFBUSxFQUFFLDBFQUEwRTtZQUNwRixJQUFJLEVBQUUsUUFBUTtTQUNmLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxHQUFHLENBQUMsT0FBK0M7UUFDakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxxQkFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFcEQsT0FBTyxPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3pDLENBQUM7O0FBMUJILDRDQTJCQztBQXRCaUIsc0JBQUssR0FBRyw2QkFBWSxDQUFDLEdBQUcsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7XG4gIFNjaGVtYXRpY3NDb21tYW5kQXJncyxcbiAgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGUsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9zY2hlbWF0aWNzLWNvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IE5ld0NvbW1hbmQgfSBmcm9tICcuL25ldy1pbXBsJztcblxuZXhwb3J0IGludGVyZmFjZSBOZXdDb21tYW5kQXJncyBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kQXJncyB7XG4gIGNvbGxlY3Rpb24/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBOZXdDb21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGVcbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248TmV3Q29tbWFuZEFyZ3M+XG57XG4gIHByb3RlY3RlZCBvdmVycmlkZSBzY2hlbWF0aWNOYW1lID0gJ25nLW5ldyc7XG4gIHN0YXRpYyBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5PdXQ7XG5cbiAgY29tbWFuZCA9ICduZXcgW25hbWVdJztcbiAgYWxpYXNlcyA9ICduJztcbiAgZGVzY3JpYmUgPSAnQ3JlYXRlcyBhIG5ldyBBbmd1bGFyIHdvcmtzcGFjZS4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIG92ZXJyaWRlIGFzeW5jIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxOZXdDb21tYW5kQXJncz4+IHtcbiAgICBjb25zdCBiYXNlWWFyZ3MgPSBhd2FpdCBzdXBlci5idWlsZGVyKGFyZ3YpO1xuXG4gICAgcmV0dXJuIGJhc2VZYXJncy5vcHRpb24oJ2NvbGxlY3Rpb24nLCB7XG4gICAgICBhbGlhczogJ2MnLFxuICAgICAgZGVzY3JpYmU6ICdBIGNvbGxlY3Rpb24gb2Ygc2NoZW1hdGljcyB0byB1c2UgaW4gZ2VuZXJhdGluZyB0aGUgaW5pdGlhbCBhcHBsaWNhdGlvbi4nLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgfSk7XG4gIH1cblxuICBydW4ob3B0aW9uczogT3B0aW9uczxOZXdDb21tYW5kQXJncz4gJiBPdGhlck9wdGlvbnMpOiBudW1iZXIgfCB2b2lkIHwgUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBOZXdDb21tYW5kKHRoaXMuY29udGV4dCwgJ25ldycpO1xuXG4gICAgcmV0dXJuIGNvbW1hbmQudmFsaWRhdGVBbmRSdW4ob3B0aW9ucyk7XG4gIH1cbn1cbiJdfQ==