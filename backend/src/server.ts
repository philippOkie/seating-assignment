import { createApp } from "./app.js";
import { store } from "./store/inMemoryStore.js";

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

const cleanupInterval = setInterval(() => {
  void store.cleanupExpiredHolds(new Date());
}, 30_000);

cleanupInterval.unref?.();

app.listen(port, () => {
  console.log(`Seat hold API listening on http://localhost:${port}`);
});
