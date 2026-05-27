import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Video } from "./Video.tsx";

describe("<Video>", () => {
  it("renders YouTube privacy-light iframe with title + caption", () => {
    const { getByTitle, getByText } = render(
      <Video
        id='abc123'
        title='Crash Course: Galaxies'
        caption='Tour of galactic morphology'
      />
    );
    const iframe = getByTitle("Crash Course: Galaxies") as HTMLIFrameElement;
    expect(iframe.src).toContain("youtube-nocookie.com/embed/abc123");
    expect(iframe.src).toContain("rel=0");
    expect(iframe.src).toContain("modestbranding=1");
    expect(iframe.getAttribute("loading")).toBe("lazy");
    expect(iframe.getAttribute("referrerpolicy")).toBe(
      "strict-origin-when-cross-origin"
    );
    expect(getByText("Tour of galactic morphology")).toBeInTheDocument();
  });

  it("supports vimeo provider with dnt=1", () => {
    const { getByTitle } = render(
      <Video
        provider='vimeo'
        id='987654'
        title='Vimeo demo'
        caption='Vimeo caption'
      />
    );
    const iframe = getByTitle("Vimeo demo") as HTMLIFrameElement;
    expect(iframe.src).toContain("player.vimeo.com/video/987654");
    expect(iframe.src).toContain("dnt=1");
  });

  it("supports raw provider with arbitrary src", () => {
    const rawSrc = "https://media.example.edu/lecture-04.mp4";
    const { getByTitle } = render(
      <Video
        provider='raw'
        src={rawSrc}
        title='Self-hosted lecture'
        caption='Lecture 4'
      />
    );
    const iframe = getByTitle("Self-hosted lecture") as HTMLIFrameElement;
    expect(iframe.src).toBe(rawSrc);
  });

  it("renders optional credit below caption", () => {
    const { getByText } = render(
      <Video
        id='abc123'
        title='Title'
        caption='Tour of galactic morphology'
        credit='Crash Course Astronomy'
      />
    );
    expect(getByText(/Crash Course Astronomy/)).toBeInTheDocument();
  });

  it("renders as a <figure> labelled by its <figcaption>", () => {
    const { container } = render(
      <Video id='abc123' title='Title' caption='Caption text' />
    );
    const figure = container.querySelector("figure");
    expect(figure).not.toBeNull();
    const labelledBy = figure?.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const captionEl = container.querySelector("figcaption");
    expect(captionEl?.id).toBe(labelledBy);
  });

  it("throws curated schema error when both id and src are missing", () => {
    expect(() =>
      // Runtime-invalid (refine throws), structurally valid TS — `id`,
      // `src`, and `provider` are all `.optional()` at the schema level
      // so JSX-side type-checking can't catch missing source-of-truth.
      // The refine assertion catches the misuse at render time.
      render(<Video title='Title' caption='Caption' />)
    ).toThrow(/provider='youtube'\|'vimeo' requires `id`/);
  });

  it("throws curated schema error when raw provider is missing src", () => {
    expect(() =>
      render(<Video provider='raw' title='Title' caption='Caption' />)
    ).toThrow(/provider='raw' requires `src`/);
  });

  it("has zero axe violations", async () => {
    const { container } = render(
      <Video
        id='abc123'
        title='Crash Course: Galaxies'
        caption='Tour of galactic morphology'
        credit='Crash Course Astronomy'
      />
    );
    // jsdom does not implement iframe `contentWindow` traversal, so
    // axe's recursive frame inspection crashes with "Respondable
    // target must be a frame in the current window". Disable frame
    // traversal — the iframe-level axe checks are irrelevant to this
    // unit test (the embed target is a third-party origin we cannot
    // assert on at unit-test time). `<Video>`'s a11y contract here is
    // the labelled `<figure>` + iframe `title` attribute (axe's
    // `frame-title` rule, which runs at this document level), both of
    // which the remaining rules cover.
    const results = await axe(container, { iframes: false });
    expect(results.violations).toEqual([]);
  });
});
