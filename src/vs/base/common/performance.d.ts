/*---------------------------------------------------------------------------------------------
 *  Copyright (c) savagemechanic. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface PerformanceEntry {
	readonly type: 'mark' | 'measure';
	readonly name: string;
	readonly startTime: number;
	readonly duration: number;
}

export function mark(name: string): void;
export function measure(name: string, from?: string, to?: string): void;

/**
 * Time something, shorthant for `mark` and `measure`
 */
export function time(name: string): { stop(): void };

/**
 * All entries filtered by type and sorted by `startTime`.
 */
export function getEntries(type: 'mark' | 'measure'): PerformanceEntry[];


type ExportData = any[];
export function importEntries(data: ExportData): void;
export function exportEntries(): ExportData;
