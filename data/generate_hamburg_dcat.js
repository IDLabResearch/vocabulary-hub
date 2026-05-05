// 'PT1H', 'PT1D'

// const URL = INTERVAL 
//   ?`https://iot.hamburg.de/v1.1/Datastreams?%24filter=properties%2FserviceName%20eq%20%27HH_STA_AutomatisierteVerkehrsmengenerfassung%27%20and%20properties%2FaggregateDuration%20eq%20%27${INTERVAL}%27`
//   :`https://iot.hamburg.de/v1.1/Datastreams?%24filter=properties%2FserviceName%20eq%20%27HH_STA_AutomatisierteVerkehrsmengenerfassung%27`

// todo: fix URL encoding and pagination!
const PAGE_SIZE = 5;
const TIME_INTERVAL = "PT15M"
const PROFILE_LINK = "https://example.org/profile"
const CATALOG_HOME = "https://pod.rubendedecker.be/scholar/deployEMDS/data/datasets/catalog"
const LANGUAGE = "de"
const DESCRIPTIONLANG = "en"
const BASE = "https://pod.rubendedecker.be/scholar/deployEMDS/data/datasets/catalog"

const URL =
  "https://iot.hamburg.de/v1.1/Datastreams" +
  "?$filter=properties/serviceName eq 'HH_STA_AutomatisierteVerkehrsmengenerfassung'" +
  ` and properties/aggregateDuration eq '${TIME_INTERVAL}'` +
  `&$top=${PAGE_SIZE}`;

const CONTEXT = {
  "@context": {
    "@base": BASE,
    "dcat": "http://www.w3.org/ns/dcat#",
    "dct": "http://purl.org/dc/terms/",
    "skos": "",
    "foaf": "http://xmlns.com/foaf/0.1/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "geo": "http://www.opengis.net/ont/geosparql#",
    "locn": "http://www.w3.org/ns/locn#",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "mobilitydcatap": "https://w3id.org/mobilitydcat-ap#",
    "geometry": { "@id": "http://www.w3.org/ns/locn#geometry", "@type": "geo:wktLiteral" },
    "accrualPeriodicity": { "@id": "http://purl.org/dc/terms/accrualPeriodicity", "@type": "wkt:duration"},
    "spatial": "dct:spatial",
    "Location": "dct:Location",
    "geometry": {
      "@id": "locn:geometry",
      "@type": "geo:wktLiteral"
    }

  }
};

const HamburgLocation = {
  "@type": "dct:Location",
  "dct:identifier": { "@id": "http://publications.europa.eu/resource/authority/place/DEU_HAM" },
  "skos:inScheme": { "@id": "http://publications.europa.eu/resource/authority/place" }
}

async function datastreamToDataset(ds) {
  const datasetId = crypto.randomUUID()
  return { 
    datasetId,
    dataset: {
      "@id": `#${datasetId}`,
      "@type": "dcat:Dataset",
      "mobilitydcatap:mobilityTheme": { 
        "@id": "https://w3id.org/mobilitydcat-ap/mobility-theme/traffic-volume" 
      },
      "dct:title": {
        "@value": ds.name,
        "@language": LANGUAGE
      },
      "dct:description": {
        "@value": ds.description,
        "@language": LANGUAGE
      },

      "dct:publisher": {
        "@type": "foaf:Organization",
        "foaf:name": {
          "@value": ds.properties?.ownerData || "Freie und Hansestadt Hamburg",
          "@language": LANGUAGE
        }
        
      },

      "dct:spatial": await getLocationObject(ds),

      "dct:accrualPeriodicity": {
        "@value": ds.properties?.aggregateDuration,
        "@type": "xsd:duration"
      },
      // Temporal information expressed using DCAT‑AP compatible pattern
      "dct:temporal": {
        "@type": "dct:PeriodOfTime",
        "dct:description": `Aggregation interval: ${ds.properties?.aggregateDuration}`
        // dcat:startDate or time:hasBeginning, and dcat:endDate or time:hasEnd, respectively. 
      },

      // Relation to SensorThings resources (legally extensible)
      "dct:relation": [
        { "@id": ds["Sensor@iot.navigationLink"] },
        { "@id": ds["Thing@iot.navigationLink"] },
        { "@id": ds["ObservedProperty@iot.navigationLink"] }
      ],

      "dcat:distribution": [
        {
          "@type": "dcat:Distribution",
          "mobilitydcatap:mobilityDataStandard": {
            "@id": PROFILE_LINK
          },
          "dct:rights": { 
            "@id": "http://publications.europa.eu/resource/authority/access-right/PUBLIC"
          },
          "dcat:accessURL": {
            "@id": ds["Observations@iot.navigationLink"]
          },
          "dct:format": {
            "@id": "http://publications.europa.eu/resource/authority/file-type/JSON"
          }
        }
      ],

      // Optional but valid
      "dcat:landingPage": {
        "@id": ds.properties?.metadata
      }
    }
  };
}

async function getLocationObject(datastream) {
  const thing = await getThing(datastream)
  if (thing) return await getLocation(thing)
  else return {}
}

async function getThing(datastream) {
  const thingURL = datastream["Thing@iot.navigationLink"]
  if (!thingURL) return {}
  const thing = await fetch(thingURL)
  return await thing.json()
}

async function getLocation(thing){
  const locationURL = thing["Locations@iot.navigationLink"]
  if (!locationURL) return {};
  const locationsPage = await fetch(locationURL)
  const locationsJSON =  await locationsPage.json()
  const locations = (locationsJSON.value);
  if (!locations || !locations.length) return {}
  const location = locations[0].location
  const points = location.geometry?.coordinates
  if (!points || !points.length) return {}
  if (points.length === 2) {
    return ({
      "@type": "Location",
      "geometry": `POINT(${points.join(' ')})`
    })
  } else {
    return ({
      "@type": "Location",
      "geometry": `POLYGON(${points.join(' ')})`
    })
  }
}

async function datastreamsToCatalog(datastreams) {
  const recordEntries = await Promise.all(datastreams.map(datastreamToRecord))
  return {
    ...CONTEXT,

    "@type": "dcat:Catalog",

    "dct:title": {
      "@value": "Hamburg Traffic Counting Datasets",
      "@language": DESCRIPTIONLANG
    },
    "dct:description": {
      "@value": "Traffic counting datasets published via OGC SensorThings API",
      "@language": DESCRIPTIONLANG
    }, 
    "foaf:homepage": { "@id": CATALOG_HOME },

    "dct:spatial": HamburgLocation,

    "dct:publisher": {
      "@type": "foaf:Organization",
      "foaf:name": {
        "@value": "Freie und Hansestadt Hamburg",
        "@language": LANGUAGE
      }
    },

    "dcat:dataset": recordEntries.map(entry => { return({ "@id": entry.datasetId })} ),
    "dcat:record": recordEntries.map(entry => entry.record),
  };
}


async function datastreamToRecord(datastream) {
  const { datasetId, dataset } = await datastreamToDataset(datastream)
  return { 
    datasetId,
    record: {
      "@type": "dcat:CatalogRecord",
      "dct:created": { 
        "@value": (new Date()).toISOString() ,
        "@type": "xsd:dateTime"
      },
      "dct:language": LANGUAGE,
      "dct:modified": { 
        "@value": datastream.properties?.infoLastUpdate,
        "@type": "xsd:dateTime"
      },
      "foaf:primaryTopic": dataset
    }
  }
}



async function getTrafficCountingDatastreams() {
  console.error("URL", URL);

  const datastreams = await fetchAllPages(URL);

  console.error(`Fetched ${datastreams.length} datastreams`);

  const catalog = await datastreamsToCatalog(datastreams);
  return catalog;
}

async function fetchAllPages(url) {
  let results = [];
  let nextUrl = url;

  while (nextUrl) {
    console.error('fetching', nextUrl)

    const res = await fetch(nextUrl);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const page = await res.json();

    if (Array.isArray(page.value)) {
      results.push(...page.value);
    }

    // SensorThings pagination
    // nextUrl = page["@iot.nextLink"] ?? null;
    nextUrl = null;
  }

  return results;
}


/* ----- run ----- */
getTrafficCountingDatastreams()
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });