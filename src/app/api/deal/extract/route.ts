import { handle } from "@/lib/api";
import { fixtureExtraction } from "@/lib/deal/extract";
import { SAMPLE_DATA_LABEL } from "@/types/deal";

/**
 * POST /api/deal/extract (issue #9)
 *
 * Accepts a multipart upload (`file`) or an empty body. For the demo it always
 * returns the sample deal as the parsed result, with every number unconfirmed.
 * The analyst confirms each field in the UI, then passes the result to
 * /api/deal/review as `extraction`; unconfirmed numbers are rejected there.
 *
 * Real XLSX and PDF parsing is not implemented yet.
 */
export const POST = handle(async (request) => {
  let fileName: string | undefined;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const file = (await request.formData()).get("file");
    if (file instanceof File) fileName = file.name;
  }
  return Response.json({
    extraction: fixtureExtraction(fileName),
    dataLabel: SAMPLE_DATA_LABEL,
  });
});
