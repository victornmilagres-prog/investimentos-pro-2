const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { Resend } = require('resend');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/auth/register
router.post('/register', [
  body('nome').trim().notEmpty().withMessage('Nome obrigatorio'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalido'),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter no minimo 6 caracteres'),
  body('cpf').notEmpty().withMessage('CPF obrigatorio'),
  body('telefone').notEmpty().withMessage('Telefone obrigatorio'),
  body('termoAceito').equals('true').withMessage('Voce deve aceitar os termos de uso')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    nome, email, senha, cpf, telefone,
    enderecoCep, enderecoRua, enderecoNumero, enderecoComplemento,
    enderecoBairro, enderecoCidade, enderecoEstado,
    termoAceito, termoVersao
  } = req.body;

  try {
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) return res.status(400).json({ error: 'Email ja cadastrado.' });

    const cpfExiste = await pool.query('SELECT id FROM usuarios WHERE cpf = $1', [cpf]);
    if (cpfExiste.rows.length > 0) return res.status(400).json({ error: 'CPF ja cadastrado.' });

    const hash = await bcrypt.hash(senha, 12);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    const result = await pool.query(
      `INSERT INTO usuarios (
        nome, email, senha_hash, cpf, telefone,
        endereco_cep, endereco_rua, endereco_numero, endereco_complemento,
        endereco_bairro, endereco_cidade, endereco_estado,
        termo_aceito, termo_aceito_em, termo_ip, termo_versao
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),$14,$15)
      RETURNING id, nome, email`,
      [
        nome, email, hash, cpf, telefone,
        enderecoCep || null, enderecoRua || null, enderecoNumero || null, enderecoComplemento || null,
        enderecoBairro || null, enderecoCidade || null, enderecoEstado || null,
        true, ip, termoVersao || '1.0'
      ]
    );

    const user = result.rows[0];
    await pool.query('INSERT INTO planejamento (usuario_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, nome: user.nome, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar conta.' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('senha').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, senha } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'Email ou senha incorretos.' });
    const user = result.rows[0];
    const valido = await bcrypt.compare(senha, user.senha_hash);
    if (!valido) return res.status(401).json({ error: 'Email ou senha incorretos.' });
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, nome: user.nome, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});

// POST /api/auth/esqueci-senha
router.post('/esqueci-senha', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT id, nome FROM usuarios WHERE email = $1', [email]);
    if (!result.rows.length) {
      return res.json({ message: 'Se este email estiver cadastrado, voce recebera o codigo em instantes.' });
    }
    const { id: userId, nome } = result.rows[0];
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      'UPDATE usuarios SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetCode, expiresAt, userId]
    );
    await resend.emails.send({
      from: 'Investimentos Pro <onboarding@resend.dev>',
      to: email,
      subject: 'Redefinicao de Senha - Investimentos Pro',
      html: '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px"><h1 style="color:#0f172a">Investimentos Pro</h1><p>Ola, <strong>' + nome + '</strong>!</p><p>Use o codigo abaixo para redefinir sua senha:</p><div style="text-align:center;margin:32px 0"><span style="font-size:40px;font-weight:bold;letter-spacing:10px;color:#3b82f6;background:#eff6ff;padding:16px 24px;border-radius:8px;display:inline-block">' + resetCode + '</span></div><p style="color:#64748b;font-size:14px">Expira em <strong>1 hora</strong>. Se nao foi voce, ignore este email.</p></div>'
    });
    res.json({ message: 'Codigo enviado! Verifique seu email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar email. Tente novamente.' });
  }
});

// POST /api/auth/redefinir-senha
router.post('/redefinir-senha', [
  body('resetCode').notEmpty().withMessage('Codigo obrigatorio'),
  body('novaSenha').isLength({ min: 6 }).withMessage('Senha deve ter no minimo 6 caracteres')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { resetCode, novaSenha } = req.body;
  try {
    const result = await pool.query(
      'SELECT id FROM usuarios WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [resetCode]
    );
    if (!result.rows.length) return res.status(400).json({ error: 'Codigo invalido ou expirado.' });
    const userId = result.rows[0].id;
    const hash = await bcrypt.hash(novaSenha, 12);
    await pool.query(
      'UPDATE usuarios SET senha_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = $2',
      [hash, userId]
    );
    res.json({ message: 'Senha redefinida com sucesso! Faca login com sua nova senha.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao redefinir senha.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, email, created_at FROM usuarios WHERE id = $1', [req.userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario nao encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuario.' });
  }
});

// PUT /api/auth/senha
router.put('/senha', authMiddleware, [
  body('senhaAtual').notEmpty(),
  body('novaSenha').isLength({ min: 6 })
], async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  try {
    const result = await pool.query('SELECT senha_hash FROM usuarios WHERE id = $1', [req.userId]);
    const user = result.rows[0];
    const valido = await bcrypt.compare(senhaAtual, user.senha_hash);
    if (!valido) return res.status(401).json({ error: 'Senha atual incorreta.' });
    const hash = await bcrypt.hash(novaSenha, 12);
    await pool.query('UPDATE usuarios SET senha_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.userId]);
    res.json({ message: 'Senha atualizada com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar senha.' });
  }
});

module.exports = router;