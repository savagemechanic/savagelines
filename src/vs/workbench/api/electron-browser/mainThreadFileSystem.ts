/*---------------------------------------------------------------------------------------------
 *  Copyright (c) savagemechanic. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import URI from 'vs/base/common/uri';
import { TPromise, PPromise } from 'vs/base/common/winjs.base';
import { ExtHostContext, MainContext, IExtHostContext, MainThreadFileSystemShape, ExtHostFileSystemShape } from '../node/extHost.protocol';
import { IFileService, IFileSystemProvider, IStat, IFileChange } from 'vs/platform/files/common/files';
import { IDisposable, dispose } from 'vs/base/common/lifecycle';
import Event, { Emitter } from 'vs/base/common/event';
import { extHostNamedCustomer } from 'vs/workbench/api/electron-browser/extHostCustomers';
import { IProgress } from 'vs/platform/progress/common/progress';
import { ISearchResultProvider, ISearchQuery, ISearchComplete, ISearchProgressItem, QueryType, IFileMatch, ISearchService } from 'vs/platform/search/common/search';
import { IWorkspaceEditingService } from 'vs/workbench/services/workspace/common/workspaceEditing';
import { onUnexpectedError } from 'vs/base/common/errors';

@extHostNamedCustomer(MainContext.MainThreadFileSystem)
export class MainThreadFileSystem implements MainThreadFileSystemShape {

	private readonly _toDispose: IDisposable[] = [];
	private readonly _proxy: ExtHostFileSystemShape;
	private readonly _provider = new Map<number, RemoteFileSystemProvider>();

	constructor(
		extHostContext: IExtHostContext,
		@IFileService private readonly _fileService: IFileService,
		@ISearchService private readonly _searchService: ISearchService,
		@IWorkspaceEditingService private readonly _workspaceEditingService: IWorkspaceEditingService
	) {
		this._proxy = extHostContext.get(ExtHostContext.ExtHostFileSystem);
	}

	dispose(): void {
		dispose(this._toDispose);
	}

	$registerFileSystemProvider(handle: number, scheme: string): void {
		this._provider.set(handle, new RemoteFileSystemProvider(this._fileService, this._searchService, scheme, handle, this._proxy));
	}

	$unregisterFileSystemProvider(handle: number): void {
		dispose(this._provider.get(handle));
		this._provider.delete(handle);
	}

	$onDidAddFileSystemRoot(uri: URI): void {
		this._workspaceEditingService.addFolders([{ uri }], true).done(null, onUnexpectedError);
	}

	$onFileSystemChange(handle: number, changes: IFileChange[]): void {
		this._provider.get(handle).$onFileSystemChange(changes);
	}

	$reportFileChunk(handle: number, resource: URI, chunk: number[]): void {
		this._provider.get(handle).reportFileChunk(resource, chunk);
	}

	// --- search

	$handleSearchProgress(handle: number, session: number, resource: URI): void {
		this._provider.get(handle).handleSearchProgress(session, resource);
	}
}

class RemoteFileSystemProvider implements IFileSystemProvider, ISearchResultProvider {

	private readonly _onDidChange = new Emitter<IFileChange[]>();
	private readonly _reads = new Map<string, IProgress<Uint8Array>>();
	private readonly _registrations: IDisposable[];

	readonly onDidChange: Event<IFileChange[]> = this._onDidChange.event;


	constructor(
		fileService: IFileService,
		searchService: ISearchService,
		scheme: string,
		private readonly _handle: number,
		private readonly _proxy: ExtHostFileSystemShape
	) {
		this._registrations = [
			fileService.registerProvider(scheme, this),
			searchService.registerSearchResultProvider(this),
		];
	}

	dispose(): void {
		dispose(this._registrations);
		this._onDidChange.dispose();
	}

	$onFileSystemChange(changes: IFileChange[]): void {
		this._onDidChange.fire(changes);
	}

	// --- forwarding calls

	utimes(resource: URI, mtime: number, atime: number): TPromise<IStat, any> {
		return this._proxy.$utimes(this._handle, resource, mtime, atime);
	}
	stat(resource: URI): TPromise<IStat, any> {
		return this._proxy.$stat(this._handle, resource);
	}
	read(resource: URI, offset: number, count: number, progress: IProgress<Uint8Array>): TPromise<number, any> {
		this._reads.set(resource.toString(), progress);
		return this._proxy.$read(this._handle, offset, count, resource);
	}
	reportFileChunk(resource: URI, chunk: number[]): void {
		this._reads.get(resource.toString()).report(Buffer.from(chunk));
	}
	write(resource: URI, content: Uint8Array): TPromise<void, any> {
		return this._proxy.$write(this._handle, resource, [].slice.call(content));
	}
	unlink(resource: URI): TPromise<void, any> {
		return this._proxy.$unlink(this._handle, resource);
	}
	move(resource: URI, target: URI): TPromise<IStat, any> {
		return this._proxy.$move(this._handle, resource, target);
	}
	mkdir(resource: URI): TPromise<IStat, any> {
		return this._proxy.$mkdir(this._handle, resource);
	}
	readdir(resource: URI): TPromise<[URI, IStat][], any> {
		return this._proxy.$readdir(this._handle, resource);
	}
	rmdir(resource: URI): TPromise<void, any> {
		return this._proxy.$rmdir(this._handle, resource);
	}

	// --- search

	private _searches = new Map<number, (resource: URI) => void>();
	private _searchesIdPool = 0;

	search(query: ISearchQuery): PPromise<ISearchComplete, ISearchProgressItem> {
		if (query.type === QueryType.Text) {
			return PPromise.as<ISearchComplete>({ results: [], stats: undefined });
		}
		const id = ++this._searchesIdPool;
		const matches: IFileMatch[] = [];
		return new PPromise((resolve, reject, report) => {
			this._proxy.$fileFiles(this._handle, id, query.filePattern).then(() => {
				this._searches.delete(id);
				resolve({
					results: matches,
					stats: undefined
				});
			}, reject);

			this._searches.set(id, resource => {
				const match: IFileMatch = { resource };
				matches.push(match);
				report(match);
			});
		});
	}

	handleSearchProgress(session: number, resource: URI): void {
		this._searches.get(session)(resource);
	}
}
