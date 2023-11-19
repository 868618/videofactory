const { PDFDocument } = require('pdf-lib')
const fs = require('fs-extra')

export default async (pdfPath: string) => {
  // 读取pdf文件
  const existingPdfBytes = fs.readFileSync(pdfPath)

  // 加载pdf文件到库
  const pdfDoc = await PDFDocument.load(existingPdfBytes)

  const totalPages = pdfDoc.getPageCount() as number

  return totalPages
}
