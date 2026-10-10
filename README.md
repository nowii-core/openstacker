 # ⚡ OpenStacker Pro

  <p align="center">
    <b>Piattaforma Web Modulare, Reattiva e ad Alte Prestazioni per la Gestione e Catalogazione di Risorse Tecnologiche</b>
  </p>

  <p align="center">
    <a href="https://github.com/nowii-core/OpenStacker-Pro/actions/workflows/ci.yml">
      <img src="https://img.shields.io/badge/CI-Passing-2ea44f?style=for-the-badge&logo=githubactions&logoColor=white" alt="CI Status">
    </a>
    <a href="https://github.com/nowii-core/OpenStacker-Pro/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-007ec6?style=for-the-badge" alt="License">
    </a>
    <img src="https://img.shields.io/badge/JavaScript-ES6%2B-f7df1e?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
    <img src="https://img.shields.io/badge/Supabase-Database-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
    <img src="https://img.shields.io/badge/Architecture-Vanilla_JS-000000?style=for-the-badge" alt="Vanilla JS">
  </p>

  <p align="center">
    <a href="#-panoramica">Panoramica</a> •
    <a href="#-funzionalità-chiave">Funzionalità</a> •
    <a href="#-architettura-del-progetto">Architettura</a> •
    <a href="#-stack-tecnologico">Stack Tecnologico</a> •
    <a href="#-guida-rapida">Guida Rapida</a> •
    <a href="#-testing">Testing</a> •
    <a href="#-contatti">Contatti</a>
  </p>

  ---

</div>

## 📌 Panoramica

**OpenStacker Pro** è un'applicazione web moderna e modulare progettata per offrire un'interfaccia utente fluida, veloce e priva di sovrastrutture commerciali pesanti. Sviluppata secondo i principi del codice pulito (*Clean Code*) e dell'architettura a componenti separati, integra una gestione nativa del catalogo, supporto per la localizzazione (i18n), persistenza dati mediante Supabase e una pipeline di test unitari automatizzati.

---

## ✨ Funzionalità Chiave

- 📱 **Design Reattivo & Fluid UI:** Layout ottimizzato con Flexbox e CSS Grid avanzato, per un'esperienza omogenea su desktop, tablet e smartphone.
- 🌐 **Internazionalizzazione Integrata (i18n):** Gestione dinamica del cambio lingua (Italiano / Inglese) e persistenza delle preferenze utente.
- 📂 **Catalogo Dinamico Integrato:** Filtraggio, ricerca rapida e renderizzazione performante degli elementi di catalogo.
- ⚡ **Architettura Senza Framework:** Sviluppato in JavaScript puro (ES6+) e CSS modulare per massimizzare la velocità di caricamento ed eliminare la dipendenza da bundle pesanti.
- 🔒 **Integrazione Backend Supabase:** Gestione sicura del database e persistenza dei dati via client Supabase integrato.
- 🧪 **Test Suite & Continuous Integration:** Pipeline CI attiva con GitHub Actions per il controllo qualità automatico ad ogni release.

---

## 🛠 Stack Tecnologico

### Frontend
- **HTML5:** Marcatura semantica conforme agli standard WCAG per l'accessibilità.
- **CSS3 Modulare:** Sistema basato su Design Tokens (`tokens.css`), stili base, componenti riutilizzabili e animazioni ad alte prestazioni (`animations.css`).
- **JavaScript (ES6+):** Programmazione ad oggetti e modulare via ES Modules per una gestione pulita delle dipendenze interne.

### Backend & Database
- **Supabase / PostgreSQL:** Schema relazionale dedicato (`supabase/schema.sql`) per la gestione e sincronizzazione dei dati.

### Tooling & Qualità
- **Node.js Test Runner:** Test di unità per verificare la logica di business e l'integrità dei moduli.
- **GitHub Workflows:** Automazione build, linting e test automatici in ambiente integrato.

---

## 📂 Architettura del Progetto

```
OpenStacker-Pro/
├── .github/                 # Template di issue/PR e workflow CI/CD
│   └── workflows/           # Pipeline automatizzate (ci.yml, pages.yml)
├── assets/                  # Icone, asset grafici SVG e risorse statiche
├── scripts/                 # Server di sviluppo e utility CLI locali
├── src/
│   ├── css/
│   │   ├── tokens.css       # Variabili globali, colori e tipografia
│   │   ├── base.css         # Reset CSS e stili fondamentali
│   │   ├── components.css   # Componenti UI isolati
│   │   └── animations.css   # Keyframe e transizioni
│   └── js/
│       ├── config.js        # Costanti ed endpoint dell'applicazione
│       ├── i18n.js          # Sistema di localizzazione multilingua
│       ├── backend.js       # Client API / Supabase
│       ├── catalog.js       # Gestione e renderizzazione catalogo
│       ├── effects.js       # Animazioni ed effetti interattivi
│       └── main.js          # Entry point della logica client
├── supabase/                # File di configurazione e schema SQL
├── tests/                   # Test suite unitari e di integrazione
├── index.html               # Pagina principale dell'applicazione
├── package.json             # Dipendenze dev e script di progetto
└── README.md                # Documentazione di progetto
```

---

## 🚀 Guida Rapida

### Requisiti Prerequisiti
- **Node.js** v18.0.0 o superiore
- **npm** v9.0.0 o superiore

### Installazione

1. **Clona il repository:**
   ```bash
   git clone https://github.com/nowii-core/OpenStacker-Pro.git
   cd OpenStacker-Pro
   ```

2. **Installa le dipendenze di sviluppo:**
   ```bash
   npm install
   ```

3. **Avvia il server locale di sviluppo:**
   ```bash
   npm run dev
   ```
   L'applicazione sarà accessibile all'indirizzo `http://localhost:3000`.

---

## 🧪 Testing

Per eseguire la suite di test locali e verificare la stabilità dei moduli:

```bash
# Esegue tutti i test automatizzati
npm test
```

I test coprono la logica del catalogo, la verifica dei file principali e le funzioni di supporto dell'applicazione.

---

## 📄 Licenza

Questo progetto è distribuito sotto licenza **MIT**. Consulta il file [`LICENSE`](./LICENSE) per maggiori informazioni.

---

## 📞 Contatti & Supporto

- **Maintainer:** [@nowii-core](https://github.com/nowii-core)
- **Bug Report & Feature Requests:** Se riscontri un problema o desideri proporre un miglioramento, apri una [Issue](https://github.com/nowii-core/OpenStacker-Pro/issues) o invia una [Pull Request](https://github.com/nowii-core/OpenStacker-Pro/pulls).

---

<div align="center">
  <sub>Sviluppato con cura e attenzione ai dettagli da <b>nowii-core</b></sub>
</div>
