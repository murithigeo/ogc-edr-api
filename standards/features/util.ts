import { ExegesisContext } from "exegesis-express";
import { RequestParser } from "../../src/utils/base.ts";
import { ServiceShape } from "../../src/services/types.js";

export class FeaturesRequestParser extends RequestParser{
    constructor(ctx:ExegesisContext){super(ctx)}
    init(collections: ServiceShape[]):typeof this.params {
        
        if (!("collectionId" in this.ctx.params.path)) { this.f(undefined, "json"); return this.params; }

        let collection = collections.find(({ id }) => id === this.ctx.params.path.collectionId);
        if (!collection) throw this.ctx.makeError(404, "No such collection");
        let crs=this.crs(collection.crs).parse()
        let bboxCrs = this["bbox-crs"](collection.crs);
        this.bbox.parse(collection.storageCrs, crs);
        
    }
}