import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { SearchModal } from "./SearchModal.tsx";

describe("<SearchModal>", () => {
  it("Cmd+K opens the modal", () => {
    render(<SearchModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("Ctrl+K opens the modal on non-Mac", () => {
    render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("Esc closes the modal", () => {
    render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Cmd+K toggles closed state", () => {
    render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("input autofocuses on open", () => {
    render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    const input = screen.getByRole("textbox");
    expect(input).toHaveFocus();
  });

  it("axe-core: zero violations on open modal", async () => {
    const { container } = render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(await axe(container)).toHaveNoViolations();
  });
});
