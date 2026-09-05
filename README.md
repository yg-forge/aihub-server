# AIHub V1.0.1 Compile-Fix Baseline

This is the repaired engineering baseline after static compile review of the V1 integration.

## Architecture
- Java 21
- Spring Boot 3.4.2
- Maven multi-module
- Servlet/MVC application model
- PostgreSQL + Flyway
- Spring Security + JWT
- JPA user persistence
- Provider SPI
- OpenAI-compatible Chat Completions
- SSE streaming
- Tenant context header support

## Modules
- aihub-common
- aihub-tenant
- aihub-auth
- aihub-system
- aihub-provider
- aihub-model
- aihub-chat
- aihub-bootstrap

## What was repaired
1. `aihub-tenant` now declares `jakarta.servlet-api` for independent compilation.
2. The application uses the servlet/MVC stack coherently with `SecurityFilterChain` and `OncePerRequestFilter`.
3. Added the missing `OncePerRequestFilter` import.
4. Registered `TenantFilter` as a Spring servlet filter.
5. Kept WebClient/Reactor support for the provider and streaming code.
6. Removed the reactive web-application assumption from the integrated runtime baseline.

## Build
```bash
mvn clean package
```

## Run PostgreSQL
```bash
docker compose up -d postgres
```

## Run application
```bash
export OPENAI_API_KEY=your_key
export JWT_SECRET=replace-with-a-real-32-plus-character-secret
java -jar aihub-bootstrap/target/aihub-bootstrap-0.1.0-SNAPSHOT.jar
```

## Functional smoke test
1. Register the first user at `POST /api/v1/auth/register`.
2. Log in at `POST /api/v1/auth/login`.
3. Use the returned bearer token.
4. Call `POST /api/v1/ai/chat`.
5. Call `POST /api/v1/ai/chat/stream`.

The first registered user is `SUPER_ADMIN`, which can pass the current `chat:use` permission check.

## Important limitation
This package was repaired by static source inspection because Maven is not installed in the current execution environment. It has not been proven by an actual `mvn clean package` run here. The next engineering step is real compilation in an environment with Java 21 and Maven, followed by test-driven fixes.

## CI trigger
Production smoke validation trigger.
