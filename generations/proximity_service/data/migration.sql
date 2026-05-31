-- Proximity Service Database Migration
-- Generated: 2026-05-31
-- PostgreSQL (simplified for testing without PostGIS/pgvector)

-- Drop existing tables if they exist
DROP TABLE IF EXISTS businesses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table for authentication
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create businesses table
-- Note: embedding_vector stored as TEXT (JSON array) for testing
CREATE TABLE businesses (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    address TEXT NOT NULL,
    postal_code VARCHAR(20),
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    semantic_search_blob TEXT,
    embedding_vector TEXT,
    owner_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert sample users (password: test123)
INSERT INTO users (id, username, password_hash) VALUES
('user_001', 'john_doe', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
('user_002', 'jane_smith', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
('user_003', 'bob_wilson', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');

-- Insert businesses (real Singapore locations)
INSERT INTO businesses (id, name, address, postal_code, description, latitude, longitude, semantic_search_blob, embedding_vector, owner_id) VALUES
('biz_001', 'The Wild Rocket', '1 Raffles Place', '048616', 'European fine dining with creative seasonal menu', 1.2797, 103.8501, 'Great restaurant with excellent service. The Wild Rocket is highly recommended by locals.', '[]', 'user_001'),
('biz_002', 'Kith Cafe', '6 Battery Road', '049909', 'Popular brunch spot with excellent coffee and pastries', 1.2832, 103.8522, 'Cozy cafe perfect for gatherings. Kith Cafe has great reviews.', '[]', NULL),
('biz_003', 'Marina Bay Sands Hotel', '10 Collyer Quay', '049315', 'Iconic luxury hotel with rooftop infinity pool', 1.2867, 103.8547, 'Modern hotel with contemporary design. Marina Bay Sands Hotel is very popular.', '[]', NULL),
('biz_004', 'Maxwell Food Centre', '8 Marina Boulevard', '018981', 'Famous hawker center with local delights', 1.2868, 103.8545, 'Family-friendly hawker centre. Maxwell Food Centre welcomes everyone with warm hospitality.', '[]', 'user_002'),
('biz_005', 'National Gallery Singapore', '10 Bayfront Avenue', '018956', 'Southeast Asia largest visual arts museum', 1.2812, 103.8608, 'Trendy museum with unique offerings. A must-visit in Singapore.', '[]', NULL),
('biz_006', 'Burnt Ends', '2 Orchard Turn', '238801', 'Modern Australian barbecue restaurant Michelin-starred', 1.3021, 103.8350, 'Popular restaurant known for quality. Visitors love the atmosphere.', '[]', NULL),
('biz_007', 'Common Man Coffee Roasters', '391 Orchard Road', '238872', 'Specialty coffee roaster with all-day breakfast', 1.3048, 103.8318, 'Well-established cafe. Offers consistent quality and friendly staff.', '[]', 'user_003'),
('biz_008', 'Raffles Hotel', '501 Orchard Road', '238880', 'Historic colonial hotel home of the Singapore Sling', 1.3038, 103.8336, 'Charming hotel with good reviews. A favorite spot in the area.', '[]', NULL),
('biz_009', 'Tiong Bahru Bakery', '335 Smith Street', '050335', 'French-inspired bakery with artisan breads', 1.2839, 103.8446, 'Recommended cafe. Great ambiance and reasonable prices.', '[]', NULL),
('biz_010', 'Lau Pa Sat', '45 Mosque Street', '059523', 'Historic Victorian-era food market', 1.2826, 103.8438, 'Great hawker centre with excellent service. Lau Pa Sat is highly recommended by locals.', '[]', 'user_001'),
('biz_011', 'PS Cafe', '3 River Valley Road', '179024', 'Trendy cafe chain known for truffle fries', 1.2890, 103.8467, 'Cozy cafe perfect for gatherings. PS Cafe has great reviews.', '[]', NULL),
('biz_012', 'The Fullerton Hotel', '40 Boat Quay', '049830', '5-star heritage hotel on Marina Bay', 1.2877, 103.8498, 'Modern hotel with contemporary design. The Fullerton Hotel is very popular.', '[]', NULL),
('biz_013', 'Jumbo Seafood', '3 Muscat Street', '198833', 'Famous for chili crab and black pepper crab', 1.3000, 103.8580, 'Family-friendly restaurant. Jumbo Seafood welcomes everyone with warm hospitality.', '[]', 'user_002'),
('biz_014', 'Tong Ah Eating House', '62 Kandahar Street', '198901', 'Traditional kopitiam with kaya toast', 1.3011, 103.8595, 'Trendy cafe with unique offerings. A must-visit in Singapore.', '[]', NULL),
('biz_015', 'Gardens by the Bay', '48 Serangoon Road', '217959', 'Iconic garden conservatory with Supertrees', 1.3068, 103.8522, 'Popular attraction known for quality. Visitors love the atmosphere.', '[]', NULL),
('biz_016', 'Odette Restaurant', '5 Campbell Lane', '209924', 'Modern French fine dining 3 Michelin stars', 1.3075, 103.8508, 'Well-established restaurant. Offers consistent quality and friendly staff.', '[]', 'user_003'),
('biz_017', 'Forty Hands Coffee', '93 Stamford Road', '178897', 'Specialty coffee cafe in Tiong Bahru', 1.2965, 103.8462, 'Charming cafe with good reviews. A favorite spot in the area.', '[]', NULL),
('biz_018', 'ArtScience Museum', '8 Queen Street', '188535', 'Futuristic museum exploring art and science', 1.2984, 103.8485, 'Recommended museum. Great ambiance and reasonable prices.', '[]', NULL),
('biz_019', 'Ce La Vi Restaurant', '7 Wallich Street', '078884', 'Rooftop dining with panoramic city views', 1.2758, 103.8438, 'Great restaurant with excellent service. Ce La Vi Restaurant is highly recommended by locals.', '[]', 'user_001'),
('biz_020', 'Ya Kun Kaya Toast', '1 Keong Saik Road', '089109', 'Traditional breakfast chain famous for kaya toast', 1.2771, 103.8434, 'Cozy cafe perfect for gatherings. Ya Kun Kaya Toast has great reviews.', '[]', NULL),
('biz_021', 'Haji Lane Cafes', '11 Unity Street', '237995', 'Hipster cafes in colorful shophouses', 1.2931, 103.8386, 'Modern cafe with contemporary design. Haji Lane Cafes is very popular.', '[]', NULL),
('biz_022', 'The Clan Hotel', '60 Robertson Quay', '238252', 'Boutique hotel in Chinatown', 1.2924, 103.8395, 'Family-friendly hotel. The Clan Hotel welcomes everyone with warm hospitality.', '[]', 'user_002'),
('biz_023', 'Din Tai Fung', '56 Eng Hoon Street', '160056', 'Taiwan chain famous for xiaolongbao dumplings', 1.2850, 103.8261, 'Trendy restaurant with unique offerings. A must-visit in Singapore.', '[]', NULL),
('biz_024', 'Plain Vanilla Bakery', '73 Yong Siak Street', '163073', 'Artisan bakery known for cupcakes', 1.2861, 103.8278, 'Popular cafe known for quality. Visitors love the atmosphere.', '[]', NULL),
('biz_025', 'Singapore Zoo', '112 East Coast Road', '428802', 'World-class open-concept zoo', 1.3048, 103.9025, 'Well-established attraction. Offers consistent quality and friendly staff.', '[]', 'user_003'),
('biz_026', 'Atlas Bar', '208 East Coast Road', '428907', 'Art deco gin bar with stunning interior', 1.3015, 103.9042, 'Charming bar with good reviews. A favorite spot in the area.', '[]', NULL),
('biz_027', 'Nylon Coffee Roasters', '8 Sentosa Gateway', '098269', 'Third-wave coffee specialists', 1.2494, 103.8303, 'Recommended cafe. Great ambiance and reasonable prices.', '[]', NULL);

-- Create indexes
CREATE INDEX idx_business_location ON businesses (latitude, longitude);
CREATE INDEX idx_business_owner ON businesses (owner_id);
CREATE INDEX idx_business_name ON businesses (name);
