import { useEffect, useState, useRef } from "react";
import { redirect, useParams } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getUserFromRequest } from "~/modules/authentication/authentication.server";
import { useAuth } from "~/modules/authentication/use-authentication";
import { AppShell, PageHeader } from "~/components/layout/app-shell";
import { useConfigurables } from "~/modules/configurables";
import { api, type Unit, type Property } from "~/lib/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "~/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  ChevronLeft,
  Home,
  DollarSign,
  Loader2,
} from "lucide-react";
import { Link } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getUserFromRequest(request)) {
    return redirect("/auth/login");
  }
  return null;
}

interface UnitFormState {
  unitNumber: string;
  tenantName: string;
  monthlyRent: string;
}

export default function PropertyDetailPage() {
  const { id: propertyId } = useParams<{ id: string }>();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { config } = useConfigurables();
  const currencySymbol = config?.currencySymbol ?? "$";

  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [form, setForm] = useState<UnitFormState>({ unitNumber: "", tenantName: "", monthlyRent: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const formatCurrency = (amount: number) =>
    `${currencySymbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const loadData = async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const [props, unitData] = await Promise.all([
        api.properties.list(),
        api.units.list({ propertyId }),
      ]);
      const found = props.find((p) => p._id === propertyId) ?? null;
      setProperty(found);
      setUnits(unitData);
      setFilteredUnits(unitData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    loadData();
  }, [isAuthenticated, authLoading, propertyId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUnits(units);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredUnits(
      units.filter(
        (u) =>
          u.unitNumber.toLowerCase().includes(q) ||
          (u.tenantName ?? "").toLowerCase().includes(q)
      )
    );
  }, [searchQuery, units]);

  const openAdd = () => {
    setEditingUnit(null);
    setForm({ unitNumber: "", tenantName: "", monthlyRent: "" });
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setForm({
      unitNumber: unit.unitNumber,
      tenantName: unit.tenantName ?? "",
      monthlyRent: unit.monthlyRent ? String(unit.monthlyRent) : "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.unitNumber.trim()) {
      setFormError("Unit number is required");
      return;
    }
    if (!propertyId) return;
    setSaving(true);
    setFormError("");
    try {
      if (editingUnit) {
        await api.units.update(editingUnit._id, {
          unitNumber: form.unitNumber,
          tenantName: form.tenantName,
          monthlyRent: form.monthlyRent ? parseFloat(form.monthlyRent) : 0,
        });
      } else {
        await api.units.create({
          unitNumber: form.unitNumber,
          propertyId,
          tenantName: form.tenantName,
          monthlyRent: form.monthlyRent ? parseFloat(form.monthlyRent) : 0,
        });
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message ?? "Failed to save unit");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await api.units.delete(deleteConfirmId);
      setDeleteConfirmId(null);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={property?.name ?? "Property"}
        subtitle={property?.address ?? `${filteredUnits.length} units`}
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/properties"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Link>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Unit
            </button>
          </div>
        }
      />

      {/* Search bar */}
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by unit number or tenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-muted-foreground mt-2">
            {filteredUnits.length} unit{filteredUnits.length !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {/* Units grid */}
      <div className="p-6 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <Home className="w-7 h-7 text-muted-foreground" />
            </div>
            {searchQuery ? (
              <>
                <h3 className="font-semibold text-foreground">No matching units</h3>
                <p className="text-muted-foreground text-sm mt-1">Try a different search term</p>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-foreground">No units yet</h3>
                <p className="text-muted-foreground text-sm mt-1">Add units to start tracking expenses per unit</p>
                <button
                  onClick={openAdd}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add first unit
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredUnits.map((unit) => (
              <div
                key={unit._id}
                className="bg-card border border-border rounded-lg p-3.5 flex flex-col gap-2 hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono font-bold text-lg text-foreground leading-none">{unit.unitNumber}</p>
                    {unit.tenantName && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-[80px]">{unit.tenantName}</p>
                    )}
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(unit)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(unit._id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {(unit.monthlyRent ?? 0) > 0 && (
                  <div className="flex items-center gap-1 text-xs text-secondary font-medium">
                    <DollarSign className="w-3 h-3" />
                    {formatCurrency(unit.monthlyRent ?? 0)}/mo
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Unit Modal */}
      <Dialog open={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSave}>
          <DialogHeader onClose={() => setShowModal(false)}>
            <DialogTitle>{editingUnit ? "Edit Unit" : "Add Unit"}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {formError && (
              <div className="px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="unit-number">
                Unit Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="unit-number"
                placeholder="e.g. 101, A-12, 2B"
                value={form.unitNumber}
                onChange={(e) => setForm((f) => ({ ...f, unitNumber: e.target.value }))}
                className="font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-name">Tenant Name</Label>
              <Input
                id="tenant-name"
                placeholder="Current tenant (optional)"
                value={form.tenantName}
                onChange={(e) => setForm((f) => ({ ...f, tenantName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monthly-rent">Monthly Rent ({currencySymbol})</Label>
              <Input
                id="monthly-rent"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.monthlyRent}
                onChange={(e) => setForm((f) => ({ ...f, monthlyRent: e.target.value }))}
                className="font-mono"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingUnit ? "Save Changes" : "Add Unit"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <DialogHeader onClose={() => setDeleteConfirmId(null)}>
          <DialogTitle>Delete Unit?</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-muted-foreground">
            This will remove the unit from the property. Existing expenses linked to this unit will remain.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Delete Unit
          </Button>
        </DialogFooter>
      </Dialog>
    </AppShell>
  );
}
