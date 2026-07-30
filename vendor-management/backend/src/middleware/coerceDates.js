// HTML <input type="date"> submits plain "YYYY-MM-DD" strings, but this
// Prisma client rejects date-only ISO strings for DateTime fields ("premature
// end of input. Expected ISO-8601 DateTime"). Rather than patch every route
// that accepts a date, normalize date-only strings to full ISO datetimes
// once, on the way in.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function coerce(value) {
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    return `${value}T00:00:00.000Z`;
  }
  if (Array.isArray(value)) {
    return value.map(coerce);
  }
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) value[key] = coerce(value[key]);
    return value;
  }
  return value;
}

function coerceDateStrings(req, res, next) {
  if (req.body && typeof req.body === "object") coerce(req.body);
  next();
}

module.exports = { coerceDateStrings };
