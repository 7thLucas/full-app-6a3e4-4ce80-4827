import { Router } from "express";
import { requireAuth } from "~/modules/authentication/authentication.middleware";
import { UnitModel } from "~/models/unit.model";
import { PropertyModel } from "~/models/property.model";
import mongoose from "mongoose";

const router = Router();

// GET /api/units?propertyId=&q= — list/search units for a property
router.get("/api/units", requireAuth, async (req, res) => {
  try {
    const { propertyId, q } = req.query as { propertyId?: string; q?: string };

    const filter: Record<string, unknown> = {
      ownerId: req.user!.id,
      is_active: true,
    };

    if (propertyId) {
      filter.propertyId = new mongoose.Types.ObjectId(propertyId);
    }

    if (q?.trim()) {
      filter.unitNumber = { $regex: q.trim(), $options: "i" };
    }

    const units = await UnitModel.find(filter).sort({ propertyId: 1, unitNumber: 1 }).limit(100);

    // Enrich with property names
    const propIds = [...new Set(units.map((u) => u.propertyId.toString()))];
    const properties = await PropertyModel.find({ _id: { $in: propIds } });
    const propMap = Object.fromEntries(properties.map((p) => [p._id.toString(), p.name]));

    const result = units.map((u) => ({
      _id: u._id.toString(),
      unitNumber: u.unitNumber,
      propertyId: u.propertyId.toString(),
      propertyName: propMap[u.propertyId.toString()] ?? "",
      tenantName: u.tenantName,
      monthlyRent: u.monthlyRent,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch units" });
  }
});

// POST /api/units — create a new unit
router.post("/api/units", requireAuth, async (req, res) => {
  try {
    const { unitNumber, propertyId, tenantName, monthlyRent } = req.body;

    if (!unitNumber?.trim()) {
      res.status(400).json({ success: false, message: "Unit number is required" });
      return;
    }
    if (!propertyId) {
      res.status(400).json({ success: false, message: "Property is required" });
      return;
    }

    // Verify property belongs to user
    const property = await PropertyModel.findOne({ _id: propertyId, ownerId: req.user!.id, is_active: true });
    if (!property) {
      res.status(404).json({ success: false, message: "Property not found" });
      return;
    }

    // Check for duplicate unit number in same property
    const existing = await UnitModel.findOne({ propertyId, unitNumber: unitNumber.trim(), is_active: true });
    if (existing) {
      res.status(409).json({ success: false, message: "Unit number already exists in this property" });
      return;
    }

    const unit = await UnitModel.create({
      unitNumber: unitNumber.trim(),
      propertyId: new mongoose.Types.ObjectId(propertyId),
      ownerId: new mongoose.Types.ObjectId(req.user!.id),
      tenantName: tenantName?.trim() ?? "",
      monthlyRent: monthlyRent ? parseFloat(monthlyRent) : 0,
      is_active: true,
    });

    res.status(201).json({ success: true, data: unit });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ success: false, message: "Unit number already exists in this property" });
      return;
    }
    res.status(500).json({ success: false, message: "Failed to create unit" });
  }
});

// PUT /api/units/:id — update a unit
router.put("/api/units/:id", requireAuth, async (req, res) => {
  try {
    const { unitNumber, tenantName, monthlyRent } = req.body;
    const unit = await UnitModel.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user!.id },
      { unitNumber, tenantName, monthlyRent },
      { new: true }
    );
    if (!unit) {
      res.status(404).json({ success: false, message: "Unit not found" });
      return;
    }
    res.json({ success: true, data: unit });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update unit" });
  }
});

// DELETE /api/units/:id — soft-delete a unit
router.delete("/api/units/:id", requireAuth, async (req, res) => {
  try {
    const unit = await UnitModel.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user!.id },
      { is_active: false },
      { new: true }
    );
    if (!unit) {
      res.status(404).json({ success: false, message: "Unit not found" });
      return;
    }
    res.json({ success: true, message: "Unit deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete unit" });
  }
});

export default router;
