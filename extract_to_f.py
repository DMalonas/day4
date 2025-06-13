from pathlib import Path

files = ["index.html", "script.js", "style.css"]
output = Path("combined.txt")

with output.open("w", encoding="utf-8") as out:
    out.write(f"===== My Code: ======\n")
    for filename in files:
        path = Path(filename)
        if path.exists():
            out.write(f"===== {filename} =====\n")
            out.write(path.read_text(encoding="utf-8"))
            out.write("\n\n")
        else:
            print(f"⚠️ {filename} not found. Skipped.")

print("✅ Combined file created: combined.txt")
