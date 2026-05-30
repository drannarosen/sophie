import * as Dialog from "@radix-ui/react-dialog";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { withBase } from "../../utils/with-base.ts";
import { type ChipFilter, ChipStrip } from "./ChipStrip.tsx";
import { ResultList } from "./ResultList.tsx";
import styles from "./SearchModal.module.css.js";
import type { SearchResult } from "./types.ts";

// Narrow shape of the Pagefind JS client we use. Pagefind ships no
// types; the runtime module exposes more than this, but only `search`
// is consumed here.
type PagefindAPI = {
  search: (
    query: string,
    opts?: { filters?: Record<string, string | string[]> }
  ) => Promise<{ results: Array<{ data: () => Promise<SearchResult> }> }>;
};

const DEBOUNCE_MS = 150;
const MAX_RESULTS = 25;

export function SearchModal(): ReactNode {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<ChipFilter>("all");
  const [pagefind, setPagefind] = useState<PagefindAPI | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    // Cross-bundle bridge: the static `<SearchTrigger>` input in the
    // topbar dispatches `sophie:search-open` on focus, optionally with
    // `detail.query` if the user fast-typed before focus shifted. We
    // open the modal and seed the query input so the typed characters
    // aren't lost.
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ query?: string }>).detail ?? {};
      setOpen(true);
      if (typeof detail.query === "string" && detail.query.length > 0) {
        setQuery(detail.query);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("sophie:search-open", onOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("sophie:search-open", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open && !pagefind) {
      // The /pagefind/ path is a runtime-served asset, not a build-time
      // module. Hide it from Vite's import-analysis by binding the URL
      // to a local const before the dynamic import — the analyzer can
      // resolve string literals but not variable arguments. Without this
      // indirection, Vite errors at transform time (`Failed to resolve
      // import "/pagefind/pagefind.js"`) before the .catch handler can
      // fire. Production behavior is unchanged: the Astro client island
      // dynamically fetches the index from the served origin after Task
      // 7's postbuild emits dist/pagefind/. `withBase` prefixes the
      // consumer's Astro `base` so the fetch resolves under a non-root
      // deploy (e.g. /astr201/pagefind/...) — the `withBase` return is
      // already a variable, so the @vite-ignore indirection above still
      // holds (the import argument was never a string literal).
      const pagefindUrl = withBase("/pagefind/pagefind.js");
      import(/* @vite-ignore */ pagefindUrl)
        .then((mod) => setPagefind(mod as PagefindAPI))
        .catch((err) => {
          console.error("Pagefind load failed", err);
        });
    }
  }, [open, pagefind]);

  useEffect(() => {
    if (!pagefind || !query) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const filters =
        activeFilter === "all" ? undefined : { type: [activeFilter] };
      const search = await pagefind.search(query, { filters });
      const data = await Promise.all(
        search.results.slice(0, MAX_RESULTS).map((r) => r.data())
      );
      setResults(data);
      setHighlightedIndex(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [pagefind, query, activeFilter]);

  const onInputKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (results.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      }
    },
    [results.length]
  );

  const onSelect = useCallback((r: SearchResult) => {
    setOpen(false);
    window.location.href = r.url;
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          aria-labelledby='sophie-search-title'
          data-pagefind-ignore
        >
          <Dialog.Title id='sophie-search-title' className={styles.srOnly}>
            Search
          </Dialog.Title>
          <Dialog.Description className={styles.srOnly}>
            Search this course's readings, equations, figures, and terms.
          </Dialog.Description>
          <input
            type='text'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder='search query…'
            className={styles.input}
            aria-controls='sophie-search-results'
            // biome-ignore lint/a11y/noAutofocus: modal-scoped focus trap — the input must take focus when the dialog opens, per WAI-ARIA combobox/listbox APG and the SearchModal test contract (Task 3).
            autoFocus
          />
          <ChipStrip active={activeFilter} onChange={setActiveFilter} />
          <ResultList
            results={results}
            highlightedIndex={highlightedIndex}
            onSelect={onSelect}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
