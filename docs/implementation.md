# Playable prototype: implementation and revised design

This document supersedes conflicting prototype numbers in `game-design.md`. It reconciles all five attachments with the original design. Values are implemented and tested as rules; long-session balance remains a playtest task.

## Persistent Blackwall tree

```text
                         Digital Shadow
                         /            \
             Deep-Core Insulators   Blackwall Bypass
                       |                 |
               Capri Subroutine    Autonomous Purge
                         \            /
                        Ghost Core Archive
```

Prerequisites require one purchased tier of each parent; both parents are required for the Archive. Costs use the current owned level `n`, starting at zero. Every cost is rounded up to an integer.

| Node | Tiers | Next cost in Fragments | Effect per tier |
| --- | --- | --- | --- |
| Digital Shadow | 5 | `2^n` | +5% base extraction yield |
| Deep-Core Insulators | 10 | `ceil(2 × 1.5^n)` | −8% saturation growth, additive to a maximum of −80% |
| Blackwall Bypass | 5 | `5 × 2^n` | +3 safe heat points; 70 → 85 |
| Capri Subroutine | 8 | `ceil(3 × 1.8^n)` | +20% passive output, no added heat |
| Autonomous Purge | 3 | 10 / 25 / 50 | Free auto-vent at 95 heat; cooldown 120 / 90 / 60 seconds |
| Ghost Core Archive | 1 | 100 | Independent +100 RAM/sec channel without heat or saturation |

Prestige unlocks after a story ending and at least 1,000,000 **run extraction**. Reward: `floor(sqrt(runExtraction / 1000000) × (1 + 0.2 × min(5, containmentsResolved)))`. It deliberately uses the run counter instead of lifetime production, so old extraction cannot be claimed again on every wipe. Only produced RAM counts; gifts, purchases, and salvage do not.

The confirmation previews the exact reward and reset scope. A wipe atomically replaces the run, retaining Fragments, purchased meta upgrades, lifetime production, settings, and the ending archive. Pending story and skills reset. No prestige is possible a second time without another qualifying run. The containment bonus is capped to limit breach farming.

## In-run hardware and production

All nine upgrades from the attachment are available in HARDWARE with three category filters. They affect the entire den. The exact costs, price curves, caps, effects, and risks are in the typed `HARDWARE` catalog in `src/data.ts`; the UI reads that same catalog. Hardware prices are `ceil(base × scale^ownedLevel)`.

Base click yield is `(10 + NeuralLinkLevel) × (1 + 0.05 × DigitalShadowTier + storyBonuses)`. Fraying/Splintering/Drift multiply clicks by 1.15/1.4/2. Trace temporarily adds ×1.5; Brute Impulse adds ×1.5. Optics add 2% critical chance per level, capped at 40%; critical pulses yield ×5.

Manual input is accepted at a maximum of six pulses/sec. Pointer hold and Space hold generate four/sec. Excess input earns neither RAM nor heat. At saturation ≥50, every tenth accepted pulse is phantom; Daemon Corruption recovers every second phantom at double yield. The simulation stores pulse count and deterministic random state in the save.

Passive hardware yield is `(8 × slicers + 500 × terminals + daemons × baseClickYield) × 1.25^busLevel × (1 + 0.2 × CapriMetaTier)`. Divide hardware output evenly across recruited runners before applying each runner's mode and skills. Recruitment distributes the same hardware load; it does not duplicate its base production. Capri story integration grants biological channels ×4; Ghost mode replaces that with ×2. Ghost skill fusion adds 1,000 RAM/sec on that channel. The Archive adds a separate 100 RAM/sec. The global duty slider scales passive yield and generated heat together.

Each runner owns heat, saturation, cooldowns, identity floor, production credit, and skills. Passive cooling is `3 + 1.5 × ventLevel`, modified by stage and story. Neural Links add 0.2 heat/pulse per level; Slicers add 0.5 heat/sec; Scraping Daemons add automated pulse heat. Buses multiply generated heat by 1.1 per level. Terminal saturation adds 2 points/sec per level above safe heat. Neuro-Shielding Mesh multiplies saturation growth by 0.85 per level.

Ghosts cannot accumulate biological heat/saturation. Once per 60 connected production seconds, a ghost loses 5% of banked RAM and takes its channel offline for 10 seconds. Disconnect pauses its clock. Ghosts can be retired freely for a replacement human runner. The persistent Archive channel is exempt from instability.

## Runner skills

Recruit Vex, Nyx, Cipher, and Zero into up to four slots. Recruitment costs 25K, 100K, and 400K RAM for the additional slots. Clicks credit the selected runner; automation credits its assigned channel. One skill point is earned per 100K personally produced RAM. Skill tiers cost 1, 2, and 3 points, require their previous tier, and lock the runner into their first chosen specialization.

| Branch | Tier 1 | Tier 2 active | Tier 3 |
| --- | --- | --- | --- |
| Brute Slicer | +50% manual yield / +30% manual heat | Neural Spike: 200× click yield, +40 heat, 30s cooldown | ×2 all output at saturation ≥75 |
| Cryo Specialist | −25% generated heat | Ice Wall: heat held at zero for 10s, 45s cooldown | Saturation capped at 95; halve output at the cap |
| Daemon Fuser | Recover alternate phantom pulses at ×2 yield | Remove 10% of current saturation for 100 RAM per point, 60s cooldown | At 100 saturation convert into a ghost with +1,000 RAM/sec |

Two ambiguity fixes are explicit: Cognitive Anchor has an output cost so it does not grant unconditional risk-free redlining; Blackwall Breach has a defined conversion unit and cannot consume saturation below an AI identity floor. Digital Fusion uses the same ghost instability rules as containment.

## Recovery and narrative

Vent: −50 heat (−75 with Exchanger), 5% current RAM, 20s cooldown, available at zero reserve. Suppression: 15s saturation immunity, one 500-RAM charge, +25% heat generation for 60s, cannot stack. Memory purge: return to identity floor, H=0, pay 10% RAM, 120s cooldown, whole den disconnects for at least 10s; reconnect manually after recovery. Free disconnect always leaves cooling running.

Containment offers free replacement with Neural Link salvage, a 90%-reserve neural flush that removes Neural Links and AI integration, or conversion into a Ghost Core. Neural Link loss is den-wide because hardware is shared; skills and extraction credit are removed only for the replaced/flushed runner. Replacement/flush removes den-wide AI integration and identity floors; historical story decisions remain resolved. All choices work at zero banked RAM.

All ten nodes in the first draft are implemented with original dialogue, choices, resource effects, and three endings. Story uses extraction milestones without mandatory saturation gates; a protective run can finish. The Capri choice appears at 50K extraction without requiring Neural Link level three, avoiding a hardware-spend gate. Presentation currently uses a common dialogue per node rather than separate high/low-saturation voice variants. All ending routes may continue in free play or prestige from BLACKWALL.

Story modals freeze the simulation and apply decisions once. Saturation injections are checked against skills and identity floors, then containment takes priority over the next story node. Decisions, pending modals, and timers survive reload.

## Scene hierarchy and HUD

```text
BootScene → PreloadScene
               ├── BackgroundFXScene  procedural grid, links, CRT render node
               ├── MainGameScene      SVG core, orbit geometry, pulse particles
               ├── UIScene            fixed-step engine driver and HUD updates
               └── ModalScene         native dialog layer and focus isolation
```

The scene list defines order; `setDepth` on objects is not used to order independent scenes. Boot and preload stop when finished. UI and Modal scenes render accessible HTML layers outside the game cameras. This deliberate hybrid provides native keyboard focus, readable text, scrollable upgrade lists, and stable emergency controls without distorting hit areas.

Reference design bounds remain 1280×720: header `(0,0,1280,64)`, extraction zone `(0,64,640,576)`, drawer `(640,64,640,576)`, and bottom navigation `(0,640,1280,80)`. These are exported as `HUD_LAYOUT` reference values rather than hard-coded browser pixel positions. The shipped layout adds a dedicated telemetry row, uses CSS grid bounds, and scales the canvas with Phaser RESIZE and a centered camera. At 720px height, drawers scroll internally so controls and navigation remain visible. At widths ≤760px, the console and drawer stack and bottom tabs remain sticky.

Tabs: Matrix → topology, milestones, duty slider; Hardware → nine upgrade tracks and suppression charges; Runners → recruitment, selection, exclusive skill branches and abilities; Blackwall → six-node persistent tree, ending archive and wipe; Terminal → chronological events, motion/CRT toggles and save tools. Arrow keys navigate tabs. Purchases preserve the panel's scroll position.

## CRT and sound

The supplied shader is adapted to an actual Phaser 4.2.1 `BaseFilterShader` render node plus `Phaser.Filters.Controller`. It uses `uMainSampler`, Phaser's bounded sampler insertion, and live DrawingContext dimensions. Time comes from the scene clock instead of a hard-coded 0.016 increment. Source is in `src/shaders/cyberpsychosis.glsl`; registration and uniforms are in `src/effects.ts` and `src/scenes.ts`.

Curvature, scanlines, saturation-scaled horizontal tearing, RGB separation, static, and red edge tint affect visual scenes only. The HUD and dialogs stay readable. CRT can be disabled; reduced-motion disables the animated filter and core movement. Canvas rendering remains possible without the custom WebGL filter. Audio is generated through one Web Audio graph: extraction pulses, critical notes, purchase confirmations, vents, story tones, alarm, tab ticks, and a quiet 55Hz ambient oscillator. Audio starts muted and requires an explicit click to enable; hidden tabs suspend it.

## Saving and QA

Saves are versioned JSON with numeric/shape validation, a previous valid browser-storage backup, and atomic in-memory import validation. User strings are escaped before display. The simulation uses 50ms steps and does not advance while hidden, closed, paused, or awaiting a choice. There are no runtime debug grants or backdoors in the shipped UI.

`npm test` runs 27 deterministic engine tests. `tests/make-qa-saves.ts` generates three explicit fixtures under `/tmp` for browser testing through the real Import Save flow; these are excluded from `dist`. `tests/responsive.html` embeds the real app at 390×844 for browser responsive QA, and is also excluded from `dist`. Save import supports JSON files and pasted JSON; invalid input produces an inline accessible status and preserves the current run. Multiple simultaneous tabs do not coordinate ownership of the same browser save; use one active tab.

Build verification checks TypeScript and bundles the application. Browser verification exercises real hold input, purchases, passive generation, tabs, skill unlocking and active abilities, meta purchases, containment, prestige, save import/reload, and the mobile layout. Test fixtures prove those paths work independently of natural play duration; they do not establish economy balance, a 45-minute completion time, perceived audio quality, or performance across all mobile GPUs.
