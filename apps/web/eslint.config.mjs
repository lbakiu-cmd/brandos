import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    ignores: ["public/**"],
  },
  {
    rules: {
      // React Compiler-prep rules from eslint-plugin-react-hooks@7 -- they flag
      // standard, idiomatic patterns (fetch-on-mount, reading localStorage in an
      // effect, assigning window.location.href) as errors across this whole
      // codebase. Not real bugs here; disabled rather than refactored.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
];
