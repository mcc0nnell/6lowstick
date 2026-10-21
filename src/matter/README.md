# Consumer Matter lighting experiment

This **disabled-by-default, mock-tested** adapter is a boundary for a future
commissioned Matter controller. It accepts a *previously validated synthetic*
6lowStick gateway alert and asks an injected controller to send an On command.
No Matter SDK, bulb, radio, hub, pairing, or network is currently integrated.

Matter commissioning and Thread membership are separate steps. For Nanoleaf
Matter-over-Thread bulbs, commission using a compatible Matter controller and
Thread border router; follow the manufacturer's pairing instructions. The
Matter controller implementation must adapt the injected `on(endpointId)`
interface to the OnOff cluster's On command. Do not use the Nanoleaf Matter-over-
Wi-Fi REST API for Thread-only bulbs.

The consumer lighting path is **supplementary only** and must never be relied on
for emergency notification, egress, or protective action. Do not translate a
weather warning to flashing or evacuation guidance without a reviewed safety
policy. No alert can reach the mock bridge unless `enabled: true` is explicitly
supplied. A completed command is not evidence that a light illuminated.

Next: implement and test a version-pinned Matter controller against a virtual
Matter bulb; only then commission a physical Matter-over-Thread bulb and measure
command, device-state, and visible-light outcomes independently.
