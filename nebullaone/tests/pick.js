// Pick an option from the popover Select: v = label substring, or {value}
module.exports = async function pick(p, combo, v) {
  await combo.click(); await p.waitForTimeout(80);
  const opts = p.locator('[role=listbox] [role=option]');
  if (v && typeof v === 'object' && v.value !== undefined) {
    const n = await opts.count(); // match by value via data attr fallback: click by index of label list not available -> use keyboard-free search
    throw new Error('value pick unsupported');
  }
  const txt = typeof v === 'object' ? v.label : v;
  const exact = opts.filter({ hasText: new RegExp('^\\s*' + txt.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + '\\s*$') });
  if (await exact.count()) await exact.first().click(); else await opts.filter({ hasText: txt }).first().click();
  await p.waitForTimeout(80);
};
