# Metropolis Arena seat picker

Run with Node 22.13+ on the 22.x line, or Node 24+. From this directory:

```sh
npm install
npm run dev
```

Open the local Vite URL. Choose a venue size, inspect a seat on the map or through the section, row and seat controls, then select it. The basket accepts up to eight available seats. Removing a seat immediately updates the total. Each venue remembers its own basket.

```sh
npm test
npm run validate:venues
```

The test command builds the strict TypeScript production app and exercises the compiled UI in jsdom. Vite serves the original venue JSON as static assets. React manages selection and inspector state. The only test-specific library is jsdom.

## Rendering Strategy

The base canvas draws every seat at its absolute fixture coordinates when the venue changes. A transparent canvas above it draws the inspected seat and up to eight selections. Selecting a seat updates the summary, controls and overlay. The expensive base layer stays intact. A canvas click maps the pointer into venue coordinates and inspects the nearest seat within ten display pixels. The explicit Select button confirms the choice.

SVG would give each seat its own event target. With 15,000 seats that would create a large DOM even while the user is only working with one row. Canvas keeps the DOM small but needs separate hit testing and keyboard controls. For 50,000+ seats, first measure initial drawing and click latency, then consider a spatial grid for hit testing, viewport culling and tiled rendering. Production pinch-zoom would need a shared camera transform, inverse hit testing, device-pixel-ratio-aware drawing and gesture tests.

## Performance Notes

The interaction test loaded 144, 2,500 and 15,000 seats. On the large fixture it counted 15,000 base drawing calls and verified the count stayed constant through eight selections. It exercised canvas hit testing, blocked seats, the selection limit, price aggregation, removal and reloading a basket containing stale and duplicate IDs. The test stubs canvas drawing in jsdom. It measures work requested by the UI. Actual mobile frame rate, paint cost and touch accuracy still need a real-device profile. Linear scanning on a click and main-thread JSON parsing are the first things to profile.

## Accessibility Notes

Tab reaches three native selectors for section, row and seat. Arrow keys use the platform's native select behavior. Tab then Enter or Space activates the selection button. Seat options include availability or selection, the inspector announces price and status changes, and each basket removal button names its seat. The map is hidden from assistive technology because the native controls expose the same inventory. Only the current row populates the seat selector. Small screens stack the basket below the map.

The controls are the precise alternative where seats overlap visually. A real screen-reader pass, focus recovery after deleting a basket item, and testing on a physical touch device are follow-ups.

## Assumptions and TODOs

The supplied fixtures use EUR throughout and have non-empty sections and rows. Local selection represents intent. Checkout would need a server-confirmed hold. The two exercises run independently. A storage error leaves the basket usable for the current session.

## AI Usage

OpenAI Codex assisted with implementation, documentation and automated verification. The checks and their limits are described above.
