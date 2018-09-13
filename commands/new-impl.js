"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable no-any
const schematic_command_1 = require("../models/schematic-command");
class NewCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.allowMissingWorkspace = true;
        this.schematicName = 'ng-new';
    }
    async run(options) {
        if (options.dryRun) {
            options.skipGit = true;
        }
        let collectionName;
        if (options.collection) {
            collectionName = options.collection;
        }
        else {
            collectionName = this.parseCollectionName(options);
        }
        // Register the version of the CLI in the registry.
        const packageJson = require('../package.json');
        const version = packageJson.version;
        this._workflow.registry.addSmartDefaultProvider('ng-cli-version', () => version);
        return this.runSchematic({
            collectionName: collectionName,
            schematicName: this.schematicName,
            schematicOptions: options['--'] || [],
            debug: options.debug,
            dryRun: options.dryRun,
            force: options.force,
        });
    }
    parseCollectionName(options) {
        return options.collection || this.getDefaultSchematicCollection();
    }
}
exports.NewCommand = NewCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3LWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL25ldy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsaURBQWlEO0FBQ2pELG1FQUFxRjtBQVFyRixNQUFhLFVBQVcsU0FBUSxvQ0FBZ0I7SUFBaEQ7O1FBQ2tCLDBCQUFxQixHQUFHLElBQUksQ0FBQztRQUNyQyxrQkFBYSxHQUFHLFFBQVEsQ0FBQztJQWlDbkMsQ0FBQztJQS9CUSxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQTBCO1FBQ3pDLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNsQixPQUFPLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztTQUN4QjtRQUVELElBQUksY0FBc0IsQ0FBQztRQUMzQixJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUU7WUFDdEIsY0FBYyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUM7U0FDckM7YUFBTTtZQUNMLGNBQWMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDcEQ7UUFFRCxtREFBbUQ7UUFDbkQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDL0MsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQztRQUVwQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVqRixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdkIsY0FBYyxFQUFFLGNBQWM7WUFDOUIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2pDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ3JDLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztZQUNwQixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07WUFDdEIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO1NBQ3JCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxPQUFZO1FBQ3RDLE9BQU8sT0FBTyxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQztJQUNwRSxDQUFDO0NBQ0Y7QUFuQ0QsZ0NBbUNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgbm8tYW55XG5pbXBvcnQgeyBCYXNlU2NoZW1hdGljT3B0aW9ucywgU2NoZW1hdGljQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmV3Q29tbWFuZE9wdGlvbnMgZXh0ZW5kcyBCYXNlU2NoZW1hdGljT3B0aW9ucyB7XG4gIHNraXBHaXQ/OiBib29sZWFuO1xuICBjb2xsZWN0aW9uPzogc3RyaW5nO1xufVxuXG5cbmV4cG9ydCBjbGFzcyBOZXdDb21tYW5kIGV4dGVuZHMgU2NoZW1hdGljQ29tbWFuZCB7XG4gIHB1YmxpYyByZWFkb25seSBhbGxvd01pc3NpbmdXb3Jrc3BhY2UgPSB0cnVlO1xuICBwcml2YXRlIHNjaGVtYXRpY05hbWUgPSAnbmctbmV3JztcblxuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IE5ld0NvbW1hbmRPcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMuZHJ5UnVuKSB7XG4gICAgICBvcHRpb25zLnNraXBHaXQgPSB0cnVlO1xuICAgIH1cblxuICAgIGxldCBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICAgIGlmIChvcHRpb25zLmNvbGxlY3Rpb24pIHtcbiAgICAgIGNvbGxlY3Rpb25OYW1lID0gb3B0aW9ucy5jb2xsZWN0aW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb2xsZWN0aW9uTmFtZSA9IHRoaXMucGFyc2VDb2xsZWN0aW9uTmFtZShvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvLyBSZWdpc3RlciB0aGUgdmVyc2lvbiBvZiB0aGUgQ0xJIGluIHRoZSByZWdpc3RyeS5cbiAgICBjb25zdCBwYWNrYWdlSnNvbiA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpO1xuICAgIGNvbnN0IHZlcnNpb24gPSBwYWNrYWdlSnNvbi52ZXJzaW9uO1xuXG4gICAgdGhpcy5fd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ25nLWNsaS12ZXJzaW9uJywgKCkgPT4gdmVyc2lvbik7XG5cbiAgICByZXR1cm4gdGhpcy5ydW5TY2hlbWF0aWMoe1xuICAgICAgY29sbGVjdGlvbk5hbWU6IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgc2NoZW1hdGljTmFtZTogdGhpcy5zY2hlbWF0aWNOYW1lLFxuICAgICAgc2NoZW1hdGljT3B0aW9uczogb3B0aW9uc1snLS0nXSB8fCBbXSxcbiAgICAgIGRlYnVnOiBvcHRpb25zLmRlYnVnLFxuICAgICAgZHJ5UnVuOiBvcHRpb25zLmRyeVJ1bixcbiAgICAgIGZvcmNlOiBvcHRpb25zLmZvcmNlLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUNvbGxlY3Rpb25OYW1lKG9wdGlvbnM6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIG9wdGlvbnMuY29sbGVjdGlvbiB8fCB0aGlzLmdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCk7XG4gIH1cbn1cbiJdfQ==