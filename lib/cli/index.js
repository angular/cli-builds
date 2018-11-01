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
        .subscribe(entry => {
        let color = (x) => core_1.terminal.dim(core_1.terminal.white(x));
        let output = process.stdout;
        switch (entry.level) {
            case 'debug':
                return;
            case 'info':
                color = core_1.terminal.white;
                break;
            case 'warn':
                color = (x) => core_1.terminal.bold(core_1.terminal.yellow(x));
                output = process.stderr;
                break;
            case 'fatal':
            case 'error':
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9jbGkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCwrQ0FBeUQ7QUFDekQsZ0VBQXlEO0FBQ3pELG1EQUF5RDtBQUN6RCxxREFBOEQ7QUFHL0MsS0FBSyxvQkFBVSxPQUFpRDtJQUM3RSxNQUFNLE1BQU0sR0FBRyxJQUFJLGNBQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDakQsSUFBSSxtQkFBbUIsQ0FBQztJQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtRQUNwQixtQkFBbUIsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUNqRDtJQUVELElBQUksY0FBYyxHQUFHLDZCQUFtQixFQUFFLENBQUM7SUFDM0MsSUFBSSxjQUFjLEtBQUssSUFBSSxFQUFFO1FBQzNCLE1BQU0sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxHQUFHLHdCQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0MsSUFBSSxTQUFTLEtBQUssSUFBSSxFQUFFO1lBQ3RCLE1BQU0sQ0FBQyxLQUFLLENBQUMsNkNBQTZDLFNBQVMsS0FBSztrQkFDM0QscURBQXFELENBQUMsQ0FBQztZQUVwRSxPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsY0FBYyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO0tBQzFDO0lBRUQsSUFBSTtRQUNGLE1BQU0sYUFBYSxHQUFHLE1BQU0sMkJBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNoRixJQUFJLE9BQU8sYUFBYSxLQUFLLFFBQVEsRUFBRTtZQUNyQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUVoRCxPQUFPLGFBQWEsQ0FBQztTQUN0QjtRQUVELE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7SUFBQyxPQUFPLEdBQUcsRUFBRTtRQUNaLElBQUksR0FBRyxZQUFZLEtBQUssRUFBRTtZQUN4QixNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMxQixJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUU7Z0JBQ2IsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDekI7U0FDRjthQUFNLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFO1lBQ2xDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDbkI7YUFBTSxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtZQUNsQyxlQUFlO1NBQ2hCO2FBQU07WUFDTCxNQUFNLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUN0RTtRQUVELElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNuQixRQUFRLENBQUM7WUFDVCxNQUFNLEdBQUcsQ0FBQztTQUNYO1FBRUQsSUFBSSxtQkFBbUIsRUFBRTtZQUN2QixtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQztTQUNuQztRQUVELE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7QUFDSCxDQUFDO0FBdERELDRCQXNEQztBQUVELHNCQUFzQjtBQUN0QixTQUFTLGlCQUFpQixDQUFDLE1BQXNCO0lBQy9DLE9BQU8sTUFBTTtTQUNWLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNqQixJQUFJLEtBQUssR0FBRyxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsZUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM1QixRQUFRLEtBQUssQ0FBQyxLQUFLLEVBQUU7WUFDbkIsS0FBSyxPQUFPO2dCQUNWLE9BQU87WUFDVCxLQUFLLE1BQU07Z0JBQ1QsS0FBSyxHQUFHLGVBQVEsQ0FBQyxLQUFLLENBQUM7Z0JBQ3ZCLE1BQU07WUFDUixLQUFLLE1BQU07Z0JBQ1QsS0FBSyxHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxlQUFRLENBQUMsSUFBSSxDQUFDLGVBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekQsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7Z0JBQ3hCLE1BQU07WUFDUixLQUFLLE9BQU8sQ0FBQztZQUNiLEtBQUssT0FBTztnQkFDVixLQUFLLEdBQUcsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLGVBQVEsQ0FBQyxJQUFJLENBQUMsZUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN0RCxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztnQkFDeEIsTUFBTTtTQUNUO1FBR0QsMkZBQTJGO1FBQzNGLHdGQUF3RjtRQUN4Riw0QkFBNEI7UUFDNUIsRUFBRTtRQUNGLHlGQUF5RjtRQUN6Rix5RkFBeUY7UUFDekYsc0ZBQXNGO1FBQ3RGLDBEQUEwRDtRQUMxRCxrRkFBa0Y7UUFDbEYsMEZBQTBGO1FBQzFGLEVBQUU7UUFDRixtRkFBbUY7UUFDbkYsd0ZBQXdGO1FBQ3hGLDJGQUEyRjtRQUMzRixrRkFBa0Y7UUFDbEYsMEZBQTBGO1FBQzFGLGdCQUFnQjtRQUNoQixFQUFFO1FBQ0YsMEZBQTBGO1FBQzFGLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFFLGVBQWU7UUFDeEMsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztRQUM1QixPQUFPLE9BQU8sRUFBRTtZQUNkLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFDLE9BQU8sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDNUI7UUFDRCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgbG9nZ2luZywgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBydW5Db21tYW5kIH0gZnJvbSAnLi4vLi4vbW9kZWxzL2NvbW1hbmQtcnVubmVyJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZVJhdyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlRGV0YWlscyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wcm9qZWN0JztcblxuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHRpb25zOiB7IHRlc3Rpbmc/OiBib29sZWFuLCBjbGlBcmdzOiBzdHJpbmdbXSB9KSB7XG4gIGNvbnN0IGxvZ2dlciA9IG5ldyBsb2dnaW5nLkluZGVudExvZ2dlcignY2xpbmcnKTtcbiAgbGV0IGxvZ2dpbmdTdWJzY3JpcHRpb247XG4gIGlmICghb3B0aW9ucy50ZXN0aW5nKSB7XG4gICAgbG9nZ2luZ1N1YnNjcmlwdGlvbiA9IGluaXRpYWxpemVMb2dnaW5nKGxvZ2dlcik7XG4gIH1cblxuICBsZXQgcHJvamVjdERldGFpbHMgPSBnZXRXb3Jrc3BhY2VEZXRhaWxzKCk7XG4gIGlmIChwcm9qZWN0RGV0YWlscyA9PT0gbnVsbCkge1xuICAgIGNvbnN0IFssIGxvY2FsUGF0aF0gPSBnZXRXb3Jrc3BhY2VSYXcoJ2xvY2FsJyk7XG4gICAgaWYgKGxvY2FsUGF0aCAhPT0gbnVsbCkge1xuICAgICAgbG9nZ2VyLmZhdGFsKGBBbiBpbnZhbGlkIGNvbmZpZ3VyYXRpb24gZmlsZSB3YXMgZm91bmQgWycke2xvY2FsUGF0aH0nXS5gXG4gICAgICAgICAgICAgICAgICsgJyBQbGVhc2UgZGVsZXRlIHRoZSBmaWxlIGJlZm9yZSBydW5uaW5nIHRoZSBjb21tYW5kLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBwcm9qZWN0RGV0YWlscyA9IHsgcm9vdDogcHJvY2Vzcy5jd2QoKSB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBtYXliZUV4aXRDb2RlID0gYXdhaXQgcnVuQ29tbWFuZChvcHRpb25zLmNsaUFyZ3MsIGxvZ2dlciwgcHJvamVjdERldGFpbHMpO1xuICAgIGlmICh0eXBlb2YgbWF5YmVFeGl0Q29kZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGNvbnNvbGUuYXNzZXJ0KE51bWJlci5pc0ludGVnZXIobWF5YmVFeGl0Q29kZSkpO1xuXG4gICAgICByZXR1cm4gbWF5YmVFeGl0Q29kZTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoZXJyLm1lc3NhZ2UpO1xuICAgICAgaWYgKGVyci5zdGFjaykge1xuICAgICAgICBsb2dnZXIuZmF0YWwoZXJyLnN0YWNrKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoZXJyKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdudW1iZXInKSB7XG4gICAgICAvLyBMb2cgbm90aGluZy5cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmZhdGFsKCdBbiB1bmV4cGVjdGVkIGVycm9yIG9jY3VycmVkOiAnICsgSlNPTi5zdHJpbmdpZnkoZXJyKSk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMudGVzdGluZykge1xuICAgICAgZGVidWdnZXI7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuXG4gICAgaWYgKGxvZ2dpbmdTdWJzY3JpcHRpb24pIHtcbiAgICAgIGxvZ2dpbmdTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMTtcbiAgfVxufVxuXG4vLyBJbml0aWFsaXplIGxvZ2dpbmcuXG5mdW5jdGlvbiBpbml0aWFsaXplTG9nZ2luZyhsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyKSB7XG4gIHJldHVybiBsb2dnZXJcbiAgICAuc3Vic2NyaWJlKGVudHJ5ID0+IHtcbiAgICAgIGxldCBjb2xvciA9ICh4OiBzdHJpbmcpID0+IHRlcm1pbmFsLmRpbSh0ZXJtaW5hbC53aGl0ZSh4KSk7XG4gICAgICBsZXQgb3V0cHV0ID0gcHJvY2Vzcy5zdGRvdXQ7XG4gICAgICBzd2l0Y2ggKGVudHJ5LmxldmVsKSB7XG4gICAgICAgIGNhc2UgJ2RlYnVnJzpcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNhc2UgJ2luZm8nOlxuICAgICAgICAgIGNvbG9yID0gdGVybWluYWwud2hpdGU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3dhcm4nOlxuICAgICAgICAgIGNvbG9yID0gKHg6IHN0cmluZykgPT4gdGVybWluYWwuYm9sZCh0ZXJtaW5hbC55ZWxsb3coeCkpO1xuICAgICAgICAgIG91dHB1dCA9IHByb2Nlc3Muc3RkZXJyO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdmYXRhbCc6XG4gICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICBjb2xvciA9ICh4OiBzdHJpbmcpID0+IHRlcm1pbmFsLmJvbGQodGVybWluYWwucmVkKHgpKTtcbiAgICAgICAgICBvdXRwdXQgPSBwcm9jZXNzLnN0ZGVycjtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuXG4gICAgICAvLyBJZiB3ZSBkbyBjb25zb2xlLmxvZyhtZXNzYWdlKSBvciBwcm9jZXNzLnN0ZG91dC53cml0ZShtZXNzYWdlICsgJ1xcbicpLCB0aGUgcHJvY2VzcyBtaWdodFxuICAgICAgLy8gc3RvcCBiZWZvcmUgdGhlIHdob2xlIG1lc3NhZ2UgaXMgd3JpdHRlbiBhbmQgdGhlIHN0cmVhbSBpcyBmbHVzaGVkLiBUaGlzIGhhcHBlbnMgd2hlblxuICAgICAgLy8gc3RyZWFtcyBhcmUgYXN5bmNocm9ub3VzLlxuICAgICAgLy9cbiAgICAgIC8vIE5vZGVKUyBJTyBzdHJlYW1zIGFyZSBkaWZmZXJlbnQgZGVwZW5kaW5nIG9uIHBsYXRmb3JtIGFuZCB1c2FnZS4gSW4gUE9TSVggZW52aXJvbm1lbnQsXG4gICAgICAvLyBmb3IgZXhhbXBsZSwgdGhleSdyZSBhc3luY2hyb25vdXMgd2hlbiB3cml0aW5nIHRvIGEgcGlwZSwgYnV0IHN5bmNocm9ub3VzIHdoZW4gd3JpdGluZ1xuICAgICAgLy8gdG8gYSBUVFkuIEluIHdpbmRvd3MsIGl0J3MgdGhlIG90aGVyIHdheSBhcm91bmQuIFlvdSBjYW4gdmVyaWZ5IHdoaWNoIGlzIHdoaWNoIHdpdGhcbiAgICAgIC8vIHN0cmVhbS5pc1RUWSBhbmQgcGxhdGZvcm0sIGJ1dCB0aGlzIGlzIG5vdCBnb29kIGVub3VnaC5cbiAgICAgIC8vIEluIHRoZSBhc3luYyBjYXNlLCBvbmUgc2hvdWxkIHdhaXQgZm9yIHRoZSBjYWxsYmFjayBiZWZvcmUgc2VuZGluZyBtb3JlIGRhdGEgb3JcbiAgICAgIC8vIGNvbnRpbnVpbmcgdGhlIHByb2Nlc3MuIEluIG91ciBjYXNlIGl0IHdvdWxkIGJlIHJhdGhlciBoYXJkIHRvIGRvIChidXQgbm90IGltcG9zc2libGUpLlxuICAgICAgLy9cbiAgICAgIC8vIEluc3RlYWQgd2UgdGFrZSB0aGUgZWFzeSB3YXkgb3V0IGFuZCBzaW1wbHkgY2h1bmsgdGhlIG1lc3NhZ2UgYW5kIGNhbGwgdGhlIHdyaXRlXG4gICAgICAvLyBmdW5jdGlvbiB3aGlsZSB0aGUgYnVmZmVyIGRyYWluIGl0c2VsZiBhc3luY2hyb25vdXNseS4gV2l0aCBhIHNtYWxsZXIgY2h1bmsgc2l6ZSB0aGFuXG4gICAgICAvLyB0aGUgYnVmZmVyLCB3ZSBhcmUgbW9zdGx5IGNlcnRhaW4gdGhhdCBpdCB3b3Jrcy4gSW4gdGhpcyBjYXNlLCB0aGUgY2h1bmsgaGFzIGJlZW4gcGlja2VkXG4gICAgICAvLyBhcyBoYWxmIGEgcGFnZSBzaXplICg0MDk2LzIgPSAyMDQ4KSwgbWludXMgc29tZSBieXRlcyBmb3IgdGhlIGNvbG9yIGZvcm1hdHRpbmcuXG4gICAgICAvLyBPbiBQT1NJWCBpdCBzZWVtcyB0aGUgYnVmZmVyIGlzIDIgcGFnZXMgKDgxOTIpLCBidXQganVzdCB0byBiZSBzdXJlIChjb3VsZCBiZSBkaWZmZXJlbnRcbiAgICAgIC8vIGJ5IHBsYXRmb3JtKS5cbiAgICAgIC8vXG4gICAgICAvLyBGb3IgbW9yZSBkZXRhaWxzLCBzZWUgaHR0cHM6Ly9ub2RlanMub3JnL2FwaS9wcm9jZXNzLmh0bWwjcHJvY2Vzc19hX25vdGVfb25fcHJvY2Vzc19pX29cbiAgICAgIGNvbnN0IGNodW5rU2l6ZSA9IDIwMDA7ICAvLyBTbWFsbCBjaHVuay5cbiAgICAgIGxldCBtZXNzYWdlID0gZW50cnkubWVzc2FnZTtcbiAgICAgIHdoaWxlIChtZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IGNodW5rID0gbWVzc2FnZS5zbGljZSgwLCBjaHVua1NpemUpO1xuICAgICAgICBtZXNzYWdlID0gbWVzc2FnZS5zbGljZShjaHVua1NpemUpO1xuICAgICAgICBvdXRwdXQud3JpdGUoY29sb3IoY2h1bmspKTtcbiAgICAgIH1cbiAgICAgIG91dHB1dC53cml0ZSgnXFxuJyk7XG4gICAgfSk7XG59XG4iXX0=