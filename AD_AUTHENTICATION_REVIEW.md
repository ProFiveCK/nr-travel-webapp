# Active Directory Authentication Integration Review

## Executive Summary

**Feasibility: ✅ HIGHLY FEASIBLE**

The travel-app can be successfully integrated with Active Directory (AD) for user authentication. The current architecture is well-suited for this integration, requiring moderate changes to the authentication flow while maintaining the existing JWT token system.

## Current Authentication Architecture

### Current System
- **Authentication Method**: Email/password with Argon2 password hashing
- **Token System**: JWT access tokens (15min) + refresh tokens (30 days)
- **User Storage**: In-memory store (`memoryStore.ts`) - currently seeded with test users
- **Backend**: Express.js + TypeScript
- **Deployment**: Docker-based with PostgreSQL and Redis available

### Key Files
- `backend/src/routes/auth.ts` - Login endpoint (lines 16-44)
- `backend/src/middleware/auth.ts` - JWT verification middleware
- `backend/src/data/memoryStore.ts` - In-memory user storage
- `frontend/src/components/AuthModal.tsx` - Login UI

## AD Integration Assessment

### ✅ Advantages

1. **Clean Separation**: The authentication logic is isolated in `/routes/auth.ts`, making it easy to replace
2. **JWT System Intact**: The token-based system can remain unchanged - only the credential verification changes
3. **Docker Deployment**: Can easily add AD connection configuration via environment variables
4. **Local AD Access**: Since AD is accessible locally, no complex network tunneling required
5. **User Data Sync**: Can optionally sync user attributes (name, email, department) from AD

### ⚠️ Considerations

1. **User Storage**: Currently uses in-memory storage. For production AD integration, you'll want to:
   - Option A: Keep in-memory but sync from AD on first login
   - Option B: Migrate to PostgreSQL (already in docker-compose) for persistent user cache
   
2. **Role Mapping**: Need to map AD groups/attributes to app roles (USER, REVIEWER, ADMIN)

3. **User Registration**: Current signup flow may need adjustment:
   - Option A: Disable self-registration, users must exist in AD
   - Option B: Keep registration but require AD authentication

4. **Password Management**: No longer need password hashing/storage for AD-authenticated users

## Implementation Approach

### Recommended Strategy: **Hybrid Approach**

1. **Primary Authentication**: Authenticate against AD using LDAP bind
2. **User Cache**: Store user metadata in PostgreSQL (sync from AD on first login)
3. **Role Mapping**: Map AD groups to application roles
4. **JWT Tokens**: Continue using JWT for session management

### Required Changes

#### 1. Backend Dependencies
Add LDAP client library:
```json
"ldapjs": "^3.0.7"  // or "activedirectory": "^0.7.2"
```

#### 2. Configuration (`config.ts`)
Add AD connection settings:
```typescript
ad: {
  url: process.env.AD_URL ?? 'ldap://your-ad-server:389',
  baseDN: process.env.AD_BASE_DN ?? 'dc=example,dc=com',
  bindDN: process.env.AD_BIND_DN ?? '', // Service account for searches
  bindPassword: process.env.AD_BIND_PASSWORD ?? '',
  userSearchBase: process.env.AD_USER_SEARCH_BASE ?? 'ou=Users,dc=example,dc=com',
  usernameAttribute: process.env.AD_USERNAME_ATTR ?? 'sAMAccountName',
  groupSearchBase: process.env.AD_GROUP_SEARCH_BASE ?? 'ou=Groups,dc=example,dc=com',
}
```

#### 3. Authentication Service (`services/adAuthService.ts`)
Create new service to:
- Authenticate users against AD
- Fetch user attributes (name, email, department)
- Map AD groups to application roles
- Cache user data in database

#### 4. Modify Login Endpoint (`routes/auth.ts`)
Replace password verification with AD authentication:
```typescript
// Instead of:
const ok = await argon2.verify(user.passwordHash, password);

// Use:
const adUser = await adAuthService.authenticate(email, password);
if (!adUser) {
  return res.status(401).json({ message: 'Invalid credentials' });
}
```

#### 5. Database Migration (Optional but Recommended)
If using PostgreSQL for user cache:
- Create `users` table with AD-linked fields
- Add `ad_sam_account_name` field
- Add `last_ad_sync` timestamp

### Implementation Complexity

| Component | Complexity | Estimated Effort |
|-----------|-----------|------------------|
| AD Connection Setup | Low | 2-4 hours |
| Authentication Service | Medium | 4-6 hours |
| Login Endpoint Changes | Low | 1-2 hours |
| User Sync/Cache | Medium | 4-6 hours |
| Role Mapping | Medium | 2-4 hours |
| Frontend Changes | Low | 0-1 hours (likely none) |
| Testing & Debugging | Medium | 4-6 hours |
| **Total** | **Medium** | **17-29 hours** |

## Security Considerations

1. **Service Account**: Use a dedicated AD service account with minimal permissions (read-only for user lookups)
2. **LDAP Security**: 
   - Use LDAPS (LDAP over SSL) if possible: `ldaps://ad-server:636`
   - Or use STARTTLS for encryption
3. **Credentials**: Store AD bind credentials in environment variables (never in code)
4. **Token Security**: JWT tokens remain secure - AD only replaces password verification

## Migration Path

### Phase 1: Parallel Support (Recommended)
- Keep existing password auth for admin/test accounts
- Add AD auth as alternative login method
- Allow users to choose authentication method

### Phase 2: Full AD Migration
- Disable password-based registration
- Migrate existing users to AD (if applicable)
- Remove password hashing dependencies

## Testing Requirements

1. **AD Connection**: Test LDAP bind with service account
2. **User Authentication**: Test with real AD users
3. **Group Mapping**: Verify role assignment from AD groups
4. **Error Handling**: Test invalid credentials, locked accounts, network failures
5. **Performance**: Test authentication latency (should be < 500ms)

## Recommended Libraries

### Option 1: `ldapjs` (Recommended)
- **Pros**: Lightweight, flexible, well-maintained
- **Cons**: More manual configuration
- **Use Case**: Full control over LDAP operations

### Option 2: `activedirectory`
- **Pros**: AD-specific, simpler API
- **Cons**: Less flexible, may have compatibility issues
- **Use Case**: Quick AD-only integration

### Option 3: `passport-ldapauth` (if using Passport.js)
- **Pros**: Integrates with Passport middleware
- **Cons**: Requires refactoring to Passport.js
- **Use Case**: If planning broader auth strategy

## Environment Variables Needed

```bash
# AD Connection
AD_URL=ldap://ad-server.local:389
AD_BASE_DN=dc=company,dc=local
AD_BIND_DN=CN=ServiceAccount,OU=ServiceAccounts,DC=company,DC=local
AD_BIND_PASSWORD=secure-password

# AD Search Configuration
AD_USER_SEARCH_BASE=OU=Users,DC=company,DC=local
AD_USERNAME_ATTR=sAMAccountName
AD_GROUP_SEARCH_BASE=OU=Groups,DC=company,DC=local

# Role Mapping (optional - can be in code)
AD_ADMIN_GROUP=CN=TravelApp-Admins,OU=Groups,DC=company,DC=local
AD_REVIEWER_GROUP=CN=TravelApp-Reviewers,OU=Groups,DC=company,DC=local
```

## Conclusion

**The travel-app is well-positioned for AD integration.** The modular architecture makes it straightforward to replace the password authentication with AD/LDAP authentication while keeping the JWT token system intact.

### Key Recommendations:
1. ✅ **Proceed with integration** - Architecture supports it well
2. ✅ **Use `ldapjs` library** - Most flexible and reliable
3. ✅ **Migrate to PostgreSQL** for user caching (already in docker-compose)
4. ✅ **Implement role mapping** from AD groups
5. ✅ **Keep JWT tokens** - Only change authentication source
6. ✅ **Use LDAPS or STARTTLS** for secure connections

### Next Steps:
1. Obtain AD connection details (server, base DN, service account)
2. Test LDAP connectivity from Docker container
3. Implement AD authentication service
4. Update login endpoint
5. Configure role mapping
6. Test with real AD users

The integration is **moderately complex** but **highly feasible** with an estimated **2-4 days of development work** for an experienced developer.

