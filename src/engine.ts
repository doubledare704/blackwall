import { HARDWARE, META, SKILLS, STORIES, cost, type Branch } from './data';

export interface Runner {
  id: number; name: string; heat: number; psychosis: number; floor: number; extracted: number;
  branch: Branch | null; skills: string[]; mode: 'human' | 'ghost'; ghostBonus: number;
  pulses: number; ventCd: number; purgeCd: number; suppression: number; toxicity: number;
  spikeCd: number; iceCd: number; ice: number; breachCd: number; autoCd: number; ghostClock: number;
}
export interface GameState {
  version: 1; ram: number; extracted: number; lifetime: number; fragments: number; run: number;
  hardware: Record<string, number>; meta: Record<string, number>; runners: Runner[]; selected: number;
  flags: string[]; resolved: string[]; ending: string; endingArchive: string[]; survived: number;
  charges: number; duty: number; connected: boolean; paused: boolean; time: number; rng: number;
  trace: number; route: number; lockClock: number; logs: { time: number; text: string; kind: string }[];
  settings: { sound: boolean; motion: boolean; effects: boolean }; modal: string | null;
}
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
export const makeRunner = (id: number, name: string): Runner => ({ id, name, heat: 0, psychosis: 0, floor: 0, extracted: 0, branch: null, skills: [], mode: 'human', ghostBonus: 0, pulses: 0, ventCd: 0, purgeCd: 0, suppression: 0, toxicity: 0, spikeCd: 0, iceCd: 0, ice: 0, breachCd: 0, autoCd: 0, ghostClock: 0 });
export const initialState = (): GameState => ({
  version: 1, ram: 0, extracted: 0, lifetime: 0, fragments: 0, run: 1,
  hardware: Object.fromEntries(HARDWARE.map(d => [d.id, 0])), meta: Object.fromEntries(META.map(d => [d.id, 0])),
  runners: [makeRunner(1, 'Vex')], selected: 1, flags: [], resolved: [], ending: '', endingArchive: [], survived: 0,
  charges: 0, duty: 1, connected: true, paused: false, time: 0, rng: 39021, trace: 0, route: 0, lockClock: 0,
  logs: [{ time: 0, text: 'Secure tunnel established. Night City sub-grid is listening.', kind: 'system' }],
  settings: { sound: false, motion: true, effects: true }, modal: 'story:boot',
});

export function validateSave(value: unknown): GameState {
  const s = value as GameState;
  if (!s || s.version !== 1 || !Array.isArray(s.runners) || s.runners.length < 1 || s.runners.length > 4) throw new Error('Unsupported save');
  const finite = (n: unknown, max = 1e100) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max;
  for (const k of ['ram', 'extracted', 'lifetime', 'fragments', 'run', 'selected', 'survived', 'charges', 'time', 'rng', 'trace', 'route', 'lockClock'] as const) if (!finite(s[k])) throw new Error(`Invalid ${k}`);
  if (!finite(s.duty, 1) || !s.hardware || !s.meta) throw new Error('Invalid hardware');
  for (const d of HARDWARE) if (!Number.isInteger(s.hardware[d.id]) || !finite(s.hardware[d.id], d.max)) throw new Error('Invalid upgrade');
  for (const d of META) if (!Number.isInteger(s.meta[d.id]) || !finite(s.meta[d.id], d.max)) throw new Error('Invalid meta');
  if (!s.settings || ['sound', 'motion', 'effects'].some(k => typeof s.settings[k as keyof typeof s.settings] !== 'boolean')) throw new Error('Invalid settings');
  if (typeof s.connected !== 'boolean' || typeof s.paused !== 'boolean' || typeof s.ending !== 'string') throw new Error('Invalid state');
  for (const a of [s.flags, s.resolved, s.endingArchive]) if (!Array.isArray(a) || a.length > 100 || a.some(v => typeof v !== 'string' || v.length > 100)) throw new Error('Invalid flags');
  if (!Array.isArray(s.logs) || s.logs.length > 100 || s.logs.some(l => !finite(l.time) || typeof l.text !== 'string' || l.text.length > 500 || typeof l.kind !== 'string')) throw new Error('Invalid logs');
  const ids = new Set<number>();
  for (const r of s.runners) {
    if (!r || !finite(r.id, 4) || !Number.isInteger(r.id) || ids.has(r.id) || typeof r.name !== 'string' || r.name.length > 40) throw new Error('Invalid runner');
    ids.add(r.id);
    for (const [k, v] of Object.entries(makeRunner(1, ''))) if (typeof v === 'number' && !finite(r[k as keyof Runner])) throw new Error('Invalid runner number');
    if (r.heat > 100 || r.psychosis > 100 || r.floor > r.psychosis || r.floor > 50 || !['human', 'ghost'].includes(r.mode) || ![null, 'brute', 'cryo', 'daemon'].includes(r.branch)) throw new Error('Invalid runner mode');
    if (!Array.isArray(r.skills) || new Set(r.skills).size !== r.skills.length || r.skills.some(id => !SKILLS.some(d => d.id === id && d.branch === r.branch))) throw new Error('Invalid skills');
    const list = SKILLS.filter(d => d.branch === r.branch);
    for (const id of r.skills) { const d = list.find(v => v.id === id)!; if (d.tier > 1 && !r.skills.includes(list[d.tier - 2].id)) throw new Error('Invalid skill order'); }
  }
  if (!ids.has(s.selected)) throw new Error('Invalid selection');
  if (s.modal !== null && (typeof s.modal !== 'string' || !(['prestige','help','import'].includes(s.modal) || s.modal.startsWith('breach:') && ids.has(Number(s.modal.split(':')[1])) || s.modal.startsWith('story:') && STORIES.some(n => 'story:' + n.id === s.modal && !s.resolved.includes(n.id))))) throw new Error('Invalid modal');
  return structuredClone(s);
}

export class Engine {
  s: GameState;
  listeners = new Set<() => void>();
  storageMessage = 'LOCAL SAVE READY';
  onSound: (kind: string) => void = () => {};
  private inputClock = -1;
  private saveClock = 0;
  constructor(state = initialState(), private storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    this.s = state;
    if (!storage && typeof window !== 'undefined') {
      try { this.storage = window.localStorage; }
      catch { this.storageMessage = 'SAVE UNAVAILABLE · EXPORT BACKUP'; }
    }
  }
  get runner() { return this.s.runners.find(r => r.id === this.s.selected)!; }
  get blocked() { return this.s.paused || this.s.modal !== null; }
  get safeHeat() { return 70 + this.s.meta.bypass * 3; }
  get stage() { if (this.runner.mode === 'ghost') return 'GHOST CORE'; const p = this.runner.psychosis; return p >= 100 ? 'BREACH' : p >= 75 ? 'BLACKWALL DRIFT' : p >= 50 ? 'SPLINTERING' : p >= 25 ? 'NEURAL FRAYING' : 'NOMINAL'; }
  has(flag: string) { return this.s.flags.includes(flag); }
  flag(flag: string) { if (!this.has(flag)) this.s.flags.push(flag); }
  skill(r: Runner, id: string) { return r.skills.includes(id); }
  log(text: string, kind = 'system') { this.s.logs.unshift({ time: this.s.time, text, kind }); this.s.logs.length = Math.min(80, this.s.logs.length); }
  notify(save = false) { if (save) this.save(); this.listeners.forEach(f => f()); }
  random() { this.s.rng = (1664525 * this.s.rng + 1013904223) >>> 0; return this.s.rng / 4294967296; }
  baseYield() { return (10 + this.s.hardware.link) * (1 + .05 * this.s.meta.shadow + (this.has('production') ? .1 : 0) + (this.has('fracture') ? .2 : 0)); }
  clickYield(r = this.runner) { return this.baseYield() * (r.psychosis >= 75 ? 2 : r.psychosis >= 50 ? 1.4 : r.psychosis >= 25 ? 1.15 : 1) * (this.s.trace > 0 ? 1.5 : 1) * (this.skill(r, 'impulse') ? 1.5 : 1) * this.outputModifier(r); }
  outputModifier(r: Runner) { return (this.skill(r, 'frenzy') && r.psychosis >= 75 ? 2 : 1) * (this.skill(r, 'anchor') && r.psychosis >= 95 ? .5 : 1); }
  cooling(r = this.runner) { return (3 + this.s.hardware.vent * 1.5 + (this.has('identity') ? 1 : 0)) * (r.psychosis >= 25 ? .9 : 1) * (this.has('witness') ? 1.1 : 1) * (this.has('firewall') ? 1.25 : 1) * (this.s.route > 0 ? 1.25 : 1); }
  heatMultiplier(r: Runner) { return 1.1 ** this.s.hardware.bus * (r.toxicity > 0 ? 1.25 : 1) * (this.skill(r, 'sink') ? .75 : 1); }
  pulseHeat(r = this.runner) { return (1.5 + .2 * this.s.hardware.link) * this.heatMultiplier(r) * (this.skill(r, 'impulse') ? 1.3 : 1); }
  locked(r: Runner) { return r.psychosis >= 75 && this.s.lockClock % 15 >= 12; }
  passive(r: Runner) {
    if (!this.s.connected || this.locked(r) || r.mode === 'ghost' && r.ghostClock % 60 >= 50) return 0;
    const hw = this.s.hardware;
    return ((hw.slicer * 8 + hw.terminal * 500 + hw.daemon * this.baseYield()) / this.s.runners.length * 1.25 ** hw.bus * (1 + .2 * this.s.meta.capri) * (this.has('ai') && r.mode === 'human' ? 4 : r.mode === 'ghost' ? 2 : 1) + r.ghostBonus) * this.s.duty * this.outputModifier(r);
  }
  get totalPassive() { return this.s.runners.reduce((n, r) => n + this.passive(r), 0) + (this.s.connected ? this.s.meta.archive * 100 * this.s.duty : 0); }
  heatRate(r = this.runner) { if (r.mode === 'ghost') return 0; return (this.s.connected && !this.locked(r) ? (this.s.hardware.slicer * .5 + this.s.hardware.daemon * (1.5 + .2 * this.s.hardware.link)) / this.s.runners.length * this.s.duty * this.heatMultiplier(r) : 0) - this.cooling(r); }
  saturationRate(r = this.runner) { return r.mode === 'ghost' || r.suppression > 0 || r.heat <= this.safeHeat || this.skill(r, 'anchor') && r.psychosis >= 95 ? 0 : ((r.heat - this.safeHeat) * .025 * (1 + .025 * this.s.hardware.link) + this.s.hardware.terminal * 2) * (1 - this.s.meta.insulator * .08) * .85 ** this.s.hardware.mesh; }
  gain(amount: number, r?: Runner) { if (!(amount > 0)) return; this.s.ram += amount; this.s.extracted += amount; this.s.lifetime += amount; if (r) r.extracted += amount; }
  pulse(now: number) {
    const r = this.runner;
    if (this.blocked || !this.s.connected || r.mode !== 'human' || now - this.inputClock < 1000 / 6) return 0;
    this.inputClock = now; r.pulses++;
    const phantom = r.psychosis >= 50 && r.pulses % 10 === 0;
    const corrupt = phantom && this.skill(r, 'corruption') && r.pulses % 20 === 0;
    const critical = !phantom && this.random() < this.s.hardware.optic * .02;
    const amount = phantom ? corrupt ? this.clickYield(r) * 2 : 0 : this.clickYield(r) * (critical ? 5 : 1);
    this.gain(amount, r);
    if (r.ice <= 0) r.heat = clamp(r.heat + this.pulseHeat(r));
    this.onSound(critical ? 'critical' : phantom ? 'phantom' : 'pulse');
    this.check(); this.notify(); return amount;
  }
  tick(dt: number) {
    if (this.blocked || !(dt > 0) || dt > .1) return;
    this.s.time += dt; this.s.lockClock += dt;
    this.s.trace = Math.max(0, this.s.trace - dt); this.s.route = Math.max(0, this.s.route - dt);
    for (const r of this.s.runners) {
      for (const k of ['ventCd', 'purgeCd', 'suppression', 'toxicity', 'spikeCd', 'iceCd', 'ice', 'breachCd', 'autoCd'] as const) r[k] = Math.max(0, r[k] - dt);
      if (r.mode === 'ghost') {
        if (this.s.connected && this.s.duty > 0) {
          const before = r.ghostClock % 60; r.ghostClock += dt;
          if (before < 50 && r.ghostClock % 60 >= 50) { this.s.ram *= .95; this.log(`${r.name}: ghost instability. 5% reserve lost; output offline for 10 sec.`, 'danger'); this.save(); }
        }
      } else {
        r.heat = r.ice > 0 ? 0 : clamp(r.heat + this.heatRate(r) * dt);
        if (this.s.meta.autopurge > 0 && r.heat >= 95 && r.autoCd <= 0) { r.heat = clamp(r.heat - (this.s.hardware.exchanger ? 75 : 50)); r.autoCd = [120, 90, 60][this.s.meta.autopurge - 1]; this.log(`Autonomous purge protected ${r.name}.`, 'safe'); }
        r.psychosis = clamp(r.psychosis + this.saturationRate(r) * dt, r.floor, this.skill(r, 'anchor') ? 95 : 100);
      }
      this.gain(this.passive(r) * dt, r);
    }
    if (this.s.connected) this.gain(this.s.meta.archive * 100 * this.s.duty * dt);
    this.check(); this.saveClock += dt; if (this.saveClock >= 5) { this.saveClock = 0; this.save(); }
  }
  check() {
    for (const r of this.s.runners) if (r.mode === 'human' && this.skill(r, 'anchor')) r.psychosis = Math.min(95, r.psychosis);
    for (const r of this.s.runners) if (r.mode === 'human' && r.psychosis >= 100) {
      if (this.skill(r, 'fusion')) { this.convertGhost(r, 1000); continue; }
      this.s.modal = `breach:${r.id}`; this.log(`${r.name}: neural containment required. Simulation suspended.`, 'danger'); this.onSound('alarm'); this.save(); return;
    }
    if (this.s.modal) return;
    const next = STORIES.find(n => !this.s.resolved.includes(n.id));
    if (next && this.s.extracted >= next.threshold) { this.s.modal = 'story:' + next.id; this.onSound('story'); this.save(); }
  }
  buy(id: string) { if (this.blocked) return false; const d = HARDWARE.find(v => v.id === id); if (!d) return false; const level = this.s.hardware[id]; const price = cost(d, level); if (level >= d.max || this.s.ram < price) return false; this.s.ram -= price; this.s.hardware[id]++; this.log(`${d.name} installed. Level ${level + 1}.`, 'purchase'); this.onSound('buy'); this.notify(true); return true; }
  buyCharge() { if (this.blocked || this.s.ram < 500) return; this.s.ram -= 500; this.s.charges++; this.onSound('buy'); this.notify(true); }
  vent() { const r = this.runner; if (this.blocked || r.mode !== 'human' || r.ventCd > 0) return; this.s.ram -= Math.ceil(this.s.ram * .05); r.heat = clamp(r.heat - (this.s.hardware.exchanger ? 75 : 50)); r.ventCd = 20; this.log(`Cryo-vent flushed ${r.name}'s neural loop.`, 'safe'); this.onSound('vent'); this.notify(true); }
  suppress() { const r = this.runner; if (this.blocked || r.mode !== 'human' || this.s.charges < 1 || r.toxicity > 0) return; this.s.charges--; r.suppression = 15; r.toxicity = 60; this.log('Suppression active for 15 sec. Heat toxicity +25% for 60 sec.', 'safe'); this.onSound('vent'); this.notify(true); }
  purge() { const r = this.runner; if (this.blocked || r.mode !== 'human' || r.purgeCd > 0) return; this.s.ram *= .9; r.psychosis = r.floor; r.heat = 0; r.purgeCd = 120; r.ice = 10; r.suppression = 0; r.toxicity = 0; this.s.trace = 0; this.log(`Memory purge complete. Saturation returned to ${r.floor}%. Extraction suspended 10 sec.`, 'safe'); this.s.connected = false; this.onSound('vent'); this.notify(true); }
  toggleConnection() { if (this.blocked) return; if (!this.s.connected && this.s.runners.some(r => r.purgeCd > 110)) return; this.s.connected = !this.s.connected; this.log(this.s.connected ? 'Uplink reconnected.' : 'Uplink severed. Cooling remains online.', 'safe'); this.notify(true); }
  recruit() { const price = 25000 * 4 ** (this.s.runners.length - 1); if (this.blocked || this.s.runners.length >= 4 || this.s.ram < price) return; this.s.ram -= price; const id = this.s.runners.length + 1; const r = makeRunner(id, ['Vex', 'Nyx', 'Cipher', 'Zero'][id - 1]); if (this.has('ai')) { r.floor = 50; r.psychosis = 50; } this.s.runners.push(r); this.s.selected = r.id; this.log(`${r.name} joined the den. Shared automation load redistributed.`, 'safe'); this.notify(true); }
  sp(r = this.runner) { return Math.max(0, Math.floor(r.extracted / 100000) - r.skills.reduce((n, id) => n + (SKILLS.find(v => v.id === id)?.tier ?? 0), 0)); }
  unlock(id: string) { const r = this.runner; const d = SKILLS.find(v => v.id === id); if (this.blocked || !d || r.mode !== 'human' || r.skills.includes(id) || r.branch && r.branch !== d.branch || this.sp(r) < d.tier) return; const prev = SKILLS.find(v => v.branch === d.branch && v.tier === d.tier - 1); if (prev && !r.skills.includes(prev.id)) return; r.branch = d.branch; r.skills.push(id); this.log(`${r.name} learned ${d.name}.`, 'purchase'); this.onSound('buy'); this.notify(true); }
  ability(id: string) { const r = this.runner; if (this.blocked || r.mode !== 'human' || !this.skill(r, id)) return;
    if (id === 'spike' && r.spikeCd <= 0) { this.gain(200 * this.clickYield(r), r); r.heat = clamp(r.heat + 40); r.spikeCd = 30; }
    else if (id === 'ice' && r.iceCd <= 0) { r.heat = 0; r.ice = 10; r.iceCd = 45; }
    else if (id === 'breach' && r.breachCd <= 0) { const removed = Math.min(r.psychosis - r.floor, r.psychosis * .1); r.psychosis -= removed; this.gain(removed * 100, r); r.breachCd = 60; } else return;
    this.onSound('critical'); this.check(); this.notify(true);
  }
  convertGhost(r: Runner, bonus = 0) { r.mode = 'ghost'; r.ghostBonus = bonus; r.floor = 0; r.heat = 0; r.psychosis = 0; r.ghostClock = 0; this.log(`${r.name} became a Ghost Core. Manual extraction removed. Instability every 60 sec.`, 'danger'); }
  contain(action: string) { if (!this.s.modal?.startsWith('breach:')) return; const r = this.s.runners.find(v => v.id === Number(this.s.modal!.split(':')[1]))!;
    if (!['flush', 'replace', 'ghost'].includes(action)) return;
    if (action === 'ghost') this.convertGhost(r);
    else if (action === 'flush') { this.s.ram *= .1; Object.assign(r, makeRunner(r.id, r.name)); this.s.hardware.link = 0; this.s.flags = this.s.flags.filter(f => f !== 'ai'); for (const runner of this.s.runners) runner.floor = 0; }
    else { const d = HARDWARE.find(v => v.id === 'link')!; let salvage = 0; for (let n = 0; n < this.s.hardware.link; n++) salvage += cost(d, n) * .5; this.s.ram += Math.floor(salvage); this.s.hardware.link = 0; this.s.flags = this.s.flags.filter(f => f !== 'ai'); for (const runner of this.s.runners) runner.floor = 0; Object.assign(r, makeRunner(r.id, r.name.split(' / ')[0] + ' / II')); }
    this.s.survived = Math.min(5, this.s.survived + 1); this.s.modal = null; this.log(`Containment complete: ${action}.`, 'safe'); this.check(); this.notify(true);
  }
  retireGhost() { if (this.blocked || this.runner.mode !== 'ghost') return; Object.assign(this.runner, makeRunner(this.runner.id, this.runner.name.split(' / ')[0] + ' / restored')); this.log('Ghost isolated. A replacement runner is online.', 'safe'); this.notify(true); }
  choose(effect: string) {
    const node = STORIES.find(n => this.s.modal === 'story:' + n.id);
    if (!node || !node.choices.some(c => c.effect === effect) || this.s.resolved.includes(node.id)) return;
    const r = this.runner; this.s.resolved.push(node.id); this.s.modal = null;
    if (effect === 'boot') this.s.charges++;
    if (effect === 'strip') this.s.ram += 300;
    if (effect === 'protect') { this.s.ram += 150; this.flag('relay'); }
    if (effect === 'trace') { this.s.trace = 120; if (r.mode === 'human') r.psychosis = clamp(r.psychosis + 15); this.flag('traced'); }
    if (effect === 'quarantine') { this.s.ram += 2500; r.heat = 0; this.flag('quarantined'); }
    if (effect === 'witness') this.flag('witness');
    if (effect === 'payload') this.s.hardware.link = Math.min(40, this.s.hardware.link + 1);
    if (effect === 'accept') { this.flag('ai'); for (const v of this.s.runners) if (v.mode === 'human') { v.floor = 50; v.psychosis = Math.max(50, v.psychosis); } }
    if (effect === 'firewall') this.flag('firewall');
    if (effect === 'preserve') { this.s.ram -= Math.min(5000, this.s.ram); this.flag('production'); this.flag('saved'); }
    if (effect === 'sell') { this.s.ram += 10000; this.flag('sold'); }
    if (effect === 'route') { if (!this.has('relay')) this.s.ram *= .9; this.s.route = 120; }
    if (effect === 'decoy') { this.s.ram += 25000; r.heat = clamp(r.heat + 25); }
    if (effect === 'identity') this.flag('identity');
    if (effect === 'fracture') { this.flag('fracture'); if (r.mode === 'human') r.psychosis = clamp(r.psychosis + 10); }
    if (['digital', 'ash', 'human'].includes(effect)) { this.s.ending = effect; if (!this.s.endingArchive.includes(effect)) this.s.endingArchive.push(effect); }
    this.log(`${node.title} → ${node.choices.find(c => c.effect === effect)!.label}`, 'story'); this.onSound('story'); this.check(); this.notify(true);
  }
  get fragmentReward() { return this.s.ending && this.s.extracted >= 1e6 ? Math.floor(Math.sqrt(this.s.extracted / 1e6) * (1 + .2 * Math.min(5, this.s.survived))) : 0; }
  buyMeta(id: string) { const d = META.find(v => v.id === id); if (this.blocked || !d || this.s.meta[id] >= d.max || d.requires.some(k => !this.s.meta[k])) return; const price = d.price(this.s.meta[id]); if (this.s.fragments < price) return; this.s.fragments -= price; this.s.meta[id]++; this.log(`${d.name} encoded into persistent memory.`, 'purchase'); this.onSound('buy'); this.notify(true); }
  prestige() { if (this.s.modal !== 'prestige' || this.fragmentReward <= 0) return; const old = this.s; const reward = this.fragmentReward; this.s = initialState(); Object.assign(this.s, { fragments: old.fragments + reward, meta: old.meta, lifetime: old.lifetime, endingArchive: old.endingArchive, settings: old.settings, run: old.run + 1 }); this.log(`Rack purged. ${reward} Blackwall Fragment${reward === 1 ? '' : 's'} recovered.`, 'story'); this.inputClock = -1; this.notify(true); }
  openModal(name: string) { if (this.s.paused || this.s.modal && !(this.s.modal === 'help' && name === 'import')) return; if (name === 'prestige' && this.fragmentReward <= 0) return; if (!['prestige', 'help', 'import'].includes(name)) return; this.s.modal = name; this.notify(true); }
  closeModal() { if (['prestige','help','import'].includes(this.s.modal ?? '')) { this.s.modal = null; this.notify(true); } }
  save() {
    if (!this.storage) return;
    try { const text = JSON.stringify(this.s); const prev = this.storage.getItem('blackwall-save'); if (prev) { try { validateSave(JSON.parse(prev)); this.storage.setItem('blackwall-backup', prev); } catch { /* Retain last valid backup. */ } } this.storage.setItem('blackwall-save', text); this.storageMessage = 'LOCAL SAVE SYNCED'; }
    catch { this.storageMessage = 'SAVE UNAVAILABLE · EXPORT BACKUP'; }
  }
  load() {
    for (const key of ['blackwall-save', 'blackwall-backup']) {
      try { const raw = this.storage?.getItem(key); if (!raw) continue; this.s = validateSave(JSON.parse(raw)); this.s.paused = false; this.storageMessage = key === 'blackwall-backup' ? 'BACKUP RESTORED' : 'LOCAL SAVE RESTORED'; this.log('Connection resumed. No extraction or damage occurred while away.', 'safe'); this.check(); return; } catch { this.storageMessage = 'SAVE INVALID · TRY BACKUP'; }
    }
  }
  importSave(raw: string) { const next = validateSave(JSON.parse(raw)); this.s = next; this.inputClock = -1; this.notify(true); }
}
export const engine = new Engine();
