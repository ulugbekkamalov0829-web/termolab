"""Veb-ilovani bitta HTML faylga yig'ish: python tools/build.py"""
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(R, p), encoding='utf-8').read()
style, body, core, app = rd('src/style.css'), rd('src/body.html'), rd('src/core.js'), rd('src/app.js')
layers, view3d, amaliy = rd('src/layers.js'), rd('src/view3d.js'), rd('src/amaliy.js')
forms = json.load(open(os.path.join(R, 'formulas/formulas.json'), encoding='utf-8'))
fonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">'
scripts = (f'<script>window.FORM={json.dumps(forms, ensure_ascii=False)};</script>\n'
           + ''.join(f'<script>\n{js}\n</script>\n' for js in (core, layers, view3d, app, amaliy))
           + '<script>TermoAmaliy.init();</script>')
page = f'''<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>TermoLab</title>
<meta name="description" content="Issiqlik o'tkazuvchanlik masalalarini sonli yechish uchun virtual laboratoriya">
{fonts}
<style>
[hidden]{{display:none!important}}
{style}
</style>
</head>
<body>
{body}
{scripts}
</body>
</html>
'''
open(os.path.join(R, 'index.html'), 'w', encoding='utf-8').write(page)
art = f'''<title>TermoLab</title>
<meta name="claude:viewport-fit-sides" content="cover">
{fonts}
<style>
{style}
</style>
{body}
{scripts}
'''
os.makedirs(os.path.join(R, 'dist'), exist_ok=True)
open(os.path.join(R, 'dist/artifact.html'), 'w', encoding='utf-8').write(art)
print('index.html', len(page), 'bayt')
