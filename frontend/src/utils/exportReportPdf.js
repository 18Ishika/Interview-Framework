/**
 * Renders the DOM node at `elementId` (the InterviewReport root — see the
 * `rootId` prop on InterviewReport.jsx) to a SINGLE continuous-page PDF
 * sized to match the content, rather than splitting into fixed A4 pages.
 * That avoids two problems fixed-page pagination caused: cards getting
 * sliced in half at a page boundary, and a mostly-empty trailing page.
 *
 * Requires: npm install html2canvas jspdf
 */
export async function downloadReportAsPdf(elementId, filename = "interview-report.pdf") {
  const node = document.getElementById(elementId);
  if (!node) throw new Error(`No element with id "${elementId}" to export`);

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");

  // One page, exact size of the captured content (in px, at the canvas's
  // own pixel dimensions) — no A4 splitting, no leftover blank space.
  const pdf = new jsPDF({
    orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
}