"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LintCommand = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const architect_command_1 = require("../models/architect-command");
const prompt_1 = require("../utilities/prompt");
const MissingBuilder = `
Cannot find "lint" target for the specified project.

You should add a package that implements linting capabilities.

For example:
  ng add @angular-eslint/schematics
`;
class LintCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.target = 'lint';
        this.multiTarget = true;
    }
    async initialize(options) {
        if (!options.help) {
            return super.initialize(options);
        }
    }
    async onMissingTarget() {
        this.logger.warn(MissingBuilder);
        const shouldAdd = await (0, prompt_1.askConfirmation)('Would you like to add ESLint now?', true, false);
        if (shouldAdd) {
            // Run `ng add @angular-eslint/schematics`
            const binPath = path.resolve(__dirname, '../bin/ng.js');
            const { status, error } = (0, child_process_1.spawnSync)(process.execPath, [binPath, 'add', '@angular-eslint/schematics'], {
                stdio: 'inherit',
            });
            if (error) {
                throw error;
            }
            return status !== null && status !== void 0 ? status : 0;
        }
    }
}
exports.LintCommand = LintCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGludC1pbXBsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvbGludC1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCxpREFBMEM7QUFDMUMsMkNBQTZCO0FBQzdCLG1FQUErRDtBQUUvRCxnREFBc0Q7QUFHdEQsTUFBTSxjQUFjLEdBQUc7Ozs7Ozs7Q0FPdEIsQ0FBQztBQUVGLE1BQWEsV0FBWSxTQUFRLG9DQUFtQztJQUFwRTs7UUFDb0IsV0FBTSxHQUFHLE1BQU0sQ0FBQztRQUNoQixnQkFBVyxHQUFHLElBQUksQ0FBQztJQThCdkMsQ0FBQztJQTVCVSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQXNDO1FBQzlELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ2pCLE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNsQztJQUNILENBQUM7SUFFUSxLQUFLLENBQUMsZUFBZTtRQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVqQyxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUEsd0JBQWUsRUFBQyxtQ0FBbUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDMUYsSUFBSSxTQUFTLEVBQUU7WUFDYiwwQ0FBMEM7WUFDMUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDeEQsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFBLHlCQUFTLEVBQ2pDLE9BQU8sQ0FBQyxRQUFRLEVBQ2hCLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSw0QkFBNEIsQ0FBQyxFQUM5QztnQkFDRSxLQUFLLEVBQUUsU0FBUzthQUNqQixDQUNGLENBQUM7WUFFRixJQUFJLEtBQUssRUFBRTtnQkFDVCxNQUFNLEtBQUssQ0FBQzthQUNiO1lBRUQsT0FBTyxNQUFNLGFBQU4sTUFBTSxjQUFOLE1BQU0sR0FBSSxDQUFDLENBQUM7U0FDcEI7SUFDSCxDQUFDO0NBQ0Y7QUFoQ0Qsa0NBZ0NDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IHNwYXduU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEFyY2hpdGVjdENvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvYXJjaGl0ZWN0LWNvbW1hbmQnO1xuaW1wb3J0IHsgQXJndW1lbnRzIH0gZnJvbSAnLi4vbW9kZWxzL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBhc2tDb25maXJtYXRpb24gfSBmcm9tICcuLi91dGlsaXRpZXMvcHJvbXB0JztcbmltcG9ydCB7IFNjaGVtYSBhcyBMaW50Q29tbWFuZFNjaGVtYSB9IGZyb20gJy4vbGludCc7XG5cbmNvbnN0IE1pc3NpbmdCdWlsZGVyID0gYFxuQ2Fubm90IGZpbmQgXCJsaW50XCIgdGFyZ2V0IGZvciB0aGUgc3BlY2lmaWVkIHByb2plY3QuXG5cbllvdSBzaG91bGQgYWRkIGEgcGFja2FnZSB0aGF0IGltcGxlbWVudHMgbGludGluZyBjYXBhYmlsaXRpZXMuXG5cbkZvciBleGFtcGxlOlxuICBuZyBhZGQgQGFuZ3VsYXItZXNsaW50L3NjaGVtYXRpY3NcbmA7XG5cbmV4cG9ydCBjbGFzcyBMaW50Q29tbWFuZCBleHRlbmRzIEFyY2hpdGVjdENvbW1hbmQ8TGludENvbW1hbmRTY2hlbWE+IHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgdGFyZ2V0ID0gJ2xpbnQnO1xuICBvdmVycmlkZSByZWFkb25seSBtdWx0aVRhcmdldCA9IHRydWU7XG5cbiAgb3ZlcnJpZGUgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBMaW50Q29tbWFuZFNjaGVtYSAmIEFyZ3VtZW50cyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGlmICghb3B0aW9ucy5oZWxwKSB7XG4gICAgICByZXR1cm4gc3VwZXIuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBhc3luYyBvbk1pc3NpbmdUYXJnZXQoKTogUHJvbWlzZTx2b2lkIHwgbnVtYmVyPiB7XG4gICAgdGhpcy5sb2dnZXIud2FybihNaXNzaW5nQnVpbGRlcik7XG5cbiAgICBjb25zdCBzaG91bGRBZGQgPSBhd2FpdCBhc2tDb25maXJtYXRpb24oJ1dvdWxkIHlvdSBsaWtlIHRvIGFkZCBFU0xpbnQgbm93PycsIHRydWUsIGZhbHNlKTtcbiAgICBpZiAoc2hvdWxkQWRkKSB7XG4gICAgICAvLyBSdW4gYG5nIGFkZCBAYW5ndWxhci1lc2xpbnQvc2NoZW1hdGljc2BcbiAgICAgIGNvbnN0IGJpblBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vYmluL25nLmpzJyk7XG4gICAgICBjb25zdCB7IHN0YXR1cywgZXJyb3IgfSA9IHNwYXduU3luYyhcbiAgICAgICAgcHJvY2Vzcy5leGVjUGF0aCxcbiAgICAgICAgW2JpblBhdGgsICdhZGQnLCAnQGFuZ3VsYXItZXNsaW50L3NjaGVtYXRpY3MnXSxcbiAgICAgICAge1xuICAgICAgICAgIHN0ZGlvOiAnaW5oZXJpdCcsXG4gICAgICAgIH0sXG4gICAgICApO1xuXG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdGF0dXMgPz8gMDtcbiAgICB9XG4gIH1cbn1cbiJdfQ==