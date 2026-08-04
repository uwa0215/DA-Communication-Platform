import re

with open(r'c:\Users\user\Desktop\CHAT APP\companychat\src\components\chat\ChatArea.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Find all <Capitalized... tags
tags = set(re.findall(r'<([A-Z][a-zA-Z0-9]*)\b', code))

# Extract all imports
imports = set()
for match in re.findall(r'import\s+{([^}]+)}\s+from', code):
    for word in match.split(','):
        name = word.strip().split(' as ')[0].strip()
        if name:
            imports.add(name)

# Add default imports
for match in re.findall(r'import\s+([A-Z][a-zA-Z0-9]*)\s+from', code):
    imports.add(match.strip())

allowed_non_imported = {'EmojiPicker', 'EditorContent', 'UserProfileModal'}

missing = [t for t in tags if t not in imports and t not in allowed_non_imported]

print("Missing tags:", missing)
