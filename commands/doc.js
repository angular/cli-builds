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
const doc_1 = require("../tasks/doc");
const command_1 = require("../models/command");
class DocCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'doc';
        this.description = 'Opens the official Angular API documentation for a given keyword.';
        this.arguments = ['keyword'];
        this.options = [
            {
                name: 'search',
                aliases: ['s'],
                type: Boolean,
                default: false,
                description: 'Search whole angular.io instead of just api.'
            }
        ];
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const keyword = options.keyword;
            const docTask = new doc_1.DocTask({
                ui: this.ui,
                project: this.project
            });
            return yield docTask.run(keyword, options.search);
        });
    }
}
DocCommand.aliases = ['d'];
exports.default = DocCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/doc.js.map