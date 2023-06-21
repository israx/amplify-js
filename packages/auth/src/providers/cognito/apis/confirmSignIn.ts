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
import { assertValidationError } from '../../../errors/utils/assertValidationError';
import { AuthValidationErrorCode } from '../../../errors/types/validation';
import { AuthErrorCodes } from '../../../common/AuthErrorStrings';

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

	assertValidationError(
		!!challengeResponse,
		AuthValidationErrorCode.EmptyChallengeResponse
	);

	if (!username || !activeChallengeName || !activeSignInSession)
		throw new AuthError({
			name: AuthErrorCodes.SignInException,
			message: `An error ocurred during the sign in process. 
			This most likely ocurred due to:
				1. signIn was not called before confirmSignIn.
				2. calling signIn throw an exception.
				3. page was refreshed during the sign in flow.`,
			recoverySuggestion: `Make sure a successful call to signIn is made before calling confirmSignIn 
			 and that the page is not refreshed until the sign in process is done.`,
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
