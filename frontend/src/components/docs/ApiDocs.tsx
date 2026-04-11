import { useEffect, useMemo, useState } from "react";
import { IconBook2, IconBraces, IconChevronDown, IconCopy, IconLink, IconRoute2 } from "@tabler/icons-react";

import { cn } from "../../lib/cn";
import { t } from "../../lib/i18n";

type LabelFn = (key: Parameters<typeof t>[1]) => string;
type SchemaView = "example" | "fields" | "schema";

interface OpenApiSchema {
  type?: string;
  format?: string;
  enum?: string[];
  example?: unknown;
  anyOf?: OpenApiSchema[];
  items?: OpenApiSchema;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  $ref?: string;
}

interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: OpenApiSchema }>;
  };
  responses?: Record<
    string,
    {
      description?: string;
      content?: Record<string, { schema?: OpenApiSchema }>;
    }
  >;
}

interface OpenApiDocument {
  openapi?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  tags?: Array<{
    name: string;
    description?: string;
  }>;
  servers?: Array<{
    url?: string;
    description?: string;
  }>;
  paths?: Record<string, Record<string, OpenApiOperation>>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
}

interface ApiDocsProps {
  label: LabelFn;
}

interface EndpointEntry {
  id: string;
  path: string;
  method: string;
  summary: string;
  tag: string;
  requestSchema?: OpenApiSchema;
  requestRequired?: boolean;
  requestRef?: string;
  responses: Array<{
    status: string;
    description: string;
    schema?: OpenApiSchema;
    ref?: string;
  }>;
}

function methodStyle(method: string): string {
  const normalized = method.toUpperCase();
  if (normalized === "POST") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }
  if (normalized === "GET") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  }
  if (normalized === "PUT" || normalized === "PATCH") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }
  return "border-zinc-700 bg-zinc-800 text-zinc-200";
}

function refName(ref?: string): string {
  if (!ref) {
    return "n/a";
  }

  const parts = ref.split("/");
  return parts[parts.length - 1] || ref;
}

function operationId(method: string, path: string): string {
  return `${method}-${path}`.replace(/[^\w-]/g, "_");
}

function schemaType(schema?: OpenApiSchema): string {
  if (!schema) {
    return "n/a";
  }

  if (schema.$ref) {
    return refName(schema.$ref);
  }

  if (schema.enum && schema.enum.length > 0) {
    return `enum(${schema.enum.join(" | ")})`;
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    return schema.anyOf.map((entry) => schemaType(entry)).join(" | ");
  }

  if (schema.type === "array") {
    return `array<${schemaType(schema.items)}>`;
  }

  if (schema.format) {
    return `${schema.type || "unknown"} (${schema.format})`;
  }

  return schema.type || "unknown";
}

function schemaExample(schema?: OpenApiSchema): string {
  if (!schema) {
    return "n/a";
  }

  if (schema.example !== undefined) {
    return String(schema.example);
  }

  if (schema.enum?.length) {
    return schema.enum[0];
  }

  if (schema.$ref) {
    return refName(schema.$ref);
  }

  if (schema.type === "boolean") {
    return "true";
  }
  if (schema.type === "integer" || schema.type === "number") {
    return "0";
  }
  if (schema.type === "array") {
    return "[]";
  }
  if (schema.type === "object") {
    return "{}";
  }

  return "example";
}

function buildExampleValue(schema: OpenApiSchema | undefined, schemas: Record<string, OpenApiSchema>, depth = 0): unknown {
  if (!schema || depth > 4) {
    return null;
  }

  if (schema.example !== undefined) {
    return schema.example;
  }

  if (schema.$ref) {
    const resolved = schemas[refName(schema.$ref)];
    return buildExampleValue(resolved, schemas, depth + 1);
  }

  if (schema.anyOf?.length) {
    return buildExampleValue(schema.anyOf[0], schemas, depth + 1);
  }

  if (schema.enum?.length) {
    return schema.enum[0];
  }

  if (schema.type === "object") {
    const entries = Object.entries(schema.properties || {}).map(([key, value]) => [key, buildExampleValue(value, schemas, depth + 1)]);
    return Object.fromEntries(entries);
  }

  if (schema.type === "array") {
    return [buildExampleValue(schema.items, schemas, depth + 1)];
  }

  if (schema.type === "integer" || schema.type === "number") {
    return 0;
  }
  if (schema.type === "boolean") {
    return true;
  }

  return "string";
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function resolveSchema(schema: OpenApiSchema | undefined, schemas: Record<string, OpenApiSchema>): OpenApiSchema | undefined {
  if (!schema) {
    return undefined;
  }
  if (schema.$ref) {
    return schemas[refName(schema.$ref)];
  }
  return schema;
}

function SchemaTabs({
  endpointId,
  label,
  view,
  onChange,
  schema,
  schemas,
  requiredSet,
}: {
  endpointId: string;
  label: LabelFn;
  view: SchemaView;
  onChange: (value: SchemaView) => void;
  schema?: OpenApiSchema;
  schemas: Record<string, OpenApiSchema>;
  requiredSet: Set<string>;
}) {
  const resolved = resolveSchema(schema, schemas);
  const properties = Object.entries(resolved?.properties || {});
  const example = buildExampleValue(schema, schemas);

  return (
    <div>
      <div className="mb-2 grid grid-cols-3 gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
        {(["example", "fields", "schema"] as const).map((item) => (
          <button
            key={`${endpointId}-${item}`}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              "cursor-pointer rounded-md px-2 py-1.5 text-xs transition-colors",
              view === item ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            {label(item === "example" ? "exampleTab" : item === "fields" ? "fieldsTab" : "schemaTab")}
          </button>
        ))}
      </div>

      {view === "example" ? (
        <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">{prettyJson(example)}</pre>
      ) : null}

      {view === "fields" ? (
        properties.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="min-w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900 text-zinc-500">
                <tr>
                  <th className="px-2 py-1.5">{label("parameter")}</th>
                  <th className="px-2 py-1.5">{label("type")}</th>
                  <th className="px-2 py-1.5">{label("required")}</th>
                  <th className="px-2 py-1.5">{label("example")}</th>
                </tr>
              </thead>
              <tbody>
                {properties.map(([name, entry]) => (
                  <tr key={`${endpointId}-${name}`} className="border-t border-zinc-800">
                    <td className="px-2 py-1.5 font-medium text-zinc-200">{name}</td>
                    <td className="px-2 py-1.5">{schemaType(entry)}</td>
                    <td className="px-2 py-1.5">{requiredSet.has(name) ? label("yes") : label("no")}</td>
                    <td className="px-2 py-1.5">{schemaExample(entry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">{label("noParameters")}</p>
        )
      ) : null}

      {view === "schema" ? (
        <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
          {prettyJson(schema || {})}
        </pre>
      ) : null}
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: LabelFn }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
    >
      <IconCopy size={12} />
      {copied ? label("copied") : label("copy")}
    </button>
  );
}

export function ApiDocs({ label }: ApiDocsProps) {
  const [doc, setDoc] = useState<OpenApiDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestViews, setRequestViews] = useState<Record<string, SchemaView>>({});
  const [responseViews, setResponseViews] = useState<Record<string, SchemaView>>({});
  const [selectedResponseStatus, setSelectedResponseStatus] = useState<Record<string, string>>({});
  const [schemaSearch, setSchemaSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOpenApi() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/openapi.json", {
          headers: {
            accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`${label("requestFailed")} ${response.status}`);
        }

        const payload = (await response.json()) as OpenApiDocument;
        if (!cancelled) {
          setDoc(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : label("unknownError"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOpenApi();

    return () => {
      cancelled = true;
    };
  }, [label]);

  const schemas = doc?.components?.schemas || {};

  const groupedEndpoints = useMemo(() => {
    if (!doc?.paths) {
      return [];
    }

    const byTag = new Map<string, EndpointEntry[]>();

    for (const [path, methods] of Object.entries(doc.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        const tag = operation.tags?.[0] || "default";
        const requestSchema = operation.requestBody?.content?.["application/json"]?.schema;
        const id = operationId(method.toUpperCase(), path);
        const entry: EndpointEntry = {
          id,
          path,
          method: method.toUpperCase(),
          summary: operation.summary || "",
          tag,
          requestSchema,
          requestRequired: operation.requestBody?.required ?? false,
          requestRef: requestSchema?.$ref,
          responses: Object.entries(operation.responses || {}).map(([status, response]) => ({
            status,
            description: response.description || "",
            schema: response.content?.["application/json"]?.schema,
            ref: response.content?.["application/json"]?.schema?.$ref,
          })),
        };

        const bucket = byTag.get(tag) || [];
        bucket.push(entry);
        byTag.set(tag, bucket);
      }
    }

    const knownTagOrder = doc.tags?.map((tag) => tag.name) || [];
    const known = knownTagOrder
      .filter((tag) => byTag.has(tag))
      .map((tag) => ({
        tag,
        description: doc.tags?.find((entry) => entry.name === tag)?.description || "",
        endpoints: byTag.get(tag) || [],
      }));

    const unknown = Array.from(byTag.entries())
      .filter(([tag]) => !knownTagOrder.includes(tag))
      .map(([tag, endpoints]) => ({
        tag,
        description: "",
        endpoints,
      }));

    return [...known, ...unknown];
  }, [doc]);

  const allEndpointCount = groupedEndpoints.reduce((sum, group) => sum + group.endpoints.length, 0);

  const filteredSchemas = useMemo(() => {
    const query = schemaSearch.trim().toLowerCase();
    return Object.entries(schemas)
      .filter(([name]) => (query ? name.toLowerCase().includes(query) : true))
      .map(([name, schema]) => ({
        name,
        schema,
        propertyCount: Object.keys(schema.properties || {}).length,
      }));
  }, [schemas, schemaSearch]);

  function setRequestView(id: string, view: SchemaView) {
    setRequestViews((prev) => ({ ...prev, [id]: view }));
  }

  function setResponseView(id: string, view: SchemaView) {
    setResponseViews((prev) => ({ ...prev, [id]: view }));
  }

  function setResponseStatus(id: string, status: string) {
    setSelectedResponseStatus((prev) => ({ ...prev, [id]: status }));
  }

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-100 md:text-5xl">{label("docsTitle")}</h1>
        <p className="mt-3 text-sm text-zinc-400 md:text-base">{label("docsSubtitle")}</p>
      </div>

      {loading ? <p className="text-sm text-zinc-500">{label("docsLoading")}</p> : null}
      {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      {!loading && !error && doc ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-sm font-medium text-zinc-100">
                <IconBook2 size={16} className="text-zinc-400" />
                {doc.info?.title || "mhio Web Analytics API"}
              </h2>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-zinc-300">
                  {label("openApiVersion")}: {doc.openapi || "n/a"}
                </span>
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-zinc-300">
                  {label("apiVersion")}: {doc.info?.version || "n/a"}
                </span>
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-zinc-300">
                  {label("apiEndpoints")}: {allEndpointCount}
                </span>
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-zinc-300">
                  {label("schemaOverview")}: {Object.keys(schemas).length}
                </span>
              </div>
            </div>
            <p className="text-sm text-zinc-400">{doc.info?.description}</p>
            <div className="mt-3 grid gap-2 text-xs text-zinc-300 md:grid-cols-2">
              {(doc.servers || []).map((server, index) => (
                <p key={`${server.url}-${index}`} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                  {label("server")}: <span className="font-medium text-zinc-100">{server.url || "n/a"}</span>
                </p>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <a
                href="/openapi.json"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-zinc-200 transition-colors hover:border-zinc-600 hover:text-zinc-100"
              >
                <IconLink size={13} />
                {label("openApiJson")}
              </a>
              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-zinc-200 transition-colors hover:border-zinc-600 hover:text-zinc-100"
              >
                <IconLink size={13} />
                {label("swaggerUi")}
              </a>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-zinc-100">
              <IconRoute2 size={16} className="text-zinc-400" />
              {label("apiEndpoints")}
            </h3>

            <div className="space-y-3">
              {groupedEndpoints.map((group) => (
                <section id={`tag-${group.tag}`} key={group.tag} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                  <div className="mb-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label("tag")}</p>
                    <h4 className="text-sm font-semibold text-zinc-100">{group.tag}</h4>
                    {group.description ? <p className="mt-1 text-xs text-zinc-400">{group.description}</p> : null}
                  </div>

                  <div className="space-y-2">
                    {group.endpoints.map((endpoint) => {
                      const responseStatus = selectedResponseStatus[endpoint.id] || endpoint.responses[0]?.status;
                      const selectedResponse = endpoint.responses.find((entry) => entry.status === responseStatus) || endpoint.responses[0];
                      const requestSchema = endpoint.requestRef ? schemas[refName(endpoint.requestRef)] : endpoint.requestSchema;
                      const requestRequiredSet = new Set(requestSchema?.required || []);
                      const responseSchema = selectedResponse?.ref ? schemas[refName(selectedResponse.ref)] : selectedResponse?.schema;
                      const responseRequiredSet = new Set(responseSchema?.required || []);
                      const schemaRefs = [
                        endpoint.requestRef ? refName(endpoint.requestRef) : null,
                        ...endpoint.responses.map((response) => (response.ref ? refName(response.ref) : null)),
                      ].filter((value): value is string => Boolean(value));

                      return (
                        <details key={endpoint.id} className="group rounded-lg border border-zinc-800 bg-zinc-900/80 transition-colors open:border-zinc-700">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
                            <div className="min-w-0">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${methodStyle(endpoint.method)}`}>
                                  {endpoint.method}
                                </span>
                                <code className="rounded-md bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300">{endpoint.path}</code>
                                <CopyButton value={endpoint.path} label={label} />
                              </div>
                              <p className="truncate text-sm text-zinc-300">{endpoint.summary || label("notAvailable")}</p>
                            </div>
                            <IconChevronDown size={16} className="shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
                          </summary>

                          <div className="space-y-3 border-t border-zinc-800 px-3 py-3">
                            <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                              <h5 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">{label("endpointOverview")}</h5>
                              <div className="grid gap-2 text-xs text-zinc-300 sm:grid-cols-2">
                                <p className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5">
                                  {label("tag")}: <span className="text-zinc-100">{endpoint.tag}</span>
                                </p>
                                <p className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5">
                                  {label("path")}: <span className="text-zinc-100">{endpoint.path}</span>
                                </p>
                              </div>
                              {schemaRefs.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {schemaRefs.map((schemaName) => (
                                    <a
                                      key={`${endpoint.id}-${schemaName}`}
                                      href={`#schema-${schemaName}`}
                                      className="inline-flex rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                                    >
                                      {schemaName}
                                    </a>
                                  ))}
                                </div>
                              ) : null}
                            </section>

                            <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                              <h5 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">{label("requestBody")}</h5>
                              <div className="mb-2 grid gap-2 text-xs text-zinc-300 sm:grid-cols-3">
                                <p className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5">
                                  {label("required")}: <span className="text-zinc-100">{endpoint.requestRequired ? label("yes") : label("no")}</span>
                                </p>
                                <p className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5">
                                  {label("contentType")}: <span className="text-zinc-100">application/json</span>
                                </p>
                                <p className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5">
                                  {label("requestSchema")}:{" "}
                                  <span className="text-zinc-100">{endpoint.requestRef ? refName(endpoint.requestRef) : label("notAvailable")}</span>
                                </p>
                              </div>

                              <SchemaTabs
                                endpointId={`${endpoint.id}-request`}
                                label={label}
                                view={requestViews[endpoint.id] || "example"}
                                onChange={(value) => setRequestView(endpoint.id, value)}
                                schema={endpoint.requestRef ? { $ref: endpoint.requestRef } : endpoint.requestSchema}
                                schemas={schemas}
                                requiredSet={requestRequiredSet}
                              />
                            </section>

                            <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                              <h5 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">{label("responses")}</h5>
                              <div className="mb-2 flex flex-wrap gap-1">
                                {endpoint.responses.map((response) => (
                                  <button
                                    key={`${endpoint.id}-status-${response.status}`}
                                    type="button"
                                    onClick={() => setResponseStatus(endpoint.id, response.status)}
                                    className={cn(
                                      "cursor-pointer rounded-md border px-2 py-1 text-xs transition-colors",
                                      responseStatus === response.status
                                        ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200",
                                    )}
                                  >
                                    {label("status")} {response.status}
                                  </button>
                                ))}
                              </div>

                              {selectedResponse ? (
                                <>
                                  <p className="mb-2 text-xs text-zinc-400">{selectedResponse.description || label("notAvailable")}</p>
                                  <SchemaTabs
                                    endpointId={`${endpoint.id}-response`}
                                    label={label}
                                    view={responseViews[endpoint.id] || "example"}
                                    onChange={(value) => setResponseView(endpoint.id, value)}
                                    schema={selectedResponse.ref ? { $ref: selectedResponse.ref } : selectedResponse.schema}
                                    schemas={schemas}
                                    requiredSet={responseRequiredSet}
                                  />
                                </>
                              ) : (
                                <p className="text-xs text-zinc-500">{label("notAvailable")}</p>
                              )}
                            </section>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-2 text-sm font-medium text-zinc-100">
                <IconBraces size={16} className="text-zinc-400" />
                {label("schemaOverview")}
              </h3>
              <input
                value={schemaSearch}
                onChange={(event) => setSchemaSearch(event.target.value)}
                placeholder={label("searchSchemas")}
                className="h-8 w-56 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 outline-none transition-colors focus-visible:border-zinc-600"
              />
            </div>

            <div className="space-y-2">
              {filteredSchemas.map((schema) => {
                const required = new Set(schema.schema.required || []);
                return (
                  <details id={`schema-${schema.name}`} key={schema.name} className="group rounded-lg border border-zinc-800 bg-zinc-900">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
                      <div>
                        <div className="inline-flex items-center gap-2">
                          <p className="text-sm font-medium text-zinc-200">{schema.name}</p>
                          <CopyButton value={schema.name} label={label} />
                        </div>
                        <p className="text-xs text-zinc-500">
                          {label("schemaProperties")}: {schema.propertyCount}
                        </p>
                      </div>
                      <IconChevronDown size={16} className="shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
                    </summary>

                    <div className="space-y-2 border-t border-zinc-800 px-3 py-3">
                      {Object.entries(schema.schema.properties || {}).length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-zinc-800">
                          <table className="min-w-full text-left text-xs text-zinc-300">
                            <thead className="bg-zinc-900 text-zinc-500">
                              <tr>
                                <th className="px-2 py-1.5">{label("parameter")}</th>
                                <th className="px-2 py-1.5">{label("type")}</th>
                                <th className="px-2 py-1.5">{label("required")}</th>
                                <th className="px-2 py-1.5">{label("example")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(schema.schema.properties || {}).map(([name, property]) => (
                                <tr key={`${schema.name}-${name}`} className="border-t border-zinc-800">
                                  <td className="px-2 py-1.5 font-medium text-zinc-200">{name}</td>
                                  <td className="px-2 py-1.5">{schemaType(property)}</td>
                                  <td className="px-2 py-1.5">{required.has(name) ? label("yes") : label("no")}</td>
                                  <td className="px-2 py-1.5">{schemaExample(property)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500">{label("noParameters")}</p>
                      )}

                      <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
                        {prettyJson(schema.schema)}
                      </pre>
                    </div>
                  </details>
                );
              })}
              {filteredSchemas.length === 0 ? <p className="text-sm text-zinc-500">{label("noSchemasFound")}</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
