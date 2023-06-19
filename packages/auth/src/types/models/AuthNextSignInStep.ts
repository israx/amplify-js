// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthSignInStep } from '../enums/AuthSignInStep';
import { AdditionalInfo } from './AdditionalInfo';
import { AuthCodeDeliveryDetails } from './AuthCodeDeliveryDetails';
import { AuthUserAttributeKey } from './AuthUserAttributeKey';



type ContinueSignInWithTOTPSetup = {
	signInStep: AuthSignInStep.CONTINUE_SIGN_IN_WITH_TOTP_SETUP;
	totpSetupDetails: TOTPSetupDetails;
};
type ConfirmSignInWithTOTPCode = {
	signInStep: AuthSignInStep.CONFIRM_SIGN_IN_WITH_TOTP_CODE;
};
type ContinueSignInWithMFASelection = {
	signInStep: AuthSignInStep.CONTINUE_SIGN_IN_WITH_MFA_SELECTION;
	allowedMFATypes: AllowedMFATypes;
};

type ConfirmSignInWithCustomChallenge = {
	signInStep: AuthSignInStep.CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE;
	additionalInfo?: AdditionalInfo;
};

type ConfirmSignInWithNewPasswordRequired<
	UserAttributeKey extends AuthUserAttributeKey
> = {
	signInStep: AuthSignInStep.CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED;
	additionalInfo?: AdditionalInfo;
	missingAttributes?: UserAttributeKey[];
};

type ConfirmSignInWithSMSCode = {
	signInStep: AuthSignInStep.CONFIRM_SIGN_IN_WITH_SMS_CODE;
	additionalInfo?: AdditionalInfo;
	codeDeliveryDetails?: AuthCodeDeliveryDetails;
};

type ConfirmSignUpStep = {
	signInStep: AuthSignInStep.CONFIRM_SIGN_UP;
};

type ResetPasswordStep = {
	signInStep: AuthSignInStep.RESET_PASSWORD;
};

type DoneStep = {
	signInStep: AuthSignInStep.DONE;
};

export type AuthNextSignInStep<UserAttributeKey extends AuthUserAttributeKey> =
	| ConfirmSignInWithCustomChallenge
	| ContinueSignInWithMFASelection
	| ConfirmSignInWithNewPasswordRequired<UserAttributeKey>
	| ConfirmSignInWithSMSCode
	| ConfirmSignInWithTOTPCode
	| ContinueSignInWithTOTPSetup
	| ConfirmSignUpStep
	| ResetPasswordStep
	| DoneStep;
