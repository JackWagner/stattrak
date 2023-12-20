from steam.client import SteamClient
from csgo.client import CSGOClient
from csgo.sharecode import decode
import logging

from json import load
from sqlalchemy import create_engine
import pandas as pd

db_user_conf = open('examples/config/db_user.json','r')
db_user = load(db_user_conf)

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

query = "SELECT * FROM users.steam_auth;"
df = pd.read_sql_query(sql=query,con=connection_res)

print(df)
print(decode(df.iloc[0]['known_game_code']))

logging.basicConfig(format='[%(asctime)s] %(levelname)s %(name)s: %(message)s', level=logging.DEBUG)

client = SteamClient()
cs = CSGOClient(client)

@client.on('logged_on')
def start_csgo():
    cs.launch()

@cs.on('ready')
def gc_ready():
    # send messages to gc
    pass

client.cli_login()
client.run_forever()

