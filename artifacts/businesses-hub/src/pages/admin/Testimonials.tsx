import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth, isAdmin } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  listTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  reorderTestimonials,
  type TestimonialItem,
  type TestimonialInput,
} from "@/lib/adminApi";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Star,
  MessageSquareQuote,
} from "lucide-react";

const EMPTY_FORM: TestimonialInput = {
  name: "",
  quoteEn: "",
  quoteAr: "",
  roleEn: "",
  roleAr: "",
  stars: 5,
  active: true,
};

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < count ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

interface SortableRowProps {
  item: TestimonialItem;
  index: number;
  total: number;
  isAR: boolean;
  reordering: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onEdit: (item: TestimonialItem) => void;
  onDelete: (item: TestimonialItem) => void;
  onToggleActive: (item: TestimonialItem) => void;
}

function SortableRow({
  item,
  index,
  total,
  isAR,
  reordering,
  onMove,
  onEdit,
  onDelete,
  onToggleActive,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: reordering });

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      data-testid={`testimonial-row-${item.id}`}
      className={`${item.active ? "" : "opacity-60"} ${
        isDragging ? "relative z-10 bg-muted/70 shadow-md" : ""
      }`}
    >
      <TableCell>
        <div className="flex items-center gap-1">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground cursor-grab active:cursor-grabbing touch-none disabled:opacity-50"
            disabled={reordering}
            aria-label={isAR ? "اسحب لإعادة الترتيب" : "Drag to reorder"}
            data-testid={`drag-handle-${item.id}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === 0 || reordering}
            onClick={() => onMove(index, -1)}
            aria-label={isAR ? "تحريك لأعلى" : "Move up"}
            data-testid={`move-up-${item.id}`}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === total - 1 || reordering}
            onClick={() => onMove(index, 1)}
            aria-label={isAR ? "تحريك لأسفل" : "Move down"}
            data-testid={`move-down-${item.id}`}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="font-medium whitespace-nowrap">
        {item.name}
        <div className="text-xs text-muted-foreground font-normal">
          {isAR ? item.roleAr : item.roleEn}
        </div>
      </TableCell>
      <TableCell className="max-w-[360px]">
        <p className="truncate text-sm">
          {isAR ? item.quoteAr : item.quoteEn}
        </p>
      </TableCell>
      <TableCell>
        <Stars count={item.stars} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={item.active}
            onCheckedChange={() => onToggleActive(item)}
            aria-label={isAR ? "تبديل الظهور" : "Toggle visibility"}
            data-testid={`toggle-active-${item.id}`}
          />
          <Badge variant={item.active ? "default" : "outline"}>
            {item.active
              ? isAR
                ? "ظاهر"
                : "Active"
              : isAR
                ? "مخفي"
                : "Hidden"}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(item)}
            aria-label={isAR ? "تعديل" : "Edit"}
            data-testid={`edit-${item.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-rose-600 hover:text-rose-700"
            onClick={() => onDelete(item)}
            aria-label={isAR ? "حذف" : "Delete"}
            data-testid={`delete-${item.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function AdminTestimonialsPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isAR = lang === "ar";
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [items, setItems] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const serverOrderRef = useRef<number[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TestimonialInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<TestimonialItem | null>(
    null,
  );

  const isAdminUser = isAdmin(user);

  useEffect(() => {
    if (!user) {
      navigate("/login?next=/admin/testimonials");
    }
  }, [user, navigate]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listTestimonials();
      setItems(resp.items);
      serverOrderRef.current = resp.items.map((r) => r.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load testimonials.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdminUser) return;
    void loadList();
  }, [isAdminUser, loadList]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: TestimonialItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      quoteEn: item.quoteEn,
      quoteAr: item.quoteAr,
      roleEn: item.roleEn,
      roleAr: item.roleAr,
      stars: item.stars,
      active: item.active,
    });
    setDialogOpen(true);
  };

  const formValid =
    form.name.trim() &&
    form.quoteEn.trim() &&
    form.quoteAr.trim() &&
    form.roleEn.trim() &&
    form.roleAr.trim() &&
    form.stars >= 1 &&
    form.stars <= 5;

  const handleSave = async () => {
    if (!formValid) return;
    setSaving(true);
    try {
      if (editingId === null) {
        await createTestimonial(form);
        toast({
          title: isAR ? "تمت الإضافة" : "Testimonial added",
        });
      } else {
        await updateTestimonial(editingId, form);
        toast({
          title: isAR ? "تم الحفظ" : "Testimonial updated",
        });
      }
      setDialogOpen(false);
      await loadList();
    } catch (e) {
      toast({
        title: isAR ? "فشل الحفظ" : "Save failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: TestimonialItem) => {
    const next = !item.active;
    setItems((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, active: next } : r)),
    );
    try {
      await updateTestimonial(item.id, { active: next });
    } catch (e) {
      setItems((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, active: item.active } : r)),
      );
      toast({
        title: isAR ? "فشل التحديث" : "Update failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteTestimonial(deleteTarget.id);
      toast({ title: isAR ? "تم الحذف" : "Testimonial deleted" });
      setDeleteTarget(null);
      await loadList();
    } catch (e) {
      toast({
        title: isAR ? "فشل الحذف" : "Delete failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const persistOrder = async (next: TestimonialItem[]) => {
    setItems(next);
    setReordering(true);
    try {
      const nextIds = next.map((r) => r.id);
      await reorderTestimonials(nextIds, serverOrderRef.current);
      serverOrderRef.current = nextIds;
    } catch (e) {
      const status =
        e instanceof Error ? (e as Error & { status?: number }).status : undefined;
      if (status === 409) {
        toast({
          title: isAR
            ? "تغيّر الترتيب من مشرف آخر"
            : "Order changed by another admin",
          description: isAR
            ? "تم تحديث القائمة بأحدث ترتيب. أعد المحاولة."
            : "The list was refreshed with the latest order. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: isAR ? "فشل إعادة الترتيب" : "Reorder failed",
          description: e instanceof Error ? e.message : undefined,
          variant: "destructive",
        });
      }
      await loadList();
    } finally {
      setReordering(false);
    }
  };

  const handleMove = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    await persistOrder(arrayMove(items, index, target));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((r) => r.id === active.id);
    const newIndex = items.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    void persistOrder(arrayMove(items, oldIndex, newIndex));
  };

  if (!user) return null;

  if (!isAdminUser) {
    return (
      <AppLayout>
        <SEOHead
          title="Admin · Testimonials"
          description="Admin-only testimonials management."
          path="/admin/testimonials"
          noindex
        />
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                {isAR ? "غير مصرح" : "Forbidden"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {isAR
                  ? "ليس لديك إذن لإدارة آراء العملاء."
                  : "You do not have permission to manage testimonials."}
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEOHead
        title="Admin · Testimonials"
        description="Add, edit, reorder, and hide homepage testimonials."
        path="/admin/testimonials"
        noindex
      />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <AdminNav />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <MessageSquareQuote className="h-6 w-6" />
              {isAR ? "آراء العملاء" : "Testimonials"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAR
                ? "أضف وعدّل وأعد ترتيب آراء العملاء الظاهرة في الصفحة الرئيسية. قد تستغرق التغييرات حتى 5 دقائق للظهور بسبب التخزين المؤقت."
                : "Add, edit, and reorder the testimonials shown on the homepage. Changes can take up to 5 minutes to appear due to caching."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => void loadList()}
              disabled={loading}
              aria-label={isAR ? "تحديث" : "Refresh"}
              data-testid="refresh-button"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button onClick={openAdd} data-testid="add-testimonial-button">
              <Plus className="h-4 w-4 mr-2" />
              {isAR ? "إضافة رأي" : "Add testimonial"}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {error ? (
              <div className="p-8 text-center">
                <p className="text-rose-600 font-medium">
                  {isAR ? "تعذر التحميل" : "Failed to load"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => void loadList()}
                >
                  {isAR ? "إعادة المحاولة" : "Try again"}
                </Button>
              </div>
            ) : loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                {isAR ? "جارٍ التحميل..." : "Loading..."}
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <MessageSquareQuote className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>{isAR ? "لا توجد آراء بعد." : "No testimonials yet."}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                <Table data-testid="testimonials-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[90px]">
                        {isAR ? "الترتيب" : "Order"}
                      </TableHead>
                      <TableHead>{isAR ? "الاسم" : "Name"}</TableHead>
                      <TableHead>{isAR ? "الرأي" : "Quote"}</TableHead>
                      <TableHead>{isAR ? "التقييم" : "Stars"}</TableHead>
                      <TableHead>{isAR ? "ظاهر" : "Visible"}</TableHead>
                      <TableHead className="w-[100px]">
                        {isAR ? "إجراءات" : "Actions"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={items.map((r) => r.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {items.map((item, i) => (
                        <SortableRow
                          key={item.id}
                          item={item}
                          index={i}
                          total={items.length}
                          isAR={isAR}
                          reordering={reordering}
                          onMove={(index, dir) => void handleMove(index, dir)}
                          onEdit={openEdit}
                          onDelete={setDeleteTarget}
                          onToggleActive={(it) => void handleToggleActive(it)}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
                </DndContext>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId === null
                ? isAR
                  ? "إضافة رأي جديد"
                  : "Add testimonial"
                : isAR
                  ? "تعديل الرأي"
                  : "Edit testimonial"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="t-name">{isAR ? "الاسم" : "Name"}</Label>
              <Input
                id="t-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="input-name"
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2 md:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="t-role-en">
                  {isAR ? "المسمى (إنجليزي)" : "Role (English)"}
                </Label>
                <Input
                  id="t-role-en"
                  value={form.roleEn}
                  onChange={(e) =>
                    setForm({ ...form, roleEn: e.target.value })
                  }
                  data-testid="input-role-en"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="t-role-ar">
                  {isAR ? "المسمى (عربي)" : "Role (Arabic)"}
                </Label>
                <Input
                  id="t-role-ar"
                  dir="rtl"
                  value={form.roleAr}
                  onChange={(e) =>
                    setForm({ ...form, roleAr: e.target.value })
                  }
                  data-testid="input-role-ar"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-quote-en">
                {isAR ? "الرأي (إنجليزي)" : "Quote (English)"}
              </Label>
              <Textarea
                id="t-quote-en"
                rows={3}
                value={form.quoteEn}
                onChange={(e) => setForm({ ...form, quoteEn: e.target.value })}
                data-testid="input-quote-en"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-quote-ar">
                {isAR ? "الرأي (عربي)" : "Quote (Arabic)"}
              </Label>
              <Textarea
                id="t-quote-ar"
                dir="rtl"
                rows={3}
                value={form.quoteAr}
                onChange={(e) => setForm({ ...form, quoteAr: e.target.value })}
                data-testid="input-quote-ar"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="grid gap-2">
                <Label>{isAR ? "التقييم" : "Star rating"}</Label>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setForm({ ...form, stars: i + 1 })}
                      aria-label={`${i + 1} ${isAR ? "نجوم" : "stars"}`}
                      data-testid={`star-${i + 1}`}
                    >
                      <Star
                        className={`h-6 w-6 ${i < form.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="t-active"
                  checked={form.active ?? true}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                  data-testid="input-active"
                />
                <Label htmlFor="t-active">
                  {isAR ? "ظاهر في الموقع" : "Visible on site"}
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              {isAR ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!formValid || saving}
              data-testid="save-testimonial-button"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isAR ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isAR ? "حذف الرأي؟" : "Delete testimonial?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {isAR
              ? `سيتم حذف رأي "${deleteTarget?.name ?? ""}" نهائياً. لا يمكن التراجع عن هذا الإجراء.`
              : `This will permanently delete the testimonial from "${deleteTarget?.name ?? ""}". This cannot be undone.`}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={saving}
            >
              {isAR ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={saving}
              data-testid="confirm-delete-button"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isAR ? "حذف" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
