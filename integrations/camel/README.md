# Camel 4.22.1 / 6lowStick observation route

Camel is an optional **development-only observability adapter**. The 6lowStick Mesh Control TUI stays the research control room. Camel never connects to the Thread gateway, Matter controller, SDR, NOAA receiver, or alert authority. It sees a separately exported directory of sanitized copies derived from the synthetic lab JSON.

## Architecture

~~~text
OpenThread POSIX lab  ->  evidence/mesh-run.json
                                   |
                            allowlist exporter
                                   |
                    evidence/camel-observations/*.json
                                   |
                    Camel 4.22.1 local file consumer
                         noop + idempotent
                                   |
                      ConvertBodyTo(String)
                                   |
                           local log sink
                                   |
                        Camel TUI / Activity
~~~

Exported observations contain only a declared schema, SHA-256 source fingerprint, reconstructed sequence, phase, observation kind, receiver name, explicit meaning, and optional application ACK latency. No alert ID, SAME payload, HMAC key, original packet, or arbitrary error string is forwarded. Phase ordering is not measured packet timing.

## Reproduce on a development machine

Requires Node 22+, Java 17/21/25, and Apache Camel CLI **4.22.1**. Verify the installed version with the Camel CLI version command. Follow the official Camel pinned installation instructions at https://camel.apache.org/manual/camel-jbang-installation.html .

From the repository root:

~~~sh
npm ci
npm run camel:export -- --demo
# Alternatively, after a synthetic OpenThread POSIX lab run:
# npm run camel:export -- --input evidence/mesh-run.json
camel run integrations/camel/mesh-observe.camel.yaml
~~~

In another terminal:

~~~sh
camel tui
~~~

Camel's route and Activity screens inspect the sanitized events. The local exporter itself has no Camel runtime dependency. Re-exporting the same evidence produces no additional spool files. The spool lives in the ignored evidence directory.

The 6lowStick TUI continues to work independently:

~~~sh
npm run tui -- --demo
npm run tui -- --demo --report
~~~

## What the evidence means

- The Camel route has only one local file input and one local log output. No Thread or Matter transmission path is configured.
- Noop mode leaves spool files in place. Default in-memory file idempotency can reset when Camel restarts; log events can be seen again.
- Camel route success indicates a **processed evidence copy**, not a new receiver ACK, physical actuation, or human notification.
- Ordered lab steps are reconstructed from phases in the final harness JSON. They do not establish packet arrival order, RF topology, or continuous message-propagation timing.
- Camel TUI is a developer tool that can control its own local Camel routes. It is not an access-controlled production console. Never give this route emergency dispatch authority or live credentials.

## Verification on Butcher

With a separately downloaded, SHA-1-checked Camel CLI Launcher 4.22.1 JAR in a temporary scratch checkout, the example route started and logged 19 sanitized demonstration observations as string bodies. The run was stopped by a local timeout after its messages were handled; it was not deployed as a service. All 26 Node tests passed on Node 22. No physical radio, live NOAA receiver, Matter device or human delivery was verified.

This is experimental research, **not life-safety infrastructure**.
