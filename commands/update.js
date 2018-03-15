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
const update_1 = require("../tasks/update");
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
            const schematic = '@schematics/package-update:all';
            const updateTask = new update_1.UpdateTask({
                ui: this.ui,
                project: this.project
            });
            return yield updateTask.run(schematic, options);
        });
    }
}
UpdateCommand.aliases = [];
exports.default = UpdateCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/update.js.map