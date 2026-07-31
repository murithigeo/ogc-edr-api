/**
 * @description Add support for OGC API Features Part III
 * Filtering and the Common Query Language (CQL)
 */

// new query parameters filter, filter-lang, filter-crs
// Filter expressions should always evaluate to true, null or false
// If the result is false or null, dont return the feature

// Logical operators: and, or, not
// Comparison operators:
// equal to
// less than, less than or equal to
// greater than, greater than or equal to
// like
// is null
// between
// in

// Spatial operators: intersects
// Temporal operators: anyinteracts

// Enhanced Spatial Operators: equals, disjoints, touches, within, overlaps, crosses, contains
// Enhanced Temporal operators: after, before, begins, begunby, tcontains, during, endedby, ends, tequals, meets, metby, toverlaps, overlappedby, intersects
// Array Set Operators: aequals, acontains, containedby, aoverlaps

// symbols ∩: intersection, operation on two or more sets
// ∧ and, logical intersection
// ≠ not equal
// ⬄ if and only if, logical equivalence between statements
// ⊆ is a subset of
// dim(x) returns the maximum dimension (-1, 0, 1, or 2) of the geometric object x
// I(x) represents the interior of the geometric object x
// B(x) represents the boundary of the geometric object x
// E(x) represents the exterior of the geometric object x


// Requirement 1: /req/filter/get-queryables-op-global
// Shall support HTTP GET on path /queryables and the queryables accessed here are valid for all collections
// Response content-type is application/schema+json
// Link to /queryables must have link rel "http://www.opengis.net/def/rel/ogc/1.0/queryables"

// Requirement 2: /req/filter/get-queryables-op-local
// Shall support  HTTP GET on path /collections/{collectionId}/queryables
// Response content-type is application/schema+json
// Link to /queryables path must have link rel "http://www.opengis.net/def/rel/ogc/1.0/queryables"

// Requirement 3: /req/filter/get-queryables-response
// For all responses using application/schema+json, the member '$schema' is http://json-schema.org/draft-07/schema# or https://json-schema.org/draft/2019-09/schema
// The property $id is the uri of the resource without query parameters
// the type is object and each property is a queryable

// Recommendation 1: /rec/filter/queryables-schema
// Each property SHOULD have a human readable title 'title' and if necessary a 'description'
// Each prop SHOULD have a single 'type'
// For string props, 'minLength', 'maxLength', 'enum' and/or 'pattern' should be provided where applicable
// For numeric properties multipleOf, minimum, exclusiveMinimum, maximum, exclusiveMaximum SHOULD be provided, where applicable.
// For integer properties that represent enumerated values, enum SHOULD be provided.
// For temporal properties, the property SHOULD be a string literal with the appropriate format date-time, date, time, or duration.
// For spatial properties, the property SHOULD reference a well-known JSON schema of the geometry object.
// For geometry types according to the Simple Features standard, the JSON Schema of the GeoJSON geometry object SHOULD be referenced; for example, https://geojson.org/schema/Point.json for a point geometry.
// For array properties, the property SHOULD consist of items that are strings or numbers.


// Requirement 4: /req/filter/filter-param
// The HTTP GET operation on the path that fetches resource instances (e.g. /collections/{collectionId}/items) SHALL support a parameter filter with the following characteristics (using an OpenAPI Specification 3.0 fragment):
// name: filter
// in: query
// required: false
// schema:
//   type: string
// style: form
// explode: false

// Requirement 5: /req/filter/filter-param-multiple-collections
// A server that implements this extension and also supports queries across multiple collections SHALL only allow properties from the global list of queryables to be referenced in a filter expression.
// If a cross-collection filter expression references properties that are not listed in the global list of queryables, then the server SHALL respond with an HTTP status code of 400.
/**
 * @example http://www.someserver.com/ogcapi/search?
  collections=collection1,collection3&
  filter-lang=cql-text&
  filter=prop1=10 AND prop2>45
 */

// Requirement 6:  The HTTP GET operation on the path that fetches resource instances (e.g. /collections/{collectionId}/items) SHALL support a parameter filter-lang with the following characteristics (using an OpenAPI Specification 3.0 fragment):
/**
 * name: filter-lang
in: query
required: false
schema:
  type: string
  enum:
     - 'cql-text'
     - 'cql-json'
  default: 'cql-text'
style: form
 */
// The enum array in the schema of filter-lang SHALL list the filter encodings that the server supports for the resource.
// The default value in the schema of filter-lang SHALL identify the filter encoding that the server will assume, if a filter is provided, but no filter-lang.


// Requirement 7: /req/filter/filter-crs-wgs84
// If a HTTP GET operation on the path that fetches resource instances (e.g. /collections/{collectionId}/items) includes a filter parameter, but no filter-crs parameter, the server SHALL process all geometries in the filter expression using CRS84 (for coordinates without height) or CRS84h (for coordinates with height) as the coordinate reference system (CRS).

// Requirement 8: /req/filter/filter-crs-param
// Condition: Server implements OGC API - Features - Part 2: Coordinate Reference Systems by Reference
// The HTTP GET operation on the path that fetches resource instances (e.g. /collections/{collectionId}/items) SHALL support a parameter filter-crs with the following characteristics (using an OpenAPI Specification 3.0 fragment):
/**
 * name: filter-crs
in: query
required: false
schema:
  type: string
  format: uri-reference
style: form
explode: false
 */
// If a HTTP GET operation on the path that fetches resource instances (e.g. /collections/{collectionId}/items) includes the filter and the filter-crs parameter, the server SHALL process all geometries in the filter expression using the CRS identified by the URI in filter-crs.
// The server SHALL return an error, if it does not support the CRS identified in filter-crs for the resource. (For instance if proj4 cant parse the url"

// Requirement 9: /req/filter/mixing-expression
// Other filter predicates supported by the server (e.g. bbox, datetime, etc.) SHALL be logically connected with the AND operator when mixed in a request with the filter parameter.

// Requirement 10: req/filter/response
// The filter expression SHALL be evaluated for each item of the collection being queried.	
// If the filter expression evaluates to TRUE then the item SHALL be included in the result set.
// If the filter expression evaluates to FALSE then the item SHALL be excluded from the result set.
