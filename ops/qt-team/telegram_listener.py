"""Supervised owner command listener; no model calls or research dispatch."""
import fcntl
import json
import time
import telegram_reporter as t


def cycle():
    saved = t.read(t.STATE / 'state.json', {'offset': 0, 'deliveries': {}})
    updates = t.telegram('getUpdates', {'offset': saved['offset'], 'timeout': 20,
                         'limit': 30, 'allowed_updates': ['message', 'callback_query']})
    config = t.read(t.ROOT / 'private/telegram-chat.json', {})
    t.acknowledge_updates(updates, config)
    with (t.STATE / 'reporter.lock').open('a+') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        state = t.read(t.STATE / 'state.json', {'offset': 0, 'deliveries': {}})
        state['_attemptStart'] = sum(v.get('attempts', 0) for v in state['deliveries'].values())
        config = t.handle_updates(state, updates, acknowledge=False)
        if config:
            t.deliver(state, config, interactive_only=True)
        state['lastListenerAt'] = t.stamp()
        state['listenerError'] = None
        t.write(t.STATE / 'state.json', state)
    return len(updates)


def main():
    t.STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (t.STATE / 'poll.lock').open('a+') as poll:
        fcntl.flock(poll, fcntl.LOCK_EX)
        while True:
            try:
                count = cycle()
                if count:
                    print(json.dumps({'at': t.stamp(), 'updatesHandled': count}), flush=True)
            except t.DeliveryError as exc:
                print(json.dumps({'at': t.stamp(), 'error': exc.kind}), flush=True)
                time.sleep(max(5, min(300, exc.retry_after)))
            except Exception as exc:
                # Never log token-bearing transport URLs or callback payloads.
                print(json.dumps({'at': t.stamp(), 'errorType': type(exc).__name__}), flush=True)
                time.sleep(5)


if __name__ == '__main__':
    main()
