import type { Meta, StoryObj } from "@storybook/react-vite";
import { Objective } from "../Objective/Objective.tsx";
import { LearningObjectives } from "./LearningObjectives.tsx";

const meta = {
  title: "Components/LearningObjectives",
  component: LearningObjectives,
  parameters: { layout: "padded" },
} satisfies Meta<typeof LearningObjectives>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  chapter: "learningobjectives",
};

export const ThreeObjectives: Story = {
  args: {
    ...ns,
    id: "three-objectives",
    children: null,
  },
  render: (args) => (
    <LearningObjectives {...args}>
      <Objective id='isq' verb='Apply'>
        the inverse-square law to compute apparent brightness from intrinsic
        luminosity.
      </Objective>
      <Objective id='wien' verb='Use'>
        Wien's displacement law to estimate a star's temperature from its peak
        wavelength.
      </Objective>
      <Objective id='sb' verb='Derive'>
        the Stefan–Boltzmann relation L = 4πR²σTeff⁴ from blackbody radiation
        principles.
      </Objective>
    </LearningObjectives>
  ),
};

export const SingleObjective: Story = {
  args: {
    ...ns,
    id: "single",
    children: null,
  },
  render: (args) => (
    <LearningObjectives {...args}>
      <Objective id='hr' verb='Place'>
        a main-sequence star on the Hertzsprung–Russell diagram given its
        luminosity and effective temperature.
      </Objective>
    </LearningObjectives>
  ),
};

export const FiveObjectivesCustomHeading: Story = {
  args: {
    ...ns,
    id: "five-objectives",
    heading: "Today's Objectives",
    children: null,
  },
  render: (args) => (
    <LearningObjectives {...args}>
      <Objective id='obs' verb='Observe'>
        the night sky and identify three constellations visible at this
        latitude.
      </Objective>
      <Objective id='model' verb='Model'>
        the apparent motion of stars as Earth's rotation and orbit.
      </Objective>
      <Objective id='predict' verb='Predict'>
        where Polaris would appear from a 30° N latitude.
      </Objective>
      <Objective id='compare' verb='Compare'>
        the spectra of an O-type and an M-type main-sequence star.
      </Objective>
      <Objective id='explain' verb='Explain'>
        why redder stars are typically cooler — and the exception cases.
      </Objective>
    </LearningObjectives>
  ),
};
