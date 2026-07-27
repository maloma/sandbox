from pathlib import Path
p=Path('index.html')
s=p.read_text()
line='<script src="./familypilot-module-registry-retry-correction.js" onerror="const f=document.getElementById(\'fpStaticFallback\');if(f)f.hidden=false"></script>\n'
if 'familypilot-module-registry-retry-correction.js' not in s:
    marker='<script src="./familypilot-module-registry.js" onerror="const f=document.getElementById(\'fpStaticFallback\');if(f)f.hidden=false"></script>\n'
    if marker not in s: raise SystemExit('registry marker missing')
    s=s.replace(marker,marker+line,1)
assert s.count('familypilot-module-registry-retry-correction.js')==1
assert s.index('familypilot-module-registry.js') < s.index('familypilot-module-registry-retry-correction.js') < s.index('familypilot-module-registry-ui.js')
p.write_text(s)
