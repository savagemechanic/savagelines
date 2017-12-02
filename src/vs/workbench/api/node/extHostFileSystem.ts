/*---------------------------------------------------------------------------------------------
 *  Copyright (c) savagemechanic. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import URI from 'vs/base/common/uri';
import { TPromise } from 'vs/base/common/winjs.base';
import { MainContext, IMainContext, ExtHostFileSystemShape, MainThreadFileSystemShape } from './extHost.protocol';
import * as vscode from 'vscode';
import { IStat } from 'vs/platform/files/common/files';
import { IDisposable } from 'vs/base/common/lifecycle';
import { asWinJsPromise } from 'vs/base/common/async';

export class ExtHostFileSystem implements ExtHostFileSystemShape {

	private readonly _proxy: MainThreadFileSystemShape;
	private readonly _provider = new Map<number, vscode.FileSystemProvider>();
	private _handlePool: number = 0;

	constructor(mainContext: IMainContext) {
		this._proxy = mainContext.get(MainContext.MainThreadFileSystem);
	}

	registerFileSystemProvider(scheme: string, provider: vscode.FileSystemProvider) {
		const handle = this._handlePool++;
		this._provider.set(handle, provider);
		this._proxy.$registerFileSystemProvider(handle, scheme);
		this._proxy.$onDidAddFileSystemRoot(<any>provider.root);
		let reg: IDisposable;
		if (provider.onDidChange) {
			reg = provider.onDidChange(event => this._proxy.$onFileSystemChange(handle, <any>event));
		}
		return {
			dispose: () => {
				if (reg) {
					reg.dispose();
				}
				this._provider.delete(handle);
				this._proxy.$unregisterFileSystemProvider(handle);
			}
		};
	}

	$utimes(handle: number, resource: URI, mtime: number, atime: number): TPromise<IStat, any> {
		return asWinJsPromise(token => this._provider.get(handle).utimes(resource, mtime, atime));
	}
	$stat(handle: number, resource: URI): TPromise<IStat, any> {
		return asWinJsPromise(token => this._provider.get(handle).stat(resource));
	}
	$read(handle: number, offset: number, count: number, resource: URI): TPromise<number> {
		const progress = {
			report: chunk => {
				this._proxy.$reportFileChunk(handle, resource, [].slice.call(chunk));
			}
		};
		return asWinJsPromise(token => this._provider.get(handle).read(resource, offset, count, progress));
	}
	$write(handle: number, resource: URI, content: number[]): TPromise<void, any> {
		return asWinJsPromise(token => this._provider.get(handle).write(resource, Buffer.from(content)));
	}
	$unlink(handle: number, resource: URI): TPromise<void, any> {
		return asWinJsPromise(token => this._provider.get(handle).unlink(resource));
	}
	$move(handle: number, resource: URI, target: URI): TPromise<IStat, any> {
		return asWinJsPromise(token => this._provider.get(handle).move(resource, target));
	}
	$mkdir(handle: number, resource: URI): TPromise<IStat, any> {
		return asWinJsPromise(token => this._provider.get(handle).mkdir(resource));
	}
	$readdir(handle: number, resource: URI): TPromise<[URI, IStat][], any> {
		return asWinJsPromise(token => this._provider.get(handle).readdir(resource));
	}
	$rmdir(handle: number, resource: URI): TPromise<void, any> {
		return asWinJsPromise(token => this._provider.get(handle).rmdir(resource));
	}
	$fileFiles(handle: number, session: number, query: string): TPromise<void> {
		const provider = this._provider.get(handle);
		if (!provider.findFiles) {
			return TPromise.as(undefined);
		}
		const progress = { report: (uri) => this._proxy.$handleSearchProgress(handle, session, uri) };
		return asWinJsPromise(token => provider.findFiles(query, progress, token));
	}
}
