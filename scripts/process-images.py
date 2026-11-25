#!/usr/bin/env python3
"""Convert downloaded originals to web assets.
assets-src/characters/<id>.jpg -> public/assets/characters/<id>.webp (720x900)
assets-src/options/<key>.jpg   -> public/assets/options/<key>.webp   (560x420)
assets-src/events/<eventId>.jpg -> public/assets/events/<eventId>.webp (960x640, scene art)"""
import os, glob
from PIL import Image, ImageOps
for src_dir, out_dir, size, centering in [("assets-src/characters", "public/assets/characters", (720, 900), (0.5, 0.4)),
                                          ("assets-src/options", "public/assets/options", (560, 420), (0.5, 0.45)),
                                          ("assets-src/events", "public/assets/events", (960, 640), (0.5, 0.5))]:
    os.makedirs(out_dir, exist_ok=True)
    for f in sorted(glob.glob(src_dir + "/*.jpg")):
        key = os.path.basename(f)[:-4]; out = f"{out_dir}/{key}.webp"
        if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(f): continue
        im = ImageOps.fit(Image.open(f).convert("RGB"), size, Image.LANCZOS, centering=centering)
        im.save(out, "WEBP", quality=78, method=6); print("wrote", out)
for d in ("public/assets/characters", "public/assets/options", "public/assets/events"):
    print(d, len(os.listdir(d)) if os.path.isdir(d) else 0)
