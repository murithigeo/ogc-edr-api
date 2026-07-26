import contentTypes from "./content-types.ts";
export class Links {
  server: string;
  path: string;
  format: keyof typeof contentTypes;
  output_formats: Array<keyof typeof contentTypes>;
}
