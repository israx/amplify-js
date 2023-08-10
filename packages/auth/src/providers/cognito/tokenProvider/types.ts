import {
	AuthConfig,
	AuthTokens,
	FetchAuthSessionOptions,
	KeyValueStorageInterface,
	TokenProvider,
} from '@aws-amplify/core';

export type TokenRefresher = ({
	tokens,
	authConfig,
}: {
	tokens: CognitoAuthTokens;
	authConfig?: AuthConfig;
}) => Promise<CognitoAuthTokens>;

export type AuthKeys<AuthKey extends string> = {
	[Key in AuthKey]: string;
};

export const AuthTokenStorageKeys = {
	accessToken: 'accessToken',
	idToken: 'idToken',
	oidcProvider: 'oidcProvider',
	clockDrift: 'clockDrift',
	refreshToken: 'refreshToken',
	NewDeviceMetadata: 'NewDeviceMetadata',
};

export interface AuthTokenStore {
	loadTokens(): Promise<CognitoAuthTokens | null>;
	storeTokens(tokens: CognitoAuthTokens): Promise<void>;
	clearTokens(): Promise<void>;
	setKeyValueStorage(keyValueStorage: KeyValueStorageInterface): void;
}

export interface AuthTokenOrchestrator {
	setTokenRefresher(tokenRefresher: TokenRefresher): void;
	setAuthTokenStore(tokenStore: AuthTokenStore): void;
	getTokens: (options?: FetchAuthSessionOptions) => Promise<AuthTokens | null>;
	setTokens: ({ tokens }: { tokens: CognitoAuthTokens }) => Promise<void>;
	clearTokens: () => Promise<void>;
}

export interface CognitoUserPoolTokenProviderType extends TokenProvider {
	setKeyValueStorage: (keyValueStorage: KeyValueStorageInterface) => void;
}

export type CognitoAuthTokens = AuthTokens & {
	refreshToken?: string;
	NewDeviceMetadata?: string;
	clockDrift: number;
};