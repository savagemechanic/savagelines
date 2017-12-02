/*---------------------------------------------------------------------------------------------
 *  Copyright (c) savagemechanic. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { MinimapCharRenderer } from 'vs/editor/common/view/minimapCharRenderer';

function toUint8ClampedArrat(arr: number[]): Uint8ClampedArray {
	let r = new Uint8ClampedArray(arr.length);
	for (let i = 0, len = arr.length; i < len; i++) {
		r[i] = arr[i];
	}
	return r;
}

let minimapCharRenderer: MinimapCharRenderer = null;
export function getOrCreateMinimapCharRenderer(): MinimapCharRenderer {
	if (!minimapCharRenderer) {
		let _x1Data = toUint8ClampedArrat(x1Data);
		x1Data = null;

		let _x2Data = toUint8ClampedArrat(x2Data);
		x2Data = null;
		minimapCharRenderer = new MinimapCharRenderer(_x2Data, _x1Data);
	}
	return minimapCharRenderer;
}

var x2Data = [

	//
	0, 0,
	0, 0,
	0, 0,
	0, 0,

	// !
	39, 14,
	39, 14,
	14, 5,
	29, 10,

	// "
	96, 96,
	29, 29,
	0, 0,
	0, 0,

	// #
	49, 113,
	195, 214,
	227, 166,
	135, 42,

	// $
	40, 29,
	194, 38,
	75, 148,
	197, 187,

	// %
	145, 0,
	160, 61,
	75, 143,
	2, 183,

	// &
	138, 58,
	163, 6,
	177, 223,
	197, 227,

	// '
	38, 13,
	11, 4,
	0, 0,
	0, 0,

	// (
	10, 54,
	52, 8,
	62, 4,
	71, 122,

	// )
	73, 2,
	19, 40,
	10, 50,
	155, 36,

	// *
	79, 70,
	145, 121,
	7, 5,
	0, 0,

	// +
	2, 1,
	36, 12,
	204, 166,
	16, 5,

	// ,
	0, 0,
	0, 0,
	1, 0,
	154, 34,

	// -
	0, 0,
	0, 0,
	96, 83,
	0, 0,

	// .
	0, 0,
	0, 0,
	0, 0,
	46, 34,

	// /
	0, 82,
	2, 56,
	53, 3,
	146, 0,

	// 0
	146, 119,
	152, 132,
	152, 131,
	145, 119,

	// 1
	170, 42,
	15, 42,
	15, 42,
	172, 194,

	// 2
	131, 132,
	0, 139,
	80, 28,
	227, 143,

	// 3
	159, 135,
	15, 118,
	11, 126,
	171, 144,

	// 4
	20, 124,
	88, 106,
	217, 196,
	0, 106,

	// 5
	189, 92,
	168, 43,
	5, 130,
	164, 133,

	// 6
	130, 115,
	183, 65,
	134, 120,
	141, 141,

	// 7
	170, 196,
	2, 106,
	31, 32,
	105, 2,

	// 8
	145, 130,
	116, 114,
	132, 135,
	138, 140,

	// 9
	138, 113,
	147, 137,
	81, 183,
	129, 94,

	// :
	0, 0,
	21, 16,
	4, 3,
	46, 34,

	// ;
	0, 0,
	45, 34,
	1, 0,
	160, 49,

	// <
	0, 0,
	43, 143,
	203, 23,
	1, 76,

	// =
	0, 0,
	38, 28,
	131, 96,
	38, 28,

	// >
	0, 0,
	168, 31,
	29, 191,
	98, 0,

	// ?
	118, 139,
	5, 113,
	45, 13,
	37, 6,

	// @
	97, 115,
	161, 179,
	204, 105,
	223, 224,

	// A
	83, 52,
	111, 100,
	184, 186,
	120, 132,

	// B
	212, 145,
	180, 139,
	174, 161,
	212, 182,

	// C
	104, 162,
	131, 0,
	131, 0,
	104, 161,

	// D
	219, 120,
	110, 116,
	110, 116,
	219, 120,

	// E
	207, 154,
	163, 40,
	147, 22,
	207, 154,

	// F
	202, 159,
	161, 47,
	145, 23,
	111, 0,

	// G
	139, 154,
	144, 30,
	144, 135,
	139, 187,

	// H
	110, 110,
	168, 161,
	150, 145,
	110, 110,

	// I
	185, 162,
	43, 16,
	43, 16,
	185, 162,

	// J
	73, 129,
	0, 110,
	0, 110,
	191, 87,

	// K
	149, 149,
	236, 48,
	195, 91,
	146, 149,

	// L
	146, 0,
	146, 0,
	146, 0,
	187, 173,

	// M
	200, 201,
	222, 215,
	172, 147,
	95, 95,

	// N
	193, 97,
	224, 129,
	159, 206,
	97, 192,

	// O
	155, 139,
	153, 115,
	153, 115,
	156, 140,

	// P
	189, 158,
	123, 136,
	190, 64,
	111, 0,

	// Q
	155, 139,
	153, 115,
	153, 114,
	156, 241,

	// R
	197, 148,
	150, 152,
	170, 116,
	110, 157,

	// S
	156, 128,
	169, 14,
	13, 159,
	158, 149,

	// T
	212, 189,
	43, 16,
	43, 16,
	43, 16,

	// U
	148, 110,
	148, 110,
	147, 109,
	182, 151,

	// V
	133, 121,
	106, 118,
	114, 103,
	89, 66,

	// W
	94, 94,
	211, 188,
	205, 207,
	139, 168,

	// X
	151, 152,
	87, 76,
	101, 79,
	151, 152,

	// Y
	130, 156,
	125, 116,
	47, 29,
	43, 16,

	// Z
	169, 228,
	11, 103,
	120, 6,
	230, 176,

	// [
	55, 49,
	55, 6,
	55, 6,
	193, 102,

	// \
	92, 0,
	71, 0,
	13, 30,
	0, 147,

	// ]
	63, 43,
	12, 43,
	12, 43,
	142, 152,

	// ^
	71, 53,
	61, 61,
	0, 0,
	0, 0,

	// _
	0, 0,
	0, 0,
	0, 0,
	158, 146,

	// `
	25, 2,
	0, 0,
	0, 0,
	0, 0,

	// a
	0, 0,
	107, 130,
	170, 194,
	176, 188,

	// b
	109, 0,
	203, 159,
	113, 111,
	202, 158,

	// c
	0, 0,
	135, 135,
	114, 0,
	136, 135,

	// d
	0, 109,
	187, 190,
	148, 126,
	177, 187,

	// e
	0, 0,
	149, 130,
	218, 105,
	169, 135,

	// f
	37, 113,
	146, 113,
	49, 13,
	49, 13,

	// g
	0, 0,
	178, 195,
	147, 114,
	255, 255,

	// h
	109, 0,
	193, 149,
	110, 109,
	109, 109,

	// i
	12, 15,
	125, 41,
	33, 41,
	144, 188,

	// j
	1, 6,
	75, 53,
	10, 53,
	210, 161,

	// k
	110, 0,
	152, 148,
	210, 60,
	110, 156,

	// l
	213, 5,
	63, 5,
	63, 5,
	45, 111,

	// m
	0, 0,
	232, 172,
	190, 168,
	190, 169,

	// n
	0, 0,
	190, 144,
	109, 109,
	109, 109,

	// o
	0, 0,
	168, 140,
	148, 111,
	168, 140,

	// p
	0, 0,
	200, 151,
	113, 110,
	255, 158,

	// q
	0, 0,
	184, 188,
	147, 139,
	186, 255,

	// r
	0, 0,
	122, 130,
	111, 0,
	109, 0,

	// s
	0, 0,
	132, 69,
	109, 93,
	110, 136,

	// t
	51, 5,
	205, 103,
	61, 6,
	47, 106,

	// u
	0, 0,
	110, 109,
	110, 122,
	155, 179,

	// v
	0, 0,
	132, 120,
	113, 114,
	84, 63,

	// w
	0, 0,
	124, 108,
	202, 189,
	160, 174,

	// x
	0, 0,
	144, 142,
	79, 57,
	159, 146,

	// y
	0, 0,
	138, 138,
	119, 117,
	255, 69,

	// z
	0, 0,
	97, 198,
	47, 38,
	208, 84,

	// {
	23, 112,
	41, 14,
	157, 7,
	121, 192,

	// |
	35, 11,
	35, 11,
	35, 11,
	160, 61,

	// }
	129, 9,
	40, 19,
	20, 139,
	236, 44,

	// ~
	0, 0,
	15, 3,
	97, 93,
	0, 0,

];

var x1Data = [

	//
	0,
	0,

	// !
	23,
	12,

	// "
	53,
	0,

	// #
	130,
	127,

	// $
	58,
	149,

	// %
	67,
	77,

	// &
	72,
	198,

	// '
	13,
	0,

	// (
	25,
	51,

	// )
	25,
	49,

	// *
	94,
	2,

	// +
	8,
	64,

	// ,
	0,
	24,

	// -
	0,
	21,

	// .
	0,
	9,

	// /
	19,
	27,

	// 0
	126,
	126,

	// 1
	51,
	80,

	// 2
	72,
	105,

	// 3
	87,
	98,

	// 4
	73,
	93,

	// 5
	106,
	85,

	// 6
	111,
	123,

	// 7
	87,
	30,

	// 8
	116,
	126,

	// 9
	123,
	110,

	// :
	4,
	16,

	// ;
	9,
	28,

	// <
	21,
	53,

	// =
	8,
	62,

	// >
	23,
	52,

	// ?
	73,
	21,

	// @
	132,
	183,

	// A
	78,
	142,

	// B
	168,
	175,

	// C
	70,
	70,

	// D
	128,
	128,

	// E
	123,
	110,

	// F
	125,
	43,

	// G
	100,
	139,

	// H
	125,
	119,

	// I
	78,
	78,

	// J
	54,
	77,

	// K
	139,
	139,

	// L
	33,
	87,

	// M
	201,
	117,

	// N
	162,
	149,

	// O
	130,
	130,

	// P
	138,
	60,

	// Q
	130,
	172,

	// R
	149,
	127,

	// S
	95,
	98,

	// T
	95,
	25,

	// U
	118,
	135,

	// V
	110,
	85,

	// W
	147,
	175,

	// X
	105,
	110,

	// Y
	121,
	30,

	// Z
	101,
	113,

	// [
	34,
	68,

	// \
	20,
	26,

	// ]
	34,
	68,

	// ^
	56,
	0,

	// _
	0,
	44,

	// `
	3,
	0,

	// a
	27,
	175,

	// b
	80,
	133,

	// c
	31,
	66,

	// d
	85,
	147,

	// e
	32,
	150,

	// f
	90,
	25,

	// g
	45,
	230,

	// h
	77,
	101,

	// i
	36,
	83,

	// j
	22,
	84,

	// k
	71,
	118,

	// l
	44,
	44,

	// m
	52,
	172,

	// n
	38,
	101,

	// o
	35,
	130,

	// p
	40,
	197,

	// q
	43,
	197,

	// r
	29,
	26,

	// s
	23,
	103,

	// t
	67,
	44,

	// u
	25,
	129,

	// v
	29,
	85,

	// w
	27,
	177,

	// x
	33,
	97,

	// y
	32,
	145,

	// z
	33,
	77,

	// {
	38,
	96,

	// |
	20,
	55,

	// }
	36,
	95,

	// ~
	2,
	22,

];
