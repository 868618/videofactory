import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  rollup: {
    emitCJS: true,
  },
  clean: true,
  failOnWarn: false,
});
