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
('biz_001', 'Nylon Coffee Roasters', '4 Everton Prk', '080004', 'Third-wave coffee specialists', 1.27688307363768, 103.840085627903, 'Recommended cafe. Great ambiance and reasonable prices.', '[]', NULL),
('biz_002', 'Kith Cafe', 'Millenia Walk', '039596', 'Popular brunch spot with excellent coffee and pastries', 1.29260544462492, 103.859724944443, 'Cozy cafe perfect for gatherings. Kith Cafe has great reviews.', '[]', NULL),
('biz_003', 'Marina Bay Sands Hotel', '10 Bayfront Ave', '018956', 'Iconic luxury hotel with rooftop infinity pool', 1.28239713771706, 103.85840539166, 'Modern hotel with contemporary design. Marina Bay Sands Hotel is very popular.', '[]', NULL),
('biz_004', 'Maxwell Food Centre', '1 Kadayanallur St', '069184', 'Famous hawker center with local delights', 1.28033142727315, 103.844747227479, 'Family-friendly hawker centre. Maxwell Food Centre welcomes everyone with warm hospitality.', '[]', 'user_002'),
('biz_005', 'National Gallery Singapore', '1 St Andrew Road', '178957', 'Southeast Asia largest visual arts museum', 1.29075150227868, 103.85176884833, 'Trendy museum with unique offerings. A must-visit in Singapore.', '[]', NULL),
('biz_006', 'Burnt Ends', '7 Dempsey Road', '249671', 'Modern Australian barbecue restaurant Michelin-starred', 1.30452389655707, 103.809003040437, 'Popular restaurant known for quality. Visitors love the atmosphere.', '[]', NULL),
('biz_007', 'Common Man Coffee Roasters', '11 Stanley St', '068730', 'Specialty coffee roaster with all-day breakfast', 1.28026441764321, 103.84787555932, 'Well-established cafe. Offers consistent quality and friendly staff.', '[]', 'user_003'),
('biz_008', 'Raffles Hotel', '1 Beach Road', '189673', 'Historic colonial hotel home of the Singapore Sling', 1.29509740789339, 103.85406834457, 'Charming hotel with good reviews. A favorite spot in the area.', '[]', NULL),
('biz_009', 'Tiong Bahru Bakery', '70 River Valley Rd #01-05 Foothills Fort Canning', '179037', 'French-inspired bakery with artisan breads', 1.29189098815079, 103.846095522705, 'Recommended cafe. Great ambiance and reasonable prices.', '[]', NULL),
('biz_010', 'Lau Pa Sat', '18 Raffles Quay', '048582', 'Historic Victorian-era food market', 1.28065386814644, 103.850412718567, 'Great hawker centre with excellent service. Lau Pa Sat is highly recommended by locals.', '[]', 'user_001'),
('biz_011', 'PS Cafe', 'Raffles City 252 North Bridge Road', '179103', 'Trendy cafe chain known for truffle fries', 1.29389357863312, 103.853119904656, 'Cozy cafe perfect for gatherings. PS Cafe has great reviews.', '[]', NULL),
('biz_012', 'The Fullerton Hotel', '1 Fullerton Sq', '049178', '5-star heritage hotel on Marina Bay', 1.28613061272938, 103.853043454038, 'Modern hotel with contemporary design. The Fullerton Hotel is very popular.', '[]', NULL),
('biz_013', 'Jumbo Seafood', '30 Merchant Rd Riverside Point', '058282', 'Famous for chili crab and black pepper crab', 1.2892925052942, 103.844167619098, 'Family-friendly restaurant. Jumbo Seafood welcomes everyone with warm hospitality.', '[]', 'user_002'),
('biz_014', 'Tong Ah Eating House', '35 Keong Saik Rd', '089142', 'Traditional kopitiam with kaya toast', 1.28011869580914, 103.841413877252, 'Trendy cafe with unique offerings. A must-visit in Singapore.', '[]', NULL),
('biz_015', 'Gardens by the Bay', '18 Marina Gardens Dr', '018953', 'Iconic garden conservatory with Supertrees', 1.28387301464472, 103.865993692974, 'Popular attraction known for quality. Visitors love the atmosphere.', '[]', NULL),
('biz_016', 'Odette Restaurant', '1 St Andrew Road', '178957', 'Modern French fine dining 3 Michelin stars', 1.29075150227868, 103.85176884833, 'Well-established restaurant. Offers consistent quality and friendly staff.', '[]', 'user_003'),
('biz_017', 'Atlas Bar', '600 N Bridge Rd Parkview Square', '188778', 'Art deco gin bar with stunning interior', 1.30032370548539, 103.857629361013, 'Charming bar with good reviews. A favorite spot in the area.', '[]', NULL),
('biz_018', 'ArtScience Museum', '6 Bayfront Ave', '018974', 'Futuristic museum exploring art and science', 1.28622395876272, 103.859271121589, 'Recommended museum. Great ambiance and reasonable prices.', '[]', NULL),
('biz_019', 'Ce La Vi Restaurant', '6 Bayfront Ave', '018971', 'Rooftop dining with panoramic city views', 1.28622395876272, 103.859271121589, 'Great restaurant with excellent service. Ce La Vi Restaurant is highly recommended by locals.', '[]', 'user_001'),
('biz_020', 'Ya Kun Kaya Toast', '133 New Bridge Rd Chinatown Point', '059413', 'Traditional breakfast chain famous for kaya toast', 1.28499882847401, 103.844697081142, 'Cozy cafe perfect for gatherings. Ya Kun Kaya Toast has great reviews.', '[]', NULL),
('biz_021', 'Singapore Zoo', '80 Mandai Lake Rd', '729826', 'World-class open-concept zoo', 1.40050829280518, 103.789963566126, 'Well-established attraction. Offers consistent quality and friendly staff.', '[]', 'user_003'),
('biz_022', 'Din Tai Fung', 'Raffles City 252 North Bridge Road', '179103', 'Taiwan chain famous for xiaolongbao dumplings', 1.29389357863312, 103.853119904656, 'Trendy restaurant with unique offerings. A must-visit in Singapore.', '[]', NULL),
('biz_023', 'Plain Vanilla Bakery', '310 Orchard Rd Tang Plaza', '238864', 'Artisan bakery known for cupcakes', 1.30505783063001, 103.83306065595, 'Popular cafe known for quality. Visitors love the atmosphere.', '[]', NULL);
   

-- Create indexes
CREATE INDEX idx_business_location ON businesses (latitude, longitude);
CREATE INDEX idx_business_owner ON businesses (owner_id);
CREATE INDEX idx_business_name ON businesses (name);
