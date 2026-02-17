/**
 * Utilities to:
 * - Extract Location header into an absolute URL
 * - Build an RDF/Turtle update block (DCAT-ish + PROV/AS profile bits)
 * - GET an RDF feed resource, append the update block, PUT it back (with If-Match on ETag)
 *
 * Works in Node 18+ (fetch built-in) and modern runtimes that support fetch/TextEncoder/TextDecoder.
 */

export function createUpdateString(
  newResourceLocation: string | URL,
  sourceDatasetUrl: string | URL,
  title: string,
  description: string,
  keywordArray: string[],
  ontologyUrls: string[],
  validationUrls: string[],
  feedId: string | URL,
  profile: string | null
): string {
  const resourceLocation = newResourceLocation.toString();
  const datasetUrl = sourceDatasetUrl.toString();
  const publishDateTime = formatUtcYYYYMMDDTHHMMZ(new Date());

  const creationId = `urn:deployEMDS:events:create:mapped_${resourceLocation}`;
  const profileId = `urn:deployEMDS:profiles:${datasetUrl}`;

  // Java built this by concatenation and trimming the last ", "
  // Here we build the same result more directly.
  const keywords = keywordArray.map((k) => `"${escapeQuotes(k)}"`).join(", ");

  let updateString = `#####################################
# dataset entry for ${datasetUrl}
#####################################

# --- Creation entry ---
<${creationId}>
  a as:Create ;
  as:object <${datasetUrl}> ;
  as:published "${publishDateTime}"^^xsd:dateTime .

# --- Member graph ---
<${creationId}> {

  # --- Dataset definition ---
  <${datasetUrl}> a dcat:Dataset ;
    dct:title "${escapeQuotes(title)}"@en ;
    dct:description "${escapeQuotes(description)}"@en ;`;
if (keywords && keywords.length) updateString +=`    dcat:keyword ${keywords} ;`;

updateString += `
    # --- Dataset distribution ---
    dcat:distribution [
      a dcat:Distribution ;
      dcat:accessURL <${resourceLocation}> ;
      dcat:mediaType "text/turtle" ;
      dct:format _:turtle_format ;
    ] .

  _:turtle_format a dct:MediaTypeOrExtent ;
    dct:identifier "text/turtle" ;
    rdfs:label "RDF Turtle"@en .
`;

  if (profile == null) {
    updateString += `
  ##########################################
  # Profile entry for <${datasetUrl}>
  ##########################################

  <${profileId}>
    a prof:Profile ;
    dct:title "Content profile for ${datasetUrl}"@en ;
`;

    for (const ontologyUrl of ontologyUrls) {
      updateString += `    # --- Used ontologies ---
    prof:hasResource [
      a prof:ResourceDescriptor ;
      prof:hasRole <http://www.w3.org/ns/dx/prof/role/vocabulary> ;
      prof:hasArtifact <${ontologyUrl}> ;
      dct:format "text/turtle" ;
      dcat:mediaType "text/turtle"
    ] ;
`;
    }

    for (const validationUrl of validationUrls) {
      updateString += `    # --- Validation info ---
    prof:hasResource [
      a prof:ResourceDescriptor ;
      prof:hasRole <http://www.w3.org/ns/dx/prof/role/validation> ;
      prof:hasArtifact <${validationUrl}> ;
      dct:format "text/turtle" ;
      dcat:mediaType "text/turtle"
    ] .
`;
    }

    updateString += `
  # --- Profile link ---
  <${datasetUrl}> dct:conformsTo <${profileId}> .
  <${feedId.toString()}> tree:member <${creationId}> .
}
`;
  } else {
    updateString += `
  # --- Profile link ---
  <${datasetUrl}> dct:conformsTo <${profile}> .
  <${feedId.toString()}> tree:member <${creationId}> .
}
`;
  }

  return updateString;
}

/**
 * Equivalent of the Java updateFeed():
 * - GET resourceUri (Authorization optional)
 * - Append updateString to body with newline normalization
 * - PUT back, preserving server Content-Type when present
 * - Uses If-Match with ETag if provided to avoid clobbering concurrent changes
 */
export async function updateFeed(
  resourceUri: string | URL,
  bearerToken: string | null,
  updateString: string
): Promise<void> {
  const url = resourceUri instanceof URL ? resourceUri : new URL(resourceUri);

  // 1) GET the resource
  const getHeaders: Record<string, string> = {};
  if (bearerToken && bearerToken.trim()) {
    getHeaders["Authorization"] = `Bearer ${bearerToken}`;
  }

  const getResp = await fetch(url, {
    method: "GET",
    headers: getHeaders,
    // JS fetch timeout is not built-in; use AbortController if you need strict timeouts.
  });

  console.error(`GET ${url.toString()} -> HTTP ${getResp.status}`);

  if (getResp.status < 200 || getResp.status >= 300) {
    throw new Error(`GET failed: HTTP ${getResp.status}`);
  }

  const etag = getResp.headers.get("etag"); // case-insensitive in fetch
  const contentTypeHeader = getResp.headers.get("content-type");
  const putContentType = (contentTypeHeader ? contentTypeHeader.split(";", 2)[0].trim() : "") || "application/octet-stream";

  // Read as bytes and decode UTF-8 (like Java did)
  const currentBodyBuf = await getResp.arrayBuffer();
  const existing0 = new TextDecoder("utf-8").decode(currentBodyBuf);

  // 2) Append updateString to existing body (ensure a blank line between)
  let existing = normalizeNewlines(existing0);
  let append = normalizeNewlines(updateString ?? "");

  let result = existing;

  // Ensure existing ends with newline, then add another newline
  if (result.length > 0 && !result.endsWith("\n")) result += "\n";
  result += "\n";
  result += append;
  if (result.length > 0 && !result.endsWith("\n")) result += "\n";

  // Mirror the Java debug print
  console.log(result);

  const updatedBody = new TextEncoder().encode(result);

  // 3) PUT the resource back
  const putHeaders: Record<string, string> = {
    "Content-Type": putContentType
  };

  if (bearerToken && bearerToken.trim()) {
    putHeaders["Authorization"] = `Bearer ${bearerToken}`;
  }
  if (etag && etag.trim()) {
    putHeaders["If-Match"] = etag;
  }

  const putResp = await fetch(url, {
    method: "PUT",
    headers: putHeaders,
    body: updatedBody
  });

  console.error(`PUT ${url.toString()} -> HTTP ${putResp.status}`);

  const putBodyText = await putResp.text();
  if (putBodyText && putBodyText.trim()) {
    console.error(putBodyText);
  }

  if (putResp.status < 200 || putResp.status >= 300) {
    throw new Error(`PUT failed: HTTP ${putResp.status}`);
  }
}

/** --- helpers --- */

function normalizeNewlines(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

// Format in UTC as: yyyy-MM-dd'T'HH:mm'Z'
function formatUtcYYYYMMDDTHHMMZ(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const MM = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  const HH = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  const ss = pad2(d.getUTCSeconds());
  return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}Z`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

// Java code didn’t escape quotes; this keeps Turtle literals from breaking if inputs contain " or \.
function escapeQuotes(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function postResourceAndGetLocation(targetUri: string, body: string, contentType: string) {
    const res = await fetch(targetUri, {
        method: "POST",
        body,
        headers: { "Content-Type": contentType}
    })

    if (!res.ok) {
        console.error('Could not post mapped resource to', targetUri, await res.text())
    }

    let loc = res.headers.get("Location");
    if (!loc) loc = res.headers.get("location");
    if (!loc) {
        console.error('Posted resource did not return a location, falling back to provided target', targetUri)
        loc = targetUri
    }

    return loc
}