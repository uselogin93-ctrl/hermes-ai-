# Authentication & Integrations

Each third-party connection uses **OAuth 2.0** — the app never stores your raw passwords. Below is the exact login method and required scopes for each service, plus the app's own login.

## 1. App login (your own account)
- Recommended: **"Sign in with Google"** (since you already use Google Drive) as the primary app login, using OAuth 2.0 / OpenID Connect.
- Alternative: email + password with a hashed/salted store (bcrypt/argon2) if you want independence from Google for app login itself.
- Session handled via secure, HTTP-only cookies + short-lived JWT, refreshed via a refresh token.
- Since this is single-user (v1), you can also simplify to a single hardcoded admin account protected by a strong password + optional 2FA (TOTP) — simplest and still secure for personal use.

## 2. GitHub connection
- **Method:** GitHub OAuth App (or GitHub App for finer-grained permissions — recommended since you have multiple GitHub accounts).
- **Flow:** Standard OAuth Authorization Code flow — you click "Connect GitHub," get redirected to GitHub, approve, redirected back with a code, app exchanges it for an access token.
- **Scopes needed:**
  - `repo` (read) — to read commit history, PRs, repo metadata. Use fine-grained PAT or GitHub App install permissions scoped to read-only where possible.
  - `read:user` — basic profile info.
- **Multiple accounts:** Each GitHub account is a separate connection record; app supports connecting more than one GitHub identity and tags activity by which account it came from.
- **Token storage:** Encrypted at rest (e.g. AES-256 via a KMS-backed key), never exposed to the frontend.

## 3. Google Drive connection
- **Method:** Google OAuth 2.0 (Google Cloud project with Drive API enabled).
- **Flow:** Standard OAuth consent screen — select folders/files to allow access to (ideally via **Google Picker API** so you explicitly choose which folders the app can see, rather than full-Drive access).
- **Scopes needed:**
  - `drive.readonly` (broad) — or better, `drive.file` scope combined with Picker, which limits the app to only files/folders you explicitly selected. **Recommended** for privacy.
- **Token storage:** Same encrypted-at-rest approach as GitHub; refresh tokens used to maintain long-term access without re-login.

## 4. LinkedIn connection
- **Method:** LinkedIn OAuth 2.0 via the LinkedIn Developer Platform (Sign In with LinkedIn + Share on LinkedIn products).
- **Flow:** Standard OAuth Authorization Code flow.
- **Scopes needed:**
  - `openid`, `profile` — basic identity.
  - `w_member_social` — required to post on your behalf (this is the key scope for publishing).
- **Important constraint:** LinkedIn's API for posting requires your app to go through LinkedIn's developer approval process for the "Share on LinkedIn" product — this isn't instant; plan for an approval step when building.
- **Token storage:** Same encrypted approach; LinkedIn access tokens typically expire ~60 days, so a refresh/re-auth reminder flow is needed.

## 5. General integration principles
- Every connector requests the **minimum scope necessary** (read-only for GitHub/Drive, post-only for LinkedIn — never read your LinkedIn messages or connections, for example).
- Tokens are never sent to the browser/frontend — all API calls to GitHub/Drive/LinkedIn happen server-side.
- A "Disconnect" button fully revokes the token with the provider, not just deletes it locally.
- Connection health is checked periodically; expired/revoked tokens trigger a notification asking you to reconnect.
