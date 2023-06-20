// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
	VerifySoftwareTokenException,
	RespondToAuthChallengeException,
	AssociateSoftwareTokenException,
} from '../types/errors';
import { AuthSignInResult, ConfirmSignInRequest } from '../../../types';
import { CognitoConfirmSignInOptions } from '../types';

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
	return {} as AuthSignInResult;
}
