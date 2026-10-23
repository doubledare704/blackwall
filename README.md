# Blackwall Drift

A playable 2D cyberpunk incremental game built with **Phaser 4.2.1**, **TypeScript 7.0.2**, and **Vite 8.3.5**. Assets, fonts, synthesized audio, story, and saves are local. No backend or API keys are required.

**Play online:** [blackwall-drift.vercel.app](https://blackwall-drift.vercel.app/)

Production is hosted on Vercel. Once the CLI is linked to this project, deploy updates with `vercel deploy --prod`. The tracked `vercel.json` specifies the Vite build and `dist` output; account-specific `.vercel` metadata stays ignored.

## Run

Use Node.js 22.12+ (developed and checked with Node 26).

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite. Click or hold the core, or hold Space. Hardware generates RAM and heat; saturation accumulates above the safe heat threshold. Vent, suppress, purge memories, or disconnect to manage the risk. The five bottom tabs expose network progress, hardware, runner skills, prestige, and logs/save tools.

Sound starts muted. Enable SOUND in the header for the synthesized interface tones and ambient hum. Motion and CRT controls are in the operator manual (`?`) and Terminal. Fonts are bundled; gameplay makes no external service requests.

## Included

- Fixed-step production, heat, saturation, critical and phantom pulses, lockouts, and recovery.
- Nine hardware upgrades, four recruitable runner slots, and three exclusive skill specializations.
- Six permanent Blackwall upgrades with prerequisites and escalating costs.
- Ten story nodes, three endings, three containment choices, and repeatable prestige runs.
- Phaser scene stack, procedural network graphics, supplied SVG assets, and a Phaser 4 custom CRT filter.
- Responsive keyboard/touch interface with native modal focus handling and reduced-motion support.
- Versioned local saves, a previous valid backup, and JSON import/export through Terminal.

Time pauses while the tab is hidden or closed. There is no offline production or damage. Saves belong to the browser origin; export before changing ports/browsers or clearing browser data. Use one active game tab per origin; concurrent tabs do not coordinate save ownership. No cloud sync is implemented.

## Verify and build

```sh
npm test
npm run build
npm run preview
```

Production output is `dist/`. The Phaser engine makes the main bundle larger than Vite's generic 500 kB warning threshold (roughly 380 kB gzipped for the combined JavaScript); this is a successful build with a size advisory.

Engine tests cover timing, risk, containment, skills, story, saving, and prestige. The browser QA procedure and implementation decisions are in [docs/implementation.md](docs/implementation.md). Balance and session-length targets still need longer playtesting; this is a playable prototype, not a claim of production readiness.

## Source map

| File | Responsibility |
| --- | --- |
| `src/engine.ts` | Simulation, commands, validation, persistence |
| `src/data.ts` | Hardware/meta/skill definitions and story nodes |
| `src/scenes.ts` | Boot, preload, background, extraction, HUD, modal scene hierarchy |
| `src/effects.ts`, `src/shaders/cyberpsychosis.glsl` | Phaser 4 filter controller and render node |
| `src/ui.ts`, `src/style.css` | Accessible HUD, tabs, responsive layout, dialogs |
| `src/audio.ts` | Gesture-activated Web Audio synthesis |
| `public/assets/svg/` | Five supplied SVG source assets |
| `tests/engine.test.ts` | Deterministic simulation tests |

The game uses the requested fan-inspired setting and original dialogue. The supplied television release/plot claims are not established as canon by this project.
