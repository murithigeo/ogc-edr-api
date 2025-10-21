# @murithigeo/ogc-edr-api

## Overview

This is a reference implementation of the OGC EDR API guideline in TypeScript.

## Sample Requests

### Instances (Subsets of Dataset)

https://ogc-edr-api.murithigeo.deno.net/collections/mountains/instances

https://ogc-edr-api.murithigeo.deno.net/collections/mountains/instances/Africa

### Items

https://ogc-edr-api.murithigeo.deno.net/collections/mountains/items?bbox=32,-2,34,2

#### Using an Instance

https://ogc-edr-api.murithigeo.deno.net/collections/mountains/instances/Africa/items?bbox=32,-2,34,2

### Corridor

<https://ogc-edr-api.murithigeo.deno.net/collections/fapar-anomaly/corridor?coords=LINESTRING (36.815186 -1.30726, 39.70459 -4.039618)&corridor-width=100&corridor-height=10&height-units=meters&width-units=meters>

<https://ogc-edr-api.murithigeo.deno.net/collections/fapar-anomaly/instances/2025-09-01/corridor?coords=LINESTRING (36.815186 -1.30726, 39.70459 -4.039618)&corridor-width=100&corridor-height=10&height-units=meters&width-units=meters>

### Radius

<https://ogc-edr-api.murithigeo.deno.net/collections/fapar-anomaly/radius?coords=MULTIPOINT(36.804199 -1.285293, 39.660645 -4.050577)&within=100&within-units=meters>

<https://ogc-edr-api.murithigeo.deno.net/collections/fapar-anomaly/instances/2025-09-01/radius?coords=MULTIPOINT(36.804199 -1.285293, 39.660645 -4.050577)&within=100&within-units=meters>

### Locations

https://ogc-edr-api.murithigeo.deno.net/collections/mountains/locations?bbox=32,-2,34,2

https://ogc-edr-api.murithigeo.deno.net/collections/mountains/locations/Kenya

https://ogc-edr-api.murithigeo.deno.net/collections/mountains/instances/Africa/locations/Uganda

https://ogc-edr-api.murithigeo.deno.net/collections/mountains/instances/Africa/locations/Uganda,Kenya,Ethiopia

### Trajectory

<https://ogc-edr-api.murithigeo.deno.net/collections/mountains/trajectory?coords=LINESTRING (36.815186 -1.30726, 39.70459 -4.039618)>

<https://ogc-edr-api.murithigeo.deno.net/collections/mountains/instances/Africa/trajectory?coords=LINESTRING (36.815186 -1.30726, 39.70459 -4.039618)>

### Area

<https://ogc-edr-api.murithigeo.deno.net/collections/fapar-anomaly/area?coords=POLYGON ((36.293335 -1.126026, 36.436157 -1.45004, 36.903076 -1.466515, 36.87561 -1.158979, 36.77124 -0.917319, 36.293335 -1.126026))>

<https://ogc-edr-api.murithigeo.deno.net/collections/fapar-anomaly/instances/2025-09-01/area?coords=POLYGON ((36.293335 -1.126026, 36.436157 -1.45004, 36.903076 -1.466515, 36.87561 -1.158979, 36.77124 -0.917319, 36.293335 -1.126026))>

### Cube

<https://ogc-edr-api.murithigeo.deno.net/fapar-anomaly/cube?bbox=32,-2,34,2>

<https://ogc-edr-api.murithigeo.deno.net/fapar-anomaly/instances/2025-09-01/cube?bbox=32,-2,34,2>

### Position

<https://ogc-edr-api.murithigeo.deno.net/collections/fapar-anomaly/position?coords=MULTIPOINT(36.804199 -1.285293, 39.660645 -4.050577)>

`https://ogc-edr-api.murithigeo.deno.net/collections/fapar-anomaly/instances/2025-09-01/position?coords=MULTIPOINT(36.804199 -1.285293, 39.660645 -4.050577)`

## Part 2: Publish/Subscribe Workflow

The approach is pretty simple. One only needs a database that allows the server to "watch" changes to messages and listen on them.

When the client first connects, all cached messages are sent. Once the cache is depleted, ids of those messages are cached. The socket is kept open. When an watch event is detected, the message is passed on to the client.

To receive events for all collections, you can:
Upgrade the connection: `new WebSocket("https://ogc-edr-api.murithigeo.deno.net/collections")`
Open a Socket directly: `new WebSocket("wss://ogc-edr-api.murithigeo.deno.net/collections")`

### Stack

`@deno/kv` A Key Value database that exposes a method to listen to messages
`websocket-express` A package that allows a server to serve both WebSockets and HTTP Requests in Node.js

### Examples
 InstanceId:  `yyyy-MM-dd'T'HH:mm`
    wss://ogc-edr-api.murithigeo.deno.net/collections
    wss://ogc-edr-api.murithigeo.deno.net/collections/openmeteo-hourly

    wss://ogc-edr-api.murithigeo.deno.net/collections/openmeteo-hourly/instances
    wss://ogc-edr-api.murithigeo.deno.net/collections/openmeteo-hourly/instances/:instanceId

    wss://ogc-edr-api.murithigeo.deno.net/collections/openmeteo-hourly/items/GHCND:KE000063740
    wss://ogc-edr-api.murithigeo.deno.net/collections/openmeteo-hourly/instances/:instanceId/items/GHCND:KE000063740

## NOTES

The approach is fairly simple.
For vector datasets, some query_types such as radius, corridor, trajectory, etc will use a geometry intersection check.

For raster datasets, a bounding box of the coords/geometry will be generated, regular sample points will be generated within the bounding box. For radius, area, etc, a geometry intersection check is also carried for the generated points to ensure conformance with shape of geometry. The raster is then sampled.

### 6 Item Bounding Boxes

If a 6 item bounding box is declared, then the 3rd & 6th element are considered the elevation limits of the response. This is overridden if the z parameter is declared

### LINESTRING[Z][M]

If a LINESTRING Z or LINESTRING ZM is requested and no z parameter is declared, the included elevation values are used to constrain the response. Only values whose z value appears in the wkt string will be returned.

This also applies to LINESTRING M or LINESTRING ZM coords.

(c) Edwin Gichuru
