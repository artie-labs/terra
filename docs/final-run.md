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
Volume terra_terra_pgdata Removed 
Volume terra_terra_subdata Removed 
Network terra_default Removed 

$ ./bench.sh --cold
run 1: image_pull=14 seed_loaded=3 subscriber_synced=3 verify_pass=1 total=21
wrote bench.txt:
# pg/bench.txt is written by pg/bench.sh; do not edit by hand.
# median of 1 run(s) on 2026-10-20T21:53:32Z, Darwin arm64, docker 29.5.2, image pulled
# run: 14 3 3 1 21
image_pull 14
seed_loaded 3
subscriber_synced 3
verify_pass 1
total 21

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
table            src rows   dst rows  cols  status
animals               157        157     8  ok
collar_pings           15         15     7  ok
observations         1479       1479     5  ok
watering_holes         12         12     6  ok
verify: PASS (4 tables match, 1 attempt(s))

$ events/apply.sh 5
### event 05: Event 05: The naming committee
== subscriber (before-publisher): 05_rename_name_column.sql
== source: 05_rename_name_column.sql
== subscriber caught up to 0/1AFDC00
== subscriber (after-catchup): 05_rename_name_column.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               157        157     8  ok
collar_pings           15         15     7  ok
observations         1483       1483     5  ok
watering_holes         12         12     6  ok
verify: PASS (4 tables match, 1 attempt(s))

$ events/apply.sh 6
### event 06: Event 06: Rangers file structured reports
== subscriber (before-publisher): 06_field_report_jsonb.sql
== source: 06_field_report_jsonb.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               157        157     8  ok
collar_pings           16         16     7  ok
observations         1483       1483     6  ok
watering_holes         12         12     6  ok
verify: PASS (4 tables match, 1 attempt(s))

$ events/apply.sh 7
### event 07: Event 07: Survey adds elevation
== subscriber (before-publisher): 07_elevation_not_null_default.sql
== source: 07_elevation_not_null_default.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               157        157     8  ok
collar_pings           19         19     7  ok
observations         1487       1487     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 1 attempt(s))

$ events/apply.sh 8
### event 08: Event 08: Status moves to the collars
== subscriber (before-publisher): 08_drop_status_column.sql
== source: 08_drop_status_column.sql
== subscriber caught up to 0/1B05958
== subscriber (after-catchup): 08_drop_status_column.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               157        157     7  ok
collar_pings           24         24     7  ok
observations         1490       1490     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 1 attempt(s))

$ tail -2 stream.log
stream: tick    11  10 ops  totals obs+67 obs-8 animal+5 animal~18 ping+12
stream: stopped after 11 ticks  totals obs+67 obs-8 animal+5 animal~18 ping+12

$ python3 verify.py --wait 120   # stream stopped
table            src rows   dst rows  cols  status
animals               157        157     7  ok
collar_pings           24         24     7  ok
observations         1490       1490     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 1 attempt(s))

$ psql $SUB_DSN -f queries.sql
-- 1. observations per watering hole
  watering_hole  |          region          | observations 
-----------------+--------------------------+--------------
 Baobab Dam      | Kruger, South Africa     |          186
 Ochre Seep      | Etosha, Namibia          |          165
 Thornbush Pan   | Hluhluwe, South Africa   |          160
 Acacia Pan      | Maasai Mara, Kenya       |          139
 Reed Lagoon     | Okavango Delta, Botswana |          130
 Dawn Pool       | Hwange, Zimbabwe         |          124
 Mopane Crossing | Chobe, Botswana          |          117
 Elephant Spring | Amboseli, Kenya          |          113
 Riverbend Pool  | South Luangwa, Zambia    |          105
 Crater Basin    | Ngorongoro, Tanzania     |           91
 Kopje Pool      | Serengeti, Tanzania      |           87
 Miombo Spring   | Kafue, Zambia            |           73
(12 rows)

-- 2. verified field reports per ranger (event 06)
 ranger | reports | verified | usual_weather 
--------+---------+----------+---------------
 A.M.   |      26 |       26 | clear
 J.T.   |       2 |        1 | overcast
 L.O.   |       2 |        1 | dust haze
 R.K.   |       2 |        1 | dust haze
 D.C.   |       1 |        1 | light rain
 S.P.   |       1 |        1 | overcast
(6 rows)

-- 3. latest collar ping per animal (events 04, 05, 07)
       display_name       |    species     |      near       | elevation_m |           pinged_at           | battery_pct 
--------------------------+----------------+-----------------+-------------+-------------------------------+-------------
 Nia                      | giraffe        | Mopane Crossing |         930 | 2026-10-20 21:53:43.27938+00  |          31
 Baraka #120              | elephant       | Reed Lagoon     |         950 | 2026-10-20 21:53:43.27938+00  |          16
 Moyo the Watchful        | plains_zebra   | Mopane Crossing |         930 | 2026-10-20 21:53:43.27938+00  |           6
 Safi                     | plains_zebra   | Dawn Pool       |        1000 | 2026-10-20 21:53:43.27938+00  |          93
 Jabari of the Delta #154 | spotted_hyena  | Ochre Seep      |        1100 | 2026-10-20 21:53:43.27938+00  |          93
 Pendo of the Plains      | hippopotamus   | Kopje Pool      |        1500 | 2026-10-20 21:53:42.273646+00 |          47
 Rafiki #141              | common_warthog | Acacia Pan      |        1600 | 2026-10-20 21:53:42.273646+00 |          95
 Rafiki Jr. #91           | impala         | Dawn Pool       |        1000 | 2026-10-20 21:53:42.273646+00 |          46
 Safi #111                | impala         | Ochre Seep      |        1100 | 2026-10-20 21:53:41.267201+00 |          18
 Imani the Watchful       | hippopotamus   | Ochre Seep      |        1100 | 2026-10-20 21:53:40.255834+00 |          38
(10 rows)

```
