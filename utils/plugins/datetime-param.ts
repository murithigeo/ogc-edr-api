import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis-express";



/**
 * @description parses values from the z query parameter
 */
export default function datetime(): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-datetime-param" },
    makeExegesisPlugin: () => ({

      postSecurity: async (ctx: ExegesisPluginContext) => {
        const params = await ctx.getParams();
        let datetime: string | undefined = params.query?.datetime;
        if (!datetime) return;
        datetime = datetime.replace(" ", "+");
        let max: string | undefined;
        let min: string | undefined;
        let values: string[] | undefined;
        if (!datetime.includes("/")) values = datetime.split(",");
        else {
          if (datetime.startsWith("../")) {
            [, max] = datetime.split("../");
          } else if (datetime.endsWith("/..")) {
            [min] = datetime.split("/..");
          } else [min, max] = datetime.split("/");
        }
        try {
          ctx["ectx"]["datetime"] = {
            max: (max && new Date(max).toISOString()) || undefined,
            min: (min && new Date(min).toISOString()) || undefined,
            values: values
              ? values.map((str) => new Date(str).toISOString())
              : undefined,
          };
        } catch (error) {
          console.log(error);
          throw ctx.makeValidationError(`Invalid date[/]time value`, {
            in: "query",
            name: "datetime",
            docPath: ctx.api.pathItemPtr,
          });
        }
      },
    }),
  };
}
