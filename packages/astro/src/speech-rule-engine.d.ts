/**
 * Type shim for `speech-rule-engine` (SRE) 4.1.4.
 *
 * The package ships its `.d.ts` under `js/` and `mjs/`, but its `main`
 * (`lib/sre.js`) is the CJS UMD bundle with no co-located declaration, so
 * `moduleResolution: "Bundler"` finds no types and the import is implicitly
 * `any` (TS7016). Under Node ESM the UMD `module.exports` surfaces as the
 * *default* import (`import SRE from "speech-rule-engine"`), with the named
 * API hanging off it — so we declare only the narrow surface B1 uses
 * (`setupEngine`, `engineReady`, `toSpeech`) rather than `declare module`
 * `any`, which would give false confidence elsewhere.
 */
declare module "speech-rule-engine" {
  interface SpeechRuleEngine {
    setupEngine(feature: Record<string, unknown>): Promise<void>;
    engineReady(): Promise<boolean>;
    toSpeech(mathml: string): string;
  }
  const sre: SpeechRuleEngine;
  export default sre;
}
