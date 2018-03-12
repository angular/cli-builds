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
const command_1 = require("../models/command");
const schematic_run_1 = require("../tasks/schematic-run");
class UpdateCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'update';
        this.description = 'Updates your application.';
        this.scope = command_1.CommandScope.inProject;
        this.arguments = [];
        this.options = [
            {
                name: 'dry-run',
                type: Boolean,
                default: false,
                aliases: ['d'],
                description: 'Run through without making any changes.'
            },
            {
                name: 'next',
                type: Boolean,
                default: false,
                description: 'Install the next version, instead of the latest.'
            }
        ];
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const collectionName = '@schematics/package-update';
            const schematicName = 'all';
            const schematicRunTask = new schematic_run_1.default({
                ui: this.ui,
                project: this.project
            });
            const schematicRunOptions = {
                taskOptions: {
                    dryRun: options.dryRun,
                    version: options.next ? 'next' : undefined
                },
                workingDir: this.project.root,
                collectionName,
                schematicName
            };
            return schematicRunTask.run(schematicRunOptions);
        });
    }
}
UpdateCommand.aliases = [];
exports.default = UpdateCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/update.js.map