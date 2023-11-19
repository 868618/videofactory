const fs = require('fs-extra')
const { spawnSync } = require('child_process')
const pdf2images = require('@fatpigs/pdf2images')
const path = require('path')
const glob = require('glob')
const os = require('os')
const crypto = require('crypto')

interface IPdf2longpng {
  (pdfPath: string, outputDir: string, filename?: string): Promise<string>
}

const pdf2longpng: IPdf2longpng = (pdfPath, outputDir, filename) =>
  // pdftoppm -png v.pdf output && convert -append output*.png merged.png && rm -rf ./output*.png
  new Promise(async (resolve, reject) => {
    const tmpDir = path.join(os.tmpdir(), crypto.randomUUID().toString())

    const { pattern } = await pdf2images(pdfPath, tmpDir)

    try {
      fs.ensureDir(outputDir)

      spawnSync('convert', [
        '-append',
        pattern,
        path.join(
          outputDir,
          `${
            filename || path.basename(pdfPath, '.pdf').replace('.png', '')
          }.png`,
        ),
      ])

      resolve(
        path.join(
          outputDir,
          `${
            filename || path.basename(pdfPath, '.pdf').replace('.png', '')
          }.png`,
        ),
      )
    } catch (error) {
      reject(error)
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })

export default pdf2longpng
