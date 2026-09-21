// packages/angular/cli/src/utilities/log-file.js
import { appendFileSync, mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { normalize } from "node:path";
var logPath;
function writeErrorToLogFile(error) {
  if (!logPath) {
    const tempDirectory = mkdtempSync(realpathSync(tmpdir()) + "/ng-");
    logPath = normalize(tempDirectory + "/angular-errors.log");
  }
  appendFileSync(logPath, "[error] " + (error.stack || error) + "\n\n");
  return logPath;
}

export {
  writeErrorToLogFile
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
