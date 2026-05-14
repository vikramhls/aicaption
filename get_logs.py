import subprocess
result = subprocess.run(["docker", "logs", "ai-captioner"], capture_output=True, text=True)
with open("c:/Users/Harsh/OneDrive/Desktop/ai-captioning/logs.txt", "w", encoding="utf-8") as f:
    f.write(result.stdout)
    f.write(result.stderr)
