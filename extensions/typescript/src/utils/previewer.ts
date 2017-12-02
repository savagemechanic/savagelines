/*---------------------------------------------------------------------------------------------
 *  Copyright (c) savagemechanic. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Proto from '../protocol';
import { MarkdownString } from 'vscode';

function getTagText(tag: Proto.JSDocTagInfo): string | undefined {
	if (!tag.text) {
		return undefined;
	}

	switch (tag.name) {
		case 'example':
			// Convert to markdown code block
			if (tag.text.match(/^\s*[~`]{3}/g)) {
				return tag.text;
			}
			return '```\n' + tag.text + '\n```';
	}

	return tag.text;
}

export function plain(parts: Proto.SymbolDisplayPart[]): string {
	if (!parts) {
		return '';
	}
	return parts.map(part => part.text).join('');
}

export function tagsMarkdownPreview(tags: Proto.JSDocTagInfo[]): string {
	return (tags || [])
		.map(tag => {
			const label = `*@${tag.name}*`;
			const text = getTagText(tag);
			if (!text) {
				return label;
			}
			return label + (text.match(/\r\n|\n/g) ? '  \n' + text : ` — ${text}`);
		})
		.join('  \n\n');
}

export function markdownDocumentation(
	documentation: Proto.SymbolDisplayPart[],
	tags: Proto.JSDocTagInfo[]
): MarkdownString {
	const out = new MarkdownString();
	addmarkdownDocumentation(out, documentation, tags);
	return out;
}

export function addmarkdownDocumentation(
	out: MarkdownString,
	documentation: Proto.SymbolDisplayPart[],
	tags: Proto.JSDocTagInfo[]
): MarkdownString {
	out.appendMarkdown(plain(documentation));
	const tagsPreview = tagsMarkdownPreview(tags);
	if (tagsPreview) {
		out.appendMarkdown('\n\n' + tagsPreview);
	}
	return out;
}