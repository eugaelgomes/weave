# Weave Notes Blog

App Next.js para o subdomínio público do Weave Notes (`blog.weavenotes.app`).

Contém as páginas públicas: landing, about, privacy e terms.

## Desenvolvimento

```bash
npm install
npm run dev  # Porta 3001
```

## Variáveis de Ambiente

| Variável               | Descrição              | Default                       |
| ---------------------- | ---------------------- | ----------------------------- |
| `NEXT_PUBLIC_APP_URL`  | URL do app principal   | `https://weavenotes.app`      |
| `NEXT_PUBLIC_BLOG_URL` | URL deste blog/landing | `https://blog.weavenotes.app` |

## Estrutura

```
app/
  page.tsx          # Landing page (home)
  about/page.tsx    # Sobre o Weave Notes
  privacy/page.tsx  # Política de privacidade
  terms/page.tsx    # Termos de uso
  components/       # Navbar, Footer, BackgroundPattern
  contexts/         # ThemeContext
  config/           # URLs
```
