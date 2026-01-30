from demoparser2 import DemoParser
import os
import pandas as pd
import time
import logging as logger

pd.set_option('display.max_rows', 500)

logger.basicConfig(format='[%(asctime)s] %(levelname)s %(name)s: %(message)s', level=logger.DEBUG)

homedir      = os.path.expanduser('~')
ex_demo_name = '003658489776656351576_0546911420.dem'
full_path = os.path.join(homedir,'demos/',ex_demo_name)

local_demo = DemoParser(full_path)

def get_team_flashed_by_player(demoparser):

    #logger.info('Starting teamflash parse...')

    start = time.time()

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

    # Aggregate
    team_flash_leaderboard_df = team_flashes_df[['attacker_name','team_attacker','blind_duration']].groupby(['attacker_name','team_attacker']).agg(['count','sum'])

    end = time.time()

    time_elapsed = end - start

    logger.info(f'Time Elapsed: {time_elapsed}')

    #logger.info('Finished teamflash parse...')

    return time_elapsed

# get average elapsed time for 20 runs
sum = 0
for i in range(20):
    sum += get_team_flashed_by_player(local_demo)

logger.info(f'Average time elapsed = {sum/20}')