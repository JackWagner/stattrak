import wget
import re
import os
import bz2, shutil
import logging as logger
import subprocess

URL_REGEX  = r'^http://replay115.valve.net/730/\w{32}.dem.bz2'
PATH_REGEX = r'^\w{32}.dem.bz2$'

class Demo():
    def __init__(self, url:str):
        self.url             = url
        #self.path
        self.is_downloaded   = False
        self.is_decompressed = False
        self.is_stored_in_db = False
        self.is_deleted      = False

    def download(self, url:str, out_dir:str='demos/'):
        """
        Downloads a demo BZ2 to specified directory if does not exist
        :param url: Full URL to download demo from, must match URL regex
        :param out_dir: Directory relative to HOME dir to download file
        """
        if re.match(URL_REGEX,self.url) is None:
            logger.error(f'Invalid url {url}')
            raise

        homedir           = os.path.expanduser('~')
        self.bz2_filename = self.url[31:]
        self.bz2_path     = os.path.join(homedir,out_dir,self.bz2_filename)
        
        if os.path.isfile(self.bz2_path):
            logger.error(f'Demo {self.bz2_filename} has already been downloaded')
            raise

        logger.info(f'Downloading to {self.bz2_path}')
        
        try:
            wget.download(self.url,self.bz2_path)
        except Exception as e:
            logger.error(e)
            raise

        logger.info(f'Downloaded to {self.bz2_path}')

        self.is_downloaded = True

        print(f"""
is_downloaded = {self.is_downloaded}
bz2_path = {self.bz2_path}
bz2_name = {self.bz2_name}
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
        
        self.demo_path     = self.bz2_path[:-4]
        self.demo_filename = self.bz2_filename[:-4]

        logger.info(f'Decompressing {self.bz2_filename} into {self.demo_filename}')

        try:
            with bz2.BZ2File(self.path) as fr, open(self.demo_name,"wb") as fw:
                shutil.copyfileobj(fr,fw)
        except Exception as e:
            logger.error(e)
            raise

        logger.info(f'Decompressed into {self.demo_filename}')
        
        self.is_decompressed = True

    def store_data_in_db(self):
        """
        Writes info about file into DB
        """

        if not self.is_decompressed or not self.is_downloaded:
            logger.error(f'File from {self.url} has either not been decompressed or downloaded')
            raise

        #insert info here

        self.is_stored_in_db = True

    def delete(self):
        """
        Delete the demo 
        """

        if not (self.is_decompressed and self.is_downloaded and self.is_stored_in_db):
            logger.error(f'File from {self.url} has not been downloaded, decompressed and stored in the DB')
            raise

        try:
            subprocess.check_call(["srm", self.bz2_path])
            subprocess.check_call(["srm", self.demo_path])
        except subprocess.CalledProcessError as e:
            logger.error(e.returncode)
            raise

        self.is_deleted = True

    def process(self):
        logger.info(f'Starting processing on {self.url}')
        self.download()
        self.decompress()
        self.store_data_in_db()
        self.delete()
        logger.info(f'Finished processing {self.url}')
