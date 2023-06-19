// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthServiceOptions } from '../options/AuthServiceOptions';

export type ConfirmSignInRequest<
  ServiceOptions extends AuthServiceOptions = AuthServiceOptions
> = {
  challengeResponse: string;
  options?: { serviceOptions?: ServiceOptions };
};