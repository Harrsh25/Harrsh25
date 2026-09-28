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
  ['className:"mt-10 grid w-full max-w-[900px] gap-5 sm:grid-cols-3"', 'className:"mt-8 grid w-full max-w-[680px] gap-4 sm:grid-cols-3"'],
  ['className:"group rounded-2xl border border-white bg-white/90 p-6 text-left shadow-[0_8px_30px_rgba(99,102,241,0.08)]', 'className:"group rounded-xl border border-white bg-white/90 px-4 py-4 text-left shadow-[0_8px_30px_rgba(99,102,241,0.08)]'],
  ['l.jsx("span",{className:`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${r.grad} text-white`,children:l.jsx(r.icon,{size:20})}),l.jsx("h2",{className:"mt-4 text-[16px] font-semibold",children:r.name}),',
   'l.jsx("span",{className:`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${r.grad} text-white`,children:l.jsx(r.icon,{size:17})}),l.jsx("h2",{className:"mt-3 text-[15px] font-semibold",children:r.name}),'],
  ['l.jsxs("span",{className:"mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-brand",children:["Open ",l.jsx(Mp,', 'l.jsxs("span",{className:"mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-brand",children:["Open ",l.jsx(Mp,'],
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
  ".nx-list td{font-size:14px;padding-top:9px;padding-bottom:9px}:where(.nx-list) td{color:#111827}" +
  ".nx-list td.mono,.nx-list td .mono{font-family:inherit;font-size:14px;letter-spacing:0}.nx-list td button{font-size:13px}" +
  ".nx-list td.text-ink-soft,.nx-list td.text-\\[12px\\],.nx-list td .text-\\[12px\\]{font-size:14px}" +
  // Clean list look (Project Center): white header, no column dividers, roomier rows, larger soft pills
  ".nx-list th{background:#fff;border-right-width:0;font-size:13px;font-weight:500;color:#6b7280;letter-spacing:0;padding:12px}" +
  ".nx-list td{border-right-width:0;padding:11px 12px;border-color:#eef0f3}.nx-list th{border-color:#e5e7eb}" +
  ".nx-list tbody tr:hover{background:#f9fafb}" +
  ".nx-list td span.rounded-md.border.text-\\[11\\.5px\\]{font-size:12.5px;padding:2px 7px;gap:5px}" +
  ".nx-list td span.rounded.text-\\[11px\\]{font-size:12px;padding:2px 7px}" +
  // Stacked cards always get breathing room, even inside wrappers that don't space their children
  ":not(.grid):not(.flex)>.nx-section+.nx-section{margin-top:16px}" +
  // The list fills the page card, so its horizontal scrollbar sits at the bottom (above the footer) with a sticky header
  ".nx-filters>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}" +
  ".shadow-card>.nx-fill{flex:1 1 0;min-height:280px;overflow:auto}.shadow-card>.nx-fill thead th{position:sticky;top:0;z-index:2}";
html = html.slice(0, styleEnd) + C_BEGIN + extraCss + RAW_CSS + C_END + html.slice(styleEnd);

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
