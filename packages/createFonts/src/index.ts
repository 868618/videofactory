const Fontmin = require('fontmin')
// const path = require('path')
import { type ICreateFonts } from '../typings'

const createFonts: ICreateFonts = async (text, source) =>
  new Promise((resolve, reject) => {
    const fontmin = new Fontmin().src(source).use(
      Fontmin.glyph({
        text,
        hinting: false, // keep ttf hint info (fpgm, prep, cvt). default = true
      }),
    )
    //   .dest(output)

    fontmin.run((err: Error, files: Buffer[]) => {
      err ? reject(err) : resolve(files)
    })
  })

export default createFonts
