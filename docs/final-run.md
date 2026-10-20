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
run 1: image_pull=8 seed_loaded=3 subscriber_synced=4 verify_pass=0 total=15
wrote bench.txt:
# pg/bench.txt is written by pg/bench.sh; do not edit by hand.
# median of 1 run(s) on 2026-10-20T20:47:22Z, Darwin arm64, docker 29.5.2, image pulled
# run: 8 3 4 0 15
image_pull 8
seed_loaded 3
subscriber_synced 4
verify_pass 0
total 15

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
observations         1460       1460     5  ok
watering_holes         12         12     6  ok
verify: PASS (3 tables match, 1 attempt(s))

$ events/apply.sh 2
### event 02: Event 02: A pangolin is sighted
== subscriber (before-publisher): 02_add_enum_value.sql
== source: 02_add_enum_value.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               154        154     8  ok
observations         1460       1460     5  ok
watering_holes         12         12     6  ok
verify: PASS (3 tables match, 1 attempt(s))

$ events/apply.sh 3
### event 03: Event 03: The herd outgrows int
== subscriber (before-publisher): 03_widen_animal_id.sql
== source: 03_widen_animal_id.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               155        155     8  ok
observations         1468       1468     5  ok
watering_holes         12         12     6  ok
verify: PASS (3 tables match, 1 attempt(s))

$ events/apply.sh 4
### event 04: Event 04: The collars come online
== subscriber (before-publisher): 04_collar_pings_table.sql
== source: 04_collar_pings_table.sql
== subscriber (after-publisher): 04_collar_pings_table.sql

$ python3 verify.py --wait 120
verify: waiting, 1 table(s) not matched yet: observations
table            src rows   dst rows  cols  status
animals               155        155     8  ok
collar_pings           18         18     7  ok
observations         1472       1472     5  ok
watering_holes         12         12     6  ok
verify: PASS (4 tables match, 2 attempt(s))

$ events/apply.sh 5
### event 05: Event 05: The naming committee
== subscriber (before-publisher): 05_rename_name_column.sql
== source: 05_rename_name_column.sql
== subscriber caught up to 0/1A8EB68
== subscriber (after-catchup): 05_rename_name_column.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               155        155     8  ok
collar_pings           18         18     7  ok
observations         1478       1478     5  ok
watering_holes         12         12     6  ok
verify: PASS (4 tables match, 1 attempt(s))

$ events/apply.sh 6
### event 06: Event 06: Rangers file structured reports
== subscriber (before-publisher): 06_field_report_jsonb.sql
== source: 06_field_report_jsonb.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               155        155     8  ok
collar_pings           19         19     7  ok
observations         1482       1482     6  ok
watering_holes         12         12     6  ok
verify: PASS (4 tables match, 1 attempt(s))

$ events/apply.sh 7
### event 07: Event 07: Survey adds elevation
== subscriber (before-publisher): 07_elevation_not_null_default.sql
== source: 07_elevation_not_null_default.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               156        156     8  ok
collar_pings           19         19     7  ok
observations         1482       1482     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 1 attempt(s))

$ events/apply.sh 8
### event 08: Event 08: Status moves to the collars
== subscriber (before-publisher): 08_drop_status_column.sql
== source: 08_drop_status_column.sql
== subscriber caught up to 0/1A97BB0
== subscriber (after-catchup): 08_drop_status_column.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               157        157     7  ok
collar_pings           22         22     7  ok
observations         1482       1482     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 1 attempt(s))

$ tail -2 stream.log
stream: tick    14  10 ops  totals obs+81 obs-24 animal+5 animal~19 ping+11
stream: stopped after 14 ticks  totals obs+81 obs-24 animal+5 animal~19 ping+11

$ python3 verify.py --wait 120   # stream stopped
table            src rows   dst rows  cols  status
animals               157        157     7  ok
collar_pings           23         23     7  ok
observations         1488       1488     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 1 attempt(s))

$ psql $SUB_DSN -f queries.sql
-- 1. observations per watering hole
  watering_hole  |          region          | observations 
-----------------+--------------------------+--------------
 Baobab Dam      | Kruger, South Africa     |          182
 Ochre Seep      | Etosha, Namibia          |          164
 Thornbush Pan   | Hluhluwe, South Africa   |          162
 Acacia Pan      | Maasai Mara, Kenya       |          135
 Reed Lagoon     | Okavango Delta, Botswana |          129
 Dawn Pool       | Hwange, Zimbabwe         |          124
 Mopane Crossing | Chobe, Botswana          |          119
 Elephant Spring | Amboseli, Kenya          |          114
 Riverbend Pool  | South Luangwa, Zambia    |          110
 Crater Basin    | Ngorongoro, Tanzania     |           86
 Kopje Pool      | Serengeti, Tanzania      |           86
 Miombo Spring   | Kafue, Zambia            |           77
(12 rows)

-- 2. verified field reports per ranger (event 06)
 ranger | reports | verified | usual_weather 
--------+---------+----------+---------------
 A.M.   |      27 |       26 | clear
 J.T.   |       5 |        3 | dust haze
 D.C.   |       3 |        1 | clear
 L.O.   |       2 |        0 | light rain
 R.K.   |       2 |        2 | overcast
 S.P.   |       1 |        1 | clear
(6 rows)

-- 3. latest collar ping per animal (events 04, 05, 07)
       display_name       |     species      |      near       | elevation_m |           pinged_at           | battery_pct 
--------------------------+------------------+-----------------+-------------+-------------------------------+-------------
 Safi #98                 | common_warthog   | Riverbend Pool  |         550 | 2026-10-20 20:47:36.685903+00 |          94
 Imani #152               | african_wild_dog | Mopane Crossing |         930 | 2026-10-20 20:47:35.682498+00 |          61
 Rafiki of the Plains     | african_buffalo  | Acacia Pan      |        1600 | 2026-10-20 20:47:35.682498+00 |          88
 Rafiki Jr. #119          | lion             | Miombo Spring   |        1050 | 2026-10-20 20:47:35.682498+00 |           6
 Jabari the Watchful #122 | elephant         | Thornbush Pan   |          90 | 2026-10-20 20:47:34.680811+00 |          89
 Imani Jr.                | elephant         | Reed Lagoon     |         950 | 2026-10-20 20:47:32.697295+00 |          13
 Zuri #107                | hippopotamus     | Riverbend Pool  |         550 | 2026-10-20 20:47:32.697295+00 |          71
 Tamu of the Delta        | spotted_hyena    | Riverbend Pool  |         550 | 2026-10-20 20:47:32.697295+00 |          48
 Rafiki Jr.               | blue_wildebeest  | Elephant Spring |        1150 | 2026-10-20 20:47:31.713606+00 |          76
 Mosi #63                 | lion             | Elephant Spring |        1150 | 2026-10-20 20:47:30.656732+00 |          92
(10 rows)

```
