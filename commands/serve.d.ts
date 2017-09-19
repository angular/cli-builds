import { BuildOptions } from '../models/build-options';
export interface ServeTaskOptions extends BuildOptions {
    port?: number;
    host?: string;
}
export declare const baseServeCommandOptions: any;
declare const ServeCommand: any;
export default ServeCommand;
