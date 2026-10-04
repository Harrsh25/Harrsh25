// Builds the Vendor / Contract & Labor module from src/*.jsx and injects it
// into ../NebullaOne-WFM.html (idempotent: re-running replaces the previous
// injection between the NXV markers).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { transformSync } from "esbuild";
import postcss from "postcss";
import tailwind from "tailwindcss";

const HTML = new URL("../NebullaOne-WFM.html", import.meta.url);
const SRC = new URL("./src/", import.meta.url);

let html = readFileSync(HTML, "utf8");

// ---- 1. JS --------------------------------------------------------------
const files = readdirSync(SRC).filter((f) => f.endsWith(".jsx")).sort();
const source = "const h=y.createElement,Fragment=y.Fragment;\n" +
  files.map((f) => `// ---- ${f}\n` + readFileSync(new URL(f, SRC), "utf8")).join("\n") +
  "\nexport { NXV_ROUTES as routes, NXV_NAV as nav, NXV_PUBLIC as publicRoutes, ApprovalManagementPage as ApprovalMgmt, StatTile };";
// Size: wrapped as one module so esbuild can shorten every internal name and drop anything unused
const { code: rawCode } = transformSync(source, {
  loader: "jsx",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  target: "es2020",
  format: "iife",
  globalName: "NxVendor",
  treeShaking: true,
  minify: true,
  legalComments: "none",
});
const code = rawCode.trim().replace(/^var NxVendor=/, "const NxVendor=");
if (code.includes("</script")) throw new Error("module code must not contain </script");

const JS_BEGIN = "/*NXV:BEGIN*/", JS_END = "/*NXV:END*/";
const block =
  `${JS_BEGIN}${code}${code.endsWith(";") ? "" : ";"}` +
  `qx.groups.push(...NxVendor.nav);${JS_END}`;
html = stripBetween(html, JS_BEGIN, JS_END);
const anchor = 'const Xu="/productivity";function og(){';
must(html, anchor);
html = html.replace(anchor, () => block + anchor);

// Routes inside the /productivity route
const R_BEGIN = "/*NXV:R*/", R_END = "/*NXV:R-END*/";
html = stripBetween(html, R_BEGIN, R_END);
const routeAnchor = 'l.jsx(A,{path:"organization/configuration/business-units",element:l.jsx(q0,{})}),';
must(html, routeAnchor);
html = html.replace(
  routeAnchor,
  () => routeAnchor + `${R_BEGIN}...NxVendor.routes.map(r=>l.jsx(A,{path:r.path,element:l.jsx(r.el,{})},r.path)),${R_END}`
);

// Public routes (self-registration, vendor quotation) next to /login
const P_BEGIN = "/*NXV:P*/", P_END = "/*NXV:P-END*/";
html = stripBetween(html, P_BEGIN, P_END);
const loginRoute = 'l.jsx(A,{path:"/login",element:l.jsx(Jx,{})}),';
must(html, loginRoute);
html = html.replace(loginRoute, () => `${P_BEGIN}...NxVendor.publicRoutes.map(r=>l.jsx(A,{path:r.path,element:l.jsx(r.el,{})},r.path)),${P_END}` + loginRoute);

// Approval Management: swap the original page (W0) for the extended one
const AM_BEGIN = "/*NXV:AM*/", AM_END = "/*NXV:AM-END*/";
html = html.replace(/\/\*NXV:AM\*\/[^]*?\/\*NXV:AM-END\*\//, "l.jsx(W0,{})");
const amRoute = 'path:"approvals/approval-management",element:l.jsx(W0,{})';
must(html, amRoute);
html = html.replace(amRoute, () => `path:"approvals/approval-management",element:${AM_BEGIN}l.jsx(NxVendor.ApprovalMgmt,{})${AM_END}`);

// Host UI patches (idempotent: each pair is applied once; re-runs find the patched text)
const HOST_PATCHES = [
  // Summary cards everywhere use the compact card from our bundle
  ['function ue({label:e,value:t,sub:n,icon:r,tone:s}){return l.jsxs("div",{className:R("flex items-start justify-between rounded-xl border px-4 py-3",$x[s]),children:[',
   'function ue(p){return NxVendor.StatTile(p)}function ue_orig({label:e,value:t,sub:n,icon:r,tone:s}){return l.jsxs("div",{className:R("flex items-start justify-between rounded-xl border px-4 py-3",$x[s]),children:['],
  // Product chooser: no descriptions, smaller cards
  ['l.jsx("p",{className:"mt-1.5 text-[13px] leading-5 text-ink-soft",children:r.desc}),', ''],
  ['className:"mt-6 grid w-full max-w-[600px] gap-3 sm:grid-cols-3"', 'className:"mt-6 grid w-full gap-3 sm:grid-cols-3",style:{maxWidth:600}'],
  ['className:"mt-10 grid w-full max-w-[900px] gap-5 sm:grid-cols-3"', 'className:"mt-6 grid w-full gap-3 sm:grid-cols-3",style:{maxWidth:600}'],
  // compact cards: icon left, name + Open on the right
  ['className:"group rounded-2xl border border-white bg-white/90 p-6 text-left shadow-[0_8px_30px_rgba(99,102,241,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(99,102,241,0.16)]"',
   'className:"group flex items-center gap-2.5 rounded-lg border border-white bg-white/90 px-3 py-2.5 text-left shadow-[0_4px_16px_rgba(99,102,241,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(99,102,241,0.16)]"'],
  ['l.jsx("span",{className:`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${r.grad} text-white`,children:l.jsx(r.icon,{size:20})}),l.jsx("h2",{className:"mt-4 text-[16px] font-semibold",children:r.name}),l.jsxs("span",{className:"mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-brand",children:["Open ",l.jsx(Mp,{size:14,className:"transition group-hover:translate-x-0.5"})]})]',
   'l.jsx("span",{className:`grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gradient-to-br ${r.grad} text-white`,children:l.jsx(r.icon,{size:14})}),l.jsxs("span",{className:"min-w-0 flex-1",children:[l.jsx("h2",{className:"truncate text-[13.5px] font-semibold leading-tight",children:r.name}),l.jsxs("span",{className:"inline-flex items-center gap-0.5 text-[12px] font-medium text-brand",children:["Open ",l.jsx(Mp,{size:12,className:"transition group-hover:translate-x-0.5"})]})]})]'],
  // Sidebar groups start collapsed when the orbit opens on its landing page (Project Center); later navigation still expands the right group
  ['r=e.items.some(a=>n.startsWith(a.to)),[s,i]=y.useState(r);return y.useEffect(()=>{r&&i(!0)},[r]),',
   'r=e.items.some(a=>n.startsWith(a.to)),nxL=/\\/project-planning\\/project\\/?$/.test(n),[s,i]=y.useState(r&&!nxL);return y.useEffect(()=>{r&&!nxL&&i(!0)},[r,nxL]),'],
];
for (const [from, to] of HOST_PATCHES) {
  if (html.includes(from)) html = html.replace(from, () => to);
  else if (!to || !html.includes(to)) { if (to) throw new Error("host patch anchor not found: " + from.slice(0, 70)); }
}

// ---- 2. CSS (only utilities the original bundle doesn't already ship) ----
const C_BEGIN = "/*NXV:CSS*/", C_END = "/*NXV:CSS-END*/";
html = stripBetween(html, C_BEGIN, C_END);
// Size: drop the app's CSS rules whose classes appear nowhere in the page (markup or scripts).
// Conservative: a rule stays if every class it needs is found anywhere in the text; alignment classes are built at runtime.
{
  const sEnd = html.lastIndexOf("</style>"), sStart = html.lastIndexOf("<style", sEnd), sBody = html.indexOf(">", sStart) + 1;
  const text = html.slice(0, sStart).replace(/<style[^>]*>[^]*?<\/style>/g, "") + html.slice(sEnd);
  const keep = new Set(["text-left", "text-right", "text-center"]);
  const seen = new Map(), used = (c) => { if (!seen.has(c)) seen.set(c, keep.has(c) || text.includes(c)); return seen.get(c); };
  const root = postcss.parse(html.slice(sBody, sEnd));
  root.walkRules((r) => {
    if (r.parent && r.parent.type === "atrule" && /keyframes/i.test(r.parent.name)) return;
    const sels = r.selectors.filter((sel) => [...sel.matchAll(/\.((?:\\.|[\w-])+)/g)].every((m) => used(m[1].replace(/\\(.)/g, "$1"))));
    if (!sels.length) r.remove(); else if (sels.length !== r.selectors.length) r.selectors = sels;
  });
  root.walkAtRules((a) => { if (/media|supports/i.test(a.name) && a.nodes && !a.nodes.length) a.remove(); });
  const purged = root.toString().replace(/\n\s*/g, "");
  html = html.slice(0, sBody) + purged + html.slice(sEnd);
}
const styleEnd = html.lastIndexOf("</style>");
const styleStart = html.lastIndexOf("<style", styleEnd);
const originalCss = html.slice(styleStart, styleEnd);
const known = new Set();
postcss.parse(originalCss.slice(originalCss.indexOf(">") + 1)).walkRules((r) => known.add(ctx(r) + r.selector));

const twConfig = {
  content: [{ raw: source, extension: "jsx" }],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0b5ed7", dark: "#094db3", soft: "#e8f0fe" },
        ink: { DEFAULT: "#111827", soft: "#4b5563", mute: "#6b7280", faint: "#9ca3af" },
        line: "#e5e7eb",
        "teal-brand": "#14b8a6",
      },
      boxShadow: { card: "0 1px 3px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04)" },
    },
  },
};
const out = await postcss([tailwind(twConfig)]).process("@tailwind components;@tailwind utilities;", { from: undefined });
const root = postcss.parse(out.css);
root.walkRules((r) => {
  if (known.has(ctx(r) + r.selector)) r.remove();
});
root.walkAtRules((a) => {
  if (a.nodes && a.nodes.length === 0) a.remove();
});
const extraCss = root.toString().replace(/\/\*[^]*?\*\//g, "").replace(/\s*\n\s*/g, "");
// Hand-written tweaks for host components rendered inside detail panels / dialogs:
// keep stat values on one line and let the sub-label drop below instead.
// List views (Project Center style): single-line 14px text, ~40px rows, no monospace codes in cells.
const RAW_CSS = "[role=dialog] .mono{white-space:nowrap}[role=dialog] p.flex.items-baseline{flex-wrap:wrap;row-gap:0}" +
  ".nx-list td{font-size:13px;padding-top:9px;padding-bottom:9px}:where(.nx-list) td{color:#111827}" +
  ".nx-list td.mono,.nx-list td .mono{font-family:inherit;font-size:13px;letter-spacing:0}.nx-list td button{font-size:13px}" +
  ".nx-list td.text-ink-soft,.nx-list td.text-\\[12px\\],.nx-list td .text-\\[12px\\]{font-size:13px}" +
  // Clean list look (Project Center): white header, no column dividers, roomier rows, larger soft pills
  ".nx-list th{background:#f9fafb;border-right-width:0;font-size:12.5px;font-weight:600;color:#4b5563;letter-spacing:0;padding:8px 12px}" +
  ".nx-list td{border-right-width:0;padding:8px 12px;border-color:#eef0f3}.nx-list th{border-color:#e5e7eb}" +
  ".nx-list tbody tr:hover{background:#f9fafb}" +
  ".nx-kv dd .flex-col{align-items:flex-start}" +
  ".nx-kv>div:has(>dd [role=combobox]){align-items:center}" +
  /* a table that ends a card follows the card's rounded bottom corners instead of covering them */
  ".nx-section>.overflow-x-auto:last-child,.nx-section>div:last-child>.overflow-x-auto:last-child{border-bottom-left-radius:11px;border-bottom-right-radius:11px}" +
  ".nx-eq td,.nx-eq th{overflow:hidden;text-overflow:ellipsis}.nx-eq td>span,.nx-eq td>div{max-width:100%}" +
  ".nx-list td span.rounded-md.border.text-\\[11\\.5px\\]{font-size:12px;padding:1px 6px;gap:4px}" +
  ".nx-list td.font-semibold,.nx-list td .font-semibold,.nx-list td.font-medium,.nx-list td .font-medium{font-weight:500}" +
  // Project Center style: row actions are quiet text links, not bordered buttons
  ".nx-list td button.border-line,.nx-list td button.border-red-200{border-color:transparent;background:transparent;box-shadow:none;font-weight:400;padding-left:4px;padding-right:4px}" +
  ".nx-list td button.border-line{color:#6b7280}.nx-list td button.border-line:hover{color:#0b5ed7;background:transparent}.nx-list td button.border-red-200:hover{background:transparent;text-decoration:underline}" +
  ".nx-list td span.rounded.text-\\[11px\\]{font-size:12px;padding:2px 7px}" +
  // Stacked cards always get breathing room, even inside wrappers that don't space their children
  ":not(.grid):not(.flex)>.nx-section+.nx-section{margin-top:16px}" +
  // The list fills the page card, so its horizontal scrollbar sits at the bottom (above the footer) with a sticky header
  // Sticky first column with a divider after it (Project Center style)
  ".nx-list .nx-stick{position:sticky;z-index:1;background:#fff}.nx-list th.nx-stick{background:#f9fafb}.nx-list tbody tr:hover .nx-stick{background:#f9fafb}" +
  ".nx-list th.nx-stick,.nx-fill .nx-list thead th.nx-stick{z-index:3}.nx-list .nx-edge{box-shadow:inset -1px 0 0 #e5e7eb}" +
  ".nx-list td.nx-stick:first-child:not(.nx-edge){width:44px;min-width:44px;max-width:44px}" +
  ".nx-filters>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}" +
  ".shadow-card>.nx-fill{flex:1 1 0;min-height:280px;overflow:auto}.shadow-card>.nx-fill thead th{position:sticky;top:0;z-index:2}" +
  // Phone layout (≤768px): sidebar slides in from a menu button, toolbars and drawer headers wrap, grids drop to 1–2 columns, wide tables scroll
  // Detail side panel is ~46% wide: 4-across cards drop to 2 per row
  "[data-drawer] .grid-cols-4{grid-template-columns:repeat(2,minmax(0,1fr))}" +
  // No visible scrollbars anywhere - areas still scroll with the wheel, trackpad or touch
  "*{scrollbar-width:none}*::-webkit-scrollbar{display:none;width:0;height:0}" +
  ".nx-burger,.nx-scrim{display:none}" +
  "@media (max-width:768px){" +
  "aside.shrink-0{position:fixed;left:0;top:0;bottom:0;z-index:75;width:264px!important;background:#f3f4f6;transform:translateX(-100%);transition:transform .2s;box-shadow:0 10px 30px rgba(0,0,0,.18)}" +
  "html.nx-nav-open aside.shrink-0{transform:none}html.nx-nav-open .nx-scrim{display:block;position:fixed;inset:0;z-index:74;background:rgba(17,24,39,.3)}" +
  ".nx-burger{display:grid;place-items:center;position:fixed;left:8px;top:8px;z-index:50;width:32px;height:32px;border-radius:8px;background:#fff;border:1px solid #e5e7eb;color:#374151}" +
  "header.relative{padding-left:48px;gap:8px}header.relative>nav{position:static;transform:none;margin-right:auto}header.relative>nav a{font-size:0;gap:0;padding:0 6px}" +
  "header.relative>label{width:auto;flex:1;min-width:0}header.relative>label kbd{display:none}" +
  "main.flex-1{padding-left:8px;padding-right:8px}" +
  ".nx-search{flex:1 1 100%;width:100%}.nx-search>label{width:100%}" +
  ".nx-dhead{flex-wrap:wrap;padding-left:16px;padding-right:16px}.nx-dhead>div:first-child{flex:1 1 100%}.nx-dhead h2{white-space:normal}" +
  "[role=dialog] .px-6{padding-left:16px;padding-right:16px}" +
  ".nx-drawer{top:0!important;right:0!important;bottom:0!important;width:100%!important;max-width:100%!important;border-radius:0!important}" +
  ".grid-cols-4,.grid-cols-5,.grid-cols-6{grid-template-columns:repeat(2,minmax(0,1fr))!important}" +
  ".grid-cols-2,.grid-cols-3,[role=dialog] .grid-cols-4{grid-template-columns:minmax(0,1fr)!important}" +
  ".nx-section{overflow-x:auto}.col-span-2,.col-span-3,.col-span-4{grid-column:1/-1}" +
  "}";
// Typography (whole app): one step smaller text and lighter bold so headings and labels don't look heavy or too dark
const TYPO_CSS =
  ".font-semibold{font-weight:560}.font-bold{font-weight:620}.font-medium{font-weight:470}table th{font-weight:520!important}" +
  "h1,h2,h3,h4{font-weight:560}" +
  "body,.text-ink,:where(.nx-list) td{color:#1f2937}" +
  "main h1{font-size:15px!important}[data-drawer] h2{font-size:16px!important}[role=dialog]:not([data-drawer]) h2{font-size:14.5px}h3.text-\\[14\\.5px\\],h3.text-\\[13\\.5px\\]{font-size:13.5px}" +
  "td,dd{font-size:13px}dt{font-size:12.5px}" +
  "nav a,aside a,aside button{font-size:13.5px!important}" +
  ".nx-noscroll{scrollbar-width:none}.nx-noscroll::-webkit-scrollbar{display:none}";
html = html.slice(0, styleEnd) + C_BEGIN + extraCss + RAW_CSS + TYPO_CSS + C_END + html.slice(styleEnd);

// short dash everywhere: no long em dash in any visible text (host app and module)
html = html.replace(/\u2014/g, "-").replace(/\\u2014/g, "-");
writeFileSync(HTML, html);
console.log(`built: ${files.length} files, js ${(block.length / 1024).toFixed(1)} KB, css +${(extraCss.length / 1024).toFixed(1)} KB`);

function ctx(rule) {
  const p = rule.parent;
  return p && p.type === "atrule" ? `@${p.name} ${p.params}|` : "";
}
function stripBetween(s, a, b) {
  const i = s.indexOf(a);
  if (i < 0) return s;
  const j = s.indexOf(b, i);
  if (j < 0) throw new Error("unterminated marker " + a);
  return s.slice(0, i) + s.slice(j + b.length);
}
function must(s, needle) {
  if (!s.includes(needle)) throw new Error("anchor not found: " + needle.slice(0, 60));
}
