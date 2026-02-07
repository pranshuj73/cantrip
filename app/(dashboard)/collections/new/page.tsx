import { CollectionForm } from "@/components/collection-form";

export default function NewCollectionPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create Collection</h1>
      <CollectionForm />
    </div>
  );
}
