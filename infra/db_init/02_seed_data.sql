-- ============================================================
-- telefit seed_data.sql (전체 테이블 통합본)
-- 기준 시점: 2026-09-14 스냅샷
--
-- 테이블별 신뢰도:
--   carriers / plans / handsets            : 검증됨 (공식 소스 대조)
--   handset_subsidies                      : 2건만 검증됨, 나머지 의도적 공란
--   combine_types / combine_products       : 통신사당 대표 상품 1개, 실존 상품명 확인
--   combine_discount_tiers                 : SKT/KT만 확정 수치, LGU+는 상품이
--                                             여러 개(U+투게더/참쉬운가족결합/
--                                             신혼플러스 등)라 대표 수치 특정 못함 -> 공란
--   combine_rules                          : 실제 확인된 조건 몇 개만, 전수 아님
--   devices / terms_documents              : 완전히 비어있음 (별도 조사 필요)
-- ============================================================

-- ── carriers ──────────────────────────────────────────────
INSERT INTO "carriers" ("carrier_name", "carrier_type") VALUES
  ('SKT', 'MNO'),
  ('KT', 'MNO'),
  ('LGU+', 'MNO');

-- ── plans: KT (18종, 2026-07-01 개편) ────────────────────────
INSERT INTO "plans" ("carrier_id", "plan_name", "base_fee", "data_gb", "data_allowance", "voice_allowance", "selective_discount_eligible") VALUES
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '초이스130',    130000, 999, '완전무제한(스마트기기 공유 100GB)', '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '초이스 더블',  120000, 999, '완전무제한(스마트기기 공유 90GB)',  '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '초이스110',    110000, 999, '완전무제한(스마트기기 공유 80GB)',  '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '초이스90',      90000, 999, '완전무제한(스마트기기 공유 60GB)',  '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '베이직100',    100000, 999, '완전무제한(스마트기기 공유 70GB)',  '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '베이직80',      80000, 999, '완전무제한(스마트기기 공유 50GB)',  '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '베이직110GB',   69000, 110, '110GB + 소진 후 5Mbps',            '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '베이직90GB',    67000,  90, '90GB + 소진 후 1Mbps',             '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '베이직70GB',    65000,  70, '70GB + 소진 후 1Mbps',             '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '베이직50GB',    63000,  50, '50GB + 소진 후 1Mbps',             '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '베이직30GB',    61000,  30, '30GB + 소진 후 1Mbps',             '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '베이직21GB',    58000,  21, '21GB + 소진 후 1Mbps',             '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '베이직14GB',    55000,  14, '14GB + 소진 후 1Mbps',             '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '베이직10GB',    50000,  10, '10GB + 소진 후 400Kbps',           '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '베이직7GB',     45000,   7, '7GB + 소진 후 400Kbps',            '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '베이직4GB',     37000,   4, '4GB + 소진 후 400Kbps',            '기본제공(300분)',     true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '베이직1.4GB',   33000,   1, '1.4GB + 소진 후 400Kbps',          '기본제공(50분)',      true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), '베이직600MB',   28900,   1, '600MB + 소진 후 400Kbps',          '음성 180분/문자 180건', true);

-- ── plans: SKT (12/16종 확인, 2026-07-01~02 개편) ─────────────
INSERT INTO "plans" ("carrier_id", "plan_name", "base_fee", "data_gb", "data_allowance", "voice_allowance", "selective_discount_eligible") VALUES
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'SKT'), '베스트 Max', 129000, 999, '완전무제한(테더링/공유 140GB)', NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'SKT'), '베스트 Pro', 119000, 999, '완전무제한(테더링/공유 120GB)', NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'SKT'), '베스트 109', 109000, 999, '완전무제한(테더링/공유 100GB)', NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'SKT'), '베스트 99',   99000, 999, '완전무제한(테더링/공유 80GB)',  NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'SKT'), '베스트 89',   89000, 999, '완전무제한(테더링/공유 60GB)',  NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'SKT'), '라이트 79',   79000, 250, '250GB + 소진 후 5Mbps',        NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'SKT'), '라이트 69',   69000, 110, '110GB + 소진 후 5Mbps',        NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'SKT'), '라이트 59',   59000,  24, '24GB + 소진 후 1Mbps',         NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'SKT'), '라이트 55',   55000,  15, '15GB + 소진 후 1Mbps',         NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'SKT'), '라이트 49',   49000,  11, '11GB + 소진 후 400Kbps',       NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'SKT'), '라이트 45',   45000,   8, '8GB + 소진 후 400Kbps',        NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'SKT'), '라이트 39',   39000,   6, '6GB + 소진 후 400Kbps',        NULL, true);
-- ⚠ SKT 라이트 11종 중 7종만 확인. 나머지 4종 + 전 요금제 음성/문자는 T world 재확인 필요.

-- ── plans: LGU+ (18종 전체 확인, 2026-06-01 개편) ─────────────
INSERT INTO "plans" ("carrier_id", "plan_name", "base_fee", "data_gb", "data_allowance", "voice_allowance", "selective_discount_eligible") VALUES
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '플러스플랜130',   130000, 999, '무제한',                 NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '플러스플랜115',   115000, 999, '무제한',                 NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '플러스플랜105',   105000, 999, '무제한',                 NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '플러스플랜95',     95000, 999, '무제한',                 NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '데이터플랜MAX',    85000, 999, '무제한',                 NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '데이터플랜150GB',  75000, 150, '150GB + 소진 후 5Mbps',  NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '데이터플랜125GB',  70000, 125, '125GB + 소진 후 5Mbps',  NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '데이터플랜95GB',   68000,  95, '95GB + 소진 후 3Mbps',   NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '데이터플랜80GB',   66000,  80, '80GB + 소진 후 1Mbps',   NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '데이터플랜50GB',   63000,  50, '50GB + 소진 후 1Mbps',   NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '데이터플랜31GB',   61000,  31, '31GB + 소진 후 1Mbps',   NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '데이터플랜24GB',   59000,  24, '24GB + 소진 후 1Mbps',   NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '데이터플랜14GB',   55000,  14, '14GB + 소진 후 1Mbps',   NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '데이터플랜9GB',    47000,   9, '9GB + 소진 후 400Kbps',  NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '데이터플랜5GB',    37000,   5, '5GB + 소진 후 400Kbps',  NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '데이터플랜1.5GB',  33000,   2, '1.5GB + 소진 후 400Kbps', NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '데이터플랜750MB',  29000,   1, '750MB + 소진 후 400Kbps', NULL, true),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'), '데이터플랜300MB',  28000,   0, '300MB + 소진 후 400Kbps', NULL, true);
-- ⚠ LGU+ 음성/문자 기본 제공량도 출처 표에 없어 NULL. 공식 페이지 확인 필요.

-- ── handsets (9종, 2026-09-14 기준 스냅샷) ────────────────────
INSERT INTO "handsets" ("model_name", "manufacturer", "device_category", "release_price") VALUES
  ('아이폰17 (128GB)',            'Apple',   'smartphone', 1290000),
  ('아이폰17 Pro (256GB)',        'Apple',   'smartphone', 1790000),
  ('아이폰17 Pro Max (256GB)',    'Apple',   'smartphone', 1980000),
  ('갤럭시 S26 (256GB)',          'Samsung', 'smartphone', 1254000),
  ('갤럭시 S26+ (256GB)',         'Samsung', 'smartphone', 1452000),
  ('갤럭시 S26 Ultra (256GB)',    'Samsung', 'smartphone', 1797400),
  ('갤럭시 Z 폴드8',               'Samsung', 'smartphone', 2278000),
  ('갤럭시 워치9 (40mm, 블루투스)', 'Samsung', 'watch',      499000),
  ('애플워치 시리즈11 (42mm, GPS)', 'Apple',   'watch',      599000);
-- ⚠ 갤럭시 S26 시리즈는 2026-10-01부로 전 모델 149,600원 인상 예정 -> 10월 이후 갱신 필요.
-- ⚠ 아이폰18 Pro/ProMax(9/18 국내 출시), 아이폰 듀오(국내 가격 미정)는 가격 미확정으로 제외.

-- ── handset_subsidies: 실제 확인된 2건만 ─────────────────────
INSERT INTO "handset_subsidies" ("handset_id", "carrier_id", "join_type", "min_plan_fee", "public_subsidy", "transfer_subsidy") VALUES
  ((SELECT handset_id FROM handsets WHERE model_name = '갤럭시 S26 Ultra (256GB)'),
   (SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), 'MNP', 90000, 500000, 0),
  ((SELECT handset_id FROM handsets WHERE model_name = '아이폰17 Pro Max (256GB)'),
   (SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'), 'MNP', 90000, 150000, 0);
-- ⚠ 이 2건 외 전부 미수집. 통신사별 공시지원금 조회 페이지에서 확인 후 채워야 함.

-- ── combine_types ─────────────────────────────────────────
INSERT INTO "combine_types" ("type_name", "description") VALUES
  ('모바일 전용 결합', '인터넷 가입 없이 휴대폰 회선끼리만 묶는 결합'),
  ('모바일+인터넷 결합', '인터넷(+IPTV) 회선과 휴대폰 회선을 함께 묶는 결합');

-- ── combine_products: 통신사당 대표 상품 1개 (실존 상품명 확인됨) ──
INSERT INTO "combine_products" ("carrier_id", "combine_type_id", "product_name") VALUES
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'SKT'),
   (SELECT combine_type_id FROM combine_types WHERE type_name = '모바일 전용 결합'),
   '요즘가족결합'),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'KT'),
   (SELECT combine_type_id FROM combine_types WHERE type_name = '모바일+인터넷 결합'),
   '프리미엄 가족결합'),
  ((SELECT carrier_id FROM carriers WHERE carrier_name = 'LGU+'),
   (SELECT combine_type_id FROM combine_types WHERE type_name = '모바일 전용 결합'),
   'U+투게더 결합');
-- ⚠ 각 통신사는 실제로 이 외에도 여러 결합상품을 운영 중(SKT 온가족할인,
--   LGU+ 참쉬운가족결합/신혼플러스/가족무한사랑 등). 대표 상품 1개씩만 우선 등록.

-- ── combine_discount_tiers: SKT/KT만 확정 수치 ────────────────
INSERT INTO "combine_discount_tiers" ("combine_product_id", "min_line_count", "max_line_count", "discount_type", "discount_rate", "discount_amount") VALUES
  ((SELECT combine_product_id FROM combine_products WHERE product_name = '요즘가족결합'),
   1, 5, 'AMOUNT', NULL, 24000),
  ((SELECT combine_product_id FROM combine_products WHERE product_name = '프리미엄 가족결합'),
   2, 5, 'RATE', 0.250, 0);
-- SKT 요즘가족결합: T world 공식 페이지 기준 "휴대폰만 결합 시 최대 할인액 24,000원"
-- KT 프리미엄 가족결합: "2~5회선에 대해 25% 상당 요금할인" (조건: 인터넷+5G 8만원 이상 요금제)
-- ⚠ LGU+ U+투게더는 대표 수치를 특정 못해 tier 데이터 없음(상품별로 갈림).

-- ── combine_rules: 실제 확인된 조건만 (전수 아님) ─────────────
INSERT INTO "combine_rules" ("combine_product_id", "rule_type", "condition_field", "condition_operator", "condition_value", "effect_description") VALUES
  ((SELECT combine_product_id FROM combine_products WHERE product_name = '요즘가족결합'),
   'ELIGIBILITY', 'same_owner_line_count', '<=', '1',
   'SKT 휴대폰 회선은 명의당 1회선만 결합 가능'),
  ((SELECT combine_product_id FROM combine_products WHERE product_name = '프리미엄 가족결합'),
   'ELIGIBILITY', 'plan_base_fee', '>=', '80000',
   '5G 요금제는 월정액 8만원 이상이어야 결합 할인 대상(LTE는 65,890원 이상)');

-- ============================================================
-- 아래 테이블은 의도적으로 비워둠 — 지어내지 않음
--   devices          : 세컨드 디바이스(워치/태블릿) 회선 요금제 가격, 미조사
--   terms_documents  : RAG용 약관 원문 + 임베딩. 임베딩은 SQL이 아니라
--                       파이썬 임베딩 파이프라인에서 별도로 계산/INSERT해야 함
-- ============================================================