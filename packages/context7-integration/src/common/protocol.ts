/**
 * RPC path for Context7 service
 * 
 * Note: Changed to '/services/context7' to match the new specification
 * The old path '/services/context7-service' is kept for backward compatibility
 * in the Context7ServicePath constant, but new code should use Context7ServicePath 
 * from context7-protocol.ts
 */
export const Context7ServicePath = '/services/context7';

/**
 * Frontend client interface for Context7 service
 * 
 * @deprecated Use Context7Client from context7-protocol.ts instead
 */
export interface Context7ServiceClient {
    /**
     * Notify the client of an error
     */
    onError: (error: any) => void;
}