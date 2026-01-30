from steam.client        import SteamClient
from csgo.client         import CSGOClient
from csgo.sharecode      import decode
from json                import load
from db_utils            import Connect
from demo                import Demo
from time                import sleep
import logging as logger
import os

homedir         = os.path.expanduser('~')
steam_user_conf = open(os.path.join(homedir,'.ssh/steam_user.json'),'r')
steam_user      = load(steam_user_conf)

logger.basicConfig(format='[%(asctime)s] %(levelname)s %(name)s: %(message)s', level=logger.DEBUG)

# Instantiate a DB connection
db = Connect()

# Instantiate GameCoordinator
client = SteamClient()
cs = CSGOClient(client)

@client.on('logged_on')
def start_csgo():
    cs.launch()

@cs.on('ready')
def gc_ready():
    cs.emit("get_match_from_queue")
    pass

@cs.on('get_match_from_queue')
def get_match_from_queue():
    # Get a user's known game code
    sql = """
            SELECT queue_id, time_inserted, steam_id, match_share_code 
            FROM matches.queue
            ORDER BY time_inserted ASC
            LIMIT 1;
          """
    try:
        df  = db.execute(sql)
    except:
        logger.error('Queue is not accessible... quitting')
        exit()

    if df.empty:
        cs.emit('wait_for_queue')
    else:
        cs.emit('dequeue_match',df)
        
    pass

@cs.on('wait_for_queue')
def wait_for_queue():
    logger.info('Queue is empty, waiting 10 seconds')
    sleep(10)
    cs.emit('get_match_from_queue')
    pass

@cs.on('dequeue_match')
def dequeue_match(df):
    # Decode the match code and break into constituent parts
    queue_id         = str(df.iloc[0]['queue_id'])

    logger.info(f'Dequeing {queue_id}')

    sql = """
            DELETE FROM matches.queue
            WHERE queue_id = :queue_id;
          """
    try:
        db.execute(sql
                  ,params  = {'queue_id':queue_id}
                  ,returns = False)
    except Exception as e:
        logger.error(e)
        logger.info(f'Failed to dequeue {queue_id}... quitting')
        exit()
    
    cs.emit('match_code_decode',df)
    pass

@cs.on('match_code_decode')
def match_code_decode(df):
    match_share_code = str(df.iloc[0]['match_share_code'])

    logger.info(f'Attempting to decode {match_share_code}')
    try:
        match_decode     = decode(match_share_code)
    except Exception as e:
        logger.error(e)
        logger.info(f'Failed to decode {match_share_code} sending to failed queue')
        cs.emit('send_to_failed_queue',df)
        pass

    logger.info(f'Decoded {match_share_code}')
    cs.emit('process_match',df,match_decode)
    pass


@cs.on('process_match')
def match_processing(df, match_decode):
    steam_id         = str(df.iloc[0]['steam_id'])
    match_share_code = str(df.iloc[0]['match_share_code'])

    matchid   = match_decode.get('matchid')
    outcomeid = match_decode.get('outcomeid')
    token     = match_decode.get('token')

    # Use match decode to retrieve info
    logger.info('Requesting full match... waiting')
    cs.request_full_match_info(matchid, outcomeid, token)
    response, = cs.wait_event('full_match_info')

    # Slice out the URL, in the last round's stats
    match_stats = response.matches[0]
    final_round = match_stats.roundstatsall[-1]

    demo_url    = str(final_round.map)

    logger.info('Sending match code and URL to the DB')
    sql = """
        INSERT INTO matches.processed(steam_id, match_share_code, demo_url)
        SELECT 
            :steam_id
           ,:match_share_code
           ,:demo_url
        WHERE 
        NOT EXISTS (
            SELECT steam_id, match_share_code
            FROM matches.processed
            WHERE steam_id         = :steam_id
              AND match_share_code = :match_share_code
        );"""
    
    db.execute(sql
              ,params ={
                        'steam_id':steam_id
                       ,'match_share_code':match_share_code
                       ,'demo_url':demo_url
                       }
              ,returns =False)
    
    # Download, decompress, parse, store and delete Demo
    try:
        demo = Demo(demo_url, db=db)
        demo.process()
    except Exception as e:
        logger.error(e)
        logger.info(f'Failed to process {demo_url} sending to failed queue')
        cs.emit('send_to_failed_queue',df)
        pass

    cs.emit("match_info_collected")
    pass

@cs.on('match_info_collected')
def match_collected():
    logger.info('Match successfully processed')
    cs.emit("get_match_from_queue")
    pass

@cs.on('send_to_failed_queue')
def send_to_failed_queue(df):
    queue_id         = str(df.iloc[0]['queue_id'])
    time_inserted    = str(df.iloc[0]['time_inserted'])
    steam_id         = str(df.iloc[0]['steam_id'])
    match_share_code = str(df.iloc[0]['match_share_code'])

    sql = """
        INSERT INTO matches.queue_failed_to_process(queue_id, time_inserted, steam_id, match_share_code)
        SELECT 
            :queue_id
           ,:time_inserted
           ,:steam_id
           ,:match_share_code
        WHERE 
        NOT EXISTS (
            SELECT queue_id
            FROM matches.queue_failed_to_process
            WHERE queue_id         = :queue_id
        );"""
    
    db.execute(sql
              ,params = {
                        'queue_id':queue_id
                       ,'time_inserted':time_inserted
                       ,'steam_id':steam_id
                       ,'match_share_code':match_share_code
                       }
              ,returns = False)
    
    cs.emit("get_match_from_queue")


if __name__ == "__main__":
    steam_username = steam_user.get('username')
    steam_password = steam_user.get('password')

    client.cli_login(steam_username, steam_password)
    client.run_forever()