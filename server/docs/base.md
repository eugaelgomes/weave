# Documentação Técnica - Server

## Visão Geral

Esta documentação descreve a estrutura e funcionamento dos principais módulos da aplicação servidor, incluindo pontos de entrada, configurações e serviços essenciais.

---

## 1. Pontos de Entrada

### 1.1 index.js

**Localização:** `src/index.js`

**Descrição:**  
Arquivo principal de inicialização do servidor. Responsável por iniciar a aplicação Express na porta configurada.

**Funcionalidades:**
- Registra aliases de módulos para importações simplificadas
- Lê a porta do servidor das variáveis de ambiente (`APP_PORT`)
- Valida a porta configurada
- Inicia o servidor HTTP na interface `0.0.0.0`
- Trata erros de inicialização

**Variáveis de Ambiente:**
- `APP_PORT`: Porta do servidor (padrão: 8080)

**Exemplo de Uso:**
```javascript
// Inicia automaticamente ao executar
node src/index.js
```

---

### 1.2 app.js

**Localização:** `src/app.js`

**Descrição:**  
Configura e exporta a instância principal do Express. Define middlewares globais, rotas e tratamento de erros.

**Estrutura:**
1. **Middlewares Globais**: Configurações de CORS, parsers, segurança
2. **Rotas da API**: Todas as rotas são prefixadas com `/api`
3. **Tratamento de Erros**: 
   - Handler para rotas não encontradas (404)
   - Handler global de erros

**Middlewares Aplicados:**
- Configurações globais (CORS, body-parser, helmet, etc.)
- Router de rotas `/api`
- Handler de rotas não encontradas
- Handler global de erros

**Exportação:**
```javascript
module.exports = { app };
```

---

## 2. Configurações

### 2.1 module-alias.ts

**Localização:** `src/config/module-alias.ts`

**Descrição:**  
Configura aliases de importação para simplificar referências de módulos no projeto.

**Alias Configurado:**
- `@`: Aponta para o diretório raiz `src/`

**Benefício:**  
Permite importações limpas e consistentes:
```javascript
// Ao invés de:
require('../../../services/db/connection');

// Usa-se:
require('@/services/db/connection');
```

**Execução:**  
Importado automaticamente via `module-alias/register` no `index.js`.

---

## 3. Serviços

### 3.1 Database Connection

**Localização:** `src/services/db/db-connection.js`

**Descrição:**  
Gerencia conexões com banco de dados PostgreSQL usando pool de conexões.

**Configuração:**  
Utiliza as seguintes variáveis de ambiente:
- `DATABASE_HOST_URL`: Host do banco de dados
- `DATABASE_SERVICE_PORT`: Porta do PostgreSQL
- `DATABASE_USERNAME`: Usuário do banco
- `DATABASE_PASSWORD`: Senha do banco
- `DATABASE_NAME`: Nome do banco de dados
- `SSL_CERTIFICATE`: Certificado SSL (opcional)

**Métodos Exportados:**

#### `pool`
Pool de conexões PostgreSQL configurado.

#### `getConnection()`
Obtém uma conexão do pool.

**Retorno:** `Promise<Client>`

**Exemplo:**
```javascript
const client = await getConnection();
```

#### `executeQuery(sql, params)`
Executa uma query SQL e retorna as linhas resultantes.

**Parâmetros:**
- `sql` (string): Query SQL
- `params` (array): Parâmetros da query (padrão: [])

**Retorno:** `Promise<Array>`

**Exemplo:**
```javascript
const users = await executeQuery('SELECT * FROM users WHERE id = $1', [userId]);
```

#### `rowCount(sql, params)`
Executa uma query e retorna o número de linhas afetadas.

**Parâmetros:**
- `sql` (string): Query SQL
- `params` (array): Parâmetros da query (padrão: [])

**Retorno:** `Promise<number>`

**Exemplo:**
```javascript
const affected = await rowCount('DELETE FROM sessions WHERE user_id = $1', [userId]);
```

**Características:**
- Pool de conexões para melhor performance
- SSL habilitado por padrão
- Libera conexões automaticamente após uso
- Tratamento de erros integrado

---

### 3.2 Email Service

**Localização:** `src/services/email/config/mail-service.js`

**Descrição:**  
Configura e exporta transporter Nodemailer para envio de emails via SMTP.

**Configuração:**  
Utiliza as seguintes variáveis de ambiente:
- `EMAIL_HOST`: Host do servidor SMTP
- `EMAIL_PORT`: Porta do servidor SMTP
- `EMAIL_USERNAME`: Usuário de autenticação
- `EMAIL_PASSWORD`: Senha de autenticação

**Função Exportada:**

#### `MailService()`
Cria e retorna um transporter Nodemailer configurado.

**Retorno:** `Transporter`

**Configurações:**
- Conexão segura (secure: true)
- Autenticação SMTP

**Exemplo de Uso:**
```javascript
const { MailService } = require('@/services/email/config/mail-service');

const transporter = MailService();
await transporter.sendMail({
  from: process.env.EMAIL_USERNAME,
  to: 'user@example.com',
  subject: 'Assunto',
  html: '<p>Conteúdo do email</p>'
});
```

**Templates Disponíveis:**
- Recuperação de senha
- Notificação de backup
- Backup pronto
- Exclusão de conta
- Adição a nota compartilhada
- Notificação de colaboração
- Boas-vindas

---

### 3.3 Job Manager

**Localização:** `src/services/jobs/job-manager.js`

**Descrição:**  
Gerenciador de jobs assíncronos com persistência em arquivo e recuperação após reinicialização.

**Características:**
- Armazenamento em memória para acesso rápido
- Persistência em arquivos JSON
- Recuperação automática de jobs após restart
- Cleanup automático de jobs antigos
- Singleton pattern

**Diretório de Armazenamento:**  
`temp/jobs/`

**Estados de Job:**
- `pending`: Aguardando processamento
- `processing`: Em execução
- `completed`: Finalizado com sucesso
- `failed`: Falhou durante execução

**Métodos Principais:**

#### `createJob(jobId, type, userId, metadata)`
Cria um novo job.

**Parâmetros:**
- `jobId` (string): ID único do job
- `type` (string): Tipo do job (ex: 'backup_export')
- `userId` (string): ID do usuário
- `metadata` (object): Metadados adicionais (opcional)

**Retorno:** `Promise<Object>`

#### `updateJob(jobId, updates)`
Atualiza o status e informações de um job.

**Parâmetros:**
- `jobId` (string): ID do job
- `updates` (object): Objeto com atualizações

**Retorno:** `Promise<Object>`

#### `getJob(jobId)`
Busca um job pelo ID.

**Retorno:** `Object|null`

#### `getUserJobs(userId)`
Lista todos os jobs de um usuário.

**Retorno:** `Array`

#### `deleteJob(jobId)`
Remove job da memória e arquivo.

**Retorno:** `Promise<void>`

#### `generateJobId(prefix)`
Gera ID único para job.

**Parâmetros:**
- `prefix` (string): Prefixo do ID (padrão: 'job')

**Retorno:** `string`

**Exemplo de Uso:**
```javascript
const jobManager = require('@/services/jobs/job-manager');

// Criar job
const jobId = jobManager.generateJobId('backup');
const job = await jobManager.createJob(jobId, 'backup_export', userId);

// Atualizar progresso
await jobManager.updateJob(jobId, { 
  status: 'processing', 
  progress: 50 
});

// Finalizar job
await jobManager.updateJob(jobId, { 
  status: 'completed', 
  result: { fileUrl: '...' } 
});
```

**Cleanup Automático:**
- Executa a cada 6 horas
- Remove jobs finalizados há mais de 24 horas

---

### 3.4 Spaces Service (Storage)

**Localização:** `src/services/storage/spaces-service.js`

**Descrição:**  
Serviço para gerenciamento de arquivos no Digital Ocean Spaces (compatível com S3).

**Configuração:**  
Utiliza as seguintes variáveis de ambiente:
- `DO_SPACES_ENDPOINT`: Endpoint do Spaces
- `DO_SPACES_ACCESS_KEY`: Chave de acesso
- `DO_SPACES_SECRET_KEY`: Chave secreta
- `DO_SPACES_BUCKET_NAME`: Nome do bucket
- `DO_SPACES_REGION`: Região (padrão: 'nyc3')

**Características:**
- Upload de imagens com URLs públicas
- Geração de URLs assinadas para acesso privado
- Deleção de arquivos
- Cache de 1 ano para otimização
- Nomes de arquivos únicos (UUID)

**Métodos Principais:**

#### `uploadImage(imageBuffer, mimeType, folder, fileName)`
Faz upload de imagem para o Spaces.

**Parâmetros:**
- `imageBuffer` (Buffer): Buffer da imagem
- `mimeType` (string): Tipo MIME (ex: 'image/jpeg')
- `folder` (string): Pasta de destino (padrão: 'images')
- `fileName` (string): Nome personalizado (opcional)

**Retorno:** `Promise<Object>`
```javascript
{
  success: true,
  url: 'https://...',
  key: 'folder/filename.jpg',
  fileName: 'filename.jpg',
  size: 12345
}
```

#### `deleteImage(key)`
Deleta uma imagem do Spaces.

**Parâmetros:**
- `key` (string): Chave do arquivo

**Retorno:** `Promise<boolean>`

#### `getSignedUrl(key, expiresIn)`
Gera URL assinada temporária para acesso privado.

**Parâmetros:**
- `key` (string): Chave do arquivo
- `expiresIn` (number): Tempo de expiração em segundos (padrão: 3600)

**Retorno:** `Promise<string>`

#### `extractKeyFromUrl(url)`
Extrai a key do arquivo a partir da URL completa.

**Parâmetros:**
- `url` (string): URL completa

**Retorno:** `string|null`

#### `validateConfiguration()`
Valida se todas as configurações necessárias estão presentes.

**Retorno:** `Object`
```javascript
{
  isValid: true,
  config: { endpoint: true, accessKey: true, ... },
  missing: []
}
```

**Formatos Suportados:**
- JPEG/JPG
- PNG
- WebP
- GIF

**Exemplo de Uso:**
```javascript
const spacesService = require('@/services/storage/spaces-service');

// Upload
const result = await spacesService.uploadImage(
  imageBuffer, 
  'image/jpeg', 
  'profile-images'
);

// Deletar
await spacesService.deleteImage(result.key);

// URL assinada
const signedUrl = await spacesService.getSignedUrl(result.key, 7200);
```

**Segurança:**
- ACL público para imagens de perfil
- URLs assinadas para conteúdo privado
- Validação de credenciais na inicialização

---

## 4. Boas Práticas

### 4.1 Importações
Sempre utilize o alias `@` para importações:
```javascript
const { executeQuery } = require('@/services/db/db-connection');
```

### 4.2 Tratamento de Erros
Todos os serviços implementam tratamento de erros. Sempre use try-catch:
```javascript
try {
  const result = await executeQuery(sql, params);
} catch (error) {
  console.error('Erro ao executar query:', error);
  throw error;
}
```

### 4.3 Variáveis de Ambiente
Todas as configurações sensíveis devem estar em `.env`. Consulte `.env.example` para referência.

### 4.4 Conexões de Banco
Sempre libere conexões após uso. Os métodos `executeQuery` e `rowCount` fazem isso automaticamente.

---

## 5. Dependências Principais

- **express**: Framework web
- **pg**: Cliente PostgreSQL
- **nodemailer**: Envio de emails
- **@aws-sdk/client-s3**: Cliente S3 para Digital Ocean Spaces
- **module-alias**: Aliases de importação
- **dotenv**: Gerenciamento de variáveis de ambiente

---

## 6. Estrutura de Diretórios

```
src/
├── index.js              # Ponto de entrada
├── app.js                # Configuração Express
├── config/               # Configurações
│   └── module-alias.ts   # Aliases de importação
└── services/             # Serviços
    ├── db/               # Banco de dados
    ├── email/            # Email
    ├── jobs/             # Gerenciamento de jobs
    └── storage/          # Armazenamento de arquivos
```

---

*Documentação atualizada em: Novembro de 2025*
