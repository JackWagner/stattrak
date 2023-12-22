from steam.client import SteamClient
from csgo.client import CSGOClient
from csgo.sharecode import decode
from csgo.features.match import Match
import logging
import os
from db_utils      import Connect
from json          import load, loads
from download_demo import download_demo

homedir = os.path.expanduser('~')
steam_user_conf = open(os.path.join(homedir,'.ssh/steam_user.json'),'r')
steam_user      = load(steam_user_conf)

# Instantiate a DB connection
db = Connect()

# Get a user's known game code
sql = "SELECT * FROM users.steam_auth;"
df  = db.execute(sql)
print(df)

# Decode the match code and break into constituent parts
steam_id         = int(df.iloc[0]['steam_id'])
match_share_code = str(df.iloc[0]['known_game_code'])
match_decode     = decode(match_share_code)

matchid   = match_decode.get('matchid')
outcomeid = match_decode.get('outcomeid')
token     = match_decode.get('token')

#instantiate GameCoordinator
logging.basicConfig(format='[%(asctime)s] %(levelname)s %(name)s: %(message)s', level=logging.DEBUG)

client = SteamClient()
cs = CSGOClient(client)

@client.on('logged_on')
def start_csgo():
    cs.launch()

@cs.on('ready')
def gc_ready():
    # send messages to gc
    # Use match decode to retrieve info
    cs.request_full_match_info(matchid, outcomeid, token)
    print('Request full match... waiting')
    response, = cs.wait_event('full_match_info')

    match_stats = response.matches[0]
    final_round = match_stats.roundstatsall[-1]

    demo_url    = str(final_round.map)

    sql = """
        INSERT INTO users.matches(steam_id, match_share_code, demo_url)
        SELECT 
            :steam_id
           ,:match_share_code
           ,:demo_url
        WHERE 
        NOT EXISTS (
            SELECT steam_id, match_share_code
            FROM users.matches
            WHERE steam_id         = :steam_id
              AND match_share_code = :match_share_code
        );"""
    
    df = db.execute(sql
                   ,params ={
                        'steam_id':steam_id
                       ,'match_share_code':match_share_code
                       ,'demo_url':demo_url
                       }
                   ,returns =False)

    download_demo(demo_url,'demos/')

    cs.emit("match_info_collected")
    pass

@cs.on('match_info_collected')
def match_collected():
    print('Finished')
    exit()
    pass

steam_username = steam_user.get('username')
steam_password = steam_user.get('password')

client.cli_login(username=steam_username, password=steam_password)
client.run_forever()
