import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine, initialState, makeRunner, validateSave } from '../src/engine';
import { STORIES, META } from '../src/data';

function sandbox() { const s = initialState(); s.modal = null; s.resolved = STORIES.map(n => n.id); return new Engine(s); }
function advance(e: Engine, seconds: number) { for (let i = 0; i < Math.round(seconds * 20); i++) e.tick(.05); }
const near = (actual: number, expected: number, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('accepted input earns heat and RAM once; excess rate earns neither', () => {
  const e = sandbox(); e.pulse(1000); assert.equal(e.s.ram, 10); near(e.runner.heat, 1.5);
  e.pulse(1100); assert.equal(e.s.ram, 10); near(e.runner.heat, 1.5);
  e.pulse(1200); assert.equal(e.s.ram, 20); near(e.runner.heat, 3);
});
test('stable fixed simulation produces equal output at 30, 60 and 144 rendering FPS', () => {
  const outputs = [30,60,144].map(fps => { const e = sandbox(); e.s.hardware.slicer = 4; let accumulator = 0; for(let frame=0;frame<fps*60;frame++){ accumulator += 1/fps;while(accumulator + 1e-10 >= .05){ e.tick(.05);accumulator -= .05; } } return [e.s.ram,e.runner.heat,e.runner.psychosis]; });
  for (const out of outputs) { near(out[0],1920);near(out[1],0);near(out[2],0); }
});
test('saturation begins only above safe heat and does not decay on cooling', () => {
  const e = sandbox(); e.runner.heat=70;advance(e,1);assert.equal(e.runner.psychosis,0);
  e.runner.heat=100;advance(e,1);assert.ok(e.runner.psychosis>.6);const p=e.runner.psychosis;e.runner.heat=0;advance(e,10);near(e.runner.psychosis,p);
});
test('stage intervals are exact and deterministic phantom pulses stay visible', () => {
  const e = sandbox(); e.runner.psychosis=25;near(e.clickYield(),11.5);e.runner.psychosis=50;near(e.clickYield(),14);
  for(let i=0;i<10;i++)e.pulse(1000+i*200);near(e.s.ram,126);assert.equal(e.runner.pulses,10);
  e.runner.psychosis=75;near(e.clickYield(),20);assert.equal(e.stage,'BLACKWALL DRIFT');
});
test('corruption returns double yield on alternating phantom pulses', () => {
  const e = sandbox();e.runner.psychosis=50;e.runner.branch='daemon';e.runner.skills=['corruption'];
  for(let i=0;i<20;i++)e.pulse(1000+i*200);near(e.s.ram,14*18+28);
});
test('vent remains available at zero reserve and has a cooldown', () => {
  const e=sandbox();e.runner.heat=100;e.vent();near(e.runner.heat,50);assert.equal(e.s.ram,0);e.vent();near(e.runner.heat,50);advance(e,20.1);e.runner.heat=90;e.vent();near(e.runner.heat,40);
});
test('suppression blocks growth but toxicity persists and cannot stack', () => {
  const e=sandbox();e.s.charges=2;e.runner.heat=100;e.suppress();e.suppress();assert.equal(e.s.charges,1);advance(e,1);near(e.runner.psychosis,0);assert.ok(e.runner.toxicity>58);near(e.heatMultiplier(e.runner),1.25);
});
test('purge respects the AI floor and preserves historical production', () => {
  const e=sandbox();e.s.ram=1000;e.s.extracted=8000;e.runner.floor=50;e.runner.psychosis=90;e.runner.heat=100;e.purge();near(e.runner.psychosis,50);near(e.s.ram,900);near(e.s.extracted,8000);assert.equal(e.s.connected,false);e.toggleConnection();assert.equal(e.s.connected,false);advance(e,10.1);e.toggleConnection();assert.equal(e.s.connected,true);
});
test('a breach latches exactly once and cannot be bypassed by a vent', () => {
  const e=sandbox();e.runner.psychosis=100;e.check();assert.equal(e.s.modal,'breach:1');const logs=e.s.logs.length;e.tick(.05);e.vent();assert.equal(e.s.logs.length,logs);assert.equal(e.runner.psychosis,100);e.contain('flush');assert.equal(e.s.modal,null);assert.equal(e.runner.psychosis,0);assert.equal(e.s.survived,1);e.contain('flush');assert.equal(e.s.survived,1);
});
test('all containment routes recover from zero RAM', () => {
  for(const action of ['flush','replace','ghost']){const e=sandbox();e.runner.psychosis=100;e.check();e.contain(action);assert.equal(e.s.modal,null);assert.equal(e.runner.psychosis,0);assert.ok(e.s.ram>=0);if(action==='ghost'){assert.equal(e.runner.mode,'ghost');e.retireGhost();assert.equal(e.runner.mode,'human');}}
});
test('ghost instability charges once per cycle and freezes when disconnected', () => {
  const e=sandbox();e.convertGhost(e.runner);e.s.ram=1000;advance(e,50.1);near(e.s.ram,950);advance(e,5);near(e.s.ram,950);e.s.connected=false;const clock=e.runner.ghostClock;advance(e,10);near(e.runner.ghostClock,clock);
});
test('production gets attributed to the correct runner without multiplying den output', () => {
  const e=sandbox();e.s.hardware.slicer=10;e.s.runners.push(makeRunner(2,'Nyx'));advance(e,1);near(e.s.ram,80);near(e.s.runners[0].extracted,40);near(e.s.runners[1].extracted,40);
});
test('skill costs, specialization and prerequisites are enforced', () => {
  const e=sandbox();e.runner.extracted=600000;e.unlock('spike');assert.equal(e.runner.skills.length,0);e.unlock('impulse');assert.equal(e.sp(),5);e.unlock('sink');assert.equal(e.runner.skills.length,1);e.unlock('spike');e.unlock('frenzy');assert.equal(e.sp(),0);assert.equal(e.runner.skills.length,3);
});
test('Cognitive Anchor caps saturation but halves output at the cap', () => {
  const e=sandbox();e.runner.branch='cryo';e.runner.skills=['sink','ice','anchor'];e.runner.psychosis=94.99;e.runner.heat=100;advance(e,1);near(e.runner.psychosis,95);near(e.outputModifier(e.runner),.5);assert.equal(e.s.modal,null);
});
test('Digital Fusion avoids a modal and is not repeated on subsequent ticks', () => {
  const e=sandbox();e.runner.branch='daemon';e.runner.skills=['corruption','breach','fusion'];e.runner.psychosis=100;e.check();assert.equal(e.runner.mode,'ghost');assert.equal(e.runner.ghostBonus,1000);e.check();assert.equal(e.runner.ghostBonus,1000);assert.equal(e.s.modal,null);
});
test('Blackwall Breach has explicit conversion units and cannot spend below an AI floor', () => {
  const e=sandbox();e.runner.branch='daemon';e.runner.skills=['corruption','breach'];e.runner.floor=50;e.runner.psychosis=52;e.ability('breach');near(e.runner.psychosis,50);near(e.s.ram,200);e.ability('breach');near(e.s.ram,200);
});
test('meta tree prerequisites, integer costs and tier caps hold', () => {
  const e=sandbox();e.s.fragments=100000;e.buyMeta('archive');assert.equal(e.s.meta.archive,0);e.buyMeta('shadow');e.buyMeta('insulator');e.buyMeta('capri');e.buyMeta('bypass');e.buyMeta('autopurge');e.buyMeta('archive');assert.equal(e.s.meta.archive,1);for(let i=0;i<20;i++)e.buyMeta('bypass');assert.equal(e.safeHeat,85);for(const d of META)for(let i=0;i<d.max;i++)assert.ok(Number.isInteger(d.price(i)));
});
test('auto-vent is free, has its own cooldown, and runs before saturation growth', () => {
  const e=sandbox();e.s.meta.autopurge=1;e.runner.heat=100;e.tick(.05);assert.ok(e.runner.heat<51);assert.equal(e.runner.psychosis,0);assert.equal(e.s.ram,0);assert.equal(e.runner.autoCd,120);
});
test('all story paths advance without mandatory high saturation', () => {
  for (const path of [['boot','protect','quarantine','witness','firewall','preserve','route','identity','human','finish'],['boot','strip','trace','payload','accept','sell','decoy','fracture','digital','finish'],['boot','protect','trace','witness','firewall','preserve','route','identity','ash','finish']]) {
    const e=new Engine();for(let i=0;i<STORIES.length;i++){e.s.extracted=STORIES[i].threshold;e.check();assert.equal(e.s.modal,'story:'+STORIES[i].id);e.choose(path[i]);assert.ok(e.s.resolved.includes(STORIES[i].id));}assert.equal(e.s.resolved.length,10);assert.ok(e.s.ending);assert.equal(e.s.modal,null);
  }
});
test('Cognitive Anchor also protects against story saturation injections', () => {
  const e=new Engine();e.choose('boot');e.s.extracted=10000;e.check();e.choose('strip');e.runner.branch='cryo';e.runner.skills=['sink','ice','anchor'];e.runner.psychosis=94;e.choose('trace');assert.equal(e.runner.psychosis,95);assert.equal(e.s.modal,null);
});
test('replacement removes the den-wide AI multiplier and identity floor', () => {
  const e=sandbox();e.s.flags=['ai'];e.runner.floor=50;e.runner.psychosis=100;e.s.runners.push(makeRunner(2,'Nyx'));e.s.runners[1].floor=50;e.s.runners[1].psychosis=50;e.check();e.contain('replace');assert.equal(e.has('ai'),false);assert.equal(e.s.runners[1].floor,0);assert.equal(e.runner.mode,'human');
});
test('corrupted primary save falls back to the previous valid snapshot; quota errors do not crash play', () => {
  const memory=new Map<string,string>();
  const storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);}};
  const e=new Engine(sandbox().s,storage);e.s.ram=100;e.save();e.s.ram=200;e.save();memory.set('blackwall-save','{broken');const restored=new Engine(initialState(),storage);restored.load();assert.equal(restored.s.ram,100);assert.equal(restored.storageMessage,'BACKUP RESTORED');storage.setItem=()=>{throw new Error('QuotaExceeded');};assert.doesNotThrow(()=>e.buy('link'));assert.equal(e.storageMessage,'SAVE UNAVAILABLE · EXPORT BACKUP');
});
test('a story injection queues containment before the next eligible event', () => {
  const e=new Engine();e.choose('boot');e.s.extracted=25000;e.check();e.choose('strip');assert.equal(e.s.modal,'story:signal');e.runner.psychosis=95;e.choose('trace');assert.equal(e.s.modal,'breach:1');e.contain('flush');assert.equal(e.s.modal,'story:name');
});
test('story grants and purchases never inflate extraction counters', () => {
  const e=new Engine();e.choose('boot');e.s.extracted=1000;e.check();e.choose('strip');assert.equal(e.s.ram,300);assert.equal(e.s.extracted,1000);e.buy('link');assert.equal(e.s.extracted,1000);
});
test('prestige uses run production, capped breach credit, and cannot double-claim', () => {
  const e=sandbox();e.s.extracted=1e6;e.s.lifetime=100e6;e.s.ending='human';e.s.fragments=2;e.s.meta.shadow=1;e.s.survived=50;assert.equal(e.fragmentReward,2);e.openModal('prestige');e.prestige();assert.equal(e.s.fragments,4);assert.equal(e.s.run,2);assert.equal(e.s.meta.shadow,1);assert.equal(e.s.lifetime,100e6);assert.equal(e.s.extracted,0);e.prestige();assert.equal(e.s.fragments,4);
});
test('paused and modal simulations do not consume bonuses or produce resources', () => {
  const e=sandbox();e.s.hardware.slicer=1;e.s.trace=120;e.s.paused=true;advance(e,60);assert.equal(e.s.ram,0);assert.equal(e.s.trace,120);assert.equal(e.s.time,0);e.s.paused=false;e.s.modal='help';advance(e,60);assert.equal(e.s.time,0);
});
test('valid saves round-trip pending choices and reject malformed state atomically', () => {
  const e=new Engine();const original=JSON.stringify(e.s);e.importSave(original);assert.equal(e.s.modal,'story:boot');assert.deepEqual(validateSave(JSON.parse(original)),JSON.parse(original));
  for(const mutate of [(s:any)=>s.ram=-1,(s:any)=>s.runners[0].heat=999,(s:any)=>s.hardware.link=10000,(s:any)=>s.modal='story:missing',(s:any)=>s.runners[0].skills=['fusion']]){const invalid=JSON.parse(original);mutate(invalid);assert.throws(()=>e.importSave(JSON.stringify(invalid)));assert.equal(JSON.stringify(e.s),original);}
});
