# First Light — separate output evidence

**Status: offline evidence correlation only. No physical observation has been made.**

The OpenThread POSIX First Journey can now record a timestamped receiver-side
`signal.outputRequest` when Sam's 6lowFlare application accepts an authenticated
`here` message. The record includes a randomly generated, run-local session
ID, nonce-derived request ID, application admission time in Unix milliseconds,
and requested text/haptic modalities.

That record is **an application request**, not proof the output device
activated or somebody noticed it.

The review CLI also records SHA-256 over the **exact bytes** of both supplied
input files to support reproducibility. Checksums do not authenticate an
instrument, prove sample accuracy, or convert capture claims into measurements.

## Receiver request -> separate sensor capture -> offline comparison

With a separately built OpenThread simulated CLI:

```sh
OT_CLI_PATH=/absolute/path/to/ot-cli-ftd npm run loop:posix -- --json > /tmp/journey.json
```

The command above records only POSIX simulated-network application activity.

A later, **independent lab instrument** may record light (lux) or haptic
acceleration (m/s2) samples in an operator-provided JSON file. This
repository does **not** talk to a sensor, generate sensor samples on demand,
drive an LED or haptic actuator, or independently verify where a JSON file
came from.

The offline review command is:

```sh
node scripts/first-light-review.mjs \
  --journey /tmp/journey.json \
  --capture /path/to/external-sensor-capture.json \
  --window-ms 500
```

A capture must contain a schema, run-local session ID, instrument label,
claimed calibration digest, clock-error bound, and bounded observation array.
The operator obtains the session ID from the POSIX journey; its matching
value **is not an authentication credential**. One illustrative *schema*
example (not a real measurement) is:

```json
{
  "schema": "6lowstick.first-light-capture.v0",
  "source": "operator-supplied-sensor-capture",
  "sessionId": "000000000000000000000000",
  "instrument": "bench-accelerometer",
  "calibrationSha256": "1111111111111111111111111111111111111111111111111111111111111111",
  "clockUncertaintyMs": 10,
  "observations": [
    {"modality":"haptic","atUnixMs":100100,"value":1.5,"unit":"m/s2"}
  ]
}
```

That example is **synthetic documentation data** and will be rejected as
unrelated to a real POSIX result unless its session ID matches. The
calibration digest is an **operator claim**, not a validated certificate.

## Interpreting the review

The reviewer checks bounded schemas, time uncertainty, independent-file
session matching, modality labels, and whether sensor events fall within the
configured request-to-observation window. It uses three conservative labels:

- `time-correlated-candidate`: exactly one matching event in the submitted
  sensor file, with unverified provenance and no independent threshold review
- `not-observed-in-supplied-capture`: no matching event was recorded; this
  does not prove the output device stayed off
- `ambiguous-multiple-candidates`: multiple events could correspond to the
  request and cannot be attributed uniquely

Text is reported as `notSensorMeasured`, since lux/accelerometer samples do
not establish a displayed text string or its accessibility. Every report
retains `physicalOutputVerified: false` and
`humanDetected: "unknown"` and `humanUnderstood: "unknown"`, **even if**
a sample falls in the window. Calibration, clock sync, raw sensor integrity,
true actuation and human reception require separate laboratory verification.

No capture is produced by `npm test`, and no synthetic receipt is promoted
to a physical-output claim. This analysis has no transmission, serial-port,
GPIO, USB, actuator or emergency-dispatch functionality.

## Hardware First Light gate

Only after lawful, explicitly authorized controlled bench setup, independent
sensor calibration and independently acquired raw readings should the team
attempt a physical result. Collect the source and simulator or firmware
commits, host and instrument identities, device versions, clock uncertainty,
original sensor file SHA-256, independent stop/power controls and every failed
trial. Human detection and comprehension are separate consent-based gates.

See the [physical bench protocol](physical-radio-test-protocol.md),
[6lowSpark A0 development](6lowspark.md), and
[First Journey POSIX integration](6lowloop-posix.md).
