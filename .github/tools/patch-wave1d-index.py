from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

fallback = '''<div id="fpStaticFallback" hidden style="width:min(100% - 24px,520px);margin:16px auto;padding:18px;border:1px solid #f03842;border-radius:18px;background:#fff;color:#10213b;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 8px 24px rgba(31,50,82,.12)"><h1 data-fp-fallback-title style="font-size:22px;margin:0">FamilyPilot не удалось запустить полностью</h1><p data-fp-fallback-message style="font-size:13px;line-height:1.5;margin:10px 0 0">Сохранённые данные не удалены из-за этой ошибки. Перезагрузите страницу.</p><p data-fp-fallback-code style="font-size:11px;font-weight:800;margin:10px 0 0"></p><button type="button" onclick="location.reload()" style="margin-top:14px;min-height:44px;border:0;border-radius:14px;background:#10a958;color:#fff;padding:9px 14px;font:inherit;font-weight:900">Перезагрузить FamilyPilot</button></div>'''

registry_scripts = '''<script src="./familypilot-module-registry.js" onerror="const f=document.getElementById('fpStaticFallback');if(f)f.hidden=false"></script>\n<script src="./familypilot-module-registry-ui.js" onerror="const f=document.getElementById('fpStaticFallback');if(f)f.hidden=false"></script>\n'''

if 'id="fpStaticFallback"' not in text:
    marker = '<body>\n'
    if marker not in text:
        raise SystemExit('body marker not found')
    text = text.replace(marker, marker + fallback + '\n', 1)

if 'src="./familypilot-module-registry.js"' not in text:
    marker = '<script src="./familypilot-scope.js"></script>'
    if marker not in text:
        raise SystemExit('scope script marker not found')
    text = text.replace(marker, registry_scripts + marker, 1)

if text.count('src="./familypilot-module-registry.js"') != 1:
    raise SystemExit('registry script count is not one')
if text.count('src="./familypilot-module-registry-ui.js"') != 1:
    raise SystemExit('registry UI script count is not one')
if text.index('familypilot-module-registry.js') > text.index('familypilot-scope.js'):
    raise SystemExit('registry does not precede scope')
if text.index('fpStaticFallback') > text.index('familypilot-module-registry.js'):
    raise SystemExit('fallback does not precede registry')

path.write_text(text, encoding='utf-8')
