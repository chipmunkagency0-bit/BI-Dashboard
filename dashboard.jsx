import { useState, useMemo, useRef } from "react";
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  ZAxis, LabelList,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES  (fonts + resets — injected once in App, not a component)
// ─────────────────────────────────────────────────────────────────────────────
const FONT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body, #root { height: 100%; }
  select, input, button { font-family: 'Outfit', sans-serif; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #f1f5f9; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
  tbody tr:hover td { background: #f0f9ff !important; }
  @media print {
    nav { display: none !important; }
    [data-filterbar] { display: none !important; }
    body { background: white !important; }
    .no-print { display: none !important; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// MOCK STORE DATA
// Replace MOCK_STORE_DATA with the output of layer1_input_parser.parse_input().
// Schema is identical to the STORE_DATA contract.
// ─────────────────────────────────────────────────────────────────────────────
const _PRODUCTS = [
  { n: "Nike Air Max", s: "Footwear", c: 2000, sp: 2999, sup: "Nike India" },
  { n: "Adidas Superstar", s: "Footwear", c: 1800, sp: 2599, sup: "Adidas India" },
  { n: "Puma Suede", s: "Footwear", c: 1400, sp: 1999, sup: "Puma India" },
  { n: "Reebok Classic", s: "Footwear", c: 1200, sp: 1799, sup: "Reebok Sports" },
  { n: "Converse Chuck", s: "Footwear", c: 1000, sp: 1499, sup: "Converse Co" },
  { n: "Polo T-Shirt", s: "Apparel", c: 400, sp: 699, sup: "SportWear Ltd" },
  { n: "Cargo Chinos", s: "Apparel", c: 600, sp: 999, sup: "SportWear Ltd" },
  { n: "Denim Jacket", s: "Apparel", c: 1200, sp: 1999, sup: "Adidas India" },
  { n: "Track Pants", s: "Apparel", c: 500, sp: 799, sup: "Nike India" },
  { n: "Hoodie", s: "Apparel", c: 700, sp: 1199, sup: "Puma India" },
  { n: "Leather Belt", s: "Accessories", c: 250, sp: 449, sup: "SportWear Ltd" },
  { n: "Canvas Bag", s: "Accessories", c: 350, sp: 599, sup: "SportWear Ltd" },
  { n: "Snapback Cap", s: "Accessories", c: 200, sp: 349, sup: "Adidas India" },
  { n: "Sunglasses", s: "Accessories", c: 450, sp: 799, sup: "SportWear Ltd" },
  { n: "Running Shorts", s: "Sportswear", c: 400, sp: 699, sup: "Nike India" },
  { n: "Sports Tee", s: "Sportswear", c: 300, sp: 499, sup: "Puma India" },
  { n: "Compression Tights", s: "Sportswear", c: 600, sp: 999, sup: "Reebok Sports" },
  { n: "Training Jacket", s: "Sportswear", c: 900, sp: 1499, sup: "Adidas India" },
];
const _BRANCHES = ["Chennai Main", "Chennai South"];
const _LOCS = { "Chennai Main": ["Anna Nagar", "T Nagar"], "Chennai South": ["Vadapalani", "Velachery"] };
const _SEGS = ["Men", "Women", "Kids"];
const _SALESMEN = ["Ravi Kumar", "Priya Sharma", "Karthik S", "Meena R"];
const _DATES = [
  "2024-10-05", "2024-10-18", "2024-11-03", "2024-11-17",
  "2024-12-02", "2024-12-16", "2025-01-06", "2025-01-20",
  "2025-02-03", "2025-02-17", "2025-03-03", "2025-03-17",
];

function _buildStoreData() {
  const sales = [];
  let bn = 1;
  _DATES.forEach((date, di) => {
    for (let j = 0; j < 6; j++) {
      const i = di * 6 + j;
      const p = _PRODUCTS[i % _PRODUCTS.length];
      const br = _BRANCHES[i % 2];
      const qty = (i % 4) + 1;
      sales.push({
        bill_date: date, bill_no: `BL${String(bn++).padStart(4, "0")}`,
        branch: br, location: _LOCS[br][i % 2],
        segment: _SEGS[i % 3], section: p.s,
        section_group: ["Footwear", "Accessories"].includes(p.s) ? "Hard Goods" : "Soft Goods",
        product: p.n, supplier: p.sup, salesman: _SALESMEN[i % 4],
        net_qty: qty, net_amount: qty * p.sp,
        cost_price: p.c, selling_price: p.sp,
      });
    }
  });
  const _ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; };
  const _AGE = [10, 40, 65, 100, 145, 200];
  const stock = [];
  _PRODUCTS.forEach((p, pi) => {
    _BRANCHES.forEach((br, bi) => {
      const qty = 6 + (pi % 6) * 2 + bi * 3;
      stock.push({
        stock_date: _ago(0), branch: br, location: _LOCS[br][0],
        segment: _SEGS[pi % 3], section: p.s, product: p.n, supplier: p.sup,
        stock_qty: qty, stock_value: qty * p.sp,
        entry_date: _ago(_AGE[pi % _AGE.length]),
      });
    });
  });
  return {
    sales, stock,
    config: {
      desired_str_by_range: { "0-250": 0.6, "251-500": 0.5, "501-1000": 0.4, "1001+": 0.3 },
      old_stock_threshold_days: 90,
      grade_rules: { A: { min_score: 80 }, B: { min_score: 60 }, C: { min_score: 0 } },
      price_ranges: [[0, 250], [251, 500], [501, 1000], [1001, 9999]],
      report_period: { from: "2024-10-01", to: "2025-03-31" },
    },
  };
}
const MOCK_STORE_DATA = _buildStoreData();

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT FILTER STATE  (keys match STORE_DATA field names exactly)
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_FILTERS = {
  branch: "All", location: "All", segment: "All",
  section: "All", product: "All", supplier: "All", salesman: "All",
  dateFrom: MOCK_STORE_DATA.config.report_period.from,
  dateTo: MOCK_STORE_DATA.config.report_period.to,
};


// ══════════════════════════════════════════════════════════════════════════════
//  STEP 02 ── filterData                                     ── SHARED UTILITY
// ──────────────────────────────────────────────────────────────────────────────
//  THE ONLY FUNCTION SHARED BETWEEN ALL PAGE COMPONENTS.
//  Accepts raw STORE_DATA + activeFilters.
//  Returns filtered { sales, stock, config }.
//  DO NOT add calculations or business logic here.
// ══════════════════════════════════════════════════════════════════════════════
function filterData(storeData, f) {
  const m = (row, key) => f[key] === "All" || row[key] === f[key];
  return {
    sales: storeData.sales.filter(r =>
      m(r, "branch") && m(r, "location") && m(r, "segment") &&
      m(r, "section") && m(r, "product") && m(r, "supplier") && m(r, "salesman") &&
      (!f.dateFrom || r.bill_date >= f.dateFrom) &&
      (!f.dateTo || r.bill_date <= f.dateTo)
    ),
    stock: storeData.stock.filter(r =>
      m(r, "branch") && m(r, "location") && m(r, "segment") &&
      m(r, "section") && m(r, "product") && m(r, "supplier")
      // salesman is not a field in stock rows
    ),
    config: storeData.config,
  };
}

function exportCSV(filename, headers, rows) {
  // headers: array of strings
  // rows: array of arrays (values already formatted as strings)
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(","),
    ...rows.map(r => r.map(escape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}


// ══════════════════════════════════════════════════════════════════════════════
//  STEP 02 ── GlobalFilterBar                                      ── STEP 02
// ──────────────────────────────────────────────────────────────────────────────
//  Populates dropdowns from raw storeData.
//  Emits the complete filter object via onFilter.
//  NEVER modify this component when editing a page.
// ══════════════════════════════════════════════════════════════════════════════
function GlobalFilterBar({ storeData, filters, onFilter }) {
  const opts = useMemo(() => {
    const u = k => ["All", ...[...new Set(storeData.sales.map(r => r[k]).filter(Boolean))].sort()];
    return {
      branch: u("branch"), location: u("location"), segment: u("segment"),
      section: u("section"), product: u("product"), supplier: u("supplier"), salesman: u("salesman"),
    };
  }, [storeData]);

  const { sales: fs, stock: fk } = useMemo(
    () => filterData(storeData, filters), [storeData, filters]
  );

  const set = k => e => onFilter(prev => ({ ...prev, [k]: e.target.value }));

  const DROP = {
    height: "28px", padding: "0 8px", border: "1px solid #e2e8f0", borderRadius: "5px",
    fontSize: "12px", background: "white", color: "#1e293b", cursor: "pointer", outline: "none",
  };
  const LBL = {
    display: "block", fontSize: "9px", color: "#94a3b8", textTransform: "uppercase",
    letterSpacing: "0.7px", fontWeight: "700", marginBottom: "3px",
  };

  return (
    <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "8px 20px", flexShrink: 0 }}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>

        {["branch", "location", "segment", "section", "product", "supplier", "salesman"].map(k => (
          <label key={k} style={{ display: "flex", flexDirection: "column" }}>
            <span style={LBL}>{k}</span>
            <select style={DROP} value={filters[k]} onChange={set(k)}>
              {opts[k].map(o => <option key={o}>{o}</option>)}
            </select>
          </label>
        ))}

        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={LBL}>From</span>
          <input type="date" style={{ ...DROP, minWidth: "128px", padding: "0 6px" }}
            value={filters.dateFrom} onChange={set("dateFrom")} />
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={LBL}>To</span>
          <input type="date" style={{ ...DROP, minWidth: "128px", padding: "0 6px" }}
            value={filters.dateTo} onChange={set("dateTo")} />
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={LBL}>–</span>
          <button onClick={() => onFilter({ ...DEFAULT_FILTERS })}
            style={{ ...DROP, background: "#f8fafc", color: "#64748b", padding: "0 14px", fontWeight: "500", cursor: "pointer" }}>
            ↺ Reset
          </button>
        </label>

        <div style={{
          marginLeft: "auto", alignSelf: "flex-end", paddingBottom: "5px",
          fontSize: "11px", color: "#94a3b8", fontFamily: "'Space Mono',monospace"
        }}>
          {fs.length} sales · {fk.length} stock
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
//  STEP 03 ── KPICard                                               ── STEP 03
// ──────────────────────────────────────────────────────────────────────────────
//  Pure display component. No data access. No calculations.
//  Props: label, value, sub (optional), accent (hex colour)
//  NEVER modify this component when editing a page.
// ══════════════════════════════════════════════════════════════════════════════
function KPICard({ label, value, sub, accent = "#3b82f6" }) {
  return (
    <div style={{
      background: "white", borderRadius: "8px", padding: "14px 18px",
      borderLeft: `3px solid ${accent}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      minWidth: "130px", flex: "1 1 130px",
    }}>
      <div style={{
        fontSize: "9px", color: "#94a3b8", textTransform: "uppercase",
        letterSpacing: "0.8px", fontWeight: "700"
      }}>{label}</div>
      <div style={{
        fontSize: "20px", fontWeight: "700", color: "#0f172a",
        fontFamily: "'Space Mono',monospace", lineHeight: 1.25, margin: "5px 0 0"
      }}>{value}</div>
      {sub && <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "3px" }}>{sub}</div>}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// UI PRIMITIVES  (layout only — zero business logic — safe to use in any page)
// ─────────────────────────────────────────────────────────────────────────────
function TableCard({ title, children }) {
  return (
    <div style={{
      background: "white", borderRadius: "10px", overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: "20px"
    }}>
      <div style={{
        padding: "12px 18px", borderBottom: "1px solid #f1f5f9",
        fontWeight: "600", fontSize: "13px", color: "#0f172a"
      }}>{title}</div>
      <div style={{ overflowX: "auto" }}>{children}</div>
    </div>
  );
}

function PagePlaceholder({ step, items }) {
  return (
    <div style={{
      background: "white", borderRadius: "10px", padding: "36px 32px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)", textAlign: "center"
    }}>
      <div style={{
        display: "inline-block", background: "#eff6ff", color: "#3b82f6",
        padding: "3px 14px", borderRadius: "99px", fontSize: "11px", fontWeight: "700",
        letterSpacing: "0.5px", marginBottom: "14px"
      }}>
        STEP {step} — READY TO BUILD
      </div>
      <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "20px" }}>
        KPI cards above are live and react to all filters.<br />
        Tables and charts will be built in this step.
      </p>
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
        {items.map(s => (
          <span key={s} style={{
            background: "#f1f5f9", color: "#475569",
            padding: "5px 13px", borderRadius: "6px", fontSize: "11px"
          }}>{s}</span>
        ))}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
//  STEP 04 ── PAGE_REGISTRY + SidebarNav                            ── STEP 04
// ──────────────────────────────────────────────────────────────────────────────
//  To ADD a page  → add one entry to PAGE_REGISTRY + write the component.
//  To REMOVE a page → remove its entry. Nothing else in this file changes.
//  NEVER modify SidebarNav when editing a page component.
// ══════════════════════════════════════════════════════════════════════════════
const PAGE_REGISTRY = [
  { id: 1, label: "Sales Overview", icon: "▤", desc: "Sales vs Stock · Range Wise" },
  { id: 2, label: "Stock Overview", icon: "▦", desc: "Ageing · Range · Supplier" },
  { id: 3, label: "STR · Margin · GMROI", icon: "◎", desc: "Sell-Through · Returns" },
  { id: 4, label: "Matrix + Grading", icon: "◆", desc: "Quadrant · A/B/C Grade" },
  { id: 5, label: "Old Stock · Supplier", icon: "▣", desc: "Old Sales · Supplier Full" },
  { id: 6, label: "YoY Comparison", icon: "◷", desc: "Year-on-Year · Monthly" },
  { id: 7, label: "Basket · Range Detail", icon: "▧", desc: "Bill Value · Cross Table" },
  { id: 8, label: "Sales Target", icon: "◉", desc: "Projections · Editable Inputs" },
];

function SidebarNav({ active, onNav, storeData, onChangeData }) {
  return (
    <nav style={{
      width: "220px", flexShrink: 0, background: "#0f172a",
      display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden",
    }}>
      {/* Brand */}
      <div style={{ padding: "16px", borderBottom: "1px solid #1e293b" }}>
        <div style={{
          fontSize: "9px", fontWeight: "800", color: "#3b82f6",
          letterSpacing: "2.5px", marginBottom: "3px"
        }}>RETAIL ANALYTICS</div>
        <div style={{ fontSize: "14px", color: "#f1f5f9", fontWeight: "600" }}>BI Dashboard</div>
        <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px", fontFamily: "'Space Mono',monospace" }}>
          {storeData.sales.length} sales · {storeData.stock.length} stock
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {PAGE_REGISTRY.map(p => {
          const on = active === p.id;
          return (
            <button key={p.id} onClick={() => onNav(p.id)} style={{
              display: "flex", gap: "10px", alignItems: "flex-start",
              width: "100%", padding: "9px 14px", border: "none", cursor: "pointer",
              background: on ? "#1e293b" : "transparent", textAlign: "left",
              borderLeft: on ? "3px solid #3b82f6" : "3px solid transparent",
              transition: "background 0.12s",
            }}>
              <span style={{
                color: on ? "#3b82f6" : "#475569", fontSize: "14px",
                flexShrink: 0, marginTop: "1px", lineHeight: 1
              }}>{p.icon}</span>
              <div>
                <div style={{
                  color: on ? "#f8fafc" : "#94a3b8", fontSize: "12px",
                  fontWeight: on ? 600 : 400, lineHeight: 1.3
                }}>{p.label}</div>
                <div style={{ color: "#334155", fontSize: "10px", marginTop: "2px" }}>{p.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Change Data button */}
      <div style={{ padding: "8px 0", borderTop: "1px solid #1e293b" }}>
        <button onClick={onChangeData} style={{
          display: "flex", gap: "10px", alignItems: "flex-start",
          width: "100%", padding: "9px 14px", border: "none", cursor: "pointer",
          background: "transparent", textAlign: "left",
          borderLeft: "3px solid transparent",
          transition: "background 0.12s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "#1e293b"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <span style={{ color: "#475569", fontSize: "14px", flexShrink: 0, marginTop: "1px", lineHeight: 1 }}>↩</span>
          <div>
            <div style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 400, lineHeight: 1.3 }}>Change Data</div>
            <div style={{ color: "#334155", fontSize: "10px", marginTop: "2px" }}>Upload new files</div>
          </div>
        </button>
      </div>

      {/* Build status */}
      <div style={{
        padding: "10px 14px", borderTop: "1px solid #1e293b",
        fontSize: "10px", lineHeight: 2, color: "#475569"
      }}>
        <div style={{ color: "#10b981" }}>✓ Step 01 — Input Parser</div>
        <div style={{ color: "#10b981" }}>✓ Steps 02–04 — Shell</div>
        <div>· Steps 05–12 — Pages</div>
      </div>
    </nav>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
//  PAGE 01 ── Sales Overview                                        ── STEP 05
// ──────────────────────────────────────────────────────────────────────────────
//  Combines: Sales vs Stock (section + product) · Range Wise Sales
//  KPIs   : Total Sales · Total Stock · Overall STR · Top Section · Avg Bill Value
//  Tables : section-wise deviation · product-wise deviation · range-wise sales
//
//  All calculations below are LOCAL to this component.
//  filterData() is the ONLY external function called.
// ══════════════════════════════════════════════════════════════════════════════
function Page01_SalesOverview({ storeData, filters }) {
  const { sales, stock, config } = filterData(storeData, filters);

  // ── local format helpers (not shared) ─────────────────────────────────────
  const INR = v => `₹${Math.round(v).toLocaleString("en-IN")}`;
  const PCT = v => `${v.toFixed(1)}%`;
  const FLT = v => v.toFixed(2);

  // ── KPI calculations ──────────────────────────────────────────────────────
  const totalSalesVal = sales.reduce((s, r) => s + r.net_amount, 0);
  const totalStockVal = stock.reduce((s, r) => s + r.stock_value, 0);
  const totalSalesQty = sales.reduce((s, r) => s + r.net_qty, 0);
  const totalStockQty = stock.reduce((s, r) => s + r.stock_qty, 0);
  const overallSTR = totalStockQty > 0 ? totalSalesQty / totalStockQty : 0;
  const bills = new Set(sales.map(r => r.bill_no));
  const avgBillVal = bills.size > 0 ? totalSalesVal / bills.size : 0;
  const topSection = Object.entries(
    sales.reduce((m, r) => ({ ...m, [r.section]: (m[r.section] || 0) + r.net_amount }), {})
  ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  // ── aggregator helper (local) ──────────────────────────────────────────────
  const agg = (map, key, sv, sq, tv, tq) => {
    if (!map[key]) map[key] = { sv: 0, sq: 0, tv: 0, tq: 0 };
    map[key].sv += sv; map[key].sq += sq; map[key].tv += tv; map[key].tq += tq;
  };

  // ── section-wise deviation ────────────────────────────────────────────────
  const secMap = {};
  sales.forEach(r => agg(secMap, r.section, r.net_amount, r.net_qty, 0, 0));
  stock.forEach(r => agg(secMap, r.section, 0, 0, r.stock_value, r.stock_qty));
  const sectionRows = Object.entries(secMap).map(([sec, d]) => {
    const sp = totalSalesVal > 0 ? d.sv / totalSalesVal * 100 : 0;
    const tp = totalStockVal > 0 ? d.tv / totalStockVal * 100 : 0;
    return { sec, sv: d.sv, tv: d.tv, sp, tp, dev: sp - tp, str: d.tq > 0 ? d.sq / d.tq : 0 };
  }).sort((a, b) => b.dev - a.dev);

  // ── product-wise deviation ────────────────────────────────────────────────
  const prodMap = {};
  sales.forEach(r => agg(prodMap, r.product + "||" + r.section, r.net_amount, r.net_qty, 0, 0));
  stock.forEach(r => agg(prodMap, r.product + "||" + r.section, 0, 0, r.stock_value, r.stock_qty));
  const productRows = Object.entries(prodMap).map(([key, d]) => {
    const [prod, sec] = key.split("||");
    const sp = totalSalesVal > 0 ? d.sv / totalSalesVal * 100 : 0;
    const tp = totalStockVal > 0 ? d.tv / totalStockVal * 100 : 0;
    return { prod, sec, sv: d.sv, tv: d.tv, sp, tp, dev: sp - tp, str: d.tq > 0 ? d.sq / d.tq : 0 };
  }).sort((a, b) => b.dev - a.dev);

  // ── range-wise sales ──────────────────────────────────────────────────────
  const getRange = sp => {
    for (const [lo, hi] of config.price_ranges)
      if (sp >= lo && sp <= hi) return `₹${lo.toLocaleString()}–${hi.toLocaleString()}`;
    return "Other";
  };
  const rangeMap = {};
  sales.forEach(r => {
    const k = getRange(r.selling_price);
    if (!rangeMap[k]) rangeMap[k] = { sv: 0, sq: 0 };
    rangeMap[k].sv += r.net_amount; rangeMap[k].sq += r.net_qty;
  });
  const rangeRows = Object.entries(rangeMap).map(([range, d]) => ({
    range, sv: d.sv, sq: d.sq, sp: totalSalesVal > 0 ? d.sv / totalSalesVal * 100 : 0,
  })).sort((a, b) => b.sv - a.sv);

  // ── table style helpers (local, not shared) ───────────────────────────────
  const TH = (a = "right") => ({
    padding: "9px 14px", fontSize: "10px", color: "#64748b", fontWeight: "700",
    letterSpacing: "0.4px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc",
    textAlign: a, whiteSpace: "nowrap",
  });
  const TD = (a = "right") => ({
    padding: "9px 14px", fontSize: "12px", color: "#1e293b", textAlign: a,
    fontFamily: "'Space Mono',monospace",
  });
  const devTD = v => ({
    ...TD(), fontWeight: "700",
    color: v > 3 ? "#15803d" : v < -3 ? "#dc2626" : "#64748b",
  });
  const stripe = i => ({ borderBottom: "1px solid #f8fafc", background: i % 2 ? "#fafafa" : "white" });

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <KPICard label="Total Sales" value={INR(totalSalesVal)} accent="#3b82f6" />
        <KPICard label="Total Stock Value" value={INR(totalStockVal)} accent="#8b5cf6" />
        <KPICard label="Overall STR (qty)" value={FLT(overallSTR)}
          sub={`${totalSalesQty} sold / ${totalStockQty} in stock`} accent="#10b981" />
        <KPICard label="Top Section" value={topSection} accent="#f59e0b" />
        <KPICard label="Avg Bill Value" value={INR(avgBillVal)}
          sub={`${bills.size} bills`} accent="#06b6d4" />
      </div>

      {/* Section-wise Deviation Table */}
      <TableCard title="Section-wise Sales vs Stock Deviation">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            {[["Section", "left"], ["Sales Value", "right"], ["Stock Value", "right"],
            ["Sales %", "right"], ["Stock %", "right"], ["Deviation", "right"], ["STR", "right"]
            ].map(([h, a]) => <th key={h} style={TH(a)}>{h}</th>)}
          </tr></thead>
          <tbody>
            {sectionRows.map((r, i) => (
              <tr key={r.sec} style={stripe(i)}>
                <td style={{ ...TD("left"), fontWeight: "500" }}>{r.sec}</td>
                <td style={TD()}>{INR(r.sv)}</td>
                <td style={TD()}>{INR(r.tv)}</td>
                <td style={TD()}>{PCT(r.sp)}</td>
                <td style={TD()}>{PCT(r.tp)}</td>
                <td style={devTD(r.dev)}>{r.dev > 0 ? "+" : ""}{PCT(r.dev)}</td>
                <td style={TD()}>{FLT(r.str)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {/* Product-wise Deviation Table */}
      <TableCard title="Product-wise Sales vs Stock Deviation">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            {[["Product", "left"], ["Section", "left"], ["Sales Val", "right"], ["Stock Val", "right"],
            ["Sales %", "right"], ["Stock %", "right"], ["Dev", "right"], ["STR", "right"]
            ].map(([h, a]) => <th key={h} style={TH(a)}>{h}</th>)}
          </tr></thead>
          <tbody>
            {productRows.map((r, i) => (
              <tr key={r.prod + r.sec} style={stripe(i)}>
                <td style={{ ...TD("left"), fontWeight: "500" }}>{r.prod}</td>
                <td style={{ ...TD("left"), color: "#94a3b8", fontSize: "11px" }}>{r.sec}</td>
                <td style={TD()}>{INR(r.sv)}</td>
                <td style={TD()}>{INR(r.tv)}</td>
                <td style={TD()}>{PCT(r.sp)}</td>
                <td style={TD()}>{PCT(r.tp)}</td>
                <td style={devTD(r.dev)}>{r.dev > 0 ? "+" : ""}{PCT(r.dev)}</td>
                <td style={TD()}>{FLT(r.str)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {/* Range-wise Sales Table */}
      <TableCard title="Range-wise Sales Analysis">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            {[["Price Range", "left"], ["Sales Value", "right"], ["Qty Sold", "right"], ["Sales %", "right"]]
              .map(([h, a]) => <th key={h} style={TH(a)}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rangeRows.map((r, i) => (
              <tr key={r.range} style={stripe(i)}>
                <td style={{ ...TD("left"), fontWeight: "500" }}>{r.range}</td>
                <td style={TD()}>{INR(r.sv)}</td>
                <td style={TD()}>{r.sq.toLocaleString()}</td>
                <td style={TD()}>{PCT(r.sp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
//  PAGE 02 ── Stock Overview                                        ── STEP 06
// ──────────────────────────────────────────────────────────────────────────────
//  Combines: Stock Ageing · Range Wise Stock · Supplier Analysis (stock only)
//  KPIs   : Total Stock Qty · Total Stock Value · Old Stock Qty · Old Qty % · Old Value %
//  Tables : section × ageing bucket · range-wise stock + old % · supplier old stock %
//  Charts : stacked bar (ageing by section) · horizontal bar (range distribution %)
//
//  REVISION: replaces the shell written in Step 04. Only this function changed.
//  filterData() is the ONLY external function called.
//  All calculations, helpers, and constants below are LOCAL to this component.
// ══════════════════════════════════════════════════════════════════════════════
function Page02_StockOverview({ storeData, filters }) {
  const { stock, config } = filterData(storeData, filters);

  // ── local format helpers ──────────────────────────────────────────────────
  const INR = v => `₹${Math.round(v).toLocaleString("en-IN")}`;
  const PCT = v => `${v.toFixed(1)}%`;
  const NUM = v => Math.round(v).toLocaleString("en-IN");

  // ── local ageing bucket definition ───────────────────────────────────────
  // Colors go green → red to signal freshness → staleness
  const AGE_BUCKETS = [
    { label: "0–30", min: 0, max: 30, color: "#22c55e" },
    { label: "31–60", min: 31, max: 60, color: "#84cc16" },
    { label: "61–90", min: 61, max: 90, color: "#eab308" },
    { label: "91–180", min: 91, max: 180, color: "#f97316" },
    { label: "181–360", min: 181, max: 360, color: "#ef4444" },
    { label: ">360", min: 361, max: Infinity, color: "#991b1b" },
  ];
  const thr = config.old_stock_threshold_days;
  const today = new Date();

  // ── local calculation helpers ─────────────────────────────────────────────
  const daysOld = r => r.entry_date
    ? Math.floor((today - new Date(r.entry_date)) / 86400000) : null;
  const getBucket = days => days === null ? null
    : AGE_BUCKETS.find(b => days >= b.min && days <= b.max) ?? AGE_BUCKETS[5];
  const unitPrice = r => r.stock_qty > 0 ? r.stock_value / r.stock_qty : 0;
  const getRange = up => {
    for (const [lo, hi] of config.price_ranges)
      if (up >= lo && up <= hi) return `₹${lo.toLocaleString()}–${hi.toLocaleString()}`;
    return "Other";
  };

  // ── KPI calculations ──────────────────────────────────────────────────────
  const totalQty = stock.reduce((s, r) => s + r.stock_qty, 0);
  const totalVal = stock.reduce((s, r) => s + r.stock_value, 0);
  const oldStock = stock.filter(r => { const d = daysOld(r); return d !== null && d > thr; });
  const oldQty = oldStock.reduce((s, r) => s + r.stock_qty, 0);
  const oldVal = oldStock.reduce((s, r) => s + r.stock_value, 0);
  const oldQtyPct = totalQty > 0 ? oldQty / totalQty * 100 : 0;
  const oldValPct = totalVal > 0 ? oldVal / totalVal * 100 : 0;

  // ── Section × ageing bucket matrix ───────────────────────────────────────
  const secBktMap = {};   // secBktMap[section][bucketLabel] = qty
  const secTotals = {};   // secTotals[section] = total qty
  const bktTotals = {};   // bktTotals[bucketLabel] = total qty across all sections
  AGE_BUCKETS.forEach(b => { bktTotals[b.label] = 0; });

  stock.forEach(r => {
    const bkt = getBucket(daysOld(r));
    if (!bkt) return;
    if (!secBktMap[r.section]) secBktMap[r.section] = {};
    secBktMap[r.section][bkt.label] = (secBktMap[r.section][bkt.label] || 0) + r.stock_qty;
    secTotals[r.section] = (secTotals[r.section] || 0) + r.stock_qty;
    bktTotals[bkt.label] += r.stock_qty;
  });
  const sections = Object.keys(secBktMap).sort();

  // ── Range-wise stock (price range derived from stock_value / stock_qty) ──
  const rangeMap = {};
  stock.forEach(r => {
    const rng = getRange(unitPrice(r));
    if (!rangeMap[rng]) rangeMap[rng] = { tq: 0, tv: 0, oq: 0, ov: 0 };
    const days = daysOld(r);
    rangeMap[rng].tq += r.stock_qty;
    rangeMap[rng].tv += r.stock_value;
    if (days !== null && days > thr) {
      rangeMap[rng].oq += r.stock_qty;
      rangeMap[rng].ov += r.stock_value;
    }
  });
  const rangeRows = Object.entries(rangeMap).map(([range, d]) => ({
    range, ...d,
    oqPct: d.tq > 0 ? d.oq / d.tq * 100 : 0,
    ovPct: d.tv > 0 ? d.ov / d.tv * 100 : 0,
  })).sort((a, b) => b.tq - a.tq);

  // ── Supplier-wise old stock ───────────────────────────────────────────────
  const supMap = {};
  stock.forEach(r => {
    const sup = r.supplier || "Unknown";
    if (!supMap[sup]) supMap[sup] = { tq: 0, tv: 0, oq: 0, ov: 0 };
    const days = daysOld(r);
    supMap[sup].tq += r.stock_qty;
    supMap[sup].tv += r.stock_value;
    if (days !== null && days > thr) {
      supMap[sup].oq += r.stock_qty;
      supMap[sup].ov += r.stock_value;
    }
  });
  const supRows = Object.entries(supMap).map(([sup, d]) => ({
    sup, ...d,
    oqPct: d.tq > 0 ? d.oq / d.tq * 100 : 0,
  })).sort((a, b) => b.oqPct - a.oqPct);

  // ── Recharts data (local — not shared outside this page) ─────────────────
  const ageingChartData = sections.map(sec => ({
    sec,
    ...AGE_BUCKETS.reduce((obj, b) => ({
      ...obj, [b.label]: secBktMap[sec]?.[b.label] || 0,
    }), {}),
  }));

  const rangeChartData = rangeRows.map(r => ({
    range: r.range,
    pct: totalQty > 0 ? parseFloat((r.tq / totalQty * 100).toFixed(1)) : 0,
    qty: r.tq,
  }));

  // ── local table style helpers ────────────────────────────────────────────
  const TH = (a = "right") => ({
    padding: "8px 12px", fontSize: "10px", color: "#64748b", fontWeight: "700",
    letterSpacing: "0.4px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc",
    textAlign: a, whiteSpace: "nowrap",
  });
  const TD = (a = "right") => ({
    padding: "8px 12px", fontSize: "12px", color: "#1e293b", textAlign: a,
    fontFamily: "'Space Mono',monospace",
  });
  const stripe = i => ({ borderBottom: "1px solid #f8fafc", background: i % 2 ? "#fafafa" : "white" });
  const oldCell = pct => ({
    ...TD(),
    fontWeight: "700",
    color: pct > 50 ? "#dc2626" : pct > 25 ? "#ea580c" : pct > 0 ? "#65a30d" : "#94a3b8",
  });

  return (
    <div>
      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <KPICard label="Total Stock Qty" value={NUM(totalQty)} accent="#8b5cf6" />
        <KPICard label="Total Stock Value" value={INR(totalVal)} accent="#8b5cf6" />
        <KPICard label="Old Stock Qty" value={NUM(oldQty)}
          sub={`${PCT(oldQtyPct)} of total`} accent="#f97316" />
        <KPICard label="Old Stock Qty %" value={PCT(oldQtyPct)}
          sub={`threshold: >${thr} days`} accent="#ef4444" />
        <KPICard label="Old Stock Value %" value={PCT(oldValPct)} accent="#ef4444" />
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>

        {/* Stacked bar — ageing by section */}
        <div style={{
          background: "white", borderRadius: "10px", padding: "16px 20px 10px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
        }}>
          <div style={{ fontWeight: "600", fontSize: "12px", color: "#0f172a", marginBottom: "14px" }}>
            Stock Ageing by Section (qty)
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={ageingChartData} margin={{ top: 0, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="sec" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e2e8f0", padding: "6px 10px" }}
                formatter={(v, name) => [v.toLocaleString() + " units", name]}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: "8px" }} />
              {AGE_BUCKETS.map(b => (
                <Bar key={b.label} dataKey={b.label} stackId="a" fill={b.color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Horizontal bar — range distribution */}
        <div style={{
          background: "white", borderRadius: "10px", padding: "16px 20px 10px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
        }}>
          <div style={{ fontWeight: "600", fontSize: "12px", color: "#0f172a", marginBottom: "14px" }}>
            Stock Distribution by Price Range (% of total qty)
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={rangeChartData} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" unit="%" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis dataKey="range" type="category"
                tick={{ fontSize: 10, fill: "#64748b" }} width={80} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e2e8f0", padding: "6px 10px" }}
                formatter={(v, _, item) => [
                  `${v}%  (${item.payload.qty.toLocaleString()} units)`, "Share of stock"
                ]}
              />
              <Bar dataKey="pct" fill="#8b5cf6" radius={[0, 4, 4, 0]} label={{
                position: "right", fontSize: 10, fill: "#64748b",
                formatter: v => `${v}%`,
              }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Section × Ageing Bucket Table ───────────────────────────────── */}
      <TableCard title="Stock Ageing by Section — Qty Breakdown">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={TH("left")}>Section</th>
              {AGE_BUCKETS.map(b => (
                <th key={b.label} style={{ ...TH(), borderTop: `2px solid ${b.color}` }}>
                  {b.label} d
                </th>
              ))}
              <th style={{ ...TH(), color: "#0f172a" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((sec, i) => (
              <tr key={sec} style={stripe(i)}>
                <td style={{ ...TD("left"), fontWeight: "500" }}>{sec}</td>
                {AGE_BUCKETS.map(b => {
                  const v = secBktMap[sec]?.[b.label] || 0;
                  return (
                    <td key={b.label} style={{ ...TD(), color: v > 0 ? "#1e293b" : "#d1d5db" }}>
                      {NUM(v)}
                    </td>
                  );
                })}
                <td style={{ ...TD(), fontWeight: "700" }}>{NUM(secTotals[sec] || 0)}</td>
              </tr>
            ))}
            {/* Grand total row */}
            <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
              <td style={{ ...TD("left"), fontWeight: "700", color: "#0f172a" }}>Total</td>
              {AGE_BUCKETS.map(b => (
                <td key={b.label} style={{ ...TD(), fontWeight: "700" }}>{NUM(bktTotals[b.label] || 0)}</td>
              ))}
              <td style={{ ...TD(), fontWeight: "800", color: "#0f172a" }}>{NUM(totalQty)}</td>
            </tr>
          </tbody>
        </table>
      </TableCard>

      {/* ── Range-wise Stock + Old Stock Table ──────────────────────────── */}
      <TableCard title={`Range-wise Stock + Old Stock Analysis  (old = >${thr} days)`}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            {[["Price Range", "left"], ["Stock Qty", "right"], ["Stock Value", "right"],
            ["Old Qty", "right"], ["Old Qty %", "right"], ["Old Value %", "right"]
            ].map(([h, a]) => <th key={h} style={TH(a)}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rangeRows.map((r, i) => (
              <tr key={r.range} style={stripe(i)}>
                <td style={{ ...TD("left"), fontWeight: "500" }}>{r.range}</td>
                <td style={TD()}>{NUM(r.tq)}</td>
                <td style={TD()}>{INR(r.tv)}</td>
                <td style={TD()}>{NUM(r.oq)}</td>
                <td style={oldCell(r.oqPct)}>{PCT(r.oqPct)}</td>
                <td style={oldCell(r.ovPct)}>{PCT(r.ovPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {/* ── Supplier-wise Old Stock Table ────────────────────────────────── */}
      <TableCard title="Supplier-wise Old Stock Analysis">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            {[["Supplier", "left"], ["Total Qty", "right"], ["Total Value", "right"],
            ["Old Stock Qty", "right"], ["Old Stock Value", "right"], ["Old Stock %", "right"]
            ].map(([h, a]) => <th key={h} style={TH(a)}>{h}</th>)}
          </tr></thead>
          <tbody>
            {supRows.map((r, i) => (
              <tr key={r.sup} style={stripe(i)}>
                <td style={{ ...TD("left"), fontWeight: "500" }}>{r.sup}</td>
                <td style={TD()}>{NUM(r.tq)}</td>
                <td style={TD()}>{INR(r.tv)}</td>
                <td style={TD()}>{NUM(r.oq)}</td>
                <td style={TD()}>{INR(r.ov)}</td>
                <td style={oldCell(r.oqPct)}>{PCT(r.oqPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
//  PAGE 03 ── STR · Margin · GMROI      (shell — built in Step 07)
//  All calculations LOCAL. Zero sharing with other pages.
// ══════════════════════════════════════════════════════════════════════════════
function Page03_STRMarginGMROI({ storeData, filters }) {
  const { sales, stock, config } = filterData(storeData, filters);

  // ── Local formatters ──────────────────────────────────────────────────────
  const INR = v => `₹${Math.round(v).toLocaleString("en-IN")}`;
  const PCT = v => `${v.toFixed(1)}%`;
  const FLT = v => v.toFixed(2);

  const TH = (a = "right") => ({
    padding: "9px 14px", fontSize: "10px", color: "#64748b",
    fontWeight: "700", letterSpacing: "0.4px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc", textAlign: a, whiteSpace: "nowrap",
    cursor: "pointer", userSelect: "none",
  });
  const TD = (a = "right") => ({
    padding: "9px 14px", fontSize: "12px", color: "#1e293b",
    textAlign: a, fontFamily: "'Space Mono',monospace",
  });
  const stripe = i => ({
    borderBottom: "1px solid #f8fafc",
    background: i % 2 ? "#fafafa" : "white",
  });
  const cardStyle = {
    background: "white",
    borderRadius: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
    marginBottom: "16px",
    overflow: "hidden",
  };
  const sectionTitle = {
    fontSize: "12px", fontWeight: "700", color: "#64748b",
    textTransform: "uppercase", letterSpacing: "0.6px",
    padding: "14px 16px 8px",
  };

  const CHART_TOOLTIP_STYLE = {
    fontSize: 12, borderRadius: 6,
    border: "1px solid #e2e8f0",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  };

  // ── Range classifier ──────────────────────────────────────────────────────
  const getRange = sp => {
    for (const [lo, hi] of config.price_ranges)
      if (sp >= lo && sp <= hi) return `₹${lo}–${hi}`;
    return "Other";
  };

  // rangeKey format for desired_str_by_range lookup: "0-250", "251-500" etc
  const getRangeKey = sp => {
    for (const [lo, hi] of config.price_ranges)
      if (sp >= lo && sp <= hi) return `${lo}-${hi}`;
    return "Other";
  };

  // ── Per-product aggregation ───────────────────────────────────────────────
  const prodMap = {};

  for (const r of sales) {
    const key = r.product || "Unknown";
    if (!prodMap[key]) prodMap[key] = {
      product: key,
      section: r.section || "—",
      salesQty: 0, salesVal: 0,
      stockQty: 0, stockVal: 0,
      spFreq: {},     // selling_price frequency for modal range
      marginNum: 0,   // numerator: sum (sp-cp)*qty
      hasCost: false,
    };
    const p = prodMap[key];
    p.salesQty += r.net_qty || 0;
    p.salesVal += r.net_amount || 0;
    if (r.selling_price) {
      p.spFreq[r.selling_price] = (p.spFreq[r.selling_price] || 0) + (r.net_qty || 0);
    }
    if (r.cost_price != null && r.selling_price != null) {
      p.marginNum += (r.selling_price - r.cost_price) * (r.net_qty || 0);
      p.hasCost = true;
    }
  }

  for (const r of stock) {
    const key = r.product || "Unknown";
    if (!prodMap[key]) prodMap[key] = {
      product: key,
      section: r.section || "—",
      salesQty: 0, salesVal: 0,
      stockQty: 0, stockVal: 0,
      spFreq: {}, marginNum: 0, hasCost: false,
    };
    prodMap[key].stockQty += r.stock_qty || 0;
    prodMap[key].stockVal += r.stock_value || 0;
  }

  // Derive final per-product metrics
  const productRows = Object.values(prodMap).map(p => {
    // modal selling price
    const modalSP = Object.entries(p.spFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
    const range = getRange(Number(modalSP));
    const rangeKey = getRangeKey(Number(modalSP));

    const marginPct = (p.hasCost && p.salesVal > 0)
      ? (p.marginNum / p.salesVal) * 100
      : null;

    const strQty = p.stockQty > 0 ? p.salesQty / p.stockQty : 0;
    const strVal = p.stockVal > 0 ? p.salesVal / p.stockVal : 0;

    const desired = config.desired_str_by_range?.[rangeKey] ?? 3;
    const optQty = desired > 0 ? p.salesQty / desired : 0;
    const toReduce = Math.max(0, p.stockQty - optQty);

    // toReduce in ₹ value
    const avgStockUnitVal = p.stockQty > 0 ? p.stockVal / p.stockQty : 0;
    const toReduceVal = toReduce * avgStockUnitVal;

    const gmroi = (marginPct !== null && p.stockVal > 0)
      ? (p.salesVal * marginPct / 100) / p.stockVal
      : null;

    return {
      product: p.product,
      section: p.section,
      salesQty: p.salesQty,
      salesVal: p.salesVal,
      stockQty: p.stockQty,
      stockVal: p.stockVal,
      strQty, strVal,
      marginPct,
      range, rangeKey,
      desired,
      optQty,
      toReduce,
      toReduceVal,
      gmroi,
    };
  });

  // ── Overall KPIs ──────────────────────────────────────────────────────────
  const totalSalesQty = productRows.reduce((s, r) => s + r.salesQty, 0);
  const totalStockQty = productRows.reduce((s, r) => s + r.stockQty, 0);
  const totalSalesVal = productRows.reduce((s, r) => s + r.salesVal, 0);
  const totalStockVal = productRows.reduce((s, r) => s + r.stockVal, 0);

  const overallSTRqty = totalStockQty > 0 ? totalSalesQty / totalStockQty : 0;
  const overallSTRval = totalStockVal > 0 ? totalSalesVal / totalStockVal : 0;

  // weighted margin
  const hasCostAny = productRows.some(r => r.marginPct !== null);
  let overallMargin = null;
  if (hasCostAny) {
    const totalMarginVal = productRows.reduce((s, r) => {
      return s + (r.marginPct !== null ? r.salesVal * r.marginPct / 100 : 0);
    }, 0);
    overallMargin = totalSalesVal > 0 ? (totalMarginVal / totalSalesVal) * 100 : null;
  }

  const overallGMROI = (overallMargin !== null && totalStockVal > 0)
    ? (totalSalesVal * overallMargin / 100) / totalStockVal
    : null;

  const totalToReduce = productRows.reduce((s, r) => s + r.toReduceVal, 0);

  // ── Range-wise aggregation ────────────────────────────────────────────────
  const rangeAggMap = {};
  for (const r of productRows) {
    if (!rangeAggMap[r.range]) rangeAggMap[r.range] = {
      range: r.range, rangeKey: r.rangeKey,
      salesVal: 0, marginNum: 0, hasCost: false,
      salesQty: 0, stockQty: 0,
    };
    const ra = rangeAggMap[r.range];
    ra.salesVal += r.salesVal;
    ra.salesQty += r.salesQty;
    ra.stockQty += r.stockQty;
    if (r.marginPct !== null) {
      ra.marginNum += r.salesVal * r.marginPct / 100;
      ra.hasCost = true;
    }
  }
  const rangeRows = Object.values(rangeAggMap).map(ra => {
    const marginPct = (ra.hasCost && ra.salesVal > 0)
      ? (ra.marginNum / ra.salesVal) * 100 : null;
    const desired = config.desired_str_by_range?.[ra.rangeKey] ?? 3;
    const actualSTR = ra.stockQty > 0 ? ra.salesQty / ra.stockQty : 0;
    const deviation = actualSTR - desired;
    return { ...ra, marginPct, desired, actualSTR, deviation };
  }).sort((a, b) => a.range.localeCompare(b.range));

  // ── Chart 1 data — top 12 by stock value ─────────────────────────────────
  const chart1Data = [...productRows]
    .sort((a, b) => b.stockVal - a.stockVal)
    .slice(0, 12)
    .map(r => ({
      name: r.product.slice(0, 10),
      "Current Stock ₹": Math.round(r.stockVal),
      "Optimum Stock ₹": Math.round(r.optQty * (r.stockQty > 0 ? r.stockVal / r.stockQty : 0)),
    }));

  // ── Chart 2 data — margin by range ───────────────────────────────────────
  const chart2Data = rangeRows
    .filter(r => r.marginPct !== null)
    .map(r => ({ range: r.range, "Margin %": parseFloat(r.marginPct.toFixed(2)) }));

  // ── Table 1 state — sort + pagination ────────────────────────────────────
  const [t1Sort, setT1Sort] = React.useState({ col: "strQty", dir: "asc" });
  const [t1Page, setT1Page] = React.useState(0);
  const T1_PAGE = 15;

  const toggleT1 = col => {
    setT1Sort(prev => prev.col === col
      ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
      : { col, dir: "asc" });
    setT1Page(0);
  };
  const t1Arrow = col => t1Sort.col === col
    ? <span style={{ color: "#3b82f6", marginLeft: 3 }}>{t1Sort.dir === "asc" ? "↑" : "↓"}</span>
    : null;

  const sortedT1 = React.useMemo(() => {
    const arr = [...productRows];
    arr.sort((a, b) => {
      const v = t1Sort.dir === "asc" ? 1 : -1;
      if (t1Sort.col === "product") return v * a.product.localeCompare(b.product);
      if (t1Sort.col === "section") return v * a.section.localeCompare(b.section);
      const av = a[t1Sort.col] ?? -Infinity;
      const bv = b[t1Sort.col] ?? -Infinity;
      return v * (av - bv);
    });
    return arr;
  }, [productRows, t1Sort]);

  const t1TotalPages = Math.max(1, Math.ceil(sortedT1.length / T1_PAGE));
  const pagedT1 = sortedT1.slice(t1Page * T1_PAGE, (t1Page + 1) * T1_PAGE);

  // ── Table 3 state — GMROI sort ────────────────────────────────────────────
  const [t3Sort, setT3Sort] = React.useState({ col: "gmroi", dir: "desc" });

  const toggleT3 = col => setT3Sort(prev => prev.col === col
    ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
    : { col, dir: "desc" });
  const t3Arrow = col => t3Sort.col === col
    ? <span style={{ color: "#3b82f6", marginLeft: 3 }}>{t3Sort.dir === "asc" ? "↑" : "↓"}</span>
    : null;

  const sortedT3 = React.useMemo(() => {
    const arr = productRows.filter(r => r.gmroi !== null || r.salesVal > 0);
    arr.sort((a, b) => {
      const v = t3Sort.dir === "asc" ? 1 : -1;
      if (t3Sort.col === "product") return v * a.product.localeCompare(b.product);
      if (t3Sort.col === "section") return v * a.section.localeCompare(b.section);
      const av = a[t3Sort.col] ?? -Infinity;
      const bv = b[t3Sort.col] ?? -Infinity;
      return v * (av - bv);
    });
    return arr;
  }, [productRows, t3Sort]);

  // ── PAG_BTN helper ────────────────────────────────────────────────────────
  const PAG_BTN = (disabled, onClick, label) => (
    <button disabled={disabled} onClick={onClick} style={{
      border: "1px solid #e2e8f0", borderRadius: "5px", padding: "3px 10px",
      background: "white", cursor: disabled ? "not-allowed" : "pointer",
      fontSize: "12px", color: "#64748b", opacity: disabled ? 0.4 : 1,
    }}>{label}</button>
  );

  // ── Warning banner ────────────────────────────────────────────────────────
  const warnBanner = (
    <div style={{
      background: "#fffbeb", border: "1px solid #fcd34d",
      borderRadius: "8px", padding: "10px 14px",
      fontSize: "12px", color: "#92400e", marginBottom: "16px",
    }}>
      ⚠ cost_price not in input data — Margin % and GMROI show as —
    </div>
  );

  // ── GMROI cell color ──────────────────────────────────────────────────────
  const gmroiStyle = val => {
    if (val === null) return TD();
    if (val >= 1.0) return { ...TD(), color: "#10b981", fontWeight: "700" };
    if (val >= 0.5) return { ...TD(), color: "#d97706", fontWeight: "700" };
    return { ...TD(), color: "#ef4444", fontWeight: "700" };
  };

  return (
    <div>

      {/* Warning banner if no cost_price */}
      {!hasCostAny && warnBanner}

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <KPICard label="STR (Qty)" value={overallSTRqty.toFixed(2)} accent="#3b82f6" />
        <KPICard label="STR (Value)" value={overallSTRval.toFixed(2)} accent="#8b5cf6" />
        <KPICard label="Overall Margin %" value={overallMargin !== null ? PCT(overallMargin) : "—"} accent="#10b981" />
        <KPICard label="GMROI" value={overallGMROI !== null ? FLT(overallGMROI) : "—"} accent="#f59e0b" />
        <KPICard label="Stock to Reduce" value={INR(totalToReduce)} accent="#ef4444" />
      </div>

      {/* Chart 1 — Current vs Optimum Stock Bar */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Current vs Optimum Stock (Top 12 by Stock Value)</div>
        <div style={{ padding: "0 16px 16px" }}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart1Data} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={v => INR(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Current Stock ₹" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Optimum Stock ₹" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table 1 — Product STR Analysis */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 8px" }}>
          <div style={sectionTitle}>Product STR Analysis</div>
          <button
            onClick={() => exportCSV(
              "str_analysis.csv",
              ["Product", "Section", "Sales Qty", "Stock Qty", "STR (qty)", "Sales ₹", "Stock ₹", "STR (val)", "Opt Stock", "To Reduce"],
              sortedT1.map(r => [
                r.product, r.section,
                Math.round(r.salesQty), Math.round(r.stockQty),
                r.strQty.toFixed(2),
                Math.round(r.salesVal), Math.round(r.stockVal),
                r.strVal.toFixed(2),
                Math.round(r.optQty),
                Math.round(r.toReduce),
              ])
            )}
            style={{
              fontSize: "11px", background: "#f8fafc",
              border: "1px solid #e2e8f0", borderRadius: "5px",
              padding: "4px 10px", cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
            }}
          >Export CSV</button>
        </div>

        {!hasCostAny && <div style={{ padding: "0 16px 8px" }}>{warnBanner}</div>}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  { key: "product", label: "Product", a: "left" },
                  { key: "section", label: "Section", a: "left" },
                  { key: "salesQty", label: "Sales Qty", a: "right" },
                  { key: "stockQty", label: "Stock Qty", a: "right" },
                  { key: "strQty", label: "STR (qty)", a: "right" },
                  { key: "salesVal", label: "Sales ₹", a: "right" },
                  { key: "stockVal", label: "Stock ₹", a: "right" },
                  { key: "strVal", label: "STR (val)", a: "right" },
                  { key: "optQty", label: "Opt Stock", a: "right" },
                  { key: "toReduce", label: "To Reduce", a: "right" },
                ].map(({ key, label, a }) => (
                  <th key={key} style={TH(a)} onClick={() => toggleT1(key)}>
                    {label}{t1Arrow(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedT1.map((r, i) => {
                const strColor = r.strQty < r.desired
                  ? { color: "#ef4444", fontWeight: "700" }
                  : { color: "#10b981", fontWeight: "700" };
                const toReduceCell = r.toReduce > 0
                  ? { ...TD(), background: "#fef2f2", color: "#dc2626", fontWeight: "700" }
                  : TD();
                return (
                  <tr key={r.product + r.section} style={stripe(i)}>
                    <td style={{ ...TD("left"), fontWeight: 500 }}>{r.product}</td>
                    <td style={{ ...TD("left"), color: "#94a3b8", fontSize: "11px" }}>{r.section}</td>
                    <td style={TD()}>{Math.round(r.salesQty).toLocaleString()}</td>
                    <td style={TD()}>{Math.round(r.stockQty).toLocaleString()}</td>
                    <td style={{ ...TD(), ...strColor }}>{r.strQty.toFixed(2)}</td>
                    <td style={TD()}>{INR(r.salesVal)}</td>
                    <td style={TD()}>{INR(r.stockVal)}</td>
                    <td style={TD()}>{r.strVal.toFixed(2)}</td>
                    <td style={TD()}>{Math.round(r.optQty).toLocaleString()}</td>
                    <td style={toReduceCell}>{Math.round(r.toReduce).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "10px 16px", justifyContent: "flex-end",
          fontSize: "12px", color: "#64748b",
        }}>
          {PAG_BTN(t1Page === 0, () => setT1Page(0), "««")}
          {PAG_BTN(t1Page === 0, () => setT1Page(p => p - 1), "‹ Prev")}
          <span>Page {t1Page + 1} of {t1TotalPages} ({sortedT1.length} rows)</span>
          {PAG_BTN(t1Page >= t1TotalPages - 1, () => setT1Page(p => p + 1), "Next ›")}
          {PAG_BTN(t1Page >= t1TotalPages - 1, () => setT1Page(t1TotalPages - 1), "»»")}
        </div>
      </div>

      {/* Two-column: Table 2 + Table 3 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>

        {/* Table 2 — Range Wise Margin */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Range-wise Margin Analysis</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={TH("left")}>Range</th>
                  <th style={TH()}>Sales ₹</th>
                  <th style={TH()}>Margin %</th>
                  <th style={TH()}>Desired STR</th>
                  <th style={TH()}>Actual STR</th>
                  <th style={TH()}>Deviation</th>
                </tr>
              </thead>
              <tbody>
                {rangeRows.map((r, i) => {
                  const devStyle = r.deviation >= 0
                    ? { ...TD(), color: "#15803d", fontWeight: "700" }
                    : { ...TD(), color: "#dc2626", fontWeight: "700" };
                  return (
                    <tr key={r.range} style={stripe(i)}>
                      <td style={{ ...TD("left"), fontWeight: 500 }}>{r.range}</td>
                      <td style={TD()}>{INR(r.salesVal)}</td>
                      <td style={TD()}>{r.marginPct !== null ? PCT(r.marginPct) : "—"}</td>
                      <td style={TD()}>{r.desired.toFixed(2)}</td>
                      <td style={TD()}>{r.actualSTR.toFixed(2)}</td>
                      <td style={devStyle}>{r.deviation >= 0 ? "+" : ""}{r.deviation.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 3 — GMROI Analysis */}
        <div style={cardStyle}>
          <div style={sectionTitle}>GMROI Analysis</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    { key: "product", label: "Product", a: "left" },
                    { key: "section", label: "Section", a: "left" },
                    { key: "gmroi", label: "GMROI", a: "right" },
                    { key: "strVal", label: "STR (val)", a: "right" },
                    { key: "marginPct", label: "Margin %", a: "right" },
                    { key: "salesVal", label: "Sales ₹", a: "right" },
                    { key: "stockVal", label: "Stock ₹", a: "right" },
                  ].map(({ key, label, a }) => (
                    <th key={key} style={TH(a)} onClick={() => toggleT3(key)}>
                      {label}{t3Arrow(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedT3.map((r, i) => (
                  <tr key={r.product + r.section} style={stripe(i)}>
                    <td style={{ ...TD("left"), fontWeight: 500 }}>{r.product}</td>
                    <td style={{ ...TD("left"), color: "#94a3b8", fontSize: "11px" }}>{r.section}</td>
                    <td style={gmroiStyle(r.gmroi)}>{r.gmroi !== null ? FLT(r.gmroi) : "—"}</td>
                    <td style={TD()}>{r.strVal.toFixed(2)}</td>
                    <td style={TD()}>{r.marginPct !== null ? PCT(r.marginPct) : "—"}</td>
                    <td style={TD()}>{INR(r.salesVal)}</td>
                    <td style={TD()}>{INR(r.stockVal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Chart 2 — Margin % by Range Line (or warning) */}
      {hasCostAny ? (
        <div style={cardStyle}>
          <div style={sectionTitle}>Margin % by Price Range</div>
          <div style={{ padding: "0 16px 16px" }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chart2Data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={v => `${v.toFixed(1)}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="Margin %"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#8b5cf6" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        warnBanner
      )}

    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
//  PAGE 04 ── Matrix + Grading          (shell — built in Step 08)
//  All calculations LOCAL. Zero sharing with other pages.
// ══════════════════════════════════════════════════════════════════════════════
function Page04_MatrixGrading({ storeData, filters }) {
  const { sales, stock, config } = filterData(storeData, filters);

  // ── Style tokens ────────────────────────────────────────────────────────────
  const INR = v => `₹${Math.round(v).toLocaleString("en-IN")}`;
  const PCT = v => `${Number(v).toFixed(1)}%`;
  const TH = (a = "right") => ({
    padding: "9px 14px", fontSize: "10px", color: "#64748b",
    fontWeight: "700", letterSpacing: "0.4px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc", textAlign: a, whiteSpace: "nowrap",
    cursor: "pointer", userSelect: "none",
  });
  const TD = (a = "right") => ({
    padding: "9px 14px", fontSize: "12px", color: "#1e293b",
    textAlign: a, fontFamily: "'Space Mono',monospace",
  });
  const stripe = i => ({
    borderBottom: "1px solid #f8fafc",
    background: i % 2 ? "#fafafa" : "white",
  });
  const cardStyle = {
    background: "white", borderRadius: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
    marginBottom: "16px", overflow: "hidden",
  };
  const sectionTitle = {
    fontSize: "12px", fontWeight: "700", color: "#64748b",
    textTransform: "uppercase", letterSpacing: "0.6px",
    padding: "14px 16px 8px",
  };

  // ── Per-product aggregation ─────────────────────────────────────────────────
  const productMap = {};
  for (const r of sales) {
    const p = r.product || "Unknown";
    if (!productMap[p]) productMap[p] = {
      product: p, section: r.section || "",
      salesVal: 0, salesQty: 0, bills: new Set(),
      marginNumer: 0, marginDenom: 0, hasCost: false,
    };
    const pm = productMap[p];
    pm.salesVal += r.net_amount || 0;
    pm.salesQty += r.net_qty || 0;
    if (r.bill_no) pm.bills.add(r.bill_no);
    if (r.cost_price != null && r.selling_price != null) {
      pm.marginNumer += (r.selling_price - r.cost_price) * (r.net_qty || 0);
      pm.marginDenom += r.net_amount || 0;
      pm.hasCost = true;
    }
  }

  const stockMap = {};
  for (const r of stock) {
    const p = r.product || "Unknown";
    if (!stockMap[p]) stockMap[p] = { stockVal: 0, stockQty: 0 };
    stockMap[p].stockVal += r.stock_value || 0;
    stockMap[p].stockQty += r.stock_qty || 0;
  }

  const products = Object.values(productMap).map(pm => {
    const uniqueBills = pm.bills.size || 1;
    const avgBillVal = pm.salesVal / uniqueBills;
    const marginPct = pm.hasCost && pm.marginDenom > 0
      ? (pm.marginNumer / pm.marginDenom) * 100
      : null;
    const sk = stockMap[pm.product] || { stockVal: 0, stockQty: 0 };
    const str = sk.stockQty > 0 ? pm.salesQty / sk.stockQty : 0;
    return { ...pm, avgBillVal, marginPct, str, stockVal: sk.stockVal, stockQty: sk.stockQty };
  });

  // ── Thresholds ──────────────────────────────────────────────────────────────
  const salesVals = products.map(p => p.salesVal).sort((a, b) => a - b);
  const mid = Math.floor(salesVals.length / 2);
  const salesMedian = salesVals.length % 2
    ? salesVals[mid]
    : ((salesVals[mid - 1] || 0) + (salesVals[mid] || 0)) / 2;
  const marginThresh = 25;
  const totalSalesVal = products.reduce((s, p) => s + p.salesVal, 0);
  const totalUniqueBills = new Set(sales.map(r => r.bill_no).filter(Boolean)).size || 1;
  const overallABV = totalSalesVal / totalUniqueBills;
  const maxSalesVal = Math.max(...products.map(p => p.salesVal), 1);

  // ── Matrix insight + priority ───────────────────────────────────────────────
  function getInsight(p) {
    const highSales  = p.salesVal >= salesMedian;
    const highMargin = p.marginPct != null ? p.marginPct >= marginThresh : false;
    const highAVB    = p.avgBillVal >= overallABV;
    if (highSales && highMargin && highAVB)  return { insight: "Top-tier performer — maintain stock",         priority: "🟢 Low" };
    if (highSales && highMargin && !highAVB) return { insight: "High-profit driver — explore bundling",       priority: "🟢 Low" };
    if (highSales && !highMargin)            return { insight: "Volume driver — improve margin",              priority: "🟠 Medium" };
    if (!highSales && highMargin)            return { insight: "Underexposed gem — targeted marketing",       priority: "🟠 Medium" };
    if (!highSales && !highMargin && highAVB) return { insight: "High-value inefficient — reassess",         priority: "🔴 Critical" };
    return                                          { insight: "Low-impact — consider clearance",            priority: "🔴 Critical" };
  }

  // ── Grading ─────────────────────────────────────────────────────────────────
  function getGrade(salesVal) {
    const score = (salesVal / maxSalesVal) * 100;
    if (score >= config.grade_rules.A.min_score) return { grade: "A", score };
    if (score >= config.grade_rules.B.min_score) return { grade: "B", score };
    return { grade: "C", score };
  }

  // ── Enrich products ──────────────────────────────────────────────────────────
  const enriched = products.map(p => {
    const { insight, priority } = getInsight(p);
    const { grade, score } = getGrade(p.salesVal);
    const highSales  = p.salesVal >= salesMedian;
    const highMargin = p.marginPct != null ? p.marginPct >= marginThresh : false;
    const highAVB    = p.avgBillVal >= overallABV;
    return { ...p, insight, priority, grade, score, highSales, highMargin, highAVB };
  });

  const gc = { A: 0, B: 0, C: 0 };
  enriched.forEach(p => gc[p.grade]++);
  const tot = enriched.length;
  const criticalCount = enriched.filter(p => p.priority === "🔴 Critical").length;

  // ── Supplier aggregation ────────────────────────────────────────────────────
  const supplierMap = {};
  for (const p of enriched) {
    const sup = p.product; // we group by supplier from sales
  }
  const supRaw = {};
  for (const r of sales) {
    const s = r.supplier || "Unknown";
    if (!supRaw[s]) supRaw[s] = { totalSales: 0, products: new Set(), scores: [] };
    supRaw[s].totalSales += r.net_amount || 0;
    supRaw[s].products.add(r.product);
  }
  // attach scores
  const scoreByProduct = {};
  enriched.forEach(p => { scoreByProduct[p.product] = p.score; });
  for (const r of sales) {
    const s = r.supplier || "Unknown";
    if (supRaw[s] && scoreByProduct[r.product] != null) {
      if (!supRaw[s]._scored) { supRaw[s]._scored = new Set(); supRaw[s].scores = []; }
      if (!supRaw[s]._scored.has(r.product)) {
        supRaw[s]._scored.add(r.product);
        supRaw[s].scores.push(scoreByProduct[r.product]);
      }
    }
  }
  const suppliers = Object.entries(supRaw).map(([name, s]) => {
    const avgScore = s.scores.length ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length : 0;
    const { grade } = getGrade((avgScore / 100) * maxSalesVal);
    return { name, totalSales: s.totalSales, products: s.products.size, avgScore, grade };
  });

  // ── Any cost data? ───────────────────────────────────────────────────────────
  const hasCostData = enriched.some(p => p.marginPct != null);

  // ── Table 1 state ───────────────────────────────────────────────────────────
  const [t1Sort, setT1Sort] = useState({ key: "priority", dir: 1 });
  const [t1Page, setT1Page] = useState(0);
  const T1_PAGE = 15;

  const priorityOrder = { "🔴 Critical": 0, "🟠 Medium": 1, "🟢 Low": 2 };

  const t1Sorted = useMemo(() => {
    return [...enriched].sort((a, b) => {
      const { key, dir } = t1Sort;
      if (key === "priority") return (priorityOrder[a.priority] - priorityOrder[b.priority]) * dir;
      const av = a[key] ?? 0, bv = b[key] ?? 0;
      return typeof av === "string" ? av.localeCompare(bv) * dir : (av - bv) * dir;
    });
  }, [enriched, t1Sort]);

  const t1Pages = Math.max(1, Math.ceil(t1Sorted.length / T1_PAGE));
  const t1Rows = t1Sorted.slice(t1Page * T1_PAGE, (t1Page + 1) * T1_PAGE);

  function t1Toggle(key) {
    setT1Sort(s => s.key === key ? { key, dir: -s.dir } : { key, dir: 1 });
    setT1Page(0);
  }
  const t1Arrow = k => t1Sort.key === k ? (t1Sort.dir === 1 ? " ↑" : " ↓") : "";

  // ── Table 2 state ───────────────────────────────────────────────────────────
  const [t2Sort, setT2Sort] = useState({ key: "score", dir: -1 });
  const t2Sorted = useMemo(() => {
    return [...enriched].sort((a, b) => {
      const { key, dir } = t2Sort;
      const av = a[key] ?? 0, bv = b[key] ?? 0;
      return typeof av === "string" ? av.localeCompare(bv) * dir : (av - bv) * dir;
    });
  }, [enriched, t2Sort]);
  function t2Toggle(key) { setT2Sort(s => s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }); }
  const t2Arrow = k => t2Sort.key === k ? (t2Sort.dir === 1 ? " ↑" : " ↓") : "";

  // ── Table 3 state ───────────────────────────────────────────────────────────
  const [t3Sort, setT3Sort] = useState({ key: "totalSales", dir: -1 });
  const t3Sorted = useMemo(() => {
    return [...suppliers].sort((a, b) => {
      const { key, dir } = t3Sort;
      const av = a[key] ?? 0, bv = b[key] ?? 0;
      return typeof av === "string" ? av.localeCompare(bv) * dir : (av - bv) * dir;
    });
  }, [suppliers, t3Sort]);
  function t3Toggle(key) { setT3Sort(s => s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }); }
  const t3Arrow = k => t3Sort.key === k ? (t3Sort.dir === 1 ? " ↑" : " ↓") : "";

  // ── Pill badge ──────────────────────────────────────────────────────────────
  function Pill({ high }) {
    return (
      <span style={{
        background: high ? "#dcfce7" : "#fee2e2",
        color: high ? "#15803d" : "#dc2626",
        padding: "2px 8px", borderRadius: "99px",
        fontSize: "11px", fontWeight: "600",
      }}>
        {high ? "High" : "Low"}
      </span>
    );
  }

  function GradeBadge({ grade }) {
    const cfg = {
      A: { bg: "#dcfce7", color: "#15803d" },
      B: { bg: "#fef9c3", color: "#854d0e" },
      C: { bg: "#fee2e2", color: "#dc2626" },
    }[grade] || { bg: "#f1f5f9", color: "#64748b" };
    return (
      <span style={{
        background: cfg.bg, color: cfg.color,
        padding: "2px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "700",
      }}>
        {grade}
      </span>
    );
  }

  // ── Priority color ───────────────────────────────────────────────────────────
  function priorityColor(p) {
    if (p === "🔴 Critical") return "#dc2626";
    if (p === "🟠 Medium")   return "#d97706";
    return "#15803d";
  }

  // ── PAG BTN ─────────────────────────────────────────────────────────────────
  const PAG = (dis, fn, label) => (
    <button onClick={fn} disabled={dis} style={{
      padding: "3px 9px", borderRadius: "5px", border: "1px solid #e2e8f0",
      background: dis ? "#f8fafc" : "white", color: dis ? "#cbd5e1" : "#475569",
      fontSize: "11px", cursor: dis ? "default" : "pointer",
    }}>{label}</button>
  );

  // ── Scatter data ─────────────────────────────────────────────────────────────
  const gradeColor = { A: "#10b981", B: "#f59e0b", C: "#ef4444" };
  const scatterData = hasCostData
    ? enriched.filter(p => p.marginPct != null).map(p => ({
        x: parseFloat(p.marginPct.toFixed(2)),
        y: Math.round(p.salesVal),
        z: Math.max(p.stockVal, 1),
        name: p.product,
        grade: p.grade,
        fill: gradeColor[p.grade],
      }))
    : [];

  // ── Donut data ───────────────────────────────────────────────────────────────
  const donutData = [
    { name: "Grade A", value: gc.A },
    { name: "Grade B", value: gc.B },
    { name: "Grade C", value: gc.C },
  ];
  const donutColors = ["#10b981", "#f59e0b", "#ef4444"];

  // ── Custom scatter dot ────────────────────────────────────────────────────────
  function CustomDot(props) {
    const { cx, cy, payload } = props;
    const r = Math.sqrt(Math.max(payload.z, 1)) * 0.8;
    const clampedR = Math.min(Math.max(r, 5), 20);
    return <circle cx={cx} cy={cy} r={clampedR} fill={payload.fill} fillOpacity={0.75} stroke="white" strokeWidth={1} />;
  }

  // ── Custom scatter tooltip ────────────────────────────────────────────────────
  function ScatterTooltip({ active, payload }) {
    if (!active || !payload || !payload[0]) return null;
    const d = payload[0].payload;
    return (
      <div style={{
        background: "white", border: "1px solid #e2e8f0",
        borderRadius: "6px", padding: "8px 12px", fontSize: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}>
        <div style={{ fontWeight: "700", marginBottom: "4px" }}>{d.name}</div>
        <div>Margin: {PCT(d.x)}</div>
        <div>Sales: {INR(d.y)}</div>
        <div>Grade: <span style={{ color: gradeColor[d.grade], fontWeight: 700 }}>{d.grade}</span></div>
      </div>
    );
  }

  return (
    <div>
      {/* KPI cards */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <KPICard label="Grade A Items"    value={String(gc.A)}
          sub={tot > 0 ? `${(gc.A / tot * 100).toFixed(0)}% of total` : ""} accent="#10b981" />
        <KPICard label="Grade B Items"    value={String(gc.B)}
          sub={tot > 0 ? `${(gc.B / tot * 100).toFixed(0)}% of total` : ""} accent="#f59e0b" />
        <KPICard label="Grade C Items"    value={String(gc.C)}
          sub={tot > 0 ? `${(gc.C / tot * 100).toFixed(0)}% of total` : ""} accent="#ef4444" />
        <KPICard label="Graded Products"  value={String(tot)}  accent="#3b82f6" />
        <KPICard label="Critical Items"   value={String(criticalCount)}
          sub="Low Sales + Low Margin" accent="#ef4444" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "60fr 40fr", gap: "16px", marginBottom: "16px" }}>

        {/* Chart 1 — Quadrant scatter */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Sales vs Margin Quadrant</div>
          {!hasCostData ? (
            <div style={{
              background: "#fffbeb", border: "1px solid #fcd34d",
              borderRadius: "8px", margin: "12px 16px 16px",
              padding: "10px 14px", fontSize: "12px", color: "#92400e",
            }}>
              ⚠ cost_price required for quadrant chart
            </div>
          ) : (
            <div style={{ position: "relative", padding: "8px 16px 16px" }}>
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="x" type="number" domain={[0, 60]} name="Margin %"
                    tick={{ fontSize: 11, fill: "#94a3b8" }} label={{ value: "Margin %", position: "insideBottom", offset: -10, fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis dataKey="y" type="number" name="Sales ₹"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <ZAxis dataKey="z" range={[40, 300]} />
                  <Tooltip content={<ScatterTooltip />} />
                  <Scatter data={scatterData} shape={<CustomDot />} />
                </ScatterChart>
              </ResponsiveContainer>
              {/* Quadrant divider lines — overlaid absolutely */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                pointerEvents: "none",
              }}>
                {/* vertical line at margin=25 — approx 25/60 = 41.7% from left */}
                <div style={{
                  position: "absolute",
                  left: `calc(16px + (100% - 36px) * ${25 / 60})`,
                  top: "18px", bottom: "46px",
                  width: "1px", background: "#e2e8f0",
                  borderLeft: "1px dashed #cbd5e1",
                }} />
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "8px" }}>
                {["A", "B", "C"].map(g => (
                  <span key={g} style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: gradeColor[g], display: "inline-block" }} />
                    Grade {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chart 2 — Donut */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Grade Distribution</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={donutData} dataKey="value" nameKey="name"
                innerRadius={60} outerRadius={95} paddingAngle={2}
              >
                {donutData.map((_, i) => (
                  <Cell key={i} fill={donutColors[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{
                fontSize: 12, borderRadius: 6,
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", marginTop: "-36px", paddingBottom: "16px" }}>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", fontFamily: "'Space Mono',monospace" }}>
              {tot}
            </div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>products</div>
          </div>
        </div>
      </div>

      {/* Table 1 — Product Matrix Analysis */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 8px" }}>
          <span style={sectionTitle}>Product Matrix Analysis</span>
          <button
            onClick={() => exportCSV("matrix_analysis.csv",
              ["Product","Section","Sales ₹","Margin %","STR","Avg Bill ₹","Sales","Margin","AVB","Insight","Priority"],
              t1Sorted.map(r => [
                r.product, r.section, Math.round(r.salesVal),
                r.marginPct != null ? r.marginPct.toFixed(1) : "—",
                r.str.toFixed(2), Math.round(r.avgBillVal),
                r.highSales ? "High" : "Low",
                r.marginPct != null ? (r.highMargin ? "High" : "Low") : "—",
                r.highAVB ? "High" : "Low",
                r.insight, r.priority,
              ])
            )}
            style={{
              fontSize: "11px", background: "#f8fafc",
              border: "1px solid #e2e8f0", borderRadius: "5px",
              padding: "4px 10px", cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
            }}
          >Export CSV</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  ["product","Product","left"], ["section","Section","left"],
                  ["salesVal","Sales ₹","right"], ["marginPct","Margin %","right"],
                  ["str","STR","right"], ["avgBillVal","Avg Bill ₹","right"],
                  ["highSales","Sales","center"], ["highMargin","Margin","center"],
                  ["highAVB","AVB","center"], ["insight","Insight","left"],
                  ["priority","Priority","left"],
                ].map(([key, label, align]) => (
                  <th key={key} style={TH(align)} onClick={() => t1Toggle(key)}>
                    {label}{t1Arrow(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t1Rows.map((r, i) => (
                <tr key={r.product} style={stripe(i)}>
                  <td style={{ ...TD("left"), fontWeight: 500 }}>{r.product}</td>
                  <td style={TD("left")}>{r.section}</td>
                  <td style={TD()}>{INR(r.salesVal)}</td>
                  <td style={TD()}>{r.marginPct != null ? PCT(r.marginPct) : "—"}</td>
                  <td style={TD()}>{r.str.toFixed(2)}</td>
                  <td style={TD()}>{INR(r.avgBillVal)}</td>
                  <td style={{ ...TD("center") }}><Pill high={r.highSales} /></td>
                  <td style={{ ...TD("center") }}>
                    {r.marginPct != null ? <Pill high={r.highMargin} /> : <span style={{ color: "#94a3b8" }}>—</span>}
                  </td>
                  <td style={{ ...TD("center") }}><Pill high={r.highAVB} /></td>
                  <td style={{ ...TD("left"), fontSize: "11px", color: "#475569", maxWidth: "220px" }}>{r.insight}</td>
                  <td style={{ ...TD("left"), fontWeight: 600, color: priorityColor(r.priority) }}>{r.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "10px 16px", justifyContent: "flex-end",
          fontSize: "12px", color: "#64748b",
        }}>
          {PAG(t1Page === 0, () => setT1Page(0), "««")}
          {PAG(t1Page === 0, () => setT1Page(p => p - 1), "‹ Prev")}
          <span>Page {t1Page + 1} of {t1Pages} ({t1Sorted.length} rows)</span>
          {PAG(t1Page >= t1Pages - 1, () => setT1Page(p => p + 1), "Next ›")}
          {PAG(t1Page >= t1Pages - 1, () => setT1Page(t1Pages - 1), "»»")}
        </div>
      </div>

      {/* Tables 2 & 3 side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Table 2 — Product Grade */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Product Grade</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[["product","Product","left"],["section","Section","left"],
                    ["salesVal","Total Sales ₹","right"],["score","Score","right"],
                    ["grade","Grade","center"],
                  ].map(([key, label, align]) => (
                    <th key={key} style={TH(align)} onClick={() => t2Toggle(key)}>
                      {label}{t2Arrow(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t2Sorted.map((r, i) => (
                  <tr key={r.product} style={stripe(i)}>
                    <td style={{ ...TD("left"), fontWeight: 500 }}>{r.product}</td>
                    <td style={TD("left")}>{r.section}</td>
                    <td style={TD()}>{INR(r.salesVal)}</td>
                    <td style={TD()}>{r.score.toFixed(1)}</td>
                    <td style={{ ...TD("center") }}><GradeBadge grade={r.grade} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 3 — Supplier Grade */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Supplier Grade</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[["name","Supplier","left"],["totalSales","Total Sales ₹","right"],
                    ["products","Products","right"],["avgScore","Avg Score","right"],
                    ["grade","Grade","center"],
                  ].map(([key, label, align]) => (
                    <th key={key} style={TH(align)} onClick={() => t3Toggle(key)}>
                      {label}{t3Arrow(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t3Sorted.map((r, i) => (
                  <tr key={r.name} style={stripe(i)}>
                    <td style={{ ...TD("left"), fontWeight: 500 }}>{r.name}</td>
                    <td style={TD()}>{INR(r.totalSales)}</td>
                    <td style={TD()}>{r.products}</td>
                    <td style={TD()}>{r.avgScore.toFixed(1)}</td>
                    <td style={{ ...TD("center") }}><GradeBadge grade={r.grade} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
//  PAGE 05 ── Old Stock · Supplier Full (shell — built in Step 09)
//  All calculations LOCAL. Zero sharing with other pages.
// ══════════════════════════════════════════════════════════════════════════════
function Page05_OldStockSupplier({ storeData, filters }) {
  const { sales, stock, config } = filterData(storeData, filters);

  // ── local style tokens ────────────────────────────────────────────────────
  const INR = v => `₹${Math.round(v).toLocaleString("en-IN")}`;
  const PCT = v => `${v.toFixed(1)}%`;
  const TH = (a = "right") => ({
    padding: "9px 14px", fontSize: "10px", color: "#64748b",
    fontWeight: "700", letterSpacing: "0.4px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc", textAlign: a, whiteSpace: "nowrap",
    cursor: "pointer", userSelect: "none",
  });
  const TD = (a = "right") => ({
    padding: "9px 14px", fontSize: "12px", color: "#1e293b",
    textAlign: a, fontFamily: "'Space Mono',monospace",
  });
  const stripe = i => ({
    borderBottom: "1px solid #f8fafc",
    background: i % 2 ? "#fafafa" : "white",
  });
  const cardStyle = {
    background: "white",
    borderRadius: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
    marginBottom: "16px",
    overflow: "hidden",
  };
  const sectionTitle = {
    fontSize: "12px", fontWeight: "700", color: "#64748b",
    textTransform: "uppercase", letterSpacing: "0.6px",
    padding: "14px 16px 8px",
  };

  // ── old stock identification ───────────────────────────────────────────────
  const now = new Date();
  const thr = config.old_stock_threshold_days;

  const oldProducts = useMemo(() => {
    const s = new Set();
    stock.forEach(r => {
      if (r.entry_date && (now - new Date(r.entry_date)) / 86400000 > thr)
        s.add(r.product);
    });
    return s;
  }, [stock, thr]);

  // ── sales splits ──────────────────────────────────────────────────────────
  const totalSalesVal = useMemo(() =>
    sales.reduce((s, r) => s + r.net_amount, 0), [sales]);
  const oldSalesVal = useMemo(() =>
    sales.filter(r => oldProducts.has(r.product)).reduce((s, r) => s + r.net_amount, 0),
    [sales, oldProducts]);
  const newSalesVal = totalSalesVal - oldSalesVal;
  const oldSalesPct = totalSalesVal > 0 ? oldSalesVal / totalSalesVal * 100 : 0;
  const supplierCount = useMemo(() =>
    new Set(sales.map(r => r.supplier).filter(Boolean)).size, [sales]);

  // ── section-wise ──────────────────────────────────────────────────────────
  const sectionData = useMemo(() => {
    const m = {};
    sales.forEach(r => {
      if (!m[r.section]) m[r.section] = { total: 0, old: 0 };
      m[r.section].total += r.net_amount;
      if (oldProducts.has(r.product)) m[r.section].old += r.net_amount;
    });
    return Object.entries(m).map(([sec, d]) => ({
      sec, total: d.total, old: d.old,
      pct: d.total > 0 ? d.old / d.total * 100 : 0,
    }));
  }, [sales, oldProducts]);

  // ── section sort state ────────────────────────────────────────────────────
  const [s1Key, setS1Key] = useState("pct");
  const [s1Dir, setS1Dir] = useState("desc");
  const toggleS1 = col => {
    if (s1Key === col) setS1Dir(d => d === "asc" ? "desc" : "asc");
    else { setS1Key(col); setS1Dir("desc"); }
  };
  const s1Arr = col => s1Key === col ? (s1Dir === "asc" ? " ↑" : " ↓") : "";
  const sortedSection = useMemo(() => {
    return [...sectionData].sort((a, b) => {
      const av = a[s1Key], bv = b[s1Key];
      if (typeof av === "string") return s1Dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return s1Dir === "asc" ? av - bv : bv - av;
    });
  }, [sectionData, s1Key, s1Dir]);

  // ── product-wise (top 20) ─────────────────────────────────────────────────
  const productData = useMemo(() => {
    const m = {};
    sales.forEach(r => {
      const k = r.product + "||" + r.section;
      if (!m[k]) m[k] = { product: r.product, section: r.section, total: 0, old: 0 };
      m[k].total += r.net_amount;
      if (oldProducts.has(r.product)) m[k].old += r.net_amount;
    });
    return Object.values(m).map(d => ({
      ...d, pct: d.total > 0 ? d.old / d.total * 100 : 0,
    })).sort((a, b) => b.pct - a.pct).slice(0, 20);
  }, [sales, oldProducts]);

  // ── product sort + pagination ─────────────────────────────────────────────
  const [p2Key, setP2Key] = useState("pct");
  const [p2Dir, setP2Dir] = useState("desc");
  const [p2Page, setP2Page] = useState(0);
  const P2_SIZE = 15;
  const toggleP2 = col => {
    if (p2Key === col) setP2Dir(d => d === "asc" ? "desc" : "asc");
    else { setP2Key(col); setP2Dir("desc"); }
    setP2Page(0);
  };
  const p2Arr = col => p2Key === col ? (p2Dir === "asc" ? " ↑" : " ↓") : "";
  const sortedProduct = useMemo(() => {
    return [...productData].sort((a, b) => {
      const av = a[p2Key], bv = b[p2Key];
      if (typeof av === "string") return p2Dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return p2Dir === "asc" ? av - bv : bv - av;
    });
  }, [productData, p2Key, p2Dir]);
  const p2Pages = Math.ceil(sortedProduct.length / P2_SIZE);
  const p2Visible = sortedProduct.slice(p2Page * P2_SIZE, p2Page * P2_SIZE + P2_SIZE);

  // ── supplier-wise ─────────────────────────────────────────────────────────
  const supplierData = useMemo(() => {
    const m = {};
    sales.forEach(r => {
      const sup = r.supplier || "Unknown";
      if (!m[sup]) m[sup] = { totalSales: 0, oldSales: 0, stockVal: 0, oldStockVal: 0 };
      m[sup].totalSales += r.net_amount;
      if (oldProducts.has(r.product)) m[sup].oldSales += r.net_amount;
    });
    stock.forEach(r => {
      const sup = r.supplier || "Unknown";
      if (!m[sup]) m[sup] = { totalSales: 0, oldSales: 0, stockVal: 0, oldStockVal: 0 };
      m[sup].stockVal += r.stock_value;
      if (r.entry_date && (now - new Date(r.entry_date)) / 86400000 > thr)
        m[sup].oldStockVal += r.stock_value;
    });
    const maxSales = Math.max(...Object.values(m).map(d => d.totalSales), 1);
    return Object.entries(m).map(([sup, d]) => {
      const score = (d.totalSales / maxSales) * 100;
      const grade = score >= config.grade_rules.A.min_score ? "A"
        : score >= config.grade_rules.B.min_score ? "B" : "C";
      const oldSalePct = d.totalSales > 0 ? d.oldSales / d.totalSales * 100 : 0;
      const oldStockPct = d.stockVal > 0 ? d.oldStockVal / d.stockVal * 100 : 0;
      return {
        sup, totalSales: d.totalSales, oldSales: d.oldSales, oldSalePct,
        stockVal: d.stockVal, oldStockVal: d.oldStockVal, oldStockPct, grade
      };
    });
  }, [sales, stock, oldProducts, thr, config]);

  const topSupplier = useMemo(() => {
    if (!supplierData.length) return "—";
    return [...supplierData].sort((a, b) => b.totalSales - a.totalSales)[0].sup;
  }, [supplierData]);

  // ── supplier sort + pagination ────────────────────────────────────────────
  const [s3Key, setS3Key] = useState("totalSales");
  const [s3Dir, setS3Dir] = useState("desc");
  const [s3Page, setS3Page] = useState(0);
  const S3_SIZE = 15;
  const toggleS3 = col => {
    if (s3Key === col) setS3Dir(d => d === "asc" ? "desc" : "asc");
    else { setS3Key(col); setS3Dir("desc"); }
    setS3Page(0);
  };
  const s3Arr = col => s3Key === col ? (s3Dir === "asc" ? " ↑" : " ↓") : "";
  const sortedSupplier = useMemo(() => {
    return [...supplierData].sort((a, b) => {
      const av = a[s3Key], bv = b[s3Key];
      if (typeof av === "string") return s3Dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return s3Dir === "asc" ? av - bv : bv - av;
    });
  }, [supplierData, s3Key, s3Dir]);
  const s3Pages = Math.ceil(sortedSupplier.length / S3_SIZE);
  const s3Visible = sortedSupplier.slice(s3Page * S3_SIZE, s3Page * S3_SIZE + S3_SIZE);

  // ── employee-wise (conditional) ───────────────────────────────────────────
  const hasSalesman = useMemo(() => sales.some(r => r.salesman), [sales]);
  const employeeData = useMemo(() => {
    if (!hasSalesman) return [];
    const m = {};
    sales.forEach(r => {
      const name = r.salesman || "Unknown";
      if (!m[name]) m[name] = { totalSales: 0, bills: new Set(), oldSales: 0 };
      m[name].totalSales += r.net_amount;
      m[name].bills.add(r.bill_no);
      if (oldProducts.has(r.product)) m[name].oldSales += r.net_amount;
    });
    return Object.entries(m).map(([name, d]) => ({
      name, totalSales: d.totalSales,
      bills: d.bills.size,
      avgBill: d.bills.size > 0 ? d.totalSales / d.bills.size : 0,
      oldSales: d.oldSales,
      oldSalesPct: d.totalSales > 0 ? d.oldSales / d.totalSales * 100 : 0,
    })).sort((a, b) => b.totalSales - a.totalSales);
  }, [sales, oldProducts, hasSalesman]);

  // ── supplier bar chart: top 10 by stock value ─────────────────────────────
  const supplierBarData = useMemo(() =>
    [...supplierData]
      .sort((a, b) => b.stockVal - a.stockVal)
      .slice(0, 10)
      .map(r => ({
        name: r.sup.length > 12 ? r.sup.slice(0, 12) + "…" : r.sup,
        pct: parseFloat(r.oldStockPct.toFixed(1)),
        fill: r.oldStockPct > 60 ? "#ef4444" : r.oldStockPct >= 40 ? "#f59e0b" : "#10b981",
      }))
    , [supplierData]);

  // ── helpers ────────────────────────────────────────────────────────────────
  const oldPctColor = pct =>
    pct > 40 ? "#dc2626" : pct >= 20 ? "#d97706" : "#15803d";

  const GRADE_BG = { A: "#dcfce7", B: "#fef9c3", C: "#fee2e2" };
  const GRADE_TXT = { A: "#15803d", B: "#854d0e", C: "#dc2626" };
  const GradeBadge = ({ g }) => (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: "99px",
      fontSize: "11px", fontWeight: "700", fontFamily: "'Outfit',sans-serif",
      background: GRADE_BG[g], color: GRADE_TXT[g],
    }}>{g}</span>
  );

  const PAG_BTN = (disabled, onClick, label) => (
    <button disabled={disabled} onClick={onClick} style={{
      border: "1px solid #e2e8f0", borderRadius: "5px", padding: "3px 10px",
      background: "white", cursor: disabled ? "not-allowed" : "pointer",
      fontSize: "12px", color: "#64748b", opacity: disabled ? 0.4 : 1,
    }}>{label}</button>
  );

  const TOOLTIP_STYLE = {
    fontSize: 12, borderRadius: 6,
    border: "1px solid #e2e8f0",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  };

  const donutData = [
    { name: "Old Stock Sales", value: oldSalesVal },
    { name: "New Stock Sales", value: newSalesVal },
  ];
  const DONUT_COLORS = ["#ef4444", "#10b981"];

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <KPICard label="Total Sales" value={INR(totalSalesVal)} accent="#3b82f6" />
        <KPICard label="Old Stock Sales" value={INR(oldSalesVal)} accent="#f59e0b" />
        <KPICard label="Old Stock Sale %" value={totalSalesVal > 0 ? PCT(oldSalesPct) : "—"} accent="#ef4444" />
        <KPICard label="Suppliers" value={String(supplierCount)} accent="#8b5cf6" />
        <KPICard label="Top Supplier" value={topSupplier} accent="#06b6d4" />
      </div>

      {/* Charts Row: 40/60 */}
      <div style={{ display: "grid", gridTemplateColumns: "40fr 60fr", gap: "16px", marginBottom: "16px" }}>

        {/* Chart 1 — Old vs New Donut */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Old vs New Stock Sales</div>
          <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={95}
                  paddingAngle={3} dataKey="value"
                >
                  {donutData.map((entry, i) => (
                    <Cell key={entry.name} fill={DONUT_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [INR(v)]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label overlay */}
            <div style={{
              fontFamily: "'Space Mono',monospace", fontSize: "18px", fontWeight: "700",
              color: "#ef4444", marginTop: "-52px", pointerEvents: "none",
            }}>
              {PCT(oldSalesPct)}
            </div>
          </div>
        </div>

        {/* Chart 2 — Old Stock % by Supplier Bar */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Old Stock % by Supplier (Top 10 by Stock Value)</div>
          <div style={{ padding: "0 16px 16px" }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={supplierBarData} margin={{ top: 20, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={v => [`${v}%`, "Old Stock %"]} />
                <Bar dataKey="pct" name="Old Stock %" radius={[4, 4, 0, 0]}>
                  {supplierBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="pct" position="top"
                    formatter={v => `${v}%`}
                    style={{ fontSize: "10px", fill: "#475569", fontWeight: "600" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table 1 — Section-wise Old Stock Sale % */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Section-wise Old Stock Sale %</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  { key: "sec", label: "Section", a: "left" },
                  { key: "total", label: "Total Sales ₹", a: "right" },
                  { key: "old", label: "Old Stock Sales ₹", a: "right" },
                  { key: "pct", label: "Old Stock Sale %", a: "right" },
                ].map(({ key, label, a }) => (
                  <th key={key} style={TH(a)} onClick={() => toggleS1(key)}>
                    {label}{s1Arr(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedSection.map((r, i) => (
                <tr key={r.sec} style={stripe(i)}>
                  <td style={{ ...TD("left"), fontWeight: "500" }}>{r.sec}</td>
                  <td style={TD()}>{INR(r.total)}</td>
                  <td style={TD()}>{INR(r.old)}</td>
                  <td style={{ ...TD(), fontWeight: "700", color: oldPctColor(r.pct) }}>
                    {PCT(r.pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2 — Product-wise Old Stock Sale % (top 20) */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Product-wise Old Stock Sale % (Top 20)</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  { key: "product", label: "Product", a: "left" },
                  { key: "section", label: "Section", a: "left" },
                  { key: "total", label: "Total Sales ₹", a: "right" },
                  { key: "old", label: "Old Stock Sales ₹", a: "right" },
                  { key: "pct", label: "Old Stock Sale %", a: "right" },
                ].map(({ key, label, a }) => (
                  <th key={key} style={TH(a)} onClick={() => toggleP2(key)}>
                    {label}{p2Arr(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p2Visible.map((r, i) => (
                <tr key={r.product + r.section} style={stripe(i)}>
                  <td style={{ ...TD("left"), fontWeight: "500" }}>{r.product}</td>
                  <td style={{ ...TD("left"), color: "#94a3b8", fontSize: "11px" }}>{r.section}</td>
                  <td style={TD()}>{INR(r.total)}</td>
                  <td style={TD()}>{INR(r.old)}</td>
                  <td style={{ ...TD(), fontWeight: "700", color: oldPctColor(r.pct) }}>
                    {PCT(r.pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {p2Pages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px",
            justifyContent: "flex-end", fontSize: "12px", color: "#64748b"
          }}>
            {PAG_BTN(p2Page === 0, () => setP2Page(p => p - 1), "‹ Prev")}
            <span>Page {p2Page + 1} of {p2Pages}</span>
            {PAG_BTN(p2Page >= p2Pages - 1, () => setP2Page(p => p + 1), "Next ›")}
          </div>
        )}
      </div>

      {/* Table 3 — Supplier Full Analysis */}
      <div style={cardStyle}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px 8px",
        }}>
          <div style={sectionTitle}>Supplier Full Analysis</div>
          <button
            onClick={() => exportCSV(
              "supplier_analysis.csv",
              ["Supplier", "Total Sales ₹", "Old Stock Sales ₹", "Old Sale %",
                "Stock Value ₹", "Old Stock Value ₹", "Old Stock %", "Grade"],
              sortedSupplier.map(r => [
                r.sup,
                Math.round(r.totalSales),
                Math.round(r.oldSales),
                r.oldSalePct.toFixed(1) + "%",
                Math.round(r.stockVal),
                Math.round(r.oldStockVal),
                r.oldStockPct.toFixed(1) + "%",
                r.grade,
              ])
            )}
            style={{
              fontSize: "11px", background: "#f8fafc",
              border: "1px solid #e2e8f0", borderRadius: "5px",
              padding: "4px 10px", cursor: "pointer",
              fontFamily: "'Outfit',sans-serif", color: "#64748b",
            }}
          >⬇ Export CSV</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  { key: "sup", label: "Supplier", a: "left" },
                  { key: "totalSales", label: "Total Sales ₹", a: "right" },
                  { key: "oldSales", label: "Old Stock Sales ₹", a: "right" },
                  { key: "oldSalePct", label: "Old Stock Sale %", a: "right" },
                  { key: "stockVal", label: "Stock Value ₹", a: "right" },
                  { key: "oldStockVal", label: "Old Stock Value ₹", a: "right" },
                  { key: "oldStockPct", label: "Old Stock %", a: "right" },
                  { key: "grade", label: "Grade", a: "center" },
                ].map(({ key, label, a }) => (
                  <th key={key} style={TH(a)} onClick={() => toggleS3(key)}>
                    {label}{s3Arr(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s3Visible.map((r, i) => (
                <tr key={r.sup} style={stripe(i)}>
                  <td style={{ ...TD("left"), fontWeight: "500" }}>{r.sup}</td>
                  <td style={TD()}>{INR(r.totalSales)}</td>
                  <td style={TD()}>{INR(r.oldSales)}</td>
                  <td style={{ ...TD(), fontWeight: "700", color: oldPctColor(r.oldSalePct) }}>
                    {PCT(r.oldSalePct)}
                  </td>
                  <td style={TD()}>{INR(r.stockVal)}</td>
                  <td style={TD()}>{INR(r.oldStockVal)}</td>
                  <td style={{ ...TD(), fontWeight: "700", color: oldPctColor(r.oldStockPct) }}>
                    {PCT(r.oldStockPct)}
                  </td>
                  <td style={{ ...TD("center") }}>
                    <GradeBadge g={r.grade} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {s3Pages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px",
            justifyContent: "flex-end", fontSize: "12px", color: "#64748b"
          }}>
            {PAG_BTN(s3Page === 0, () => setS3Page(p => p - 1), "‹ Prev")}
            <span>Page {s3Page + 1} of {s3Pages}</span>
            {PAG_BTN(s3Page >= s3Pages - 1, () => setS3Page(p => p + 1), "Next ›")}
          </div>
        )}
      </div>

      {/* Table 4 — Employee Sales (conditional) */}
      {hasSalesman && (
        <div style={cardStyle}>
          <div style={sectionTitle}>Employee Sales</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    { label: "Salesman", a: "left" },
                    { label: "Total Sales ₹", a: "right" },
                    { label: "Bills", a: "right" },
                    { label: "Avg Bill ₹", a: "right" },
                    { label: "Old Stock Sales ₹", a: "right" },
                    { label: "Old Stock Sale %", a: "right" },
                  ].map(({ label, a }) => (
                    <th key={label} style={TH(a)}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employeeData.map((r, i) => (
                  <tr key={r.name} style={stripe(i)}>
                    <td style={{ ...TD("left"), fontWeight: "500" }}>{r.name}</td>
                    <td style={TD()}>{INR(r.totalSales)}</td>
                    <td style={TD()}>{r.bills}</td>
                    <td style={TD()}>{INR(r.avgBill)}</td>
                    <td style={TD()}>{INR(r.oldSales)}</td>
                    <td style={{ ...TD(), fontWeight: "700", color: oldPctColor(r.oldSalesPct) }}>
                      {PCT(r.oldSalesPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
//  PAGE 06 ── YoY Comparison + Monthly  (shell — built in Step 10)
//  All calculations LOCAL. Zero sharing with other pages.
// ══════════════════════════════════════════════════════════════════════════════
function Page06_YoYMonthly({ storeData, filters }) {
  const { sales, stock, config } = filterData(storeData, filters);

  // ── local style tokens ────────────────────────────────────────────────────
  const INR = v => `₹${Math.round(v).toLocaleString("en-IN")}`;
  const PCT = v => `${v.toFixed(1)}%`;
  const TH = (a = "right") => ({
    padding: "9px 14px", fontSize: "10px", color: "#64748b",
    fontWeight: "700", letterSpacing: "0.4px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc", textAlign: a, whiteSpace: "nowrap",
    cursor: "pointer", userSelect: "none",
  });
  const TD = (a = "right") => ({
    padding: "9px 14px", fontSize: "12px", color: "#1e293b",
    textAlign: a, fontFamily: "'Space Mono',monospace",
  });
  const stripe = i => ({
    borderBottom: "1px solid #f8fafc",
    background: i % 2 ? "#fafafa" : "white",
  });
  const cardStyle = {
    background: "white", borderRadius: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
    marginBottom: "16px", overflow: "hidden",
  };
  const sectionTitle = {
    fontSize: "12px", fontWeight: "700", color: "#64748b",
    textTransform: "uppercase", letterSpacing: "0.6px",
    padding: "14px 16px 8px",
  };
  const INPUT_STYLE = {
    height: "28px", padding: "0 8px",
    border: "1px solid #e2e8f0", borderRadius: "5px",
    fontSize: "12px", background: "white",
    color: "#1e293b", outline: "none",
    fontFamily: "'Space Mono',monospace",
  };
  const LBL = {
    display: "block", fontSize: "9px", color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.7px",
    fontWeight: "700", marginBottom: "3px",
  };
  const READONLY_INPUT = {
    ...INPUT_STYLE,
    background: "#f8fafc", color: "#94a3b8", cursor: "not-allowed",
  };
  const TOOLTIP_STYLE = {
    fontSize: 12, borderRadius: 6,
    border: "1px solid #e2e8f0",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  };

  // ── local date pickers ────────────────────────────────────────────────────
  const [cyFrom, setCyFrom] = useState(config.report_period.from);
  const [cyTo, setCyTo] = useState(config.report_period.to);
  const cyYear = new Date(cyTo).getFullYear();
  const pyFrom = `${cyYear - 1}-01-01`;
  const pyTo = `${cyYear - 1}-12-31`;

  // ── CY / PY sales split ───────────────────────────────────────────────────
  const cySales = useMemo(() =>
    sales.filter(r => r.bill_date >= cyFrom && r.bill_date <= cyTo),
    [sales, cyFrom, cyTo]);
  const pySales = useMemo(() =>
    sales.filter(r => r.bill_date >= pyFrom && r.bill_date <= pyTo),
    [sales, pyFrom, pyTo]);

  const cyTotal = useMemo(() =>
    cySales.reduce((s, r) => s + r.net_amount, 0), [cySales]);
  const pyTotal = useMemo(() =>
    pySales.reduce((s, r) => s + r.net_amount, 0), [pySales]);
  const growth = pyTotal > 0 ? (cyTotal - pyTotal) / pyTotal * 100 : null;

  // ── monthly CY data ───────────────────────────────────────────────────────
  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const cyMonthMap = useMemo(() => {
    const m = {};
    cySales.forEach(r => {
      const k = r.bill_date.slice(0, 7);
      if (!m[k]) m[k] = { sales: 0, cogs: 0, hasCost: false, qty: 0, bills: new Set() };
      m[k].sales += r.net_amount;
      m[k].qty += r.net_qty;
      m[k].bills.add(r.bill_no);
      if (r.cost_price != null) {
        m[k].cogs += r.cost_price * r.net_qty;
        m[k].hasCost = true;
      }
    });
    return m;
  }, [cySales]);

  const monthRows = useMemo(() => {
    return Object.keys(cyMonthMap).sort().map(k => {
      const d = cyMonthMap[k];
      const margin = d.hasCost && d.sales > 0
        ? (d.sales - d.cogs) / d.sales * 100 : null;
      const [yr, mo] = k.split("-");
      return {
        key: k,
        label: `${MONTH_LABELS[parseInt(mo, 10) - 1]} ${yr}`,
        sales: d.sales,
        cogs: d.hasCost ? d.cogs : null,
        margin,
        qty: d.qty,
        bills: d.bills.size,
      };
    });
  }, [cyMonthMap]);

  const hasCostAny = useMemo(() => cySales.some(r => r.cost_price != null), [cySales]);

  const cyMargin = useMemo(() => {
    if (!hasCostAny) return null;
    const totalCogs = cySales.filter(r => r.cost_price != null)
      .reduce((s, r) => s + r.cost_price * r.net_qty, 0);
    return cyTotal > 0 ? (cyTotal - totalCogs) / cyTotal * 100 : null;
  }, [cySales, cyTotal, hasCostAny]);

  const pyMargin = useMemo(() => {
    if (!pySales.some(r => r.cost_price != null)) return null;
    const pyTotalVal = pySales.reduce((s, r) => s + r.net_amount, 0);
    const totalCogs = pySales.filter(r => r.cost_price != null)
      .reduce((s, r) => s + r.cost_price * r.net_qty, 0);
    return pyTotalVal > 0 ? (pyTotalVal - totalCogs) / pyTotalVal * 100 : null;
  }, [pySales]);

  const marginDelta = cyMargin != null && pyMargin != null
    ? cyMargin - pyMargin : null;

  const avgMonthly = monthRows.length > 0
    ? monthRows.reduce((s, r) => s + r.sales, 0) / monthRows.length : 0;

  // month totals for pinned Total row
  const monthTotals = useMemo(() => ({
    sales: monthRows.reduce((s, r) => s + r.sales, 0),
    cogs: hasCostAny ? monthRows.reduce((s, r) => s + (r.cogs ?? 0), 0) : null,
    margin: cyMargin,
    qty: monthRows.reduce((s, r) => s + r.qty, 0),
    bills: monthRows.reduce((s, r) => s + r.bills, 0),
  }), [monthRows, hasCostAny, cyMargin]);

  // ── monthly PY data (for chart) ───────────────────────────────────────────
  const pyMonthMap = useMemo(() => {
    const m = {};
    pySales.forEach(r => {
      const mo = parseInt(r.bill_date.slice(5, 7), 10) - 1;
      const lbl = MONTH_LABELS[mo];
      m[lbl] = (m[lbl] ?? 0) + r.net_amount;
    });
    return m;
  }, [pySales]);

  const cyMonthLabelMap = useMemo(() => {
    const m = {};
    Object.keys(cyMonthMap).forEach(k => {
      const lbl = MONTH_LABELS[parseInt(k.slice(5, 7), 10) - 1];
      m[lbl] = (m[lbl] ?? 0) + cyMonthMap[k].sales;
    });
    return m;
  }, [cyMonthMap]);

  const barChartData = useMemo(() => {
    return MONTH_LABELS
      .filter(lbl => (cyMonthLabelMap[lbl] ?? 0) > 0 || (pyMonthMap[lbl] ?? 0) > 0)
      .map(lbl => ({
        month: lbl,
        "CY Sales": cyMonthLabelMap[lbl] ?? 0,
        "PY Sales": pyMonthMap[lbl] ?? 0,
      }));
  }, [cyMonthLabelMap, pyMonthMap]);

  const lineChartData = useMemo(() => {
    return MONTH_LABELS
      .filter(lbl => (cyMonthLabelMap[lbl] ?? 0) > 0 || (pyMonthMap[lbl] ?? 0) > 0)
      .map(lbl => ({
        month: lbl,
        CY: cyMonthLabelMap[lbl] ?? null,
        PY: pyMonthMap[lbl] ?? null,
      }));
  }, [cyMonthLabelMap, pyMonthMap]);

  // ── section × range YoY deviation ────────────────────────────────────────
  const getRange = sp => {
    for (const [lo, hi] of config.price_ranges)
      if (sp >= lo && sp <= hi) return `₹${lo.toLocaleString()}–${hi.toLocaleString()}`;
    return "Other";
  };

  const yoyRawData = useMemo(() => {
    const m = {};
    const key = (sec, rng) => sec + "||" + rng;
    cySales.forEach(r => {
      const k = key(r.section, getRange(r.selling_price));
      if (!m[k]) m[k] = { section: r.section, range: getRange(r.selling_price), cy: 0, py: 0 };
      m[k].cy += r.net_amount;
    });
    pySales.forEach(r => {
      const k = key(r.section, getRange(r.selling_price));
      if (!m[k]) m[k] = { section: r.section, range: getRange(r.selling_price), cy: 0, py: 0 };
      m[k].py += r.net_amount;
    });
    return Object.values(m).map(d => ({
      ...d,
      dev: d.cy - d.py,
      growth: d.py > 0 ? (d.cy - d.py) / d.py * 100 : null,
    }));
  }, [cySales, pySales, config]);

  // ── YoY sort + pagination ─────────────────────────────────────────────────
  const [yoyKey, setYoyKey] = useState("cy");
  const [yoyDir, setYoyDir] = useState("desc");
  const [yoyPage, setYoyPage] = useState(0);
  const YOY_SIZE = 15;

  const toggleYoy = col => {
    if (yoyKey === col) setYoyDir(d => d === "asc" ? "desc" : "asc");
    else { setYoyKey(col); setYoyDir("desc"); }
    setYoyPage(0);
  };
  const yoyArr = col => yoyKey === col ? (yoyDir === "asc" ? " ↑" : " ↓") : "";

  const sortedYoy = useMemo(() => {
    return [...yoyRawData].sort((a, b) => {
      const av = a[yoyKey] ?? -Infinity;
      const bv = b[yoyKey] ?? -Infinity;
      if (typeof av === "string") return yoyDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return yoyDir === "asc" ? av - bv : bv - av;
    });
  }, [yoyRawData, yoyKey, yoyDir]);

  const yoyPages = Math.ceil(sortedYoy.length / YOY_SIZE);
  const yoyVisible = sortedYoy.slice(yoyPage * YOY_SIZE, yoyPage * YOY_SIZE + YOY_SIZE);

  // ── avg stock by date ─────────────────────────────────────────────────────
  const stockDateRows = useMemo(() => {
    if (!stock.some(r => r.stock_date)) return [];
    const m = {};
    stock.forEach(r => {
      if (!r.stock_date) return;
      if (!m[r.stock_date]) m[r.stock_date] = { total: 0, count: 0 };
      m[r.stock_date].total += r.stock_value;
      m[r.stock_date].count += 1;
    });
    return Object.entries(m)
      .map(([date, d]) => ({ date, avg: d.total / d.count, count: d.count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [stock]);

  // ── pagination helper button ──────────────────────────────────────────────
  const PAG_BTN = (disabled, onClick, label) => (
    <button disabled={disabled} onClick={onClick} style={{
      border: "1px solid #e2e8f0", borderRadius: "5px", padding: "3px 10px",
      background: "white", cursor: disabled ? "not-allowed" : "pointer",
      fontSize: "12px", color: "#64748b", opacity: disabled ? 0.4 : 1,
    }}>{label}</button>
  );

  return (
    <div>
      {/* CY / PY Date Picker Row */}
      <div style={{
        ...cardStyle,
        padding: "14px 16px",
        display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-end",
      }}>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={LBL}>CY From</span>
          <input type="date" style={INPUT_STYLE}
            value={cyFrom} onChange={e => setCyFrom(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={LBL}>CY To</span>
          <input type="date" style={INPUT_STYLE}
            value={cyTo} onChange={e => setCyTo(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={LBL}>PY From</span>
          <input type="text" style={READONLY_INPUT} value={pyFrom} readOnly />
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={LBL}>PY To</span>
          <input type="text" style={READONLY_INPUT} value={pyTo} readOnly />
        </label>
        <span style={{ fontSize: "11px", color: "#94a3b8", alignSelf: "flex-end", paddingBottom: "5px" }}>
          PY dates auto-calculated from CY year
        </span>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <KPICard label="CY Sales" value={INR(cyTotal)} accent="#3b82f6" />
        <KPICard label="PY Sales" value={INR(pyTotal)} sub="previous year" accent="#64748b" />
        <KPICard label="Growth %"
          value={growth !== null ? `${growth > 0 ? "+" : ""}${growth.toFixed(1)}%` : "—"}
          accent={growth != null && growth > 0 ? "#10b981" : "#ef4444"} />
        <KPICard label="Avg Monthly" value={INR(avgMonthly)} accent="#06b6d4" />
        <KPICard label="CY Margin %" value={cyMargin !== null ? PCT(cyMargin) : "—"}
          sub={!hasCostAny ? "cost_price needed" : ""} accent="#8b5cf6" />
        <KPICard label="Margin Δ"
          value={marginDelta !== null ? `${marginDelta > 0 ? "+" : ""}${marginDelta.toFixed(1)}%` : "—"}
          sub="CY vs PY"
          accent={marginDelta != null && marginDelta > 0 ? "#10b981" : "#ef4444"} />
      </div>

      {/* Chart 1 — CY vs PY Grouped Bar */}
      <div style={cardStyle}>
        <div style={sectionTitle}>CY vs PY Sales by Month</div>
        <div style={{ padding: "0 16px 16px" }}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barChartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={v => [INR(v)]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="CY Sales" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="PY Sales" fill="#94a3b8" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2 — Monthly Sales Trend Line */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Monthly Sales Trend</div>
        <div style={{ padding: "0 16px 16px" }}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={lineChartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={v => [INR(v)]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="CY" stroke="#3b82f6"
                strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6" }} connectNulls />
              <Line type="monotone" dataKey="PY" stroke="#94a3b8"
                strokeWidth={1.5} strokeDasharray="4 4"
                dot={{ r: 2, fill: "#94a3b8" }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2 Columns: Table 1 Monthly (60) + Table 3 Avg Stock (40) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: stockDateRows.length > 0 ? "60fr 40fr" : "1fr",
        gap: "16px", marginBottom: "16px",
      }}>
        {/* Table 1 — Month-wise Sales + COGS */}
        <div style={cardStyle}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px 8px",
          }}>
            <div style={sectionTitle}>Month-wise Sales + COGS</div>
            <button
              onClick={() => exportCSV(
                "monthly_sales.csv",
                ["Month", "Total Sales ₹", "Total COGS ₹", "Margin %", "Total Qty", "Bills"],
                [
                  ...monthRows.map(r => [
                    r.label,
                    Math.round(r.sales),
                    r.cogs != null ? Math.round(r.cogs) : "—",
                    r.margin != null ? r.margin.toFixed(1) + "%" : "—",
                    r.qty,
                    r.bills,
                  ]),
                  [
                    "Total",
                    Math.round(monthTotals.sales),
                    monthTotals.cogs != null ? Math.round(monthTotals.cogs) : "—",
                    monthTotals.margin != null ? monthTotals.margin.toFixed(1) + "%" : "—",
                    monthTotals.qty,
                    monthTotals.bills,
                  ],
                ]
              )}
              style={{
                fontSize: "11px", background: "#f8fafc",
                border: "1px solid #e2e8f0", borderRadius: "5px",
                padding: "4px 10px", cursor: "pointer",
                fontFamily: "'Outfit',sans-serif", color: "#64748b",
              }}
            >⬇ Export CSV</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    { label: "Month", a: "left" },
                    { label: "Total Sales ₹", a: "right" },
                    { label: "Total COGS ₹", a: "right" },
                    { label: "Margin %", a: "right" },
                    { label: "Total Qty", a: "right" },
                    { label: "Bills", a: "right" },
                  ].map(({ label, a }) => (
                    <th key={label} style={{ ...TH(a), cursor: "default" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthRows.map((r, i) => (
                  <tr key={r.key} style={stripe(i)}>
                    <td style={{ ...TD("left"), fontWeight: "500" }}>{r.label}</td>
                    <td style={TD()}>{INR(r.sales)}</td>
                    <td style={TD()}>{r.cogs != null ? INR(r.cogs) : "—"}</td>
                    <td style={TD()}>{r.margin != null ? PCT(r.margin) : "—"}</td>
                    <td style={TD()}>{r.qty.toLocaleString()}</td>
                    <td style={TD()}>{r.bills}</td>
                  </tr>
                ))}
                {/* Pinned Total Row */}
                <tr style={{
                  background: "#f8fafc", borderTop: "2px solid #e2e8f0",
                }}>
                  <td style={{ ...TD("left"), fontWeight: "700", color: "#0f172a" }}>Total</td>
                  <td style={{ ...TD(), fontWeight: "700", color: "#0f172a" }}>{INR(monthTotals.sales)}</td>
                  <td style={{ ...TD(), fontWeight: "700", color: "#0f172a" }}>
                    {monthTotals.cogs != null ? INR(monthTotals.cogs) : "—"}
                  </td>
                  <td style={{ ...TD(), fontWeight: "700", color: "#0f172a" }}>
                    {monthTotals.margin != null ? PCT(monthTotals.margin) : "—"}
                  </td>
                  <td style={{ ...TD(), fontWeight: "700", color: "#0f172a" }}>{monthTotals.qty.toLocaleString()}</td>
                  <td style={{ ...TD(), fontWeight: "700", color: "#0f172a" }}>{monthTotals.bills}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 3 — Avg Stock by Date (conditional) */}
        {stockDateRows.length > 0 && (
          <div style={cardStyle}>
            <div style={sectionTitle}>Avg Stock Value by Extract Date</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      { label: "Extract Date", a: "left" },
                      { label: "Avg Stock Value ₹", a: "right" },
                      { label: "Row Count", a: "right" },
                    ].map(({ label, a }) => (
                      <th key={label} style={{ ...TH(a), cursor: "default" }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockDateRows.map((r, i) => (
                    <tr key={r.date} style={stripe(i)}>
                      <td style={{ ...TD("left"), fontWeight: "500" }}>{r.date}</td>
                      <td style={TD()}>{INR(r.avg)}</td>
                      <td style={TD()}>{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Table 2 — Section × Range YoY Deviation */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Section × Range — YoY Deviation</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  { key: "section", label: "Section", a: "left" },
                  { key: "range", label: "Range", a: "left" },
                  { key: "py", label: "PY Sales ₹", a: "right" },
                  { key: "cy", label: "CY Sales ₹", a: "right" },
                  { key: "dev", label: "Deviation ₹", a: "right" },
                  { key: "growth", label: "Growth %", a: "right" },
                ].map(({ key, label, a }) => (
                  <th key={key} style={TH(a)} onClick={() => toggleYoy(key)}>
                    {label}{yoyArr(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yoyVisible.map((r, i) => {
                const devColor = r.dev > 0 ? "#15803d" : r.dev < 0 ? "#dc2626" : "#64748b";
                const grColor = r.growth != null
                  ? (r.growth > 0 ? "#15803d" : "#dc2626") : "#64748b";
                return (
                  <tr key={r.section + r.range} style={stripe(i)}>
                    <td style={{ ...TD("left"), fontWeight: "500" }}>{r.section}</td>
                    <td style={{ ...TD("left"), color: "#94a3b8", fontSize: "11px" }}>{r.range}</td>
                    <td style={TD()}>{INR(r.py)}</td>
                    <td style={TD()}>{INR(r.cy)}</td>
                    <td style={{ ...TD(), fontWeight: "700", color: devColor }}>
                      {r.dev > 0 ? "+" : ""}{INR(r.dev)}
                    </td>
                    <td style={{ ...TD(), fontWeight: "700", color: grColor }}>
                      {r.growth != null
                        ? `${r.growth > 0 ? "+" : ""}${r.growth.toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {yoyPages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 16px", justifyContent: "flex-end",
            fontSize: "12px", color: "#64748b",
          }}>
            {PAG_BTN(yoyPage === 0, () => setYoyPage(p => p - 1), "‹ Prev")}
            <span>Page {yoyPage + 1} of {yoyPages}</span>
            {PAG_BTN(yoyPage >= yoyPages - 1, () => setYoyPage(p => p + 1), "Next ›")}
          </div>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
//  PAGE 07 ── Basket Size + Range Detail (shell — built in Step 11)
//  All calculations LOCAL. Zero sharing with other pages.
// ══════════════════════════════════════════════════════════════════════════════
function Page07_BasketSizeRange({ storeData, filters }) {
  // ── Local formatters ──────────────────────────────────────
  const INR = v => `₹${Math.round(v).toLocaleString("en-IN")}`;
  const PCT = v => `${v.toFixed(1)}%`;

  const TH = (a = "right") => ({
    padding: "9px 14px", fontSize: "10px", color: "#64748b", fontWeight: "700",
    letterSpacing: "0.4px", borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc", textAlign: a, whiteSpace: "nowrap",
  });
  const TD = (a = "right") => ({
    padding: "9px 14px", fontSize: "12px", color: "#1e293b",
    textAlign: a, fontFamily: "'Space Mono',monospace",
  });
  const stripe = i => ({
    borderBottom: "1px solid #f8fafc",
    background: i % 2 ? "#fafafa" : "white",
  });

  const PAG_BTN = (disabled, onClick, label) => (
    <button disabled={disabled} onClick={onClick} style={{
      border: "1px solid #e2e8f0", borderRadius: "5px", padding: "3px 10px",
      background: "white", cursor: disabled ? "not-allowed" : "pointer",
      fontSize: "12px", color: "#64748b", opacity: disabled ? 0.4 : 1,
    }}>{label}</button>
  );

  const CHART_TOOLTIP = {
    contentStyle: {
      fontSize: 12, borderRadius: 6,
      border: "1px solid #e2e8f0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
  };

  // ── Data ─────────────────────────────────────────────────
  const { sales, stock, config } = filterData(storeData, filters);

  // ── Range classifier ──────────────────────────────────────
  const getRange = sp => {
    for (const [lo, hi] of config.price_ranges)
      if (sp >= lo && sp <= hi) return `₹${lo}–${hi}`;
    return "Other";
  };

  // ── Core derived values ───────────────────────────────────
  const bills = new Set(sales.map(r => r.bill_no));
  const totalSalesVal = sales.reduce((s, r) => s + (r.net_amount || 0), 0);
  const avgBillVal = bills.size > 0 ? totalSalesVal / bills.size : 0;

  // ── Section-wise avg bill ─────────────────────────────────
  const sectionBillMap = {};
  for (const r of sales) {
    const sec = r.section || "Unknown";
    if (!sectionBillMap[sec]) sectionBillMap[sec] = { sales: 0, bills: new Set() };
    sectionBillMap[sec].sales += r.net_amount || 0;
    sectionBillMap[sec].bills.add(r.bill_no);
  }
  const sectionAvgBill = Object.entries(sectionBillMap)
    .map(([section, d]) => ({
      section,
      totalSales: d.sales,
      billCount: d.bills.size,
      avgBill: d.bills.size > 0 ? d.sales / d.bills.size : 0,
    }))
    .sort((a, b) => b.avgBill - a.avgBill);

  // ── Month-wise avg bill ───────────────────────────────────
  const monthMap = {};
  for (const r of sales) {
    const key = (r.bill_date || "").slice(0, 7); // "YYYY-MM"
    if (!key) continue;
    if (!monthMap[key]) monthMap[key] = { sales: 0, bills: new Set(), qty: 0 };
    monthMap[key].sales += r.net_amount || 0;
    monthMap[key].bills.add(r.bill_no);
    monthMap[key].qty += r.net_qty || 0;
  }
  const monthData = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, d]) => {
      const [yr, mo] = key.split("-");
      const label = new Date(Number(yr), Number(mo) - 1, 1)
        .toLocaleString("en-US", { month: "short", year: "numeric" });
      return {
        key,
        label,
        year: yr,
        month: new Date(Number(yr), Number(mo) - 1, 1)
          .toLocaleString("en-US", { month: "short" }),
        totalSales: d.sales,
        bills: d.bills.size,
        avgBill: d.bills.size > 0 ? d.sales / d.bills.size : 0,
        qty: d.qty,
      };
    });

  // Month total row
  const monthTotal = {
    label: "Total",
    totalSales: monthData.reduce((s, r) => s + r.totalSales, 0),
    bills: [...new Set(sales.map(r => r.bill_no))].length,
    avgBill: avgBillVal,
    qty: sales.reduce((s, r) => s + (r.net_qty || 0), 0),
  };

  // ── Year overlay chart data ───────────────────────────────
  const years = [...new Set(monthData.map(d => d.year))].sort();
  // Build { month: "Jan", [year]: avgBill, ... }
  const chartByMonth = {};
  for (const d of monthData) {
    if (!chartByMonth[d.month]) chartByMonth[d.month] = { month: d.month };
    chartByMonth[d.month][d.year] = d.avgBill;
  }
  const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartMonthRows = MONTH_ORDER
    .filter(m => chartByMonth[m])
    .map(m => chartByMonth[m]);

  const yearColors = (() => {
    if (years.length === 1) return { [years[0]]: { color: "#3b82f6", dash: undefined, width: 2.5, r: 3 } };
    if (years.length === 2) return {
      [years[0]]: { color: "#94a3b8", dash: "4 4", width: 1.5, r: 2 },
      [years[1]]: { color: "#3b82f6", dash: undefined, width: 2.5, r: 3 },
    };
    // 3 years
    return {
      [years[0]]: { color: "#94a3b8", dash: "4 4", width: 1.5, r: 2 },
      [years[1]]: { color: "#a78bfa", dash: "4 4", width: 1.5, r: 2 },
      [years[2]]: { color: "#3b82f6", dash: undefined, width: 2.5, r: 3 },
    };
  })();

  // ── Section × Range cross table ───────────────────────────
  const crossMap = {}; // crossMap[section][range] = value
  const rangeValueMap = {};
  for (const r of sales) {
    const sec = r.section || "Unknown";
    const rng = getRange(r.selling_price || 0);
    if (!crossMap[sec]) crossMap[sec] = {};
    crossMap[sec][rng] = (crossMap[sec][rng] || 0) + (r.net_amount || 0);
    rangeValueMap[rng] = (rangeValueMap[rng] || 0) + (r.net_amount || 0);
  }
  const rangesSorted = Object.entries(rangeValueMap)
    .sort((a, b) => b[1] - a[1])
    .map(([rng]) => rng);

  const sectionTotals = {};
  for (const [sec, rm] of Object.entries(crossMap)) {
    sectionTotals[sec] = Object.values(rm).reduce((s, v) => s + v, 0);
  }
  const sectionsSorted = Object.keys(sectionTotals).sort(
    (a, b) => sectionTotals[b] - sectionTotals[a]
  );

  const crossTotalRow = {};
  for (const rng of rangesSorted) {
    crossTotalRow[rng] = sectionsSorted.reduce(
      (s, sec) => s + (crossMap[sec]?.[rng] || 0), 0
    );
  }
  const crossGrandTotal = Object.values(crossTotalRow).reduce((s, v) => s + v, 0);

  // ── Range qty distribution ────────────────────────────────
  const rangeQtyMap = {};
  for (const r of sales) {
    const rng = getRange(r.selling_price || 0);
    rangeQtyMap[rng] = (rangeQtyMap[rng] || 0) + (r.net_qty || 0);
  }
  const totalQty = Object.values(rangeQtyMap).reduce((s, v) => s + v, 0);
  const rangeQtyData = Object.entries(rangeQtyMap)
    .map(([range, qty]) => ({
      range,
      qty,
      pct: totalQty > 0 ? (qty / totalQty) * 100 : 0,
    }))
    .sort((a, b) => b.qty - a.qty);

  // ── Top ranges ────────────────────────────────────────────
  const topRangeQty = rangeQtyData[0]?.range || "—";
  const topRangeVal = rangesSorted[0] || "—";

  // ── Sortable Table 2 state ────────────────────────────────
  const [secSort, setSecSort] = React.useState({ col: "avgBill", dir: "desc" });
  const sortedSectionAvgBill = React.useMemo(() => {
    const arr = [...sectionAvgBill];
    arr.sort((a, b) => {
      const v = secSort.dir === "asc" ? 1 : -1;
      if (secSort.col === "section") return v * a.section.localeCompare(b.section);
      return v * (a[secSort.col] - b[secSort.col]);
    });
    return arr;
  }, [sectionAvgBill, secSort]);

  const toggleSecSort = col => setSecSort(prev =>
    prev.col === col
      ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
      : { col, dir: "desc" }
  );
  const secArrow = col => secSort.col === col
    ? <span style={{ color: "#3b82f6", marginLeft: 3 }}>{secSort.dir === "asc" ? "↑" : "↓"}</span>
    : null;

  // ── Chart2 height ─────────────────────────────────────────
  const chart2Height = Math.max(200, rangeQtyData.length * 52);

  // ── Styles ────────────────────────────────────────────────
  const cardStyle = {
    background: "white", borderRadius: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: "1px solid #f1f5f9",
  };
  const sectionTitle = {
    fontSize: "12px", fontWeight: "700", color: "#64748b",
    textTransform: "uppercase", letterSpacing: "0.5px",
    padding: "14px 16px 0", marginBottom: "10px",
  };
  const tableWrap = { overflowX: "auto" };

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>

      {/* KPI Row */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <KPICard label="Bill Count" value={bills.size.toLocaleString()} accent="#3b82f6" />
        <KPICard label="Avg Bill Value" value={INR(avgBillVal)} accent="#10b981" />
        <KPICard label="Top Range (Qty)" value={topRangeQty} accent="#f59e0b" />
        <KPICard label="Top Range (Val)" value={topRangeVal} accent="#8b5cf6" />
        <KPICard label="Total Sales" value={INR(totalSalesVal)} accent="#06b6d4" />
      </div>

      {/* Table 1 — Section × Range Cross Table */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Section × Range Sales</div>
        <div style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={TH("left")}>Section</th>
                {rangesSorted.map(rng => (
                  <th key={rng} style={TH()}>{rng}</th>
                ))}
                <th style={{ ...TH(), fontWeight: "800" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sectionsSorted.map((sec, i) => (
                <tr key={sec} style={stripe(i)}>
                  <td style={{ ...TD("left"), fontWeight: 500 }}>{sec}</td>
                  {rangesSorted.map(rng => {
                    const val = crossMap[sec]?.[rng];
                    return (
                      <td key={rng} style={TD()}>
                        {val ? INR(val) : <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                    );
                  })}
                  <td style={{ ...TD(), fontWeight: "700" }}>{INR(sectionTotals[sec])}</td>
                </tr>
              ))}
              {/* Total row */}
              <tr style={{ borderTop: "2px solid #e2e8f0", background: "#f8fafc" }}>
                <td style={{ ...TD("left"), fontWeight: "700" }}>Total</td>
                {rangesSorted.map(rng => (
                  <td key={rng} style={{ ...TD(), fontWeight: "700" }}>{INR(crossTotalRow[rng] || 0)}</td>
                ))}
                <td style={{ ...TD(), fontWeight: "700" }}>{INR(crossGrandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart row: 60/40 */}
      <div style={{ display: "grid", gridTemplateColumns: "60fr 40fr", gap: "18px" }}>

        {/* Chart 1 — Avg Bill Value by Month (year overlay) */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Avg Bill Value by Month</div>
          <div style={{ padding: "0 16px 16px" }}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartMonthRows} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(val, name) => [INR(val), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {years.map(yr => {
                  const yc = yearColors[yr] || { color: "#94a3b8", width: 1.5, r: 2 };
                  return (
                    <Line
                      key={yr}
                      type="monotone"
                      dataKey={yr}
                      name={yr}
                      stroke={yc.color}
                      strokeWidth={yc.width}
                      strokeDasharray={yc.dash}
                      dot={{ r: yc.r, fill: yc.color }}
                      activeDot={{ r: yc.r + 2 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 — Range % by Qty Horizontal Bar */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Range % by Qty</div>
          <div style={{ padding: "0 16px 16px" }}>
            <ResponsiveContainer width="100%" height={chart2Height}>
              <BarChart
                data={rangeQtyData}
                layout="vertical"
                margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="range"
                  tick={{ fontSize: 11, fill: "#94a3b8" }} width={80} />
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(val, name, props) => [
                    `${PCT(props.payload.pct)} (${props.payload.qty.toLocaleString()} qty)`,
                    "Range",
                  ]}
                />
                <Bar dataKey="pct" fill="#8b5cf6" radius={[0, 3, 3, 0]}>
                  <LabelList
                    dataKey="pct"
                    position="right"
                    style={{ fontSize: 11, fill: "#64748b" }}
                    formatter={v => PCT(v)}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table row: 50/50 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>

        {/* Table 2 — Section-wise Avg Bill */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 0" }}>
            <div style={sectionTitle}>Section Avg Bill Value</div>
            <button
              onClick={() => exportCSV(
                "section_avg_bill.csv",
                ["Section", "Total Sales ₹", "Bill Count", "Avg Bill Value ₹"],
                sortedSectionAvgBill.map(r => [r.section, Math.round(r.totalSales), r.billCount, Math.round(r.avgBill)])
              )}
              style={{
                fontSize: "11px", background: "#f8fafc",
                border: "1px solid #e2e8f0", borderRadius: "5px",
                padding: "4px 10px", cursor: "pointer",
                fontFamily: "'Outfit',sans-serif", marginBottom: "8px",
              }}
            >Export CSV</button>
          </div>
          <div style={tableWrap}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    { col: "section", label: "Section", align: "left" },
                    { col: "totalSales", label: "Total Sales ₹", align: "right" },
                    { col: "billCount", label: "Bill Count", align: "right" },
                    { col: "avgBill", label: "Avg Bill Value ₹", align: "right" },
                  ].map(({ col, label, align }) => (
                    <th
                      key={col}
                      style={{ ...TH(align), cursor: "pointer", userSelect: "none" }}
                      onClick={() => toggleSecSort(col)}
                    >
                      {label}{secArrow(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedSectionAvgBill.map((row, i) => (
                  <tr key={row.section} style={stripe(i)}>
                    <td style={{ ...TD("left"), fontWeight: 500 }}>{row.section}</td>
                    <td style={TD()}>{INR(row.totalSales)}</td>
                    <td style={TD()}>{row.billCount.toLocaleString()}</td>
                    <td style={TD()}>{INR(row.avgBill)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 3 — Month-wise Avg Bill */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Month-wise Avg Bill Value</div>
          <div style={tableWrap}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={TH("left")}>Month</th>
                  <th style={TH()}>Total Sales ₹</th>
                  <th style={TH()}>Bills</th>
                  <th style={TH()}>Avg Bill Value ₹</th>
                  <th style={TH()}>Qty Sold</th>
                </tr>
              </thead>
              <tbody>
                {monthData.map((row, i) => (
                  <tr key={row.key} style={stripe(i)}>
                    <td style={{ ...TD("left"), fontWeight: 500 }}>{row.label}</td>
                    <td style={TD()}>{INR(row.totalSales)}</td>
                    <td style={TD()}>{row.bills.toLocaleString()}</td>
                    <td style={TD()}>{INR(row.avgBill)}</td>
                    <td style={TD()}>{row.qty.toLocaleString()}</td>
                  </tr>
                ))}
                {/* Total row */}
                <tr style={{ borderTop: "2px solid #e2e8f0", background: "#f8fafc" }}>
                  <td style={{ ...TD("left"), fontWeight: "700" }}>Total</td>
                  <td style={{ ...TD(), fontWeight: "700" }}>{INR(monthTotal.totalSales)}</td>
                  <td style={{ ...TD(), fontWeight: "700" }}>{monthTotal.bills.toLocaleString()}</td>
                  <td style={{ ...TD(), fontWeight: "700" }}>{INR(monthTotal.avgBill)}</td>
                  <td style={{ ...TD(), fontWeight: "700" }}>{monthTotal.qty.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
//  PAGE 08 ── Sales Target              (shell — built in Step 12)
// ──────────────────────────────────────────────────────────────────────────────
//  User-editable inputs are LOCAL STATE in this component only.
//  Not shared with any other page.
//  All calculations LOCAL. Zero sharing with other pages.
// ══════════════════════════════════════════════════════════════════════════════
function Page08_SalesTarget({ storeData, filters }) {
  // ── Local formatters ──────────────────────────────────────
  const INR = v => `₹${Math.round(v).toLocaleString("en-IN")}`;
  const PCT = v => `${v.toFixed(1)}%`;

  const TH = (a = "right") => ({
    padding: "9px 14px", fontSize: "10px", color: "#64748b", fontWeight: "700",
    letterSpacing: "0.4px", borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc", textAlign: a, whiteSpace: "nowrap",
  });
  const TD = (a = "right") => ({
    padding: "9px 14px", fontSize: "12px", color: "#1e293b",
    textAlign: a, fontFamily: "'Space Mono',monospace",
  });
  const stripe = i => ({
    borderBottom: "1px solid #f8fafc",
    background: i % 2 ? "#fafafa" : "white",
  });

  const PAG_BTN = (disabled, onClick, label) => (
    <button disabled={disabled} onClick={onClick} style={{
      border: "1px solid #e2e8f0", borderRadius: "5px", padding: "3px 10px",
      background: "white", cursor: disabled ? "not-allowed" : "pointer",
      fontSize: "12px", color: "#64748b", opacity: disabled ? 0.4 : 1,
    }}>{label}</button>
  );

  const CHART_TOOLTIP = {
    contentStyle: {
      fontSize: 12, borderRadius: 6,
      border: "1px solid #e2e8f0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
  };

  // ── Local state ───────────────────────────────────────────
  const [growthPct, setGrowthPct] = React.useState(10);
  const [oldSalePct, setOldSalePct] = React.useState(20);
  const [segmentSel, setSegmentSel] = React.useState("All");
  const [sortCol, setSortCol] = React.useState("projReq");
  const [sortDir, setSortDir] = React.useState("desc");
  const [page, setPage] = React.useState(0);
  const PAGE_SIZE = 15;

  // ── Data ─────────────────────────────────────────────────
  const { sales, stock, config } = filterData(storeData, filters);

  // ── Range classifier ──────────────────────────────────────
  const getRange = sp => {
    for (const [lo, hi] of config.price_ranges)
      if (sp >= lo && sp <= hi) return `₹${lo}–${hi}`;
    return "Other";
  };

  // ── Segment options ───────────────────────────────────────
  const segmentOptions = React.useMemo(() => {
    const segs = new Set(sales.map(r => r.segment).filter(Boolean));
    if (segs.size === 0) return ["All", "1.Head", "2.Economy", "3.Premium"];
    return ["All", ...Array.from(segs).sort()];
  }, [sales]);

  // ── Date range from filters ───────────────────────────────
  const dateFrom = filters?.dateFrom || "2024-01-01";
  const dateTo = filters?.dateTo || "2024-12-31";

  // ── PY date range (exactly 1 year back) ──────────────────
  const shiftYear = (dateStr, delta) => {
    const d = new Date(dateStr);
    d.setFullYear(d.getFullYear() + delta);
    return d.toISOString().slice(0, 10);
  };
  const pyFrom = shiftYear(dateFrom, -1);
  const pyTo = shiftYear(dateTo, -1);

  // ── PY sales filter ───────────────────────────────────────
  const pySales = React.useMemo(() => {
    return sales.filter(r => {
      const d = r.bill_date || "";
      if (d < pyFrom || d > pyTo) return false;
      if (segmentSel !== "All" && r.segment !== segmentSel) return false;
      return true;
    });
  }, [sales, pyFrom, pyTo, segmentSel]);

  // ── CY sales (current period, segment filtered) ───────────
  const cySales = React.useMemo(() => {
    return sales.filter(r => {
      const d = r.bill_date || "";
      if (d < dateFrom || d > dateTo) return false;
      if (segmentSel !== "All" && r.segment !== segmentSel) return false;
      return true;
    });
  }, [sales, dateFrom, dateTo, segmentSel]);

  // ── KPI calculations ──────────────────────────────────────
  const actualSales = cySales.reduce((s, r) => s + (r.net_amount || 0), 0);
  const projectedTarget = actualSales * (1 + growthPct / 100);
  const achPct = projectedTarget > 0 ? (actualSales / projectedTarget) * 100 : 0;
  const oldStockTargetVal = projectedTarget * (oldSalePct / 100);
  const newStockTargetVal = projectedTarget * (1 - oldSalePct / 100);

  // ── Section × product × range target table ────────────────
  const tableRows = React.useMemo(() => {
    // Use PY sales as base; fall back to CY sales if PY is empty
    const baseSales = pySales.length > 0 ? pySales : cySales;
    const usingCYasPY = pySales.length === 0;

    // Build base qty lookup: key = section|product|range
    const pyQtyMap = {};
    for (const r of baseSales) {
      const key = `${r.section || ""}|${r.product || ""}|${getRange(r.selling_price || 0)}`;
      pyQtyMap[key] = (pyQtyMap[key] || 0) + (r.net_qty || 0);
    }

    // Build stock lookup: key = section|product
    const stockQtyMap = {};
    const oldStockQtyMap = {};
    const today = new Date();
    const threshold = (config.old_stock_threshold_days || 90) * 86400000;
    if (stock) {
      for (const s of stock) {
        const key = `${s.section || ""}|${s.product || ""}`;
        stockQtyMap[key] = (stockQtyMap[key] || 0) + (s.stock_qty || 0);
        if (s.entry_date) {
          const age = today - new Date(s.entry_date);
          if (age > threshold) {
            oldStockQtyMap[key] = (oldStockQtyMap[key] || 0) + (s.stock_qty || 0);
          }
        }
      }
    }

    // Collect unique combos from base sales
    const combos = new Map();
    for (const r of baseSales) {
      const sec = r.section || "Unknown";
      const prod = r.product || "Unknown";
      const range = getRange(r.selling_price || 0);
      const key = `${sec}|${prod}|${range}`;
      if (!combos.has(key)) combos.set(key, { sec, prod, range });
    }

    const rows = [];
    for (const [key, { sec, prod, range }] of combos) {
      const stockKey = `${sec}|${prod}`;
      const prevQty = pyQtyMap[key] || 0;
      const finalTarget = prevQty * (1 + growthPct / 100);
      const newTarget = finalTarget * (1 - oldSalePct / 100);
      const oldTarget = finalTarget * (oldSalePct / 100);
      const currentStock = stockQtyMap[stockKey] || 0;
      const currentOldStock = oldStockQtyMap[stockKey] || 0;
      const perDay = prevQty / 365;
      const projReq = Math.max(0, finalTarget - currentStock);

      rows.push({
        sec, prod, range,
        prevQty, finalTarget, newTarget, oldTarget,
        currentStock, currentOldStock, perDay, projReq,
      });
    }
    return rows;
  }, [pySales, cySales, stock, growthPct, oldSalePct]);

  // ── Sort table ────────────────────────────────────────────
  const toggleSort = col => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
    setPage(0);
  };
  const arrow = col => sortCol === col
    ? <span style={{ color: "#3b82f6", marginLeft: 3 }}>{sortDir === "asc" ? "↑" : "↓"}</span>
    : null;

  const sortedRows = React.useMemo(() => {
    const arr = [...tableRows];
    arr.sort((a, b) => {
      const v = sortDir === "asc" ? 1 : -1;
      if (sortCol === "sec") return v * a.sec.localeCompare(b.sec);
      if (sortCol === "prod") return v * a.prod.localeCompare(b.prod);
      if (sortCol === "range") return v * a.range.localeCompare(b.range);
      return v * (a[sortCol] - b[sortCol]);
    });
    return arr;
  }, [tableRows, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pagedRows = sortedRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── Table totals ──────────────────────────────────────────
  const totals = React.useMemo(() => ({
    prevQty: tableRows.reduce((s, r) => s + r.prevQty, 0),
    finalTarget: tableRows.reduce((s, r) => s + r.finalTarget, 0),
    newTarget: tableRows.reduce((s, r) => s + r.newTarget, 0),
    oldTarget: tableRows.reduce((s, r) => s + r.oldTarget, 0),
    currentStock: tableRows.reduce((s, r) => s + r.currentStock, 0),
    currentOldStock: tableRows.reduce((s, r) => s + r.currentOldStock, 0),
    perDay: tableRows.reduce((s, r) => s + r.perDay, 0),
    projReq: tableRows.reduce((s, r) => s + r.projReq, 0),
  }), [tableRows]);

  // ── Section chart data ────────────────────────────────────
  const sectionChartData = React.useMemo(() => {
    const secMap = {};
    for (const r of cySales) {
      const sec = r.section || "Unknown";
      secMap[sec] = (secMap[sec] || 0) + (r.net_amount || 0);
    }
    return Object.entries(secMap).map(([section, actual]) => ({
      section,
      "Actual Sales": Math.round(actual),
      "Projected Target": Math.round(actual * (1 + growthPct / 100)),
    })).sort((a, b) => b["Actual Sales"] - a["Actual Sales"]);
  }, [cySales, growthPct]);

  // ── Styles ────────────────────────────────────────────────
  const cardStyle = {
    background: "white", borderRadius: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: "1px solid #f1f5f9",
  };
  const sectionTitle = {
    fontSize: "12px", fontWeight: "700", color: "#64748b",
    textTransform: "uppercase", letterSpacing: "0.5px",
  };
  const inputCard = {
    background: "white", padding: "11px 16px", borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  };
  const inputStyle = {
    width: "76px", height: "30px", border: "1px solid #e2e8f0",
    borderRadius: "6px", padding: "0 10px", fontSize: "14px",
    fontWeight: "600", outline: "none", color: "#0f172a",
    fontFamily: "'Space Mono',monospace",
  };
  const labelStyle = {
    fontSize: "9px", color: "#94a3b8", textTransform: "uppercase",
    letterSpacing: "0.6px", fontWeight: "700", marginBottom: "5px",
    display: "block",
  };

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>

      {/* User Input Row */}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={inputCard}>
          <label style={labelStyle}>Growth %</label>
          <input
            type="number" min={0} max={200}
            value={growthPct}
            onChange={e => setGrowthPct(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div style={inputCard}>
          <label style={labelStyle}>Old Stock Sale %</label>
          <input
            type="number" min={0} max={100}
            value={oldSalePct}
            onChange={e => setOldSalePct(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div style={inputCard}>
          <label style={labelStyle}>Segment</label>
          <select
            value={segmentSel}
            onChange={e => { setSegmentSel(e.target.value); setPage(0); }}
            style={{ ...inputStyle, width: "140px", cursor: "pointer" }}
          >
            {segmentOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic", paddingBottom: "8px" }}>
          ← change inputs to recalculate live
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <KPICard
          label="Current Actual"
          value={INR(actualSales)}
          sub="filtered period"
          accent="#3b82f6"
        />
        <KPICard
          label="Projected Target"
          value={INR(projectedTarget)}
          sub={`+${growthPct}% growth`}
          accent="#10b981"
        />
        <KPICard
          label="Achievement %"
          value={PCT(achPct)}
          accent={achPct >= 100 ? "#10b981" : "#f59e0b"}
        />
        <KPICard
          label="Old Stock Target"
          value={INR(oldStockTargetVal)}
          sub={`${oldSalePct}% of target`}
          accent="#f59e0b"
        />
        <KPICard
          label="New Stock Target"
          value={INR(newStockTargetVal)}
          accent="#3b82f6"
        />
      </div>

      {/* Chart — Target vs Actual by Section */}
      <div style={cardStyle}>
        <div style={{ padding: "14px 16px 0", ...sectionTitle }}>
          Target vs Actual by Section
        </div>
        <div style={{ padding: "10px 16px 16px" }}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sectionChartData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="section" tick={{ fontSize: 11, fill: "#94a3b8" }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip
                {...CHART_TOOLTIP}
                formatter={v => INR(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Actual Sales" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Projected Target" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Target Table */}
      <div style={cardStyle}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "14px 16px 8px",
        }}>
          <div style={sectionTitle}>Section × Product × Range Target</div>
          <button
            onClick={() => exportCSV(
              "sales_target.csv",
              ["Section", "Product", "Range", "Prev Qty", "Final Target", "New Target", "Old Target", "Stock Qty", "Old Stock Qty", "Per Day", "Projected Req"],
              sortedRows.map(r => [
                r.sec, r.prod, r.range,
                Math.round(r.prevQty),
                Math.round(r.finalTarget),
                Math.round(r.newTarget),
                Math.round(r.oldTarget),
                Math.round(r.currentStock),
                Math.round(r.currentOldStock),
                r.perDay.toFixed(1),
                Math.round(r.projReq),
              ])
            )}
            style={{
              fontSize: "11px", background: "#f8fafc",
              border: "1px solid #e2e8f0", borderRadius: "5px",
              padding: "4px 10px", cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
            }}
          >Export CSV</button>
        </div>

        {/* Total row above pagination */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  { key: "sec", label: "Section", align: "left" },
                  { key: "prod", label: "Product", align: "left" },
                  { key: "range", label: "Range", align: "left" },
                  { key: "prevQty", label: "Prev Qty", align: "right" },
                  { key: "finalTarget", label: "Final Target", align: "right" },
                  { key: "newTarget", label: "New Target", align: "right" },
                  { key: "oldTarget", label: "Old Target", align: "right" },
                  { key: "currentStock", label: "Stock Qty", align: "right" },
                  { key: "currentOldStock", label: "Old Stock Qty", align: "right" },
                  { key: "perDay", label: "Per Day", align: "right" },
                  { key: "projReq", label: "Projected Req", align: "right" },
                ].map(({ key, label, align }) => (
                  <th
                    key={key}
                    style={{ ...TH(align), cursor: "pointer", userSelect: "none" }}
                    onClick={() => toggleSort(key)}
                  >
                    {label}{arrow(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Total pinned row */}
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <td style={{ ...TD("left"), fontWeight: "700" }} colSpan={3}>Total</td>
                <td style={{ ...TD(), fontWeight: "700" }}>{Math.round(totals.prevQty).toLocaleString()}</td>
                <td style={{ ...TD(), fontWeight: "700" }}>{Math.round(totals.finalTarget).toLocaleString()}</td>
                <td style={{ ...TD(), fontWeight: "700" }}>{Math.round(totals.newTarget).toLocaleString()}</td>
                <td style={{ ...TD(), fontWeight: "700" }}>{Math.round(totals.oldTarget).toLocaleString()}</td>
                <td style={{ ...TD(), fontWeight: "700" }}>{Math.round(totals.currentStock).toLocaleString()}</td>
                <td style={{ ...TD(), fontWeight: "700" }}>{Math.round(totals.currentOldStock).toLocaleString()}</td>
                <td style={{ ...TD(), fontWeight: "700" }}>{totals.perDay.toFixed(1)}</td>
                <td style={{ ...TD(), fontWeight: "700" }}>{Math.round(totals.projReq).toLocaleString()}</td>
              </tr>

              {/* Data rows */}
              {pagedRows.map((row, i) => {
                const projCell = row.projReq > 0
                  ? { bg: "#fef2f2", color: "#dc2626" }
                  : { bg: "#f0fdf4", color: "#15803d" };
                return (
                  <tr key={`${row.sec}|${row.prod}|${row.range}`} style={stripe(i)}>
                    <td style={{ ...TD("left"), fontWeight: 500 }}>{row.sec}</td>
                    <td style={{ ...TD("left") }}>{row.prod}</td>
                    <td style={{ ...TD("left") }}>{row.range}</td>
                    <td style={TD()}>{Math.round(row.prevQty).toLocaleString()}</td>
                    <td style={TD()}>{Math.round(row.finalTarget).toLocaleString()}</td>
                    <td style={TD()}>{Math.round(row.newTarget).toLocaleString()}</td>
                    <td style={TD()}>{Math.round(row.oldTarget).toLocaleString()}</td>
                    <td style={TD()}>{Math.round(row.currentStock).toLocaleString()}</td>
                    <td style={TD()}>{Math.round(row.currentOldStock).toLocaleString()}</td>
                    <td style={TD()}>{row.perDay.toFixed(1)}</td>
                    <td style={{
                      ...TD(),
                      background: projCell.bg,
                      color: projCell.color,
                      fontWeight: "700",
                    }}>
                      {row.projReq > 0 ? Math.round(row.projReq).toLocaleString() : "OK"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "10px 16px", justifyContent: "flex-end",
          fontSize: "12px", color: "#64748b",
        }}>
          {PAG_BTN(page === 0, () => setPage(0), "««")}
          {PAG_BTN(page === 0, () => setPage(p => p - 1), "‹ Prev")}
          <span>Page {page + 1} of {totalPages} ({sortedRows.length} rows)</span>
          {PAG_BTN(page >= totalPages - 1, () => setPage(p => p + 1), "Next ›")}
          {PAG_BTN(page >= totalPages - 1, () => setPage(totalPages - 1), "»»")}
        </div>
      </div>
    </div>
  );
}


// ── Upload zone sub-component (top-level so hooks are valid) ──────────────────
function UploadZone({ label, icon, file, error, warn, isDrag, onFile, onDragChange }) {
  const inputRef = useRef(null);
  const zoneStyle = {
    border: file ? "2px solid #10b981" : isDrag ? "2px dashed #3b82f6" : "2px dashed #cbd5e1",
    borderRadius: "10px", padding: "24px", textAlign: "center", cursor: "pointer",
    background: file ? "#f0fdf4" : isDrag ? "#eff6ff" : "white",
    transition: "border-color 0.15s, background 0.15s",
  };
  return (
    <div style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: "6px" }}>
      <div
        style={zoneStyle}
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); onDragChange(true); }}
        onDragLeave={() => onDragChange(false)}
        onDrop={e => { e.preventDefault(); onDragChange(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      >
        <input
          type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
          ref={el => { inputRef.current = el; }}
          onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }}
        />
        {file ? (
          <>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>✅</div>
            <div style={{ fontWeight: "600", fontSize: "13px", color: "#065f46" }}>{file.name}</div>
            <div style={{ fontSize: "11px", color: "#6ee7b7", marginTop: "4px" }}>
              {(file.size / 1024).toFixed(1)} KB
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>{icon}</div>
            <div style={{ fontWeight: "600", fontSize: "13px", color: "#1e293b" }}>{label}</div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>CSV or Excel (.xlsx)</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px" }}>Click to upload or drag & drop</div>
          </>
        )}
      </div>
      {error && <div style={{ fontSize: "11px", color: "#dc2626" }}>⚠ {error}</div>}
      {warn  && <div style={{ fontSize: "11px", color: "#d97706" }}>⚠ {warn}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  DataUploadScreen — file upload + parse + validate before dashboard loads
// ══════════════════════════════════════════════════════════════════════════════
function DataUploadScreen({ onLoad, onUseSample }) {
  const [salesFile, setSalesFile]     = useState(null);
  const [stockFile, setStockFile]     = useState(null);
  const [salesError, setSalesError]   = useState("");
  const [stockError, setStockError]   = useState("");
  const [salesWarn, setSalesWarn]     = useState("");
  const [stockWarn, setStockWarn]     = useState("");
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading]         = useState(false);
  const [salesDrag, setSalesDrag]     = useState(false);
  const [stockDrag, setStockDrag]     = useState(false);

  // ── CSV parser (no external lib) ──────────────────────────────────────────
  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h =>
      h.trim().replace(/^"|"$/g, "").toLowerCase()
    );
    return lines.slice(1).map(line => {
      const vals = [];
      let cur = "", inQ = false;
      for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === "," && !inQ) { vals.push(cur); cur = ""; }
        else cur += ch;
      }
      vals.push(cur);
      const row = {};
      headers.forEach((h, i) => {
        row[h] = (vals[i] ?? "").trim().replace(/^"|"$/g, "");
      });
      return row;
    });
  }

  // ── Excel parser (SheetJS via CDN) ────────────────────────────────────────
  async function ensureXLSX() {
    if (window.XLSX) return;
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async function parseExcel(arrayBuffer) {
    await ensureXLSX();
    const wb = window.XLSX.read(arrayBuffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = window.XLSX.utils.sheet_to_json(ws, { defval: "" });
    return rows.map(r => {
      const out = {};
      for (const [k, v] of Object.entries(r))
        out[k.trim().toLowerCase()] = String(v).trim();
      return out;
    });
  }

  // ── Date normaliser ───────────────────────────────────────────────────────
  function normalizeDate(v) {
    if (!v && v !== 0) return null;
    // Excel serial number (raw number from SheetJS/openpyxl)
    if (typeof v === "number") {
      const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
      return d.toISOString().slice(0, 10);
    }
    const s = String(v).trim();
    if (!s) return null;
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Normalise separators — handles DD.MM.YYYY (dot), DD/MM/YYYY (slash), DD-MM-YYYY (dash)
    const norm = s.replace(/\./g, "/").replace(/-/g, "/");
    // DD/MM/YYYY or DD/MM/YY
    const dmy = norm.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (dmy) {
      let [, d, m, y] = dmy;
      if (y.length === 2) y = "20" + y;
      const di = parseInt(d), mi = parseInt(m);
      // day > 12 means definitely DD/MM; month > 12 means definitely MM/DD
      // otherwise default to DD/MM (Indian store format)
      if (mi > 12) {
        // must be MM/DD — swap
        return `${y}-${d.padStart(2,"0")}-${m.padStart(2,"0")}`;
      }
      // DD/MM (default for Indian data)
      return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    }
    // Excel serial number as string
    const n = Number(s);
    if (!isNaN(n) && n > 40000 && n < 60000) {
      const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
      return d.toISOString().slice(0, 10);
    }
    return null;
  }

  // ── Number normaliser ─────────────────────────────────────────────────────
  function normalizeNumber(v) {
    if (v === null || v === undefined) return 0;
    const n = parseFloat(String(v).replace(/[₹,\s]/g, ""));
    return isNaN(n) ? 0 : n;
  }

  // ── Column alias map ──────────────────────────────────────────────────────
  const SALES_ALIASES = {
    bill_date:     ["bill_date","bill date","billdate","date"],
    bill_no:       ["bill_no","bill no","billno","invoice","invoice no","invoice_no"],
    branch:        ["branch"],
    location:      ["location","loc"],
    segment:       ["segment","seg"],
    section:       ["section","category","dept","department"],
    section_group: ["section_group","section group","sectiongroup","group"],
    product:       ["product","item","product name","item name","product_name","item_name"],
    supplier:      ["supplier","vendor","brand"],
    salesman:      ["salesman","sales person","salesperson","sales_person","staff","employee"],
    net_qty:       ["net_qty","net qty","qty","quantity","net quantity"],
    net_amount:    ["net_amount","net amount","amount","sales","sales amount","total","total amount"],
    cost_price:    ["cost_price","cost price","cost","purchase price","purchase_price","cp"],
    selling_price: ["selling_price","selling price","price","mrp","sp"],
  };

  const STOCK_ALIASES = {
    stock_date:  ["stock_date","stock date","date","as of date"],
    branch:      ["branch"],
    location:    ["location","loc"],
    segment:     ["segment","seg"],
    section:     ["section","category","dept","department"],
    product:     ["product","item","product name","item name","product_name","item_name"],
    supplier:    ["supplier","vendor","brand"],
    stock_qty:   ["stock_qty","stock qty","qty","quantity","stock quantity"],
    stock_value: ["stock_value","stock value","value","stock amount","stock_amount"],
    entry_date:  ["entry_date","entry date","purchase date","purchase_date","received","received date","received_date"],
  };

  function mapColumns(rawRow, aliases) {
    const keys = Object.keys(rawRow);
    const mapped = {};
    for (const [field, aliasList] of Object.entries(aliases)) {
      const found = aliasList.find(a => keys.includes(a.toLowerCase()));
      mapped[field] = found ? rawRow[found.toLowerCase()] ?? "" : "";
    }
    return mapped;
  }

  // ── Parse a file (CSV or XLSX) → raw rows ─────────────────────────────────
  async function parseFile(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) {
      const text = await file.text();
      return parseCSV(text);
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buf = await file.arrayBuffer();
      return parseExcel(buf);
    }
    throw new Error("Unsupported file type. Please upload a CSV or .xlsx file.");
  }

  // ── Transform raw rows into typed sales rows ──────────────────────────────
  function transformSales(rawRows) {
    return rawRows.map(r => {
      const m = mapColumns(r, SALES_ALIASES);
      const qty = normalizeNumber(m.net_qty);
      const amt = normalizeNumber(m.net_amount);
      const sp  = m.selling_price ? normalizeNumber(m.selling_price) : (qty ? amt / qty : 0);
      return {
        bill_date:     normalizeDate(m.bill_date),
        bill_no:       m.bill_no || "",
        branch:        m.branch || "",
        location:      m.location || "",
        segment:       m.segment || "",
        section:       m.section || "",
        section_group: m.section_group || "",
        product:       m.product || "",
        supplier:      m.supplier || "",
        salesman:      m.salesman || "",
        net_qty:       qty,
        net_amount:    amt,
        cost_price:    m.cost_price ? normalizeNumber(m.cost_price) : null,
        selling_price: sp,
      };
    }).filter(r => r.product || r.net_amount);
  }

  // ── Transform raw rows into typed stock rows ──────────────────────────────
  function transformStock(rawRows) {
    return rawRows.map(r => {
      const m = mapColumns(r, STOCK_ALIASES);
      return {
        stock_date:  normalizeDate(m.stock_date),
        branch:      m.branch || "",
        location:    m.location || "",
        segment:     m.segment || "",
        section:     m.section || "",
        product:     m.product || "",
        supplier:    m.supplier || "",
        stock_qty:   normalizeNumber(m.stock_qty),
        stock_value: normalizeNumber(m.stock_value),
        entry_date:  normalizeDate(m.entry_date) || normalizeDate(m.stock_date) || null,
      };
    }).filter(r => r.product || r.stock_qty);
  }

  // ── Validate and produce warnings ─────────────────────────────────────────
  function validateSales(rows) {
    if (!rows.length) return { error: "Sales file has no valid data rows.", warning: "" };
    const missing = ["product","net_qty","net_amount"].filter(f => rows.every(r => !r[f] && r[f] !== 0));
    if (missing.length) return { error: `Sales file is missing required columns: ${missing.join(", ")}.`, warning: "" };
    const noDates = rows.every(r => !r.bill_date);
    return {
      error: "",
      warning: noDates ? "Bill dates missing — date filtering and YoY comparison will be limited." : "",
    };
  }

  function validateStock(rows) {
    if (!rows.length) return { error: "Stock file has no valid data rows.", warning: "" };
    const missing = ["product","stock_qty","stock_value"].filter(f => rows.every(r => !r[f] && r[f] !== 0));
    if (missing.length) return { error: `Stock file is missing required columns: ${missing.join(", ")}.`, warning: "" };
    const noEntry = rows.every(r => !r.entry_date);
    const usingFallback = !noEntry && rows.some(r => r.entry_date && r.stock_date && r.entry_date === r.stock_date);
    return {
      error: "",
      warning: noEntry
        ? "Entry dates missing in stock file — stock ageing unavailable."
        : usingFallback
        ? "⚠ entry_date missing — using stock_date as fallback. Stock ageing may be less accurate. Add an entry_date column to your stock file for precise ageing."
        : "",
    };
  }

  // ── Build config from parsed data ─────────────────────────────────────────
  function buildConfig(sales) {
    const dates = sales.map(r => r.bill_date).filter(Boolean).sort();
    return {
      desired_str_by_range: { "0-250": 4, "251-500": 4, "501-1000": 5, "1001+": 5 },
      old_stock_threshold_days: 90,
      grade_rules: { A: { min_score: 80 }, B: { min_score: 60 }, C: { min_score: 0 } },
      price_ranges: [[0,250],[251,500],[501,1000],[1001,99999]],
      report_period: {
        from: dates[0] || null,
        to:   dates[dates.length - 1] || null,
      },
    };
  }

  // ── Handle file selection ─────────────────────────────────────────────────
  function handleSalesFile(file) {
    if (!file) return;
    const ok = file.name.match(/\.(csv|xlsx?)$/i);
    if (!ok) { setSalesError("Wrong file type. Please upload a CSV or .xlsx file."); setSalesFile(null); return; }
    setSalesError(""); setSalesWarn(""); setSalesFile(file);
  }

  function handleStockFile(file) {
    if (!file) return;
    const ok = file.name.match(/\.(csv|xlsx?)$/i);
    if (!ok) { setStockError("Wrong file type. Please upload a CSV or .xlsx file."); setStockFile(null); return; }
    setStockError(""); setStockWarn(""); setStockFile(file);
  }

  // ── Load dashboard ─────────────────────────────────────────────────────────
  async function handleLoad() {
    setLoading(true); setGlobalError(""); setSalesError(""); setStockError(""); setSalesWarn(""); setStockWarn("");
    try {
      const [salesRaw, stockRaw] = await Promise.all([
        parseFile(salesFile),
        parseFile(stockFile),
      ]);
      const sales = transformSales(salesRaw);
      const stock = transformStock(stockRaw);
      const sv = validateSales(sales);
      const stv = validateStock(stock);
      if (sv.error) { setSalesError(sv.error); setLoading(false); return; }
      if (stv.error) { setStockError(stv.error); setLoading(false); return; }
      if (sv.warning)  setSalesWarn(sv.warning);
      if (stv.warning) setStockWarn(stv.warning);
      const config = buildConfig(sales);
      onLoad({ sales, stock, config });
    } catch (e) {
      setGlobalError(e.message || "Failed to parse files. Please check the file format.");
    }
    setLoading(false);
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const canLoad = !!salesFile && !!stockFile && !loading;

  return (
    <div style={{
      minHeight: "100vh", background: "#f1f5f9",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Outfit', sans-serif", padding: "24px",
    }}>
      <style>{FONT_CSS}</style>
      <div style={{
        maxWidth: "560px", width: "100%", background: "white",
        borderRadius: "16px", padding: "40px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
      }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a" }}>Retail Analytics</div>
          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
            Upload your sales and stock files to get started
          </div>
        </div>

        {/* Upload zones */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
          <UploadZone
            label="Sales File" icon="📊" file={salesFile} error={salesError} warn={salesWarn}
            isDrag={salesDrag}
            onFile={handleSalesFile}
            onDragChange={setSalesDrag}
          />
          <UploadZone
            label="Stock File" icon="📦" file={stockFile} error={stockError} warn={stockWarn}
            isDrag={stockDrag}
            onFile={handleStockFile}
            onDragChange={setStockDrag}
          />
        </div>

        {/* Global error banner */}
        {globalError && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: "8px", padding: "10px 14px",
            fontSize: "12px", color: "#dc2626", marginBottom: "16px",
          }}>
            ⚠ {globalError}
          </div>
        )}

        {/* Load button */}
        <button
          onClick={handleLoad}
          disabled={!canLoad}
          style={{
            width: "100%", height: "44px",
            background: canLoad ? "#3b82f6" : "#94a3b8",
            color: "white", fontSize: "14px", fontWeight: "600",
            borderRadius: "8px", border: "none",
            cursor: canLoad ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            transition: "background 0.15s",
          }}
        >
          {loading ? (
            <>
              <span style={{
                width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)",
                borderTopColor: "white", borderRadius: "50%",
                animation: "spin 0.7s linear infinite", display: "inline-block",
              }} />
              Parsing files...
            </>
          ) : "Load Dashboard →"}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Sample data link */}
        <div style={{ textAlign: "center", marginTop: "14px", fontSize: "12px", color: "#64748b" }}>
          Don't have files yet?{" "}
          <span
            onClick={onUseSample}
            style={{ color: "#3b82f6", cursor: "pointer", textDecoration: "underline" }}
          >
            Use sample data →
          </span>
        </div>
      </div>
    </div>
  );
}



const PAGE_COMPONENTS = {
  1: Page01_SalesOverview, 2: Page02_StockOverview,
  3: Page03_STRMarginGMROI, 4: Page04_MatrixGrading,
  5: Page05_OldStockSupplier, 6: Page06_YoYMonthly,
  7: Page07_BasketSizeRange, 8: Page08_SalesTarget,
};

export default function App() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [storeData, setStoreData] = useState(null);

  if (!storeData) {
    return (
      <>
        <style>{FONT_CSS}</style>
        <DataUploadScreen
          onLoad={(parsedData) => {
            setStoreData(parsedData);
            setFilters({
              ...DEFAULT_FILTERS,
              dateFrom: parsedData.config.report_period.from || DEFAULT_FILTERS.dateFrom,
              dateTo: parsedData.config.report_period.to || DEFAULT_FILTERS.dateTo,
            });
          }}
          onUseSample={() => {
            setStoreData(MOCK_STORE_DATA);
          }}
        />
      </>
    );
  }

  const ActivePage = PAGE_COMPONENTS[page];
  const meta = PAGE_REGISTRY[page - 1];

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      fontFamily: "'Outfit', sans-serif", background: "#f1f5f9"
    }}>
      <style>{FONT_CSS}</style>

      <SidebarNav
        active={page}
        onNav={setPage}
        storeData={storeData}
        onChangeData={() => setStoreData(null)}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <GlobalFilterBar
          storeData={storeData}
          filters={filters}
          onFilter={setFilters}
          data-filterbar=""
        />
        <button
          className="no-print"
          onClick={() => window.print()}
          style={{
            fontSize: "13px",
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            padding: "6px 14px",
            cursor: "pointer",
            fontFamily: "'Outfit',sans-serif",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          🖨 Print
        </button>

        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
          {/* Page header */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "18px" }}>
            <span style={{ fontWeight: "700", color: "#0f172a", fontSize: "16px" }}>{meta.label}</span>
            <span style={{ color: "#94a3b8", fontSize: "12px" }}>· {meta.desc}</span>
          </div>

          {/* Active page — receives raw storeData + filters, does its own filtering */}
          <ActivePage storeData={storeData} filters={filters} />
        </div>
      </div>
    </div>
  );
}
