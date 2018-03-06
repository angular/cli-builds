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
class Xi18nCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'xi18n';
        this.description = 'Extracts i18n messages from source code.';
        this.scope = command_1.CommandScope.inProject;
        this.arguments = [];
        this.options = [
            {
                name: 'i18n-format',
                type: String,
                default: 'xlf',
                // TODO: re-add options for removed aliases:
                // aliases: ['f', {'xmb': 'xmb'}, {'xlf': 'xlf'}, {'xliff': 'xlf'}, {'xliff2': 'xliff2'} ],
                aliases: ['f'],
                description: 'Output format for the generated file.'
            },
            {
                name: 'output-path',
                type: 'Path',
                default: null,
                aliases: ['op'],
                description: 'Path where output will be placed.'
            },
            {
                name: 'verbose',
                type: Boolean,
                default: false,
                description: 'Adds more details to output logging.'
            },
            {
                name: 'progress',
                type: Boolean,
                description: 'Log progress to the console while running.',
                default: process.stdout.isTTY === true,
            },
            {
                name: 'app',
                type: String,
                aliases: ['a'],
                description: 'Specifies app name to use.'
            },
            {
                name: 'locale',
                type: String,
                aliases: ['l'],
                description: 'Specifies the source language of the application.'
            },
            {
                name: 'out-file',
                type: String,
                aliases: ['of'],
                description: 'Name of the file to output.'
            },
        ];
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { Extracti18nTask } = require('../tasks/extract-i18n');
            const xi18nTask = new Extracti18nTask({
                ui: this.ui,
                project: this.project
            });
            return yield xi18nTask.run(options);
        });
    }
}
Xi18nCommand.aliases = [];
exports.default = Xi18nCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/xi18n.js.map