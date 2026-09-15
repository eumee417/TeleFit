-- ============================================================
-- telefit DB 전체 스키마 (최종본)
-- 반영된 수정사항:
--   - handsets.device_category 추가 (smartphone/watch/tablet)
--   - handset_subsidies: plan_id(FK) -> min_plan_fee(요금제 구간 하한)
--   - terms_documents.embedding: VECTOR(768) (ko-sroberta-multitask 기준)
--   - pgvector 확장 + HNSW 인덱스
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ── Tables ────────────────────────────────────────────────

CREATE TABLE "carriers" (
	"carrier_id"	SERIAL		NOT NULL,
	"carrier_name"	VARCHAR(50)		NOT NULL,
	"carrier_type"	VARCHAR(10)		NOT NULL,
	"created_at"	TIMESTAMPTZ	DEFAULT now()	NOT NULL
);

CREATE TABLE "plans" (
	"plan_id"	SERIAL		NOT NULL,
	"carrier_id"	INT		NOT NULL,
	"plan_name"	VARCHAR(100)		NOT NULL,
	"base_fee"	INT		NOT NULL,
	"data_gb"	INT	DEFAULT 0	NOT NULL,
	"data_allowance"	VARCHAR(50)		NULL,
	"voice_allowance"	VARCHAR(50)		NULL,
	"selective_discount_eligible"	BOOLEAN	DEFAULT true	NOT NULL,
	"created_at"	TIMESTAMPTZ	DEFAULT now()	NOT NULL
);

CREATE TABLE "handsets" (
	"handset_id"	SERIAL		NOT NULL,
	"model_name"	VARCHAR(100)		NOT NULL,
	"manufacturer"	VARCHAR(50)		NOT NULL,
	"device_category"	VARCHAR(20)	DEFAULT 'smartphone'	NOT NULL,
	"release_price"	INT		NOT NULL,
	"created_at"	TIMESTAMPTZ	DEFAULT now()	NOT NULL
);
-- device_category 값: 'smartphone' | 'watch' | 'tablet'

CREATE TABLE "handset_subsidies" (
	"subsidy_id"	SERIAL		NOT NULL,
	"handset_id"	INT		NOT NULL,
	"carrier_id"	INT		NOT NULL,
	"join_type"	VARCHAR(10)		NOT NULL,
	"min_plan_fee"	INT	DEFAULT 0	NOT NULL,
	"public_subsidy"	INT	DEFAULT 0	NOT NULL,
	"transfer_subsidy"	INT	DEFAULT 0	NOT NULL,
	"updated_at"	TIMESTAMPTZ	DEFAULT now()	NOT NULL
);
-- join_type 값: 'UPGRADE'(기변) | 'MNP'(번호이동)
-- min_plan_fee: 이 지원금을 받기 위한 요금제 월정액 최소 기준(이상).
--   조회 로직: handset_id+carrier_id+join_type 중 min_plan_fee <= plan.base_fee
--   를 만족하는 행 중 min_plan_fee가 가장 큰 행 선택.

CREATE TABLE "combine_types" (
	"combine_type_id"	SERIAL		NOT NULL,
	"type_name"	VARCHAR(50)		NOT NULL,
	"description"	VARCHAR(255)		NULL
);

CREATE TABLE "combine_products" (
	"combine_product_id"	SERIAL		NOT NULL,
	"carrier_id"	INT		NOT NULL,
	"combine_type_id"	INT		NOT NULL,
	"product_name"	VARCHAR(100)		NOT NULL,
	"created_at"	TIMESTAMPTZ	DEFAULT now()	NOT NULL
);

CREATE TABLE "combine_discount_tiers" (
	"tier_id"	SERIAL		NOT NULL,
	"combine_product_id"	INT		NOT NULL,
	"min_line_count"	INT		NOT NULL,
	"max_line_count"	INT		NULL,
	"discount_type"	VARCHAR(10)	DEFAULT 'RATE'	NOT NULL,
	"discount_rate"	NUMERIC(4,3)		NULL,
	"discount_amount"	INT	DEFAULT 0	NOT NULL
);

CREATE TABLE "devices" (
	"device_id"	SERIAL		NOT NULL,
	"device_type"	VARCHAR(30)		NOT NULL,
	"device_plan_name"	VARCHAR(100)		NOT NULL,
	"device_fee"	INT		NOT NULL,
	"carrier_id"	INT		NOT NULL
);

CREATE TABLE "combine_rules" (
	"rule_id"	SERIAL		NOT NULL,
	"combine_product_id"	INT		NOT NULL,
	"rule_type"	VARCHAR(20)	DEFAULT 'ELIGIBILITY'	NOT NULL,
	"condition_field"	VARCHAR(50)		NOT NULL,
	"condition_operator"	VARCHAR(5)		NOT NULL,
	"condition_value"	VARCHAR(100)		NOT NULL,
	"effect_description"	VARCHAR(255)		NOT NULL
);

CREATE TABLE "terms_documents" (
	"term_id"	SERIAL		NOT NULL,
	"carrier_id"	INT		NULL,
	"combine_product_id"	INT		NULL,
	"content"	TEXT		NOT NULL,
	"embedding"	VECTOR(768)		NULL,
	"created_at"	TIMESTAMPTZ	DEFAULT now()	NOT NULL
);

-- ── Primary Keys ──────────────────────────────────────────

ALTER TABLE "carriers" ADD CONSTRAINT "PK_CARRIERS" PRIMARY KEY ("carrier_id");
ALTER TABLE "plans" ADD CONSTRAINT "PK_PLANS" PRIMARY KEY ("plan_id");
ALTER TABLE "handsets" ADD CONSTRAINT "PK_HANDSETS" PRIMARY KEY ("handset_id");
ALTER TABLE "handset_subsidies" ADD CONSTRAINT "PK_HANDSET_SUBSIDIES" PRIMARY KEY ("subsidy_id");
ALTER TABLE "combine_types" ADD CONSTRAINT "PK_COMBINE_TYPES" PRIMARY KEY ("combine_type_id");
ALTER TABLE "combine_products" ADD CONSTRAINT "PK_COMBINE_PRODUCTS" PRIMARY KEY ("combine_product_id");
ALTER TABLE "combine_discount_tiers" ADD CONSTRAINT "PK_COMBINE_DISCOUNT_TIERS" PRIMARY KEY ("tier_id");
ALTER TABLE "devices" ADD CONSTRAINT "PK_DEVICES" PRIMARY KEY ("device_id");
ALTER TABLE "combine_rules" ADD CONSTRAINT "PK_COMBINE_RULES" PRIMARY KEY ("rule_id");
ALTER TABLE "terms_documents" ADD CONSTRAINT "PK_TERMS_DOCUMENTS" PRIMARY KEY ("term_id");

-- ── Foreign Keys ──────────────────────────────────────────

ALTER TABLE "plans" ADD CONSTRAINT "FK_carriers_TO_plans_1" FOREIGN KEY ("carrier_id") REFERENCES "carriers" ("carrier_id");
ALTER TABLE "handset_subsidies" ADD CONSTRAINT "FK_handsets_TO_handset_subsidies_1" FOREIGN KEY ("handset_id") REFERENCES "handsets" ("handset_id");
ALTER TABLE "handset_subsidies" ADD CONSTRAINT "FK_carriers_TO_handset_subsidies_1" FOREIGN KEY ("carrier_id") REFERENCES "carriers" ("carrier_id");
ALTER TABLE "combine_products" ADD CONSTRAINT "FK_carriers_TO_combine_products_1" FOREIGN KEY ("carrier_id") REFERENCES "carriers" ("carrier_id");
ALTER TABLE "combine_products" ADD CONSTRAINT "FK_combine_types_TO_combine_products_1" FOREIGN KEY ("combine_type_id") REFERENCES "combine_types" ("combine_type_id");
ALTER TABLE "combine_discount_tiers" ADD CONSTRAINT "FK_combine_products_TO_combine_discount_tiers_1" FOREIGN KEY ("combine_product_id") REFERENCES "combine_products" ("combine_product_id");
ALTER TABLE "devices" ADD CONSTRAINT "FK_carriers_TO_devices_1" FOREIGN KEY ("carrier_id") REFERENCES "carriers" ("carrier_id");
ALTER TABLE "combine_rules" ADD CONSTRAINT "FK_combine_products_TO_combine_rules_1" FOREIGN KEY ("combine_product_id") REFERENCES "combine_products" ("combine_product_id");
ALTER TABLE "terms_documents" ADD CONSTRAINT "FK_carriers_TO_terms_documents_1" FOREIGN KEY ("carrier_id") REFERENCES "carriers" ("carrier_id");
ALTER TABLE "terms_documents" ADD CONSTRAINT "FK_combine_products_TO_terms_documents_1" FOREIGN KEY ("combine_product_id") REFERENCES "combine_products" ("combine_product_id");

-- ── Indexes ───────────────────────────────────────────────

CREATE INDEX "idx_terms_documents_embedding_hnsw"
  ON "terms_documents"
  USING hnsw ("embedding" vector_cosine_ops);