/**
 * i18n-auto.js — Automatic Visitor Language Detection & Translation for pudupower.com
 * Supports ES (es-CL), EN (default for non-ES/non-PT), and PT.
 */
(() => {
  'use strict';

  const DICT = {
    es: {
      htmlLang: 'es-CL',
      title: 'The Power of the Pudú | Metal Progresivo Chileno, YTP Maker & Hub 3D',
      metaDescription:
        'Hub oficial de The Power of the Pudú (Santiago, Chile). Escucha nuestro metal progresivo y latin metal, crea videos en Pudu Poop Maker (YTP), Barsalitsuni 3D y explora PuduWorld.',
      ogTitle: 'The Power of the Pudú — Metal Progresivo Chileno & Hub 3D',
      ogDescription:
        'Metal progresivo y experimental desde Chile. Visual Synth 3D en Three.js, Chaos Audio, Pudu Poop Maker, Barsalitsuni Generator y Pudú Simulator.',
      twitterTitle: 'The Power of the Pudú — Metal Progresivo Chileno',
      twitterDescription:
        'Hub interactivo 3D, generadores audiovisuales, simuladores y música oficial de The Power of the Pudú.',
      speechBubble: '¡Ichipi! 🌱 ¡Bienvenido a The Power of the Pudú!',
      statusPill: 'HUB OFICIAL',
      cards: {
        poop: {
          title: 'Pudu Poop Maker',
          desc: 'Caos sonoro y YTP en estado puro: blast beats, cortes extremos y metal progresivo sin frenos.',
          tags: ['Blast Beats', 'Caos YTP']
        },
        barsa: {
          title: 'Barsalitsuni',
          desc: 'Sintetizador visual 3D con seam carving y estética avant-garde chilena para distorsionar la realidad.',
          tags: ['Seam Carving 3D', 'Avant-Garde Chileno']
        },
        sim: {
          title: 'PuduWorld',
          desc: 'Simulador 3D multijugador impulsado por IA generativa para una metamorfosis colectiva en tiempo real.',
          tags: ['IA Generativa', 'Metamorfosis 3D']
        }
      },
      viral: {
        share: '⚡ COMPARTIR HUB 3D',
        copy: '🔗 COPIAR LINK VIRAL',
        embed: '🦌 INSERTAR PUDÚ 3D EN TU WEB',
        modalTitle: '🦌 Inserta el Pudú 3D Widget en tu Web o Blog',
        modalDesc:
          'Copia y pega este script antes de <code>&lt;/body&gt;</code> en tu sitio, Neocities, Carrd, WordPress o portafolio para tener un Pudú 3D flotante:',
        modalCopy: '📋 COPIAR CÓDIGO EMBED'
      },
      editorial: {
        h2: 'The Power of the Pudú — Metal Progresivo Chileno & Universo Interactivo',
        introHtml:
          '<strong>The Power of the Pudú</strong> es una banda independiente de <strong>metal progresivo, latin metal y música experimental</strong> originaria de Santiago, Chile. Inspirados en el pudú —el ciervo más pequeño del mundo y guardián del bosque valdiviano—, unimos riffs técnicos, polirritmias y estética andina futurista con herramientas audiovisuales gratuitas que corren directo en tu navegador.',
        ctas: [
          'Escuchar en Spotify ↗',
          'Ver en YouTube ↗',
          'Discografía en Bandcamp ↗',
          'Seguir en Instagram ↗'
        ],
        cards: [
          {
            h3: 'Pudu Poop Maker (YTP Online)',
            p: 'Editor y generador automático de YouTube Poop (YTP) en tiempo real con WebCodecs y detección facial local. Ideal para crear videos caóticos, memes y remixes musicales sin instalar nada.',
            a: 'Abrir ytp.pudupower.com ↗'
          },
          {
            h3: 'Barsalitsuni 3D Synth',
            p: 'Sintetizador visual 3D y procesador de seam carving (liquid rescale) en WebAssembly y WebGL inspirado en nuestra estética avant-garde chilena. Distorsiona videos e imágenes al ritmo del metal.',
            a: 'Abrir barsalitsuni.pudupower.com ↗'
          },
          {
            h3: 'PuduWorld · Pudú Simulator',
            p: 'Simulador 3D multijugador en navegador ambientado en el bosque valdiviano, con física orgánica, inteligencia artificial conversacional y chat shardeado en tiempo real.',
            a: 'Abrir simulator.pudupower.com ↗'
          }
        ],
        faqTitle: 'Preguntas Frecuentes',
        faqs: [
          {
            q: '¿Qué es The Power of the Pudú?',
            aHtml:
              'Somos una banda chilena de metal progresivo y latin metal experimental de Santiago de Chile. Creamos música pesada acompañada de experiencias web 3D, videojuegos y editores multimedia gratuitos.'
          },
          {
            q: '¿Las herramientas de video y el simulador son gratis?',
            aHtml:
              'Sí, Pudu Poop Maker, Barsalitsuni y PuduWorld son 100% gratuitos y se ejecutan localmente en tu navegador (PC o celular) sin subir tus archivos a servidores externos.'
          },
          {
            q: '¿Cómo puedo apoyar o contactar a la banda?',
            aHtml:
              'Escuchando nuestros temas en Spotify, YouTube y Bandcamp, compartiendo los videos creados en pudupower.com o escribiéndonos desde la <a href="/contact.html" style="color:#00ffaa;">página de contacto</a>.'
          }
        ]
      },
      footer: {
        about: 'Sobre la Banda',
        contact: 'Contacto',
        privacy: 'Privacidad',
        terms: 'Términos'
      }
    },

    en: {
      htmlLang: 'en',
      title: 'The Power of the Pudú | Chilean Progressive Metal, YTP Maker & 3D Hub',
      metaDescription:
        'Official hub of The Power of the Pudú (Santiago, Chile). Stream our progressive & latin metal, create videos in Pudu Poop Maker (YTP), Barsalitsuni 3D, and explore PuduWorld.',
      ogTitle: 'The Power of the Pudú — Chilean Progressive Metal & 3D Hub',
      ogDescription:
        'Progressive and experimental metal from Chile. Three.js 3D Visual Synth, Chaos Audio, Pudu Poop Maker, Barsalitsuni Generator & Pudu Simulator.',
      twitterTitle: 'The Power of the Pudú — Chilean Progressive Metal',
      twitterDescription:
        'Interactive 3D hub, audiovisual generators, simulators, and official music by The Power of the Pudú.',
      speechBubble: 'Ichipi! 🌱 Welcome to The Power of the Pudú!',
      statusPill: 'OFFICIAL HUB',
      cards: {
        poop: {
          title: 'Pudu Poop Maker',
          desc: 'Pure sonic chaos and YTP: blast beats, schizophrenic cuts, and relentless progressive metal.',
          tags: ['Blast Beats', 'YTP Chaos']
        },
        barsa: {
          title: 'Barsalitsuni',
          desc: '3D visual synthesizer with seam carving and Chilean avant-garde aesthetics to warp reality.',
          tags: ['3D Seam Carving', 'Chilean Avant-Garde']
        },
        sim: {
          title: 'PuduWorld',
          desc: 'Multiplayer 3D simulator powered by generative AI for a real-time collective metamorphosis.',
          tags: ['Generative AI', '3D Metamorphosis']
        }
      },
      viral: {
        share: '⚡ SHARE 3D HUB',
        copy: '🔗 COPY VIRAL LINK',
        embed: '🦌 EMBED 3D PUDU ON YOUR SITE',
        modalTitle: '🦌 Embed the 3D Pudu Widget on Your Website or Blog',
        modalDesc:
          'Copy and paste this script before <code>&lt;/body&gt;</code> on your site, Neocities, Carrd, WordPress, or portfolio to add a floating 3D Pudu:',
        modalCopy: '📋 COPY EMBED CODE'
      },
      editorial: {
        h2: 'The Power of the Pudú — Chilean Progressive Metal & Interactive Universe',
        introHtml:
          '<strong>The Power of the Pudú</strong> is an independent <strong>progressive metal, latin metal, and experimental music</strong> band from Santiago, Chile. Inspired by the pudú—the world’s smallest deer and guardian of the Valdivian forest—we fuse technical riffs, polyrhythms, and futuristic Andean aesthetics with free browser-based audiovisual tools.',
        ctas: [
          'Listen on Spotify ↗',
          'Watch on YouTube ↗',
          'Discography on Bandcamp ↗',
          'Follow on Instagram ↗'
        ],
        cards: [
          {
            h3: 'Pudu Poop Maker (YTP Online)',
            p: 'Real-time YouTube Poop (YTP) editor and auto-generator powered by WebCodecs and local face detection. Create chaotic videos, memes, and music remixes with zero installs.',
            a: 'Open ytp.pudupower.com ↗'
          },
          {
            h3: 'Barsalitsuni 3D Synth',
            p: '3D visual synthesizer and seam carving (liquid rescale) processor in WebAssembly and WebGL inspired by our Chilean avant-garde aesthetic. Warp videos and images to the beat of metal.',
            a: 'Open barsalitsuni.pudupower.com ↗'
          },
          {
            h3: 'PuduWorld · Pudu Simulator',
            p: 'Multiplayer 3D browser simulator set in the Valdivian rainforest, featuring organic physics, conversational AI, and real-time sharded chat.',
            a: 'Open simulator.pudupower.com ↗'
          }
        ],
        faqTitle: 'Frequently Asked Questions',
        faqs: [
          {
            q: 'What is The Power of the Pudú?',
            aHtml:
              'We are a Chilean progressive metal and experimental latin metal band from Santiago, Chile. We pair heavy music with free 3D web experiences, games, and multimedia editors.'
          },
          {
            q: 'Are the video tools and simulator free?',
            aHtml:
              'Yes! Pudu Poop Maker, Barsalitsuni, and PuduWorld are 100% free and run locally in your browser (desktop or mobile) without uploading your files to external servers.'
          },
          {
            q: 'How can I support or contact the band?',
            aHtml:
              'Stream our tracks on Spotify, YouTube, and Bandcamp, share the videos you create on pudupower.com, or reach out via our <a href="/contact.html" style="color:#00ffaa;">contact page</a>.'
          }
        ]
      },
      footer: {
        about: 'About the Band',
        contact: 'Contact',
        privacy: 'Privacy',
        terms: 'Terms'
      }
    },

    pt: {
      htmlLang: 'pt',
      title: 'The Power of the Pudú | Metal Progressivo Chileno, YTP Maker & Hub 3D',
      metaDescription:
        'Hub oficial de The Power of the Pudú (Santiago, Chile). Ouça nosso metal progressivo e latin metal, crie vídeos no Pudu Poop Maker (YTP), Barsalitsuni 3D e explore PuduWorld.',
      ogTitle: 'The Power of the Pudú — Metal Progressivo Chileno & Hub 3D',
      ogDescription:
        'Metal progressivo e experimental do Chile. Visual Synth 3D em Three.js, Chaos Audio, Pudu Poop Maker, Barsalitsuni Generator e Pudú Simulator.',
      twitterTitle: 'The Power of the Pudú — Metal Progressivo Chileno',
      twitterDescription:
        'Hub interativo 3D, geradores audiovisuais, simuladores e música oficial de The Power of the Pudú.',
      speechBubble: 'Ichipi! 🌱 Bem-vindo ao The Power of the Pudú!',
      statusPill: 'HUB OFICIAL',
      cards: {
        poop: {
          title: 'Pudu Poop Maker',
          desc: 'Caos sonoro e YTP em estado puro: blast beats, cortes extremos e metal progressivo sem freios.',
          tags: ['Blast Beats', 'Caos YTP']
        },
        barsa: {
          title: 'Barsalitsuni',
          desc: 'Sintetizador visual 3D com seam carving e estética avant-garde chilena para distorcer a realidade.',
          tags: ['Seam Carving 3D', 'Avant-Garde Chileno']
        },
        sim: {
          title: 'PuduWorld',
          desc: 'Simulador 3D multijogador impulsionado por IA generativa para uma metamorfose coletiva em tempo real.',
          tags: ['IA Generativa', 'Metamorfose 3D']
        }
      },
      viral: {
        share: '⚡ COMPARTILHAR HUB 3D',
        copy: '🔗 COPIAR LINK VIRAL',
        embed: '🦌 INCORPORAR PUDÚ 3D NO SEU SITE',
        modalTitle: '🦌 Incorpore o Widget Pudú 3D no seu Site ou Blog',
        modalDesc:
          'Copie e cole este script antes de <code>&lt;/body&gt;</code> no seu site, Neocities, Carrd, WordPress ou portfólio para ter um Pudú 3D flutuante:',
        modalCopy: '📋 COPIAR CÓDIGO EMBED'
      },
      editorial: {
        h2: 'The Power of the Pudú — Metal Progressivo Chileno & Universo Interativo',
        introHtml:
          '<strong>The Power of the Pudú</strong> é uma banda independente de <strong>metal progressivo, latin metal e música experimental</strong> de Santiago, Chile. Inspirados no pudú — o menor cervo do mundo e guardião da floresta valdiviana — unimos riffs técnicos, polirritmias e estética andina futurista com ferramentas audiovisuais gratuitas no navegador.',
        ctas: [
          'Ouvir no Spotify ↗',
          'Ver no YouTube ↗',
          'Discografia no Bandcamp ↗',
          'Seguir no Instagram ↗'
        ],
        cards: [
          {
            h3: 'Pudu Poop Maker (YTP Online)',
            p: 'Editor e gerador automático de YouTube Poop (YTP) em tempo real com WebCodecs e detecção facial local. Crie vídeos caóticos, memes e remixes sem instalar nada.',
            a: 'Abrir ytp.pudupower.com ↗'
          },
          {
            h3: 'Barsalitsuni 3D Synth',
            p: 'Sintetizador visual 3D e processador de seam carving em WebAssembly e WebGL inspirado na nossa estética avant-garde chilena. Distorça vídeos e imagens no ritmo do metal.',
            a: 'Abrir barsalitsuni.pudupower.com ↗'
          },
          {
            h3: 'PuduWorld · Pudú Simulator',
            p: 'Simulador 3D multijogador no navegador ambientado na floresta valdiviana, com física orgânica, IA conversacional e chat em tempo real.',
            a: 'Abrir simulator.pudupower.com ↗'
          }
        ],
        faqTitle: 'Perguntas Frequentes',
        faqs: [
          {
            q: 'O que é The Power of the Pudú?',
            aHtml:
              'Somos uma banda chilena de metal progressivo e latin metal experimental de Santiago, Chile. Criamos música pesada acompanhada de experiências web 3D, jogos e editores multimídia gratuitos.'
          },
          {
            q: 'As ferramentas de vídeo e o simulador são gratuitos?',
            aHtml:
              'Sim, Pudu Poop Maker, Barsalitsuni e PuduWorld são 100% gratuitos e rodam localmente no seu navegador sem enviar arquivos para servidores externos.'
          },
          {
            q: 'Como posso apoiar ou contatar a banda?',
            aHtml:
              'Ouvindo nossas músicas no Spotify, YouTube e Bandcamp, compartilhando os vídeos criados em pudupower.com ou escrevendo pela <a href="/contact.html" style="color:#00ffaa;">página de contato</a>.'
          }
        ]
      },
      footer: {
        about: 'Sobre a Banda',
        contact: 'Contato',
        privacy: 'Privacidade',
        terms: 'Termos'
      }
    }
  };

  function detectLang() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const q = (params.get('lang') || '').toLowerCase().slice(0, 2);
      if (q === 'es' || q === 'en' || q === 'pt') return q;

      const stored = (window.localStorage?.getItem('pudu_lang') || '').toLowerCase().slice(0, 2);
      if (stored === 'es' || stored === 'en' || stored === 'pt') return stored;
    } catch (_) {
      // ignore
    }
    const nav = ((navigator.language || (navigator.languages && navigator.languages[0]) || 'en') + '').toLowerCase();
    if (nav.startsWith('es')) return 'es';
    if (nav.startsWith('pt')) return 'pt';
    return 'en';
  }

  function setMeta(selector, value) {
    const el = document.querySelector(selector);
    if (el && value) el.setAttribute('content', value);
  }

  function applyCard(id, data) {
    const card = document.getElementById(id);
    if (!card || !data) return;
    const strong = card.querySelector('.mode-text strong');
    const desc = card.querySelector('.mode-text > span');
    const tags = card.querySelectorAll('.mode-tags i');
    if (strong) strong.textContent = data.title;
    if (desc) desc.textContent = data.desc;
    data.tags.forEach((t, idx) => {
      if (tags[idx]) tags[idx].textContent = t;
    });
  }

  function applyTranslations(lang) {
    const t = DICT[lang] || DICT.en;

    document.documentElement.setAttribute('lang', t.htmlLang);
    document.title = t.title;
    setMeta('meta[name="description"]', t.metaDescription);
    setMeta('meta[property="og:title"]', t.ogTitle);
    setMeta('meta[property="og:description"]', t.ogDescription);
    setMeta('meta[name="twitter:title"]', t.twitterTitle);
    setMeta('meta[name="twitter:description"]', t.twitterDescription);

    const bubble = document.getElementById('pudu3d-speech-bubble');
    if (bubble) bubble.textContent = t.speechBubble;

    const statusPill = document.querySelector('.status-pill');
    if (statusPill) {
      const dot = statusPill.querySelector('.status-dot');
      statusPill.textContent = '';
      if (dot) statusPill.appendChild(dot);
      statusPill.appendChild(document.createTextNode(' ' + t.statusPill));
    }

    applyCard('btn-poop', t.cards.poop);
    applyCard('btn-barsa', t.cards.barsa);
    applyCard('btn-sim', t.cards.sim);

    const shareSpan = document.querySelector('#btn-native-share span');
    if (shareSpan) shareSpan.textContent = t.viral.share;
    const copySpan = document.querySelector('#btn-copy-utm span');
    if (copySpan) copySpan.textContent = t.viral.copy;
    const embedSpan = document.querySelector('#btn-open-embed span');
    if (embedSpan) embedSpan.textContent = t.viral.embed;

    const modalTitle = document.getElementById('embed-modal-title');
    if (modalTitle) modalTitle.textContent = t.viral.modalTitle;
    const modalP = document.querySelector('#embed-modal .pudu-modal-box p');
    if (modalP) modalP.innerHTML = t.viral.modalDesc;
    const modalCopy = document.getElementById('btn-copy-embed');
    if (modalCopy) modalCopy.textContent = t.viral.modalCopy;

    const ed = document.querySelector('.band-editorial');
    if (ed) {
      const h2 = ed.querySelector('h2');
      if (h2) h2.textContent = t.editorial.h2;
      const introP = ed.querySelector('p');
      if (introP) introP.innerHTML = t.editorial.introHtml;

      const ctaLinks = ed.querySelectorAll('.band-cta-bar .band-cta-btn');
      t.editorial.ctas.forEach((txt, idx) => {
        if (ctaLinks[idx]) ctaLinks[idx].textContent = txt;
      });

      const edCards = ed.querySelectorAll('.editorial-grid .editorial-card');
      t.editorial.cards.forEach((c, idx) => {
        const card = edCards[idx];
        if (!card) return;
        const h3 = card.querySelector('h3');
        const p = card.querySelector('p');
        const a = card.querySelector('a');
        if (h3) h3.textContent = c.h3;
        if (p) p.textContent = c.p;
        if (a) a.textContent = c.a;
      });

      const faqList = ed.querySelector('.faq-list');
      if (faqList) {
        const faqH3 = faqList.querySelector('h3');
        if (faqH3) faqH3.textContent = t.editorial.faqTitle;
        const details = faqList.querySelectorAll('details');
        t.editorial.faqs.forEach((f, idx) => {
          const d = details[idx];
          if (!d) return;
          const sum = d.querySelector('summary');
          const p = d.querySelector('p');
          if (sum) sum.textContent = f.q;
          if (p) p.innerHTML = f.aHtml;
        });
      }
    }

    const footerLinks = document.querySelectorAll('.pro-footer .footer-links a');
    footerLinks.forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (href.includes('about.html')) a.textContent = t.footer.about;
      else if (href.includes('contact.html')) a.textContent = t.footer.contact;
      else if (href.includes('privacy-policy.html')) a.textContent = t.footer.privacy;
      else if (href.includes('terms.html')) a.textContent = t.footer.terms;
    });

    const toggleBtn = document.getElementById('pudu-lang-toggle');
    if (toggleBtn) {
      const label = toggleBtn.querySelector('span') || toggleBtn;
      label.textContent = lang === 'es' ? 'ES / en' : lang === 'pt' ? 'PT / en' : 'EN / es';
      toggleBtn.setAttribute('data-lang', lang);
      toggleBtn.setAttribute('aria-label', lang === 'es' ? 'Switch language to English' : 'Cambiar idioma a Español');
    }

    window.__PUDU_LANG__ = lang;
    try {
      window.dispatchEvent(new CustomEvent('pudu:lang-change', { detail: { lang } }));
    } catch (_) {
      // ignore
    }
  }

  function setPuduLang(lang, persist = true) {
    const normalized = (lang || 'en').toLowerCase().slice(0, 2);
    const target = DICT[normalized] ? normalized : 'en';
    if (persist) {
      try {
        window.localStorage?.setItem('pudu_lang', target);
        const url = new URL(window.location.href);
        url.searchParams.set('lang', target);
        window.history?.replaceState?.(null, '', url.toString());
      } catch (_) {
        // ignore
      }
    }
    applyTranslations(target);
    return target;
  }

  function init() {
    const current = detectLang();
    applyTranslations(current);

    const toggleBtn = document.getElementById('pudu-lang-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const next = window.__PUDU_LANG__ === 'es' ? 'en' : 'es';
        setPuduLang(next, true);
      });
    }
  }

  window.setPuduLang = setPuduLang;
  window.getPuduLang = () => window.__PUDU_LANG__ || detectLang();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
