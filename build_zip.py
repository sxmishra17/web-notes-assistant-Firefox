import zipfile, os

OUTPUT = "web-notes-assistant-v1.2.0.zip"
ROOT = os.path.dirname(os.path.abspath(__file__))

INCLUDE = [
    "manifest.json",
    "background.js",
    "content.js",
    "content.css",
    "icons",
    "lib",
    "sidebar",
]

with zipfile.ZipFile(os.path.join(ROOT, OUTPUT), "w", zipfile.ZIP_DEFLATED) as zf:
    for entry in INCLUDE:
        full = os.path.join(ROOT, entry)
        if os.path.isfile(full):
            zf.write(full, entry.replace("\\", "/"))
        elif os.path.isdir(full):
            for dirpath, _, filenames in os.walk(full):
                for f in filenames:
                    filepath = os.path.join(dirpath, f)
                    arcname = os.path.relpath(filepath, ROOT).replace("\\", "/")
                    zf.write(filepath, arcname)

# Verify
with zipfile.ZipFile(os.path.join(ROOT, OUTPUT), "r") as zf:
    for name in zf.namelist():
        print(name)

print(f"\nDone: {OUTPUT} ({os.path.getsize(os.path.join(ROOT, OUTPUT)) // 1024} KB)")
