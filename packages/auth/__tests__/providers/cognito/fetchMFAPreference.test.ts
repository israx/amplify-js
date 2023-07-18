// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { GetUserCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import * as getUserClient from '../../../src/providers/cognito/utils/clients/GetUserClient';
import { AuthError } from '../../../src/errors/AuthError';
import { AmplifyErrorString } from '@aws-amplify/core';
import { fetchMFAPreference } from '../../../src/providers/cognito/apis/fetchMFAPreference';
import { GetUserException } from '../../../src/providers/cognito/types/errors';

describe('fetchMFAPreference Happy Path Cases:', () => {
	const mockedAccessToken = 'mockedAccessToken';
	let getUserClientSpy;

	beforeEach(() => {
		getUserClientSpy = jest
			.spyOn(getUserClient, 'getUserClient')
			.mockImplementationOnce(async (): Promise<GetUserCommandOutput> => {
				return {
					UserAttributes: [],
					Username: 'XXXXXXXX',
					PreferredMfaSetting: 'SMS_MFA',
					UserMFASettingList: ['SMS_MFA', 'SOFTWARE_TOKEN_MFA'],
					$metadata: {},
				};
			});
	});
	afterEach(() => {
		getUserClientSpy.mockClear();
	});

	test('fetchMFAPreference should return the preferred MFA setting', async () => {
		const resp = await fetchMFAPreference();
		expect(resp).toEqual({ preferred: 'SMS', enabled: ['SMS', 'TOTP'] });
		expect(getUserClientSpy).toHaveBeenCalledTimes(1);
		expect(getUserClientSpy).toHaveBeenCalledWith({
			AccessToken: mockedAccessToken,
		});
	});
});

describe('fetchMFAPreference Error Path Cases:', () => {
	const globalMock = global as any;

	test('fetchMFAPreference should expect a service error', async () => {
		expect.assertions(2);
		const serviceError = new Error('service error');
		serviceError.name = GetUserException.InvalidParameterException;
		globalMock.fetch = jest.fn(() => Promise.reject(serviceError));
		try {
			await fetchMFAPreference();
		} catch (error) {
			expect(error).toBeInstanceOf(AuthError);
			expect(error.name).toBe(GetUserException.InvalidParameterException);
		}
	});

	test('fetchMFAPreference should expect an unknown error'+
    'when underlying error is not coming from the service', async () => {
		expect.assertions(3);
		globalMock.fetch = jest.fn(() =>
			Promise.reject(new Error('unknown error'))
		);
		try {
			await fetchMFAPreference();
		} catch (error) {
			expect(error).toBeInstanceOf(AuthError);
			expect(error.name).toBe(AmplifyErrorString.UNKNOWN);
			expect(error.underlyingError).toBeInstanceOf(Error);
		}
	});
});