import logging
import queue
import os
import sys
from collections import defaultdict

class MemoryLogQueue(logging.Handler):
    def __init__(self, sse_queue):
        super().__init__()
        self.sse_queue = sse_queue

    def emit(self, record):
        try:
            msg = self.format(record)
            self.sse_queue.put(msg)
        except Exception:
            self.handleError(record)

class GlobalSSEHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.queues = []

    def emit(self, record):
        try:
            msg = self.format(record)
            for q in self.queues[:]:
                try:
                    q.put_nowait(msg)
                except queue.Full:
                    pass
        except Exception:
            self.handleError(record)

    def subscribe(self):
        q = queue.Queue(maxsize=100)
        self.queues.append(q)
        return q

    def unsubscribe(self, q):
        if q in self.queues:
            self.queues.remove(q)


class UserEventBroker:
    """Fan out lightweight per-user events to SSE subscribers."""

    def __init__(self):
        self.queues_by_user = defaultdict(list)

    def publish(self, username: str, event: dict) -> None:
        for q in self.queues_by_user[username.lower()][:]:
            try:
                q.put_nowait(event)
            except queue.Full:
                pass

    def subscribe(self, username: str):
        q = queue.Queue(maxsize=100)
        self.queues_by_user[username.lower()].append(q)
        return q

    def unsubscribe(self, username: str, q) -> None:
        username = username.lower()
        queues = self.queues_by_user.get(username)
        if not queues:
            return
        if q in queues:
            queues.remove(q)
        if not queues:
            self.queues_by_user.pop(username, None)

# This will hold the memory-based log queue for the SSE stream
sse_handler = GlobalSSEHandler()
user_event_broker = UserEventBroker()

def setup_logging():
    """
    Centralized logging configuration for the entire application.
    Captures console, local file, and SSE stream.
    """
    # 1. Get the root logger
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    
    # 2. Clear existing handlers to prevent duplicates
    if root.hasHandlers():
        root.handlers.clear()

    # 3. Create a common formatter
    # Including thread name is useful for distinguishing SMTP/POP3/API threads
    formatter = logging.Formatter(
        "%(asctime)s [%(threadName)s] %(levelname)s %(name)s — %(message)s",
        "%Y-%m-%d %H:%M:%S"
    )

    # 4. StreamHandler (Console)
    console_h = logging.StreamHandler(sys.stdout)
    console_h.setLevel(logging.INFO)
    console_h.setFormatter(formatter)
    root.addHandler(console_h)

    # 5. FileHandler (Local server.log)
    log_file = os.path.join(os.getcwd(), "server.log")
    file_h = logging.FileHandler(log_file, encoding='utf-8')
    file_h.setLevel(logging.INFO)
    file_h.setFormatter(formatter)
    root.addHandler(file_h)

    # 6. Global SSE Queue Handler (for the web UI)
    sse_handler.setLevel(logging.INFO)
    sse_handler.setFormatter(formatter)
    root.addHandler(sse_handler)

    logging.info("Logging initialized: Console, server.log, and SSE stream active.")
    logging.info(f"Log file location: {log_file}")
