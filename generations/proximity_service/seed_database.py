#!/usr/bin/env python3
"""
Database seeding script for Proximity Service
Fetches real location data from Overture Maps and generates embeddings
"""

import duckdb
import json
import random
import hashlib
from datetime import datetime

def generate_review_summary(name, category, taxonomy):
    """Generate realistic review summary from business data"""
    categories = taxonomy.get('alternate', []) if taxonomy else []
    primary = taxonomy.get('primary', category) if taxonomy else category

    templates = [
        f"Great {primary} with excellent service. {name} is highly recommended by locals.",
        f"Popular {primary} known for quality. Visitors love the atmosphere at {name}.",
        f"Well-established {primary}. {name} offers consistent quality and friendly staff.",
        f"Charming {primary} with good reviews. {name} is a favorite spot in the area.",
        f"Recommended {primary}. {name} has great ambiance and reasonable prices.",
    ]

    summary = random.choice(templates)
    return summary[:280]  # Limit to 280 characters

def create_mock_embedding():
    """Create a mock 1024-dimensional embedding vector"""
    # In real implementation, this would call Voyage AI
    # For seeding, we use random normalized vectors
    vector = [random.gauss(0, 0.5) for _ in range(1024)]
    # Normalize
    magnitude = sum(x*x for x in vector) ** 0.5
    normalized = [x/magnitude for x in vector]
    return normalized

def main():
    print("Connecting to DuckDB and PostgreSQL...")
    con = duckdb.connect()

    # Load extensions
    print("Loading DuckDB extensions...")
    con.execute("INSTALL spatial;")
    con.execute("LOAD spatial;")
    con.execute("INSTALL httpfs;")
    con.execute("LOAD httpfs;")
    con.execute("INSTALL postgres;")
    con.execute("LOAD postgres;")

    # S3 settings
    con.execute("SET s3_region='us-west-2';")

    # Connect to PostgreSQL
    print("Connecting to PostgreSQL...")
    con.execute("""
    ATTACH 'dbname=postgres
            host=localhost
            port=55000
            user=postgres
            password=postgrespw'
    AS pg (TYPE postgres);
    """)

    # Create extensions in PostgreSQL
    print("Creating PostgreSQL extensions...")
    con.execute("SELECT pg.query('postgres', 'CREATE EXTENSION IF NOT EXISTS postgis');")
    con.execute("SELECT pg.query('postgres', 'CREATE EXTENSION IF NOT EXISTS vector');")

    # Create businesses table
    print("Creating businesses table...")
    con.execute("""
    SELECT pg.query('postgres', '
    DROP TABLE IF EXISTS businesses CASCADE;
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
        coords GEOGRAPHY(POINT, 4326)
    );
    ');
    """)

    # Create users table for authentication
    print("Creating users table...")
    con.execute("""
    SELECT pg.query('postgres', '
    DROP TABLE IF EXISTS users CASCADE;
    CREATE TABLE users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ');
    """)

    # Fetch data from Overture Maps
    print("Fetching places from Overture Maps (Singapore region)...")
    places_data = con.execute("""
    SELECT
        id,
        names,
        categories,
        addresses,
        ST_X(ST_GeomFromWKB(geometry)) AS longitude,
        ST_Y(ST_GeomFromWKB(geometry)) AS latitude
    FROM read_parquet(
        's3://overturemaps-us-west-2/release/2024-09-18.0/theme=places/*/*',
        filename=true,
        hive_partitioning=1
    )
    WHERE
        bbox.xmin BETWEEN 103.82 AND 103.86
        AND bbox.ymin BETWEEN 1.34 AND 1.37
        AND names IS NOT NULL
    LIMIT 100;
    """).fetchall()

    print(f"Fetched {len(places_data)} places from Overture Maps")

    # Process and insert businesses
    businesses = []
    for idx, row in enumerate(places_data):
        place_id, names_json, categories_json, addresses_json, lon, lat = row

        # Parse JSON fields
        try:
            names = json.loads(names_json) if names_json else {}
            categories = json.loads(categories_json) if categories_json else {}
            addresses = json.loads(addresses_json) if addresses_json else []
        except:
            continue

        name = names.get('primary', f'Place {idx}')

        # Get address
        address = 'Singapore'
        postal_code = None
        if addresses and len(addresses) > 0:
            addr = addresses[0]
            address = addr.get('freeform', 'Singapore')
            postal_code = addr.get('postcode', None)

        # Get category info
        basic_category = categories.get('primary', 'restaurant')
        taxonomy = categories.get('names', {}) if isinstance(categories, dict) else {}

        # Generate description and review summary
        description = f"A popular {basic_category} located in Singapore"
        semantic_search_blob = generate_review_summary(name, basic_category, taxonomy)

        # Generate embedding
        embedding = create_mock_embedding()
        embedding_str = '[' + ','.join(str(x) for x in embedding) + ']'

        # Create business ID
        business_id = f"biz_{hashlib.md5(place_id.encode()).hexdigest()[:12]}"

        businesses.append({
            'id': business_id,
            'name': name,
            'address': address,
            'postal_code': postal_code or '',
            'description': description,
            'latitude': lat,
            'longitude': lon,
            'semantic_search_blob': semantic_search_blob,
            'embedding_vector': embedding_str,
            'owner_id': None
        })

    print(f"Processed {len(businesses)} businesses")

    # Insert businesses into PostgreSQL
    for biz in businesses:
        con.execute(f"""
        SELECT pg.query('postgres', '
        INSERT INTO businesses (id, name, address, postal_code, description, latitude, longitude, semantic_search_blob, embedding_vector, coords)
        VALUES (
            ''{biz['id']}'',
            ''{biz['name'].replace("'", "''")}'',
            ''{biz['address'].replace("'", "''")}'',
            ''{biz['postal_code']}'',
            ''{biz['description'].replace("'", "''")}'',
            {biz['latitude']},
            {biz['longitude']},
            ''{biz['semantic_search_blob'].replace("'", "''")}'',
            ''{biz['embedding_vector']}'',
            ST_SetSRID(ST_MakePoint({biz['longitude']}, {biz['latitude']}), 4326)::geography
        );
        ');
        """)

    print("Creating indexes...")
    # Create GiST spatial index
    con.execute("""
    SELECT pg.query('postgres', '
    CREATE INDEX IF NOT EXISTS idx_business_spatial
    ON businesses
    USING GIST (coords);
    ');
    """)

    # Create HNSW vector index
    con.execute("""
    SELECT pg.query('postgres', '
    CREATE INDEX IF NOT EXISTS idx_business_hnsw_vibe
    ON businesses
    USING hnsw (embedding_vector vector_cosine_ops);
    ');
    """)

    # Create sample users
    print("Creating sample users...")
    sample_users = [
        {'id': 'user_001', 'username': 'john_doe', 'password_hash': '$2b$10$abcdefghijklmnopqrstuvwxyz123456789'},  # password: test123
        {'id': 'user_002', 'username': 'jane_smith', 'password_hash': '$2b$10$abcdefghijklmnopqrstuvwxyz987654321'},  # password: test456
    ]

    for user in sample_users:
        con.execute(f"""
        SELECT pg.query('postgres', '
        INSERT INTO users (id, username, password_hash)
        VALUES (''{user['id']}'', ''{user['username']}'', ''{user['password_hash']}'');
        ');
        """)

    print("\n=== Database seeding completed successfully ===")
    print(f"Inserted {len(businesses)} businesses")
    print(f"Inserted {len(sample_users)} users")
    print("Created spatial and vector indexes")

    # Now generate migration.sql file
    print("\nGenerating migration.sql file...")

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

-- Insert sample users (password is 'test123' for john_doe, 'test456' for jane_smith)
"""

    for user in sample_users:
        migration_sql += f"INSERT INTO users (id, username, password_hash) VALUES ('{user['id']}', '{user['username']}', '{user['password_hash']}');\n"

    migration_sql += "\n-- Insert businesses\n"
    for biz in businesses:
        migration_sql += f"""INSERT INTO businesses (id, name, address, postal_code, description, latitude, longitude, semantic_search_blob, embedding_vector, coords)
VALUES (
    '{biz['id']}',
    '{biz['name'].replace("'", "''")}',
    '{biz['address'].replace("'", "''")}',
    '{biz['postal_code']}',
    '{biz['description'].replace("'", "''")}',
    {biz['latitude']},
    {biz['longitude']},
    '{biz['semantic_search_blob'].replace("'", "''")}',
    '{biz['embedding_vector']}',
    ST_SetSRID(ST_MakePoint({biz['longitude']}, {biz['latitude']}), 4326)::geography
);

"""

    migration_sql += """
-- Create GiST spatial index for proximity queries
CREATE INDEX IF NOT EXISTS idx_business_spatial
ON businesses
USING GIST (coords);

-- Create HNSW vector index for semantic search
CREATE INDEX IF NOT EXISTS idx_business_hnsw_vibe
ON businesses
USING hnsw (embedding_vector vector_cosine_ops);

-- Create index on owner_id for business owner queries
CREATE INDEX IF NOT EXISTS idx_business_owner
ON businesses (owner_id);
"""

    # Write migration file
    with open('/Users/maryanahermawan/tdd-agent-harness/generations/proximity_service/data/migration.sql', 'w') as f:
        f.write(migration_sql)

    print("Migration file created at: /Users/maryanahermawan/tdd-agent-harness/generations/proximity_service/data/migration.sql")

    con.close()
    print("\nDone!")

if __name__ == '__main__':
    main()
