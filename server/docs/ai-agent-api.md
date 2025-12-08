# AI Agent API - Exemplos de Requisições

## Autenticação

Todas as requisições precisam incluir o token JWT no header:

```
Authorization: Bearer SEU_TOKEN_JWT_AQUI
```

---

## 1. Gerar Conteúdo Genérico

**Endpoint:** `POST /api/ai/generate`

### Exemplo 1: Gerar conteúdo para nota

```json
{
  "useCase": "note_generation",
  "prompt": "Preciso criar uma nota sobre boas práticas de Git para iniciantes",
  "context": {},
  "provider": "gemini"
}
```

### Exemplo 2: Quebrar tarefa em subtarefas

```json
{
  "useCase": "task_breakdown",
  "prompt": "Criar um sistema de autenticação completo para uma API REST",
  "context": {}
}
```

### Exemplo 3: Melhorar conteúdo

```json
{
  "useCase": "content_enhancement",
  "prompt": "melhore este texto: hoje fiz reuniao com cliente ele quer adicionar dark mode e login social no app",
  "context": {}
}

```

### Exemplo 4: Sugerir tags

```json
{
  "useCase": "tag_suggestion",
  "prompt": "Nota sobre implementação de autenticação JWT em Node.js usando Express e bcrypt para hash de senhas",
  "context": {}
}
```

### Exemplo 5: Analisar prioridades

```json
{
  "useCase": "priority_analysis",
  "prompt": "Tenho estas tarefas: implementar dark mode, corrigir bug crítico no login, adicionar testes unitários, atualizar documentação, otimizar queries do banco",
  "context": {}
}
```

### Resposta esperada:

```json
{
  "success": true,
  "useCase": "note_generation",
  "provider": "gemini",
  "response": "# Boas Práticas de Git para Iniciantes\n\n## 1. Commits Frequentes e Descritivos...",
  "citations": null,
  "timestamp": "2025-12-08T10:30:00.000Z"
}
```

---

## 2. Analisar Nota

**Endpoint:** `POST /api/ai/analyze-note`

### Exemplo 1: Análise geral

```json
{
  "noteId": "123e4567-e89b-12d3-a456-426614174000",
  "analysisType": "general"
}
```

### Exemplo 2: Resumir nota

```json
{
  "noteId": "123e4567-e89b-12d3-a456-426614174000",
  "analysisType": "summarize"
}
```

### Exemplo 3: Melhorar nota

```json
{
  "noteId": "123e4567-e89b-12d3-a456-426614174000",
  "analysisType": "improve"
}
```

### Exemplo 4: Sugerir tags

```json
{
  "noteId": "123e4567-e89b-12d3-a456-426614174000",
  "analysisType": "tags"
}
```

### Resposta esperada:

```json
{
  "success": true,
  "useCase": "note_summarization",
  "provider": "gemini",
  "response": "## Resumo da Nota\n\n**Pontos principais:**\n- ...",
  "citations": null,
  "timestamp": "2025-12-08T10:30:00.000Z"
}
```

---

## 3. Analisar Projeto

**Endpoint:** `POST /api/ai/analyze-project`

### Exemplo 1: Análise geral

```json
{
  "projectId": "456e7890-e89b-12d3-a456-426614174000",
  "analysisType": "general"
}
```

### Exemplo 2: Analisar progresso

```json
{
  "projectId": "456e7890-e89b-12d3-a456-426614174000",
  "analysisType": "progress"
}
```

### Exemplo 3: Sugerir próximos passos

```json
{
  "projectId": "456e7890-e89b-12d3-a456-426614174000",
  "analysisType": "next_steps"
}
```

### Resposta esperada:

```json
{
  "success": true,
  "useCase": "priority_analysis",
  "provider": "gemini",
  "response": "## Análise do Projeto\n\n**Status atual:** ...",
  "citations": null,
  "timestamp": "2025-12-08T10:30:00.000Z"
}
```

---

## 4. Pesquisar (Perplexity)

**Endpoint:** `POST /api/ai/research`

### Exemplo 1: Pesquisa recente

```json
{
  "query": "Quais são as melhores práticas para implementar autenticação em 2025?",
  "recencyFilter": "month"
}
```

### Exemplo 2: Pesquisa semanal

```json
{
  "query": "Tendências de design de UI/UX em aplicações web",
  "recencyFilter": "week"
}
```

### Filtros de recência disponíveis:
- `day` - Última 24 horas
- `week` - Última semana
- `month` - Último mês (padrão)
- `year` - Último ano

### Resposta esperada:

```json
{
  "success": true,
  "useCase": "research_assistant",
  "provider": "perplexity",
  "response": "Com base nas fontes mais recentes...",
  "citations": [
    "https://example.com/article1",
    "https://example.com/article2"
  ],
  "timestamp": "2025-12-08T10:30:00.000Z"
}
```

---

## 5. Listar Casos de Uso

**Endpoint:** `GET /api/ai/use-cases`

### Requisição:

```
GET /api/ai/use-cases
Authorization: Bearer SEU_TOKEN_JWT_AQUI
```

### Resposta:

```json
{
  "success": true,
  "useCases": {
    "gemini": [
      "note_generation",
      "note_summarization",
      "task_breakdown",
      "content_enhancement",
      "template_generation",
      "tag_suggestion",
      "priority_analysis"
    ],
    "perplexity": [
      "research_assistant",
      "link_summarization",
      "trend_analysis",
      "competitive_research",
      "fact_checking",
      "source_gathering"
    ]
  }
}
```

---

## Casos de Uso Disponíveis

### Gemini (Criação de Conteúdo)

1. **`note_generation`** - Gerar conteúdo estruturado para notas
2. **`note_summarization`** - Resumir notas longas
3. **`task_breakdown`** - Quebrar tarefas complexas em subtarefas
4. **`content_enhancement`** - Melhorar escrita e estrutura
5. **`template_generation`** - Criar templates reutilizáveis
6. **`tag_suggestion`** - Sugerir tags para organização
7. **`priority_analysis`** - Analisar e sugerir prioridades

### Perplexity (Pesquisa e Informação)

1. **`research_assistant`** - Pesquisar informações atualizadas
2. **`link_summarization`** - Resumir artigos/links
3. **`trend_analysis`** - Analisar tendências
4. **`competitive_research`** - Pesquisa competitiva
5. **`fact_checking`** - Verificar informações
6. **`source_gathering`** - Coletar fontes confiáveis

---

## Exemplos com cURL

### Gerar conteúdo:

```bash
curl -X POST http://localhost:8080/api/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "useCase": "note_generation",
    "prompt": "Criar uma nota sobre Git para iniciantes"
  }'
```

### Analisar nota:

```bash
curl -X POST http://localhost:8080/api/ai/analyze-note \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "noteId": "123e4567-e89b-12d3-a456-426614174000",
    "analysisType": "summarize"
  }'
```

### Pesquisar:

```bash
curl -X POST http://localhost:8080/api/ai/research \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "query": "Melhores práticas de segurança em APIs REST",
    "recencyFilter": "month"
  }'
```

---

## Erros Comuns

### 400 - Bad Request
```json
{
  "error": "Parâmetros obrigatórios: prompt, useCase"
}
```

### 401 - Unauthorized
```json
{
  "error": "No authorization token was found"
}
```

### 403 - Forbidden
```json
{
  "error": "Sem permissão para acessar esta nota"
}
```

### 404 - Not Found
```json
{
  "error": "Nota não encontrada"
}
```

### 500 - Internal Server Error
```json
{
  "error": "Erro ao processar requisição de IA",
  "message": "Gemini API não está configurada. Verifique GEMINI_API_KEY"
}
```

---

## Cache

O sistema implementa cache automático de respostas:

- **TTL:** 1 hora
- **Tamanho máximo:** 100 respostas
- **Chave de cache:** Hash do provider + prompt + contexto

Respostas em cache incluem o campo `cached: true`.

---

## Configuração de Variáveis de Ambiente

Adicione no arquivo `.env`:

```env
# Gemini API
GEMINI_API_KEY=sua_chave_gemini_aqui

# Perplexity API
PERPLEXITY_API_KEY=sua_chave_perplexity_aqui
```
