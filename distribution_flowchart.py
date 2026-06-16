import graphviz

dot = graphviz.Digraph(
    name="Distribution_EPC_Workflow",
    format="png",
    graph_attr={
        "rankdir": "TB",
        "splines": "ortho",
        "nodesep": "0.5",
        "ranksep": "0.6",
        "fontname": "Arial",
        "bgcolor": "white",
        "pad": "0.4",
        "dpi": "150",
        "size": "20,40",
    },
    node_attr={
        "fontname": "Arial",
        "fontsize": "11",
        "style": "filled",
        "width": "2.8",
        "height": "0.55",
        "fixedsize": "true",
    },
    edge_attr={
        "fontname": "Arial",
        "fontsize": "9",
        "color": "#555555",
    },
)

# ── colour palette ──────────────────────────────────────────────────────────
C_START   = {"fillcolor": "#1a1a2e", "fontcolor": "white", "shape": "oval"}
C_END     = {"fillcolor": "#1a1a2e", "fontcolor": "white", "shape": "oval"}
C_PHASE   = {"fillcolor": "#16213e", "fontcolor": "white", "shape": "rectangle"}   # phase header
C_SEQ     = {"fillcolor": "#0f3460", "fontcolor": "white", "shape": "rectangle"}   # sequential main step
C_PAR     = {"fillcolor": "#533483", "fontcolor": "white", "shape": "rectangle"}   # parallel step
C_PARB    = {"fillcolor": "#e94560", "fontcolor": "white", "shape": "rectangle"}   # parallel track B
C_PARC    = {"fillcolor": "#08b4a6", "fontcolor": "#000000", "shape": "rectangle"} # parallel track C
C_PARD    = {"fillcolor": "#f5a623", "fontcolor": "#000000", "shape": "rectangle"} # parallel track D
C_PARE    = {"fillcolor": "#2ecc71", "fontcolor": "#000000", "shape": "rectangle"} # parallel track E
C_PARF    = {"fillcolor": "#3498db", "fontcolor": "white",   "shape": "rectangle"} # parallel track F
C_DECISION = {"fillcolor": "#f39c12", "fontcolor": "#000000", "shape": "diamond", "width": "2.8", "height": "0.8"}
C_JOIN    = {"fillcolor": "#2c2c54", "fontcolor": "white", "shape": "rectangle", "width": "2.8", "height": "0.4"}

def node(g, nid, label, color_dict):
    g.node(nid, label=label, **color_dict)

def edge(g, a, b, label=""):
    g.edge(a, b, label=label)

# ── START ───────────────────────────────────────────────────────────────────
node(dot, "START", "START", C_START)

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1 — BID PROCESS (sequential)
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_bid") as c:
    c.attr(label="PHASE 1 · BID PROCESS", style="dashed", color="#0f3460",
           fontname="Arial Bold", fontsize="12", fontcolor="#0f3460", bgcolor="#eaf0fb")
    node(c, "B1", "Tender / NIT Identification", C_SEQ)
    node(c, "B2", "Bid / No-Bid Decision", C_DECISION)
    node(c, "B3", "Pre-Bid Activities\n(Site visit, Queries, Corrigendum)", C_SEQ)
    node(c, "B4", "Scope & BOQ Analysis", C_SEQ)
    node(c, "B5", "Cost Estimation", C_SEQ)
    node(c, "B6", "Vendor & Subcontractor Quotations", C_SEQ)
    node(c, "B7", "Risk & Contingency Analysis", C_SEQ)
    node(c, "B8", "Bid Price Finalization", C_SEQ)
    node(c, "B9", "Bid Preparation & Submission", C_SEQ)
    node(c, "B10", "Post-Bid: Clarifications & Negotiation", C_SEQ)
    node(c, "B11", "LOA Received ✓", C_JOIN)
    c.edge("B1","B2"); c.edge("B2","B3",label="Go")
    c.edge("B3","B4"); c.edge("B4","B5"); c.edge("B5","B6")
    c.edge("B6","B7"); c.edge("B7","B8"); c.edge("B8","B9")
    c.edge("B9","B10"); c.edge("B10","B11")

dot.edge("START","B1")

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 2 — CONTRACT FINALIZATION (sequential)
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_contract") as c:
    c.attr(label="PHASE 2 · CONTRACT FINALIZATION", style="dashed", color="#0f3460",
           fontname="Arial Bold", fontsize="12", fontcolor="#0f3460", bgcolor="#eaf0fb")
    node(c, "C1", "LOA Review & Acceptance", C_SEQ)
    node(c, "C2", "Contract Drafting & Negotiation", C_SEQ)
    node(c, "C3", "Contract Signing", C_SEQ)

    # parallel: BG + Insurance run together
    node(c, "CP1", "Performance Bank Guarantee\nSubmission", C_PAR)
    node(c, "CP2", "Insurance & Compliance\n(CAR, WC, TPL, ESI/PF)", C_PAR)
    node(c, "C4", "Contract Effective ✓", C_JOIN)

    c.edge("C1","C2"); c.edge("C2","C3")
    c.edge("C3","CP1"); c.edge("C3","CP2")
    c.edge("CP1","C4"); c.edge("CP2","C4")

dot.edge("B11","C1")

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 3 — PROJECT MOBILIZATION (parallel activities)
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_mob") as c:
    c.attr(label="PHASE 3 · PROJECT MOBILIZATION  [All 5 tracks run in PARALLEL]",
           style="dashed", color="#533483",
           fontname="Arial Bold", fontsize="12", fontcolor="#533483", bgcolor="#f5f0fb")
    node(c, "M0",  "Mobilization Advance Received", C_SEQ)
    node(c, "MA1", "Team Mobilization\n(PM, Engineers, Surveyors, Gangs)", C_PAR)
    node(c, "MB1", "Site Office & Store Setup", C_PARB)
    node(c, "MC1", "Equipment & Vehicles\n(Boring, JCB, Crane, Trucks)", C_PARC)
    node(c, "MD1", "HSE Plan, Induction\n& Mock Drills", C_PARD)
    node(c, "ME1", "Regulatory Compliances\n(Labour License, Permissions)", C_PARE)
    node(c, "M_JOIN", "Site Established — Ready for Execution ✓", C_JOIN)
    c.edge("M0","MA1"); c.edge("M0","MB1"); c.edge("M0","MC1")
    c.edge("M0","MD1"); c.edge("M0","ME1")
    c.edge("MA1","M_JOIN"); c.edge("MB1","M_JOIN"); c.edge("MC1","M_JOIN")
    c.edge("MD1","M_JOIN"); c.edge("ME1","M_JOIN")

dot.edge("C4","M0")

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 4 — SURVEY + PROCUREMENT (run in PARALLEL)
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_sp") as c:
    c.attr(label="PHASE 4 · SURVEY & PROCUREMENT  [2 tracks run in PARALLEL]",
           style="dashed", color="#e94560",
           fontname="Arial Bold", fontsize="12", fontcolor="#e94560", bgcolor="#fdf0f2")
    node(c, "S1", "HT / LT Route Survey\n& Soil Investigation", C_PAR)
    node(c, "S2", "DTR & UG Cable Route Survey", C_PAR)
    node(c, "S3", "Survey Report → IFC Release\n(Client Approved Drawings)", C_PAR)

    node(c, "P1", "Procurement Planning\n& Vendor RFQ", C_PARB)
    node(c, "P2", "Techno-Commercial Evaluation\n& PO Issuance", C_PARB)
    node(c, "P3", "Vendor TPI / FAT Inspection\n& Dispatch", C_PARB)

    node(c, "SP_JOIN", "IFC Drawings Ready + Materials Dispatched ✓", C_JOIN)
    c.edge("S1","S2"); c.edge("S2","S3")
    c.edge("P1","P2"); c.edge("P2","P3")
    c.edge("S3","SP_JOIN"); c.edge("P3","SP_JOIN")

dot.edge("M_JOIN","S1")
dot.edge("M_JOIN","P1")

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 5 — DETAILED ENGINEERING (sequential, starts with survey)
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_eng") as c:
    c.attr(label="PHASE 5 · DETAILED ENGINEERING",
           style="dashed", color="#0f3460",
           fontname="Arial Bold", fontsize="12", fontcolor="#0f3460", bgcolor="#eaf0fb")
    node(c, "E1", "HT/LT Line Design\n(Sag-Tension, Pole Schedule)", C_SEQ)
    node(c, "E2", "DTR Design\n(Capacity, Earthing, Civil Pad)", C_SEQ)

    node(c, "EP1", "UG Cable Design\n(Cable Sizing, Route, Trench X-section)", C_PAR)
    node(c, "EP2", "Smart Meter / AMI Design\n(Meter Type, HES, DCU, MDM)", C_PAR)
    node(c, "EP3", "DA / SCADA Design\n(FRTU, FLISR, Comms Architecture)", C_PAR)

    node(c, "E3", "Drawing Submission\n& Client Approval → IFC Release ✓", C_JOIN)

    c.edge("E1","E2")
    c.edge("E2","EP1"); c.edge("E2","EP2"); c.edge("E2","EP3")
    c.edge("EP1","E3"); c.edge("EP2","E3"); c.edge("EP3","E3")

dot.edge("SP_JOIN","E1")

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 6 — MATERIAL RECEIPT & CIVIL (run in PARALLEL)
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_mr") as c:
    c.attr(label="PHASE 6 · MATERIAL RECEIPT & CIVIL WORKS  [PARALLEL]",
           style="dashed", color="#533483",
           fontname="Arial Bold", fontsize="12", fontcolor="#533483", bgcolor="#f5f0fb")
    node(c, "MR1", "Material Receipt, Incoming\nInspection & GRN", C_PAR)
    node(c, "MR2", "Store Management\n& Issue to Field", C_PAR)

    node(c, "CV1", "Pole Foundation\n(Boring, PCC, Compaction)", C_PARB)
    node(c, "CV2", "Earth Pit Construction\n& DTR Civil Pad", C_PARB)
    node(c, "CV3", "Trench Excavation & Backfill\n(UG Projects — HDD/Open Cut)", C_PARB)
    node(c, "CV4", "Joint Bay / Manhole\nConstruction", C_PARB)

    node(c, "MR_JOIN", "Civil Complete + Materials at Site ✓", C_JOIN)
    c.edge("MR1","MR2")
    c.edge("CV1","CV2"); c.edge("CV2","CV3"); c.edge("CV3","CV4")
    c.edge("MR2","MR_JOIN"); c.edge("CV4","MR_JOIN")

dot.edge("E3","MR1")
dot.edge("E3","CV1")

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 7 — ERECTION / INSTALLATION (multiple parallel tracks)
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_inst") as c:
    c.attr(label="PHASE 7 · ERECTION & INSTALLATION  [All tracks run in PARALLEL]",
           style="dashed", color="#e94560",
           fontname="Arial Bold", fontsize="12", fontcolor="#e94560", bgcolor="#fdf0f2")

    # Track A — Overhead Lines
    node(c, "IA1", "Pole Erection\n& Hardware Fitting", C_PAR)
    node(c, "IA2", "Insulator Fitting\n& Stay Wire", C_PAR)
    node(c, "IA3", "HT Conductor Stringing\n(ACSR — Sagging & Clamping)", C_PAR)
    node(c, "IA4", "LT / ABC Cable Stringing\n& Tee-off Joints", C_PAR)

    # Track B — DTR
    node(c, "IB1", "DTR Transport to Site\n& Erection (Pole / Ground)", C_PARB)
    node(c, "IB2", "HT Connections\n(AB Switch, DO Fuse, LA)", C_PARB)
    node(c, "IB3", "LT Connections\n& LT Distribution Box", C_PARB)
    node(c, "IB4", "DTR Earthing\n(Body + Neutral + LA Earth)", C_PARB)

    # Track C — UG Cable
    node(c, "IC1", "Cable Pulling\n(Direct Buried / Duct)", C_PARC)
    node(c, "IC2", "Cable Jointing\n(Cold/Heat Shrink Kit)", C_PARC)
    node(c, "IC3", "Cable Termination\n& RMU Installation", C_PARC)

    # Track D — Smart Meter
    node(c, "ID1", "Smart Meter Installation\n& CT Fitting", C_PARD)
    node(c, "ID2", "DCU Installation\n& Communication Setup", C_PARD)

    # Track E — DA / SCADA
    node(c, "IE1", "Auto Recloser & FRTU\nInstallation", C_PARE)
    node(c, "IE2", "Communication Network\n(GPRS / Fiber / RF)", C_PARE)

    node(c, "INST_JOIN", "All Erection & Installation Complete ✓", C_JOIN)

    c.edge("IA1","IA2"); c.edge("IA2","IA3"); c.edge("IA3","IA4")
    c.edge("IB1","IB2"); c.edge("IB2","IB3"); c.edge("IB3","IB4")
    c.edge("IC1","IC2"); c.edge("IC2","IC3")
    c.edge("ID1","ID2")
    c.edge("IE1","IE2")
    c.edge("IA4","INST_JOIN"); c.edge("IB4","INST_JOIN")
    c.edge("IC3","INST_JOIN"); c.edge("ID2","INST_JOIN"); c.edge("IE2","INST_JOIN")

dot.edge("MR_JOIN","IA1")
dot.edge("MR_JOIN","IB1")
dot.edge("MR_JOIN","IC1")
dot.edge("MR_JOIN","ID1")
dot.edge("MR_JOIN","IE1")

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 8 — PRE-COMMISSIONING (parallel test streams, sequential within each)
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_precomm") as c:
    c.attr(label="PHASE 8 · ELECTRICAL TESTING & PRE-COMMISSIONING  [Streams run in PARALLEL]",
           style="dashed", color="#08b4a6",
           fontname="Arial Bold", fontsize="12", fontcolor="#08b4a6", bgcolor="#edfaf9")

    # Stream A — Line Tests
    node(c, "TA1", "HT/LT Line IR Test\n& Continuity Check", C_PARC)
    node(c, "TA2", "Phase Sequence &\nGround Clearance Verification", C_PARC)

    # Stream B — DTR Tests
    node(c, "TB1", "DTR IR Test\n& Turns Ratio Test (TTR)", C_PAR)
    node(c, "TB2", "No-Load Test, Oil BDV Test\n& Vector Group Verification", C_PAR)

    # Stream C — AB Switch / DO Fuse Tests
    node(c, "TC1", "AB Switch / DO Fuse\nMechanical & IR Test", C_PARB)

    # Stream D — UG Cable Tests
    node(c, "TD1", "VLF HiPot Test\n(17 kV, 60 min for 11kV cable)", C_PARD)
    node(c, "TD2", "Sheath Continuity\n& Phase Identification", C_PARD)

    # Stream E — Earthing
    node(c, "TE1", "Earth Resistance Measurement\n(DTR Body, Neutral, LA — per IE Rules)", C_PARE)

    # Stream F — Smart Meter / SCADA Tests
    node(c, "TF1", "Smart Meter Data Pull Test\n& Communication Verification", C_PARF)
    node(c, "TF2", "SCADA/FRTU Integration Test\n& FLISR Logic Verification", C_PARF)

    node(c, "PL", "Punch List Preparation\n& Closure", C_SEQ)
    node(c, "PC_CERT", "Pre-Commissioning Completion\nCertificate Issued ✓", C_JOIN)

    c.edge("TA1","TA2")
    c.edge("TB1","TB2")
    c.edge("TD1","TD2")
    c.edge("TF1","TF2")
    c.edge("TA2","PL"); c.edge("TB2","PL"); c.edge("TC1","PL")
    c.edge("TD2","PL"); c.edge("TE1","PL"); c.edge("TF2","PL")
    c.edge("PL","PC_CERT")

dot.edge("INST_JOIN","TA1")
dot.edge("INST_JOIN","TB1")
dot.edge("INST_JOIN","TC1")
dot.edge("INST_JOIN","TD1")
dot.edge("INST_JOIN","TE1")
dot.edge("INST_JOIN","TF1")

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 9 — EXTERNAL CLEARANCES (parallel)
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_clear") as c:
    c.attr(label="PHASE 9 · EXTERNAL CLEARANCES  [PARALLEL]",
           style="dashed", color="#0f3460",
           fontname="Arial Bold", fontsize="12", fontcolor="#0f3460", bgcolor="#eaf0fb")
    node(c, "CL1", "Electrical Inspector (EI)\nInspection & Certificate", C_PAR)
    node(c, "CL2", "DISCOM PTCC\n(Permission to Charge Certificate)", C_PARB)
    node(c, "CL_JOIN", "All Clearances Received ✓", C_JOIN)
    c.edge("CL1","CL_JOIN"); c.edge("CL2","CL_JOIN")

dot.edge("PC_CERT","CL1")
dot.edge("PC_CERT","CL2")

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 10 — COMMISSIONING & ENERGIZATION (sequential)
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_comm") as c:
    c.attr(label="PHASE 10 · COMMISSIONING & ENERGIZATION",
           style="dashed", color="#533483",
           fontname="Arial Bold", fontsize="12", fontcolor="#533483", bgcolor="#f5f0fb")
    node(c, "EN1", "Pre-Energization Safety Check\n(Earthing clamps off, barriers up)", C_SEQ)
    node(c, "EN2", "HT Line Energization\n(Step-by-step from source end)", C_SEQ)
    node(c, "EN3", "DTR Energization\n(AB Switch close → 415V no-load check)", C_SEQ)
    node(c, "EN4", "LT Network Energization\n(Feeder by feeder, voltage drop check)", C_SEQ)

    node(c, "ENP1", "Smart Meter Live Check\n(Display, HES communication)", C_PAR)
    node(c, "ENP2", "DA / SCADA Live Test\n(Remote switching, real-time data)", C_PAR)

    node(c, "EN_JOIN", "System Energized & Live ✓", C_JOIN)
    c.edge("EN1","EN2"); c.edge("EN2","EN3"); c.edge("EN3","EN4")
    c.edge("EN4","ENP1"); c.edge("EN4","ENP2")
    c.edge("ENP1","EN_JOIN"); c.edge("ENP2","EN_JOIN")

dot.edge("CL_JOIN","EN1")

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 11 — TRIAL RUN (sequential + parallel monitoring)
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_trial") as c:
    c.attr(label="PHASE 11 · TRIAL RUN & PERFORMANCE MONITORING",
           style="dashed", color="#e94560",
           fontname="Arial Bold", fontsize="12", fontcolor="#e94560", bgcolor="#fdf0f2")
    node(c, "TR1", "Trial Operation\n(30-day run under normal load)", C_SEQ)

    node(c, "TRP1", "Daily Voltage & Load\nMonitoring", C_PAR)
    node(c, "TRP2", "AT&C Loss Calculation\n(DTR meter vs Consumer meter)", C_PARB)
    node(c, "TRP3", "Outage Recording\n& Restoration Time Tracking", C_PARC)

    node(c, "TR2", "Snag Rectification\n(Voltage issues, loose connections)", C_SEQ)
    node(c, "TR3", "Performance Stabilization\nCertificate ✓", C_JOIN)

    c.edge("TR1","TRP1"); c.edge("TR1","TRP2"); c.edge("TR1","TRP3")
    c.edge("TRP1","TR2"); c.edge("TRP2","TR2"); c.edge("TRP3","TR2")
    c.edge("TR2","TR3")

dot.edge("EN_JOIN","TR1")

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 12 — HANDOVER & CLOSURE (sequential + parallel docs)
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_ho") as c:
    c.attr(label="PHASE 12 · PROJECT HANDOVER & CLOSURE",
           style="dashed", color="#0f3460",
           fontname="Arial Bold", fontsize="12", fontcolor="#0f3460", bgcolor="#eaf0fb")

    node(c, "HO1", "As-Built Drawings, Test Certs\n& Material Reconciliation", C_PAR)
    node(c, "HO2", "O&M Manuals & Consumer\nList Handover", C_PAR)
    node(c, "HO3", "Regulatory Handover\n(DISCOM GIS, Billing System)", C_PARB)

    node(c, "HO4", "Client Walk-Through\n& Acceptance Inspection", C_SEQ)
    node(c, "HO5", "PAC Issued\n(Provisional Acceptance Certificate) ✓", C_JOIN)
    node(c, "HO6", "Final Bill Submission\n& Payment", C_SEQ)

    c.edge("HO1","HO4"); c.edge("HO2","HO4"); c.edge("HO3","HO4")
    c.edge("HO4","HO5"); c.edge("HO5","HO6")

dot.edge("TR3","HO1")
dot.edge("TR3","HO2")
dot.edge("TR3","HO3")

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 13 — DLP (sequential)
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_dlp") as c:
    c.attr(label="PHASE 13 · DEFECT LIABILITY PERIOD (DLP)  — 12 to 24 Months",
           style="dashed", color="#533483",
           fontname="Arial Bold", fontsize="12", fontcolor="#533483", bgcolor="#f5f0fb")
    node(c, "DLP1", "DLP Period Active\n(Periodic Site Inspections)", C_SEQ)
    node(c, "DLP2", "Defect Notification\n& Root Cause Analysis", C_SEQ)
    node(c, "DLP3", "Repair / Replacement\n(Conductor, Insulator, DTR, Meter)", C_SEQ)
    node(c, "DLP4", "Back-to-Back Warranty Claims\nto Vendors (DTR, Smart Meters)", C_SEQ)
    node(c, "DLP5", "All DLP Defects Closed ✓", C_JOIN)
    c.edge("DLP1","DLP2"); c.edge("DLP2","DLP3")
    c.edge("DLP3","DLP4"); c.edge("DLP4","DLP5")

dot.edge("HO6","DLP1")

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 14 — FAC & CONTRACT CLOSEOUT (sequential)
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_fac") as c:
    c.attr(label="PHASE 14 · FAC & CONTRACT CLOSEOUT",
           style="dashed", color="#0f3460",
           fontname="Arial Bold", fontsize="12", fontcolor="#0f3460", bgcolor="#eaf0fb")
    node(c, "F1", "FAC Application Submission", C_SEQ)
    node(c, "F2", "Final Joint Inspection\n& FAC Issued ✓", C_SEQ)
    node(c, "F3", "PBG / BG Return &\nRetention Money Release", C_SEQ)
    node(c, "F4", "Contract Closure Letter\n& Lessons Learned Document", C_SEQ)
    c.edge("F1","F2"); c.edge("F2","F3"); c.edge("F3","F4")

dot.edge("DLP5","F1")

# ── END ──────────────────────────────────────────────────────────────────────
node(dot, "END", "PROJECT COMPLETE", C_END)
dot.edge("F4","END")

# ── Legend ───────────────────────────────────────────────────────────────────
with dot.subgraph(name="cluster_legend") as c:
    c.attr(label="LEGEND", style="solid", color="#888888",
           fontname="Arial Bold", fontsize="11", fontcolor="#888888", bgcolor="#f9f9f9")
    c.attr(rank="sink")
    node(c, "L1", "Sequential Step", C_SEQ)
    node(c, "L2", "Parallel Track A", C_PAR)
    node(c, "L3", "Parallel Track B", C_PARB)
    node(c, "L4", "Parallel Track C", C_PARC)
    node(c, "L5", "Parallel Track D", C_PARD)
    node(c, "L6", "Convergence / Join Point ✓", C_JOIN)
    node(c, "L7", "Decision Gate", C_DECISION)

# ── Render ───────────────────────────────────────────────────────────────────
out = "/home/user/Harrsh25/Distribution_EPC_Workflow_Flowchart"
dot.render(out, cleanup=True)
print(f"Saved: {out}.png")
