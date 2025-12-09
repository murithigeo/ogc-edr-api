import type { Datetime } from "../types.d.ts";

export default function simpleDatetimeFilter(datetime?: Datetime) {
  return (date: string) => {
    if (!datetime) return true;
    const time = new Date(date).getTime();
    if (datetime.values)
      return datetime.values.map((v) => new Date(v).getTime()).includes(time);

    let mincheck = true;
    let maxcheck = true;
    if (datetime.min) mincheck = new Date(datetime.min).getTime() <= time;
    if (datetime.max) maxcheck = new Date(datetime.max).getTime() >= time;
    return mincheck && maxcheck;
  };
}
// /**
//  * {
//  * type:"Feature",
//  * geometry:{...},
//  * properties:{
//  * [datetimekey]:string|number such as 2025-01-01 or unix stamp
//  * }
//  * }
//  */
// export default function datetimeFilter<
//   G extends GeoJSON.Geometry,
//   P extends GeoJsonProperties
// >(datetime?: Datetime, field?: keyof P) {
//   return <F extends Feature<G, P>>(feature: F) => {
//     if (!datetime || !field) return true;
//     const value = new Date(feature.properties[field]).getTime();

//     if (datetime.values)
//       return datetime.values.map((p) => new Date(p).getTime()).includes(value);

//     let [mincheck, maxcheck] = [true, true];
//     if (datetime.min) mincheck = new Date(datetime.min).getTime() <= value;
//     if (datetime.max) maxcheck = new Date(datetime.max).getTime() >= value;
//     return mincheck && maxcheck;
//   };
// }
