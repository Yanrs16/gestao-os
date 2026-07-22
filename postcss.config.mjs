const postcssConfig = {
  plugins: {
    '@tailwindcss/postcss': {}, // <-- O segredo está aqui! Mudamos para o pacote novo
    autoprefixer: {},
  },
};

export default postcssConfig;