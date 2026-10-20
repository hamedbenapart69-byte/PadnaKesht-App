# Kimi Android — build status

This branch is reserved for the Kimi ZIP source and Android packaging work. The source archive was inspected separately and contains a React + TypeScript app under `app/` (121 files). It includes a Hono/tRPC server and requires a MySQL database via `DATABASE_URL`; wrapping it in an APK does not make server/database functions offline.

## Build workflow

GitHub Actions workflow: `.github/workflows/kimi-android.yml`.

The workflow deliberately validates the archive, checks types/tests, builds the frontend, verifies Capacitor configuration, then builds a debug APK and uploads it as an artifact. It will fail clearly until `kimi-source.zip` is committed to this branch and Capacitor Android integration is implemented. Do not treat a workflow file as proof that an APK has been built.

## Offline scope

A real offline version needs a local persistence layer and explicit replacement of server-backed tRPC/database calls. Authentication and MySQL-dependent features cannot work fully offline without architectural changes. No credentials should be committed to this repository.
