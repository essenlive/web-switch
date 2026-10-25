import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default [
  ...nextVitals,
  ...nextTs,
  {
    // Règles React Compiler ajoutées par eslint-config-next 16 : le code charge localStorage après montage (hydratation) et mute ses objets
    rules: { "react-hooks/set-state-in-effect": "warn", "react-hooks/immutability": "warn" },
  },
];
