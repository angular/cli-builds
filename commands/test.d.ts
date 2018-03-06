import { Command, CommandScope } from '../models/command';
export interface TestOptions {
    watch?: boolean;
    codeCoverage?: boolean;
    singleRun?: boolean;
    browsers?: string;
    colors?: boolean;
    log?: string;
    port?: number;
    reporters?: string;
    sourcemaps?: boolean;
    progress?: boolean;
    config: string;
    poll?: number;
    environment?: string;
    app?: string;
    preserveSymlinks?: boolean;
}
export default class TestCommand extends Command {
    readonly name: string;
    readonly description: string;
    static aliases: string[];
    readonly scope: CommandScope;
    readonly arguments: string[];
    readonly options: ({
        name: string;
        type: BooleanConstructor;
        aliases: string[];
        description: string;
    } | {
        name: string;
        type: BooleanConstructor;
        default: boolean;
        aliases: string[];
        description: string;
    } | {
        name: string;
        type: StringConstructor;
        aliases: string[];
        description: string;
    } | {
        name: string;
        type: BooleanConstructor;
        description: string;
        default: any;
    } | {
        name: string;
        type: StringConstructor;
        description: string;
    } | {
        name: string;
        type: BooleanConstructor;
        description: string;
    } | {
        name: string;
        type: NumberConstructor;
        description: string;
    } | {
        name: string;
        type: NumberConstructor;
        default: any;
        description: string;
    })[];
    run(options: TestOptions): Promise<any>;
}
