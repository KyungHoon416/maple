#!/usr/bin/env python3
"""Map exported Canva pages back to option keys by comparing each page with the small preview
returned at generation time (assets-src/options/canva-media.txt: key mediaId previewPath).
usage: match-canva-exports.py page1.jpg page2.jpg ...  -> writes assets-src/options/<key>.jpg"""
import sys, shutil
from PIL import Image, ImageOps
def vec(p):
    im = ImageOps.fit(Image.open(p).convert('L'), (32, 24), Image.LANCZOS)
    px = list(im.getdata()); m = sum(px) / len(px)
    return [x - m for x in px]
def dist(a, b): return sum((x - y) ** 2 for x, y in zip(a, b))
refs = {}
for line in open('assets-src/options/canva-media.txt'):
    k, _, p = line.split(); refs[k] = vec(p)
used = set()
for page in sys.argv[1:]:
    v = vec(page)
    ranked = sorted((dist(v, r), k) for k, r in refs.items())
    best, second = ranked[0], ranked[1]
    k = best[1]; ratio = second[0] / max(best[0], 1)
    flag = '' if ratio > 1.5 and k not in used else '  <-- CHECK'
    print(f'{page} -> {k} (margin x{ratio:.1f}){flag}')
    used.add(k); shutil.copyfile(page, f'assets-src/options/{k}.jpg')
