-- Database Schema for LiveTrack

-- Drop tables if they exist
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS device_tokens CASCADE;
DROP TABLE IF EXISTS location_logs CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create Users Table (Cognito integration)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    cognito_sub VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) CHECK (role IN ('MANAGER', 'WORKER')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Tasks Table
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) CHECK (status IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')) DEFAULT 'PENDING' NOT NULL,
    assigned_to_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Location Logs Table for Live Tracking
CREATE TABLE location_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Device Tokens Table for Firebase Cloud Messaging (FCM)
CREATE TABLE device_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    platform VARCHAR(10) CHECK (platform IN ('ANDROID', 'IOS', 'WEB')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Conversations Table for 1-to-1 chats
CREATE TABLE conversations (
    id BIGSERIAL PRIMARY KEY,
    user1_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    user2_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_pair UNIQUE (user1_id, user2_id)
);

-- Create Messages Table
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Calls Table
CREATE TABLE calls (
    id BIGSERIAL PRIMARY KEY,
    caller_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    receiver_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('DIALING', 'CONNECTED', 'MISSED', 'REJECTED', 'DISCONNECTED')) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Create Indexes for performance optimization
CREATE INDEX idx_users_cognito ON users(cognito_sub);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to_id);
CREATE INDEX idx_location_logs_user_time ON location_logs(user_id, timestamp DESC);
CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX idx_conversations_users ON conversations(user1_id, user2_id);
CREATE INDEX idx_messages_conv_time ON messages(conversation_id, created_at ASC);
CREATE INDEX idx_calls_users ON calls(caller_id, receiver_id);
