// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Denotes the next step in the Reset Password process.
 */
export enum AuthResetPasswordStep {
	CONFIRM_RESET_PASSWORD_WITH_CODE = 'CONFIRM_RESET_PASSWORD_WITH_CODE',
	DONE = 'DONE',
}

/**
 * Denotes the next step in the Sign In process.
 */
export enum AuthSignInStep {
	CONFIRM_SIGN_IN_WITH_SMS_CODE = 'CONFIRM_SIGN_IN_WITH_SMS_CODE',

	CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE = 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE',

	CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED = 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',

	CONFIRM_SIGN_IN_WITH_TOTP_CODE = 'CONFIRM_SIGN_IN_WITH_TOTP_CODE',

	CONTINUE_SIGN_IN_WITH_TOTP_SETUP = 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP',

	CONTINUE_SIGN_IN_WITH_MFA_SELECTION = 'CONTINUE_SIGN_IN_WITH_MFA_SELECTION',

	CONFIRM_SIGN_UP = 'CONFIRM_SIGN_UP',

	RESET_PASSWORD = 'RESET_PASSWORD',

	DONE = 'DONE',
}

/**
 * Denotes the next step in the Sign Up process.
 */
export enum AuthSignUpStep {
	CONFIRM_SIGN_UP = 'CONFIRM_SIGN_UP',
	DONE = 'DONE',
}
