CREATE TABLE chat_conversation (
 id BIGSERIAL PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES sys_user(id) ON DELETE CASCADE,
 title VARCHAR(255) NOT NULL,
 model VARCHAR(128) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_conversation_user_updated
 ON chat_conversation(user_id, updated_at DESC);

CREATE TABLE chat_message (
 id BIGSERIAL PRIMARY KEY,
 conversation_id BIGINT NOT NULL REFERENCES chat_conversation(id) ON DELETE CASCADE,
 role VARCHAR(32) NOT NULL,
 content TEXT NOT NULL,
 model VARCHAR(128),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_message_conversation_created
 ON chat_message(conversation_id, created_at ASC, id ASC);
