# Gallery access matrix — policy design vs executed evidence

| Actor | Intended | Executed staging test |
|---|---|---|
| Unauthenticated guest | Denied (existing Brian login gate and no anon grants) | NOT RUN |
| Admin with approved canonical profile | Toggle / CRUD / publish / moderate | NOT RUN |
| Teacher owning a gallery | Create draft, manage own rooms/exhibits and moderate | NOT RUN |
| Unrelated teacher | Cannot edit another teacher's content | NOT RUN |
| Same-school authenticated visitor | Read published school gallery only | NOT RUN |
| Different-school visitor | Cannot read school-only gallery | NOT RUN |
| Student account | Submit only to eligible published exhibition | BLOCKED: profiles role constraint excludes student |
| Direct REST/API tampering | Cannot change immutable submitter/room, force publish or bypass RLS | NOT RUN |
| Signed private asset | Read only when authorized, TTL 120s | NOT RUN |

**Do not interpret this table as security sign-off.** Migration has not been applied. Staging accounts and RLS negative tests are prerequisites to activation.

The draft migration uses owner/auth.uid checks, canonical database profile.role and approved status for writers, no anon grants, private Storage with signed URLs, and immutable submission identity trigger. Security review must verify existing `profiles` SELECT RLS visibility for same-school tests; the policy is deliberately fail-closed on missing school identity.
