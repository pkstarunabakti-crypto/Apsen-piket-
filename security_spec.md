# Security Specification for Absen Pintar

## Data Invariants
1. A user can only read and write their own profile in `/users/{userId}`.
2. A user can only create an attendance record if the `userId` matches their own UID.
3. Attendance records are immutable once created (except for status changes by admins).
4. Only admins can read all attendance records or change their status.
5. Location IDs and timestamps must be valid.

## The "Dirty Dozen" Payloads (Denial Tests)

1. **Identity Spoofing**: Create attendance with `userId` of another user.
2. **Privilege Escalation**: Create a record in `/admins/` by a non-admin.
3. **Ghost Field**: Adding `isVerified: true` to a profile update.
4. **ID Poisoning**: Using a 2KB string as a `recordId`.
5. **Orphaned Record**: Creating attendance for a `userId` that doesn't exist in `/users/`.
6. **State Shortcutting**: Creating attendance with `status: 'approved'` directly.
7. **Timestamp Fraud**: Providing a client-side `timestamp` from 2 hours ago.
8. **Resource Exhaustion**: Sending a 1MB string in the `userName` field.
9. **Unauthorized List**: Non-admin trying to list all records in `/attendance/`.
10. **Immortality Bypass**: Trying to change the `type` or `location` of an existing attendance record.
11. **Email Spoofing**: Authenticating with an unverified email that matches an admin email.
12. **PII Leak**: Unauthorized user trying to `get` another user's profile.

## Test Runner logic
- We will verify that these return `PERMISSION_DENIED`.
