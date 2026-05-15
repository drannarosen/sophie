export {
  type MakeStaticComponentsOptions,
  makeStaticComponents,
} from "./components.tsx";
export {
  defineSophieIntegration,
  type SophieIntegrationOptions,
} from "./integration.ts";
export {
  getStudentChapters,
  isStudentVisible,
} from "./lib/get-student-chapters.ts";
export {
  extractDefinitions,
  indexAccumulator,
  type PedagogyIndexRemarkPluginOptions,
  pedagogyIndexRemarkPlugin,
} from "./lib/pedagogy-index-extractor.ts";
export {
  PEDAGOGY_INDEX_VIRTUAL_ID,
  pedagogyIndexVirtualModule,
} from "./lib/pedagogy-index-virtual-module.ts";
export {
  buildValidationAdmonitionNode,
  extractLastRevisedDate,
  isContractFile,
  type MystAdmonitionNode,
  renderValidationAdmonition,
} from "./lib/validation-admonition-plugin.ts";
