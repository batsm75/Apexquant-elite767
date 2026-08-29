#!/usr/bin/env python3
"""Redaksi otomatis nilai API key sebelum commit/push.

Latar belakang: laporan otomatis (test_reports/*.json, test_result.md, dsb) pernah
memuat nilai GEMINI_API_KEY dan membuat Google mematikan key tersebut.

Cara pakai:
    python3 scripts/redact_secrets.py            # scan + redact
    python3 scripts/redact_secrets.py --check    # hanya cek (exit 1 kalau ada bocor)

Yang diredact:
  * semua nilai variabel *_KEY / *_TOKEN / *_SECRET dari backend/.env
  * pola umum: AIza..., sk-..., SOSO-..., github_pat_..., ghp_...
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCAN_DIRS = ['test_reports', 'tests', 'scripts', 'memory', 'backend', 'frontend/src']
SCAN_FILES = ['test_result.md', 'plan.md', 'README.md', 'image_testing.md',
              'backend_test.py', 'test_core.py']
SKIP_PARTS = ('/node_modules/', '/.git/', '/build/', '/__pycache__/')
SKIP_NAMES = ('.env', 'redact_secrets.py')
PATTERNS = [
    r'AIza[0-9A-Za-z_\-]{30,}',
    r'sk-[0-9A-Za-z]{20,}',
    r'SOSO-[0-9a-f]{20,}',
    r'github_pat_[0-9A-Za-z_]{20,}',
    r'ghp_[0-9A-Za-z]{20,}',
]
PLACEHOLDER = '***REDACTED***'


def env_secrets():
    out = []
    path = os.path.join(ROOT, 'backend', '.env')
    if not os.path.exists(path):
        return out
    for line in open(path, encoding='utf-8'):
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        name, _, value = line.partition('=')
        value = value.strip().strip('"').strip("'")
        if len(value) < 12:
            continue
        if any(t in name.upper() for t in ('KEY', 'TOKEN', 'SECRET', 'PASSWORD')):
            out.append(value)
    return out


def targets():
    for rel in SCAN_FILES:
        p = os.path.join(ROOT, rel)
        if os.path.isfile(p):
            yield p
    for d in SCAN_DIRS:
        for base, _, files in os.walk(os.path.join(ROOT, d)):
            if any(s in base + '/' for s in SKIP_PARTS):
                continue
            for f in files:
                if f in SKIP_NAMES or f.endswith(('.png', '.jpg', '.jpeg', '.ico', '.woff2')):
                    continue
                yield os.path.join(base, f)


def main():
    check_only = '--check' in sys.argv
    secrets = env_secrets()
    hits = 0
    for path in targets():
        try:
            text = open(path, encoding='utf-8').read()
        except Exception:
            continue
        original = text
        for s in secrets:
            if s in text:
                text = text.replace(s, PLACEHOLDER)
        for pat in PATTERNS:
            text = re.sub(pat, PLACEHOLDER, text)
        if text != original:
            hits += 1
            rel = os.path.relpath(path, ROOT)
            if check_only:
                print(f'BOCOR: {rel}')
            else:
                open(path, 'w', encoding='utf-8').write(text)
                print(f'diredact: {rel}')
    if hits == 0:
        print('Bersih: tidak ada API key yang terekspos.')
        return 0
    return 1 if check_only else 0


if __name__ == '__main__':
    sys.exit(main())
