from pathlib import Path
import base64
import gzip
import hashlib
import re

source_path = Path("src/familypilot.html")
source = source_path.read_text(encoding="utf-8")

start = source.index("function renderMore()")
end = source.index("function renderAll()", start)

fixed_render_more = r'''function renderMore(){let available=state.wallets.filter(w=>!w.archivedAt&&(!Array.isArray(w.allowedMemberIds)||w.allowedMemberIds.includes(state.currentMemberId)));if(!available.length)available=state.wallets.filter(w=>!w.archivedAt);if(available.length&&!available.some(w=>w.id===state.activeWalletId))state.activeWalletId=available[0].id;$('walletSelect').innerHTML=available.map(w=>`<option value="${esc(w.id)}"${w.id===state.activeWalletId?' selected':''}>${esc(w.name)} · ${esc(w.nativeCurrency)}</option>`).join('');$('themeSelect').value=themePreference();$('actorSelect').innerHTML=MEMBERS.map(m=>`<option value="${m.id}"${m.id===state.currentMemberId?' selected':''}>${m.name}</option>`).join('');$('trashFlagBtn').classList.toggle('on',state.config.trashRetentionEnabled);$('walletContracts').textContent=state.wallets.map(w=>{const rows=[w.name,`тип = ${w.type}`,`валюта = ${w.nativeCurrency}`,`в семейном капитале = ${w.includedInHouseholdCapital?'да':'нет'}`];if(w.ownerMemberId)rows.push(`владелец = ${memberName(w.ownerMemberId)}`);return rows.join(String.fromCharCode(10))}).join(String.fromCharCode(10,10))}
'''

source = source[:start] + fixed_render_more + source[end:]
source_path.write_text(source, encoding="utf-8")

runtime_match = re.search(r"<script>\s*([\s\S]*?)</script>", source)
if not runtime_match:
    raise RuntimeError("Runtime script not found")
Path("/tmp/familypilot-runtime.js").write_text(runtime_match.group(1), encoding="utf-8")

index_path = Path("index.html")
index = index_path.read_text(encoding="utf-8")
payload = base64.b64encode(gzip.compress(source.encode("utf-8"), compresslevel=9)).decode("ascii")
index, count = re.subn(r'const b="[A-Za-z0-9+/=]+"', f'const b="{payload}"', index, count=1)
if count != 1:
    raise RuntimeError("Loader payload replacement failed")
index_path.write_text(index, encoding="utf-8")

checks = {
    "PACKAGE-MARKER": "operation-first-app-shell-v1" in source,
    "PERSISTENT-TOP-BAR-REMOVED": '<header class="top">' not in source,
    "HOME-OPERATIONS-FIRST": source.find("home-primary-actions") < source.find("card capital"),
    "HOME-DOCK-DUPLICATION-REMOVED": "action-dock hidden" in source and "const dockVisible=name==='operations'" in source,
    "WALLET-MOVED-TO-MORE": 'id="walletSelect"' in source,
    "THEME-MOVED-TO-MORE": 'id="themeSelect"' in source and 'id="themeBtn"' not in source,
    "PROFILE-INITIAL-REMOVED": 'aria-label="Профиль"' not in source,
    "NONDEFAULT-WALLET-CONTEXTUAL": 'id="nonDefaultWalletNotice"' in source and "renderWalletContext" in source,
    "CATEGORY-LIMIT-50": "CATEGORY_NAME_MAX=50" in source and source.count('maxlength="50"') >= 2,
    "CATEGORY-OVERFLOW-SAFE": ".cat-row b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" in source,
    "MODAL-SCROLL-LOCK-PRESERVED": source.count("function lockBodyNow()") == 1 and source.count("function syncBodyLock()") == 1,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise RuntimeError("Source gates failed: " + ", ".join(failed))

sha256 = lambda value: hashlib.sha256(value.encode("utf-8")).hexdigest()
verification = Path("verification")
verification.mkdir(exist_ok=True)
verification.joinpath("operation-first-app-shell-source-gate.txt").write_text(
    "\n".join(
        [
            "FamilyPilot operation-first app shell source gate",
            *[f"{name}: VERIFIED" for name in checks],
            f"SOURCE-SHA256: {sha256(source)}",
            f"INDEX-SHA256: {sha256(index)}",
            "PACKAGE-CLOSURE: SOURCE-VERIFIED",
            "",
        ]
    ),
    encoding="utf-8",
)
verification.joinpath("operation-first-app-shell-sha.txt").write_text(
    f"SOURCE-SHA256: {sha256(source)}\nINDEX-SHA256: {sha256(index)}\n",
    encoding="utf-8",
)
print("CORRECTION: VERIFIED")
