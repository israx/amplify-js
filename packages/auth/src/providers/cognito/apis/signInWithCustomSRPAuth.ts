// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Amplify } from '@aws-amplify/core';
import { AuthValidationErrorCode } from '../../../errors/types/validation';
import { assertValidationError } from '../../../errors/utils/assertValidationError';
import { assertServiceError } from '../../../errors/utils/assertServiceError';
import {
	ChallengeName,
	ChallengeParameters,
} from '../utils/clients/types/models';
import {
	handleCustomSRPAuthFlow,
	getSignInResult,
	getSignInResultFromError,
} from '../utils/signInHelpers';
import { signInStore } from '../utils/signInStore';
import {
	InitiateAuthException,
	RespondToAuthChallengeException,
} from '../types/errors';
import {
	SignInRequest,
	AuthSignInResult,
	AuthSignInStep,
} from '../../../types';
import { CognitoSignInOptions } from '../types';

/**
 * Signs a user in using a custom authentication flow with SRP
 *
 * @param signInRequest - The SignInRequest object
 * @returns AuthSignInResult
 * @throws service: {@link InitiateAuthException }, {@link RespondToAuthChallengeException } - Cognito
 * service errors thrown during the sign-in process.
 * @throws validation: {@link AuthValidationErrorCode  } - Validation errors thrown when either username or password
 *  are not defined.
 *
 * TODO: add config errors
 */
export async function signInWithCustomSRPAuth(
	signInRequest: SignInRequest<CognitoSignInOptions>
): Promise<AuthSignInResult> {
	const { username, password, options } = signInRequest;
	const metadata =
		options?.serviceOptions?.clientMetadata || Amplify.config.clientMetadata;
	assertValidationError(
		!!username,
		AuthValidationErrorCode.EmptySignInUsername
	);
	assertValidationError(
		!!password,
		AuthValidationErrorCode.EmptySignInPassword
	);

	try {
		const {
			ChallengeName,
			ChallengeParameters,
			AuthenticationResult,
			Session,
		} = await handleCustomSRPAuthFlow(username, password, metadata);

		signInStore.dispatch({
			type: 'SET_ACTIVE_SIGN_IN_SESSION',
			value: Session,
		});
		signInStore.dispatch({
			type: 'SET_USERNAME',
			value: username,
		});
		signInStore.dispatch({
			type: 'SET_CHALLENGE_NAME',
			value: ChallengeName,
		});

		if (AuthenticationResult) {
			// TODO(israx): cache tokens
			return {
				isSignedIn: true,
				nextStep: { signInStep: AuthSignInStep.DONE },
			};
		}

		// TODO(israx): set AmplifyUserSession via singleton
		return getSignInResult({
			challengeName: ChallengeName as ChallengeName,
			challengeParameters: ChallengeParameters as ChallengeParameters,
		});
	} catch (error) {
		signInStore.dispatch({ type: 'SET_INITIAL_STATE' });
		assertServiceError(error);
		const result = getSignInResultFromError(error.name);
		if (result) return result;
		throw error;
	}
}
