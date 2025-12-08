# CutiToken Approval Integration Guide

## What Was Added

1. **New Component**: `src/components/CutiTokenApproval.tsx`
   - Checks if user has approved CutiToken spending
   - Shows approval status with visual indicators
   - Provides "Approve" button if needed

2. **Backend Updates**:
   - Added `cutiTokenAddress` to chain config API response
   - Updated `/chain/config` endpoint to include token address

## How to Integrate

### Option 1: Add to Leave Request Form (Recommended)

Add the approval check at the top of the leave request form:

```tsx
// In src/app/(user)/user/requests/forms/LeaveRequestForm.tsx

import { CutiTokenApproval } from '@/components/CutiTokenApproval'

export default function LeaveRequestForm({ onSubmitted }: { onSubmitted?: () => void }) {
  // ... existing code ...

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ADD THIS: Approval check banner */}
      <CutiTokenApproval />

      {/* Rest of your form */}
      <SelectBox
        label="Leave Type"
        value={form.leaveType}
        onChange={v => setForm({ ...form, leaveType: v })}
        options={LEAVE_TYPE_OPTIONS}
      />

      {/* ... rest of form fields ... */}
    </form>
  )
}
```

### Option 2: Add to User Profile/Settings Page

Show approval status in the user profile:

```tsx
// In src/app/(user)/user/profile/page.tsx

import { CutiTokenApproval } from '@/components/CutiTokenApproval'

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <h1>My Profile</h1>

      {/* Approval status section */}
      <section>
        <h2>CutiToken Settings</h2>
        <CutiTokenApproval />
      </section>

      {/* Rest of profile */}
    </div>
  )
}
```

### Option 3: Show as Modal/Alert on First Visit

Check approval status when user logs in and show a modal if needed.

## What Users Will See

### Status: Checking
```
┌─────────────────────────────────────────┐
│ ℹ Checking CutiToken approval status... │
└─────────────────────────────────────────┘
```

### Status: Needs Approval
```
┌──────────────────────────────────────────────────┐
│ ⚠ One-Time Setup Required                        │
│                                                   │
│ You need to approve the Leave Management system  │
│ to use your CutiTokens. This is a one-time      │
│ transaction that requires a small gas fee        │
│ (~$0.01-$0.10).                                  │
│                                                   │
│ You have 12 CutiToken(s) available.             │
│                                                   │
│ ┌────────────────────────────────────┐          │
│ │  Approve CutiToken Usage           │          │
│ └────────────────────────────────────┘          │
│                                                   │
│ After approval, all leave requests will be       │
│ 100% gasless!                                    │
└──────────────────────────────────────────────────┘
```

### Status: Approved
```
┌─────────────────────────────────────────────┐
│ ✓ CutiToken Approved (12 tokens available) │
└─────────────────────────────────────────────┘
```

## User Flow

1. **User visits leave request page**
   - Component checks approval status

2. **If not approved:**
   - Yellow warning banner appears
   - User clicks "Approve CutiToken Usage"
   - MetaMask pops up asking for approval
   - User pays small gas fee (~$0.01-$0.10)
   - Approval confirmed on-chain

3. **After approval:**
   - Green success banner shows
   - User can now submit leave requests
   - **All future leave requests are 100% gasless!**

## Technical Details

### Gas Costs
- **One-time approval**: ~46,000 gas (~$0.01 - $0.10 depending on network)
- **All leave requests after**: 0 gas (relayer pays)

### Security
- Uses `maxUint256` for approval (unlimited)
- Standard ERC-20 approval pattern
- User can revoke approval anytime via block explorer

### What Happens Behind the Scenes

```
User clicks "Approve"
  ↓
walletClient.writeContract({
  address: cutiTokenAddress,
  functionName: 'approve',
  args: [leaveCoreAddress, maxUint256]
})
  ↓
Transaction sent to blockchain
  ↓
User pays gas fee (ONLY THIS ONE TIME)
  ↓
Approval recorded on-chain
  ↓
Component detects approval
  ↓
Shows success message
  ↓
User can now submit gasless leave requests!
```

## Testing

1. Start backend: `cd login-wallet-backend && bun run dev`
2. Start frontend: `cd MyBaliola/test-fe/my-baliola && npm run dev`
3. Connect wallet with CutiTokens
4. Visit leave request page
5. Click "Approve CutiToken Usage"
6. Approve in MetaMask
7. See success message
8. Submit leave request (should be gasless)

## Troubleshooting

### "Failed to check approval status"
- Check that backend is running
- Verify CUTI_TOKEN_ADDRESS is set in backend .env
- Ensure wallet is connected

### "Approval failed"
- User might have rejected transaction
- Check wallet has enough ETH for gas
- Verify CutiToken contract address is correct

### "Shows 0 tokens available"
- Admin needs to allocate annual leave first
- Run: `cutiToken.allocateAnnualLeave(userAddress, amount)`
