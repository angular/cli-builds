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
const common_tags_1 = require("common-tags");
const config_1 = require("../models/config");
class LintCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'lint';
        this.description = 'Lints code in existing project.';
        this.scope = command_1.CommandScope.inProject;
        this.arguments = [];
        this.options = [
            {
                name: 'fix',
                type: Boolean,
                default: false,
                description: 'Fixes linting errors (may overwrite linted files).'
            },
            {
                name: 'type-check',
                type: Boolean,
                default: false,
                description: 'Controls the type check for linting.'
            },
            {
                name: 'force',
                type: Boolean,
                default: false,
                description: 'Succeeds even if there was linting errors.'
            },
            {
                name: 'format',
                aliases: ['t'],
                type: String,
                default: 'prose',
                description: common_tags_1.oneLine `
        Output format (prose, json, stylish, verbose, pmd, msbuild, checkstyle, vso, fileslist).
      `
            }
        ];
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const LintTask = require('../tasks/lint').default;
            const lintTask = new LintTask({
                ui: this.ui,
                project: this.project
            });
            const lintResults = yield lintTask.run(Object.assign({}, options, { configs: config_1.CliConfig.fromProject().config.lint }));
            if (lintResults != 0) {
                throw '';
            }
            return lintResults;
        });
    }
}
LintCommand.aliases = ['l'];
exports.default = LintCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/lint.js.map