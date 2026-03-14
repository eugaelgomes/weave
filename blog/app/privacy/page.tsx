import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Política de privacidade do Weave Notes.",
};

const sections = [
  { title: "1. Controlador dos Dados", id: "controlador" },
  { title: "2. Dados Pessoais Coletados", id: "dados-coletados" },
  { title: "3. Finalidades do Tratamento", id: "finalidades" },
  { title: "4. Bases Legais", id: "bases-legais" },
  { title: "5. Uso de Dados do Google", id: "dados-google" },
  { title: "6. Compartilhamento de Dados", id: "compartilhamento" },
  { title: "7. Armazenamento e Segurança", id: "seguranca" },
  { title: "8. Retenção de Dados", id: "retencao" },
  { title: "9. Seus Direitos", id: "direitos" },
  { title: "10. Cookies", id: "cookies" },
  { title: "11. Transferência Internacional", id: "transferencia" },
  { title: "12. Alterações nesta Política", id: "alteracoes" },
  { title: "13. Contato", id: "contato" },
];

export default function PrivacyPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <Navbar />

      <div className="mx-auto flex w-full max-w-7xl flex-1 items-start gap-12 px-6 pt-24 pb-12">
        <Sidebar sections={sections} />

        <main className="relative z-10 w-full max-w-3xl flex-1">
          <h1 className="mb-8 text-3xl font-bold tracking-tight sm:text-4xl">
            Política de Privacidade
          </h1>
          <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
            Última atualização: 7 de março de 2026
          </p>

          <div className="space-y-8 text-sm leading-relaxed text-neutral-600 sm:text-base dark:text-neutral-400">
            <section>
              <p>
                Esta Política de Privacidade descreve como o Weave Notes
                (&quot;Plataforma&quot;, &quot;nós&quot;, &quot;nosso&quot;) coleta, utiliza, armazena e protege
                seus dados pessoais, em conformidade com a Lei Geral de Proteção
                de Dados (Lei nº 13.709/2018 — LGPD) e demais legislações
                aplicáveis.
              </p>
            </section>

            <section id="controlador">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                1. Controlador dos Dados
              </h2>
              <p>
                O controlador responsável pelo tratamento dos seus dados pessoais é
                o Weave Notes. Para exercer seus direitos ou esclarecer dúvidas
                sobre o tratamento dos dados, entre em contato pelo e-mail:{" "}
                <a
                  href="mailto:us@weavenotes.app"
                  className="text-blue-600 underline hover:text-blue-500 dark:text-blue-400"
                >
                  us@weavenotes.app
                </a>
              </p>
            </section>

            <section id="dados-coletados">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                2. Dados Pessoais Coletados
              </h2>
              <p className="mb-3">Coletamos os seguintes dados pessoais:</p>
              <ul className="ml-4 list-disc space-y-2">
                <li>
                  <strong className="text-neutral-900 dark:text-neutral-50">
                    Dados de cadastro:
                  </strong>{" "}
                  nome, endereço de e-mail, senha (armazenada de forma
                  criptografada) e foto de perfil (opcional).
                </li>
                <li>
                  <strong className="text-neutral-900 dark:text-neutral-50">
                    Dados de uso:
                  </strong>{" "}
                  notas, projetos, tags e conteúdos criados por você na
                  Plataforma.
                </li>
                <li>
                  <strong className="text-neutral-900 dark:text-neutral-50">
                    Dados técnicos:
                  </strong>{" "}
                  endereço IP, tipo de navegador, sistema operacional, páginas
                  acessadas e data/hora de acesso.
                </li>
                <li>
                  <strong className="text-neutral-900 dark:text-neutral-50">
                    Dados de integrações:
                  </strong>{" "}
                  ao conectar serviços de terceiros (como Google Calendar),
                  coletamos tokens de autenticação (OAuth) e dados de calendário
                  necessários para o funcionamento da integração.
                </li>
              </ul>
            </section>

            <section id="finalidades">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                3. Finalidades do Tratamento
              </h2>
              <p className="mb-3">
                Seus dados pessoais são tratados para as seguintes finalidades:
              </p>
              <ul className="ml-4 list-disc space-y-2">
                <li>Criar e gerenciar sua conta na Plataforma.</li>
                <li>
                  Prestar os serviços de criação, edição, organização e
                  compartilhamento de notas.
                </li>
                <li>
                  Viabilizar integrações com serviços de terceiros autorizados por
                  você.
                </li>
                <li>
                  Enviar comunicações relacionadas ao serviço, como notificações
                  de segurança, atualizações e convites de colaboração.
                </li>
                <li>
                  Melhorar e personalizar a experiência de uso da Plataforma.
                </li>
                <li>Cumprir obrigações legais e regulatórias.</li>
              </ul>
            </section>

            <section id="bases-legais">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                4. Bases Legais (LGPD, Art. 7º)
              </h2>
              <p className="mb-3">
                O tratamento dos seus dados pessoais é fundamentado nas seguintes
                bases legais:
              </p>
              <ul className="ml-4 list-disc space-y-2">
                <li>
                  <strong className="text-neutral-900 dark:text-neutral-50">
                    Execução de contrato:
                  </strong>{" "}
                  para a prestação dos serviços da Plataforma (Art. 7º, V).
                </li>
                <li>
                  <strong className="text-neutral-900 dark:text-neutral-50">
                    Consentimento:
                  </strong>{" "}
                  para integrações com serviços de terceiros e funcionalidades
                  opcionais (Art. 7º, I).
                </li>
                <li>
                  <strong className="text-neutral-900 dark:text-neutral-50">
                    Legítimo interesse:
                  </strong>{" "}
                  para melhoria dos serviços e segurança da Plataforma (Art. 7º,
                  IX).
                </li>
                <li>
                  <strong className="text-neutral-900 dark:text-neutral-50">
                    Cumprimento de obrigação legal:
                  </strong>{" "}
                  quando exigido pela legislação aplicável (Art. 7º, II).
                </li>
              </ul>
            </section>

            <section id="dados-google">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                5. Uso de Dados do Google
              </h2>
              <p className="mb-3">
                Quando você conecta sua conta Google ao Weave Notes, respeitamos
                as seguintes diretrizes:
              </p>
              <ul className="ml-4 list-disc space-y-2">
                <li>
                  Acessamos apenas os dados de calendário explicitamente
                  autorizados por você durante o fluxo de consentimento OAuth.
                </li>
                <li>
                  Os dados do Google são utilizados exclusivamente para exibir e
                  sincronizar eventos de calendário dentro da Plataforma.
                </li>
                <li>
                  Não compartilhamos, vendemos ou transferimos dados do Google
                  para terceiros.
                </li>
                <li>
                  Não utilizamos dados do Google para exibição de anúncios,
                  criação de perfis publicitários ou qualquer finalidade não
                  relacionada ao serviço.
                </li>
                <li>
                  Você pode revogar o acesso à sua conta Google a qualquer momento
                  nas configurações da Plataforma ou diretamente em{" "}
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-500 dark:text-blue-400"
                  >
                    myaccount.google.com/permissions
                  </a>
                  .
                </li>
              </ul>
            </section>

            <section id="compartilhamento">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                6. Compartilhamento de Dados
              </h2>
              <p className="mb-3">
                Seus dados pessoais podem ser compartilhados apenas nas seguintes
                situações:
              </p>
              <ul className="ml-4 list-disc space-y-2">
                <li>
                  <strong className="text-neutral-900 dark:text-neutral-50">
                    Prestadores de serviço:
                  </strong>{" "}
                  provedores de infraestrutura (hospedagem, banco de dados,
                  armazenamento) que atuam como operadores sob nossas instruções.
                </li>
                <li>
                  <strong className="text-neutral-900 dark:text-neutral-50">
                    Colaboração:
                  </strong>{" "}
                  quando você compartilha notas com outros usuários, os dados
                  necessários para a colaboração são disponibilizados a eles.
                </li>
                <li>
                  <strong className="text-neutral-900 dark:text-neutral-50">
                    Obrigação legal:
                  </strong>{" "}
                  quando exigido por lei, ordem judicial ou autoridade competente.
                </li>
              </ul>
              <p className="mt-3">
                Não vendemos, alugamos ou comercializamos seus dados pessoais.
              </p>
            </section>

            <section id="seguranca">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                7. Armazenamento e Segurança
              </h2>
              <ul className="ml-4 list-disc space-y-2">
                <li>
                  Seus dados são armazenados em servidores seguros com
                  criptografia em trânsito (TLS/HTTPS) e em repouso.
                </li>
                <li>
                  Senhas são armazenadas com hash criptográfico (bcrypt) e nunca
                  em texto plano.
                </li>
                <li>
                  Tokens de autenticação de terceiros (OAuth) são armazenados de
                  forma segura no banco de dados.
                </li>
                <li>
                  Utilizamos cookies HttpOnly e Secure para gerenciar sessões de
                  forma segura.
                </li>
                <li>
                  Implementamos medidas técnicas e organizacionais para proteger
                  seus dados contra acesso não autorizado, perda ou alteração.
                </li>
              </ul>
            </section>

            <section id="retencao">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                8. Retenção de Dados
              </h2>
              <p>
                Seus dados pessoais são mantidos enquanto sua conta estiver ativa
                ou conforme necessário para cumprir as finalidades descritas nesta
                Política. Após a exclusão da conta, seus dados serão removidos em
                até 30 dias, salvo quando houver obrigação legal de retenção.
              </p>
            </section>

            <section id="direitos">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                9. Seus Direitos (LGPD, Art. 18)
              </h2>
              <p className="mb-3">
                Conforme a LGPD, você tem os seguintes direitos sobre seus dados
                pessoais:
              </p>
              <ul className="ml-4 list-disc space-y-2">
                <li>Confirmação da existência de tratamento de dados.</li>
                <li>Acesso aos seus dados pessoais.</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
                <li>
                  Anonimização, bloqueio ou eliminação de dados desnecessários ou
                  tratados em desconformidade com a LGPD.
                </li>
                <li>
                  Portabilidade dos dados a outro fornecedor de serviço, mediante
                  requisição expressa.
                </li>
                <li>
                  Eliminação dos dados tratados com base em consentimento.
                </li>
                <li>
                  Informação sobre compartilhamento de dados com entidades
                  públicas e privadas.
                </li>
                <li>
                  Revogação do consentimento a qualquer momento.
                </li>
              </ul>
              <p className="mt-3">
                Para exercer qualquer desses direitos, envie um e-mail para{" "}
                <a
                  href="mailto:us@weavenotes.app"
                  className="text-blue-600 underline hover:text-blue-500 dark:text-blue-400"
                >
                  us@weavenotes.app
                </a>
                . Responderemos à sua solicitação em até 15 dias úteis.
              </p>
            </section>

            <section id="cookies">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                10. Cookies
              </h2>
              <p>
                Utilizamos cookies essenciais para o funcionamento da Plataforma,
                como autenticação e preferências de sessão. Não utilizamos cookies
                de rastreamento publicitário. Para mais detalhes, consulte as
                configurações do seu navegador.
              </p>
            </section>

            <section id="transferencia">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                11. Transferência Internacional de Dados
              </h2>
              <p>
                Seus dados podem ser armazenados e processados em servidores
                localizados fora do Brasil. Nestes casos, adotamos as medidas
                necessárias para garantir um nível adequado de proteção, conforme
                previsto na LGPD (Art. 33).
              </p>
            </section>

            <section id="alteracoes">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                12. Alterações nesta Política
              </h2>
              <p>
                Podemos atualizar esta Política de Privacidade periodicamente.
                Alterações significativas serão comunicadas por e-mail ou por
                notificação na Plataforma. A continuidade do uso após as
                alterações constitui aceitação da nova Política.
              </p>
            </section>

            <section id="contato">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                13. Contato
              </h2>
              <p>
                Para dúvidas, solicitações ou reclamações sobre o tratamento dos
                seus dados pessoais, entre em contato conosco:
              </p>
              <p className="mt-2">
                <strong className="text-neutral-900 dark:text-neutral-50">E-mail:</strong>{" "}
                <a
                  href="mailto:us@weavenotes.app"
                  className="text-blue-600 underline hover:text-blue-500 dark:text-blue-400"
                >
                  us@weavenotes.app
                </a>
              </p>
            </section>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
