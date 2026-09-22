// packages/angular/cli/src/utilities/node-version.js
import { SUPPORTED_NODE_VERSIONS, supportedNodeVersions } from "#version";
import { SUPPORTED_NODE_VERSIONS as SUPPORTED_NODE_VERSIONS2, supportedNodeVersions as supportedNodeVersions2, isNodeVersionSupported, isNodeVersionRunnable } from "#version";
function isNodeVersionMinSupported(currentVersion = process.versions.node, supportedVersions = supportedNodeVersions) {
  if (SUPPORTED_NODE_VERSIONS.charAt(0) === "0" && currentVersion === process.versions.node) {
    return true;
  }
  const [processMajor, processMinor, processPatch] = currentVersion.split(".", 3).map((part) => Number(part));
  const [major, minor, patch] = supportedVersions[0].split(".", 3).map((part) => Number(part));
  return processMajor > major || processMajor === major && processMinor > minor || processMajor === major && processMinor === minor && processPatch >= patch;
}

export {
  isNodeVersionMinSupported,
  supportedNodeVersions2 as supportedNodeVersions,
  isNodeVersionSupported
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
