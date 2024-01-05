""" match stat example layout
[
    {
         "user_name":"IEM24_Applicant"
        ,"user_team":True
        ,'stats':{
                ,"count_team_flash":5
                ,"sum_blind_duration":7.12342
                ,"sum_team_dmg":55
                }
    },{
         "user_name":"Agent Smith"
        ,"user_team":False
        ,'stats':{
                ,"count_team_flash":18
                ,"sum_blind_duration":23.043745
                ,"sum_team_dmg":234
                }
    }
]
"""
def get_outlier_match_stat(match_stats,user_team_only:bool = True):
    for stat_type,match_stat in match_stats.items():
        print(stat_type,match_stat)
