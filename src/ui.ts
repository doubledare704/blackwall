import { engine, type Runner } from './engine';
import { HARDWARE, META, SKILLS, STORIES, cost, fmt, type Tab } from './data';
import { audio } from './audio';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const text = (id: string, value: string) => { const el = document.getElementById(id); if (el && el.textContent !== value) el.textContent = value; };
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const timer = (n: number) => n > 0 ? `${Math.ceil(n)}s` : 'READY';
const branchName = (r: Runner) => r.mode === 'ghost' ? 'GHOST CORE' : r.branch ? r.branch.toUpperCase() + ' SPECIALIST' : 'UNSPECIALIZED';
export const HUD_LAYOUT = {
  reference: { width: 1280, height: 720 }, top: { x: 0, y: 0, width: 1280, height: 64 },
  clicker: { x: 0, y: 64, width: 640, height: 576 }, drawer: { x: 640, y: 64, width: 640, height: 576 },
  bottom: { x: 0, y: 640, width: 1280, height: 80 },
} as const;

export class UI {
  tab: Tab = 'hardware';
  category = 'all';
  private signature = '';
  private renderedTab?: Tab;
  private modalSignature = '';
  private lastFocus?: HTMLElement;
  private holding = false;
  private holdClock = 0;
  private last = 0;
  private accumulation = 0;
  private unsubscribe?: () => void;
  mount() {
    $('#app').innerHTML = `
      <div class="shell">
        <header class="topbar">
          <a class="brand" href="#" aria-label="Blackwall Drift home"><span class="brand-mark">╱╱</span> BLACKWALL<span class="brand-dot">®</span><span class="brand-sub">DRIFT PROTOCOL</span></a>
          <div class="header-center"><span class="led"></span> NIGHT CITY <span class="muted">/</span> UNDERGROUND NETWORK</div>
          <div class="top-actions"><button data-action="help" title="How to play" aria-label="How to play">?</button><button data-action="sound" id="sound" aria-label="Enable sound" aria-pressed="false">SOUND OFF</button><button data-action="pause" id="pause">Ⅱ PAUSE</button></div>
        </header>
        <div class="session-line"><span>DEN_09 <span class="muted">/</span> SECURE LOCAL INSTANCE</span><span id="run-label">RUN 001 <span class="muted">—</span> SUB-GRID SCRAPING</span><span class="session-state" id="session-state">● CONNECTION LIVE</span></div>
        <section class="telemetry" aria-label="System telemetry">
          <div class="resource stat"><span class="eyebrow"><img src="/assets/svg/ram-chip.svg" alt="" /> EXTRACTED RAM <span class="unit">BANKED</span></span><div class="ram-row"><strong id="ram">0</strong><span class="ram-unit">RAM</span><span class="rate" id="rate">+0 /s</span></div><div class="stat-note">TOTAL EXTRACTED <span id="extracted">0</span> <span class="muted">/</span> <span id="click-yield">10 RAM / PULSE</span></div></div>
          <div class="stat"><div class="meter-label"><span class="eyebrow">01 / NEURAL HEAT</span><span id="heat-state" class="small-accent">STABLE</span></div><div class="meter-numbers"><strong id="heat">0<span>%</span></strong><span id="heat-rate">−3.0 /s PASSIVE</span></div><div class="meter-track heat-track" role="progressbar" aria-label="Neural heat" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="heat-fill"></i><b id="safe-marker"></b></div></div>
          <div class="stat psych-stat"><div class="meter-label"><span class="eyebrow">02 / SATURATION</span><span id="stage" class="small-accent">NOMINAL</span></div><div class="meter-numbers"><strong id="psych">0<span>%</span></strong><span id="psych-rate">IDENTITY INTACT</span></div><div class="meter-track psych-track" role="progressbar" aria-label="Neural saturation" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="psych-fill"></i><b style="left:25%"></b><b style="left:50%"></b><b style="left:75%"></b></div></div>
        </section>
        <main class="workspace">
          <section class="core-panel" aria-label="Extraction console">
            <div class="section-heading"><span><i class="tiny-square"></i> EXTRACTION CONSOLE</span><span class="muted">SYS / 01</span></div>
            <div class="node-field">
              <div class="field-tag">TARGET_ <strong id="target-name">CORP SUB-GRID</strong><small id="target-sub">LOW SECURITY / ENCRYPTED CACHE</small></div>
              <span class="field-coordinate">35° 41′ N<br>139° 41′ E</span>
              <div id="phaser-stage" aria-hidden="true"></div>
              <button id="extract" class="extract-target" aria-label="Extract data. Hold to extract four times per second."><span class="target-cross">+</span></button>
              <div class="extract-label"><strong id="extract-label">EXTRACT DATA <span>↗</span></strong><span id="pulse-label">+10 RAM / PULSE</span><small id="input-hint">CLICK OR HOLD SPACE TO CONNECT</small></div>
              <span class="field-corner corner-tl"></span><span class="field-corner corner-tr"></span><span class="field-corner corner-bl"></span><span class="field-corner corner-br"></span>
              <div class="field-bottom"><span id="node-state"><i class="led"></i> UPLINK ESTABLISHED</span><span id="node-clock">00:00:00</span></div>
            </div>
            <div class="runner-strip"><div class="avatar" aria-hidden="true"><span>V</span></div><div><div class="eyebrow">ACTIVE NETRUNNER <span class="online-label">● ONLINE</span></div><div class="runner-title"><strong id="runner-name">Vex</strong><span id="runner-branch">UNSPECIALIZED</span></div></div><button data-tab="runners" class="text-link">MANAGE ↗</button></div>
            <div class="mitigation"><button data-action="vent" id="vent" class="ability"><img src="/assets/svg/cryo-vent.svg" alt=""/><span>CRYO-VENT<small id="vent-detail">−50 HEAT / 5% RAM</small></span><b id="vent-cd">READY ↗</b></button><button data-action="suppress" id="suppress" class="ability"><span class="ability-symbol">⌁</span><span>SUPPRESS<small id="charge-count">1 CHARGE</small></span><b id="suppress-cd">15 SEC ↗</b></button><button data-action="purge" id="purge" class="ability"><span class="ability-symbol">⟲</span><span>MEMORY PURGE<small>10% RAM / 10 SEC OFFLINE</small></span><b id="purge-cd">READY ↗</b></button></div>
            <div class="connection-row"><button data-action="connection" id="connection">◉ SEVER UPLINK</button><span id="forecast">SAFE HEAT THRESHOLD: 70%</span></div>
          </section>
          <section class="drawer" aria-label="Management panel"><div id="drawer-content"></div></section>
        </main>
        <nav class="bottom-nav" role="tablist" aria-label="Den management">${(['matrix','hardware','runners','blackwall','logs'] as Tab[]).map((tab, i) => `<button role="tab" data-tab="${tab}" id="tab-${tab}" aria-controls="drawer-content" aria-selected="${tab === this.tab}" class="${tab === this.tab ? 'active' : ''}"><span class="nav-index">0${i + 1}</span><span class="nav-icon">${['⌘','▤','♙','◈','≡'][i]}</span><strong>${tab === 'logs' ? 'TERMINAL' : tab.toUpperCase()}</strong><span class="nav-arrow">↗</span></button>`).join('')}</nav>
        <div class="terminal-ticker"><span class="terminal-prompt">&gt;_</span><span id="ticker">Secure tunnel established.</span><span class="ticker-live">LIVE FEED <i class="led"></i></span></div>
        <footer><span>BLACKWALL DRIFT <span class="muted">//</span> NEURAL OPERATING SYSTEM V.04</span><span id="save-status">LOCAL SAVE READY</span><span>NO ONE RETURNS UNCHANGED.</span></footer>
      </div>
      <dialog id="modal" aria-labelledby="modal-title"><div id="modal-content"></div></dialog>
      <input type="file" id="import-file" accept="application/json,.json" hidden />
      <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
    document.addEventListener('click', this.click);
    document.addEventListener('keydown', this.keydown);
    document.addEventListener('keyup', this.keyup);
    window.addEventListener('blur', this.release);
    document.addEventListener('visibilitychange', this.visibility);
    $('#extract').addEventListener('pointerdown', e => { e.preventDefault(); this.holding = true; this.extract(); this.holdClock = performance.now(); });
    window.addEventListener('pointerup', this.release); window.addEventListener('pointercancel', this.release);
    $('#modal').addEventListener('cancel', e => { e.preventDefault(); engine.closeModal(); });
    $('#import-file').addEventListener('change', async e => { const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return; try { if (file.size > 1000000) throw new Error(); engine.importSave(await file.text()); await audio.enable(false); engine.s.settings.sound = false; engine.notify(true); this.toast('Save imported. Connection restored.'); } catch { this.toast('Invalid save. Current progress was kept.'); } (e.target as HTMLInputElement).value = ''; });
    this.unsubscribe = () => this.refresh(); engine.listeners.add(this.unsubscribe);
    this.refresh();
  }
  private release = () => { this.holding = false; };
  private visibility = () => { this.release(); this.last = 0; this.accumulation = 0; if (document.hidden) { engine.save(); audio.suspend(); } else audio.resume(); };
  update(now: number) {
    if (!document.hidden) {
      const elapsed = this.last ? Math.min((now - this.last) / 1000, .2) : 0; this.accumulation += elapsed;
      while (this.accumulation >= .05) { engine.tick(.05); this.accumulation -= .05; }
      if (this.holding && now - this.holdClock >= 250) { this.extract(); this.holdClock = now; }
      if (Math.floor(now / 100) !== Math.floor(this.last / 100)) this.refresh();
    }
    this.last = now;
  }
  destroy() {
    this.release(); engine.save(); if (this.unsubscribe) engine.listeners.delete(this.unsubscribe);
    document.removeEventListener('click', this.click); document.removeEventListener('keydown', this.keydown); document.removeEventListener('keyup', this.keyup);
    document.removeEventListener('visibilitychange', this.visibility); window.removeEventListener('blur', this.release); window.removeEventListener('pointerup', this.release); window.removeEventListener('pointercancel', this.release);
  }
  private extract() { const amount = engine.pulse(performance.now()); if (amount > 0) { window.dispatchEvent(new CustomEvent('extraction', { detail: amount })); } }
  private keydown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (event.code === 'Space' && (target === document.body || target.id === 'extract')) { event.preventDefault(); if (!event.repeat) { this.holding = true; this.holdClock = performance.now(); this.extract(); } }
    if (target.getAttribute('role') === 'tab' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); const tabs = ['matrix','hardware','runners','blackwall','logs'] as Tab[]; this.switchTab(tabs[(tabs.indexOf(this.tab) + (event.key === 'ArrowRight' ? 1 : 4)) % 5]); $(`#tab-${this.tab}`).focus(); }
  };
  private keyup = (event: KeyboardEvent) => { if (event.code === 'Space') this.release(); };
  private click = async (event: MouseEvent) => {
    const el = (event.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!el || el.disabled) return;
    if (el.id === 'extract') { if (event.detail === 0) this.extract(); return; }
    if (el.dataset.tab) { this.switchTab(el.dataset.tab as Tab); return; }
    if (el.dataset.buy) { engine.buy(el.dataset.buy); return; }
    if (el.dataset.meta) { engine.buyMeta(el.dataset.meta); return; }
    if (el.dataset.skill) { engine.unlock(el.dataset.skill); return; }
    if (el.dataset.runner) { engine.s.selected = Number(el.dataset.runner); engine.notify(true); return; }
    if (el.dataset.category) { this.category = el.dataset.category; this.signature = ''; this.refresh(); return; }
    if (el.dataset.choice) { engine.choose(el.dataset.choice); return; }
    if (el.dataset.contain) { engine.contain(el.dataset.contain); return; }
    if (el.dataset.ability) { engine.ability(el.dataset.ability); return; }
    const action = el.dataset.action;
    if (action === 'vent') engine.vent();
    if (action === 'suppress') engine.suppress();
    if (action === 'purge') engine.purge();
    if (action === 'connection') engine.toggleConnection();
    if (action === 'charge') engine.buyCharge();
    if (action === 'recruit') engine.recruit();
    if (action === 'retire') engine.retireGhost();
    if (action === 'help') engine.openModal('help');
    if (action === 'close') engine.closeModal();
    if (action === 'prestige') engine.openModal('prestige');
    if (action === 'confirm-prestige') { engine.prestige(); this.toast('Rack purged. Your fragments survived.'); }
    if (action === 'pause' && !engine.s.modal) { engine.s.paused = !engine.s.paused; this.release(); engine.notify(true); }
    if (action === 'sound') { engine.s.settings.sound = !engine.s.settings.sound; await audio.enable(engine.s.settings.sound); engine.s.settings.sound = audio.enabled; engine.notify(true); }
    if (action === 'motion') { engine.s.settings.motion = !engine.s.settings.motion; this.modalSignature = ''; engine.notify(true); }
    if (action === 'effects') { engine.s.settings.effects = !engine.s.settings.effects; this.modalSignature = ''; engine.notify(true); }
    if (action === 'export') { const blob = new Blob([JSON.stringify(engine.s, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `blackwall-run-${engine.s.run}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    if (action === 'import') engine.openModal('import');
    if (action === 'import-file') $('#import-file').click();
    if (action === 'restore') {
      try { const raw = $<HTMLTextAreaElement>('#save-json').value; if (raw.length > 1000000) throw new Error(); engine.importSave(raw); await audio.enable(false); engine.s.settings.sound = false; engine.notify(true); this.toast('Save imported. Connection restored.'); }
      catch { this.toast('Invalid save. Current progress was kept.'); }
    }
    audio.play('tab'); this.refresh();
  };
  switchTab(tab: Tab) { if (!['matrix','hardware','runners','blackwall','logs'].includes(tab) || engine.s.modal) return; this.tab = tab; this.signature = ''; audio.play('tab'); this.refresh(); }
  private header(eyebrow: string, title: string, count: string) { return `<div class="drawer-header"><div><span class="eyebrow">${eyebrow}</span><h1>${title}<span class="title-dot">.</span></h1></div><span class="panel-counter">${count}</span></div>`; }
  private renderPanel() {
    const s = engine.s, r = engine.runner;
    const signature = [this.tab, this.category, s.run, ...Object.values(s.hardware), ...Object.values(s.meta), s.selected, s.runners.map(v => [v.id, v.mode, v.skills.join(','), Math.floor(v.extracted / 100000), v.branch].join(':')).join('|'), s.logs[0]?.text, s.ending, s.fragments, s.charges, s.flags.join(','), s.settings.motion, s.settings.effects].join('/');
    if (signature === this.signature) return; this.signature = signature;
    let html = '';
    if (this.tab === 'hardware') {
      const installed = Object.values(s.hardware).reduce((a, b) => a + b, 0);
      html = this.header('BUILD YOUR ADVANTAGE', 'Hardware', `${String(installed).padStart(2,'0')} INSTALLED`) + `<div class="category-tabs" aria-label="Hardware category">${['all','processing','cooling','automation'].map(c => `<button data-category="${c}" aria-pressed="${this.category === c}" class="${this.category === c ? 'selected' : ''}">${c.toUpperCase()}</button>`).join('')}</div><div class="upgrade-list">`;
      html += HARDWARE.filter(d => this.category === 'all' || d.category === this.category).map((d, i) => `<article class="upgrade-card ${d.category}"><div class="upgrade-icon">${d.category === 'cooling' ? '❄' : d.category === 'automation' ? '⌘' : '▧'}</div><div class="upgrade-body"><div class="card-title"><h2>${d.name}</h2><span>LVL ${String(s.hardware[d.id]).padStart(2,'0')}</span></div><span class="part-code">${d.tag} <span>/${String(i + 1).padStart(2,'0')}</span></span><p>${d.effect}</p><span class="risk-note">${d.risk}</span></div><button class="purchase" data-buy="${d.id}" data-price="${cost(d, s.hardware[d.id])}" ${s.hardware[d.id] >= d.max ? 'data-max="true"' : ''}><span>${s.hardware[d.id] >= d.max ? 'MAX' : fmt(cost(d, s.hardware[d.id]))}</span><small>RAM ${s.hardware[d.id] >= d.max ? '✓' : '＋'}</small></button></article>`).join('');
      html += `</div><div class="panel-footnote"><span class="led"></span> UPGRADES APPLY TO YOUR ENTIRE DEN <button data-action="charge" data-price="500">SUPPRESSANT +1 <strong>500 RAM</strong></button></div>`;
    }
    if (this.tab === 'matrix') {
      const next = STORIES.find(n => !s.resolved.includes(n.id));
      html = this.header('FOLLOW THE SIGNAL', 'Data matrix', `ACT ${s.extracted >= 100000 ? 'III' : s.extracted >= 10000 ? 'II' : 'I'}`) + `<div class="panel-scroll"><p class="panel-intro">Every connection leaves a trace. Choose how deep you go.</p><div class="network-route">${[['01','SUB-GRID SCRAPING','Corporate caches / public relays',0],['02','DEEP ICE SLICING','Military archives / memory indexes',10000],['03','BLACKWALL SYPHONING','Beyond the perimeter / unknown entities',100000]].map(([num, name, description, threshold]) => `<div class="route-node ${s.extracted >= Number(threshold) ? 'unlocked' : ''}"><span>${num}</span><div><strong>${name}</strong><small>${description}</small></div><b>${s.extracted >= Number(threshold) ? '↗' : '⊘'}</b></div>`).join('')}</div><div class="objective-card"><span class="eyebrow">NEXT INTERCEPT</span><h2>${next?.title ?? 'The signal is yours now'}</h2><p>${next ? `${fmt(Math.min(s.extracted, next.threshold))} / ${fmt(next.threshold)} RAM EXTRACTED` : 'All transmissions decoded. Continue or rebuild in BLACKWALL.'}</p><div class="slim-track"><i style="width:${next ? Math.min(100, s.extracted / Math.max(1, next.threshold) * 100) : 100}%"></i></div></div><div class="duty-card"><div><span class="eyebrow">AUTOMATION DUTY CYCLE</span><strong id="duty-label">${Math.round(s.duty * 100)}%</strong></div><input id="duty" aria-label="Automation duty cycle" type="range" min="0" max="100" value="${s.duty * 100}" /><p>Throttle production and thermal load together. Cooling stays online.</p></div><div class="system-grid"><div><span>UPLINKS</span><strong>${s.runners.length} / 4</strong></div><div><span>SAFE HEAT</span><strong>${engine.safeHeat}%</strong></div><div><span>STORY NODES</span><strong>${s.resolved.length} / 10</strong></div></div></div>`;
    }
    if (this.tab === 'runners') {
      html = this.header('KEEP THEM HUMAN', 'Netrunners', `${s.runners.length} / 4 SLOTS`) + `<div class="roster">${s.runners.map(v => `<button data-runner="${v.id}" class="${v.id === r.id ? 'selected' : ''}"><span class="mini-avatar">${v.name[0]}</span><strong>${escape(v.name)}</strong><small data-runner-psych="${v.id}">${v.mode === 'ghost' ? 'GHOST' : 'P ' + Math.floor(v.psychosis) + '%'}</small></button>`).join('')}${s.runners.length < 4 ? `<button class="recruit" data-action="recruit" data-price="${25000 * 4 ** (s.runners.length - 1)}">＋<small>${fmt(25000 * 4 ** (s.runners.length - 1))} RAM</small></button>` : ''}</div><div class="panel-scroll"><div class="skills-summary"><div><span class="eyebrow">${branchName(r)}</span><h2>${escape(r.name)} <span>LVL ${Math.floor(r.extracted / 100000) + 1}</span></h2><p>1 SP per 100K personally extracted RAM. Tier costs: 1 / 2 / 3 SP.</p></div><div class="sp-count"><strong>${engine.sp()}</strong><span>SKILL POINTS</span></div></div><div class="slim-track"><i style="width:${r.extracted % 100000 / 1000}%"></i></div>`;
      if (r.mode === 'ghost') html += `<div class="objective-card"><span class="eyebrow">NON-BIOLOGICAL ENTITY</span><h2>Ghost Core online</h2><p>Manual input disabled. Every 60 sec: output stops for 10 sec and 5% banked RAM is lost. Retire the ghost to restore a human runner.</p><button data-action="retire" class="outline-button">RETIRE GHOST / RESTORE RUNNER ↗</button></div>`;
      else html += `<div class="skill-trees">${(['brute','cryo','daemon'] as const).map(branch => `<div class="skill-branch ${r.branch && r.branch !== branch ? 'branch-locked' : ''}"><div class="branch-heading"><span>${branch === 'brute' ? '↯' : branch === 'cryo' ? '❄' : '◈'}</span><strong>${branch === 'brute' ? 'BRUTE SLICER' : branch === 'cryo' ? 'CRYO SPECIALIST' : 'DAEMON FUSER'}</strong></div>${SKILLS.filter(d => d.branch === branch).map(d => { const owned = r.skills.includes(d.id); const previous = SKILLS.find(v => v.branch === branch && v.tier === d.tier - 1); const locked = !!r.branch && r.branch !== branch || !!previous && !r.skills.includes(previous.id); return `<button class="skill-node ${owned ? 'owned' : ''}" data-skill="${d.id}" ${locked || owned || engine.sp() < d.tier ? 'disabled' : ''}><span class="skill-tier">0${d.tier}</span><span><strong>${d.name}</strong><small>${d.description}</small></span><b>${owned ? '✓' : d.tier + ' SP'}</b></button>`; }).join('')}</div>`).join('')}</div>`;
      html += `<div class="active-skills">${['spike','ice','breach'].filter(id => r.skills.includes(id)).map(id => `<button data-ability="${id}" id="skill-${id}" class="outline-button">${SKILLS.find(v => v.id === id)!.name} ↗</button>`).join('')}</div></div>`;
    }
    if (this.tab === 'blackwall') {
      html = this.header('SOMETHING ALWAYS SURVIVES', 'Blackwall', `RUN ${String(s.run).padStart(3,'0')}`) + `<div class="panel-scroll"><div class="fragment-banner"><span class="fragment-symbol">◈</span><div><span class="eyebrow">BLACKWALL FRAGMENTS</span><strong>${fmt(s.fragments)} <small>β</small></strong></div><div class="next-wipe">NEXT WIPE<strong id="fragment-reward">+${engine.fragmentReward} β</strong></div></div><p class="panel-intro">An architecture beyond flesh. Encode permanent advantages into your next life.</p><div class="meta-tree">${META.map((d, i) => { const level = s.meta[d.id]; const locked = d.requires.some(k => !s.meta[k]); return `<article class="meta-node ${locked ? 'locked' : ''} ${level ? 'owned' : ''}"><span class="meta-index">0${i + 1}</span><div><div class="card-title"><h2>${d.name}</h2><small>${level}/${d.max}</small></div><p>${d.description}</p><small class="meta-requires">${d.requires.length ? 'REQUIRES: ' + d.requires.map(k => META.find(v => v.id === k)!.name).join(' + ') : 'ROOT PROTOCOL / NO PREREQUISITE'}</small></div><button data-meta="${d.id}" data-fragment-price="${d.price(level)}" ${locked || level >= d.max ? 'data-max="true"' : ''}>${level >= d.max ? '✓' : locked ? '⊘' : fmt(d.price(level)) + ' β'}</button></article>`; }).join('')}</div><div class="prestige-box"><div><span class="eyebrow">RACK PURGE / NEW RUN</span><p>Complete an ending after 1M run extraction. Hardware, runners, and RAM reset. Fragments and meta upgrades survive.</p></div><button data-action="prestige" id="prestige" class="danger-button">BURN THE RACK ↗</button></div><div class="ending-archive"><span class="eyebrow">ENDING ARCHIVE</span>${['human','digital','ash'].map(id => `<span class="${s.endingArchive.includes(id) ? 'found' : ''}">${s.endingArchive.includes(id) ? '◆' : '◇'} ${id === 'human' ? 'HUMAN CONTINUITY' : id === 'digital' ? 'DIGITAL WITNESS' : 'ASH PROTOCOL'}</span>`).join('')}</div></div>`;
    }
    if (this.tab === 'logs') {
      html = this.header('THE CITY IS LISTENING', 'Terminal', `${s.logs.length} RECORDS`) + `<div class="panel-scroll terminal-log">${s.logs.map(l => `<div class="log-entry ${escape(l.kind)}"><time>${this.clock(l.time)}</time><span>&gt;</span><p>${escape(l.text)}</p></div>`).join('')}</div><div class="settings-row"><button data-action="motion">MOTION ${s.settings.motion ? 'ON' : 'OFF'}</button><button data-action="effects">CRT ${s.settings.effects ? 'ON' : 'OFF'}</button><button data-action="export">EXPORT SAVE ↗</button><button data-action="import">IMPORT SAVE ↗</button></div>`;
    }
    const preserve = this.renderedTab === this.tab;
    const previousScroll = preserve ? $('#drawer-content').querySelector('.panel-scroll, .upgrade-list')?.scrollTop ?? 0 : 0;
    const focused = document.activeElement as HTMLElement | null;
    const focusData = focused && $('#drawer-content').contains(focused) ? ['buy','meta','skill','category','runner'].map(k => [k, focused.dataset[k]]).find(([,v]) => v) : undefined;
    $('#drawer-content').innerHTML = html;
    this.renderedTab = this.tab;
    const scroller = $('#drawer-content').querySelector('.panel-scroll, .upgrade-list'); if (scroller) scroller.scrollTop = previousScroll;
    if (preserve && focusData) $('#drawer-content').querySelector<HTMLButtonElement>(`[data-${focusData[0]}="${focusData[1]}"]`)?.focus({ preventScroll: true });
    $('#drawer-content').setAttribute('role', 'tabpanel'); $('#drawer-content').setAttribute('aria-labelledby', `tab-${this.tab}`);
    const duty = document.getElementById('duty') as HTMLInputElement | null;
    duty?.addEventListener('input', () => { if (engine.blocked) return; s.duty = Number(duty.value) / 100; text('duty-label', `${duty.value}%`); engine.save(); });
  }
  refresh() {
    const s = engine.s, r = engine.runner;
    document.body.classList.toggle('reduced-motion', !s.settings.motion);
    document.body.classList.toggle('danger', r.psychosis >= 75);
    text('ram', fmt(s.ram)); text('rate', '+' + fmt(engine.totalPassive) + ' /s'); text('extracted', fmt(s.extracted)); text('click-yield', r.mode === 'ghost' ? 'PASSIVE CHANNEL' : fmt(engine.clickYield(), 1) + ' RAM / PULSE');
    $('#heat').innerHTML = `${r.heat.toFixed(1)}<span>%</span>`; $('#psych').innerHTML = `${r.psychosis.toFixed(1)}<span>%</span>`;
    text('heat-state', r.heat > engine.safeHeat ? 'OVERHEATING' : 'STABLE'); text('stage', engine.stage); text('heat-rate', `${engine.heatRate() >= 0 ? '+' : '−'}${Math.abs(engine.heatRate()).toFixed(1)} /s PASSIVE`);
    const pRate = engine.saturationRate(); text('psych-rate', r.mode === 'ghost' ? 'NON-BIOLOGICAL' : r.suppression > 0 ? 'SUPPRESSION ACTIVE' : pRate > 0 ? `+${pRate.toFixed(2)} /s SATURATION` : r.floor ? 'AI FLOOR: 50%' : r.psychosis >= 25 ? 'SATURATION HOLDING' : 'IDENTITY INTACT');
    $('#heat-fill').style.width = r.heat + '%'; $('#psych-fill').style.width = r.psychosis + '%'; $('#safe-marker').style.left = engine.safeHeat + '%';
    $('.heat-track').setAttribute('aria-valuenow', r.heat.toFixed(1)); $('.psych-track').setAttribute('aria-valuenow', r.psychosis.toFixed(1));
    text('run-label', `RUN ${String(s.run).padStart(3,'0')} — ${s.extracted >= 100000 ? 'BLACKWALL SYPHONING' : s.extracted >= 10000 ? 'DEEP ICE SLICING' : 'SUB-GRID SCRAPING'}`);
    text('session-state', s.paused ? 'Ⅱ SIMULATION PAUSED' : s.modal ? '◆ TRANSMISSION PENDING' : s.connected ? '● CONNECTION LIVE' : '○ UPLINK OFFLINE');
    text('node-state', engine.locked(r) ? '⚠ HARVESTER LOCKOUT' : r.mode === 'ghost' ? r.ghostClock % 60 >= 45 ? '⚠ GHOST INSTABILITY NEAR' : '◈ GHOST CORE ACTIVE' : r.psychosis >= 75 && s.lockClock % 15 >= 10 ? `⚠ LOCKOUT IN ${Math.ceil(12 - s.lockClock % 15)}s` : r.ice > 0 ? '❄ THERMAL ISOLATION' : s.connected ? '● UPLINK ESTABLISHED' : '○ UPLINK DISCONNECTED');
    text('target-name', s.extracted >= 100000 ? 'BEYOND THE BLACKWALL' : s.extracted >= 10000 ? 'DEEP ICE ARCHIVE' : 'CORP SUB-GRID');
    text('target-sub', s.extracted >= 100000 ? 'UNKNOWN ENTITY / EXTREME RISK' : s.extracted >= 10000 ? 'MILITARY ENCRYPTION / HIGH SECURITY' : 'LOW SECURITY / ENCRYPTED CACHE');
    text('runner-name', r.name); text('runner-branch', branchName(r));
    text('pulse-label', r.mode === 'ghost' ? `+${fmt(engine.passive(r))} RAM / SEC` : `+${fmt(engine.clickYield(), 1)} RAM / PULSE`); text('extract-label', r.mode === 'ghost' ? 'GHOST AUTOPILOT' : s.connected ? 'EXTRACT DATA ↗' : 'UPLINK DISCONNECTED');
    text('input-hint', r.mode === 'ghost' ? 'MANUAL EXTRACTION DISABLED / AUTOMATION ONLINE' : r.psychosis >= 50 ? `PHANTOM CYCLE ${r.pulses % 10}/10 / NEXT PHANTOM IN ${10 - r.pulses % 10} PULSES` : 'CLICK OR HOLD SPACE TO CONNECT');
    const extract = $('#extract') as HTMLButtonElement; extract.disabled = engine.blocked || !s.connected || r.mode !== 'human';
    text('vent-cd', timer(r.ventCd) + (r.ventCd <= 0 ? ' ↗' : '')); text('vent-detail', `−${s.hardware.exchanger ? 75 : 50} HEAT / 5% RAM`);
    text('charge-count', `${s.charges} CHARGE${s.charges === 1 ? '' : 'S'} / +25% HEAT 60S`); text('suppress-cd', r.suppression > 0 ? timer(r.suppression) + ' ACTIVE' : r.toxicity > 0 ? timer(r.toxicity) : '15 SEC ↗'); text('purge-cd', timer(r.purgeCd));
    ($('#vent') as HTMLButtonElement).disabled = engine.blocked || r.mode !== 'human' || r.ventCd > 0;
    ($('#suppress') as HTMLButtonElement).disabled = engine.blocked || r.mode !== 'human' || !s.charges || r.toxicity > 0;
    ($('#purge') as HTMLButtonElement).disabled = engine.blocked || r.mode !== 'human' || r.purgeCd > 0;
    text('connection', s.connected ? '◉ SEVER UPLINK' : s.runners.some(v => v.purgeCd > 110) ? '◌ PURGE RECOVERY…' : '◎ RECONNECT UPLINK');
    ($('#connection') as HTMLButtonElement).disabled = engine.blocked || !s.connected && s.runners.some(v => v.purgeCd > 110);
    text('forecast', pRate > 0 ? `BREACH IN ~${Math.ceil((100 - r.psychosis) / pRate)}s AT CURRENT LOAD` : `SAFE HEAT THRESHOLD: ${engine.safeHeat}%`);
    text('node-clock', this.clock(s.time)); text('ticker', s.logs[0]?.text ?? 'Listening…'); text('save-status', engine.storageMessage);
    text('sound', s.settings.sound ? 'SOUND ON' : 'SOUND OFF'); $('#sound').setAttribute('aria-pressed', String(s.settings.sound)); $('#sound').setAttribute('aria-label', s.settings.sound ? 'Mute sound' : 'Enable sound');
    text('pause', s.paused ? '▶ RESUME' : 'Ⅱ PAUSE');
    document.querySelectorAll<HTMLButtonElement>('.bottom-nav button').forEach(b => { const selected = b.dataset.tab === this.tab; b.classList.toggle('active', selected); b.setAttribute('aria-selected', String(selected)); b.tabIndex = selected ? 0 : -1; });
    this.renderPanel();
    document.querySelectorAll<HTMLElement>('[data-runner-psych]').forEach(el => { const runner = s.runners.find(v => v.id === Number(el.dataset.runnerPsych)); if (runner) el.textContent = runner.mode === 'ghost' ? 'GHOST' : 'P ' + Math.floor(runner.psychosis) + '%'; });
    document.querySelectorAll<HTMLButtonElement>('[data-price]').forEach(b => b.disabled = engine.blocked || b.dataset.max === 'true' || s.ram < Number(b.dataset.price));
    document.querySelectorAll<HTMLButtonElement>('[data-fragment-price]').forEach(b => b.disabled = engine.blocked || b.dataset.max === 'true' || s.fragments < Number(b.dataset.fragmentPrice));
    const prestige = document.getElementById('prestige') as HTMLButtonElement | null; if (prestige) prestige.disabled = engine.blocked || engine.fragmentReward <= 0;
    text('fragment-reward', `+${engine.fragmentReward} β`);
    for (const id of ['spike','ice','breach'] as const) { const el = document.getElementById('skill-' + id) as HTMLButtonElement | null; if (el) { const cd = r[`${id}Cd`]; el.disabled = engine.blocked || cd > 0; el.textContent = `${SKILLS.find(d => d.id === id)!.name} / ${timer(cd)}`; } }
  }
  renderModal() {
    const modal = $('#modal') as HTMLDialogElement; const key = engine.s.modal;
    if ((key ?? '') === this.modalSignature) return;
    this.modalSignature = key ?? ''; this.release();
    if (!key) { if (modal.open) { modal.close(); this.lastFocus?.focus(); } return; }
    this.lastFocus = document.activeElement as HTMLElement;
    let eyebrow = '', title = '', body = '', choices = '';
    if (key.startsWith('story:')) {
      const n = STORIES.find(v => 'story:' + v.id === key)!; eyebrow = n.sender; title = n.title; body = n.body;
      choices = n.choices.map((c, i) => `<button data-choice="${c.effect}" class="modal-choice"><span>0${i + 1}</span><div><strong>${c.label}</strong><small>${c.detail}</small></div><b>↗</b></button>`).join('');
    } else if (key.startsWith('breach:')) {
      const r = engine.s.runners.find(v => v.id === Number(key.split(':')[1]))!;
      eyebrow = 'EMERGENCY / ROGUE RUNNER CONTAINMENT'; title = 'The line has fractured.'; body = `${r.name} has reached 100% neural saturation. All production is suspended. Choose what survives. Every option is available, even with zero RAM.`;
      choices = `<button data-contain="flush" class="modal-choice"><span>01</span><div><strong>Forced Neural Flush</strong><small>Lose 90% banked RAM and all Neural Links. Clear this runner’s skills and AI integration. Return at 0 saturation.</small></div><b>↗</b></button><button data-contain="replace" class="modal-choice"><span>02</span><div><strong>Terminate the connection</strong><small>Replace this runner for free. Lose Neural Links; salvage 50% of their cost. Infrastructure remains.</small></div><b>↗</b></button><button data-contain="ghost" class="modal-choice"><span>03</span><div><strong>Unbind & accelerate</strong><small>Become a Ghost Core. ×2 passive hardware output; no manual clicks. Every 60 sec: lose 5% reserves and pause output for 10 sec.</small></div><b>↗</b></button>`;
    } else if (key === 'prestige') {
      eyebrow = 'IRREVERSIBLE / RACK PURGE'; title = 'Leave a trace.'; body = `Claim ${engine.fragmentReward} Blackwall Fragments from this run’s ${fmt(engine.s.extracted)} extracted RAM. This resets RAM, hardware, runners, skills, and story choices. Your ${engine.s.fragments} existing Fragments, meta upgrades, ending archive, and lifetime record survive.`;
      choices = `<button data-action="confirm-prestige" class="modal-choice danger-choice"><span>β</span><div><strong>Burn the rack / +${engine.fragmentReward} β</strong><small>Start run ${engine.s.run + 1} with persistent upgrades.</small></div><b>↗</b></button><button data-action="close" class="outline-button">KEEP THIS DEN</button>`;
    } else if (key === 'import') {
      eyebrow = 'LOCAL BACKUP / RESTORE'; title = 'Recover the signal.'; body = 'Paste an exported save or choose a JSON file. A valid backup replaces your current local progress. Invalid data leaves your current progress intact.';
      choices = `<label for="save-json" class="eyebrow">SAVED GAME JSON</label><textarea id="save-json" aria-label="Saved game JSON" spellcheck="false" placeholder="Paste your exported JSON here…"></textarea><button data-action="restore" class="primary-button">VALIDATE & RESTORE ↗</button><div class="settings-row"><button data-action="import-file">CHOOSE JSON FILE ↗</button><button data-action="close">KEEP CURRENT PROGRESS</button></div>`;
    } else {
      eyebrow = 'OPERATOR MANUAL / 01'; title = 'Know your limits.'; body = 'Click the core, hold it, or hold Space to extract. Install hardware in HARDWARE. Automation earns RAM but generates heat. Above the safe heat threshold, saturation grows — and it does not cool away.';
      choices = `<div class="help-grid"><p><strong>BURST & COOL</strong>Vent removes 50 heat for 5% RAM. Disconnect is free; cooling stays on.</p><p><strong>PROTECT THE RUNNER</strong>Suppression blocks saturation for 15 sec but adds heat toxicity. Memory purge resets to your saturation floor.</p><p><strong>FOLLOW THE SIGNAL</strong>Story events arrive as run extraction grows. Protective and AI routes both reach endings.</p><p><strong>BUILD ANOTHER LIFE</strong>Earn skill points per 100K runner extraction. At 1M and an ending, wipe for permanent Fragments.</p></div><div class="settings-row"><button data-action="motion">MOTION ${engine.s.settings.motion ? 'ON' : 'OFF'}</button><button data-action="effects">CRT ${engine.s.settings.effects ? 'ON' : 'OFF'}</button><button data-action="export">EXPORT SAVE</button><button data-action="import">IMPORT SAVE</button></div><p class="help-note">Local saves only. Time pauses while away. Sound is synthesized after you enable it. Night City / Blackwall references are fictional fan-inspired story material.</p><button data-action="close" class="primary-button">RETURN TO THE SIGNAL ↗</button>`;
    }
    $('#modal-content').innerHTML = `<div class="modal-topline"><span>INCOMING TRANSMISSION</span><span>ENCRYPTED / DEN_09</span></div>${key.startsWith('breach:') ? '<img class="breach-icon" src="/assets/svg/psychosis-warning.svg" alt="Neural breach warning" />' : ''}<span class="eyebrow">${escape(eyebrow)}</span><h2 id="modal-title">${escape(title)}</h2><p class="modal-body">${escape(body)}</p><div class="modal-choices">${choices}</div><p id="modal-status" role="status" aria-live="polite"></p><div class="modal-footer"><span class="led"></span> SIMULATION SUSPENDED / YOUR DECISION IS SAFE</div>`;
    if (!modal.open) modal.showModal();
    modal.querySelector<HTMLElement>('textarea, button')?.focus();
  }
  toast(message: string) { if (($('#modal') as HTMLDialogElement).open) text('modal-status', message); text('toast', message); $('#toast').classList.add('show'); setTimeout(() => $('#toast').classList.remove('show'), 3500); }
  clock(seconds: number) { return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, Math.floor(seconds) % 60].map(n => String(n).padStart(2,'0')).join(':'); }
}
export const ui = new UI();
