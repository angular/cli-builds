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
const schematic_command_1 = require("../models/schematic-command");
class NewCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.allowMissingWorkspace = true;
        this.schematicName = 'ng-new';
        this.initialized = false;
    }
    initialize(options) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initialized) {
                return;
            }
            yield _super("initialize").call(this, options);
            this.initialized = true;
            const collectionName = this.parseCollectionName(options);
            const schematicOptions = yield this.getOptions({
                schematicName: this.schematicName,
                collectionName,
            });
            this.addOptions(this.options.concat(schematicOptions));
        });
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const packageJson = require('../package.json');
            options.version = packageJson.version;
            // Ensure skipGit has a boolean value.
            options.skipGit = options.skipGit === undefined ? false : options.skipGit;
            options = this.removeLocalOptions(options);
            return this.runSchematic({
                collectionName: collectionName,
                schematicName: this.schematicName,
                schematicOptions: options,
                debug: options.debug,
                dryRun: options.dryRun,
                force: options.force,
            });
        });
    }
    parseCollectionName(options) {
        const collectionName = options.collection || options.c || this.getDefaultSchematicCollection();
        return collectionName;
    }
    removeLocalOptions(options) {
        const opts = Object.assign({}, options);
        delete opts.verbose;
        delete opts.collection;
        return opts;
    }
}
exports.NewCommand = NewCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3LWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL25ldy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCxpREFBaUQ7QUFDakQsbUVBQStEO0FBRS9ELGdCQUF3QixTQUFRLG9DQUFnQjtJQUFoRDs7UUFDa0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDO1FBQ3JDLGtCQUFhLEdBQUcsUUFBUSxDQUFDO1FBRXpCLGdCQUFXLEdBQUcsS0FBSyxDQUFDO0lBOEQ5QixDQUFDO0lBN0RjLFVBQVUsQ0FBQyxPQUFZOzs7WUFDbEMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNwQixPQUFPO2FBQ1I7WUFFRCxNQUFNLG9CQUFnQixZQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRWhDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1lBRXhCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUV6RCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDN0MsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO2dCQUNqQyxjQUFjO2FBQ2YsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDekQsQ0FBQztLQUFBO0lBRVksR0FBRyxDQUFDLE9BQVk7O1lBQzNCLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtnQkFDbEIsT0FBTyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7YUFDeEI7WUFFRCxJQUFJLGNBQXNCLENBQUM7WUFDM0IsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO2dCQUN0QixjQUFjLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQzthQUNyQztpQkFBTTtnQkFDTCxjQUFjLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3BEO1lBRUQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDL0MsT0FBTyxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDO1lBRXRDLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFFMUUsT0FBTyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUzQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ3ZCLGNBQWMsRUFBRSxjQUFjO2dCQUM5QixhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7Z0JBQ2pDLGdCQUFnQixFQUFFLE9BQU87Z0JBQ3pCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztnQkFDcEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO2dCQUN0QixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7YUFDckIsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUFBO0lBRU8sbUJBQW1CLENBQUMsT0FBWTtRQUN0QyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsVUFBVSxJQUFJLE9BQU8sQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUM7UUFFL0YsT0FBTyxjQUFjLENBQUM7SUFDeEIsQ0FBQztJQUVPLGtCQUFrQixDQUFDLE9BQVk7UUFDckMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUV2QixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRjtBQWxFRCxnQ0FrRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIHRzbGludDpkaXNhYmxlOm5vLWdsb2JhbC10c2xpbnQtZGlzYWJsZSBuby1hbnlcbmltcG9ydCB7IFNjaGVtYXRpY0NvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvc2NoZW1hdGljLWNvbW1hbmQnO1xuXG5leHBvcnQgY2xhc3MgTmV3Q29tbWFuZCBleHRlbmRzIFNjaGVtYXRpY0NvbW1hbmQge1xuICBwdWJsaWMgcmVhZG9ubHkgYWxsb3dNaXNzaW5nV29ya3NwYWNlID0gdHJ1ZTtcbiAgcHJpdmF0ZSBzY2hlbWF0aWNOYW1lID0gJ25nLW5ldyc7XG5cbiAgcHJpdmF0ZSBpbml0aWFsaXplZCA9IGZhbHNlO1xuICBwdWJsaWMgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBhbnkpIHtcbiAgICBpZiAodGhpcy5pbml0aWFsaXplZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGF3YWl0IHN1cGVyLmluaXRpYWxpemUob3B0aW9ucyk7XG5cbiAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gdGhpcy5wYXJzZUNvbGxlY3Rpb25OYW1lKG9wdGlvbnMpO1xuXG4gICAgY29uc3Qgc2NoZW1hdGljT3B0aW9ucyA9IGF3YWl0IHRoaXMuZ2V0T3B0aW9ucyh7XG4gICAgICBzY2hlbWF0aWNOYW1lOiB0aGlzLnNjaGVtYXRpY05hbWUsXG4gICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICB9KTtcbiAgICB0aGlzLmFkZE9wdGlvbnModGhpcy5vcHRpb25zLmNvbmNhdChzY2hlbWF0aWNPcHRpb25zKSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IGFueSkge1xuICAgIGlmIChvcHRpb25zLmRyeVJ1bikge1xuICAgICAgb3B0aW9ucy5za2lwR2l0ID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBsZXQgY29sbGVjdGlvbk5hbWU6IHN0cmluZztcbiAgICBpZiAob3B0aW9ucy5jb2xsZWN0aW9uKSB7XG4gICAgICBjb2xsZWN0aW9uTmFtZSA9IG9wdGlvbnMuY29sbGVjdGlvbjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29sbGVjdGlvbk5hbWUgPSB0aGlzLnBhcnNlQ29sbGVjdGlvbk5hbWUob3B0aW9ucyk7XG4gICAgfVxuXG4gICAgY29uc3QgcGFja2FnZUpzb24gPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKTtcbiAgICBvcHRpb25zLnZlcnNpb24gPSBwYWNrYWdlSnNvbi52ZXJzaW9uO1xuXG4gICAgLy8gRW5zdXJlIHNraXBHaXQgaGFzIGEgYm9vbGVhbiB2YWx1ZS5cbiAgICBvcHRpb25zLnNraXBHaXQgPSBvcHRpb25zLnNraXBHaXQgPT09IHVuZGVmaW5lZCA/IGZhbHNlIDogb3B0aW9ucy5za2lwR2l0O1xuXG4gICAgb3B0aW9ucyA9IHRoaXMucmVtb3ZlTG9jYWxPcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgcmV0dXJuIHRoaXMucnVuU2NoZW1hdGljKHtcbiAgICAgIGNvbGxlY3Rpb25OYW1lOiBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWU6IHRoaXMuc2NoZW1hdGljTmFtZSxcbiAgICAgIHNjaGVtYXRpY09wdGlvbnM6IG9wdGlvbnMsXG4gICAgICBkZWJ1Zzogb3B0aW9ucy5kZWJ1ZyxcbiAgICAgIGRyeVJ1bjogb3B0aW9ucy5kcnlSdW4sXG4gICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VDb2xsZWN0aW9uTmFtZShvcHRpb25zOiBhbnkpOiBzdHJpbmcge1xuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gb3B0aW9ucy5jb2xsZWN0aW9uIHx8IG9wdGlvbnMuYyB8fCB0aGlzLmdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCk7XG5cbiAgICByZXR1cm4gY29sbGVjdGlvbk5hbWU7XG4gIH1cblxuICBwcml2YXRlIHJlbW92ZUxvY2FsT3B0aW9ucyhvcHRpb25zOiBhbnkpOiBhbnkge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKTtcbiAgICBkZWxldGUgb3B0cy52ZXJib3NlO1xuICAgIGRlbGV0ZSBvcHRzLmNvbGxlY3Rpb247XG5cbiAgICByZXR1cm4gb3B0cztcbiAgfVxufVxuIl19