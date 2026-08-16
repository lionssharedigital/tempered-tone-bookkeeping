import ImportReview from "@/components/import/ImportReview";

export default async function ImportReviewPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  return (
    <div className="mx-auto max-w-6xl">
      <ImportReview batchId={Number(batchId)} />
    </div>
  );
}
