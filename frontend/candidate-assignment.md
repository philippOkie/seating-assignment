# Interactive Event Seating Map — Frontend Take-Home Task

## Overview

Build a small React + TypeScript application that renders an interactive seating map for an event. Users should be able to inspect seats, select available seats, and see a live selection summary.

The goal of this assignment is not to build a production-grade ticketing system. We are mainly interested in your rendering strategy, trade-offs, accessibility model, and ability to keep the UI usable with a large seating dataset.

There is no single expected rendering approach. SVG, Canvas, DOM, virtualization, hybrid approaches, and other methods can all be valid if the trade-offs are understood and explained.

Please do not spend more than roughly **3–4 hours** on the core task. Prefer documenting trade-offs and limitations over adding lots of polish.

AI tools are allowed. You will be evaluated on the final result, the decisions you made, what you verified, and how well you can explain the implementation.

---

## Deliverables

Submit a Git repository or zipped archive containing:

- A React + TypeScript application with documented install and development commands, for example:

```bash
npm install
npm run dev
```

`pnpm`, `yarn`, or another package manager is also fine if your README documents the commands clearly.

- TypeScript with `strict` mode enabled.
- A short README explaining how to run the application.
- A required `Rendering Strategy` section in the README.
- A required `Performance Notes` section in the README.
- A required `Accessibility Notes` section in the README.
- Any tests you choose to include.

---

## Provided data

Use the provided venue fixtures:

```txt
public/venues/small.json
public/venues/medium.json
public/venues/large.json
```

The fixtures use the same schema. The large fixture contains approximately 15,000 seats and is intended to stress your rendering and interaction approach.

You may start development against `small.json` or `medium.json`, but your solution should remain usable with `large.json`.

### Fixture purpose

| Fixture | Approx. seats | Purpose |
|---|---:|---|
| `small.json` | 100–200 | Easy debugging and visual correctness |
| `medium.json` | ~2,500 | Normal development and interaction testing |
| `large.json` | ~15,000 | Performance and architecture stress test |

### Data shape

The venue model looks like this, simplified:

```ts
type SeatStatus = 'available' | 'reserved' | 'sold' | 'held';

type Venue = {
  venueId: string;
  name: string;
  map: {
    width: number;
    height: number;
  };
  priceTiers: Record<
    string,
    {
      label: string;
      priceCents: number;
      currency: string;
    }
  >;
  sections: Array<{
    id: string;
    label: string;
    transform: {
      x: number;
      y: number;
      scale: number;
    };
    rows: Array<{
      index: number;
      label: string;
      seats: Array<{
        id: string;
        col: number;
        x: number;
        y: number;
        priceTier: number;
        status: SeatStatus;
      }>;
    }>;
  }>;
};
```

Seat coordinates are absolute within `map.width` / `map.height`. No layout algorithm is required.

The provided data intentionally includes multiple sections, uneven rows, mixed statuses, different price tiers, gaps, and non-perfect geometry. Do not assume a simple rectangular grid.

---

## Core requirements

### 1. Load and render a venue fixture

Load one of the provided JSON fixtures and render all seats in their correct positions.

You can choose how the active fixture is selected. For example:

- hardcoded during development,
- a small fixture selector in the UI,
- a query parameter such as `?venue=large`,
- or another simple approach.

### 2. Seat inspection

When a seat is clicked or focused, display useful seat details:

- section,
- row,
- seat/column,
- price tier,
- price,
- status.

### 3. Seat selection

Users should be able to select and deselect seats.

Rules:

- Only `available` seats can be selected.
- A user can select up to 8 seats.
- Selected seats should be visually distinguishable.
- The UI should clearly communicate why unavailable seats cannot be selected.

### 4. Selection summary

Show a live summary of selected seats, including:

- selected seat IDs or labels,
- individual prices,
- subtotal.

Prices should come from `priceTiers[seat.priceTier].priceCents`.

### 5. Persistence

Persist the current selection after page reload, for example using `localStorage`.

If a persisted seat no longer exists or is no longer available in the loaded fixture, your app should handle that gracefully.

### 6. Accessibility

Provide a keyboard-accessible interaction model.

We do not expect a perfect production accessibility implementation for every possible venue size. We do expect you to think about the trade-offs and explain your approach.

At minimum, your implementation should include:

- meaningful labels for interactive seats or seat controls,
- visible focus states,
- keyboard support for selecting at least the currently focusable/interactive seats,
- a documented strategy for navigating large seating maps.

Avoid placing thousands of elements in the tab order unless you can justify the user experience.

### 7. Responsiveness

The application should be usable on desktop and mobile viewport sizes.

Mobile does not have to be perfect, but the map and summary should remain usable without layout breaking.

### 8. Large fixture usability

The UI should remain responsive with `large.json`.

We care more about the rendering strategy, measurement approach, and trade-offs than a specific FPS number. Document what you tested and where you expect your approach to break down.

---

## Technical constraints

- React 18 or newer.
- TypeScript with `strict: true`.
- Vite + React or Next.js are both acceptable.
- You may use libraries if they are appropriate, but explain why.
- Styling approach is up to you.
- Tests are encouraged but not mandatory.

---

## Suggested README sections

Please include these sections in your README.

### Rendering Strategy

Explain:

- which rendering approach you chose,
- why you chose it,
- which alternatives you considered,
- what the main drawbacks are,
- what re-renders when a seat is selected,
- how your approach would change for 50,000+ seats,
- how your approach would change if production mobile pinch-zoom/pan were required,
- how your approach interacts with accessibility.

### Performance Notes

Explain:

- which fixture(s) you tested,
- how you checked responsiveness,
- known bottlenecks,
- any optimizations you applied,
- what you would measure more rigorously with more time.

### Accessibility Notes

Explain:

- how keyboard users interact with the seating map,
- how focus is managed,
- how seat status and selection are announced or labelled,
- known limitations,
- what you would improve for production.

### Assumptions and TODOs

Explain any assumptions, incomplete work, or trade-offs you intentionally made because of the timebox.

### AI Usage, if applicable

If you used AI tools, briefly mention where they helped and what you manually reviewed or changed. This is not negative; we mainly want to understand how you worked.

---

## Optional stretch goals

Only attempt these if the core task is solid.

- Pan and zoom.
- Touch-friendly mobile gestures.
- Heat-map toggle by price tier.
- “Find N adjacent seats” helper.
- Simulated live seat-status updates.
- Unit tests for selection logic.
- Component or integration tests.
- End-to-end tests with Playwright or Cypress.
- Dark mode with accessible contrast.

---

## Evaluation criteria

We will evaluate:

- Correctness of the core behaviour.
- Rendering strategy and understanding of trade-offs.
- Responsiveness with the large fixture.
- Code quality and TypeScript usage.
- Accessibility and keyboard interaction model.
- Clarity of README explanations.
- Ability to discuss decisions, limitations, and alternatives in the follow-up interview.

We do not expect every optional feature to be completed. A smaller, well-reasoned implementation is better than a broad implementation whose trade-offs are unclear.
