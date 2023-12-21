from steam.client import SteamClient
from csgo.client import CSGOClient
from csgo.sharecode import decode
from csgo.features.match import Match
import logging

from json import load, loads
from sqlalchemy import create_engine
import pandas as pd

steam_user_conf = open('examples/config/steam_user.json','r')
steam_user      = load(steam_user_conf)

db_user_conf = open('examples/config/db_user.json','r')
db_user      = load(db_user_conf)

database = db_user.get('database')
user     = db_user.get('user')
host     = db_user.get('host')
password = db_user.get('password')
port     = db_user.get('port')

connection_str = f'postgresql://{user}:{password}@{host}:{port}/{database}'
engine         = create_engine(connection_str)
connection_res = None

try:    
    connection_res = engine.connect()
    print(f'Welcome {user}!')
except Exception as ex:
    print(f'{ex}')
    raise

# Get a user's known game code
query = "SELECT * FROM users.steam_auth;"
df = pd.read_sql_query(sql=query,con=connection_res)
print(df)

# Decode the match code and break into constituent parts
match_decode = decode(df.iloc[0]['known_game_code'])

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
    print(str(response))
    print(type(response))
    print(dir(response))
    full_match_dict = loads(str(response))
    print(full_match_dict)
    cs.emit("match_info_collected")
    pass

@cs.on('match_info_collected')
def match_collected():
    print(str(full_match_info))
    raise

steam_username = steam_user.get('username')
steam_password = steam_user.get('password')

client.cli_login(username=steam_username, password=steam_password)
client.run_forever()


