from pathlib import Path
p=Path('index.html')
s=p.read_text()
line='<script src="./familypilot-module-entry-bridge.js" onerror="const f=document.getElementById(\'fpStaticFallback\');if(f)f.hidden=false"></script>\n'
if 'familypilot-module-entry-bridge.js' not in s:
    marker='<script src="./familypilot-module-registry-ui.js" onerror="const f=document.getElementById(\'fpStaticFallback\');if(f)f.hidden=false"></script>\n'
    if marker not in s: raise SystemExit('registry ui marker missing')
    s=s.replace(marker,marker+line,1)
assert s.count('familypilot-module-entry-bridge.js')==1
assert s.index('familypilot-module-registry-ui.js') < s.index('familypilot-module-entry-bridge.js') < s.index('familypilot-scope.js')
p.write_text(s)
