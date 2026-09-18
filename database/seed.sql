INSERT OR IGNORE INTO roles(id,name,permissions) VALUES
('master_admin','Master Admin','["view","create","edit","delete","approve","export","manage_users","manage_roles","block_users","settings","backup"]'),
('admin','Admin','["view","create","edit","delete","export"]'),
('staff','Staff','["view","create","edit"]');
INSERT OR IGNORE INTO master_records(id,category,name,data,status,version,updated_at) VALUES
('cash','paymentMethods','Cash','{"method":"cash"}','active',1,datetime('now')),
('upi','paymentMethods','UPI','{"method":"upi"}','active',1,datetime('now')),
('bank','paymentMethods','Bank Transfer','{"method":"bank"}','active',1,datetime('now')),
('card','paymentMethods','Card','{"method":"card"}','active',1,datetime('now')),
('credit','paymentMethods','Credit','{"method":"credit"}','active',1,datetime('now')),
('general','terms','General Terms','{"text":"Goods once sold are subject to applicable business terms."}','active',1,datetime('now')),
('payment','terms','Payment Terms','{"text":"Payment is due as agreed on the invoice."}','active',1,datetime('now')),
('privacy','terms','Privacy','{"text":"Use applicable privacy and data-protection requirements."}','active',1,datetime('now'));
