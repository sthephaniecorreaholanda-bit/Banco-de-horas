import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { Layout } from "@/components/Layout";
import Painel from "@/pages/Painel";
import RegistrarPonto from "@/pages/RegistrarPonto";
import Historico from "@/pages/Historico";
import Personalizacao from "@/pages/Personalizacao";
import Configuracoes from "@/pages/Configuracoes";
import Anual from "@/pages/Anual";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Painel} />
        <Route path="/registrar" component={RegistrarPonto} />
        <Route path="/historico" component={Historico} />
        <Route path="/anual" component={Anual} />
        <Route path="/personalizacao" component={Personalizacao} />
        <Route path="/configuracoes" component={Configuracoes} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

// === TELA DE LOGIN COM FUNDO ESCURO (DARK MODE) ===
function TelaLogin({ onLoginSucess }: { onLoginSucess: () => void }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ text: "", isError: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: "", isError: false });

    const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ocorreu um erro no acesso.");
      }

      if (isRegistering) {
        setMessage({ text: "Usuário mestre criado! Pode fazer o login.", isError: false });
        setIsRegistering(false);
        setPassword("");
      } else {
        localStorage.setItem("banco_horas_user", data.username);
        onLoginSucess();
      }
    } catch (err: any) {
      setMessage({ text: err.message, isError: true });
    }
  };

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", backgroundColor: "#0f172a", fontFamily: "sans-serif"
    }}>
      <div style={{
        background: "#ffffff", padding: "40px", borderRadius: "12px",
        width: "100%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>⏰</div>
        <h2 style={{ margin: "0 0 5px 0", color: "#1e293b", fontSize: "24px", fontWeight: "bold" }}>
          BANCO DE HORAS PRO
        </h2>
        <p style={{ margin: "0 0 25px 0", color: "#64748b", fontSize: "14px" }}>
          {isRegistering ? "Registrar Usuário Mestre" : "Acessar Sistema"}
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#475569", fontSize: "14px", fontWeight: "600" }}>Usuário:</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="seu_usuario" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#475569", fontSize: "14px", fontWeight: "600" }}>Senha:</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} />
          </div>

          {message.text && (
            <p style={{ margin: "0 0 15px 0", fontSize: "13px", color: message.isError ? "#ef4444" : "#10b981", fontWeight: "600", textAlign: "center" }}>
              {message.text}
            </p>
          )}

          <button type="submit" style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "none", backgroundColor: "#1e3a8a", color: "#ffffff", fontSize: "16px", fontWeight: "600", cursor: "pointer", transition: "background 0.2s" }}>
            {isRegistering ? "Cadastrar" : "Entrar"}
          </button>
        </form>

        <p style={{ marginTop: "20px", marginBottom: "0", fontSize: "13px", color: "#64748b" }}>
          {isRegistering ? "Já tem conta? " : "Primeiro acesso? "}
          <span onClick={() => { setIsRegistering(!isRegistering); setMessage({ text: "", isError: false }); }} style={{ color: "#2563eb", cursor: "pointer", fontWeight: "600" }}>
            {isRegistering ? "Faça login aqui." : "Cadastre o usuário mestre aqui."}
          </span>
        </p>
      </div>
    </div>
  );
}

function App() {
  const [isLogged, setIsLogged] = useState(false);

  // Verifica se o usuário já fez login anteriormente
  useEffect(() => {
    const session = localStorage.setItem ? localStorage.getItem("banco_horas_user") : null;
    if (session) {
      setIsLogged(true);
    }
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {isLogged ? (
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          ) : (
            <TelaLogin onLoginSucess={() => setIsLogged(true)} />
          )}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;