import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de uso do Weave Notes.",
};

export default function TermsPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <h1 className="mb-8 text-3xl font-bold tracking-tight sm:text-4xl">
          Termos de Uso
        </h1>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          Última atualização: 7 de março de 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-600 sm:text-base dark:text-neutral-400">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              1. Aceitação dos Termos
            </h2>
            <p>
              Ao acessar ou utilizar o Weave Notes (&quot;Plataforma&quot;), operado por
              Weave Notes (&quot;nós&quot;, &quot;nosso&quot;), você concorda integralmente com estes
              Termos de Uso. Caso não concorde com qualquer disposição, você não
              deve utilizar a Plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              2. Descrição do Serviço
            </h2>
            <p>
              O Weave Notes é uma plataforma de anotações e organização pessoal
              que permite criar, editar, organizar e compartilhar notas. A
              Plataforma pode incluir integrações com serviços de terceiros,
              como Google Calendar, armazenamento em nuvem e recursos de
              inteligência artificial.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              3. Cadastro e Conta
            </h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                Você deve fornecer informações verdadeiras, completas e
                atualizadas ao criar sua conta.
              </li>
              <li>
                Você é responsável por manter a confidencialidade de suas
                credenciais de acesso.
              </li>
              <li>
                Qualquer atividade realizada em sua conta é de sua
                responsabilidade.
              </li>
              <li>
                Você deve ter pelo menos 16 anos de idade para utilizar a
                Plataforma.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              4. Uso Aceitável
            </h2>
            <p className="mb-3">Ao utilizar a Plataforma, você se compromete a não:</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>Violar qualquer lei ou regulamento aplicável.</li>
              <li>
                Publicar conteúdo ilegal, ofensivo, difamatório ou que infrinja
                direitos de terceiros.
              </li>
              <li>
                Tentar acessar, sem autorização, sistemas, dados ou contas de
                outros usuários.
              </li>
              <li>
                Utilizar a Plataforma para enviar spam, malware ou qualquer
                conteúdo malicioso.
              </li>
              <li>
                Realizar engenharia reversa, descompilar ou interferir no
                funcionamento da Plataforma.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              5. Propriedade Intelectual
            </h2>
            <p>
              Todo o conteúdo que você cria na Plataforma permanece de sua
              propriedade. Ao utilizar o Weave Notes, você nos concede uma
              licença limitada, não exclusiva e revogável para armazenar,
              processar e exibir seu conteúdo exclusivamente para a prestação
              dos serviços. Não utilizamos seu conteúdo para qualquer outra
              finalidade sem seu consentimento expresso.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              6. Integrações com Terceiros
            </h2>
            <p>
              A Plataforma pode se integrar com serviços de terceiros, como
              Google Calendar e provedores de autenticação OAuth. Ao autorizar
              essas integrações, você concorda com os termos de uso e políticas
              de privacidade dos respectivos serviços. Nós acessamos apenas os
              dados estritamente necessários para o funcionamento das
              integrações e você pode revogar o acesso a qualquer momento nas
              configurações da sua conta.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              7. Disponibilidade e Modificações
            </h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                Nos esforçamos para manter a Plataforma disponível
                continuamente, mas não garantimos disponibilidade ininterrupta.
              </li>
              <li>
                Reservamo-nos o direito de modificar, suspender ou descontinuar
                funcionalidades a qualquer momento, com aviso prévio razoável
                quando possível.
              </li>
              <li>
                Alterações significativas nestes Termos serão comunicadas por
                e-mail ou por notificação na Plataforma.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              8. Limitação de Responsabilidade
            </h2>
            <p>
              A Plataforma é fornecida &quot;como está&quot;. Na máxima extensão permitida
              pela legislação aplicável, não nos responsabilizamos por danos
              indiretos, incidentais, consequenciais ou punitivos resultantes do
              uso ou impossibilidade de uso da Plataforma, incluindo perda de
              dados.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              9. Encerramento de Conta
            </h2>
            <p>
              Você pode encerrar sua conta a qualquer momento nas configurações
              do seu perfil. Podemos suspender ou encerrar contas que violem
              estes Termos, mediante notificação prévia quando possível. Após o
              encerramento, seus dados serão tratados conforme nossa Política de
              Privacidade.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              10. Legislação Aplicável
            </h2>
            <p>
              Estes Termos são regidos pela legislação da República Federativa do
              Brasil, incluindo o Marco Civil da Internet (Lei nº 12.965/2014),
              a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD) e o
              Código de Defesa do Consumidor (Lei nº 8.078/1990), quando
              aplicável. O foro competente é o da comarca do domicílio do
              usuário, conforme previsto em lei.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              11. Contato
            </h2>
            <p>
              Para dúvidas, solicitações ou reclamações sobre estes Termos, entre
              em contato conosco:
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

      <Footer />
    </div>
  );
}
