# Wallet Signing Error - "Unexpected error" Fix

## Problem Summary

The error "Unexpected error" occurring in the Phantom wallet extension during `signAndSendTransaction` on line 45 of `use-create-stream-mutation.ts` indicates that the wallet extension is encountering an unexpected condition when attempting to sign a transaction.

### Error Stack Trace

```
at #n (chrome-extension://bfnaelmomeimhlpmgjnjophhpkkoljpa/solana.js:3:416751)
at async r.signAndSendTransaction (chrome-extension://bfnaelmomeimhlpmgjnjophhpkkoljpa/solana.js:3:418964)
at async #g [as signAndSendTransaction] (chrome-extension://bfnaelmomeimhlpmgjnjophhpkkoljpa/solana.js:3:423826)
at async useCreateStreamMutation.useMutation [as mutationFn] (src/features/cascade/data-access/use-create-stream-mutation.ts:45:25)
```

## Root Causes

The "Unexpected error" from the wallet extension typically occurs due to:

1. **Invalid or malformed instruction** - The instruction object passed to `signAndSend` may have properties the wallet doesn't understand
2. **Missing or incomplete signer** - The signer object lacks required properties (address, public key, etc.)
3. **Transaction size** - The instruction may exceed wallet constraints
4. **Wallet extension state** - The extension may be in an inconsistent state or have stale data
5. **Lack of error context** - Without proper logging, it's hard to identify what specifically failed

## Solutions Implemented

### 1. Added Error Handling and Logging to All Mutations ✅

Enhanced error handling in all `signAndSend` mutation files:

- `use-create-stream-mutation.ts`
- `use-top-up-stream-mutation.ts`
- `use-close-stream-mutation.ts`
- `use-withdraw-mutation.ts`
- `use-emergency-withdraw-mutation.ts`
- `use-refresh-activity-mutation.ts`

Each mutation now includes:

- **Pre-flight validation** - Checks instruction is not null/undefined before signing
- **Debug logging** - Logs instruction details for debugging
- **Signature validation** - Verifies signature is returned
- **Detailed error logging** - Captures error name, message, and stack trace

**Example:**

```typescript
mutationFn: async (input: CreateStreamInput) => {
  let signature: string;

  try {
    const instruction = await getCreateStreamInstructionAsync({...});

    if (!instruction) {
      throw new Error('Failed to create stream instruction');
    }

    console.debug('Stream instruction created:', {
      employer: signer.address,
      employee: input.employee,
      // ... other details
    });

    signature = await signAndSend(instruction, signer);

    if (!signature) {
      throw new Error('Transaction signature is empty');
    }
  } catch (signError) {
    console.error('Error during instruction creation or signing:', {
      error: signError,
      message: signError instanceof Error ? signError.message : String(signError),
      stack: signError instanceof Error ? signError.stack : undefined,
    });
    throw signError;
  }
  // ... rest of function
}
```

### 2. Enhanced Error Message Extraction ✅

Improved `getErrorMessage` function in `derive-cascade-pdas.ts`:

```typescript
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    // Handle wallet extension errors
    if ('message' in error) return String(error.message);
    if ('reason' in error) return String(error.reason);
    if ('name' in error && 'message' in error) {
      return `${String(error.name)}: ${String(error.message)}`;
    }
  }
  if (typeof error === 'string') return error;
  // Last resort: stringify the error
  return JSON.stringify(error) || 'Operation failed';
}
```

This now handles:

- Standard Error objects
- Wallet extension error objects with custom properties
- String errors
- Structured error objects with `name` and `message`

## How to Use These Improvements

### 1. Check Browser Console

When the error occurs, open the browser DevTools (F12) and look at the Console tab. You should now see detailed logging:

```
[DEBUG] Stream instruction created: {employer: "...", employee: "...", ...}
[ERROR] Error during instruction creation or signing: {
  error: Error(...),
  message: "...",
  stack: "..."
}
```

### 2. Review the Error Message

The improved error handling will now display more specific error messages in the UI toast, helping users understand what went wrong:

- "Failed to create stream instruction" - Issue during instruction creation
- "Transaction signature is empty" - Wallet didn't return a signature
- "User rejected transaction" - User cancelled in wallet
- Other wallet-specific error messages

### 3. Common Next Steps

Based on the detailed error logs, you can:

**If "Failed to create stream instruction":**

- Verify input parameters are correct
- Check the Anchor program is deployed correctly
- Verify PDA derivation is working

**If "Transaction signature is empty":**

- Check wallet connection is active
- Verify wallet has sufficient SOL for fees
- Restart wallet extension

**If wallet extension error:**

- Check Phantom/wallet version is up to date
- Try refreshing the page
- Check if wallet is in read-only mode

## Files Modified

1. `/src/features/cascade/data-access/use-create-stream-mutation.ts`
   - Added try-catch wrapping
   - Added pre-flight validation
   - Added detailed error logging
   - Fixed variable scoping for `signature`

2. `/src/features/cascade/data-access/use-top-up-stream-mutation.ts`
   - Added try-catch wrapping
   - Added pre-flight validation
   - Added detailed error logging

3. `/src/features/cascade/data-access/use-close-stream-mutation.ts`
   - Added try-catch wrapping
   - Added pre-flight validation
   - Added detailed error logging

4. `/src/features/cascade/data-access/use-withdraw-mutation.ts`
   - Added try-catch wrapping
   - Added pre-flight validation
   - Added detailed error logging

5. `/src/features/cascade/data-access/use-emergency-withdraw-mutation.ts`
   - Added try-catch wrapping
   - Added pre-flight validation
   - Added detailed error logging

6. `/src/features/cascade/data-access/use-refresh-activity-mutation.ts`
   - Added try-catch wrapping
   - Added pre-flight validation
   - Added detailed error logging

7. `/src/features/cascade/data-access/derive-cascade-pdas.ts`
   - Enhanced `getErrorMessage()` function to handle more error types

## Testing Recommendations

### Unit Tests

Create tests for the enhanced error handling:

```typescript
describe('getErrorMessage', () => {
  it('should extract message from Error object', () => {
    const error = new Error('Test message');
    expect(getErrorMessage(error)).toBe('Test message');
  });

  it('should handle wallet extension errors', () => {
    const error = { message: 'User rejected', reason: 'declined' };
    expect(getErrorMessage(error)).toBe('User rejected');
  });

  it('should handle named errors', () => {
    const error = { name: 'WalletError', message: 'Connection failed' };
    expect(getErrorMessage(error)).toBe('WalletError: Connection failed');
  });
});
```

### Integration Tests

1. Create stream with valid inputs - should succeed
2. Cancel transaction in wallet - should show "User rejected" error
3. Disconnect wallet during transaction - should show timeout/disconnection error
4. Create with invalid employee address - should fail with specific error

### Manual Testing

1. Open browser DevTools Console
2. Create a stream
3. Check for console logs showing instruction details
4. If error occurs, verify detailed error information is logged
5. Check UI shows improved error message

## Potential Additional Improvements

For future iterations, consider:

1. **Instruction Validation Library**
   - Create a utility to validate instructions before sending
   - Check instruction size limits
   - Validate account properties

2. **Wallet State Management**
   - Track wallet connection status
   - Handle wallet disconnection gracefully
   - Detect wallet network changes

3. **Retry Logic**
   - Implement exponential backoff for transient failures
   - Allow user to retry specific failed operations
   - Track retry attempts for analytics

4. **Better Error Categorization**
   - Distinguish between user errors and system errors
   - Provide actionable error messages
   - Link to help documentation

5. **Monitoring and Analytics**
   - Log all transaction attempts with metadata
   - Track error rates by error type
   - Alert on unusual error patterns

## Questions or Issues?

If the "Unexpected error" persists:

1. Check the detailed console logs first
2. Verify wallet is on correct network/cluster
3. Check Phantom wallet version is up to date
4. Try with different wallet provider if available
5. Check Anchor program is deployed and IDL is correct
6. Verify instruction serialization format is correct
