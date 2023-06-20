// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
	VerifySoftwareTokenException,
	RespondToAuthChallengeException,
	AssociateSoftwareTokenException,
} from '../types/errors';
import {
	AuthSignInResult,
	AuthSignInStep,
	ConfirmSignInRequest,
} from '../../../types';
import { CognitoConfirmSignInOptions } from '../types';
import {
	ChallengeName,
	ChallengeParameters,
} from '../utils/clients/types/models';
import { signInStore } from '../utils/signInStore';
import { AuthError } from '../../../errors/AuthError';
import {
	getSignInResult,
	getSignInResultFromError,
	handleChallengeName,
} from '../utils/signInHelpers';
import { assertServiceError } from '../../../errors/utils/assertServiceError';

/**
 * Allows to continue or complete the sign in process
 *
 * @param confirmSignInRequest - The ConfirmSignInRequest  object
 * @returns AuthSignInResult
 * @throws service: {@link VerifySoftwareTokenException }, {@link RespondToAuthChallengeException } ,
 * {@link AssociateSoftwareTokenException}
 *  - Cognito service errors thrown during the sign-in process.
 * @throws validation: {@link AuthValidationErrorCode  } - Validation errors thrown when challengeResponse
 *  is not defined.
 *
 * TODO: add config errors
 */
export async function confirmSignIn(
	confirmSignInRequest: ConfirmSignInRequest<CognitoConfirmSignInOptions>
): Promise<AuthSignInResult> {
	const { challengeResponse, options } = confirmSignInRequest;
	const { username, activeChallengeName, activeSignInSession } =
		signInStore.getState();
	
	if (!username || !activeChallengeName || !activeSignInSession)
	// TODO: improve this error message
		throw new AuthError({
			name: 'SignInException',
			message: 'an error ocurred during the sign in process',
		});

	try {
		const {
			Session,
			ChallengeName,
			AuthenticationResult,
			ChallengeParameters,
		} = await handleChallengeName(
			username,
			activeChallengeName as ChallengeName,
			activeSignInSession,
			challengeResponse,
			options?.serviceOptions
		);

		signInStore.dispatch({
			type: 'SET_ACTIVE_SIGN_IN_SESSION',
			value: Session,
		});
		signInStore.dispatch({
			type: 'SET_ACTIVE_CHALLENGE_NAME',
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
