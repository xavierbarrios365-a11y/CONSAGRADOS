
import sys

def check_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    level = 0
    for i, line in enumerate(lines):
        line_num = i + 1
        for char in line:
            if char == '{':
                level += 1
            elif char == '}':
                level -= 1
                if level < 0:
                    print(f"Extra closing brace at line {line_num}: {line.strip()}")
                    # Reset level to continue
                    level = 0
        if "return" in line and level == 0 and "function" not in line:
            print(f"Illegal return statement at line {line_num}: {line.strip()}")

if __name__ == "__main__":
    check_braces(sys.argv[1])
