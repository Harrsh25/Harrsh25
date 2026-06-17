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

GIS_TREE = [
    node("Project Initial Activity / Mobilization", [
        node("Contractor Mobilization", [
            leaf("Sub-Contractor Finalization"),
            leaf("Mobilization of Site Team"),
            leaf("Construction Equipment & Vehicle Mobilization"),
        ]),
        node("Site Infrastructure Setup", [
            leaf("Labor Camp / Accommodation Setup"),
            leaf("Site Office Setup"),
            leaf("Site Store/Warehouse Setup"),
            leaf("Site Security Arrangement"),
        ]),
        node("Temporary Utilities & Compliance", [
            leaf("Workmen Insurance / ESI-PF Registration"),
            leaf("Temporary Power/Water Arrangement"),
            leaf("Internet & Communication Setup"),
        ]),
    ]),
    node("Statutory Approvals & Clearances", [
        node("Land & Environmental Approval", [
            leaf("Land Acquisition / Site Handover"),
            leaf("Forest Clearance"),
            leaf("Environmental Clearance"),
            leaf("Pollution Control Board Consent"),
        ]),
        node("Regulatory Approvals", [
            leaf("CEIG Drawing Approval"),
            leaf("Electrical Inspectorate Approval"),
            leaf("CEA Compliance Approval"),
            leaf("SF6 Gas Storage / Explosive License"),
        ]),
        node("Civil & Building Approvals", [
            leaf("Local Authority Approval (GIS Hall)"),
            leaf("Fire Safety Approval"),
            leaf("Aviation/Height Clearance"),
        ]),
        node("Grid & Utility Approval", [
            leaf("Grid Connectivity Approval"),
            leaf("Railway/Highway Crossing Approval"),
            leaf("Telecom/PLCC Frequency Clearance"),
            leaf("Right of Way Approval"),
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
            leaf("Layout Finalization (GIS Hall + Outdoor Yard)"),
        ]),
    ]),
    node("Engineering & Design", [
        node("Primary Electrical Engineering", [
            leaf("Single Line Diagram (SLD)"),
            leaf("GIS Bay Layout"),
            leaf("Bus Duct / Interface Bushing Design"),
            leaf("Metering Scheme Design"),
        ]),
        node("Civil & Structural Engineering", [
            leaf("Building Layout (Indoor GIS Hall)"),
            leaf("GIS Building Layout"),
            leaf("GIS Equipment Foundation Design"),
            leaf("Transformer Yard Foundation Design"),
            leaf("EOT Crane Design"),
        ]),
        node("Protection & System Engineering", [
            node("Protection & Control Design", [
                leaf("Protection Philosophy Design"),
                leaf("Relay Coordination Study"),
                leaf("Interlocking Scheme Design"),
                leaf("Control & Relay Panel Design"),
            ]),
            node("SCADA & Communication Design", [
                leaf("SCADA Architecture Design"),
                leaf("RTU Design"),
            ]),
        ]),
        node("System Studies", [
            leaf("Short Circuit Study"),
            leaf("Load Flow Study"),
            leaf("Insulation Coordination Study"),
        ]),
        node("Auxiliary System Engineering", [
            leaf("Battery Sizing Calculation"),
            leaf("Cable Sizing Calculation"),
            leaf("Cable Trench / Tray Layout"),
            leaf("Cable Schedule Preparation"),
            leaf("Illumination Design"),
            leaf("HVAC Design"),
        ]),
        node("Safety Engineering", [
            leaf("SF6 Gas Zone Monitoring Design"),
            leaf("Earthing Mesh / Faraday Cage Design"),
            leaf("Outdoor Earthing Grid Design"),
            leaf("Lightning Protection Design"),
            leaf("Fire Detection & Suppression Design"),
        ]),
        node("Engineering Documentation", [
            leaf("Drawing Approval Cycle (IFA to IFR to IFC)"),
            leaf("Bill of Quantity (BOQ)"),
            leaf("Bill of Material (BOM)"),
        ]),
    ]),
    node("Procurement Management", [
        node("Vendor Management", [
            leaf("Vendor Identification"),
            leaf("Vendor Finalization"),
            leaf("Vendor Drawing Approval"),
        ]),
        node("Purchase Management", [
            leaf("Purchase Requisition (PR)"),
            leaf("Purchase Order Release"),
        ]),
        node("Manufacturing & Inspection", [
            leaf("TPIA Engagement"),
            leaf("Material Manufacturing Follow-up"),
            leaf("Factory Acceptance Test (FAT)"),
        ]),
        node("Dispatch Management", [
            leaf("Dispatch Clearance"),
            leaf("Customs Clearance (Imported Equipment)"),
            leaf("Logistics Planning"),
            leaf("Transportation Arrangement"),
        ]),
    ]),
    node("Supply / Equipment Procurement", [
        node("GIS Equipment Supply", [
            leaf("GIS Bays"),
            leaf("SF6 Gas & Gas Monitoring System"),
            leaf("SF6 Gas Cylinders"),
            leaf("Gas Density Monitor"),
            leaf("SF6 Recovery Unit"),
            leaf("Local Control Cubicle"),
        ]),
        node("Primary Equipment Supply", [
            leaf("Power Transformer"),
            leaf("Lightning Arrestor"),
            leaf("Bus Duct System"),
        ]),
        node("Control System Supply", [
            leaf("Control & Relay Panels"),
            leaf("SCADA / RTU Panels"),
            leaf("Battery Bank"),
            leaf("Battery Charger"),
            leaf("UPS System"),
            leaf("ACDB/DCDB Panels"),
        ]),
        node("Auxiliary Supply", [
            leaf("HVAC Equipment"),
            leaf("Fire Protection System"),
            leaf("EOT Crane (GIS Hall)"),
            leaf("DG Set"),
            leaf("Tools, Tackles & Spares"),
            leaf("Cable Tray"),
            leaf("Earthing Material"),
            leaf("Power & Control Cables"),
            leaf("Hardware & Connectors"),
        ]),
    ]),
    node("Civil Works", [
        node("Site Preparation", [
            leaf("Site Grading & Leveling"),
            leaf("Excavation Work"),
            leaf("Anti-Termite / Soil Treatment"),
        ]),
        node("Structural Works", [
            leaf("PCC Work"),
            leaf("Reinforcement Work"),
            leaf("RCC Work"),
            leaf("GIS Building Construction"),
            leaf("Dust-proof / Clean Room Provisions for GIS Hall"),
            leaf("Anchor Bolt Fixing"),
            leaf("Transformer Foundation"),
            leaf("Transformer Oil Pit / Containment"),
        ]),
        node("Building Works", [
            leaf("Control Room Building"),
            leaf("Control Room Finishing"),
            leaf("HVAC Room Construction"),
            leaf("Fire Fighting Room"),
        ]),
        node("Fire & Protection Works", [
            leaf("Fire Wall Construction (Transformer Yard to GIS Building)"),
        ]),
        node("Utility Infrastructure", [
            leaf("Cable Basement / Trenches"),
            leaf("Cable Ducting"),
            leaf("Cable Sealing End Yard (if cable-fed)"),
            leaf("Boundary Wall"),
            leaf("Internal Roads"),
            leaf("Access Road / Heavy Unloading Bay (oversized GIS transport)"),
            leaf("Drainage System"),
            leaf("Rainwater Harvesting (if mandated)"),
            leaf("Compound Gates"),
            leaf("Water Supply Arrangement"),
        ]),
    ]),
    node("Erection & Installation", [
        node("GIS Mechanical Installation", [
            leaf("GIS Bay Assembly"),
            leaf("GIS Module Positioning"),
            leaf("Vacuum Drying / Moisture Treatment of GIS Joints (pre-gas-fill)"),
            leaf("SF6 Gas Filling"),
            leaf("Gas Leakage Detection"),
        ]),
        node("Primary Equipment Installation", [
            leaf("Transformer Installation"),
            leaf("Transformer Assembly"),
            leaf("Transformer Oil Filtration"),
            leaf("Bus Duct Installation"),
            leaf("Lightning Arrestor Installation"),
        ]),
        node("Electrical Installation", [
            leaf("Cable Tray Installation"),
            leaf("Power Cable Laying"),
            leaf("Control Cable Laying"),
            leaf("Cable Ferruling & Glanding"),
            leaf("Cable Termination"),
            leaf("Cable Fireproofing & Sealing at Penetrations"),
        ]),
        node("Auxiliary Installation", [
            leaf("Control Panel Installation"),
            leaf("Panel Installation"),
            leaf("Marshalling Box Wiring"),
            leaf("AC/DC Distribution Wiring"),
            leaf("Battery Bank Installation"),
            leaf("Battery Charger Installation"),
            leaf("ACDB/DCDB Installation"),
            leaf("EOT Crane Installation & Testing"),
            leaf("HVAC Installation"),
            leaf("Fire System Installation"),
            leaf("Earthing Installation"),
            leaf("Earthing Strip Laying"),
            leaf("Earth Pit Installation"),
            leaf("Lighting Installation"),
        ]),
    ]),
    node("Testing & Commissioning", [
        node("GIS Testing", [
            leaf("SF6 Gas Quality Test"),
            leaf("SF6 Pressure Test"),
            leaf("SF6 Moisture / Dew Point Test"),
            leaf("Partial Discharge Test"),
            leaf("GIS Mechanical Operation Test"),
        ]),
        node("Equipment Testing", [
            leaf("Insulation Resistance Test"),
            leaf("Transformer Ratio & Winding Resistance Test"),
            leaf("Tan Delta Test"),
            leaf("Transformer Vector Group Test"),
            leaf("Magnetic Balance Test"),
            leaf("Bus Duct Testing"),
            leaf("Lightning Arrestor Testing"),
            leaf("Circuit Breaker Timing Test"),
            leaf("Contact Resistance Test"),
        ]),
        node("Protection & System Testing", [
            leaf("Relay Testing"),
            leaf("Primary Injection Test"),
            leaf("Secondary Injection Test"),
            leaf("Interlock Testing"),
            leaf("Protection Scheme Verification"),
            leaf("SCADA Testing"),
            leaf("RTU Communication Testing"),
        ]),
        node("System Testing", [
            leaf("Earthing Resistance Test"),
            leaf("Battery Discharge Test"),
            leaf("DC System Testing"),
            leaf("HV Cable Testing (VLF/PD Test)"),
            leaf("Fire Alarm/Detection System Testing"),
            leaf("Illumination Level Test"),
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
            leaf("Confined Space Safety"),
            leaf("SF6 Gas Handling Safety"),
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

write_csv("GIS_Substation_WBS.csv", GIS_TREE, "GIS")
print("Done")
