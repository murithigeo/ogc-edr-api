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

<https://ogc-edr-api.murithigeo.deno.net/collections/fapar-anomaly/instances/2025-09-01/position?coords=MULTIPOINT(36.804199 -1.285293, 39.660645 -4.050577)>

### Part 2: Publish/Subscribe Workflow

WIP

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
