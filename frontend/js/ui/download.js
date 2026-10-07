/**
 * Triggers a file download in the browser from text content.
 */

/**
 * @param {string} content
 * @param {string} filename
 * @param {string} [mimeType]
 */
export function downloadText(content, filename, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url); // release the blob instead of leaking it
}
