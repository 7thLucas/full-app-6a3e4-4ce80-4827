import { useEffect, useState } from "react";
import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getUserFromRequest } from "~/modules/authentication/authentication.server";
import { useAuth } from "~/modules/authentication/use-authentication";
import { AppShell, PageHeader } from "~/components/layout/app-shell";
import { api, type Property } from "~/lib/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "~/components/ui/dialog";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Hash,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Link } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getUserFromRequest(request)) {
    return redirect("/auth/login");
  }
  return null;
}

interface PropertyFormState {
  name: string;
  address: string;
  description: string;
}

export default function PropertiesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [form, setForm] = useState<PropertyFormState>({ name: "", address: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const data = await api.properties.list();
      setProperties(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    loadProperties();
  }, [isAuthenticated, authLoading]);

  const openAdd = () => {
    setEditingProperty(null);
    setForm({ name: "", address: "", description: "" });
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (property: Property) => {
    setEditingProperty(property);
    setForm({
      name: property.name,
      address: property.address ?? "",
      description: property.description ?? "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Property name is required");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (editingProperty) {
        await api.properties.update(editingProperty._id, form);
      } else {
        await api.properties.create(form);
      }
      setShowModal(false);
      loadProperties();
    } catch (err: any) {
      setFormError(err.message ?? "Failed to save property");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await api.properties.delete(deleteConfirmId);
      setDeleteConfirmId(null);
      loadProperties();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Properties"
        subtitle={`${properties.length} propert${properties.length !== 1 ? "ies" : "y"} in portfolio`}
        action={
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </button>
        }
      />

      <div className="p-6 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No properties yet</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm">
              Add your first property to start tracking expenses and managing units.
            </p>
            <button
              onClick={openAdd}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add your first property
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((property) => (
              <div
                key={property._id}
                className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground leading-tight">{property.name}</h3>
                    {property.address && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                        <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {property.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{property.description}</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="font-medium text-foreground">{property.unitCount}</span> units
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1 pt-2 border-t border-border">
                  <Link
                    to={`/properties/${property._id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Manage Units <ArrowRight className="w-3 h-3" />
                  </Link>
                  <button
                    onClick={() => openEdit(property)}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(property._id)}
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSave}>
          <DialogHeader onClose={() => setShowModal(false)}>
            <DialogTitle>{editingProperty ? "Edit Property" : "Add Property"}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {formError && (
              <div className="px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="prop-name">
                Property Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="prop-name"
                placeholder="e.g. Oakwood Apartments"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-address">Address</Label>
              <Input
                id="prop-address"
                placeholder="123 Main St, City, State"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-desc">Description</Label>
              <Textarea
                id="prop-desc"
                placeholder="Brief description of the property..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingProperty ? "Save Changes" : "Add Property"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <DialogHeader onClose={() => setDeleteConfirmId(null)}>
          <DialogTitle>Delete Property?</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-muted-foreground">
            This will remove the property from your portfolio. Existing expenses will not be deleted, but the
            property will no longer appear in filters.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Delete Property
          </Button>
        </DialogFooter>
      </Dialog>
    </AppShell>
  );
}
