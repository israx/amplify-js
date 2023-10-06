// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Amplify } from '@aws-amplify/core';
import {
	assertTokenProviderConfig,
	AuthAction,
} from '@aws-amplify/core/internals/utils';
import { ConfirmSignUpInput, ConfirmSignUpOutput } from '../types';
import { assertValidationError } from '../../../errors/utils/assertValidationError';
import { AuthValidationErrorCode } from '../../../errors/types/validation';
import { ConfirmSignUpException } from '../types/errors';
import { confirmSignUp as confirmSignUpClient } from '../utils/clients/CognitoIdentityProvider';
import { getRegion } from '../utils/clients/CognitoIdentityProvider/utils';
import { AutoSignInEventData } from '../types/models';
import {
	HubInternal,
	autoSignInWhenUserIsConfirmedWithCode,
	isAutoSignInStarted,
	setAutoSignInStarted,
} from '../utils/signUpHelpers';
import { setAutoSignIn } from './autoSignIn';
import { getAuthUserAgentValue } from '../../../utils';

/**
 * Confirms a new user account.
 *
 * @param input -  The ConfirmSignUpInput object.
 * @returns ConfirmSignUpOutput
 * @throws -{@link ConfirmSignUpException }
 * Thrown due to an invalid confirmation code.
 * @throws -{@link AuthValidationErrorCode }
 * Thrown due to an empty confirmation code
 * @throws AuthTokenConfigException - Thrown when the token provider config is invalid.
 */
export async function confirmSignUp(
	input: ConfirmSignUpInput
): Promise<ConfirmSignUpOutput> {
	const { username, confirmationCode, options } = input;

	const authConfig = Amplify.getConfig().Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const clientMetadata = options?.serviceOptions?.clientMetadata;
	assertValidationError(
		!!username,
		AuthValidationErrorCode.EmptyConfirmSignUpUsername
	);
	assertValidationError(
		!!confirmationCode,
		AuthValidationErrorCode.EmptyConfirmSignUpCode
	);

	await confirmSignUpClient(
		{
			region: getRegion(authConfig.userPoolId),
			userAgentValue: getAuthUserAgentValue(AuthAction.ConfirmSignUp),
		},
		{
			Username: username,
			ConfirmationCode: confirmationCode,
			ClientMetadata: clientMetadata,
			ForceAliasCreation: options?.serviceOptions?.forceAliasCreation,
			ClientId: authConfig.userPoolClientId,
			// TODO: handle UserContextData
		}
	);

	return new Promise((resolve, reject) => {
		try {
			const signUpOut: ConfirmSignUpOutput = {
				isSignUpComplete: true,
				nextStep: {
					signUpStep: 'DONE',
				},
			};

			if (!isAutoSignInStarted()) return resolve(signUpOut);

			const stopListener = HubInternal.listen<AutoSignInEventData>(
				'auth-internal',
				({ payload }) => {
					switch (payload.event) {
						case 'autoSignIn':
							setAutoSignIn(
								autoSignInWhenUserIsConfirmedWithCode(
									payload.data.output,
									payload.data.error
								)
							);
							resolve({
								isSignUpComplete: true,
								nextStep: {
									signUpStep: 'COMPLETE_AUTO_SIGN_IN',
								},
							});
							setAutoSignInStarted(false);
							stopListener();
					}
				}
			);

			HubInternal.dispatch('auth-internal', {
				event: 'confirmSignUp',
				data: signUpOut,
			});
		} catch (error) {
			reject(error);
		}
	});
}
