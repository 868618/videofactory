'use strict';

const fs = require("fs-extra");
const path = require("path");
const PDF = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { PDFDocument, rgb } = PDF;
const renderPdf = async (pdfPath, options) => {
  const { outputDir: newDir, material } = options;
  !fs.existsSync(newDir) && fs.mkdirSync(newDir, { recursive: true });
  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  pdfDoc.registerFontkit(fontkit);
  pdfDoc.getPageIndices().slice(options.lastPageToConvert || 10).forEach(() => pdfDoc.removePage(options.lastPageToConvert || 10));
  await pdfDoc.save();
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const index = pages.indexOf(page);
    const isBegin = index == 0;
    const isNotBegin = !isBegin;
    const isEnd = index == pages.length - 1;
    const isNotEnd = !isEnd;
    for (const item of material) {
      const { isFirstPage, isLastPage } = item;
      if (isFirstPage && isNotBegin) {
        continue;
      }
      if (isLastPage && isNotEnd) {
        continue;
      }
      const {
        x,
        y,
        size,
        text,
        opacity,
        // fontFileBuffer,
        render,
        color = [1, 1, 1]
      } = item;
      const targetPage = isFirstPage && isBegin ? pdfDoc.getPage(0) : isLastPage && isEnd ? pdfDoc.getPage(pdfDoc.getPageCount() - 1) : page;
      const renderOptions = render ? await render(targetPage, pdfDoc, rgb) : {};
      if (item.type === "text") {
        await targetPage.drawText(text, {
          x,
          y,
          size,
          opacity,
          color: rgb(...color),
          ...renderOptions
        });
      }
      if (item.type == "image") {
        const { image, ...renderImageOptions } = renderOptions;
        await targetPage.drawImage(image, renderImageOptions);
      }
      if (item.type == "rectangle" && Reflect.has(renderOptions, "x")) {
        const color2 = rgb(...renderOptions.color);
        await targetPage.drawRectangle({
          ...renderOptions,
          color: color2
        });
      }
    }
  }
  const pdfBytes = await pdfDoc.save();
  const realPath = path.join(newDir, path.basename(pdfPath));
  fs.writeFileSync(realPath, pdfBytes);
  return realPath;
};

module.exports = renderPdf;
