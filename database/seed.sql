-- Seed Data for LiveTrack

-- Insert test managers
INSERT INTO users (cognito_sub, username, email, role)
VALUES (
    'cognito-sub-manager-111',
    'manager_jane',
    'jane@livetrack.com',
    'MANAGER'
) ON CONFLICT DO NOTHING;

-- Insert test workers
INSERT INTO users (cognito_sub, username, email, role)
VALUES (
    'cognito-sub-worker-222',
    'worker_john',
    'john@livetrack.com',
    'WORKER'
) ON CONFLICT DO NOTHING;

INSERT INTO users (cognito_sub, username, email, role)
VALUES (
    'cognito-sub-worker-333',
    'worker_alice',
    'alice@livetrack.com',
    'WORKER'
) ON CONFLICT DO NOTHING;

-- Insert sample tasks
INSERT INTO tasks (title, description, status, assigned_to_id, created_by_id)
VALUES (
    'Fix Pipeline Leak',
    'Locate and fix the main pipeline valve pressure leak in sector 4.',
    'PENDING',
    (SELECT id FROM users WHERE username = 'worker_john'),
    (SELECT id FROM users WHERE username = 'manager_jane')
) ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, status, assigned_to_id, created_by_id)
VALUES (
    'Inspect Electrical Grid',
    'Perform a scheduled inspection on electric generator transformer sub-station B.',
    'IN_PROGRESS',
    (SELECT id FROM users WHERE username = 'worker_alice'),
    (SELECT id FROM users WHERE username = 'manager_jane')
) ON CONFLICT DO NOTHING;

-- Seed initial locations
INSERT INTO location_logs (user_id, latitude, longitude)
VALUES (
    (SELECT id FROM users WHERE username = 'worker_john'),
    37.7749,
    -122.4194
) ON CONFLICT DO NOTHING;
