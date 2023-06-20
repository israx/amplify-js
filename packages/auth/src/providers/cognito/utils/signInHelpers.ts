// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Amplify } from '@aws-amplify/core';
import {
	InitiateAuthCommandOutput,
	RespondToAuthChallengeCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import {
	getLargeAValue,
	getNowString,
	getPasswordAuthenticationKey,
	getSignatureString,
} from './srp/helpers';
import AuthenticationHelper from './srp/AuthenticationHelper';
import BigInteger from './srp/BigInteger';
import {
	InitiateAuthClientInput,
	initiateAuthClient,
} from './clients/InitiateAuthClient';
import {
	RespondToAuthChallengeClientInput,
	respondToAuthChallengeClient,
} from './clients/RespondToAuthChallengeClient';
import { ChallengeName, ChallengeParameters } from './clients/types/models';
import { ClientMetadata } from '../types';
import {
	AdditionalInfo,
	AuthSignInResult,
	AuthSignInStep,
	DeliveryMedium,
} from '../../../types';
import { AuthError } from '../../../errors/AuthError';
import { InitiateAuthException } from '../types/errors';
import {
	AllowedMFATypes,
	AuthUserAttribute,
	TOTPSetupDetails,
} from '../../../types/models';
import { verifySoftwareTokenClient } from './clients/VerifySoftwareTokenClient';
import { signInStore } from './signInStore';

const USER_ATTRIBUTES = 'userAttributes.';

export async function handleCustomChallenge(
	challengeResponse: string,
	clientMetadata: ClientMetadata | undefined,
	session: string | undefined,
	username: string
): Promise<RespondToAuthChallengeCommandOutput> {
	const challengeResponses = { USERNAME: username, ANSWER: challengeResponse };
	const jsonReq: RespondToAuthChallengeClientInput = {
		ChallengeName: 'CUSTOM_CHALLENGE',
		ChallengeResponses: challengeResponses,
		Session: session,
		ClientMetadata: clientMetadata,
	};
	return await respondToAuthChallengeClient(jsonReq);
}

export async function handleMFASetupChallenge(
	challengeResponse: string,
	clientMetadata: ClientMetadata | undefined,
	session: string | undefined,
	username: string
): Promise<RespondToAuthChallengeCommandOutput> {
	const challengeResponses = {
		USERNAME: username,
	};

	const verifyTOTPCode = await verifySoftwareTokenClient({
		UserCode: challengeResponse,
		Session: session,
	});

	signInStore.dispatch({
		type: 'SET_ACTIVE_SIGN_IN_SESSION',
		value: verifyTOTPCode.Session,
	});

	const jsonReq: RespondToAuthChallengeClientInput = {
		ChallengeName: 'MFA_SETUP',
		ChallengeResponses: challengeResponses,
		Session: verifyTOTPCode.Session,
		ClientMetadata: clientMetadata,
	};
	return await respondToAuthChallengeClient(jsonReq);
}

export async function handleSelectMFATypeChallenge(
	challengeResponse: string,
	clientMetadata: ClientMetadata | undefined,
	session: string | undefined,
	username: string
): Promise<RespondToAuthChallengeCommandOutput> {
	const challengeResponses = {
		USERNAME: username,
		ANSWER: challengeResponse,
	};
	const jsonReq: RespondToAuthChallengeClientInput = {
		ChallengeName: 'SELECT_MFA_TYPE',
		ChallengeResponses: challengeResponses,
		Session: session,
		ClientMetadata: clientMetadata,
	};

	return await respondToAuthChallengeClient(jsonReq);
}

export async function handleSMSMFAChallenge(
	challengeResponse: string,
	clientMetadata: ClientMetadata | undefined,
	session: string | undefined,
	username: string
): Promise<RespondToAuthChallengeCommandOutput> {
	const challengeResponses = {
		USERNAME: username,
		SMS_MFA_CODE: challengeResponse,
	};
	const jsonReq: RespondToAuthChallengeClientInput = {
		ChallengeName: 'SMS_MFA',
		ChallengeResponses: challengeResponses,
		Session: session,
		ClientMetadata: clientMetadata,
	};

	return await respondToAuthChallengeClient(jsonReq);
}
export async function handleSoftwareTokenMFAChallenge(
	challengeResponse: string,
	clientMetadata: ClientMetadata | undefined,
	session: string | undefined,
	username: string
): Promise<RespondToAuthChallengeCommandOutput> {
	const challengeResponses = {
		USERNAME: username,
		SOFTWARE_TOKEN_MFA_CODE: challengeResponse,
	};
	const jsonReq: RespondToAuthChallengeClientInput = {
		ChallengeName: 'SOFTWARE_TOKEN_MFA',
		ChallengeResponses: challengeResponses,
		Session: session,
		ClientMetadata: clientMetadata,
	};
	return await respondToAuthChallengeClient(jsonReq);
}
export async function handleCompleteNewPasswordChallenge(
	challengeResponse: string,
	username: string,
	clientMetadata: ClientMetadata | undefined,
	session: string | undefined,
	requiredAttributes?: AuthUserAttribute
): Promise<RespondToAuthChallengeCommandOutput> {
	const challengeResponses = {
		...createAttributes(requiredAttributes),
		NEW_PASSWORD: challengeResponse,
		USERNAME: username,
	};

	const jsonReq: RespondToAuthChallengeClientInput = {
		ChallengeName: 'NEW_PASSWORD_REQUIRED',
		ChallengeResponses: challengeResponses,
		ClientMetadata: clientMetadata,
		Session: session,
	};

	return await respondToAuthChallengeClient(jsonReq);
}

export async function handleUserPasswordAuthFlow(
	username: string,
	password: string,
	clientMetadata: ClientMetadata | undefined
): Promise<InitiateAuthCommandOutput> {
	const jsonReq: InitiateAuthClientInput = {
		AuthFlow: 'USER_PASSWORD_AUTH',
		AuthParameters: {
			USERNAME: username,
			PASSWORD: password,
		},
		ClientMetadata: clientMetadata,
	};

	return await initiateAuthClient(jsonReq);
}

export async function handleUserSRPAuthFlow(
	username: string,
	password: string,
	clientMetadata: ClientMetadata | undefined
): Promise<RespondToAuthChallengeCommandOutput> {
	const config = Amplify.config;
	const userPoolId = config['aws_user_pools_id'];
	const userPoolName = userPoolId.split('_')[1];
	const authenticationHelper = new AuthenticationHelper(userPoolName);

	const jsonReq: InitiateAuthClientInput = {
		AuthFlow: 'USER_SRP_AUTH',
		AuthParameters: {
			USERNAME: username,
			SRP_A: ((await getLargeAValue(authenticationHelper)) as any).toString(16),
		},
		ClientMetadata: clientMetadata,
	};

	const resp = await initiateAuthClient(jsonReq);
	const { ChallengeParameters: challengeParameters, Session: session } = resp;

	return handlePasswordVerifierChallenge(
		password,
		challengeParameters as ChallengeParameters,
		clientMetadata,
		session,
		authenticationHelper,
		userPoolName
	);
}

export async function handleCustomSRPAuthFlow(
	username: string,
	password: string,
	clientMetadata: ClientMetadata | undefined
) {
	const userPoolId = Amplify.config['aws_user_pools_id'];
	const userPoolName = userPoolId.split('_')[1];
	const authenticationHelper = new AuthenticationHelper(userPoolName);
	const jsonReq: InitiateAuthClientInput = {
		AuthFlow: 'CUSTOM_AUTH',
		AuthParameters: {
			USERNAME: username,
			SRP_A: ((await getLargeAValue(authenticationHelper)) as any).toString(16),
			CHALLENGE_NAME: 'SRP_A',
		},
		ClientMetadata: clientMetadata,
	};

	const { ChallengeParameters: challengeParameters, Session: session } =
		await initiateAuthClient(jsonReq);

	return handlePasswordVerifierChallenge(
		password,
		challengeParameters as ChallengeParameters,
		clientMetadata,
		session,
		authenticationHelper,
		userPoolName
	);
}

export async function handlePasswordVerifierChallenge(
	password: string,
	challengeParameters: ChallengeParameters,
	clientMetadata: ClientMetadata | undefined,
	session: string | undefined,
	authenticationHelper: AuthenticationHelper,
	userPoolName: string
): Promise<RespondToAuthChallengeCommandOutput> {
	const serverBValue = new BigInteger(challengeParameters?.SRP_B, 16);
	const salt = new BigInteger(challengeParameters?.SALT, 16);
	const username = challengeParameters?.USER_ID_FOR_SRP;
	const hkdf = await getPasswordAuthenticationKey({
		authenticationHelper,
		username,
		password,
		serverBValue,
		salt,
	});

	const dateNow = getNowString();

	const challengeResponses = {
		USERNAME: username,
		PASSWORD_CLAIM_SECRET_BLOCK: challengeParameters?.SECRET_BLOCK,
		TIMESTAMP: dateNow,
		PASSWORD_CLAIM_SIGNATURE: getSignatureString({
			username: challengeParameters?.USER_ID_FOR_SRP,
			userPoolName,
			challengeParameters,
			dateNow,
			hkdf,
		}),
	} as { [key: string]: string };

	const jsonReqResponseChallenge: RespondToAuthChallengeClientInput = {
		ChallengeName: 'PASSWORD_VERIFIER',
		ChallengeResponses: challengeResponses,
		ClientMetadata: clientMetadata,
		Session: session,
	};

	return await respondToAuthChallengeClient(jsonReqResponseChallenge);
}

export function getSignInResult(params: {
	challengeName: ChallengeName;
	challengeParameters: ChallengeParameters;
}): AuthSignInResult {
	const { challengeName, challengeParameters } = params;

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
			const setupDetails = {} as TOTPSetupDetails;
			return {
				isSignedIn: false,
				nextStep: {
					signInStep: AuthSignInStep.CONTINUE_SIGN_IN_WITH_TOTP_SETUP,
					totpSetupDetails: setupDetails,
				},
			};
		case 'NEW_PASSWORD_REQUIRED':
			return {
				isSignedIn: false,
				nextStep: {
					signInStep: AuthSignInStep.CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED,
					missingAttributes: parseAttributes(
						challengeParameters.requiredAttributes
					),
					additionalInfo: challengeParameters as AdditionalInfo,
				},
			};
		case 'SELECT_MFA_TYPE':
			const mfaTypes = [] as AllowedMFATypes;
			return {
				isSignedIn: false,
				nextStep: {
					signInStep: AuthSignInStep.CONTINUE_SIGN_IN_WITH_MFA_SELECTION,
					allowedMFATypes: mfaTypes,
				},
			};
		case 'SMS_MFA':
			return {
				isSignedIn: false,
				nextStep: {
					signInStep: AuthSignInStep.CONFIRM_SIGN_IN_WITH_SMS_CODE,
					codeDeliveryDetails: {
						deliveryMedium:
							challengeParameters.CODE_DELIVERY_DELIVERY_MEDIUM as DeliveryMedium,
						destination: challengeParameters.CODE_DELIVERY_DESTINATION,
					},
					additionalInfo: challengeParameters as AdditionalInfo,
				},
			};
		case 'SOFTWARE_TOKEN_MFA':
			return {
				isSignedIn: false,
				nextStep: {
					signInStep: AuthSignInStep.CONFIRM_SIGN_IN_WITH_TOTP_CODE,
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
	}

	throw new AuthError({
		name: 'UnsupportedChallengeName',
		message: `challengeName is not supported. 
			 This probably happened due to the underlying service returning a challengeName that is not supported by Amplify.`,
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
	if (!attributes) return [];
	const parsedAttributes = (JSON.parse(attributes) as Array<string>).map(att =>
		att.includes(USER_ATTRIBUTES) ? att.replace(USER_ATTRIBUTES, '') : att
	);

	return parsedAttributes;
}

export function createAttributes(
	attributes?: AuthUserAttribute
): Record<string, string> {
	if (!attributes) return {};

	const newAttributes = {};

	Object.entries(attributes).forEach(([key, value]) => {
		newAttributes[`${USER_ATTRIBUTES}${key}`] = value;
	});
	return newAttributes;
}
