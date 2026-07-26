import type { PromiseController } from "exegesis";

const getConformance: PromiseController = (ctx) =>
  ctx.res.status(200).json({
    conformsTo: [
      "http://www.opengis.net/spec/ogcapi-edr-1/1.1/conf/collections",
      "http://www.opengis.net/spec/ogcapi-edr-1/1.1/conf/core",
      "http://www.opengis.net/spec/ogcapi-edr-1/1.0/conf/core",
      "http://www.opengis.net/spec/ogcapi-edr-1/1.1/conf/oas30",
      "http://www.opengis.net/spec/ogcapi-edr-1/1.1/conf/geojson",
      "http://www.opengis.net/spec/ogcapi-edr-1/1.1/conf/json",
      "http://www.opengis.net/spec/ogcapi-edr-1/1.1/conf/edr-geojson",
      "http://www.opengis.net/spec/ogcapi-edr-1/1.1/conf/covjson",
      "http://www.opengis.net/spec/ogcapi-edr-1/1.1/conf/queries",
      "http://www.opengis.net/spec/ogcapi-edr-1/1.0/conf/edr-geojson",
      "http://www.opengis.net/spec/ogcapi-edr-1/1.0/conf/geojson",
    ],
    links: [{ href: "/conformance?f=html" }],
  });

export default { getConformance };
