import requests
import logging as logger
from db_utils import Connect
from json import load,loads
from time import sleep

# Get codes
steam_conf = open('~/.ssh/steam_api.json')
steam_dict = load(steam_conf)

# Internal to our Org
api_key    = steam_dict.get('api_key')

db = Connect()

def find_user_latest_match(game_auth_code: str, steam_id: str, match_share_code: str, max_iterations=100, **kwarsg):
    """
    Returns number of requests to the API and last match_share_code
    :param api_key: Developer Steam API key
    :param game_auth_code: User provided game authentication code
    :param steam_id: Steam User ID
    :param match_share_code: Any match code from user
    :param max_iterations: Max API request iterations before quitting
    :returns: Latest match code string
    :raises: On unsuccessful HTTP response
    """

    i = 0
    while match_share_code != 'n/a':

        # emergency end condition
        i += 1
        if i >= max_iterations:
            raise ValueError(f'Error: reached {max_iterations} iterations without receiving \'n/a\' result')

        most_recent_game = match_share_code

        try:
            # TO_DO: rate limit retry logic
            sleep(1.5)
            raw_response = requests.get(f'https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1?key={api_key}&steamid={steam_id}&steamidkey={game_auth_code}&knowncode={match_share_code}')
            raw_response.raise_for_status()
        except requests.exceptions.HTTPError as errh:
            logger.error(errh)
            raise

        response        = loads(raw_response.text)

        match_share_code = response.get('result').get('nextcode')

        if match_share_code == 'n/a':

            logger.info(f'Found n/a for {steam_id}')

            sql = """
                UPDATE users.latest_match_auth
                SET update_ts = current_timestamp, match_share_code = :match_share_code
                WHERE steam_id = :steam_id;
            """
            db.execute(sql
                      ,params  = {
                           'steam_id':steam_id
                          ,'match_share_code':match_share_code
                          }
                      ,returns = False)
        else:

            logger.info(f'Found fresh match {match_share_code} for {steam_id}')

            sql = """
                INSERT INTO matches.queue (queue_id, time_inserted, steam_id, match_share_code)
                SELECT
                     gen_random_uuid()
                    ,current_timestamp
                    ,:steam_id
                    ,:match_share_code
                ;
            """
            db.execute(sql
                      ,params  = {
                           'steam_id':steam_id
                          ,'match_share_code':match_share_code
                          }
                      ,returns = False)

    return i, match_share_code

def iter_over_users():
    """
    Insert into queue and update latest match table based on SteamWeb API response
    """

    # Get 100 oldest rows, add filter to only online users for streamlined run
    sql = """
    SELECT 
         game_auth_code
        ,steam_id
        ,match_share_code
    FROM users.latest_match_auth
    ORDER BY update_ts ASC
    LIMIT 100
    ;
    """
    df = db.execute(sql)

    for user in df.itertuples(index=True, name='Pandas'):
        api_calls, res = find_user_latest_match(user.game_auth_code, user.steam_id, user.match_share_code)
        logger.info(f'User {user.steam_id} took {str(api_calls)} Steam Web API requests to find latest match {res}')
    
    logger.info('Finished finding and updating for top 100 users')

iter_over_users()