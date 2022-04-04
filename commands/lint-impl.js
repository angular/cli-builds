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
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
        }
        // Return an exit code to force the command to exit after adding the package
        return 1;
    }
}
exports.LintCommand = LintCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGludC1pbXBsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvbGludC1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsaURBQTBDO0FBQzFDLDJDQUE2QjtBQUM3QixtRUFBK0Q7QUFFL0QsZ0RBQXNEO0FBR3RELE1BQU0sY0FBYyxHQUFHOzs7Ozs7O0NBT3RCLENBQUM7QUFFRixNQUFhLFdBQVksU0FBUSxvQ0FBbUM7SUFBcEU7O1FBQ29CLFdBQU0sR0FBRyxNQUFNLENBQUM7UUFDaEIsZ0JBQVcsR0FBRyxJQUFJLENBQUM7SUErQnZDLENBQUM7SUE3QlUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFzQztRQUM5RCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRTtZQUNqQixPQUFPLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDbEM7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLGVBQWU7UUFDNUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFakMsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFBLHdCQUFlLEVBQUMsbUNBQW1DLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFGLElBQUksU0FBUyxFQUFFO1lBQ2IsMENBQTBDO1lBQzFDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBQSx5QkFBUyxFQUNqQyxPQUFPLENBQUMsUUFBUSxFQUNoQixDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsNEJBQTRCLENBQUMsRUFDOUM7Z0JBQ0UsS0FBSyxFQUFFLFNBQVM7YUFDakIsQ0FDRixDQUFDO1lBRUYsSUFBSSxLQUFLLEVBQUU7Z0JBQ1QsTUFBTSxLQUFLLENBQUM7YUFDYjtTQUNGO1FBRUQsNEVBQTRFO1FBQzVFLE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztDQUNGO0FBakNELGtDQWlDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBzcGF3blN5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBcmNoaXRlY3RDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL2FyY2hpdGVjdC1jb21tYW5kJztcbmltcG9ydCB7IEFyZ3VtZW50cyB9IGZyb20gJy4uL21vZGVscy9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgYXNrQ29uZmlybWF0aW9uIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3Byb21wdCc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgTGludENvbW1hbmRTY2hlbWEgfSBmcm9tICcuL2xpbnQnO1xuXG5jb25zdCBNaXNzaW5nQnVpbGRlciA9IGBcbkNhbm5vdCBmaW5kIFwibGludFwiIHRhcmdldCBmb3IgdGhlIHNwZWNpZmllZCBwcm9qZWN0LlxuXG5Zb3Ugc2hvdWxkIGFkZCBhIHBhY2thZ2UgdGhhdCBpbXBsZW1lbnRzIGxpbnRpbmcgY2FwYWJpbGl0aWVzLlxuXG5Gb3IgZXhhbXBsZTpcbiAgbmcgYWRkIEBhbmd1bGFyLWVzbGludC9zY2hlbWF0aWNzXG5gO1xuXG5leHBvcnQgY2xhc3MgTGludENvbW1hbmQgZXh0ZW5kcyBBcmNoaXRlY3RDb21tYW5kPExpbnRDb21tYW5kU2NoZW1hPiB7XG4gIG92ZXJyaWRlIHJlYWRvbmx5IHRhcmdldCA9ICdsaW50JztcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgbXVsdGlUYXJnZXQgPSB0cnVlO1xuXG4gIG92ZXJyaWRlIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogTGludENvbW1hbmRTY2hlbWEgJiBBcmd1bWVudHMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBpZiAoIW9wdGlvbnMuaGVscCkge1xuICAgICAgcmV0dXJuIHN1cGVyLmluaXRpYWxpemUob3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgYXN5bmMgb25NaXNzaW5nVGFyZ2V0KCk6IFByb21pc2U8dm9pZCB8IG51bWJlcj4ge1xuICAgIHRoaXMubG9nZ2VyLndhcm4oTWlzc2luZ0J1aWxkZXIpO1xuXG4gICAgY29uc3Qgc2hvdWxkQWRkID0gYXdhaXQgYXNrQ29uZmlybWF0aW9uKCdXb3VsZCB5b3UgbGlrZSB0byBhZGQgRVNMaW50IG5vdz8nLCB0cnVlLCBmYWxzZSk7XG4gICAgaWYgKHNob3VsZEFkZCkge1xuICAgICAgLy8gUnVuIGBuZyBhZGQgQGFuZ3VsYXItZXNsaW50L3NjaGVtYXRpY3NgXG4gICAgICBjb25zdCBiaW5QYXRoID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL2Jpbi9uZy5qcycpO1xuICAgICAgY29uc3QgeyBzdGF0dXMsIGVycm9yIH0gPSBzcGF3blN5bmMoXG4gICAgICAgIHByb2Nlc3MuZXhlY1BhdGgsXG4gICAgICAgIFtiaW5QYXRoLCAnYWRkJywgJ0Bhbmd1bGFyLWVzbGludC9zY2hlbWF0aWNzJ10sXG4gICAgICAgIHtcbiAgICAgICAgICBzdGRpbzogJ2luaGVyaXQnLFxuICAgICAgICB9LFxuICAgICAgKTtcblxuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJldHVybiBhbiBleGl0IGNvZGUgdG8gZm9yY2UgdGhlIGNvbW1hbmQgdG8gZXhpdCBhZnRlciBhZGRpbmcgdGhlIHBhY2thZ2VcbiAgICByZXR1cm4gMTtcbiAgfVxufVxuIl19