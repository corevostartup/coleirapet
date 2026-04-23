type LegalDocType = "privacy" | "terms";

export function LegalContent({ type }: { type: LegalDocType }) {
  if (type === "privacy") {
    return (
      <div className="space-y-3 text-[12px] leading-relaxed text-zinc-700">
        <p>
          Esta Politica de Privacidade descreve como a ColeiraPet coleta, usa e protege os dados pessoais e dados de uso
          relacionados ao aplicativo e aos dispositivos conectados.
        </p>
        <section>
          <h3 className="text-[13px] font-semibold text-zinc-900">1. Dados coletados</h3>
          <p className="mt-1">
            Podemos coletar dados de conta (nome, email), dados do pet, dados de localizacao, registros de saude e
            informacoes tecnicas de uso para funcionamento e seguranca da plataforma.
          </p>
        </section>
        <section>
          <h3 className="text-[13px] font-semibold text-zinc-900">2. Uso das informacoes</h3>
          <p className="mt-1">
            As informacoes sao usadas para monitoramento, notificacoes, historico clinico, autenticacao e melhorias de
            qualidade do servico.
          </p>
        </section>
        <section>
          <h3 className="text-[13px] font-semibold text-zinc-900">3. Compartilhamento</h3>
          <p className="mt-1">
            Nao vendemos dados pessoais. Compartilhamentos ocorrem apenas quando necessarios para operacao tecnica,
            obrigacao legal ou autorizacao do titular.
          </p>
        </section>
        <section>
          <h3 className="text-[13px] font-semibold text-zinc-900">4. Seguranca e retencao</h3>
          <p className="mt-1">
            Adotamos medidas tecnicas e administrativas para proteger os dados. O tempo de retencao varia conforme tipo de
            dado e finalidade.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-[12px] leading-relaxed text-zinc-700">
      <p>
        Estes Termos de Uso regulam o acesso e utilizacao da plataforma ColeiraPet, incluindo aplicativo, funcionalidades
        web e integracoes com dispositivos.
      </p>
      <section>
        <h3 className="text-[13px] font-semibold text-zinc-900">1. Aceitacao</h3>
        <p className="mt-1">
          Ao utilizar a plataforma, voce concorda com estes termos e com a Politica de Privacidade.
        </p>
      </section>
      <section>
        <h3 className="text-[13px] font-semibold text-zinc-900">2. Responsabilidades</h3>
        <p className="mt-1">
          O usuario e responsavel pela veracidade das informacoes cadastradas e pelo uso adequado dos recursos da conta.
        </p>
      </section>
      <section>
        <h3 className="text-[13px] font-semibold text-zinc-900">3. Limitacoes</h3>
        <p className="mt-1">
          A ColeiraPet nao substitui atendimento veterinario presencial e nao garante disponibilidade continua sem
          interrupcoes.
        </p>
      </section>
      <section>
        <h3 className="text-[13px] font-semibold text-zinc-900">4. Atualizacoes</h3>
        <p className="mt-1">
          Estes termos podem ser atualizados periodicamente. O uso continuado apos mudancas representa concordancia com a
          versao vigente.
        </p>
      </section>
    </div>
  );
}
