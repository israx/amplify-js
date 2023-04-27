// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Amplify } from '@aws-amplify/core';
import { AuthValidationErrorCode } from '../../../errors/types/validation';
import { assertValidationError } from '../../../errors/utils/assertValidationError';
import {
	SignInRequest,
	AuthSignInResult,
	AuthSignInStep,
} from '../../../types';
import { getNextSignInStep } from '../utils/AuthUtils';
import { assertServiceError } from '../../../errors/utils/assertServiceError';
import { CognitoSignInOptions } from '../types/options/CognitoSignInOptions';
import { InitiateAuthException } from '../types/errors/service';
import {
	ChallengeName,
	ChallengeParameters,
} from '../utils/clients/types/models';
import {
	handlePasswordVerifierChallenge,
	handleUserSRPAuthFlow,
} from '../utils/IniateAuthAndRespondToAuthChallengeHelper';

export async function signInWithSRP(
	signInRequest: SignInRequest<CognitoSignInOptions>
): Promise<AuthSignInResult> {
	const { username, password } = signInRequest;

	assertValidationError(
		!!username,
		AuthValidationErrorCode.EmptySignInUsername
	);
	assertValidationError(
		!!password,
		AuthValidationErrorCode.EmptySignInPassword
	);

	try {
		const { ChallengeParameters: challengeParameters } =
			await handleUserSRPAuthFlow(username);

		const response = await handlePasswordVerifierChallenge(
			username,
			password,
			challengeParameters as ChallengeParameters,
			signInRequest.options?.serviceOptions?.clientMetaData
		);

		const {
			ChallengeName,
			ChallengeParameters,
			AuthenticationResult,
			Session,
		} = response;

		// TODO: store Session in the singleton
		if (AuthenticationResult) {
			// TODO: cache tokens
			return {
				isSignedIn: true,
				nextStep: { signInStep: AuthSignInStep.DONE },
			};
		}
		return getNextSignInStep({
			challengeName: ChallengeName as ChallengeName,
			challengeParameters: ChallengeParameters as ChallengeParameters,
		});
	} catch (error) {
		assertServiceError(error);
		if (error.name === InitiateAuthException.PasswordResetRequiredException) {
			return {
				isSignedIn: false,
				nextStep: { signInStep: AuthSignInStep.RESET_PASSWORD },
			};
		} else if (error.name === InitiateAuthException.UserNotConfirmedException) {
			return {
				isSignedIn: false,
				nextStep: { signInStep: AuthSignInStep.CONFIRM_SIGN_UP },
			};
		}
		throw error;
	}

	// if (ChallengeName) {
	// 	Amplify.setContext('Auth', {
	// 		confirmSignIn: { Session, username, challengeName: ChallengeName },
	// 	});

	// 	return {
	// 		...ChallengeParameters,
	// 		challenge: ChallengeName,
	// 	};
	// }

	// cacheTokens({
	// 	idToken: AuthenticationResult.IdToken,
	// 	accessToken: AuthenticationResult.AccessToken,
	// 	clockDrift: 0,
	// 	refreshToken: AuthenticationResult.RefreshToken,
	// 	username: 'username',
	// 	userPoolClientID: clientId,
	// });

	// Amplify.setUser({
	// 	idToken: AuthenticationResult.IdToken,
	// 	accessToken: AuthenticationResult.AccessToken,
	// 	isSignedIn: true,
	// 	refreshToken: AuthenticationResult.RefreshToken,
	// });

	// return {
	// 	accessToken: AuthenticationResult.AccessToken,
	// 	idToken: AuthenticationResult.IdToken,
	// 	refreshToken: AuthenticationResult.RefreshToken,
	// };
}
