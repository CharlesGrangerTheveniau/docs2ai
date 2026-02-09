---
source: https://docs.acme.com/guides/authentication
fetched_at: '2025-06-01T10:00:00Z'
platform: mintlify
title: Authentication Guide
docs2ai_version: 0.1.0
---

# Authentication Guide

Acme uses API keys for authentication. You can generate keys from your dashboard.

## API Keys

Each key has a prefix: `acme_live_` for production and `acme_test_` for sandbox.

## OAuth Flow

For user-level access, use the OAuth 2.0 authorization code flow.

```typescript
const token = await acme.oauth.getToken({
  code: authorizationCode,
  redirect_uri: 'https://yourapp.com/callback',
});
```
