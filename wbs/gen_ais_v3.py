import csv

ASSIGN = "Harsh,Shruti"
TIMELINE = "25-Dec-2025|07-Jun-2026"
HEADER = ["Level1_Name","Level1_Desc","Level2_Name","Level2_Desc","Level3_Name","Level3_Desc",
          "Level4_Name","Level4_Desc","Level5_Name","Level5_Desc","Assign_To","Timeline","Weight",
          "Substation_Type","Leaf_Node_Progress_Type"]

def write_csv(path, tree, sub_type):
    rows = []

    def emit(path_names, is_leaf):
        names = path_names + [""] * (5 - len(path_names))
        row = []
        for n in names:
            row.append(n)
            row.append("")
        row += [ASSIGN, TIMELINE, "", sub_type, "Binary" if is_leaf else ""]
        rows.append(row)

    def walk(node, ancestors):
        name = node["name"]
        children = node.get("children")
        path_names = ancestors + [name]
        if not children:
            emit(path_names, True)
        else:
            emit(path_names, False)
            for c in children:
                walk(c, path_names)

    for top in tree:
        walk(top, [])

    prev_names = [None] * 5
    for row in rows:
        cur_names = [row[0], row[2], row[4], row[6], row[8]]
        changed_before = False
        for i in range(5):
            if not changed_before and cur_names[i] == prev_names[i]:
                row[i * 2] = ""
            else:
                changed_before = True
        prev_names = cur_names

    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(HEADER)
        w.writerows(rows)

def leaf(name):
    return {"name": name}

def node(name, children):
    return {"name": name, "children": children}

AIS_TREE_V3 = [
    node("Project Initial Activity", [
        node("Contractor Mobilization", [
            node("Sub-Contractor Finalization", [
                leaf("Tender Evaluation"),
                leaf("Sub-Contract Agreement Signing"),
            ]),
            node("Mobilization of Site Team", [
                leaf("Key Personnel Deployment"),
                leaf("Site Joining Formalities"),
            ]),
        ]),
        node("Site Infrastructure Setup", [
            node("Site Office Setup", [
                leaf("Office Cabin Installation"),
                leaf("Furniture & IT Setup"),
            ]),
            node("Site Store Setup", [
                leaf("Warehouse/Shed Erection"),
                leaf("Material Rack & Bin Arrangement"),
            ]),
            node("Labor Camp / Accommodation Setup", [
                leaf("Camp Construction/Hiring"),
                leaf("Sanitation & Mess Facility"),
            ]),
        ]),
        node("Utility & Communication Setup", [
            node("Temporary Power/Water Arrangement", [
                leaf("DG Set Installation"),
                leaf("Bore Well / Water Tanker Arrangement"),
            ]),
            node("Internet & Communication Setup", [
                leaf("Internet Connectivity"),
                leaf("Walkie-Talkie/Phone Network"),
            ]),
        ]),
        node("Compliance & Resource Mobilization", [
            node("Construction Equipment & Vehicle Mobilization", [
                leaf("Crane/EOT Mobilization"),
                leaf("Earthmoving Equipment Mobilization"),
            ]),
            node("Workmen Insurance / ESI-PF Registration", [
                leaf("Labor License Application"),
                leaf("ESI/PF Code Registration"),
            ]),
            node("Site Security Arrangement", [
                leaf("Security Agency Deployment"),
                leaf("Boundary Fencing/CCTV Setup"),
            ]),
        ]),
    ]),
    node("Statutory Approvals", [
        node("Land & Environmental Approval", [
            node("Land Acquisition / Site Handover", [
                leaf("Land Title Verification"),
                leaf("Possession Handover Memo"),
            ]),
            node("Forest Clearance", [
                leaf("Stage-I Forest Clearance"),
                leaf("Stage-II Forest Clearance (CAF Payment)"),
            ]),
            node("Environmental Clearance", [
                leaf("EIA Report Submission"),
                leaf("Public Hearing/SEIAA Approval"),
            ]),
        ]),
        node("Government Regulatory Approval", [
            node("Pollution Control Board Consent (CTE/CTO)", [
                leaf("Consent to Establish (CTE)"),
                leaf("Consent to Operate (CTO)"),
            ]),
            node("Electrical Inspectorate Approval", [
                leaf("Drawing Submission to Inspectorate"),
                leaf("Site Inspection & NOC"),
            ]),
            node("CEIG Drawing Approval", [
                leaf("GA/SLD Drawing Submission"),
                leaf("Comments Resolution & Final Approval"),
            ]),
            node("CEA Compliance Approval", [
                leaf("CEA Regulation Checklist Compliance"),
                leaf("CEA Technical Standards Certification"),
            ]),
        ]),
        node("Safety & Site Statutory Approval", [
            node("Fire Safety Approval", [
                leaf("Fire NOC Application"),
                leaf("Fire Department Site Inspection"),
            ]),
            node("Explosive License (Oil Storage)", [
                leaf("PESO License Application"),
                leaf("Storage Facility Inspection"),
            ]),
            node("Local Authority Approval", [
                leaf("Panchayat/Municipal NOC"),
                leaf("Building Permission (Control Room)"),
            ]),
        ]),
        node("Crossing & Right-of-Way Approval", [
            node("Railway/Highway Crossing Approval", [
                leaf("Railway Authority Permission"),
                leaf("NHAI/PWD Permission"),
            ]),
            node("Aviation/Height Clearance", [
                leaf("AAI NOC Application"),
                leaf("Structure Height Compliance Certificate"),
            ]),
            node("Right of Way Approval", [
                leaf("RoW Survey"),
                leaf("Compensation/Agreement with Landowners"),
            ]),
        ]),
        node("Grid & Communication Approval", [
            node("Grid Connectivity Approval", [
                leaf("Connectivity Application to SLDC/RLDC"),
                leaf("Connection Agreement Signing"),
            ]),
            node("Telecom/PLCC Frequency Clearance", [
                leaf("WPC Frequency Allocation"),
                leaf("PLCC Carrier Testing Clearance"),
            ]),
        ]),
    ]),
    node("Survey & Soil Investigation", [
        node("Survey Activities", [
            node("Topographical Survey", [
                leaf("Total Station/DGPS Survey"),
                leaf("Contour Map Preparation"),
            ]),
            node("Benchmark Fixing", [
                leaf("Reference Benchmark Establishment"),
                leaf("Temporary Benchmark Pillars"),
            ]),
            node("Grid Coordinate Survey", [
                leaf("Equipment Centerline Marking"),
                leaf("Grid Reference Pegging"),
            ]),
            node("Underground Utility Detection", [
                leaf("GPR Scanning"),
                leaf("Existing Cable/Pipeline Marking"),
            ]),
        ]),
        node("Soil Investigation Activities", [
            node("Soil Investigation / Trial Pits", [
                leaf("Trial Pit Excavation"),
                leaf("Bore Hole Drilling"),
            ]),
            node("Bore Log Analysis", [
                leaf("Strata Classification"),
                leaf("SPT N-Value Recording"),
            ]),
            node("Geo-Technical Test", [
                leaf("Bearing Capacity Test"),
                leaf("Lab Testing (Grain Size, Atterberg Limits)"),
            ]),
            node("Soil Resistivity Test", [
                leaf("Wenner's Four-Pin Method Test"),
                leaf("Resistivity Data Compilation"),
            ]),
        ]),
        node("Site Assessment", [
            node("Hydrological / Flood Level Study", [
                leaf("HFL Data Collection"),
                leaf("Drainage Pattern Assessment"),
            ]),
            node("Climatic Data Collection", [
                leaf("Wind Speed/Seismic Zone Data"),
                leaf("Temperature/Pollution Level Data"),
            ]),
        ]),
        node("Layout Engineering", [
            node("Yard Layout Finalization", [
                leaf("Equipment Spacing Layout (Clearance Norms)"),
                leaf("Bay Extension Provision Layout"),
            ]),
            node("Client/Consultant Layout Approval", [
                leaf("Layout Submission for Review"),
                leaf("Comments Incorporation & Sign-off"),
            ]),
        ]),
    ]),
    node("Engineering & Design", [
        node("Power System Studies", [
            node("Single Line Diagram (SLD)", [
                leaf("Preliminary SLD"),
                leaf("Final Approved SLD"),
            ]),
            node("Short Circuit Study", [
                leaf("Fault Level Calculation"),
                leaf("Equipment Rating Verification"),
            ]),
            node("Load Flow Study", [
                leaf("Steady-State Load Flow"),
                leaf("Contingency Analysis"),
            ]),
            node("Insulation Coordination Study", [
                leaf("BIL/Clearance Determination"),
                leaf("Surge Arrestor Rating Selection"),
            ]),
        ]),
        node("Protection, Control & SCADA Design", [
            node("Protection Philosophy Design", [
                leaf("Main/Backup Protection Scheme"),
                leaf("Bus/Transformer/Line Protection Design"),
            ]),
            node("Relay Coordination Study", [
                leaf("Relay Setting Calculation"),
                leaf("Time-Current Grading Curve"),
            ]),
            node("Interlocking Scheme Design", [
                leaf("Bay-Level Interlock Logic"),
                leaf("Earth Switch/Isolator Interlock Logic"),
            ]),
            node("SCADA/RTU Architecture Design", [
                leaf("SCADA Network Architecture"),
                leaf("RTU I/O Mapping & Protocol Selection"),
            ]),
        ]),
        node("Layout & Cable Engineering", [
            node("Bus Bar Layout Design", [
                leaf("Bus Bar Sag/Tension Calculation"),
                leaf("Phase Spacing Design"),
            ]),
            node("Equipment Layout Design", [
                leaf("Bay-wise Equipment Positioning"),
                leaf("Maintenance Clearance Layout"),
            ]),
            node("Cable Sizing & Schedule Preparation", [
                leaf("Current Rating/Derating Calculation"),
                leaf("Cable Schedule & Route Marking"),
            ]),
            node("Cable Tray Layout", [
                leaf("Tray Routing Design"),
                leaf("Tray Loading Calculation"),
            ]),
        ]),
        node("Civil & Structural Engineering", [
            node("Foundation Design", [
                leaf("Foundation Load Calculation"),
                leaf("Reinforcement Detailing Drawing"),
            ]),
            node("Structure/Gantry Design", [
                leaf("Structural Steel Sizing"),
                leaf("Wind/Seismic Load Analysis"),
            ]),
            node("General Arrangement (GA) Drawing", [
                leaf("Plan & Elevation Drawing"),
                leaf("Sectional Detail Drawing"),
            ]),
        ]),
        node("Earthing & Protection Engineering", [
            node("Earthing Design", [
                leaf("Earth Grid Conductor Sizing"),
                leaf("Touch/Step Voltage Calculation"),
            ]),
            node("Earth Grid GPR Study", [
                leaf("Ground Potential Rise Simulation"),
                leaf("Mitigation Measures Design"),
            ]),
            node("Lightning Protection Design", [
                leaf("Mast/Shielding Angle Calculation"),
                leaf("Lightning Arrestor Positioning"),
            ]),
            node("Battery Sizing Calculation", [
                leaf("DC Load Listing"),
                leaf("Battery Ah Capacity Calculation"),
            ]),
        ]),
        node("Design Documentation & Approval", [
            node("Drawing Approval Cycle (IFA to IFR to IFC)", [
                leaf("Issued for Approval (IFA) Submission"),
                leaf("Issued for Review/Construction (IFR/IFC)"),
            ]),
            node("BOQ Preparation", [
                leaf("Quantity Take-off"),
                leaf("Rate Analysis"),
            ]),
            node("BOM Preparation", [
                leaf("Material List Compilation"),
                leaf("Vendor-wise BOM Split"),
            ]),
        ]),
    ]),
    node("Procurement & Supply", [
        node("Vendor & Contract Management", [
            node("Vendor Finalization", [
                leaf("Technical Bid Evaluation"),
                leaf("Commercial Negotiation"),
            ]),
            node("Vendor Drawing Approval", [
                leaf("GA Drawing Review"),
                leaf("Drawing Sign-off"),
            ]),
            node("Purchase Order Release", [
                leaf("PO Issuance"),
                leaf("Advance Payment Processing"),
            ]),
        ]),
        node("Manufacturing & Inspection", [
            node("TPIA Engagement", [
                leaf("TPIA Appointment"),
                leaf("Inspection Schedule Finalization"),
            ]),
            node("Manufacturing Follow-up", [
                leaf("Production Progress Tracking"),
                leaf("Stage Inspection Visits"),
            ]),
            node("Factory Acceptance Test (FAT)", [
                leaf("FAT Procedure Review"),
                leaf("FAT Witnessing & Report Sign-off"),
            ]),
        ]),
        node("Logistics & Dispatch", [
            node("Dispatch Clearance", [
                leaf("Pre-Dispatch Inspection"),
                leaf("Dispatch Instruction Issuance"),
            ]),
            node("Customs Clearance (Imported Equipment)", [
                leaf("Import Documentation"),
                leaf("Customs Duty Clearance"),
            ]),
            node("Transportation/Logistics Planning", [
                leaf("Route Survey for ODC Movement"),
                leaf("Permit/Escort Arrangement"),
            ]),
        ]),
        node("Equipment Supply", [
            node("Primary Equipment", [
                leaf("Power Transformer Supply"),
                leaf("CB/CT/PT/Isolator/LA Supply"),
            ]),
            node("Yard Equipment", [
                leaf("Bus Bar/Conductor Supply"),
                leaf("Structure/Gantry/Insulator Supply"),
            ]),
            node("Control System Equipment", [
                leaf("Panel/SCADA/RTU Supply"),
                leaf("Battery/UPS/ACDB-DCDB Supply"),
            ]),
            node("Auxiliary Equipment", [
                leaf("Fire/HVAC System Supply"),
                leaf("DG Set/Tools & Spares Supply"),
            ]),
        ]),
    ]),
    node("Material Receipt & Storage", [
        node("Material Receiving", [
            node("Material Receipt at Site", [
                leaf("Delivery Challan Verification"),
                leaf("Gate Entry & Documentation"),
            ]),
            node("Unloading Activity", [
                leaf("Crane/Forklift Unloading"),
                leaf("Handling Damage Check"),
            ]),
        ]),
        node("Material Inspection", [
            node("Material Inspection Report (MIR)", [
                leaf("Visual Inspection"),
                leaf("MIR Documentation"),
            ]),
            node("Quantity & Damage Verification", [
                leaf("Quantity Reconciliation with PO"),
                leaf("Damage/Shortage Claim Filing"),
            ]),
        ]),
        node("Storage Management", [
            node("Inventory Tracking", [
                leaf("Stock Register/ERP Entry"),
                leaf("Material Issue Tracking"),
            ]),
            node("Preservation of Equipment", [
                leaf("Weatherproof Covering"),
                leaf("Periodic Maintenance (Heater/Desiccant Check)"),
            ]),
        ]),
    ]),
    node("Civil Works", [
        node("Site Preparation", [
            node("Site Grading & Leveling", [
                leaf("Cutting & Filling"),
                leaf("Compaction Testing"),
            ]),
            node("Excavation Work", [
                leaf("Foundation Pit Excavation"),
                leaf("Trench Excavation"),
            ]),
            node("Anti-Termite / Soil Treatment", [
                leaf("Chemical Treatment Application"),
                leaf("Treatment Certification"),
            ]),
        ]),
        node("Concrete & Foundation Works", [
            node("PCC Work", [
                leaf("Sub-Base Preparation"),
                leaf("PCC Pouring & Curing"),
            ]),
            node("Reinforcement Work", [
                leaf("Rebar Cutting & Bending"),
                leaf("Reinforcement Cage Fixing"),
            ]),
            node("RCC Work", [
                leaf("Shuttering/Formwork"),
                leaf("Concrete Pouring & Curing"),
            ]),
            node("Equipment/Structure Foundations & Anchor Bolt Fixing", [
                leaf("Anchor Bolt Template Fixing"),
                leaf("Foundation Curing & De-shuttering"),
            ]),
        ]),
        node("Building & Containment Works", [
            node("Control Room Building & Finishing", [
                leaf("Brickwork/Block Work"),
                leaf("Plastering/Flooring/Painting"),
            ]),
            node("Transformer Oil Pit Construction", [
                leaf("Oil Pit Excavation & RCC"),
                leaf("Pebble Filling & Oil Drain Pipe"),
            ]),
            node("Fire Wall Construction", [
                leaf("Fire Wall RCC/Masonry"),
                leaf("Fire Rating Compliance Check"),
            ]),
        ]),
        node("Utility Infrastructure", [
            node("Cable Trenches & Ducting", [
                leaf("Trench Excavation & RCC Lining"),
                leaf("Trench Cover Slab Installation"),
            ]),
            node("Internal Roads, Boundary Wall & Gates", [
                leaf("Road Sub-grade & WBM/Asphalt"),
                leaf("Boundary Wall & Gate Erection"),
            ]),
            node("Drainage & Water Supply Arrangement", [
                leaf("Storm Water Drain Construction"),
                leaf("Water Supply Piping"),
            ]),
        ]),
    ]),
    node("Erection & Installation", [
        node("Structural Installation", [
            node("Gantry/Structure Erection & Alignment", [
                leaf("Structure Assembly on Ground"),
                leaf("Crane Lifting & Erection"),
            ]),
            node("Bolt Tightening / Torque Verification", [
                leaf("Torque Wrench Calibration Check"),
                leaf("Torque Value Recording"),
            ]),
            node("Galvanization Touch-up & Structural Inspection", [
                leaf("Cold Galvanizing Paint Application"),
                leaf("Final Structural Inspection"),
            ]),
        ]),
        node("Primary Equipment Installation", [
            node("Transformer Installation, Assembly & Oil Filtration", [
                leaf("Transformer Positioning on Foundation"),
                leaf("Radiator/Bushing Assembly & Vacuum Oil Filling"),
            ]),
            node("Circuit Breaker, CT, PT, Isolator, LA Installation", [
                leaf("Equipment Positioning & Leveling"),
                leaf("Mechanism Box & Control Cable Connection"),
            ]),
        ]),
        node("Electrical Installation", [
            node("Bus Bar Erection/Stringing & Jumper Connection", [
                leaf("Bus Bar Stringing & Sag Setting"),
                leaf("Jumper/Clamp Connection"),
            ]),
            node("Cable Laying, Ferruling, Glanding & Termination", [
                leaf("Cable Pulling/Laying in Trays & Trenches"),
                leaf("Ferruling, Glanding & Lug Termination"),
            ]),
        ]),
        node("Control & Earthing Installation", [
            node("Control Panel & Marshalling Box Wiring", [
                leaf("Panel Positioning & Fixing"),
                leaf("Internal/External Wiring Termination"),
            ]),
            node("Earthing Strip Laying & Earth Pit Installation", [
                leaf("Earth Strip Trenching & Laying"),
                leaf("Earth Pit Construction & Connection"),
            ]),
            node("Battery, Charger & ACDB/DCDB Installation", [
                leaf("Battery Bank Rack Installation"),
                leaf("Charger/ACDB-DCDB Wiring & Testing"),
            ]),
        ]),
    ]),
    node("Testing & Commissioning", [
        node("Pre-Commissioning", [
            node("Pre-Commissioning Visual & Continuity Checks", [
                leaf("Wiring Continuity Check"),
                leaf("Visual/Mechanical Checklist Sign-off"),
            ]),
        ]),
        node("Equipment Testing", [
            node("Insulation Resistance & Tan Delta Test", [
                leaf("IR Test (Megger)"),
                leaf("Tan Delta/Capacitance Test"),
            ]),
            node("Transformer Ratio, Winding Resistance & Vector Group Test", [
                leaf("Turns Ratio Test"),
                leaf("Winding Resistance & Vector Group Verification"),
            ]),
            node("CT/PT Testing", [
                leaf("Polarity & Ratio Test"),
                leaf("Magnetization/Burden Test"),
            ]),
            node("Breaker Timing & Contact Resistance Test", [
                leaf("Operating Timing Test"),
                leaf("Contact Resistance Measurement"),
            ]),
        ]),
        node("Protection Testing", [
            node("Relay Testing", [
                leaf("Relay Functional Test"),
                leaf("Relay Setting Verification"),
            ]),
            node("Primary & Secondary Injection Test", [
                leaf("Secondary Injection Test"),
                leaf("Primary Injection Test"),
            ]),
            node("Interlock & Protection Scheme Verification", [
                leaf("Bay Interlock Functional Check"),
                leaf("Trip Scheme Verification"),
            ]),
        ]),
        node("System Testing", [
            node("Earthing Resistance & Battery Discharge Test", [
                leaf("Earth Pit Resistance Measurement"),
                leaf("Battery Capacity Discharge Test"),
            ]),
            node("SCADA & RTU Communication Testing", [
                leaf("Point-to-Point Signal Mapping Test"),
                leaf("RTU-SCADA Communication Test"),
            ]),
        ]),
        node("Final Commissioning", [
            node("Charging Permission & Synchronization Check", [
                leaf("CEIG/Grid Authority Permission"),
                leaf("Phase Sequence/Synchronization Check"),
            ]),
            node("Charging & Trial Run", [
                leaf("No-Load Charging"),
                leaf("Load Trial Run"),
            ]),
            node("Reliability / Sustained Run & Final Commissioning", [
                leaf("72-Hour Sustained Run"),
                leaf("Final Commissioning Certificate"),
            ]),
        ]),
    ]),
    node("Quality Assurance / Quality Control (QA/QC)", [
        node("Inspection Planning", [
            node("Inspection Test Plan (ITP)", [
                leaf("ITP Preparation"),
                leaf("ITP Client/TPIA Approval"),
            ]),
            node("Request for Inspection (RFI)", [
                leaf("RFI Raising"),
                leaf("RFI Closure Tracking"),
            ]),
        ]),
        node("Inspection & Verification", [
            node("Material/Welding/Alignment Inspection", [
                leaf("Welding Visual/NDT Inspection"),
                leaf("Alignment Dial Gauge Check"),
            ]),
            node("Third-Party Inspection Coordination", [
                leaf("TPI Visit Scheduling"),
                leaf("TPI Report Compilation"),
            ]),
            node("Torque & Calibration Verification", [
                leaf("Instrument Calibration Certificate Check"),
                leaf("Torque Record Verification"),
            ]),
        ]),
        node("Non-Conformance Management", [
            node("NCR Generation & Closure", [
                leaf("NCR Raising"),
                leaf("Corrective Action & Closure"),
            ]),
            node("Document/QA Record Control", [
                leaf("QA Dossier Compilation"),
                leaf("Record Archiving"),
            ]),
        ]),
    ]),
    node("Safety Management (EHS)", [
        node("Safety Induction & Training", [
            node("Safety Induction", [
                leaf("New Worker Induction"),
                leaf("Induction Record Maintenance"),
            ]),
            node("Toolbox Talk", [
                leaf("Daily Toolbox Talk"),
                leaf("Attendance Record"),
            ]),
        ]),
        node("Safety Procedures & PPE", [
            node("PPE Distribution & Permit to Work", [
                leaf("PPE Issuance & Tracking"),
                leaf("PTW Issuance for Critical Tasks"),
            ]),
            node("Work at Height & Electrical Safety Procedure", [
                leaf("Fall Protection Arrangement"),
                leaf("LOTO (Lock-Out Tag-Out) Procedure"),
            ]),
        ]),
        node("Emergency & Incident Management", [
            node("Emergency Response Plan", [
                leaf("ERP Documentation"),
                leaf("Mock Drill Conduct"),
            ]),
            node("Accident Reporting", [
                leaf("Incident Investigation"),
                leaf("Root Cause Report Submission"),
            ]),
        ]),
        node("Environment & Audit", [
            node("Environment Monitoring & Waste Management", [
                leaf("Waste Segregation & Disposal"),
                leaf("Dust/Noise Monitoring"),
            ]),
            node("Safety Audit", [
                leaf("Internal Safety Audit"),
                leaf("External/Client Safety Audit"),
            ]),
        ]),
    ]),
    node("Project Monitoring & Control", [
        node("Progress Reporting", [
            node("Daily Progress Report (DPR)", [
                leaf("Site Data Collection"),
                leaf("DPR Submission"),
            ]),
            node("Weekly Progress Review & Client Meeting", [
                leaf("Progress Photo/Status Update"),
                leaf("Minutes of Meeting (MoM)"),
            ]),
        ]),
        node("Schedule & Cost Control", [
            node("Schedule & Cost Monitoring", [
                leaf("S-Curve Tracking"),
                leaf("Cost Variance Analysis"),
            ]),
            node("Billing Milestone Tracking & Invoice Cycle", [
                leaf("Milestone Achievement Verification"),
                leaf("Invoice Submission & Approval"),
            ]),
            node("Delay Analysis & Recovery Plan", [
                leaf("Critical Path Delay Analysis"),
                leaf("Recovery Schedule Preparation"),
            ]),
        ]),
        node("Change & Document Control", [
            node("Change/Variation Order Management", [
                leaf("Variation Request Raising"),
                leaf("Variation Approval & Costing"),
            ]),
            node("Document Management System", [
                leaf("Drawing Revision Control"),
                leaf("Document Distribution Matrix"),
            ]),
        ]),
    ]),
    node("Handover & Documentation", [
        node("Closeout Activities", [
            node("Punch Point Closure", [
                leaf("Punch List Preparation"),
                leaf("Punch Point Rectification"),
            ]),
            node("Snag List Clearance", [
                leaf("Joint Snag Walk"),
                leaf("Snag Closure Sign-off"),
            ]),
        ]),
        node("Documentation", [
            node("As-Built Drawings", [
                leaf("Site Measurement & Markup"),
                leaf("As-Built Drawing Finalization"),
            ]),
            node("O&M Manual & Warranty Documentation", [
                leaf("O&M Manual Compilation"),
                leaf("Warranty Certificate Compilation"),
            ]),
        ]),
        node("Project Closure", [
            node("Performance Guarantee Test & Client Inspection", [
                leaf("PG Test Conduct"),
                leaf("Joint Client Inspection"),
            ]),
            node("Completion Certificate & Final Invoice", [
                leaf("Completion Certificate Issuance"),
                leaf("Final Invoice Submission & Closure"),
            ]),
        ]),
        node("Demobilization & Liability Tracking", [
            node("Taking Over Certificate (TOC)", [
                leaf("TOC Application"),
                leaf("TOC Issuance"),
            ]),
            node("DLP Tracking Start & Site Demobilization", [
                leaf("DLP Start Date Recording"),
                leaf("Equipment/Manpower Demobilization"),
            ]),
        ]),
    ]),
]

write_csv("AIS_Substation_WBS_5Level.csv", AIS_TREE_V3, "AIS")
print("Done")
