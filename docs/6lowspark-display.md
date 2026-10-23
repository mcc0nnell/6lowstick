# 6lowSpark Display — standalone communicator concept

**Status: hardware proposal with a simulation-only display model.**
No screen, electronics, standalone device, mobile application, real radio,
physical output or independent measurement has been built.

## Product decision

Give the magnetic battery an **outward-facing screen** that stays useful
when detached from the phone. The intended use is opt-in friend-finding,
short group signals, battery status and local communication reserve.

The first candidate is a 1.28-inch **128x128 monochrome Memory LCD**
(Sharp LS013B7DH03 class). It is a supplier research candidate, not a
selected or tested BOM. Panel microwatt figures do not include MCU,
frontlight, radios, haptics, charging electronics, battery conversion losses
or enclosure effects. A separately budgeted frontlight matters at night.
Compare memory LCD, e-paper and OLED using actual sunlight, refresh,
darkness and complete-system power measurements.

Two tactile buttons are proposed for navigation and confirmation.
Navigation never transmits. A send action, pairing or security key operation
must require independently enforced firmware policy and local authorization.
Offer haptic and visible confirmations. A dead phone should not prevent
a user from viewing status, disabling radio discovery or rejecting relays.

## Four screens

- **Home:** battery estimate, available *modeled* network path, privacy lock.
- **People:** only consented and locally paired friends with unexpired
  application evidence; recent contact never equals measured GPS distance.
- **Signals:** bounded purpose codes and application ACKs; actual physical
  output and human detection remain **unknown** without independent evidence.
- **Power:** estimated percentage, communication reserve threshold and
  requested charging state. The display cannot drive the battery controller.

On the lock screen, reveal **no contact aliases, counts, signal codes,
location or message previews**. Use large glyphs, visible focus, simple
contrast and meaningful haptics. Test readability, gloves, mobility,
perception and comprehension with consenting participants.

## Trust boundary

    companion phone (optional) -- authenticated BLE --+
    local device identity, permissions and expiry ------+--> trusted state
    separately validated Thread/LoRa application path --+
                                                        |
                                              pure display frame
                                                        |
                                              hypothetical pixels
                                                        |
                                                 NO AUTHORITY

Actual TX, secure signing, relay opt-in, charging cutoffs and actuators
belong to separate, explicitly trusted hardware/firmware state machines.
The display must never hold key material or manufacture a delivery claim.
It cannot authorize an emergency signal. The screen cannot prove that a
human received anything.

## Executable display model

The checked-in JavaScript at src/spark/display.mjs accepts **synthetic,
caller-supplied** state and returns up to eight ASCII text lines, each
up to 16 characters, for a hypothetical monochrome screen. It is a pure
projection without side effects, device drivers or rendering hardware.

Pages: home, people, signals, power.
Navigation: next or back. Neither event creates a message or send intent.

    node --test test/spark-display.test.mjs

Tests cover locked privacy redaction, consent and expiration,
malformed input rejection, bounded output, alias control-character
escaping, simulation-only evidence claims and passive reserve status.
A successful test is not hardware validation or accessible device testing.

## Physical validation gates

1. Prototype the screen and independent buttons on a bench; measure optical
   readability and demonstrate display operation with phone disconnected.
2. Capture full device current in idle, updates, frontlight, haptic,
   BLE, Thread and separately scoped LoRa modes. Set an evidence-based
   refresh policy. Do not infer battery endurance from the panel datasheet.
3. Instrument charging, thermal rise, antenna detuning next to the phone,
   communication reserve, and battery-protection behavior independently.
4. Validate paired-device identity, revocation, local unlock, anti-stalking
   choices, secure boot/update provenance and state after reboot.
5. Distinguish attempted TX, application ACK, physical output and human
   perception in controlled, consent-based trials.

**No production or safety claims.** Lithium charging and Qi2 certification
require qualified design, test facilities and official approval.

## References

- [Sharp LS013B7DH03 panel candidate](https://www.datasheets.com/sharp/ls013b7dh03)
- [Wireless Power Consortium Qi2 profile](https://www.wirelesspowerconsortium.com/media/w0ha5cbk/qi2-certification-rolls-out-news-release-11132023.pdf)
- [6lowSpark product concept](6lowspark.md)
- [First Light research plan](first-light/README.md)
