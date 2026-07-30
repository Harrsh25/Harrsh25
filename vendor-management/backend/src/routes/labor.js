const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

// Job Posting (4.2.1)
router.post(
  "/job-postings",
  asyncHandler(async (req, res) => {
    const { endDate, ...rest } = req.body;
    const posting = await prisma.jobPosting.create({ data: { ...rest, endDate: endDate || undefined } });
    res.status(201).json(posting);
  })
);

router.get(
  "/job-postings",
  asyncHandler(async (req, res) => {
    const postings = await prisma.jobPosting.findMany({
      include: { submissions: { include: { vendor: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(postings);
  })
);

// Candidate Submission (5.3) + Shortlisting (4.2.2 / 6.3)
router.post(
  "/job-postings/:id/submissions",
  asyncHandler(async (req, res) => {
    const submission = await prisma.candidateSubmission.create({
      data: { jobPostingId: req.params.id, ...req.body },
    });
    res.status(201).json(submission);
  })
);

router.patch(
  "/submissions/:id",
  asyncHandler(async (req, res) => {
    const { status } = req.body; // SHORTLISTED, REJECTED, SELECTED
    const submission = await prisma.candidateSubmission.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(submission);
  })
);

// Rate Card / Rate Grid (4.3.1) — supplier + site + role based pricing
router.post(
  "/rate-cards",
  asyncHandler(async (req, res) => {
    const rateCard = await prisma.rateCard.create({ data: req.body });
    res.status(201).json(rateCard);
  })
);

router.get(
  "/rate-cards",
  asyncHandler(async (req, res) => {
    const { vendorId } = req.query;
    const rateCards = await prisma.rateCard.findMany({
      where: { vendorId: vendorId || undefined },
      include: { vendor: true },
    });
    res.json(rateCards);
  })
);

// Worker Profile (9.2.1) + non-billable tracking (9.2.2)
router.post(
  "/worker-profiles",
  asyncHandler(async (req, res) => {
    const worker = await prisma.workerProfile.create({ data: req.body });
    res.status(201).json(worker);
  })
);

router.get(
  "/worker-profiles",
  asyncHandler(async (req, res) => {
    const { vendorId, billable } = req.query;
    const workers = await prisma.workerProfile.findMany({
      where: {
        vendorId: vendorId || undefined,
        billable: billable === undefined ? undefined : billable === "true",
      },
      include: { vendor: true, rateCard: true },
    });
    res.json(workers);
  })
);

// Timesheet submission & approval (9.2.3) — approval is what unlocks
// auto-invoicing (module 10.1.3).
router.post(
  "/timesheets",
  asyncHandler(async (req, res) => {
    const timesheet = await prisma.timesheet.create({ data: req.body });
    res.status(201).json(timesheet);
  })
);

router.get(
  "/timesheets",
  asyncHandler(async (req, res) => {
    const { workerId, status } = req.query;
    const timesheets = await prisma.timesheet.findMany({
      where: { workerId: workerId || undefined, status: status || undefined },
      include: { worker: { include: { vendor: true, rateCard: true } } },
    });
    res.json(timesheets);
  })
);

router.post(
  "/timesheets/:id/approve",
  asyncHandler(async (req, res) => {
    const { approverUserId, approve } = req.body;
    const timesheet = await prisma.timesheet.update({
      where: { id: req.params.id },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        approverUserId,
        approvedAt: approve ? new Date() : null,
      },
    });
    res.json(timesheet);
  })
);

module.exports = router;
