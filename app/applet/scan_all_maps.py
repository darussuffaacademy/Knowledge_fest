import os
import re

files_to_check = []
for root, dirs, files in os.walk('/app/applet'):
    if any(p in root for p in ['node_modules', '.git', 'dist']):
        continue
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            files_to_check.append(os.path.join(root, file))

for path in sorted(files_to_check):
    rel_path = os.path.relpath(path, '/app/applet')
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for idx, line in enumerate(lines):
        if '.map(' in line:
            stripped = line.strip()
            # print lines that might be unsafe
            print(f"{rel_path}:{idx + 1}: {stripped}")
