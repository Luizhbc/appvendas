const express = require("express");
const cors    = require("cors");
const initSqlJs = require("sql.js");
const fs      = require("fs");
const path    = require("path");

const app     = express();
const DB_PATH = path.join(__dirname, "varejo.db");
const PORT    = 3001;

app.use(cors());
app.use(express.json());

// ─── Banco ────────────────────────────────────────────────────────────────────

let db;   // instância global do sql.js

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function initDb(SQL) {
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
    console.log("✅ Banco carregado de:", DB_PATH);
  } else {
    db = new SQL.Database();
    console.log("✅ Novo banco criado em:", DB_PATH);
  }

  db.run("PRAGMA foreign_keys = ON;");

  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nome          TEXT    NOT NULL,
      preco         REAL    NOT NULL CHECK(preco >= 0),
      estoque       INTEGER NOT NULL DEFAULT 0 CHECK(estoque >= 0),
      categoria     TEXT    NOT NULL DEFAULT '',
      criado_em     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      atualizado_em TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS vendas (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id   INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
      produto_nome TEXT    NOT NULL,
      qty          INTEGER NOT NULL CHECK(qty > 0),
      total        REAL    NOT NULL,
      data         TEXT    NOT NULL,
      criado_em    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_vendas_produto ON vendas(produto_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_vendas_data    ON vendas(data);`);

  saveDb();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function query(sql, params = []) {
  const stmt   = db.prepare(sql);
  const rows   = [];
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  return query(sql, params)[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return db.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0] ?? null;
}

function err(res, msg, status = 400) {
  return res.status(status).json({ erro: msg });
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: DB_PATH, produtos: query("SELECT COUNT(*) as n FROM produtos")[0].n });
});

// ─── Produtos ─────────────────────────────────────────────────────────────────

app.get("/api/produtos", (req, res) => {
  const busca = (req.query.busca || "").trim();
  const rows = busca
    ? query("SELECT * FROM produtos WHERE nome LIKE ? OR categoria LIKE ? ORDER BY nome",
        [`%${busca}%`, `%${busca}%`])
    : query("SELECT * FROM produtos ORDER BY nome");
  res.json(rows);
});

app.get("/api/produtos/:id", (req, res) => {
  const row = queryOne("SELECT * FROM produtos WHERE id = ?", [req.params.id]);
  if (!row) return err(res, "Produto não encontrado.", 404);
  res.json(row);
});

app.post("/api/produtos", (req, res) => {
  const { nome, preco, estoque, categoria = "" } = req.body || {};

  if (!nome?.trim())                            return err(res, "Nome é obrigatório.");
  if (typeof preco !== "number" || preco < 0)   return err(res, "Preço inválido.");
  if (!Number.isInteger(estoque) || estoque < 0) return err(res, "Estoque inválido (inteiro >= 0).");

  const id = run(
    "INSERT INTO produtos (nome, preco, estoque, categoria) VALUES (?, ?, ?, ?)",
    [nome.trim(), preco, estoque, categoria.trim()]
  );
  res.status(201).json(queryOne("SELECT * FROM produtos WHERE id = ?", [id]));
});

app.put("/api/produtos/:id", (req, res) => {
  const existing = queryOne("SELECT * FROM produtos WHERE id = ?", [req.params.id]);
  if (!existing) return err(res, "Produto não encontrado.", 404);

  const nome      = req.body.nome?.trim()     || existing.nome;
  const preco     = req.body.preco     ?? existing.preco;
  const estoque   = req.body.estoque   ?? existing.estoque;
  const categoria = req.body.categoria?.trim() ?? existing.categoria;

  if (!nome)                                    return err(res, "Nome é obrigatório.");
  if (typeof preco !== "number" || preco < 0)   return err(res, "Preço inválido.");
  if (!Number.isInteger(estoque) || estoque < 0) return err(res, "Estoque inválido.");

  run(
    `UPDATE produtos SET nome=?, preco=?, estoque=?, categoria=?,
     atualizado_em=datetime('now','localtime') WHERE id=?`,
    [nome, preco, estoque, categoria, req.params.id]
  );
  run("UPDATE vendas SET produto_nome=? WHERE produto_id=?", [nome, req.params.id]);

  res.json(queryOne("SELECT * FROM produtos WHERE id = ?", [req.params.id]));
});

app.delete("/api/produtos/:id", (req, res) => {
  if (!queryOne("SELECT id FROM produtos WHERE id = ?", [req.params.id]))
    return err(res, "Produto não encontrado.", 404);
  run("DELETE FROM produtos WHERE id = ?", [req.params.id]);
  res.json({ mensagem: "Produto e vendas relacionadas removidos com sucesso." });
});

// ─── Vendas ───────────────────────────────────────────────────────────────────

app.get("/api/vendas", (req, res) => {
  const { data_ini, data_fim } = req.query;
  let sql    = "SELECT * FROM vendas WHERE 1=1";
  const params = [];
  if (data_ini) { sql += " AND data >= ?"; params.push(data_ini); }
  if (data_fim) { sql += " AND data <= ?"; params.push(data_fim); }
  sql += " ORDER BY criado_em DESC";
  res.json(query(sql, params));
});

app.get("/api/vendas/:id", (req, res) => {
  const row = queryOne("SELECT * FROM vendas WHERE id = ?", [req.params.id]);
  if (!row) return err(res, "Venda não encontrada.", 404);
  res.json(row);
});

app.post("/api/vendas", (req, res) => {
  const { produto_id, qty, data } = req.body || {};

  if (!produto_id)                           return err(res, "produto_id é obrigatório.");
  if (!Number.isInteger(qty) || qty < 1)     return err(res, "Quantidade inválida (inteiro >= 1).");
  if (!data?.trim())                         return err(res, "Data é obrigatória (YYYY-MM-DD).");

  const prod = queryOne("SELECT * FROM produtos WHERE id = ?", [produto_id]);
  if (!prod)            return err(res, "Produto não encontrado.", 404);
  if (prod.estoque < qty) return err(res, `Estoque insuficiente. Disponível: ${prod.estoque} un.`);

  const total = Math.round(prod.preco * qty * 100) / 100;

  const id = run(
    "INSERT INTO vendas (produto_id, produto_nome, qty, total, data) VALUES (?,?,?,?,?)",
    [produto_id, prod.nome, qty, total, data.trim()]
  );
  run(
    "UPDATE produtos SET estoque = estoque - ?, atualizado_em=datetime('now','localtime') WHERE id=?",
    [qty, produto_id]
  );

  res.status(201).json(queryOne("SELECT * FROM vendas WHERE id = ?", [id]));
});

app.put("/api/vendas/:id", (req, res) => {
  const venda = queryOne("SELECT * FROM vendas WHERE id = ?", [req.params.id]);
  if (!venda) return err(res, "Venda não encontrada.", 404);

  const produto_id = req.body.produto_id ?? venda.produto_id;
  const qty        = req.body.qty        ?? venda.qty;
  const data       = req.body.data?.trim() || venda.data;

  if (!Number.isInteger(qty) || qty < 1) return err(res, "Quantidade inválida.");

  const prod = queryOne("SELECT * FROM produtos WHERE id = ?", [produto_id]);
  if (!prod) return err(res, "Produto não encontrado.", 404);

  const estoqueDisponivel =
    prod.estoque + (produto_id === venda.produto_id ? venda.qty : 0);

  if (estoqueDisponivel < qty)
    return err(res, `Estoque insuficiente. Disponível: ${estoqueDisponivel} un.`);

  const total = Math.round(prod.preco * qty * 100) / 100;

  // Restaura estoque antigo
  run("UPDATE produtos SET estoque = estoque + ?, atualizado_em=datetime('now','localtime') WHERE id=?",
    [venda.qty, venda.produto_id]);
  // Desconta novo
  run("UPDATE produtos SET estoque = estoque - ?, atualizado_em=datetime('now','localtime') WHERE id=?",
    [qty, produto_id]);
  run(
    "UPDATE vendas SET produto_id=?, produto_nome=?, qty=?, total=?, data=? WHERE id=?",
    [produto_id, prod.nome, qty, total, data, req.params.id]
  );

  res.json(queryOne("SELECT * FROM vendas WHERE id = ?", [req.params.id]));
});

app.delete("/api/vendas/:id", (req, res) => {
  const venda = queryOne("SELECT * FROM vendas WHERE id = ?", [req.params.id]);
  if (!venda) return err(res, "Venda não encontrada.", 404);

  run("UPDATE produtos SET estoque = estoque + ?, atualizado_em=datetime('now','localtime') WHERE id=?",
    [venda.qty, venda.produto_id]);
  run("DELETE FROM vendas WHERE id = ?", [req.params.id]);

  res.json({ mensagem: "Venda excluída e estoque restaurado." });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

app.get("/api/dashboard", (req, res) => {
  const hoje = new Date().toISOString().slice(0, 10);

  const fat_hoje    = queryOne("SELECT COALESCE(SUM(total),0) as v FROM vendas WHERE data=?", [hoje]).v;
  const fat_total   = queryOne("SELECT COALESCE(SUM(total),0) as v FROM vendas").v;
  const vendas_hoje = queryOne("SELECT COUNT(*) as v FROM vendas WHERE data=?", [hoje]).v;
  const total_prod  = queryOne("SELECT COUNT(*) as v FROM produtos").v;

  const estoque_baixo = query("SELECT id,nome,estoque FROM produtos WHERE estoque < 5 ORDER BY estoque");
  const mais_vendido  = queryOne(
    "SELECT produto_nome, SUM(qty) as total_qty FROM vendas GROUP BY produto_id ORDER BY total_qty DESC LIMIT 1"
  );
  const ultimas_vendas = query("SELECT * FROM vendas ORDER BY criado_em DESC LIMIT 5");
  const por_dia        = query(
    "SELECT data, SUM(total) as total FROM vendas GROUP BY data ORDER BY data DESC LIMIT 7"
  );
  const ranking        = query(
    "SELECT produto_nome, SUM(qty) as qty, SUM(total) as total FROM vendas GROUP BY produto_id ORDER BY total DESC"
  );

  res.json({
    faturamento_hoje:  Math.round(fat_hoje  * 100) / 100,
    faturamento_total: Math.round(fat_total * 100) / 100,
    vendas_hoje,
    total_produtos: total_prod,
    estoque_baixo,
    mais_vendido:    mais_vendido || null,
    ultimas_vendas,
    por_dia,
    ranking,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

initSqlJs().then((SQL) => {
  initDb(SQL);
  app.listen(PORT, () => {
    console.log(`🚀 API rodando em http://localhost:${PORT}`);
    console.log(`📦 Endpoints disponíveis:`);
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/produtos`);
    console.log(`   POST /api/produtos`);
    console.log(`   PUT  /api/produtos/:id`);
    console.log(`   DEL  /api/produtos/:id`);
    console.log(`   GET  /api/vendas`);
    console.log(`   POST /api/vendas`);
    console.log(`   PUT  /api/vendas/:id`);
    console.log(`   DEL  /api/vendas/:id`);
    console.log(`   GET  /api/dashboard`);
  });
}).catch((e) => {
  console.error("❌ Erro ao inicializar SQLite:", e);
  process.exit(1);
});
