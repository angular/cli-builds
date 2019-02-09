"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const child_process_1 = require("child_process");
async function default_1(packageName, logger, packageManager, projectRoot, save = true) {
    const installArgs = [];
    switch (packageManager) {
        case 'cnpm':
        case 'pnpm':
        case 'npm':
            installArgs.push('install', '--silent');
            break;
        case 'yarn':
            installArgs.push('add');
            break;
        default:
            packageManager = 'npm';
            installArgs.push('install', '--quiet');
            break;
    }
    logger.info(core_1.terminal.green(`Installing packages for tooling via ${packageManager}.`));
    if (packageName) {
        installArgs.push(packageName);
    }
    if (!save) {
        installArgs.push('--no-save');
    }
    const installOptions = {
        stdio: 'inherit',
        shell: true,
    };
    await new Promise((resolve, reject) => {
        child_process_1.spawn(packageManager, installArgs, installOptions)
            .on('close', (code) => {
            if (code === 0) {
                logger.info(core_1.terminal.green(`Installed packages for tooling via ${packageManager}.`));
                resolve();
            }
            else {
                const message = 'Package install failed, see above.';
                logger.info(core_1.terminal.red(message));
                reject(message);
            }
        });
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLWluc3RhbGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL3Rhc2tzL25wbS1pbnN0YWxsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQXlEO0FBQ3pELGlEQUFzQztBQVN2QixLQUFLLG9CQUFXLFdBQW1CLEVBQ25CLE1BQXNCLEVBQ3RCLGNBQXNCLEVBQ3RCLFdBQW1CLEVBQ25CLElBQUksR0FBRyxJQUFJO0lBQ3hDLE1BQU0sV0FBVyxHQUFhLEVBQUUsQ0FBQztJQUNqQyxRQUFRLGNBQWMsRUFBRTtRQUN0QixLQUFLLE1BQU0sQ0FBQztRQUNaLEtBQUssTUFBTSxDQUFDO1FBQ1osS0FBSyxLQUFLO1lBQ1IsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDeEMsTUFBTTtRQUVSLEtBQUssTUFBTTtZQUNULFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEIsTUFBTTtRQUVSO1lBQ0UsY0FBYyxHQUFHLEtBQUssQ0FBQztZQUN2QixXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN2QyxNQUFNO0tBQ1Q7SUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQVEsQ0FBQyxLQUFLLENBQUMsdUNBQXVDLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUV0RixJQUFJLFdBQVcsRUFBRTtRQUNmLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7S0FDL0I7SUFFRCxJQUFJLENBQUMsSUFBSSxFQUFFO1FBQ1QsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUMvQjtJQUNELE1BQU0sY0FBYyxHQUFHO1FBQ3JCLEtBQUssRUFBRSxTQUFTO1FBQ2hCLEtBQUssRUFBRSxJQUFJO0tBQ1osQ0FBQztJQUVGLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDcEMscUJBQUssQ0FBQyxjQUFjLEVBQUUsV0FBVyxFQUFFLGNBQWMsQ0FBQzthQUMvQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBWSxFQUFFLEVBQUU7WUFDNUIsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFO2dCQUNkLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBUSxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNyRixPQUFPLEVBQUUsQ0FBQzthQUNYO2lCQUFNO2dCQUNMLE1BQU0sT0FBTyxHQUFHLG9DQUFvQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ2pCO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFsREQsNEJBa0RDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBsb2dnaW5nLCB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHNwYXduIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5cblxuZXhwb3J0IHR5cGUgTnBtSW5zdGFsbCA9IChwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrYWdlTWFuYWdlcjogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0Um9vdDogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBzYXZlPzogYm9vbGVhbikgPT4gUHJvbWlzZTx2b2lkPjtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gKHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrYWdlTWFuYWdlcjogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3RSb290OiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZSA9IHRydWUpIHtcbiAgY29uc3QgaW5zdGFsbEFyZ3M6IHN0cmluZ1tdID0gW107XG4gIHN3aXRjaCAocGFja2FnZU1hbmFnZXIpIHtcbiAgICBjYXNlICdjbnBtJzpcbiAgICBjYXNlICdwbnBtJzpcbiAgICBjYXNlICducG0nOlxuICAgICAgaW5zdGFsbEFyZ3MucHVzaCgnaW5zdGFsbCcsICctLXNpbGVudCcpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICd5YXJuJzpcbiAgICAgIGluc3RhbGxBcmdzLnB1c2goJ2FkZCcpO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcGFja2FnZU1hbmFnZXIgPSAnbnBtJztcbiAgICAgIGluc3RhbGxBcmdzLnB1c2goJ2luc3RhbGwnLCAnLS1xdWlldCcpO1xuICAgICAgYnJlYWs7XG4gIH1cblxuICBsb2dnZXIuaW5mbyh0ZXJtaW5hbC5ncmVlbihgSW5zdGFsbGluZyBwYWNrYWdlcyBmb3IgdG9vbGluZyB2aWEgJHtwYWNrYWdlTWFuYWdlcn0uYCkpO1xuXG4gIGlmIChwYWNrYWdlTmFtZSkge1xuICAgIGluc3RhbGxBcmdzLnB1c2gocGFja2FnZU5hbWUpO1xuICB9XG5cbiAgaWYgKCFzYXZlKSB7XG4gICAgaW5zdGFsbEFyZ3MucHVzaCgnLS1uby1zYXZlJyk7XG4gIH1cbiAgY29uc3QgaW5zdGFsbE9wdGlvbnMgPSB7XG4gICAgc3RkaW86ICdpbmhlcml0JyxcbiAgICBzaGVsbDogdHJ1ZSxcbiAgfTtcblxuICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgc3Bhd24ocGFja2FnZU1hbmFnZXIsIGluc3RhbGxBcmdzLCBpbnN0YWxsT3B0aW9ucylcbiAgICAgIC5vbignY2xvc2UnLCAoY29kZTogbnVtYmVyKSA9PiB7XG4gICAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgICAgbG9nZ2VyLmluZm8odGVybWluYWwuZ3JlZW4oYEluc3RhbGxlZCBwYWNrYWdlcyBmb3IgdG9vbGluZyB2aWEgJHtwYWNrYWdlTWFuYWdlcn0uYCkpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBtZXNzYWdlID0gJ1BhY2thZ2UgaW5zdGFsbCBmYWlsZWQsIHNlZSBhYm92ZS4nO1xuICAgICAgICAgIGxvZ2dlci5pbmZvKHRlcm1pbmFsLnJlZChtZXNzYWdlKSk7XG4gICAgICAgICAgcmVqZWN0KG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgfSk7XG59XG4iXX0=