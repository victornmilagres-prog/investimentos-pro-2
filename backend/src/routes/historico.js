const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');

const router = express.Router();
router.use(auth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/historico
// Query params: categoria, tipo, periodo (7d|30d|90d|1a|tudo), ticker
router.get('/', async (req, res) => {
  try {
    const { categoria, tipo, periodo, ticker } = req.query;

    let whereClauses = ['usuario_id=$1'];
    const params = [req.userId];
    let idx = 2;

    if (categoria && categoria !== 'todos') {
      whereClauses.push(`categoria=$${idx++}`);
      params.push(categoria);
    }
    if (tipo && tipo !== 'todos') {
      whereClauses.push(`tipo=$${idx++}`);
      params.push(tipo);
    }
    if (ticker) {
      whereClauses.push(`UPPER(ticker) LIKE $${idx++}`);
      params.push(`%${ticker.toUpperCase()}%`);
    }
    if (periodo && periodo !== 'tudo') {
      const periodMap = { '7d': 7, '30d': 30, '90d': 90, '1a': 365 };
      const dias = periodMap[periodo];
      if (dias) {
        whereClauses.push(`data_operacao >= NOW() - INTERVAL '${dias} days'`);
      }
    }

    const where = whereClauses.join(' AND ');
    const result = await pool.query(
      `SELECT * FROM historico_operacoes WHERE ${where} ORDER BY data_operacao DESC, created_at DESC LIMIT 500`,
      params
    );

    // Resumo por tipo
    const resumo = await pool.query(
      `SELECT tipo, COUNT(*) as total, COALESCE(SUM(total), 0) as valor
       FROM historico_operacoes WHERE usuario_id=$1
       GROUP BY tipo`,
      [req.userId]
    );

    res.json({
      operacoes: result.rows,
      resumo: resumo.rows,
      total: result.rows.length,
    });
  } catch (err) {
    console.error('[historico GET]', err);
    res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

// POST /api/historico — inserção manual (para uso interno das rotas)
router.post('/', async (req, res) => {
  const { categoria, ticker, tipo, quantidade, preco_unitario, total, resultado, observacao, data_operacao } = req.body;
  if (!categoria || !ticker || !tipo || total === undefined)
    return res.status(400).json({ error: 'categoria, ticker, tipo e total são obrigatórios.' });
  try {
    const result = await pool.query(
      `INSERT INTO historico_operacoes
        (usuario_id, categoria, ticker, tipo, quantidade, preco_unitario, total, resultado, observacao, data_operacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        req.userId,
        categoria,
        ticker.toUpperCase(),
        tipo,
        quantidade || null,
        preco_unitario || null,
        total,
        resultado || null,
        observacao || null,
        data_operacao || new Date().toISOString().slice(0, 10),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[historico POST]', err);
    res.status(500).json({ error: 'Erro ao registrar histórico.' });
  }
});

// POST /api/historico/migrar — popula histórico retroativo com dados existentes
router.post('/migrar', async (req, res) => {
  try {
    let inseridos = 0;

    // 1. Ações (acoes_carteira)
    const acoes = await pool.query(
      `SELECT ticker, quantidade, preco_medio, quantidade * preco_medio AS total
       FROM acoes_carteira WHERE usuario_id=$1 AND quantidade > 0`,
      [req.userId]
    );
    for (const row of acoes.rows) {
      // Só insere se ainda não existe entrada de compra para este ticker (evita duplicar)
      const exists = await pool.query(
        `SELECT 1 FROM historico_operacoes WHERE usuario_id=$1 AND ticker=$2 AND tipo='compra' AND categoria='acao' LIMIT 1`,
        [req.userId, row.ticker]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO historico_operacoes (usuario_id,categoria,ticker,tipo,quantidade,preco_unitario,total,observacao,data_operacao)
           VALUES ($1,'acao',$2,'compra',$3,$4,$5,'Migrado do portfólio existente',CURRENT_DATE)`,
          [req.userId, row.ticker, parseFloat(row.quantidade), parseFloat(row.preco_medio), parseFloat(row.total)]
        );
        inseridos++;
      }
    }

    // 2. FIIs (fiis_carteira)
    const fiis = await pool.query(
      `SELECT ticker, quantidade, preco_medio, quantidade * preco_medio AS total
       FROM fiis_carteira WHERE usuario_id=$1 AND quantidade > 0`,
      [req.userId]
    );
    for (const row of fiis.rows) {
      const exists = await pool.query(
        `SELECT 1 FROM historico_operacoes WHERE usuario_id=$1 AND ticker=$2 AND tipo='compra' AND categoria='fii' LIMIT 1`,
        [req.userId, row.ticker]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO historico_operacoes (usuario_id,categoria,ticker,tipo,quantidade,preco_unitario,total,observacao,data_operacao)
           VALUES ($1,'fii',$2,'compra',$3,$4,$5,'Migrado do portfólio existente',CURRENT_DATE)`,
          [req.userId, row.ticker, parseFloat(row.quantidade), parseFloat(row.preco_medio), parseFloat(row.total)]
        );
        inseridos++;
      }
    }

    // 3. Renda Fixa (renda_fixa)
    const rf = await pool.query(
      `SELECT nome, valor_investido, data_inicio FROM renda_fixa WHERE usuario_id=$1`,
      [req.userId]
    );
    for (const row of rf.rows) {
      const ticker = (row.nome || '').substring(0, 50);
      const exists = await pool.query(
        `SELECT 1 FROM historico_operacoes WHERE usuario_id=$1 AND ticker=$2 AND tipo='aplicacao' AND categoria='renda_fixa' LIMIT 1`,
        [req.userId, ticker]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO historico_operacoes (usuario_id,categoria,ticker,tipo,total,observacao,data_operacao)
           VALUES ($1,'renda_fixa',$2,'aplicacao',$3,'Migrado do portfólio existente',$4)`,
          [req.userId, ticker, parseFloat(row.valor_investido), row.data_inicio || new Date().toISOString().slice(0,10)]
        );
        inseridos++;
      }
    }

    // 4. Outros ativos (outros_ativos)
    const outros = await pool.query(
      `SELECT ticker, quantidade, preco_compra, tipo, quantidade * preco_compra AS total
       FROM outros_ativos WHERE usuario_id=$1`,
      [req.userId]
    );
    for (const row of outros.rows) {
      const exists = await pool.query(
        `SELECT 1 FROM historico_operacoes WHERE usuario_id=$1 AND ticker=$2 AND tipo='compra' AND categoria='outros' LIMIT 1`,
        [req.userId, row.ticker]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO historico_operacoes (usuario_id,categoria,ticker,tipo,quantidade,preco_unitario,total,observacao,data_operacao)
           VALUES ($1,'outros',$2,'compra',$3,$4,$5,$6,CURRENT_DATE)`,
          [req.userId, row.ticker, parseFloat(row.quantidade), parseFloat(row.preco_compra), parseFloat(row.total), `Migrado — ${row.tipo || 'ativo'}`]
        );
        inseridos++;
      }
    }

    res.json({ ok: true, inseridos, mensagem: `${inseridos} operação(s) migrada(s) com sucesso.` });
  } catch (err) {
    console.error('[historico migrar]', err);
    res.status(500).json({ error: 'Erro ao migrar histórico.' });
  }
});

// POST /api/historico/importar-b3 — importa extrato de movimentação da B3 (XLSX)
// Detecta automaticamente: Rendimento (FII) → dividendo fii; JCP/Dividendo (ação) → dividendo acao
router.post('/importar-b3', upload.single('arquivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie o arquivo XLSX da B3.' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

    if (!rows.length) return res.status(400).json({ error: 'Planilha vazia ou formato não reconhecido.' });

    // Normaliza string removendo acentos para comparação robusta
    const norm = (s) => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

    // Detecta nomes das colunas (B3 pode variar ligeiramente)
    const firstRow = rows[0];
    const keys = Object.keys(firstRow);
    console.log('[importar-b3] colunas detectadas:', keys);
    const col = (patterns) => keys.find(k => patterns.some(p => norm(k).includes(norm(p)))) || null;

    const COL_DATA        = col(['Data']);
    const COL_MOV         = col(['Movimentacao', 'Movimentação', 'Tipo', 'Moviment']);
    const COL_PRODUTO     = col(['Produto']);
    const COL_ENTRADA_SAIDA = col(['Entrada', 'Saida', 'Saída']);
    const COL_QTD         = col(['Quantidade', 'Qtd']);
    const COL_PRECO       = col(['Preco unitario', 'Preço unitário', 'Preco Unit', 'Preco']);
    const COL_VALOR       = col(['Valor da Operacao', 'Valor da Operação', 'Valor Operacao', 'Valor']);

    console.log('[importar-b3] mapeamento:', { COL_DATA, COL_MOV, COL_PRODUTO, COL_QTD, COL_PRECO, COL_VALOR });

    if (!COL_PRODUTO || !COL_VALOR) {
      return res.status(400).json({
        error: `Formato não reconhecido. Colunas encontradas: ${keys.join(', ')}. Certifique-se de exportar a planilha de Movimentação da B3.`
      });
    }

    // Tipos de movimentação que interessam
    const TIPOS_INTERESSE = ['rendimento', 'dividendo', 'juros sobre capital', 'jcp', 'amortizacao', 'amortização', 'provento'];

    let inseridos = 0;
    let ignorados = 0;
    const erros = [];

    for (const row of rows) {
      const movStr = norm(row[COL_MOV] || '');
      if (!COL_MOV || !TIPOS_INTERESSE.some(t => movStr.includes(norm(t)))) {
        ignorados++;
        continue;
      }

      const produtoRaw = (row[COL_PRODUTO] || '').toString().trim();
      // Extrai ticker: "HFOF11 - NOME COMPLETO" → "HFOF11"
      const ticker = produtoRaw.split(/[\s\-–]/)[0].trim().toUpperCase();
      if (!ticker || ticker.length < 4) { ignorados++; continue; }

      // Determina categoria pelo ticker (FIIs terminam com número, ações geralmente não)
      // Mais confiável: se nome contém "FUNDO" ou "FII" → fii, senão → acao
      const prodLower = produtoRaw.toLowerCase();
      let categoria = 'acao';
      if (prodLower.includes('fundo') || prodLower.includes('fii') || prodLower.includes('imob')) {
        categoria = 'fii';
      }

      // Verifica se o ticker existe na carteira atual (ignora dividendos de ativos já vendidos)
      const tabela = categoria === 'fii' ? 'fiis_carteira' : 'acoes_carteira';
      const naCarteira = await pool.query(
        `SELECT 1 FROM ${tabela} WHERE usuario_id=$1 AND UPPER(ticker)=$2 LIMIT 1`,
        [req.userId, ticker]
      );
      if (naCarteira.rows.length === 0) { ignorados++; continue; }

      // Determina tipo de operação
      let tipo = 'dividendo';
      if (movStr.includes('rendimento')) tipo = 'dividendo';
      else if (movStr.includes('jcp') || movStr.includes('juros sobre capital')) tipo = 'jcp';
      else if (movStr.includes('amortiz')) tipo = 'amortizacao';

      // Data
      let dataOp = null;
      if (row[COL_DATA]) {
        if (row[COL_DATA] instanceof Date) {
          dataOp = row[COL_DATA].toISOString().slice(0, 10);
        } else {
          // Tenta parsear "DD/MM/YYYY"
          const parts = row[COL_DATA].toString().split('/');
          if (parts.length === 3) dataOp = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }
      }
      if (!dataOp) dataOp = new Date().toISOString().slice(0, 10);

      const quantidade   = row[COL_QTD]    ? parseFloat(row[COL_QTD])    : null;
      const precoUnit    = row[COL_PRECO]   ? parseFloat(row[COL_PRECO])  : null;
      const valorOp      = row[COL_VALOR]   ? parseFloat(row[COL_VALOR])  : 0;

      if (!valorOp || isNaN(valorOp)) { ignorados++; continue; }

      // Evita duplicata: mesma data + ticker + tipo + valor
      const dup = await pool.query(
        `SELECT 1 FROM historico_operacoes
         WHERE usuario_id=$1 AND ticker=$2 AND tipo=$3 AND data_operacao=$4 AND total=$5 LIMIT 1`,
        [req.userId, ticker, tipo, dataOp, valorOp]
      );
      if (dup.rows.length > 0) { ignorados++; continue; }

      try {
        await pool.query(
          `INSERT INTO historico_operacoes
            (usuario_id, categoria, ticker, tipo, quantidade, preco_unitario, total, observacao, data_operacao)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [req.userId, categoria, ticker, tipo, quantidade, precoUnit, valorOp,
           `Importado B3 — ${row[COL_MOV] || tipo}`, dataOp]
        );
        inseridos++;
      } catch (e) {
        erros.push(`${ticker} ${dataOp}: ${e.message}`);
      }
    }

    res.json({
      ok: true,
      inseridos,
      ignorados,
      erros: erros.slice(0, 5),
      mensagem: `${inseridos} lançamento(s) importado(s). ${ignorados} ignorado(s) (duplicatas ou tipo não aplicável).`,
    });
  } catch (err) {
    console.error('[historico importar-b3]', err);
    res.status(500).json({ error: 'Erro ao processar arquivo: ' + err.message });
  }
});

module.exports = router;
