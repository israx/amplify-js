// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthSignInResult, SignInRequest } from '../../../types';
import { CognitoSignInOptions } from '../types/options/CognitoSignInOptions';
import { signInWithCustomAuth } from './signInWithCustomAuth';
import { signInWithCustomSRPAuth } from './signInWithCustomSRPAuth';
import { signInWithSRP } from './signInWithSRP';
import { signInWithUserPassword } from './signInWithUserPassword';

export async function signIn(
	signInRequest: SignInRequest<CognitoSignInOptions>
): Promise<AuthSignInResult> {
	const authFlowType = signInRequest.options?.serviceOptions?.authFlowType;

	switch (authFlowType) {
		case 'USER_SRP_AUTH':
			return signInWithSRP(signInRequest);
		case 'USER_PASSWORD_AUTH':
			return signInWithUserPassword(signInRequest);
		case 'CUSTOM_WITHOUT_SRP':
			return signInWithCustomAuth(signInRequest);
		case 'CUSTOM_WITH_SRP':
			return signInWithCustomSRPAuth(signInRequest);
		default:
			return signInWithSRP(signInRequest);
	}
}
