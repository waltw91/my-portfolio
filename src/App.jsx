import React, { useState, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

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
// ─────────────────────────────────────────────────────────────────────────────
const APP_VERSION = "2.1";
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
  text: "#f0f0f5",
  textSub: "#a0a0b8",
  textMuted: "#5a5a72",
  cedear: "#f59e0b",
  pesos: "#38bdf8",
  crypto: "#a78bfa",
};

const SECTION_META = {
  cedears: { label: "CEDEARs", sub: "Mercado argentino · USD", currency: "USD", color: C.cedear, emoji: "🏦" },
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

function Badge({children,color}){
  return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:99,background:`${color}18`,color,fontSize:11,fontWeight:600,letterSpacing:"0.04em",fontFamily:"'DM Mono',monospace"}}>{children}</span>;
}

function PnLCell({val,pct,currency}){
  if(val===null) return <span style={{color:C.textMuted,fontSize:12}}>—</span>;
  const pos=val>=0, col=pos?C.green:C.red, bg=pos?C.greenBg:C.redBg;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
      <span style={{color:col,fontWeight:600,fontSize:12,fontFamily:"'DM Mono',monospace",background:bg,padding:"2px 8px",borderRadius:6}}>{fmtPct(pct)}</span>
      <span style={{color:col,fontSize:11,opacity:0.75,fontFamily:"'DM Mono',monospace"}}>{pos?"+":""}{fmt(val)} {currency}</span>
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
                {hasComment ? comment : "Sin comentarios. Hacé clic en "Nueva" para agregar."}
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
      width: 220, flexShrink: 0,
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: "0 0 14px 14px", borderTop: "none",
      padding: "16px 14px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
    }}>
      <div style={{color:C.textMuted,fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",alignSelf:"flex-start"}}>
        Distribución
      </div>

      {/* Donut */}
      <div style={{position:"relative",width:130,height:130}}>
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
      <div style={{width:"100%",display:"flex",flexDirection:"column",gap:5}}>
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
  const FX_KEY_MAP = { cedears:"ccl", pesos:"mep", crypto:"crypto" };
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
                background:totalDelta>=0?C.greenBg:C.redBg,
                border:`1px solid ${totalDelta>=0?C.green:C.red}40`,
                borderRadius:8,padding:"6px 12px",textAlign:"center",minWidth:90,
              }}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:totalDelta>=0?C.green:C.red}}>
                  {totalDelta>=0?"+":""}{fmtPct(totalDeltaPct)}
                </div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:totalDelta>=0?C.green:C.red,marginTop:1}}>
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
          const col = r.deltaVal!==null ? (pos ? C.green : C.red) : C.textMuted;
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
function SectionTable({sectionKey, data: dataProp, onChange, compareData, showCompare, fxRates, showARS}){
  const data = Array.isArray(dataProp) ? dataProp : [];
  const meta = SECTION_META[sectionKey];
  const timers = useRef({});

  // FX conversion — always convert to the selected display currency
  // CEDEARs: native USD → ARS = ×CCL  |  USD = no change
  // Pesos:   native ARS → USD = ÷MEP  |  ARS = no change
  // Crypto:  native USD → ARS = ×Crypto | USD = no change
  const FX_KEY_MAP = { cedears:"ccl", pesos:"mep", crypto:"crypto" };
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
                <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:totPnL>=0?C.green:C.red,marginTop:2}}>
                  {totPnL>=0?"▲":"▼"} {fmtPct(totPct)} &nbsp;({totPnL>=0?"+":""}{fmt(totPnL)})
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

      {/* Table + pie side by side */}
      <div style={{display:"flex",alignItems:"flex-start",gap:0}}>
      <div style={{flex:1,overflowX:"auto",border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 14px 14px",background:C.card}}>
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
                        ?<span style={{color:delta>=0?C.green:C.red,fontWeight:600}}>{delta>=0?"+":""}{fmt(toDisplay(delta))} {dispCurrency}</span>
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
  const APP_FX_KEY = { cedears:"ccl", pesos:"mep", crypto:"crypto" };
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
  const cedearNativeUSD  = nativeValOf("cedears");
  const cryptoNativeUSD  = nativeValOf("crypto");
  const grandDolarizadoUSD = totalDolaresUSD + cedearNativeUSD + cryptoNativeUSD;
  // Convert to ARS if toggle is ARS (use CCL for all USD components)
  const grandDolarizadoDisp = showARS ? (cclRate ? grandDolarizadoUSD * cclRate : null) : grandDolarizadoUSD;

  // 3. Total Portfolio — already computed as totalVal (respects USD/ARS toggle)

  // 4. Total Invested = cost basis of CEDEARs + Merval + Crypto (in display currency)
  const investedCedearUSD = nativeCostOf("cedears");
  const investedMervalARS = nativeCostOf("pesos");
  const investedCryptoUSD = nativeCostOf("crypto");
  // Convert each to display currency then sum
  const investedCedearDisp = showARS && cclRate ? investedCedearUSD*cclRate : !showARS ? investedCedearUSD : null;
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

          {/* Month selector */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
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

          {/* ARS / USD toggle */}
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

        <main style={{padding:"26px 28px 52px",maxWidth:1380,margin:"0 auto"}}>

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
                  {showARS?"ARS":"USD"} · Dólares + CEDEARs + Crypto
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
                    <Badge color={investedPnLDisp>=0?C.green:C.red}>{fmtPct(investedPnLPct)}</Badge>
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
                  <Badge color={s.pnl>=0?C.green:C.red}>{s.val>0?fmtPct(s.pct):"—"}</Badge>
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
