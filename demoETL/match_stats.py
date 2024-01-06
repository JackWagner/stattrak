from math import sqrt
import json 

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
    return sorted(get_zscore_stat_tuple_list(match_stats),key=lambda x: x[3],reverse=True)[:n]

def get_outlier_stat_message(match_stats:list):
    message = ""
    for outlier_stat_tuple in get_top_n_outlier_stat(match_stats):
        message += f"{outlier_stat_tuple[0]} had {'only' if outlier_stat_tuple[3] < 0 else 'a whopping'} {outlier_stat_tuple[2]} {outlier_stat_tuple[1]}\n"
    return message

print(get_outlier_stat_message(match_stats))