import logging
import re
from json import load

user_conf  = open('config/user.json')
user_dict  = load(user_conf)

# User provided, to be stored in db
known_game_code = user_dict.get('known_game_code')

# For char array to int calc
DICTIONARY        = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';
DICTIONARY_LENGTH = len(DICTIONARY);
SHARECODE_PATTERN = r'^CSGO(-?[\w]{5}){5}$';

def decode_match_share_code(match_share_code: str):
    """
        Returns dictionary containing match_id, reservation_id and tv_port 
        :param match_share_code: match share code to decode
        :param verbose: sets logging to info level if true
    """

    if re.search(SHARECODE_PATTERN,match_share_code) is None:
        logging.error(f'Invalid match share code {match_share_code} does not match {SHARECODE_PATTERN}')
        raise

    clean_share_code = match_share_code.replace('CSGO','').replace('-','')

    # breakout code into reversed char array
    reverse_code = list(clean_share_code)
    reverse_code.reverse()

    # convert chars to int based on DICTIONARY 
    code_int = 0
    for c in reverse_code:
        code_int = code_int * DICTIONARY_LENGTH + DICTIONARY.index(c)

    # Turn to left padded hex, break up into bytes
    code_hex   = hex(code_int).lstrip("0x").zfill(36)
    code_bytes = [code_hex[i:i+2] for i in range(0, len(code_hex), 2)] 

    # Slice and re-reverse
    match_id_bytes       = code_bytes[0:8]
    reservation_id_bytes = code_bytes[8:16]
    tv_port_bytes        = code_bytes[16:18]

    match_id_bytes.reverse()
    reservation_id_bytes.reverse()
    tv_port_bytes.reverse()

    return {
         "match_id":int(''.join(match_id_bytes),16)
        ,"reservation_id":int(''.join(reservation_id_bytes),16)
        ,"tv_port":int(''.join(tv_port_bytes),16)
    }

decode_dict = decode_match_share_code(known_game_code)
print(f'Decode: {known_game_code} => {decode_dict}')

