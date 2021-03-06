/*---------------------------------------------------------------------------------------------
 *  Copyright (c) savagemechanic. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { TPromise } from 'vs/base/common/winjs.base';
import { Registry } from 'vs/platform/registry/common/platform';
import { KeybindingsRegistry } from 'vs/platform/keybinding/common/keybindingsRegistry';
import { ICommandHandler, CommandsRegistry } from 'vs/platform/commands/common/commands';
import { SyncActionDescriptor, MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { IMessageService } from 'vs/platform/message/common/message';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import Severity from 'vs/base/common/severity';
import { IDisposable, combinedDisposable } from 'vs/base/common/lifecycle';
import { ILifecycleService, LifecyclePhase } from 'vs/platform/lifecycle/common/lifecycle';

export const Extensions = {
	WorkbenchActions: 'workbench.contributions.actions'
};

export interface IWorkbenchActionRegistry {

	/**
	 * Registers a workbench action to the platform. Workbench actions are not
	 * visible by default and can only be invoked through a keybinding if provided.
	 */
	registerWorkbenchAction(descriptor: SyncActionDescriptor, alias: string, category?: string): IDisposable;
}

Registry.add(Extensions.WorkbenchActions, new class implements IWorkbenchActionRegistry {

	registerWorkbenchAction(descriptor: SyncActionDescriptor, alias: string, category?: string): IDisposable {
		return this._registerWorkbenchCommandFromAction(descriptor, alias, category);
	}

	private _registerWorkbenchCommandFromAction(descriptor: SyncActionDescriptor, alias: string, category?: string): IDisposable {
		let registrations: IDisposable[] = [];

		// command
		registrations.push(CommandsRegistry.registerCommand(descriptor.id, this._createCommandHandler(descriptor)));

		// keybinding
		const when = descriptor.keybindingContext;
		const weight = (typeof descriptor.keybindingWeight === 'undefined' ? KeybindingsRegistry.WEIGHT.workbenchContrib() : descriptor.keybindingWeight);
		const keybindings = descriptor.keybindings;
		KeybindingsRegistry.registerKeybindingRule({
			id: descriptor.id,
			weight: weight,
			when: when,
			primary: keybindings && keybindings.primary,
			secondary: keybindings && keybindings.secondary,
			win: keybindings && keybindings.win,
			mac: keybindings && keybindings.mac,
			linux: keybindings && keybindings.linux
		});

		// menu item
		// TODO@Rob slightly weird if-check required because of
		// https://github.com/Microsoft/vscode/blob/master/src/vs/workbench/parts/search/electron-browser/search.contribution.ts#L266
		if (descriptor.label) {

			const command = {
				id: descriptor.id,
				title: { value: descriptor.label, original: alias },
				category
			};

			MenuRegistry.addCommand(command);

			registrations.push(MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command }));
		}

		// TODO@alex,joh
		// support removal of keybinding rule
		// support removal of command-ui
		return combinedDisposable(registrations);
	}

	private _createCommandHandler(descriptor: SyncActionDescriptor): ICommandHandler {
		return (accessor, args) => {
			const messageService = accessor.get(IMessageService);
			const instantiationService = accessor.get(IInstantiationService);
			const lifecycleService = accessor.get(ILifecycleService);

			TPromise.as(this._triggerAndDisposeAction(instantiationService, lifecycleService, descriptor, args)).then(null, (err) => {
				messageService.show(Severity.Error, err);
			});
		};
	}

	private _triggerAndDisposeAction(instantitationService: IInstantiationService, lifecycleService: ILifecycleService, descriptor: SyncActionDescriptor, args: any): Thenable<void> {
		const actionInstance = instantitationService.createInstance(descriptor.syncDescriptor);
		actionInstance.label = descriptor.label || actionInstance.label;

		// don't run the action when not enabled
		if (!actionInstance.enabled) {
			actionInstance.dispose();

			return void 0;
		}

		const from = args && args.from || 'keybinding';

		// run action when workbench is created
		return lifecycleService.when(LifecyclePhase.Running).then(() => {
			try {
				return TPromise.as(actionInstance.run(undefined, { from })).then(() => {
					actionInstance.dispose();
				}, (err) => {
					actionInstance.dispose();
					return TPromise.wrapError(err);
				});
			} catch (err) {
				actionInstance.dispose();
				return TPromise.wrapError(err);
			}
		});
	}
});

