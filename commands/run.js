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
const architect_1 = require("../utilities/architect");
class RunCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'run';
        this.description = 'Runs an architect configuration.';
        this.arguments = ['config'];
        this.options = [];
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const buildEvent = yield architect_1.runTarget(this.project.root, options.config, options)
                .toPromise();
            if (!buildEvent.success) {
                throw new Error('');
            }
        });
    }
}
exports.default = RunCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/run.js.map