/*---------------------------------------------------------------------------------------------
 *  Copyright (c) savagemechanic. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

const fs = require('fs');
const path = require('path');
const root = path.dirname(path.dirname(__dirname));

function getElectronVersion() {
	const yarnrc = fs.readFileSync(path.join(root, '.yarnrc'), 'utf8');
	const target = /^target "(.*)"$/m.exec(yarnrc)[1];

	return target;
}

module.exports.getElectronVersion = getElectronVersion;

// returns 0 if the right version of electron is in .build/electron
if (require.main === module) {
	const version = getElectronVersion();
	const versionFile = path.join(root, '.build', 'electron', 'version');
	const isUpToDate = fs.existsSync(versionFile) && fs.readFileSync(versionFile, 'utf8') === `v${version}`;

	process.exit(isUpToDate ? 0 : 1);
}
