import React, { useState, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// VERSION HISTORY
// v1.0  Initial release — CEDEARs, Merval, Crypto sections, monthly navigation,
//       localStorage persistence, ARS/USD toggle, FX rates panel
// v1.1  Added Pesos & Dólares cash panels, Grand Totals row, per-section pie charts
// v1.2  Added sort buttons (V. Actual / P&L), Compare mode with asset delta cards,
//       Export/Import JSON, fixed row.reduce bug, fixed cash input focus bug
// v2.0  Full UI refresh: Nunito font, improved cards, collapsible compare panels
//       with NUEVO/SALIÓ badges, visual delta bars, section total deltas
// v2.1  Comment bubble on CEDEARs/Merval/Crypto headers — New, Edit, Delete
// v2.2  Zero P&L shown in amber, positive green, negative red throughout
// v2.3  Copiar button — copies tickers, names and buy prices to next month
// v2.4  CEDEARs prices now in ARS, converted to USD via MEP (not CCL)
// v2.5  EOT tab: line chart + summary cards + monthly breakdown table
// v2.6  Expenses tab: flexible categories, inline editing, monthly totals
// v2.7  Expenses: orange accent, fixed delete (inline confirm replaces window.confirm)
// v2.8  Expenses: sparkline per item, comment bubble per month cell
// ─────────────────────────────────────────────────────────────────────────────
const APP_VERSION = "2.8";
const APP_BUILD   = new Date("2026-05-23").toISOString().slice(0,10);


const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600&family=DM+Mono:wght@400;500&family=Nunito:wght@600;700;800&display=swap');
`;

const C = {
  bg: "#0d0d0f",
  surface: "#131316",
  card: "#18181c",
  cardHover: "#1e1e24",
  border: "#26262e",
  accent: "#6c63ff",
  accentSoft: "rgba(108,99,255,0.15)",
  green: "#34d399",
  greenBg: "rgba(52,211,153,0.08)",
  red: "#f87171",
  redBg: "rgba(248,113,113,0.08)",
  amber: "#f59e0b",
  amberBg: "rgba(245,158,11,0.08)",
  text: "#f0f0f5",
  textSub: "#a0a0b8",
  textMuted: "#5a5a72",
  cedear: "#f59e0b",
  pesos: "#38bdf8",
  crypto: "#a78bfa",
};

const SECTION_META = {
  cedears: { label: "CEDEARs", sub: "Mercado argentino · ARS", currency: "ARS", color: C.cedear, emoji: "🏦" },
  pesos:   { label: "Merval", sub: "Renta local · ARS", currency: "ARS", color: C.pesos,  emoji: "📈" },
  crypto:  { label: "Crypto",        sub: "Activos digitales · USD", currency: "USD", color: C.crypto, emoji: "⬡" },
};

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ── Lookup tables ────────────────────────────────────────────────────────────
const CEDEAR_NAMES = {
  AABA:"Altaba Inc.",AAL:"American Airlines Group Inc",AAP:"Advanced Auto Parts Inc",AAPL:"Apple Inc.",ABBV:"AbbVie Inc.",ABEV:"Ambev S.A.",
  ABNB:"Airbnb Inc",ABT:"Abbott Labs",ACN:"Accenture",ADBE:"Adobe Systems Incorporated",ADGO:"Adecoagro S.A.",ADI:"Analog Devices",
  ADP:"Automatic Data Processing Inc.",ADS:"Adidas AG",AEG:"Aegon N.V.",AEM:"Agnico Eagle Mines Limited",AIG:"American International Group (AIG)",
  "AKO.B":"Embotelladora Andina S.A.",AMAT:"Applied Materials Inc.",AMD:"Advanced Micro Devices, Inc.",AMGN:"Amgen Inc.",AMX:"America Movil",
  AMZN:"Amazon.Com, Inc.",ANF:"Abercrombie & Fitch Co",AOCA:"Aluminum Corp Of China",ARKK:"ARK INNOVATION",ARM:"ARM Holdings Plc",ASML:"ASML Holdings.",
  ATAD:"Pjsc Tatneft",AUY:"Yamana Gold Inc.",AVGO:"Broadcom Inc.",AVY:"Avery Dennison Corp.",AXP:"American Express Co",AZN:"Astrazeneca Plc",
  B:"Barrick Gold Corp",BA:"The Boeing Company","BA.C":"Bank Of America Corporation",BABA:"Alibaba Group Holding Limited",BAK:"Braskem SA",BAS:"Basf SE",
  BAYN:"Bayer AG",BB:"Blackberry Limited",BBAS3:"Banco do Brasil S.A.",BBD:"Banco Bradesco S.A.",BBV:"Bilbao Vizcaya Argentaria S.A.",BCS:"Barclays Bank Plc",
  BHP:"Bhp Group Ltd",BIDU:"Baidu, Inc.",BIIB:"Biogen Inc.",BIOX:"Bioceres Crop Solutions Corp.",BITF:"Bitfarms Ltd.",BK:"The Bank Of New York Mellon Corp.",
  BKNG:"Booking",BKR:"Baker Hughes Co",BMY:"Bristol-Myers Squibb Company",BNG:"Bunge Limited",BP:"BP PCL",BRFS:"BRF S.A.",BRKB:"Berkshire Hathaway Inc.",
  BSBR:"Banco Santander (Brasil) S.A.",BSN:"Danone",C:"Citigroup Inc",CAAP:"Corporación America Airports S.A.",CAH:"Cardinal Health Inc",CAJ:"Canon Inc",
  CAR:"Avis Budget Group Inc.",CAT:"Caterpillar Inc",CBRB:"Companhia Brasileira De Dis NPV ADR",CCL:"Carnival",CDE:"Coeur Mining Inc.",
  CIBR:"NASDAQ Cybersecurity ETF",CL:"Colgate Palmolive Co",COIN:"Coinbase Global Inc",COST:"Costco Wholesale Corp",CRM:"Salesforce Inc.",CRWV:"Coreweave",
  CS:"Credit Suisse Group",CSCO:"Cisco Systems Inc",CVS:"CVS Health",CVX:"Chevron Corp.",CX:"Cemex S.A.B. de CV",DAL:"Delta Air Lines",
  DD:"Dupont de Nemours Inc.",DE:"Deere & Co.",DEO:"Diageo PLC",DESP:"Despegar.Com, Corp.",DHR:"Danaher Corp",DIA:"SPDR Dow Jones Industrial",
  DIS:"Disney Corp.",DOCU:"DocuSign Inc.",DOW:"DOW Inc",DTEA:"Deutsche Telekom Ag",E:"Eni Spa",EA:"Electronic Arts Inc",EBAY:"Ebay Inc.",
  EBR:"Eletrobras S.A.",EEM:"iShares MSCI Emerging Market",EFX:"Equifax Inc.",ELP:"Companhia Paranaense de Energía - COPEL",EOAN:"E.On Se",
  EQNR:"Equinor Asa",ERIC:"Lm Ericsson Telephone Co.",ERJ:"Embraer S.A.",ETHA:"iShares Ethereum ETF",ETSY:"Etsy Inc.",EWZ:"iShares MSCI Brazil Cap",
  F:"Ford Motor Company",FDX:"Fedex Corp",FSLR:"First Solar Inc.",FXI:"iShares China Large-Cap ETF",GE:"General Electric Co.",GFI:"Gold Fields Ltd.",
  GGB:"Gerdau S.A.",GILD:"Gilead Sciences, Inc.",GLD:"ETF SPDR Gold Trust",GLOB:"Globant S.A.",GLW:"Corning Inc.",GM:"General Motors Co",
  GOLD:"Barrick Gold Corp",GOOGL:"Alphabet Inc.",GPRK:"Geopark Ltd.",GS:"The Goldman Sachs Group, Inc",GSK:"GSK Plc.",GT:"Goodyear Tire & Rubber co./the",
  HAL:"Halliburton Co.",HAPV3:"Hapvida Participacoes E Investimentos S.A.",HD:"The Home Depot Inc.",HDB:"Hdfc Bank Limited.",
  HHPD:"Hon Hai Precision Industry Co. Ltd.",HL:"Hecla Mining Co .",HMC:"Honda Motor Co. Ltd",HMY:"Harmony Gold Mining Company Ltd.",
  HNPIY:"Huaneng Power Intl",HOG:"Harley-Davidson Inc.",HON:"Honeywell International Inc.",HPQ:"HP Inc",HSBC:"Hsbc Holdings Plc",HSY:"The Hershey Company",
  HUT:"Hut 8 Mining Corp.",HWM:"Howmet Aerospace Inc.",IBB:"iShares Nasdaq Biotechnology ETF",IBIT:"iShares Bitcoin Trust",
  IBM:"International Business Machines",IBN:"Icici Bank Ltd.",IEUR:"iShares Core MSCI Europe ETF",IFF:"International Flavors & Fragrances Inc.",
  INFY:"Infosys Limited",ING:"Ing Groep Nv",INTC:"Intel Corporation",IP:"International Paper Co.",ISRG:"Intuitive Surgical inc",
  ITUB:"Itaú Unibanco Holding S.A.",IVE:"iShares S&P 500 Value ETF",IVW:"iShares S&P 500 Growth ETF",IWM:"iShares Trust Rusell 2000",
  JCI:"Johnson Controls International",JD:"Jd.Com, Inc.",JMIA:"Adr Jumia Technologies Ag",JNJ:"Johnson & Johnson",JPM:"J.P. Morgan & Chase Co.",
  KB:"Kb Financial Group Inc.",KEP:"Korea Electric Power Corp.",KGC:"Kinross Gold Corp",KMB:"Kimberly-Clark Corp.",KO:"The Coca Cola Company",
  LAAC:"Lithium Americas (Argentina) Corp",LAC:"Lithium Americas Corp",LFC:"China Life Insurance",LKOD:"Pjsc Lukoil",LLY:"Eli Lilly and Company",
  LMT:"Lockheed Martin Corporation",LND:"Brasilagro - Co Brasileira de Propriedades Agrícolas",LRCX:"Lam Research Corp",LREN3:"Lojas Renner S.A.",
  LVS:"Las Vegas Sands Corp",LYG:"Lloyds Banking Group Plc",MA:"Mastercard Inc.",MBG:"Mercedes-Benz Group AG",MBT:"Mobile Telesystems",
  MCD:"Mcdonald'S Corp.",MDLZ:"Mondelez",MDT:"Medtronic Public Limited Company",MELI:"Mercadolibre Inc.",META:"Meta Platforms Inc",
  MFG:"Mizuho Financial Group",MGLU3:"Magazine Luiza S.A.",MMC:"Marsh & Mclennan Companies Inc.",MMM:"3M Company",MO:"Altria Group Inc.",
  MOS:"The Mosaic Co",MRK:"Merck & Co. Inc.",MRNA:"Moderna Inc",MRVL:"Marvell Technology Inc",MSFT:"Microsoft Corp.",MSI:"Motorola Solutions, Inc.",
  MSTR:"Microstrategy Inc Cl A New",MU:"Micron Technology Inc",MUFG:"Mitsubishi Ufj Financial Group",MUX:"McEwen Mining Inc",NEC1:"Nec Corporation",
  NEM:"Newmont Corporation",NFLX:"Netflix, Inc.",NG:"Novagold Resources INC.",NGG:"National Grid Plc",NIO:"NIO Inc.",NKE:"Nike Inc.",
  NLM:"Novolipetsk Steel PJSC",NMR:"Nomura Holdings, Inc",NOKA:"Nokia Corporation",NSAN:"Nissan Motor Co., Ltd",NTCO:"Natura & Co Holding S.A.",
  NTES:"Netease, Inc",NU:"Nubank",NUE:"Nucor Corp",NVDA:"Nvidia Corporation",NVS:"Novartis Ag",NXE:"Nexgen Energy LTD",ORAN:"Orange S.A.",
  ORCL:"Oracle Corporation",ORLY:"O'reilly Automotive Inc",OXY:"Occidental Petroleum Corp.",PAAS:"Pan American Silver Corp.",
  PAC:"Grupo Aeroportuario del Pacifico",PAGS:"Pagseguro Digital Ltd",PANW:"Palo Alto Networks Inc",PBI:"Pitney Bowes Inc",
  PBR:"Petrobras (ADR)",PCAR:"Paccar Inc.",PCRF:"Panasonic Corporation",PEP:"Pepsico Inc",PFE:"Pfizer Inc.",PG:"Procter & Gamble",
  PHG:"Koninklijke Philips N.V.",PINS:"Pinterest",PKS:"Posco Holdings Inc.",PLTR:"Palantir Technologies Inc",PM:"Philip Morris International",
  PRIO3:"Petro Rio S.A.",PSO:"Pearson Plc",PSX:"Phillips 66",PTR:"Petrochina Co Ltd",PYPL:"Paypal Holdings, Inc.",QCOM:"Qualcomm Inc.",
  QQQ:"Invesco QQQ Trust",RACE:"Ferrari",RBLX:"Roblox Corp.",RIO:"Rio Tinto Plc",RIOT:"Riot Platforms",ROKU:"Roku",ROST:"Ross Stores, Inc.",
  RTX:"Raytheon Technologies Corp",SAN:"Banco Santander S.A",SAP:"Sap Se",SATL:"Satellogic Inc.",SBS:"Paulo–Sabesp",SBUX:"Starbucks Corporation",
  SCCO:"Southern Copper Corp",SCHW:"Charles Schwab",SDA:"SunCar Technology Group Inc",SE:"Sea Ltd.",SH:"ProShares Short S&P500",
  SHEL:"Royal Dutch Shell Plc",SHOP:"Shopify Inc.",SHPW:"Shapeways Holdings Inc",SI:"Silvergate Bancorp",SID:"Companhia Siderúrgica Nacional",
  SIEGY:"Siemens Ag Adr",SLB:"Schlumberger Ltd",SMSN:"Samsung Electronics Co. Ltd.",SNA:"Snap-On Inc",SNAP:"Snap Inc.",SNOW:"Snowflake Inc.",
  SNP:"China Petroleum & Chem",SONY:"Sony Group Corporation",SPCE:"Virgin Galactic",SPGI:"S&P Global Inc",SPOT:"Spotify Technology S.A.",
  SPY:"SPDR S&P 500",SQ:"Square Inc.",STLA:"Stellantis",STNE:"StoneCo Ltd",SUZ:"Suzano Papel E Celulose S.A.",SWKS:"Skyworks Solutions",
  SYY:"Sysco Corp.",T:"AT&T Inc.",TCOM:"TRIP.COM Group Ltd.",TEFO:"Telefonica S.A.",TEN:"Tenaris",TGT:"Target Corporation",
  TIIAY:"Telecom Italia S.P.A. Ordinary Shares",TIMB:"Tim Participações S.A.",TJX:"TJX Companies Inc/The",TM:"Toyota Motor Corporation",
  TMO:"Thermo Fisher Scientific Inc.",TMUS:"T-mobile",TRIP:"Tripadvisor, Inc.",TRVV:"The Travelers Cos. Inc.",TSLA:"Tesla, Inc.",
  TSM:"Taiwan Semiconductor Manufacturing",TTE:"TotalEnergies SE",TWTR:"Twitter, Inc.",TXN:"Texas Instruments Inc",TXR:"Ternium S.A.",
  UAL:"United Airlines Holdings Inc.",UBER:"Uber Technologies Inc.",UNH:"UnitedHealth Group Inc.",UNP:"Union Pacific Corp.",URA:"Global X Uranium ETF",
  URBN:"Urban Outfitters INC.",USB:"U.S. Bancorp",V:"Visa Inc",VALE:"Vale S.A.",VEA:"Vanguard Developed Markets ETF",VIST:"Vista Energy S.A.B. de C.V.",
  VIV:"Telefônica Brasil S.A.",VOD:"Vodafone Group Plc",VRSN:"Verisign, Inc.",VZ:"Verizon Communications Inc.",WBA:"Walgreens Boots Alliance Inc.",
  WBO:"Weibo Corporation",WFC:"Wells Fargo & Co.",WMT:"Walmart Inc.",X:"United States Steel Corp.",XLB:"Materials Select Sector SPDR Fund",
  XLC:"Communication Services Select Sector SPDR Fund",XLE:"Energy Select Sector SPDR Fund",XLF:"Financial Select Sector SPDR Fund",
  XLI:"Industrial Select Sector SPDR Fund",XLK:"Technology Select Sector SPDR Fund",XLP:"Consumer Staples Select Sector SPDR Fund",
  XLRE:"Real Estate Select Sector SPDR Fund",XLU:"Utilities Select Sector SPDR Fund",XLV:"Health Care Select Sector SPDR Fund",
  XLY:"Consumer Discretionary Select Sector SPDR Fund",XOM:"Exxon Mobil Corporation",SLV:"iShares Silver Trust",XP:"XP Inc",XROX:"Xerox Holding Corporation",
  ZM:"Zoom Video Communications Inc."
};

const PESOS_NAMES = {
  AL30:"Bono AL30 · Ley Argentina",AL35:"Bono AL35 · Ley Argentina",
  GD30:"Bono GD30 · Ley Nueva York",GD35:"Bono GD35 · Ley Nueva York",
  LECAP:"Letras Capitalizables",LECER:"Letras CER",CER:"Bono CER",
  TY30P:"Boncer 2030",FCI:"Fondo Común de Inversión",PF:"Plazo Fijo",
  CAAP:"Aeropuertos Argentina",CEPU:"Central Puerto",
  COME:"Soc. Comercial del Plata",EDN:"Edenor",METR:"MetroGAS",
  DGCU2:"Distribuidora Gas Cuyana",SAMI:"Seguros Sancor",
  PAMP:"Pampa Energía",TGSU2:"Transportadora de Gas del Sur",TGNO4: "Transportadora de Gas del Norte",
  ALUA:"Aluar",GGAL:"Banco Galicia",YPFD:"YPF S.A.",TRAN:"Transener", BYMA:"Bolsas y Mercados Arg.",
  SUPV:"Banco Supervielle", BMA:"Banco Macro", IRSA:"IRSA Inversiones", CRES: "Cresud S.A.",
  LIQ: "Liquidez"
};

// ── Add your crypto tickers here ────────────────────────────────────────────
const CRYPTO_NAMES = {
  BTC:  "Bitcoin",
  ETH:  "Ethereum",
  USDT: "Tether",
  BNB:  "BNB",
  SOL:  "Solana",
  XRP:  "XRP",
  USDC: "USD Coin",
  ADA:  "Cardano",
  AVAX: "Avalanche",
  DOGE: "Dogecoin",
  DOT:  "Polkadot",
  MATIC:"Polygon",
  LINK: "Chainlink",
  NEAR: "Near Protocol",
  PAXG: "PAX Gold",
  FET: "Fetch.AI",
  UNI:  "Uniswap",
  LTC:  "Litecoin",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeKey(s,y,m){ return `portfolio:${s}:${y}-${String(m).padStart(2,"0")}`; }
function fxKey(y,m){ return `portfolio:fx:${y}-${String(m).padStart(2,"0")}`; }
const EMPTY_FX = { mep:"", ccl:"", crypto:"" };
function cashKey(y,m){ return `portfolio:cash:${y}-${String(m).padStart(2,"0")}`; }
const EMPTY_CASH = { uala:"", mp:"", fisicos:"", online_banco:"", online_iol:"" };
function commentKey(section){ return `portfolio:comment:${section}`; }
function emptyRow(){ return {id:Date.now()+Math.random(),ticker:"",name:"",shares:"",buyPrice:"",currentPrice:""}; }

function calcPnL(row){
  const sh=parseFloat(row.shares)||0, bp=parseFloat(row.buyPrice)||0, cp=parseFloat(row.currentPrice)||0;
  if(!sh||!bp||!cp) return {pnlPct:null,pnlAmt:null,value:null};
  return {pnlPct:((cp-bp)/bp)*100, pnlAmt:(cp-bp)*sh, value:cp*sh, originalValue:bp*sh};
}

function fmt(n,dec=2){
  if(n===null||n===undefined||isNaN(n)) return "—";
  return n.toLocaleString("es-AR",{minimumFractionDigits:dec,maximumFractionDigits:dec});
}
function fmtPct(n){
  if(n===null||n===undefined||isNaN(n)) return "—";
  return (n>=0?"+":"")+fmt(n)+"%";
}

// Returns green/amber/red based on value — zero gets amber
function pnlColor(val) {
  if (val === null || val === undefined || isNaN(val)) return C.textMuted;
  if (val === 0 || Object.is(val, 0)) return C.amber;
  return val > 0 ? C.green : C.red;
}
function pnlBg(val) {
  if (val === null || val === undefined || isNaN(val)) return "transparent";
  if (val === 0 || Object.is(val, 0)) return C.amberBg;
  return val > 0 ? C.greenBg : C.redBg;
}

function Badge({children,color}){
  return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:99,background:`${color}18`,color,fontSize:11,fontWeight:600,letterSpacing:"0.04em",fontFamily:"'DM Mono',monospace"}}>{children}</span>;
}

function PnLCell({val,pct,currency}){
  if(val===null) return <span style={{color:C.textMuted,fontSize:12}}>—</span>;
  const col=pnlColor(val), bg=pnlBg(val);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
      <span style={{color:col,fontWeight:600,fontSize:12,fontFamily:"'DM Mono',monospace",background:bg,padding:"2px 8px",borderRadius:6}}>{fmtPct(pct)}</span>
      <span style={{color:col,fontSize:11,opacity:0.75,fontFamily:"'DM Mono',monospace"}}>{val>0?"+":""}{fmt(val)} {currency}</span>
    </div>
  );
}

// ── Comment bubble ───────────────────────────────────────────────────────────
function CommentBubble({ sectionKey, color }) {
  const storageKey = commentKey(sectionKey);
  const [open, setOpen]       = React.useState(false);
  const [comment, setComment] = React.useState(() => {
    try { return localStorage.getItem(storageKey) || ""; } catch { return ""; }
  });
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft]     = React.useState("");
  const bubbleRef             = React.useRef(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target)) {
        setOpen(false);
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function handleNew() {
    setDraft("");
    setEditing(true);
  }
  function handleEdit() {
    setDraft(comment);
    setEditing(true);
  }
  function handleSave() {
    const trimmed = draft.trim();
    setComment(trimmed);
    try { localStorage.setItem(storageKey, trimmed); } catch {}
    setEditing(false);
  }
  function handleDelete() {
    setComment("");
    try { localStorage.removeItem(storageKey); } catch {}
    setEditing(false);
    setOpen(false);
  }
  function handleCancel() {
    setEditing(false);
    setDraft("");
  }

  const hasComment = comment.length > 0;

  return (
    <div style={{position:"relative",display:"inline-flex"}} ref={bubbleRef}>
      {/* Trigger button */}
      <button
        onClick={()=>{ setOpen(o=>!o); setEditing(false); }}
        title={hasComment ? "Ver comentario" : "Agregar comentario"}
        style={{
          background: hasComment ? `${color}18` : "transparent",
          border: `1px solid ${hasComment ? color+"60" : C.border}`,
          color: hasComment ? color : C.textMuted,
          borderRadius: 8, padding:"6px 9px", cursor:"pointer",
          fontSize:14, lineHeight:1, transition:"all 0.2s",
          display:"flex", alignItems:"center", gap:5,
        }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.color=color;e.currentTarget.style.background=`${color}18`;}}
        onMouseLeave={e=>{
          e.currentTarget.style.borderColor=hasComment?color+"60":C.border;
          e.currentTarget.style.color=hasComment?color:C.textMuted;
          e.currentTarget.style.background=hasComment?`${color}18`:"transparent";
        }}
      >
        💬
        {hasComment && (
          <span style={{
            width:6, height:6, borderRadius:"50%",
            background:color, flexShrink:0,
          }}/>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 8px)", right:0,
          width:280, background:C.card,
          border:`1px solid ${color}40`,
          borderRadius:12, boxShadow:"0 8px 32px #00000070",
          zIndex:500, overflow:"hidden",
          animation:"fadeUp 0.18s ease forwards",
        }}>
          {/* Popover header */}
          <div style={{
            padding:"10px 14px",
            background:`linear-gradient(90deg,${color}14,transparent)`,
            borderBottom:`1px solid ${color}20`,
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <span style={{fontSize:11,fontWeight:600,color,letterSpacing:"0.07em",textTransform:"uppercase"}}>
              Nota
            </span>
            <button onClick={()=>{setOpen(false);setEditing(false);}} style={{
              background:"transparent",border:"none",color:C.textMuted,
              cursor:"pointer",fontSize:14,lineHeight:1,padding:"0 2px",
            }}>×</button>
          </div>

          {/* Content */}
          <div style={{padding:"12px 14px"}}>
            {editing ? (
              <textarea
                autoFocus
                value={draft}
                onChange={e=>setDraft(e.target.value)}
                placeholder="Escribí tu comentario..."
                style={{
                  width:"100%", minHeight:80, background:C.surface,
                  border:`1px solid ${color}40`, borderRadius:8,
                  color:C.text, fontFamily:"'DM Sans',sans-serif",
                  fontSize:13, padding:"8px 10px", outline:"none",
                  resize:"vertical", boxSizing:"border-box",
                  transition:"border-color 0.2s",
                }}
                onFocus={e=>e.target.style.borderColor=color}
                onBlur={e=>e.target.style.borderColor=`${color}40`}
              />
            ) : (
              <div style={{
                fontSize:13, color: hasComment ? C.text : C.textMuted,
                lineHeight:1.6, fontStyle: hasComment ? "normal" : "italic",
                minHeight:36,
              }}>
                {hasComment ? comment : "Sin comentarios. Hacé clic en \"Nueva\" para agregar."}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{
            padding:"10px 14px",
            borderTop:`1px solid ${C.border}`,
            display:"flex", gap:6,
          }}>
            {editing ? (
              <>
                <button onClick={handleSave} style={{
                  flex:1, background:`${color}20`, border:`1px solid ${color}60`,
                  color, borderRadius:7, padding:"6px 0",
                  cursor:"pointer", fontSize:12, fontWeight:600,
                  fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s",
                }}
                  onMouseEnter={e=>e.currentTarget.style.background=`${color}35`}
                  onMouseLeave={e=>e.currentTarget.style.background=`${color}20`}
                >✓ Guardar</button>
                <button onClick={handleCancel} style={{
                  flex:1, background:"transparent", border:`1px solid ${C.border}`,
                  color:C.textMuted, borderRadius:7, padding:"6px 0",
                  cursor:"pointer", fontSize:12,
                  fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.textMuted;e.currentTarget.style.color=C.text;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMuted;}}
                >Cancelar</button>
              </>
            ) : (
              <>
                <button onClick={handleNew} style={{
                  flex:1, background:`${color}14`, border:`1px solid ${color}40`,
                  color, borderRadius:7, padding:"6px 0",
                  cursor:"pointer", fontSize:12, fontWeight:600,
                  fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s",
                }}
                  onMouseEnter={e=>e.currentTarget.style.background=`${color}28`}
                  onMouseLeave={e=>e.currentTarget.style.background=`${color}14`}
                >+ Nueva</button>
                <button onClick={handleEdit} disabled={!hasComment} style={{
                  flex:1, background:"transparent", border:`1px solid ${C.border}`,
                  color: hasComment ? C.textSub : C.textMuted,
                  borderRadius:7, padding:"6px 0",
                  cursor: hasComment ? "pointer" : "default",
                  fontSize:12, fontFamily:"'DM Sans',sans-serif",
                  opacity: hasComment ? 1 : 0.4, transition:"all 0.15s",
                }}
                  onMouseEnter={e=>{if(hasComment){e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=hasComment?C.textSub:C.textMuted;}}
                >✎ Editar</button>
                <button onClick={handleDelete} disabled={!hasComment} style={{
                  flex:1, background:"transparent", border:`1px solid ${C.border}`,
                  color: hasComment ? C.textMuted : C.textMuted,
                  borderRadius:7, padding:"6px 0",
                  cursor: hasComment ? "pointer" : "default",
                  fontSize:12, fontFamily:"'DM Sans',sans-serif",
                  opacity: hasComment ? 1 : 0.4, transition:"all 0.15s",
                }}
                  onMouseEnter={e=>{if(hasComment){e.currentTarget.style.borderColor=C.red;e.currentTarget.style.color=C.red;e.currentTarget.style.background=C.redBg;}}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMuted;e.currentTarget.style.background="transparent";}}
                >🗑 Borrar</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Per-section donut chart ──────────────────────────────────────────────────
function SectionPieChart({ data, toDisplay, meta, noFx, dispCurrency }) {
  const rows = Array.isArray(data) ? data : [];
  const chartData = rows
    .map(r => {
      const { value } = calcPnL(r);
      const disp = toDisplay(value);
      return { name: r.ticker || "—", value: disp && disp > 0 ? disp : 0 };
    })
    .filter(d => d.value > 0);

  if (chartData.length === 0) return null;

  const total = chartData.reduce((s, d) => s + d.value, 0);

  // Generate a palette of shades derived from the section color
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return [r,g,b];
  }
  function shadeColor(hex, factor) {
    const [r,g,b] = hexToRgb(hex);
    const blend = (c, f) => Math.round(c * f + (f < 1 ? 255*(1-f)*0.15 : 0));
    const nr = Math.min(255, blend(r, factor));
    const ng = Math.min(255, blend(g, factor));
    const nb = Math.min(255, blend(b, factor));
    return `rgb(${nr},${ng},${nb})`;
  }

  const PALETTE = chartData.map((_, i) => {
    const factor = 0.5 + (i / Math.max(chartData.length - 1, 1)) * 0.6;
    return shadeColor(meta.color, factor);
  });

  const [active, setActive] = React.useState(null);

  return (
    <div style={{
      width: "100%",
      background: C.card, border: `1px solid ${C.border}`,
      borderTop: "none",
      padding: "16px 20px",
      display: "flex", flexDirection: "row", alignItems: "center", gap: 24,
      flexWrap: "wrap",
    }}>
      {/* Donut */}
      <div style={{position:"relative",width:160,height:160,flexShrink:0}}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%" cy="50%"
              innerRadius={38} outerRadius={58}
              paddingAngle={2} dataKey="value"
              strokeWidth={0}
              onMouseEnter={(_,i)=>setActive(i)}
              onMouseLeave={()=>setActive(null)}
            >
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={PALETTE[i]}
                  opacity={active===null||active===i?1:0.45}
                  style={{cursor:"pointer",transition:"opacity 0.2s"}}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background:C.surface,border:`1px solid ${C.border}`,
                borderRadius:8,fontFamily:"'DM Mono',monospace",fontSize:11,
                boxShadow:"0 4px 20px #00000060",
              }}
              formatter={(v,n)=>[`${fmt(v)} ${dispCurrency}`,n]}
              labelStyle={{color:C.textMuted}}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div style={{
          position:"absolute",top:"50%",left:"50%",
          transform:"translate(-50%,-50%)",
          textAlign:"center",pointerEvents:"none",
        }}>
          {active!==null ? (
            <>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600,color:meta.color,lineHeight:1}}>
                {chartData[active].name}
              </div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.textMuted,marginTop:2}}>
                {fmt((chartData[active].value/total)*100,1)}%
              </div>
            </>
          ) : (
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.textMuted}}>{chartData.length} pos.</div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{flex:1,minWidth:200,display:"flex",flexDirection:"column",gap:6}}>
        <div style={{color:C.textMuted,fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Distribución</div>
        {chartData.map((d,i)=>{
          const pct = (d.value/total)*100;
          return (
            <div key={i}
              onMouseEnter={()=>setActive(i)}
              onMouseLeave={()=>setActive(null)}
              style={{
                display:"flex",alignItems:"center",gap:7,
                opacity:active===null||active===i?1:0.4,
                transition:"opacity 0.2s",cursor:"default",
              }}
            >
              <div style={{width:8,height:8,borderRadius:2,background:PALETTE[i],flexShrink:0}}/>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:meta.color,fontWeight:600,width:44,flexShrink:0}}>
                {d.name}
              </span>
              <div style={{flex:1,height:4,background:C.border,borderRadius:99,overflow:"hidden"}}>
                <div style={{width:`${pct}%`,height:"100%",background:PALETTE[i],borderRadius:99}}/>
              </div>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.textMuted,width:32,textAlign:"right",flexShrink:0}}>
                {fmt(pct,1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sort button ──────────────────────────────────────────────────────────────
function SortButton({ active, dir, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "transparent", border: "none", cursor: "pointer",
      padding: "0 0 0 4px", lineHeight: 1, display: "inline-flex",
      flexDirection: "column", gap: 1, verticalAlign: "middle",
      opacity: active ? 1 : 0.3, transition: "opacity 0.2s",
    }}>
      <span style={{ fontSize: 7, color: active && dir === "asc"  ? "#fff" : "#888", lineHeight: 1 }}>▲</span>
      <span style={{ fontSize: 7, color: active && dir === "desc" ? "#fff" : "#888", lineHeight: 1 }}>▼</span>
    </button>
  );
}

// ── Comparison summary panel ─────────────────────────────────────────────────
function ComparePanel({ sectionKey, currentData, prevData, fxRates, showARS, prevMonthLabel }) {
  const meta = SECTION_META[sectionKey];
  const prev = Array.isArray(prevData) ? prevData : [];
  const curr = Array.isArray(currentData) ? currentData : [];

  // FX helpers — same logic as SectionTable
  const FX_KEY_MAP = { cedears:"mep", pesos:"mep", crypto:"crypto" };
  const nativeIsARS = meta.currency === "ARS";
  const dispCurrency = showARS ? "ARS" : "USD";
  const fxRate = parseFloat(fxRates?.[FX_KEY_MAP[sectionKey]]) || null;
  const needsConversion = showARS !== nativeIsARS;
  function toDisplay(v) {
    if (v === null || v === undefined) return null;
    if (!needsConversion) return v;
    if (!fxRate) return null;
    if (showARS && !nativeIsARS) return v * fxRate;
    if (!showARS && nativeIsARS) return v / fxRate;
    return v;
  }
  const noFx = needsConversion && !fxRate;

  // Build comparison rows — union of all tickers from both months
  const allTickers = [...new Set([
    ...curr.filter(r=>r.ticker).map(r=>r.ticker),
    ...prev.filter(r=>r.ticker).map(r=>r.ticker),
  ])];

  if (allTickers.length === 0) return null;

  const rows = allTickers.map(ticker => {
    const c = curr.find(r=>r.ticker===ticker) || null;
    const p = prev.find(r=>r.ticker===ticker) || null;
    const { value: cVal, pnlAmt: cPnl } = c ? calcPnL(c) : { value:null, pnlAmt:null };
    const { value: pVal, pnlAmt: pPnl } = p ? calcPnL(p) : { value:null, pnlAmt:null };
    const cValDisp = toDisplay(cVal);
    const pValDisp = toDisplay(pVal);
    const deltaVal = (cValDisp!==null && pValDisp!==null) ? cValDisp - pValDisp : null;
    const deltaPct = (deltaVal!==null && pValDisp!==null && pValDisp!==0) ? (deltaVal/pValDisp)*100 : null;
    const name = c?.name || p?.name || ticker;
    const isNew  = !p && !!c;
    const isGone = !!p && !c;
    return { ticker, name, pValDisp, cValDisp, deltaVal, deltaPct, isNew, isGone };
  });

  // Section-level totals
  const totalPrev = rows.reduce((s,r) => s + (r.pValDisp||0), 0);
  const totalCurr = rows.reduce((s,r) => s + (r.cValDisp||0), 0);
  const totalDelta = totalCurr - totalPrev;
  const totalDeltaPct = totalPrev > 0 ? (totalDelta/totalPrev)*100 : null;

  return (
    <div style={{
      border:`1px solid ${meta.color}28`,
      borderTop:`2px solid ${meta.color}`,
      borderRadius:"0 0 14px 14px",
      background:`${meta.color}06`,
      padding:"14px 18px",
      marginTop:-14,
      marginBottom:20,
      animation:"fadeUp 0.3s ease forwards",
    }}>
      {/* Panel header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>⇄</span>
          <span style={{fontSize:11,fontWeight:600,color:meta.color,letterSpacing:"0.08em",textTransform:"uppercase"}}>
            Variación vs {prevMonthLabel}
          </span>
        </div>
        {/* Section total delta */}
        {totalPrev>0&&(
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:2}}>Mes anterior</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:C.textSub}}>{noFx?"—":fmt(totalPrev)} {dispCurrency}</div>
            </div>
            <div style={{color:C.textMuted,fontSize:16}}>→</div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:2}}>Este mes</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:C.text}}>{noFx?"—":fmt(totalCurr)} {dispCurrency}</div>
            </div>
            {totalDeltaPct!==null&&!noFx&&(
              <div style={{
                background:pnlBg(totalDelta),
                border:`1px solid ${pnlColor(totalDelta)}40`,
                borderRadius:8,padding:"6px 12px",textAlign:"center",minWidth:90,
              }}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:pnlColor(totalDelta)}}>
                  {totalDelta>=0?"+":""}{fmtPct(totalDeltaPct)}
                </div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:pnlColor(totalDelta),marginTop:1}}>
                  {totalDelta>=0?"+":""}{fmt(totalDelta)} {dispCurrency}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Asset cards */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {rows.map(r => {
          const pos = r.deltaVal!==null && r.deltaVal >= 0;
          const col = r.deltaVal!==null ? pnlColor(r.deltaVal) : C.textMuted;
          return (
            <div key={r.ticker} style={{
              display:"flex",alignItems:"center",gap:12,
              background:C.card,borderRadius:10,padding:"10px 14px",
              border:`1px solid ${r.isNew?C.green:r.isGone?C.red:C.border}`,
              flexWrap:"wrap",
            }}>
              {/* Ticker + name */}
              <div style={{minWidth:140,flex:"0 0 auto"}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:meta.color}}>{r.ticker}</span>
                  {r.isNew  && <span style={{fontSize:9,background:`${C.green}20`,color:C.green,  borderRadius:4,padding:"1px 5px",fontWeight:600}}>NUEVO</span>}
                  {r.isGone && <span style={{fontSize:9,background:`${C.red}20`,  color:C.red,    borderRadius:4,padding:"1px 5px",fontWeight:600}}>SALIÓ</span>}
                </div>
                <div style={{fontSize:11,color:C.textMuted,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:130}}>{r.name}</div>
              </div>

              {/* Prev value */}
              <div style={{textAlign:"right",minWidth:90}}>
                <div style={{fontSize:9,color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:2}}>{prevMonthLabel}</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.textSub}}>
                  {r.pValDisp!==null&&!noFx ? `${fmt(r.pValDisp)} ${dispCurrency}` : "—"}
                </div>
              </div>

              <div style={{color:C.textMuted,fontSize:13}}>→</div>

              {/* Current value */}
              <div style={{textAlign:"right",minWidth:90}}>
                <div style={{fontSize:9,color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:2}}>Este mes</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.text}}>
                  {r.cValDisp!==null&&!noFx ? `${fmt(r.cValDisp)} ${dispCurrency}` : "—"}
                </div>
              </div>

              {/* Delta */}
              <div style={{marginLeft:"auto",textAlign:"right",minWidth:100}}>
                {r.deltaVal!==null&&!noFx ? (
                  <>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:col}}>
                      {r.deltaVal>=0?"+":""}{fmtPct(r.deltaPct)}
                    </div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:col,marginTop:1}}>
                      {r.deltaVal>=0?"+":""}{fmt(r.deltaVal)} {dispCurrency}
                    </div>
                  </>
                ) : (
                  <span style={{color:C.textMuted,fontSize:12}}>{noFx?"Sin TC":"—"}</span>
                )}
              </div>

              {/* Visual bar */}
              {r.deltaVal!==null&&r.pValDisp&&r.pValDisp>0&&!noFx&&(
                <div style={{width:"100%",height:3,background:C.border,borderRadius:99,marginTop:4}}>
                  <div style={{
                    width:`${Math.min(Math.abs((r.deltaVal/r.pValDisp)*100),100)}%`,
                    height:"100%",background:col,borderRadius:99,
                    transition:"width 0.5s ease",
                  }}/>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section table ────────────────────────────────────────────────────────────
function SectionTable({sectionKey, data: dataProp, onChange, compareData, showCompare, fxRates, showARS, year, month}){
  const data = Array.isArray(dataProp) ? dataProp : [];
  const meta = SECTION_META[sectionKey];
  const timers = useRef({});

  // FX conversion — always convert to the selected display currency
  // CEDEARs: native USD → ARS = ×CCL  |  USD = no change
  // Pesos:   native ARS → USD = ÷MEP  |  ARS = no change
  // Crypto:  native USD → ARS = ×Crypto | USD = no change
  const FX_KEY_MAP = { cedears:"mep", pesos:"mep", crypto:"crypto" };
  const nativeIsARS = meta.currency === "ARS";
  const dispCurrency = showARS ? "ARS" : "USD";
  const fxRate = parseFloat(fxRates?.[FX_KEY_MAP[sectionKey]]) || null;
  const needsConversion = showARS !== nativeIsARS; // true when display ≠ native currency
  const noFx = needsConversion && !fxRate;         // wants conversion but no rate entered

  function toDisplay(nativeVal) {
    if (nativeVal === null || nativeVal === undefined) return null;
    if (!needsConversion) return nativeVal;          // already in the right currency
    if (!fxRate) return null;                        // rate missing — return null, show ≈
    if (showARS && !nativeIsARS) return nativeVal * fxRate;   // USD → ARS: ×rate
    if (!showARS && nativeIsARS) return nativeVal / fxRate;   // ARS → USD: ÷rate
    return nativeVal;
  }

  const [sortKey, setSortKey] = useState(null);   // null | "value" | "pnl"
  const [sortDir, setSortDir] = useState("desc");  // "asc" | "desc"

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function resolveTickerName(id,ticker){
    if(!ticker||ticker.length<1) return;
    let name=null;
    if(sectionKey==="cedears") name=CEDEAR_NAMES[ticker.toUpperCase()]||null;
    else if(sectionKey==="pesos") name=PESOS_NAMES[ticker.toUpperCase()]||null;
    else name=CRYPTO_NAMES[ticker.toUpperCase()]||null;
    if(name) onChange(prev=>{
      const arr=Array.isArray(prev)?prev:[];
      return arr.map(r=>r.id===id&&!r.name?{...r,name}:r);
    });
  }

  function updateRow(id,field,value){
    onChange(prev=>{
      const arr=Array.isArray(prev)?prev:[];
      return arr.map(r=>r.id===id?{...r,[field]:value}:r);
    });
    if(field==="ticker"){
      clearTimeout(timers.current[id]);
      timers.current[id]=setTimeout(()=>resolveTickerName(id,value),500);
    }
  }

  function addRow(){ onChange(prev=>{ const arr=Array.isArray(prev)?prev:[]; return [...arr,emptyRow()]; }); }
  function removeRow(id){ onChange(prev=>{ const arr=Array.isArray(prev)?prev:[]; return arr.filter(r=>r.id!==id); }); }

  function handleCopy() {
    // Compute next month/year
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear  = month === 12 ? year + 1 : year;
    const key = makeKey(sectionKey, nextYear, nextMonth);
    // Copy tickers, names and buy prices — clear shares and currentPrice
    const copied = data
      .filter(r => r.ticker)
      .map(r => ({ ...emptyRow(), ticker: r.ticker, name: r.name, buyPrice: r.buyPrice }));
    if (copied.length === 0) return;
    // Warn if next month already has data
    try {
      const existing = localStorage.getItem(key);
      if (existing) {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed) && parsed.some(r => r.ticker)) {
          if (!window.confirm(`El mes siguiente ya tiene datos en ${meta.label}. ¿Sobreescribir?`)) return;
        }
      }
      localStorage.setItem(key, JSON.stringify(copied));
      // Toast-style alert
      alert(`✓ ${copied.length} activos copiados a ${MONTHS[nextMonth-1]} ${nextYear}`);
    } catch(e) {
      console.error(e);
      alert("Error al copiar datos.");
    }
  }

  function getPrevRow(ticker){
    if(!compareData||!ticker) return null;
    return compareData.find(r=>r.ticker===ticker)||null;
  }

  const totVal=toDisplay(data.reduce((s,r)=>s+(calcPnL(r).value||0),0));
  const totOriginal=toDisplay(data.reduce((s,r)=>s+(calcPnL(r).originalValue||0),0));
  const totPnL=toDisplay(data.reduce((s,r)=>s+(calcPnL(r).pnlAmt||0),0));
  const totCost=data.reduce((s,r)=>s+(parseFloat(r.shares)||0)*(parseFloat(r.buyPrice)||0),0);
  const totPct=totCost>0?(data.reduce((s,r)=>s+(calcPnL(r).pnlAmt||0),0)/totCost)*100:null;

  const thSt={
    color:C.textMuted,fontSize:10,fontWeight:500,letterSpacing:"0.1em",textTransform:"uppercase",
    padding:"10px 14px",textAlign:"left",borderBottom:`1px solid ${C.border}`,
    fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap",background:C.surface,
  };
  const tdSt={padding:"9px 14px",borderBottom:`1px solid ${C.border}`,verticalAlign:"middle",fontSize:13};
  const inpSt={
    background:"transparent",border:"none",color:C.text,
    fontFamily:"'DM Mono',monospace",fontSize:12,padding:"4px 6px",
    width:"100%",outline:"none",borderRadius:6,transition:"background 0.15s",
  };

  // Sort rows if a sort key is active
  const displayRows = sortKey ? [...data].sort((a, b) => {
    const av = sortKey === "value"
      ? (toDisplay(calcPnL(a).value) ?? -Infinity)
      : (toDisplay(calcPnL(a).pnlAmt) ?? -Infinity);
    const bv = sortKey === "value"
      ? (toDisplay(calcPnL(b).value) ?? -Infinity)
      : (toDisplay(calcPnL(b).pnlAmt) ?? -Infinity);
    return sortDir === "desc" ? bv - av : av - bv;
  }) : data;

  // Build pie chart data using converted values
  const pieData = data.map(r => {
    const { value } = calcPnL(r);
    return { name: r.ticker||"—", value: toDisplay(value) };
  });

  return (
    <div style={{marginBottom:28}}>
      {/* Header bar */}
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"14px 20px",
        background:`linear-gradient(90deg,${meta.color}10,transparent)`,
        border:`1px solid ${meta.color}28`,borderRadius:"14px 14px 0 0",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{
            width:40,height:40,borderRadius:12,
            background:`${meta.color}18`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
          }}>{meta.emoji}</div>
          <div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:19,fontWeight:700,color:C.text,lineHeight:1.1,letterSpacing:"0"}}>{meta.label}</div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:3}}>
              <span style={{color:C.textMuted,fontSize:11}}>{meta.sub}</span>
              {data.filter(r=>r.ticker).length>0&&(
                <span style={{
                  background:`${meta.color}18`,color:meta.color,
                  fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:600,
                  padding:"1px 7px",borderRadius:99,letterSpacing:"0.04em",
                }}>{data.filter(r=>r.ticker).length} activos</span>
              )}
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          {totVal>0&&(
            <div style={{textAlign:"right",display:"flex",gap:24}}>
              <div>
                <div style={{color:C.textMuted,fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>V. Original</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:15,fontWeight:500,color:C.textSub}}>
                  {(!noFx&&totOriginal!==null)?fmt(totOriginal):"—"} <span style={{fontSize:10,color:C.textMuted}}>{dispCurrency}</span>
                </div>
              </div>
              <div>
                <div style={{color:C.textMuted,fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>V. Actual</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:15,fontWeight:500,color:C.text}}>
                  {(!noFx&&totVal!==null)?fmt(totVal):"—"} <span style={{fontSize:10,color:C.textMuted}}>{dispCurrency}</span>
                </div>
                <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:pnlColor(totPnL),marginTop:2}}>
                  {totPnL>0?"▲":totPnL<0?"▼":"●"} {fmtPct(totPct)} &nbsp;({totPnL>0?"+":""}{fmt(totPnL)})
                </div>
              </div>
            </div>
          )}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <CommentBubble sectionKey={sectionKey} color={meta.color}/>
            <button onClick={()=>{
              if(window.confirm(`¿Borrar todos los datos de ${meta.label} en este mes?`))
                onChange(_prev => [emptyRow()]);
            }} style={{
              background:"transparent",border:`1px solid ${C.border}`,
              color:C.textMuted,fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,
              padding:"8px 14px",cursor:"pointer",borderRadius:9,transition:"all 0.2s",
              display:"flex",alignItems:"center",gap:5,
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.red;e.currentTarget.style.color=C.red;e.currentTarget.style.background=C.redBg;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMuted;e.currentTarget.style.background="transparent";}}
            ><span style={{fontSize:13}}>🗑</span> Limpiar</button>
            <button onClick={handleCopy} style={{
              background:"transparent",border:`1px solid ${C.border}`,
              color:C.textMuted,fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,
              padding:"8px 14px",cursor:"pointer",borderRadius:9,transition:"all 0.2s",
              display:"flex",alignItems:"center",gap:5,
            }}
              title={`Copiar tickers al mes siguiente`}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;e.currentTarget.style.background=`${C.accent}12`;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMuted;e.currentTarget.style.background="transparent";}}
            ><span style={{fontSize:13}}>📋</span> Copiar</button>
            <button onClick={addRow} style={{
              background:`${meta.color}14`,border:`1px solid ${meta.color}44`,
              color:meta.color,fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,
              padding:"8px 18px",cursor:"pointer",borderRadius:9,transition:"all 0.2s",
            }}
              onMouseEnter={e=>e.currentTarget.style.background=`${meta.color}26`}
              onMouseLeave={e=>e.currentTarget.style.background=`${meta.color}14`}
            >+ Agregar fila</button>
          </div>
        </div>
      </div>

      {/* Table full width, pie below */}
      <div style={{display:"flex",flexDirection:"column",gap:0}}>
      <div style={{overflowX:"auto",border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 14px 14px",background:C.card}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:780}}>
          <thead>
            <tr>
              <th style={{...thSt,width:90}}>Ticker</th>
              <th style={{...thSt}}>Empresa</th>
              <th style={{...thSt,width:100,textAlign:"right"}}>Cantidad</th>
              <th style={{...thSt,width:120,textAlign:"right"}}>P. Compra</th>
              <th style={{...thSt,width:120,textAlign:"right"}}>P. Actual</th>
              <th style={{...thSt,width:130,textAlign:"right"}}>V. Original ({dispCurrency})</th>
              <th style={{...thSt,width:130,textAlign:"right"}}>
                <span style={{display:"inline-flex",alignItems:"center",justifyContent:"flex-end",gap:2}}>
                  V. Actual ({dispCurrency})
                  <SortButton active={sortKey==="value"} dir={sortDir} onClick={()=>toggleSort("value")}/>
                </span>
              </th>
              <th style={{...thSt,width:150,textAlign:"right"}}>
                <span style={{display:"inline-flex",alignItems:"center",justifyContent:"flex-end",gap:2}}>
                  P&amp;L ({dispCurrency})
                  <SortButton active={sortKey==="pnl"} dir={sortDir} onClick={()=>toggleSort("pnl")}/>
                </span>
              </th>
              {showCompare&&<th style={{...thSt,width:130,textAlign:"right"}}>Δ Mes Ant.</th>}
              <th style={{...thSt,width:44}}></th>
            </tr>
          </thead>
          <tbody>
            {data.length===0&&(
              <tr><td colSpan={showCompare?10:9} style={{...tdSt,textAlign:"center",color:C.textMuted,padding:40,fontSize:13}}>
                Sin posiciones · Hacé clic en "+ Agregar fila"
              </td></tr>
            )}
            {displayRows.map(row=>{
              const {pnlPct,pnlAmt,value,originalValue}=calcPnL(row);
              const prev=getPrevRow(row.ticker);
              let delta=null;
              if(prev){const {pnlAmt:pa}=calcPnL(prev);if(pnlAmt!==null&&pa!==null)delta=pnlAmt-pa;}
              return (
                <tr key={row.id}
                  onMouseEnter={e=>e.currentTarget.style.background=C.cardHover}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                  style={{transition:"background 0.12s"}}
                >
                  <td style={tdSt}>
                    <input value={row.ticker} onChange={e=>updateRow(row.id,"ticker",e.target.value.toUpperCase())}
                      placeholder="—" style={{...inpSt,fontWeight:700,color:meta.color,letterSpacing:"0.05em",width:70}}
                      onFocus={e=>e.target.style.background=`${meta.color}12`}
                      onBlur={e=>e.target.style.background="transparent"}
                    />
                  </td>
                  <td style={tdSt}>
                    <input value={row.name} onChange={e=>updateRow(row.id,"name",e.target.value)}
                      placeholder="Nombre…" style={{...inpSt,color:C.textSub}}
                      onFocus={e=>e.target.style.background=C.surface}
                      onBlur={e=>e.target.style.background="transparent"}
                    />
                  </td>
                  <td style={{...tdSt,textAlign:"right"}}>
                    <input value={row.shares} onChange={e=>updateRow(row.id,"shares",e.target.value)}
                      placeholder="0" type="text" inputMode="decimal" style={{...inpSt,textAlign:"right",width:72}}
                      onFocus={e=>e.target.style.background=C.surface}
                      onBlur={e=>e.target.style.background="transparent"}
                    />
                  </td>
                  <td style={{...tdSt,textAlign:"right"}}>
                    <input value={row.buyPrice} onChange={e=>updateRow(row.id,"buyPrice",e.target.value)}
                      placeholder="0.00" type="text" inputMode="decimal" style={{...inpSt,textAlign:"right",width:90}}
                      onFocus={e=>e.target.style.background=C.surface}
                      onBlur={e=>e.target.style.background="transparent"}
                    />
                  </td>
                  <td style={{...tdSt,textAlign:"right"}}>
                    <input value={row.currentPrice} onChange={e=>updateRow(row.id,"currentPrice",e.target.value)}
                      placeholder="0.00" type="text" inputMode="decimal" style={{...inpSt,textAlign:"right",width:90}}
                      onFocus={e=>e.target.style.background=C.surface}
                      onBlur={e=>e.target.style.background="transparent"}
                    />
                  </td>
                  <td style={{...tdSt,textAlign:"right",fontFamily:"'DM Mono',monospace",color:C.textMuted,fontSize:12}}>
                    {originalValue!==null?(noFx?"—":`${fmt(toDisplay(originalValue))} ${dispCurrency}`):"—"}
                  </td>
                  <td style={{...tdSt,textAlign:"right",fontFamily:"'DM Mono',monospace",color:C.textSub,fontSize:12}}>
                    {value!==null?(noFx?"—":`${fmt(toDisplay(value))} ${dispCurrency}`):"—"}
                  </td>
                  <td style={{...tdSt,textAlign:"right"}}>
                    <PnLCell val={noFx?null:toDisplay(pnlAmt)} pct={noFx?null:pnlPct} currency={dispCurrency}/>
                  </td>
                  {showCompare&&(
                    <td style={{...tdSt,textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:12}}>
                      {delta!==null&&!noFx
                        ?<span style={{color:pnlColor(delta),fontWeight:600}}>{delta>0?"+":""}{fmt(toDisplay(delta))} {dispCurrency}</span>
                        :<span style={{color:C.textMuted}}>{delta!==null&&noFx?"Sin TC":"—"}</span>}
                    </td>
                  )}
                  <td style={{...tdSt,textAlign:"center"}}>
                    <button onClick={()=>removeRow(row.id)} style={{
                      background:"transparent",border:"none",color:C.textMuted,cursor:"pointer",
                      fontSize:17,padding:"2px 7px",borderRadius:6,transition:"all 0.18s",lineHeight:1,
                    }}
                      onMouseEnter={e=>{e.currentTarget.style.color=C.red;e.currentTarget.style.background=C.redBg;}}
                      onMouseLeave={e=>{e.currentTarget.style.color=C.textMuted;e.currentTarget.style.background="transparent";}}
                    >×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SectionPieChart
        data={data}
        toDisplay={toDisplay}
        meta={meta}
        noFx={noFx}
        dispCurrency={dispCurrency}
      />
      </div>
    </div>
  );
}

// ── Donut ────────────────────────────────────────────────────────────────────
function DonutChart({data}){
  if(!data.length||data.every(d=>d.value===0)) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:150,color:C.textMuted,fontSize:12}}>Sin datos aún</div>
  );
  return (
    <ResponsiveContainer width="100%" height={150}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={44} outerRadius={66} paddingAngle={4} dataKey="value" strokeWidth={0}>
          {data.map((d,i)=><Cell key={i} fill={d.color||C.accent}/>)}
        </Pie>
        <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,fontFamily:"'DM Mono',monospace",fontSize:11}} formatter={(v,n)=>[fmt(v),n]}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Cash field component (must be top-level to avoid remount on each render) ──
const CASH_INPUT_ST = {
  background:"transparent", border:"none", outline:"none",
  color:"#f0f0f5", fontFamily:"'DM Mono',monospace",
  fontSize:14, fontWeight:500, width:"100%",
};

function CashField({ label, fieldKey, sectionColor, value, onChange, dispValue, dispCurrency }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5,minWidth:150}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:7,height:7,borderRadius:2,background:sectionColor,flexShrink:0}}/>
        <span style={{fontSize:11,color:"#5a5a72",fontWeight:500,letterSpacing:"0.06em",textTransform:"uppercase"}}>{label}</span>
      </div>
      <div style={{
        display:"flex",alignItems:"center",gap:6,
        background:"#131316",border:"1px solid #26262e",borderRadius:9,
        padding:"7px 12px",transition:"border-color 0.2s",
      }}
        onFocus={e=>e.currentTarget.style.borderColor=sectionColor}
        onBlur={e=>e.currentTarget.style.borderColor="#26262e"}
      >
        <span style={{color:"#5a5a72",fontSize:13,fontFamily:"'DM Mono',monospace"}}>$</span>
        <input
          type="text" inputMode="decimal"
          value={value}
          onChange={onChange}
          placeholder="0,00"
          style={CASH_INPUT_ST}
        />
      </div>
      {dispValue!==null&&dispValue!==undefined&&(
        <div style={{fontSize:10,color:"#5a5a72",fontFamily:"'DM Mono',monospace",paddingLeft:2}}>
          {dispCurrency} {fmt(dispValue)}
        </div>
      )}
    </div>
  );
}

function CashSectionTotal({ label, color, total, totalDisp, dispCurrency }) {
  if (!total || total === 0) return null;
  return (
    <div style={{textAlign:"right",minWidth:110}}>
      <div style={{color:"#5a5a72",fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>Total {label}</div>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:16,fontWeight:600,color}}>
        {fmt(total)} <span style={{fontSize:10,color:"#5a5a72"}}>{label==="Pesos"?"ARS":"USD"}</span>
      </div>
      {totalDisp!==null&&totalDisp!==undefined&&(
        <div style={{fontSize:11,color:"#5a5a72",fontFamily:"'DM Mono',monospace",marginTop:2}}>
          ≈ {fmt(totalDisp)} {dispCurrency}
        </div>
      )}
    </div>
  );
}

// ── Cash panel ───────────────────────────────────────────────────────────────
function CashPanel({ cash, setCash, showARS, fxRates }) {
  const mepRate = parseFloat(fxRates?.mep)||null;
  const cclRate = parseFloat(fxRates?.ccl)||null;
  const dispCurrency = showARS ? "ARS" : "USD";

  function toDisplayPesos(v) {
    if (!v) return null;
    const n = parseFloat(v)||0;
    if (showARS) return n;
    return mepRate ? n/mepRate : null;
  }
  function toDisplayDolares(v) {
    if (!v) return null;
    const n = parseFloat(v)||0;
    if (!showARS) return n;
    return cclRate ? n*cclRate : null;
  }

  const totalPesos   = (parseFloat(cash.uala)||0) + (parseFloat(cash.mp)||0);
  const totalDolares = (parseFloat(cash.fisicos)||0) + (parseFloat(cash.online_banco)||0) + (parseFloat(cash.online_iol)||0);
  const totalPesosDisp   = showARS ? totalPesos   : (mepRate ? totalPesos/mepRate : null);
  const totalDolaresDisp = showARS ? (cclRate ? totalDolares*cclRate : null) : totalDolares;



  return (
    <div style={{display:"flex",gap:16,marginBottom:28,flexWrap:"wrap"}}>

      {/* Pesos panel — left */}
      <div style={{flex:1,minWidth:280,background:"#18181c",border:"1px solid #26262e",borderRadius:14,overflow:"hidden"}}>
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"14px 20px",
          background:"linear-gradient(90deg,#22c55e10,transparent)",
          borderBottom:"1px solid #26262e",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:"#22c55e18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>💰</div>
            <div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:17,fontWeight:700,color:"#f0f0f5",lineHeight:1.1}}>Pesos</div>
              <div style={{color:"#5a5a72",fontSize:11,marginTop:2}}>Efectivo · ARS</div>
            </div>
          </div>
          <CashSectionTotal label="Pesos" color="#22c55e" total={totalPesos} totalDisp={!showARS&&totalPesosDisp!==null?totalPesosDisp:null} dispCurrency={dispCurrency}/>
        </div>
        <div style={{display:"flex",alignItems:"flex-start",gap:14,flexWrap:"wrap",padding:"16px 20px"}}>
          <CashField label="Ualá" fieldKey="uala" sectionColor="#22c55e"
            value={cash.uala} onChange={e=>setCash(c=>({...c,uala:e.target.value}))}
            dispValue={parseFloat(cash.uala)>0?toDisplayPesos(cash.uala):null} dispCurrency={dispCurrency}/>
          <CashField label="MP / Banco" fieldKey="mp" sectionColor="#22c55e"
            value={cash.mp} onChange={e=>setCash(c=>({...c,mp:e.target.value}))}
            dispValue={parseFloat(cash.mp)>0?toDisplayPesos(cash.mp):null} dispCurrency={dispCurrency}/>
        </div>
      </div>

      {/* Dólares panel — right */}
      <div style={{flex:1,minWidth:380,background:"#18181c",border:"1px solid #26262e",borderRadius:14,overflow:"hidden"}}>
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"14px 20px",
          background:"linear-gradient(90deg,#38bdf810,transparent)",
          borderBottom:"1px solid #26262e",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:"#38bdf818",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>💵</div>
            <div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:17,fontWeight:700,color:"#f0f0f5",lineHeight:1.1}}>Dólares</div>
              <div style={{color:"#5a5a72",fontSize:11,marginTop:2}}>Efectivo · USD</div>
            </div>
          </div>
          <CashSectionTotal label="Dólares" color="#38bdf8" total={totalDolares} totalDisp={showARS&&totalDolaresDisp!==null?totalDolaresDisp:null} dispCurrency={dispCurrency}/>
        </div>
        <div style={{display:"flex",alignItems:"flex-start",gap:14,flexWrap:"wrap",padding:"16px 20px"}}>
          <CashField label="Físicos" fieldKey="fisicos" sectionColor="#38bdf8"
            value={cash.fisicos} onChange={e=>setCash(c=>({...c,fisicos:e.target.value}))}
            dispValue={parseFloat(cash.fisicos)>0?toDisplayDolares(cash.fisicos):null} dispCurrency={dispCurrency}/>
          <CashField label="Online - Banco" fieldKey="online_banco" sectionColor="#38bdf8"
            value={cash.online_banco} onChange={e=>setCash(c=>({...c,online_banco:e.target.value}))}
            dispValue={parseFloat(cash.online_banco)>0?toDisplayDolares(cash.online_banco):null} dispCurrency={dispCurrency}/>
          <CashField label="Online - IOL" fieldKey="online_iol" sectionColor="#38bdf8"
            value={cash.online_iol} onChange={e=>setCash(c=>({...c,online_iol:e.target.value}))}
            dispValue={parseFloat(cash.online_iol)>0?toDisplayDolares(cash.online_iol):null} dispCurrency={dispCurrency}/>
        </div>
      </div>

    </div>
  );
}


// ── EOT: Evolution Over Time ──────────────────────────────────────────────────
const EOT_SERIES = [
  { key:"cedears",   label:"CEDEARs",       color:"#f59e0b" },
  { key:"pesos",     label:"Merval",         color:"#38bdf8" },
  { key:"crypto",    label:"Crypto",         color:"#a78bfa" },
  { key:"dolares",   label:"Dólares",        color:"#22c55e" },
  { key:"grandTotal",label:"Grand Total",    color:"#6c63ff" },
  { key:"invested",  label:"Total Invested", color:"#f87171" },
];

const RANGE_OPTIONS = [
  { label:"3M",  months:3  },
  { label:"6M",  months:6  },
  { label:"12M", months:12 },
  { label:"Todo",months:99 },
];

function EOTView({ showARS }) {
  const [range, setRange]   = React.useState(6);
  const [hidden, setHidden] = React.useState(new Set());

  // ── Load all available monthly data from localStorage ──────────────────────
  const allData = React.useMemo(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith("portfolio:cedears:"));
    // Extract unique year-month combos
    const months = keys.map(k => {
      const m = k.match(/(\d{4})-(\d{2})$/);
      return m ? { year: parseInt(m[1]), month: parseInt(m[2]) } : null;
    }).filter(Boolean);
    // Sort ascending
    months.sort((a,b) => a.year!==b.year ? a.year-b.year : a.month-b.month);

    return months.map(({ year, month }) => {
      // Load each section
      const sections = {};
      for (const s of ["cedears","pesos","crypto"]) {
        try {
          const r = localStorage.getItem(makeKey(s, year, month));
          sections[s] = r ? JSON.parse(r) : [];
        } catch { sections[s] = []; }
      }
      // Load FX
      let fx = { mep:"", ccl:"", crypto:"" };
      try { const f = localStorage.getItem(fxKey(year, month)); if(f) fx = JSON.parse(f); } catch {}
      // Load cash
      let cash = { uala:"", mp:"", fisicos:"", online_banco:"", online_iol:"" };
      try { const c = localStorage.getItem(cashKey(year, month)); if(c) cash = JSON.parse(c); } catch {}

      const mepRate   = parseFloat(fx.mep)    || null;
      const cclRate   = parseFloat(fx.ccl)    || null;
      const cryptoRate= parseFloat(fx.crypto) || null;

      // Compute native totals per section
      function sectionNativeTotal(s) {
        return (Array.isArray(sections[s])?sections[s]:[])
          .reduce((a,r) => a + (calcPnL(r).value || 0), 0);
      }
      function sectionNativeCost(s) {
        return (Array.isArray(sections[s])?sections[s]:[])
          .reduce((a,r) => a + (parseFloat(r.shares)||0)*(parseFloat(r.buyPrice)||0), 0);
      }

      const cedearARS  = sectionNativeTotal("cedears"); // native ARS ÷ MEP
      const mervalARS  = sectionNativeTotal("pesos");   // native ARS
      const cryptoUSD  = sectionNativeTotal("crypto");  // native USD
      const pesosARS   = (parseFloat(cash.uala)||0) + (parseFloat(cash.mp)||0);
      const dolaresUSD = (parseFloat(cash.fisicos)||0) + (parseFloat(cash.online_banco)||0) + (parseFloat(cash.online_iol)||0);

      // Convert everything to display currency
      function toDisp(nativeVal, isARS, rate) {
        if (nativeVal === 0) return 0;
        if (showARS) {
          if (isARS) return nativeVal;
          return rate ? nativeVal * rate : null;
        } else {
          if (!isARS) return nativeVal;
          return rate ? nativeVal / rate : null;
        }
      }

      const cedearDisp  = toDisp(cedearARS,  true,  mepRate);
      const mervalDisp  = toDisp(mervalARS,  true,  mepRate);
      const cryptoDisp  = toDisp(cryptoUSD,  false, cryptoRate);
      const pesosDisp   = toDisp(pesosARS,   true,  mepRate);
      const dolaresDisp = toDisp(dolaresUSD, false, cclRate);

      const allDisp = [cedearDisp, mervalDisp, cryptoDisp, pesosDisp, dolaresDisp];
      const grandTotal = allDisp.every(v=>v!==null) ? allDisp.reduce((a,v)=>a+v,0) : null;

      // Invested = cost basis of CEDEARs + Merval + Crypto
      const cedearCostARS  = sectionNativeCost("cedears");
      const mervalCostARS  = sectionNativeCost("pesos");
      const cryptoCostUSD  = sectionNativeCost("crypto");
      const investedCedear = showARS ? cedearCostARS  : (mepRate   ? cedearCostARS/mepRate   : null);
      const investedMerval = showARS ? mervalCostARS  : (mepRate   ? mervalCostARS/mepRate   : null);
      const investedCrypto = showARS ? (cryptoRate?cryptoCostUSD*cryptoRate:null) : cryptoCostUSD;
      const invested = (investedCedear!==null&&investedMerval!==null&&investedCrypto!==null)
        ? investedCedear+investedMerval+investedCrypto : null;

      return {
        label: `${MONTHS[month-1].slice(0,3)} ${year}`,
        year, month,
        cedears:   cedearDisp,
        pesos:     mervalDisp,
        crypto:    cryptoDisp,
        dolares:   dolaresDisp,
        grandTotal,
        invested,
      };
    });
  }, [showARS]);

  // Apply range filter
  const filtered = range >= 99 ? allData : allData.slice(-range);

  // Toggle series visibility
  function toggleSeries(key) {
    setHidden(h => {
      const n = new Set(h);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  const dispCurrency = showARS ? "ARS" : "USD";
  const visibleSeries = EOT_SERIES.filter(s => !hidden.has(s.key));

  // Find max value for Y-axis scaling
  const allValues = filtered.flatMap(d => visibleSeries.map(s => d[s.key] || 0)).filter(v=>v>0);
  const maxVal = allValues.length ? Math.max(...allValues) : 1;

  if (allData.length === 0) return (
    <div style={{
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      minHeight:400,gap:16,color:C.textMuted,
    }}>
      <div style={{fontSize:48}}>📈</div>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:20,fontWeight:700,color:C.text}}>Sin datos aún</div>
      <div style={{fontSize:13,textAlign:"center",maxWidth:340,lineHeight:1.6}}>
        Guardá datos en la pestaña Portfolio para que aparezcan aquí.
      </div>
    </div>
  );

  // ── Mini sparkline values for summary cards ───────────────────────────────
  function lastTwo(key) {
    const vals = filtered.map(d=>d[key]).filter(v=>v!==null&&v>0);
    if (vals.length < 2) return null;
    return { prev: vals[vals.length-2], curr: vals[vals.length-1] };
  }

  return (
    <div style={{padding:"28px 28px 52px",maxWidth:1380,margin:"0 auto"}}>

      {/* Header row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontFamily:"'Nunito',sans-serif",fontSize:22,fontWeight:800,color:C.text,margin:0,lineHeight:1}}>
            Evolución del Portafolio
          </h2>
          <p style={{fontSize:12,color:C.textMuted,margin:"4px 0 0",fontFamily:"'DM Mono',monospace"}}>
            {filtered.length} meses · valores en {dispCurrency}
          </p>
        </div>
        {/* Range selector */}
        <div style={{display:"flex",alignItems:"center",gap:4,background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:3}}>
          {RANGE_OPTIONS.map(o=>{
            const active = range===o.months;
            return (
              <button key={o.label} onClick={()=>setRange(o.months)} style={{
                background:active?C.accent:"transparent",
                border:"none",
                color:active?"#fff":C.textMuted,
                fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:600,
                padding:"5px 14px",cursor:"pointer",borderRadius:7,
                transition:"all 0.2s",letterSpacing:"0.04em",
              }}>{o.label}</button>
            );
          })}
        </div>
      </div>

      {/* Series toggle pills */}
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
        {EOT_SERIES.map(s=>{
          const on = !hidden.has(s.key);
          return (
            <button key={s.key} onClick={()=>toggleSeries(s.key)} style={{
              background: on ? `${s.color}20` : "transparent",
              border:`1px solid ${on ? s.color+"60" : C.border}`,
              color: on ? s.color : C.textMuted,
              fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600,
              padding:"5px 12px",cursor:"pointer",borderRadius:99,
              transition:"all 0.2s",display:"flex",alignItems:"center",gap:6,
              letterSpacing:"0.04em",
            }}>
              <div style={{width:8,height:8,borderRadius:"50%",background:on?s.color:C.textMuted,flexShrink:0}}/>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ── Main line chart ── */}
      <div style={{
        background:C.card,border:`1px solid ${C.border}`,borderRadius:16,
        padding:"20px 16px 12px",marginBottom:24,overflow:"hidden",
      }}>
        {filtered.length < 2 ? (
          <div style={{textAlign:"center",padding:"40px 0",color:C.textMuted,fontSize:13}}>
            Se necesitan al menos 2 meses de datos para mostrar el gráfico.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={filtered} margin={{top:8,right:16,bottom:0,left:16}}>
              <defs>
                {visibleSeries.map(s=>(
                  <linearGradient key={s.key} id={`eot-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={s.color} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={s.color} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="label" tick={{fill:C.textMuted,fontSize:11,fontFamily:"'DM Mono',monospace"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:C.textMuted,fontSize:10,fontFamily:"'DM Mono',monospace"}} axisLine={false} tickLine={false}
                tickFormatter={v=>v>=1000000?`${(v/1000000).toFixed(1)}M`:v>=1000?`${(v/1000).toFixed(0)}K`:`${v}`}
              />
              <Tooltip
                contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontFamily:"'DM Mono',monospace",fontSize:11,boxShadow:"0 8px 32px #00000080"}}
                formatter={(v,n)=>[v!==null?`${fmt(v)} ${dispCurrency}`:"—",n]}
                labelStyle={{color:C.text,fontWeight:600,marginBottom:6}}
              />
              {visibleSeries.map(s=>(
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
                  stroke={s.color} strokeWidth={2} dot={{r:3,fill:s.color,strokeWidth:0}}
                  activeDot={{r:5,fill:s.color,stroke:C.bg,strokeWidth:2}}
                  connectNulls={true}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Summary cards with last delta ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:28}}>
        {EOT_SERIES.map(s=>{
          const pair = lastTwo(s.key);
          const delta = pair ? pair.curr - pair.prev : null;
          const deltaPct = (delta!==null&&pair.prev>0) ? (delta/pair.prev)*100 : null;
          const lastVal = filtered.length ? filtered[filtered.length-1][s.key] : null;
          return (
            <div key={s.key} style={{
              background:C.card,border:`1px solid ${C.border}`,borderRadius:14,
              padding:"16px 18px",position:"relative",overflow:"hidden",
            }}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${s.color},${s.color}00)`,borderRadius:"14px 14px 0 0"}}/>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                <span style={{fontSize:11,fontWeight:600,color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase"}}>{s.label}</span>
              </div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:18,fontWeight:500,color:C.text,marginBottom:8}}>
                {lastVal!==null&&lastVal>0 ? `${fmt(lastVal)} ${dispCurrency}` : "—"}
              </div>
              {deltaPct!==null&&(
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{
                    background:pnlBg(delta),color:pnlColor(delta),
                    fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:700,
                    padding:"2px 8px",borderRadius:6,
                  }}>{delta>0?"+":""}{fmtPct(deltaPct)}</span>
                  <span style={{fontSize:10,color:C.textMuted,fontFamily:"'DM Mono',monospace"}}>
                    vs mes anterior
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Monthly breakdown table ── */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden"}}>
        <div style={{
          padding:"14px 20px",borderBottom:`1px solid ${C.border}`,
          display:"flex",alignItems:"center",gap:10,
        }}>
          <span style={{fontFamily:"'Nunito',sans-serif",fontSize:15,fontWeight:700,color:C.text}}>Detalle mensual</span>
          <span style={{fontSize:11,color:C.textMuted,fontFamily:"'DM Mono',monospace"}}>{dispCurrency}</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}>
            <thead>
              <tr style={{background:C.surface}}>
                <th style={{padding:"10px 16px",textAlign:"left",fontSize:10,color:C.textMuted,fontWeight:500,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace"}}>Mes</th>
                {EOT_SERIES.map(s=>(
                  <th key={s.key} style={{padding:"10px 12px",textAlign:"right",fontSize:10,color:hidden.has(s.key)?C.textMuted:s.color,fontWeight:500,letterSpacing:"0.08em",textTransform:"uppercase",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace",opacity:hidden.has(s.key)?0.4:1}}>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...filtered].reverse().map((d,i)=>{
                const prev = filtered[filtered.length-1-i-1];
                return (
                  <tr key={d.label}
                    style={{transition:"background 0.12s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.cardHover}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                  >
                    <td style={{padding:"10px 16px",fontSize:12,fontFamily:"'DM Mono',monospace",color:C.text,borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap",fontWeight:600}}>{d.label}</td>
                    {EOT_SERIES.map(s=>{
                      const v = d[s.key];
                      const pv = prev?.[s.key];
                      const delta = (v!==null&&pv!==null) ? v-pv : null;
                      return (
                        <td key={s.key} style={{padding:"10px 12px",textAlign:"right",borderBottom:`1px solid ${C.border}`,opacity:hidden.has(s.key)?0.3:1}}>
                          <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.text}}>{v!==null&&v>0?fmt(v):"—"}</div>
                          {delta!==null&&v>0&&pv>0&&(
                            <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:pnlColor(delta),marginTop:1}}>
                              {delta>0?"+":""}{fmt(delta)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// ── Expenses Tab ──────────────────────────────────────────────────────────────
// Storage: "expenses:{year}" → { categories: [{id, name, items: [{id, name, note, months:{1..12}}]}] }
// Each month value is a string (ARS amount, optionally "400 USD" annotation)

function expKey(year) { return `expenses:${year}`; }

function makeExpId() { return `e${Date.now()}${Math.floor(Math.random()*1000)}`; }

const EXPENSE_MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function loadExpenses(year) {
  try {
    const r = localStorage.getItem(expKey(year));
    return r ? JSON.parse(r) : { categories: [] };
  } catch { return { categories: [] }; }
}
function saveExpenses(year, data) {
  try { localStorage.setItem(expKey(year), JSON.stringify(data)); } catch {}
}

// ── Inline editable cell ──────────────────────────────────────────────────────
function ExpCell({ value, onChange, color }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft]     = React.useState(value || "");
  const inputRef              = React.useRef(null);

  React.useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    onChange(draft.trim());
  }

  if (editing) return (
    <input
      ref={inputRef}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value||""); setEditing(false); } }}
      style={{
        background: C.surface, border: `1px solid ${color}`,
        borderRadius: 6, color: C.text,
        fontFamily: "'DM Mono',monospace", fontSize: 12,
        padding: "3px 7px", width: "100%", outline: "none",
        textAlign: "right", boxSizing: "border-box",
      }}
    />
  );

  const numVal = parseFloat((value||"").replace(/[^0-9.]/g,""));
  const hasUSD = (value||"").toUpperCase().includes("USD");
  const isEmpty = !value || value.trim() === "" || value.trim() === "0";

  return (
    <div
      onClick={() => { setDraft(value||""); setEditing(true); }}
      style={{
        cursor: "pointer", minHeight: 28,
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        borderRadius: 6, padding: "3px 6px",
        transition: "background 0.15s",
        color: isEmpty ? C.textMuted : hasUSD ? C.crypto : C.text,
        fontFamily: "'DM Mono',monospace", fontSize: 12,
      }}
      onMouseEnter={e => e.currentTarget.style.background = `${color}12`}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      title="Clic para editar"
    >
      {isEmpty ? <span style={{opacity:0.25}}>—</span> : value}
    </div>
  );
}


// ── Expense item sparkline ────────────────────────────────────────────────────
function ExpSparkline({ item, color }) {
  const vals = Array.from({length:12},(_,i)=>{
    const v = parseFloat((item.months?.[i+1]||"").replace(/[^0-9.]/g,"")) || null;
    return { m: i+1, v };
  });
  const defined = vals.filter(d=>d.v!==null);
  if (defined.length < 2) return (
    <div style={{width:80,height:28,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:9,color:C.textMuted,fontFamily:"'DM Mono',monospace"}}>—</span>
    </div>
  );

  const maxV = Math.max(...defined.map(d=>d.v));
  const minV = Math.min(...defined.map(d=>d.v));
  const range = maxV - minV || 1;
  const W=80, H=28, pad=3;

  // Build polyline points
  const points = vals.map((d,i)=>{
    const x = pad + (i/(vals.length-1))*(W-pad*2);
    const y = d.v!==null
      ? pad + (1-(d.v-minV)/range)*(H-pad*2)
      : null;
    return {x,y,v:d.v};
  });

  // Segments: only draw lines between consecutive non-null points
  const segments = [];
  for (let i=0;i<points.length-1;i++){
    if(points[i].y!==null&&points[i+1].y!==null)
      segments.push([points[i],points[i+1]]);
  }

  const last = [...points].reverse().find(p=>p.y!==null);
  const first = points.find(p=>p.y!==null);
  const trend = (last&&first) ? last.v - first.v : 0;
  const lineColor = trend > 0 ? C.red : trend < 0 ? C.green : C.amber; // up=costs rising=red, down=saving=green

  return (
    <svg width={W} height={H} style={{display:"block"}}>
      {segments.map(([a,b],i)=>(
        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke={lineColor} strokeWidth={1.5} strokeLinecap="round"/>
      ))}
      {last&&<circle cx={last.x} cy={last.y} r={2.5} fill={lineColor}/>}
    </svg>
  );
}

// ── Expense month comment cell ────────────────────────────────────────────────
function ExpCommentCell({ comment, onSave, color }) {
  const [open, setOpen]       = React.useState(false);
  const [draft, setDraft]     = React.useState(comment||"");
  const [editing, setEditing] = React.useState(false);
  const ref                   = React.useRef(null);

  React.useEffect(()=>{
    if(!open) return;
    function h(e){ if(ref.current&&!ref.current.contains(e.target)){setOpen(false);setEditing(false);} }
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[open]);

  const has = comment && comment.trim().length > 0;

  function handleSave(){
    onSave(draft.trim());
    setEditing(false);
    if(!draft.trim()) setOpen(false);
  }
  function handleDelete(){
    onSave("");
    setDraft("");
    setEditing(false);
    setOpen(false);
  }

  return (
    <div style={{position:"relative",display:"inline-flex"}} ref={ref}>
      <button onClick={()=>{setOpen(o=>!o);setEditing(false);setDraft(comment||"");}} style={{
        background:has?`${color}18`:"transparent",
        border:`1px solid ${has?color+"50":C.border}`,
        color:has?color:C.textMuted,
        borderRadius:6,padding:"3px 6px",cursor:"pointer",
        fontSize:11,lineHeight:1,transition:"all 0.2s",
        display:"flex",alignItems:"center",gap:3,minHeight:24,
      }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.color=color;e.currentTarget.style.background=`${color}18`;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=has?`${color}50`:C.border;e.currentTarget.style.color=has?color:C.textMuted;e.currentTarget.style.background=has?`${color}18`:"transparent";}}
        title={has?"Ver comentario":"Agregar comentario"}
      >
        💬{has&&<span style={{width:5,height:5,borderRadius:"50%",background:color,flexShrink:0}}/>}
      </button>

      {open&&(
        <div style={{
          position:"absolute",top:"calc(100% + 6px)",right:0,
          width:220,background:C.card,border:`1px solid ${color}40`,
          borderRadius:10,boxShadow:"0 8px 28px #00000070",
          zIndex:600,overflow:"hidden",
          animation:"fadeUp 0.15s ease forwards",
        }}>
          <div style={{padding:"8px 12px",background:`${color}12`,borderBottom:`1px solid ${color}20`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:10,fontWeight:600,color,letterSpacing:"0.07em",textTransform:"uppercase"}}>Nota</span>
            <button onClick={()=>{setOpen(false);setEditing(false);}} style={{background:"transparent",border:"none",color:C.textMuted,cursor:"pointer",fontSize:14,lineHeight:1}}>×</button>
          </div>
          <div style={{padding:"10px 12px"}}>
            {editing ? (
              <textarea autoFocus value={draft} onChange={e=>setDraft(e.target.value)}
                placeholder="Escribí tu comentario..."
                style={{width:"100%",minHeight:60,background:C.surface,border:`1px solid ${color}40`,borderRadius:7,color:C.text,fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"6px 8px",outline:"none",resize:"vertical",boxSizing:"border-box"}}
                onFocus={e=>e.target.style.borderColor=color}
                onBlur={e=>e.target.style.borderColor=`${color}40`}
              />
            ) : (
              <div style={{fontSize:12,color:has?C.text:C.textMuted,lineHeight:1.5,fontStyle:has?"normal":"italic",minHeight:30}}>
                {has?comment:"Sin comentario. Hacé clic en \"Nueva\" para agregar."}
              </div>
            )}
          </div>
          <div style={{padding:"8px 12px",borderTop:`1px solid ${C.border}`,display:"flex",gap:5}}>
            {editing ? (
              <>
                <button onClick={handleSave} style={{flex:1,background:`${color}20`,border:`1px solid ${color}60`,color,borderRadius:6,padding:"5px 0",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>✓ Guardar</button>
                <button onClick={()=>setEditing(false)} style={{flex:1,background:"transparent",border:`1px solid ${C.border}`,color:C.textMuted,borderRadius:6,padding:"5px 0",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>Cancelar</button>
              </>
            ) : (
              <>
                <button onClick={()=>setEditing(true)} style={{flex:1,background:`${color}14`,border:`1px solid ${color}40`,color,borderRadius:6,padding:"5px 0",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>{has?"✎ Editar":"+ Nueva"}</button>
                <button onClick={handleDelete} disabled={!has} style={{flex:1,background:"transparent",border:`1px solid ${C.border}`,color:has?C.textMuted:C.textMuted,borderRadius:6,padding:"5px 0",cursor:has?"pointer":"default",fontSize:11,opacity:has?1:0.4,fontFamily:"'DM Sans',sans-serif"}}
                  onMouseEnter={e=>{if(has){e.currentTarget.style.borderColor=C.red;e.currentTarget.style.color=C.red;e.currentTarget.style.background=C.redBg;}}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMuted;e.currentTarget.style.background="transparent";}}
                >🗑 Borrar</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Expenses view ─────────────────────────────────────────────────────────────
function ExpensesView() {
  const now = new Date();
  const [year, setYear]       = React.useState(now.getFullYear());
  const [data, setData]       = React.useState(() => loadExpenses(now.getFullYear()));
  const [editingCat, setEditingCat]   = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);
  const [catDraft, setCatDraft]       = React.useState("");
  const [itemDraft, setItemDraft]     = React.useState("");
  const [confirmCat, setConfirmCat]   = React.useState(null); // catId pending delete confirm
  const [confirmItem, setConfirmItem] = React.useState(null); // {catId,itemId} pending delete

  // Reload when year changes
  React.useEffect(() => {
    setData(loadExpenses(year));
    setEditingCat(null); setEditingItem(null);
  }, [year]);

  // Persist on every data change
  React.useEffect(() => { saveExpenses(year, data); }, [data, year]);

  function update(fn) { setData(prev => fn(JSON.parse(JSON.stringify(prev)))); }

  // ── Category ops ─────────────────────────────────────────────────────────
  function addCategory() {
    update(d => { d.categories.push({ id: makeExpId(), name: "Nueva categoría", items: [] }); return d; });
  }
  function renameCategory(catId, name) {
    update(d => { const c = d.categories.find(c=>c.id===catId); if(c) c.name=name; return d; });
    setEditingCat(null);
  }
  function deleteCategory(catId) {
    update(d => { d.categories = d.categories.filter(c=>c.id!==catId); return d; });
    setConfirmCat(null);
  }
  function moveCategory(catId, dir) {
    update(d => {
      const i = d.categories.findIndex(c=>c.id===catId);
      const j = i + dir;
      if (j < 0 || j >= d.categories.length) return d;
      [d.categories[i], d.categories[j]] = [d.categories[j], d.categories[i]];
      return d;
    });
  }

  // ── Item ops ─────────────────────────────────────────────────────────────
  function addItem(catId) {
    update(d => {
      const c = d.categories.find(c=>c.id===catId);
      if (c) c.items.push({ id: makeExpId(), name: "Nuevo ítem", note: "", months: {} });
      return d;
    });
  }
  function renameItem(catId, itemId, name) {
    update(d => {
      const c = d.categories.find(c=>c.id===catId);
      if (c) { const it = c.items.find(i=>i.id===itemId); if(it) it.name = name; }
      return d;
    });
    setEditingItem(null);
  }
  function deleteItem(catId, itemId) {
    update(d => {
      const c = d.categories.find(c=>c.id===catId);
      if (c) c.items = c.items.filter(i=>i.id!==itemId);
      return d;
    });
  }
  function setMonthValue(catId, itemId, month, value) {
    update(d => {
      const c = d.categories.find(c=>c.id===catId);
      if (c) {
        const it = c.items.find(i=>i.id===itemId);
        if (it) { if (!it.months) it.months = {}; it.months[month] = value; }
      }
      return d;
    });
  }
  function setMonthComment(catId, itemId, month, comment) {
    update(d => {
      const c = d.categories.find(c=>c.id===catId);
      if (c) {
        const it = c.items.find(i=>i.id===itemId);
        if (it) {
          if (!it.comments) it.comments = {};
          it.comments[month] = comment;
        }
      }
      return d;
    });
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  function parseAmt(v) { return parseFloat((v||"").replace(/[^0-9.]/g,"")) || 0; }
  function colTotal(m) {
    return data.categories.flatMap(c=>c.items).reduce((s,it)=>s+parseAmt(it.months?.[m]),0);
  }
  function rowTotal(it) {
    return Object.values(it.months||{}).reduce((s,v)=>s+parseAmt(v),0);
  }

  const accentColor = "#f97316"; // orange for expenses tab

  // ── Year picker ───────────────────────────────────────────────────────────
  const yearRange = Array.from({length:6},(_,i)=>now.getFullYear()-2+i);

  const thSt = {
    padding:"10px 10px", textAlign:"right", fontSize:10, fontWeight:500,
    letterSpacing:"0.1em", textTransform:"uppercase",
    color:C.textMuted, borderBottom:`1px solid ${C.border}`,
    fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap",
    background:C.surface, position:"sticky", top:0, zIndex:2,
  };

  return (
    <div style={{padding:"28px 28px 52px", maxWidth:1380, margin:"0 auto"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontFamily:"'Nunito',sans-serif",fontSize:22,fontWeight:800,color:C.text,margin:0,lineHeight:1}}>
            Gastos <span style={{color:accentColor}}>{year}</span>
          </h2>
          <p style={{fontSize:12,color:C.textMuted,margin:"4px 0 0",fontFamily:"'DM Mono',monospace"}}>
            Todos los valores en ARS · USD se anota como referencia
          </p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {/* Year selector */}
          <div style={{display:"flex",alignItems:"center",gap:3,background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:3}}>
            {yearRange.map(y=>{
              const active=y===year;
              return (
                <button key={y} onClick={()=>setYear(y)} style={{
                  background:active?accentColor:"transparent",border:"none",
                  color:active?"#fff":C.textMuted,
                  fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:600,
                  padding:"5px 12px",cursor:"pointer",borderRadius:7,
                  transition:"all 0.2s",
                }}>{y}</button>
              );
            })}
          </div>
          <button onClick={addCategory} style={{
            background:`${accentColor}18`,border:`1px solid ${accentColor}60`,
            color:accentColor,fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,
            padding:"8px 16px",cursor:"pointer",borderRadius:9,
            display:"flex",alignItems:"center",gap:6,transition:"all 0.2s",
          }}
            onMouseEnter={e=>e.currentTarget.style.background=`${accentColor}30`}
            onMouseLeave={e=>e.currentTarget.style.background=`${accentColor}18`}
          >+ Categoría</button>
        </div>
      </div>

      {/* Empty state */}
      {data.categories.length === 0 && (
        <div style={{
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          minHeight:300,gap:16,color:C.textMuted,
          background:C.card,border:`1px solid ${C.border}`,borderRadius:16,
        }}>
          <div style={{fontSize:48}}>💸</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:18,fontWeight:700,color:C.text}}>Sin categorías aún</div>
          <div style={{fontSize:13,color:C.textMuted,textAlign:"center",maxWidth:300,lineHeight:1.6}}>
            Hacé clic en <strong style={{color:accentColor}}>+ Categoría</strong> para agregar tu primera categoría de gastos.
          </div>
        </div>
      )}

      {/* Main table */}
      {data.categories.length > 0 && (
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden",marginBottom:24}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:1100}}>
              <thead>
                <tr>
                  <th style={{...thSt,textAlign:"left",width:220,position:"sticky",left:0,zIndex:3,paddingLeft:20}}>Ítem</th>
                  {EXPENSE_MONTHS.map((m,i)=>(
                    <th key={i} style={{...thSt,width:90}}>{m}</th>
                  ))}
                  <th style={{...thSt,width:110,color:accentColor}}>Total</th>
                  <th style={{...thSt,width:90,color:C.textMuted}}>Tendencia</th>
                  <th style={{...thSt,width:44}}></th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((cat,ci)=>(
                  <React.Fragment key={cat.id}>
                    {/* Category header row */}
                    <tr style={{background:`${accentColor}0a`}}>
                      <td colSpan={15} style={{padding:"8px 20px",borderBottom:`1px solid ${C.border}`}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          {/* Move up/down */}
                          <button onClick={()=>moveCategory(cat.id,-1)} disabled={ci===0} style={{background:"transparent",border:"none",color:ci===0?C.textMuted:C.textSub,cursor:ci===0?"default":"pointer",fontSize:12,padding:"0 3px",opacity:ci===0?0.3:1}}>▲</button>
                          <button onClick={()=>moveCategory(cat.id,1)} disabled={ci===data.categories.length-1} style={{background:"transparent",border:"none",color:ci===data.categories.length-1?C.textMuted:C.textSub,cursor:ci===data.categories.length-1?"default":"pointer",fontSize:12,padding:"0 3px",opacity:ci===data.categories.length-1?0.3:1}}>▼</button>

                          {editingCat===cat.id ? (
                            <input autoFocus value={catDraft}
                              onChange={e=>setCatDraft(e.target.value)}
                              onBlur={()=>renameCategory(cat.id,catDraft||cat.name)}
                              onKeyDown={e=>{if(e.key==="Enter")renameCategory(cat.id,catDraft||cat.name);if(e.key==="Escape")setEditingCat(null);}}
                              style={{background:C.surface,border:`1px solid ${accentColor}`,borderRadius:6,color:C.text,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,padding:"3px 8px",outline:"none",minWidth:180}}
                            />
                          ) : (
                            <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,color:accentColor,fontStyle:"italic",cursor:"pointer"}}
                              onClick={()=>{setCatDraft(cat.name);setEditingCat(cat.id);}}>
                              {cat.name}
                            </span>
                          )}

                          <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:"auto"}}>
                            <button onClick={()=>addItem(cat.id)} style={{
                              background:`${accentColor}14`,border:`1px solid ${accentColor}40`,
                              color:accentColor,fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,
                              padding:"4px 10px",cursor:"pointer",borderRadius:7,transition:"all 0.15s",
                            }}
                              onMouseEnter={e=>e.currentTarget.style.background=`${accentColor}28`}
                              onMouseLeave={e=>e.currentTarget.style.background=`${accentColor}14`}
                            >+ Ítem</button>
                            {confirmCat===cat.id ? (
                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                <span style={{fontSize:11,color:C.red,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>¿Eliminar?</span>
                                <button onClick={()=>deleteCategory(cat.id)} style={{
                                  background:C.redBg,border:`1px solid ${C.red}`,
                                  color:C.red,fontSize:11,fontWeight:600,padding:"5px 10px",
                                  cursor:"pointer",borderRadius:7,fontFamily:"'DM Sans',sans-serif",
                                }}>Sí</button>
                                <button onClick={()=>setConfirmCat(null)} style={{
                                  background:"transparent",border:`1px solid ${C.border}`,
                                  color:C.textMuted,fontSize:11,padding:"5px 10px",
                                  cursor:"pointer",borderRadius:7,fontFamily:"'DM Sans',sans-serif",
                                }}>No</button>
                              </div>
                            ) : (
                              <button onClick={()=>setConfirmCat(cat.id)} style={{
                                background:"transparent",border:`1px solid ${C.border}`,
                                color:C.textMuted,fontSize:13,padding:"6px 12px",
                                cursor:"pointer",borderRadius:7,transition:"all 0.15s",
                                minWidth:36,minHeight:34,
                              }}
                                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.red;e.currentTarget.style.color=C.red;e.currentTarget.style.background=C.redBg;}}
                                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMuted;e.currentTarget.style.background="transparent";}}
                                title="Eliminar categoría"
                              >🗑</button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Item rows */}
                    {cat.items.length === 0 && (
                      <tr>
                        <td colSpan={15} style={{padding:"10px 20px",borderBottom:`1px solid ${C.border}`,color:C.textMuted,fontSize:12,fontStyle:"italic"}}>
                          Sin ítems — hacé clic en &quot;+ Ítem&quot; para agregar.
                        </td>
                      </tr>
                    )}
                    {cat.items.map((item,ii)=>(
                      <tr key={item.id}
                        onMouseEnter={e=>e.currentTarget.style.background=C.cardHover}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                        style={{transition:"background 0.12s"}}
                      >
                        {/* Item name */}
                        <td style={{padding:"6px 8px 6px 20px",borderBottom:`1px solid ${C.border}`,position:"sticky",left:0,background:"inherit",zIndex:1}}>
                          {editingItem===item.id ? (
                            <input autoFocus value={itemDraft}
                              onChange={e=>setItemDraft(e.target.value)}
                              onBlur={()=>renameItem(cat.id,item.id,itemDraft||item.name)}
                              onKeyDown={e=>{if(e.key==="Enter")renameItem(cat.id,item.id,itemDraft||item.name);if(e.key==="Escape")setEditingItem(null);}}
                              style={{background:C.surface,border:`1px solid ${accentColor}60`,borderRadius:6,color:C.text,fontFamily:"'DM Sans',sans-serif",fontSize:13,padding:"3px 8px",outline:"none",width:"100%",boxSizing:"border-box"}}
                            />
                          ) : (
                            <span style={{fontSize:13,color:C.text,cursor:"pointer"}}
                              onClick={()=>{setItemDraft(item.name);setEditingItem(item.id);}}>
                              {item.name}
                            </span>
                          )}
                        </td>
                        {/* Month cells */}
                        {EXPENSE_MONTHS.map((_,mi)=>(
                          <td key={mi} style={{padding:"4px 6px",borderBottom:`1px solid ${C.border}`,minWidth:80}}>
                            <ExpCell
                              value={item.months?.[mi+1]||""}
                              onChange={v=>setMonthValue(cat.id,item.id,mi+1,v)}
                              color={accentColor}
                            />
                            <div style={{display:"flex",justifyContent:"flex-end",marginTop:2}}>
                              <ExpCommentCell
                                comment={item.comments?.[mi+1]||""}
                                onSave={v=>setMonthComment(cat.id,item.id,mi+1,v)}
                                color={accentColor}
                              />
                            </div>
                          </td>
                        ))}
                        {/* Row total */}
                        <td style={{padding:"6px 10px",borderBottom:`1px solid ${C.border}`,textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:12,color:accentColor,fontWeight:600,whiteSpace:"nowrap"}}>
                          {rowTotal(item)>0?fmt(rowTotal(item)):"—"}
                        </td>
                        {/* Sparkline */}
                        <td style={{padding:"6px 10px",borderBottom:`1px solid ${C.border}`,textAlign:"center"}}>
                          <ExpSparkline item={item} color={accentColor}/>
                        </td>
                        {/* Delete */}
                        <td style={{padding:"6px 8px",borderBottom:`1px solid ${C.border}`,textAlign:"center"}}>
                          <button onClick={()=>deleteItem(cat.id,item.id)} style={{
                            background:"transparent",border:"none",color:C.textMuted,
                            cursor:"pointer",fontSize:15,padding:"2px 5px",lineHeight:1,borderRadius:5,transition:"all 0.15s",
                          }}
                            onMouseEnter={e=>{e.currentTarget.style.color=C.red;e.currentTarget.style.background=C.redBg;}}
                            onMouseLeave={e=>{e.currentTarget.style.color=C.textMuted;e.currentTarget.style.background="transparent";}}
                          >×</button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {/* Total mensual row */}
                <tr style={{background:`${accentColor}14`}}>
                  <td style={{padding:"12px 20px",borderTop:`2px solid ${accentColor}60`,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,color:accentColor,position:"sticky",left:0,background:`${accentColor}14`}}>
                    Total mensual
                  </td>
                  {EXPENSE_MONTHS.map((_,mi)=>(
                    <td key={mi} style={{padding:"12px 10px",borderTop:`2px solid ${accentColor}60`,textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:colTotal(mi+1)>0?C.text:C.textMuted,whiteSpace:"nowrap"}}>
                      {colTotal(mi+1)>0?fmt(colTotal(mi+1)):"—"}
                    </td>
                  ))}
                  <td style={{padding:"12px 10px",borderTop:`2px solid ${accentColor}60`,textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:700,color:accentColor,whiteSpace:"nowrap"}}>
                    {fmt(EXPENSE_MONTHS.reduce((_,__,mi)=>_+colTotal(mi+1),0))}
                  </td>
                  <td style={{borderTop:`2px solid ${accentColor}60`}}/>
                  <td style={{borderTop:`2px solid ${accentColor}60`}}/>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer note */}
      <div style={{fontSize:11,color:C.textMuted,fontFamily:"'DM Mono',monospace",textAlign:"right"}}>
        Los datos se guardan automáticamente · Clic en cualquier celda para editar · USD se anota como referencia (ej: &quot;400 USD&quot;)
      </div>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function PortfolioTracker(){
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const [showCompare,setShowCompare]=useState(false);
  const [saving,setSaving]=useState(false);
  const [savedMsg,setSavedMsg]=useState("");
  const [data,setData]=useState({cedears:[emptyRow()],pesos:[emptyRow()],crypto:[emptyRow()]});
  const [prevData,setPrevData]=useState(null);
  const [fxRates,setFxRates]=useState(EMPTY_FX);
  const [showARS,setShowARS]=useState(false);
  const [cash,setCash]=useState(EMPTY_CASH);
  const [activeTab,setActiveTab]=useState("portfolio"); // "portfolio" | "eot"

  useEffect(()=>{
    const loaded={};
    for(const s of ["cedears","pesos","crypto"]){
      try{
        const r=localStorage.getItem(makeKey(s,year,month+1));
        loaded[s]=r?JSON.parse(r):[emptyRow()];
      } catch{ loaded[s]=[emptyRow()]; }
    }
    setData(loaded);
    try{
      const fx=localStorage.getItem(fxKey(year,month+1));
      setFxRates(fx?JSON.parse(fx):EMPTY_FX);
    } catch{ setFxRates(EMPTY_FX); }
    try{
      const c=localStorage.getItem(cashKey(year,month+1));
      setCash(c?JSON.parse(c):EMPTY_CASH);
    } catch{ setCash(EMPTY_CASH); }
  },[year,month]);

  useEffect(()=>{
    if(!showCompare){setPrevData(null);return;}
    let pm=month-1,py=year;
    if(pm<0){pm=11;py-=1;}
    const loaded={};
    for(const s of ["cedears","pesos","crypto"]){
      try{
        const r=localStorage.getItem(makeKey(s,py,pm+1));
        loaded[s]=r?JSON.parse(r):[];
      } catch{ loaded[s]=[]; }
    }
    setPrevData(loaded);
  },[showCompare,year,month]);

  const save=useCallback(()=>{
    setSaving(true);
    for(const s of ["cedears","pesos","crypto"]){
      try{ localStorage.setItem(makeKey(s,year,month+1),JSON.stringify(data[s])); }
      catch(e){ console.error(e); }
    }
    try{ localStorage.setItem(fxKey(year,month+1),JSON.stringify(fxRates)); }
    catch(e){ console.error(e); }
    try{ localStorage.setItem(cashKey(year,month+1),JSON.stringify(cash)); }
    catch(e){ console.error(e); }
    setSaving(false);setSavedMsg("Guardado ✓");
    setTimeout(()=>setSavedMsg(""),2500);
  },[data,fxRates,cash,year,month]);

  function prevM(){if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}
  const prevMonthLabel = `${MONTHS[month===0?11:month-1]} ${month===0?year-1:year}`;
  function nextM(){if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}
  // Supports both plain arrays and functional updaters (prev => newRows)
  function updateSection(key, rowsOrUpdater) {
    setData(d => {
      const current = Array.isArray(d[key]) ? d[key] : [];
      const next = typeof rowsOrUpdater === "function" ? rowsOrUpdater(current) : rowsOrUpdater;
      return { ...d, [key]: Array.isArray(next) ? next : current };
    });
  }

  // FX helpers for summary cards — mirrors SectionTable logic exactly
  const APP_FX_KEY = { cedears:"mep", pesos:"mep", crypto:"crypto" };
  function sectionFxRate(s){ return parseFloat(fxRates?.[APP_FX_KEY[s]])||null; }
  function sectionToDisplay(s, nativeVal){
    if(nativeVal===null||nativeVal===undefined) return null;
    const isARS = SECTION_META[s].currency==="ARS";
    const needsConv = showARS !== isARS;
    if(!needsConv) return nativeVal;
    const rate = sectionFxRate(s);
    if(!rate) return null;
    if(showARS && !isARS) return nativeVal * rate;   // USD→ARS
    if(!showARS && isARS) return nativeVal / rate;   // ARS→USD
    return nativeVal;
  }

  const sectionTotals=["cedears","pesos","crypto"].map(s=>{
    const rows=Array.isArray(data[s])?data[s]:[];
    const nativeVal=rows.reduce((a,r)=>a+(calcPnL(r).value||0),0);
    const nativePnl=rows.reduce((a,r)=>a+(calcPnL(r).pnlAmt||0),0);
    const cost=rows.reduce((a,r)=>a+(parseFloat(r.shares)||0)*(parseFloat(r.buyPrice)||0),0);
    const pct=cost>0?(nativePnl/cost)*100:0;
    // sectionToDisplay returns null when rate is missing — keep null so UI shows "—"
    const val=sectionToDisplay(s,nativeVal);
    const pnl=sectionToDisplay(s,nativePnl);
    return{key:s,val:val??0,pnl:pnl??0,pct,missingRate:val===null&&nativeVal>0};
  });

  const totalVal=sectionTotals.reduce((a,s)=>a+s.val,0);
  const totalPnL=sectionTotals.reduce((a,s)=>a+s.pnl,0);
  const totalCost=["cedears","pesos","crypto"].reduce((a,s)=>a+(Array.isArray(data[s])?data[s]:[]).reduce((b,r)=>b+(parseFloat(r.shares)||0)*(parseFloat(r.buyPrice)||0),0),0);
  const totalPct=totalCost>0?(["cedears","pesos","crypto"].reduce((a,s)=>a+(Array.isArray(data[s])?data[s]:[]).reduce((b,r)=>b+(calcPnL(r).pnlAmt||0),0),0)/totalCost)*100:0;
  // Cash panel totals (native currencies: Pesos=ARS, Dolares=USD)
  const totalPesosARS = (parseFloat(cash.uala)||0) + (parseFloat(cash.mp)||0);
  const totalDolaresUSD = (parseFloat(cash.fisicos)||0) + (parseFloat(cash.online_banco)||0) + (parseFloat(cash.online_iol)||0);
  const mepRate = parseFloat(fxRates?.mep)||null;
  const cclRate = parseFloat(fxRates?.ccl)||null;
  // Convert for display
  const pesosDisplay  = showARS ? totalPesosARS   : (mepRate ? totalPesosARS/mepRate : null);
  const dolaresDisplay= showARS ? (cclRate ? totalDolaresUSD*cclRate : null) : totalDolaresUSD;

  // Full chart data: investment sections + cash positions
  const cashChartItems = [
    pesosDisplay!==null && pesosDisplay>0   ? { name:"Pesos",   value:pesosDisplay,   color:"#22c55e", emoji:"💰" } : null,
    dolaresDisplay!==null && dolaresDisplay>0 ? { name:"Dólares", value:dolaresDisplay, color:"#38bdf8", emoji:"💵" } : null,
  ].filter(Boolean);
  const chartData=[
    ...sectionTotals.filter(s=>s.val>0).map(s=>({
      name:SECTION_META[s.key].label,
      value:s.val,
      color:SECTION_META[s.key].color,
      emoji:SECTION_META[s.key].emoji,
    })),
    ...cashChartItems,
  ];
  const chartTotal = chartData.reduce((a,d)=>a+d.value,0);

  // ── Grand Total calculations ────────────────────────────────────────────────
  // Helper: get native val for a section
  const nativeValOf = s => (Array.isArray(data[s])?data[s]:[]).reduce((a,r)=>a+(calcPnL(r).value||0),0);
  const nativeCostOf = s => (Array.isArray(data[s])?data[s]:[]).reduce((a,r)=>a+(parseFloat(r.shares)||0)*(parseFloat(r.buyPrice)||0),0);

  // 1. Grand Pesos = cash Pesos (ARS) + Merval native ARS — always in ARS
  const mervalNativeARS = nativeValOf("pesos");  // Merval is native ARS
  const grandPesosARS   = totalPesosARS + mervalNativeARS;

  // 2. Dolarizado = Dólares (USD) + CEDEARs (USD) + Crypto (USD) — toggle-aware
  const cedearNativeARS  = nativeValOf("cedears");
  const cedearUSD        = (mepRate && cedearNativeARS) ? cedearNativeARS / mepRate : null;
  const cryptoNativeUSD  = nativeValOf("crypto");
  const grandDolarizadoUSD = (cedearUSD !== null)
    ? totalDolaresUSD + cedearUSD + cryptoNativeUSD
    : null;
  // Convert to ARS if toggle is ARS (CEDEARs already native ARS, crypto/dólares × CCL)
  const grandDolarizadoDisp = showARS
    ? (cclRate
        ? (cedearNativeARS + totalDolaresUSD * cclRate + cryptoNativeUSD * cclRate)
        : null)
    : grandDolarizadoUSD;

  // 3. Total Portfolio — already computed as totalVal (respects USD/ARS toggle)

  // 4. Total Invested = cost basis of CEDEARs + Merval + Crypto (in display currency)
  const investedCedearARS = nativeCostOf("cedears");  // now native ARS
  const investedMervalARS = nativeCostOf("pesos");
  const investedCryptoUSD = nativeCostOf("crypto");
  // Convert each to display currency then sum
  const investedCedearDisp = showARS ? investedCedearARS : (mepRate ? investedCedearARS/mepRate : null);
  const investedMervalDisp = !showARS && mepRate ? investedMervalARS/mepRate : showARS ? investedMervalARS : null;
  const investedCryptoDisp = showARS && cclRate ? investedCryptoUSD*cclRate : !showARS ? investedCryptoUSD : null;
  const grandTotalInvestedDisp = (investedCedearDisp!==null && investedMervalDisp!==null && investedCryptoDisp!==null)
    ? investedCedearDisp + investedMervalDisp + investedCryptoDisp : null;

  // Grand Total = Pesos (ARS→disp) + Dolarizado (USD→disp) fully converted
  // Pesos side: grandPesosARS converted to display currency
  const grandPesosDisp = showARS ? grandPesosARS : (mepRate ? grandPesosARS/mepRate : null);
  // Grand Total All = Pesos side + Dolarizado side (both in display currency)
  const grandTotalAllDisp = (grandPesosDisp!==null && grandDolarizadoDisp!==null)
    ? grandPesosDisp + grandDolarizadoDisp
    : null;

  // P&L on invested = totalVal vs totalInvested (in same display currency)
  const investedPnLDisp = (grandTotalInvestedDisp!==null && totalVal>0) ? totalVal - grandTotalInvestedDisp : null;
  const investedPnLPct  = (grandTotalInvestedDisp!==null && grandTotalInvestedDisp>0 && investedPnLDisp!==null)
    ? (investedPnLDisp/grandTotalInvestedDisp)*100 : null;



  // ── Export / Import ────────────────────────────────────────────────────────
  function handleExport() {
    // Collect all portfolio keys from localStorage
    save(); // flush current month first
    const keys = Object.keys(localStorage).filter(k => k.startsWith("portfolio:"));
    const payload = {};
    keys.forEach(k => {
      try { payload[k] = JSON.parse(localStorage.getItem(k)); } catch {}
    });
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const date = new Date();
    const stamp = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    a.href     = url;
    a.download = `portfolio-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const payload = JSON.parse(evt.target.result);
        if (typeof payload !== "object" || Array.isArray(payload))
          throw new Error("Formato inválido");
        // Write all keys to localStorage
        Object.entries(payload).forEach(([k, v]) => {
          try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
        });
        // Reload current month view
        const loaded = {};
        for (const s of ["cedears","pesos","crypto"]) {
          try { const r = localStorage.getItem(makeKey(s,year,month+1)); loaded[s] = r ? JSON.parse(r) : [emptyRow()]; }
          catch { loaded[s] = [emptyRow()]; }
        }
        setData(loaded);
        try { const fx = localStorage.getItem(fxKey(year,month+1)); setFxRates(fx ? JSON.parse(fx) : EMPTY_FX); } catch {}
        try { const c = localStorage.getItem(cashKey(year,month+1)); setCash(c ? JSON.parse(c) : EMPTY_CASH); } catch {}
        alert("✓ Datos importados correctamente.");
      } catch(err) {
        alert("Error al importar: " + err.message);
      }
      // Reset input so the same file can be re-imported if needed
      e.target.value = "";
    };
    reader.readAsText(file);
  }

  const btnBase={
    background:C.card,border:`1px solid ${C.border}`,color:C.textSub,
    cursor:"pointer",padding:"6px 13px",fontSize:18,borderRadius:9,
    transition:"all 0.18s",lineHeight:1,fontFamily:"sans-serif",
  };

  return (
    <>
      <style>{FONTS}</style>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${C.bg};color:${C.text};font-family:'DM Sans',sans-serif;}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
        input::placeholder{color:${C.textMuted};}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:10px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        .fu{animation:fadeUp 0.45s cubic-bezier(.16,1,.3,1) forwards;}
      `}</style>

      <div style={{minHeight:"100vh",background:C.bg}}>

        {/* ── Top nav ── */}
        <header style={{
          position:"sticky",top:0,zIndex:200,
          background:`${C.surface}ee`,backdropFilter:"blur(24px)",
          borderBottom:`1px solid ${C.border}`,
          padding:"0 28px",display:"flex",alignItems:"center",gap:16,height:62,
        }}>
          {/* Brand */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginRight:6}}>
            <div style={{
              width:34,height:34,borderRadius:11,
              background:`linear-gradient(135deg,${C.accent},${C.crypto})`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,
              boxShadow:`0 0 18px ${C.accent}40`,
            }}>📊</div>
            <span style={{fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:19,letterSpacing:"0",color:C.text}}>
              Port<span style={{color:C.accent}}>folio</span>
            </span>
          </div>

          <div style={{width:1,height:24,background:C.border}}/>

          {/* Tab switcher */}
          <div style={{display:"flex",alignItems:"center",gap:2,background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:3}}>
            {[{key:"portfolio",label:"Portfolio",icon:"📊"},{key:"eot",label:"EOT",icon:"📈"},{key:"expenses",label:"Expenses",icon:"💸"}].map(t=>{
              const active=activeTab===t.key;
              return (
                <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{
                  background:active?C.accent:"transparent",
                  border:"none",
                  color:active?"#fff":C.textMuted,
                  fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,
                  padding:"5px 14px",cursor:"pointer",borderRadius:7,
                  transition:"all 0.2s",display:"flex",alignItems:"center",gap:5,
                }}>
                  <span>{t.icon}</span>{t.label}
                </button>
              );
            })}
          </div>

          <div style={{width:1,height:24,background:C.border}}/>

          {/* Month selector — hidden on EOT tab */}
          <div style={{display:activeTab==="portfolio"?"flex":"none",alignItems:"center",gap:8}}>
            <button style={btnBase} onClick={prevM}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textSub;}}
            >‹</button>
            <div style={{
              padding:"5px 18px",background:C.card,border:`1px solid ${C.border}`,
              borderRadius:9,fontFamily:"'DM Mono',monospace",fontSize:13,
              color:C.text,minWidth:168,textAlign:"center",fontWeight:500,letterSpacing:"0.02em",
            }}>{MONTHS[month]} {year}</div>
            <button style={btnBase} onClick={nextM}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textSub;}}
            >›</button>
          </div>

          <div style={{flex:1}}/>

          {/* ARS / USD toggle — always visible */}
          <div style={{
            display:"flex",alignItems:"center",background:C.card,
            border:`1px solid ${C.border}`,borderRadius:9,padding:3,gap:2,
          }}>
            {["USD","ARS"].map(cur=>{
              const active=(cur==="ARS"?showARS:!showARS);
              const color=cur==="ARS"?C.pesos:C.cedear;
              return (
                <button key={cur} onClick={()=>setShowARS(cur==="ARS")} style={{
                  background:active?`${color}20`:"transparent",
                  border:`1px solid ${active?color+"60":"transparent"}`,
                  color:active?color:C.textMuted,
                  fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:600,
                  padding:"5px 14px",cursor:"pointer",borderRadius:7,
                  transition:"all 0.2s",letterSpacing:"0.06em",
                }}>{cur}</button>
              );
            })}
          </div>

          {/* Compare toggle */}
          <button onClick={()=>setShowCompare(c=>!c)} style={{
            background:showCompare?`${C.accent}1a`:"transparent",
            border:`1px solid ${showCompare?C.accent:C.border}`,
            color:showCompare?C.accent:C.textSub,
            fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,
            padding:"7px 18px",cursor:"pointer",borderRadius:9,
            display:"flex",alignItems:"center",gap:7,transition:"all 0.2s",
          }}>
            <span style={{fontSize:16}}>⇄</span> Comparar mes
          </button>

          {/* Export / Import */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {/* Hidden file input for import */}
            <input
              id="import-file-input" type="file" accept=".json"
              style={{display:"none"}} onChange={handleImport}
            />
            <button onClick={()=>document.getElementById("import-file-input").click()} style={{
              background:"transparent",border:`1px solid ${C.border}`,
              color:C.textSub,fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,
              padding:"7px 14px",cursor:"pointer",borderRadius:9,
              display:"flex",alignItems:"center",gap:6,transition:"all 0.2s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.pesos;e.currentTarget.style.color=C.pesos;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textSub;}}
              title="Importar backup JSON"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Importar
            </button>
            <button onClick={handleExport} style={{
              background:"transparent",border:`1px solid ${C.border}`,
              color:C.textSub,fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,
              padding:"7px 14px",cursor:"pointer",borderRadius:9,
              display:"flex",alignItems:"center",gap:6,transition:"all 0.2s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.cedear;e.currentTarget.style.color=C.cedear;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textSub;}}
              title="Exportar todos los datos como JSON"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar
            </button>
          </div>

          <div style={{width:1,height:24,background:C.border}}/>

          {/* Save local */}
          <button onClick={save} style={{
            background:savedMsg?C.greenBg:`linear-gradient(135deg,${C.accent}dd,${C.crypto}88)`,
            border:`1px solid ${savedMsg?C.green:C.accent+"88"}`,
            color:savedMsg?C.green:C.text,
            fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,
            padding:"7px 22px",cursor:"pointer",borderRadius:9,
            boxShadow:savedMsg?"none":`0 0 22px ${C.accent}30`,
            transition:"all 0.25s",
          }}>
            {saving?"Guardando…":savedMsg||"Guardar"}
          </button>
        </header>

        {activeTab==="eot"&&<EOTView showARS={showARS}/>}
        {activeTab==="expenses"&&<ExpensesView/>}
        <main style={{display:activeTab==="portfolio"?"block":"none",padding:"26px 28px 52px",maxWidth:1380,margin:"0 auto"}}>

          {/* ── Grand Totals ── */}
          <div style={{marginBottom:22}} className="fu">
            <div style={{
              color:C.textMuted,fontSize:10,fontWeight:600,letterSpacing:"0.12em",
              textTransform:"uppercase",marginBottom:12,
            }}>Grand Totals</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>

              {/* 1. Pesos */}
              <div style={{
                background:C.card,border:"1px solid #26262e",borderRadius:16,
                padding:"20px 22px",position:"relative",overflow:"hidden",
                boxShadow:"0 4px 24px #00000030",
              }}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#22c55e,#22c55e00)",borderRadius:"16px 16px 0 0"}}/>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:16}}>💰</span>
                  <span style={{fontSize:11,fontWeight:600,color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase"}}>Pesos</span>
                </div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:26,fontWeight:700,color:"#f0f0f5",marginBottom:4,lineHeight:1}}>
                  {fmt(grandPesosARS)}
                </div>
                <div style={{fontSize:10,color:"#5a5a72",fontFamily:"'DM Mono',monospace"}}>ARS · Efectivo + Merval</div>
              </div>

              {/* 2. Dolarizado */}
              <div style={{
                background:C.card,border:"1px solid #26262e",borderRadius:16,
                padding:"20px 22px",position:"relative",overflow:"hidden",
                boxShadow:"0 4px 24px #00000030",
              }}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#38bdf8,#38bdf800)",borderRadius:"16px 16px 0 0"}}/>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:16}}>💵</span>
                  <span style={{fontSize:11,fontWeight:600,color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase"}}>Dolarizado</span>
                </div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:26,fontWeight:700,color:"#f0f0f5",marginBottom:4,lineHeight:1}}>
                  {grandDolarizadoDisp!==null?fmt(grandDolarizadoDisp):"—"}
                </div>
                <div style={{fontSize:10,color:"#5a5a72",fontFamily:"'DM Mono',monospace"}}>
                  {showARS?"ARS":"USD"} · Dólares + CEDEARs (÷ MEP) + Crypto
                </div>
              </div>

              {/* 3. Grand Total */}
              <div style={{
                background:`linear-gradient(135deg,${C.card},${C.surface})`,
                border:`1px solid ${C.border}`,borderRadius:16,
                padding:"20px 22px",position:"relative",overflow:"hidden",
                boxShadow:"0 4px 28px #00000050",
              }}>
                <div style={{position:"absolute",top:-20,right:-20,width:90,height:90,background:`radial-gradient(circle,${C.accent}22,transparent 70%)`,borderRadius:"50%"}}/>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:16}}>📊</span>
                  <span style={{fontSize:11,fontWeight:600,color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase"}}>Grand Total</span>
                </div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:26,fontWeight:700,color:C.text,marginBottom:6,lineHeight:1}}>
                  {grandTotalAllDisp!==null?fmt(grandTotalAllDisp):"—"}
                </div>
                <div style={{fontSize:10,color:C.textMuted,fontFamily:"'DM Mono',monospace"}}>
                  {showARS?"ARS":"USD"} · Pesos + Dólares + CEDEARs + Merval + Crypto
                </div>
              </div>

              {/* 4. Total Invested */}
              <div style={{
                background:C.card,border:`1px solid ${C.border}`,borderRadius:16,
                padding:"20px 22px",position:"relative",overflow:"hidden",
                boxShadow:"0 4px 24px #00000030",
              }}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${C.accent},${C.accent}00)`,borderRadius:"16px 16px 0 0"}}/>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:16}}>📈</span>
                  <span style={{fontSize:11,fontWeight:600,color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase"}}>Total Invested</span>
                </div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:26,fontWeight:700,color:C.text,marginBottom:6,lineHeight:1}}>
                  {grandTotalInvestedDisp!==null?fmt(grandTotalInvestedDisp):"—"}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  {investedPnLDisp!==null&&(
                    <Badge color={pnlColor(investedPnLDisp)}>{fmtPct(investedPnLPct)}</Badge>
                  )}
                  <span style={{fontSize:10,color:C.textMuted,fontFamily:"'DM Mono',monospace"}}>{showARS?"ARS":"USD"} · CEDEARs + Merval + Crypto</span>
                </div>
              </div>

            </div>
          </div>

          {/* ── Summary row ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:16,marginBottom:22}} className="fu">

            {/* Per-section */}
            {sectionTotals.map(s=>{
              const meta=SECTION_META[s.key];
              return (
                <div key={s.key} style={{
                  background:C.card,border:`1px solid ${C.border}`,borderRadius:16,
                  padding:"20px 22px",position:"relative",overflow:"hidden",
                  boxShadow:"0 4px 24px #00000030",
                }}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${meta.color},${meta.color}00)`,borderRadius:"16px 16px 0 0"}}/>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                    <span style={{fontSize:18}}>{meta.emoji}</span>
                    <span style={{fontSize:12,fontWeight:600,color:C.textSub}}>{meta.label}</span>
                  </div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:500,color:C.text,marginBottom:8}}>
                    {s.val>0?fmt(s.val):"—"} <span style={{fontSize:11,color:C.textMuted}}>{showARS?"ARS":"USD"}</span>
                  </div>
                  <Badge color={pnlColor(s.pnl)}>{s.val>0?fmtPct(s.pct):"—"}</Badge>
                </div>
              );
            })}

            {/* Pesos cash card */}
            {totalPesosARS>0&&(
              <div style={{background:"#18181c",border:"1px solid #26262e",borderRadius:16,padding:"20px 22px",position:"relative",overflow:"hidden",boxShadow:"0 4px 24px #00000030"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#22c55e,#22c55e00)",borderRadius:"16px 16px 0 0"}}/>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                  <span style={{fontSize:18}}>💰</span>
                  <span style={{fontSize:12,fontWeight:600,color:"#a0a0b8"}}>Pesos</span>
                </div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:18,fontWeight:500,color:"#f0f0f5",marginBottom:8}}>
                  {pesosDisplay!==null?fmt(pesosDisplay):"—"} <span style={{fontSize:11,color:"#5a5a72"}}>{showARS?"ARS":"USD"}</span>
                </div>
                <div style={{fontSize:11,color:"#5a5a72",fontFamily:"'DM Mono',monospace"}}>
                  {fmt(totalPesosARS)} ARS nativo
                </div>
              </div>
            )}

            {/* Dólares cash card */}
            {totalDolaresUSD>0&&(
              <div style={{background:"#18181c",border:"1px solid #26262e",borderRadius:16,padding:"20px 22px",position:"relative",overflow:"hidden",boxShadow:"0 4px 24px #00000030"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#38bdf8,#38bdf800)",borderRadius:"16px 16px 0 0"}}/>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                  <span style={{fontSize:18}}>💵</span>
                  <span style={{fontSize:12,fontWeight:600,color:"#a0a0b8"}}>Dólares</span>
                </div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:18,fontWeight:500,color:"#f0f0f5",marginBottom:8}}>
                  {dolaresDisplay!==null?fmt(dolaresDisplay):"—"} <span style={{fontSize:11,color:"#5a5a72"}}>{showARS?"ARS":"USD"}</span>
                </div>
                <div style={{fontSize:11,color:"#5a5a72",fontFamily:"'DM Mono',monospace"}}>
                  {fmt(totalDolaresUSD)} USD nativo
                </div>
              </div>
            )}
          </div>

          {/* ── Allocation panel ── */}
          {chartData.length>0&&(
            <div style={{
              background:C.card,border:`1px solid ${C.border}`,borderRadius:16,
              padding:"20px 26px",marginBottom:26,
              display:"grid",gridTemplateColumns:"180px 1fr",gap:24,alignItems:"center",
            }} className="fu">
              <DonutChart data={chartData}/>
              <div>
                <div style={{color:C.textMuted,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:16,fontWeight:600}}>Distribución</div>
                {chartData.map((d,i)=>{
                  const pct=chartTotal>0?(d.value/chartTotal)*100:0;
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                      <span style={{fontSize:15}}>{d.emoji}</span>
                      <span style={{fontSize:12,color:C.textSub,width:130,fontWeight:500}}>{d.name}</span>
                      <div style={{flex:1,height:7,background:C.border,borderRadius:99,overflow:"hidden"}}>
                        <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${d.color},${d.color}80)`,borderRadius:99,transition:"width 0.7s cubic-bezier(.16,1,.3,1)"}}/>
                      </div>
                      <span style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:C.text,width:42,textAlign:"right"}}>{fmt(pct,1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* ── FX Rates panel ── */}
          <div style={{
            background:C.card,border:`1px solid ${C.border}`,borderRadius:16,
            padding:"18px 24px",marginBottom:26,display:"flex",
            alignItems:"center",gap:32,flexWrap:"wrap",
          }} className="fu">
            <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:120}}>
              <div style={{color:C.textMuted,fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase"}}>Tipo de cambio</div>
              <div style={{color:C.textSub,fontSize:11,marginTop:2}}>{MONTHS[month]} {year}</div>
            </div>
            <div style={{width:1,height:40,background:C.border,flexShrink:0}}/>
            {[
              {key:"mep",  label:"Dólar MEP",    color:C.cedear, prefix:"$"},
              {key:"ccl",  label:"Dólar CCL",    color:C.pesos,  prefix:"$"},
              {key:"crypto",label:"Dólar Crypto", color:C.crypto, prefix:"$"},
            ].map(({key,label,color,prefix})=>(
              <div key={key} style={{display:"flex",flexDirection:"column",gap:6,minWidth:160}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:8,height:8,borderRadius:2,background:color,flexShrink:0}}/>
                  <span style={{fontSize:11,color:C.textMuted,fontWeight:500,letterSpacing:"0.06em",textTransform:"uppercase"}}>{label}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,
                  background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,
                  padding:"7px 12px",transition:"border-color 0.2s",
                }}
                  onFocus={e=>e.currentTarget.style.borderColor=color}
                  onBlur={e=>e.currentTarget.style.borderColor=C.border}
                >
                  <span style={{color:C.textMuted,fontSize:13,fontFamily:"'DM Mono',monospace"}}>{prefix}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fxRates[key]}
                    onChange={e=>setFxRates(r=>({...r,[key]:e.target.value}))}
                    placeholder="0,00"
                    style={{
                      background:"transparent",border:"none",outline:"none",
                      color:C.text,fontFamily:"'DM Mono',monospace",fontSize:14,
                      fontWeight:500,width:"100%",
                    }}
                  />
                </div>
                {fxRates[key]&&(
                  <div style={{fontSize:10,color:C.textMuted,fontFamily:"'DM Mono',monospace",paddingLeft:2}}>
                    ARS {fmt(parseFloat(fxRates[key]))}
                  </div>
                )}
              </div>
            ))}
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,color:C.textMuted,fontSize:11}}>
              <span style={{fontSize:14}}>ℹ</span>
              <span>Se usarán para calcular valores en ARS / USD</span>
            </div>
          </div>

          {/* ── Compare banner ── */}
          {showCompare&&(
            <div style={{
              background:`${C.accent}0c`,border:`1px solid ${C.accent}30`,borderRadius:10,
              padding:"10px 18px",marginBottom:22,
              display:"flex",alignItems:"center",gap:10,fontSize:12,color:C.accent,fontWeight:500,
            }}>
              <span>⇄</span>
              <span>Comparando con <strong>{prevMonthLabel}</strong> · Las variaciones se muestran debajo de cada sección</span>
            </div>
          )}

          {/* ── Cash panels ── */}
          <CashPanel cash={cash} setCash={setCash} showARS={showARS} fxRates={fxRates}/>

          {/* ── Tables + Compare panels ── */}
          {["cedears","pesos","crypto"].map((s,i)=>(
            <div key={s} className="fu" style={{animationDelay:`${i*70}ms`}}>
              <SectionTable
                sectionKey={s}
                data={Array.isArray(data[s])?data[s]:[]}
                onChange={rows=>updateSection(s,rows)}
                compareData={showCompare&&prevData?prevData[s]:null}
                showCompare={showCompare}
                fxRates={fxRates}
                showARS={showARS}
                year={year}
                month={month+1}
              />
              {showCompare&&(
                <ComparePanel
                  sectionKey={s}
                  currentData={Array.isArray(data[s])?data[s]:[]}
                  prevData={prevData?prevData[s]:[]}
                  fxRates={fxRates}
                  showARS={showARS}
                  prevMonthLabel={prevMonthLabel}
                />
              )}
            </div>
          ))}

          {/* Footer */}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:18,marginTop:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{
                background:`${C.accent}18`,color:C.accent,
                fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:600,
                padding:"2px 8px",borderRadius:99,letterSpacing:"0.06em",
              }}>v{APP_VERSION}</span>
              <span style={{fontSize:11,color:C.textMuted}}>Portfolio Tracker · {MONTHS[month]} {year}</span>
            </div>
            <span style={{fontSize:11,color:C.textMuted}}>CEDEARs, Merval y Crypto: lookup local · Datos guardados en localStorage</span>
          </div>
        </main>
      </div>
    </>
  );
}
