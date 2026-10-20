# Final run

Complete sequence on 2026-10-20, from `docker compose -p terra down -v`, on a
MacBook (Darwin arm64) running Docker 29.5.2 inside colima with 4 CPUs and
6 GB. Terminal output pasted as is. `bench.sh --cold` removes the postgres:16
image first so the pull is included; it rewrote `pg/bench.txt` with this single
run, and the committed `bench.txt` (median of three cold runs, 29 s) was
restored afterwards with `git checkout`.

```
$ docker compose -p terra down -v
Container terra-subscriber Removed 
Container terra-postgres Removed 
Volume terra_terra_pgdata Removed 
Volume terra_terra_subdata Removed 
Network terra_default Removed 

$ ./bench.sh --cold
run 1: image_pull=19 seed_loaded=3 subscriber_synced=3 verify_pass=1 total=26
wrote bench.txt:
# pg/bench.txt is written by pg/bench.sh; do not edit by hand.
# median of 1 run(s) on 2026-10-20T16:33:40Z, Darwin arm64, docker 29.5.2, image pulled
# run: 19 3 3 1 26
image_pull 19
seed_loaded 3
subscriber_synced 3
verify_pass 1
total 26

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               150        150     7  ok
observations         1430       1430     5  ok
watering_holes         12         12     6  ok
verify: PASS (3 tables match, 1 attempt(s))

$ python3 stream.py --rate 10 --quiet &

$ events/apply.sh 1
### event 01: Event 01: Weigh-in
== subscriber: 01_add_weight_column.sql
== source: 01_add_weight_column.sql

$ python3 verify.py --wait 120
verify: waiting, 1 table(s) not matched yet: animals
table            src rows   dst rows  cols  status
animals               154        154     8  ok
observations         1471       1471     5  ok
watering_holes         12         12     6  ok
verify: PASS (3 tables match, 2 attempt(s))

$ events/apply.sh 2
### event 02: Event 02: A pangolin is sighted
== subscriber: 02_add_enum_value.sql
== source: 02_add_enum_value.sql

$ python3 verify.py --wait 120
verify: waiting, 1 table(s) not matched yet: observations
table            src rows   dst rows  cols  status
animals               157        157     8  ok
observations         1491       1491     5  ok
watering_holes         12         12     6  ok
verify: PASS (3 tables match, 2 attempt(s))

$ events/apply.sh 3
### event 03: Event 03: The herd outgrows int
== subscriber: 03_widen_animal_id.sql
== source: 03_widen_animal_id.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               158        158     8  ok
observations         1492       1492     5  ok
watering_holes         12         12     6  ok
verify: PASS (3 tables match, 1 attempt(s))

$ events/apply.sh 4
### event 04: Event 04: The collars come online
== source: 04_collar_pings_table.sql
== subscriber: 04_collar_pings_table.sql

$ python3 verify.py --wait 120
verify: waiting, 1 table(s) not matched yet: collar_pings
table            src rows   dst rows  cols  status
animals               160        160     8  ok
collar_pings           25         25     7  ok
observations         1524       1524     5  ok
watering_holes         12         12     6  ok
verify: PASS (4 tables match, 3 attempt(s))

$ events/apply.sh 5
### event 05: Event 05: The naming committee
== source: 05_rename_name_column.sql
== subscriber: 05_rename_name_column.sql

$ python3 verify.py --wait 120
verify: waiting, 2 table(s) not matched yet: animals, observations
table            src rows   dst rows  cols  status
animals               160        160     8  ok
collar_pings           35         35     7  ok
observations         1556       1556     5  ok
watering_holes         12         12     6  ok
verify: PASS (4 tables match, 3 attempt(s))

$ events/apply.sh 6
### event 06: Event 06: Rangers file structured reports
== subscriber: 06_field_report_jsonb.sql
== source: 06_field_report_jsonb.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               160        160     8  ok
collar_pings           35         35     7  ok
observations         1556       1556     6  ok
watering_holes         12         12     6  ok
verify: PASS (4 tables match, 1 attempt(s))

$ events/apply.sh 7
### event 07: Event 07: Survey adds elevation
== subscriber: 07_elevation_not_null_default.sql
== source: 07_elevation_not_null_default.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               160        160     8  ok
collar_pings           37         37     7  ok
observations         1561       1561     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 1 attempt(s))

$ events/apply.sh 8
### event 08: Event 08: Status moves to the collars
== source: 08_drop_status_column.sql
== subscriber: 08_drop_status_column.sql

$ python3 verify.py --wait 120
table            src rows   dst rows  cols  status
animals               160        160     7  ok
collar_pings           40         40     7  ok
observations         1565       1565     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 1 attempt(s))

$ tail -2 stream.log
stream: schema animals(7 cols), collar_pings(7 cols), observations(6 cols), watering_holes(7 cols), 16 species
stream: stopped after 25 ticks  totals obs+159 obs-25 animal+9 animal~29 ping+28

$ python3 verify.py --wait 120   # stream stopped
table            src rows   dst rows  cols  status
animals               161        161     7  ok
collar_pings           40         40     7  ok
observations         1565       1565     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 1 attempt(s))

$ psql $SUB_DSN -f queries.sql
-- 1. observations per watering hole
  watering_hole  |          region          | observations 
-----------------+--------------------------+--------------
 Baobab Dam      | Kruger, South Africa     |          187
 Ochre Seep      | Etosha, Namibia          |          170
 Thornbush Pan   | Hluhluwe, South Africa   |          165
 Acacia Pan      | Maasai Mara, Kenya       |          138
 Reed Lagoon     | Okavango Delta, Botswana |          137
 Dawn Pool       | Hwange, Zimbabwe         |          134
 Mopane Crossing | Chobe, Botswana          |          128
 Riverbend Pool  | South Luangwa, Zambia    |          125
 Elephant Spring | Amboseli, Kenya          |          118
 Kopje Pool      | Serengeti, Tanzania      |           92
 Crater Basin    | Ngorongoro, Tanzania     |           89
 Miombo Spring   | Kafue, Zambia            |           82
(12 rows)

-- 2. verified field reports per ranger (event 06)
 ranger | reports | verified | usual_weather 
--------+---------+----------+---------------
 A.M.   |      26 |       25 | clear
 J.T.   |       5 |        3 | dust haze
 D.C.   |       1 |        1 | dust haze
 L.O.   |       1 |        1 | dust haze
 R.K.   |       1 |        1 | light rain
 S.P.   |       1 |        0 | overcast
(6 rows)

-- 3. latest collar ping per animal (events 04, 05, 07)
      display_name       |     species     |      near       | elevation_m |           pinged_at           | battery_pct 
-------------------------+-----------------+-----------------+-------------+-------------------------------+-------------
 Mosi #63                | lion            | Acacia Pan      |        1600 | 2026-10-20 16:34:04.88231+00  |          29
 Moyo Jr. #81            | blue_wildebeest | Baobab Dam      |         300 | 2026-10-20 16:34:04.88231+00  |          57
 Baraka #114             | giraffe         | Miombo Spring   |        1050 | 2026-10-20 16:34:04.88231+00  |          30
 Kubwa of the Plains #41 | lion            | Ochre Seep      |        1100 | 2026-10-20 16:34:03.87419+00  |          44
 Tamu the Swift          | impala          | Kopje Pool      |        1500 | 2026-10-20 16:34:03.87419+00  |          25
 Moyo Jr.                | plains_zebra    | Mopane Crossing |         930 | 2026-10-20 16:34:02.859333+00 |          41
 Baraka #120             | elephant        | Miombo Spring   |        1050 | 2026-10-20 16:34:02.859333+00 |          75
 Imani of the Delta      | hippopotamus    | Ochre Seep      |        1100 | 2026-10-20 16:34:01.847626+00 |          16
 Lulu #48                | hippopotamus    | Ochre Seep      |        1100 | 2026-10-20 16:34:01.847626+00 |          20
 Lulu #52                | plains_zebra    | Acacia Pan      |        1600 | 2026-10-20 16:34:00.828072+00 |          45
(10 rows)

```
