from demoparser2 import DemoParser
import pandas as pd
import glob

pd.set_option('display.max_rows', 500)

local_demo_path = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\game\\csgo\\replays\\match730_003654861392579657742_0076166368_376.dem'

local_demo = DemoParser(local_demo_path)


df = local_demo.parse_event("player_death", player=["last_place_name", "team_name"], other=["total_rounds_played", "is_warmup_period"])

# filter out team-kills and warmup, only me
df = df[df["attacker_team_name"] != df["user_team_name"]]
df = df[df["is_warmup_period"] == False]
df = df[df["attacker_name"] == 'IEM24_Applicant']

# group-by like in sql
df = df.groupby(["total_rounds_played", "attacker_name"]).size().to_frame(name='total_kills').reset_index()
print(df)
