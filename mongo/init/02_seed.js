const terra = db.getSiblingDB("terra");
const batchSize = 1_000;
const collections = {
  "animals": [
    {
      "_id": {
        "$oid": "010000000000000000000001"
      },
      "name": "Elephant-001",
      "species": "elephant",
      "status": "observed",
      "active": false,
      "weightKg": {
        "$numberDecimal": "900.25"
      },
      "home": {
        "wateringHole": "Elephant Spring",
        "region": "Amboseli, Kenya",
        "coordinates": {
          "type": "Point",
          "coordinates": [
            37.2535,
            -2.6456
          ]
        }
      },
      "tags": [
        "demo",
        "elephant"
      ],
      "health": {
        "score": {
          "$numberInt": "1"
        },
        "notes": "cleared"
      },
      "createdAt": {
        "$date": "2026-01-01T00:00:00.000Z"
      },
      "updatedAt": {
        "$date": "2026-01-01T00:00:00.000Z"
      },
      "seedId": "animal-001",
      "attributes": {
        "tuskLengthCm": {
          "$numberInt": "80"
        }
      }
    },
    {
      "_id": {
        "$oid": "010000000000000000000002"
      },
      "name": "Lion-002",
      "species": "lion",
      "status": "collared",
      "active": true,
      "weightKg": {
        "$numberDecimal": "917.25"
      },
      "home": {
        "wateringHole": "Lion's Rest",
        "region": "Maasai Mara, Kenya",
        "coordinates": {
          "type": "Point",
          "coordinates": [
            35.1439,
            -1.4061
          ]
        }
      },
      "tags": [
        "demo",
        "lion"
      ],
      "health": {
        "score": {
          "$numberInt": "2"
        },
        "notes": null
      },
      "createdAt": {
        "$date": "2026-01-01T00:01:00.000Z"
      },
      "updatedAt": {
        "$date": "2026-01-01T00:01:00.000Z"
      },
      "seedId": "animal-002"
    },
    {
      "_id": {
        "$oid": "010000000000000000000003"
      },
      "name": "Giraffe-003",
      "species": "giraffe",
      "status": "collared",
      "active": true,
      "weightKg": {
        "$numberDecimal": "934.25"
      },
      "home": {
        "wateringHole": "Acacia Pool",
        "region": "Serengeti, Tanzania",
        "coordinates": {
          "type": "Point",
          "coordinates": [
            34.8333,
            -2.3333
          ]
        }
      },
      "tags": [
        "demo",
        "giraffe"
      ],
      "health": {
        "score": {
          "$numberInt": "3"
        },
        "notes": "cleared"
      },
      "createdAt": {
        "$date": "2026-01-01T00:02:00.000Z"
      },
      "updatedAt": {
        "$date": "2026-01-01T00:02:00.000Z"
      },
      "seedId": "animal-003",
      "attributes": {
        "tuskLengthCm": {
          "$numberInt": "82"
        }
      }
    },
    {
      "_id": {
        "$oid": "010000000000000000000004"
      },
      "name": "Plains_Zebra-004",
      "species": "plains_zebra",
      "status": "observed",
      "active": true,
      "weightKg": {
        "$numberDecimal": "951.25"
      },
      "home": {
        "wateringHole": "Elephant Spring",
        "region": "Amboseli, Kenya",
        "coordinates": {
          "type": "Point",
          "coordinates": [
            37.2535,
            -2.6456
          ]
        }
      },
      "tags": [
        "demo",
        "plains_zebra"
      ],
      "health": {
        "score": {
          "$numberInt": "4"
        },
        "notes": null
      },
      "createdAt": {
        "$date": "2026-01-01T00:03:00.000Z"
      },
      "updatedAt": {
        "$date": "2026-01-01T00:03:00.000Z"
      },
      "seedId": "animal-004"
    },
    {
      "_id": {
        "$oid": "010000000000000000000005"
      },
      "name": "Cheetah-005",
      "species": "cheetah",
      "status": "collared",
      "active": true,
      "weightKg": {
        "$numberDecimal": "968.25"
      },
      "home": {
        "wateringHole": "Lion's Rest",
        "region": "Maasai Mara, Kenya",
        "coordinates": {
          "type": "Point",
          "coordinates": [
            35.1439,
            -1.4061
          ]
        }
      },
      "tags": [
        "demo",
        "cheetah"
      ],
      "health": {
        "score": {
          "$numberInt": "5"
        },
        "notes": "cleared"
      },
      "createdAt": {
        "$date": "2026-01-01T00:04:00.000Z"
      },
      "updatedAt": {
        "$date": "2026-01-01T00:04:00.000Z"
      },
      "seedId": "animal-005",
      "attributes": {
        "tuskLengthCm": {
          "$numberInt": "84"
        }
      }
    },
    {
      "_id": {
        "$oid": "010000000000000000000006"
      },
      "name": "Impala-006",
      "species": "impala",
      "status": "collared",
      "active": true,
      "weightKg": {
        "$numberDecimal": "985.25"
      },
      "home": {
        "wateringHole": "Acacia Pool",
        "region": "Serengeti, Tanzania",
        "coordinates": {
          "type": "Point",
          "coordinates": [
            34.8333,
            -2.3333
          ]
        }
      },
      "tags": [
        "demo",
        "impala"
      ],
      "health": {
        "score": {
          "$numberInt": "1"
        },
        "notes": null
      },
      "createdAt": {
        "$date": "2026-01-01T00:05:00.000Z"
      },
      "updatedAt": {
        "$date": "2026-01-01T00:05:00.000Z"
      },
      "seedId": "animal-006"
    },
    {
      "_id": {
        "$oid": "010000000000000000000007"
      },
      "name": "Elephant-007",
      "species": "elephant",
      "status": "observed",
      "active": true,
      "weightKg": {
        "$numberDecimal": "1002.25"
      },
      "home": {
        "wateringHole": "Elephant Spring",
        "region": "Amboseli, Kenya",
        "coordinates": {
          "type": "Point",
          "coordinates": [
            37.2535,
            -2.6456
          ]
        }
      },
      "tags": [
        "demo",
        "elephant"
      ],
      "health": {
        "score": {
          "$numberInt": "2"
        },
        "notes": "cleared"
      },
      "createdAt": {
        "$date": "2026-01-01T00:06:00.000Z"
      },
      "updatedAt": {
        "$date": "2026-01-01T00:06:00.000Z"
      },
      "seedId": "animal-007",
      "attributes": {
        "tuskLengthCm": {
          "$numberInt": "86"
        }
      }
    },
    {
      "_id": {
        "$oid": "010000000000000000000008"
      },
      "name": "Lion-008",
      "species": "lion",
      "status": "collared",
      "active": false,
      "weightKg": {
        "$numberDecimal": "1019.25"
      },
      "home": {
        "wateringHole": "Lion's Rest",
        "region": "Maasai Mara, Kenya",
        "coordinates": {
          "type": "Point",
          "coordinates": [
            35.1439,
            -1.4061
          ]
        }
      },
      "tags": [
        "demo",
        "lion"
      ],
      "health": {
        "score": {
          "$numberInt": "3"
        },
        "notes": null
      },
      "createdAt": {
        "$date": "2026-01-01T00:07:00.000Z"
      },
      "updatedAt": {
        "$date": "2026-01-01T00:07:00.000Z"
      },
      "seedId": "animal-008"
    },
    {
      "_id": {
        "$oid": "010000000000000000000009"
      },
      "name": "Giraffe-009",
      "species": "giraffe",
      "status": "collared",
      "active": true,
      "weightKg": {
        "$numberDecimal": "1036.25"
      },
      "home": {
        "wateringHole": "Acacia Pool",
        "region": "Serengeti, Tanzania",
        "coordinates": {
          "type": "Point",
          "coordinates": [
            34.8333,
            -2.3333
          ]
        }
      },
      "tags": [
        "demo",
        "giraffe"
      ],
      "health": {
        "score": {
          "$numberInt": "4"
        },
        "notes": "cleared"
      },
      "createdAt": {
        "$date": "2026-01-01T00:08:00.000Z"
      },
      "updatedAt": {
        "$date": "2026-01-01T00:08:00.000Z"
      },
      "seedId": "animal-009",
      "attributes": {
        "tuskLengthCm": {
          "$numberInt": "88"
        }
      }
    },
    {
      "_id": {
        "$oid": "01000000000000000000000a"
      },
      "name": "Plains_Zebra-010",
      "species": "plains_zebra",
      "status": "observed",
      "active": true,
      "weightKg": {
        "$numberDecimal": "1053.25"
      },
      "home": {
        "wateringHole": "Elephant Spring",
        "region": "Amboseli, Kenya",
        "coordinates": {
          "type": "Point",
          "coordinates": [
            37.2535,
            -2.6456
          ]
        }
      },
      "tags": [
        "demo",
        "plains_zebra"
      ],
      "health": {
        "score": {
          "$numberInt": "5"
        },
        "notes": null
      },
      "createdAt": {
        "$date": "2026-01-01T00:09:00.000Z"
      },
      "updatedAt": {
        "$date": "2026-01-01T00:09:00.000Z"
      },
      "seedId": "animal-010"
    },
    {
      "_id": {
        "$oid": "01000000000000000000000b"
      },
      "name": "Cheetah-011",
      "species": "cheetah",
      "status": "collared",
      "active": true,
      "weightKg": {
        "$numberDecimal": "1070.25"
      },
      "home": {
        "wateringHole": "Lion's Rest",
        "region": "Maasai Mara, Kenya",
        "coordinates": {
          "type": "Point",
          "coordinates": [
            35.1439,
            -1.4061
          ]
        }
      },
      "tags": [
        "demo",
        "cheetah"
      ],
      "health": {
        "score": {
          "$numberInt": "1"
        },
        "notes": "cleared"
      },
      "createdAt": {
        "$date": "2026-01-01T00:10:00.000Z"
      },
      "updatedAt": {
        "$date": "2026-01-01T00:10:00.000Z"
      },
      "seedId": "animal-011",
      "attributes": {
        "tuskLengthCm": {
          "$numberInt": "90"
        }
      }
    },
    {
      "_id": {
        "$oid": "01000000000000000000000c"
      },
      "name": "Impala-012",
      "species": "impala",
      "status": "collared",
      "active": true,
      "weightKg": {
        "$numberDecimal": "1087.25"
      },
      "home": {
        "wateringHole": "Acacia Pool",
        "region": "Serengeti, Tanzania",
        "coordinates": {
          "type": "Point",
          "coordinates": [
            34.8333,
            -2.3333
          ]
        }
      },
      "tags": [
        "demo",
        "impala"
      ],
      "health": {
        "score": {
          "$numberInt": "2"
        },
        "notes": null
      },
      "createdAt": {
        "$date": "2026-01-01T00:11:00.000Z"
      },
      "updatedAt": {
        "$date": "2026-01-01T00:11:00.000Z"
      },
      "seedId": "animal-012"
    }
  ],
  "observations": [
    {
      "_id": {
        "$oid": "020000000000000000000001"
      },
      "animalId": {
        "$oid": "010000000000000000000001"
      },
      "observedAt": {
        "$date": "2026-01-01T00:00:00.000Z"
      },
      "ranger": "ranger-1",
      "conditions": {
        "temperatureC": 20.5,
        "windKph": {
          "$numberInt": "0"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/1.jpg"
        }
      ],
      "seedId": "observation-0001"
    },
    {
      "_id": {
        "$oid": "020000000000000000000002"
      },
      "animalId": {
        "$oid": "010000000000000000000002"
      },
      "observedAt": {
        "$date": "2026-01-01T00:05:00.000Z"
      },
      "ranger": "ranger-2",
      "conditions": {
        "temperatureC": 21.5,
        "windKph": {
          "$numberInt": "1"
        }
      },
      "attachments": [],
      "seedId": "observation-0002"
    },
    {
      "_id": {
        "$oid": "020000000000000000000003"
      },
      "animalId": {
        "$oid": "010000000000000000000003"
      },
      "observedAt": {
        "$date": "2026-01-01T00:10:00.000Z"
      },
      "ranger": "ranger-3",
      "conditions": {
        "temperatureC": 22.5,
        "windKph": {
          "$numberInt": "2"
        }
      },
      "attachments": [],
      "seedId": "observation-0003"
    },
    {
      "_id": {
        "$oid": "020000000000000000000004"
      },
      "animalId": {
        "$oid": "010000000000000000000004"
      },
      "observedAt": {
        "$date": "2026-01-01T00:15:00.000Z"
      },
      "ranger": "ranger-4",
      "conditions": {
        "temperatureC": 23.5,
        "windKph": {
          "$numberInt": "3"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/4.jpg"
        }
      ],
      "seedId": "observation-0004"
    },
    {
      "_id": {
        "$oid": "020000000000000000000005"
      },
      "animalId": {
        "$oid": "010000000000000000000005"
      },
      "observedAt": {
        "$date": "2026-01-01T00:20:00.000Z"
      },
      "ranger": "ranger-1",
      "conditions": {
        "temperatureC": 24.5,
        "windKph": {
          "$numberInt": "4"
        }
      },
      "attachments": [],
      "seedId": "observation-0005"
    },
    {
      "_id": {
        "$oid": "020000000000000000000006"
      },
      "animalId": {
        "$oid": "010000000000000000000006"
      },
      "observedAt": {
        "$date": "2026-01-01T00:25:00.000Z"
      },
      "ranger": "ranger-2",
      "conditions": {
        "temperatureC": 25.5,
        "windKph": {
          "$numberInt": "5"
        }
      },
      "attachments": [],
      "seedId": "observation-0006"
    },
    {
      "_id": {
        "$oid": "020000000000000000000007"
      },
      "animalId": {
        "$oid": "010000000000000000000007"
      },
      "observedAt": {
        "$date": "2026-01-01T00:30:00.000Z"
      },
      "ranger": "ranger-3",
      "conditions": {
        "temperatureC": 26.5,
        "windKph": {
          "$numberInt": "6"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/7.jpg"
        }
      ],
      "seedId": "observation-0007"
    },
    {
      "_id": {
        "$oid": "020000000000000000000008"
      },
      "animalId": {
        "$oid": "010000000000000000000008"
      },
      "observedAt": {
        "$date": "2026-01-01T00:35:00.000Z"
      },
      "ranger": "ranger-4",
      "conditions": {
        "temperatureC": 27.5,
        "windKph": {
          "$numberInt": "7"
        }
      },
      "attachments": [],
      "seedId": "observation-0008"
    },
    {
      "_id": {
        "$oid": "020000000000000000000009"
      },
      "animalId": {
        "$oid": "010000000000000000000009"
      },
      "observedAt": {
        "$date": "2026-01-01T00:40:00.000Z"
      },
      "ranger": "ranger-1",
      "conditions": {
        "temperatureC": 28.5,
        "windKph": {
          "$numberInt": "8"
        }
      },
      "attachments": [],
      "seedId": "observation-0009"
    },
    {
      "_id": {
        "$oid": "02000000000000000000000a"
      },
      "animalId": {
        "$oid": "01000000000000000000000a"
      },
      "observedAt": {
        "$date": "2026-01-01T00:45:00.000Z"
      },
      "ranger": "ranger-2",
      "conditions": {
        "temperatureC": 29.5,
        "windKph": {
          "$numberInt": "9"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/10.jpg"
        }
      ],
      "seedId": "observation-0010"
    },
    {
      "_id": {
        "$oid": "02000000000000000000000b"
      },
      "animalId": {
        "$oid": "01000000000000000000000b"
      },
      "observedAt": {
        "$date": "2026-01-01T00:50:00.000Z"
      },
      "ranger": "ranger-3",
      "conditions": {
        "temperatureC": 20.5,
        "windKph": {
          "$numberInt": "10"
        }
      },
      "attachments": [],
      "seedId": "observation-0011"
    },
    {
      "_id": {
        "$oid": "02000000000000000000000c"
      },
      "animalId": {
        "$oid": "01000000000000000000000c"
      },
      "observedAt": {
        "$date": "2026-01-01T00:55:00.000Z"
      },
      "ranger": "ranger-4",
      "conditions": {
        "temperatureC": 21.5,
        "windKph": {
          "$numberInt": "11"
        }
      },
      "attachments": [],
      "seedId": "observation-0012"
    },
    {
      "_id": {
        "$oid": "02000000000000000000000d"
      },
      "animalId": {
        "$oid": "010000000000000000000001"
      },
      "observedAt": {
        "$date": "2026-01-01T01:00:00.000Z"
      },
      "ranger": "ranger-1",
      "conditions": {
        "temperatureC": 22.5,
        "windKph": {
          "$numberInt": "12"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/13.jpg"
        }
      ],
      "seedId": "observation-0013"
    },
    {
      "_id": {
        "$oid": "02000000000000000000000e"
      },
      "animalId": {
        "$oid": "010000000000000000000002"
      },
      "observedAt": {
        "$date": "2026-01-01T01:05:00.000Z"
      },
      "ranger": "ranger-2",
      "conditions": {
        "temperatureC": 23.5,
        "windKph": {
          "$numberInt": "13"
        }
      },
      "attachments": [],
      "seedId": "observation-0014"
    },
    {
      "_id": {
        "$oid": "02000000000000000000000f"
      },
      "animalId": {
        "$oid": "010000000000000000000003"
      },
      "observedAt": {
        "$date": "2026-01-01T01:10:00.000Z"
      },
      "ranger": "ranger-3",
      "conditions": {
        "temperatureC": 24.5,
        "windKph": {
          "$numberInt": "14"
        }
      },
      "attachments": [],
      "seedId": "observation-0015"
    },
    {
      "_id": {
        "$oid": "020000000000000000000010"
      },
      "animalId": {
        "$oid": "010000000000000000000004"
      },
      "observedAt": {
        "$date": "2026-01-01T01:15:00.000Z"
      },
      "ranger": "ranger-4",
      "conditions": {
        "temperatureC": 25.5,
        "windKph": {
          "$numberInt": "15"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/16.jpg"
        }
      ],
      "seedId": "observation-0016"
    },
    {
      "_id": {
        "$oid": "020000000000000000000011"
      },
      "animalId": {
        "$oid": "010000000000000000000005"
      },
      "observedAt": {
        "$date": "2026-01-01T01:20:00.000Z"
      },
      "ranger": "ranger-1",
      "conditions": {
        "temperatureC": 26.5,
        "windKph": {
          "$numberInt": "16"
        }
      },
      "attachments": [],
      "seedId": "observation-0017"
    },
    {
      "_id": {
        "$oid": "020000000000000000000012"
      },
      "animalId": {
        "$oid": "010000000000000000000006"
      },
      "observedAt": {
        "$date": "2026-01-01T01:25:00.000Z"
      },
      "ranger": "ranger-2",
      "conditions": {
        "temperatureC": 27.5,
        "windKph": {
          "$numberInt": "17"
        }
      },
      "attachments": [],
      "seedId": "observation-0018"
    },
    {
      "_id": {
        "$oid": "020000000000000000000013"
      },
      "animalId": {
        "$oid": "010000000000000000000007"
      },
      "observedAt": {
        "$date": "2026-01-01T01:30:00.000Z"
      },
      "ranger": "ranger-3",
      "conditions": {
        "temperatureC": 28.5,
        "windKph": {
          "$numberInt": "18"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/19.jpg"
        }
      ],
      "seedId": "observation-0019"
    },
    {
      "_id": {
        "$oid": "020000000000000000000014"
      },
      "animalId": {
        "$oid": "010000000000000000000008"
      },
      "observedAt": {
        "$date": "2026-01-01T01:35:00.000Z"
      },
      "ranger": "ranger-4",
      "conditions": {
        "temperatureC": 29.5,
        "windKph": {
          "$numberInt": "19"
        }
      },
      "attachments": [],
      "seedId": "observation-0020"
    },
    {
      "_id": {
        "$oid": "020000000000000000000015"
      },
      "animalId": {
        "$oid": "010000000000000000000009"
      },
      "observedAt": {
        "$date": "2026-01-01T01:40:00.000Z"
      },
      "ranger": "ranger-1",
      "conditions": {
        "temperatureC": 20.5,
        "windKph": {
          "$numberInt": "0"
        }
      },
      "attachments": [],
      "seedId": "observation-0021"
    },
    {
      "_id": {
        "$oid": "020000000000000000000016"
      },
      "animalId": {
        "$oid": "01000000000000000000000a"
      },
      "observedAt": {
        "$date": "2026-01-01T01:45:00.000Z"
      },
      "ranger": "ranger-2",
      "conditions": {
        "temperatureC": 21.5,
        "windKph": {
          "$numberInt": "1"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/22.jpg"
        }
      ],
      "seedId": "observation-0022"
    },
    {
      "_id": {
        "$oid": "020000000000000000000017"
      },
      "animalId": {
        "$oid": "01000000000000000000000b"
      },
      "observedAt": {
        "$date": "2026-01-01T01:50:00.000Z"
      },
      "ranger": "ranger-3",
      "conditions": {
        "temperatureC": 22.5,
        "windKph": {
          "$numberInt": "2"
        }
      },
      "attachments": [],
      "seedId": "observation-0023"
    },
    {
      "_id": {
        "$oid": "020000000000000000000018"
      },
      "animalId": {
        "$oid": "01000000000000000000000c"
      },
      "observedAt": {
        "$date": "2026-01-01T01:55:00.000Z"
      },
      "ranger": "ranger-4",
      "conditions": {
        "temperatureC": 23.5,
        "windKph": {
          "$numberInt": "3"
        }
      },
      "attachments": [],
      "seedId": "observation-0024"
    },
    {
      "_id": {
        "$oid": "020000000000000000000019"
      },
      "animalId": {
        "$oid": "010000000000000000000001"
      },
      "observedAt": {
        "$date": "2026-01-01T02:00:00.000Z"
      },
      "ranger": "ranger-1",
      "conditions": {
        "temperatureC": 24.5,
        "windKph": {
          "$numberInt": "4"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/25.jpg"
        }
      ],
      "seedId": "observation-0025"
    },
    {
      "_id": {
        "$oid": "02000000000000000000001a"
      },
      "animalId": {
        "$oid": "010000000000000000000002"
      },
      "observedAt": {
        "$date": "2026-01-01T02:05:00.000Z"
      },
      "ranger": "ranger-2",
      "conditions": {
        "temperatureC": 25.5,
        "windKph": {
          "$numberInt": "5"
        }
      },
      "attachments": [],
      "seedId": "observation-0026"
    },
    {
      "_id": {
        "$oid": "02000000000000000000001b"
      },
      "animalId": {
        "$oid": "010000000000000000000003"
      },
      "observedAt": {
        "$date": "2026-01-01T02:10:00.000Z"
      },
      "ranger": "ranger-3",
      "conditions": {
        "temperatureC": 26.5,
        "windKph": {
          "$numberInt": "6"
        }
      },
      "attachments": [],
      "seedId": "observation-0027"
    },
    {
      "_id": {
        "$oid": "02000000000000000000001c"
      },
      "animalId": {
        "$oid": "010000000000000000000004"
      },
      "observedAt": {
        "$date": "2026-01-01T02:15:00.000Z"
      },
      "ranger": "ranger-4",
      "conditions": {
        "temperatureC": 27.5,
        "windKph": {
          "$numberInt": "7"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/28.jpg"
        }
      ],
      "seedId": "observation-0028"
    },
    {
      "_id": {
        "$oid": "02000000000000000000001d"
      },
      "animalId": {
        "$oid": "010000000000000000000005"
      },
      "observedAt": {
        "$date": "2026-01-01T02:20:00.000Z"
      },
      "ranger": "ranger-1",
      "conditions": {
        "temperatureC": 28.5,
        "windKph": {
          "$numberInt": "8"
        }
      },
      "attachments": [],
      "seedId": "observation-0029"
    },
    {
      "_id": {
        "$oid": "02000000000000000000001e"
      },
      "animalId": {
        "$oid": "010000000000000000000006"
      },
      "observedAt": {
        "$date": "2026-01-01T02:25:00.000Z"
      },
      "ranger": "ranger-2",
      "conditions": {
        "temperatureC": 29.5,
        "windKph": {
          "$numberInt": "9"
        }
      },
      "attachments": [],
      "seedId": "observation-0030"
    },
    {
      "_id": {
        "$oid": "02000000000000000000001f"
      },
      "animalId": {
        "$oid": "010000000000000000000007"
      },
      "observedAt": {
        "$date": "2026-01-01T02:30:00.000Z"
      },
      "ranger": "ranger-3",
      "conditions": {
        "temperatureC": 20.5,
        "windKph": {
          "$numberInt": "10"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/31.jpg"
        }
      ],
      "seedId": "observation-0031"
    },
    {
      "_id": {
        "$oid": "020000000000000000000020"
      },
      "animalId": {
        "$oid": "010000000000000000000008"
      },
      "observedAt": {
        "$date": "2026-01-01T02:35:00.000Z"
      },
      "ranger": "ranger-4",
      "conditions": {
        "temperatureC": 21.5,
        "windKph": {
          "$numberInt": "11"
        }
      },
      "attachments": [],
      "seedId": "observation-0032"
    },
    {
      "_id": {
        "$oid": "020000000000000000000021"
      },
      "animalId": {
        "$oid": "010000000000000000000009"
      },
      "observedAt": {
        "$date": "2026-01-01T02:40:00.000Z"
      },
      "ranger": "ranger-1",
      "conditions": {
        "temperatureC": 22.5,
        "windKph": {
          "$numberInt": "12"
        }
      },
      "attachments": [],
      "seedId": "observation-0033"
    },
    {
      "_id": {
        "$oid": "020000000000000000000022"
      },
      "animalId": {
        "$oid": "01000000000000000000000a"
      },
      "observedAt": {
        "$date": "2026-01-01T02:45:00.000Z"
      },
      "ranger": "ranger-2",
      "conditions": {
        "temperatureC": 23.5,
        "windKph": {
          "$numberInt": "13"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/34.jpg"
        }
      ],
      "seedId": "observation-0034"
    },
    {
      "_id": {
        "$oid": "020000000000000000000023"
      },
      "animalId": {
        "$oid": "01000000000000000000000b"
      },
      "observedAt": {
        "$date": "2026-01-01T02:50:00.000Z"
      },
      "ranger": "ranger-3",
      "conditions": {
        "temperatureC": 24.5,
        "windKph": {
          "$numberInt": "14"
        }
      },
      "attachments": [],
      "seedId": "observation-0035"
    },
    {
      "_id": {
        "$oid": "020000000000000000000024"
      },
      "animalId": {
        "$oid": "01000000000000000000000c"
      },
      "observedAt": {
        "$date": "2026-01-01T02:55:00.000Z"
      },
      "ranger": "ranger-4",
      "conditions": {
        "temperatureC": 25.5,
        "windKph": {
          "$numberInt": "15"
        }
      },
      "attachments": [],
      "seedId": "observation-0036"
    },
    {
      "_id": {
        "$oid": "020000000000000000000025"
      },
      "animalId": {
        "$oid": "010000000000000000000001"
      },
      "observedAt": {
        "$date": "2026-01-01T03:00:00.000Z"
      },
      "ranger": "ranger-1",
      "conditions": {
        "temperatureC": 26.5,
        "windKph": {
          "$numberInt": "16"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/37.jpg"
        }
      ],
      "seedId": "observation-0037"
    },
    {
      "_id": {
        "$oid": "020000000000000000000026"
      },
      "animalId": {
        "$oid": "010000000000000000000002"
      },
      "observedAt": {
        "$date": "2026-01-01T03:05:00.000Z"
      },
      "ranger": "ranger-2",
      "conditions": {
        "temperatureC": 27.5,
        "windKph": {
          "$numberInt": "17"
        }
      },
      "attachments": [],
      "seedId": "observation-0038"
    },
    {
      "_id": {
        "$oid": "020000000000000000000027"
      },
      "animalId": {
        "$oid": "010000000000000000000003"
      },
      "observedAt": {
        "$date": "2026-01-01T03:10:00.000Z"
      },
      "ranger": "ranger-3",
      "conditions": {
        "temperatureC": 28.5,
        "windKph": {
          "$numberInt": "18"
        }
      },
      "attachments": [],
      "seedId": "observation-0039"
    },
    {
      "_id": {
        "$oid": "020000000000000000000028"
      },
      "animalId": {
        "$oid": "010000000000000000000004"
      },
      "observedAt": {
        "$date": "2026-01-01T03:15:00.000Z"
      },
      "ranger": "ranger-4",
      "conditions": {
        "temperatureC": 29.5,
        "windKph": {
          "$numberInt": "19"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/40.jpg"
        }
      ],
      "seedId": "observation-0040"
    },
    {
      "_id": {
        "$oid": "020000000000000000000029"
      },
      "animalId": {
        "$oid": "010000000000000000000005"
      },
      "observedAt": {
        "$date": "2026-01-01T03:20:00.000Z"
      },
      "ranger": "ranger-1",
      "conditions": {
        "temperatureC": 20.5,
        "windKph": {
          "$numberInt": "0"
        }
      },
      "attachments": [],
      "seedId": "observation-0041"
    },
    {
      "_id": {
        "$oid": "02000000000000000000002a"
      },
      "animalId": {
        "$oid": "010000000000000000000006"
      },
      "observedAt": {
        "$date": "2026-01-01T03:25:00.000Z"
      },
      "ranger": "ranger-2",
      "conditions": {
        "temperatureC": 21.5,
        "windKph": {
          "$numberInt": "1"
        }
      },
      "attachments": [],
      "seedId": "observation-0042"
    },
    {
      "_id": {
        "$oid": "02000000000000000000002b"
      },
      "animalId": {
        "$oid": "010000000000000000000007"
      },
      "observedAt": {
        "$date": "2026-01-01T03:30:00.000Z"
      },
      "ranger": "ranger-3",
      "conditions": {
        "temperatureC": 22.5,
        "windKph": {
          "$numberInt": "2"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/43.jpg"
        }
      ],
      "seedId": "observation-0043"
    },
    {
      "_id": {
        "$oid": "02000000000000000000002c"
      },
      "animalId": {
        "$oid": "010000000000000000000008"
      },
      "observedAt": {
        "$date": "2026-01-01T03:35:00.000Z"
      },
      "ranger": "ranger-4",
      "conditions": {
        "temperatureC": 23.5,
        "windKph": {
          "$numberInt": "3"
        }
      },
      "attachments": [],
      "seedId": "observation-0044"
    },
    {
      "_id": {
        "$oid": "02000000000000000000002d"
      },
      "animalId": {
        "$oid": "010000000000000000000009"
      },
      "observedAt": {
        "$date": "2026-01-01T03:40:00.000Z"
      },
      "ranger": "ranger-1",
      "conditions": {
        "temperatureC": 24.5,
        "windKph": {
          "$numberInt": "4"
        }
      },
      "attachments": [],
      "seedId": "observation-0045"
    },
    {
      "_id": {
        "$oid": "02000000000000000000002e"
      },
      "animalId": {
        "$oid": "01000000000000000000000a"
      },
      "observedAt": {
        "$date": "2026-01-01T03:45:00.000Z"
      },
      "ranger": "ranger-2",
      "conditions": {
        "temperatureC": 25.5,
        "windKph": {
          "$numberInt": "5"
        }
      },
      "attachments": [
        {
          "kind": "photo",
          "uri": "s3://terra/46.jpg"
        }
      ],
      "seedId": "observation-0046"
    },
    {
      "_id": {
        "$oid": "02000000000000000000002f"
      },
      "animalId": {
        "$oid": "01000000000000000000000b"
      },
      "observedAt": {
        "$date": "2026-01-01T03:50:00.000Z"
      },
      "ranger": "ranger-3",
      "conditions": {
        "temperatureC": 26.5,
        "windKph": {
          "$numberInt": "6"
        }
      },
      "attachments": [],
      "seedId": "observation-0047"
    },
    {
      "_id": {
        "$oid": "020000000000000000000030"
      },
      "animalId": {
        "$oid": "01000000000000000000000c"
      },
      "observedAt": {
        "$date": "2026-01-01T03:55:00.000Z"
      },
      "ranger": "ranger-4",
      "conditions": {
        "temperatureC": 27.5,
        "windKph": {
          "$numberInt": "7"
        }
      },
      "attachments": [],
      "seedId": "observation-0048"
    }
  ],
  "telemetry": [
    {
      "_id": {
        "$oid": "030000000000000000000001"
      },
      "animalId": {
        "$oid": "010000000000000000000001"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:00:00.000Z"
      },
      "sequence": {
        "$numberLong": "1"
      },
      "batteryVoltage": 3.5,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0001"
    },
    {
      "_id": {
        "$oid": "030000000000000000000002"
      },
      "animalId": {
        "$oid": "010000000000000000000002"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:00:15.000Z"
      },
      "sequence": {
        "$numberLong": "2"
      },
      "batteryVoltage": 3.51,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0002"
    },
    {
      "_id": {
        "$oid": "030000000000000000000003"
      },
      "animalId": {
        "$oid": "010000000000000000000003"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:00:30.000Z"
      },
      "sequence": {
        "$numberLong": "3"
      },
      "batteryVoltage": 3.52,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0003"
    },
    {
      "_id": {
        "$oid": "030000000000000000000004"
      },
      "animalId": {
        "$oid": "010000000000000000000004"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:00:45.000Z"
      },
      "sequence": {
        "$numberLong": "4"
      },
      "batteryVoltage": 3.53,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0004"
    },
    {
      "_id": {
        "$oid": "030000000000000000000005"
      },
      "animalId": {
        "$oid": "010000000000000000000005"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:01:00.000Z"
      },
      "sequence": {
        "$numberLong": "5"
      },
      "batteryVoltage": 3.54,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0005"
    },
    {
      "_id": {
        "$oid": "030000000000000000000006"
      },
      "animalId": {
        "$oid": "010000000000000000000006"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:01:15.000Z"
      },
      "sequence": {
        "$numberLong": "6"
      },
      "batteryVoltage": 3.55,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0006"
    },
    {
      "_id": {
        "$oid": "030000000000000000000007"
      },
      "animalId": {
        "$oid": "010000000000000000000007"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:01:30.000Z"
      },
      "sequence": {
        "$numberLong": "7"
      },
      "batteryVoltage": 3.56,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0007"
    },
    {
      "_id": {
        "$oid": "030000000000000000000008"
      },
      "animalId": {
        "$oid": "010000000000000000000008"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:01:45.000Z"
      },
      "sequence": {
        "$numberLong": "8"
      },
      "batteryVoltage": 3.57,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0008"
    },
    {
      "_id": {
        "$oid": "030000000000000000000009"
      },
      "animalId": {
        "$oid": "010000000000000000000009"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:02:00.000Z"
      },
      "sequence": {
        "$numberLong": "9"
      },
      "batteryVoltage": 3.58,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0009"
    },
    {
      "_id": {
        "$oid": "03000000000000000000000a"
      },
      "animalId": {
        "$oid": "01000000000000000000000a"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:02:15.000Z"
      },
      "sequence": {
        "$numberLong": "10"
      },
      "batteryVoltage": 3.59,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0010"
    },
    {
      "_id": {
        "$oid": "03000000000000000000000b"
      },
      "animalId": {
        "$oid": "01000000000000000000000b"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:02:30.000Z"
      },
      "sequence": {
        "$numberLong": "11"
      },
      "batteryVoltage": 3.6,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0011"
    },
    {
      "_id": {
        "$oid": "03000000000000000000000c"
      },
      "animalId": {
        "$oid": "01000000000000000000000c"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:02:45.000Z"
      },
      "sequence": {
        "$numberLong": "12"
      },
      "batteryVoltage": 3.61,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0012"
    },
    {
      "_id": {
        "$oid": "03000000000000000000000d"
      },
      "animalId": {
        "$oid": "010000000000000000000001"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:03:00.000Z"
      },
      "sequence": {
        "$numberLong": "13"
      },
      "batteryVoltage": 3.62,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0013"
    },
    {
      "_id": {
        "$oid": "03000000000000000000000e"
      },
      "animalId": {
        "$oid": "010000000000000000000002"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:03:15.000Z"
      },
      "sequence": {
        "$numberLong": "14"
      },
      "batteryVoltage": 3.63,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0014"
    },
    {
      "_id": {
        "$oid": "03000000000000000000000f"
      },
      "animalId": {
        "$oid": "010000000000000000000003"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:03:30.000Z"
      },
      "sequence": {
        "$numberLong": "15"
      },
      "batteryVoltage": 3.64,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0015"
    },
    {
      "_id": {
        "$oid": "030000000000000000000010"
      },
      "animalId": {
        "$oid": "010000000000000000000004"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:03:45.000Z"
      },
      "sequence": {
        "$numberLong": "16"
      },
      "batteryVoltage": 3.65,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0016"
    },
    {
      "_id": {
        "$oid": "030000000000000000000011"
      },
      "animalId": {
        "$oid": "010000000000000000000005"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:04:00.000Z"
      },
      "sequence": {
        "$numberLong": "17"
      },
      "batteryVoltage": 3.66,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0017"
    },
    {
      "_id": {
        "$oid": "030000000000000000000012"
      },
      "animalId": {
        "$oid": "010000000000000000000006"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:04:15.000Z"
      },
      "sequence": {
        "$numberLong": "18"
      },
      "batteryVoltage": 3.67,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0018"
    },
    {
      "_id": {
        "$oid": "030000000000000000000013"
      },
      "animalId": {
        "$oid": "010000000000000000000007"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:04:30.000Z"
      },
      "sequence": {
        "$numberLong": "19"
      },
      "batteryVoltage": 3.68,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0019"
    },
    {
      "_id": {
        "$oid": "030000000000000000000014"
      },
      "animalId": {
        "$oid": "010000000000000000000008"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:04:45.000Z"
      },
      "sequence": {
        "$numberLong": "20"
      },
      "batteryVoltage": 3.69,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0020"
    },
    {
      "_id": {
        "$oid": "030000000000000000000015"
      },
      "animalId": {
        "$oid": "010000000000000000000009"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:05:00.000Z"
      },
      "sequence": {
        "$numberLong": "21"
      },
      "batteryVoltage": 3.5,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0021"
    },
    {
      "_id": {
        "$oid": "030000000000000000000016"
      },
      "animalId": {
        "$oid": "01000000000000000000000a"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:05:15.000Z"
      },
      "sequence": {
        "$numberLong": "22"
      },
      "batteryVoltage": 3.51,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0022"
    },
    {
      "_id": {
        "$oid": "030000000000000000000017"
      },
      "animalId": {
        "$oid": "01000000000000000000000b"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:05:30.000Z"
      },
      "sequence": {
        "$numberLong": "23"
      },
      "batteryVoltage": 3.52,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0023"
    },
    {
      "_id": {
        "$oid": "030000000000000000000018"
      },
      "animalId": {
        "$oid": "01000000000000000000000c"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:05:45.000Z"
      },
      "sequence": {
        "$numberLong": "24"
      },
      "batteryVoltage": 3.53,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0024"
    },
    {
      "_id": {
        "$oid": "030000000000000000000019"
      },
      "animalId": {
        "$oid": "010000000000000000000001"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:06:00.000Z"
      },
      "sequence": {
        "$numberLong": "25"
      },
      "batteryVoltage": 3.54,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0025"
    },
    {
      "_id": {
        "$oid": "03000000000000000000001a"
      },
      "animalId": {
        "$oid": "010000000000000000000002"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:06:15.000Z"
      },
      "sequence": {
        "$numberLong": "26"
      },
      "batteryVoltage": 3.55,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0026"
    },
    {
      "_id": {
        "$oid": "03000000000000000000001b"
      },
      "animalId": {
        "$oid": "010000000000000000000003"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:06:30.000Z"
      },
      "sequence": {
        "$numberLong": "27"
      },
      "batteryVoltage": 3.56,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0027"
    },
    {
      "_id": {
        "$oid": "03000000000000000000001c"
      },
      "animalId": {
        "$oid": "010000000000000000000004"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:06:45.000Z"
      },
      "sequence": {
        "$numberLong": "28"
      },
      "batteryVoltage": 3.57,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0028"
    },
    {
      "_id": {
        "$oid": "03000000000000000000001d"
      },
      "animalId": {
        "$oid": "010000000000000000000005"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:07:00.000Z"
      },
      "sequence": {
        "$numberLong": "29"
      },
      "batteryVoltage": 3.58,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0029"
    },
    {
      "_id": {
        "$oid": "03000000000000000000001e"
      },
      "animalId": {
        "$oid": "010000000000000000000006"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:07:15.000Z"
      },
      "sequence": {
        "$numberLong": "30"
      },
      "batteryVoltage": 3.59,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0030"
    },
    {
      "_id": {
        "$oid": "03000000000000000000001f"
      },
      "animalId": {
        "$oid": "010000000000000000000007"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:07:30.000Z"
      },
      "sequence": {
        "$numberLong": "31"
      },
      "batteryVoltage": 3.6,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0031"
    },
    {
      "_id": {
        "$oid": "030000000000000000000020"
      },
      "animalId": {
        "$oid": "010000000000000000000008"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:07:45.000Z"
      },
      "sequence": {
        "$numberLong": "32"
      },
      "batteryVoltage": 3.61,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0032"
    },
    {
      "_id": {
        "$oid": "030000000000000000000021"
      },
      "animalId": {
        "$oid": "010000000000000000000009"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:08:00.000Z"
      },
      "sequence": {
        "$numberLong": "33"
      },
      "batteryVoltage": 3.62,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0033"
    },
    {
      "_id": {
        "$oid": "030000000000000000000022"
      },
      "animalId": {
        "$oid": "01000000000000000000000a"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:08:15.000Z"
      },
      "sequence": {
        "$numberLong": "34"
      },
      "batteryVoltage": 3.63,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0034"
    },
    {
      "_id": {
        "$oid": "030000000000000000000023"
      },
      "animalId": {
        "$oid": "01000000000000000000000b"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:08:30.000Z"
      },
      "sequence": {
        "$numberLong": "35"
      },
      "batteryVoltage": 3.64,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0035"
    },
    {
      "_id": {
        "$oid": "030000000000000000000024"
      },
      "animalId": {
        "$oid": "01000000000000000000000c"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:08:45.000Z"
      },
      "sequence": {
        "$numberLong": "36"
      },
      "batteryVoltage": 3.65,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0036"
    },
    {
      "_id": {
        "$oid": "030000000000000000000025"
      },
      "animalId": {
        "$oid": "010000000000000000000001"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:09:00.000Z"
      },
      "sequence": {
        "$numberLong": "37"
      },
      "batteryVoltage": 3.66,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0037"
    },
    {
      "_id": {
        "$oid": "030000000000000000000026"
      },
      "animalId": {
        "$oid": "010000000000000000000002"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:09:15.000Z"
      },
      "sequence": {
        "$numberLong": "38"
      },
      "batteryVoltage": 3.67,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0038"
    },
    {
      "_id": {
        "$oid": "030000000000000000000027"
      },
      "animalId": {
        "$oid": "010000000000000000000003"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:09:30.000Z"
      },
      "sequence": {
        "$numberLong": "39"
      },
      "batteryVoltage": 3.68,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0039"
    },
    {
      "_id": {
        "$oid": "030000000000000000000028"
      },
      "animalId": {
        "$oid": "010000000000000000000004"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:09:45.000Z"
      },
      "sequence": {
        "$numberLong": "40"
      },
      "batteryVoltage": 3.69,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0040"
    },
    {
      "_id": {
        "$oid": "030000000000000000000029"
      },
      "animalId": {
        "$oid": "010000000000000000000005"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:10:00.000Z"
      },
      "sequence": {
        "$numberLong": "41"
      },
      "batteryVoltage": 3.5,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0041"
    },
    {
      "_id": {
        "$oid": "03000000000000000000002a"
      },
      "animalId": {
        "$oid": "010000000000000000000006"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:10:15.000Z"
      },
      "sequence": {
        "$numberLong": "42"
      },
      "batteryVoltage": 3.51,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0042"
    },
    {
      "_id": {
        "$oid": "03000000000000000000002b"
      },
      "animalId": {
        "$oid": "010000000000000000000007"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:10:30.000Z"
      },
      "sequence": {
        "$numberLong": "43"
      },
      "batteryVoltage": 3.52,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0043"
    },
    {
      "_id": {
        "$oid": "03000000000000000000002c"
      },
      "animalId": {
        "$oid": "010000000000000000000008"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:10:45.000Z"
      },
      "sequence": {
        "$numberLong": "44"
      },
      "batteryVoltage": 3.53,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0044"
    },
    {
      "_id": {
        "$oid": "03000000000000000000002d"
      },
      "animalId": {
        "$oid": "010000000000000000000009"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:11:00.000Z"
      },
      "sequence": {
        "$numberLong": "45"
      },
      "batteryVoltage": 3.54,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0045"
    },
    {
      "_id": {
        "$oid": "03000000000000000000002e"
      },
      "animalId": {
        "$oid": "01000000000000000000000a"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:11:15.000Z"
      },
      "sequence": {
        "$numberLong": "46"
      },
      "batteryVoltage": 3.55,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0046"
    },
    {
      "_id": {
        "$oid": "03000000000000000000002f"
      },
      "animalId": {
        "$oid": "01000000000000000000000b"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:11:30.000Z"
      },
      "sequence": {
        "$numberLong": "47"
      },
      "batteryVoltage": 3.56,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0047"
    },
    {
      "_id": {
        "$oid": "030000000000000000000030"
      },
      "animalId": {
        "$oid": "01000000000000000000000c"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:11:45.000Z"
      },
      "sequence": {
        "$numberLong": "48"
      },
      "batteryVoltage": 3.57,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0048"
    },
    {
      "_id": {
        "$oid": "030000000000000000000031"
      },
      "animalId": {
        "$oid": "010000000000000000000001"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:12:00.000Z"
      },
      "sequence": {
        "$numberLong": "49"
      },
      "batteryVoltage": 3.58,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0049"
    },
    {
      "_id": {
        "$oid": "030000000000000000000032"
      },
      "animalId": {
        "$oid": "010000000000000000000002"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:12:15.000Z"
      },
      "sequence": {
        "$numberLong": "50"
      },
      "batteryVoltage": 3.59,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0050"
    },
    {
      "_id": {
        "$oid": "030000000000000000000033"
      },
      "animalId": {
        "$oid": "010000000000000000000003"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:12:30.000Z"
      },
      "sequence": {
        "$numberLong": "51"
      },
      "batteryVoltage": 3.6,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0051"
    },
    {
      "_id": {
        "$oid": "030000000000000000000034"
      },
      "animalId": {
        "$oid": "010000000000000000000004"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:12:45.000Z"
      },
      "sequence": {
        "$numberLong": "52"
      },
      "batteryVoltage": 3.61,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0052"
    },
    {
      "_id": {
        "$oid": "030000000000000000000035"
      },
      "animalId": {
        "$oid": "010000000000000000000005"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:13:00.000Z"
      },
      "sequence": {
        "$numberLong": "53"
      },
      "batteryVoltage": 3.62,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0053"
    },
    {
      "_id": {
        "$oid": "030000000000000000000036"
      },
      "animalId": {
        "$oid": "010000000000000000000006"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:13:15.000Z"
      },
      "sequence": {
        "$numberLong": "54"
      },
      "batteryVoltage": 3.63,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0054"
    },
    {
      "_id": {
        "$oid": "030000000000000000000037"
      },
      "animalId": {
        "$oid": "010000000000000000000007"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:13:30.000Z"
      },
      "sequence": {
        "$numberLong": "55"
      },
      "batteryVoltage": 3.64,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0055"
    },
    {
      "_id": {
        "$oid": "030000000000000000000038"
      },
      "animalId": {
        "$oid": "010000000000000000000008"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:13:45.000Z"
      },
      "sequence": {
        "$numberLong": "56"
      },
      "batteryVoltage": 3.65,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0056"
    },
    {
      "_id": {
        "$oid": "030000000000000000000039"
      },
      "animalId": {
        "$oid": "010000000000000000000009"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:14:00.000Z"
      },
      "sequence": {
        "$numberLong": "57"
      },
      "batteryVoltage": 3.66,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0057"
    },
    {
      "_id": {
        "$oid": "03000000000000000000003a"
      },
      "animalId": {
        "$oid": "01000000000000000000000a"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:14:15.000Z"
      },
      "sequence": {
        "$numberLong": "58"
      },
      "batteryVoltage": 3.67,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0058"
    },
    {
      "_id": {
        "$oid": "03000000000000000000003b"
      },
      "animalId": {
        "$oid": "01000000000000000000000b"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:14:30.000Z"
      },
      "sequence": {
        "$numberLong": "59"
      },
      "batteryVoltage": 3.68,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0059"
    },
    {
      "_id": {
        "$oid": "03000000000000000000003c"
      },
      "animalId": {
        "$oid": "01000000000000000000000c"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:14:45.000Z"
      },
      "sequence": {
        "$numberLong": "60"
      },
      "batteryVoltage": 3.69,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0060"
    },
    {
      "_id": {
        "$oid": "03000000000000000000003d"
      },
      "animalId": {
        "$oid": "010000000000000000000001"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:15:00.000Z"
      },
      "sequence": {
        "$numberLong": "61"
      },
      "batteryVoltage": 3.5,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0061"
    },
    {
      "_id": {
        "$oid": "03000000000000000000003e"
      },
      "animalId": {
        "$oid": "010000000000000000000002"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:15:15.000Z"
      },
      "sequence": {
        "$numberLong": "62"
      },
      "batteryVoltage": 3.51,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0062"
    },
    {
      "_id": {
        "$oid": "03000000000000000000003f"
      },
      "animalId": {
        "$oid": "010000000000000000000003"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:15:30.000Z"
      },
      "sequence": {
        "$numberLong": "63"
      },
      "batteryVoltage": 3.52,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0063"
    },
    {
      "_id": {
        "$oid": "030000000000000000000040"
      },
      "animalId": {
        "$oid": "010000000000000000000004"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:15:45.000Z"
      },
      "sequence": {
        "$numberLong": "64"
      },
      "batteryVoltage": 3.53,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0064"
    },
    {
      "_id": {
        "$oid": "030000000000000000000041"
      },
      "animalId": {
        "$oid": "010000000000000000000005"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:16:00.000Z"
      },
      "sequence": {
        "$numberLong": "65"
      },
      "batteryVoltage": 3.54,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0065"
    },
    {
      "_id": {
        "$oid": "030000000000000000000042"
      },
      "animalId": {
        "$oid": "010000000000000000000006"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:16:15.000Z"
      },
      "sequence": {
        "$numberLong": "66"
      },
      "batteryVoltage": 3.55,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0066"
    },
    {
      "_id": {
        "$oid": "030000000000000000000043"
      },
      "animalId": {
        "$oid": "010000000000000000000007"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:16:30.000Z"
      },
      "sequence": {
        "$numberLong": "67"
      },
      "batteryVoltage": 3.56,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0067"
    },
    {
      "_id": {
        "$oid": "030000000000000000000044"
      },
      "animalId": {
        "$oid": "010000000000000000000008"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:16:45.000Z"
      },
      "sequence": {
        "$numberLong": "68"
      },
      "batteryVoltage": 3.57,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0068"
    },
    {
      "_id": {
        "$oid": "030000000000000000000045"
      },
      "animalId": {
        "$oid": "010000000000000000000009"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:17:00.000Z"
      },
      "sequence": {
        "$numberLong": "69"
      },
      "batteryVoltage": 3.58,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0069"
    },
    {
      "_id": {
        "$oid": "030000000000000000000046"
      },
      "animalId": {
        "$oid": "01000000000000000000000a"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:17:15.000Z"
      },
      "sequence": {
        "$numberLong": "70"
      },
      "batteryVoltage": 3.59,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0070"
    },
    {
      "_id": {
        "$oid": "030000000000000000000047"
      },
      "animalId": {
        "$oid": "01000000000000000000000b"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:17:30.000Z"
      },
      "sequence": {
        "$numberLong": "71"
      },
      "batteryVoltage": 3.6,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0071"
    },
    {
      "_id": {
        "$oid": "030000000000000000000048"
      },
      "animalId": {
        "$oid": "01000000000000000000000c"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:17:45.000Z"
      },
      "sequence": {
        "$numberLong": "72"
      },
      "batteryVoltage": 3.61,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0072"
    },
    {
      "_id": {
        "$oid": "030000000000000000000049"
      },
      "animalId": {
        "$oid": "010000000000000000000001"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:18:00.000Z"
      },
      "sequence": {
        "$numberLong": "73"
      },
      "batteryVoltage": 3.62,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0073"
    },
    {
      "_id": {
        "$oid": "03000000000000000000004a"
      },
      "animalId": {
        "$oid": "010000000000000000000002"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:18:15.000Z"
      },
      "sequence": {
        "$numberLong": "74"
      },
      "batteryVoltage": 3.63,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0074"
    },
    {
      "_id": {
        "$oid": "03000000000000000000004b"
      },
      "animalId": {
        "$oid": "010000000000000000000003"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:18:30.000Z"
      },
      "sequence": {
        "$numberLong": "75"
      },
      "batteryVoltage": 3.64,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0075"
    },
    {
      "_id": {
        "$oid": "03000000000000000000004c"
      },
      "animalId": {
        "$oid": "010000000000000000000004"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:18:45.000Z"
      },
      "sequence": {
        "$numberLong": "76"
      },
      "batteryVoltage": 3.65,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0076"
    },
    {
      "_id": {
        "$oid": "03000000000000000000004d"
      },
      "animalId": {
        "$oid": "010000000000000000000005"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:19:00.000Z"
      },
      "sequence": {
        "$numberLong": "77"
      },
      "batteryVoltage": 3.66,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0077"
    },
    {
      "_id": {
        "$oid": "03000000000000000000004e"
      },
      "animalId": {
        "$oid": "010000000000000000000006"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:19:15.000Z"
      },
      "sequence": {
        "$numberLong": "78"
      },
      "batteryVoltage": 3.67,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0078"
    },
    {
      "_id": {
        "$oid": "03000000000000000000004f"
      },
      "animalId": {
        "$oid": "010000000000000000000007"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:19:30.000Z"
      },
      "sequence": {
        "$numberLong": "79"
      },
      "batteryVoltage": 3.68,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0079"
    },
    {
      "_id": {
        "$oid": "030000000000000000000050"
      },
      "animalId": {
        "$oid": "010000000000000000000008"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:19:45.000Z"
      },
      "sequence": {
        "$numberLong": "80"
      },
      "batteryVoltage": 3.69,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0080"
    },
    {
      "_id": {
        "$oid": "030000000000000000000051"
      },
      "animalId": {
        "$oid": "010000000000000000000009"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:20:00.000Z"
      },
      "sequence": {
        "$numberLong": "81"
      },
      "batteryVoltage": 3.5,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0081"
    },
    {
      "_id": {
        "$oid": "030000000000000000000052"
      },
      "animalId": {
        "$oid": "01000000000000000000000a"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:20:15.000Z"
      },
      "sequence": {
        "$numberLong": "82"
      },
      "batteryVoltage": 3.51,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0082"
    },
    {
      "_id": {
        "$oid": "030000000000000000000053"
      },
      "animalId": {
        "$oid": "01000000000000000000000b"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:20:30.000Z"
      },
      "sequence": {
        "$numberLong": "83"
      },
      "batteryVoltage": 3.52,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0083"
    },
    {
      "_id": {
        "$oid": "030000000000000000000054"
      },
      "animalId": {
        "$oid": "01000000000000000000000c"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:20:45.000Z"
      },
      "sequence": {
        "$numberLong": "84"
      },
      "batteryVoltage": 3.53,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0084"
    },
    {
      "_id": {
        "$oid": "030000000000000000000055"
      },
      "animalId": {
        "$oid": "010000000000000000000001"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:21:00.000Z"
      },
      "sequence": {
        "$numberLong": "85"
      },
      "batteryVoltage": 3.54,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0085"
    },
    {
      "_id": {
        "$oid": "030000000000000000000056"
      },
      "animalId": {
        "$oid": "010000000000000000000002"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:21:15.000Z"
      },
      "sequence": {
        "$numberLong": "86"
      },
      "batteryVoltage": 3.55,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0086"
    },
    {
      "_id": {
        "$oid": "030000000000000000000057"
      },
      "animalId": {
        "$oid": "010000000000000000000003"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:21:30.000Z"
      },
      "sequence": {
        "$numberLong": "87"
      },
      "batteryVoltage": 3.56,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0087"
    },
    {
      "_id": {
        "$oid": "030000000000000000000058"
      },
      "animalId": {
        "$oid": "010000000000000000000004"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:21:45.000Z"
      },
      "sequence": {
        "$numberLong": "88"
      },
      "batteryVoltage": 3.57,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0088"
    },
    {
      "_id": {
        "$oid": "030000000000000000000059"
      },
      "animalId": {
        "$oid": "010000000000000000000005"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:22:00.000Z"
      },
      "sequence": {
        "$numberLong": "89"
      },
      "batteryVoltage": 3.58,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0089"
    },
    {
      "_id": {
        "$oid": "03000000000000000000005a"
      },
      "animalId": {
        "$oid": "010000000000000000000006"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:22:15.000Z"
      },
      "sequence": {
        "$numberLong": "90"
      },
      "batteryVoltage": 3.59,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0090"
    },
    {
      "_id": {
        "$oid": "03000000000000000000005b"
      },
      "animalId": {
        "$oid": "010000000000000000000007"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:22:30.000Z"
      },
      "sequence": {
        "$numberLong": "91"
      },
      "batteryVoltage": 3.6,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0091"
    },
    {
      "_id": {
        "$oid": "03000000000000000000005c"
      },
      "animalId": {
        "$oid": "010000000000000000000008"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:22:45.000Z"
      },
      "sequence": {
        "$numberLong": "92"
      },
      "batteryVoltage": 3.61,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0092"
    },
    {
      "_id": {
        "$oid": "03000000000000000000005d"
      },
      "animalId": {
        "$oid": "010000000000000000000009"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:23:00.000Z"
      },
      "sequence": {
        "$numberLong": "93"
      },
      "batteryVoltage": 3.62,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0093"
    },
    {
      "_id": {
        "$oid": "03000000000000000000005e"
      },
      "animalId": {
        "$oid": "01000000000000000000000a"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:23:15.000Z"
      },
      "sequence": {
        "$numberLong": "94"
      },
      "batteryVoltage": 3.63,
      "location": {
        "type": "Point",
        "coordinates": [
          37.2535,
          -2.6456
        ]
      },
      "seedId": "telemetry-0094"
    },
    {
      "_id": {
        "$oid": "03000000000000000000005f"
      },
      "animalId": {
        "$oid": "01000000000000000000000b"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:23:30.000Z"
      },
      "sequence": {
        "$numberLong": "95"
      },
      "batteryVoltage": 3.64,
      "location": {
        "type": "Point",
        "coordinates": [
          35.1439,
          -1.4061
        ]
      },
      "seedId": "telemetry-0095"
    },
    {
      "_id": {
        "$oid": "030000000000000000000060"
      },
      "animalId": {
        "$oid": "01000000000000000000000c"
      },
      "recordedAt": {
        "$date": "2026-01-01T00:23:45.000Z"
      },
      "sequence": {
        "$numberLong": "96"
      },
      "batteryVoltage": 3.65,
      "location": {
        "type": "Point",
        "coordinates": [
          34.8333,
          -2.3333
        ]
      },
      "seedId": "telemetry-0096"
    }
  ],
  "ranger_notes": [
    {
      "_id": {
        "$oid": "040000000000000000000001"
      },
      "animalId": {
        "$oid": "010000000000000000000001"
      },
      "text": "Routine note 1",
      "createdAt": {
        "$date": "2026-01-01T00:00:00.000Z"
      },
      "seedId": "note-001"
    },
    {
      "_id": {
        "$oid": "040000000000000000000002"
      },
      "animalId": {
        "$oid": "010000000000000000000002"
      },
      "text": "Routine note 2",
      "createdAt": {
        "$date": "2026-01-01T01:00:00.000Z"
      },
      "seedId": "note-002"
    },
    {
      "_id": {
        "$oid": "040000000000000000000003"
      },
      "animalId": {
        "$oid": "010000000000000000000003"
      },
      "text": "Routine note 3",
      "createdAt": {
        "$date": "2026-01-01T02:00:00.000Z"
      },
      "seedId": "note-003"
    },
    {
      "_id": {
        "$oid": "040000000000000000000004"
      },
      "animalId": {
        "$oid": "010000000000000000000004"
      },
      "text": "Routine note 4",
      "createdAt": {
        "$date": "2026-01-01T03:00:00.000Z"
      },
      "seedId": "note-004"
    },
    {
      "_id": {
        "$oid": "040000000000000000000005"
      },
      "animalId": {
        "$oid": "010000000000000000000005"
      },
      "text": "Routine note 5",
      "createdAt": {
        "$date": "2026-01-01T04:00:00.000Z"
      },
      "seedId": "note-005"
    },
    {
      "_id": {
        "$oid": "040000000000000000000006"
      },
      "animalId": {
        "$oid": "010000000000000000000006"
      },
      "text": "Routine note 6",
      "createdAt": {
        "$date": "2026-01-01T05:00:00.000Z"
      },
      "seedId": "note-006"
    }
  ],
  "wide_attributes": [
    {
      "_id": {
        "$oid": "050000000000000000000001"
      },
      "seedId": "wide-001",
      "attribute_001": "value-001-001",
      "attribute_002": "value-001-002",
      "attribute_003": "value-001-003",
      "attribute_004": "value-001-004",
      "attribute_005": "value-001-005",
      "attribute_006": "value-001-006",
      "attribute_007": "value-001-007",
      "attribute_008": "value-001-008",
      "attribute_009": "value-001-009",
      "attribute_010": "value-001-010",
      "attribute_011": "value-001-011",
      "attribute_012": "value-001-012",
      "attribute_013": "value-001-013",
      "attribute_014": "value-001-014",
      "attribute_015": "value-001-015",
      "attribute_016": "value-001-016",
      "attribute_017": "value-001-017",
      "attribute_018": "value-001-018",
      "attribute_019": "value-001-019",
      "attribute_020": "value-001-020",
      "attribute_021": "value-001-021",
      "attribute_022": "value-001-022",
      "attribute_023": "value-001-023",
      "attribute_024": "value-001-024",
      "attribute_025": "value-001-025",
      "attribute_026": "value-001-026",
      "attribute_027": "value-001-027",
      "attribute_028": "value-001-028",
      "attribute_029": "value-001-029",
      "attribute_030": "value-001-030",
      "attribute_031": "value-001-031",
      "attribute_032": "value-001-032",
      "attribute_033": "value-001-033",
      "attribute_034": "value-001-034",
      "attribute_035": "value-001-035",
      "attribute_036": "value-001-036",
      "attribute_037": "value-001-037",
      "attribute_038": "value-001-038",
      "attribute_039": "value-001-039",
      "attribute_040": "value-001-040",
      "attribute_041": "value-001-041",
      "attribute_042": "value-001-042",
      "attribute_043": "value-001-043",
      "attribute_044": "value-001-044",
      "attribute_045": "value-001-045",
      "attribute_046": "value-001-046",
      "attribute_047": "value-001-047",
      "attribute_048": "value-001-048",
      "attribute_049": "value-001-049",
      "attribute_050": "value-001-050",
      "attribute_051": "value-001-051",
      "attribute_052": "value-001-052",
      "attribute_053": "value-001-053",
      "attribute_054": "value-001-054",
      "attribute_055": "value-001-055",
      "attribute_056": "value-001-056",
      "attribute_057": "value-001-057",
      "attribute_058": "value-001-058",
      "attribute_059": "value-001-059",
      "attribute_060": "value-001-060",
      "attribute_061": "value-001-061",
      "attribute_062": "value-001-062",
      "attribute_063": "value-001-063",
      "attribute_064": "value-001-064",
      "attribute_065": "value-001-065",
      "attribute_066": "value-001-066",
      "attribute_067": "value-001-067",
      "attribute_068": "value-001-068",
      "attribute_069": "value-001-069",
      "attribute_070": "value-001-070",
      "attribute_071": "value-001-071",
      "attribute_072": "value-001-072",
      "attribute_073": "value-001-073",
      "attribute_074": "value-001-074",
      "attribute_075": "value-001-075",
      "attribute_076": "value-001-076",
      "attribute_077": "value-001-077",
      "attribute_078": "value-001-078",
      "attribute_079": "value-001-079",
      "attribute_080": "value-001-080",
      "attribute_081": "value-001-081",
      "attribute_082": "value-001-082",
      "attribute_083": "value-001-083",
      "attribute_084": "value-001-084",
      "attribute_085": "value-001-085",
      "attribute_086": "value-001-086",
      "attribute_087": "value-001-087",
      "attribute_088": "value-001-088",
      "attribute_089": "value-001-089",
      "attribute_090": "value-001-090",
      "attribute_091": "value-001-091",
      "attribute_092": "value-001-092",
      "attribute_093": "value-001-093",
      "attribute_094": "value-001-094",
      "attribute_095": "value-001-095",
      "attribute_096": "value-001-096",
      "attribute_097": "value-001-097",
      "attribute_098": "value-001-098",
      "attribute_099": "value-001-099",
      "attribute_100": "value-001-100",
      "attribute_101": "value-001-101",
      "attribute_102": "value-001-102",
      "attribute_103": "value-001-103",
      "attribute_104": "value-001-104",
      "attribute_105": "value-001-105",
      "attribute_106": "value-001-106",
      "attribute_107": "value-001-107",
      "attribute_108": "value-001-108",
      "attribute_109": "value-001-109",
      "attribute_110": "value-001-110",
      "attribute_111": "value-001-111",
      "attribute_112": "value-001-112",
      "attribute_113": "value-001-113",
      "attribute_114": "value-001-114",
      "attribute_115": "value-001-115",
      "attribute_116": "value-001-116",
      "attribute_117": "value-001-117",
      "attribute_118": "value-001-118",
      "attribute_119": "value-001-119",
      "attribute_120": "value-001-120",
      "attribute_121": "value-001-121",
      "attribute_122": "value-001-122",
      "attribute_123": "value-001-123",
      "attribute_124": "value-001-124",
      "attribute_125": "value-001-125",
      "attribute_126": "value-001-126",
      "attribute_127": "value-001-127",
      "attribute_128": "value-001-128",
      "attribute_129": "value-001-129",
      "attribute_130": "value-001-130",
      "attribute_131": "value-001-131",
      "attribute_132": "value-001-132",
      "attribute_133": "value-001-133",
      "attribute_134": "value-001-134",
      "attribute_135": "value-001-135",
      "attribute_136": "value-001-136",
      "attribute_137": "value-001-137",
      "attribute_138": "value-001-138",
      "attribute_139": "value-001-139",
      "attribute_140": "value-001-140",
      "attribute_141": "value-001-141",
      "attribute_142": "value-001-142",
      "attribute_143": "value-001-143",
      "attribute_144": "value-001-144",
      "attribute_145": "value-001-145",
      "attribute_146": "value-001-146",
      "attribute_147": "value-001-147",
      "attribute_148": "value-001-148",
      "attribute_149": "value-001-149",
      "attribute_150": "value-001-150",
      "attribute_151": "value-001-151",
      "attribute_152": "value-001-152",
      "attribute_153": "value-001-153",
      "attribute_154": "value-001-154",
      "attribute_155": "value-001-155",
      "attribute_156": "value-001-156",
      "attribute_157": "value-001-157",
      "attribute_158": "value-001-158",
      "attribute_159": "value-001-159",
      "attribute_160": "value-001-160",
      "attribute_161": "value-001-161",
      "attribute_162": "value-001-162",
      "attribute_163": "value-001-163",
      "attribute_164": "value-001-164",
      "attribute_165": "value-001-165",
      "attribute_166": "value-001-166",
      "attribute_167": "value-001-167",
      "attribute_168": "value-001-168",
      "attribute_169": "value-001-169",
      "attribute_170": "value-001-170",
      "attribute_171": "value-001-171",
      "attribute_172": "value-001-172",
      "attribute_173": "value-001-173",
      "attribute_174": "value-001-174",
      "attribute_175": "value-001-175",
      "attribute_176": "value-001-176",
      "attribute_177": "value-001-177",
      "attribute_178": "value-001-178",
      "attribute_179": "value-001-179",
      "attribute_180": "value-001-180",
      "attribute_181": "value-001-181",
      "attribute_182": "value-001-182",
      "attribute_183": "value-001-183",
      "attribute_184": "value-001-184",
      "attribute_185": "value-001-185",
      "attribute_186": "value-001-186",
      "attribute_187": "value-001-187",
      "attribute_188": "value-001-188",
      "attribute_189": "value-001-189",
      "attribute_190": "value-001-190",
      "attribute_191": "value-001-191",
      "attribute_192": "value-001-192",
      "attribute_193": "value-001-193",
      "attribute_194": "value-001-194",
      "attribute_195": "value-001-195",
      "attribute_196": "value-001-196",
      "attribute_197": "value-001-197",
      "attribute_198": "value-001-198",
      "attribute_199": "value-001-199",
      "attribute_200": "value-001-200",
      "attribute_201": "value-001-201",
      "attribute_202": "value-001-202",
      "attribute_203": "value-001-203",
      "attribute_204": "value-001-204",
      "attribute_205": "value-001-205",
      "attribute_206": "value-001-206",
      "attribute_207": "value-001-207",
      "attribute_208": "value-001-208",
      "attribute_209": "value-001-209",
      "attribute_210": "value-001-210",
      "attribute_211": "value-001-211",
      "attribute_212": "value-001-212",
      "attribute_213": "value-001-213",
      "attribute_214": "value-001-214",
      "attribute_215": "value-001-215",
      "attribute_216": "value-001-216",
      "attribute_217": "value-001-217",
      "attribute_218": "value-001-218",
      "attribute_219": "value-001-219",
      "attribute_220": "value-001-220",
      "attribute_221": "value-001-221",
      "attribute_222": "value-001-222",
      "attribute_223": "value-001-223",
      "attribute_224": "value-001-224",
      "attribute_225": "value-001-225",
      "attribute_226": "value-001-226",
      "attribute_227": "value-001-227",
      "attribute_228": "value-001-228",
      "attribute_229": "value-001-229",
      "attribute_230": "value-001-230",
      "attribute_231": "value-001-231",
      "attribute_232": "value-001-232",
      "attribute_233": "value-001-233",
      "attribute_234": "value-001-234",
      "attribute_235": "value-001-235",
      "attribute_236": "value-001-236",
      "attribute_237": "value-001-237",
      "attribute_238": "value-001-238",
      "attribute_239": "value-001-239",
      "attribute_240": "value-001-240",
      "attribute_241": "value-001-241",
      "attribute_242": "value-001-242",
      "attribute_243": "value-001-243",
      "attribute_244": "value-001-244",
      "attribute_245": "value-001-245",
      "attribute_246": "value-001-246",
      "attribute_247": "value-001-247",
      "attribute_248": "value-001-248",
      "attribute_249": "value-001-249",
      "attribute_250": "value-001-250",
      "attribute_251": "value-001-251",
      "attribute_252": "value-001-252",
      "attribute_253": "value-001-253",
      "attribute_254": "value-001-254",
      "attribute_255": "value-001-255",
      "attribute_256": "value-001-256",
      "attribute_257": "value-001-257",
      "attribute_258": "value-001-258",
      "attribute_259": "value-001-259",
      "attribute_260": "value-001-260",
      "attribute_261": "value-001-261",
      "attribute_262": "value-001-262",
      "attribute_263": "value-001-263",
      "attribute_264": "value-001-264",
      "attribute_265": "value-001-265",
      "attribute_266": "value-001-266",
      "attribute_267": "value-001-267",
      "attribute_268": "value-001-268",
      "attribute_269": "value-001-269",
      "attribute_270": "value-001-270",
      "attribute_271": "value-001-271",
      "attribute_272": "value-001-272",
      "attribute_273": "value-001-273",
      "attribute_274": "value-001-274",
      "attribute_275": "value-001-275",
      "attribute_276": "value-001-276",
      "attribute_277": "value-001-277",
      "attribute_278": "value-001-278",
      "attribute_279": "value-001-279",
      "attribute_280": "value-001-280",
      "attribute_281": "value-001-281",
      "attribute_282": "value-001-282",
      "attribute_283": "value-001-283",
      "attribute_284": "value-001-284",
      "attribute_285": "value-001-285",
      "attribute_286": "value-001-286",
      "attribute_287": "value-001-287",
      "attribute_288": "value-001-288",
      "attribute_289": "value-001-289",
      "attribute_290": "value-001-290",
      "attribute_291": "value-001-291",
      "attribute_292": "value-001-292",
      "attribute_293": "value-001-293",
      "attribute_294": "value-001-294",
      "attribute_295": "value-001-295",
      "attribute_296": "value-001-296",
      "attribute_297": "value-001-297",
      "attribute_298": "value-001-298",
      "attribute_299": "value-001-299",
      "attribute_300": "value-001-300"
    },
    {
      "_id": {
        "$oid": "050000000000000000000002"
      },
      "seedId": "wide-002",
      "attribute_001": "value-002-001",
      "attribute_002": "value-002-002",
      "attribute_003": "value-002-003",
      "attribute_004": "value-002-004",
      "attribute_005": "value-002-005",
      "attribute_006": "value-002-006",
      "attribute_007": "value-002-007",
      "attribute_008": "value-002-008",
      "attribute_009": "value-002-009",
      "attribute_010": "value-002-010",
      "attribute_011": "value-002-011",
      "attribute_012": "value-002-012",
      "attribute_013": "value-002-013",
      "attribute_014": "value-002-014",
      "attribute_015": "value-002-015",
      "attribute_016": "value-002-016",
      "attribute_017": "value-002-017",
      "attribute_018": "value-002-018",
      "attribute_019": "value-002-019",
      "attribute_020": "value-002-020",
      "attribute_021": "value-002-021",
      "attribute_022": "value-002-022",
      "attribute_023": "value-002-023",
      "attribute_024": "value-002-024",
      "attribute_025": "value-002-025",
      "attribute_026": "value-002-026",
      "attribute_027": "value-002-027",
      "attribute_028": "value-002-028",
      "attribute_029": "value-002-029",
      "attribute_030": "value-002-030",
      "attribute_031": "value-002-031",
      "attribute_032": "value-002-032",
      "attribute_033": "value-002-033",
      "attribute_034": "value-002-034",
      "attribute_035": "value-002-035",
      "attribute_036": "value-002-036",
      "attribute_037": "value-002-037",
      "attribute_038": "value-002-038",
      "attribute_039": "value-002-039",
      "attribute_040": "value-002-040",
      "attribute_041": "value-002-041",
      "attribute_042": "value-002-042",
      "attribute_043": "value-002-043",
      "attribute_044": "value-002-044",
      "attribute_045": "value-002-045",
      "attribute_046": "value-002-046",
      "attribute_047": "value-002-047",
      "attribute_048": "value-002-048",
      "attribute_049": "value-002-049",
      "attribute_050": "value-002-050",
      "attribute_051": "value-002-051",
      "attribute_052": "value-002-052",
      "attribute_053": "value-002-053",
      "attribute_054": "value-002-054",
      "attribute_055": "value-002-055",
      "attribute_056": "value-002-056",
      "attribute_057": "value-002-057",
      "attribute_058": "value-002-058",
      "attribute_059": "value-002-059",
      "attribute_060": "value-002-060",
      "attribute_061": "value-002-061",
      "attribute_062": "value-002-062",
      "attribute_063": "value-002-063",
      "attribute_064": "value-002-064",
      "attribute_065": "value-002-065",
      "attribute_066": "value-002-066",
      "attribute_067": "value-002-067",
      "attribute_068": "value-002-068",
      "attribute_069": "value-002-069",
      "attribute_070": "value-002-070",
      "attribute_071": "value-002-071",
      "attribute_072": "value-002-072",
      "attribute_073": "value-002-073",
      "attribute_074": "value-002-074",
      "attribute_075": "value-002-075",
      "attribute_076": "value-002-076",
      "attribute_077": "value-002-077",
      "attribute_078": "value-002-078",
      "attribute_079": "value-002-079",
      "attribute_080": "value-002-080",
      "attribute_081": "value-002-081",
      "attribute_082": "value-002-082",
      "attribute_083": "value-002-083",
      "attribute_084": "value-002-084",
      "attribute_085": "value-002-085",
      "attribute_086": "value-002-086",
      "attribute_087": "value-002-087",
      "attribute_088": "value-002-088",
      "attribute_089": "value-002-089",
      "attribute_090": "value-002-090",
      "attribute_091": "value-002-091",
      "attribute_092": "value-002-092",
      "attribute_093": "value-002-093",
      "attribute_094": "value-002-094",
      "attribute_095": "value-002-095",
      "attribute_096": "value-002-096",
      "attribute_097": "value-002-097",
      "attribute_098": "value-002-098",
      "attribute_099": "value-002-099",
      "attribute_100": "value-002-100",
      "attribute_101": "value-002-101",
      "attribute_102": "value-002-102",
      "attribute_103": "value-002-103",
      "attribute_104": "value-002-104",
      "attribute_105": "value-002-105",
      "attribute_106": "value-002-106",
      "attribute_107": "value-002-107",
      "attribute_108": "value-002-108",
      "attribute_109": "value-002-109",
      "attribute_110": "value-002-110",
      "attribute_111": "value-002-111",
      "attribute_112": "value-002-112",
      "attribute_113": "value-002-113",
      "attribute_114": "value-002-114",
      "attribute_115": "value-002-115",
      "attribute_116": "value-002-116",
      "attribute_117": "value-002-117",
      "attribute_118": "value-002-118",
      "attribute_119": "value-002-119",
      "attribute_120": "value-002-120",
      "attribute_121": "value-002-121",
      "attribute_122": "value-002-122",
      "attribute_123": "value-002-123",
      "attribute_124": "value-002-124",
      "attribute_125": "value-002-125",
      "attribute_126": "value-002-126",
      "attribute_127": "value-002-127",
      "attribute_128": "value-002-128",
      "attribute_129": "value-002-129",
      "attribute_130": "value-002-130",
      "attribute_131": "value-002-131",
      "attribute_132": "value-002-132",
      "attribute_133": "value-002-133",
      "attribute_134": "value-002-134",
      "attribute_135": "value-002-135",
      "attribute_136": "value-002-136",
      "attribute_137": "value-002-137",
      "attribute_138": "value-002-138",
      "attribute_139": "value-002-139",
      "attribute_140": "value-002-140",
      "attribute_141": "value-002-141",
      "attribute_142": "value-002-142",
      "attribute_143": "value-002-143",
      "attribute_144": "value-002-144",
      "attribute_145": "value-002-145",
      "attribute_146": "value-002-146",
      "attribute_147": "value-002-147",
      "attribute_148": "value-002-148",
      "attribute_149": "value-002-149",
      "attribute_150": "value-002-150",
      "attribute_151": "value-002-151",
      "attribute_152": "value-002-152",
      "attribute_153": "value-002-153",
      "attribute_154": "value-002-154",
      "attribute_155": "value-002-155",
      "attribute_156": "value-002-156",
      "attribute_157": "value-002-157",
      "attribute_158": "value-002-158",
      "attribute_159": "value-002-159",
      "attribute_160": "value-002-160",
      "attribute_161": "value-002-161",
      "attribute_162": "value-002-162",
      "attribute_163": "value-002-163",
      "attribute_164": "value-002-164",
      "attribute_165": "value-002-165",
      "attribute_166": "value-002-166",
      "attribute_167": "value-002-167",
      "attribute_168": "value-002-168",
      "attribute_169": "value-002-169",
      "attribute_170": "value-002-170",
      "attribute_171": "value-002-171",
      "attribute_172": "value-002-172",
      "attribute_173": "value-002-173",
      "attribute_174": "value-002-174",
      "attribute_175": "value-002-175",
      "attribute_176": "value-002-176",
      "attribute_177": "value-002-177",
      "attribute_178": "value-002-178",
      "attribute_179": "value-002-179",
      "attribute_180": "value-002-180",
      "attribute_181": "value-002-181",
      "attribute_182": "value-002-182",
      "attribute_183": "value-002-183",
      "attribute_184": "value-002-184",
      "attribute_185": "value-002-185",
      "attribute_186": "value-002-186",
      "attribute_187": "value-002-187",
      "attribute_188": "value-002-188",
      "attribute_189": "value-002-189",
      "attribute_190": "value-002-190",
      "attribute_191": "value-002-191",
      "attribute_192": "value-002-192",
      "attribute_193": "value-002-193",
      "attribute_194": "value-002-194",
      "attribute_195": "value-002-195",
      "attribute_196": "value-002-196",
      "attribute_197": "value-002-197",
      "attribute_198": "value-002-198",
      "attribute_199": "value-002-199",
      "attribute_200": "value-002-200",
      "attribute_201": "value-002-201",
      "attribute_202": "value-002-202",
      "attribute_203": "value-002-203",
      "attribute_204": "value-002-204",
      "attribute_205": "value-002-205",
      "attribute_206": "value-002-206",
      "attribute_207": "value-002-207",
      "attribute_208": "value-002-208",
      "attribute_209": "value-002-209",
      "attribute_210": "value-002-210",
      "attribute_211": "value-002-211",
      "attribute_212": "value-002-212",
      "attribute_213": "value-002-213",
      "attribute_214": "value-002-214",
      "attribute_215": "value-002-215",
      "attribute_216": "value-002-216",
      "attribute_217": "value-002-217",
      "attribute_218": "value-002-218",
      "attribute_219": "value-002-219",
      "attribute_220": "value-002-220",
      "attribute_221": "value-002-221",
      "attribute_222": "value-002-222",
      "attribute_223": "value-002-223",
      "attribute_224": "value-002-224",
      "attribute_225": "value-002-225",
      "attribute_226": "value-002-226",
      "attribute_227": "value-002-227",
      "attribute_228": "value-002-228",
      "attribute_229": "value-002-229",
      "attribute_230": "value-002-230",
      "attribute_231": "value-002-231",
      "attribute_232": "value-002-232",
      "attribute_233": "value-002-233",
      "attribute_234": "value-002-234",
      "attribute_235": "value-002-235",
      "attribute_236": "value-002-236",
      "attribute_237": "value-002-237",
      "attribute_238": "value-002-238",
      "attribute_239": "value-002-239",
      "attribute_240": "value-002-240",
      "attribute_241": "value-002-241",
      "attribute_242": "value-002-242",
      "attribute_243": "value-002-243",
      "attribute_244": "value-002-244",
      "attribute_245": "value-002-245",
      "attribute_246": "value-002-246",
      "attribute_247": "value-002-247",
      "attribute_248": "value-002-248",
      "attribute_249": "value-002-249",
      "attribute_250": "value-002-250",
      "attribute_251": "value-002-251",
      "attribute_252": "value-002-252",
      "attribute_253": "value-002-253",
      "attribute_254": "value-002-254",
      "attribute_255": "value-002-255",
      "attribute_256": "value-002-256",
      "attribute_257": "value-002-257",
      "attribute_258": "value-002-258",
      "attribute_259": "value-002-259",
      "attribute_260": "value-002-260",
      "attribute_261": "value-002-261",
      "attribute_262": "value-002-262",
      "attribute_263": "value-002-263",
      "attribute_264": "value-002-264",
      "attribute_265": "value-002-265",
      "attribute_266": "value-002-266",
      "attribute_267": "value-002-267",
      "attribute_268": "value-002-268",
      "attribute_269": "value-002-269",
      "attribute_270": "value-002-270",
      "attribute_271": "value-002-271",
      "attribute_272": "value-002-272",
      "attribute_273": "value-002-273",
      "attribute_274": "value-002-274",
      "attribute_275": "value-002-275",
      "attribute_276": "value-002-276",
      "attribute_277": "value-002-277",
      "attribute_278": "value-002-278",
      "attribute_279": "value-002-279",
      "attribute_280": "value-002-280",
      "attribute_281": "value-002-281",
      "attribute_282": "value-002-282",
      "attribute_283": "value-002-283",
      "attribute_284": "value-002-284",
      "attribute_285": "value-002-285",
      "attribute_286": "value-002-286",
      "attribute_287": "value-002-287",
      "attribute_288": "value-002-288",
      "attribute_289": "value-002-289",
      "attribute_290": "value-002-290",
      "attribute_291": "value-002-291",
      "attribute_292": "value-002-292",
      "attribute_293": "value-002-293",
      "attribute_294": "value-002-294",
      "attribute_295": "value-002-295",
      "attribute_296": "value-002-296",
      "attribute_297": "value-002-297",
      "attribute_298": "value-002-298",
      "attribute_299": "value-002-299",
      "attribute_300": "value-002-300"
    },
    {
      "_id": {
        "$oid": "050000000000000000000003"
      },
      "seedId": "wide-003",
      "attribute_001": "value-003-001",
      "attribute_002": "value-003-002",
      "attribute_003": "value-003-003",
      "attribute_004": "value-003-004",
      "attribute_005": "value-003-005",
      "attribute_006": "value-003-006",
      "attribute_007": "value-003-007",
      "attribute_008": "value-003-008",
      "attribute_009": "value-003-009",
      "attribute_010": "value-003-010",
      "attribute_011": "value-003-011",
      "attribute_012": "value-003-012",
      "attribute_013": "value-003-013",
      "attribute_014": "value-003-014",
      "attribute_015": "value-003-015",
      "attribute_016": "value-003-016",
      "attribute_017": "value-003-017",
      "attribute_018": "value-003-018",
      "attribute_019": "value-003-019",
      "attribute_020": "value-003-020",
      "attribute_021": "value-003-021",
      "attribute_022": "value-003-022",
      "attribute_023": "value-003-023",
      "attribute_024": "value-003-024",
      "attribute_025": "value-003-025",
      "attribute_026": "value-003-026",
      "attribute_027": "value-003-027",
      "attribute_028": "value-003-028",
      "attribute_029": "value-003-029",
      "attribute_030": "value-003-030",
      "attribute_031": "value-003-031",
      "attribute_032": "value-003-032",
      "attribute_033": "value-003-033",
      "attribute_034": "value-003-034",
      "attribute_035": "value-003-035",
      "attribute_036": "value-003-036",
      "attribute_037": "value-003-037",
      "attribute_038": "value-003-038",
      "attribute_039": "value-003-039",
      "attribute_040": "value-003-040",
      "attribute_041": "value-003-041",
      "attribute_042": "value-003-042",
      "attribute_043": "value-003-043",
      "attribute_044": "value-003-044",
      "attribute_045": "value-003-045",
      "attribute_046": "value-003-046",
      "attribute_047": "value-003-047",
      "attribute_048": "value-003-048",
      "attribute_049": "value-003-049",
      "attribute_050": "value-003-050",
      "attribute_051": "value-003-051",
      "attribute_052": "value-003-052",
      "attribute_053": "value-003-053",
      "attribute_054": "value-003-054",
      "attribute_055": "value-003-055",
      "attribute_056": "value-003-056",
      "attribute_057": "value-003-057",
      "attribute_058": "value-003-058",
      "attribute_059": "value-003-059",
      "attribute_060": "value-003-060",
      "attribute_061": "value-003-061",
      "attribute_062": "value-003-062",
      "attribute_063": "value-003-063",
      "attribute_064": "value-003-064",
      "attribute_065": "value-003-065",
      "attribute_066": "value-003-066",
      "attribute_067": "value-003-067",
      "attribute_068": "value-003-068",
      "attribute_069": "value-003-069",
      "attribute_070": "value-003-070",
      "attribute_071": "value-003-071",
      "attribute_072": "value-003-072",
      "attribute_073": "value-003-073",
      "attribute_074": "value-003-074",
      "attribute_075": "value-003-075",
      "attribute_076": "value-003-076",
      "attribute_077": "value-003-077",
      "attribute_078": "value-003-078",
      "attribute_079": "value-003-079",
      "attribute_080": "value-003-080",
      "attribute_081": "value-003-081",
      "attribute_082": "value-003-082",
      "attribute_083": "value-003-083",
      "attribute_084": "value-003-084",
      "attribute_085": "value-003-085",
      "attribute_086": "value-003-086",
      "attribute_087": "value-003-087",
      "attribute_088": "value-003-088",
      "attribute_089": "value-003-089",
      "attribute_090": "value-003-090",
      "attribute_091": "value-003-091",
      "attribute_092": "value-003-092",
      "attribute_093": "value-003-093",
      "attribute_094": "value-003-094",
      "attribute_095": "value-003-095",
      "attribute_096": "value-003-096",
      "attribute_097": "value-003-097",
      "attribute_098": "value-003-098",
      "attribute_099": "value-003-099",
      "attribute_100": "value-003-100",
      "attribute_101": "value-003-101",
      "attribute_102": "value-003-102",
      "attribute_103": "value-003-103",
      "attribute_104": "value-003-104",
      "attribute_105": "value-003-105",
      "attribute_106": "value-003-106",
      "attribute_107": "value-003-107",
      "attribute_108": "value-003-108",
      "attribute_109": "value-003-109",
      "attribute_110": "value-003-110",
      "attribute_111": "value-003-111",
      "attribute_112": "value-003-112",
      "attribute_113": "value-003-113",
      "attribute_114": "value-003-114",
      "attribute_115": "value-003-115",
      "attribute_116": "value-003-116",
      "attribute_117": "value-003-117",
      "attribute_118": "value-003-118",
      "attribute_119": "value-003-119",
      "attribute_120": "value-003-120",
      "attribute_121": "value-003-121",
      "attribute_122": "value-003-122",
      "attribute_123": "value-003-123",
      "attribute_124": "value-003-124",
      "attribute_125": "value-003-125",
      "attribute_126": "value-003-126",
      "attribute_127": "value-003-127",
      "attribute_128": "value-003-128",
      "attribute_129": "value-003-129",
      "attribute_130": "value-003-130",
      "attribute_131": "value-003-131",
      "attribute_132": "value-003-132",
      "attribute_133": "value-003-133",
      "attribute_134": "value-003-134",
      "attribute_135": "value-003-135",
      "attribute_136": "value-003-136",
      "attribute_137": "value-003-137",
      "attribute_138": "value-003-138",
      "attribute_139": "value-003-139",
      "attribute_140": "value-003-140",
      "attribute_141": "value-003-141",
      "attribute_142": "value-003-142",
      "attribute_143": "value-003-143",
      "attribute_144": "value-003-144",
      "attribute_145": "value-003-145",
      "attribute_146": "value-003-146",
      "attribute_147": "value-003-147",
      "attribute_148": "value-003-148",
      "attribute_149": "value-003-149",
      "attribute_150": "value-003-150",
      "attribute_151": "value-003-151",
      "attribute_152": "value-003-152",
      "attribute_153": "value-003-153",
      "attribute_154": "value-003-154",
      "attribute_155": "value-003-155",
      "attribute_156": "value-003-156",
      "attribute_157": "value-003-157",
      "attribute_158": "value-003-158",
      "attribute_159": "value-003-159",
      "attribute_160": "value-003-160",
      "attribute_161": "value-003-161",
      "attribute_162": "value-003-162",
      "attribute_163": "value-003-163",
      "attribute_164": "value-003-164",
      "attribute_165": "value-003-165",
      "attribute_166": "value-003-166",
      "attribute_167": "value-003-167",
      "attribute_168": "value-003-168",
      "attribute_169": "value-003-169",
      "attribute_170": "value-003-170",
      "attribute_171": "value-003-171",
      "attribute_172": "value-003-172",
      "attribute_173": "value-003-173",
      "attribute_174": "value-003-174",
      "attribute_175": "value-003-175",
      "attribute_176": "value-003-176",
      "attribute_177": "value-003-177",
      "attribute_178": "value-003-178",
      "attribute_179": "value-003-179",
      "attribute_180": "value-003-180",
      "attribute_181": "value-003-181",
      "attribute_182": "value-003-182",
      "attribute_183": "value-003-183",
      "attribute_184": "value-003-184",
      "attribute_185": "value-003-185",
      "attribute_186": "value-003-186",
      "attribute_187": "value-003-187",
      "attribute_188": "value-003-188",
      "attribute_189": "value-003-189",
      "attribute_190": "value-003-190",
      "attribute_191": "value-003-191",
      "attribute_192": "value-003-192",
      "attribute_193": "value-003-193",
      "attribute_194": "value-003-194",
      "attribute_195": "value-003-195",
      "attribute_196": "value-003-196",
      "attribute_197": "value-003-197",
      "attribute_198": "value-003-198",
      "attribute_199": "value-003-199",
      "attribute_200": "value-003-200",
      "attribute_201": "value-003-201",
      "attribute_202": "value-003-202",
      "attribute_203": "value-003-203",
      "attribute_204": "value-003-204",
      "attribute_205": "value-003-205",
      "attribute_206": "value-003-206",
      "attribute_207": "value-003-207",
      "attribute_208": "value-003-208",
      "attribute_209": "value-003-209",
      "attribute_210": "value-003-210",
      "attribute_211": "value-003-211",
      "attribute_212": "value-003-212",
      "attribute_213": "value-003-213",
      "attribute_214": "value-003-214",
      "attribute_215": "value-003-215",
      "attribute_216": "value-003-216",
      "attribute_217": "value-003-217",
      "attribute_218": "value-003-218",
      "attribute_219": "value-003-219",
      "attribute_220": "value-003-220",
      "attribute_221": "value-003-221",
      "attribute_222": "value-003-222",
      "attribute_223": "value-003-223",
      "attribute_224": "value-003-224",
      "attribute_225": "value-003-225",
      "attribute_226": "value-003-226",
      "attribute_227": "value-003-227",
      "attribute_228": "value-003-228",
      "attribute_229": "value-003-229",
      "attribute_230": "value-003-230",
      "attribute_231": "value-003-231",
      "attribute_232": "value-003-232",
      "attribute_233": "value-003-233",
      "attribute_234": "value-003-234",
      "attribute_235": "value-003-235",
      "attribute_236": "value-003-236",
      "attribute_237": "value-003-237",
      "attribute_238": "value-003-238",
      "attribute_239": "value-003-239",
      "attribute_240": "value-003-240",
      "attribute_241": "value-003-241",
      "attribute_242": "value-003-242",
      "attribute_243": "value-003-243",
      "attribute_244": "value-003-244",
      "attribute_245": "value-003-245",
      "attribute_246": "value-003-246",
      "attribute_247": "value-003-247",
      "attribute_248": "value-003-248",
      "attribute_249": "value-003-249",
      "attribute_250": "value-003-250",
      "attribute_251": "value-003-251",
      "attribute_252": "value-003-252",
      "attribute_253": "value-003-253",
      "attribute_254": "value-003-254",
      "attribute_255": "value-003-255",
      "attribute_256": "value-003-256",
      "attribute_257": "value-003-257",
      "attribute_258": "value-003-258",
      "attribute_259": "value-003-259",
      "attribute_260": "value-003-260",
      "attribute_261": "value-003-261",
      "attribute_262": "value-003-262",
      "attribute_263": "value-003-263",
      "attribute_264": "value-003-264",
      "attribute_265": "value-003-265",
      "attribute_266": "value-003-266",
      "attribute_267": "value-003-267",
      "attribute_268": "value-003-268",
      "attribute_269": "value-003-269",
      "attribute_270": "value-003-270",
      "attribute_271": "value-003-271",
      "attribute_272": "value-003-272",
      "attribute_273": "value-003-273",
      "attribute_274": "value-003-274",
      "attribute_275": "value-003-275",
      "attribute_276": "value-003-276",
      "attribute_277": "value-003-277",
      "attribute_278": "value-003-278",
      "attribute_279": "value-003-279",
      "attribute_280": "value-003-280",
      "attribute_281": "value-003-281",
      "attribute_282": "value-003-282",
      "attribute_283": "value-003-283",
      "attribute_284": "value-003-284",
      "attribute_285": "value-003-285",
      "attribute_286": "value-003-286",
      "attribute_287": "value-003-287",
      "attribute_288": "value-003-288",
      "attribute_289": "value-003-289",
      "attribute_290": "value-003-290",
      "attribute_291": "value-003-291",
      "attribute_292": "value-003-292",
      "attribute_293": "value-003-293",
      "attribute_294": "value-003-294",
      "attribute_295": "value-003-295",
      "attribute_296": "value-003-296",
      "attribute_297": "value-003-297",
      "attribute_298": "value-003-298",
      "attribute_299": "value-003-299",
      "attribute_300": "value-003-300"
    },
    {
      "_id": {
        "$oid": "050000000000000000000004"
      },
      "seedId": "wide-004",
      "attribute_001": "value-004-001",
      "attribute_002": "value-004-002",
      "attribute_003": "value-004-003",
      "attribute_004": "value-004-004",
      "attribute_005": "value-004-005",
      "attribute_006": "value-004-006",
      "attribute_007": "value-004-007",
      "attribute_008": "value-004-008",
      "attribute_009": "value-004-009",
      "attribute_010": "value-004-010",
      "attribute_011": "value-004-011",
      "attribute_012": "value-004-012",
      "attribute_013": "value-004-013",
      "attribute_014": "value-004-014",
      "attribute_015": "value-004-015",
      "attribute_016": "value-004-016",
      "attribute_017": "value-004-017",
      "attribute_018": "value-004-018",
      "attribute_019": "value-004-019",
      "attribute_020": "value-004-020",
      "attribute_021": "value-004-021",
      "attribute_022": "value-004-022",
      "attribute_023": "value-004-023",
      "attribute_024": "value-004-024",
      "attribute_025": "value-004-025",
      "attribute_026": "value-004-026",
      "attribute_027": "value-004-027",
      "attribute_028": "value-004-028",
      "attribute_029": "value-004-029",
      "attribute_030": "value-004-030",
      "attribute_031": "value-004-031",
      "attribute_032": "value-004-032",
      "attribute_033": "value-004-033",
      "attribute_034": "value-004-034",
      "attribute_035": "value-004-035",
      "attribute_036": "value-004-036",
      "attribute_037": "value-004-037",
      "attribute_038": "value-004-038",
      "attribute_039": "value-004-039",
      "attribute_040": "value-004-040",
      "attribute_041": "value-004-041",
      "attribute_042": "value-004-042",
      "attribute_043": "value-004-043",
      "attribute_044": "value-004-044",
      "attribute_045": "value-004-045",
      "attribute_046": "value-004-046",
      "attribute_047": "value-004-047",
      "attribute_048": "value-004-048",
      "attribute_049": "value-004-049",
      "attribute_050": "value-004-050",
      "attribute_051": "value-004-051",
      "attribute_052": "value-004-052",
      "attribute_053": "value-004-053",
      "attribute_054": "value-004-054",
      "attribute_055": "value-004-055",
      "attribute_056": "value-004-056",
      "attribute_057": "value-004-057",
      "attribute_058": "value-004-058",
      "attribute_059": "value-004-059",
      "attribute_060": "value-004-060",
      "attribute_061": "value-004-061",
      "attribute_062": "value-004-062",
      "attribute_063": "value-004-063",
      "attribute_064": "value-004-064",
      "attribute_065": "value-004-065",
      "attribute_066": "value-004-066",
      "attribute_067": "value-004-067",
      "attribute_068": "value-004-068",
      "attribute_069": "value-004-069",
      "attribute_070": "value-004-070",
      "attribute_071": "value-004-071",
      "attribute_072": "value-004-072",
      "attribute_073": "value-004-073",
      "attribute_074": "value-004-074",
      "attribute_075": "value-004-075",
      "attribute_076": "value-004-076",
      "attribute_077": "value-004-077",
      "attribute_078": "value-004-078",
      "attribute_079": "value-004-079",
      "attribute_080": "value-004-080",
      "attribute_081": "value-004-081",
      "attribute_082": "value-004-082",
      "attribute_083": "value-004-083",
      "attribute_084": "value-004-084",
      "attribute_085": "value-004-085",
      "attribute_086": "value-004-086",
      "attribute_087": "value-004-087",
      "attribute_088": "value-004-088",
      "attribute_089": "value-004-089",
      "attribute_090": "value-004-090",
      "attribute_091": "value-004-091",
      "attribute_092": "value-004-092",
      "attribute_093": "value-004-093",
      "attribute_094": "value-004-094",
      "attribute_095": "value-004-095",
      "attribute_096": "value-004-096",
      "attribute_097": "value-004-097",
      "attribute_098": "value-004-098",
      "attribute_099": "value-004-099",
      "attribute_100": "value-004-100",
      "attribute_101": "value-004-101",
      "attribute_102": "value-004-102",
      "attribute_103": "value-004-103",
      "attribute_104": "value-004-104",
      "attribute_105": "value-004-105",
      "attribute_106": "value-004-106",
      "attribute_107": "value-004-107",
      "attribute_108": "value-004-108",
      "attribute_109": "value-004-109",
      "attribute_110": "value-004-110",
      "attribute_111": "value-004-111",
      "attribute_112": "value-004-112",
      "attribute_113": "value-004-113",
      "attribute_114": "value-004-114",
      "attribute_115": "value-004-115",
      "attribute_116": "value-004-116",
      "attribute_117": "value-004-117",
      "attribute_118": "value-004-118",
      "attribute_119": "value-004-119",
      "attribute_120": "value-004-120",
      "attribute_121": "value-004-121",
      "attribute_122": "value-004-122",
      "attribute_123": "value-004-123",
      "attribute_124": "value-004-124",
      "attribute_125": "value-004-125",
      "attribute_126": "value-004-126",
      "attribute_127": "value-004-127",
      "attribute_128": "value-004-128",
      "attribute_129": "value-004-129",
      "attribute_130": "value-004-130",
      "attribute_131": "value-004-131",
      "attribute_132": "value-004-132",
      "attribute_133": "value-004-133",
      "attribute_134": "value-004-134",
      "attribute_135": "value-004-135",
      "attribute_136": "value-004-136",
      "attribute_137": "value-004-137",
      "attribute_138": "value-004-138",
      "attribute_139": "value-004-139",
      "attribute_140": "value-004-140",
      "attribute_141": "value-004-141",
      "attribute_142": "value-004-142",
      "attribute_143": "value-004-143",
      "attribute_144": "value-004-144",
      "attribute_145": "value-004-145",
      "attribute_146": "value-004-146",
      "attribute_147": "value-004-147",
      "attribute_148": "value-004-148",
      "attribute_149": "value-004-149",
      "attribute_150": "value-004-150",
      "attribute_151": "value-004-151",
      "attribute_152": "value-004-152",
      "attribute_153": "value-004-153",
      "attribute_154": "value-004-154",
      "attribute_155": "value-004-155",
      "attribute_156": "value-004-156",
      "attribute_157": "value-004-157",
      "attribute_158": "value-004-158",
      "attribute_159": "value-004-159",
      "attribute_160": "value-004-160",
      "attribute_161": "value-004-161",
      "attribute_162": "value-004-162",
      "attribute_163": "value-004-163",
      "attribute_164": "value-004-164",
      "attribute_165": "value-004-165",
      "attribute_166": "value-004-166",
      "attribute_167": "value-004-167",
      "attribute_168": "value-004-168",
      "attribute_169": "value-004-169",
      "attribute_170": "value-004-170",
      "attribute_171": "value-004-171",
      "attribute_172": "value-004-172",
      "attribute_173": "value-004-173",
      "attribute_174": "value-004-174",
      "attribute_175": "value-004-175",
      "attribute_176": "value-004-176",
      "attribute_177": "value-004-177",
      "attribute_178": "value-004-178",
      "attribute_179": "value-004-179",
      "attribute_180": "value-004-180",
      "attribute_181": "value-004-181",
      "attribute_182": "value-004-182",
      "attribute_183": "value-004-183",
      "attribute_184": "value-004-184",
      "attribute_185": "value-004-185",
      "attribute_186": "value-004-186",
      "attribute_187": "value-004-187",
      "attribute_188": "value-004-188",
      "attribute_189": "value-004-189",
      "attribute_190": "value-004-190",
      "attribute_191": "value-004-191",
      "attribute_192": "value-004-192",
      "attribute_193": "value-004-193",
      "attribute_194": "value-004-194",
      "attribute_195": "value-004-195",
      "attribute_196": "value-004-196",
      "attribute_197": "value-004-197",
      "attribute_198": "value-004-198",
      "attribute_199": "value-004-199",
      "attribute_200": "value-004-200",
      "attribute_201": "value-004-201",
      "attribute_202": "value-004-202",
      "attribute_203": "value-004-203",
      "attribute_204": "value-004-204",
      "attribute_205": "value-004-205",
      "attribute_206": "value-004-206",
      "attribute_207": "value-004-207",
      "attribute_208": "value-004-208",
      "attribute_209": "value-004-209",
      "attribute_210": "value-004-210",
      "attribute_211": "value-004-211",
      "attribute_212": "value-004-212",
      "attribute_213": "value-004-213",
      "attribute_214": "value-004-214",
      "attribute_215": "value-004-215",
      "attribute_216": "value-004-216",
      "attribute_217": "value-004-217",
      "attribute_218": "value-004-218",
      "attribute_219": "value-004-219",
      "attribute_220": "value-004-220",
      "attribute_221": "value-004-221",
      "attribute_222": "value-004-222",
      "attribute_223": "value-004-223",
      "attribute_224": "value-004-224",
      "attribute_225": "value-004-225",
      "attribute_226": "value-004-226",
      "attribute_227": "value-004-227",
      "attribute_228": "value-004-228",
      "attribute_229": "value-004-229",
      "attribute_230": "value-004-230",
      "attribute_231": "value-004-231",
      "attribute_232": "value-004-232",
      "attribute_233": "value-004-233",
      "attribute_234": "value-004-234",
      "attribute_235": "value-004-235",
      "attribute_236": "value-004-236",
      "attribute_237": "value-004-237",
      "attribute_238": "value-004-238",
      "attribute_239": "value-004-239",
      "attribute_240": "value-004-240",
      "attribute_241": "value-004-241",
      "attribute_242": "value-004-242",
      "attribute_243": "value-004-243",
      "attribute_244": "value-004-244",
      "attribute_245": "value-004-245",
      "attribute_246": "value-004-246",
      "attribute_247": "value-004-247",
      "attribute_248": "value-004-248",
      "attribute_249": "value-004-249",
      "attribute_250": "value-004-250",
      "attribute_251": "value-004-251",
      "attribute_252": "value-004-252",
      "attribute_253": "value-004-253",
      "attribute_254": "value-004-254",
      "attribute_255": "value-004-255",
      "attribute_256": "value-004-256",
      "attribute_257": "value-004-257",
      "attribute_258": "value-004-258",
      "attribute_259": "value-004-259",
      "attribute_260": "value-004-260",
      "attribute_261": "value-004-261",
      "attribute_262": "value-004-262",
      "attribute_263": "value-004-263",
      "attribute_264": "value-004-264",
      "attribute_265": "value-004-265",
      "attribute_266": "value-004-266",
      "attribute_267": "value-004-267",
      "attribute_268": "value-004-268",
      "attribute_269": "value-004-269",
      "attribute_270": "value-004-270",
      "attribute_271": "value-004-271",
      "attribute_272": "value-004-272",
      "attribute_273": "value-004-273",
      "attribute_274": "value-004-274",
      "attribute_275": "value-004-275",
      "attribute_276": "value-004-276",
      "attribute_277": "value-004-277",
      "attribute_278": "value-004-278",
      "attribute_279": "value-004-279",
      "attribute_280": "value-004-280",
      "attribute_281": "value-004-281",
      "attribute_282": "value-004-282",
      "attribute_283": "value-004-283",
      "attribute_284": "value-004-284",
      "attribute_285": "value-004-285",
      "attribute_286": "value-004-286",
      "attribute_287": "value-004-287",
      "attribute_288": "value-004-288",
      "attribute_289": "value-004-289",
      "attribute_290": "value-004-290",
      "attribute_291": "value-004-291",
      "attribute_292": "value-004-292",
      "attribute_293": "value-004-293",
      "attribute_294": "value-004-294",
      "attribute_295": "value-004-295",
      "attribute_296": "value-004-296",
      "attribute_297": "value-004-297",
      "attribute_298": "value-004-298",
      "attribute_299": "value-004-299",
      "attribute_300": "value-004-300"
    }
  ]
};
for (const [collectionName, documents] of Object.entries(collections)) {
  const collection = terra.getCollection(collectionName);
  for (let start = 0; start < documents.length; start += batchSize) {
    const operations = documents.slice(start, start + batchSize).map((rawDocument) => {
      const document = EJSON.deserialize(rawDocument);
      return { replaceOne: { filter: { _id: document._id }, replacement: document, upsert: true } };
    });
    collection.bulkWrite(operations, { ordered: false });
  }
}
terra.animals.createIndex({ species: 1, status: 1 });
terra.observations.createIndex({ animalId: 1, observedAt: -1 });
terra.telemetry.createIndex({ animalId: 1, recordedAt: -1 });
terra.ranger_notes.createIndex({ animalId: 1, createdAt: -1 });
