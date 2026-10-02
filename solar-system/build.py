#!/usr/bin/env python3
"""Build dist/solar-system.html: one self-contained page (JS + textures inlined; three.js from jsDelivr)."""
import base64, io, json, os, re
from PIL import Image
R = os.path.dirname(os.path.abspath(__file__))
TEX = {
 'sun':'sunmap.jpg','mercury':'mercurymap.jpg','venus':'venusmap.jpg','earth':'earth_atmos_2048.jpg','earthSpec':'earth_specular_2048.jpg',
 'earthLights':'earth_lights_2048.png','earthClouds':'earth_clouds_soft.png','moon':'moon_1024.jpg','mars':'marsmap1k.jpg','jupiter':'jupitermap.jpg',
 'saturn':'saturnmap.jpg','saturnRing':'saturnringcolor.jpg','saturnRingAlpha':'saturnringpattern.png','uranus':'uranusmap.jpg','neptune':'neptunemap.jpg',
 'pluto':'plutomap1k.jpg','sky':'galaxy_starfield.png',
}
def data_uri(name):
    path = os.path.join(R, 'tex', name)
    if name == 'galaxy_starfield.png':  # recompress the big sky map
        im = Image.open(path).convert('RGB'); b = io.BytesIO(); im.save(b, 'JPEG', quality=82, optimize=True); return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
    mime = 'image/png' if name.endswith('.png') else 'image/jpeg'
    return f'data:{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()
def strip(src, drop_imports=True):
    src = re.sub(r'^import\s[^;]*from\s+\'\./[^\']*\';\n', '', src, flags=re.M | re.S)   # local imports (multi-line ok)
    src = re.sub(r'^export\s*\{[^}]*\};\n', '', src, flags=re.M)
    return re.sub(r'^export\s+', '', src, flags=re.M)
elements = strip(open(f'{R}/src/elements.gen.js').read())
orbits = strip(open(f'{R}/src/orbits.js').read())
app = open(f'{R}/src/app.js').read()
app_head = ''.join(l for l in app.splitlines(True) if l.startswith('import * as THREE') or l.startswith('import { OrbitControls'))
app_body = strip(app.replace(app_head, ''))
js = app_head + '\n' + elements + '\n' + orbits + '\n' + app_body
html = open(f'{R}/index.html').read()
tex = 'window.__TEX__=' + json.dumps({k: data_uri(v) for k, v in TEX.items()}) + ';'
html = html.replace('<!--TEXTURES-->', f'<script>{tex}</script>')
html = html.replace('<script type="module" src="./src/app.js"></script>', '<script type="module">\n' + js + '\n</script>')
os.makedirs(f'{R}/dist', exist_ok=True)
out = f'{R}/dist/solar-system.html'; open(out, 'w').write(html)
print('wrote', out, round(os.path.getsize(out) / 1e6, 2), 'MB')

# artifact variant: the host wraps the page in its own doctype/head/body, so emit only title, style and body content
m = re.search(r'<title>.*?</title>', html, re.S).group(0); st = re.search(r'<style>.*?</style>', html, re.S).group(0)
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
open(f'{R}/dist/solar-system.artifact.html', 'w').write(m + '\n' + st + '\n' + body)
print('wrote artifact variant', round(os.path.getsize(f'{R}/dist/solar-system.artifact.html') / 1e6, 2), 'MB')
