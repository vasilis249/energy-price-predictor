# HEnEx DAM results files: verified findings (2026-09-24)

- Daily file: `YYYYMMDD_EL-DAM_Results_EN_v##.xlsx`, one sheet `EL-DAM_Results`.
  Automated URL (from HEnEx's own documentation PDF):
  `https://www.enexgroup.gr/documents/20126/200106/YYYYMMDD_EL-DAM_Results_EN_v##.xlsx`
  Only the current year is available there (2026-01-01 onwards at time of writing).
- Columns: TARGET, BIDDING_ZONE_DESCR, SIDE_DESCR, DDAY, ASSET_DESCR, CLASSIFICATION, DELIVERY_MTU,
  DELIVERY_DURATION, SORT, MCP, TOTAL_TRADES, PUB_TIME, VER.
  One MCP per MTU (identical across all asset/classification rows). TOTAL_TRADES gives volumes per
  category (RES, Natural Gas, Lignite, Big Hydro, imports/exports per border, load by voltage).
- **DELIVERY_MTU is Central European time**, and the delivery day is the CET day: on 2026-03-29 the
  labels jump 01:45 -> 03:00 (CET spring-forward), and on 2024-10-27 the 02:00 hour repeats (CET fall-back).
  Use DDAY 00:00 Europe/Brussels + (SORT-1) * DELIVERY_DURATION to get UTC starts; don't parse
  DELIVERY_MTU. An Athens calendar day spans two files (D-1 and D).
- DELIVERY_DURATION is 15 from 2025-10-01 and 60 before (e.g. 2024 files: 23/24/25 rows per day).
- Openpyxl: the files lack a dimension record; load with read_only=False (read_only sees 1x1).
- Yearly archives (zip of daily files, incl. IDA/CRIDA) are on https://www.enexgroup.gr/dam-idm-archive,
  linked by UUID. 2020-2024 are available; the 2025 entry had no download link yet, so 2025 (incl. the
  15-minute switch) needs ENTSO-E or a later archive.
