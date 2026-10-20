# Final run

Complete sequence on 2026-10-20, from `docker compose -p terra down -v`, on a
MacBook (Darwin arm64) running Docker 29.5.2 inside colima with 4 CPUs and
6 GB. Terminal output pasted as is. `bench.sh --cold` removes the postgres:16
image first so the pull is included; it rewrote `pg/bench.txt` with this single
run, and the committed `bench.txt` (median of three cold runs, 29 s) was
restored afterwards with `git checkout`. This run uses the two-step subscriber
migrations for events 05 and 08 (see events-observed.md); the subscriber
logged zero errors.

```
$ docker compose -p terra down -v
Container terra-subscriber Removed 
Container terra-postgres Removed 
Volume terra_terra_subdata Removed 
Volume terra_terra_pgdata Removed 
Network terra_default Removed 

$ ./bench.sh --cold
run 1: image_pull=24 seed_loaded=3 subscriber_synced=4 verify_pass=0 total=31
wrote bench.txt:
# pg/bench.txt is written by pg/bench.sh; do not edit by hand.
# median of 1 run(s) on 2026-10-20T22:09:43Z, Darwin arm64, docker 29.5.2, image pulled
# run: 24 3 4 0 31
image_pull 24
seed_loaded 3
subscriber_synced 4
verify_pass 0
total 31

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               150        150     7  ok
observations         1430       1430     5  ok
watering_holes         12         12     6  ok
verify: PASS (3 tables match, 1 attempt(s))

$ python3 stream.py --rate 10 &

$ events/apply.sh 1
### event 01: Event 01: Weigh-in
== subscriber (before-publisher): 01_add_weight_column.sql
== source: 01_add_weight_column.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               153        153     8  ok
observations         1468       1468     5  ok
watering_holes         12         12     6  ok
verify: PASS (3 tables match, 1 attempt(s))

$ events/apply.sh 2
### event 02: Event 02: A pangolin is sighted
== subscriber (before-publisher): 02_add_enum_value.sql
== source: 02_add_enum_value.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               154        154     8  ok
observations         1468       1468     5  ok
watering_holes         12         12     6  ok
verify: PASS (3 tables match, 1 attempt(s))

$ events/apply.sh 3
### event 03: Event 03: The herd outgrows int
== subscriber (before-publisher): 03_widen_animal_id.sql
== source: 03_widen_animal_id.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               157        157     8  ok
observations         1474       1474     5  ok
watering_holes         12         12     6  ok
verify: PASS (3 tables match, 1 attempt(s))

$ events/apply.sh 4
### event 04: Event 04: The collars come online
== subscriber (before-publisher): 04_collar_pings_table.sql
== source: 04_collar_pings_table.sql
== subscriber (after-publisher): 04_collar_pings_table.sql

$ python3 verify.py --wait 120
verify: waiting, 1 table(s) not matched yet: collar_pings
table            src rows   dst rows  cols  status
animals               157        157     8  ok
collar_pings           18         18     7  ok
observations         1487       1487     5  ok
watering_holes         12         12     6  ok
verify: PASS (4 tables match, 2 attempt(s))

$ events/apply.sh 5
### event 05: Event 05: The naming committee
== subscriber (before-publisher): 05_rename_name_column.sql
== source: 05_rename_name_column.sql
== subscriber caught up to 0/1AFFBA8
== subscriber (after-catchup): 05_rename_name_column.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               158        158     8  ok
collar_pings           19         19     7  ok
observations         1491       1491     5  ok
watering_holes         12         12     6  ok
verify: PASS (4 tables match, 1 attempt(s))

$ events/apply.sh 6
### event 06: Event 06: Rangers file structured reports
== subscriber (before-publisher): 06_field_report_jsonb.sql
== source: 06_field_report_jsonb.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               158        158     8  ok
collar_pings           24         24     7  ok
observations         1494       1494     6  ok
watering_holes         12         12     6  ok
verify: PASS (4 tables match, 1 attempt(s))

$ events/apply.sh 7
### event 07: Event 07: Survey adds elevation
== subscriber (before-publisher): 07_elevation_not_null_default.sql
== source: 07_elevation_not_null_default.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               158        158     8  ok
collar_pings           24         24     7  ok
observations         1494       1494     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 1 attempt(s))

$ events/apply.sh 8
### event 08: Event 08: Status moves to the collars
== subscriber (before-publisher): 08_drop_status_column.sql
== source: 08_drop_status_column.sql
== subscriber caught up to 0/1B07A78
== subscriber (after-catchup): 08_drop_status_column.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               159        159     7  ok
collar_pings           27         27     7  ok
observations         1498       1498     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 1 attempt(s))

$ tail -2 stream.log
stream: tick    13  10 ops  totals obs+77 obs-10 animal+7 animal~21 ping+15
stream: stopped after 13 ticks  totals obs+77 obs-10 animal+7 animal~21 ping+15

$ python3 verify.py --wait 120   # stream stopped
table            src rows   dst rows  cols  status
animals               159        159     7  ok
collar_pings           27         27     7  ok
observations         1498       1498     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 1 attempt(s))

$ psql $SUB_DSN -f queries.sql
-- 1. observations per watering hole
  watering_hole  |          region          | observations 
-----------------+--------------------------+--------------
 Baobab Dam      | Kruger, South Africa     |          185
 Ochre Seep      | Etosha, Namibia          |          166
 Thornbush Pan   | Hluhluwe, South Africa   |          160
 Acacia Pan      | Maasai Mara, Kenya       |          138
 Reed Lagoon     | Okavango Delta, Botswana |          130
 Dawn Pool       | Hwange, Zimbabwe         |          124
 Mopane Crossing | Chobe, Botswana          |          121
 Elephant Spring | Amboseli, Kenya          |          113
 Riverbend Pool  | South Luangwa, Zambia    |          107
 Crater Basin    | Ngorongoro, Tanzania     |           91
 Kopje Pool      | Serengeti, Tanzania      |           91
 Miombo Spring   | Kafue, Zambia            |           72
(12 rows)

-- 2. verified field reports per ranger (event 06)
 ranger | reports | verified | usual_weather 
--------+---------+----------+---------------
 A.M.   |      26 |       26 | clear
 S.P.   |       3 |        0 | clear
 L.O.   |       2 |        0 | light rain
 R.K.   |       1 |        1 | light rain
(4 rows)

-- 3. latest collar ping per animal (events 04, 05, 07)
    display_name     |     species     |     near      | elevation_m |           pinged_at           | battery_pct 
---------------------+-----------------+---------------+-------------+-------------------------------+-------------
 Lulu #8             | impala          | Crater Basin  |        1700 | 2026-10-20 22:09:56.449108+00 |          73
 Jabari              | elephant        | Crater Basin  |        1700 | 2026-10-20 22:09:56.449108+00 |          36
 Duma #113           | plains_zebra    | Dawn Pool     |        1000 | 2026-10-20 22:09:56.449108+00 |          99
 Moyo #100           | hippopotamus    | Baobab Dam    |         300 | 2026-10-20 22:09:55.448418+00 |          59
 Mosi the Swift #31  | hippopotamus    | Crater Basin  |        1700 | 2026-10-20 22:09:55.448418+00 |          93
 Duma of the Plains  | impala          | Acacia Pan    |        1600 | 2026-10-20 22:09:55.448418+00 |          91
 Mosi the Swift #138 | hippopotamus    | Thornbush Pan |          90 | 2026-10-20 22:09:55.448418+00 |          27
 Duma the Watchful   | blue_wildebeest | Baobab Dam    |         300 | 2026-10-20 22:09:55.448418+00 |          56
 Duma of the Delta   | elephant        | Reed Lagoon   |         950 | 2026-10-20 22:09:54.442845+00 |          76
 Asha of the Delta   | plains_zebra    | Acacia Pan    |        1600 | 2026-10-20 22:09:53.445394+00 |          84
(10 rows)

```
