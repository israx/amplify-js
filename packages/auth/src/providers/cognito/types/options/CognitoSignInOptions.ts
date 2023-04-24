// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthFlowType } from '../models/AuthFlowType';
import { ClientMetadata } from '../models/ClientMetadata';

export type CognitoSignInOptions = {
	authFlowType: AuthFlowType;
	clientMetaData?: ClientMetadata;
  };
  