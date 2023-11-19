import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
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