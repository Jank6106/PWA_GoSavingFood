# Supabase Backend — Raw Inspection

> Tạo lúc: 2026-09-28T18:21:39.131Z
> Nguồn: DATABASE_URL trong `.env` (chỉ đọc — không thay đổi dữ liệu)
> Chạy lại: `node scripts/db-inspect.mjs`

## Thông tin chung

```json
[
  {
    "database": "postgres",
    "user_name": "postgres",
    "version": "PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit"
  }
]
```

## Extensions

```json
[
  {
    "extname": "pg_cron",
    "extversion": "1.6.4"
  },
  {
    "extname": "pg_stat_statements",
    "extversion": "1.11"
  },
  {
    "extname": "pgcrypto",
    "extversion": "1.3"
  },
  {
    "extname": "plpgsql",
    "extversion": "1.0"
  },
  {
    "extname": "postgis",
    "extversion": "3.3.7"
  },
  {
    "extname": "supabase_vault",
    "extversion": "0.3.1"
  },
  {
    "extname": "uuid-ossp",
    "extversion": "1.1"
  }
]
```

## Bảng & cột (schema public)

```json
[
  {
    "table_name": "_migrations",
    "column_name": "id",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": "nextval('_migrations_id_seq'::regclass)"
  },
  {
    "table_name": "_migrations",
    "column_name": "name",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "_migrations",
    "column_name": "run_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "geography_columns",
    "column_name": "f_table_catalog",
    "data_type": "name",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "geography_columns",
    "column_name": "f_table_schema",
    "data_type": "name",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "geography_columns",
    "column_name": "f_table_name",
    "data_type": "name",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "geography_columns",
    "column_name": "f_geography_column",
    "data_type": "name",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "geography_columns",
    "column_name": "coord_dimension",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "geography_columns",
    "column_name": "srid",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "geography_columns",
    "column_name": "type",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "geometry_columns",
    "column_name": "f_table_catalog",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "geometry_columns",
    "column_name": "f_table_schema",
    "data_type": "name",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "geometry_columns",
    "column_name": "f_table_name",
    "data_type": "name",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "geometry_columns",
    "column_name": "f_geometry_column",
    "data_type": "name",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "geometry_columns",
    "column_name": "coord_dimension",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "geometry_columns",
    "column_name": "srid",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "geometry_columns",
    "column_name": "type",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "idempotency_keys",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "idempotency_keys",
    "column_name": "key",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "idempotency_keys",
    "column_name": "request_hash",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "idempotency_keys",
    "column_name": "response",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "idempotency_keys",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "idempotency_keys",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "idempotency_keys",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "issues",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "issues",
    "column_name": "order_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "issues",
    "column_name": "reporter_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "issues",
    "column_name": "reporter_role",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "issues",
    "column_name": "title",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "issues",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "issues",
    "column_name": "images",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": "'[]'::jsonb"
  },
  {
    "table_name": "issues",
    "column_name": "status",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": "'pending'::issue_status"
  },
  {
    "table_name": "issues",
    "column_name": "resolution",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "issues",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "issues",
    "column_name": "resolved_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "issues",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "notifications",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "icon",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "title",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "body",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "data",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb"
  },
  {
    "table_name": "notifications",
    "column_name": "is_read",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "false"
  },
  {
    "table_name": "notifications",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "notifications",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "order_items",
    "column_name": "order_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "bag_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "bag_name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "quantity",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "unit_price",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "total_price",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "order_items",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "orders",
    "column_name": "customer_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "store_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "total_original_price",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "total_discount_price",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "discount_amount",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "orders",
    "column_name": "final_amount",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "voucher_code",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "status",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": "'pending'::order_status"
  },
  {
    "table_name": "orders",
    "column_name": "payment_method",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "payment_status",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": "'pending'::payment_status"
  },
  {
    "table_name": "orders",
    "column_name": "qr_code",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "pickup_time",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "note",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "orders",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "orders",
    "column_name": "completed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "reviews",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "reviews",
    "column_name": "order_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "reviews",
    "column_name": "customer_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "reviews",
    "column_name": "store_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "reviews",
    "column_name": "rating",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "reviews",
    "column_name": "comment",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "reviews",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "reviews",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "reviews",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "spatial_ref_sys",
    "column_name": "srid",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "spatial_ref_sys",
    "column_name": "auth_name",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "spatial_ref_sys",
    "column_name": "auth_srid",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "spatial_ref_sys",
    "column_name": "srtext",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "spatial_ref_sys",
    "column_name": "proj4text",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "stores",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "stores",
    "column_name": "owner_user_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "stores",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "stores",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "stores",
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "stores",
    "column_name": "address",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "stores",
    "column_name": "location",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "stores",
    "column_name": "latitude",
    "data_type": "double precision",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "stores",
    "column_name": "longitude",
    "data_type": "double precision",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "stores",
    "column_name": "logo_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "stores",
    "column_name": "banner_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "stores",
    "column_name": "rating",
    "data_type": "real",
    "is_nullable": "NO",
    "column_default": "0.0"
  },
  {
    "table_name": "stores",
    "column_name": "total_ratings",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "stores",
    "column_name": "status",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": "'active'::merchant_status"
  },
  {
    "table_name": "stores",
    "column_name": "commission_rate",
    "data_type": "real",
    "is_nullable": "NO",
    "column_default": "15.0"
  },
  {
    "table_name": "stores",
    "column_name": "food_categories",
    "data_type": "ARRAY",
    "is_nullable": "NO",
    "column_default": "'{}'::text[]"
  },
  {
    "table_name": "stores",
    "column_name": "open_time",
    "data_type": "time without time zone",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "stores",
    "column_name": "close_time",
    "data_type": "time without time zone",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "stores",
    "column_name": "is_open",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "true"
  },
  {
    "table_name": "stores",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "stores",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "stores",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "surprise_bags",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "surprise_bags",
    "column_name": "store_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "surprise_bags",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "surprise_bags",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "surprise_bags",
    "column_name": "original_price",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "surprise_bags",
    "column_name": "discount_price",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "surprise_bags",
    "column_name": "category",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "surprise_bags",
    "column_name": "image_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "surprise_bags",
    "column_name": "quantity",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "surprise_bags",
    "column_name": "max_quantity",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": "3"
  },
  {
    "table_name": "surprise_bags",
    "column_name": "pickup_start",
    "data_type": "time without time zone",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "surprise_bags",
    "column_name": "pickup_end",
    "data_type": "time without time zone",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "surprise_bags",
    "column_name": "is_daily",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "true"
  },
  {
    "table_name": "surprise_bags",
    "column_name": "is_available",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "true"
  },
  {
    "table_name": "surprise_bags",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "surprise_bags",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "surprise_bags",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "surprise_bags",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "users",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "users",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "users",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "users",
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "users",
    "column_name": "avatar_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "users",
    "column_name": "role",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": "'customer'::user_role"
  },
  {
    "table_name": "users",
    "column_name": "store_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "users",
    "column_name": "preferences",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb"
  },
  {
    "table_name": "users",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "users",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "users",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "vouchers",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "vouchers",
    "column_name": "code",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "vouchers",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "vouchers",
    "column_name": "discount_type",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "vouchers",
    "column_name": "discount_value",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "vouchers",
    "column_name": "min_order_value",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "vouchers",
    "column_name": "max_discount",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "vouchers",
    "column_name": "quantity",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "vouchers",
    "column_name": "used_count",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "vouchers",
    "column_name": "start_date",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "vouchers",
    "column_name": "end_date",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "vouchers",
    "column_name": "is_active",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "true"
  },
  {
    "table_name": "vouchers",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "vouchers",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "vouchers",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  }
]
```

## Enum types (schema public)

```json
[
  {
    "enum_name": "bag_category",
    "values": "bakery, beverage, vegetarian, meat, seafood, raw_food, other"
  },
  {
    "enum_name": "issue_status",
    "values": "pending, resolved, rejected"
  },
  {
    "enum_name": "merchant_status",
    "values": "active, suspended, deleted"
  },
  {
    "enum_name": "order_status",
    "values": "pending, confirmed, preparing, ready_for_pickup, picked_up, completed, cancelled, refund_requested, refunded"
  },
  {
    "enum_name": "payment_method",
    "values": "zalopay, momo, banking, cash"
  },
  {
    "enum_name": "payment_status",
    "values": "pending, success, failed, refunded"
  },
  {
    "enum_name": "reporter_role",
    "values": "customer, merchant"
  },
  {
    "enum_name": "user_role",
    "values": "customer, merchant, admin"
  },
  {
    "enum_name": "voucher_discount_type",
    "values": "percentage, fixed"
  }
]
```

## RLS bật/tắt (schema public)

```json
[
  {
    "table_name": "_migrations",
    "rls_enabled": false,
    "rls_forced": false
  },
  {
    "table_name": "idempotency_keys",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "issues",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "notifications",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "order_items",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "orders",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "reviews",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "spatial_ref_sys",
    "rls_enabled": false,
    "rls_forced": false
  },
  {
    "table_name": "stores",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "surprise_bags",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "users",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "vouchers",
    "rls_enabled": true,
    "rls_forced": false
  }
]
```

## RLS policies (public + storage)

```json
[
  {
    "schemaname": "public",
    "tablename": "issues",
    "policyname": "Users can create issues",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((reporter_id = auth.uid()) AND (deleted_at IS NULL))"
  },
  {
    "schemaname": "public",
    "tablename": "issues",
    "policyname": "Users can view own issues",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((reporter_id = auth.uid()) AND (deleted_at IS NULL))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Users can update own notifications",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "((user_id = auth.uid()) AND (deleted_at IS NULL))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Users can view own notifications",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((user_id = auth.uid()) AND (deleted_at IS NULL))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "order_items",
    "policyname": "Customers can view own order items",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM orders\n  WHERE ((orders.id = order_items.order_id) AND (orders.customer_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "order_items",
    "policyname": "Store owners can view own order items",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM (orders\n     JOIN stores ON ((stores.id = orders.store_id)))\n  WHERE ((orders.id = order_items.order_id) AND (stores.owner_user_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "orders",
    "policyname": "Customers can create orders",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((customer_id = auth.uid()) AND (deleted_at IS NULL))"
  },
  {
    "schemaname": "public",
    "tablename": "orders",
    "policyname": "Customers can view own orders",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((customer_id = auth.uid()) AND (deleted_at IS NULL))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "orders",
    "policyname": "Store owners can update store orders",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM stores\n  WHERE ((stores.id = orders.store_id) AND (stores.owner_user_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "orders",
    "policyname": "Store owners can view store orders",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((EXISTS ( SELECT 1\n   FROM stores\n  WHERE ((stores.id = orders.store_id) AND (stores.owner_user_id = auth.uid())))) AND (deleted_at IS NULL))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "reviews",
    "policyname": "Customers can create own reviews",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((customer_id = auth.uid()) AND (deleted_at IS NULL))"
  },
  {
    "schemaname": "public",
    "tablename": "reviews",
    "policyname": "Customers can update own reviews",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "((customer_id = auth.uid()) AND (deleted_at IS NULL))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "reviews",
    "policyname": "Public can view reviews",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(deleted_at IS NULL)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "stores",
    "policyname": "Admins can manage all stores",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(( SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = 'admin'::text)",
    "with_check": "(( SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = 'admin'::text)"
  },
  {
    "schemaname": "public",
    "tablename": "stores",
    "policyname": "Public can view active stores",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((status = 'active'::merchant_status) AND (deleted_at IS NULL))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "stores",
    "policyname": "Store owners can update own store",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "((owner_user_id = auth.uid()) AND (deleted_at IS NULL))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "surprise_bags",
    "policyname": "Public can view available bags",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((is_available = true) AND (deleted_at IS NULL))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "surprise_bags",
    "policyname": "Store owners can manage own bags",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM stores\n  WHERE ((stores.id = surprise_bags.store_id) AND (stores.owner_user_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins can view all users",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(( SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = 'admin'::text)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can update own profile",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can view own profile",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "vouchers",
    "policyname": "Admins can manage vouchers",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(( SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = 'admin'::text)",
    "with_check": "(( SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = 'admin'::text)"
  },
  {
    "schemaname": "public",
    "tablename": "vouchers",
    "policyname": "Public can view active vouchers",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((is_active = true) AND (deleted_at IS NULL))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Delete Avatars",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "((bucket_id = 'avatars'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Delete Bag Images",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "((bucket_id = 'bag-images'::text) AND is_store_owner(auth.uid(), (split_part(name, '/'::text, 1))::uuid))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Delete Bag Photos",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "((bucket_id = 'bag-photos'::text) AND is_store_owner(auth.uid(), (split_part(name, '/'::text, 1))::uuid))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Delete Store Assets",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "((bucket_id = 'store-assets'::text) AND is_store_owner(auth.uid(), (split_part(name, '/'::text, 1))::uuid))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Delete Store Logos",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "((bucket_id = 'store-logos'::text) AND is_store_owner(auth.uid(), (split_part(name, '/'::text, 1))::uuid))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Insert Avatars",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((bucket_id = 'avatars'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text))"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Insert Bag Images",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((bucket_id = 'bag-images'::text) AND is_store_owner(auth.uid(), (split_part(name, '/'::text, 1))::uuid))"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Insert Bag Photos",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((bucket_id = 'bag-photos'::text) AND is_store_owner(auth.uid(), (split_part(name, '/'::text, 1))::uuid))"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Insert Store Assets",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((bucket_id = 'store-assets'::text) AND is_store_owner(auth.uid(), (split_part(name, '/'::text, 1))::uuid))"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Insert Store Logos",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((bucket_id = 'store-logos'::text) AND is_store_owner(auth.uid(), (split_part(name, '/'::text, 1))::uuid))"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Public Read Avatars",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(bucket_id = 'avatars'::text)",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Public Read Bag Images",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(bucket_id = 'bag-images'::text)",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Public Read Bag Photos",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(bucket_id = 'bag-photos'::text)",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Public Read Store Assets",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(bucket_id = 'store-assets'::text)",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Public Read Store Logos",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(bucket_id = 'store-logos'::text)",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Update Avatars",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "((bucket_id = 'avatars'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Update Bag Images",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "((bucket_id = 'bag-images'::text) AND is_store_owner(auth.uid(), (split_part(name, '/'::text, 1))::uuid))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Update Bag Photos",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "((bucket_id = 'bag-photos'::text) AND is_store_owner(auth.uid(), (split_part(name, '/'::text, 1))::uuid))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Update Store Assets",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "((bucket_id = 'store-assets'::text) AND is_store_owner(auth.uid(), (split_part(name, '/'::text, 1))::uuid))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Update Store Logos",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "((bucket_id = 'store-logos'::text) AND is_store_owner(auth.uid(), (split_part(name, '/'::text, 1))::uuid))",
    "with_check": null
  }
]
```

## Functions (public, không thuộc extension)

```json
[
  {
    "function_name": "auto_deactivate_bag",
    "arguments": "",
    "returns": "trigger",
    "security_definer": false,
    "volatility": "v"
  },
  {
    "function_name": "cleanup_expired_idempotency_keys",
    "arguments": "",
    "returns": "void",
    "security_definer": true,
    "volatility": "v"
  },
  {
    "function_name": "create_order_transaction",
    "arguments": "p_id uuid, p_customer_id uuid, p_store_id uuid, p_idempotency_key text, p_items jsonb, p_voucher_code text, p_pickup_time timestamp with time zone, p_payment_method text, p_note text, p_total_original_price integer, p_total_discount_price integer, p_discount_amount integer, p_final_amount integer, p_qr_code text",
    "returns": "jsonb",
    "security_definer": true,
    "volatility": "v"
  },
  {
    "function_name": "create_store",
    "arguments": "p_owner_user_id uuid, p_name text, p_description text, p_phone text, p_address text, p_latitude double precision, p_longitude double precision, p_logo_url text, p_banner_url text, p_food_categories text[], p_open_time time without time zone, p_close_time time without time zone, p_is_open boolean",
    "returns": "TABLE(id uuid, owner_user_id uuid, name text, description text, phone text, address text, logo_url text, banner_url text, rating real, total_ratings integer, status merchant_status, commission_rate real, food_categories text[], open_time time without time zone, close_time time without time zone, is_open boolean, created_at timestamp with time zone, updated_at timestamp with time zone, deleted_at timestamp with time zone, latitude double precision, longitude double precision)",
    "security_definer": true,
    "volatility": "v"
  },
  {
    "function_name": "expire_stale_surprise_bags",
    "arguments": "",
    "returns": "void",
    "security_definer": true,
    "volatility": "v"
  },
  {
    "function_name": "expire_unpaid_orders",
    "arguments": "",
    "returns": "void",
    "security_definer": true,
    "volatility": "v"
  },
  {
    "function_name": "get_store_by_owner",
    "arguments": "p_owner_user_id uuid",
    "returns": "TABLE(id uuid, owner_user_id uuid, name text, description text, phone text, address text, logo_url text, banner_url text, rating real, total_ratings integer, status merchant_status, commission_rate real, food_categories text[], open_time time without time zone, close_time time without time zone, is_open boolean, created_at timestamp with time zone, updated_at timestamp with time zone, deleted_at timestamp with time zone, latitude double precision, longitude double precision)",
    "security_definer": true,
    "volatility": "v"
  },
  {
    "function_name": "handle_new_user",
    "arguments": "",
    "returns": "trigger",
    "security_definer": true,
    "volatility": "v"
  },
  {
    "function_name": "is_store_owner",
    "arguments": "p_user_id uuid, p_store_id uuid",
    "returns": "boolean",
    "security_definer": true,
    "volatility": "v"
  },
  {
    "function_name": "list_bags_nearby",
    "arguments": "p_lat double precision, p_lng double precision, p_radius integer DEFAULT 5000, p_category text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20",
    "returns": "TABLE(id uuid, store_id uuid, name text, description text, original_price integer, discount_price integer, category bag_category, image_url text, quantity integer, max_quantity integer, pickup_start time without time zone, pickup_end time without time zone, is_daily boolean, is_available boolean, created_at timestamp with time zone, updated_at timestamp with time zone, expires_at timestamp with time zone, deleted_at timestamp with time zone, store_name text, store_logo_url text, store_address text, latitude double precision, longitude double precision, distance_m double precision, total_count bigint)",
    "security_definer": true,
    "volatility": "v"
  },
  {
    "function_name": "list_stores_nearby",
    "arguments": "p_lat double precision, p_lng double precision, p_radius integer DEFAULT 5000, p_category text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20",
    "returns": "TABLE(id uuid, owner_user_id uuid, name text, description text, phone text, address text, logo_url text, banner_url text, rating real, total_ratings integer, status merchant_status, commission_rate real, food_categories text[], open_time time without time zone, close_time time without time zone, is_open boolean, created_at timestamp with time zone, updated_at timestamp with time zone, deleted_at timestamp with time zone, latitude double precision, longitude double precision, distance_m double precision, total_count bigint)",
    "security_definer": true,
    "volatility": "v"
  },
  {
    "function_name": "transition_order_status_transaction",
    "arguments": "p_order_id uuid, p_target_status text, p_actor_id uuid, p_actor_role text",
    "returns": "jsonb",
    "security_definer": true,
    "volatility": "v"
  },
  {
    "function_name": "update_store_location_and_fields",
    "arguments": "p_owner_user_id uuid, p_latitude double precision, p_longitude double precision, p_updates jsonb",
    "returns": "TABLE(id uuid, owner_user_id uuid, name text, description text, phone text, address text, logo_url text, banner_url text, rating real, total_ratings integer, status merchant_status, commission_rate real, food_categories text[], open_time time without time zone, close_time time without time zone, is_open boolean, created_at timestamp with time zone, updated_at timestamp with time zone, deleted_at timestamp with time zone, latitude double precision, longitude double precision)",
    "security_definer": true,
    "volatility": "v"
  },
  {
    "function_name": "update_store_rating",
    "arguments": "",
    "returns": "trigger",
    "security_definer": true,
    "volatility": "v"
  },
  {
    "function_name": "update_updated_at_column",
    "arguments": "",
    "returns": "trigger",
    "security_definer": false,
    "volatility": "v"
  }
]
```

## Trigger (public + auth, không tính trigger nội bộ)

```json
[
  {
    "schema_name": "auth",
    "table_name": "users",
    "trigger_name": "on_auth_user_created",
    "definition": "CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()"
  },
  {
    "schema_name": "public",
    "table_name": "orders",
    "trigger_name": "update_orders_updated_at",
    "definition": "CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "schema_name": "public",
    "table_name": "reviews",
    "trigger_name": "update_reviews_updated_at",
    "definition": "CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "schema_name": "public",
    "table_name": "reviews",
    "trigger_name": "update_store_rating_after_review",
    "definition": "CREATE TRIGGER update_store_rating_after_review AFTER INSERT OR DELETE OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_store_rating()"
  },
  {
    "schema_name": "public",
    "table_name": "stores",
    "trigger_name": "update_stores_updated_at",
    "definition": "CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "schema_name": "public",
    "table_name": "surprise_bags",
    "trigger_name": "auto_deactivate_surprise_bag",
    "definition": "CREATE TRIGGER auto_deactivate_surprise_bag BEFORE UPDATE ON public.surprise_bags FOR EACH ROW EXECUTE FUNCTION auto_deactivate_bag()"
  },
  {
    "schema_name": "public",
    "table_name": "surprise_bags",
    "trigger_name": "update_surprise_bags_updated_at",
    "definition": "CREATE TRIGGER update_surprise_bags_updated_at BEFORE UPDATE ON public.surprise_bags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "schema_name": "public",
    "table_name": "users",
    "trigger_name": "update_users_updated_at",
    "definition": "CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "schema_name": "public",
    "table_name": "vouchers",
    "trigger_name": "update_vouchers_updated_at",
    "definition": "CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON public.vouchers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  }
]
```

## Constraints (các bảng nghiệp vụ)

```json
[
  {
    "table_name": "issues",
    "constraint_name": "issues_order_id_fkey",
    "definition": "FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE"
  },
  {
    "table_name": "issues",
    "constraint_name": "issues_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "issues",
    "constraint_name": "issues_reporter_id_fkey",
    "definition": "FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE"
  },
  {
    "table_name": "notifications",
    "constraint_name": "notifications_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "notifications",
    "constraint_name": "notifications_user_id_fkey",
    "definition": "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
  },
  {
    "table_name": "order_items",
    "constraint_name": "order_items_bag_id_fkey",
    "definition": "FOREIGN KEY (bag_id) REFERENCES surprise_bags(id) ON DELETE RESTRICT"
  },
  {
    "table_name": "order_items",
    "constraint_name": "order_items_order_id_fkey",
    "definition": "FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE"
  },
  {
    "table_name": "order_items",
    "constraint_name": "order_items_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "order_items",
    "constraint_name": "order_items_quantity_check",
    "definition": "CHECK ((quantity > 0))"
  },
  {
    "table_name": "order_items",
    "constraint_name": "order_items_total_price_check",
    "definition": "CHECK ((total_price > 0))"
  },
  {
    "table_name": "order_items",
    "constraint_name": "order_items_unit_price_check",
    "definition": "CHECK ((unit_price > 0))"
  },
  {
    "table_name": "order_items",
    "constraint_name": "valid_total",
    "definition": "CHECK ((total_price = (unit_price * quantity)))"
  },
  {
    "table_name": "orders",
    "constraint_name": "orders_customer_id_fkey",
    "definition": "FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT"
  },
  {
    "table_name": "orders",
    "constraint_name": "orders_discount_amount_check",
    "definition": "CHECK ((discount_amount >= 0))"
  },
  {
    "table_name": "orders",
    "constraint_name": "orders_final_amount_check",
    "definition": "CHECK ((final_amount >= 0))"
  },
  {
    "table_name": "orders",
    "constraint_name": "orders_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "orders",
    "constraint_name": "orders_qr_code_key",
    "definition": "UNIQUE (qr_code)"
  },
  {
    "table_name": "orders",
    "constraint_name": "orders_store_id_fkey",
    "definition": "FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE RESTRICT"
  },
  {
    "table_name": "orders",
    "constraint_name": "orders_total_discount_price_check",
    "definition": "CHECK ((total_discount_price >= 0))"
  },
  {
    "table_name": "orders",
    "constraint_name": "orders_total_original_price_check",
    "definition": "CHECK ((total_original_price >= 0))"
  },
  {
    "table_name": "orders",
    "constraint_name": "orders_voucher_code_fkey",
    "definition": "FOREIGN KEY (voucher_code) REFERENCES vouchers(code) ON DELETE SET NULL"
  },
  {
    "table_name": "reviews",
    "constraint_name": "reviews_customer_id_fkey",
    "definition": "FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE"
  },
  {
    "table_name": "reviews",
    "constraint_name": "reviews_order_id_fkey",
    "definition": "FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE"
  },
  {
    "table_name": "reviews",
    "constraint_name": "reviews_order_id_key",
    "definition": "UNIQUE (order_id)"
  },
  {
    "table_name": "reviews",
    "constraint_name": "reviews_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "reviews",
    "constraint_name": "reviews_rating_check",
    "definition": "CHECK (((rating >= 1) AND (rating <= 5)))"
  },
  {
    "table_name": "reviews",
    "constraint_name": "reviews_store_id_fkey",
    "definition": "FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE"
  },
  {
    "table_name": "stores",
    "constraint_name": "stores_commission_rate_check",
    "definition": "CHECK (((commission_rate >= (0)::double precision) AND (commission_rate <= (100)::double precision)))"
  },
  {
    "table_name": "stores",
    "constraint_name": "stores_owner_user_id_fkey",
    "definition": "FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE"
  },
  {
    "table_name": "stores",
    "constraint_name": "stores_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "stores",
    "constraint_name": "stores_rating_check",
    "definition": "CHECK (((rating >= (0)::double precision) AND (rating <= (5)::double precision)))"
  },
  {
    "table_name": "stores",
    "constraint_name": "stores_total_ratings_check",
    "definition": "CHECK ((total_ratings >= 0))"
  },
  {
    "table_name": "stores",
    "constraint_name": "valid_hours",
    "definition": "CHECK ((close_time > open_time))"
  },
  {
    "table_name": "surprise_bags",
    "constraint_name": "surprise_bags_discount_price_check",
    "definition": "CHECK ((discount_price > 0))"
  },
  {
    "table_name": "surprise_bags",
    "constraint_name": "surprise_bags_max_quantity_check",
    "definition": "CHECK ((max_quantity > 0))"
  },
  {
    "table_name": "surprise_bags",
    "constraint_name": "surprise_bags_original_price_check",
    "definition": "CHECK ((original_price > 0))"
  },
  {
    "table_name": "surprise_bags",
    "constraint_name": "surprise_bags_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "surprise_bags",
    "constraint_name": "surprise_bags_quantity_check",
    "definition": "CHECK ((quantity >= 0))"
  },
  {
    "table_name": "surprise_bags",
    "constraint_name": "surprise_bags_store_id_fkey",
    "definition": "FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE"
  },
  {
    "table_name": "surprise_bags",
    "constraint_name": "valid_discount",
    "definition": "CHECK ((discount_price < original_price))"
  },
  {
    "table_name": "surprise_bags",
    "constraint_name": "valid_expiry",
    "definition": "CHECK ((expires_at > created_at))"
  },
  {
    "table_name": "surprise_bags",
    "constraint_name": "valid_pickup_window",
    "definition": "CHECK ((pickup_end > pickup_start))"
  },
  {
    "table_name": "users",
    "constraint_name": "fk_users_store_id",
    "definition": "FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL"
  },
  {
    "table_name": "users",
    "constraint_name": "users_email_key",
    "definition": "UNIQUE (email)"
  },
  {
    "table_name": "users",
    "constraint_name": "users_phone_key",
    "definition": "UNIQUE (phone)"
  },
  {
    "table_name": "users",
    "constraint_name": "users_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "vouchers",
    "constraint_name": "valid_dates",
    "definition": "CHECK ((end_date > start_date))"
  },
  {
    "table_name": "vouchers",
    "constraint_name": "valid_discount_type",
    "definition": "CHECK ((((discount_type = 'percentage'::voucher_discount_type) AND (discount_value <= 100)) OR ((discount_type = 'fixed'::voucher_discount_type) AND (discount_value > 0))))"
  },
  {
    "table_name": "vouchers",
    "constraint_name": "valid_quantity",
    "definition": "CHECK ((used_count <= quantity))"
  },
  {
    "table_name": "vouchers",
    "constraint_name": "vouchers_code_key",
    "definition": "UNIQUE (code)"
  },
  {
    "table_name": "vouchers",
    "constraint_name": "vouchers_discount_value_check",
    "definition": "CHECK ((discount_value > 0))"
  },
  {
    "table_name": "vouchers",
    "constraint_name": "vouchers_max_discount_check",
    "definition": "CHECK ((max_discount > 0))"
  },
  {
    "table_name": "vouchers",
    "constraint_name": "vouchers_min_order_value_check",
    "definition": "CHECK ((min_order_value >= 0))"
  },
  {
    "table_name": "vouchers",
    "constraint_name": "vouchers_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "vouchers",
    "constraint_name": "vouchers_quantity_check",
    "definition": "CHECK ((quantity > 0))"
  },
  {
    "table_name": "vouchers",
    "constraint_name": "vouchers_used_count_check",
    "definition": "CHECK ((used_count >= 0))"
  }
]
```

## Storage buckets

```json
[
  {
    "id": "avatars",
    "name": "avatars",
    "public": true,
    "file_size_limit": "2097152",
    "allowed_mime_types": [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heic-sequence"
    ],
    "created_at": "2026-08-04T18:12:32.232Z"
  },
  {
    "id": "bag-images",
    "name": "bag-images",
    "public": true,
    "file_size_limit": "5242880",
    "allowed_mime_types": [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heic-sequence"
    ],
    "created_at": "2026-08-04T18:12:32.232Z"
  },
  {
    "id": "bag-photos",
    "name": "bag-photos",
    "public": true,
    "file_size_limit": "5242880",
    "allowed_mime_types": [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heic-sequence"
    ],
    "created_at": "2026-09-28T08:39:30.710Z"
  },
  {
    "id": "store-assets",
    "name": "store-assets",
    "public": true,
    "file_size_limit": "5242880",
    "allowed_mime_types": [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heic-sequence"
    ],
    "created_at": "2026-09-28T08:39:30.710Z"
  },
  {
    "id": "store-logos",
    "name": "store-logos",
    "public": true,
    "file_size_limit": "3145728",
    "allowed_mime_types": [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heic-sequence"
    ],
    "created_at": "2026-08-04T18:12:32.232Z"
  }
]
```

## Định nghĩa RPC nghiệp vụ

```json
[
  {
    "function_name": "cleanup_expired_idempotency_keys",
    "definition": "CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n  DELETE FROM public.idempotency_keys\n  WHERE expires_at <= NOW();\nEND;\n$function$\n"
  },
  {
    "function_name": "create_order_transaction",
    "definition": "CREATE OR REPLACE FUNCTION public.create_order_transaction(p_id uuid, p_customer_id uuid, p_store_id uuid, p_idempotency_key text, p_items jsonb, p_voucher_code text, p_pickup_time timestamp with time zone, p_payment_method text, p_note text, p_total_original_price integer, p_total_discount_price integer, p_discount_amount integer, p_final_amount integer, p_qr_code text)\n RETURNS jsonb\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_item RECORD;\n  v_bag_id UUID;\n  v_quantity INTEGER;\n  v_discount_price INTEGER;\n  v_bag_name TEXT;\n  v_current_stock INTEGER;\n  v_is_available BOOLEAN;\n  v_store_id UUID;\n  v_voucher_id UUID;\n  v_voucher_used_count INTEGER;\n  v_voucher_quantity INTEGER;\n  v_voucher_is_active BOOLEAN;\n  v_voucher_start TIMESTAMPTZ;\n  v_voucher_end TIMESTAMPTZ;\n  v_expires_at TIMESTAMPTZ;\nBEGIN\n  IF EXISTS (\n    SELECT 1 FROM public.idempotency_keys\n    WHERE key = p_idempotency_key AND user_id = p_customer_id\n  ) THEN\n    RETURN json_build_object(\n      'success', true,\n      'is_duplicate', true,\n      'order_id', (\n        SELECT (response->>'orderId')::UUID\n        FROM public.idempotency_keys\n        WHERE key = p_idempotency_key AND user_id = p_customer_id\n      )\n    );\n  END IF;\n\n  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(\"bagId\" UUID, quantity INTEGER) LOOP\n    v_bag_id := v_item.\"bagId\";\n    v_quantity := v_item.quantity;\n\n    SELECT name, quantity, is_available, discount_price, store_id, expires_at\n    INTO v_bag_name, v_current_stock, v_is_available, v_discount_price, v_store_id, v_expires_at\n    FROM public.surprise_bags\n    WHERE id = v_bag_id AND deleted_at IS NULL\n    FOR UPDATE;\n\n    IF NOT FOUND THEN\n      RAISE EXCEPTION 'BAG_NOT_FOUND' USING DETAIL = v_bag_id::TEXT;\n    END IF;\n    IF v_store_id != p_store_id THEN\n      RAISE EXCEPTION 'STORE_MISMATCH' USING DETAIL = v_bag_id::TEXT;\n    END IF;\n    IF NOT v_is_available OR v_current_stock < v_quantity OR NOW() > v_expires_at THEN\n      RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object('bagId', v_bag_id, 'available', v_current_stock, 'requested', v_quantity)::TEXT;\n    END IF;\n\n    UPDATE public.surprise_bags\n    SET quantity = quantity - v_quantity, updated_at = NOW()\n    WHERE id = v_bag_id;\n  END LOOP;\n\n  IF p_voucher_code IS NOT NULL AND p_voucher_code != '' THEN\n    SELECT id, used_count, quantity, is_active, start_date, end_date\n    INTO v_voucher_id, v_voucher_used_count, v_voucher_quantity, v_voucher_is_active, v_voucher_start, v_voucher_end\n    FROM public.vouchers\n    WHERE code = p_voucher_code AND deleted_at IS NULL\n    FOR UPDATE;\n\n    IF NOT FOUND THEN RAISE EXCEPTION 'VOUCHER_NOT_FOUND' USING DETAIL = p_voucher_code; END IF;\n    IF NOT v_voucher_is_active THEN RAISE EXCEPTION 'VOUCHER_INACTIVE' USING DETAIL = p_voucher_code; END IF;\n    IF NOW() < v_voucher_start OR NOW() > v_voucher_end THEN RAISE EXCEPTION 'VOUCHER_EXPIRED' USING DETAIL = p_voucher_code; END IF;\n    IF v_voucher_used_count >= v_voucher_quantity THEN RAISE EXCEPTION 'VOUCHER_USAGE_LIMIT' USING DETAIL = p_voucher_code; END IF;\n    IF EXISTS (\n      SELECT 1 FROM public.orders\n      WHERE customer_id = p_customer_id AND voucher_code = p_voucher_code\n        AND status != 'cancelled' AND deleted_at IS NULL\n    ) THEN RAISE EXCEPTION 'VOUCHER_ALREADY_USED' USING DETAIL = p_voucher_code; END IF;\n\n    UPDATE public.vouchers\n    SET used_count = used_count + 1, updated_at = NOW()\n    WHERE id = v_voucher_id;\n  END IF;\n\n  INSERT INTO public.orders (\n    id, customer_id, store_id, total_original_price, total_discount_price,\n    discount_amount, final_amount, voucher_code, status,\n    payment_method, payment_status, qr_code, pickup_time, note, created_at, updated_at\n  ) VALUES (\n    p_id, p_customer_id, p_store_id, p_total_original_price, p_total_discount_price,\n    p_discount_amount, p_final_amount, p_voucher_code, 'pending'::order_status,\n    p_payment_method::payment_method, 'pending'::payment_status, p_qr_code, p_pickup_time, p_note, NOW(), NOW()\n  );\n\n  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(\"bagId\" UUID, quantity INTEGER) LOOP\n    SELECT name, discount_price INTO v_bag_name, v_discount_price\n    FROM public.surprise_bags WHERE id = v_item.\"bagId\";\n\n    INSERT INTO public.order_items (id, order_id, bag_id, bag_name, quantity, unit_price, total_price, created_at)\n    VALUES (gen_random_uuid(), p_id, v_item.\"bagId\", v_bag_name, v_item.quantity, v_discount_price, v_discount_price * v_item.quantity, NOW());\n  END LOOP;\n\n  INSERT INTO public.idempotency_keys (id, user_id, key, request_hash, response, expires_at, created_at)\n  VALUES (gen_random_uuid(), p_customer_id, p_idempotency_key, p_idempotency_key, json_build_object('orderId', p_id), NOW() + INTERVAL '7 days', NOW());\n\n  RETURN json_build_object('success', true, 'is_duplicate', false, 'order_id', p_id);\nEND;\n$function$\n"
  },
  {
    "function_name": "create_store",
    "definition": "CREATE OR REPLACE FUNCTION public.create_store(p_owner_user_id uuid, p_name text, p_description text, p_phone text, p_address text, p_latitude double precision, p_longitude double precision, p_logo_url text, p_banner_url text, p_food_categories text[], p_open_time time without time zone, p_close_time time without time zone, p_is_open boolean)\n RETURNS TABLE(id uuid, owner_user_id uuid, name text, description text, phone text, address text, logo_url text, banner_url text, rating real, total_ratings integer, status merchant_status, commission_rate real, food_categories text[], open_time time without time zone, close_time time without time zone, is_open boolean, created_at timestamp with time zone, updated_at timestamp with time zone, deleted_at timestamp with time zone, latitude double precision, longitude double precision)\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\nDECLARE\r\n  v_new_id UUID := gen_random_uuid();\r\nBEGIN\r\n  INSERT INTO stores (\r\n    id, owner_user_id, name, description, phone, address,\r\n    location, logo_url, banner_url, food_categories,\r\n    open_time, close_time, is_open\r\n  ) VALUES (\r\n    v_new_id, p_owner_user_id, p_name, p_description, p_phone, p_address,\r\n    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,\r\n    p_logo_url, p_banner_url, p_food_categories,\r\n    p_open_time, p_close_time, p_is_open\r\n  );\r\n\r\n  RETURN QUERY\r\n  SELECT\r\n    s.id, s.owner_user_id, s.name, s.description, s.phone, s.address,\r\n    s.logo_url, s.banner_url, s.rating, s.total_ratings,\r\n    s.status, s.commission_rate, s.food_categories, s.open_time,\r\n    s.close_time, s.is_open, s.created_at, s.updated_at, s.deleted_at,\r\n    s.latitude, s.longitude\r\n  FROM stores s\r\n  WHERE s.id = v_new_id;\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "expire_stale_surprise_bags",
    "definition": "CREATE OR REPLACE FUNCTION public.expire_stale_surprise_bags()\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n  UPDATE public.surprise_bags\n  SET is_available = false,\n      updated_at = NOW()\n  WHERE is_available = true\n    AND expires_at <= NOW()\n    AND deleted_at IS NULL;\nEND;\n$function$\n"
  },
  {
    "function_name": "expire_unpaid_orders",
    "definition": "CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nDECLARE\n  v_order RECORD;\nBEGIN\n  FOR v_order IN\n    SELECT id FROM public.orders\n    WHERE status = 'pending'::order_status\n      AND payment_status = 'pending'::payment_status\n      AND created_at < NOW() - INTERVAL '15 minutes'\n      AND deleted_at IS NULL\n  LOOP\n    BEGIN\n      PERFORM transition_order_status_transaction(\n        v_order.id,\n        'cancelled',\n        '00000000-0000-0000-0000-000000000000'::uuid,\n        'system'\n      );\n    EXCEPTION WHEN OTHERS THEN\n      -- Log notice and continue so one failing order does not block others\n      RAISE NOTICE 'Failed to cancel unpaid order %: %', v_order.id, SQLERRM;\n    END;\n  END LOOP;\nEND;\n$function$\n"
  },
  {
    "function_name": "get_store_by_owner",
    "definition": "CREATE OR REPLACE FUNCTION public.get_store_by_owner(p_owner_user_id uuid)\n RETURNS TABLE(id uuid, owner_user_id uuid, name text, description text, phone text, address text, logo_url text, banner_url text, rating real, total_ratings integer, status merchant_status, commission_rate real, food_categories text[], open_time time without time zone, close_time time without time zone, is_open boolean, created_at timestamp with time zone, updated_at timestamp with time zone, deleted_at timestamp with time zone, latitude double precision, longitude double precision)\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT\r\n    s.id,\r\n    s.owner_user_id,\r\n    s.name,\r\n    s.description,\r\n    s.phone,\r\n    s.address,\r\n    s.logo_url,\r\n    s.banner_url,\r\n    s.rating,\r\n    s.total_ratings,\r\n    s.status,\r\n    s.commission_rate,\r\n    s.food_categories,\r\n    s.open_time,\r\n    s.close_time,\r\n    s.is_open,\r\n    s.created_at,\r\n    s.updated_at,\r\n    s.deleted_at,\r\n    s.latitude,\r\n    s.longitude\r\n  FROM stores s\r\n  WHERE s.owner_user_id = p_owner_user_id\r\n    AND s.deleted_at IS NULL\r\n  LIMIT 1;\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "is_store_owner",
    "definition": "CREATE OR REPLACE FUNCTION public.is_store_owner(p_user_id uuid, p_store_id uuid)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nBEGIN\n    RETURN EXISTS (\n        SELECT 1 FROM public.stores\n        WHERE id = p_store_id \n          AND owner_user_id = p_user_id\n          AND deleted_at IS NULL\n    );\nEND;\n$function$\n"
  },
  {
    "function_name": "list_bags_nearby",
    "definition": "CREATE OR REPLACE FUNCTION public.list_bags_nearby(p_lat double precision, p_lng double precision, p_radius integer DEFAULT 5000, p_category text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)\n RETURNS TABLE(id uuid, store_id uuid, name text, description text, original_price integer, discount_price integer, category bag_category, image_url text, quantity integer, max_quantity integer, pickup_start time without time zone, pickup_end time without time zone, is_daily boolean, is_available boolean, created_at timestamp with time zone, updated_at timestamp with time zone, expires_at timestamp with time zone, deleted_at timestamp with time zone, store_name text, store_logo_url text, store_address text, latitude double precision, longitude double precision, distance_m double precision, total_count bigint)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nDECLARE\n  v_offset INTEGER;\n  v_point  GEOGRAPHY(Point, 4326);\n  v_total  BIGINT;\nBEGIN\n  v_offset := (p_page - 1) * p_limit;\n  v_point  := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;\n\n  -- Get total count\n  SELECT COUNT(*) INTO v_total\n  FROM surprise_bags b\n  INNER JOIN stores s ON s.id = b.store_id\n  WHERE b.deleted_at IS NULL\n    AND b.is_available = true\n    AND b.quantity > 0\n    AND b.expires_at > NOW()\n    AND s.deleted_at IS NULL\n    AND s.status = 'active'\n    AND ST_DWithin(s.location, v_point, p_radius)\n    AND (p_category IS NULL OR b.category::TEXT = p_category);\n\n  RETURN QUERY\n  SELECT\n    b.id,\n    b.store_id,\n    b.name,\n    b.description,\n    b.original_price,\n    b.discount_price,\n    b.category,\n    b.image_url,\n    b.quantity,\n    b.max_quantity,\n    b.pickup_start,\n    b.pickup_end,\n    b.is_daily,\n    b.is_available,\n    b.created_at,\n    b.updated_at,\n    b.expires_at,\n    b.deleted_at,\n    s.name AS store_name,\n    s.logo_url AS store_logo_url,\n    s.address AS store_address,\n    s.latitude,\n    s.longitude,\n    ST_Distance(s.location, v_point) AS distance_m,\n    v_total AS total_count\n  FROM surprise_bags b\n  INNER JOIN stores s ON s.id = b.store_id\n  WHERE b.deleted_at IS NULL\n    AND b.is_available = true\n    AND b.quantity > 0\n    AND b.expires_at > NOW()\n    AND s.deleted_at IS NULL\n    AND s.status = 'active'\n    AND ST_DWithin(s.location, v_point, p_radius)\n    AND (p_category IS NULL OR b.category::TEXT = p_category)\n  ORDER BY ST_Distance(s.location, v_point) ASC\n  LIMIT p_limit\n  OFFSET v_offset;\nEND;\n$function$\n"
  },
  {
    "function_name": "list_stores_nearby",
    "definition": "CREATE OR REPLACE FUNCTION public.list_stores_nearby(p_lat double precision, p_lng double precision, p_radius integer DEFAULT 5000, p_category text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)\n RETURNS TABLE(id uuid, owner_user_id uuid, name text, description text, phone text, address text, logo_url text, banner_url text, rating real, total_ratings integer, status merchant_status, commission_rate real, food_categories text[], open_time time without time zone, close_time time without time zone, is_open boolean, created_at timestamp with time zone, updated_at timestamp with time zone, deleted_at timestamp with time zone, latitude double precision, longitude double precision, distance_m double precision, total_count bigint)\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\nDECLARE\r\n  v_offset INTEGER;\r\n  v_point  GEOGRAPHY(Point, 4326);\r\n  v_total  BIGINT;\r\nBEGIN\r\n  v_offset := (p_page - 1) * p_limit;\r\n  v_point  := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;\r\n\r\n  -- Get total count (unfiltered by category for pagination meta)\r\n  SELECT COUNT(*) INTO v_total\r\n  FROM stores\r\n  WHERE stores.deleted_at IS NULL\r\n    AND stores.status = 'active'\r\n    AND ST_DWithin(stores.location, v_point, p_radius)\r\n    AND (p_category IS NULL OR p_category = ANY(stores.food_categories));\r\n\r\n  RETURN QUERY\r\n  SELECT\r\n    s.id,\r\n    s.owner_user_id,\r\n    s.name,\r\n    s.description,\r\n    s.phone,\r\n    s.address,\r\n    s.logo_url,\r\n    s.banner_url,\r\n    s.rating,\r\n    s.total_ratings,\r\n    s.status,\r\n    s.commission_rate,\r\n    s.food_categories,\r\n    s.open_time,\r\n    s.close_time,\r\n    s.is_open,\r\n    s.created_at,\r\n    s.updated_at,\r\n    s.deleted_at,\r\n    s.latitude,\r\n    s.longitude,\r\n    ST_Distance(s.location, v_point) AS distance_m,\r\n    v_total AS total_count\r\n  FROM stores s\r\n  WHERE s.deleted_at IS NULL\r\n    AND s.status = 'active'\r\n    AND ST_DWithin(s.location, v_point, p_radius)\r\n    AND (p_category IS NULL OR p_category = ANY(s.food_categories))\r\n  ORDER BY ST_Distance(s.location, v_point) ASC\r\n  LIMIT p_limit\r\n  OFFSET v_offset;\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "transition_order_status_transaction",
    "definition": "CREATE OR REPLACE FUNCTION public.transition_order_status_transaction(p_order_id uuid, p_target_status text, p_actor_id uuid, p_actor_role text)\n RETURNS jsonb\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_current_status TEXT;\n  v_customer_id UUID;\n  v_store_id UUID;\n  v_created_at TIMESTAMPTZ;\n  v_pickup_time TIMESTAMPTZ;\n  v_payment_method TEXT;\n  v_payment_status TEXT;\n  v_voucher_code TEXT;\n  v_item RECORD;\n  v_owns_store BOOLEAN;\n  v_updated_status TEXT;\n  v_updated_payment_status TEXT;\n  v_completed_at TIMESTAMPTZ;\nBEGIN\n  -- 1. Lock the order row and fetch details\n  SELECT status, customer_id, store_id, created_at, pickup_time, payment_method, payment_status, voucher_code, completed_at\n  INTO v_current_status, v_customer_id, v_store_id, v_created_at, v_pickup_time, v_payment_method, v_payment_status, v_voucher_code, v_completed_at\n  FROM public.orders\n  WHERE id = p_order_id AND deleted_at IS NULL\n  FOR UPDATE;\n\n  IF NOT FOUND THEN\n    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING DETAIL = p_order_id::TEXT;\n  END IF;\n\n  -- 2. Check duplicate transition\n  IF v_current_status = p_target_status THEN\n    RAISE EXCEPTION 'DUPLICATE_TRANSITION' USING DETAIL = p_target_status;\n  END IF;\n\n  -- 3. Check transition validity in the state machine\n  IF v_current_status = 'pending' AND p_target_status NOT IN ('confirmed', 'cancelled') THEN\n    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;\n  ELSIF v_current_status = 'confirmed' AND p_target_status NOT IN ('preparing', 'cancelled') THEN\n    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;\n  ELSIF v_current_status = 'preparing' AND p_target_status NOT IN ('ready_for_pickup', 'cancelled') THEN\n    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;\n  ELSIF v_current_status = 'ready_for_pickup' AND p_target_status NOT IN ('picked_up', 'cancelled') THEN\n    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;\n  ELSIF v_current_status = 'picked_up' AND p_target_status != 'completed' THEN\n    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;\n  ELSIF v_current_status = 'completed' AND p_target_status != 'refund_requested' THEN\n    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;\n  ELSIF v_current_status = 'refund_requested' AND p_target_status NOT IN ('refunded', 'completed') THEN\n    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;\n  ELSIF v_current_status IN ('cancelled', 'refunded') THEN\n    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;\n  END IF;\n\n  -- 4. Check RBAC & Ownership\n  IF p_actor_role = 'admin' OR p_actor_role = 'system' THEN\n    -- Admin & System can perform transitions\n  ELSIF p_actor_role = 'customer' THEN\n    IF p_actor_id != v_customer_id THEN\n      RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Not order owner';\n    END IF;\n\n    IF p_target_status = 'cancelled' THEN\n      IF v_current_status NOT IN ('pending', 'confirmed', 'preparing') THEN\n        RAISE EXCEPTION 'INVALID_CANCEL_STATE' USING DETAIL = v_current_status;\n      END IF;\n    ELSIF p_target_status = 'refund_requested' THEN\n      IF v_current_status != 'completed' THEN\n        RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = v_current_status;\n      END IF;\n      -- Precondition: within 24h\n      IF NOW() > v_created_at + INTERVAL '24 hours' THEN\n        RAISE EXCEPTION 'REFUND_TIMEOUT' USING DETAIL = v_created_at::TEXT;\n      END IF;\n    ELSE\n      RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Customers cannot perform this transition';\n    END IF;\n\n  ELSIF p_actor_role = 'merchant' THEN\n    -- Validate merchant owns the store of this order\n    SELECT EXISTS (\n      SELECT 1 FROM public.stores\n      WHERE id = v_store_id AND owner_user_id = p_actor_id AND deleted_at IS NULL\n    ) INTO v_owns_store;\n\n    IF NOT v_owns_store THEN\n      RAISE EXCEPTION 'FORBIDDEN_STORE' USING DETAIL = v_store_id::TEXT;\n    END IF;\n\n    IF p_target_status = 'cancelled' THEN\n      IF v_current_status NOT IN ('pending', 'confirmed', 'preparing') THEN\n        RAISE EXCEPTION 'INVALID_CANCEL_STATE' USING DETAIL = v_current_status;\n      END IF;\n    ELSIF p_target_status IN ('preparing', 'ready_for_pickup', 'picked_up', 'completed') THEN\n      -- Valid merchant lifecycle updates\n    ELSE\n      RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Merchants cannot perform this transition';\n    END IF;\n  ELSE\n    RAISE EXCEPTION 'UNAUTHORIZED' USING DETAIL = p_actor_role;\n  END IF;\n\n  -- 5. Additional Precondition Check for ready_for_pickup -> cancelled (Expiry System check)\n  IF v_current_status = 'ready_for_pickup' AND p_target_status = 'cancelled' THEN\n    -- Expiry cancel by system/merchant/admin\n  END IF;\n\n  -- 6. Apply side effects\n  v_updated_status := p_target_status;\n  v_updated_payment_status := v_payment_status;\n  v_completed_at := v_completed_at;\n\n  -- Picked up transitions completions\n  IF p_target_status = 'completed' THEN\n    v_completed_at := NOW();\n  END IF;\n\n  -- If status is cancelled, restore bag quantities\n  IF p_target_status = 'cancelled' THEN\n    FOR v_item IN SELECT bag_id, quantity FROM public.order_items WHERE order_id = p_order_id AND deleted_at IS NULL LOOP\n      UPDATE public.surprise_bags\n      SET quantity = quantity + v_item.quantity,\n          updated_at = NOW()\n      WHERE id = v_item.bag_id;\n    END LOOP;\n\n    -- Decrement voucher used count if code was applied\n    IF v_voucher_code IS NOT NULL AND v_voucher_code != '' THEN\n      UPDATE public.vouchers\n      SET used_count = GREATEST(0, used_count - 1),\n          updated_at = NOW()\n      WHERE code = v_voucher_code AND deleted_at IS NULL;\n    END IF;\n\n    -- If online payment was successful, refund it\n    IF v_payment_method != 'cash' AND v_payment_status = 'success' THEN\n      v_updated_payment_status := 'refunded';\n    END IF;\n  END IF;\n\n  -- If status transitions to refunded, update payment status\n  IF p_target_status = 'refunded' THEN\n    v_updated_payment_status := 'refunded';\n  END IF;\n\n  -- Update order row\n  UPDATE public.orders\n  SET status = v_updated_status::order_status,\n      payment_status = v_updated_payment_status::payment_status,\n      completed_at = v_completed_at,\n      updated_at = NOW()\n  WHERE id = p_order_id;\n\n  RETURN json_build_object(\n    'success', true,\n    'order_id', p_order_id,\n    'status', v_updated_status,\n    'payment_status', v_updated_payment_status\n  );\nEND;\n$function$\n"
  },
  {
    "function_name": "update_store_location_and_fields",
    "definition": "CREATE OR REPLACE FUNCTION public.update_store_location_and_fields(p_owner_user_id uuid, p_latitude double precision, p_longitude double precision, p_updates jsonb)\n RETURNS TABLE(id uuid, owner_user_id uuid, name text, description text, phone text, address text, logo_url text, banner_url text, rating real, total_ratings integer, status merchant_status, commission_rate real, food_categories text[], open_time time without time zone, close_time time without time zone, is_open boolean, created_at timestamp with time zone, updated_at timestamp with time zone, deleted_at timestamp with time zone, latitude double precision, longitude double precision)\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\nDECLARE\r\n  v_store_id UUID;\r\nBEGIN\r\n  SELECT id INTO v_store_id\r\n  FROM stores\r\n  WHERE owner_user_id = p_owner_user_id AND deleted_at IS NULL\r\n  FOR UPDATE;\r\n\r\n  IF NOT FOUND THEN\r\n    RETURN;\r\n  END IF;\r\n\r\n  -- Update location\r\n  UPDATE stores\r\n  SET location = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,\r\n      updated_at = NOW()\r\n  WHERE id = v_store_id;\r\n\r\n  -- Update other fields from JSONB payload\r\n  IF p_updates ? 'name' THEN\r\n    UPDATE stores SET name = (p_updates->>'name'), updated_at = NOW() WHERE id = v_store_id;\r\n  END IF;\r\n  IF p_updates ? 'description' THEN\r\n    UPDATE stores SET description = (p_updates->>'description'), updated_at = NOW() WHERE id = v_store_id;\r\n  END IF;\r\n  IF p_updates ? 'phone' THEN\r\n    UPDATE stores SET phone = (p_updates->>'phone'), updated_at = NOW() WHERE id = v_store_id;\r\n  END IF;\r\n  IF p_updates ? 'address' THEN\r\n    UPDATE stores SET address = (p_updates->>'address'), updated_at = NOW() WHERE id = v_store_id;\r\n  END IF;\r\n  IF p_updates ? 'logo_url' THEN\r\n    UPDATE stores SET logo_url = (p_updates->>'logo_url'), updated_at = NOW() WHERE id = v_store_id;\r\n  END IF;\r\n  IF p_updates ? 'banner_url' THEN\r\n    UPDATE stores SET banner_url = (p_updates->>'banner_url'), updated_at = NOW() WHERE id = v_store_id;\r\n  END IF;\r\n  IF p_updates ? 'food_categories' THEN\r\n    UPDATE stores SET food_categories = ARRAY(SELECT jsonb_array_elements_text(p_updates->'food_categories')), updated_at = NOW() WHERE id = v_store_id;\r\n  END IF;\r\n  IF p_updates ? 'open_time' THEN\r\n    UPDATE stores SET open_time = (p_updates->>'open_time')::TIME, updated_at = NOW() WHERE id = v_store_id;\r\n  END IF;\r\n  IF p_updates ? 'close_time' THEN\r\n    UPDATE stores SET close_time = (p_updates->>'close_time')::TIME, updated_at = NOW() WHERE id = v_store_id;\r\n  END IF;\r\n  IF p_updates ? 'is_open' THEN\r\n    UPDATE stores SET is_open = (p_updates->>'is_open')::BOOLEAN, updated_at = NOW() WHERE id = v_store_id;\r\n  END IF;\r\n\r\n  RETURN QUERY\r\n  SELECT\r\n    s.id, s.owner_user_id, s.name, s.description, s.phone, s.address,\r\n    s.logo_url, s.banner_url, s.rating, s.total_ratings,\r\n    s.status, s.commission_rate, s.food_categories, s.open_time,\r\n    s.close_time, s.is_open, s.created_at, s.updated_at, s.deleted_at,\r\n    s.latitude, s.longitude\r\n  FROM stores s\r\n  WHERE s.id = v_store_id;\r\nEND;\r\n$function$\n"
  }
]
```
