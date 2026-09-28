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
const source = files.map((f) => `// ---- ${f}\n` + readFileSync(new URL(f, SRC), "utf8")).join("\n");
const { code } = transformSync(source, {
  loader: "jsx",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  target: "es2020",
  minifyWhitespace: true,
  minifySyntax: true,
});
if (code.includes("</script")) throw new Error("module code must not contain </script");

const JS_BEGIN = "/*NXV:BEGIN*/", JS_END = "/*NXV:END*/";
const block =
  `${JS_BEGIN}const NxVendor=(()=>{const h=y.createElement,Fragment=y.Fragment;\n${code}\nreturn{routes:NXV_ROUTES,nav:NXV_NAV,publicRoutes:NXV_PUBLIC,ApprovalMgmt:ApprovalManagementPage};})();` +
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

// ---- 2. CSS (only utilities the original bundle doesn't already ship) ----
const C_BEGIN = "/*NXV:CSS*/", C_END = "/*NXV:CSS-END*/";
html = stripBetween(html, C_BEGIN, C_END);
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
  ".nx-list td.text-ink-soft,.nx-list td.text-\\[12px\\],.nx-list td .text-\\[12px\\]{font-size:14px}";
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
