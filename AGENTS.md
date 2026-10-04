# Agent guidance

Record project workflow conventions here. Consult code and CI for implementation facts, commands, and checks.

## Local PR verification

- Before handing off a pushed PR, build its exact head and persistently relink `devps-local` to that checkout through the launcher's existing indirection.
- Verify the changed behavior by invoking `devps-local`. Release version output alone does not establish that it runs the PR build.
- Report the launcher target, PR head, and any unverified behavior alongside the PR link.
