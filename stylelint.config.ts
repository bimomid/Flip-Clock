// stylelint.config.ts
import type { Config } from "stylelint";

const config: Config = {
  extends: ["stylelint-config-standard", "stylelint-config-recess-order"],

  overrides: [
    {
      files: ["**/*.{vue,html}"],
      customSyntax: "postcss-html",
    },
  ],

  rules: {
    "no-empty-source": null,
    "selector-pseudo-class-no-unknown": [
      true,
      {
        ignorePseudoClasses: ["global", "export", "deep"],
      },
    ],
    "declaration-property-value-no-unknown": null,
  },
};

export default config;
