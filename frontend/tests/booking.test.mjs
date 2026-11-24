import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { JSDOM } from "jsdom";

const asset = readdirSync("dist/assets").find((name) => name.endsWith(".js"));
const bundle = readFileSync("dist/assets/" + asset, "utf8");
const fixture = (size) =>
  JSON.parse(readFileSync("public/venues/" + size + ".json", "utf8"));
const pause = () => new Promise((resolve) => setTimeout(resolve, 5));
async function until(check) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (check()) return;
    await pause();
  }
  assert.fail("Timed out waiting for the UI");
}
async function mount(storage = {}) {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://venue.test/",
    runScripts: "outside-only",
  });
  const { window } = dom;
  Object.entries(storage).forEach(([k, v]) =>
    window.localStorage.setItem(k, v),
  );
  const calls = new Map();
  window.HTMLCanvasElement.prototype.getContext = function () {
    const canvas = this;
    return {
      arc() {
        calls.set(canvas, (calls.get(canvas) ?? 0) + 1);
      },
      clearRect() {},
      beginPath() {},
      fill() {},
      stroke() {},
    };
  };
  window.fetch = async (url) => ({
    ok: true,
    json: async () => fixture(url.split("/").pop().split(".")[0]),
  });
  window.eval(bundle);
  await until(() => window.document.querySelector(".maphead"));
  const all = (selector) =>
    Array.from(window.document.querySelectorAll(selector));
  async function change(index, value) {
    const select = all("select")[index];
    select.value = value;
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
    await pause();
  }
  return { dom, window, calls, all, change };
}
test("selection, canvas updates and restored inventory across fixtures", async (t) => {
  const ui = await mount();
  t.after(() => ui.window.close());
  for (const size of ["small", "medium", "large"]) {
    await ui.change(0, size);
    const count = fixture(size).sections.flatMap((s) =>
      s.rows.flatMap((r) => r.seats),
    ).length;
    await until(() =>
      ui.all(".maphead")[0]?.textContent.includes(count.toLocaleString("en")),
    );
    const [canvas] = ui.all("canvas");
    await until(() => ui.calls.get(canvas) === count);
  }
  const venue = fixture("large"),
    row = venue.sections[0].rows[0],
    available = row.seats.filter((s) => s.status === "available");
  const unavailable = row.seats.find((s) => s.status !== "available");
  const button = () => ui.all(".detail button")[0];
  await ui.change(3, unavailable.id);
  assert(button().disabled);
  const [base, overlay] = ui.all("canvas");
  // Set a 1:1 hit-test surface for this pointer event in the simulated DOM.
  overlay.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: venue.map.width,
    height: venue.map.height,
  });
  const target = available[0];
  overlay.dispatchEvent(
    new ui.window.MouseEvent("click", {
      bubbles: true,
      clientX: target.x,
      clientY: target.y,
    }),
  );
  await until(() => ui.all("select")[3].value === target.id);
  for (const seat of available.slice(0, 8)) {
    await ui.change(3, seat.id);
    button().click();
    await pause();
  }
  assert.equal(ui.all("li").length, 8);
  const cents = available
    .slice(0, 8)
    .reduce((sum, s) => sum + venue.priceTiers[s.priceTier].priceCents, 0);
  assert.equal(
    ui.all(".subtotal strong")[1].textContent,
    new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100),
  );
  assert.equal(ui.calls.get(base), 15000);
  await ui.change(3, available[8].id);
  assert(button().disabled);
  ui.all(".remove")[0].click();
  await until(() => ui.all("li").length === 7);
  const key = "metropolis:selection:" + venue.venueId;
  await until(
    () => JSON.parse(ui.window.localStorage.getItem(key)).length === 7,
  );
  const saved = JSON.parse(ui.window.localStorage.getItem(key));
  saved.push("missing", unavailable.id, saved[0]);
  const fresh = await mount({ [key]: JSON.stringify(saved) });
  t.after(() => fresh.window.close());
  await fresh.change(0, "large");
  await until(() => fresh.all("li").length === 7);
  assert(
    !fresh.all("li").some((li) => li.textContent.includes(unavailable.id)),
  );
});
