import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/emails/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // You can extend your brand colors here
      colors: {
        brand: {
          DEFAULT: "#2CB015",
          500: "#2CB015",
        },
      },
    },
  },
  plugins: [],
};

export default config;
