// Exemplo de uso do sistema de mensagens do backend

import { useBackendMessage } from "@/app/(protected)/_components/ui/backend-popup";

export default function ExampleComponent() {
  const { showSuccess, showError, showWarning, showInfo } = useBackendMessage();

  const handleApiCall = async () => {
    try {
      const response = await fetch("/api/endpoint");
      const data = await response.json();

      if (response.ok) {
        showSuccess("Operação realizada com sucesso!");
      } else {
        // Mostra mensagem de erro do backend
        showError(data.error || "Erro ao processar requisição");
      }
    } catch (error) {
      showError("Erro de conexão com o servidor");
    }
  };

  return (
    <div>
      <button onClick={handleApiCall}>Fazer requisição</button>

      {/* Outros exemplos */}
      <button onClick={() => showSuccess("Tudo certo!")}>Mostrar Sucesso</button>

      <button onClick={() => showError("Algo deu errado")}>Mostrar Erro</button>

      <button onClick={() => showWarning("Atenção necessária")}>Mostrar Aviso</button>

      <button onClick={() => showInfo("Informação útil")}>Mostrar Info</button>
    </div>
  );
}

// Você também pode usar diretamente com o toast do sonner:
// import { toast } from "sonner";
// toast.success("Mensagem de sucesso");
// toast.error("Mensagem de erro");
