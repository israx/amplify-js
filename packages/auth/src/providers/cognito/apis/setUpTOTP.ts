// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Amplify, fetchAuthSession } from '@aws-amplify/core';
import {
	AuthAction,
	assertTokenProviderConfig,
} from '@aws-amplify/core/internals/utils';

import { AuthError } from '../../../errors/AuthError';
import {
	AssociateSoftwareTokenException,
	SETUP_TOTP_EXCEPTION,
} from '../types/errors';
import { SetUpTOTPOutput } from '../types';
import { getTOTPSetupDetails } from '../utils/signInHelpers';
import { getRegionFromUserPoolId } from '../../../foundation/parsers';
import { assertAuthTokens } from '../utils/types';
import { getAuthUserAgentValue } from '../../../utils';
import { createAssociateSoftwareTokenClient } from '../../../foundation/factories/serviceClients/cognitoIdentityProvider';
import { createCognitoUserPoolEndpointResolver } from '../factories';

/**
 * Sets up TOTP for the user.
 *
 * @returns SetUpTOTPOutput
 * @throws -{@link AssociateSoftwareTokenException}
 * Thrown if a service occurs while setting up TOTP.
 * @throws AuthTokenConfigException - Thrown when the token provider config is invalid.
 **/
export async function setUpTOTP(): Promise<SetUpTOTPOutput> {
	const authConfig = Amplify.getConfig().Auth?.Cognito;
	assertTokenProviderConfig(authConfig);
	const { userPoolEndpoint, userPoolId } = authConfig;
	const { tokens } = await fetchAuthSession({ forceRefresh: false });
	assertAuthTokens(tokens);
	const username = tokens.idToken?.payload['cognito:username'] ?? '';
	const associateSoftwareToken = createAssociateSoftwareTokenClient({
		endpointResolver: createCognitoUserPoolEndpointResolver({
			endpointOverride: userPoolEndpoint,
		}),
	});
	const { SecretCode } = await associateSoftwareToken(
		{
			region: getRegionFromUserPoolId(userPoolId),
			userAgentValue: getAuthUserAgentValue(AuthAction.SetUpTOTP),
		},
		{
			AccessToken: tokens.accessToken.toString(),
		},
	);

	if (!SecretCode) {
		// This should never happen.
		throw new AuthError({
			name: SETUP_TOTP_EXCEPTION,
			message: 'Failed to set up TOTP.',
		});
	}

	return getTOTPSetupDetails(SecretCode, JSON.stringify(username));
}
