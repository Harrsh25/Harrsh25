import csv

ASSIGN = "Harsh,Shruti"
TIMELINE = "25-Dec-2025|07-Jun-2026"
HEADER = ["Level1_Name","Level1_Desc","Level2_Name","Level2_Desc","Level3_Name","Level3_Desc",
          "Level4_Name","Level4_Desc","Level5_Name","Level5_Desc","Assign_To","Timeline","Weight",
          "Substation_Type","Leaf_Node_Progress_Type"]

def write_csv(path, tree, sub_type):
    rows = []

    def emit(path_names, is_leaf):
        # path_names: list of up to 5 names, in order, padded with ""
        names = path_names + [""] * (5 - len(path_names))
        row = []
        for n in names:
            row.append(n)
            row.append("")  # Desc always blank, matching source file style
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

    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(HEADER)
        w.writerows(rows)

def leaf(name):
    return {"name": name}

def node(name, children):
    return {"name": name, "children": children}

# ---------- Common reusable blocks ----------

PRE_PROJECT = node("Pre-Project / Contract Award Phase", [
    leaf("Tender/Bid Submission"),
    leaf("Technical Bid Evaluation"),
    leaf("Commercial Bid Evaluation"),
    leaf("Letter of Award (LOA) / Purchase Order"),
    leaf("Contract Agreement Signing"),
    leaf("Bank Guarantee (ABG/PBG) Submission"),
    leaf("Letter of Credit (LC) Opening"),
    leaf("Insurance Arrangement (CAR/EAR Policy)"),
    leaf("Scope Finalization"),
    leaf("Budget Finalization"),
    leaf("Baseline Schedule Preparation (Primavera/MSP)"),
    leaf("Project Kickoff Meeting"),
    leaf("Risk Assessment & Resource Planning"),
])

MOBILIZATION = node("Project Initial Activity / Mobilization", [
    leaf("Sub-Contractor Finalization"),
    leaf("Mobilization of Site Team"),
    leaf("Construction Equipment & Vehicle Mobilization"),
    leaf("Labor Camp / Accommodation Setup"),
    leaf("Workmen Insurance / ESI-PF Registration"),
    leaf("Site Office Setup"),
    leaf("Site Store/Warehouse Setup"),
    leaf("Temporary Power/Water Arrangement"),
    leaf("Internet & Communication Setup"),
    leaf("Site Security Arrangement"),
])

STATUTORY_AIS = node("Statutory Approvals & Clearances", [
    leaf("Land Acquisition / Site Handover"),
    leaf("Forest Clearance (if applicable)"),
    leaf("Environmental Clearance"),
    leaf("Pollution Control Board Consent (CTE/CTO)"),
    leaf("Explosive License (Oil Storage)"),
    leaf("Local Authority Approval"),
    leaf("Fire Safety Approval"),
    leaf("CEIG Drawing Approval"),
    leaf("Electrical Inspectorate Approval"),
    leaf("Grid Connectivity Approval"),
    leaf("CEA Compliance Approval"),
    leaf("Aviation/Height Clearance (if near airport)"),
    leaf("Railway/Highway Crossing Approval (if applicable)"),
    leaf("Telecom/PLCC Frequency Clearance"),
    leaf("Right of Way Approval (if applicable)"),
])

QAQC = node("Quality Assurance / Quality Control (QA/QC)", [
    leaf("Inspection Test Plan (ITP)"),
    leaf("Request for Inspection (RFI)"),
    leaf("Material Inspection"),
    leaf("Third-Party Inspection (TPI) Coordination"),
    leaf("Concrete Cube Test"),
    leaf("Welding Inspection"),
    leaf("Alignment Inspection"),
    leaf("Torque Verification"),
    leaf("Instrument Calibration Check"),
    leaf("Document/QA Record Control"),
    leaf("NCR Generation"),
    leaf("NCR Closure"),
])

SAFETY_AIS = node("Safety Management (EHS)", [
    leaf("Safety Induction"),
    leaf("Toolbox Talk"),
    leaf("PPE Distribution"),
    leaf("Permit to Work System"),
    leaf("Work at Height Safety"),
    leaf("Electrical Safety Procedure"),
    leaf("Fire Safety Arrangement"),
    leaf("Emergency Response Plan"),
    leaf("Accident Reporting"),
    leaf("Environment Monitoring & Waste Management"),
    leaf("Safety Audit"),
])

MONITORING = node("Project Monitoring & Control", [
    leaf("Daily Progress Report (DPR)"),
    leaf("Weekly Progress Review"),
    leaf("Client Review Meeting"),
    leaf("Schedule Monitoring"),
    leaf("Cost Monitoring"),
    leaf("Billing Milestone Tracking"),
    leaf("Invoice Submission & Approval Cycle"),
    leaf("Delay Analysis"),
    leaf("Recovery Plan"),
    leaf("Change/Variation Order Management"),
    leaf("Interface Management Between Disciplines"),
    leaf("Document Management System / Drawing Control"),
    leaf("Resource Monitoring"),
])

CLOSEOUT = node("Handover & Project Closeout", [
    leaf("Punch Point Closure"),
    leaf("Snag List Clearance"),
    leaf("As-Built Drawings"),
    leaf("O&M Manual Preparation"),
    leaf("Client O&M Staff Training"),
    leaf("Spare Parts Handover"),
    leaf("Warranty Documentation"),
    leaf("Performance Guarantee Test"),
    leaf("Final Client Inspection"),
    leaf("Completion Certificate"),
    leaf("Final Invoice Submission"),
    leaf("Material Reconciliation (Surplus/Scrap Return)"),
    leaf("Equipment/Vehicle Demobilization"),
    leaf("Insurance Policy Closure"),
    leaf("Taking Over Certificate (TOC)"),
    leaf("Defect Liability Period (DLP) Tracking Start"),
    leaf("Client Sign-off"),
    leaf("Site Demobilization"),
])

COMMISSIONING = node("Commissioning", [
    leaf("Final Pre-Commissioning Check"),
    leaf("Charging Permission from CEIG / Grid Authority"),
    leaf("Synchronization Check"),
    leaf("Line Charging"),
    leaf("Transformer Charging"),
    leaf("Bus Charging"),
    leaf("Joint Commissioning with State/Central Grid Control"),
    leaf("Trial Run"),
    leaf("Load Trial"),
    leaf("Reliability / Sustained Run"),
    leaf("Final Energization"),
])

# ---------- AIS specific ----------

AIS_SURVEY = node("Survey & Soil Investigation", [
    leaf("Topographical Survey"),
    leaf("Benchmark Fixing"),
    leaf("Grid Coordinate Survey"),
    leaf("Underground Utility Detection"),
    leaf("Soil Investigation"),
    leaf("Bore Log Analysis"),
    leaf("Geo-Technical Test"),
    leaf("Soil Resistivity Test"),
    leaf("Hydrological / Flood Level Study"),
    leaf("Climatic Data Collection"),
    leaf("Layout Finalization"),
])

AIS_ENGINEERING = node("Engineering & Design", [
    leaf("Single Line Diagram (SLD)"),
    leaf("General Arrangement (GA) Drawing"),
    leaf("Bus Bar Layout Design"),
    leaf("Equipment Layout Design"),
    leaf("Structure Design"),
    leaf("Foundation Design"),
    leaf("Earthing Design"),
    leaf("Earth Grid GPR (Ground Potential Rise) Study"),
    leaf("Lightning Protection Design"),
    leaf("Protection Philosophy Design"),
    leaf("Relay Coordination Study"),
    leaf("Short Circuit Study"),
    leaf("Load Flow Study"),
    leaf("Insulation Coordination Study"),
    leaf("Interlocking Scheme Design"),
    leaf("Control & Relay Panel Design"),
    leaf("Battery Sizing Calculation"),
    leaf("Cable Sizing Calculation"),
    leaf("Cable Tray Layout"),
    leaf("Cable Schedule Preparation"),
    leaf("SCADA Architecture Design"),
    leaf("RTU Design"),
    leaf("Metering Scheme Design"),
    leaf("Illumination Design"),
    leaf("HVAC Design (Control Room)"),
    leaf("Fire Fighting System Design"),
    leaf("Drawing Approval Cycle (IFA to IFR to IFC)"),
    leaf("Bill of Quantity (BOQ)"),
    leaf("Bill of Material (BOM)"),
])

PROCUREMENT_AIS = node("Procurement Management", [
    leaf("Vendor Identification"),
    leaf("Vendor Finalization"),
    leaf("Purchase Requisition (PR)"),
    leaf("Purchase Order Release"),
    leaf("Vendor Drawing Approval"),
    leaf("Third-Party Inspection Agency (TPIA) Engagement"),
    leaf("Material Manufacturing Follow-up"),
    leaf("Factory Acceptance Test (FAT)"),
    leaf("Dispatch Clearance"),
    leaf("Customs Clearance (Imported Equipment)"),
    leaf("Logistics Planning"),
    leaf("Transportation Arrangement"),
])

SUPPLY_AIS = node("Supply / Equipment Procurement", [
    leaf("Power Transformer"),
    leaf("Circuit Breaker"),
    leaf("Isolator"),
    leaf("Current Transformer (CT)"),
    leaf("Potential Transformer (PT/CVT)"),
    leaf("Lightning Arrestor (LA)"),
    leaf("Bus Bar / Conductor"),
    leaf("Insulators"),
    leaf("Structures (Gantry, Support)"),
    leaf("Control & Relay Panels"),
    leaf("SCADA Panels / RTU"),
    leaf("Battery Bank"),
    leaf("Battery Charger"),
    leaf("UPS System"),
    leaf("ACDB/DCDB Panels"),
    leaf("Earthing Material"),
    leaf("Cable Tray"),
    leaf("Power Cables"),
    leaf("Control Cables"),
    leaf("Fire Fighting System Equipment"),
    leaf("HVAC Equipment"),
    leaf("DG Set"),
    leaf("Tools, Tackles & Spares"),
    leaf("Hardware & Connectors"),
])

MATERIAL_MGMT = node("Material Receipt & Inventory Management", [
    leaf("Material Receipt at Site"),
    leaf("Unloading Activity"),
    leaf("Material Inspection Report (MIR)"),
    leaf("Quantity Verification"),
    leaf("Damage Inspection"),
    leaf("Storage Management"),
    leaf("Inventory Tracking"),
    leaf("Preservation of Equipment"),
])

CIVIL_AIS = node("Civil Works", [
    leaf("Site Grading & Leveling"),
    leaf("Excavation Work"),
    leaf("Anti-Termite / Soil Treatment"),
    leaf("PCC Work"),
    leaf("Reinforcement Work"),
    leaf("RCC Work"),
    leaf("Anchor Bolt Fixing"),
    leaf("Equipment Foundations"),
    leaf("Structure Foundations"),
    leaf("Transformer Foundation"),
    leaf("Transformer Oil Pit Construction"),
    leaf("Fire Wall Construction"),
    leaf("Plinth Protection"),
    leaf("Control Room Building"),
    leaf("Control Room Finishing"),
    leaf("Cable Trenches"),
    leaf("Cable Ducting"),
    leaf("Drainage System"),
    leaf("Rainwater Harvesting (if mandated)"),
    leaf("Boundary Wall"),
    leaf("Compound Gates"),
    leaf("Internal Roads"),
    leaf("Yard Gravelling"),
    leaf("Water Supply Arrangement"),
])

STRUCTURAL_ERECTION = node("Structural Erection", [
    leaf("Gantry Structure Erection"),
    leaf("Equipment Support Structure Erection"),
    leaf("Bus Support Structure Erection"),
    leaf("Alignment Checking"),
    leaf("Bolt Tightening"),
    leaf("Galvanization Touch-up / Painting"),
    leaf("Structural Inspection"),
])

EQUIPMENT_INSTALL_AIS = node("Equipment Installation", [
    leaf("Transformer Installation"),
    leaf("Transformer Assembly"),
    leaf("Transformer Oil Filtration"),
    leaf("Circuit Breaker Installation"),
    leaf("Isolator Installation"),
    leaf("CT Installation"),
    leaf("PT/CVT Installation"),
    leaf("Lightning Arrestor Installation"),
    leaf("Battery Bank Installation"),
    leaf("Battery Charger Installation"),
    leaf("ACDB/DCDB Installation"),
    leaf("Panel Installation"),
])

ELECTRICAL_INSTALL_AIS = node("Electrical Installation", [
    leaf("Bus Bar Erection/Stringing"),
    leaf("Jumper Connection"),
    leaf("Clamp Installation"),
    leaf("Connector Installation"),
    leaf("Cable Tray Installation"),
    leaf("Power Cable Laying"),
    leaf("Control Cable Laying"),
    leaf("Cable Ferruling"),
    leaf("Cable Glanding"),
    leaf("Cable Termination"),
    leaf("Cable Fireproofing & Sealing at Penetrations"),
    leaf("Marshalling Box Wiring"),
    leaf("Panel Internal Wiring"),
    leaf("AC/DC Distribution Wiring"),
    leaf("Earthing Installation"),
    leaf("Earthing Strip Laying"),
    leaf("Earth Pit Installation"),
    leaf("Lighting Installation"),
    leaf("Yard/Street Lighting Wiring"),
    leaf("Fiber Optic / PLCC Cable Laying"),
    leaf("DG System Installation (if applicable)"),
])

TESTING_AIS = node("Testing & Pre-Commissioning", [
    leaf("Insulation Resistance Test"),
    leaf("Transformer Ratio Test"),
    leaf("Winding Resistance Test"),
    leaf("Tan Delta Test"),
    leaf("Transformer Vector Group Test"),
    leaf("Magnetic Balance Test"),
    leaf("CT Testing"),
    leaf("PT/CVT Testing"),
    leaf("Circuit Breaker Timing Test"),
    leaf("Contact Resistance Test"),
    leaf("Relay Testing"),
    leaf("Primary Injection Test"),
    leaf("Secondary Injection Test"),
    leaf("Interlock Testing"),
    leaf("Earthing Resistance Test"),
    leaf("Earth Grid GPR Measurement"),
    leaf("HV Cable Testing (VLF/PD Test)"),
    leaf("Battery Discharge Test"),
    leaf("DC System Testing"),
    leaf("Fire Alarm/Detection System Testing"),
    leaf("Illumination Level Test"),
    leaf("Phasing / Vector Group Verification"),
    leaf("SCADA Testing"),
    leaf("RTU Communication Testing"),
    leaf("Protection Scheme Verification"),
])

AIS_TREE = [
    PRE_PROJECT, MOBILIZATION, STATUTORY_AIS, AIS_SURVEY, AIS_ENGINEERING,
    PROCUREMENT_AIS, SUPPLY_AIS, MATERIAL_MGMT, CIVIL_AIS, STRUCTURAL_ERECTION,
    EQUIPMENT_INSTALL_AIS, ELECTRICAL_INSTALL_AIS, QAQC, SAFETY_AIS, TESTING_AIS,
    COMMISSIONING, MONITORING, CLOSEOUT,
]

write_csv("AIS_Substation_WBS.csv", AIS_TREE, "AIS")

# ---------- GIS specific ----------

STATUTORY_GIS = node("Statutory Approvals & Clearances", [
    leaf("Land Acquisition / Site Handover"),
    leaf("Forest Clearance (if applicable)"),
    leaf("Environmental Clearance"),
    leaf("Pollution Control Board Consent (CTE/CTO)"),
    leaf("SF6 Gas Storage / Explosive License"),
    leaf("Local Authority Approval (Building Plan Sanction for GIS Hall)"),
    leaf("Fire Safety Approval"),
    leaf("CEIG Drawing Approval"),
    leaf("Electrical Inspectorate Approval"),
    leaf("Grid Connectivity Approval"),
    leaf("CEA Compliance Approval"),
    leaf("Aviation/Height Clearance (if near airport)"),
    leaf("Railway/Highway Crossing Approval (if applicable)"),
    leaf("Telecom/PLCC Frequency Clearance"),
    leaf("Right of Way Approval (if applicable)"),
])

GIS_SURVEY = node("Survey & Soil Investigation", [
    leaf("Topographical Survey (smaller footprint than AIS)"),
    leaf("Benchmark Fixing"),
    leaf("Grid Coordinate Survey"),
    leaf("Underground Utility Detection"),
    leaf("Soil Investigation"),
    leaf("Bore Log Analysis"),
    leaf("Geo-Technical Test"),
    leaf("Soil Resistivity Test"),
    leaf("Hydrological / Flood Level Study"),
    leaf("Climatic Data Collection"),
    leaf("Layout Finalization (GIS Hall + Outdoor Yard)"),
])

GIS_ENGINEERING = node("Engineering & Design", [
    leaf("Single Line Diagram (SLD)"),
    leaf("GIS Bay Layout (Single/Double Bus)"),
    leaf("Building Layout (Indoor GIS Hall)"),
    leaf("Foundation Design (GIS equipment-specific, lighter loads)"),
    leaf("Transformer Yard Foundation Design (outdoor, heavier loads)"),
    leaf("SF6 Gas Zone & Monitoring Design"),
    leaf("Bus Duct / Interface Bushing Design (SF6-to-oil interface)"),
    leaf("GIS Hall Earthing Mesh / Faraday Cage Design"),
    leaf("Outdoor Earthing & Earth Grid Design"),
    leaf("Lightning Protection Design"),
    leaf("Protection Philosophy Design"),
    leaf("Relay Coordination Study"),
    leaf("Short Circuit Study"),
    leaf("Load Flow Study"),
    leaf("Insulation Coordination Study"),
    leaf("Interlocking Scheme Design"),
    leaf("Control & Relay Panel Design"),
    leaf("Battery Sizing Calculation"),
    leaf("Cable Sizing Calculation"),
    leaf("Cable Trench / Tray Layout"),
    leaf("Cable Schedule Preparation"),
    leaf("SCADA Architecture Design"),
    leaf("RTU Design"),
    leaf("Metering Scheme Design"),
    leaf("EOT Crane Design (for GIS module handling inside hall)"),
    leaf("Illumination Design"),
    leaf("HVAC Design (GIS Hall & Control Room)"),
    leaf("Fire Detection & Suppression System Design"),
    leaf("Drawing Approval Cycle (IFA to IFR to IFC)"),
    leaf("Bill of Quantity (BOQ)"),
    leaf("Bill of Material (BOM)"),
])

PROCUREMENT_GIS = node("Procurement Management", [
    leaf("Vendor Identification"),
    leaf("Vendor Finalization"),
    leaf("Purchase Requisition (PR)"),
    leaf("Purchase Order Release"),
    leaf("Vendor Drawing Approval"),
    leaf("Third-Party Inspection Agency (TPIA) Engagement"),
    leaf("Material Manufacturing Follow-up"),
    leaf("Factory Acceptance Test (FAT) - Type & Routine Tests for GIS Bays"),
    leaf("Dispatch Clearance"),
    leaf("Customs Clearance (Imported Equipment)"),
    leaf("Logistics Planning (Oversized Cargo Handling)"),
    leaf("Transportation Arrangement"),
])

SUPPLY_GIS = node("Supply / Equipment Procurement", [
    leaf("GIS Switchgear (Bus bar, CB, CT, PT, Isolator, Earth Switch - SF6 encapsulated)"),
    leaf("Power Transformers (outdoor, oil-filled)"),
    leaf("SF6 Gas & Gas Monitoring System"),
    leaf("SF6 Gas Cylinders & Storage Equipment"),
    leaf("GIS-Transformer Bus Duct / Cable Connections"),
    leaf("Lightning Arrestors"),
    leaf("Control & Relay Panels (Protection, SCADA, RTU)"),
    leaf("ACDB/DCDB Panels"),
    leaf("Battery Bank & DC System"),
    leaf("Battery Charger"),
    leaf("UPS System"),
    leaf("EOT Crane (GIS Hall)"),
    leaf("HVAC Equipment"),
    leaf("Fire Detection & Suppression System"),
    leaf("DG Set"),
    leaf("Tools, Tackles & Spares"),
    leaf("Cable Tray"),
    leaf("Power Cables"),
    leaf("Control Cables"),
    leaf("Earthing Material"),
    leaf("Hardware & Connectors"),
])

CIVIL_GIS = node("Civil Works", [
    leaf("Site Grading & Leveling"),
    leaf("Excavation Work"),
    leaf("Anti-Termite / Soil Treatment"),
    leaf("PCC Work"),
    leaf("Reinforcement Work"),
    leaf("RCC Work"),
    leaf("GIS Building Construction (RCC Structure)"),
    leaf("Dust-proof / Clean Room Provisions for GIS Hall"),
    leaf("Equipment Foundation (inside GIS Hall)"),
    leaf("Anchor Bolt Fixing"),
    leaf("Transformer Yard Foundation (outdoor)"),
    leaf("Transformer Oil Pit / Oil Containment"),
    leaf("Fire Wall (between Transformer Yard & GIS Building)"),
    leaf("Control Room Building"),
    leaf("Control Room Finishing"),
    leaf("Cable Basement / Trenches"),
    leaf("Cable Ducting"),
    leaf("HVAC Room & Fire Fighting System Civil"),
    leaf("Drainage System"),
    leaf("Rainwater Harvesting (if mandated)"),
    leaf("Boundary Wall"),
    leaf("Compound Gates"),
    leaf("Access Road / Heavy Unloading Bay (oversized GIS module transport)"),
    leaf("Internal Roads"),
    leaf("Cable Sealing End Yard (if cable-fed)"),
    leaf("Water Supply Arrangement"),
])

STRUCTURAL_ERECTION_GIS = node("Structural Erection", [
    leaf("Transformer Support Structure Erection (outdoor)"),
    leaf("Lightning Arrestor Support Structure Erection"),
    leaf("Outdoor Gantry/Bus Support Structure Erection (yard side)"),
    leaf("Alignment Checking"),
    leaf("Bolt Tightening"),
    leaf("Galvanization Touch-up / Painting"),
    leaf("Structural Inspection"),
])

EQUIPMENT_INSTALL_GIS = node("Equipment Installation", [
    leaf("GIS Bay Assembly & Erection (factory-assembled modules)"),
    leaf("Vacuum Drying / Moisture Treatment of GIS Joints (pre-gas-fill)"),
    leaf("SF6 Gas Filling & Leak Testing"),
    leaf("Transformer Installation (outdoor yard)"),
    leaf("Transformer Assembly"),
    leaf("Transformer Oil Filtration"),
    leaf("Bus Duct / Cable Connection (GIS to Transformer)"),
    leaf("Lightning Arrestor Installation"),
    leaf("Battery Bank Installation"),
    leaf("Battery Charger Installation"),
    leaf("ACDB/DCDB Installation"),
    leaf("EOT Crane Installation & Testing"),
    leaf("Panel Installation"),
])

ELECTRICAL_INSTALL_GIS = node("Electrical Installation", [
    leaf("Control Panel Installation & Internal Wiring"),
    leaf("Cable Tray Installation"),
    leaf("Power Cable Laying"),
    leaf("Control Cable Laying"),
    leaf("Cable Ferruling"),
    leaf("Cable Glanding"),
    leaf("Cable Termination (incl. Outdoor Sealing Ends)"),
    leaf("Cable Fireproofing & Sealing at Penetrations"),
    leaf("Marshalling Box Wiring"),
    leaf("AC/DC Distribution Wiring"),
    leaf("Earthing Installation (GIS Hall Mesh + Outdoor Grid)"),
    leaf("Earthing Strip Laying"),
    leaf("Earth Pit Installation"),
    leaf("HVAC & Fire System Installation"),
    leaf("Lighting Installation (GIS Hall + Yard)"),
    leaf("DG System Installation"),
])

TESTING_GIS = node("Testing & Pre-Commissioning", [
    leaf("SF6 Gas Quality & Pressure Test"),
    leaf("SF6 Gas Moisture / Dew Point Test"),
    leaf("Partial Discharge (PD) Test"),
    leaf("Insulation Resistance Test"),
    leaf("Transformer Ratio Test"),
    leaf("Winding Resistance Test"),
    leaf("Tan Delta Test"),
    leaf("Transformer Vector Group Test"),
    leaf("Magnetic Balance Test"),
    leaf("CT Testing"),
    leaf("PT/CVT Testing"),
    leaf("Circuit Breaker Timing Test"),
    leaf("Contact Resistance Test"),
    leaf("Relay Testing"),
    leaf("Primary Injection Test"),
    leaf("Secondary Injection Test"),
    leaf("Interlock Testing"),
    leaf("Earthing Resistance Test"),
    leaf("Battery Discharge Test"),
    leaf("DC System Testing"),
    leaf("HV Cable Testing (VLF/PD Test)"),
    leaf("Fire Alarm/Detection System Testing"),
    leaf("Illumination Level Test"),
    leaf("Phasing / Vector Group Verification"),
    leaf("SCADA Testing"),
    leaf("RTU Communication Testing"),
    leaf("Protection Scheme Verification"),
])

GIS_TREE = [
    PRE_PROJECT, MOBILIZATION, STATUTORY_GIS, GIS_SURVEY, GIS_ENGINEERING,
    PROCUREMENT_GIS, SUPPLY_GIS, MATERIAL_MGMT, CIVIL_GIS, STRUCTURAL_ERECTION_GIS,
    EQUIPMENT_INSTALL_GIS, ELECTRICAL_INSTALL_GIS, QAQC, SAFETY_AIS, TESTING_GIS,
    COMMISSIONING, MONITORING, CLOSEOUT,
]

write_csv("GIS_Substation_WBS.csv", GIS_TREE, "GIS")

# ---------- Hybrid specific ----------

PRE_PROJECT_HYBRID = node("Pre-Project / Contract Award Phase", [
    leaf("Tender/Bid Submission"),
    leaf("Technical Bid Evaluation"),
    leaf("Commercial Bid Evaluation"),
    leaf("Letter of Award (LOA) / Purchase Order"),
    leaf("Contract Agreement Signing"),
    leaf("AIS-GIS Scope & Responsibility Matrix (interface boundary definition)"),
    leaf("Bank Guarantee (ABG/PBG) Submission"),
    leaf("Letter of Credit (LC) Opening"),
    leaf("Insurance Arrangement (CAR/EAR, Marine/Transit)"),
    leaf("Scope Finalization"),
    leaf("Budget Finalization"),
    leaf("Baseline Schedule Preparation (Primavera/MS Project)"),
    leaf("Project Kickoff Meeting"),
    leaf("Risk Assessment & Resource Planning"),
])

STATUTORY_HYBRID = node("Statutory Approvals & Clearances", [
    leaf("Land Acquisition / Site Handover"),
    leaf("Environmental Clearance"),
    leaf("Pollution Control Board Consent (CTE/CTO)"),
    leaf("Explosive License (Oil/SF6 Storage)"),
    leaf("Local Authority Approval"),
    leaf("Building Plan Approval (GIS Building)"),
    leaf("Fire Department Approval"),
    leaf("CEIG Approval"),
    leaf("Electrical Inspectorate Approval"),
    leaf("Grid Connectivity Approval"),
    leaf("CEA Compliance Approval"),
    leaf("SF6 Handling Compliance"),
    leaf("Aviation/Height Clearance (if near airport)"),
    leaf("Railway/Highway Crossing Approval (if applicable)"),
    leaf("Telecom/PLCC Frequency Clearance"),
    leaf("Right of Way Approval (if applicable)"),
])

SURVEY_HYBRID = node("Survey & Soil Investigation", [
    leaf("Topographical Survey"),
    leaf("Benchmark Fixing"),
    leaf("Grid Coordinate Survey"),
    leaf("Underground Utility Detection"),
    leaf("Soil Investigation"),
    leaf("Bore Log Analysis"),
    leaf("Geo-Technical Test"),
    leaf("Soil Resistivity Test"),
    leaf("Hydrological / Flood Level Study"),
    leaf("Climatic Data Collection"),
    leaf("AIS Yard Survey"),
    leaf("GIS Building Survey"),
    leaf("Layout Finalization"),
])

ENGINEERING_HYBRID = node("Engineering & Design", [
    leaf("Single Line Diagram (SLD)"),
    leaf("Short Circuit Study"),
    leaf("Load Flow Study"),
    leaf("Insulation Coordination Study"),
    leaf("Drawing Approval Cycle (IFA to IFR to IFC)"),
    node("AIS Engineering", [
        leaf("Outdoor Bus Bar Layout"),
        leaf("Gantry Structure Design"),
        leaf("Outdoor Equipment Layout"),
        leaf("AIS Equipment Foundation Design"),
        leaf("Lightning Arrestor Layout"),
    ]),
    node("GIS Engineering", [
        leaf("GIS Bay Layout"),
        leaf("Indoor GIS Hall Layout"),
        leaf("GIS Building Layout"),
        leaf("SF6 Gas Zone Design"),
        leaf("Gas Monitoring Design"),
        leaf("GIS Foundation Design"),
        leaf("GIS Hall Earthing Mesh / Faraday Cage Design"),
        leaf("EOT Crane Design (GIS hall maintenance lifting)"),
    ]),
    node("Interface Engineering", [
        leaf("AIS-GIS Interface Bay Design"),
        leaf("Bus Duct Design"),
        leaf("Interface Bushing Design"),
        leaf("Interface Protection Coordination Study"),
        leaf("Interconnection Layout"),
    ]),
    node("Common Engineering", [
        leaf("Earthing Design"),
        leaf("Cable Trench Design"),
        leaf("Cable Tray Layout"),
        leaf("Cable Schedule Preparation"),
        leaf("Battery Sizing Calculation"),
        leaf("Cable Sizing Calculation"),
        leaf("Protection Philosophy Design"),
        leaf("Relay Coordination Study"),
        leaf("Interlocking Logic Design"),
        leaf("Control & Relay Panel Design"),
        leaf("SCADA Architecture Design"),
        leaf("RTU Design"),
        leaf("Metering Scheme Design"),
        leaf("HVAC Design"),
        leaf("Fire Detection & Suppression Design"),
        leaf("Auxiliary AC/DC Distribution Design"),
        leaf("DG Backup Design"),
        leaf("Lighting Design"),
        leaf("BOQ Preparation"),
        leaf("BOM Preparation"),
    ]),
])

PROCUREMENT_HYBRID = node("Procurement Management", [
    leaf("Vendor Identification"),
    leaf("AIS Vendor Finalization"),
    leaf("GIS Vendor Finalization"),
    leaf("Interface Equipment Vendor Finalization"),
    leaf("Third-Party Inspection Agency (TPIA) Engagement"),
    leaf("Purchase Requisition (PR)"),
    leaf("Purchase Order Release"),
    leaf("Vendor Drawing Approval"),
    leaf("Manufacturing Follow-up"),
    leaf("Factory Acceptance Test (FAT)"),
    leaf("Dispatch Clearance"),
    leaf("Customs Clearance (Imported Equipment)"),
    leaf("Logistics Planning"),
    leaf("Transportation Arrangement"),
])

SUPPLY_HYBRID = node("Supply / Equipment Procurement", [
    node("AIS Section Supply", [
        leaf("Outdoor Circuit Breaker"),
        leaf("Outdoor CT"),
        leaf("Outdoor PT/CVT"),
        leaf("Isolator"),
        leaf("Lightning Arrestor"),
        leaf("Bus Bar / Conductor"),
        leaf("Structures / Gantry"),
        leaf("Insulators"),
        leaf("Connectors / Clamps"),
    ]),
    node("GIS Section Supply", [
        leaf("GIS Switchgear Assembly"),
        leaf("SF6 Gas Cylinders"),
        leaf("Gas Density Monitor"),
        leaf("SF6 Recovery Unit"),
        leaf("Local Control Cubicle (LCC)"),
        leaf("GIS Bus Enclosure"),
    ]),
    node("Interface Equipment Supply", [
        leaf("Bus Duct"),
        leaf("Outdoor Bushings"),
        leaf("Interface Connectors"),
    ]),
    node("Common Supply", [
        leaf("Power Transformer"),
        leaf("Control & Relay Panels"),
        leaf("SCADA Panels / RTU"),
        leaf("Battery Bank"),
        leaf("Battery Charger"),
        leaf("UPS System"),
        leaf("ACDB/DCDB Panels"),
        leaf("Earthing Material"),
        leaf("Cable Tray"),
        leaf("Power Cable"),
        leaf("Control Cable"),
        leaf("HVAC Equipment"),
        leaf("Fire Protection System"),
        leaf("EOT Crane (GIS Hall)"),
        leaf("Tools, Tackles & Spares"),
        leaf("DG System (if applicable)"),
    ]),
])

CIVIL_HYBRID = node("Civil Works", [
    node("AIS Civil Works", [
        leaf("Site Grading & Leveling"),
        leaf("Excavation Work"),
        leaf("PCC Work"),
        leaf("RCC Work"),
        leaf("Reinforcement Work"),
        leaf("Gantry Foundation"),
        leaf("Equipment Foundation"),
        leaf("Yard Gravelling"),
    ]),
    node("GIS Civil Works", [
        leaf("GIS Building RCC Construction"),
        leaf("Dust-proof / Clean Room Provisions for GIS Hall"),
        leaf("Indoor Equipment Foundation"),
        leaf("HVAC Room Civil Work"),
        leaf("Fire Fighting Room Civil Work"),
        leaf("Access Road / Heavy Unloading Bay (oversized GIS transport)"),
        leaf("Internal Building Finishing"),
    ]),
    node("Common Civil Works", [
        leaf("Anti-Termite / Soil Treatment"),
        leaf("Transformer Foundation"),
        leaf("Transformer Oil Pit"),
        leaf("Plinth Protection"),
        leaf("Fire Wall Construction"),
        leaf("Control Room Building"),
        leaf("Cable Basement Construction"),
        leaf("Cable Trench Construction"),
        leaf("Cable Sealing End Yard (if cable-fed)"),
        leaf("Drainage System"),
        leaf("Rainwater Harvesting (if mandated)"),
        leaf("Boundary Wall"),
        leaf("Compound Gates"),
        leaf("Internal Roads"),
        leaf("Water Supply Arrangement"),
    ]),
])

AIS_EQUIP_INSTALL_H = node("AIS Equipment Installation", [
    leaf("Gantry Structure Erection"),
    leaf("Alignment Checking & Structural Inspection"),
    leaf("Galvanization Touch-up / Painting"),
    leaf("Circuit Breaker Installation"),
    leaf("CT Installation"),
    leaf("PT/CVT Installation"),
    leaf("Isolator Installation"),
    leaf("Lightning Arrestor Installation"),
    leaf("Bus Bar Stringing"),
    leaf("Jumper Connection"),
    leaf("Connector Installation"),
])

GIS_EQUIP_INSTALL_H = node("GIS Equipment Installation", [
    leaf("GIS Bay Assembly"),
    leaf("GIS Module Positioning"),
    leaf("GIS Alignment Check"),
    leaf("Bolting & Torque Tightening"),
    leaf("Vacuum Drying / Moisture Treatment of GIS Joints (pre-gas-fill)"),
    leaf("SF6 Gas Filling"),
    leaf("Gas Pressure Verification"),
    leaf("Gas Density Monitoring Setup"),
    leaf("SF6 Leak Detection"),
    leaf("EOT Crane Installation & Testing"),
])

INTERFACE_INTEGRATION = node("Interface Integration Works", [
    leaf("AIS-GIS Interface Bay Installation"),
    leaf("Bus Duct Installation"),
    leaf("Outdoor Bushing Installation"),
    leaf("AIS-GIS Mechanical Alignment"),
    leaf("Interface Cable Connection"),
    leaf("Electrical Continuity Check"),
    leaf("Interconnection Torque Verification"),
    leaf("Interface SCADA/Protection Signal Integration Test"),
    leaf("Interface Earthing Check"),
])

ELECTRICAL_INSTALL_COMMON_H = node("Common Electrical Installation", [
    leaf("Transformer Installation"),
    leaf("Transformer Assembly"),
    leaf("Transformer Oil Filtration"),
    leaf("Cable Tray Installation"),
    leaf("Power Cable Laying"),
    leaf("Control Cable Laying"),
    leaf("Cable Ferruling"),
    leaf("Cable Glanding"),
    leaf("Cable Termination"),
    leaf("Cable Fireproofing & Sealing at Penetrations"),
    leaf("Marshalling Box Wiring"),
    leaf("Panel Internal Wiring"),
    leaf("AC/DC Distribution Wiring"),
    leaf("Earthing Installation"),
    leaf("Earthing Strip Laying"),
    leaf("Earth Pit Installation"),
    leaf("Battery Bank Installation"),
    leaf("Battery Charger Installation"),
    leaf("UPS Installation"),
    leaf("ACDB/DCDB Installation"),
    leaf("Lighting Installation (Yard + GIS Hall + Street)"),
    leaf("Fiber Optic / PLCC Cable Laying"),
    leaf("DG Installation (if applicable)"),
])

SAFETY_HYBRID = node("Safety Management (EHS)", [
    leaf("Safety Induction"),
    leaf("Toolbox Talk"),
    leaf("PPE Distribution"),
    leaf("Permit to Work System"),
    leaf("Work at Height Safety"),
    leaf("Confined Space Safety"),
    leaf("SF6 Gas Handling Safety"),
    leaf("Electrical Safety Procedure"),
    leaf("Fire Safety Arrangement"),
    leaf("Emergency Response Plan"),
    leaf("Accident Reporting"),
    leaf("Environment Monitoring & Waste Management"),
    leaf("Safety Audit"),
])

TESTING_HYBRID = node("Testing & Pre-Commissioning", [
    node("AIS Equipment Testing", [
        leaf("CT/PT Testing"),
        leaf("Circuit Breaker Timing Test"),
        leaf("Contact Resistance Test"),
        leaf("Bus Bar Testing"),
    ]),
    node("GIS Equipment Testing", [
        leaf("SF6 Pressure Test"),
        leaf("SF6 Leakage Test"),
        leaf("SF6 Dew Point Test"),
        leaf("Partial Discharge Test"),
        leaf("GIS Mechanical Operation Test"),
    ]),
    node("Interface Testing", [
        leaf("AIS-GIS Continuity Test"),
        leaf("Bus Duct Integrity Test"),
        leaf("Mechanical Alignment Verification"),
        leaf("Interface Protection Scheme Testing"),
    ]),
    node("Common Testing", [
        leaf("Transformer Ratio & Winding Resistance Test"),
        leaf("Transformer Vector Group Test"),
        leaf("Magnetic Balance Test"),
        leaf("Tan Delta Test"),
        leaf("Relay Testing"),
        leaf("Primary Injection Test"),
        leaf("Secondary Injection Test"),
        leaf("Interlock Logic Testing"),
        leaf("Earthing Resistance Test"),
        leaf("Battery Discharge Test"),
        leaf("DC System Testing"),
        leaf("HV Cable Testing (VLF/PD Test)"),
        leaf("Fire Alarm/Detection System Testing"),
        leaf("Illumination Level Test"),
        leaf("Phasing / Vector Group Verification"),
        leaf("SCADA Testing"),
        leaf("RTU Communication Testing"),
        leaf("Protection Scheme Verification"),
    ]),
])

COMMISSIONING_HYBRID = node("Commissioning", [
    leaf("Final Pre-Commissioning Check"),
    leaf("Charging Permission from CEIG / Grid Authority"),
    leaf("Synchronization Check"),
    leaf("AIS Section Charging"),
    leaf("GIS Section Charging"),
    leaf("Transformer Charging"),
    leaf("Integrated System Charging"),
    leaf("Joint Commissioning with State/Central Grid Control"),
    leaf("Trial Run"),
    leaf("Load Trial"),
    leaf("Reliability / Sustained Run"),
    leaf("Final Energization"),
])

MONITORING_HYBRID = node("Project Monitoring & Control", [
    leaf("Daily Progress Report (DPR)"),
    leaf("Weekly Progress Review"),
    leaf("Client Review Meeting"),
    leaf("Schedule Monitoring"),
    leaf("Cost Monitoring"),
    leaf("Billing Milestone Tracking"),
    leaf("Invoice Submission & Approval Cycle"),
    leaf("Delay Analysis"),
    leaf("Recovery Plan"),
    leaf("Change Order Management"),
    leaf("Interface Management Between AIS & GIS Contractors"),
    leaf("Document Management System / Drawing Control"),
    leaf("Resource Monitoring"),
])

HYBRID_TREE = [
    PRE_PROJECT_HYBRID, MOBILIZATION, STATUTORY_HYBRID, SURVEY_HYBRID, ENGINEERING_HYBRID,
    PROCUREMENT_HYBRID, SUPPLY_HYBRID, MATERIAL_MGMT, CIVIL_HYBRID,
    AIS_EQUIP_INSTALL_H, GIS_EQUIP_INSTALL_H, INTERFACE_INTEGRATION, ELECTRICAL_INSTALL_COMMON_H,
    QAQC, SAFETY_HYBRID, TESTING_HYBRID, COMMISSIONING_HYBRID, MONITORING_HYBRID, CLOSEOUT,
]

write_csv("Hybrid_Substation_WBS.csv", HYBRID_TREE, "Hybrid")

print("Done")
