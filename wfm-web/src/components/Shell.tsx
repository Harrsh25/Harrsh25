import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, LogOut, PanelLeftClose, PanelLeftOpen, Search, Settings, LayoutGrid } from "lucide-react";
import { cx, Wordmark, LogoMark } from "./ui";
import { NavGroup, NavModule } from "../data/nav";
import { auth } from "../data/auth";

function Group({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  const { pathname } = useLocation();
  const containsActive = group.items.some((i) => pathname.startsWith(i.to));
  const [open, setOpen] = useState(containsActive);
  useEffect(() => { if (containsActive) setOpen(true); }, [containsActive]);

  if (collapsed) {
    return (
      <div className="space-y-1">
        {group.items.map((it) => (
          <NavLink key={it.to} to={it.to} title={it.label}
            className={({ isActive }) => cx("mx-auto grid h-9 w-9 place-items-center rounded-lg", isActive ? "bg-white text-brand shadow-sm" : "text-ink-soft hover:bg-white/60")}>
            <it.icon size={17} />
          </NavLink>
        ))}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="flex h-[36px] w-full items-center justify-between px-[18px] text-[14px] text-ink-soft hover:text-ink">
        {group.label}
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {open && (
        <div className="mb-1 space-y-[2px] px-2">
          {group.items.map((it) => (
            <NavLink key={it.to} to={it.to}
              className={({ isActive }) => cx(
                "relative flex h-[32px] items-center gap-2.5 rounded-lg px-2.5 text-[14px]",
                isActive ? "bg-white text-ink shadow-sm before:absolute before:-left-[6px] before:h-4 before:w-[2px] before:rounded-full before:bg-brand" : "text-ink-soft hover:bg-white/60 hover:text-ink",
              )}>
              {({ isActive }) => (
                <>
                  <it.icon size={16} className={isActive ? "text-brand" : "text-ink-mute"} />
                  <span className="truncate">{it.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Shell({ module }: { module: NavModule }) {
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const initial = (auth.user()?.name ?? "d").charAt(0).toLowerCase();

  return (
    <div className="flex h-full">
      <aside className={cx("flex shrink-0 flex-col transition-[width]", collapsed ? "w-[64px]" : "w-[245px]")}>
        <div className="flex h-[54px] items-center justify-between px-[18px]">
          {collapsed ? <LogoMark size={20} /> : <Wordmark />}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="text-ink-soft hover:text-ink" title="Collapse sidebar">
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>
        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="mx-auto mb-2 text-ink-soft" title="Expand sidebar">
            <PanelLeftOpen size={16} />
          </button>
        )}
        <nav className="flex-1 space-y-[2px] overflow-y-auto pb-4">
          {module.back && !collapsed && (
            <NavLink to={module.back.to} className="mb-1 flex h-[36px] items-center gap-2.5 px-[18px] text-[14px] text-ink-soft hover:text-ink">
              <ArrowLeft size={15} /> {module.back.label}
            </NavLink>
          )}
          {module.groups.map((g) =>
            g.label ? (
              <Group key={g.label} group={g} collapsed={collapsed} />
            ) : (
              <div key="flat" className="space-y-1 px-2">
                {g.items.map((it) => (
                  <NavLink key={it.to} to={it.to}
                    className={({ isActive }) => cx(
                      "relative flex h-[34px] items-center gap-2.5 rounded-lg px-2.5 text-[14px]",
                      isActive ? "bg-white shadow-sm before:absolute before:-left-[6px] before:h-4 before:w-[2px] before:rounded-full before:bg-brand" : "text-ink-soft hover:bg-white/60",
                    )}>
                    {({ isActive }) => (<><it.icon size={16} className={isActive ? "text-brand" : "text-ink-mute"} />{!collapsed && it.label}</>)}
                  </NavLink>
                ))}
              </div>
            ),
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pr-2">
        <header className="relative flex h-[47px] shrink-0 items-center justify-end gap-3">
          <span className="absolute left-1/2 top-2 h-7 w-2 -translate-x-1/2 rounded-full border border-gray-200" />
          <label className="flex h-[31px] w-[220px] items-center gap-2 rounded-lg border border-gray-200 bg-gray-100/80 px-2.5 text-[13px] text-ink-mute">
            <Search size={14} />
            <input placeholder="Search..." className="w-full bg-transparent outline-none placeholder:text-ink-mute" />
            <kbd className="rounded border border-gray-200 bg-white px-1 text-[9px] text-ink-faint">⌘K</kbd>
          </label>
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} className="relative grid h-7 w-7 place-items-center rounded-full bg-brand text-[14px] font-semibold text-white">
              {initial}
              <span className="absolute -bottom-0.5 -right-0.5 grid h-3 w-3 place-items-center rounded-full bg-white text-ink-mute shadow"><ChevronDown size={8} /></span>
            </button>
            {menu && (
              <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-line bg-white p-1.5 text-[13px] shadow-lg" onMouseLeave={() => setMenu(false)}>
                <div className="px-2.5 py-2">
                  <p className="font-semibold">{auth.user()?.name ?? "Demo User"}</p>
                  <p className="text-[12px] text-ink-mute">{auth.user()?.email ?? "demo@nebullaone.app"}</p>
                </div>
                <hr className="my-1 border-line" />
                <MenuItem icon={LayoutGrid} label="Switch product" onClick={() => navigate("/products")} />
                <MenuItem icon={Settings} label="Organization settings" onClick={() => navigate("/productivity/organization")} />
                <MenuItem icon={Settings} label="Configuration" onClick={() => navigate("/productivity/configuration/organization-setup")} />
                <hr className="my-1 border-line" />
                <MenuItem icon={LogOut} label="Sign out" onClick={() => { auth.logout(); navigate("/login"); }} />
              </div>
            )}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto pb-2">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick }: { icon: typeof Settings; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-gray-100">
      <Icon size={14} className="text-ink-mute" /> {label}
    </button>
  );
}
