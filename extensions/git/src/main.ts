/*---------------------------------------------------------------------------------------------
 *  Copyright (c) savagemechanic. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as nls from 'vscode-nls';
const localize = nls.config(process.env.VSCODE_NLS_CONFIG)();
import { ExtensionContext, workspace, window, Disposable, commands, Uri, OutputChannel } from 'vscode';
import { findGit, Git, IGit } from './git';
import { Model } from './model';
import { CommandCenter } from './commands';
import { GitContentProvider } from './contentProvider';
import { GitDecorations } from './decorationProvider';
import { Askpass } from './askpass';
import { toDisposable } from './util';
import TelemetryReporter from 'vscode-extension-telemetry';

async function init(context: ExtensionContext, outputChannel: OutputChannel, disposables: Disposable[]): Promise<void> {
	const { name, version, aiKey } = require(context.asAbsolutePath('./package.json')) as { name: string, version: string, aiKey: string };
	const telemetryReporter: TelemetryReporter = new TelemetryReporter(name, version, aiKey);
	disposables.push(telemetryReporter);

	const config = workspace.getConfiguration('git');
	const enabled = config.get<boolean>('enabled') === true;
	const pathHint = workspace.getConfiguration('git').get<string>('path');
	const info = await findGit(pathHint, path => outputChannel.appendLine(localize('looking', "Looking for git in: {0}", path)));
	const askpass = new Askpass();
	const env = await askpass.getEnv();
	const git = new Git({ gitPath: info.path, version: info.version, env });
	const model = new Model(git, context.globalState);
	disposables.push(model);

	const onRepository = () => commands.executeCommand('setContext', 'gitOpenRepositoryCount', `${model.repositories.length}`);
	model.onDidOpenRepository(onRepository, null, disposables);
	model.onDidCloseRepository(onRepository, null, disposables);
	onRepository();

	if (!enabled) {
		const commandCenter = new CommandCenter(git, model, outputChannel, telemetryReporter);
		disposables.push(commandCenter);
		return;
	}

	outputChannel.appendLine(localize('using git', "Using git {0} from {1}", info.version, info.path));

	const onOutput = (str: string) => outputChannel.append(str);
	git.onOutput.addListener('log', onOutput);
	disposables.push(toDisposable(() => git.onOutput.removeListener('log', onOutput)));

	disposables.push(
		new CommandCenter(git, model, outputChannel, telemetryReporter),
		new GitContentProvider(model),
		new GitDecorations(model)
	);

	await checkGitVersion(info);
}

async function _activate(context: ExtensionContext, disposables: Disposable[]): Promise<any> {
	const outputChannel = window.createOutputChannel('Git');
	commands.registerCommand('git.showOutput', () => outputChannel.show());
	disposables.push(outputChannel);

	try {
		await init(context, outputChannel, disposables);
	} catch (err) {
		if (!/Git installation not found/.test(err.message || '')) {
			throw err;
		}

		const config = workspace.getConfiguration('git');
		const shouldIgnore = config.get<boolean>('ignoreMissingGitWarning') === true;

		if (shouldIgnore) {
			return;
		}

		console.warn(err.message);
		outputChannel.appendLine(err.message);
		outputChannel.show();

		const download = localize('downloadgit', "Download Git");
		const neverShowAgain = localize('neverShowAgain', "Don't show again");
		const choice = await window.showWarningMessage(
			localize('notfound', "Git not found. Install it or configure it using the 'git.path' setting."),
			download,
			neverShowAgain
		);

		if (choice === download) {
			commands.executeCommand('vscode.open', Uri.parse('https://git-scm.com/'));
		} else if (choice === neverShowAgain) {
			await config.update('ignoreMissingGitWarning', true, true);
		}
	}
}

export function activate(context: ExtensionContext): any {
	const disposables: Disposable[] = [];
	context.subscriptions.push(new Disposable(() => Disposable.from(...disposables).dispose()));

	_activate(context, disposables)
		.catch(err => console.error(err));
}

async function checkGitVersion(info: IGit): Promise<void> {
	const config = workspace.getConfiguration('git');
	const shouldIgnore = config.get<boolean>('ignoreLegacyWarning') === true;

	if (shouldIgnore) {
		return;
	}

	if (!/^[01]/.test(info.version)) {
		return;
	}

	const update = localize('updateGit', "Update Git");
	const neverShowAgain = localize('neverShowAgain', "Don't show again");

	const choice = await window.showWarningMessage(
		localize('git20', "You seem to have git {0} installed. Code works best with git >= 2", info.version),
		update,
		neverShowAgain
	);

	if (choice === update) {
		commands.executeCommand('vscode.open', Uri.parse('https://git-scm.com/'));
	} else if (choice === neverShowAgain) {
		await config.update('ignoreLegacyWarning', true, true);
	}
}
