import { prop, getModelForClass, modelOptions, Severity } from "@typegoose/typegoose";
import mongoose from "mongoose";

@modelOptions({
  schemaOptions: {
    collection: "tbl_properties",
    timestamps: true,
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class Property {
  @prop({ required: true })
  name!: string;

  @prop({ required: false, default: "" })
  address?: string;

  @prop({ required: false, default: "" })
  description?: string;

  @prop({ required: true, ref: "User" })
  ownerId!: mongoose.Types.ObjectId;

  @prop({ required: false, default: true })
  is_active?: boolean;

  public createdAt?: Date;
  public updatedAt?: Date;
}

export const PropertyModel = getModelForClass(Property);
