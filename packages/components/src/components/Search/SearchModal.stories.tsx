import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchModal } from "./SearchModal.tsx";

const meta: Meta<typeof SearchModal> = {
  component: SearchModal,
  parameters: { layout: "fullscreen" },
};
export default meta;

export const Default: StoryObj<typeof SearchModal> = {
  parameters: {
    docs: {
      description: {
        component:
          "Cmd/Ctrl+K to open. Pagefind isn't running in Storybook so the search returns nothing; this story verifies the modal chrome and empty-state.",
      },
    },
  },
};
