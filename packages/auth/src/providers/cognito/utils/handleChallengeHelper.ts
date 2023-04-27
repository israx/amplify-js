import Amplify from '@aws-amplify/core';
import { RespondToAuthChallengeCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { ClientMetadata } from 'amazon-cognito-identity-js';
import {
	getLargeAValue,
	getNowString,
	getPasswordAuthenticationKey,
	getSignatureString,
} from './AuthUtils';
import AuthenticationHelper from './AuthenticationHelper';
import BigInteger from './BigInteger';
import { initiateAuthClient } from './clients/InitiateAuthClient';
import { respondToAuthChallengeClient } from './clients/RespondToAuthClient';
import { RespondToAuthChallengeClientInput } from './clients/types/inputs';
import { ChallengeParameters } from './clients/types/models';

export async function handleUserSRPAuthChallenge(
	username: string
): Promise<RespondToAuthChallengeCommandOutput> {
	const config = Amplify.config;
	const userPoolId = config.Auth.userPoolId;
	const userPoolName = userPoolId.split('_')[1];
	const authenticationHelper = new AuthenticationHelper(userPoolName);

	const jsonReq = {
		AuthFlow: 'USER_SRP_AUTH',
		AuthParameters: {
			USERNAME: username,
			SRP_A: ((await getLargeAValue(authenticationHelper)) as any).toString(16),
		},
	};

	return await initiateAuthClient(jsonReq);
}
export async function handlePasswordVerifierChallenge(
	username: string,
	password: string,
	challengeParameters: ChallengeParameters,
	clientMetada: ClientMetadata | undefined
): Promise<RespondToAuthChallengeCommandOutput> {
	const config = Amplify.config;
	const userPoolId = config.Auth.userPoolId;
	const userPoolName = userPoolId.split('_')[1];
	const authenticationHelper = new AuthenticationHelper(userPoolName);

	const serverBValue = new BigInteger(challengeParameters?.SRP_B, 16);
	const salt = new BigInteger(challengeParameters?.SALT, 16);

	const hkdf = (await getPasswordAuthenticationKey({
		authenticationHelper,
		username,
		password,
		serverBValue,
		salt,
	})) as any;

	const dateNow = getNowString();

	const challengeResponses = {
		USERNAME: challengeParameters?.USER_ID_FOR_SRP,
		PASSWORD_CLAIM_SECRET_BLOCK: challengeParameters?.SECRET_BLOCK,
		TIMESTAMP: dateNow,
		PASSWORD_CLAIM_SIGNATURE: getSignatureString({
			username: challengeParameters?.USER_ID_FOR_SRP,
			userPoolName,
			challengeParameters,
			dateNow,
			hkdf,
		}),
	} as { [key: string]: string };

	const clientMet = clientMetada ?? config.clientMetadata;

	const jsonReqResponseChallenge: RespondToAuthChallengeClientInput = {
		ChallengeName: 'PASSWORD_VERIFIER',
		ChallengeResponses: challengeResponses,
		ClientMetadata: clientMet,
	};

	return await respondToAuthChallengeClient(jsonReqResponseChallenge);
}
