DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS events;

CREATE TABLE users (
    id uuid PRIMARY KEY,
    username varchar(20) UNIQUE NOT NULL,
    password varchar(64) NOT NULL
);

CREATE TABLE events(
    id uuid PRIMARY KEY,
    creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    begin_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    description varchar(100) NOT NULL
);