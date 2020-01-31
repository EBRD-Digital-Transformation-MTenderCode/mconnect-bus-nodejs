CREATE TABLE IF NOT EXISTS requests
(
    cmd_id   TEXT      NOT NULL PRIMARY KEY,
    cmd_name TEXT      NOT NULL,
    ts       TIMESTAMP NOT NULL,
    message  JSON      NOT NULL
);

CREATE TABLE IF NOT EXISTS treasury_requests
(
    id_doc  TEXT NOT NULL PRIMARY KEY,
    message JSON NOT NULL,
    ts      TIMESTAMP
);

CREATE INDEX treasury_requests_index ON treasury_requests (id_doc, ts)
    WHERE ts IS NULL;

CREATE TABLE IF NOT EXISTS treasury_responses
(
    id_doc      TEXT      NOT NULL,
    status_code TEXT      NOT NULL,
    message     JSON      NOT NULL,
    ts_in       TIMESTAMP NOT NULL,
    ts_commit   TIMESTAMP,
    CONSTRAINT treasury_responses_pkey
        PRIMARY KEY (id_doc, status_code)
);

CREATE INDEX treasury_responses_index ON treasury_responses (id_doc, status_code, ts_commit)
    WHERE ts_commit IS NULL;

CREATE TABLE IF NOT EXISTS responses
(
    id_doc      TEXT NOT NULL,
    cmd_id      TEXT NOT NULL,
    cmd_name    TEXT NOT NULL,
    message     JSON NOT NULL,
    ts          TIMESTAMP,
    CONSTRAINT responses_pkey
        PRIMARY KEY (id_doc, cmd_name)
);

CREATE INDEX responses_launch_index ON responses (id_doc, cmd_name, ts)
    WHERE ts IS NULL AND cmd_name = 'launchACVerification';

CREATE INDEX responses_not_launched_index ON responses (id_doc, cmd_name, ts)
    WHERE ts IS NULL AND cmd_name != 'launchACVerification';

CREATE TABLE IF NOT EXISTS errors
(
    id                TEXT      NOT NULL PRIMARY KEY,
    hash              TEXT      NOT NULL,
    ts                TIMESTAMP NOT NULL,
    data              JSON      NOT NULL,
    message_kafka     JSON      NOT NULL,
    ts_send           TIMESTAMP,
    fixed             BOOLEAN   NOT NULL DEFAULT false,
    fixed_ts          TIMESTAMP,
    fixed_desc        TEXT
);

CREATE INDEX errors_index ON errors (hash)
    WHERE fixed IS false;
