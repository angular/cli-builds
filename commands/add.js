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
const chalk_1 = require("chalk");
const command_1 = require("../models/command");
const command_runner_1 = require("../models/command-runner");
const config_1 = require("../utilities/config");
const schematic_command_1 = require("../models/schematic-command");
const SilentError = require('silent-error');
class AddCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.name = 'add';
        this.description = 'Add support for a library to your project.';
        this.allowPrivateSchematics = true;
        this.scope = command_1.CommandScope.inProject;
        this.arguments = ['collection'];
        this.options = [];
    }
    _parseSchematicOptions(collectionName) {
        return __awaiter(this, void 0, void 0, function* () {
            const schematicOptions = yield this.getOptions({
                schematicName: 'ng-add',
                collectionName,
            });
            const options = this.options.concat(schematicOptions.options);
            const args = schematicOptions.arguments.map(arg => arg.name);
            return command_runner_1.parseOptions(this._rawArgs, options, args, this.argStrategy);
        });
    }
    validate(options) {
        const collectionName = options._[0];
        if (!collectionName) {
            throw new SilentError(`The "ng ${this.name}" command requires a name argument to be specified eg. `
                + `${chalk_1.default.yellow('ng add [name] ')}. For more details, use "ng help".`);
        }
        return true;
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const collectionName = options._[0];
            if (!collectionName) {
                throw new SilentError(`The "ng ${this.name}" command requires a name argument to be specified eg. `
                    + `${chalk_1.default.yellow('ng add [name] ')}. For more details, use "ng help".`);
            }
            const packageManager = config_1.getPackageManager();
            const npmInstall = require('../tasks/npm-install').default;
            const packageName = collectionName.startsWith('@')
                ? collectionName.split('/', 2).join('/')
                : collectionName.split('/', 1)[0];
            // We don't actually add the package to package.json, that would be the work of the package
            // itself.
            yield npmInstall(packageName, this.logger, packageManager, this.project.root, false);
            // Reparse the options with the new schematic accessible.
            options = yield this._parseSchematicOptions(collectionName);
            const runOptions = {
                schematicOptions: options,
                workingDir: this.project.root,
                collectionName,
                schematicName: 'ng-add',
                allowPrivate: true,
                dryRun: false,
                force: false,
            };
            return yield this.runSchematic(runOptions);
        });
    }
}
exports.default = AddCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/add.js.map