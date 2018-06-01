"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable file-header
const core_1 = require("@angular-devkit/core");
const child_process_1 = require("child_process");
const util_1 = require("util");
const config_1 = require("./config");
const execPromise = util_1.promisify(child_process_1.exec);
const packageManager = config_1.getPackageManager();
function checkYarnOrCNPM() {
    // Don't show messages if user has already changed the default.
    if (packageManager !== 'default') {
        return Promise.resolve();
    }
    return Promise
        .all([checkYarn(), checkCNPM()])
        .then((data) => {
        const [isYarnInstalled, isCNPMInstalled] = data;
        if (isYarnInstalled && isCNPMInstalled) {
            console.log(core_1.terminal.yellow('You can `ng config -g cli.packageManager yarn` '
                + 'or `ng config -g cli.packageManager cnpm`.'));
        }
        else if (isYarnInstalled) {
            console.log(core_1.terminal.yellow('You can `ng config -g cli.packageManager yarn`.'));
        }
        else if (isCNPMInstalled) {
            console.log(core_1.terminal.yellow('You can `ng config -g cli.packageManager cnpm`.'));
        }
        else {
            if (packageManager !== 'default' && packageManager !== 'npm') {
                console.log(core_1.terminal.yellow(`Seems that ${packageManager} is not installed.`));
                console.log(core_1.terminal.yellow('You can `ng config -g cli.packageManager npm`.'));
            }
        }
    });
}
exports.checkYarnOrCNPM = checkYarnOrCNPM;
function checkYarn() {
    return execPromise('yarn --version')
        .then(() => true, () => false);
}
function checkCNPM() {
    return execPromise('cnpm --version')
        .then(() => true, () => false);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2stcGFja2FnZS1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS91dGlsaXRpZXMvY2hlY2stcGFja2FnZS1tYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0RBQXNEO0FBQ3RELCtDQUFnRDtBQUNoRCxpREFBcUM7QUFDckMsK0JBQWlDO0FBQ2pDLHFDQUE2QztBQUU3QyxNQUFNLFdBQVcsR0FBRyxnQkFBUyxDQUFDLG9CQUFJLENBQUMsQ0FBQztBQUNwQyxNQUFNLGNBQWMsR0FBRywwQkFBaUIsRUFBRSxDQUFDO0FBRzNDO0lBRUUsK0RBQStEO0lBQy9ELEVBQUUsQ0FBQyxDQUFDLGNBQWMsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVELE1BQU0sQ0FBQyxPQUFPO1NBQ1QsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztTQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFvQixFQUFFLEVBQUU7UUFDN0IsTUFBTSxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDaEQsRUFBRSxDQUFDLENBQUMsZUFBZSxJQUFJLGVBQWUsQ0FBQyxDQUFDLENBQUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFRLENBQUMsTUFBTSxDQUFDLGlEQUFpRDtrQkFDekUsNENBQTRDLENBQUMsQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztZQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLGVBQVEsQ0FBQyxNQUFNLENBQUMsaURBQWlELENBQUMsQ0FBQyxDQUFDO1FBQ2xGLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztZQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLGVBQVEsQ0FBQyxNQUFNLENBQUMsaURBQWlELENBQUMsQ0FBQyxDQUFDO1FBQ2xGLENBQUM7UUFBQyxJQUFJLENBQUUsQ0FBQztZQUNQLEVBQUUsQ0FBQyxDQUFDLGNBQWMsS0FBSyxTQUFTLElBQUksY0FBYyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQzdELE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBUSxDQUFDLE1BQU0sQ0FBQyxjQUFjLGNBQWMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO2dCQUMvRSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQVEsQ0FBQyxNQUFNLENBQUMsZ0RBQWdELENBQUMsQ0FBQyxDQUFDO1lBQ2pGLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDO0FBekJELDBDQXlCQztBQUVEO0lBQ0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQztTQUNqQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ25DLENBQUM7QUFFRDtJQUNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUM7U0FDakMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNuQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tZ2xvYmFsLXRzbGludC1kaXNhYmxlIGZpbGUtaGVhZGVyXG5pbXBvcnQgeyB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGV4ZWMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IHsgZ2V0UGFja2FnZU1hbmFnZXIgfSBmcm9tICcuL2NvbmZpZyc7XG5cbmNvbnN0IGV4ZWNQcm9taXNlID0gcHJvbWlzaWZ5KGV4ZWMpO1xuY29uc3QgcGFja2FnZU1hbmFnZXIgPSBnZXRQYWNrYWdlTWFuYWdlcigpO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBjaGVja1lhcm5PckNOUE0oKSB7XG5cbiAgLy8gRG9uJ3Qgc2hvdyBtZXNzYWdlcyBpZiB1c2VyIGhhcyBhbHJlYWR5IGNoYW5nZWQgdGhlIGRlZmF1bHQuXG4gIGlmIChwYWNrYWdlTWFuYWdlciAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9XG5cbiAgcmV0dXJuIFByb21pc2VcbiAgICAgIC5hbGwoW2NoZWNrWWFybigpLCBjaGVja0NOUE0oKV0pXG4gICAgICAudGhlbigoZGF0YTogQXJyYXk8Ym9vbGVhbj4pID0+IHtcbiAgICAgICAgY29uc3QgW2lzWWFybkluc3RhbGxlZCwgaXNDTlBNSW5zdGFsbGVkXSA9IGRhdGE7XG4gICAgICAgIGlmIChpc1lhcm5JbnN0YWxsZWQgJiYgaXNDTlBNSW5zdGFsbGVkKSB7XG4gICAgICAgICAgY29uc29sZS5sb2codGVybWluYWwueWVsbG93KCdZb3UgY2FuIGBuZyBjb25maWcgLWcgY2xpLnBhY2thZ2VNYW5hZ2VyIHlhcm5gICdcbiAgICAgICAgICAgICsgJ29yIGBuZyBjb25maWcgLWcgY2xpLnBhY2thZ2VNYW5hZ2VyIGNucG1gLicpKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1lhcm5JbnN0YWxsZWQpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyh0ZXJtaW5hbC55ZWxsb3coJ1lvdSBjYW4gYG5nIGNvbmZpZyAtZyBjbGkucGFja2FnZU1hbmFnZXIgeWFybmAuJykpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQ05QTUluc3RhbGxlZCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKHRlcm1pbmFsLnllbGxvdygnWW91IGNhbiBgbmcgY29uZmlnIC1nIGNsaS5wYWNrYWdlTWFuYWdlciBjbnBtYC4nKSk7XG4gICAgICAgIH0gZWxzZSAge1xuICAgICAgICAgIGlmIChwYWNrYWdlTWFuYWdlciAhPT0gJ2RlZmF1bHQnICYmIHBhY2thZ2VNYW5hZ2VyICE9PSAnbnBtJykge1xuICAgICAgICAgICAgY29uc29sZS5sb2codGVybWluYWwueWVsbG93KGBTZWVtcyB0aGF0ICR7cGFja2FnZU1hbmFnZXJ9IGlzIG5vdCBpbnN0YWxsZWQuYCkpO1xuICAgICAgICAgICAgY29uc29sZS5sb2codGVybWluYWwueWVsbG93KCdZb3UgY2FuIGBuZyBjb25maWcgLWcgY2xpLnBhY2thZ2VNYW5hZ2VyIG5wbWAuJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrWWFybigpIHtcbiAgcmV0dXJuIGV4ZWNQcm9taXNlKCd5YXJuIC0tdmVyc2lvbicpXG4gICAgLnRoZW4oKCkgPT4gdHJ1ZSwgKCkgPT4gZmFsc2UpO1xufVxuXG5mdW5jdGlvbiBjaGVja0NOUE0oKSB7XG4gIHJldHVybiBleGVjUHJvbWlzZSgnY25wbSAtLXZlcnNpb24nKVxuICAgIC50aGVuKCgpID0+IHRydWUsICgpID0+IGZhbHNlKTtcbn1cbiJdfQ==