# Synthetic SAME fixture scenarios

No strings here are live warnings. The existing tests cover:

- In-area TOR accepted for a fixed clock (synthetic drill only)
- Out-of-area warning rejected
- Unsupported RWT rejected by narrow event allowlist
- Expired and future warning rejected
- Malformed, duplicated-area and oversized headers rejected

Pending: standards-verified watch, cancellation, EOM and triple-header audio fixtures. Never treat these strings as a production SAME conformance corpus.
