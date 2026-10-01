"""Générateur de sprites pixel art néon pour Hélio et Lune.
Chaque planche : cases de 48x48, 6 colonnes. Lancer : python3 generateur_sprites.py
"""
import math
from PIL import Image, ImageDraw, ImageFont

W = H = 48
SKIN, SKIN_S = (241,196,160,255), (212,154,122,255)
EYE, OUT = (24,20,34,255), (14,10,26,255)
YEL = (252,204,40,255)

HELIO = dict(
    name="Hélio", hair="short",
    HAIR=(226,188,104,255), HAIR_L=(250,222,150,255), HAIR_S=(170,128,62,255),
    TOP=(146,212,198,255), TOP_L=(196,238,226,255), TOP_S=(96,166,156,255),
    PANTS=(34,42,78,255), PANTS_S=(22,26,52,255),
    SHOE=(44,44,54,255), SHOE_A=(232,62,40,255), SHOE_B=(252,204,40,255), SOLE=(70,70,80,255),
    SWORD=(90,240,255,255), SWORD_CORE=(245,255,255,255), GLOW=(80,240,255),
    leg_len=9, backpack=True, headband=True, slash_r=18,
)
LUNE = dict(
    name="Lune", hair="ponytail",
    HAIR=(242,222,160,255), HAIR_L=(255,242,205,255), HAIR_S=(198,170,108,255),
    TOP=(192,108,140,255), TOP_L=(222,142,170,255), TOP_S=(146,74,104,255),
    TEE=(204,222,238,255),
    PANTS=(142,178,216,255), PANTS_S=(108,144,186,255),
    SHOE=(172,140,224,255), SHOE_A=(120,220,200,255), SHOE_B=(214,196,250,255), SOLE=(245,245,250,255),
    SWORD=(222,110,255,255), SWORD_CORE=(255,238,255,255), GLOW=(200,90,255),
    leg_len=8, backpack=False, headband=False, slash_r=22,
)

def P(d, x, y, c): d.point((round(x), round(y)), fill=c)
def R(d, x0, y0, x1, y1, c): d.rectangle((round(x0), round(y0), round(x1), round(y1)), fill=c)

def limb(d, a, b, c, w=3):
    (x0,y0),(x1,y1) = a,b
    n = int(max(abs(x1-x0), abs(y1-y0))) + 1
    for i in range(n+1):
        t = i/max(n,1)
        x, y = x0+(x1-x0)*t, y0+(y1-y0)*t
        R(d, x-(w-1)//2, y-(w-1)//2, x+w//2, y+w//2, c)

def leg(d, C, hip, dx, lift, front):
    ax, ay = hip[0]+dx, hip[1]+C["leg_len"]-lift
    limb(d, hip, (ax, ay-1), C["PANTS"] if front else C["PANTS_S"], 3)
    R(d, ax-1, ay, ax+3, ay+1, C["SHOE"])
    P(d, ax+1, ay, C["SHOE_A"]); P(d, ax+2, ay, C["SHOE_B"])
    R(d, ax-1, ay+1, ax+3, ay+1, C["SOLE"])

def sword_line(img, C, hand, ang, length=17):
    d = ImageDraw.Draw(img)
    hx, hy = hand
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    g = Image.new("RGBA", img.size, (0,0,0,0))
    ImageDraw.Draw(g).line((hx, hy, hx+ca*length, hy+sa*length), fill=C["GLOW"]+(80,), width=4)
    img.alpha_composite(g)
    d.line((hx, hy, hx+ca*length, hy+sa*length), fill=C["SWORD"], width=2)
    d.line((hx+ca*2, hy+sa*2, hx+ca*(length-1), hy+sa*(length-1)), fill=C["SWORD_CORE"], width=1)
    d.line((hx-ca*3, hy-sa*3, hx, hy), fill=(60,40,70,255), width=2)
    P(d, hx, hy, YEL)

def outline(img):
    px = img.load(); w, h = img.size
    out = img.copy(); po = out.load()
    for y in range(h):
        for x in range(w):
            if px[x,y][3] == 0:
                for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                    if 0<=nx<w and 0<=ny<h and px[nx,ny][3] > 200:
                        po[x,y] = OUT; break
    return out

def draw_hair(d, C, ox, oy, wind):
    Hh, Hl, Hs = C["HAIR"], C["HAIR_L"], C["HAIR_S"]
    if C["hair"] == "short":
        R(d, 18+ox, 10+oy, 28+ox, 13+oy, Hh)
        R(d, 18+ox, 10+oy, 21+ox, 18+oy, Hh)
        R(d, 18+ox, 14+oy, 19+ox, 18+oy, Hs)
        for sx, sy in ((19,9),(22,8),(25,9),(28,10),(29,12)):
            P(d, sx+ox, sy+oy, Hh)
        R(d, 21+ox, 10+oy, 26+ox, 10+oy, Hl)
        R(d, 26+ox, 14+oy, 29+ox, 14+oy, Hh)
        P(d, 28+ox, 15+oy, Hh)
    else:
        # fine, slightly messy hair pulled back + flowing ponytail
        R(d, 18+ox, 10+oy, 28+ox, 13+oy, Hh)
        R(d, 18+ox, 10+oy, 21+ox, 19+oy, Hh)
        R(d, 18+ox, 14+oy, 19+ox, 19+oy, Hs)
        R(d, 20+ox, 10+oy, 26+ox, 10+oy, Hl)
        for sx, sy in ((20,9),(24,9),(27,10),(29,13)):
            P(d, sx+ox, sy+oy, Hl)
        P(d, 28+ox, 14+oy, Hh); P(d, 28+ox, 15+oy, Hh)  # loose strand on face
        # ponytail: tie point at back of head, sways with wind
        tx, ty = 17+ox, 12+oy
        w = wind
        pts = [(tx, ty), (tx-2-w*0.8, ty+2-w*0.6), (tx-3-w*1.6, ty+5-w*1.4), (tx-3-w*2.3, ty+8-w*2.2)]
        widths = [2, 2, 1]
        cols = [Hh, Hh, Hs]
        for i in range(3):
            limb(d, pts[i], pts[i+1], cols[i], widths[i])
        P(d, tx, ty, (230,90,150,255)); P(d, tx, ty+1, (230,90,150,255))  # scrunchie
        # little moon clip
        P(d, 22+ox, 9+oy, YEL); P(d, 23+ox, 9+oy, YEL); P(d, 21+ox, 10+oy, YEL)

def draw_frame(C, p):
    body = Image.new("RGBA", (W,H), (0,0,0,0))
    d = ImageDraw.Draw(body)
    lift_all = 9 - C["leg_len"]                  # shorter legs -> whole body lower
    ox, oy = p.get("lean",0), p.get("bob",0) + lift_all
    hy = 34 + p.get("hipy",0) + lift_all
    hipb, hipf = (21, hy), (24, hy)
    wind = p.get("wind", 0)

    sb = (20+ox, 25+oy)
    bh = (sb[0]+p["bhand"][0], sb[1]+p["bhand"][1])
    limb(d, sb, bh, C["TOP_S"], 3)
    R(d, bh[0]-1, bh[1], bh[0], bh[1]+1, SKIN_S)
    leg(d, C, hipb, p["bleg"][0], p["bleg"][1], False)

    if C["backpack"]:
        R(d, 14+ox, 23+oy, 17+ox, 32+oy, (26,24,32,255))
        P(d, 15+ox, 25+oy, (230,50,110,255)); P(d, 15+ox, 26+oy, (230,50,110,255))
        R(d, 16+ox, 21+oy, 20+ox, 23+oy, C["TOP_S"])  # hood
    # torso
    R(d, 18+ox, 22+oy, 27+ox, 33+oy, C["TOP"])
    R(d, 18+ox, 22+oy, 19+ox, 33+oy, C["TOP_S"])
    if C["backpack"]:
        R(d, 25+ox, 23+oy, 25+ox, 32+oy, C["TOP_L"])
        R(d, 18+ox, 33+oy, 27+ox, 34+oy, C["TOP_L"])
        R(d, 21+ox, 22+oy, 22+ox, 31+oy, (26,24,32,255))
    else:
        # open cardigan over light tee with a colourful print
        R(d, 24+ox, 22+oy, 27+ox, 32+oy, C["TEE"])
        P(d, 25+ox, 26+oy, (250,140,60,255)); P(d, 26+ox, 26+oy, (240,90,140,255))
        P(d, 25+ox, 27+oy, (90,180,120,255)); P(d, 26+ox, 25+oy, (250,200,60,255))
        R(d, 23+ox, 22+oy, 23+ox, 33+oy, C["TOP_L"])  # cardigan edge
        for by in (24, 27, 30): P(d, 23+ox, by+oy, (255,230,240,255))
        R(d, 18+ox, 33+oy, 23+ox, 34+oy, C["TOP_L"])  # ribbed hem
    # head
    R(d, 22+ox, 21+oy, 25+ox, 22+oy, SKIN_S)
    R(d, 19+ox, 12+oy, 28+ox, 21+oy, SKIN)
    draw_hair(d, C, ox, oy, wind)
    P(d, 21+ox, 16+oy, SKIN_S); P(d, 21+ox, 17+oy, SKIN_S)
    if C["headband"]:
        R(d, 18+ox, 13+oy, 28+ox, 13+oy, (236,40,90,255))
        R(d, 15+ox-wind, 13+oy, 17+ox, 13+oy, (170,24,70,255))
        dy = 0 if wind else 1
        R(d, 13+ox-wind, 14+oy+dy, 16+ox, 14+oy+dy, (170,24,70,255))
    R(d, 26+ox, 16+oy, 26+ox, 17+oy, EYE)
    if C["hair"] == "ponytail":
        P(d, 26+ox, 15+oy, C["HAIR_S"])  # eyebrow
        P(d, 27+ox, 19+oy, (226,120,130,255))  # little pouty smile
    else:
        P(d, 28+ox, 19+oy, SKIN_S); P(d, 27+ox, 20+oy, SKIN_S)
    P(d, 27+ox, 18+oy, (240,160,150,255))

    leg(d, C, hipf, p["fleg"][0], p["fleg"][1], True)
    sf = (24+ox, 25+oy)
    hand = (sf[0]+p["fhand"][0], sf[1]+p["fhand"][1])
    limb(d, sf, hand, C["TOP"], 3)
    R(d, hand[0]-1, hand[1]-1, hand[0]+1, hand[1]+1, SKIN)

    img = outline(body)
    if p.get("sword") is not None:
        sword_line(img, C, hand, p["sword"])
    if p.get("slash"):
        s = Image.new("RGBA", (W,H), (0,0,0,0)); sd = ImageDraw.Draw(s)
        a0, a1, alpha = p["slash"]; r = C["slash_r"]
        cx, cy = 24+ox, 25+oy
        sd.arc((cx-r-1, cy-r-1, cx+r+1, cy+r+1), a0, a1, fill=C["GLOW"]+(int(160*max(alpha,0.7)),), width=5)
        sd.arc((cx-r, cy-r, cx+r, cy+r), a0, a1, fill=C["SWORD_CORE"][:3]+(int(255*max(alpha,0.75)),), width=2)
        img.alpha_composite(s)
    if p.get("trail"):
        t = Image.new("RGBA", (W,H), (0,0,0,0)); td = ImageDraw.Draw(t)
        for i, y in enumerate((18, 26, 32)):
            td.line((0, y+oy, 14-i*3, y+oy), fill=C["GLOW"]+(150,), width=1)
        img = Image.alpha_composite(t, img)
    return img

def base(**k):
    p = dict(bob=0, lean=0, bleg=(0,0), fleg=(0,0), bhand=(-1,7), fhand=(2,7), sword=135)
    p.update(k); return p

def common_anims():
    a = {}
    a["idle"] = [base(bob=b, wind=(1 if i in (1,2) else 0)) for i, b in enumerate((0,0,1,1))]
    run = []
    for i in range(6):
        t = i/6*2*math.pi; s, c = math.sin(t), math.cos(t)
        run.append(base(lean=1, bob=1 if abs(s) > 0.7 else 0,
            fleg=(round(5*s), round(3*max(0,c))), bleg=(round(-5*s), round(3*max(0,-c))),
            fhand=(round(-3*s)-1, 6), bhand=(round(3*s), 6), sword=165, wind=1+i%2))
    a["run"] = run
    a["attack"] = [
        base(fhand=(-3,-6), bhand=(-3,-4), sword=230, bleg=(-3,0), fleg=(2,0)),
        base(lean=1, fhand=(6,-3), bhand=(3,2), sword=300, fleg=(4,0), bleg=(-4,0), slash=(-130,-40,0.6), wind=1),
        base(lean=2, fhand=(7,2), bhand=(2,4), sword=10, fleg=(5,0), bleg=(-5,0), slash=(-120,40,1.0), wind=2),
        base(lean=2, fhand=(5,6), bhand=(1,5), sword=50, fleg=(5,0), bleg=(-5,0), slash=(-20,60,0.5), wind=1),
        base(lean=1, fhand=(3,7), sword=100, fleg=(3,0), bleg=(-3,0)),
    ]
    a["jump"] = [
        base(hipy=-2, fleg=(3,5), bleg=(-2,3), fhand=(-2,-5), bhand=(-4,-3), sword=200, wind=1),
        base(fleg=(2,1), bleg=(-3,2), fhand=(4,-2), bhand=(-4,2), sword=330, wind=2),
    ]
    return a

def sparkle(img, C, pts):
    d = ImageDraw.Draw(img)
    for x, y in pts:
        P(d, x, y, C["SWORD_CORE"])
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            P(d, x+dx, y+dy, C["SWORD"])

def build(C):
    a = common_anims()
    frames = {k: [draw_frame(C, p) for p in v] for k, v in a.items()}
    if C is HELIO:
        # special: long dash
        frames["dash"] = [draw_frame(C, base(lean=3, bob=1, fleg=(6,0), bleg=(-6,1), fhand=(8,0), bhand=(-5,2), sword=0, trail=True, wind=3)),
                          draw_frame(C, base(lean=3, bob=1, fleg=(6,1), bleg=(-6,0), fhand=(8,1), bhand=(-5,3), sword=2, trail=True, wind=2))]
    else:
        # special: double jump somersault (tucked pose rotated) + sparkles
        tuck = draw_frame(C, base(hipy=-4, fleg=(3,6), bleg=(1,6), fhand=(3,1), bhand=(1,1), sword=90, wind=1))
        dj = []
        for i, ang in enumerate((0, -90, -180, -270)):
            f = tuck.rotate(ang, resample=Image.NEAREST, center=(24,26))
            sparkle(f, C, [((6,40),(40,8)), ((10,10),(38,38)), ((4,24),(44,24)), ((24,4),(24,44))][i])
            dj.append(f)
        frames["doublejump"] = dj
    return frames

def save_sheet(frames, path):
    rows = list(frames.items()); cols = 6
    sheet = Image.new("RGBA", (cols*W, len(rows)*H), (0,0,0,0))
    for r, (_, fs) in enumerate(rows):
        for c, im in enumerate(fs):
            sheet.paste(im, (c*W, r*H), im)
    sheet.save(path)
    return sheet, [n for n, _ in rows]

def neon_bg(w, h):
    bg = Image.new("RGBA", (w, h), (22,14,42,255)); bd = ImageDraw.Draw(bg)
    for y in range(0, h, 3): bd.line((0,y,w,y), fill=(30,20,56,255))
    return bg

def font(sz):
    try: return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", sz)
    except Exception: return ImageFont.load_default()

if __name__ == "__main__":
    S = 6
    all_frames = {}
    for C, fname in ((HELIO, "helio"), (LUNE, "lune")):
        fr = build(C); all_frames[fname] = fr
        sheet, names = save_sheet(fr, f"{fname}_spritesheet.png")
        prev = neon_bg(sheet.width*S + 220, sheet.height*S); pd = ImageDraw.Draw(prev)
        for r, n in enumerate(names):
            pd.text((14, r*H*S + H*S//2 - 12), n, fill=(255,110,210), font=font(22))
        prev.alpha_composite(sheet.resize((sheet.width*S, sheet.height*S), Image.NEAREST), (220, 0))
        prev.save(f"{fname}_planche.png")

    # character select screen preview (animated)
    S2 = 7; cw = W*S2
    gif = []
    hf, lf = all_frames["helio"], all_frames["lune"]
    for i in range(24):
        sel = 0 if i < 12 else 1
        fr = neon_bg(cw*2 + 120, cw + 170); d = ImageDraw.Draw(fr)
        d.text((fr.width//2, 40), "CHOISIS TON NINJA", fill=(255,110,210), font=font(40), anchor="mm")
        for k, (nm, frames, ability, col) in enumerate((
                ("HÉLIO", hf, "Dash éclair", (90,240,255)),
                ("LUNE", lf, "Double saut", (222,110,255)))):
            x0 = 40 + k*(cw+40); y0 = 80
            active = (k == sel)
            d.rectangle((x0-6, y0-6, x0+cw+6, y0+cw+6), outline=col if active else (70,50,100), width=4 if active else 2)
            seq = frames["run"] if active else frames["idle"]
            sp = seq[i % len(seq)] if active else seq[(i//3) % len(seq)]
            fr.alpha_composite(sp.resize((cw, cw), Image.NEAREST), (x0, y0))
            d.text((x0+cw//2, y0+cw+28), nm, fill=col, font=font(30), anchor="mm")
            d.text((x0+cw//2, y0+cw+60), ability, fill=(220,210,240), font=font(18), anchor="mm")
        gif.append(fr.convert("RGB"))
    gif[0].save("selection_personnage.gif", save_all=True, append_images=gif[1:], duration=120, loop=0)

    # Lune special move preview
    seq = lf["idle"]*2 + lf["run"]*2 + lf["jump"][:1] + lf["doublejump"]*2 + lf["jump"][1:] + lf["attack"]*2
    out = []
    for f in seq:
        fr = neon_bg(W*S, H*S); d = ImageDraw.Draw(fr)
        d.rectangle((0, 46*S, fr.width, fr.height), fill=(60,40,90,255))
        d.line((0, 46*S, fr.width, 46*S), fill=(222,110,255,255), width=3)
        fr.alpha_composite(f.resize((W*S, H*S), Image.NEAREST))
        out.append(fr.convert("RGB"))
    out[0].save("lune_anim.gif", save_all=True, append_images=out[1:], duration=110, loop=0)
    print("ok")
