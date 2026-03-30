-- Profile badge + tour i18n labels
INSERT INTO datapai.sys_lang_labels (label_key, lang, text, category) VALUES
-- nav_profile
('nav_profile', 'en', 'Profile', 'nav'),
('nav_profile', 'zh', '个人资料', 'nav'),
('nav_profile', 'zh-TW', '個人資料', 'nav'),
('nav_profile', 'ja', 'プロフィール', 'nav'),
('nav_profile', 'ko', '프로필', 'nav'),
('nav_profile', 'vi', 'Hồ sơ', 'nav'),
('nav_profile', 'th', 'โปรไฟล์', 'nav'),
('nav_profile', 'ms', 'Profil', 'nav'),
-- nav_setup_profile
('nav_setup_profile', 'en', 'Set up profile', 'nav'),
('nav_setup_profile', 'zh', '设置个人资料', 'nav'),
('nav_setup_profile', 'zh-TW', '設定個人資料', 'nav'),
('nav_setup_profile', 'ja', 'プロフィール設定', 'nav'),
('nav_setup_profile', 'ko', '프로필 설정', 'nav'),
('nav_setup_profile', 'vi', 'Thiết lập hồ sơ', 'nav'),
('nav_setup_profile', 'th', 'ตั้งค่าโปรไฟล์', 'nav'),
('nav_setup_profile', 'ms', 'Sediakan profil', 'nav'),
-- nav_take_tour
('nav_take_tour', 'en', 'Take a tour', 'nav'),
('nav_take_tour', 'zh', '开始导览', 'nav'),
('nav_take_tour', 'zh-TW', '開始導覽', 'nav'),
('nav_take_tour', 'ja', 'ツアーを見る', 'nav'),
('nav_take_tour', 'ko', '투어 시작', 'nav'),
('nav_take_tour', 'vi', 'Xem hướng dẫn', 'nav'),
('nav_take_tour', 'th', 'เริ่มทัวร์', 'nav'),
('nav_take_tour', 'ms', 'Mulakan lawatan', 'nav')
ON CONFLICT (label_key, lang) DO UPDATE SET text = EXCLUDED.text, category = EXCLUDED.category;
