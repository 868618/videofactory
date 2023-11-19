import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  name: 'renderFonts',

  clean: true,

  declaration: true,

  rollup: {
    emitCJS: true,

    esbuild: {
      minify: true,
    },
  },

  failOnWarn: false,
})
