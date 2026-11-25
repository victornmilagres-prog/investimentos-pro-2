// ONE-TIME B3 IMPORT — gerado por gerar_importB3.js
const pool = require("../config/database");
const EMAIL = "victornmilagres@gmail.com";

const VENDAS = [
  {
    "tb": "acoes_carteira",
    "t": "CMIN3",
    "qtd": 88,
    "pm": 5.2534,
    "pv": 4.77,
    "dv": "2026-11-06",
    "nome": "CSN MINERACAO S.A."
  },
  {
    "tb": "fiis_carteira",
    "t": "FATN11",
    "qtd": 1,
    "pm": 85.22,
    "pv": 77.45,
    "dv": "2026-11-06",
    "nome": "FUNDO DE INVESTIMENTO IMOBILIÁRIO ATHENA I"
  },
  {
    "tb": "fiis_carteira",
    "t": "HFOF11",
    "qtd": 188,
    "pm": 6.7171,
    "pv": 5.85,
    "dv": "2026-11-06",
    "nome": "HEDGE TOP FOFII 3 FDO INV IMOB"
  },
  {
    "tb": "acoes_carteira",
    "t": "KLBN11",
    "qtd": 23,
    "pm": 17.22,
    "pv": 18.08,
    "dv": "2026-11-06",
    "nome": "KLABIN S/A"
  },
  {
    "tb": "fiis_carteira",
    "t": "RZAT11",
    "qtd": 16,
    "pm": 90.8354,
    "pv": 76.6,
    "dv": "2026-11-06",
    "nome": "RIZA ARCTIUM REAL ESTATE FDO INV IMOB"
  },
  {
    "tb": "acoes_carteira",
    "t": "SAPR4",
    "qtd": 112,
    "pm": 7.2709,
    "pv": 6.171,
    "dv": "2026-11-06",
    "nome": "CIA DE SANEAMENTO DO PARANA - SANEPAR"
  },
  {
    "tb": "acoes_carteira",
    "t": "ALPK3",
    "qtd": 56,
    "pm": 4.49,
    "pv": 4.14,
    "dv": "2026-07-20",
    "nome": "ALLPARK EMPREENDIMENTOS PARTICIPACOES SERVICOS S.A"
  },
  {
    "tb": "fiis_carteira",
    "t": "TVRI11",
    "qtd": 16,
    "pm": 92.3366,
    "pv": 91.48,
    "dv": "2026-06-01",
    "nome": "TIVIO RENDA IMOBILIARIA FI IMOBILIARIO RESP LTDA"
  },
  {
    "tb": "acoes_carteira",
    "t": "AXIA6",
    "qtd": 5,
    "pm": 58.43,
    "pv": 58.472,
    "dv": "2026-05-28",
    "nome": "CENTRAIS ELETRICAS BRASILEIRAS SA ELETROBRAS"
  },
  {
    "tb": "acoes_carteira",
    "t": "CYRE3",
    "qtd": 8,
    "pm": 29.96,
    "pv": 22.3,
    "dv": "2026-05-28",
    "nome": "CYRELA BRAZIL REALTY S/A EMPREENDIMENTOS E PARTICIPACOES"
  },
  {
    "tb": "acoes_carteira",
    "t": "DIRR3",
    "qtd": 17,
    "pm": 14.18,
    "pv": 13.45,
    "dv": "2026-05-28",
    "nome": "DIRECIONAL ENGENHARIA S/A"
  },
  {
    "tb": "acoes_carteira",
    "t": "EUCA4",
    "qtd": 7,
    "pm": 20.69,
    "pv": 27.4,
    "dv": "2026-05-28",
    "nome": "EUCATEX S/A IND. E COM."
  },
  {
    "tb": "acoes_carteira",
    "t": "GGBR4",
    "qtd": 10,
    "pm": 18.7008,
    "pv": 23.57,
    "dv": "2026-05-28",
    "nome": "GERDAU S.A."
  },
  {
    "tb": "acoes_carteira",
    "t": "ITUB4",
    "qtd": 7,
    "pm": 46.7,
    "pv": 39.87,
    "dv": "2026-05-28",
    "nome": "ITAU UNIBANCO HOLDING S.A"
  },
  {
    "tb": "acoes_carteira",
    "t": "MULT3",
    "qtd": 5,
    "pm": 32.93,
    "pv": 29.89,
    "dv": "2026-05-28",
    "nome": "MULTIPLAN - EMPREEND IMOBILIARIOS S.A."
  },
  {
    "tb": "acoes_carteira",
    "t": "PETR4",
    "qtd": 9,
    "pm": 31.8224,
    "pv": 43.42,
    "dv": "2026-05-28",
    "nome": "PETROLEO BRASILEIRO S/A PETROBRAS"
  },
  {
    "tb": "acoes_carteira",
    "t": "PSSA3",
    "qtd": 6,
    "pm": 49.66,
    "pv": 48.87,
    "dv": "2026-05-28",
    "nome": "PORTO SEGURO S.A."
  },
  {
    "tb": "acoes_carteira",
    "t": "SAPR11",
    "qtd": 3,
    "pm": 47.24,
    "pv": 37.66,
    "dv": "2026-05-28",
    "nome": "CIA DE SANEAMENTO DO PARANA - SANEPAR"
  },
  {
    "tb": "acoes_carteira",
    "t": "SLCE3",
    "qtd": 20,
    "pm": 16,
    "pv": 16.23,
    "dv": "2026-05-28",
    "nome": "SLC AGRICOLA S.A."
  },
  {
    "tb": "acoes_carteira",
    "t": "VALE3",
    "qtd": 3,
    "pm": 65.8768,
    "pv": 82.53,
    "dv": "2026-05-28",
    "nome": "VALE S.A."
  },
  {
    "tb": "acoes_carteira",
    "t": "VIVT3",
    "qtd": 8,
    "pm": 37.96,
    "pv": 33.71,
    "dv": "2026-05-28",
    "nome": "TELEFONICA BRASIL S.A."
  },
  {
    "tb": "acoes_carteira",
    "t": "AGRO3",
    "qtd": 10,
    "pm": 29.382,
    "pv": 20.5,
    "dv": "2025-09-22",
    "nome": "BRASILAGRO ? COMPANHIA BRASILEIRA DE PROPRIEDADES AGRICOLAS"
  },
  {
    "tb": "acoes_carteira",
    "t": "BRAP3",
    "qtd": 54,
    "pm": 19.1278,
    "pv": 15.56,
    "dv": "2025-09-22",
    "nome": "BRADESPAR S.A."
  },
  {
    "tb": "fiis_carteira",
    "t": "DEVA11",
    "qtd": 19,
    "pm": 79.6989,
    "pv": 33.01,
    "dv": "2025-07-23",
    "nome": "FII DEVANT"
  },
  {
    "tb": "fiis_carteira",
    "t": "HABT11",
    "qtd": 16,
    "pm": 102.9695,
    "pv": 82.22,
    "dv": "2025-07-23",
    "nome": "HABITAT II - FUNDO DE INVESTIMENTO IMOBILIÁRIO"
  },
  {
    "tb": "fiis_carteira",
    "t": "IRDM11",
    "qtd": 31,
    "pm": 91.3329,
    "pv": 60.64,
    "dv": "2025-07-23",
    "nome": "FII IRIDIUM RECEBIVEIS IMOBILIARIOS"
  },
  {
    "tb": "acoes_carteira",
    "t": "KLBN4",
    "qtd": 347,
    "pm": 3.8226,
    "pv": 3.71,
    "dv": "2025-07-11",
    "nome": "KLABIN S/A"
  },
  {
    "tb": "acoes_carteira",
    "t": "ABEV3",
    "qtd": 14,
    "pm": 14.1012,
    "pv": 14.28,
    "dv": "2025-05-29",
    "nome": "AMBEV S.A."
  },
  {
    "tb": "acoes_carteira",
    "t": "BRKM3",
    "qtd": 13,
    "pm": 32.5177,
    "pv": 11.9,
    "dv": "2025-05-29",
    "nome": "BRASKEM S.A."
  },
  {
    "tb": "fiis_carteira",
    "t": "KNSC11",
    "qtd": 6,
    "pm": 35.875,
    "pv": 8.86,
    "dv": "2025-05-29",
    "nome": "KINEA SECURITIES FUNDO DE INVESTIMENTO IMOBILIARIO - FII"
  },
  {
    "tb": "acoes_carteira",
    "t": "MGLU3",
    "qtd": 2,
    "pm": 5.4563,
    "pv": 9.42,
    "dv": "2025-05-29",
    "nome": "MAGAZINE LUIZA S/A"
  },
  {
    "tb": "acoes_carteira",
    "t": "GOAU3",
    "qtd": 33,
    "pm": 11.1575,
    "pv": 9.438,
    "dv": "2025-04-01",
    "nome": "METALURGICA GERDAU S.A."
  },
  {
    "tb": "acoes_carteira",
    "t": "BBDC3",
    "qtd": 3,
    "pm": 17.29,
    "pv": 11.79,
    "dv": "2025-03-31",
    "nome": "BANCO BRADESCO S/A"
  },
  {
    "tb": "acoes_carteira",
    "t": "GGBR3",
    "qtd": 4,
    "pm": 23.2195,
    "pv": 16.47,
    "dv": "2025-03-31",
    "nome": "GERDAU S.A."
  },
  {
    "tb": "acoes_carteira",
    "t": "KLBN3",
    "qtd": 279,
    "pm": 4.272,
    "pv": 3.95,
    "dv": "2025-03-31",
    "nome": "KLABIN S/A"
  },
  {
    "tb": "acoes_carteira",
    "t": "MRFG3",
    "qtd": 18,
    "pm": 7.7539,
    "pv": 12.85,
    "dv": "2024-10-15",
    "nome": "MARFRIG GLOBAL FOODS S.A."
  },
  {
    "tb": "fiis_carteira",
    "t": "HCTR11",
    "qtd": 10,
    "pm": 113.082,
    "pv": 113.38,
    "dv": "2022-06-28",
    "nome": "HECTARE CE - FDO INV IMOB"
  }
];

const PROVENTOS = [
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2026-09-01",
    "vpc": 1,
    "qtd": 16,
    "dp": "2026-09-22"
  },
  {
    "tb": "fiis_proventos",
    "t": "FATN11",
    "tipo": "Rendimento",
    "mr": "2026-09-01",
    "vpc": 0.8,
    "qtd": 1,
    "dp": "2026-09-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2026-09-01",
    "vpc": 0.06,
    "qtd": 188,
    "dp": "2026-09-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2026-09-01",
    "vpc": 1.05,
    "qtd": 38,
    "dp": "2026-09-15"
  },
  {
    "tb": "acoes_proventos",
    "t": "VALE3",
    "tipo": "Dividendo",
    "mr": "2026-09-01",
    "vpc": 0.462,
    "qtd": 38,
    "dp": "2026-09-02"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2026-08-01",
    "vpc": 1.05,
    "qtd": 16,
    "dp": "2026-08-21"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "JCP",
    "mr": "2026-08-01",
    "vpc": 0.35,
    "qtd": 266,
    "dp": "2026-08-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "FATN11",
    "tipo": "Rendimento",
    "mr": "2026-08-01",
    "vpc": 0.8,
    "qtd": 1,
    "dp": "2026-08-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2026-08-01",
    "vpc": 0.06,
    "qtd": 188,
    "dp": "2026-08-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2026-08-01",
    "vpc": 1.05,
    "qtd": 38,
    "dp": "2026-08-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2026-07-01",
    "vpc": 1.7,
    "qtd": 16,
    "dp": "2026-07-21"
  },
  {
    "tb": "fiis_proventos",
    "t": "FATN11",
    "tipo": "Rendimento",
    "mr": "2026-07-01",
    "vpc": 0.8,
    "qtd": 1,
    "dp": "2026-07-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2026-07-01",
    "vpc": 0.06,
    "qtd": 188,
    "dp": "2026-07-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2026-07-01",
    "vpc": 1.05,
    "qtd": 38,
    "dp": "2026-07-14"
  },
  {
    "tb": "acoes_proventos",
    "t": "SAPR4",
    "tipo": "JCP",
    "mr": "2026-06-01",
    "vpc": 0.113,
    "qtd": 100,
    "dp": "2026-06-26"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Rendimento",
    "mr": "2026-06-01",
    "vpc": 0.02,
    "qtd": 9,
    "dp": "2026-06-22"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2026-06-01",
    "vpc": 1.7,
    "qtd": 16,
    "dp": "2026-06-22"
  },
  {
    "tb": "fiis_proventos",
    "t": "FATN11",
    "tipo": "Rendimento",
    "mr": "2026-06-01",
    "vpc": 0.8,
    "qtd": 1,
    "dp": "2026-06-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2026-06-01",
    "vpc": 0.06,
    "qtd": 188,
    "dp": "2026-06-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2026-06-01",
    "vpc": 1.05,
    "qtd": 38,
    "dp": "2026-06-15"
  },
  {
    "tb": "acoes_proventos",
    "t": "GGBR4",
    "tipo": "Dividendo",
    "mr": "2026-06-01",
    "vpc": 0.18,
    "qtd": 10,
    "dp": "2026-06-09"
  },
  {
    "tb": "acoes_proventos",
    "t": "ITUB4",
    "tipo": "JCP",
    "mr": "2026-06-01",
    "vpc": 0.018,
    "qtd": 7,
    "dp": "2026-06-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "ALPK3",
    "tipo": "Dividendo",
    "mr": "2026-05-01",
    "vpc": 0.008,
    "qtd": 73,
    "dp": "2026-05-29"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2026-05-01",
    "vpc": 1.7,
    "qtd": 16,
    "dp": "2026-05-22"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "JCP",
    "mr": "2026-05-01",
    "vpc": 0.313,
    "qtd": 9,
    "dp": "2026-05-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "FATN11",
    "tipo": "Rendimento",
    "mr": "2026-05-01",
    "vpc": 0.8,
    "qtd": 1,
    "dp": "2026-05-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2026-05-01",
    "vpc": 0.06,
    "qtd": 188,
    "dp": "2026-05-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2026-05-01",
    "vpc": 1.05,
    "qtd": 32,
    "dp": "2026-05-15"
  },
  {
    "tb": "acoes_proventos",
    "t": "ITUB4",
    "tipo": "JCP",
    "mr": "2026-05-01",
    "vpc": 0.018,
    "qtd": 7,
    "dp": "2026-05-04"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2026-04-01",
    "vpc": 1.4,
    "qtd": 16,
    "dp": "2026-04-23"
  },
  {
    "tb": "fiis_proventos",
    "t": "FATN11",
    "tipo": "Rendimento",
    "mr": "2026-04-01",
    "vpc": 0.8,
    "qtd": 1,
    "dp": "2026-04-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2026-04-01",
    "vpc": 0.06,
    "qtd": 188,
    "dp": "2026-04-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2026-04-01",
    "vpc": 1.05,
    "qtd": 32,
    "dp": "2026-04-15"
  },
  {
    "tb": "acoes_proventos",
    "t": "ITUB4",
    "tipo": "JCP",
    "mr": "2026-04-01",
    "vpc": 0.018,
    "qtd": 7,
    "dp": "2026-04-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Rendimento",
    "mr": "2026-03-01",
    "vpc": 0.009,
    "qtd": 251,
    "dp": "2026-03-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2026-03-01",
    "vpc": 1,
    "qtd": 16,
    "dp": "2026-03-20"
  },
  {
    "tb": "acoes_proventos",
    "t": "GGBR4",
    "tipo": "Dividendo",
    "mr": "2026-03-01",
    "vpc": 0.1,
    "qtd": 10,
    "dp": "2026-03-18"
  },
  {
    "tb": "fiis_proventos",
    "t": "FATN11",
    "tipo": "Rendimento",
    "mr": "2026-03-01",
    "vpc": 0.8,
    "qtd": 1,
    "dp": "2026-03-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2026-03-01",
    "vpc": 0.06,
    "qtd": 188,
    "dp": "2026-03-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2026-03-01",
    "vpc": 1.05,
    "qtd": 32,
    "dp": "2026-03-13"
  },
  {
    "tb": "acoes_proventos",
    "t": "VALE3",
    "tipo": "JCP",
    "mr": "2026-03-01",
    "vpc": 1.57,
    "qtd": 35,
    "dp": "2026-03-04"
  },
  {
    "tb": "acoes_proventos",
    "t": "ITUB4",
    "tipo": "JCP",
    "mr": "2026-03-01",
    "vpc": 0.018,
    "qtd": 7,
    "dp": "2026-03-02"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2026-02-01",
    "vpc": 0.95,
    "qtd": 16,
    "dp": "2026-02-24"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "JCP",
    "mr": "2026-02-01",
    "vpc": 0.472,
    "qtd": 251,
    "dp": "2026-02-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "FATN11",
    "tipo": "Rendimento",
    "mr": "2026-02-01",
    "vpc": 0.8,
    "qtd": 1,
    "dp": "2026-02-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2026-02-01",
    "vpc": 0.06,
    "qtd": 188,
    "dp": "2026-02-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2026-02-01",
    "vpc": 1.05,
    "qtd": 32,
    "dp": "2026-02-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2026-01-01",
    "vpc": 0.95,
    "qtd": 16,
    "dp": "2026-01-22"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2026-01-01",
    "vpc": 0.056,
    "qtd": 182,
    "dp": "2026-01-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2026-01-01",
    "vpc": 1.05,
    "qtd": 28,
    "dp": "2026-01-15"
  },
  {
    "tb": "acoes_proventos",
    "t": "VALE3",
    "tipo": "Dividendo",
    "mr": "2026-01-01",
    "vpc": 1.244,
    "qtd": 35,
    "dp": "2026-01-07"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2025-12-01",
    "vpc": 0.201,
    "qtd": 199,
    "dp": "2025-12-22"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2025-12-01",
    "vpc": 0.85,
    "qtd": 15,
    "dp": "2025-12-19"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2025-12-01",
    "vpc": 0.056,
    "qtd": 182,
    "dp": "2025-12-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2025-12-01",
    "vpc": 1.05,
    "qtd": 28,
    "dp": "2025-12-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2025-11-01",
    "vpc": 0.85,
    "qtd": 15,
    "dp": "2025-11-24"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "JCP",
    "mr": "2025-11-01",
    "vpc": 0.336,
    "qtd": 199,
    "dp": "2025-11-21"
  },
  {
    "tb": "acoes_proventos",
    "t": "CMIN3",
    "tipo": "Dividendo",
    "mr": "2025-11-01",
    "vpc": 0.078,
    "qtd": 70,
    "dp": "2025-11-19"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2025-11-01",
    "vpc": 0.056,
    "qtd": 182,
    "dp": "2025-11-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2025-11-01",
    "vpc": 1.05,
    "qtd": 28,
    "dp": "2025-11-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2025-10-01",
    "vpc": 0.9,
    "qtd": 15,
    "dp": "2025-10-21"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2025-10-01",
    "vpc": 0.056,
    "qtd": 182,
    "dp": "2025-10-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2025-10-01",
    "vpc": 1.05,
    "qtd": 28,
    "dp": "2025-10-14"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "JCP",
    "mr": "2025-09-01",
    "vpc": 0.146,
    "qtd": 131,
    "dp": "2025-09-22"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2025-09-01",
    "vpc": 1,
    "qtd": 15,
    "dp": "2025-09-19"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2025-09-01",
    "vpc": 0.056,
    "qtd": 87,
    "dp": "2025-09-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2025-09-01",
    "vpc": 1.05,
    "qtd": 16,
    "dp": "2025-09-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "VALE3",
    "tipo": "JCP",
    "mr": "2025-09-01",
    "vpc": 1.895,
    "qtd": 35,
    "dp": "2025-09-03"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2025-08-01",
    "vpc": 1.05,
    "qtd": 6,
    "dp": "2025-08-21"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "JCP",
    "mr": "2025-08-01",
    "vpc": 0.455,
    "qtd": 131,
    "dp": "2025-08-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2025-08-01",
    "vpc": 0.056,
    "qtd": 87,
    "dp": "2025-08-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2025-08-01",
    "vpc": 1.05,
    "qtd": 16,
    "dp": "2025-08-14"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2025-07-01",
    "vpc": 0.267,
    "qtd": 3,
    "dp": "2025-07-31"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2025-07-01",
    "vpc": 1.05,
    "qtd": 4,
    "dp": "2025-07-21"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2025-07-01",
    "vpc": 0.84,
    "qtd": 31,
    "dp": "2025-07-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2025-07-01",
    "vpc": 0.46,
    "qtd": 19,
    "dp": "2025-07-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2025-07-01",
    "vpc": 0.056,
    "qtd": 20,
    "dp": "2025-07-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2025-07-01",
    "vpc": 1.03,
    "qtd": 9,
    "dp": "2025-07-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2025-07-01",
    "vpc": 1.15,
    "qtd": 16,
    "dp": "2025-07-11"
  },
  {
    "tb": "acoes_proventos",
    "t": "ABEV3",
    "tipo": "Dividendo",
    "mr": "2025-07-01",
    "vpc": 0.128,
    "qtd": 14,
    "dp": "2025-07-07"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2025-06-01",
    "vpc": 1.15,
    "qtd": 4,
    "dp": "2025-06-23"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Rendimento",
    "mr": "2025-06-01",
    "vpc": 0.022,
    "qtd": 116,
    "dp": "2025-06-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2025-06-01",
    "vpc": 0.82,
    "qtd": 31,
    "dp": "2025-06-17"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2025-06-01",
    "vpc": 0.45,
    "qtd": 19,
    "dp": "2025-06-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2025-06-01",
    "vpc": 0.056,
    "qtd": 20,
    "dp": "2025-06-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2025-06-01",
    "vpc": 1.03,
    "qtd": 9,
    "dp": "2025-06-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2025-06-01",
    "vpc": 1.15,
    "qtd": 16,
    "dp": "2025-06-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "KLBN4",
    "tipo": "Dividendo",
    "mr": "2025-05-01",
    "vpc": 0.046,
    "qtd": 279,
    "dp": "2025-05-22"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2025-05-01",
    "vpc": 1.15,
    "qtd": 4,
    "dp": "2025-05-22"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2025-05-01",
    "vpc": 0.355,
    "qtd": 116,
    "dp": "2025-05-20"
  },
  {
    "tb": "acoes_proventos",
    "t": "GGBR4",
    "tipo": "Dividendo",
    "mr": "2025-05-01",
    "vpc": 0.12,
    "qtd": 42,
    "dp": "2025-05-19"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2025-05-01",
    "vpc": 0.83,
    "qtd": 31,
    "dp": "2025-05-19"
  },
  {
    "tb": "acoes_proventos",
    "t": "BRAP3",
    "tipo": "Dividendo",
    "mr": "2025-05-01",
    "vpc": 0.836,
    "qtd": 54,
    "dp": "2025-05-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2025-05-01",
    "vpc": 0.46,
    "qtd": 19,
    "dp": "2025-05-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2025-05-01",
    "vpc": 0.56,
    "qtd": 2,
    "dp": "2025-05-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2025-05-01",
    "vpc": 1.03,
    "qtd": 9,
    "dp": "2025-05-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2025-05-01",
    "vpc": 0.11,
    "qtd": 61,
    "dp": "2025-05-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2025-05-01",
    "vpc": 1.15,
    "qtd": 16,
    "dp": "2025-05-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "MGLU3",
    "tipo": "Dividendo",
    "mr": "2025-05-01",
    "vpc": 0.305,
    "qtd": 2,
    "dp": "2025-05-05"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2025-04-01",
    "vpc": 0.18,
    "qtd": 3,
    "dp": "2025-04-30"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2025-04-01",
    "vpc": 1.1,
    "qtd": 4,
    "dp": "2025-04-23"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2025-04-01",
    "vpc": 0.72,
    "qtd": 31,
    "dp": "2025-04-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2025-04-01",
    "vpc": 0.41,
    "qtd": 19,
    "dp": "2025-04-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2025-04-01",
    "vpc": 0.56,
    "qtd": 2,
    "dp": "2025-04-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2025-04-01",
    "vpc": 1.03,
    "qtd": 9,
    "dp": "2025-04-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2025-04-01",
    "vpc": 1,
    "qtd": 16,
    "dp": "2025-04-11"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2025-04-01",
    "vpc": 0.1,
    "qtd": 61,
    "dp": "2025-04-11"
  },
  {
    "tb": "acoes_proventos",
    "t": "ABEV3",
    "tipo": "Dividendo",
    "mr": "2025-04-01",
    "vpc": 0.128,
    "qtd": 14,
    "dp": "2025-04-04"
  },
  {
    "tb": "acoes_proventos",
    "t": "BRAP3",
    "tipo": "JCP",
    "mr": "2025-04-01",
    "vpc": 0.191,
    "qtd": 18,
    "dp": "2025-04-04"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2025-03-01",
    "vpc": 1.1,
    "qtd": 4,
    "dp": "2025-03-25"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2025-03-01",
    "vpc": 0.8,
    "qtd": 31,
    "dp": "2025-03-20"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Rendimento",
    "mr": "2025-03-01",
    "vpc": 0.017,
    "qtd": 114,
    "dp": "2025-03-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2025-03-01",
    "vpc": 0.43,
    "qtd": 19,
    "dp": "2025-03-18"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2025-03-01",
    "vpc": 0.56,
    "qtd": 2,
    "dp": "2025-03-18"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2025-03-01",
    "vpc": 1.03,
    "qtd": 9,
    "dp": "2025-03-18"
  },
  {
    "tb": "acoes_proventos",
    "t": "GOAU3",
    "tipo": "Dividendo",
    "mr": "2025-03-01",
    "vpc": 0.05,
    "qtd": 38,
    "dp": "2025-03-17"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2025-03-01",
    "vpc": 0.09,
    "qtd": 61,
    "dp": "2025-03-17"
  },
  {
    "tb": "acoes_proventos",
    "t": "GGBR3",
    "tipo": "Dividendo",
    "mr": "2025-03-01",
    "vpc": 0.1,
    "qtd": 4,
    "dp": "2025-03-14"
  },
  {
    "tb": "acoes_proventos",
    "t": "KLBN3",
    "tipo": "Dividendo",
    "mr": "2025-03-01",
    "vpc": 0.009,
    "qtd": 279,
    "dp": "2025-03-14"
  },
  {
    "tb": "acoes_proventos",
    "t": "VALE3",
    "tipo": "JCP",
    "mr": "2025-03-01",
    "vpc": 0.521,
    "qtd": 16,
    "dp": "2025-03-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2025-03-01",
    "vpc": 1.08,
    "qtd": 16,
    "dp": "2025-03-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2025-03-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2025-03-05"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2025-02-01",
    "vpc": 1,
    "qtd": 4,
    "dp": "2025-02-21"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Rendimento",
    "mr": "2025-02-01",
    "vpc": 0.011,
    "qtd": 114,
    "dp": "2025-02-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2025-02-01",
    "vpc": 0.75,
    "qtd": 31,
    "dp": "2025-02-18"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2025-02-01",
    "vpc": 0.41,
    "qtd": 19,
    "dp": "2025-02-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2025-02-01",
    "vpc": 0.56,
    "qtd": 2,
    "dp": "2025-02-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2025-02-01",
    "vpc": 1.03,
    "qtd": 9,
    "dp": "2025-02-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2025-02-01",
    "vpc": 0.1,
    "qtd": 61,
    "dp": "2025-02-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2025-02-01",
    "vpc": 1.1,
    "qtd": 16,
    "dp": "2025-02-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2025-02-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2025-02-03"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2025-01-01",
    "vpc": 0.359,
    "qtd": 3,
    "dp": "2025-01-31"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2025-01-01",
    "vpc": 1,
    "qtd": 4,
    "dp": "2025-01-22"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2025-01-01",
    "vpc": 0.93,
    "qtd": 31,
    "dp": "2025-01-17"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2025-01-01",
    "vpc": 0.44,
    "qtd": 19,
    "dp": "2025-01-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2025-01-01",
    "vpc": 0.56,
    "qtd": 2,
    "dp": "2025-01-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2025-01-01",
    "vpc": 0.98,
    "qtd": 9,
    "dp": "2025-01-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2025-01-01",
    "vpc": 0.09,
    "qtd": 61,
    "dp": "2025-01-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2025-01-01",
    "vpc": 1.05,
    "qtd": 16,
    "dp": "2025-01-10"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2024-12-01",
    "vpc": 1.552,
    "qtd": 114,
    "dp": "2024-12-23"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2024-12-01",
    "vpc": 1,
    "qtd": 4,
    "dp": "2024-12-20"
  },
  {
    "tb": "acoes_proventos",
    "t": "GOAU3",
    "tipo": "Dividendo",
    "mr": "2024-12-01",
    "vpc": 0.13,
    "qtd": 38,
    "dp": "2024-12-17"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2024-12-01",
    "vpc": 0.77,
    "qtd": 31,
    "dp": "2024-12-17"
  },
  {
    "tb": "acoes_proventos",
    "t": "GGBR3",
    "tipo": "Dividendo",
    "mr": "2024-12-01",
    "vpc": 0.3,
    "qtd": 4,
    "dp": "2024-12-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2024-12-01",
    "vpc": 0.43,
    "qtd": 19,
    "dp": "2024-12-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2024-12-01",
    "vpc": 0.56,
    "qtd": 2,
    "dp": "2024-12-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2024-12-01",
    "vpc": 0.98,
    "qtd": 9,
    "dp": "2024-12-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2024-12-01",
    "vpc": 0.08,
    "qtd": 61,
    "dp": "2024-12-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2024-12-01",
    "vpc": 1.02,
    "qtd": 16,
    "dp": "2024-12-11"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2024-12-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2024-12-02"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2024-11-01",
    "vpc": 0.98,
    "qtd": 4,
    "dp": "2024-11-25"
  },
  {
    "tb": "acoes_proventos",
    "t": "BRAP3",
    "tipo": "JCP",
    "mr": "2024-11-01",
    "vpc": 0.817,
    "qtd": 18,
    "dp": "2024-11-21"
  },
  {
    "tb": "acoes_proventos",
    "t": "KLBN3",
    "tipo": "JCP",
    "mr": "2024-11-01",
    "vpc": 0.07,
    "qtd": 279,
    "dp": "2024-11-21"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "JCP",
    "mr": "2024-11-01",
    "vpc": 0.413,
    "qtd": 114,
    "dp": "2024-11-21"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2024-11-01",
    "vpc": 0.75,
    "qtd": 31,
    "dp": "2024-11-19"
  },
  {
    "tb": "acoes_proventos",
    "t": "AGRO3",
    "tipo": "Dividendo",
    "mr": "2024-11-01",
    "vpc": 1.556,
    "qtd": 10,
    "dp": "2024-11-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2024-11-01",
    "vpc": 0.45,
    "qtd": 19,
    "dp": "2024-11-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2024-11-01",
    "vpc": 0.58,
    "qtd": 2,
    "dp": "2024-11-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2024-11-01",
    "vpc": 0.98,
    "qtd": 9,
    "dp": "2024-11-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2024-11-01",
    "vpc": 0.08,
    "qtd": 61,
    "dp": "2024-11-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2024-11-01",
    "vpc": 0.9,
    "qtd": 16,
    "dp": "2024-11-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2024-11-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2024-11-01"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2024-10-01",
    "vpc": 0.92,
    "qtd": 2,
    "dp": "2024-10-21"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2024-10-01",
    "vpc": 0.8,
    "qtd": 31,
    "dp": "2024-10-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2024-10-01",
    "vpc": 0.45,
    "qtd": 19,
    "dp": "2024-10-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2024-10-01",
    "vpc": 0.6,
    "qtd": 2,
    "dp": "2024-10-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2024-10-01",
    "vpc": 0.98,
    "qtd": 9,
    "dp": "2024-10-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2024-10-01",
    "vpc": 1,
    "qtd": 16,
    "dp": "2024-10-11"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2024-10-01",
    "vpc": 0.09,
    "qtd": 61,
    "dp": "2024-10-11"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2024-10-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2024-10-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2024-09-01",
    "vpc": 0.448,
    "qtd": 114,
    "dp": "2024-09-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2024-09-01",
    "vpc": 1.05,
    "qtd": 2,
    "dp": "2024-09-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2024-09-01",
    "vpc": 0.7,
    "qtd": 31,
    "dp": "2024-09-17"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2024-09-01",
    "vpc": 0.45,
    "qtd": 19,
    "dp": "2024-09-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2024-09-01",
    "vpc": 0.63,
    "qtd": 2,
    "dp": "2024-09-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2024-09-01",
    "vpc": 0.98,
    "qtd": 9,
    "dp": "2024-09-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2024-09-01",
    "vpc": 0.95,
    "qtd": 16,
    "dp": "2024-09-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2024-09-01",
    "vpc": 0.09,
    "qtd": 61,
    "dp": "2024-09-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "VALE3",
    "tipo": "JCP",
    "mr": "2024-09-01",
    "vpc": 2.094,
    "qtd": 16,
    "dp": "2024-09-04"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2024-09-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2024-09-02"
  },
  {
    "tb": "acoes_proventos",
    "t": "GOAU3",
    "tipo": "Dividendo",
    "mr": "2024-08-01",
    "vpc": 0.08,
    "qtd": 38,
    "dp": "2024-08-21"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2024-08-01",
    "vpc": 1.1,
    "qtd": 2,
    "dp": "2024-08-21"
  },
  {
    "tb": "acoes_proventos",
    "t": "GGBR3",
    "tipo": "Dividendo",
    "mr": "2024-08-01",
    "vpc": 0.12,
    "qtd": 4,
    "dp": "2024-08-20"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "JCP",
    "mr": "2024-08-01",
    "vpc": 0.522,
    "qtd": 114,
    "dp": "2024-08-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2024-08-01",
    "vpc": 0.74,
    "qtd": 31,
    "dp": "2024-08-16"
  },
  {
    "tb": "acoes_proventos",
    "t": "KLBN3",
    "tipo": "Dividendo",
    "mr": "2024-08-01",
    "vpc": 0.067,
    "qtd": 260,
    "dp": "2024-08-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2024-08-01",
    "vpc": 0.46,
    "qtd": 19,
    "dp": "2024-08-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2024-08-01",
    "vpc": 0.63,
    "qtd": 2,
    "dp": "2024-08-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2024-08-01",
    "vpc": 0.98,
    "qtd": 9,
    "dp": "2024-08-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2024-08-01",
    "vpc": 0.09,
    "qtd": 61,
    "dp": "2024-08-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2024-08-01",
    "vpc": 1,
    "qtd": 16,
    "dp": "2024-08-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2024-08-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2024-08-01"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2024-07-01",
    "vpc": 1.15,
    "qtd": 2,
    "dp": "2024-07-19"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2024-07-01",
    "vpc": 0.74,
    "qtd": 31,
    "dp": "2024-07-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2024-07-01",
    "vpc": 0.43,
    "qtd": 19,
    "dp": "2024-07-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2024-07-01",
    "vpc": 1,
    "qtd": 16,
    "dp": "2024-07-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2024-07-01",
    "vpc": 0.63,
    "qtd": 2,
    "dp": "2024-07-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2024-07-01",
    "vpc": 0.09,
    "qtd": 61,
    "dp": "2024-07-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2024-07-01",
    "vpc": 0.97,
    "qtd": 9,
    "dp": "2024-07-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2024-07-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2024-07-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2024-06-01",
    "vpc": 0.447,
    "qtd": 3,
    "dp": "2024-06-28"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2024-06-01",
    "vpc": 1.1,
    "qtd": 2,
    "dp": "2024-06-21"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2024-06-01",
    "vpc": 0.85,
    "qtd": 114,
    "dp": "2024-06-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2024-06-01",
    "vpc": 0.74,
    "qtd": 31,
    "dp": "2024-06-18"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2024-06-01",
    "vpc": 0.48,
    "qtd": 19,
    "dp": "2024-06-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2024-06-01",
    "vpc": 0.63,
    "qtd": 2,
    "dp": "2024-06-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2024-06-01",
    "vpc": 0.97,
    "qtd": 9,
    "dp": "2024-06-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2024-06-01",
    "vpc": 0.08,
    "qtd": 61,
    "dp": "2024-06-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2024-06-01",
    "vpc": 1.05,
    "qtd": 16,
    "dp": "2024-06-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "GOAU3",
    "tipo": "Dividendo",
    "mr": "2024-05-01",
    "vpc": 0.19,
    "qtd": 38,
    "dp": "2024-05-28"
  },
  {
    "tb": "acoes_proventos",
    "t": "GGBR3",
    "tipo": "Dividendo",
    "mr": "2024-05-01",
    "vpc": 0.28,
    "qtd": 4.8,
    "dp": "2024-05-27"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2024-05-01",
    "vpc": 1.05,
    "qtd": 2,
    "dp": "2024-05-22"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2024-05-01",
    "vpc": 0.85,
    "qtd": 114,
    "dp": "2024-05-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2024-05-01",
    "vpc": 0.81,
    "qtd": 31,
    "dp": "2024-05-17"
  },
  {
    "tb": "acoes_proventos",
    "t": "KLBN3",
    "tipo": "Dividendo",
    "mr": "2024-05-01",
    "vpc": 0.06,
    "qtd": 107,
    "dp": "2024-05-16"
  },
  {
    "tb": "acoes_proventos",
    "t": "BRAP3",
    "tipo": "Dividendo",
    "mr": "2024-05-01",
    "vpc": 0.741,
    "qtd": 18,
    "dp": "2024-05-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2024-05-01",
    "vpc": 0.65,
    "qtd": 19,
    "dp": "2024-05-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2024-05-01",
    "vpc": 0.63,
    "qtd": 2,
    "dp": "2024-05-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2024-05-01",
    "vpc": 0.97,
    "qtd": 9,
    "dp": "2024-05-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2024-05-01",
    "vpc": 0.09,
    "qtd": 61,
    "dp": "2024-05-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2024-05-01",
    "vpc": 1.13,
    "qtd": 16,
    "dp": "2024-05-13"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2024-05-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2024-05-02"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2024-04-01",
    "vpc": 1.1,
    "qtd": 2,
    "dp": "2024-04-19"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2024-04-01",
    "vpc": 0.8,
    "qtd": 31,
    "dp": "2024-04-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2024-04-01",
    "vpc": 0.68,
    "qtd": 19,
    "dp": "2024-04-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2024-04-01",
    "vpc": 1.1,
    "qtd": 16,
    "dp": "2024-04-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2024-04-01",
    "vpc": 0.63,
    "qtd": 2,
    "dp": "2024-04-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2024-04-01",
    "vpc": 0.97,
    "qtd": 9,
    "dp": "2024-04-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2024-04-01",
    "vpc": 0.09,
    "qtd": 61,
    "dp": "2024-04-11"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2024-04-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2024-04-01"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2024-03-01",
    "vpc": 1.08,
    "qtd": 2,
    "dp": "2024-03-21"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2024-03-01",
    "vpc": 0.673,
    "qtd": 114,
    "dp": "2024-03-20"
  },
  {
    "tb": "acoes_proventos",
    "t": "VALE3",
    "tipo": "Dividendo",
    "mr": "2024-03-01",
    "vpc": 2.739,
    "qtd": 16,
    "dp": "2024-03-19"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2024-03-01",
    "vpc": 0.78,
    "qtd": 31,
    "dp": "2024-03-18"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2024-03-01",
    "vpc": 0.6,
    "qtd": 19,
    "dp": "2024-03-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2024-03-01",
    "vpc": 0.63,
    "qtd": 2,
    "dp": "2024-03-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2024-03-01",
    "vpc": 0.97,
    "qtd": 9,
    "dp": "2024-03-14"
  },
  {
    "tb": "acoes_proventos",
    "t": "GOAU3",
    "tipo": "Dividendo",
    "mr": "2024-03-01",
    "vpc": 0.05,
    "qtd": 35,
    "dp": "2024-03-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2024-03-01",
    "vpc": 0.08,
    "qtd": 61,
    "dp": "2024-03-13"
  },
  {
    "tb": "acoes_proventos",
    "t": "GGBR3",
    "tipo": "Dividendo",
    "mr": "2024-03-01",
    "vpc": 0.1,
    "qtd": 2,
    "dp": "2024-03-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2024-03-01",
    "vpc": 1.05,
    "qtd": 16,
    "dp": "2024-03-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2024-03-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2024-03-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "KLBN3",
    "tipo": "Dividendo",
    "mr": "2024-02-01",
    "vpc": 0.035,
    "qtd": 28,
    "dp": "2024-02-26"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2024-02-01",
    "vpc": 1.12,
    "qtd": 2,
    "dp": "2024-02-23"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2024-02-01",
    "vpc": 0.75,
    "qtd": 29,
    "dp": "2024-02-20"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Rendimento",
    "mr": "2024-02-01",
    "vpc": 0.006,
    "qtd": 114,
    "dp": "2024-02-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2024-02-01",
    "vpc": 0.62,
    "qtd": 19,
    "dp": "2024-02-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2024-02-01",
    "vpc": 0.63,
    "qtd": 2,
    "dp": "2024-02-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2024-02-01",
    "vpc": 0.97,
    "qtd": 9,
    "dp": "2024-02-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2024-02-01",
    "vpc": 0.08,
    "qtd": 61,
    "dp": "2024-02-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2024-02-01",
    "vpc": 1,
    "qtd": 16,
    "dp": "2024-02-09"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2024-02-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2024-02-01"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2024-01-01",
    "vpc": 1.1,
    "qtd": 2,
    "dp": "2024-01-22"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2024-01-01",
    "vpc": 0.7,
    "qtd": 29,
    "dp": "2024-01-17"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2024-01-01",
    "vpc": 0.42,
    "qtd": 19,
    "dp": "2024-01-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2024-01-01",
    "vpc": 0.63,
    "qtd": 1,
    "dp": "2024-01-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2024-01-01",
    "vpc": 0.91,
    "qtd": 7,
    "dp": "2024-01-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2024-01-01",
    "vpc": 0.98,
    "qtd": 15,
    "dp": "2024-01-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2024-01-01",
    "vpc": 0.07,
    "qtd": 50,
    "dp": "2024-01-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2024-01-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2024-01-02"
  },
  {
    "tb": "acoes_proventos",
    "t": "ABEV3",
    "tipo": "JCP",
    "mr": "2023-12-01",
    "vpc": 0.73,
    "qtd": 14,
    "dp": "2023-12-28"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2023-12-01",
    "vpc": 0.498,
    "qtd": 114,
    "dp": "2023-12-27"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2023-12-01",
    "vpc": 1.2,
    "qtd": 1,
    "dp": "2023-12-21"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2023-12-01",
    "vpc": 0.77,
    "qtd": 15,
    "dp": "2023-12-18"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2023-12-01",
    "vpc": 0.47,
    "qtd": 14,
    "dp": "2023-12-14"
  },
  {
    "tb": "acoes_proventos",
    "t": "GOAU3",
    "tipo": "Dividendo",
    "mr": "2023-12-01",
    "vpc": 0.93,
    "qtd": 38,
    "dp": "2023-12-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2023-12-01",
    "vpc": 0.63,
    "qtd": 1,
    "dp": "2023-12-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2023-12-01",
    "vpc": 0.91,
    "qtd": 7,
    "dp": "2023-12-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2023-12-01",
    "vpc": 0.07,
    "qtd": 50,
    "dp": "2023-12-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2023-12-01",
    "vpc": 1,
    "qtd": 15,
    "dp": "2023-12-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BRAP3",
    "tipo": "JCP",
    "mr": "2023-12-01",
    "vpc": 1.075,
    "qtd": 18,
    "dp": "2023-12-04"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2023-12-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2023-12-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "VALE3",
    "tipo": "JCP",
    "mr": "2023-12-01",
    "vpc": 0.766,
    "qtd": 16,
    "dp": "2023-12-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "AGRO3",
    "tipo": "Dividendo",
    "mr": "2023-11-01",
    "vpc": 3.212,
    "qtd": 10,
    "dp": "2023-11-24"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2023-11-01",
    "vpc": 1.02,
    "qtd": 1,
    "dp": "2023-11-23"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2023-11-01",
    "vpc": 0.712,
    "qtd": 15,
    "dp": "2023-11-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2023-11-01",
    "vpc": 0.52,
    "qtd": 14,
    "dp": "2023-11-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2023-11-01",
    "vpc": 0.63,
    "qtd": 1,
    "dp": "2023-11-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "TVRI11",
    "tipo": "Rendimento",
    "mr": "2023-11-01",
    "vpc": 0.91,
    "qtd": 7,
    "dp": "2023-11-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2023-11-01",
    "vpc": 0.8,
    "qtd": 5,
    "dp": "2023-11-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2023-11-01",
    "vpc": 1,
    "qtd": 15,
    "dp": "2023-11-10"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2023-11-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2023-11-01"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2023-10-01",
    "vpc": 0.79,
    "qtd": 1,
    "dp": "2023-10-23"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2023-10-01",
    "vpc": 0.801,
    "qtd": 15,
    "dp": "2023-10-18"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2023-10-01",
    "vpc": 0.49,
    "qtd": 14,
    "dp": "2023-10-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2023-10-01",
    "vpc": 0.63,
    "qtd": 1,
    "dp": "2023-10-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2023-10-01",
    "vpc": 0.75,
    "qtd": 5,
    "dp": "2023-10-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2023-10-01",
    "vpc": 1,
    "qtd": 15,
    "dp": "2023-10-11"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2023-10-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2023-10-02"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2023-09-01",
    "vpc": 0.73,
    "qtd": 1,
    "dp": "2023-09-22"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2023-09-01",
    "vpc": 0.947,
    "qtd": 114,
    "dp": "2023-09-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2023-09-01",
    "vpc": 0.74,
    "qtd": 15,
    "dp": "2023-09-19"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2023-09-01",
    "vpc": 0.47,
    "qtd": 14,
    "dp": "2023-09-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2023-09-01",
    "vpc": 0.63,
    "qtd": 1,
    "dp": "2023-09-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2023-09-01",
    "vpc": 0.8,
    "qtd": 5,
    "dp": "2023-09-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2023-09-01",
    "vpc": 1,
    "qtd": 15,
    "dp": "2023-09-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2023-09-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2023-09-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "GOAU3",
    "tipo": "Dividendo",
    "mr": "2023-08-01",
    "vpc": 0.26,
    "qtd": 37,
    "dp": "2023-08-30"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2023-08-01",
    "vpc": 0.75,
    "qtd": 1,
    "dp": "2023-08-21"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2023-08-01",
    "vpc": 0.278,
    "qtd": 114,
    "dp": "2023-08-18"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2023-08-01",
    "vpc": 0.809,
    "qtd": 15,
    "dp": "2023-08-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2023-08-01",
    "vpc": 0.5,
    "qtd": 14,
    "dp": "2023-08-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2023-08-01",
    "vpc": 0.63,
    "qtd": 1,
    "dp": "2023-08-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2023-08-01",
    "vpc": 1.2,
    "qtd": 15,
    "dp": "2023-08-11"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2023-08-01",
    "vpc": 0.7,
    "qtd": 5,
    "dp": "2023-08-11"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2023-08-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2023-08-01"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2023-07-01",
    "vpc": 0.9,
    "qtd": 1,
    "dp": "2023-07-21"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2023-07-01",
    "vpc": 0.875,
    "qtd": 15,
    "dp": "2023-07-18"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2023-07-01",
    "vpc": 0.6,
    "qtd": 14,
    "dp": "2023-07-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2023-07-01",
    "vpc": 0.63,
    "qtd": 1,
    "dp": "2023-07-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2023-07-01",
    "vpc": 0.8,
    "qtd": 5,
    "dp": "2023-07-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2023-07-01",
    "vpc": 1.2,
    "qtd": 15,
    "dp": "2023-07-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2023-07-01",
    "vpc": 0.179,
    "qtd": 3,
    "dp": "2023-07-06"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2023-06-01",
    "vpc": 1.2,
    "qtd": 1,
    "dp": "2023-06-22"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2023-06-01",
    "vpc": 0.868,
    "qtd": 13,
    "dp": "2023-06-19"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2023-06-01",
    "vpc": 0.875,
    "qtd": 114,
    "dp": "2023-06-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2023-06-01",
    "vpc": 0.65,
    "qtd": 12,
    "dp": "2023-06-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2023-06-01",
    "vpc": 0.63,
    "qtd": 1,
    "dp": "2023-06-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2023-06-01",
    "vpc": 1.05,
    "qtd": 5,
    "dp": "2023-06-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2023-06-01",
    "vpc": 1.3,
    "qtd": 15,
    "dp": "2023-06-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2023-06-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2023-06-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "GOAU3",
    "tipo": "JCP",
    "mr": "2023-05-01",
    "vpc": 0.25,
    "qtd": 38,
    "dp": "2023-05-30"
  },
  {
    "tb": "acoes_proventos",
    "t": "GGBR3",
    "tipo": "JCP",
    "mr": "2023-05-01",
    "vpc": 0.51,
    "qtd": 4,
    "dp": "2023-05-29"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2023-05-01",
    "vpc": 1.32,
    "qtd": 1,
    "dp": "2023-05-22"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2023-05-01",
    "vpc": 1.373,
    "qtd": 114,
    "dp": "2023-05-19"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2023-05-01",
    "vpc": 0.913,
    "qtd": 13,
    "dp": "2023-05-17"
  },
  {
    "tb": "acoes_proventos",
    "t": "BRAP3",
    "tipo": "Dividendo",
    "mr": "2023-05-01",
    "vpc": 1.123,
    "qtd": 18,
    "dp": "2023-05-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2023-05-01",
    "vpc": 0.85,
    "qtd": 12,
    "dp": "2023-05-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2023-05-01",
    "vpc": 0.63,
    "qtd": 1,
    "dp": "2023-05-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2023-05-01",
    "vpc": 1.27,
    "qtd": 15,
    "dp": "2023-05-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2023-05-01",
    "vpc": 0.95,
    "qtd": 5,
    "dp": "2023-05-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2023-05-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2023-05-02"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2023-04-01",
    "vpc": 1.35,
    "qtd": 1,
    "dp": "2023-04-25"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2023-04-01",
    "vpc": 0.911,
    "qtd": 13,
    "dp": "2023-04-19"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2023-04-01",
    "vpc": 0.7,
    "qtd": 12,
    "dp": "2023-04-17"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2023-04-01",
    "vpc": 0.63,
    "qtd": 1,
    "dp": "2023-04-17"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2023-04-01",
    "vpc": 1.05,
    "qtd": 5,
    "dp": "2023-04-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2023-04-01",
    "vpc": 1.25,
    "qtd": 15,
    "dp": "2023-04-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2023-04-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2023-04-03"
  },
  {
    "tb": "acoes_proventos",
    "t": "GOAU3",
    "tipo": "Dividendo",
    "mr": "2023-03-01",
    "vpc": 0.1,
    "qtd": 38,
    "dp": "2023-03-24"
  },
  {
    "tb": "acoes_proventos",
    "t": "GGBR3",
    "tipo": "Dividendo",
    "mr": "2023-03-01",
    "vpc": 0.2,
    "qtd": 4,
    "dp": "2023-03-23"
  },
  {
    "tb": "acoes_proventos",
    "t": "VALE3",
    "tipo": "Dividendo",
    "mr": "2023-03-01",
    "vpc": 1.828,
    "qtd": 16,
    "dp": "2023-03-22"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2023-03-01",
    "vpc": 1.18,
    "qtd": 1,
    "dp": "2023-03-21"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2023-03-01",
    "vpc": 0.928,
    "qtd": 13,
    "dp": "2023-03-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2023-03-01",
    "vpc": 0.9,
    "qtd": 12,
    "dp": "2023-03-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2023-03-01",
    "vpc": 0.63,
    "qtd": 1,
    "dp": "2023-03-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2023-03-01",
    "vpc": 0.87,
    "qtd": 5,
    "dp": "2023-03-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2023-03-01",
    "vpc": 1.2,
    "qtd": 15,
    "dp": "2023-03-10"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2023-03-01",
    "vpc": 0.53,
    "qtd": 3,
    "dp": "2023-03-08"
  },
  {
    "tb": "fiis_proventos",
    "t": "RZAT11",
    "tipo": "Rendimento",
    "mr": "2023-02-01",
    "vpc": 0.96,
    "qtd": 1,
    "dp": "2023-02-23"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2023-02-01",
    "vpc": 0.948,
    "qtd": 13,
    "dp": "2023-02-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2023-02-01",
    "vpc": 1.1,
    "qtd": 12,
    "dp": "2023-02-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2023-02-01",
    "vpc": 0.63,
    "qtd": 1,
    "dp": "2023-02-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2023-02-01",
    "vpc": 1.04,
    "qtd": 5,
    "dp": "2023-02-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2023-02-01",
    "vpc": 1.18,
    "qtd": 15,
    "dp": "2023-02-10"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2023-02-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2023-02-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2023-01-01",
    "vpc": 1.6,
    "qtd": 83,
    "dp": "2023-01-19"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2023-01-01",
    "vpc": 0.896,
    "qtd": 13,
    "dp": "2023-01-17"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2023-01-01",
    "vpc": 1.05,
    "qtd": 12,
    "dp": "2023-01-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2023-01-01",
    "vpc": 0.62,
    "qtd": 1,
    "dp": "2023-01-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2023-01-01",
    "vpc": 1.17,
    "qtd": 15,
    "dp": "2023-01-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2023-01-01",
    "vpc": 0.94,
    "qtd": 5,
    "dp": "2023-01-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2023-01-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2023-01-02"
  },
  {
    "tb": "acoes_proventos",
    "t": "ABEV3",
    "tipo": "JCP",
    "mr": "2022-12-01",
    "vpc": 0.762,
    "qtd": 14,
    "dp": "2022-12-29"
  },
  {
    "tb": "acoes_proventos",
    "t": "MRFG3",
    "tipo": "Dividendo",
    "mr": "2022-12-01",
    "vpc": 0.91,
    "qtd": 10,
    "dp": "2022-12-28"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2022-12-01",
    "vpc": 1.156,
    "qtd": 83,
    "dp": "2022-12-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2022-12-01",
    "vpc": 0.702,
    "qtd": 13,
    "dp": "2022-12-16"
  },
  {
    "tb": "acoes_proventos",
    "t": "GOAU3",
    "tipo": "Dividendo",
    "mr": "2022-12-01",
    "vpc": 0.27,
    "qtd": 34,
    "dp": "2022-12-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2022-12-01",
    "vpc": 0.9,
    "qtd": 12,
    "dp": "2022-12-14"
  },
  {
    "tb": "acoes_proventos",
    "t": "GGBR3",
    "tipo": "Dividendo",
    "mr": "2022-12-01",
    "vpc": 1.73,
    "qtd": 1,
    "dp": "2022-12-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2022-12-01",
    "vpc": 0.62,
    "qtd": 1,
    "dp": "2022-12-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2022-12-01",
    "vpc": 0.75,
    "qtd": 5,
    "dp": "2022-12-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2022-12-01",
    "vpc": 0.92,
    "qtd": 15,
    "dp": "2022-12-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2022-12-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2022-12-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "BRAP3",
    "tipo": "Dividendo",
    "mr": "2022-11-01",
    "vpc": 0.741,
    "qtd": 14,
    "dp": "2022-11-21"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2022-11-01",
    "vpc": 0.788,
    "qtd": 13,
    "dp": "2022-11-18"
  },
  {
    "tb": "acoes_proventos",
    "t": "AGRO3",
    "tipo": "Dividendo",
    "mr": "2022-11-01",
    "vpc": 3.239,
    "qtd": 8,
    "dp": "2022-11-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2022-11-01",
    "vpc": 0.56,
    "qtd": 12,
    "dp": "2022-11-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2022-11-01",
    "vpc": 0.62,
    "qtd": 1,
    "dp": "2022-11-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2022-11-01",
    "vpc": 0.52,
    "qtd": 5,
    "dp": "2022-11-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2022-11-01",
    "vpc": 0.9,
    "qtd": 15,
    "dp": "2022-11-11"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2022-11-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2022-11-01"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2022-10-01",
    "vpc": 0.85,
    "qtd": 13,
    "dp": "2022-10-19"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2022-10-01",
    "vpc": 0.55,
    "qtd": 12,
    "dp": "2022-10-17"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2022-10-01",
    "vpc": 0.62,
    "qtd": 1,
    "dp": "2022-10-17"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2022-10-01",
    "vpc": 0.5,
    "qtd": 5,
    "dp": "2022-10-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2022-10-01",
    "vpc": 1,
    "qtd": 15,
    "dp": "2022-10-11"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2022-10-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2022-10-03"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2022-09-01",
    "vpc": 3.366,
    "qtd": 69,
    "dp": "2022-09-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2022-09-01",
    "vpc": 1.265,
    "qtd": 11,
    "dp": "2022-09-19"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2022-09-01",
    "vpc": 1,
    "qtd": 10,
    "dp": "2022-09-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2022-09-01",
    "vpc": 0.62,
    "qtd": 1,
    "dp": "2022-09-15"
  },
  {
    "tb": "acoes_proventos",
    "t": "MRFG3",
    "tipo": "Dividendo",
    "mr": "2022-09-01",
    "vpc": 0.758,
    "qtd": 1,
    "dp": "2022-09-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2022-09-01",
    "vpc": 0.7,
    "qtd": 5,
    "dp": "2022-09-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2022-09-01",
    "vpc": 1.03,
    "qtd": 15,
    "dp": "2022-09-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2022-09-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2022-09-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "VALE3",
    "tipo": "JCP",
    "mr": "2022-09-01",
    "vpc": 1.539,
    "qtd": 13,
    "dp": "2022-09-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2022-08-01",
    "vpc": 2.939,
    "qtd": 69,
    "dp": "2022-08-31"
  },
  {
    "tb": "acoes_proventos",
    "t": "GOAU3",
    "tipo": "Dividendo",
    "mr": "2022-08-01",
    "vpc": 0.36,
    "qtd": 21,
    "dp": "2022-08-26"
  },
  {
    "tb": "acoes_proventos",
    "t": "GGBR3",
    "tipo": "Dividendo",
    "mr": "2022-08-01",
    "vpc": 0.71,
    "qtd": 1,
    "dp": "2022-08-25"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2022-08-01",
    "vpc": 1.32,
    "qtd": 11,
    "dp": "2022-08-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2022-08-01",
    "vpc": 1.25,
    "qtd": 8,
    "dp": "2022-08-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2022-08-01",
    "vpc": 1.3,
    "qtd": 15,
    "dp": "2022-08-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2022-08-01",
    "vpc": 0.62,
    "qtd": 1,
    "dp": "2022-08-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2022-08-01",
    "vpc": 0.91,
    "qtd": 5,
    "dp": "2022-08-11"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2022-08-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2022-08-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2022-07-01",
    "vpc": 1.858,
    "qtd": 20,
    "dp": "2022-07-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2022-07-01",
    "vpc": 1.287,
    "qtd": 9,
    "dp": "2022-07-18"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2022-07-01",
    "vpc": 1.41,
    "qtd": 8,
    "dp": "2022-07-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2022-07-01",
    "vpc": 0.6,
    "qtd": 1,
    "dp": "2022-07-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2022-07-01",
    "vpc": 1.09,
    "qtd": 5,
    "dp": "2022-07-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2022-07-01",
    "vpc": 1.3,
    "qtd": 15,
    "dp": "2022-07-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2022-07-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2022-07-01"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2022-06-01",
    "vpc": 0.179,
    "qtd": 3,
    "dp": "2022-06-30"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2022-06-01",
    "vpc": 1.428,
    "qtd": 20,
    "dp": "2022-06-20"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2022-06-01",
    "vpc": 1.352,
    "qtd": 9,
    "dp": "2022-06-17"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2022-06-01",
    "vpc": 1.6,
    "qtd": 8,
    "dp": "2022-06-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HCTR11",
    "tipo": "Rendimento",
    "mr": "2022-06-01",
    "vpc": 1.77,
    "qtd": 10,
    "dp": "2022-06-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2022-06-01",
    "vpc": 0.6,
    "qtd": 1,
    "dp": "2022-06-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2022-06-01",
    "vpc": 1.35,
    "qtd": 5,
    "dp": "2022-06-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2022-06-01",
    "vpc": 1.4,
    "qtd": 15,
    "dp": "2022-06-10"
  },
  {
    "tb": "acoes_proventos",
    "t": "GOAU3",
    "tipo": "JCP",
    "mr": "2022-05-01",
    "vpc": 0.2,
    "qtd": 7,
    "dp": "2022-05-26"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2022-05-01",
    "vpc": 1.261,
    "qtd": 3,
    "dp": "2022-05-17"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Rendimento",
    "mr": "2022-05-01",
    "vpc": 0.109,
    "qtd": 15,
    "dp": "2022-05-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2022-05-01",
    "vpc": 1.4,
    "qtd": 3,
    "dp": "2022-05-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HCTR11",
    "tipo": "Rendimento",
    "mr": "2022-05-01",
    "vpc": 1.75,
    "qtd": 4,
    "dp": "2022-05-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2022-05-01",
    "vpc": 0.6,
    "qtd": 1,
    "dp": "2022-05-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2022-05-01",
    "vpc": 1.25,
    "qtd": 7,
    "dp": "2022-05-12"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2022-05-01",
    "vpc": 1.14,
    "qtd": 2,
    "dp": "2022-05-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "BBDC3",
    "tipo": "JCP",
    "mr": "2022-05-01",
    "vpc": 0.017,
    "qtd": 3,
    "dp": "2022-05-02"
  },
  {
    "tb": "acoes_proventos",
    "t": "AGRO3",
    "tipo": "Dividendo",
    "mr": "2022-04-01",
    "vpc": 2.016,
    "qtd": 1,
    "dp": "2022-04-29"
  },
  {
    "tb": "fiis_proventos",
    "t": "IRDM11",
    "tipo": "Rendimento",
    "mr": "2022-04-01",
    "vpc": 1.182,
    "qtd": 3,
    "dp": "2022-04-19"
  },
  {
    "tb": "fiis_proventos",
    "t": "DEVA11",
    "tipo": "Rendimento",
    "mr": "2022-04-01",
    "vpc": 1.31,
    "qtd": 2,
    "dp": "2022-04-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HCTR11",
    "tipo": "Rendimento",
    "mr": "2022-04-01",
    "vpc": 1.4,
    "qtd": 4,
    "dp": "2022-04-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2022-04-01",
    "vpc": 0.6,
    "qtd": 1,
    "dp": "2022-04-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "KNSC11",
    "tipo": "Rendimento",
    "mr": "2022-04-01",
    "vpc": 1.12,
    "qtd": 2,
    "dp": "2022-04-13"
  },
  {
    "tb": "fiis_proventos",
    "t": "HABT11",
    "tipo": "Rendimento",
    "mr": "2022-04-01",
    "vpc": 1.2,
    "qtd": 1,
    "dp": "2022-04-12"
  },
  {
    "tb": "acoes_proventos",
    "t": "VALE3",
    "tipo": "Dividendo",
    "mr": "2022-03-01",
    "vpc": 3.719,
    "qtd": 10,
    "dp": "2022-03-16"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2022-03-01",
    "vpc": 0.6,
    "qtd": 1,
    "dp": "2022-03-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2022-02-01",
    "vpc": 0.6,
    "qtd": 1,
    "dp": "2022-02-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2022-01-01",
    "vpc": 0.6,
    "qtd": 1,
    "dp": "2022-01-14"
  },
  {
    "tb": "acoes_proventos",
    "t": "ABEV3",
    "tipo": "Dividendo",
    "mr": "2021-12-01",
    "vpc": 0.13,
    "qtd": 14,
    "dp": "2021-12-30"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2021-12-01",
    "vpc": 2.19,
    "qtd": 15,
    "dp": "2021-12-15"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2021-12-01",
    "vpc": 0.6,
    "qtd": 1,
    "dp": "2021-12-14"
  },
  {
    "tb": "fiis_proventos",
    "t": "HFOF11",
    "tipo": "Rendimento",
    "mr": "2021-11-01",
    "vpc": 0.6,
    "qtd": 1,
    "dp": "2021-11-16"
  },
  {
    "tb": "acoes_proventos",
    "t": "AGRO3",
    "tipo": "Dividendo",
    "mr": "2021-11-01",
    "vpc": 2.62,
    "qtd": 1,
    "dp": "2021-11-10"
  },
  {
    "tb": "acoes_proventos",
    "t": "PETR4",
    "tipo": "Dividendo",
    "mr": "2021-08-01",
    "vpc": 1.61,
    "qtd": 5,
    "dp": "2021-08-25"
  }
];

// Total de proventos por ticker: { ticker -> { tbCart, total } }
const TOTAIS = {
  "RZAT11": {
    "tbCart": "fiis_carteira",
    "total": 314.56
  },
  "FATN11": {
    "tbCart": "fiis_carteira",
    "total": 6.4
  },
  "HFOF11": {
    "tbCart": "fiis_carteira",
    "total": 178.82
  },
  "TVRI11": {
    "tbCart": "fiis_carteira",
    "total": 625.23
  },
  "VALE3": {
    "tbCart": "acoes_carteira",
    "total": 366.75
  },
  "PETR4": {
    "tbCart": "acoes_carteira",
    "total": 2279.88
  },
  "SAPR4": {
    "tbCart": "acoes_carteira",
    "total": 11.3
  },
  "GGBR4": {
    "tbCart": "acoes_carteira",
    "total": 7.84
  },
  "ITUB4": {
    "tbCart": "acoes_carteira",
    "total": 0.52
  },
  "ALPK3": {
    "tbCart": "acoes_carteira",
    "total": 0.58
  },
  "CMIN3": {
    "tbCart": "acoes_carteira",
    "total": 5.46
  },
  "BBDC3": {
    "tbCart": "acoes_carteira",
    "total": 7.93
  },
  "IRDM11": {
    "tbCart": "fiis_carteira",
    "total": 686.54
  },
  "DEVA11": {
    "tbCart": "fiis_carteira",
    "total": 355.14
  },
  "HABT11": {
    "tbCart": "fiis_carteira",
    "total": 651.03
  },
  "ABEV3": {
    "tbCart": "acoes_carteira",
    "total": 26.29
  },
  "KLBN4": {
    "tbCart": "acoes_carteira",
    "total": 12.83
  },
  "BRAP3": {
    "tbCart": "acoes_carteira",
    "total": 126.56
  },
  "KNSC11": {
    "tbCart": "fiis_carteira",
    "total": 176.6
  },
  "MGLU3": {
    "tbCart": "acoes_carteira",
    "total": 0.61
  },
  "GOAU3": {
    "tbCart": "acoes_carteira",
    "total": 95.25
  },
  "GGBR3": {
    "tbCart": "acoes_carteira",
    "total": 8.9
  },
  "KLBN3": {
    "tbCart": "acoes_carteira",
    "total": 46.86
  },
  "AGRO3": {
    "tbCart": "acoes_carteira",
    "total": 78.23
  },
  "MRFG3": {
    "tbCart": "acoes_carteira",
    "total": 9.86
  },
  "HCTR11": {
    "tbCart": "fiis_carteira",
    "total": 30.3
  }
};

async function importB3() {
  try {
    // Garantir tabelas de proventos
    await pool.query(`CREATE TABLE IF NOT EXISTS fiis_proventos(id SERIAL PRIMARY KEY,usuario_id INTEGER NOT NULL,ticker VARCHAR(20) NOT NULL,tipo VARCHAR(20) NOT NULL DEFAULT 'Rendimento',mes_referencia DATE NOT NULL,valor_por_cota NUMERIC(10,4) NOT NULL,quantidade INTEGER NOT NULL,total NUMERIC(12,2) GENERATED ALWAYS AS (valor_por_cota*quantidade) STORED,data_pagamento DATE,created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS acoes_proventos(id SERIAL PRIMARY KEY,usuario_id INTEGER NOT NULL,ticker VARCHAR(20) NOT NULL,tipo VARCHAR(20) NOT NULL DEFAULT 'Dividendo',mes_referencia DATE NOT NULL,valor_por_cota NUMERIC(10,4) NOT NULL,quantidade INTEGER NOT NULL,total NUMERIC(12,2) GENERATED ALWAYS AS (valor_por_cota*quantidade) STORED,data_pagamento DATE,created_at TIMESTAMP DEFAULT NOW())`);
    // Garantir colunas nas carteiras
    await pool.query(`ALTER TABLE acoes_carteira ADD COLUMN IF NOT EXISTS vendido BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE acoes_carteira ADD COLUMN IF NOT EXISTS preco_venda NUMERIC(10,4) DEFAULT 0`);
    await pool.query(`ALTER TABLE acoes_carteira ADD COLUMN IF NOT EXISTS data_venda DATE`);
    await pool.query(`ALTER TABLE fiis_carteira ADD COLUMN IF NOT EXISTS vendido BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE fiis_carteira ADD COLUMN IF NOT EXISTS preco_venda NUMERIC(10,4) DEFAULT 0`);
    await pool.query(`ALTER TABLE fiis_carteira ADD COLUMN IF NOT EXISTS data_venda DATE`);
    // Corrigir registros inseridos com coluna errada (vendida->vendido)
    await pool.query(`UPDATE acoes_carteira SET vendido=TRUE WHERE vendida IS TRUE AND (vendido IS NOT TRUE)`).catch(()=>{});
    await pool.query(`UPDATE fiis_carteira SET vendido=TRUE WHERE vendida IS TRUE AND (vendido IS NOT TRUE)`).catch(()=>{});
    // Mover KLBN11 e SAPR11 de fiis_carteira para acoes_carteira (eram units, não FIIs)
    for (const unit of ['KLBN11','SAPR11']) {
      await pool.query(`DELETE FROM fiis_carteira WHERE usuario_id=(SELECT id FROM usuarios WHERE email=$1) AND ticker=$2 AND vendido=TRUE`,[EMAIL,unit]).catch(()=>{});
      await pool.query(`DELETE FROM fiis_proventos WHERE usuario_id=(SELECT id FROM usuarios WHERE email=$1) AND ticker=$2`,[EMAIL,unit]).catch(()=>{});
    }
  } catch(e) { console.error('[importB3 tables]', e.message); }

  let ok = 0, er = 0;

  for (const v of VENDAS) {
    try {
      const nomeCol = v.tb === 'fiis_carteira' ? 'nome_fundo' : 'nome_empresa';
      await pool.query(
        "INSERT INTO "+v.tb+" (usuario_id,ticker,quantidade,preco_compra,vendido,preco_venda,data_venda,peso_base,peso_sugerido,"+nomeCol+") "+
        "SELECT id,$2::VARCHAR,$3,$4,true,$5,$6,0,0,$7 FROM usuarios WHERE email=$1 "+
        "AND NOT EXISTS (SELECT 1 FROM "+v.tb+" WHERE usuario_id=(SELECT id FROM usuarios WHERE email=$1) AND ticker=$2::VARCHAR)",
        [EMAIL, v.t, v.qtd, v.pm, v.pv, v.dv, v.nome]
      );
      // UPDATE caso já exista mas com PM zero ou nome em branco
      await pool.query(
        "UPDATE "+v.tb+" SET preco_compra=CASE WHEN preco_compra=0 THEN $3 ELSE preco_compra END, "+
        (v.tb==='fiis_carteira'?'nome_fundo':'nome_empresa')+"=CASE WHEN ("+
        (v.tb==='fiis_carteira'?'nome_fundo':'nome_empresa')+
        " IS NULL OR "+
        (v.tb==='fiis_carteira'?'nome_fundo':'nome_empresa')+
        "='') THEN $4 ELSE "+(v.tb==='fiis_carteira'?'nome_fundo':'nome_empresa')+" END "+
        "WHERE usuario_id=(SELECT id FROM usuarios WHERE email=$1) AND ticker=$2::VARCHAR AND vendido=TRUE",
        [EMAIL, v.t, v.pm, v.nome]
      );
      ok++;
    } catch(e) { er++; console.error('[importB3 venda]', v.t, e.message); }
  }

  for (const p of PROVENTOS) {
    try {
      await pool.query(
        "INSERT INTO "+p.tb+" (usuario_id,ticker,tipo,mes_referencia,valor_por_cota,quantidade,data_pagamento) "+
        "SELECT id,$2::VARCHAR,$3,$4::DATE,$5,$6,$7 FROM usuarios WHERE email=$1 "+
        "AND NOT EXISTS (SELECT 1 FROM "+p.tb+" WHERE usuario_id=(SELECT id FROM usuarios WHERE email=$1) AND ticker=$2::VARCHAR AND mes_referencia=$4::DATE)",
        [EMAIL, p.t, p.tipo, p.mr, p.vpc, p.qtd, p.dp]
      );
      ok++;
    } catch(e) { er++; console.error('[importB3 prov]', p.t, e.message); }
  }

  // Atualizar dividendos_geral (FIIs) e dividendos_ano (ações) nas carteiras vendidas
  for (const [ticker, { tbCart, total }] of Object.entries(TOTAIS)) {
    try {
      const divCol = tbCart === 'fiis_carteira' ? 'dividendos_geral' : 'dividendos_ano';
      await pool.query(
        "UPDATE "+tbCart+" SET "+divCol+"=$3 "+
        "WHERE usuario_id=(SELECT id FROM usuarios WHERE email=$1) AND ticker=$2::VARCHAR AND vendido=TRUE "+
        "AND ("+divCol+" IS NULL OR "+divCol+"=0)",
        [EMAIL, ticker, total]
      );
      ok++;
    } catch(e) { er++; console.error('[importB3 div]', ticker, e.message); }
  }

  console.log('[importB3] Done:', ok, 'ok,', er, 'erros');
}

module.exports = importB3;
