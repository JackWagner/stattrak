from sqlalchemy import create_engine, text
from json       import load
import os
import pandas  as pd
import logging as logger

# temporary local user config
homedir      = os.path.expanduser('~')
db_user_conf = open(os.path.join(homedir,'.ssh/db_user.json'),'r')
db_user      = load(db_user_conf)

class Connect():
    """
    Database connection via SQLAlchemy
    """

    def __init__(self): 
        self.database = db_user.get('database')
        self.user     = db_user.get('user')
        self.host     = db_user.get('host')
        self.password = db_user.get('password')
        self.port     = db_user.get('port')
        
        self.connection_str = f'postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}'
        self.connection     = create_engine(self.connection_str,future=True)
        print(f'Welcome {self.user}!')

    def execute(self, sql:str, params:dict = {}, returns:bool = True):
        """
        Executes SQL via SQLAlchemy Engine
        :param sql: SQL query as a string to be executed
        :param params: Dict storing strings to be safely passed to query
        :param returns: True if query returns anything, False otherwise
        :return: Resulting Pandas dataframe if the query returns anything
        """
        try:
            with self.connection.connect() as connection:
                if returns:
                    df = pd.read_sql_query(sql = text(sql), con = self.connection, params = params)
                    return df
                connection.execute(text(sql),params)
                connection.commit()
        except Exception as e:
            logger.error(e)
            raise
