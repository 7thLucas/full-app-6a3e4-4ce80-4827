import { PropertyModel } from "./property.model";
import { UnitModel } from "./unit.model";
import { ExpenseModel } from "./expense.model";
import { UserModel } from "~/modules/authentication/authentication.model";
import { createLogger } from "~/lib/logger";
import mongoose from "mongoose";

const logger = createLogger("SampleDataSeed");

const SAMPLE_PROPERTY_MARKER = "__sample_data_seeded__";

export async function seedSampleData(): Promise<void> {
  try {
    // Only seed if no properties exist for any user
    const existingCount = await PropertyModel.countDocuments({});
    if (existingCount > 0) {
      logger.info("Sample data already exists, skipping seed");
      return;
    }

    // Find the admin user to assign sample data to
    const adminUser = await UserModel.findOne({ role: "admin" });
    if (!adminUser) {
      logger.warn("No admin user found, skipping sample data seed");
      return;
    }

    const ownerId = adminUser._id as mongoose.Types.ObjectId;

    // Create sample properties
    const [prop1, prop2] = await PropertyModel.insertMany([
      {
        name: "Oakwood Apartments",
        address: "123 Oakwood Drive, Portland, OR 97201",
        description: "56-unit apartment complex",
        ownerId,
        is_active: true,
      },
      {
        name: "Riverside Commons",
        address: "450 River Blvd, Portland, OR 97204",
        description: "30-unit riverside complex",
        ownerId,
        is_active: true,
      },
    ]);

    // Create units for Oakwood Apartments
    const oakwoodUnits = [];
    for (let floor = 1; floor <= 4; floor++) {
      for (let unit = 1; unit <= 14; unit++) {
        oakwoodUnits.push({
          unitNumber: `${floor}${unit.toString().padStart(2, "0")}`,
          propertyId: prop1._id,
          ownerId,
          monthlyRent: 1200 + Math.floor(Math.random() * 400),
          is_active: true,
        });
      }
    }
    const insertedOakwoodUnits = await UnitModel.insertMany(oakwoodUnits);

    // Create units for Riverside Commons
    const riversideUnits = [];
    for (let floor = 1; floor <= 3; floor++) {
      for (let unit = 1; unit <= 10; unit++) {
        riversideUnits.push({
          unitNumber: `R${floor}${unit.toString().padStart(2, "0")}`,
          propertyId: prop2._id,
          ownerId,
          monthlyRent: 1400 + Math.floor(Math.random() * 500),
          is_active: true,
        });
      }
    }
    const insertedRiversideUnits = await UnitModel.insertMany(riversideUnits);

    const allUnits = [...insertedOakwoodUnits, ...insertedRiversideUnits];
    const allProperties = [prop1, prop2];

    const categories = [
      "Maintenance & Repairs",
      "Utilities",
      "Insurance",
      "Property Tax",
      "Management Fees",
      "Landscaping",
      "Cleaning",
      "Supplies",
      "Legal & Professional",
      "Capital Improvements",
    ];

    const vendors = [
      "ABC Plumbing",
      "City Power & Light",
      "State Farm Insurance",
      "Portland Tax Office",
      "Green Lawn Services",
      "CleanTeam Pro",
      "Hardware Plus",
      "Smith & Associates Law",
      "Acme Construction",
    ];

    // Generate 6 months of sample expenses
    const sampleExpenses = [];
    const now = new Date();

    for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
      const month = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);

      for (const property of allProperties) {
        const propertyUnits = allUnits.filter(
          (u) => u.propertyId.toString() === (property._id as mongoose.Types.ObjectId).toString()
        );

        // 8-15 expenses per property per month
        const expenseCount = 8 + Math.floor(Math.random() * 8);
        for (let i = 0; i < expenseCount; i++) {
          const unit = propertyUnits[Math.floor(Math.random() * propertyUnits.length)];
          const cat = categories[Math.floor(Math.random() * categories.length)];
          const vendor = vendors[Math.floor(Math.random() * vendors.length)];
          const dayOfMonth = 1 + Math.floor(Math.random() * 27);
          const date = new Date(month.getFullYear(), month.getMonth(), dayOfMonth);
          const amount = 50 + Math.floor(Math.random() * 2000);

          sampleExpenses.push({
            amount,
            category: cat,
            date,
            notes: `${cat} - ${vendor}`,
            propertyId: property._id,
            unitId: unit._id,
            unitNumber: unit.unitNumber,
            ownerId,
            vendor,
          });
        }
      }
    }

    await ExpenseModel.insertMany(sampleExpenses);

    logger.info(`Sample data seeded: 2 properties, ${allUnits.length} units, ${sampleExpenses.length} expenses`);
  } catch (err) {
    logger.error("Error seeding sample data:", err);
  }
}
