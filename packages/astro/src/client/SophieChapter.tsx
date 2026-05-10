import "@sophie/theme/css";
import "katex/dist/katex.min.css";

import {
  type FigureRegistry,
  FigureRegistryProvider,
  type Profile,
  ProfileProvider,
  SophieConfigProvider,
} from "@sophie/components/runtime";
import type { ReactNode } from "react";

export interface SophieChapterProps {
  course: string;
  chapter: string;
  figures?: FigureRegistry;
  profile?: Profile;
  children: ReactNode;
}

/**
 * Wraps a chapter's MDX content in Sophie's three runtime contexts and
 * loads the global theme + KaTeX stylesheets as a side effect of being
 * imported. Use as the outermost wrapper of chapter content with
 * `client:load` so the entire chapter renders inside one React tree.
 */
export function SophieChapter({
  course,
  chapter,
  figures = {},
  profile = "student",
  children,
}: SophieChapterProps) {
  return (
    <SophieConfigProvider course={course} chapter={chapter}>
      <ProfileProvider profile={profile}>
        <FigureRegistryProvider registry={figures}>
          {children}
        </FigureRegistryProvider>
      </ProfileProvider>
    </SophieConfigProvider>
  );
}
