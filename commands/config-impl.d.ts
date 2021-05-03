import { Command } from '../models/command';
import { Arguments } from '../models/interface';
import { Schema as ConfigCommandSchema } from './config';
export declare class ConfigCommand extends Command<ConfigCommandSchema> {
    run(options: ConfigCommandSchema & Arguments): Promise<1 | 0>;
    private get;
    private set;
}
