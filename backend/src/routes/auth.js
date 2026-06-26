const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', [
  body('nome').trim().notEmpty().withMessage('Nome obrigatório'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nome, email, senha } = req.body;
  try {
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) return res.status(400).json({ error: 'Email já cadastrado.' });

    const hash = await bcrypt.hash(senha, 12);
    const result = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email',
      [nome, email, hash]
    );
    const user = result.rows[0];

    // Cria planejamento padrão para o usuário
    await pool.query(
      'INSERT INTO planejamento (usuario_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [user.id]
    );

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

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

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.json({ token, user: { id: user.id, nome: user.nome, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, email, created_at FROM usuarios WHERE id = $1', [req.userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuário.' });
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
