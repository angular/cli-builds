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
const test_1 = require("../tasks/test");
const config_1 = require("../models/config");
const common_tags_1 = require("common-tags");
const config = config_1.CliConfig.fromProject() || config_1.CliConfig.fromGlobal();
const testConfigDefaults = config.getPaths('defaults.build', [
    'progress', 'poll', 'preserveSymlinks'
]);
class TestCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'test';
        this.description = 'Run unit tests in existing project.';
        this.scope = command_1.CommandScope.inProject;
        this.arguments = [];
        this.options = [
            {
                name: 'watch',
                type: Boolean,
                aliases: ['w'],
                description: 'Run build when files change.'
            },
            {
                name: 'code-coverage',
                type: Boolean,
                default: false,
                aliases: ['cc'],
                description: 'Coverage report will be in the coverage/ directory.'
            },
            {
                name: 'config',
                type: String,
                aliases: ['c'],
                description: common_tags_1.oneLine `Use a specific config file.
        Defaults to the karma config file in .angular-cli.json.`
            },
            {
                name: 'single-run',
                type: Boolean,
                aliases: ['sr'],
                description: 'Run tests a single time.'
            },
            {
                name: 'progress',
                type: Boolean,
                description: 'Log progress to the console while in progress.',
                default: typeof testConfigDefaults['progress'] !== 'undefined'
                    ? testConfigDefaults['progress']
                    : process.stdout.isTTY === true,
            },
            {
                name: 'browsers',
                type: String,
                description: 'Override which browsers tests are run against.'
            },
            {
                name: 'colors',
                type: Boolean,
                description: 'Enable or disable colors in the output (reporters and logs).'
            },
            {
                name: 'log-level',
                type: String,
                description: 'Level of logging.'
            },
            {
                name: 'port',
                type: Number,
                description: 'Port where the web server will be listening.'
            },
            {
                name: 'reporters',
                type: String,
                description: 'List of reporters to use.'
            },
            {
                name: 'sourcemaps',
                type: Boolean,
                default: true,
                aliases: ['sm', 'sourcemap'],
                description: 'Output sourcemaps.'
            },
            {
                name: 'poll',
                type: Number,
                default: testConfigDefaults['poll'],
                description: 'Enable and define the file watching poll time period (milliseconds).'
            },
            {
                name: 'environment',
                type: String,
                aliases: ['e'],
                description: 'Defines the build environment.'
            },
            {
                name: 'preserve-symlinks',
                type: Boolean,
                description: 'Do not use the real path when resolving modules.',
                default: testConfigDefaults['preserveSymlinks']
            },
            {
                name: 'app',
                type: String,
                aliases: ['a'],
                description: 'Specifies app name to use.'
            }
        ];
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const testTask = new test_1.default({
                ui: this.ui,
                project: this.project
            });
            if (options.watch !== undefined && !options.watch) {
                // if not watching ensure karma is doing a single run
                options.singleRun = true;
            }
            return yield testTask.run(options);
        });
    }
}
TestCommand.aliases = ['t'];
exports.default = TestCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/test.js.map