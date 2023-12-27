import time
import logging as logger
import bz2, shutil
import os

homedir      = os.path.expanduser('~')
ex_demo_name = '003658489776656351576_0546911420.dem.bz2'
full_path = os.path.join(homedir,'demos/',ex_demo_name)

logger.info('Starting bzip2 decompress')
start = time.time()
os.system(f"bzip2 -d -k {full_path}")
end   = time.time()
logger.info(f'{end-start} seconds')

#clean 
os.remove(full_path[:-4])


logger.info('Starting BZ2 + Shutil, 16*1024 Python decompress')
start = time.time()
with bz2.BZ2File(full_path) as fr, open(full_path[:-4],"wb") as fw:
    shutil.copyfileobj(fr,fw,length=16*1024)
end   = time.time()
logger.info(f'{end-start} seconds')

#clean 
os.remove(full_path[:-4])


logger.info('Starting BZ2 + Shutil, 16*1024*1024 Python decompress')
start = time.time()
with bz2.BZ2File(full_path) as fr, open(full_path[:-4],"wb") as fw:
    shutil.copyfileobj(fr,fw,length=16*1024*1024)
end   = time.time()
logger.info(f'{end-start} seconds')