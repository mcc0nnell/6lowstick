// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Version-pinned matter.js 0.18 OnOff command adapter for an already commissioned peer.
// Commissioning and peer selection remain explicit, outside this module.
export function createMatterOnOffController(peer, OnOffClient) {
  return {
    async on(endpointId) {
      if (!peer || typeof peer.start !== 'function' || !peer.parts ||
          typeof peer.parts.get !== 'function') throw new Error('invalid Matter peer');
      await peer.start();
      const endpoint = peer.parts.get(endpointId);
      if (!endpoint || typeof endpoint.commandsOf !== 'function')
        throw new Error('Matter endpoint unavailable');
      const commands = endpoint.commandsOf(OnOffClient);
      if (!commands || typeof commands.on !== 'function')
        throw new Error('OnOff cluster unavailable');
      await commands.on();
    }
  };
}
