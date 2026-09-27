import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, RadioTower, Users } from "lucide-react";
import { auth } from "../data/auth";

const products = [
  { name: "Productivity Orbit", desc: "Projects, cost center, approvals and reports in one workspace.", to: "/productivity/project-planning/project", icon: Briefcase, grad: "from-[#3b82f6] to-[#6366f1]" },
  { name: "Activity Orbit", desc: "Tower lifecycle — schedules, foundation matrix, L2 plans and progress.", to: "/activity-orbit/tower-schedule-upload", icon: RadioTower, grad: "from-[#14b8a6] to-[#22c55e]" },
  { name: "HRMS Orbit", desc: "People operations — attendance, check-in and monthly reports.", to: "/hrms/attendance-report", icon: Users, grad: "from-[#f59e0b] to-[#f97316]" },
];

export default function Products() {
  const nav = useNavigate();
  const initial = (auth.user()?.name ?? "D").charAt(0).toUpperCase();
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center bg-gradient-to-br from-[#f7f8fc] via-[#eef1fc] to-[#f8f0fc] px-4 py-16">
      <button
        onClick={() => { auth.logout(); nav("/login"); }}
        title="Sign out"
        className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-gray-100 text-[13px] text-ink-soft shadow"
      >
        {initial}
      </button>
      <h1 className="text-[30px] font-bold tracking-tight">Choose Your Product</h1>
      <p className="mt-2 text-[14px] text-ink-soft">Select a product suite to get started with workforce management.</p>
      <div className="mt-10 grid w-full max-w-[900px] gap-5 sm:grid-cols-3">
        {products.map((p) => (
          <button
            key={p.name}
            onClick={() => nav(p.to)}
            className="group rounded-2xl border border-white bg-white/90 p-6 text-left shadow-[0_8px_30px_rgba(99,102,241,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(99,102,241,0.16)]"
          >
            <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${p.grad} text-white`}>
              <p.icon size={20} />
            </span>
            <h2 className="mt-4 text-[16px] font-semibold">{p.name}</h2>
            <p className="mt-1.5 text-[13px] leading-5 text-ink-soft">{p.desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-brand">
              Open <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
