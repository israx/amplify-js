// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/*
This file maps exports from `aws-amplify/auth`. It provides access to the default Auth provider and category utils.
*/
export {
	signIn,
	signUp,
	confirmSignUp,
	confirmSignIn,
	fetchAuthSession,
	setUpTOTP,
	verifyTOTPSetup,
	fetchMFAPreference,
	resendSignUpCode,
	resetPassword,
	confirmResetPassword,
	AuthSignInStep,
	AuthSignUpStep
} from '@aws-amplify/auth';
