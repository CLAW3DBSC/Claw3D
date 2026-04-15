import type { PackagedSkillId } from "@/lib/skills/catalog";

export type PackagedSkillSetupValues = Record<string, string>;

export type PackagedSkillSetupField = {
  key: string;
  label: string;
  description: string;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
};

export type PackagedSkillSetupDefinition = {
  title: string;
  description: string;
  submitLabel: string;
  fields: PackagedSkillSetupField[];
};

export type PackagedSkillGeneratedFile = {
  relativePath: string;
  content: string;
};

const AMAZON_ORDERING_SETUP: PackagedSkillSetupDefinition = {
  title: "Amazon defaults",
  description:
    "Save the workspace defaults the Amazon skill should use for checkout and returns during installation.",
  submitLabel: "Install Amazon skill",
  fields: [
    {
      key: "shippingAddress",
      label: "Shipping address",
      description: "Full address the agent should verify before placing an order.",
      placeholder: "123 Main St, Springfield, IL 62704",
      multiline: true,
      required: true,
    },
    {
      key: "paymentMethod",
      label: "Payment method",
      description: "Friendly label for the preferred card or payment method.",
      placeholder: "Visa ending in 4242",
      required: true,
    },
    {
      key: "returnDropoff",
      label: "Return drop-off",
      description: "Preferred return location for Amazon returns.",
      placeholder: "Whole Foods",
      required: true,
    },
  ],
};

const normalizeRequiredValue = (
  values: PackagedSkillSetupValues | undefined,
  key: string,
  label: string
): string => {
  const trimmed = values?.[key]?.trim() ?? "";
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
};

export const getPackagedSkillSetupDefinition = (
  packageId: string
): PackagedSkillSetupDefinition | null => {
  switch (packageId as PackagedSkillId) {
    case "amazon-ordering":
      return AMAZON_ORDERING_SETUP;
    default:
      return null;
  }
};

export const buildPackagedSkillGeneratedFiles = (
  packageId: string,
  values?: PackagedSkillSetupValues
): PackagedSkillGeneratedFile[] => {
  switch (packageId as PackagedSkillId) {
    case "amazon-ordering": {
      const shippingAddress = normalizeRequiredValue(values, "shippingAddress", "Shipping address");
      const paymentMethod = normalizeRequiredValue(values, "paymentMethod", "Payment method");
      const returnDropoff = normalizeRequiredValue(values, "returnDropoff", "Return drop-off");
      return [
        {
          relativePath: "defaults.json",
          content: JSON.stringify(
            {
              shippingAddress,
              paymentMethod,
              returnDropoff,
            },
            null,
            2
          ),
        },
      ];
    }
    default:
      return [];
  }
};
