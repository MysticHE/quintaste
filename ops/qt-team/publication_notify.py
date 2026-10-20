"""Bounded, immediate delivery drain. Durable receipts and cron remain recovery."""
import fcntl
import time
import telegram_reporter as t


def run():
    t.STATE.mkdir(parents=True,exist_ok=True)
    with (t.STATE/'notify.lock').open('a+') as lock:
        try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError: return
        for _ in range(24):
            t.tick()  # Each item releases reporter.lock so owner commands can run.
            time.sleep(1)
            state=t.read(t.STATE/'state.json',{})
            receipts=[t.read(p) for p in (t.ROOT/'state/publications').glob('*.json')]
            pending=any(r.get('changes') and not state.get('visuals',{}).get(r['revision'],{}).get('complete')
                        and state.get('visuals',{}).get(r['revision'],{}).get('nextAt',0)<=time.time() for r in receipts)
            deliveries=any(v['status']=='pending' and v.get('nextAt',0)<=time.time() for v in state.get('deliveries',{}).values())
            if not pending and not deliveries: break


if __name__=='__main__': run()
