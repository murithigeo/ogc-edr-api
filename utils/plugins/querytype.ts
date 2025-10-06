import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis-express";
import type { DataQueryConfig, Dataset } from "../../config/index.ts";

/**
 * @description validates query type requests.
 * For instance, querying a collection at /collection/id level maybe cumbersome.
 * Thus only validate requests at instanceId level
 */
export default function querytype(): ExegesisPlugin {
  return {
    info: {
      name: "exegesis-plugin-query-type",
    },
    makeExegesisPlugin: () => ({
      postSecurity: (ctx: ExegesisPluginContext) => {
        const operation: string =
          ctx.api.operationObject!["x-exegesis-operationId"] ||
          ctx.api.operationObject?.operationId;
        if (!operation || !operation.includes("@")) return;
        //@ts-expect-error type mismatch
        const [, query_type, at]: [
          string,
          keyof DataQueryConfig,
          "collection" | "instance",
        ] = operation.split("@");
        const dataset: Dataset = ctx["ectx"]["dataset"];
        const dataquery =
          dataset.data_queries[query_type as keyof DataQueryConfig]!;
        if (at === "instance" && !dataset.data_queries.instances) {
          throw ctx.makeError(
            404,
            `This dataset does not support instance based querying`,
          );
        }
        if (!dataquery) {
          throw ctx.makeError(
            404,
            `This dataset does not support ${query_type} queries`,
          );
        }

        if (!dataquery.allowAt.includes(at)) {
          let str = `/collections/{collectionId}`;
          if (at !== "instance") str += `/instances/{instanceId}`;
          str += `/${query_type}...`;
          throw ctx.makeError(
            404,
            `This dataset only supports queries on ${str} paths `,
          );
        }
      },
    }),
  };
}
