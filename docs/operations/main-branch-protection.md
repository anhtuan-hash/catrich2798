# Main branch protection

`main` must be protected in GitHub Settings. The repository connector used for this rollout does not expose a mutation for branch protection/rulesets, and the current integration receives `403 Resource not accessible by integration` when reading the branch-protection endpoint. This is therefore the one remaining manual control-plane step.

## Recommended ruleset

- Target branch: `main`
- Require a pull request before merging
- Require status checks to pass and require branches to be up to date
- Require conversation resolution
- Block force pushes
- Block branch deletion
- Do not allow bypass except an explicitly designated emergency repository administrator

## Required status checks

- `Frontend Build / build`
- `Critical E2E / critical-e2e`
- `Supabase Egress P0 Guard / egress-p0-guard`
- `Supabase Egress P1 Guard / egress-p1-guard`
- `Supabase Egress P2 Guard / egress-p2-guard`
- `Homeroom Audit Source Export / export`

For a single-maintainer repository, requiring an approving review is optional; the status checks and force-push/deletion restrictions are the critical controls.
