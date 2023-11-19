const Fontmin = require("fontmin");
const createFonts = async (text, source) => new Promise((resolve, reject) => {
  const fontmin = new Fontmin().src(source).use(
    Fontmin.glyph({
      text,
      hinting: false
      // keep ttf hint info (fpgm, prep, cvt). default = true
    })
  );
  fontmin.run((err, files) => {
    err ? reject(err) : resolve(files);
  });
});

export { createFonts as default };
