// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AdditionalInfo } from './AdditionalInfo';
import { AuthCodeDeliveryDetails } from './AuthCodeDeliveryDetails';
import { AuthSignInStep } from './AuthSignInStep';
import { AuthUserAttributeKey } from './AuthUserAttributeKey';

export type AuthNextSignInStep<UserAttributeKey extends AuthUserAttributeKey> =
  {
    signInStep: AuthSignInStep;
    codeDeliveryDetails?: AuthCodeDeliveryDetails;
    additionalInfo?: AdditionalInfo;
    confirmationCode?: string;
    missingAttributes?: UserAttributeKey[];
  };
  