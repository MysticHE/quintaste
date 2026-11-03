"""A shared two-call gate for existing research and interactive Explore work. No usage caps."""
from contextlib import contextmanager
from functools import wraps
import os
from pathlib import Path
import time


@contextmanager
def slot():
    import fcntl
    root=Path(os.environ.get('QT_TEAM_ROOT','/opt/data/qt-team'))/'state/model-slots'
    root.mkdir(parents=True,exist_ok=True,mode=0o700)
    interactive=os.environ.get('QT_EXPLORE_INTERACTIVE')=='1'
    indexes=(1,0) if interactive else (0,)
    held=None
    try:
        while held is None:
            for index in indexes:
                file=(root/str(index)).open('a+')
                try:
                    fcntl.flock(file,fcntl.LOCK_EX|fcntl.LOCK_NB); held=file; break
                except BlockingIOError: file.close()
            if held is None: time.sleep(0.25)
        yield
    finally:
        if held: held.close()


def limited(function):
    @wraps(function)
    def call(*args,**kwargs):
        with slot(): return function(*args,**kwargs)
    return call
