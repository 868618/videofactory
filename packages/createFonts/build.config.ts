import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  name: 'renderFonts',

  clean: true,

  // entries: [
  //   './index',
  //   {
  //     builder: 'mkdist',
  //     input: './fonts/',
  //     outDir: './dist/fonts/',
  //   },
  // ],

  declaration: true,

  rollup: {
    emitCJS: true,
  },

  failOnWarn: false,
})
