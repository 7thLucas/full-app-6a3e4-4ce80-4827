import { prop, getModelForClass, modelOptions, Severity } from "@typegoose/typegoose";
import mongoose from "mongoose";

@modelOptions({
  schemaOptions: {
    collection: "tbl_expenses",
    timestamps: true,
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class Expense {
  @prop({ required: true })
  amount!: number;

  @prop({ required: true })
  category!: string;

  @prop({ required: true })
  date!: Date;

  @prop({ required: false, default: "" })
  notes?: string;

  @prop({ required: true, ref: "Property" })
  propertyId!: mongoose.Types.ObjectId;

  @prop({ required: false, ref: "Unit" })
  unitId?: mongoose.Types.ObjectId;

  @prop({ required: false, default: "" })
  unitNumber?: string;

  @prop({ required: true, ref: "User" })
  ownerId!: mongoose.Types.ObjectId;

  @prop({ required: false, default: "" })
  vendor?: string;

  public createdAt?: Date;
  public updatedAt?: Date;
}

export const ExpenseModel = getModelForClass(Expense);
