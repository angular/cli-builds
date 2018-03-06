import { Command, CommandScope } from '../models/command';
import { BuildOptions } from '../models/build-options';
import { ServeTaskOptions } from './serve';
export interface ServeTaskOptions extends BuildOptions {
    port?: number;
    host?: string;
    proxyConfig?: string;
    liveReload?: boolean;
    publicHost?: string;
    disableHostCheck?: boolean;
    ssl?: boolean;
    sslKey?: string;
    sslCert?: string;
    open?: boolean;
    hmr?: boolean;
    servePath?: string;
}
export declare const baseServeCommandOptions: any;
export default class ServeCommand extends Command {
    readonly name: string;
    readonly description: string;
    static aliases: string[];
    readonly scope: CommandScope;
    readonly arguments: string[];
    readonly options: any;
    validate(_options: ServeTaskOptions): boolean;
    run(options: ServeTaskOptions): Promise<any>;
}
