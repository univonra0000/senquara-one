INSERT OR IGNORE INTO roles(id,name,permissions) VALUES
('owner','Owner/Admin','["view","create","edit","delete","approve","export"]'),('manager','Manager','["view","create","edit","approve","export"]'),('accountant','Accountant','["view","create","edit","export"]'),('billing','Billing Operator','["view","create"]'),('inventory','Inventory Manager','["view","create","edit"]'),('sales','Salesperson','["view","create"]'),('viewer','Viewer','["view"]');
INSERT OR IGNORE INTO master_records(id,category,name,data,status,version,updated_at) VALUES
('cash','paymentMethods','Cash','{"method":"cash"}','active',1,datetime('now')),
('upi','paymentMethods','UPI','{"method":"upi"}','active',1,datetime('now')),
('bank','paymentMethods','Bank Transfer','{"method":"bank"}','active',1,datetime('now')),
('card','paymentMethods','Card','{"method":"card"}','active',1,datetime('now')),
('credit','paymentMethods','Credit','{"method":"credit"}','active',1,datetime('now')),
('general','terms','General Terms','{"text":"Starter terms — review before production."}','active',1,datetime('now')),
('payment','terms','Payment Terms','{"text":"Payment terms are configurable by the business."}','active',1,datetime('now')),
('privacy','terms','Privacy','{"text":"Use applicable privacy and data-protection requirements."}','active',1,datetime('now'));
