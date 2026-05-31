#!/usr/bin/env python3
"""
Generate migration.sql with realistic mock data for Proximity Service
"""

import json
import random
import hashlib
from datetime import datetime

def generate_review_summary(name, category):
    """Generate realistic review summary"""
    templates = [
        f"Great {category} with excellent service. {name} is highly recommended by locals.",
        f"Popular {category} known for quality. Visitors love the atmosphere.",
        f"Well-established {category}. Offers consistent quality and friendly staff.",
        f"Charming {category} with good reviews. A favorite spot in the area.",
        f"Recommended {category}. Great ambiance and reasonable prices.",
        f"Cozy {category} perfect for gatherings. {name} has great reviews.",
        f"Authentic {category} with traditional flavors. Highly rated by customers.",
        f"Modern {category} with contemporary design. {name} is very popular.",
        f"Family-friendly {category}. {name} welcomes everyone with warm hospitality.",
        f"Trendy {category} with unique offerings. A must-visit in Singapore.",
    ]
    return random.choice(templates)[:280]

def create_mock_embedding():
    """Create a mock 1024-dimensional normalized embedding vector"""
    vector = [random.gauss(0, 0.3) for _ in range(1024)]
    magnitude = sum(x*x for x in vector) ** 0.5
    normalized = [x/magnitude for x in vector]
    return normalized

# Singapore locations - real coordinates for diverse areas
locations = [
    # Central Business District
    (1.2797, 103.8501, "1 Raffles Place", "048616", "restaurant"),
    (1.2832, 103.8522, "6 Battery Road", "049909", "cafe"),
    (1.2867, 103.8547, "10 Collyer Quay", "049315", "restaurant"),

    # Marina Bay
    (1.2868, 103.8545, "8 Marina Boulevard", "018981", "hotel"),
    (1.2812, 103.8608, "10 Bayfront Avenue", "018956", "restaurant"),

    # Orchard Road
    (1.3021, 103.8350, "2 Orchard Turn", "238801", "shopping_mall"),
    (1.3048, 103.8318, "391 Orchard Road", "238872", "cafe"),
    (1.3038, 103.8336, "501 Orchard Road", "238880", "restaurant"),

    # Chinatown
    (1.2839, 103.8446, "335 Smith Street", "050335", "restaurant"),
    (1.2826, 103.8438, "45 Mosque Street", "059523", "cafe"),

    # Clarke Quay / Boat Quay
    (1.2890, 103.8467, "3 River Valley Road", "179024", "bar"),
    (1.2877, 103.8498, "40 Boat Quay", "049830", "restaurant"),

    # Bugis / Kampong Glam
    (1.3000, 103.8580, "3 Muscat Street", "198833", "cafe"),
    (1.3011, 103.8595, "62 Kandahar Street", "198901", "restaurant"),

    # Little India
    (1.3068, 103.8522, "48 Serangoon Road", "217959", "restaurant"),
    (1.3075, 103.8508, "5 Campbell Lane", "209924", "cafe"),

    # Dhoby Ghaut / Museum District
    (1.2965, 103.8462, "93 Stamford Road", "178897", "museum"),
    (1.2984, 103.8485, "8 Queen Street", "188535", "hotel"),

    # Tanjong Pagar
    (1.2758, 103.8438, "7 Wallich Street", "078884", "restaurant"),
    (1.2771, 103.8434, "1 Keong Saik Road", "089109", "cafe"),

    # Robertson Quay
    (1.2931, 103.8386, "11 Unity Street", "237995", "cafe"),
    (1.2924, 103.8395, "60 Robertson Quay", "238252", "restaurant"),

    # Tiong Bahru
    (1.2850, 103.8261, "56 Eng Hoon Street", "160056", "cafe"),
    (1.2861, 103.8278, "73 Yong Siak Street", "163073", "restaurant"),

    # Katong / East Coast
    (1.3048, 103.9025, "112 East Coast Road", "428802", "restaurant"),
    (1.3015, 103.9042, "208 East Coast Road", "428907", "cafe"),

    # Sentosa
    (1.2494, 103.8303, "8 Sentosa Gateway", "098269", "hotel"),
    (1.2565, 103.8204, "26 Sentosa Gateway", "098138", "attraction"),
]

# Business names with categories
business_names = [
    ("The Wild Rocket", "restaurant", "European fine dining with creative seasonal menu"),
    ("Kith Cafe", "cafe", "Popular brunch spot with excellent coffee and pastries"),
    ("Marina Bay Sands", "hotel", "Iconic luxury hotel with rooftop infinity pool"),
    ("Maxwell Food Centre", "hawker_centre", "Famous hawker center with local delights"),
    ("National Gallery Singapore", "museum", "Southeast Asia's largest visual arts museum"),
    ("Burnt Ends", "restaurant", "Modern Australian barbecue restaurant, Michelin-starred"),
    ("Common Man Coffee Roasters", "cafe", "Specialty coffee roaster with all-day breakfast"),
    ("Raffles Hotel", "hotel", "Historic colonial hotel, home of the Singapore Sling"),
    ("Tiong Bahru Bakery", "cafe", "French-inspired bakery with artisan breads"),
    ("Lau Pa Sat", "hawker_centre", "Historic Victorian-era food market"),
    ("PS.Cafe", "cafe", "Trendy cafe chain known for truffle fries"),
    ("The Fullerton Hotel", "hotel", "5-star heritage hotel on Marina Bay"),
    ("Jumbo Seafood", "restaurant", "Famous for chili crab and black pepper crab"),
    ("Tong Ah Eating House", "cafe", "Traditional kopitiam with kaya toast"),
    ("Gardens by the Bay", "attraction", "Iconic garden conservatory with Supertrees"),
    ("Odette", "restaurant", "Modern French fine dining, 3 Michelin stars"),
    ("Forty Hands", "cafe", "Specialty coffee cafe in Tiong Bahru"),
    ("ArtScience Museum", "museum", "Futuristic museum exploring art and science"),
    ("Ce La Vi", "restaurant", "Rooftop dining with panoramic city views"),
    ("Ya Kun Kaya Toast", "cafe", "Traditional breakfast chain, famous for kaya toast"),
    ("Haji Lane Cafes", "cafe", "Hipster cafes in colorful shophouses"),
    ("The Clan Hotel", "hotel", "Boutique hotel in Chinatown"),
    ("Din Tai Fung", "restaurant", "Taiwan chain famous for xiaolongbao dumplings"),
    ("Plain Vanilla Bakery", "cafe", "Artisan bakery known for cupcakes"),
    ("Singapore Zoo", "attraction", "World-class open-concept zoo"),
    ("Atlas Bar", "bar", "Art deco gin bar with stunning interior"),
    ("Nylon Coffee Roasters", "cafe", "Third-wave coffee specialists"),
]

# Generate migration SQL
migration_sql = f"""-- Proximity Service Database Migration
-- Generated: {datetime.now().isoformat()}
-- PostgreSQL with PostGIS and pgvector extensions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

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
CREATE TABLE businesses (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    address TEXT NOT NULL,
    postal_code VARCHAR(20),
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    semantic_search_blob TEXT,
    embedding_vector vector(1024),
    owner_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    coords GEOGRAPHY(POINT, 4326),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert sample users
-- Password for all users: 'test123' (hashed with bcrypt)
INSERT INTO users (id, username, password_hash) VALUES
('user_001', 'john_doe', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
('user_002', 'jane_smith', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
('user_003', 'bob_wilson', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');

-- Insert businesses
"""

businesses = []
for idx, (name, category, desc) in enumerate(business_names):
    if idx < len(locations):
        lat, lon, addr, postal, cat_override = locations[idx]
    else:
        # Generate random coordinates within Singapore bounds
        lat = random.uniform(1.27, 1.31)
        lon = random.uniform(103.82, 103.91)
        addr = f"{random.randint(1, 999)} {random.choice(['Smith', 'Victoria', 'Beach', 'River', 'Orchard'])} Street"
        postal = f"{random.randint(100000, 999999)}"

    business_id = f"biz_{hashlib.md5(f'{name}{idx}'.encode()).hexdigest()[:12]}"

    # Generate semantic search blob
    semantic_blob = generate_review_summary(name, category)

    # Generate embedding vector
    embedding = create_mock_embedding()
    embedding_str = '[' + ','.join(f'{x:.6f}' for x in embedding) + ']'

    # Assign some businesses to owners
    owner_id = None
    if idx % 3 == 0:
        owner_id = random.choice(['user_001', 'user_002', 'user_003'])

    owner_str = f"'{owner_id}'" if owner_id else 'NULL'

    migration_sql += f"""INSERT INTO businesses (id, name, address, postal_code, description, latitude, longitude, semantic_search_blob, embedding_vector, owner_id, coords)
VALUES (
    '{business_id}',
    '{name.replace("'", "''")}',
    '{addr}',
    '{postal}',
    '{desc.replace("'", "''")}',
    {lat},
    {lon},
    '{semantic_blob.replace("'", "''")}',
    '{embedding_str}',
    {owner_str},
    ST_SetSRID(ST_MakePoint({lon}, {lat}), 4326)::geography
);

"""

migration_sql += """
-- Create GiST spatial index for proximity queries
CREATE INDEX idx_business_spatial
ON businesses
USING GIST (coords);

-- Create HNSW vector index for semantic search
CREATE INDEX idx_business_hnsw_vibe
ON businesses
USING hnsw (embedding_vector vector_cosine_ops);

-- Create index on owner_id for business owner queries
CREATE INDEX idx_business_owner
ON businesses (owner_id);

-- Create index on name for search
CREATE INDEX idx_business_name
ON businesses (name);
"""

# Write migration file
with open('/Users/maryanahermawan/tdd-agent-harness/generations/proximity_service/data/migration.sql', 'w') as f:
    f.write(migration_sql)

print(f"Migration file created successfully!")
print(f"Total businesses: {len(business_names)}")
print(f"Location: /Users/maryanahermawan/tdd-agent-harness/generations/proximity_service/data/migration.sql")
print("\nTo apply migration:")
print("psql postgres://postgres:postgrespw@localhost:55000/postgres -f data/migration.sql")
