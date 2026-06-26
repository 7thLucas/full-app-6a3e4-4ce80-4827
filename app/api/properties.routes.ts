import { Router } from "express";
import { requireAuth } from "~/modules/authentication/authentication.middleware";
import { PropertyModel } from "~/models/property.model";
import { UnitModel } from "~/models/unit.model";
import mongoose from "mongoose";

const router = Router();

// GET /api/properties — list all properties for the authenticated user
router.get("/api/properties", requireAuth, async (req, res) => {
  try {
    const properties = await PropertyModel.find({ ownerId: req.user!.id, is_active: true }).sort({ name: 1 });

    // Get unit counts for each property
    const propIds = properties.map((p) => p._id);
    const unitCounts = await UnitModel.aggregate([
      { $match: { propertyId: { $in: propIds }, is_active: true } },
      { $group: { _id: "$propertyId", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(unitCounts.map((c) => [c._id.toString(), c.count]));

    const result = properties.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      address: p.address,
      description: p.description,
      unitCount: countMap[p._id.toString()] ?? 0,
      createdAt: p.createdAt,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch properties" });
  }
});

// POST /api/properties — create a new property
router.post("/api/properties", requireAuth, async (req, res) => {
  try {
    const { name, address, description } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ success: false, message: "Property name is required" });
      return;
    }
    const property = await PropertyModel.create({
      name: name.trim(),
      address: address?.trim() ?? "",
      description: description?.trim() ?? "",
      ownerId: new mongoose.Types.ObjectId(req.user!.id),
      is_active: true,
    });
    res.status(201).json({ success: true, data: property });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create property" });
  }
});

// PUT /api/properties/:id — update a property
router.put("/api/properties/:id", requireAuth, async (req, res) => {
  try {
    const { name, address, description } = req.body;
    const property = await PropertyModel.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user!.id },
      { name, address, description },
      { new: true }
    );
    if (!property) {
      res.status(404).json({ success: false, message: "Property not found" });
      return;
    }
    res.json({ success: true, data: property });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update property" });
  }
});

// DELETE /api/properties/:id — soft-delete a property
router.delete("/api/properties/:id", requireAuth, async (req, res) => {
  try {
    const property = await PropertyModel.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user!.id },
      { is_active: false },
      { new: true }
    );
    if (!property) {
      res.status(404).json({ success: false, message: "Property not found" });
      return;
    }
    res.json({ success: true, message: "Property deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete property" });
  }
});

export default router;
