"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable file-header
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const child_process_1 = require("child_process");
function default_1(packageName, logger, packageManager, projectRoot, save = true) {
    return __awaiter(this, void 0, void 0, function* () {
        const installArgs = [];
        switch (packageManager) {
            case 'cnpm':
            case 'npm':
                installArgs.push('install', '--quiet');
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
            try {
                // Verify if we need to install the package (it might already be there).
                // If it's available and we shouldn't save, simply return. Nothing to be done.
                node_1.resolve(packageName, { checkLocal: true, basedir: projectRoot });
                return;
            }
            catch (e) {
                if (!(e instanceof node_1.ModuleNotFoundException)) {
                    throw e;
                }
            }
            installArgs.push(packageName);
        }
        if (!save) {
            installArgs.push('--no-save');
        }
        const installOptions = {
            stdio: 'inherit',
            shell: true,
        };
        yield new Promise((resolve, reject) => {
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
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLWluc3RhbGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL3Rhc2tzL25wbS1pbnN0YWxsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxzREFBc0Q7QUFDdEQsK0NBQXlEO0FBQ3pELG9EQUE2RTtBQUM3RSxpREFBc0M7QUFTdEMsbUJBQStCLFdBQW1CLEVBQ25CLE1BQXNCLEVBQ3RCLGNBQXNCLEVBQ3RCLFdBQW1CLEVBQ25CLElBQUksR0FBRyxJQUFJOztRQUN4QyxNQUFNLFdBQVcsR0FBYSxFQUFFLENBQUM7UUFDakMsTUFBTSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUN2QixLQUFLLE1BQU0sQ0FBQztZQUNaLEtBQUssS0FBSztnQkFDUixXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDdkMsS0FBSyxDQUFDO1lBRVIsS0FBSyxNQUFNO2dCQUNULFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3hCLEtBQUssQ0FBQztZQUVSO2dCQUNFLGNBQWMsR0FBRyxLQUFLLENBQUM7Z0JBQ3ZCLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUN2QyxLQUFLLENBQUM7UUFDVixDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFRLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFdEYsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNoQixJQUFJLENBQUM7Z0JBQ0gsd0VBQXdFO2dCQUN4RSw4RUFBOEU7Z0JBQzlFLGNBQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO2dCQUVqRSxNQUFNLENBQUM7WUFDVCxDQUFDO1lBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDWCxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLDhCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM1QyxNQUFNLENBQUMsQ0FBQztnQkFDVixDQUFDO1lBQ0gsQ0FBQztZQUNELFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNWLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUNELE1BQU0sY0FBYyxHQUFHO1lBQ3JCLEtBQUssRUFBRSxTQUFTO1lBQ2hCLEtBQUssRUFBRSxJQUFJO1NBQ1osQ0FBQztRQUVGLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDcEMscUJBQUssQ0FBQyxjQUFjLEVBQUUsV0FBVyxFQUFFLGNBQWMsQ0FBQztpQkFDL0MsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFO2dCQUM1QixFQUFFLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDZixNQUFNLENBQUMsSUFBSSxDQUFDLGVBQVEsQ0FBQyxLQUFLLENBQUMsc0NBQXNDLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDckYsT0FBTyxFQUFFLENBQUM7Z0JBQ1osQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDTixNQUFNLE9BQU8sR0FBRyxvQ0FBb0MsQ0FBQztvQkFDckQsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ25DLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDbEIsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQUE7QUE1REQsNEJBNERDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tZ2xvYmFsLXRzbGludC1kaXNhYmxlIGZpbGUtaGVhZGVyXG5pbXBvcnQgeyBsb2dnaW5nLCB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE1vZHVsZU5vdEZvdW5kRXhjZXB0aW9uLCByZXNvbHZlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQgeyBzcGF3biB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuXG5cbmV4cG9ydCB0eXBlIE5wbUluc3RhbGwgPSAocGFja2FnZU5hbWU6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja2FnZU1hbmFnZXI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdFJvb3Q6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZT86IGJvb2xlYW4pID0+IHZvaWQ7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIChwYWNrYWdlTmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja2FnZU1hbmFnZXI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0Um9vdDogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmUgPSB0cnVlKSB7XG4gIGNvbnN0IGluc3RhbGxBcmdzOiBzdHJpbmdbXSA9IFtdO1xuICBzd2l0Y2ggKHBhY2thZ2VNYW5hZ2VyKSB7XG4gICAgY2FzZSAnY25wbSc6XG4gICAgY2FzZSAnbnBtJzpcbiAgICAgIGluc3RhbGxBcmdzLnB1c2goJ2luc3RhbGwnLCAnLS1xdWlldCcpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICd5YXJuJzpcbiAgICAgIGluc3RhbGxBcmdzLnB1c2goJ2FkZCcpO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcGFja2FnZU1hbmFnZXIgPSAnbnBtJztcbiAgICAgIGluc3RhbGxBcmdzLnB1c2goJ2luc3RhbGwnLCAnLS1xdWlldCcpO1xuICAgICAgYnJlYWs7XG4gIH1cblxuICBsb2dnZXIuaW5mbyh0ZXJtaW5hbC5ncmVlbihgSW5zdGFsbGluZyBwYWNrYWdlcyBmb3IgdG9vbGluZyB2aWEgJHtwYWNrYWdlTWFuYWdlcn0uYCkpO1xuXG4gIGlmIChwYWNrYWdlTmFtZSkge1xuICAgIHRyeSB7XG4gICAgICAvLyBWZXJpZnkgaWYgd2UgbmVlZCB0byBpbnN0YWxsIHRoZSBwYWNrYWdlIChpdCBtaWdodCBhbHJlYWR5IGJlIHRoZXJlKS5cbiAgICAgIC8vIElmIGl0J3MgYXZhaWxhYmxlIGFuZCB3ZSBzaG91bGRuJ3Qgc2F2ZSwgc2ltcGx5IHJldHVybi4gTm90aGluZyB0byBiZSBkb25lLlxuICAgICAgcmVzb2x2ZShwYWNrYWdlTmFtZSwgeyBjaGVja0xvY2FsOiB0cnVlLCBiYXNlZGlyOiBwcm9qZWN0Um9vdCB9KTtcblxuICAgICAgcmV0dXJuO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmICghKGUgaW5zdGFuY2VvZiBNb2R1bGVOb3RGb3VuZEV4Y2VwdGlvbikpIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaW5zdGFsbEFyZ3MucHVzaChwYWNrYWdlTmFtZSk7XG4gIH1cblxuICBpZiAoIXNhdmUpIHtcbiAgICBpbnN0YWxsQXJncy5wdXNoKCctLW5vLXNhdmUnKTtcbiAgfVxuICBjb25zdCBpbnN0YWxsT3B0aW9ucyA9IHtcbiAgICBzdGRpbzogJ2luaGVyaXQnLFxuICAgIHNoZWxsOiB0cnVlLFxuICB9O1xuXG4gIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBzcGF3bihwYWNrYWdlTWFuYWdlciwgaW5zdGFsbEFyZ3MsIGluc3RhbGxPcHRpb25zKVxuICAgICAgLm9uKCdjbG9zZScsIChjb2RlOiBudW1iZXIpID0+IHtcbiAgICAgICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgICAgICBsb2dnZXIuaW5mbyh0ZXJtaW5hbC5ncmVlbihgSW5zdGFsbGVkIHBhY2thZ2VzIGZvciB0b29saW5nIHZpYSAke3BhY2thZ2VNYW5hZ2VyfS5gKSk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSAnUGFja2FnZSBpbnN0YWxsIGZhaWxlZCwgc2VlIGFib3ZlLic7XG4gICAgICAgICAgbG9nZ2VyLmluZm8odGVybWluYWwucmVkKG1lc3NhZ2UpKTtcbiAgICAgICAgICByZWplY3QobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9KTtcbn1cbiJdfQ==