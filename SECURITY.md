# Security policy — experimental 6lowStick research

**6lowStick is NOT a production emergency warning system.** No release
in the 0.x research series is supported for public alert dispatch,
life-safety decisions, operational NOAA/SAME origination, or control
of uncommissioned radios or actuators.

## Research-only scope

The default project routes are synthetic or read-only. The protocol
parsers and local lab code have not completed an independent security
audit. A successful fuzzing campaign, CRC validation, app receipt,
simulation result, or passing CI cannot establish absence of defects.

There is no published security-update SLA or bug bounty associated with
this repository. For a suspected security issue, **avoid opening a
public issue containing exploit details, credentials, or private radio
captures**. Prefer GitHub's private vulnerability reporting or a
repository-owner-approved private channel where available; if unavailable,
ask the maintainer for a private channel without disclosing sensitive
details publicly.

Reports should include affected commit/version, test environment,
minimal sanitized reproduction, security impact, scope and relevant
observed behavior. Do not probe third-party infrastructure, radio
devices, or emergency broadcast systems without explicit authorization.

Security fixes and compatibility changes are reviewed before tags.
No assertion of certified, secure or reliable operation is made.
