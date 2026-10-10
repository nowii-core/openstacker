# Security policy

## Supported version

Security reports are welcome for the current `2.x` source in this repository.

## Reporting a concern

Please do not publish credentials, personal data or exploit details in a public issue. Contact the repository owner privately using a contact method configured on the GitHub profile. No private support inbox is configured by this project yet, so avoid sharing sensitive information until a private channel is available.

## Deployment safeguards

- Never expose the Supabase `service_role` key to browser code.
- Keep Row Level Security enabled and review `supabase/schema.sql` before collecting real user data.
- The static local mode is a demo, not a trusted multi-user authentication system.
- Validate and escape catalog submissions; review them before publication.
- Keep dependencies and GitHub Actions updated when maintaining a deployed copy.
