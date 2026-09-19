-- SENQUARA ONE — set authorized Master Admin credentials
-- Run this against the existing D1 database after the roles/users tables exist.
-- The password is NOT stored in plaintext; only a PBKDF2-SHA256 hash and salt are stored.

INSERT OR IGNORE INTO roles(id,name,permissions) VALUES
('master_admin','Master Admin','["view","create","edit","delete","approve","export","manage_users","manage_roles","block_users","settings","backup"]'),
('admin','Admin','["view","create","edit","delete","export"]'),
('staff','Staff','["view","create","edit"]');

INSERT OR IGNORE INTO users(
 id,email,name,mobile,business_name,country,password_hash,password_salt,role,status,email_verified,
 terms_version,terms_accepted_at,created_at,updated_at,must_change_password
) VALUES (
 'master-admin-001','univonra@gmail.com','Master Admin','','SENQUARA ONE','India',
 'rJ3Tpo0zaLUdvcEjH0qi3BWk4A-bvk2AthitpREZMCE','jUicrAmAtTYdkemqucyaog',
 'master_admin','active',1,'1.0',datetime('now'),datetime('now'),datetime('now'),0
);

UPDATE users SET
 email='univonra@gmail.com',
 name='Master Admin',
 business_name='SENQUARA ONE',
 country='India',
 password_hash='rJ3Tpo0zaLUdvcEjH0qi3BWk4A-bvk2AthitpREZMCE',
 password_salt='jUicrAmAtTYdkemqucyaog',
 role='master_admin',
 status='active',
 email_verified=1,
 must_change_password=0,
 updated_at=datetime('now')
WHERE id='master-admin-001';

INSERT OR IGNORE INTO user_roles(id,user_id,role_id)
VALUES('master-admin-role-001','master-admin-001','master_admin');
