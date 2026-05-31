## Seed coordinate data

DuckDB is powerful analytics tool that allows you to query remote files and download only the data you want. You'll need to install  DuckDB at least client 1.1.0, which supports reading geoparquet, and read into . Below is example but you should name the DB and table meaningfully. Do **not** change the coordinate range (bbox).

```python
import duckdb

con = duckdb.connect()

# Extensions
con.execute("INSTALL spatial;")
con.execute("LOAD spatial;")

con.execute("INSTALL httpfs;")
con.execute("LOAD httpfs;")

con.execute("INSTALL postgres;")
con.execute("LOAD postgres;")

# S3 settings
con.execute("SET s3_region='us-west-2';")

# Connect PostgreSQL
con.execute("""
ATTACH 'dbname=gis
        host=localhost
        port=5432
        user=postgres
        password=postgres'
AS pg (TYPE postgres);
""")

# Create destination table in PostgreSQL
con.execute("""
CREATE TABLE IF NOT EXISTS pg.public.places (
    id TEXT,
    version BIGINT,
    names JSONB,
    categories JSONB,
    confidence DOUBLE PRECISION,
    websites JSONB,
    socials JSONB,
    emails JSONB,
    phones JSONB,
    brand JSONB,
    addresses JSONB,
    sources JSONB,
    geom geometry(Point, 4326)
);
""")

# Stream directly from S3 parquet into PostgreSQL
con.execute("""
INSERT INTO pg.public.places
SELECT
    CAST(names AS JSON),
    CAST(taxonomy AS JSON),
    basic_category,
    CAST(websites AS JSON),
    CAST(socials AS JSON),
    CAST(emails AS JSON),
    CAST(phones AS JSON),
    CAST(brand AS JSON),
    CAST(addresses AS JSON),
    names.primary AS name, 
    ST_X(ST_GeomFromWKB(geometry)) AS longitude, 
    ST_Y(ST_GeomFromWKB(geometry)) AS latitude,
FROM read_parquet(
    's3://overturemaps-us-west-2/release/2026-05-20.0/theme=places/*/*'
)
WHERE 
    bbox.xmin BETWEEN 103.82 AND 103.86
    AND bbox.ymin BETWEEN 1.34 AND 1.37
LIMIT 100;
""")

# Create GiST spatial index
con.execute("""
CREATE INDEX IF NOT EXISTS places_geom_gix
ON pg.public.places
USING GIST (geom);
""")
```


## Transform JSON values to string


### Seed review summary text and the vector

`basic_category` and `taxonomy`are great source for the review summary. Summarize into review text less than 280 character,
the shorter the better.

```json
"properties":
    "basic_category": "casual_eatery",
    "taxonomy":
        "hierarchy": ["food_and_drink", "restaurant", "casual_eatery", "gas_station_sushi"],
        "primary": "gas_station_sushi",
        "alternate": ["gas_station", "sushi_restaurant"]
```


