import { DEMO_TAKEN_AT } from './demoApi';

/** Small fixed notice so nobody mistakes the demo file for the live system. */
export function DemoBanner() {
  return (
    <div className="pointer-events-none fixed bottom-3 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-[12px] text-amber-800 shadow-card">
      Demo file — read-only snapshot from {new Date(DEMO_TAKEN_AT).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}. Saving needs the full app.
    </div>
  );
}
