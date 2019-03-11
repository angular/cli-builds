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
    await new Promise((resolve, reject) => {
        child_process_1.spawn(packageManager, installArgs, { stdio: 'inherit', shell: true })
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLWluc3RhbGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL3Rhc2tzL25wbS1pbnN0YWxsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQXlEO0FBQ3pELGlEQUFzQztBQVN2QixLQUFLLG9CQUFXLFdBQW1CLEVBQ25CLE1BQXNCLEVBQ3RCLGNBQXNCLEVBQ3RCLFdBQW1CLEVBQ25CLElBQUksR0FBRyxJQUFJO0lBQ3hDLE1BQU0sV0FBVyxHQUFhLEVBQUUsQ0FBQztJQUNqQyxRQUFRLGNBQWMsRUFBRTtRQUN0QixLQUFLLE1BQU0sQ0FBQztRQUNaLEtBQUssTUFBTSxDQUFDO1FBQ1osS0FBSyxLQUFLO1lBQ1IsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDeEMsTUFBTTtRQUVSLEtBQUssTUFBTTtZQUNULFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEIsTUFBTTtRQUVSO1lBQ0UsY0FBYyxHQUFHLEtBQUssQ0FBQztZQUN2QixXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN2QyxNQUFNO0tBQ1Q7SUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQVEsQ0FBQyxLQUFLLENBQUMsdUNBQXVDLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUV0RixJQUFJLFdBQVcsRUFBRTtRQUNmLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7S0FDL0I7SUFFRCxJQUFJLENBQUMsSUFBSSxFQUFFO1FBQ1QsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUMvQjtJQUVELE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDcEMscUJBQUssQ0FBQyxjQUFjLEVBQUUsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUM7YUFDbEUsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFO1lBQzVCLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRTtnQkFDZCxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQVEsQ0FBQyxLQUFLLENBQUMsc0NBQXNDLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDckYsT0FBTyxFQUFFLENBQUM7YUFDWDtpQkFBTTtnQkFDTCxNQUFNLE9BQU8sR0FBRyxvQ0FBb0MsQ0FBQztnQkFDckQsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ25DLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNqQjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBOUNELDRCQThDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgbG9nZ2luZywgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBzcGF3biB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuXG5cbmV4cG9ydCB0eXBlIE5wbUluc3RhbGwgPSAocGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja2FnZU1hbmFnZXI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdFJvb3Q6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZT86IGJvb2xlYW4pID0+IFByb21pc2U8dm9pZD47XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIChwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja2FnZU1hbmFnZXI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0Um9vdDogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmUgPSB0cnVlKSB7XG4gIGNvbnN0IGluc3RhbGxBcmdzOiBzdHJpbmdbXSA9IFtdO1xuICBzd2l0Y2ggKHBhY2thZ2VNYW5hZ2VyKSB7XG4gICAgY2FzZSAnY25wbSc6XG4gICAgY2FzZSAncG5wbSc6XG4gICAgY2FzZSAnbnBtJzpcbiAgICAgIGluc3RhbGxBcmdzLnB1c2goJ2luc3RhbGwnLCAnLS1zaWxlbnQnKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAneWFybic6XG4gICAgICBpbnN0YWxsQXJncy5wdXNoKCdhZGQnKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHBhY2thZ2VNYW5hZ2VyID0gJ25wbSc7XG4gICAgICBpbnN0YWxsQXJncy5wdXNoKCdpbnN0YWxsJywgJy0tcXVpZXQnKTtcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgbG9nZ2VyLmluZm8odGVybWluYWwuZ3JlZW4oYEluc3RhbGxpbmcgcGFja2FnZXMgZm9yIHRvb2xpbmcgdmlhICR7cGFja2FnZU1hbmFnZXJ9LmApKTtcblxuICBpZiAocGFja2FnZU5hbWUpIHtcbiAgICBpbnN0YWxsQXJncy5wdXNoKHBhY2thZ2VOYW1lKTtcbiAgfVxuXG4gIGlmICghc2F2ZSkge1xuICAgIGluc3RhbGxBcmdzLnB1c2goJy0tbm8tc2F2ZScpO1xuICB9XG5cbiAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHNwYXduKHBhY2thZ2VNYW5hZ2VyLCBpbnN0YWxsQXJncywgeyBzdGRpbzogJ2luaGVyaXQnLCBzaGVsbDogdHJ1ZSB9KVxuICAgICAgLm9uKCdjbG9zZScsIChjb2RlOiBudW1iZXIpID0+IHtcbiAgICAgICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgICAgICBsb2dnZXIuaW5mbyh0ZXJtaW5hbC5ncmVlbihgSW5zdGFsbGVkIHBhY2thZ2VzIGZvciB0b29saW5nIHZpYSAke3BhY2thZ2VNYW5hZ2VyfS5gKSk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSAnUGFja2FnZSBpbnN0YWxsIGZhaWxlZCwgc2VlIGFib3ZlLic7XG4gICAgICAgICAgbG9nZ2VyLmluZm8odGVybWluYWwucmVkKG1lc3NhZ2UpKTtcbiAgICAgICAgICByZWplY3QobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9KTtcbn1cbiJdfQ==