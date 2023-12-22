from sqlalchemy import create_engine, text
from json       import load, loads
import pandas as pd

# temporary local user config
db_user_conf = open('examples/config/db_user.json','r')
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
        self.connection     = create_engine(self.connection_str)
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
                    df = pd.read_sql_query(sql = sql, con = self.connection, params = params)
                    return df
                connection.execute(sql,params)
        except Exception as ex:
            print(f'{ex}')
            raise