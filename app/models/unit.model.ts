import { prop, getModelForClass, modelOptions, Severity } from "@typegoose/typegoose";
import mongoose from "mongoose";

@modelOptions({
  schemaOptions: {
    collection: "tbl_units",
    timestamps: true,
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class Unit {
  @prop({ required: true })
  unitNumber!: string;

  @prop({ required: true, ref: "Property" })
  propertyId!: mongoose.Types.ObjectId;

  @prop({ required: true, ref: "User" })
  ownerId!: mongoose.Types.ObjectId;

  @prop({ required: false, default: "" })
  tenantName?: string;

  @prop({ required: false, default: 0 })
  monthlyRent?: number;

  @prop({ required: false, default: true })
  is_active?: boolean;

  public createdAt?: Date;
  public updatedAt?: Date;
}

export const UnitModel = getModelForClass(Unit);
