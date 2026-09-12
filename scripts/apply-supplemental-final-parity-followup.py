from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'src/attendancePostConfirmEditBootstrap.js'
text = path.read_text(encoding='utf-8')
old = """  if (activeSource === 'supplemental') {\n    return {\n      allowed: Boolean(serverAccess?.allowed),\n      reason: serverAccess?.reason || 'unknown',\n      bypass: Boolean(serverAccess?.bypass),\n      remainingMs: Math.max(0, Number(serverAccess?.remaining_seconds || 0) * 1000),\n      expiresAt: serverAccess?.expires_at || '',\n    };\n  }"""
new = """  if (activeSource === 'supplemental') {\n    const bypass = Boolean(serverAccess?.bypass);\n    const expiresAt = serverAccess?.expires_at || '';\n    const expiryMs = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;\n    const remainingMs = bypass\n      ? Math.max(0, Number(serverAccess?.remaining_seconds || 0) * 1000)\n      : (Number.isFinite(expiryMs) ? Math.max(0, expiryMs - nowFromServerClock().getTime()) : Math.max(0, Number(serverAccess?.remaining_seconds || 0) * 1000));\n    const serverAllowed = Boolean(serverAccess?.allowed);\n    const allowed = serverAllowed && (bypass || remainingMs > 0);\n    return {\n      allowed,\n      reason: allowed ? (serverAccess?.reason || 'within_edit_window') : (serverAllowed && !bypass ? 'edit_window_expired' : (serverAccess?.reason || 'unknown')),\n      bypass,\n      remainingMs,\n      expiresAt,\n    };\n  }"""
count = text.count(old)
if count != 1:
    raise SystemExit(f'countdown patch: expected one match, found {count}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Applied supplemental countdown parity fix.')
