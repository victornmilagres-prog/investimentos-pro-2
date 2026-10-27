/**
 * cronService.js — Atualização automática de cotações e fundamentalistas
 *
 * Horários (America/Sao_Paulo):
 *   09:00 seg–sex → cotações (pré-abertura — fecha preços da véspera)
 *   10:00 seg–sex → cotações + fundamentalistas (abertura do pregão B3)
 *
 * Fora desses horários, os dados só atualizam se houver usuário logado
 * na página (o frontend faz polling a cada 15 min durante o pregão).
 */

const pool            = require('../config/database');
const { buscarAcao }  = require('./brapiService');
const { buscarFII }   = require('./brapiService');

// ── Helpers de horário ────────────────────────────────────────────────────────

function agoraBrasil() {
  // Retorna um objeto com hora e dia da semana no fuso de SP
  const now = new Date();
  const str = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
  // str ex: "27/10/2026, 09:00:00"
  const [datePart, timePart] = str.split(', ');
  const [hour, minute] = timePart.split(':').map(Number);
  const diasSemana = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short' });
  // 0=dom, 1=seg...5=sex, 6=sab  — via getDay no fuso correto
  const dateObj = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const diaSemana = dateObj.getDay(); // 0 dom … 6 sab
  return { hour, minute, diaSemana };
}

function isDiaUtil(diaSemana) {
  return diaSemana >= 1 && diaSemana <= 5; // seg–sex
}

// ── Lógica de atualização ─────────────────────────────────────────────────────

async function atualizarAcoes(usuarioId) {
  try {
    const acoes = await pool.query(
      'SELECT ticker FROM acoes_carteira WHERE usuario_id=$1',
      [usuarioId]
    );
    for (const acao of acoes.rows) {
      try {
        const ajuste = await pool.query(
          'SELECT divida_liquida_ebit FROM ajustes_manuais_acoes WHERE usuario_id=$1 AND ticker=$2',
          [usuarioId, acao.ticker]
        );
        const dividaManual = ajuste.rows[0]?.divida_liquida_ebit ?? null;
        const dados = await buscarAcao(acao.ticker, dividaManual);
        await pool.query(`
          UPDATE acoes_carteira SET
            score=$1, max_score=$2, classificacao=$3, decisao=$4, preco_atual=$5,
            preco_graham=$6, status_graham=$7, pl=$8, pvp=$9, margem_liquida=$10,
            roe=$11, divida_ebit=$12, dy=$13,
            variacao_dia=$14, variacao_dia_reais=$15, preco_abertura=$16,
            preco_minimo=$17, preco_maximo=$18,
            observacoes=$19, ultima_atualizacao=$20,
            nome_empresa=$21, preco_bazin=$22, status_bazin=$23,
            updated_at=NOW()
          WHERE usuario_id=$24 AND ticker=$25
        `, [
          dados.score, dados.maxScore, dados.classificacao, dados.decisao, dados.preco,
          dados.precoGraham, dados.statusGraham, dados.pl, dados.pvp, dados.margemLiquida,
          dados.roe, dados.dividaEbit, dados.dy,
          dados.variacaoDia, dados.variacaoDiaReais, dados.precoAbertura,
          dados.precoMinimo, dados.precoMaximo,
          dados.observacoes, dados.ultimaAtualizacao,
          dados.nomeEmpresa, dados.precoBazin, dados.statusBazin,
          usuarioId, acao.ticker,
        ]);
      } catch (err) {
        console.error(`[cron] Ação ${acao.ticker} usuario ${usuarioId}:`, err.message);
      }
    }
    // recalcula pesos
    const total = await pool.query(
      'SELECT COALESCE(SUM(quantidade * preco_atual),0) AS total FROM acoes_carteira WHERE usuario_id=$1',
      [usuarioId]
    );
    const totalValor = parseFloat(total.rows[0].total) || 0;
    if (totalValor > 0) {
      await pool.query(`
        UPDATE acoes_carteira
        SET peso = ROUND((quantidade * preco_atual / $1) * 100, 2)
        WHERE usuario_id=$2
      `, [totalValor, usuarioId]);
    }
  } catch (err) {
    console.error(`[cron] atualizarAcoes usuario ${usuarioId}:`, err.message);
  }
}

async function atualizarFIIs(usuarioId) {
  try {
    const fiis = await pool.query(
      'SELECT ticker FROM fiis_carteira WHERE usuario_id=$1',
      [usuarioId]
    );
    for (const fii of fiis.rows) {
      try {
        const ajuste = await pool.query(
          'SELECT * FROM ajustes_manuais_fiis WHERE usuario_id=$1 AND ticker=$2',
          [usuarioId, fii.ticker]
        );
        const dados = await buscarFII(fii.ticker, ajuste.rows[0] || {});
        await pool.query(`
          UPDATE fiis_carteira SET
            score=$1, max_score=$2, classificacao=$3, decisao=$4, preco_atual=$5,
            pvp=$6, dy=$7, dy_anual=$8, variacao_dia=$9, variacao_dia_reais=$10,
            preco_abertura=$11, preco_minimo=$12, preco_maximo=$13,
            observacoes=$14, ultima_atualizacao=$15,
            nome_fundo=$16, vpa=$17, preco_justo=$18, status_justo=$19,
            updated_at=NOW()
          WHERE usuario_id=$20 AND ticker=$21
        `, [
          dados.score, dados.maxScore, dados.classificacao, dados.decisao, dados.preco,
          dados.pvp, dados.dy, dados.dyAnual, dados.variacaoDia, dados.variacaoDiaReais,
          dados.precoAbertura, dados.precoMinimo, dados.precoMaximo,
          dados.observacoes, dados.ultimaAtualizacao,
          dados.nomeFundo, dados.vpa, dados.precoJusto, dados.statusJusto,
          usuarioId, fii.ticker,
        ]);
      } catch (err) {
        console.error(`[cron] FII ${fii.ticker} usuario ${usuarioId}:`, err.message);
      }
    }
    // recalcula pesos
    const total = await pool.query(
      'SELECT COALESCE(SUM(quantidade * preco_atual),0) AS total FROM fiis_carteira WHERE usuario_id=$1',
      [usuarioId]
    );
    const totalValor = parseFloat(total.rows[0].total) || 0;
    if (totalValor > 0) {
      await pool.query(`
        UPDATE fiis_carteira
        SET peso = ROUND((quantidade * preco_atual / $1) * 100, 2)
        WHERE usuario_id=$2
      `, [totalValor, usuarioId]);
    }
  } catch (err) {
    console.error(`[cron] atualizarFIIs usuario ${usuarioId}:`, err.message);
  }
}

async function rodarAtualizacaoTodos({ incluirFundamentais = true } = {}) {
  try {
    const usuarios = await pool.query('SELECT id FROM usuarios');
    if (usuarios.rows.length === 0) return;
    console.log(`[cron] Atualizando ${usuarios.rows.length} usuário(s) — fundamentais: ${incluirFundamentais}`);
    for (const u of usuarios.rows) {
      await atualizarAcoes(u.id);
      await atualizarFIIs(u.id);
    }
    console.log('[cron] Atualização concluída em', new Date().toISOString());
  } catch (err) {
    console.error('[cron] Erro geral:', err.message);
  }
}

// ── Loop principal (verifica a cada minuto) ───────────────────────────────────

let ultimaExecucao = { hora: -1, rodou: false };

function iniciarCron() {
  console.log('[cron] Serviço iniciado — monitorando horários 09h e 10h (seg–sex, Brasília)');

  setInterval(async () => {
    const { hour, minute, diaSemana } = agoraBrasil();

    if (!isDiaUtil(diaSemana)) return;
    if (minute !== 0) return; // só executa no minuto exato

    // Evita dupla execução no mesmo minuto
    if (ultimaExecucao.hora === hour && ultimaExecucao.rodou) return;

    if (hour === 9) {
      console.log('[cron] 09h00 — atualizando cotações (pré-abertura)');
      ultimaExecucao = { hora: 9, rodou: true };
      await rodarAtualizacaoTodos({ incluirFundamentais: false });
    } else if (hour === 10) {
      console.log('[cron] 10h00 — atualizando cotações + fundamentais (abertura B3)');
      ultimaExecucao = { hora: 10, rodou: true };
      await rodarAtualizacaoTodos({ incluirFundamentais: true });
    }

    // Reset no próximo horário diferente
    if (hour !== ultimaExecucao.hora) {
      ultimaExecucao = { hora: -1, rodou: false };
    }
  }, 60 * 1000); // verifica a cada 1 minuto
}

module.exports = { iniciarCron };
