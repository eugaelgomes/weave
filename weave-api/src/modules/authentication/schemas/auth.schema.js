const { z } = require("zod");

// Signin

const signinSchema = z
  .object({
    login: z
      .string({ required_error: "Username or email is required." })
      .min(3, "Invalid username or email length.")
      .max(255, "Invalid username or email length.")
      .trim()
      .describe(
        "O nome de usuário ou endereço de e-mail utilizado para autenticação."
      ),
    password: z
      .string({ required_error: "Password is required." })
      .min(1, "Password is required.")
      .max(255, "Invalid password length.")
      .describe("A senha do usuário para realizar o login."),
    verify_only: z
      .boolean()
      .optional()
      .describe(
        "Sinalizador opcional que, se verdadeiro, apenas verifica as credenciais sem iniciar uma nova sessão."
      ),
  })
  .strict("Invalid signin payload structure.");

// OAuth callback

const oauthCallbackSchema = z.object({
  code: z
    .string()
    .min(8, "Invalid authorization code length.")
    .max(2048, "Invalid authorization code length.")
    .regex(/^[A-Za-z0-9._\-~/+=:]+$/, "Invalid authorization code characters.")
    .trim()
    .optional()
    .describe(
      "O código de autorização retornado pelo provedor OAuth após a autenticação bem-sucedida do usuário."
    ),
  error: z
    .string()
    .min(1, "Invalid OAuth error length.")
    .max(100, "Invalid OAuth error length.")
    .trim()
    .optional()
    .describe(
      "A mensagem de erro retornada pelo provedor OAuth em caso de falha na autorização."
    ),
  state: z
    .string({ required_error: "OAuth state is required." })
    .min(8, "Invalid OAuth state length.")
    .max(255, "Invalid OAuth state length.")
    .regex(/^[A-Za-z0-9._\-]+$/, "Invalid OAuth state characters.")
    .trim()
    .describe(
      "O valor de estado enviado na solicitação OAuth original para prevenir ataques de falsificação de solicitações entre sites."
    ),
});

module.exports = { oauthCallbackSchema, signinSchema };
