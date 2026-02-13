import { useState, useEffect, useRef } from "react";

const TROY_OZ = 31.1035;
const STORAGE_KEY = "coin-collection-v1";
const SPOT_KEY = "coin-spot-prices-v1";

const DEFAULT_COINS = [
  { id: "c01", name: "Peace Dollars Bag #1", metal: "silver", quantity: 1, weight: 2666.51, purity: 0.90, costBasis: 4771.94, notes: "Pre-1964 90% silver bag" },
  { id: "c02", name: "Kennedy Halves Bag #1", metal: "silver", quantity: 1, weight: 4231.32, purity: 0.90, costBasis: 7572.29, notes: "Pre-1964 90% silver bag" },
  { id: "c03", name: "Kennedy Halves Bag #2", metal: "silver", quantity: 1, weight: 3256.30, purity: 0.90, costBasis: 5827.42, notes: "Pre-1964 90% silver bag" },
  { id: "c04", name: "Morgan Dollars", metal: "silver", quantity: 1, weight: 2721.57, purity: 0.90, costBasis: 4870.47, notes: "Pre-1964 90% silver bag" },
  { id: "c05", name: "Kennedy Halves Bag #3", metal: "silver", quantity: 1, weight: 2493.87, purity: 0.90, costBasis: 4462.98, notes: "Pre-1964 90% silver bag" },
  { id: "c06", name: "Halves Bag #4", metal: "silver", quantity: 1, weight: 3880.12, purity: 0.90, costBasis: 6943.79, notes: "Pre-1964 90% silver bag" },
  { id: "c07", name: "George Washington Half", metal: "silver", quantity: 1, weight: 12.50, purity: 0.90, costBasis: 22.37, notes: "Pre-1964, single coin" },
  { id: "c08", name: "Halves (misc)", metal: "silver", quantity: 1, weight: 1452.37, purity: 0.90, costBasis: 2599.14, notes: "Pre-1964 90% silver" },
  { id: "c09", name: "Canada National Parks", metal: "silver", quantity: 1, weight: 23.32, purity: 0.50, costBasis: 23.19, notes: ".500 silver, scrap" },
  { id: "c10", name: "Morgan PDS Set", metal: "silver", quantity: 3, weight: 26.73, purity: 0.90, costBasis: 143.51, notes: "Pre-1964 90% silver" },
  { id: "c11", name: "1967 Canada Dimes & Quarters", metal: "silver", quantity: 1, weight: 23.33, purity: 0.65, costBasis: 27.14, notes: "65% Canadian silver" },
  { id: "c12", name: "Star Wars Rounds .999", metal: "silver", quantity: 49, weight: 31.10, purity: 0.999, costBasis: 3408.92, notes: ".999 fine silver rounds" },
  { id: "c13", name: "Canadian Polar Bear 1.5oz", metal: "silver", quantity: 15, weight: 46.66, purity: 0.999, costBasis: 1635.08, notes: ".999 fine, 1.5 troy oz" },
  { id: "c14", name: "30g Silver Pandas", metal: "silver", quantity: 580, weight: 30.00, purity: 0.999, costBasis: 41080.31, notes: ".999 fine, 30g each" },
  { id: "c15", name: "USA Silver Eagles 1oz", metal: "silver", quantity: 153, weight: 31.10, purity: 0.999, costBasis: 11649.46, notes: "1 troy oz .999 fine" },
  { id: "c16", name: "Gold Maple 1oz (1979-1982)", metal: "gold", quantity: 1, weight: 31.10, purity: 0.999, costBasis: 4719.61, notes: ".999 fine gold" },
  { id: "c17", name: "Fractional Gold Eagle 1/2oz", metal: "gold", quantity: 3, weight: 16.96, purity: 0.9167, costBasis: 7302.69, notes: "22k gold, 1/2 oz" },
  { id: "c18", name: "USA Gold Eagle 1oz", metal: "gold", quantity: 20, weight: 33.93, purity: 0.9167, costBasis: 97400.82, notes: "22k, 1 troy oz gold content" },
];

const DEFAULT_SPOTS = { silver: 77.30, gold: 4972.50, lastUpdated: "2026-02-12 (from receipt)" };

function loadFromStorage(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
  } catch (e) {
    // ignore parse errors
  }
  return fallback;
}

function calcMetalOz(coin) {
  return (coin.quantity * coin.weight * coin.purity) / TROY_OZ;
}
function calcValue(coin, spots) {
  const oz = calcMetalOz(coin);
  return oz * (coin.metal === "gold" ? spots.gold : spots.silver);
}
function fmt(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmtOz(n) {
  return n.toFixed(2);
}
function pct(n) {
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

const emptyForm = { name: "", metal: "silver", quantity: 1, weight: 0, purity: 0.999, costBasis: 0, notes: "" };

export default function CoinTracker() {
  const [coins, setCoins] = useState(() => loadFromStorage(STORAGE_KEY, DEFAULT_COINS));
  const [spots, setSpots] = useState(() => loadFromStorage(SPOT_KEY, DEFAULT_SPOTS));
  const [editId, setEditId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Save coins to localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(coins)); } catch(e) {}
  }, [coins]);

  // Save spots to localStorage
  useEffect(() => {
    try { localStorage.setItem(SPOT_KEY, JSON.stringify(spots)); } catch(e) {}
  }, [spots]);

  // === EXPORT / IMPORT ===
  const exportCollection = () => {
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      spotPrices: spots,
      coins: coins
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coin-collection-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Collection exported successfully");
  };

  const importCollection = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.coins && Array.isArray(data.coins)) {
          const valid = data.coins.every(c => c.name && c.metal && c.weight !== undefined && c.purity !== undefined);
          if (!valid) {
            showToast("Invalid file — coins missing required fields", "error");
            return;
          }
          setCoins(data.coins);
          if (data.spotPrices && data.spotPrices.silver && data.spotPrices.gold) {
            setSpots(data.spotPrices);
          }
          showToast(`Imported ${data.coins.length} items successfully`);
        } else {
          showToast("Invalid file format — no coins array found", "error");
        }
      } catch (err) {
        showToast("Could not read file — check that it's valid JSON", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const fetchSpotPrices = async () => {
    setFetching(true);
    setFetchMsg("");
    try {
      const [goldRes, silverRes] = await Promise.all([
        fetch("https://api.gold-api.com/price/XAU"),
        fetch("https://api.gold-api.com/price/XAG"),
      ]);
      const goldData = await goldRes.json();
      const silverData = await silverRes.json();
      if (goldData.price && silverData.price) {
        setSpots({ gold: goldData.price, silver: silverData.price, lastUpdated: new Date().toLocaleString() });
        setFetchMsg("Prices updated");
      } else {
        setFetchMsg("Partial data — check values");
      }
    } catch (e) {
      setFetchMsg("Could not fetch — enter manually");
    }
    setFetching(false);
  };

  const addCoin = () => {
    if (!form.name || form.weight <= 0) return;
    const newCoin = { ...form, id: "c" + Date.now(), weight: +form.weight, quantity: +form.quantity, purity: +form.purity, costBasis: +form.costBasis };
    setCoins([...coins, newCoin]);
    setForm({ ...emptyForm });
    setShowAdd(false);
  };

  const startEdit = (coin) => {
    setEditId(coin.id);
    setForm({ ...coin });
  };

  const saveEdit = () => {
    setCoins(coins.map(c => c.id === editId ? { ...form, weight: +form.weight, quantity: +form.quantity, purity: +form.purity, costBasis: +form.costBasis } : c));
    setEditId(null);
    setForm({ ...emptyForm });
  };

  const deleteCoin = (id) => {
    setCoins(coins.filter(c => c.id !== id));
    setDeleteConfirm(null);
  };

  const resetToDefaults = () => {
    setCoins(DEFAULT_COINS);
    setSpots(DEFAULT_SPOTS);
    showToast("Reset to original receipt data");
  };

  // Calculations
  const silverCoins = coins.filter(c => c.metal === "silver");
  const goldCoins = coins.filter(c => c.metal === "gold");
  const totalSilverOz = silverCoins.reduce((s, c) => s + calcMetalOz(c), 0);
  const totalGoldOz = goldCoins.reduce((s, c) => s + calcMetalOz(c), 0);
  const totalSilverVal = silverCoins.reduce((s, c) => s + calcValue(c, spots), 0);
  const totalGoldVal = goldCoins.reduce((s, c) => s + calcValue(c, spots), 0);
  const totalVal = totalSilverVal + totalGoldVal;
  const totalCost = coins.reduce((s, c) => s + (c.costBasis || 0), 0);
  const gainLoss = totalVal - totalCost;
  const gainPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

  // Sorting
  const sorted = [...coins];
  if (sortCol) {
    sorted.sort((a, b) => {
      let va, vb;
      if (sortCol === "value") { va = calcValue(a, spots); vb = calcValue(b, spots); }
      else if (sortCol === "oz") { va = calcMetalOz(a); vb = calcMetalOz(b); }
      else if (sortCol === "gainPct") {
        va = a.costBasis > 0 ? (calcValue(a, spots) - a.costBasis) / a.costBasis : 0;
        vb = b.costBasis > 0 ? (calcValue(b, spots) - b.costBasis) / b.costBasis : 0;
      }
      else { va = a[sortCol]; vb = b[sortCol]; }
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sortIcon = (col) => sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const inputCls = "w-full bg-stone-800 border border-stone-600 rounded px-2 py-1 text-stone-100 text-sm focus:outline-none focus:border-amber-500";
  const selectCls = "bg-stone-800 border border-stone-600 rounded px-2 py-1 text-stone-100 text-sm focus:outline-none focus:border-amber-500";

  const FormRow = ({ onSave, onCancel, submitLabel }) => (
    <tr className="bg-stone-800/80">
      <td className="p-2"><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" /></td>
      <td className="p-2">
        <select className={selectCls} value={form.metal} onChange={e => setForm({ ...form, metal: e.target.value })}>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
        </select>
      </td>
      <td className="p-2"><input type="number" className={inputCls} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} min="1" /></td>
      <td className="p-2"><input type="number" className={inputCls} value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} step="0.01" /></td>
      <td className="p-2"><input type="number" className={inputCls} value={form.purity} onChange={e => setForm({ ...form, purity: e.target.value })} step="0.001" min="0" max="1" /></td>
      <td className="p-2 text-right text-stone-400">—</td>
      <td className="p-2 text-right text-stone-400">—</td>
      <td className="p-2"><input type="number" className={inputCls} value={form.costBasis} onChange={e => setForm({ ...form, costBasis: e.target.value })} step="0.01" /></td>
      <td className="p-2 text-right text-stone-400">—</td>
      <td className="p-2"><input className={inputCls} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes" /></td>
      <td className="p-2 flex gap-1">
        <button onClick={onSave} className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded font-medium transition-colors">{submitLabel}</button>
        <button onClick={onCancel} className="px-2 py-1 bg-stone-600 hover:bg-stone-500 text-white text-xs rounded transition-colors">✕</button>
      </td>
    </tr>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-950 text-stone-100">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === "error" ? "bg-red-900/90 text-red-200 border border-red-700" : "bg-emerald-900/90 text-emerald-200 border border-emerald-700"
          }`}>
            {toast.msg}
          </div>
        </div>
      )}

      {/* Hidden file input for import */}
      <input type="file" ref={fileInputRef} accept=".json" onChange={importCollection} className="hidden" />

      {/* Header */}
      <div className="border-b border-stone-800 bg-stone-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🪙</div>
            <div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl text-amber-400">Coin Collection Tracker</h1>
              <p className="text-xs text-stone-500">Precious metals portfolio • Melt value calculator</p>
            </div>
          </div>

          {/* Spot Prices */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-stone-800/80 rounded-lg px-3 py-2 border border-stone-700">
              <span className="text-xs text-stone-400 uppercase tracking-wide">Silver</span>
              <span className="text-stone-500">$</span>
              <input type="number" value={spots.silver} onChange={e => setSpots({ ...spots, silver: +e.target.value, lastUpdated: "Manual" })}
                className="w-20 bg-transparent text-stone-100 text-sm font-semibold focus:outline-none" step="0.01" />
              <span className="text-xs text-stone-500">/oz</span>
            </div>
            <div className="flex items-center gap-2 bg-stone-800/80 rounded-lg px-3 py-2 border border-stone-700">
              <span className="text-xs text-amber-500/70 uppercase tracking-wide">Gold</span>
              <span className="text-stone-500">$</span>
              <input type="number" value={spots.gold} onChange={e => setSpots({ ...spots, gold: +e.target.value, lastUpdated: "Manual" })}
                className="w-24 bg-transparent text-amber-300 text-sm font-semibold focus:outline-none" step="0.01" />
              <span className="text-xs text-stone-500">/oz</span>
            </div>
            <button onClick={fetchSpotPrices} disabled={fetching}
              className="px-3 py-2 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-600/40 text-amber-400 text-xs rounded-lg font-medium transition-all disabled:opacity-50 whitespace-nowrap">
              {fetching ? "Fetching..." : "↻ Refresh Spot"}
            </button>
            {fetchMsg && <span className={`text-xs ${fetchMsg === "Prices updated" ? "text-green-400" : "text-amber-400"}`}>{fetchMsg}</span>}
          </div>
        </div>
        {spots.lastUpdated && <div className="max-w-7xl mx-auto px-4 pb-2"><span className="text-xs text-stone-600">Last updated: {spots.lastUpdated}</span></div>}
      </div>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-stone-900 rounded-xl p-4 border border-stone-800">
            <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Silver Holdings</div>
            <div className="text-lg font-bold text-stone-200">{fmtOz(totalSilverOz)} <span className="text-xs text-stone-500 font-normal">troy oz</span></div>
            <div className="text-sm text-stone-400">{fmt(totalSilverVal)}</div>
          </div>
          <div className="bg-stone-900 rounded-xl p-4 border border-amber-900/30">
            <div className="text-xs text-amber-600/70 uppercase tracking-wide mb-1">Gold Holdings</div>
            <div className="text-lg font-bold text-amber-300">{fmtOz(totalGoldOz)} <span className="text-xs text-amber-600/50 font-normal">troy oz</span></div>
            <div className="text-sm text-amber-400/70">{fmt(totalGoldVal)}</div>
          </div>
          <div className="bg-stone-900 rounded-xl p-4 border border-stone-700">
            <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Total Melt Value</div>
            <div className="text-xl font-bold text-white">{fmt(totalVal)}</div>
          </div>
          <div className="bg-stone-900 rounded-xl p-4 border border-stone-800">
            <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Cost Basis</div>
            <div className="text-lg font-bold text-stone-300">{fmt(totalCost)}</div>
          </div>
          <div className={`bg-stone-900 rounded-xl p-4 border ${gainLoss >= 0 ? "border-emerald-900/40" : "border-red-900/40"}`}>
            <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Gain / Loss</div>
            <div className={`text-lg font-bold ${gainLoss >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(gainLoss)}</div>
            <div className={`text-xs ${gainLoss >= 0 ? "text-emerald-500/70" : "text-red-500/70"}`}>{pct(gainPct)}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm text-stone-400 font-semibold uppercase tracking-wide">{coins.length} Items in Collection</h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { setShowAdd(true); setForm({ ...emptyForm }); setEditId(null); }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-lg font-semibold transition-colors">+ Add Item</button>
            <button onClick={exportCollection}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-lg transition-colors border border-stone-700 flex items-center gap-1">
              <span>⬇</span> Export JSON</button>
            <button onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-lg transition-colors border border-stone-700 flex items-center gap-1">
              <span>⬆</span> Import JSON</button>
            <button onClick={resetToDefaults}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-500 text-xs rounded-lg transition-colors border border-stone-800">Reset to Receipt</button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-stone-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-900 text-stone-500 text-xs uppercase tracking-wider">
                <th className="p-2 text-left cursor-pointer hover:text-stone-300 select-none" onClick={() => toggleSort("name")}>Name{sortIcon("name")}</th>
                <th className="p-2 text-left cursor-pointer hover:text-stone-300 select-none" onClick={() => toggleSort("metal")}>Metal{sortIcon("metal")}</th>
                <th className="p-2 text-right cursor-pointer hover:text-stone-300 select-none" onClick={() => toggleSort("quantity")}>Qty{sortIcon("quantity")}</th>
                <th className="p-2 text-right">Wt/Unit (g)</th>
                <th className="p-2 text-right">Purity</th>
                <th className="p-2 text-right cursor-pointer hover:text-stone-300 select-none" onClick={() => toggleSort("oz")}>Metal (oz){sortIcon("oz")}</th>
                <th className="p-2 text-right cursor-pointer hover:text-stone-300 select-none" onClick={() => toggleSort("value")}>Melt Value{sortIcon("value")}</th>
                <th className="p-2 text-right">Cost Basis</th>
                <th className="p-2 text-right cursor-pointer hover:text-stone-300 select-none" onClick={() => toggleSort("gainPct")}>Gain %{sortIcon("gainPct")}</th>
                <th className="p-2 text-left">Notes</th>
                <th className="p-2 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {showAdd && (
                <FormRow onSave={addCoin} onCancel={() => setShowAdd(false)} submitLabel="Add" />
              )}
              {sorted.map(coin => {
                if (editId === coin.id) {
                  return <FormRow key={coin.id} onSave={saveEdit} onCancel={() => { setEditId(null); setForm({ ...emptyForm }); }} submitLabel="Save" />;
                }
                const oz = calcMetalOz(coin);
                const val = calcValue(coin, spots);
                const gl = coin.costBasis > 0 ? ((val - coin.costBasis) / coin.costBasis) * 100 : null;
                const isGold = coin.metal === "gold";
                return (
                  <tr key={coin.id} className="border-t border-stone-800/60 hover:bg-stone-900/50 transition-colors">
                    <td className="p-2 font-medium text-stone-200">{coin.name}</td>
                    <td className="p-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${isGold ? "bg-amber-900/40 text-amber-400" : "bg-stone-700/60 text-stone-300"}`}>
                        {isGold ? "Au" : "Ag"}
                      </span>
                    </td>
                    <td className="p-2 text-right text-stone-300">{coin.quantity.toLocaleString()}</td>
                    <td className="p-2 text-right text-stone-400">{coin.weight.toFixed(2)}</td>
                    <td className="p-2 text-right text-stone-400">{(coin.purity * 100).toFixed(1)}%</td>
                    <td className="p-2 text-right font-medium text-stone-300">{fmtOz(oz)}</td>
                    <td className={`p-2 text-right font-semibold ${isGold ? "text-amber-300" : "text-stone-100"}`}>{fmt(val)}</td>
                    <td className="p-2 text-right text-stone-400">{coin.costBasis > 0 ? fmt(coin.costBasis) : "—"}</td>
                    <td className={`p-2 text-right text-xs font-medium ${gl !== null ? (gl >= 0 ? "text-emerald-400" : "text-red-400") : "text-stone-600"}`}>
                      {gl !== null ? pct(gl) : "—"}
                    </td>
                    <td className="p-2 text-stone-500 text-xs max-w-40 truncate" title={coin.notes}>{coin.notes}</td>
                    <td className="p-2 text-center">
                      {deleteConfirm === coin.id ? (
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => deleteCoin(coin.id)} className="px-2 py-0.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded transition-colors">Yes</button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-2 py-0.5 bg-stone-700 text-stone-300 text-xs rounded transition-colors">No</button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => startEdit(coin)} className="px-2 py-0.5 bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs rounded transition-colors">Edit</button>
                          <button onClick={() => setDeleteConfirm(coin.id)} className="px-2 py-0.5 bg-stone-800 hover:bg-red-900/50 text-stone-500 hover:text-red-400 text-xs rounded transition-colors">Del</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-700 bg-stone-900/80 font-semibold">
                <td className="p-3 text-stone-300" colSpan={2}>Totals</td>
                <td className="p-3 text-right text-stone-300">{coins.reduce((s, c) => s + c.quantity, 0).toLocaleString()}</td>
                <td className="p-3" colSpan={2}></td>
                <td className="p-3 text-right text-stone-200">{fmtOz(totalSilverOz + totalGoldOz)}</td>
                <td className="p-3 text-right text-white text-base">{fmt(totalVal)}</td>
                <td className="p-3 text-right text-stone-300">{fmt(totalCost)}</td>
                <td className={`p-3 text-right font-bold ${gainLoss >= 0 ? "text-emerald-400" : "text-red-400"}`}>{pct(gainPct)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Saving Info */}
        <div className="mt-4 bg-stone-900/50 rounded-lg border border-stone-800 p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">💾</span>
            <div className="text-xs text-stone-500 space-y-1.5">
              <p className="text-stone-400 font-semibold text-sm">Saving Your Collection</p>
              <p>Your data saves automatically in your browser&apos;s local storage. Use <span className="text-amber-400 font-medium">⬇ Export JSON</span> to create a backup file you can import later or on another device.</p>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-stone-600 flex flex-wrap gap-x-6 gap-y-1">
          <span>Melt value = Qty × Weight × Purity ÷ 31.1035 × Spot Price</span>
          <span>1 troy oz = 31.1035 grams</span>
        </div>
      </div>
    </div>
  );
}
