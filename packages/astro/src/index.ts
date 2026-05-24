export {
  type MakeStaticComponentsOptions,
  makeStaticComponents,
} from "./components.tsx";
export {
  defineSophieIntegration,
  type SophieIntegrationOptions,
} from "./integration.ts";
export { artifactsFromCollection } from "./lib/artifacts-from-collection.ts";
export {
  type CardSlotHtml,
  renderTopicCardSlotsToHtml,
} from "./lib/mdx-plugins/skill-review-resolver.ts";
export {
  buildModuleNavInputs,
  type NavChapter,
  type NavModule,
} from "./lib/module-nav-helpers.ts";
export { indexAccumulator } from "./lib/pedagogy-index/accumulator.ts";
export { extractDefinitions } from "./lib/pedagogy-index/extractors/definitions.ts";
export {
  type PedagogyIndexRemarkPluginOptions,
  pedagogyIndexRemarkPlugin,
} from "./lib/pedagogy-index/orchestrator.ts";
export {
  PEDAGOGY_INDEX_VIRTUAL_ID,
  pedagogyIndexVirtualModule,
} from "./lib/pedagogy-index-virtual-module.ts";
export {
  buildValidationAdmonitionNode,
  extractLastRevisedDate,
  isContractFile,
  type MystAdmonitionNode,
  parseValidationFrontmatter,
  renderValidationAdmonition,
} from "./lib/validation/admonition-plugin.ts";
