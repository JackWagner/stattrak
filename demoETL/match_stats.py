""" match stat example layout
{
     'flashbangStats':{
        [{
             "user_name":"IEM24_Applicant"
            ,"user_team":True
            ,"count_team_flash":5
            ,"sum_blind_duration":7.12342
        },{
             "user_name":"LilRev"
            ,"user_team":False
            ,"count_team_flash":2
            ,"sum_blind_duration":1.32423
        },
        ...
        ]
    }
    ,'utilDamageStats':{
        [{
             "user_name":"IEM24_Applicant"
            ,"user_team":True
            ,"sum_team_dmg":35
        },{
             "user_name":"LilRev"
            ,"user_team":False
            ,"sum_team_dmg":55
        },
        ...
        ]
    }
    ...
}
"""
def get_outlier_match_stat(match_stats,user_team_only:bool = True):
    for stat_type,match_stat in match_stats.items():
        print(stat_type,match_stat)
