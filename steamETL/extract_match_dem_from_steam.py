from steam.client import SteamClient
from csgo.client import CSGOClient
import logging

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
