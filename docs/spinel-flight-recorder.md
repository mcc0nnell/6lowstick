# Spinel Flight Recorder — offline-first research boundary

The initial module consumes **copies of captured bytes**, never the live
OpenThread RCP serial device. The Thread border router must retain exclusive
control of its RCP. Do not attach a second controller to the port.

`recordSpinelCapture` splits HDLC-lite delimited frames, handles escape bytes,
limits frame sizes, and records only length and SHA-256 fingerprints. It does
not store sensitive payloads, validate frame CRC/FCS, decode Spinel commands,
prove frame integrity, or assert actual radio activity. Incomplete trailing
frames are discarded. A later version should add FCS verification, read-only
command/property decoding, timestamps and documented capture provenance.

For hardware testing, obtain authorized mirrored traffic or instrument the
existing host driver without modifying its behavior. No capture is authorized
merely by having this recorder in the repository.
