const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { vendorId } = req.query;
    const scorecards = await prisma.vendorScorecard.findMany({
      where: { vendorId: vendorId || undefined },
      include: { vendor: true, metrics: true },
      orderBy: { evaluationPeriodEnd: "desc" },
    });
    res.json(scorecards);
  })
);

// Custom Metric Model Builder (12.1.3) — weights must sum to 100; composite
// score is the weighted average across submitted metric scores.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { vendorId, evaluationPeriodStart, evaluationPeriodEnd, evaluatorUserId, metrics } = req.body; // metrics: [{metricName, weight, score}]
    const totalWeight = metrics.reduce((s, m) => s + Number(m.weight), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return res.status(400).json({ error: `Metric weights must sum to 100 (got ${totalWeight})` });
    }
    const compositeScore = metrics.reduce((s, m) => s + (Number(m.weight) / 100) * Number(m.score), 0);

    const scorecard = await prisma.vendorScorecard.create({
      data: {
        vendorId,
        evaluationPeriodStart,
        evaluationPeriodEnd,
        evaluatorUserId,
        compositeScore,
        metrics: { create: metrics },
      },
      include: { metrics: true },
    });

    // Scorecard-triggered auto-block (12.1.7): below-threshold score puts
    // the vendor on hold automatically rather than requiring a separate
    // manual step.
    const AUTO_BLOCK_THRESHOLD = Number(req.body.autoBlockThreshold ?? 40);
    if (compositeScore < AUTO_BLOCK_THRESHOLD) {
      await prisma.vendorHold.create({
        data: {
          vendorId,
          holdType: "ALL",
          reason: `Auto-block: scorecard fell to ${compositeScore.toFixed(1)} (threshold ${AUTO_BLOCK_THRESHOLD})`,
        },
      });
      await prisma.vendor.update({ where: { id: vendorId }, data: { status: "ON_HOLD" } });
    }

    res.status(201).json(scorecard);
  })
);

// Benchmarking across vendor category (12.1.6)
router.get(
  "/benchmark",
  asyncHandler(async (req, res) => {
    const { tradeCategoryName } = req.query;
    const vendors = await prisma.vendor.findMany({
      where: tradeCategoryName
        ? { tradeTags: { some: { tradeCategory: { name: tradeCategoryName } } } }
        : {},
      include: { scorecards: { orderBy: { evaluationPeriodEnd: "desc" }, take: 1 } },
    });
    const ranked = vendors
      .filter((v) => v.scorecards.length > 0)
      .map((v) => ({ vendorId: v.id, legalName: v.legalName, latestScore: Number(v.scorecards[0].compositeScore) }))
      .sort((a, b) => b.latestScore - a.latestScore);
    const average = ranked.length ? ranked.reduce((s, v) => s + v.latestScore, 0) / ranked.length : null;
    res.json({ average, ranked });
  })
);

// Corrective Action Plan (12.2.1)
router.post(
  "/corrective-action-plans",
  asyncHandler(async (req, res) => {
    const cap = await prisma.correctiveActionPlan.create({ data: req.body });
    res.status(201).json(cap);
  })
);

router.patch(
  "/corrective-action-plans/:id",
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const cap = await prisma.correctiveActionPlan.update({
      where: { id: req.params.id },
      data: { status, closedAt: status === "CLOSED" ? new Date() : null },
    });
    res.json(cap);
  })
);

module.exports = router;
