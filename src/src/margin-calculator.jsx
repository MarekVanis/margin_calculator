import { useState, useMemo, useCallback } from "react";

const uid = () => Date.now() + Math.random();
const defaultProduct = (customFields) => { const p = { id: uid(), name: "", purchasePrice: "", sellingPrice: "", shippingCost: "", packagingCost: "", marketplaceCommission: "", pno: "", fixedCostPerUnit: "", returnRate: "", discountPercent: "", customValues: {} }; (customFields||[]).forEach(f => { p.customValues[f.id] = ""; }); return p; };
const CURRENCIES = { CZK: { symbol: "Kč", locale: "cs-CZ", suffix: true }, EUR: { symbol: "€", locale: "de-DE", suffix: true }, USD: { symbol: "$", locale: "en-US", suffix: false }, PLN: { symbol: "zł", locale: "pl-PL", suffix: true }, HUF: { symbol: "Ft", locale: "hu-HU", suffix: true } };
const fmtC = (val, k) => { if (isNaN(val) || val === null) return "—"; const c = CURRENCIES[k] || CURRENCIES.CZK; const n = val.toLocaleString(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return c.suffix ? `${n} ${c.symbol}` : `${c.symbol}${n}`; };
const fmtP = (val) => { if (isNaN(val) || val === null) return "—"; return val.toFixed(2) + " %"; };

const calculate = (p, customFields) => {
  const pu=parseFloat(p.purchasePrice)||0, se=parseFloat(p.sellingPrice)||0, sh=parseFloat(p.shippingCost)||0, pa=parseFloat(p.packagingCost)||0, mc=parseFloat(p.marketplaceCommission)||0, pn=parseFloat(p.pno)||0, fc=parseFloat(p.fixedCostPerUnit)||0, rr=parseFloat(p.returnRate)||0, di=parseFloat(p.discountPercent)||0;
  if (pu === 0 && se === 0) return null;
  const esp = se * (1 - di / 100), gm = esp - pu, gp = esp > 0 ? (gm / esp) * 100 : 0;
  const mcc = esp * (mc / 100), mkc = esp * (pn / 100), rc = esp * (rr / 100);
  let baseCosts = pu + sh + pa + mcc + mkc + fc + rc;
  let baseVarPct = mc + pn + rr;
  let baseFixedAbs = pu + sh + pa + fc;
  // Custom fields
  let customCostAbs = 0, customCostPct = 0, customRevenueAbs = 0, customRevenuePct = 0;
  const customBreakdown = {};
  (customFields || []).forEach(cf => {
    const val = parseFloat(p.customValues?.[cf.id]) || 0;
    if (val === 0) return;
    if (cf.type === "cost") {
      if (cf.unit === "percent") { const amt = esp * (val / 100); customCostPct += val; baseCosts += amt; customBreakdown[cf.id] = amt; }
      else { customCostAbs += val; baseCosts += val; customBreakdown[cf.id] = val; }
    } else {
      if (cf.unit === "percent") { const amt = esp * (val / 100); customRevenuePct += val; customBreakdown[cf.id] = amt; }
      else { customRevenueAbs += val; customBreakdown[cf.id] = val; }
    }
  });
  const totalCustomRevenue = customRevenueAbs + esp * (customRevenuePct / 100);
  const tc = baseCosts;
  const nm = esp - tc + totalCustomRevenue;
  const np = esp > 0 ? (nm / esp) * 100 : 0;
  const vcr = (baseVarPct + customCostPct) / 100;
  const fcs = baseFixedAbs + customCostAbs;
  const be = vcr < 1 ? fcs / (1 - vcr) : Infinity;
  const rp = vcr < 0.8 ? fcs / (1 - vcr - 0.2) : Infinity;
  return { effectiveSellingPrice: esp, grossMarginCZK: gm, grossMarginPct: gp, netMarginCZK: nm, netMarginPct: np, breakEvenPrice: be, recommendedPrice: rp, totalCosts: tc, totalCustomRevenue, costBreakdown: { purchase: pu, shipping: sh, packaging: pa, marketplaceCost: mcc, marketingCost: mkc, fixedCost: fc, returnCost: rc }, customBreakdown };
};

const T = { bg: "#faf8f5", surface: "#ffffff", surfaceAlt: "#f5f2ee", border: "#e8e2d9", borderLight: "#f0ebe4", text: "#1a1614", textMuted: "#7a7168", textLight: "#a59d93", accent: "#e85d26", accentSoft: "#fff0ea", accentGrad: "linear-gradient(135deg, #e85d26 0%, #f59e0b 100%)", positive: "#16a34a", positiveSoft: "#ecfdf5", warning: "#d97706", warningSoft: "#fffbeb", negative: "#dc2626", negativeSoft: "#fef2f2", purple: "#7c3aed", purpleSoft: "#f5f3ff", radius: 14, radiusSm: 10, shadow: "0 1px 3px rgba(26,22,20,0.04), 0 8px 24px rgba(26,22,20,0.06)", font: "'Outfit', sans-serif", mono: "'Space Mono', monospace" };
const mCol = (pct) => { if (isNaN(pct)) return T.textLight; if (pct >= 20) return T.positive; if (pct >= 10) return T.warning; if (pct >= 0) return "#ea580c"; return T.negative; };
const mBg = (pct) => { if (isNaN(pct)) return T.surfaceAlt; if (pct >= 20) return T.positiveSoft; if (pct >= 10) return T.warningSoft; if (pct >= 0) return "#fff7ed"; return T.negativeSoft; };
const costBC = [{key:"purchase",color:"#e85d26",label:"Nákup"},{key:"shipping",color:"#f59e0b",label:"Doprava"},{key:"packaging",color:"#fbbf24",label:"Balení"},{key:"marketplaceCost",color:"#7c3aed",label:"Marketplace"},{key:"marketingCost",color:"#a855f7",label:"Marketing"},{key:"fixedCost",color:"#6b7280",label:"Fixní"},{key:"returnCost",color:"#dc2626",label:"Reklamace"}];
const customColors = ["#0ea5e9","#14b8a6","#f43f5e","#8b5cf6","#ec4899","#06b6d4","#84cc16","#eab308","#d946ef","#f97316"];

const Inp = ({ label, value, onChange, suffix, optional, labelColor }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 11, fontFamily: T.font, fontWeight: 600, color: labelColor || T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}{optional && <span style={{ color: T.textLight, fontWeight: 400, textTransform: "none", marginLeft: 4 }}>volitelné</span>}</label>
    <div style={{ position: "relative" }}>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" style={{ width: "100%", padding: "11px 14px", paddingRight: suffix ? 40 : 14, border: `1.5px solid ${T.borderLight}`, borderRadius: T.radiusSm, background: T.bg, color: T.text, fontSize: 14, fontFamily: T.mono, fontWeight: 500, outline: "none", transition: "all 0.2s", boxSizing: "border-box" }} onFocus={(e) => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accent}15`; }} onBlur={(e) => { e.target.style.borderColor = T.borderLight; e.target.style.boxShadow = "none"; }} />
      {suffix && <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", color: T.accent, fontSize: 11, fontFamily: T.font, fontWeight: 700 }}>{suffix}</span>}
    </div>
  </div>
);
const Metric = ({ label, value, color, bg, small }) => (
  <div style={{ background: bg || T.surface, border: `1px solid ${T.borderLight}`, borderRadius: T.radius, padding: small ? "14px 18px" : "18px 22px", flex: 1, minWidth: small ? 150 : 190, boxShadow: "0 1px 4px rgba(26,22,20,0.03)", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, opacity: 0.6, borderRadius: "14px 14px 0 0" }} />
    <div style={{ fontSize: 10, fontFamily: T.font, fontWeight: 600, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: small ? 15 : 19, fontFamily: T.mono, fontWeight: 700, color: color || T.text, lineHeight: 1.2 }}>{value}</div>
  </div>
);
const Slider = ({ label, value, onChange, min, max, step, suffix }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.font, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: T.text, fontFamily: T.mono, fontWeight: 700, background: T.accentSoft, padding: "2px 10px", borderRadius: 6 }}>{value}{suffix}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ width: "100%" }} />
  </div>
);
const Box = ({ children, style, noPad }) => (<div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius + 4, padding: noPad ? 0 : 28, boxShadow: T.shadow, position: "relative", overflow: "hidden", ...style }}>{children}</div>);

// Pill toggle
const PillToggle = ({ options, value, onChange }) => (
  <div style={{ display: "flex", gap: 2, background: T.surfaceAlt, borderRadius: 8, padding: 3 }}>
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)} style={{ padding: "6px 14px", border: "none", borderRadius: 6, background: value === o.value ? T.surface : "transparent", color: value === o.value ? T.text : T.textLight, cursor: "pointer", fontSize: 12, fontFamily: T.font, fontWeight: 600, boxShadow: value === o.value ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>{o.label}</button>
    ))}
  </div>
);

export default function MarginCalculator() {
  const [products, setProducts] = useState([defaultProduct([])]);
  const [customFields, setCustomFields] = useState([]);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("cost");
  const [newFieldUnit, setNewFieldUnit] = useState("currency");
  const [activeTab, setActiveTab] = useState("calculator");
  const [simProduct, setSimProduct] = useState(null);
  const [simOverrides, setSimOverrides] = useState({});
  const [targetMarginInput, setTargetMarginInput] = useState("20");
  const [currency, setCurrency] = useState("CZK");
  const [showImport, setShowImport] = useState(false);
  const [importSt, setImportSt] = useState(null);
  const [isDrag, setIsDrag] = useState(false);

  const fmt = useCallback((v) => fmtC(v, currency), [currency]);
  const cs = CURRENCIES[currency]?.symbol || "Kč";
  const upd = useCallback((id, f, v) => { setProducts(p => p.map(x => x.id === id ? { ...x, [f]: v } : x)); }, []);
  const updCustom = useCallback((prodId, fieldId, val) => { setProducts(p => p.map(x => x.id === prodId ? { ...x, customValues: { ...x.customValues, [fieldId]: val } } : x)); }, []);
  const addP = () => setProducts(p => [...p, defaultProduct(customFields)]);
  const remP = (id) => setProducts(p => p.filter(x => x.id !== id));
  const dupP = (id) => { setProducts(p => { const s = p.find(x => x.id === id); return s ? [...p, { ...s, id: uid(), name: (s.name || "Produkt") + " (kopie)", customValues: { ...s.customValues } }] : p; }); };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    const field = { id: "cf_" + uid(), name: newFieldName.trim(), type: newFieldType, unit: newFieldUnit, color: customColors[customFields.length % customColors.length] };
    setCustomFields(prev => [...prev, field]);
    setProducts(prev => prev.map(p => ({ ...p, customValues: { ...p.customValues, [field.id]: "" } })));
    setNewFieldName(""); setNewFieldType("cost"); setNewFieldUnit("currency");
  };
  const removeCustomField = (fieldId) => {
    setCustomFields(prev => prev.filter(f => f.id !== fieldId));
    setProducts(prev => prev.map(p => { const cv = { ...p.customValues }; delete cv[fieldId]; return { ...p, customValues: cv }; }));
  };

  const results = useMemo(() => products.map(p => ({ product: p, result: calculate(p, customFields) })), [products, customFields]);
  const summary = useMemo(() => { const v = results.filter(r => r.result); if (!v.length) return null; const rev = v.reduce((s, r) => s + r.result.effectiveSellingPrice, 0), costs = v.reduce((s, r) => s + r.result.totalCosts, 0), net = v.reduce((s, r) => s + r.result.netMarginCZK, 0); return { totalRevenue: rev, totalCosts: costs, totalNetMargin: net, avgNetMarginPct: rev > 0 ? (net / rev) * 100 : 0, count: v.length }; }, [results]);

  const CSV_H = ["Název produktu","Nákupní cena bez DPH","Prodejní cena bez DPH","Doprava (Kč)","Balení a expedice (Kč)","Provize marketplace (%)","PNO marketing (%)","Fixní náklady na kus (Kč)","Reklamace / vrácení (%)","Sleva / akce (%)"];
  const CSV_EX = [["Mixér G21 Perfection","1200","2490","89","25","15","8","30","2","0"],["Odšťavňovač G21 Juicer","2800","5490","0","35","15","10","30","3","5"],["Smoothie maker G21","650","1290","65","20","12","6","15","1.5","0"]];
  const dlTemplate = () => { const c = "\uFEFF" + [CSV_H,...CSV_EX].map(r=>r.join(";")).join("\n"); const b = new Blob([c],{type:"text/csv;charset=utf-8"}); const u = URL.createObjectURL(b); Object.assign(document.createElement("a"),{href:u,download:"marze-sablona.csv"}).click(); URL.revokeObjectURL(u); };
  const parseCSV = (t) => { const l=t.split(/\r?\n/).filter(x=>x.trim()); if(l.length<2) throw new Error("Soubor musí mít hlavičku + data."); const d=l[0].includes(";")?";":l[0].includes("\t")?"\t":","; const pl=(ln)=>{const p=[];let c="",q=false;for(let i=0;i<ln.length;i++){if(ln[i]==='"')q=!q;else if(ln[i]===d&&!q){p.push(c.trim());c="";}else c+=ln[i];}p.push(c.trim());return p;}; const imp=[]; for(let i=1;i<l.length;i++){const v=pl(l[i]);if(v.length<2||v.every(x=>!x))continue;const g=(j)=>{const r=(v[j]||"").replace(/\s/g,"").replace(",",".");const n=parseFloat(r);return isNaN(n)?"":String(n);}; const cv={}; customFields.forEach(f=>{cv[f.id]="";}); imp.push({id:uid()+i,name:v[0]||`Produkt ${i}`,purchasePrice:g(1),sellingPrice:g(2),shippingCost:g(3),packagingCost:g(4),marketplaceCommission:g(5),pno:g(6),fixedCostPerUnit:g(7),returnRate:g(8),discountPercent:g(9),customValues:cv});}if(!imp.length)throw new Error("Žádné produkty.");return imp;};
  const handleFile = (f) => { if(!f)return; const e=f.name.slice(f.name.lastIndexOf(".")).toLowerCase(); if(![".csv",".txt",".tsv"].includes(e)){setImportSt({type:"error",message:"Nepodporovaný formát."});return;} const r=new FileReader(); r.onload=(ev)=>{try{const imp=parseCSV(ev.target.result);setProducts(p=>{const em=p.length===1&&!p[0].name&&!p[0].purchasePrice;return em?imp:[...p,...imp];});setImportSt({type:"success",message:`Naimportováno ${imp.length} produktů`});setTimeout(()=>setImportSt(null),4000);}catch(err){setImportSt({type:"error",message:err.message});}}; r.readAsText(f,"utf-8"); };
  const exportCSV = () => { const cfH=customFields.map(f=>`${f.name} (${f.type==="cost"?"náklad":"výnos"}, ${f.unit==="percent"?"%":cs})`); const h=["Produkt","Nákupní cena","Prodejní cena","Efektivní cena","Doprava","Balení","Provize %","PNO %","Fixní","Reklamace %","Sleva %",...cfH,"Hrubá Kč","Hrubá %","Čistá Kč","Čistá %","Break-even","Doporučená"]; const rows=results.filter(r=>r.result).map(({product:p,result:r})=>[p.name||"",p.purchasePrice,p.sellingPrice,r.effectiveSellingPrice.toFixed(2),p.shippingCost||0,p.packagingCost||0,p.marketplaceCommission||0,p.pno||0,p.fixedCostPerUnit||0,p.returnRate||0,p.discountPercent||0,...customFields.map(f=>p.customValues?.[f.id]||0),r.grossMarginCZK.toFixed(2),r.grossMarginPct.toFixed(2),r.netMarginCZK.toFixed(2),r.netMarginPct.toFixed(2),r.breakEvenPrice===Infinity?"N/A":r.breakEvenPrice.toFixed(2),r.recommendedPrice===Infinity?"N/A":r.recommendedPrice.toFixed(2)]); const c="\uFEFF"+[h,...rows].map(r=>r.join(";")).join("\n"); const b=new Blob([c],{type:"text/csv;charset=utf-8"}); const u=URL.createObjectURL(b); Object.assign(document.createElement("a"),{href:u,download:`marze-export-${new Date().toISOString().slice(0,10)}.csv`}).click(); URL.revokeObjectURL(u); };

  const simRes = useMemo(() => { if(!simProduct) return null; const m={...simProduct,customValues:{...simProduct.customValues}}; Object.keys(simOverrides).forEach(k=>{if(k.startsWith("cf_")){m.customValues[k]=String(simOverrides[k]);}else{m[k]=String(simOverrides[k]);}}); return calculate(m,customFields); }, [simProduct, simOverrides, customFields]);
  const origSim = useMemo(() => simProduct ? calculate(simProduct, customFields) : null, [simProduct, customFields]);
  const tMargin = parseFloat(targetMarginInput) || 20;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.font }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`input[type=range]{-webkit-appearance:none;appearance:none;background:${T.border};border-radius:99px;height:5px;outline:none}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:${T.accent};cursor:pointer;border:3px solid #fff;box-shadow:0 2px 8px rgba(232,93,38,0.3)}input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}input[type=number]{-moz-appearance:textfield}::selection{background:${T.accent}30}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.fade-up{animation:fadeUp 0.35s ease both}tr:hover td{background:${T.surfaceAlt}!important}`}</style>

      {/* HERO */}
      <div style={{ background: "linear-gradient(160deg, #1a1614 0%, #2d2420 40%, #3d2818 100%)", padding: "44px 24px 52px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -40, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,93,38,0.15) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -60, left: "20%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accentGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 16px rgba(232,93,38,0.3)" }}>📊</div>
            <div><h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: "#fff", letterSpacing: "-0.03em" }}>Margin<span style={{ color: T.accent }}>Pro</span></h1><p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>Kalkulátor marže pro e-commerce</p></div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 28, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 50, padding: 4, display: "flex", gap: 2 }}>
              {[{k:"calculator",l:"Kalkulátor"},{k:"overview",l:"Přehled"},{k:"simulation",l:"Simulace"}].map(t => (
                <button key={t.k} onClick={() => setActiveTab(t.k)} style={{ padding: "9px 20px", border: "none", borderRadius: 50, background: activeTab === t.k ? "#fff" : "transparent", color: activeTab === t.k ? T.text : "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13, fontFamily: T.font, fontWeight: 600, transition: "all 0.25s" }}>{t.l}</button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.06)", borderRadius: 50, padding: 3 }}>
              {Object.keys(CURRENCIES).map(k => (<button key={k} onClick={() => setCurrency(k)} style={{ padding: "7px 12px", border: "none", borderRadius: 50, background: currency === k ? T.accent : "transparent", color: currency === k ? "#fff" : "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 11, fontFamily: T.mono, fontWeight: 700, transition: "all 0.2s" }}>{k}</button>))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* CUSTOM FIELDS MANAGER */}
        <Box style={{ marginBottom: 20, border: showFieldEditor ? `2px solid ${T.purple}25` : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>⚙️</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Vlastní pole</span>
              {customFields.length > 0 && <span style={{ background: T.purpleSoft, color: T.purple, padding: "2px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700, fontFamily: T.mono }}>{customFields.length}</span>}
            </div>
            <button onClick={() => setShowFieldEditor(!showFieldEditor)} style={{ background: showFieldEditor ? T.surfaceAlt : T.purpleSoft, border: `1px solid ${showFieldEditor ? T.border : T.purple+"30"}`, borderRadius: 8, color: showFieldEditor ? T.textMuted : T.purple, cursor: "pointer", padding: "7px 16px", fontSize: 12, fontFamily: T.font, fontWeight: 700 }}>
              {showFieldEditor ? "Skrýt" : "+ Spravovat pole"}
            </button>
          </div>

          {/* Existing fields tags */}
          {customFields.length > 0 && !showFieldEditor && (
            <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
              {customFields.map(f => (
                <span key={f.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: f.type === "cost" ? T.negativeSoft : T.positiveSoft, padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, color: f.type === "cost" ? T.negative : T.positive, border: `1px solid ${f.type === "cost" ? "#fecaca" : "#bbf7d0"}` }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: f.color }} />
                  {f.name}
                  <span style={{ color: T.textLight, fontWeight: 400 }}>({f.type === "cost" ? "náklad" : "výnos"}, {f.unit === "percent" ? "%" : cs})</span>
                </span>
              ))}
            </div>
          )}

          {showFieldEditor && (
            <div style={{ marginTop: 20 }}>
              {/* Existing fields list */}
              {customFields.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  {customFields.map(f => (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: T.surfaceAlt, borderRadius: T.radiusSm, marginBottom: 6, border: `1px solid ${T.borderLight}` }}>
                      <span style={{ width: 10, height: 10, borderRadius: 4, background: f.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{f.name}</span>
                      <span style={{ background: f.type === "cost" ? T.negativeSoft : T.positiveSoft, color: f.type === "cost" ? T.negative : T.positive, padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{f.type === "cost" ? "NÁKLAD" : "VÝNOS"}</span>
                      <span style={{ background: T.bg, color: T.textMuted, padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{f.unit === "percent" ? "%" : cs}</span>
                      <button onClick={() => removeCustomField(f.id)} style={{ background: "transparent", border: "none", color: T.negative, cursor: "pointer", fontSize: 16, padding: "2px 6px" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new field form */}
              <div style={{ background: T.surfaceAlt, borderRadius: T.radius, padding: 20, border: `1px solid ${T.borderLight}` }}>
                <div style={{ fontSize: 11, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, fontWeight: 700 }}>Přidat nové pole</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, display: "block", marginBottom: 5 }}>NÁZEV</label>
                    <input type="text" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="např. Cashback, Bonus, Clo..."
                      style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.borderLight}`, borderRadius: T.radiusSm, background: T.bg, color: T.text, fontSize: 14, fontFamily: T.font, fontWeight: 500, outline: "none", boxSizing: "border-box" }}
                      onKeyDown={(e) => { if (e.key === "Enter") addCustomField(); }}
                      onFocus={(e) => { e.target.style.borderColor = T.purple; }} onBlur={(e) => { e.target.style.borderColor = T.borderLight; }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, display: "block", marginBottom: 5 }}>TYP</label>
                    <PillToggle options={[{ value: "cost", label: "📉 Náklad" }, { value: "revenue", label: "📈 Výnos" }]} value={newFieldType} onChange={setNewFieldType} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, display: "block", marginBottom: 5 }}>JEDNOTKA</label>
                    <PillToggle options={[{ value: "currency", label: `${cs} Částka` }, { value: "percent", label: "% Procenta" }]} value={newFieldUnit} onChange={setNewFieldUnit} />
                  </div>
                  <button onClick={addCustomField} disabled={!newFieldName.trim()} style={{ padding: "10px 22px", background: newFieldName.trim() ? `linear-gradient(135deg, ${T.purple}, #6d28d9)` : T.surfaceAlt, border: "none", borderRadius: T.radiusSm, color: newFieldName.trim() ? "#fff" : T.textLight, cursor: newFieldName.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 700, fontFamily: T.font, boxShadow: newFieldName.trim() ? "0 4px 12px rgba(124,58,237,0.25)" : "none" }}>+ Přidat</button>
                </div>
              </div>
            </div>
          )}
        </Box>

        {/* CALCULATOR */}
        {activeTab === "calculator" && (<div className="fade-up">
          {summary && (<div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
            <Metric label="Produktů" value={summary.count} color={T.accent} bg={T.accentSoft} small />
            <Metric label="Celkový obrat" value={fmt(summary.totalRevenue)} color={T.purple} bg={T.purpleSoft} small />
            <Metric label="Celková čistá marže" value={fmt(summary.totalNetMargin)} color={mCol(summary.avgNetMarginPct)} bg={mBg(summary.avgNetMarginPct)} small />
            <Metric label="Průměrná marže" value={fmtP(summary.avgNetMarginPct)} color={mCol(summary.avgNetMarginPct)} bg={mBg(summary.avgNetMarginPct)} small />
          </div>)}

          {products.map((pr, idx) => { const res = calculate(pr, customFields); return (
            <Box key={pr.id} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <span style={{ background: T.accentGrad, color: "#fff", width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, fontFamily: T.mono, flexShrink: 0, boxShadow: "0 2px 8px rgba(232,93,38,0.2)" }}>{idx + 1}</span>
                  <input type="text" value={pr.name} onChange={(e) => upd(pr.id, "name", e.target.value)} placeholder="Název produktu" style={{ background: "transparent", border: "none", outline: "none", color: T.text, fontSize: 18, fontWeight: 700, fontFamily: T.font, width: "100%", letterSpacing: "-0.02em" }} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => dupP(pr.id)} style={{ background: T.surfaceAlt, border: `1px solid ${T.borderLight}`, borderRadius: 8, color: T.textMuted, cursor: "pointer", padding: "7px 12px", fontSize: 12, fontFamily: T.font, fontWeight: 600 }}>⧉ Kopie</button>
                  {products.length > 1 && <button onClick={() => remP(pr.id)} style={{ background: T.negativeSoft, border: "1px solid #fecaca", borderRadius: 8, color: T.negative, cursor: "pointer", padding: "7px 12px", fontSize: 12 }}>✕</button>}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 14, marginBottom: customFields.length > 0 ? 8 : 22 }}>
                <Inp label="Nákupní cena" value={pr.purchasePrice} onChange={v => upd(pr.id,"purchasePrice",v)} suffix={cs} />
                <Inp label="Prodejní cena" value={pr.sellingPrice} onChange={v => upd(pr.id,"sellingPrice",v)} suffix={cs} />
                <Inp label="Doprava" value={pr.shippingCost} onChange={v => upd(pr.id,"shippingCost",v)} suffix={cs} optional />
                <Inp label="Balení / expedice" value={pr.packagingCost} onChange={v => upd(pr.id,"packagingCost",v)} suffix={cs} optional />
                <Inp label="Provize marketplace" value={pr.marketplaceCommission} onChange={v => upd(pr.id,"marketplaceCommission",v)} suffix="%" optional />
                <Inp label="PNO / Marketing" value={pr.pno} onChange={v => upd(pr.id,"pno",v)} suffix="%" optional />
                <Inp label="Fixní náklady/ks" value={pr.fixedCostPerUnit} onChange={v => upd(pr.id,"fixedCostPerUnit",v)} suffix={cs} optional />
                <Inp label="Reklamace / vrácení" value={pr.returnRate} onChange={v => upd(pr.id,"returnRate",v)} suffix="%" optional />
                <Inp label="Sleva / akce" value={pr.discountPercent} onChange={v => upd(pr.id,"discountPercent",v)} suffix="%" optional />
              </div>
              {/* Custom fields */}
              {customFields.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 14, marginBottom: 22, paddingTop: 8, borderTop: `1px dashed ${T.borderLight}` }}>
                  {customFields.map(f => (
                    <Inp key={f.id} label={`${f.type === "revenue" ? "📈 " : ""}${f.name}`} value={pr.customValues?.[f.id] || ""} onChange={v => updCustom(pr.id, f.id, v)} suffix={f.unit === "percent" ? "%" : cs} optional labelColor={f.color} />
                  ))}
                </div>
              )}
              {res && (<div>
                <div style={{ height: 1, background: T.border, marginBottom: 18 }} />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Metric label="Efektivní cena" value={fmt(res.effectiveSellingPrice)} color={T.purple} bg={T.purpleSoft} small />
                  <Metric label="Hrubá marže" value={`${fmt(res.grossMarginCZK)} (${fmtP(res.grossMarginPct)})`} color={mCol(res.grossMarginPct)} bg={mBg(res.grossMarginPct)} small />
                  <Metric label="Čistá marže" value={`${fmt(res.netMarginCZK)} (${fmtP(res.netMarginPct)})`} color={mCol(res.netMarginPct)} bg={mBg(res.netMarginPct)} small />
                  <Metric label="Break-even" value={res.breakEvenPrice===Infinity?"N/A":fmt(res.breakEvenPrice)} color={T.warning} bg={T.warningSoft} small />
                  <Metric label={`Doporučená (${tMargin}%)`} value={res.recommendedPrice===Infinity?"N/A":fmt(res.recommendedPrice)} color={T.positive} bg={T.positiveSoft} small />
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 600 }}>Rozložení</div>
                  <div style={{ display: "flex", borderRadius: 99, overflow: "hidden", height: 10, background: T.surfaceAlt }}>
                    {costBC.map(c => { const v = res.costBreakdown[c.key]; return v > 0 ? <div key={c.key} title={`${c.label}: ${fmt(v)}`} style={{ flex: v, background: c.color }} /> : null; })}
                    {customFields.filter(f=>f.type==="cost").map(f => { const v = res.customBreakdown?.[f.id]||0; return v > 0 ? <div key={f.id} title={`${f.name}: ${fmt(v)}`} style={{ flex: v, background: f.color }} /> : null; })}
                    {res.netMarginCZK > 0 && <div style={{ flex: res.netMarginCZK, background: T.positive }} />}
                  </div>
                  <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
                    {costBC.filter(c => res.costBreakdown[c.key] > 0).map(c => (<span key={c.key} style={{ fontSize: 10, fontFamily: T.mono, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 3, background: c.color, display: "inline-block" }} /><span style={{ color: T.textMuted }}>{c.label}</span> <span style={{ color: T.text }}>{fmt(res.costBreakdown[c.key])}</span></span>))}
                    {customFields.map(f => { const v = res.customBreakdown?.[f.id]||0; return v > 0 ? <span key={f.id} style={{ fontSize: 10, fontFamily: T.mono, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 3, background: f.color, display: "inline-block" }} /><span style={{ color: T.textMuted }}>{f.name} {f.type==="revenue"?"📈":""}</span> <span style={{ color: f.type==="revenue"?T.positive:T.text }}>{fmt(v)}</span></span> : null; })}
                    {res.netMarginCZK > 0 && <span style={{ fontSize: 10, fontFamily: T.mono, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 3, background: T.positive, display: "inline-block" }} /><span style={{ color: T.textMuted }}>Marže</span> <span style={{ color: T.positive }}>{fmt(res.netMarginCZK)}</span></span>}
                  </div>
                </div>
              </div>)}
            </Box>
          ); })}

          {showImport && (<Box style={{ marginBottom: 16, border: `2px solid ${T.accent}30` }}>
            <button onClick={() => { setShowImport(false); setImportSt(null); }} style={{ position: "absolute", top: 20, right: 20, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textMuted, cursor: "pointer", padding: "5px 10px", fontSize: 14, zIndex: 2 }}>✕</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}><span style={{ fontSize: 24 }}>📋</span><h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Hromadný import produktů</h3></div>
            <p style={{ color: T.textMuted, fontSize: 13, margin: "4px 0 24px", lineHeight: 1.6 }}>Stáhněte šablonu, vyplňte produkty v Excelu/Sheets a nahrajte zpět.</p>
            <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260, background: T.surfaceAlt, borderRadius: T.radius, padding: 22, border: `1px solid ${T.borderLight}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ background: T.accentGrad, color: "#fff", width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, fontFamily: T.mono }}>1</span><span style={{ fontSize: 14, fontWeight: 700 }}>Stáhněte šablonu</span></div>
                <p style={{ color: T.textMuted, fontSize: 12, margin: "0 0 14px" }}>CSV s hlavičkou a 3 ukázkovými produkty.</p>
                <button onClick={dlTemplate} style={{ padding: "11px 22px", background: T.accentGrad, border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: T.font, boxShadow: "0 4px 16px rgba(232,93,38,0.25)" }}>⬇ Stáhnout šablonu</button>
              </div>
              <div style={{ flex: 1, minWidth: 260, background: T.surfaceAlt, borderRadius: T.radius, padding: 22, border: `1px solid ${T.borderLight}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ background: `linear-gradient(135deg, ${T.positive}, #059669)`, color: "#fff", width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, fontFamily: T.mono }}>2</span><span style={{ fontSize: 14, fontWeight: 700 }}>Nahrajte soubor</span></div>
                <div onDrop={(e)=>{e.preventDefault();setIsDrag(false);handleFile(e.dataTransfer?.files?.[0]);}} onDragOver={(e)=>{e.preventDefault();setIsDrag(true);}} onDragLeave={()=>setIsDrag(false)} onClick={()=>document.getElementById("csv-input")?.click()} style={{ border: `2px dashed ${isDrag?T.accent:T.border}`, borderRadius: T.radiusSm, padding: "22px 16px", textAlign: "center", cursor: "pointer", background: isDrag?T.accentSoft:"transparent" }}>
                  <input id="csv-input" type="file" accept=".csv,.txt,.tsv" style={{ display: "none" }} onChange={(e)=>{handleFile(e.target.files?.[0]);e.target.value="";}} />
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{isDrag?"📥":"📄"}</div>
                  <div style={{ color: T.textMuted, fontSize: 12 }}><span style={{ color: T.accent, fontWeight: 700 }}>Klikněte</span> nebo přetáhněte CSV</div>
                </div>
              </div>
            </div>
            {importSt && (<div style={{ marginTop: 14, padding: "12px 18px", borderRadius: T.radiusSm, background: importSt.type==="success"?T.positiveSoft:T.negativeSoft, border: `1px solid ${importSt.type==="success"?"#bbf7d0":"#fecaca"}`, color: importSt.type==="success"?T.positive:T.negative, fontSize: 13, fontWeight: 700 }}>{importSt.type==="success"?"✓":"⚠"} {importSt.message}</div>)}
          </Box>)}

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={addP} style={{ padding: "12px 26px", background: T.text, border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: T.font }}>+ Přidat produkt</button>
            <button onClick={()=>setShowImport(!showImport)} style={{ padding: "12px 24px", background: showImport?T.surfaceAlt:T.accentGrad, border: showImport?`1px solid ${T.border}`:"none", borderRadius: 12, color: showImport?T.textMuted:"#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: T.font }}>📋 {showImport?"Skrýt import":"Import z CSV"}</button>
            <button onClick={exportCSV} style={{ padding: "12px 24px", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 12, color: T.textMuted, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: T.font }}>📥 Export</button>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.surface, padding: "8px 16px", borderRadius: 12, border: `1px solid ${T.borderLight}` }}>
              <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 800 }}>Cíl:</span>
              <input type="number" value={targetMarginInput} onChange={(e)=>setTargetMarginInput(e.target.value)} style={{ width: 50, padding: "6px 8px", background: T.bg, border: `1px solid ${T.borderLight}`, borderRadius: 8, color: T.text, fontSize: 13, fontFamily: T.mono, fontWeight: 700, textAlign: "center", outline: "none" }} />
              <span style={{ fontSize: 12, color: T.accent, fontWeight: 800 }}>%</span>
            </div>
          </div>
        </div>)}

        {/* OVERVIEW */}
        {activeTab === "overview" && (<div className="fade-up"><Box noPad>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>{["#","Produkt","Nákup","Prodej","Efektivní","Hrubá","Čistá","Čistá %","Break-even"].map((h,i)=>(<th key={i} style={{ padding: "16px 14px", textAlign: i>1?"right":"left", color: T.textLight, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `2px solid ${T.border}`, background: T.surfaceAlt, whiteSpace: "nowrap" }}>{h}</th>))}</tr></thead>
              <tbody>{results.map(({product:p,result:r},i)=>(<tr key={p.id}>
                <td style={{ padding: 14, color: T.textLight, fontFamily: T.mono, fontWeight: 700, borderBottom: `1px solid ${T.borderLight}` }}>{i+1}</td>
                <td style={{ padding: 14, fontWeight: 700, minWidth: 120, borderBottom: `1px solid ${T.borderLight}` }}>{p.name||"Bez názvu"}</td>
                <td style={{ padding: 14, textAlign: "right", fontFamily: T.mono, color: T.textMuted, borderBottom: `1px solid ${T.borderLight}` }}>{fmt(parseFloat(p.purchasePrice)||0)}</td>
                <td style={{ padding: 14, textAlign: "right", fontFamily: T.mono, color: T.textMuted, borderBottom: `1px solid ${T.borderLight}` }}>{fmt(parseFloat(p.sellingPrice)||0)}</td>
                <td style={{ padding: 14, textAlign: "right", fontFamily: T.mono, fontWeight: 600, borderBottom: `1px solid ${T.borderLight}` }}>{r?fmt(r.effectiveSellingPrice):"—"}</td>
                <td style={{ padding: 14, textAlign: "right", fontFamily: T.mono, fontWeight: 600, color: r?mCol(r.grossMarginPct):T.textLight, borderBottom: `1px solid ${T.borderLight}` }}>{r?fmt(r.grossMarginCZK):"—"}</td>
                <td style={{ padding: 14, textAlign: "right", fontFamily: T.mono, fontWeight: 800, color: r?mCol(r.netMarginPct):T.textLight, borderBottom: `1px solid ${T.borderLight}` }}>{r?fmt(r.netMarginCZK):"—"}</td>
                <td style={{ padding: 14, textAlign: "right", fontFamily: T.mono, fontWeight: 800, borderBottom: `1px solid ${T.borderLight}` }}>{r?<span style={{ background: mBg(r.netMarginPct), color: mCol(r.netMarginPct), padding: "4px 10px", borderRadius: 6, fontSize: 12 }}>{fmtP(r.netMarginPct)}</span>:"—"}</td>
                <td style={{ padding: 14, textAlign: "right", fontFamily: T.mono, fontWeight: 600, color: T.warning, borderBottom: `1px solid ${T.borderLight}` }}>{r?(r.breakEvenPrice===Infinity?"N/A":fmt(r.breakEvenPrice)):"—"}</td>
              </tr>))}</tbody>
            </table>
          </div>
          {summary && (<div style={{ display: "flex", gap: 12, padding: 22, borderTop: `2px solid ${T.border}`, background: T.surfaceAlt, flexWrap: "wrap" }}>
            <Metric label="Produktů" value={summary.count} color={T.accent} bg={T.surface} small />
            <Metric label="Obrat" value={fmt(summary.totalRevenue)} color={T.purple} bg={T.surface} small />
            <Metric label="Čistá marže" value={fmt(summary.totalNetMargin)} color={mCol(summary.avgNetMarginPct)} bg={T.surface} small />
            <Metric label="Ø Marže" value={fmtP(summary.avgNetMarginPct)} color={mCol(summary.avgNetMarginPct)} bg={T.surface} small />
          </div>)}
        </Box></div>)}

        {/* SIMULATION */}
        {activeTab === "simulation" && (<div className="fade-up">
          <Box style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, fontWeight: 700 }}>Vyber produkt pro simulaci</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {products.map((p, i)=>(<button key={p.id} onClick={()=>{setSimProduct(p);setSimOverrides({});}} style={{ padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: T.font, background: simProduct?.id===p.id?T.text:T.surfaceAlt, color: simProduct?.id===p.id?"#fff":T.textMuted, border: simProduct?.id===p.id?"none":`1px solid ${T.border}` }}>{p.name||`Produkt ${i+1}`}</button>))}
            </div>
          </Box>

          {simProduct && origSim && simRes ? (<Box>
            <h3 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>🔬 {simProduct.name||"Produkt"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
              <div>
                <Slider label="Prodejní cena" value={simOverrides.sellingPrice??parseFloat(simProduct.sellingPrice)||0} onChange={v=>setSimOverrides(p=>({...p,sellingPrice:v}))} min={0} max={Math.max((parseFloat(simProduct.sellingPrice)||100)*3,500)} step={1} suffix={` ${cs}`} />
                <Slider label="PNO" value={simOverrides.pno??parseFloat(simProduct.pno)||0} onChange={v=>setSimOverrides(p=>({...p,pno:v}))} min={0} max={50} step={0.5} suffix=" %" />
                <Slider label="Marketplace" value={simOverrides.marketplaceCommission??parseFloat(simProduct.marketplaceCommission)||0} onChange={v=>setSimOverrides(p=>({...p,marketplaceCommission:v}))} min={0} max={40} step={0.5} suffix=" %" />
                <Slider label="Sleva" value={simOverrides.discountPercent??parseFloat(simProduct.discountPercent)||0} onChange={v=>setSimOverrides(p=>({...p,discountPercent:v}))} min={0} max={80} step={1} suffix=" %" />
                <Slider label="Nákupní cena" value={simOverrides.purchasePrice??parseFloat(simProduct.purchasePrice)||0} onChange={v=>setSimOverrides(p=>({...p,purchasePrice:v}))} min={0} max={Math.max((parseFloat(simProduct.purchasePrice)||100)*3,500)} step={1} suffix={` ${cs}`} />
                {customFields.map(f=>(<Slider key={f.id} label={f.name} value={simOverrides[f.id]??parseFloat(simProduct.customValues?.[f.id])||0} onChange={v=>setSimOverrides(p=>({...p,[f.id]:v}))} min={0} max={f.unit==="percent"?50:Math.max(parseFloat(simProduct.customValues?.[f.id]||"100")*3,500)} step={f.unit==="percent"?0.5:1} suffix={f.unit==="percent"?" %":` ${cs}`} />))}
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, fontWeight: 700 }}>Původní → Simulace</div>
                {[
                  {l:"Efektivní cena",o:fmt(origSim.effectiveSellingPrice),s:fmt(simRes.effectiveSellingPrice)},
                  {l:"Hrubá marže",o:fmtP(origSim.grossMarginPct),s:fmtP(simRes.grossMarginPct),cO:mCol(origSim.grossMarginPct),cS:mCol(simRes.grossMarginPct)},
                  {l:`Čistá marže ${cs}`,o:fmt(origSim.netMarginCZK),s:fmt(simRes.netMarginCZK),cO:mCol(origSim.netMarginPct),cS:mCol(simRes.netMarginPct)},
                  {l:"Čistá marže %",o:fmtP(origSim.netMarginPct),s:fmtP(simRes.netMarginPct),cO:mCol(origSim.netMarginPct),cS:mCol(simRes.netMarginPct)},
                  {l:"Break-even",o:origSim.breakEvenPrice===Infinity?"N/A":fmt(origSim.breakEvenPrice),s:simRes.breakEvenPrice===Infinity?"N/A":fmt(simRes.breakEvenPrice)},
                ].map((r,i)=>(<div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", background: i%2===0?T.surfaceAlt:"transparent", borderRadius: T.radiusSm, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: T.textMuted, flex: 1, fontWeight: 500 }}>{r.l}</span>
                  <span style={{ fontSize: 13, fontFamily: T.mono, color: r.cO||T.textMuted, flex: 1, textAlign: "right" }}>{r.o}</span>
                  <span style={{ color: T.textLight, margin: "0 10px", fontSize: 16 }}>→</span>
                  <span style={{ fontSize: 13, fontFamily: T.mono, fontWeight: 800, color: r.cS||T.text, flex: 1, textAlign: "right" }}>{r.s}</span>
                </div>))}
                <div style={{ marginTop: 20, padding: 20, textAlign: "center", borderRadius: T.radius, background: simRes.netMarginCZK>=origSim.netMarginCZK?T.positiveSoft:T.negativeSoft, border: `2px solid ${simRes.netMarginCZK>=origSim.netMarginCZK?"#bbf7d0":"#fecaca"}` }}>
                  <div style={{ fontSize: 10, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 700 }}>Změna čisté marže</div>
                  <div style={{ fontSize: 28, fontWeight: 900, fontFamily: T.mono, letterSpacing: "-0.03em", color: simRes.netMarginCZK>=origSim.netMarginCZK?T.positive:T.negative }}>{simRes.netMarginCZK-origSim.netMarginCZK>=0?"+":""}{fmt(simRes.netMarginCZK-origSim.netMarginCZK)}</div>
                  <div style={{ fontSize: 15, fontFamily: T.mono, fontWeight: 700, marginTop: 4, color: simRes.netMarginPct>=origSim.netMarginPct?T.positive:T.negative }}>{simRes.netMarginPct-origSim.netMarginPct>=0?"+":""}{(simRes.netMarginPct-origSim.netMarginPct).toFixed(2)} p.b.</div>
                </div>
              </div>
            </div>
          </Box>):!simProduct&&(<Box style={{ textAlign: "center", padding: 56 }}><div style={{ fontSize: 40, marginBottom: 12 }}>🔬</div><div style={{ color: T.textMuted, fontSize: 15 }}>Vyber produkt výše pro spuštění simulace</div></Box>)}
        </div>)}
      </div>
    </div>
  );
}
