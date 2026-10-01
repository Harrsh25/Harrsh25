"""Adds the prototype's current coverage to Vendor_Module_Benchmark.xlsx.

Reads the benchmark workbook, keeps every sheet and row, and adds four columns to the
"Vendor Module" and "Registration Additions" sheets: status now, where it is in the
prototype, note, and the automated test that covers it. The coverage summary is rebuilt
from the new status. Usage: python3 benchmark_compare.py <benchmark.xlsx> <out.xlsx>
"""
import sys, re
from collections import OrderedDict
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

SRC, OUT = sys.argv[1], sys.argv[2]

# Status codes: Y = already in the prototype (built before this round), A = added in this round,
# S = added as a setting (stored and shown; no background job acts on it), P = partly covered,
# N = not applicable to this product (reason in the note). Rows the workbook already marks "Yes" stay Yes.
LABEL = {"Y": "Yes", "A": "Added", "S": "Added (setting)", "P": "Partially", "N": "Not applicable"}

VM = "Vendor Registry → Register vendor → More details"
DRAWER = "Vendor drawer"
CA = "Vendor drawer → Contacts & addresses"
BANK = "Vendor drawer → Bank"
QUAL = "Vendor drawer → Qualification"
MR = "Purchase Requisitions"
RFQ = "RFQ & Quotations → New RFQ"
RFQMD = "New RFQ → More details"
QUOTE = "Quotation form → More details"
POMD = "New PO → More details"
GRN = "Receive goods (GRN)"
GRNMD = "Receive goods → More details"
QI = "Receive goods → Quality inspection"
BILL = "Enter vendor bill"
BILLMD = "Enter vendor bill → More details"
PAY = "Record payment"
PAYMD = "Record payment → More details"
SC = "Vendor Scorecard → Metric model"
SET = "Procurement Settings"
WK = "Labour Attendance → Add worker"
PL = "Vendor Price Lists"
CT = "Contracts → Create contract → Signing, terms & fulfilment"
BO = "Blanket Orders → New blanket order"

M = {
 4: ("A", VM + " (Entity type) + Supplier type", "", "BF-01"), 6: ("A", VM + " (Notes) · Vendor drawer → Activity (notes)", "", ""), 7: ("A", SET + " → Custom fields — vendor; shown on registration and portal", "", ""),
 13: ("A", VM + " (Tax preference); tax category on documents", "", ""), 16: ("A", VM + " (Entity type)", "", "BF-01"), 17: ("A", VM + " (GST treatment)", "", ""),
 19: ("A", VM + " (MSME type + Udyam no., format checked)", "", "BF-01"), 20: ("A", VM + " (Place of supply)", "", ""),
 23: ("A", CA + " → Add contact (first / middle / last)", "", "BF-02"), 24: ("A", VM + " · " + CA, "", ""), 25: ("A", VM + " · " + CA, "", "BF-02"), 26: ("A", VM + " · " + CA, "", ""),
 27: ("A", VM + " · " + CA, "", ""), 28: ("A", CA + " (Primary contact replaces the registration contact)", "", "BF-02"), 29: ("A", VM + " · " + CA, "", ""),
 32: ("Y", "Register vendor → Tax & payment (Country)", "Built in the previous merge", "M-01"), 33: ("Y", "Register vendor → Registered address", "", ""), 34: ("A", VM + " (Address line 2) · " + CA, "", ""),
 37: ("Y", "Register vendor (PIN / postal code, format checked)", "", ""), 38: ("A", VM + " (District / county) · " + CA, "", ""), 39: ("A", CA + " (Address title)", "", "BF-02"),
 40: ("A", CA + " (Address type)", "", ""), 41: ("A", CA + " (Preferred billing / shipping)", "", ""), 42: ("A", CA + " (Disable address)", "", ""),
 46: ("Y", "Register vendor → Bank (Account holder, penny-drop check)", "Built in the previous merge", "M-01"), 47: ("A", "Register vendor → Bank / " + BANK + " (IBAN, foreign vendors)", "", ""),
 48: ("A", BANK + " (Account currency)", "", ""), 50: ("A", BANK + " → Settings (branch, notes, type)", "", ""), 51: ("A", "Register vendor → Bank / " + BANK + " (Re-enter account no.)", "", "M-01"),
 52: ("A", BANK + " (Account type)", "", ""), 53: ("Y", BANK + " (multiple accounts, default flag)", "", ""), 54: ("A", BANK + " → Settings (Allow international payments)", "", ""),
 55: ("A", BANK + " → Settings (Send money); payments stop when off", "", "BF-03"), 56: ("A", BANK + " → Settings (Disable)", "", ""), 57: ("A", BANK + " (Bank notes)", "", ""),
 58: ("A", PAY + " (company bank account paid from · vendor bank account paid to)", "", ""),
 61: ("A", VM + " (Payment method)", "", ""), 62: ("A", VM + " (Price list) · " + PL, "", "BF-09"), 63: ("A", VM + " (Credit limit; warning on new PO)", "", "BF-01"),
 64: ("A", VM + " (Payable account) · " + BILLMD, "", ""), 65: ("A", VM + " (Bill delivery, auto-post bills); 3-way match is the abnormal-bill check", "", ""),
 66: ("A", VM + " (Default buyer, purchase warning, receipt reminder)", "RFQ grouping not needed — one RFQ per requirement", ""),
 67: ("A", CA + " → Add address (site purposes, business unit)", "", "BF-02"), 68: ("Y", SET + " → Vendor groups (Parent › Child)", "", ""),
 70: ("A", DRAWER + " → Status & flags (Freeze vendor); frozen vendors are left out of RFQs, POs and payments", "", "BF-04"), 72: ("Y", DRAWER + " → Status & flags → Hold (Invoices / Payments / All)", "", "F-01"),
 78: ("A", VM + " (Note to approver); shown on the approval screen", "", ""),
 83: ("A", QUAL + " → Qualification outcome (Expiry date → status Expired)", "", ""), 84: ("A", QUAL + " → Qualification outcome (Exceptions, notes, review comments per category)", "", ""),
 85: ("A", QUAL + " → Qualification outcome (Risk rating)", "", ""), 87: ("A", SET + " → Qualification question library", "", "BF-06"),
 94: ("A", MR + " → New requisition (Request purpose / type)", "", "BF-07"), 95: ("A", MR + " (Request date)", "", ""), 96: ("A", MR + " (Required by)", "", ""),
 97: ("A", MR + " (Client, for customer-provided material)", "", ""), 98: ("A", MR + " (Source / target store)", "", ""), 99: ("A", MR + " (Price list)", "", ""),
 101: ("A", RFQMD + " (RFQ date)", "", ""), 102: ("A", RFQMD + " (Company / buying entity)", "", ""), 104: ("A", RFQMD + " (Vendor reference)", "", ""), 105: ("A", RFQMD + " (Buyer)", "", ""),
 106: ("A", RFQMD + " (Priority)", "", ""), 108: ("A", RFQMD + " (Preview / open date)", "", ""), 110: ("A", RFQMD + " (Anticipated award date)", "", ""),
 111: ("A", RFQMD + " (Currency, allowed quote currencies)", "", ""), 112: ("A", RFQMD + " (Payment terms template)", "", ""), 113: ("A", RFQMD + " (Tax position)", "", ""),
 115: ("A", RFQMD + " (Link to purchase agreement)", "", ""), 116: ("A", RFQ + " (Ranking shown to vendors; allow revisions)", "", ""), 117: ("A", SET + " → Custom fields — RFQ; shown in More details", "", ""),
 120: ("A", RFQ + " → Requirement questions; answered with the quote", "", "BF-08"), 121: ("N", "", "No item master or barcodes — items are described per line", ""),
 122: ("A", "RFQ drawer → Alternative RFQ", "", ""), 124: ("A", RFQMD + " (Named place)", "", ""), 126: ("A", RFQMD + " (Ship-to / deliver-to site)", "", ""), 127: ("A", RFQMD + " (Company billing address)", "", ""),
 128: ("A", "RFQ → Send by e-mail (E-mail template)", "", ""), 131: ("A", "RFQ → Send by e-mail (Send attached files); " + RFQ + " (Attachments)", "", ""), 133: ("A", RFQMD + " (Letter head, print heading)", "", ""),
 134: ("A", MR + " → Manpower (labour) → Contingent type", "Construction labour requisition in place of a staffing job posting", "BF-07"), 135: ("A", MR + " → Manpower (Category / trade, labour type)", "", "BF-07"),
 136: ("A", MR + " → Manpower (Start / end date)", "", ""), 137: ("A", MR + " → Manpower (Site / location)", "", ""), 138: ("A", MR + " → Manpower (Business unit)", "", ""), 139: ("A", MR + " → Manpower (Cost centre)", "", ""),
 140: ("A", MR + " → Manpower (Rate grid from labour rate cards)", "", ""), 141: ("A", MR + " → Manpower (Supplier distribution list → RFQ invitees)", "", "BF-07"),
 142: ("A", MR + " → Manpower (Distribution rule)", "", ""), 143: ("A", MR + " → Manpower (Qualifications required)", "", ""),
 146: ("A", QUOTE + " (Quotation date)", "", ""), 148: ("A", QUOTE + " (Company)", "", ""), 149: ("A", QUOTE + " (Subcontracted)", "", ""), 150: ("A", QUOTE + " (Title)", "", ""),
 151: ("Y", "Quotation form (Currency + exchange rate, INR equivalent)", "Built in the previous merge", ""), 152: ("A", QUOTE + " (Price list)", "", ""), 153: ("A", QUOTE + " (Ignore pricing rule)", "", ""),
 154: ("A", QUOTE + " (Additional discount — apply on, %, amount)", "", ""), 155: ("A", QUOTE + " (Disable rounded total)", "", ""), 156: ("A", QUOTE + " (Tax category)", "", ""),
 157: ("A", QUOTE + " (Purchase taxes & charges template)", "", ""), 158: ("A", QUOTE + " (Shipping rule → freight)", "", ""), 159: ("A", QUOTE + " (Incoterm, named place)", "", ""),
 160: ("A", QUOTE + " (Cost centre, project)", "", ""), 161: ("A", QUOTE + " (Supplier address)", "", ""), 162: ("A", QUOTE + " (Supplier contact)", "", ""), 163: ("A", QUOTE + " (Ship-to)", "", ""),
 164: ("A", QUOTE + " (Company billing address)", "", ""), 166: ("A", QUOTE + " (Letter head, print heading, group same items)", "", ""),
 167: ("Y", WK + " (Full name)", "Workers are the construction equivalent of staffing candidates", ""), 168: ("A", WK + " (Preferred name)", "", ""), 169: ("A", WK + " (E-mail)", "", ""),
 170: ("Y", WK + " (Mobile)", "", ""), 171: ("A", WK + " (Address)", "", ""), 172: ("A", WK + " (Residential status — local / migrant)", "", "BF-18"), 173: ("A", WK + " (ID proof / CV upload)", "", ""),
 174: ("A", WK + " (Pay rate, bill rate; bill ≥ pay)", "", "BF-18"), 175: ("A", WK + " (Available from)", "", ""), 176: ("A", WK + " (Skill rating 1–5)", "", ""),
 179: ("A", PL + " (Vendor)", "", "BF-19"), 180: ("A", PL + " (Vendor product name)", "", ""), 181: ("A", PL + " (Vendor product code)", "", ""), 182: ("A", PL + " (Lead time)", "", ""),
 183: ("A", PL + " (Minimum quantity — price applies at or above it)", "", "BF-09"), 184: ("A", PL + " (Unit price; suggested on new POs)", "", "BF-09"), 185: ("A", PL + " (Currency)", "", ""),
 186: ("A", PL + " (Valid from / to)", "", ""), 187: ("A", PL + " (Discount %)", "", ""), 188: ("A", PL + " (Company)", "", ""),
 189: ("A", "Supplier portal → Users → Company profile — additional details", "", ""),
 191: ("A", POMD + " (Supplier address / site)", "", ""), 192: ("A", POMD + " (Supplier contact)", "", ""), 193: ("A", POMD + " (Document date & time)", "", ""),
 195: ("A", POMD + " (Vendor order confirmation no. & date)", "", ""), 196: ("A", POMD + " (Company)", "", ""), 197: ("A", POMD + " (Requisitioning BU, bill-to BU)", "", ""),
 198: ("A", POMD + " (Document style)", "", ""), 199: ("P", POMD + " (Subcontracted)", "Supplier warehouse not applicable — no stock ledger for materials at the vendor", ""),
 200: ("A", POMD + " (Title)", "", ""), 201: ("A", POMD + " (Notes)", "", ""), 202: ("A", SET + " → Custom fields — purchase order; shown in More details", "", ""),
 203: ("A", POMD + " (Currency)", "", ""), 204: ("A", POMD + " (Exchange rate, INR equivalent)", "", ""), 205: ("A", POMD + " (Price list) · " + PL, "", "BF-09"), 206: ("A", POMD + " (Ignore pricing rule)", "", ""),
 207: ("A", POMD + " (Additional discount; adjusted total shown)", "", ""), 208: ("A", POMD + " (Disable rounded total)", "", ""), 210: ("N", "", "No item master or barcodes", ""),
 211: ("P", POMD + " (Receiving store)", "Reserve warehouse not applicable — no inventory module", ""), 212: ("A", POMD + " (Tax category)", "", ""), 213: ("A", POMD + " (Taxes & charges template)", "", ""),
 214: ("A", POMD + " (Shipping rule)", "", ""), 215: ("A", POMD + " (Incoterm, named place)", "", ""), 216: ("A", POMD + " (Cost centre, project)", "", ""), 217: ("A", POMD + " (Supplier address)", "", ""),
 218: ("A", POMD + " (Ship-to / deliver-to site)", "", ""), 219: ("A", POMD + " (Dispatch address)", "", ""), 220: ("A", POMD + " (Company billing address)", "", ""), 221: ("A", POMD + " (Drop-ship site contact)", "", ""),
 222: ("A", POMD + " (Payment terms template; early-payment discount in " + SET + ")", "", ""), 224: ("A", POMD + " (Letter head, print heading, group same items)", "", ""), 225: ("A", POMD + " (Print language)", "", ""),
 226: ("P", POMD + " (Auto-repeat from / to / every)", "Recorded on the PO; no scheduler creates the repeat orders", ""),
 227: ("A", BO + " → More details (Agreement / order type)", "", ""), 229: ("A", BO + " → More details (Buyer)", "", ""), 230: ("A", BO + " (Agreement no. / vendor reference, unique)", "", ""),
 231: ("A", BO + " → More details (Order date)", "", ""), 233: ("A", BO + " → More details (Company)", "", ""), 234: ("A", BO + " → More details (Currency, price list)", "", ""),
 239: ("Y", "Contract drawer → Sign & activate (status Active)", "", "C07"), 242: ("A", "Contract drawer (Signed by, signed on, signed contract received)", "", "C07"),
 243: ("A", CT + " (Authorised signatory)", "", ""), 244: ("A", CT + " (Contract template, legal terms)", "", ""), 245: ("A", CT + " (Fulfilment required, deadline, terms)", "", "BF-17"),
 246: ("A", CT + " (Reference document type / name)", "", ""), 253: ("A", CT + " (Cost centre)", "", ""), 254: ("A", CT + " (Legal terms)", "", ""), 255: ("A", CT + " (Fee characteristics)", "", ""),
 256: ("Y", "Labour Attendance (contractor workers on the work order)", "", ""),
 258: ("A", GRNMD + " (Supplier address, contact)", "", ""), 259: ("A", GRNMD + " (Supplier delivery note / challan no.)", "", ""), 261: ("A", GRNMD + " (Company)", "", ""),
 262: ("A", GRNMD + " (Operation type)", "", ""), 264: ("A", GRNMD + " (Priority)", "", ""), 265: ("A", GRNMD + " (Responsible)", "", ""), 266: ("A", GRNMD + " (Shipping policy)", "", ""),
 267: ("A", GRNMD + " (Notes / remarks)", "", ""), 268: ("A", GRNMD + " (Title)", "", ""), 269: ("A", GRN + " (Accepted into) · " + GRNMD + " (Receiving store)", "", ""),
 271: ("Y", GRN + " (Rejected goods kept at)", "", ""), 272: ("N", "", "Supplier warehouse is for ERP subcontracting stock — not used", ""), 273: ("N", "", "No putaway rules — no warehouse management", ""), 274: ("N", "", "No barcodes", ""),
 275: ("A", GRNMD + " (Currency, exchange rate — copied from the PO)", "", ""), 276: ("A", GRNMD + " (Price list)", "", ""), 277: ("A", GRNMD + " (Tax category, template)", "", ""),
 278: ("A", GRNMD + " (Shipping rule)", "", ""), 279: ("A", GRNMD + " (Incoterm, named place)", "", ""), 280: ("A", GRNMD + " (Additional discount)", "", ""), 281: ("A", GRNMD + " (Cost centre, project)", "", ""),
 282: ("A", GRNMD + " (Supplier address, contact)", "", ""), 283: ("A", GRNMD + " (Dispatch address, ship-to)", "", ""), 284: ("A", GRNMD + " (Company billing address)", "", ""),
 285: ("A", GRNMD + " (Transporter name)", "", ""), 286: ("A", GRNMD + " (Vehicle number)", "", ""), 287: ("A", GRNMD + " (Vehicle date)", "", ""),
 289: ("A", SET + " → Receiving tolerances (Over-receipt: Stop / Warn / Off)", "", ""), 290: ("A", SET + " → Receiving tolerances (Early / late days)", "", ""),
 291: ("A", SET + " → Receiving tolerances (Receipt date exception: Stop / Warn / Off)", "", ""), 292: ("A", SET + " → Blind receiving (ordered qty hidden on the GRN)", "", "BF-12"),
 293: ("A", QI + " (Report date)", "", ""), 294: ("A", QI + " (Inspection type)", "", ""), 295: ("A", QI + " (Reference document)", "", ""), 296: ("A", QI + " (Item)", "", ""),
 297: ("A", QI + " (Batch / serial no.)", "", "BF-12"), 298: ("A", QI + " (Sample size)", "", ""), 299: ("A", QI + " (Template with parameters; " + SET + " → Quality inspection templates)", "", ""),
 300: ("A", QI + " (Manual inspection)", "", ""), 301: ("A", QI + " (Inspected by, verified by)", "", ""), 302: ("A", GRN + " (Quality inspection result, consistent with quantities)", "", ""), 303: ("A", QI + " (Remarks)", "", ""),
 304: ("Y", "Work Orders (the contractor's order)", "Construction subcontracting runs on contracts and work orders", ""), 305: ("Y", "Work order contractor", "", ""),
 306: ("A", "Work order → Issue material (Contractor's site store)", "", ""), 307: ("Y", "Work order issued on; material issue date", "", ""), 308: ("A", "Work order → Issue material (Issue from store)", "", ""),
 309: ("N", "", "No stock reservation — no inventory module", ""), 310: ("Y", "Contractor contacts & addresses (vendor drawer)", "", ""), 311: ("N", "", "Additional-cost distribution is an inventory valuation feature", ""),
 315: ("A", BILLMD + " (Posting date)", "", ""), 316: ("Y", BILL + " (Due date from terms, overridable)", "Built in the previous merge", ""), 319: ("A", BILLMD + " (Company)", "", ""),
 320: ("A", BILLMD + " (Delivery / taxable supply date)", "", ""), 321: ("A", BILLMD + " (Journal)", "", ""), 322: ("A", BILLMD + " (Supplier group, read-only)", "", ""),
 323: ("A", BILLMD + " (Title, notes)", "", ""), 324: ("A", BILL + " (Bill copy attachment)", "", ""), 325: ("A", BILLMD + " (Received from e-mail)", "", ""),
 326: ("A", BILLMD + " (Currency)", "", ""), 327: ("A", BILLMD + " (Exchange rate)", "", ""), 328: ("A", BILLMD + " (Price list, ignore pricing rule)", "", ""), 329: ("A", BILLMD + " (Additional discount)", "", ""),
 330: ("A", BILLMD + " (Disable rounded total)", "", ""), 331: ("N", "", "No stock ledger — receipts are recorded on the GRN", ""), 332: ("N", "", "Warehouses are recorded on the GRN, not the bill", ""), 333: ("N", "", "No barcodes", ""),
 334: ("A", BILLMD + " (Tax category, template)", "", ""), 335: ("A", BILLMD + " (Tax position)", "", ""), 336: ("A", BILLMD + " (Shipping rule)", "", ""), 337: ("A", BILLMD + " (Incoterm, named place)", "", ""),
 338: ("A", BILL + " → TDS (Consider for tax withholding)", "", ""), 339: ("A", BILL + " → TDS (Tax withholding group)", "", ""), 340: ("A", BILL + " → TDS (Ignore threshold)", "", ""),
 341: ("A", BILL + " → TDS (Edit entries — manual amount)", "", "BF-14"), 342: ("A", BILLMD + " (Payment terms template)", "", ""), 343: ("A", BILL + " (Payment reference)", "", ""),
 344: ("A", BILL + " (Recipient bank)", "", ""), 345: ("N", "", "Payment QR codes are for SEPA / retail payments; vendor payments here are by bank file or cheque", ""),
 346: ("A", BILL + " (Paid at entry: mode, amount)", "", "BF-14"), 347: ("A", BILL + " (Cash / bank account)", "", "BF-14"), 348: ("Y", "Invoice drawer → Advances", "", ""),
 349: ("A", "Invoice drawer → Write off (account, cost centre)", "", ""), 353: ("Y", "Bills update the PO billing status", "", ""), 354: ("A", SET + " (Auto-post bills) · vendor setting; drafts need Post bill", "", ""),
 355: ("Y", "RA bills create the payable automatically on approval", "Equivalent of auto-invoicing from approved timesheets", ""), 356: ("A", BILLMD + " (Credit to / payable account)", "", ""),
 357: ("A", BILLMD + " (Opening entry)", "", ""), 358: ("A", BILLMD + " (Cost centre, project)", "", ""), 359: ("N", "", "Unrealised FX gain / loss is a general-ledger revaluation — no ledger in this app", ""),
 360: ("A", BILLMD + " (Supplier address, contact)", "", ""), 361: ("A", BILLMD + " (Ship-to)", "", ""), 362: ("A", BILLMD + " (Company billing address)", "", ""),
 363: ("P", BILLMD + " (Auto-repeat from / to / every)", "Recorded on the bill; no scheduler creates the repeat bills", ""), 364: ("A", BILLMD + " (Letter head, print heading)", "", ""),
 365: ("A", PAYMD + " (Payment type)", "", ""), 367: ("A", PAYMD + " (Company)", "", ""), 369: ("A", PAYMD + " (Journal)", "", ""), 371: ("A", PAYMD + " (Supplier contact)", "", ""),
 372: ("A", PAY + " (Company bank account)", "", ""), 373: ("A", PAY + " (Vendor bank account)", "", ""), 374: ("A", PAY + " (Paid from · paid to)", "", ""), 376: ("A", PAYMD + " (Currency)", "", ""),
 377: ("A", PAYMD + " (Exchange rate)", "", ""), 378: ("A", PAY + " (Amount paid)", "", ""), 379: ("A", PAY + " (Unallocated amount, kept as advance)", "", ""),
 382: ("A", PAY + " (Cheque / reference no. and date — required for cheques)", "", "BF-13"), 383: ("A", BILL + " → TDS (Consider) — applied at payment", "", ""), 384: ("A", BILL + " → TDS (Category) — applied at payment", "", ""),
 385: ("A", BILL + " → TDS (Group)", "", ""), 386: ("A", BILL + " → TDS (Ignore threshold)", "", ""), 387: ("A", PAYMD + " (Taxes & charges template)", "", ""),
 388: ("A", SET + " → TDS categories (Code, name)", "", "BF-16"), 389: ("A", SET + " → TDS categories (Deduct tax on basis)", "", ""), 390: ("A", SET + " → TDS categories (Round off)", "", ""),
 391: ("A", SET + " → TDS categories (Only on excess)", "", ""), 392: ("A", SET + " → TDS categories (Disable cumulative / transaction threshold)", "", ""),
 394: ("A", PAYMD + " (Opening entry)", "", ""), 395: ("A", PAYMD + " (Cost centre, project)", "", ""),
 398: ("A", SC + " (Weighting function)", "", ""), 400: ("A", SC + " → Scorecard criteria (Name)", "", ""), 401: ("A", SC + " → Scorecard criteria (Max score)", "", ""),
 402: ("A", SC + " → Scorecard criteria (Formula over variables)", "", "BF-15"), 403: ("A", SC + " → Scorecard criteria (Weight, must total 100%)", "", ""),
 404: ("A", SC + " → Scoring variables (Variable name)", "", ""), 405: ("A", SC + " → Scoring variables (Custom variable)", "", ""), 406: ("A", SC + " → Scoring variables (Parameter name)", "", ""),
 407: ("A", SC + " → Scoring variables (Path)", "", ""), 408: ("A", SC + " → Scoring variables (Description)", "", ""), 410: ("A", SC + " → Standings (Colour)", "", ""),
 415: ("A", SC + " → Scorecard periods (Start / end)", "", ""), 416: ("A", SC + " → Scorecard periods (Scorecard setup)", "", ""),
 418: ("S", SET + " (Supplier naming by)", "Stored; vendor IDs stay on the VEN- series", ""), 419: ("A", SET + " (Default supplier group — applied to new registrations)", "", ""),
 420: ("A", SET + " (Default buying price list — default on documents)", "", ""), 422: ("Y", SET + " (Maintain same rate: Stop / Warn / Off)", "", ""),
 424: ("S", SET + " (Set landed cost based on invoice rate)", "Stored; no stock valuation in this app", ""), 425: ("A", SET + " (Disable last purchase rate — hides the last-rate suggestion on POs)", "", ""),
 426: ("A", SET + " (Allow negative rates — PO lines)", "", ""), 427: ("Y", SET + " (PO required for vendor bills)", "", ""), 428: ("Y", SET + " (Goods receipt required before billing)", "", ""),
 431: ("A", SET + " (PO approval minimum — below it the PO is issued directly)", "", "BF-10"), 432: ("A", SET + " (Lock confirmed orders — Unlock & amend with a reason)", "", ""),
 433: ("A", SET + " (Purchase warnings) · vendor purchase warning on RFQ / PO / bill", "", ""), 434: ("S", SET + " (Receipt reminder days) · vendor setting", "Stored; e-mail reminders are not sent by the prototype", ""),
 435: ("Y", "Blanket Orders", "", ""), 438: ("A", SET + " (Allow zero-quantity lines)", "", ""), 439: ("A", SET + " (Allow the same item twice on a PO)", "", "BF-11"),
 440: ("Y", SET + " (Bill for rejected quantity)", "", ""), 441: ("S", SET + " (Use the transaction-date exchange rate)", "Stored; rates are entered on the document", ""),
 442: ("S", SET + " (Valuation rate for rejected materials)", "Stored; no stock valuation", ""), 443: ("S", SET + " (Project purchase-cost update)", "Stored; project cost updates on each transaction", ""),
 444: ("S", SET + " (Show pay button in the PO portal)", "Stored; the portal shows no pay button yet", ""), 445: ("A", SET + " (Invoice quantity / amount tolerance % — used by the 3-way match)", "", ""),
 446: ("N", "", "Backflush is a manufacturing BOM feature", ""), 447: ("N", "", "Raw-material transfer allowance is a manufacturing feature", ""), 448: ("N", "", "BOM consumption check is a manufacturing feature", ""),
 449: ("N", "", "Auto subcontracting orders are a manufacturing feature", ""), 450: ("N", "", "Auto purchase receipts are a manufacturing feature", ""),
 451: ("A", SET + " (Drop-shipping to site) · ship-to site on documents", "", ""), 452: ("A", SET + " (Days to purchase — warning on POs)", "", ""),
 453: ("N", "", "No product variants", ""), 454: ("A", SET + " (RFQ sender e-mail) · shown as From on RFQ e-mails", "", ""),
 455: ("A", VM + " (D-U-N-S number)", "", ""), 456: ("Y", "Register vendor (Website)", "Built in the previous merge", ""), 457: ("A", VM + " (Tags)", "", ""), 458: ("A", VM + " (Logo / image)", "", ""),
 459: ("A", VM + " (Also a transporter)", "", ""), 460: ("A", VM + " (Print language)", "", ""), 461: ("N", "", "No shared supplier network to search", ""),
 462: ("A", VM + " (Federal income tax type — foreign vendors)", "", ""), 463: ("A", VM + " (MSME type, Udyam no.)", "", "BF-01"), 465: ("A", CA + " → Contact (Status: Active / Unsubscribed)", "", ""),
 466: ("A", QUAL + " → Qualification outcome (Aggregate and single project limit)", "", "BF-05"),
}

wb = load_workbook(SRC)
HDR = PatternFill("solid", fgColor="1F3A5F"); HF = Font(color="FFFFFF", bold=True)
FILL = {"Yes": "D1FADF", "Added": "DBEAFE", "Added (setting)": "E0E7FF", "Partially": "FEF0C7", "Not applicable": "F2F4F7"}
counter = 0; rows_all = []
for name in ["Vendor Module", "Registration Additions"]:
    ws = wb[name]
    base = ws.max_column
    heads = ["NEBULLAONE (now)", "Where in the prototype", "Note", "Test ID"]
    for j, t in enumerate(heads):
        c = ws.cell(row=1, column=base + 1 + j, value=t); c.fill = HDR; c.font = HF; c.alignment = Alignment(wrap_text=True, vertical="center")
    mod = sub = None
    for r in range(2, ws.max_row + 1):
        a, b, fld, bench, old = [ws.cell(row=r, column=k).value for k in range(1, 6)]
        if a: mod = a
        if b: sub = b
        if fld is None: continue
        counter += 1
        if counter in M:
            code, where, note, test = M[counter]; now = LABEL[code]
        elif old == "Yes":
            now, where, note, test = "Yes", "", "", ""
        else:
            raise SystemExit(f"row {counter} ({fld}) has no mapping")
        for j, v in enumerate([now, where, note, test]):
            c = ws.cell(row=r, column=base + 1 + j, value=v); c.alignment = Alignment(wrap_text=True, vertical="top")
        ws.cell(row=r, column=base + 1).fill = PatternFill("solid", fgColor=FILL[now])
        rows_all.append((name, mod, sub, fld, old, now))
    for j, w in enumerate([18, 60, 44, 12]): ws.column_dimensions[get_column_letter(base + 1 + j)].width = w

# Coverage summary (new sheet so the original stays as it was)
cs = wb.create_sheet("Coverage Now", 0 if False else len(wb.sheetnames))
cs.append(["MODULE NAME", "Benchmark fields", "Yes (before)", "Yes now", "Added", "Added (setting)", "Partially", "Not applicable", "Covered % (Yes + Added)", "Covered % excluding not applicable"])
for c in cs[1]: c.fill = HDR; c.font = HF; c.alignment = Alignment(wrap_text=True)
mods = OrderedDict()
for (sheet, mod, sub, fld, old, now) in rows_all:
    if sheet != "Vendor Module": continue
    mods.setdefault(mod, []).append((old, now))
def line(label, lst):
    n = len(lst); yb = sum(o == "Yes" for o, _ in lst)
    cnt = {k: sum(x == k for _, x in lst) for k in ["Yes", "Added", "Added (setting)", "Partially", "Not applicable"]}
    cov = cnt["Yes"] + cnt["Added"] + cnt["Added (setting)"]
    return [label, n, yb, cnt["Yes"], cnt["Added"], cnt["Added (setting)"], cnt["Partially"], cnt["Not applicable"], round(100 * cov / n, 1) if n else "—", round(100 * cov / (n - cnt["Not applicable"]), 1) if n - cnt["Not applicable"] else "—"]
for m, lst in mods.items(): cs.append(line(m, lst))
allv = [x for lst in mods.values() for x in lst]
cs.append(line("TOTAL (Vendor Module sheet)", allv))
for c in cs[cs.max_row]: c.font = Font(bold=True)
ra = [(o, n) for (s, m, sb, f, o, n) in rows_all if s == "Registration Additions"]
cs.append(line("Registration Additions sheet", ra))
cs.append([])
for t in ["How to read: 'Yes (before)' is the NEBULLAONE column as supplied. 'Yes now' counts fields that were already in the prototype when re-checked (some were built after the workbook was marked).",
          "'Added' = built in this round. 'Added (setting)' = the setting exists and is saved, but no background job acts on it in the prototype (see the note on each row).",
          "'Not applicable' = inventory, manufacturing, barcode or ledger features this construction vendor app does not have; each row says why.",
          "Test IDs refer to the Playwright suites in nebullaone/tests (bench.js = BF-*, merge.js = M-*/F-*/Q-*, final.js = V*/C*)."]:
    cs.append([t])
for i, w in enumerate([34, 12, 12, 10, 10, 14, 10, 14, 14, 18], 1): cs.column_dimensions[get_column_letter(i)].width = w
wb.save(OUT)
tot = line("x", allv)
print(f"rows {counter}; vendor-module fields {tot[1]}: yes before {tot[2]} → yes {tot[3]} + added {tot[4]} + setting {tot[5]}, partial {tot[6]}, n/a {tot[7]}; covered {tot[8]}% ({tot[9]}% excl. n/a)")
