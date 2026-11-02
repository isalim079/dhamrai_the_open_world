# Milestone 4 — Final remediation verification

**Outcome: BLOCKED. Milestone 4 is not approved. Milestone 5 has not started.**

Scope: every finding enumerated in the user's final remediation request. No separate earlier security-audit document was found in this workspace, so this report does not invent findings or claim to cover an unavailable audit text. Existing uncommitted work was preserved; no commit or push was made. Yarn Classic remains **1.22.22**. The browser-first runtime, IndexedDB durability and rendering/domain separation are unchanged.

## Findings and evidence

“Source + tests” means the implementation was inspected and the named local tests passed. It does **not** imply a live Google login or successful PostgreSQL integration. Paths are relative to the repository root.

| Finding | Current status | File and function | Test evidence |
|---|---|---|---|
| Google RSA-SHA256 signature absent | FIXED: source + cryptographic tests | `apps/api/src/auth/google-auth.service.ts` — `verifyIdToken` | `security.test.ts`: verifies actual RSA signatures; rejects attacker signatures, unsigned/algorithm-substituted tokens, unknown kid. Google HTTPS JWKS transport is mocked. |
| Untrusted token-supplied keys | FIXED: source + tests | Same — `verifyIdToken` | Fixed `https://www.googleapis.com/oauth2/v3/certs`; ignores JWT jku/x5u/jwk. Cache capped at one hour; failed refresh rejects. Test checks fixed endpoint and ignored attacker key URL. |
| Audience not checked against GOOGLE_CLIENT_ID | FIXED: source + tests | Same — `verifyIdToken` | Wrong/missing aud rejected; audience arrays require correct azp; wrong azp rejected. No fallback audience exists. |
| Issuer validation | FIXED: source + tests | Same — `verifyIdToken` | Only the two documented Google issuer strings accepted; wrong issuer rejected. |
| Missing/invalid/expired expiry accepted | FIXED: source + tests | Same — `verifyIdToken` | Requires finite numeric exp strictly greater than current Unix time. Missing, nonnumeric and expired values rejected. |
| OAuth CSRF state absent | FIXED locally; database-backed replay protection NOT VERIFIED live | Same — `beginOAuth`, `consumeOAuth`; `auth.controller.ts` — `beginGoogle`, `authenticateGoogle` | Random 256-bit state; browser-bound authenticated encrypted HttpOnly cookie; secure production cookie; expiry/mismatch/missing binding/replay tests. Production replay consumption is an atomic unique insert into `oauth_used_states`, with no local fallback. Real PostgreSQL unavailable. |
| PKCE absent | FIXED: source + tests | Same — `beginOAuth`, `exchangeAuthorizationCode` | Fresh server-held verifier; S256 challenge in authorization URL; exact matching verifier in token POST. Test hashes captured verifier and compares challenge. Verifier is not returned in JSON. |
| Redirect URI unvalidated | FIXED: source + tests | Same — `redirect`, `consumeOAuth`, `exchangeAuthorizationCode`; `config/env.ts` — `validateEnv` | Exact configured URI match; HTTPS in production; localhost HTTP only outside production; no credentials/fragments. Tests reject attacker URI, trailing-slash mismatch and postmessage. Same URI used for authorization and exchange. |
| OAuth identity/code mock bypass | FIXED: source + tests | Same; `auth.controller.ts` — `authenticateGoogle` | Production service has no mock-token/code acceptance path and never derives sub from a code. Code exchange must return a verified ID token. Nonce checked on both code and ID-token login paths. Controller/session legacy tests now explicitly stub provider methods. |
| User registration conflicts on internal ID | FIXED in SQL; real concurrent registration NOT VERIFIED | `database/postgres-user.repository.ts` — `save`, `update` | `postgres-repository.test.ts` checks ON CONFLICT (google_sub), RETURNING persisted row, no ID reassignment. `postgres.real.test.ts` has 32-way first-registration and existing-ID registration tests; both skipped. |
| Existing internal user ID must survive concurrent login | FIXED in SQL; real concurrency NOT VERIFIED | Same — `save`; `auth.controller.ts` — `authenticateGoogle` | Conflict arm never assigns id/created_at; result maps returned database identity. No-refresh-token upserts preserve encrypted credentials; profile-only updates write only provided columns and cannot replay an old encrypted token read before a concurrent rotation. Real existing-ID/first-registration tests are provided but not run. |
| Deterministic development encryption key in production | FIXED: source + tests | `crypto/aes-gcm.service.ts` — constructor, `validateProductionEncryptionKey` | No deterministic default; dev/test unconfigured key is ephemeral random. Published legacy seed hash and example keys rejected in production, including injected buffers. |
| Missing/invalid production key must stop startup | FIXED: actual bootstrap tests | Same; `config/env.ts` — `validateEnv`; `main.ts` — `bootstrap` | `startup.test.ts`: five actual child-process bootstrap cases exit 1 before listening (missing, 64-character nonhex, other malformed, 31-byte, old example). `security.test.ts` also exercises validator/service guards. |
| Key must decode to exactly 32 bytes | FIXED: source + tests | Same — constructor, `validateProductionEncryptionKey` | Full 64-hex regex, decoded 32-byte length, buffer length validation. Invalid lengths/nonhex rejected; random valid 32-byte key accepted. |
| No secrets logged | VERIFIED for inspected/tested paths | `main.ts` — startup catch; `google-auth.service.ts` — exchanges/refresh; `cloud-save/google-drive.service.ts` — request failures | Removed upstream error-body logging/exception interpolation and raw bootstrap error dumping. Secret-marker/bootstrap tests and console spies show no secret values. Diagnostic messages include configuration names, not values. This is not a claim about external proxy/platform log configuration. |
| Double distributed acquisition | CONDITIONAL SQL IMPLEMENTED; NOT VERIFIED on PostgreSQL | `cloud-save/lease-lock.service.ts` — `acquireLease` | Conditional ON CONFLICT/UPDATE, unique key and database clock. `lease-lock.test.ts` checks query contracts only. Real simultaneous two-pool test skipped. No mock result is presented as proof. |
| Expired reclamation must be atomic | CONDITIONAL SQL IMPLEMENTED; NOT VERIFIED on PostgreSQL | Same — `acquireLease` | Atomic expiry predicate, expected-version check, fresh server token. Fake-clock local test passes; real two-pool simultaneous reclamation skipped. |
| Verify ownership at commit | CONDITIONAL SQL IMPLEMENTED; NOT VERIFIED on PostgreSQL | Same — `commitVersionAndRelease` | One UPDATE checks key, token, unexpired database deadline and known_version IS NOT DISTINCT FROM expected_version. Query-contract and local ownership tests pass. Real test skipped. |
| Expired/superseded holder must not commit | FIXED locally; PostgreSQL behavior NOT VERIFIED | Same; `cloud-save.controller.ts` — `putCloudSave` | Local expiry/reclamation/old-token tests pass; mock-Drive delayed uploader cannot publish its pointer or displace current lease. Real fencing test skipped. |
| Stale expected versions | FIXED locally; PostgreSQL behavior NOT VERIFIED | Same — `acquireLease`, `commitVersionAndRelease`; controller — `putCloudSave` | Once a version exists, omitted/stale expectedVersion cannot acquire. Commit compares captured version again. Versions are opaque server revisions, not client timestamps. Real stale-version test skipped. |
| PostgreSQL failure must not select local locks | FIXED fail-closed source + tests; actual server outage NOT VERIFIED | `database/database.module.ts` — `createPostgresClient`, repository factory; lease constructor and methods | Production requires PostgreSQL. Missing configuration/driver/initialization rejects startup. Injected DB errors propagate from acquire, verify, commit and pointer reads; no catch selects local state. Production mock-Drive selection disabled. |
| Read-then-upload lease race | REMEDIATED locally; real PG/Google end-to-end NOT VERIFIED | Controller — `putCloudSave`, `getCloudSave`; lease — `getCommittedSave`, `commitVersionAndRelease` | Immutable per-attempt Drive files; fenced pointer publication. Expiry during mock upload leaves no canonical save. Filename/version read together; GET never overwrites known_version from a stale download. See ADR-005. |
| Test evidence classification | CORRECTED | `apps/api/test/*.test.ts`; evidence below | Unit tests, mocked provider/Drive integration and real PostgreSQL suite explicitly separated. Four real tests are skipped, not passed. |

Test paths above are under `apps/api/test/` unless fully qualified. [Security tests](../apps/api/test/security.test.ts), [startup tests](../apps/api/test/startup.test.ts), [SQL/local lease tests](../apps/api/test/lease-lock.test.ts), [mock Drive integration](../apps/api/test/cloud-save.test.ts), [real database suite](../apps/api/test/postgres.real.test.ts).

## SQL and transaction inspection

- Registration is one parameterized `INSERT ... ON CONFLICT (google_sub) DO UPDATE ... RETURNING *`. Internal ID and creation timestamp are not updated. The returned database ID is used to issue the session.
- Acquisition performs no prior SELECT. A conditional `INSERT ... ON CONFLICT (key) DO UPDATE` handles initial/expired acquisition and renewal. For a non-null expected version, the INSERT is deliberately a no-op followed by a conditional UPDATE of an existing row. These are separate autocommit statements; each write has its own atomic owner/expiry/version predicate. There is no reliance on a pooled BEGIN/COMMIT spanning unrelated connections.
- All lease deadlines and predicates in PostgreSQL use `clock_timestamp()`, not an API instance's local clock. The unique-key conflict/row update must serialize competing writes. This is the intended SQL mechanism, **not a substitute for the pending real concurrency test**.
- Commit/publication is one conditional UPDATE with RETURNING; zero rows is a conflict. Release also matches ownership. A missing token is rejected, even if the slot has no active lease.
- Drive and PostgreSQL are not one distributed transaction. Uploads are staged under a fresh server revision filename. The committed database pointer is the only API-visible publication. Losing attempts can leave orphans but cannot overwrite the published object. [ADR-005](ADR_005_FENCED_CLOUD_SAVE_PUBLICATION.md) records context, alternatives, failure semantics and rollout/migration requirements.

## Executed verification

The full run used the existing installed dependencies; a clean dependency installation is blocked.

| Command | Actual result | Captured output |
|---|---|---|
| `yarn --version` | 1.22.22, exit 0 | [Output](evidence/milestone-4/yarn-version.txt) |
| `yarn typecheck` | PASS, exit 0; referenced TypeScript builds refreshed | [Output](evidence/milestone-4/typecheck.txt) |
| `yarn test` | **153 passed, 4 skipped**; 18 files passed, one skipped; exit 0 | [Full output](evidence/milestone-4/typescript-tests.txt) |
| `yarn vitest run apps/api/test/postgres.real.test.ts` | **NOT VERIFIED — all four skipped**; exit 0 is the runner's skip result | [Output](evidence/milestone-4/postgres-real-tests.txt) |
| `PYTHONPATH=tools/geo-pipeline .venv/bin/python -m unittest discover -s tools/geo-pipeline -p 'test_*.py' -v` | **13 passed**, exit 0 | [Output](evidence/milestone-4/python-tests.txt) |
| Compiled Nest application context, test mode, no HTTP listener | PASS, resolves providers and closes | [Output](evidence/milestone-4/nest-context.txt) |
| `git diff --check` | PASS, exit 0 | [Output](evidence/milestone-4/diff-check.txt) |
| `yarn install --frozen-lockfile --offline --ignore-scripts` | BLOCKED, exit 1: pg 8.16.3 unavailable in cache | [Output](evidence/milestone-4/dependency-install.txt) |
| `initdb -D /tmp/dhamrai-m4-pg-data -A trust --no-locale -U dhamrai_test` | BLOCKED, exit 1: shmget Operation not permitted | [Output](evidence/milestone-4/postgres-init.txt) |

[Machine-readable command results](evidence/milestone-4/verification.json).

The existing shared-contracts, game-core and save-core tests are unit/persistence-adapter tests. `auth.test.ts` stubs the identity provider; it is not live Google evidence. `security.test.ts` uses actual generated RSA signatures and Node crypto with a mocked Google JWKS/token transport. `cloud-save.test.ts` uses an in-memory user repository, process-local lease service and MockGoogleDriveClient; it tests orchestration only. `lease-lock.test.ts` contains process-local unit tests and SQL query mocks; it supplies no distributed correctness proof. No real PostgreSQL tests passed in this environment.

## Why the outcome is BLOCKED

1. No TEST_DATABASE_URL is configured. PostgreSQL 18 tools are present, but no server answered the local default readiness probe. Isolated initialization failed with shared-memory permission denied, including an attempted mmap configuration. No real PostgreSQL connection, concurrent registration test, multi-instance lock test, replay-store test or actual database outage test was completed.
2. The API now declares `pg@8.16.3`, required for the actual production database provider. The driver is not installed and not cached. Online Yarn fetching failed with ENOTFOUND registry.yarnpkg.com; registry.npmjs.org also failed DNS resolution. The frozen/offline installation failure is preserved above. **yarn.lock is unchanged and does not yet contain pg's dependency graph. A clean/frozen install is not reproducible until Yarn can resolve/install and lock this dependency.** No invented lockfile/integrity entries were added. Production fails closed rather than using memory when this driver cannot load.
3. Live Google OAuth/Drive tests still require owner credentials, configured consent/scopes and exact browser callback URI. No live Google success is asserted by the mocked tests. Token signature/claim/state/PKCE logic is locally tested.
4. Before deployment, review/import existing fixed-name Drive saves and old coordination keys into the fenced pointer scheme described by ADR-005. Existing files are preserved; no silent data deletion or automatic import was introduced. Orphan retention/cleanup needs an operational policy. This is not a deployment-ready approval.

## Supporting protocol references

The implementation was checked against the [Google web-server OAuth flow](https://developers.google.com/identity/protocols/oauth2/web-server) and [PostgreSQL INSERT/ON CONFLICT documentation](https://www.postgresql.org/docs/current/sql-insert.html). Documentation describes the intended mechanisms; the skipped PostgreSQL tests still prevent a distributed-correctness verification claim.

## Remaining verification procedure

On a permitted environment, resolve the declared pg dependency with Yarn Classic 1.22.22 and review the generated yarn.lock. Configure TEST_DATABASE_URL to a **disposable** PostgreSQL database that permits creating/dropping an isolated test schema. Run `yarn typecheck`, `yarn test` and `yarn vitest run apps/api/test/postgres.real.test.ts`. The real suite creates two independent max-one-connection pools, asserts distinct backend PIDs, races registrations/acquisitions/reclamation, and checks fencing and stale-version rejection. It cleans only its randomly named schema. Add/execute production-state replay/outage and live Google integration checks before claiming those verified. Reconcile/import existing save pointers before rollout.

Milestone 4 remains unapproved. Milestone 5 remains untouched. No commit or push was made.
