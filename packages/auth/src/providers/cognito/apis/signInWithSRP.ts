// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthValidationErrorCode } from '../../../errors/types/validation';
import { assertValidationError } from '../../../errors/utils/assertValidationError';
import { assertServiceError } from '../../../errors/utils/assertServiceError';
import {
	ChallengeName,
	ChallengeParameters,
} from '../utils/clients/types/models';
import {
	InitiateAuthException,
	RespondToAuthChallengeException,
} from '../types/errors';
import { Amplify } from '@aws-amplify/core';
import {
	getSignInResult,
	getSignInResultFromError,
	handleUserSRPAuthFlow,
} from '../utils/signInHelpers';
import { signInStore } from '../utils/signInStore';
import { CognitoSignInOptions } from '../types';
import {
	SignInRequest,
	AuthSignInResult,
	AuthSignInStep,
} from '../../../types';

/**
 * Signs a user in
 *
 * @param signInRequest - The SignInRequest object
 * @returns AuthSignInResult
 * @throws service: {@link InitiateAuthException }, {@link RespondToAuthChallengeException } - Cognito service errors
 * thrown during the sign-in process.
 * @throws validation: {@link AuthValidationErrorCode  } - Validation errors thrown when either username or password
 *  are not defined.
 *
 * TODO: add config errors
 */
export async function signInWithSRP(
	signInRequest: SignInRequest<CognitoSignInOptions>
): Promise<AuthSignInResult> {
	const { username, password } = signInRequest;
	const config = Amplify.config;
	const clientMetaData =
		signInRequest.options?.serviceOptions?.clientMetadata ||
		config.clientMetadata;
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
		} = await handleUserSRPAuthFlow(username, password, clientMetaData);

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
			value: ChallengeName as ChallengeName,
		});
		if (AuthenticationResult) {
			// TODO(israx): cache tokens
			signInStore.dispatch({ type: 'SET_INITIAL_STATE' });
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
