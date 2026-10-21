# Protocol: Blackwall Drift

Game design draft · 21 October 2026 · Balance values are prototype hypotheses.

## 1. Game promise and scope

A 2D netrunner management clicker: extract stolen data, build an underground server den, and decide how much of a runner's identity to trade for throughput. Heat is a short-term scheduling problem; psychosis saturation is a lasting consequence within a run. The best moment is choosing to stay connected for one more profitable burst despite a clearly forecast breach.

Use the supplied Night City, Blackwall, Capri, and NetWatch references as the requested fictional premise. This design does not establish the supplied television release date, characters, or plot as verified canon. Story content below is original draft material for this game.

First playable scope: one runner, three network tiers, five upgrade tracks, ten event nodes, three containment outcomes, three endings, local saves, and one prestige loop. Multiple runners, tactical combat, inventory loot, and procedural dialogue are later expansions.

Target: desktop browser first, mouse and keyboard, responsive touch layout. Sessions should support short active bursts and deliberate safe automation. A first ending should take roughly 45–60 minutes; tune this target through playtests.

## 2. Core loop and economy

1. Extract from the central network node by clicking, holding the extract input, or enabling automation.
2. Spend banked RAM on click yield, harvesters, cooling, neural links, and suppression supplies.
3. Watch projected heat balance and saturation growth. Burst, vent, throttle, or disconnect.
4. Resolve story choices that alter access, identity, and the den's production model.
5. Reach an ending or burn the den for Blackwall Fragments and begin another run.

RAM is the game's abstract extracted-data currency; it is not the runner's hardware memory capacity. Maintain distinct counters:

| Counter | Meaning | Spending/reset rule |
| --- | --- | --- |
| Banked RAM | Spendable currency | Purchases and recovery consume it |
| Run extraction | RAM actually produced during this run | Never decreases; gates story and prestige |
| Lifetime extraction | Historical production across runs | Never decreases; statistics only |
| Blackwall Fragments | Prestige currency | Persists through run resets |
| Runner experience | Optional future progression | Omit from MVP to avoid a second level economy |

Gifts, refunds, and salvage do not increase extraction counters. Prevents recycling currency into milestone rewards.

Initial production: 10 RAM per accepted extraction pulse. Holding Space or the node produces 4 pulses/second; manual input is capped at 6 accepted pulses/second, equally for yield and heat. Ignore keyboard repeat as an independent input source. This keeps strategic bursts useful without requiring rapid repetitive clicking.

Automation produces RAM continuously, but each harvester has an explicit heat load. Provide a 0–100% duty slider; production and heat scale together. A free disconnect button stops all extraction, including AI production, while cooling continues.

Upgrade starting costs: deck 100 RAM, harvester 250, cooling 200, neural link 1,000, suppressant charge 500. Hardware track price at owned level n: `ceil(baseCost × 1.65^n)`; suppressant price is fixed. Deck levels add 5 RAM/pulse, harvesters add 20 RAM/s and 0.6 heat/s, cooling levels add 0.75 heat/s dissipation. Neural links have three purchasable levels; each adds 10% base yield and 0.25 chrome load. Exact milestone pacing needs simulation before implementation balancing is considered complete.

## 3. Heat and saturation model

All times below are simulation seconds. Heat H and saturation P are real numbers in [0,100]; stage transitions use unrounded values. Each accepted pulse adds heat once, independently of frame rate.

```text
heatPerPulse = 1.5 × toxicityMultiplier
automationHeatPerSecond = harvesters × 0.6 × duty × toxicityMultiplier
coolingPerSecond = (3 + coolingLevels × 0.75) × coolingModifier
H = clamp(H + acceptedPulses × heatPerPulse
            + (automationHeatPerSecond - coolingPerSecond) × dt, 0, 100)

chromeLoad = 1 + 0.25 × neuralLinkLevels
saturationPerSecond = max(0, H - 70) × 0.025 × chromeLoad
P = clamp(P + (suppressed ? 0 : saturationPerSecond) × dt, P_floor, 100)
```

Use a fixed 50 ms simulation step, queue accepted input pulses, and evaluate state transitions after each step. Cooling cannot push heat below zero. Saturation does not naturally decay, and reducing heat cannot undo existing saturation. Display heat in points, saturation in percent, and changes in points/second.

Calibration example: with no upgrades or automation, four pulses/second generate 6 heat/s against 3 cooling/s. From H=0 the runner crosses H=70 in about 23.3 seconds and reaches H=100 in about 33.3 seconds. At H=100 and chrome load 1, saturation grows at 0.75 points/s. A link-level-three runner at the same heat accumulates 1.3125 points/s. These are formula examples, not playtest results.

Always display current net heat/s, saturation/s, and time to P=100 at the current rate. Forecast is conditional on unchanged settings; use “stable” when growth is zero. At H=100 extraction continues and saturation keeps accumulating: reaching the heat cap is not protection.

## 4. Saturation stages

| P interval | State | Production and cooling | Disruption and presentation |
| --- | --- | --- | --- |
| [0,25) | Nominal | ×1.00 click payout; ×1.00 cooling | Clear cyan HUD |
| [25,50) | Neural Fraying | ×1.15 click payout; ×0.90 cooling | Decorative edge jitter; first intrusive log |
| [50,75) | Cognitive Splintering | ×1.40 click payout; ×0.90 cooling | Every tenth accepted pulse yields zero RAM, still generates heat; visible 1–10 counter |
| [75,100) | Blackwall Drift | ×2.00 click payout; ×0.90 cooling | Same phantom-pulse rule; every 15 active seconds, harvester output locks for 3 seconds after a 2-second warning |
| 100 | Breach | Production stops | One containment decision; simulation pauses |

Only one stage multiplier applies. Neural-link yield multiplies base click and harvester production; stage and story trace bonuses affect clicks only. AI autopilot multiplies harvester production only. Phantom pulses generate no production counters. Lockouts also stop the locked harvesters' heat; other heat and cooling continue.

Replace the attachment's random lost clicks with a visible deterministic cycle so input never feels broken. Show the upcoming lockout and keep controls usable. On entering Drift, begin a fresh 15-second lockout cycle; on leaving it, cancel that cycle. Maintain the phantom counter across stage changes within the run to prevent toggling exploits.

The interface calls this fictional condition “neural saturation”; character dialogue can use “cyberpsychosis.” Symptoms come from invasive hardware and hostile AI within the story. The runner remains a character with agency, memories, and relationships.

## 5. Mitigation and recovery

| Action | Effect | Price and limits |
| --- | --- | --- |
| Cryo-Vent Flush | H −50, clamped to zero | Pay `ceil(0.05 × bankedRAM)`; usable at zero RAM; 20-second cooldown |
| Suppression | Prevents further P growth for 15 seconds | Spend one charge; heat generation ×1.25 for 60 seconds from use |
| Memory Purge | H=0, P=P_floor; cancels temporary trace, suppression, toxicity and lockout effects | Pay 10% banked RAM; extraction offline for 10 seconds; once per 120 active seconds |
| Disconnect | Stop manual and automatic output/heat; retain cooling | Free, unlimited; no saturation recovery |

Suppression cannot be reused while its 60-second toxicity window is active. Cooldown displays the full restriction. It cannot reverse a breach already committed. No immunity stacking or permanent suppression loop.

Replace the attachment's lifetime-XP deletion with a visible, bounded purge cost. Historical achievements should remain trustworthy. Purging preserves hardware and story decisions, including an accepted AI floor. Baseline P_floor=0; AI integration sets it to 50. Explain the floor before the player accepts integration.

At P≥90 show a persistent emergency strip with disconnect, vent, purge availability, and breach forecast. When purge is cooling down, free disconnect still prevents further damage after cooling below H=70. Story decisions may explicitly add saturation; they preview the resulting value and potential breach.

## 6. Breach and containment

State flow: `running → containment → recovery → running`, with terminal `ending` and `prestige` states. A single transition owner latches the first crossing of P=100. Stop all production, pause timers, commit state to save, and present the choices without a countdown. No random destruction occurs before a decision.

| Choice | Explicit consequence | Return to play |
| --- | --- | --- |
| Terminate the connection | Retire the runner's active identity; salvage 50% of RAM spent on deck and links; lose those upgrades | A replacement arrives free, H=0/P=0; harvesters and cooling remain |
| Forced Neural Flush | Pay 90% banked RAM; remove neural-link upgrades and AI integration; retain deck and infrastructure | H=0/P=0, 10-second recovery |
| Unbind & Accelerate | Convert the runner into the single Ghost Core; remove manual extraction | Harvesters ×2, no H/P growth, plus the scheduled instability event below |

Autopilot and Ghost Core multipliers never stack: conversion replaces autopilot and clears the biological heat model. Replacement/flush removes the AI floor. An AI-accepted story flag remains historical and cannot grant the integration reward a second time.

Ghost instability is deterministic: every 60 active production seconds, pause automation for 10 seconds and lose 5% of banked RAM once. Warn 5 seconds before. This replaces the attachment's undefined “+20% instability” with a measurable cost. Disconnect pauses this schedule. Ghosts do not cause recursive breaches. A free “retire Ghost Core” action removes the ghost and its instability, installs a replacement runner, and retains hardware.

All choices are affordable at zero RAM; a replacement starter deck and free cooling guarantee recovery. No paid continue, irreversible softlock, or automatic permanent runner death. The story can frame the retired identity ambiguously, but mechanical consequences must be explicit.

## 7. Narrative progression

Original runner: **Vex**, a data thief who records voice notes to prove which memories are still theirs. Supporting voice: **Patch**, the den's hardware medic. **CAPRI_ECHO_09** may be a person, a reconstruction, or an entity impersonating both. Decisions determine whether the den protects human continuity, accepts integration, or preserves a digital witness.

Act I — Sub-Grid Scraping (0–10,000 extraction): make the den work; discover memories inside stolen data.

Act II — Deep ICE Slicing (10,000–100,000): choose protection or write access; discover who benefits from each.

Act III — Blackwall Syphoning (100,000–1,000,000): carry a witness through a network purge; choose what deserves to survive.

Story nodes are once per run unless stated otherwise. Branches rejoin; conservative play reaches an ending without deliberately raising P. Heat/saturation triggers reveal extra dialogue, not mandatory progression barriers.

### N00 — Cold Boot

Trigger: new run. Patch: “Before you steal anything, learn how to come back.”

- **Run the safety diagnostic:** pause for a brief H/P explanation; grant one suppressant charge.
- **I know this rig:** skip explanation; grant the same charge. Tutorial remains available.

Next: N01. No risk or economic penalty for reading.

### N01 — Borrowed Bandwidth

Trigger: run extraction ≥1,000, N00 resolved. Vex: “Cheap node. Somebody is paying to keep its cameras blind.”

- **Strip the corporate cache:** +300 banked RAM; flag `cacheStripped`.
- **Leave the residents' relay intact:** +150 banked RAM; flag `relayProtected`.

Next: N02. This establishes who the den protects without locking a technology tree.

### N02 — Phantom Signal

Trigger: run extraction ≥10,000, N01 resolved. If P≥25, use the personal-memory variant; otherwise a quarantined recording reveals the same lead. Vex: “That voice knows the name I used before the implant.”

- **Trace CAPRI_ECHO_09:** unlock the deep-web route; click payout ×1.5 for 120 active seconds; P +15; flag `signalTraced`.
- **Quarantine a copy:** +2,500 banked RAM, H=0; flag `signalQuarantined`; Patch studies the inert copy.

Both unlock deep ICE upgrades. Preview any P=100 consequence before tracing. Next: N03.

### N03 — A Name That Isn't Yours

Trigger: run extraction ≥25,000, N02 resolved. An archived voice claims that Vex stole its childhood. The trace route hears it live; quarantine receives Patch's recovered transcript.

- **Save the testimony:** +10% cooling for the run; flag `witnessSaved`.
- **Strip the payload for hardware:** grant one deck level without increasing the next purchase's base price formula beyond normal owned-level counting; flag `witnessStripped`.

Next: N04. The cooling benefit multiplies other cooling modifiers and does not stack with itself.

### N04 — The Capri Protocol

Trigger: run extraction ≥50,000 and link level ≥3, N03 resolved; alternatively extraction ≥75,000 bypasses the link requirement. If P≥60, Capri speaks through Vex; otherwise it appears in Patch's sandbox. Capri: “Let me carry the part of thinking that hurts.”

- **Grant write access:** harvesters ×4 total (+300%, not ×3); P_floor=50 and P=max(P,50); flag `aiAccepted`.
- **Install Blackwall ICE:** cooling ×1.25 for the run; flag `aiRejected`; rejects write access for this run.

The bypass prevents a cooling-focused or underfunded player from missing the plot. Both unlock tier-three purchasing. The interface makes clear that purging cannot remove an accepted floor; neural flush can. Next: N05.

### N05 — The Debt in the Machine

Trigger: extraction ≥100,000, N04 resolved. On the AI route, Capri calls the missing voice an obsolete process. On the firewall route, Patch finds the same voice in an ICE deletion queue.

- **Preserve the witness:** pay up to 5,000 banked RAM (never below zero); set `witnessSaved`; +10% base production for the run.
- **Sell the coordinates:** +10,000 banked RAM; flag `coordinatesSold`; public-grid text later acknowledges the betrayal.

Next: N06. The production reward applies to clicks and harvesters, is not extraction itself, and is additive with link yield bonuses before route multipliers.

### N06 — Black Ice Weather

Trigger: extraction ≥250,000, N05 resolved. NetWatch begins narrowing the den's signal. Vex: “They are not following our data. They are following the gaps.”

- **Route through the relay:** if `relayProtected`, no cost; otherwise pay 10% banked RAM. Receive +25% cooling for 120 active seconds.
- **Run a loud decoy:** +25,000 banked RAM and H +25, clamped to 100. No immediate saturation injection.

Next: N07. A prior choice changes the scene and price without blocking progress.

### N07 — Who Is Holding the Line?

Trigger: extraction ≥500,000, N06 resolved. If `witnessSaved`, its voice distinguishes itself from Capri. Otherwise Patch reconstructs enough evidence to identify the conflict. Vex: “When it says ‘we,’ I need to know who it means.”

- **Anchor Vex's identity:** +1.0 cooling/s for the run; flag `identityAnchored`.
- **Map the fracture:** +20% base production for the run, P +10; flag `fractureMapped`.

Next: N08. Ghost-route versions use the same rewards, describe identity archives, and ignore P injections because the runner is digital.

### N08 — Blackwall Meltdown

Trigger: extraction ≥1,000,000 and N07 resolved. P≥95 adds the fractured-mind variant; low-P runners receive a NetWatch infrastructure-sweep variant. There is no real-time failure timer; “30 seconds” is dialogue about the fictional sweep, and simulation pauses for the choice.

- **Siphon the witness into a Ghost Core:** end as **Digital Witness**. Vex remains biological if still present; the ending creates a separate narrative archive. A playable Ghost Core may be selected after the ending using the conversion rules above.
- **Burn the server rack:** end as **Ash Protocol**; proceed to the prestige summary.
- **Sever the uplink and extract Vex:** end as **Human Continuity**; keep the den available for free play. If Vex is already digital, the scene preserves their archive on an isolated deck instead.

The first two options retain the attachment's climax. The third provides a complete protective route. Ending text reflects `aiAccepted`, witness treatment, relay treatment, and whether Vex became a ghost. Next: N09.

### N09 — What Survives

Trigger: any ending. Show extraction, peak H/P, containment choices, witness disposition, and projected Fragments.

- **Rebuild:** claim prestige once and start a new run after a reset preview.
- **Stay in the den:** return to free play for Human Continuity/Digital Witness; Ash Protocol remains at the safe summary until rebuilding.

Prestige becomes available for every route after its first ending. Containment before N08 does not delete story flags; later dialogue adapts to the replacement or ghost. Each story reward is claimed once, even after reload or runner replacement.

## 8. Event scheduling and saving

Use declarative node data: `id`, `act`, `prerequisites`, `eligibility`, `variant`, `priority`, `choices`, `effects`, and `next`. Effects are typed actions such as `grantBankedRam`, `addSaturation`, `setFlag`, `setModifier`, and `enterEnding`.

Priority: breach containment → pending story choice → normal extraction. Only one modal exists at a time. Freeze simulation and input behind any choice modal. Resolve effects atomically, mark the node resolved, save, then check for breach before another story node. A saturation-increasing choice may immediately cause containment; its story reward cannot be claimed twice.

Save schema version, currencies, owned levels and purchase spend, H/P/floor, runner mode, flags, resolved/pending nodes, simulation timers, cooldowns, pulse counter, lockout/instability state, modifiers, settings, run ID, and prestige-claimed status. Validate and migrate loaded saves; keep a previous valid snapshot. Save on purchases, choices, containment, prestige, visibility changes, and periodically during play.

MVP deliberately pauses while the tab is hidden or the game is closed: no offline harvesting or unseen breaches. Timed bonuses and cooldowns use active simulation time. On return, display “Connection suspended while away.” Never process a long frame as one large heat/saturation jump. Explicit pause freezes all gameplay timers too.

## 9. Prestige

At an ending, award `floor(sqrt(runExtraction / 100000))` Fragments on rebuilding; 1,000,000 extraction yields 3. Mark the old run claimed before constructing the next run, so reload cannot double-claim. Formula inputs exclude gifts and salvage.

Rebuild clears banked RAM, hardware, H/P, runner mode, route flags, temporary effects, and resolved run nodes. Retain Fragments, bought meta-upgrades, lifetime extraction, settings, and ending archive. Existing end-of-run RAM does not transfer.

Initial meta-upgrades: Backup Cooling (costs 1/2/3 Fragments for three levels, each +0.5 cooling/s), Cached Deck (cost 2, +5 starting RAM/pulse), Identity Vault (cost 3, purge cooldown 90 instead of 120 seconds). Avoid saturation immunity as a permanent upgrade; the central tradeoff must survive prestige.

## 10. Interface and supplied SVGs

At a 1280×720 reference size: resource totals at top; central clickable node and network connections; runner card with H/P, rates, and breach forecast on the left; upgrades on the right; readable terminal and mitigation controls along the bottom. Use a 2D procedural grid and modest particles to make the den feel alive without requiring character animation. Touch layout stacks the side panels below the extraction node; controls retain 44 px minimum targets.

| File | Role | Proposed display |
| --- | --- | --- |
| `public/assets/svg/node-core.svg` | Extraction target | 192–256 px; subtle ring rotation and accepted-pulse feedback |
| `public/assets/svg/psychosis-warning.svg` | Saturation and breach | 24–40 px with adjacent stage text |
| `public/assets/svg/ram-chip.svg` | Currency and harvester track | 24–48 px |
| `public/assets/svg/cryo-vent.svg` | Vent control | 40–56 px with numeric cooldown |
| `public/assets/svg/hud-frame.svg` | Decorative panel corners | Preserve ratio or rebuild borders procedurally; do not distort text |

The extracted SVGs preserve the supplied XML. They are source assets, not yet verified Phaser textures. Rasterize once at the required device scale during preload; check blur-filter clipping, legibility at small sizes, and transparency in a browser. Load failures should have procedural shape fallbacks. Do not create Blob URLs each frame; revoke any temporary URL after load completion or failure.

Glitches affect the network backdrop, character portrait placeholders, and decorative log fragments. Resource numbers, choice text, hit areas, and emergency controls remain stable. Never scramble the only copy of a narrative clue. Reduced-motion mode removes shaking, jitter, and flashes; effects intensity can be set to zero. State is always communicated through text and icons as well as color. Audio starts after user input and offers separate alarm/music controls with visual equivalents.

Audio directions: low electrical pulse for extraction, soft relay clicks for upgrades, rising filtered tone above H=70, and restrained layered voices at high P. No generated or licensed audio is included in this draft.

## 11. Phaser 4 and TypeScript implementation boundary

Verified on the draft date: Phaser's release archive lists 4.2.1, and the TypeScript npm `latest` metadata reports 7.0.2. Pin verified stable versions and commit a lockfile when implementation starts; check the registry again then.

- [Phaser release archive](https://phaser.io/download/archive)
- [TypeScript package metadata](https://registry.npmjs.org/typescript/latest)
- [Phaser 4 renderer and filter changes](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4)

Suggested structure: Boot/Preload scene for assets, Den scene for presentation, overlay scene for HUD and choices, and a framework-independent TypeScript simulation for economy, heat, story, containment, and saves. No physics engine is needed for the MVP. Keep balance data separate from rendering and narrative text.

Phaser 4 replaces Phaser 3 custom pipelines with render nodes and unified filters. Treat the attachment's `scene.glitchPipeline.setFloat1(...)` example as pseudocode: do not copy it as a validated Phaser 4 API. First ship readable tint/overlay effects using standard objects; add a version-checked custom filter after the game loop works. Use scene-level layout calculations around a reference resolution; containers alone do not constitute a responsive layout system.

## 12. Prototype delivery and validation gates

1. **Core loop:** node input, resources, upgrades, stable simulation, vent/disconnect, and local save. Verify equal production/heat at 30/60/144 rendering FPS and at different input methods.
2. **Risk loop:** stages, suppression/toxicity, purge/floor rules, lockouts, and containment. Check exact 25/50/75/100 boundaries, zero-bank recovery, and no duplicate transitions.
3. **Narrative:** all ten nodes and branching text. Complete protective, AI, and early-ghost routes; ensure all can reach N08. Reload during every choice and containment without duplicate rewards.
4. **Prestige:** all endings, claim-once behavior, reset preview, persistent meta-upgrades, and repeated runs without lost progression.
5. **Presentation:** extracted SVG loading, keyboard/touch controls, muted audio, reduced motion, resize, and return from hidden tab. Confirm emergency controls remain readable at maximum effects.

Balance acceptance targets: first upgrade within 30 seconds; safe automation can always be throttled below cooling capacity; increased output and eventual recovery cost leave cautious and risky routes both useful; no unattended loss while away. Measure route time, RAM/minute, time spent disconnected, purge frequency, and containment frequency before tuning rewards. These targets remain untested until a playable prototype exists.
