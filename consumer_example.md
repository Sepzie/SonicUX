## Musify every interaction

Do it with *hierarchy* so it doesn’t become annoying:

### Level 1: Always-on ambience (very subtle)

* Mouse movement changes width + gentle harmonic richness
* Scroll progress changes brightness (filter cutoff) and reverb size
* Scroll velocity briefly adds motion (LFO depth), then decays

### Level 2: Micro-events (rare, pleasant)

* Click triggers a short pluck, pitch based on click position
* Hover start triggers a soft “hint” (a dyad or single overtone)
* Section change triggers a cadence, then settles into a new pad chord

### Level 3: Instrument zones (explicit playful elements)

Only a few areas behave like an instrument so it feels intentional:

* A “Play area” in the hero section: clicking empty space plays a tone
* A “Harmony wheel” or small grid: dragging creates chords
* Maybe your project cards: click = pluck, open = resolved chord

This gives people an “aha” moment without turning the whole site into a soundboard.

---

## Your specific UI ideas, made coherent

### Skills icons should still filter projects

Keep that behavior, but add a *sound signature* that reflects the filter action:

* Clicking a skill icon plays a short “tag sound” (same timbre per skill, pitch varies slightly)
* Applying a filter triggers a soft chord change that matches the category mood
* Removing a filter resolves back toward the home key

So the sound supports the UI action, not competes with it.

### Clicking empty space plays a tone

Do this only inside a clear “instrument zone” (otherwise it will be confusing).

Mapping idea:

* X position → scale degree (e.g., 7 notes across)
* Y position → octave or chord extension (higher = brighter)
* Click strength (or time since last click) → velocity

This is easy, delightful, and looks impressive.

---

## Structured plan to use this in the portfolio (shippable)

### Phase 0: Safety and UX baseline (must-have)

* Audio is OFF by default
* A clear toggle: “Enable Soundscape”
* Respect `prefers-reduced-motion` and add “Minimal audio mode”
* Auto-mute when tab loses focus

### Phase 1: Core ambience (1–2 evenings)

Implement these mappings:

* scrollY → brightness + reverb
* pointerX/Y → width + warmth
* pointerSpeed + scrollV → motion burst (decays smoothly)
  Deliverable: site feels alive even without clicking.

### Phase 2: Micro-events (1 evening)

* click anywhere (non-instrument UI) → subtle pluck (quiet)
* hover project card → tiny overtone (very soft)
* section change → cadence + new pad chord

Deliverable: navigation feels musical.

### Phase 3: Instrument zone (1–2 evenings)

* Add a visible “Play” area
* Click to play notes based on position
* Optional: click-and-drag to arpeggiate

Deliverable: an explicit wow moment.

### Phase 4: Skill icons + filtering integration (1 evening)

* Skill icon click still filters projects
* Sound: tag sound + slight harmonic shift
* Add “sound identity” per skill (timbre preset)

Deliverable: functional UI with delightful sound feedback.

### Phase 5: Polish and ship

* Loudness cap, limiter, soft fade-in/out
* Debug overlay (hidden toggle): show key, chord, tension, params
* Performance check: stable, no stutters
