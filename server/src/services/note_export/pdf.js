import PDFDocument from "pdfkit";

export class PDFService {
  static getDocumentNode(payload) {
    if (!payload || typeof payload !== "object") return null;
    if (payload.document && typeof payload.document === "object") {
      return payload.document;
    }
    return payload.type === "doc" ? payload : null;
  }

  static extractInlineText(content = []) {
    if (!Array.isArray(content)) return "";

    const chunks = [];
    for (const node of content) {
      if (!node || typeof node !== "object") continue;
      if (node.type === "text" && typeof node.text === "string") {
        chunks.push(node.text);
      } else if (node.type === "hardBreak") {
        chunks.push("\n");
      } else if (Array.isArray(node.content)) {
        chunks.push(this.extractInlineText(node.content));
      }
    }
    return chunks.join("");
  }

  static renderDocumentNodes(doc, nodes = [], depth = 0) {
    if (!Array.isArray(nodes)) return;

    const indent = 50 + depth * 14;
    const availableWidth = 545 - indent;

    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      if (doc.y > 700) doc.addPage();

      if (node.type === "heading") {
        const level = Number(node?.attrs?.level) || 1;
        const text = this.extractInlineText(node.content);
        doc
          .font("Helvetica-Bold")
          .fontSize(Math.max(13, 20 - level * 2))
          .fillColor("#000000")
          .text(text || "", indent, doc.y, { width: availableWidth });
        doc.moveDown(0.5);
        continue;
      }

      if (node.type === "paragraph") {
        const text = this.extractInlineText(node.content);
        doc
          .font("Helvetica")
          .fontSize(11)
          .fillColor("#000000")
          .text(text || "", indent, doc.y, {
            align: "justify",
            width: availableWidth,
          });
        doc.moveDown(0.6);
        continue;
      }

      if (node.type === "codeBlock") {
        const text = this.extractInlineText(node.content);
        const padding = 10;
        const textHeight = doc.heightOfString(text || "", {
          width: availableWidth - padding * 2,
        });

        doc
          .rect(indent, doc.y, availableWidth, textHeight + padding * 2)
          .fill("#f4f4f4");

        doc
          .fillColor("#d63384")
          .font("Courier")
          .fontSize(10)
          .text(text || "", indent + padding, doc.y + padding, {
            lineGap: 2,
            width: availableWidth - padding * 2,
          });
        doc.moveDown(2);
        continue;
      }

      if (node.type === "blockquote") {
        const text = this.extractInlineText(node.content);
        doc
          .font("Helvetica-Oblique")
          .fontSize(11)
          .fillColor("#444444")
          .text(text || "", indent + 10, doc.y, {
            width: availableWidth - 10,
          });
        doc.moveDown(0.7);
        continue;
      }

      if (node.type === "bulletList" || node.type === "orderedList") {
        const start = Number(node?.attrs?.start) || 1;
        const items = Array.isArray(node.content) ? node.content : [];
        items.forEach((item, index) => {
          const marker =
            node.type === "orderedList" ? `${start + index}.` : "•";
          const text = this.extractInlineText(item?.content);
          doc
            .font("Helvetica")
            .fontSize(11)
            .fillColor("#000000")
            .text(marker, indent - 10, doc.y, { continued: true })
            .text(` ${text}`, indent, doc.y, { width: availableWidth });
          doc.moveDown(0.4);
        });
        continue;
      }

      if (node.type === "taskList") {
        const items = Array.isArray(node.content) ? node.content : [];
        items.forEach((item) => {
          const checked = item?.attrs?.checked === true;
          const marker = checked ? "[x]" : "[ ]";
          const text = this.extractInlineText(item?.content);
          doc
            .font("Helvetica")
            .fontSize(11)
            .fillColor("#000000")
            .text(marker, indent - 10, doc.y, { continued: true })
            .text(` ${text}`, indent, doc.y, { width: availableWidth });
          doc.moveDown(0.4);
        });
        continue;
      }

      if (node.type === "table") {
        const rows = Array.isArray(node.content) ? node.content : [];
        rows.forEach((row) => {
          const rowText = (Array.isArray(row?.content) ? row.content : [])
            .map((cell) => this.extractInlineText(cell?.content))
            .join(" | ");
          doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#000000")
            .text(rowText, indent, doc.y, { width: availableWidth });
          doc.moveDown(0.3);
        });
        doc.moveDown(0.6);
        continue;
      }

      if (node.type === "horizontalRule") {
        doc
          .moveTo(indent, doc.y)
          .lineTo(indent + availableWidth, doc.y)
          .strokeColor("#cccccc")
          .stroke();
        doc.moveDown(0.6);
        continue;
      }

      if (Array.isArray(node.content)) {
        this.renderDocumentNodes(doc, node.content, depth + 1);
      }
    }
  }

  static async generateNotePDF(note) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const chunks = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));

        const orgName = note.associated_organization?.name;
        const projectName = note.associated_project?.name;

        if (orgName || projectName) {
          const headerText = [orgName, projectName]
            .filter(Boolean)
            .join("  |  ");
          doc
            .fontSize(10)
            .fillColor("#666666")
            .text(headerText, { align: "left" });
          doc.moveDown(0.5);
        }
        doc.moveDown(0.5);

        doc
          .fontSize(18)
          .fillColor("#000000")
          .font("Helvetica-Bold")
          .text(note.title, { align: "left" });

        doc.moveDown(0.5);
        doc
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .strokeColor("#cccccc")
          .stroke();

        doc.moveDown(0.5);
        doc
          .fontSize(12)
          .font("Helvetica")
          .fillColor("#000000")
          .text(note.description || "", { align: "justify", lineGap: 2 });
        doc.moveDown(1);

        doc.fontSize(10).font("Helvetica").fillColor("#444444");
        const dateStr = new Date(note.created_at).toLocaleDateString("pt-BR");
        doc.text(`Autor: ${note.user_name} (${note.user_email})`);
        doc.text(
          `Criado em: ${dateStr}  |  Status: ${note.status?.toUpperCase() || "N/A"}`
        );

        doc.moveDown(1);
        doc
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .strokeColor("#cccccc")
          .stroke();

        const noteDocument = this.getDocumentNode(note.document);
        if (noteDocument && Array.isArray(noteDocument.content)) {
          doc.moveDown(2);
          this.renderDocumentNodes(doc, noteDocument.content);
        } else if (note.blocks && note.blocks.length > 0) {
          doc.moveDown(2);

          for (const block of note.blocks) {
            if (doc.y > 700) doc.addPage();

            const indent = 50 + block.level * 20;
            const availableWidth = 545 - indent;

            if (block.type === "code") {
              const padding = 10;
              const textHeight = doc.heightOfString(block.text, {
                width: availableWidth - padding * 2,
              });

              doc
                .rect(indent, doc.y, availableWidth, textHeight + padding * 2)
                .fill("#f4f4f4");

              doc
                .fillColor("#d63384")
                .font("Courier")
                .fontSize(10)
                .text(block.text, indent + padding, doc.y + padding, {
                  width: availableWidth - padding * 2,
                  lineGap: 2,
                });

              doc.moveDown(2);
            } else if (block.type === "list") {
              doc.fillColor("#000000").font("Helvetica").fontSize(11);
              doc.text("•", indent - 10, doc.y, { continued: true });
              doc.text(` ${block.text}`, indent, doc.y, {
                width: availableWidth,
              });
              doc.moveDown(0.5);
            } else {
              doc
                .fillColor("#000000")
                .font("Helvetica")
                .fontSize(11)
                .text(block.text || "", indent, doc.y, {
                  width: availableWidth,
                  align: "justify",
                });
              doc.moveDown(0.8);
            }
          }
        }

        if (note.collaborators && note.collaborators.length > 0) {
          if (doc.y > 600) doc.addPage();

          doc.moveDown(3);
          doc
            .fontSize(14)
            .font("Helvetica-Bold")
            .fillColor("#000000")
            .text("Colaboradores");
          doc.moveDown(1);

          const cardWidth = 155;
          const cardHeight = 45;
          let currentX = 50;
          let currentY = doc.y;

          for (const collab of note.collaborators) {
            doc
              .roundedRect(currentX, currentY, cardWidth, cardHeight, 6)
              .fillAndStroke("#ffffff", "#e0e0e0");

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            try {
              if (collab.avatar_url) {
                const response = await fetch(collab.avatar_url, {
                  signal: controller.signal,
                });
                const arrayBuffer = await response.arrayBuffer();
                doc.image(
                  Buffer.from(arrayBuffer),
                  currentX + 8,
                  currentY + 7,
                  { fit: [30, 30] }
                );
              } else {
                throw new Error();
              }
            } catch {
              // Fallback: Inicial do nome
              doc.circle(currentX + 23, currentY + 22, 15).fill("#5c67f2");
              doc
                .fontSize(10)
                .fillColor("#ffffff")
                .font("Helvetica-Bold")
                .text(
                  collab.username?.[0].toUpperCase() || "?",
                  currentX + 19,
                  currentY + 17
                );
            } finally {
              clearTimeout(timeoutId);
            }

            // Nome do Colaborador
            doc
              .fontSize(9)
              .fillColor("#333333")
              .font("Helvetica")
              .text(collab.username, currentX + 45, currentY + 18, {
                width: cardWidth - 50,
                ellipsis: true,
              });

            currentX += cardWidth + 10;
            if (currentX + cardWidth > 550) {
              currentX = 50;
              currentY += cardHeight + 10;
            }
            if (currentY > 750) {
              doc.addPage();
              currentY = 50;
              currentX = 50;
            }
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
