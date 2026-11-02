# ADR-005 — Fence cloud-save publication at the database commit

Status: implemented for Milestone 4 remediation; deployment blocked pending real PostgreSQL tests and dependency installation. Milestone 5 is not authorized.

## Context

Checking a lease, uploading over a network, then releasing it permits the lease to expire during upload. A superseded worker can overwrite a newer Drive file before its final database check. A PostgreSQL transaction cannot roll back a Google Drive write.

## Options and decision

A row lock held across Drive calls would block competing workers but would not undo an upload following timeout or expiry. Instead, upload each attempt under a fresh immutable, server-generated revision filename, then publish the filename and opaque revision using one conditional PostgreSQL UPDATE. The UPDATE must match lease owner, unexpired database-clock deadline, and the version captured at acquisition. Zero returned rows mean conflict. No canonical Drive file is overwritten by an uncommitted worker.

GET reads the committed filename and revision in one database query and fetches that immutable Drive object. It never learns the canonical version from a possibly stale download. PostgreSQL stores coordination metadata, not player save content; Drive remains the save payload repository and the browser retains IndexedDB immediate durability.

## Boundaries and failure semantics

Acquisition uses INSERT/ON CONFLICT with an expiry/version/owner predicate; the existing-version path uses a separate conditional UPDATE after the no-op INSERT. Each is an autocommit atomic database statement; there is no SELECT followed by an unconditional UPDATE. Commit/publication is one conditional UPDATE. These SQL guarantees are source-reviewed only until the real-database suite runs.

An upload failure leaves the old pointer untouched. A failure or expiry before publication may leave an unreferenced Drive file, but cannot publish it. A crash after publication leaves the new pointer available to GET even if the response was lost. No automatic orphan cleanup or old-save deletion is introduced. Cross-service distributed transactions and successful live Google integration are not claimed.

## Consequences and migration

Clients must acquire a lease before every PUT and round-trip the server's opaque version from GET/PUT as expectedVersion. Save-envelope schema V2 is unchanged; updatedAtIso is not a fencing revision. GET accepts slotName (QuickSave by default). Arbitrary fileName cannot select an uncommitted object; custom names are no longer authoritative addresses.

The save_leases schema adds committed_file_name. Existing fixed-name Drive files are preserved and are not silently imported, deleted, or overwritten. Before any production rollout, a controlled import must initialize committed pointers/versions and reconcile old lease keys (the new key encodes user/slot as a JSON pair). Until that migration is reviewed and real integration passes, deployment remains blocked. This is a Milestone 4 save-safety remediation, not Milestone 5 work.
