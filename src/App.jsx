import { useEffect, useState } from "react";

const localApiUrl = "http://localhost:5002/api/packing";
const deployedApiUrl = "";

const resolvedApiUrl =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? localApiUrl : deployedApiUrl);

export default function App() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState("");

  async function loadPacking() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(resolvedApiUrl);
      if (!response.ok) throw new Error("Failed to load packing list.");
      const data = await response.json();
      setItems(data);
      setLastSyncedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!resolvedApiUrl) {
      setError(
        "API URL is not configured. Set VITE_API_URL to your deployed backend before building the frontend."
      );
      setLoading(false);
      return;
    }

    loadPacking();
  }, []);

  async function toggleItem(item) {
    const nextPacked = !item.isPacked;

    try {
      setBusy(true);
      const response = await fetch(`${resolvedApiUrl}/${item.id}/toggle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPacked: nextPacked })
      });

      if (!response.ok) throw new Error("Failed to update item.");

      const updated = await response.json();
      setItems((current) =>
        current.map((i) => (i.id === updated.id ? updated : i))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function setAllPacked(nextPacked) {
    try {
      setBusy(true);
      const response = await fetch(`${resolvedApiUrl}/bulk`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPacked: nextPacked })
      });

      if (!response.ok) throw new Error("Failed to update all items.");

      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const total = items.length;
  const packedCount = items.filter((i) => i.isPacked).length;
  const percent = total === 0 ? 0 : Math.round((packedCount / total) * 100);
  const backendConnected = !loading && !error && total > 0;
  const sourceLabel = import.meta.env.DEV ? "Local API" : "Azure API";

  const packedItems = items.filter((i) => i.isPacked);
  const unpackedItems = items.filter((i) => !i.isPacked);

  return (
    <main className="pc-shell">
      <div className="pc-wrap">
        <header className="pc-header">
          <div className="pc-title">
            <div className="pc-titleKicker">Trip manifest</div>
            <div className="pc-titleTop">Packing Checklist</div>
            <div className="pc-titleBottom">
              This dashboard is powered by the backend API. Without it, there is no manifest to load or update.
            </div>
          </div>

          <div className="pc-progressRing" aria-label={`Packed ${percent}%`}>
            <div
              className="pc-progressRingFill"
              style={{
                background: `conic-gradient(from 180deg, #22c55e 0% ${percent}%, rgba(255,255,255,0.12) ${percent}% 100%)`
              }}
            />
            <div className="pc-progressRingText">
              {percent}%
              <div className="pc-progressRingSub">
                {packedCount}/{total} packed
              </div>
            </div>
          </div>
        </header>

        <section className="pc-workspace">
          <aside className="pc-console">
            <div className="pc-consoleTop">
              <span className="pc-consoleDot" />
              <span className="pc-consoleDot" />
              <span className="pc-consoleDot" />
            </div>

            <div className="pc-consoleBlock">
              <div className="pc-consoleLabel">Backend status</div>
              <div className={backendConnected ? "pc-status pc-status--ok" : "pc-status"}>
                {loading ? "Connecting to backend..." : backendConnected ? "Backend connected" : "Backend required"}
              </div>
            </div>

            <div className="pc-consoleBlock">
              <div className="pc-consoleLabel">Endpoint</div>
              <div className="pc-consoleValue">{resolvedApiUrl}</div>
            </div>

            <div className="pc-consoleBlock">
              <div className="pc-consoleLabel">Source</div>
              <div className="pc-consoleValue">{sourceLabel}</div>
            </div>

            <div className="pc-consoleBlock">
              <div className="pc-consoleLabel">Last sync</div>
              <div className="pc-consoleValue">{lastSyncedAt || "Not synced yet"}</div>
            </div>

            <div className="pc-consoleBlock">
              <div className="pc-consoleLabel">Backend role</div>
              <div className="pc-consoleValue">
                Load, toggle, and bulk packing actions all depend on API calls.
              </div>
            </div>

            <div className="pc-actionsStack">
              <button
                type="button"
                className="pc-btn pc-btn--primary"
                onClick={loadPacking}
                disabled={busy || loading}
              >
                {loading ? "Loading..." : "Reload From API"}
              </button>
              <button
                type="button"
                className="pc-btn pc-btn--primary"
                onClick={() => setAllPacked(true)}
                disabled={busy || loading || total === 0}
              >
                Pack everything
              </button>
              <button
                type="button"
                className="pc-btn pc-btn--secondary"
                onClick={() => setAllPacked(false)}
                disabled={busy || loading || total === 0}
              >
                Clear packing
              </button>
            </div>
          </aside>

          <section className="pc-board">
            <div className="pc-boardBanner">
              The checklist is seeded by the backend manifest. Reload restores the latest server version.
            </div>

            {error ? <div className="pc-alert">{error}</div> : null}

            {total === 0 && !loading ? (
              <div className="pc-emptyState">
                <strong>No packing data available</strong>
                <span>Start or redeploy the backend API, then reload this frontend.</span>
              </div>
            ) : null}

            <section className="pc-grid">
              <section className="pc-column">
                <div className="pc-columnHeader">
                  <span className="pc-columnTitle">Packed</span>
                  <span className="pc-columnCount">{packedItems.length}</span>
                </div>
                <ul className="pc-list">
                  {packedItems.map((item) => (
                    <li key={item.id} className="pc-item pc-item--packed">
                      <div className="pc-itemMain">
                        <div className="pc-itemName">{item.quantity}x {item.itemName}</div>
                        <div className="pc-itemHint">Ready to go</div>
                      </div>
                      <button
                        type="button"
                        className="pc-toggle"
                        onClick={() => toggleItem(item)}
                        disabled={busy}
                      >
                        Mark unpacked
                      </button>
                    </li>
                  ))}
                  {packedItems.length === 0 ? <li className="pc-empty">Nothing packed yet.</li> : null}
                </ul>
              </section>

              <section className="pc-column">
                <div className="pc-columnHeader">
                  <span className="pc-columnTitle">Not packed</span>
                  <span className="pc-columnCount">{unpackedItems.length}</span>
                </div>
                <ul className="pc-list">
                  {unpackedItems.map((item) => (
                    <li key={item.id} className="pc-item pc-item--unpacked">
                      <div className="pc-itemMain">
                        <div className="pc-itemName">{item.quantity}x {item.itemName}</div>
                        <div className="pc-itemHint">Still in the house</div>
                      </div>
                      <button
                        type="button"
                        className="pc-toggle"
                        onClick={() => toggleItem(item)}
                        disabled={busy}
                      >
                        Mark packed
                      </button>
                    </li>
                  ))}
                  {unpackedItems.length === 0 ? <li className="pc-empty">All items packed.</li> : null}
                </ul>
              </section>
            </section>
          </section>
        </section>
      </div>
    </main>
  );
}
