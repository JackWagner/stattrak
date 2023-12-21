from sqlalchemy import create_engine
from json       import load, loads

def connect():
    # temporary local user config
    db_user_conf = open('examples/config/db_user.json','r')
    db_user      = load(db_user_conf)

    database = db_user.get('database')
    user     = db_user.get('user')
    host     = db_user.get('host')
    password = db_user.get('password')
    port     = db_user.get('port')

    # default SQL Alchemy
    connection_str = f'postgresql://{user}:{password}@{host}:{port}/{database}'
    engine         = create_engine(connection_str)
    con            = None

    try:
        con = engine.connect()
        print(f'Welcome {user}!')
    except Exception as ex:
        print(f'{ex}')
        raise
    
    return con
