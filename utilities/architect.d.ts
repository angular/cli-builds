import { BuildEvent } from '@angular-devkit/architect';
import { Observable } from 'rxjs/Observable';
export declare function runTarget(root: string, target: string, options: any): Observable<BuildEvent>;
export interface RunOptions {
    root: string;
    app: string;
    target: string;
    configuration?: string;
    overrides?: object;
}
export declare function run(options: RunOptions): Observable<BuildEvent>;
