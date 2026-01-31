"""Debug script to check round data structure"""
import os
from demoparser2 import DemoParser

demo_path = "demos/match730_003654861392579657742_0076166368_376.dem"

if os.path.exists(demo_path):
    parser = DemoParser(demo_path)
    rounds = parser.parse_event("round_end")

    print(f"Type: {type(rounds)}")
    print(f"Length: {len(rounds)}")

    if hasattr(rounds, 'columns'):
        print(f"Columns: {list(rounds.columns)}")
        print("\nFirst 3 rounds:")
        print(rounds.head(3))
    elif isinstance(rounds, list):
        import pandas as pd
        df = pd.DataFrame(rounds)
        print(f"Columns: {list(df.columns)}")
        print("\nFirst 3 rounds:")
        print(df.head(3))
else:
    print(f"Demo file not found: {demo_path}")
