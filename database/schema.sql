CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    UNIQUE NOT NULL,
    password    TEXT    NOT NULL,
    created_at  TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    from_addr    TEXT    NOT NULL,
    to_addr      TEXT    NOT NULL,
    subject      TEXT    DEFAULT '',
    body         TEXT    DEFAULT '',
    received_at  TEXT    DEFAULT (datetime('now')),
    category     TEXT    DEFAULT NULL,
    is_deleted   INTEGER DEFAULT 0,
    is_starred   INTEGER DEFAULT 0,
    is_read      INTEGER DEFAULT 0,
    raw_content  TEXT    DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id   INTEGER NOT NULL,
    filename     TEXT    NOT NULL,
    content_type TEXT    NOT NULL,
    data         BLOB    NOT NULL,
    FOREIGN KEY(message_id) REFERENCES messages(id)
);
