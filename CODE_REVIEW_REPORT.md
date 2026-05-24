# Comprehensive Code Review Report

## Executive Summary
This report provides a thorough security, code quality, and configuration review of "The Becoming Method" React Native/Expo application. Issues are categorized by severity with recommendations for remediation.

---

## CRITICAL

### 1. Secrets Committed to .env File in Source Control
**Location:** `.env` (line 9-31)

**Issue:** The `.env` file contains sensitive credentials including:
- Supabase project URL: `https://xhzjpubapkrgtdkvnfck.supabase.co`
- Supabase Anon Key: `sb_publishable_G_qYp0tloF4HMOL1ZXgAvA_rtDgJiBZ`
- Stripe Price IDs for Standard, VIP, and Elite tiers
- RevenueCat Apple and Google SDK keys with placeholder values

**Risk:** While `.gitignore` correctly excludes `.env`, the file exists in the repository (as evidenced by the file being readable). If this was ever committed, these secrets are exposed. Additionally, the Supabase anon key is client-side accessible but should still be rotated if exposed.

**Recommendation:**
1. Verify `.env` has never been committed: `git log --all --full-history -- .env`
2. Rotate all exposed credentials immediately
3. Consider migrating to Expo's `expo-secure-store` for sensitive runtime values

---

### 2. RevenueCat SDK Keys Using Placeholder Values
**Location:** `.env` (line 30-31), `src/services/purchases.ts` (line 6-21)

**Issue:**
```
EXPO_PUBLIC_RC_APPLE_KEY=appl_YourAppleKeyHere
EXPO_PUBLIC_RC_GOOGLE_KEY=goog_YourGoogleKeyHere
```

The code in `purchases.ts` includes a check for placeholder keys but returns early without configuring:
```typescript
const placeholderKey = apiKey?.includes('Your') || apiKey?.includes('YOUR') || apiKey?.includes('your-');
if (!apiKey || placeholderKey) {
    console.warn(`[Purchases] Missing RevenueCat ${Platform.OS} SDK key...`);
    return;
}
```

**Risk:** Native subscription billing is completely non-functional. Users cannot purchase subscriptions through the app.

**Recommendation:** Configure valid RevenueCat SDK keys in production environment.

---

### 3. Stripe Price IDs Using Placeholder Values
**Location:** `.env` (line 25-27)

**Issue:**
```
EXPO_PUBLIC_STRIPE_PRICE_ID_STANDARD_ANNUAL=price_standard_annual
EXPO_PUBLIC_STRIPE_PRICE_ID_VIP_ANNUAL=price_vip_annual
EXPO_PUBLIC_STRIPE_PRICE_ID_ELITE_ANNUAL=price_elite_annual
```

These are clearly placeholder values, not real Stripe price IDs.

**Risk:** Annual subscription purchases will fail.

**Recommendation:** Configure valid Stripe price IDs for annual billing tiers.

---

## HIGH

### 4. Empty Catch Blocks Silencing Errors
**Locations:**
- `src/app/subscribe/index.tsx` (line 173, 176, 399)
- `src/app/admin/index.tsx` (line 82)
- `src/app/(tabs)/index.tsx` (line 144)
- `src/app/(tabs)/feed/index.tsx` (line 112)
- `src/lib/streaks.ts` (line 28)

**Issue:** Multiple catch blocks with no error handling or logging:
```typescript
} catch {
    // silently ignored
}
```

**Risk:** Errors are silently swallowed, making debugging impossible. Authentication failures, database errors, and payment failures may go unnoticed.

**Recommendation:** Add proper error logging or handling in all catch blocks:
```typescript
} catch (error) {
    console.error('[Module] Error:', error);
    // Handle appropriately
}
```

---

### 5. Hardcoded Deep Link Scheme in Code
**Location:** `src/app/(auth)/forgot-password.tsx` (line 32-33)

**Issue:**
```typescript
const resetLink = isWeb
    ? `${window.location.origin}/reset-password`
    : 'thebecomingmethod://reset-password';
```

**Risk:** The deep link scheme `thebecomingmethod` is hardcoded and could differ from actual configuration in `app.json` (which uses `becomingmethod`).

**Recommendation:** Use `Linking.createURL()` or read from Expo constants instead of hardcoding.

---

### 6. No Input Validation on Password Reset
**Location:** `src/app/(auth)/reset-password.tsx` (line 19-35)

**Issue:**
```typescript
if (!password || password !== confirmPassword) {
    Alert.alert('Error', 'Please enter both email and password');
    return;
}
```

Problems:
1. No minimum password length validation
2. No password strength requirements
3. Error message incorrectly says "email and password" when only password is being set

**Risk:** Users can set weak passwords, and error messages are confusing.

**Recommendation:** Add password validation:
```typescript
if (!password || password.length < 8) {
    Alert.alert('Error', 'Password must be at least 8 characters');
    return;
}
if (password !== confirmPassword) {
    Alert.alert('Error', 'Passwords do not match');
    return;
}
```

---

### 7. Debug Version String Exposed
**Location:** `src/app/_layout.tsx` (line 15)

```typescript
const APP_VERSION = '1.0.1-debug';
```

**Risk:** Exposes debug version to production users, indicating the app may not be properly configured for release.

**Recommendation:** Use environment-based versioning or Expo's `Constants.manifest.version`.

---

### 8. Hardcoded Admin Email for Contact
**Location:** `src/app/subscribe/index.tsx` (line 336, 482)

```typescript
mailto:coach@thebecomingmethod.com
```

**Risk:** If this domain changes, the code will break. Not configurable.

**Recommendation:** Move to environment variable or configuration file.

---

## MEDIUM

### 9. Session Timeout Hardcoded
**Location:** `src/hooks/useAuth.ts` (line 10-15)

```typescript
const sessionTimeout = setTimeout(() => {
    if (!useAuthStore.getState().initialized) {
        console.warn('[useAuth] Session check timed out, forcing initialization');
        setAuth(null);
    }
}, 5000);
```

**Issue:** 5-second timeout may be too short on slow networks, causing false session failures.

**Risk:** Users on slow connections may be incorrectly logged out.

**Recommendation:** Increase timeout or make it configurable.

---

### 10. No Rate Limiting on Auth Attempts
**Location:** `src/app/(auth)/login.tsx`, `src/app/(auth)/register.tsx`

**Issue:** No protection against brute-force login attempts.

**Risk:** Vulnerability to credential stuffing attacks.

**Recommendation:** Implement rate limiting either client-side (show captcha after N failed attempts) or rely on Supabase's built-in rate limiting.

---

### 11. Missing Error Boundaries
**Location:** Multiple components

**Issue:** No React error boundaries are implemented. If a component crashes, the entire app will crash.

**Risk:** Poor user experience when errors occur. No graceful degradation.

**Recommendation:** Implement error boundaries at key route levels.

---

### 12. Silent Failures in Profile Store
**Location:** `src/stores/profileStore.ts` (line 86-90, 169-178)

**Issue:** Several non-fatal errors are caught but logged as warnings without user notification:
```typescript
if (stageError) console.warn('[profileStore] Stage error (non-fatal):', stageError);
```

**Risk:** Users may not realize their stage/subscription data isn't loading correctly.

**Recommendation:** Consider user-facing error states for critical data failures.

---

### 13. TODO Comments Left in Production Code
**Locations:**
- `src/app/subscribe/index.tsx` (line 67): `// TODO: replace with your production web base URL...`
- `src/app/(tabs)/settings/index.tsx` (line 156): `// TODO: Implement account deletion`

**Risk:** Indicates incomplete features.

**Recommendation:** Complete or document planned features.

---

## LOW

### 14. TypeScript Any Types Used Extensively
**Location:** Throughout codebase, e.g., `src/stores/profileStore.ts` (line 9: `profile: any`)

**Issue:** Using `any` defeats TypeScript's type safety benefits.

**Risk:** Runtime errors from type mismatches not caught at compile time.

**Recommendation:** Define proper interfaces for all data structures.

---

### 15. ESLint Rules Disabled
**Location:** `eslint.config.js` (line 35-38)

```javascript
'@typescript-eslint/no-explicit-any': 'off',
'@typescript-eslint/no-unused-vars': 'off',
'react-hooks/exhaustive-deps': 'off',
```

**Risk:** Reduces code quality enforcement.

**Recommendation:** Enable these rules and fix violations.

---

### 16. Postinstall Script Modifies node_modules
**Location:** `package.json` (line 13)

```json
"postinstall": "sed -i '' 's/import.meta.env/(process.env)/g' node_modules/zustand/esm/*.mjs"
```

**Issue:** This modifies installed dependencies, which is fragile and may break on reinstall.

**Risk:** Dependency updates could break the build without clear error.

**Recommendation:** Use a proper babel plugin or environment configuration instead.

---

### 17. Potential Memory Leak in useAuth
**Location:** `src/hooks/useAuth.ts` (line 10-14)

```typescript
const sessionTimeout = setTimeout(() => {
    if (!useAuthStore.getState().initialized) {
        setAuth(null);
    }
}, 5000);
```

**Issue:** The timeout is cleared on success path (line 18), but if the component unmounts before either, the timeout could still fire.

**Risk:** Potential memory leak and state update on unmounted component.

**Recommendation:** Store timeout ID in a ref and clear in cleanup function.

---

### 18. Inconsistent Error Logging
**Issue:** Some files use `console.error`, some use `console.warn`, some use `console.log`. No standardized logging strategy.

**Risk:** Difficult to distinguish between critical and non-critical issues in logs.

**Recommendation:** Implement a logging wrapper with severity levels.

---

### 19. Android Predictive Back Gesture Disabled
**Location:** `app.json` (line 27)

```json
"predictiveBackGestureEnabled": false
```

**Issue:** This feature should be enabled for modern Android UX.

**Recommendation:** Set to `true` or remove (defaults to true in Expo 50+).

---

### 20. New Architecture Enabled with Potential Compatibility Issues
**Location:** `app.json` (line 10)

```json
"newArchEnabled": true
```

**Issue:** New Architecture is enabled but some dependencies (like `react-native-purchases` v9.15.0) may have compatibility issues.

**Risk:** Runtime crashes on certain features.

**Recommendation:** Test thoroughly on both platforms with new architecture.

---

## SUMMARY

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 4 |
| Medium | 3 |
| Low | 7 |
| Configuration | 2 |

**Priority Actions:**
1. Verify `.env` never committed and rotate credentials (Critical)
2. Configure valid RevenueCat SDK keys (Critical)
3. Configure valid Stripe annual price IDs (Critical)
4. Fix all empty catch blocks (High)
5. Add password validation (High)
6. Fix deep link scheme mismatch (High)

---

*Report generated: April 16, 2026*
*Review scope: Full codebase including configuration files, stores, services, and components*