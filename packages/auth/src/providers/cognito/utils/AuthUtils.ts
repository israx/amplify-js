// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthError } from '../../../errors/AuthError';
import {
	AuthSignInResult,
	AuthSignInStep,
	AdditionalInfo,
	DeliveryMedium,
} from '../../../types';
import WordArray from './WordArray';
import { Sha256 } from '@aws-crypto/sha256-js';
import { ChallengeName, ChallengeParameters } from './clients/types/models';
import { InitiateAuthException } from '../types/errors/service';

export function randomBytes(nBytes) {
	return new WordArray().random(nBytes).toString();
}

export function hash(buf) {
	const awsCryptoHash = new Sha256();
	awsCryptoHash.update(buf);

	const resultFromAWSCrypto = awsCryptoHash.digestSync();
	const hashHexFromUint8 = toHex(resultFromAWSCrypto);
	return new Array(64 - hashHexFromUint8.length).join('0') + hashHexFromUint8;
}

/**
 * Calculate a hash from a hex string
 * @param {String} hexStr Value to hash.
 * @returns {String} Hex-encoded hash.
 * @private
 */
export function hexHash(hexStr) {
	return hash(fromHex(hexStr));
}

const SHORT_TO_HEX = {};
const HEX_TO_SHORT = {};

for (let i = 0; i < 256; i++) {
	let encodedByte = i.toString(16).toLowerCase();
	if (encodedByte.length === 1) {
		encodedByte = `0${encodedByte}`;
	}

	SHORT_TO_HEX[i] = encodedByte;
	HEX_TO_SHORT[encodedByte] = i;
}

/**
 * Converts a hexadecimal encoded string to a Uint8Array of bytes.
 *
 * @param encoded The hexadecimal encoded string
 */
function fromHex(encoded: string) {
	if (encoded.length % 2 !== 0) {
		throw new Error('Hex encoded strings must have an even number length');
	}

	const out = new Uint8Array(encoded.length / 2);
	for (let i = 0; i < encoded.length; i += 2) {
		const encodedByte = encoded.slice(i, i + 2).toLowerCase();
		if (encodedByte in HEX_TO_SHORT) {
			out[i / 2] = HEX_TO_SHORT[encodedByte];
		} else {
			throw new Error(
				`Cannot decode unrecognized sequence ${encodedByte} as hexadecimal`
			);
		}
	}

	return out;
}

/**
 * Converts a Uint8Array of binary data to a hexadecimal encoded string.
 *
 * @param bytes The binary data to encode
 */
export function toHex(bytes) {
	let out = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		out += SHORT_TO_HEX[bytes[i]];
	}

	return out;
}

const getAtob = () => {
	let atob;

	if (typeof window !== 'undefined' && window.atob) {
		atob = window.atob;
	} else if (typeof global !== 'undefined' && (global as any).atob) {
		atob = (global as any).atob;
	}

	return atob;
};

const getBtoa = () => {
	let btoa;

	if (typeof window !== 'undefined' && window.btoa) {
		btoa = window.btoa;
	} else if (typeof global !== 'undefined' && (global as any).btoa) {
		btoa = (global as any).btoa;
	}

	return btoa;
};

export function _urlB64ToUint8Array(base64String) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding)
		.replace(/\-/g, '+')
		.replace(/_/g, '/');

	const rawData = getAtob()(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export function _encodeBase64Bytes(bytes) {
	return getBtoa()(
		bytes.reduce((acc, current) => acc + String.fromCharCode(current), '')
	);
}

const monthNames = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];
const weekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getNowString() {
	const now = new Date();

	const weekDay = weekNames[now.getUTCDay()];
	const month = monthNames[now.getUTCMonth()];
	const day = now.getUTCDate();

	let hours: string | number = now.getUTCHours();
	if (hours < 10) {
		hours = `0${hours}`;
	}

	let minutes: string | number = now.getUTCMinutes();
	if (minutes < 10) {
		minutes = `0${minutes}`;
	}

	let seconds: string | number = now.getUTCSeconds();
	if (seconds < 10) {
		seconds = `0${seconds}`;
	}

	const year = now.getUTCFullYear();

	// ddd MMM D HH:mm:ss UTC YYYY
	const dateNow = `${weekDay} ${month} ${day} ${hours}:${minutes}:${seconds} UTC ${year}`;

	return dateNow;
}

export function getSignatureString({
	userPoolName,
	username,
	challengeParameters,
	dateNow,
	hkdf,
}): string {
	const encoder = new TextEncoder();

	const bufUPIDaToB = encoder.encode(userPoolName);
	const bufUNaToB = encoder.encode(username);
	const bufSBaToB = _urlB64ToUint8Array(challengeParameters.SECRET_BLOCK);
	const bufDNaToB = encoder.encode(dateNow);

	const bufConcat = new Uint8Array(
		bufUPIDaToB.byteLength +
			bufUNaToB.byteLength +
			bufSBaToB.byteLength +
			bufDNaToB.byteLength
	);
	bufConcat.set(bufUPIDaToB, 0);
	bufConcat.set(bufUNaToB, bufUPIDaToB.byteLength);
	bufConcat.set(bufSBaToB, bufUPIDaToB.byteLength + bufUNaToB.byteLength);
	bufConcat.set(
		bufDNaToB,
		bufUPIDaToB.byteLength + bufUNaToB.byteLength + bufSBaToB.byteLength
	);

	const awsCryptoHash = new Sha256(hkdf);
	awsCryptoHash.update(bufConcat);
	const resultFromAWSCrypto = awsCryptoHash.digestSync();
	const signatureString = _encodeBase64Bytes(resultFromAWSCrypto);
	return signatureString;
}

export function getLargeAValue(authenticationHelper) {
	return new Promise(res => {
		authenticationHelper.getLargeAValue((err, aValue) => {
			res(aValue);
		});
	});
}

export function getPasswordAuthenticationKey({
	authenticationHelper,
	username,
	password,
	serverBValue,
	salt,
}) {
	return new Promise((res, rej) => {
		authenticationHelper.getPasswordAuthenticationKey(
			username,
			password,
			serverBValue,
			salt,
			(err, hkdf) => {
				if (err) {
					return rej(err);
				}

				res(hkdf);
			}
		);
	});
}

export function getSignInResult(params: {
	challengeName: ChallengeName;
	challengeParameters: ChallengeParameters;
	secretCode?: string;
}): AuthSignInResult {
	const { challengeName, challengeParameters, secretCode } = params;
	switch (challengeName) {
		case 'CUSTOM_CHALLENGE':
			return {
				isSignedIn: false,
				nextStep: {
					signInStep: AuthSignInStep.CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE,
					additionalInfo: challengeParameters as AdditionalInfo,
				},
			};
		case 'MFA_SETUP':
			return {
				isSignedIn: false,
				nextStep: {
					signInStep:
						AuthSignInStep.CONFIRM_SIGN_IN_WITH_SOFTWARE_TOKEN_MFA_SETUP,
					additionalInfo: challengeParameters as AdditionalInfo,
					secretCode,
				},
			};
		case 'NEW_PASSWORD_REQUIRED':
			return {
				isSignedIn: false,
				nextStep: {
					signInStep: AuthSignInStep.CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED,
					additionalInfo: challengeParameters as AdditionalInfo,
					missingAttributes: parseAttributes(
						challengeParameters.requiredAttributes
					),
				},
			};
		case 'SELECT_MFA_TYPE':
			return {
				isSignedIn: false,
				nextStep: {
					signInStep: AuthSignInStep.CONFIRM_SIGN_IN_WITH_MFA_SELECTION,
					additionalInfo: challengeParameters as AdditionalInfo,
				},
			};
		case 'SMS_MFA':
			return {
				isSignedIn: false,
				nextStep: {
					signInStep: AuthSignInStep.CONFIRM_SIGN_IN_WITH_SMS_MFA_CODE,
					codeDeliveryDetails: {
						deliveryMedium:
							challengeParameters.CODE_DELIVERY_DELIVERY_MEDIUM as DeliveryMedium,
						destination: challengeParameters.CODE_DELIVERY_DESTINATION,
					},
				},
			};
		case 'SOFTWARE_TOKEN_MFA':
			return {
				isSignedIn: false,
				nextStep: {
					signInStep:
						AuthSignInStep.CONFIRM_SIGN_IN_WITH_SOFTWARE_TOKEN_MFA_CODE,
				},
			};
		case 'ADMIN_NO_SRP_AUTH':
			break;
		case 'DEVICE_PASSWORD_VERIFIER':
			break;
		case 'DEVICE_SRP_AUTH':
			break;
		case 'PASSWORD_VERIFIER':
			break;
		default:
			// Exhaustive type checking to address all challengeName
			const step: never = challengeName;
	}

	throw new AuthError({
		name: 'UnrecognizedChallengeName',
		message: `challengeName was not recognized. 
			 This probably happened due to the underlying service returning a non supported challengeName.`,
	});
}

export function getSignInResultFromError(
	errorName: string
): AuthSignInResult | undefined {
	if (errorName === InitiateAuthException.PasswordResetRequiredException) {
		return {
			isSignedIn: false,
			nextStep: { signInStep: AuthSignInStep.RESET_PASSWORD },
		};
	} else if (errorName === InitiateAuthException.UserNotConfirmedException) {
		return {
			isSignedIn: false,
			nextStep: { signInStep: AuthSignInStep.CONFIRM_SIGN_UP },
		};
	}
}

export function parseAttributes(attributes: string | undefined): string[] {
	console.log(attributes);

	if (!attributes) return [];
	return [attributes];
}
