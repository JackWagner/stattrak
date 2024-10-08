from demoparser2 import DemoParser
import os
import pandas as pd

pd.set_option('display.max_rows', 500)

homedir      = os.path.expanduser('~')
ex_demo_name = '003658489776656351576_0546911420.dem'
full_path = os.path.join(homedir,'demos/',ex_demo_name)

local_demo = DemoParser(full_path)

def get_team_flashed_by_player(demoparser):
    # Get team number by player
    team_df = demoparser.parse_event("player_team")[['team','user_steamid']].set_index('user_steamid')

    # get all flashbang events and filter out warmup
    all_flashed_events_df = demoparser.parse_event("player_blind", other=["is_warmup_period"])
    flashed_events_df     = all_flashed_events_df[all_flashed_events_df["is_warmup_period"] == False]

    # Join in the flashee team and flasher team sequentially
    flashes_w_user_team_df = flashed_events_df.merge(team_df, on='user_steamid')
    flashes_w_both_team_df = flashes_w_user_team_df.merge(team_df, left_on='attacker_steamid', right_on='user_steamid', suffixes=['_user','_attacker'])

    # Filter to where flashee team and flasher team are the same
    team_flashes_df = flashes_w_both_team_df[flashes_w_both_team_df["team_user"]==flashes_w_both_team_df["team_attacker"]]

    # Aggregate and sort by team
    team_flash_leaderboard_df = team_flashes_df[['attacker_name','team_attacker','blind_duration']].groupby(['attacker_name','team_attacker']).agg(['count','sum'])
    #print(team_flash_leaderboard_df)
    print(team_flash_leaderboard_df.sort_values(by=[('blind_duration','count')], ascending=False))
