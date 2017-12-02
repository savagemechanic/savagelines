/*---------------------------------------------------------------------------------------------
 *  Copyright (c) savagemechanic. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { TPromise } from 'vs/base/common/winjs.base';
import { IDisposable } from 'vs/base/common/lifecycle';
import { Emitter } from 'vs/base/common/event';
import * as vscode from 'vscode';
import { IReadOnlyModel, ISingleEditOperation } from 'vs/editor/common/editorCommon';
import * as modes from 'vs/editor/common/modes';
import { WorkspaceSymbolProviderRegistry, IWorkspaceSymbolProvider } from 'vs/workbench/parts/search/common/search';
import { wireCancellationToken } from 'vs/base/common/async';
import { CancellationToken } from 'vs/base/common/cancellation';
import { Position as EditorPosition } from 'vs/editor/common/core/position';
import { Range as EditorRange } from 'vs/editor/common/core/range';
import { ExtHostContext, MainThreadLanguageFeaturesShape, ExtHostLanguageFeaturesShape, MainContext, IExtHostContext } from '../node/extHost.protocol';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { LanguageConfiguration } from 'vs/editor/common/modes/languageConfiguration';
import { IHeapService } from './mainThreadHeapService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { extHostNamedCustomer } from 'vs/workbench/api/electron-browser/extHostCustomers';
import { toLanguageSelector } from 'vs/workbench/api/node/extHostTypeConverters';

@extHostNamedCustomer(MainContext.MainThreadLanguageFeatures)
export class MainThreadLanguageFeatures implements MainThreadLanguageFeaturesShape {

	private _proxy: ExtHostLanguageFeaturesShape;
	private _heapService: IHeapService;
	private _modeService: IModeService;
	private _registrations: { [handle: number]: IDisposable; } = Object.create(null);

	constructor(
		extHostContext: IExtHostContext,
		@IHeapService heapService: IHeapService,
		@IModeService modeService: IModeService,
	) {
		this._proxy = extHostContext.get(ExtHostContext.ExtHostLanguageFeatures);
		this._heapService = heapService;
		this._modeService = modeService;
	}

	dispose(): void {
		for (const key in this._registrations) {
			this._registrations[key].dispose();
		}
	}

	$unregister(handle: number): TPromise<any> {
		let registration = this._registrations[handle];
		if (registration) {
			registration.dispose();
			delete this._registrations[handle];
		}
		return undefined;
	}

	// --- outline

	$registerOutlineSupport(handle: number, selector: vscode.DocumentSelector): TPromise<any> {
		this._registrations[handle] = modes.DocumentSymbolProviderRegistry.register(toLanguageSelector(selector), <modes.DocumentSymbolProvider>{
			provideDocumentSymbols: (model: IReadOnlyModel, token: CancellationToken): Thenable<modes.SymbolInformation[]> => {
				return wireCancellationToken(token, this._proxy.$provideDocumentSymbols(handle, model.uri));
			}
		});
		return undefined;
	}

	// --- code lens

	$registerCodeLensSupport(handle: number, selector: vscode.DocumentSelector, eventHandle: number): TPromise<any> {

		const provider = <modes.CodeLensProvider>{
			provideCodeLenses: (model: IReadOnlyModel, token: CancellationToken): modes.ICodeLensSymbol[] | Thenable<modes.ICodeLensSymbol[]> => {
				return this._heapService.trackRecursive(wireCancellationToken(token, this._proxy.$provideCodeLenses(handle, model.uri)));
			},
			resolveCodeLens: (model: IReadOnlyModel, codeLens: modes.ICodeLensSymbol, token: CancellationToken): modes.ICodeLensSymbol | Thenable<modes.ICodeLensSymbol> => {
				return this._heapService.trackRecursive(wireCancellationToken(token, this._proxy.$resolveCodeLens(handle, model.uri, codeLens)));
			}
		};

		if (typeof eventHandle === 'number') {
			const emitter = new Emitter<modes.CodeLensProvider>();
			this._registrations[eventHandle] = emitter;
			provider.onDidChange = emitter.event;
		}

		this._registrations[handle] = modes.CodeLensProviderRegistry.register(toLanguageSelector(selector), provider);
		return undefined;
	}

	$emitCodeLensEvent(eventHandle: number, event?: any): TPromise<any> {
		const obj = this._registrations[eventHandle];
		if (obj instanceof Emitter) {
			obj.fire(event);
		}
		return undefined;
	}

	// --- declaration

	$registerDeclaractionSupport(handle: number, selector: vscode.DocumentSelector): TPromise<any> {
		this._registrations[handle] = modes.DefinitionProviderRegistry.register(toLanguageSelector(selector), <modes.DefinitionProvider>{
			provideDefinition: (model, position, token): Thenable<modes.Definition> => {
				return wireCancellationToken(token, this._proxy.$provideDefinition(handle, model.uri, position));
			}
		});
		return undefined;
	}

	$registerImplementationSupport(handle: number, selector: vscode.DocumentSelector): TPromise<any> {
		this._registrations[handle] = modes.ImplementationProviderRegistry.register(toLanguageSelector(selector), <modes.ImplementationProvider>{
			provideImplementation: (model, position, token): Thenable<modes.Definition> => {
				return wireCancellationToken(token, this._proxy.$provideImplementation(handle, model.uri, position));
			}
		});
		return undefined;
	}

	$registerTypeDefinitionSupport(handle: number, selector: vscode.DocumentSelector): TPromise<any> {
		this._registrations[handle] = modes.TypeDefinitionProviderRegistry.register(toLanguageSelector(selector), <modes.TypeDefinitionProvider>{
			provideTypeDefinition: (model, position, token): Thenable<modes.Definition> => {
				return wireCancellationToken(token, this._proxy.$provideTypeDefinition(handle, model.uri, position));
			}
		});
		return undefined;
	}

	// --- extra info

	$registerHoverProvider(handle: number, selector: vscode.DocumentSelector): TPromise<any> {
		this._registrations[handle] = modes.HoverProviderRegistry.register(toLanguageSelector(selector), <modes.HoverProvider>{
			provideHover: (model: IReadOnlyModel, position: EditorPosition, token: CancellationToken): Thenable<modes.Hover> => {
				return wireCancellationToken(token, this._proxy.$provideHover(handle, model.uri, position));
			}
		});
		return undefined;
	}

	// --- occurrences

	$registerDocumentHighlightProvider(handle: number, selector: vscode.DocumentSelector): TPromise<any> {
		this._registrations[handle] = modes.DocumentHighlightProviderRegistry.register(toLanguageSelector(selector), <modes.DocumentHighlightProvider>{
			provideDocumentHighlights: (model: IReadOnlyModel, position: EditorPosition, token: CancellationToken): Thenable<modes.DocumentHighlight[]> => {
				return wireCancellationToken(token, this._proxy.$provideDocumentHighlights(handle, model.uri, position));
			}
		});
		return undefined;
	}

	// --- references

	$registerReferenceSupport(handle: number, selector: vscode.DocumentSelector): TPromise<any> {
		this._registrations[handle] = modes.ReferenceProviderRegistry.register(toLanguageSelector(selector), <modes.ReferenceProvider>{
			provideReferences: (model: IReadOnlyModel, position: EditorPosition, context: modes.ReferenceContext, token: CancellationToken): Thenable<modes.Location[]> => {
				return wireCancellationToken(token, this._proxy.$provideReferences(handle, model.uri, position, context));
			}
		});
		return undefined;
	}

	// --- quick fix

	$registerQuickFixSupport(handle: number, selector: vscode.DocumentSelector): TPromise<any> {
		this._registrations[handle] = modes.CodeActionProviderRegistry.register(toLanguageSelector(selector), <modes.CodeActionProvider>{
			provideCodeActions: (model: IReadOnlyModel, range: EditorRange, token: CancellationToken): Thenable<modes.CodeAction[]> => {
				return this._heapService.trackRecursive(wireCancellationToken(token, this._proxy.$provideCodeActions(handle, model.uri, range)));
			}
		});
		return undefined;
	}

	// --- formatting

	$registerDocumentFormattingSupport(handle: number, selector: vscode.DocumentSelector): TPromise<any> {
		this._registrations[handle] = modes.DocumentFormattingEditProviderRegistry.register(toLanguageSelector(selector), <modes.DocumentFormattingEditProvider>{
			provideDocumentFormattingEdits: (model: IReadOnlyModel, options: modes.FormattingOptions, token: CancellationToken): Thenable<ISingleEditOperation[]> => {
				return wireCancellationToken(token, this._proxy.$provideDocumentFormattingEdits(handle, model.uri, options));
			}
		});
		return undefined;
	}

	$registerRangeFormattingSupport(handle: number, selector: vscode.DocumentSelector): TPromise<any> {
		this._registrations[handle] = modes.DocumentRangeFormattingEditProviderRegistry.register(toLanguageSelector(selector), <modes.DocumentRangeFormattingEditProvider>{
			provideDocumentRangeFormattingEdits: (model: IReadOnlyModel, range: EditorRange, options: modes.FormattingOptions, token: CancellationToken): Thenable<ISingleEditOperation[]> => {
				return wireCancellationToken(token, this._proxy.$provideDocumentRangeFormattingEdits(handle, model.uri, range, options));
			}
		});
		return undefined;
	}

	$registerOnTypeFormattingSupport(handle: number, selector: vscode.DocumentSelector, autoFormatTriggerCharacters: string[]): TPromise<any> {
		this._registrations[handle] = modes.OnTypeFormattingEditProviderRegistry.register(toLanguageSelector(selector), <modes.OnTypeFormattingEditProvider>{

			autoFormatTriggerCharacters,

			provideOnTypeFormattingEdits: (model: IReadOnlyModel, position: EditorPosition, ch: string, options: modes.FormattingOptions, token: CancellationToken): Thenable<ISingleEditOperation[]> => {
				return wireCancellationToken(token, this._proxy.$provideOnTypeFormattingEdits(handle, model.uri, position, ch, options));
			}
		});
		return undefined;
	}

	// --- navigate type

	$registerNavigateTypeSupport(handle: number): TPromise<any> {
		let lastResultId: number;
		this._registrations[handle] = WorkspaceSymbolProviderRegistry.register(<IWorkspaceSymbolProvider>{
			provideWorkspaceSymbols: (search: string): TPromise<modes.SymbolInformation[]> => {

				return this._proxy.$provideWorkspaceSymbols(handle, search).then(result => {
					if (lastResultId !== undefined) {
						this._proxy.$releaseWorkspaceSymbols(handle, lastResultId);
					}
					lastResultId = result._id;
					return result.symbols;
				});
			},
			resolveWorkspaceSymbol: (item: modes.SymbolInformation): TPromise<modes.SymbolInformation> => {
				return this._proxy.$resolveWorkspaceSymbol(handle, item);
			}
		});
		return undefined;
	}

	// --- rename

	$registerRenameSupport(handle: number, selector: vscode.DocumentSelector): TPromise<any> {
		this._registrations[handle] = modes.RenameProviderRegistry.register(toLanguageSelector(selector), <modes.RenameProvider>{
			provideRenameEdits: (model: IReadOnlyModel, position: EditorPosition, newName: string, token: CancellationToken): Thenable<modes.WorkspaceEdit> => {
				return wireCancellationToken(token, this._proxy.$provideRenameEdits(handle, model.uri, position, newName));
			}
		});
		return undefined;
	}

	// --- suggest

	$registerSuggestSupport(handle: number, selector: vscode.DocumentSelector, triggerCharacters: string[], supportsResolveDetails: boolean): TPromise<any> {

		this._registrations[handle] = modes.SuggestRegistry.register(toLanguageSelector(selector), <modes.ISuggestSupport>{
			triggerCharacters,
			provideCompletionItems: (model: IReadOnlyModel, position: EditorPosition, context: modes.SuggestContext, token: CancellationToken): Thenable<modes.ISuggestResult> => {
				return wireCancellationToken(token, this._proxy.$provideCompletionItems(handle, model.uri, position, context)).then(result => {
					if (!result) {
						return result;
					}
					return {
						suggestions: result.suggestions,
						incomplete: result.incomplete,
						dispose: () => this._proxy.$releaseCompletionItems(handle, result._id)
					};
				});
			},
			resolveCompletionItem: supportsResolveDetails
				? (model, position, suggestion, token) => wireCancellationToken(token, this._proxy.$resolveCompletionItem(handle, model.uri, position, suggestion))
				: undefined
		});
		return undefined;
	}

	// --- parameter hints

	$registerSignatureHelpProvider(handle: number, selector: vscode.DocumentSelector, triggerCharacter: string[]): TPromise<any> {
		this._registrations[handle] = modes.SignatureHelpProviderRegistry.register(toLanguageSelector(selector), <modes.SignatureHelpProvider>{

			signatureHelpTriggerCharacters: triggerCharacter,

			provideSignatureHelp: (model: IReadOnlyModel, position: EditorPosition, token: CancellationToken): Thenable<modes.SignatureHelp> => {
				return wireCancellationToken(token, this._proxy.$provideSignatureHelp(handle, model.uri, position));
			}

		});
		return undefined;
	}

	// --- links

	$registerDocumentLinkProvider(handle: number, selector: vscode.DocumentSelector): TPromise<any> {
		this._registrations[handle] = modes.LinkProviderRegistry.register(toLanguageSelector(selector), <modes.LinkProvider>{
			provideLinks: (model, token) => {
				return this._heapService.trackRecursive(wireCancellationToken(token, this._proxy.$provideDocumentLinks(handle, model.uri)));
			},
			resolveLink: (link, token) => {
				return wireCancellationToken(token, this._proxy.$resolveDocumentLink(handle, link));
			}
		});
		return undefined;
	}

	// --- colors

	$registerDocumentColorProvider(handle: number, selector: vscode.DocumentSelector): TPromise<any> {
		const proxy = this._proxy;
		this._registrations[handle] = modes.ColorProviderRegistry.register(toLanguageSelector(selector), <modes.DocumentColorProvider>{
			provideDocumentColors: (model, token) => {
				return wireCancellationToken(token, proxy.$provideDocumentColors(handle, model.uri))
					.then(documentColors => {
						return documentColors.map(documentColor => {
							const [red, green, blue, alpha] = documentColor.color;
							const color = {
								red: red,
								green: green,
								blue: blue,
								alpha
							};

							return {
								color,
								range: documentColor.range
							};
						});
					});
			},

			provideColorPresentations: (model, colorInfo, token) => {
				return wireCancellationToken(token, proxy.$provideColorPresentations(handle, model.uri, {
					color: [colorInfo.color.red, colorInfo.color.green, colorInfo.color.blue, colorInfo.color.alpha],
					range: colorInfo.range
				}));
			}
		});

		return TPromise.as(null);
	}

	// --- configuration

	$setLanguageConfiguration(handle: number, languageId: string, _configuration: vscode.LanguageConfiguration): TPromise<any> {

		let configuration: LanguageConfiguration = {
			comments: _configuration.comments,
			brackets: _configuration.brackets,
			wordPattern: _configuration.wordPattern,
			indentationRules: _configuration.indentationRules,
			onEnterRules: _configuration.onEnterRules,

			autoClosingPairs: null,
			surroundingPairs: null,
			__electricCharacterSupport: null
		};

		if (_configuration.__characterPairSupport) {
			// backwards compatibility
			configuration.autoClosingPairs = _configuration.__characterPairSupport.autoClosingPairs;
		}

		if (_configuration.__electricCharacterSupport && _configuration.__electricCharacterSupport.docComment) {
			configuration.__electricCharacterSupport = {
				docComment: {
					open: _configuration.__electricCharacterSupport.docComment.open,
					close: _configuration.__electricCharacterSupport.docComment.close
				}
			};
		}

		let languageIdentifier = this._modeService.getLanguageIdentifier(languageId);
		if (languageIdentifier) {
			this._registrations[handle] = LanguageConfigurationRegistry.register(languageIdentifier, configuration);
		}

		return undefined;
	}

}
