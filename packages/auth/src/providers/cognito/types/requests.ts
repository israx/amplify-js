// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MFAPreference } from './models';

export type UpdateMFAPreferenceRequest = {
	sms?: MFAPreference;
	totp?: MFAPreference;
};
