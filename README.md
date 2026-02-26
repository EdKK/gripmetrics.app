# GripMetrics

> **Plataforma de Análise de Performance e Carga de Treino em Escalada Indoor**

GripMetrics é uma aplicação web que permite a treinadores e atletas de escalada indoor estruturar sessões de treino, registrar retornos de performance e gerar métricas automáticas de carga e distribuição.

---

## 🚀 Demo

Acesse em: **[https://edkk.github.io/gripmetrics.app](https://edkk.github.io/gripmetrics.app)**

---

## ✨ Funcionalidades

### Aba Treinador
- Criar treinos com ID automático, data, nome do aluno e objetivo do dia
- Adicionar blocos/exercícios com categoria, quantidade, tipo de intensidade e tempo planejado
- Salvar e gerenciar treinos no localStorage

### Aba Aluno
- Selecionar treino existente e visualizar seus blocos
- Enviar retorno com status (Concluído/Parcial/Não fez), dor no dedo (0–10), RPE (1–10) e comentário

### Aba Avaliação
- Registrar sessão com duração, tentativas, conclusões e métricas psicofísicas
- Cálculo automático de:
  - **PhysicalLoad** = RPE × Duração / 10
  - **TechScore** = Técnica × 10
  - **MentalScore** = média de (Foco + Confiança + Motivação) menos penalidade de Stress, normalizado 0–100
  - **SessionVolume** = Duração × Tentativas / 10

### Aba Dados
- Resumo: total de treinos, blocos, média de dor, média de RPE
- Distribuição de exercícios por categoria (gráfico de barras)
- Tempo planejado por categoria
- Exportar **JSON** (todos os dados) ou **CSV** (treinos)
- Limpar todos os dados

---

## 🛠 Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML5 | Estrutura semântica e acessível |
| CSS moderno | Dark theme responsivo, sem dependências |
| JavaScript puro (ES2020) | Lógica modular, sem frameworks |
| localStorage | Persistência de dados no navegador |
| GitHub Pages | Deploy estático |

---

## 📂 Estrutura

```
gripmetrics.app/
├── index.html   # Estrutura da SPA com 4 abas
├── style.css    # Dark theme responsivo
├── app.js       # Lógica modular (Storage, Trainer, Athlete, Evaluation, DataTab)
└── README.md
```

---

## 🏗 Arquitetura

O código está organizado em módulos IIFE independentes dentro de `app.js`:

```
Storage       – abstração sobre localStorage
UI            – utilitários DOM (toast, rangeVal, uid, formatDate)
initTabs()    – navegação entre abas
Trainer       – criação e gestão de treinos
Athlete       – retorno do aluno
Evaluation    – avaliação de sessão e cálculo de métricas
DataTab       – métricas resumidas e exportações
```

---

## 📡 Expansão futura (BLE / WebSerial)

O ponto de extensão já está mapeado em `app.js`:

```js
// DOMContentLoaded → bootstrap
if ('bluetooth' in navigator) SensorBLE.init();
if ('serial'    in navigator) SensorSerial.init();
```

---

## 💻 Rodar localmente

Não requer build. Basta abrir `index.html` em qualquer servidor estático:

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .
```

---

## 📄 Licença

MIT © GripMetrics