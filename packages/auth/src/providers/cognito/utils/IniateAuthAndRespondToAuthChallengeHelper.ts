import { Amplify } from '@aws-amplify/core';
import {
	InitiateAuthCommandOutput,
	RespondToAuthChallengeCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
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

export async function handleUserSRPAuthFlow(
	username: string,
	clientMetadata: ClientMetadata | undefined
): Promise<RespondToAuthChallengeCommandOutput> {
	const config = Amplify.config;
	const userPoolId = config.Auth.userPoolId;
	const userPoolName = userPoolId.split('_')[1];
	const authenticationHelper = new AuthenticationHelper(userPoolName);
	const clientMeta = clientMetadata ?? config.clientMetadata;

	const jsonReq = {
		AuthFlow: 'USER_SRP_AUTH',
		AuthParameters: {
			USERNAME: username,
			SRP_A: ((await getLargeAValue(authenticationHelper)) as any).toString(16),
			ClientMetadata: clientMeta,
		},
	};

	return await initiateAuthClient(jsonReq);
}

export async function handleCustomSRPAuthFlow(
	username: string,
	clientMetadata: ClientMetadata | undefined
) {
	const config = Amplify.config;
	const userPoolId = config.Auth.userPoolId;
	const userPoolName = userPoolId.split('_')[1];
	const authenticationHelper = new AuthenticationHelper(userPoolName);
	const clientMeta = clientMetadata ?? config.clientMetadata;
	const jsonReq = {
		AuthFlow: 'CUSTOM_AUTH',
		AuthParameters: {
			USERNAME: username,
			SRP_A: ((await getLargeAValue(authenticationHelper)) as any).toString(16),
			CHALLENGE_NAME: 'SRP_A',
			ClientMetadata: clientMeta,
		},
	};

	return await initiateAuthClient(jsonReq);
}

export async function handleCustomAuthFlowWithoutSRP(
	username: string,
	clientMetadata: ClientMetadata | undefined
) {
	const config = Amplify.config;
	const clientMeta = clientMetadata ?? config.clientMetadata;
	const jsonReq = {
		AuthFlow: 'CUSTOM_AUTH',
		AuthParameters: {
			USERNAME: username,
			ClientMetadata: clientMeta,
		},
	};

	return await initiateAuthClient(jsonReq);
}

export async function handleUserPasswordAuthFlow(
	username: string,
	password: string,
	clientMetadata: ClientMetadata | undefined
): Promise<InitiateAuthCommandOutput> {
	const config = Amplify.config;
	const clientMeta = clientMetadata ?? config.clientMetadata;
	const jsonReq = {
		AuthFlow: 'USER_PASSWORD_AUTH',
		AuthParameters: {
			USERNAME: username,
			PASSWORD: password,
		},
		ClientMetadata: clientMeta,
	};

	return await initiateAuthClient(jsonReq);
}

export async function handlePasswordVerifierChallenge(
	password: string,
	challengeParameters: ChallengeParameters,
	clientMetadata: ClientMetadata | undefined
): Promise<RespondToAuthChallengeCommandOutput> {
	const config = Amplify.config;
	const userPoolId = config.Auth.userPoolId;
	const userPoolName = userPoolId.split('_')[1];
	const authenticationHelper = new AuthenticationHelper(userPoolName);

	const serverBValue = new BigInteger(challengeParameters?.SRP_B, 16);
	const salt = new BigInteger(challengeParameters?.SALT, 16);
	const username = challengeParameters?.USER_ID_FOR_SRP;
	const hkdf = (await getPasswordAuthenticationKey({
		authenticationHelper,
		username,
		password,
		serverBValue,
		salt,
	})) as any;

	const dateNow = getNowString();

	const challengeResponses = {
		USERNAME: username,
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

	const clientMeta = clientMetadata ?? config.clientMetadata;

	const jsonReqResponseChallenge: RespondToAuthChallengeClientInput = {
		ChallengeName: 'PASSWORD_VERIFIER',
		ChallengeResponses: challengeResponses,
		ClientMetadata: clientMeta,
	};

	return await respondToAuthChallengeClient(jsonReqResponseChallenge);
}
