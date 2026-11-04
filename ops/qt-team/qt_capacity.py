"""A shared two-call gate. Research uses slot 0; interactive Explore and food reviews may use either existing slot.
Opt-in waits are bounded before any model starts. The team usage caps still apply in each caller's reserve()."""
from contextlib import contextmanager
from functools import wraps
import os
from pathlib import Path
import time


@contextmanager
def slot(priority=False,wait_seconds=None):
    import fcntl
    root=Path(os.environ.get('QT_TEAM_ROOT','/opt/data/qt-team'))/'state/model-slots'
    root.mkdir(parents=True,exist_ok=True,mode=0o700)
    interactive=priority or os.environ.get('QT_EXPLORE_INTERACTIVE')=='1'
    indexes=(1,0) if interactive else (0,)
    held=None
    deadline=None if wait_seconds is None else time.monotonic()+max(0,float(wait_seconds))
    try:
        while held is None:
            for index in indexes:
                file=(root/str(index)).open('a+')
                try:
                    fcntl.flock(file,fcntl.LOCK_EX|fcntl.LOCK_NB); held=file; break
                except BlockingIOError: file.close()
            if held is None:
                if deadline is not None and time.monotonic()>=deadline:raise TimeoutError('Shared model capacity is busy')
                time.sleep(0.25)
        yield
    finally:
        if held: held.close()


def limited(function):
    @wraps(function)
    def call(*args,**kwargs):
        priority=kwargs.pop('capacity_priority',False);wait=kwargs.pop('capacity_wait',None)
        with (slot(priority=priority,wait_seconds=wait) if priority or wait is not None else slot()): return function(*args,**kwargs)
    return call
