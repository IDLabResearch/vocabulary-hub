import * as RmlMapper from '@comake/rmlmapper-js';

// Note: Node-only dependencies (fs, os, path, child_process) are loaded
// dynamically inside the Node execution branch so this module can be bundled
// for the browser without pulling in Node core modules.

/**
 * Convert a YARRRML mapping (string or object) to RML using the installed
 * `@rmlio/yarrrml-parser` generator.
 *
 * @param {string|object} yarrrml - YARRRML content (YAML string) or parsed object
 * @returns {Promise<string>} RML mapping as Turtle string
 */
export async function yarrrmlToRml(yarrrml: string | object): Promise<string> {
  // Try to require the rml-generator module from @rmlio/yarrrml-parser
  let gen: any = null;
  try {
    // Prefer the RML generator path used in this repo's ambient types
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    gen = require("@rmlio/yarrrml-parser/lib/rml-generator");
  } catch (e) {
    try {
      // fallback to r2rml generator
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      gen = require("@rmlio/yarrrml-parser/lib/r2rml-generator");
    } catch (err) {
      throw new Error(
        "Missing @rmlio/yarrrml-parser. Install it with `npm install @rmlio/yarrrml-parser` to convert YARRRML to RML.`",
      );
    }
  }

  // The generator may export a function or a class. Try common invocation patterns.
  if (typeof gen === "function") {
    return String(gen(yarrrml));
  }
  if (gen && typeof gen.default === "function") {
    return String(gen.default(yarrrml));
  }

  // If it's an object with a .getRML() API (some builds), try that.
  try {
    const inst = new gen(yarrrml);
    if (typeof inst.getRML === "function") return String(inst.getRML());
    if (typeof inst.generate === "function") return String(inst.generate());
  } catch (e) {
    // fallthrough
  }

  throw new Error("Unable to invoke yarrrml parser: unknown module shape");
}

type DataSource =
  | { type: "file"; path: string }
  | { type: "string"; content: string; ext?: string }
  | { type: "url"; url: string };

/**
 * Map a data source using a YARRRML mapping and the rmlmapper-js tool.
 *
 * This function attempts to use a locally installed `rmlmapper-js` (or falls
 * back to invoking the CLI via `npx`). It writes temporary files for the
 * mapping and the data source when needed and returns the mapped RDF as a
 * string (N-Quads by default).
 *
 * Note: consumers must install `@rmlio/yarrrml-parser` and `rmlmapper-js` in
 * the project for this function to work. Example:
 *
 *   npm install @rmlio/yarrrml-parser rmlmapper-js
 *
 * @param {string|object} yarrrml - YARRRML mapping (string or parsed object)
 * @param {DataSource} source - Data source to map
 * @param {{format?: string}} [opts]
 * @returns {Promise<string>} mapped RDF (serialization depends on `opts.format`, default `nq`)
 */
export async function mapWithYarrrml(
  yarrrml: string | object,
  source: DataSource,
  opts: { format?: "nq" | "turtle" | "ntriples"; mapperUrl?: string } = { format: "nq" },
): Promise<string> {
  const format = opts.format ?? "nq";

  const rml = await yarrrmlToRml(yarrrml);

  // Create temp files (Node-only). We dynamically import Node core modules so
  // this file can still be bundled for the browser.
  // eslint-disable-next-line no-undef
  const nodeFs = await import("fs");
  const nodeOs = await import("os");
  const nodePath = await import("path");
  const { promisify } = await import("util");
  const { execFile } = await import("child_process");
  const execFileP = promisify(execFile as any);

  const tmpdir = await nodeFs.promises.mkdtemp(nodePath.join(nodeOs.tmpdir(), "rml-"));
  const mappingPath = nodePath.join(tmpdir, "mapping.rml.ttl");
  await nodeFs.promises.writeFile(mappingPath, rml, "utf8");

  let dataPath: string | undefined;
  let cleanupData = false;

  if (source.type === "file") {
    dataPath = source.path;
  } else if (source.type === "string") {
    const ext = source.ext ?? ".data";
    dataPath = nodePath.join(tmpdir, `source${ext}`);
    await nodeFs.promises.writeFile(dataPath, source.content, "utf8");
    cleanupData = true;
  } else if (source.type === "url") {
    // rmlmapper-js supports fetching remote sources when given a URL, but
    // invoking the CLI with a URL may work too. We'll pass the URL as-is.
    dataPath = source.url;
  }

  // Try to use a JS API if available (best-effort)
  // If running in a browser environment, delegate mapping to a remote mapper
  // service because `rmlmapper-js` depends on Node/Java tooling and is not
  // generally browser-compatible. The caller can provide `opts.mapperUrl` to
  // point to an HTTP endpoint that accepts `{ rml, source, format }` and
  // returns the mapped RDF as text.
  if (typeof window !== "undefined" && typeof window.fetch === "function") {
    const mapperUrl = opts.mapperUrl ?? "/api/rmlmapper";
    const payload: any = { rml, format };
    if (source.type === "url") payload.source = { type: "url", url: source.url };
    else if (source.type === "file") payload.source = { type: "file", path: source.path };
    else payload.source = { type: "string", content: source.content, ext: source.ext };

    const resp = await fetch(mapperUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Remote mapper failed: ${resp.status} ${resp.statusText}: ${text}`);
    }
    return await resp.text();
  }

  // Try to use a JS API if available (Node environment)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RmlMapper = require("rmlmapper-js");
    // Some builds export a class, some a function. Try known variants.
    if (typeof RmlMapper === "function") {
      // If the constructor exposes a `.execute` or `.map` method, try it.
      const inst = new RmlMapper();
      if (typeof inst.execute === "function") {
        const res = await inst.execute({ mapping: mappingPath, source: dataPath, format });
        // Try to return string result or write to stdout-equivalent
        if (typeof res === "string") return res;
        if (res && res.stdout) return String(res.stdout);
      }
      if (typeof RmlMapper === "function") {
        // fallback: if the module itself is a function that runs mapping
        const res = await RmlMapper(mappingPath, dataPath, { format });
        if (typeof res === "string") return res;
      }
    }
  } catch (e) {
    // ignore — we'll fallback to CLI invocation
  }

  // Fallback: invoke the rmlmapper CLI (via npx). Try common package names.
  const candidates = ["rmlmapper-js", "rmlmapper"]; // try both CLI names
  for (const pkg of candidates) {
    try {
      // npx <pkg> -m mapping -s source -f <format> -o -  (output to stdout)
      const args = [pkg, "-m", mappingPath, "-s", String(dataPath), "-f", format, "-o", "-"];
  const { stdout, stderr } = await execFileP("npx", args, { maxBuffer: 10 * 1024 * 1024 } as any);
      if (stderr && stderr.length) {
        // ignore warnings on stderr but continue if stdout exists
      }
      return stdout;
    } catch (err) {
      // try next candidate
    }
  }

  throw new Error(
    "rmlmapper-js not found or failed to run. Install `rmlmapper-js` (or ensure `npx rmlmapper-js` is available) and try again.",
  );
}

export default { yarrrmlToRml, mapWithYarrrml };
