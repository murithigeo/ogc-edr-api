import type { ExegesisContext } from "exegesis-express";
import { parseformat, Links } from "../utils/index.ts";
import type { LandingPage } from "../types.d.ts";

function getLandingPage(ctx: ExegesisContext): void {
  const { output_formats, format } = parseformat(ctx, "JSON", ["JSON", "HTML"]);

  const { links } = new Links(ctx)
    .self()
    .alternates(output_formats)
    .conformance()
    .collections()
    .serviceDesc()
    .serviceDoc();
  const rootDoc: LandingPage = {
    title: "OGC-API EDR",
    description:
      "Reference API implementation for OGC-API Environmental Data Retrieval (EDR)",
    contact: {
      phone: "07-xxx-xxx-xx",
      email: "murithiedwing@gmail.com",
      city: "Nairobi",
      country: "Kenya",
      hours: "0800-1600H",
      stateorprovince: "Nairobi County",
      instructions: "None",
    },
    provider: {
      name: "None",
      url: "https://murithigeo.vercel.app",
    },
    links,
  };
  ctx.res.status(200); //.set(...contenttypeHeader);
  switch (format) {
    // case "JSON":
    case "HTML":
    default:
      ctx.res.setBody(rootDoc);
  }
}

export default { getLandingPage };
