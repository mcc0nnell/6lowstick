// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import {simulateFestival} from './model.mjs';

function usage() {
  return [
    '6low ZERO — synthetic festival capacity simulator (NO REAL RF)',
    'node experiments/festival-zero/cli.mjs [--scenario baseline|outage|peak]',
    '  [--attendees 250] [--minutes 45] [--seed 6] [--reactor north|south] [--json]',
    'No physical radio, 6lowLoop packets, app receipts or human outcomes are tested.'
  ].join('\n');
}
function parse(argv) {
  let scenario = 'baseline', attendees = null, minutes = 45, seed = 6, reactor = 'north', json = false;
  const take = (index) => {
    if (!argv[index + 1] || argv[index + 1].startsWith('--'))
      throw new Error('Missing value after ' + argv[index]);
    return argv[index + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help') return {help:true};
    if (argv[i] === '--json') json = true;
    else if (argv[i] === '--scenario') scenario = take(i++);
    else if (argv[i] === '--attendees') attendees = Number(take(i++));
    else if (argv[i] === '--minutes') minutes = Number(take(i++));
    else if (argv[i] === '--seed') seed = Number(take(i++));
    else if (argv[i] === '--reactor') reactor = take(i++);
    else throw new Error('Unknown option: ' + argv[i]);
  }
  if (!['baseline','outage','peak'].includes(scenario))
    throw new Error('Scenario must be baseline, outage, or peak');
  return {scenario, attendees: attendees ?? (scenario === 'peak' ? 2000 : 250),
    minutes, seed, reactor, json};
}
try {
  const args = parse(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage() + '\n');
  } else {
    const report = simulateFestival({
      attendees:args.attendees, minutes:args.minutes, seed:args.seed, reactor:args.reactor,
      reactorOutageAtMinute:args.scenario === 'outage' ? Math.floor(args.minutes / 2) : null
    });
    if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    else {
      const t = report.totals;
      process.stdout.write([
        '6low ZERO / ' + args.scenario.toUpperCase() + ' / MODEL ONLY / REACTOR ' + args.reactor.toUpperCase(),
        'Attendees: ' + args.attendees + ' | Minutes: ' + args.minutes + ' | Seed: ' + args.seed,
        'Modeled attempts: ' + t.attempted,
        'Modeled delivered: ' + t.modeledDelivered + ' (' + t.modeledDeliveryPercent + '%)',
        'Not delivered in model: ' + t.notDeliveredInModel,
        'Routes delivered: local Thread ' + t.threadLocal + ' | inter-station Thread ' +
          t.threadGateway + ' | LoRa relay ' + t.loraRelay,
        'Failure reasons: ' + JSON.stringify(t.failures),
        'Local Thread during Reactor outage: ' + report.invariants.localThreadDuringOutage,
        'This is not real RF or a reliability prediction. Use --json for timeline.'
      ].join('\n') + '\n');
    }
  }
} catch (err) {
  process.stderr.write('Festival simulator: ' + err.message + '\n' + usage() + '\n');
  process.exitCode = 1;
}
