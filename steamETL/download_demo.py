import wget
import re
import os
import logging as logger

URL_REGEX = r'^http://replay115.valve.net/730/\w{32}.dem.bz2'

def download_demo(url, out_dir):
    if re.match(URL_REGEX,url) is None:
        logger.error(f'Invalid url {url}')
        raise

    homedir  = os.path.expanduser('~')
    filename = url[31:]
    out_path = os.path.join(homedir,out_dir,filename)
    print(f'Downloading to {out_path}')
    
    if os.path.isfile(out_path):
        logger.error(f'Demo {filename} has already been downloaded')
        raise
    
    try:
        wget.download(url,out_path)
    except Exception as e:
        logger.error(e)
        raise
