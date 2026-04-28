import { useState, useEffect, useCallback } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────

const API = "http://localhost:3001/api";

// ─── Cores ────────────────────────────────────────────────────────────────────

const C = {
  primary:      "#1D9E75",
  primaryDark:  "#0F6E56",
  primaryLight: "#E1F5EE",
  accent:       "#EF9F27",
  accentLight:  "#FAEEDA",
  accentDark:   "#854F0B",
  danger:       "#E24B4A",
  dangerLight:  "#FCEBEB",
  bg:           "#F8FAF9",
  card:         "#FFFFFF",
  text:         "#2C2C2A",
  muted:        "#888780",
  border:       "#D3D1C7",
  success:      "#639922",
  successLight: "#EAF3DE",
};

// ─── API client ───────────────────────────────────────────────────────────────

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.erro || "Erro desconhecido");
  return data;
}

const get    = (path)         => api(path);
const post   = (path, body)   => api(path, { method: "POST",   body: JSON.stringify(body) });
const put    = (path, body)   => api(path, { method: "PUT",    body: JSON.stringify(body) });
const del    = (path)         => api(path, { method: "DELETE" });

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useFetch(path, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await get(path)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [path]);

  useEffect(() => { load(); }, [load, ...deps]);
  return { data, loading, error, reload: load };
}

// ─── Componentes base ─────────────────────────────────────────────────────────

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.card, borderRadius: 16,
      border: `1px solid ${C.border}`, padding: 16, marginBottom: 10, ...style,
    }}>
      {children}
    </div>
  );
}

function Badge({ label, bg = C.primaryLight, color = C.primaryDark }) {
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}>
      {label}
    </span>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", required = false, disabled = false }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, fontWeight: 600 }}>
        {label}{required && <span style={{ color: C.danger }}> *</span>}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 10,
          border: `1px solid ${C.border}`, fontSize: 14, color: C.text,
          background: disabled ? C.border : C.bg,
          boxSizing: "border-box", outline: "none",
        }}
      />
    </div>
  );
}

function Btn({ label, onClick, color = C.primary, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? C.muted : color,
      color: "#fff", border: "none", borderRadius: 12,
      padding: "12px 20px", fontSize: 15, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", width: "100%",
    }}>
      {label}
    </button>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      margin: "8px 16px", padding: "10px 14px", borderRadius: 10, fontSize: 13,
      background: msg.ok ? C.successLight : C.dangerLight,
      color: msg.ok ? C.success : C.danger,
      borderLeft: `3px solid ${msg.ok ? C.success : C.danger}`,
    }}>
      {msg.texto}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ textAlign: "center", padding: "30px 0", color: C.muted, fontSize: 13 }}>
      <div style={{
        width: 28, height: 28, border: `3px solid ${C.border}`,
        borderTopColor: C.primary, borderRadius: "50%",
        animation: "spin 0.8s linear infinite", margin: "0 auto 8px",
      }} />
      Carregando...
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function Empty({ texto }) {
  return (
    <div style={{ textAlign: "center", padding: "50px 0", color: C.muted }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
      <div style={{ fontSize: 14 }}>{texto}</div>
    </div>
  );
}

function ConfirmModal({ texto, onConfirm, onCancel, loading }) {
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div style={{
        background: C.card, borderRadius: 16, padding: 24, width: 280,
        border: `1px solid ${C.border}`, textAlign: "center",
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🗑️</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>Confirmar exclusão</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.5 }}>{texto}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} disabled={loading} style={{
            flex: 1, padding: 10, borderRadius: 10,
            border: `1px solid ${C.border}`, background: "transparent",
            cursor: "pointer", fontSize: 14,
          }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} style={{
            flex: 1, padding: 10, borderRadius: 10, border: "none",
            background: C.danger, color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 14, fontWeight: 600,
          }}>
            {loading ? "..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusDB({ ok: isOk }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{
        width: 7, height: 7, borderRadius: "50%",
        background: isOk ? "#5DCAA5" : C.danger,
      }} />
      <span style={{ fontSize: 10, opacity: 0.8 }}>
        {isOk ? "SQLite conectado" : "Sem conexão"}
      </span>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV = [
  { id: "dashboard", label: "Início",    icon: "◉" },
  { id: "vendas",    label: "Vendas",    icon: "🛒" },
  { id: "estoque",   label: "Estoque",   icon: "📦" },
  { id: "relatorio", label: "Relatório", icon: "📊" },
];

function BottomNav({ active, onSelect }) {
  return (
    <div style={{ display: "flex", borderTop: `1px solid ${C.border}`, background: C.card, padding: "8px 0 4px", flexShrink: 0 }}>
      {NAV.map(item => (
        <button key={item.id} onClick={() => onSelect(item.id)} style={{
          flex: 1, background: "transparent", border: "none", cursor: "pointer",
          padding: "4px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        }}>
          <span style={{ fontSize: 18 }}>{item.icon}</span>
          <span style={{ fontSize: 10, fontWeight: active === item.id ? 700 : 400, color: active === item.id ? C.primary : C.muted }}>
            {item.label}
          </span>
          {active === item.id && <div style={{ width: 20, height: 2, background: C.primary, borderRadius: 2 }} />}
        </button>
      ))}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function StatCard({ label, value, bg, color }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: "14px 12px", border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Dashboard({ refreshKey }) {
  const { data, loading, error, reload } = useFetch("/dashboard", [refreshKey]);

  useEffect(() => { reload(); }, [refreshKey]);

  if (loading) return <div style={{ flex: 1, overflow: "hidden" }}><Spinner /></div>;
  if (error)   return <div style={{ flex: 1, padding: 16, color: C.danger, fontSize: 13 }}>❌ {error}</div>;

  const d = data;
  const maxDia = Math.max(...(d.por_dia || []).map(x => x.total), 1);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Olá! 👋</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <StatCard label="Faturamento hoje"  value={`R$ ${d.faturamento_hoje.toFixed(2)}`}  bg={C.primaryLight} color={C.primaryDark} />
        <StatCard label="Total do período"  value={`R$ ${d.faturamento_total.toFixed(2)}`} bg={C.accentLight}  color={C.accentDark}  />
        <StatCard label="Vendas hoje"       value={`${d.vendas_hoje} vendas`}               bg={C.successLight} color={C.success}     />
        <StatCard label="Produtos"          value={`${d.total_produtos} itens`}              bg={C.card}         color={C.text}        />
      </div>

      {d.estoque_baixo.length > 0 && (
        <Card style={{ background: C.dangerLight, border: `1px solid #F09595` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.danger, marginBottom: 8 }}>⚠️ Estoque baixo</div>
          {d.estoque_baixo.map(p => (
            <div key={p.id} style={{ fontSize: 13, color: C.danger, display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <span>{p.nome}</span><span>{p.estoque} un.</span>
            </div>
          ))}
        </Card>
      )}

      {d.mais_vendido && (
        <Card>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 4 }}>MAIS VENDIDO</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
            🏆 {d.mais_vendido.produto_nome} ({d.mais_vendido.total_qty} un.)
          </div>
        </Card>
      )}

      {d.ultimas_vendas.length > 0 && (
        <Card>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 10 }}>ÚLTIMAS VENDAS</div>
          {d.ultimas_vendas.map(v => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{v.produto_nome}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{v.qty} un. · {v.data}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>R$ {v.total.toFixed(2)}</div>
            </div>
          ))}
        </Card>
      )}

      {d.ultimas_vendas.length === 0 && d.total_produtos === 0 && (
        <Empty texto="Cadastre produtos e registre vendas para ver os dados aqui." />
      )}
    </div>
  );
}

// ─── Vendas CRUD ──────────────────────────────────────────────────────────────

function Vendas({ onMutation }) {
  const { data: vendas,   loading: lvend, reload: reloadVend } = useFetch("/vendas");
  const { data: produtos, loading: lprod }                      = useFetch("/produtos");

  const [showForm, setShowForm]   = useState(false);
  const [editVenda, setEditVenda] = useState(null);
  const [produtoId, setProdutoId] = useState("");
  const [qty,       setQty]       = useState("1");
  const [dataV,     setDataV]     = useState(new Date().toISOString().slice(0, 10));
  const [msg,       setMsg]       = useState(null);
  const [confirm,   setConfirm]   = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const flash = (ok, texto) => { setMsg({ ok, texto }); setTimeout(() => setMsg(null), 4000); };

  const abrirNova = () => {
    setEditVenda(null); setProdutoId(""); setQty("1");
    setDataV(new Date().toISOString().slice(0, 10)); setShowForm(true);
  };

  const abrirEditar = (v) => {
    setEditVenda(v); setProdutoId(String(v.produto_id));
    setQty(String(v.qty)); setDataV(v.data); setShowForm(true);
  };

  const cancelar = () => { setShowForm(false); setEditVenda(null); };

  const salvar = async () => {
    if (!produtoId) return flash(false, "Selecione um produto.");
    const quantidade = parseInt(qty);
    if (!quantidade || quantidade < 1) return flash(false, "Quantidade inválida.");
    if (!dataV) return flash(false, "Informe a data.");

    setSaving(true);
    try {
      if (editVenda) {
        await put(`/vendas/${editVenda.id}`, { produto_id: Number(produtoId), qty: quantidade, data: dataV });
        flash(true, "Venda atualizada com sucesso!");
      } else {
        const nova = await post("/vendas", { produto_id: Number(produtoId), qty: quantidade, data: dataV });
        flash(true, `Venda de R$ ${nova.total.toFixed(2)} registrada!`);
      }
      reloadVend(); onMutation();
      cancelar();
    } catch (e) {
      flash(false, e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmarExcluir = async () => {
    setDeleting(true);
    try {
      await del(`/vendas/${confirm.id}`);
      flash(true, "Venda excluída e estoque restaurado.");
      reloadVend(); onMutation();
    } catch (e) {
      flash(false, e.message);
    } finally {
      setDeleting(false); setConfirm(null);
    }
  };

  const prod = produtos?.find(p => p.id === Number(produtoId));
  const previewTotal = prod && qty ? (prod.preco * (parseInt(qty) || 0)).toFixed(2) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", position: "relative" }}>
      {confirm && (
        <ConfirmModal
          texto={`Excluir venda de "${confirm.produto_nome}" (${confirm.qty} un.)? O estoque será restaurado.`}
          onConfirm={confirmarExcluir}
          onCancel={() => setConfirm(null)}
          loading={deleting}
        />
      )}

      <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Vendas</div>
        <button onClick={showForm ? cancelar : abrirNova} style={{
          background: showForm ? C.muted : C.primary, color: "#fff", border: "none",
          borderRadius: 20, padding: "6px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>
          {showForm ? "Cancelar" : "+ Nova Venda"}
        </button>
      </div>

      <Toast msg={msg} />

      {showForm && (
        <div style={{ margin: "12px 16px", background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: C.text }}>
            {editVenda ? "✏️ Editar Venda" : "➕ Nova Venda"}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, fontWeight: 600 }}>
              Produto <span style={{ color: C.danger }}>*</span>
            </div>
            <select
              value={produtoId}
              onChange={e => setProdutoId(e.target.value)}
              disabled={lprod}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10,
                border: `1px solid ${C.border}`, fontSize: 14,
                background: C.bg, boxSizing: "border-box",
              }}
            >
              <option value="">{lprod ? "Carregando..." : "Selecione..."}</option>
              {(produtos || []).map(p => (
                <option key={p.id} value={p.id}>
                  {p.nome} — R$ {p.preco.toFixed(2)} ({p.estoque} un.)
                </option>
              ))}
            </select>
          </div>

          <Field label="Quantidade" type="number" value={qty} onChange={setQty} placeholder="1" required />
          <Field label="Data" type="date" value={dataV} onChange={setDataV} required />

          {previewTotal !== null && (
            <div style={{ marginBottom: 12, padding: "10px 12px", background: C.primaryLight, borderRadius: 10, fontSize: 14, color: C.primaryDark, fontWeight: 700 }}>
              Total estimado: R$ {previewTotal}
            </div>
          )}

          <Btn label={saving ? "Salvando..." : editVenda ? "Salvar Alterações" : "Registrar Venda"} onClick={salvar} disabled={saving} />
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 16px" }}>
        {lvend && <Spinner />}
        {!lvend && vendas?.length === 0 && <Empty texto="Nenhuma venda registrada ainda." />}
        {(vendas || []).map(v => (
          <Card key={v.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{v.produto_nome}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{v.qty} un. · {v.data}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>#{v.id} · {v.criado_em}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.primary }}>R$ {v.total.toFixed(2)}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => abrirEditar(v)} style={{ background: C.accentLight, color: C.accentDark, border: "none", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Editar</button>
                  <button onClick={() => setConfirm(v)} style={{ background: C.dangerLight, color: C.danger, border: "none", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Excluir</button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Estoque CRUD ─────────────────────────────────────────────────────────────

function Estoque({ onMutation }) {
  const { data: produtos, loading, reload } = useFetch("/produtos");

  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [nome,      setNome]      = useState("");
  const [preco,     setPreco]     = useState("");
  const [estoque,   setEstoque]   = useState("");
  const [categoria, setCategoria] = useState("");
  const [busca,     setBusca]     = useState("");
  const [msg,       setMsg]       = useState(null);
  const [confirm,   setConfirm]   = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const flash = (ok, texto) => { setMsg({ ok, texto }); setTimeout(() => setMsg(null), 4000); };

  const limpar = () => { setNome(""); setPreco(""); setEstoque(""); setCategoria(""); setEditId(null); };

  const abrirNovo = () => { limpar(); setShowForm(true); };

  const abrirEditar = (p) => {
    setEditId(p.id); setNome(p.nome); setPreco(String(p.preco));
    setEstoque(String(p.estoque)); setCategoria(p.categoria || "");
    setShowForm(true);
  };

  const cancelar = () => { limpar(); setShowForm(false); };

  const salvar = async () => {
    if (!nome.trim()) return flash(false, "Nome é obrigatório.");
    if (!preco || isNaN(+preco) || +preco < 0) return flash(false, "Preço inválido.");
    if (estoque === "" || isNaN(+estoque) || +estoque < 0) return flash(false, "Estoque inválido.");

    const body = {
      nome:      nome.trim(),
      preco:     parseFloat(preco),
      estoque:   parseInt(estoque),
      categoria: categoria.trim(),
    };

    setSaving(true);
    try {
      if (editId) {
        await put(`/produtos/${editId}`, body);
        flash(true, "Produto atualizado!");
      } else {
        await post("/produtos", body);
        flash(true, "Produto cadastrado!");
      }
      reload(); onMutation();
      cancelar();
    } catch (e) {
      flash(false, e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmarExcluir = async () => {
    setDeleting(true);
    try {
      await del(`/produtos/${confirm.id}`);
      flash(true, "Produto e vendas relacionadas removidos.");
      reload(); onMutation();
    } catch (e) {
      flash(false, e.message);
    } finally {
      setDeleting(false); setConfirm(null);
    }
  };

  const lista = (produtos || []).filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.categoria.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", position: "relative" }}>
      {confirm && (
        <ConfirmModal
          texto={`Excluir "${confirm.nome}"? Todas as vendas relacionadas também serão removidas.`}
          onConfirm={confirmarExcluir}
          onCancel={() => setConfirm(null)}
          loading={deleting}
        />
      )}

      <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Estoque</div>
        <button onClick={showForm ? cancelar : abrirNovo} style={{
          background: showForm ? C.muted : C.primary, color: "#fff", border: "none",
          borderRadius: 20, padding: "6px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>
          {showForm ? "Cancelar" : "+ Produto"}
        </button>
      </div>

      <Toast msg={msg} />

      {showForm && (
        <div style={{ margin: "12px 16px", background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: C.text }}>
            {editId ? "✏️ Editar Produto" : "➕ Novo Produto"}
          </div>
          <Field label="Nome"       value={nome}      onChange={setNome}      placeholder="Ex: Refrigerante 2L"      required />
          <Field label="Preço (R$)" value={preco}     onChange={setPreco}     placeholder="0,00" type="number"       required />
          <Field label="Estoque"    value={estoque}   onChange={setEstoque}   placeholder="0"    type="number"       required />
          <Field label="Categoria"  value={categoria} onChange={setCategoria} placeholder="Ex: Bebida, Alimento..." />
          <Btn label={saving ? "Salvando..." : editId ? "Salvar Alterações" : "Adicionar Produto"} onClick={salvar} disabled={saving} />
        </div>
      )}

      {!showForm && (
        <div style={{ padding: "8px 16px 4px", flexShrink: 0 }}>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="🔍  Buscar por nome ou categoria..."
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 10,
              border: `1px solid ${C.border}`, fontSize: 13,
              background: C.bg, boxSizing: "border-box", outline: "none",
            }}
          />
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 16px" }}>
        {loading && <Spinner />}
        {!loading && lista.length === 0 && (
          <Empty texto={busca ? "Nenhum produto encontrado." : "Nenhum produto cadastrado ainda."} />
        )}
        {lista.map(p => (
          <Card key={p.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{p.nome}</span>
                  {p.categoria && <Badge label={p.categoria} />}
                </div>
                <div style={{ fontSize: 13, color: C.muted }}>R$ {p.preco.toFixed(2)} / un.</div>
                <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: p.estoque === 0 ? C.dangerLight : p.estoque < 5 ? C.accentLight : C.successLight,
                    color:      p.estoque === 0 ? C.danger      : p.estoque < 5 ? C.accentDark  : C.success,
                  }}>
                    {p.estoque} un. {p.estoque === 0 ? "🚫" : p.estoque < 5 ? "⚠️" : "✓"}
                  </span>
                  <span style={{ fontSize: 10, color: C.muted }}>#{p.id}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 10 }}>
                <button onClick={() => abrirEditar(p)} style={{ background: C.accentLight, color: C.accentDark, border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Editar</button>
                <button onClick={() => setConfirm(p)} style={{ background: C.dangerLight, color: C.danger, border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Excluir</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Relatório ────────────────────────────────────────────────────────────────

function Relatorio({ refreshKey }) {
  const { data, loading, error, reload } = useFetch("/dashboard", [refreshKey]);

  useEffect(() => { reload(); }, [refreshKey]);

  if (loading) return <div style={{ flex: 1 }}><Spinner /></div>;
  if (error)   return <div style={{ flex: 1, padding: 16, color: C.danger, fontSize: 13 }}>❌ {error}</div>;

  const d = data;
  const porDia    = [...(d.por_dia || [])].reverse();
  const maxDia    = Math.max(...porDia.map(x => x.total), 1);
  const fatTotal  = d.faturamento_total;
  const totalQty  = (d.ranking || []).reduce((s, r) => s + r.qty, 0);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>Relatório</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <StatCard label="Faturamento total"    value={`R$ ${fatTotal.toFixed(2)}`}         bg={C.primaryLight} color={C.primaryDark} />
        <StatCard label="Itens vendidos"       value={`${totalQty} un.`}                   bg={C.accentLight}  color={C.accentDark}  />
        <StatCard label="Produtos cadastrados" value={`${d.total_produtos}`}               bg={C.successLight} color={C.success}     />
        <StatCard label="Em estoque baixo"     value={`${d.estoque_baixo.length} itens`}   bg={d.estoque_baixo.length > 0 ? C.dangerLight : C.card} color={d.estoque_baixo.length > 0 ? C.danger : C.text} />
      </div>

      {porDia.length > 0 && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 12 }}>FATURAMENTO POR DIA</div>
          {porDia.map(({ data: dia, total: val }) => (
            <div key={dia} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: C.muted }}>{dia}</span>
                <span style={{ fontWeight: 600, color: C.text }}>R$ {val.toFixed(2)}</span>
              </div>
              <div style={{ height: 8, background: C.bg, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(val / maxDia) * 100}%`, background: C.primary, borderRadius: 4, transition: "width 0.4s" }} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {d.ranking?.length > 0 && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 12 }}>RANKING DE PRODUTOS</div>
          {d.ranking.map((p, i) => (
            <div key={p.produto_nome} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < d.ranking.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{
                width: 24, height: 24, borderRadius: 12, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                background: i === 0 ? C.accentLight : C.primaryLight,
                color:      i === 0 ? C.accentDark  : C.primaryDark,
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.produto_nome}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{p.qty} unidades</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.primary, flexShrink: 0 }}>R$ {p.total.toFixed(2)}</div>
            </div>
          ))}
        </Card>
      )}

      {d.total_produtos === 0 && <Empty texto="Cadastre produtos e vendas para ver o relatório." />}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tab,        setTab]        = useState("dashboard");
  const [dbOk,       setDbOk]       = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Verifica conexão com o backend
  useEffect(() => {
    get("/health")
      .then(() => setDbOk(true))
      .catch(() => setDbOk(false));
  }, []);

  const onMutation = useCallback(() => setRefreshKey(k => k + 1), []);

  const screens = {
    dashboard: <Dashboard refreshKey={refreshKey} />,
    vendas:    <Vendas    onMutation={onMutation} />,
    estoque:   <Estoque   onMutation={onMutation} />,
    relatorio: <Relatorio refreshKey={refreshKey} />,
  };

  return (
    <div style={{
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      maxWidth: 390, margin: "0 auto", height: "100vh",
      display: "flex", flexDirection: "column",
      background: C.bg, overflow: "hidden", position: "relative",
    }}>
      {/* Header */}
      <div style={{
        background: C.primary, padding: "12px 20px 10px", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.3 }}>Gestão do seu negócio</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <span style={{ fontSize: 20 }}>🏪</span>
          {dbOk !== null && <StatusDB ok={dbOk} />}
        </div>
      </div>

      {/* Aviso sem conexão */}
      {dbOk === false && (
        <div style={{
          background: C.dangerLight, borderBottom: `1px solid #F09595`,
          padding: "10px 16px", fontSize: 12, color: C.danger, flexShrink: 0,
        }}>
          ❌ <strong>Sem conexão com o servidor.</strong> Inicie o backend com <code>python3 app.py</code> e recarregue.
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {screens[tab]}
      </div>

      <BottomNav active={tab} onSelect={setTab} />
    </div>
  );
}
