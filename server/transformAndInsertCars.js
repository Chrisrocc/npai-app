const { MongoClient } = require('mongodb');

// Your JSON dataset here
const carsData = [[{
  "_id": {
    "$oid": "682c6272c027b7a6c37eeef8"
  },
  "make": "Volvo",
  "model": "V40",
  "badge": "D4 Adap Geartronic Luxury",
  "rego": "1OC5QF",
  "year": 2013,
  "description": "Red",
  "stage": "In Works",
  "photos": [
    "Uploads/car_1748217167225.jpg",
    "Uploads/car_1748217167224.jpg",
    "Uploads/car_1748217167258.jpg"
  ],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "Sky",
      "dateAdded": {
        "$date": "2025-06-01T10:43:51.555Z"
      },
      "dateLeft": {
        "$date": "2025-06-02T05:06:45.834Z"
      },
      "message": "Location update via PUT",
      "_id": {
        "$oid": "683c2ee76edb02350af6bb44"
      }
    },
    {
      "location": "Haytham",
      "dateAdded": {
        "$date": "2025-06-02T05:06:45.835Z"
      },
      "dateLeft": {
        "$date": "2025-06-02T09:30:15.167Z"
      },
      "message": "James: Red Volvo V40 is at Haytham",
      "_id": {
        "$oid": "683d31651ddb15f82a7c9fad"
      }
    },
    {
      "location": "Capital",
      "dateAdded": {
        "$date": "2025-06-02T09:30:15.167Z"
      },
      "dateLeft": {
        "$date": "2025-06-02T09:34:15.192Z"
      },
      "message": "Location update via PUT",
      "_id": {
        "$oid": "683d6f271ddb15f82a7ca26f"
      }
    },
    {
      "location": "Sky",
      "dateAdded": {
        "$date": "2025-06-02T09:34:15.192Z"
      },
      "dateLeft": {
        "$date": "2025-06-02T09:39:03.012Z"
      },
      "message": "Christian:  Volvo V40, rego 1OC5QF, will be ready at Sky later today",
      "_id": {
        "$oid": "683d70171ddb15f82a7ca28f"
      }
    },
    {
      "location": "Capital",
      "dateAdded": {
        "$date": "2025-06-02T09:39:03.012Z"
      },
      "dateLeft": {
        "$date": "2025-06-02T09:44:00.026Z"
      },
      "message": "Christian:  Volvo V40 1OC5QF will be ready at Capital",
      "_id": {
        "$oid": "683d71371ddb15f82a7ca418"
      }
    },
    {
      "location": "Sky",
      "dateAdded": {
        "$date": "2025-06-02T09:44:00.026Z"
      },
      "dateLeft": {
        "$date": "2025-06-02T09:46:03.903Z"
      },
      "message": "Christian:  Volvo V40 1OC5QF will be ready at Sky later today",
      "_id": {
        "$oid": "683d72601ddb15f82a7ca575"
      }
    },
    {
      "location": "Capital",
      "dateAdded": {
        "$date": "2025-06-02T09:46:03.903Z"
      },
      "dateLeft": {
        "$date": "2025-06-02T09:51:13.977Z"
      },
      "message": "Christian:  Volvo V40, rego 1OC5QF, will be ready at Capital at 2pm",
      "_id": {
        "$oid": "683d72db1ddb15f82a7caac2"
      }
    },
    {
      "location": "Sky",
      "dateAdded": {
        "$date": "2025-06-02T09:51:13.977Z"
      },
      "dateLeft": null,
      "message": "Christian:  Volvo V40, rego 1OC5QF, will be ready at Sky at 2pm",
      "_id": {
        "$oid": "683d74111ddb15f82a7cb205"
      }
    }
  ],
  "__v": 8,
  "next": [
    {
      "location": "Al",
      "created": {
        "$date": "2025-06-01T10:29:09.974Z"
      },
      "_id": {
        "$oid": "683d72791ddb15f82a7ca6d4"
      }
    }
  ],
  "status": "2pm",
  "location": "Sky",
  "pendingLocationUpdate": null
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eeefa"
  },
  "make": "Mini",
  "model": "Hatch",
  "badge": "Cooper",
  "rego": "1JA7BO",
  "year": 2017,
  "description": "Black",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "Sky",
      "dateAdded": {
        "$date": "2025-06-01T10:46:58.245Z"
      },
      "dateLeft": null,
      "message": "Location update via PUT",
      "_id": {
        "$oid": "683c2fa26edb02350af6bde2"
      }
    }
  ],
  "__v": 2,
  "location": "Sky",
  "next": [],
  "pendingLocationUpdate": null,
  "status": "Ready"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eeefc"
  },
  "make": "Holden",
  "model": "Ute",
  "badge": "SS",
  "rego": "YKE227",
  "year": 2011,
  "description": "Grey",
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "lights",
    "seats"
  ],
  "notes": "",
  "history": [
    {
      "location": "Capital",
      "dateAdded": {
        "$date": "2025-06-01T10:43:13.079Z"
      },
      "dateLeft": null,
      "message": "Location update via PUT",
      "_id": {
        "$oid": "683c2ec16edb02350af6ba89"
      }
    }
  ],
  "__v": 2,
  "location": "Capital",
  "next": [],
  "pendingLocationUpdate": null
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eeefe"
  },
  "make": "Subaru",
  "model": "Impreza",
  "badge": "",
  "rego": "TFV253",
  "year": 2001,
  "description": "Green",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0,
  "location": ""
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef00"
  },
  "make": "Holden Special Vehicles",
  "model": "ClubSport",
  "badge": "R8",
  "rego": "VX2HSV",
  "year": 2002,
  "description": "Red",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef02"
  },
  "make": "Holden",
  "model": "Calais",
  "badge": "",
  "rego": "1WD2FH",
  "year": 2004,
  "description": "Maroon",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef04"
  },
  "make": "Ford",
  "model": "Falcon Ute",
  "badge": "",
  "rego": "ORB348",
  "description": "Red",
  "stage": "Online",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef06"
  },
  "make": "Mazda",
  "model": "BT-50",
  "badge": "XTR 4x2 Hi-Rider",
  "rego": "1JH8MD",
  "year": 2016,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "Ash's house",
      "dateAdded": {
        "$date": "2025-05-28T03:18:05.332Z"
      },
      "dateLeft": {
        "$date": "2025-06-01T10:44:36.435Z"
      },
      "_id": {
        "$oid": "6836806dafa9578b401c555f"
      }
    },
    {
      "location": "Unique",
      "dateAdded": {
        "$date": "2025-06-01T10:44:36.440Z"
      },
      "dateLeft": null,
      "message": "Location update via PUT",
      "_id": {
        "$oid": "683c2f146edb02350af6bbff"
      }
    }
  ],
  "__v": 2,
  "location": "Unique",
  "next": [],
  "pendingLocationUpdate": null
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef08"
  },
  "make": "Jeep",
  "model": "Wrangler",
  "badge": "Sport 70th Anniversary",
  "rego": "1IL4CF",
  "year": 2011,
  "description": "Silver",
  "stage": "Online",
  "photos": [],
  "checklist": [],
  "notes": "Swap for kia optima",
  "history": [],
  "__v": 0,
  "next": "Picked up"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef0a"
  },
  "make": "Mitsubishi",
  "model": "Lancer",
  "badge": "LS",
  "rego": "1GP3PY",
  "year": 2015,
  "description": "Grey",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef0c"
  },
  "make": "Ford",
  "model": "Ranger",
  "badge": "Wildtrak Crew Cab",
  "rego": "YNW557",
  "year": 2011,
  "description": "Blue",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef0e"
  },
  "make": "Toyota",
  "model": "Camry",
  "badge": "",
  "rego": "1ZU3ZF",
  "year": 1985,
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef10"
  },
  "make": "Mercedes-Benz",
  "model": "C-Class",
  "badge": "C250 7G-TRONIC +",
  "rego": "BCK027",
  "year": 2015,
  "description": "Grey",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef12"
  },
  "make": "Mitsubishi",
  "model": "Triton",
  "badge": "GLX Double Cab",
  "rego": "1SG9SS",
  "year": 2019,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef14"
  },
  "make": "Ford",
  "model": "Ranger",
  "badge": "XLT Super Cab",
  "rego": "1PO5WZ",
  "year": 2012,
  "description": "Blue",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef16"
  },
  "make": "Holden",
  "model": "Trax",
  "badge": "LTZ",
  "rego": "1WD3QZ",
  "year": 2016,
  "description": "Red",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "Northpoint",
      "dateAdded": {
        "$date": "2025-06-03T05:47:17.418Z"
      },
      "dateLeft": null,
      "message": "H U S S: Red Holden Trax rego 1WD 3QZ is at Northpoint",
      "_id": {
        "$oid": "683e8c65957b318e2b5a23ae"
      }
    }
  ],
  "__v": 2,
  "location": "Northpoint",
  "next": [],
  "pendingLocationUpdate": null
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef18"
  },
  "make": "Mitsubishi",
  "model": "Triton",
  "badge": "Exceed Double Cab",
  "rego": "1TUFMQ",
  "year": 2017,
  "description": "Black",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef1a"
  },
  "make": "Subaru",
  "model": "Forester",
  "badge": "XS AWD Premium",
  "rego": "YLI804",
  "year": 2011,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "; To Do: needs air in tyres on Monday; To Do: Clean and bring inside for viewing on Wednesday or Thursday; To Do: Make presentable for customer from Geelong",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef1c"
  },
  "make": "Ford",
  "model": "Ranger",
  "badge": "XL Hi-Rider",
  "rego": "1KI2OE",
  "year": 2017,
  "description": "Grey",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef1e"
  },
  "make": "Toyota",
  "model": "Landcruiser Prado",
  "badge": "GXL",
  "rego": "WQI114",
  "year": 2008,
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef20"
  },
  "make": "Kia",
  "model": "RIO",
  "badge": "S",
  "rego": "1KF9FR",
  "year": 2013,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef22"
  },
  "make": "Holden",
  "model": "Ute",
  "badge": "SV6 Ute",
  "rego": "1EC3YN",
  "year": 2015,
  "description": "Black",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef24"
  },
  "make": "Volkswagen",
  "model": "Amarok",
  "badge": "TDI420 4MOTION Perm Trend",
  "rego": "2AA1KF",
  "year": 2014,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef26"
  },
  "make": "Volkswagen",
  "model": "Amarok",
  "badge": "TDI550 4MOTION Perm Sport",
  "rego": "1ON8TG",
  "year": 2019,
  "description": "Grey",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "Unique",
      "dateAdded": {
        "$date": "2025-05-27T06:58:10.500Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "68356282efb811d686a3e03d"
      }
    }
  ],
  "__v": 0,
  "location": "Unique"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef28"
  },
  "make": "Nissan",
  "model": "X-Trail",
  "badge": "ST-L",
  "rego": "1AI2NA",
  "year": 2012,
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0,
  "status": ""
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef2a"
  },
  "make": "Toyota",
  "model": "Landcruiser Prado",
  "badge": "GXL",
  "rego": "SNV044",
  "year": 2003,
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef2c"
  },
  "make": "Subaru",
  "model": "Impreza",
  "badge": "2.0i Lineartronic AWD",
  "rego": "1HS1YH",
  "year": 2016,
  "description": "Dark gray",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 1,
  "location": "Louie's",
  "next": [],
  "pendingLocationUpdate": null
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef2e"
  },
  "make": "Alfa Romeo",
  "model": "Giulietta",
  "badge": "Super",
  "rego": "AVR774",
  "year": 2018,
  "description": "Red",
  "stage": "Online",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef30"
  },
  "make": "Toyota",
  "model": "Landcruiser Prado",
  "badge": "GXL",
  "rego": "1KU1JT",
  "year": 2015,
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef32"
  },
  "make": "Hyundai",
  "model": "Elantra",
  "badge": "Active",
  "rego": "1AO2VG",
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef34"
  },
  "make": "Mitsubishi",
  "model": "Triton",
  "badge": "GLX-R Double Cab",
  "rego": "YAY784",
  "year": 2010,
  "description": "Red",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0,
  "next": "Unique"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef36"
  },
  "make": "Mitsubishi",
  "model": "Pajero",
  "badge": "RX",
  "rego": "1TV1XG",
  "year": 2011,
  "description": "Brown",
  "stage": "Online",
  "photos": [],
  "checklist": [
    "RWC and service"
  ],
  "notes": "; To Do: Make sure is clean and vacuumed; For RWC and service",
  "history": [],
  "__v": 0,
  "next": [],
  "location": ""
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef38"
  },
  "make": "Volkswagen",
  "model": "Caddy",
  "badge": "TDI250 BlueMOTION Maxi",
  "rego": "1CE7QL",
  "year": 2014,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "Imad's",
      "dateAdded": {
        "$date": "2025-05-26T06:53:07.389Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "68340fd3efb811d686a3d790"
      }
    }
  ],
  "__v": 0,
  "location": "Imad's",
  "next": [],
  "status": "Ready"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef3a"
  },
  "make": "Toyota",
  "model": "86",
  "badge": "GTS",
  "rego": "1PV3VU",
  "year": 2013,
  "description": "Blue",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef3c"
  },
  "make": "Volkswagen",
  "model": "Caddy",
  "badge": "Maxi DSG",
  "rego": "YBG380",
  "year": 2010,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef3e"
  },
  "make": "BMW",
  "model": "2 Series",
  "badge": "220i Active Tourer Steptr",
  "rego": "AIK895",
  "year": 2016,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "; To Do: Pull out when back; To Do: Take out by the end of the day; No need to clean until Friday",
  "history": [],
  "__v": 0,
  "location": ""
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef40"
  },
  "make": "Nissan",
  "model": "Navara",
  "badge": "ST",
  "rego": "1GP5AQ",
  "year": 2016,
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef42"
  },
  "make": "Toyota",
  "model": "Hilux",
  "badge": "SR5 Double Cab",
  "rego": "1MK9FU",
  "year": 2018,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "Al's",
      "dateAdded": {
        "$date": "2025-05-27T22:57:22.950Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "68364352baf8d7692a9aef68"
      }
    }
  ],
  "__v": 0,
  "location": "Al's"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef44"
  },
  "make": "BMW",
  "model": "X1",
  "badge": "sDrive18d",
  "rego": "1BC8XH",
  "year": 2014,
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "Check shuddering in reverse"
  ],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef46"
  },
  "make": "Holden",
  "model": "Commodore",
  "badge": "LT Sportwagon",
  "rego": "1ME2NM",
  "year": 2018,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "ALs",
      "dateAdded": {
        "$date": "2025-05-21T10:32:46.694Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "682dabcec027b7a6c37ef1e9"
      }
    }
  ],
  "__v": 0,
  "location": ""
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef48"
  },
  "make": "Mazda",
  "model": "BT-50",
  "badge": "XTR 4x2 Hi-Rider",
  "rego": "1QB1CV",
  "year": 2019,
  "description": "Black",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef4a"
  },
  "make": "Volkswagen",
  "model": "Transporter",
  "badge": "",
  "rego": "1ZR5ON",
  "year": 2010,
  "description": "Green",
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "Fix AC"
  ],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef4c"
  },
  "make": "Toyota",
  "model": "Corolla",
  "badge": "CSi Seca",
  "rego": "PCB969",
  "year": 1998,
  "description": "Red",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef4e"
  },
  "make": "Holden",
  "model": "Astra",
  "badge": "GTC Sport",
  "rego": "1RC8TR",
  "year": 2015,
  "description": "Red",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef50"
  },
  "make": "Ford",
  "model": "Falcon",
  "badge": "XR6",
  "rego": "AZX082",
  "year": 2014,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef52"
  },
  "make": "Kia",
  "model": "Optima",
  "badge": "Platinum",
  "rego": "YIF002",
  "year": 2011,
  "description": "Blue",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "Al's; Al; Al's; Al's; Is sold; Is sold; Is sold",
  "history": [
    {
      "location": "Picked up",
      "dateAdded": {
        "$date": "2025-05-27T06:58:25.413Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "68356291efb811d686a3e05c"
      }
    }
  ],
  "__v": 0,
  "next": "Picked up",
  "location": "Picked up"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef58"
  },
  "make": "Mercedes-Benz",
  "model": "E-Class",
  "badge": "E250 7G-TRONIC +",
  "rego": "BOJ926",
  "year": 2015,
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef5a"
  },
  "make": "BMW",
  "model": "5 Series",
  "badge": "520d Steptronic",
  "rego": "AQI993",
  "year": 2013,
  "description": "Grey",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef5c"
  },
  "make": "Volvo",
  "model": "XC90",
  "badge": "D5 Geartronic AWD Inscrip",
  "rego": "AUO540",
  "year": 2018,
  "description": "Black",
  "stage": "Online",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef5e"
  },
  "make": "Subaru",
  "model": "Liberty",
  "badge": "2.5i Lineartronic AWD",
  "rego": "2CC8GI",
  "year": 2011,
  "description": "Grey",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef60"
  },
  "make": "Ford",
  "model": "Focus",
  "badge": "ST",
  "rego": "AGP924",
  "year": 2015,
  "description": "Red",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef62"
  },
  "make": "Mazda",
  "model": "BT-50",
  "badge": "XT Freestyle 4x2 Hi-Rider",
  "rego": "1JV8EO",
  "year": 2017,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef64"
  },
  "make": "Mitsubishi",
  "model": "Challenger",
  "badge": "",
  "rego": "ZDD990",
  "year": 2011,
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef66"
  },
  "make": "Ford",
  "model": "Falcon",
  "badge": "XR6 Ute Super Cab",
  "rego": "XDE957",
  "year": 2009,
  "description": "Blue",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef68"
  },
  "make": "Ford",
  "model": "FPV",
  "badge": "",
  "rego": "F6X175",
  "year": 2008,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef6a"
  },
  "make": "Hyundai",
  "model": "i30",
  "badge": "",
  "rego": "ZKW949",
  "year": 2012,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "Haytham",
      "dateAdded": {
        "$date": "2025-05-27T06:53:16.757Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "6835615cefb811d686a3dff7"
      }
    }
  ],
  "__v": 0,
  "location": "Haytham"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef6c"
  },
  "make": "Toyota",
  "model": "Hilux",
  "badge": "Workmate Double Cab 4x2",
  "rego": "1YS8AM",
  "year": 2014,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef6e"
  },
  "make": "Holden",
  "model": "Caprice",
  "badge": "",
  "rego": "WYB394",
  "year": 2009,
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "Check airbag light"
  ],
  "notes": "Joel coming late this afternoon",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef70"
  },
  "make": "Hyundai",
  "model": "i20",
  "badge": "Active",
  "rego": "789SWM",
  "year": 2013,
  "description": "Blue",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "; To Do: Inform Joseph or Frank Cerra about the balance",
  "history": [
    {
      "location": "Northpoint",
      "dateAdded": {
        "$date": "2025-05-21T04:43:50.227Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "682d5a06c027b7a6c37ef000"
      }
    }
  ],
  "__v": 0,
  "location": "Northpoint"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef72"
  },
  "make": "Holden",
  "model": "Colorado",
  "badge": "Z71 Pickup Crew Cab",
  "rego": "1QJ2MX",
  "year": 2017,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef74"
  },
  "make": "Kia",
  "model": "Carnival",
  "badge": "Platinum",
  "rego": "AKB126",
  "year": 2016,
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "Unique Automotive",
      "dateAdded": {
        "$date": "2025-05-26T12:02:31.946Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "68345857efb811d686a3dcb1"
      }
    }
  ],
  "__v": 0,
  "location": "Unique Automotive"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef76"
  },
  "make": "Ford",
  "model": "Ranger",
  "badge": "XLT Double Cab",
  "rego": "1EA9FI",
  "year": 2014,
  "description": "black",
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "Tonneau cover too small"
  ],
  "notes": "Tonneau cover too small; Tonneau cover too small; To Do: Taking photos of interiors; To Do: Back seats need a clean; Tonneau cover too small; To Do: Taking photos of interiors; To Do: Back seats need a clean; Tonneau cover too small; Tonneau cover too small; Northpoint",
  "history": [
    {
      "location": "Capital",
      "dateAdded": {
        "$date": "2025-06-01T06:48:34.445Z"
      },
      "dateLeft": {
        "$date": "2025-06-01T08:45:49.180Z"
      },
      "_id": {
        "$oid": "683bf7c210ba1bf1b44b333e"
      }
    },
    {
      "location": "capital",
      "dateAdded": {
        "$date": "2025-06-01T08:45:49.181Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "683c133da5a0d5e8fba6fd8b"
      }
    }
  ],
  "__v": 0,
  "location": "capital",
  "next": []
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef78"
  },
  "make": "Kia",
  "model": "Sorento",
  "badge": "SLi",
  "rego": "1FJ3YK",
  "year": 2015,
  "description": "Red",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef7a"
  },
  "make": "Mazda",
  "model": "BT50",
  "badge": "",
  "rego": "1EW2HC",
  "year": 2015,
  "description": "Grey",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "clean; Is sold",
  "history": [],
  "__v": 0,
  "next": []
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef7c"
  },
  "make": "Nissan",
  "model": "Patrol",
  "badge": "",
  "rego": "1CT6ZA",
  "year": 2012,
  "description": "Gold",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "Louie",
      "dateAdded": {
        "$date": "2025-05-26T06:50:22.308Z"
      },
      "dateLeft": {
        "$date": "2025-05-26T12:02:16.290Z"
      },
      "_id": {
        "$oid": "68340f2eefb811d686a3d60c"
      }
    },
    {
      "location": "Sky",
      "dateAdded": {
        "$date": "2025-05-26T12:02:16.290Z"
      },
      "dateLeft": {
        "$date": "2025-05-29T07:15:40.109Z"
      },
      "_id": {
        "$oid": "68345848efb811d686a3dc94"
      }
    },
    {
      "location": "Unique",
      "dateAdded": {
        "$date": "2025-05-29T07:15:40.114Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "6838099cc2243da66c1f3849"
      }
    }
  ],
  "__v": 0,
  "location": "Unique",
  "status": "Ready"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef7e"
  },
  "make": "Nissan",
  "model": "Navara",
  "badge": "",
  "rego": "UKK842",
  "year": 2006,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef80"
  },
  "make": "Toyota",
  "model": "Kluger",
  "badge": "KX-R 2WD",
  "rego": "1AW6IQ",
  "year": 2013,
  "description": "Grey",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef82"
  },
  "make": "Ford",
  "model": "Territory",
  "badge": "Titanium Seq Sport Shift",
  "rego": "ABF051",
  "year": 2011,
  "description": "Blue",
  "stage": "Online",
  "photos": [],
  "checklist": [],
  "notes": "Northpoint",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef84"
  },
  "make": "Toyota",
  "model": "Landcruiser",
  "badge": "GXL",
  "rego": "1ZS7MF",
  "year": 2007,
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "Northpoint",
  "history": [],
  "__v": 0,
  "location": ""
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef86"
  },
  "make": "Mercedes-Benz",
  "model": "GLE-Class",
  "badge": "GLE350 d 9G-TRONIC 4MATIC",
  "rego": "CQW743",
  "year": 2015,
  "description": "Grey",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef88"
  },
  "make": "BMW",
  "model": "3 Series",
  "badge": "330i M Sport",
  "rego": "AOY821",
  "year": 2017,
  "description": "Grey",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef8b"
  },
  "make": "Toyota",
  "model": "Hilux",
  "badge": "SR5",
  "rego": "WUV039",
  "year": 2008,
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef8d"
  },
  "make": "Nissan",
  "model": "Patrol",
  "badge": "4X4",
  "rego": "XGP199",
  "year": 2009,
  "description": "Red",
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "Check oil leak"
  ],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef8f"
  },
  "make": "Volkswagen",
  "model": "Tiguan",
  "badge": "132TSI Comfortline DSG 4M",
  "rego": "AZH790",
  "year": 2018,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef91"
  },
  "make": "Ford",
  "model": "Territory",
  "badge": "Titanium Seq Sport Shift",
  "rego": "2CM2MP",
  "year": 2011,
  "description": "Brown",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef93"
  },
  "make": "Holden",
  "model": "Colorado",
  "badge": "LS-X Crew Cab",
  "rego": "1HM6ZM",
  "year": 2016,
  "description": "White",
  "stage": "Sold",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef95"
  },
  "make": "Haval",
  "model": "H2",
  "badge": "LUX 2WD",
  "rego": "1TO2AJ",
  "year": 2021,
  "description": "Red",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef97"
  },
  "make": "Toyota",
  "model": "Hilux",
  "badge": "",
  "rego": "1XX4MW",
  "year": 2017,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "Imad's",
      "dateAdded": {
        "$date": "2025-05-26T06:52:27.356Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "68340fabefb811d686a3d6b8"
      }
    }
  ],
  "__v": 0,
  "location": "Imad's"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef99"
  },
  "make": "Hyundai",
  "model": "ix35",
  "badge": "",
  "rego": "AGD551",
  "year": 2015,
  "description": "Silver",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "Should be ready later today; Should be ready later today; Should be ready later today; Ready later today",
  "history": [
    {
      "location": "BJM",
      "dateAdded": {
        "$date": "2025-05-23T10:47:04.068Z"
      },
      "dateLeft": {
        "$date": "2025-05-26T00:57:32.432Z"
      },
      "_id": {
        "$oid": "683052283fc0fa5dccfecdc2"
      }
    },
    {
      "location": "Haythams",
      "dateAdded": {
        "$date": "2025-05-26T00:57:32.433Z"
      },
      "dateLeft": {
        "$date": "2025-05-26T23:08:01.794Z"
      },
      "_id": {
        "$oid": "6833bc7cefb811d686a3d505"
      }
    },
    {
      "location": "bjm",
      "dateAdded": {
        "$date": "2025-05-26T23:08:01.794Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "6834f451efb811d686a3dec7"
      }
    }
  ],
  "__v": 0,
  "location": "bjm",
  "next": "Picked up",
  "status": "later today"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef9b"
  },
  "make": "Holden",
  "model": "Astra",
  "badge": "VXR",
  "rego": "AHE292",
  "year": 2015,
  "description": "Blue",
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "Check tyre damage"
  ],
  "notes": "Tyre damage; Tyre damage",
  "history": [
    {
      "location": "Northpoint",
      "dateAdded": {
        "$date": "2025-06-01T05:00:02.129Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "683bde52a9a9e76ee08ae94e"
      }
    }
  ],
  "__v": 0,
  "next": [
    {
      "location": "Capital",
      "created": {
        "$date": "2025-06-01T04:57:11.837Z"
      },
      "_id": {
        "$oid": "683bdda7a9a9e76ee08ae8b3"
      }
    }
  ],
  "location": "Northpoint"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef9d"
  },
  "make": "Mazda",
  "model": "CX-9",
  "badge": "Azami SKYACTIV-Drive",
  "rego": "1IZ7JZ",
  "year": 2016,
  "description": "Blue",
  "stage": "Sold",
  "photos": [],
  "checklist": [],
  "notes": "Imad",
  "history": [
    {
      "location": "with Sam",
      "dateAdded": {
        "$date": "2025-05-21T10:22:04.362Z"
      },
      "dateLeft": {
        "$date": "2025-05-21T10:22:32.849Z"
      },
      "_id": {
        "$oid": "682da94cc027b7a6c37ef062"
      }
    },
    {
      "location": "with Imad",
      "dateAdded": {
        "$date": "2025-05-21T10:22:32.850Z"
      },
      "dateLeft": {
        "$date": "2025-05-21T10:42:56.099Z"
      },
      "_id": {
        "$oid": "682da968c027b7a6c37ef072"
      }
    },
    {
      "location": "with Christian",
      "dateAdded": {
        "$date": "2025-05-21T10:42:56.099Z"
      },
      "dateLeft": {
        "$date": "2025-05-21T11:33:59.987Z"
      },
      "_id": {
        "$oid": "682dae30c027b7a6c37ef260"
      }
    },
    {
      "location": "Imad",
      "dateAdded": {
        "$date": "2025-05-21T11:33:59.987Z"
      },
      "dateLeft": {
        "$date": "2025-05-30T04:25:39.731Z"
      },
      "_id": {
        "$oid": "682dba2700b6f9ebb4394e33"
      }
    },
    {
      "location": "gapped up bodyworks",
      "dateAdded": {
        "$date": "2025-05-30T04:25:39.732Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "68393343ad630e042ed294df"
      }
    }
  ],
  "__v": 0,
  "location": "gapped up bodyworks"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef9f"
  },
  "make": "Subaru",
  "model": "Liberty",
  "badge": "2.5i Sports Lineartronic ",
  "rego": "YHB988",
  "year": 2010,
  "description": "Grey",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eefa1"
  },
  "make": "Mazda",
  "model": "2",
  "badge": "Neo",
  "rego": "ZEI968",
  "year": 2012,
  "description": "Red",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "Imad",
      "dateAdded": {
        "$date": "2025-05-21T04:44:00.418Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "682d5a10c027b7a6c37ef01f"
      }
    }
  ],
  "__v": 0,
  "location": "Imad"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eefa3"
  },
  "make": "Hyundai",
  "model": "Tucson",
  "badge": "",
  "rego": "1XJ3CH",
  "year": 2017,
  "description": "Blue",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "Louie",
      "dateAdded": {
        "$date": "2025-05-21T04:44:10.551Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "682d5a1ac027b7a6c37ef02a"
      }
    }
  ],
  "__v": 0,
  "location": "Louie"
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eefa5"
  },
  "make": "Hummer",
  "model": "H2",
  "badge": "h206B",
  "rego": "1TC6JJ",
  "year": 2008,
  "description": "Yellow",
  "stage": "Online",
  "photos": [],
  "checklist": [],
  "notes": "Unique; Unique; Unique; Northpoint; Sam to take it to figure out what to do with the hot dog muffler; To Do: Christian driving home and Sam to take it to figure out what to do with the hot dog muffler",
  "history": [
    {
      "location": "ALs",
      "dateAdded": {
        "$date": "2025-05-20T21:49:21.819Z"
      },
      "dateLeft": {
        "$date": "2025-05-21T11:19:33.481Z"
      },
      "_id": {
        "$oid": "682cf8e1c027b7a6c37eefb4"
      }
    },
    {
      "location": "Unique",
      "dateAdded": {
        "$date": "2025-05-21T11:19:33.483Z"
      },
      "dateLeft": {
        "$date": "2025-05-21T11:53:33.860Z"
      },
      "_id": {
        "$oid": "682db6c500b6f9ebb4394dfd"
      }
    },
    {
      "location": "John",
      "dateAdded": {
        "$date": "2025-05-21T11:53:33.863Z"
      },
      "dateLeft": {
        "$date": "2025-05-21T12:31:21.555Z"
      },
      "_id": {
        "$oid": "682dbebdd981b44bde1f5162"
      }
    },
    {
      "location": "Haytham",
      "dateAdded": {
        "$date": "2025-05-21T12:31:21.558Z"
      },
      "dateLeft": {
        "$date": "2025-06-03T04:01:58.291Z"
      },
      "_id": {
        "$oid": "682dc7993fc0fa5dccfecd06"
      }
    },
    {
      "location": "with Christian",
      "dateAdded": {
        "$date": "2025-06-03T04:01:58.291Z"
      },
      "dateLeft": null,
      "message": "Joseph: Christian driving Hummer home. Sam to take it to figure out what to do with the hot dog muffler",
      "_id": {
        "$oid": "683e73b6957b318e2b59f726"
      }
    }
  ],
  "__v": 1,
  "location": "with Christian",
  "next": [
    {
      "location": "Unique",
      "created": {
        "$date": "2025-05-29T05:16:50.217Z"
      },
      "_id": {
        "$oid": "6837edc22dd3fa1a4f9f12ba"
      }
    }
  ],
  "pendingLocationUpdate": null
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eefa7"
  },
  "make": "Toyota",
  "model": "4 Runner",
  "badge": "",
  "rego": "ECT941",
  "year": 1990,
  "description": "Red",
  "stage": "Online",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eefa9"
  },
  "make": "Mitsubishi",
  "model": "Pajero Sport",
  "badge": "GLS",
  "rego": "1JC1MJ",
  "year": 2017,
  "description": "Brown",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef54"
  },
  "make": "Nissan",
  "model": "Navara",
  "badge": "RX King Cab 4x2",
  "rego": "1GL6EG",
  "year": 2015,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "682c6272c027b7a6c37eef56"
  },
  "make": "Toyota",
  "model": "Corolla",
  "badge": "SX",
  "rego": "1SF2OM",
  "year": 2015,
  "description": "White",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "6835656cefb811d686a3e07f"
  },
  "make": "Volvo",
  "model": "XC60",
  "badge": "",
  "rego": "111AAA",
  "year": null,
  "description": "Red",
  "location": "Mohammed",
  "status": "Ready",
  "next": "",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [
    {
      "location": "Replace sunroof motor",
      "dateAdded": {
        "$date": "2025-05-27T07:10:36.982Z"
      },
      "dateLeft": {
        "$date": "2025-05-29T04:21:04.930Z"
      },
      "_id": {
        "$oid": "6835656cefb811d686a3e080"
      }
    },
    {
      "location": "Mohammed",
      "dateAdded": {
        "$date": "2025-05-29T04:21:04.931Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "6837e0b05bbb3336f1caf8d2"
      }
    }
  ],
  "__v": 0
},
{
  "_id": {
    "$oid": "68365109baf8d7692a9aeff2"
  },
  "make": "Mazda",
  "model": "CX-3",
  "badge": "",
  "rego": "1KA1SO",
  "year": null,
  "description": "",
  "location": "BJM",
  "status": "Ready",
  "next": "Sky Trimming",
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "After getting tyres; Capital Discount Tyres; After getting tyres",
  "history": [
    {
      "location": "BJM",
      "dateAdded": {
        "$date": "2025-05-27T23:55:53.003Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "68365109baf8d7692a9aeff3"
      }
    }
  ],
  "__v": 0
},
{
  "_id": {
    "$oid": "6836846fafa9578b401c55a9"
  },
  "make": "Ford",
  "model": "Territory",
  "badge": "",
  "rego": "YABF-051",
  "year": null,
  "description": "Dark-blue with bullbar",
  "location": "Northpoint",
  "status": "In Works",
  "next": "",
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "[]"
  ],
  "notes": "",
  "history": [
    {
      "location": "Northpoint",
      "dateAdded": {
        "$date": "2025-05-28T03:35:11.076Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "6836846fafa9578b401c55aa"
      }
    }
  ],
  "__v": 0
},
{
  "_id": {
    "$oid": "683806e05481c7f46790fdb9"
  },
  "make": "Mazda",
  "model": "3",
  "badge": "",
  "rego": "ZLK679",
  "year": null,
  "description": "Grey",
  "location": "Haytham",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "; To Do: Check if can be cleaned with prepsol and cut out before sending to body",
  "history": [
    {
      "location": "Northpoint",
      "dateAdded": {
        "$date": "2025-06-02T02:03:07.855Z"
      },
      "dateLeft": {
        "$date": "2025-06-02T05:06:45.846Z"
      },
      "message": "H U S S: Grey Mazda 3 rego ZLK679 is at Northpoint",
      "_id": {
        "$oid": "683d065b1ddb15f82a7c9ee2"
      }
    },
    {
      "location": "Haytham",
      "dateAdded": {
        "$date": "2025-06-02T05:06:45.846Z"
      },
      "dateLeft": null,
      "message": "James: Mazda 3 ZLK679 is at Haytham",
      "_id": {
        "$oid": "683d31651ddb15f82a7c9fb1"
      }
    }
  ],
  "__v": 2,
  "status": "Ready",
  "pendingLocationUpdate": null
},
{
  "_id": {
    "$oid": "6838e694ad630e042ed293d2"
  },
  "make": "ford",
  "model": "civic",
  "badge": "GLX",
  "rego": "1HU4SH",
  "year": null,
  "description": "Blue",
  "location": "",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "Replace front bumper",
    "Replace front bumper"
  ],
  "notes": "Urgent; Urgent",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "68390471ad630e042ed29487"
  },
  "make": "Toyota",
  "model": "Hilux",
  "badge": "",
  "rego": "",
  "year": null,
  "description": "White",
  "location": "",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "1MK9FU",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "6839101aad630e042ed2949e"
  },
  "make": "Holden",
  "model": "Commodore",
  "badge": "",
  "rego": "2CR8VH",
  "year": null,
  "description": "White",
  "location": "Al's",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "68393339ad630e042ed294af"
  },
  "make": "Mitsubishi",
  "model": "Triton",
  "badge": "",
  "rego": "1RH1DX",
  "year": null,
  "description": "Dark gray",
  "location": "Capital",
  "next": [
    {
      "location": "Imad",
      "created": {
        "$date": "2025-05-30T04:25:29.602Z"
      },
      "_id": {
        "$oid": "68393339ad630e042ed294b2"
      }
    }
  ],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "Tomorrow; Tomorrow; Northpoint",
  "history": [
    {
      "location": "Capital",
      "dateAdded": {
        "$date": "2025-06-03T04:01:58.298Z"
      },
      "dateLeft": null,
      "message": "James: Grey Mitsubishi Triton was ready at Capital and they informed us",
      "_id": {
        "$oid": "683e73b6957b318e2b59f72a"
      }
    }
  ],
  "__v": 1,
  "pendingLocationUpdate": null
},
{
  "_id": {
    "$oid": "68393339ad630e042ed294b9"
  },
  "make": "Mazda",
  "model": "CX-5",
  "badge": "",
  "rego": "1EX6NV",
  "year": null,
  "description": "Grey",
  "location": "",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "wheel repair",
    "wheel repair"
  ],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "68393339ad630e042ed294bd"
  },
  "make": "Mazda",
  "model": "BT-50",
  "badge": "",
  "rego": "1KP3VW",
  "year": null,
  "description": "White with bullbar and Kings driving lights",
  "location": "Capital",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "with Sam; with Sam",
  "history": [
    {
      "location": "Al's",
      "dateAdded": {
        "$date": "2025-06-02T01:47:06.883Z"
      },
      "dateLeft": {
        "$date": "2025-06-03T04:01:58.301Z"
      },
      "message": "James: White Mazda BT-50 with canopy, rego 1KP3VW is at Al's",
      "_id": {
        "$oid": "683d029a1ddb15f82a7c9ed0"
      }
    },
    {
      "location": "Capital",
      "dateAdded": {
        "$date": "2025-06-03T04:01:58.301Z"
      },
      "dateLeft": null,
      "message": "James: White Mazda BT-50 with bullbar and Kings driving lights, rego 1KP3VW, is at Capital",
      "_id": {
        "$oid": "683e73b6957b318e2b59f72e"
      }
    }
  ],
  "__v": 2,
  "pendingLocationUpdate": null
},
{
  "_id": {
    "$oid": "68393fd5ad630e042ed29511"
  },
  "make": "Mazda",
  "model": "CX-3",
  "badge": "",
  "rego": "1KA-1SU",
  "year": null,
  "description": "White",
  "location": "Sky Car Trimming",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "683be9dae8504e95216df371"
  },
  "make": "Honda",
  "model": "Accord",
  "badge": "",
  "rego": "WKV376",
  "year": null,
  "description": "Black",
  "location": "",
  "status": "",
  "next": [
    {
      "location": "Capital",
      "created": {
        "$date": "2025-06-01T06:02:42.948Z"
      },
      "_id": {
        "$oid": "683bed02e8504e95216df382"
      }
    }
  ],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "clean; clean; Is sold",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "683be9dae8504e95216df377"
  },
  "make": "Ford",
  "model": "Ranger",
  "badge": "",
  "rego": "1MY5FK",
  "year": null,
  "description": "Grey",
  "location": "",
  "status": "",
  "next": [
    {
      "location": "Capital",
      "created": {
        "$date": "2025-06-01T06:02:42.970Z"
      },
      "_id": {
        "$oid": "683bed02e8504e95216df390"
      }
    }
  ],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "clean; clean; Is sold",
  "history": [],
  "__v": 0
},
{
  "_id": {
    "$oid": "683bf0b88b517730252ef913"
  },
  "make": "Toyota",
  "model": "Landcruiser Prado",
  "badge": "Kakadu",
  "rego": "xc769g",
  "year": null,
  "description": "",
  "location": "Al's",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "Check wheel bearing"
  ],
  "notes": "",
  "history": [
    {
      "location": "Al's",
      "dateAdded": {
        "$date": "2025-06-01T06:21:28.834Z"
      },
      "dateLeft": null,
      "_id": {
        "$oid": "683bf1684693645f07a411ca"
      }
    }
  ],
  "__v": 0
},
{
  "_id": {
    "$oid": "683d026d1ddb15f82a7c9ea5"
  },
  "make": "Kia",
  "model": "Sportage",
  "badge": "",
  "rego": "zhx868",
  "year": null,
  "description": "",
  "location": "Northpoint",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "pendingLocationUpdate": null,
  "__v": 0
},
{
  "_id": {
    "$oid": "683d026d1ddb15f82a7c9eac"
  },
  "make": "Holden",
  "model": "Cruze",
  "badge": "",
  "rego": "1HV3CJ",
  "year": null,
  "description": "Black",
  "location": "Unique",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "pendingLocationUpdate": null,
  "__v": 0
},
{
  "_id": {
    "$oid": "683d31351ddb15f82a7c9f61"
  },
  "make": "Suzuki",
  "model": "Swift",
  "badge": "",
  "rego": "1GR3RB",
  "year": null,
  "description": "",
  "location": "",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "Redbook inspection",
  "history": [],
  "pendingLocationUpdate": null,
  "__v": 0
},
{
  "_id": {
    "$oid": "683d31401ddb15f82a7c9f67"
  },
  "make": "Isuzu",
  "model": "D-Max",
  "badge": "",
  "rego": "1QY6SW",
  "year": null,
  "description": "White",
  "location": "Northpoint",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "; To Do: Remove the canopy",
  "history": [],
  "pendingLocationUpdate": null,
  "__v": 0,
  "status": "Ready"
},
{
  "_id": {
    "$oid": "683d4c011ddb15f82a7ca03a"
  },
  "make": "Mazda",
  "model": "B2500",
  "badge": "",
  "rego": "OYL 579",
  "year": null,
  "description": "White andcanopy andbullbar",
  "location": "",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "Bravo",
  "history": [],
  "pendingLocationUpdate": null,
  "__v": 0
},
{
  "_id": {
    "$oid": "683e7389957b318e2b59f5f3"
  },
  "make": "Mitsubishi",
  "model": "Triton",
  "badge": "",
  "rego": "1RG1DX",
  "year": null,
  "description": "Dark gray",
  "location": "",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "needs passenger front guard and door",
    "needs passenger front guard and door"
  ],
  "notes": "Imad",
  "history": [],
  "pendingLocationUpdate": null,
  "__v": 0
},
{
  "_id": {
    "$oid": "683e7389957b318e2b59f654"
  },
  "make": "Honda",
  "model": "Accord",
  "badge": "",
  "rego": "WXV376",
  "year": null,
  "description": "Black",
  "location": "Louie's",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "Honda Accord Euro to detail next; Honda Accord Euro to detail next; To Do: Detail next",
  "history": [
    {
      "location": "Louie's",
      "dateAdded": {
        "$date": "2025-06-03T04:01:58.304Z"
      },
      "dateLeft": null,
      "message": "H U S S: Black Honda Accord rego WXV 376 at Louie's",
      "_id": {
        "$oid": "683e73b6957b318e2b59f731"
      }
    }
  ],
  "pendingLocationUpdate": null,
  "__v": 1
},
{
  "_id": {
    "$oid": "683e738a957b318e2b59f6f3"
  },
  "make": "Nissan",
  "model": "Navara",
  "badge": "",
  "rego": "ASD-692",
  "year": null,
  "description": "White",
  "location": "Al's",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "pendingLocationUpdate": null,
  "__v": 0
},
{
  "_id": {
    "$oid": "683e8b8b957b318e2b5a2394"
  },
  "make": "Kia",
  "model": "Sportage",
  "badge": "",
  "rego": "1AAQ-917",
  "year": null,
  "description": "Black",
  "location": "MMM",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "pendingLocationUpdate": null,
  "__v": 0
},
{
  "_id": {
    "$oid": "683e8b8b957b318e2b5a239b"
  },
  "make": "honda",
  "model": "HRV",
  "badge": "",
  "rego": "10B6KI",
  "year": null,
  "description": "White",
  "location": "",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "White Honda HRV rego 10B6KI is immaculate",
  "history": [],
  "pendingLocationUpdate": null,
  "__v": 0
},
{
  "_id": {
    "$oid": "683ed328cf227b5f83268a72"
  },
  "make": "Honda",
  "model": "CRV",
  "badge": "",
  "rego": "999999",
  "year": null,
  "description": "",
  "location": "",
  "status": "In Works",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [],
  "notes": "",
  "history": [],
  "pendingLocationUpdate": null,
  "archived": false,
  "__v": 0,
  "archivedAt": null
},
{
  "_id": {
    "$oid": "683ed8767334d369ee1637fa"
  },
  "make": "Honda",
  "model": "CRV",
  "badge": "",
  "rego": "999888",
  "year": null,
  "description": "",
  "location": "",
  "status": "In Works",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "[\"\"]"
  ],
  "notes": "",
  "history": [],
  "pendingLocationUpdate": null,
  "archived": false,
  "__v": 0,
  "archivedAt": null
},
{
  "_id": {
    "$oid": "683eda17ee72558cf1b1c011"
  },
  "make": "Ford",
  "model": "Falcon",
  "badge": "",
  "rego": "aaa444",
  "year": null,
  "description": "",
  "location": "",
  "status": "In Works",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "[]"
  ],
  "notes": "",
  "history": [],
  "pendingLocationUpdate": null,
  "archived": false,
  "__v": 0,
  "archivedAt": null
},
{
  "_id": {
    "$oid": "683eda2bee72558cf1b1c022"
  },
  "make": "Holden",
  "model": "Commodore",
  "badge": "",
  "rego": "333hhh",
  "year": null,
  "description": "",
  "location": "",
  "status": "In Works",
  "next": [],
  "stage": "In Works",
  "photos": [],
  "checklist": [
    "[]"
  ],
  "notes": "",
  "history": [],
  "pendingLocationUpdate": null,
  "archived": false,
  "__v": 0
}]];

// MongoDB connection URI (update as needed)
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

const excludedRego = ["YNW557", "1ZU3ZF", "BCK027", "1SG9SS", "1PO5WZ"];

async function transformAndInsertCars() {
  try {
    await client.connect();
    const db = client.db('npaiDB');
    const collection = db.collection('cars');

    // Filter out excluded cars
    const filteredCars = carsData.filter(car => !excludedRego.includes(car.rego));

    // Transform each car
    const transformedCars = filteredCars.map(car => {
      const { _id, __v, ...rest } = car;
      let next = rest.next || [];
      if (typeof next === 'string') {
        next = [{ location: next, created: new Date("2025-06-05T04:04:00Z") }];
      } else if (Array.isArray(next)) {
        next = next.map(item => {
          const { _id, ...itemRest } = item;
          return {
            ...itemRest,
            created: new Date(item.created)
          };
        });
      }
      const history = (rest.history || []).map(item => {
        const { _id, ...itemRest } = item;
        return {
          ...itemRest,
          dateAdded: new Date(item.dateAdded),
          dateLeft: item.dateLeft ? new Date(item.dateLeft) : null
        };
      });
      const checklist = typeof rest.checklist === 'string' ? (rest.checklist === "[]" || rest.checklist === "[\"\"]" ? [] : JSON.parse(rest.checklist)) : rest.checklist;
      return {
        ...rest,
        next,
        history,
        checklist,
        archived: false,
        archivedAt: null,
        pendingLocationUpdate: rest.pendingLocationUpdate || null
      };
    });

    // Insert into MongoDB
    const result = await collection.insertMany(transformedCars);
    console.log(`${result.insertedCount} cars inserted successfully`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

transformAndInsertCars();