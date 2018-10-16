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
const operators_1 = require("rxjs/operators");
const command_runner_1 = require("../../models/command-runner");
const config_1 = require("../../utilities/config");
const project_1 = require("../../utilities/project");
async function default_1(options) {
    const logger = new core_1.logging.IndentLogger('cling');
    let loggingSubscription;
    if (!options.testing) {
        loggingSubscription = initializeLogging(logger);
    }
    let projectDetails = project_1.getWorkspaceDetails();
    if (projectDetails === null) {
        const [, localPath] = config_1.getWorkspaceRaw('local');
        if (localPath !== null) {
            logger.fatal(`An invalid configuration file was found ['${localPath}'].`
                + ' Please delete the file before running the command.');
            return 1;
        }
        projectDetails = { root: process.cwd() };
    }
    try {
        const maybeExitCode = await command_runner_1.runCommand(options.cliArgs, logger, projectDetails);
        if (typeof maybeExitCode === 'number') {
            console.assert(Number.isInteger(maybeExitCode));
            return maybeExitCode;
        }
        return 0;
    }
    catch (err) {
        if (err instanceof Error) {
            logger.fatal(err.message);
            if (err.stack) {
                logger.fatal(err.stack);
            }
        }
        else if (typeof err === 'string') {
            logger.fatal(err);
        }
        else if (typeof err === 'number') {
            // Log nothing.
        }
        else {
            logger.fatal('An unexpected error occurred: ' + JSON.stringify(err));
        }
        if (options.testing) {
            debugger;
            throw err;
        }
        if (loggingSubscription) {
            loggingSubscription.unsubscribe();
        }
        return 1;
    }
}
exports.default = default_1;
// Initialize logging.
function initializeLogging(logger) {
    return logger
        .pipe(operators_1.filter(entry => (entry.level != 'debug')))
        .subscribe(entry => {
        let color = (x) => core_1.terminal.dim(core_1.terminal.white(x));
        let output = process.stdout;
        switch (entry.level) {
            case 'info':
                color = core_1.terminal.white;
                break;
            case 'warn':
                color = core_1.terminal.yellow;
                output = process.stderr;
                break;
            case 'error':
                color = core_1.terminal.red;
                output = process.stderr;
                break;
            case 'fatal':
                color = (x) => core_1.terminal.bold(core_1.terminal.red(x));
                output = process.stderr;
                break;
        }
        // If we do console.log(message) or process.stdout.write(message + '\n'), the process might
        // stop before the whole message is written and the stream is flushed. This happens when
        // streams are asynchronous.
        //
        // NodeJS IO streams are different depending on platform and usage. In POSIX environment,
        // for example, they're asynchronous when writing to a pipe, but synchronous when writing
        // to a TTY. In windows, it's the other way around. You can verify which is which with
        // stream.isTTY and platform, but this is not good enough.
        // In the async case, one should wait for the callback before sending more data or
        // continuing the process. In our case it would be rather hard to do (but not impossible).
        //
        // Instead we take the easy way out and simply chunk the message and call the write
        // function while the buffer drain itself asynchronously. With a smaller chunk size than
        // the buffer, we are mostly certain that it works. In this case, the chunk has been picked
        // as half a page size (4096/2 = 2048), minus some bytes for the color formatting.
        // On POSIX it seems the buffer is 2 pages (8192), but just to be sure (could be different
        // by platform).
        //
        // For more details, see https://nodejs.org/api/process.html#process_a_note_on_process_i_o
        const chunkSize = 2000; // Small chunk.
        let message = entry.message;
        while (message) {
            const chunk = message.slice(0, chunkSize);
            message = message.slice(chunkSize);
            output.write(color(chunk));
        }
        output.write('\n');
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9jbGkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCwrQ0FBeUQ7QUFDekQsOENBQXdDO0FBQ3hDLGdFQUF5RDtBQUN6RCxtREFBeUQ7QUFDekQscURBQThEO0FBRy9DLEtBQUssb0JBQVUsT0FBaUQ7SUFDN0UsTUFBTSxNQUFNLEdBQUcsSUFBSSxjQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pELElBQUksbUJBQW1CLENBQUM7SUFDeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7UUFDcEIsbUJBQW1CLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDakQ7SUFFRCxJQUFJLGNBQWMsR0FBRyw2QkFBbUIsRUFBRSxDQUFDO0lBQzNDLElBQUksY0FBYyxLQUFLLElBQUksRUFBRTtRQUMzQixNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsR0FBRyx3QkFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLElBQUksU0FBUyxLQUFLLElBQUksRUFBRTtZQUN0QixNQUFNLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxTQUFTLEtBQUs7a0JBQzNELHFEQUFxRCxDQUFDLENBQUM7WUFFcEUsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELGNBQWMsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztLQUMxQztJQUVELElBQUk7UUFDRixNQUFNLGFBQWEsR0FBRyxNQUFNLDJCQUFVLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDaEYsSUFBSSxPQUFPLGFBQWEsS0FBSyxRQUFRLEVBQUU7WUFDckMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7WUFFaEQsT0FBTyxhQUFhLENBQUM7U0FDdEI7UUFFRCxPQUFPLENBQUMsQ0FBQztLQUNWO0lBQUMsT0FBTyxHQUFHLEVBQUU7UUFDWixJQUFJLEdBQUcsWUFBWSxLQUFLLEVBQUU7WUFDeEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDMUIsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO2dCQUNiLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3pCO1NBQ0Y7YUFBTSxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtZQUNsQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ25CO2FBQU0sSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7WUFDbEMsZUFBZTtTQUNoQjthQUFNO1lBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDdEU7UUFFRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7WUFDbkIsUUFBUSxDQUFDO1lBQ1QsTUFBTSxHQUFHLENBQUM7U0FDWDtRQUVELElBQUksbUJBQW1CLEVBQUU7WUFDdkIsbUJBQW1CLENBQUMsV0FBVyxFQUFFLENBQUM7U0FDbkM7UUFFRCxPQUFPLENBQUMsQ0FBQztLQUNWO0FBQ0gsQ0FBQztBQXRERCw0QkFzREM7QUFFRCxzQkFBc0I7QUFDdEIsU0FBUyxpQkFBaUIsQ0FBQyxNQUFzQjtJQUMvQyxPQUFPLE1BQU07U0FDVixJQUFJLENBQUMsa0JBQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQy9DLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNqQixJQUFJLEtBQUssR0FBRyxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsZUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM1QixRQUFRLEtBQUssQ0FBQyxLQUFLLEVBQUU7WUFDbkIsS0FBSyxNQUFNO2dCQUNULEtBQUssR0FBRyxlQUFRLENBQUMsS0FBSyxDQUFDO2dCQUN2QixNQUFNO1lBQ1IsS0FBSyxNQUFNO2dCQUNULEtBQUssR0FBRyxlQUFRLENBQUMsTUFBTSxDQUFDO2dCQUN4QixNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztnQkFDeEIsTUFBTTtZQUNSLEtBQUssT0FBTztnQkFDVixLQUFLLEdBQUcsZUFBUSxDQUFDLEdBQUcsQ0FBQztnQkFDckIsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7Z0JBQ3hCLE1BQU07WUFDUixLQUFLLE9BQU87Z0JBQ1YsS0FBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxlQUFRLENBQUMsSUFBSSxDQUFDLGVBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7Z0JBQ3hCLE1BQU07U0FDVDtRQUVELDJGQUEyRjtRQUMzRix3RkFBd0Y7UUFDeEYsNEJBQTRCO1FBQzVCLEVBQUU7UUFDRix5RkFBeUY7UUFDekYseUZBQXlGO1FBQ3pGLHNGQUFzRjtRQUN0RiwwREFBMEQ7UUFDMUQsa0ZBQWtGO1FBQ2xGLDBGQUEwRjtRQUMxRixFQUFFO1FBQ0YsbUZBQW1GO1FBQ25GLHdGQUF3RjtRQUN4RiwyRkFBMkY7UUFDM0Ysa0ZBQWtGO1FBQ2xGLDBGQUEwRjtRQUMxRixnQkFBZ0I7UUFDaEIsRUFBRTtRQUNGLDBGQUEwRjtRQUMxRixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBRSxlQUFlO1FBQ3hDLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7UUFDNUIsT0FBTyxPQUFPLEVBQUU7WUFDZCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxQyxPQUFPLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNuQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQzVCO1FBQ0QsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQixDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGxvZ2dpbmcsIHRlcm1pbmFsIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgZmlsdGVyIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgcnVuQ29tbWFuZCB9IGZyb20gJy4uLy4uL21vZGVscy9jb21tYW5kLXJ1bm5lcic7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2VSYXcgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZURldGFpbHMgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcHJvamVjdCc7XG5cblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ob3B0aW9uczogeyB0ZXN0aW5nPzogYm9vbGVhbiwgY2xpQXJnczogc3RyaW5nW10gfSkge1xuICBjb25zdCBsb2dnZXIgPSBuZXcgbG9nZ2luZy5JbmRlbnRMb2dnZXIoJ2NsaW5nJyk7XG4gIGxldCBsb2dnaW5nU3Vic2NyaXB0aW9uO1xuICBpZiAoIW9wdGlvbnMudGVzdGluZykge1xuICAgIGxvZ2dpbmdTdWJzY3JpcHRpb24gPSBpbml0aWFsaXplTG9nZ2luZyhsb2dnZXIpO1xuICB9XG5cbiAgbGV0IHByb2plY3REZXRhaWxzID0gZ2V0V29ya3NwYWNlRGV0YWlscygpO1xuICBpZiAocHJvamVjdERldGFpbHMgPT09IG51bGwpIHtcbiAgICBjb25zdCBbLCBsb2NhbFBhdGhdID0gZ2V0V29ya3NwYWNlUmF3KCdsb2NhbCcpO1xuICAgIGlmIChsb2NhbFBhdGggIT09IG51bGwpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChgQW4gaW52YWxpZCBjb25maWd1cmF0aW9uIGZpbGUgd2FzIGZvdW5kIFsnJHtsb2NhbFBhdGh9J10uYFxuICAgICAgICAgICAgICAgICArICcgUGxlYXNlIGRlbGV0ZSB0aGUgZmlsZSBiZWZvcmUgcnVubmluZyB0aGUgY29tbWFuZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgcHJvamVjdERldGFpbHMgPSB7IHJvb3Q6IHByb2Nlc3MuY3dkKCkgfTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgbWF5YmVFeGl0Q29kZSA9IGF3YWl0IHJ1bkNvbW1hbmQob3B0aW9ucy5jbGlBcmdzLCBsb2dnZXIsIHByb2plY3REZXRhaWxzKTtcbiAgICBpZiAodHlwZW9mIG1heWJlRXhpdENvZGUgPT09ICdudW1iZXInKSB7XG4gICAgICBjb25zb2xlLmFzc2VydChOdW1iZXIuaXNJbnRlZ2VyKG1heWJlRXhpdENvZGUpKTtcblxuICAgICAgcmV0dXJuIG1heWJlRXhpdENvZGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgbG9nZ2VyLmZhdGFsKGVyci5tZXNzYWdlKTtcbiAgICAgIGlmIChlcnIuc3RhY2spIHtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKGVyci5zdGFjayk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXJyID09PSAnc3RyaW5nJykge1xuICAgICAgbG9nZ2VyLmZhdGFsKGVycik7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXJyID09PSAnbnVtYmVyJykge1xuICAgICAgLy8gTG9nIG5vdGhpbmcuXG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZ2dlci5mYXRhbCgnQW4gdW5leHBlY3RlZCBlcnJvciBvY2N1cnJlZDogJyArIEpTT04uc3RyaW5naWZ5KGVycikpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnRlc3RpbmcpIHtcbiAgICAgIGRlYnVnZ2VyO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cblxuICAgIGlmIChsb2dnaW5nU3Vic2NyaXB0aW9uKSB7XG4gICAgICBsb2dnaW5nU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDE7XG4gIH1cbn1cblxuLy8gSW5pdGlhbGl6ZSBsb2dnaW5nLlxuZnVuY3Rpb24gaW5pdGlhbGl6ZUxvZ2dpbmcobG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcikge1xuICByZXR1cm4gbG9nZ2VyXG4gICAgLnBpcGUoZmlsdGVyKGVudHJ5ID0+IChlbnRyeS5sZXZlbCAhPSAnZGVidWcnKSkpXG4gICAgLnN1YnNjcmliZShlbnRyeSA9PiB7XG4gICAgICBsZXQgY29sb3IgPSAoeDogc3RyaW5nKSA9PiB0ZXJtaW5hbC5kaW0odGVybWluYWwud2hpdGUoeCkpO1xuICAgICAgbGV0IG91dHB1dCA9IHByb2Nlc3Muc3Rkb3V0O1xuICAgICAgc3dpdGNoIChlbnRyeS5sZXZlbCkge1xuICAgICAgICBjYXNlICdpbmZvJzpcbiAgICAgICAgICBjb2xvciA9IHRlcm1pbmFsLndoaXRlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICd3YXJuJzpcbiAgICAgICAgICBjb2xvciA9IHRlcm1pbmFsLnllbGxvdztcbiAgICAgICAgICBvdXRwdXQgPSBwcm9jZXNzLnN0ZGVycjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgIGNvbG9yID0gdGVybWluYWwucmVkO1xuICAgICAgICAgIG91dHB1dCA9IHByb2Nlc3Muc3RkZXJyO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdmYXRhbCc6XG4gICAgICAgICAgY29sb3IgPSAoeCkgPT4gdGVybWluYWwuYm9sZCh0ZXJtaW5hbC5yZWQoeCkpO1xuICAgICAgICAgIG91dHB1dCA9IHByb2Nlc3Muc3RkZXJyO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB3ZSBkbyBjb25zb2xlLmxvZyhtZXNzYWdlKSBvciBwcm9jZXNzLnN0ZG91dC53cml0ZShtZXNzYWdlICsgJ1xcbicpLCB0aGUgcHJvY2VzcyBtaWdodFxuICAgICAgLy8gc3RvcCBiZWZvcmUgdGhlIHdob2xlIG1lc3NhZ2UgaXMgd3JpdHRlbiBhbmQgdGhlIHN0cmVhbSBpcyBmbHVzaGVkLiBUaGlzIGhhcHBlbnMgd2hlblxuICAgICAgLy8gc3RyZWFtcyBhcmUgYXN5bmNocm9ub3VzLlxuICAgICAgLy9cbiAgICAgIC8vIE5vZGVKUyBJTyBzdHJlYW1zIGFyZSBkaWZmZXJlbnQgZGVwZW5kaW5nIG9uIHBsYXRmb3JtIGFuZCB1c2FnZS4gSW4gUE9TSVggZW52aXJvbm1lbnQsXG4gICAgICAvLyBmb3IgZXhhbXBsZSwgdGhleSdyZSBhc3luY2hyb25vdXMgd2hlbiB3cml0aW5nIHRvIGEgcGlwZSwgYnV0IHN5bmNocm9ub3VzIHdoZW4gd3JpdGluZ1xuICAgICAgLy8gdG8gYSBUVFkuIEluIHdpbmRvd3MsIGl0J3MgdGhlIG90aGVyIHdheSBhcm91bmQuIFlvdSBjYW4gdmVyaWZ5IHdoaWNoIGlzIHdoaWNoIHdpdGhcbiAgICAgIC8vIHN0cmVhbS5pc1RUWSBhbmQgcGxhdGZvcm0sIGJ1dCB0aGlzIGlzIG5vdCBnb29kIGVub3VnaC5cbiAgICAgIC8vIEluIHRoZSBhc3luYyBjYXNlLCBvbmUgc2hvdWxkIHdhaXQgZm9yIHRoZSBjYWxsYmFjayBiZWZvcmUgc2VuZGluZyBtb3JlIGRhdGEgb3JcbiAgICAgIC8vIGNvbnRpbnVpbmcgdGhlIHByb2Nlc3MuIEluIG91ciBjYXNlIGl0IHdvdWxkIGJlIHJhdGhlciBoYXJkIHRvIGRvIChidXQgbm90IGltcG9zc2libGUpLlxuICAgICAgLy9cbiAgICAgIC8vIEluc3RlYWQgd2UgdGFrZSB0aGUgZWFzeSB3YXkgb3V0IGFuZCBzaW1wbHkgY2h1bmsgdGhlIG1lc3NhZ2UgYW5kIGNhbGwgdGhlIHdyaXRlXG4gICAgICAvLyBmdW5jdGlvbiB3aGlsZSB0aGUgYnVmZmVyIGRyYWluIGl0c2VsZiBhc3luY2hyb25vdXNseS4gV2l0aCBhIHNtYWxsZXIgY2h1bmsgc2l6ZSB0aGFuXG4gICAgICAvLyB0aGUgYnVmZmVyLCB3ZSBhcmUgbW9zdGx5IGNlcnRhaW4gdGhhdCBpdCB3b3Jrcy4gSW4gdGhpcyBjYXNlLCB0aGUgY2h1bmsgaGFzIGJlZW4gcGlja2VkXG4gICAgICAvLyBhcyBoYWxmIGEgcGFnZSBzaXplICg0MDk2LzIgPSAyMDQ4KSwgbWludXMgc29tZSBieXRlcyBmb3IgdGhlIGNvbG9yIGZvcm1hdHRpbmcuXG4gICAgICAvLyBPbiBQT1NJWCBpdCBzZWVtcyB0aGUgYnVmZmVyIGlzIDIgcGFnZXMgKDgxOTIpLCBidXQganVzdCB0byBiZSBzdXJlIChjb3VsZCBiZSBkaWZmZXJlbnRcbiAgICAgIC8vIGJ5IHBsYXRmb3JtKS5cbiAgICAgIC8vXG4gICAgICAvLyBGb3IgbW9yZSBkZXRhaWxzLCBzZWUgaHR0cHM6Ly9ub2RlanMub3JnL2FwaS9wcm9jZXNzLmh0bWwjcHJvY2Vzc19hX25vdGVfb25fcHJvY2Vzc19pX29cbiAgICAgIGNvbnN0IGNodW5rU2l6ZSA9IDIwMDA7ICAvLyBTbWFsbCBjaHVuay5cbiAgICAgIGxldCBtZXNzYWdlID0gZW50cnkubWVzc2FnZTtcbiAgICAgIHdoaWxlIChtZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IGNodW5rID0gbWVzc2FnZS5zbGljZSgwLCBjaHVua1NpemUpO1xuICAgICAgICBtZXNzYWdlID0gbWVzc2FnZS5zbGljZShjaHVua1NpemUpO1xuICAgICAgICBvdXRwdXQud3JpdGUoY29sb3IoY2h1bmspKTtcbiAgICAgIH1cbiAgICAgIG91dHB1dC53cml0ZSgnXFxuJyk7XG4gICAgfSk7XG59XG4iXX0=