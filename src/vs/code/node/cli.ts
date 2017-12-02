/*---------------------------------------------------------------------------------------------
 *  Copyright (c) savagemechanic. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { spawn, ChildProcess } from 'child_process';
import { TPromise } from 'vs/base/common/winjs.base';
import { assign } from 'vs/base/common/objects';
import { parseCLIProcessArgv, buildHelpMessage } from 'vs/platform/environment/node/argv';
import { ParsedArgs } from 'vs/platform/environment/common/environment';
import product from 'vs/platform/node/product';
import pkg from 'vs/platform/node/package';

import * as paths from 'path';
import * as os from 'os';
import { whenDeleted } from 'vs/base/node/pfs';
import { writeFileAndFlushSync } from 'vs/base/node/extfs';
import { findFreePort } from 'vs/base/node/ports';

function shouldSpawnCliProcess(argv: ParsedArgs): boolean {
	return !!argv['install-source']
		|| !!argv['list-extensions']
		|| !!argv['install-extension']
		|| !!argv['uninstall-extension'];
}

interface IMainCli {
	main: (argv: ParsedArgs) => TPromise<void>;
}

export async function main(argv: string[]): TPromise<any> {
	let args: ParsedArgs;

	try {
		args = parseCLIProcessArgv(argv);
	} catch (err) {
		console.error(err.message);
		return TPromise.as(null);
	}

	if (args.help) {
		console.log(buildHelpMessage(product.nameLong, product.applicationName, pkg.version));
	} else if (args.version) {
		console.log(`${pkg.version}\n${product.commit}\n${process.arch}`);
	} else if (shouldSpawnCliProcess(args)) {
		const mainCli = new TPromise<IMainCli>(c => require(['vs/code/node/cliProcessMain'], c));
		return mainCli.then(cli => cli.main(args));
	} else {
		const env = assign({}, process.env, {
			// this will signal Code that it was spawned from this module
			'VSCODE_CLI': '1',
			'ELECTRON_NO_ATTACH_CONSOLE': '1'
		});

		delete env['ELECTRON_RUN_AS_NODE'];

		let processCallbacks: ((child: ChildProcess) => Thenable<any>)[] = [];

		if (args.verbose) {
			env['ELECTRON_ENABLE_LOGGING'] = '1';

			processCallbacks.push(child => {
				child.stdout.on('data', (data: Buffer) => console.log(data.toString('utf8').trim()));
				child.stderr.on('data', (data: Buffer) => console.log(data.toString('utf8').trim()));
				return new TPromise<void>(c => child.once('exit', () => c(null)));
			});
		}

		// If we are started with --wait create a random temporary file
		// and pass it over to the starting instance. We can use this file
		// to wait for it to be deleted to monitor that the edited file
		// is closed and then exit the waiting process.
		let waitMarkerFilePath: string;
		if (args.wait) {
			let waitMarkerError: Error;
			const randomTmpFile = paths.join(os.tmpdir(), Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10));
			try {
				writeFileAndFlushSync(randomTmpFile, '');
				waitMarkerFilePath = randomTmpFile;
				argv.push('--waitMarkerFilePath', waitMarkerFilePath);
			} catch (error) {
				waitMarkerError = error;
			}

			if (args.verbose) {
				if (waitMarkerError) {
					console.error(`Failed to create marker file for --wait: ${waitMarkerError.toString()}`);
				} else {
					console.log(`Marker file for --wait created: ${waitMarkerFilePath}`);
				}
			}
		}

		// If we have been started with `--prof-startup` we need to find free ports to profile
		// the main process, the renderer, and the extension host. We also disable v8 cached data
		// to get better profile traces. Last, we listen on stdout for a signal that tells us to
		// stop profiling.
		if (args['prof-startup']) {

			const portMain = await findFreePort(9222, 10, 6000);
			const portRenderer = await findFreePort(portMain + 1, 10, 6000);
			const portExthost = await findFreePort(portRenderer + 1, 10, 6000);

			if (!portMain || !portRenderer || !portExthost) {
				console.error('Failed to find free ports for profiler to connect to do.');
				return;
			}

			const filenamePrefix = paths.join(os.homedir(), Math.random().toString(16).slice(-4));

			argv.push(`--inspect-brk=${portMain}`);
			argv.push(`--remote-debugging-port=${portRenderer}`);
			argv.push(`--inspect-brk-extensions=${portExthost}`);
			argv.push(`--prof-startup-prefix`, filenamePrefix);
			argv.push(`--no-cached-data`);

			writeFileAndFlushSync(filenamePrefix, argv.slice(-6).join('|'));

			processCallbacks.push(async child => {

				// load and start profiler
				const profiler = await import('v8-inspect-profiler');
				const main = await profiler.startProfiling({ port: portMain });
				const renderer = await profiler.startProfiling({ port: portRenderer, tries: 200 });
				const extHost = await profiler.startProfiling({ port: portExthost, tries: 300 });

				// wait for the renderer to delete the
				// marker file
				whenDeleted(filenamePrefix);

				let profileMain = await main.stop();
				let profileRenderer = await renderer.stop();
				let profileExtHost = await extHost.stop();
				let suffix = '';

				if (!process.env['VSCODE_DEV']) {
					// when running from a not-development-build we remove
					// absolute filenames because we don't want to reveal anything
					// about users. We also append the `.txt` suffix to make it
					// easier to attach these files to GH issues
					profileMain = profiler.rewriteAbsolutePaths(profileMain, 'piiRemoved');
					profileRenderer = profiler.rewriteAbsolutePaths(profileRenderer, 'piiRemoved');
					profileExtHost = profiler.rewriteAbsolutePaths(profileExtHost, 'piiRemoved');
					suffix = '.txt';
				}

				// finally stop profiling and save profiles to disk
				await profiler.writeProfile(profileMain, `${filenamePrefix}-main.cpuprofile${suffix}`);
				await profiler.writeProfile(profileRenderer, `${filenamePrefix}-renderer.cpuprofile${suffix}`);
				await profiler.writeProfile(profileExtHost, `${filenamePrefix}-exthost.cpuprofile${suffix}`);

			});
		}

		const options = {
			detached: true,
			env
		};

		if (!args.verbose) {
			options['stdio'] = 'ignore';
		}

		const child = spawn(process.execPath, argv.slice(2), options);

		if (args.wait && waitMarkerFilePath) {
			return new TPromise<void>(c => {

				// Complete when process exits
				child.once('exit', () => c(null));

				// Complete when wait marker file is deleted
				whenDeleted(waitMarkerFilePath).done(c, c);
			});
		}

		return TPromise.join(processCallbacks.map(callback => callback(child)));
	}

	return TPromise.as(null);
}

function eventuallyExit(code: number): void {
	setTimeout(() => process.exit(code), 0);
}

main(process.argv)
	.then(() => eventuallyExit(0))
	.then(null, err => {
		console.error(err.stack ? err.stack : err);
		eventuallyExit(1);
	});
