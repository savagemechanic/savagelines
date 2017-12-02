/*---------------------------------------------------------------------------------------------
 *  Copyright (c) savagemechanic. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { window, workspace, Uri, Disposable, Event, EventEmitter, DecorationData, DecorationProvider, ThemeColor } from 'vscode';
import { Repository, GitResourceGroup } from './repository';
import { Model } from './model';
import { debounce } from './decorators';
import { filterEvent } from './util';

class GitIgnoreDecorationProvider implements DecorationProvider {

	private readonly _onDidChangeDecorations = new EventEmitter<Uri[]>();
	readonly onDidChangeDecorations: Event<Uri[]> = this._onDidChangeDecorations.event;

	private checkIgnoreQueue = new Map<string, { resolve: (status: boolean) => void, reject: (err: any) => void }>();
	private disposables: Disposable[] = [];

	constructor(private repository: Repository) {
		this.disposables.push(
			window.registerDecorationProvider(this),
			filterEvent(workspace.onDidSaveTextDocument, e => e.fileName.endsWith('.gitignore'))(_ => this._onDidChangeDecorations.fire())
			//todo@joh -> events when the ignore status actually changes, not only when the file changes
		);
	}

	dispose(): void {
		this.disposables.forEach(d => d.dispose());
		this.checkIgnoreQueue.clear();
	}

	provideDecoration(uri: Uri): Promise<DecorationData | undefined> {
		return new Promise<boolean>((resolve, reject) => {
			this.checkIgnoreQueue.set(uri.fsPath, { resolve, reject });
			this.checkIgnoreSoon();
		}).then(ignored => {
			if (ignored) {
				return <DecorationData>{
					priority: 3,
					color: new ThemeColor('gitDecoration.ignoredResourceForeground')
				};
			}
		});
	}

	@debounce(500)
	private checkIgnoreSoon(): void {
		const queue = new Map(this.checkIgnoreQueue.entries());
		this.checkIgnoreQueue.clear();
		this.repository.checkIgnore([...queue.keys()]).then(ignoreSet => {
			for (const [key, value] of queue.entries()) {
				value.resolve(ignoreSet.has(key));
			}
		}, err => {
			console.error(err);
			for (const [, value] of queue.entries()) {
				value.reject(err);
			}
		});
	}
}

class GitDecorationProvider implements DecorationProvider {

	private readonly _onDidChangeDecorations = new EventEmitter<Uri[]>();
	readonly onDidChangeDecorations: Event<Uri[]> = this._onDidChangeDecorations.event;

	private disposables: Disposable[] = [];
	private decorations = new Map<string, DecorationData>();

	constructor(private repository: Repository) {
		this.disposables.push(
			window.registerDecorationProvider(this),
			repository.onDidRunOperation(this.onDidRunOperation, this)
		);
	}

	private onDidRunOperation(): void {
		let newDecorations = new Map<string, DecorationData>();
		this.collectDecorationData(this.repository.indexGroup, newDecorations);
		this.collectDecorationData(this.repository.workingTreeGroup, newDecorations);
		this.collectDecorationData(this.repository.mergeGroup, newDecorations);

		let uris: Uri[] = [];
		newDecorations.forEach((value, uriString) => {
			if (this.decorations.has(uriString)) {
				this.decorations.delete(uriString);
			} else {
				uris.push(Uri.parse(uriString));
			}
		});
		this.decorations.forEach((value, uriString) => {
			uris.push(Uri.parse(uriString));
		});
		this.decorations = newDecorations;
		this._onDidChangeDecorations.fire(uris);
	}

	private collectDecorationData(group: GitResourceGroup, bucket: Map<string, DecorationData>): void {
		group.resourceStates.forEach(r => {
			if (r.resourceDecoration) {
				bucket.set(r.original.toString(), r.resourceDecoration);
			}
		});
	}

	provideDecoration(uri: Uri): DecorationData | undefined {
		return this.decorations.get(uri.toString());
	}

	dispose(): void {
		this.disposables.forEach(d => d.dispose());
	}
}


export class GitDecorations {

	private configListener: Disposable;
	private modelListener: Disposable[] = [];
	private providers = new Map<Repository, Disposable>();

	constructor(private model: Model) {
		this.configListener = workspace.onDidChangeConfiguration(e => e.affectsConfiguration('git.decorations.enabled') && this.update());
		this.update();
	}

	private update(): void {
		const enabled = workspace.getConfiguration('git').get('decorations.enabled');
		if (enabled) {
			this.enable();
		} else {
			this.disable();
		}
	}

	private enable(): void {
		this.modelListener = [];
		this.model.onDidOpenRepository(this.onDidOpenRepository, this, this.modelListener);
		this.model.onDidCloseRepository(this.onDidCloseRepository, this, this.modelListener);
		this.model.repositories.forEach(this.onDidOpenRepository, this);
	}

	private disable(): void {
		this.modelListener.forEach(d => d.dispose());
		this.providers.forEach(value => value.dispose());
		this.providers.clear();
	}

	private onDidOpenRepository(repository: Repository): void {
		const provider = new GitDecorationProvider(repository);
		const ignoreProvider = new GitIgnoreDecorationProvider(repository);
		this.providers.set(repository, Disposable.from(provider, ignoreProvider));
	}

	private onDidCloseRepository(repository: Repository): void {
		const provider = this.providers.get(repository);
		if (provider) {
			provider.dispose();
			this.providers.delete(repository);
		}
	}

	dispose(): void {
		this.configListener.dispose();
		this.modelListener.forEach(d => d.dispose());
		this.providers.forEach(value => value.dispose);
		this.providers.clear();
	}
}
