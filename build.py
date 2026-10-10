#!/usr/bin/env python3
"""Genera dist/ (web + vCard + QR + PDF) para la tarjeta digital de DJ Tornado.
Uso:  python3 build.py            (edita CONFIG abajo y vuelve a correr)"""
import base64, io, shutil, subprocess, urllib.parse
from pathlib import Path
import qrcode, qrcode.image.svg
from PIL import Image, ImageDraw, ImageFilter

CONFIG = {
    "phone": "8124042499",  # WhatsApp/cel de Iram
    "url": "https://hadezib.github.io/dj-tornado/",
    "fb": "https://www.facebook.com/profile.php?id=61566414580220",
    "messenger": "https://m.me/61566414580220",
    "wa_msg": "¡Hola DJ Tornado! Vi tu tarjeta y quiero cotizar un evento 🎉\nFecha: \nLugar: \nTipo de evento: ",
}

ROOT = Path(__file__).parent
SRC, DIST = ROOT / "src", ROOT / "docs"  # docs/ = lo que publica GitHub Pages
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def qr_svg(url):
    img = qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, border=0,
                      error_correction=qrcode.constants.ERROR_CORRECT_M)
    svg = img.to_string(encoding="unicode")
    return svg[svg.index("<svg"):]


def vcard(c, tel):
    photo = io.BytesIO()
    Image.open(ROOT / "img/logo.jpg").resize((240, 240)).save(photo, "JPEG", quality=80)
    b64 = base64.b64encode(photo.getvalue()).decode()
    lines = [
        "BEGIN:VCARD", "VERSION:3.0",
        "N:Velázquez;Iram;;;", "FN:DJ Tornado - Iram Velázquez",
        "ORG:DJ Tornado · Sonido e Iluminación", "TITLE:DJ y técnico de sonido",
        f"TEL;TYPE=CELL,VOICE:{tel}",
        f"URL:{c['url']}",
        f"X-SOCIALPROFILE;TYPE=facebook:{c['fb']}",
        "ADR;TYPE=WORK:;;;García;Nuevo León;;México",
        "NOTE:DJ\\, sonido e iluminación para tu evento. ¡Seguimos poniendo ambiente!",
    ]
    photo_line = "PHOTO;ENCODING=b;TYPE=JPEG:" + b64
    folded = [photo_line[:75]] + [" " + photo_line[i:i + 74] for i in range(75, len(photo_line), 74)]
    return "\r\n".join(lines + folded + ["END:VCARD", ""])


def og_image():
    bg = Image.open(ROOT / "img/calle.jpg").convert("RGB")
    w, h = 1200, 630
    bg = bg.resize((w, int(bg.height * w / bg.width))).crop((0, 80, w, 80 + h)).filter(ImageFilter.GaussianBlur(3))
    bg = Image.blend(bg, Image.new("RGB", (w, h), (3, 4, 9)), 0.45)
    logo = Image.open(ROOT / "img/logo.jpg").resize((460, 460))
    mask = Image.new("L", (460, 460), 0); ImageDraw.Draw(mask).ellipse((0, 0, 459, 459), fill=255)
    bg.paste(logo, ((w - 460) // 2, (h - 460) // 2), mask)
    bg.save(DIST / "img/og.jpg", quality=85)


def main():
    c = CONFIG
    digits = "".join(ch for ch in c["phone"] if ch.isdigit())[-10:]
    tel = "+52" + digits
    tel_show = f"{digits[:2]} {digits[2:6]} {digits[6:]}"
    tokens = {
        "{{WA}}": "52" + digits, "{{TEL}}": tel, "{{TEL_SHOW}}": tel_show,
        "{{WA_MSG}}": urllib.parse.quote(c["wa_msg"]),
        "{{URL}}": c["url"], "{{URL_SHOW}}": c["url"].split("//")[1].rstrip("/"),
        "{{FB}}": c["fb"], "{{MSGR}}": c["messenger"], "{{QR}}": qr_svg(c["url"]),
    }
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(SRC, DIST)
    shutil.copytree(ROOT / "img", DIST / "img")
    for name in ("index.html", "pdf.html"):
        p = DIST / name
        html = p.read_text()
        for k, v in tokens.items():
            html = html.replace(k, v)
        p.write_text(html)
    (DIST / "tornado.vcf").write_text(vcard(c, tel))
    (DIST / ".nojekyll").write_text("")
    og_image()
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    "--virtual-time-budget=8000", "--run-all-compositor-stages-before-draw",
                    f"--print-to-pdf={DIST / 'DJ-Tornado.pdf'}", (DIST / "pdf.html").as_uri()],
                   check=True, capture_output=True)
    print("OK ->", DIST, "| tel:", tel_show)


if __name__ == "__main__":
    main()
