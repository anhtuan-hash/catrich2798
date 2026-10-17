\set ON_ERROR_STOP on
-- Entirely disposable GitHub Actions database. Never use these credentials outside CI.
CREATE ROLE qatl_http_authenticator LOGIN PASSWORD 'questatlas-ci-only-password';
GRANT anon, authenticated, service_role TO qatl_http_authenticator;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
\echo '[QuestAtlas HTTP] Disposable PostgREST authenticator installed'
