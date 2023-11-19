const Fontmin = require('fontmin')

type ICreateFonts = (
  text: string,
  source: string,
  output?: string,
) => Promise<any>

const createFonts: ICreateFonts = async (text, source) =>
  new Promise((resolve, reject) => {
    const fontmin = new Fontmin().src(source).use(
      Fontmin.glyph({
        text,
        hinting: false, // keep ttf hint info (fpgm, prep, cvt). default = true
      }),
    )

    fontmin.run((err: Error, files: Buffer[]) => {
      err ? reject(err) : resolve(files)
    })
  })

export default createFonts
