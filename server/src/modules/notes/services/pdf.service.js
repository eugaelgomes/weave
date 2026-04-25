const PDFDocument = require("pdfkit");

class PDFService {
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
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#cccccc").stroke();

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
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#cccccc").stroke();

        if (note.blocks && note.blocks.length > 0) {
          doc.moveDown(2);

          for (const block of note.blocks) {
            if (doc.y > 700) doc.addPage();

            const indent = 50 + (block.level || 0) * 20;
            const availableWidth = 545 - indent;

            if (block.type === "code") {
              const padding = 10;
              const textHeight = doc.heightOfString(block.text || "", {
                width: availableWidth - padding * 2,
              });

              doc.rect(indent, doc.y, availableWidth, textHeight + padding * 2).fill("#f4f4f4");

              doc
                .fillColor("#000000")
                .font("Courier")
                .fontSize(10)
                .text(block.text || "", indent + padding, doc.y + padding, {
                  width: availableWidth - padding * 2,
                });

              doc.moveDown(2);
            } else {
              const bullet = block.type === "task" ? (block.done ? "[x]" : "[ ]") : "•";
              doc
                .font("Helvetica")
                .fontSize(11)
                .fillColor("#000000")
                .text(`${bullet} ${block.text || ""}`, indent, doc.y, {
                  width: availableWidth,
                  lineGap: 3,
                });
              doc.moveDown(0.5);
            }
          }
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = { PDFService };
