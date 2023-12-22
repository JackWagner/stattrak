import wget
import re
import os
import bz2, shutil
import logging as logger

URL_REGEX  = r'^http://replay115.valve.net/730/\w{32}.dem.bz2'
PATH_REGEX = r'^\w{32}.dem.bz2$'

class Demo():
    def __init__(self, url:str):
        self.url             = url
        #self.path
        self.is_downloaded   = False
        self.is_decompressed = False
        self.is_stored_in_db = False

    def download(self, url:str, out_dir:str='demos/'):
        """
        Downloads a demo BZ2 to specified directory if does not exist
        :param url: Full URL to download demo from, must match URL regex
        :param out_dir: Directory relative to HOME dir to download file
        """
        if re.match(URL_REGEX,url) is None:
            logger.error(f'Invalid url {url}')
            raise

        homedir  = os.path.expanduser('~')
        filename = url[31:]
        out_path = os.path.join(homedir,out_dir,filename)
        
        if os.path.isfile(out_path):
            logger.error(f'Demo {filename} has already been downloaded')
            raise

        logger.info(f'Downloading to {out_path}')
        
        try:
            wget.download(url,out_path)
        except Exception as e:
            logger.error(e)
            raise

        self.is_downloaded = True
        self.path          = out_path
        self.bz2_name      = filename
        self.demo_name     = filename[:-4]

        print(f"""
is_downloaded = {self.is_downloaded}
path = {self.path}
bz2_name = {self.bz2_name}
demo_name = {self.demo_name}
              """)

    def decompress(self):
        """
        Decompress a downloaded demo BZ2
        """

        if self.is_downloaded is False:
            logger.error(f'File from {self.url} has not been downloaded')
            raise

        if re.match(PATH_REGEX,self.path) is None:
            logger.error(f'Path {self.path} is not a valid demo path')
            raise

        with bz2.BZ2File(self.path) as fr, open(self.demo_name,"wb") as fw:
            shutil.copyfileobj(fr,fw)