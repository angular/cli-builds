import { Command, CommandScope } from '../models/command';
import { ServeTaskOptions } from './serve';
export interface E2eTaskOptions extends ServeTaskOptions {
    config: string;
    serve: boolean;
    webdriverUpdate: boolean;
    specs: string[];
    suite: string;
    elementExplorer: boolean;
}
export default class E2eCommand extends Command {
    readonly name: string;
    readonly description: string;
    static aliases: string[];
    readonly scope: CommandScope;
    readonly arguments: string[];
    options: any;
    validate(options: E2eTaskOptions): boolean;
    run(options: E2eTaskOptions): any;
}
