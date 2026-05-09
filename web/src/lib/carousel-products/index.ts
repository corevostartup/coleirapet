import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";
import { COLLECTION_CAROUSEL_PRODUCTS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import type { CarouselProduct } from "@/lib/carousel-products/types";

export type { CarouselProduct } from "@/lib/carousel-products/types";

function sliceStr(value: string, max: number) {
  return value.trim().slice(0, max);
}

function docToProduct(doc: DocumentSnapshot<DocumentData>): CarouselProduct {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    title: typeof d.title === "string" ? d.title : "",
    description: typeof d.description === "string" ? d.description : "",
    image: typeof d.image === "string" ? d.image : "",
    ctaLabel: typeof d.ctaLabel === "string" ? d.ctaLabel : "",
    ctaHref: typeof d.ctaHref === "string" ? d.ctaHref : "",
    sortOrder: typeof d.sortOrder === "number" && Number.isFinite(d.sortOrder) ? d.sortOrder : 0,
  };
}

export async function listCarouselProductsFromDb(): Promise<CarouselProduct[]> {
  const db = getFirebaseAdminDb();
  const snap = await db.collection(COLLECTION_CAROUSEL_PRODUCTS).orderBy("sortOrder", "asc").get();
  return snap.docs.map((doc) => docToProduct(doc));
}

export type CreateCarouselProductInput = {
  title: string;
  description: string;
  image: string;
  ctaLabel: string;
  ctaHref: string;
};

export async function createCarouselProduct(input: CreateCarouselProductInput): Promise<CarouselProduct> {
  const db = getFirebaseAdminDb();
  const col = db.collection(COLLECTION_CAROUSEL_PRODUCTS);
  const nowIso = new Date().toISOString();

  const maxSnap = await col.orderBy("sortOrder", "desc").limit(1).get();
  const sortOrder = maxSnap.empty ? 0 : (maxSnap.docs[0].data().sortOrder as number) + 1;

  const ref = await col.add({
    title: sliceStr(input.title, 120),
    description: sliceStr(input.description, 500),
    image: sliceStr(input.image, 2000),
    ctaLabel: sliceStr(input.ctaLabel, 80),
    ctaHref: sliceStr(input.ctaHref, 2000),
    sortOrder,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const snap = await ref.get();
  return docToProduct(snap);
}

export type UpdateCarouselProductInput = {
  id: string;
  title?: string;
  description?: string;
  image?: string;
  ctaLabel?: string;
  ctaHref?: string;
  sortOrder?: number;
};

export async function updateCarouselProduct(input: UpdateCarouselProductInput): Promise<CarouselProduct | null> {
  const id = input.id.trim();
  if (!id) return null;

  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION_CAROUSEL_PRODUCTS).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = { updatedAt: nowIso };

  if (input.title !== undefined) patch.title = sliceStr(input.title, 120);
  if (input.description !== undefined) patch.description = sliceStr(input.description, 500);
  if (input.image !== undefined) patch.image = sliceStr(input.image, 2000);
  if (input.ctaLabel !== undefined) patch.ctaLabel = sliceStr(input.ctaLabel, 80);
  if (input.ctaHref !== undefined) patch.ctaHref = sliceStr(input.ctaHref, 2000);
  if (input.sortOrder !== undefined && Number.isFinite(input.sortOrder)) {
    patch.sortOrder = Math.max(0, Math.round(input.sortOrder));
  }

  await ref.set(patch, { merge: true });
  const snap = await ref.get();
  return docToProduct(snap);
}

export async function deleteCarouselProduct(id: string): Promise<boolean> {
  const normalized = id.trim();
  if (!normalized) return false;
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION_CAROUSEL_PRODUCTS).doc(normalized);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}
