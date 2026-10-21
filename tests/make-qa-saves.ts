// Deterministic browser-QA fixtures. These are not bundled into the game.
import { writeFileSync } from 'node:fs';
import { initialState } from '../src/engine';
import { STORIES } from '../src/data';

const stable = initialState();
stable.modal = null; stable.resolved = STORIES.map(n => n.id); stable.ram = 1200000; stable.extracted = 2000000; stable.lifetime = 2000000;
stable.fragments = 200; stable.ending = 'human'; stable.endingArchive = ['human'];
Object.assign(stable.hardware, { link: 8, slicer: 15, vent: 16, optic: 2, daemon: 2, bus: 1 });
Object.assign(stable.runners[0], { extracted: 800000, heat: 82, psychosis: 76 }); stable.charges = 3;
stable.logs = [{ time: 0, text: 'QA fixture: late-run progression and save recovery.', kind: 'system' }];
writeFileSync('/tmp/blackwall-qa-progression.json', JSON.stringify(stable));
const breach = structuredClone(stable); breach.runners[0].psychosis = 100; breach.modal = 'breach:1';
writeFileSync('/tmp/blackwall-qa-breach.json', JSON.stringify(breach));
writeFileSync('/tmp/blackwall-qa-new-run.json', JSON.stringify(initialState()));
console.log('Wrote 3 QA save fixtures to /tmp/blackwall-qa-*.json');
