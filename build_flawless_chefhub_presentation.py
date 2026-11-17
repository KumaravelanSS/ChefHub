import zipfile
import os
import xml.etree.ElementTree as ET

# Namespaces
NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"
NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

ET.register_namespace('a', NS_A)
ET.register_namespace('p', NS_P)
ET.register_namespace('r', NS_R)

TEMPLATE_PATH = "DBMS_Project_Presentation_Template.pptx"
TARGET_FILES = [
    "ChefHub_DBMS_Project_Presentation.pptx",
    "ChefHub_Perfect_Presentation.pptx"
]

TOTAL_SLIDES = 21

def create_p_node(text, sz=1200, b=0, color="2D3748", is_bullet=True, space_after=180):
    p = ET.Element(f"{{{NS_A}}}p")
    pPr = ET.Element(f"{{{NS_A}}}pPr")
    
    if space_after > 0:
        spcAft = ET.SubElement(pPr, f"{{{NS_A}}}spcAft")
        ET.SubElement(spcAft, f"{{{NS_A}}}spcPts", {'val': str(space_after)})
    
    defRPr = ET.SubElement(pPr, f"{{{NS_A}}}defRPr", {'sz': str(sz), 'b': str(b)})
    solidFill = ET.SubElement(defRPr, f"{{{NS_A}}}solidFill")
    ET.SubElement(solidFill, f"{{{NS_A}}}srgbClr", {'val': color})
    ET.SubElement(defRPr, f"{{{NS_A}}}latin", {'typeface': 'Aptos'})
    p.append(pPr)
    
    r = ET.Element(f"{{{NS_A}}}r")
    rPr = ET.Element(f"{{{NS_A}}}rPr", {'sz': str(sz), 'b': str(b)})
    rSolidFill = ET.SubElement(rPr, f"{{{NS_A}}}solidFill")
    ET.SubElement(rSolidFill, f"{{{NS_A}}}srgbClr", {'val': color})
    ET.SubElement(rPr, f"{{{NS_A}}}latin", {'typeface': 'Aptos'})
    r.append(rPr)
    
    t = ET.Element(f"{{{NS_A}}}t")
    bullet_prefix = "•  " if is_bullet and not text.startswith("•") else ""
    t.text = f"{bullet_prefix}{text}"
    r.append(t)
    p.append(r)
    return p

def create_shape(id_num, name, x, y, cx, cy, fill_color=None, border_color=None, is_round=False):
    sp = ET.Element(f"{{{NS_P}}}sp")
    nvSpPr = ET.SubElement(sp, f"{{{NS_P}}}nvSpPr")
    ET.SubElement(nvSpPr, f"{{{NS_P}}}cNvPr", {'id': str(id_num), 'name': name})
    
    if fill_color is None:
        ET.SubElement(nvSpPr, f"{{{NS_P}}}cNvSpPr", {'txBox': '1'})
    else:
        ET.SubElement(nvSpPr, f"{{{NS_P}}}cNvSpPr")
        
    ET.SubElement(nvSpPr, f"{{{NS_P}}}nvPr")
    
    spPr = ET.SubElement(sp, f"{{{NS_P}}}spPr")
    xfrm = ET.SubElement(spPr, f"{{{NS_A}}}xfrm")
    ET.SubElement(xfrm, f"{{{NS_A}}}off", {'x': str(x), 'y': str(y)})
    ET.SubElement(xfrm, f"{{{NS_A}}}ext", {'cx': str(cx), 'cy': str(cy)})
    
    geom = "roundRect" if is_round else "rect"
    prstGeom = ET.SubElement(spPr, f"{{{NS_A}}}prstGeom", {'prst': geom})
    ET.SubElement(prstGeom, f"{{{NS_A}}}avLst")
    
    if fill_color:
        solidFill = ET.SubElement(spPr, f"{{{NS_A}}}solidFill")
        ET.SubElement(solidFill, f"{{{NS_A}}}srgbClr", {'val': fill_color})
    else:
        ET.SubElement(spPr, f"{{{NS_A}}}noFill")
        
    if border_color:
        ln = ET.SubElement(spPr, f"{{{NS_A}}}ln", {'w': '25400'})
        lnFill = ET.SubElement(ln, f"{{{NS_A}}}solidFill")
        ET.SubElement(lnFill, f"{{{NS_A}}}srgbClr", {'val': border_color})
        
    txBody = ET.SubElement(sp, f"{{{NS_P}}}txBody")
    ET.SubElement(txBody, f"{{{NS_A}}}bodyPr", {
        'wrap': 'square', 'lIns': '73152', 'tIns': '73152', 
        'rIns': '73152', 'bIns': '73152', 'anchor': 't'
    })
    ET.SubElement(txBody, f"{{{NS_A}}}lstStyle")
    return sp, txBody

def create_pic_node(id_num, name, r_id, x, y, cx, cy):
    pic = ET.Element(f"{{{NS_P}}}pic")
    nvPicPr = ET.SubElement(pic, f"{{{NS_P}}}nvPicPr")
    ET.SubElement(nvPicPr, f"{{{NS_P}}}cNvPr", {'id': str(id_num), 'name': name})
    cNvPicPr = ET.SubElement(nvPicPr, f"{{{NS_P}}}cNvPicPr")
    ET.SubElement(cNvPicPr, f"{{{NS_A}}}picLocks", {'noChangeAspect': '1'})
    ET.SubElement(nvPicPr, f"{{{NS_P}}}nvPr")
    
    blipFill = ET.SubElement(pic, f"{{{NS_P}}}blipFill")
    ET.SubElement(blipFill, f"{{{NS_A}}}blip", {f"{{{NS_R}}}embed": r_id})
    stretch = ET.SubElement(blipFill, f"{{{NS_A}}}stretch")
    ET.SubElement(stretch, f"{{{NS_A}}}fillRect")
    
    spPr = ET.SubElement(pic, f"{{{NS_P}}}spPr")
    xfrm = ET.SubElement(spPr, f"{{{NS_A}}}xfrm")
    ET.SubElement(xfrm, f"{{{NS_A}}}off", {'x': str(x), 'y': str(y)})
    ET.SubElement(xfrm, f"{{{NS_A}}}ext", {'cx': str(cx), 'cy': str(cy)})
    
    prstGeom = ET.SubElement(spPr, f"{{{NS_A}}}prstGeom", {'prst': 'roundRect'})
    ET.SubElement(prstGeom, f"{{{NS_A}}}avLst")
    
    ln = ET.SubElement(spPr, f"{{{NS_A}}}ln", {'w': '25400'})
    lnFill = ET.SubElement(ln, f"{{{NS_A}}}solidFill")
    ET.SubElement(lnFill, f"{{{NS_A}}}srgbClr", {'val': 'CBD5E1'})
    
    return pic

def append_slide_footer_and_transition(sld, trans_type="fade", trans_dir=None):
    clrMap = ET.SubElement(sld, f"{{{NS_P}}}clrMapOvr")
    ET.SubElement(clrMap, f"{{{NS_A}}}masterClrMapping")
    
    trans = ET.SubElement(sld, f"{{{NS_P}}}transition", {'spd': 'med', 'advClick': '1'})
    if trans_type == "fade":
        ET.SubElement(trans, f"{{{NS_P}}}fade")
    elif trans_type == "wipe":
        ET.SubElement(trans, f"{{{NS_P}}}wipe", {'dir': trans_dir or 'r'})
    elif trans_type == "push":
        ET.SubElement(trans, f"{{{NS_P}}}push", {'dir': trans_dir or 'l'})
    elif trans_type == "split":
        ET.SubElement(trans, f"{{{NS_P}}}split", {'outIn': 'out', 'orient': trans_dir or 'horz'})
    elif trans_type == "wheel":
        ET.SubElement(trans, f"{{{NS_P}}}wheel", {'numSpokes': '4'})

def build_base_slide(title, subtitle, slide_num, total_slides=21):
    sld = ET.Element(f"{{{NS_P}}}sld")
    cSld = ET.SubElement(sld, f"{{{NS_P}}}cSld")
    bg = ET.SubElement(cSld, f"{{{NS_P}}}bg")
    bgPr = ET.SubElement(bg, f"{{{NS_P}}}bgPr")
    solidFill = ET.SubElement(bgPr, f"{{{NS_A}}}solidFill")
    ET.SubElement(solidFill, f"{{{NS_A}}}srgbClr", {'val': 'FFFFFF'})
    ET.SubElement(bgPr, f"{{{NS_A}}}effectLst")
    
    spTree = ET.SubElement(cSld, f"{{{NS_P}}}spTree")
    nvGrpSpPr = ET.SubElement(spTree, f"{{{NS_P}}}nvGrpSpPr")
    ET.SubElement(nvGrpSpPr, f"{{{NS_P}}}cNvPr", {'id': '1', 'name': ''})
    ET.SubElement(nvGrpSpPr, f"{{{NS_P}}}cNvGrpSpPr")
    ET.SubElement(nvGrpSpPr, f"{{{NS_P}}}nvPr")
    
    grpSpPr = ET.SubElement(spTree, f"{{{NS_P}}}grpSpPr")
    xfrm = ET.SubElement(grpSpPr, f"{{{NS_A}}}xfrm")
    ET.SubElement(xfrm, f"{{{NS_A}}}off", {'x': '0', 'y': '0'})
    ET.SubElement(xfrm, f"{{{NS_A}}}ext", {'cx': '0', 'cy': '0'})
    ET.SubElement(xfrm, f"{{{NS_A}}}chOff", {'x': '0', 'y': '0'})
    ET.SubElement(xfrm, f"{{{NS_A}}}chExt", {'cx': '0', 'cy': '0'})
    
    # Title
    sp_title, tb_title = create_shape(2, "SlideTitle", 502920, 256032, 11064240, 502920)
    tb_title.append(create_p_node(title, sz=2400, b=1, color="182D4B", is_bullet=False, space_after=0))
    spTree.append(sp_title)
    
    # Subtitle
    sp_sub, tb_sub = create_shape(3, "SlideSub", 530352, 780000, 10972800, 320040)
    tb_sub.append(create_p_node(subtitle, sz=1100, b=0, color="647382", is_bullet=False, space_after=0))
    spTree.append(sp_sub)
    
    # Divider line (Strict requirement: non-empty txBody)
    sp_div, tb_div = create_shape(4, "Divider", 530352, 1140000, 11109960, 25000, fill_color="E2E8F0")
    div_p = ET.Element(f"{{{NS_A}}}p")
    ET.SubElement(div_p, f"{{{NS_A}}}endParaRPr")
    tb_div.append(div_p)
    spTree.append(sp_div)
    
    # Slide Number
    sp_num, tb_num = create_shape(5, "SlideNum", 11247120, 6510528, 411480, 182880)
    tb_num.append(create_p_node(f"{slide_num}", sz=900, b=0, color="94A3B8", is_bullet=False, space_after=0))
    spTree.append(sp_num)
    
    # Footer
    sp_foot, tb_foot = create_shape(6, "SlideFooter", 548640, 6492240, 7315200, 182880)
    tb_foot.append(create_p_node("DBMS PROJECT PRESENTATION  |  ChefHub Hyper-Local Cloud Kitchen Ecosystem", sz=900, b=0, color="94A3B8", is_bullet=False, space_after=0))
    spTree.append(sp_foot)
    
    return sld, spTree

def build_two_column_slide(title, subtitle, slide_num, left_bullets, right_card_title, right_card_bullets, is_accent=False, trans_type="fade", trans_dir=None):
    sld, spTree = build_base_slide(title, subtitle, slide_num)
    
    sp_left, tb_left = create_shape(10, "LeftContent", 685800, 1400000, 5600000, 4800000)
    for b in left_bullets:
        tb_left.append(create_p_node(b, sz=1200, b=0, color="334155", is_bullet=True, space_after=180))
    spTree.append(sp_left)
    
    fill = "F8FAFC" if not is_accent else "EFF6FF"
    border = "CBD5E1" if not is_accent else "93C5FD"
    # Proportional card height based on items to avoid empty whitespace
    card_h = min(4800000, 1100000 + len(right_card_bullets) * 550000)
    sp_right, tb_right = create_shape(11, "RightCard", 6537960, 1400000, 4950000, card_h, fill_color=fill, border_color=border, is_round=True)
    tb_right.append(create_p_node(right_card_title, sz=1400, b=1, color="1E3A8A" if is_accent else "1E293B", is_bullet=False, space_after=200))
    for b in right_card_bullets:
        tb_right.append(create_p_node(b, sz=1150, b=0, color="475569", is_bullet=True, space_after=150))
    spTree.append(sp_right)
    
    append_slide_footer_and_transition(sld, trans_type, trans_dir)
    return sld

def build_four_box_grid_slide(title, subtitle, slide_num, boxes, trans_type="split", trans_dir="horz"):
    sld, spTree = build_base_slide(title, subtitle, slide_num)
    
    coords = [
        (685800, 1400000),   # Box 1: top-left
        (6300000, 1400000),  # Box 2: top-right
        (685800, 3900000),   # Box 3: bottom-left
        (6300000, 3900000),  # Box 4: bottom-right
    ]
    box_w = 5200000
    box_h = 2300000
    
    for idx, (b_title, b_badge, b_bullets, fill, border) in enumerate(boxes):
        bx, by = coords[idx]
        sp, tb = create_shape(10 + idx, f"PortalCard{idx+1}", bx, by, box_w, box_h, fill_color=fill, border_color=border, is_round=True)
        tb.append(create_p_node(f"{b_badge}  {b_title}", sz=1350, b=1, color="0F172A", is_bullet=False, space_after=140))
        for bullet in b_bullets:
            tb.append(create_p_node(bullet, sz=1100, b=0, color="334155", is_bullet=True, space_after=100))
        spTree.append(sp)
        
    append_slide_footer_and_transition(sld, trans_type, trans_dir)
    return sld

def build_image_slide(title, subtitle, slide_num, bullets, r_id="rIdImg1", trans_type="push", trans_dir="l"):
    sld, spTree = build_base_slide(title, subtitle, slide_num)
    
    sp_left, tb_left = create_shape(10, "LeftContent", 685800, 1400000, 5200000, 4800000)
    for b in bullets:
        tb_left.append(create_p_node(b, sz=1200, b=0, color="334155", is_bullet=True, space_after=180))
    spTree.append(sp_left)
    
    pic = create_pic_node(20, "SlidePicture", r_id, 6200000, 1400000, 5300000, 4700000)
    spTree.append(pic)
    
    append_slide_footer_and_transition(sld, trans_type, trans_dir)
    return sld

def build_pipeline_slide(title, subtitle, slide_num, trans_type="wheel"):
    sld, spTree = build_base_slide(title, subtitle, slide_num)
    
    steps = [
        ("1. User Action", "Customer selects dishes\n& mode (Takeaway/Delivery)", "EFF6FF", "3B82F6"),
        ("2. React Front End", "Validates payload,\ncoordinates local state", "F0FDF4", "22C55E"),
        ("3. Express API", "Verifies JWT RBAC,\nstarts withTransaction()", "FEF3C7", "F59E0B"),
        ("4. Relational DB", "Atomically updates stock\n& writes escrow ledger", "FEE2E2", "EF4444"),
        ("5. Real-Time Push", "SSE streams live audio\n& pop-up to Chef Kitchen", "FAF5FF", "A855F7")
    ]
    
    box_w = 2000000
    gap = 180000
    start_x = 685800
    y_top = 1500000
    box_h = 2400000
    
    for idx, (header, text, fill, border) in enumerate(steps):
        bx = start_x + idx * (box_w + gap)
        sp_box, tb_box = create_shape(20 + idx, f"Step{idx+1}", bx, y_top, box_w, box_h, fill_color=fill, border_color=border, is_round=True)
        tb_box.append(create_p_node(header, sz=1300, b=1, color="0F172A", is_bullet=False, space_after=150))
        for line in text.split("\n"):
            tb_box.append(create_p_node(line, sz=1100, b=0, color="475569", is_bullet=False, space_after=100))
        spTree.append(sp_box)
        
    sp_bot, tb_bot = create_shape(30, "LifecycleCard", 685800, 4200000, 10744200, 1900000, fill_color="F8FAFC", border_color="CBD5E1", is_round=True)
    tb_bot.append(create_p_node("Order State Machine Lifecycle & ACID Guarantees:", sz=1350, b=1, color="1E293B", is_bullet=False, space_after=120))
    tb_bot.append(create_p_node("PLACED (Created & Escrow Locked)  →  ACCEPTED (Chef Confirmed)  →  PREPARING (In Kitchen)  →  READY (Packaged)  →  DELIVERED (Handover & Release)", sz=1150, b=0, color="2563EB", is_bullet=False, space_after=80))
    tb_bot.append(create_p_node("• Takeaway Concurrency: If order is TAKEAWAY, delivery fee = ₹0 and escrow is routed 95% chef / 0% rider. Counter pickup auto-hides map.", sz=1050, b=0, color="647382", is_bullet=False, space_after=50))
    tb_bot.append(create_p_node("• Delivery Concurrency: If DELIVERY, rider claims with single-claim optimistic lock (UPDATE ... WHERE rider_id IS NULL) preventing double pickup.", sz=1050, b=0, color="647382", is_bullet=False, space_after=0))
    spTree.append(sp_bot)
    
    append_slide_footer_and_transition(sld, trans_type)
    return sld

def run():
    print("Reading base template...")
    with zipfile.ZipFile(TEMPLATE_PATH, 'r') as zin:
        file_map = {item.filename: zin.read(item.filename) for item in zin.infolist()}

    # Add all 5 images to ppt/media/
    image_files = {
        'customer_takeaway_filter.png': 'presentation_images/customer_takeaway_filter.png',
        'customer_hash_search.jpg': 'presentation_images/customer_hash_search.jpg',
        'rider_gps_navigation.png': 'presentation_images/rider_gps_navigation.png',
        'admin_user_registry.jpg': 'presentation_images/admin_user_registry.jpg',
        'admin_edit_user.png': 'presentation_images/admin_edit_user.png',
    }
    
    for zip_name, local_path in image_files.items():
        with open(local_path, 'rb') as f:
            file_map[f'ppt/media/{zip_name}'] = f.read()

    slides = {}
    rels = {}

    std_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout7.xml"/></Relationships>'''.encode('utf-8')

    def make_img_rels(img_zip_name):
        return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout7.xml"/><Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{img_zip_name}"/></Relationships>'''.encode('utf-8')

    # SLIDE 1: Title Slide (native string replacements)
    s1_xml = file_map['ppt/slides/slide1.xml'].decode('utf-8')
    s1_xml = s1_xml.replace('[PROJECT TITLE]', 'CHEFHUB')
    s1_xml = s1_xml.replace('[A concise one-line description of the database application]', 'Hyper-Local Cloud Kitchen Marketplace &amp; Escrow Management System')
    s1_xml = s1_xml.replace('[Name – Register No.]', 'Kumaravelan &amp; Team')
    s1_xml = s1_xml.replace('[Details]', 'Department of Computer Science &amp; Engineering')
    s1_xml = s1_xml.replace('[DD Month YYYY]', 'November 2026')
    s1_xml = s1_xml.replace('PROJECT PRESENTATION TEMPLATE', 'DBMS PROJECT EVALUATION PRESENTATION')
    s1_xml = s1_xml.replace('</p:sld>', '<p:transition spd="med" advClick="1"><p:fade/></p:transition></p:sld>')
    file_map['ppt/slides/slide1.xml'] = s1_xml.encode('utf-8')
    rels[1] = std_rels

    # SLIDE 2: 1. Problem Definition — The Real-World Challenge
    slides[2] = build_two_column_slide(
        title="1. Problem Definition — The Real-World Challenge",
        subtitle="Unorganized home kitchens and artisanal cloud food businesses operating without centralized software.",
        slide_num=2,
        left_bullets=[
            "Domain Context: Independent home chefs and boutique cloud kitchens preparing fresh meals locally.",
            "Existing Workflow: Informal phone calls, WhatsApp chat orders, handwritten pen-and-paper logs, and uncoordinated cash payments.",
            "Key Pain Points: Frequent inventory overselling (phantom orders), unfulfilled customer requests, and untracked cancellations.",
            "Lack of Financial Escrow: Chefs risk preparing orders without payment guarantee; customers risk losing money on cancelled food.",
            "Affected Stakeholders: Customers (frustrated by delays), Chefs (lost revenue), Riders (delivery confusion), and Platform Administrators."
        ],
        right_card_title="THE REALITY OF CLOUD KITCHENS",
        right_card_bullets=[
            "50%+ orders placed via chats without stock checks",
            "Zero automated stock synchronisation",
            "Disputed deliveries & duplicate rider dispatches",
            "No centralized database for audit trails or analytics",
            "Solution: A multi-tenant relational DBMS with ACID guarantees"
        ],
        trans_type="wipe", trans_dir="r"
    )
    rels[2] = std_rels

    # SLIDE 3: 1. Problem Definition — Why a Database Solution?
    slides[3] = build_two_column_slide(
        title="1. Problem Definition — Why a Database Solution?",
        subtitle="Why informal spreadsheets and chat channels fail, and why a relational DBMS is mandatory.",
        slide_num=3,
        left_bullets=[
            "ACID Transactional Consistency: Ensures inventory is deducted atomically; portions can never be oversold or drop below zero.",
            "Referential Integrity: Foreign keys strictly bind orders to valid registered customers, authorized chefs, and legitimate dishes.",
            "Automated Escrow Accounting: Guarantees fair payout splits (95% to chef, 5% platform commission) upon verified customer handover.",
            "Predictable State Machine: Enforces strictly sequential order statuses: PLACED → ACCEPTED → PREPARING → READY → DELIVERED.",
            "Concurrency Locking: Prevents two riders from claiming the same pickup, eliminating logistical collisions."
        ],
        right_card_title="ACID DATABASE vs SPREADSHEETS",
        right_card_bullets=[
            "Atomicity: Entire order commits or safely rolls back",
            "Consistency: Foreign keys prevent orphaned records",
            "Isolation: Multi-user checkout without race conditions",
            "Durability: Crash-proof relational transaction logging",
            "Security: Role-based permissions & salted passwords"
        ],
        is_accent=True,
        trans_type="push", trans_dir="l"
    )
    rels[3] = std_rels

    # SLIDE 4: 2. Project Objectives & Target Users (4 Distinct Portals in a 2x2 Grid)
    slides[4] = build_four_box_grid_slide(
        title="2. Project Objectives & 4 Tailored Portals",
        subtitle="Building an end-to-end, high-performance web platform connecting 4 distinct food stakeholders.",
        slide_num=4,
        boxes=[
            ("Customer Marketplace", "🛒 PORTAL 1", [
                "Interactive dish discovery with live search",
                "Veg-only switch & 20km geolocation slider",
                "Takeaway vs Home Delivery toggle (₹0 fee)",
                "Real-time order progress & privacy auto-hide"
            ], "EFF6FF", "93C5FD"),
            ("Chef Kitchen Portal", "🍳 PORTAL 2", [
                "Real-time live queue with sound & pop-ups",
                "Dynamic recipe category management",
                "Veg/Non-Veg FSSAI badges for menu items",
                "1-Click +20 stock restore across all dishes"
            ], "F0FDF4", "86EFAC"),
            ("Rider Logistics Portal", "🛵 PORTAL 3", [
                "Leaflet GPS route navigation (Chef → Customer)",
                "Interactive GPS movement coordinate simulator",
                "Anti-collision single claim delivery locking",
                "Shift Offline guard preventing order intake"
            ], "FEF3C7", "FDE047"),
            ("Master Admin Control", "🛡️ PORTAL 4", [
                "Centralized Global User Accounts Registry",
                "Dedicated role filters (Customer, Vendor, Rider)",
                "Full CRUD: Create, Edit modal, Ban & Delete",
                "Bcrypt password auditing & phone regex checks"
            ], "FAF5FF", "D8B4FE")
        ],
        trans_type="split", trans_dir="horz"
    )
    rels[4] = std_rels

    # SLIDE 5: 2. Project Scope — In Scope vs. Out of Scope
    slides[5] = build_two_column_slide(
        title="2. Project Scope — In Scope vs. Out of Scope",
        subtitle="Clearly defining system boundaries, implemented modules, and evaluation-specific features.",
        slide_num=5,
        left_bullets=[
            "In Scope — 11 Normalized Tables: 3NF/BCNF relational schemas for users, dishes, orders, recipes, inventory, and payouts.",
            "In Scope — Open Addressing Hash Search: Interactive Linear and Quadratic probing evaluator module with bucket inspector.",
            "In Scope — Takeaway vs Delivery: Customer takeaway mode with ₹0 delivery fee and kitchen counter pickup escrow routing.",
            "In Scope — Concurrency & Security: Bcrypt 10-round salted passwords, phone regex check, and optimistic rider locks.",
            "In Scope — 1-Click Stock Restore: Instant +20 portion restoration across all kitchen menu items in a single query."
        ],
        right_card_title="PROJECT BOUNDARIES",
        right_card_bullets=[
            "In Scope: Dual database engine (MySQL + SQLite fallback)",
            "In Scope: Real-time SSE push alerts for kitchen orders",
            "Out of Scope: Live external bank webhook settlements (simulated escrow ledger used)",
            "Out of Scope: Interstate / international shipping logistics (restricted to local 20km radius)"
        ],
        trans_type="wipe", trans_dir="r"
    )
    rels[5] = std_rels

    # SLIDE 6: 3. System Architecture — 3-Tier Layered Model
    slides[6] = build_two_column_slide(
        title="3. System Architecture — 3-Tier Layered Model",
        subtitle="End-to-end separation of concerns connecting client UI, Express REST API, and polyglot databases.",
        slide_num=6,
        left_bullets=[
            "Presentation Layer (Client): React 18 Single Page Application built with Vite, Tailwind CSS, Lucide icons, and Leaflet Maps.",
            "Application Layer (Logic / API): Node.js & Express.js REST API with JWT role-based access control and Server-Sent Events (SSE).",
            "Data Layer (DBMS / Storage): 11 Relational Tables with B-Tree indexes + MongoDB Document Store for audit trails and telemetry.",
            "Communication Protocols: HTTP/REST for transactional requests, SSE streams for real-time order alerts, and connection pooling.",
            "Security Architecture: Salted Bcrypt password hashing, role discrimination (Customer/Chef/Rider/Admin), and parameterized queries."
        ],
        right_card_title="ARCHITECTURAL HIGHLIGHTS",
        right_card_bullets=[
            "Presentation: Responsive across desktop and mobile",
            "Application: Sub-10ms response times, non-blocking I/O",
            "Data: Connection pooling via mysql2/promise",
            "Fallback: Automatic SQLite failover if MySQL offline",
            "Audit: Polyglot MongoDB sync for system events"
        ],
        is_accent=True,
        trans_type="push", trans_dir="l"
    )
    rels[6] = std_rels

    # SLIDE 7: 3. Problem Flow — End-to-End Order Lifecycle State Machine
    slides[7] = build_pipeline_slide(
        title="3. Problem Flow — Order Lifecycle & Concurrency Pipeline",
        subtitle="End-to-end pipeline from user interaction to ACID database commit and real-time broadcast.",
        slide_num=7,
        trans_type="wheel"
    )
    rels[7] = std_rels

    # SLIDE 8: 4. Software Requirements & Technology Justification
    slides[8] = build_two_column_slide(
        title="4. Software Requirements & Tech Stack Justification",
        subtitle="Selecting modern, industry-standard open-source tools with rigorous technical justification.",
        slide_num=8,
        left_bullets=[
            "Front End — React 18 & Vite: High-performance virtual DOM rendering, reactive state synchronization, and sub-second HMR.",
            "Styling & Maps — Tailwind CSS & Leaflet: Modular utility-first design and lightweight GPU-accelerated interactive map routing.",
            "Back End — Node.js & Express.js: Event-driven non-blocking I/O ideal for high-concurrency order placement and SSE push alerts.",
            "Primary Relational DBMS — MySQL 8.0: Robust 3NF relational integrity, foreign key cascading, and ACID transaction isolation.",
            "Relational Engine Fallback — SQLite: Zero-configuration embedded database ensuring 100% demo portability on any examiner machine.",
            "Document Store — MongoDB: Polyglot persistence for unstructured audit logs, real-time rider telemetry, and historical metrics."
        ],
        right_card_title="TECH JUSTIFICATION SUMMARY",
        right_card_bullets=[
            "100% Open-Source & Containerizable",
            "Dual Engine: MySQL 8.0 + SQLite fallback",
            "Sub-10ms query execution via B-Tree indexes",
            "Zero external cloud runtime dependencies",
            "Verified on Windows 10/11, macOS, and Linux"
        ],
        trans_type="fade"
    )
    rels[8] = std_rels

    # SLIDE 9: 5. Database Design — Entity Relationship (ER) Model
    slides[9] = build_two_column_slide(
        title="5. Database Design — Entity Relationship (ER) Model",
        subtitle="Mapping key entities, relationships, foreign keys, and cardinalities across 11 normalized tables.",
        slide_num=9,
        left_bullets=[
            "USERS Entity: Base table storing all accounts (Customers, Chefs, Riders, Admins) with role discriminators and salted password hashes.",
            "DISHES Entity: Menu catalog items owned by a Chef (1:N from Users). Stores base price, daily stock, category, and veg/non-veg flag.",
            "ORDERS Entity: Core transactional record binding Customer (FK), Chef Vendor (FK), and Delivery Rider (FK).",
            "ORDER_ITEMS Entity: Associative bridging entity resolving the (M:N) relationship between Orders and Dishes.",
            "DISH_RECIPES Entity: Associative entity mapping Dishes (M:N) to raw kitchen Inventory ingredients.",
            "PAYOUTS Entity: (1:1) financial escrow distribution record created atomically alongside each order."
        ],
        right_card_title="RELATIONAL CARDINALITIES",
        right_card_bullets=[
            "USERS (1) ────────< (N) ORDERS",
            "USERS (1) ────────< (N) DISHES",
            "ORDERS (M) >─────< (N) DISHES (order_items)",
            "DISHES (M) >─────< (N) INVENTORY (dish_recipes)",
            "ORDERS (1) ──────── (1) PAYOUTS",
            "All relationships enforced via Foreign Key constraints"
        ],
        is_accent=True,
        trans_type="push", trans_dir="l"
    )
    rels[9] = std_rels

    # SLIDE 10: 6. Database Design — 11 Relational Tables & 3NF Normalization
    slides[10] = build_two_column_slide(
        title="6. Database Design — 11 Relational Tables & 3NF Normalization",
        subtitle="Demonstrating strict relational normalization (3NF/BCNF) and integrity constraints.",
        slide_num=10,
        left_bullets=[
            "1NF Compliance: Every attribute contains only atomic, scalar values; no multi-valued lists or repeating groups.",
            "2NF Compliance: All non-key attributes are fully functionally dependent on the entire primary key (eliminated partial dependencies).",
            "3NF / BCNF Compliance: No transitive functional dependencies exist (no non-key attribute depends on another non-key attribute).",
            "Composite Primary Keys: Implemented in bridging tables `order_items (order_id, dish_id)` and `dish_recipes (dish_id, ingredient_id)`.",
            "Referential Cascades: Foreign keys utilize `ON DELETE CASCADE` for order line items and `RESTRICT` for critical user records."
        ],
        right_card_title="11 NORMALIZED TABLES",
        right_card_bullets=[
            "• users (user_id [PK], email, password, role, phone)",
            "• dishes (dish_id [PK], vendor_id [FK], price, stock)",
            "• orders (order_id [PK], customer_id, vendor_id, type)",
            "• order_items (order_id, dish_id, quantity, price)",
            "• payouts (payout_id, order_id, vendor_cut, rider_cut)",
            "• inventory, dish_recipes, coupons, wallets, otps",
            "• B-Tree Indexes: idx_orders_status, idx_orders_type"
        ],
        trans_type="wipe", trans_dir="r"
    )
    rels[10] = std_rels

    # SLIDE 11: 6. Advanced DBMS Feature — Open Addressing Hash Search
    slides[11] = build_two_column_slide(
        title="6. Advanced DBMS Feature — Open Addressing Hash Search",
        subtitle="Fulfilling evaluation criteria with in-engine Linear and Quadratic probing hash index algorithms.",
        slide_num=11,
        left_bullets=[
            "Evaluator Requirement: Implementation of Open Addressing Hash Indexing to demonstrate deep data structure concepts.",
            "Primary Hash Function: Horner's polynomial accumulator method: h0(key) = (sum(key[i] * 31^i)) mod M.",
            "Linear Probing: h(k, i) = (h0 + i) mod M. Simple sequential probe step (i = 1, 2, 3...) to locate next free slot.",
            "Quadratic Probing: h(k, i) = (h0 + i + i^2) mod M. Uses quadratic displacement to eliminate Primary Clustering.",
            "Interactive Inspector: Built directly into the frontend so evaluators can visually inspect bucket mappings in real time."
        ],
        right_card_title="HASH INDEX BENCHMARKS",
        right_card_bullets=[
            "Hash Table Size (M): 211 (Prime modulus)",
            "Active Dishes (N): 75 menu items indexed",
            "Load Factor (α): 0.355 (Well below 0.70 threshold)",
            "Average Probes: 1.2 probes per lookup",
            "Time Complexity: O(1) expected retrieval time",
            "Verified by automated test suite (npm test)"
        ],
        is_accent=True,
        trans_type="fade"
    )
    rels[11] = std_rels

    # SLIDE 12: 7. Implementation Screenshots — Customer Marketplace (SCREENSHOT: customer_takeaway_filter.png)
    slides[12] = build_image_slide(
        title="7. Customer Marketplace & Takeaway Mode",
        subtitle="Demonstrating Veg-Only filtering, 20km distance slider, and Takeaway vs Delivery mode routing.",
        slide_num=12,
        bullets=[
            "Veg-Only Filter: Instant client-side filter displaying solely vegetarian dishes (verified by FSSAI green dot symbol).",
            "20km Geolocation Radius: Dynamic distance slider filtering out cloud kitchens outside delivery boundaries.",
            "Takeaway Mode Toggle: Allows customer to switch between Home Delivery and Kitchen Counter Pickup.",
            "Zero Delivery Fee: Selecting Takeaway dynamically waives delivery fees and displays kitchen pickup counter details.",
            "Database Logic: Saves order_type = 'TAKEAWAY'. The payout engine automatically adjusts escrow (95% chef / 0% rider)."
        ],
        r_id="rIdImg1",
        trans_type="push", trans_dir="l"
    )
    rels[12] = make_img_rels("customer_takeaway_filter.png")

    # SLIDE 13: 7. Implementation Screenshots — DBMS Hash Search Inspector (SCREENSHOT: customer_hash_search.jpg)
    slides[13] = build_image_slide(
        title="7. DBMS Hash Search Inspector Modal",
        subtitle="Live evaluation modal visualizing open addressing hash bucket allocations and collision resolution.",
        slide_num=13,
        bullets=[
            "Evaluation Ready: Accessible directly from the customer search bar via the 'Quad' badge.",
            "Live Algorithm Switcher: Toggle seamlessly between Quadratic Probing and Linear Probing.",
            "Probe Sequence Visualizer: Displays the exact probe steps taken to resolve hash collisions (e.g., #184 → #186).",
            "Real-Time Telemetry: Displays current table size (M=211), total indexed keys (N=75), and load factor (α=0.355).",
            "Guaranteed O(1) Search: Demonstrates 0ms sub-millisecond expected query latency to the evaluation panel."
        ],
        r_id="rIdImg1",
        trans_type="wipe", trans_dir="r"
    )
    rels[13] = make_img_rels("customer_hash_search.jpg")

    # SLIDE 14: 7. Implementation Screenshots — Chef Kitchen Portal & 1-Click Stock Restore
    slides[14] = build_two_column_slide(
        title="7. Chef Kitchen Portal & 1-Click Stock Restoration",
        subtitle="Empowering cloud kitchens with real-time order queues, category controls, and automated inventory replenishment.",
        slide_num=14,
        left_bullets=[
            "Live Order Queue: Real-time order cards updated via SSE with top-right pop-up notifications and audio alerts.",
            "Dynamic Recipe Categories: Chefs can dynamically add new dishes under custom categories (e.g., Noodles, Rice, Artisan Pasta).",
            "Veg & Non-Veg Badges: Dedicated toggle buttons applying official FSSAI square/circle symbols to food images.",
            "1-Click +20 Stock Restoration: Restores all depleted dishes by +20 portions in a single click.",
            "Direct Database Query: UPDATE dishes SET daily_stock = daily_stock + 20 WHERE vendor_id = ?",
            "Takeaway Escrow Release: Dedicated button allowing chefs to confirm customer pickup and immediately claim funds."
        ],
        right_card_title="CHEF OPERATIONS HIGHLIGHTS",
        right_card_bullets=[
            "• Audio Pop-up: Alerts kitchen immediately upon order",
            "• Stock Restored: Single-click +20 portion batch update",
            "• Dynamic Categories: No rigid presets; fully configurable",
            "• Takeaway Isolation: Takeaway orders stay in kitchen",
            "• Direct Escrow Settlement: Disbursed upon customer pickup"
        ],
        trans_type="split", trans_dir="horz"
    )
    rels[14] = std_rels

    # SLIDE 15: 7. Implementation Screenshots — Rider Route Navigation & Concurrency (SCREENSHOT: rider_gps_navigation.png)
    slides[15] = build_image_slide(
        title="7. Rider Logistics & Route Navigation",
        subtitle="Real-time Leaflet route navigation, GPS movement simulation, and anti-collision order locking.",
        slide_num=15,
        bullets=[
            "Live Route Navigation: Interactive Leaflet map locking turn-by-turn route from Chef Kitchen to Customer.",
            "Simulate Rider Movement: Interactive button incrementing rider coordinates toward the delivery destination.",
            "Shift Offline Protection: Riders who are toggled 'Offline' cannot view or claim new orders.",
            "Optimistic Concurrency Locking: UPDATE orders SET rider_id = ?, status = 'ACCEPTED' WHERE order_id = ? AND rider_id IS NULL.",
            "Anti-Race Protection: If two riders click accept simultaneously, the second receives 'Taken by another rider'.",
            "Map Auto-Hide: Once order is delivered, map is hidden in both rider and customer portals to protect privacy."
        ],
        r_id="rIdImg1",
        trans_type="push", trans_dir="l"
    )
    rels[15] = make_img_rels("rider_gps_navigation.png")

    # SLIDE 16: 7. Implementation Screenshots — Master Admin Control & Security (SCREENSHOT: admin_user_registry.jpg)
    slides[16] = build_image_slide(
        title="7. Master Admin Control & Global User Registry",
        subtitle="Full administrative CRUD registry, role-based filtering, password strength auditing, and phone regex.",
        slide_num=16,
        bullets=[
            "Global User Accounts Registry: Centralized management table with password masking and role badge indicators.",
            "Role Filtering: Dedicated filter buttons to inspect Customers, Vendors, Admins, and Riders separately.",
            "Full CRUD Operations: Administrators can Create, Read, Edit (modal form), Ban, and permanently Delete accounts.",
            "Security: All credentials encrypted using 10-round salted Bcrypt hashing before committing to the database.",
            "Real-Time Statistics: Header counters displaying total registered users, active dishes, and escrow payout balances."
        ],
        r_id="rIdImg1",
        trans_type="wipe", trans_dir="r"
    )
    rels[16] = make_img_rels("admin_user_registry.jpg")

    # SLIDE 17: 7. Implementation Screenshots — Account Edit & Validation Modal (SCREENSHOT: admin_edit_user.png)
    slides[17] = build_image_slide(
        title="7. Account Validation & Security Modal",
        subtitle="Granular input verification enforcing strict DBMS data constraints and role integrity.",
        slide_num=17,
        bullets=[
            "Granular Edit Form: Admin modal allowing secure updates to Full Name, Email, Password, Role, Status, and Phone.",
            "Password Strength Validator: Enforces minimum 8 chars, uppercase, lowercase, numbers, and special symbols.",
            "Phone Number Validation: Standard E.164 regex (^+?[0-9]{10,14}$) preventing malformed database entries.",
            "Role & Status Constraints: Dropdown validation strictly locking roles to ('Customer', 'Vendor', 'Rider', 'Admin').",
            "Audit Trail Commit: Changes synchronously update the relational user record and log telemetry to MongoDB."
        ],
        r_id="rIdImg1",
        trans_type="push", trans_dir="l"
    )
    rels[17] = make_img_rels("admin_edit_user.png")

    # SLIDE 18: 8. Testing & Evaluation Verification (Automated Suite: 30/30 Pass)
    slides[18] = build_two_column_slide(
        title="8. Testing & Evaluation Verification Scorecard",
        subtitle="Comprehensive automated test suite validating all 6 DBMS evaluation criteria with 30 passing assertions.",
        slide_num=18,
        left_bullets=[
            "Automated Command: Executed via 'npm test' (calling node backend/test_suite_eval.js) with zero human intervention.",
            "Database Schema Verification: Tested all 11 tables for existence, column data types, and foreign key constraints.",
            "Dual Database Connectivity: Validated MySQL/SQLite connection pool with 0ms measured query response time.",
            "Full CRUD Lifecycle: Verified dish Create, Read, +20 stock Update, and Delete operations without orphaned records.",
            "Complex SQL Joins: Tested multi-table 3-way joins (orders JOIN vendor JOIN customer) and financial aggregate metrics.",
            "ACID Rollback Testing: Intentionally threw errors mid-transaction to confirm atomic rollback (0 corrupted records)."
        ],
        right_card_title="AUTOMATED TEST SCORECARD",
        right_card_bullets=[
            "[✓] 11 Relational Tables: VERIFIED",
            "[✓] Connection Latency: 0ms (Sub-10ms target)",
            "[✓] Dish CRUD Lifecycle: PASSED",
            "[✓] 3-Way SQL JOIN & Aggregates: PASSED",
            "[✓] ACID Atomic Rollback: PASSED",
            "[✓] Bcrypt & Phone Regex: PASSED",
            "[✓] Linear & Quadratic Probing: PASSED",
            "OVERALL RESULT: 30 PASSED, 0 FAILED (100%)"
        ],
        is_accent=True,
        trans_type="wheel"
    )
    rels[18] = std_rels

    # SLIDE 19: 9. Viva Voce & Examiner Questions Guide
    slides[19] = build_two_column_slide(
        title="9. Viva Voce & Key Evaluator Answers",
        subtitle="Prepared technical explanations addressing likely questions from the evaluation panel.",
        slide_num=19,
        left_bullets=[
            "Q1: Why choose a Relational DBMS over NoSQL/Spreadsheets? A: Strict ACID guarantees, foreign key cascading, and preventing oversold stock during concurrent checkouts.",
            "Q2: How is race condition prevented when riders claim orders? A: Optimistic locking using conditional SQL: 'UPDATE orders SET rider_id=? WHERE order_id=? AND rider_id IS NULL'.",
            "Q3: Why use Quadratic Probing over Linear Probing in Hash Search? A: Quadratic probing uses quadratic displacement ((h0 + i + i^2) mod M) to eliminate Primary Clustering.",
            "Q4: How does Takeaway mode affect escrow calculation? A: Takeaway waives the delivery fee (₹0) and disburses 95% chef / 0% rider, releasing funds on counter pickup.",
            "Q5: How is data security enforced? A: 10-round salted Bcrypt password hashing, JWT bearer tokens, and parameterized SQL queries to prevent SQL injection."
        ],
        right_card_title="VIVA SUCCESS SUMMARY",
        right_card_bullets=[
            "• ACID Isolation: No phantom orders",
            "• Concurrency: Zero-collision rider claims",
            "• Hash Complexity: O(1) expected lookup",
            "• Security: Bcrypt + JWT + E.164 Regex",
            "• Dual DB: Seamless MySQL / SQLite fallback"
        ],
        is_accent=True,
        trans_type="split", trans_dir="horz"
    )
    rels[19] = std_rels

    # SLIDE 20: 10. Live Demonstration Guide & Test Credentials
    slides[20] = build_two_column_slide(
        title="10. Final Live Demonstration Guide",
        subtitle="Step-by-step walkthrough and pre-configured credentials for the live evaluation demonstration.",
        slide_num=20,
        left_bullets=[
            "Step 1 — Start Servers: Run 'npm run backend' (port 5000) and 'npm run frontend' (port 5173).",
            "Step 2 — Customer Portal (customer@test.com): Toggle Veg-Only, adjust 20km slider, test Takeaway toggle, open Hash Inspector.",
            "Step 3 — Chef Kitchen (chef@test.com): Show incoming real-time audio order alert, dynamic categories, and click '+20 Stock Restore'.",
            "Step 4 — Rider Logistics (rider@test.com): Show live route Leaflet navigation and click 'Simulate Rider GPS Movement'.",
            "Step 5 — Master Admin (admin@chefhub.com): Demonstrate Global User Registry, filter by role, edit account, test phone regex.",
            "Step 6 — Automated Test Verification: Run 'npm test' in terminal to show 30/30 passed tests to the evaluation panel."
        ],
        right_card_title="PRE-CONFIGURED TEST LOGINS",
        right_card_bullets=[
            "🛒 Customer: customer@test.com (pw: customer123)",
            "🍳 Chef: chef@test.com (pw: vendor123)",
            "🛵 Rider: rider@test.com (pw: rider123)",
            "🛡️ Admin: admin@chefhub.com (pw: admin123)",
            "Dual Database: Auto-connects to MySQL/SQLite"
        ],
        trans_type="fade"
    )
    rels[20] = std_rels

    # SLIDE 21: Conclusion & Thank You Slide (Native Slide 12 template replacement)
    s21_xml = file_map['ppt/slides/slide12.xml'].decode('utf-8')
    s21_xml = s21_xml.replace('[Project title]', 'CHEFHUB HYPER-LOCAL CLOUD KITCHEN ECOSYSTEM')
    s21_xml = s21_xml.replace('[Team members]', 'Kumaravelan &amp; Team  |  Dept of Computer Science &amp; Engineering')
    s21_xml = s21_xml.replace('Replace all [bracketed text] with your project details', 'Evaluation Ready — Full ACID DBMS Implementation')
    s21_xml = s21_xml.replace('<a:t>12</a:t>', f'<a:t>{TOTAL_SLIDES}</a:t>')
    s21_xml = s21_xml.replace('</p:sld>', '<p:transition spd="med" advClick="1"><p:fade/></p:transition></p:sld>')
    file_map[f'ppt/slides/slide{TOTAL_SLIDES}.xml'] = s21_xml.encode('utf-8')
    rels[TOTAL_SLIDES] = std_rels

    # Assemble all generated slides into file_map
    for i in range(2, TOTAL_SLIDES + 1):
        if i in slides:
            file_map[f'ppt/slides/slide{i}.xml'] = ET.tostring(slides[i], encoding='utf-8', xml_declaration=True)
        file_map[f'ppt/slides/_rels/slide{i}.xml.rels'] = rels[i]

    # CLEAN STRING TEMPLATES (Eliminates namespace prefixes and schema validation errors)
    # 1. [Content_Types].xml
    ct_lines = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '  <Default Extension="jpeg" ContentType="image/jpeg"/>',
        '  <Default Extension="jpg" ContentType="image/jpeg"/>',
        '  <Default Extension="png" ContentType="image/png"/>',
        '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '  <Default Extension="xml" ContentType="application/xml"/>',
        '  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>',
        '  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>',
        '  <Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>',
        '  <Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>',
        '  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>',
        '  <Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>',
        '  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
        '  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
    ]
    for i in range(1, 12):
        ct_lines.append(f'  <Override PartName="/ppt/slideLayouts/slideLayout{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>')
    for i in range(1, TOTAL_SLIDES + 1):
        ct_lines.append(f'  <Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>')
    ct_lines.append('</Types>')
    file_map['[Content_Types].xml'] = '\n'.join(ct_lines).encode('utf-8')

    # 2. ppt/_rels/presentation.xml.rels
    pr_rels_lines = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>',
    ]
    for i in range(1, TOTAL_SLIDES + 1):
        pr_rels_lines.append(f'  <Relationship Id="rId{i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>')
    
    pr_rels_lines.append(f'  <Relationship Id="rId{TOTAL_SLIDES+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>')
    pr_rels_lines.append(f'  <Relationship Id="rId{TOTAL_SLIDES+3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml"/>')
    pr_rels_lines.append(f'  <Relationship Id="rId{TOTAL_SLIDES+4}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>')
    pr_rels_lines.append(f'  <Relationship Id="rId{TOTAL_SLIDES+5}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles" Target="tableStyles.xml"/>')
    pr_rels_lines.append('</Relationships>')
    file_map['ppt/_rels/presentation.xml.rels'] = '\n'.join(pr_rels_lines).encode('utf-8')

    # 3. ppt/presentation.xml
    pres_tree = ET.fromstring(file_map['ppt/presentation.xml'])
    sldIdLst = pres_tree.find(f"{{{NS_P}}}sldIdLst")
    sldIdLst.clear()
    for i in range(1, TOTAL_SLIDES + 1):
        ET.SubElement(sldIdLst, f"{{{NS_P}}}sldId", {
            'id': str(255 + i),
            f"{{{NS_R}}}id": f"rId{i+1}"
        })
    file_map['ppt/presentation.xml'] = ET.tostring(pres_tree, encoding='utf-8', xml_declaration=True)

    # 4. docProps/app.xml
    app_lines = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">',
        '  <TotalTime>5</TotalTime>',
        '  <Words>1800</Words>',
        '  <Application>Microsoft Office PowerPoint</Application>',
        '  <PresentationFormat>Widescreen</PresentationFormat>',
        '  <Paragraphs>220</Paragraphs>',
        f'  <Slides>{TOTAL_SLIDES}</Slides>',
        '  <Notes>0</Notes>',
        '  <HiddenSlides>0</HiddenSlides>',
        '  <MMClips>0</MMClips>',
        '  <ScaleCrop>false</ScaleCrop>',
        '  <HeadingPairs>',
        '    <vt:vector size="6" baseType="variant">',
        '      <vt:variant><vt:lpstr>Fonts Used</vt:lpstr></vt:variant>',
        '      <vt:variant><vt:i4>3</vt:i4></vt:variant>',
        '      <vt:variant><vt:lpstr>Theme</vt:lpstr></vt:variant>',
        '      <vt:variant><vt:i4>1</vt:i4></vt:variant>',
        '      <vt:variant><vt:lpstr>Slide Titles</vt:lpstr></vt:variant>',
        f'      <vt:variant><vt:i4>{TOTAL_SLIDES}</vt:i4></vt:variant>',
        '    </vt:vector>',
        '  </HeadingPairs>',
        '  <TitlesOfParts>',
        f'    <vt:vector size="{TOTAL_SLIDES + 4}" baseType="lpstr">',
        '      <vt:lpstr>Aptos</vt:lpstr>',
        '      <vt:lpstr>Arial</vt:lpstr>',
        '      <vt:lpstr>Calibri</vt:lpstr>',
        '      <vt:lpstr>Office Theme</vt:lpstr>',
    ]
    for i in range(1, TOTAL_SLIDES + 1):
        app_lines.append(f'      <vt:lpstr>PowerPoint Presentation {i}</vt:lpstr>')
    app_lines.extend([
        '    </vt:vector>',
        '  </TitlesOfParts>',
        '  <AppVersion>16.0000</AppVersion>',
        '</Properties>'
    ])
    file_map['docProps/app.xml'] = '\n'.join(app_lines).encode('utf-8')

    # Save to all target files
    for target in TARGET_FILES:
        with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for filename, content in file_map.items():
                zout.writestr(filename, content)
        print(f"Successfully saved {target} ({TOTAL_SLIDES} slides)!")

if __name__ == '__main__':
    run()
