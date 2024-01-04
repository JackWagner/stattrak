from steam.client import SteamClient
from json         import load
import logging as logger
import os

homedir         = os.path.expanduser('~')
steam_user_conf = open(os.path.join(homedir,'.ssh/steam_user.json'),'r')
steam_user      = load(db_user_conf)

def send_user_message(user_id:int, message:str):

    user = client.get_user(user_id)

    if user.relationship == 0:
        logger.error(f'User {user_id} is not friends with stattrak')
        raise
    try:
        user.send_message(message)
    except Exception as e::
        logger.error(e)
        logger.info(f'Message to {user_id} failed to send')
        raise
