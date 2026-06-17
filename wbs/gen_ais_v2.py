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

AIS_TREE = [
    node("Project Initial Activity", [
        node("Contractor Mobilization", [
            leaf("Sub-Contractor Finalization"),
            leaf("Mobilization of Site Team"),
        ]),
        node("Site Infrastructure Setup", [
            leaf("Site Office Setup"),
            leaf("Site Store Setup"),
            leaf("Labor Camp / Accommodation Setup"),
        ]),
        node("Utility & Communication Setup", [
            leaf("Temporary Power/Water Arrangement"),
            leaf("Internet & Communication Setup"),
        ]),
        node("Compliance & Resource Mobilization", [
            leaf("Construction Equipment & Vehicle Mobilization"),
            leaf("Workmen Insurance / ESI-PF Registration"),
            leaf("Site Security Arrangement"),
        ]),
    ]),
    node("Statutory Approvals", [
        node("Land & Environmental Approval", [
            leaf("Land Acquisition / Site Handover"),
            leaf("Forest Clearance"),
            leaf("Environmental Clearance"),
        ]),
        node("Government Regulatory Approval", [
            leaf("Pollution Control Board Consent (CTE/CTO)"),
            leaf("Electrical Inspectorate Approval"),
            leaf("CEIG Drawing Approval"),
            leaf("CEA Compliance Approval"),
        ]),
        node("Safety & Site Statutory Approval", [
            leaf("Fire Safety Approval"),
            leaf("Explosive License (Oil Storage)"),
            leaf("Local Authority Approval"),
        ]),
        node("Crossing & Right-of-Way Approval", [
            leaf("Railway/Highway Crossing Approval (if applicable)"),
            leaf("Aviation/Height Clearance (if near airport)"),
            leaf("Right of Way Approval (if applicable)"),
        ]),
        node("Grid & Communication Approval", [
            leaf("Grid Connectivity Approval"),
            leaf("Telecom/PLCC Frequency Clearance"),
        ]),
    ]),
    node("Survey & Soil Investigation", [
        node("Survey Activities", [
            leaf("Topographical Survey"),
            leaf("Benchmark Fixing"),
            leaf("Grid Coordinate Survey"),
            leaf("Underground Utility Detection"),
        ]),
        node("Soil Investigation Activities", [
            leaf("Soil Investigation"),
            leaf("Bore Log Analysis"),
            leaf("Geo-Technical Test"),
            leaf("Soil Resistivity Test"),
        ]),
        node("Site Assessment", [
            leaf("Hydrological / Flood Level Study"),
            leaf("Climatic Data Collection"),
        ]),
        node("Layout Engineering", [
            leaf("Layout Finalization"),
        ]),
    ]),
    node("Engineering & Design", [
        node("Electrical Engineering", [
            node("Power System Design", [
                leaf("Single Line Diagram (SLD)"),
                leaf("Short Circuit Study"),
                leaf("Load Flow Study"),
                leaf("Insulation Coordination Study"),
            ]),
            node("Protection & Control Design", [
                leaf("Protection Philosophy Design"),
                leaf("Relay Coordination Study"),
                leaf("Interlocking Scheme Design"),
                leaf("Control & Relay Panel Design"),
            ]),
            node("SCADA & Communication Design", [
                leaf("SCADA Architecture Design"),
                leaf("RTU Design"),
                leaf("Metering Scheme Design"),
            ]),
        ]),
        node("Layout & Cable Engineering", [
            leaf("Bus Bar Layout Design"),
            leaf("Equipment Layout Design"),
            leaf("Cable Sizing Calculation"),
            leaf("Cable Tray Layout"),
            leaf("Cable Schedule Preparation"),
        ]),
        node("Civil & Structural Engineering", [
            leaf("Foundation Design"),
            leaf("Structure Design"),
            leaf("General Arrangement (GA) Drawing"),
        ]),
        node("Protection & Safety Engineering", [
            leaf("Earthing Design"),
            leaf("Earth Grid GPR Study"),
            leaf("Lightning Protection Design"),
            leaf("Battery Sizing Calculation"),
        ]),
        node("Auxiliary System Design", [
            leaf("Illumination Design"),
            leaf("HVAC Design (Control Room)"),
            leaf("Fire Fighting System Design"),
        ]),
        node("Design Approval & Documentation", [
            leaf("Drawing Approval Process (IFA to IFR to IFC)"),
            leaf("Bill of Quantity (BOQ)"),
            leaf("Bill of Material (BOM)"),
        ]),
    ]),
    node("Civil Works", [
        node("Site Preparation", [
            leaf("Site Grading & Leveling"),
            leaf("Excavation Work"),
            leaf("Anti-Termite / Soil Treatment"),
        ]),
        node("Concrete Works", [
            leaf("PCC Work"),
            leaf("Reinforcement Work"),
            leaf("RCC Work"),
        ]),
        node("Foundation Works", [
            leaf("Equipment Foundations"),
            leaf("Structure Foundations"),
            leaf("Transformer Foundation"),
            leaf("Anchor Bolt Fixing"),
            leaf("Transformer Oil Pit Construction"),
        ]),
        node("Building Works", [
            leaf("Control Room Building"),
            leaf("Control Room Finishing"),
        ]),
        node("Fire & Protection Works", [
            leaf("Fire Wall Construction"),
            leaf("Plinth Protection"),
        ]),
        node("Utility Infrastructure", [
            leaf("Cable Trenches"),
            leaf("Cable Ducting"),
            leaf("Boundary Wall"),
            leaf("Compound Gates"),
            leaf("Internal Roads"),
            leaf("Yard Gravelling"),
            leaf("Drainage System"),
            leaf("Rainwater Harvesting (if mandated)"),
            leaf("Water Supply Arrangement"),
        ]),
    ]),
    node("Procurement & Supply", [
        node("Procurement Management", [
            leaf("Vendor Finalization"),
            leaf("Vendor Drawing Approval"),
            leaf("Purchase Order Release"),
            leaf("Third-Party Inspection Agency (TPIA) Engagement"),
            leaf("Manufacturing Follow-up"),
            leaf("Factory Acceptance Test (FAT)"),
            leaf("Dispatch Clearance"),
            leaf("Customs Clearance (Imported Equipment)"),
            leaf("Logistics Planning"),
        ]),
        node("Primary Equipment Supply", [
            leaf("Power Transformer"),
            leaf("Circuit Breaker"),
            leaf("Current Transformer (CT)"),
            leaf("Potential Transformer (PT/CVT)"),
            leaf("Isolator"),
            leaf("Lightning Arrestor"),
        ]),
        node("Yard Equipment Supply", [
            leaf("Bus Bar / Conductors"),
            leaf("Structures / Gantry"),
            leaf("Insulators"),
            leaf("Earthing Material"),
        ]),
        node("Control System Supply", [
            leaf("Control & Relay Panels"),
            leaf("SCADA / RTU Panels"),
            leaf("Battery Bank"),
            leaf("Battery Charger"),
            leaf("UPS System"),
            leaf("ACDB/DCDB Panels"),
            leaf("Cables"),
        ]),
        node("Auxiliary Equipment Supply", [
            leaf("Fire Fighting System Equipment"),
            leaf("HVAC Equipment"),
            leaf("DG Set"),
            leaf("Tools, Tackles & Spares"),
            leaf("Hardware & Connectors"),
        ]),
    ]),
    node("Material Receipt & Storage", [
        node("Material Receiving", [
            leaf("Material Receipt at Site"),
            leaf("Unloading Activity"),
        ]),
        node("Material Inspection", [
            leaf("Material Inspection Report (MIR)"),
            leaf("Quantity Verification"),
            leaf("Damage Inspection"),
        ]),
        node("Storage Management", [
            leaf("Storage Management"),
            leaf("Inventory Tracking"),
            leaf("Preservation of Equipment"),
        ]),
    ]),
    node("Erection & Installation", [
        node("Structural Installation", [
            leaf("Gantry Structure Erection"),
            leaf("Equipment Support Structure Erection"),
            leaf("Bus Support Structure Erection"),
            leaf("Alignment Checking"),
            leaf("Bolt Tightening"),
            leaf("Galvanization Touch-up / Painting"),
            leaf("Structural Inspection"),
        ]),
        node("Equipment Installation", [
            leaf("Transformer Installation"),
            leaf("Transformer Assembly"),
            leaf("Transformer Oil Filtration"),
            leaf("Circuit Breaker Installation"),
            leaf("CT Installation"),
            leaf("PT Installation"),
            leaf("Isolator Installation"),
            leaf("Lightning Arrestor Installation"),
            leaf("Battery Bank Installation"),
            leaf("Battery Charger Installation"),
            leaf("ACDB/DCDB Installation"),
        ]),
        node("Electrical Installation", [
            leaf("Bus Bar Erection / Stringing"),
            leaf("Jumper Connection"),
            leaf("Clamp & Connector Installation"),
            leaf("Cable Tray Installation"),
            leaf("Power Cable Laying"),
            leaf("Control Cable Laying"),
            leaf("Cable Ferruling & Glanding"),
            leaf("Cable Termination"),
            leaf("Cable Fireproofing & Sealing at Penetrations"),
            leaf("Fiber Optic / PLCC Cable Laying"),
        ]),
        node("Control System & Earthing Installation", [
            leaf("Control Panel Installation"),
            leaf("Marshalling Box Wiring"),
            leaf("AC/DC Distribution Wiring"),
            leaf("Earthing Installation"),
            leaf("Earthing Strip Laying"),
            leaf("Earth Pit Installation"),
            leaf("Lighting / Yard Lighting Installation"),
            leaf("DG System Installation (if applicable)"),
        ]),
    ]),
    node("Testing & Commissioning", [
        node("Pre-Commissioning", [
            leaf("Pre-Commissioning Check"),
        ]),
        node("Equipment Testing", [
            leaf("Insulation Resistance Test"),
            leaf("Transformer Ratio & Winding Resistance Test"),
            leaf("Tan Delta Test"),
            leaf("Transformer Vector Group Test"),
            leaf("Magnetic Balance Test"),
            leaf("CT/PT Testing"),
            leaf("Circuit Breaker Timing Test"),
            leaf("Contact Resistance Test"),
        ]),
        node("Protection Testing", [
            leaf("Relay Testing"),
            leaf("Primary Injection Test"),
            leaf("Secondary Injection Test"),
            leaf("Interlock Testing"),
            leaf("Protection Scheme Verification"),
        ]),
        node("System Testing", [
            leaf("Earthing Resistance Test"),
            leaf("Battery Discharge Test"),
            leaf("DC System Testing"),
            leaf("Fire Alarm/Detection System Testing"),
            leaf("Illumination Level Test"),
            leaf("SCADA Testing"),
            leaf("RTU Communication Testing"),
        ]),
        node("Final Commissioning", [
            leaf("Charging Permission from CEIG / Grid Authority"),
            leaf("Synchronization Check"),
            leaf("Charging"),
            leaf("Trial Run"),
            leaf("Load Trial"),
            leaf("Reliability / Sustained Run"),
            leaf("Final Commissioning"),
        ]),
    ]),
    node("Quality Assurance / Quality Control (QA/QC)", [
        node("Inspection Planning", [
            leaf("Inspection Test Plan (ITP)"),
            leaf("Request for Inspection (RFI)"),
        ]),
        node("Inspection & Verification", [
            leaf("Material Inspection"),
            leaf("Third-Party Inspection (TPI) Coordination"),
            leaf("Concrete Cube Test"),
            leaf("Welding Inspection"),
            leaf("Alignment Inspection"),
            leaf("Torque Verification"),
            leaf("Instrument Calibration Check"),
        ]),
        node("Non-Conformance Management", [
            leaf("Document/QA Record Control"),
            leaf("NCR Generation"),
            leaf("NCR Closure"),
        ]),
    ]),
    node("Safety Management (EHS)", [
        node("Safety Induction & Training", [
            leaf("Safety Induction"),
            leaf("Toolbox Talk"),
        ]),
        node("Safety Procedures & PPE", [
            leaf("PPE Distribution"),
            leaf("Permit to Work System"),
            leaf("Work at Height Safety"),
            leaf("Electrical Safety Procedure"),
        ]),
        node("Emergency & Incident Management", [
            leaf("Fire Safety Arrangement"),
            leaf("Emergency Response Plan"),
            leaf("Accident Reporting"),
        ]),
        node("Environment & Audit", [
            leaf("Environment Monitoring & Waste Management"),
            leaf("Safety Audit"),
        ]),
    ]),
    node("Project Monitoring & Control", [
        node("Progress Reporting", [
            leaf("Daily Progress Report (DPR)"),
            leaf("Weekly Progress Review"),
            leaf("Client Review Meeting"),
        ]),
        node("Schedule & Cost Control", [
            leaf("Schedule Monitoring"),
            leaf("Cost Monitoring"),
            leaf("Billing Milestone Tracking"),
            leaf("Invoice Submission & Approval Cycle"),
            leaf("Delay Analysis"),
            leaf("Recovery Plan"),
        ]),
        node("Change & Document Control", [
            leaf("Change/Variation Order Management"),
            leaf("Document Management System / Drawing Control"),
            leaf("Resource Monitoring"),
        ]),
    ]),
    node("Handover & Documentation", [
        node("Closeout Activities", [
            leaf("Punch Point Closure"),
            leaf("Snag List Clearance"),
        ]),
        node("Documentation", [
            leaf("As-Built Drawings"),
            leaf("O&M Manual"),
            leaf("Warranty Documentation"),
        ]),
        node("Asset Transfer", [
            leaf("Spare Parts Handover"),
            leaf("Client O&M Staff Training"),
        ]),
        node("Project Closure", [
            leaf("Performance Guarantee Test"),
            leaf("Client Inspection"),
            leaf("Completion Certificate"),
            leaf("Final Invoice Submission"),
            leaf("Material Reconciliation (Surplus/Scrap Return)"),
            leaf("Insurance Policy Closure"),
            leaf("Final Sign-Off"),
        ]),
        node("Demobilization & Liability Tracking", [
            leaf("Equipment/Vehicle Demobilization"),
            leaf("Taking Over Certificate (TOC)"),
            leaf("Defect Liability Period (DLP) Tracking Start"),
            leaf("Site Demobilization"),
        ]),
    ]),
]

write_csv("AIS_Substation_WBS.csv", AIS_TREE, "AIS")
print("Done")
