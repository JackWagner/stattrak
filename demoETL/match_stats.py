from math import sqrt

# Demo Parsing 

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

    #print(team_flashes_df)

    # Aggregate and sort by team
    team_flash_leaderboard_df = team_flashes_df[['attacker_name','team_attacker','blind_duration']].groupby(['attacker_name','team_attacker']).agg(['count','sum'])
    team_flash_leaderboard_df.rename(columns={'attacker_name': 'user_name'}, inplace=True)
    #print(team_flash_leaderboard_df)
    print(team_flash_leaderboard_df.sort_values(by=[('blind_duration','count')], ascending=False))
    return team_flash_leaderboard_df

# Demo Stats Utils

def get_merged_stat_df(stat_df_list:list, key:str='user_name'):
    if len(stat_df_list) == 1:
        return stat_df_list[0]

    stat_dfs_w_index = [stat_df.set_index(key) for stat_df in stat_df_list]
    return stat_dfs_w_index[0].join(stat_dfs_w_index[1:])

def get_stat_json(df):
    return df.to_json(orient="records")

"""
match_stats = [
    {
         "user_name":"Concha"
        ,"user_team":True
        ,"team_flash_count":23
        ,"blind_duration_sec_sum":31.499216
    },{
         "user_name":"Diminish"
        ,"user_team":False
        ,"team_flash_count":18
        ,"blind_duration_sec_sum":23.043745
    },{
         "user_name":"LilRev"
        ,"user_team":True
        ,"team_flash_count":10
        ,"blind_duration_sec_sum":15.131394
    },{
         "user_name":"Luffy"
        ,"user_team":False
        ,"team_flash_count":6
        ,"blind_duration_sec_sum":8.364708
    },{
         "user_name":"Agent Smith"
        ,"user_team":False
        ,"team_flash_count":5
        ,"blind_duration_sec_sum":14.537228
    },{
         "user_name":"IEM24_Applicant"
        ,"user_team":True
        ,"team_flash_count":5
        ,"blind_duration_sec_sum":7.574622
    },{
         "user_name":"smooky"
        ,"user_team":False
        ,"team_flash_count":5
        ,"blind_duration_sec_sum":10.155760
    },{
         "user_name":"Bymst"
        ,"user_team":False
        ,"team_flash_count":4
        ,"blind_duration_sec_sum":7.136735
    },{
         "user_name":"tmpr"
        ,"user_team":True
        ,"team_flash_count":1
        ,"blind_duration_sec_sum":0.517483
    }
]
"""

# Automated Outlier Detection

def get_stat_types_list(match_stats:list):
    stat_types = []
    for key, value in match_stats[0].items():
        if isinstance(value,(int, float)) and not isinstance(value,bool):
            stat_types.append(key)
    return stat_types

def get_empty_stat_dict(match_stats:list):
    stat_dict = {}
    for stat_type in get_stat_types_list(match_stats):
        stat_dict[stat_type] = 0
    return stat_dict

def get_average_stat_dict(match_stats:list):
    stat_dict = get_empty_stat_dict(match_stats)
    for user_stats in match_stats:
        for stat_type in get_stat_types_list(match_stats):
            stat_dict[stat_type] += user_stats.get(stat_type)
    return { key:value/10.0 for key,value in stat_dict.items() }

def get_standard_deviation_stat_dict(match_stats:list):
    std_dev_stat_dict = get_empty_stat_dict(match_stats)
    avg_stat_dict     = get_average_stat_dict(match_stats)
    for user_stats in match_stats:
        for stat_type in get_stat_types_list(match_stats):
            std_dev_stat_dict[stat_type] += (user_stats.get(stat_type) - avg_stat_dict.get(stat_type)) ** 2
    return { key:sqrt(value/10.0) for key,value in std_dev_stat_dict.items() }

def get_zscore_stat_tuple_list(match_stats:list):
    zscore_stat_tuple_list = []
    avg_stat_dict          = get_average_stat_dict(match_stats)
    std_dev_stat_dict      = get_standard_deviation_stat_dict(match_stats)
    for user_stats in match_stats:
        for stat_type in get_stat_types_list(match_stats):
            zscore = (user_stats.get(stat_type) - avg_stat_dict.get(stat_type))/std_dev_stat_dict.get(stat_type)
            zscore_stat_tuple_list.append(
                                    (user_stats.get('user_name')
                                    ,stat_type
                                    ,user_stats.get(stat_type)
                                    ,zscore)
            )
    return zscore_stat_tuple_list

def get_top_n_outlier_stat(match_stats:list,n:int=4):
    return sorted(get_zscore_stat_tuple_list(match_stats),key=lambda x: abs(x[3]),reverse=True)[:n]

def get_outlier_stat_message(match_stats:list):
    message = ""
    for outlier_stat_tuple in get_top_n_outlier_stat(match_stats):
        message += f"{outlier_stat_tuple[0]} had {'only' if outlier_stat_tuple[3] < 0 else 'a whopping'} {outlier_stat_tuple[2]} {outlier_stat_tuple[1]}\n"
    return message