import { AuthValidationErrorCode } from '../../../errors/types/validation';
import { assertServiceError } from '../../../errors/utils/assertServiceError';
import { assertValidationError } from '../../../errors/utils/assertValidationError';
import { AuthSignInStep, SignInRequest } from '../../../types';
import { CognitoSignInOptions } from '../types/options/CognitoSignInOptions';
import { getSignInResult, getSignInResultFromError } from '../utils/AuthUtils';
import { handleUserPasswordAuthFlow } from '../utils/IniateAuthAndRespondToAuthChallengeHelper';
import {
	ChallengeName,
	ChallengeParameters,
} from '../utils/clients/types/models';

export async function signInWithUserPassword(
	signInRequest: SignInRequest<CognitoSignInOptions>
) {
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
		const response = await handleUserPasswordAuthFlow(username, password);
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
		return getSignInResult({
			challengeName: ChallengeName as ChallengeName,
			challengeParameters: ChallengeParameters as ChallengeParameters,
		});
	} catch (error) {
		assertServiceError(error);
		const result = getSignInResultFromError(error.name);
		if (result) return result;
		throw error;
	}

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
