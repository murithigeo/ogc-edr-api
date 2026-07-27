export const contentTypes = {
  JSON: "application/json",
  GEOJSON: "application/geo+json",
  HTML: "text/html",
  YAML: "text/yaml",
  OPENAPI_JSON: "application/vnd.oai.openapi+json;version=3.0",
  OPENAPI_YAML: "application/vnd.oai.openapi;version=3.0",
  COVERAGEJSON: "application/prs+coverage.json",
};

export type ContentTypeNegotiator = keyof typeof contentTypes;
