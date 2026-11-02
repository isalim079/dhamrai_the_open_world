# Save, Google Login and Cloud Synchronization — Dhamrai Life

## 1. Fixed product decision

- Google sign-in is mandatory to enter the game and associate progress with an account.
- Google Drive is the cloud-save destination.
- Store the game save under the user's hidden Google Drive `appDataFolder` using the `https://www.googleapis.com/auth/drive.appdata` scope.
- IndexedDB is the immediate local save and is required for offline-tolerant gameplay.
- Provide JSON export/import so players can keep a portable copy outside the browser and Google Drive.

## 2. Important distinction: sign-in vs Drive authorization

Google sign-in and Google Drive access are separate consent moments in Google Identity Services.

1. **Authentication:** Use Sign in with Google to identify the user. The backend verifies the ID token. Use Google's stable `sub` claim as the account key; do not use email as the immutable ID.
2. **Drive authorization:** Separately request consent for `drive.appdata` when explaining cloud backup. A Google login does not automatically grant Drive API access.

Product policy: Google login is mandatory. Drive authorization should be strongly requested during onboarding and is required for cloud backup. If the user denies Drive consent, the app may offer a clearly labelled local-only session rather than falsely claiming that the user's Drive contains a save. Product owner may later decide whether local-only play is allowed; do not block recovery/export UX.

## 3. Google Drive appDataFolder facts

- It is a special hidden folder for app-specific data.
- It is visible to the creating app through the Drive API, not in the normal Drive UI, and cannot be accessed by other Drive apps.
- The required scope is `https://www.googleapis.com/auth/drive.appdata`.
- The folder is deleted if the user uninstalls the app from their Drive; the user can also manually delete app data.
- Files/folders in appDataFolder cannot be shared or moved between spaces, and cannot be trashed. Do not present it as an ordinary visible folder or a shareable backup location.

The Settings screen must explain this in plain language: “Your Dhamrai Life cloud save is stored in a hidden app-specific area of your Google Drive. It will not appear as a normal file in Drive.”

## 4. Recommended OAuth design

Use Google Identity Services on the web and a backend OAuth authorization-code flow for Drive access.

### 4.1 Authentication flow

1. Player clicks “Continue with Google”.
2. Google returns an ID token credential.
3. Browser sends credential to `POST /auth/google` over HTTPS.
4. Backend validates signature, issuer, audience, expiry and CSRF protections using a trusted Google library.
5. Backend reads `sub`, creates/finds the internal account, and issues an app session.
6. Use secure, HttpOnly, SameSite cookies for the application session; configure CSRF protection for state-changing requests.
7. Never log or persist raw ID token in analytics/logs.

### 4.2 Drive authorization flow

1. In onboarding, explain why Drive access is requested and what is stored.
2. Start GIS authorization-code flow for `drive.appdata`.
3. Browser sends authorization code to the backend callback/endpoint using the exact configured redirect/origin rules.
4. Backend validates state and exchanges the code at Google's token endpoint.
5. Backend encrypts and stores the per-user refresh token using a managed encryption key/KMS or equivalent envelope encryption. Access token is short-lived and held only as needed.
6. Browser never receives the refresh token or client secret.
7. Backend refreshes access tokens when required and calls Drive API on behalf of the signed-in player.
8. On disconnect, revoke or delete stored credentials as appropriate and explain whether cloud data remains.

Do not implement an implicit flow merely to avoid a backend token exchange. Long-lived refresh tokens belong on a secure backend, not in localStorage or IndexedDB.

## 5. What goes where

### Google Drive appDataFolder

- Current game-save JSON payload.
- Minimal schema/world data version markers embedded in that payload.
- Optional compact recovery metadata if required by an approved format.

Do not store large world chunks, textures, GLBs, audio, map tiles, application code or cache content in Drive.

### Browser IndexedDB

- Latest local save snapshot.
- Save write queue/outbox.
- Recent local recovery snapshots.
- Transaction/mission history needed for gameplay.
- Local preferences and key bindings.
- Cloud sync status, last acknowledged revision and pending changes.

### Backend PostgreSQL (initial scope)

- Internal account ID.
- Google `sub`.
- Minimal display profile if necessary.
- Encrypted refresh token and key version.
- Drive authorization status and file ID.
- Cloud save revision/modified timestamp metadata.
- Short-lived per-account sync lease and audit/security events.

Do not store the player save body, money balance, owned-property state or mission state in the server DB in v1. Future multiplayer may require server-authoritative state; that is a separately approved architecture evolution.

## 6. Save file envelope

Example envelope (illustrative; actual schema must be versioned and validated):

```json
{
  "gameId": "dhamrai-life",
  "saveId": "primary",
  "schemaVersion": 1,
  "worldDataVersion": "0.1.0",
  "contentVersion": "0.1.0",
  "playerId": "internal-account-id",
  "saveRevision": 42,
  "parentRevision": 41,
  "writerDeviceId": "random-install-id",
  "createdAt": "2026-11-02T06:00:00.000Z",
  "updatedAt": "2026-11-02T06:14:00.000Z",
  "payloadChecksum": "sha256:...",
  "player": {},
  "economy": {},
  "vehicles": [],
  "inventory": [],
  "missions": {},
  "properties": [],
  "businesses": [],
  "relationships": {},
  "worldProgress": {},
  "transactionLedger": []
}
```

Rules:
- Store whole-taka balances as safe integers.
- Use stable IDs, not display names, as foreign keys.
- Save only player-specific persistent world changes. Do not serialize every transient NPC or traffic agent.
- Validate schema and checksum on read.
- Reject unknown major schema versions safely; offer export and explain required update rather than resetting.
- Do not trust a save's `playerId` without checking it matches the authenticated account.

## 7. Save timing and local atomicity

- Write immediately after important mutations: purchase, reward, mission change, vehicle ownership/condition update, arrest, property transaction and player settings.
- Debounce routine transform/time state and checkpoint at a configurable interval (initial proposal: 20–30 seconds while actively playing).
- Save on pause, before returning to menu, and during visibility/page lifecycle events where possible, but do not depend solely on `beforeunload`.
- Use Dexie/IndexedDB transaction boundaries. Balance and its ledger event must commit together.
- A save write is acknowledged locally only after the IndexedDB transaction completes.
- Cloud upload happens after local commit; cloud failure must not roll back or delete local progress.

## 8. Cloud sync protocol

Suggested status values:

- `not_connected`
- `authorization_required`
- `synced`
- `local_changes_pending`
- `uploading`
- `download_available`
- `conflict`
- `error_retryable`
- `error_action_required`

Protocol:
1. Local gameplay writes IndexedDB and appends a sync job.
2. Sync worker sends the current validated save plus `baseCloudRevision`, `clientSaveId`, `writerDeviceId` and idempotency key to backend.
3. Backend obtains a per-account short-lived sync lease.
4. Backend loads Drive metadata/save and compares base revision with current revision.
5. If equal, update the existing primary save file in appDataFolder, then return the new cloud revision and checksum.
6. If different, return conflict without overwriting either copy.
7. Client downloads latest cloud state and displays a comparison/resolution screen.
8. After an explicit resolution, client submits the selected or merged state against the latest revision.
9. Backend releases lease and returns final Drive revision.

Use one stable primary save file initially. Do not create unlimited files per autosave. Any remote snapshot-rotation/cleanup design must respect appDataFolder restrictions (files cannot be trashed); validate Drive `files.delete` behaviour in an integration test before relying on deletion for retention.

## 9. Conflict policy

Never silently prefer “newest timestamp wins” for game progress. Device clocks can drift and two saves may represent different purchases or mission states.

- If only one device has local changes and cloud has not changed since its base revision, upload local.
- If cloud changed since local base revision, do not overwrite.
- Offer: “Use cloud save on this device”, “Keep this device's save and replace cloud”, and “Download both backups” after explaining consequences.
- Automatic merge is allowed only for specifically reviewed append-only records with unique event IDs and deterministic conflict semantics. Never auto-merge money balances, property ownership, inventory counts or mission branches.
- Provide a backup/export before a destructive user-selected resolution.

## 10. Save migrations and version independence

Track separate versions:

- `appVersion`: shipped code version.
- `saveSchemaVersion`: serialized save format.
- `worldDataVersion`: road/POI/chunk release.
- `contentVersion`: mission/dialogue/economy definition release.

App update must not imply save schema change. World map updates must not reset player state.

Migration process:
1. Read old save without mutating it.
2. Validate old version.
3. Create local pre-migration snapshot.
4. Run ordered migration transforms.
5. Validate new save and invariants (balance, IDs, missions, properties).
6. Commit migrated copy atomically to a new local revision.
7. Upload cloud migration only after local validation and explicit sync success.
8. Keep rollback/export path.

Service Worker cache cleanup may remove old static assets only. Never clear game IndexedDB stores or Drive records during deployment.

## 11. Export/import

- Export full player save as a downloadable JSON file, optionally gzip if the browser supports it; plain JSON must remain a supported fallback.
- Include schema version, game ID, checksums and generated timestamp.
- Import requires validation and shows account/save identity, content summary and confirmation.
- Back up current local save before import.
- Do not allow a save from another Google account to be imported without explicit confirmation and a documented account ownership policy.

## 12. Reliability and security requirements

- All backend endpoints use HTTPS in production.
- No Google client secret, refresh token or app session in localStorage.
- HttpOnly, Secure and SameSite cookie settings; CSRF defense; rate limiting; strict origin/CORS allowlist.
- Encrypt refresh tokens at rest and rotate encryption keys with key-version metadata.
- Do not log OAuth credentials or save contents.
- Validate all imported/cloud save payloads and enforce size limits.
- Idempotent writes: repeated retry with the same idempotency key cannot grant duplicate rewards or increment revision multiple times.
- Handle 401/403, expired/revoked tokens, quota/rate limit, network timeout and Drive deletion distinctly.
- Cloud sync should use exponential backoff with jitter and a retry cap; do not retry permanent permission errors endlessly.
- Ask for `navigator.storage.persist()` where supported; report its result but do not claim browser data is absolutely permanent.
- Browser storage remains user-clearable; Drive cloud backup and external export are the recovery paths.

## 13. Account lifecycle

- Logout clears app session and sensitive in-memory token material; it does not delete local save or Drive save without explicit confirmation.
- Switching Google account must never silently attach account A's local save to account B. Detect player ID mismatch and offer export/switch/clear-local options.
- Disconnect Drive: remove stored refresh token and mark cloud unavailable; retain local save.
- Delete account/data: explicitly explain what is deleted locally, from Drive and from backend metadata. Use the appropriate Drive API deletion operation and verify it works for appDataFolder files. If the user uninstalls/removes app data in Google account settings, the app should detect missing cloud file and offer local restore/export.

## 14. Required integration tests

1. First Google login creates one internal account; same Google `sub` returns same account.
2. Different Google account never reads first account's Drive save.
3. Drive consent denied -> local save works only with clear local-only status (or a later product-approved gate); no false “cloud saved” message.
4. First cloud save creates primary file in appDataFolder.
5. Subsequent save updates the same primary file, not a new unlimited file per autosave.
6. Browser offline -> local writes succeed and remain pending.
7. Reconnect -> pending cloud save syncs.
8. Revoked Drive permission -> local save stays intact and UI requests reauthorization.
9. Cross-browser/device login downloads/restores cloud save.
10. Two devices race -> one accepted update, the other receives conflict; no silent overwrite.
11. App code update with unchanged schema leaves local and cloud saves intact.
12. Schema migration failure keeps prior snapshot and blocks destructive reset.
13. Import corrupt/unknown-version JSON is rejected safely.
14. Logout does not delete cloud data.
15. Account deletion/disconnect semantics are tested against a real test Google account before production.
