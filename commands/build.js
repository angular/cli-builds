"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const version_1 = require("../upgrade/version");
const Command = require('../ember-cli/lib/models/command');
// defaults for BuildOptions
exports.baseBuildCommandOptions = [
    {
        name: 'app',
        type: String,
        aliases: ['a', 'lib'],
        description: 'Specifies app name or index to use.'
    },
    {
        name: 'watch',
        type: Boolean,
        default: false,
        aliases: ['w'],
        description: 'Run build when files change.'
    }
];
const BuildCommand = Command.extend({
    name: 'build',
    description: 'Builds your app.',
    aliases: ['b'],
    availableOptions: exports.baseBuildCommandOptions,
    run: function (commandOptions, rawArgs) {
        // Check angular version.
        version_1.Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);
        const app = (rawArgs.length > 0 && !rawArgs[0].startsWith('-')) ?
            rawArgs[0] : commandOptions.app;
        const BuildTask = require('../tasks/build').default;
        const buildTask = new BuildTask({
            project: this.project,
            ui: this.ui,
            app
        });
        return buildTask.run(commandOptions);
    }
});
BuildCommand.overrideCore = true;
exports.default = BuildCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/build.js.map