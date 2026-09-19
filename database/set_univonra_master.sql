-- SENQUARA ONE — set the existing Master Admin credentials
-- Run this once against the existing senquara-one-db.
-- Email: univonra@gmail.com
-- Password: univonra

UPDATE users
SET email='univonra@gmail.com',
    name='Master Admin',
    business_name='SENQUARA ONE',
    country='India',
    password_hash='6VScPXz8Aezo6PBk-yJtEi2MRVknZPVJH3mMQHgLxpw',
    password_salt='S_dh7LMjuK3IBExcjuhfQA',
    role='master_admin',
    status='active',
    blocked=0,
    email_verified=1,
    must_change_password=0,
    updated_at=datetime('now')
WHERE role IN ('master_admin','owner') OR email IN ('admin@senquara.one','univonra@gmail.com');

-- If the database has no Master Admin row yet, create it.
INSERT INTO users(id,email,name,business_name,country,password_hash,password_salt,role,status,email_verified,terms_version,terms_accepted_at,created_at,updated_at,must_change_password)
SELECT 'master-admin-001','univonra@gmail.com','Master Admin','SENQUARA ONE','India','6VScPXz8Aezo6PBk-yJtEi2MRVknZPVJH3mMQHgLxpw','S_dh7LMjuK3IBExcjuhfQA','master_admin','active',1,'1.0',datetime('now'),datetime('now'),datetime('now'),0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role='master_admin');

INSERT OR IGNORE INTO roles(id,name,permissions) VALUES('master_admin','Master Admin','["view","create","edit","delete","approve","export","manage_users","manage_roles","block_users","settings","backup"]');
INSERT OR IGNORE INTO user_roles(id,user_id,role_id)
SELECT 'master-admin-role-001',id,'master_admin' FROM users WHERE email='univonra@gmail.com';
