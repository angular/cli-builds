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
const build_1 = require("./build");
// defaults for BuildOptions
exports.baseEjectCommandOptions = [
    ...build_1.baseBuildCommandOptions,
    {
        name: 'force',
        type: Boolean,
        description: 'Overwrite any webpack.config.js and npm scripts already existing.'
    },
    {
        name: 'app',
        type: String,
        aliases: ['a'],
        description: 'Specifies app name to use.'
    }
];
class EjectCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'eject';
        this.description = 'Ejects your app and output the proper webpack configuration and scripts.';
        this.scope = command_1.CommandScope.inProject;
        this.arguments = [];
        this.options = exports.baseEjectCommandOptions;
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const EjectTask = require('../tasks/eject').default;
            const ejectTask = new EjectTask({
                project: this.project,
                ui: this.ui,
            });
            return yield ejectTask.run(options);
        });
    }
}
exports.default = EjectCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/eject.js.map