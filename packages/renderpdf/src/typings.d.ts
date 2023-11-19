// import path from 'path'

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }

type XOR<T, U> = (Without<T, U> & U) | (Without<U, T> & T)

interface ITextMaterial {
  type: 'text'
  text: string
  x: number
  y: number
  // width: number
  // height: number
  size: number
  color: string
  fontFileBuffer?: PDF.PDFFont
  opacity?: number
  isFirstPage?: boolean
}

interface IImageMaterial {
  type: 'image'
  x: number
  y: number
  width: number
  height: number
  isFirstPage?: boolean
  src: string
}

interface IRectangleMaterial {
  type: 'rectangle'
  render?: any
}

interface IOptions {
  // src: string
  title?: string
  outputDir: string
  material: XOR<ITextMaterial, IImageMaterial, IRectangleMaterial>[]
  lastPageToConvert?: number
  saveFile?: boolean
  color?: FixedLengthArray<number, number, number>
}

interface IRenderPdf {
  (pdfPath: string, options: IOptions): Promise<string>
}
