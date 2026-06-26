import { Router } from "express";
import { requireAuth } from "~/modules/authentication/authentication.middleware";
import { ExpenseModel } from "~/models/expense.model";
import { PropertyModel } from "~/models/property.model";
import mongoose from "mongoose";

const router = Router();

// GET /api/expenses/pnl — MUST be before /:id
router.get("/api/expenses/pnl", requireAuth, async (req, res) => {
  try {
    const { year } = req.query as { year?: string };
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

    const aggregation = await ExpenseModel.aggregate([
      {
        $match: {
          ownerId: new mongoose.Types.ObjectId(req.user!.id),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            propertyId: "$propertyId",
            month: { $month: "$date" },
          },
          totalExpenses: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.propertyId": 1, "_id.month": 1 },
      },
    ]);

    // Get property names
    const propIds = [...new Set(aggregation.map((a) => a._id.propertyId.toString()))];
    const properties = await PropertyModel.find({ _id: { $in: propIds } });
    const propMap = Object.fromEntries(properties.map((p) => [p._id.toString(), p.name]));

    // Also get all active properties (even those with no expenses)
    const allProperties = await PropertyModel.find({ ownerId: req.user!.id, is_active: true });

    const pnlByProperty: Record<
      string,
      { propertyId: string; propertyName: string; months: Record<number, { expenses: number; count: number }> }
    > = {};

    for (const prop of allProperties) {
      const pid = prop._id.toString();
      pnlByProperty[pid] = {
        propertyId: pid,
        propertyName: prop.name,
        months: {},
      };
    }

    for (const row of aggregation) {
      const pid = row._id.propertyId.toString();
      if (!pnlByProperty[pid]) {
        pnlByProperty[pid] = {
          propertyId: pid,
          propertyName: propMap[pid] ?? "Unknown",
          months: {},
        };
      }
      pnlByProperty[pid].months[row._id.month] = {
        expenses: row.totalExpenses,
        count: row.count,
      };
    }

    res.json({ success: true, data: Object.values(pnlByProperty), year: targetYear });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch P&L data" });
  }
});

// GET /api/expenses/summary — MUST be before /:id
router.get("/api/expenses/summary", requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [thisMonth, totalThisYear, recentExpenses, categoryBreakdown] = await Promise.all([
      ExpenseModel.aggregate([
        {
          $match: {
            ownerId: new mongoose.Types.ObjectId(req.user!.id),
            date: { $gte: thisMonthStart, $lte: thisMonthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      ExpenseModel.aggregate([
        {
          $match: {
            ownerId: new mongoose.Types.ObjectId(req.user!.id),
            date: { $gte: new Date(now.getFullYear(), 0, 1) },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      ExpenseModel.find({ ownerId: req.user!.id })
        .sort({ date: -1, createdAt: -1 })
        .limit(5)
        .lean(),
      ExpenseModel.aggregate([
        {
          $match: {
            ownerId: new mongoose.Types.ObjectId(req.user!.id),
            date: { $gte: thisMonthStart, $lte: thisMonthEnd },
          },
        },
        { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const propIds = [...new Set(recentExpenses.map((e) => e.propertyId.toString()))];
    const propertiesForRecent = await PropertyModel.find({ _id: { $in: propIds } });
    const propMap = Object.fromEntries(propertiesForRecent.map((p) => [p._id.toString(), p.name]));

    res.json({
      success: true,
      data: {
        thisMonth: {
          total: thisMonth[0]?.total ?? 0,
          count: thisMonth[0]?.count ?? 0,
        },
        yearToDate: totalThisYear[0]?.total ?? 0,
        recentExpenses: recentExpenses.map((e) => ({
          ...e,
          _id: e._id.toString(),
          propertyName: propMap[e.propertyId?.toString()] ?? "",
        })),
        categoryBreakdown,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch summary" });
  }
});

// GET /api/expenses — list expenses with filters
router.get("/api/expenses", requireAuth, async (req, res) => {
  try {
    const { propertyId, unitId, month, year, category, page = "1", limit = "25" } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { ownerId: req.user!.id };

    if (propertyId) filter.propertyId = new mongoose.Types.ObjectId(propertyId);
    if (unitId) filter.unitId = new mongoose.Types.ObjectId(unitId);
    if (category) filter.category = category;

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (year && !month) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [expenses, total] = await Promise.all([
      ExpenseModel.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limitNum),
      ExpenseModel.countDocuments(filter),
    ]);

    const propIds = [...new Set(expenses.map((e) => e.propertyId.toString()))];
    const properties = await PropertyModel.find({ _id: { $in: propIds } });
    const propMap = Object.fromEntries(properties.map((p) => [p._id.toString(), p.name]));

    const result = expenses.map((e) => ({
      _id: e._id.toString(),
      amount: e.amount,
      category: e.category,
      date: e.date,
      notes: e.notes,
      vendor: e.vendor,
      propertyId: e.propertyId.toString(),
      propertyName: propMap[e.propertyId.toString()] ?? "",
      unitId: e.unitId?.toString(),
      unitNumber: e.unitNumber,
      createdAt: e.createdAt,
    }));

    res.json({
      success: true,
      data: result,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch expenses" });
  }
});

// POST /api/expenses
router.post("/api/expenses", requireAuth, async (req, res) => {
  try {
    const { amount, category, date, notes, vendor, propertyId, unitId, unitNumber } = req.body;

    if (!amount || isNaN(parseFloat(amount))) {
      res.status(400).json({ success: false, message: "Valid amount is required" });
      return;
    }
    if (!category?.trim()) {
      res.status(400).json({ success: false, message: "Category is required" });
      return;
    }
    if (!date) {
      res.status(400).json({ success: false, message: "Date is required" });
      return;
    }
    if (!propertyId) {
      res.status(400).json({ success: false, message: "Property is required" });
      return;
    }

    const property = await PropertyModel.findOne({ _id: propertyId, ownerId: req.user!.id, is_active: true });
    if (!property) {
      res.status(404).json({ success: false, message: "Property not found" });
      return;
    }

    const expense = await ExpenseModel.create({
      amount: parseFloat(amount),
      category: category.trim(),
      date: new Date(date),
      notes: notes?.trim() ?? "",
      vendor: vendor?.trim() ?? "",
      propertyId: new mongoose.Types.ObjectId(propertyId),
      unitId: unitId ? new mongoose.Types.ObjectId(unitId) : undefined,
      unitNumber: unitNumber?.trim() ?? "",
      ownerId: new mongoose.Types.ObjectId(req.user!.id),
    });

    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create expense" });
  }
});

// PUT /api/expenses/:id
router.put("/api/expenses/:id", requireAuth, async (req, res) => {
  try {
    const { amount, category, date, notes, vendor, propertyId, unitId, unitNumber } = req.body;

    const updateData: Record<string, unknown> = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = new Date(date);
    if (notes !== undefined) updateData.notes = notes;
    if (vendor !== undefined) updateData.vendor = vendor;
    if (propertyId !== undefined) updateData.propertyId = new mongoose.Types.ObjectId(propertyId);
    if (unitId !== undefined) updateData.unitId = unitId ? new mongoose.Types.ObjectId(unitId) : undefined;
    if (unitNumber !== undefined) updateData.unitNumber = unitNumber;

    const expense = await ExpenseModel.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user!.id },
      updateData,
      { new: true }
    );

    if (!expense) {
      res.status(404).json({ success: false, message: "Expense not found" });
      return;
    }

    res.json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update expense" });
  }
});

// DELETE /api/expenses/:id
router.delete("/api/expenses/:id", requireAuth, async (req, res) => {
  try {
    const expense = await ExpenseModel.findOneAndDelete({ _id: req.params.id, ownerId: req.user!.id });
    if (!expense) {
      res.status(404).json({ success: false, message: "Expense not found" });
      return;
    }
    res.json({ success: true, message: "Expense deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete expense" });
  }
});

export default router;
