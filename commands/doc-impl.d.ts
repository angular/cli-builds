import { Command } from '../models/command';
import { Arguments } from '../models/interface';
import { Schema as DocCommandSchema } from './doc';
export declare class DocCommand extends Command<DocCommandSchema> {
    run(options: DocCommandSchema & Arguments): Promise<0 | undefined>;
}
