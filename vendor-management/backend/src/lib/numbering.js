// Generates human-readable, prefixed document numbers (VEN-2026-000123 style).
// Uses a row count as the sequence source; fine for a single-writer demo app —
// swap for an atomic DB sequence/counter table before scaling to concurrent writers.
async function nextNumber(prisma, model, prefix) {
  const count = await prisma[model].count();
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(6, "0");
  return `${prefix}-${year}-${seq}`;
}

module.exports = { nextNumber };
