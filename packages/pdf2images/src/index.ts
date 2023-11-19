const fs = require('fs-extra')
const path = require('path')
const glob = require('glob')

const { spawnSync } = require('child_process')

interface IPdf2images {
  (
    pdfPath: string,
    outputDir: string,
    filename?: string,
  ): Promise<{
    list: string[]
    pattern: string
  }>
}

const pdf2images: IPdf2images = async (pdfPath, outputDir, filename) =>
  new Promise((resolve, reject) => {
    if (outputDir) {
      // fs.mkdirSync(outputDir, { recursive: true })
      fs.ensureDir(outputDir)
    }

    const targetPath = path.join(outputDir, filename || 'img')

    try {
      spawnSync('pdftoppm', ['-png', pdfPath, targetPath])
      resolve({
        list: glob.sync(outputDir + '/*.png'),
        pattern: path.join(outputDir, '*.png'),
      })
    } catch (error) {
      reject(error)
    }
  })

export default pdf2images
