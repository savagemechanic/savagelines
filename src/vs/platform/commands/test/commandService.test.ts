/*---------------------------------------------------------------------------------------------
 *  Copyright (c) savagemechanic. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import { IDisposable } from 'vs/base/common/lifecycle';
import { TPromise } from 'vs/base/common/winjs.base';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { CommandService } from 'vs/platform/commands/common/commandService';
import { IExtensionService, ExtensionPointContribution, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { InstantiationService } from 'vs/platform/instantiation/common/instantiationService';
import { IExtensionPoint } from 'vs/platform/extensions/common/extensionsRegistry';
import { ContextKeyService } from 'vs/platform/contextkey/browser/contextKeyService';
import { SimpleConfigurationService } from 'vs/editor/standalone/browser/simpleServices';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import Event, { Emitter } from 'vs/base/common/event';

class SimpleExtensionService implements IExtensionService {
	_serviceBrand: any;
	private _onDidRegisterExtensions = new Emitter<IExtensionDescription[]>();
	get onDidRegisterExtensions(): Event<IExtensionDescription[]> {
		return this._onDidRegisterExtensions.event;
	}
	activateByEvent(activationEvent: string): TPromise<void> {
		return this.whenInstalledExtensionsRegistered().then(() => { });
	}
	whenInstalledExtensionsRegistered(): TPromise<boolean> {
		return TPromise.as(true);
	}
	readExtensionPointContributions<T>(extPoint: IExtensionPoint<T>): TPromise<ExtensionPointContribution<T>[]> {
		return TPromise.as([]);
	}
	getExtensionsStatus() {
		return undefined;
	}
	getExtensionsActivationTimes() {
		return undefined;
	}
	getExtensions(): TPromise<IExtensionDescription[]> {
		return TPromise.wrap([]);
	}
	restartExtensionHost(): void {
	}
	startExtensionHost(): void {
	}
	stopExtensionHost(): void {
	}
}

suite('CommandService', function () {

	let commandRegistration: IDisposable;

	setup(function () {
		commandRegistration = CommandsRegistry.registerCommand('foo', function () { });
	});

	teardown(function () {
		commandRegistration.dispose();
	});

	test('activateOnCommand', function () {

		let lastEvent: string;

		let service = new CommandService(new InstantiationService(), new class extends SimpleExtensionService {
			activateByEvent(activationEvent: string): TPromise<void> {
				lastEvent = activationEvent;
				return super.activateByEvent(activationEvent);
			}
		}, new ContextKeyService(new SimpleConfigurationService()));

		return service.executeCommand('foo').then(() => {
			assert.ok(lastEvent, 'onCommand:foo');
			return service.executeCommand('unknownCommandId');
		}).then(() => {
			assert.ok(false);
		}, () => {
			assert.ok(lastEvent, 'onCommand:unknownCommandId');
		});
	});

	test('fwd activation error', function () {

		let service = new CommandService(new InstantiationService(), new class extends SimpleExtensionService {
			activateByEvent(activationEvent: string): TPromise<void> {
				return TPromise.wrapError<void>(new Error('bad_activate'));
			}
		}, new ContextKeyService(new SimpleConfigurationService()));

		return service.executeCommand('foo').then(() => assert.ok(false), err => {
			assert.equal(err.message, 'bad_activate');
		});
	});

	test('!onReady, but executeCommand', function () {

		let callCounter = 0;
		let reg = CommandsRegistry.registerCommand('bar', () => callCounter += 1);

		let service = new CommandService(new InstantiationService(), new class extends SimpleExtensionService {
			whenInstalledExtensionsRegistered() {
				return new TPromise<boolean>(_resolve => { /*ignore*/ });
			}
		}, new ContextKeyService(new SimpleConfigurationService()));

		service.executeCommand('bar');
		assert.equal(callCounter, 1);
		reg.dispose();
	});

	test('issue #34913: !onReady, unknown command', function () {

		let callCounter = 0;
		let resolveFunc: Function;
		// let reg = CommandsRegistry.registerCommand('bar', () => callCounter += 1);

		let service = new CommandService(new InstantiationService(), new class extends SimpleExtensionService {
			whenInstalledExtensionsRegistered() {
				return new TPromise<boolean>(_resolve => { resolveFunc = _resolve; });
			}
		}, new ContextKeyService(new SimpleConfigurationService()));

		let r = service.executeCommand('bar');
		assert.equal(callCounter, 0);

		let reg = CommandsRegistry.registerCommand('bar', () => callCounter += 1);
		resolveFunc(true);

		return r.then(() => {
			reg.dispose();
			assert.equal(callCounter, 1);
		});
	});

	test('honor command-precondition', function () {
		let contextKeyService = new ContextKeyService(new SimpleConfigurationService());
		let commandService = new CommandService(
			new InstantiationService(),
			new SimpleExtensionService(),
			contextKeyService
		);

		let counter = 0;
		let reg = CommandsRegistry.registerCommand({
			id: 'bar',
			handler: () => { counter += 1; },
			precondition: ContextKeyExpr.has('foocontext')
		});

		return commandService.executeCommand('bar').then(() => {
			assert.throws(() => { });
		}, () => {
			contextKeyService.setContext('foocontext', true);
			return commandService.executeCommand('bar');
		}).then(() => {
			assert.equal(counter, 1);
			reg.dispose();
		});

	});
});
