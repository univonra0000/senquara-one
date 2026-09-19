-- SENQUARA ONE — first Master Admin account
-- Run AFTER the users, roles and user_roles tables already exist.
-- This creates the initial account without any bootstrap endpoint.
-- Password is: univonra
-- The application will require a password change after login.

INSERT OR IGNORE INTO roles(id,name,permissions) VALUES
('master_admin','Master Admin','["view","create","edit","delete","approve","export","manage_users","manage_roles","block_users","settings","backup"]'),
('admin','Admin','["view","create","edit","delete","export"]'),
('staff','Staff','["view","create","edit"]');

INSERT OR IGNORE INTO users(
  id,email,name,mobile,business_name,country,
  password_hash,password_salt,role,status,email_verified,
  terms_version,terms_accepted_at,created_at,updated_at,must_change_password
) VALUES(
  'master-admin-001',
  'univonra@gmail.com',
  'Master Admin',
  '',
  'SENQUARA ONE',
  'India',
  '6VScPXz8Aezo6PBk-yJtEi2MRVknZPVJH3mMQHgLxpw',
  'S_dh7LMjuK3IBExcjuhfQA',
  'master_admin',
  'active',
  1,
  '1.0',
  datetime('now'),
  datetime('now'),
  datetime('now'),
  0
);

INSERT OR IGNORE INTO user_roles(id,user_id,role_id)
VALUES('master-admin-role-001','master-admin-001','master_admin');
