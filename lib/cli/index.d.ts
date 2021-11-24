export { VERSION, Version } from '../../models/version';
export default function (options: {
    testing?: boolean;
    cliArgs: string[];
}): Promise<number>;
