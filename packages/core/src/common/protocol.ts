/*
 * Copyright (c) 2023 CodeVibeAI Team and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 */

import { JsonRpcServer } from '@theia/core/lib/common/messaging';

/**
 * Path for connecting to AI service
 */
export const AIServicePath = '/services/codevibeai-ai';

/**
 * Protocol for AI service client
 */
export interface AIServiceClient extends JsonRpcServer<AIServiceServer> {
    // Client methods called by the server
}

/**
 * Protocol for AI service server
 */
export interface AIServiceServer {
    // Server methods called by the client
    
    /**
     * Check if the service is ready.
     * @returns True if ready, false otherwise
     */
    isReady(): Promise<boolean>;
}