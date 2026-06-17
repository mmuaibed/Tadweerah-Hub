import xml.etree.ElementTree as ET

def create_mxfile():
    return ET.Element("mxfile", version="24.4.0")

def create_diagram(name, id_str):
    diagram = ET.Element("diagram", id=id_str, name=name)
    model = ET.SubElement(diagram, "mxGraphModel", dx="1422", dy="798", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="1400", pageHeight="827", math="0", shadow="1")
    root = ET.SubElement(model, "root")
    ET.SubElement(root, "mxCell", id="0")
    ET.SubElement(root, "mxCell", id="1", parent="0")
    return diagram, root

def add_node(root, cid, value, style, x, y, w, h):
    cell = ET.SubElement(root, "mxCell", id=cid, value=value, style=style, vertex="1", parent="1")
    ET.SubElement(cell, "mxGeometry", x=str(x), y=str(y), width=str(w), height=str(h), **{"as": "geometry"})
    return cell

def add_edge(root, cid, source, target, value="", edge_style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=0;strokeWidth=2;strokeColor=#4D4D4D;fontSize=12;"):
    cell = ET.SubElement(root, "mxCell", id=cid, value=value, style=edge_style, edge="1", parent="1", source=source, target=target)
    ET.SubElement(cell, "mxGeometry", relative="1", **{"as": "geometry"})
    return cell

# Colors
BOX_CUR = "rounded=1;whiteSpace=wrap;html=0;fontSize=14;fontStyle=1;shadow=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#001A33;"
BOX_SYS = "rounded=1;whiteSpace=wrap;html=0;fontSize=14;fontStyle=1;shadow=1;fillColor=#d5e8d4;strokeColor=#82b366;fontColor=#1A3300;"
BOX_MAN = "rounded=1;whiteSpace=wrap;html=0;fontSize=14;fontStyle=1;shadow=1;fillColor=#ffe6cc;strokeColor=#d79b00;fontColor=#4D3300;"
BOX_ADM = "rounded=1;whiteSpace=wrap;html=0;fontSize=14;fontStyle=1;shadow=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontColor=#3A2152;"
BOX_FUT = "dashed=1;rounded=1;whiteSpace=wrap;html=0;fontSize=14;fontStyle=1;shadow=1;fillColor=#fff2cc;strokeColor=#d6b656;fontColor=#4D3B11;"
BOX_ERR = "rounded=1;whiteSpace=wrap;html=0;fontSize=14;fontStyle=1;shadow=1;fillColor=#f8cecc;strokeColor=#b85450;fontColor=#660000;"
GATE = "rhombus;whiteSpace=wrap;html=0;fontSize=14;fontStyle=1;shadow=1;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;"

STYLE_TITLE = "text;html=0;fontSize=24;fontStyle=1;align=left;fontColor=#1ba1e2;"
STYLE_DESC = "text;html=0;fontSize=14;align=left;whiteSpace=wrap;fontColor=#444444;"
STYLE_LEGEND = "rounded=1;whiteSpace=wrap;html=0;fontSize=12;align=center;shadow=1;fillColor=#fafafa;strokeColor=#e6e6e6;"

def add_legend(root, x, y):
    add_node(root, "leg_bg", "", STYLE_LEGEND, x, y, 1080, 80)
    add_node(root, "leg_lbl", "LEGEND:", "text;html=0;fontSize=14;fontStyle=1;", x+20, y+30, 80, 20)
    add_node(root, "leg_b1", "User Action\n(Current)", BOX_CUR, x+100, y+20, 140, 40)
    add_node(root, "leg_b2", "System Auto\n(Current)", BOX_SYS, x+260, y+20, 140, 40)
    add_node(root, "leg_b3", "Manual / Offline", BOX_MAN, x+420, y+20, 140, 40)
    add_node(root, "leg_b4", "Admin Override", BOX_ADM, x+580, y+20, 140, 40)
    add_node(root, "leg_b5", "Blocked / Error\n/ Expired", BOX_ERR, x+740, y+20, 140, 40)
    add_node(root, "leg_b6", "Proposed Future", BOX_FUT, x+900, y+20, 140, 40)

def flow_layout(root, prefix, title, desc, nodes, edges):
    add_node(root, f"{prefix}_t", title, STYLE_TITLE, 50, 40, 1100, 40)
    if desc:
        add_node(root, f"{prefix}_d", desc, STYLE_DESC, 50, 90, 1100, 60)
    
    for n in nodes:
        node_id, label, style, x, y, w, h = n
        add_node(root, f"{prefix}_{node_id}", label, style, x, y, w, h)
        
    for e in edges:
        edge_id, src, tgt, label = e
        add_edge(root, f"{prefix}_{edge_id}", f"{prefix}_{src}", f"{prefix}_{tgt}", label)
        
    add_legend(root, 50, 700)

def generate_file():
    mxfile = create_mxfile()

    # 1. Company Registration
    diagram, root = create_diagram("1. Company Registration", "p1")
    nodes_1 = [
        ("n1", "1. Create Profile\n(POST /companies)", BOX_CUR, 80, 200, 140, 80),
        ("n2", "2. Status: Pending\n(Visitor Access Only)", BOX_SYS, 260, 200, 140, 80),
        ("n3", "3. Blocked from\nMarketplace", BOX_ERR, 260, 340, 140, 80),
        ("n4", "4. Admin Verifies\nOffline Documents", BOX_MAN, 440, 200, 140, 80),
        ("n5", "5. Admin Review", GATE, 620, 190, 120, 100),
        ("n6", "6a. Status: Approved\n(PATCH /license)", BOX_ADM, 800, 120, 140, 80),
        ("n7", "6b. Status: Rejected\n(PATCH /license)", BOX_ERR, 800, 280, 140, 80),
        ("n8", "7. Full Marketplace\nAccess Granted", BOX_SYS, 980, 120, 140, 80)
    ]
    edges_1 = [
        ("e1", "n1", "n2", ""), ("e2", "n2", "n3", "Blocks"), ("e3", "n2", "n4", ""),
        ("e4", "n4", "n5", ""), ("e5", "n5", "n6", "Valid"), ("e6", "n5", "n7", "Invalid"),
        ("e7", "n6", "n8", "")
    ]
    flow_layout(root, "p1", "Company Registration & Approval", "Registration sets company to pending. Admin manually reviews documents and overrides license status.", nodes_1, edges_1)
    mxfile.append(diagram)

    # 2. Marketplace Listing Flow (CORRECTED)
    diagram, root = create_diagram("2. Marketplace Listing", "p2")
    nodes_2 = [
        ("n1", "1. Create Listing\n(POST /listings)", BOX_CUR, 80, 200, 140, 80),
        ("n2", "2. Status: Open", BOX_SYS, 260, 200, 140, 80),
        ("n3", "3. Eligibility Check\n(is_sensitive)", BOX_SYS, 440, 200, 140, 80),
        ("n4", "4. Listing State", GATE, 620, 190, 120, 100),
        ("n5", "5a. Manual Cancel\n(POST /cancel)", BOX_CUR, 800, 120, 140, 80),
        ("n6", "5b. Offer Accepted\n(POST /offers/:id/accept)", BOX_CUR, 800, 280, 140, 80),
        ("n8", "6a. Status: Cancelled\n(Only if no deals)", BOX_ERR, 1000, 120, 140, 80),
        ("n9", "6b. Status: Closed\n(Auto-Close on Deal)", BOX_SYS, 1000, 280, 140, 80)
    ]
    edges_2 = [
        ("e1", "n1", "n2", ""), ("e2", "n2", "n3", ""), ("e3", "n3", "n4", ""),
        ("e4", "n4", "n5", "User Cancels"), ("e5", "n4", "n6", "Offer Accepted"),
        ("e7", "n6", "n9", "Auto"), ("e8", "n5", "n8", "")
    ]
    flow_layout(root, "p2", "Marketplace Listing Flow", "Listing moves to 'closed' upon offer acceptance. Manual cancel only if no accepted offers. No auto-expiry for listings.", nodes_2, edges_2)
    mxfile.append(diagram)

    # 3. Offers & Deals Flow
    diagram, root = create_diagram("3. Offers & Deals", "p3")
    nodes_3 = [
        ("n1", "1. Submit Offer\n(POST /offers)", BOX_CUR, 80, 200, 140, 80),
        ("n2", "2. License Check\n(Blocked?)", GATE, 260, 190, 120, 100),
        ("n3", "Status: Blocked", BOX_ERR, 260, 340, 140, 80),
        ("n4", "3. Status: Pending\n(Offer)", BOX_SYS, 440, 200, 140, 80),
        ("n5", "4. Seller Accepts\n(POST /accept)", BOX_CUR, 620, 200, 140, 80),
        ("n6", "5. Reject Other\nOffers Automatically", BOX_SYS, 800, 200, 140, 80),
        ("n7", "6. Create Deal\n(Status: Active)", BOX_SYS, 980, 200, 140, 80)
    ]
    edges_3 = [
        ("e1", "n1", "n2", ""), ("e2", "n2", "n3", "Invalid"), ("e3", "n2", "n4", "Valid"),
        ("e4", "n4", "n5", ""), ("e5", "n5", "n6", ""), ("e6", "n6", "n7", "")
    ]
    flow_layout(root, "p3", "Offers & Deals Flow", "Offers remain pending until seller accepts. Acceptance creates an 'active' deal and rejects all competing offers.", nodes_3, edges_3)
    mxfile.append(diagram)

    # 4. Deal Lifecycle (CORRECTED)
    diagram, root = create_diagram("4. Deal Lifecycle", "p4")
    nodes_4 = [
        ("n1", "Active Deal", BOX_SYS, 50, 240, 100, 60),
        ("n2", "payment_submitted\n(Buyer)", BOX_CUR, 180, 240, 140, 60),
        ("n3", "payment_confirmed\n(Seller)", BOX_CUR, 350, 240, 140, 60),
        ("n4", "dispatched\n(requires dispatch data,\nactual_qty if by_weight)", BOX_CUR, 520, 230, 140, 80),
        ("n5", "completed\n(Buyer Confirm Receipt)", BOX_CUR, 700, 240, 160, 60),
        ("n6", "Deal Success", BOX_SYS, 900, 240, 120, 60),
        ("a1", "Admin: force-complete", BOX_ADM, 700, 120, 160, 60),
        ("a2", "Admin: reopen", BOX_ADM, 900, 120, 120, 60),
        ("e1", "3 days Warning\n(Jobs)", BOX_SYS, 180, 360, 140, 60),
        ("e2", "expired (Cron Job)", BOX_ERR, 350, 360, 140, 60),
        ("e3", "cancelled (Seller)", BOX_CUR, 520, 360, 140, 60),
        ("a3", "Admin: request resub", BOX_ADM, 180, 120, 140, 60),
        ("a4", "Admin: cancel", BOX_ADM, 520, 120, 140, 60)
    ]
    edges_4 = [
        ("f1", "n1", "n2", ""), ("f2", "n2", "n3", ""), ("f3", "n3", "n4", ""), ("f4", "n4", "n5", "Immediate"), ("f5", "n5", "n6", ""),
        ("f6", "a1", "n6", "Overrides"), ("f7", "n6", "a2", "Restore"),
        ("f8", "n1", "e1", "Timeout"), ("f9", "e1", "e2", ""),
        ("f10", "n1", "e3", "Cancel"), ("f11", "a3", "n1", "Resets Pmt"),
        ("f12", "a4", "e3", "Overrides")
    ]
    flow_layout(root, "p4", "Deal Lifecycle (Core Flow)", "Immediate completion on receipt. Expiry jobs run on timeouts (e.g. 31 days from active). Admin can override.", nodes_4, edges_4)
    mxfile.append(diagram)

    # 5. Operational Contracts
    diagram, root = create_diagram("5. Operational Contracts", "p5")
    nodes_5 = [
        ("n1", "1. Draft Contract", BOX_CUR, 80, 200, 140, 80),
        ("n2", "2. Define Parties,\nMaterials, Prices", BOX_CUR, 260, 200, 140, 80),
        ("n3", "3. Select Weight\nPolicy (Locked)", BOX_CUR, 440, 200, 140, 80),
        ("n4", "4. pending_confirmation\n(Submit to Counter)", BOX_SYS, 620, 200, 140, 80),
        ("n5", "5. Gate: Accept?", GATE, 800, 190, 120, 100),
        ("n6", "6a. Status: active", BOX_SYS, 980, 120, 140, 80),
        ("n7", "6b. Status: cancelled", BOX_ERR, 980, 280, 140, 80)
    ]
    edges_5 = [
        ("e1", "n1", "n2", ""), ("e2", "n2", "n3", ""), ("e3", "n3", "n4", ""),
        ("e4", "n4", "n5", ""), ("e5", "n5", "n6", "Yes"), ("e6", "n5", "n7", "No")
    ]
    flow_layout(root, "p5", "Operational Contracts", "Draft to Active contract flow. Policy selection is immutable after creation. Linked to future shipments.", nodes_5, edges_5)
    mxfile.append(diagram)

    # 6. Shipments & Weights (CORRECTED)
    diagram, root = create_diagram("6. Shipments & Weights", "p6")
    nodes_6 = [
        ("n1", "1. Status: planned", BOX_CUR, 50, 200, 140, 80),
        ("n2", "2. Status: dispatched\n(Source Weight)", BOX_CUR, 220, 200, 140, 80),
        ("n3", "3. Status: received\n(Dest Weight)", BOX_CUR, 390, 200, 140, 80),
        ("n4", "4. Close Action\n(POST /close)", BOX_CUR, 560, 200, 140, 80),
        ("n5", "5. Apply Contract\nWeight Policy", BOX_SYS, 730, 200, 140, 80),
        ("n6", "6. Calculate Final\nWeight & Value", BOX_SYS, 900, 200, 140, 80),
        ("n7", "7. Values Locked\n(Status: closed)", BOX_SYS, 1070, 200, 120, 80)
    ]
    edges_6 = [
        ("e1", "n1", "n2", ""), ("e2", "n2", "n3", ""), ("e3", "n3", "n4", ""),
        ("e4", "n4", "n5", "Triggers"), ("e5", "n5", "n6", ""), ("e6", "n6", "n7", "")
    ]
    flow_layout(root, "p6", "Shipments & Weights", "Shipments are tied to Active Contracts. Explicit Close action freezes values based on Contract policy.", nodes_6, edges_6)
    mxfile.append(diagram)

    # 7. Reports (CORRECTED)
    diagram, root = create_diagram("7. Reports", "p7")
    nodes_7 = [
        ("n1", "1. Deals Report\n(Filter: status/dates)", BOX_CUR, 80, 120, 140, 80),
        ("n2", "Fetch Deals\n(completed/cancelled)", BOX_SYS, 260, 120, 140, 80),
        ("n3", "1b. Contract Shipments\nReport (Filter: contract)", BOX_CUR, 80, 280, 140, 80),
        ("n4", "Fetch Shipments\n(closed_at/status)", BOX_SYS, 260, 280, 140, 80),
        ("n5", "Calculate VAT\n(Operational Values Only)", BOX_SYS, 440, 200, 140, 80),
        ("n6", "Render CSV Data", BOX_SYS, 620, 200, 140, 80),
        ("n7", "Export CSV File", BOX_SYS, 800, 200, 140, 80)
    ]
    edges_7 = [
        ("e1", "n1", "n2", ""), ("e2", "n3", "n4", ""), 
        ("e3", "n2", "n5", ""), ("e4", "n4", "n5", ""),
        ("e5", "n5", "n6", ""), ("e6", "n6", "n7", "")
    ]
    flow_layout(root, "p7", "Reports (Deals & Shipments)", "Deals export fetches completed/cancelled. Shipments export fetches based on closed_at.", nodes_7, edges_7)
    mxfile.append(diagram)

    # 8. Current Transport Quote Lite (CORRECTED)
    diagram, root = create_diagram("8. Transport Quote Lite", "p8")
    nodes_8 = [
        ("n1", "1. Request Transport\n(POST /deals/:dealId/\ntransport-request)", BOX_CUR, 80, 200, 140, 80),
        ("n2", "2. Carrier Submit Quote\n(Status: submitted)", BOX_CUR, 260, 200, 140, 80),
        ("n3", "3. Admin Reviews Bids\n(Status: under_review)", BOX_ADM, 440, 200, 140, 80),
        ("n4", "4. Admin Selects Quote\n(Status: selected)", BOX_ADM, 620, 200, 140, 80),
        ("n5", "4b. Reject Bids\n(Status: rejected)", BOX_ADM, 620, 320, 140, 80),
        ("n6", "5. Manual Coordination\nPhone / Email", BOX_MAN, 800, 200, 140, 80),
        ("n7", "6. Admin Updates Status\n(in_transit -> completed)", BOX_ADM, 980, 200, 140, 80)
    ]
    edges_8 = [
        ("e1", "n1", "n2", ""), ("e2", "n2", "n3", ""), ("e3", "n3", "n4", "Select"),
        ("e4", "n3", "n5", "Reject"), ("e5", "n4", "n6", "Ops"), ("e6", "n6", "n7", "")
    ]
    flow_layout(root, "p8", "Current Transport Quote Lite", "Carriers bid on requests. Admin reviews and selects bids via UI. Final execution remains manual offline.", nodes_8, edges_8)
    mxfile.append(diagram)

    # 9. Future Licensed Transporter Marketplace (CORRECTED)
    diagram, root = create_diagram("9. Future Transporters", "p9")
    nodes_9 = [
        ("n1", "1. Auto Broadcast\nto Matching Carriers", BOX_FUT, 80, 200, 140, 80),
        ("n2", "2. Dynamic Bidding\nPlatform", BOX_FUT, 260, 200, 140, 80),
        ("n3", "3. Smart Match\n& Auto Select", BOX_FUT, 440, 200, 140, 80),
        ("n4", "4. API Link Driver\n& Vehicle Plate", BOX_FUT, 620, 200, 140, 80),
        ("n5", "5. Live GPS Tracking\nIntegration", BOX_FUT, 800, 200, 140, 80),
        ("n6", "6. Performance Scoring\n& Operational Closure", BOX_FUT, 980, 200, 140, 80)
    ]
    edges_9 = [
        ("e1", "n1", "n2", ""), ("e2", "n2", "n3", ""), ("e3", "n3", "n4", ""), ("e4", "n4", "n5", ""), ("e5", "n5", "n6", "")
    ]
    flow_layout(root, "p9", "Future Proposed: Licensed Transporter Marketplace", "Fully automated bidding, selection, and tracking. NOT implemented.", nodes_9, edges_9)
    mxfile.append(diagram)

    # 10. Future Recycled Materials Marketplace
    diagram, root = create_diagram("10. Future Recycled", "p10")
    nodes_10 = [
        ("n1", "1. Processor Publishes\nRecycled Material", BOX_FUT, 80, 200, 140, 80),
        ("n2", "2. Upload Quality\nSpecs & Certs", BOX_FUT, 260, 200, 140, 80),
        ("n3", "3. Factories Browse\nProcessed Goods", BOX_FUT, 440, 200, 140, 80),
        ("n4", "4. Direct Purchase\nOrder / Offer", BOX_FUT, 620, 200, 140, 80),
        ("n5", "5. Quality Assurance\nVerification Step", BOX_FUT, 800, 200, 140, 80),
        ("n6", "6. Delivery & Closure", BOX_FUT, 980, 200, 140, 80)
    ]
    edges_10 = [
        ("e1", "n1", "n2", ""), ("e2", "n2", "n3", ""), ("e3", "n3", "n4", ""), ("e4", "n4", "n5", ""), ("e5", "n5", "n6", "")
    ]
    flow_layout(root, "p10", "Future Proposed: Recycled Materials Marketplace", "A B2B market for processed/recycled goods (Processor -> Factory). NOT implemented.", nodes_10, edges_10)
    mxfile.append(diagram)

    # 11. Admin Operations
    diagram, root = create_diagram("11. Admin Ops", "p11")
    nodes_11 = [
        ("n1", "Admin Panel UI", BOX_ADM, 80, 200, 140, 80),
        ("n2", "Company Licenses\n(Approve/Reject)", BOX_ADM, 280, 80, 140, 80),
        ("n3", "Deal Interventions\n(Force/Cancel/Resub)", BOX_ADM, 280, 200, 140, 80),
        ("n4", "Master Data\n(Categories/Units)", BOX_ADM, 280, 320, 140, 80),
        ("n5", "API Only Lookup\n(Capabilities)", BOX_ERR, 480, 320, 140, 80),
        ("n6", "Audit Log\nImmutable DB Writes", BOX_SYS, 540, 200, 140, 80)
    ]
    edges_11 = [
        ("e1", "n1", "n2", ""), ("e2", "n1", "n3", ""), ("e3", "n1", "n4", ""), ("e4", "n4", "n5", "No UI"),
        ("e5", "n2", "n6", "Logs"), ("e6", "n3", "n6", "Logs")
    ]
    flow_layout(root, "p11", "Admin Operations & Lookups", "Admin controls exist natively in UI. Master data (Capabilities) lacks a UI endpoint currently.", nodes_11, edges_11)
    mxfile.append(diagram)

    # 12. Admin Findings & Wishlist (CORRECTED)
    diagram, root = create_diagram("12. Admin Findings", "p12")
    nodes_12 = [
        ("n1", "1. Log Finding\n(POST /findings)", BOX_ADM, 80, 200, 140, 80),
        ("n2", "2. Assign Attributes\n(source_label)", BOX_ADM, 260, 200, 140, 80),
        ("n3", "3. Reorder Priority\n(Up/Down Arrows)", BOX_ADM, 440, 200, 140, 80),
        ("n4", "4. Edit Status\n(new, under_review,\naccepted, deferred...)", BOX_ADM, 620, 200, 140, 80),
        ("n5", "5a. Status: closed", BOX_SYS, 800, 120, 140, 80),
        ("n6", "5b. Delete Record\n(DELETE /findings)", BOX_ADM, 800, 280, 140, 80)
    ]
    edges_12 = [
        ("e1", "n1", "n2", ""), ("e2", "n2", "n3", ""), ("e3", "n3", "n4", ""), ("e4", "n4", "n5", "Done"), ("e5", "n4", "n6", "Remove")
    ]
    flow_layout(root, "p12", "Admin Findings & Wishlist (Zero DB Relation)", "Completely isolated tracking system for partner requests and internal prioritization.", nodes_12, edges_12)
    mxfile.append(diagram)

    tree = ET.ElementTree(mxfile)
    ET.indent(tree, space="\t", level=0)
    tree.write("docs/Tadweerah_Operational_Truth_Workflows_v5.drawio", encoding="utf-8", xml_declaration=True)
    print("v5 corrected successfully.")

if __name__ == "__main__":
    generate_file()
