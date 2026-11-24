import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Arena } from "./Arena";
import { buildIndex, money, restore, type Venue } from "./venue";
import "./style.css";

function Booking({ venue }: { venue: Venue }) {
  const locations = useMemo(() => buildIndex(venue), [venue]);
  const key = "metropolis:selection:" + venue.venueId;
  const [ids, setIds] = useState(() => restore(key, locations));
  const [activeId, setActiveId] = useState(
    venue.sections[0].rows[0].seats[0].id,
  );
  const [storageFailed, setStorageFailed] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(ids));
      setStorageFailed(false);
    } catch {
      setStorageFailed(true);
    }
  }, [ids, key]);
  const selected = useMemo(
    () => ids.map((id) => locations.get(id)!.seat),
    [ids, locations],
  );
  const loc = locations.get(activeId)!;
  const section = venue.sections[loc.section],
    row = section.rows[loc.row],
    seat = loc.seat;
  const tier = venue.priceTiers[seat.priceTier];
  const picked = ids.includes(seat.id);
  const reason =
    seat.status !== "available"
      ? "This seat is " + seat.status + "."
      : !picked && ids.length >= 8
        ? "Remove a seat to select another."
        : "";
  function toggle() {
    if (reason) return;
    setIds((old) =>
      old.includes(seat.id)
        ? old.filter((id) => id !== seat.id)
        : [...old, seat.id].slice(0, 8),
    );
  }
  return (
    <div className="layout">
      <main>
        <div className="mapcard">
          <div className="maphead">
            <h2>Seating map</h2>
            <span>{locations.size.toLocaleString("en")} seats</span>
          </div>
          <Arena
            venue={venue}
            active={seat}
            selected={selected}
            inspect={(s) => setActiveId(s.id)}
          />
          <div className="legend">
            <span>Available</span>
            <span>Unavailable</span>
            <span>Selected</span>
          </div>
        </div>
        <div className="card">
          <h2>Inspect a seat</h2>
          <div className="controls">
            <label>
              Section
              <select
                value={loc.section}
                onChange={(e) =>
                  setActiveId(
                    venue.sections[+e.target.value].rows[0].seats[0].id,
                  )
                }
              >
                {venue.sections.map((s, i) => (
                  <option key={s.id} value={i}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Row
              <select
                value={loc.row}
                onChange={(e) =>
                  setActiveId(section.rows[+e.target.value].seats[0].id)
                }
              >
                {section.rows.map((r, i) => (
                  <option key={r.index} value={i}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Seat
              <select
                value={activeId}
                onChange={(e) => setActiveId(e.target.value)}
              >
                {row.seats.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.col} · {ids.includes(s.id) ? "selected" : s.status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="detail">
            <div aria-live="polite">
              <strong>{seat.id}</strong> · {tier.label} ·{" "}
              {money(tier.priceCents, tier.currency)}
              <small>{reason || (picked ? "Selected" : "Available")}</small>
            </div>
            <button disabled={!!reason} onClick={toggle}>
              {picked ? "Remove seat" : "Select seat"}
            </button>
          </div>
        </div>
      </main>
      <aside className="card">
        <h2>Your selection</h2>
        <p aria-live="polite">{ids.length} of 8 seats selected</p>
        {selected.length === 0 && (
          <p className="empty">
            Choose a seat on the map or use the seat controls below it.
          </p>
        )}
        <ul>
          {selected.map((s) => (
            <li key={s.id}>
              <strong>{s.id}</strong>
              <span>
                {money(
                  venue.priceTiers[s.priceTier].priceCents,
                  venue.priceTiers[s.priceTier].currency,
                )}
              </span>
              <button
                className="remove"
                aria-label={"Remove " + s.id}
                onClick={() => setIds((old) => old.filter((id) => id !== s.id))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="subtotal">
          <strong>Subtotal</strong>
          <strong>
            {money(
              selected.reduce(
                (sum, s) => sum + venue.priceTiers[s.priceTier].priceCents,
                0,
              ),
              tier.currency,
            )}
          </strong>
        </div>
        {storageFailed && (
          <small role="status">Selection can’t be saved in this browser.</small>
        )}
      </aside>
    </div>
  );
}
function App() {
  const [size, setSize] = useState("medium");
  const [venue, setVenue] = useState<Venue>();
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const embedded = document.getElementById("venue-" + size);
      if (embedded?.textContent)
        return JSON.parse(embedded.textContent) as Venue;
      const response = await fetch("./venues/" + size + ".json", {
        signal: controller.signal,
      });
      if (!response.ok) throw Error("Venue request failed");
      return (await response.json()) as Venue;
    }
    load()
      .then((data) => {
        if (!controller.signal.aborted) setVenue(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [size]);
  return (
    <>
      <header>
        <div>
          <span className="mark" aria-hidden="true">
            M
          </span>{" "}
          Metropolis Arena
        </div>
      </header>
      <section className="wrap">
        <div className="title">
          <h1>Choose your seats</h1>
          <label>
            Venue size
            <select
              value={size}
              onChange={(e) => {
                setError(false);
                setVenue(undefined);
                setSize(e.target.value);
              }}
            >
              {["small", "medium", "large"].map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {venue ? (
          <Booking key={venue.venueId} venue={venue} />
        ) : (
          <p role="status">
            {error
              ? "Could not load this venue. Try another size or reload."
              : "Loading seats…"}
          </p>
        )}
      </section>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
