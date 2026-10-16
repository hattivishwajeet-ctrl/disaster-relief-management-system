# Contributing Guidelines

## 1. Purpose

These guidelines define the development workflow for the Disaster Relief Resource Allocation and Emergency Response Management System. They help maintain readable code, reliable documentation, traceable changes, and a stable main branch.

## 2. Repository Workflow

- `main` contains the stable, integrated version of the project.
- New features, bug fixes, tests, and documentation improvements should be developed on separate branches.
- Changes should be reviewed and tested before they are merged into `main`.

## 3. Branch Naming

Use descriptive branch names with the following prefixes:

- `feature/` — New functionality.
- `fix/` — Bug fixes.
- `docs/` — Documentation changes.
- `test/` — Test-related changes.
- `refactor/` — Internal code improvements.

Examples:

- `feature/resource-allocation`
- `feature/emergency-reporting`
- `fix/inventory-validation`
- `docs/update-database-design`
- `test/allocation-concurrency`

## 4. Commit Message Convention

Use short, descriptive commit messages with a consistent prefix.

Examples:

- `feat: implement resource request creation`
- `fix: prevent allocation beyond available stock`
- `docs: update database design`
- `test: add inventory validation tests`
- `refactor: separate allocation business logic`

Each commit should represent a meaningful, understandable change.

## 5. Development Practices

- Keep changes focused on one feature or task.
- Avoid committing generated files, dependency folders, credentials, or local environment files.
- Validate inputs and handle errors appropriately.
- Use parameterized SQL queries.
- Enforce authentication and authorization on the backend.
- Preserve transaction safety during resource allocation.
- Document important database operations and business rules.
- Update documentation when implementation details change.

## 6. Testing

Before merging changes into `main`:

1. Run the relevant automated tests.
2. Check for application errors and unexpected behavior.
3. Verify database consistency for operations involving inventory and allocations.
4. Test authorization for protected endpoints.
5. Verify real-time updates when modifying event-driven functionality.
6. Update tests and documentation when behavior changes.

## 7. Pull Request Guidelines

Pull requests should include:

- A concise title and description.
- The reason for the change.
- A summary of the implementation.
- Tests performed and their results.
- Relevant screenshots for interface changes.
- Links to related GitHub Issues.

Do not merge changes that have known critical failures.

## 8. Documentation Standards

- Keep the README accurate and up to date.
- Record requirements, architectural decisions, database changes, and API behavior.
- Clearly distinguish planned features from implemented and tested features.
- Never document an untested feature as successfully completed.

## 9. Security

Never commit passwords, API keys, authentication secrets, private credentials, or real user-sensitive data.

Report and correct security issues before treating the affected functionality as ready.

## 10. Current Project Status

The project is currently in the initial repository and documentation phase. These guidelines will apply as implementation and testing begin.
