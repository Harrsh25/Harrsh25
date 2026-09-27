import { FormEvent, KeyboardEvent, ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, LogIn, Mail, User, UserPlus, Users } from "lucide-react";
import { LogoMark, cx } from "../components/ui";
import { auth } from "../data/auth";

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-br from-[#f7f8fc] via-[#eef1fc] to-[#f8f0fc] px-4 py-10">
      <div className="w-full max-w-[418px] rounded-[20px] border border-white bg-white px-[34px] pb-12 pt-8 shadow-[0_8px_30px_rgba(99,102,241,0.08)]">
        {children}
      </div>
      <nav className="mt-8 flex items-center gap-3 text-[12px] text-ink-faint">
        {["Terms", "Privacy", "Request Demo", "Contact Us"].map((l, i) => (
          <span key={l} className="flex items-center gap-3">
            {i > 0 && <span className="h-1 w-1 rounded-full bg-gray-300" />}
            <a href="#" className="hover:text-ink-soft">{l}</a>
          </span>
        ))}
      </nav>
    </div>
  );
}

function Field({ label, icon: Icon, type = "text", placeholder, value, onChange, reveal }: {
  label: string; icon: typeof User; type?: string; placeholder: string; value: string; onChange: (v: string) => void; reveal?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="mt-5 block">
      <span className="text-[13px] text-ink">{label}</span>
      <span className="mt-2 flex h-[42px] items-center gap-3 rounded-lg border border-gray-300 px-3.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-blue-100">
        <Icon size={16} className="text-ink-soft" />
        <input
          type={reveal && show ? "text" : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-faint"
        />
        {reveal && (
          <button type="button" onClick={() => setShow((s) => !s)} className="text-ink-soft" aria-label="Toggle password">
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </span>
    </label>
  );
}

function Submit({ enabled, icon: Icon, children, onClick }: { enabled: boolean; icon: typeof LogIn; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      className={cx(
        "mt-6 flex h-[42px] w-full items-center justify-center gap-2 rounded-lg text-[14px] font-semibold",
        enabled ? "bg-brand text-white hover:bg-brand-dark" : "bg-gray-200/80 text-white",
      )}
    >
      <Icon size={16} /> {children}
    </button>
  );
}

// Sign-in runs from the button click and the Enter key rather than native form
// submission, which sandboxed previews block.
const noSubmit = (e: FormEvent) => e.preventDefault();
const onEnter = (action: () => void) => (e: KeyboardEvent) => {
  if (e.key === "Enter") { e.preventDefault(); action(); }
};

export function Login() {
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [remember, setRemember] = useState(false);
  const submit = () => {
    if (!u || !p) return;
    auth.login(u, u.includes("@") ? u : `${u}@nebullaone.app`);
    nav("/products");
  };
  return (
    <AuthLayout>
      <form onSubmit={noSubmit} onKeyDown={onEnter(submit)}>
        <div className="flex justify-center"><LogoMark size={30} /></div>
        <h1 className="mt-4 text-center text-[21px] font-semibold tracking-tight">Welcome to NebullaOne</h1>
        <p className="mt-1 text-center text-[14px] text-ink-soft">
          Don't have an account? <Link to="/signup" className="font-semibold text-brand">Sign Up</Link>
        </p>
        <Field label="Username" icon={Users} placeholder="Enter your username" value={u} onChange={setU} />
        <Field label="Password" icon={Lock} type="password" placeholder="Enter your password" value={p} onChange={setP} reveal />
        <label className="mt-5 flex items-center gap-2.5 text-[13px] text-ink-soft">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
          Remember me
        </label>
        <Submit enabled={!!u && !!p} icon={LogIn} onClick={submit}>Sign In</Submit>
        <p className="mt-3 text-center text-[11px] text-ink-faint">Demo mode — any username and password will work.</p>
      </form>
    </AuthLayout>
  );
}

export function Signup() {
  const nav = useNavigate();
  const [n, setN] = useState("");
  const [e, setE] = useState("");
  const [p, setP] = useState("");
  const submit = () => {
    if (!n || !e || !p) return;
    auth.login(n, e);
    nav("/products");
  };
  return (
    <AuthLayout>
      <form onSubmit={noSubmit} onKeyDown={onEnter(submit)}>
        <div className="flex justify-center"><LogoMark size={30} /></div>
        <h1 className="mt-4 text-center text-[21px] font-semibold tracking-tight">Start with NebullaOne</h1>
        <p className="mt-1 text-center text-[14px] text-ink-soft">
          Already have an account? <Link to="/login" className="font-semibold text-brand">Sign in</Link>
        </p>
        <Field label="Full Name" icon={User} placeholder="Enter your full name" value={n} onChange={setN} />
        <Field label="Work Email" icon={Mail} type="email" placeholder="Enter your work email" value={e} onChange={setE} />
        <Field label="Password" icon={Lock} type="password" placeholder="Create a strong password" value={p} onChange={setP} reveal />
        <Submit enabled={!!n && !!e && !!p} icon={UserPlus} onClick={submit}>Create Account</Submit>
        <div className="my-5 flex items-center gap-4 text-[11px] font-medium text-ink-mute">
          <span className="h-px flex-1 bg-line" /> OR <span className="h-px flex-1 bg-line" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="flex h-[40px] items-center justify-center gap-2 rounded-lg border border-gray-300 text-[13.5px] font-semibold text-ink-soft hover:bg-gray-50">
            <svg width="15" height="15" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Google
          </button>
          <button type="button" className="flex h-[40px] items-center justify-center gap-2 rounded-lg border border-gray-300 text-[13.5px] font-semibold text-ink-soft hover:bg-gray-50">
            <svg width="14" height="14" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
            Microsoft
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
