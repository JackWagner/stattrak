import requests
import regex as re
from json import load,loads

DICTIONARY        = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';
DICTIONARY_LENGTH = len(DICTIONARY);
SHARECODE_PATTERN = r'^CSGO(-?[\w]{5}){5}$';

# Get codes
steam_conf = open('config/steam_api.json')
steam_dict = load(steam_conf)

user_conf  = open('config/user.json')
user_dict  = load(user_conf)

# Internal to our Org
api_key        = steam_dict.get('api_key')

# User provided, to be stored in db
game_auth_code  = user_dict.get('game_auth_code')
steam_id        = user_dict.get('steam_id')
known_game_code = user_dict.get('known_game_code')


def get_most_recent_game_code(api_key: str, game_auth_code: str, steam_id: str, known_game_code: str, max_iterations=100, **kwarsg): 
    """
    Returns the match share code for a user's most recent CS2 match
    :param api_key: Developer Steam API key
    :param game_auth_code: User provided game authentication code
    :param steam_id: Steam User ID
    :param known_game_code: Any match code from user
    :param max_iterations: Max API request iterations before quitting
    :returns: Latest match code string
    :raises: On unsuccessful HTTP response
    """
    
    i = 0
    while known_game_code != 'n/a':

        # emergency end condition
        i += 1
        if i >= max_iterations:
            raise ValueError(f'Error: reached {max_iterations} iterations without receiving \'n/a\' result')

        most_recent_game = known_game_code

        try: 
            # TO_DO: rate limit retry logic
            raw_response = requests.get(f'https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1?key={api_key}&steamid={steam_id}&steamidkey={game_auth_code}&knowncode={known_game_code}')
            raw_response.raise_for_status()
        except requests.exceptions.HTTPError as errh: 
            raise

        response        = loads(raw_response.text)
        known_game_code = response.get('result').get('nextcode')

    return most_recent_game

def decode_match_share_code(match_share_code: str, verbose = True):
    """
        Returns dictionary containing match_id, reservation_id and tv_port 
        :param match_share_code: match share code to decode
    """

    if re.search(SHARECODE_PATTERN,match_share_code) is None:
        raise ValueError(f'Invalid match share code {match_share_code}')

    clean_share_code = match_share_code.replace('CSGO','').replace('-','')

    reverse_code = list(clean_share_code)
    reverse_code.reverse()

    code_int = 0
    for c in reverse_code:
        code_int = code_int * DICTIONARY_LENGTH + DICTIONARY.index(c)

    code_hex = hex(code_int).lstrip("0x").zfill(36)

    code_bytes = [code_hex[i:i+2] for i in range(0, len(code_hex), 2)] 

    match_id_bytes       = code_bytes[0:8]
    reservation_id_bytes = code_bytes[8:16]
    tv_port_bytes        = code_bytes[16:18]

    match_id_bytes.reverse()
    reservation_id_bytes.reverse()
    tv_port_bytes.reverse()

    if verbose:
        print(f"""
=> {match_share_code}
=> {clean_share_code} 
=> {reverse_code}
=> {code_int} 
=> {code_hex} 
=> {code_bytes}
=> ({match_id_bytes},{reservation_id_bytes},{tv_port_bytes})
""")

    return {
         "match_id":int(''.join(match_id_bytes),16)
        ,"reservation_id":int(''.join(reservation_id_bytes),16)
        ,"tv_port":int(''.join(tv_port_bytes),16)
    }


my_latest = get_most_recent_game_code(api_key, game_auth_code, steam_id, known_game_code)
print(my_latest)

decode_dict = decode_match_share_code(my_latest)
print(decode_dict)


