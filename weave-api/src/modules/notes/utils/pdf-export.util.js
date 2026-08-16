const PDFDocument = require("pdfkit");

/**
 * Extrai texto simples de properties (ignora marks no PDF).
 * @param {Record<string, unknown>} properties
 * @returns {string}
 */
function plainTextFromProperties(properties) {
  if (!properties || typeof properties !== "object") return "";
  const t = properties.text;
  return typeof t === "string" ? t : "";
}

class PDFService {
  /**
   * @param {Record<string, unknown>} block
   * @param {import('pdfkit')} doc
   * @param {number} indent
   * @param {number} availableWidth
   */
  static renderBlock(block, doc, indent, availableWidth) {
    if (!block || typeof block !== "object") return;

    const type = block.type;
    const props = block.properties && typeof block.properties === "object" ? block.properties : {};
    const text = typeof block.text === "string" ? block.text : plainTextFromProperties(props);

    if (doc.y > 700) doc.addPage();

    if (type === "heading") {
      const level = Number(props.attrs?.level) || Number(block.properties?.level) || 1;
      doc
        .font("Helvetica-Bold")
        .fontSize(Math.max(13, 20 - level * 2))
        .fillColor("#000000")
        .text(text || "", indent, doc.y, { width: availableWidth });
      doc.moveDown(0.5);
      return;
    }

    if (type === "paragraph" || type === "quote") {
      const font = type === "quote" ? "Helvetica-Oblique" : "Helvetica";
      doc
        .font(font)
        .fontSize(11)
        .fillColor(type === "quote" ? "#444444" : "#000000")
        .text(text || "", indent, doc.y, {
          align: "justify",
          width: availableWidth,
        });
      doc.moveDown(0.6);
      return;
    }

    if (type === "code") {
      const padding = 10;
      const body = text || "";
      const textHeight = doc.heightOfString(body, {
        width: availableWidth - padding * 2,
      });
      doc.rect(indent, doc.y, availableWidth, textHeight + padding * 2).fill("#f4f4f4");
      doc
        .fillColor("#d63384")
        .font("Courier")
        .fontSize(10)
        .text(body, indent + padding, doc.y + padding, {
          lineGap: 2,
          width: availableWidth - padding * 2,
        });
      doc.moveDown(2);
      return;
    }

    if (type === "divider") {
      doc
        .moveTo(indent, doc.y)
        .lineTo(indent + availableWidth, doc.y)
        .strokeColor("#cccccc")
        .stroke();
      doc.moveDown(0.6);
      return;
    }

    if (type === "image") {
      const src = props.attrs?.src || text || "";
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#666666")
        .text(`[imagem] ${src}`, indent, doc.y, { width: availableWidth });
      doc.moveDown(0.5);
      return;
    }

    if (type === "todo") {
      const checked = props.attrs?.checked === true;
      const bullet = checked ? "[x]" : "[ ]";
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#000000")
        .text(`${bullet} ${text || ""}`, indent, doc.y, {
          lineGap: 3,
          width: availableWidth,
        });
      doc.moveDown(0.5);
      return;
    }

    if (type === "list") {
      const children = Array.isArray(block.children) ? block.children : [];
      children.forEach((child) => {
        const childIndent = indent + 14;
        const childWidth = 545 - childIndent;
        if (child?.type === "todo") {
          PDFService.renderBlock(child, doc, childIndent, childWidth);
        } else {
          doc.fillColor("#000000").font("Helvetica").fontSize(11);
          doc.text("•", indent - 10, doc.y, { continued: true });
          doc.text(
            ` ${typeof child?.text === "string" ? child.text : plainTextFromProperties(child?.properties)}`,
            indent,
            doc.y,
            {
              width: availableWidth - 14,
            }
          );
          doc.moveDown(0.5);
        }
      });
      return;
    }

    if (type === "table") {
      const lines = (text || "").split("\n").filter(Boolean);
      lines.forEach((line) => {
        doc.font("Helvetica").fontSize(10).fillColor("#000000").text(line, indent, doc.y, {
          width: availableWidth,
        });
        doc.moveDown(0.3);
      });
      doc.moveDown(0.6);
      return;
    }

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#000000")
      .text(text || "", indent, doc.y, { width: availableWidth });
    doc.moveDown(0.6);
  }

  static async generateNotePDF(note) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const chunks = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));

        const orgName = note.associated_organization?.name;
        const projectName = note.associated_project?.name;

        if (orgName || projectName) {
          const headerText = [orgName, projectName].filter(Boolean).join("  |  ");
          doc.fontSize(10).fillColor("#666666").text(headerText, { align: "left" });
          doc.moveDown(0.5);
        }
        doc.moveDown(0.5);

        doc
          .fontSize(18)
          .fillColor("#000000")
          .font("Helvetica-Bold")
          .text(note.title, { align: "left" });

        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#cccccc").stroke();

        doc.moveDown(0.5);
        doc
          .fontSize(12)
          .font("Helvetica")
          .fillColor("#000000")
          .text(note.description || "", {
            align: "justify",
            lineGap: 2,
          });
        doc.moveDown(1);

        doc.fontSize(10).font("Helvetica").fillColor("#444444");
        const dateStr = new Date(note.created_at).toLocaleDateString("pt-BR");
        doc.text(`Autor: ${note.user_name} (${note.user_email})`);
        doc.text(`Criado em: ${dateStr}  |  Status: ${note.status?.toUpperCase() || "N/A"}`);

        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#cccccc").stroke();

        const blocks = Array.isArray(note.blocks) ? note.blocks : [];
        if (blocks.length > 0) {
          doc.moveDown(2);
          blocks.forEach((block) => {
            PDFService.renderBlock(block, doc, 50, 495);
          });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = { PDFService };
