from demoparser2 import DemoParser
import os
import pandas as pd

pd.set_option('display.max_rows', 500)

homedir      = os.path.expanduser('~')
ex_demo_name = '003658489776656351576_0546911420.dem'
full_path = os.path.join(homedir,'demos/',ex_demo_name)

local_demo = DemoParser(full_path)

def get_entire_match_by_tick():
    # getting entire match by tick

    ticks_w_all_player_data = local_demo.parse_ticks(["X","Y","Z","health","score","mvps","is_alive","balance","inventory","life_state","pitch","yaw","is_auto_muted","crosshair_code","pending_team_num","player_color","ever_played_on_team","is_coach_team","rank","rank_if_win","rank_if_loss","rank_if_tie","comp_wins","comp_rank_type","is_controlling_bot","has_controlled_bot_this_round","can_control_bot","armor","has_defuser","has_helmet","spawn_time","death_time","game_time","is_connected","player_name","player_steamid","fov","start_balance","total_cash_spent","cash_spent_this_round","music_kit_id","leader_honors","teacher_honors","friendly_honors","ping","move_collide","move_type","team_num","active_weapon","looking_at_weapon","holding_look_at_weapon","next_attack_time","duck_time_ms","max_speed","max_fall_velo","duck_amount","duck_speed","duck_overrdie","old_jump_pressed","jump_until","jump_velo","fall_velo","in_crouch","crouch_state","ducked","ducking","in_duck_jump","allow_auto_movement","jump_time_ms","last_duck_time","is_rescuing","weapon_purchases_this_match","weapon_purchases_this_round","spotted","approximate_spotted_by","time_last_injury","direction_last_injury","player_state","passive_items","is_scoped","is_walking","resume_zoom","is_defusing","is_grabbing_hostage","blocking_use_in_progess","molotov_damage_time","moved_since_spawn","in_bomb_zone","in_buy_zone","in_no_defuse_area","killed_by_taser","move_state","which_bomb_zone","in_hostage_rescue_zone","stamina","direction","shots_fired","armor_value","velo_modifier","ground_accel_linear_frac_last_time","flash_duration","flash_max_alpha","wait_for_no_attack","last_place_name","is_strafing","round_start_equip_value","current_equip_value","velocity","velocity_X","velocity_Y","velocity_Z","agent_skin","user_id","entity_id"])
    print(f'all ticks - all player data: {ticks_w_all_player_data.memory_usage(index=True).sum()/(1024*1024)} MB')
    print(ticks_w_all_player_data)

    ticks_w_all_player_data.to_json(f'{full_path[:-4]}_ticks_all_player.json', orient = 'split', compression = 'infer')

    print('\n----------------------------\n')

    ticks_w_no_player_data = local_demo.parse_ticks([])
    print(f'all ticks - no player data: {ticks_w_no_player_data.memory_usage(index=True).sum()/(1024*1024)} MB')
    print(ticks_w_no_player_data)

    ticks_w_no_player_data.to_json(f'{full_path[:-4]}_ticks_no_player.json', orient = 'split', compression = 'infer')
