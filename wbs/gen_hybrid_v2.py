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

    prev_level1 = None
    for row in rows:
        if row[0] == prev_level1:
            row[0] = ""
        else:
            prev_level1 = row[0]

    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(HEADER)
        w.writerows(rows)

def leaf(name):
    return {"name": name}

def node(name, children):
    return {"name": name, "children": children}

HYBRID_TREE = [
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
            leaf("SF6 Gas Handling Compliance"),
            leaf("Explosive License (Oil/SF6 Storage)"),
        ]),
        node("Civil & Building Approvals", [
            leaf("Building Plan Approval (GIS Hall)"),
            leaf("Fire Safety Approval"),
            leaf("Local Authority Approval"),
        ]),
        node("Grid & Utility Approval", [
            leaf("Grid Connectivity Approval"),
            leaf("Right of Way Approval"),
            leaf("Aviation/Height Clearance"),
            leaf("Railway/Highway Crossing Approval"),
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
            leaf("AIS Yard Layout Finalization"),
            leaf("GIS Building Layout Finalization"),
            leaf("Hybrid Layout Approval"),
        ]),
    ]),
    node("Engineering & Design", [
        node("AIS Engineering", [
            leaf("Outdoor Bus Bar Layout Design"),
            leaf("Gantry Structure Design"),
            leaf("AIS Equipment Foundation Design"),
            leaf("Outdoor Equipment Layout"),
            leaf("Lightning Arrestor Layout"),
        ]),
        node("GIS Engineering", [
            leaf("GIS Bay Layout Design"),
            leaf("Indoor GIS Hall Layout"),
            leaf("GIS Foundation Design"),
            leaf("SF6 Gas Zone Design"),
            leaf("Gas Monitoring Design"),
            leaf("GIS Hall Earthing Mesh / Faraday Cage Design"),
            leaf("EOT Crane Design"),
        ]),
        node("Interface Engineering", [
            leaf("AIS-GIS Interface Bay Design"),
            leaf("Bus Duct Design"),
            leaf("Interface Bushing Design"),
            leaf("AIS-GIS Interconnection Layout"),
            leaf("Interface Protection Coordination Study"),
        ]),
        node("Protection & Control Engineering", [
            node("Power System Studies", [
                leaf("Single Line Diagram (SLD)"),
                leaf("Short Circuit Study"),
                leaf("Load Flow Study"),
                leaf("Insulation Coordination Study"),
            ]),
            node("Protection & SCADA Design", [
                leaf("Protection Philosophy Design"),
                leaf("Relay Coordination Study"),
                leaf("Interlocking Scheme Design"),
                leaf("Control & Relay Panel Layout"),
                leaf("SCADA Architecture Design"),
                leaf("RTU Design"),
                leaf("Metering Scheme Design"),
            ]),
        ]),
        node("Auxiliary Engineering", [
            leaf("Cable Trench Design"),
            leaf("Cable Tray Layout"),
            leaf("Cable Schedule Preparation"),
            leaf("Battery Sizing Calculation"),
            leaf("Cable Sizing Calculation"),
            leaf("Earthing Design"),
            leaf("Lightning Protection Design"),
            leaf("HVAC Design"),
            leaf("Fire Protection Design"),
            leaf("Auxiliary AC/DC Distribution Design"),
            leaf("DG Backup Design"),
            leaf("Lighting Design"),
        ]),
        node("Engineering Documentation", [
            leaf("BOQ Preparation"),
            leaf("BOM Preparation"),
            leaf("Drawing Approval Process"),
        ]),
    ]),
    node("Procurement & Supply", [
        node("Procurement Management", [
            leaf("Vendor Finalization"),
            leaf("Vendor Drawing Approval"),
            leaf("TPIA Engagement"),
            leaf("Purchase Requisition (PR)"),
            leaf("Purchase Order Release"),
            leaf("Manufacturing Follow-up"),
            leaf("Factory Acceptance Test (FAT)"),
            leaf("Dispatch Clearance"),
            leaf("Customs Clearance (Imported Equipment)"),
            leaf("Logistics Planning"),
            leaf("Transportation Arrangement"),
        ]),
        node("AIS Equipment Supply", [
            leaf("Circuit Breaker"),
            leaf("Current Transformer (CT)"),
            leaf("Potential Transformer (PT/CVT)"),
            leaf("Isolator"),
            leaf("Lightning Arrestor"),
            leaf("Bus Bar / Conductors"),
            leaf("Structures / Gantry"),
        ]),
        node("GIS Equipment Supply", [
            leaf("GIS Switchgear Assembly"),
            leaf("SF6 Gas Cylinders"),
            leaf("Gas Density Monitor"),
            leaf("SF6 Recovery Unit"),
            leaf("GIS Bus Enclosure"),
            leaf("Local Control Cubicle"),
        ]),
        node("Interface Equipment Supply", [
            leaf("Bus Duct"),
            leaf("Interface Bushings"),
            leaf("Interface Connectors"),
        ]),
        node("Common Equipment Supply", [
            leaf("Power Transformer"),
            leaf("Control & Relay Panels"),
            leaf("SCADA / RTU Panels"),
            leaf("Battery Bank"),
            leaf("Battery Charger"),
            leaf("UPS System"),
            leaf("ACDB/DCDB Panels"),
            leaf("Earthing Material"),
            leaf("HVAC Equipment"),
            leaf("Fire Protection System"),
            leaf("EOT Crane (GIS Hall)"),
            leaf("Tools, Tackles & Spares"),
            leaf("DG System (if applicable)"),
            leaf("Cables"),
        ]),
    ]),
    node("Civil Works", [
        node("AIS Civil Works", [
            leaf("Site Grading & Leveling"),
            leaf("Excavation Work"),
            leaf("Anti-Termite / Soil Treatment"),
            leaf("PCC Work"),
            leaf("Reinforcement Work"),
            leaf("RCC Work"),
            leaf("AIS Equipment Foundations"),
            leaf("Gantry Foundations"),
            leaf("Yard Gravelling"),
        ]),
        node("GIS Civil Works", [
            leaf("GIS Building Construction"),
            leaf("Dust-proof / Clean Room Provisions for GIS Hall"),
            leaf("Indoor GIS Foundation Work"),
            leaf("HVAC Room Construction"),
            leaf("Fire Fighting Room Construction"),
            leaf("Access Road / Heavy Unloading Bay (oversized GIS transport)"),
            leaf("Internal Building Finishing"),
        ]),
        node("Interface Civil Works", [
            leaf("Interface Bay Foundation"),
            leaf("Bus Duct Support Foundation"),
            leaf("Interface Cable Trench / Duct"),
        ]),
        node("Common Infrastructure", [
            leaf("Anti-Termite / Soil Treatment (Common Areas)"),
            leaf("Transformer Foundation"),
            leaf("Transformer Oil Pit"),
            leaf("Plinth Protection"),
            leaf("Fire Wall Construction"),
            leaf("Control Room Building"),
            leaf("Cable Basement / Trenches"),
            leaf("Cable Sealing End Yard (if cable-fed)"),
            leaf("Boundary Wall"),
            leaf("Internal Roads"),
            leaf("Drainage System"),
            leaf("Rainwater Harvesting (if mandated)"),
            leaf("Compound Gates"),
            leaf("Water Supply Arrangement"),
        ]),
    ]),
    node("Erection & Installation", [
        node("AIS Equipment Installation", [
            leaf("Gantry Structure Erection"),
            leaf("Alignment Checking"),
            leaf("Bolt Tightening"),
            leaf("Galvanization Touch-up / Painting"),
            leaf("Structural Inspection"),
            leaf("Circuit Breaker Installation"),
            leaf("CT Installation"),
            leaf("PT Installation"),
            leaf("Isolator Installation"),
            leaf("Lightning Arrestor Installation"),
            leaf("Bus Bar Erection"),
            leaf("Jumper Connection"),
            leaf("Connector Installation"),
        ]),
        node("GIS Equipment Installation", [
            leaf("GIS Bay Assembly"),
            leaf("GIS Module Positioning"),
            leaf("GIS Alignment Check"),
            leaf("Bolting & Torque Tightening"),
            leaf("Vacuum Drying / Moisture Treatment of GIS Joints (pre-gas-fill)"),
            leaf("SF6 Gas Filling"),
            leaf("Gas Density Monitoring Setup"),
            leaf("Gas Leakage Detection"),
            leaf("EOT Crane Installation & Testing"),
        ]),
        node("Interface Installation", [
            leaf("AIS-GIS Interface Bay Connection"),
            leaf("Bus Duct Installation"),
            leaf("Interface Connector Installation"),
            leaf("AIS-GIS Mechanical Alignment"),
            leaf("Interconnection Torque Verification"),
            leaf("Interface Earthing Check"),
        ]),
        node("Common Electrical Installation", [
            leaf("Transformer Installation"),
            leaf("Transformer Assembly"),
            leaf("Transformer Oil Filtration"),
            leaf("Control Panel Installation"),
            leaf("Marshalling Box Wiring"),
            leaf("AC/DC Distribution Wiring"),
            leaf("Cable Tray Installation"),
            leaf("Power Cable Laying"),
            leaf("Control Cable Laying"),
            leaf("Cable Ferruling & Glanding"),
            leaf("Cable Termination"),
            leaf("Cable Fireproofing & Sealing at Penetrations"),
            leaf("Earthing Installation"),
            leaf("Earthing Strip Laying"),
            leaf("Earth Pit Installation"),
            leaf("Battery Bank Installation"),
            leaf("Battery Charger Installation"),
            leaf("UPS Installation"),
            leaf("ACDB/DCDB Installation"),
            leaf("Lighting Installation"),
            leaf("Fiber Optic / PLCC Cable Laying"),
            leaf("DG Installation (if applicable)"),
        ]),
    ]),
    node("Testing & Commissioning", [
        node("AIS Equipment Testing", [
            leaf("Transformer Testing"),
            leaf("CT/PT Testing"),
            leaf("Circuit Breaker Testing"),
            leaf("Contact Resistance Test"),
            leaf("Bus Bar Testing"),
        ]),
        node("GIS Equipment Testing", [
            leaf("SF6 Gas Quality Test"),
            leaf("SF6 Pressure Test"),
            leaf("SF6 Leakage Test"),
            leaf("SF6 Dew Point Test"),
            leaf("Partial Discharge Test"),
            leaf("GIS Mechanical Operation Test"),
        ]),
        node("Interface Testing", [
            leaf("AIS-GIS Continuity Test"),
            leaf("Bus Duct Testing"),
            leaf("Interface Connection Testing"),
            leaf("Mechanical Alignment Verification"),
            leaf("Interface Protection Scheme Testing"),
        ]),
        node("Protection & System Testing", [
            leaf("Relay Testing"),
            leaf("Primary Injection Test"),
            leaf("Secondary Injection Test"),
            leaf("Interlock Testing"),
            leaf("Protection Scheme Verification"),
            leaf("Phasing / Vector Group Verification"),
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
            leaf("AIS Section Charging"),
            leaf("GIS Section Charging"),
            leaf("Transformer Charging"),
            leaf("Charging"),
            leaf("Integrated System Testing"),
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
            leaf("Interface Management Between AIS & GIS Contractors"),
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

write_csv("Hybrid_Substation_WBS.csv", HYBRID_TREE, "Hybrid")
print("Done")
